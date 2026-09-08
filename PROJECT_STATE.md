# THE VILLAGE — PROJECT STATE

A snapshot of the game as it stands. Release history is in
[`CHANGELOG.md`](CHANGELOG.md); system structure is in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

**Written for whoever picks this up next, human or agent.** If you read one
file before touching the code, read this one, then `ARCHITECTURE.md`.

---

## At a glance

| | |
|---|---|
| Version | 36.0.0 — Gothic Collection (`src/config/release.js` is the single source) |
| Engine | None. Hand-written JavaScript, ES modules, no framework |
| Build | Vite 7 |
| Rendering | Canvas 2D for battle, Three.js r128 for the Village, DOM/CSS for all UI |
| Persistence | `localStorage`, plus optional Supabase cloud save |
| Save schema | 15 (`ASCENSION_SAVE_VERSION`) — see [`SAVE_SCHEMA.md`](SAVE_SCHEMA.md) |
| Platforms | Desktop browsers, iPad, iPhone, Android |
| Source size | ~8,700 lines across `src/`, of which `Battle/game.js` is 3,500 |
| Assets in repo | 4,205 files, 260 MB. A production build ships 165 of them, 45 MB |

---

## The gameplay loop as it exists today

Village → Campaign → Battle → Rewards → Research → Village.

1. **Village.** Shadow walks a 3D gothic village. Buildings occupy plots and
   produce food, wood, stone, iron, essence and gold continuously, including
   while the game is closed (offline production is capped at 12 hours). Citizens
   walk authored routes; the world has a day/night cycle, weather, timed events
   and hidden secrets.
2. **Campaign.** Twenty chapters, each a map, a wave count, a boss and a relic.
3. **Battle.** A card-driven tower defense on a Canvas 2D battlefield. Enemies
   walk branching roads toward the cathedral gate. Killing them fills an Essence
   vial; when it fills, the battle pauses and offers a three-card draft. Cards
   place towers, supports, ground defenses, road pieces or skills. Towers merge
   when placed on one another and gain hidden bonuses from orthogonal
   neighbours. Shadow fights alongside the towers with a familiar in orbit.
4. **Rewards.** Victory grants gold, essence, elemental fragments, equipment,
   Job Points, card unlocks, and the chapter's relic.
5. **Research.** Village research is gated on the highest chapter completed and
   consumes village resources. Each project unlocks buildings.
6. **Back to the Village**, where the new buildings feed battle bonuses:
   Blacksmith and Armory raise tower damage, Library raises Shadow's damage,
   Watchtower/Barracks/Chapel raise starting gate HP, Market and Tavern add
   starting essence, Market raises rewards.

**This loop is closed and it works.** Both directions are wired: battle
progression opens village research, and village buildings measurably change
battle. That is the project's biggest asset and the thing to protect.

---

## Systems that exist and work

| System | State | Where |
|---|---|---|
| Village world (3D) | Working | `src/Renderer/villageThreeWorld.js`, `src/Village/` |
| Village economy, offline production | Working | `src/Village/economyModel.js` |
| Construction, 33 buildings, 8 categories | Working | `src/data/villageBuildings.js` |
| Village research, 10 projects | Working | `src/data/villageBuildings.js` |
| Campaign, 20 chapters | Working | `src/data/campaign.js` |
| Battle simulation, towers, merging, synergies | Working | `src/Battle/game.js` |
| Cards: collection, deck, upgrades, fusion | Working | `src/Battle/game.js` |
| Bosses, Golem arc across chapters 1–10 | Working | `src/data/campaign.js` |
| Relics, 20, one per chapter | Working | `src/Ascension/registry.js` |
| Familiars: Bat, Giant Sword, Demon, Ghost, Faerie | Working, shallow | `src/Ascension/registry.js` |
| Equipment (36), gems (18), fusions (6), elements (6) | Working | `src/Ascension/registry.js` |
| Shadow: 9 levels, JP, jobs, equipment | Working | `src/Battle/game.js` |
| Save: local, versioned, migrating, exportable | Working | `src/Battle/game.js`, `SAVE_SCHEMA.md` |
| Cloud save + accounts (Supabase) | Working, optional | `src/online/` |
| In-game tester feedback | Working | `src/online/feedbackSystem.js` |
| Debug channels | Working | `src/config/debug.js` |

**Starting buildings are House, Farm, Lumber Camp, Quarry and Warehouse.**
Everything else is earned. That progression gate is already implemented and
should not be widened.

---

## Where the weight is

- `src/Battle/game.js` — 3,500 lines, 332 KB. Content definitions, battle
  simulation, rendering, every non-Village screen, the save system, and the
  bridge the Village talks to. Some lines exceed 2,500 characters. This is the
  single biggest maintenance risk in the project.
- `src/villageBootstrap.js` — 1,492 lines. Owns the entire Village screen.
- `src/Renderer/villageThreeWorld.js` — 1,054 lines. The Three.js world.
- `styles.css` — 3,425 lines with 705 `!important` declarations, plus another
  916 lines of CSS inlined in two `<style>` blocks in `index.html`.

---

## What is thin rather than broken

These systems run, but do less than their presence implies. They are the
honest answer to "what should we build next".

- **Familiars** have levels and XP but the five are close to interchangeable in
  practice, and there is no upgrade path or visual progression.
- **Relics** are collected and one can be equipped, but they mostly do not feed
  research, crafting or village progression the way the design intends.
- **The Gem Forge** exists as a building but the gem and fusion interface lives
  on the Cards screen; the building itself does nothing when built.
- **Iron and leather** are produced but have very few sinks.
- **Later research tiers** (chapters 14, 17, 20) are a long way from the content
  most players will reach.

---

## Known issues

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).

---

## Next milestone

See [`ROADMAP.md`](ROADMAP.md). The recommendation is **Milestone 2 — Make the
loop legible**: the systems are connected, but the player is not told about it.
