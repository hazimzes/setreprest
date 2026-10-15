/**
 * Core domain models. Plain JSON-safe structures only — these are stored
 * directly in IndexedDB (no class instances, no Maps/Sets, no Date objects).
 */

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'full body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'bodyweight',
  'band',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT_TYPES)[number];

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
  /** Seeded catalog entries are immutable; user-created ones are editable/deletable. */
  isCustom: boolean;
  isFavourite: boolean;
  notes?: string;
  createdAt: number;
}

export const SET_TYPES = ['warmup', 'working', 'drop'] as const;
export type SetType = (typeof SET_TYPES)[number];

export interface SetEntry {
  id: string;
  type: SetType;
  /** 0 means bodyweight (no external load). */
  weight: number;
  reps: number;
  completed: boolean;
  /** 1–10 in 0.5 steps. */
  rpe?: number;
  notes?: string;
  /** Epoch ms — first time the set was marked completed. */
  completedAt?: number;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  /** 0-based, dense, ascending. */
  order: number;
  sets: SetEntry[];
  /** Set when this slot was substituted; points at the exercise it replaced. */
  substitutedFromExerciseId?: string;
  /** Targets copied from a template at session start (provenance, editable). */
  targetSets?: number;
  targetReps?: number;
}

export type SessionStatus = 'active' | 'completed' | 'discarded';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  /** Active time accrued before the current resume. */
  accumulatedActiveMs: number;
  /** Defined only while the session is unpaused and unfinished. */
  lastResumedAt?: number;
  paused: boolean;
  exercises: SessionExercise[];
  notes?: string;
  templateId?: string;
}

export interface TemplateExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps?: number;
}

export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

export type Units = 'kg' | 'lb';

export type Theme = 'dark' | 'light';

export interface AppSettings {
  units: Units;
  defaultRestSec: number;
  restTimerEnabled: boolean;
  theme: Theme;
  /** Exercise catalog seed version already applied to this device. */
  seededVersion: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  units: 'kg',
  defaultRestSec: 90,
  restTimerEnabled: true,
  theme: 'dark',
  seededVersion: 0,
};
