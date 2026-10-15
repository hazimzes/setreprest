import { useState } from 'react';
import type { SetEntry, Units } from '../../domain/models';
import { setTypeLabel } from '../../domain/validation';
import { Button, Sheet } from '../ui';

/**
 * Compact type-in field for set rows. Stepper buttons don't fit next to the
 * other row controls on phone widths — the numeric keypad is the input method.
 */
function SetInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-line bg-raised">
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        className="tnum h-full w-full min-w-0 bg-transparent px-1.5 text-center text-sm outline-none"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
      <span className="shrink-0 pr-2 text-[10px] text-muted" aria-hidden="true">
        {suffix}
      </span>
    </div>
  );
}

export function SetRow({
  index,
  set,
  units,
  onUpdate,
  onToggle,
  onRemove,
}: {
  index: number;
  set: SetEntry;
  units: Units;
  onUpdate: (patch: Partial<SetEntry>) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const typeTone =
    set.type === 'warmup'
      ? 'text-muted border-line bg-raised'
      : set.type === 'drop'
        ? 'text-fg border-line bg-accent-soft'
        : 'border-line bg-raised text-fg';

  return (
    <div className="flex items-center gap-1.5">
      <span className="tnum w-5 shrink-0 text-right text-xs text-muted" aria-hidden="true">
        {index + 1}
      </span>
      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${typeTone}`}>
        {setTypeLabel(set.type)}
      </span>
      <SetInput
        label={`Set ${index + 1} weight in ${units}`}
        value={set.weight}
        onChange={(v) => onUpdate({ weight: v })}
        suffix={units}
      />
      <SetInput
        label={`Set ${index + 1} reps`}
        value={set.reps}
        onChange={(v) => onUpdate({ reps: Math.round(v) })}
        suffix="reps"
      />
      <button
        onClick={onToggle}
        aria-pressed={set.completed}
        aria-label={set.completed ? `Mark set ${index + 1} incomplete` : `Mark set ${index + 1} complete`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          set.completed
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line bg-raised text-muted hover:text-fg'
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => setMenuOpen(true)}
        aria-label={`Set ${index + 1} options`}
        className="flex h-11 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={`Set ${index + 1} options`}>
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Set type</p>
            <div className="flex gap-2">
              {(['warmup', 'working', 'drop'] as const).map((t) => (
                <Button
                  key={t}
                  variant={set.type === t ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={() => onUpdate({ type: t })}
                >
                  {setTypeLabel(t)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              RPE {set.rpe !== undefined ? `— ${set.rpe}` : '— not set'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onUpdate({ rpe: Math.max(1, Math.round(((set.rpe ?? 7) - 0.5) * 2) / 2) })}
                aria-label="Decrease RPE"
              >
                −
              </Button>
              <div className="tnum flex-1 rounded-xl border border-line bg-raised py-2.5 text-center text-sm">
                {set.rpe !== undefined ? set.rpe : '—'}
              </div>
              <Button
                onClick={() => onUpdate({ rpe: Math.min(10, Math.round(((set.rpe ?? 6.5) + 0.5) * 2) / 2) })}
                aria-label="Increase RPE"
              >
                +
              </Button>
              <Button variant="ghost" onClick={() => onUpdate({ rpe: undefined })}>
                Clear
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor={`notes-${set.id}`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Notes
            </label>
            <textarea
              id={`notes-${set.id}`}
              className="min-h-20 w-full rounded-xl border border-line bg-raised p-3 text-sm outline-none focus-visible:outline-accent"
              value={set.notes ?? ''}
              onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
              placeholder="Felt strong, paused at bottom…"
            />
          </div>
          <Button variant="danger" className="w-full" onClick={() => { onRemove(); setMenuOpen(false); }}>
            Delete set
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
