// V35.2 battle-economy policy. Combat consumes this module; tuning stays out of
// the simulation loop and can be adjusted without touching enemy or tower data.
import { BATTLE_CHOICE_RULES, BATTLE_CHOICE_TIERS } from '../Progression/economyRegistry.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function battleProgress(state) {
  return clamp((Math.max(1, state.wave) - 1) / Math.max(1, state.chapterWaves - 1), 0, 1);
}

export function choiceTier(state) {
  const waves = Number(state?.chapterWaves) || 8;
  const stage = Number(state?.chapter?.number) || 1;
  if (stage === 1) return BATTLE_CHOICE_TIERS.tutorial;
  if (stage <= 3) return BATTLE_CHOICE_TIERS.foundation;
  if (stage <= 5) return BATTLE_CHOICE_TIERS.early;
  return waves >= 24 ? BATTLE_CHOICE_TIERS.boss : waves >= 14 ? BATTLE_CHOICE_TIERS.long : BATTLE_CHOICE_TIERS.normal;
}
export function nextChoiceMilestone(state) {
  const tier = choiceTier(state), index = Math.max(0, state?.draftsCompleted || 0);
  return tier.milestones[index] ?? Infinity;
}
export function essenceCapacity(state) {
  const next = nextChoiceMilestone(state);
  return Number.isFinite(next) ? next : choiceTier(state).milestones.at(-1);
}
export function canTriggerChoice(state, opening = false) {
  if (!state || state.draftOpen || state.pendingCard || (state.draftsCompleted || 0) >= choiceTier(state).maxChoices) return false;
  if (opening) return (state.draftsCompleted || 0) === 0;
  const elapsed = state.time - (state.lastDraftTime ?? -Infinity), waves = state.wave - (state.lastDraftWave ?? 0);
  const tier = choiceTier(state);
  return (state.essenceEarned||0) >= nextChoiceMilestone(state) && elapsed >= (tier.minimumSeconds || BATTLE_CHOICE_RULES.minimumSeconds) && waves >= (tier.minimumWaves ?? BATTLE_CHOICE_RULES.minimumWaves);
}

export function dynamicEssenceReward(enemy, state, baseReward) {
  if (!state) return Math.max(1, Math.round(baseReward));
  if (enemy.boss) return Math.max(18, Math.round(baseReward * 1.8));
  const progress = battleProgress(state);
  const meaningfulTowers = state.towers.filter(tower => !tower.supportOnly).length;
  const towerPressure = clamp((meaningfulTowers - 8) / 8, 0, 1);
  const recentDraftPressure = clamp((state.recentDrafts || []).filter(wave => state.wave - wave <= 3).length / 3, 0, 1);
  const fillPressure = clamp((state.essence + state.pendingEssence) / Math.max(1, nextChoiceMilestone(state)), 0, 1);
  const stage = Number(state?.chapter?.number) || 1;
  // The reward curve dips to half at the last wave, and the pressure terms cut
  // it further as towers, recent drafts and a full vial accumulate — exactly the
  // moments a player most wants to respond. Stages 1-5 keep the full early rate.
  const progressionCurve = Math.max(stage <= 5 ? .78 : 0, .78 + .28 * Math.sin(Math.PI * progress) - .28 * Math.pow(progress, 1.7));
  const pressure = stage <= 5 ? 1 : 1 - .34 * towerPressure - .20 * recentDraftPressure - .12 * fillPressure;
  const difficulty = enemy.elite ? 1.32 : enemy.mini ? 1.18 : 1;
  return Math.max(1, Math.round(baseReward * progressionCurve * pressure * difficulty * .86));
}

export function registerCompletedDraft(state) {
  state.draftsCompleted = (state.draftsCompleted || 0) + 1;
  state.recentDrafts = [...(state.recentDrafts || []), state.wave].slice(-8);
  state.lastDraftTime = state.time; state.lastDraftWave = state.wave;
  state.maxEssence = essenceCapacity(state);
}
