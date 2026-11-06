// Stage-facing battlefield policy. The runtime consumes this registry so later
// maps can change capacity and atmosphere without adding stage branches to game.js.
const CAPACITY_TIERS = Object.freeze([
  { min: 1, max: 5, towers: 10, groundDefense: 4 },
  { min: 6, max: 10, towers: 12, groundDefense: 5 },
  { min: 11, max: 15, towers: 14, groundDefense: 6 },
  { min: 16, max: 20, towers: 16, groundDefense: 7 },
  { min: 21, max: 25, towers: 18, groundDefense: 8 },
  { min: 26, max: Infinity, towers: 20, groundDefense: 8 }
]);

export const BATTLEFIELD_VISUAL_PRESETS = Object.freeze({
  cemetery: { roadOpacity: .82, roadWidth: .48, fog: 0, warmth: .06 },
  forest: { roadOpacity: .78, roadWidth: .46, fog: 0, warmth: .02 },
  village: { roadOpacity: .84, roadWidth: .49, fog: 0, warmth: .10 },
  cathedral: { roadOpacity: .80, roadWidth: .47, fog: 0, warmth: .04 },
  default: { roadOpacity: .80, roadWidth: .47, fog: 0, warmth: .05 }
});

export function battlefieldLimits(stateOrStage = 1) {
  const stage = Math.max(1, Number(typeof stateOrStage === 'object' ? stateOrStage?.chapter?.number : stateOrStage) || 1);
  const tier = CAPACITY_TIERS.find(entry => stage >= entry.min && stage <= entry.max) || CAPACITY_TIERS.at(-1);
  // V37.8: every road that breaks open adds two structure slots. Under Raid Rush
  // rules the board fills early, and late roads used to open with no slot left
  // to cover them — playtests lost on the third and fourth roads with 1–2 towers on each.
  const extraRoads = typeof stateOrStage === 'object' ? Math.max(0, (stateOrStage?.routes?.length || 1) - 1) : 0;
  const towers = tier.towers + extraRoads * 2;
  return { stage, towers, groundDefense: tier.groundDefense, total: towers, attack: towers, supportUtility: towers };
}

export function battlefieldVisualPreset(mapId) {
  return BATTLEFIELD_VISUAL_PRESETS[mapId] || BATTLEFIELD_VISUAL_PRESETS.default;
}
