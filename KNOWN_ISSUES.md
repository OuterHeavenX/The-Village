# THE VILLAGE — KNOWN ISSUES

Honest list. Fixed items live in [`CHANGELOG.md`](CHANGELOG.md).

---

## Not verified

These are not known to be broken. They are known to be **untested**, which is a
different and more dangerous thing.

- **Physical iPhone and iPad hardware.** All browser testing in the recent audit
  pass ran in headless Chromium at 1440×900, 1024×768, 834×1112 and 390×844.
  That covers layout and logic. It does **not** cover:
  - Safari's audio unlock rules and the `.ogg` decode path
  - device rotation and the safe-area insets around the home indicator
  - WebGL context pressure when other tabs are open — the Village needs a
    context and iOS enforces a browser-wide budget
  - real touch, as opposed to synthesised pointer events
  - sustained frame rate on actual mobile silicon
- **Android.** Same position, with less prior evidence.
- **Supabase against a live project.** The cloud save, sign-up, email
  confirmation and password-reset paths are exercised against a mocked endpoint
  in the smoke suite. The mock cannot catch a misconfigured redirect URL, an
  RLS policy that is too strict, or a migration that was never applied.

---

## Real limitations

### A paused Supabase project looks like a network failure

Supabase pauses free-tier projects after roughly a week without traffic. A
paused project refuses connections outright, so on the phone the sign-in and
password-reset forms fail with a fetch error — Safari's "Load failed" — even
though the device is online.

The auth gate now says "The account service could not be reached. It may be
paused or down" when the device reports itself online, and only blames the
connection when it does not. But the fix is operational, not in code: restore
the project from the Supabase dashboard (Project → Restore project), or keep it
on a plan that does not pause. Expect this every quiet week until then.

`list_projects` in the Supabase dashboard or CLI shows the status directly;
`INACTIVE` means paused.

### Offline play only when accounts are unconfigured

If the build has Supabase credentials but the network is unreachable, the player
is shown the sign-in form and cannot get in. Only a build with *no* credentials
boots straight into local play.

This is deliberate for now — a "continue offline" button on a configured build
would create a second, divergent local profile that the cloud would later have
to reconcile, and there is no merge strategy for that. It is still a real gap
for a tester on a bad connection.

### The Living Village state is device-local in practice

Fixed at the storage layer — claimed secrets, constructions, blessings and
trophies now sync — but a player who has been playing across two devices since
before that fix has divergent state on each. The first sync after upgrading
wins; there is no merge.

### Cloud save conflicts require a reload

Two devices writing the same account produce `CLOUD_REVISION_CONFLICT`, and the
player is told to reload. That is the safe behaviour — it never silently
overwrites — but it is not a good experience.

### The build ships 45 MB

Mostly sprite sheets, atlases and three music tracks. On a slow connection the
first load is long, and there is no loading progress indicator for it.

### Late campaign content is thin

Chapters 13–20 reuse earlier maps and boss archetypes with scaled numbers. They
are playable, not distinct.

### Village research outruns the campaign's centre of mass

`arcaneFoundation`, `arcaneMastery` and `divineKingdom` gate on chapters 14, 17
and 20. They are reachable, but far beyond where most players will get. Whether
that is a pacing bug or correct long-tail design needs playtest data.

---

## Technical debt with player-visible risk

### `src/Battle/game.js` is 3,500 lines

It holds content data, the battle simulation, the canvas renderer, every screen
except the Village, and the save system. Some lines exceed 2,500 characters. Any
change to it carries more risk than its diff suggests, and the save system —
the highest-stakes code in the project — sits in the middle of it.

### CSS is split across two files with 705 `!important` declarations

`styles.css` holds 3,425 lines; `index.html` carries another 916 in two
`<style>` blocks, several of which exist only to out-specify the stylesheet. A
layout fix at one breakpoint can silently move something at another — which is
exactly how the audio button ended up covering the Tester Feedback button at
tablet widths.

### `index.html` element ids are an undeclared API

Both large modules query them by string. Renaming an id fails silently at
runtime, not at build time.

### The repository carries 260 MB of assets for a 45 MB build

Every clone and every CI checkout pays for source art the game never loads.
Deleting the unused files would not shrink history, so the benefit is bounded.

---

## Fragile areas — change with care

Ranked by how much damage a careless change does.

1. **The save normalisation block** in `game.js` (around the `loadedSave`
   handling). Roughly 60 lines of dense field coercion that every existing save
   passes through on every boot. A mistake here corrupts real progress.
   Read [`SAVE_SCHEMA.md`](SAVE_SCHEMA.md) first.
2. **The three save-key patterns** in `cloudSave.js` and `game.js`. They must
   stay in agreement. A key matching none of them is invisible to sync, export,
   restore and reset.
3. **Module import order in `main.js`.** `villageBootstrap.js` must load before
   `Battle/game.js` or two Village controllers bind to the same DOM.
4. **`window.ROTKGameBridge`.** The only seam between the Village and the
   engine. Both sides assume methods exist; most calls are optional-chained,
   which means a typo degrades silently instead of throwing.
5. **Battle pointer handling.** Pointer capture, the `activePointers` map, and
   the `blur` / `visibilitychange` / `lostpointercapture` recovery paths exist
   because of specific iOS bugs. The comments explain which. Do not simplify
   them without an iPad in hand.
6. **The Three.js version pin (r128).** The renderers use `outputEncoding` and
   `sRGBEncoding`, removed in later releases. Upgrading is a colour-management
   project, not a version bump.
