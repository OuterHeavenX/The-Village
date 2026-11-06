// V37.7 — 3D projectiles. Tower shots used to be flat glowing dots hovering
// at one height; each tower now fires an object that matches it (a dagger, a
// tumbling axe, a crossbow bolt, a cannonball, a lance of light...), flies in
// an arc from the tower's top to the enemy, faces where it is going and spins
// the way it should. Built with the tower kit and materials.
//
// Model space: the projectile points along +Z.

import * as THREE from 'three';
import { PartBuilder, bake, COL } from './towerModels.js';

// spin: 'tumble' rotates end over end, 'roll' rolls about the flight axis,
// 'none' keeps the point forward. arc: height of the lob in tiles.
const KINDS = {
  dagger: { spin: 'roll', arc: .1, build(b) { b.box('m', .035, .012, .26, COL.steel, [0, 0, .04]); b.cone('m', .022, .07, 4, COL.steel, [0, 0, .2], [Math.PI / 2, 0, 0], [1, 1, .4]); b.box('m', .1, .02, .025, COL.gold, [0, 0, -.1]); b.cyl('s', .012, .012, .07, 5, COL.leather, [0, 0, -.15], [Math.PI / 2, 0, 0]); } },
  axe: { spin: 'tumble', arc: .55, build(b) { b.box('s', .03, .3, .03, COL.wood, [0, 0, 0]); b.half('m', .12, .02, COL.steel, [0, .12, .015], [Math.PI / 2, 0, Math.PI / 2], -Math.PI / 2); b.half('m', .08, .02, COL.steel, [0, .12, -.015], [Math.PI / 2, 0, Math.PI / 2], Math.PI / 2); } },
  bolt: { spin: 'none', arc: .12, build(b) { b.cyl('s', .012, .012, .34, 5, COL.wood, [0, 0, 0], [Math.PI / 2, 0, 0]); b.cone('m', .028, .07, 4, COL.silver, [0, 0, .2], [Math.PI / 2, 0, 0]); for (const r of [0, Math.PI / 2]) b.box('s', .06, .002, .06, 0xd8ccb0, [0, 0, -.14], [0, 0, r]); b.ball('g', .02, 0xdfe6ff, [0, 0, .23]); } },
  heavybolt: { spin: 'none', arc: .2, build(b) { b.cyl('s', .025, .025, .56, 6, COL.wood, [0, 0, 0], [Math.PI / 2, 0, 0]); b.cone('m', .05, .13, 4, COL.steel, [0, 0, .34], [Math.PI / 2, 0, 0]); for (const r of [0, Math.PI / 2]) b.box('s', .11, .003, .1, COL.crimson, [0, 0, -.24], [0, 0, r]); } },
  lance: { spin: 'roll', arc: .08, build(b) { b.gem('g', .05, 0xbff4ff, [0, 0, .05], [.7, .7, 4.5]); b.gem('g', .025, 0xffffff, [0, 0, .08], [1, 1, 5]); b.ring('g', .06, .01, 0x9fe8ff, [0, 0, -.12], [0, 0, 0], 12); } },
  orb: { spin: 'none', arc: .25, build(b) { b.ball('g', .085, 0xc79bff, [0, 0, 0], [1, 1, 1], 10, 8); b.ball('g', .045, 0xffffff, [0, 0, 0]); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.gem('g', .025, 0x9a6aff, [Math.sin(a) * .12, Math.cos(a) * .12, 0]); } } },
  cross: { spin: 'tumble', arc: .3, build(b) { b.box('m', .05, .3, .04, COL.gold, [0, 0, 0]); b.box('m', .2, .05, .04, COL.gold, [0, .06, 0]); b.box('g', .02, .26, .045, 0xfff2b0, [0, 0, 0]); b.box('g', .16, .02, .045, 0xfff2b0, [0, .06, 0]); } },
  cannonball: { spin: 'roll', arc: .45, build(b) { b.ball('m', .085, COL.silver, [0, 0, 0], [1, 1, 1], 10, 8); b.ring('m', .088, .012, COL.gold, [0, 0, 0], [0, 0, 0], 12); b.ball('g', .03, 0xffe9b0, [0, 0, -.08]); } },
  bone: { spin: 'tumble', arc: .5, build(b) { b.cyl('s', .022, .022, .24, 6, COL.bone, [0, 0, 0]); for (const y of [-.12, .12]) for (const x of [-.025, .025]) b.ball('s', .035, COL.bone, [x, y, 0]); } },
  chain: { spin: 'tumble', arc: .15, build(b) { b.ball('m', .07, COL.iron, [0, 0, 0]); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.cone('m', .02, .06, 4, COL.steel, [Math.sin(a) * .07, Math.cos(a) * .07, 0], [0, 0, -a]); } for (let i = 1; i < 4; i++) b.ring('m', .022, .007, COL.steel, [0, 0, -.05 - i * .04], [0, i % 2 ? Math.PI / 2 : 0, 0], 6); } },
  gear: { spin: 'roll', arc: .2, build(b) { b.cyl('g', .09, .09, .02, 12, 0xd8c0ff, [0, 0, 0], [Math.PI / 2, 0, 0]); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.box('m', .035, .035, .025, COL.gold, [Math.sin(a) * .1, Math.cos(a) * .1, 0], [0, 0, -a]); } b.box('m', .012, .07, .03, 0x2a1a3a, [0, .03, .01]); } },
  bat: { spin: 'flap', arc: .3, build(b) { b.ball('s', .05, 0x2a2036, [0, 0, 0], [1, 1, 1.3]); b.ball('g', .012, 0xff5a7a, [-.02, .02, .06]); b.ball('g', .012, 0xff5a7a, [.02, .02, .06]); for (const s of [-1, 1]) b.cone('s', .07, .16, 3, 0x3a2a4a, [s * .1, 0, 0], [0, 0, s * Math.PI / 2], [1, 1, .15]); } },
  bead: { spin: 'none', arc: .2, build(b) { b.ball('g', .045, 0xffd8c0, [0, 0, 0]); b.ring('g', .07, .01, 0xffc8a0, [0, 0, 0], [0, 0, 0], 12); b.ball('g', .025, 0xffe8d8, [0, 0, -.09]); b.ball('g', .018, 0xffe8d8, [0, 0, -.15]); } },
  clove: { spin: 'tumble', arc: .35, build(b) { b.ball('s', .06, 0xf4eedc, [0, 0, 0], [.8, 1.2, .8]); b.cone('s', .02, .06, 5, 0x6a8a3a, [0, .08, 0]); b.ball('g', .025, 0xd9efad, [0, 0, 0]); } },
  page: { spin: 'roll', arc: .15, build(b) { b.box('s', .14, .18, .01, COL.parchment, [0, 0, 0], [Math.PI / 2, 0, 0]); b.box('g', .08, .012, .012, 0xfff0b0, [0, .01, .02], [Math.PI / 2, 0, 0]); b.box('g', .012, .1, .012, 0xfff0b0, [0, .01, .02], [Math.PI / 2, 0, 0]); } },
  arrow: { spin: 'none', arc: .3, build(b) { b.cyl('s', .008, .008, .28, 4, COL.wood, [0, 0, 0], [Math.PI / 2, 0, 0]); b.cone('m', .018, .05, 4, COL.steel, [0, 0, .16], [Math.PI / 2, 0, 0]); b.box('s', .04, .002, .05, 0xe8e0d0, [0, 0, -.12]); } },
  spark: { spin: 'none', arc: .1, build(b) { b.ball('g', .06, 0xfff2c5, [0, 0, 0]); } }
};
// Which projectile each shot kind (or tower id) uses.
const MAP = {
  spinningDagger: 'dagger', gothicDagger: 'dagger', dagger: 'dagger', daggerLane: 'dagger',
  gothicAxe: 'axe', axe: 'axe', silverBolt: 'bolt', crossbow: 'bolt', heavyBolt: 'heavybolt', ballista: 'heavybolt',
  holyLance: 'lance', holy: 'lance', holyDrop: 'lance', arcaneOrb: 'orb', arcane: 'orb', cross: 'cross', silver: 'cannonball',
  bone: 'bone', whip: 'chain', clock: 'gear', familiar: 'bat', rosary: 'bead', garlic: 'clove', scripture: 'page', arrow: 'arrow'
};
export const projectileKind = kind => MAP[kind] || 'spark';

export function createProjectileFactory() {
  const materials = {
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .8 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .35, metalness: .4 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  };
  const baked = {};
  function geometryFor(kind) {
    if (!baked[kind]) { const b = new PartBuilder(); KINDS[kind].build(b); baked[kind] = bake(b); }
    return baked[kind];
  }
  function create(kind) {
    const g = geometryFor(kind), root = new THREE.Group(), spin = new THREE.Group();
    root.add(spin);
    for (const list of ['stone', 'metal', 'glow']) if (g[list]) spin.add(new THREE.Mesh(g[list], materials[list]));
    root.userData.kind = kind; root.userData.spin = spin;
    return root;
  }
  // Places a projectile along its flight: from (sx,sy) at the tower top to
  // (tx,ty) at enemy chest height, lobbed by the kind's arc.
  function pose(root, shot, time, groundHeight) {
    const def = KINDS[root.userData.kind] || KINDS.spark, spin = root.userData.spin;
    const sx = shot.sx ?? shot.x, sy = shot.sy ?? shot.y, tx = shot.tx ?? shot.x, ty = shot.ty ?? shot.y;
    const total = Math.hypot(tx - sx, ty - sy) || 1, done = Math.hypot(shot.x - sx, shot.y - sy);
    const k = Math.max(0, Math.min(1, done / total));
    const h0 = 1.25, h1 = .55, arc = def.arc * Math.min(1, total / 2.5);
    const y = groundHeight(shot.x, shot.y) + h0 + (h1 - h0) * k + Math.sin(Math.PI * k) * arc;
    root.position.set(shot.x, y, shot.y);
    const dx = tx - shot.x, dz = ty - shot.y;
    if (Math.abs(dx) + Math.abs(dz) > 1e-4) root.rotation.set(0, Math.atan2(dx, dz), 0);
    // Pitch to follow the arc: up early, down late.
    const slope = (h1 - h0) / total + Math.cos(Math.PI * k) * Math.PI * arc / total;
    spin.rotation.set(-Math.atan(slope), 0, 0);
    const t = time * 14 + (shot.spin || 0);
    if (def.spin === 'tumble') spin.rotation.x += t;
    else if (def.spin === 'roll') spin.rotation.z = t;
    else if (def.spin === 'flap') spin.children.forEach(m => { m.scale.y = 1 + Math.sin(time * 30) * .2; });
    root.scale.setScalar((shot.size ? shot.size / .4 : 1) * 1.35); // a touch larger than life so it reads at battle zoom
  }
  function dispose() { for (const g of Object.values(baked)) for (const l of ['stone', 'metal', 'glow']) g[l]?.dispose(); Object.values(materials).forEach(m => m.dispose()); }
  return { create, pose, dispose };
}
