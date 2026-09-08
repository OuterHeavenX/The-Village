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
- **Touch drag on the Cards screen on real hardware.** Long-press-and-drag a
  card onto a deck slot was verified only with headless Chromium's synthetic
  touch stream (iPad profile). iOS Safari's long-press behaviour (text
  selection, the callout) is untested. Tapping `+`, the detail sheet and swap
  mode cover the same actions without a drag.
- **The 3D battlefield preview on real GPUs.** `?battle3d=1` was exercised
  only under SwiftShader in headless Chromium, which proves the scene, the
  raycast placement and the breach logic but says nothing about frame rate.
  The phone tier caps grass at ~5k blades and pixel ratio at 1.5; whether a
  2020 iPhone holds 60 fps with 20 enemies on screen is untested. If WebGL
  fails or the context is lost, the battle falls back to the 2D board with
  the keep layout, which is playable but has no keep art.
- **Supabase against a live project — partially.** Confirmed directly on the
  production project after restoring it from a pause: `profiles`,
  `player_saves` and `tester_feedback` exist with row-level security enabled,
  the feedback table carries the insert-only policy and the 003 context
  columns, and the two existing accounts and their saves survived the pause.
  Still exercised only against the smoke suite's mock: the sign-up email
  confirmation round-trip, the password-reset email, and whether the deployed
  origin is in the project's allowed redirect list.

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

### Phone-width leftovers from the emulated sweep

Found by the iPhone-emulated sweep but deliberately not changed yet, because
each needs a design decision or a real device to judge:

- **Invisible plot hit-targets over the 3D Village.** The legacy DOM plots in
  `#villagePlots` are rendered at opacity 0 but keep `pointer-events:auto`, so
  220×170px rectangles sit over the 3D world and take taps. Whether they line up
  with the 3D plots on a phone, and whether they should exist at all now that
  the renderer has its own plot picking, needs checking on hardware.
- **Ghost text behind the Village HUD.** The day/weather readout
  ("NIGHT · CLEAR NIGHT") and the clock render faintly behind the title bar and
  the population figure on narrow screens.
- **The draft carousel has no swipe hint.** On phones the three draft cards are
  a horizontal snap-scroll; the next card peeks in from the edge, which is the
  only affordance. Whether that reads on a real phone is untested.
- **The catalog's hint footer overlaps the last visible row.** The list scrolls
  beneath it, so nothing is blocked, but the last card cannot scroll fully clear
  of it.
- **The Cards loadout row scrolls horizontally** with three of six equipped
  cards off-screen at 390px and no indicator.

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
