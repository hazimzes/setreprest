import type { AppSettings, Exercise, Session, Template } from './models';
import {
  validateExerciseShape,
  validateSessionShape,
  validateSettingsShape,
  validateTemplateShape,
  ValidationError,
} from './validation';

export const BACKUP_APP_TAG = 'setreprest';
/** Bump only when the backup schema itself changes (follows the DB schema version). */
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupData {
  exercises: Exercise[];
  sessions: Session[];
  templates: Template[];
  settings: AppSettings | null;
}

export interface BackupFile {
  app: string;
  schemaVersion: number;
  exportedAt: number;
  checksum: string;
  data: BackupData;
}

/** Canonical JSON: stable key order via recursive sort, for deterministic checksums. */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  function normalize(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(normalize);
    if (v !== null && typeof v === 'object') {
      if (seen.has(v)) throw new ValidationError('Circular structure in backup data');
      seen.add(v);
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = normalize(obj[k]);
      return out;
    }
    return v;
  }
  return JSON.stringify(normalize(value));
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeChecksum(data: BackupData): Promise<string> {
  return sha256Hex(canonicalJson(data));
}

/**
 * Full structural + referential validation of a parsed backup file.
 * Throws ValidationError with a specific message; returns typed data on success.
 */
export async function validateBackupFile(parsed: unknown): Promise<BackupFile> {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ValidationError('Backup is not a JSON object.');
  }
  const x = parsed as Record<string, unknown>;
  if (x.app !== BACKUP_APP_TAG) {
    throw new ValidationError('This file is not a SetRepRest backup.');
  }
  if (typeof x.schemaVersion !== 'number' || x.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new ValidationError(
      `Backup schema version ${String(x.schemaVersion)} is newer than this app supports (${BACKUP_SCHEMA_VERSION}). Update the app first.`
    );
  }
  if (typeof x.exportedAt !== 'number') {
    throw new ValidationError('Backup is missing an export date.');
  }
  if (typeof x.checksum !== 'string' || typeof x.data !== 'object' || x.data === null) {
    throw new ValidationError('Backup is malformed (missing data or checksum).');
  }

  const d = x.data as Record<string, unknown>;
  if (
    !Array.isArray(d.exercises) ||
    !Array.isArray(d.sessions) ||
    !Array.isArray(d.templates)
  ) {
    throw new ValidationError('Backup is missing exercises, sessions, or templates.');
  }
  if (d.settings !== null && !validateSettingsShape(d.settings)) {
    throw new ValidationError('Backup settings are invalid.');
  }
  const exercises = d.exercises as unknown[];
  if (!exercises.every(validateExerciseShape)) {
    throw new ValidationError('Backup contains an invalid exercise entry.');
  }
  const sessions = d.sessions as unknown[];
  if (!sessions.every(validateSessionShape)) {
    throw new ValidationError('Backup contains an invalid session entry.');
  }
  const templates = d.templates as unknown[];
  if (!templates.every(validateTemplateShape)) {
    throw new ValidationError('Backup contains an invalid template entry.');
  }

  const exerciseIds = new Set(exercises.map((e) => (e as Exercise).id));
  for (const s of sessions) {
    for (const ex of (s as Session).exercises) {
      if (!exerciseIds.has(ex.exerciseId)) {
        throw new ValidationError(
          `Session "${(s as Session).name}" references a missing exercise. Backup is incomplete.`
        );
      }
    }
  }
  for (const t of templates) {
    for (const ex of (t as Template).exercises) {
      if (!exerciseIds.has(ex.exerciseId)) {
        throw new ValidationError(
          `Template "${(t as Template).name}" references a missing exercise. Backup is incomplete.`
        );
      }
    }
  }

  const data = {
    exercises: exercises as Exercise[],
    sessions: sessions as Session[],
    templates: templates as Template[],
    settings: (d.settings as AppSettings | null) ?? null,
  };
  const expected = await computeChecksum(data);
  if (expected !== x.checksum) {
    throw new ValidationError('Checksum mismatch — the backup file is corrupted or was modified.');
  }
  return {
    app: BACKUP_APP_TAG,
    schemaVersion: x.schemaVersion,
    exportedAt: x.exportedAt,
    checksum: x.checksum,
    data,
  };
}
