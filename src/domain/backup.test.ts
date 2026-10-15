import { describe, expect, it } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  canonicalJson,
  computeChecksum,
  validateBackupFile,
} from './backup';
import { createId } from './id';
import type { Exercise, Session, Template } from './models';

const exercise: Exercise = {
  id: 'ex-1',
  name: 'Squat',
  muscleGroups: ['quads'],
  equipment: 'barbell',
  isCustom: false,
  isFavourite: false,
  createdAt: 1000,
};

const session: Session = {
  id: 's-1',
  name: 'Leg day',
  status: 'completed',
  startedAt: 2000,
  endedAt: 3000,
  accumulatedActiveMs: 1000,
  paused: true,
  exercises: [
    {
      id: 'se-1',
      exerciseId: 'ex-1',
      order: 0,
      sets: [{ id: 'set-1', type: 'working', weight: 100, reps: 5, completed: true, completedAt: 2500 }],
    },
  ],
};

const template: Template = {
  id: 't-1',
  name: 'Legs',
  exercises: [{ exerciseId: 'ex-1', order: 0, targetSets: 3 }],
  createdAt: 1000,
  updatedAt: 1000,
};

function validBackup(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    app: 'setreprest',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: 5000,
    data: {
      exercises: [exercise],
      sessions: [session],
      templates: [template],
      settings: null,
    },
    ...overrides,
  };
}

describe('backup validation', () => {
  it('accepts a valid fixture and verifies checksum', async () => {
    const backup = validBackup();
    backup.checksum = await computeChecksum(backup.data as never);
    const result = await validateBackupFile(backup);
    expect(result.data.sessions).toHaveLength(1);
  });

  it('rejects wrong app tag', async () => {
    const backup = validBackup({ app: 'other-app', checksum: 'x' });
    await expect(validateBackupFile(backup)).rejects.toThrow(/not a SetRepRest backup/);
  });

  it('rejects newer schema version', async () => {
    const backup = validBackup({ schemaVersion: BACKUP_SCHEMA_VERSION + 1, checksum: 'x' });
    await expect(validateBackupFile(backup)).rejects.toThrow(/newer than this app supports/);
  });

  it('rejects bad checksum', async () => {
    const backup = validBackup({ checksum: 'deadbeef' });
    await expect(validateBackupFile(backup)).rejects.toThrow(/Checksum mismatch/);
  });

  it('rejects dangling exercise reference in session', async () => {
    const broken = structuredClone(session);
    broken.exercises[0]!.exerciseId = 'missing-ex';
    const data = { exercises: [exercise], sessions: [broken], templates: [], settings: null };
    const backup = validBackup({ data, checksum: await computeChecksum(data) });
    await expect(validateBackupFile(backup)).rejects.toThrow(/missing exercise/);
  });

  it('rejects invalid enum in set entry', async () => {
    const broken = structuredClone(session);
    (broken.exercises[0]!.sets[0] as unknown as Record<string, unknown>).type = 'junk';
    const data = { exercises: [exercise], sessions: [broken], templates: [], settings: null };
    const backup = validBackup({ data, checksum: await computeChecksum(data) });
    await expect(validateBackupFile(backup)).rejects.toThrow(/invalid session entry/);
  });

  it('rejects invalid RPE value', async () => {
    const broken = structuredClone(session);
    (broken.exercises[0]!.sets[0] as unknown as Record<string, unknown>).rpe = 7.3;
    const data = { exercises: [exercise], sessions: [broken], templates: [], settings: null };
    const backup = validBackup({ data, checksum: await computeChecksum(data) });
    await expect(validateBackupFile(backup)).rejects.toThrow(/invalid session entry/);
  });

  it('rejects non-object input', async () => {
    await expect(validateBackupFile('nope')).rejects.toThrow(/not a JSON object/);
  });
});

describe('canonicalJson', () => {
  it('is key-order independent', () => {
    expect(canonicalJson({ a: 1, b: { y: 2, x: 3 } })).toBe(canonicalJson({ b: { x: 3, y: 2 }, a: 1 }));
  });

  it('produces stable strings with undefined fields dropped consistently', () => {
    expect(canonicalJson([{ b: 2, a: 1 }])).toBe('[{"a":1,"b":2}]');
  });
});

describe('id util', () => {
  it('creates unique ids', () => {
    const seen = new Set(Array.from({ length: 500 }, () => createId()));
    expect(seen.size).toBe(500);
  });
});
