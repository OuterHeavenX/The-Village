# The Village Supabase setup

## Client configuration

The active launch path is a plain static browser project. `index.html` loads
the official Supabase UMD browser client before `src/main.js`.
`src/online/supabaseClient.js` initializes it with the public settings in
`src/online/supabaseBrowserConfig.js`.

No npm install or Vite transformation is required when the game is served at
`http://127.0.0.1:5500`. Do not use a bare package import in modules loaded
directly by the browser.

A publishable key is expected to be visible in a browser application;
authentication and Row Level Security protect data.
Never put a secret key, `service_role` key, database password, or JWT signing
secret in this repository or browser code.

## Apply the database migration

1. Open the Supabase project.
2. Open **SQL Editor** and create a new query.
3. Paste all of `supabase/migrations/001_auth_and_cloud_saves.sql`.
4. Run the query once.
5. In **Table Editor**, confirm `profiles` and `player_saves` exist.
6. In each table's RLS view, confirm RLS is enabled and only the own-row
   authenticated policies exist.
7. In **Authentication → URL Configuration**, add the local Vite URL
   (normally `http://localhost:5173`) and the production game URL to the
   redirect allow list.
8. In **Authentication → Providers → Email**, choose whether tester accounts
   require email confirmation. Both modes are supported.

Do not add public read/write policies and do not disable RLS.

## Run locally

Serve the project directory with Live Server and open
`http://127.0.0.1:5500`. Vite remains an optional production build tool.

Do not open `index.html` through a `file://` URL because browser module
security requires an HTTP server.

## Authentication flow

`src/main.js` starts `src/online/authGate.js` before importing the Village or
battle modules. During session restoration, only the account loading screen is
visible. A valid session loads the profile and correct cloud save before the
game initializes. Supabase manages passwords, session persistence, refresh
tokens, email confirmation, and recovery links.

The Account section under **More** shows display name, email, cloud status, last
sync, and logout. Logout attempts to flush progress, signs out through
Supabase, saves the account-specific local fallback, and reloads into the
authentication gate.

## Save and migration behavior

`src/online/cloudSave.js` snapshots the existing recognized Village
localStorage records into `player_saves.save_data`. It does not serialize DOM
nodes, audio objects, functions, transient battle visuals, passwords, sessions,
or tokens.

On first login:

- Existing cloud save: load it; do not merge or overwrite it with local data.
- No cloud save plus valid local progress: upload local progress once.
- Neither exists: initialize the normal game defaults and create a cloud save.

Migration markers and local fallback caches are per Supabase user UUID. Local
progress is retained while cloud saving is tested. Switching accounts caches
the previous account's local state before restoring the next account, so saves
do not leak between users.

Local saves remain immediate. Cloud writes are debounced for five seconds,
serialized one at a time, revision-checked, and retried with backoff. The game
also queues periodic saves and flushes at safe battle/menu/logout transitions.
When offline after a successful account load, gameplay continues against the
local fallback and the newest state retries on reconnection.

## Testing

### Authentication

1. Create a tester account and check validation for invalid email, a password
   shorter than eight characters, and mismatched confirmation.
2. If email confirmation is enabled, confirm the account before signing in.
3. Test wrong-password feedback, sign out/in, session restoration after reload,
   recovery email, and setting a new password through the recovery link.

### Cloud saves

1. Back up an existing local save, then sign into a new account and confirm it
   migrates once.
2. Win or lose a battle, edit the deck, claim a decree, modify Village
   buildings/resources, wait for “Saved,” and reload.
3. Sign into Account B and verify it has different progression.
4. Return to Account A and verify its cloud/local fallback returns.
5. Sign into the same account on a second device and confirm the cloud state.
6. Disable networking after a successful load, make progress, confirm the
   offline/pending status, reconnect, and wait for “Saved.”
7. Confirm `player_saves` has exactly one row per user and revisions increase.

Use desktop Chrome/Edge and physical Safari on iPhone/iPad for final session,
keyboard, safe-area, rotation, and recovery-link verification.
