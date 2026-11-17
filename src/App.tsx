import React from 'react';
import type {
  CheckSeatsRequest,
  CheckSeatsResponse,
  EvaluatedTrainResult,
  ScreenshotExtractionResponse,
  SeatClassCode,
  StationOption,
} from './types/railway';
import { SearchBar } from './components/SearchBar';
import { ResultsList } from './components/ResultsList';
import { CoachDrawer } from './components/CoachDrawer';
import { LiveOrtpModal } from './components/LiveOrtpModal';

const INITIAL_STATIONS: StationOption[] = [
  { code: 'YGN', nameEn: 'Yangon', nameMm: 'ရန်ကုန်', region: 'Yangon Region' },
  { code: 'BGO', nameEn: 'Bago', nameMm: 'ပဲခူး', region: 'Bago Region' },
  { code: 'TGO', nameEn: 'Toungoo', nameMm: 'တောင်ငူ', region: 'Bago Region' },
  { code: 'NPT', nameEn: 'Naypyitaw', nameMm: 'နေပြည်တော်', region: 'Naypyitaw Union Territory' },
  { code: 'THZ', nameEn: 'Thazi', nameMm: 'သာစည်', region: 'Mandalay Region' },
  { code: 'MDL', nameEn: 'Mandalay', nameMm: 'မန္တလေး', region: 'Mandalay Region' },
  { code: 'PYY', nameEn: 'Pyay', nameMm: 'ပြည်', region: 'Bago Region' },
  { code: 'MLM', nameEn: 'Mawlamyine', nameMm: 'မော်လမြိုင်', region: 'Mon State' },
];

const DEFAULT_FORM: CheckSeatsRequest = {
  origin: 'YGN',
  destination: 'NPT',
  date: '2026-11-21',
  tripType: 'one-way',
  adults: 1,
  children: 0,
  infants: 0,
  timeWindowStart: '00:00',
  timeWindowEnd: '23:59',
  preferredClass: 'any',
  targetUrl: 'https://ortp.railways.gov.mm',
};

export default function App() {
  const [stations, setStations] = React.useState<StationOption[]>(INITIAL_STATIONS);
  const [form, setForm] = React.useState<CheckSeatsRequest>(DEFAULT_FORM);
  const [checkResult, setCheckResult] = React.useState<CheckSeatsResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedTrainId, setSelectedTrainId] = React.useState<string | null>(null);
  const [selectedClassCode, setSelectedClassCode] = React.useState<SeatClassCode | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  const [isImportModalOpen, setIsImportModalOpen] = React.useState<boolean>(false);
  const [importTab, setImportTab] = React.useState<'screenshot' | 'paste'>('screenshot');

  const runSeatCheck = React.useCallback(async (payload: CheckSeatsRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/check-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check Myanmar Railways route.');
      }
      const typed = data as CheckSeatsResponse;
      setCheckResult(typed);
      setForm(typed.query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error during check.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetch('/api/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stations?.length) setStations(d.stations);
      })
      .catch(() => {});

    runSeatCheck(DEFAULT_FORM);
  }, [runSeatCheck]);

  const handleInspectCoach = (train: EvaluatedTrainResult, classCode: SeatClassCode) => {
    setSelectedTrainId(train.id);
    setSelectedClassCode(classCode);
    setIsDrawerOpen(true);
  };

  const handleApplyExtracted = async (extraction: ScreenshotExtractionResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/apply-imported-ortp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction, currentForm: form }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to apply extracted ORTP data.');
      }
      const typed = data as CheckSeatsResponse;
      setCheckResult(typed);
      setForm(typed.query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply imported data.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTrainObj =
    checkResult?.trains.find((t) => t.id === selectedTrainId) ?? null;

  const neededSeats = Math.max(
    1,
    (checkResult?.query.adults ?? form.adults) + (checkResult?.query.children ?? form.children),
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1040px] mx-auto px-5 h-14 flex items-center justify-between gap-8">
          <a
            href="#route-checker"
            className="font-display text-base font-bold tracking-tight text-[#0B2447] whitespace-nowrap shrink-0"
          >
            MR RailCheck AI
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#route-checker"
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Seat Checker
            </a>
            <button
              type="button"
              onClick={() => {
                setImportTab('screenshot');
                setIsImportModalOpen(true);
              }}
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Import Live ORTP
            </button>
            <a
              href="https://ortp.railways.gov.mm"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Official Portal
            </a>
          </nav>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => runSeatCheck({ ...form, naturalQuery: undefined })}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#0B2447] hover:bg-[#133566] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? 'Checking...' : 'Check Seats'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-5 py-6 space-y-5">
        <SearchBar
          stations={stations}
          form={form}
          isLoading={isLoading}
          onChange={setForm}
          onSubmitManual={() => runSeatCheck({ ...form, naturalQuery: undefined })}
          onSubmitNatural={(naturalQuery) => runSeatCheck({ ...form, naturalQuery })}
        />

        <ResultsList
          data={checkResult}
          isLoading={isLoading}
          error={error}
          onInspectCoach={handleInspectCoach}
          onOpenImportModal={(tab = 'screenshot') => {
            setImportTab(tab);
            setIsImportModalOpen(true);
          }}
          onRetry={() => runSeatCheck({ ...form, naturalQuery: undefined })}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1040px] mx-auto px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>MR RailCheck AI</span>
          <a
            href="https://ortp.railways.gov.mm"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 hover:underline"
          >
            ortp.railways.gov.mm
          </a>
        </div>
      </footer>

      <CoachDrawer
        isOpen={isDrawerOpen}
        train={selectedTrainObj}
        classCode={selectedClassCode}
        neededSeats={neededSeats}
        onClose={() => setIsDrawerOpen(false)}
        onSelectClass={(classCode) => setSelectedClassCode(classCode)}
      />

      <LiveOrtpModal
        isOpen={isImportModalOpen}
        initialTab={importTab}
        onClose={() => setIsImportModalOpen(false)}
        onApplyExtracted={handleApplyExtracted}
      />
    </div>
  );
}
