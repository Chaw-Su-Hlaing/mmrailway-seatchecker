import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  CheckSeatsRequest,
  EvaluatedTrainResult,
  PortalProbeResult,
  ScreenshotExtractionResponse,
  SeatClassCode,
  SeatDataSource,
} from '../src/types/railway.ts';
import { ORTP_STATIONS, getStationByCode, resolveStationCode } from './ortpCatalog.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function parseNaturalLanguageRequest(
  naturalQuery: string,
  fallbackRequest: CheckSeatsRequest,
): Promise<CheckSeatsRequest> {
  const ai = getClient();
  const stationList = ORTP_STATIONS.map((s) => `${s.code}: ${s.nameEn} (${s.nameMm})`).join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Extract Myanmar Railways ORTP route, date, time window, seat class, and passenger counts from this user request.
Available stations: ${stationList}
Default date if omitted: ${fallbackRequest.date}
User request: "${naturalQuery}"`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction:
        'You convert English or Burmese railway ticket queries into structured Myanmar Railways ORTP search parameters. Use station codes (YGN, BGO, TGO, NPT, THZ, MDL, PYY, MLM). Convert Burmese digits if present.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originCode: { type: Type.STRING },
          destinationCode: { type: Type.STRING },
          date: { type: Type.STRING },
          returnDate: { type: Type.STRING },
          tripType: { type: Type.STRING },
          adults: { type: Type.INTEGER },
          children: { type: Type.INTEGER },
          infants: { type: Type.INTEGER },
          timeWindowStart: { type: Type.STRING },
          timeWindowEnd: { type: Type.STRING },
          preferredClass: { type: Type.STRING },
        },
        required: ['originCode', 'destinationCode', 'date', 'tripType', 'adults', 'children', 'infants'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const validClasses = ['any', 'ordinary', 'upper', 'first_demu', 'sleeper'];

  return {
    ...fallbackRequest,
    origin: resolveStationCode(parsed.originCode || fallbackRequest.origin),
    destination: resolveStationCode(parsed.destinationCode || fallbackRequest.destination),
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || '') ? parsed.date : fallbackRequest.date,
    returnDate:
      parsed.tripType === 'round-trip' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.returnDate || '')
        ? parsed.returnDate
        : fallbackRequest.returnDate,
    tripType: parsed.tripType === 'round-trip' ? 'round-trip' : 'one-way',
    adults: Math.max(1, Number(parsed.adults ?? fallbackRequest.adults) || 1),
    children: Math.max(0, Number(parsed.children ?? fallbackRequest.children) || 0),
    infants: Math.max(0, Number(parsed.infants ?? fallbackRequest.infants) || 0),
    timeWindowStart: parsed.timeWindowStart || fallbackRequest.timeWindowStart || '00:00',
    timeWindowEnd: parsed.timeWindowEnd || fallbackRequest.timeWindowEnd || '23:59',
    preferredClass: validClasses.includes(parsed.preferredClass)
      ? parsed.preferredClass
      : fallbackRequest.preferredClass || 'any',
    naturalQuery,
  };
}

export async function generateCompatibilitySummary(
  query: CheckSeatsRequest,
  probe: PortalProbeResult,
  seatDataSource: SeatDataSource,
  trains: EvaluatedTrainResult[],
): Promise<{
  headline: string;
  recommendation: string;
  compatibleTrainCount: number;
  bestOptionTrainId: string | null;
  bestOptionSeats: string[];
  warnings: string[];
}> {
  const originSt = getStationByCode(query.origin);
  const destSt = getStationByCode(query.destination);
  const compatible = trains.filter((t) => t.isFullyCompatible);
  const best = compatible[0] ?? null;

  if (seatDataSource === 'unavailable') {
    const timeMatched = trains.filter((t) => t.isTimeMatch && t.isClassMatch);
    return {
      headline:
        timeMatched.length > 0
          ? `${timeMatched.length} scheduled train(s) match ${originSt.nameEn} → ${destSt.nameEn} (live ORTP seat check pending)`
          : `No scheduled trains match your time/class filter on ${originSt.nameEn} → ${destSt.nameEn}`,
      recommendation: probe.reachable
        ? `Connected to ${probe.targetUrl}, and ran browser check: ${probe.deepCheckSummary}`
        : `This cloud preview server is outside Myanmar, so ortp.railways.gov.mm timed out (${probe.latencyMs}ms). When you push to Git and run locally in Myanmar without VPN (npm install && npx playwright install chromium && npm run dev), the backend automatically opens ortp.railways.gov.mm, fills your route, clicks Select Seat Class, and returns real open seat numbers.`,
      compatibleTrainCount: timeMatched.length,
      bestOptionTrainId: timeMatched[0]?.id ?? null,
      bestOptionSeats: [],
      warnings: [
        'Zero mock seat numbers are generated. Real seat numbers appear automatically once ortp.railways.gov.mm is reachable.',
      ],
    };
  }

  const compactData = trains.map((t) => ({
    id: t.id,
    trainNumber: t.trainNumber,
    trainNameEn: t.trainNameEn,
    departureTime: t.departureTime,
    arrivalTime: t.arrivalTime,
    isFullyCompatible: t.isFullyCompatible,
    compatibilityReason: t.compatibilityReason,
    bestClass: t.bestMatchingClass
      ? {
          classNameEn: t.bestMatchingClass.classNameEn,
          coachName: t.bestMatchingClass.coachName,
          availableCount: t.bestMatchingClass.availableCount,
          availableSeatNumbers: t.bestMatchingClass.availableSeatNumbers,
          recommendedSeats: t.bestMatchingClass.recommendedSeats,
          fareMmk: t.bestMatchingClass.fareMmk,
        }
      : null,
  }));

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Summarize ONLY the real extracted seat availability and route compatibility.
Route: ${originSt.nameEn} -> ${destSt.nameEn}
Date: ${query.date}
Time window: ${query.timeWindowStart || '00:00'} to ${query.timeWindowEnd || '23:59'}
Seats needed: ${query.adults} adults, ${query.children} children
Source: ${seatDataSource}
Evaluated trains JSON: ${JSON.stringify(compactData)}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Report only exact real seat numbers and counts present in the JSON. Never invent or guess seat numbers.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['headline', 'recommendation', 'warnings'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return {
      headline:
        parsed.headline ||
        (best
          ? `${compatible.length} compatible train(s) with real seat numbers found`
          : `No compatible live seats matched all filters`),
      recommendation:
        parsed.recommendation ||
        (best && best.bestMatchingClass
          ? `${best.trainNameEn} (${best.departureTime}) · ${best.bestMatchingClass.coachName}: real available seat numbers ${best.bestMatchingClass.availableSeatNumbers.join(', ')}.`
          : 'Try widening your filters or importing another ORTP coach page.'),
      compatibleTrainCount: compatible.length,
      bestOptionTrainId: best?.id ?? null,
      bestOptionSeats: best?.bestMatchingClass?.recommendedSeats ?? [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch {
    return {
      headline: best
        ? `${compatible.length} compatible train(s) with real seat numbers found`
        : `Live ORTP data imported`,
      recommendation:
        best && best.bestMatchingClass
          ? `${best.trainNameEn} departing ${best.departureTime} has real available seat numbers: ${best.bestMatchingClass.availableSeatNumbers.join(', ')}.`
          : 'Review the imported trains and seat numbers below.',
      compatibleTrainCount: compatible.length,
      bestOptionTrainId: best?.id ?? null,
      bestOptionSeats: best?.bestMatchingClass?.recommendedSeats ?? [],
      warnings: [],
    };
  }
}

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pageType: {
      type: Type.STRING,
      description: 'schedule_list if showing train rows, or seat_selection_map if showing numbered seats in a coach',
    },
    extractedQuery: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING },
        destination: { type: Type.STRING },
        date: { type: Type.STRING },
        tripType: { type: Type.STRING },
        adults: { type: Type.INTEGER },
        children: { type: Type.INTEGER },
        infants: { type: Type.INTEGER },
        rawPassengerText: { type: Type.STRING },
      },
      required: ['origin', 'destination', 'date', 'tripType', 'adults', 'children', 'infants', 'rawPassengerText'],
    },
    extractedTrains: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trainNameMm: { type: Type.STRING },
          trainNameEn: { type: Type.STRING },
          departureTime: { type: Type.STRING },
          arrivalTime: { type: Type.STRING },
          duration: { type: Type.STRING },
          corridorMm: { type: Type.STRING },
          startingFareMmk: { type: Type.INTEGER },
          coachName: { type: Type.STRING },
          classNameEn: { type: Type.STRING },
          classCode: { type: Type.STRING, description: 'ordinary, upper, first_demu, or sleeper' },
          availableSeatNumbers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'ONLY exact seat numbers visibly marked available/open. Empty array if not visible on page.',
          },
          occupiedSeatNumbers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'ONLY exact seat numbers visibly marked booked/sold/unavailable. Empty array if not visible.',
          },
        },
        required: [
          'trainNameMm',
          'trainNameEn',
          'departureTime',
          'arrivalTime',
          'duration',
          'corridorMm',
          'startingFareMmk',
          'coachName',
          'classNameEn',
          'classCode',
          'availableSeatNumbers',
          'occupiedSeatNumbers',
        ],
      },
    },
    notes: { type: Type.STRING },
  },
  required: ['pageType', 'extractedQuery', 'extractedTrains', 'notes'],
};

function normalizeExtraction(
  parsed: Record<string, any>,
  sourceLabel: string,
  sourceType: 'imported_screenshot' | 'imported_page',
): ScreenshotExtractionResponse {
  const validClasses: SeatClassCode[] = ['ordinary', 'upper', 'first_demu', 'sleeper'];
  const trains = Array.isArray(parsed.extractedTrains)
    ? parsed.extractedTrains.map((t: Record<string, any>) => ({
        trainNameMm: String(t.trainNameMm || ''),
        trainNameEn: String(t.trainNameEn || 'ORTP Train'),
        departureTime: String(t.departureTime || '--:--'),
        arrivalTime: String(t.arrivalTime || '--:--'),
        duration: String(t.duration || '--:--'),
        corridorMm: String(t.corridorMm || ''),
        startingFareMmk: Number(t.startingFareMmk || 0),
        coachName: String(t.coachName || 'Coach'),
        classNameEn: String(t.classNameEn || 'Upper Class'),
        classCode: (validClasses.includes(t.classCode) ? t.classCode : 'upper') as SeatClassCode,
        availableSeatNumbers: Array.isArray(t.availableSeatNumbers)
          ? t.availableSeatNumbers.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [],
        occupiedSeatNumbers: Array.isArray(t.occupiedSeatNumbers)
          ? t.occupiedSeatNumbers.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [],
      }))
    : [];

  return {
    pageType: parsed.pageType === 'seat_selection_map' ? 'seat_selection_map' : 'schedule_list',
    extractedQuery: {
      origin: resolveStationCode(parsed.extractedQuery?.origin || 'YGN'),
      destination: resolveStationCode(parsed.extractedQuery?.destination || 'NPT'),
      date: parsed.extractedQuery?.date || '2026-11-21',
      tripType: parsed.extractedQuery?.tripType === 'round-trip' ? 'round-trip' : 'one-way',
      adults: Math.max(1, Number(parsed.extractedQuery?.adults ?? 1) || 1),
      children: Math.max(0, Number(parsed.extractedQuery?.children ?? 0) || 0),
      infants: Math.max(0, Number(parsed.extractedQuery?.infants ?? 0) || 0),
      rawPassengerText: parsed.extractedQuery?.rawPassengerText || '1 Adult',
    },
    extractedTrains: trains,
    notes: parsed.notes || 'Extracted ORTP data.',
    sourceLabel,
    sourceType,
  };
}

export async function extractOrtpScreenshotData(
  imageBase64: string,
  mimeType: string,
  sourceLabel: string,
): Promise<ScreenshotExtractionResponse> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
        {
          text: `Inspect this Myanmar Railways ORTP screenshot carefully.
If it is a train schedule list (showing trains and "ထိုင်ခုံအတန်းစားရွေးချယ်ရန်" buttons), set pageType="schedule_list" and leave availableSeatNumbers and occupiedSeatNumbers as empty arrays [].
If it is a seat-selection / coach-map screen (showing numbered seats like 1, 2, 3, A1, B2 with available vs booked colors), set pageType="seat_selection_map" and list EVERY exact available seat number in availableSeatNumbers and EVERY booked/unavailable seat number in occupiedSeatNumbers.
Do NOT guess or invent seat numbers that are not visibly shown in the image. Convert Burmese numerals (၀-၉) to ASCII digits.`,
        },
      ],
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return normalizeExtraction(parsed, sourceLabel, 'imported_screenshot');
}

export async function extractOrtpTextData(
  rawTextOrHtml: string,
): Promise<ScreenshotExtractionResponse> {
  const ai = getClient();
  const clipped = rawTextOrHtml.slice(0, 35000);

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Extract Myanmar Railways ORTP search parameters, trains, fares, and any real seat numbers present in this webpage text/HTML/JSON.
Only include seat numbers in availableSeatNumbers or occupiedSeatNumbers if they actually appear in the provided content. Do NOT invent seat numbers. Convert Burmese digits (၀-၉) to ASCII digits.
Content:
${clipped}`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  return normalizeExtraction(parsed, 'Live ORTP Page Import', 'imported_page');
}
