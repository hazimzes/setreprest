import { useState } from 'react';
import type { Exercise, SessionExercise, Units } from '../../domain/models';
import { bestSet, estimateOneRepMax, setVolume } from '../../domain/calculations';
import { Button, PlusIcon } from '../ui';
import { SetRow } from './SetRow';

export function ExerciseCard({
  slot,
  exercise,
  units,
  onToggleSet,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  onRemove,
  onSubstitute,
  onMove,
}: {
  slot: SessionExercise;
  exercise: Exercise | undefined;
  units: Units;
  onToggleSet: (setId: string) => void;
  onUpdateSet: (setId: string, patch: Record<string, unknown>) => void;
  onRemoveSet: (setId: string) => void;
  onAddSet: () => void;
  onRemove: () => void;
  onSubstitute: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const done = slot.sets.filter((s) => s.completed).length;
  const total = slot.sets.length;
  const volume = slot.sets.reduce((sum, s) => sum + setVolume(s), 0);
  const pr = bestSet(slot.sets);
  const prE1rm = pr ? estimateOneRepMax(pr.set.weight, pr.set.reps) : null;
  const target = slot.targetSets !== undefined ? ` / ${slot.targetSets}` : '';

  return (
    <section className="rounded-[10px] border border-line bg-surface" aria-label={exercise?.name ?? 'Exercise'}>
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-raised"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold tracking-tight">{exercise?.name ?? 'Unknown exercise'}</h3>
          <p className="tnum mt-0.5 text-[11px] text-muted">
            {done}/{total || '—'}{target} sets
            {volume > 0 && ` · ${Math.round(volume * 10) / 10} ${units}`}
            {prE1rm !== null && ` · e1RM ${Math.round(prE1rm * 10) / 10}`}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
          aria-label={`${exercise?.name ?? 'Exercise'} options`}
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-muted hover:bg-raised hover:text-fg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {slot.substitutedFromExerciseId && (
        <p className="mx-3.5 mb-2 border-l-2 border-accent pl-2 text-[11px] leading-relaxed text-muted">
          Substituted in place of another exercise — history stays separate.
        </p>
      )}

      {expanded && (
        <div className="border-t border-line px-3 pb-3 pt-2">
          <div className="mb-1.5 flex items-center gap-1.5" aria-hidden="true">
            <span className="w-4 text-center text-[9px] font-medium uppercase tracking-wider text-muted">Set</span>
            <span className="w-3" />
            <span className="flex-1 text-center text-[9px] font-medium uppercase tracking-wider text-muted">Weight</span>
            <span className="flex-1 text-center text-[9px] font-medium uppercase tracking-wider text-muted">Reps</span>
            <span className="w-9 text-center text-[9px] font-medium uppercase tracking-wider text-muted">Done</span>
            <span className="w-7" />
          </div>
          <div className="space-y-1.5">
            {slot.sets.length === 0 && (
              <p className="py-2 text-xs text-muted">No sets yet — add your first set.</p>
            )}
          {slot.sets.map((set, i) => (
            <SetRow
              key={set.id}
              index={i}
              set={set}
              units={units}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onToggle={() => onToggleSet(set.id)}
              onRemove={() => onRemoveSet(set.id)}
            />
          ))}
          </div>
          <Button variant="outline" className="mt-2 w-full" onClick={onAddSet}>
            <PlusIcon />
            Add set
          </Button>
        </div>
      )}

      {menuOpen && (
        <ExerciseMenu
          onClose={() => setMenuOpen(false)}
          onRemove={() => { setMenuOpen(false); onRemove(); }}
          onSubstitute={() => { setMenuOpen(false); onSubstitute(); }}
          onMove={(d) => { setMenuOpen(false); onMove(d); }}
          exerciseName={exercise?.name ?? 'this exercise'}
        />
      )}
    </section>
  );
}

function ExerciseMenu({
  onClose, onRemove, onSubstitute, onMove, exerciseName,
}: {
  onClose: () => void;
  onRemove: () => void;
  onSubstitute: () => void;
  onMove: (dir: 'up' | 'down') => void;
  exerciseName: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Exercise options">
      <button aria-label="Close overlay" className="absolute inset-0 bg-black/50" onClick={onClose} tabIndex={-1} />
      <div className="relative z-10 w-full rounded-t-[10px] border border-line bg-surface p-4 sm:max-w-xs sm:rounded-[10px]">
        <h2 className="mb-3 truncate text-sm font-semibold tracking-tight">{exerciseName}</h2>
        <div className="grid gap-1.5">
          <Button onClick={onSubstitute}>Substitute exercise</Button>
          <Button onClick={() => onMove('up')}>Move up</Button>
          <Button onClick={() => onMove('down')}>Move down</Button>
          <Button variant="danger" onClick={onRemove}>Remove from workout</Button>
        </div>
      </div>
    </div>
  );
}
