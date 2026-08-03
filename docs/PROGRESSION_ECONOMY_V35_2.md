# V35.2 Progression Economy

## Battle choices

Essence is cumulative for the complete stage and is never reset by a draft. Stage 1 uses tutorial milestones `0, 7, 15, 25, 38, 52, 69, 88`, with a 14-second minimum interval and one-wave gate. Its eight choices include the opening tower and enough opportunities to fill the five-attack-tower composition; at least one tower is offered while attack space remains. Stages 2–3 use a seven-choice foundation curve, stages 4–5 introduce the six-choice challenge curve, and Stage 6 onward reaches the standard campaign schedule.

Stage 1 also applies an explicit data-driven onboarding envelope: 64% of the generic normal-enemy HP curve, 38% of the generic boss curve, and 12 additional gate health. This envelope tapers through Stages 2–4 and is completely removed by Stage 5. Enemy damage and tower base DPS are unchanged. A fixed-seed 5,000-run reasonable-play model measures a 95.4% Stage 1 win rate, 124 earned Essence, eight drafts, five attack towers, and a 13.8-second average boss TTK among wins. Run it with `npm run audit:stage1`.

The new-generation composition is five attack towers, two support towers, and one utility/trap structure. Once the attack roles are filled, new attack towers leave the draft pool and tactical improvements become available. Tactical effects are defined in `src/Progression/economyRegistry.js`.

## Permanent rewards

Enemy kills no longer grant permanent card copies. A first clear grants two controlled copies and targeted fragments. Replays use a diminishing copy schedule of 100%, 50%, 25%, then no raw copy; later replays retain a small targeted-fragment reward. Defeats grant fragments, never permanent copies. First-clear boss equipment remains special, while guaranteed chapter gems remain unchanged.

Rarity costs increase as follows: 3, 5, 8, 12, 18, 30, and 50 matching copies, with Forge Ember, Eclipse Shard, and Ancient Relic gates at higher tiers. Rarity fusion no longer also grants a card level. Card XP has a stage-band ceiling; previously earned levels and rarities are never reduced.

## Expected power curve

| Stages | Expected cards | Card levels | Tower unlocks | Relative power | Grinding |
| --- | --- | ---: | ---: | ---: | --- |
| 1–5 | Common–Uncommon | 1–2 | 6–8 | 1.00–1.18 | None |
| 6–10 | Uncommon–Rare, isolated Epic | 2–4 | 8–11 | 1.15–1.40 | Optional |
| 11–20 | Rare–Epic, limited Epic+/Legendary | 4–8 | 12–18 | 1.35–1.80 | Targeted only |
| 21–30 | Epic–Epic+, selected Legendary | 7–12 | 18–24 | 1.65–2.15 | Selective endgame |

## Safe balance testing

In a Vite development build, open Save Manager to select an isolated profile: clean, stages 5/10/20/30, or a normalized duplicate of the current save. A sandbox writes only to `village.balanceSandbox` and never queues cloud saves or overwrites `relicsEclipseSave`. Remove `balanceProfile` from the URL to return to the live profile.

Temporary battle telemetry is stored separately in `village.balanceTelemetry.v1` and can be exported from the development Save Manager. It includes card copies/fragments per battle, rarity changes, account versus expected power, damage, enemy and boss time-to-kill, placed towers, and negligible-contribution tower percentage.

## Manual test matrix

1. Clean profile: clear stages 1–5 and confirm no more than six drafts, mostly Common/Uncommon collection growth, and no enemy copy drops.
2. Stage 10 benchmark: verify an eight-or-fewer purposeful defense, controlled replay rewards, and no automatic high-rarity acceleration.
3. Stage 20 and 30 benchmarks: verify late tactical options, boss TTK, and targeted high-tier material gates.
4. Normalized-copy sandbox: compare the duplicated current collection against expected stage power without changing the live save.
5. Live profile: confirm every previously earned rarity, level, item, and unlock remains unchanged.
