# Village 2.0 Bespoke Art and Architecture Pass

This pass replaces the most visible generic architecture with an authored Gothic
visual language while preserving every Village save and gameplay contract.

## New art

`assets/village/v2/gothic_architecture_atlas_v2.png` contains four production
surfaces: carved basalt tracery, stained glass, aged copper roof tiles, and
wrought iron. Vite fingerprints the atlas and the production validator requires
the emitted file.

## Bespoke structures

`src/Village/bespokeArchitecture.js` constructs the Cathedral, river bridges,
and district gateways from reusable architectural components. The Cathedral has
a raised sacred precinct, layered nave, twin bell towers, copper spires, carved
front screen, rose window, lancets, monumental iron gate, buttresses, banners,
gargoyle silhouettes, steps, and localized sanctuary lighting.

The former generic Cathedral GLB is no longer placed. Generic bridge GLBs are no
longer stacked over the procedural bridge deck. Bridges now share the Cathedral
masonry, ironwork, lamps, piers, and rail language.

## World composition

Seven irregular paved precincts visually identify the sacred, keep, industrial,
residential, market, agricultural, and arcane districts without exposing a tile
grid. Three physical gateways create transitions between the Cathedral road,
northern district, and market approach. Empty construction foundations are hidden
during exploration and appear only as contextual build-mode feedback.

Existing GLB landmarks now inherit the bespoke copper, masonry, stained-glass,
wood, and iron surface families when their material names expose the appropriate
architectural role. The perimeter wall uses dark masonry rather than white brick.

## Compatibility

No plot index, building identifier, collision rule, save key, resource value,
construction cost, production rate, account field, battle system, progression
gate, or cloud-save contract changes in this pass.
# Runtime replacement correction

The earlier atlas/material pass did not replace the silhouettes instantiated by
the live Village. The production renderer now routes every residential,
production, commerce, civic, military, arcane and chapel building through
`src/Village/authoredBuildingFactory.js`. The Phase 1 GLBs remain available only
for small environmental props. Permanent midnight is now the only Village clock
state, and the production QA captures live in
`test-results/village-overhaul-runtime/`.
