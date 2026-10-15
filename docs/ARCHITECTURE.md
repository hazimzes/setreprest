# SetRepRest — Architecture

## Overview

Single-page React application. Three clean layers with one-way dependencies:

```
pages / components  (UI)
        │ uses
state/  (React context + hooks: session machine, library, templates, settings)
        │ calls
domain/ (pure functions: models, calculations, validation, defaults)
data/   (Dexie repositories, migrations, backup/CSV serialization)
```

- `domain/` imports nothing. Pure TypeScript, fully unit-testable.
- `data/` imports domain types only. Owns Dexie, schema versions, and serialization.
- `state/` wires domain logic to repositories and exposes hooks. Owns async
  orchestration and optimistic in-memory state.
- UI imports state hooks and domain types. Never imports Dexie or repositories.

## Routing

`react-router-dom` with a `HashRouter` — GitHub Pages serves static files only and
a `BrowserRouter` deep link would 404. Hash routing removes the need for a 404.html
rewrite while keeping shareable, reload-safe URLs under the repo subpath.

Routes: `/` (home), `/workout` (active session), `/history`, `/history/:id`,
`/library`, `/library/:id`, `/templates`, `/templates/:id`, `/settings`.

## State model

- `SettingsProvider` — units, rest timer default, seeded flag. Loaded once.
- `LibraryProvider` — exercises in memory, CRUD through repository; custom
  exercises and favourites mutate IndexedDB immediately.
- `SessionProvider` — the active session (status `active`), mirrored to IndexedDB
  on every mutation via a debounced (50 ms) writer plus immediate write on
  structural changes. On boot, an `active` session in the DB triggers the
  recovery flow (banner + resume/discard prompt on Home).
- Completed sessions are written once on finish and then immutable.

## Persistence

Dexie v4 over IndexedDB. Single database `setreprest`, tables:

| Table        | Primary key | Notes                                  |
|--------------|-------------|----------------------------------------|
| exercises    | id (uuid)   | includes seeded catalog (isCustom: false) |
| sessions     | id          | one row per session, embedded exercises/sets |
| templates    | id          | embedded exercise list                 |
| settings     | key         | key/value singleton                    |

Schema versions in `src/data/db.ts` via `db.version(n).stores(...).upgrade(...)`.
v1 is the initial schema; future migrations append new versions, never edit old ones.

Sessions embed their exercise and set arrays (aggregate-per-row). Rationale: a
session is always loaded/written as a whole, sets are never queried independently,
and embedding removes join complexity. Backup/restore is table-level JSON.

## PWA / offline

`vite-plugin-pwa` (`generateSW`):
- Precache: all hashed build assets + `index.html`.
- `navigateFallback` to `index.html` so the app shell loads offline.
- No runtime caching of external origins (app has no external calls; fonts are
  system stacks).
- Update flow: SW registration with `registerType: 'prompt'` → in-app toast offers
  reload when a new version is waiting.

## Error handling

- Repository calls throw typed `DataError`s; providers surface a global error
  boundary with retry, and destructive flows confirm before mutating.
- IndexedDB unavailable (private mode in some browsers) → app renders in
  read-only "storage unavailable" state explaining the limitation.
- Backup import validates fully before any write; failure aborts with no partial state.

## Testing layers

- `domain/` — Vitest unit tests (calculations, validation, defaults).
- `data/` — Vitest against `fake-indexeddb` (CRUD, migration v1, backup round-trip).
- `components/` — Vitest + React Testing Library with providers stubbed.
- `e2e/` — Playwright Chromium against `vite preview` build: full workflows,
  refresh recovery, offline via `context.setOffline(true)`.

## Build & deploy

Vite with `base` = `import.meta.env.VITE_BASE_PATH` fallback `/setreprest/`.
GitHub Actions workflow builds and deploys `dist/` to Pages on push to `main`.
Service worker scope and asset URLs derive from `base`, so subpath hosting works
with zero runtime configuration.
