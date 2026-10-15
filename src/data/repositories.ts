import { createId } from '../domain/id';
import type { AppSettings, Exercise, Session, Template } from '../domain/models';
import { ValidationError } from '../domain/validation';
import { DataError, getDb } from './db';

/* ---------------- Exercises ---------------- */

export async function listExercises(): Promise<Exercise[]> {
  try {
    return await getDb().exercises.toArray();
  } catch (err) {
    throw new DataError('Could not load the exercise library', err);
  }
}

export async function putExercise(exercise: Exercise): Promise<void> {
  try {
    await getDb().exercises.put(exercise);
  } catch (err) {
    throw new DataError('Could not save the exercise', err);
  }
}

export async function createCustomExercise(
  input: Pick<Exercise, 'name' | 'muscleGroups' | 'equipment' | 'notes'>
): Promise<Exercise> {
  const database = getDb();
  const nameTaken = await findExerciseByName(input.name);
  if (nameTaken) {
    throw new ValidationError(`An exercise named "${nameTaken.name}" already exists.`);
  }
  const exercise: Exercise = {
    id: createId(),
    name: input.name.trim(),
    muscleGroups: [...input.muscleGroups],
    equipment: input.equipment,
    isCustom: true,
    isFavourite: false,
    ...(input.notes ? { notes: input.notes } : {}),
    createdAt: Date.now(),
  };
  try {
    await database.exercises.put(exercise);
  } catch (err) {
    throw new DataError('Could not create the exercise', err);
  }
  return exercise;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const database = getDb();
  try {
    await database.transaction('rw', database.exercises, database.sessions, database.templates, async () => {
      const exercise = await database.exercises.get(id);
      if (!exercise) throw new ValidationError('Exercise not found.');
      if (!exercise.isCustom) {
        throw new ValidationError('Built-in exercises cannot be deleted.');
      }
      const usedInSession = await database.sessions.filter((s) =>
        s.exercises.some((ex) => ex.exerciseId === id)
      ).first();
      if (usedInSession) {
        throw new ValidationError(
          `"${exercise.name}" is used in logged workouts and cannot be deleted. Edit it instead.`
        );
      }
      const usedInTemplate = await database.templates.filter((t) =>
        t.exercises.some((ex) => ex.exerciseId === id)
      ).first();
      if (usedInTemplate) {
        throw new ValidationError(
          `"${exercise.name}" is used in a workout template. Remove it from the template first.`
        );
      }
      await database.exercises.delete(id);
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new DataError('Could not delete the exercise', err);
  }
}

export async function findExerciseByName(name: string): Promise<Exercise | undefined> {
  const target = name.trim().toLowerCase();
  const all = await getDb().exercises.toArray();
  return all.find((e) => e.name.trim().toLowerCase() === target);
}

/* ---------------- Sessions ---------------- */

export async function listSessions(): Promise<Session[]> {
  try {
    return (await getDb().sessions.toArray()).sort((a, b) => b.startedAt - a.startedAt);
  } catch (err) {
    throw new DataError('Could not load workout history', err);
  }
}

export async function getSession(id: string): Promise<Session | undefined> {
  try {
    return await getDb().sessions.get(id);
  } catch (err) {
    throw new DataError('Could not load the workout', err);
  }
}

/** The at-most-one unfinished session, for recovery on boot. */
export async function getActiveSession(): Promise<Session | undefined> {
  try {
    return await getDb().sessions.where('status').equals('active').first();
  } catch (err) {
    throw new DataError('Could not check for an unfinished workout', err);
  }
}

export async function putSession(session: Session): Promise<void> {
  try {
    await getDb().sessions.put(session);
  } catch (err) {
    throw new DataError('Could not save the workout', err);
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    await getDb().sessions.delete(id);
  } catch (err) {
    throw new DataError('Could not delete the workout', err);
  }
}

/* ---------------- Templates ---------------- */

export async function listTemplates(): Promise<Template[]> {
  try {
    return (await getDb().templates.toArray()).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    throw new DataError('Could not load templates', err);
  }
}

export async function putTemplate(template: Template): Promise<void> {
  try {
    await getDb().templates.put(template);
  } catch (err) {
    throw new DataError('Could not save the template', err);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    await getDb().templates.delete(id);
  } catch (err) {
    throw new DataError('Could not delete the template', err);
  }
}

/* ---------------- Settings ---------------- */

export async function loadSettings(): Promise<AppSettings | undefined> {
  try {
    const row = await getDb().settings.get('app');
    return row?.value;
  } catch (err) {
    throw new DataError('Could not load settings', err);
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await getDb().settings.put({ key: 'app', value: settings });
  } catch (err) {
    throw new DataError('Could not save settings', err);
  }
}
