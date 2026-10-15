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
    <div className="flex h-9 min-w-0 flex-1 items-center rounded-[8px] border border-line bg-raised focus-within:border-line-strong">
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        className="tnum h-full w-full min-w-0 bg-transparent px-1.5 text-center text-[13px] text-fg outline-none"
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
  const typeMark = set.type === 'warmup' ? 'W' : set.type === 'drop' ? 'D' : '';

  return (
    <div className="flex items-center gap-1.5">
      <span className="tnum w-4 shrink-0 text-right text-[11px] text-muted" aria-hidden="true">
        {index + 1}
      </span>
      {typeMark ? (
        <span
          className="w-3 shrink-0 text-center text-[9px] font-semibold text-muted"
          title={setTypeLabel(set.type)}
        >
          {typeMark}
        </span>
      ) : (
        <span className="w-3 shrink-0" aria-hidden="true" />
      )}
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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-150 ${
          set.completed
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line bg-raised text-muted hover:border-line-strong hover:text-fg'
        }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={() => setMenuOpen(true)}
        aria-label={`Set ${index + 1} options`}
        className="flex h-9 w-7 shrink-0 items-center justify-center rounded-[6px] text-muted hover:bg-raised hover:text-fg"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={`Set ${index + 1}`}>
        <div className="space-y-4">
          <div>
            <p className="microlabel mb-1.5">Set type</p>
            <div className="flex gap-1.5">
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
            <p className="microlabel mb-1.5">RPE {set.rpe !== undefined ? `· ${set.rpe}` : '· not set'}</p>
            <div className="flex items-center gap-1.5">
              <Button
                aria-label="Decrease RPE"
                onClick={() => onUpdate({ rpe: Math.max(1, Math.round(((set.rpe ?? 7) - 0.5) * 2) / 2) })}
              >
                −
              </Button>
              <div className="tnum flex-1 rounded-[8px] border border-line bg-raised py-2 text-center text-sm">
                {set.rpe !== undefined ? set.rpe : '—'}
              </div>
              <Button
                aria-label="Increase RPE"
                onClick={() => onUpdate({ rpe: Math.min(10, Math.round(((set.rpe ?? 6.5) + 0.5) * 2) / 2) })}
              >
                +
              </Button>
              <Button variant="ghost" onClick={() => onUpdate({ rpe: undefined })}>
                Clear
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor={`notes-${set.id}`} className="microlabel mb-1.5 block">
              Notes
            </label>
            <textarea
              id={`notes-${set.id}`}
              className="min-h-20 w-full rounded-[8px] border border-line bg-raised p-2.5 text-[13px] text-fg outline-none focus:border-line-strong"
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
