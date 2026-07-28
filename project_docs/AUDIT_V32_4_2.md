# THE VILLAGE — V32.4.2 CODE AUDIT

**Audit date:** 2026-07-26
**Audited baseline:** V32.4.1 Stability Audit
**Result:** JavaScript syntax passes; every static and dynamically-constructed asset reference resolves; module evaluation, a 20-frame battle loop, road growth, chest generation and all easter eggs verified against a DOM stub; save schema unchanged and backward compatible.

## Audit coverage

- Runtime entry chain and module import order
- All JavaScript under `src/`, plus `index.html` and `styles.css`
- Every literal and template-literal `assets/...` reference, including all 33 enemy families x 5 actions, all 9 Shadow levels and all 3 Golem forms
- Save loading, migration, and the destructive fresh-start token
- Battle update/draw hot paths and per-frame allocation
- Sprite preload cost and its effect on first paint
- Cache-busting identifiers across HTML, CSS and JS
- Package and lock-file metadata
- Reachability analysis of every top-level function and module-level constant

## Bugs repaired

1. **Dead legacy Village controller removed.** `src/Battle/game.js` carried a complete V22.3b Village system (126 lines) behind `if(window.__ROTK_VILLAGE_BOOTSTRAP__) return;`. `src/villageBootstrap.js` sets that flag at module-evaluation time and `main.js` imports it first, so the block had been permanently unreachable since V30.1. Its removal also eliminates the duplicate `clampCamera` definition.
2. **Stale stylesheet cache identifier.** `index.html` still requested `styles.css?v=v27-8-shadow-trail-fix` while the module used `?v=v32-4-1-audit`. iPad/iPhone Safari could serve a V27.8 stylesheet against V32.4 markup. All three identifiers (`styles.css`, `src/main.js`, `Battle/game.js`) now move together on `v32-4-2`.
3. **`applyBooster()` removed.** No entry in `CARD_POOL` declares `type:'booster'`, so the dispatch was unreachable. All four ids it handled (`soulPact`, `sharpen`, `fortify`, `moonBlessing`) are `type:'hero'` cards already routed through `applyHeroUpgrade()`. The function also contained a latent defect: `G.hp=Math.min(30,G.hp+5)` hard-coded a 30 HP ceiling where every other heal uses `G.maxHp`, so with wall, chapel, village or relic bonuses it would have *reduced* gate health.
4. **Write-only `G.gold` removed.** The field was assigned in three places and read in none; `#goldTxt` was repurposed to display Essence. See "Open design decision" below.
5. **Fractional gate health in the HUD.** `#hpTxt` printed `G.hp` raw, so heal traps (`+.35`) and the Faerie familiar (`+.25`) produced readings such as `18.35`. Now `Math.max(0,Math.ceil(G.hp))`.
6. **`grantEndChest()` crash guard.** `pool[Math.floor(Math.random()*pool.length)]` followed by `inv(c.id)` threw a `TypeError` when the eligible pool was empty (reachable with a damaged save). It now falls back to the starter deck and skips safely.
7. **No-op expression removed** in the hero frame calculation: `*(heroAction==='attack'?1:1)`.
8. **Empty `assets/backgrounds/` directory removed** — left behind by the V32.4.1 menu-background repair.
9. **`package-lock.json` version corrected.** The V32.4.1 audit recorded that the lock file was bumped; it was in fact still at `27.3.0`. Both the root and the `the-village` package entry now read `32.4.2`.

## Optimisations

1. **Road-shape memoisation.** `pathSet()` rebuilt a `Set` from `G.path` on every call, and `validTowerTile()` calls it up to five times per pointer-move during placement. `routePoints()` rebuilt two arrays plus N point objects *per enemy, per frame*, in both `update()` and `draw()`. Both results are read-only at every call site, and the road is append-only between waves, so a single `roadVersion` counter now backs both caches. Invalidation is bumped by `rebuildVisiblePath()`, `appendRouteTile()`, `placeRoadPiece()` and `freshGame()`, and was verified: after one road-growth step, `path` 6 to 7, `roadVersion` 1 to 2, cached set 6 to 7, cached route points 8 to 9.
2. **Batched grid rendering.** The tactical grid issued 288 individual `ctx.strokeRect()` calls per frame. It is now one path of 35 lines. Note: `strokeRect` double-drew every shared interior edge, so interior lines previously rendered at roughly double the alpha of the outer boundary; the batched grid is uniform, and slightly lighter inside.
3. **Sprite preload split by reachability.** Module evaluation previously fetched every enemy family: about 2.07 MB of sheets competing with first paint, of which about 0.87 MB belongs to the deep roster that first appears in chapter 11. Shadow, the starting bestiary and the Golem forms stay eager; the remainder is warmed through `requestIdleCallback` (2.5 s timer fallback). `spriteImage()` already resolves on demand, so nothing depends on the warm-up completing.
4. **Dead lookup table removed.** A per-type Walk-sheet map existed solely to warm sixteen sheets that the family preload already covered, and no code read it.

## Metal Gear Solid easter eggs (new)

Three presentation-only homages, in the same spirit as the existing Vampire Killer/Konami tribute. None reads or writes a combat value, a save-schema field or a progression gate, and each degrades to a no-op if its host element is absent.

1. **Codec call — frequency 140.85.** Type `14085` anywhere, or triple-tap the weather readout during a hunt. Opens a scanline codec overlay with a frequency header, animated waveform and typewritten dialogue from one of four callers (Colonel, Mei Ling, Otacon, Master Miller), each rewritten as in-world advice about roads, tower adjacency and Essence. The first call ever placed greets the player with "Kept you waiting, huh?" and records `village.mgs.greeted`.
2. **Alert.** When a road guardian first notices you, the iconic `!` marker rises above it on the canvas with a two-note alert sting, wired into `beginBossCinematic()` and rendered inside the world transform.
3. **Psycho Mantis.** Five quick taps on the Profile stat grid. He reads the actual save file back to the player — run count, victories, most-hoarded card and its copy count, selected hunter, roads closed, best wave, number of favourited cards — then asks them to put the device down and moves the screen with his mind.

Styling lives in one clearly-delimited block at the end of `styles.css`; every selector is unique to the feature and honours `prefers-reduced-motion`.

## Open design decision — orphaned upgrades

Three purchasable upgrades currently have no effect, because they fed only the removed `G.gold` field:

| Upgrade | Source | Promised effect |
| --- | --- | --- |
| Soul Reserve | Keep upgrade, 10 ranks, 18 Essence each | +6 starting souls per rank |
| Hunter Tavern | Kingdom building, 5 levels | +5 starting souls per level |
| Night Market / Tavern | Village buildings, via `villageBattleBonuses().startingGold` | +5 / +3 starting souls |

Players spend Essence on these and receive nothing. This was **not** repaired in V32.4.2 because the only sensible repair — routing the bonus into starting Essence — is a balance change, not a mechanical one: ten ranks of Soul Reserve plus a maxed Tavern would lift the opening vial from 40 to well past 130, which materially changes the early waves. The one-line change, when the balance is decided, is in `freshGame()`:

```js
const startEssence = 40 + (up.souls||0)*6 + (kb.tavern||0)*5 + villageBonus.startingGold;
// then: essence: startEssence, maxEssence: startEssence
```

Alternatively, retire the three upgrades. Either way it is a design call, not an audit call.

## Still outstanding

- **`FRESH_START_TOKEN` is still live.** `'v32.2-new-beginning'` wipes every `localStorage` key matching `^(relicsEclipse|gateRunner|rotkVillage|theVillage|village\.)` on first run. Anyone who already launched V32.2 is unaffected, but a destructive one-shot is still shipping two minor versions later. Left in place deliberately; confirm before the next release.
- **`styles.css` remains overgrown:** 2,531 lines, 608 `!important` declarations, and seventeen selectors defined four times over. `ARCHITECTURE.md` warns against refactoring this outside a dedicated build, and that guidance still stands.
- **Roughly 460 lines of CSS still live in two inline `<style>` blocks in `index.html`**, contradicting the stated rule that `styles.css` owns all presentation. Consolidating them is safe but belongs in its own change.
- **`src/Battle/game.js` remains a single 2,567-line controller.** Extraction by domain is still the right eventual move, and still needs behavioural coverage first.

## Validation performed

- `node --check` on every JavaScript source file
- Full module evaluation against a DOM/Canvas/WebAudio stub, with no thrown error
- 20 simulated `update()` + `draw()` frames after `freshGame()`
- Road-growth cache-invalidation assertion (see Optimisations 1)
- `grantEndChest()`, `dialCodec()`, `mgsAlert()`, `drawMgsAlert()` and `mantisReading()` exercised
- Idle deep-roster warm-up executed explicitly
- Programmatic existence check of every resolved asset path
- Duplicate top-level function scan
- Reachability scan for all removed identifiers
