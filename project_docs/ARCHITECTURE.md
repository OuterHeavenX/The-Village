# THE VILLAGE — ARCHITECTURE

**Baseline:** V35.1.0 Vite Native Foundation

## 1. Runtime Architecture

```text
index.html
  └─ src/main.js
      ├─ src/online/authGate.js
      │  ├─ @supabase/supabase-js
      │  └─ src/online/cloudSave.js
      ├─ src/villageBootstrap.js
      │  └─ src/Renderer/villageThreeWorld.js
      │     ├─ three@0.128.0
      │     └─ GLTFLoader package module
      ├─ src/Battle/game.js
      └─ src/Renderer/threeAtmosphere.js
```

Vite is the supported runtime. Supabase and Three.js are package imports; the
application no longer depends on CDN or browser globals. Three.js remains
pinned to r128, so renderers use its `outputEncoding`/`sRGBEncoding` API.

The cleaned project intentionally uses one live file per responsibility. Do not reintroduce parallel versioned runtime files. Version history belongs in ZIP names, Git commits, and patch notes—not duplicate imports.

## 2. Responsibilities

### `index.html`

Owns the stable DOM contract: menu, campaign, Cards, inspector, heroes, upgrades, forge, codex, profile, choices, battle HUD, canvas, game-over screen, and bottom navigation. IDs referenced by JavaScript are API-like contracts.

### `styles.css`

Owns all presentation and responsive behavior. It is currently overgrown,
especially around Cards: 2,531 lines, 608 `!important` declarations, and
seventeen selectors defined four separate times. Roughly 460 further lines of
CSS still live in two inline `<style>` blocks inside `index.html`, which
contradicts this rule; consolidating them is safe but belongs in its own change. Future recovery should consolidate by feature and breakpoint instead of adding later overrides with higher specificity.

Recommended future organization:

```text
styles/
  tokens.css
  shell.css
  menu.css
  cards.css
  battle.css
  village.css
  responsive.css
```

Do not split files during the Cards recovery unless the build and import order are tested; consolidation inside the current file is safer for the immediate milestone.

### `src/Battle/game.js`

Despite its name, this is the current application controller and game engine. It owns:

- canonical content definitions;
- save migration and persistence;
- Cards/deck/forge rendering;
- campaign, relic, achievement, kingdom, codex, and profile rendering;
- battle state and simulation;
- Canvas 2D rendering;
- input and camera;
- navigation and UI bindings.

This concentration increases regression risk. After Cards stabilization, future refactoring can extract modules, but behavior must be covered by tests first.

### `src/villageBootstrap.js`

Owns village/home bootstrap behavior and atmospheric presentation outside the main battle controller. Keep its responsibilities separate from Cards recovery.

### `src/Renderer/threeAtmosphere.js`

Optional progressive enhancement. It imports the pinned `three` package and is
loaded through `import().catch()` so an atmosphere-specific WebGL failure does
not prevent the rest of the game from starting.

## 3. Data and Save Contract

- Canonical storage key: `relicsEclipseSave`.
- Legacy fallback key: `gateRunnerSave`.
- Current schema: `saveVersion = 15`.
- Major persistent branches include inventory, deck, unlocked cards, favorites, UI filter/sort state, selected hero, hero levels/equipment, ground-defense slots, upgrades, materials, stats, campaign, relics, kingdom, achievements, codex discoveries, settings, and run history.

Never rename persistent IDs casually. Content IDs are foreign keys across saves and render logic. Migrations must merge and repair data rather than erase legitimate unlocks.

## 4. Cards Architecture

### Data flow

1. `save.inventory`, `save.unlocked`, and `save.deck` hold persistent state.
2. `renderDeck()` reconciles unlocks, renders six equipped slots, ground defenses, collection cards, merge state, category state, and deck analysis.
3. Category tabs synchronize through `save.ui.cardFilter` and `#deckTypeFilter`.
4. Collection cards open inspection; nested buttons equip or remove cards.
5. `saveProgress()` writes changes immediately.

### Recovery rule

Preserve this data flow for V27.2. Repair the view and interaction shell first. Do not rewrite card progression while debugging layout.

## 5. Battle Architecture

- `G` is the live run state.
- `freshGame()` initializes a run.
- Canvas pointer handlers own pan, pinch, placement, and taps during play.
- `window.VillageBattleAPI` exposes stable center, speed, pause, menu, and retry commands.
- UI-state synchronization is critical because iPad Safari historically lost synthetic click events around the canvas.

Do not replace pointer handling with click-only handlers.

## 5a. 3D Village Contracts

**All building geometry comes from the gothic GLB pack.** There is exactly one
source of building art:

```
assets/village/The_Village_Gothic_GLBS_Phase1/   (13 models, 234 KB)
```

`placeModel(id, x, z, opts)` is the only way to put a building in the world, and
`modelIdForType(type)` is the only mapping from a build type to a model. Do not
reintroduce procedural buildings, PNG-textured boxes, or a single model cloned
with bolt-on props — every one of those existed simultaneously before V32.6.3 and
none of them matched the authored art. Model footprints are measured at load with
`THREE.Box3` and normalised to the plot pad; never hand-tune per-model scale
constants.

**Shadow settings are derived, never hard-coded.** `normalBias` must scale with
the shadow texel's world size (`ortho width / mapSize`); hard-coding it is what
caused the V32.6.2 acne regression when the mobile map was halved. Keep the
shadow camera's near/far fitted to the scene — the Three.js directional-light
default of 0.5/500 wastes most of the map's depth resolution here.

**The shadow map is baked on demand.** `renderer.shadowMap.autoUpdate` is
`false` because every caster is static. Anything that adds or moves a caster must
call `requestShadowUpdate()`; so must WebGL context restore.

**Keep the main camera's near plane at 1 or above.** The follow camera is a fixed
(0,16,22) offset, so nothing is ever close to it, and a 0.1 near plane against a
260 far plane destroys depth precision on 16-bit mobile buffers.


`src/Renderer/villageThreeWorld.js` is an **enhancement layer**. Three rules keep
it from taking the game down with it:

1. **No asset may be fatal.** Every texture and model load goes through a
   fallback chain ending in a procedural stand-in. `Promise.all` over raw loader
   promises is banned — one 404 used to abort the entire world.
2. **Never report `error.message` from a loader.** Three.js loaders reject with a
   DOM `ErrorEvent`, which has no `.message`. Use the exported
   `describeLoadError()`; reading `.message` directly is what produced the
   long-standing "Unknown WebGL error" banner for what were really 404s.
3. **Failure must not mutate the Village DOM.** The 2D Village is the fallback.
   Setting `world.innerHTML` on failure destroys the thing you are falling back
   to.

Also required:

- **One WebGL context.** iOS Safari enforces a browser-wide budget. The
  atmosphere layer is deferred and skipped on mobile GPUs and whenever the 3D
  Village is active.
- **Handle `webglcontextlost`/`webglcontextrestored`.** iOS reclaims contexts
  routinely; an unhandled loss is a permanent black screen.
- **Nothing synchronous or disk-backed in `frame()`.** `readPlots()` is a
  `localStorage` read and must stay behind the TTL cache. Plot changes invalidate
  it through `rebuildPlots()`.
- **The render loop must be stoppable.** Track the `rafId`, honour the `disposed`
  flag, and `cancelAnimationFrame` in `dispose()`.

## 5b. Battle Performance Contracts

Two hot paths are memoised and must stay that way.

- `pathSet()` and `routePoints()` are backed by a single `roadVersion` counter.
  Any code that mutates `G.path` or `G.routes` **must** call `bumpRoadVersion()`.
  The current mutation sites are `rebuildVisiblePath()`, `appendRouteTile()`,
  `placeRoadPiece()` and `freshGame()`.
- The arrays and Sets these two functions return are **shared and read-only**.
  Never mutate a `routePoints()` result or a `pathSet()` result in place; copy
  first if you need to.
- Sprite preloading is split by reachability. `EARLY_ENEMY_TYPES` plus Shadow and
  the Golem forms load eagerly; everything else is warmed on
  `requestIdleCallback` by `warmDeepRoster()`. `spriteImage()` resolves on demand,
  so no rendering path may assume the warm-up has finished.


## 5c. Battle Render Budget

Two rules keep the battle at 60fps.

- **Never set `ctx.shadowBlur` inside a per-entity loop.** Canvas2D implements it
  as a scratch-surface gaussian blur, so the cost scales with entity count. This
  is what dropped V34.0.0 to 331 blur passes per frame. Use `drawGlow()`, which
  blits a radial-gradient sprite cached per colour by `glowSprite()`. The only
  acceptable `shadowBlur` uses are bounded ones that do not grow with the number
  of entities (the cathedral facade, the braziers, the selected-tower ring).
- **Effect arrays are budgeted.** `G.particles` is capped at `MAX_PARTICLES`
  (420) and `G.floaters` at 90. `trimParticles()` is called from `loop()`, **not**
  `update()`, because `update()` early-returns on pause and hit-stop; a boss death
  immediately before a draft pause would otherwise leave the cap unenforced.

## 5d. Village Boundary

`WALL` in `villageThreeWorld.js` and `THREE_WORLD_BOUNDS` in
`villageBootstrap.js` describe **the same line** and must be changed together.
Before V34.1.0 they did not agree with the authored content at all: the walkable
box excluded the library, the warehouse and several buildable plot pads, so the
player could construct buildings they could never reach. Size the boundary from
measured content extents, never by eye.

## 6. Input Rules

- Use semantic buttons and inputs.
- Use `pointerup` plus guarded click fallback for battle HUD controls.
- Prevent duplicate activation after pointer events.
- Do not install broad document-level handlers that compete with native controls.
- Ensure inactive canvases and overlays cannot receive pointer events.
- Validate z-index and `pointer-events` in the actual viewport.

## 7. Testing Boundaries

### Cards regression suite

Open Cards → switch every category → change every sort → toggle Merge Ready → inspect and return → equip and remove → fill exactly six → Save Deck → merge where possible → navigate away and back → reload → repeat after orientation change.

### Protected battle suite

Start campaign → place tower/support/trap → pan → pinch → center → speed → pause/resume → win/lose → Hunt Again → Main Menu.

## 8. Refactoring Policy

Refactoring is allowed only after a stable behavior baseline exists. First add verification, then extract. Never combine a large architecture rewrite with a feature redesign or a bug repair.
