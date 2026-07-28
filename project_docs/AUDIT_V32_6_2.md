# THE VILLAGE — V32.6.2 CODE AUDIT

**Audit date:** 2026-07-27
**Audited baseline:** V32.6.0/V32.6.1 HD Diorama Foundation
**Reported symptom:** on iPad Safari the Village showed a black screen reading
`THREE.JS FAILED TO START — Unknown WebGL error`, with the resource strip and
navigation still drawn over it.
**Result:** root cause found and fixed. It was not a WebGL error at all.

---

## 1. The reported failure — root cause

The 3D Village was killed by a **missing PNG**, and then mislabelled as a GPU fault.

```
loadArtTexture('assets/village/house_lv02.png')   ->  404
```

`assets/village/house_lv02.png` was never exported into the build. Only the
`house_lv02.heic` source shipped. The failure then cascaded through three
separate defects, each of which made the next one worse:

| # | Defect | Effect |
| --- | --- | --- |
| 1 | The three art textures were loaded with `Promise.all` | One missing file rejected the whole batch and aborted world creation |
| 2 | The catch handler read `error.message` | Three.js loaders reject with a DOM `ErrorEvent`, which has **no** `.message`. The expression `error?.message \|\| 'Unknown WebGL error'` therefore always printed the misleading WebGL string for any asset 404 |
| 3 | The catch handler ran `world.innerHTML = '<div class="three-hard-error">…'` | This destroyed the entire 2D Village DOM — ground, plots, buildings, citizens — so there was no fallback to fall back *to*. Combined with `body:not(.village-three-active) #menu #villageWorld{background:#091018!important}`, the result was the black screen in the screenshot |

### Fixes applied

- **`assets/village/house_lv02.png` regenerated** (1536x1024) from the
  `house_lv02.heic` source that was already in the build. The asset now exists
  for real rather than being papered over.
- **`loadArtTexture()` rewritten** to accept a list of candidate URLs and a
  procedural fallback. It never rejects. Substitutions are reported once through
  `console.warn` instead of taking the world down.
- **GLB loading made non-fatal.** If `the_village_gothic_house_lv1.glb` cannot
  load, houses fall back to simple massing blocks.
- **The shadow sprite sheet** goes through the same resilient path.
- **`describeLoadError()` added and exported.** It reads `.message`, then
  `target.src`, then `.type`, so a 404 now reports
  `could not load house_lv02.png` instead of `Unknown WebGL error`.
- **The failure path is no longer destructive.** It removes the dead canvas,
  clears `village-three-active`, shows a self-dismissing banner and lets the
  classic 2D Village carry on. `world.innerHTML` is never touched.

**Verified:** with `house_lv02.png` forced to 404 *and* the GLB forced to fail,
world creation now completes successfully and `dispose()` runs clean.

---

## 2. iPad Safari robustness

These did not cause the reported crash but each is a live cause of the same
black screen on iOS, and the screenshot shows the exact conditions for the first.

1. **Two WebGL contexts were being opened.** `threeAtmosphere.js` holds one for a
   decorative backdrop while `villageThreeWorld.js` needs another. iOS Safari
   enforces a browser-wide context budget; with a dozen tabs open — as in the
   screenshot — the second request simply fails. The atmosphere layer is also
   **completely invisible now**: `#villageThreeCanvas` paints over it in the
   Village and `body.battle-mode #threeBg` hides it in battle. It is now skipped
   entirely on mobile GPUs and when the 3D Village is active.
2. **No `webglcontextlost` handler.** iOS reclaims contexts under memory pressure
   and on backgrounding. Without a handler the Village went permanently black
   with no recovery. Both `webglcontextlost` and `webglcontextrestored` are now
   handled: the loop parks, a status strip explains why, and it resumes on
   restore.
3. **No WebGL pre-flight.** Context-creation failure surfaced as an opaque
   internal Three.js throw. A probe now runs first and reports plainly: *"This
   browser could not create a WebGL context. On iPad, closing other Safari tabs
   usually frees one."*
4. **Mobile GPU budget.** `antialias` is now off on mobile, pixel ratio is capped
   at 1.35 instead of 1.65, shadows use `PCFShadowMap` instead of `PCFSoftShadowMap`,
   and the shadow map drops from 2048² to 1024² — roughly a 16 MB depth target
   down to 4 MB.
5. **`ctx.roundRect()` polyfilled.** Safari only shipped it in 16.4. On an older
   iPad the cobblestone texture painter threw and took the whole world with it.

---

## 3. Performance

**`readPlots()` was being called once per rendered frame.** It is a synchronous
`localStorage.getItem` plus `JSON.parse` — a main-thread, disk-backed read
running ~60 times a second inside the render loop. This is a serious source of
iPad jank and exactly the kind of main-thread stall that provokes the WebGL
watchdog. Plot data only changes on construction, which already triggers
`rebuildPlots()` through a MutationObserver, so a 500 ms TTL cache is safe.

**Measured: 120 frames previously caused 120 localStorage reads; now 1.**

Also fixed:

- **The render loop could never be stopped.** `frame()` re-armed
  `requestAnimationFrame` unconditionally, and `dispose()` — which was never
  called by anything — removed the canvas but left the loop rendering into a
  detached element forever. There is now a `disposed` flag, a tracked `rafId`,
  and `cancelAnimationFrame` on teardown.
- **Rendering while the tab is hidden** is skipped.

---

## 4. Other bugs and cleanup

1. **`assets/village/the_village_main.png` was missing** while `styles.css`
   referenced it twice for the menu backdrop. Repointed to the newly exported
   `house_lv02.png`, which is the right aspect ratio for a wide backdrop. *(See
   "Still outstanding" — the original art should be restored when available.)*
2. **`package.json` said `32.5.1`** on a build labelled V32.6.0/V32.6.1, and
   `package-lock.json` disagreed with both. All now `32.6.2`.
3. **Cache identifiers had drifted apart again:** `styles.css?v=v32-4-2-audit`,
   `main.js?v=v32-6-1-real-glb-house`, `villageBootstrap.js?v=3258`,
   `game.js?v=3242`. On Safari that means an update can pair a new script with a
   months-old stylesheet. All unified on `v32-6-2` / `3262`.
4. **`#villageThreeStatus` rendered underneath the economy strip** despite a
   higher `z-index`, because the strip forms its own stacking context. Raised and
   offset so the message is actually readable.
5. **Resilience styling added** so `village-three-error` and
   `village-three-context-lost` present a usable Village rather than a black box.

---

## 5. Metal Gear Solid easter eggs — three more

Joining the existing six (the V29.8 tactical/cardboard-box mode in
`villageBootstrap.js`, and the V32.4.2 codec, alert and Psycho Mantis in
`game.js`). All presentation-only: no combat value, save-schema field or
progression gate is touched, and each degrades to a no-op if its host element is
missing.

1. **"SHADOW? SHADOW?! SHAAAADOW!"** — the defeat cry, staged in three beats over
   the game-over screen with a descending sawtooth sting. Gated on having dialled
   the codec at least once (`village.mgs.greeted`), so the eggs chain into one
   another rather than firing at a player who has not found the first.
2. **"METAL GEAR?!"** — fires the instant the Golem reaches its third form. A
   walking weapon platform that rebuilds itself mid-fight is precisely the
   double-take, so it reuses the `!` alert marker and drops the line as a toast
   and a battlefield floater.
3. **The Sorrow — the river of the dead.** Five quick taps on the Codex
   completion percentage. Every enemy type you have ever discovered drifts
   upstream past you in the dark while the river counts your total kills back to
   you. Reads `save.discoveredEnemies` and `save.stats.totalKills`; distinct from
   Psycho Mantis, who reads your meta-progress rather than your bestiary.

Styling is one self-contained block appended to `styles.css`, unique selectors
only, `prefers-reduced-motion` honoured.

---

## 6. Still outstanding

- **A 13-model GLB pack ships completely unused.**
  `assets/village/The_Village_Gothic_GLBS_Phase1/` contains house_lv1, house_lv2,
  farm, lumber_camp, quarry, warehouse, library, alchemist, enchanter,
  blacksmith, tavern, keep and cathedral plus a `manifest.json` — 272 KB that no
  code path references. The renderer still loads only the older standalone
  `the_village_gothic_house_lv1.glb`. Wiring the pack up is a design task, not an
  audit fix; the manifest already carries per-model bounds to make placement
  straightforward.
- **`the_village_main.png` has no source in this build.** The substitution above
  is a stopgap; restore the real backdrop when it is available.
- **The orphaned upgrades from V32.4.2 are still orphaned.** Soul Reserve, Hunter
  Tavern and the village Night Market/Tavern starting-soul bonuses fed only the
  removed `G.gold` field and still do nothing. Repairing them is a balance
  decision — detail and the one-line patch are in `AUDIT_V32_4_2.md`.
- **`FRESH_START_TOKEN` is still live** four minor versions after V32.2.
- **`styles.css` is now 2,590 lines with 600+ `!important` declarations.** The
  standing guidance against refactoring it outside a dedicated build still holds.
- **`src/Battle/game.js` remains a single ~2,650-line controller.**

---

## 7. Validation performed

- `node --check` on all five JavaScript sources
- Full `game.js` module evaluation against a DOM/Canvas/WebAudio stub
- `createVillageThreeWorld()` driven to completion against a Three.js stub with
  `house_lv02.png` forced to 404 **and** the GLB forced to fail — previously
  fatal, now initialises and disposes cleanly
- `describeLoadError()` unit-checked against four rejection shapes, including the
  exact bare `ErrorEvent` that produced the "Unknown WebGL error" banner
- Plot-cache regression measured: 120 simulated frames, 1 `readPlots()` call
- `dispose()` executed without throwing
- All three new easter eggs exercised
- Programmatic existence check of every referenced asset, plus all nine
  runtime-constructed Shadow sprite paths
