# THE VILLAGE — DEPLOYMENT

The Village builds to a folder of static files. Any static host serves it. There
is no server component; cloud accounts are an optional extra.

---

## Build

```bash
npm ci          # or npm install
npm run build   # -> dist/
```

`npm run build` runs four steps:

1. `scripts/prepare-runtime-assets.mjs` — copies the 157 assets the game loads
   at runtime into `public/assets/`, and fails if any source file is missing.
2. `vite build` — bundles `index.html`, `src/`, `styles.css` and the imported
   audio and atlases into `dist/`.
3. `scripts/validate-build.mjs` — every runtime asset present in `dist/`, one
   hashed entry bundle, no raw `/src/` reference, no root-absolute URL, no bare
   Supabase import left in the output, versions consistent across
   `package.json`, `src/config/release.js` and `index.html`.
4. `scripts/validate-content.mjs` — registry integrity (see
   [`ARCHITECTURE.md`](ARCHITECTURE.md)).

The result is about **45 MB**, most of it sprite sheets, atlases and three
music tracks.

Preview it locally:

```bash
npm run preview     # http://localhost:4173
```

---

## Paths

`vite.config.js` sets `base: './'`, so every generated reference in
`dist/index.html` is relative. The same `dist/` works from:

- a root domain — `https://example.com/`
- a path prefix — `https://user.github.io/The-Village/`
- a local static server pointed at the folder

The game's own asset paths (`assets/…`) were already document-relative.

Set `VITE_BASE` to build with an absolute prefix instead, if a host needs one.
Doing so pins the bundle to that path.

> **Do not publish the repository root.** It contains `src/`, the full 260 MB
> asset library and the documentation. Publish `dist/`.

---

## Cloud accounts (optional)

Two build-time variables enable Supabase accounts and cloud saves:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Copy `.env.example` to `.env` for local development. Both values are baked into
the bundle at build time and are safe to expose — the anon key is the
browser-side publishable key, protected by row-level security. Database setup is
in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).

**Apply every file in `supabase/migrations/` to the project, not just the
first.** The production project had 001 applied by hand and 002/003 never run,
so the Tester Feedback table did not exist and every report from the game
failed and sat in the player's local queue. The build validator checks the
migration *files*; nothing checks the *database*. After any new migration,
confirm on the project itself — the Supabase dashboard's Table Editor or
`select * from information_schema.tables where table_schema = 'public'`.

**Without them the game still runs.** Startup skips the sign-in gate and plays
in local-only mode: progress is saved to browser storage on that device and the
account panel says so. This is the intended behaviour for a public demo build.

With them configured, players sign in and progress syncs. Add the deployed
origin to the Supabase project's allowed redirect URLs, or email confirmation
and password-reset links will not return to the game.

**Free-tier projects pause.** Supabase pauses a free project after about a week
with no traffic. While paused, every request from the game fails at the
connection level and players see "The account service could not be reached."
Nothing in the deployment is wrong; restore the project from the Supabase
dashboard and the same build starts working again within a couple of minutes.
If the game will sit idle between playtest rounds, either plan to restore it
before each round or move the project to a plan that does not pause.

---

## GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes `dist/` on every push
to `main`.

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. Optionally add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository
   secrets. Without them the deployed build is local-only.
3. Push to `main`, or run the workflow manually.

The site is served from `https://<user>.github.io/<repo>/`. The relative base
handles the prefix.

**GitHub's hosting is case-sensitive; Windows and macOS are not.** A path that
works locally can 404 once deployed. `scripts/prepare-runtime-assets.mjs` fails
the build on a missing source file, which catches most of it, but if you add an
asset reference by hand, match the file name exactly — including
`With_shadow`, `PNG`, and the directories with spaces in their names such as
`assets/citizens/Blonde Kid Girl/`.

---

## Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or newer
- Environment variables: the two Supabase values, if accounts are wanted

Nothing in the project is Cloudflare-specific.

---

## Any other static host

Upload `dist/`. No redirects, rewrites or SPA fallback rules are needed — the
game is a single page with no client-side routing. Requirements:

- Serve `.js` as `text/javascript` and `.ogg` as `audio/ogg`.
- Serve `.glb` as a binary type (`model/gltf-binary` or
  `application/octet-stream`).
- Do not compress the `.ogg` files again; they are already compressed.

There is no service worker and no web app manifest. Nothing caches beyond
ordinary HTTP caching, so a redeploy reaches players on their next load. Vite
hashes the bundle filenames, so a stale `index.html` is the only cache risk —
serve it with a short max-age.

---

## Verifying a deployment

1. Open the URL. The Village loads and the version in the corner matches
   `src/config/release.js`.
2. Open the browser console. There should be no errors and no 404s.
3. Enter a battle from the campaign, place a card, and return to the Village.
4. Reload. Progress is still there.
5. On an iPad and an iPhone, check that the joystick moves Shadow, that pinch
   zoom works in battle, and that nothing sits under the home indicator.

`npm run test:production` runs an automated version of most of this against a
local preview, at desktop, iPad and iPhone viewport sizes. It needs Chrome or
Chromium:

```bash
npm run preview &
CHROME_PATH=/path/to/chrome npm run test:production
```
