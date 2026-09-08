# The Village V32.5.0 — Three.js Village World

## Major conversion
- Replaced the visible authored 2D Village backdrop with a real-time Three.js scene.
- Added a fixed front-facing RPG camera that automatically follows Shadow.
- No free camera rotation, panning, or player zoom controls.
- Preserved the Cathedral in the northern center of the Village.
- Added true 3D terrain, roads, river, bridges, gothic structures, trees, lamps, fog, moonlight, shadows, and emissive windows.

## Progression and save preservation
- Existing `relicsEclipseSave` data remains untouched.
- Existing Village economy resources, gold, food, wood, stone, iron, essence, population, research, battle progress, cards, familiars, Keep progress, and chapter progression remain on their original save paths.
- Existing construction plot key and placed-building values are still read directly.
- Existing built structures are represented in the 3D plot districts and refresh after construction changes.

## UI preservation
- Build catalog remains intact.
- Village economy/resource HUD remains intact.
- Static bottom navigation remains intact.
- Existing Battle, Cards, Hunters, Keep, Forge, Relics, Codex, and settings navigation remains intact.
- Existing touch joystick and interaction button remain intact.

## Architecture
- Added `src/Renderer/villageThreeWorld.js`.
- Three.js is loaded as a version-pinned browser ES module (`0.179.1`).
- The existing Village controller remains the source of truth for movement, collision, saving, economy, interactions, construction, and navigation.
- The new renderer observes the existing state rather than replacing or migrating save data.

## Fallback
- If Three.js cannot load, the preserved legacy Village renderer remains available and an error is logged rather than damaging progress.
