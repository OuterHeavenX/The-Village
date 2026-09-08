# THE VILLAGE — ARCHITECTURE

**Baseline:** V36.0.0 — Gothic Collection.

How the code is put together, and the constraints that hold it together. For
*what the game currently is*, read [`PROJECT_STATE.md`](PROJECT_STATE.md).

---

## 1. Startup path

```
index.html
  └─ <script type="module" src="/src/main.js">
       ├─ config/release.js         version stamped into the DOM
       ├─ config/debug.js           debug channels resolved once
       ├─ online/feedbackSystem.js  installs window error + unhandledrejection handlers
       ├─ UI/*.css                  bundled stylesheets
       └─ online/authGate.js  ── bootstrapAuthentication(startGame)
            ├─ no Supabase credentials  → start the game in local-only mode
            ├─ credentials, no session  → sign-in form
            └─ credentials + session    → online/cloudSave.js, then start the game

     startGame():
       ├─ import villageBootstrap.js   claims Village ownership, builds the world
       ├─ import Battle/game.js        builds every other screen, installs ROTKGameBridge
       └─ (desktop only) import Renderer/threeAtmosphere.js
```

Two rules are load-bearing:

- **`villageBootstrap.js` must be imported before `Battle/game.js`.** It sets
  `window.__ROTK_VILLAGE_BOOTSTRAP__` at module evaluation time; `game.js`
  contains a preserved legacy Village controller that stays dormant when that
  flag is set. Reverse the order and both controllers bind to the same DOM.
- **The decorative atmosphere layer is desktop-only.** It opens a second WebGL
  context on top of the Village's. iOS Safari enforces a browser-wide context
  budget, and this is the request that fails on a busy iPad.

---

## 2. Module map

```
src/
  main.js                  entry point and boot sequencing
  config/
    release.js             RELEASE_VERSION — the one version constant
    debug.js               debug channels: overlay, diagnostics, visual, proof
  data/                    pure data, no DOM, no engine
    campaign.js            CAMPAIGN_CHAPTERS — 20 chapters, bosses, relics
    villageBuildings.js    catalog, categories, starters, research
  Battle/
    game.js                battle engine, all non-Village screens, save system
    battleDiagnostics.js   error history, non-finite state validation
    developmentTelemetry.js on-screen debug overlay
    economy.js, placementSystem.js, projectileSystem.js, waveDirector.js
    battlefieldConfig.js, battle3Runtime.js
    Cards/, Towers/, Environment/
  Cards/
    cardsScreen.js         the Battle Deck screen (Cards 3.0); rules injected from game.js
    cardArtRegistry.js     card art lookup
  Battle3D/                Battle 4.0 preview (docs/BATTLE_4_DESIGN.md)
    flag.js                ?battle3d / village.battle3d switch
    layout.js              keep arena roads, breaches, heights (from the layout JSON)
    battlefieldScene.js    Three.js scene: terrain, grass, keep, billboards
    battleBridge.js        WebGL context lifetime; the only seam to game.js
  Village/
    economyModel.js        production rates, offline projection, storage caps
    worldRegistry.js       world bounds, districts, roads, plots, building→model
    authoredBuildingFactory.js, bespokeArchitecture.js
  Renderer/
    villageThreeWorld.js   the Three.js Village
    threeAtmosphere.js     optional desktop backdrop
  Ascension/
    registry.js            relics, equipment, gems, fusions, companions, elements
  Progression/
    economyRegistry.js, battleTelemetry.js, benchmarkProfiles.js
  UI/                      bundled stylesheets for the newer surfaces
  online/
    supabaseClient.js      client construction, abortable fetch
    authGate.js            sign-in, session restore, local-only fallback
    cloudSave.js           revisioned cloud save, debounce, retry, migration
    feedbackSystem.js      in-game tester reports, global error capture
    startupWatchdog.js     stage logging and timeouts

index.html                 the DOM contract: element ids are an API
styles.css                 global presentation
assets/                    source art, audio and models
scripts/                   asset staging, build and content validation, smoke tests
```

### Ownership boundaries

| Surface | Owner |
|---|---|
| The Village screen and its 3D world | `villageBootstrap.js` + `Renderer/villageThreeWorld.js` |
| Every other screen (campaign, cards, heroes, forge, codex, profile, battle HUD) | `Battle/game.js` |
| The save object | `Battle/game.js` |
| Cloud transport | `online/cloudSave.js` |
| Content data | `src/data/`, `src/Ascension/registry.js`, `src/Village/worldRegistry.js` |

---

## 3. Game loop

### Battle — `Battle/game.js`

One `requestAnimationFrame` loop for the whole battle system.

```
loop(now)
  trimParticles()                   cap the particle pool
  frameDt = min(50ms, now - last)   clamped so a tab switch cannot teleport the sim
  updateCameraTour(frameDt)
  scaledDt = frameDt × speed        speed is 1×, 2× or 3×
  for each fixed step of ≤ 1/50s:   fixed timestep, so 3× speed is deterministic
      update(stepDt)
  validateBattleState()             sampled; only with the diagnostics channel
  draw()                            once per frame — but see below
```

`update()` returns immediately when there is no battle. `draw()` is skipped
between battles: with no battle state every animated term reads `0`, so the
frame is identical every tick, and it is repainted only when the canvas geometry
changes. Entering a battle forces the first frame.

### Village — `villageBootstrap.js`

One `requestAnimationFrame` loop drives four registered callbacks in order:
`shadow`, `citizens`, `atmosphere`, `construction`. The driver resolves
"is the Village on screen", "is the document visible" and "are we in a battle"
once per frame and hands the answers to all four. A callback that throws is
disabled and reported rather than taking the loop down.

The Three.js Village renderer owns its own loop in `villageThreeWorld.js`.

---

## 4. Rendering

Three independent layers, deliberately:

- **Canvas 2D** — the battlefield. Immediate-mode, no scene graph, drawn from
  `G` (the battle state) every frame. `DPR` is capped at 2 on touch devices and
  3 on desktop.
- **Three.js r128** — the Village world. Pinned to r128, so renderers use the
  `outputEncoding` / `sRGBEncoding` API rather than the newer colour management.
  Buildings are `.glb` models mapped from building id through
  `MODEL_FOR_BUILDING`.
- **DOM + CSS** — every menu, HUD, modal and the Village's citizens and Shadow
  sprite, which are positioned elements rather than canvas draws.

---

## 5. Input

Pointer Events throughout — no separate mouse and touch paths.

- Battle: `pointerdown`/`move`/`up`/`cancel` on the canvas, with
  `setPointerCapture`, an `activePointers` map for two-finger pinch zoom,
  `lostpointercapture` recovery, and a reset on `blur` and `visibilitychange`.
  `touch-action: none` on the canvas.
- Village: a virtual joystick plus an interaction button; `pointerdown` is
  stopped from propagating on every UI control so taps do not also move Shadow.
- No document-level `touchmove` `preventDefault`. Page scrolling is controlled
  per-element instead.

---

## 6. State

There is no store. State lives in three places:

- **`save`** in `game.js` — the persistent player object.
- **`G`** in `game.js` — the current battle. `null` between battles; almost
  everything in the battle system reads `G?.…`.
- **Module-local state** in `villageBootstrap.js` for the Village screen.

Cross-module communication is deliberately narrow:

| Global | Direction | Purpose |
|---|---|---|
| `window.ROTKGameBridge` | Village → engine | Read economy and progression, spend resources, complete research, grant rewards |
| `window.VillageBattleAPI` | HTML → engine | The native battle command bar: center, speed, pause, menu |
| `window.KaelInput`, `window.ROTKVillageCamera` | Village internals | Movement and camera |
| `window.__ROTK_VILLAGE_BOOTSTRAP__` | Village → engine | Ownership flag (see §1) |

`ROTKGameBridge` is the seam between the Village and the engine. **Widen it
rather than reaching into either module's internals.**

---

## 7. Save flow

Summarised here; the authority is [`SAVE_SCHEMA.md`](SAVE_SCHEMA.md).

```
load    localStorage → JSON.parse → quarantine on failure → normalise → migrate
save    saveProgress() → localStorage (synchronous) → queueCloudSave() (debounced 5s)
cloud   collect matching storage keys → revisioned upsert → conflict surfaces to the player
```

Local storage is always written first. A cloud failure never costs progress.

---

## 8. Asset loading

Assets are **not** imported as modules, except for a handful of atlases,
portraits and audio tracks that Vite hashes and bundles
(`viteManagedAssets` in `scripts/runtime-assets.mjs`).

Everything else is fetched at runtime by a path string built from a registry —
`assets/enemies/<family>/PNG/<folder>/With_shadow/<prefix>_<action>_with_shadow.png`
and similar. `scripts/prepare-runtime-assets.mjs` computes that list, verifies
every file exists, and stages them into `public/assets/` so Vite copies them
verbatim. `scripts/validate-build.mjs` then confirms they reached `dist/`.

The repository holds 4,205 asset files (260 MB). A build ships 165 (45 MB).

---

## 9. Data registries

`src/data/` and `src/Ascension/registry.js` hold pure data with no DOM or engine
dependency, so the UI, the engine and Node scripts read the same source.

`scripts/validate-content.mjs` runs as part of `npm run build` and enforces:

- unique ids across chapters, relics, equipment, gems, fusions, companions,
  elements, research and build categories;
- gem and fusion ids not colliding (they share one id space in the save);
- chapter registry order matching chapter numbers, because campaign rewards
  index relics by position;
- research unlocking buildings that exist, and gated behind chapters that exist;
- every building having a `MODEL_FOR_BUILDING` entry and that model existing;
- **every building being reachable** as a starter or through research.

The last check exists because two buildings shipped for several releases with no
route to unlock them.

---

## 10. Debug

`src/config/debug.js` resolves four channels once at startup:

| Channel | Effect |
|---|---|
| `overlay` | On-screen battle telemetry: FPS, chapter, save schema version, wave, entity and tower counts, decision drought |
| `diagnostics` | Error history, non-finite state validation, canvas context-loss tracking |
| `visual` | Battlefield debug drawing |
| `proof` | Village renderer runtime proof panel |

`?debug=1` enables all, `?debug=overlay,visual` picks channels, `?debug=0`
clears. The choice persists in `village.debug`. A development server enables
everything by default.

`?balanceProfile` is deliberately **not** a channel: it swaps the live save for
a synthetic benchmark profile and stays gated on `import.meta.env.DEV`.

---

## 11. Known architectural debt

Recorded so it is not rediscovered. See [`ROADMAP.md`](ROADMAP.md) for when to
act on it.

- **`Battle/game.js` is 3,500 lines and 332 KB**, holding content data, the
  simulation, the renderer, every non-Village screen and the save system. Some
  lines exceed 2,500 characters. The `src/data/` extraction started chipping at
  this; the next candidates are the card and tower definitions, then the save
  layer.
- **CSS lives in two places.** `styles.css` is 3,425 lines with 705
  `!important` declarations, and `index.html` carries another 916 lines in two
  `<style>` blocks, several of which exist purely to out-specify the stylesheet.
- **`index.html` element ids are an undeclared API.** `game.js` and
  `villageBootstrap.js` query them by string with no shared manifest, so
  renaming an id fails silently at runtime.
- **The asset library is 260 MB for a 45 MB build.** Unused source art is
  carried in every clone.
