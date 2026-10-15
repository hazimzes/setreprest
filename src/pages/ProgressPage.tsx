import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../state/appStore';
import {
  muscleVolume,
  progressSummary,
  recentPrs,
  streakWeeks,
  strengthSeries,
  trendOf,
  weeklyBuckets,
  type Trend,
} from '../domain/progress';
import { formatDate } from '../domain/calculations';
import { Chip, EmptyState, MicroLabel } from '../components/ui';

const AXIS = { stroke: 'var(--app-muted)', fontSize: 10 } as const;
const GRID = 'var(--app-line)';
/** Fixed series colors — palette validated per theme (dataviz checks). */
const SERIES = ['var(--app-chart)', 'var(--app-chart-2)', 'var(--app-chart-3)', 'var(--app-chart-4)'];

const TREND_VOICE: Record<Trend, { label: string; tone: string; arrow: string }> = {
  improving: { label: 'Improving', tone: 'text-accent', arrow: '▲' },
  declining: { label: 'Declining', tone: 'text-danger', arrow: '▼' },
  flat: { label: 'Holding steady', tone: 'text-secondary', arrow: '—' },
};

function tooltipStyle() {
  return {
    background: 'var(--app-surface)',
    border: '1px solid var(--app-line)',
    borderRadius: 8,
    fontSize: 12,
  };
}

export function ProgressPage() {
  const store = useAppStore();
  const { status, sessions, exercises, gyms, settings } = store.state;
  const [gymFilter, setGymFilter] = useState('');

  const visible = useMemo(
    () => (gymFilter ? sessions.filter((s) => s.gymId === gymFilter) : sessions),
    [sessions, gymFilter]
  );

  const summary = useMemo(() => progressSummary(visible, Date.now()), [visible]);
  const weeks = useMemo(() => weeklyBuckets(visible, 12, Date.now()), [visible]);
  const streak = useMemo(() => streakWeeks(visible, Date.now()), [visible]);
  const strength = useMemo(
    () => strengthSeries(visible, exercises, 12, Date.now()),
    [visible, exercises]
  );
  const muscles = useMemo(() => muscleVolume(visible, exercises, 28, Date.now()), [visible, exercises]);
  const prs = useMemo(() => recentPrs(visible, exercises, 28, Date.now()), [visible, exercises]);

  const strengthData = useMemo(() => {
    if (strength.length === 0) return [];
    return strength[0]!.points.map((_, i) => {
      const row: Record<string, number | null | string> = {
        label: weeks[i]?.label ?? `W${i}`,
      };
      for (const series of strength) {
        row[series.name] = series.points[i] ?? null;
      }
      return row;
    });
  }, [strength, weeks]);

  if (status === 'loading') return null;

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight">Progress</h1>
        <p className="tnum text-[11px] text-muted">
          {gymFilter ? gyms.find((g) => g.id === gymFilter)?.name : 'All gyms'}
        </p>
      </header>

      {gyms.length > 0 && (
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter progress by gym">
          <Chip active={gymFilter === ''} onClick={() => setGymFilter('')}>All gyms</Chip>
          {gyms.map((g) => (
            <Chip key={g.id} active={gymFilter === g.id} onClick={() => setGymFilter(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing to measure yet"
          hint="Log a couple of workouts (or load the demo dataset from Settings) and your trends appear here."
        />
      ) : (
        <>
          {/* Verdict + headline numbers */}
          <section className="rounded-[10px] border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <MicroLabel>Trailing 4 weeks vs prior</MicroLabel>
                <p className={`mt-1 text-lg font-semibold tracking-tight ${TREND_VOICE[summary.trend].tone}`}>
                  {TREND_VOICE[summary.trend].arrow} {TREND_VOICE[summary.trend].label}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-sm font-semibold">
                  {summary.volumeDeltaPct >= 0 ? '+' : ''}
                  {Math.round(summary.volumeDeltaPct * 100)}%
                </p>
                <p className="tnum text-[11px] text-muted">
                  {summary.sessionsDelta >= 0 ? '+' : ''}
                  {summary.sessionsDelta} sessions
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <StatTile label="Streak" value={`${streak} wk`} />
            <StatTile
              label="Weekly avg"
              value={`${Math.round(
                weeks.slice(-4).reduce((s, w) => s + w.volume, 0) / Math.max(1, weeks.slice(-4).filter((w) => w.volume > 0).length || 1)
              )} ${settings.units}`}
            />
            <StatTile label="PRs · 4 wk" value={String(prs.length)} />
          </section>

          {/* Weekly volume */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold tracking-tight">Weekly volume</h2>
              <VolumeTrend weeks={weeks} units={settings.units} />
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-3">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--app-accent-dim)' }}
                    contentStyle={tooltipStyle()}
                    formatter={(value) => [`${Number(value).toLocaleString()} ${settings.units}`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="var(--app-chart)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Strength — top lifts weekly e1RM */}
          <section className="space-y-2">
            <h2 className="text-[13px] font-semibold tracking-tight">Strength — est. 1RM, top lifts</h2>
            {strengthData.length > 0 ? (
              <div className="rounded-[10px] border border-line bg-surface p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={strengthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Legend
                      iconType="plainline"
                      wrapperStyle={{ fontSize: 11, color: 'var(--app-secondary)' }}
                    />
                    {strength.map((series, i) => (
                      <Line
                        key={series.exerciseId}
                        type="monotone"
                        dataKey={series.name}
                        stroke={SERIES[i % SERIES.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-[8px] border border-line px-3 py-2.5 text-xs text-muted">
                No loaded lifts in the last 12 weeks.
              </p>
            )}
          </section>

          {/* Muscle split */}
          <section className="space-y-2">
            <h2 className="text-[13px] font-semibold tracking-tight">Volume by muscle · 4 weeks</h2>
            {muscles.length > 0 ? (
              <div className="rounded-[10px] border border-line bg-surface p-3">
                <ResponsiveContainer width="100%" height={Math.max(120, muscles.length * 26)}>
                  <BarChart data={muscles} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="muscle"
                      tick={{ ...AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={76}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--app-accent-dim)' }}
                      contentStyle={tooltipStyle()}
                      formatter={(value) => [`${Number(value).toLocaleString()} ${settings.units}`, 'Volume']}
                    />
                    <Bar dataKey="volume" fill="var(--app-chart)" radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="rounded-[8px] border border-line px-3 py-2.5 text-xs text-muted">No sets in the last 4 weeks.</p>
            )}
          </section>

          {/* Recent PRs */}
          <section className="space-y-2">
            <h2 className="text-[13px] font-semibold tracking-tight">Personal records · 4 weeks</h2>
            {prs.length === 0 ? (
              <p className="rounded-[8px] border border-line px-3 py-2.5 text-xs text-muted">
                No new records this month — heavy weeks ahead.
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface">
                {prs.slice(0, 8).map((pr) => (
                  <li key={`${pr.exerciseId}-${pr.date}`} className="flex items-baseline justify-between gap-2 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{pr.exerciseName}</p>
                      <p className="tnum text-[11px] text-muted">{formatDate(pr.date)}</p>
                    </div>
                    <div className="tnum shrink-0 text-right text-[13px]">
                      <span className="font-semibold">{pr.weight}</span>
                      <span className="text-secondary"> {settings.units} × {pr.reps}</span>
                      <span className="ml-2 text-[11px] text-muted">e1RM {pr.e1rm}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface px-3 py-2.5">
      <MicroLabel>{label}</MicroLabel>
      <p className="tnum mt-0.5 text-[15px] font-semibold">{value}</p>
    </div>
  );
}

function VolumeTrend({ weeks, units }: { weeks: { volume: number }[]; units: string }) {
  const { trend, deltaPct } = trendOf(weeks.map((w) => w.volume));
  const voice = TREND_VOICE[trend];
  return (
    <p className={`tnum text-[11px] ${voice.tone}`}>
      {voice.arrow} {Math.abs(Math.round(deltaPct * 100))}% · 4 wk · {units}
    </p>
  );
}
