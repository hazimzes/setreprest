# SetRepRest — Deployment (GitHub Pages)

The app builds to fully static files and is hosted on GitHub Pages under the
repository subpath `/setreprest/`. No server, no env vars, no secrets.

## Repository setup (one-time, you do this)

1. Create a GitHub repository named exactly `setreprest` (the path is baked into
   the build base). Public repo → Pages is free.
2. Push this project:

   ```bash
   cd setreprest
   git init
   git add -A
   git commit -m "Initial release"
   git remote add origin https://github.com/<your-username>/setreprest.git
   git push -u origin main
   ```

3. Enable Pages with Actions as the source:
   Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The included workflow `.github/workflows/deploy.yml` then runs on every push to
`main`: install → build (`base=/setreprest/`) → deploy `dist/` to Pages.

After the first successful run the app is live at
`https://<your-username>.github.io/setreprest/`.

## How subpath correctness is guaranteed

- `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/setreprest/'` — all asset
  URLs, the manifest `start_url`/`scope`, and the service worker registration
  inherit it. Local dev uses `/` automatically (Vite ignores base for the dev server root).
- Routing is `HashRouter`, so deep links like `#/history/abc` survive static
  hosting without server rewrites.
- `vite-plugin-pwa` receives the same base; `navigateFallback` serves the cached
  shell offline at any hash route.

To deploy under a different repo name: set the `VITE_BASE_PATH` repository variable
(Settings → Secrets and variables → Actions → Variables, e.g. `/other-name/`) — the
workflow passes it to the build. For a user site (`<user>.github.io` repo), set it to `/`.

## Verifying deployment

1. Actions tab → deploy workflow green.
2. Open the live URL — app loads, devtools → Application → Service Workers shows
   `sw.js` activated.
3. Hard-reload once, then go offline (devtools Network → Offline) and reload —
   app still boots. Only then is it "deployed and offline-capable".

## Rollback

Pages → Deploys → roll back to a previous deployment, or revert the commit and push.
