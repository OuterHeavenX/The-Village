// V35.2 progression economy registry. Tuning data belongs here; battle and UI
// code consume it without embedding reward tables in the simulation.
// Stages 1-5 are paced for a decision every 15-20 s of play. A bot measured the
// previous curves at 28-36 s between decisions on average and up to 72 s at the
// boss, because each draft also had to wait for the next wave (minimumWaves: 1)
// and the milestone increments outgrew the flattening kill rewards. These tiers
// carry their own minimumWaves so early stages can draft twice in a long wave.
export const BATTLE_CHOICE_TIERS = Object.freeze({
  // The choice cap must outlast the chapter: with ten choices a bot exhausted
  // the tutorial tier at wave 6 and then played 240 s including the boss with
  // nothing to draft. The last milestones sit near a full chapter's earnings.
  tutorial: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.2, pickCurve: 1.2, milestones: [0] },
  foundation: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.8, pickCurve: 1.2, milestones: [0] },
  early: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.8, pickCurve: 1.2, milestones: [0] },
  normal: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.4, pickCurve: 1.15, milestones: [0] },
  long: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.5, pickCurve: 1.15, milestones: [0] },
  boss: { maxChoices: 60, minimumSeconds: 6, minimumWaves: 0, towerOfferUntil: 8, pickScale: 3.6, pickCurve: 1.15, milestones: [0] }
});

export const BATTLE_CHOICE_RULES = Object.freeze({
  minimumSeconds: 40,
  minimumWaves: 1,
  activeTowerCap: 7,
  auxiliaryStructureCap: 3
});

export const EARLY_STAGE_DIFFICULTY = Object.freeze({
  // Tapered in even steps. The previous envelope jumped from .64 enemy HP and
  // +12 gate in chapter 1 to .80 and +6 in chapter 2: a bot won chapter 1 with
  // the gate never touched, then lost chapter 2 at wave 5 with a stronger build.
  1: { enemyHealth: .68, bossHealth: .74, gateHealth: 10, label: 'Tutorial guardian' },
  2: { enemyHealth: .80, bossHealth: .80, gateHealth: 8, label: 'Foundation guardian' },
  3: { enemyHealth: .93, bossHealth: .88, gateHealth: 5, label: 'Placement check' },
  4: { enemyHealth: 1.0, bossHealth: .94, gateHealth: 4, label: 'First challenge' },
  5: { enemyHealth: .95, bossHealth: .94, gateHealth: 3, label: 'First progression check' }
});

export const TACTICAL_CHOICE_REGISTRY = Object.freeze([
  { id: 'fieldRepair', type: 'booster', tactical: true, icon: '🛡️', name: 'Field Repair', desc: 'Restore 20% of the Cathedral gate.' },
  { id: 'battleInsight', type: 'booster', tactical: true, icon: '📖', name: 'Battle Insight', desc: 'Draw an extra card pick straight away.' },
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
  // V37.8: copies level cards (with Gold), so they come in handfuls now.
  firstClear: { copies: 8, fragments: 4 },
  firstBossClear: { copies: 8, fragments: 7 },
  defeat: { copies: 2, fragments: 2 },
  replayCopies: 5,
  replayCopyChances: [1, 1, 1],
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
  if (!victory) return { ...STAGE_REWARD_TABLE.defeat, copyChance: 1 };
  if (firstClear) return { ...(boss ? STAGE_REWARD_TABLE.firstBossClear : STAGE_REWARD_TABLE.firstClear), copyChance: 1 };
  const index = Math.max(0, replayCount);
  return {
    copies: STAGE_REWARD_TABLE.replayCopies,
    copyChance: 1,
    fragments: STAGE_REWARD_TABLE.replayFragments[index] || 1
  };
}
