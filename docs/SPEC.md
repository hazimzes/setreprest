# SetRepRest — Product Specification

## Product

SetRepRest is a local-first personal workout tracker for lifters who train across
different gyms with varying equipment. It runs entirely in the browser, stores all
data on-device (IndexedDB), and works offline after first load.

## Goals

1. Log a workout faster than a paper notebook — two taps per set in the common case.
2. Preserve per-exercise history so substitutions never corrupt progression data.
3. Be trustworthy: validated backups, export, and safeguards against data loss.
4. Look and feel premium: minimalist, calm, high-contrast, no dashboard clutter.

## Non-goals

- No accounts, cloud sync, or social features.
- No nutrition tracking, body measurements, or program builder.
- No native apps (PWA install covers mobile).
- No paid dependencies.

## Users

One person per device. Primary device is a phone used between sets; desktop is for
reviewing history and managing templates/library.

## Feature set

### Active session
- Start an empty session, from a template, or resume an interrupted one.
- Pause/resume with accumulated active-time tracking (paused time excluded).
- Finish (mark completed) or discard (delete after confirmation).
- Exercises: add from library, remove, reorder, substitute.
- Substitution replaces the exercise going forward and records what it replaced;
  it does NOT merge history or convert weights.
- Sets: weight, reps, type (warm-up / working / drop set), completed toggle,
  optional RPE (1–10 in 0.5 steps), optional notes.
- Fast entry: new set pre-fills weight/reps/type from the previous set of the same
  exercise in this session, else from the last historical performance.
- Rest timer auto-starts on set completion; configurable duration; skippable.
- Session survives refresh, tab close, and browser restart (IndexedDB write per set).

### Exercise library
- Seeded catalog (75 common barbell/dumbbell/machine/cable/bodyweight exercises)
  with muscle groups and equipment.
- Search by name; filter by muscle group and equipment; sort by name/recent use.
- Favourites surfaced first. Create, edit, and delete custom exercises
  (seeded exercises are immutable; they can be favourited and hidden from view).

### Templates
- Create from scratch, from a session, or duplicate an existing template.
- Edit name, exercises, target sets and reps. Reorder.
- Starting a session from a template copies the structure into the session;
  the template itself is never modified by sessions.

### Progress page (overall)
- Verdict tile: trailing 4 weeks vs prior (Improving / Declining / Holding steady)
  with volume delta % and session delta.
- Stat tiles: weekly streak, 4-week weekly-average volume, PRs this month.
- Charts: weekly volume (12 weeks), multi-line weekly best e1RM for the four most
  trained lifts, volume-by-muscle horizontal bars (28 days).
- Personal-record feed for the last 4 weeks.
- Everything respects the gym filter — per-gym verdicts are independent.

### Progress & analytics (per exercise and overall)
- Exercise detail: session history, set log, per-exercise personal records
  (heaviest working set by estimated 1RM), estimated 1RM progression chart
  (Epley: w × (1 + reps/30), reps ≤ 12 eligible), volume-per-session chart.
- Overall: sessions per week, total volume trend, recent PR list.

### Gyms
- Named training locations shown as selectable cards on Home ("Where are you training?").
- Starting a workout tags the session with the selected gym; Home stats (last workout,
  4-week streak) and History filter by gym.
- Exercise analytics (PR, e1RM and volume charts, history) filter per gym — weights are
  never merged or converted across gyms; each gym keeps independent progression.
- Manage (add/rename/delete) from Settings or Home. Deleting a gym keeps historical
  session tags for reference.

### Demo data
- Settings gate: loading the sample dataset requires the device PIN (masked 4-digit
  input; confirm stays disabled until it matches). Prevents accidental pollution of
  real training history.

### Data management
- Automatic persistence after every mutation; explicit "saved" indicator not shown
  (writes are fast and awaited in-memory first).
- Export full JSON backup (versioned, with checksum), import with schema validation
  and a merge/replace choice, both behind confirmation.
- Export workout history CSV (one row per set).
- Reset all data behind a typed confirmation.
- Plain-language explanation of local-data limitations on the Settings screen.

## Units

kg and lb supported; per-device setting; display conversion only (storage stays in
the unit captured). Weight input accepts 0.5 steps; bodyweight exercises store
weight 0 and display "BW".

## Platform

- Modern evergreen browsers (Chrome, Edge, Firefox, Safari), mobile-first layout.
- PWA: installable, service worker precaches app shell, works fully offline after
  first successful load.
- Deployed to GitHub Pages under `/setreprest/` via GitHub Actions.

## Success criteria

- Logging a working set takes ≤ 2 interactions in the common case.
- Kill the tab mid-set → reopen → session is exactly as left.
- Full offline session (log, finish, review) with zero network after first load.
- Backup export → wipe → import restores identical data (validated in tests).
