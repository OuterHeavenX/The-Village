# THE VILLAGE — CHANGELOG

Release history, newest first. This file was previously `PROJECT_STATE.md`; it
had grown into a 6,400-line running log rather than a statement of current
state, so it was renamed to what it actually is. `PROJECT_STATE.md` is now a
short snapshot of the game as it stands today.

Entries from V36.0.0 downwards are the original release notes, unedited. The
per-release patch notes they summarise are in `docs/patch_notes/`.

## Unreleased — Audit and stabilisation pass

Engineering pass over the V36.0.0 baseline. No gameplay content was added or
removed; existing saves are untouched.

### Fixed

- **Unreadable saves are quarantined instead of discarded.** A save that failed
  to parse, or that parsed to something other than an object, used to be
  dropped: the player silently started a new profile and the next autosave
  overwrote the damaged original. The raw text is now copied to
  `village.saveRecovery.damaged.<timestamp>` first, capped at three copies.
- **Living Village state is saved.** The Living Village store (claimed secrets,
  visits) and the construction store (in-progress builds, blessings, trophies)
  called `queueCloudSave()` after every write, but their `rotk.village.*` keys
  matched none of the save-key patterns, so none of it was ever collected. It
  was missing from cloud saves, from save exports and from recovery backups, and
  a full reset left it behind. All three patterns now cover those keys.
- **The Herb Garden and Gem Forge are reachable.** Both were in the build
  catalog but were neither starters nor unlocked by any research, so no build
  menu could ever show them. The Herb Garden now comes with Moon Orchardry
  (chapter 3) and the Gem Forge with Arcane Mastery (chapter 17). The Gem Forge
  also had no 3D model and would have placed as an empty plot.
- **The game runs without cloud accounts.** Startup dead-ended on a sign-in form
  that could not succeed when no Supabase credentials were configured, making
  every static deployment unplayable. It now boots straight into local play.
  When Supabase *is* configured but unreachable, the sign-in form is still
  shown, as before.
- **The audio control no longer covers Tester Feedback on tablets.** Between
  481px and 1100px the two overlapped and the audio button took every tap, so
  the feedback button was unreachable at both iPad portrait and landscape.
- **Save exports no longer nest earlier backups.** Each export embedded the
  previous recovery snapshot, so bundles compounded on every save.
- **A paused or down account service is no longer reported as "the network is
  unavailable".** The auth gate now distinguishes the device being offline from
  the service being unreachable, and names a paused Supabase project as the
  likely cause. A timed-out request gets its own message too.

### Changed

- Production builds use a relative base, so the same `dist/` works from a root
  domain and from a path prefix such as a GitHub Pages project site.
- The battle canvas is no longer repainted 60 times a second while no battle is
  running. Idle full-canvas repaints per frame: 1 before, 0 after; in battle it
  is unchanged at 1 per frame.
- The Village's four independent animation loops are driven by one. Idle rAF
  callbacks per frame: 6 before, 3 after.
- Village construction, research and campaign chapter data moved to `src/data/`
  as pure data modules shared by the UI, the engine and the validators.
- One debug flag replaces four scattered ones: `?debug=1`, or a channel list
  such as `?debug=overlay,visual`. The battle telemetry overlay and the state
  validator are now reachable on deployed builds, where they were previously
  compiled out.

### Added

- `scripts/validate-content.mjs`, run as part of `npm run build`: duplicate
  registry ids, research unlocking buildings that do not exist, research gated
  behind chapters that do not exist, buildings with no 3D model, and buildings
  no route in the game can reach.
- `ARCHITECTURE.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `SAVE_SCHEMA.md`,
  `DEPLOYMENT.md` and `KNOWN_ISSUES.md` at the repository root.
- A GitHub Pages deployment workflow.

### Repository

- The 100 loose `PATCH_NOTES_*` files in the repository root moved to
  `docs/patch_notes/`, joining the 61 already there.
- Removed `README.txt`, a stale duplicate of `README.md` two major versions old,
  and the empty `shaders/` placeholder.

---

# Release history

**Baseline at the time of this pass:** V36.0.0 — GOTHIC COLLECTION

## V36.0.0 GOTHIC COLLECTION

- Rebuilt the Cards screen with a responsive premium gothic collection grid,
  matching loadout cards, compact mobile navigation, and a focused card-detail
  presentation.
- Added dedicated generated card illustrations for Dagger, Axe, Crossbow,
  Ballista, and Arcane towers, faithfully derived from the approved runtime
  tower atlases. Holy Tower art is reserved until that tower becomes an actual
  collectible card; Holy Water Infusion retains its authoritative identity.
- Added lazy image decoding for collection art and eager loading only for the
  six equipped cards.
- Added a deliberate Merge All confirmation summary without changing merge
  eligibility, costs, rarity rules, or persisted state.
- Preserved card IDs, stats, XP, levels, rarity math, deck capacity, unlocks,
  upgrades, battle behavior, local saves, and cloud-save serialization.

## V35.2.0 TESTER CHRONICLE

### Village production GUI and UX pass

- Replaced two generations of inline Village presentation rules at runtime with
  one scoped, Vite-bundled UI layer in `src/UI/villageProductionUI.css`.
- Rebuilt the live Village HUD as compact resource, hunter, cloud-state, economy,
  construction, and navigation surfaces that preserve the world as the focus.
- Added a real production-network view driven by existing economy totals,
  building counts, hourly rates, workforce, storage, and offline capacity.
- Reworked construction into a desktop side rail and mobile full-height sheet;
  existing unlock checks, real costs, placement, construction, and saves remain
  the sole source of behavior.
- Added world-position-driven district reveal banners and consolidated the
  cloud-save state into the Village HUD without changing cloud-save behavior.
- Kept permanent midnight presentation and replaced the obsolete morning-rest
  action with a night-safe rest action.
- Validated normal play, Cathedral, residential, production, build mode, wide
  desktop, iPad, and iPhone layouts with automated runtime screenshots.

### Battle progression completion

- Corrected the painted-world battle presentation: removed the normal-play grid,
  path cells, duplicate cathedral, Keep façade, and persistent placement geometry.
- Added continuous terrain-blended roads, conditional foundations, an invisible
  cathedral destination, and damage overlays aligned to the painted structure.
- Added data-driven battlefield capacity: 8 structures in Stages 1–5, 10 in
  Stages 6–10, 12 in Stages 11–15, and 14 in Stages 16–20.
- Draft weighting now reads stage capacity and stops placement cards only when
  the relevant attack or total structure maximum is reached.
- Reduced enemy chapter compounding from 1.09 to 1.055 and separated boss HP
  from the 3.05 normal-enemy baseline.
- Stage 10 now owns the one-time Dracula's Tooth / Shadow Level II finale.
  Already-awakened saves remain intact and are never downgraded.
- Added deterministic 20-stage balance auditing and production screenshots for
  all playable stages. See `docs/CAMPAIGN_BALANCE_REPORT_V35_2.md`.

- Added a data-driven dynamic Essence policy responding to wave progress,
  difficulty, elite/boss status, vial fill, placed towers, and recent drafts.
- Stage 10 awards the unique Dracula's Tooth and runs the one-time Shadow
  Level II walk, kneel, collection, transformation, and reveal sequence.
  Existing awakened saves migrate additively without replaying it.
- Shadow Level II uses its battle/village animations, official portrait, and
  modest base-stat growth across battle and character surfaces.
- Relic data now includes permanent collection, lore, transformation, and
  research metadata for Dracula's Tooth, Rib, Nail, Eye, and Heart.
- Gothic Dagger Tower uses a crisp atlas for idle, charge, fire, recoil, return,
  projectile, and impact presentation without changing its combat values.
- Feedback adds battle-result access, wave, OS, progress, unlock context, and a
  compressed battle screenshot for bug reports when Canvas capture is available.

- Added authenticated bug reports, suggestions, and general feedback from the
  Village, settings, and battle pause surfaces.
- Feedback records include release, chapter, screen, authenticated account,
  device/browser context, client timestamp, optional contact email, and bug
  reproduction fields.
- The last 20 client-side error entries are attached after credential and token
  redaction. Offline submissions queue locally and retry after reconnection.
- Added `public.tester_feedback` with insert-only owner RLS. Players cannot read,
  update, or delete feedback records through the game client.
- No save schema, gameplay, balance, progression, or asset behavior changed.
**Updated:** 2026-07-31
**Runtime status:** Vite is the primary runtime; Supabase and Three.js use package imports; V34/V35 local and cloud-save compatibility is preserved.

## V35.1.0 VITE NATIVE FOUNDATION

- Vite development, build, and preview are the supported runtime paths.
- Supabase now uses `@supabase/supabase-js` and the Vite environment variables
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Removed the Supabase UMD CDN global and obsolete browser configuration module.
- Three.js 0.128.0 and `GLTFLoader` now use package imports, preserving renderer
  behavior while removing CDN/global dependencies.
- `scripts/runtime-assets.mjs` defines the controlled production asset set.
  Build preparation copies only required PNG/GLB runtime files into Vite's
  public tree; PSD, Aseprite, TMX, HEIC, and unused variants are excluded.
- Every build runs `scripts/validate-build.mjs`, which fails on missing dynamic
  assets, bundled audio/portrait files, incomplete Ascension registry icons, or
  inconsistent release metadata.
- `scripts/smoke-production.mjs` validates production preview using isolated
  test-only Supabase responses across desktop and iPhone-sized viewports.
- Authentication redirects derive from the current application origin and path.
- Village economy polling projects production without advancing `lastTick`,
  mutating resources, or queueing cloud writes.
- Periodic and foreground-resume cloud checks now queue only when persistent
  local-save content differs from the last successful synchronization.
- The five-second debounce, revision protection, retry/backoff, account-local
  fallback, and one-time local-to-cloud migration remain unchanged.
- V35.1 changes no save schema. Existing V34 and V35 saves remain compatible.

## V35.0.0 ASCENSION

### Data-driven progression foundation

- Added `src/Ascension/registry.js` as the configuration source for Equipment,
  equipment slots, Elements, Gems, Fusion recipes, Relics, Companions, Support
  Cards, support effects, companion behavior, and Boss Loot.
- Gameplay consumes generic effect maps and companion behavior types rather than
  adding item-specific branches for new Ascension content.
- Added a modular three-tier equipment registry containing progression-scaled
  weapons, helmets, armor, gloves, boots, shields, books, rings, and named gear.
- Shadow has seven equipment positions: Weapon, Helmet, Armor, Gloves, Boots,
  Accessory 1, and Accessory 2.
- Equipment supports extensible primary and secondary stat maps, rarity, tier,
  chapter and boss requirements, Faith, Bravery, sell value, flavor text, drop
  weight, and placeholder icon metadata.

### Faith, Bravery, Gems, and Fusion

- Faith strengthens nearby towers through attack speed, range, critical,
  status, boss, XP, and reward-oriented leadership bonuses.
- Bravery strengthens Shadow and contributes offensive leadership bonuses to
  nearby towers.
- Added six modular elements with three Gem levels each.
- Tower cards persist two permanent Gem sockets and visibly show empty or filled
  circular sockets in both the collection and equipped Battle Deck.
- Added elemental fragments, Gem crafting, Gem upgrades, socketing, removal,
  passive effects, and data-driven upgrade paths.
- Added known and hidden Fusion recipes. Hidden recipes are permanently revealed
  when successfully discovered.

### Boss loot, Supports, Companions, and balance

- Chapters 5, 8, and 10 grant guaranteed first-clear Gems.
- Bosses grant tier-appropriate equipment and elemental fragments through the
  configurable Boss Loot registry.
- Support Cards affect one to four attack towers in the surrounding eight tiles,
  with capacity determined by rarity.
- Added six gothic tactical Support Cards and generic support-effect processing.
- Companions now have distinct targeting AI, passive effects, active abilities,
  cooldowns, projectile behavior, battlefield presentation, and independent
  scaling.
- Reduced every campaign boss maximum-health value by exactly 10%; no other
  requested balance values were changed.

### Authentication and cloud saves

- Added Supabase email/password registration, sign-in, persistent sessions,
  token refresh, password-reset requests, authentication-state restoration, and
  logout.
- The Vite runtime bundles the official `@supabase/supabase-js` client.
- Added gothic authentication, loading, setup, failure, and account-status UI.
- Added `profiles` and `player_saves` SQL migration with owner-only Row Level
  Security policies.
- Added cloud-save loading, per-user local migration, revision tracking,
  debounced writes, pending-write serialization, local fallback, retry/backoff,
  reconnect synchronization, save-status indicators, and logout flushing.
- Existing local progression is retained as a fallback and is never silently
  merged over an existing cloud save.
- Browser-safe configuration examples and Supabase setup documentation are
  included; privileged credentials are not stored in the client.

### Audio and interface polish

- Registered looping standard-battle, boss-battle, and Village music states with
  duplicate-instance prevention, fade transitions, mute/volume support, browser
  suspension recovery, and preserved sound effects.
- Boss music begins when a boss appears; Village music follows the Village menu;
  battle music persists between waves and stops when leaving a battle.
- Increased battle SFX presence and separation from music while retaining the
  existing master, music, SFX, and mute controls.
- Repaired the Ascension Equipment, Gems, Fragments, Fusion, and Hero collection
  layouts so complex records no longer inherit narrow collectible-card columns.
- Battle Deck cards now reserve visible space for artwork, title, Gem sockets,
  stats, footer, and controls across desktop, laptop, tablet, and mobile widths.

### Compatibility and validation

- Ascension save compatibility remains schema 15; the application version is
  `35.1.0 — VITE NATIVE FOUNDATION`.
- Save schema 15 creates a V35 backup and additively migrates earlier saves
  without removing cards, campaign progress, Village state, settings, Relics,
  Companions, or existing loadouts.
- V35 documentation lives in `docs/ASCENSION_V35.md`; Supabase setup and migration
  instructions live in `docs/SUPABASE_SETUP.md` and `supabase/migrations/`.

## Post-V34.1.0 battle-camera recovery

- Fixed an intermittent iOS battle view that could show only a yellow map backdrop while the HUD remained responsive.
- Root cause was stale touch-pointer state surviving a lost pointer-capture or battle transition, allowing a later single touch to be interpreted as a pinch and displacing the battlefield.
- Battle startup, browser visibility loss, window blur, and lost pointer capture now clear gesture state.
- Camera zoom and pan values are validated and safely restored if they become non-finite.
- Chromium parsing and battle-module initialization validation passed; repeated physical-iPhone regression testing remains recommended.

## Current implemented systems

- Shadow has five equipable personal familiars: Night Bat, Giant Sword, Demon, Ghost, and Faerie.
- Each familiar follows Shadow in battle and has independent persistent XP and levels up to Level 20.
- Familiar save data is migrated and normalized safely for older saves.
- The battle Keep has five visual stages derived from existing Keep/Town Hall progression.
- Keep Levels 2–5 add automatic archers; higher levels improve count, damage, range, and firing speed.
- Dagger Tower fires a piercing cardinal lane attack once every 3 seconds, reaching 3/4/5 tiles at Levels 1/2/3+.
- Boss presentation includes enlarged boss rendering, road-aligned health bars, and cinematic Golem pauses.
- Battle completion includes recovery safeguards and Home/Cards/Hunt Again navigation.
- Village progression, research, construction, economy, chronicle, card systems, campaign progress, and legacy saves remain active.
- Easter eggs: the Vampire Killer/Konami homage, plus nine Metal Gear Solid homages — tactical mode and the cardboard box (Village), the codec on 140.85, the `!` alert and Psycho Mantis (battle module), and the SHAAAADOW defeat cry, METAL GEAR?! on the Golem's third form, and the Sorrow's river of the dead.

## V34.1.0 status

**Battle framerate.** `ctx.shadowBlur` was being set inside the per-tower,
per-shot, per-lane-shot and per-particle draw loops. Canvas2D implements it as a
scratch-surface gaussian blur, so cost scaled with entity count — measured at
**331 blur passes per frame** on a heavy wave. Glows now come from radial-gradient
sprites cached per colour and blitted with `drawImage`: **3 per frame**, and the
remainder are bounded. `G.particles` is capped at 420 and `G.floaters` at 90;
nothing bounded them before, and `crossSkill` alone pushes 80 particles per cast.

**A regression caught in testing.** The first dead-code pass used a regex that
over-matched and silently removed ten functions including `cameraTransform`. It
passed `node --check` and would have thrown on the first battle frame. Redone
with brace-matched extents and a function-inventory diff; zero unintended losses.
Four genuinely dead functions removed.

**Save / load.** Reviewed rather than rebuilt — the V33.0.1 portable save already
works, and a full export → wipe → import round trip was verified along with
decoy-key isolation, the automatic pre-import backup, and malformed-file
rejection. One real defect fixed: the import picker was `hidden`
(`display:none`), and **iOS Safari will not open a Files picker for a
`display:none` input**, so Import Save did nothing on iPad. Lives under
More → Save Manager.

**Village boundary.** The walkable box was not merely invisible, it was wrong: it
excluded the library and warehouse entirely and stranded northern buildable plots
the player could construct on but never reach. Resized from measured content to
`x -51..51, z -45..48`, and `WALL` / `THREE_WORLD_BOUNDS` are now the same numbers
in both files.

**White brick walls.** A full ring with stone cap courses, four lantern-lit corner
towers, and a water gate (piers plus a low arch) where the river crosses. ~34
meshes; no per-frame shadow cost since the map is baked.

**Card legibility.** The battle hand was locked to six non-wrapping columns with a
fixed card height and 10px names under `overflow:hidden` — "Holy Water Barrage"
rendered as "Holy Wa". The hand now wraps, cards size to content, and names get
three clamped lines. Draft cards no longer hide their description below 700px,
which had left players choosing between three cards blind on a phone.

**Detailed findings:** `project_docs/AUDIT_V34_1_0.md`.

## V32.6.4 status — roof flashing fixed

The reported "roofs flash as I walk" was **shadow acne**, and V32.6.2 introduced
it. Halving the mobile shadow map from 2048² to 1024² doubled the world size of a
shadow texel while leaving `normalBias` at 0.025 — about 4.3x too small. Every
surface facing the moon shadowed itself in stripes, and because the camera
translates while the shadow map does not, that striping crawled as the player
walked.

- Shadow `bias` and `normalBias` are now **derived from the measured texel size**
  rather than hard-coded, so a resolution or frustum change can never
  desynchronise them again (0.1727 at 1024², 0.0863 at 2048², both verified).
- The shadow camera's depth range was at the Three.js default 0.5/500 against a
  useful range of ~1/140, wasting ~3.6x of the depth resolution. Now tightened.
- Main camera `near` 0.1 → 1 (far 300 → 260). The follow camera never gets within
  ~15 units of anything, so this is free and buys ~10x depth precision — enough
  to rule out genuine z-fighting on 16-bit mobile depth buffers.
- **The shadow map is now baked on demand, not every frame.** Every caster is
  static and the player is a Sprite, which never casts. Measured: 0 shadow passes
  across 180 frames, down from 180; exactly one rebake per construction, plus one
  on WebGL context restore. Trade: the 0.7° ambient tree sway no longer animates
  in shadow, which is not perceptible at this camera distance.

**Detailed findings:** `project_docs/AUDIT_V32_6_4.md`.

## V32.6.3 status — the gothic GLB pack is live

The thirteen-model pack in `assets/village/The_Village_Gothic_GLBS_Phase1/` is
now the only source of building geometry in the 3D Village, and every placeholder
system has been deleted.

**Removed** (about 220 lines, five overlapping systems):

- `realGothicHouse()` — cloned one house GLB for *every* structure and bolted on
  loose cylinders, rocks and crates to fake a lumber camp, quarry or warehouse
- `dioramaBuilding()` — PNG-cropped boxes (already dead: never called)
- `house()` — procedural box-and-cone house (already dead: never called)
- `artFarm()` — procedural farm around `farm_plot.png`
- `cathedral()` — hand-assembled nave, towers, spires, rose window and portal
- `cropTexture()` and its four atlas textures, `buildingKind()`, `proceduralWall()`
- the orphaned `the_village_gothic_house_lv1.glb` asset (46 KB)

**Added:**

- All 13 models load in parallel at startup and are measured once with
  `THREE.Box3`, so scale normalisation and footprint recentring are derived from
  the geometry rather than hand-tuned constants.
- `placeModel()` gives every placement its own geometry and materials.
- All **32** build types map onto the pack — house_lv1, house_lv2, farm,
  lumber_camp, quarry, warehouse, library, alchemist, enchanter, blacksmith,
  tavern, keep and cathedral are each used, with a keyword fallback for any type
  added later.
- Nine authored landmarks rebuilt from the pack, including the real cathedral
  and keep.
- A small deterministic per-plot yaw so identical building types do not read as a
  copy-pasted row.

**Failure behaviour:** one missing model is substituted with a warning; all
thirteen missing throws a clear error and the 2D Village carries on.
`dispose()` now frees template geometry and materials too.

**Detailed findings:** `project_docs/AUDIT_V32_6_3.md`.

## V32.6.2 audit status

**The reported iPad failure is fixed, and it was not a WebGL problem.**
`assets/village/house_lv02.png` was missing from the build (only the `.heic`
source shipped). `Promise.all` over the art textures rejected, the catch handler
read `.message` off a DOM `ErrorEvent` that has none — printing the misleading
`Unknown WebGL error` — and then wiped the Village DOM with `world.innerHTML`,
leaving a black screen with no fallback.

- `house_lv02.png` regenerated from its shipped HEIC source.
- Texture, GLB and sprite-sheet loading are now individually fault-tolerant with
  procedural fallbacks; no single asset can abort the world.
- `describeLoadError()` reports the real cause (`could not load house_lv02.png`).
- Failure no longer destroys the 2D Village; it degrades to it.

**iPad Safari robustness**

- The decorative atmosphere layer no longer opens a second WebGL context on
  mobile — it was invisible anyway, and iOS enforces a browser-wide context budget.
- `webglcontextlost` / `webglcontextrestored` are handled; the Village pauses and
  resumes instead of going black forever.
- A WebGL pre-flight reports context exhaustion in plain language.
- Mobile GPUs: antialias off, pixel ratio capped at 1.35, `PCFShadowMap`, and a
  1024² shadow map instead of 2048² (~16 MB depth target down to ~4 MB).
- `ctx.roundRect()` polyfilled for Safari < 16.4.

**Performance**

- `readPlots()` — a synchronous `localStorage` + `JSON.parse` — was running once
  per rendered frame inside the render loop. Now behind a TTL cache:
  **120 frames caused 120 reads; now 1.**
- The render loop is stoppable: tracked `rafId`, `disposed` flag,
  `cancelAnimationFrame` in `dispose()`. It previously ran forever into a
  detached canvas.
- Rendering is skipped while the tab is hidden.

**Other**

- `the_village_main.png` was missing while `styles.css` referenced it twice.
- `package.json` said `32.5.1` on a V32.6 build; lock file disagreed with both.
- Cache identifiers had drifted across four files; all unified on `v32-6-2`.
- The 3D status banner was rendering underneath the economy strip.

**New — three more Metal Gear Solid easter eggs** (nine in total now)

- **"SHADOW? SHADOW?! SHAAAADOW!"** on the defeat screen, gated on having dialled
  the codec at least once.
- **"METAL GEAR?!"** the instant the Golem reaches its third form.
- **The Sorrow's river of the dead** — five taps on the Codex percentage; every
  enemy you have discovered drifts past while the river counts your kills.

**Known, not changed:** a 13-model gothic GLB pack ships entirely unused
(272 KB, no code references it); the orphaned Soul Reserve / Hunter Tavern
upgrades from V32.4.2; `FRESH_START_TOKEN` still live.

**Detailed findings:** `project_docs/AUDIT_V32_6_2.md`.

## V32.4.2 audit status

**Bugs repaired**

- Dead V22.3b Village controller removed from `src/Battle/game.js` (126 unreachable lines, and the duplicate `clampCamera`). `src/villageBootstrap.js` has owned the Village alone since V30.1.
- Stale stylesheet cache identifier fixed. `index.html` was still requesting `styles.css?v=v27-8-shadow-trail-fix`; Safari could pair a V27.8 stylesheet with V32.4 markup. All three cache identifiers now move together.
- `applyBooster()` removed as unreachable, taking a latent 30 HP heal ceiling with it.
- Write-only `G.gold` state removed.
- Gate health no longer displays fractions in the HUD.
- `grantEndChest()` no longer throws on an empty eligible card pool.
- Empty `assets/backgrounds/` directory removed; `package-lock.json` corrected from `27.3.0` to `32.4.2`.

**Optimisations**

- `pathSet()` and `routePoints()` are memoised behind a `roadVersion` counter. They were rebuilding a Set on every pointer-move and two arrays per enemy per frame respectively.
- The tactical grid renders as one batched path instead of 288 `strokeRect` calls per frame.
- Sprite preloading is split by reachability: about 0.87 MB of chapter-11+ sheets moved off first paint onto `requestIdleCallback`.
- A dead per-type sprite lookup table was removed.

**New — Metal Gear Solid easter eggs**

Three presentation-only homages joining the existing Vampire Killer tribute. None touches combat values, save schema or progression.

- **Codec call on 140.85** — type `14085`, or triple-tap the weather readout in battle. Scanline codec overlay, animated waveform, typewritten dialogue from four callers rewritten as in-world advice. First call ever greets with "Kept you waiting, huh?".
- **Alert** — the `!` marker and alert sting when a road guardian first notices you.
- **Psycho Mantis** — five quick taps on the Profile stat grid; he reads the real save file back to the player, then moves the screen.

**Open design decision:** Soul Reserve, Hunter Tavern and the village Night Market/Tavern starting-soul bonuses fed only the removed `G.gold` and currently do nothing. Repairing them is a balance change, so it was deliberately left to a design pass. Detail and the one-line patch: `project_docs/AUDIT_V32_4_2.md`.

**Detailed findings:** `project_docs/AUDIT_V32_4_2.md`.

## V32.4.1 audit status

- Broken menu-background asset references repaired.
- Old cache identifiers replaced so iPad/iPhone Safari load the current scripts.
- Familiar XP and save migration hardened.
- Hidden-tab atmosphere rendering optimized.
- Incomplete packaged dependencies and an unused duplicate stylesheet removed.
- Detailed findings: `project_docs/AUDIT_V32_4_1.md`.

## Project Overview

- **Title:** The Village
- **Genre:** Dark-fantasy, card-driven tower-defense game with campaign, roguelite battle runs, permanent collection progression, heroes, relics, achievements, and a lightweight kingdom layer.
- **Rendering stack:** HTML/CSS interface plus Canvas 2D battle rendering. A small optional Three.js atmosphere module is present; it imports Three.js from the jsDelivr CDN with a top-level ESM import and is loaded through `import().catch()` in `main.js`, so the game runs unchanged when that request fails. No bundled Three.js dependency is declared in `package.json`.
- **Main concept:** Defend the last safe village from escalating waves. The player brings a six-card deck, receives roads automatically during runs, places defenses and supports, earns permanent cards and currencies, selects hunters and relics, and restores the kingdom between hunts.
- **Build system:** Vite 7 (`npm run dev`, `npm run build`).
- **Primary target:** Touch-first browser play, especially iPad landscape, with desktop mouse/keyboard compatibility.
- **Save system:** Browser `localStorage` plus authenticated Supabase cloud synchronization; canonical local key `relicsEclipseSave`; legacy fallback key `gateRunnerSave`; current schema `saveVersion = 15`.


## Village World Branch — Current State

The active village-development branch is **Village World V1.9 — Accordion Square Cards**. This is the latest working ZIP supplied by the user for documentation carry-forward. No gameplay code or art files were changed during the documentation update.

### Village layout and district direction

- The Village is planned as several connected districts rather than one oversized map.
- **Old Town** remains the permanent center and contains the Cathedral.
- **South District** is the Arcane district.
- **West District** is the Military district.
- **East District** is the Commerce district.
- **North District** is reserved for a future Castle/Nobility expansion.
- Existing district-ground assets in this ZIP include `old_town_ground.png`, `south_district.png`, `west_district.png`, and `east_district.png`.

### Current Village interface work

- Four-district world navigation and free camera movement were developed across the Village World iterations.
- Terrain collision was removed so the player can move freely between district areas.
- Build plots and mobile camera controls were added.
- The build menu direction is now a single vertically scrollable list with square building cards.
- Sections are Residential, Production, Arcane, Commerce, Military, and Civic.
- The accordion experiment is considered abandoned; the vertically scrollable section layout is the preferred direction.
- V1.9 remains the supplied working baseline even though later UI ideas were discussed. Future work must begin by verifying this ZIP in-browser before merging any later concept.

### Building and progression design archive

Approved functional-building implementation order:

1. Market
2. Warehouse
3. Library
4. Alchemist
5. Enchanter

Campaign research unlock archive:

- Boss 10: Fire I
- Boss 20: Ice I
- Boss 30: Fire II, Ice II, Poison I
- Boss 40: Fire III, Ice III, Poison II, Holy I

Intended progression chain:

`Campaign Boss → Library Research → Alchemy → Enchanter → Weapon Element`

### Existing and explored building art

Previously completed or present building assets include House Lv1, House Lv2, Farm Plot, Library, Alchemist, and Enchanter concepts/assets. During the latest art session, Commerce, Military, and Arcane district concept sheets were explored. Individual crop-and-ZIP experiments were also attempted.

Important production note: **none of the newly generated Commerce, Military, or Arcane pack experiments were integrated into this working game ZIP.** The user decided to pause building-asset production because sheet generation and slicing were not consistent enough. Do not assume those experimental packs are approved production assets unless the user supplies them again in a future chat.

### Agreed asset-production lesson

Future building sheets should be created as production sheets, not presentation sheets:

- exactly front-facing buildings
- one building centered per fixed cell
- consistent scale, camera, and lighting
- generous transparent padding
- no overlap or spill into neighboring cells
- slicing performed only from the user-approved source image

The next chat should be free to move to a different Village feature without reopening building-asset work unless requested.

## Runtime Entry Path

`index.html` → `src/main.js` → imports `villageBootstrap.js`, `Renderer/threeAtmosphere.js`, and `Battle/game.js`.

## Current Folder Structure

```text
PATCH_NOTES_V27_1_2_CLEANED_CARDS_REPAIR.txt
README.txt
assets/audio/.gitkeep
assets/backgrounds/main-menu.jpg
assets/characters/kael/kael.png
assets/citizens/Blonde Kid Girl/blonde_kid_girl.png
assets/citizens/Blonde Kid Girl/blonde_kid_girl_shadow.png
assets/citizens/Blonde Man/blonde_man.png
assets/citizens/Blonde Man/blonde_man_shadow.png
assets/citizens/Blonde Woman/blonde_woman.png
assets/citizens/Blonde Woman/blonde_woman_shadow.png
assets/citizens/Farmer/farmer.png
assets/citizens/Farmer/farmer_shadow.png
assets/citizens/Knight/knight.png
assets/citizens/Knight/knight_shadow.png
assets/sprites/.gitkeep
assets/textures/.gitkeep
docs/AUDIT_REPORT_V19_0.txt
docs/V19_README.txt
docs/patch_notes/CLEANUP_V27_1_1.txt
docs/patch_notes/PATCH_NOTES_9A.txt
docs/patch_notes/PATCH_NOTES_9B.txt
docs/patch_notes/PATCH_NOTES_9C.txt
docs/patch_notes/PATCH_NOTES_9D.txt
docs/patch_notes/PATCH_NOTES_9E.txt
docs/patch_notes/PATCH_NOTES_9F.txt
docs/patch_notes/PATCH_NOTES_V11_ART_RENAISSANCE.txt
docs/patch_notes/PATCH_NOTES_V14_PLACEMENT_ACCURACY.txt
docs/patch_notes/PATCH_NOTES_V15_0_1_MAIN_MENU_FIX.txt
docs/patch_notes/PATCH_NOTES_V15_0_2_DECK_AND_RADIUS_FIX.txt
docs/patch_notes/PATCH_NOTES_V15_0_3_BALANCE_ROAD_RADIUS.txt
docs/patch_notes/PATCH_NOTES_V15_0_4_TRUE_AOE_BALANCE.txt
docs/patch_notes/PATCH_NOTES_V15_1_COMBAT_POLISH.txt
docs/patch_notes/PATCH_NOTES_V15_2.txt
docs/patch_notes/PATCH_NOTES_V15_2_1.txt
docs/patch_notes/PATCH_NOTES_V15_2_2.txt
docs/patch_notes/PATCH_NOTES_V15_3_SCRIPTURE_TOWER.txt
docs/patch_notes/PATCH_NOTES_V15_4_ESSENCE_ECONOMY.txt
docs/patch_notes/PATCH_NOTES_V15_LIVING_NIGHT.txt
docs/patch_notes/PATCH_NOTES_V16_0A_ACTIVE_CARD_CYCLE.txt
docs/patch_notes/PATCH_NOTES_V16_0_ESSENCE_DRAFT.txt
docs/patch_notes/PATCH_NOTES_V16_1A_CARD_SCREEN_REPAIR.txt
docs/patch_notes/PATCH_NOTES_V16_1B_COLLECTION_REPAIR.txt
docs/patch_notes/PATCH_NOTES_V16_1C_NON_STACKING_GRID.txt
docs/patch_notes/PATCH_NOTES_V16_1D_RESPONSIVE_CARDS.txt
docs/patch_notes/PATCH_NOTES_V16_1E_TABLET_LAYOUT_PHONE.txt
docs/patch_notes/PATCH_NOTES_V16_1F_MOBILE_COLLECTION.txt
docs/patch_notes/PATCH_NOTES_V16_1G_RECOVERY.txt
docs/patch_notes/PATCH_NOTES_V16_1H_SCROLL_SUPPORT_LAYOUT.txt
docs/patch_notes/PATCH_NOTES_V16_1_CARD_SYSTEM.txt
docs/patch_notes/PATCH_NOTES_V18_5_CAMPAIGN_REBORN.txt
docs/patch_notes/PATCH_NOTES_V19_1_INPUT_SYSTEM.txt
docs/patch_notes/PATCH_NOTES_V20_DYNAMIC_AUDIO.txt
docs/patch_notes/PATCH_NOTES_V22_0_THE_VILLAGE.txt
docs/patch_notes/PATCH_NOTES_V22_1_EXPANDED_VILLAGE.txt
docs/patch_notes/PATCH_NOTES_V22_2A_DEBUG_REPAIR.txt
docs/patch_notes/PATCH_NOTES_V22_2_LIVING_VILLAGE.txt
docs/patch_notes/PATCH_NOTES_V22_3B_IOS_RECOVERY.txt
docs/patch_notes/PATCH_NOTES_V22_3_VILLAGE_STABILITY.txt
docs/patch_notes/PATCH_NOTES_V22_4A.txt
docs/patch_notes/PATCH_NOTES_V22_4B.txt
docs/patch_notes/PATCH_NOTES_V23_0_THE_VILLAGE.txt
docs/patch_notes/PATCH_NOTES_V24_0_LIVING_VILLAGE.txt
docs/patch_notes/PATCH_NOTES_V25_0_KAEL_LIVES.txt
docs/patch_notes/PATCH_NOTES_V25_1_KAEL_DIRECTION_FIX.txt
docs/patch_notes/PATCH_NOTES_V25_2_KAEL_SHEET_FIX.txt
docs/patch_notes/PATCH_NOTES_V25_3_KAEL_STABLE_WALK.txt
docs/patch_notes/PATCH_NOTES_V25_4_BATTLE_CONTROLS_AND_OPENING_TOWERS.txt
docs/patch_notes/PATCH_NOTES_V25_5_IOS_CONTROL_HARDENING.txt
docs/patch_notes/PATCH_NOTES_V25_6_ABSOLUTE_TOUCH_AUTO_HERO.txt
docs/patch_notes/PATCH_NOTES_V25_7_BOTTOM_COMMAND_MARQUEE.txt
docs/patch_notes/PATCH_NOTES_V25_8_FULLSCREEN_SINGLE_TOUCH.txt
docs/patch_notes/PATCH_NOTES_V25_9_NATIVE_BUTTON_RESET.txt
docs/patch_notes/PATCH_NOTES_V26_0_POINTERDOWN_CONTROL_REBUILD.txt
docs/patch_notes/PATCH_NOTES_V26_1_CACHE_RESET.txt
docs/patch_notes/PATCH_NOTES_V26_2_ACTUAL_COMMAND_FIX.txt
docs/patch_notes/PATCH_NOTES_V26_3_NATIVE_CONTROL_RECONSTRUCTION.txt
docs/patch_notes/PATCH_NOTES_V26_4_BATTLE_UI_SYNC.txt
docs/patch_notes/PATCH_NOTES_V27_1_1_PREMIUM_CARD_DRAFT.txt
docs/patch_notes/PATCH_NOTES_V27_1_BATTLE_UX.txt
index.html
package-lock.json
package.json
shaders/.gitkeep
src/Battle/game.js
src/Cards/README.md
src/Engine/README.md
src/Renderer/threeAtmosphere.js
src/UI/README.md
src/main.js
src/villageBootstrap.js
styles.css
```

## Current Codebase Integrity

The following working runtime files are reproduced exactly below. Each entry includes a SHA-256 fingerprint so future revisions can confirm whether a supposedly protected file changed.

## File: `index.html`

**Purpose:** Defines every major game screen, HUD, battle canvas, Cards & Deck page, and navigation shell.

**SHA-256:** `b82aa189d7e79c3eba3cfdda79fab3f3fd98926cc85511ca91d9b7a52664e36f`

```html
<!-- V15.2.1 Cathedral & Camera Fine-Tuning -->
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta id="rotkViewport" name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">

<title>The Village — The Last Safe Haven · V27.1.2</title><link rel="stylesheet" href="styles.css?v=2712-cleaned-cards-repair"></head><body>
<div id="app">
  <canvas id="threeBg"></canvas><canvas id="game"></canvas>
  <div id="battleCinematic" class="battle-cinematic hidden" aria-live="polite">
    <div class="cinematic-vignette"></div>
    <div class="cinematic-copy"><span id="cinematicKicker">CHAPTER I</span><h2 id="cinematicTitle">THE HUNT BEGINS</h2><p id="cinematicSubtitle">The last road must hold.</p></div>
  </div>
  <div id="hud" class="hidden battle-hud">
    <div class="battle-topbar">
      <div class="battle-status">
        <div class="battle-pill gate-pill"><span>🩸</span><small>GATE</small><strong id="hpTxt">20</strong></div>
        <div class="battle-pill essence-pill"><span>✦</span><small>ESSENCE</small><strong id="goldTxt">40 / 40</strong><i class="essence-fill"></i></div>
        <div class="battle-pill wave-pill"><span>🌊</span><small>WAVE</small><strong id="waveTxt">1 / 10</strong></div>
        <div class="battle-pill"><span>☠️</span><small>KILLS</small><strong id="killTxt">0</strong></div>
      </div>

    </div>
    <div id="waveBanner" class="wave-banner hidden"><span id="waveBannerKicker">WAVE</span><strong id="waveBannerText">1</strong></div>
    <div id="bossWrap" class="hidden boss-command"><div class="boss-label"><strong id="bossName">Boss</strong><span id="bossHpTxt">100%</span></div><div class="boss-track"><i id="bossBar"></i></div></div>
    <div class="battle-bottom">
      <div class="battle-context"><span>🌦️ <b id="weatherTxt">Clear</b></span><span>💎 <b id="relicTxt">None</b></span><div class="hero-xp"><i id="xpBar"></i></div></div>
      <div id="hand" class="battle-hand hidden" aria-hidden="true"></div>
    </div>
  </div>

  <nav id="battleControlMarquee" class="battle-command-marquee" aria-label="Battle controls">
    <button id="recenterBtn" type="button" data-native-command="center" class="marquee-command" aria-label="Recenter battlefield"><span class="command-icon">⌖</span><small>Center</small></button>
    <button id="speedBtn" type="button" data-native-command="speed" class="marquee-command" aria-label="Change battle speed"><span class="command-icon">×1</span><small>Speed</small></button>
    <button id="pauseBtn" type="button" data-native-command="pause" class="marquee-command" aria-label="Pause battle"><span class="command-icon">Ⅱ</span><small>Pause</small></button>
    <button id="battleExitBtn" type="button" data-native-command="menu" class="marquee-command danger-command" aria-label="Exit battle"><span class="command-icon">×</span><small>Exit</small></button>
  </nav>
  <div id="tutorial" class="hidden"><strong>Eclipse Codex</strong><br>Defeat enemies to fill the 40-Essence Vial. When it fills, battle pauses and three random cards appear. Choose one, place or cast it, and the hunt resumes. Your hero also carries two bonus ground defenses outside the six-card deck. Path tiles extend only from the glowing road end. Merge identical towers by placing one over another. Adjacent tower combinations create hidden synergies, and towers gain XP from kills. Drag empty terrain to move the camera, pinch or use the mouse wheel to zoom, and tap ⌖ to recenter. Enemies that reach the cathedral remain at the front gate and keep attacking until defeated.<br><button id="closeTut" class="btn" style="margin-top:8px">Understood</button></div>
  <div id="toast"></div><aside id="towerInspector" class="hidden"></aside><div id="placementBar" class="hidden"><div class="label" id="placementLabel">Place card</div><button id="rotateBtn" class="btn">Rotate</button><button id="cancelPlaceBtn" class="btn">Cancel</button></div>

  <section id="menu" class="screen menu-screen village-home-screen">
    <div class="village-sky-layer" aria-hidden="true">
      <div class="village-moon"></div><div class="village-cloud vc1"></div><div class="village-cloud vc2"></div>
    </div>
    <header class="village-hud">
      <div class="village-brand"><span class="eyebrow">THE LAST SAFE HAVEN</span><h1>THE VILLAGE</h1></div>
      <button id="profileBtn" class="hunter-chip village-profile"><span>🏆</span><b id="homeHunterLevel">Hunter Lv. 1</b></button>
      <div class="village-resources">
        <span title="Blood Essence">🩸 <b id="homeEssence">0</b></span>
        <span title="Forge Embers">🔥 <b id="homeEmbers">0</b></span>
        <span title="Kingdom Rank">👑 <b id="homeKingdomRank">1</b></span>
        <span title="Victories">⚔️ <b id="homeVictories">0</b></span>
      </div>
    </header>

    <main class="pixel-village" aria-label="The Village main menu">
      <button id="villageEconomyStrip" class="village-economy-strip" type="button" aria-label="Open Village economy">
        <span>🌾 <b id="villageFoodTotal">0</b><small id="villageFoodRate">+0/h</small></span>
        <span>🪵 <b id="villageWoodTotal">0</b><small id="villageWoodRate">+0/h</small></span>
        <span>🪨 <b id="villageStoneTotal">0</b><small id="villageStoneRate">+0/h</small></span>
        <span>👥 <b id="villagePopulationTotal">8/12</b><small>population</small></span>
      </button>
      <div class="village-world" id="villageWorld">
      <div class="village-ground"></div>
      <div class="village-path path-main"></div><div class="village-path path-cross"></div>
      <div class="village-stream"><i></i><i></i><i></i></div>
      <div class="pixel-bridge"></div>

      <button id="playBtn" class="village-building cathedral-building" aria-label="Open Campaign">
        <span class="building-art"><i class="spire s1"></i><i class="spire s2"></i><i class="spire s3"></i><i class="rose-window"></i><i class="door"></i></span>
        <b>Cathedral</b><small>Campaign</small>
      </button>
      <button id="villageCardsBtn" class="village-building tavern-building" aria-label="Open Cards">
        <span class="building-art"><i class="roof"></i><i class="chimney smoke"></i><i class="door"></i><i class="window w1"></i><i class="window w2"></i></span>
        <b>The Raven Tavern</b><small>Cards &amp; Deck</small>
      </button>
      <button id="villageHeroesBtn" class="village-building barracks-building" aria-label="Open Hunters">
        <span class="building-art"><i class="roof"></i><i class="tower t1"></i><i class="tower t2"></i><i class="door"></i></span>
        <b>Barracks</b><small>Hunters</small>
      </button>
      <button id="kingdomBtn" class="village-building hall-building" aria-label="Open Village Management">
        <span class="building-art"><i class="roof"></i><i class="clock"></i><i class="door"></i><i class="banner"></i></span>
        <b>Village Hall</b><small>Build &amp; Upgrade</small>
      </button>
      <button id="forgeBtnHome" class="village-building smith-building" aria-label="Open Fusion Forge">
        <span class="building-art"><i class="roof"></i><i class="chimney smoke"></i><i class="forge-glow"></i><i class="door"></i></span>
        <b>Blacksmith</b><small>Fusion Forge</small>
      </button>
      <button id="villageRelicsBtn" class="village-building market-building" aria-label="Open Relic Vault">
        <span class="building-art"><i class="awning"></i><i class="stall"></i><i class="crate c1"></i><i class="crate c2"></i></span>
        <b>Marketplace</b><small>Relic Vault</small>
      </button>
      <button id="codexBtn" class="village-building library-building" aria-label="Open Living Codex">
        <span class="building-art"><i class="roof"></i><i class="book-sign"></i><i class="door"></i><i class="window"></i></span>
        <b>Old Library</b><small>Living Codex</small>
      </button>
      <button id="villageAudioBtn" class="village-building watch-building" aria-label="Open Settings">
        <span class="building-art"><i class="tower"></i><i class="roof"></i><i class="bell"></i></span>
        <b>Watchtower</b><small>Audio Settings</small>
      </button>

      <div class="town-square"><span class="fountain"></span><span class="square-label">Town Square</span></div>
      <div class="hero-villager hero-home"><i></i><b>Hunter</b></div>
      <div class="villager villager-a"><i></i></div><div class="villager villager-b"><i></i></div><div class="villager villager-c"><i></i></div><div class="villager villager-d"><i></i></div>
      <div class="chicken chicken-a">•</div><div class="chicken chicken-b">•</div>
      <div class="tree tree-a"></div><div class="tree tree-b"></div><div class="tree tree-c"></div><div class="tree tree-d"></div><div class="tree tree-e"></div>
      <div class="lantern-post lp1"></div><div class="lantern-post lp2"></div><div class="lantern-post lp3"></div><div class="lantern-post lp4"></div>
      <div id="villagePlots" class="village-plots" aria-label="Village building plots"></div>
      </div>
      <button id="villageBuildBtn" class="village-build-btn" type="button">🔨 BUILD</button>
      <div class="village-camera-controls" aria-label="Village camera controls"><button id="villageZoomIn" type="button" aria-label="Zoom in">＋</button><span id="villageZoomReadout" class="village-zoom-readout">50%</span><button id="villageCenterBtn" type="button" aria-label="Center village">⌖</button><button id="villageZoomOut" type="button" aria-label="Zoom out">－</button></div>

      <aside id="villageEconomyPanel" class="village-economy-panel hidden" aria-label="Village Hall economy dashboard">
        <div class="economy-panel-head"><div><span class="eyebrow">VILLAGE HALL</span><h2>The Village Economy</h2><p>The last safe haven grows while you hunt—and while you are away.</p></div><button id="villageEconomyClose" type="button" aria-label="Close economy dashboard">×</button></div>
        <div class="economy-level-row"><div><small>VILLAGE LEVEL</small><strong id="economyVillageLevel">1</strong></div><div><small>HAPPINESS</small><strong id="economyHappiness">75%</strong></div><div><small>BUILDINGS</small><strong id="economyBuildingCount">0 / 8</strong></div></div>
        <div class="economy-resource-grid">
          <article><span>🌾</span><div><small>FOOD</small><strong id="economyFood">0</strong><em id="economyFoodRate">+0 per hour</em></div></article>
          <article><span>🪵</span><div><small>WOOD</small><strong id="economyWood">0</strong><em id="economyWoodRate">+0 per hour</em></div></article>
          <article><span>🪨</span><div><small>STONE</small><strong id="economyStone">0</strong><em id="economyStoneRate">+0 per hour</em></div></article>
          <article><span>👥</span><div><small>POPULATION</small><strong id="economyPopulation">8 / 12</strong><em id="economyPopulationRate">Build Houses to expand</em></div></article>
        </div>
        <div class="economy-summary">
          <div><small>TOTAL PRODUCTION</small><strong id="economyTotalRate">0 resources / hour</strong></div>
          <div><small>OFFLINE STORAGE</small><strong id="economyOfflineCap">12 hours</strong></div>
        </div>
        <div id="economyAwayReport" class="economy-away-report hidden"></div>
        <button id="economyCollectBtn" class="btn primary economy-collect-btn" type="button">Collect &amp; Save</button>
      </aside>
      <aside id="villageBuildTray" class="village-build-tray hidden" aria-label="Village construction menu">
        <div class="build-tray-head"><strong>BUILD MODE</strong><button id="villageBuildClose" type="button">×</button></div>
        <p>Choose a structure, then tap an empty plot.</p>
        <div class="build-tray-grid">
          <button type="button" data-village-build="house"><span>🏠</span><b>House</b><small>80 Essence · population</small></button>
          <button type="button" data-village-build="farm"><span>🌾</span><b>Farm</b><small>95 Essence · food</small></button>
          <button type="button" data-village-build="lumber"><span>🪵</span><b>Lumber Camp</b><small>110 Essence · wood</small></button>
          <button type="button" data-village-build="quarry"><span>🪨</span><b>Quarry</b><small>125 Essence · stone</small></button>
        </div>
        <div id="villageBuildHint" class="build-hint">Select a structure.</div>
      </aside>
    </main>

    <section class="village-message">
      <span id="seasonChip">AUTUMN ECLIPSE</span>
      <div><h2 id="homeGreeting">The kingdom still stands.</h2><p id="homeChapterText">Continue the campaign and push back the darkness.</p></div>
    </section>
    <div class="home-hidden-values" aria-hidden="true"><span id="homeKingdomText"></span><span id="homeDeckText"></span><span id="homeRelicText"></span><span id="homeDecreesText"></span><span id="homeCodexText"></span></div>
    <div class="milestone-mark village-version">THE VILLAGE · V23.0 · ECONOMY &amp; IDENTITY</div>
  </section>

  <section id="moreScreen" class="screen hidden"><div class="panel more-panel"><div class="section-heading"><span class="eyebrow">THE KEEP</span><h2>More Adventures</h2><p class="small">Every chamber of the kingdom, gathered in one place.</p></div><div class="more-grid">
    <button id="heroesBtn" class="more-tile"><span>♞</span><b>Hunters</b><small>Choose and strengthen your champion.</small></button>
    <button id="upgradesBtn" class="more-tile"><span>♜</span><b>Keep Upgrades</b><small>Permanent account-wide power.</small></button>
    <button id="forgeBtn" class="more-tile"><span>⚒</span><b>Fusion Forge</b><small>Fuse Common cards into greatness.</small></button>
    <button class="more-tile" data-more-target="codex"><span>📖</span><b>Living Codex</b><small>Cards, enemies, maps, and lore.</small></button>
    <button class="more-tile" data-more-target="profile"><span>🏆</span><b>Hunter Profile</b><small>Records, materials, and hunt history.</small></button>
    <button class="more-tile" data-more-target="decrees"><span>📜</span><b>Royal Decrees</b><small>Claim achievements and renown.</small></button>
    <button id="resetBtn" class="more-tile danger"><span>↻</span><b>Reset Progress</b><small>Erase this kingdom and begin again.</small></button>
  </div></div></section>

  <section id="campaignScreen" class="screen hidden"><div class="panel campaign-panel"><div class="row spread"><div><h2>Campaign of the Fallen Kingdom</h2><p class="small">Choose a chapter. Victories permanently unlock the next road and its guardian.</p></div><div class="deck-count" id="campaignProgress">1 / 4</div></div><div id="chapterMap" class="chapter-map"></div><div class="row center"><button id="campaignBack" class="btn">Back</button></div></div></section>

  <section id="relicVaultScreen" class="screen hidden"><div class="panel"><div class="row spread"><div><h2>Relic Vault</h2><p class="small">Boss relics are permanent discoveries. Equip one before entering the campaign.</p></div><div class="essence-chip">Equipped: <b id="equippedRelicTxt">None</b></div></div><div id="relicVaultGrid" class="relic-vault-grid"></div><div class="row center"><button id="relicVaultBack" class="btn">Back</button></div></div></section>


  <section id="kingdomScreen" class="screen hidden"><div class="panel kingdom-panel"><div class="row spread"><div><h2>The Living Kingdom</h2><p class="small">Restore your stronghold between hunts. Every building grants a permanent kingdom benefit.</p></div><div class="essence-chip">Kingdom Rank: <b id="kingdomRank">1</b></div></div><div id="kingdomScene" class="kingdom-scene"><div class="kingdom-keep">🏰<span>THE LAST KEEP</span></div><div id="kingdomBuildings" class="kingdom-buildings"></div></div><div class="row spread kingdom-summary"><span id="kingdomPopulation">Population 12</span><span id="kingdomPower">Kingdom Power 0</span></div><div class="row center"><button id="kingdomBack" class="btn">Back</button></div></div></section>

  <section id="achievementsScreen" class="screen hidden"><div class="panel"><div class="row spread"><div><h2>Royal Decrees</h2><p class="small">Permanent achievements award Blood Essence and kingdom renown.</p></div><div class="deck-count" id="achievementCount">0 / 0</div></div><div id="achievementGrid" class="achievement-grid"></div><div class="row center"><button id="achievementsBack" class="btn">Back</button></div></div></section>

  <section id="deckScreen" class="screen hidden">
    <div class="panel cards-deck-panel">
      <div class="row spread"><div><h2>Cards &amp; Deck</h2><p class="small">Build your six-card battle deck from permanent collectible cards. Roads are supplied automatically by the hidden Road System during every run.</p></div><div id="deckCounter" class="deck-count">0 / 6</div></div>
      <div class="deck-zone">
        <div class="section-kicker">YOUR SIX-CARD BATTLE DECK</div>
        <div class="deck-loadout">
          <button id="deckHeroCard" class="deck-hero-card" type="button" aria-label="Open selected hunter">
            <span id="deckHeroPortrait" class="deck-hero-portrait">⚔️</span>
            <span class="deck-hero-copy">
              <small>SELECTED HUNTER</small>
              <strong id="deckHeroName">Ashen Warden</strong>
              <span id="deckHeroLevel">Lv 1</span>
              <span id="deckHeroXP" class="deck-hero-xp"><i></i></span>
            </span>
            <span id="deckHeroGear" class="deck-hero-gear" aria-label="Hunter equipment"></span>
            <span class="hero-support-heading">HERO SUPPORT CARDS</span>
            <span id="deckHeroSupports" class="deck-hero-supports" aria-label="Hero support cards"></span>
          </button>
          <div class="loadout-card-column">
            <div id="equippedDeck" class="equipped-deck" aria-label="Six-card battle deck"></div>
            <div class="ground-defense-zone">
              <div class="ground-defense-heading"><span>HERO GROUND DEFENSES</span><small>Bonus slots · outside the six-card deck</small></div>
              <div id="groundDefenseSlots" class="ground-defense-slots" aria-label="Hero ground defense slots"></div>
            </div>
          </div>
        </div>
        <div id="deckAnalysis" class="deck-analysis"></div>
      </div>
      <div class="collection-divider"><span>CARD COLLECTION</span></div>
      <div class="card-file-tabs" role="tablist" aria-label="Card categories">
        <button type="button" class="card-file-tab active" data-card-filter="all">All</button>
        <button type="button" class="card-file-tab" data-card-filter="tower">Defense Towers</button>
        <button type="button" class="card-file-tab" data-card-filter="support">Support Cards</button>
        <button type="button" class="card-file-tab" data-card-filter="skill">Battle Skills</button>
        <button type="button" class="card-file-tab" data-card-filter="hero">Run Upgrades</button>
      </div>
      <div class="deck-tools compact-tools">
        <select id="deckTypeFilter" class="visually-hidden"><option value="all">All Types</option><option value="tower">Defense</option><option value="support">Support</option><option value="skill">Skill</option><option value="hero">Run Upgrade</option></select>
        <select id="deckSort"><option value="type">Sort: Type</option><option value="rarity">Sort: Rarity</option><option value="strength">Sort: Strength</option><option value="level">Sort: Level</option><option value="name">Sort: Name</option><option value="recent">Sort: Recent</option></select>
        <label class="merge-toggle"><input id="mergeOnly" type="checkbox"> Merge ready</label>
        <button id="mergeAllBtn" class="merge-all-btn" type="button" disabled>Merge All Duplicates</button>
      </div>
      <div id="collectionCards" class="cards portrait-grid"></div>
      <div class="row center sticky-actions"><button id="saveDeckBtn" class="btn primary">Save Deck</button><button id="backBtn" class="btn">Back</button></div>
    </div>
  </section>

  <section id="cardInspectScreen" class="screen hidden"><div class="panel inspect-panel"><button id="inspectBack" class="btn inspect-back">← Cards &amp; Deck</button><div id="cardDetail" class="card-detail-large"></div></div></section>
  <section id="heroesScreen" class="screen hidden"><div class="panel"><h2>Hunters</h2><p class="small">Choose a hunter. Permanent hunter upgrades are purchased with Blood Essence; temporary run upgrades still reset after each hunt.</p><div id="heroCards" class="hero-grid"></div><div class="row center"><button id="heroesBack" class="btn">Back</button></div></div></section>
  <section id="upgradesScreen" class="screen hidden"><div class="panel"><div class="row spread"><div><h2>Keep Upgrades</h2><p class="small">Permanent account-wide bonuses purchased with Blood Essence.</p></div><div class="essence-chip">Blood Essence: <b id="essenceTxt">0</b></div></div><div id="upgradeCards" class="upgrade-grid"></div><div class="row center"><button id="upgradesBack" class="btn">Back</button></div></div></section>

  <section id="forgeScreen" class="screen hidden"><div class="panel"><div class="row spread"><div><h2>Fusion Forge</h2><p class="small">Only Common cards drop. Fuse three identical copies to climb the rarity ladder.</p></div><div class="essence-chip">Forge Embers: <b id="embersTxt">0</b></div></div><div id="forgeCards" class="portrait-grid"></div><div class="row center"><button id="forgeBack" class="btn">Back</button></div></div></section>
  <section id="codexScreen" class="screen hidden"><div class="panel"><div class="row spread"><div><h2>Living Codex</h2><p class="small">Permanent discoveries from every hunt.</p></div><div id="codexPct" class="deck-count">0%</div></div><div id="codexGrid" class="codex-grid"></div><div class="row center"><button id="codexBack" class="btn">Back</button></div></div></section>
  <section id="profileScreen" class="screen hidden"><div class="panel"><h2>Hunter Profile</h2><div id="profileGrid" class="profile-grid"></div><h3>Crafting Materials</h3><div id="materialsGrid" class="materials-grid"></div><h3>Recent Hunts</h3><div id="historyList" class="history-list"></div><div class="row center"><button id="profileBack" class="btn">Back</button></div></div></section>
  <div id="dropBanner" class="drop-banner hidden"></div>


  <nav id="bottomNav" class="bottom-nav royal-nav" aria-label="Main navigation">
    <button type="button" data-nav="home"><span>🏘️</span><small>Village</small></button>
    <button type="button" data-nav="campaign"><span>🗺️</span><small>Campaign</small></button>
    <button type="button" data-nav="cards"><span>🃏</span><small>Cards</small></button>
    <button type="button" data-nav="heroes"><span>⚔️</span><small>Hunters</small></button>
    <button type="button" data-nav="relics"><span>💎</span><small>Relics</small></button>
    <button type="button" data-nav="more"><span>☰</span><small>More</small></button>
  </nav>

  <section id="choices" class="screen hidden"><div class="panel"><div class="coffin" aria-hidden="true"></div><h2 id="rewardTitle" style="text-align:center">Wave Reward</h2><p id="rewardText" class="small" style="text-align:center">Choose one of three cards.</p><div id="choicesCards" class="cards"></div></div></section>
  <section id="gameOver" class="screen hidden"><div class="panel" style="max-width:620px;text-align:center"><h2 id="endTitle">The Keep Has Fallen</h2><div id="chestReveal" class="chest-reveal">▣</div><p id="endStats"></p><div class="row center"><button id="retryBtn" type="button" data-native-command="retry" class="btn primary native-result-link">Hunt Again</button><button id="menuBtn" type="button" data-native-command="menu" class="btn native-result-link">Main Menu</button></div></div></section>

  <button id="audioBtn" class="audio-fab" type="button" aria-label="Audio settings">♫</button>
  <aside id="audioPanel" class="audio-panel hidden" aria-label="Audio settings">
    <div class="audio-head"><strong>Gothic Audio</strong><button id="audioClose" type="button">×</button></div>
    <label><span>Master Audio</span><input id="audioMaster" type="checkbox" checked></label>
    <label><span>Music</span><input id="musicEnabled" type="checkbox" checked></label>
    <label><span>Music Volume</span><input id="musicVolume" type="range" min="0" max="1" step="0.01" value="0.46"></label>
    <label><span>Sound Effects</span><input id="sfxEnabled" type="checkbox" checked></label>
    <label><span>SFX Volume</span><input id="sfxVolume" type="range" min="0" max="1" step="0.01" value="0.72"></label>
    <label><span>Atmosphere</span><input id="ambienceVolume" type="range" min="0" max="1" step="0.01" value="0.34"></label>
    <small id="audioUnlockHint">Tap anywhere once to awaken the soundtrack.</small>
  </aside>
</div>
<script type="module" src="src/main.js?v=2712-cleaned-cards-repair"></script>
<script>
(function(){
  'use strict';
  var locked=false;
  function feedback(button,text){
    if(!button)return;
    button.classList.add('pressed');
    button.setAttribute('data-last-command',text);
    setTimeout(function(){button.classList.remove('pressed');},120);
  }
  function execute(button){
    if(!button||locked)return false;
    var command=button.getAttribute('data-native-command');
    var api=window.VillageBattleAPI;
    if(!api||typeof api[command]!=='function'){
      feedback(button,'Loading');
      return false;
    }
    locked=true;
    feedback(button,'OK');
    try{
      var result=api[command]();
      if(result&&result.ok===false)feedback(button,'Unavailable');
      // Use the command result immediately so the visible button cannot lag
      // behind the battle state, then reconcile with the public API state.
      if(command==='speed'&&result&&typeof result.speed==='number'){
        var speedIcon=button.querySelector('.command-icon');
        if(speedIcon)speedIcon.textContent='×'+result.speed;
        button.setAttribute('data-speed',String(result.speed));
        button.classList.toggle('is-active',result.speed>1);
      }
      if(command==='pause'&&result&&typeof result.paused==='boolean'){
        var pauseIcon=button.querySelector('.command-icon');
        var pauseLabel=button.querySelector('small');
        if(pauseIcon)pauseIcon.textContent=result.paused?'▶':'Ⅱ';
        if(pauseLabel)pauseLabel.textContent=result.paused?'Resume':'Pause';
        button.setAttribute('data-paused',result.paused?'true':'false');
        button.classList.toggle('is-active',result.paused);
      }
      if(typeof window.syncNativeBattleControls==='function')window.syncNativeBattleControls(result||undefined);
      if(command==='center'){
        var label=button.querySelector('small');
        if(label){label.textContent='Centered';setTimeout(function(){label.textContent='Center';},650);}
      }
    }catch(error){
      console.error('Native battle command failed:',command,error);
      feedback(button,'Error');
    }
    setTimeout(function(){locked=false;},180);
    return false;
  }
  window.VillageNativeControls={execute:execute};
  document.addEventListener('click',function(event){
    var button=event.target.closest&&event.target.closest('[data-native-command]');
    if(!button)return;
    event.preventDefault();
    execute(button);
  },false);
})();
</script></body></html>
```

## File: `styles.css`

**Purpose:** Contains the complete visual system and all responsive/mobile overrides. This file currently contains many generations of Cards-page rules and is the highest-risk file for regression.

**SHA-256:** `7661762f14396fb48f2d71a46a836734c9fcded1860b875104e3ff8362019a67`

```css

  :root{
    --bg:#08070b;--panel:#141019;--panel2:#211623;--ink:#f4eadf;--muted:#b6a9b6;
    --red:#a51f35;--red2:#e14555;--gold:#d5b46c;--violet:#6b3b78;--line:#4a3549;
  }
  *{box-sizing:border-box} html,body{height:100%;margin:0;background:#050408;color:var(--ink);font-family:Georgia,"Times New Roman",serif;overflow:hidden}
  button{font:inherit;color:inherit;cursor:pointer}
  #app{position:relative;width:100%;height:100%;background:radial-gradient(circle at 50% 15%,#24152a 0,#0b0810 45%,#050408 100%)}
  canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}
  .hidden{display:none!important}
  .screen{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:linear-gradient(#06040ab8,#06040ae8);backdrop-filter:blur(4px);z-index:10}
  .panel{width:min(1000px,96vw);max-height:92vh;overflow:auto;border:1px solid #76516d;background:linear-gradient(180deg,#1b121dF2,#0e0b12F2);box-shadow:0 0 50px #000, inset 0 0 40px #4f1d381f;padding:22px;border-radius:10px}
  h1,h2,h3,p{margin-top:0}.title{font-size:clamp(34px,7vw,78px);letter-spacing:.06em;text-align:center;text-shadow:0 3px 0 #3c0e1c,0 0 24px #a51f3577;margin-bottom:8px}
  .subtitle{text-align:center;color:var(--gold);letter-spacing:.22em;text-transform:uppercase;margin-bottom:26px}
  .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.center{justify-content:center}.spread{justify-content:space-between}
  .btn{border:1px solid #9d6f80;border-radius:7px;padding:11px 17px;background:linear-gradient(#4b2432,#2a111c);box-shadow:inset 0 1px #ffffff2a,0 4px 12px #0008;min-width:130px}
  .btn:hover{filter:brightness(1.18)}.btn.primary{background:linear-gradient(#ad2d43,#5c1224);border-color:#e1818e}.btn.gold{background:linear-gradient(#80642c,#3e2d10);border-color:#d5b46c}.btn:disabled{opacity:.4;cursor:not-allowed}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px}
  .card{position:relative;min-height:176px;border:1px solid #74516c;border-radius:8px;padding:10px;background:linear-gradient(160deg,#2c192c,#120e15);box-shadow:inset 0 0 25px #0008,0 4px 10px #0007;transition:.15s;user-select:none}
  .card:hover{transform:translateY(-2px);border-color:#d5b46c}.card.selected{outline:2px solid #e24a5e;border-color:#fff}.card.disabled{opacity:.38}.card .icon{font-size:34px;text-align:center;margin:3px}.card h3{font-size:16px;margin:5px 0;color:#f7d9cf}.card p{font-size:12px;color:#c7bac6;line-height:1.3}.tag{position:absolute;right:7px;top:7px;font-size:10px;border:1px solid #60485f;padding:2px 5px;border-radius:9px;background:#0b080d}.cost{position:absolute;left:8px;bottom:7px;color:#ffd36f;font-weight:bold}.rarity{position:absolute;right:8px;bottom:7px;font-size:11px;color:#bca2c8}
  #hud{position:absolute;inset:0;z-index:4;pointer-events:none;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));display:flex;flex-direction:column;justify-content:space-between}
  .hudbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;pointer-events:auto}.pill{padding:7px 10px;border:1px solid #5b4258;background:#0b0811d9;border-radius:7px;box-shadow:0 3px 12px #0008;font-size:14px}.pill strong{color:#f6d27c}
  #hand{display:grid;grid-template-columns:repeat(6,minmax(62px,108px));gap:7px;justify-content:center;pointer-events:auto}.hand-card{position:relative;height:88px;border:1px solid #75516a;border-radius:8px;background:linear-gradient(#2d1728,#100c12);padding:5px;text-align:center;overflow:hidden}.hand-card.active{outline:2px solid #fff3a2;transform:translateY(-5px)}.hand-card .hicon{font-size:27px}.hand-card .hname{font-size:10px;line-height:1.1}.hand-card .hcost{position:absolute;right:4px;bottom:2px;color:#ffe083;font-size:12px}.hand-card .cool{position:absolute;inset:0;background:#050407bd;display:flex;align-items:center;justify-content:center;font-size:24px}
  #toast{position:absolute;z-index:30;left:50%;top:15%;transform:translateX(-50%);padding:10px 16px;border:1px solid #8f667e;background:#100b12e8;border-radius:7px;opacity:0;transition:.25s;pointer-events:none;text-align:center}
  #choices .panel{width:min(760px,96vw)}#choicesCards{grid-template-columns:repeat(3,1fr)}
  #choices:not(.hidden) .card{animation:cardRise .55s cubic-bezier(.2,.8,.2,1) both}#choices:not(.hidden) .card:nth-child(2){animation-delay:.12s}#choices:not(.hidden) .card:nth-child(3){animation-delay:.24s}
  @keyframes cardRise{0%{opacity:0;transform:translateY(45px) scale(.75) rotate(-3deg);filter:brightness(2)}70%{transform:translateY(-6px) scale(1.04)}100%{opacity:1;transform:none;filter:none}}
  .elite-card{border-color:#ffd66b!important;box-shadow:0 0 18px #ffd66b66,inset 0 0 28px #6f481955!important}.elite-card:after{content:'ELITE';position:absolute;left:8px;top:7px;color:#ffe99c;font-size:10px;letter-spacing:.12em}
  #deckCounter{color:var(--gold)}
  .small{font-size:12px;color:var(--muted)}
  .progress{height:8px;background:#09070a;border:1px solid #4b3446;border-radius:9px;overflow:hidden}.progress>i{display:block;height:100%;background:linear-gradient(90deg,#7b1732,#e14a5f);width:0}
  #tutorial{position:absolute;z-index:8;right:12px;top:85px;width:min(310px,80vw);padding:12px;border:1px solid #805e76;background:#0d0910e8;border-radius:8px;pointer-events:auto;font-size:13px;line-height:1.35}
  @media(max-width:700px){.panel{padding:14px}.cards{grid-template-columns:repeat(2,1fr)}#choicesCards{grid-template-columns:1fr}.card{min-height:130px}.card p{display:none}#hand{grid-template-columns:repeat(6,1fr);width:100%}.hand-card{height:70px}.hand-card .hicon{font-size:21px}.hudbar{font-size:11px}.pill{padding:5px 7px}.title{font-size:36px}}

#threeBg{position:absolute;inset:0;z-index:0;pointer-events:none}
#game{z-index:1}
#placementBar{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:7;display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #73546d;background:#0b0811e8;border-radius:9px;box-shadow:0 6px 24px #000b;pointer-events:auto}
#placementBar .label{font-size:13px;color:#ead9e5;max-width:260px}
#placementBar.hidden{display:none!important}
.preview-valid{color:#8ff0a4}.preview-invalid{color:#ff8a92}
.coffin{width:220px;height:100px;margin:0 auto 18px;position:relative;border:4px solid #6f4b5f;background:linear-gradient(90deg,#180c14,#3a1727,#180c14);clip-path:polygon(12% 0,88% 0,100% 26%,92% 100%,8% 100%,0 26%);box-shadow:0 0 30px #a51f3555,inset 0 0 22px #000}
.coffin:before,.coffin:after{content:'';position:absolute;background:#b3915d}
.coffin:before{left:24px;right:24px;top:45px;height:8px}.coffin:after{top:14px;bottom:14px;left:104px;width:8px}
#choices:not(.hidden) .coffin{animation:coffinDrop .6s cubic-bezier(.2,.9,.2,1),coffinShake .35s .62s 2}
@keyframes coffinDrop{from{opacity:0;transform:translateY(-120px) scale(.75)}to{opacity:1;transform:none}}
@keyframes coffinShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px) rotate(-1deg)}75%{transform:translateX(8px) rotate(1deg)}}
.float-text{position:absolute;z-index:6;pointer-events:none;font-weight:bold;text-shadow:0 2px 3px #000;animation:floatUp .8s ease-out forwards}
@keyframes floatUp{to{transform:translateY(-34px);opacity:0}}
/* v0.8 HD interface */
.menu-screen{overflow:hidden;background:linear-gradient(#05040a99,#05040aee)}
.menu-castle{position:absolute;inset:0;overflow:hidden;pointer-events:none;background:radial-gradient(circle at 72% 20%,#67526b44,transparent 24%),linear-gradient(180deg,#160f22aa,#050409 78%)}
.menu-castle .moon{position:absolute;right:12%;top:8%;width:min(24vw,260px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8d7,#c8bdd0 62%,#73677c);box-shadow:0 0 70px #ded0ed77}
.castle-shape{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:min(900px,95vw);height:55%;background:linear-gradient(#100b17,#030306);clip-path:polygon(0 100%,0 78%,8% 78%,8% 46%,14% 46%,14% 67%,23% 67%,23% 30%,30% 30%,30% 58%,40% 58%,40% 18%,47% 18%,50% 4%,53% 18%,60% 18%,60% 58%,70% 58%,70% 30%,77% 30%,77% 67%,86% 67%,86% 46%,92% 46%,92% 78%,100% 78%,100% 100%)}
.castle-shape i{position:absolute;width:10px;height:22px;background:#ffc463;box-shadow:0 0 18px #ff7c2e;animation:windowFlicker 2s infinite alternate}.castle-shape i:nth-child(1){left:31%;top:42%}.castle-shape i:nth-child(2){left:49%;top:28%}.castle-shape i:nth-child(3){right:31%;top:42%}@keyframes windowFlicker{to{opacity:.45;filter:brightness(1.6)}}
.menu-bats{position:absolute;top:22%;left:18%;font-size:34px;color:#09060c;letter-spacing:14px;animation:batsFly 8s linear infinite}@keyframes batsFly{from{transform:translateX(-25vw) translateY(10px)}to{transform:translateX(85vw) translateY(-45px)}}
.hero-panel{position:relative;max-width:820px;background:linear-gradient(145deg,#1b101edc,#09070de8);border:1px solid #a47991;box-shadow:0 20px 80px #000,0 0 45px #8f294a44,inset 0 0 70px #6a274022;backdrop-filter:blur(12px)}
.menu-emblem{text-align:center;color:#e9c978;font-size:12px;letter-spacing:.28em;margin:-8px 0 18px}.menu-actions{display:grid;grid-template-columns:repeat(2,minmax(210px,1fr));gap:12px;max-width:620px;margin:auto}
.menu-btn{position:relative;min-height:64px;border:1px solid #9b667d;border-radius:10px;background:linear-gradient(110deg,#331523,#170c14);font-size:17px;letter-spacing:.05em;box-shadow:inset 0 1px #fff3,0 7px 20px #000a;transition:.22s;overflow:hidden}.menu-btn:before{content:'';position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,#ffffff35,transparent);transform:translateX(-110%);transition:.45s}.menu-btn:hover:before,.menu-btn:focus:before{transform:translateX(110%)}.menu-btn:hover,.menu-btn:focus{transform:translateY(-2px);border-color:#ffd78b;box-shadow:0 0 24px #d1446655,0 8px 24px #000}.menu-btn span{margin-right:8px}.menu-btn.primary{background:linear-gradient(110deg,#a82e49,#4d1022);border-color:#ff93a2}.menu-btn.gold{background:linear-gradient(110deg,#80642e,#34240d);border-color:#e7c571}.menu-btn.locked{opacity:.65}.menu-btn small{display:block;font-size:10px;color:#c5b3c0}.menu-btn.subtle{background:#100c13}
.icon-btn{width:38px;height:38px;min-width:0;border-radius:50%;border:1px solid #725267;background:#160e18;color:#ead78d;font-weight:bold}
#towerInspector{position:absolute;z-index:9;right:16px;bottom:24px;width:230px;padding:14px;border:1px solid #9b6a80;border-radius:10px;background:#0b0810ee;box-shadow:0 10px 34px #000;font-size:13px;line-height:1.65}#towerInspector h3{margin:0 24px 8px 0;color:#f6ddb0}.inspect-close{position:absolute;right:7px;top:5px;background:none;border:0;font-size:23px}.synergy-line{margin-top:7px;color:#e9c56e}.odds,.card-info{font-size:10px;color:#e9c66d;margin-top:4px}.card-info{color:#a9dbff}
@media(max-width:700px){.menu-actions{grid-template-columns:1fr}.hero-panel{max-height:94vh}.menu-castle .moon{right:4%;top:5%}#towerInspector{right:8px;bottom:80px;width:200px}}
/* v0.9 identity + brightness pass */
.menu-screen{background:linear-gradient(180deg,rgba(18,28,57,.28),rgba(30,10,26,.55))}
.menu-castle{background-image:linear-gradient(180deg,rgba(73,101,148,.18),rgba(70,30,67,.26) 48%,rgba(10,8,18,.75)),url('assets/backgrounds/main-menu.jpg');background-size:cover;background-position:center}
.menu-castle:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 72% 18%,rgba(255,243,190,.30),transparent 27%),linear-gradient(90deg,rgba(34,45,78,.18),rgba(116,45,76,.12));animation:menuLight 7s ease-in-out infinite alternate}
@keyframes menuLight{to{filter:brightness(1.22) saturate(1.12)}}
.menu-cloud{position:absolute;width:45%;height:12%;border-radius:50%;background:rgba(224,229,244,.12);filter:blur(24px);animation:cloudDrift 18s linear infinite}.cloud-a{top:12%;left:-35%}.cloud-b{top:31%;left:-45%;animation-duration:27s;opacity:.6}@keyframes cloudDrift{to{transform:translateX(180vw)}}
.ember-field:before,.ember-field:after{content:'✦  ·  ✧  ·  ✦  ·  ·  ✧';position:absolute;left:8%;bottom:8%;color:#ffbd6d;opacity:.5;letter-spacing:36px;animation:embersUp 8s linear infinite}.ember-field:after{left:35%;animation-delay:-4s}@keyframes embersUp{to{transform:translateY(-58vh);opacity:0}}
.hero-panel{background:linear-gradient(145deg,rgba(47,24,49,.84),rgba(12,13,28,.82));border-color:#d59ab3}
.title{filter:drop-shadow(0 0 12px rgba(255,111,147,.45))}
.menu-btn{animation:buttonPulse 3.5s ease-in-out infinite alternate}@keyframes buttonPulse{to{box-shadow:inset 0 1px #fff4,0 0 18px rgba(221,81,119,.24),0 7px 20px #000a}}
.pill{backdrop-filter:blur(8px);background:linear-gradient(180deg,rgba(31,21,42,.92),rgba(9,8,18,.92));border-color:#89647e}

/* v1.0 collection, rarity, and menu identity */
.menu-screen{background:linear-gradient(90deg,rgba(12,13,28,.18),rgba(30,18,48,.35)),url('assets/backgrounds/main-menu.jpg') center/cover no-repeat!important}
.hero-panel{background:linear-gradient(145deg,rgba(22,25,46,.90),rgba(48,23,57,.86));border-color:#d7b668;box-shadow:0 0 80px rgba(99,62,160,.35),inset 0 0 50px rgba(255,205,113,.08)}
.title{color:#fff0cb;text-shadow:0 2px 0 #2f174e,0 0 18px #c482ff,0 0 42px #ffd47966}.subtitle{color:#f6c86f}
.menu-btn{position:relative;overflow:hidden}.menu-btn:before{content:'';position:absolute;inset:-50%;background:linear-gradient(110deg,transparent 38%,rgba(255,255,255,.26),transparent 62%);transform:translateX(-70%);transition:.45s}.menu-btn:hover:before{transform:translateX(70%)}
.deck-tools{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 14px}.deck-tools select,.merge-toggle{background:#100d1b;color:#f5eadb;border:1px solid #71577b;border-radius:8px;padding:9px 12px}
.collection-panel{width:min(1180px,97vw)}.collection-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}.collection-summary,.essence-chip{padding:8px 12px;border:1px solid #806b92;border-radius:8px;background:#130f20}.card-detail{position:sticky;bottom:0;margin-top:12px;padding:14px;border:1px solid #ad8a59;background:#110d18ee;border-radius:10px;z-index:2}.card-detail.hidden{display:none}
.rarity-common{--rarity:#8c8c95}.rarity-good{--rarity:#58ba62}.rarity-rare{--rarity:#4f87e8}.rarity-epic{--rarity:#9b5de5}.rarity-epicplus{--rarity:#a75ce8;box-shadow:0 0 0 2px #e5bd58 inset,0 0 16px #b06fff55!important}.rarity-legendary{--rarity:#e0b54f}.rarity-legendaryplus{--rarity:#e0b54f;box-shadow:0 0 0 2px #b4272e inset,0 0 18px #e0b54f66!important}.rarity-mythic{--rarity:#d73138;box-shadow:0 0 20px #e23d42aa,inset 0 0 25px #8a1117!important}.card[class*='rarity-']{border-color:var(--rarity)!important}.rarity-orb{width:10px;height:10px;border-radius:50%;display:inline-block;background:var(--rarity);box-shadow:0 0 8px var(--rarity)}
.card-level{position:absolute;left:8px;top:7px;font-size:10px;background:#08070caa;border:1px solid #685872;border-radius:10px;padding:2px 6px}.copies{font-size:11px;color:#dccbde;margin-top:4px}.merge-btn{margin-top:8px;width:100%;border:1px solid #cfae62;background:#3b2a13;color:#ffe7a0;border-radius:6px;padding:7px}.merge-btn:disabled{opacity:.35}.hero-grid,.upgrade-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.hero-choice,.upgrade-card{border:1px solid #705679;background:linear-gradient(155deg,#29192e,#100d17);padding:16px;border-radius:10px}.hero-choice.selected{outline:2px solid #ffd36a}.hero-avatar{font-size:46px}.drop-banner{position:absolute;z-index:45;left:50%;top:22%;transform:translateX(-50%);padding:16px 24px;border:2px solid #f4d16f;background:linear-gradient(145deg,#342045,#100c17);border-radius:12px;box-shadow:0 0 35px #c688ff88;font-size:18px;text-align:center;animation:dropPop .5s ease}.drop-banner.hidden{display:none}@keyframes dropPop{from{opacity:0;transform:translate(-50%,-25px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
.support-bubble{font-size:12px}.chest-reveal{font-size:58px;color:#f0c665;text-shadow:0 0 20px #efb94a;animation:chestPulse 1.2s infinite alternate}@keyframes chestPulse{to{transform:scale(1.1);filter:brightness(1.35)}}
.deck-analysis{margin:8px 0;padding:10px;border:1px solid #604a68;background:#0c0912;border-radius:8px}.warning{color:#ffbf76}.good-note{color:#9ae69c}
@media(max-width:700px){.collection-grid{grid-template-columns:repeat(2,1fr)}.deck-tools select{flex:1;min-width:120px}}

/* v1.1 Collector's Update */
.wide-action{grid-column:1/-1}.cards-deck-panel{width:min(1240px,97vw)}.deck-count{font-size:22px;color:#f4d788;font-weight:bold}.deck-zone{padding:16px;border:1px solid #78627a;background:#09081099;border-radius:14px}.section-kicker{text-align:center;letter-spacing:.22em;color:#f2d688;font-size:13px;margin-bottom:12px}.equipped-deck{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:10px}.deck-slot{min-height:148px;border:2px solid #806a80;border-radius:12px;background:#0d0c12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:9px;overflow:hidden}.deck-slot.filled{background:linear-gradient(160deg,#2b2430,#100e14)}.deck-slot.empty{border-style:dashed;color:#8e8490}.deck-slot:hover{border-color:#f3d37f}.mini-rarity{font-size:10px;text-transform:uppercase;letter-spacing:.12em}.mini-icon{font-size:30px}.deck-slot strong{font-size:13px;text-align:center}.deck-slot small{color:#c8bdc9}.collection-divider{display:flex;align-items:center;gap:16px;margin:24px 0 16px;color:#f1d585;letter-spacing:.24em;font-size:13px}.collection-divider:before,.collection-divider:after{content:'';height:2px;flex:1;background:linear-gradient(90deg,transparent,#a78150,transparent)}.portrait-grid{grid-template-columns:repeat(auto-fill,minmax(170px,1fr));align-items:start}.portrait-card{aspect-ratio:2/3;min-height:270px;padding:10px 10px 12px;display:flex;flex-direction:column;overflow:hidden;border-width:2px;color:#fff}.portrait-card .card-art{height:42%;min-height:105px;margin:24px 3px 8px;border-radius:10px;border:1px solid #ffffff44;background:radial-gradient(circle,#ffffff25,transparent 58%),linear-gradient(145deg,#0002,#0007);position:relative;display:grid;place-items:center;overflow:hidden}.art-sigil{font-size:48px;filter:drop-shadow(0 5px 8px #000)}.art-lines{position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 18px,#ffffff08 19px 20px)}.portrait-card h3{font-size:17px;text-align:center;margin:3px 0 5px;color:inherit}.portrait-card p{font-size:12px;line-height:1.3;margin:0 2px 8px;color:#fff;opacity:.9;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.card-stats,.card-footer{display:flex;justify-content:space-between;gap:5px;font-size:10px;margin-top:auto}.card-footer{padding-top:6px;border-top:1px solid #ffffff35;margin-top:6px}.card-equip{margin-top:8px;padding:7px;border-radius:7px;border:1px solid #ffffff66;background:#08080bbb}.merge-chip{position:absolute;left:9px;top:8px;padding:4px 7px;border:1px solid #ffe393;border-radius:9px;background:#3c2a0dcc;color:#ffe393;font-size:9px}.portrait-card.selected{outline:3px solid #fff3a5}.rarity-common{background:linear-gradient(160deg,#777b82,#34373c)!important;border-color:#bfc3ca!important}.rarity-good{background:linear-gradient(160deg,#3f9957,#183f27)!important;border-color:#81e699!important}.rarity-rare{background:linear-gradient(160deg,#3576ca,#172f61)!important;border-color:#76b5ff!important}.rarity-epic{background:linear-gradient(160deg,#8b45c4,#3b185c)!important;border-color:#d490ff!important}.rarity-epicplus{background:linear-gradient(160deg,#8d42c7,#32134d)!important;border-color:#f0cd65!important;box-shadow:inset 0 0 0 3px #d5ad45,0 6px 18px #0008!important}.rarity-legendary{background:linear-gradient(160deg,#d4a73a,#76520d)!important;border-color:#ffe28a!important;color:#1c1304!important}.rarity-legendaryplus{background:linear-gradient(160deg,#e2b443,#6e4506)!important;border-color:#b31827!important;box-shadow:inset 0 0 0 3px #a20f20,0 6px 18px #0008!important;color:#1c1304!important}.rarity-mythic{background:linear-gradient(145deg,#d42a37,#651018 60%,#2b080c)!important;border-color:#ff9aa0!important;animation:mythicPulse 2s infinite alternate}@keyframes mythicPulse{to{box-shadow:0 0 24px #ff334f99,inset 0 0 30px #ff9b7a33}}.rarity-legendary p,.rarity-legendaryplus p{color:#211704}.sticky-actions{position:sticky;bottom:-22px;padding:14px;background:linear-gradient(transparent,#0b0910 25%);z-index:4}.inspect-panel{width:min(1120px,97vw)}.inspect-back{margin-bottom:14px}.card-detail-large{display:grid;grid-template-columns:minmax(250px,340px) 1fr;gap:28px;align-items:start}.detail-card{width:100%;max-width:330px;margin:auto}.detail-copy h2{font-size:34px;margin:5px 0 8px}.detail-heading>span{color:#efcf7a;letter-spacing:.1em}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.metric-grid>div{padding:12px;border:1px solid #675469;border-radius:10px;background:#0a0910}.metric-grid small{display:block;color:#bcb0bd}.metric-grid b{display:block;margin-top:5px;color:#f4dfaa}.attack-panel{padding:16px;border:1px solid #725a73;border-radius:12px;background:#0b0911}.arc-demo,.line-demo,.return-demo{height:130px;border-radius:10px;background:linear-gradient(#151021,#08070c);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-around;font-size:30px}.arc-demo i{position:absolute;width:55%;height:78%;left:20%;top:24%;border-top:4px solid #f1d87c;border-radius:50%;transform:rotate(-8deg);box-shadow:0 -3px 8px #b286ff}.arc-demo b{position:absolute;right:18%;top:18%}.arc-demo em{position:absolute;right:12%;bottom:18%;font-style:normal}.line-demo i,.return-demo i{color:#f1d87c;font-style:normal;letter-spacing:.18em}.detail-actions{display:flex;gap:10px;margin-top:18px}.system-road-art{font-size:54px}.odds{font-size:11px}.card-level{z-index:2}.tag{z-index:2}
@media(max-width:900px){.equipped-deck{grid-template-columns:repeat(3,1fr)}.card-detail-large{grid-template-columns:1fr}.detail-card{max-width:300px}.metric-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.portrait-grid{grid-template-columns:repeat(2,minmax(135px,1fr))}.portrait-card{min-height:230px}.equipped-deck{grid-template-columns:repeat(2,1fr)}.portrait-card p{-webkit-line-clamp:2}.metric-grid{grid-template-columns:1fr 1fr}}

/* Milestone 1 — dedicated mobile UI and welcoming title screen */
:root{--safe-top:max(10px,env(safe-area-inset-top));--safe-right:max(10px,env(safe-area-inset-right));--safe-bottom:max(10px,env(safe-area-inset-bottom));--safe-left:max(10px,env(safe-area-inset-left))}
.menu-screen{background:
 linear-gradient(180deg,rgba(18,28,54,.08),rgba(18,12,31,.34) 58%,rgba(10,8,18,.72)),
 url('assets/backgrounds/main-menu.jpg') center 42%/cover no-repeat!important;overflow:hidden}
.menu-screen:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 72% 15%,rgba(255,224,160,.28),transparent 23%),linear-gradient(110deg,rgba(57,92,139,.18),rgba(113,64,125,.12));pointer-events:none;animation:menuLight 9s ease-in-out infinite alternate}
@keyframes menuLight{to{filter:brightness(1.15) saturate(1.12);transform:scale(1.018)}}
.hero-panel{width:min(760px,92vw);padding:clamp(22px,4vw,42px);border-radius:24px;background:linear-gradient(145deg,rgba(25,31,55,.78),rgba(44,24,54,.72));border:1px solid rgba(250,220,154,.72);backdrop-filter:blur(12px) saturate(1.12);box-shadow:0 28px 90px #080713aa,inset 0 1px rgba(255,255,255,.14)}
.hero-panel .title{font-size:clamp(36px,7vw,70px);line-height:.95;letter-spacing:.045em;margin-bottom:14px;color:#fff4d6;text-shadow:0 2px 0 #342154,0 0 24px #d9aaff88}
.hero-panel .subtitle{font-size:clamp(12px,2vw,18px);margin-bottom:17px;color:#ffd98d}
.menu-emblem{font-size:11px;letter-spacing:.22em;text-align:center;color:#f3dca7;margin-bottom:12px}
.menu-lore{text-align:center;max-width:560px;margin:0 auto 24px;color:#f2e9ef;font-size:15px;line-height:1.55;text-shadow:0 1px 5px #000}
.menu-actions{gap:12px}.menu-btn{min-height:56px;border-radius:14px;border-color:rgba(255,224,160,.55);background:linear-gradient(180deg,rgba(83,53,103,.86),rgba(33,26,54,.92));font-size:16px;letter-spacing:.025em}.menu-btn.primary{background:linear-gradient(180deg,rgba(181,75,100,.93),rgba(92,39,76,.96))}.menu-btn.gold{background:linear-gradient(180deg,rgba(172,127,50,.94),rgba(78,55,25,.96))}

/* Compact mobile battle chrome */
@media(max-width:700px){
  html,body,#app{overflow:hidden}
  .screen{padding:var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);align-items:stretch}
  .panel{width:100%;max-height:none;height:100%;border-radius:0;padding:14px 12px 84px;box-shadow:none}
  .menu-screen{align-items:center;padding:14px}
  .menu-screen .hero-panel{height:auto;max-height:calc(100dvh - 28px);overflow:auto;border-radius:22px;padding:24px 16px 18px}
  .hero-panel .title{font-size:clamp(34px,11vw,50px)}
  .menu-lore{font-size:13px;margin-bottom:18px}
  .menu-actions{grid-template-columns:1fr 1fr;gap:9px}
  .menu-btn{min-height:48px;padding:10px 8px;font-size:13px;border-radius:12px}.menu-btn span{font-size:17px}.wide-action{grid-column:1/-1}
  #hud{padding:var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);gap:4px}
  #hud>.hudbar.spread{display:grid;grid-template-columns:1fr auto;gap:5px;align-items:start}
  #hud>.hudbar.spread>.hudbar:first-child{display:grid;grid-template-columns:repeat(3,max-content);gap:4px}
  .pill{padding:4px 6px;border-radius:8px;font-size:10px;white-space:nowrap;box-shadow:0 2px 7px #0008}
  #hud>.hudbar.spread>.hudbar:last-child{display:grid;grid-template-columns:repeat(2,34px);gap:4px}
  #hud .icon-btn,#hud .btn{min-width:34px;width:34px;height:34px;padding:0;border-radius:50%;font-size:0;display:grid;place-items:center}
  #recenterBtn,#helpBtn{font-size:16px!important}#speedBtn:after{content:'×';font-size:16px}#pauseBtn:after{content:'Ⅱ';font-size:15px}
  #bossWrap{margin-top:42px!important}.progress{height:5px}
  #tutorial{left:10px;right:10px;top:auto;bottom:calc(12px + env(safe-area-inset-bottom));width:auto;max-height:55vh;overflow:auto}
  #towerInspector{left:10px!important;right:10px!important;top:auto!important;bottom:calc(10px + env(safe-area-inset-bottom));width:auto!important;max-height:42vh;overflow:auto}
  #placementBar{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));transform:none;justify-content:space-between}

  .cards-deck-panel> .row.spread{align-items:flex-start}.cards-deck-panel h2{font-size:24px}.cards-deck-panel .small{font-size:11px}
  .deck-zone{padding:10px;border-radius:12px}.section-kicker{font-size:10px;letter-spacing:.15em}
  .equipped-deck{display:flex;overflow-x:auto;gap:8px;scroll-snap-type:x mandatory;padding-bottom:7px;-webkit-overflow-scrolling:touch}
  .deck-slot{min-width:112px;min-height:132px;scroll-snap-align:start}.deck-slot strong{font-size:11px}
  .deck-analysis{font-size:11px;line-height:1.45}.collection-divider{margin:17px 0 10px;font-size:10px;letter-spacing:.13em}
  .deck-tools{display:grid;grid-template-columns:1fr 1fr;gap:7px;position:sticky;top:-14px;z-index:5;padding:10px 0;background:#12101be8;backdrop-filter:blur(8px)}
  .deck-tools select,.merge-toggle{min-width:0;width:100%;padding:8px;font-size:12px}.merge-toggle{grid-column:1/-1}
  .portrait-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.portrait-card{min-height:0;aspect-ratio:2/3;padding:7px}.portrait-card .card-art{min-height:78px;margin-top:20px}.art-sigil{font-size:35px}.portrait-card h3{font-size:13px}.portrait-card p{font-size:10px;-webkit-line-clamp:2}.card-stats,.card-footer{font-size:8px}.card-equip{font-size:10px;padding:5px}
  .sticky-actions{position:fixed;left:0;right:0;bottom:0;padding:9px var(--safe-right) var(--safe-bottom);background:#0c0a12f2;display:grid;grid-template-columns:1fr 1fr}.sticky-actions .btn{min-width:0}

  #choices{padding:0;background:rgba(7,7,14,.88)}#choices .panel{padding:var(--safe-top) 0 var(--safe-bottom);overflow:hidden;display:flex;flex-direction:column}
  #choices .coffin{transform:scale(.74);margin:-10px auto -18px}#choices h2{font-size:22px;margin:0 12px 4px}#choices #rewardText{font-size:11px;padding:0 18px;margin-bottom:8px}
  #choicesCards{display:flex!important;grid-template-columns:none!important;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding:4px calc(50vw - 117px) 20px;-webkit-overflow-scrolling:touch;flex:1;align-items:center}
  #choicesCards .portrait-card{flex:0 0 234px;max-height:min(62vh,390px);scroll-snap-align:center;scroll-snap-stop:always;box-shadow:0 14px 32px #000b}

  .inspect-panel{padding:10px 10px calc(18px + env(safe-area-inset-bottom));overflow:auto}.inspect-back{position:sticky;top:0;z-index:4;margin-bottom:8px;min-width:0;padding:8px 12px}
  .card-detail-large{display:block}.detail-card-wrap{display:flex;justify-content:center}.detail-card{max-width:220px;max-height:330px}.detail-copy{padding:8px 4px}.detail-copy h2{font-size:24px}.detail-heading>p{display:none}.metric-grid{grid-template-columns:repeat(2,1fr);gap:6px;margin:10px 0}.metric-grid>div{padding:8px}.attack-panel{padding:10px}.arc-demo,.line-demo,.return-demo{height:90px}.detail-actions{position:sticky;bottom:0;background:#100d18ee;padding:8px 0;display:grid;grid-template-columns:1fr 1fr}.detail-actions .btn{min-width:0}
  .drop-banner{top:15%;width:min(88vw,330px);padding:12px 16px;font-size:14px}
}

@media(max-width:380px){.portrait-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.portrait-card .card-art{min-height:64px}.portrait-card h3{font-size:12px}.menu-emblem{display:none}}
@media(orientation:landscape) and (max-height:560px){.menu-screen .hero-panel{max-width:920px;padding:15px 22px}.hero-panel .title{font-size:36px}.hero-panel .subtitle,.menu-lore{margin-bottom:10px}.menu-actions{grid-template-columns:repeat(3,1fr)}.wide-action{grid-column:auto}.menu-btn{min-height:42px}.menu-screen .small{display:none}#hud>.hudbar.spread>.hudbar:first-child{grid-template-columns:repeat(6,max-content)}#choicesCards .portrait-card{max-height:72vh;flex-basis:190px}#choicesCards{padding-left:calc(50vw - 95px);padding-right:calc(50vw - 95px)}}

/* Milestone 3 progression screens */
.codex-grid,.profile-grid,.materials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.codex-entry,.profile-grid>div,.materials-grid>div,.history-row{background:linear-gradient(180deg,#211b2b,#100d16);border:1px solid #5c4b70;border-radius:14px;padding:14px}.codex-entry{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;min-height:110px;justify-content:center}.codex-entry span{font-size:32px}.codex-entry.locked{filter:grayscale(1);opacity:.48}.profile-grid strong{display:block;font-size:26px;color:#ffe39a;margin-top:5px}.materials-grid>div,.history-row{display:flex;justify-content:space-between;gap:12px}.history-list{display:grid;gap:8px;margin:12px 0 20px}.history-row{flex-direction:column}.history-row span{opacity:.75}.forge-line{font-size:12px;margin:8px 0;color:#f3d59b}.menu-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.menu-actions .wide-action{grid-column:1/-1}@media(max-width:640px){.codex-grid,.profile-grid,.materials-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.menu-actions{grid-template-columns:1fr}.menu-actions .wide-action{grid-column:auto}}

/* Milestone 4: Campaign and Relic Vault */
.campaign-panel{max-width:980px}.chapter-map{display:grid;gap:14px;margin:22px 0}.chapter-node{display:grid;grid-template-columns:58px 1fr auto;gap:16px;align-items:center;padding:18px;border:1px solid #765d4388;border-radius:14px;background:linear-gradient(135deg,#161118ee,#251923ee)}.chapter-node.completed{border-color:#caa75caa}.chapter-node.locked{filter:grayscale(1);opacity:.48}.chapter-number{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:2px solid #b99a62;background:#09080c;font-size:1.25rem;font-weight:800}.chapter-node h3{margin:3px 0}.chapter-node p{margin:4px 0 9px;color:#c7bbc7}.chapter-meta{display:flex;flex-wrap:wrap;gap:8px}.chapter-meta span{padding:5px 8px;border-radius:999px;background:#0006;font-size:.78rem}.relic-vault-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:22px 0}.relic-vault-card{text-align:left;padding:18px;border:1px solid #68546f;border-radius:14px;color:inherit;background:linear-gradient(160deg,#17101d,#25152b);min-height:220px}.relic-vault-card.selected{outline:2px solid #e0b85a;box-shadow:0 0 0 4px #e0b85a22}.relic-vault-card.locked{opacity:.45;filter:grayscale(1)}.relic-icon{font-size:2.6rem;margin-bottom:12px}.relic-vault-card strong{display:block;margin-top:16px;color:#e4c36b}.section-kicker{font-size:.72rem;letter-spacing:.16em;color:#c1a66a}@media(max-width:650px){.chapter-node{grid-template-columns:42px 1fr}.chapter-node>.btn{grid-column:1/-1;width:100%}.chapter-number{width:38px;height:38px}.chapter-meta{gap:5px}.chapter-meta span{font-size:.7rem}.relic-vault-grid{grid-template-columns:1fr 1fr}.relic-vault-card{min-height:190px;padding:13px}}@media(max-width:420px){.relic-vault-grid{grid-template-columns:1fr}}

/* Milestone 5 — Living Kingdom */
.kingdom-panel{max-width:980px}.kingdom-scene{position:relative;min-height:390px;border:1px solid rgba(220,183,104,.28);border-radius:20px;overflow:hidden;padding:24px;background:radial-gradient(circle at 50% 18%,rgba(170,198,226,.13),transparent 28%),linear-gradient(#121424 0 45%,#18160f 46% 100%)}
.kingdom-scene:before{content:"";position:absolute;inset:45% 0 0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,transparent 2px 56px),linear-gradient(transparent,rgba(0,0,0,.28))}.kingdom-keep{position:relative;text-align:center;font-size:78px;z-index:2}.kingdom-keep span{display:block;font-size:12px;letter-spacing:.24em;color:#e8d19c}.kingdom-buildings{position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}.kingdom-building{border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(8,9,14,.78);padding:14px;text-align:left;color:inherit}.kingdom-building.unbuilt{opacity:.72}.kingdom-building .building-icon{font-size:32px}.kingdom-building h3{margin:6px 0 3px}.kingdom-building p{min-height:36px}.kingdom-building button{width:100%;margin-top:8px}.kingdom-summary{margin:12px 2px}.achievement-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.achievement-card{border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px;background:rgba(8,9,14,.68)}.achievement-card.done{border-color:rgba(225,188,95,.7)}.achievement-card.claimed{opacity:.7}.achievement-card .progress{margin:10px 0}.achievement-card button{width:100%}@media(max-width:700px){.kingdom-buildings,.achievement-grid{grid-template-columns:1fr}.kingdom-scene{min-height:540px;padding:14px}.kingdom-keep{font-size:58px}}


/* Milestone 5.1 — persistent non-battle navigation */
:root{--bottom-nav-h:72px}
.bottom-nav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:60;width:min(760px,100%);min-height:var(--bottom-nav-h);padding:8px max(10px,env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));display:grid;grid-template-columns:repeat(5,1fr);gap:6px;background:linear-gradient(180deg,rgba(20,15,28,.96),rgba(8,7,12,.99));border:1px solid rgba(220,185,104,.38);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -10px 32px rgba(0,0,0,.45);backdrop-filter:blur(14px)}
.bottom-nav button{min-width:0;border:1px solid transparent;border-radius:12px;background:transparent;color:#d5cbd8;padding:7px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit}
.bottom-nav button span{font-size:22px;line-height:1}.bottom-nav button small{font-size:11px}.bottom-nav button.active{color:#ffe29a;background:rgba(177,128,54,.18);border-color:rgba(232,195,112,.48)}
body.battle-mode .bottom-nav{display:none!important}
body:not(.battle-mode) .screen:not(#menu){padding-bottom:calc(var(--bottom-nav-h) + 16px + env(safe-area-inset-bottom))}
body:not(.battle-mode) .screen:not(#menu)>.panel{max-height:calc(100dvh - var(--bottom-nav-h) - 30px - env(safe-area-inset-bottom));overflow:auto}
@media(max-width:520px){:root{--bottom-nav-h:66px}.bottom-nav{gap:2px;padding-top:6px}.bottom-nav button{padding:5px 1px}.bottom-nav button span{font-size:20px}.bottom-nav button small{font-size:10px}.menu-screen .hero-panel{padding-bottom:calc(78px + env(safe-area-inset-bottom))}}

/* Milestone 6 — The Royal Edition */
:root{--royal-gold:#e8c77a;--royal-ink:#0b0911;--royal-panel:rgba(19,14,28,.88);--bottom-nav-h:64px}
.royal-home{display:block!important;overflow:auto;padding:0 0 calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 18%,#495a87 0,#212443 34%,#100d1c 70%,#09070e 100%)}
.royal-home.hidden{display:none!important}.royal-sky{position:fixed;inset:0;overflow:hidden;pointer-events:none}.royal-sky:after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(8,6,13,.4) 62%,#09070e 100%)}
.royal-moon{position:absolute;width:190px;height:190px;border-radius:50%;right:8%;top:8%;background:radial-gradient(circle at 38% 35%,#fff8d9,#d6d2c8 55%,#a8a5aa);box-shadow:0 0 70px rgba(220,226,255,.28)}
.royal-castle{position:absolute;left:50%;bottom:11%;width:min(700px,110vw);height:320px;transform:translateX(-50%);background:linear-gradient(90deg,transparent 5%,#090811 5% 95%,transparent 95%);clip-path:polygon(0 100%,8% 55%,15% 63%,22% 35%,30% 56%,39% 45%,46% 8%,54% 8%,61% 45%,70% 56%,78% 35%,85% 63%,92% 55%,100% 100%);opacity:.82}.royal-castle b{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 54px,rgba(255,183,78,.22) 55px 59px,transparent 60px 95px)}
.royal-raven{position:absolute;color:#090811;font-size:30px;animation:ravenFlight 12s linear infinite}.royal-raven.r1{top:17%;left:-8%;animation-delay:-2s}.royal-raven.r2{top:25%;left:-15%;animation-delay:-7s;transform:scale(.7)}@keyframes ravenFlight{to{left:110%;transform:translateY(-35px)}}
.royal-fog{position:absolute;width:75%;height:90px;border-radius:50%;background:rgba(220,226,240,.08);filter:blur(20px);animation:fogDrift 18s ease-in-out infinite alternate}.royal-fog.f1{left:-20%;bottom:24%}.royal-fog.f2{right:-24%;bottom:13%;animation-delay:-8s}@keyframes fogDrift{to{transform:translateX(28%) scale(1.12)}}
.royal-home-content{position:relative;z-index:2;width:min(980px,100%);margin:auto;padding:calc(18px + env(safe-area-inset-top)) clamp(14px,3vw,30px) 26px}.royal-topbar{display:flex;justify-content:space-between;align-items:center;gap:12px}.eyebrow{font-size:10px;letter-spacing:.22em;color:#d6bb7c}.royal-topbar h1{margin:3px 0;font-size:clamp(25px,5vw,42px);line-height:1}.hunter-chip{border:1px solid rgba(232,199,122,.4);background:rgba(9,7,14,.65);color:#f5e8c7;border-radius:999px;padding:8px 12px;display:flex;align-items:center;gap:7px;white-space:nowrap}
.hero-overlook{min-height:280px;display:grid;grid-template-columns:minmax(100px,.7fr) minmax(220px,1.3fr);align-items:end;gap:18px;padding:28px 0 18px}.hero-silhouette{font-size:96px;filter:drop-shadow(0 18px 16px #000);text-align:center;animation:heroIdle 3.5s ease-in-out infinite}@keyframes heroIdle{50%{transform:translateY(-5px)}}.hero-copy{padding:20px;border:1px solid rgba(232,199,122,.28);border-radius:22px;background:linear-gradient(135deg,rgba(15,11,22,.88),rgba(35,21,40,.72));backdrop-filter:blur(12px)}.season-chip{display:inline-block;padding:5px 9px;border-radius:999px;background:rgba(145,66,79,.34);color:#f3d59b;font-size:10px;letter-spacing:.12em}.hero-copy h2{font-size:clamp(24px,5vw,40px);margin:12px 0 6px}.hero-copy p{margin:0 0 17px;color:#d2c6d5}.hero-actions{display:flex;gap:9px;flex-wrap:wrap}.royal-cta,.royal-ghost{border-radius:13px;padding:12px 16px;font:inherit;font-weight:700}.royal-cta{flex:1;border:1px solid #f0cf82;background:linear-gradient(180deg,#9b7131,#5d3515);color:#fff4d3;display:flex;justify-content:space-between}.royal-ghost{border:1px solid rgba(218,190,230,.35);background:#17101f;color:#eee1ef}
.resource-ribbon{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 12px}.resource-ribbon>div{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center;background:rgba(10,8,15,.76);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px}.resource-ribbon span{font-size:23px;grid-row:1/3}.resource-ribbon small{font-size:9px;color:#bdb1c0;text-transform:uppercase;letter-spacing:.08em}.resource-ribbon b{font-size:17px;color:#ffe5a2}
.dashboard-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.dashboard-grid button{text-align:left;color:inherit}.dashboard-feature{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;border:1px solid rgba(232,199,122,.42);border-radius:18px;padding:17px;background:linear-gradient(105deg,rgba(79,48,24,.88),rgba(29,19,36,.9))}.feature-icon{font-size:42px}.dashboard-feature h3{margin:3px 0}.dashboard-feature p{margin:0;color:#cbbfc9}.dashboard-feature>b{color:#ffe3a0}.dashboard-card{display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.12);border-radius:15px;padding:14px;background:rgba(13,10,20,.78)}.dashboard-card>span{font-size:29px}.dashboard-card div{display:flex;flex-direction:column;min-width:0}.dashboard-card small{font-size:9px;letter-spacing:.1em;color:#bcaeaf}.dashboard-card strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}.milestone-mark{text-align:center;font-size:9px;letter-spacing:.17em;color:#9d8e9e;padding:16px 0}
.royal-nav{grid-template-columns:repeat(6,1fr);width:min(820px,100%);min-height:64px;border-radius:18px 18px 0 0}.royal-nav button{padding:5px 2px}.royal-nav button span{font-size:20px}.royal-nav button small{font-size:9px}.royal-nav button.active:after{content:"";width:18px;height:2px;border-radius:2px;background:var(--royal-gold);box-shadow:0 0 8px var(--royal-gold)}
.more-panel{max-width:900px}.more-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:18px}.more-tile{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;text-align:left;align-items:center;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:linear-gradient(145deg,#1d1726,#100d16);color:inherit}.more-tile>span{font-size:32px;grid-row:1/3}.more-tile b{font-size:16px}.more-tile small{color:#b8acbb}.more-tile.danger{border-color:rgba(193,70,85,.35)}
.screen:not(#menu):not(#choices):not(#gameOver)>.panel{border-radius:22px;background:linear-gradient(160deg,rgba(26,20,35,.97),rgba(10,8,15,.98));box-shadow:0 22px 70px rgba(0,0,0,.42)}
.chapter-node{transition:.2s transform,.2s border-color}.chapter-node:not(.locked):active{transform:scale(.985)}
@media(max-width:620px){.royal-home-content{padding-left:12px;padding-right:12px}.royal-topbar h1{font-size:23px}.hunter-chip b{display:none}.hero-overlook{min-height:225px;grid-template-columns:86px 1fr;gap:8px;padding-top:18px}.hero-silhouette{font-size:63px}.hero-copy{padding:14px}.hero-copy h2{font-size:24px}.hero-copy p{font-size:12px}.hero-actions{display:grid}.resource-ribbon{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.dashboard-feature{grid-column:auto}.dashboard-card{min-height:65px}.more-grid{grid-template-columns:1fr}.royal-moon{width:130px;height:130px;right:-16px;top:8%}.royal-castle{height:250px}.royal-nav button small{font-size:8px}.royal-nav button span{font-size:19px}}
@media(max-width:370px){.royal-topbar h1{font-size:20px}.hero-overlook{grid-template-columns:70px 1fr}.hero-silhouette{font-size:52px}.hero-copy h2{font-size:20px}.resource-ribbon>div{padding:8px}.dashboard-feature{grid-template-columns:auto 1fr}.dashboard-feature>b{display:none}}

/* Milestone 6.1 — clean home + compact collection */
.home-hidden-values,.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
.clean-home-stage{position:relative;min-height:430px;display:grid;grid-template-columns:92px minmax(0,1fr) 92px;align-items:center;gap:16px;padding:18px 0 12px}
.home-centerpiece{text-align:center;max-width:520px;margin:auto;display:flex;flex-direction:column;align-items:center;gap:8px;text-shadow:0 3px 12px #000}
.home-centerpiece .hero-silhouette{font-size:112px;margin-bottom:2px}.home-centerpiece h2{font-size:clamp(25px,5vw,42px);margin:3px 0}.home-centerpiece p{max-width:460px;margin:0 0 10px;color:#ded3df}.compact-continue{width:min(420px,100%);flex:none}
.home-rail{display:flex;flex-direction:column;gap:10px;z-index:4}.rail-action{min-height:76px;border:1px solid rgba(232,199,122,.42);border-radius:16px;background:linear-gradient(180deg,rgba(24,18,33,.91),rgba(9,8,14,.94));color:#f3e8cb;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;box-shadow:0 8px 20px #0005}.rail-action span{font-size:27px}.rail-action small{font-size:10px}.rail-action:active{transform:scale(.97)}
.compact-ribbon{margin-top:0}.royal-home-content{min-height:calc(100dvh - var(--bottom-nav-h));display:flex;flex-direction:column}.milestone-mark{margin-top:auto}
.card-file-tabs{display:flex;gap:0;overflow-x:auto;padding:0 2px;margin:10px 0 8px;border-bottom:1px solid #67506c;scrollbar-width:none}.card-file-tabs::-webkit-scrollbar{display:none}.card-file-tab{flex:0 0 auto;border:1px solid #67506c;border-bottom:0;border-radius:10px 10px 0 0;background:#120d19;color:#cfc2d0;padding:9px 13px;font:inherit;font-size:12px}.card-file-tab.active{background:linear-gradient(#5a3b1c,#2a180d);color:#ffe9aa;border-color:#d6ac59}
.compact-tools{grid-template-columns:minmax(130px,210px) auto!important;justify-content:end}.collection-divider{margin-bottom:4px}
.portrait-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:8px!important}.portrait-card.compact-card{position:relative;aspect-ratio:1/1.16;min-height:0!important;padding:5px!important;border-width:2px!important;overflow:hidden}.portrait-card.compact-card .card-level{font-size:8px;top:4px;left:4px}.portrait-card.compact-card .tag{display:none}.portrait-card.compact-card .card-art{position:absolute;inset:5px;margin:0!important;min-height:0!important;border-radius:8px;display:flex;align-items:center;justify-content:center}.portrait-card.compact-card .art-sigil{font-size:clamp(25px,5vw,46px)}.portrait-card.compact-card .art-lines{opacity:.35}.portrait-card.compact-card h3,.portrait-card.compact-card p,.portrait-card.compact-card .card-stats,.portrait-card.compact-card .card-footer,.portrait-card.compact-card .card-equip{display:none!important}.card-type-corner{position:absolute;right:4px;bottom:4px;z-index:8;width:22px;height:22px;border-radius:7px;border:1px solid #f4d988;background:#0d0912e8;display:grid;place-items:center;font-size:12px;box-shadow:0 2px 8px #000}.compact-card .merge-chip{top:auto;left:4px;bottom:4px;padding:2px 4px;font-size:7px;max-width:42px;overflow:hidden}.portrait-card.compact-card.selected{outline:2px solid #fff0a2;outline-offset:1px}
@media(max-width:700px){.clean-home-stage{min-height:390px;grid-template-columns:64px minmax(0,1fr) 64px;gap:7px}.home-centerpiece .hero-silhouette{font-size:78px}.home-centerpiece h2{font-size:25px}.home-centerpiece p{font-size:12px}.rail-action{min-height:61px;border-radius:13px}.rail-action span{font-size:22px}.rail-action small{font-size:8px}.portrait-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:4px!important}.portrait-card.compact-card{border-radius:7px!important;padding:3px!important}.portrait-card.compact-card .card-art{inset:3px;border-radius:5px}.portrait-card.compact-card .art-sigil{font-size:22px}.card-type-corner{width:16px;height:16px;font-size:9px;right:2px;bottom:2px;border-radius:5px}.compact-card .merge-chip{font-size:0;width:9px;height:9px;border-radius:50%;padding:0;left:2px;bottom:2px}.compact-tools{display:flex!important;justify-content:space-between;align-items:center}.compact-tools select{max-width:145px}.card-file-tab{font-size:10px;padding:8px 10px}.equipped-deck{grid-template-columns:repeat(6,minmax(0,1fr))!important;display:grid!important;overflow:visible!important}.deck-slot{min-height:68px!important;padding:3px!important;border-radius:8px!important}.deck-slot strong,.deck-slot small,.deck-slot .mini-rarity{display:none!important}.deck-slot .mini-icon{font-size:24px!important}.deck-analysis{font-size:10px}}
@media(max-width:390px){.clean-home-stage{grid-template-columns:56px minmax(0,1fr) 56px}.rail-action{min-height:56px}.home-centerpiece .hero-silhouette{font-size:66px}.home-centerpiece h2{font-size:21px}.portrait-card.compact-card .art-sigil{font-size:19px}}


/* Milestone 6.2 — fixed app viewport and independently scrolling collections */
html,body{
  width:100%;
  height:100%;
  min-height:100%;
  overflow:hidden!important;
  overscroll-behavior:none;
  position:fixed;
  inset:0;
}
#app{
  width:100%;
  height:100dvh;
  min-height:0;
  overflow:hidden!important;
  overscroll-behavior:none;
}
.screen{
  overflow:hidden!important;
  overscroll-behavior:none;
}

/* Home is a fixed dashboard. Nothing behind the bottom navigation scrolls. */
.royal-home{
  overflow:hidden!important;
  height:100dvh;
  min-height:0;
}
.royal-home-content{
  height:calc(100dvh - var(--bottom-nav-h) - env(safe-area-inset-bottom));
  min-height:0!important;
  overflow:hidden;
  padding-bottom:8px;
}
.clean-home-stage{
  flex:1 1 auto;
  min-height:0;
}
.compact-ribbon{flex:0 0 auto}
.milestone-mark{flex:0 0 auto;padding:6px 0 2px}

/* Cards & Deck uses a fixed shell; only the card collection itself scrolls. */
#deckScreen{
  align-items:stretch;
  justify-content:center;
  overflow:hidden!important;
}
#deckScreen>.cards-deck-panel{
  width:min(1000px,100%);
  height:calc(100dvh - var(--bottom-nav-h) - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 18px);
  max-height:none!important;
  min-height:0;
  overflow:hidden!important;
  display:grid;
  grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto;
  align-content:stretch;
}
#collectionCards{
  min-height:0;
  overflow-y:auto!important;
  overflow-x:hidden;
  align-content:start;
  padding:4px 5px 14px 1px;
  scrollbar-gutter:stable;
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
  touch-action:pan-y;
}
#collectionCards::-webkit-scrollbar{width:5px}
#collectionCards::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:8px}
#collectionCards::-webkit-scrollbar-thumb{background:rgba(232,199,122,.46);border-radius:8px}
#deckScreen .sticky-actions{
  position:relative!important;
  bottom:auto!important;
  flex:0 0 auto;
  margin-top:5px;
  padding-top:6px;
  background:linear-gradient(180deg,rgba(10,8,15,0),rgba(10,8,15,.98) 24%);
  z-index:3;
}
#deckScreen .card-file-tabs,
#deckScreen .deck-tools,
#deckScreen .collection-divider,
#deckScreen .deck-zone,
#deckScreen>.cards-deck-panel>.row:first-child{
  min-height:0;
  flex:0 0 auto;
}

/* Other menu panels remain internally scrollable, never the web page itself. */
body:not(.battle-mode) .screen:not(#menu):not(#deckScreen)>.panel{
  overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;
}

@media(max-width:700px){
  #deckScreen{padding-top:max(8px,env(safe-area-inset-top));padding-left:8px;padding-right:8px}
  #deckScreen>.cards-deck-panel{
    height:calc(100dvh - var(--bottom-nav-h) - env(safe-area-inset-bottom) - max(8px,env(safe-area-inset-top)) - 8px);
    padding:11px;
    border-radius:16px;
    grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto;
  }
  #deckScreen>.cards-deck-panel>.row:first-child p{display:none}
  #deckScreen>.cards-deck-panel>.row:first-child h2{margin-bottom:3px}
  #deckScreen .deck-zone{padding:8px;margin-top:4px}
  #deckScreen .section-kicker{font-size:10px;margin-bottom:5px}
  #deckScreen .deck-analysis{padding:6px;margin-top:5px}
  #deckScreen .collection-divider{margin-top:6px}
  #deckScreen .card-file-tabs{margin:4px 0}
  #deckScreen .compact-tools{margin-bottom:3px}
  #collectionCards{padding-bottom:10px}
  #deckScreen .sticky-actions .btn{padding:7px 10px;min-width:100px;font-size:11px}
}

@media(max-height:700px){
  .royal-topbar{transform:scale(.92);transform-origin:top center}
  .clean-home-stage{padding-top:4px;padding-bottom:3px}
  .home-centerpiece .hero-silhouette{font-size:58px}
  .home-centerpiece h2{font-size:20px}
  .home-centerpiece p{display:none}
  .rail-action{min-height:48px}
  .compact-ribbon>div{padding:6px}
  .milestone-mark{display:none}
}

/* Milestone 6.3 — hard viewport lock, reliable tabs, disciplined card grid */
:root{--app-height:100dvh}
html,body{
  height:var(--app-height)!important;
  max-height:var(--app-height)!important;
  width:100%!important;
  overflow:hidden!important;
  position:fixed!important;
  inset:0!important;
  touch-action:none;
  overscroll-behavior:none!important;
}
#app{
  position:fixed!important;
  inset:0!important;
  width:100%!important;
  height:var(--app-height)!important;
  max-height:var(--app-height)!important;
  overflow:hidden!important;
}
.screen{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:var(--app-height)!important;
  max-height:var(--app-height)!important;
  overflow:hidden!important;
}

/* Cards screen: the shell never moves; collection is the only vertical scroller. */
#deckScreen{
  padding:max(6px,env(safe-area-inset-top)) 8px calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 6px)!important;
  align-items:stretch!important;
  justify-content:center!important;
  touch-action:none;
}
#deckScreen>.cards-deck-panel{
  width:min(980px,100%)!important;
  height:100%!important;
  max-height:100%!important;
  min-height:0!important;
  margin:0 auto!important;
  padding:10px!important;
  overflow:hidden!important;
  display:grid!important;
  grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto!important;
  gap:5px!important;
  touch-action:none;
}
#deckScreen>.cards-deck-panel>.row:first-child{display:flex!important;min-height:0!important;margin:0!important}
#deckScreen>.cards-deck-panel>.row:first-child h2{font-size:clamp(22px,5vw,34px);margin:0!important}
#deckScreen>.cards-deck-panel>.row:first-child p{display:none!important}
#deckCounter{font-size:20px!important}
#deckScreen .deck-zone{padding:7px!important;margin:0!important;min-height:0!important}
#deckScreen .section-kicker{margin:0 0 5px!important;font-size:10px!important}
#deckScreen .equipped-deck{gap:5px!important}
#deckScreen .deck-slot{height:62px!important;min-height:62px!important;padding:2px!important;border-radius:8px!important}
#deckScreen .deck-slot .mini-icon{font-size:22px!important}
#deckScreen .deck-slot strong,#deckScreen .deck-slot small,#deckScreen .deck-slot .mini-rarity,#deckScreen .deck-slot .empty-plus+span{display:none!important}
#deckScreen .deck-analysis{font-size:9px!important;line-height:1.25!important;padding:5px 7px!important;margin:4px 0 0!important}
#deckScreen .collection-divider{margin:1px 0 0!important;font-size:10px!important;gap:8px!important}

/* Real file tabs: always above the cards and always clickable. */
#deckScreen .card-file-tabs{
  position:relative!important;
  z-index:20!important;
  display:grid!important;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:2px!important;
  overflow:visible!important;
  margin:0!important;
  padding:0!important;
  border-bottom:1px solid #8a6a78!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
}
#deckScreen .card-file-tab{
  position:relative!important;
  z-index:21!important;
  width:100%!important;
  min-width:0!important;
  padding:8px 2px!important;
  border-radius:8px 8px 0 0!important;
  font-size:clamp(8px,2.3vw,12px)!important;
  line-height:1.05!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:rgba(232,199,122,.24);
}
#deckScreen .card-file-tab.active{box-shadow:inset 0 -3px #f1cf77!important}
#deckScreen .compact-tools{
  position:relative!important;
  z-index:18!important;
  display:grid!important;
  grid-template-columns:minmax(115px,160px) 1fr!important;
  gap:7px!important;
  margin:0!important;
  padding:0!important;
  pointer-events:auto!important;
}
#deckScreen .compact-tools select{width:100%!important;max-width:none!important;height:36px!important;padding:4px 8px!important}
#deckScreen .merge-toggle{min-height:36px!important;padding:5px 8px!important;margin:0!important;font-size:12px!important}

/* Stable 6-across icon grid; no overlap and no masonry-like spacing. */
#collectionCards{
  position:relative!important;
  z-index:5!important;
  display:grid!important;
  grid-template-columns:repeat(6,minmax(0,1fr))!important;
  grid-auto-rows:86px!important;
  gap:5px!important;
  min-height:0!important;
  height:100%!important;
  padding:4px 3px 10px!important;
  margin:0!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  align-content:start!important;
  overscroll-behavior:contain!important;
  -webkit-overflow-scrolling:touch!important;
  touch-action:pan-y!important;
}
#collectionCards .portrait-card.compact-card{
  width:100%!important;
  height:86px!important;
  min-height:86px!important;
  max-height:86px!important;
  aspect-ratio:auto!important;
  margin:0!important;
  padding:3px!important;
  border-radius:8px!important;
  transform:none!important;
  overflow:hidden!important;
}
#collectionCards .portrait-card.compact-card:hover{transform:none!important}
#collectionCards .portrait-card.compact-card .card-art{
  position:absolute!important;
  inset:3px!important;
  width:auto!important;
  height:auto!important;
  min-height:0!important;
  margin:0!important;
  border-radius:6px!important;
}
#collectionCards .portrait-card.compact-card .art-sigil{font-size:clamp(22px,6vw,38px)!important}
#collectionCards .portrait-card.compact-card .card-level{
  top:3px!important;left:3px!important;font-size:8px!important;padding:1px 4px!important;
  max-width:38px!important;white-space:nowrap!important;overflow:hidden!important;
}
#collectionCards .card-type-corner{
  top:3px!important;right:3px!important;bottom:auto!important;
  width:17px!important;height:17px!important;font-size:9px!important;border-radius:5px!important;
}
#collectionCards .portrait-card.compact-card .card-equip{display:none!important}
#collectionCards .compact-card .merge-chip{
  left:3px!important;bottom:3px!important;top:auto!important;
  width:10px!important;height:10px!important;min-width:0!important;padding:0!important;
  border-radius:50%!important;font-size:0!important;
}
#deckScreen .sticky-actions{
  position:relative!important;
  z-index:25!important;
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:8px!important;
  margin:0!important;
  padding:4px 6px 0!important;
  background:#0b0910!important;
}
#deckScreen .sticky-actions .btn{width:100%!important;min-width:0!important;padding:8px!important}

@media(max-width:390px){
  #deckScreen{padding-left:5px!important;padding-right:5px!important}
  #deckScreen>.cards-deck-panel{padding:7px!important;gap:3px!important}
  #collectionCards{grid-auto-rows:78px!important;gap:4px!important}
  #collectionCards .portrait-card.compact-card{height:78px!important;min-height:78px!important;max-height:78px!important}
  #deckScreen .card-file-tab{font-size:7.5px!important;padding:7px 1px!important}
  #deckScreen .deck-slot{height:56px!important;min-height:56px!important}
}

/* Milestone 6.4 — Battle Command UI */
body.battle-mode{overflow:hidden;touch-action:none}
body.battle-mode #app{height:100dvh;overflow:hidden}
.battle-hud{padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))!important;display:flex!important;flex-direction:column;justify-content:space-between;pointer-events:none}
.battle-hud.hidden{display:none!important}
.battle-topbar{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;pointer-events:none}
.battle-status{display:flex;gap:5px;min-width:0;flex-wrap:wrap}
.battle-pill{height:42px;min-width:64px;padding:5px 8px;border:1px solid #735b3c;border-radius:10px;background:linear-gradient(180deg,#17131de8,#09070ddd);box-shadow:0 4px 16px #0009;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:5px;align-items:center;pointer-events:auto}
.battle-pill>span{grid-row:1/3;font-size:18px}.battle-pill small{font-size:8px;letter-spacing:.12em;color:#c9b995}.battle-pill strong{font-size:14px;color:#ffe3a0;line-height:1}
.gate-pill{border-color:#8c3d4e}.wave-pill{border-color:#9d782c}
.battle-controls{display:flex;gap:5px;pointer-events:auto}
.battle-icon{width:42px;height:42px;border:1px solid #7b6040;border-radius:11px;background:linear-gradient(#211927,#0a080d);color:#f8dfaa;font:700 17px Georgia;box-shadow:0 4px 14px #0009;display:grid;place-items:center;padding:0}
.battle-icon:active{transform:scale(.94)}.danger-control{color:#ffb1ad;border-color:#843943}.speed-control span{font-size:13px}
.wave-banner{position:absolute;top:20%;left:50%;transform:translate(-50%,-50%);min-width:190px;text-align:center;padding:12px 28px;background:linear-gradient(90deg,transparent,#120a14e8 18%,#120a14e8 82%,transparent);border-top:1px solid #bd8d3e;border-bottom:1px solid #bd8d3e;animation:waveBanner 1.7s ease both;pointer-events:none}
.wave-banner span{display:block;font-size:10px;letter-spacing:.35em;color:#c6a86b}.wave-banner strong{font:700 30px Georgia;color:#fff2cb;text-shadow:0 2px 10px #000}
@keyframes waveBanner{0%{opacity:0;transform:translate(-50%,-65%) scale(.9)}18%,72%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-35%) scale(1.05)}}
.boss-command{position:absolute;top:max(62px,calc(env(safe-area-inset-top) + 54px));left:50%;transform:translateX(-50%);width:min(72vw,650px);padding:8px 12px;border:1px solid #9c384d;border-radius:12px;background:#0c0710e8;box-shadow:0 7px 24px #000b;pointer-events:none}
.boss-label{display:flex;justify-content:space-between;font-size:12px;color:#f2c7c7;text-transform:uppercase;letter-spacing:.08em}.boss-track{height:9px;margin-top:5px;border-radius:99px;overflow:hidden;background:#240c17;border:1px solid #5e2736}.boss-track i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#6e1737,#e04a6d,#ffb06a);transition:width .15s linear}
.battle-bottom{display:flex;flex-direction:column;gap:6px;pointer-events:none}
.battle-context{align-self:center;display:flex;align-items:center;gap:10px;padding:4px 10px;border:1px solid #4d4051;border-radius:9px;background:#09070dcf;font-size:10px;pointer-events:none}.battle-context span{white-space:nowrap}.hero-xp{width:92px;height:5px;border-radius:9px;background:#201724;overflow:hidden}.hero-xp i{display:block;height:100%;background:linear-gradient(90deg,#9d63db,#f0cf6d)}
.battle-hand{display:grid!important;grid-template-columns:repeat(6,minmax(0,76px))!important;gap:5px!important;justify-content:center!important;width:100%;pointer-events:auto}
.battle-hand.hidden{display:none!important}.battle-hand .hand-card{height:70px!important;border-radius:10px!important;background:linear-gradient(#291728,#0b0910)!important;box-shadow:0 5px 16px #000a}.battle-hand .hand-card.active{transform:translateY(-8px);outline:2px solid #ffe18b}
#placementBar{bottom:calc(88px + env(safe-area-inset-bottom));left:50%;right:auto;transform:translateX(-50%);width:min(94vw,620px);border-radius:12px;background:#09070dee;border:1px solid #8b6b3e;box-shadow:0 8px 24px #000b;pointer-events:auto}
#towerInspector{top:auto!important;bottom:calc(88px + env(safe-area-inset-bottom));right:max(8px,env(safe-area-inset-right));width:min(300px,88vw);max-height:42vh;overflow:auto;border:1px solid #8b6b3e;border-radius:14px;background:linear-gradient(160deg,#17111deF,#08070bef);box-shadow:0 12px 34px #000c;padding:14px;pointer-events:auto}
#towerInspector h3{margin:0 28px 8px 0;color:#ffe1a0}.inspect-close{position:absolute;right:8px;top:8px;width:28px;height:28px;border-radius:50%;border:1px solid #7f5d38;background:#23131b;color:#fff}
.synergy-line{margin-top:8px;padding:7px;border-radius:8px;background:#2c1b2f;color:#e2c4ff}
@media(max-width:700px){
 .battle-topbar{gap:4px}.battle-status{display:grid;grid-template-columns:repeat(2,64px);gap:4px}.battle-pill{height:35px;min-width:64px;padding:3px 6px;border-radius:8px}.battle-pill>span{font-size:15px}.battle-pill strong{font-size:12px}.battle-pill small{font-size:7px}.battle-controls{display:grid;grid-template-columns:repeat(2,36px);gap:4px}.battle-icon{width:36px;height:36px;border-radius:9px}
 .boss-command{top:max(86px,calc(env(safe-area-inset-top) + 78px));width:82vw}.battle-context{font-size:9px;gap:7px}.hero-xp{width:55px}.battle-hand{grid-template-columns:repeat(6,minmax(0,1fr))!important}.battle-hand .hand-card{height:62px!important;padding:3px!important}.battle-hand .hand-card .hicon{font-size:20px!important}.battle-hand .hand-card .hname{display:none}.battle-hand .hand-card .hcost{font-size:10px}
 #placementBar{bottom:calc(73px + env(safe-area-inset-bottom));padding:6px 8px}.placementBar .btn{min-height:34px}
 #towerInspector{bottom:calc(75px + env(safe-area-inset-bottom));font-size:12px}
}


/* Milestone 7 — The Living Battlefield */
.battle-cinematic{position:fixed;inset:0;z-index:95;display:grid;place-items:center;pointer-events:none;background:rgba(2,2,7,.18);overflow:hidden}
.battle-cinematic.hidden{display:none!important}.cinematic-vignette{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 20%,rgba(0,0,0,.82) 82%);animation:cinematicPulse 2.35s ease both}
.cinematic-copy{position:relative;text-align:center;width:min(90vw,720px);padding:22px 28px;border-top:1px solid #b88a45;border-bottom:1px solid #b88a45;background:linear-gradient(90deg,transparent,#100a15e8 16%,#100a15e8 84%,transparent);animation:cinematicCopy 2.35s ease both}
.cinematic-copy span{font-size:11px;letter-spacing:.38em;color:#d3b472}.cinematic-copy h2{margin:7px 0 4px;font:700 clamp(28px,6vw,54px) Georgia;color:#fff0c6;text-shadow:0 3px 22px #000}.cinematic-copy p{margin:0;color:#d8cad5;font-size:13px}
@keyframes cinematicCopy{0%{opacity:0;transform:translateY(28px) scale(.94)}18%,70%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-18px) scale(1.04)}}
@keyframes cinematicPulse{0%{opacity:0}18%,76%{opacity:1}100%{opacity:0}}
.battle-hand .hand-card{transition:transform .22s ease,filter .22s ease,opacity .22s ease}.battle-hand .hand-card:nth-child(1){animation:handDeal .34s .02s both}.battle-hand .hand-card:nth-child(2){animation:handDeal .34s .07s both}.battle-hand .hand-card:nth-child(3){animation:handDeal .34s .12s both}.battle-hand .hand-card:nth-child(4){animation:handDeal .34s .17s both}.battle-hand .hand-card:nth-child(5){animation:handDeal .34s .22s both}.battle-hand .hand-card:nth-child(6){animation:handDeal .34s .27s both}
@keyframes handDeal{from{opacity:0;transform:translateY(28px) scale(.85)}to{opacity:1;transform:none}}
#choicesCards .portrait-card{animation:rewardDeal .38s ease both}#choicesCards .portrait-card:nth-child(2){animation-delay:.07s}#choicesCards .portrait-card:nth-child(3){animation-delay:.14s}
@keyframes rewardDeal{from{opacity:0;transform:translateY(34px) rotateX(14deg) scale(.92)}to{opacity:1;transform:none}}
body.battle-mode #game{filter:saturate(1.08) contrast(1.04)}


/* Milestone 7.2 — victory screen input reliability */
#gameOver{z-index:120!important;pointer-events:auto!important;touch-action:manipulation!important}
#gameOver>.panel{pointer-events:auto!important}
#gameOver .row,#gameOver button{pointer-events:auto!important;touch-action:manipulation!important}
#menuBtn,#retryBtn{position:relative;z-index:2;min-height:48px}


/* Milestone 7.3 stability and layout hardening */
html,body{width:100%;height:100%;max-width:100%;overflow:hidden;overscroll-behavior:none;touch-action:none}
body{position:fixed;inset:0;margin:0}
#app{position:fixed;inset:0;width:100%;height:var(--app-height,100dvh);overflow:hidden;overscroll-behavior:none}
.screen{position:absolute;inset:0;overflow:hidden;overscroll-behavior:none}
.screen:not(.hidden){display:block}
.screen>.panel{max-height:calc(var(--app-height,100dvh) - var(--bottom-nav-height,88px) - env(safe-area-inset-bottom) - 16px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
#deckScreen>.cards-deck-panel{height:calc(var(--app-height,100dvh) - var(--bottom-nav-height,88px) - env(safe-area-inset-bottom));max-height:none;overflow:hidden;display:grid;grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto;align-content:stretch}
#collectionCards{min-height:0;height:auto;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;align-content:start}
.card-file-tabs,.card-file-tab,#bottomNav button,button,select,input{touch-action:manipulation}
#game{touch-action:none}
#gameOver{z-index:1200;background:#09070d}
#gameOver>.panel{overflow:auto;max-height:calc(var(--app-height,100dvh) - 24px)}
.hidden{display:none!important}

/* Milestone 7.4 — hero + 2x3 battle-deck loadout */
.deck-loadout{display:grid;grid-template-columns:minmax(150px,29%) minmax(0,1fr);gap:10px;align-items:stretch}
.deck-hero-card{min-width:0;border:2px solid #9d7b43;border-radius:14px;background:linear-gradient(165deg,#3a2130 0%,#17101d 48%,#09080d 100%);padding:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#f5e7c4;overflow:hidden;position:relative;box-shadow:inset 0 0 0 1px #f3d78433}
.deck-hero-card:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 28%,#d8ad5c26,transparent 48%);pointer-events:none}
.deck-hero-card:active{transform:translateY(1px)}
.deck-hero-portrait{width:min(88px,80%);aspect-ratio:4/5;border:1px solid #e1bd6c;border-radius:12px;display:grid;place-items:center;font-size:50px;background:linear-gradient(160deg,#4a3142,#17121d 62%,#08070b);box-shadow:inset 0 0 22px #0009,0 5px 14px #0008;z-index:1}
.deck-hero-copy{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;z-index:1;min-width:0}
.deck-hero-copy small{font-size:8px;letter-spacing:.14em;color:#c9ad72}
.deck-hero-copy strong{font-size:12px;line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.deck-hero-copy span{font-size:11px;color:#f2d47f}
.deck-loadout .equipped-deck{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:repeat(2,minmax(0,1fr));gap:6px!important;overflow:visible!important;padding:0!important}
.deck-loadout .deck-slot{min-height:0!important;height:100%!important;aspect-ratio:auto;padding:4px!important;border-radius:9px!important}
.deck-loadout .deck-slot .mini-icon{font-size:25px!important}

@media(max-width:700px){
  #deckScreen .deck-zone{padding:7px!important}
  .deck-loadout{grid-template-columns:30% minmax(0,1fr);gap:6px;min-height:134px}
  .deck-hero-card{padding:5px;border-radius:10px;gap:4px}
  .deck-hero-portrait{width:min(70px,88%);font-size:38px;border-radius:9px}
  .deck-hero-copy small{font-size:6px;letter-spacing:.08em}
  .deck-hero-copy strong{font-size:9px}
  .deck-hero-copy span{font-size:9px}
  .deck-loadout .equipped-deck{gap:4px!important}
  .deck-loadout .deck-slot{min-height:62px!important;height:auto!important;padding:2px!important;border-width:1.5px!important}
  .deck-loadout .deck-slot .mini-icon{font-size:22px!important}
  .deck-loadout .deck-slot .empty-plus{font-size:18px!important}
}

@media(max-width:390px){
  .deck-loadout{grid-template-columns:28% minmax(0,1fr);min-height:122px}
  .deck-hero-portrait{width:min(58px,90%);font-size:32px}
  .deck-loadout .deck-slot{min-height:56px!important}
  .deck-loadout .deck-slot .mini-icon{font-size:19px!important}
}


/* Milestone 8 — Heroes Awaken */
.deck-hero-card{justify-content:flex-start!important}
.deck-hero-xp{width:100%;height:5px;border-radius:99px;background:#09070b;border:1px solid #8c6a38;overflow:hidden;margin-top:3px}
.deck-hero-xp i{display:block;height:100%;background:linear-gradient(90deg,#8c5ce6,#e2bc63);width:0;transition:width .35s ease}
.deck-hero-gear{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;width:100%;z-index:1;margin-top:auto}
.deck-hero-gear>span{min-width:0;border:1px solid #715834;border-radius:7px;background:#09080dcc;padding:3px 1px;display:grid;place-items:center;gap:1px}
.deck-hero-gear i{font-style:normal;font-size:15px;line-height:1}
.deck-hero-gear small{font-size:5.5px;text-transform:uppercase;color:#c9ad72;overflow:hidden;text-overflow:ellipsis;width:100%}
.favorite-corner{position:absolute;left:3px;top:3px;z-index:4;font-size:10px;color:#5d5863;text-shadow:0 1px 2px #000;pointer-events:none}
.favorite-corner.is-favorite{color:#f4c85f}
.detail-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.favorite-button{border:1px solid #806a42;background:#151019;color:#c8b98e;border-radius:9px;padding:7px 10px;font:inherit;font-size:11px;white-space:nowrap}
.favorite-button.active{color:#ffe28b;border-color:#d2a84f;background:#362915}
.card-flavor{display:block;margin-top:8px;color:#aa9c83;font-style:italic;line-height:1.45}
@media(max-width:430px){
 .deck-hero-gear{gap:2px}.deck-hero-gear>span{padding:2px 0}.deck-hero-gear i{font-size:12px}.deck-hero-gear small{font-size:4.5px}
 .detail-title-row{align-items:flex-start}.favorite-button{padding:6px 7px;font-size:9px}
}

/* Milestone 9A — Full-Screen Battlefield & Cathedral Gate */
body.battle-mode #game{background:#08070c}
body.battle-mode .battle-bottom{padding-bottom:2px}
body.battle-mode .battle-context{background:#09070de8;backdrop-filter:blur(8px);margin-bottom:1px}
body.battle-mode .battle-hand .hand-card{min-height:58px}
@media(max-width:700px){
  body.battle-mode .battle-hud{padding-top:max(7px,env(safe-area-inset-top))!important}
  body.battle-mode .battle-context{padding:3px 8px!important}
  body.battle-mode .battle-hand{gap:4px!important}
}

/* Milestone 9B — Campaign Card Unlocks */
.compact-card.locked-card{filter:saturate(.2) brightness(.55);overflow:hidden}
.compact-card.locked-card .card-equip{opacity:.65;cursor:not-allowed}
.card-lock-overlay{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:8px;text-align:center;background:linear-gradient(180deg,#09070bcf,#100912ed);backdrop-filter:blur(1px);color:#ead9bd;border-radius:inherit;pointer-events:none}
.card-lock-overlay b{font-size:12px;letter-spacing:.12em;color:#e4b95f}
.card-lock-overlay small{font-size:8px;line-height:1.25;color:#c8b7a0;max-width:95%}


/* Milestone 9D — card collection visibility repair */
#deckScreen>.cards-deck-panel{grid-template-rows:auto auto auto auto auto minmax(150px,1fr) auto!important;}
#collectionCards{display:grid!important;visibility:visible!important;opacity:1!important;min-height:150px!important;height:100%!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-auto-rows:82px!important;}
@media(max-width:700px){#collectionCards{min-height:170px!important;grid-auto-rows:76px!important;}#deckScreen>.cards-deck-panel{grid-template-rows:auto auto auto auto auto minmax(170px,1fr) auto!important;}}

/* v11.0 — Art Renaissance: cinematic battlefield presentation */
body.battle-mode:before{content:'';position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(circle at 50% 35%,transparent 28%,rgba(1,2,8,.24) 65%,rgba(0,0,0,.62) 100%);mix-blend-mode:multiply}
body.battle-mode #game{filter:saturate(1.18) contrast(1.09) brightness(.98);box-shadow:inset 0 0 90px #000}
body.battle-mode .battle-pill,body.battle-mode .battle-icon{background:linear-gradient(160deg,rgba(25,18,31,.94),rgba(7,7,13,.98))!important;box-shadow:inset 0 0 0 1px #e0bd6333,0 8px 22px #0008,0 0 18px #7d385322}
body.battle-mode .battle-context{border-color:#a48158!important;background:linear-gradient(90deg,#09070ee8,#17101ae8,#09070ee8)!important;box-shadow:0 8px 30px #0009,inset 0 0 18px #9c6a4930}
body.battle-mode .battle-hand .hand-card{background:linear-gradient(155deg,#342039 0%,#17101f 48%,#08070d 100%)!important;border-color:#8d667e!important;box-shadow:inset 0 0 18px #c18ca016,0 7px 18px #000c!important;overflow:hidden}
body.battle-mode .battle-hand .hand-card:before{content:'';position:absolute;inset:-60% -30%;background:linear-gradient(115deg,transparent 42%,rgba(255,236,184,.14) 49%,transparent 56%);transform:translateX(-45%);animation:relicSheen 4.8s ease-in-out infinite;pointer-events:none}
body.battle-mode .battle-hand .hand-card.active{transform:translateY(-10px) scale(1.035);filter:brightness(1.16);box-shadow:0 12px 28px #000,0 0 22px #f0ca6f66!important}
@keyframes relicSheen{0%,70%{transform:translateX(-55%)}100%{transform:translateX(55%)}}
#waveBanner{backdrop-filter:blur(10px);box-shadow:0 12px 40px #000b,inset 0 0 24px #b8886430}

/* V15.4 — Essence economy, poker-ratio cards, ground defenses */
.essence-pill{position:relative;overflow:hidden;min-width:92px}.essence-pill>*{position:relative;z-index:2}.essence-pill:after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#7d55ff,#e9dcff);box-shadow:0 0 10px #a887ff}
.essence-fly{position:fixed;z-index:99999;pointer-events:none;color:#d9c6ff;font-size:22px;text-shadow:0 0 12px #a56eff,0 0 4px #fff;transition:transform .43s cubic-bezier(.2,.8,.2,1),opacity .4s ease;will-change:transform;transform:translate(0,0) scale(1)}
#collectionCards.portrait-grid{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))!important}
#collectionCards .portrait-card.compact-card{aspect-ratio:2.5/3.5!important;height:auto!important;min-height:0!important;max-height:none!important}
#deckScreen .equipped-deck{grid-template-columns:repeat(6,minmax(72px,118px))!important;justify-content:center;align-items:start}
#deckScreen .deck-slot{aspect-ratio:2.5/3.5!important;height:auto!important;min-height:0!important;max-height:166px!important;position:relative;overflow:hidden;background-image:radial-gradient(circle at 50% 32%,#ffffff20,transparent 40%)!important}
#deckScreen .deck-slot .mini-icon{font-size:clamp(24px,4vw,38px)!important}
.battle-hand{grid-template-columns:repeat(8,minmax(48px,78px))!important;gap:5px!important}
.battle-hand .hand-card{aspect-ratio:2.5/3.5!important;height:auto!important;min-height:70px!important;padding:4px!important;border-width:2px!important}
.battle-hand .hand-card .hicon{font-size:clamp(19px,4vw,27px)!important}.battle-hand .hand-card .hname{display:block!important;font-size:8px!important;line-height:1.05;max-height:17px;overflow:hidden}.battle-hand .hand-card .hcost{right:3px;bottom:2px;font-size:9px!important}.battle-hand .hand-card .hlvl{position:absolute;left:3px;top:2px;font-size:8px}.battle-hand .hand-card.locked-cost{filter:grayscale(.65) brightness(.55)}.battle-hand .hand-card.affordable{cursor:pointer}.battle-hand .hand-card.bonus-trap{border-style:dashed!important;box-shadow:inset 0 0 0 1px #d6c2a366,0 5px 14px #000a!important}
@media(max-width:700px){#collectionCards.portrait-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.battle-hand{grid-template-columns:repeat(8,minmax(0,1fr))!important}.battle-hand .hand-card{min-height:60px!important}.battle-hand .hand-card .hname{display:none!important}}
.essence-pill .essence-fill{position:absolute!important;z-index:1!important;left:0;bottom:0;height:4px;width:16.67%;background:linear-gradient(90deg,#8058ff,#efe7ff);box-shadow:0 0 12px #a986ff;transition:width .25s ease}.essence-pill:after{display:none}

/* V16.0 Essence Draft */
body.battle-mode .battle-bottom{pointer-events:none}
body.battle-mode #hand{display:none!important}
.essence-pill{min-width:118px!important;padding-left:36px!important}
.essence-pill:before{content:'✦';position:absolute;left:8px;bottom:5px;width:22px;height:34px;border:2px solid #cdbbff;border-radius:45% 45% 38% 38%/22% 22% 68% 68%;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px;color:#fff;background:linear-gradient(to top,#8c61ff var(--vial,0%),#171021 var(--vial,0%));box-shadow:inset 0 0 10px #bca8ff55,0 0 10px #8e6cff55;font-size:10px;z-index:3}
.essence-pill.vial-full{animation:vialPulse .7s ease-in-out infinite alternate}
.essence-pill.vial-full:before{box-shadow:inset 0 0 14px #fff,0 0 20px #b798ff}
@keyframes vialPulse{to{filter:brightness(1.35);transform:translateY(-1px)}}
#choices{background:rgba(4,3,7,.74);backdrop-filter:blur(4px)}
#choices .panel{max-width:760px;background:linear-gradient(180deg,#1b1221f2,#09070df5);border:1px solid #8e6a99;box-shadow:0 20px 70px #000}
#choicesCards{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:clamp(10px,3vw,24px)!important;align-items:stretch}
#choicesCards .portrait-card{aspect-ratio:2.5/3.5;min-height:0!important}
@media(max-width:620px){#choices .panel{padding:16px 10px}#choicesCards{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}#choicesCards .portrait-card{padding:6px!important}#choicesCards .card-name{font-size:11px!important}#choicesCards p{display:none!important}}

/* V16.1 — Card System: poker proportions, 2×3 deck, and two hero ground slots */
#deckScreen>.cards-deck-panel{
  grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto!important;
}
.deck-loadout{
  display:grid!important;
  grid-template-columns:minmax(150px,220px) minmax(0,1fr)!important;
  align-items:stretch!important;
  gap:12px!important;
}
.loadout-card-column{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(150px,.42fr);gap:10px;align-items:stretch}
.equipped-deck{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  grid-template-rows:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;
  overflow:visible!important;
}
.deck-slot,.ground-defense-slot{
  position:relative;
  aspect-ratio:5/7!important;
  min-height:0!important;
  padding:5px!important;
  border-radius:11px!important;
  overflow:hidden;
  text-align:left;
}
.deck-slot.filled,.ground-defense-slot.filled{display:block!important;background:#110c16}
.deck-slot .card-level,.ground-defense-slot .card-level{font-size:7px;top:5px;left:5px}
.deck-slot .tag,.ground-defense-slot .tag{font-size:6px;top:5px;right:5px;padding:2px 4px}
.deck-slot .card-art,.ground-defense-slot .card-art{min-height:0!important;height:55%;margin:16px 0 3px!important;border-radius:7px}
.deck-slot .art-sigil,.ground-defense-slot .art-sigil{font-size:clamp(20px,3vw,34px)}
.deck-slot h3,.ground-defense-slot h3{font-size:9px!important;line-height:1.05;margin:2px 0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.deck-slot p,.ground-defense-slot p{display:none!important}
.deck-slot .card-stats,.ground-defense-slot .card-stats{font-size:6px!important;gap:2px!important}
.deck-slot .card-footer,.ground-defense-slot .card-footer{display:none!important}
.deck-slot .mini-rarity,.deck-slot .mini-icon,.deck-slot>strong,.deck-slot>small{display:none!important}
.ground-defense-zone{border:1px solid rgba(232,199,122,.25);border-radius:13px;padding:8px;background:linear-gradient(180deg,rgba(42,24,17,.42),rgba(12,8,14,.72));min-width:0}
.ground-defense-heading{display:flex;flex-direction:column;gap:1px;margin-bottom:6px;color:#f0d999}.ground-defense-heading span{font-size:9px;font-weight:800;letter-spacing:.09em}.ground-defense-heading small{font-size:7px;color:#bcaebd}
.ground-defense-slots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.ground-defense-slot .ground-slot-label{position:absolute;z-index:8;left:50%;transform:translateX(-50%);bottom:3px;font-size:6px;letter-spacing:.08em;color:#ffeab0;background:#0b0710dd;border-radius:4px;padding:2px 4px;white-space:nowrap}

/* Every collection card now keeps a true poker-card silhouette. */
.portrait-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important}
.portrait-card.compact-card{aspect-ratio:5/7!important;min-height:0!important;border-radius:11px!important;padding:5px!important}
.portrait-card.compact-card .card-art{inset:auto!important;position:relative!important;height:58%;margin:17px 0 4px!important;border-radius:8px}
.portrait-card.compact-card .art-sigil{font-size:clamp(25px,4vw,44px)}
.portrait-card.compact-card h3{display:block!important;font-size:9px!important;line-height:1.05;margin:2px 0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.portrait-card.compact-card .card-stats{display:flex!important;font-size:6px!important;gap:2px!important}
.portrait-card.compact-card p,.portrait-card.compact-card .card-footer{display:none!important}
.portrait-card.compact-card .card-equip{display:block!important;position:absolute;left:5px;right:5px;bottom:5px;height:18px;padding:0!important;font-size:7px!important;border-radius:5px!important}
.portrait-card.compact-card .card-type-corner{bottom:26px}
.portrait-card.compact-card .merge-chip{bottom:26px}

@media(max-width:700px){
  .deck-loadout{grid-template-columns:86px minmax(0,1fr)!important;gap:7px!important}
  .loadout-card-column{grid-template-columns:minmax(0,1fr) 92px;gap:6px}
  .equipped-deck{gap:4px!important}
  .deck-slot,.ground-defense-slot{padding:3px!important;border-radius:7px!important}
  .deck-slot .card-art,.ground-defense-slot .card-art{margin:12px 0 2px!important;height:53%}
  .deck-slot .art-sigil,.ground-defense-slot .art-sigil{font-size:18px}
  .deck-slot h3,.ground-defense-slot h3{font-size:6px!important}
  .deck-slot .card-stats,.ground-defense-slot .card-stats{display:none!important}
  .ground-defense-zone{padding:4px;border-radius:8px}.ground-defense-heading small{display:none}.ground-defense-heading span{font-size:6px}.ground-defense-slots{grid-template-columns:1fr;gap:4px}.ground-defense-slot{width:100%;max-height:88px}.ground-defense-slot:nth-child(2){display:block}
  .portrait-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important}
  .portrait-card.compact-card{border-radius:8px!important}
  .portrait-card.compact-card .card-art{margin-top:13px!important;height:57%}
  .portrait-card.compact-card h3{font-size:7px!important}
  .portrait-card.compact-card .card-stats{display:none!important}
}
@media(max-width:390px){.portrait-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.deck-loadout{grid-template-columns:74px minmax(0,1fr)!important}.loadout-card-column{grid-template-columns:minmax(0,1fr) 78px}.ground-defense-slot{max-height:76px}}

/* V16.1a — verified card-screen layout repair.
   These ID-specific rules intentionally override legacy Milestone 9D/V15 selectors. */
#deckScreen #equippedDeck.equipped-deck{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  grid-template-rows:repeat(2,minmax(0,1fr))!important;
  grid-auto-flow:row!important;
  gap:8px!important;
  justify-content:stretch!important;
  align-items:stretch!important;
  overflow:visible!important;
}
#deckScreen #equippedDeck .deck-slot{
  width:100%!important;
  max-width:none!important;
  max-height:none!important;
  height:auto!important;
  aspect-ratio:5/7!important;
}
#deckScreen #groundDefenseSlots.ground-defense-slots{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  grid-template-rows:1fr!important;
  gap:7px!important;
}
#deckScreen #groundDefenseSlots .ground-defense-slot{
  display:block!important;
  width:100%!important;
  max-width:none!important;
  max-height:none!important;
  height:auto!important;
  aspect-ratio:5/7!important;
}
#deckScreen #collectionCards.cards.portrait-grid{
  display:grid!important;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  grid-auto-rows:auto!important;
  align-content:start!important;
  gap:9px!important;
  min-height:0!important;
  height:auto!important;
  max-height:calc((min(15vw,154px) * 1.4 + 9px) * 5)!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  padding:4px 5px 12px 2px!important;
  visibility:visible!important;
  opacity:1!important;
  -webkit-overflow-scrolling:touch;
}
#deckScreen #collectionCards .portrait-card.compact-card{
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  aspect-ratio:5/7!important;
  overflow:hidden!important;
}
#deckScreen .loadout-card-column{
  grid-template-columns:minmax(0,1fr) minmax(170px,.42fr)!important;
}
@media(max-width:700px){
  #deckScreen #equippedDeck.equipped-deck{gap:5px!important}
  #deckScreen #collectionCards.cards.portrait-grid{
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    grid-auto-rows:auto!important;
    max-height:calc((22vw * 1.4 + 6px) * 5)!important;
    gap:6px!important;
  }
  #deckScreen #groundDefenseSlots.ground-defense-slots{
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
  }
  #deckScreen .loadout-card-column{
    grid-template-columns:minmax(0,1fr) 96px!important;
  }
}

/* V16.1b — Collection viewport repair.
   Final ID-specific overrides remove the legacy 86px icon-grid rules that
   compressed and stacked the lower card collection. */
#deckScreen #collectionCards.cards.portrait-grid{
  display:grid!important;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  grid-auto-rows:auto!important;
  align-items:start!important;
  align-content:start!important;
  gap:9px!important;
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  padding:5px 7px 18px 3px!important;
  scroll-padding-bottom:18px;
}
#deckScreen #collectionCards .portrait-card.compact-card{
  position:relative!important;
  display:flex!important;
  flex-direction:column!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  aspect-ratio:5/7!important;
  margin:0!important;
  padding:5px!important;
  border-radius:10px!important;
  overflow:hidden!important;
}
#deckScreen #collectionCards .portrait-card.compact-card .card-art{
  position:relative!important;
  inset:auto!important;
  width:auto!important;
  height:58%!important;
  min-height:0!important;
  flex:0 0 58%!important;
  margin:16px 0 4px!important;
  border-radius:7px!important;
}
#deckScreen #collectionCards .portrait-card.compact-card .art-sigil{
  font-size:clamp(24px,3.2vw,42px)!important;
}
#deckScreen #collectionCards .portrait-card.compact-card h3{
  display:block!important;
  flex:0 0 auto!important;
  margin:2px 1px!important;
  font-size:9px!important;
  line-height:1.05!important;
  text-align:center!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
#deckScreen #collectionCards .portrait-card.compact-card .card-stats{
  display:flex!important;
  flex:0 0 auto!important;
  margin-top:2px!important;
  font-size:6px!important;
  gap:2px!important;
}
#deckScreen #collectionCards .portrait-card.compact-card p,
#deckScreen #collectionCards .portrait-card.compact-card .card-footer,
#deckScreen #collectionCards .portrait-card.compact-card .card-equip{
  display:none!important;
}
#deckScreen #collectionCards .portrait-card.compact-card .card-level{
  top:5px!important;
  left:5px!important;
  font-size:7px!important;
  max-width:none!important;
}
#deckScreen #collectionCards .card-type-corner{
  top:5px!important;
  right:5px!important;
  bottom:auto!important;
  width:18px!important;
  height:18px!important;
  font-size:9px!important;
}
#deckScreen #collectionCards .compact-card .merge-chip{
  left:5px!important;
  bottom:5px!important;
  top:auto!important;
  width:auto!important;
  height:auto!important;
  min-width:0!important;
  padding:2px 4px!important;
  border-radius:6px!important;
  font-size:6px!important;
}
#deckScreen .sticky-actions{
  flex:0 0 auto!important;
  padding:6px 6px 2px!important;
  border-top:1px solid rgba(232,199,122,.22)!important;
  background:#0b0910!important;
}
@media(max-width:700px){
  #deckScreen #collectionCards.cards.portrait-grid{
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    grid-auto-rows:auto!important;
    gap:6px!important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card{
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    aspect-ratio:5/7!important;
    padding:3px!important;
    border-radius:7px!important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card .card-art{
    position:relative!important;
    inset:auto!important;
    height:57%!important;
    flex-basis:57%!important;
    margin:12px 0 3px!important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card h3{font-size:7px!important}
  #deckScreen #collectionCards .portrait-card.compact-card .card-stats{display:none!important}
}

/* V16.1c — definitive non-stacking collection grid repair.
   Every collection entry owns one full grid track. Card height is locked to
   that track, so legacy compact-grid rules cannot collapse or overlap rows. */
#deckScreen #collectionCards.cards.portrait-grid {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  grid-template-rows: none !important;
  grid-auto-flow: row !important;
  grid-auto-rows: clamp(170px, 16vw, 220px) !important;
  column-gap: 9px !important;
  row-gap: 10px !important;
  align-items: stretch !important;
  align-content: start !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  min-height: 0 !important;
  height: 100% !important;
  padding: 5px 7px 18px 3px !important;
}
#deckScreen #collectionCards.cards.portrait-grid > article.card.portrait-card.compact-card {
  position: relative !important;
  inset: auto !important;
  grid-column: auto !important;
  grid-row: auto !important;
  align-self: stretch !important;
  justify-self: stretch !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  aspect-ratio: auto !important;
  margin: 0 !important;
  transform: none !important;
  overflow: hidden !important;
  isolation: isolate !important;
}
#deckScreen #collectionCards.cards.portrait-grid > article.card.portrait-card.compact-card .card-art {
  position: relative !important;
  inset: auto !important;
  flex: 1 1 auto !important;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 16px 0 4px !important;
}
@media (max-width: 700px) {
  #deckScreen #collectionCards.cards.portrait-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    grid-auto-rows: clamp(145px, 27vw, 205px) !important;
    column-gap: 6px !important;
    row-gap: 7px !important;
  }
}

/* V16.1d — Responsive Cards Screen
   Phone portrait uses a true reflow instead of squeezing the tablet layout. */
@media (max-width: 700px) {
  #deckScreen {
    padding: max(6px, env(safe-area-inset-top)) 6px calc(78px + env(safe-area-inset-bottom)) !important;
    align-items: stretch !important;
    overflow: hidden !important;
  }

  #deckScreen > .cards-deck-panel {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    max-height: none !important;
    min-width: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior: contain !important;
    padding: 12px 10px calc(24px + env(safe-area-inset-bottom)) !important;
    border-radius: 18px !important;
  }

  #deckScreen > .cards-deck-panel > .row:first-child {
    position: relative !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 38px !important;
    margin-bottom: 8px !important;
  }
  #deckScreen > .cards-deck-panel > .row:first-child h2 {
    font-size: clamp(25px, 8vw, 34px) !important;
    line-height: 1 !important;
  }
  #deckCounter { font-size: 19px !important; }

  #deckScreen .deck-zone {
    padding: 9px !important;
    border-radius: 14px !important;
    overflow: visible !important;
  }

  #deckScreen .deck-loadout {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  #deckScreen .deck-hero-card {
    width: 100% !important;
    min-height: 98px !important;
    height: auto !important;
    display: grid !important;
    grid-template-columns: 74px minmax(0, 1fr) auto !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: start !important;
    gap: 10px !important;
    padding: 9px !important;
  }
  #deckScreen .deck-hero-portrait {
    width: 68px !important;
    height: 82px !important;
    aspect-ratio: auto !important;
    font-size: 34px !important;
  }
  #deckScreen .deck-hero-copy {
    align-items: flex-start !important;
    text-align: left !important;
  }
  #deckScreen .deck-hero-copy strong { font-size: 17px !important; }
  #deckScreen .deck-hero-copy small { font-size: 8px !important; }
  #deckScreen .deck-hero-gear {
    display: grid !important;
    grid-template-columns: repeat(2, 30px) !important;
    gap: 4px !important;
    align-self: center !important;
  }

  #deckScreen .loadout-card-column {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    min-width: 0 !important;
  }

  #deckScreen #equippedDeck.equipped-deck {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(2, auto) !important;
    gap: 7px !important;
    width: 100% !important;
    overflow: visible !important;
  }
  #deckScreen #equippedDeck .deck-slot {
    width: 100% !important;
    height: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    max-height: none !important;
    aspect-ratio: 5 / 7 !important;
    padding: 4px !important;
  }
  #deckScreen #equippedDeck .deck-slot .card-art {
    height: 56% !important;
    margin: 14px 0 3px !important;
  }
  #deckScreen #equippedDeck .deck-slot h3 {
    display: block !important;
    font-size: clamp(7px, 2.4vw, 10px) !important;
    text-align: center !important;
  }

  #deckScreen .ground-defense-zone {
    width: 100% !important;
    padding: 8px !important;
    border-radius: 12px !important;
  }
  #deckScreen .ground-defense-heading span { font-size: 9px !important; }
  #deckScreen .ground-defense-heading small { display: block !important; font-size: 7px !important; }
  #deckScreen #groundDefenseSlots.ground-defense-slots {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: auto !important;
    gap: 8px !important;
  }
  #deckScreen #groundDefenseSlots .ground-defense-slot {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    aspect-ratio: 5 / 7 !important;
  }

  #deckScreen .deck-analysis {
    font-size: 10px !important;
    line-height: 1.35 !important;
    margin-top: 8px !important;
  }
  #deckScreen .collection-divider {
    margin: 12px 0 7px !important;
    font-size: 11px !important;
  }

  #deckScreen .card-file-tabs {
    display: flex !important;
    width: 100% !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    gap: 5px !important;
    padding: 2px 0 7px !important;
    scroll-snap-type: x proximity !important;
    -webkit-overflow-scrolling: touch !important;
  }
  #deckScreen .card-file-tab {
    flex: 0 0 auto !important;
    min-width: 112px !important;
    padding: 9px 10px !important;
    font-size: 10px !important;
    white-space: nowrap !important;
    scroll-snap-align: start !important;
  }

  #deckScreen .compact-tools {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 7px !important;
    margin: 0 0 9px !important;
  }
  #deckScreen .compact-tools select,
  #deckScreen .merge-toggle {
    min-width: 0 !important;
    height: 40px !important;
    font-size: 12px !important;
  }

  #deckScreen #collectionCards.cards.portrait-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-auto-flow: row !important;
    grid-auto-rows: auto !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    gap: 10px !important;
    padding: 0 1px 12px !important;
  }
  #deckScreen #collectionCards.cards.portrait-grid > article.card.portrait-card.compact-card {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: 5 / 7 !important;
    align-self: start !important;
    padding: 5px !important;
  }
  #deckScreen #collectionCards.cards.portrait-grid > article.card.portrait-card.compact-card .card-art {
    flex: 0 0 58% !important;
    width: 100% !important;
    height: 58% !important;
    margin: 16px 0 4px !important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card h3 {
    display: block !important;
    font-size: clamp(9px, 3vw, 12px) !important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card .card-stats {
    display: flex !important;
    font-size: 7px !important;
  }

  #deckScreen .sticky-actions {
    position: static !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 9px !important;
    width: 100% !important;
    padding: 10px 0 2px !important;
    background: transparent !important;
    border-top: 1px solid rgba(232,199,122,.22) !important;
  }
  #deckScreen .sticky-actions .btn {
    min-height: 46px !important;
    font-size: 14px !important;
  }
}

@media (max-width: 380px) {
  #deckScreen > .cards-deck-panel { padding-left: 7px !important; padding-right: 7px !important; }
  #deckScreen .deck-hero-card { grid-template-columns: 62px minmax(0, 1fr) !important; }
  #deckScreen .deck-hero-portrait { width: 58px !important; height: 70px !important; }
  #deckScreen .deck-hero-gear { display: none !important; }
  #deckScreen #equippedDeck.equipped-deck { gap: 5px !important; }
  #deckScreen #collectionCards.cards.portrait-grid { gap: 7px !important; }
}

/* V16.1e — preserve the exact tablet Cards & Deck composition on phones.
   The viewport is widened to 980 CSS px before layout, so the established
   tablet rules render unchanged and the browser scales the whole interface. */
html.tablet-layout-on-phone #deckScreen > .cards-deck-panel{
  width:min(980px,100%)!important;
}
html.tablet-layout-on-phone #deckScreen .deck-loadout{
  grid-template-columns:minmax(175px,.78fr) minmax(0,2.65fr)!important;
}
html.tablet-layout-on-phone #deckScreen .loadout-card-column{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(185px,.62fr)!important;
  gap:8px!important;
  align-items:stretch!important;
}
html.tablet-layout-on-phone #deckScreen .equipped-deck{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  grid-template-rows:repeat(2,minmax(0,1fr))!important;
}
html.tablet-layout-on-phone #deckScreen .ground-defense-zone{
  margin:0!important;
  min-width:0!important;
}
html.tablet-layout-on-phone #deckScreen .ground-defense-slots{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
}
html.tablet-layout-on-phone #collectionCards{
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
}

/* V16.1f — readable phone Cards screen with full-page scrolling. */
.merge-all-btn{
  min-height:38px;padding:8px 12px;border-radius:9px;border:1px solid #6d5b70;
  background:linear-gradient(180deg,#191321,#0e0b14);color:#807687;font:inherit;
  font-weight:700;letter-spacing:.02em;transition:.18s ease;white-space:nowrap
}
.merge-all-btn.ready{
  color:#211503;border-color:#ffe28b;background:linear-gradient(180deg,#ffd86e,#b67819);
  box-shadow:0 0 18px #ffd45b88,inset 0 1px #fff8;animation:mergeReadyPulse 1.5s ease-in-out infinite alternate
}
.merge-all-btn:disabled{opacity:.5;box-shadow:none;animation:none}
@keyframes mergeReadyPulse{to{filter:brightness(1.12);box-shadow:0 0 26px #ffd45baa,inset 0 1px #fff9}}

@media (max-width:700px){
  html,body,#app{width:100%!important;max-width:100%!important}
  #deckScreen{
    overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;
    padding:8px 8px calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 18px)!important;
    align-items:flex-start!important
  }
  #deckScreen>.cards-deck-panel{
    width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;
    overflow:visible!important;display:block!important;padding:10px!important;margin:0 auto!important;
    border-radius:16px!important
  }
  #deckScreen>.cards-deck-panel>.row.spread:first-child{align-items:center!important;margin-bottom:8px!important}
  #deckScreen>.cards-deck-panel>.row.spread:first-child p{display:none!important}
  #deckScreen>.cards-deck-panel>.row.spread:first-child h2{font-size:clamp(28px,9vw,42px)!important;line-height:1!important;margin:0!important}
  #deckScreen .deck-count{font-size:22px!important}
  #deckScreen .deck-zone{padding:8px!important;border-radius:13px!important}
  #deckScreen .section-kicker{font-size:10px!important;margin-bottom:7px!important;letter-spacing:.14em!important}
  #deckScreen .deck-loadout{
    display:grid!important;grid-template-columns:minmax(112px,34%) minmax(0,1fr)!important;
    gap:8px!important;align-items:stretch!important
  }
  #deckScreen .deck-hero-card{
    min-width:0!important;width:100%!important;min-height:0!important;height:auto!important;
    display:flex!important;flex-direction:column!important;grid-template-columns:none!important;
    padding:8px 5px!important;gap:5px!important;justify-content:flex-start!important
  }
  #deckScreen .deck-hero-portrait{width:74px!important;height:92px!important;font-size:32px!important;flex:none!important}
  #deckScreen .deck-hero-copy{align-items:center!important;text-align:center!important;min-width:0!important}
  #deckScreen .deck-hero-copy small{font-size:7px!important}.deck-hero-copy strong{font-size:13px!important}.deck-hero-copy>span{font-size:9px!important}
  #deckScreen .deck-hero-gear{margin-top:auto!important;width:100%!important;grid-template-columns:repeat(2,1fr)!important;gap:3px!important}
  #deckScreen .deck-hero-gear span{min-height:30px!important;padding:2px!important}.deck-hero-gear i{font-size:12px!important}.deck-hero-gear small{font-size:5px!important}
  #deckScreen .loadout-card-column{display:flex!important;flex-direction:column!important;gap:8px!important;min-width:0!important}
  #deckScreen #equippedDeck.equipped-deck{
    display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;
    grid-template-rows:repeat(2,auto)!important;gap:6px!important;overflow:visible!important
  }
  #deckScreen .deck-slot{
    width:100%!important;min-width:0!important;min-height:0!important;height:auto!important;aspect-ratio:5/7!important;
    padding:3px!important;border-radius:8px!important
  }
  #deckScreen .deck-slot .card-art{height:52%!important;margin:12px 0 2px!important}
  #deckScreen .deck-slot .art-sigil{font-size:clamp(18px,6vw,28px)!important}
  #deckScreen .deck-slot h3{display:block!important;font-size:7px!important;white-space:normal!important;line-height:1.05!important;max-height:16px!important}
  #deckScreen .deck-slot .card-level,#deckScreen .deck-slot .tag{font-size:5px!important;padding:1px 3px!important}
  #deckScreen .ground-defense-zone{margin:0!important;padding:6px!important;min-width:0!important}
  #deckScreen .ground-defense-heading span{font-size:8px!important}.ground-defense-heading small{display:none!important}
  #deckScreen #groundDefenseSlots.ground-defense-slots{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
  #deckScreen #groundDefenseSlots .ground-defense-slot{display:block!important;width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:5/7!important}
  #deckScreen .deck-analysis{font-size:9px!important;line-height:1.25!important;margin-top:7px!important;padding:6px!important}
  #deckScreen .collection-divider{margin:13px 0 8px!important;font-size:10px!important}
  #deckScreen .card-file-tabs{display:flex!important;overflow-x:auto!important;gap:3px!important;scrollbar-width:none;padding-bottom:2px!important}
  #deckScreen .card-file-tab{flex:0 0 auto!important;font-size:10px!important;padding:8px 12px!important;min-width:95px!important}
  #deckScreen .deck-tools.compact-tools{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important;margin:7px 0 10px!important}
  #deckScreen #deckSort{grid-column:1/2!important;width:100%!important;font-size:11px!important}
  #deckScreen .merge-toggle{grid-column:2/3!important;width:100%!important;font-size:11px!important;display:flex!important;align-items:center!important;justify-content:center!important}
  #deckScreen .merge-all-btn{grid-column:1/-1!important;width:100%!important;min-height:42px!important;font-size:13px!important}
  #deckScreen #collectionCards.cards.portrait-grid{
    display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;
    grid-auto-rows:auto!important;gap:8px!important;height:auto!important;max-height:none!important;
    overflow:visible!important;align-items:start!important;padding:0 0 8px!important
  }
  #deckScreen #collectionCards .portrait-card.compact-card{
    width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:5/7!important;
    position:relative!important;padding:4px!important;border-radius:9px!important;overflow:hidden!important
  }
  #deckScreen #collectionCards .portrait-card.compact-card .card-art{position:absolute!important;inset:4px!important;margin:0!important;border-radius:6px!important}
  #deckScreen #collectionCards .portrait-card.compact-card .art-sigil{font-size:clamp(25px,10vw,42px)!important}
  #deckScreen #collectionCards .portrait-card.compact-card h3{display:block!important;position:absolute!important;left:4px!important;right:4px!important;bottom:24px!important;z-index:7!important;margin:0!important;padding:3px 2px!important;font-size:8px!important;line-height:1.05!important;text-align:center!important;background:#09070dcc!important;white-space:normal!important;max-height:22px!important;overflow:hidden!important}
  #deckScreen #collectionCards .portrait-card.compact-card .card-equip{display:block!important;position:absolute!important;left:4px!important;right:4px!important;bottom:4px!important;z-index:9!important;margin:0!important;padding:3px!important;font-size:7px!important;min-height:17px!important}
  #deckScreen #collectionCards .card-type-corner{top:4px!important;right:4px!important;bottom:auto!important;width:17px!important;height:17px!important;font-size:9px!important}
  #deckScreen #collectionCards .compact-card .merge-chip{display:block!important;top:4px!important;left:4px!important;bottom:auto!important;width:auto!important;height:auto!important;font-size:6px!important;padding:2px 3px!important;border-radius:5px!important}
  #deckScreen .sticky-actions{position:static!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;padding:12px 0 4px!important;background:transparent!important}
  #deckScreen .sticky-actions .btn{min-height:44px!important;font-size:13px!important}
}

@media (max-width:380px){
  #deckScreen .deck-loadout{grid-template-columns:100px minmax(0,1fr)!important}
  #deckScreen #collectionCards.cards.portrait-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
}


/* V16.1g critical screen visibility repair.
   Mobile layout rules must never override the app router's hidden state. */
#deckScreen.hidden, .screen.hidden { display:none!important; }
@media (max-width:700px){
  #deckScreen:not(.hidden){display:block!important;}
}

/* V16.1h — natural phone scrolling + compact Raid-Rush-inspired composition */
.deck-hero-supports,.hero-support-heading{display:none}

@media (max-width:700px){
  /* Cards behaves like every normal menu: the screen itself scrolls. */
  #deckScreen{
    display:block!important;
    overflow-y:auto!important;
    overflow-x:hidden!important;
    -webkit-overflow-scrolling:touch!important;
    overscroll-behavior-y:auto!important;
    touch-action:pan-y!important;
    padding:max(8px,env(safe-area-inset-top)) 8px calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 22px)!important;
  }
  #deckScreen>.cards-deck-panel{
    width:100%!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow:visible!important;
    display:block!important;
    padding:10px!important;
    border-radius:16px!important;
  }
  #deckScreen>.cards-deck-panel>.row:first-child{margin-bottom:5px!important}
  #deckScreen>.cards-deck-panel>.row:first-child h2{font-size:clamp(31px,9vw,46px)!important;line-height:1!important;margin:0!important}
  #deckScreen #deckCounter{font-size:24px!important}

  #deckScreen .deck-zone{padding:8px!important;margin:4px 0 8px!important}
  #deckScreen .section-kicker{font-size:10px!important;letter-spacing:.16em!important;margin-bottom:7px!important}
  #deckScreen .deck-loadout{
    display:grid!important;
    grid-template-columns:minmax(118px,.68fr) minmax(0,1.82fr)!important;
    gap:8px!important;
    align-items:stretch!important;
  }
  #deckScreen .deck-hero-card{
    min-width:0!important;
    width:100%!important;
    height:auto!important;
    min-height:0!important;
    padding:8px 6px!important;
    display:flex!important;
    flex-direction:column!important;
    align-items:center!important;
  }
  #deckScreen .deck-hero-portrait{width:76px!important;height:96px!important;font-size:38px!important;flex:0 0 auto!important}
  #deckScreen .deck-hero-copy{width:100%!important;text-align:center!important;margin-top:6px!important}
  #deckScreen .deck-hero-copy small{font-size:7px!important}
  #deckScreen .deck-hero-copy strong{font-size:16px!important;line-height:1.05!important}
  #deckScreen .deck-hero-copy>span{font-size:10px!important}
  #deckScreen .deck-hero-gear{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:3px!important;width:100%!important;margin-top:7px!important}
  #deckScreen .deck-hero-gear>span{min-width:0!important;padding:3px 1px!important}
  #deckScreen .deck-hero-gear i{font-size:14px!important}
  #deckScreen .deck-hero-gear small{font-size:5px!important}

  /* Use the previously empty lower hero area for the equipped support cards. */
  #deckScreen .hero-support-heading{display:block!important;font-size:6px!important;letter-spacing:.11em!important;color:var(--gold)!important;margin:7px 0 3px!important}
  #deckScreen .deck-hero-supports{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:4px!important;width:100%!important}
  #deckScreen .hero-support-card{position:relative;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important;aspect-ratio:5/6!important;padding:3px!important;border:1px solid #73556c!important;border-radius:6px!important;background:linear-gradient(160deg,#231726,#0d0b10)!important;overflow:hidden!important}
  #deckScreen .hero-support-card i{font-style:normal!important;font-size:19px!important;line-height:1!important}
  #deckScreen .hero-support-card b{display:block!important;width:100%!important;margin-top:3px!important;font-size:6px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  #deckScreen .hero-support-card small{font-size:5px!important;color:#d9c9d6!important}
  #deckScreen .hero-support-card.empty{opacity:.45!important}

  #deckScreen .loadout-card-column{display:block!important;min-width:0!important}
  #deckScreen #equippedDeck.equipped-deck{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:6px!important;
    width:100%!important;
  }
  #deckScreen #equippedDeck .deck-slot{width:100%!important;min-width:0!important;height:auto!important;aspect-ratio:5/7!important}
  #deckScreen #equippedDeck .portrait-card.compact-card{height:100%!important;aspect-ratio:auto!important}
  #deckScreen #equippedDeck .card-art{height:52%!important;flex-basis:52%!important;margin-top:13px!important}
  #deckScreen #equippedDeck h3{font-size:8px!important;line-height:1!important}
  #deckScreen #equippedDeck .card-level,#deckScreen #equippedDeck .tag{font-size:5px!important}

  #deckScreen .ground-defense-zone{margin-top:7px!important;padding:7px!important}
  #deckScreen .ground-defense-heading span{font-size:10px!important}
  #deckScreen .ground-defense-heading small{font-size:7px!important}
  #deckScreen #groundDefenseSlots.ground-defense-slots{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
  #deckScreen #groundDefenseSlots .ground-defense-slot{min-width:0!important}
  #deckScreen #groundDefenseSlots .portrait-card.compact-card{aspect-ratio:5/4.7!important;min-height:96px!important}
  #deckScreen #groundDefenseSlots .card-art{height:50%!important;flex-basis:50%!important;margin-top:13px!important}

  #deckScreen .deck-analysis{font-size:9px!important;line-height:1.25!important;padding:5px!important}
  #deckScreen .collection-divider{margin:13px 0 7px!important}
  #deckScreen .card-file-tabs{display:flex!important;overflow-x:auto!important;white-space:nowrap!important;scrollbar-width:none!important}
  #deckScreen .card-file-tab{flex:0 0 auto!important;min-width:105px!important;font-size:10px!important;padding:8px 9px!important}
  #deckScreen .deck-tools.compact-tools{display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;margin:7px 0!important}
  #deckScreen .deck-tools select,#deckScreen .merge-toggle,#deckScreen .merge-all-btn{width:100%!important;min-width:0!important;font-size:11px!important;padding:9px 7px!important}
  #deckScreen .merge-all-btn{grid-column:1/-1!important}

  /* No nested collection viewport. Every card is reached by ordinary page scrolling. */
  #deckScreen #collectionCards.cards.portrait-grid{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    grid-auto-rows:auto!important;
    gap:7px!important;
    width:100%!important;
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow:visible!important;
    padding:3px 0 12px!important;
    touch-action:auto!important;
  }
  #deckScreen #collectionCards .portrait-card.compact-card{aspect-ratio:5/7!important;height:auto!important;min-height:0!important}
  #deckScreen #collectionCards .portrait-card.compact-card .card-art{height:58%!important;flex-basis:58%!important;margin-top:14px!important}
  #deckScreen #collectionCards .portrait-card.compact-card h3{font-size:8px!important}
  #deckScreen #collectionCards .portrait-card.compact-card .card-level{font-size:6px!important}
  #deckScreen #collectionCards .card-type-corner{width:16px!important;height:16px!important;font-size:8px!important}

  #deckScreen .sticky-actions{position:relative!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:8px 0 4px!important;padding:0!important;background:none!important}
  #deckScreen .sticky-actions .btn{min-width:0!important;width:100%!important}
}

/* V18.5 Campaign Reborn */
.campaign-panel{max-width:1080px;background:radial-gradient(circle at 50% 0,#34233555,transparent 42%),linear-gradient(180deg,#100c14f5,#17101af5)}
.chapter-map{position:relative;display:flex;flex-direction:column;gap:18px;padding:20px 12px 34px;margin:18px 0;overflow:visible}
.chapter-map:before{content:"";position:absolute;left:50%;top:82px;bottom:28px;width:4px;transform:translateX(-50%);background:linear-gradient(#6d5844,#c8a562,#6d5844);box-shadow:0 0 18px #b9914d55;border-radius:99px}
.campaign-map-title{text-align:center;position:relative;z-index:1;padding:4px 0 16px}.campaign-map-title span{display:block;font-size:.72rem;letter-spacing:.28em;color:#bd9d64}.campaign-map-title strong{display:block;font-family:Georgia,serif;font-size:1.3rem;margin-top:5px}
.chapter-node.map-node{position:relative;z-index:1;width:calc(50% - 34px);grid-template-columns:70px 1fr;gap:14px;padding:14px 14px 14px 16px;min-height:170px;box-shadow:0 15px 35px #0008}
.chapter-node.map-left{align-self:flex-start}.chapter-node.map-right{align-self:flex-end}.chapter-node.map-right .map-path-dot{left:-43px}.chapter-node.map-left .map-path-dot{right:-43px}
.map-path-dot{position:absolute;top:28px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#0a080d;border:2px solid #c4a15e;color:#f6df9f;font-weight:900;box-shadow:0 0 0 6px #130e16,0 0 22px #d2ad6155}
.chapter-art{height:100%;min-height:140px;border-radius:10px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--chapter-accent) 55%,transparent),transparent 52%),linear-gradient(160deg,#201525,#09070c);border:1px solid color-mix(in srgb,var(--chapter-accent) 65%,#7a6040);font-size:2.3rem;box-shadow:inset 0 0 30px #0009}
.chapter-copy h3{font-size:1.08rem}.chapter-stars{color:#e7bc54;letter-spacing:.12em;font-size:1.05rem;margin:2px 0 6px;text-shadow:0 0 10px #d7a83c66}.star-objectives{display:grid;gap:3px;margin-top:8px;color:#bcaec0}.star-objectives small{font-size:.67rem}
.chapter-node.map-node>.btn{grid-column:1/-1;width:100%;min-height:40px}
.chapter-node.map-node.completed{background:linear-gradient(135deg,#171119f2,#2b201cf2);border-color:#c8a65b}.chapter-node.map-node.locked .chapter-art{filter:grayscale(1)}
@media(max-width:760px){.chapter-map:before{left:18px}.chapter-node.map-node{width:calc(100% - 40px);align-self:flex-end!important;grid-template-columns:62px 1fr}.chapter-node.map-right .map-path-dot,.chapter-node.map-left .map-path-dot{left:-39px;right:auto}.chapter-art{min-height:125px}.chapter-node.map-node{min-height:155px}}
@media(max-width:480px){.chapter-map{padding-left:36px;padding-right:0}.chapter-map:before{left:17px}.chapter-node.map-node{width:100%;grid-template-columns:52px 1fr;padding:11px;gap:10px}.chapter-art{min-height:112px;font-size:1.8rem}.chapter-copy p{font-size:.78rem;margin-bottom:7px}.chapter-meta span{font-size:.62rem}.star-objectives{display:none}.campaign-map-title strong{font-size:1.05rem}}

/* V19.1 — Native iOS Cards scrolling ownership
   The entire Cards screen is the sole vertical scroller. There are no nested
   vertical scrolling regions and no gameplay touch layer may intercept it. */
#deckScreen{
  overflow-y:auto!important;
  overflow-x:hidden!important;
  -webkit-overflow-scrolling:touch!important;
  touch-action:pan-y!important;
  overscroll-behavior-y:auto!important;
  padding-bottom:calc(var(--bottom-nav-height,88px) + env(safe-area-inset-bottom) + 18px)!important;
}
#deckScreen>.cards-deck-panel{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  overflow:visible!important;
  touch-action:pan-y!important;
  overscroll-behavior:visible!important;
}
#deckScreen #collectionCards.cards.portrait-grid{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  overflow:visible!important;
  -webkit-overflow-scrolling:auto!important;
  touch-action:pan-y!important;
  overscroll-behavior:visible!important;
}
#deckScreen .deck-layout,
#deckScreen .deck-zone,
#deckScreen .ground-defense-zone,
#deckScreen .collection-divider,
#deckScreen .deck-tools,
#deckScreen .sticky-actions{
  touch-action:pan-y!important;
}
#deckScreen .card-file-tabs{
  touch-action:pan-x pan-y!important;
}
body.cards-native-scroll canvas,
body.cards-native-scroll #game{
  pointer-events:none!important;
}
/* V20 Dynamic Gothic Audio */
.audio-fab{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:1400;width:42px;height:42px;border-radius:50%;border:1px solid #b99a66;background:linear-gradient(#24182c,#100b16);color:#f3dca4;font:700 20px Georgia;box-shadow:0 6px 22px #0009;touch-action:manipulation}.battle-mode .audio-fab{top:max(68px,calc(env(safe-area-inset-top) + 56px))}.audio-panel{position:fixed;z-index:1500;right:max(12px,env(safe-area-inset-right));top:max(62px,calc(env(safe-area-inset-top) + 50px));width:min(300px,calc(100vw - 24px));padding:14px;border:1px solid #806a4b;border-radius:14px;background:linear-gradient(155deg,#211827f5,#0e0a13f7);box-shadow:0 18px 50px #000c;color:#eadfc8}.audio-panel.hidden{display:none}.audio-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:#f4dba0}.audio-head button{border:0;background:transparent;color:#fff;font-size:24px}.audio-panel label{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:7px 0;border-top:1px solid #ffffff12;font-size:13px}.audio-panel input[type=range]{width:130px}.audio-panel small{display:block;margin-top:8px;color:#bcae9d;line-height:1.35}

/* V22.0 — THE VILLAGE FOUNDATION */
.village-home-screen{position:relative;overflow:hidden!important;padding:0!important;background:#10141a;color:#f8ecd1;isolation:isolate}
.village-sky-layer{position:absolute;inset:0 0 48%;background:linear-gradient(#182131,#3c4350 58%,#7b6250);z-index:-3;overflow:hidden}
.village-moon{position:absolute;width:74px;height:74px;border-radius:50%;right:9%;top:8%;background:#eee7cc;box-shadow:0 0 38px #d8d0a866}
.village-cloud{position:absolute;width:180px;height:24px;border-radius:50%;background:#d9d1c822;filter:blur(4px);animation:vCloud 24s linear infinite}.vc1{top:15%;left:-20%}.vc2{top:31%;left:38%;animation-duration:32s}
@keyframes vCloud{to{transform:translateX(135vw)}}
.village-hud{height:70px;position:absolute;z-index:20;left:0;right:0;top:0;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px;padding:8px max(12px,env(safe-area-inset-left));background:linear-gradient(#0a0d13f2,#121620d9);border-bottom:1px solid #d4a85e55;backdrop-filter:blur(8px)}
.village-brand h1{font-size:clamp(20px,4vw,34px);margin:0;letter-spacing:.08em}.village-brand .eyebrow{font-size:9px;color:#ddb970}.village-profile{position:static!important}.village-resources{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.village-resources span{background:#090b10cc;border:1px solid #8f744b66;border-radius:8px;padding:6px 9px;font-size:12px;white-space:nowrap}
.pixel-village{position:absolute;inset:70px 0 82px;overflow:hidden;background:linear-gradient(155deg,#556a45,#344333 68%,#273327);image-rendering:pixelated;touch-action:manipulation}
.village-ground{position:absolute;inset:0;background:radial-gradient(circle at 22% 34%,#75835a55 0 2px,transparent 3px),radial-gradient(circle at 78% 69%,#26382777 0 2px,transparent 3px);background-size:24px 24px,31px 31px;opacity:.9}
.village-path{position:absolute;background:#a99372;border:4px solid #77664f;box-shadow:inset 0 0 0 3px #c5b08c55;z-index:1}.path-main{width:13%;height:105%;left:44%;top:-3%;transform:rotate(3deg)}.path-cross{width:78%;height:12%;left:11%;top:54%;transform:rotate(-2deg)}
.village-stream{position:absolute;right:-2%;top:0;width:18%;height:100%;background:linear-gradient(90deg,#263f52,#477a91,#243b4d);border-left:5px solid #6e6c57;transform:skewX(-4deg);z-index:2}.village-stream i{position:absolute;width:50px;height:4px;background:#b8dce566;animation:water 3s linear infinite}.village-stream i:nth-child(1){top:20%}.village-stream i:nth-child(2){top:52%;left:40%}.village-stream i:nth-child(3){top:78%;left:10%}@keyframes water{50%{transform:translateX(25px)}}
.pixel-bridge{position:absolute;z-index:5;right:10%;top:52%;width:15%;height:15%;background:repeating-linear-gradient(90deg,#74513b 0 9px,#4e3428 10px 12px);border:4px solid #3d2921;transform:rotate(-3deg)}
.village-building{position:absolute;z-index:8;border:0;background:transparent;color:#fff;text-align:center;cursor:pointer;filter:drop-shadow(0 8px 8px #0008);transition:transform .18s ease,filter .18s}.village-building:hover,.village-building:focus-visible{transform:translateY(-5px) scale(1.03);filter:drop-shadow(0 0 12px #f5c76d)}.village-building b,.village-building small{display:block;background:#101218e8;border:1px solid #b8955b88;padding:2px 6px}.village-building b{font-size:11px;border-radius:7px 7px 0 0}.village-building small{font-size:8px;color:#d6bd8d;border-top:0;border-radius:0 0 7px 7px}.building-art{display:block;position:relative;width:100%;height:72%;background:linear-gradient(90deg,#51463e,#746255);border:4px solid #352c29;box-shadow:inset 0 0 0 3px #937c62}.building-art i{position:absolute;display:block}.building-art .roof{left:-8%;right:-8%;top:-20%;height:34%;background:#312a32;clip-path:polygon(50% 0,100% 100%,0 100%);border-bottom:4px solid #1d1820}.building-art .door{width:18%;height:33%;bottom:0;left:41%;background:#2b1d19;border:2px solid #b2874d}.building-art .window{width:13%;height:15%;background:#ffc75a;box-shadow:0 0 9px #ffae3d}.building-art .w1{left:18%;top:47%}.building-art .w2{right:18%;top:47%}.building-art .chimney{width:10%;height:38%;right:15%;top:-38%;background:#3b3433}.smoke:after{content:"";position:absolute;width:18px;height:32px;left:-5px;top:-28px;background:#c4c0b255;border-radius:50%;filter:blur(4px);animation:smoke 3s ease-in-out infinite}@keyframes smoke{50%{transform:translate(8px,-13px) scale(1.3);opacity:.25}}
.cathedral-building{left:42%;top:5%;width:17%;height:27%}.cathedral-building .building-art{height:80%;background:#656067}.cathedral-building .spire{bottom:78%;width:20%;height:55%;background:#45404a;clip-path:polygon(50% 0,100% 100%,0 100%)}.cathedral-building .s1{left:8%}.cathedral-building .s2{left:40%;height:75%}.cathedral-building .s3{right:8%}.rose-window{width:25%;aspect-ratio:1;left:37%;top:20%;border-radius:50%;background:#8e2748;box-shadow:0 0 10px #b64764}
.tavern-building{left:14%;top:27%;width:17%;height:21%}.barracks-building{left:66%;top:23%;width:17%;height:22%}.hall-building{left:37%;top:39%;width:19%;height:23%}.smith-building{left:17%;top:64%;width:16%;height:20%}.market-building{left:60%;top:61%;width:18%;height:19%}.library-building{left:3%;top:49%;width:15%;height:19%}.watch-building{right:3%;top:40%;width:12%;height:24%}
.barracks-building .tower{bottom:0;width:21%;height:86%;background:#56505a}.barracks-building .t1{left:4%}.barracks-building .t2{right:4%}.hall-building .clock{width:20%;aspect-ratio:1;border-radius:50%;background:#e1c27e;left:40%;top:15%;border:2px solid #453829}.hall-building .banner{width:12%;height:30%;right:12%;top:20%;background:#772943}.smith-building .forge-glow{width:28%;height:20%;left:12%;bottom:12%;background:#ff7a25;box-shadow:0 0 14px #ff6b20}.market-building .building-art{background:transparent;border:0;box-shadow:none}.market-building .awning{left:5%;right:5%;top:5%;height:28%;background:repeating-linear-gradient(90deg,#7d263e 0 16px,#c5a46b 16px 32px);clip-path:polygon(5% 0,95% 0,100% 100%,0 100%)}.market-building .stall{left:10%;right:10%;top:31%;bottom:5%;background:#745440;border:4px solid #3b291f}.market-building .crate{width:18%;height:22%;background:#9a6d3e;bottom:2%}.market-building .c1{left:4%}.market-building .c2{right:4%}.watch-building .building-art{height:84%;background:transparent;border:0;box-shadow:none}.watch-building .tower{left:25%;right:25%;bottom:0;height:80%;background:#59545b;border:4px solid #312c32}.watch-building .roof{top:0;left:12%;right:12%;height:29%}.watch-building .bell{width:18%;height:16%;left:41%;top:31%;background:#d4a94f;border-radius:50% 50% 20% 20%}
.town-square{position:absolute;z-index:4;left:42%;top:54%;width:15%;height:18%;border-radius:50%;background:#82755f;border:4px solid #625744}.fountain{position:absolute;width:34%;aspect-ratio:1;border-radius:50%;left:33%;top:16%;background:#496d7d;border:5px solid #aaa18c;box-shadow:0 0 0 5px #514b42}.square-label{position:absolute;bottom:-18px;width:100%;font-size:8px;text-align:center;color:#f0d69e}
.villager,.hero-villager{position:absolute;z-index:12;width:13px;height:21px}.villager i,.hero-villager i{display:block;width:11px;height:16px;background:#632c45;border-radius:6px 6px 2px 2px;border-top:5px solid #d6ae83;box-shadow:0 2px #111}.hero-villager i{background:#252b37;border-top-color:#d6b18e}.hero-villager b{position:absolute;top:20px;left:-15px;font-size:7px;background:#111b;padding:1px 3px}.hero-home{left:48%;top:68%;animation:heroIdle 2s ease-in-out infinite}.villager-a{left:28%;top:52%;animation:walkA 13s linear infinite}.villager-b{left:62%;top:48%;animation:walkB 15s linear infinite}.villager-c{left:37%;top:76%;animation:walkC 17s linear infinite}.villager-d{left:70%;top:74%;animation:walkD 12s linear infinite}@keyframes heroIdle{50%{transform:translateY(-2px)}}@keyframes walkA{50%{transform:translate(230px,60px)}100%{transform:translate(0)}}@keyframes walkB{50%{transform:translate(-180px,120px)}100%{transform:translate(0)}}@keyframes walkC{50%{transform:translate(150px,-150px)}100%{transform:translate(0)}}@keyframes walkD{50%{transform:translate(-130px,-70px)}100%{transform:translate(0)}}
.chicken{position:absolute;z-index:12;color:#fff;font-size:22px;text-shadow:2px 2px #c58b46}.chicken-a{left:32%;top:73%;animation:chick 5s infinite}.chicken-b{left:35%;top:77%;animation:chick 6s reverse infinite}@keyframes chick{50%{transform:translateX(40px)}}
.tree{position:absolute;z-index:6;width:34px;height:46px;background:#303b2b;border-radius:50% 50% 40% 40%;border:4px solid #1b251b;box-shadow:inset 8px 0 #4c5939}.tree:after{content:"";position:absolute;width:8px;height:20px;background:#4b3626;left:9px;bottom:-16px}.tree-a{left:7%;top:17%}.tree-b{left:31%;top:13%}.tree-c{left:83%;top:15%}.tree-d{left:9%;top:78%}.tree-e{left:82%;top:78%}
.lantern-post{position:absolute;z-index:9;width:4px;height:34px;background:#202024}.lantern-post:before{content:"";position:absolute;width:10px;height:12px;left:-3px;top:-3px;background:#ffd46a;border:2px solid #3a3026;box-shadow:0 0 12px #ffba42;animation:lantern 1.8s alternate infinite}@keyframes lantern{to{filter:brightness(1.35)}}.lp1{left:40%;top:49%}.lp2{left:59%;top:51%}.lp3{left:41%;top:75%}.lp4{left:58%;top:76%}
.village-message{position:absolute;z-index:20;left:10px;bottom:62px;display:flex;gap:10px;align-items:center;max-width:min(520px,75vw);background:#090c11df;border:1px solid #b58f5466;border-radius:10px;padding:8px 12px;backdrop-filter:blur(6px)}.village-message h2{font-size:14px;margin:0}.village-message p{font-size:9px;margin:2px 0;color:#cbbd9e}.village-message>span{font-size:8px;color:#edc574;border:1px solid #9f7b43;padding:4px;border-radius:4px}.village-version{position:absolute;right:10px;bottom:64px;z-index:20}
@media(max-width:700px){.village-hud{height:62px;grid-template-columns:1fr auto}.village-resources{position:absolute;top:62px;left:0;right:0;background:#0b0d12cc;padding:4px 8px;justify-content:center}.village-resources span{padding:3px 6px;font-size:10px}.pixel-village{inset:98px 0 72px}.village-profile{font-size:9px}.cathedral-building{width:21%;left:39%}.tavern-building{width:21%;left:8%}.barracks-building{width:21%;left:69%}.hall-building{width:23%;left:37%}.smith-building{width:20%;left:10%}.market-building{width:22%;left:61%}.library-building{width:18%;left:1%}.watch-building{width:15%;right:1%}.village-building b{font-size:8px;padding:2px}.village-building small{font-size:6px}.village-message{bottom:58px;max-width:72vw;padding:5px 7px}.village-message h2{font-size:11px}.village-message p{font-size:7px}.village-version{font-size:7px;bottom:58px}.villager{transform:scale(.8)}}
@media(max-height:600px){.village-message{display:none}.village-version{display:none}.pixel-village{bottom:52px}}

/* V22.1 Expanded Village — large native-scroll world and construction foundation */
.village-home-screen{overflow:hidden!important}
.pixel-village{overflow:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;scrollbar-width:none}
.pixel-village::-webkit-scrollbar{display:none}
.village-world{position:relative;width:1180px;height:1540px;min-width:1180px;min-height:1540px;background:linear-gradient(155deg,#556a45,#344333 68%,#273327);image-rendering:pixelated;overflow:hidden}
.village-ground{pointer-events:none}
.village-path,.village-stream,.pixel-bridge,.town-square,.villager,.hero-villager,.chicken,.tree,.lantern-post{pointer-events:none}
.village-building{pointer-events:auto!important;z-index:30!important;width:190px!important;height:220px!important}
.cathedral-building{left:495px!important;top:95px!important;width:220px!important;height:300px!important}
.tavern-building{left:170px!important;top:440px!important}
.barracks-building{left:805px!important;top:425px!important}
.hall-building{left:490px!important;top:545px!important;width:210px!important;height:235px!important}
.smith-building{left:145px!important;top:850px!important}
.market-building{left:785px!important;top:860px!important;width:210px!important}
.library-building{left:100px!important;top:175px!important}
.watch-building{left:955px!important;top:180px!important;width:150px!important;height:280px!important}
.path-main{width:130px!important;height:1450px!important;left:525px!important;top:30px!important}
.path-cross{width:930px!important;height:125px!important;left:125px!important;top:690px!important}
.village-stream{left:1020px!important;right:auto!important;width:165px!important;height:1540px!important}
.pixel-bridge{left:920px!important;right:auto!important;top:705px!important;width:180px!important;height:125px!important}
.town-square{left:485px!important;top:785px!important;width:210px!important;height:210px!important}
.hero-home{left:580px!important;top:1005px!important}.villager-a{left:350px!important;top:700px!important}.villager-b{left:770px!important;top:680px!important}.villager-c{left:425px!important;top:1040px!important}.villager-d{left:775px!important;top:1080px!important}
.tree-a{left:60px!important;top:70px!important}.tree-b{left:390px!important;top:100px!important}.tree-c{left:890px!important;top:90px!important}.tree-d{left:95px!important;top:1240px!important}.tree-e{left:920px!important;top:1250px!important}
.lp1{left:470px!important;top:650px!important}.lp2{left:710px!important;top:650px!important}.lp3{left:465px!important;top:1020px!important}.lp4{left:710px!important;top:1030px!important}
.village-build-btn,.village-center-btn{position:sticky;z-index:80;bottom:16px;border:1px solid #d6a956;background:linear-gradient(#2b211d,#0d1016);color:#f4d58a;border-radius:12px;box-shadow:0 8px 20px #0009;font-weight:800;letter-spacing:.08em}
.village-build-btn{left:50%;transform:translateX(-50%);padding:12px 22px}.village-center-btn{left:calc(100% - 60px);padding:11px 15px;margin-left:auto}
.village-build-tray{position:fixed;z-index:120;left:12px;right:12px;bottom:84px;background:#0b0d14f2;border:1px solid #b78b4f;border-radius:14px;padding:12px;box-shadow:0 16px 44px #000c;backdrop-filter:blur(10px)}
.build-tray-head{display:flex;justify-content:space-between;align-items:center;color:#f1cf82}.build-tray-head button{border:0;background:transparent;color:#fff;font-size:24px}.village-build-tray p{font-size:11px;color:#c7b99c}.build-tray-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.build-tray-grid button{background:#17141c;border:1px solid #6d5264;border-radius:9px;color:#fff;padding:8px;display:grid;gap:2px;text-align:center}.build-tray-grid span{font-size:24px}.build-tray-grid small{font-size:8px;color:#cdbb91}.build-tray-grid button.selected{border-color:#ffd36a;box-shadow:0 0 14px #d99a2d88}.build-hint{margin-top:8px;font-size:10px;color:#e8c77e;text-align:center}
.village-plots{position:absolute;inset:0;pointer-events:none;z-index:18}.village-plot{position:absolute;width:150px;height:150px;border:2px dashed #d4b56c66;border-radius:18px;background:#20261f55;pointer-events:auto;color:#e8d3a1;display:flex;align-items:center;justify-content:center;text-align:center}.village-plot.empty::after{content:'BUILD PLOT';font-size:9px;letter-spacing:.12em;opacity:.7}.village-plot:not(.empty){border-style:solid;background:#263126}.village-plot .placed-building{display:grid;place-items:center;gap:5px}.village-plot .placed-building span{font-size:54px;filter:drop-shadow(0 5px 3px #0008)}.village-plot .placed-building b{font-size:11px;background:#0c0f13df;padding:3px 7px;border:1px solid #9b7948;border-radius:7px}.plot-0{left:285px;top:1110px}.plot-1{left:475px;top:1190px}.plot-2{left:675px;top:1150px}.plot-3{left:835px;top:1040px}.plot-4{left:80px;top:1030px}.plot-5{left:260px;top:250px}.plot-6{left:745px;top:190px}.plot-7{left:860px;top:620px}
@media(max-width:700px){.village-world{width:1080px;height:1480px;min-width:1080px;min-height:1480px}.village-building b{font-size:11px!important}.village-building small{font-size:8px!important}.village-build-tray{bottom:76px}.build-tray-grid{grid-template-columns:repeat(2,1fr)}.village-message{display:none}.village-version{display:none}}

/* V22.2 Living Village — transform camera, smaller structures, reliable touch */
.pixel-village{
  overflow:hidden!important;
  touch-action:none!important;
  cursor:grab;
  background:#273327;
}
.pixel-village.is-panning{cursor:grabbing}
.village-world{
  position:absolute!important;
  left:0;top:0;
  width:1600px!important;height:1900px!important;
  min-width:1600px!important;min-height:1900px!important;
  transform-origin:0 0;
  will-change:transform;
  overflow:hidden;
  background:
    radial-gradient(circle at 18% 16%,#64785155 0 2px,transparent 3px),
    radial-gradient(circle at 73% 64%,#667a5355 0 2px,transparent 3px),
    linear-gradient(155deg,#556a45,#344333 68%,#273327);
  background-size:34px 34px,42px 42px,auto;
}
.village-building{
  width:132px!important;height:154px!important;
  z-index:35!important;
  touch-action:none;
  -webkit-tap-highlight-color:transparent;
}
.village-building .building-art{height:73%}
.village-building b{font-size:10px!important;padding:2px 5px!important}
.village-building small{font-size:7px!important;padding:2px 4px!important}
.cathedral-building{left:716px!important;top:110px!important;width:170px!important;height:230px!important}
.library-building{left:245px!important;top:250px!important}
.barracks-building{left:1195px!important;top:270px!important}
.tavern-building{left:405px!important;top:640px!important}
.hall-building{left:760px!important;top:650px!important;width:145px!important;height:170px!important}
.smith-building{left:240px!important;top:980px!important}
.market-building{left:1120px!important;top:1030px!important;width:145px!important;height:160px!important}
.watch-building{left:1370px!important;top:610px!important;width:105px!important;height:205px!important}
.path-main{left:745px!important;top:20px!important;width:110px!important;height:1780px!important}
.path-cross{left:125px!important;top:775px!important;width:1340px!important;height:105px!important}
.village-stream{left:1450px!important;top:0!important;width:150px!important;height:1900px!important}
.pixel-bridge{left:1378px!important;top:770px!important;width:190px!important;height:112px!important}
.town-square{left:690px!important;top:875px!important;width:220px!important;height:220px!important}
.hero-home{left:792px!important;top:1110px!important}
.villager-a{left:520px!important;top:770px!important}.villager-b{left:1030px!important;top:800px!important}.villager-c{left:610px!important;top:1220px!important}.villager-d{left:1040px!important;top:1260px!important}
.tree-a{left:100px!important;top:100px!important}.tree-b{left:530px!important;top:135px!important}.tree-c{left:1260px!important;top:120px!important}.tree-d{left:135px!important;top:1550px!important}.tree-e{left:1300px!important;top:1570px!important}
.lp1{left:675px!important;top:730px!important}.lp2{left:925px!important;top:730px!important}.lp3{left:675px!important;top:1110px!important}.lp4{left:925px!important;top:1120px!important}
.village-plot{width:112px!important;height:112px!important;border-radius:12px!important}
.village-plot .placed-building span{font-size:38px!important}.village-plot .placed-building b{font-size:9px!important}
.plot-0{left:390px!important;top:1300px!important}.plot-1{left:560px!important;top:1430px!important}.plot-2{left:760px!important;top:1390px!important}.plot-3{left:1010px!important;top:1340px!important}.plot-4{left:170px!important;top:1280px!important}.plot-5{left:430px!important;top:330px!important}.plot-6{left:1040px!important;top:350px!important}.plot-7{left:1210px!important;top:760px!important}
.village-build-btn{position:absolute!important;left:50%!important;bottom:14px!important;transform:translateX(-50%)!important;z-index:90!important}
.village-camera-controls{position:absolute;right:12px;bottom:14px;z-index:95;display:flex;flex-direction:column;gap:7px}
.village-camera-controls button{width:42px;height:42px;border-radius:12px;border:1px solid #d6a956;background:linear-gradient(#2b211d,#0d1016);color:#f4d58a;font-weight:900;font-size:20px;box-shadow:0 8px 20px #0009}
.village-camera-controls button:active{transform:scale(.94)}
@media(max-width:700px){
  .village-world{width:1600px!important;height:1900px!important;min-width:1600px!important;min-height:1900px!important}
  .village-building b{font-size:10px!important}.village-building small{font-size:7px!important}
  .village-camera-controls{right:8px;bottom:10px}.village-camera-controls button{width:39px;height:39px}
}

/* V22.3 — final village stability/scale overrides */
.pixel-village{overflow:hidden!important;touch-action:none!important;user-select:none;-webkit-user-select:none;contain:layout paint;}
.village-world{transform-origin:0 0!important;will-change:transform;}
.village-building{width:112px!important;height:132px!important;min-width:0!important;min-height:0!important;padding:0!important;pointer-events:auto!important;touch-action:none!important;}
.village-building::after{content:"";position:absolute;inset:-12px;border-radius:14px;}
.village-building:active{filter:drop-shadow(0 0 14px #f5c76d);}
.cathedral-building{left:728px!important;top:120px!important;width:145px!important;height:198px!important;}
.library-building{left:270px!important;top:315px!important;}
.barracks-building{left:1210px!important;top:330px!important;}
.tavern-building{left:430px!important;top:650px!important;}
.hall-building{left:744px!important;top:645px!important;width:126px!important;height:148px!important;}
.smith-building{left:275px!important;top:1010px!important;}
.market-building{left:1125px!important;top:1030px!important;width:126px!important;height:142px!important;}
.watch-building{left:1360px!important;top:620px!important;width:92px!important;height:176px!important;}
.village-building b{font-size:9px!important;line-height:1.15!important;}
.village-building small{font-size:6px!important;line-height:1.15!important;}
.village-camera-controls{position:absolute!important;right:10px!important;bottom:12px!important;z-index:500!important;align-items:center;}
.village-camera-controls button{touch-action:manipulation!important;pointer-events:auto!important;}
.village-zoom-readout{min-width:42px;padding:3px 4px;border-radius:8px;background:#090b10dc;border:1px solid #8f744b88;color:#f4d58a;font:700 9px/1 system-ui;text-align:center;box-shadow:0 4px 12px #0008;}
.village-build-btn{z-index:500!important;touch-action:manipulation!important;}
.village-build-tray{z-index:600!important;touch-action:manipulation!important;}
.village-plot{pointer-events:auto!important;touch-action:none!important;}
.village-plot.empty{box-shadow:inset 0 0 0 1px #f2d48a22;}
.village-plot.empty:active{border-color:#f3cf75!important;background:#66552d66!important;}
@media(max-width:700px){
  .village-building{width:104px!important;height:124px!important;}
  .cathedral-building{width:138px!important;height:190px!important;}
  .hall-building,.market-building{width:118px!important;}
  .watch-building{width:88px!important;height:168px!important;}
  .village-building::after{inset:-16px;}
}

/* V22.4 clean standalone Village input foundation */
.pixel-village[data-village-ready="standalone"]{touch-action:none!important;overflow:hidden!important;}
.pixel-village[data-village-ready="standalone"] .village-world{pointer-events:auto!important;}
.pixel-village[data-village-ready="standalone"] .village-building,
.pixel-village[data-village-ready="standalone"] .village-camera-controls,
.pixel-village[data-village-ready="standalone"] .village-build-btn{pointer-events:auto!important;}

/* V22.4B — functional construction */
.village-build-status{position:absolute;z-index:510;left:50%;bottom:76px;transform:translateX(-50%);width:min(520px,calc(100% - 110px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:9px 12px;border:1px solid #d4aa59;border-radius:12px;background:#0b0d14ee;color:#f5dfae;box-shadow:0 10px 28px #000b;pointer-events:auto;font:700 10px/1.25 system-ui}
.village-build-status.hidden{display:none}.village-build-status b{color:#ffd77d;letter-spacing:.12em}.village-build-status span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.village-build-status button{border:1px solid #8d6845;border-radius:8px;background:#24191b;color:#f7db9c;padding:7px 9px;font-weight:800}
.village-build-btn.active{border-color:#f0cc70!important;box-shadow:0 0 20px #f0b84288,0 8px 20px #0009!important}
.village-plot{opacity:.18;transition:opacity .18s,transform .18s,box-shadow .18s,border-color .18s;background:#161d19aa!important;display:grid!important;place-items:center!important;align-content:center!important;gap:3px!important}
.build-mode-active .village-plot.empty{opacity:.72}.build-mode-active .village-plot.empty.available{opacity:1;border-color:#e9cc76!important;background:#394528cc!important;box-shadow:0 0 0 4px #e3c46b22,0 0 24px #d7bc5d88!important;animation:vPlotPulse 1.25s ease-in-out infinite}
.village-plot.built{opacity:1!important;border-style:solid!important}.village-plot .plot-plus{font:900 28px/1 system-ui;color:#f1d27d}.village-plot>small{font:800 7px/1 system-ui;letter-spacing:.12em;color:#d9c28c}.village-plot .placed-building small{font:700 6px/1.1 system-ui;color:#b7d09c;background:#111914dd;border-radius:5px;padding:2px 4px}
.village-plot.constructing{opacity:1!important;animation:vConstruct .65s ease both!important}.village-plot.denied{animation:vDenied .35s ease!important;border-color:#ef6f6f!important}
@keyframes vPlotPulse{50%{transform:scale(1.045);box-shadow:0 0 0 7px #e3c46b14,0 0 34px #d7bc5daa}}
@keyframes vConstruct{0%{transform:scale(.75);filter:brightness(2)}55%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes vDenied{25%{transform:translateX(-7px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}
@media(max-width:700px){.village-build-status{bottom:68px;width:calc(100% - 88px);grid-template-columns:1fr auto}.village-build-status b{display:none}.village-build-status span{white-space:normal;font-size:9px}.village-build-status button{padding:6px 7px;font-size:8px}}

/* THE VILLAGE V23.0 — economy, identity, and Village Hall dashboard */
.village-economy-strip{position:absolute;z-index:44;top:10px;left:50%;transform:translateX(-50%);display:grid;grid-template-columns:repeat(4,minmax(64px,1fr));width:min(94%,620px);padding:7px 9px;border:1px solid rgba(208,168,91,.58);border-radius:14px;background:linear-gradient(180deg,rgba(15,17,24,.96),rgba(9,10,16,.92));box-shadow:0 7px 22px rgba(0,0,0,.42);color:#f4dfae;touch-action:manipulation}
.village-economy-strip>span{display:grid;grid-template-columns:auto auto;justify-content:center;align-items:center;column-gap:5px;border-right:1px solid rgba(205,168,91,.2);font-size:14px}.village-economy-strip>span:last-child{border-right:0}.village-economy-strip b{font-size:14px;color:#fff6da}.village-economy-strip small{grid-column:1/-1;font-size:9px;color:#c7ae76;letter-spacing:.04em;line-height:1.1}
.village-economy-panel{position:absolute;z-index:90;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92%,620px);max-height:84%;overflow:auto;padding:20px;border:1px solid #c89b50;border-radius:22px;background:linear-gradient(150deg,rgba(18,19,28,.99),rgba(8,9,15,.99));box-shadow:0 24px 80px rgba(0,0,0,.72),0 0 45px rgba(187,125,46,.18);color:#eee0bd;touch-action:pan-y}.village-economy-panel.hidden{display:none!important}.village-economy-panel:before{content:"";position:fixed;inset:-100vh -100vw;background:rgba(3,5,9,.62);z-index:-1;backdrop-filter:blur(3px)}
.economy-panel-head{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(201,157,82,.35);padding-bottom:13px}.economy-panel-head h2{margin:2px 0 4px;color:#f5dda1;font-family:Georgia,serif;font-size:25px}.economy-panel-head p{margin:0;color:#bbaa86;font-size:12px}.economy-panel-head button{flex:0 0 42px;height:42px;border:1px solid #be914c;border-radius:50%;background:#17131a;color:#f2db9e;font-size:27px}
.economy-level-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.economy-level-row>div,.economy-summary>div{padding:10px;border:1px solid rgba(190,145,76,.3);border-radius:12px;background:rgba(255,255,255,.025);text-align:center}.economy-level-row small,.economy-summary small{display:block;color:#a99365;font-size:9px;letter-spacing:.12em}.economy-level-row strong{display:block;margin-top:3px;color:#fff0c7;font-size:18px}
.economy-resource-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.economy-resource-grid article{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid rgba(190,145,76,.3);border-radius:14px;background:linear-gradient(145deg,rgba(54,48,39,.2),rgba(15,15,22,.45))}.economy-resource-grid article>span{font-size:28px}.economy-resource-grid small{display:block;color:#a99365;font-size:9px;letter-spacing:.12em}.economy-resource-grid strong{display:block;color:#fff3d2;font-size:22px;line-height:1.1}.economy-resource-grid em{display:block;color:#9cc681;font-size:10px;font-style:normal;margin-top:3px}
.economy-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.economy-summary strong{display:block;color:#efe0b7;font-size:13px;margin-top:4px}.economy-away-report{margin-top:12px;padding:11px 13px;border:1px solid rgba(132,178,103,.42);border-radius:12px;background:rgba(79,116,61,.14);color:#dceac8;font-size:12px;line-height:1.55}.economy-away-report.hidden{display:none!important}.economy-collect-btn{width:100%;margin-top:12px}
@media(max-width:520px){.village-economy-strip{width:93%;grid-template-columns:repeat(4,1fr);padding:6px 4px}.village-economy-strip>span{font-size:12px}.village-economy-strip b{font-size:12px}.village-economy-panel{padding:15px;max-height:82%}.economy-resource-grid{grid-template-columns:1fr 1fr}.economy-resource-grid article{padding:10px 8px;gap:7px}.economy-resource-grid article>span{font-size:22px}.economy-resource-grid strong{font-size:19px}}


/* V24.0 — THE LIVING VILLAGE: animated supplied citizen sprites */
.village-citizen-layer{position:absolute;inset:0;z-index:17;pointer-events:none;overflow:visible}
.living-citizen{position:absolute;width:32px;height:38px;transform:translate(-50%,-72%);pointer-events:none;will-change:left,top;image-rendering:pixelated;filter:drop-shadow(0 2px 2px #0008)}
.living-citizen i{position:absolute;left:0;bottom:0;width:32px;height:32px;background-repeat:no-repeat;background-size:128px 256px;image-rendering:pixelated;transform:scale(1.55);transform-origin:50% 100%}
.citizen-shadow-sprite{z-index:0;background-image:var(--citizen-shadow);opacity:.68}
.citizen-body-sprite{z-index:1;background-image:var(--citizen-sheet)}
.living-citizen:not(.is-idle) i{animation:citizenWalk .68s steps(4) infinite}
.living-citizen.facing-down i{background-position-y:-128px}.living-citizen.facing-left i{background-position-y:-160px}.living-citizen.facing-right i{background-position-y:-192px}.living-citizen.facing-up i{background-position-y:-224px}
.living-citizen.is-idle.facing-down i{background-position:0 0}.living-citizen.is-idle.facing-left i{background-position:0 -32px}.living-citizen.is-idle.facing-right i{background-position:0 -64px}.living-citizen.is-idle.facing-up i{background-position:0 -96px}
@keyframes citizenWalk{from{background-position-x:0}to{background-position-x:-128px}}
@media(max-width:700px){.living-citizen i{transform:scale(1.7)}}
@media(prefers-reduced-motion:reduce){.living-citizen:not(.is-idle) i{animation-duration:1.25s}}


/* V25.0 — KAEL LIVES */
.kael-world-avatar{position:absolute;left:800px;top:1015px;width:72px;height:92px;transform:translate(-50%,-82%);z-index:85;pointer-events:none;filter:drop-shadow(0 6px 5px #0009);will-change:left,top}
.kael-world-avatar::after{content:"";position:absolute;left:50%;bottom:3px;width:42px;height:14px;transform:translateX(-50%);border-radius:50%;background:#06060980;filter:blur(3px);z-index:0}
.kael-world-sprite{position:absolute;inset:0;z-index:1;background-image:url("assets/characters/kael/kael.png");background-repeat:no-repeat;background-size:400% 400%;background-position:0 0;image-rendering:auto}
.kael-world-avatar.walking .kael-world-sprite{animation:kaelWorldWalk .56s steps(1,end) infinite}
.kael-world-avatar.facing-down .kael-world-sprite{background-position-y:0%}
.kael-world-avatar.facing-up .kael-world-sprite{background-position-y:33.333%}
.kael-world-avatar.facing-right .kael-world-sprite{background-position-y:66.666%}
.kael-world-avatar.facing-left .kael-world-sprite{background-position-y:100%}
@keyframes kaelWorldWalk{0%,24.99%{background-position-x:0%}25%,49.99%{background-position-x:33.333%}50%,74.99%{background-position-x:66.666%}75%,100%{background-position-x:100%}}
.kael-nameplate{position:absolute;left:50%;top:88px;transform:translateX(-50%);padding:2px 8px;border:1px solid #bc914e;border-radius:10px;background:#0a0910e8;color:#f3deb0;font:700 11px Georgia,serif;letter-spacing:.08em;white-space:nowrap;z-index:2}
.kael-controls{position:fixed;left:max(18px,env(safe-area-inset-left));bottom:calc(88px + env(safe-area-inset-bottom));z-index:10050;display:flex;align-items:flex-end;gap:12px;touch-action:none;user-select:none;-webkit-user-select:none}
.kael-stick{position:relative;width:116px;height:116px;border-radius:50%;border:2px solid #c9a35d99;background:radial-gradient(circle,#2b2536bb 0 30%,#0b0a12d9 31% 100%);box-shadow:0 8px 28px #000b,inset 0 0 28px #94743c22}
.kael-stick-knob{position:absolute;left:50%;top:50%;width:48px;height:48px;transform:translate(-50%,-50%);border-radius:50%;border:2px solid #f0d08c;background:#343044e8;box-shadow:0 3px 12px #000b,inset 0 0 10px #fff2}
.kael-interact{width:58px;height:58px;border-radius:18px;border:2px solid #c9a35d;background:#12101bea;color:#f4d58d;font:700 24px Georgia;box-shadow:0 6px 18px #0009}
body:not(.battle-mode) .kael-controls{display:flex}
body.battle-mode .kael-controls{display:flex;bottom:max(116px,calc(116px + env(safe-area-inset-bottom)))}
body.cards-native-scroll .kael-controls,.screen:not(#menu):not(.hidden)~.kael-controls{display:none}
@media(min-width:900px){.kael-controls{left:28px;bottom:102px}.kael-stick{width:126px;height:126px}}


/* V25.4 — reliable iPad battle controls */
.battle-controls{position:relative;z-index:120;isolation:isolate}
.battle-icon{pointer-events:auto!important;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.battle-icon.exit-armed{border-color:#ff6974!important;background:linear-gradient(#5b1722,#21070d)!important;box-shadow:0 0 0 2px #ff697455,0 4px 14px #0009!important}


/* V25.5 — iPad touch interception and modal stacking repair */
body.battle-mode #tutorial{
  position:fixed!important;
  z-index:30000!important;
  pointer-events:auto!important;
  touch-action:manipulation!important;
}
body.battle-mode #tutorial *{pointer-events:auto!important;touch-action:manipulation!important}
body.battle-mode #closeTut{position:relative!important;z-index:30001!important;opacity:1!important}
body.battle-mode .battle-controls{z-index:20000!important;pointer-events:auto!important}
body.battle-mode .battle-icon{position:relative!important;z-index:20001!important;pointer-events:auto!important}
body.battle-mode .kael-controls{z-index:150!important}


/* V25.6 — autonomous battle hero and absolute iPad control priority */
body.battle-mode .kael-controls{display:none!important;pointer-events:none!important}
body.battle-mode #hud{z-index:40000!important}
body.battle-mode .battle-controls{position:relative!important;z-index:40010!important;pointer-events:auto!important}
body.battle-mode .battle-icon{z-index:40011!important;pointer-events:auto!important;touch-action:none!important}
#gameOver{z-index:50000!important;pointer-events:auto!important;touch-action:manipulation!important}
#gameOver .panel,#gameOver .row,#gameOver button{position:relative;z-index:50001!important;pointer-events:auto!important;touch-action:none!important}
#retryBtn,#menuBtn{min-height:58px}


/* V25.7 — bottom command marquee + native navigation fallback */
.battle-command-marquee{
  display:none;
  position:fixed;
  left:50%;
  bottom:calc(12px + env(safe-area-inset-bottom));
  transform:translateX(-50%);
  z-index:1000000;
  width:min(94vw,520px);
  padding:8px;
  grid-template-columns:repeat(4,1fr);
  gap:8px;
  border:1px solid #a98955;
  border-radius:20px;
  background:linear-gradient(180deg,rgba(32,22,38,.98),rgba(8,7,12,.99));
  box-shadow:0 12px 38px #000d,inset 0 0 0 1px #f3d99b22;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  -webkit-user-select:none;
  user-select:none;
}
body.battle-mode .battle-command-marquee{display:grid!important}
.marquee-command{
  min-width:0;
  min-height:58px;
  padding:5px 4px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  border:1px solid #856b45;
  border-radius:13px;
  background:linear-gradient(180deg,#2b2032,#100c16);
  color:#f7dfaa;
  text-decoration:none;
  font-family:Georgia,serif;
  box-shadow:inset 0 0 12px #e8c57b12,0 3px 10px #0008;
  pointer-events:auto!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:rgba(255,220,140,.25);
}
.marquee-command .command-icon{font-size:23px;font-weight:700;line-height:1}
.marquee-command small{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#cdbb94}
.marquee-command:active,.marquee-command.pressed{transform:scale(.94);filter:brightness(1.25)}
.marquee-command.danger-command{border-color:#93434d;color:#ffbbb4}
body.battle-mode .battle-bottom{padding-bottom:calc(82px + env(safe-area-inset-bottom))!important}
body.battle-mode .audio-fab{bottom:calc(91px + env(safe-area-inset-bottom))!important;top:auto!important}
.native-result-link{display:inline-flex!important;align-items:center;justify-content:center;text-decoration:none;touch-action:manipulation!important;pointer-events:auto!important;min-height:58px}
#gameOver .native-result-link{position:relative;z-index:1000001!important}
@media(max-width:480px){
 .battle-command-marquee{width:calc(100vw - 20px);gap:6px;padding:7px;bottom:calc(8px + env(safe-area-inset-bottom))}
 .marquee-command{min-height:54px}.marquee-command .command-icon{font-size:21px}
}


/* V25.8 — true full-screen battlefield and final iPad touch ownership */
body.battle-mode,#app{background:#19030d!important}
body.battle-mode #game{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;display:block!important;background:#24040f!important}
body.battle-mode #threeBg{display:none!important}
body.battle-mode .battle-command-marquee{z-index:2147483000!important;pointer-events:auto!important}
body.battle-mode .marquee-command{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent}
.marquee-command.pressed{transform:translateY(1px) scale(.97)!important;filter:brightness(1.3)!important}
#gameOver{z-index:2147482000!important}
#gameOver .panel{z-index:2147482100!important}
#retryBtn,#menuBtn{pointer-events:auto!important;touch-action:none!important;min-height:64px!important}
body.battle-mode .battle-bottom{padding-bottom:calc(88px + env(safe-area-inset-bottom))!important}
@media(max-width:700px){
 body.battle-mode .battle-command-marquee{width:calc(100vw - 16px)!important;bottom:calc(6px + env(safe-area-inset-bottom))!important}
}

/* V25.9 native iPad command layer */
.battle-command-marquee{isolation:isolate!important}
.marquee-command,#retryBtn,#menuBtn{cursor:pointer!important;-webkit-user-select:none!important;user-select:none!important;touch-action:manipulation!important;pointer-events:auto!important}
#gameOver .row{position:relative!important;z-index:2147483600!important;pointer-events:auto!important}
#gameOver button{position:relative!important;z-index:2147483640!important}


/* V26.0 — command layer owns touch before the battlefield canvas. */
#battleControlMarquee,#gameOver,#gameOver .panel,#gameOver .row{
  pointer-events:auto!important;
  touch-action:none!important;
  -webkit-user-select:none!important;
  user-select:none!important;
}
[data-battle-command]{
  pointer-events:auto!important;
  touch-action:none!important;
  -webkit-tap-highlight-color:rgba(255,220,150,.22)!important;
}
[data-battle-command].pressed{transform:scale(.94)!important;filter:brightness(1.35)!important;}

/* V26.4 — native battle-control state feedback */
#battleControlMarquee .marquee-command.is-active {
  border-color: rgba(255, 226, 142, .9);
  background: linear-gradient(180deg, rgba(113, 79, 34, .96), rgba(49, 31, 20, .98));
  box-shadow: inset 0 0 0 1px rgba(255, 239, 181, .25), 0 0 12px rgba(222, 174, 78, .28);
}
body.battle-paused #game {
  filter: brightness(.72) saturate(.78);
}


/* V27.1 — Battle UX: readable drafts, free placement camera, clearer selection */
#choices .panel{width:min(980px,96vw)!important;max-width:980px!important;padding:clamp(14px,2.2vw,24px)!important}
#choicesCards{gap:clamp(10px,2vw,20px)!important}
#choicesCards .draft-choice-card{position:relative;aspect-ratio:auto!important;min-height:390px!important;padding:10px 10px 12px!important;border-radius:15px!important;text-align:left;display:flex;flex-direction:column;overflow:hidden;touch-action:manipulation}
#choicesCards .draft-level,#choicesCards .draft-type{position:absolute;top:9px;z-index:3;padding:4px 7px;border-radius:8px;background:#09070ddd;border:1px solid #ffffff55;font-size:12px;font-weight:800;letter-spacing:.05em;color:#fff}
#choicesCards .draft-level{left:9px}#choicesCards .draft-type{right:9px}
#choicesCards .draft-art{height:126px;min-height:126px;margin:28px 0 8px;border-radius:11px;border:1px solid #ffffff55;background:radial-gradient(circle,#ffffff30,transparent 60%),linear-gradient(145deg,#0001,#0008);display:grid;place-items:center;position:relative;overflow:hidden}
#choicesCards .draft-art:after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 18px,#ffffff0b 19px 20px)}
#choicesCards .draft-icon{font-size:64px;line-height:1;filter:drop-shadow(0 7px 9px #000);position:relative;z-index:1}
#choicesCards .draft-choice-card h3{font-size:clamp(17px,2vw,22px)!important;line-height:1.08!important;margin:2px 0 6px!important;text-align:center!important;min-height:46px;display:grid;place-items:center;color:inherit}
#choicesCards .draft-desc{display:block!important;font-size:14px!important;line-height:1.3!important;min-height:55px;margin:0 2px 9px!important;opacity:.96!important;-webkit-line-clamp:3!important}
#choicesCards .draft-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
#choicesCards .draft-stat-grid>div{min-width:0;padding:7px 8px;border-radius:8px;border:1px solid #ffffff38;background:#09070db8}
#choicesCards .draft-stat-grid small{display:block;font-size:9px;letter-spacing:.08em;color:#e9ddca;opacity:.85}
#choicesCards .draft-stat-grid b{display:block;margin-top:2px;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
#choicesCards .draft-cost{display:flex;justify-content:space-between;align-items:center;margin-top:7px;padding-top:7px;border-top:1px solid #ffffff44;font-size:12px;font-weight:700}
#choicesCards .draft-cost strong{font-size:15px;color:#fff0a7}
#placementBar{max-width:min(760px,94vw)!important}.placementBar #placementLabel{font-size:12px!important;line-height:1.25!important;letter-spacing:.01em!important}
#towerInspector{font-size:13px!important;line-height:1.45!important;border-width:2px!important}
@media(max-width:700px){
 #choices .panel{width:98vw!important;padding:12px 8px!important}
 #choicesCards{gap:6px!important}
 #choicesCards .draft-choice-card{min-height:330px!important;padding:7px!important;border-radius:10px!important}
 #choicesCards .draft-level,#choicesCards .draft-type{top:6px;padding:3px 5px;font-size:9px}.draft-level{left:6px}.draft-type{right:6px}
 #choicesCards .draft-art{height:92px;min-height:92px;margin-top:22px;margin-bottom:5px}
 #choicesCards .draft-icon{font-size:45px}
 #choicesCards .draft-choice-card h3{font-size:13px!important;min-height:33px;margin-bottom:4px!important}
 #choicesCards .draft-desc{font-size:11px!important;min-height:42px!important;line-height:1.25!important;-webkit-line-clamp:3!important}
 #choicesCards .draft-stat-grid{gap:4px}
 #choicesCards .draft-stat-grid>div{padding:5px 4px}
 #choicesCards .draft-stat-grid small{font-size:7px}
 #choicesCards .draft-stat-grid b{font-size:10px}
 #choicesCards .draft-cost{font-size:9px}.draft-cost strong{font-size:11px!important}
}
@media(max-width:430px){
 #choicesCards{display:flex!important;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 calc(50vw - 112px) 8px!important;gap:10px!important}
 #choicesCards .draft-choice-card{flex:0 0 224px;scroll-snap-align:center;min-height:360px!important}
 #choicesCards .draft-art{height:112px;min-height:112px}.draft-icon{font-size:55px!important}
 #choicesCards .draft-choice-card h3{font-size:16px!important;min-height:39px}
 #choicesCards .draft-desc{font-size:12px!important;min-height:48px!important}
 #choicesCards .draft-stat-grid b{font-size:12px}
}

/* V27.1.1 — Premium Card Draft */
#choices .panel{background:linear-gradient(180deg,rgba(31,23,31,.985),rgba(12,10,16,.99))!important}
#choices #rewardTitle{font-size:clamp(24px,4vw,38px)!important;letter-spacing:.035em;margin-bottom:4px!important}
#choices #rewardText{font-size:clamp(13px,2vw,17px)!important;line-height:1.35!important;margin:0 auto 14px!important;max-width:720px;color:#eee3d2!important}
#choicesCards .draft-choice-card{min-height:430px!important;padding:12px!important;border-width:2px!important;transition:transform .14s ease,filter .14s ease,box-shadow .14s ease;box-shadow:0 16px 34px #000a,inset 0 0 0 1px #ffffff18!important}
#choicesCards .draft-choice-card:active{transform:scale(1.035);filter:brightness(1.12);box-shadow:0 20px 42px #000c,inset 0 0 0 1px #ffffff44!important}
#choicesCards .draft-art{height:140px;min-height:140px;margin:30px 0 8px!important}
#choicesCards .draft-icon{font-size:72px!important}
#choicesCards .draft-choice-card h3{font-size:clamp(18px,2.3vw,24px)!important;min-height:48px!important;margin:2px 0 8px!important;text-wrap:balance}
#choicesCards .draft-stat-grid{gap:7px!important;margin-top:0!important}
#choicesCards .draft-stat-grid>div{padding:8px 9px!important;min-height:54px;display:flex;flex-direction:column;justify-content:center}
#choicesCards .draft-stat-grid small,#choicesCards .draft-passive small{font-size:10px!important;letter-spacing:.105em!important;font-weight:800;color:#dfceb7!important}
#choicesCards .draft-stat-grid b{font-size:14px!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.15!important}
#choicesCards .draft-passive{margin-top:8px;padding:8px 9px;border-radius:9px;border:1px solid #d7b56d66;background:linear-gradient(180deg,#4a341d66,#130e13d9)}
#choicesCards .draft-passive p{display:block!important;margin:3px 0 0!important;min-height:0!important;font-size:12px!important;line-height:1.3!important;color:#fff7e8!important;opacity:1!important;-webkit-line-clamp:2!important}
#choicesCards .draft-cost{margin-top:8px!important;font-size:11px!important;gap:8px}
#choicesCards .draft-cost span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eadfce}
#choicesCards .draft-cost strong{font-size:18px!important;white-space:nowrap}
@media(max-width:700px){
 #choicesCards .draft-choice-card{min-height:386px!important;padding:8px!important}
 #choicesCards .draft-art{height:106px;min-height:106px;margin-top:24px!important}
 #choicesCards .draft-icon{font-size:53px!important}
 #choicesCards .draft-choice-card h3{font-size:14px!important;min-height:36px!important;margin-bottom:5px!important}
 #choicesCards .draft-stat-grid{gap:4px!important}
 #choicesCards .draft-stat-grid>div{padding:5px!important;min-height:44px}
 #choicesCards .draft-stat-grid small,#choicesCards .draft-passive small{font-size:7px!important}
 #choicesCards .draft-stat-grid b{font-size:10px!important}
 #choicesCards .draft-passive{margin-top:5px;padding:5px 6px}
 #choicesCards .draft-passive p{font-size:9px!important;line-height:1.22!important;-webkit-line-clamp:2!important}
 #choicesCards .draft-cost{font-size:8px!important;margin-top:5px!important}.draft-cost strong{font-size:12px!important}
}
@media(max-width:430px){
 #choicesCards .draft-choice-card{flex-basis:246px!important;min-height:410px!important}
 #choicesCards{padding-left:calc(50vw - 123px)!important;padding-right:calc(50vw - 123px)!important}
 #choicesCards .draft-art{height:120px;min-height:120px}
 #choicesCards .draft-icon{font-size:61px!important}
 #choicesCards .draft-choice-card h3{font-size:17px!important;min-height:40px!important}
 #choicesCards .draft-stat-grid small,#choicesCards .draft-passive small{font-size:8px!important}
 #choicesCards .draft-stat-grid b{font-size:12px!important}
 #choicesCards .draft-passive p{font-size:11px!important}
 #choicesCards .draft-cost{font-size:9px!important}.draft-cost strong{font-size:14px!important}
}
/* V27.1.2 — Cards screen repair and iPad readability */
#deckScreen{pointer-events:auto!important}
#deckScreen .cards-deck-panel{width:min(1120px,96vw)!important;max-width:1120px!important;padding:16px!important;overflow:auto!important;display:block!important;height:auto!important;max-height:none!important}
#deckScreen .deck-zone{padding:14px!important}
#deckScreen .deck-loadout{grid-template-columns:210px minmax(0,1fr)!important;gap:14px!important}
#deckScreen #equippedDeck.equipped-deck{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;justify-content:stretch!important}
#deckScreen #equippedDeck .deck-slot{min-height:150px!important;height:auto!important;padding:8px!important;pointer-events:auto!important}
#deckScreen #equippedDeck .card-art{min-height:68px!important;margin:18px 0 6px!important}
#deckScreen #equippedDeck h3{font-size:13px!important}
#deckScreen .card-file-tabs{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;margin:12px 0!important}
#deckScreen .card-file-tab{min-height:42px!important;font-size:13px!important;padding:8px 6px!important;pointer-events:auto!important;position:relative!important;z-index:5!important}
#deckScreen .deck-tools{display:grid!important;grid-template-columns:minmax(180px,1fr) auto auto!important;gap:10px!important;align-items:center!important}
#deckScreen .deck-tools select,#deckScreen .deck-tools input,#deckScreen .deck-tools button,#deckScreen .sticky-actions button{pointer-events:auto!important;position:relative!important;z-index:5!important}
#deckScreen #collectionCards.cards.portrait-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;overflow:visible!important;max-height:none!important;padding:4px!important}
#deckScreen #collectionCards .portrait-card.compact-card{aspect-ratio:5/7!important;min-height:250px!important;height:auto!important;padding:9px!important;border-radius:12px!important;pointer-events:auto!important}
#deckScreen #collectionCards .portrait-card.compact-card .card-art{position:relative!important;inset:auto!important;height:43%!important;min-height:95px!important;margin:24px 0 7px!important}
#deckScreen #collectionCards .portrait-card.compact-card .art-sigil{font-size:46px!important}
#deckScreen #collectionCards .portrait-card.compact-card h3{display:block!important;font-size:15px!important;line-height:1.15!important;white-space:normal!important;margin:4px 0!important}
#deckScreen #collectionCards .portrait-card.compact-card p{display:-webkit-box!important;font-size:11px!important;line-height:1.25!important;-webkit-line-clamp:2!important}
#deckScreen #collectionCards .portrait-card.compact-card .card-stats{display:flex!important;font-size:10px!important}
#deckScreen #collectionCards .portrait-card.compact-card .card-footer{display:flex!important;font-size:9px!important}
#deckScreen #collectionCards .portrait-card.compact-card .card-equip{display:block!important;position:static!important;height:auto!important;margin-top:7px!important;padding:7px!important;font-size:11px!important}
#deckScreen .sticky-actions{position:static!important;padding:14px 0 4px!important;background:none!important}
@media(max-width:800px){
 #deckScreen .cards-deck-panel{width:98vw!important;padding:10px!important}
 #deckScreen .deck-loadout{grid-template-columns:150px minmax(0,1fr)!important;gap:8px!important}
 #deckScreen #equippedDeck .deck-slot{min-height:112px!important}
 #deckScreen #collectionCards.cards.portrait-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important}
 #deckScreen #collectionCards .portrait-card.compact-card{min-height:220px!important}
 #deckScreen .card-file-tab{font-size:11px!important}
}
@media(max-width:560px){
 #deckScreen .deck-loadout{grid-template-columns:105px minmax(0,1fr)!important}
 #deckScreen #equippedDeck.equipped-deck{gap:5px!important}
 #deckScreen #equippedDeck .deck-slot{min-height:84px!important}
 #deckScreen .card-file-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #deckScreen #collectionCards.cards.portrait-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #deckScreen .deck-tools{grid-template-columns:1fr!important}
}

```

## File: `src/main.js`

**Purpose:** Single cleaned entry module that imports the three live runtime modules.

**SHA-256:** `50e7487512bffd54e9a9cad4883a542463657359036e7c80edd7d95da047bc17`

```javascript
import './villageBootstrap.js';
import './Renderer/threeAtmosphere.js';
import './Battle/game.js';

```

## File: `src/villageBootstrap.js`

**Purpose:** Bootstraps home/village presentation and supporting visual behavior.

**SHA-256:** `01b640c93fdf9d1aa792b244cff33474ee5d677b391785c43996aab5e7510413`

```javascript
const ready = (fn) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
};

ready(() => {
  const viewport = document.querySelector('.pixel-village');
  const world = document.getElementById('villageWorld');
  if (!viewport || !world) return;

  window.__ROTK_VILLAGE_BOOTSTRAP__ = true;
  viewport.dataset.villageReady = 'standalone';

  const WORLD_W = 1600;
  const WORLD_H = 1900;
  const camera = { x: 0, y: 0, scale: 0.5, min: 0.28, max: 1.3 };
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let suppressTapUntil = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function clampCamera() {
    const vw = viewport.clientWidth || 1;
    const vh = viewport.clientHeight || 1;
    const sw = WORLD_W * camera.scale;
    const sh = WORLD_H * camera.scale;
    const margin = 80;
    camera.x = sw <= vw ? (vw - sw) / 2 : clamp(camera.x, vw - sw - margin, margin);
    camera.y = sh <= vh ? (vh - sh) / 2 : clamp(camera.y, vh - sh - margin, margin);
  }

  function render() {
    clampCamera();
    world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    const out = document.getElementById('villageZoomReadout');
    if (out) out.textContent = `${Math.round(camera.scale * 100)}%`;
  }

  function center(animate = false) {
    camera.scale = Math.min(window.innerWidth, window.innerHeight) < 760 ? 0.42 : 0.62;
    camera.x = viewport.clientWidth / 2 - 800 * camera.scale;
    camera.y = viewport.clientHeight / 2 - 900 * camera.scale;
    world.style.transition = animate ? 'transform 220ms ease-out' : 'none';
    render();
    if (animate) setTimeout(() => { world.style.transition = 'none'; }, 240);
  }

  function zoomAt(nextScale, clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const cx = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const cy = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const old = camera.scale;
    const next = clamp(nextScale, camera.min, camera.max);
    const wx = (cx - camera.x) / old;
    const wy = (cy - camera.y) / old;
    camera.scale = next;
    camera.x = cx - wx * next;
    camera.y = cy - wy * next;
    render();
  }

  const isUi = (target) => Boolean(target.closest('.village-camera-controls,.village-build-btn,.village-build-tray,.village-building,.village-plot,.village-economy-strip,.village-economy-panel,.kael-controls'));

  viewport.addEventListener('pointerdown', (e) => {
    if (isUi(e.target)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) {
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: camera.x, by: camera.y, moved: false };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        scale: camera.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2
      };
      drag = null;
    }
    e.preventDefault();
  }, { passive: false });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      if (!pinch) return;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      zoomAt(pinch.scale * distance / pinch.distance, midX, midY);
      const dx = midX - pinch.midX;
      const dy = midY - pinch.midY;
      camera.x += dx;
      camera.y += dy;
      pinch.midX = midX;
      pinch.midY = midY;
      render();
      suppressTapUntil = performance.now() + 400;
    } else if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        viewport.classList.add('is-panning');
      }
      if (drag.moved) {
        camera.x = drag.bx + dx;
        camera.y = drag.by + dy;
        render();
        suppressTapUntil = performance.now() + 300;
      }
    }
    e.preventDefault();
  }, { passive: false });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    try { viewport.releasePointerCapture?.(e.pointerId); } catch {}
    if (pointers.size === 0) {
      drag = null;
      pinch = null;
      viewport.classList.remove('is-panning');
    } else if (pointers.size === 1) {
      const [id, p] = [...pointers.entries()][0];
      drag = { id, sx: p.x, sy: p.y, bx: camera.x, by: camera.y, moved: false };
      pinch = null;
    }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(camera.scale * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
  }, { passive: false });

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  };
  bind('villageZoomIn', () => zoomAt(camera.scale * 1.2));
  bind('villageZoomOut', () => zoomAt(camera.scale / 1.2));
  bind('villageCenterBtn', () => center(true));

  function nav(name) {
    document.querySelector(`#bottomNav [data-nav="${name}"]`)?.click();
  }
  function moreTarget(name) {
    nav('more');
    requestAnimationFrame(() => document.querySelector(`[data-more-target="${name}"]`)?.click());
  }

  const economyPanel = document.getElementById('villageEconomyPanel');
  const economyStrip = document.getElementById('villageEconomyStrip');
  let economyRefreshTimer = 0;
  const fmt = (value) => Math.floor(Math.max(0, Number(value) || 0)).toLocaleString();
  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function refreshVillageEconomy(showReport = false) {
    const data = window.ROTKGameBridge?.getVillageEconomy?.();
    if (!data) return null;
    setText('villageFoodTotal', fmt(data.food));
    setText('villageWoodTotal', fmt(data.wood));
    setText('villageStoneTotal', fmt(data.stone));
    setText('villagePopulationTotal', `${fmt(data.population)}/${fmt(data.capacity)}`);
    setText('villageFoodRate', `+${fmt(data.foodRate)}/h`);
    setText('villageWoodRate', `+${fmt(data.woodRate)}/h`);
    setText('villageStoneRate', `+${fmt(data.stoneRate)}/h`);
    setText('economyFood', fmt(data.food));
    setText('economyWood', fmt(data.wood));
    setText('economyStone', fmt(data.stone));
    setText('economyPopulation', `${fmt(data.population)} / ${fmt(data.capacity)}`);
    setText('economyFoodRate', `+${fmt(data.foodRate)} per hour`);
    setText('economyWoodRate', `+${fmt(data.woodRate)} per hour`);
    setText('economyStoneRate', `+${fmt(data.stoneRate)} per hour`);
    setText('economyVillageLevel', data.level || 1);
    setText('economyHappiness', `${data.happiness || 75}%`);
    setText('economyBuildingCount', `${data.buildings || 0} / 8`);
    setText('economyTotalRate', `${fmt(data.totalRate)} resources / hour`);
    setText('economyOfflineCap', `${data.maxOfflineHours || 12} hours`);
    setText('economyPopulationRate', data.counts?.house ? `${data.counts.house} house${data.counts.house === 1 ? '' : 's'} supporting the village` : 'Build Houses to expand');
    const report = document.getElementById('economyAwayReport');
    if (report) {
      const gain = data.lastReport;
      const meaningful = gain && (gain.food + gain.wood + gain.stone) >= .1;
      report.classList.toggle('hidden', !(showReport && meaningful));
      if (showReport && meaningful) report.innerHTML = `<b>While you were away</b><br>🌾 +${fmt(gain.food)} Food &nbsp; 🪵 +${fmt(gain.wood)} Wood &nbsp; 🪨 +${fmt(gain.stone)} Stone`;
    }
    return data;
  }
  function openEconomyPanel() {
    refreshVillageEconomy(true);
    economyPanel?.classList.remove('hidden');
  }
  function closeEconomyPanel() { economyPanel?.classList.add('hidden'); }
  economyStrip?.addEventListener('pointerdown', (e) => e.stopPropagation());
  economyStrip?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openEconomyPanel(); });
  bind('villageEconomyClose', closeEconomyPanel);
  bind('economyCollectBtn', () => {
    window.ROTKGameBridge?.collectVillageEconomy?.();
    refreshVillageEconomy(false);
    toast('Village resources collected and saved');
  });
  const destinations = {
    playBtn: () => nav('campaign'),
    villageCardsBtn: () => nav('cards'),
    villageHeroesBtn: () => nav('heroes'),
    villageRelicsBtn: () => nav('relics'),
    kingdomBtn: () => openEconomyPanel(),
    forgeBtnHome: () => { nav('more'); requestAnimationFrame(() => document.getElementById('forgeBtn')?.click()); },
    codexBtn: () => moreTarget('codex'),
    villageAudioBtn: () => document.getElementById('audioBtn')?.click()
  };

  document.querySelectorAll('.village-building').forEach((button) => {
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (performance.now() < suppressTapUntil) return;
      destinations[button.id]?.();
    }, true);
  });

  // V22.4B — functional construction layered around the proven camera controller.
  const tray = document.getElementById('villageBuildTray');
  const hint = document.getElementById('villageBuildHint');
  const plotsRoot = document.getElementById('villagePlots');
  const buildButton = document.getElementById('villageBuildBtn');
  const BUILDINGS = {
    house:  { name: 'House',       icon: '🏠', cost: 80,  output: '+4 Population' },
    farm:   { name: 'Farm',        icon: '🌾', cost: 95,  output: '+8 Food / h' },
    lumber: { name: 'Lumber Camp', icon: '🪵', cost: 110, output: '+6 Wood / h' },
    quarry: { name: 'Quarry',      icon: '🪨', cost: 125, output: '+5 Stone / h' }
  };
  const PLOT_KEY = 'rotkVillagePlotsV224B';
  let buildType = null;
  let buildMode = false;
  let bridgeGrantChecked = false;

  const status = document.createElement('div');
  status.className = 'village-build-status hidden';
  status.innerHTML = '<b>BUILD MODE</b><span>Select a structure.</span><button type="button">CANCEL</button>';
  viewport.append(status);
  status.querySelector('button').addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); exitBuildMode();
  });

  function toast(message) {
    if (window.ROTKGameBridge?.toast) return window.ROTKGameBridge.toast(message);
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message; el.style.opacity = '1';
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.opacity = '0'; }, 1700);
  }
  function readPlots() {
    try { return JSON.parse(localStorage.getItem(PLOT_KEY) || localStorage.getItem('rotkVillagePlots') || '{}'); }
    catch { return {}; }
  }
  function writePlots(data) {
    localStorage.setItem(PLOT_KEY, JSON.stringify(data));
    // Maintain compatibility with earlier Village test builds.
    localStorage.setItem('rotkVillagePlots', JSON.stringify(data));
  }
  function getEssence() {
    if (window.ROTKGameBridge?.getEssence) return window.ROTKGameBridge.getEssence();
    return Number(document.getElementById('homeEssence')?.textContent) || 0;
  }
  function updateStatus(text) {
    const label = status.querySelector('span');
    if (label) label.textContent = text;
    if (hint) hint.textContent = text;
  }
  function syncBuildUi() {
    viewport.classList.toggle('build-mode-active', buildMode);
    status.classList.toggle('hidden', !buildMode);
    buildButton?.classList.toggle('active', buildMode);
    if (buildButton) buildButton.innerHTML = buildMode ? '✕ CANCEL BUILD' : '🔨 BUILD';
    plotsRoot?.querySelectorAll('.village-plot.empty').forEach((plot) => {
      plot.classList.toggle('available', Boolean(buildMode && buildType));
    });
  }
  function enterBuildMode() {
    buildMode = true; buildType = null;
    tray?.classList.remove('hidden');
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.remove('selected'));
    updateStatus('Choose a structure from the construction menu.');
    if (!bridgeGrantChecked && window.ROTKGameBridge?.ensureVillageBuilderGrant) {
      bridgeGrantChecked = true;
      const grant = window.ROTKGameBridge.ensureVillageBuilderGrant();
      if (grant) toast(`Builder’s Reserve received · +${grant} Blood Essence`);
    }
    syncBuildUi();
  }
  function exitBuildMode() {
    buildMode = false; buildType = null;
    tray?.classList.add('hidden');
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.remove('selected'));
    updateStatus('Select a structure.');
    syncBuildUi();
  }
  function selectBuilding(choice) {
    const type = choice.dataset.villageBuild;
    const def = BUILDINGS[type];
    if (!def) return;
    buildMode = true; buildType = type;
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.toggle('selected', b === choice));
    tray?.classList.add('hidden');
    updateStatus(`${def.icon} ${def.name} selected · tap a glowing empty plot · ${def.cost} Essence`);
    syncBuildUi();
    toast(`${def.name} selected — tap a glowing plot`);
  }
  function constructPlot(plot) {
    if (!buildMode || !buildType) {
      toast('Tap BUILD and select a structure first');
      return;
    }
    const index = plot.dataset.plot;
    const placed = readPlots();
    if (placed[index]) { toast('That construction plot is occupied'); return; }
    const def = BUILDINGS[buildType];
    const available = getEssence();
    if (available < def.cost) {
      plot.classList.add('denied');
      setTimeout(() => plot.classList.remove('denied'), 450);
      toast(`Not enough Blood Essence · need ${def.cost}, have ${available}`);
      updateStatus(`Not enough Essence for ${def.name}. Need ${def.cost}; you have ${available}.`);
      return;
    }
    if (window.ROTKGameBridge?.spendVillageEssence && !window.ROTKGameBridge.spendVillageEssence(def.cost)) {
      toast('Construction could not be funded'); return;
    }
    placed[index] = buildType;
    writePlots(placed);
    window.ROTKGameBridge?.villageBuildingConstructed?.(buildType);
    refreshVillageEconomy(false);
    plot.classList.add('constructing');
    updateStatus(`Constructing ${def.name}…`);
    setTimeout(() => {
      renderPlots();
      toast(`${def.name} constructed · ${def.output}`);
      exitBuildMode();
    }, 650);
  }
  function renderPlots() {
    if (!plotsRoot) return;
    const placed = readPlots();
    plotsRoot.replaceChildren();
    for (let i = 0; i < 8; i += 1) {
      const type = placed[i];
      const plot = document.createElement('button');
      plot.type = 'button';
      plot.className = `village-plot plot-${i} ${type ? 'built' : 'empty'}`;
      plot.dataset.plot = String(i);
      if (type && BUILDINGS[type]) {
        const def = BUILDINGS[type];
        plot.innerHTML = `<span class="placed-building"><span>${def.icon}</span><b>${def.name}</b><small>${def.output}</small></span>`;
        plot.setAttribute('aria-label', `${def.name}, constructed`);
      } else {
        plot.innerHTML = '<span class="plot-plus">＋</span><small>BUILD PLOT</small>';
        plot.setAttribute('aria-label', `Empty construction plot ${i + 1}`);
      }
      plot.addEventListener('pointerdown', (e) => e.stopPropagation());
      plot.addEventListener('click', (e) => {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!type) constructPlot(plot);
        else toast(`${BUILDINGS[type]?.name || 'Building'} · already constructed`);
      }, true);
      plotsRoot.append(plot);
    }
    syncBuildUi();
  }

  bind('villageBuildBtn', () => buildMode ? exitBuildMode() : enterBuildMode());
  bind('villageBuildClose', () => exitBuildMode());
  tray?.addEventListener('pointerdown', (e) => e.stopPropagation());
  tray?.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-village-build]');
    if (!choice) return;
    e.preventDefault(); e.stopPropagation();
    selectBuilding(choice);
  });




  // V25.0 — KAEL LIVES: player-controlled Kael in the village.
  const kael = document.createElement('div');
  kael.id = 'villageKael';
  kael.className = 'kael-world-avatar facing-down';
  kael.innerHTML = '<i class="kael-world-sprite"></i><b class="kael-nameplate">KAEL</b>';
  world.append(kael);

  const controls = document.createElement('div');
  controls.id = 'kaelControls';
  controls.className = 'kael-controls';
  controls.innerHTML = '<div id="kaelStick" class="kael-stick"><i id="kaelStickKnob" class="kael-stick-knob"></i></div><button id="kaelInteract" class="kael-interact" type="button" aria-label="Interact">✦</button>';
  document.body.append(controls);
  const stick = controls.querySelector('#kaelStick');
  const knob = controls.querySelector('#kaelStickKnob');
  const interact = controls.querySelector('#kaelInteract');
  const input = window.KaelInput = window.KaelInput || { x: 0, y: 0, active: false };
  let stickPointer = null;
  function updateStick(clientX, clientY) {
    const r = stick.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
    const max = r.width * .31, d = Math.hypot(dx, dy) || 1;
    if (d > max) { dx *= max / d; dy *= max / d; }
    input.x = dx / max; input.y = dy / max; input.active = Math.hypot(input.x,input.y) > .08;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }
  function releaseStick(e) {
    if (stickPointer !== null && e?.pointerId !== undefined && e.pointerId !== stickPointer) return;
    stickPointer = null; input.x = 0; input.y = 0; input.active = false;
    knob.style.transform = 'translate(-50%,-50%)';
  }
  stick.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); stickPointer=e.pointerId; stick.setPointerCapture?.(e.pointerId); updateStick(e.clientX,e.clientY); }, {passive:false});
  stick.addEventListener('pointermove', e => { if(e.pointerId!==stickPointer)return; e.preventDefault(); updateStick(e.clientX,e.clientY); }, {passive:false});
  stick.addEventListener('pointerup', releaseStick); stick.addEventListener('pointercancel', releaseStick);
  controls.addEventListener('pointerdown', e => e.stopPropagation());

  const kaelState = { x: 800, y: 1015, speed: 165, face: 'down' };
  function nearestBuilding() {
    let best=null, bestD=155;
    document.querySelectorAll('.village-building').forEach(el=>{
      const x=parseFloat(getComputedStyle(el).left)||el.offsetLeft, y=parseFloat(getComputedStyle(el).top)||el.offsetTop;
      const d=Math.hypot(x-kaelState.x,y-kaelState.y);
      if(d<bestD){best=el;bestD=d;}
    });
    return best;
  }
  interact.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const b=nearestBuilding(); if(b)b.click(); else toast('Move closer to a building'); });
  let kaelLast=performance.now();
  function animateKael(now){
    const dt=Math.min(.04,(now-kaelLast)/1000); kaelLast=now;
    const battleVisible=document.body.classList.contains('battle-mode');
    const villageVisible=viewport.offsetParent!==null && !battleVisible;
    controls.style.display=(villageVisible||battleVisible)?'flex':'none';
    if(villageVisible && input.active){
      const len=Math.hypot(input.x,input.y)||1;
      kaelState.x=clamp(kaelState.x+input.x/len*kaelState.speed*dt,70,WORLD_W-70);
      kaelState.y=clamp(kaelState.y+input.y/len*kaelState.speed*dt,120,WORLD_H-80);
      const face=directionFromDelta(input.x,input.y); kaelState.face=face;
      kael.classList.remove('facing-down','facing-up','facing-left','facing-right'); kael.classList.add(`facing-${face}`,'walking');
      // Soft follow camera so Kael remains comfortably visible.
      const sx=camera.x+kaelState.x*camera.scale, sy=camera.y+kaelState.y*camera.scale;
      const padX=viewport.clientWidth*.26,padY=viewport.clientHeight*.25;
      if(sx<padX)camera.x+=(padX-sx)*.09; else if(sx>viewport.clientWidth-padX)camera.x-=(sx-(viewport.clientWidth-padX))*.09;
      if(sy<padY)camera.y+=(padY-sy)*.09; else if(sy>viewport.clientHeight-padY)camera.y-=(sy-(viewport.clientHeight-padY))*.09;
      render();
    }else kael.classList.remove('walking');
    kael.style.left=`${kaelState.x}px`;kael.style.top=`${kaelState.y}px`;kael.style.zIndex=String(80+Math.floor(kaelState.y/20));
    requestAnimationFrame(animateKael);
  }
  requestAnimationFrame(animateKael);

  // V24.0 — THE LIVING VILLAGE
  // Lightweight road-following citizens using the supplied 4x8 (32px frame) sheets.
  const citizenLayer = document.createElement('div');
  citizenLayer.id = 'villageCitizenLayer';
  citizenLayer.className = 'village-citizen-layer';
  citizenLayer.setAttribute('aria-hidden', 'true');
  world.append(citizenLayer);

  const CITIZEN_ASSETS = {
    child: {
      label: 'Village Child',
      sheet: 'assets/citizens/Blonde Kid Girl/blonde_kid_girl.png',
      shadow: 'assets/citizens/Blonde Kid Girl/blonde_kid_girl_shadow.png',
      speed: 43,
      route: [[795,930],[690,930],[570,900],[690,930],[800,1045],[910,930],[800,870]]
    },
    woman: {
      label: 'Village Resident',
      sheet: 'assets/citizens/Blonde Woman/blonde_woman.png',
      shadow: 'assets/citizens/Blonde Woman/blonde_woman_shadow.png',
      speed: 31,
      route: [[805,930],[800,760],[805,690],[800,930],[1050,930],[1160,1035],[1050,930]]
    },
    man: {
      label: 'Village Worker',
      sheet: 'assets/citizens/Blonde Man/blonde_man.png',
      shadow: 'assets/citizens/Blonde Man/blonde_man_shadow.png',
      speed: 34,
      route: [[800,930],[560,930],[475,750],[560,930],[800,930],[1110,930],[1160,1050]]
    },
    farmer: {
      label: 'Farmer',
      sheet: 'assets/citizens/Farmer/farmer.png',
      shadow: 'assets/citizens/Farmer/farmer_shadow.png',
      speed: 29,
      route: [[800,930],[800,1180],[650,1310],[520,1420],[650,1310],[800,1180],[800,930]]
    },
    knight: {
      label: 'Village Guard',
      sheet: 'assets/citizens/Knight/knight.png',
      shadow: 'assets/citizens/Knight/knight_shadow.png',
      speed: 36,
      route: [[800,910],[800,370],[800,650],[1190,760],[1390,760],[1190,760],[800,910],[410,760],[225,920],[410,760]]
    }
  };

  const citizens = [];
  const directionFromDelta = (dx, dy) => {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  };

  function createCitizen(id, def, stagger = 0) {
    const el = document.createElement('div');
    el.className = `living-citizen citizen-${id} facing-down is-idle`;
    el.title = def.label;
    el.innerHTML = '<i class="citizen-shadow-sprite"></i><i class="citizen-body-sprite"></i>';
    el.style.setProperty('--citizen-sheet', `url("${def.sheet}")`);
    el.style.setProperty('--citizen-shadow', `url("${def.shadow}")`);
    citizenLayer.append(el);
    const start = stagger % def.route.length;
    const p = def.route[start];
    const citizen = {
      id, def, el, routeIndex: start, x: p[0], y: p[1],
      wait: .7 + stagger * .28, moving: false
    };
    el.style.left = `${citizen.x}px`;
    el.style.top = `${citizen.y}px`;
    citizens.push(citizen);
    return citizen;
  }

  Object.entries(CITIZEN_ASSETS).forEach(([id, def], index) => createCitizen(id, def, index));

  let citizenLast = performance.now();
  function animateCitizens(now) {
    const dt = Math.min(.05, Math.max(0, (now - citizenLast) / 1000));
    citizenLast = now;
    const villageVisible = !document.hidden && viewport.offsetParent !== null;
    if (villageVisible) {
      for (const citizen of citizens) {
        if (citizen.wait > 0) {
          citizen.wait -= dt;
          if (citizen.moving) {
            citizen.moving = false;
            citizen.el.classList.add('is-idle');
          }
          continue;
        }
        const nextIndex = (citizen.routeIndex + 1) % citizen.def.route.length;
        const target = citizen.def.route[nextIndex];
        const dx = target[0] - citizen.x;
        const dy = target[1] - citizen.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 2) {
          citizen.x = target[0]; citizen.y = target[1]; citizen.routeIndex = nextIndex;
          citizen.wait = .7 + Math.random() * 2.4;
          citizen.moving = false;
          citizen.el.classList.add('is-idle');
        } else {
          const step = Math.min(distance, citizen.def.speed * dt);
          citizen.x += dx / distance * step;
          citizen.y += dy / distance * step;
          const direction = directionFromDelta(dx, dy);
          citizen.el.classList.remove('facing-down','facing-left','facing-right','facing-up','is-idle');
          citizen.el.classList.add(`facing-${direction}`);
          citizen.moving = true;
        }
        citizen.el.style.left = `${citizen.x.toFixed(2)}px`;
        citizen.el.style.top = `${citizen.y.toFixed(2)}px`;
        citizen.el.style.zIndex = String(18 + Math.floor(citizen.y / 45));
      }
    }
    requestAnimationFrame(animateCitizens);
  }
  requestAnimationFrame(animateCitizens);

  // The game bridge is created by game.js after this module. Render immediately,
  // then refresh economy and grant readiness once the rest of the game is loaded.
  renderPlots();
  window.addEventListener('load', () => { window.ROTKGameBridge?.refreshHome?.(); refreshVillageEconomy(true); }, { once: true });
  economyRefreshTimer = window.setInterval(() => refreshVillageEconomy(false), 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshVillageEconomy(true); });

  window.addEventListener('resize', render, { passive: true });
  requestAnimationFrame(() => center(false));
  window.ROTKVillageCamera = { center, zoomAt, render, camera };
});

```

## File: `src/Renderer/threeAtmosphere.js`

**Purpose:** Optional Three.js atmosphere overlay; safely exits when Three.js or its host element is unavailable.

**SHA-256:** `b428192cf0c8b59c1cdfb4f0d2855c7158ac9fafc6a5919d8351ca4db9392e1b`

```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';
const canvas=document.getElementById('threeBg');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(52,1,.1,100);camera.position.set(0,1.2,9);
scene.add(new THREE.HemisphereLight(0x8095c7,0x140910,.58));
const moon=new THREE.PointLight(0xbfd0ff,3.1,40);moon.position.set(4.5,5.8,2);scene.add(moon);
const warmA=new THREE.PointLight(0xff7a35,2.2,10),warmB=warmA.clone();warmA.position.set(-4,-1,2);warmB.position.set(4,-1,2);scene.add(warmA,warmB);
const moonDisc=new THREE.Mesh(new THREE.CircleGeometry(1.05,48),new THREE.MeshBasicMaterial({color:0xd9e1ff,transparent:true,opacity:.23}));moonDisc.position.set(4.4,4.1,-4);scene.add(moonDisc);
const starsGeo=new THREE.BufferGeometry(),count=420,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*22;pos[i*3+1]=(Math.random()-.2)*13;pos[i*3+2]=-2-Math.random()*10}starsGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb7c5ef,size:.026,transparent:true,opacity:.42,depthWrite:false}));scene.add(stars);
const mist=[];for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(15,2.2),new THREE.MeshBasicMaterial({color:i%2?0x53637d:0x73566f,transparent:true,opacity:.035+i*.008,depthWrite:false,side:THREE.DoubleSide}));m.position.set((i-2)*2,-1.8+i*.35,-1.5-i*.7);m.rotation.z=(i-2)*.025;scene.add(m);mist.push(m)}
const embGeo=new THREE.BufferGeometry(),ec=110,ep=new Float32Array(ec*3);for(let i=0;i<ec;i++){ep[i*3]=(Math.random()-.5)*13;ep[i*3+1]=-5+Math.random()*9;ep[i*3+2]=-Math.random()*5}embGeo.setAttribute('position',new THREE.BufferAttribute(ep,3));const embers=new THREE.Points(embGeo,new THREE.PointsMaterial({color:0xe88b50,size:.04,transparent:true,opacity:.32,depthWrite:false}));scene.add(embers);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let t=0;function loop(){t+=.016;stars.rotation.z=t*.003;stars.material.opacity=.34+.1*Math.sin(t*.28);moonDisc.material.opacity=.19+.05*Math.sin(t*.22);mist.forEach((m,i)=>{m.position.x=Math.sin(t*(.055+i*.008)+i)*2.2;m.material.opacity=.025+i*.007+.012*Math.sin(t*.3+i)});embers.position.y=(t*.18)%2;embers.rotation.z=-t*.008;warmA.intensity=1.7+Math.sin(t*9)*.35+Math.random()*.15;warmB.intensity=1.55+Math.sin(t*8.2+1)*.32+Math.random()*.15;moon.intensity=2.8+Math.sin(t*.18)*.25;renderer.render(scene,camera);requestAnimationFrame(loop)}loop();

```

## File: `src/Battle/game.js`

**Purpose:** Main game logic: saves, cards, deck, campaign, battle simulation, touch camera, UI rendering, progression, relics, kingdom, achievements, and navigation.

**SHA-256:** `b08284c11268cbd83aed1acab890ffb890f909938bed1fe1e51e83e1a5f0bd06`

```javascript

'use strict';
// V27.1 Battle UX: placement camera freedom, clearer tower selection, readable draft cards.
const $=s=>document.querySelector(s), canvas=$('#game'), ctx=canvas.getContext('2d');
const KAEL_SHEET=new Image();KAEL_SHEET.src='assets/characters/kael/kael.png';
const UI={menu:$('#menu'),deck:$('#deckScreen'),choices:$('#choices'),over:$('#gameOver'),hud:$('#hud'),hand:$('#hand'),toast:$('#toast'),tutorial:$('#tutorial')};
let DPR=1,W=0,H=0,scale=1,ox=0,oy=0;
const CAMERA_LIMITS={minZoom:.72,maxZoom:2.65,margin:24};
const GRID={cols:12,rows:9,tile:64};
const CATHEDRAL={gateX:5.5,gateY:3.05,drawX:5.5*64-61,drawY:-18};
const CARD_POOL=[
 {id:'whip',name:'Whip Tower',type:'tower',icon:'⛓️',cost:34,desc:'Fast chained lashes. Strong general defense.',rarity:'Common',range:2.3,damage:14,rate:.7,color:'#d8c3a5'},
 {id:'holy',name:'Holy Water Infusion',type:'support',icon:'🔥',cost:42,desc:'Attach to a defense tower: adds burn and splash damage.',rarity:'Rare',range:2.1,damage:10,rate:1.05,color:'#ff8a43',aoe:1.0,burn:5},
 {id:'dagger',name:'Dagger Tower',type:'tower',icon:'🗡️',cost:27,desc:'Rapid silver projectile volleys.',rarity:'Common',range:2.6,damage:8,rate:.32,color:'#d9ecff'},
 {id:'axe',name:'Axe Tower',type:'tower',icon:'🪓',cost:48,desc:'Heavy arcing strikes through armor.',rarity:'Rare',range:2.8,damage:26,rate:1.25,color:'#b8a0a0',pierce:2},
 {id:'cross',name:'Cross Tower',type:'tower',icon:'✝️',cost:56,desc:'Returning holy blades hit twice.',rarity:'Epic',range:3.0,damage:17,rate:.9,color:'#ffe18b',returning:true},
 {id:'clock',name:'Clock Tower',type:'tower',icon:'🕰️',cost:62,desc:'Slows nearby monsters in warped time.',rarity:'Epic',range:2.3,damage:4,rate:1.4,color:'#b98cff',slow:.55},
 {id:'bone',name:'Bone Pillar',type:'tower',icon:'🦴',cost:48,desc:'Twin fireballs punish clustered enemies.',rarity:'Rare',range:2.4,damage:23,rate:.8,color:'#f1c06b'},
 {id:'familiar',name:'Familiar Roost',type:'tower',icon:'🦇',cost:58,desc:'Summons bats that seek distant targets.',rarity:'Epic',range:3.1,damage:18,rate:.55,color:'#9f7bd2'},
 {id:'silver',name:'Silver Cannon',type:'tower',icon:'💥',cost:65,desc:'Slow explosive shot with enormous impact.',rarity:'Legendary',range:3.3,damage:60,rate:1.8,color:'#f5f2dc',aoe:1.1},
 {id:'rosary',name:'Rosary Shrine',type:'tower',icon:'📿',cost:52,desc:'Sacred bolts weaken the front line.',rarity:'Rare',range:2.4,damage:12,rate:1.05,color:'#f3d59b',slow:.82},
 {id:'garlic',name:'Garlic Tower',type:'tower',icon:'🧄',cost:46,desc:'A pungent ward that damages and slows every undead creature inside its aura.',rarity:'Rare',range:2.05,damage:7,rate:.72,color:'#d9efad',slow:.78,aoe:.72},
 {id:'scripture',name:'Tower of the Living Word',type:'tower',icon:'📖',cost:60,essenceCost:18,desc:'Orbiting Bibles strike every undead creature that enters their sacred field. Each tower level adds another independently attacking Bible.',rarity:'Legendary',range:2.75,damage:13,rate:.82,color:'#ffe58a',holy:true},
 {id:'waterSkill',name:'Holy Water Barrage',type:'skill',icon:'💥',cost:25,desc:'Burns enemies in a targeted area.',rarity:'Rare',cool:9},
 {id:'crossSkill',name:'Cross Storm',type:'skill',icon:'✨',cost:34,desc:'Holy crosses sweep the entire road.',rarity:'Epic',cool:14},
 {id:'freeze',name:'Chrono Sigil',type:'support',icon:'⏱️',cost:30,desc:'Attach to a defense tower: attacks slow enemies.',rarity:'Epic',cool:15},
 {id:'summon',name:'Eclipse Rally',type:'skill',icon:'⚔️',cost:40,desc:'Hero gains frenzy and heals the village.',rarity:'Legendary',cool:18},
 {id:'axeRain',name:'Axe Rain',type:'skill',icon:'🌪️',cost:36,desc:'Heavy axes strike every enemy.',rarity:'Rare',cool:12},
 {id:'grandCross',name:'Grand Cross',type:'skill',icon:'☦️',cost:55,desc:'A devastating holy blast across the map.',rarity:'Legendary',cool:20},
 {id:'guardian',name:'Guardian Ward',type:'support',icon:'👼',cost:45,desc:'Attach to a defense tower: grants protective healing every wave.',rarity:'Epic',cool:16},
 {id:'soulPact',name:'Relic Edge',type:'hero',icon:'🗡️',cost:0,desc:'Hero damage +25% for this run.',rarity:'Rare',heroStat:'damage'},
 {id:'sharpen',name:'Quickened Reflexes',type:'hero',icon:'⚡',cost:0,desc:'Hero attacks 18% faster for this run.',rarity:'Epic',heroStat:'rate'},
 {id:'fortify',name:"Hunter’s Reach",type:'hero',icon:'⛓️',cost:0,desc:'Hero attack range +20% for this run.',rarity:'Rare',heroStat:'range'},
 {id:'moonBlessing',name:'Eclipse Consecration',type:'hero',icon:'✨',cost:0,desc:'Hero attacks become holy and can critically strike.',rarity:'Legendary',heroStat:'holy'}
];

const ROAD_PIECES=[
 {id:'roadSingle',name:'Single Road Tile',type:'roadpiece',shape:'single',icon:'⬛',desc:'Place one road block from the road endpoint.',system:true},
 {id:'roadL',name:'L Road Piece',type:'roadpiece',shape:'L',icon:'◱',desc:'A three-block L-shaped road piece. Rotate before placing.',system:true},
 {id:'roadJ',name:'Mirrored L Road',type:'roadpiece',shape:'J',icon:'◲',desc:'A mirrored three-block L road. Rotate before placing.',system:true},
 {id:'roadS',name:'S Road Piece',type:'roadpiece',shape:'S',icon:'〽️',desc:'A three-block stepped road piece. Rotate before placing.',system:true}
];
const ROAD_SYSTEM={id:'roadSystem',name:'Road System',type:'roadpiece',icon:'🛣️',desc:'The Eclipse reveals a single, L, mirrored-L, or S road piece.',system:true,hiddenSystem:true};

const MAPS=[
 {id:'cemetery',name:'Forgotten Cemetery',ground:['#17121b','#09080d'],accent:'#7da6a1',sky:'#161020'},
 {id:'forest',name:'Moonlit Forest',ground:['#101a19','#070b0c'],accent:'#70a596',sky:'#101827'},
 {id:'village',name:'Ruined Village',ground:['#211713','#0c0908'],accent:'#c1774e',sky:'#26131a'},
 {id:'cathedral',name:'Frozen Cathedral',ground:['#17202b','#090d14'],accent:'#9ac7df',sky:'#17233b'},
 {id:'marsh',name:'Crimson Marsh',ground:['#26151d','#0e090c'],accent:'#c45c72',sky:'#27101d'},
 {id:'walls',name:'Blackstone Walls',ground:['#1c1d22','#090a0d'],accent:'#9da2aa',sky:'#151725'},
 {id:'temple',name:'Moon Temple',ground:['#141a2b','#070a12'],accent:'#8ca7e8',sky:'#101936'},
 {id:'castle',name:'Vampire Castle',ground:['#24121b','#0a0609'],accent:'#d0526c',sky:'#260b18'},
 {id:'harbor',name:'The Drowned Harbor',ground:['#102027','#060b0f'],accent:'#5ea8b9',sky:'#101b28'},
 {id:'monastery',name:'The Ashen Monastery',ground:['#211b19','#0d0908'],accent:'#c77f55',sky:'#28151a'},
 {id:'underkingdom',name:'The Underkingdom',ground:['#17131f','#08060b'],accent:'#9a72cf',sky:'#170f26'},
 {id:'throne',name:'The Eclipse Throne',ground:['#251018','#090407'],accent:'#e05b72',sky:'#2b0715'}
];

const WEATHERS=[
 {id:'clear',name:'Clear Night',desc:'No combat modifier.'},
 {id:'rain',name:'Thunder Rain',desc:'Fire damage -20%; lightning and holy damage +18%.'},
 {id:'fog',name:'Grave Fog',desc:'Tower range -12%; enemy rewards +20%.'},
 {id:'blood',name:'Blood Moon',desc:'Enemies +18% HP; tower XP +40%; rewards +30%.'}
];
const RELICS=[
 {id:'fang',name:'Nightfang Sigil',icon:'🦇',desc:'Hero attacks 18% faster.'},
 {id:'candle',name:'Eclipse Candle',icon:'🕯️',desc:'Holy towers gain +20% range and damage.'},
 {id:'chalice',name:'Crimson Reliquary',icon:'🏆',desc:'Restore 2 gate HP after every wave.'},
 {id:'ring',name:'Ring of the Eclipse',icon:'💍',desc:'Every fifth kill explodes around the victim.'},
 {id:'thorn',name:'Thornheart Crown',icon:'👑',desc:'Towers begin each hunt with 2 bonus XP.'},
 {id:'banner',name:'Banner of Blackstone',icon:'🚩',desc:'The gate begins with +5 health.'},
 {id:'moon',name:'Moon Oracle Lens',icon:'🔭',desc:'Hero critical chance +12%.'},
 {id:'bloodseal',name:'Royal Blood Seal',icon:'🩸',desc:'All damage +12%, but enemies gain 8% health.'},
 {id:'tidebell',name:'Bell of the Drowned',icon:'🔔',desc:'Every tenth kill briefly slows all enemies.'},
 {id:'ashcenser',name:'Ashen Censer',icon:'🏺',desc:'Burn effects last 35% longer.'},
 {id:'underkey',name:'Key of the Underking',icon:'🗝️',desc:'Elite enemies award 30% more Essence.'},
 {id:'eclipsecrown',name:'Crown of Final Night',icon:'♛',desc:'Hero and towers deal +15% damage on boss waves.'}
];
const CHAPTERS=[
 {id:'cemetery',number:1,name:'The Forgotten Cemetery',map:'cemetery',waves:8,boss:{id:'warden',name:'Eclipse Warden',hp:500,speed:.28,reward:140,power:'Raises three Bone Soldiers every five seconds.'},relic:'fang',lore:'The first royal road ends beneath graves that refuse to sleep.'},
 {id:'forest',number:2,name:'The Moonlit Forest',map:'forest',waves:10,boss:{id:'thornbeast',name:'The Thornbound Beast',hp:680,speed:.34,reward:175,power:'Moves faster and releases Night Wolves.'},relic:'candle',lore:'A black forest has swallowed the northern watch road.'},
 {id:'village',number:3,name:'The Ruined Village',map:'village',waves:12,boss:{id:'bloodcount',name:'The Blood Count',hp:880,speed:.30,reward:220,power:'Summons Vampire Spawn and drains the gate on arrival.'},relic:'chalice',lore:'The abandoned village still answers to its dead lord.'},
 {id:'cathedral',number:4,name:'The Frozen Cathedral',map:'cathedral',waves:14,boss:{id:'icebishop',name:'The Frozen Bishop',hp:1120,speed:.25,reward:280,power:'Freezes defenses with waves of cathedral frost.'},relic:'ring',lore:'At the kingdom’s edge, the last cathedral guards the Eclipse.'},
 {id:'marsh',number:5,name:'The Crimson Marsh',map:'marsh',waves:15,boss:{id:'bogqueen',name:'The Bog Queen',hp:1380,speed:.26,reward:330,power:'Calls drowned servants from the blood reeds.'},relic:'thorn',lore:'A drowned royal road winds through reeds stained crimson.'},
 {id:'walls',number:6,name:'The Blackstone Siege',map:'walls',waves:16,boss:{id:'siegeknight',name:'The Hollow Castellan',hp:1680,speed:.22,reward:390,power:'Marches beneath armor and summons shield guards.'},relic:'banner',lore:'The walls that once protected the kingdom now imprison it.'},
 {id:'temple',number:7,name:'The Moon Temple',map:'temple',waves:17,boss:{id:'moonoracle',name:'The Fallen Oracle',hp:1960,speed:.28,reward:460,power:'Bends time and releases spectral disciples.'},relic:'moon',lore:'The stars have vanished above the oldest sanctuary.'},
 {id:'castle',number:8,name:'The Vampire Castle',map:'castle',waves:18,boss:{id:'vampireking',name:'The Blood King',hp:2450,speed:.30,reward:600,power:'Commands the court of night and drains the final gate.'},relic:'bloodseal',lore:'Beyond the last road waits the throne that began the Eclipse.'},
 {id:'harbor',number:9,name:'The Drowned Harbor',map:'harbor',waves:19,boss:{id:'bellkeeper',name:'The Bell Keeper',hp:2850,speed:.25,reward:680,power:'Rings the drowned bell and calls sailors from beneath the tide.'},relic:'tidebell',lore:'Black ships return to a harbor that sank before the Eclipse.'},
 {id:'monastery',number:10,name:'The Ashen Monastery',map:'monastery',waves:20,boss:{id:'ashabbot',name:'The Ashen Abbot',hp:3250,speed:.27,reward:760,power:'Blankets the road in cinders and awakens burning penitents.'},relic:'ashcenser',lore:'The bells are silent, but prayers still burn behind sealed doors.'},
 {id:'underkingdom',number:11,name:'The Underkingdom',map:'underkingdom',waves:21,boss:{id:'underking',name:'The Hollow Underking',hp:3750,speed:.23,reward:860,power:'Summons armored dead and bends the road beneath the earth.'},relic:'underkey',lore:'Below the royal roads lies a kingdom older than the living crown.'},
 {id:'throne',number:12,name:'The Eclipse Throne',map:'throne',waves:22,boss:{id:'eclipselord',name:'The Lord of Final Night',hp:4450,speed:.29,reward:1000,power:'Changes phases, summons elites, and darkens the battlefield.'},relic:'eclipsecrown',lore:'At the end of every road, the Eclipse waits upon its throne.'}
];
const RARITIES=[
 {id:'common',name:'Common',mult:1,color:'#8c8c95'},
 {id:'good',name:'Good',mult:1.04,color:'#58ba62'},
 {id:'rare',name:'Rare',mult:1.09,color:'#4f87e8'},
 {id:'epic',name:'Epic',mult:1.15,color:'#9b5de5'},
 {id:'epicplus',name:'Epic+',mult:1.22,color:'#b06ae8'},
 {id:'legendary',name:'Legendary',mult:1.30,color:'#e0b54f'},
 {id:'legendaryplus',name:'Legendary+',mult:1.39,color:'#e0b54f'},
 {id:'mythic',name:'Mythic Rare',mult:1.50,color:'#d73138'}
];
const HEROES=[
 {id:'warden',name:'Ashen Warden',icon:'⚔️',desc:'Balanced hunter. +10% tower damage.',bonus:{tower:1.10}},
 {id:'alchemist',name:'Eclipse Alchemist',icon:'⚗️',desc:'Support effects are 30% stronger.',bonus:{support:1.30}},
 {id:'engineer',name:'Grave Engineer',icon:'⚙️',desc:'Placed defenses begin with bonus XP.',bonus:{xp:2}},
 {id:'guardian',name:'Last Guardian',icon:'🛡️',desc:'The keep begins with +8 health.',bonus:{hp:8}},
 {id:'arcanist',name:'Veil Arcanist',icon:'🔮',desc:'Road pity activates one draft sooner.',bonus:{roadPity:1}},
 {id:'beastmaster',name:'Night Beastmaster',icon:'🐺',desc:'Familiar defenses deal +35% damage.',bonus:{familiar:1.35}}
];
const KEEP_UPGRADES=[
 {id:'walls',name:'Reinforced Keep',desc:'+1 starting gate health per rank.',max:10,cost:20},
 {id:'souls',name:'Soul Reserve',desc:'+6 starting souls per rank.',max:10,cost:18},
 {id:'hunter',name:'Hunter Training',desc:'+3% permanent hero damage per rank.',max:10,cost:25},
 {id:'fortune',name:'Relic Fortune',desc:'+0.15% card-drop chance per rank.',max:10,cost:30}
];
const KINGDOM_BUILDINGS=[
 {id:'forge',name:'Royal Forge',icon:'⚒️',desc:'Improves all tower damage by 2% per level.',max:5,cost:35},
 {id:'chapel',name:'Moon Chapel',icon:'⛪',desc:'Adds 1 starting gate health per level.',max:5,cost:30},
 {id:'tavern',name:'Hunter Tavern',icon:'🍺',desc:'Adds 5 starting souls per level.',max:5,cost:28},
 {id:'library',name:'Eclipse Library',icon:'📚',desc:'Heroes gain 3% damage per level.',max:5,cost:40},
 {id:'market',name:'Night Market',icon:'🏪',desc:'Increases enemy rewards by 3% per level.',max:5,cost:32},
 {id:'museum',name:'Relic Museum',icon:'🏛️',desc:'Relic effects gain 4% strength per level.',max:5,cost:45}
];
const ACHIEVEMENTS=[
 {id:'firstblood',name:'First Blood',desc:'Defeat 100 enemies.',stat:'totalKills',goal:100,reward:20},
 {id:'roadkeeper',name:'Keeper of Roads',desc:'Reach wave 15.',stat:'highestWave',goal:15,reward:25},
 {id:'collector',name:'Relic Collector',desc:'Discover 12 cards.',custom:()=>CARD_POOL.filter(c=>inv(c.id).copies>0).length,goal:12,reward:30},
 {id:'guardianfall',name:'Guardian Fall',desc:'Defeat 4 bosses.',stat:'bosses',goal:4,reward:35},
 {id:'kingmaker',name:'Kingmaker',desc:'Complete 5 campaign chapters.',custom:()=>save.campaign.completed.length,goal:5,reward:50},
 {id:'forgefire',name:'Forgefire',desc:'Complete 5 card fusions.',stat:'fusions',goal:5,reward:40}
];
const DEFAULT_DECK=['whip','holy','dagger','waterSkill','freeze','crossSkill'];
const ESSENCE_COSTS={dagger:5,whip:7,holy:8,freeze:8,guardian:9,garlic:7,axe:10,cross:11,clock:11,bone:10,familiar:12,rosary:10,silver:15,scripture:18,waterSkill:8,crossSkill:11,summon:12,axeRain:10,grandCross:16};
const HERO_GROUND_DEFENSES=[
 {id:'spikeTrap',name:'Road Spikes',type:'trap',icon:'🔺',rarity:'Good',essenceCost:4,desc:'A road trap that repeatedly wounds enemies crossing it.',damage:11,rate:.55,color:'#d6c2a3'},
 {id:'oilTrap',name:'Grave Oil',type:'trap',icon:'🛢️',rarity:'Good',essenceCost:5,desc:'A slick road trap that slows enemies and occasionally ignites them.',damage:3,rate:.75,slow:.58,color:'#82745a'}
];
function essenceCost(c){return c?.essenceCost??ESSENCE_COSTS[c?.id]??Math.max(4,Math.round((c?.cost||30)/5));}
const CHAPTER_CARD_UNLOCKS={
 cemetery:['axe','bone'],
 forest:['rosary','guardian'],
 village:['cross','axeRain'],
 cathedral:['clock','soulPact'],
 marsh:['familiar','sharpen'],
 walls:['silver','fortify'],
 temple:['summon','moonBlessing'],
 castle:['grandCross'],
 harbor:[],monastery:[],underkingdom:[],throne:[]
};
const unlockChapterForCard=id=>CHAPTERS.find(ch=>(CHAPTER_CARD_UNLOCKS[ch.id]||[]).includes(id));
const progressionUnlockedIds=completed=>{const ids=new Set(DEFAULT_DECK);for(const chapterId of completed||[])for(const id of CHAPTER_CARD_UNLOCKS[chapterId]||[])ids.add(id);return [...ids]};
const STORAGE={
  get(key){try{return window.localStorage?.getItem(key)??null}catch(err){console.warn('Storage unavailable; using session memory.',err);return null}},
  set(key,value){try{window.localStorage?.setItem(key,value);return true}catch(err){console.warn('Could not save progress.',err);return false}},
  remove(key){try{window.localStorage?.removeItem(key)}catch(err){console.warn('Could not clear progress.',err)}}
};
let loadedSave=null;
try{loadedSave=JSON.parse(STORAGE.get('relicsEclipseSave')||STORAGE.get('gateRunnerSave')||'null')}catch(err){console.warn('Invalid save ignored.',err)}
function defaultInventory(){return Object.fromEntries(CARD_POOL.map((c,i)=>[c.id,{copies:DEFAULT_DECK.includes(c.id)?2:0,rarity:'common',level:1,recent:DEFAULT_DECK.includes(c.id)&&i<3,lastFound:0}]));}
let save=loadedSave||{};
const previousSaveVersion=Number(save.saveVersion)||0;
save.saveVersion=10;save.bestWave=save.bestWave||0;save.essence=save.essence||0;save.tutorialSeen=!!save.tutorialSeen;
save.inventory={...defaultInventory(),...(save.inventory||{})};for(const oldRoad of ['pathS','pathL','bloodTile','ironTile','cryptTile'])delete save.inventory[oldRoad];save.selectedHero=save.selectedHero||'warden';save.heroLevels=save.heroLevels||Object.fromEntries(HEROES.map(h=>[h.id,1]));save.keepUpgrades=save.keepUpgrades||{};save.runHistory=save.runHistory||[];save.settings={audio:true,music:true,sfx:true,musicVolume:.46,sfxVolume:.72,ambienceVolume:.34,...(save.settings||{})};save.materials={eclipseShards:0,bloodEssence:save.essence||0,ancientRelics:0,hunterMedallions:0,forgeEmbers:0,...(save.materials||{})};save.stats={runs:0,wins:0,totalKills:0,totalCards:0,fusions:0,bosses:0,highestWave:save.bestWave||0,...(save.stats||{})};save.discoveredEnemies=save.discoveredEnemies||{};save.discoveredMaps=save.discoveredMaps||{};save.campaign=save.campaign&&typeof save.campaign==='object'?save.campaign:{unlocked:1,completed:[],selected:'cemetery'};save.campaign.unlocked=Math.max(1,Math.min(CHAPTERS.length,Number(save.campaign.unlocked)||1));save.campaign.completed=Array.isArray(save.campaign.completed)?save.campaign.completed.filter(id=>CHAPTERS.some(c=>c.id===id)):[];save.campaign.selected=CHAPTERS.some(c=>c.id===save.campaign.selected)?save.campaign.selected:'cemetery';save.campaign.stars=save.campaign.stars&&typeof save.campaign.stars==='object'?save.campaign.stars:{};save.unlockedRelics=Array.isArray(save.unlockedRelics)?save.unlockedRelics:[];save.equippedRelic=save.equippedRelic||null;save.kingdom=save.kingdom||{buildings:{},renown:0};save.achievements=save.achievements&&typeof save.achievements==='object'?save.achievements:{claimed:[]};save.achievements.claimed=Array.isArray(save.achievements.claimed)?save.achievements.claimed:[];save.unlockedRelics=save.unlockedRelics.filter(id=>RELICS.some(r=>r.id===id));if(save.equippedRelic&&!save.unlockedRelics.includes(save.equippedRelic))save.equippedRelic=null;
// Repair older saves that advanced the campaign counter without recording completed chapter IDs.
for(const ch of CHAPTERS){if(ch.number<save.campaign.unlocked&&!save.campaign.completed.includes(ch.id))save.campaign.completed.push(ch.id)}
const progressionIds=progressionUnlockedIds(save.campaign.completed);
// Never erase legitimate unlocks from an existing save. Merge them with progression rewards.
save.unlocked=[...new Set([...(Array.isArray(save.unlocked)?save.unlocked:[]),...progressionIds])].filter(id=>CARD_POOL.some(c=>c.id===id));
// Milestone 9D: starter cards are always real, visible, and usable.
for(const id of DEFAULT_DECK){if(!save.unlocked.includes(id))save.unlocked.push(id);const item=save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if(item.copies<1)item.copies=2;}
if(previousSaveVersion<6){save.deck=[...DEFAULT_DECK];}
save.deck=Array.isArray(save.deck)?save.deck.filter(id=>save.unlocked.includes(id)&&CARD_POOL.some(c=>c.id===id)).slice(0,6):[...DEFAULT_DECK];
while(save.deck.length<6){const id=[...DEFAULT_DECK,...save.unlocked].find(x=>CARD_POOL.some(c=>c.id===x)&&((save.inventory[x]||{}).copies||0)>0&&!save.deck.includes(x));if(!id)break;save.deck.push(id)}
for(const id of save.unlocked){const item=save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if(item.copies<1)item.copies=DEFAULT_DECK.includes(id)?2:1;}
save.favorites=Array.isArray(save.favorites)?save.favorites.filter(id=>CARD_POOL.some(c=>c.id===id)):[];
if(!save.unlocked.includes('garlic'))save.unlocked.push('garlic');const garlicItem=save.inventory.garlic||(save.inventory.garlic={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if(garlicItem.copies<2)garlicItem.copies=2;
// V15.3 Scripture Tower preview: grant the new signature defense to every existing kingdom.
if(!save.unlocked.includes('scripture'))save.unlocked.push('scripture');const scriptureItem=save.inventory.scripture||(save.inventory.scripture={copies:0,rarity:'legendary',level:1,recent:true,lastFound:Date.now()});if(scriptureItem.copies<2)scriptureItem.copies=2;if(scriptureItem.rarity==='common')scriptureItem.rarity='legendary';
save.ui=save.ui&&typeof save.ui==='object'?save.ui:{};save.ui.cardFilter=['all','tower','support','skill','hero'].includes(save.ui.cardFilter)?save.ui.cardFilter:'all';save.ui.cardSort=['type','rarity','strength','level','name','recent'].includes(save.ui.cardSort)?save.ui.cardSort:'type';
save.heroEquipment=save.heroEquipment&&typeof save.heroEquipment==='object'?save.heroEquipment:{};save.groundDefenseSlots=Array.isArray(save.groundDefenseSlots)?save.groundDefenseSlots.filter(id=>HERO_GROUND_DEFENSES.some(c=>c.id===id)).slice(0,2):HERO_GROUND_DEFENSES.slice(0,2).map(c=>c.id);while(save.groundDefenseSlots.length<Math.min(2,HERO_GROUND_DEFENSES.length)){const next=HERO_GROUND_DEFENSES.find(c=>!save.groundDefenseSlots.includes(c.id));if(!next)break;save.groundDefenseSlots.push(next.id)};
const card=id=>CARD_POOL.find(c=>c.id===id);
const rarityIndex=id=>Math.max(0,RARITIES.findIndex(r=>r.id===id));
const rarityDef=id=>RARITIES[rarityIndex(id)]||RARITIES[0];
const inv=id=>save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,recent:false,lastFound:0});
const cardPower=id=>rarityDef(inv(id).rarity).mult*(1+(Math.max(1,inv(id).level)-1)*.025);

let G;

// V26.4: stable public battle-control API with explicit UI-state synchronization. This is installed near the top of the
// module so the native HTML control bridge remains available even if a later,
// unrelated menu feature throws an exception.
window.VillageBattleAPI={
  center(){
    if(!G)return {ok:false,reason:'no-battle'};
    recenterCamera();
    return {ok:true};
  },
  speed(){
    if(!G)return {ok:false,reason:'no-battle'};
    G.speed=G.speed===1?2:G.speed===2?3:1;
    showToast('Battle speed ×'+G.speed);
    return {ok:true,speed:G.speed};
  },
  pause(){
    if(!G)return {ok:false,reason:'no-battle'};
    G.paused=!G.paused;
    showToast(G.paused?'Battle paused':'Battle resumed');
    return {ok:true,paused:G.paused};
  },
  menu(){
    returnToMainMenu();
    return {ok:true};
  },
  retry(){
    const mode=G?.mode||'chapter';
    const chapter=G?.chapter?.id||save.campaign.selected;
    UI.over.classList.add('hidden');
    freshGame(mode,chapter);
    return {ok:true};
  },
  state(){return G?{active:true,speed:G.speed,paused:G.paused,state:G.state}:{active:false};}
};
function resize(){
 const r=canvas.getBoundingClientRect();
 DPR=Math.min(devicePixelRatio||1,2);
 // Use the canvas's real CSS display size rather than window.innerWidth/innerHeight.
 // On iPad Safari the visual viewport and layout viewport can differ, which caused
 // the rendered grid and touch coordinates to use different coordinate spaces.
 W=Math.max(1,r.width||visualViewport?.width||innerWidth);
 H=Math.max(1,r.height||visualViewport?.height||innerHeight);
 canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
 ctx.setTransform(DPR,0,0,DPR,0,0);
 // V25.8: battlefield uses cover scaling so the map fills the entire iPad
 // viewport. Players can still pinch outward to see more or pinch inward for detail.
 const worldW=GRID.cols*GRID.tile,worldH=GRID.rows*GRID.tile;
 scale=Math.max(W/worldW,H/worldH);
 ox=(W-worldW*scale)/2;
 oy=(H-worldH*scale)/2;
}
addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
const key=(x,y)=>`${x},${y}`, inside=(x,y)=>x>=0&&y>=0&&x<GRID.cols&&y<GRID.rows;
function generateStartingRoad(){
 // The cathedral is fixed at the top-center. The first three road cells form a
 // guaranteed straight courtyard approach directly beneath the front doors.
 const path=[{x:5,y:3},{x:5,y:4},{x:5,y:5}],used=new Set(['5,3','5,4','5,5']);
 const target=8+Math.floor(Math.random()*3);let cur=path.at(-1),last={x:0,y:1};
 const touchesOlderRoad=(n)=>path.slice(0,-1).some(p=>Math.abs(p.x-n.x)+Math.abs(p.y-n.y)===1);
 while(path.length<target){
  const candidates=[{x:0,y:1},{x:1,y:0},{x:-1,y:0},{x:0,y:-1}]
   .filter(d=>!(d.x===-last.x&&d.y===-last.y))
   .map(d=>({x:cur.x+d.x,y:cur.y+d.y,d}))
   .filter(n=>n.x>=1&&n.x<GRID.cols-1&&n.y>=3&&n.y<GRID.rows-1&&!used.has(key(n.x,n.y))&&!touchesOlderRoad(n));
  if(!candidates.length)break;
  candidates.sort((a,b)=>((b.y-a.y)*2)+(Math.abs(a.x-5)-Math.abs(b.x-5))*.2+(Math.random()-.5));
  const pick=candidates[0];
  cur={x:pick.x,y:pick.y};last=pick.d;path.push(cur);used.add(key(cur.x,cur.y));
 }
 return path;
}
function freshGame(mode='chapter',chapterId=null){
 AUDIO.unlock();AUDIO.setState('battle',true);
 const path=generateStartingRoad();
 const weather=WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
 const chapter=mode==='chapter'?(CHAPTERS.find(c=>c.id===(chapterId||save.campaign.selected))||CHAPTERS[0]):null;
 const map=chapter?(MAPS.find(m=>m.id===chapter.map)||MAPS[0]):MAPS[Math.floor(Math.random()*MAPS.length)];save.discoveredMaps[map.id]=true;
 const heroDef=HEROES.find(h=>h.id===save.selectedHero)||HEROES[0];const up=save.keepUpgrades,kb=save.kingdom.buildings||{};
 G={mode,map,state:'play',paused:true,speed:1,time:0,last:performance.now(),hp:20+(heroDef.bonus.hp||0)+(up.walls||0)+(kb.chapel||0),maxHp:20+(heroDef.bonus.hp||0)+(up.walls||0)+(kb.chapel||0),gold:105+(up.souls||0)*6+(kb.tavern||0)*5,essence:40,maxEssence:40,pendingEssence:0,wave:1,kills:0,xp:0,xpNeed:10,level:1,path,towers:[],traps:[],enemies:[],shots:[],particles:[],floaters:[],selected:null,selectedTower:null,hand:[...save.deck.map(id=>({...card(id),coolLeft:0})),...HERO_GROUND_DEFENSES.map(c=>({...c,coolLeft:0}))],drawWeights:{},pickCounts:{},spawnLeft:5,spawnTimer:0,waveDelay:2,chapterWaves:mode==='endless'?999:chapter.waves,chapter,chapterCleared:false,hero:{x:4.25,y:3.35,facing:'down',walking:false,anim:0,hp:100,max:100,rate:.48,t:0,damage:22*(1+(up.hunter||0)*.03+(kb.library||0)*.03),range:2.5,holy:false,crit:.05,frenzy:0,def:heroDef},shake:0,flash:0,boss:false,globalDamage:1+(kb.forge||0)*.02,pendingWave:true,pendingCard:null,placementRotation:0,hoverTile:null,weather,relic:RELICS.find(r=>r.id===save.equippedRelic)||null,killChain:0,miniBossDefeated:false,openingDraft:false,activeDraftCard:null,runDrops:[],roadMisses:0,lastDropAt:0,bossIntroPlayed:false,ambient:Array.from({length:42},(_,i)=>({x:Math.random()*GRID.cols,y:Math.random()*GRID.rows,v:.08+Math.random()*.18,phase:Math.random()*6.28,kind:i%3})),camera:{zoom:1,panX:0,panY:0},cameraPulse:0,queuedSkills:[],comboTimer:0,comboBest:0,weatherFlash:0};
 $('#weatherTxt').textContent=map.name+' · '+weather.name;$('#relicTxt').textContent=G.relic?.name||'None';applyEquippedRelic();showToast((chapter?chapter.name:map.name)+' — '+weather.name+': '+weather.desc);
 [UI.menu,UI.deck,$('#campaignScreen'),$('#relicVaultScreen'),$('#heroesScreen'),$('#upgradesScreen'),$('#forgeScreen'),$('#codexScreen'),$('#profileScreen'),$('#cardInspectScreen'),$('#kingdomScreen'),$('#achievementsScreen'),$('#moreScreen')].forEach(s=>s?.classList.add('hidden'));UI.over.classList.add('hidden');UI.choices.classList.add('hidden');UI.hud.classList.remove('hidden');setBattleMode(true);UI.tutorial.classList.add('hidden');renderHand();
 setTimeout(()=>beginLivingBattle(),450);
}
function applyEquippedRelic(){if(!G?.relic)return;const r=G.relic;if(r.id==='fang')G.hero.rate*=.82;if(r.id==='candle')G.globalDamage*=1.08;if(r.id==='chalice')G.hp=Math.min(G.maxHp,G.hp+2);if(r.id==='ring')G.hero.crit+=.08;if(r.id==='thorn')G.hero.def.bonus.xp=(G.hero.def.bonus.xp||0)+2;if(r.id==='banner'){G.hp+=5;G.maxHp+=5}if(r.id==='moon')G.hero.crit+=.12;if(r.id==='bloodseal')G.globalDamage*=1.12}

function showBattleCinematic(kicker,title,subtitle,duration=2350){
 const el=$('#battleCinematic');if(!el)return;
 $('#cinematicKicker').textContent=kicker;$('#cinematicTitle').textContent=title;$('#cinematicSubtitle').textContent=subtitle||'';
 el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;clearTimeout(showBattleCinematic.t);showBattleCinematic.t=setTimeout(()=>el.classList.add('hidden'),duration);
}
function beginLivingBattle(){
 if(!G)return;G.paused=true;showBattleCinematic(`CHAPTER ${G.chapter?.number||'∞'}`,G.map.name.toUpperCase(),G.weather.name+' · The last road must hold.');
 setTimeout(()=>{if(!G||G.state!=='play')return;G.pendingWave=false;G.spawnLeft=5;G.spawnTimer=.35;showWaveBanner(1,'THE HUNT BEGINS');showToast('The Essence Vial is full — draft your active card');triggerEssenceDraft(true);},2050);
}
function beginBossCinematic(enemy){
 AUDIO.setState('boss',true);AUDIO.sting('boss');
 if(!G||G.bossIntroPlayed)return;G.bossIntroPlayed=true;G.paused=true;G.shake=16;G.flash=.3;
 showBattleCinematic('GUARDIAN OF THE ROAD',enemy.name.toUpperCase(),G.chapter?.boss.power||'The road trembles.',2700);
 setTimeout(()=>{if(!G||G.state!=='play')return;G.paused=false;showToast('BOSS BATTLE · '+enemy.name);},2350);
}

function showWaveBanner(wave,kicker='WAVE'){
 if(wave>1)AUDIO.sting('wave');
 const banner=$('#waveBanner'),text=$('#waveBannerText'),label=$('#waveBannerKicker');if(!banner)return;
 label.textContent=kicker;text.textContent=wave;banner.classList.remove('hidden');banner.style.animation='none';void banner.offsetWidth;banner.style.animation='waveBanner 1.7s ease both';clearTimeout(showWaveBanner.t);showWaveBanner.t=setTimeout(()=>banner.classList.add('hidden'),1750);
}

function showToast(t){UI.toast.textContent=t;UI.toast.style.opacity=1;clearTimeout(showToast.t);showToast.t=setTimeout(()=>UI.toast.style.opacity=0,1400)}
function saveProgress(){STORAGE.set('relicsEclipseSave',JSON.stringify(save))}
// THE VILLAGE V23.0 bridge: live construction, persistent village economy,
// offline production, and backward-compatible access to the existing hunt save.
const VILLAGE_ECONOMY_MAX_OFFLINE_HOURS=12;
function villagePlotData(){
 try{return JSON.parse(STORAGE.get('rotkVillagePlotsV224B')||STORAGE.get('rotkVillagePlots')||'{}')||{}}
 catch{return {}}
}
function villageBuildingCounts(){
 const counts={house:0,farm:0,lumber:0,quarry:0};
 Object.values(villagePlotData()).forEach(type=>{if(type in counts)counts[type]+=1});
 return counts;
}
function villageRates(){
 const c=villageBuildingCounts();
 return {food:c.farm*8,wood:c.lumber*6,stone:c.quarry*5,population:8+c.house*4,capacity:12+c.house*4,counts:c,buildings:Object.values(c).reduce((a,b)=>a+b,0)};
}
function ensureVillageEconomy(){
 if(!save.villageEconomy||typeof save.villageEconomy!=='object'){
  const hasBuildings=villageRates().buildings>0;
  save.villageEconomy={food:0,wood:0,stone:0,lastTick:Date.now()-(hasBuildings?3600000:0),lastReport:null};
 }
 save.villageEconomy.food=Math.max(0,Number(save.villageEconomy.food)||0);
 save.villageEconomy.wood=Math.max(0,Number(save.villageEconomy.wood)||0);
 save.villageEconomy.stone=Math.max(0,Number(save.villageEconomy.stone)||0);
 save.villageEconomy.lastTick=Number(save.villageEconomy.lastTick)||Date.now();
 return save.villageEconomy;
}
function updateVillageEconomy(persist=true){
 const eco=ensureVillageEconomy(),rates=villageRates(),now=Date.now();
 const elapsedMs=Math.max(0,Math.min(now-eco.lastTick,VILLAGE_ECONOMY_MAX_OFFLINE_HOURS*3600000));
 const hours=elapsedMs/3600000;
 const gain={food:rates.food*hours,wood:rates.wood*hours,stone:rates.stone*hours,hours};
 eco.food+=gain.food;eco.wood+=gain.wood;eco.stone+=gain.stone;eco.lastTick=now;
 if(elapsedMs>=60000&&(gain.food+gain.wood+gain.stone)>=.1)eco.lastReport={food:gain.food,wood:gain.wood,stone:gain.stone,hours,at:now};
 if(persist)saveProgress();
 const level=1+Math.floor(rates.buildings/2);
 const happiness=Math.max(55,Math.min(100,75+rates.counts.house*3+rates.counts.farm*2-rates.buildings));
 return {food:eco.food,wood:eco.wood,stone:eco.stone,population:rates.population,capacity:rates.capacity,foodRate:rates.food,woodRate:rates.wood,stoneRate:rates.stone,totalRate:rates.food+rates.wood+rates.stone,counts:rates.counts,buildings:rates.buildings,level,happiness,maxOfflineHours:VILLAGE_ECONOMY_MAX_OFFLINE_HOURS,lastReport:eco.lastReport};
}
ensureVillageEconomy();
window.ROTKGameBridge={
  getEssence(){return Math.max(0,Number(save.essence)||0)},
  ensureVillageBuilderGrant(){
    if(save.villageBuilderGrantV224B)return 0;
    save.villageBuilderGrantV224B=true;
    save.essence=(Number(save.essence)||0)+500;
    save.materials.bloodEssence=save.essence;
    saveProgress();renderRoyalHome();
    return 500;
  },
  spendVillageEssence(cost){
    cost=Math.max(0,Number(cost)||0);
    if((Number(save.essence)||0)<cost)return false;
    updateVillageEconomy(false);
    save.essence-=cost;save.materials.bloodEssence=save.essence;
    save.kingdom=save.kingdom||{buildings:{},renown:0};
    save.kingdom.renown=(save.kingdom.renown||0)+1;
    saveProgress();renderRoyalHome();
    return true;
  },
  refundVillageEssence(amount){
    save.essence=(Number(save.essence)||0)+Math.max(0,Number(amount)||0);
    save.materials.bloodEssence=save.essence;saveProgress();renderRoyalHome();
  },
  getVillageEconomy(){return updateVillageEconomy(true)},
  villageBuildingConstructed(){
    const result=updateVillageEconomy(true);renderRoyalHome();return result;
  },
  collectVillageEconomy(){
    const result=updateVillageEconomy(false);save.villageEconomy.lastReport=null;saveProgress();return {...result,lastReport:null};
  },
  refreshHome(){renderRoyalHome()},
  toast(message){showToast(message)}
};
function reconcileCardUnlocks(){
 const before=new Set(save.unlocked||[]), repaired=[];
 for(const id of progressionUnlockedIds(save.campaign?.completed||[])){
  if(!before.has(id)){save.unlocked.push(id);repaired.push(id)}
  const item=inv(id);if(item.copies<1)item.copies=DEFAULT_DECK.includes(id)?2:1;
 }
 save.unlocked=[...new Set(save.unlocked)].filter(id=>CARD_POOL.some(c=>c.id===id));
 if(repaired.length)saveProgress();
 return repaired.map(card).filter(Boolean);
}
function mergeCard(id){const item=inv(id),idx=rarityIndex(item.rarity);if(item.copies<3)return showToast('Three identical copies are required');if(idx>=RARITIES.length-1)return showToast('This card is already Mythic');item.copies-=3;item.rarity=RARITIES[idx+1].id;item.level++;item.recent=false;save.stats.fusions++;save.materials.forgeEmbers+=1;saveProgress();showToast(`${card(id).name} fused to ${RARITIES[idx+1].name}`);renderDeck()}
function mergeAllDuplicates(){let merges=0,cardsMerged=0;for(const c of CARD_POOL){const item=inv(c.id);let mergedThis=false;while(item.copies>=3&&rarityIndex(item.rarity)<RARITIES.length-1){item.copies-=3;item.rarity=RARITIES[rarityIndex(item.rarity)+1].id;item.level++;item.recent=false;save.stats.fusions++;save.materials.forgeEmbers+=1;merges++;mergedThis=true}if(mergedThis)cardsMerged++}if(!merges)return showToast('No cards have three matching copies');saveProgress();showToast(`Merged ${merges} set${merges===1?'':'s'} across ${cardsMerged} card${cardsMerged===1?'':'s'}`);renderDeck()}
function sortCards(cards,mode){return [...cards].sort((a,b)=>{if(mode==='rarity')return rarityIndex(inv(b.id).rarity)-rarityIndex(inv(a.id).rarity);if(mode==='strength')return cardPower(b.id)-cardPower(a.id);if(mode==='level')return inv(b.id).level-inv(a.id).level;if(mode==='name')return a.name.localeCompare(b.name);return a.type.localeCompare(b.type)||a.name.localeCompare(b.name)})}
function shortType(type){return {tower:'Defense',support:'Support',skill:'Skill',hero:'Run Upgrade',roadpiece:'System Road',trap:'Ground Defense'}[type]||type}
const HERO_GEAR={
 warden:[['weapon','Ashen Longsword','🗡️'],['armor','Warden Plate','🛡️'],['relic','Royal Seal','🔱'],['accessory','Hunter Ring','💍']],
 alchemist:[['weapon','Moon Flask','⚗️'],['armor','Veil Robes','🥋'],['relic','Ember Vial','🔥'],['accessory','Silver Lens','🔍']],
 engineer:[['weapon','Grave Hammer','🔨'],['armor','Iron Harness','⚙️'],['relic','Core Gear','🧿'],['accessory','Tool Belt','🧰']],
 guardian:[['weapon','Oath Blade','⚔️'],['armor','Keep Bulwark','🛡️'],['relic','Saint Crest','✝️'],['accessory','Vow Chain','⛓️']],
 arcanist:[['weapon','Veil Staff','🪄'],['armor','Star Mantle','🧥'],['relic','Moon Prism','🔮'],['accessory','Rune Band','💍']],
 beastmaster:[['weapon','Fang Spear','🔱'],['armor','Night Hide','🐺'],['relic','Pack Totem','🦴'],['accessory','Beast Charm','🦇']]
};
function heroGear(heroId){return HERO_GEAR[heroId]||HERO_GEAR.warden}
function toggleFavorite(id){const i=save.favorites.indexOf(id);if(i>=0)save.favorites.splice(i,1);else save.favorites.push(id);saveProgress()}
function ensureVisibleCardCollection(){
 // Keep starter cards available, but never auto-refill the active deck here.
 // Auto-refilling on every render made an intentionally removed card immediately
 // reappear, which broke both Remove and Add/replace deck management.
 for(const id of DEFAULT_DECK){
  if(!save.unlocked.includes(id))save.unlocked.push(id);
  const item=inv(id);if(item.copies<1)item.copies=2;
 }
 save.deck=Array.isArray(save.deck)
  ? [...new Set(save.deck)].filter(id=>save.unlocked.includes(id)&&card(id)&&inv(id).copies>0).slice(0,6)
  : [];
}
function setDeckCard(id,equip){
 if(!card(id)||!save.unlocked.includes(id)||inv(id).copies<1)return false;
 const next=save.deck.filter(x=>x!==id);
 if(equip){
  if(next.length>=6){showToast('Deck already has six cards');return false;}
  next.push(id);
 }
 save.deck=next;
 saveProgress();
 return true;
}
function miniCardHTML(c){
 // V16.1: deck cards use the exact same markup, art, rarity, and level as collection cards.
 return cardHTML(c,true);
}
function groundCardById(id){return HERO_GROUND_DEFENSES.find(c=>c.id===id)}
function renderGroundDefenseSlots(){
 const box=$('#groundDefenseSlots');if(!box)return;box.innerHTML='';
 for(let i=0;i<2;i++){
  const id=save.groundDefenseSlots[i],c=groundCardById(id),slot=document.createElement('button');
  slot.type='button';slot.className=`ground-defense-slot ${c?'filled rarity-'+inv(c.id).rarity:'empty'}`;
  if(c){slot.innerHTML=`<span class="ground-slot-label">SLOT ${i+1}</span>${cardHTML(c,true)}`;slot.title=`${c.name} · Hero bonus ground defense`;slot.onclick=()=>showToast(`${c.name} is equipped in Ground Slot ${i+1}`)}
  else{slot.innerHTML=`<span class="ground-slot-label">SLOT ${i+1}</span><span class="empty-plus">+</span><small>GROUND DEFENSE</small>`}
  box.append(slot);
 }
}

function renderDeck(){save.favorites=Array.isArray(save.favorites)?save.favorites:[];save.ui=save.ui||{cardFilter:'all',cardSort:'type'};ensureVisibleCardCollection();const repairedUnlocks=reconcileCardUnlocks();if(repairedUnlocks.length)setTimeout(()=>showToast(`Recovered unlocks: ${repairedUnlocks.map(c=>c.name).join(' + ')}`),100);
 const equipped=$('#equippedDeck'),box=$('#collectionCards');equipped.innerHTML='';box.innerHTML='';renderGroundDefenseSlots();
 const selectedHero=HEROES.find(h=>h.id===save.selectedHero)||HEROES[0];
 const heroLevel=Math.max(1,save.heroLevels?.[selectedHero.id]||1);
 const heroPortrait=$('#deckHeroPortrait'),heroName=$('#deckHeroName'),heroLevelEl=$('#deckHeroLevel'),heroCard=$('#deckHeroCard');
 if(heroPortrait)heroPortrait.textContent=selectedHero.icon;if(heroName)heroName.textContent=selectedHero.name;if(heroLevelEl)heroLevelEl.textContent=`Lv ${heroLevel}`;
 const xp=$('#deckHeroXP');if(xp){const pct=Math.min(100,((heroLevel*37)%100));xp.title=`Mastery ${pct}%`;xp.querySelector('i').style.width=pct+'%'}
 const gear=$('#deckHeroGear');if(gear)gear.innerHTML=heroGear(selectedHero.id).map(([slot,name,icon])=>`<span title="${slot}: ${name}"><i>${icon}</i><small>${slot}</small></span>`).join('');
 const heroSupports=$('#deckHeroSupports');if(heroSupports){
  const supportIds=save.deck.filter(id=>card(id)?.type==='support').slice(0,2);
  heroSupports.innerHTML=[0,1].map(i=>{const id=supportIds[i],c=id?card(id):null;return c?`<span class="hero-support-card rarity-${inv(id).rarity}" title="${c.name}"><i>${c.icon}</i><b>${c.name}</b><small>Lv ${inv(id).level}</small></span>`:`<span class="hero-support-card empty"><i>+</i><b>Support</b><small>Empty</small></span>`}).join('');
 }
 if(heroCard)heroCard.onclick=()=>{openScreen($('#heroesScreen'));renderHeroes()};
 for(let i=0;i<6;i++){
  const id=save.deck[i],slot=document.createElement('button');slot.className='deck-slot poker-mini-card'+(id?' filled rarity-'+inv(id).rarity:' empty');slot.type='button';
  if(id){const c=card(id);slot.innerHTML=miniCardHTML(c);slot.onclick=()=>{if(setDeckCard(id,false))renderDeck()}}
  else{slot.innerHTML='<span class="empty-plus">+</span><small>EMPTY</small>';slot.onclick=()=>showToast('Choose a card from the collection')}
  equipped.append(slot)
 }
 const filter=$('#deckTypeFilter')?.value||save.ui.cardFilter||'all',sort=$('#deckSort')?.value||save.ui.cardSort||'type',mergeOnly=$('#mergeOnly')?.checked||false;
 save.ui.cardFilter=filter;save.ui.cardSort=sort;
 let cards=CARD_POOL.filter(c=>(filter==='all'||c.type===filter)&&(!mergeOnly||inv(c.id).copies>=3));
 cards=sortCards(cards,sort);
 cards.forEach(c=>{const item=inv(c.id),unlocked=save.unlocked.includes(c.id)&&item.copies>0,fav=save.favorites.includes(c.id),unlockAt=unlockChapterForCard(c.id),el=document.createElement('article');el.className=`card portrait-card compact-card rarity-${item.rarity} ${save.deck.includes(c.id)?'selected':''} ${unlocked?'':'locked-card'}`;el.innerHTML=cardHTML(c,true)+`<span class="card-type-corner" title="${shortType(c.type)}">${{tower:'🛡️',support:'✚',skill:'⚔️',hero:'⬆️'}[c.type]||'◆'}</span><span class="favorite-corner ${fav?'is-favorite':''}" aria-label="${fav?'Favorite':'Not favorite'}">★</span>${unlocked?'':`<div class="card-lock-overlay"><b>🔒 LOCKED</b><small>${unlockAt?`Defeat Chapter ${unlockAt.number}: ${unlockAt.name}`:'Campaign reward'}</small></div>`}`;el.addEventListener('click',()=>unlocked?showCardDetail(c):showToast(unlockAt?`Defeat Chapter ${unlockAt.number} to unlock ${c.name}`:`${c.name} is still locked`));
  const equip=document.createElement('button');equip.className='card-equip';equip.disabled=!unlocked;equip.textContent=unlocked?(save.deck.includes(c.id)?'Remove':'Equip'):'Locked';equip.onclick=e=>{e.stopPropagation();if(!unlocked)return;const equipped=save.deck.includes(c.id);if(setDeckCard(c.id,!equipped))renderDeck()};el.append(equip);
  box.append(el)
 });
 $('#deckCounter').textContent=`${save.deck.length} / 6`;$('#deckSort').value=sort;$('#deckTypeFilter').value=filter;const mergeAllBtn=$('#mergeAllBtn');if(mergeAllBtn){const ready=CARD_POOL.filter(c=>inv(c.id).copies>=3&&rarityIndex(inv(c.id).rarity)<RARITIES.length-1);mergeAllBtn.disabled=ready.length===0;mergeAllBtn.classList.toggle('ready',ready.length>0);mergeAllBtn.textContent=ready.length?`Merge All Duplicates (${ready.length})`:'Merge All Duplicates';}
 document.querySelectorAll('.card-file-tab').forEach(t=>{const on=t.dataset.cardFilter===filter;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))});
 renderDeckAnalysis();saveProgress();
}
function renderDeckAnalysis(){const el=$('#deckAnalysis');if(!el)return;const d=save.deck.map(card).filter(Boolean),support=d.filter(c=>c.type==='support').length,towers=d.filter(c=>c.type==='tower').length,skills=d.filter(c=>c.type==='skill').length,hero=d.filter(c=>c.type==='hero').length;const notes=[];if(!towers)notes.push('<span class="warning">⚠ No defense card equipped</span>');if(!support)notes.push('<span class="warning">⚠ No support card equipped</span>');notes.push('<span class="good-note">✓ Road System always included</span>');el.innerHTML=`<b>Deck profile</b> · Defense ${towers} · Supports ${support} · Skills ${skills} · Run upgrades ${hero}<br>${notes.join(' · ')}`}
function cardHTML(c,collection=false){
 if(c.hiddenSystem)return `<span class="card-level">SYSTEM</span><span class="tag">Road</span><div class="card-art system-road-art">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p><div class="card-footer"><span>Hidden run feature</span><span>Weight ${Math.round((c.drawWeight??1)*100)}%</span></div>`;
 const item=inv(c.id),r=rarityDef(item.rarity),odds=c.drawWeight!=null?`<span>Weight ${Math.round(c.drawWeight*100)}%</span>`:'',owned=c.type==='tower'&&G?G.towers.filter(t=>t.id===c.id).length:0;
 return `<span class="card-level">Lv ${item.level}</span><span class="tag">${shortType(c.type)}</span><div class="card-art"><div class="art-sigil">${c.icon}</div><div class="art-lines"></div></div><h3>${c.name}</h3><p>${c.desc}</p><div class="card-stats"><span>${r.name}</span><span>${Math.round(cardPower(c.id)*100)}% power</span></div><div class="card-footer"><span>${item.copies} copies${owned?` · ${owned} placed`:''}</span>${odds}</div>`
}
function draftCardHTML(c){
 if(c.hiddenSystem)return `<span class="draft-level">SYSTEM</span><span class="draft-type">ROAD</span><div class="draft-art"><div class="draft-icon">${c.icon}</div></div><h3>${c.name}</h3><div class="draft-passive"><small>SYSTEM EFFECT</small><p>${c.desc}</p></div><div class="draft-stat-grid"><div><small>ROLE</small><b>Road</b></div><div><small>DRAW WEIGHT</small><b>${Math.round((c.drawWeight??1)*100)}%</b></div></div>`;
 const item=inv(c.id),r=rarityDef(item.rarity),power=cardPower(c.id),damage=Math.round((c.damage||0)*power),speed=c.rate?`${(1/c.rate).toFixed(2)}/sec`:'—',range=c.range?`${c.range.toFixed(1)} tiles`:'—',cost=essenceCost(c);
 const role=shortType(c.type);
 const target=c.type==='tower'?(c.id==='dagger'||c.id==='cross'?'Air + Ground':c.id==='axe'?'Ground · Armor':c.id==='scripture'?'Ground · Chain':'Ground'):c.type==='support'?'Allied Tower':'Battlefield';
 const passive=c.desc||'No passive effect.';
 return `<span class="draft-level">LV ${item.level}</span><span class="draft-type">${role}</span><div class="draft-art"><div class="draft-icon">${c.icon}</div></div><h3>${c.name}</h3><div class="draft-stat-grid"><div><small>DAMAGE</small><b>${damage||'—'}</b></div><div><small>ATTACK SPEED</small><b>${speed}</b></div><div><small>RANGE</small><b>${range}</b></div><div><small>TARGETS</small><b>${target}</b></div></div><div class="draft-passive"><small>PASSIVE ABILITY</small><p>${passive}</p></div><div class="draft-cost"><span>${r.name} · Level ${item.level}</span><strong>✦ ${cost}</strong></div>`;
}

function renderHand(){
 if(!UI.hand||!G)return;
 UI.hand.innerHTML='';
 const c=G.activeDraftCard;
 if(!c){UI.hand.classList.add('hidden');UI.hand.setAttribute('aria-hidden','true');return;}
 const cost=essenceCost(c),affordable=G.essence>=cost;
 const el=document.createElement('button');
 el.type='button';
 el.className=`hand-card active ${affordable?'affordable':'locked-cost'}`;
 el.innerHTML=`<span class="hlvl">Lv ${inv(c.id).level}</span><div class="hicon">${c.icon}</div><div class="hname">${c.name}</div><div class="hcost">✦ ${cost}</div>`;
 el.title=affordable?`Place another ${c.name} for ${cost} Essence`:`Need ${cost-G.essence} more Essence`;
 el.onclick=()=>selectEssenceCard(c);
 UI.hand.append(el);UI.hand.classList.remove('hidden');UI.hand.setAttribute('aria-hidden','false');
}
function selectEssenceCard(c){
 if(!G||G.state!=='play'||G.draftOpen)return;const cost=essenceCost(c);
 if(!G.activeDraftCard||G.activeDraftCard.id!==c.id)return showToast('Fill the vial and draft a card first');
 if(G.essence<cost)return showToast(`Need ${cost-G.essence} more Essence`);
 if(c.type==='hero'){G.essence-=cost;applyHeroUpgrade(c);renderEssenceVial();renderHand();return;}
 if(c.type==='booster'){G.essence-=cost;applyBooster(c);renderEssenceVial();renderHand();return;}
 if(c.type==='support'&&!G.towers.some(t=>!t.supportOnly))return showToast('Place an attack tower before a support tower');
 G.pendingCard={...c,essenceCost:cost};G.hoverTile=null;G.placementRotation=0;setPlacementUI(G.pendingCard);showToast(c.type==='trap'?`Place ${c.name} directly on the road`:c.type==='support'?`Place ${c.name} behind an attack tower`:`Place ${c.name} · costs ${cost} Essence`);renderHand();
}

function pathSet(){return new Set(G.path.map(p=>key(p.x,p.y)))}
function occupied(x,y){return G.towers.some(t=>t.x===x&&t.y===y)}
function trapOccupied(x,y){return G.traps.some(t=>t.x===x&&t.y===y)}
function validTrapTile(x,y){return inside(x,y)&&pathSet().has(key(x,y))&&!trapOccupied(x,y)}
function validPathTile(x,y){if(!inside(x,y)||pathSet().has(key(x,y))||occupied(x,y))return false;const end=G.path.at(-1);return Math.abs(end.x-x)+Math.abs(end.y-y)===1}
function rotatePoint(p,r){let x=p.x,y=p.y;for(let i=0;i<r;i++){const nx=-y;y=x;x=nx}return{x,y}}
const ROAD_SHAPES={single:[{x:0,y:0}],L:[{x:0,y:0},{x:1,y:0},{x:1,y:1}],J:[{x:0,y:0},{x:1,y:0},{x:1,y:-1}],S:[{x:0,y:0},{x:0,y:1},{x:1,y:1}]};
function roadCells(c,anchor,rot=0){const raw=ROAD_SHAPES[c.shape]||ROAD_SHAPES.single;return raw.map(p=>{const q=rotatePoint(p,rot);return{x:anchor.x+q.x,y:anchor.y+q.y}})}
function validRoadPiece(c,anchor,rot=0){const cells=roadCells(c,anchor,rot),set=pathSet(),end=G.path.at(-1);if(Math.abs(end.x-anchor.x)+Math.abs(end.y-anchor.y)!==1)return false;const seen=new Set();for(const p of cells){const k=key(p.x,p.y);if(!inside(p.x,p.y)||set.has(k)||occupied(p.x,p.y)||seen.has(k))return false;seen.add(k)}for(let i=1;i<cells.length;i++){const a=cells[i-1],b=cells[i];if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return false}return true}
function placeRoadPiece(c,anchor,rot=0){const cells=roadCells(c,anchor,rot);if(!validRoadPiece(c,anchor,rot))return false;for(const p of cells)G.path.push(p);if(c.bonus)G.gold+=c.bonus;return true}

function adjacent4(x,y){return [{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}]}
function validTowerTile(x,y){
 if(!inside(x,y)||pathSet().has(key(x,y)))return false;
 const existing=G.towers.find(t=>t.x===x&&t.y===y);
 if(existing)return true;
 return adjacent4(x,y).some(n=>pathSet().has(key(n.x,n.y))||occupied(n.x,n.y));
}

function supportTargetAt(x,y){return G.towers.filter(t=>!t.supportOnly).find(t=>Math.abs(t.x-x)+Math.abs(t.y-y)===1)||null}
function validSupportTile(x,y){return inside(x,y)&&!pathSet().has(key(x,y))&&!occupied(x,y)&&!!supportTargetAt(x,y)}

function firstValidRoadPlacement(c){
 const end=G.path.at(-1);
 for(const anchor of adjacent4(end.x,end.y))for(let rot=0;rot<4;rot++)if(validRoadPiece(c,anchor,rot))return {anchor,rot};
 return null;
}
function preparePlacement(c){
 G.pendingCard={...c,essenceCost:essenceCost(c)};G.placementRotation=0;
 if(c.type==='roadpiece'){
  const found=firstValidRoadPlacement(c);
  if(!found)return false;
  G.hoverTile=found.anchor;G.placementRotation=found.rot;
 }else if(c.type==='support'){G.hoverTile=G.towers[0]?{x:G.towers[0].x,y:G.towers[0].y}:null;if(!G.towers.length)return false;}else G.hoverTile=null;
 setPlacementUI(G.pendingCard);return true;
}

function setPlacementUI(c){const bar=$('#placementBar');if(!c){bar.classList.add('hidden');return}bar.classList.remove('hidden');const action=c.type==='roadpiece'?`Place ${c.name} · rotate as needed`:c.type==='support'?`Place ${c.name} behind a defense tower`:c.type==='trap'?`Place ${c.name} on a road tile`:`Place or cast ${c.name}`;$('#placementLabel').textContent=`${action} · drag to pan · pinch to zoom`;$('#rotateBtn').classList.toggle('hidden',c.type!=='roadpiece')}
function heroDefBonusXp(){return (HEROES.find(h=>h.id===save.selectedHero)?.bonus.xp||0)}
function cameraTransform(){
 const zoom=G?.camera?.zoom||1,worldScale=scale*zoom,gw=GRID.cols*GRID.tile,gh=GRID.rows*GRID.tile;
 return {zoom,worldScale,x:ox+(G?.camera?.panX||0)+(gw*scale*(1-zoom))/2,y:oy+(G?.camera?.panY||0)+(gh*scale*(1-zoom))/2};
}
function clampCamera(){
 if(!G?.camera)return;const c=cameraTransform(),worldW=GRID.cols*GRID.tile*c.worldScale,worldH=GRID.rows*GRID.tile*c.worldScale,m=CAMERA_LIMITS.margin;
 const minX=Math.min(m,W-m-worldW),maxX=Math.max(m,W-m-worldW),minY=Math.min(m,H-m-worldH),maxY=Math.max(m,H-m-worldH);
 const nx=Math.max(minX,Math.min(maxX,c.x)),ny=Math.max(minY,Math.min(maxY,c.y));G.camera.panX+=nx-c.x;G.camera.panY+=ny-c.y;
}
function recenterCamera(){if(!G)return;G.camera={zoom:1,panX:0,panY:0};clampCamera();showToast('Battlefield centered')}
function pointerCanvasPoint(e){
 const r=canvas.getBoundingClientRect();const sx=W/Math.max(1,r.width),sy=H/Math.max(1,r.height);
 return{x:(e.clientX-r.left)*sx,y:(e.clientY-r.top)*sy};
}
function pointerWorldPoint(e){const p=pointerCanvasPoint(e),c=cameraTransform();return{x:(p.x-c.x)/c.worldScale,y:(p.y-c.y)/c.worldScale}}
function pointerTile(e){const p=pointerWorldPoint(e);return{x:Math.floor(p.x/GRID.tile),y:Math.floor(p.y/GRID.tile)};}
function zoomCameraAt(screenPoint,nextZoom){
 if(!G?.camera)return;const before=cameraTransform(),wx=(screenPoint.x-before.x)/before.worldScale,wy=(screenPoint.y-before.y)/before.worldScale;
 G.camera.zoom=Math.max(CAMERA_LIMITS.minZoom,Math.min(CAMERA_LIMITS.maxZoom,nextZoom));const after=cameraTransform();G.camera.panX+=screenPoint.x-(after.x+wx*after.worldScale);G.camera.panY+=screenPoint.y-(after.y+wy*after.worldScale);clampCamera();
}
function handleBattleTap(e){
 if(!G||G.state!=='play')return;const tap=pointerTile(e);
 if(!G.pendingCard){const wp=pointerWorldPoint(e),tx=wp.x/GRID.tile,ty=wp.y/GRID.tile;const t=G.towers.map(t=>({t,d:Math.hypot((t.x+.5)-tx,(t.y+.5)-ty)})).filter(o=>o.d<=.68).sort((a,b)=>a.d-b.d)[0]?.t||null;G.selectedTower=t;renderInspector();if(t)showToast(`${t.name} selected`);return;}
 const c=G.pendingCard,p=tap;let used=false;
 if(c.type==='tower'){
  if(!validTowerTile(p.x,p.y))return showToast('Towers must touch a road or a road-connected tower');
  const existing=G.towers.find(t=>t.x===p.x&&t.y===p.y);
  if(existing){if(existing.id!==c.id||existing.level>=3)return showToast('Only identical towers can merge');existing.level++;existing.damage*=1.7;existing.range+=.18;burst(p.x+.5,p.y+.5,c.color,24);showToast(`Merged to level ${existing.level}`);used=true;}
  else {G.towers.push({...c,x:p.x,y:p.y,level:1,t:0,xp:heroDefBonusXp(),xpNeed:4,elite:!!c.elite,permanentPower:cardPower(c.id),supports:[]});used=true;}
 } else if(c.type==='support'){
  if(!validSupportTile(p.x,p.y))return showToast('Support towers must sit beside and behind an attack tower');const target=supportTargetAt(p.x,p.y);G.towers.push({...c,x:p.x,y:p.y,level:1,t:0,supportOnly:true,supportTarget:target,permanentPower:cardPower(c.id),supports:[]});burst(p.x+.5,p.y+.5,c.color||'#ffe49a',30);showToast(`${c.name} now boosts ${target.name}`);used=true;
 } else if(c.type==='trap'){
  if(!validTrapTile(p.x,p.y))return showToast('Ground defenses must be placed on an empty road tile');G.traps.push({...c,x:p.x,y:p.y,t:0,level:1});burst(p.x+.5,p.y+.5,c.color,18);showToast(`${c.name} armed`);used=true;
 } else if(c.type==='roadpiece'){
  if(!placeRoadPiece(c,p,G.placementRotation))return showToast('Rotate or move the road ghost to a green position');used=true;playTone(185,.09,'square',.028);
 } else if(c.type==='skill'){castSkill(c,p.x+.5,p.y+.5);used=true;}
 if(used)finishCardPlacement();
}
const activePointers=new Map();let gesture={dragging:false,moved:false,lastX:0,lastY:0,pinchDistance:0,pinchZoom:1};
canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{
 if(!G||G.state!=='play')return;canvas.setPointerCapture?.(e.pointerId);const p=pointerCanvasPoint(e);activePointers.set(e.pointerId,p);
 if(activePointers.size===1){gesture.dragging=true;gesture.moved=false;gesture.lastX=p.x;gesture.lastY=p.y;}
 else if(activePointers.size===2){const pts=[...activePointers.values()],dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;gesture.pinchDistance=Math.hypot(dx,dy);gesture.pinchZoom=G.camera.zoom;gesture.moved=true;}
});
canvas.addEventListener('pointermove',e=>{
 if(!G||G.state!=='play')return;const p=pointerCanvasPoint(e);if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,p);
 if(activePointers.size>=2){const pts=[...activePointers.values()].slice(0,2),dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,dist=Math.max(20,Math.hypot(dx,dy)),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};zoomCameraAt(mid,gesture.pinchZoom*dist/Math.max(20,gesture.pinchDistance));gesture.moved=true;return;}
 if(activePointers.size===1&&gesture.dragging){const dx=p.x-gesture.lastX,dy=p.y-gesture.lastY;if(Math.hypot(dx,dy)>1){G.camera.panX+=dx;G.camera.panY+=dy;clampCamera();gesture.moved=gesture.moved||Math.hypot(dx,dy)>4;}gesture.lastX=p.x;gesture.lastY=p.y;}
 if(G.pendingCard)G.hoverTile=pointerTile(e);
});
function endPointer(e){
 const wasSingle=activePointers.size===1&&activePointers.has(e.pointerId),shouldTap=wasSingle&&!gesture.moved;activePointers.delete(e.pointerId);
 if(shouldTap)handleBattleTap(e);if(activePointers.size===1){const p=[...activePointers.values()][0];gesture.lastX=p.x;gesture.lastY=p.y;gesture.dragging=true;gesture.moved=true;}else if(activePointers.size===0){gesture.dragging=false;gesture.pinchDistance=0;}
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',e=>{if(!G||G.state!=='play')return;e.preventDefault();const p=pointerCanvasPoint(e),factor=Math.exp(-e.deltaY*.0015);zoomCameraAt(p,G.camera.zoom*factor);},{passive:false});
function finishCardPlacement(){
 const placed=G.pendingCard,spent=placed?essenceCost(placed):0;if(spent>0)G.essence=Math.max(0,G.essence-spent);
 G.pendingCard=null;G.selected=null;G.hoverTile=null;setPlacementUI(null);G.draftOpen=false;G.paused=false;G.pendingWave=false;renderEssenceVial();renderHand();
 if(placed&&G.activeDraftCard?.id===placed.id){const cost=essenceCost(placed);showToast(G.essence>=cost?`${G.essence} Essence left · tap ${placed.name} to place another`:`${placed.name} cycle complete · refill the vial`);}
}

function castSkill(c,x,y){
 if(!G.enemies.some(e=>!e.dead)&&['waterSkill','crossSkill','axeRain','grandCross'].includes(c.id)){
  G.queuedSkills.push({...c,target:{x,y}});showToast(`${c.name} armed — it will trigger when the next enemies enter`);floatText(GRID.cols/2,1.45,'SKILL ARMED','#ffe6a3');return;
 }
 if(c.id==='waterSkill'){G.enemies.forEach(e=>{if(Math.hypot(e.x-x,e.y-y)<2.2){hit(e,42);e.burn=5}});burst(x,y,'#ff6a32',45)}
 if(c.id==='crossSkill'){G.enemies.forEach(e=>hit(e,38));for(let i=0;i<80;i++)G.particles.push({x:Math.random()*GRID.cols,y:Math.random()*GRID.rows,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,life:1,color:'#ffe9a8'})}
 if(c.id==='freeze'){G.enemies.forEach(e=>e.freeze=3);G.flash=.35}
 if(c.id==='summon'){G.hero.frenzy=8;G.hp=Math.min(G.maxHp,G.hp+3);burst(G.hero.x,G.hero.y,'#f2d273',35)}
 if(c.id==='axeRain'){G.enemies.forEach(e=>hit(e,52,{holy:false}));G.shake=7;for(const e of G.enemies)burst(e.x,e.y,'#d8c0a0',10)}
 if(c.id==='grandCross'){G.enemies.forEach(e=>hit(e,82,{holy:true}));G.flash=.7;G.shake=10;}

}
function applyBooster(c){
 if(c.id==='soulPact')G.gold+=35;
 if(c.id==='sharpen')G.globalDamage*=1.12;
 if(c.id==='fortify'){G.hp=Math.min(30,G.hp+5)}
 if(c.id==='moonBlessing'){G.gold+=25;G.hero.frenzy=12}
 showToast(`${c.name} activated`);
}

function applyHeroUpgrade(c){
 if(c.heroStat==='damage')G.hero.damage*=1.25;
 if(c.heroStat==='rate')G.hero.rate*=.82;
 if(c.heroStat==='range')G.hero.range*=1.2;
 if(c.heroStat==='holy'){G.hero.holy=true;G.hero.crit+=.15;}
 burst(G.hero.x,G.hero.y,'#ffe89a',34);floatText(G.hero.x,G.hero.y-0.4,'HERO UPGRADE','#ffe89a');showToast(`${c.name} gained for this run`);
}
function floatText(x,y,text,color='#fff'){if(!G)return;G.floaters.push({x,y,text,color,life:1,vy:-.7})}
const AUDIO=(()=>{
 let ctx=null,master=null,musicBus=null,sfxBus=null,ambBus=null,unlocked=false,state='menu',timer=0,nextNote=0,step=0,noise=null,wind=null;
 const progressions={menu:[[48,55,60],[46,53,58],[43,50,55],[41,48,53]],campaign:[[50,57,62],[48,55,60],[45,52,57],[43,50,55]],battle:[[45,52,57],[43,50,55],[41,48,53],[38,45,50]],boss:[[38,45,50],[39,46,51],[36,43,48],[34,41,46]],victory:[[48,55,60],[52,59,64],[55,62,67],[60,64,67]],defeat:[[43,50,55],[41,48,53],[38,45,50],[36,43,48]]};
 const hz=n=>440*Math.pow(2,(n-69)/12);
 function ensure(){if(ctx)return true;try{const AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();master=ctx.createGain();musicBus=ctx.createGain();sfxBus=ctx.createGain();ambBus=ctx.createGain();musicBus.connect(master);sfxBus.connect(master);ambBus.connect(master);master.connect(ctx.destination);noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.35;apply();return true}catch(e){console.warn('Web Audio unavailable',e);return false}}
 function apply(){if(!ctx)return;const enabled=save.settings.audio!==false;master.gain.setTargetAtTime(enabled?1:0,ctx.currentTime,.03);musicBus.gain.setTargetAtTime(save.settings.music===false?0:Number(save.settings.musicVolume??.46),ctx.currentTime,.08);sfxBus.gain.setTargetAtTime(save.settings.sfx===false?0:Number(save.settings.sfxVolume??.72),ctx.currentTime,.03);ambBus.gain.setTargetAtTime(Number(save.settings.ambienceVolume??.34),ctx.currentTime,.1)}
 function unlock(){if(!ensure())return;ctx.resume();unlocked=true;startWind();setState(state,true);document.querySelector('#audioUnlockHint')?.remove()}
 function osc(note,when,dur=.6,type='sine',gain=.025,bus=musicBus,detune=0){if(!ctx||!unlocked)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz(note),when);o.detune.value=detune;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(g);g.connect(bus);o.start(when);o.stop(when+dur+.03)}
 function bell(note,when,gain=.018){osc(note,when,2.6,'sine',gain,musicBus);osc(note+12,when,1.8,'sine',gain*.28,musicBus,4)}
 function schedule(){if(!ctx||!unlocked)return;while(nextNote<ctx.currentTime+.22){const chords=progressions[state]||progressions.menu,ch=chords[Math.floor(step/8)%chords.length],beat=step%8;const tense=state==='battle'||state==='boss';if(beat===0){bell(ch[0]-12,nextNote,state==='boss'?.035:.021);osc(ch[1],nextNote,1.6,'triangle',state==='boss'?.028:.016);osc(ch[2],nextNote+.012,1.5,'sine',.012)}if(tense&&beat%2===0)osc(ch[0]-24,nextNote,.13,'square',state==='boss'?.022:.012);if(state==='boss'&&beat%2===1)osc(ch[2]+12,nextNote,.1,'sawtooth',.008);if(state==='victory')osc(ch[beat%3]+12,nextNote,.45,'triangle',.015);if(state==='defeat'&&beat===4)bell(ch[0]-12,nextNote,.014);nextNote+=state==='boss'?.22:state==='battle'?.3:.42;step++}}
 function startWind(){if(wind||!noise)return;const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise;src.loop=true;filter.type='lowpass';filter.frequency.value=650;g.gain.value=.035;src.connect(filter);filter.connect(g);g.connect(ambBus);src.start();wind={src,g};}
 function setState(next,force=false){state=next||'menu';if(!unlocked)return;if(force||nextNote<ctx.currentTime){nextNote=ctx.currentTime+.05;step=0}clearInterval(timer);timer=setInterval(schedule,80);schedule()}
 function tone(freq=220,dur=.08,type='sine',gain=.035){if(!ensure())return;if(!unlocked)unlock();const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=Math.max(.0001,gain);o.connect(g);g.connect(sfxBus);o.start();g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.stop(ctx.currentTime+dur)}
 function sting(kind){if(!ensure()||!unlocked)return;const now=ctx.currentTime+.03;if(kind==='boss'){[38,50,37,49].forEach((n,i)=>osc(n,now+i*.12,.55,'sawtooth',.025,sfxBus));bell(26,now,.045)}else if(kind==='victory'){[48,52,55,60,64].forEach((n,i)=>bell(n,now+i*.16,.026))}else if(kind==='defeat'){[48,45,41,36].forEach((n,i)=>bell(n,now+i*.28,.025))}else if(kind==='wave'){[60,67].forEach((n,i)=>osc(n,now+i*.1,.25,'triangle',.018,sfxBus))}}
 return {unlock,setState,tone,sting,apply,get state(){return state},get unlocked(){return unlocked}};
})();
['pointerdown','touchend','keydown'].forEach(ev=>window.addEventListener(ev,()=>AUDIO.unlock(),{once:true,passive:true}));
function playTone(freq=220,dur=.08,type='sine',gain=.035){AUDIO.tone(freq,dur,type,gain)}


function spawnEssencePickup(e,amount){
 const canvasRect=canvas.getBoundingClientRect(),c=cameraTransform(),sx=canvasRect.left+(c.x+e.x*GRID.tile*c.worldScale)*(canvasRect.width/W),sy=canvasRect.top+(c.y+e.y*GRID.tile*c.worldScale)*(canvasRect.height/H),target=document.querySelector('.essence-pill')?.getBoundingClientRect();
 const mote=document.createElement('span');mote.className='essence-fly';mote.textContent=amount>=10?'✦':'•';mote.style.left=sx+'px';mote.style.top=sy+'px';document.body.append(mote);G.pendingEssence+=amount;
 requestAnimationFrame(()=>{mote.style.transform=`translate(${(target?target.left+target.width/2:sx)-sx}px,${(target?target.top+target.height/2:20)-sy}px) scale(.45)`;mote.style.opacity='0'});
 setTimeout(()=>{mote.remove();if(!G||G.state!=='play')return;G.pendingEssence=Math.max(0,G.pendingEssence-amount);G.essence=Math.min(G.maxEssence,G.essence+amount);renderEssenceVial();playTone(610,.045,'triangle',.018);if(G.essence>=G.maxEssence&&!G.draftOpen&&!G.pendingCard)triggerEssenceDraft(false)},430);
}
function towerTags(t){return {holy:['holy','cross','rosary','garlic','scripture'].includes(t.id),fire:['holy','bone'].includes(t.id),lightning:['clock','scripture'].includes(t.id)};}
function synergyFor(t){let damage=1,range=1,rate=1,holy=false,ignite=false;for(const n of G.towers){if(n===t)continue;const d=Math.abs(n.x-t.x)+Math.abs(n.y-t.y);if(d!==1)continue;if(n.supportOnly){if(n.id==='holy'){damage*=1.24;rate*=1.18;holy=true}if(n.id==='freeze'){rate*=1.22;range*=1.08}if(n.id==='guardian'){damage*=1.14;rate*=1.12}continue;}if(t.id==='dagger'&&n.id==='holy'){holy=true;damage*=1.22}if(t.id==='clock'&&n.id==='holy'){range*=1.18;damage*=1.12}if(t.id==='axe'&&n.id==='bone'){ignite=true;damage*=1.2}if(t.id==='whip'&&n.id==='rosary'){rate*=1.18}}
 return {damage,range,rate,holy,ignite};}
function towerCombatRange(t){const syn=synergyFor(t),weather=G.weather.id==='fog'?.88:1;return Math.max(1.05,1.35*syn.range*weather+Math.min(.20,(t.level-1)*.05));}
function enemyInsideTowerAOE(t,e){return !e.dead&&Math.hypot(e.x-(t.x+.5),e.y-(t.y+.5))<=towerCombatRange(t);}
function grantTowerXp(t,amount=1){if(!t)return;const mult=G.weather.id==='blood'?1.4:1;t.xp+=amount*mult;if(t.xp>=t.xpNeed&&t.level<5){t.xp-=t.xpNeed;t.level++;t.xpNeed=Math.ceil(t.xpNeed*1.55);t.damage*=1.25;t.range+=.12;burst(t.x+.5,t.y+.5,'#ffe28a',30);showToast(`${t.name} reached level ${t.level}`)}}
function awardRelic(){const pool=RELICS.filter(r=>!save.unlockedRelics.includes(r.id));const r=pool.length?pool[Math.floor(Math.random()*pool.length)]:RELICS[Math.floor(Math.random()*RELICS.length)];G.relic=r;$('#relicTxt').textContent=r.name;if(r.id==='fang')G.hero.rate*=.82;if(r.id==='candle'){for(const t of G.towers){if(towerTags(t).holy){t.damage*=1.2;t.range*=1.2}}}if(!save.unlockedRelics.includes(r.id))save.unlockedRelics.push(r.id);saveProgress();showToast(`Relic discovered: ${r.name}`)}
function enemyDeath(e){if(e.type==='skeleton')for(let i=0;i<18;i++)G.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*4,vy:-Math.random()*3,life:.6+Math.random()*.5,color:'#d8d0be'});else if(e.type==='ghost')burst(e.x,e.y,'#bda8ff',28);else if(e.type==='vampire')for(let i=0;i<9;i++)G.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:.8,color:'#632b78'});else burst(e.x,e.y,e.boss?'#d6b1ff':'#ba233e',e.boss?70:14);const motes=e.boss?12:e.elite?7:4;for(let i=0;i<motes;i++)G.particles.push({x:e.x+(Math.random()-.5)*.25,y:e.y+(Math.random()-.5)*.2,vx:(Math.random()-.5)*.25,vy:-.55-Math.random()*.35,life:1.1+Math.random()*.55,color:'#cdb7ff',kind:'soul',phase:Math.random()*6.28})}
function spawnEnemy(){
 const mini=G.wave===5&&G.spawnLeft===1&&!G.miniBossDefeated;
 const boss=G.wave===G.chapterWaves&&G.spawnLeft===1;
 const roll=Math.random();let type='skeleton';if(!boss&&!mini){if(G.wave>=3&&roll<.16)type='wolf';else if(G.wave>=4&&roll<.29)type='bat';else if(G.wave>=6&&roll<.40)type='ghost';else if(G.wave>=7&&roll<.52)type='armor';else if(G.wave>=8&&roll<.60)type='vampire'}
 let base={skeleton:30,wolf:24,bat:20,ghost:28,armor:70,vampire:46}[type]||30;
 let speed={skeleton:.55,wolf:.82,bat:.76,ghost:.5,armor:.34,vampire:.62}[type]||.55;
 let reward={skeleton:7,wolf:8,bat:8,ghost:11,armor:16,vampire:14}[type]||7;
 let name={skeleton:'Bone Soldier',wolf:'Night Wolf',bat:'Nightwing Bat',ghost:'Castle Ghost',armor:'Axe Armor',vampire:'Vampire Spawn'}[type];save.discoveredEnemies[type]=true;
 if(mini){type='necromancer';base=260;speed=.30;reward=55;name='Grave Necromancer'}
 if(boss){const b=G.chapter?.boss||{id:'warden',name:'The Eclipse Warden',hp:520,speed:.28,reward:140};type=b.id;base=b.hp;speed=b.speed;reward=b.reward;name=b.name;save.discoveredEnemies[type]=true}
 let hp=base*(1+G.wave*.20)*(G.weather.id==='blood'?1.18:1)*3.35;
 const elite=!boss&&!mini&&G.wave>=3&&Math.random()<Math.min(.25,.06+G.wave*.014);if(elite){hp*=1.65;speed*=1.10;reward=Math.round(reward*1.70);name='Elite '+name;}
 const outer=G.path.at(-1);G.enemies.push({x:outer.x+.5,y:outer.y+1.4,seg:0,prog:0,hp,max:hp,speed:speed*(1+Math.min(.25,G.wave*.006)),reward:Math.round(reward*(G.weather.id==='fog'?1.2:G.weather.id==='blood'?1.3:1)*(1+(save.kingdom.buildings.market||0)*.03)),boss,mini,elite,type,name,slow:1,freeze:0,burn:0,dead:false,summonTimer:mini?4:boss?5:0,armor:type==='armor'?.45:0,holyOnly:type==='ghost',air:type==='bat',attacking:false,attackTimer:0,attackRate:boss?0.78:(elite?0.92:1.18),attackDamage:boss?2:1});
 if(boss){G.boss=true;const spawned=G.enemies[G.enemies.length-1];beginBossCinematic(spawned)}else if(mini){G.shake=9;showToast('MINIBOSS: Grave Necromancer')}
 if(G.queuedSkills?.length){const armed=G.queuedSkills.shift(),target=G.enemies.find(e=>!e.dead);setTimeout(()=>{if(G&&target&&!target.dead)castSkill(armed,target.x,target.y);},120)}
}
function targetFor(t){let best=null,bp=-1;for(const e of G.enemies){if(enemyInsideTowerAOE(t,e)&&(e.seg+e.prog)>bp){best=e;bp=e.seg+e.prog}}return best}
function scriptureBibleCount(t){return Math.max(1,Math.min(6,t.level||1));}
function scriptureOrbitPoint(t,index,count,lead=0){const phase=(G?.time||0)*(1.25+.08*(t.level||1))+index*Math.PI*2/count+lead;const radius=.48+.035*Math.sin((G?.time||0)*2.2+index);return{x:t.x+.5+Math.cos(phase)*radius,y:t.y+.5+Math.sin(phase)*radius*.72};}
function fireScripture(t){
 const syn=synergyFor(t),tags=towerTags(t),count=scriptureBibleCount(t),range=towerCombatRange(t);
 const candidates=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-(t.x+.5),e.y-(t.y+.5))<=range).sort((a,b)=>(b.seg+b.prog)-(a.seg+a.prog));
 if(!candidates.length)return false;
 let base=t.damage*G.globalDamage*syn.damage*(t.elite?1.5:1)*(t.permanentPower||1)*(G.hero.def?.bonus.tower||1);
 if(G.weather.id==='rain')base*=1.18;if(G.relic?.id==='candle')base*=1.2;
 const supports=t.supports||[];let supportSlow=1,shotBurn=0;for(const sp of supports){if(sp.id==='holy'){base*=1.08*sp.power;shotBurn=5*sp.power}else if(sp.id==='freeze')supportSlow=Math.min(supportSlow,.62);else if(sp.id==='guardian')base*=1.05*sp.power;}
 for(let i=0;i<count;i++){
  const target=candidates[i%candidates.length],origin=scriptureOrbitPoint(t,i,count,.12);
  G.shots.push({x:origin.x,y:origin.y,px:origin.x,py:origin.y,target,speed:12,damage:base*(1+.10*(t.level-1)),color:'#ffe58a',aoe:0,pierce:0,slow:supportSlow,burn:shotBurn,holy:true,source:t,kind:'scripture',bibleIndex:i,spin:0,life:1.15,chain:t.level>=3?Math.min(2,t.level-2):0});
 }
 burst(t.x+.5,t.y+.5,'#ffe58a',Math.min(16,4+count*2));G.cameraPulse=Math.min(1,G.cameraPulse+.12);playTone(520+count*24,.07,'triangle',.025);
 t.t=t.rate/(1+.10*(t.level-1))/syn.rate;return true;
}
function fire(t,e){if(t.id==='scripture'){fireScripture(t);return;}const syn=synergyFor(t),tags=towerTags(t);let shotSupportBurn=0,supportSlow=1;let dmg=t.damage*t.level*G.globalDamage*syn.damage*(t.elite?1.5:1)*(t.permanentPower||1)*(G.hero.def?.bonus.tower||1);if(t.id==='familiar')dmg*=G.hero.def?.bonus.familiar||1;const supports=t.supports||[];for(const s of supports){if(s.id==='holy'){dmg*=1.08*s.power;shotSupportBurn=5*s.power}else if(s.id==='freeze'){supportSlow=Math.min(supportSlow,.62)}else if(s.id==='guardian'){dmg*=1.05*s.power}}if(e.air&&['dagger','familiar','cross'].includes(t.id))dmg*=1.45;if(e.type==='armor'&&t.id==='axe')dmg*=1.6;if(G.weather.id==='rain'&&tags.fire)dmg*=.8;if(G.weather.id==='rain'&&(tags.holy||tags.lightning))dmg*=1.18;if(G.relic?.id==='candle'&&tags.holy)dmg*=1.2;
 if(t.id==='garlic'){
  const radius=towerCombatRange(t);let hits=0;
  for(const target of G.enemies){if(enemyInsideTowerAOE(t,target)){hit(target,dmg,{holy:true,source:t});target.slow=Math.min(target.slow,t.slow||.78);hits++;}}
  burst(t.x+.5,t.y+.5,t.color,Math.min(18,5+hits*2));t.t=t.rate/(1+.12*(t.level-1))/syn.rate;return;
 }
 burst(t.x+.5,t.y+.5,t.color,3);G.cameraPulse=Math.min(1,G.cameraPulse+.08);G.shots.push({x:t.x+.5,y:t.y+.5,px:t.x+.5,py:t.y+.5,target:e,speed:7,damage:dmg,color:t.color,aoe:t.aoe||0,pierce:t.pierce||0,slow:Math.min(t.slow||1,supportSlow),burn:(t.burn||0)+(syn.ignite?3:0)+shotSupportBurn,holy:tags.holy||syn.holy,source:t,kind:t.id,spin:Math.random()*6.28,life:2});t.t=t.rate/(1+.12*(t.level-1))/syn.rate}
function rollCardDrop(e){const base=e.boss?1:e.mini?.35:e.type==='armor'?.055:.02;const chance=base+(save.keepUpgrades.fortune||0)*.0015;if(Math.random()>chance)return;const eligible=CARD_POOL.filter(c=>c.type!=='hero'||Math.random()<.35);const found=eligible[Math.floor(Math.random()*eligible.length)];const item=inv(found.id);item.copies++;item.recent=true;item.lastFound=Date.now();G.runDrops.push(found.id);save.stats.totalCards++;saveProgress();showCardDrop(found,item);}
function showCardDrop(c,item){const b=$('#dropBanner');if(!b)return;b.className='drop-banner rarity-common';b.innerHTML=`<div>✦ COMMON CARD DROP ✦</div><strong>${c.icon} ${c.name}</strong><div class="small">Common copy · ${item.copies} copies${item.copies>=3?' · MERGE READY':''}</div>`;b.classList.remove('hidden');setTimeout(()=>b.classList.add('hidden'),1800);playTone(660,.18,'triangle',.06)}
function hit(e,d,shot=null){e.hitFlash=.11;e.hitKick=Math.min(.16,(e.hitKick||0)+.055);if(e.holyOnly&&!shot?.holy)d*=.22;if(e.armor&&!shot?.holy)d*=1-e.armor;const crit=shot?.source==null&&G.hero&&Math.random()<G.hero.crit;if(crit){d*=1.75;G.shake=Math.max(G.shake,4);G.flash=Math.max(G.flash,.08)}e.hp-=d;floatText(e.x,e.y-.25,`${crit?'CRIT ':''}${Math.max(1,Math.round(d))}`,crit?'#ffe36e':(d<5?'#9aa0aa':'#fff'));if(e.hp<=0&&!e.dead){e.dead=true;if((e.boss||e.elite)&&navigator.vibrate)navigator.vibrate(e.boss?[35,30,55]:25);G.kills++;G.killChain++;G.comboTimer=2.4;G.comboBest=Math.max(G.comboBest||0,G.killChain);const essenceGain=Math.max(1,Math.round(e.reward/7));spawnEssencePickup(e,essenceGain);
 const comboNames={2:'DOUBLE KILL',3:'TRIPLE KILL',5:'HOLY PURGE',8:'UNDEAD SLAUGHTER',12:'NIGHT CLEANSER'};if(comboNames[G.killChain]){floatText(GRID.cols/2,1.7,comboNames[G.killChain],'#ffe28a');G.shake=Math.max(G.shake,5);playTone(420+G.killChain*18,.12,'triangle',.045)}G.xp++;floatText(e.x,e.y,'+'+essenceGain+' essence','#d8c7ff');playTone(120+Math.random()*45,.05,'square',.018);grantTowerXp(shot?.source,1);rollCardDrop(e);enemyDeath(e);if(G.relic?.id==='ring'&&G.killChain%5===0)for(const o of G.enemies){if(!o.dead&&o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<1.5)o.hp-=24}if(e.mini){G.miniBossDefeated=true;awardRelic()}if(G.xp>=G.xpNeed){G.xp-=G.xpNeed;G.level++;G.xpNeed=Math.ceil(G.xpNeed*1.35);G.gold+=6}}}
function weightedChoices(pool,count=3){
 const available=[...pool],out=[];
 while(out.length<count&&available.length){
  const total=available.reduce((a,c)=>a+(G.drawWeights[c.id]??1),0);let r=Math.random()*total,idx=0;
  for(;idx<available.length;idx++){r-=G.drawWeights[available[idx].id]??1;if(r<=0)break}
  out.push(available.splice(Math.min(idx,available.length-1),1)[0]);
 }
 return out;
}
function renderEssenceVial(){
 if(!G)return;
 $('#goldTxt').textContent=`${Math.floor(G.essence)} / ${G.maxEssence}`;
 const ef=document.querySelector('.essence-fill');if(ef)ef.style.width=`${Math.min(100,100*G.essence/G.maxEssence)}%`;
 const pill=document.querySelector('.essence-pill');if(pill)pill.classList.toggle('vial-full',G.essence>=G.maxEssence);
}
function triggerEssenceDraft(opening=false){
 if(!G||G.state!=='play'||G.draftOpen)return;
 G.draftOpen=true;renderEssenceVial();
 showWaveReward(G.wave,opening);
}
function showWaveReward(completedWave,opening=false){
 G.paused=true;G.pendingWave=true;G.pendingCard=null;G.draftOpen=true;
 // Opening draft must establish a real defense: all three choices are placeable towers.
 // Support, skill, hero, and road-system cards return on later Essence drafts.
 const openingPool=G.hand.filter(c=>c.type==='tower');
 let baseChoices=weightedChoices(opening&&openingPool.length>=3?openingPool:G.hand,3);const roadInChoices=baseChoices.some(c=>c.id==='roadSystem');if(!roadInChoices&&G.roadMisses>=Math.max(1,2-(G.hero.def?.bonus.roadPity||0))){baseChoices[2]={...ROAD_SYSTEM};G.roadMisses=0}else if(roadInChoices)G.roadMisses=0;else G.roadMisses++;const choices=baseChoices.map(c=>Math.random()<.16&&c.type==='tower'?{...c,elite:true,name:'Elite '+c.name,desc:c.desc+' Deploys with +50% damage.'}:({...c}));
 const box=$('#choicesCards');box.innerHTML='';
 $('#rewardTitle').textContent=opening?'Choose Your Opening Defense':'Essence Vial Full';
 $('#rewardText').textContent=opening?'The vial begins full. Choose one card, then spend Essence only on that card until the next draft.':'Choose one card. Until the vial fills again, only that card may be placed — as many times as your Essence allows.';
 choices.forEach(c=>{
  c.drawWeight=G.drawWeights[c.id]??1;
  const el=document.createElement('button');const rewardRarity=c.hiddenSystem?'common':inv(c.id).rarity;el.className=`card portrait-card draft-choice-card rarity-${rewardRarity}${c.elite?' elite-card':''}`;el.innerHTML=draftCardHTML(c);
  el.addEventListener('click',()=>{
   G.pickCounts[c.id]=(G.pickCounts[c.id]||0)+1;G.drawWeights[c.id]=Math.max(.015625,(G.drawWeights[c.id]??1)/2);
   UI.choices.classList.add('hidden');playTone(c.elite?520:390,.12,'triangle',.05);
   const chosen=c.id==='roadSystem'?{...ROAD_PIECES[Math.floor(Math.random()*ROAD_PIECES.length)]}:c;
   G.activeDraftCard={...chosen};G.draftOpen=false;renderHand();
   if(chosen.type==='booster'||chosen.type==='hero'){G.paused=false;G.pendingWave=false;selectEssenceCard(chosen);return;}
   if(!preparePlacement(chosen)){
    showToast('That road shape has no legal placement — drawing a replacement');G.activeDraftCard=null;G.draftOpen=true;renderHand();
    setTimeout(()=>showWaveReward(completedWave,opening),250);return;
   }
   showToast(chosen.type==='skill'?`Tap the battlefield to cast ${chosen.name}`:`Place ${chosen.name}`);
  });box.append(el);
 });UI.choices.classList.remove('hidden');playTone(130,.25,'sine',.04);
}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*2.5;G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.7,color})}G.shake=Math.min(8,G.shake+2)}
function update(dt){
 if(!G||G.state!=='play'||G.paused)return;dt*=G.speed;G.time+=dt;if(G.comboTimer>0){G.comboTimer-=dt;if(G.comboTimer<=0)G.killChain=0;}G.shake*=.88;G.flash=Math.max(0,G.flash-dt);G.cameraPulse=Math.max(0,(G.cameraPulse||0)-dt*2.2);for(const a of G.ambient||[]){a.x+=a.v*dt;if(a.x>GRID.cols+1)a.x=-1;a.phase+=dt*(.5+a.v)}
 G.spawnTimer-=dt;if(G.spawnLeft>0&&G.spawnTimer<=0){spawnEnemy();G.spawnLeft--;G.spawnTimer=Math.max(.24,(1.15-G.wave*.025)*.88)}
 if(G.spawnLeft===0&&G.enemies.length===0&&!G.pendingWave){G.waveDelay-=dt;if(G.waveDelay<=0){if(G.mode!=='endless'&&G.wave>=G.chapterWaves){chapterClear();return;}G.wave++;G.spawnLeft=7+Math.floor(G.wave*1.05);G.waveDelay=2;G.spawnTimer=.6;showWaveBanner(G.wave,G.wave===G.chapterWaves?'BOSS WAVE':'WAVE');showToast(`WAVE ${G.wave} · Fill the vial to draft another defense`)}}
 const outer=G.path.at(-1);const points=[{x:outer.x+.5,y:outer.y+1.4},...[...G.path].reverse().map(p=>({x:p.x+.5,y:p.y+.5})),{x:CATHEDRAL.gateX,y:CATHEDRAL.gateY}];
 for(const e of G.enemies){if(e.dead)continue;e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.hitKick=Math.max(0,(e.hitKick||0)-dt*1.8);if(e.freeze>0){e.freeze-=dt;continue}if(e.burn>0){e.burn-=dt;hit(e,4*dt,{holy:false})}if(e.attacking){e.attackTimer-=dt;if(e.attackTimer<=0){e.attackTimer=e.attackRate||1.18;G.hp-=e.attackDamage||1;G.shake=Math.max(G.shake,e.boss?13:7);G.flash=Math.max(G.flash,e.boss?0.16:0.06);floatText(CATHEDRAL.gateX,CATHEDRAL.gateY-.35,`-${e.attackDamage||1} GATE`,'#ff6b78');playTone(e.boss?75:95,.08,'sawtooth',.035);}continue;}if((e.boss||e.mini)&&e.summonTimer>0){e.summonTimer-=dt;if(e.summonTimer<=0){e.summonTimer=e.boss?5:4;const outer=G.path.at(-1);const summonType=e.type==='thornbeast'?'wolf':e.type==='bloodcount'?'vampire':'skeleton';const summonCount=e.type==='icebishop'?2:(e.boss?3:2);for(let i=0;i<summonCount;i++)G.enemies.push({x:outer.x+.5,y:outer.y+1.4,seg:0,prog:0,hp:78*(1+G.wave*.18),max:78*(1+G.wave*.18),speed:.62,reward:3,type:summonType,name:summonType==='wolf'?'Thorn Wolf':summonType==='vampire'?'Blood Spawn':'Summoned Bone',slow:1,freeze:0,burn:0,dead:false,attacking:false,attackTimer:0,attackRate:1.22,attackDamage:1});if(e.type==='icebishop'){for(const t of G.towers)t.t+=1.25;G.flash=.35;}showToast(e.boss?(e.type==='icebishop'?'The Frozen Bishop locks the towers in frost!':e.type==='thornbeast'?'The Thornbound Beast calls its pack!':e.type==='bloodcount'?'The Blood Count summons his spawn!':'The Warden summons reinforcements!'):'Necromancer raises the dead!')}}const a=points[e.seg],b=points[e.seg+1];if(!b){e.attacking=true;e.attackTimer=.35;e.x=CATHEDRAL.gateX;e.y=CATHEDRAL.gateY;continue}const len=Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y)),spd=e.speed*(e.slow||1);e.prog+=spd*dt/len;while(e.prog>=1){e.prog-=1;e.seg++;if(e.seg>=points.length-1){e.seg=points.length-1;e.prog=0;e.attacking=true;e.attackTimer=.35+Math.random()*.2;e.x=CATHEDRAL.gateX;e.y=CATHEDRAL.gateY;G.shake=Math.max(G.shake,5);break}}if(!e.dead&&!e.attacking){const aa=points[e.seg],bb=points[e.seg+1];e.x=aa.x+(bb.x-aa.x)*e.prog;e.y=aa.y+(bb.y-aa.y)*e.prog;e.slow+=(1-e.slow)*dt*1.5}}
 for(const trap of G.traps){trap.t-=dt;const victims=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-(trap.x+.5),e.y-(trap.y+.5))<.62);if(trap.id==='oilTrap')for(const e of victims)e.slow=Math.min(e.slow,trap.slow||.58);if(trap.t<=0&&victims.length){for(const e of victims){hit(e,trap.damage,{holy:trap.id!=='oilTrap'});if(trap.id==='oilTrap'&&Math.random()<.22)e.burn=2.4}burst(trap.x+.5,trap.y+.5,trap.color,5);trap.t=trap.rate}}
 for(const t of G.towers){if(t.supportOnly)continue;t.t-=dt;if(t.t<=0){const e=targetFor(t);if(e)fire(t,e)}}
 // V25.6: Kael is an autonomous defender during battle. He patrols in
 // front of the cathedral, turns toward nearby threats, and attacks alone.
 const patrolCenter={x:CATHEDRAL.gateX,y:CATHEDRAL.gateY+1.15};
 let heroTarget=null,heroTargetDistance=Infinity;
 for(const enemy of G.enemies){
  if(enemy.dead)continue;
  const distance=Math.hypot(enemy.x-G.hero.x,enemy.y-G.hero.y);
  if(distance<heroTargetDistance){heroTarget=enemy;heroTargetDistance=distance}
 }
 let targetX=patrolCenter.x+Math.sin(G.time*.72)*1.05;
 let targetY=patrolCenter.y+Math.sin(G.time*1.13)*.42;
 if(heroTarget&&heroTargetDistance<G.hero.range*1.65){
  const dx=heroTarget.x-patrolCenter.x,dy=heroTarget.y-patrolCenter.y,len=Math.hypot(dx,dy)||1;
  targetX=patrolCenter.x+dx/len*Math.min(1.15,len);
  targetY=patrolCenter.y+dy/len*Math.min(.8,len);
 }
 const hdx=targetX-G.hero.x,hdy=targetY-G.hero.y,hd=Math.hypot(hdx,hdy);
 if(hd>.08){
  const step=Math.min(hd,1.42*dt);
  G.hero.x+=hdx/hd*step;G.hero.y+=hdy/hd*step;G.hero.walking=true;
  G.hero.facing=Math.abs(hdx)>Math.abs(hdy)?(hdx<0?'left':'right'):(hdy<0?'up':'down');
 }else G.hero.walking=false;
 if(heroTarget&&heroTargetDistance<G.hero.range*1.3){
  const dx=heroTarget.x-G.hero.x,dy=heroTarget.y-G.hero.y;
  G.hero.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
 }
 G.hero.anim=(G.hero.anim||0)+dt*(G.hero.walking?7:2.2);
 G.hero.t-=dt;G.hero.frenzy=Math.max(0,G.hero.frenzy-dt);if(G.hero.t<=0){let best=null,bd=G.hero.range;for(const e of G.enemies){const d=Math.hypot(e.x-G.hero.x,e.y-G.hero.y);if(d<bd){best=e;bd=d}}if(best){G.shots.push({x:G.hero.x,y:G.hero.y,target:best,speed:9,damage:G.hero.damage*(G.hero.frenzy?2:1),color:'#fff2c5',holy:G.hero.holy,life:2});G.hero.t=G.hero.rate*(G.hero.frenzy?.45:1)}}
 for(const s of G.shots){s.life-=dt;if(!s.target||s.target.dead){s.life=0;continue}const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);if(d<s.speed*dt+.15){if(s.source&&!enemyInsideTowerAOE(s.source,s.target)){s.life=0;continue}if(s.aoe)G.enemies.forEach(e=>{if(!e.dead&&Math.hypot(e.x-s.target.x,e.y-s.target.y)<s.aoe&&(!s.source||enemyInsideTowerAOE(s.source,e))){hit(e,s.damage,s);if(s.burn)e.burn=s.burn}});else {hit(s.target,s.damage,s);if(s.kind==='scripture'&&s.chain>0){let from=s.target;const struck=new Set([s.target]);for(let jump=0;jump<s.chain;jump++){const next=G.enemies.filter(e=>!e.dead&&!struck.has(e)&&(!s.source||enemyInsideTowerAOE(s.source,e))&&Math.hypot(e.x-from.x,e.y-from.y)<1.25).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];if(!next)break;G.shots.push({x:from.x,y:from.y,px:from.x,py:from.y,target:next,speed:15,damage:s.damage*.62,color:'#fff3a6',holy:true,source:s.source,kind:'scripture',life:.75,chain:0});struck.add(next);from=next;}}}if(s.slow)s.target.slow=Math.min(s.target.slow,s.slow);burst(s.target.x,s.target.y,s.color,s.kind==='scripture'?9:5);s.life=0}else{s.px=s.x;s.py=s.y;s.x+=dx/d*s.speed*dt;s.y+=dy/d*s.speed*dt}}
 for(const p of G.particles){p.life-=dt;if(p.kind==='soul'){p.phase=(p.phase||0)+dt*8;p.x+=((p.vx||0)+Math.sin(p.phase)*.16)*dt;p.y+=(p.vy||-.6)*dt;p.vy-=.12*dt}else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=1.3*dt}}for(const f of G.floaters){f.life-=dt;f.y+=f.vy*dt}
 G.enemies=G.enemies.filter(e=>!e.dead);G.shots=G.shots.filter(s=>s.life>0);G.particles=G.particles.filter(p=>p.life>0);G.floaters=G.floaters.filter(f=>f.life>0);
 if(G.hp<=0)endGame();
 const boss=G.enemies.find(e=>(e.boss||e.mini)&&!e.dead);
 $('#bossWrap').classList.toggle('hidden',!boss);
 if(boss){$('#bossName').textContent=boss.name;$('#bossHpTxt').textContent=`${Math.ceil(100*boss.hp/boss.max)}%`;$('#bossBar').style.width=`${Math.max(0,100*boss.hp/boss.max)}%`;}
 $('#hpTxt').textContent=G.hp;renderEssenceVial();$('#waveTxt').textContent=`${G.wave} / ${G.chapterWaves}`;$('#killTxt').textContent=G.kills;$('#xpBar').style.width=`${100*G.xp/G.xpNeed}%`;

}
function grantEndChest(victory){const quality=victory?'Legendary Eclipse Chest':G.wave>=7?'Epic Reliquary':G.wave>=4?'Rare Coffer':'Common Cache';const count=victory?3:G.wave>=7?2:1;const rewards=[];for(let i=0;i<count;i++){const pool=CARD_POOL.filter(c=>save.unlocked.includes(c.id)&&inv(c.id).copies>0),c=pool[Math.floor(Math.random()*pool.length)],item=inv(c.id);item.copies++;item.recent=true;item.lastFound=Date.now();rewards.push('Common '+c.name)}return {quality,rewards}}
function recordRun(result,earned,chest){save.runHistory.unshift({date:Date.now(),result,wave:G.wave,kills:G.kills,hero:save.selectedHero,deck:[...save.deck],drops:[...G.runDrops],chest:chest.quality,map:G.map.name});save.runHistory=save.runHistory.slice(0,20);save.bestWave=Math.max(save.bestWave,G.wave);save.essence+=earned;save.materials.bloodEssence=save.essence;save.stats.runs++;save.stats.totalKills+=G.kills;save.stats.highestWave=Math.max(save.stats.highestWave,G.wave);if(result==='victory'){save.stats.wins++;save.stats.bosses++;save.materials.eclipseShards+=2;save.materials.ancientRelics+=1;save.materials.hunterMedallions+=1;save.materials.forgeEmbers+=3}else if(G.miniBossDefeated){save.materials.eclipseShards+=1;save.materials.forgeEmbers+=1}saveProgress()}
function chapterClear(){
 AUDIO.setState('victory',true);AUDIO.sting('victory');
 if(!G||G.chapterCleared)return;
 G.chapterCleared=true;G.state='over';UI.hud.classList.add('hidden');$('#bossWrap').classList.add('hidden');
 const earned=Math.floor(G.kills/2)+35;
 const firstClear=!!G.chapter&&!save.campaign.completed.includes(G.chapter.id);
 const earnedStars=G.chapter?(1+(G.hp/G.maxHp>=.8?1:0)+(G.hp>=G.maxHp?1:0)):0;
 if(G.chapter)save.campaign.stars[G.chapter.id]=Math.max(Number(save.campaign.stars[G.chapter.id])||0,earnedStars);
 const newlyUnlocked=[];
 if(G.chapter){
  // Record completion first, then grant/reconcile every promised reward. This also repairs old broken clears.
  if(firstClear)save.campaign.completed.push(G.chapter.id);
  for(const id of CHAPTER_CARD_UNLOCKS[G.chapter.id]||[]){
   const wasAvailable=save.unlocked.includes(id)&&inv(id).copies>0;
   if(!save.unlocked.includes(id))save.unlocked.push(id);
   const item=inv(id);if(item.copies<1)item.copies=1;item.recent=true;item.lastFound=Date.now();
   if(!wasAvailable)newlyUnlocked.push(card(id));
  }
  save.campaign.unlocked=Math.min(CHAPTERS.length,Math.max(save.campaign.unlocked,G.chapter.number+1));
  const relicId=G.chapter.relic;if(!save.unlockedRelics.includes(relicId))save.unlockedRelics.push(relicId);
 }
 const repaired=reconcileCardUnlocks();
 for(const c of repaired)if(!newlyUnlocked.some(x=>x.id===c.id))newlyUnlocked.push(c);
 const chest=grantEndChest(true);
 recordRun('victory',earned,chest);
 const unlockHtml=newlyUnlocked.length?`<br><br><strong>NEW CARDS UNLOCKED</strong><br>${newlyUnlocked.map(c=>`${c.icon} ${c.name}`).join('<br>')}`:'<br><br><em>Chapter rewards already owned — duplicate cards added to your chest.</em>';
 $('#endTitle').textContent=(G.chapter?.boss.name||'The Eclipse Warden')+' Has Fallen';
 $('#endStats').innerHTML=`Waves survived: <strong>${G.wave}</strong><br>Monsters slain: <strong>${G.kills}</strong><br>Blood Essence: <strong>+${earned}</strong><br>Run drops: <strong>${G.runDrops.length}</strong><br>Mission rating: <strong>${'★'.repeat(earnedStars)}${'☆'.repeat(3-earnedStars)}</strong>${unlockHtml}<br><br><strong>${chest.quality}</strong><br>${chest.rewards.join('<br>')}`;
 UI.over.classList.remove('hidden');
 if(newlyUnlocked.length)setTimeout(()=>showToast(`Unlocked: ${newlyUnlocked.map(c=>c.name).join(' + ')}`),500);
 burst(GRID.cols/2,GRID.rows/2,'#ffe7a4',120);
}
function endGame(){AUDIO.setState('defeat',true);AUDIO.sting('defeat');G.state='over';UI.hud.classList.add('hidden');$('#bossWrap').classList.add('hidden');const earned=Math.floor(G.kills/3),chest=grantEndChest(false);recordRun('defeat',earned,chest);$('#endTitle').textContent='The Last Keep Has Fallen';$('#endStats').innerHTML=`Wave reached: <strong>${G.wave}</strong><br>Monsters slain: <strong>${G.kills}</strong><br>Blood Essence: <strong>+${earned}</strong><br>Run drops: <strong>${G.runDrops.length}</strong><br><br><strong>${chest.quality}</strong><br>${chest.rewards.join('<br>')}`;UI.over.classList.remove('hidden')}
function drawScenery(map,gw,gh){
 const t=G?.time||0;
 if(map.id==='cemetery'){
  ctx.fillStyle='#28242b';for(let i=0;i<18;i++){const x=(i*79+33)%gw,y=(i*113+70)%gh;ctx.fillRect(x,y,16,25);ctx.beginPath();ctx.arc(x+8,y,8,Math.PI,0);ctx.fill();ctx.strokeStyle='#64706f55';ctx.beginPath();ctx.moveTo(x+8,y+5);ctx.lineTo(x+8,y+18);ctx.moveTo(x+3,y+11);ctx.lineTo(x+13,y+11);ctx.stroke()}
  ctx.fillStyle='#9de8dc22';for(let i=0;i<9;i++){const x=(i*131+t*8)%gw,y=40+(i*67)%Math.max(80,gh-90);ctx.beginPath();ctx.arc(x,y,5+2*Math.sin(t*2+i),0,7);ctx.fill()}
 }else if(map.id==='forest'){
  for(let i=0;i<16;i++){const x=(i*61+20)%gw,y=(i*97+20)%gh;ctx.fillStyle='#07110f';ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x+24,y+18);ctx.lineTo(x-24,y+18);ctx.fill();ctx.fillStyle='#2e4d43';ctx.fillRect(x-3,y+12,6,22)}
  ctx.fillStyle='#b8f5a822';for(let i=0;i<24;i++){const x=(i*91+t*13)%gw,y=(i*53)%gh;ctx.fillRect(x,y,2,2)}
 }else if(map.id==='village'){
  for(let i=0;i<8;i++){const x=(i*137+20)%gw,y=gh-72-(i%3)*40;ctx.fillStyle='#241713';ctx.fillRect(x,y,58,46);ctx.fillStyle='#120b0a';ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+29,y-28);ctx.lineTo(x+65,y);ctx.fill();ctx.fillStyle='#f3974a55';ctx.fillRect(x+12,y+17,8,11)}
  ctx.fillStyle='#d5753f44';for(let i=0;i<10;i++){const x=(i*109)%gw,y=gh-20-(i%2)*20;ctx.beginPath();ctx.arc(x,y,4+2*Math.sin(t*4+i),0,7);ctx.fill()}
 }else{
  ctx.strokeStyle='#86b9d055';ctx.lineWidth=3;for(let i=0;i<10;i++){const x=(i*91+40)%gw;ctx.beginPath();ctx.moveTo(x,gh);ctx.lineTo(x+15,gh-70);ctx.lineTo(x+35,gh);ctx.stroke()}
  ctx.fillStyle='#cbeeff66';for(let i=0;i<70;i++){const x=(i*47+t*18)%gw,y=(i*83+t*22)%gh;ctx.fillRect(x,y,2,2)}ctx.lineWidth=1;
 }
}
function drawCobblestoneTile(px,py,map,index){
 const seed=(index*37)%11;ctx.save();ctx.translate(px,py);
 const g=ctx.createLinearGradient(0,0,58,58);g.addColorStop(0,'#514850');g.addColorStop(1,'#26232b');ctx.fillStyle=g;ctx.fillRect(3,3,58,58);
 ctx.strokeStyle=(map.accent||'#9b6a83')+'77';ctx.lineWidth=1.5;ctx.strokeRect(4.5,4.5,55,55);
 ctx.strokeStyle='#17141a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,19+seed);ctx.lineTo(30,15);ctx.lineTo(58,20-seed*.3);ctx.moveTo(8,43-seed*.2);ctx.lineTo(35,39+seed*.2);ctx.lineTo(57,45);ctx.moveTo(23,5);ctx.lineTo(20,58);ctx.moveTo(47,5);ctx.lineTo(43,58);ctx.stroke();
 ctx.strokeStyle='#9a8b9555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(8,18+seed);ctx.lineTo(30,14);ctx.moveTo(8,42-seed*.2);ctx.lineTo(35,38+seed*.2);ctx.stroke();
 if(index%4===0){ctx.fillStyle='#42131d99';ctx.beginPath();ctx.ellipse(42,33,9,3,-.25,0,7);ctx.fill()}
 if(index%3===0){ctx.fillStyle='#334437aa';ctx.fillRect(7,50,12,3);ctx.fillRect(10,46,3,8)}ctx.restore();
}
function drawCathedralGate(){
 const hp=Math.max(0,Math.min(1,(G?.hp||20)/20));ctx.save();ctx.translate(CATHEDRAL.drawX,CATHEDRAL.drawY);ctx.shadowColor='#000';ctx.shadowBlur=24;
 ctx.fillStyle='#0b0810';ctx.fillRect(0,0,122,205);ctx.shadowBlur=0;
 ctx.fillStyle='#211822';ctx.strokeStyle='#8f5165';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(8,72);ctx.lineTo(24,32);ctx.lineTo(38,54);ctx.lineTo(61,2);ctx.lineTo(84,54);ctx.lineTo(98,32);ctx.lineTo(114,72);ctx.lineTo(114,202);ctx.lineTo(8,202);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#131018';ctx.fillRect(16,78,90,124);ctx.strokeStyle='#6d3e50';ctx.strokeRect(16,78,90,124);
 ctx.fillStyle='#08070b';ctx.beginPath();ctx.moveTo(31,202);ctx.lineTo(31,122);ctx.quadraticCurveTo(61,82,91,122);ctx.lineTo(91,202);ctx.closePath();ctx.fill();ctx.strokeStyle='#ba6476';ctx.stroke();
 ctx.fillStyle='#9d263d';ctx.fillRect(13,80,8,75);ctx.fillRect(101,80,8,75);ctx.fillStyle='#d7b268';ctx.fillRect(13,80,8,8);ctx.fillRect(101,80,8,8);
 const flame=(G?.time||0);for(const tx of [25,97]){ctx.save();ctx.translate(tx,118);ctx.fillStyle='#d66b2d';ctx.shadowColor='#ff9a3c';ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(0,12);ctx.quadraticCurveTo(-8,1,0,-10-3*Math.sin(flame*8+tx));ctx.quadraticCurveTo(9,2,0,12);ctx.fill();ctx.restore()}
 ctx.shadowBlur=0;ctx.fillStyle='#d8c7ad';ctx.font='22px Georgia';ctx.textAlign='center';ctx.fillText('✠',61,66);
 if(hp<.75){ctx.strokeStyle='#180d13';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(36,88);ctx.lineTo(45,105);ctx.lineTo(39,123);ctx.lineTo(51,143);ctx.stroke()}
 if(hp<.45){ctx.strokeStyle='#d06b4a66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(83,105);ctx.lineTo(71,126);ctx.lineTo(78,151);ctx.lineTo(66,176);ctx.stroke();ctx.fillStyle='#2a0f16aa';ctx.fillRect(100,145,9,31)}
 ctx.restore();ctx.lineWidth=1;
}
function drawTowerVisual(t,x,y){
 const pulse=.5+.5*Math.sin((G?.time||0)*3+t.x);
 ctx.save();ctx.translate(x,y);ctx.scale(1.18,1.18);
 ctx.shadowColor='#000';ctx.shadowBlur=12;ctx.fillStyle='#0d0a10';ctx.strokeStyle=t.elite?'#ffe16d':t.color;ctx.lineWidth=t.elite?4:2;
 if(t.id==='dagger'){ctx.fillRect(-17,-13,34,31);ctx.strokeRect(-17,-13,34,31);ctx.rotate((G.time||0)*.8);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,-26);ctx.stroke()}}
 else if(t.id==='axe'){ctx.fillRect(-18,-12,36,30);ctx.strokeRect(-18,-12,36,30);ctx.rotate(-.25+.08*Math.sin(G.time*4));ctx.fillRect(-3,-30,6,24);ctx.strokeRect(-3,-30,6,24);ctx.beginPath();ctx.arc(6,-30,11,-1.5,1.5);ctx.stroke()}
 else if(t.id==='cross'){ctx.beginPath();ctx.arc(0,3,20,0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=.55+.35*pulse;ctx.fillStyle='#ffe79a';ctx.fillRect(-4,-30,8,40);ctx.fillRect(-14,-18,28,8)}
 else if(t.id==='clock'){ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-14);ctx.moveTo(0,0);ctx.lineTo(10,5);ctx.stroke();ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(0,0,28+pulse*5,0,7);ctx.stroke()}
 else if(t.id==='bone'){ctx.fillRect(-12,-22,24,42);ctx.strokeRect(-12,-22,24,42);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-17+i*15,7,0,7);ctx.stroke()}ctx.fillStyle='#f0d271';ctx.fillRect(-4,-22,3,3);ctx.fillRect(2,-22,3,3)}
 else if(t.id==='familiar'){ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(20,15);ctx.lineTo(-20,15);ctx.closePath();ctx.fill();ctx.stroke();ctx.globalAlpha=.8;for(let i=0;i<3;i++){const a=G.time*1.8+i*2.1;ctx.fillText('⌁',Math.cos(a)*25,Math.sin(a)*10-12)}}
 else if(t.id==='silver'){ctx.fillRect(-22,-15,44,31);ctx.strokeRect(-22,-15,44,31);ctx.fillRect(4,-6,29,12);ctx.strokeRect(4,-6,29,12);ctx.beginPath();ctx.arc(-11,17,7,0,7);ctx.arc(12,17,7,0,7);ctx.stroke()}
 else if(t.id==='scripture'){
  const count=scriptureBibleCount(t);ctx.fillStyle='#18111d';ctx.beginPath();ctx.arc(0,7,20,0,7);ctx.fill();ctx.strokeStyle='#d9b85f';ctx.stroke();ctx.fillStyle='#806027';ctx.fillRect(-13,-4,26,22);ctx.strokeRect(-13,-4,26,22);ctx.fillStyle='#fff0aa';ctx.font='17px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✠',0,7);
  ctx.globalAlpha=.18+.10*pulse;ctx.fillStyle='#ffe58a';ctx.beginPath();ctx.arc(0,2,31,0,7);ctx.fill();ctx.globalAlpha=1;
  for(let i=0;i<count;i++){const a=(G.time||0)*(1.25+.08*t.level)+i*Math.PI*2/count,r=27+2*Math.sin((G.time||0)*2.2+i),bx=Math.cos(a)*r,by=Math.sin(a)*r*.72;ctx.save();ctx.translate(bx,by);ctx.rotate(a+Math.PI/2);ctx.fillStyle='#f3e5b2';ctx.strokeStyle='#9f7b35';ctx.lineWidth=1.2;ctx.fillRect(-7,-5,6,10);ctx.fillRect(1,-5,6,10);ctx.strokeRect(-7,-5,6,10);ctx.strokeRect(1,-5,6,10);ctx.strokeStyle='#d4b65e';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();ctx.restore();}
 } else if(t.id==='garlic'){ctx.fillStyle='#3d5335';ctx.beginPath();ctx.arc(0,7,21,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#e6efc8';for(let i=0;i<5;i++){const a=i*Math.PI*2/5+G.time*.08;ctx.beginPath();ctx.ellipse(Math.cos(a)*11,Math.sin(a)*7-3,7,11,a,0,7);ctx.fill();ctx.stroke()}ctx.fillStyle='#8eb06f';ctx.fillRect(-3,-27,6,14);ctx.globalAlpha=.22+.10*pulse;ctx.fillStyle='#d9efad';ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.fill()}
 else if(t.id==='rosary'){ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=.65;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.arc(Math.cos(a)*14,Math.sin(a)*14,3,0,7);ctx.fillStyle='#f3d59b';ctx.fill()}}
 else{ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(22,20);ctx.lineTo(-22,20);ctx.closePath();ctx.fill();ctx.stroke();ctx.font='23px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(t.icon,0,0)}
 if(t.supports?.some(s=>s.id==='holy')){ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle='#5ec8ff';ctx.beginPath();ctx.arc(0,0,29,0,7);ctx.stroke()}
 if(t.supports?.some(s=>s.id==='freeze')){ctx.globalAlpha=.4;ctx.strokeStyle='#b68cff';ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.stroke()}
 if(t.supports?.some(s=>s.id==='guardian')){ctx.globalAlpha=.28;ctx.strokeStyle='#ffe6a8';ctx.beginPath();ctx.arc(0,0,38,0,7);ctx.stroke()}
 ctx.shadowBlur=0;ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,W,H);const sx=(Math.random()-.5)*(G?.shake||0),sy=(Math.random()-.5)*(G?.shake||0);const map=G?.map||MAPS[0];
 // Full-screen battlefield backdrop: the world now continues behind the tactical grid.
 let screenGr=ctx.createLinearGradient(0,0,0,H);screenGr.addColorStop(0,map.sky||'#100b18');screenGr.addColorStop(.28,map.ground?.[0]||'#17121b');screenGr.addColorStop(1,map.ground?.[1]||'#08070c');ctx.fillStyle=screenGr;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.16;ctx.fillStyle=map.accent||'#8c5b74';for(let i=0;i<28;i++){const px=(i*97+(G?.time||0)*7)%Math.max(W,1),py=oy+GRID.rows*GRID.tile*scale+((i*53)%Math.max(90,H-oy));ctx.beginPath();ctx.arc(px,py,1+(i%3),0,7);ctx.fill()}ctx.globalAlpha=1;
 const cam=cameraTransform();ctx.save();ctx.translate(cam.x+sx,cam.y+sy);ctx.scale(cam.worldScale,cam.worldScale);
 const gw=GRID.cols*GRID.tile,gh=GRID.rows*GRID.tile;let gr=ctx.createLinearGradient(0,0,0,gh);gr.addColorStop(0,map.ground[0]);gr.addColorStop(1,map.ground[1]);ctx.fillStyle=gr;ctx.fillRect(0,0,gw,gh);
 ctx.fillStyle=map.sky;ctx.fillRect(0,0,gw,115);ctx.fillStyle='#f3ebcf33';ctx.beginPath();ctx.arc(gw-88,68,38,0,7);ctx.fill();drawScenery(map,gw,gh);
 ctx.strokeStyle='#5b4a5722';for(let y=0;y<GRID.rows;y++)for(let x=0;x<GRID.cols;x++)ctx.strokeRect(x*64,y*64,64,64);
 if(G){for(const [pi,p] of G.path.entries())drawCobblestoneTile(p.x*64,p.y*64,map,pi);
  const end=G.path.at(-1);ctx.strokeStyle='#ffe18b';ctx.lineWidth=3;ctx.globalAlpha=.55+.4*Math.sin(G.time*4);ctx.strokeRect(end.x*64+6,end.y*64+6,52,52);ctx.globalAlpha=1;ctx.lineWidth=1;
  if(G.pendingCard&&G.hoverTile){const p=G.hoverTile;if(G.pendingCard.type==='roadpiece'){const cells=roadCells(G.pendingCard,p,G.placementRotation),ok=validRoadPiece(G.pendingCard,p,G.placementRotation);ctx.globalAlpha=.62;ctx.fillStyle=ok?'#4fe07a':'#e04b5f';for(const q of cells)ctx.fillRect(q.x*64+5,q.y*64+5,54,54);ctx.globalAlpha=1}else if(G.pendingCard.type==='tower'){const ok=validTowerTile(p.x,p.y);ctx.globalAlpha=.45;ctx.fillStyle=ok?'#56dd82':'#e05262';ctx.beginPath();ctx.arc((p.x+.5)*64,(p.y+.5)*64,26,0,7);ctx.fill();ctx.globalAlpha=1}}
  // Art Renaissance cathedral: a towering, damage-reactive sanctuary.
  drawCathedralGate();
  if(G.selectedTower){const t=G.selectedTower,r=towerCombatRange(t)*64,x=(t.x+.5)*64,y=(t.y+.5)*64,pulse=1+.12*Math.sin((G.time||0)*6);ctx.save();ctx.fillStyle='rgba(126,210,255,.12)';ctx.strokeStyle='rgba(185,238,255,.95)';ctx.lineWidth=2.5;ctx.setLineDash([10,7]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.shadowColor='#8fdcff';ctx.shadowBlur=16;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,18*pulse,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();ctx.restore();}
  for(const trap of G.traps){const x=(trap.x+.5)*64,y=(trap.y+.5)*64;ctx.save();ctx.textAlign='center';ctx.font='30px serif';ctx.globalAlpha=.95;ctx.fillText(trap.icon,x,y+10);ctx.restore()}
  for(const t of G.towers){const x=(t.x+.5)*64,y=(t.y+.5)*64;drawTowerVisual(t,x,y);if(t.supportOnly){ctx.save();ctx.strokeStyle='#ffe58a';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((t.supportTarget.x+.5)*64,(t.supportTarget.y+.5)*64);ctx.stroke();ctx.restore();}ctx.font='11px serif';ctx.textAlign='center';ctx.fillStyle='#ffe69c';ctx.fillText('★'.repeat(Math.min(5,t.level)),x,y+28);if(t.supports?.length){ctx.font='13px serif';t.supports.forEach((s,i)=>{ctx.fillStyle='#15101ddd';ctx.beginPath();ctx.arc(x-14+i*16,y-34,9,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(s.icon,x-14+i*16,y-34)})}}
  const hx=G.hero.x*64,hy=G.hero.y*64;
  if(KAEL_SHEET.complete&&KAEL_SHEET.naturalWidth){const rows={down:0,up:1,right:2,left:3},row=rows[G.hero.facing||'down']??0,frame=G.hero.walking?Math.floor(G.hero.anim||0)%4:0,sw=KAEL_SHEET.naturalWidth/4,sh=KAEL_SHEET.naturalHeight/4,dw=76,dh=76;ctx.save();ctx.globalAlpha=.45;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(hx,hy+17,22,7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.drawImage(KAEL_SHEET,frame*sw,row*sh,sw,sh,hx-dw/2,hy-dh+24,dw,dh);ctx.restore();}else{ctx.fillStyle='#e6d0b4';ctx.beginPath();ctx.arc(hx,hy-10,8,0,7);ctx.fill();ctx.fillStyle='#5d1730';ctx.fillRect(hx-9,hy-2,18,25);}
  for(const e of G.enemies){const x=e.x*64,y=e.y*64,bob=Math.sin(G.time*8+e.x)*2;ctx.save();ctx.translate(x-(e.hitKick||0)*64,y+bob);const size=e.boss?1.65:e.elite?1.25:1;ctx.scale(size,size);ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.fillStyle=e.boss?'#6f244d':e.mini?'#553266':e.type==='armor'?'#6f6256':e.type==='bat'?'#5b416f':e.type==='ghost'?'#a59bd2':e.type==='wolf'?'#54484e':e.type==='vampire'?'#711e38':'#9e9096';if(e.type==='bat'){ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(-22,-10);ctx.lineTo(-13,8);ctx.lineTo(0,1);ctx.lineTo(13,8);ctx.lineTo(22,-10);ctx.closePath();ctx.fill()}else if(e.type==='wolf'){ctx.beginPath();ctx.ellipse(-2,2,17,9,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(10,-4);ctx.lineTo(16,-14);ctx.lineTo(20,-3);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(14,-2,8,0,7);ctx.fill()}else{ctx.beginPath();ctx.arc(0,-4,10,0,7);ctx.fill();ctx.fillRect(-9,5,18,19);ctx.fillRect(-15,9,6,18);ctx.fillRect(9,9,6,18);if(e.type==='armor'||e.boss){ctx.strokeStyle='#b7a88d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-4,13,Math.PI,0);ctx.stroke();ctx.fillStyle='#40353a';ctx.fillRect(-14,2,28,10)}}ctx.shadowBlur=0;ctx.fillStyle='#ff344f';ctx.shadowColor='#ff344f';ctx.shadowBlur=7;ctx.fillRect(-5,-7,3,3);ctx.fillRect(3,-7,3,3);if(e.attacking){ctx.strokeStyle='#ff8b75';ctx.lineWidth=3;ctx.globalAlpha=.55+.35*Math.sin(G.time*10);ctx.beginPath();ctx.moveTo(8,8);ctx.lineTo(22,-3);ctx.stroke();ctx.globalAlpha=1;}if(e.hitFlash>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.min(1,e.hitFlash*8);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,2,20,0,7);ctx.fill()}ctx.shadowBlur=0;ctx.restore();const barY=y-(e.boss?55:e.elite?34:26);ctx.fillStyle='#160b12';ctx.fillRect(x-20,barY,40,5);ctx.fillStyle=e.boss?'#c22d55':'#d94458';ctx.fillRect(x-20,barY,40*Math.max(0,e.hp/e.max),5);ctx.strokeStyle='#000';ctx.strokeRect(x-20,barY,40,5)}
  for(const s of G.shots){const px=s.x*64,py=s.y*64,ang=Math.atan2(s.target.y-s.y,s.target.x-s.x);s.spin=(s.spin||0)+.22;ctx.save();ctx.translate(px,py);ctx.rotate(['dagger','axe','cross'].includes(s.kind)?s.spin:ang);ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.globalAlpha=.9;ctx.lineWidth=2;if(s.kind==='scripture'){const tx=(s.target.x-s.x)*64,ty=(s.target.y-s.y)*64;ctx.strokeStyle='#fff3a6';ctx.shadowColor='#ffe36e';ctx.shadowBlur=10;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,0);const steps=5;for(let j=1;j<steps;j++){const q=j/steps,off=(j%2?1:-1)*(3+Math.sin((G.time||0)*18+j)*2);ctx.lineTo(tx*q+Math.cos(ang+Math.PI/2)*off,ty*q+Math.sin(ang+Math.PI/2)*off)}ctx.lineTo(tx,ty);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff8cf';ctx.beginPath();ctx.arc(0,0,3.5,0,7);ctx.fill()}else if(s.kind==='whip'){ctx.beginPath();ctx.moveTo(-20,0);ctx.quadraticCurveTo(-7,-10,5,0);ctx.quadraticCurveTo(13,8,20,-2);ctx.stroke()}else if(s.kind==='dagger'){ctx.fillRect(-9,-1.5,18,3);ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(4,-4);ctx.lineTo(4,4);ctx.closePath();ctx.fill()}else if(s.kind==='axe'){ctx.fillRect(-2,-10,4,20);ctx.beginPath();ctx.arc(3,-8,8,-1.4,1.4);ctx.stroke()}else if(s.kind==='bone'){ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(0,0,13,0,7);ctx.fill()}else if(s.kind==='cross'){ctx.fillRect(-2,-9,4,18);ctx.fillRect(-7,-3,14,5)}else{ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill()}ctx.restore();ctx.globalAlpha=1}ctx.lineWidth=1;
  for(const a of G.ambient||[]){const ax=a.x*64,ay=(a.y+.18*Math.sin(a.phase))*64;ctx.globalAlpha=.18+.18*Math.sin(a.phase*1.7);ctx.fillStyle=a.kind===0?'#d8b86f':a.kind===1?'#a9c8d0':'#8b6b93';if(a.kind===2){ctx.beginPath();ctx.arc(ax,ay,2.2,0,7);ctx.fill()}else ctx.fillRect(ax,ay,1.5,4);ctx.globalAlpha=1}
  if(Math.sin(G.time*.35)>0.985){ctx.strokeStyle='#161018aa';ctx.lineWidth=2;for(let i=0;i<3;i++){const rx=((G.time*45+i*90)%gw),ry=45+i*10;ctx.beginPath();ctx.moveTo(rx-10,ry);ctx.quadraticCurveTo(rx,ry-8,rx+10,ry);ctx.quadraticCurveTo(rx+20,ry-8,rx+30,ry);ctx.stroke()}ctx.lineWidth=1}
  if(G.weather.id==='rain'){ctx.strokeStyle='#b8d9ff66';for(let i=0;i<55;i++){const x=(i*67+G.time*260)%gw,y=(i*89+G.time*430)%gh;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+18);ctx.stroke()}}
  if(G.weather.id==='fog'){ctx.fillStyle='#c7d6d722';for(let i=0;i<5;i++){const x=((i*190+G.time*18)%(gw+260))-130;ctx.beginPath();ctx.ellipse(x,gh*(.25+i*.15),150,28,0,0,7);ctx.fill()}}
  if(G.weather.id==='blood'){ctx.fillStyle='#a9152530';ctx.fillRect(0,0,gw,gh);ctx.fillStyle='#ce324455';ctx.beginPath();ctx.arc(gw-88,68,38,0,7);ctx.fill()}
  for(const p of G.particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.color;if(p.kind==='soul'){ctx.shadowColor=p.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x*64,p.y*64,2.2+Math.max(0,p.life),0,7);ctx.fill();ctx.shadowBlur=0}else ctx.fillRect(p.x*64,p.y*64,3,3)}for(const f of G.floaters){ctx.globalAlpha=Math.max(0,f.life);ctx.fillStyle=f.color;ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText(f.text,f.x*64,f.y*64)}ctx.globalAlpha=1;
 }
 ctx.restore();if(G?.flash){ctx.fillStyle=`rgba(220,210,255,${G.flash})`;ctx.fillRect(0,0,W,H)}
}

function renderInspector(){const el=$('#towerInspector');if(!G?.selectedTower){el.classList.add('hidden');return}const t=G.selectedTower,syn=synergyFor(t);el.classList.remove('hidden');el.innerHTML=`<button id="closeInspect" class="inspect-close">×</button><h3>${t.icon} ${t.name}</h3><div>Level <b>${t.level}</b>${t.elite?' · ELITE':''}</div><div>Damage <b>${Math.round(t.damage*t.level*G.globalDamage)}</b></div><div>AOE radius <b>${towerCombatRange(t).toFixed(2)} tiles</b></div><div>Attack <b>${(1/t.rate).toFixed(1)}/s${t.id==='scripture'?` · ${scriptureBibleCount(t)} Bibles`:''}</b></div><div>XP <b>${Math.floor(t.xp||0)} / ${t.xpNeed}</b></div><div>Card <b>${rarityDef(inv(t.id).rarity).name} · ${Math.round((t.permanentPower||1)*100)}%</b></div><div>Supports <b>${(t.supports||[]).map(s=>s.icon+' '+s.name).join(', ')||'None'}</b></div><div class="synergy-line">${syn.damage>1||syn.range>1||syn.rate>1?'✦ Synergy active':'No active synergy'}</div>`;$('#closeInspect').onclick=()=>{G.selectedTower=null;renderInspector()}}
function loop(now){const dt=Math.min(.033,(now-(G?.last||now))/1000);if(G)G.last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
function setBattleMode(active){document.body.classList.toggle('battle-mode',!!active)}
function updateBottomNav(screen){
 const map={menu:'home',campaignScreen:'campaign',deckScreen:'cards',heroesScreen:'heroes',kingdomScreen:'more',relicVaultScreen:'relics',moreScreen:'more',upgradesScreen:'more',forgeScreen:'more',codexScreen:'more',profileScreen:'more',achievementsScreen:'more'};
 document.querySelectorAll('#bottomNav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===map[screen?.id]));
}
function openScreen(screen){
 [UI.menu,UI.deck,$('#collectionScreen'),$('#campaignScreen'),$('#relicVaultScreen'),$('#heroesScreen'),$('#upgradesScreen'),$('#forgeScreen'),$('#codexScreen'),$('#profileScreen'),$('#cardInspectScreen'),$('#kingdomScreen'),$('#achievementsScreen'),$('#moreScreen')].forEach(s=>s?.classList.add('hidden'));
 UI.choices.classList.add('hidden');UI.over.classList.add('hidden');UI.hud.classList.add('hidden');setPlacementUI(null);
 screen.classList.remove('hidden');
 document.body.classList.toggle('cards-native-scroll',screen===UI.deck);
 setBattleMode(false);updateBottomNav(screen);if(screen===UI.menu)renderRoyalHome();
 const musicState=screen===UI.menu?'menu':screen?.id==='campaignScreen'?'campaign':'menu';AUDIO.setState(musicState);
}
function renderCollection(){renderDeck()}
function attackPattern(c){
 const map={axe:{title:'Rainbow Arc',html:'<div class="arc-demo"><span class="demo-tower">🪓</span><i></i><b>🦇</b><em>●</em></div>',text:'Throws a heavy axe through a high curved arc. It pierces clustered ground enemies and can strike flying bats along the arc.'},dagger:{title:'Rapid Line Volley',html:'<div class="line-demo"><span>🗡️</span><i>➤ ➤ ➤</i><b>●</b></div>',text:'Rapid straight projectiles with excellent attack speed. Best for steady single-target damage and air defense.'},whip:{title:'Chain Sweep',html:'<div class="line-demo"><span>⛓️</span><i>⌁⌁⌁</i><b>● ●</b></div>',text:'Sweeps a short chain across nearby targets and excels at general defense.'},cross:{title:'Returning Path',html:'<div class="return-demo"><span>✝️</span><i>→ → ↩</i><b>●</b></div>',text:'The holy blade travels outward, then returns through enemies for a possible second hit.'},silver:{title:'Explosive Parabola',html:'<div class="arc-demo"><span>💥</span><i></i><b>●●●</b></div>',text:'Launches a slow shell in an arc that explodes across a clustered group.'},garlic:{title:'Pungent Aura',html:'<div class="line-demo"><span>🧄</span><i>◉ ◉ ◉</i><b>●●●</b></div>',text:'Continuously damages and slows every undead enemy inside its circular aura. Excellent beside bends and crowded road sections.'},familiar:{title:'Seeking Flight',html:'<div class="line-demo"><span>🦇</span><i>⌁ ↗ ⌁</i><b>●</b></div>',text:'Summoned familiars seek distant targets and naturally engage airborne enemies.'},scripture:{title:'Living Word Field',html:'<div class="line-demo"><span>📖</span><i>⚡ ✦ ⚡</i><b>● ● ●</b></div>',text:'Living Bibles orbit the tower and independently strike enemies inside its sacred field. Every level adds another Bible; level 3 and above chains holy lightning.'}};
 return map[c.id]||{title:c.type==='support'?'Tower Infusion':'Attack Profile',html:`<div class="line-demo"><span>${c.icon}</span><i>✦ ✦ ✦</i><b>●</b></div>`,text:c.desc};
}
function cardMetrics(c){if(c.type==='tower')return [['Damage',c.damage||0],['Range',(c.range||0).toFixed(1)+' tiles'],['Attack speed',(1/(c.rate||1)).toFixed(2)+'/s'],['Targets',['axe','dagger','cross','familiar'].includes(c.id)?'Ground + Flying':'Ground']];if(c.type==='support')return [['Role','Tower Support'],['Use','Attach once'],['Effect',c.id==='holy'?'Burn + Splash':c.id==='freeze'?'Slow':'Protection']];if(c.type==='skill')return [['Role','One-use Skill'],['Targeting','Battlefield'],['Cost',c.cost+' souls']];return [['Role','Run-only Hero Upgrade'],['Duration','Current run'],['Cost','Free']];}
function showCardDetail(c){const item=inv(c.id),r=rarityDef(item.rarity),pattern=attackPattern(c),compat=c.type==='support'?'Whip, Dagger, Axe, Cross, Clock, Bone, Familiar, Cannon, Rosary, Garlic, Living Word':c.type==='tower'?'Holy Water Infusion · Chrono Sigil · Guardian Ward':'—',fav=save.favorites.includes(c.id);openScreen($('#cardInspectScreen'));const el=$('#cardDetail');el.innerHTML=`<div class="detail-card-wrap"><article class="card portrait-card detail-card rarity-${item.rarity}">${cardHTML(c,true)}</article></div><div class="detail-copy"><div class="detail-heading"><div class="detail-title-row"><span>${r.name} · Level ${item.level}</span><button id="detailFavorite" class="favorite-button ${fav?'active':''}" type="button">★ ${fav?'Favorited':'Favorite'}</button></div><h2>${c.icon} ${c.name}</h2><p>${c.desc}</p><small class="card-flavor">A relic-bound technique preserved by the last defenders of the kingdom.</small></div><div class="metric-grid">${cardMetrics(c).map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}<div><small>Copies</small><b>${item.copies}</b></div><div><small>Deck Status</small><b>${save.deck.includes(c.id)?'Equipped':'Reserve'}</b></div></div><section class="attack-panel"><h3>${pattern.title}</h3>${pattern.html}<p>${pattern.text}</p></section><section><h3>Support compatibility</h3><p>${compat}</p></section><div class="detail-actions"><button id="detailEquip" class="btn primary">${save.deck.includes(c.id)?'Remove from Deck':'Equip to Deck'}</button>${item.copies>=3?'<button id="detailMerge" class="btn gold">Fuse 3 Copies</button>':''}</div></div>`;$('#detailFavorite').onclick=()=>{toggleFavorite(c.id);showCardDetail(c)};$('#detailEquip').onclick=()=>{const equipped=save.deck.includes(c.id);if(setDeckCard(c.id,!equipped))showCardDetail(c)};if($('#detailMerge'))$('#detailMerge').onclick=()=>{mergeCard(c.id);showCardDetail(c)}}

function renderCampaign(){
 const box=$('#chapterMap');
 const totalStars=Object.values(save.campaign.stars||{}).reduce((a,b)=>a+(Number(b)||0),0);
 $('#campaignProgress').textContent=`${Math.min(save.campaign.unlocked,CHAPTERS.length)} / ${CHAPTERS.length} · ${totalStars} ★`;
 box.innerHTML='<div class="campaign-map-title"><span>THE KINGDOM ROADS</span><strong>Choose the next cursed road</strong></div>';
 CHAPTERS.forEach((ch,index)=>{
  const unlocked=ch.number<=save.campaign.unlocked,done=save.campaign.completed.includes(ch.id),relic=RELICS.find(r=>r.id===ch.relic),stars=Number(save.campaign.stars?.[ch.id])||0;
  const el=document.createElement('article');
  el.className=`chapter-node map-node ${unlocked?'':'locked'} ${done?'completed':''} ${index%2?'map-right':'map-left'}`;
  el.innerHTML=`<div class="map-path-dot">${done?'✓':ch.number}</div><div class="chapter-art" style="--chapter-accent:${(MAPS.find(m=>m.id===ch.map)||MAPS[0]).accent}"><span>${relic?.icon||'☠️'}</span></div><div class="chapter-copy"><span class="section-kicker">CHAPTER ${ch.number}</span><h3>${ch.name}</h3><div class="chapter-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p>${ch.lore}</p><div class="chapter-meta"><span>🌊 ${ch.waves} waves</span><span>☠️ ${ch.boss.name}</span><span>${relic?.icon||'◆'} ${relic?.name||'Relic'}</span></div><div class="star-objectives"><small>★ Clear the road</small><small>★ Keep Cathedral at 80%</small><small>★ Take no Cathedral damage</small></div></div><button class="btn ${unlocked?'primary':''}" ${unlocked?'':'disabled'}>${done?'Replay Road':'Enter Road'}</button>`;
  el.querySelector('button').onclick=()=>{if(!unlocked)return;save.campaign.selected=ch.id;saveProgress();freshGame('chapter',ch.id)};
  box.append(el);
 });
}
function renderRelicVault(){const box=$('#relicVaultGrid');const equipped=RELICS.find(r=>r.id===save.equippedRelic);$('#equippedRelicTxt').textContent=equipped?.name||'None';box.innerHTML='';RELICS.forEach((r,i)=>{const unlocked=save.unlockedRelics.includes(r.id),el=document.createElement('button');el.className=`relic-vault-card ${unlocked?'':'locked'} ${save.equippedRelic===r.id?'selected':''}`;el.disabled=!unlocked;el.innerHTML=`<div class="relic-icon">${unlocked?r.icon:'?'}</div><span class="section-kicker">CHAPTER ${i+1} RELIC</span><h3>${unlocked?r.name:'Undiscovered Relic'}</h3><p>${unlocked?r.desc:'Defeat the guardian of this chapter to reveal the relic.'}</p><strong>${save.equippedRelic===r.id?'EQUIPPED':unlocked?'Tap to equip':'LOCKED'}</strong>`;el.onclick=()=>{save.equippedRelic=save.equippedRelic===r.id?null:r.id;saveProgress();renderRelicVault();showToast(save.equippedRelic?`${r.name} equipped`:'Relic unequipped')};box.append(el)})}
function renderHeroes(){const box=$('#heroCards');box.innerHTML='';HEROES.forEach(h=>{const el=document.createElement('button');el.className=`hero-choice ${save.selectedHero===h.id?'selected':''}`;el.innerHTML=`<div class="hero-avatar">${h.icon}</div><h3>${h.name}</h3><p>${h.desc}</p><div>Hunter level ${save.heroLevels[h.id]||1}</div>`;el.onclick=()=>{save.selectedHero=h.id;saveProgress();renderHeroes();showToast(`${h.name} selected`)};box.append(el)})}
function renderUpgrades(){const box=$('#upgradeCards');box.innerHTML='';$('#essenceTxt').textContent=save.essence;KEEP_UPGRADES.forEach(u=>{const rank=save.keepUpgrades[u.id]||0,cost=Math.round(u.cost*(1+rank*.45)),el=document.createElement('div');el.className='upgrade-card';el.innerHTML=`<h3>${u.name}</h3><p>${u.desc}</p><div>Rank ${rank} / ${u.max}</div><button class="btn" ${rank>=u.max||save.essence<cost?'disabled':''}>Upgrade · ${cost}</button>`;el.querySelector('button').onclick=()=>{if(save.essence<cost||rank>=u.max)return;save.essence-=cost;save.keepUpgrades[u.id]=rank+1;saveProgress();renderUpgrades();showToast(`${u.name} upgraded`)};box.append(el)})}

function renderKingdom(){const box=$('#kingdomBuildings');const levels=save.kingdom.buildings||{};const power=Object.values(levels).reduce((a,b)=>a+b,0);$('#kingdomRank').textContent=1+Math.floor(power/4);$('#kingdomPopulation').textContent=`Population ${12+power*4}`;$('#kingdomPower').textContent=`Kingdom Power ${power}`;box.innerHTML='';KINGDOM_BUILDINGS.forEach(b=>{const lv=levels[b.id]||0,cost=Math.round(b.cost*(1+lv*.55)),el=document.createElement('article');el.className=`kingdom-building ${lv?'':'unbuilt'}`;el.innerHTML=`<div class="building-icon">${b.icon}</div><h3>${b.name}</h3><p>${b.desc}</p><div>Level <b>${lv} / ${b.max}</b></div><button class="btn ${lv?'gold':''}" ${lv>=b.max||save.essence<cost?'disabled':''}>${lv?'Upgrade':'Construct'} · ${cost} Essence</button>`;el.querySelector('button').onclick=()=>{if(lv>=b.max||save.essence<cost)return;save.essence-=cost;save.materials.bloodEssence=save.essence;save.kingdom.buildings[b.id]=lv+1;save.kingdom.renown++;saveProgress();renderKingdom();showToast(`${b.name} is now level ${lv+1}`)};box.append(el)})}
function achievementValue(a){return a.custom?a.custom():(save.stats[a.stat]||0)}
function renderAchievements(){const box=$('#achievementGrid');let done=0;box.innerHTML='';ACHIEVEMENTS.forEach(a=>{const v=achievementValue(a),complete=v>=a.goal,claimed=save.achievements.claimed.includes(a.id);if(complete)done++;const el=document.createElement('article');el.className=`achievement-card ${complete?'done':''} ${claimed?'claimed':''}`;el.innerHTML=`<span class="section-kicker">ROYAL DECREE</span><h3>${complete?'✓ ':''}${a.name}</h3><p>${a.desc}</p><div class="progress"><i style="width:${Math.min(100,v/a.goal*100)}%"></i></div><div class="row spread"><span>${Math.min(v,a.goal)} / ${a.goal}</span><b>🩸 ${a.reward}</b></div><button class="btn ${complete&&!claimed?'gold':''}" ${!complete||claimed?'disabled':''}>${claimed?'Claimed':complete?'Claim Reward':'In Progress'}</button>`;el.querySelector('button').onclick=()=>{if(!complete||claimed)return;save.achievements.claimed.push(a.id);save.essence+=a.reward;save.materials.bloodEssence=save.essence;save.kingdom.renown+=2;saveProgress();renderAchievements();showToast(`${a.name} claimed · +${a.reward} Essence`)};box.append(el)});$('#achievementCount').textContent=`${done} / ${ACHIEVEMENTS.length}`}
function renderForge(){const box=$('#forgeCards');box.innerHTML='';$('#embersTxt').textContent=save.materials.forgeEmbers;CARD_POOL.filter(c=>inv(c.id).copies>0).forEach(c=>{const item=inv(c.id),r=rarityDef(item.rarity),next=RARITIES[rarityIndex(item.rarity)+1];const el=document.createElement('article');el.className=`card portrait-card rarity-${item.rarity}`;el.innerHTML=`${cardHTML(c,true)}<div class="forge-line">${item.copies} / 3 copies · ${next?'Next: '+next.name:'Maximum rarity'}</div><button class="btn gold" ${item.copies<3||!next?'disabled':''}>Fuse 3 Copies</button>`;el.querySelector('button').onclick=()=>{mergeCard(c.id);renderForge()};box.append(el)})}
function renderCodex(){const enemies=[['skeleton','Bone Soldier'],['wolf','Night Wolf'],['bat','Nightwing Bat'],['ghost','Castle Ghost'],['armor','Axe Armor'],['vampire','Vampire Spawn'],['necromancer','Grave Necromancer'],['warden','Eclipse Warden'],['thornbeast','Thornbound Beast'],['bloodcount','Blood Count'],['icebishop','Frozen Bishop'],['bogqueen','Bog Queen'],['siegeknight','Hollow Castellan'],['moonoracle','Fallen Oracle'],['vampireking','Blood King']];const entries=[...CARD_POOL.map(c=>({icon:c.icon,name:c.name,seen:inv(c.id).copies>0,type:'Card'})),...MAPS.map(m=>({icon:'🗺️',name:m.name,seen:!!save.discoveredMaps[m.id],type:'Map'})),...enemies.map(([id,name])=>({icon:'☠️',name,seen:!!save.discoveredEnemies[id],type:'Enemy'}))];const seen=entries.filter(e=>e.seen).length;$('#codexPct').textContent=Math.round(seen/entries.length*100)+'%';$('#codexGrid').innerHTML=entries.map(e=>`<div class="codex-entry ${e.seen?'':'locked'}"><span>${e.seen?e.icon:'?'}</span><b>${e.seen?e.name:'Undiscovered'}</b><small>${e.type}</small></div>`).join('')}
function renderProfile(){const s=save.stats;$('#profileGrid').innerHTML=[['Total Runs',s.runs],['Victories',s.wins],['Highest Wave',s.highestWave],['Total Kills',s.totalKills],['Common Cards Found',s.totalCards],['Fusions Completed',s.fusions],['Bosses Defeated',s.bosses],['Collection',CARD_POOL.filter(c=>inv(c.id).copies>0).length+'/'+CARD_POOL.length]].map(([a,b])=>`<div><small>${a}</small><strong>${b}</strong></div>`).join('');const labels={bloodEssence:'Blood Essence',eclipseShards:'Eclipse Shards',ancientRelics:'Ancient Relics',hunterMedallions:'Hunter Medallions',forgeEmbers:'Forge Embers'};$('#materialsGrid').innerHTML=Object.entries(labels).map(([k,v])=>`<div><span>${v}</span><b>${save.materials[k]||0}</b></div>`).join('');$('#historyList').innerHTML=save.runHistory.length?save.runHistory.map(r=>`<div class="history-row"><b>${r.result==='victory'?'Victory':'Defeat'} · Wave ${r.wave}</b><span>${r.map||'Unknown Map'} · ${r.kills} kills · ${r.chest}</span></div>`).join(''):'<p class="small">No hunts recorded yet.</p>'}

function renderRoyalHome(){
 const chapter=CHAPTERS[Math.max(0,Math.min(CHAPTERS.length-1,(save.campaign?.unlocked||1)-1))]||CHAPTERS[0];
 const rank=1+Object.values(save.kingdom?.buildings||{}).reduce((a,b)=>a+(b||0),0);
 const done=ACHIEVEMENTS.filter(a=>achievementValue(a)>=a.goal).length;
 const discovered=Object.values(save.discoveredMaps||{}).filter(Boolean).length+Object.values(save.discoveredEnemies||{}).filter(Boolean).length+CARD_POOL.filter(c=>inv(c.id).copies>0).length;
 const relic=RELICS.find(r=>r.id===save.equippedRelic);
 $('#homeHunterLevel').textContent=`Hunter Lv. ${Math.max(1,save.heroLevels?.[save.selectedHero]||1)}`;
 $('#homeEssence').textContent=save.essence||0;$('#homeEmbers').textContent=save.materials?.forgeEmbers||0;$('#homeKingdomRank').textContent=rank;$('#homeVictories').textContent=save.stats?.wins||0;
 $('#homeChapterText').textContent=`Chapter ${chapter.number}: ${chapter.name} · ${chapter.boss.name} awaits.`;
 $('#homeGreeting').textContent=(save.stats?.wins||0)>0?'The kingdom remembers your victories.':'The kingdom still stands.';
 $('#homeDeckText').textContent=`${save.deck.length} / 6 ready`;$('#homeRelicText').textContent=relic?relic.name:'No relic equipped';$('#homeDecreesText').textContent=`${done} completed`;$('#homeCodexText').textContent=`${discovered} discoveries`;
 const built=Object.values(save.kingdom?.buildings||{}).filter(Boolean).length;$('#homeKingdomText').textContent=built?`${built} chambers restored · Rank ${rank}`:'Build, upgrade, and strengthen every hunt.';
}
document.querySelectorAll('#bottomNav [data-nav]').forEach(btn=>btn.addEventListener('click',()=>{
 const dest=btn.dataset.nav;
 if(dest==='home')openScreen(UI.menu);
 if(dest==='campaign'){openScreen($('#campaignScreen'));renderCampaign()}
 if(dest==='cards'){openScreen(UI.deck);renderDeck()}
 if(dest==='heroes'){openScreen($('#heroesScreen'));renderHeroes()}
 if(dest==='kingdom'){openScreen($('#kingdomScreen'));renderKingdom()}
 if(dest==='relics'){openScreen($('#relicVaultScreen'));renderRelicVault()}
 if(dest==='more')openScreen($('#moreScreen'))
}));
document.querySelectorAll('[data-more-target]').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.moreTarget;if(t==='codex'){openScreen($('#codexScreen'));renderCodex()}if(t==='profile'){openScreen($('#profileScreen'));renderProfile()}if(t==='decrees'){openScreen($('#achievementsScreen'));renderAchievements()}}));
renderRoyalHome();updateBottomNav(UI.menu);

$('#kingdomBack').onclick=()=>openScreen(UI.menu);$('#achievementsBtn').onclick=()=>{openScreen($('#achievementsScreen'));renderAchievements()};$('#achievementsBack').onclick=()=>openScreen(UI.menu);
$('#endlessBtn')?.addEventListener('click',()=>freshGame('endless'));
const bindClick=(selector,handler)=>{const el=$(selector);if(el)el.addEventListener('click',handler);};
// iPad/Safari can lose synthetic click events while the battle canvas owns touch input.
// Battle HUD controls use pointer-up directly, with click as a keyboard/accessibility fallback.
const bindBattlePress=(selector,handler)=>{
 const el=$(selector);if(!el)return;
 let lastPointer=0;
 el.style.touchAction='manipulation';
 el.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();lastPointer=performance.now();handler(event);
 });
 el.addEventListener('click',event=>{
  if(performance.now()-lastPointer<450)return;
  event.preventDefault();event.stopPropagation();handler(event);
 });
};
bindClick('#backBtn',()=>openScreen(UI.menu));
bindClick('#saveDeckBtn',()=>{if(save.deck.length!==6)return showToast('Choose exactly six cards');saveProgress();showToast('Deck saved')});
bindClick('#inspectBack',()=>{openScreen(UI.deck);renderDeck()});
$('#mergeOnly')?.addEventListener('change',renderDeck);
bindClick('#mergeAllBtn',mergeAllDuplicates);
bindClick('#forgeBtn',()=>{openScreen($('#forgeScreen'));renderForge()});bindClick('#forgeBack',()=>openScreen(UI.menu));
bindClick('#codexBack',()=>openScreen(UI.menu));
bindClick('#profileBtn',()=>{openScreen($('#profileScreen'));renderProfile()});bindClick('#profileBack',()=>openScreen(UI.menu));
bindClick('#campaignBack',()=>openScreen(UI.menu));bindClick('#relicVaultBack',()=>openScreen(UI.menu));
bindClick('#heroesBtn',()=>{openScreen($('#heroesScreen'));renderHeroes()});bindClick('#heroesBack',()=>openScreen(UI.menu));
bindClick('#upgradesBtn',()=>{openScreen($('#upgradesScreen'));renderUpgrades()});bindClick('#upgradesBack',()=>openScreen(UI.menu));
bindClick('#profileQuickBtn',()=>{openScreen($('#profileScreen'));renderProfile()});
if($('#deckTypeFilter'))$('#deckTypeFilter').value=save.ui.cardFilter;if($('#deckSort'))$('#deckSort').value=save.ui.cardSort;$('#deckTypeFilter')?.addEventListener('change',()=>{save.ui.cardFilter=$('#deckTypeFilter').value;renderDeck()});$('#deckSort')?.addEventListener('change',()=>{save.ui.cardSort=$('#deckSort').value;renderDeck()});
function returnToMainMenu(){
  // Fully tear down every battle-only layer before reopening the Royal Home.
  if(G){G.paused=true;G.state='over';G.pendingCard=null;G.selected=null;G.selectedTower=null;}
  document.body.classList.remove('battle-mode');
  UI.hud.classList.add('hidden');
  UI.choices.classList.add('hidden');
  UI.over.classList.add('hidden');
  $('#battleCinematic')?.classList.add('hidden');
  $('#towerInspector')?.classList.add('hidden');
  $('#placementBar')?.classList.add('hidden');
  $('#bossWrap')?.classList.add('hidden');
  $('#waveBanner')?.classList.add('hidden');
  setPlacementUI(null);
  openScreen(UI.menu);
  renderRoyalHome();
  AUDIO.setState('menu',true);
  window.scrollTo(0,0);
}

// V26.3 — one clean control route only. No capture routers, synthetic events,
// overlapping touch systems, or global gesture interception. The visible native
// buttons call window.VillageBattleAPI through the classic-script bridge in HTML.
function syncNativeBattleControls(explicitState){
  const state=explicitState&&typeof explicitState==='object'
    ? {...(window.VillageBattleAPI?.state?.()||{}),...explicitState}
    : (window.VillageBattleAPI?.state?.()||{active:false,speed:1,paused:false});
  const speedBtn=document.querySelector('#speedBtn');
  const pauseBtn=document.querySelector('#pauseBtn');
  const speedIcon=speedBtn?.querySelector('.command-icon');
  const speedLabel=speedBtn?.querySelector('small');
  const pauseIcon=pauseBtn?.querySelector('.command-icon');
  const pauseLabel=pauseBtn?.querySelector('small');
  const speed=Number(state.speed)||1;
  const paused=Boolean(state.paused);
  if(speedIcon)speedIcon.textContent='×'+speed;
  if(speedLabel)speedLabel.textContent='Speed';
  if(speedBtn){
    speedBtn.dataset.speed=String(speed);
    speedBtn.setAttribute('aria-label','Change battle speed. Current speed '+speed+' times');
    speedBtn.classList.toggle('is-active',speed>1);
  }
  if(pauseIcon)pauseIcon.textContent=paused?'▶':'Ⅱ';
  if(pauseLabel)pauseLabel.textContent=paused?'Resume':'Pause';
  if(pauseBtn){
    pauseBtn.dataset.paused=paused?'true':'false';
    pauseBtn.setAttribute('aria-label',paused?'Resume battle':'Pause battle');
    pauseBtn.classList.toggle('is-active',paused);
  }
  document.body.classList.toggle('battle-paused',paused&&document.body.classList.contains('battle-mode'));
  return {speed,paused};
}
window.syncNativeBattleControls=syncNativeBattleControls;

bindClick('#closeTut',()=>{UI.tutorial.classList.add('hidden');save.tutorialSeen=true;saveProgress()});
bindClick('#helpBtn',()=>UI.tutorial.classList.remove('hidden'));
bindClick('#rotateBtn',()=>{if(G?.pendingCard?.type==='roadpiece'){for(let i=1;i<=4;i++){const r=(G.placementRotation+i)%4;if(!G.hoverTile||validRoadPiece(G.pendingCard,G.hoverTile,r)){G.placementRotation=r;break}}showToast('Road piece rotated')}});
bindClick('#cancelPlaceBtn',()=>{if(!G)return;G.pendingCard=null;G.hoverTile=null;setPlacementUI(null);if(G.draftOpen){UI.choices.classList.remove('hidden');showToast('Choose one of the three cards')}else{G.paused=false;G.pendingWave=false;showToast('Placement cancelled')}});
bindClick('#resetBtn',()=>{if(!confirm('Reset all The Village progress?'))return;STORAGE.remove('relicsEclipseSave');STORAGE.remove('gateRunnerSave');location.reload()});
const audioPanel=$('#audioPanel'),audioBtn=$('#audioBtn');
function syncAudioControls(){if(!audioPanel)return;$('#audioMaster').checked=save.settings.audio!==false;$('#musicEnabled').checked=save.settings.music!==false;$('#sfxEnabled').checked=save.settings.sfx!==false;$('#musicVolume').value=save.settings.musicVolume??.46;$('#sfxVolume').value=save.settings.sfxVolume??.72;$('#ambienceVolume').value=save.settings.ambienceVolume??.34}
audioBtn?.addEventListener('click',e=>{e.stopPropagation();AUDIO.unlock();audioPanel.classList.toggle('hidden');syncAudioControls()});$('#audioClose')?.addEventListener('click',()=>audioPanel.classList.add('hidden'));
[['#audioMaster','audio','change'],['#musicEnabled','music','change'],['#sfxEnabled','sfx','change'],['#musicVolume','musicVolume','input'],['#sfxVolume','sfxVolume','input'],['#ambienceVolume','ambienceVolume','input']].forEach(([sel,key,ev])=>$(sel)?.addEventListener(ev,e=>{save.settings[key]=e.target.type==='checkbox'?e.target.checked:Number(e.target.value);AUDIO.apply();saveProgress()}));syncAudioControls();
renderDeckAnalysis();

/* Milestone 7.3 stability patch: fixed viewport, contained scrolling, reliable tabs */
(function installStabilityPatch(){
  const root=document.documentElement;
  const setAppHeight=()=>{
    // Use the layout viewport, not visualViewport. On iPhone Safari the browser
    // toolbar changes visualViewport.height during a swipe; continuously rewriting
    // the fixed app height interrupts native momentum scrolling.
    const h=Math.max(320,Math.round(window.innerHeight||root.clientHeight));
    root.style.setProperty('--app-height',`${h}px`);
  };
  setAppHeight();
  let viewportTimer=0;
  const scheduleAppHeight=()=>{
    clearTimeout(viewportTimer);
    viewportTimer=setTimeout(setAppHeight,180);
  };
  window.addEventListener('resize',scheduleAppHeight,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(setAppHeight,240),{passive:true});

  // Do not install a document-level touchmove preventDefault handler. Gameplay
  // already owns input on the canvas, while menus must retain untouched native
  // iOS scrolling. A global listener can cancel a Cards swipe after it begins.

  const tabs=document.querySelector('.card-file-tabs');
  if(tabs){
    tabs.addEventListener('click',event=>{
      const tab=event.target.closest('.card-file-tab');
      if(!tab)return;
      event.preventDefault();
      const filter=tab.dataset.cardFilter||'all';
      tabs.querySelectorAll('.card-file-tab').forEach(item=>{
        const selected=item===tab;
        item.classList.toggle('active',selected);
        item.setAttribute('aria-selected',String(selected));
      });
      const select=$('#deckTypeFilter');if(select)select.value=filter;save.ui.cardFilter=filter;saveProgress();
      renderDeck();
      const collection=$('#collectionCards');if(collection)collection.scrollTop=0;
    });
    tabs.querySelectorAll('.card-file-tab').forEach((tab,index)=>tab.setAttribute('aria-selected',String(index===0)));
  }

})();

/* V22.3b — iOS-safe Village controller. Touch, mouse, buttons, and buildings are isolated. */
(function installVillageSystem(){
  if(window.__ROTK_VILLAGE_BOOTSTRAP__) return;
  const viewport=document.querySelector('.pixel-village');
  const world=document.getElementById('villageWorld');
  const plotsRoot=document.getElementById('villagePlots');
  const tray=document.getElementById('villageBuildTray');
  const hint=document.getElementById('villageBuildHint');
  if(!viewport||!world||!plotsRoot)return;

  const BUILDINGS={house:{name:'House',icon:'🏠',cost:80},farm:{name:'Farm',icon:'🌾',cost:95},lumber:{name:'Lumber Camp',icon:'🪵',cost:110},quarry:{name:'Quarry',icon:'🪨',cost:125}};
  const WORLD={width:1600,height:1900,focusX:800,focusY:930};
  const camera={x:0,y:0,scale:.42,min:.28,max:1.25};
  let selectedBuild=null,dragging=false,moved=false,startX=0,startY=0,baseX=0,baseY=0;
  let pinch=null,suppressClickUntil=0,saveTimer=0;
  const cameraKey='rotkVillageCameraV22_3b';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const defaultScale=()=>Math.min(window.innerWidth,window.innerHeight)<760?.42:.62;
  const readPlots=()=>{try{return JSON.parse(localStorage.getItem('rotkVillagePlots')||'{}')}catch{return {}}};
  const writePlots=data=>localStorage.setItem('rotkVillagePlots',JSON.stringify(data));

  function clampCamera(){
    const vw=viewport.clientWidth||1,vh=viewport.clientHeight||1;
    const sw=WORLD.width*camera.scale,sh=WORLD.height*camera.scale,margin=70;
    camera.x=sw<=vw?(vw-sw)/2:clamp(camera.x,vw-sw-margin,margin);
    camera.y=sh<=vh?(vh-sh)/2:clamp(camera.y,vh-sh-margin,margin);
  }
  function applyCamera(){
    clampCamera();
    world.style.transform=`translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.scale})`;
    const readout=document.getElementById('villageZoomReadout');
    if(readout)readout.textContent=`${Math.round(camera.scale*100)}%`;
  }
  function persistCamera(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{try{sessionStorage.setItem(cameraKey,JSON.stringify(camera))}catch{}},100);
  }
  function centerVillage(animate=true){
    camera.scale=defaultScale();
    camera.x=viewport.clientWidth/2-WORLD.focusX*camera.scale;
    camera.y=viewport.clientHeight/2-WORLD.focusY*camera.scale;
    world.style.transition=animate?'transform .25s ease-out':'none';
    applyCamera();
    if(animate)setTimeout(()=>world.style.transition='none',280);
    persistCamera();
  }
  function zoomAt(next,clientX,clientY){
    const r=viewport.getBoundingClientRect();
    const cx=(clientX??(r.left+r.width/2))-r.left,cy=(clientY??(r.top+r.height/2))-r.top;
    const old=camera.scale;next=clamp(next,camera.min,camera.max);
    if(Math.abs(next-old)<.001)return;
    const wx=(cx-camera.x)/old,wy=(cy-camera.y)/old;
    camera.scale=next;camera.x=cx-wx*next;camera.y=cy-wy*next;
    applyCamera();persistCamera();
  }
  function openDestination(id){
    const actions={
      playBtn:()=>{openScreen($('#campaignScreen'));renderCampaign()},
      villageCardsBtn:()=>{openScreen(UI.deck);renderDeck()},
      villageHeroesBtn:()=>{openScreen($('#heroesScreen'));renderHeroes()},
      kingdomBtn:()=>{openScreen($('#kingdomScreen'));renderKingdom()},
      forgeBtnHome:()=>{openScreen($('#forgeScreen'));renderForge()},
      villageRelicsBtn:()=>{openScreen($('#relicVaultScreen'));renderRelicVault()},
      codexBtn:()=>{openScreen($('#codexScreen'));renderCodex()},
      villageAudioBtn:()=>{document.getElementById('audioPanel')?.classList.remove('hidden');AUDIO.unlock()}
    };
    if(actions[id]){actions[id]();return true}return false;
  }
  function renderPlots(){
    const placed=readPlots();plotsRoot.replaceChildren();
    for(let i=0;i<8;i++){
      const type=placed[i],plot=document.createElement('button');
      plot.type='button';plot.className=`village-plot plot-${i} ${type?'built':'empty'}`;plot.dataset.plot=String(i);
      plot.setAttribute('aria-label',type?`${BUILDINGS[type]?.name||'Building'} plot`:`Empty build plot ${i+1}`);
      if(type&&BUILDINGS[type]){const def=BUILDINGS[type];plot.innerHTML=`<span class="placed-building"><span>${def.icon}</span><b>${def.name}</b></span>`}
      plot.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();constructPlot(plot)});
      plotsRoot.append(plot);
    }
  }
  function constructPlot(plot){
    if(!selectedBuild){showToast('Open Build Mode and select a structure');return}
    const data=readPlots(),index=plot.dataset.plot;if(data[index]){showToast('That plot is already occupied');return}
    const def=BUILDINGS[selectedBuild];if(!def)return;
    if((save.essence||0)<def.cost){showToast(`Need ${def.cost} Blood Essence`);return}
    save.essence-=def.cost;save.materials.bloodEssence=save.essence;data[index]=selectedBuild;writePlots(data);
    save.kingdom.renown=(save.kingdom.renown||0)+1;saveProgress();renderPlots();renderRoyalHome();showToast(`${def.name} constructed`);
  }

  document.querySelectorAll('.village-building').forEach(button=>{
    button.addEventListener('click',event=>{
      if(performance.now()<suppressClickUntil){event.preventDefault();return}
      event.preventDefault();event.stopPropagation();openDestination(button.id);
    });
  });
  document.getElementById('villageBuildBtn')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();tray?.classList.toggle('hidden');selectedBuild=null;tray?.querySelectorAll('[data-village-build]').forEach(b=>b.classList.remove('selected'));if(hint)hint.textContent='Select a structure.'});
  document.getElementById('villageBuildClose')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();tray?.classList.add('hidden')});
  tray?.addEventListener('click',event=>{event.stopPropagation();const choice=event.target.closest('[data-village-build]');if(!choice)return;selectedBuild=choice.dataset.villageBuild;tray.querySelectorAll('[data-village-build]').forEach(b=>b.classList.toggle('selected',b===choice));if(hint)hint.textContent=`${BUILDINGS[selectedBuild].name} selected — tap an empty plot.`});
  document.getElementById('villageZoomIn')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();zoomAt(camera.scale*1.2)});
  document.getElementById('villageZoomOut')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();zoomAt(camera.scale/1.2)});
  document.getElementById('villageCenterBtn')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();centerVillage(true)});

  function excluded(target){return !!target.closest('.village-camera-controls,.village-build-btn,.village-build-tray,.village-building,.village-plot')}
  viewport.addEventListener('touchstart',event=>{
    if(excluded(event.target))return;
    if(event.touches.length===1){const t=event.touches[0];dragging=true;moved=false;startX=t.clientX;startY=t.clientY;baseX=camera.x;baseY=camera.y;pinch=null}
    else if(event.touches.length===2){const a=event.touches[0],b=event.touches[1],r=viewport.getBoundingClientRect();pinch={distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),scale:camera.scale,midX:(a.clientX+b.clientX)/2-r.left,midY:(a.clientY+b.clientY)/2-r.top};dragging=false;moved=true;viewport.classList.add('is-panning')}
  },{passive:true});
  viewport.addEventListener('touchmove',event=>{
    if(event.touches.length===2){event.preventDefault();const a=event.touches[0],b=event.touches[1];if(!pinch){const r=viewport.getBoundingClientRect();pinch={distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),scale:camera.scale,midX:(a.clientX+b.clientX)/2-r.left,midY:(a.clientY+b.clientY)/2-r.top}}const r=viewport.getBoundingClientRect(),d=Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));zoomAt(pinch.scale*d/pinch.distance,r.left+pinch.midX,r.top+pinch.midY);suppressClickUntil=performance.now()+500;return}
    if(dragging&&event.touches.length===1){const t=event.touches[0],dx=t.clientX-startX,dy=t.clientY-startY;if(!moved&&Math.hypot(dx,dy)>6){moved=true;viewport.classList.add('is-panning')}if(moved){event.preventDefault();camera.x=baseX+dx;camera.y=baseY+dy;applyCamera();suppressClickUntil=performance.now()+350}}
  },{passive:false});
  viewport.addEventListener('touchend',()=>{if(moved)suppressClickUntil=performance.now()+350;dragging=false;moved=false;pinch=null;viewport.classList.remove('is-panning');persistCamera()},{passive:true});
  viewport.addEventListener('touchcancel',()=>{dragging=false;moved=false;pinch=null;viewport.classList.remove('is-panning')},{passive:true});

  viewport.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.button!==0||excluded(event.target))return;dragging=true;moved=false;startX=event.clientX;startY=event.clientY;baseX=camera.x;baseY=camera.y});
  window.addEventListener('pointermove',event=>{if(!dragging||event.pointerType==='touch')return;const dx=event.clientX-startX,dy=event.clientY-startY;if(!moved&&Math.hypot(dx,dy)>5){moved=true;viewport.classList.add('is-panning')}if(moved){camera.x=baseX+dx;camera.y=baseY+dy;applyCamera();suppressClickUntil=performance.now()+300}});
  window.addEventListener('pointerup',event=>{if(event.pointerType==='touch'||!dragging)return;dragging=false;viewport.classList.remove('is-panning');persistCamera()});
  viewport.addEventListener('wheel',event=>{event.preventDefault();zoomAt(camera.scale*(event.deltaY<0?1.12:.89),event.clientX,event.clientY)},{passive:false});
  window.addEventListener('resize',()=>requestAnimationFrame(applyCamera),{passive:true});

  window.ROTKVillage={openDestination,constructPlot,center:centerVillage,zoomAt};
  renderPlots();
  centerVillage(false);
  viewport.dataset.villageReady='true';
})();
;


// V25.7 native-link bootstrap. This deliberately uses a full page navigation
// for the two result-screen choices so iPad/WebKit cannot lose the command to
// canvas pointer capture or a stale overlay.
(function applyV257NavigationAction(){
 const params=new URLSearchParams(location.search);
 const action=params.get('v257');
 if(!action)return;
 history.replaceState(null,'',location.pathname+location.hash);
 if(action==='retry'){
  setTimeout(()=>freshGame('chapter',save.campaign.selected),120);
 }else if(action==='menu'){
  setTimeout(()=>returnToMainMenu(),0);
 }
})();

```

## File: `package.json`

**Purpose:** Project metadata, scripts, and dependency declarations.

**SHA-256:** `7cce7b2bb4f6d2d4ea4ba32e52b265626217823fac3c944038ddf81ead2fdd8e`

```json
{
  "name": "the-village",
  "version": "27.1.2",
  "private": true,
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^7.0.0"
  },
  "dependencies": {
    "playwright-core": "^1.61.1"
  }
}

```

## File: `package-lock.json`

**Purpose:** Locked dependency graph for reproducible npm installation.

**SHA-256:** `8cf86876bc810fe8d01075ef73cedb7b3cddad4b73f4dbd3a4d24f23e4923422`

```json
{
  "name": "the-village",
  "version": "26.4.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "the-village",
      "version": "26.4.0",
      "dependencies": {
        "playwright-core": "^1.61.1"
      },
      "devDependencies": {
        "vite": "^7.0.0"
      }
    },
    "node_modules/@esbuild/aix-ppc64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/aix-ppc64/-/aix-ppc64-0.28.1.tgz",
      "integrity": "sha512-Svl7tq8k/08+p6CXPpRjQ1fKX+1odH/BQbb48fV6fj3CWHhsoIOoY87w1oHXm0qEpkIK3ZfVgp0hed3XBXzXMQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "aix"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/android-arm/-/android-arm-0.28.1.tgz",
      "integrity": "sha512-0k2F129Xdio1TdJfzJ8sy1Q47vUD2NnwdhiAf7drUN1EBTfPf4hsFCtmMgu/6m8JSzsBrlmVjudMBQqOfG8usQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/android-arm64/-/android-arm64-0.28.1.tgz",
      "integrity": "sha512-34EGEbCIAgosYz6goLcopX6Mo7NyGv9tfwEM2/7Ce2VcVRk568iSvniGWcUXIy7wEDR1wzolcxcriFVrWYcwBg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/android-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/android-x64/-/android-x64-0.28.1.tgz",
      "integrity": "sha512-dbwY7ltSMDWsRatcRpCnES4F+im88OCUgGZjy52shC7GqHRE/cYlxNbB4Z4UpJswpcc4Qxd2oE/ufM0p61IKng==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/darwin-arm64/-/darwin-arm64-0.28.1.tgz",
      "integrity": "sha512-TZbWkQY7kvTAXbXUT7uVACR5cMHsDiSz9z7ZKAX/RTq/WJEk3QyRr0wZpNhBDX+/0CtdqUIJlOiodQcta6tY3Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/darwin-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/darwin-x64/-/darwin-x64-0.28.1.tgz",
      "integrity": "sha512-zfdzgK9ACBNZLI/CyHTOx81SyNbM6YXn7rxSgX97VjyiPl9W1i4Ka4fgKECEoFCKGpvBj5qArWIGgQjOwkgskQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/freebsd-arm64/-/freebsd-arm64-0.28.1.tgz",
      "integrity": "sha512-wG2EA8ENdEI0qhkSZMjfqrdY+ziCYCPMmtZjjIwOmXFjmyzEHn+UUxk5of+SYsjtfs3VpnlC7QLzSI5hY/rOAw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/freebsd-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/freebsd-x64/-/freebsd-x64-0.28.1.tgz",
      "integrity": "sha512-i7dZ9vQgnvSCzi/rYCXNgtF/U+eKZNJBzu3eTQbRgHnM7tNSizLOkRFAl3qzVc/Op/u5YkHHa4pf/3DOYHthLQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-arm/-/linux-arm-0.28.1.tgz",
      "integrity": "sha512-qVXBOHQS+d5Y722GwJzJUtOLlX7km3CraOaGormF1pDtPd2C/l1SHRPgjLunLGe51Sh5YYWKMFDyV4SxgMQYTQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-arm64/-/linux-arm64-0.28.1.tgz",
      "integrity": "sha512-yHs+0uc8+nvEAfAfxrWQKK5peSNzBc4PegcMO0EJ2hT71uA7vB8Ihg2e77R2P7SG5uYjPbHlLLmve4LLLRCf0g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ia32": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-ia32/-/linux-ia32-0.28.1.tgz",
      "integrity": "sha512-d1z4ZuP0ajrfz/FhGT4vv278rX8KnPPJx8i5+AtK7TYbx9Le9F1hyzurZpkEyjkGa9dUGhQow4C1NmeGvqxN2w==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-loong64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-loong64/-/linux-loong64-0.28.1.tgz",
      "integrity": "sha512-M5sRjUVZrkm1OAPR3dlOYzNmN+loZKGVi1VUQGrwuqLcbR6qeAz+famMhjASeH3YVKvZz+zT1jlh/keC3Rj/lg==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-mips64el": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-mips64el/-/linux-mips64el-0.28.1.tgz",
      "integrity": "sha512-mRObBZeHh2OxcBFPWE/FjylkRgZdYuiTR3vaTozquCGOH14iP9oN4x4Ge81CoIDYQrXmIxpFumJBu5MtZpnQJQ==",
      "cpu": [
        "mips64el"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-ppc64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-ppc64/-/linux-ppc64-0.28.1.tgz",
      "integrity": "sha512-slScBsMAb3GFDcdrCgLwZtPYRoH2H/youv10QiZyRjmsP48fznoveWytSgCI/R0ZcUgpc0ZhIUEx6LHts8yrfQ==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-riscv64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-riscv64/-/linux-riscv64-0.28.1.tgz",
      "integrity": "sha512-kw0owk1o0GFETUJyW0jc0G4Yzs0BHZn0JDZ8JRT088vjJYX777BAs1fDGxAC+q831qOs2DTC96mNsG2opdfyyQ==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-s390x": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-s390x/-/linux-s390x-0.28.1.tgz",
      "integrity": "sha512-/lAIjX8aYFRByhh6L5rYtPEDRqa9de/4V/juOXcta5frjvzXO4/sqEtyytse0g3zZFuWu5cDN0MkLz2qRDD2Ag==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/linux-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/linux-x64/-/linux-x64-0.28.1.tgz",
      "integrity": "sha512-u/anNYF2mmVOEDwLtnQ1wOr3EZ9sTNGLWrsYGYwHWzGA3Si84IOkHXlbWTD1NB+9/1lcnweYKO54uhxZydNzfA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/netbsd-arm64/-/netbsd-arm64-0.28.1.tgz",
      "integrity": "sha512-oks0DYbLwWMmaakTsCb+zL4E+aHRVLom9IJZOAthMQEPiQmydXHkziYEsGYRx0uNV/IjEKGAV941JzH02pflqw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/netbsd-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/netbsd-x64/-/netbsd-x64-0.28.1.tgz",
      "integrity": "sha512-aeL6lAnN89Hz43Mlh1G8ARasbuoYvSITDEx0tHh5b7jJnHcssqgjy9Yx430GDpmCa6OyrKoS0aNRjKundRizGg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "netbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/openbsd-arm64/-/openbsd-arm64-0.28.1.tgz",
      "integrity": "sha512-MEFJe5C3R8pwXdZ5Y21oo6m7ePiS0d9pWucn99O/wvyJZChoIQKrQDxKrGeW8F5+T0okTHesAmDeiHDTIq0V/Q==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openbsd-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/openbsd-x64/-/openbsd-x64-0.28.1.tgz",
      "integrity": "sha512-i/ZLIOafE0Z8cI/XANJAixoJL/uRAoS2xOA3rb0xN+KK0K177cMAsQYkzHtBrtMXAKuAc7HGgcWiZ/sRC1Nxgw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/openharmony-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/openharmony-arm64/-/openharmony-arm64-0.28.1.tgz",
      "integrity": "sha512-ge+Z7EXFNt2BO1oAMsVpiQ8EwndV9i1xXerAeTIK7AtPs3bKFXQM7nlRxDSIUIMeueR1CNXxqztLzdNeReKBJg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/sunos-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/sunos-x64/-/sunos-x64-0.28.1.tgz",
      "integrity": "sha512-BEjgtECkL3vY+SaSQ6nzVfiALUeFxpawyp8Jmf5PtYhf1Ug40N1h/hxlhts+f1FvSvarEigdxS3BlSMI2PJLcQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "sunos"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-arm64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/win32-arm64/-/win32-arm64-0.28.1.tgz",
      "integrity": "sha512-lCv9eK/H6ZJWbE7bh2nw54CZ9M2nupBxJcTsdk/QQnWkdSjKGuxmmH8/GWrlT1eMmZfn4dGcCjRte397WqfQXA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-ia32": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/win32-ia32/-/win32-ia32-0.28.1.tgz",
      "integrity": "sha512-zvb/mB2bSCoJOpoCBgYKKpX6YM6mJBlBUVUtVj41DlZJVEB6/0CKlRYxP5wWl1C1ILiCoAU5wZZ4q1P3qeS6Eg==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@esbuild/win32-x64": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@esbuild/win32-x64/-/win32-x64-0.28.1.tgz",
      "integrity": "sha512-bm4Mowrv+GXMlpWX++EcXw/iLyd1o3+bJkC2DkWXYVvgZCqD/bSj9ctZeAMC3cIxgjRVR2Dufaiu4YPxr5gW1A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@rollup/rollup-android-arm-eabi": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-android-arm-eabi/-/rollup-android-arm-eabi-4.62.2.tgz",
      "integrity": "sha512-6o7ZLZK+BeenkZCFNDXqpbjw9bD6nuWonvS/lwQJp7NoVVxm6p3qE7qQ5jGuBjiFsgvqjD8mZAU5oWxTmbOeOg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-android-arm64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-android-arm64/-/rollup-android-arm64-4.62.2.tgz",
      "integrity": "sha512-BaH7BllCACHoH1LguOU56UItGfUWjujlO65kS9LAodViaN4bwIKd7oeW/ZHJ/4ljr/7MIiENnNy3HJ0zXv8Zkw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@rollup/rollup-darwin-arm64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-darwin-arm64/-/rollup-darwin-arm64-4.62.2.tgz",
      "integrity": "sha512-v39RCCvj4He82I9sFmk+M1VZ0PLM9sfsLVikjfx2hYBNALhrrOR2D3JjQA6AhlaSOgcR+RzrKY7e1+bT6SUO/A==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-darwin-x64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-darwin-x64/-/rollup-darwin-x64-4.62.2.tgz",
      "integrity": "sha512-yl0y2vq3S3lHeuXhEdss6TWfKW8vkujImO12tn4ZkG/4oghr09LvdYm2RElVjokTQiUvDUGXLGsYeLqUMCKpGA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-arm64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-freebsd-arm64/-/rollup-freebsd-arm64-4.62.2.tgz",
      "integrity": "sha512-tT4pvt4qXD+vEoezupCWi+a1F0vvDiksiHc+PxRlYTOH1I6/X4id9jPxTP+Fg+545euaFT1jJVs4CEdHZAU1vw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-freebsd-x64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-freebsd-x64/-/rollup-freebsd-x64-4.62.2.tgz",
      "integrity": "sha512-6nU5F2wCW+qvCBhTn1pdIU3bzsIoF7EUwsCDRxilWGprQR6yd508YnH9+OKFCwpfS8pjZqDUmnCAr7exax0XCg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-gnueabihf": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-arm-gnueabihf/-/rollup-linux-arm-gnueabihf-4.62.2.tgz",
      "integrity": "sha512-n1GJHPOvpIfhi3TmrCeh6S6URt9BFCt0KQE3qvexyGCTAKpR4Lg+eWvNZEqu7epxwus/8ElT3hacYEucm49SZg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm-musleabihf": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-arm-musleabihf/-/rollup-linux-arm-musleabihf-4.62.2.tgz",
      "integrity": "sha512-JqgflS8wEB+UXV/vS1RpRbifGBeN4D5lz8D8oOFbFZw4vedvdOgCFAjfBmIMdW3yL10XpQQ0Ambepw6MXrhOnA==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-arm64-gnu/-/rollup-linux-arm64-gnu-4.62.2.tgz",
      "integrity": "sha512-wnFJkogWvN4jm/hQRF2UBaeUmk20j5+DmHvoyWii2b8HJDyvz1MF2OU/6ynXt2KR63rbZLWkFpoytpdc/yBuSA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-arm64-musl": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-arm64-musl/-/rollup-linux-arm64-musl-4.62.2.tgz",
      "integrity": "sha512-HVu2bp0zhvJ8xHEV9+UUs7S90VadmBSY3LcIMvozbPo4AuMGDWlz3ymHLHZPX4hR67TKTt8Qp5PJ5RBg/i+RMQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-loong64-gnu/-/rollup-linux-loong64-gnu-4.62.2.tgz",
      "integrity": "sha512-mQqqAV8QaoSgr9I2fKDLY2BAVvmKjWoGiu/cSYQonsLvtqwEn1E4QYfnCOcp5zoEqNhsDYin1s6jx/VJmrxlZg==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-loong64-musl": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-loong64-musl/-/rollup-linux-loong64-musl-4.62.2.tgz",
      "integrity": "sha512-IxKLoxCQ2IWi6bT2akyDUBGsOImDKB+sPp4EsTmwFQ/fMwpCKm8uLSSgP/Kx/QYUgKis6SEZ5/Nlhup0DIA0PQ==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-ppc64-gnu/-/rollup-linux-ppc64-gnu-4.62.2.tgz",
      "integrity": "sha512-Mk5ha2RQSgyFfmYYLkBpPnUk8D8FriBxesO1u9O75X0mHgXL1UQcH5Itl2lurWL2tj0RxV9b9tJgipac0hRY9A==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-ppc64-musl": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-ppc64-musl/-/rollup-linux-ppc64-musl-4.62.2.tgz",
      "integrity": "sha512-CjvEnqJL/0/TQ3TXX3OPIJ/kmBellrWd4heXUmHeJlTnmwjKpSJzoehLaL6Xk0ZnMHBu9dZuFADNOrtjF4v+2w==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-riscv64-gnu/-/rollup-linux-riscv64-gnu-4.62.2.tgz",
      "integrity": "sha512-1SiZbzwdkaDURsew/tSOrooKiYy7EQGT6m8ufavAi9NEyQb/6VuIxFXAL1fqa4iZe3g4NbNk4P7J32z2tw5Mgg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-riscv64-musl": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-riscv64-musl/-/rollup-linux-riscv64-musl-4.62.2.tgz",
      "integrity": "sha512-nQts12zJ3NQRoE6uYljOH89v7szzLDvG2JD/vsX+vGXU8w/At1GowTZ5/7qeFQ8m7L55rpR8Okugnuo5bgjy2Q==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-s390x-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-s390x-gnu/-/rollup-linux-s390x-gnu-4.62.2.tgz",
      "integrity": "sha512-E9/ll019jhPIJgpzfZoIkBGhcz+kKNgVWYRY0zr9srBdPPFVpvOKW8VaJKUbeK+eZXyQF9ltME+Kk6affeaPgg==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.62.2.tgz",
      "integrity": "sha512-5BqxR/pshjey51iliyzTD5Xi3EN0aLmQ2lZ3lvefVV9c82BvrLo2/6OT55iifpWBufs6kdwWbuOKS841DrmK9A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-linux-x64-musl": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-linux-x64-musl/-/rollup-linux-x64-musl-4.62.2.tgz",
      "integrity": "sha512-uNN83XxQrRAh/w0/pmAfibcwyb6YWt4gP+dpnQKPVJshAloQ785ii8CT8ZCIxkGg9opVsvAlGhFitSm6D1Jjpg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@rollup/rollup-openbsd-x64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-openbsd-x64/-/rollup-openbsd-x64-4.62.2.tgz",
      "integrity": "sha512-srjEIxSH3LRnJN6THczDHWQplqEMFiAJrTab0msUryh9kwNpkICf3Ea6q6MN/2cZwRFUNx5w+h6Hpi4QuHS6Zg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openbsd"
      ]
    },
    "node_modules/@rollup/rollup-openharmony-arm64": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-openharmony-arm64/-/rollup-openharmony-arm64-4.62.2.tgz",
      "integrity": "sha512-8hOJnxgbyObnCm5AlRA3A931xX19xq80RjVTKgJOvEKWqJruP/Uf12IbAOaDjjEXYRewwHLfmF0YRIdK3OwKWA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@rollup/rollup-win32-arm64-msvc": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-win32-arm64-msvc/-/rollup-win32-arm64-msvc-4.62.2.tgz",
      "integrity": "sha512-mmF4AY1i0hG/bLWUctUq59gtmgaSIRa3cu/A3JFRp/sCNEme2bgDEiDS22P9FbnJB8NJNF4jPJiSP5RHQpUTDg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-ia32-msvc": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-win32-ia32-msvc/-/rollup-win32-ia32-msvc-4.62.2.tgz",
      "integrity": "sha512-DZgkknc6jhHrk46V25vbAM0zZkyP0nSDkJB8/dRkLTxv470dOmWDqGoEJl/9A0dFfS7yE3REOwNDxpHwSLSt0Q==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-gnu": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-win32-x64-gnu/-/rollup-win32-x64-gnu-4.62.2.tgz",
      "integrity": "sha512-T6xr6ucWSFto+VGajA8YH26LdpHRuP4YLHEKAtCWvJDOlnmWcDZVCI2Jmjr+IFHDlt2zRaTAKE4tfjTaWLgJBg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@rollup/rollup-win32-x64-msvc": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-4.62.2.tgz",
      "integrity": "sha512-BfzEnDJOt9T8M989/lA37EcJgat01wLRnoi5dQf3QzOH7jzpqTAzdDbVfRljVr5r+jzKqpbHeyOfAaXxAd0PAA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@types/estree": {
      "version": "1.0.9",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/@types/estree/-/estree-1.0.9.tgz",
      "integrity": "sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/esbuild": {
      "version": "0.28.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/esbuild/-/esbuild-0.28.1.tgz",
      "integrity": "sha512-HrJrvZv5ayxBzPfwphOoNzkzOIIlifzk0KJrGK2c8R4+LKpMtpYLQeUdjnwjWv/LZlkH2laZk+4w78pi99D4Vw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "bin": {
        "esbuild": "bin/esbuild"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@esbuild/aix-ppc64": "0.28.1",
        "@esbuild/android-arm": "0.28.1",
        "@esbuild/android-arm64": "0.28.1",
        "@esbuild/android-x64": "0.28.1",
        "@esbuild/darwin-arm64": "0.28.1",
        "@esbuild/darwin-x64": "0.28.1",
        "@esbuild/freebsd-arm64": "0.28.1",
        "@esbuild/freebsd-x64": "0.28.1",
        "@esbuild/linux-arm": "0.28.1",
        "@esbuild/linux-arm64": "0.28.1",
        "@esbuild/linux-ia32": "0.28.1",
        "@esbuild/linux-loong64": "0.28.1",
        "@esbuild/linux-mips64el": "0.28.1",
        "@esbuild/linux-ppc64": "0.28.1",
        "@esbuild/linux-riscv64": "0.28.1",
        "@esbuild/linux-s390x": "0.28.1",
        "@esbuild/linux-x64": "0.28.1",
        "@esbuild/netbsd-arm64": "0.28.1",
        "@esbuild/netbsd-x64": "0.28.1",
        "@esbuild/openbsd-arm64": "0.28.1",
        "@esbuild/openbsd-x64": "0.28.1",
        "@esbuild/openharmony-arm64": "0.28.1",
        "@esbuild/sunos-x64": "0.28.1",
        "@esbuild/win32-arm64": "0.28.1",
        "@esbuild/win32-ia32": "0.28.1",
        "@esbuild/win32-x64": "0.28.1"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.16",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/nanoid/-/nanoid-3.3.16.tgz",
      "integrity": "sha512-bzlKTyNJ7+LdGIIwy8ijFpIqEQIvafahV7eYykJ8Cvh42EdJeODoJ6gUJXpQJvej1BddH8OqTXZNE/KfbWAu8Q==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.5",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/picomatch/-/picomatch-4.0.5.tgz",
      "integrity": "sha512-RvwwcruNjI1ncT5xRakeyS9Lf8lcItv34KD+aif+VH9kduAyfYBipGh12274xtenIPZ119/R9BdTBa8gAwSh0A==",
      "dev": true,
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/playwright-core": {
      "version": "1.61.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/playwright-core/-/playwright-core-1.61.1.tgz",
      "integrity": "sha512-h7Qlt6m4REp25qvIdvbDtVmD4LqVXfpRxhORv9L0jzETM05p4fuPJ3dKyuSXQxDSbXnmS79HAgi9589lGSpLkg==",
      "bin": {
        "playwright-core": "cli.js"
      },
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.20",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/postcss/-/postcss-8.5.20.tgz",
      "integrity": "sha512-lW616l85ucIQL+FocMmL7pQFPqBmwejrCMg+iPxyImlrANNJG9NHq/RkyCZopDhd8C3LA03PHRJDjkbGu8vvug==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.16",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/rollup": {
      "version": "4.62.2",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/rollup/-/rollup-4.62.2.tgz",
      "integrity": "sha512-RFnrW4lhXA3s3eqHDZvN654g8OTjzRfqpIRJYczCGB6HzphckVAi/Qh4tbPUbRuDi7s1Llv8g/NspLkttY3gTA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/estree": "1.0.9"
      },
      "bin": {
        "rollup": "dist/bin/rollup"
      },
      "engines": {
        "node": ">=18.0.0",
        "npm": ">=8.0.0"
      },
      "optionalDependencies": {
        "@rollup/rollup-android-arm-eabi": "4.62.2",
        "@rollup/rollup-android-arm64": "4.62.2",
        "@rollup/rollup-darwin-arm64": "4.62.2",
        "@rollup/rollup-darwin-x64": "4.62.2",
        "@rollup/rollup-freebsd-arm64": "4.62.2",
        "@rollup/rollup-freebsd-x64": "4.62.2",
        "@rollup/rollup-linux-arm-gnueabihf": "4.62.2",
        "@rollup/rollup-linux-arm-musleabihf": "4.62.2",
        "@rollup/rollup-linux-arm64-gnu": "4.62.2",
        "@rollup/rollup-linux-arm64-musl": "4.62.2",
        "@rollup/rollup-linux-loong64-gnu": "4.62.2",
        "@rollup/rollup-linux-loong64-musl": "4.62.2",
        "@rollup/rollup-linux-ppc64-gnu": "4.62.2",
        "@rollup/rollup-linux-ppc64-musl": "4.62.2",
        "@rollup/rollup-linux-riscv64-gnu": "4.62.2",
        "@rollup/rollup-linux-riscv64-musl": "4.62.2",
        "@rollup/rollup-linux-s390x-gnu": "4.62.2",
        "@rollup/rollup-linux-x64-gnu": "4.62.2",
        "@rollup/rollup-linux-x64-musl": "4.62.2",
        "@rollup/rollup-openbsd-x64": "4.62.2",
        "@rollup/rollup-openharmony-arm64": "4.62.2",
        "@rollup/rollup-win32-arm64-msvc": "4.62.2",
        "@rollup/rollup-win32-ia32-msvc": "4.62.2",
        "@rollup/rollup-win32-x64-gnu": "4.62.2",
        "@rollup/rollup-win32-x64-msvc": "4.62.2",
        "fsevents": "~2.3.2"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/vite": {
      "version": "7.3.6",
      "resolved": "https://packages.applied-caas-gateway1.internal.api.openai.org/artifactory/api/npm/npm-public/vite/-/vite-7.3.6.tgz",
      "integrity": "sha512-4XP60spRGjSZFf1qYH+dJIkK2znL3zQfl9KkOV9MkkRR/3Dls0dxaBsQPTloEc5BLXWPL9vsOxopxyKoMmDueg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "esbuild": "^0.27.0 || ^0.28.0",
        "fdir": "^6.5.0",
        "picomatch": "^4.0.3",
        "postcss": "^8.5.6",
        "rollup": "^4.43.0",
        "tinyglobby": "^0.2.15"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "lightningcss": "^1.21.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "lightningcss": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    }
  }
}

```

# Working Mechanics (Source-Confirmed)

These systems are implemented and connected in the current source. “Source-confirmed” means the code path exists and JavaScript parses; it does not replace device testing.

- Main menu and bottom navigation route to Campaign, Cards, Hunters, Kingdom, Relics, and More screens.
- Campaign chapter data, chapter unlocking, chapter completion history, stars, bosses, and campaign rewards.
- Endless battle entry.
- Six-card permanent deck with equip/remove logic and exact-six validation when saving.
- Card collection filters for All, Defense Towers, Support Cards, Battle Skills, and Run Upgrades.
- Card sorting by type, rarity, strength, level, name, and recent acquisition.
- Card inspection screen, favorites, rarity, levels, copies, merge readiness, single-card fusion, and merge-all fusion.
- Two hero ground-defense bonus slots outside the six-card deck.
- Card unlock reconciliation for older saves and campaign progression.
- Browser save migration and legacy-key compatibility.
- Canvas battle rendering, waves, enemies, bosses, tower placement, support placement, traps, skills, run upgrades, targeting, damage, XP, tower levels, synergies, weather, rewards, and battle end states.
- Touch camera pan, pinch zoom, mouse-wheel zoom, camera recenter, pause, and speed controls.
- Native battle command bridge through `window.VillageBattleAPI`.
- Hunters and hunter selection/levels.
- Relic vault and equipped relic effects.
- Keep upgrades, kingdom buildings, achievements, codex, player profile, materials, run history, audio settings, and progression statistics.

# Known Issues and Verification Gaps

## Cards Screen — Critical Recovery Area

The Cards page is the known unstable area from user testing. The current source contains working-looking handlers, but the visual and pointer layers have not been proven reliable on the target iPad.

- `styles.css` contains repeated, overlapping Cards-page selectors across many historical patches. Later rules override earlier rules, often with `!important`.
- The same components (`#deckScreen`, `.deck-slot`, `.portrait-card.compact-card`, `#collectionCards`, `.card-file-tabs`) are redefined in multiple responsive sections. This can produce nonuniform dimensions and layout changes at nearby viewport widths.
- Card category tabs depend on the hidden `#deckTypeFilter` value and JS synchronization. Their event bindings must be device-tested.
- Collection cards contain a parent click action and nested Equip/Remove buttons. The nested handler stops propagation correctly in source, but CSS overlays can still intercept pointer input.
- Sticky actions and bottom navigation may overlap Cards content on shorter landscape viewports.
- No automated browser run was completed for this snapshot.

## Build Verification Gap

- `node --check` passed for the JavaScript modules.
- `npm ci` timed out and `node_modules/.bin/vite` was unavailable, so no fresh `dist/` build was generated.
- This package therefore preserves and documents source; it is not represented as a fully browser-tested release.

# Rules & Constraints

1. **This uploaded V27.1.2 cleaned package is the recovery baseline.** Do not import V27.1.3 code.
2. **Do not modify battle behavior while repairing Cards.** Protect wave logic, enemy logic, combat balance, camera controls, and `window.VillageBattleAPI`.
3. **Preserve the cleaned entry structure:** `src/main.js` imports only the live modules; do not restore parallel `-vNN` runtime copies.
4. **Preserve save compatibility:** keep `relicsEclipseSave`, legacy fallback `gateRunnerSave`, `saveVersion`, existing card IDs, hero IDs, relic IDs, campaign IDs, and inventory structure.
5. **Deck size remains six.** Roads remain a hidden system supplied automatically and do not consume one of the six deck slots.
6. **Ground defenses remain bonus hero slots** and do not count toward the six-card deck.
7. **Do not rename stable DOM IDs** without updating every caller. High-risk IDs include `deckScreen`, `equippedDeck`, `collectionCards`, `deckTypeFilter`, `deckSort`, `mergeOnly`, `mergeAllBtn`, `saveDeckBtn`, `backBtn`, `battleCanvas`, and the battle command buttons.
8. **Touch-first behavior is mandatory.** Every actionable control needs a real semantic button/input, at least a comfortable touch target, and no invisible overlay above it.
9. **Cards recovery must replace conflicting CSS, not append another patch layer.** One authoritative Cards section should own the screen.
10. **Test at iPad landscape before release:** opening Cards, all tabs, sort, merge-only, inspect/back, Equip/Remove, all six deck slots, Merge All, Save Deck, bottom navigation, scrolling, and rotation/resizing.
11. **Keep canvas pointer ownership limited to battle.** The canvas must not intercept input while non-battle screens are active.
12. **Never call a build stable solely because syntax passes.** Stability requires interaction testing on the target device.

# Next Milestone

## V27.2 — Cards System Recovery

**Goal:** Make the Cards & Deck screen uniform, readable, scroll-safe, and fully clickable without changing card data, progression, saves, or battle mechanics.

**Planned work:**

- Extract or replace all Cards-specific CSS with one authoritative section.
- Remove obsolete Cards overrides instead of appending new ones.
- Normalize equipped slots and collection cards to consistent aspect ratios and minimum sizes.
- Ensure the content area clears sticky actions and bottom navigation.
- Use one event-routing path for category tabs and controls.
- Add a temporary diagnostics mode that outlines pointer-blocking layers and logs each Cards action.
- Verify save/reload persistence after deck edits and merges.

**Files expected to change:** `styles.css`, Cards-specific portions of `src/Battle/game.js`, and possibly Cards markup inside `index.html`.

**Protected files/areas:** battle simulation, balance constants, enemy/wave logic, save keys and schema, campaign progression, `VillageBattleAPI`, and unrelated screens.


---

# PROJECT UPDATE — 2026-07-22

## Current Development Focus

Development is currently focused exclusively on the **Cards** screen. Other systems (Village, Battle, Heroes, Relics, Campaign, Save System, etc.) should remain unchanged unless explicitly requested.

## Cards Screen Status

### Completed
- Card inspector implemented as the primary interaction model.
- Inventory cards and Battle Deck cards both open the inspector.
- Add to Deck / Remove from Deck workflow established.
- Category tabs restored (Defense Towers, Support Cards, Battle Skills, Run Upgrades).
- Merge controls restored.
- Visible build label added for validation.

### Remaining Polish
- Battle Deck cards and Collection cards should use one identical card component.
- Card artwork should occupy approximately 75–80% of the card.
- Bottom information/footer section should be significantly reduced.
- Rarity should be expressed through borders, glow, and badges rather than large colored panels.
- Final spacing and visual consistency pass still required.

## Art Direction

The project is transitioning from placeholder icons to premium collectible-quality illustrations.

Every collectible card should eventually feature its own dedicated artwork.

Categories include:
- Defense Towers
- Support Cards
- Battle Skills
- Run Upgrades
- Relics
- Hunters

## Official Art Bible

All future artwork should follow these rules:
- Dark gothic realism
- Ancient cathedral architecture
- Black basalt stone
- Black iron metal
- Heavy silhouettes
- Transparent PNG masters
- Consistent 3/4 elevated camera
- Neutral moonlit lighting with warm interior glow
- High readability at small sizes

## Tower Animation Philosophy

Tower animation tests concluded that the preferred approach is:
- Mostly static tower
- Ambient motion only (torch flicker, smoke, glow, subtle chains)
- Projectiles provide the primary action
- Lightweight effects for performance and readability

## Long-Term Asset Pipeline

Build a unified production-quality asset library consisting of:
- Defense Towers
- Support Cards
- Battle Skills
- Run Upgrades
- Relics
- Hunters
- Enemies
- Bosses
- Buildings
- UI Icons
- Card Frames

Every asset should share the same visual language and production quality.



## Village World V1
The hometown now supports a connected four-district camera world: Old Town at center, West Military Quarter, East Trade Quarter, and South Arcane Quarter. Old Town construction remains compatible and district metadata lives in `assets/village/district_manifest.json`.

## Village World V1.4 — Stability Recovery (2026-07-23)
- Fixed the V1.3 Village black-screen regression caused by calling the walk-path snap routine before the collision rectangle registry had initialized.
- Retained precision road-only collision for the Hunter and citizens.
- Retained portal-based district travel, camera controls, build plots, economy, and save compatibility.

## Village World V1.5 — Free Movement
- Removed all terrain/path collision from the Hunter and citizens.
- West District portal access was widened and corrected.
- Future collision will be applied only to placed building structures and explicit objects.

## V27.5 Shadow + Enemy Asset Integration (2026-07-23)

Scope was intentionally restricted to character and battle visuals.

- Replaced Kael's battle sprite renderer with Shadow's supplied directional sprite sheets.
- Shadow now uses the exact visual tier matching Hunter levels 1 through 9:
  - levels 1–3 from `assets/characters/shadow_lv_01-03`
  - levels 4–6 from `assets/characters/shadow_lv_04-06`
  - levels 7–9 from `assets/characters/shadow_lv_07-09`
- Added idle, walking, and attack animation selection while retaining the existing hero movement, targeting, damage, range, rate, and projectile mechanics.
- Replaced procedural enemy placeholder drawings with supplied goblin, flower-creature, and vampire sprite sheets.
- Enemy facing now follows its current road segment; elite, miniboss, and boss scale remain visual-only.
- Replaced the Village-world Kael walking art with Shadow level-1 directional walking art.
- No cards, towers, roads, waves, enemy stats, hero stats, economy, UI behavior, or progression logic were changed.


## V27.6 — Shadow Direction + Enemy Visibility Repair
- Corrected supplied sprite-sheet direction order to down/up/left/right in battle and village rendering.
- Added preload and base-URL resolution for Shadow and enemy sprites.
- Added Safari cache-busting for the repaired battle module and CSS.
- No gameplay mechanics, combat values, waves, roads, cards, economy, or progression changed.


## V27.7 — Shadow Direction and Enemy Health-Bar Correction

- Corrected the Village world Shadow sprite row mapping based on verified in-game direction output: down=first row, left=second row, right=third row, up=fourth row.
- Moved all battle enemy health bars below their rendered sprite footprint, including standard, elite, mini-boss, and boss enemies.
- This update is visual-only and does not alter game mechanics or balance.


## V27.8 — Shadow World-Map Trail Fix

- Removed the duplicate CSS drop-shadow and oval shadow from Shadow's Village-world avatar.
- The supplied `With_shadow` sprite sheet already contains its own ground shadow; Safari was smearing the extra filtered shadow while the avatar moved upward.
- Added a stylesheet cache-buster.
- Visual-only update; no gameplay mechanics or balance were changed.

## V27.9 — Village Boundaries & Gate Arrival Fix
- Restored active-district movement bounds so Shadow cannot leave map artwork or bypass perimeter walls.
- Added axis-separated boundary collision.
- Corrected east/west paired gate arrivals to spawn on the opposite side of the destination district.
- South travel remains unchanged.


## V28.0 — Golem Boss Arc and Shadow Level 2
The first ten campaign chapters now form a Golem arc. Chapters 1–4 use form 1, chapters 5–9 use form 2, and chapter 10 uses a health-threshold three-form battle. Form 3 destroys one placed tower every six seconds. The first chapter-10 clear grants the one-time Heart of the Golem and permanently sets Shadow to level 2. Save migration is additive through `shadowLevel` and `uniqueBossDrops.golemCore`; existing progress remains intact.

## V28.1 — Player-Directed Battle Upgrades
- Tower kill ownership no longer determines upgrades.
- Enemy deaths fill a shared Battle XP bar and award player-controlled Upgrade Points.
- Players select a placed attack tower and choose Power, Range, or Speed from its inspector.
- Axe Tower has a stronger range-upgrade path (+0.50 tiles) so it can function behind front-line towers.
- Battle upgrades remain run-local; permanent save compatibility is preserved.

## V28.2 — Player Upgrade Prompt / Axe Range Isolation
- Shared Battle XP remains active and awards player-controlled Upgrade Points.
- Earning a Battle Level now pauses combat and opens a dedicated upgrade-selection modal.
- The player selects a placed tower and chooses Power or Speed; Axe Tower additionally offers Axe Range.
- Range upgrades are prohibited for every non-Axe tower.
- The original global tower combat-radius behavior was restored; Axe alone gains +0.50 tile radius per chosen range upgrade.
- Upgrade Points can be saved and the selection modal reopened by tapping the UPGRADES HUD pill.
- No permanent save schema was changed.

## V28.3 — Battle Support, Random Roads, and Gothic Card Workshop
- Battle upgrades now apply to all deployed and future copies of the exact same tower card during a hunt.
- Axe alone retains the optional range upgrade.
- Fixed support attachment registration; support effects now reach their linked attack tower.
- Strengthened Holy Water, Chrono Sigil, and Guardian Ward feedback/effects.
- Road plans now use randomized connected waypoints instead of predictable full-width serpentine sweeps.
- Cards screen received a complete Gothic Card Workshop visual redesign.

## V28.4 — Arcane Card Forge
- Cards screen redesigned with a high-impact gothic/arcane visual presentation.
- Existing six-card loadouts, filters, deck management, inspection, favorites, and merge structure preserved.
- Merged cards now gain +10% power per card level in addition to rarity multipliers.
- Existing save data remains compatible.

## V28.7 — Raid-Style Battle Deck UI
- Completely replaced the Cards screen presentation with an icon-first mobile deck-building layout.
- Large selected hunter panel sits beside a 3x2 six-card active deck.
- Collection cards prominently show full emoji/icon artwork, level, ATK, HP, copies, and full-card rarity color.
- Preserved category tabs: All, Defense, Support, Battle Skills, Run Upgrades, Passives.
- Preserved loadouts, passive slots, merging, sorting, favorites, inspection, and save compatibility.

## V29.1 — Card Armory, JP, and Progress Preservation
- The uploaded current-progress build was used as source of truth.
- Cards UI now has one final authoritative CSS layer to prevent conflicting legacy responsive rules.
- Deck and collection cards share matching compact dimensions and show full icon, level, ATK, HP, rarity background, and copy state.
- Hero tab is a dedicated responsive Shadow Vanguard dashboard with 10 sequential permanent ranks.
- Existing players receive a one-time 10 JP migration grant. Each campaign stage grants 1 JP only on first clear.
- Save version 12 stores `jpRetroGrantV1`, `jpAwardedStages`, and `heroJobs[heroId].vanguardRank`.
- Before migration, the old localStorage save is copied to `relicsEclipseSave_backup_v12`.
- Tower battle upgrades are per card type: ATK max 5, Speed max 5, Radius max 3.

## V31.3 — Living Village: Day, Night & Weather
- Added a six-stage accelerated Village time cycle with dawn, morning, afternoon, evening, night, and deep night presentation.
- Added dynamic clear, fog, wind, and rain ambience; nighttime fireflies; enhanced lantern glow; wind leaves; and synthesized cathedral bells.
- Added interactive Village landmarks and three one-time exploration discoveries tied to Village gold.
- Added an isolated `rotk.village.living.v31_3` metadata key to preserve the established save schema.
- Added `ROTKGameBridge.grantVillageReward()` for safe economy reward delivery.
- Preserved the full-map collision mask, Shadow controls, fixed FF4 camera, construction, cards, battle progression, economy, and existing saves.

## V31.5 — Living Economy & Construction
- Village buildings now visually progress through four timed construction stages while remaining compatible with the existing plot save format.
- Added delivery workers, merchant caravan traffic, wildlife, district identity, random village events, Cathedral services, Shadow's Home, and a dynamic happiness layer.
- New transient/persistent data is isolated under `rotk.village.juice.v31_5`; no existing battle, card, economy, or construction keys were renamed.


## V32.0 — The Kingdom Begins (2026-07-26)

Implemented a campaign-gated progression backbone joining Village and Battle. A fresh settlement begins with only House, Farm, Lumber Camp, Quarry, and Warehouse. Campaign roads reveal research projects; completing research unlocks later structures. Village production now includes Food, Wood, Stone, Iron, Essence, and Gold with multi-resource construction costs. Battles return resources to the Warehouse, while constructed Blacksmiths, Libraries, Markets, Chapels, Barracks, and Watchtowers provide battle bonuses. The Kingdom Chronicle records founding, victories, research, and Shadow's awakening. Shadow remains Level I throughout the ten-road Golem arc and only changes to Level II after the final Golem relic is returned to the Village and the player completes the Cathedral awakening event.

## V32.2.1 — Battle Completion Freeze Fix
- Final-wave victory resolution now takes priority over Essence Vial drafts and pause states.
- Fixed completed battles freezing when the final enemy filled the Essence Vial.
- Battle results now offer Hunt Again, Cards, and Home with full battle UI teardown.

## V32.2.2 Stability Fix
- Battle victory now checks for living enemies before pause handling and again after corpse cleanup, preventing final-wave Essence drafts from freezing completion.
- A one-time completion guard prevents duplicate results/rewards, with a recovery results screen for unexpected exceptions.
- All tower effective attack/AoE radii and radius-upgrade scaling are reduced to 50%; explicit splash radii are also halved.


## V32.2.3 Battle Control & Card Rendering
- Battle shake fully disabled.
- Upgrade popup includes tower swap and tower move tactical actions.
- Safari/iPad card icon repaint bug corrected with persistent rendering rules.


## V32.3.1 — Card Footer Restoration
Restored the original Cards screen card dimensions, stats/footer, rarity labels, and small corner icons. The only layout adjustment is a small upward shift of the card name into the existing dark gap; long titles use ellipsis without resizing the card. V32.3 boss and Dagger mechanics remain unchanged.

## V32.3.2 — Card Title Row Fix
- Restored a strict two-row card footer layout without resizing cards.
- Card name is isolated in the upper dark title band; stats/icons remain in their original lower row.


## V32.5.0 — Three.js Village World
The visible Village world is now rendered through `src/Renderer/villageThreeWorld.js` with a fixed front-facing camera following Shadow. Existing economy, save, build catalog, plot data, progression, battle systems, and bottom navigation remain authoritative and unchanged. The Cathedral remains at the north-center anchor.

## V32.5.2 — Three.js-only Village renderer
- Removed the active `the_village_main.png` element from the Village DOM.
- The Three.js canvas is now the only visible world renderer.
- Legacy world sprites/ambience remain unavailable to the Village render path and cannot silently appear as fallback.
- Save/economy/build/menu interfaces remain unchanged.

## V32.5.8 — Gothic Art Integration
The active Three.js Village renderer now removes the remaining pale prototype houses and uses the supplied Village artwork for residences, larger structures, and farms. Construction pads are now organic grass lots with subtle stone borders and build-mode-only signs. The legacy 29-slot plot/save mapping and all game systems remain intact.


## V32.6.7 — The Living Village
Three.js Village now includes gentle terrain elevation, connected walkways, larger trees, animated chimney smoke, flickering lamps, 3D fireflies, moving crops, and lightweight roaming villagers. Save schema and campaign systems are unchanged.
# Stage 6 yellow-screen lifecycle repair

Symptoms: entering Chapter 6 could leave the shared battle canvas covered by a yellow/gold composite state, and later chapters inherited the corruption because the same canvas context and battle overlay DOM are reused.

Root cause: battle startup and shutdown did not establish a clean transient visual baseline. The singleton Canvas 2D context retained mutable composite, alpha, filter, shadow, transform, and dash state, while delayed cinematic/start callbacks from an earlier run were not tied to that run. Chapter 6 was the first chapter using the expanded post-Chapter-5 route tier, which exposed the stale-state path; its Blackstone map configuration itself contains no yellow tint or missing background asset.

Fix:

- Added `resetBattleVisualState()` in `src/Battle/game.js`.
- Reset transient Canvas 2D state and hide battle-only overlays at stage initialization and battle-screen exit.
- Clear transient camera, flash, damage vignette, shake, and boss presentation state without touching gameplay or saved progression.
- Added a monotonically increasing battle session ID so delayed stage-intro callbacks cannot affect a restarted or replacement stage.
- Reassert the expected Canvas baseline at the root of each frame before drawing.
- Added opt-in diagnostics through `localStorage.villageVisualDebug = "1"` or localhost; no per-frame logging is emitted.

Validation: project-wide searches confirmed Chapter 6 has no yellow tint/filter/shader or missing-background placeholder. Chromium parsing and initialization are required after this change. The isolated automated CDP reproduction was unavailable because the installed Chrome did not expose its requested debugging endpoint, so manual Stage 1 → 6 → 1 visual verification remains required before release sign-off.
# V35.2 Progression Economy Audit (uncommitted)

- Cumulative, capped Essence draft milestones replace repeating vial resets.
- Active attack towers are capped at seven; late drafts favor tactical improvements and support.
- Permanent card copies are awarded by controlled stage settlement rather than per-enemy RNG.
- Replay rewards diminish; defeats provide targeted fragments without copies.
- Data-driven rarity requirements add escalating copy and material costs without downgrading old saves.
- Card rarity and level progression are separated; stage-band XP ceilings affect only future gains.
- Development-only isolated benchmark profiles and local progression telemetry support balance testing without touching live/cloud progress.
- Canonical tuning and expected power bands live in `src/Progression/economyRegistry.js`; see `docs/PROGRESSION_ECONOMY_V35_2.md`.
- Fresh-profile onboarding was re-audited after the new 5/2/1 composition: Stage 1 offers eight decisions, keeps a tower option available until all five attack roles are filled, and uses a difficulty envelope that tapers away by Stage 5. The fixed-seed model reports a 95.4% reasonable-play win rate.
# Battle New Generation foundation (local, uncommitted)

- New generated gothic siege battlefield matte, cracked-road renderer, damage-reactive cathedral, placement pads, and readability-first atmosphere.
- New modular 5 attack / 2 support / 1 utility composition with road-reach validation.
- Six-tower core registry: Dagger, Axe, Crossbow, Ballista, Holy, and Arcane; three new tower cards use the existing unlock/save migration path.
- Shared core-tower animation states and projectile registry.
- Phase-weighted drafts, role-aware tower removal, readable wave identities, capped spawn counts, and breathing periods.
- Development-only FPS/battle-state overlay.
- Existing Golem arc, Dracula's Tooth cinematic, Shadow Level 2 persistence, permanent rewards, authentication, saves, cloud sync, Village, Ascension, and tester feedback remain preserved.
- Architecture and limitations: `docs/BATTLE_NEW_GENERATION.md`.
# Village 2.0 world foundation (local, pending manual approval)

The Village world now consumes dedicated data registries for districts, roads,
landmarks, plot coordinates, building-to-model mappings, and citizen schedules.
The renderer uses a production Gothic material atlas, permanent clear-night
lighting, connected road-routed citizen travel, and non-circular prepared build
foundations. Village economy calculations are isolated in a pure module with
population-based workforce efficiency, warehouse storage capacity, a twelve-hour
offline cap, and explicit protection for legacy balances above capacity. The
legacy 29-slot plot/save contract is unchanged. See
`docs/VILLAGE_2_WORLD_REBUILD.md`. These changes remain uncommitted for testing.

## Village 2.0 bespoke art pass (local, pending manual approval)

- Replaced the generic Cathedral landmark with a bespoke multi-part Gothic Cathedral.
- Added a dedicated carved-stone, stained-glass, copper-roof, and wrought-iron atlas.
- Replaced duplicate generic bridges with bespoke masonry and iron river crossings.
- Added physical district gateways and seven irregular paved precincts.
- Propagated the bespoke material language into compatible GLB landmark materials.
- Replaced bright perimeter masonry with dark moonlit stone.
- Hid empty construction foundations outside build mode.
- Preserved all Village saves, plots, economy, progression, input, battle, auth,
  local-save, and cloud-save contracts.
- Full details: `docs/VILLAGE_BESPOKE_ART_PASS.md`.
