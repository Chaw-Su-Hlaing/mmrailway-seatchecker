import React from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { EvaluatedTrainResult, SeatClassCode } from '../types/railway';

interface CoachDrawerProps {
  isOpen: boolean;
  train: EvaluatedTrainResult | null;
  classCode: SeatClassCode | null;
  neededSeats: number;
  onClose: () => void;
  onSelectClass: (classCode: SeatClassCode) => void;
}

export const CoachDrawer: React.FC<CoachDrawerProps> = ({
  isOpen,
  train,
  classCode,
  neededSeats,
  onClose,
  onSelectClass,
}) => {
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);
  const [copied, setCopied] = React.useState(false);

  const activeClass =
    train?.seatClasses.find((c) => c.classCode === classCode) ?? train?.seatClasses[0] ?? null;

  React.useEffect(() => {
    if (activeClass) {
      setSelectedSeats(activeClass.recommendedSeats);
    }
  }, [train?.id, activeClass?.classCode]);

  if (!isOpen || !train || !activeClass) return null;

  const allSeats = [
    ...activeClass.availableSeatNumbers.map((n) => ({ seatNumber: n, occupied: false })),
    ...activeClass.occupiedSeatNumbers.map((n) => ({ seatNumber: n, occupied: true })),
  ].sort((a, b) => {
    const na = parseInt(a.seatNumber.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.seatNumber.replace(/\D/g, ''), 10) || 0;
    return na !== nb ? na - nb : a.seatNumber.localeCompare(b.seatNumber);
  });

  const toggleSeat = (seatNumber: string, occupied: boolean) => {
    if (occupied) return;
    setSelectedSeats((prev) =>
      prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber],
    );
  };

  const handleCopy = async () => {
    const text = `Train: ${train.trainNameEn} (${train.trainNameMm})\nClass: ${activeClass.classNameEn} (${activeClass.coachName})\nReal Seats: ${selectedSeats.join(', ') || 'None'}\nEst. Total: ${(selectedSeats.length * activeClass.fareMmk).toLocaleString()} MMK`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="w-full max-w-md bg-white h-full shadow-xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {train.trainNameEn} · {activeClass.coachName}
            </h3>
            <p className="text-xs text-slate-500">
              {activeClass.classNameEn} · {activeClass.fareMmk.toLocaleString()} MMK/seat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close seat map"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {train.seatClasses.length > 1 && (
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {train.seatClasses.map((cls) => (
                <button
                  key={cls.classCode}
                  type="button"
                  onClick={() => onSelectClass(cls.classCode)}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md cursor-pointer ${
                    cls.classCode === activeClass.classCode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  {cls.classNameEn}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
              Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block" />
              Available ({activeClass.availableSeatNumbers.length})
            </span>
            {activeClass.occupiedSeatNumbers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 inline-block" />
                Booked ({activeClass.occupiedSeatNumbers.length})
              </span>
            )}
          </div>

          {allSeats.length === 0 ? (
            <p className="text-xs text-slate-500">
              No individual seat numbers were present on this imported page.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              {allSeats.map((cell) => {
                const isSelected = selectedSeats.includes(cell.seatNumber);
                return (
                  <button
                    key={cell.seatNumber}
                    type="button"
                    disabled={cell.occupied}
                    onClick={() => toggleSeat(cell.seatNumber, cell.occupied)}
                    className={`h-9 rounded text-xs font-mono tabular-nums font-medium ${
                      cell.occupied
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-emerald-600 text-white cursor-pointer'
                          : 'bg-white border border-slate-300 text-slate-800 hover:border-blue-600 cursor-pointer'
                    }`}
                  >
                    {cell.seatNumber}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 space-y-3 bg-slate-50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Selected ({selectedSeats.length}/{neededSeats} needed):
            </span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {selectedSeats.join(', ') || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Estimated Fare:</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {(selectedSeats.length * activeClass.fareMmk).toLocaleString()} MMK
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full h-9 bg-[#0B2447] hover:bg-[#133566] text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Real Seat Numbers' : 'Copy Train & Seat Numbers'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
