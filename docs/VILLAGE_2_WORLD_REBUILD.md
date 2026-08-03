# Village 2.0 World Rebuild

Village 2.0 keeps the existing account, cloud-save, local-save, battle, card,
relic, equipment, gem, companion, and campaign contracts intact. The legacy
29-slot plot object remains authoritative, with exactly the same plot indices,
so old settlements load without conversion or data loss.

## Architecture

- `src/Village/worldRegistry.js` is the data source for world bounds, districts,
  primary and secondary roads, landmarks, plot positions, model mappings, and
  citizen schedule destinations.
- `src/Village/economyModel.js` owns pure economy calculations: population,
  worker demand, staffing efficiency, per-hour production, storage capacity,
  and the twelve-hour offline cap.
- `src/Renderer/villageThreeWorld.js` consumes those registries and remains the
  sole visible Three.js Village renderer. The older DOM world is retained only
  as a failure fallback and is hidden whenever the Three.js world is active.
- `src/villageBootstrap.js` remains the UI/input bridge and construction catalog.
- `src/Battle/game.js` remains the persistence bridge but delegates Village
  economy math to the new pure module.

## Visual direction

The world is permanently clear, crisp night. Gameplay time still drives citizen
schedules, but never adds daylight wash, fog, cloud cover, or a full-screen tint.
Authored Gothic GLBs are grouped into Cathedral, keep, industrial, residential,
market, agricultural, and arcane districts. Connected stone avenues, secondary
walkways, two bridges, walls, lamps, sparse props, and prepared rectangular
foundations establish readable hierarchy without prototype circles.

The material atlas at `assets/village/v2/gothic_material_atlas_v2.png` supplies
cohesive cobblestone, slate, timber, and masonry surfaces. It is imported through
Vite and checked by the production asset validator.

## Economy and compatibility

Population is derived from housing and settlement size. Production buildings
request workers; insufficient population reduces passive production evenly.
Warehouses increase the passive production ceiling. Capacity never deletes an
existing balance or a one-time reward already above the ceiling—it only prevents
additional passive generation. Offline production remains capped at twelve hours.

`villageEconomy.economyVersion` is added idempotently. No existing resource,
building, plot, unlock, or progression value is lowered during migration.

## Validation

Run:

```text
npm run test:village-economy
npm run build
npm run test:production
```

Manual checks should cover an empty settlement, an old 29-plot settlement, build
mode, construction completion, staffed and understaffed production, a full
warehouse, twelve-hour offline return, keyboard movement, touch movement, citizen
road travel, camera obstruction fading, and repeated battle-to-Village returns.

## Known follow-up work

This pass establishes the production foundation without changing the save
contract. A future art-content pass can replace or further detail individual GLB
meshes without changing the registry or renderer. Building-level upgrade gameplay,
bespoke interiors for every structure, authored NPC dialogue trees, and a full
construction-worker simulation remain intentionally outside this compatibility
pass; the existing construction timer, interaction bridge, and progression gates
remain in service. Those are content/features, not hidden regressions in this
world foundation.
