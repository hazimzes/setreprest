# SetRepRest

Local-first personal workout tracker. Log sets fast, keep per-exercise history clean,
track PRs and progression — entirely offline, entirely on your device.

![stack](https://img.shields.io/badge/React_19-TypeScript_strict-3178c6)
![pwa](https://img.shields.io/badge/PWA-offline--ready-5A0FC8)

## Features

- **Fast session logging** — add exercises from a seeded 75-exercise library (or your
  own), log weight/reps/type/RPE/notes per set. Completing the last set auto-adds a
  pre-filled follow-up and starts the rest timer.
- **Interrupt anything** — pause/resume, close the tab, reboot; the active session is
  in IndexedDB and comes back exactly as left.
- **Honest substitutions** — substituting an exercise keeps logged sets attributed to
  the original exercise; the substitute starts a fresh history. Weights are never
  silently translated between exercises.
- **Templates** — reusable workout structures; starting from one copies targets into
  the session without touching the template.
- **Progress analytics** — per-exercise PR (Epley e1RM), 1RM progression and volume
  charts, session history, all computed locally.
- **Data ownership** — one-click validated JSON backup (checksummed), merge/replace
  restore, CSV exports, typed reset confirmation. No account, no server.

## Stack

React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Vite · Tailwind CSS v4 ·
Dexie (IndexedDB) · Recharts · Vitest + React Testing Library + Playwright ·
vite-plugin-pwa · GitHub Actions → GitHub Pages.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # unit + component tests
npm run test:e2e     # Playwright (needs: npx playwright install chromium)
npm run typecheck
npm run lint
npm run build        # production build to dist/
```

## Deploy to GitHub Pages

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Short version: create a repo named
`setreprest`, push to `main`, enable Pages with **Source: GitHub Actions**. The
included workflow builds with `base=/setreprest/` and deploys. Live at
`https://<user>.github.io/setreprest/`.

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/SPEC.md](docs/SPEC.md) | Product spec, goals, feature set |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, state model, PWA, error handling |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Types, derived values, backup/CSV formats |
| [docs/UI_UX.md](docs/UI_UX.md) | Design language, screens, a11y |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Test matrix with executed results |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Build phases |
| [CLAUDE.md](CLAUDE.md) | Repo conventions for coding agents |

## Limitations (by design)

- Data lives per browser profile. Clearing site data or losing the device loses
  history — backups are the transport between devices.
- Estimated 1RM is Epley only, valid for 1–12 rep working sets.
- Private-browsing storage can be evicted; the app shows a read-only banner when
  storage is unavailable.
