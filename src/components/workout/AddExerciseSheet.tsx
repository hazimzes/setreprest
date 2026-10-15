import { useMemo, useState } from 'react';
import type { Equipment, Exercise } from '../../domain/models';
import { EQUIPMENT_TYPES } from '../../domain/models';
import { Chip, Sheet } from '../ui';

/** Library picker used to add or substitute an exercise inside a session. */
export function AddExerciseSheet({
  open,
  onClose,
  exercises,
  onPick,
  title = 'Add exercise',
  excludeIds = [],
}: {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onPick: (exerciseId: string) => void;
  title?: string;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeIds);
    return exercises
      .filter((e) => !excluded.has(e.id))
      .filter((e) => equipment === 'all' || e.equipment === equipment)
      .filter((e) => !favouritesOnly || e.isFavourite)
      .filter((e) => q === '' || e.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite) || a.name.localeCompare(b.name))
      .slice(0, 50);
  }, [exercises, query, equipment, favouritesOnly, excludeIds]);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises…"
        className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus-visible:outline-accent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by equipment">
        <Chip active={equipment === 'all'} onClick={() => setEquipment('all')}>All</Chip>
        {EQUIPMENT_TYPES.map((eq) => (
          <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>
            {eq}
          </Chip>
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={favouritesOnly}
          onChange={(e) => setFavouritesOnly(e.target.checked)}
          className="h-4 w-4 accent-[var(--app-accent)]"
        />
        Favourites only
      </label>

      <ul className="mt-3 max-h-[46vh] space-y-1 overflow-y-auto" aria-label="Exercise results">
        {results.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-muted">No exercises match.</li>
        )}
        {results.map((ex) => (
          <li key={ex.id}>
            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-raised"
              onClick={() => {
                onPick(ex.id);
                onClose();
              }}
            >
              <span className="min-w-0 flex-1 truncate">{ex.name}</span>
              {ex.isFavourite && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Favourite" className="shrink-0 text-accent">
                  <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
                </svg>
              )}
              <span className="shrink-0 text-xs text-muted">{ex.equipment}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
