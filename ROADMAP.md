# THE VILLAGE — ROADMAP

Milestones, not dates. Each one ends in a state you could hand to a player.

The ordering principle for this project: **stability, then architecture, then
gameplay integration, then content, then polish.** A feature earns its place by
strengthening the Village → Battle → Boss → Relic → Research → Village loop, not
by adding a system beside it.

Every recommendation below carries a size (SMALL / MEDIUM / LARGE), a risk
(LOW / MEDIUM / HIGH) and the systems it touches.

---

## Milestone 1 — Stability ✅ largely complete

The audit pass closed the defects that could cost a player progress or leave the
game unplayable on a deployment. See [`CHANGELOG.md`](CHANGELOG.md).

Remaining:

- **Real device testing on iPhone and iPad.** Everything to date is Chromium at
  iPad and iPhone viewport sizes, which does not cover Safari audio unlock,
  rotation, the home indicator, or WebGL context pressure with other tabs open.
  SMALL · LOW · everything. **Do this before anything else ships to testers.**

---

## Milestone 2 — Make the loop legible ← recommended next

The loop is already closed. The player is not told about it. This milestone adds
no new systems; it makes the existing ones visible, and it is where the largest
gain per unit of risk currently sits.

1. **Show the battle bonuses a building provides, on the building.** The
   Blacksmith raises tower damage, the Library raises Shadow's damage, the
   Watchtower raises gate HP, the Market raises starting essence and rewards —
   all real, all computed in `villageBattleBonuses()`, none of it surfaced. The
   build catalog shows "+3 Iron / h · tower repair"; it should show "+4% tower
   damage in battle". MEDIUM · LOW · Village build catalog, `game.js` bridge.
2. **Show the active village bonuses on the pre-battle screen.** Before a hunt,
   list what the Village is contributing: starting essence, gate HP, tower
   damage. This is the single clearest way to make village development feel like
   it matters. SMALL · LOW · campaign screen, battle setup.
3. **A "what should I do next" line in the Village.** One sentence naming the
   nearest unlock: the next research project and what it needs, or the next
   chapter. The data exists in `availableVillageResearch()`.
   SMALL · LOW · Village HUD.
4. **An unlock announcement that names the consequence.** When a chapter is
   cleared, say what opened — which research is now available, which cards were
   granted — rather than only that the chapter is complete.
   SMALL · LOW · battle results screen.
5. **Explain refusals.** A locked or unaffordable building should say *why* and
   *what would fix it*, not just appear dimmed. MEDIUM · LOW · build catalog.

**Exit criteria:** a new player can answer, without being told: what can I do,
why can I not do that, what did I just unlock, what should I work toward.

---

## Milestone 3 — Give the thin systems weight

These systems exist and are wired in, but do less than their presence promises.
Deepening them is cheaper and better than adding new ones.

1. **Make relics feed the loop.** Relics are collected and one can be equipped.
   The design intent is that they feed research, crafting and village
   progression. `golemIndustry` already gates on an artifact — extend that
   pattern so later research and higher building tiers require specific relics.
   MEDIUM · MEDIUM · relics, village research, campaign rewards.
2. **Differentiate the familiars.** Bat, Giant Sword, Demon, Ghost and Faerie
   have levels and XP but play much the same. Give each one distinct battle
   behaviour and one upgrade path, so choosing a familiar is a decision.
   MEDIUM · MEDIUM · `COMPANION_REGISTRY`, battle simulation, save.
3. **Make the Gem Forge do something when built.** The building is now reachable
   but the gem and fusion interface lives on the Cards screen and ignores it.
   Either gate part of that interface behind the building, or give the building
   a bonus to fusion. SMALL · LOW · Village, Cards, Ascension.
4. **Give iron and leather a sink.** Both are produced and barely spent.
   SMALL · LOW · economy, build costs, crafting.

---

## Milestone 4 — Architecture

Do this once the loop is legible, not before. Nothing here changes what the
player sees, so it is easy to defer and easy to under-value; the cost of
deferring it is that every gameplay change above gets slower.

1. **Continue extracting data from `Battle/game.js`.** `src/data/` now holds the
   campaign and village data. Next: the card pool, tower definitions, maps and
   chapter card unlocks. Each extraction extends `validate-content.mjs`.
   MEDIUM · LOW · `game.js`, `src/data/`, validators.
2. **Extract the save layer** out of `game.js` into `src/save/`. It is the
   highest-stakes code in the project and it currently sits in the middle of the
   battle engine. MEDIUM · MEDIUM · save, cloud save.
3. **Consolidate CSS.** Move the 916 lines inlined in `index.html` into
   `styles.css`, then split by feature. Many of the 705 `!important`
   declarations exist only to out-specify each other and can go with them.
   LARGE · MEDIUM · all presentation. Do it breakpoint by breakpoint, verifying
   at desktop, iPad and iPhone widths after each.
4. **Give `index.html` element ids a manifest.** They are an undeclared API
   between the DOM and two large modules; a rename fails silently.
   SMALL · LOW · `index.html`, both controllers.
5. **Prune the asset library.** 260 MB in the repository for a 45 MB build.
   Removing unused source art will not shrink history, but it will shrink every
   future clone and checkout. MEDIUM · MEDIUM · assets. Verify against
   `runtimePublicAssets()` before deleting anything.

---

## Milestone 5 — Content expansion

Only after the above. Content added to an illegible loop makes it more
illegible.

- Chapters 13–20 currently reuse earlier maps and boss archetypes with scaled
  numbers. Give the late campaign mechanically distinct bosses.
  LARGE · MEDIUM · campaign, battle.
- Later research tiers (chapters 14, 17, 20) are far beyond where most players
  will reach. Consider re-spacing them once real playtest data exists.
  SMALL · MEDIUM · village research. **Needs playtest data first.**
- More village buildings only after the existing 33 each have a clear reason to
  be built.

---

## Milestone 6 — Polish

- Audio mix, battle feedback, transitions.
- Onboarding for the first fifteen minutes.
- Accessibility: contrast, focus order, reduced motion.
- Performance profiling on the oldest device you intend to support.

---

## Milestone 7 — External playtesting

The tester feedback system already exists and works. Before opening it up:

- Real device certification (Milestone 1).
- A deployment testers can reach (already possible — see
  [`DEPLOYMENT.md`](DEPLOYMENT.md)).
- A save-recovery procedure for when someone reports lost progress (documented
  in [`SAVE_SCHEMA.md`](SAVE_SCHEMA.md)).

---

## Things deliberately not on this roadmap

Recorded so they do not get proposed again without a reason.

- **A rewrite, or a framework.** The game works. A rewrite would trade a working
  product for an architecture preference.
- **A service worker or PWA shell.** There is no offline requirement, and a
  cache that serves a stale build to a tester costs more than it saves.
- **New systems beside the loop** — crafting trees, procedural quests, multiple
  villages, multiplayer. Ten well-integrated systems beat fifty unfinished ones.
- **Reorganising the asset folders.** The layout is inconsistent, but hundreds of
  working paths are built from it at runtime. The risk exceeds the tidiness.
