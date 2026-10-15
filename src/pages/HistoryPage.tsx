import { Link } from 'react-router-dom';
import { useAppStore } from '../state/appStore';
import { countCompletedSets, sessionVolume } from '../domain/calculations';
import { weekStart } from '../domain/progress';
import { Chip, EmptyState, Skeleton } from '../components/ui';
import { useMemo, useState } from 'react';
import type { Session } from '../domain/models';

/** 8.3k / 13k / 940 - compact volume voice used on history rows. */
function compactVolume(kg: number): string {
  if (kg >= 10000) return String(Math.round(kg / 1000)) + 'k';
  if (kg >= 1000) return (Math.round(kg / 100) / 10).toFixed(1) + 'k';
  return String(Math.round(kg));
}

/** 1h 3m / 56m - compact duration voice. */
function compactDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? (h + 'h ' + m + 'm') : (m + 'm');
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

interface WeekGroup {
  key: string;
  label: string;
  items: Session[];
}

export function HistoryPage() {
  const { status, sessions, gyms, settings } = useAppStore().state;
  const [gymFilter, setGymFilter] = useState('');

  const filtered = useMemo(
    () => (gymFilter ? sessions.filter((s) => s.gymId === gymFilter) : sessions),
    [sessions, gymFilter]
  );

  const groups = useMemo<WeekGroup[]>(() => {
    const map = new Map<number, WeekGroup>();
    for (const s of filtered) {
      const start = weekStart(s.startedAt);
      let group = map.get(start);
      if (!group) {
        const label = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        group = { key: String(start), label: 'WEEK OF ' + label.toUpperCase(), items: [] };
        map.set(start, group);
      }
      group.items.push(s);
    }
    return [...map.values()].sort((a, b) => Number(b.key) - Number(a.key));
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
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight">History</h1>
        <p className="tnum text-[11px] text-muted">{filtered.length} workouts</p>
      </header>

      {gyms.length > 0 && (
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by gym">
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
            <h2 className="microlabel">{group.label}</h2>
            <ul className="space-y-2">
              {group.items.map((s) => {
                const d = new Date(s.startedAt);
                const volume = sessionVolume(s);
                return (
                  <li key={s.id}>
                    <Link
                      to={'/history/' + s.id}
                      className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3 py-2.5 transition-colors duration-150 hover:bg-raised"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[8px] bg-raised">
                        <span className="text-[9px] font-medium uppercase tracking-wide text-muted">
                          {WEEKDAY[d.getDay()]}
                        </span>
                        <span className="tnum text-[17px] font-semibold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold tracking-tight">{s.name}</p>
                        <p className="tnum mt-0.5 text-[11px] text-muted">
                          {new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' · '}
                          {compactDuration(s.accumulatedActiveMs)}
                          {' · '}
                          {countCompletedSets(s)} sets
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tnum text-[15px] font-semibold leading-none">{compactVolume(volume)}</p>
                        <p className="text-[10px] text-muted">{settings.units}</p>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                        className="shrink-0 text-muted"
                      >
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
