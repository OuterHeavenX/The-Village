import { battlefieldLimits } from './battlefieldConfig.js';

export function compositionCounts(state) {
  return { attack: state.towers.filter(t => !t.supportOnly).length, support: state.towers.filter(t => t.supportOnly).length, utility: state.traps.length };
}

export function roleAvailable(state, role) {
  const counts = compositionCounts(state), limits = battlefieldLimits(state);
  if(role==='utility')return counts.utility<limits.groundDefense;
  return counts.attack+counts.support<limits.towers;
}

export function placementSlots(state, cols, rows) {
  const road = new Set(state.path.map(tile => `${tile.x},${tile.y}`)), occupied = new Set(state.towers.map(t => `${t.x},${t.y}`));
  const slots = new Map();
  for (const tile of state.path) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const x = tile.x + dx, y = tile.y + dy, key = `${x},${y}`;
    if (x < 0 || y < 0 || x >= cols || y >= rows || road.has(key) || occupied.has(key)) continue;
    slots.set(key, { x, y });
  }
  return [...slots.values()];
}

export function renderPlacementPads(ctx, slots, { tileSize = 64, active = false, time = 0 } = {}) {
  ctx.save();
  for (const slot of slots) {
    const x = (slot.x + .5) * tileSize, y = (slot.y + .5) * tileSize, pulse = .5 + Math.sin(time * 2 + slot.x) * .12;
    // Inactive foundations are terrain scars, not UI. Eligible pads only bloom
    // while a placeable structure is held.
    if(!active)continue;
    ctx.globalAlpha = .18 + pulse * .09;
    ctx.fillStyle = '#18201d'; ctx.strokeStyle = '#d7c58c'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(x, y + 9, 23, 11, -.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha *= .72; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.ellipse(x, y + 7, 17, 8, -.08, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export function roadReachableFromSlot(state, x, y, range) {
  const rangeSq = range * range;
  return state.path.some(tile => { const dx = tile.x + .5 - (x + .5), dy = tile.y + .5 - (y + .5); return dx * dx + dy * dy <= rangeSq; });
}

export function placementFeedback(state, card, x, y, baseValid) {
  if (!baseValid) return { valid: false, reason: 'This placement slot is blocked.' };
  const limits = battlefieldLimits(state), counts = compositionCounts(state), towers=counts.attack+counts.support;
  if (card.type === 'trap' && counts.utility>=limits.groundDefense) return { valid: false, reason: `Ground defenses are at ${limits.groundDefense}/${limits.groundDefense}.` };
  if ((card.type === 'tower'||card.type==='support') && towers>=limits.towers) return { valid: false, reason: `Towers are at ${limits.towers}/${limits.towers}. Ground defenses remain separate.` };
  if (card.type === 'tower' && !roadReachableFromSlot(state, x, y, card.range || 2)) return { valid: false, reason: 'This tower cannot reach the active road.' };
  return { valid: true, reason: 'Valid placement slot.' };
}
