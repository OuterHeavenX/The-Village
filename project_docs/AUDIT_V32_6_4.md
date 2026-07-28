# THE VILLAGE — V32.6.4 SHADOW ACNE & DEPTH PRECISION FIX

**Date:** 2026-07-27
**Baseline:** V32.6.3 Gothic GLB Pack
**Reported symptom:** "the roofs to all structures flash as I walk" — regular
striping crawling across lit roof and wall faces whenever the camera moved.

## Root cause — a regression introduced in V32.6.2

This was **shadow acne**, and V32.6.2 caused it.

To reduce GPU memory on iPad, V32.6.2 halved the directional light's shadow map
from 2048² to 1024² on mobile. It did not touch the bias values, which had been
tuned for 2048².

Halving the map **doubles the world-space size of a shadow texel**:

| Map | Ortho box | Texel size | `normalBias` required (~1.7x texel) | `normalBias` set |
| --- | --- | --- | --- | --- |
| 2048² (desktop) | 110 x 110 | 0.0537 | ~0.091 | 0.025 |
| 1024² (mobile, V32.6.2) | 110 x 110 | 0.1074 | ~0.183 | 0.025 — **4.3x too small** |

With the offset that far short of the depth error, every surface facing the moon
shadowed *itself* in stripes. And because the camera translates while the shadow
map does not, the striping crawled across the roofs as the player walked — the
"flashing" in the report.

Two further settings made it worse:

- **`moon.shadow.camera` near/far were left at the Three.js directional-light
  defaults of 0.5 / 500.** The light sits ~53.6 units from the origin and the
  scene is ~110 across, so the useful range is roughly 1 to 140. The default
  threw away about 3.6x of the shadow map's depth resolution.
- **The main camera was `near = 0.1, far = 300`** — a 3000:1 ratio. On a 16-bit
  mobile depth buffer that is 0.98 world units of precision at the far side of
  the village, which is enough for genuine z-fighting on top of the acne.

## Fixes

1. **Bias is now derived from geometry, not hard-coded.**
   ```js
   const SHADOW_TEXEL = (SHADOW_EXTENT * 2) / SHADOW_MAP_SIZE;
   moon.shadow.normalBias = SHADOW_TEXEL * 1.7;
   moon.shadow.bias = -0.0005;
   ```
   Changing the resolution or the frustum can never desynchronise them again.
   Measured: 0.1727 at 1024², 0.0863 at 2048² — correct at both.

2. **Shadow depth range tightened** from 0.5/500 to 1/140, recovering ~3.6x of
   the shadow map's depth resolution.

3. **Main camera near plane 0.1 → 1** (far 300 → 260). The follow camera sits at
   a fixed (0, 16, 22) offset so nothing is ever within ~15 units of it; this is
   free and buys ~10x the depth precision. At 80 units out on a 16-bit buffer
   that is 0.098 world units instead of 0.98.

4. **The shadow map is now baked on demand instead of every frame.**
   Every caster in the Village is static — buildings, terrain and trees — and the
   player is a `Sprite`, which Three.js never casts from. Re-rendering the entire
   village into the depth map 60 times a second was pure waste on an iPad, and
   re-projecting it each frame is also what let residual acne crawl.
   `renderer.shadowMap.autoUpdate = false`, with `requestShadowUpdate()` called:
   - once at startup, after every static caster is in the scene;
   - on `rebuildPlots()`, because construction adds a caster;
   - on `webglcontextrestored`, because a restored context has an empty map.

   Measured: **0 shadow bakes across 180 frames** (previously 180), and exactly
   one rebake per construction.

   *Caveat:* the ambient tree sway (±0.012 rad, 0.7°) no longer animates in
   shadow. At this scale and camera distance it is not perceptible.

## Validation

- `node --check` on all five sources
- `createVillageThreeWorld()` driven to completion against a Three.js stub under
  both an iPad and a desktop user-agent
- `normalBias` asserted equal to 1.7 x the measured texel size on both profiles
- Shadow bake counter instrumented: 0 across 180 simulated frames, 1 after
  construction
- Camera and shadow-frustum ranges asserted

## Unchanged

Everything listed under "Still outstanding" in `AUDIT_V32_6_3.md`.
