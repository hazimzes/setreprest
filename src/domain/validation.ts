import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  SET_TYPES,
  type AppSettings,
  type Exercise,
  type Session,
  type SetEntry,
  type SetType,
  type Template,
} from './models';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function isValidRpe(rpe: number): boolean {
  return Number.isFinite(rpe) && rpe >= 1 && rpe <= 10 && isHalfStep(rpe);
}

function isHalfStep(n: number): boolean {
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

export function isPositiveNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0;
}

export function validateExerciseShape(e: unknown): e is Exercise {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    x.name.length > 0 &&
    Array.isArray(x.muscleGroups) &&
    x.muscleGroups.length > 0 &&
    x.muscleGroups.every((m) => MUSCLE_GROUPS.includes(m as never)) &&
    EQUIPMENT_TYPES.includes(x.equipment as never) &&
    typeof x.isCustom === 'boolean' &&
    typeof x.isFavourite === 'boolean' &&
    typeof x.createdAt === 'number' &&
    Number.isFinite(x.createdAt)
  );
}

function validateSetShape(s: unknown): s is SetEntry {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Record<string, unknown>;
  if (!SET_TYPES.includes(x.type as never)) return false;
  if (!isPositiveNumber(x.weight) || !Number.isInteger(x.reps) || (x.reps as number) < 0) {
    return false;
  }
  if (typeof x.completed !== 'boolean') return false;
  if (x.rpe !== undefined && !isValidRpe(x.rpe as number)) return false;
  if (x.id !== undefined && typeof x.id !== 'string') return false;
  return true;
}

export function validateSessionShape(s: unknown): s is Session {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Record<string, unknown>;
  if (
    typeof x.id !== 'string' ||
    typeof x.name !== 'string' ||
    (x.status !== 'active' && x.status !== 'completed' && x.status !== 'discarded')
  ) {
    return false;
  }
  if (typeof x.startedAt !== 'number' || !Number.isFinite(x.startedAt)) return false;
  if (typeof x.accumulatedActiveMs !== 'number' || (x.accumulatedActiveMs as number) < 0) {
    return false;
  }
  if (typeof x.paused !== 'boolean') return false;
  if (!Array.isArray(x.exercises)) return false;
  return x.exercises.every((ex: unknown) => {
    if (typeof ex !== 'object' || ex === null) return false;
    const e = ex as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.exerciseId !== 'string') return false;
    if (!Number.isInteger(e.order) || !Array.isArray(e.sets)) return false;
    return e.sets.every((set: unknown) => validateSetShape(set));
  });
}

export function validateTemplateShape(t: unknown): t is Template {
  if (typeof t !== 'object' || t === null) return false;
  const x = t as Record<string, unknown>;
  if (typeof x.id !== 'string' || typeof x.name !== 'string' || x.name.length === 0) return false;
  if (typeof x.createdAt !== 'number' || typeof x.updatedAt !== 'number') return false;
  if (!Array.isArray(x.exercises)) return false;
  return x.exercises.every((ex: unknown) => {
    if (typeof ex !== 'object' || ex === null) return false;
    const e = ex as Record<string, unknown>;
    return (
      typeof e.exerciseId === 'string' &&
      Number.isInteger(e.order) &&
      Number.isInteger(e.targetSets) &&
      (e.targetSets as number) > 0
    );
  });
}

export function validateSettingsShape(s: unknown): s is AppSettings {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Record<string, unknown>;
  return (
    (x.units === 'kg' || x.units === 'lb') &&
    Number.isFinite(x.defaultRestSec) &&
    (x.defaultRestSec as number) > 0 &&
    typeof x.restTimerEnabled === 'boolean' &&
    Number.isInteger(x.seededVersion)
  );
}

export function setTypeLabel(type: SetType): string {
  switch (type) {
    case 'warmup':
      return 'Warm-up';
    case 'working':
      return 'Working';
    case 'drop':
      return 'Drop';
  }
}
