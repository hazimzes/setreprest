import { useState } from 'react';
import type { Gym } from '../domain/models';
import { Button, Sheet, useToast } from './ui';

/**
 * Gym selector shown as cards on Home. '' = all gyms. Selection persists
 * (settings.selectedGymId) and tags new workouts automatically.
 */
export function GymTabs({
  gyms,
  selected,
  onSelect,
  onCreate,
  storageAvailable,
}: {
  gyms: Gym[];
  selected: string;
  onSelect: (gymId: string) => void;
  onCreate: (name: string) => Promise<void>;
  storageAvailable: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const toast = useToast();

  const items: { id: string; name: string }[] = [
    { id: '', name: 'All gyms' },
    ...gyms.map((g) => ({ id: g.id, name: g.name })),
  ];

  return (
    <section aria-label="Gym selection" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Where are you training?</h2>
        {gyms.length === 0 && storageAvailable && (
          <button className="text-xs text-accent underline-offset-2 hover:underline" onClick={() => setAddOpen(true)}>
            + Add gym
          </button>
        )}
      </div>
      <div className="grid grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id || 'all'}
              aria-pressed={active}
              onClick={() => onSelect(item.id)}
              className={`min-h-16 w-32 shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:bg-raised/50'
              }`}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                className={active ? 'text-accent' : 'text-muted'}
              >
                <path
                  d="M4 9v6M20 9v6M7 5v14M17 5v14M7 12h10"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                />
              </svg>
              <span className={`mt-1.5 block truncate text-sm font-medium ${active ? 'text-fg' : 'text-muted'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
        {gyms.length > 0 && storageAvailable && (
          <button
            aria-label="Add gym"
            className="flex min-h-16 w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-muted hover:text-fg"
            onClick={() => setAddOpen(true)}
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-xs">Add gym</span>
          </button>
        )}
      </div>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New gym"
        footer={
          <Button
            variant="primary"
            className="w-full"
            disabled={!draft.trim()}
            onClick={() => {
              void onCreate(draft)
                .then(() => {
                  toast('Gym added', 'success');
                  setDraft('');
                  setAddOpen(false);
                })
                .catch((e: Error) => toast(e.message, 'error'));
            }}
          >
            Add
          </Button>
        }
      >
        <label htmlFor="gym-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          Gym name
        </label>
        <input
          id="gym-name"
          className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus-visible:outline-accent"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Celebrity Fitness AEON"
          autoFocus
        />
        <p className="mt-2 text-xs text-muted">
          Each gym keeps its own history and personal records — equipment differs, so numbers stay separate.
        </p>
      </Sheet>
    </section>
  );
}
