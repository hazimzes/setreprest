import { describe, expect, it } from 'vitest';
import { createId } from './id';
import {
  muscleVolume,
  progressSummary,
  recentPrs,
  streakWeeks,
  strengthSeries,
  trendOf,
  weeklyBuckets,
} from './progress';
import { buildSeedExercises } from './seed';
import type { Session } from './models';

const DAY = 24 * 3600 * 1000;
const catalog = buildSeedExercises(0);
const byName = (name: string) => catalog.find((e) => e.name === name)!;

function session(daysAgo: number, entries: { exercise: string; sets: [number, number][] }, now: number): Session {
  const exercise = byName(entries.exercise);
  return {
    id: createId(),
    name: 'S',
    status: 'completed',
    startedAt: now - daysAgo * DAY,
    endedAt: now - daysAgo * DAY + 3600_000,
    accumulatedActiveMs: 3600_000,
    paused: true,
    exercises: [
      {
        id: createId(),
        exerciseId: exercise.id,
        order: 0,
        sets: entries.sets.map(([weight, reps], i) => ({
          id: createId(),
          type: 'working' as const,
          weight,
          reps,
          completed: true,
          completedAt: now - daysAgo * DAY + i * 60_000,
        })),
      },
    ],
  };
}

describe('weeklyBuckets', () => {
  it('buckets volume into weekly windows oldest first', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const sessions = [
      session(1, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now),
      session(2, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now),
      session(10, { exercise: 'Deadlift', sets: [[140, 3]] }, now),
    ];
    const buckets = weeklyBuckets(sessions, 4, now);
    expect(buckets).toHaveLength(4);
    expect(buckets[3]!.volume).toBe(1000); // both recent sessions in the newest window
    expect(buckets[3]!.sessions).toBe(2);
    expect(buckets[2]!.volume).toBe(420);
    expect(buckets[0]!.sessions).toBe(0);
  });
});

describe('trendOf', () => {
  it('classifies improving, declining and flat series', () => {
    expect(trendOf([10, 10, 11, 12, 14, 15]).trend).toBe('improving');
    expect(trendOf([15, 14, 12, 11, 10, 9]).trend).toBe('declining');
    expect(trendOf([10, 10, 10, 10, 10, 10]).trend).toBe('flat');
    expect(trendOf([1, 2]).trend).toBe('flat'); // too short
  });
});

describe('streakWeeks', () => {
  it('counts consecutive recent weeks with sessions', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const sessions = [
      session(1, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now),
      session(8, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now),
      session(15, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now),
      session(40, { exercise: 'Barbell Squat', sets: [[100, 5]] }, now), // gap breaks streak
    ];
    expect(streakWeeks(sessions, now)).toBe(3);
  });
});

describe('strengthSeries', () => {
  it('aligns weekly best e1rm to buckets with nulls for empty weeks', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const sessions = [
      session(2, { exercise: 'Barbell Squat', sets: [[120, 5]] }, now),
      session(9, { exercise: 'Barbell Squat', sets: [[110, 5]] }, now),
    ];
    const series = strengthSeries(sessions, catalog, 4, now);
    const squat = series.find((s) => s.name === 'Barbell Squat');
    expect(squat).toBeDefined();
    expect(squat!.points).toHaveLength(4);
    expect(squat!.points[3]).toBeCloseTo(120 * (1 + 5 / 30), 1);
    expect(squat!.points[2]).toBeCloseTo(110 * (1 + 5 / 30), 1);
    expect(squat!.points[0]).toBeNull();
  });
});

describe('muscleVolume', () => {
  it('splits volume across muscle groups and sorts descending', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    // Bench: chest+triceps — 100kg*10 = 1000 → 500 each
    const sessions = [session(1, { exercise: 'Barbell Bench Press', sets: [[100, 10]] }, now)];
    const result = muscleVolume(sessions, catalog, 30, now);
    const chest = result.find((r) => r.muscle === 'chest')!;
    const triceps = result.find((r) => r.muscle === 'triceps')!;
    expect(chest.volume).toBe(500);
    expect(triceps.volume).toBe(500);
    expect(result[0]!.volume).toBeGreaterThanOrEqual(result[result.length - 1]!.volume);
  });
});

describe('recentPrs', () => {
  it('emits only improving bests in the window, newest first', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const sessions = [
      session(90, { exercise: 'Deadlift', sets: [[140, 3]] }, now), // baseline, outside window
      session(10, { exercise: 'Deadlift', sets: [[150, 3]] }, now), // PR inside window
      session(5, { exercise: 'Deadlift', sets: [[148, 3]] }, now), // not an improvement
      session(3, { exercise: 'Deadlift', sets: [[155, 3]] }, now), // newer PR
    ];
    const prs = recentPrs(sessions, catalog, 30, now);
    expect(prs.map((p) => p.weight)).toEqual([155, 150]);
    expect(prs[0]!.exerciseName).toBe('Deadlift');
  });
});

describe('progressSummary', () => {
  it('compares trailing 28 days with the 28 before', () => {
    const now = Date.UTC(2026, 9, 15, 12);
    const sessions = [];
    for (let i = 0; i < 6; i++) {
      sessions.push(session(3 + i * 4, { exercise: 'Barbell Squat', sets: [[120, 6]] }, now));
    }
    for (let i = 0; i < 2; i++) {
      sessions.push(session(35 + i * 4, { exercise: 'Barbell Squat', sets: [[100, 6]] }, now));
    }
    const summary = progressSummary(sessions, now);
    expect(summary.volumeDeltaPct).toBeGreaterThan(1);
    expect(summary.sessionsDelta).toBe(4);
    expect(summary.trend).toBe('improving');
  });
});
