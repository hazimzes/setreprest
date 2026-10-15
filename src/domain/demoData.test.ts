import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demoData';
import { buildSeedExercises } from './seed';
import { validateSessionShape } from './validation';
import type { Exercise } from './models';

const catalog: Exercise[] = buildSeedExercises(0);
const now = Date.UTC(2026, 9, 15, 12);

describe('demo data generator', () => {
  const data = buildDemoData(catalog, now);

  it('produces a full training block', () => {
    expect(data.gyms).toHaveLength(3);
    expect(data.templates).toHaveLength(3);
    expect(data.sessions.length).toBeGreaterThanOrEqual(28);
  });

  it('is deterministic', () => {
    const again = buildDemoData(catalog, now);
    expect(JSON.stringify(again.sessions)).toBe(JSON.stringify(data.sessions));
  });

  it('passes session validation and references known exercises', () => {
    const ids = new Set(catalog.map((e) => e.id));
    for (const session of data.sessions) {
      expect(validateSessionShape(session)).toBe(true);
      expect(session.status).toBe('completed');
      expect(session.endedAt!).toBeGreaterThan(session.startedAt);
      for (const ex of session.exercises) {
        expect(ids.has(ex.exerciseId)).toBe(true);
        expect(ex.sets.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows progression: late squats heavier than early ones', () => {
    const squatSets = data.sessions
      .flatMap((s) => s.exercises)
      .filter((ex) => catalog.find((e) => e.id === ex.exerciseId)?.name === 'Barbell Squat')
      .flatMap((ex) => ex.sets.filter((s) => s.type === 'working'));
    const weights = squatSets.map((s) => s.weight);
    expect(Math.max(...weights)).toBeGreaterThan(Math.min(...weights));
    expect(Math.max(...weights)).toBeGreaterThanOrEqual(120);
  });

  it('tags gyms on every session', () => {
    const gymIds = new Set(data.gyms.map((g) => g.id));
    for (const s of data.sessions) expect(gymIds.has(s.gymId!)).toBe(true);
  });
});
