import React from 'react';
import { ArrowLeftRight, Search, Sparkles } from 'lucide-react';
import type { CheckSeatsRequest, SeatClassCode, StationOption } from '../types/railway';

interface SearchBarProps {
  stations: StationOption[];
  form: CheckSeatsRequest;
  isLoading: boolean;
  onChange: (next: CheckSeatsRequest) => void;
  onSubmitManual: () => void;
  onSubmitNatural: (query: string) => void;
}

const EXAMPLE_PROMPTS = [
  '2 adults Yangon to Naypyitaw on 2026-11-21 morning',
  'Yangon to Mandalay 2026-11-21 for 3 adults Upper Class',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  stations,
  form,
  isLoading,
  onChange,
  onSubmitManual,
  onSubmitNatural,
}) => {
  const [inputMode, setInputMode] = React.useState<'form' | 'ai'>('form');
  const [aiPrompt, setAiPrompt] = React.useState(form.naturalQuery ?? '');
  const [showPassengerDetail, setShowPassengerDetail] = React.useState(false);

  const timePresetValue =
    form.timeWindowStart === '05:00' && form.timeWindowEnd === '11:59'
      ? 'morning'
      : form.timeWindowStart === '12:00' && form.timeWindowEnd === '23:59'
        ? 'afternoon'
        : 'any';

  const handleTimePresetChange = (preset: string) => {
    if (preset === 'morning') {
      onChange({ ...form, timeWindowStart: '05:00', timeWindowEnd: '11:59' });
    } else if (preset === 'afternoon') {
      onChange({ ...form, timeWindowStart: '12:00', timeWindowEnd: '23:59' });
    } else {
      onChange({ ...form, timeWindowStart: '00:00', timeWindowEnd: '23:59' });
    }
  };

  const totalSeated = form.adults + form.children;

  return (
    <section
      id="route-checker"
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Myanmar Railways Seat Checker
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Find route-compatible trains and exact available seat numbers for ORTP.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setInputMode('form')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              inputMode === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route Form
          </button>
          <button
            type="button"
            onClick={() => setInputMode('ai')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              inputMode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ask AI
          </button>
        </div>
      </div>

      {inputMode === 'ai' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (aiPrompt.trim()) onSubmitNatural(aiPrompt.trim());
          }}
          className="space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask in English or Burmese (e.g. 2 adults Yangon to Naypyitaw 2026-11-21 morning)"
                className="w-full h-10 pl-10 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !aiPrompt.trim()}
              className="h-10 px-5 bg-[#0B2447] hover:bg-[#133566] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {isLoading ? 'Checking...' : 'Check with AI'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Examples:</span>
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setAiPrompt(ex);
                  onSubmitNatural(ex);
                }}
                className="text-blue-700 hover:underline cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitManual();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
            <div className="lg:col-span-3 space-y-1">
              <label htmlFor="from-station" className="block text-xs font-medium text-slate-600">
                From (ထွက်ခွာ)
              </label>
              <select
                id="from-station"
                value={form.origin}
                onChange={(e) => onChange({ ...form, origin: e.target.value })}
                className="w-full h-10 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {stations.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.nameEn} ({st.nameMm})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="to-station" className="block text-xs font-medium text-slate-600">
                  To (ဆိုက်ရောက်)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...form, origin: form.destination, destination: form.origin })
                  }
                  className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Swap
                </button>
              </div>
              <select
                id="to-station"
                value={form.destination}
                onChange={(e) => onChange({ ...form, destination: e.target.value })}
                className="w-full h-10 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {stations.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.nameEn} ({st.nameMm})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label htmlFor="dep-date" className="block text-xs font-medium text-slate-600">
                Date
              </label>
              <input
                id="dep-date"
                type="date"
                value={form.date}
                onChange={(e) => onChange({ ...form, date: e.target.value })}
                className="w-full h-10 px-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <label htmlFor="dep-time" className="block text-xs font-medium text-slate-600">
                Time
              </label>
              <select
                id="dep-time"
                value={timePresetValue}
                onChange={(e) => handleTimePresetChange(e.target.value)}
                className="w-full h-10 px-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="any">Any Time</option>
                <option value="morning">Morning (05:00–12:00)</option>
                <option value="afternoon">Afternoon (12:00+)</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label htmlFor="seat-count" className="block text-xs font-medium text-slate-600">
                  Seats
                </label>
                <input
                  id="seat-count"
                  type="number"
                  min={1}
                  max={12}
                  value={totalSeated}
                  onChange={(e) =>
                    onChange({
                      ...form,
                      adults: Math.max(1, Number(e.target.value) || 1),
                      children: 0,
                    })
                  }
                  className="w-full h-10 px-2.5 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-10 px-4 bg-[#0B2447] hover:bg-[#133566] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Checking' : 'Check'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5">
                <span>Class:</span>
                <select
                  value={form.preferredClass || 'any'}
                  onChange={(e) =>
                    onChange({ ...form, preferredClass: e.target.value as SeatClassCode | 'any' })
                  }
                  className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="any">Any Class</option>
                  <option value="ordinary">Ordinary Class</option>
                  <option value="upper">Upper Class</option>
                  <option value="first_demu">First Class DEMU</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setShowPassengerDetail((v) => !v)}
                className="text-blue-700 hover:underline cursor-pointer"
              >
                {showPassengerDetail ? 'Hide passenger breakdown' : 'Adult / Child / Infant options'}
              </button>
            </div>

            {showPassengerDetail && (
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <label className="flex items-center gap-1">
                  <span className="font-sans">Adults:</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.adults}
                    onChange={(e) =>
                      onChange({ ...form, adults: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-12 h-7 px-1.5 border border-slate-200 rounded text-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-sans">Child (3-12):</span>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={form.children}
                    onChange={(e) =>
                      onChange({ ...form, children: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-12 h-7 px-1.5 border border-slate-200 rounded text-slate-900"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="font-sans">Infant (&lt;3):</span>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={form.infants}
                    onChange={(e) =>
                      onChange({ ...form, infants: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-12 h-7 px-1.5 border border-slate-200 rounded text-slate-900"
                  />
                </label>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
