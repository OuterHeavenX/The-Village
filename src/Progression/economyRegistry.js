// V35.2 progression economy registry. Tuning data belongs here; battle and UI
// code consume it without embedding reward tables in the simulation.
export const BATTLE_CHOICE_TIERS = Object.freeze({
  tutorial: { maxChoices: 10, minimumSeconds: 14, towerOfferUntil: 8, milestones: [0, 7, 15, 25, 38, 52, 69, 88, 110, 136] },
  foundation: { maxChoices: 10, minimumSeconds: 18, towerOfferUntil: 8, milestones: [0, 11, 25, 42, 63, 88, 118, 152, 190, 232] },
  early: { maxChoices: 9, minimumSeconds: 24, towerOfferUntil: 7, milestones: [0, 18, 42, 72, 108, 150, 198, 252, 312] },
  normal: { maxChoices: 9, minimumSeconds: 28, towerOfferUntil: 7, milestones: [0, 22, 50, 85, 125, 170, 220, 276, 338] },
  long: { maxChoices: 10, minimumSeconds: 28, towerOfferUntil: 8, milestones: [0, 20, 45, 75, 110, 150, 195, 245, 300, 360] },
  boss: { maxChoices: 11, minimumSeconds: 30, towerOfferUntil: 8, milestones: [0, 18, 40, 68, 100, 138, 182, 232, 288, 350, 418] }
});

export const BATTLE_CHOICE_RULES = Object.freeze({
  minimumSeconds: 40,
  minimumWaves: 1,
  activeTowerCap: 7,
  auxiliaryStructureCap: 3
});

export const EARLY_STAGE_DIFFICULTY = Object.freeze({
  1: { enemyHealth: .64, bossHealth: .72, gateHealth: 12, label: 'Tutorial guardian' },
  2: { enemyHealth: .80, bossHealth: .78, gateHealth: 6, label: 'Foundation guardian' },
  3: { enemyHealth: .88, bossHealth: .84, gateHealth: 3, label: 'Placement check' },
  4: { enemyHealth: .90, bossHealth: .88, gateHealth: 5, label: 'First challenge' },
  5: { enemyHealth: .95, bossHealth: .94, gateHealth: 3, label: 'First progression check' }
});

export const TACTICAL_CHOICE_REGISTRY = Object.freeze([
  { id: 'fieldRepair', type: 'booster', tactical: true, icon: '🛡️', name: 'Field Repair', desc: 'Restore 20% of the Cathedral gate.' },
  { id: 'fieldMerge', type: 'booster', tactical: true, icon: '✦', name: 'Battlefield Merge', desc: 'Promote the lowest-level attack tower once.' },
  { id: 'battleInsight', type: 'booster', tactical: true, icon: '📖', name: 'Battle Insight', desc: 'Gain one Battle Point for this stage.' },
  { id: 'overclockLine', type: 'booster', tactical: true, icon: '⚡', name: 'Overclock the Line', desc: 'Existing attack towers fire 8% faster this stage.' }
]);

export const RARITY_PROGRESSION = Object.freeze([
  { from: 'common', to: 'good', copies: 3, materials: {} },
  { from: 'good', to: 'rare', copies: 5, materials: { forgeEmbers: 1 } },
  { from: 'rare', to: 'epic', copies: 8, materials: { forgeEmbers: 3 } },
  { from: 'epic', to: 'epicplus', copies: 12, materials: { eclipseShards: 1 } },
  { from: 'epicplus', to: 'legendary', copies: 18, cardFragments: 8, materials: { eclipseShards: 3, forgeEmbers: 5 } },
  { from: 'legendary', to: 'legendaryplus', copies: 30, cardFragments: 15, materials: { eclipseShards: 8, ancientRelics: 1 } },
  { from: 'legendaryplus', to: 'mythic', copies: 50, cardFragments: 30, materials: { eclipseShards: 15, ancientRelics: 3 } }
]);

export const STAGE_REWARD_TABLE = Object.freeze({
  firstClear: { copies: 2, fragments: 4 },
  firstBossClear: { copies: 2, fragments: 7 },
  defeat: { copies: 0, fragments: 2 },
  replayCopyChances: [1, .5, .25],
  replayFragments: [3, 2, 1]
});

export const POWER_CURVE = Object.freeze([
  { minStage: 1, maxStage: 5, rarity: 'Common–Uncommon', cardLevels: [1, 2], unlockedTowers: [6, 8], power: [1, 1.18], support: 'introductory', boss: 'teaches counters', grind: 'none' },
  { minStage: 6, maxStage: 10, rarity: 'Uncommon–Rare; isolated Epic', cardLevels: [2, 4], unlockedTowers: [8, 11], power: [1.15, 1.4], support: 'one focused link', boss: 'requires a coherent deck', grind: 'optional' },
  { minStage: 11, maxStage: 20, rarity: 'Rare–Epic; limited Epic+/Legendary', cardLevels: [4, 8], unlockedTowers: [12, 18], power: [1.35, 1.8], support: 'two purposeful links', boss: 'tests build identity', grind: 'targeted only' },
  { minStage: 21, maxStage: 30, rarity: 'Epic–Epic+; selected Legendary', cardLevels: [7, 12], unlockedTowers: [18, 24], power: [1.65, 2.15], support: 'mature network', boss: 'execution and optimization', grind: 'selective endgame' }
]);

export function curveForStage(stage = 1) {
  return POWER_CURVE.find(row => stage >= row.minStage && stage <= row.maxStage) || POWER_CURVE.at(-1);
}

export function cardLevelCapForStage(stage = 1) {
  return curveForStage(stage).cardLevels[1];
}

export function rarityUpgradeFor(rarity) {
  return RARITY_PROGRESSION.find(row => row.from === rarity) || null;
}

export function rewardForStage({ firstClear = false, victory = false, replayCount = 0, boss = false } = {}) {
  if (!victory) return { ...STAGE_REWARD_TABLE.defeat, copyChance: 0 };
  if (firstClear) return { ...(boss ? STAGE_REWARD_TABLE.firstBossClear : STAGE_REWARD_TABLE.firstClear), copyChance: 1 };
  const index = Math.max(0, replayCount);
  return {
    copies: index < STAGE_REWARD_TABLE.replayCopyChances.length ? 1 : 0,
    copyChance: STAGE_REWARD_TABLE.replayCopyChances[index] || 0,
    fragments: STAGE_REWARD_TABLE.replayFragments[index] || 1
  };
}
