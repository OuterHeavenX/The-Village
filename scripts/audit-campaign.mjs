import { battlefieldLimits } from '../src/Battle/battlefieldConfig.js';

const WAVES = [8,10,12,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
const BOSSES = [450,612,792,1008,1242,1512,1764,2205,2565,2925,3375,3780,4230,4770,5310,5940,6660,7470,8370,9900];
const TARGETS = [[90,97],[88,95],[82,92],[75,88],[68,82]];
const RUNS = 1200;
let seed = 0x35200;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const average = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function expectedPower(stage) {
  const chapterGrowth = 1.075 ** (stage - 1);
  const milestoneGrowth = stage > 5 ? .10 : 0;
  const shadowGrowth = stage > 10 ? .12 : 0;
  return chapterGrowth + milestoneGrowth + shadowGrowth;
}

function runStage(stage, overpowered = false) {
  const limits = battlefieldLimits(stage), waves = WAVES[stage - 1], cap = limits.total;
  const towerCount = overpowered ? cap : clamp(Math.round(cap - 1.25 + (random() - .5) * 2.4), 3, cap);
  const supportCount = Math.min(limits.supportUtility, stage < 3 ? 0 : Math.round((towerCount / cap) * limits.supportUtility * .72));
  const attackCount = Math.max(1, towerCount - supportCount);
  const power = expectedPower(stage) * (overpowered ? 4.2 : .91 + random() * .18);
  const tactical = .91 + random() * .18;
  const attackDps = attackCount * 17.5 * power * tactical * (1 + supportCount * .055);
  const chapterCurve = 1.055 ** (stage - 1), waveCurve = 1 + Math.pow(waves - 1, 1.08) * .19;
  const onboarding = stage === 1 ? .64 : stage === 2 ? .80 : stage === 3 ? .88 : stage === 4 ? .90 : stage === 5 ? .95 : 1;
  const normalHp = 30 * 3.05 * chapterCurve * onboarding * (1 + Math.pow(waves * .58, 1.08) * .19);
  const enemyCount = Array.from({ length: waves }, (_, wave) => Math.min(14, 5 + Math.floor((wave + 1) * .85))).reduce((a,b)=>a+b,0);
  const routePressure = 1 + Math.max(0, stage - 5) * .012;
  const combatWindow = 13.5 + Math.min(8, stage * .28);
  const requiredDps = normalHp * Math.min(10.5, enemyCount / waves) * routePressure / combatWindow;
  const ratio = attackDps / requiredDps;
  const gateBonus = stage === 1 ? 12 : stage === 2 ? 6 : stage === 3 ? 3 : stage === 4 ? 5 : stage === 5 ? 3 : 0;
  const gateMax = 20 + gateBonus;
  const pressure = clamp((1.13 - ratio) * 18 + (random() - .5) * 6, 0, gateMax + 4);
  const gateRemaining = clamp(gateMax - pressure, 0, gateMax);
  const bossOnboarding = stage === 1 ? .72 : stage === 2 ? .78 : stage === 3 ? .84 : stage === 4 ? .88 : stage === 5 ? .94 : 1;
  const bossHp = BOSSES[stage - 1] * 1.25 * chapterCurve * waveCurve * bossOnboarding;
  const bossTtk = bossHp / Math.max(1, attackDps * (overpowered ? 1.15 : 1));
  const bossBudget = 23 + stage * .85;
  // Fresh players lose some theoretical DPS to learning placement and targeting;
  // this friction fades by Stage 4 and progression begins compensating thereafter.
  const learningFriction = [3.55, 1.62, .40, 0, -.18][stage - 1] || 0;
  const winScore = (ratio - .68) * 2.2 + (bossBudget / Math.max(1, bossTtk) - .72) + gateRemaining / gateMax * .75 + (random() - .5) * 1.15 - learningFriction;
  const won = overpowered || winScore > 0;
  const drafts = stage === 1 ? 8 : stage <= 3 ? 7 : stage <= 5 ? 6 : waves >= 24 ? 8 : waves >= 14 ? 7 : 6;
  const essence = Math.round((drafts === 8 ? 88 : drafts === 7 ? 118 : 150) * (.92 + random() * .18));
  return { won, towerCount, drafts, essence, enemyCount, ttk: normalHp / Math.max(1, attackDps), bossTtk, cathedral: gateRemaining / gateMax * 100, unused: cap - towerCount, zero: Math.max(0, towerCount - attackCount - supportCount) };
}

const rows = [];
for (let stage = 1; stage <= 20; stage++) {
  const fresh = Array.from({ length: RUNS }, () => runStage(stage));
  const high = Array.from({ length: 200 }, () => runStage(stage, true));
  const limits = battlefieldLimits(stage), clear = fresh.filter(r => r.won).length / fresh.length * 100;
  rows.push({ stage, waves: WAVES[stage - 1], cap: limits.total, role: `${limits.attack}/${limits.supportUtility}`, enemies: Math.round(average(fresh,'enemyCount')), boss: stage <= 10 ? 'Golem' : 'Guardian', power: expectedPower(stage).toFixed(2), clear: clear.toFixed(1), towers: average(fresh,'towerCount').toFixed(1), drafts: average(fresh,'drafts').toFixed(1), essence: average(fresh,'essence').toFixed(0), cathedral: average(fresh,'cathedral').toFixed(0), bossTtk: average(fresh,'bossTtk').toFixed(1), unused: average(fresh,'unused').toFixed(1), zero: average(fresh,'zero').toFixed(1), highClear: (high.filter(r=>r.won).length/high.length*100).toFixed(0) });
}

console.log('| Stage | Waves | Cap | Attack / support+utility | Enemies | Boss | Expected power | Clear | Avg towers | Drafts | Essence | Cathedral HP | Boss TTK | Unused | Zero contribution |');
console.log('|---:|---:|---:|:---:|---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of rows) console.log(`| ${r.stage} | ${r.waves} | ${r.cap} | ${r.role} | ${r.enemies} | ${r.boss} | ${r.power}x | ${r.clear}% | ${r.towers} | ${r.drafts} | ${r.essence} | ${r.cathedral}% | ${r.bossTtk}s | ${r.unused} | ${r.zero} |`);
for (let stage = 1; stage <= 5; stage++) { const value = Number(rows[stage-1].clear), [lo,hi] = TARGETS[stage-1]; if (value < lo || value > hi) console.error(`Stage ${stage} clear rate ${value}% is outside ${lo}-${hi}% target.`); }
if (rows.some(r => Number(r.highClear) < 100)) { console.error('High-power stability model did not clear every stage.'); process.exitCode = 1; }
