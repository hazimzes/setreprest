import { useEffect, useRef, useState } from 'react';

/**
 * Fullscreen rest overlay between sets: blurred dimmed backdrop, large countdown
 * ring, +15s / Skip controls. Tapping anywhere skips.
 *
 * The countdown runs off an absolute deadline timestamp, not decrements — parent
 * re-renders (the per-second workout clock) must not reset or slow it.
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
  const deadlineRef = useRef(Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const cbRef = useRef({ onDone, onSkip, onExtend });
  cbRef.current = { onDone, onSkip, onExtend };

  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        cbRef.current.onDone();
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const extend = (extra: number) => {
    deadlineRef.current += extra * 1000;
    setRemaining(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
    cbRef.current.onExtend(extra);
  };

  const total = Math.round(seconds);
  const pct = total > 0 ? remaining / total : 0;
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
          onClick={(e) => { e.stopPropagation(); extend(15); }}
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
