# SetRepRest

Local-first personal workout tracker. React + TypeScript (strict) + Vite + Tailwind. Data lives in IndexedDB via Dexie. No backend, no auth.

## Quick commands

```bash
npm install          # install dependencies
npm run dev          # dev server (http://localhost:5173)
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright end-to-end tests (requires: npx playwright install chromium)
npm run typecheck    # tsc --noEmit
npm run build        # production build to dist/
npm run preview      # serve production build locally
```

## Layout

```
docs/               Product spec, architecture, data model, UI/UX, plans, deployment
public/             Static assets (icons, favicon)
src/
  domain/           Typed domain models + pure business logic (no React, no Dexie)
  data/             Dexie database, migrations, repositories, backup/CSV export
  state/            React context + hooks bridging domain/data to UI
  components/       Reusable UI components
  pages/            Screen-level components (routing targets)
  test/             Test setup and helpers
```

## Rules

- Business logic is pure functions in `src/domain/`. UI never touches Dexie directly; persistence goes through `src/data/` repositories and `src/state/` hooks.
- Strict TypeScript. No `any`, no non-null assertions on data boundaries.
- Substituted exercises keep their own history — never map weights between different exercises.
- Sessions are immutable once completed. Templates never mutate historical sessions.
- All destructive actions (delete session, reset data, restore backup) require confirmation.
- Deployment target is GitHub Pages under a repository subpath (`/setreprest/`). `vite.config.ts` sets `base` from `VITE_BASE_PATH` with `/setreprest/` default; CI overrides it only if needed.

## Testing

- Unit (Vitest): domain calculations (1RM, volume, PRs), backup validation, CSV export, defaults.
- Component (Vitest + React Testing Library): set entry, workout controls, library flows.
- E2E (Playwright): start → log → finish → history; refresh recovery; backup round-trip; offline load.
- `docs/TEST_PLAN.md` records genuine pass/fail results only. Never mark unexecuted tests as passed.
