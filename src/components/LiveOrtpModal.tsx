import React from 'react';
import { ArrowRight, Check, Copy, Upload, X } from 'lucide-react';
import type { ScreenshotExtractionResponse } from '../types/railway';

interface LiveOrtpModalProps {
  isOpen: boolean;
  initialTab?: 'screenshot' | 'paste';
  onClose: () => void;
  onApplyExtracted: (extraction: ScreenshotExtractionResponse) => void;
}

const CONSOLE_SNIPPET = `copy(JSON.stringify({url:location.href,text:document.body.innerText,seats:[...document.querySelectorAll('button,div,span,td,li')].filter(el=>/^\\s*[A-Z]?\\d{1,2}[A-Z]?\\s*$/.test(el.textContent||'')&&el.children.length===0).map(el=>({seat:el.textContent.trim(),cls:el.className,bg:getComputedStyle(el).backgroundColor,disabled:Boolean(el.disabled)}))}))`;

export const LiveOrtpModal: React.FC<LiveOrtpModalProps> = ({
  isOpen,
  initialTab = 'screenshot',
  onClose,
  onApplyExtracted,
}) => {
  const [tab, setTab] = React.useState<'screenshot' | 'paste'>(initialTab);
  const [previewUrl, setPreviewUrl] = React.useState('/assets/aistudio/image_a7302881.png');
  const [uploadedBase64, setUploadedBase64] = React.useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = React.useState('image/png');
  const [uploadedName, setUploadedName] = React.useState('');
  const [rawText, setRawText] = React.useState('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScreenshotExtractionResponse | null>(null);
  const [copiedSnippet, setCopiedSnippet] = React.useState(false);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setUploadedName(file.name);
    setUploadedMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      setUploadedBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res =
        tab === 'screenshot'
          ? await fetch('/api/analyze-screenshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(
                uploadedBase64
                  ? {
                      useSampleScreenshot: false,
                      imageBase64: uploadedBase64,
                      mimeType: uploadedMime,
                      fileName: uploadedName,
                    }
                  : { useSampleScreenshot: true },
              ),
            })
          : await fetch('/api/import-ortp-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rawText }),
            });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed.');
      setResult(data as ScreenshotExtractionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to parse ORTP content.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(CONSOLE_SNIPPET);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 1800);
    } catch {
      // Ignore clipboard restrictions
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Read Real Seat Numbers from Live ORTP
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              1. Open{' '}
              <a
                href="https://ortp.railways.gov.mm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                ortp.railways.gov.mm
              </a>{' '}
              (with Myanmar IP/VPN) · 2. Click Select Seat Class (ထိုင်ခုံအတန်းစားရွေးချယ်ရန်) · 3. Upload screenshot or paste page here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setTab('screenshot')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                tab === 'screenshot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Upload Seat Screenshot
            </button>
            <button
              type="button"
              onClick={() => setTab('paste')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                tab === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Paste Live Page / Browser Data
            </button>
          </div>

          {tab === 'screenshot' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="px-3.5 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose ORTP Screenshot</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {uploadedBase64 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedBase64(null);
                      setPreviewUrl('/assets/aistudio/image_a7302881.png');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Reset to Reference Image
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                <img
                  src={previewUrl}
                  alt="ORTP Screenshot Preview"
                  referrerPolicy="no-referrer"
                  className="w-full max-h-56 object-contain bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Copy text (<code className="font-mono">Ctrl+A, Ctrl+C</code>) on the ORTP seat map page, or run our DevTools helper:
                </span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Console Helper'}</span>
                </button>
              </div>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste copied ORTP page text, HTML, or JSON from the console helper here..."
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isAnalyzing || (tab === 'paste' && !rawText.trim())}
              onClick={handleExtract}
              className="px-4 py-2 text-xs font-medium bg-[#0B2447] hover:bg-[#133566] disabled:opacity-60 text-white rounded-lg cursor-pointer"
            >
              {isAnalyzing ? 'Extracting Real Data...' : 'Extract Real Data'}
            </button>
          </div>

          {result && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono text-slate-800">
                    {result.extractedQuery.origin} → {result.extractedQuery.destination} ·{' '}
                    {result.extractedQuery.date} · {result.extractedTrains.length} train(s)
                  </div>
                  <div className="text-xs text-slate-500">
                    {result.pageType === 'seat_selection_map'
                      ? `Real seat numbers extracted: ${result.extractedTrains.reduce((n, t) => n + t.availableSeatNumbers.length, 0)} open`
                      : 'Schedule list detected (upload the seat-selection screen to read individual seat numbers)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApplyExtracted(result);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <span>Apply Real Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
