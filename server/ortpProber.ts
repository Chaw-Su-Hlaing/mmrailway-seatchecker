import type { PortalProbeResult } from '../src/types/railway.ts';

const DEFAULT_ORTP_URL = 'https://ortp.railways.gov.mm';

export interface LiveOrtpInspection {
  probe: PortalProbeResult;
  rawHtml: string | null;
}

function inspectHtml(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Myanmar Railways ORTP';
  const formCount = (html.match(/<form\b/gi) ?? []).length;
  const selectCount = (html.match(/<select\b/gi) ?? []).length;
  const inputCount = (html.match(/<input\b/gi) ?? []).length;
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;

  return {
    title,
    formCount,
    selectCount,
    inputCount,
    scriptCount,
  };
}

export async function probeOfficialOrtpPortal(customUrl?: string): Promise<LiveOrtpInspection> {
  const targetUrl = (customUrl && customUrl.trim()) || DEFAULT_ORTP_URL;
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    return {
      rawHtml: null,
      probe: {
        targetUrl,
        reachable: false,
        httpStatus: null,
        latencyMs: Date.now() - startedAt,
        portalTitle: null,
        deepCheckSummary: 'Invalid URL format.',
        mode: 'geo_blocked_timeout',
        note: 'Invalid portal URL supplied.',
        checkedAt,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'my-MM,my;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timeout);

    const html = await response.text();
    const { title, formCount, selectCount, inputCount, scriptCount } = inspectHtml(html);

    const deepCheckSummary = `Inspected ${html.length} bytes: ${formCount} form(s), ${selectCount} dropdown(s), ${inputCount} input(s), ${scriptCount} script(s).`;

    return {
      rawHtml: response.ok ? html : null,
      probe: {
        targetUrl: parsedUrl.toString(),
        reachable: response.ok,
        httpStatus: response.status,
        latencyMs: Date.now() - startedAt,
        portalTitle: title,
        deepCheckSummary,
        mode: response.ok ? 'live_portal' : 'geo_blocked_timeout',
        note: response.ok
          ? `Connected to ${parsedUrl.hostname} (HTTP ${response.status}). ${deepCheckSummary}`
          : `${parsedUrl.hostname} returned HTTP ${response.status}. Live seat numbers could not be fetched automatically.`,
        checkedAt,
      },
    };
  } catch (err) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - startedAt;
    const isTimeout = err instanceof Error && err.name === 'AbortError';

    return {
      rawHtml: null,
      probe: {
        targetUrl: parsedUrl.toString(),
        reachable: false,
        httpStatus: null,
        latencyMs,
        portalTitle: null,
        deepCheckSummary: isTimeout
          ? `Connection to ${parsedUrl.hostname} timed out after ${latencyMs}ms.`
          : `Connection error: ${err instanceof Error ? err.message : 'unreachable'}.`,
        mode: 'geo_blocked_timeout',
        note: isTimeout
          ? `ortp.railways.gov.mm timed out after ${latencyMs}ms from this cloud server (geo-restricted / Myanmar IP or VPN required). Import a live ORTP seat-selection screenshot or page text from your browser to read real seat numbers.`
          : `Could not reach ${parsedUrl.hostname} from this server (${err instanceof Error ? err.message : 'network error'}). Import a live ORTP screenshot or page text from your browser to read real seat numbers.`,
        checkedAt,
      },
    };
  }
}
