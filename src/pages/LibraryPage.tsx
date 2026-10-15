import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS, type Equipment, type MuscleGroup } from '../domain/models';
import { Button, Chip, EmptyState, Sheet } from '../components/ui';
import { useToast } from '../components/ui';

export function LibraryPage() {
  const store = useAppStore();
  const { exercises, storageAvailable } = store.state;
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<Equipment | 'all'>('all');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => equipment === 'all' || e.equipment === equipment)
      .filter((e) => muscle === 'all' || e.muscleGroups.includes(muscle))
      .filter((e) => !favouritesOnly || e.isFavourite)
      .filter((e) => q === '' || e.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.isFavourite) - Number(a.isFavourite) || a.name.localeCompare(b.name));
  }, [exercises, query, equipment, muscle, favouritesOnly]);

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Library</h1>
        <p className="text-xs text-muted">{exercises.length} exercises</p>
      </header>

      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises…"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus-visible:outline-accent"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by equipment">
          <Chip active={equipment === 'all'} onClick={() => setEquipment('all')}>All equipment</Chip>
          {EQUIPMENT_TYPES.map((eq) => (
            <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>{eq}</Chip>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by muscle group">
          <Chip active={muscle === 'all'} onClick={() => setMuscle('all')}>All muscles</Chip>
          {MUSCLE_GROUPS.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>{m}</Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={favouritesOnly}
            onChange={(e) => setFavouritesOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--app-accent)]"
          />
          Favourites only
        </label>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No exercises match"
          hint="Try different filters, or create a custom exercise."
          action={storageAvailable ? <Button variant="primary" onClick={() => setCreateOpen(true)}>New exercise</Button> : undefined}
        />
      ) : (
        <ul className="space-y-1">
          {results.map((ex) => (
            <li key={ex.id} className="flex items-center gap-1 rounded-xl border border-line bg-surface">
              <Link to={`/library/${ex.id}`} className="min-w-0 flex-1 px-4 py-3">
                <span className="block truncate text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted">
                  {ex.equipment} · {ex.muscleGroups.join(', ')}
                </span>
              </Link>
              <button
                aria-label={ex.isFavourite ? `Remove ${ex.name} from favourites` : `Add ${ex.name} to favourites`}
                aria-pressed={ex.isFavourite}
                className="mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-fg"
                onClick={() => void store.toggleFavourite(ex.id)}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill={ex.isFavourite ? 'var(--app-accent)' : 'none'} stroke={ex.isFavourite ? 'var(--app-accent)' : 'currentColor'} strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {storageAvailable && (
        <Button variant="primary" className="w-full" onClick={() => setCreateOpen(true)}>
          + New custom exercise
        </Button>
      )}

      <CreateExerciseSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          try {
            await store.createExercise(input);
            toast('Exercise created', 'success');
            setCreateOpen(false);
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Could not create exercise', 'error');
          }
        }}
      />
    </div>
  );
}

function CreateExerciseSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; muscleGroups: MuscleGroup[]; equipment: Equipment; notes?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);

  const toggleMuscle = (m: MuscleGroup) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New custom exercise"
      footer={
        <Button
          variant="primary"
          className="w-full"
          disabled={!name.trim() || muscles.length === 0}
          onClick={() => void onCreate({ name, muscleGroups: muscles, equipment })}
        >
          Create
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="ex-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
            Name
          </label>
          <input
            id="ex-name"
            className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus-visible:outline-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Landmine Press"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Equipment</p>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_TYPES.map((eq) => (
              <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>{eq}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Muscle groups</p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} active={muscles.includes(m)} onClick={() => toggleMuscle(m)}>{m}</Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
