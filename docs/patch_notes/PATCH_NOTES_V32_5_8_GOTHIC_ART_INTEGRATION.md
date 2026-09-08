# The Village V32.5.8 — Gothic Art Integration

## Visual world changes

- Removed the remaining pale low-poly prototype houses from the authored Village layout.
- Integrated the supplied `house_lv01.png`, `house_lv02.png`, and `farm_plot.png` assets directly into the Three.js world.
- Preserved each artwork's original aspect ratio to prevent stretching.
- Level-one residences use the level-one house artwork.
- Larger, advanced, commercial, civic, and arcane structures use the level-two gothic artwork until their unique final artwork is supplied.
- Farms and agricultural plots now use the real farm artwork.
- Lumber and quarry landmarks now use gothic building artwork with small 3D resource props rather than generic white houses.
- Added warehouse crates and resource details where applicable.

## Construction plots

- Replaced bright square construction slabs with lower-profile circular grass lots.
- Added subtle stone rings around empty lots.
- Construction signs appear only while Build Mode is active and the lot is available.
- Occupied lots fade away beneath completed buildings.
- Existing 29-slot save mapping remains unchanged.

## Technical and compatibility work

- Preserved Shadow, resources, population, build catalog, menus, battle systems, and local save keys.
- Added versioned module and texture URLs to prevent Safari from reusing the previous renderer from cache.
- Updated startup verification text to:
  `THREE.JS WORLD ACTIVE · V32.5.8 · GOTHIC ART INTEGRATION`
- Corrected renderer cleanup so rebuilding saved plots does not dispose shared world materials.
