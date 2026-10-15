# SetRepRest — Implementation Plan

Executed top-down; each phase compiles before the next.

## Phase 1 — Scaffold
Vite + React + TS strict project files: `package.json`, `tsconfig`, `vite.config.ts`
(base path, PWA plugin), Tailwind, ESLint, Vitest config, Playwright config,
`.gitignore`, GitHub Actions workflow. `npm install`.

## Phase 2 — Domain
`src/domain/`: models, enums, id util, calculations (1RM, volume, PRs, defaults),
validation, backup schema + checksum, CSV serialization, seed catalog.
Unit tests for every pure function edge case.

## Phase 3 — Data
`src/data/`: Dexie instance + v1 schema, seed runner, repositories (exercises,
sessions, templates, settings), backup export/import, CSV export.
Tests with `fake-indexeddb`: CRUD, seed idempotency, backup round-trip,
import validation failures.

## Phase 4 — State + app shell
Providers (settings, library, session, templates), boot sequence (open DB → seed →
load → recover active session), HashRouter routes, error boundary, storage-
unavailable banner, theme, PWA registration + update toast.

## Phase 5 — Screens
Home, active workout (set entry, timers, exercise menu: add/substitute/reorder/
remove), history + detail, library + detail (charts), templates + editor, settings
(data tools). Reusable primitives: Button, Input, Sheet, ConfirmSheet, Chip,
EmptyState, Skeleton, StatRow, charts.

## Phase 6 — PWA + polish
Icons (SVG → PNG maskable), manifest, offline verify, theme meta, transitions,
a11y pass (labels, focus, aria-live), keyboard flows.

## Phase 7 — E2E + verification
Playwright: start/log/finish/history, refresh recovery, template flow,
backup round-trip, offline load. `npm run typecheck`, `npm run test`,
`npm run build`, preview smoke. Fix everything found. Record genuine results in
`docs/TEST_PLAN.md`.

## Phase 8 — Repo + deploy
`git init`, commit, GitHub Actions Pages workflow, README with exact publish steps.
Deployment itself requires the user to create the GitHub repo and enable Pages —
documented, not claimed.
