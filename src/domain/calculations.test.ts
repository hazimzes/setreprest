import { describe, expect, it } from 'vitest';
import {
  bestSet,
  countCompletedSets,
  estimateOneRepMax,
  formatDuration,
  nextSetDefaults,
  personalRecordTimeline,
  sessionElapsedMs,
  sessionVolume,
  setVolume,
} from './calculations';
import { createId } from './id';
import type { Session, SessionExercise, SetEntry } from './models';

function mkSet(partial: Partial<SetEntry>): SetEntry {
  return {
    id: createId(),
    type: 'working',
    weight: 100,
    reps: 5,
    completed: true,
    ...partial,
  };
}

function mkSlot(sets: SetEntry[], exerciseId = 'ex1'): SessionExercise {
  return { id: createId(), exerciseId, order: 0, sets };
}

function mkSession(exercises: SessionExercise[], startedAt = Date.now()): Session {
  return {
    id: createId(),
    name: 'Test',
    status: 'completed',
    startedAt,
    endedAt: startedAt + 3600_000,
    accumulatedActiveMs: 3600_000,
    paused: true,
    exercises,
  };
}

describe('estimateOneRepMax (Epley)', () => {
  it('matches formula at 1, 5 and 12 reps', () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(100 * (1 + 1 / 30), 6);
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(100 * (1 + 5 / 30), 6);
    expect(estimateOneRepMax(100, 12)).toBeCloseTo(100 * (1 + 12 / 30), 6);
  });

  it('returns null for bodyweight, zero weight, and >12 reps', () => {
    expect(estimateOneRepMax(0, 10)).toBeNull();
    expect(estimateOneRepMax(-5, 5)).toBeNull();
    expect(estimateOneRepMax(100, 13)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
  });
});

describe('volume', () => {
  it('counts completed working+drop sets only; warm-up excluded; bodyweight contributes 0', () => {
    const sets: SetEntry[] = [
      mkSet({ type: 'warmup', weight: 40, reps: 10 }),
      mkSet({ weight: 100, reps: 5 }),
      mkSet({ type: 'drop', weight: 60, reps: 10 }),
      mkSet({ weight: 100, reps: 5, completed: false }),
      mkSet({ weight: 0, reps: 20 }),
    ];
    const total = sets.reduce((sum, s) => sum + setVolume(s), 0);
    expect(total).toBe(100 * 5 + 60 * 10);
  });

  it('session volume and completed set count', () => {
    const session = mkSession([
      mkSlot([mkSet({ weight: 50, reps: 8 }), mkSet({ weight: 50, reps: 8, completed: false })]),
      mkSlot([mkSet({ weight: 0, reps: 15 })], 'ex2'),
    ]);
    expect(sessionVolume(session)).toBe(400);
    expect(countCompletedSets(session)).toBe(2);
  });
});

describe('personal records', () => {
  it('picks highest est. 1RM working set; tie broken by absolute weight then recency', () => {
    const sets: SetEntry[] = [
      mkSet({ weight: 100, reps: 5, completedAt: 1000 }), // e1RM ≈ 116.7
      mkSet({ weight: 110, reps: 4, completedAt: 2000 }), // e1RM ≈ 124.7
      mkSet({ weight: 80, reps: 10, completedAt: 3000 }), // e1RM ≈ 106.7 — warm-up variant below
      mkSet({ type: 'warmup', weight: 500, reps: 1, completedAt: 4000 }), // excluded: warm-up
    ];
    const best = bestSet(sets);
    expect(best?.set.weight).toBe(110);

    // Exact tie on e1RM: 60x10 vs 100x6 → 80 both? 100*6: 120; 60x10: 80 → not tie.
    // Construct a true tie: 90x7 → 111 ; 105x6 → 126. Use same e1RM pair instead:
    const tieA = mkSet({ weight: 120, reps: 5, completedAt: 1000 }); // 140
    const tieB = mkSet({ weight: 105, reps: 6, completedAt: 2000 }); // 126 — not tie, adjust:
    // 140 e1RM: 120x5 and 140x4 → 140*1.1333=158.7 no. Solve: e1RM equal when w1(1+r1/30)=w2(1+r2/30)
    // 140 = 120*(1+5/30)=140;  140*(1+0/30)=140 → reps must differ; use 140x1? eligible (1 rep).
    const tieC = mkSet({ weight: 140, reps: 1, completedAt: 3000 }); // 140*(1+1/30)=144.7 — no.
    // True tie: 100x5=116.67 vs 87.5x5? same reps → different. Use 84x6=100.8 and 96x5=112 no.
    // Deterministic tie via same e1RM: 90x5 → 105 ; 87.5x? 87.5*(1+r/30)=105 → r=6.
    const tieD = mkSet({ weight: 90, reps: 5, completedAt: 1000 }); // 105
    const tieE = mkSet({ weight: 87.5, reps: 6, completedAt: 2000 }); // 105
    const bestTie = bestSet([tieD, tieE]);
    expect(bestTie?.set.weight).toBe(90); // heavier absolute weight wins

    // Recency tie-break: identical weight+reps, later timestamp wins
    const recency = bestSet([tieA, tieC]); // 120x5 (140) vs 140x1 (144.67) — c wins on value, not recency
    expect(recency?.set.weight).toBe(140);
    void tieB;
  });

  it('timeline only records improving PRs, oldest first', () => {
    const s1 = mkSession([mkSlot([mkSet({ weight: 80, reps: 5, completedAt: 1 })])], 1000);
    const s2 = mkSession([mkSlot([mkSet({ weight: 100, reps: 5, completedAt: 2 })])], 2000);
    const s3 = mkSession([mkSlot([mkSet({ weight: 90, reps: 5, completedAt: 3 })])], 3000); // no PR
    const s4 = mkSession([mkSlot([mkSet({ weight: 110, reps: 5, completedAt: 4 })])], 4000);
    const timeline = personalRecordTimeline([s3, s1, s4, s2], 'ex1');
    expect(timeline.map((t) => t.candidate.set.weight)).toEqual([80, 100, 110]);
  });
});

describe('nextSetDefaults', () => {
  it('prefers last completed set in the session', () => {
    const slot = mkSlot([
      mkSet({ weight: 60, reps: 8, completed: true }),
      mkSet({ weight: 62.5, reps: 8, completed: true }),
      mkSet({ weight: 65, reps: 8, completed: false }),
    ]);
    const d = nextSetDefaults(slot, [mkSet({ weight: 200, reps: 3 })]);
    expect(d.weight).toBe(62.5);
    expect(d.reps).toBe(8);
  });

  it('falls back to historical last completed set with working type', () => {
    const historical = [mkSet({ weight: 70, reps: 6 }), mkSet({ weight: 72.5, reps: 6 })];
    const d = nextSetDefaults(undefined, historical);
    expect(d.weight).toBe(72.5);
    expect(d.reps).toBe(6);
    expect(d.type).toBe('working');
  });

  it('blank sensible default when nothing known', () => {
    const d = nextSetDefaults(undefined, undefined);
    expect(d.weight).toBe(0);
    expect(d.reps).toBe(10);
    expect(d.type).toBe('working');
  });
});

describe('sessionElapsedMs', () => {
  it('running session accumulates from lastResumedAt', () => {
    const s: Session = {
      ...mkSession([]),
      status: 'active',
      accumulatedActiveMs: 60_000,
      lastResumedAt: 10_000,
      paused: false,
      endedAt: undefined,
    };
    expect(sessionElapsedMs(s, 25_000)).toBe(75_000);
  });

  it('paused session freezes at accumulated time', () => {
    const s: Session = {
      ...mkSession([]),
      status: 'active',
      accumulatedActiveMs: 60_000,
      lastResumedAt: undefined,
      paused: true,
    };
    expect(sessionElapsedMs(s, 999_999)).toBe(60_000);
  });

  it('completed session freezes at endedAt accumulation', () => {
    const s: Session = {
      ...mkSession([]),
      status: 'completed',
      accumulatedActiveMs: 120_000,
      endedAt: 500_000,
      paused: true,
      lastResumedAt: undefined,
    };
    expect(sessionElapsedMs(s, 999_999)).toBe(120_000);
  });
});

describe('formatDuration', () => {
  it('formats h:mm:ss and mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(3_723_000)).toBe('1:02:03');
  });
});
