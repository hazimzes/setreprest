import {
  BACKUP_SCHEMA_VERSION,
  computeChecksum,
  validateBackupFile,
  type BackupFile,
} from '../domain/backup';
import { ValidationError } from '../domain/validation';
import { DataError, getDb } from './db';

/** Full-data JSON export. Settings row is included so units/rest prefs travel with the backup. */
export async function exportBackup(): Promise<BackupFile> {
  const database = getDb();
  try {
    const [exercises, sessions, templates, settingsRow] = await Promise.all([
      database.exercises.toArray(),
      database.sessions.toArray(),
      database.templates.toArray(),
      database.settings.get('app'),
    ]);
    const data = {
      exercises,
      sessions,
      templates,
      settings: settingsRow?.value ?? null,
    };
    const checksum = await computeChecksum(data);
    return {
      app: 'setreprest',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      checksum,
      data,
    };
  } catch (err) {
    throw new DataError('Could not read data for export', err);
  }
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  exercises: number;
  sessions: number;
  templates: number;
}

/**
 * Import a validated backup. The file is fully validated BEFORE any write —
 * an invalid backup leaves the database untouched.
 * - replace: wipe exercises/sessions/templates, then insert backup contents.
 * - merge: add exercises by id (existing ids keep local version), add sessions/templates
 *   by id, keep local settings.
 */
export async function importBackup(
  rawJson: string,
  mode: ImportMode
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new ValidationError('The file is not valid JSON.');
  }
  const backup = await validateBackupFile(parsed);

  const database = getDb();
  try {
    await database.transaction(
      'rw',
      database.exercises,
      database.sessions,
      database.templates,
      database.settings,
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            database.exercises.clear(),
            database.sessions.clear(),
            database.templates.clear(),
          ]);
          await database.exercises.bulkPut(backup.data.exercises);
          await database.sessions.bulkPut(backup.data.sessions);
          await database.templates.bulkPut(backup.data.templates);
          if (backup.data.settings) {
            await database.settings.put({ key: 'app', value: backup.data.settings });
          }
          return;
        }
        // merge — existing ids keep their local version; new ids are added.
        const localExerciseIds = new Set((await database.exercises.toArray()).map((e) => e.id));
        const newExercises = backup.data.exercises.filter((e) => !localExerciseIds.has(e.id));
        await database.exercises.bulkPut(newExercises);

        const localSessionIds = new Set((await database.sessions.toArray()).map((s) => s.id));
        const newSessions = backup.data.sessions.filter((s) => !localSessionIds.has(s.id));
        await database.sessions.bulkPut(newSessions);

        const localTemplateIds = new Set((await database.templates.toArray()).map((t) => t.id));
        const newTemplates = backup.data.templates.filter((t) => !localTemplateIds.has(t.id));
        await database.templates.bulkPut(newTemplates);
      }
    );
    return {
      exercises: backup.data.exercises.length,
      sessions: backup.data.sessions.length,
      templates: backup.data.templates.length,
    };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new DataError('Import failed while writing to storage', err);
  }
}

export async function resetAllData(): Promise<void> {
  const database = getDb();
  try {
    await database.transaction(
      'rw',
      database.exercises,
      database.sessions,
      database.templates,
      database.settings,
      async () => {
        await Promise.all([
          database.exercises.clear(),
          database.sessions.clear(),
          database.templates.clear(),
          database.settings.clear(),
        ]);
      }
    );
  } catch (err) {
    throw new DataError('Could not reset data', err);
  }
}

export function downloadJsonBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `setreprest-backup-${dateStamp()}.json`);
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

