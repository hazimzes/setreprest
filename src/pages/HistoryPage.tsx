import { Link } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { countCompletedSets, formatDate, formatDuration, sessionVolume } from '../domain/calculations';
import { Chip, EmptyState, Skeleton } from '../components/ui';
import { useMemo, useState } from 'react';

export function HistoryPage() {
  const { status, sessions, settings, gyms } = useAppStore().state;
  const [gymFilter, setGymFilter] = useState<string>('');

  interface MonthGroup {
    key: string;
    label: string;
    items: typeof sessions;
  }

  const filtered = useMemo(
    () => (gymFilter ? sessions.filter((s) => s.gymId === gymFilter) : sessions),
    [sessions, gymFilter]
  );

  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>();
    for (const s of filtered) {
      const d = new Date(s.startedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let group = map.get(key);
      if (!group) {
        group = { key, label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), items: [] };
        map.set(key, group);
      }
      group.items.push(s);
    }
    return [...map.values()];
  }, [filtered]);

  if (status === 'loading') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight">History</h1>
        <p className="text-xs text-muted">{filtered.length} workouts</p>
      </header>

      {gyms.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filter by gym">
          <Chip active={gymFilter === ''} onClick={() => setGymFilter('')}>All gyms</Chip>
          {gyms.map((g) => (
            <Chip key={g.id} active={gymFilter === g.id} onClick={() => setGymFilter(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No workouts yet" hint="Finish your first session and it lands here." />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
              {group.label}
            </h2>
            {group.items.map((s) => (
              <Link
                key={s.id}
                to={`/history/${s.id}`}
                className="block rounded-[10px] border border-line bg-surface p-4 hover:bg-raised"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {s.name}
                    {gyms.find((g) => g.id === s.gymId) && (
                      <span className="ml-2 rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-muted">
                        {gyms.find((g) => g.id === s.gymId)!.name}
                      </span>
                    )}
                  </p>
                  <p className="tnum shrink-0 text-xs text-muted">{formatDate(s.startedAt)}</p>
                </div>
                <p className="tnum mt-1 text-xs text-muted">
                  {formatDuration(s.accumulatedActiveMs)} · {countCompletedSets(s)} sets ·{' '}
                  {s.exercises.length} exercises · {Math.round(sessionVolume(s) * 10) / 10} {settings.units}
                </p>
              </Link>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
