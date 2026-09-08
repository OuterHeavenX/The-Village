# Battle 4.0 — Siege of the Keep

Design and staging for the reconstruction of the tower-defense presentation.
This document is the source of truth across sessions; update it when a
decision changes.

## Why

The current battle is a Canvas 2D board with a road that grows longer at set
waves. Playtesting with a bot (see `CHANGELOG.md`, PR #3/#4) fixed its pacing,
but the *form* is still the complaint: a flat matte, a road that extends for no
reason the player can see, and a cathedral pinned to the top edge.

## What changes and what does not

**Does not change.** The simulation: enemies, towers, cards, drafts, Essence,
upgrades, wave director, bosses, relics, rewards, saves. `src/Battle/game.js`
keeps owning `G`. Every field in the save keeps its shape.

**Changes.** The battlefield's *space* and its *presentation*:

- a real 3D field rendered with Three.js from a Blender-built GLB, with hills,
  grass and a keep — not a painted matte;
- the keep in the centre, approached from the perimeter, not a gate at the top;
- **no road growth.** Every road exists in full from the first wave. Escalation
  comes from *breaches*: sealed gates in the perimeter wall that collapse at
  authored waves and open a second, then a third front. The player can see the
  sealed gates from the start and knows where the next front will come from.

## The arena

Sim grid stays 16 × 18 tiles (`GRID`), so placement, routes, range and
reachability code is untouched. The keep occupies a 2 × 2 block at the centre
(tiles 7–8 × 8–9). Four authored roads run from the perimeter to a door on each
side of the keep:

| Road | Gate tile | Door tile | Opens | Length |
|---|---|---|---|---|
| south | (8, 17) | (8, 10) | wave 1 | 18 tiles |
| west | (0, 9) | (8, 10), via the south road's last 6 tiles | first breach | 16 tiles |
| north | (7, 0) | (7, 7) | second breach | 16 tiles |
| east | (15, 8) | (7, 7), via the north road's last 5 tiles | third breach | 16 tiles |

Roads are deliberately winding (16–18 tiles each) so towers have long firing
windows. The breach roads merge into the first road of their pair for the
final approach, the way a cathedral branch shares its trunk: towers already
guarding a door cover the new front's last stretch instead of a second
full-length road arriving undefended (the Stage C bot lost every chapter 2–3
run before this change). The generator only allows sharing as a common
suffix, so roads merge and never cross. Breach schedule per chapter reuses the
existing `OPEN_ROUTE` wave events in `roadRegistry.js`; `EXTEND_ROUTE` events
are not generated for the keep layout. The schedule mirrors the cathedral
board's front count: chapters 1–4 open one gate in their last three waves,
chapters 5–10 open two (after waves 4 and 8), chapter 11 on opens all three
(after waves 2, 5 and 8).

Enemies attack the door their road ends at. `routePoints()` appends the road's
own door tile as its terminal point in the keep layout instead of the single
`CATHEDRAL` gate; gate HP stays one shared pool.

## Blender pipeline

`tools/blender/build_battlefield.py` builds the arena headlessly with the
`bpy` module and exports `assets/battlefield3d/keep_arena.glb`. Everything is
procedural from the road table above, so a road change is a table edit and a
re-export, never hand modelling:

- terrain: a 16 × 18 tile plane (1 tile = 1 world unit) subdivided to 4
  vertices per tile, displaced by layered noise for hills, flattened under the
  keep and along every road corridor (with a soft shoulder), and clamped below
  the wall line at the perimeter;
- vertex colours carry the material mask (R = road, G = grass density, B =
  rock/worn) so the runtime needs no extra textures for terrain shading and
  knows where grass may grow;
- keep: a blockout — plinth, four walls, four corner towers, four doors — sized
  to the 2 × 2 tile footprint; replaceable by a modelled asset later without
  touching the runtime;
- perimeter wall with a gate arch at each road entrance and a rubble pile
  sealing every gate except the south one;
- placement pads: flat discs baked at every tile orthogonally adjacent to a road
  (the same rule as `placementSlots()`), named `pad_x_y`, so the runtime can
  show, hide and highlight them per tile;
- a grass blade mesh and a road-edge stone mesh exported as named objects for
  instancing.

Budget: GLB under 3 MB, terrain under 40k triangles. Current export: 705 kB,
16,221 triangles in total, 76 pads, roads of 18/16/16/16 tiles (the first
export had 14/13/12/13-tile roads and 58 pads; see Stage C for why they grew).

The Workbench preview render needs a GL context, which the headless `bpy`
wheel does not have on a server without `libEGL`; Blender aborts the whole
process rather than raising, so the preview is opt-in
(`BATTLEFIELD_PREVIEW=1`) and runs only after the GLB has been written. The
export was reviewed instead by loading the GLB into Three.js in headless
Chromium (SwiftShader), which is also the path the runtime will use.

## Runtime (`src/Battle3D/`)

- `battlefieldScene.js` — loads the GLB, builds the scene, camera and lights.
  Camera: perspective, three-quarter view from the south, orbit ±35° by drag,
  pinch/wheel zoom, recentre on the keep. Same input contract as the 2D battle
  (Pointer Events, capture, cancel recovery).
- `grassField.js` — `InstancedMesh` grass placed by the vertex-colour density
  mask with a wind vertex shader. Budgets: desktop 24k blades, tablet 10k,
  phone 5k; no grass shadows.
- `spriteLayer.js` — enemies, towers, Shadow, familiar and projectiles as
  camera-facing quads using the existing sprite sheets and tower atlases, with
  the same frame/direction logic as the 2D renderer. Real tower models are a
  later art pass; nothing in the runtime assumes them.
- `battleBridge.js` — the only seam to `game.js`: a read-only view of `G`
  (enemies, towers, routes, pads, hero, shots, particles, camera intent) and two
  calls back (tile tapped, camera recentre). The 2D renderer is not modified.
- `layout.js` — tile ↔ world mapping and the keep-layout road table shared with
  `roadRegistry.js`.

Mounting: `?battle3d=1`, or the ♫ panel → "3D Battlefield (preview)", stored
in `village.battle3d` (excluded from cloud sync). The choice applies to the
next battle. While a keep-layout battle runs, a `#battle3d` WebGL canvas sits
*under* the 2D battle canvas, which turns transparent and keeps doing what it
did: pointer capture, gestures, and a screen-space overlay (health bars, damage
numbers, the hit flash) projected from the 3D camera. The 2D battle stays the
default until Stage C.

### Stage B as built (differs from the plan above where noted)

- **Camera.** Drag pans and pinch/wheel zooms, driven by the *same*
  `G.camera` the 2D board uses, so recentre, boss focus and the clamp all work
  unchanged. There is no orbit yet; a fixed 50° pitch from the south reads
  the hills and keeps sprites upright. Framing is "cover" like the 2D board:
  the whole width on landscape, the whole depth on portrait, pan for the rest.
- **The keep** is the Village's own `keep.glb` (584 triangles) scaled to the
  2 × 2 tile footprint, not the Blender blockout — the blockout's doors stay,
  its walls are hidden. The arena is dressed with the same set's dead trees,
  rock clusters and lamp posts, placed only on tiles that are neither road nor
  pad. The keep's walls glow red as gate HP falls.
- **Sprites.** Enemies, corpses, Shadow and the familiar are upright quads
  with per-frame UVs into the existing sheets (64 or 128 px cells), leaning
  back a quarter of the camera pitch so they are not foreshortened. Towers
  are the existing 2D tower art rasterised once per
  (id, level, animation phase, supports) into a 128 px canvas and shown the
  same way; `rasterTower()` in `game.js` swaps the module's `ctx` for one
  call, which is why `ctx` became `let`.
- **Carried over after Stage C:** synergy links (flat additive strips between
  towers with the mote riding each), level stars, support icons and gem
  badges (projected overlay), lane shots (a strip that grows along the lane),
  the "!" alert, the boss camera swing (the tour now carries a world focus
  point and a 0–1 weight that the 3D camera blends toward), and the breach
  reveal (rubble sinks away over 0.8 s, reveal rings on the new road).
  Still 2D-only: corpses' hit flash and the boss screen shake beyond what
  `shakeOffset()` applies to the overlay. Projectiles are glow sprites in the
  shot's colour; particles are a single `Points` cloud (cap 900).
- **Grass** samples the terrain's vertex-colour G channel: 21.8k blades on
  desktop, 4.6k on the phone tier (`(pointer:coarse)` and a short side under
  700 px), with a vertex-shader sway. Draw calls sit around 60 before towers
  and dressing, 125 with them.
- **Bot hooks** on `window.VillageBattleAPI`: `pads()` (placement slots with
  validity), `tapTile(x, y)` (taps a tile through whichever battlefield is
  showing), `routes()` (layout, open routes, points, breach events), and
  `state()` now reports `layout`, `battle3d`, `wave`, `hp`, `kills`,
  `enemies` and `pendingCard`.

Verified in headless Chromium (SwiftShader) at 1440 × 900 and 390 × 844: the
scene loads, placement through the raycast lands on the intended tile, the
west gate opens at the authored wave with its rubble removed, pan/zoom/centre
work, the classic 2D battle is unchanged with the flag off, and the console
stays clean. **Not verified:** frame rate on real GPUs and phones (software
rendering says nothing useful), Safari, and long sessions for WebGL memory.

Mobile: the Village already owns a WebGL context; the battlefield takes its own
only while a battle is running and disposes it on exit, so the two never
coexist. If context creation fails the 2D battle runs as before.

## Staging

| Stage | Deliverable | Ships as |
|---|---|---|
| A | This document, the Blender generator, the GLB | Committed, unused by the game |
| B | `src/Battle3D/` behind the flag; keep-layout roads with breaches | Merged, off by default (this PR) |
| Cards | Cards tab remake (see below) | This PR, replaces the screen |
| C | Bot parity on both boards; keep-layout tuning; flip default; 2D as WebGL fallback | This PR |

Each stage is a PR that leaves `main` playable.

### Look pass (after Stage C)

The first 3D board was a blockout: flat colours, one light, cardboard
sprites. The look pass keeps the pipeline and changes what it draws:

- **Linear pipeline with a grade.** The scene renders linear into an
  `EffectComposer`; a final pass does exposure, ACES, a gothic grade (cool
  shadows, faintly warm highlights), a vignette and the sRGB encode. Bloom
  (`UnrealBloomPass` at half resolution) on desktop and tablet only.
- **Lighting.** A shadow-casting moon (2048 px map on desktop, 1024 on
  tablet, none on phones) over a low hemisphere; warm flickering point lights
  with a flame sprite at each keep door and lamp post (8 / 4 / 2 by tier);
  the keep's window material glows and blooms.
- **Surfaces, no image textures.** The terrain is a `MeshStandardMaterial`
  whose fragment shader builds grass, dirt shoulders, cobbles (a cell
  pattern with grout) and rock from the vertex-colour mask and noise. Every
  model material gets a triplanar masonry pattern from the same GLSL, taken
  from the per-fragment normal because the Village models ship without
  vertex normals (a vertex-stage normal made them render black).
- **Sky.** A gradient dome, a moon disc and a scatter of stars beyond the fog.
- **Camera** at 42° instead of 50°, closer to the ground.
- **Grounded sprites.** A soft contact shadow under every enemy and tower;
  on desktop the billboards also cast real silhouette shadows through a
  depth material that honours their alpha.

`?look=noshadow,nostone,nopost,nokeepstone,nokeepemissive` switch pieces off
for comparison. Everything above is unverified on real GPUs; the phone tier
is the cheapest configuration and `?battle3d=0` remains the escape hatch.

## Cards tab remake

Replace the internals of `#deckScreen` with `src/Cards/cardsScreen.js` and one
stylesheet, `src/UI/cards3.css`, with no `!important` cascade.

- One layout that adapts, not three: a sticky header (deck counter, filter
  chips, sort), a virtualised collection grid (2 columns on phones, 3–4 on
  tablets, 5–6 on desktop), and a sticky six-slot deck strip at the bottom
  (above the nav on phones, docked right on desktop).
- Card detail opens as a bottom sheet on touch devices and a side panel on
  desktop; it hosts equip/remove, favourite, merge, gem slots and the passive
  ground-defence slots.
- Tap a collection card to equip into the first empty slot; tap a slot to swap
  or remove; pointer drag between them where pointer events allow.
- Keeps every save field (`deck`, `inventory`, `favorites`, `ui.cardFilter`,
  `ui.cardSort`, `groundDefenseSlots`) and every existing action.
- Verified at 390, 834, 1024 and 1440 px with the same sweep used for the
  phone fixes.

### As built

`src/Cards/cardsScreen.js` builds the whole of `#deckScreen` and receives the
rules from `game.js` through a `deps` object (card lookups, equip/merge/gem
functions, the ascension and hero-file renderers, toasts, screen switching);
`renderDeck()` and `showCardDetail()` in `game.js` are one-line wrappers. The
old inspect screen, its inline return handler, the capture-phase controller
and `cards2.css` are gone.

- The collection is not virtualised: it is 32 cards, so
  `content-visibility:auto` on each card is enough and far simpler.
- Card faces still come from `cardHTML()` / `miniCardHTML()`; their class
  names are rewritten on the way in (`card-art` → `c3x-art` and so on) so the
  legacy `#deckScreen` rules in `styles.css`, many of them `!important`, can
  no longer reach them. Those legacy rules are left in place because the
  Hero file and the ascension inventory panels still use them.
- Equip paths: tap a card for the sheet and its primary button; the `+`/`−`
  corner button equips into the first free slot or removes; with a full deck
  `+` enters swap mode and the next slot tap swaps; long-press (touch) or
  drag (mouse) a card onto a slot, or a slot card back onto the collection
  to remove it.
- Verified in headless Chromium at 390, 834, 1024 and 1440: layout, chips,
  the equipment and passives panels, the detail sheet/panel, `−`/`+`, mouse
  drag to a slot, touch long-press drag to a slot (834 profile), no console
  errors. **Not verified:** real hardware and Safari.

## Stage C — parity and the default flip

A bot played whole chapters on both boards through `VillageBattleAPI`:
`step(seconds)` advances the simulation in fixed 1/60 s steps regardless of
frame rate (so software rendering does not slow the game down), drafts are
picked from the DOM (defense first, then support, then skills), placement
uses `placementOptions()` (valid tiles for the held card, ranked by how many
open-route tiles are in range, then by distance to the gate), upgrades take
the first enabled stat, and the next wave is called only with two or fewer
enemies alive and the gate at 18+.

What the runs found, and what changed because of them:

- **Roads were too short.** 12–14 tile roads gave towers ~30% less firing
  time than the cathedral road that grows from 14 to 23 tiles. The generator's
  road table now yields 16–18 tiles per road (76 pads instead of 58), and the
  keep layout applies `KEEP_LAYOUT_TUNING.enemySpeed` (0.82) at spawn so
  travel time matches the cathedral board's.
- **The second front came far too early.** Opening the west gate after wave 4
  of chapters 2–4 lost every run; the cathedral board has one road until
  chapter 5. Chapters 1–4 now breach once, in their last three waves; 5–10
  after waves 4 and 8; 11+ after 2, 5 and 8.
- **A breach road arrived undefended.** Even with the late breach, a
  full-length second road ending at its own door lost every chapter 2–3 run:
  the cathedral board's second branch shares a trunk with the first, so the
  towers at the base already cover it. The west road now merges into the
  south road's last six tiles and the east road into the north road's last
  five.
- **The early-call lever was open twice as often.** The cathedral board locks
  "Next Wave" on road-growth waves and every third wave; the keep layout has
  no growth, so the bot (and a player) could compress a chapter by ~45%. The
  keep layout now also locks even waves, which matches the cathedral cadence.
- **Chapter clears crashed on Passive Card rewards** (`bearTrap` in chapter
  1's reward list is not in `CARD_POOL`); the results screen fell into its
  recovery path. Fixed in `finalizeChapterClear`.

Results (same bot, same policy; "3D" is the keep layout as shipped, "2D" the
cathedral board; wins / runs, with the gate's lowest HP in winning runs):

| Chapter | 2D board | 3D keep, as shipped | 3D keep before the fixes above |
|---|---|---|---|
| 1 (8 waves, 1 breach) | 4 / 4, gate ≥ 30 | 2 / 2, gate ≥ 30 | 5 / 6 |
| 2 (10 waves) | 6 / 7, gate ≥ 3 | 2 / 2, gate ≥ 10 | 0 / 11 |
| 3 (12 waves) | 4 / 7, gate ≥ 18 | 2 / 2, gate ≥ 11 | 0 / 11 |

Sim seconds per chapter on the shipped layout (223–271 s, 318–363 s,
569–584 s) now sit within the 2D board's range. The full logs are not
committed; the bot is `bot-parity` in the session notes and is reproducible
from the `VillageBattleAPI` hooks above.

Paint cost under SwiftShader (software GL) was 15–70 ms per frame on the 3D
board against ~2 ms on the 2D board; that number is the CPU emulating a GPU
and says nothing about real devices, which remain **not verified** (see
`KNOWN_ISSUES.md`). `?battle3d=0` is the escape hatch.

## Open decisions

- Whether the keep should also be a *tower* (fires at enemies at its doors) —
  it would give the centre a reason to be defended beyond HP. Leaning yes,
  weak, for Stage C.
- Real tower and enemy models versus billboards. Billboards first; models are
  an art decision, not a runtime one.
