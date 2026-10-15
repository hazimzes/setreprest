import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../state/appStore';
import {
  bestSet,
  estimateOneRepMax,
  formatDate,
  formatWeight,
  personalRecordTimeline,
  setVolume,
} from '../domain/calculations';
import { Button, Chip, EmptyState, useToast } from '../components/ui';

/** Chart chrome driven by theme tokens; series color validated per theme (dataviz band). */
const AXIS = { stroke: 'var(--app-muted)', fontSize: 11 } as const;
const GRID = 'var(--app-line)';
const SERIES = 'var(--app-chart)';

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const store = useAppStore();
  const { sessions, exercises, settings, activeSession, gyms } = store.state;
  const navigate = useNavigate();
  const toast = useToast();

  const exercise = exercises.find((e) => e.id === id);
  const [gymFilter, setGymFilter] = useState('');
  const relevantSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.exercises.some((ex) => ex.exerciseId === id) &&
          (gymFilter === '' || s.gymId === gymFilter)
      ),
    [sessions, id, gymFilter]
  );
  const prTimeline = useMemo(
    () => (id ? personalRecordTimeline(sessions, id) : []),
    [sessions, id]
  );
  const e1rmData = useMemo(
    () =>
      relevantSessions.map((s) => {
        const sets = s.exercises.filter((ex) => ex.exerciseId === id).flatMap((ex) => ex.sets);
        const best = bestSet(sets);
        const e1rm = best ? estimateOneRepMax(best.set.weight, best.set.reps) : null;
        return {
          label: formatDate(s.startedAt),
          e1rm: e1rm !== null ? Math.round(e1rm * 10) / 10 : null,
        };
      }),
    [relevantSessions, id]
  );
  const volumeData = useMemo(
    () =>
      relevantSessions.map((s) => ({
        label: formatDate(s.startedAt),
        volume:
          Math.round(
            s.exercises
              .filter((ex) => ex.exerciseId === id)
              .flatMap((ex) => ex.sets)
              .reduce((sum, set) => sum + setVolume(set), 0) * 10
          ) / 10,
      })),
    [relevantSessions, id]
  );

  if (!exercise) {
    return (
      <EmptyState
        title="Exercise not found"
        action={
          <Link to="/library">
            <Button>Back to library</Button>
          </Link>
        }
      />
    );
  }

  const allTime = prTimeline.length > 0 ? prTimeline[prTimeline.length - 1] : null;
  const inWorkout = activeSession !== null;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <Link to="/library" className="text-xs text-muted hover:underline">
          ← Library
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">{exercise.name}</h1>
            <p className="text-xs text-muted">
              {exercise.equipment} · {exercise.muscleGroups.join(', ')}
            </p>
          </div>
          {inWorkout && (
            <Button
              variant="primary"
              onClick={() => {
                void store
                  .addSessionExercise(exercise.id)
                  .catch((e: Error) => toast(e.message, 'error'))
                  .then(() => navigate('/workout'));
              }}
            >
              Add to workout
            </Button>
          )}
        </div>
      </header>

      {gyms.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filter progress by gym">
          <Chip active={gymFilter === ''} onClick={() => setGymFilter('')}>All gyms</Chip>
          {gyms.map((g) => (
            <Chip key={g.id} active={gymFilter === g.id} onClick={() => setGymFilter(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}

      {allTime && (
        <section className="rounded-[10px] border border-line-strong bg-raised p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Personal record{gymFilter ? ` — ${gyms.find((g) => g.id === gymFilter)?.name ?? ''}` : ''}
          </p>
          <p className="tnum mt-1 text-2xl font-semibold">
            {allTime.candidate.set.weight} {settings.units} × {allTime.candidate.set.reps}
          </p>
          <p className="tnum mt-0.5 text-xs text-muted">
            est. 1RM {Math.round(allTime.candidate.oneRepMax * 10) / 10} {settings.units} ·{' '}
            {formatDate(allTime.date)}
          </p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold tracking-tight">
          Estimated 1RM progression{gymFilter ? ` — ${gyms.find((g) => g.id === gymFilter)?.name ?? ''}` : ''}
        </h2>
        {e1rmData.filter((d) => d.e1rm !== null).length >= 2 ? (
          <div className="rounded-[10px] border border-line bg-surface p-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={e1rmData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-line)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--app-muted)' }}
                  formatter={(value) => [`${String(value)} ${settings.units}`, 'Est. 1RM']}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  stroke={SERIES}
                  strokeWidth={2}
                  dot={{ r: 3, fill: SERIES, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-[8px] border border-line px-4 py-3 text-xs text-muted">
            Not enough data yet — at least two sessions with working sets of 1–12 reps are needed.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold tracking-tight">
          Volume per session{gymFilter ? ` — ${gyms.find((g) => g.id === gymFilter)?.name ?? ''}` : ''}
        </h2>
        {volumeData.length >= 2 ? (
          <div className="rounded-[10px] border border-line bg-surface p-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volumeData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--app-accent-soft)' }}
                  contentStyle={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-line)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--app-muted)' }}
                  formatter={(value) => [`${String(value)} ${settings.units}`, 'Volume']}
                />
                <Bar dataKey="volume" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="rounded-[8px] border border-line px-4 py-3 text-xs text-muted">
            Log this exercise in two or more sessions to see volume trends.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold tracking-tight">History</h2>
        {relevantSessions.length === 0 ? (
          <p className="rounded-[8px] border border-line px-4 py-3 text-xs text-muted">
            No logged sessions yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {relevantSessions.map((s) => {
              const sets = s.exercises.filter((ex) => ex.exerciseId === id).flatMap((ex) => ex.sets);
              const workingWeights = sets
                .filter((x) => x.type === 'working' && x.completed)
                .map((x) => x.weight);
              const heaviest =
                workingWeights.length > 0 ? formatWeight(Math.max(...workingWeights), settings.units) : '—';
              return (
                <li key={s.id}>
                  <Link
                    to={`/history/${s.id}`}
                    className="flex items-baseline justify-between rounded-[8px] border border-line bg-surface px-4 py-3 hover:bg-raised"
                  >
                    <span className="text-sm">{formatDate(s.startedAt)}</span>
                    <span className="tnum text-xs text-muted">
                      {sets.filter((x) => x.completed).length} sets · top {heaviest}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
