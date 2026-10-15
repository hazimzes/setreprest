import Dexie, { type Table } from 'dexie';
import type { AppSettings, Exercise, Session, Template } from '../domain/models';

/**
 * Settings are stored as key/value rows; the app-level singleton uses key 'app'.
 * This row shape is what the settings table actually stores.
 */
export interface SettingsRow {
  key: 'app';
  value: AppSettings;
}

/**
 * Schema v1 — initial release. Sessions embed their exercises and sets
 * (aggregate-per-row); a session is always read/written as a whole.
 * Future schema changes append new versions with .upgrade(); never edit old ones.
 */
export class SetRepRestDB extends Dexie {
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  templates!: Table<Template, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super('setreprest');
    this.version(1).stores({
      exercises: 'id, name, isFavourite, equipment',
      sessions: 'id, status, startedAt',
      templates: 'id, name',
      settings: 'key',
    });
  }
}

export let db: SetRepRestDB;

export function getDb(): SetRepRestDB {
  if (!db) {
    db = new SetRepRestDB();
  }
  return db;
}

/** Thrown by repository calls that fail at the storage layer. */
export class DataError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DataError';
  }
}

/** True when IndexedDB accepts writes (false in some private modes / evicted contexts). */
export async function checkStorageAvailable(): Promise<boolean> {
  try {
    const d = getDb();
    await d.open();
    await d.settings.count();
    return true;
  } catch {
    return false;
  }
}
