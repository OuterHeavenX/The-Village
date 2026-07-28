# The Village V32.5.5 — Final Layout & Real Building Placement

## Three.js Village
- Replaced procedural/random town placement with a fully authored fixed layout.
- Added 29 permanent Three.js construction plots mapped one-to-one to the existing legacy save-slot indexes.
- Preserved all previously constructed buildings without changing the save schema.
- Moved all construction plots onto dry land and away from river and bridge approaches.
- Retained the Cathedral in the northern center of the Village.
- Reworked tree and landmark placement into deterministic positions.
- Expanded terrain and river coverage to contain the full southern construction district.

## 3D Construction Interaction
- Empty Three.js plots now become visibly highlighted after a building is selected.
- Players can tap the glowing plot directly inside the Three.js canvas.
- The existing resource checks, spending, construction timers, economy updates, and save behavior remain authoritative.
- Occupied plots render the saved building and are no longer offered as build targets.

## Preserved
- Real animated pixel Shadow sprite and level-based sprite selection.
- Village resources, population, progression, build catalog, bottom navigation, campaign, cards, hunters, relics, Keep, familiars, research, and battle systems.
