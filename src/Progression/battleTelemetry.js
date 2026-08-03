import { curveForStage } from './economyRegistry.js';

const KEY = 'village.balanceTelemetry.v1';
let active = null;

export function beginProgressionTelemetry({ stage, accountPower }) {
  active = { startedAt: Date.now(), stage, expected: curveForStage(stage), accountPower, copies: 0, fragments: 0, rarityUpgrades: [], damage: {}, spawns: new Map(), normalTtk: [], bossTtk: [], placedTowers: 0 };
}
export function telemetryEnemySpawn(enemy, time) { if (active && enemy) active.spawns.set(enemy, time); }
export function telemetryDamage(source, damage) {
  if (!active || !source || damage <= 0) return;
  const key = source._telemetryId || (source._telemetryId = `${source.id || source.kind || 'source'}-${Math.random().toString(36).slice(2, 8)}`);
  active.damage[key] = (active.damage[key] || 0) + damage;
}
export function telemetryEnemyDeath(enemy, time) {
  if (!active || !enemy) return;
  const born = active.spawns.get(enemy); if (born == null) return;
  (enemy.boss ? active.bossTtk : active.normalTtk).push(Math.max(0, time - born)); active.spawns.delete(enemy);
}
export function telemetryReward({ copies = 0, fragments = 0 } = {}) { if (active) { active.copies += copies; active.fragments += fragments; } }
export function telemetryRarityUpgrade(cardId, from, to) { if (active) active.rarityUpgrades.push({ cardId, from, to, at: Date.now() }); }
export function endProgressionTelemetry({ result, towers = [] } = {}) {
  if (!active) return null;
  const total = Object.values(active.damage).reduce((sum, value) => sum + value, 0);
  const negligible = towers.filter(t => !t.supportOnly && (active.damage[t._telemetryId] || 0) < total * .01).length;
  const attackTowers = towers.filter(t => !t.supportOnly).length;
  const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const report = { ...active, spawns: undefined, finishedAt: Date.now(), result, totalDamage: Math.round(total), averageNormalTtk: avg(active.normalTtk), bossTtk: avg(active.bossTtk), towersPlaced: attackTowers, negligibleTowerPercent: attackTowers ? Math.round(negligible / attackTowers * 100) : 0 };
  try { const prior = JSON.parse(localStorage.getItem(KEY) || '[]'); localStorage.setItem(KEY, JSON.stringify([report, ...prior].slice(0, 50))); } catch (_) {}
  active = null; return report;
}
export function exportProgressionTelemetry() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } }
