import React from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import type { CheckSeatsResponse, EvaluatedTrainResult, SeatClassCode } from '../types/railway';

interface ResultsListProps {
  data: CheckSeatsResponse | null;
  isLoading: boolean;
  error: string | null;
  onInspectCoach: (train: EvaluatedTrainResult, classCode: SeatClassCode) => void;
  onOpenImportModal: (initialTab?: 'screenshot' | 'paste') => void;
  onRetry: () => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({
  data,
  isLoading,
  error,
  onInspectCoach,
  onOpenImportModal,
  onRetry,
}) => {
  const [filterMode, setFilterMode] = React.useState<'all' | 'compatible'>('all');

  if (isLoading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="h-5 w-56 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-16 w-full bg-slate-50 rounded animate-pulse mt-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg cursor-pointer"
        >
          Retry Check
        </button>
      </div>
    );
  }

  if (!data) return null;

  const visibleTrains =
    filterMode === 'compatible'
      ? data.trains.filter((t) => t.isFullyCompatible)
      : data.trains;

  const totalSeated = data.query.adults + data.query.children;
  const hasRealSeats = data.seatDataSource !== 'unavailable';

  return (
    <div className="space-y-4">
      {/* Honest Portal Status & AI Answer */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {hasRealSeats
                ? `Real Seat Data Loaded (${data.probe.portalTitle || data.seatDataSource})`
                : data.probe.reachable
                  ? `Connected to ${data.probe.targetUrl} (HTTP ${data.probe.httpStatus}) · Seat selection step required`
                  : `ortp.railways.gov.mm timed out from cloud server (${data.probe.latencyMs}ms · Myanmar IP/VPN required)`}
            </span>
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">{data.aiSummary.headline}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{data.aiSummary.recommendation}</p>
        </div>

        {!hasRealSeats ? (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Local Myanmar run (no VPN):{' '}
              <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                npx playwright install chromium &amp;&amp; npm run dev
              </code>
            </span>
            <button
              type="button"
              onClick={() => onOpenImportModal('paste')}
              className="text-blue-700 hover:underline cursor-pointer"
            >
              Manual ORTP import
            </button>
          </div>
        ) : (
          data.aiSummary.bestOptionSeats.length > 0 &&
          data.aiSummary.bestOptionTrainId && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-700">
                Real recommended seat numbers:{' '}
                <span className="font-mono font-semibold tabular-nums text-emerald-700">
                  {data.aiSummary.bestOptionSeats.join(', ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const bestTrain = data.trains.find(
                    (t) => t.id === data.aiSummary.bestOptionTrainId,
                  );
                  if (bestTrain && bestTrain.bestMatchingClass) {
                    onInspectCoach(bestTrain, bestTrain.bestMatchingClass.classCode);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-md transition-colors cursor-pointer"
              >
                View Real Seat Numbers
              </button>
            </div>
          )
        )}
      </div>

      {/* Train Schedule / Live Seat List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-700 tabular-nums">
            {data.query.origin} → {data.query.destination} · {data.query.date} · {totalSeated} seat(s)
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({data.trains.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('compatible')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filterMode === 'compatible' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Compatible ({data.trains.filter((t) => t.isFullyCompatible).length})
            </button>
          </div>
        </div>

        {visibleTrains.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No trains matched this filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {visibleTrains.map((train) => (
              <div
                key={train.id}
                className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* Train & Time */}
                <div className="md:w-56 shrink-0 space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {train.trainNameEn}{' '}
                    <span className="font-normal text-slate-500">· {train.trainNameMm}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm tabular-nums text-slate-800">
                    <span>{train.departureTime}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span>{train.arrivalTime}</span>
                    <span className="text-xs font-sans text-slate-500">({train.duration})</span>
                  </div>
                </div>

                {/* Seat Classes & Real Seat Numbers (or honest status) */}
                <div className="flex-1 space-y-1.5">
                  {train.seatClasses.map((cls) => (
                    <div
                      key={cls.classCode}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium text-slate-800">{cls.classNameEn}</span>
                        {cls.isLiveSeatData ? (
                          <>
                            <span
                              className={`font-medium tabular-nums ${
                                (cls.availableCount ?? 0) === 0
                                  ? 'text-red-700'
                                  : (cls.availableCount ?? 0) >= totalSeated
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {cls.availableCount === 0
                                ? 'Sold Out'
                                : `${cls.availableCount} real seat(s) open`}
                            </span>
                            {cls.availableSeatNumbers.length > 0 && (
                              <span className="font-mono tabular-nums text-slate-600">
                                · Seats: {cls.availableSeatNumbers.slice(0, 8).join(', ')}
                                {cls.availableSeatNumbers.length > 8 ? '…' : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500">
                            · Live seat numbers require ORTP import / Myanmar IP
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-slate-700">
                          {cls.fareMmk > 0 ? `${cls.fareMmk.toLocaleString()} MMK` : 'Fare N/A'}
                        </span>
                        {cls.isLiveSeatData && (
                          <button
                            type="button"
                            onClick={() => onInspectCoach(train, cls.classCode)}
                            className="text-blue-700 font-medium hover:underline whitespace-nowrap cursor-pointer"
                          >
                            View Seats
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compatibility */}
                <div className="md:w-40 shrink-0 md:text-right">
                  {train.isFullyCompatible ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {hasRealSeats ? 'Seats Compatible' : 'Schedule Match'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Not Matched
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
