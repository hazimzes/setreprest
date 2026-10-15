import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { ReactNode } from 'react';

type StoreModule = typeof import('./appStore');
type ProviderModule = typeof import('./AppProvider');

let storeMod: StoreModule;
let providerMod: ProviderModule;

function Harness({ children }: { children: ReactNode }) {
  return children;
}

async function freshEnv() {
  const Dexie = (await import('dexie')).default;
  const fresh = new IDBFactory();
  globalThis.indexedDB = fresh;
  (Dexie as unknown as { dependencies: { indexedDB: IDBFactory } }).dependencies.indexedDB = fresh;
  vi.resetModules();
  storeMod = await import('./appStore');
  providerMod = await import('./AppProvider');
}

async function renderApp() {
  const { AppProvider } = providerMod;
  const { useAppStore } = storeMod;

  let capture: ReturnType<typeof useAppStore> | undefined;

  function Probe(): ReactNode {
    capture = useAppStore();
    return null;
  }

  render(
    <AppProvider>
      <Harness>
        <Probe />
      </Harness>
    </AppProvider>
  );

  await waitFor(() => expect(capture?.state.status).toBe('ready'));
  return {
    get store() {
      if (!capture) throw new Error('probe not mounted');
      return capture;
    },
  };
}

beforeEach(freshEnv);

describe('AppProvider integration (jsdom + fake IndexedDB)', () => {
  it('boots, seeds the library, and exposes exercises', async () => {
    const app = await renderApp();
    await vi.waitFor(() => expect(app.store.state.exercises.length).toBeGreaterThanOrEqual(60));
    expect(app.store.state.settings.units).toBe('kg');
  });

  it('start → add exercise → add set with defaults → complete → finish lands in history', async () => {
    const app = await renderApp();
    await vi.waitFor(() => expect(app.store.state.exercises.length).toBeGreaterThan(0));
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat');
    expect(squat).toBeDefined();

    await act(async () => {
      await app.store.startSession({ name: 'Leg day' });
    });
    expect(app.store.state.activeSession).not.toBeNull();

    await act(async () => {
      await app.store.addSessionExercise(squat!.id);
    });
    const slot = app.store.state.activeSession!.exercises[0]!;
    expect(slot.exerciseId).toBe(squat!.id);

    // First ever set: blank defaults (0 weight, 10 reps)
    await act(async () => {
      await app.store.addSet(slot.id, { weight: 100, reps: 5 });
    });
    const set1 = app.store.state.activeSession!.exercises[0]!.sets[0]!;
    expect(set1.weight).toBe(100);
    expect(set1.completed).toBe(false);

    await act(async () => {
      await app.store.toggleSetComplete(slot.id, set1.id);
    });
    const completed = app.store.state.activeSession!.exercises[0]!.sets.find((s) => s.id === set1.id)!;
    expect(completed.completed).toBe(true);
    expect(completed.completedAt).toBeDefined();
    // A pre-filled follow-up set is auto-added
    expect(app.store.state.activeSession!.exercises[0]!.sets).toHaveLength(2);
    const next = app.store.state.activeSession!.exercises[0]!.sets[1]!;
    expect(next.weight).toBe(100);
    expect(next.reps).toBe(5);
    expect(next.completed).toBe(false);

    await act(async () => {
      await app.store.finishSession();
    });
    expect(app.store.state.activeSession).toBeNull();
    expect(app.store.state.sessions).toHaveLength(1);
    expect(app.store.state.sessions[0]!.name).toBe('Leg day');
    expect(app.store.state.sessions[0]!.status).toBe('completed');
  });

  it('recovers an unfinished session into a fresh provider (refresh simulation)', async () => {
    const app = await renderApp();
    const bench = app.store.state.exercises.find((e) => e.name === 'Barbell Bench Press')!;
    await act(async () => {
      await app.store.startSession({ name: 'Recover me' });
    });
    await act(async () => {
      await app.store.addSessionExercise(bench.id);
    });
    const slot = app.store.state.activeSession!.exercises[0]!;
    await act(async () => {
      await app.store.addSet(slot.id, { weight: 60, reps: 8 });
    });

    // Simulate reload: brand-new provider over the same IndexedDB.
    const app2 = await renderApp();
    expect(app2.store.state.activeSession).not.toBeNull();
    expect(app2.store.state.activeSession!.name).toBe('Recover me');
    expect(app2.store.state.activeSession!.exercises[0]!.sets[0]!.weight).toBe(60);
  });

  it('substitution keeps old exercise attribution separate', async () => {
    const app = await renderApp();
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat')!;
    const legPress = app.store.state.exercises.find((e) => e.name === 'Leg Press')!;
    await act(async () => {
      await app.store.startSession();
    });
    await act(async () => {
      await app.store.addSessionExercise(squat.id);
    });
    const slot = app.store.state.activeSession!.exercises[0]!;
    await act(async () => {
      await app.store.addSet(slot.id, { weight: 120, reps: 5 });
    });
    await act(async () => {
      await app.store.substituteExercise(slot.id, legPress.id);
    });
    const exercises = app.store.state.activeSession!.exercises;
    expect(exercises).toHaveLength(2);
    const oldSlot = exercises.find((e) => e.exerciseId === squat.id)!;
    const newSlot = exercises.find((e) => e.exerciseId === legPress.id)!;
    expect(oldSlot.sets).toHaveLength(1); // logged sets stay with the original exercise
    expect(newSlot.sets).toHaveLength(0);
    expect(newSlot.substitutedFromExerciseId).toBe(squat.id);
    // Orders stay dense
    expect(exercises.map((e) => e.order).sort()).toEqual([0, 1]);
  });

  it('pause accumulates time; resume continues', async () => {
    const app = await renderApp();
    await act(async () => {
      await app.store.startSession();
    });
    const started = app.store.state.activeSession!;
    expect(started.paused).toBe(false);

    await act(async () => {
      app.store.pauseSession();
    });
    const paused = app.store.state.activeSession!;
    expect(paused.paused).toBe(true);
    expect(paused.lastResumedAt).toBeUndefined();

    await act(async () => {
      app.store.resumeSession();
    });
    expect(app.store.state.activeSession!.paused).toBe(false);
    expect(app.store.state.activeSession!.lastResumedAt).toBeDefined();
  });

  it('template start copies targets without mutating the template', async () => {
    const app = await renderApp();
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat')!;
    let templateId = '';
    await act(async () => {
      templateId = await app.store.saveTemplate({
        name: 'Squat day',
        exercises: [{ exerciseId: squat.id, order: 0, targetSets: 5, targetReps: 3 }],
      });
    });
    expect(app.store.state.templates).toHaveLength(1);

    await act(async () => {
      await app.store.startSession({ templateId });
    });
    const session = app.store.state.activeSession!;
    expect(session.exercises[0]!.targetSets).toBe(5);
    expect(session.exercises[0]!.targetReps).toBe(3);
    expect(session.templateId).toBe(templateId);
    // Template untouched
    expect(app.store.state.templates[0]!.exercises[0]!.targetSets).toBe(5);
  });

  it('duplicate template produces an independent copy', async () => {
    const app = await renderApp();
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat')!;
    let id = '';
    await act(async () => {
      id = await app.store.saveTemplate({
        name: 'Original',
        exercises: [{ exerciseId: squat.id, order: 0, targetSets: 3 }],
      });
    });
    let copyId = '';
    await act(async () => {
      copyId = await app.store.duplicateTemplate(id);
    });
    expect(copyId).not.toBe(id);
    expect(app.store.state.templates).toHaveLength(2);
    await act(async () => {
      await app.store.deleteTemplate(id);
    });
    expect(app.store.state.templates.map((t) => t.id)).toEqual([copyId]);
  });

  it('reorder swaps neighbors and normalizes order', async () => {
    const app = await renderApp();
    const names = ['Barbell Squat', 'Deadlift', 'Overhead Press'];
    await act(async () => {
      await app.store.startSession();
    });
    for (const name of names) {
      const exercise = app.store.state.exercises.find((e) => e.name === name)!;
      await act(async () => {
        await app.store.addSessionExercise(exercise.id);
      });
    }
    const slots = app.store.state.activeSession!.exercises;
    await act(async () => {
      await app.store.reorderExercise(slots[2]!.id, 'up');
    });
    const after = app.store.state.activeSession!.exercises;
    expect(after.map((s) => s.exerciseId)).toEqual([
      slots[0]!.exerciseId,
      slots[2]!.exerciseId,
      slots[1]!.exerciseId,
    ]);
    expect(after.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it('custom exercise appears in library and can be deleted when unused', async () => {
    const app = await renderApp();
    let created: { id: string };
    await act(async () => {
      created = await app.store.createExercise({
        name: 'Zercher Squat',
        muscleGroups: ['quads'],
        equipment: 'barbell',
      });
    });
    expect(app.store.state.exercises.some((e) => e.name === 'Zercher Squat')).toBe(true);
    await act(async () => {
      await app.store.deleteExercise(created!.id);
    });
    expect(app.store.state.exercises.some((e) => e.name === 'Zercher Squat')).toBe(false);
  });

  it('backup export → reset → import restores sessions', async () => {
    const app = await renderApp();
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat')!;
    await act(async () => {
      await app.store.startSession({ name: 'Precious' });
    });
    await act(async () => {
      await app.store.addSessionExercise(squat.id);
    });
    const slot = app.store.state.activeSession!.exercises[0]!;
    await act(async () => {
      await app.store.addSet(slot.id, { weight: 140, reps: 3 });
    });
    await act(async () => {
      await app.store.finishSession();
    });

    // Export via service, reset through store, then re-import text.
    const backupMod = await import('../data/backupService');
    // Fresh modules were reset — re-fetch repos through the provider's modules
    const dbMod = await import('../data/db');
    const backup = await backupMod.exportBackup();
    const text = JSON.stringify(backup);
    void dbMod;

    await act(async () => {
      await app.store.resetAllData();
    });
    expect(app.store.state.sessions).toHaveLength(0);

    await act(async () => {
      await app.store.importBackupFromText(text, 'replace');
    });
    expect(app.store.state.sessions).toHaveLength(1);
    expect(app.store.state.sessions[0]!.name).toBe('Precious');
    expect(app.store.state.exercises.length).toBeGreaterThanOrEqual(60);
  });
});

describe('gyms', () => {
  it('create → select → start tags session; delete gym keeps session provenance', async () => {
    const app = await renderApp();
    const squat = app.store.state.exercises.find((e) => e.name === 'Barbell Squat')!;
    let gymId = '';
    await act(async () => {
      const gym = await app.store.createGym('Gym A');
      gymId = gym.id;
    });
    await act(async () => {
      await app.store.createGym('Gym B');
    });
    expect(app.store.state.gyms).toHaveLength(2);

    act(() => {
      app.store.selectGym(gymId);
    });
    expect(app.store.state.settings.selectedGymId).toBe(gymId);

    await act(async () => {
      await app.store.startSession();
    });
    expect(app.store.state.activeSession!.gymId).toBe(gymId);
    await act(async () => {
      await app.store.addSessionExercise(squat.id);
      await app.store.finishSession();
    });
    expect(app.store.state.sessions[0]!.gymId).toBe(gymId);

    // explicit '' deselects
    act(() => {
      app.store.selectGym('');
    });
    expect(app.store.state.settings.selectedGymId).toBeUndefined();

    await act(async () => {
      await app.store.startSession({ name: 'No gym' });
    });
    expect(app.store.state.activeSession!.gymId).toBeUndefined();
    await act(async () => {
      await app.store.discardSession();
    });

    // deleting a gym keeps historical sessions untouched
    await act(async () => {
      await app.store.deleteGym(gymId);
    });
    expect(app.store.state.gyms.map((g) => g.name)).toEqual(['Gym B']);
    expect(app.store.state.sessions[0]!.gymId).toBe(gymId);
  });

  it('duplicate gym names rejected case-insensitively', async () => {
    const app = await renderApp();
    await act(async () => {
      await app.store.createGym('Fitness First');
    });
    await act(async () => {
      await expect(app.store.createGym('fitness first')).rejects.toThrow(/already exists/);
    });
  });

  it('backup round trip preserves gyms', async () => {
    const app = await renderApp();
    await act(async () => {
      await app.store.createGym('Powerhouse');
    });
    const backupMod = await import('../data/backupService');
    const backup = await backupMod.exportBackup();
    expect(backup.data.gyms).toHaveLength(1);
    expect(backup.data.gyms[0]!.name).toBe('Powerhouse');
    const text = JSON.stringify(backup);

    await act(async () => {
      await app.store.resetAllData();
    });
    expect(app.store.state.gyms).toHaveLength(0);
    await act(async () => {
      await app.store.importBackupFromText(text, 'replace');
    });
    expect(app.store.state.gyms.map((g) => g.name)).toEqual(['Powerhouse']);
  });
});

describe('demo data', () => {
  it('loads demo block: sessions, gyms and templates appear in state', async () => {
    const app = await renderApp();
    await act(async () => {
      await app.store.loadDemoData();
    });
    expect(app.store.state.sessions.length).toBeGreaterThanOrEqual(28);
    expect(app.store.state.gyms).toHaveLength(3);
    expect(app.store.state.templates).toHaveLength(3);
    // Idempotent on second load (stable demo ids merge, not duplicate)
    const count = app.store.state.sessions.length;
    await act(async () => {
      await app.store.loadDemoData();
    });
    expect(app.store.state.sessions.length).toBe(count);
  });
});

describe('settings + favourites', () => {
  it('favourite toggle persists across provider remount', async () => {
    const app = await renderApp();
    const exercise = app.store.state.exercises[0]!;
    await act(async () => {
      await app.store.toggleFavourite(exercise.id);
    });
    expect(app.store.state.exercises[0]!.isFavourite).toBe(true);

    const app2 = await renderApp();
    const same = app2.store.state.exercises.find((e) => e.id === exercise.id)!;
    expect(same.isFavourite).toBe(true);
  });

  it('units change persists and is visible to consumers', async () => {
    const app = await renderApp();
    act(() => {
      app.store.setUnits('lb');
    });
    expect(app.store.state.settings.units).toBe('lb');
    const app2 = await renderApp();
    expect(app2.store.state.settings.units).toBe('lb');
  });
});

describe('SetRow component', () => {
  it('renders weight/reps and toggles complete via callbacks', async () => {
    await freshEnv();
    const { SetRow } = await import('../components/workout/SetRow');
    const set = {
      id: 'set-1',
      type: 'working' as const,
      weight: 80,
      reps: 6,
      completed: false,
    };
    const onToggle = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SetRow index={0} set={set} units="kg" onUpdate={vi.fn()} onToggle={onToggle} onRemove={vi.fn()} />
    );

    expect(screen.getByLabelText('Set 1 weight in kg')).toHaveValue(80);
    expect(screen.getByLabelText('Set 1 reps')).toHaveValue(6);

    await user.click(screen.getByLabelText('Mark set 1 complete'));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <SetRow
        index={0}
        set={{ ...set, completed: true }}
        units="kg"
        onUpdate={vi.fn()}
        onToggle={onToggle}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Mark set 1 incomplete')).toBeInTheDocument();
  });

  it('accepts typed weight values and reports them to the store', async () => {
    await freshEnv();
    const { SetRow } = await import('../components/workout/SetRow');
    const set = { id: 's', type: 'working' as const, weight: 100, reps: 5, completed: false };
    const onUpdate = vi.fn();
    render(<SetRow index={0} set={set} units="kg" onUpdate={onUpdate} onToggle={vi.fn()} onRemove={vi.fn()} />);
    const weight = screen.getByLabelText('Set 1 weight in kg');
    act(() => {
      fireEvent.change(weight, { target: { value: '102.5' } });
    });
    expect(onUpdate).toHaveBeenCalledWith({ weight: 102.5 });
    // Unparseable input falls back to 0 rather than NaN poisoning the set
    act(() => {
      fireEvent.change(weight, { target: { value: 'abc' } });
    });
    expect(onUpdate).toHaveBeenLastCalledWith({ weight: 0 });
  });
});
