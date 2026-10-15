import type { BackupData } from './backup';
import type { Exercise, Gym, Session, SessionExercise, SetEntry, Template } from './models';

/**
 * Deterministic demo dataset: ~10 weeks of push/pull/legs training across three
 * gyms with progression, a deload, RPE and occasional notes. Stable ids prefixed
 * `demo-` so re-loading merges idempotently instead of duplicating.
 */

/** mulberry32 — small seeded PRNG so every install sees the same demo history. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2_5 = (kg: number) => Math.max(20, Math.round(kg / 2.5) * 2.5);

interface PlannedExercise {
  name: string;
  warmup?: { weight: number; reps: number };
  sets: number;
  reps: number;
  baseKg: number;
  /** For bodyweight lifts weight stays 0 and only reps progress. */
  bodyweight?: boolean;
  rpeFrom?: number;
}

interface PlannedDay {
  kind: 'push' | 'pull' | 'legs' | 'home-full';
}

const PLANS: Record<PlannedDay['kind'], PlannedExercise[]> = {
  push: [
    { name: 'Barbell Bench Press', warmup: { weight: 40, reps: 10 }, sets: 4, reps: 6, baseKg: 72.5, rpeFrom: 7.5 },
    { name: 'Overhead Press', warmup: { weight: 25, reps: 10 }, sets: 3, reps: 7, baseKg: 42.5, rpeFrom: 7 },
    { name: 'Incline Bench Press', sets: 3, reps: 8, baseKg: 55 },
    { name: 'Cable Tricep Pushdown', sets: 3, reps: 11, baseKg: 27.5 },
    { name: 'Dumbbell Lateral Raise', sets: 3, reps: 13, baseKg: 9 },
  ],
  pull: [
    { name: 'Deadlift', warmup: { weight: 100, reps: 5 }, sets: 3, reps: 4, baseKg: 140, rpeFrom: 8 },
    { name: 'Cable Lat Pulldown', sets: 3, reps: 10, baseKg: 62.5 },
    { name: 'Cable Row', sets: 3, reps: 10, baseKg: 57.5 },
    { name: 'Dumbbell Hammer Curl', sets: 3, reps: 11, baseKg: 14 },
    { name: 'Band Pull-Apart', sets: 2, reps: 15, baseKg: 10 },
  ],
  legs: [
    { name: 'Barbell Squat', warmup: { weight: 60, reps: 8 }, sets: 4, reps: 6, baseKg: 110, rpeFrom: 8 },
    { name: 'Leg Press', sets: 3, reps: 10, baseKg: 180 },
    { name: 'Leg Curl', sets: 3, reps: 12, baseKg: 45 },
    { name: 'Calf Raise Machine', sets: 3, reps: 14, baseKg: 70 },
  ],
  'home-full': [
    { name: 'Pull-Up', sets: 4, reps: 7, baseKg: 0, bodyweight: true },
    { name: 'Push-Up', sets: 3, reps: 20, baseKg: 0, bodyweight: true },
    { name: 'Dumbbell Goblet Squat', sets: 3, reps: 12, baseKg: 24 },
    { name: 'Plank', sets: 3, reps: 1, baseKg: 0, bodyweight: true },
  ],
};

const WEEK_SCHEDULE: PlannedDay['kind'][] = ['push', 'pull', 'legs'];
const GYMS: { id: string; name: string }[] = [
  { id: 'demo-gym-1', name: 'Fitness First AEON' },
  { id: 'demo-gym-2', name: 'Anytime Shah Alam' },
  { id: 'demo-gym-3', name: 'Home setup' },
];

const DAY_MS = 24 * 3600 * 1000;

const NOTES = [
  'Bar speed good',
  'Felt heavy today',
  'Slept badly, kept it controlled',
  'Depth was solid',
  'Deload week — easy',
  'New top set',
];

function pickNote(random: () => number): string {
  return NOTES[Math.floor(random() * NOTES.length)]!;
}

function sessionName(kind: PlannedDay['kind']): string {
  switch (kind) {
    case 'push':
      return 'Push day';
    case 'pull':
      return 'Pull day';
    case 'legs':
      return 'Leg day';
    case 'home-full':
      return 'Home full body';
  }
}

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function buildDemoData(exercises: Exercise[], now: number): BackupData {
  const byName = new Map(exercises.map((e) => [e.name, e]));
  const random = rng(20261015);

  const gyms: Gym[] = GYMS.map((g, i) => ({
    id: g.id,
    name: g.name,
    ...(i === 2 ? { notes: 'Dumbbells to 30 kg, pull-up bar, bands' } : {}),
    createdAt: now - 80 * DAY_MS,
  }));

  const templates: Template[] = (['push', 'pull', 'legs'] as const).map((kind, i) => ({
    id: `demo-tpl-${kind}`,
    name: `${kind[0]!.toUpperCase()}${kind.slice(1)} day`,
    exercises: PLANS[kind]
      .filter((p) => byName.has(p.name))
      .map((p, order) => ({
        exerciseId: byName.get(p.name)!.id,
        order,
        targetSets: p.sets,
        targetReps: p.reps,
      })),
    createdAt: now - 75 * DAY_MS,
    updatedAt: now - 75 * DAY_MS,
    ...(i < 0 ? {} : {}),
  }));

  const sessions: Session[] = [];
  let seq = 0;

  for (let week = 9; week >= 0; week--) {
    const deload = week === 5;
    const loadFactor = Math.pow(1.018, 9 - week) * (deload ? 0.85 : 1);

    for (let day = 0; day < 3; day++) {
      const kind = WEEK_SCHEDULE[day]!;
      const plan = PLANS[kind];
      if (random() < 0.06) continue; // a couple of skipped sessions — life happens

      const startedAt =
        now -
        (week * 7 + (6 - day * 2)) * DAY_MS -
        (17 * 3600 + Math.floor(random() * 90) * 60) * 1000;
      const kind2: PlannedDay['kind'] = kind;
      const gymId =
        kind2 === 'pull' && random() < 0.3 ? 'demo-gym-3' : random() < 0.55 ? 'demo-gym-1' : 'demo-gym-2';

      const sessionExercises: SessionExercise[] = [];
      let order = 0;
      let cursor = startedAt;

      for (const p of plan) {
        const exercise = byName.get(p.name);
        if (!exercise) continue;
        const sets: SetEntry[] = [];
        const noise = 0.97 + random() * 0.06;

        if (p.warmup) {
          const completedAt = cursor + 2 * 60 * 1000;
          cursor = completedAt;
          sets.push({
            id: `demo-set-${seq}-w`,
            type: 'warmup',
            weight: round2_5(p.warmup.weight * loadFactor),
            reps: p.warmup.reps,
            completed: true,
            completedAt,
          });
        }
        for (let s = 0; s < p.sets; s++) {
          const weight = p.bodyweight ? 0 : round2_5(p.baseKg * loadFactor * noise);
          const reps = p.bodyweight
            ? Math.max(4, Math.round(p.reps * (1 + (9 - week) * 0.06) - s * 0.8))
            : Math.max(3, Math.round(p.reps + (random() < 0.3 ? 1 : 0)));
          const useRpe = p.rpeFrom !== undefined && (s === p.sets - 1 || random() < 0.4);
          const rpe = useRpe ? Math.min(10, Math.round((p.rpeFrom! + random() * 1.5) * 2) / 2) : undefined;
          const completedAt = cursor + 3 * 60 * 1000;
          cursor = completedAt;
          sets.push({
            id: `demo-set-${seq}-${s}`,
            type: 'working',
            weight,
            reps,
            completed: true,
            ...(rpe !== undefined ? { rpe } : {}),
            completedAt,
            ...(s === 0 && random() < 0.12 ? { notes: pickNote(random) } : {}),
          });
        }
        seq++;
        sessionExercises.push({
          id: `demo-se-${seq}`,
          exerciseId: exercise.id,
          order: order++,
          sets,
        });
      }

      const durationMin = 48 + Math.floor(random() * 25);
      sessions.push({
        id: `demo-session-${week}-${day}`,
        name: `${sessionName(kind2)} — ${formatDay(startedAt)}`,
        status: 'completed',
        startedAt,
        endedAt: startedAt + durationMin * 60 * 1000,
        accumulatedActiveMs: durationMin * 60 * 1000,
        lastResumedAt: undefined,
        paused: true,
        exercises: sessionExercises,
        gymId,
      });
    }

    if (week <= 4 && random() < 0.7) {
      const startedAt = now - (week * 7 + 2) * DAY_MS - 11 * 3600 * 1000;
      const sessionExercises: SessionExercise[] = [];
      let order = 0;
      let cursor = startedAt;
      PLANS['home-full']!.forEach((p, pi) => {
        const exercise = byName.get(p.name);
        if (!exercise) return;
        const sets: SetEntry[] = [];
        for (let s = 0; s < p.sets; s++) {
          const reps = Math.max(3, Math.round(p.reps * (1 + (4 - week) * 0.05) - s));
          const completedAt = cursor + 90 * 1000;
          cursor = completedAt;
          sets.push({
            id: `demo-hset-${pi}-${s}`,
            type: 'working',
            weight: 0,
            reps,
            completed: true,
            completedAt,
          });
        }
        sessionExercises.push({
          id: `demo-hse-${pi}`,
          exerciseId: exercise.id,
          order: order++,
          sets,
        });
      });
      sessions.push({
        id: `demo-session-home-${week}`,
        name: `Home full body — ${formatDay(startedAt)}`,
        status: 'completed',
        startedAt,
        endedAt: startedAt + 35 * 60 * 1000,
        accumulatedActiveMs: 35 * 60 * 1000,
        lastResumedAt: undefined,
        paused: true,
        exercises: sessionExercises,
        gymId: 'demo-gym-3',
      });
    }
  }

  // Include the referenced catalog exercises so the dataset passes the backup
  // validator's referential check independent of what is already installed.
  const usedIds = new Set(
    sessions.flatMap((s) => s.exercises.map((ex) => ex.exerciseId))
  );
  const referenced = exercises.filter((e) => usedIds.has(e.id));
  return { gyms, exercises: referenced, sessions, templates, settings: null };
}
