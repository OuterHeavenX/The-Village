import { battlefieldLimits } from './battlefieldConfig.js';
import { debugEnabled } from '../config/debug.js';

export function createBattleTelemetryOverlay({ saveVersion } = {}) {
  if (!debugEnabled('overlay')) return { update() {}, destroy() {} };
  const element = document.createElement('pre');
  element.className = 'battle-dev-telemetry hidden';
  document.body.append(element);
  let last = performance.now(), frames = 0, fps = 0, nextUpdate = 0;
  return {
    update(state, nextMilestone, damage = {}) {
      frames++; const now = performance.now();
      if (now - last >= 1000) { fps = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; }
      if (now < nextUpdate || !state) return; nextUpdate = now + 250;
      const attack = state.towers.filter(t => !t.supportOnly).length, support = state.towers.length - attack, limits = battlefieldLimits(state);
      const drought=Math.max(0,state.time-(state.lastMeaningfulDecisionAt||0)),deadEnd=(state.economyDeadEndTime||0)>3?' · ECONOMY DEAD-END':'';
      element.textContent = `FPS ${fps}\nChapter ${state.chapter?.number ?? '-'} ${state.chapter?.name || 'endless'}\nSave schema v${saveVersion ?? '?'}\nWave ${state.wave}/${state.chapterWaves}\nEnemies ${state.enemies.length}\nEssence ${Math.floor(state.essence)} spendable · ${Math.floor(state.essenceEarned||0)} earned -> ${Number.isFinite(nextMilestone) ? nextMilestone : 'drafts complete'}\nSpent ${Math.floor(state.essenceSpent||0)} · Drafts ${state.draftsCompleted}\nTowers ${state.towers.length}/${limits.towers} · Attack ${attack} · Support ${support}\nGround defenses ${state.traps.length}/${limits.groundDefense}\nDecision drought ${drought.toFixed(1)}s${deadEnd}\nDamage sources ${Object.keys(damage).length}`;
      element.classList.toggle('hidden', !document.body.classList.contains('battle-mode'));
    },
    destroy() { element.remove(); }
  };
}
