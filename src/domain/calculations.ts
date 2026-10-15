import type { Session, SessionExercise, SetEntry, Units } from './models';

/** Epley: valid for 1–12 reps with external load. Returns null otherwise. */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps < 1 || reps > 12) return null;
  return weight * (1 + reps / 30);
}

export function isBodyweightSet(set: SetEntry): boolean {
  return set.weight <= 0;
}

/** Working + drop sets only; warm-ups excluded; planned sets excluded. */
export function setVolume(set: SetEntry): number {
  if (!set.completed || set.type === 'warmup') return 0;
  if (isBodyweightSet(set)) return 0;
  return set.weight * set.reps;
}

export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + setVolume(set), 0),
    0
  );
}

export function countCompletedSets(session: Session): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => set.completed).length,
    0
  );
}

export function isEligibleForPr(set: SetEntry): boolean {
  return (
    set.completed &&
    set.type === 'working' &&
    !isBodyweightSet(set) &&
    set.reps >= 1 &&
    set.reps <= 12
  );
}

export interface PrCandidate {
  set: SetEntry;
  oneRepMax: number;
  absoluteWeight: number;
}

/** Best working set of an exercise by estimated 1RM; ties → heavier absolute weight → most recent. */
export function bestSet(sets: SetEntry[]): PrCandidate | null {
  let best: PrCandidate | null = null;
  for (const set of sets) {
    if (!isEligibleForPr(set)) continue;
    const oneRepMax = estimateOneRepMax(set.weight, set.reps);
    if (oneRepMax === null) continue;
    const candidate: PrCandidate = { set, oneRepMax, absoluteWeight: set.weight };
    if (
      best === null ||
      candidate.oneRepMax > best.oneRepMax + 1e-9 ||
      (Math.abs(candidate.oneRepMax - best.oneRepMax) <= 1e-9 &&
        (candidate.absoluteWeight > best.absoluteWeight ||
          (candidate.absoluteWeight === best.absoluteWeight &&
            (candidate.set.completedAt ?? 0) > (best.set.completedAt ?? 0))))
    ) {
      best = candidate;
    }
  }
  return best;
}

/** All-time personal record sets for one exercise across completed sessions (oldest first). */
export function personalRecordTimeline(
  sessions: Session[],
  exerciseId: string
): { date: number; candidate: PrCandidate }[] {
  const timeline: { date: number; candidate: PrCandidate }[] = [];
  let runningBest: PrCandidate | null = null;
  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const session of ordered) {
    const sets = session.exercises
      .filter((ex) => ex.exerciseId === exerciseId)
      .flatMap((ex) => ex.sets);
    const candidate = bestSet(sets);
    if (candidate === null) continue;
    if (runningBest === null || candidate.oneRepMax > runningBest.oneRepMax + 1e-9) {
      runningBest = candidate;
      timeline.push({ date: session.startedAt, candidate });
    }
  }
  return timeline;
}

export interface SetDefaults {
  weight: number;
  reps: number;
  type: SetEntry['type'];
  rpe?: number;
}

/**
 * Prefill for a new set: last completed set of this exercise in the session,
 * else the last completed working set historically, else a blank working set.
 */
export function nextSetDefaults(
  sessionExercise: SessionExercise | undefined,
  historicalSets: SetEntry[] | undefined
): SetDefaults {
  const completedInSession = sessionExercise?.sets.filter((s) => s.completed) ?? [];
  const lastInSession = completedInSession.at(-1);
  if (lastInSession) {
    return {
      weight: lastInSession.weight,
      reps: lastInSession.reps,
      type: lastInSession.type,
      ...(lastInSession.rpe !== undefined ? { rpe: lastInSession.rpe } : {}),
    };
  }
  const lastHistorical = historicalSets?.filter((s) => s.completed).at(-1);
  if (lastHistorical) {
    return {
      weight: lastHistorical.weight,
      reps: lastHistorical.reps,
      type: 'working',
      ...(lastHistorical.rpe !== undefined ? { rpe: lastHistorical.rpe } : {}),
    };
  }
  return { weight: 0, reps: 10, type: 'working' };
}

/** Active elapsed ms. Paused time excluded; finished sessions freeze at endedAt. */
export function sessionElapsedMs(session: Session, now: number): number {
  if (session.status === 'completed' && session.endedAt !== undefined) {
    return session.accumulatedActiveMs;
  }
  if (session.paused || session.lastResumedAt === undefined) {
    return session.accumulatedActiveMs;
  }
  return session.accumulatedActiveMs + Math.max(0, now - session.lastResumedAt);
}

/** kg ↔ lb display conversion. Storage stays in captured units; conversion is display-only. */
export const LB_PER_KG = 2.2046226218;

export function convertWeight(weight: number, from: Units, to: Units): number {
  if (from === to) return weight;
  return to === 'lb' ? weight * LB_PER_KG : weight / LB_PER_KG;
}

export function formatWeight(weight: number, units: Units): string {
  if (weight <= 0) return 'BW';
  const rounded = Math.round(weight * 10) / 10;
  return `${rounded} ${units}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
