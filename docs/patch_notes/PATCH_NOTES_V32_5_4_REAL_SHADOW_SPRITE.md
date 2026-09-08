# The Village V32.5.4 — Real Shadow Sprite in Three.js

- Removed the temporary geometric/capsule Shadow character from the Three.js Village.
- Loads the actual Shadow walk sprite sheet already included in the game assets.
- Automatically selects Shadow levels 1–9 from the existing saved progression.
- Uses the supplied 6-column × 4-direction, 64-pixel-frame sheet layout.
- Preserves the original direction mapping: front/down, left, right, and back/up.
- Uses nearest-neighbor texture filtering to keep the pixel artwork crisp.
- Renders Shadow as a camera-facing Three.js sprite with transparent edges.
- Keeps all existing resources, construction records, menus, battle systems, and progression unchanged.
- Visible renderer status now reads: THREE.JS WORLD ACTIVE · V32.5.4 · REAL SHADOW SPRITE.
