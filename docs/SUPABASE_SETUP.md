# The Village Supabase setup

## Vite client configuration

Vite is the supported development and production runtime. The application
imports `createClient` from `@supabase/supabase-js` in
`src/online/supabaseClient.js`; it does not load Supabase from a CDN or browser
global.

Copy `.env.example` to `.env` and provide:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

Only the browser-safe publishable/anon key belongs in the client. Never add a
secret key, `service_role` key, database password, or JWT signing secret.
`.env` is ignored by Git. Vite embeds `VITE_*` values into the browser bundle,
so security is enforced by authentication and Row Level Security rather than
by treating the publishable key as a secret.

## Apply the database migration

1. Open the Supabase project.
2. Open **SQL Editor** and create a query.
3. Paste all of `supabase/migrations/001_auth_and_cloud_saves.sql`.
4. Run the query once.
5. Confirm `profiles` and `player_saves` exist.
6. Confirm RLS is enabled and only the authenticated own-row policies exist.
7. Do not add public read/write policies and do not disable RLS.

The migration is unchanged for V35.1. Existing cloud rows must not be reset.

## Authentication redirects

In **Authentication → URL Configuration**:

- Set the local Site URL to `http://localhost:5173` while developing.
- Add `http://localhost:5173/**` to the redirect allow list.
- Add the preview address, normally `http://localhost:4173/**`, when testing
  password recovery against `npm run preview`.
- Add the final HTTPS Cloudflare Pages production URL and its `/**` pattern
  before deployment.
- If Cloudflare preview deployments will handle authentication callbacks, add
  only the specific trusted preview patterns required by the project.

Registration confirmation and password recovery use the current application
origin and pathname. No deployment domain is hard-coded into application code.
The root application route handles the callback query/hash and Supabase session
restoration.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Live Server and `127.0.0.1:5500` are no longer
supported launch paths.

Build and preview production output:

```bash
npm run build
npm run preview
```

Vite writes deployable files to `dist/`. Configure Cloudflare Pages to run
`npm run build`, publish `dist`, and provide both `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as build environment variables.

Cloudflare Pages production settings must be:

- Root directory: the repository root (leave blank unless this project is in a
  monorepo)
- Build command: `npm run build`
- Build output directory: `dist`

Do not set the output directory to `/`, `.`, the repository name, or `src`.
The repository `index.html` is Vite's source template and legitimately loads
`/src/main.js` during development. Only `dist/index.html` is deployable; it
loads a hashed entry such as `/assets/index-XXXXXXXX.js`.

After deployment, view the production page source and confirm that it contains
an `/assets/index-*.js` module script and no `/src/` script. A browser error
for the bare module specifier `@supabase/supabase-js` proves that Cloudflare
published the source template instead of `dist`.

The build also stages the controlled runtime asset set and validates every
dynamic asset and release-version consumer. After starting preview,
`npm run test:production` performs an isolated browser smoke test without
writing tester records to the real Supabase project.

For V35.2 tester feedback, also apply
`supabase/migrations/002_tester_feedback.sql`. See
`docs/TESTER_FEEDBACK.md` for RLS behavior and the administrative review query.

## Authentication flow

`src/main.js` starts `src/online/authGate.js` before importing Village or battle
modules. Session restoration and cloud-save selection complete before gameplay
appears. Supabase manages passwords, persistence, refresh tokens, email
confirmation, and recovery sessions.

The Account section under **More** shows display name, email, cloud status, last
sync, and logout. Logout flushes pending progress when possible, signs out,
caches the account-specific local fallback, and returns to authentication.

## Save compatibility and migration

`src/online/cloudSave.js` wraps the existing localStorage save format. V35.1
does not change the game save schema, storage keys, cloud payload format, or
database tables.

On first login:

- Existing cloud save: load cloud data without merging local data over it.
- No cloud save plus valid local progress: upload local progress once.
- Neither exists: initialize a normal new save and create its cloud row.

Migration markers and local fallbacks remain per Supabase user UUID. Cloud
writes retain the five-second debounce, serialized requests, revision checks,
retry/backoff, and offline fallback.

Village economy display polling is read-only. Periodic and resume checks compare
persistent save content with the last successful cloud snapshot and do not
queue a write while the player is idle. The status therefore remains `Synced`
until material persistent state changes.

## Validation checklist

- Register, confirm email when enabled, sign in, sign out, and restore a session.
- Test an invalid login and a password-recovery link through the Vite origin.
- Load an existing local save and verify one-time migration.
- Load an existing cloud save without blank/local overwrite.
- Make progression, wait for `Synced`, reload, and verify restoration.
- Leave the Village idle through multiple economy and periodic checks; confirm
  the status remains `Synced`.
- Test two accounts and verify their local fallbacks and cloud rows stay separate.
- Test offline changes, reconnection, and revision conflict behavior.
- Verify desktop Chrome, Edge, and Firefox.
- Verify physical iPhone/iPad Safari for session restoration, recovery links,
  audio unlock, keyboard/safe areas, rotation, and background/resume behavior.
