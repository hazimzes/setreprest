# SetRepRest — UI/UX Design

## Design language

- **Feel:** premium, minimal, calm. Dark-first ("graphite" theme) with a light theme.
  Charcoal surfaces (`#111418` range), off-white text, one accent (lime `#c8f169`
  family) used strictly for progress, completion, and primary actions.
- **Type:** system UI stack; one size scale; tabular numerals for weights/reps.
- **Shape:** 12–16 px radii, hairline borders (`1px` at 8–12% white), no drop-shadow
  clutter; depth via surface steps, not blur.
- **No dashboard aesthetic:** home screen is an action sheet ("Start workout"),
  not a tile grid. Stats appear contextually (post-workout summary, exercise page),
  never as vanity cards.

## Layout

Mobile-first single column, max-width 480 px content column on larger screens with
a persistent bottom tab bar (mobile) / top nav (desktop ≥ 768 px):

Tabs: Home · History · Library · Templates · Settings.

## Key screens

### Home
- If an active session exists: prominent resume card (elapsed timer, exercises done
  count, Continue / Discard).
- Else: big "Start empty workout" button + template quick-start list (favourites
  first, horizontal scroll chips).
- Below: "Last workout" summary card (date, duration, volume, sets) and 4-week
  mini streak bar. Deliberately sparse.

### Active workout (/workout)
- Sticky header: session name (tap to rename), elapsed time, pause/resume, finish.
- Exercise cards, collapsed → expanded. Expanded card shows set rows:
  `[type]  weight input · reps input · ✓ | RPE chip | ⋯ (notes, delete)`.
- Inputs: numeric keypads, step 0.5 (weight) / 1 (reps). New row auto-added after
  completing the last; pre-filled from defaults logic. Auto-focus weight.
- Card menu: substitute, remove, reorder (drag handle; up/down buttons on desktop).
- Rest timer pill appears after completing a set: countdown ring, ±15 s, skip.
- "Add exercise" button at list end → library sheet with search/filters.
- Finish → summary modal (duration, volume, sets, PRs hit) → confirm.

### History
- Reverse-chronological list grouped by month. Row: name, date, duration, volume,
  exercise count. Tap → session detail (read-only log, per-exercise volumes,
  PRs recorded that day, delete with confirm).

### Library
- Search field, equipment + muscle-group filter chips, favourites toggle.
- Rows: name, equipment icon, muscle tags, star. Tap → detail: recent sessions,
  PR card, 1RM + volume charts (Recharts), "Add to current workout".
- FAB / header button: create custom exercise (name, equipment, muscles).

### Templates
- List with duplicate + delete. Editor: name, ordered exercises with target
  sets/reps steppers, add-from-library, reorder, save.

### Settings
- Units toggle (kg/lb), rest timer default, theme.
- Data: export JSON, import JSON (file pick → validation report → replace/merge
  confirm), export CSV, reset all (typed "DELETE" confirmation).
- "Where is my data?" panel: plain-language local-storage explanation, backup
  advice (browser clears site data, device loss), recommend monthly exports.

## Interaction details

- Touch targets ≥ 44 px; bottom-sheet menus on mobile, dropdowns on desktop.
- Optimistic UI; destructive actions confirm via bottom sheet (not `window.confirm`).
- Motion: 150–200 ms ease-out transitions only; `prefers-reduced-motion` respected.
- Accessibility: labelled inputs, `aria-live` rest timer, focus-visible rings,
  full keyboard operability, contrast ≥ 4.5:1 for text, colour never sole signal
  (completion = check icon + tint).

## Empty / loading / error states

- Every list has an illustrated-lite empty state with the next action.
- Providers expose `status: 'loading' | 'ready' | 'error'`; loading = skeletons,
  error = retry message.
- Storage-unavailable mode disables writes, shows explanation banner.
