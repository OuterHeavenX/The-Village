THE VILLAGE — V32.4.2 STABILITY, OPTIMISATION & HOMAGE AUDIT

The last safe haven is now the heart of the game.

Run locally (dev server):
1. npm install
2. npm run dev -- --host 0.0.0.0 --port 8080
3. Open the shown local address.

Build for production:
1. npm install
2. npm run build
3. Serve the generated dist/ folder.

Existing save data is preserved under the legacy storage key so players upgrading from Relics of the Kingdom do not lose progress.

Code layout:
- index.html loads src/main.js, which wires up villageBootstrap.js, the battle
  engine (src/Battle/game.js), and the optional Three.js atmosphere renderer.
  The atmosphere layer is loaded through import().catch() because it pulls
  Three.js from a CDN; the game runs unchanged without it. These files are
  always the live, current build — there are no parallel "-vNN" copies.
- src/villageBootstrap.js is the sole owner of the Village. The legacy V22.3b
  controller that used to sit unreachable inside game.js was removed in V32.4.2.
- project_docs/ holds the architecture notes and the numbered code audits.
  Start with project_docs/AUDIT_V32_4_2.md for the current state.
- docs/patch_notes/ contains the full history of dated patch notes.
- docs/ also has the older V19 README and audit report for historical reference.

Easter eggs:
- Konami code (or seven quick taps on the menu title) — Vampire Killer mode.
- Dial 140.85: type 14085, or triple-tap the weather readout during a hunt.
- Five quick taps on the Profile stat grid.


V32.6.0: First HD diorama foundation pass. Buildings now use real 3D geometry textured from the supplied gothic art; Cathedral rebuilt as dark 3D geometry; terrain banks and terraces added.
