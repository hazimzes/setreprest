import { SEED_VERSION, buildSeedExercises } from '../domain/seed';
import { DEFAULT_SETTINGS, type AppSettings } from '../domain/models';
import { DataError, getDb, type SetRepRestDB } from './db';

/**
 * First-run / version-upgrade seeding. Idempotent: inserts only catalog entries
 * whose (case-insensitive) name does not exist yet, then stamps seededVersion.
 */
export async function ensureSeeded(instance: SetRepRestDB = getDb()): Promise<AppSettings> {
  try {
    const now = Date.now();
    await instance.transaction('rw', instance.exercises, instance.settings, async () => {
      const row = await instance.settings.get('app');
      const settings: AppSettings = row?.value ?? { ...DEFAULT_SETTINGS };
      if (settings.seededVersion >= SEED_VERSION) return;

      const existing = new Set(
        (await instance.exercises.toArray()).map((e) => e.name.trim().toLowerCase())
      );
      const missing = buildSeedExercises(now).filter(
        (e) => !existing.has(e.name.trim().toLowerCase())
      );
      if (missing.length > 0) {
        await instance.exercises.bulkPut(missing);
      }
      settings.seededVersion = SEED_VERSION;
      await instance.settings.put({ key: 'app', value: settings });
    });
    const finalRow = await instance.settings.get('app');
    if (!finalRow) throw new DataError('Settings row missing after seeding');
    return finalRow.value;
  } catch (err) {
    if (err instanceof DataError) throw err;
    throw new DataError('Failed to initialize the exercise catalog', err);
  }
}
