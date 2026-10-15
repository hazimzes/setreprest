import { useEffect, useState } from 'react';

/**
 * Fullscreen rest overlay between sets: blurred dimmed backdrop, big centered
 * countdown ring, +15s / Skip controls. Tapping the backdrop skips.
 */
export function RestTimer({
  seconds,
  onDone,
  onSkip,
  onExtend,
}: {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
  onExtend: (extra: number) => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const pct = seconds > 0 ? remaining / seconds : 0;
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <div
      role="timer"
      aria-label={`Rest timer, ${remaining} seconds remaining`}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-bg/70 backdrop-blur-xl"
      onClick={onSkip}
    >
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true" className="-rotate-90">
          <circle cx="110" cy="110" r={R} fill="none" stroke="var(--app-line)" strokeWidth="6" />
          <circle
            cx="110" cy="110" r={R} fill="none"
            stroke="var(--app-accent)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="tnum text-6xl font-semibold tabular-nums leading-none tracking-tight">{remaining}</p>
          <p className="microlabel mt-2">seconds rest</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="h-11 rounded-[8px] border border-line-strong bg-surface px-5 text-sm font-medium text-fg transition-colors hover:bg-raised"
          onClick={(e) => { e.stopPropagation(); onExtend(15); }}
        >
          +15s
        </button>
        <button
          className="h-11 rounded-[8px] bg-accent px-8 text-sm font-semibold text-accent-ink transition-[filter] hover:brightness-110 active:brightness-95"
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
        >
          Skip rest
        </button>
      </div>

      <p className="absolute inset-x-0 bottom-10 text-center text-xs text-muted">
        tap anywhere to skip
      </p>
    </div>
  );
}
