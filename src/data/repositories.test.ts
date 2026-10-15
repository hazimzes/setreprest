import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

type RepoModule = typeof import('./repositories');
type SeedModule = typeof import('./seedRunner');
type BackupModule = typeof import('./backupService');

let repo: RepoModule;
let seed: SeedModule;
let backup: BackupModule;

async function freshModules() {
  vi.resetModules();
  await import('./db');
  repo = await import('./repositories');
  seed = await import('./seedRunner');
  backup = await import('./backupService');
}

beforeEach(async () => {
  // Fresh in-memory IndexedDB per test. Dexie caches the IDB factory in its
  // dependency registry at first import (external deps survive vi.resetModules),
  // so both the global and Dexie's registry must point at the fresh factory.
  const Dexie = (await import('dexie')).default;
  const fresh = new IDBFactory();
  globalThis.indexedDB = fresh;
  (Dexie as unknown as { dependencies: { indexedDB: IDBFactory } }).dependencies.indexedDB = fresh;
  await freshModules();
});

describe('db + seed', () => {
  it('opens and seeds catalog once; second run adds no duplicates', async () => {
    const settings1 = await seed.ensureSeeded();
    expect(settings1.seededVersion).toBe(1);
    const first = await repo.listExercises();
    expect(first.length).toBeGreaterThanOrEqual(60);

    const settings2 = await seed.ensureSeeded();
    expect(settings2.seededVersion).toBe(1);
    const second = await repo.listExercises();
    expect(second.length).toBe(first.length);
  });
});

describe('exercises', () => {
  it('creates a custom exercise and rejects duplicate names case-insensitively', async () => {
    await seed.ensureSeeded();
    const created = await repo.createCustomExercise({
      name: 'Landmine Press',
      muscleGroups: ['chest', 'shoulders'],
      equipment: 'barbell',
    });
    expect(created.isCustom).toBe(true);
    await expect(
      repo.createCustomExercise({ name: 'landmine press', muscleGroups: ['chest'], equipment: 'barbell' })
    ).rejects.toThrow(/already exists/);
  });

  it('blocks deleting a seeded exercise', async () => {
    await seed.ensureSeeded();
    const seeded = (await repo.listExercises()).find((e) => !e.isCustom);
    expect(seeded).toBeDefined();
    await expect(repo.deleteCustomExercise(seeded!.id)).rejects.toThrow(/cannot be deleted/i);
  });

  it('blocks deleting a custom exercise used in a session, allows unused ones', async () => {
    await seed.ensureSeeded();
    const custom = await repo.createCustomExercise({
      name: 'Custom Thing',
      muscleGroups: ['core'],
      equipment: 'other',
    });
    const session = {
      id: 's1',
      name: 'S',
      status: 'completed' as const,
      startedAt: Date.now(),
      accumulatedActiveMs: 0,
      paused: true,
      exercises: [
        { id: 'se1', exerciseId: custom.id, order: 0, sets: [] },
      ],
    };
    await repo.putSession(session);
    await expect(repo.deleteCustomExercise(custom.id)).rejects.toThrow(/used in logged workouts/);
  });
});

describe('sessions', () => {
  it('round-trips all fields through save/load', async () => {
    await seed.ensureSeeded();
    const session = {
      id: 'rt1',
      name: 'Round trip',
      status: 'active' as const,
      startedAt: 1234,
      accumulatedActiveMs: 5678,
      lastResumedAt: 9999,
      paused: false,
      templateId: 'tpl-1',
      exercises: [
        {
          id: 'se1',
          exerciseId: (await repo.listExercises())[0]!.id,
          order: 0,
          sets: [
            {
              id: 'set1',
              type: 'warmup' as const,
              weight: 40,
              reps: 8,
              completed: true,
              rpe: 6.5,
              notes: 'bar speed good',
              completedAt: 1111,
            },
          ],
          substitutedFromExerciseId: 'old-ex',
          targetSets: 3,
          targetReps: 8,
        },
      ],
    };
    await repo.putSession(session);
    const loaded = await repo.getSession('rt1');
    expect(loaded).toEqual(session);
  });

  it('returns the single active session for recovery', async () => {
    await seed.ensureSeeded();
    expect(await repo.getActiveSession()).toBeUndefined();
    await repo.putSession({
      id: 'active1',
      name: 'W',
      status: 'active',
      startedAt: 1,
      accumulatedActiveMs: 0,
      paused: false,
      lastResumedAt: 2,
      exercises: [],
    });
    const active = await repo.getActiveSession();
    expect(active?.id).toBe('active1');
  });
});

describe('templates', () => {
  it('CRUD + duplicate', async () => {
    await seed.ensureSeeded();
    const id = await (async () => {
      const exercise = (await repo.listExercises())[0]!;
      const tpl = {
        id: 't1',
        name: 'Push day',
        exercises: [{ exerciseId: exercise.id, order: 0, targetSets: 3, targetReps: 8 }],
        createdAt: 1,
        updatedAt: 1,
      };
      await repo.putTemplate(tpl);
      return tpl.id;
    })();
    expect(await repo.listTemplates()).toHaveLength(1);
    await repo.deleteTemplate(id);
    expect(await repo.listTemplates()).toHaveLength(0);
  });
});

describe('backup round-trip', () => {
  it('export → reset → replace-import restores identical data', async () => {
    await seed.ensureSeeded();
    const custom = await repo.createCustomExercise({
      name: 'My Machine',
      muscleGroups: ['back'],
      equipment: 'machine',
    });
    await repo.putSession({
      id: 'b1',
      name: 'Backup test',
      status: 'completed',
      startedAt: 100,
      endedAt: 200,
      accumulatedActiveMs: 100,
      paused: true,
      exercises: [{ id: 'se1', exerciseId: custom.id, order: 0, sets: [] }],
    });
    await repo.putTemplate({
      id: 'tpl1',
      name: 'T',
      exercises: [{ exerciseId: custom.id, order: 0, targetSets: 2 }],
      createdAt: 1,
      updatedAt: 1,
    });

    const exported = await backup.exportBackup();
    const json = JSON.stringify(exported);

    await backup.resetAllData();
    expect(await repo.listSessions()).toHaveLength(0);
    expect(await repo.listExercises()).toHaveLength(0);

    const result = await backup.importBackup(json, 'replace');
    expect(result.sessions).toBe(1);

    const exercisesAfter = await repo.listExercises();
    expect(exercisesAfter.map((e) => e.id).sort()).toEqual(
      (exported.data.exercises.map((e) => e.id)).sort()
    );
    const sessionsAfter = await repo.listSessions();
    expect(sessionsAfter).toHaveLength(1);
    expect(sessionsAfter[0]!.id).toBe('b1');
    expect(await repo.listTemplates()).toHaveLength(1);
  });

  it('merge import keeps local sessions and adds foreign ones', async () => {
    await seed.ensureSeeded();
    const exercise = (await repo.listExercises())[0]!;
    await repo.putSession({
      id: 'local1',
      name: 'Local',
      status: 'completed',
      startedAt: 1,
      accumulatedActiveMs: 0,
      paused: true,
      exercises: [],
    });
    const foreign = {
      app: 'setreprest',
      schemaVersion: 1,
      exportedAt: 999,
      data: {
        exercises: [exercise],
        sessions: [
          {
            id: 'foreign1',
            name: 'Foreign',
            status: 'completed' as const,
            startedAt: 2,
            accumulatedActiveMs: 0,
            paused: true,
            exercises: [],
          },
        ],
        templates: [],
        settings: null,
      },
      checksum: 'will-be-recomputed-below',
    };
    const { computeChecksum } = await import('../domain/backup');
    foreign.checksum = await computeChecksum(foreign.data);
    await backup.importBackup(JSON.stringify(foreign), 'merge');
    const ids = (await repo.listSessions()).map((s) => s.id).sort();
    expect(ids).toEqual(['foreign1', 'local1']);
  });

  it('invalid backup writes nothing', async () => {
    await seed.ensureSeeded();
    const countBefore = (await repo.listExercises()).length;
    const garbage = JSON.stringify({ app: 'setreprest', schemaVersion: 99, data: {}, checksum: 'x' });
    await expect(backup.importBackup(garbage, 'replace')).rejects.toThrow();
    expect((await repo.listExercises()).length).toBe(countBefore);
  });
});

describe('csv export', () => {
  it('row count matches set count', async () => {
    await seed.ensureSeeded();
    const exercise = (await repo.listExercises())[0]!;
    await repo.putSession({
      id: 'c1',
      name: 'CSV',
      status: 'completed',
      startedAt: 1,
      accumulatedActiveMs: 0,
      paused: true,
      exercises: [
        {
          id: 'se1',
          exerciseId: exercise.id,
          order: 0,
          sets: [
            { id: 'a', type: 'working', weight: 50, reps: 5, completed: true },
            { id: 'b', type: 'working', weight: 50, reps: 5, completed: false },
          ],
        },
      ],
    });
    const { buildHistoryCsv } = await import('../domain/csv');
    const sessions = await repo.listSessions();
    const csv = buildHistoryCsv(sessions, (id) => exercise.id === id ? 'X' : '?', 'kg');
    const rows = csv.split(String.fromCharCode(13) + String.fromCharCode(10)).filter((r) => r.length > 0);
    expect(rows).toHaveLength(3); // header + 2 sets
  });
});
