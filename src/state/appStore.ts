import { createContext, useContext } from 'react';
import type { AppSettings, Exercise, Gym, Session, SetEntry, Template } from '../domain/models';
import type { ImportResult, ImportMode } from '../data/backupService';

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  storageAvailable: boolean;
  errorMessage?: string;
  settings: AppSettings;
  exercises: Exercise[];
  /** Completed history, newest first. */
  sessions: Session[];
  activeSession: Session | null;
  templates: Template[];
  gyms: Gym[];
}

/**
 * Single store interface. Operations throw on failure; callers surface errors
 * via toast. Persistence happens inside each operation before state updates.
 */
export interface AppStore {
  state: AppState;

  /* Session lifecycle */
  startSession(input?: { name?: string; templateId?: string; gymId?: string }): Promise<void>;
  deleteSessionById(id: string): Promise<void>;
  resumeSession(): void;
  pauseSession(): void;
  renameSession(name: string): Promise<void>;
  finishSession(): Promise<void>;
  discardSession(): Promise<void>;

  /* Session exercises */
  addSessionExercise(exerciseId: string): Promise<void>;
  removeSessionExercise(id: string): Promise<void>;
  reorderExercise(id: string, direction: 'up' | 'down'): Promise<void>;
  substituteExercise(id: string, newExerciseId: string): Promise<void>;

  /* Sets */
  addSet(sessionExerciseId: string, input?: { weight?: number; reps?: number; type?: SetEntry['type'] }): Promise<void>;
  updateSet(sessionExerciseId: string, setId: string, patch: Partial<SetEntry>): Promise<void>;
  removeSet(sessionExerciseId: string, setId: string): Promise<void>;
  toggleSetComplete(sessionExerciseId: string, setId: string): Promise<void>;

  /* Gyms */
  createGym(name: string, notes?: string): Promise<Gym>;
  renameGym(id: string, name: string): Promise<void>;
  deleteGym(id: string): Promise<void>;
  /** '' selects "all gyms". */
  selectGym(gymId: string): void;

  /* Settings — fire-and-forget; storage failures flip the read-only banner */
  setUnits(units: 'kg' | 'lb'): void;
  setTheme(theme: 'dark' | 'light'): void;
  setDefaultRestSec(sec: number): void;
  setRestTimerEnabled(enabled: boolean): void;

  /* Library */
  toggleFavourite(id: string): Promise<void>;
  createExercise(input: {
    name: string;
    muscleGroups: Exercise['muscleGroups'];
    equipment: Exercise['equipment'];
    notes?: string;
  }): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;

  /* Templates */
  saveTemplate(input: { id?: string; name: string; exercises: Template['exercises'] }): Promise<string>;
  deleteTemplate(id: string): Promise<void>;
  duplicateTemplate(id: string): Promise<string>;

  /* Data tools */
  exportBackupFile(): Promise<void>;
  importBackupFromText(text: string, mode: ImportMode): Promise<ImportResult>;
  resetAllData(): Promise<void>;
  exportHistoryCsv(): Promise<void>;
  exportSummaryCsv(): Promise<void>;
}

export const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error('useAppStore must be used inside <AppProvider>');
  }
  return store;
}

/** Non-null variant for tests that always wrap in a provider. */
export function useAppStoreOrNull(): AppStore | null {
  return useContext(AppStoreContext);
}

export type { ImportMode, ImportResult };
