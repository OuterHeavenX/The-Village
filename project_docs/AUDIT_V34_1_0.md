# THE VILLAGE — V34.1.0 PERFORMANCE, LEGIBILITY & BOUNDARY AUDIT

**Date:** 2026-07-28
**Baseline:** V34.0.0 Battle Juice
**Brief:** battle framerate regression, save/load review, card legibility,
invisible collision in the Village, boundary walls, dead code, general optimise.

---

## 1. The battle slowdown — measured, not guessed

`ctx.shadowBlur` was being set **inside four per-entity draw loops**: per tower,
per shot, per lane shot and per soul particle. Canvas2D implements shadowBlur by
rendering into a scratch surface and running a gaussian blur over it, so the cost
scales with the number of entities on screen — which is precisely why the game
degraded as a wave got busier.

Instrumented against a heavy but realistic wave (18 towers, 26 enemies, 20 shots,
4 lane shots, 900 particles), counting `shadowBlur` activations over 60 frames:

| Build | shadowBlur activations / frame |
| --- | --- |
| V34.0.0 | **331** |
| V34.1.0 | **3** |

### Fixes

- **Cached glow sprites.** `glowSprite(color)` rasterises a radial gradient once
  per colour into an offscreen canvas; `drawGlow()` blits it with `drawImage`.
  Applied to soul particles, the scripture shot trail and the familiar orb.
- **Tower drop shadow.** The tower loop used `shadowBlur=12` with a black shadow
  colour — a drop shadow, not a glow. Replaced with a flat offset ellipse, which
  reads identically at this camera distance.
- **Lane shots.** Replaced the blurred stroke with three layered strokes
  (wide/translucent, mid, thin white core).
- The three remaining `shadowBlur` uses (cathedral facade, two braziers, the
  selected-tower ring) are **bounded** — they do not scale with entity count.

### Particle budget

Nothing bounded `G.particles`. A skeleton death pushes 18, a boss death 16, and
`crossSkill` pushes **80 in a single call**; a wave clearing several elites could
stack past a thousand live particles, each costing an update, a filter pass and a
draw every frame, forever.

`MAX_PARTICLES = 420`, enforced by `trimParticles()` (oldest dropped first).
Deliberately called from `loop()` rather than `update()`, because `update()`
early-returns on pause and hit-stop — particles spawned by a boss death
immediately before a draft pause would otherwise never be trimmed.
`G.floaters` is capped at 90 for the same reason (floating text is `fillText`,
which is not cheap either).

Verified: 900 particles injected, 420 live after one frame.

---

## 2. A regression I introduced and caught

The first pass at dead-code removal used a non-greedy multiline regex to excise
function bodies. It **over-matched and silently deleted ten functions it should
not have**, including `cameraTransform`, `validTowerTile`, `placeRoadPiece`,
`appendRouteTile`, `roadCells` and `adjacent4`. The build still passed
`node --check`; it would have thrown `ReferenceError: cameraTransform is not
defined` on the first frame of the first battle.

It was caught because the performance harness crashed. The file was discarded,
the edits were reapplied from clean source as verified string replacements, and
the dead-code removal was redone with **brace-matched extents plus an assertion
that no other function name appears inside the block being deleted**.

Recorded here because it is exactly the class of change that ships quietly.

Genuinely dead, now removed: `heroDefBonusXp`, `renderCollection`,
`roadAdjacencyCount`, `validPathTile`.

---

## 3. Save / load review

The portable save system introduced in V33.0.1 was reviewed rather than rebuilt,
because it already works. Round trip tested end to end:

- Export → **wipe all storage** → import → verified `bestWave`, campaign
  progress, card unlocks and Village construction plots all returned intact.
- Only keys matching the Village pattern travel; unrelated site data is not
  collected and not written. Verified with a decoy key.
- `backupCurrentStorage('before-import')` runs before any import, so a bad file
  cannot destroy progress.
- A malformed file is rejected with no storage mutation. Verified.

### One real defect fixed

The import picker was declared `<input type="file" ... hidden>`. `hidden`
resolves to `display:none`, and **iOS Safari will not open the Files picker for a
`display:none` input triggered from script.** On iPad, Import Save did nothing.
It is now offscreen-but-rendered via `.visually-hidden-input`, and `accept` also
lists `text/json` for Files app variance.

**Where it lives:** More → Save Manager → Export Save / Import Save.

---

## 4. Invisible collision in the Village — and what it was really hiding

The walkable box was `x -47..47, z -36..36` while the ground plane runs
`x -56..56, z -50..50`. But the interesting part is not the empty margin, it is
what the box excluded. Measured from the authored layout and the GLB manifest:

| Content | Extent | Inside old box? |
| --- | --- | --- |
| cathedral | z -41.2 .. -22.8 | partly outside |
| library | z 36.9 .. 43.1 | **entirely outside** |
| warehouse | z 36.6 .. 43.4 | **entirely outside** |
| plot pads | z -19.5 .. 44.5 | **northern plots outside** |

So the Hunter stopped dead against nothing, two authored landmarks could never be
reached, and there were **buildable plots the player could construct on but never
walk to**.

The boundary is now sized from the content: `x -51..51, z -45..48`. The same
numbers appear in `villageThreeWorld.js` (`WALL`) and `villageBootstrap.js`
(`THREE_WORLD_BOUNDS`), each commented to point at the other.

---

## 5. White brick boundary walls

The boundary is now visible, so where you can walk and what you can see agree.

- Procedural white brick texture with per-brick tonal variation and mortar
  courses, tiled to each run's length rather than stretched.
- Six wall runs (east and west unbroken; north and south split around the river),
  each with a stone cap course.
- A **water gate** where the river crosses: two piers and a low arch, so the gap
  reads as intentional rather than as a hole.
- Four corner towers with conical roofs and lit lanterns.
- Seven trees that would have intersected the new wall line were pulled inside it.

Cost: ~34 additional meshes. The shadow map is still baked once (V32.6.4), so the
walls add no per-frame shadow cost.

---

## 6. Validation

- `node --check` on all five sources
- `game.js` evaluated against an instrumented DOM/Canvas/WebAudio stub that
  counts canvas operations
- 60 frames of a heavy wave measured before and after (331 → 3 blurs/frame)
- Particle cap asserted under a 900-particle injection
- Function inventory diffed before and after dead-code removal: zero unintended
  losses
- Save export → wipe → import round trip, decoy-key isolation, pre-import backup,
  malformed-file rejection
- 3D Village built to completion with the wall ring; `dispose()` clean
- Wall and collision constants asserted identical across the two files

---

## 7. Still outstanding

- **The 3D Village draws ~426 meshes per frame** (the walls account for ~34 of
  that; sprite citizens and terrain detail make up most of the rest). This is not
  what caused the battle slowdown, but it is the next thing worth attention on
  iPad — merging static terrain into fewer draw calls is the obvious win.
- `routePoints()` is still computed before the `e.dead` check in the enemy update
  loop. It is memoised so the cost is trivial, but the ordering is sloppy.
- Carried over from earlier audits: the orphaned Soul Reserve / Hunter Tavern
  upgrades, `FRESH_START_TOKEN` still live, `styles.css` overgrowth, and
  `src/Battle/game.js` remaining a single large controller.
