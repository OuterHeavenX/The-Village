import { choiceTier } from '../src/Battle/economy.js';
import { EARLY_STAGE_DIFFICULTY } from '../src/Progression/economyRegistry.js';
const envelope = EARLY_STAGE_DIFFICULTY[1];

// Reproducible aggregate simulation using the Stage 1 spawn, HP, damage,
// attack-speed, Essence, and draft rules from game.js. This models a player
// who understands adjacency/range but does not use an optimized placement map.
let seed = 0x35101;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const tier = choiceTier({ chapter: { number: 1 }, chapterWaves: 8 });
const waveCurve = wave => 1 + Math.pow(Math.max(0, wave - 1), 1.08) * .19;
const normalHp = wave => 30 * waveCurve(wave) * 3.05 * envelope.enemyHealth;
const bossHp = 500 * .9 * waveCurve(8) * 1.25 * envelope.bossHealth;
const counts = [5, 9, 10, 11, 12, 13, 14, 15];

function run() {
  let gate = 20 + envelope.gateHealth, essence = 0, elapsed = 0, drafts = 1, lastDraftTime = 0, towers = [random() < .7 ? 20 : 8 / 3 * 2.2], bossTtk = null;
  const towerQuality = .59 + random() * .28, heroDps = 22 / .48 * (.30 + random() * .12);
  for (let wave = 1; wave <= 8 && gate > 0; wave++) {
    const count = counts[wave - 1], hp = normalHp(wave), spawnWindow = count * Math.max(.24, (1.15 - wave * .025) * .88), combatWindow = spawnWindow + 11;
    const dps = heroDps + towers.reduce((sum, value) => sum + value * towerQuality, 0);
    const normalCount = wave === 8 ? count - 1 : count;
    const uncoveredHp = Math.max(0, normalCount * hp - dps * combatWindow);
    gate -= Math.min(normalCount, Math.ceil(uncoveredHp / hp));
    elapsed += combatWindow;
    essence += normalCount + (wave === 8 ? 36 : 0);
    while (drafts < tier.maxChoices && essence >= tier.milestones[drafts] && elapsed - lastDraftTime >= tier.minimumSeconds && wave > (tier.minimumWaves ?? 1)) {
      if (towers.length < 6 && (towers.length < 5 || random() < .7)) towers.push(random() < .7 ? 20 : 8 / 3 * 2.2);
      else for (let i = 0; i < towers.length; i++) towers[i] *= 1.08;
      lastDraftTime = elapsed; drafts++;
    }
    if (wave === 8 && gate > 0) {
      const finalDps = heroDps + towers.reduce((sum, value) => sum + value * towerQuality, 0);
      bossTtk = bossHp / finalDps;
      gate -= Math.max(0, Math.ceil((bossTtk - 12) / .78));
    }
  }
  return { won: gate > 0, essence, elapsed, drafts, towers: towers.length, bossTtk };
}

const runs = Array.from({ length: 5000 }, run), won = runs.filter(run => run.won), average = (key, list = runs) => list.reduce((sum, run) => sum + (run[key] || 0), 0) / list.length;
console.log(JSON.stringify({
  runs: runs.length,
  modeledReasonablePlayWinRate: `${(won.length / runs.length * 100).toFixed(1)}%`,
  stageEssence: average('essence').toFixed(1),
  firstPostOpeningDraftTarget: { essence: tier.milestones[1], seconds: tier.minimumSeconds },
  averageDrafts: average('drafts').toFixed(2),
  averageTowers: average('towers').toFixed(2),
  wave1EnemyHp: normalHp(1).toFixed(1),
  wave8EnemyHp: normalHp(8).toFixed(1),
  bossHp: bossHp.toFixed(1),
  enemyGateDamage: 1,
  whipDps: (14 / .7).toFixed(1),
  daggerSingleTargetDps: (8 / 3).toFixed(1),
  heroDpsWhileInRange: (22 / .48).toFixed(1),
  averageBossTtkForWins: average('bossTtk', won).toFixed(1)
}, null, 2));
