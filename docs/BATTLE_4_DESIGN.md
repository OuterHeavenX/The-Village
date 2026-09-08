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

| Road | Gate tile | Door tile | Opens |
|---|---|---|---|
| south | (8, 17) | (8, 10) | wave 1 |
| west | (0, 9) | (6, 9) | first breach |
| north | (7, 0) | (7, 7) | second breach |
| east | (15, 8) | (9, 8) | third breach |

Roads are deliberately winding (a road tile count of 14–18 each) so towers have
long firing windows, and each road passes a different terrain feature: the south
road climbs a rise, the west fords a stream, the north cuts through a graveyard,
the east crosses a ruined orchard. Breach schedule per chapter reuses the
existing `OPEN_ROUTE` wave events in `roadRegistry.js`; `EXTEND_ROUTE` events
are not generated for the keep layout.

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

Budget: GLB under 3 MB, terrain under 40k triangles. First export: 623 kB,
14,853 triangles in total, 58 pads, roads of 14/13/12/13 tiles.

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
- **Not carried over yet** (still 2D-only): the synergy links between towers,
  level stars and gem badges above towers, the MGS alert, lane projectile
  art (lane shots are not drawn), the road-reveal dust, corpses' hit flash,
  boss camera shake beyond what `shakeOffset()` applies to the overlay.
  Projectiles are glow sprites in the shot's colour; particles are a single
  `Points` cloud (cap 900).
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
| Cards | Cards tab remake (see below) | Merged, replaces the screen |
| C | Bot parity (decision gaps, results, frame time) on iPhone/iPad profiles; flip default; 2D as WebGL fallback | Merged |

Each stage is a PR that leaves `main` playable.

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

## Open decisions

- Whether the keep should also be a *tower* (fires at enemies at its doors) —
  it would give the centre a reason to be defended beyond HP. Leaning yes,
  weak, for Stage C.
- Real tower and enemy models versus billboards. Billboards first; models are
  an art decision, not a runtime one.
