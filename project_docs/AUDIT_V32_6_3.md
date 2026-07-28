# THE VILLAGE — V32.6.3 GOTHIC GLB PACK INTEGRATION

**Date:** 2026-07-27
**Baseline:** V32.6.2 HD Diorama Recovery
**Change:** the thirteen-model gothic GLB pack is now the *only* source of
building geometry in the 3D Village. Every placeholder system has been deleted.

---

## 1. What was removed

`src/Renderer/villageThreeWorld.js` previously contained five overlapping ways
to draw a building, none of them the real art:

| Removed | What it was | Lines |
| --- | --- | --- |
| `realGothicHouse()` | Cloned **one** GLB (`the_village_gothic_house_lv1.glb`) for *every* structure in the game, then bolted on loose cylinders, dodecahedrons and boxes to fake a lumber camp, a quarry or a warehouse | 34 |
| `dioramaBuilding()` | PNG-cropped "diorama" boxes built from `house_lv01/02.png` | 76 |
| `house()` | Fully procedural box + cone house with `farm`/`quarry`/`lumber` variants | 12 |
| `artFarm()` | Procedural farm built around `farm_plot.png` | 28 |
| `cathedral()` | A hand-assembled cathedral: nave, towers, spires, rose window, portal, steps | 38 |
| `cropTexture()` + `lv1Wall/lv1Roof/lv2Wall/lv2Roof` | Texture-atlas cropping that only fed the above | 21 |
| `buildingKind()` | Bucketed 32 build types into 4 crude shapes | 7 |
| `proceduralWall()` | Became unreachable once no building depended on a PNG | 6 |

`dioramaBuilding()` and `house()` were already **dead on arrival** — declared but
never called by anything.

The orphaned `assets/village/the_village_gothic_house_lv1.glb` (46 KB) has been
deleted from the build.

**Note:** `house_lv01.png`, `house_lv02.png` and `farm_plot.png` are *retained*.
They are no longer used for 3D geometry, but they are still the 2D card art in
the build menu and the menu backdrop, which is a legitimate separate use.

---

## 2. What replaced it

A single loader and a single placement function.

```
assets/village/The_Village_Gothic_GLBS_Phase1/
  house_lv1  house_lv2  farm  lumber_camp  quarry  warehouse
  library    alchemist  enchanter  blacksmith  tavern  keep  cathedral
```

- All thirteen models load in parallel at startup (234 KB total).
- Each is measured once with `THREE.Box3` so placement can **normalise scale and
  recentre the footprint**, rather than relying on hand-tuned magic numbers.
  Verified: the widest model lands at 6.20 units against a 6.90-unit plot pad.
- `placeModel(id, x, z, {rot, fit, scale, parent})` clones the template and gives
  each placement its own geometry and materials, so rebuilding the plot group can
  never dispose art still needed by future construction.
- Placements carry `userData.modelId` and `userData.buildType` for debugging.

### Build type → model

All 32 build types the Village can place now resolve to a real model:

| Model | Build types |
| --- | --- |
| `house_lv1` | house, almshouse |
| `house_lv2` | manor, bathhouse |
| `farm` | farm, orchard, herbGarden |
| `lumber_camp` | sawmill, stable |
| `quarry` | quarry, stonemason |
| `warehouse` | storehouse, market, tannery, well |
| `library` | library, observatory |
| `alchemist` | alchemist |
| `enchanter` | enchanter, runestone |
| `blacksmith` | blacksmith, workshop, armory |
| `tavern` | tavern |
| `keep` | keep, townhall, watchtower, barracks, palisade |
| `cathedral` | chapel, shrine, reliquary, graveyard |

`modelIdForType()` falls through to a keyword matcher, so a build type added
later still receives sensible art instead of a missing mesh.

Plots also apply a small deterministic per-plot yaw so a street of the same
building type does not read as a copy-pasted row.

### Authored landmarks

Rebuilt from the pack instead of procedural geometry:

| Model | Position | Fit |
| --- | --- | --- |
| cathedral | `0, -32` | 19 |
| keep | `-20, -30` | 13 |
| lumber_camp | `-43, -27` | 8.4 |
| blacksmith | `20, -30` | 8.2 |
| quarry | `38, -26` | 8.6 |
| farm | `-42, 31` | 9.2 |
| tavern | `40, 31` | 8.6 |
| library | `-30, 40` | 9.0 |
| warehouse | `30, 40` | 8.6 |

---

## 3. Failure behaviour

The V32.6.2 resilience rules still hold, now applied per model:

- **One model missing** → that model is substituted, a single `console.warn`
  names it, and the Village runs normally. Verified with four models forced to 404.
- **All models missing** → a clear thrown error, `No Village building models
  could be loaded from assets/village/The_Village_Gothic_GLBS_Phase1`, which the
  bootstrap surfaces through `describeLoadError()` while the 2D Village carries on.
- `dispose()` now also frees every template's geometry and materials and clears
  the template map.

---

## 4. Validation

- `node --check` on all five JavaScript sources
- `createVillageThreeWorld()` driven to completion against a Three.js stub using
  the manifest's **real** per-model bounds
- All 13 models confirmed requested; the old placeholder GLB confirmed *not*
  requested
- All 32 build types placed; the full distribution table above was produced from
  the running code, not written by hand
- Footprint normalisation measured against the plot pad diameter
- Partial-failure (4 of 13) and total-failure paths both exercised
- `dispose()` verified to free geometries and dispose the renderer

---

## 5. Still outstanding

Unchanged from `AUDIT_V32_6_2.md`: the orphaned Soul Reserve / Hunter Tavern
upgrades, `FRESH_START_TOKEN` still live, `styles.css` overgrowth, and
`src/Battle/game.js` remaining a single large controller.

New, minor: `the_village_main.png` still has no source in the build, so the menu
backdrop continues to borrow `house_lv02.png`.
