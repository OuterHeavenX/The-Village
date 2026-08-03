import { curveForStage } from './economyRegistry.js';

export const BENCHMARK_PROFILE_IDS = Object.freeze(['clean', 'stage-5', 'stage-10', 'stage-20', 'stage-30', 'normalized-copy']);

export function createBenchmarkProfile(id, source = {}) {
  const sourceCopy = structuredClone(source || {});
  if (id === 'normalized-copy') {
    const stage = Math.max(1, Number(sourceCopy?.campaign?.highestCleared || 0) + 1);
    return normalizeCopy(sourceCopy, stage);
  }
  const stage = id === 'clean' ? 1 : Math.max(1, Number(id?.split('-')[1]) || 1);
  const profile = structuredClone(sourceCopy);
  profile.campaign = { ...(profile.campaign || {}), highestCleared: Math.max(0, stage - 1), selected: null, replayClears: {} };
  return normalizeCopy(profile, stage);
}

function normalizeCopy(profile, stage) {
  const curve = curveForStage(stage), rarity = stage <= 5 ? 'common' : stage <= 10 ? 'good' : stage <= 20 ? 'rare' : 'epic';
  for (const item of Object.values(profile.inventory || {})) { item.rarity = rarity; item.level = Math.min(Number(item.level) || 1, curve.cardLevels[1]); item.copies = Math.min(Number(item.copies) || 0, 2); item.xp = 0; }
  profile.cardFragments = {};
  profile.__balanceSandbox = { id: `benchmark-${stage}`, stage, createdAt: new Date().toISOString(), isolated: true };
  return profile;
}
