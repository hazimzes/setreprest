# SetRepRest — Data Model

TypeScript types in `src/domain/models.ts`. Stored in IndexedDB as plain JSON-safe
objects (Dexie serializes structurally — no class instances, no Maps, no Dates; time
is epoch milliseconds numbers).

## Exercise

```ts
interface Exercise {
  id: string;                 // uuid v4
  name: string;               // unique, case-insensitive
  muscleGroups: MuscleGroup[]; // 1..n
  equipment: Equipment;        // enum
  category: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'other';
  isCustom: boolean;           // seeded = false, immutable; user-created = true
  isFavourite: boolean;
  notes?: string;
  createdAt: number;           // epoch ms
}
```

`MuscleGroup` = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' |
'hamstrings' | 'glutes' | 'calves' | 'core' | 'forearms' | 'neck' | 'full body'.

`Equipment` = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' |
'kettlebell' | 'band' | 'other'.

Deleting a custom exercise referenced by sessions is blocked with an explanation;
offer is "hide instead" (seeded exercises cannot be deleted).

## SetEntry

```ts
type SetType = 'warmup' | 'working' | 'drop';

interface SetEntry {
  id: string;
  type: SetType;
  weight: number;      // kg or lb per device setting; 0 = bodyweight
  reps: number;        // ≥ 0
  completed: boolean;  // planned vs done
  rpe?: number;        // 1–10, 0.5 steps
  notes?: string;
  completedAt?: number; // epoch ms, set when first marked completed
}
```

## SessionExercise

```ts
interface SessionExercise {
  id: string;
  exerciseId: string;          // reference into exercises table
  order: number;               // 0-based, dense
  sets: SetEntry[];            // ordered
  substitutedFromExerciseId?: string; // set when substituted; chain preserved
  targetSets?: number;         // from template
  targetReps?: number;
}
```

## Session

```ts
type SessionStatus = 'active' | 'completed' | 'discarded';

interface Session {
  id: string;
  name: string;                // default "Workout — <date>", editable
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  accumulatedActiveMs: number; // active time accrued before current resume
  lastResumedAt?: number;      // undefined while paused/finished
  paused: boolean;
  exercises: SessionExercise[];
  notes?: string;
  templateId?: string;         // provenance only
}
```

Elapsed active time = `accumulatedActiveMs + (paused || endedAt ? 0 : now − lastResumedAt)`.
Only `active` sessions exist at most once; finishing sets status `completed` and
`endedAt`. `discarded` sessions are deleted, not kept.

## Template

```ts
interface TemplateExercise {
  exerciseId: string;
  order: number;
  targetSets: number;   // default 3
  targetReps?: number;  // optional
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}
```

## Settings (singleton row, key 'app')

```ts
interface AppSettings {
  units: 'kg' | 'lb';
  defaultRestSec: number;   // 90
  restTimerEnabled: boolean;
  seededVersion: number;    // exercise catalog seed version
}
```

## Derived values (pure functions in `src/domain/`)

- **Estimated 1RM** (Epley): `weight × (1 + reps / 30)`, valid reps 1–12; bodyweight
  sets excluded. Rounded to 1 decimal in display unit.
- **Set volume**: `weight × reps` (working + drop sets; bodyweight counts 0).
- **Session volume**: sum over completed sets.
- **PR**: per exercise, the completed working set with highest estimated 1RM;
  ties broken by heavier absolute weight, then by date.
- **Defaults for next set**: last completed set in this session exercise, else last
  completed working set for the same exerciseId historically, else blank.

## Backup format

```ts
interface BackupFile {
  app: 'setreprest';
  schemaVersion: number;   // 2 = current (v1 backups without gyms still import)
  exportedAt: number;
  checksum: string;        // SHA-256 of canonical JSON of the data object
  data: {
    gyms: Gym[];
    exercises: Exercise[];
    sessions: Session[];
    templates: Template[];
    settings: AppSettings | null;
  };
}
```

Validation checks `app`, `schemaVersion ≤ current`, array shapes, required fields,
enum values, referential integrity (session/template exerciseIds exist), and
checksum equality. On failure: reject with a specific message, write nothing.
Gyms are validated structurally but session `gymId`s are NOT required to reference
an existing gym (a deleted gym leaves historical tags in place, displayed unnamed).
v1 backups (schemaVersion 1, no gyms array) import cleanly with zero gyms.

## CSV export

One row per set: `date, session_name, gym, exercise, set_type, weight, unit, reps, rpe, completed, notes`.
UTF-8 BOM, RFC 4180 quoting, CRLF line endings.

## Seed catalog

~75 exercises covering the main movement patterns per equipment type, inserted on
first run (`seededVersion` gate), idempotent across versions.
