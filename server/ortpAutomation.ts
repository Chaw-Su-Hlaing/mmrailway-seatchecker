import type { CheckSeatsRequest, LiveSeatExtractionItem } from '../src/types/railway.ts';
import { getStationByCode } from './ortpCatalog.ts';
import { extractOrtpScreenshotData, extractOrtpTextData } from './geminiService.ts';

export interface PlaywrightAutomationResult {
  success: boolean;
  chromiumAvailable: boolean;
  trains: LiveSeatExtractionItem[];
  capturedApiCount: number;
  note: string;
}

export async function runOrtpPlaywrightAutomation(
  query: CheckSeatsRequest,
): Promise<PlaywrightAutomationResult> {
  const targetUrl = query.targetUrl || 'https://ortp.railways.gov.mm';
  const originSt = getStationByCode(query.origin);
  const destSt = getStationByCode(query.destination);

  let chromium: typeof import('playwright').chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (err) {
    return {
      success: false,
      chromiumAvailable: false,
      trains: [],
      capturedApiCount: 0,
      note: `Playwright package unavailable: ${err instanceof Error ? err.message : 'import failed'}`,
    };
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  const interceptedJson: Array<{ url: string; data: unknown }> = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    return {
      success: false,
      chromiumAvailable: false,
      trains: [],
      capturedApiCount: 0,
      note: `Chromium browser binary not installed on this host (${err instanceof Error ? err.message : 'launch failed'}). Run "npx playwright install chromium" locally to enable automated ORTP browsing.`,
    };
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1080 },
      locale: 'my-MM',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Capture any XHR / Fetch JSON responses returned by ORTP backend
    page.on('response', async (response) => {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('application/json') && response.status() === 200) {
          const json = await response.json();
          interceptedJson.push({ url: response.url(), data: json });
        }
      } catch {
        // Ignore non-JSON or closed responses
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 25000 });

    // 1. Trip type (One-way vs Round-trip)
    if (query.tripType === 'round-trip') {
      const rtBtn = page.getByText(/အသွားအပြန်ခရီး|Round/i).first();
      if (await rtBtn.isVisible().catch(() => false)) {
        await rtBtn.click();
      }
    }

    // 2. Origin & Destination dropdowns (handles native <select> or custom dropdowns)
    const selects = page.locator('select');
    const selectCount = await selects.count();

    if (selectCount >= 2) {
      // Try selecting by Burmese or English station text
      const pickOption = async (selIndex: number, names: string[]) => {
        const sel = selects.nth(selIndex);
        const options = await sel.locator('option').allTextContents();
        const matchIdx = options.findIndex((txt) =>
          names.some((n) => txt.toLowerCase().includes(n.toLowerCase())),
        );
        if (matchIdx >= 0) {
          const val = await sel.locator('option').nth(matchIdx).getAttribute('value');
          if (val !== null) await sel.selectOption(val);
        }
      };
      await pickOption(0, [originSt.nameMm, originSt.nameEn]);
      await pickOption(1, [destSt.nameMm, destSt.nameEn]);
    } else {
      // Custom AntD / PrimeNG / MUI / React dropdown fallback
      const dropdownTriggers = page.locator('[role="combobox"], .ant-select, .p-dropdown, input[readonly]');
      const triggerCount = await dropdownTriggers.count();
      if (triggerCount >= 2) {
        await dropdownTriggers.nth(0).click();
        await page.getByText(new RegExp(`${originSt.nameMm}|${originSt.nameEn}`, 'i')).first().click().catch(() => {});
        await dropdownTriggers.nth(1).click();
        await page.getByText(new RegExp(`${destSt.nameMm}|${destSt.nameEn}`, 'i')).first().click().catch(() => {});
      }
    }

    // 3. Departure Date input
    const dateInput = page.locator('input[type="date"], input[placeholder*="YYYY"], input[value*="202"]').first();
    if (await dateInput.isVisible().catch(() => false)) {
      await dateInput.fill(query.date);
    }

    // 4. Passenger picker (if adults > 1 or children > 0)
    if (query.adults > 1 || query.children > 0 || query.infants > 0) {
      const paxTrigger = page.getByText(/လူကြီး|Adult/i).first();
      if (await paxTrigger.isVisible().catch(() => false)) {
        await paxTrigger.click().catch(() => {});
        const plusButtons = page.locator('button:has-text("+")');
        const plusCount = await plusButtons.count();
        if (plusCount >= 1) {
          for (let i = 1; i < query.adults; i += 1) {
            await plusButtons.nth(0).click().catch(() => {});
          }
          if (plusCount >= 2) {
            for (let i = 0; i < query.children; i += 1) {
              await plusButtons.nth(1).click().catch(() => {});
            }
          }
        }
      }
    }

    // 5. Click Search button (ရှာဖွေမည် / Search)
    const searchBtn = page.getByRole('button', { name: /ရှာဖွေမည်|Search/i }).first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 6. Check if results loaded, then inspect seat selection buttons
    const seatSelectBtns = page.getByRole('button', {
      name: /ထိုင်ခုံအတန်းစားရွေးချယ်ရန်|Select Seat/i,
    });
    const trainBtnCount = await seatSelectBtns.count();
    const collectedTrains: LiveSeatExtractionItem[] = [];

    if (trainBtnCount > 0) {
      const maxInspect = Math.min(trainBtnCount, 7);
      for (let i = 0; i < maxInspect; i += 1) {
        const btn = seatSelectBtns.nth(i);
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (isDisabled) continue;

        await btn.click().catch(() => {});
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);

        // Capture rendered seat-selection screen & DOM text for AI extraction
        const screenshotBuf = await page.screenshot({ fullPage: true });
        const pageText = await page.evaluate(() => document.body.innerText);

        // Extract real seat numbers via Gemini Vision + text context
        const visionExtraction = await extractOrtpScreenshotData(
          screenshotBuf.toString('base64'),
          'image/png',
          `Live ORTP Browser Session (${targetUrl})`,
        );

        if (visionExtraction.extractedTrains.length > 0) {
          collectedTrains.push(...visionExtraction.extractedTrains);
        } else if (pageText.trim().length > 50) {
          const textExtraction = await extractOrtpTextData(
            `${pageText}\n\nIntercepted JSON:\n${JSON.stringify(interceptedJson.slice(-3))}`,
          );
          collectedTrains.push(...textExtraction.extractedTrains);
        }

        // Navigate back to the schedule list for the next train
        await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
        await page.waitForTimeout(1000);
      }
    } else {
      // Extract whatever schedule / JSON was returned on the search page
      const bodyText = await page.evaluate(() => document.body.innerText);
      const combined = `${bodyText}\n\nIntercepted API JSON:\n${JSON.stringify(interceptedJson)}`;
      const parsed = await extractOrtpTextData(combined);
      collectedTrains.push(...parsed.extractedTrains);
    }

    await browser.close();
    browser = null;

    return {
      success: collectedTrains.length > 0,
      chromiumAvailable: true,
      trains: collectedTrains,
      capturedApiCount: interceptedJson.length,
      note:
        collectedTrains.length > 0
          ? `Automated headless browser inspected ${targetUrl} and extracted ${collectedTrains.length} live train/seat record(s) (${interceptedJson.length} API responses intercepted).`
          : `Headless browser reached ${targetUrl} (${interceptedJson.length} API responses), but no trains or seat maps matched on the live page.`,
    };
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return {
      success: false,
      chromiumAvailable: true,
      trains: [],
      capturedApiCount: interceptedJson.length,
      note: `Playwright automation error on ${targetUrl}: ${err instanceof Error ? err.message : 'unknown error'}`,
    };
  }
}
