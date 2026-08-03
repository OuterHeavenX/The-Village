# Battle New Generation Foundation

## Runtime architecture

- `Environment/battlefieldRenderer.js` owns the generated siege matte, vignette, restrained fog, and cracked-road rendering.
- `Environment/roadRegistry.js` owns deterministic entrance-to-cathedral route geometry and the painted-door anchor.
- `Environment/terrainRegistry.js` holds chapter terrain palettes.
- `Environment/cathedral.js` renders only aligned damage effects over the cathedral already painted in the matte.
- `battlefieldConfig.js` owns data-driven stage capacity and visual presets.
- `placementSystem.js` owns stage-scaled maxima, placement slots, road reachability, and player-facing placement feedback.
- `Towers/towerRegistry.js` defines the six coherent core towers and the three newly introduced runtime cards.
- `Towers/towerAnimations.js` provides the shared idle/charge/attack/recoil visual state language.
- `Cards/draftWeights.js` shifts tower weighting from 70% early to 10% late and removes attack towers at composition capacity.
- `waveDirector.js` supplies readable wave identities, controlled counts, and breathing periods.
- `projectileSystem.js` defines the separate projectile visual vocabulary for the core family.
- `developmentTelemetry.js` provides a Vite-development-only FPS and battle-state overlay.
- `economy.js` remains the cumulative milestone and hard-cap authority.

## Save and progression boundary

No persistent IDs were removed or renamed. Existing decks, cards, equipment, gems, Faith, Bravery, companions, relics, chapter progress, local saves, and cloud saves remain readable. Crossbow, Ballista, and Arcane Tower enter the existing unlock/reconciliation path. Enemy kills still do not award full permanent cards. Chapter rewards, fragments, equipment, the Golem arc, Dracula's Tooth, Shadow Level 2, and the permanent awakening save path remain intact.

## Composition and pacing

The painted matte is the physical battlefield. Normal play does not render the global grid, rectangular path cells, a duplicate cathedral, a Keep façade, or persistent logical zones. Authored lower-breach routes curve through the courtyard and converge at the painted door as continuous multiply-blended wear decals; placement foundations remain almost invisible until selection. Visual debug geometry is explicitly opt-in and never appears merely because the game runs locally.

Stages 1–5 allow 8 total structures (up to 6 attack and 2 support/utility), Stages 6–10 allow 10 (7/3), Stages 11–15 allow 12 (9/4), and Stages 16–20 allow 14 (10/5). These are maxima, not required compositions. Towers that cannot reach the road are rejected. Draft weighting evolves from 70/30 tower/utility early, through 50/50, to 10/90 late; full stages receive no new placement cards.

Waves carry visible identities (scouts, swarm, fast, armored, miniboss, mixed, elite, boss), cap routine spawn counts, and include explicit breathing periods. See `CAMPAIGN_BALANCE_REPORT_V35_2.md` for the 20-stage audit.

## Art asset

Battle 3.0 no longer uses a battlefield matte. `Environment/battlefieldRenderer.js` composes and caches ancient paving, packed earth, fortress walls, fences, graves, ruins, vegetation and lighting at runtime. Roads and breach structures are rendered from the active authored route state, so expanding and split routes physically belong to the world.

Final generation prompt summary: premium hand-painted dark gothic cursed-settlement siege field, elevated three-quarter view, quiet central play space, ruined walls and cathedral silhouettes around the perimeter, eclipse atmosphere, sparse fog/embers, no baked road, towers, characters, text, or UI.

The five additional production atlases live under `assets/towers/gothic_{axe,crossbow,ballista,holy,arcane}`. Each atlas uses the Dagger Tower's camera, material, and fixed-base language, with idle, charge, attack, recoil, recovery, and physical upgrade components. The transparent production files are bundled as hashed Vite assets. Their shared prompt specified a crisp gothic pixel-art/concept-art hybrid, black stone, weathered silver, brass and crimson materials, fixed bases, weapon-specific moving mechanisms, and no text, border, baked environment, or scale-pop animation.

## Known limitations for manual review

- Stage 5 and Stage 10 still require human placement/deck playtests. Automated production smoke validates every stage's initialization and the complete Stage 10 awakening sequence, but cannot judge human strategy feel.
- The atlas files prioritize visual quality and total about 5.2 MB before transfer compression. They load once through Vite URLs and are browser-cached; a future art pass may losslessly optimize them without changing runtime contracts.
- The legacy `game.js` still coordinates established save, UI, hero, companion, relic, and combat hooks. New-generation subsystems are extracted at their data/rendering boundaries without risking a one-release rewrite of those preserved contracts.
