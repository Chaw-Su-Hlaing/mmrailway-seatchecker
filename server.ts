import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CheckSeatsRequest,
  CheckSeatsResponse,
  EvaluatedTrainResult,
  ScreenshotExtractionResponse,
  SeatClassCode,
  SeatClassInventory,
  SeatDataSource,
  TrainScheduleItem,
} from './src/types/railway.ts';
import {
  ORTP_STATIONS,
  findAdjacentSeatGroup,
  queryRouteScheduleOnly,
  resolveStationCode,
} from './server/ortpCatalog.ts';
import { probeOfficialOrtpPortal } from './server/ortpProber.ts';
import { runOrtpPlaywrightAutomation } from './server/ortpAutomation.ts';
import {
  extractOrtpScreenshotData,
  extractOrtpTextData,
  generateCompatibilitySummary,
  parseNaturalLanguageRequest,
} from './server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function evaluateTrainsForQuery(
  rawTrains: TrainScheduleItem[],
  neededSeats: number,
  timeWindowStart: string,
  timeWindowEnd: string,
  preferredClass: SeatClassCode | 'any',
): EvaluatedTrainResult[] {
  return rawTrains.map((train) => {
    const isRouteMatch = true;
    const isTimeMatch =
      train.departureTime === '--:--' ||
      (train.departureTime >= (timeWindowStart || '00:00') &&
        train.departureTime <= (timeWindowEnd || '23:59'));

    const matchingClasses: SeatClassInventory[] = train.seatClasses.filter((cls) => {
      if (preferredClass !== 'any' && cls.classCode !== preferredClass) {
        return false;
      }
      return true;
    });

    const isClassMatch = matchingClasses.length > 0;
    const hasAnyLiveData = matchingClasses.some((c) => c.isLiveSeatData);

    let isSeatCountMatch: boolean | null = null;
    let bestMatchingClass: SeatClassInventory | null = null;

    if (hasAnyLiveData) {
      const classesWithEnoughSeats = matchingClasses.filter(
        (cls) => cls.isLiveSeatData && (cls.availableCount ?? 0) >= neededSeats,
      );
      isSeatCountMatch = classesWithEnoughSeats.length > 0;
      bestMatchingClass =
        classesWithEnoughSeats.sort((a, b) => a.fareMmk - b.fareMmk)[0] ??
        matchingClasses.sort((a, b) => (b.availableCount ?? 0) - (a.availableCount ?? 0))[0] ??
        null;
    } else {
      bestMatchingClass = matchingClasses.sort((a, b) => a.fareMmk - b.fareMmk)[0] ?? null;
    }

    const isFullyCompatible =
      isRouteMatch && isTimeMatch && isClassMatch && (hasAnyLiveData ? isSeatCountMatch === true : true);

    let compatibilityReason = 'Schedule matches your route and time window; live ORTP seat check needed for seat numbers.';
    if (!isTimeMatch) {
      compatibilityReason = `Departs at ${train.departureTime}, outside requested ${timeWindowStart}–${timeWindowEnd} window.`;
    } else if (!isClassMatch) {
      compatibilityReason = `Requested seat class is not operated on ${train.trainNumber}.`;
    } else if (hasAnyLiveData) {
      if (isSeatCountMatch) {
        compatibilityReason = `Live ORTP seat data matches: ${bestMatchingClass?.availableCount ?? 0} real seat(s) open.`;
      } else {
        const maxAvail = Math.max(0, ...matchingClasses.map((c) => c.availableCount ?? 0));
        compatibilityReason =
          maxAvail === 0
            ? 'Sold out in matching class on live ORTP.'
            : `Only ${maxAvail} real seat(s) open; need ${neededSeats}.`;
      }
    }

    const totalEstimatedFareMmk = bestMatchingClass
      ? bestMatchingClass.fareMmk * neededSeats
      : train.startingFareMmk * neededSeats;

    return {
      ...train,
      isRouteMatch,
      isTimeMatch,
      isSeatCountMatch,
      isClassMatch,
      isFullyCompatible,
      compatibilityReason,
      totalSeatsRequired: neededSeats,
      bestMatchingClass,
      totalEstimatedFareMmk,
    };
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '12mb' }));

  app.get('/api/stations', (_req, res) => {
    res.json({ stations: ORTP_STATIONS });
  });

  app.post('/api/check-seats', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Partial<CheckSeatsRequest>;
      let query: CheckSeatsRequest = {
        origin: resolveStationCode(body.origin || 'YGN'),
        destination: resolveStationCode(body.destination || 'NPT'),
        date: body.date || '2026-11-21',
        returnDate: body.returnDate || undefined,
        tripType: body.tripType === 'round-trip' ? 'round-trip' : 'one-way',
        adults: Math.max(1, Number(body.adults ?? 1) || 1),
        children: Math.max(0, Number(body.children ?? 0) || 0),
        infants: Math.max(0, Number(body.infants ?? 0) || 0),
        timeWindowStart: body.timeWindowStart || '00:00',
        timeWindowEnd: body.timeWindowEnd || '23:59',
        preferredClass: body.preferredClass || 'any',
        naturalQuery: body.naturalQuery?.trim() || undefined,
        targetUrl: body.targetUrl?.trim() || 'https://ortp.railways.gov.mm',
      };

      let parsedFromNaturalLanguage = false;
      if (query.naturalQuery) {
        try {
          query = await parseNaturalLanguageRequest(query.naturalQuery, query);
          parsedFromNaturalLanguage = true;
        } catch (err) {
          console.warn('NLP parsing fallback:', err instanceof Error ? err.message : err);
        }
      }

      const neededSeats = Math.max(1, query.adults + query.children);
      const { probe, rawHtml } = await probeOfficialOrtpPortal(query.targetUrl);

      const seatDataSource: SeatDataSource = 'unavailable';
      const scheduleTrains = queryRouteScheduleOnly(query.origin, query.destination);

      // When portal is reachable (e.g. running locally in Myanmar without VPN), automate the live ORTP portal with Playwright
      if (probe.reachable) {
        const autoResult = await runOrtpPlaywrightAutomation(query);
        probe.deepCheckSummary = autoResult.note;

        if (autoResult.success && autoResult.trains.length > 0) {
          const liveItems: TrainScheduleItem[] = autoResult.trains.map((t, idx) => {
            const hasSeats = t.availableSeatNumbers.length > 0 || t.occupiedSeatNumbers.length > 0;
            return {
              id: `LIVE-${idx + 1}`,
              trainNumber: t.trainNameEn.split(' ')[0] || `#${idx + 1}`,
              trainNameEn: t.trainNameEn,
              trainNameMm: t.trainNameMm,
              corridorEn: `${query.origin} - ${query.destination}`,
              corridorMm: t.corridorMm,
              originCode: query.origin,
              destinationCode: query.destination,
              departureTime: t.departureTime,
              arrivalTime: t.arrivalTime,
              duration: t.duration,
              startingFareMmk: t.startingFareMmk,
              trainType: 'Express',
              stopsEn: [query.origin, query.destination],
              stopsMm: [query.origin, query.destination],
              seatClasses: [
                {
                  classCode: t.classCode,
                  classNameEn: t.classNameEn,
                  classNameMm: t.classNameEn,
                  fareMmk: t.startingFareMmk,
                  coachName: t.coachName,
                  isLiveSeatData: hasSeats,
                  availableCount: hasSeats ? t.availableSeatNumbers.length : null,
                  availableSeatNumbers: t.availableSeatNumbers,
                  occupiedSeatNumbers: t.occupiedSeatNumbers,
                  recommendedSeats: hasSeats
                    ? findAdjacentSeatGroup(t.availableSeatNumbers, neededSeats)
                    : [],
                },
              ],
            };
          });

          const evaluatedLive = evaluateTrainsForQuery(
            liveItems,
            neededSeats,
            query.timeWindowStart || '00:00',
            query.timeWindowEnd || '23:59',
            query.preferredClass || 'any',
          );
          const hasAnySeats = liveItems.some((t) => t.seatClasses.some((c) => c.isLiveSeatData));
          const liveSource: SeatDataSource = hasAnySeats ? 'live_portal' : 'unavailable';
          const aiSummary = await generateCompatibilitySummary(
            query,
            probe,
            liveSource,
            evaluatedLive,
          );
          res.json({
            query,
            seatDataSource: liveSource,
            parsedFromNaturalLanguage,
            probe,
            trains: evaluatedLive,
            aiSummary,
          } satisfies CheckSeatsResponse);
          return;
        }
      }

      const evaluatedTrains = evaluateTrainsForQuery(
        scheduleTrains,
        neededSeats,
        query.timeWindowStart || '00:00',
        query.timeWindowEnd || '23:59',
        query.preferredClass || 'any',
      );

      let returnTrains: EvaluatedTrainResult[] | undefined;
      if (query.tripType === 'round-trip' && query.returnDate) {
        const rawReturn = queryRouteScheduleOnly(query.destination, query.origin);
        returnTrains = evaluateTrainsForQuery(
          rawReturn,
          neededSeats,
          '00:00',
          '23:59',
          query.preferredClass || 'any',
        );
      }

      const aiSummary = await generateCompatibilitySummary(
        query,
        probe,
        seatDataSource,
        evaluatedTrains,
      );

      const payload: CheckSeatsResponse = {
        query,
        seatDataSource,
        parsedFromNaturalLanguage,
        probe,
        trains: evaluatedTrains,
        returnTrains,
        aiSummary,
      };

      res.json(payload);
    } catch (err) {
      console.error('/api/check-seats error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to run seat check.',
      });
    }
  });

  app.post('/api/analyze-screenshot', async (req, res) => {
    try {
      const { useSampleScreenshot, imageBase64, mimeType, fileName } = (req.body ?? {}) as {
        useSampleScreenshot?: boolean;
        imageBase64?: string;
        mimeType?: string;
        fileName?: string;
      };

      let base64Data = imageBase64 || '';
      let resolvedMime = mimeType || 'image/png';
      let sourceLabel = fileName || 'Uploaded ORTP Screenshot';

      if (useSampleScreenshot) {
        const samplePath = path.join(__dirname, 'public', 'assets', 'aistudio', 'image_a7302881.png');
        if (!fs.existsSync(samplePath)) {
          res.status(404).json({ error: 'Reference ORTP screenshot asset not found.' });
          return;
        }
        const buffer = fs.readFileSync(samplePath);
        base64Data = buffer.toString('base64');
        resolvedMime = 'image/png';
        sourceLabel = 'ORTP Reference Screenshot';
      }

      if (!base64Data) {
        res.status(400).json({ error: 'No screenshot image provided.' });
        return;
      }

      const cleanedBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const extraction = await extractOrtpScreenshotData(cleanedBase64, resolvedMime, sourceLabel);
      res.json(extraction);
    } catch (err) {
      console.error('/api/analyze-screenshot error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to extract data from screenshot.',
      });
    }
  });

  app.post('/api/import-ortp-text', async (req, res) => {
    try {
      const { rawText } = (req.body ?? {}) as { rawText?: string };
      if (!rawText || !rawText.trim()) {
        res.status(400).json({ error: 'Please paste text or HTML from ortp.railways.gov.mm.' });
        return;
      }
      const extraction = await extractOrtpTextData(rawText.trim());
      res.json(extraction);
    } catch (err) {
      console.error('/api/import-ortp-text error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to parse live ORTP page text.',
      });
    }
  });

  app.post('/api/apply-imported-ortp', async (req, res) => {
    try {
      const { extraction, currentForm } = (req.body ?? {}) as {
        extraction: ScreenshotExtractionResponse;
        currentForm: CheckSeatsRequest;
      };

      const mergedQuery: CheckSeatsRequest = {
        ...currentForm,
        origin: extraction.extractedQuery.origin || currentForm.origin,
        destination: extraction.extractedQuery.destination || currentForm.destination,
        date: extraction.extractedQuery.date || currentForm.date,
        tripType: extraction.extractedQuery.tripType || currentForm.tripType,
        adults: extraction.extractedQuery.adults || currentForm.adults,
        children: extraction.extractedQuery.children ?? currentForm.children,
        infants: extraction.extractedQuery.infants ?? currentForm.infants,
      };

      const neededSeats = Math.max(1, mergedQuery.adults + mergedQuery.children);

      const importedTrains: TrainScheduleItem[] = extraction.extractedTrains.map((t, idx) => {
        const hasRealSeats =
          t.availableSeatNumbers.length > 0 || t.occupiedSeatNumbers.length > 0;
        return {
          id: `IMPORTED-${idx + 1}`,
          trainNumber: t.trainNameEn.split(' ')[0] || `#${idx + 1}`,
          trainNameEn: t.trainNameEn,
          trainNameMm: t.trainNameMm,
          corridorEn: `${mergedQuery.origin} - ${mergedQuery.destination}`,
          corridorMm: t.corridorMm,
          originCode: mergedQuery.origin,
          destinationCode: mergedQuery.destination,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          duration: t.duration,
          startingFareMmk: t.startingFareMmk,
          trainType: 'Express',
          stopsEn: [mergedQuery.origin, mergedQuery.destination],
          stopsMm: [mergedQuery.origin, mergedQuery.destination],
          seatClasses: [
            {
              classCode: t.classCode,
              classNameEn: t.classNameEn,
              classNameMm: t.classNameEn,
              fareMmk: t.startingFareMmk,
              coachName: t.coachName,
              isLiveSeatData: hasRealSeats,
              availableCount: hasRealSeats ? t.availableSeatNumbers.length : null,
              availableSeatNumbers: t.availableSeatNumbers,
              occupiedSeatNumbers: t.occupiedSeatNumbers,
              recommendedSeats: hasRealSeats
                ? findAdjacentSeatGroup(t.availableSeatNumbers, neededSeats)
                : [],
            },
          ],
        };
      });

      const evaluated = evaluateTrainsForQuery(
        importedTrains,
        neededSeats,
        mergedQuery.timeWindowStart || '00:00',
        mergedQuery.timeWindowEnd || '23:59',
        mergedQuery.preferredClass || 'any',
      );

      const hasAnySeats = importedTrains.some((t) =>
        t.seatClasses.some((c) => c.isLiveSeatData),
      );
      const source: SeatDataSource = hasAnySeats ? extraction.sourceType : 'unavailable';

      const probe = {
        targetUrl: mergedQuery.targetUrl || 'https://ortp.railways.gov.mm',
        reachable: true,
        httpStatus: 200,
        latencyMs: 0,
        portalTitle: extraction.sourceLabel,
        deepCheckSummary: extraction.notes,
        mode: 'live_portal' as const,
        note: hasAnySeats
          ? `Read real seat numbers from ${extraction.sourceLabel}.`
          : `Extracted schedule list from ${extraction.sourceLabel}. Upload or paste the seat-selection screen (after clicking ထိုင်ခုံအတန်းစားရွေးချယ်ရန်) to read exact seat numbers.`,
        checkedAt: new Date().toISOString(),
      };

      const aiSummary = await generateCompatibilitySummary(mergedQuery, probe, source, evaluated);

      res.json({
        query: mergedQuery,
        seatDataSource: source,
        parsedFromNaturalLanguage: false,
        probe,
        trains: evaluated,
        aiSummary,
      } satisfies CheckSeatsResponse);
    } catch (err) {
      console.error('/api/apply-imported-ortp error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to apply imported ORTP data.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MR RailCheck AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
