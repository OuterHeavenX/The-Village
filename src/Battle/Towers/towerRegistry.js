export const CORE_TOWER_REGISTRY = Object.freeze([
  { id: 'dagger', name: 'Dagger Tower', role: 'rapid', projectile: 'spinningDagger', silhouette: 'needle-spire', palette: ['#10121a','#c2ccd7','#7c263e'], animation: ['idle','charge','attack','recoil'] },
  { id: 'axe', name: 'Axe Tower', role: 'heavy', projectile: 'gothicAxe', silhouette: 'executioner-bastion', palette: ['#17141a','#9e9189','#70263a'], animation: ['idle','charge','attack','recoil'] },
  { id: 'crossbow', name: 'Crossbow Tower', icon: '➶', role: 'precision', projectile: 'silverBolt', silhouette: 'iron-watch', palette: ['#11141a','#b8b2a5','#563044'], animation: ['idle','charge','attack','recoil'], stats: { range: 3.7, damage: 19, rate: 1.05, cost: 46 }, description: 'Long-range iron bolts seek the leading enemy.' },
  { id: 'ballista', name: 'Ballista Tower', icon: '➵', role: 'siege', projectile: 'heavyBolt', silhouette: 'siege-platform', palette: ['#17120f','#8c755d','#63263a'], animation: ['idle','charge','attack','recoil'], stats: { range: 4.1, damage: 68, rate: 2.45, cost: 64 }, description: 'A siege engine built for deliberate single-target destruction.' },
  { id: 'holy', name: 'Holy Tower', role: 'anti-undead', projectile: 'holyLance', silhouette: 'stained-glass-shrine', palette: ['#13151c','#e0d39d','#6eaec5'], animation: ['idle','charge','attack','recoil'] },
  { id: 'arcane', name: 'Arcane Tower', icon: '✦', role: 'magic', projectile: 'arcaneOrb', silhouette: 'rune-obelisk', palette: ['#15101c','#a788c5','#542c72'], animation: ['idle','charge','attack','recoil'], stats: { range: 3.0, damage: 25, rate: 1.15, cost: 54 }, description: 'A rune-bound spire prepared for elemental infusions.' }
]);

export const NEW_CORE_TOWERS = Object.freeze(CORE_TOWER_REGISTRY.filter(tower => tower.stats).map(tower => ({
  id: tower.id, name: tower.name, type: 'tower', icon: tower.icon, cost: tower.stats.cost,
  desc: tower.description, rarity: 'Rare', range: tower.stats.range, damage: tower.stats.damage,
  rate: tower.stats.rate, color: tower.palette[1], projectileKind: tower.projectile
})));

export function coreTower(id) { return CORE_TOWER_REGISTRY.find(tower => tower.id === id) || null; }
