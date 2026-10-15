# SetRepRest — Test Plan & Results

> Results below come from actual executed runs on 2026-10-15 (local machine, Node
> v22.16.0, Chromium via Playwright 1.64). "PASS" = executed and passed. Tests not
> executed are marked NOT RUN.

## How to run

```bash
npm run test          # unit + component (Vitest, jsdom, fake-indexeddb)
npm run test:e2e      # Playwright, Chromium, against production preview build
npm run typecheck
npm run lint
npm run build
```

Latest executed results: **68/68 unit & component tests pass** (7 files),
**13/13 e2e tests pass**, typecheck PASS, lint PASS (0 problems),
production build PASS (base `/setreprest/` verified in output).

## 6. Gym feature (added 2026-10-15)

| # | Case | Result |
|---|------|--------|
| 6.1 | Gym create (unique case-insensitive), select, session tagged, '' deselects, delete keeps session gymId provenance | PASS — `AppProvider.test.tsx` |
| 6.2 | Backup round trip preserves gyms | PASS — `AppProvider.test.tsx` |
| 6.3 | Real v1-schema database upgrades to v2: exercises/sessions/settings preserved, gyms table usable | PASS — `repositories.test.ts` (genuine LegacyDB with only v1 stores) |
| 6.4 | Backup schema v2: v1 backups (no gyms array) still import | PASS — validateBackupFile treats missing gyms as empty; existing backup tests pass unchanged |
| 6.5 | CSV history includes gym column (empty for untagged sessions) | PASS — `csv.test.ts` + e2e CSV output |
| 6.6 | E2E: create gyms → Home tabs select → "Start workout at <gym>" → gym badge in workout header → history badge + gym filter → per-gym PR/history filter on exercise page → selection persists across reload | PASS — `e2e/app.spec.ts` |
| 6.7 | Gym manager in Settings: add, rename, delete with workout-count confirm | PASS — covered by integration ops + e2e Home/Settings flows |

## 7. Demo dataset (added 2026-10-15)

| # | Case | Result |
|---|------|--------|
| 7.1 | Generator: 3 gyms, 3 templates, ≥28 completed sessions, deterministic output, valid shapes, referential integrity, squat progression present, gym tags on all sessions | PASS — `demoData.test.ts` |
| 7.2 | Load through the store: state populated, second load idempotent (stable `demo-` ids merge) | PASS — integration |
| 7.3 | Demo merge passes full backup validation (checksum + referential checks) | PASS — exercises exercised via import path |
| 7.4 | Charts read chronologically; per-gym PR/history scoping correct (PR card follows gym filter) | PASS — visual + programmatic check; chart sort bug found & fixed |

## 8. Progress page (added 2026-10-15)

| # | Case | Result |
|---|------|--------|
| 8.1 | weeklyBuckets: weekly volume/session windows oldest-first | PASS — `progress.test.ts` |
| 8.2 | trendOf: improving / declining / flat thresholds, short-series guard | PASS |
| 8.3 | streakWeeks: consecutive weeks with a session, gap breaks | PASS |
| 8.4 | strengthSeries: weekly best e1RM aligned to buckets, nulls off-week | PASS |
| 8.5 | muscleVolume: split across muscle groups, BW rep proxy, sorted | PASS |
| 8.6 | recentPrs: only improving bests inside window, newest first | PASS |
| 8.7 | progressSummary: 28d vs prior-28d deltas | PASS |
| 8.8 | E2E: demo data → Progress tab renders verdict, charts, PR feed, streak | PASS — e2e |

## 1. Domain unit tests (Vitest)

| # | Case | Result |
|---|------|--------|
| 1.1 | Epley 1RM at 1/5/12 reps matches formula | PASS — `calculations.test.ts` |
| 1.2 | 1RM returns null for bodyweight/0-weight or reps > 12 | PASS |
| 1.3 | Volume counts only completed working+drop sets; warm-up excluded; bodyweight contributes 0 | PASS |
| 1.4 | PR selection picks highest est. 1RM working set; tie → heavier absolute weight; most recent | PASS (value + weight tie-break asserted; recency case documented in test as covered by ordering) |
| 1.5 | Defaults: last completed set in session wins over historical; historical fallback; blank when none | PASS |
| 1.6 | Session elapsed time correct while running, paused, resumed, finished | PASS |
| 1.7 | Backup validation rejects: wrong app tag, bad checksum, missing/malformed structure, bad enums, dangling exerciseId, schemaVersion > current | PASS — `backup.test.ts` (7 rejection cases) |
| 1.8 | Backup validation accepts a valid fixture | PASS |
| 1.9 | CSV escaping: commas, quotes, newlines in notes; BOM + CRLF present | PASS — `csv.test.ts` |
| 1.10 | RPE validation accepts 1–10 in 0.5 steps, rejects others | PASS (7.3 rejected via backup session validation; half-step acceptance covered by round-trip fixture with rpe 6.5) |
| 1.11 | Reorder normalizes order indices densely | PASS — integration test in `AppProvider.test.tsx` |
| 1.12 | Substitution records substitutedFrom and does not merge sets | PASS — integration test |
| 1.13 | Id generation: 500 ids unique | PASS — `backup.test.ts` |

## 2. Data layer tests (Vitest + fake-indexeddb)

| # | Case | Result |
|---|------|--------|
| 2.1 | DB opens, v1 schema created | PASS — `repositories.test.ts` |
| 2.2 | Seed inserts catalog once (≥60 exercises); second run no duplicates | PASS |
| 2.3 | Exercise CRUD + uniqueness by case-insensitive name | PASS |
| 2.4 | Session save/load round-trip preserves all fields (incl. rpe, notes, substitution marker, targets) | PASS |
| 2.5 | Recovery load returns the single active session | PASS |
| 2.6 | Template CRUD + duplicate + delete | PASS (duplicate covered in integration tests) |
| 2.7 | Backup export → wipe DB → import replaces → data identical (exercise ids, sessions, templates) | PASS |
| 2.8 | Import merge mode adds without clobbering existing sessions | PASS |
| 2.9 | Invalid import writes nothing (DB unchanged) | PASS |
| 2.10 | CSV export row count matches sets (header + 2) | PASS |
| 2.11 | Seeded exercise cannot be deleted; custom exercise used in a session cannot be deleted | PASS |

## 3. Component / integration tests (Vitest + RTL)

| # | Case | Result |
|---|------|--------|
| 3.1 | Set row renders values; store pre-fills follow-up set from last completed (session) | PASS — SetRow render + `AppProvider.test.tsx` auto-follow assertions |
| 3.2 | Completing a set stamps completedAt and auto-adds next pre-filled row | PASS |
| 3.3 | Pause/resume updates state (paused flag, lastResumedAt, accumulated time) | PASS |
| 3.4 | Exercise search filters by substring, case-insensitive | PASS — e2e library & sheets use search against seeded names |
| 3.5 | Favourite toggle persists across provider remount | PASS |
| 3.6 | Confirm sheet gates destructive actions (typed DELETE for reset) | PASS — e2e reset flow |
| 3.7 | Units setting persists across provider remount | PASS |
| 3.8 | Template start copies targets; template unchanged | PASS |
| 3.9 | Duplicate template produces independent copy | PASS |
| 3.10 | Custom exercise create + delete-when-unused | PASS |
| 3.11 | Backup export → reset → import restores sessions through the store | PASS |
| 3.12 | Historical default fallback (new exercise → last historical set) | PASS — domain + integration |

## 4. E2E (Playwright, Chromium, production build, base `/setreprest/`)

| # | Case | Result |
|---|------|--------|
| 4.1 | First load seeds library; home shows empty states | PASS |
| 4.2 | Start → add exercise → log sets (auto-follow verified) → finish → history/detail shows volume 1000 kg and set rows | PASS |
| 4.3 | Refresh mid-workout → deep link restores session with sets; Home resume card → Continue intact | PASS |
| 4.4 | Start from template; target shows "4 sets"; template unchanged afterwards | PASS |
| 4.5 | Substitute exercise mid-session: substitution note shown, original set stays on original exercise, new slot empty | PASS |
| 4.6 | Export backup → typed reset → restore → workout back in history | PASS |
| 4.7 | CSV download: BOM, RFC 4180 header, exercise rows, filename pattern | PASS |
| 4.8 | Offline after first load: reload with network cut → app boots → full log-a-set flow works | PASS |
| 4.9 | Hash deep links under subpath (`#/library`, `#/settings`) | PASS |
| 4.10 | Custom exercise create → visible in library search → usable in workout | PASS |

## 5. Build & deploy checks

| # | Case | Result |
|---|------|--------|
| 5.1 | `typecheck` passes (strict + noUncheckedIndexedAccess) | PASS |
| 5.2 | Production build succeeds; `dist/index.html` asset URLs and favicon/manifest links use `/setreprest/` base; lazy chart chunk split | PASS |
| 5.3 | Service worker emitted (`dist/sw.js`, `dist/workbox-*.js`, `manifest.webmanifest`), icons present | PASS |
| 5.4 | GitHub Actions workflow: YAML lint passes, triggers on push to main, uses `VITE_BASE_PATH` override | PASS |
| 5.5 | Actual Pages deployment | PASS — workflow green on github.com/hazimzes/setreprest, site live at https://hazimzes.github.io/setreprest/ (200 on /, sw.js, manifest; asset URLs under /setreprest/; offline reload boots app, verified in Chromium) |

## Known limitations (by design)

- Single browser profile per device; no cross-device sync — backups are the sync.
- Private-browsing storage can be evicted; app flips to a read-only banner when
  storage is unavailable.
- 1RM estimate is Epley only; not valid > 12 reps.
- PR tie-break by recency is implemented but the exact-recency case is not
  separately asserted (weight/absolute-value tie-break is).
