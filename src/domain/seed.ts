import { createId } from './id';
import type { Equipment, Exercise, MuscleGroup } from './models';

/** Current catalog version. Bump + append entries to upgrade existing installs. */
export const SEED_VERSION = 1;

interface SeedDef {
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment;
}

const CATALOG: SeedDef[] = [
  // Barbell
  { name: 'Barbell Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'barbell' },
  { name: 'Barbell Squat', muscleGroups: ['quads', 'glutes'], equipment: 'barbell' },
  { name: 'Deadlift', muscleGroups: ['back', 'hamstrings'], equipment: 'barbell' },
  { name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'barbell' },
  { name: 'Barbell Row', muscleGroups: ['back', 'biceps'], equipment: 'barbell' },
  { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'barbell' },
  { name: 'Front Squat', muscleGroups: ['quads', 'core'], equipment: 'barbell' },
  { name: 'Close-Grip Bench Press', muscleGroups: ['triceps', 'chest'], equipment: 'barbell' },
  { name: 'Incline Bench Press', muscleGroups: ['chest', 'shoulders'], equipment: 'barbell' },
  { name: 'Barbell Curl', muscleGroups: ['biceps'], equipment: 'barbell' },
  { name: 'Hip Thrust', muscleGroups: ['glutes', 'hamstrings'], equipment: 'barbell' },
  { name: 'Barbell Lunge', muscleGroups: ['quads', 'glutes'], equipment: 'barbell' },
  { name: 'Push Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'barbell' },
  { name: 'Power Clean', muscleGroups: ['full body'], equipment: 'barbell' },
  { name: 'Barbell Shrug', muscleGroups: ['back'], equipment: 'barbell' },
  { name: 'Sumo Deadlift', muscleGroups: ['glutes', 'hamstrings'], equipment: 'barbell' },
  { name: 'Pendlay Row', muscleGroups: ['back'], equipment: 'barbell' },
  { name: 'Barbell Skullcrusher', muscleGroups: ['triceps'], equipment: 'barbell' },
  // Dumbbell
  { name: 'Dumbbell Bench Press', muscleGroups: ['chest', 'triceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Row', muscleGroups: ['back', 'biceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Shoulder Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Curl', muscleGroups: ['biceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Lateral Raise', muscleGroups: ['shoulders'], equipment: 'dumbbell' },
  { name: 'Dumbbell Front Raise', muscleGroups: ['shoulders'], equipment: 'dumbbell' },
  { name: 'Dumbbell Goblet Squat', muscleGroups: ['quads', 'glutes'], equipment: 'dumbbell' },
  { name: 'Dumbbell Lunge', muscleGroups: ['quads', 'glutes'], equipment: 'dumbbell' },
  { name: 'Dumbbell Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'], equipment: 'dumbbell' },
  { name: 'Dumbbell Hammer Curl', muscleGroups: ['biceps', 'forearms'], equipment: 'dumbbell' },
  { name: 'Dumbbell Kickback', muscleGroups: ['triceps'], equipment: 'dumbbell' },
  { name: 'Dumbbell Fly', muscleGroups: ['chest'], equipment: 'dumbbell' },
  { name: 'Dumbbell Step-Up', muscleGroups: ['quads', 'glutes'], equipment: 'dumbbell' },
  { name: 'Dumbbell Shrug', muscleGroups: ['back'], equipment: 'dumbbell' },
  { name: 'Dumbbell Pullover', muscleGroups: ['chest', 'back'], equipment: 'dumbbell' },
  // Machine
  { name: 'Leg Press', muscleGroups: ['quads', 'glutes'], equipment: 'machine' },
  { name: 'Leg Extension', muscleGroups: ['quads'], equipment: 'machine' },
  { name: 'Leg Curl', muscleGroups: ['hamstrings'], equipment: 'machine' },
  { name: 'Chest Press Machine', muscleGroups: ['chest', 'triceps'], equipment: 'machine' },
  { name: 'Lat Pulldown Machine', muscleGroups: ['back', 'biceps'], equipment: 'machine' },
  { name: 'Seated Row Machine', muscleGroups: ['back', 'biceps'], equipment: 'machine' },
  { name: 'Shoulder Press Machine', muscleGroups: ['shoulders', 'triceps'], equipment: 'machine' },
  { name: 'Calf Raise Machine', muscleGroups: ['calves'], equipment: 'machine' },
  { name: 'Hip Abduction Machine', muscleGroups: ['glutes'], equipment: 'machine' },
  { name: 'Pec Deck', muscleGroups: ['chest'], equipment: 'machine' },
  { name: 'Smith Machine Squat', muscleGroups: ['quads', 'glutes'], equipment: 'machine' },
  { name: 'Preacher Curl Machine', muscleGroups: ['biceps'], equipment: 'machine' },
  // Cable
  { name: 'Cable Tricep Pushdown', muscleGroups: ['triceps'], equipment: 'cable' },
  { name: 'Cable Curl', muscleGroups: ['biceps'], equipment: 'cable' },
  { name: 'Cable Row', muscleGroups: ['back', 'biceps'], equipment: 'cable' },
  { name: 'Cable Lat Pulldown', muscleGroups: ['back', 'biceps'], equipment: 'cable' },
  { name: 'Cable Face Pull', muscleGroups: ['shoulders', 'back'], equipment: 'cable' },
  { name: 'Cable Lateral Raise', muscleGroups: ['shoulders'], equipment: 'cable' },
  { name: 'Cable Crossover', muscleGroups: ['chest'], equipment: 'cable' },
  { name: 'Cable Fly', muscleGroups: ['chest'], equipment: 'cable' },
  { name: 'Cable Woodchopper', muscleGroups: ['core'], equipment: 'cable' },
  // Bodyweight
  { name: 'Push-Up', muscleGroups: ['chest', 'triceps'], equipment: 'bodyweight' },
  { name: 'Pull-Up', muscleGroups: ['back', 'biceps'], equipment: 'bodyweight' },
  { name: 'Chin-Up', muscleGroups: ['back', 'biceps'], equipment: 'bodyweight' },
  { name: 'Dip', muscleGroups: ['triceps', 'chest'], equipment: 'bodyweight' },
  { name: 'Bodyweight Squat', muscleGroups: ['quads', 'glutes'], equipment: 'bodyweight' },
  { name: 'Lunge', muscleGroups: ['quads', 'glutes'], equipment: 'bodyweight' },
  { name: 'Plank', muscleGroups: ['core'], equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroups: ['core'], equipment: 'bodyweight' },
  { name: 'Glute Bridge', muscleGroups: ['glutes'], equipment: 'bodyweight' },
  { name: 'Calf Raise', muscleGroups: ['calves'], equipment: 'bodyweight' },
  { name: 'Inverted Row', muscleGroups: ['back', 'biceps'], equipment: 'bodyweight' },
  { name: 'Pistol Squat', muscleGroups: ['quads', 'glutes'], equipment: 'bodyweight' },
  { name: 'Handstand Push-Up', muscleGroups: ['shoulders', 'triceps'], equipment: 'bodyweight' },
  // Kettlebell
  { name: 'Kettlebell Swing', muscleGroups: ['hamstrings', 'glutes', 'core'], equipment: 'kettlebell' },
  { name: 'Kettlebell Goblet Squat', muscleGroups: ['quads', 'glutes'], equipment: 'kettlebell' },
  { name: 'Kettlebell Press', muscleGroups: ['shoulders', 'triceps'], equipment: 'kettlebell' },
  { name: 'Turkish Get-Up', muscleGroups: ['full body'], equipment: 'kettlebell' },
  // Band
  { name: 'Band Pull-Apart', muscleGroups: ['shoulders', 'back'], equipment: 'band' },
  { name: 'Band Row', muscleGroups: ['back', 'biceps'], equipment: 'band' },
  { name: 'Band Curl', muscleGroups: ['biceps'], equipment: 'band' },
  { name: 'Band Pushdown', muscleGroups: ['triceps'], equipment: 'band' },
];

export function buildSeedExercises(now: number): Exercise[] {
  return CATALOG.map((def) => ({
    id: createId(),
    name: def.name,
    muscleGroups: [...def.muscleGroups],
    equipment: def.equipment,
    isCustom: false,
    isFavourite: false,
    createdAt: now,
  }));
}
