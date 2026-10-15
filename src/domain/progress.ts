import { bestSet, estimateOneRepMax, isEligibleForPr, sessionVolume } from './calculations';
import type { Exercise, MuscleGroup, Session } from './models';

/**
 * Pure aggregation helpers for the Progress page. All buckets are ISO-week-ish:
 * a "week" is a rolling 7-day window ending on the last session day — simple,
 * stable, and avoids locale week-start debates.
 */

const DAY = 24 * 3600 * 1000;

/** Monday-start week containing `now`, at local midnight. */
export function weekStart(now: number): number {
  const d = new Date(now);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  return d.getTime() - offset * DAY;
}

export interface WeekDay {
  date: number;
  dayOfMonth: number;
  letter: string;
  isToday: boolean;
  isPast: boolean;
}

/** The 7 days (Mon..Sun) of the week containing `now`. */
export function weekDays(now: number): WeekDay[] {
  const start = weekStart(now);
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = start + i * DAY;
    const d = new Date(date);
    return {
      date,
      dayOfMonth: d.getDate(),
      letter: letters[i]!,
      isToday: date === today.getTime(),
      isPast: date < today.getTime(),
    };
  });
}

export interface WeekBucket {
  /** Epoch ms of the week's Monday-style label anchor (start of window). */
  start: number;
  label: string;
  volume: number;
  sessions: number;
}

/** Weekly volume + session count for the last `weeks` windows, oldest first. */
export function weeklyBuckets(sessions: Session[], weeks: number, now: number): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const done = sessions.filter((s) => s.status === 'completed');
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    const inWeek = done.filter((s) => s.startedAt > start && s.startedAt <= end);
    buckets.push({
      start,
      label: new Date(end).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      volume: inWeek.reduce((sum, s) => sum + sessionVolume(s), 0),
      sessions: inWeek.length,
    });
  }
  return buckets;
}

export type Trend = 'improving' | 'declining' | 'flat';

/** Compare the most recent half of a numeric series against the earlier half. */
export function trendOf(values: number[], threshold = 0.05): { trend: Trend; deltaPct: number } {
  if (values.length < 4) return { trend: 'flat', deltaPct: 0 };
  const mid = Math.floor(values.length / 2);
  const recent = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
  const prior = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  if (prior <= 0) return { trend: recent > 0 ? 'improving' : 'flat', deltaPct: 0 };
  const deltaPct = (recent - prior) / prior;
  if (deltaPct > threshold) return { trend: 'improving', deltaPct };
  if (deltaPct < -threshold) return { trend: 'declining', deltaPct };
  return { trend: 'flat', deltaPct };
}

/** Consecutive fully-past weeks (ending this week) with at least one session. */
export function streakWeeks(sessions: Session[], now: number): number {
  const done = new Set(
    sessions
      .filter((s) => s.status === 'completed')
      .map((s) => Math.floor((now - s.startedAt) / (7 * DAY)))
  );
  let streak = 0;
  for (let w = 0; w < 260; w++) {
    if (done.has(w)) streak++;
    else break;
  }
  return streak;
}

export interface StrengthSeries {
  exerciseId: string;
  name: string;
  /** Weekly best est. 1RM, aligned 1:1 with weeklyBuckets output (null = no data that week). */
  points: (number | null)[];
}

/** Weekly best e1RM per exercise (exercises that appear in the last `weeks`). */
export function strengthSeries(
  sessions: Session[],
  exercises: Exercise[],
  weeks: number,
  now: number,
  limit = 4
): StrengthSeries[] {
  const done = sessions.filter((s) => s.status === 'completed');
  const buckets: { start: number; end: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY;
    buckets.push({ start: end - 7 * DAY, end });
  }

  const active = new Map<string, number>(); // exerciseId -> sessions seen in range
  for (const s of done) {
    if (s.startedAt <= now - weeks * 7 * DAY) continue;
    for (const ex of s.exercises) {
      active.set(ex.exerciseId, (active.get(ex.exerciseId) ?? 0) + 1);
    }
  }
  const picked = [...active.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return picked.map((exerciseId) => {
    const name = exercises.find((e) => e.id === exerciseId)?.name ?? 'Unknown';
    const points = buckets.map(({ start, end }) => {
      const sets = done
        .filter((s) => s.startedAt > start && s.startedAt <= end)
        .flatMap((s) => s.exercises)
        .filter((ex) => ex.exerciseId === exerciseId)
        .flatMap((ex) => ex.sets);
      let best: number | null = null;
      for (const set of sets) {
        if (!isEligibleForPr(set)) continue;
        const e1rm = estimateOneRepMax(set.weight, set.reps);
        if (e1rm !== null && (best === null || e1rm > best)) best = e1rm;
      }
      return best !== null ? Math.round(best * 10) / 10 : null;
    });
    return { exerciseId, name, points };
  });
}

export interface MuscleVolume {
  muscle: MuscleGroup;
  volume: number;
}

/** Volume per muscle group over the trailing `days`, descending. */
export function muscleVolume(
  sessions: Session[],
  exercises: Exercise[],
  days: number,
  now: number
): MuscleVolume[] {
  const since = now - days * DAY;
  const byMuscle = new Map<MuscleGroup, number>();
  for (const s of sessions) {
    if (s.status !== 'completed' || s.startedAt <= since) continue;
    for (const ex of s.exercises) {
      const meta = exercises.find((e) => e.id === ex.exerciseId);
      if (!meta) continue;
      for (const set of ex.sets) {
        if (!set.completed) continue;
        const load = set.weight > 0 ? set.weight * set.reps : set.reps * 5; // BW proxy: 5 kg per rep
        const share = load / meta.muscleGroups.length;
        for (const m of meta.muscleGroups) {
          byMuscle.set(m, (byMuscle.get(m) ?? 0) + share);
        }
      }
    }
  }
  return [...byMuscle.entries()]
    .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
}

export interface RecentPr {
  exerciseId: string;
  exerciseName: string;
  date: number;
  weight: number;
  reps: number;
  e1rm: number;
}

/** PR-improvement events in the trailing `days`, newest first. */
export function recentPrs(
  sessions: Session[],
  exercises: Exercise[],
  days: number,
  now: number
): RecentPr[] {
  const since = now - days * DAY;
  const byId = new Map(exercises.map((e) => [e.id, e.name]));
  const ordered = [...sessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.startedAt - b.startedAt);
  const bestSoFar = new Map<string, number>();
  const events: RecentPr[] = [];
  for (const s of ordered) {
    for (const ex of s.exercises) {
      const candidate = bestSet(ex.sets);
      if (!candidate) continue;
      const prev = bestSoFar.get(ex.exerciseId);
      if (prev === undefined || candidate.oneRepMax > prev + 1e-9) {
        bestSoFar.set(ex.exerciseId, candidate.oneRepMax);
        if (s.startedAt > since) {
          events.push({
            exerciseId: ex.exerciseId,
            exerciseName: byId.get(ex.exerciseId) ?? 'Unknown',
            date: s.startedAt,
            weight: candidate.set.weight,
            reps: candidate.set.reps,
            e1rm: Math.round(candidate.oneRepMax * 10) / 10,
          });
        }
      }
    }
  }
  return events.reverse();
}

/** Summary deltas: trailing 28 days vs the 28 before that. */
export function progressSummary(
  sessions: Session[],
  now: number
): {
  volumeDeltaPct: number;
  sessionsDelta: number;
  trend: Trend;
} {
  const done = sessions.filter((s) => s.status === 'completed');
  const recent = done.filter((s) => s.startedAt > now - 28 * DAY);
  const prior = done.filter(
    (s) => s.startedAt > now - 56 * DAY && s.startedAt <= now - 28 * DAY
  );
  const recentVol = recent.reduce((sum, s) => sum + sessionVolume(s), 0);
  const priorVol = prior.reduce((sum, s) => sum + sessionVolume(s), 0);
  const weekly = weeklyBuckets(done, 8, now).map((b) => b.volume);
  const { trend } = trendOf(weekly);
  return {
    volumeDeltaPct: priorVol > 0 ? (recentVol - priorVol) / priorVol : recentVol > 0 ? 1 : 0,
    sessionsDelta: recent.length - prior.length,
    trend,
  };
}
