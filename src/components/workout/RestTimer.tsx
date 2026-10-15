import { useEffect, useState } from 'react';

/** Countdown pill shown between sets. Skippable, extendable in 15 s steps. */
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
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Rest timer, ${remaining} seconds remaining`}
      className="fixed inset-x-4 bottom-[74px] z-40 mx-auto flex max-w-md items-center gap-3 rounded-[10px] border border-line-strong bg-surface px-4 py-3 shadow-lg"
    >
      <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--app-line)" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15" fill="none"
          stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct)}`}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="tnum text-base font-semibold leading-none">{remaining}s</p>
        <p className="microlabel mt-0.5">Rest</p>
      </div>
      <button className="rounded-[8px] border border-line px-3 py-2 text-xs font-medium hover:bg-raised" onClick={() => onExtend(15)}>
        +15s
      </button>
      <button className="rounded-[8px] bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
