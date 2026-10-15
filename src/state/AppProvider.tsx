import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type Exercise,
  type Gym,
  type Session,
  type SessionExercise,
  type SetEntry,
  type Template,
} from '../domain/models';
import { createId } from '../domain/id';
import { nextSetDefaults } from '../domain/calculations';
import { isValidRpe, ValidationError } from '../domain/validation';
import { checkStorageAvailable, getDb } from '../data/db';
import { ensureSeeded } from '../data/seedRunner';
import * as repo from '../data/repositories';
import {
  downloadCsv,
  downloadJsonBackup,
  exportBackup,
  importBackup,
  resetAllData as resetAllDataRepo,
  type ImportMode,
} from '../data/backupService';
import { buildHistoryCsv, buildSessionSummaryCsv } from '../domain/csv';
import { AppStoreContext, type AppState, type AppStore } from './appStore';

const now = () => Date.now();

function normalizeOrders(exercises: SessionExercise[]): SessionExercise[] {
  return [...exercises]
    .sort((a, b) => a.order - b.order)
    .map((ex, i) => ({ ...ex, order: i }));
}

/** All sets for an exercise across completed sessions, oldest first. */
function getHistoricalSets(sessions: Session[], exerciseId: string): SetEntry[] {
  return [...sessions]
    .sort((a, b) => a.startedAt - b.startedAt)
    .flatMap((s) => s.exercises)
    .filter((ex) => ex.exerciseId === exerciseId)
    .flatMap((ex) => ex.sets);
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    status: 'loading',
    storageAvailable: true,
    settings: DEFAULT_SETTINGS,
    exercises: [],
    sessions: [],
    activeSession: null,
    templates: [],
    gyms: [],
  });

  /** Mirror of activeSession for imperative ops that must not read stale closures. */
  const activeRef = useRef<Session | null>(null);

  const applySession = useCallback((session: Session | null) => {
    activeRef.current = session;
    setState((prev) => ({ ...prev, activeSession: session }));
  }, []);

  useEffect(() => {
    activeRef.current = state.activeSession;
  }, [state.activeSession]);

  /* ------------------------- Boot ------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storageAvailable = await checkStorageAvailable();
        if (cancelled) return;
        if (!storageAvailable) {
          setState((prev) => ({ ...prev, status: 'ready', storageAvailable: false }));
          return;
        }
        const settings = await ensureSeeded();
        const [exercises, allSessions, templates, activeSession, gyms] = await Promise.all([
          repo.listExercises(),
          repo.listSessions(),
          repo.listTemplates(),
          repo.getActiveSession(),
          repo.listGyms(),
        ]);
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: 'ready',
          storageAvailable: true,
          settings,
          exercises,
          sessions: allSessions.filter((s) => s.status === 'completed'),
          activeSession: activeSession ?? null,
          templates,
          gyms,
        }));
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Unknown startup failure',
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------- Settings operations ------------------- */

  const mutateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
      try {
        await repo.saveSettings({ ...state.settings, ...patch });
      } catch {
        setState((prev) => ({ ...prev, storageAvailable: false }));
      }
    },
    [state.settings]
  );

  const setUnits = useCallback(
    (units: 'kg' | 'lb') => {
      void mutateSettings({ units });
    },
    [mutateSettings]
  );
  const setTheme = useCallback(
    (theme: 'dark' | 'light') => {
      void mutateSettings({ theme });
    },
    [mutateSettings]
  );
  const setDefaultRestSec = useCallback(
    (sec: number) => {
      void mutateSettings({ defaultRestSec: sec });
    },
    [mutateSettings]
  );
  const setRestTimerEnabled = useCallback(
    (enabled: boolean) => {
      void mutateSettings({ restTimerEnabled: enabled });
    },
    [mutateSettings]
  );

  /* --------------------- Theme side effect ------------------- */

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', state.settings.theme === 'dark');
    root.classList.toggle('light', state.settings.theme === 'light');
    root.style.colorScheme = state.settings.theme;
  }, [state.settings.theme]);

  /* --------------------- Session lifecycle ------------------- */

  const startSession = useCallback(
    async (input?: { name?: string; templateId?: string; gymId?: string }) => {
      let template: Template | undefined;
      if (input?.templateId) {
        template = state.templates.find((t) => t.id === input.templateId);
        if (!template) throw new ValidationError('Template not found.');
      }
      const session: Session = {
        id: createId(),
        name:
          input?.name ??
          template?.name ??
          `Workout — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        status: 'active',
        startedAt: now(),
        accumulatedActiveMs: 0,
        lastResumedAt: now(),
        paused: false,
        exercises:
          template?.exercises.map((te, i) => ({
            id: createId(),
            exerciseId: te.exerciseId,
            order: i,
            sets: [],
            targetSets: te.targetSets,
            ...(te.targetReps !== undefined ? { targetReps: te.targetReps } : {}),
          })) ?? [],
        templateId: input?.templateId,
        gymId: input?.gymId ?? (state.settings.selectedGymId ? state.settings.selectedGymId : undefined),
      };
      await repo.putSession(session);
      applySession(session);
    },
    [state.templates, state.settings.selectedGymId, applySession]
  );

  const deleteSessionById = useCallback(async (id: string) => {
    await repo.deleteSession(id);
    setState((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.id !== id) }));
  }, []);

  const resumeSession = useCallback(() => {
    setState((prev) => {
      const session = prev.activeSession;
      if (!session || session.status !== 'active' || !session.paused) return prev;
      const updated: Session = {
        ...session,
        paused: false,
        lastResumedAt: now(),
      };
      void repo.putSession(updated).catch(() =>
        setState((p) => ({ ...p, storageAvailable: false }))
      );
      return { ...prev, activeSession: updated };
    });
  }, []);

  const pauseSession = useCallback(() => {
    setState((prev) => {
      const session = prev.activeSession;
      if (!session || session.paused || session.status !== 'active') return prev;
      const cut = session.lastResumedAt ?? now();
      const updated: Session = {
        ...session,
        paused: true,
        lastResumedAt: undefined,
        accumulatedActiveMs: session.accumulatedActiveMs + Math.max(0, now() - cut),
      };
      void repo.putSession(updated).catch(() =>
        setState((p) => ({ ...p, storageAvailable: false }))
      );
      return { ...prev, activeSession: updated };
    });
  }, []);

  const renameSession = useCallback(
    async (name: string) => {
      const session = activeRef.current;
      if (!session) return;
      const updated = { ...session, name: name.trim() || session.name };
      applySession(updated);
      try {
        await repo.putSession(updated);
      } catch {
        setState((prev) => ({ ...prev, storageAvailable: false }));
      }
    },
    [applySession]
  );

  const finishSession = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return;
    const cut = session.lastResumedAt ?? now();
    const finished: Session = {
      ...session,
      status: 'completed',
      paused: true,
      lastResumedAt: undefined,
      endedAt: now(),
      accumulatedActiveMs: session.accumulatedActiveMs + Math.max(0, now() - cut),
    };
    await repo.putSession(finished);
    applySession(null);
    setState((prev) => ({
      ...prev,
      sessions: [finished, ...prev.sessions],
    }));
  }, [applySession]);

  const discardSession = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return;
    await repo.deleteSession(session.id);
    applySession(null);
  }, [applySession]);

  /* --------------------- Session exercises ------------------- */

  const mutateActiveSession = useCallback(
    async (mutator: (session: Session) => Session): Promise<void> => {
      const session = activeRef.current;
      if (!session) throw new ValidationError('No active workout.');
      const updated = mutator(structuredClone(session));
      applySession(updated);
      try {
        await repo.putSession(updated);
      } catch {
        setState((prev) => ({ ...prev, storageAvailable: false }));
      }
    },
    [applySession]
  );

  const addSessionExercise = useCallback(
    async (exerciseId: string) => {
      const exists = activeRef.current?.exercises.some((ex) => ex.exerciseId === exerciseId);
      if (exists) {
        throw new ValidationError('This exercise is already in the workout.');
      }
      const id = createId();
      await mutateActiveSession((session) => ({
        ...session,
        exercises: normalizeOrders([
          ...session.exercises,
          {
            id,
            exerciseId,
            order: session.exercises.length,
            sets: [],
          },
        ]),
      }));
    },
    [mutateActiveSession]
  );

  const removeSessionExercise = useCallback(
    async (id: string) => {
      await mutateActiveSession((session) => ({
        ...session,
        exercises: normalizeOrders(session.exercises.filter((ex) => ex.id !== id)),
      }));
    },
    [mutateActiveSession]
  );

  const reorderExercise = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      await mutateActiveSession((session) => {
        const slot = session.exercises.find((ex) => ex.id === id);
        if (!slot) return session;
        const other = direction === 'up' ? slot.order - 1 : slot.order + 1;
        const neighbour = session.exercises.find((ex) => ex.order === other);
        if (!neighbour) return session;
        const swapped = session.exercises.map((ex) => {
          if (ex.id === id) return { ...ex, order: other };
          if (ex.id === neighbour.id) return { ...ex, order: slot.order };
          return ex;
        });
        return { ...session, exercises: normalizeOrders(swapped) };
      });
    },
    [mutateActiveSession]
  );

  const substituteExercise = useCallback(
    async (id: string, newExerciseId: string) => {
      await mutateActiveSession((session) => {
        const slot = session.exercises.find((ex) => ex.id === id);
        if (!slot) return session;
        if (slot.exerciseId === newExerciseId) return session;
        // Old slot keeps its sets (history stays with the original exercise);
        // a fresh slot for the substitute records what it replaced.
        const oldSlot = { ...slot, order: slot.order };
        const newSlot: SessionExercise = {
          id: createId(),
          exerciseId: newExerciseId,
          order: slot.order + 0.5,
          sets: [],
          substitutedFromExerciseId: slot.exerciseId,
          ...(slot.targetSets !== undefined ? { targetSets: slot.targetSets } : {}),
          ...(slot.targetReps !== undefined ? { targetReps: slot.targetReps } : {}),
        };
        return {
          ...session,
          exercises: normalizeOrders([
            ...session.exercises.filter((ex) => ex.id !== id),
            oldSlot,
            newSlot,
          ]),
        };
      });
    },
    [mutateActiveSession]
  );

  /* ---------------------------- Sets ---------------------------- */

  const addSet = useCallback(
    async (
      sessionExerciseId: string,
      input?: { weight?: number; reps?: number; type?: SetEntry['type'] }
    ) => {
      const slot = activeRef.current?.exercises.find((ex) => ex.id === sessionExerciseId);
      if (!slot) throw new ValidationError('Exercise not found in this workout.');
      const historical = getHistoricalSets(state.sessions, slot.exerciseId);
      const defaults = nextSetDefaults(slot, historical);
      const set: SetEntry = {
        id: createId(),
        type: input?.type ?? defaults.type,
        weight: input?.weight ?? defaults.weight,
        reps: input?.reps ?? defaults.reps,
        completed: false,
        ...(defaults.rpe !== undefined ? { rpe: defaults.rpe } : {}),
      };
      await mutateActiveSession((session) => ({
        ...session,
        exercises: session.exercises.map((ex) =>
          ex.id === sessionExerciseId ? { ...ex, sets: [...ex.sets, set] } : ex
        ),
      }));
    },
    [state.sessions, mutateActiveSession]
  );

  const updateSet = useCallback(
    async (sessionExerciseId: string, setId: string, patch: Partial<SetEntry>) => {
      if (patch.rpe !== undefined && patch.rpe !== null && !isValidRpe(patch.rpe)) {
        throw new ValidationError('RPE must be between 1 and 10.');
      }
      await mutateActiveSession((session) => ({
        ...session,
        exercises: session.exercises.map((ex) =>
          ex.id === sessionExerciseId
            ? {
                ...ex,
                sets: ex.sets.map((set) =>
                  set.id === setId
                    ? {
                        ...set,
                        ...patch,
                        ...(patch.completed === true && set.completedAt === undefined
                          ? { completedAt: now() }
                          : {}),
                      }
                    : set
                ),
              }
            : ex
        ),
      }));
    },
    [mutateActiveSession]
  );

  const removeSet = useCallback(
    (sessionExerciseId: string, setId: string) => {
      return mutateActiveSession((session) => ({
        ...session,
        exercises: session.exercises.map((ex) =>
          ex.id === sessionExerciseId
            ? { ...ex, sets: ex.sets.filter((set) => set.id !== setId) }
            : ex
        ),
      }));
    },
    [mutateActiveSession]
  );

  const toggleSetComplete = useCallback(
    async (sessionExerciseId: string, setId: string) => {
      const session = activeRef.current;
      if (!session) throw new ValidationError('No active workout.');
      const updated = structuredClone(session);
      const slot = updated.exercises.find((ex) => ex.id === sessionExerciseId);
      if (!slot) throw new ValidationError('Exercise not found in this workout.');
      const target = slot.sets.find((st) => st.id === setId);
      if (!target) throw new ValidationError('Set not found.');
      target.completed = !target.completed;
      if (target.completed) {
        if (target.completedAt === undefined) target.completedAt = now();
        // Fast entry: completing the last set auto-appends a pre-filled follow-up.
        const isLast = slot.sets[slot.sets.length - 1]?.id === setId;
        if (isLast) {
          const historical = getHistoricalSets(state.sessions, slot.exerciseId);
          const d = nextSetDefaults(slot, historical);
          slot.sets.push({
            id: createId(),
            type: d.type,
            weight: d.weight,
            reps: d.reps,
            completed: false,
            ...(d.rpe !== undefined ? { rpe: d.rpe } : {}),
          });
        }
      } else {
        target.completedAt = undefined;
      }
      applySession(updated);
      try {
        await repo.putSession(updated);
      } catch {
        setState((prev) => ({ ...prev, storageAvailable: false }));
      }
    },
    [state.sessions, applySession]
  );

  /* ---------------------------- Gyms ------------------------------ */

  const refreshGyms = useCallback(async () => {
    const gyms = await repo.listGyms();
    setState((prev) => ({ ...prev, gyms }));
  }, []);

  const createGym = useCallback(
    async (name: string, notes?: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new ValidationError('Gym needs a name.');
      if (state.gyms.some((g) => g.name.trim().toLowerCase() === trimmed.toLowerCase())) {
        throw new ValidationError(`A gym named "${trimmed}" already exists.`);
      }
      const gym: Gym = {
        id: createId(),
        name: trimmed,
        ...(notes ? { notes } : {}),
        createdAt: now(),
      };
      await repo.putGym(gym);
      await refreshGyms();
      return gym;
    },
    [state.gyms, refreshGyms]
  );

  const renameGym = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new ValidationError('Gym needs a name.');
      const gym = state.gyms.find((g) => g.id === id);
      if (!gym) throw new ValidationError('Gym not found.');
      await repo.putGym({ ...gym, name: trimmed });
      await refreshGyms();
    },
    [state.gyms, refreshGyms]
  );

  const deleteGymOp = useCallback(
    async (id: string) => {
      await repo.deleteGym(id);
      await refreshGyms();
      // If the deleted gym was selected, fall back to all gyms.
      if (state.settings.selectedGymId === id) {
        void mutateSettings({ selectedGymId: '' });
      }
    },
    [refreshGyms, state.settings.selectedGymId, mutateSettings]
  );

  const selectGym = useCallback(
    (gymId: string) => {
      void mutateSettings({ selectedGymId: gymId || undefined });
    },
    [mutateSettings]
  );

  /* --------------------------- Library --------------------------- */

  const refreshExercises = useCallback(async () => {
    const exercises = await repo.listExercises();
    setState((prev) => ({ ...prev, exercises }));
  }, []);

  const toggleFavourite = useCallback(
    async (id: string) => {
      const current = state.exercises.find((e) => e.id === id);
      if (!current) return;
      const updated = { ...current, isFavourite: !current.isFavourite };
      setState((prev) => ({
        ...prev,
        exercises: prev.exercises.map((e) => (e.id === id ? updated : e)),
      }));
      try {
        await repo.putExercise(updated);
      } catch {
        void refreshExercises();
      }
    },
    [state.exercises, refreshExercises]
  );

  const createExercise = useCallback(
    async (input: {
      name: string;
      muscleGroups: Exercise['muscleGroups'];
      equipment: Exercise['equipment'];
      notes?: string;
    }) => {
      const exercise = await repo.createCustomExercise(input);
      await refreshExercises();
      return exercise;
    },
    [refreshExercises]
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      await repo.deleteCustomExercise(id);
      await refreshExercises();
    },
    [refreshExercises]
  );

  /* -------------------------- Templates -------------------------- */

  const saveTemplate = useCallback(
    async (input: { id?: string; name: string; exercises: Template['exercises'] }) => {
      if (!input.name.trim()) throw new ValidationError('Template needs a name.');
      if (input.exercises.length === 0) throw new ValidationError('Add at least one exercise.');
      const database = getDb();
      const id = input.id ?? createId();
      const existing = input.id ? await database.templates.get(input.id) : undefined;
      const template: Template = {
        id,
        name: input.name.trim(),
        exercises: input.exercises,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      };
      await repo.putTemplate(template);
      setState((prev) => ({
        ...prev,
        templates: [template, ...prev.templates.filter((t) => t.id !== id)],
      }));
      return id;
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string) => {
    await repo.deleteTemplate(id);
    setState((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
    }));
  }, []);

  const duplicateTemplate = useCallback(
    async (id: string) => {
      const source = state.templates.find((t) => t.id === id);
      if (!source) throw new ValidationError('Template not found.');
      const copy: Template = {
        id: createId(),
        name: `${source.name} (copy)`,
        exercises: source.exercises.map((e) => ({ ...e })),
        createdAt: now(),
        updatedAt: now(),
      };
      await repo.putTemplate(copy);
      setState((prev) => ({ ...prev, templates: [copy, ...prev.templates] }));
      return copy.id;
    },
    [state.templates]
  );

  /* ------------------------- Data tools -------------------------- */

  const exportBackupFile = useCallback(async () => {
    const backup = await exportBackup();
    downloadJsonBackup(backup);
  }, []);

  const importBackupFromText = useCallback(async (text: string, mode: ImportMode) => {
    const result = await importBackup(text, mode);
    const [exercises, allSessions, templates, gyms] = await Promise.all([
      repo.listExercises(),
      repo.listSessions(),
      repo.listTemplates(),
      repo.listGyms(),
    ]);
    setState((prev) => ({
      ...prev,
      exercises,
      sessions: allSessions.filter((s) => s.status === 'completed'),
      templates,
      gyms,
      ...(mode === 'replace' ? { activeSession: null } : {}),
    }));
    return result;
  }, []);

  const resetAllDataOp = useCallback(async () => {
    await resetAllDataRepo();
    const settings = await ensureSeeded();
    const exercises = await repo.listExercises();
    setState((prev) => ({
      ...prev,
      exercises,
      sessions: [],
      templates: [],
      gyms: [],
      activeSession: null,
      settings,
    }));
  }, []);

  const exerciseName = useCallback(
    (id: string) => state.exercises.find((e) => e.id === id)?.name ?? 'Unknown exercise',
    [state.exercises]
  );

  const exportHistoryCsv = useCallback(async () => {
    const gymName = (id: string) => state.gyms.find((g) => g.id === id)?.name ?? '';
    const csv = buildHistoryCsv(state.sessions, exerciseName, state.settings.units, gymName);
    downloadCsv(csv, `setreprest-history-${dateStamp()}.csv`);
  }, [state.sessions, state.settings.units, state.gyms, exerciseName]);

  const exportSummaryCsv = useCallback(async () => {
    const csv = buildSessionSummaryCsv(state.sessions);
    downloadCsv(csv, `setreprest-summary-${dateStamp()}.csv`);
  }, [state.sessions]);

  /* --------------------- Store assembly -------------------------- */

  const store = useMemo<AppStore>(
    () => ({
      state,
      startSession,
      deleteSessionById,
      createGym,
      renameGym,
      deleteGym: deleteGymOp,
      selectGym,
      resumeSession,
      pauseSession,
      renameSession,
      finishSession,
      discardSession,
      addSessionExercise,
      removeSessionExercise,
      reorderExercise,
      substituteExercise,
      addSet,
      updateSet,
      removeSet,
      toggleSetComplete,
      setUnits,
      setTheme,
      setDefaultRestSec,
      setRestTimerEnabled,
      toggleFavourite,
      createExercise,
      deleteExercise,
      saveTemplate,
      deleteTemplate,
      duplicateTemplate,
      exportBackupFile,
      importBackupFromText,
      resetAllData: resetAllDataOp,
      exportHistoryCsv,
      exportSummaryCsv,
    }),
    [
      state,
      startSession,
      deleteSessionById,
      createGym,
      renameGym,
      deleteGymOp,
      selectGym,
      resumeSession,
      pauseSession,
      renameSession,
      finishSession,
      discardSession,
      addSessionExercise,
      removeSessionExercise,
      reorderExercise,
      substituteExercise,
      addSet,
      updateSet,
      removeSet,
      toggleSetComplete,
      setUnits,
      setTheme,
      setDefaultRestSec,
      setRestTimerEnabled,
      toggleFavourite,
      createExercise,
      deleteExercise,
      saveTemplate,
      deleteTemplate,
      duplicateTemplate,
      exportBackupFile,
      importBackupFromText,
      resetAllDataOp,
      exportHistoryCsv,
      exportSummaryCsv,
    ]
  );

  if (state.status === 'error') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm opacity-70">{state.errorMessage}</p>
        <button className="mt-4 underline" onClick={() => location.reload()}>
          Reload app
        </button>
      </div>
    );
  }

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}
