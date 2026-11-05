// V37.5 — 3D chapter bosses.
//
// Each of the twenty chapter bosses (and the stone golem) is assembled from one
// of five rigs — armoured knight, robed caster, vampire noble, beast and bone
// colossus — dressed with its own head, weapon, extras and palette, in the
// same primitive kit and materials as the towers. The rig is a hierarchy of
// groups (hips, legs, arms, head, robe, wings) so the boss can walk, swing,
// hover, flinch and turn to face where it is going.
//
// Model space: one unit per tile, feet on y = 0, facing +Z.

import * as THREE from 'three';
import { PartBuilder, bake, COL } from './towerModels.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Boss table
// ---------------------------------------------------------------------------
// rig: knight | robed | noble | beast | colossus
// head: helm | greathelm | hood | mitre | crown | skull | noble | beak | cowl | hollow
const BOSSES = {
  warden:       { rig: 'knight', scale: 1.05, head: 'helm', weapon: 'greatsword', extras: ['cape', 'eclipse'], pal: { main: 0x2a2e3a, trim: COL.gold, cloth: 0x6a1622, glow: 0xffc860 } },
  thornbeast:   { rig: 'beast', scale: 1.1, extras: ['thorns', 'horns'], pal: { main: 0x3a2a1a, trim: 0x4a6a2a, cloth: 0x2a3a18, glow: 0x9aff5a } },
  bloodcount:   { rig: 'noble', scale: 1, head: 'noble', weapon: 'rapier', extras: ['cape', 'collar'], pal: { main: 0x16121a, trim: 0x8a1020, cloth: 0x5a0a14, glow: 0xff3048, skin: 0xd8d0d8 } },
  icebishop:    { rig: 'robed', scale: 1.05, head: 'mitre', weapon: 'crozier', extras: ['frost'], pal: { main: 0xdfe8f2, trim: 0x8ac8ff, cloth: 0x9ab8d8, glow: 0x9fe8ff, skin: 0xb8c8d8 } },
  bogqueen:     { rig: 'robed', scale: 1.05, head: 'crown', weapon: 'staff', extras: ['drips', 'hunch'], pal: { main: 0x2a3418, trim: 0x6a5a2a, cloth: 0x3a2a18, glow: 0x9aff5a, skin: 0x7a8a5a } },
  siegeknight:  { rig: 'knight', scale: 1.15, head: 'greathelm', weapon: 'mace', extras: ['shield', 'spikes'], pal: { main: 0x4a4440, trim: 0x8a5a2a, cloth: 0x3a2a1e, glow: 0xff9a4a } },
  moonoracle:   { rig: 'robed', scale: 1, head: 'hood', weapon: 'none', extras: ['float', 'crescent', 'orbs'], pal: { main: 0x3a3060, trim: 0xd8d8f0, cloth: 0x2a2048, glow: 0xd8d0ff } },
  vampireking:  { rig: 'noble', scale: 1.2, head: 'crown', weapon: 'greatsword', extras: ['cape', 'collar', 'batwings'], pal: { main: 0x2a0a10, trim: COL.gold, cloth: 0x7a0a18, glow: 0xff3048, skin: 0xd8c8d0 } },
  bellkeeper:   { rig: 'robed', scale: 1.1, head: 'hood', weapon: 'bell', extras: ['hunch'], pal: { main: 0x1e3a3a, trim: 0xb08a3a, cloth: 0x14282a, glow: 0x9fe8d0 } },
  ashabbot:     { rig: 'robed', scale: 1.05, head: 'cowl', weapon: 'censer', extras: ['embers'], pal: { main: 0x4a4648, trim: 0xd06a2a, cloth: 0x2e2a2c, glow: 0xff8a3a } },
  underking:    { rig: 'knight', scale: 1.15, head: 'skull', weapon: 'scythe', extras: ['crown', 'cape'], pal: { main: 0x1a1a20, trim: COL.bone, cloth: 0x2a1a30, glow: 0x9a6aff } },
  hollowsaint:  { rig: 'robed', scale: 1.1, head: 'hollow', weapon: 'staff', extras: ['float', 'halo', 'featherwings'], pal: { main: 0xe8dcc0, trim: COL.gold, cloth: 0xc8b890, glow: 0xfff0b0, skin: 0x1a1612 } },
  rotmarshal:   { rig: 'knight', scale: 1.1, head: 'helm', weapon: 'halberd', extras: ['horns', 'flies'], pal: { main: 0x3a3a22, trim: 0x6a5a2a, cloth: 0x2a2a14, glow: 0xb8ff5a } },
  plaguechoir:  { rig: 'robed', scale: 1, head: 'beak', weapon: 'lantern', extras: ['masks'], pal: { main: 0x1e1a16, trim: 0x8a7a5a, cloth: 0x2a2218, glow: 0x9aff6a, skin: 0xd8ccb0 } },
  voidprelate:  { rig: 'robed', scale: 1.1, head: 'mitre', weapon: 'voidstaff', extras: ['float', 'orbs'], pal: { main: 0x1a1024, trim: 0x8a5aff, cloth: 0x2a1640, glow: 0xb07aff, skin: 0x2a2030 } },
  grandossuary: { rig: 'colossus', scale: 1.3, head: 'skull', weapon: 'boneclub', extras: [], pal: { main: COL.bone, trim: COL.boneDark, cloth: 0x2a2218, glow: 0x8aff5a } },
  duskempress:  { rig: 'robed', scale: 1.1, head: 'crown', weapon: 'scepter', extras: ['gown', 'halo'], pal: { main: 0x3a1a4a, trim: COL.gold, cloth: 0x5a2a6a, glow: 0xffb0e0, skin: 0xe0c8d0 } },
  eclipseherald:{ rig: 'robed', scale: 1.15, head: 'hood', weapon: 'staff', extras: ['float', 'shards'], pal: { main: 0x14183a, trim: 0xc8d0e8, cloth: 0x1a2048, glow: 0xdfe6ff } },
  lastsentinel: { rig: 'knight', scale: 1.3, head: 'greathelm', weapon: 'halberd', extras: ['shield', 'spikes'], pal: { main: 0x5a5650, trim: COL.gold, cloth: 0x3a2a14, glow: 0x9fe8ff } },
  eclipselord:  { rig: 'knight', scale: 1.35, head: 'crown', weapon: 'greatsword', extras: ['float', 'cape', 'eclipse', 'batwings'], pal: { main: 0x14121a, trim: COL.gold, cloth: 0x2a0a14, glow: 0xffc860 } },
  golem:        { rig: 'colossus', scale: 1.35, head: 'rock', weapon: 'none', extras: ['runes'], pal: { main: 0x5a5658, trim: 0x3a3638, cloth: 0x2a2628, glow: 0xffa040 } }
};
export const BOSS_MODEL_IDS = Object.freeze(Object.keys(BOSSES));
export const hasBossModel = id => !!BOSSES[id];

// ---------------------------------------------------------------------------
// Part builders
// ---------------------------------------------------------------------------
function weapon(b, kind, pal) {
  // Built in the right hand's space: the grip at the origin, blade pointing -Y (down-forward when the arm hangs).
  switch (kind) {
    case 'greatsword':
      b.box('m', .09, .95, .025, COL.steel, [0, -.55, .02]);
      b.box('g', .02, .8, .028, pal.glow, [0, -.52, .022]);
      b.box('m', .3, .05, .07, pal.trim, [0, -.06, .02]);
      b.cyl('s', .025, .025, .2, 6, COL.leather, [0, .08, .02]); b.ball('m', .04, pal.trim, [0, .2, .02]); break;
    case 'rapier':
      b.box('m', .03, .72, .015, COL.silver, [0, -.42, .02]);
      b.ring('m', .07, .012, pal.trim, [0, -.04, .02], [0, Math.PI / 2, 0], 12); break;
    case 'mace':
      b.cyl('s', .025, .025, .55, 6, COL.wood, [0, -.22, .02]);
      b.ball('m', .11, COL.iron, [0, -.52, .02]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; b.cone('m', .03, .09, 4, COL.steel, [Math.sin(a) * .1, -.52, .02 + Math.cos(a) * .1], [Math.cos(a) * Math.PI / 2, 0, -Math.sin(a) * Math.PI / 2]); } break;
    case 'scythe':
      b.cyl('s', .022, .022, 1.3, 6, 0x2a1a14, [0, -.3, .02]);
      b.add('metal', new THREE.TorusGeometry(.32, .025, 4, 14, Math.PI * .8), COL.steel, [.0, .32, .3], [0, Math.PI / 2, Math.PI * .2]);
      b.ball('g', .04, pal.glow, [0, .36, .02]); break;
    case 'halberd':
      b.cyl('s', .025, .025, 1.5, 6, COL.wood, [0, -.25, .02]);
      b.half('m', .16, .025, COL.steel, [0, .45, .1], [0, 0, Math.PI / 2], -Math.PI / 2);
      b.cone('m', .04, .22, 4, COL.steel, [0, .6, .02]); break;
    case 'staff': case 'crozier': case 'voidstaff': {
      b.cyl('s', .025, .03, 1.45, 6, kind === 'crozier' ? COL.gold : 0x3a2a1e, [0, -.25, .02]);
      if (kind === 'crozier') b.add('metal', new THREE.TorusGeometry(.12, .02, 4, 12, Math.PI * 1.3), COL.gold, [0, .56, .1], [0, Math.PI / 2, 0]);
      b.gem('g', kind === 'voidstaff' ? .11 : .08, pal.glow, [0, .55, .02], [1, 1.5, 1]);
      if (kind === 'voidstaff') b.ball('s', .06, 0x050308, [0, .55, .02]);
      break; }
    case 'censer':
      b.cyl('m', .015, .015, .5, 4, COL.iron, [0, -.25, .02]);
      b.ball('m', .09, pal.trim, [0, -.55, .02], [1, .8, 1]);
      b.ball('g', .05, pal.glow, [0, -.52, .07]); break;
    case 'bell':
      b.cyl('m', .015, .015, .4, 4, COL.iron, [0, -.2, .02]);
      b.cyl('m', .08, .24, .32, 12, pal.trim, [0, -.55, .02]);
      b.ring('m', .24, .02, COL.goldDark, [0, -.71, .02], [Math.PI / 2, 0, 0], 16); break;
    case 'lantern':
      b.cyl('m', .012, .012, .3, 4, COL.iron, [0, -.15, .02]);
      b.box('g', .12, .16, .12, pal.glow, [0, -.38, .02]);
      b.cone('m', .1, .08, 4, COL.iron, [0, -.26, .02], [0, Math.PI / 4, 0]); break;
    case 'scepter':
      b.cyl('m', .02, .02, .6, 6, COL.gold, [0, -.1, .02]);
      b.gem('g', .07, pal.glow, [0, .24, .02], [1, 1.4, 1]); break;
    case 'boneclub':
      b.cyl('s', .05, .09, .8, 8, COL.bone, [0, -.38, .02]);
      b.ball('s', .12, COL.bone, [0, -.78, .02]); break;
    default: break;
  }
}

function head(b, kind, pal) {
  const skin = pal.skin ?? 0x2a2228;
  switch (kind) {
    case 'helm':
      b.ball('m', .15, pal.main, [0, .12, 0], [1, 1.15, 1.05], 10, 8);
      b.box('g', .16, .025, .02, pal.glow, [0, .12, .145]);
      b.box('m', .03, .14, .2, pal.trim, [0, .28, -.01]); break;
    case 'greathelm':
      b.cyl('m', .15, .16, .3, 8, pal.main, [0, .14, 0]);
      b.box('g', .18, .03, .02, pal.glow, [0, .17, .16]);
      b.box('m', .03, .26, .02, pal.trim, [0, .12, .165]);
      b.cone('m', .16, .06, 8, pal.trim, [0, .32, 0]); break;
    case 'hood': case 'cowl':
      b.ball('s', .17, pal.cloth, [0, .12, -.02], [1, 1.2, 1.1], 10, 8);
      b.cone('s', .14, .22, 8, pal.cloth, [0, .3, -.06], [-.4, 0, 0]);
      b.ball('s', .1, 0x050407, [0, .1, .08], [1, 1, .6]);
      b.ball('g', .022, pal.glow, [-.04, .12, .14]); b.ball('g', .022, pal.glow, [.04, .12, .14]); break;
    case 'mitre':
      b.ball('s', .12, skin, [0, .1, 0], [1, 1.1, 1]);
      b.cone('s', .14, .42, 4, pal.main, [0, .38, 0], [0, Math.PI / 4, 0], [1, 1, .55]);
      b.box('m', .03, .36, .09, pal.trim, [0, .36, .045]);
      b.ball('g', .02, pal.glow, [-.04, .11, .11]); b.ball('g', .02, pal.glow, [.04, .11, .11]); break;
    case 'crown':
      b.ball('s', .13, skin, [0, .11, 0], [1, 1.1, 1]);
      b.cyl('m', .13, .12, .07, 10, COL.gold, [0, .25, 0]);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; b.cone('m', .022, .1, 4, COL.gold, [Math.sin(a) * .12, .32, Math.cos(a) * .12]); }
      b.gem('g', .03, pal.glow, [0, .25, .13]);
      b.ball('g', .02, pal.glow, [-.045, .12, .115]); b.ball('g', .02, pal.glow, [.045, .12, .115]); break;
    case 'noble':
      b.ball('s', .13, skin, [0, .11, 0], [.95, 1.15, 1]);
      b.ball('s', .14, 0x0c0a10, [0, .17, -.03], [1, .8, 1]);
      b.cone('s', .05, .14, 4, 0x0c0a10, [0, .2, .1], [.9, 0, 0]);
      b.ball('g', .02, pal.glow, [-.045, .12, .115]); b.ball('g', .02, pal.glow, [.045, .12, .115]); break;
    case 'skull':
      b.ball('s', .15, COL.bone, [0, .12, 0], [1, 1.05, 1.1], 10, 8);
      b.box('s', .14, .06, .1, COL.bone, [0, -.01, .05]);
      b.ball('g', .035, pal.glow, [-.055, .13, .12]); b.ball('g', .035, pal.glow, [.055, .13, .12]); break;
    case 'beak':
      b.ball('s', .15, pal.cloth, [0, .12, -.02], [1, 1.15, 1.1]);
      b.cone('s', .07, .3, 6, skin, [0, .06, .22], [Math.PI / 2 + .3, 0, 0]);
      b.ball('g', .035, pal.glow, [-.06, .14, .12]); b.ball('g', .035, pal.glow, [.06, .14, .12]);
      b.cyl('s', .2, .2, .03, 12, 0x14100c, [0, .27, 0]); b.cyl('s', .12, .13, .14, 12, 0x14100c, [0, .34, 0]); break;
    case 'hollow':
      b.ball('s', .14, pal.main, [0, .12, 0], [1, 1.15, 1]);
      b.ball('s', .1, skin, [0, .12, .06], [1, 1.2, .7]); break;
    case 'rock':
      b.box('s', .3, .22, .26, pal.main, [0, .1, 0], [0, .3, .1]);
      b.box('g', .16, .03, .03, pal.glow, [0, .12, .14]); break;
    default: break;
  }
}

// ---------------------------------------------------------------------------
// Rigs. Each returns named builders and the pivot positions for the animator.
// ---------------------------------------------------------------------------
function buildRig(def) {
  const P = () => new PartBuilder();
  const pal = def.pal, ex = new Set(def.extras || []);
  const parts = {}, piv = {};
  const robed = def.rig === 'robed';
  const noble = def.rig === 'noble';
  const colossus = def.rig === 'colossus';
  if (def.rig === 'beast') return buildBeast(def);
  const legLen = colossus ? .7 : .62, hipW = colossus ? .14 : .1, torsoH = colossus ? .62 : .5, shoulderW = colossus ? .3 : .22;
  piv.hips = legLen;
  // Legs (hidden under robes).
  if (!robed) {
    for (const s of ['L', 'R']) {
      const g = P(), x = 0;
      if (colossus) { g.cyl('s', .06, .07, legLen * .55, 6, pal.main, [x, -legLen * .28, 0]); g.ball('s', .07, pal.trim, [x, -legLen * .55, 0]); g.cyl('s', .05, .06, legLen * .45, 6, pal.main, [x, -legLen * .8, 0]); g.box('s', .14, .06, .2, pal.main, [x, -legLen + .03, .04]); }
      else { g.box(def.rig === 'knight' ? 'm' : 's', .12, legLen * .95, .13, noble ? 0x0c0a10 : pal.main, [x, -legLen / 2, 0]); g.box('m', .14, .08, .2, noble ? 0x18141a : pal.trim, [x, -legLen + .04, .04]); if (def.rig === 'knight') g.ball('m', .07, pal.trim, [x, -legLen * .5, .05], [1, 1, .7]); }
      parts['leg' + s] = g; piv['leg' + s] = [s === 'L' ? -hipW : hipW, legLen, 0];
    }
  }
  // Torso, in hip space.
  const t = P();
  if (colossus) {
    t.box('s', .16, .12, .12, pal.main, [0, .05, 0]);
    t.cyl('s', .04, .04, torsoH, 6, pal.main, [0, torsoH / 2, -.04]);
    for (let i = 0; i < 4; i++) t.add('stone', new THREE.TorusGeometry(.22 - i * .02, .025, 4, 12, Math.PI), pal.main, [0, .18 + i * .11, .0], [0, Math.PI / 2 + Math.PI / 2, 0], [1, 1, 1.2]);
    t.ball('g', .07, pal.glow, [0, torsoH * .55, 0]);
    t.box('s', .58, .1, .14, pal.main, [0, torsoH, -.02]);
  } else if (robed) {
    const hunch = ex.has('hunch') ? .2 : 0;
    t.cone('s', ex.has('gown') ? .42 : .34, legLen + .05, 12, pal.cloth, [0, -legLen / 2 + .02, 0], [0, 0, 0]);
    t.cyl('s', .16, .2, torsoH, 8, pal.main, [0, torsoH / 2, -hunch * .2], [hunch, 0, 0]);
    t.box('m', .05, torsoH * .9, .02, pal.trim, [0, torsoH / 2, .17], [hunch, 0, 0]);
    t.cyl('m', .2, .2, .04, 10, pal.trim, [0, .04, 0]);
    t.ball('s', .2, pal.main, [0, torsoH, -hunch * .3], [1.15, .55, 1]);
  } else {
    t.box(def.rig === 'knight' ? 'm' : 's', .34, torsoH * .7, .22, noble ? 0x18121c : pal.main, [0, torsoH * .55, 0]);
    t.box('m', .3, .08, .2, pal.trim, [0, .08, 0]);
    t.box('s', .26, .2, .18, noble ? 0x0c0a10 : pal.cloth, [0, -.02, 0], [0, 0, 0]);
    if (def.rig === 'knight') { t.box('g', .06, .1, .02, pal.glow, [0, torsoH * .6, .115]); t.box('m', .36, .05, .24, pal.trim, [0, torsoH * .88, 0]); }
    if (noble) { t.box('s', .06, torsoH * .6, .02, 0xd8d0d0, [0, torsoH * .55, .115]); t.box('m', .3, .04, .23, pal.trim, [0, torsoH * .3, 0]); }
  }
  // Shoulders and extras on the torso.
  if (!colossus) {
    for (const s of [-1, 1]) {
      t.ball(def.rig === 'knight' ? 'm' : 's', .1, def.rig === 'knight' ? pal.main : pal.cloth, [s * shoulderW, torsoH * .9, 0], [1.1, .8, 1]);
      if (ex.has('spikes')) t.cone('m', .035, .16, 4, pal.trim, [s * (shoulderW + .04), torsoH * .98, 0], [0, 0, -s * .6]);
    }
  }
  if (ex.has('collar')) { t.add('stone', new THREE.CylinderGeometry(.2, .12, .16, 10, 1, true, Math.PI * .75, Math.PI * 1.5), pal.cloth, [0, torsoH + .02, -.03]); }
  parts.torso = t; piv.torso = [0, 0, 0];
  // Cape: hangs from the shoulders, sways.
  if (ex.has('cape')) { const c = P(); c.box('s', .44, legLen + torsoH * .8, .025, pal.cloth, [0, -(legLen + torsoH * .8) / 2, 0]); c.cone('s', .22, .14, 3, pal.cloth, [0, -(legLen + torsoH * .8) - .05, 0], [Math.PI, 0, 0], [1, 1, .12]); parts.cape = c; piv.cape = [0, torsoH * .9, -.13]; }
  // Arms, in shoulder space, hanging down.
  const armLen = colossus ? .62 : .46;
  for (const s of ['L', 'R']) {
    const a = P(), sign = s === 'L' ? -1 : 1;
    const sleeve = robed || noble;
    if (colossus) { a.cyl('s', .05, .045, armLen * .5, 6, pal.main, [0, -armLen * .25, 0]); a.ball('s', .06, pal.trim, [0, -armLen * .5, 0]); a.cyl('s', .045, .05, armLen * .45, 6, pal.main, [0, -armLen * .75, 0]); a.box('s', .12, .1, .1, pal.main, [0, -armLen, .02]); }
    else if (sleeve) { a.cone('s', .1, armLen, 8, pal.cloth, [0, -armLen / 2, 0], [Math.PI, 0, 0]); a.ball('s', .045, pal.skin ?? 0x2a2228, [0, -armLen - .02, .02]); }
    else { a.box('m', .1, armLen, .11, pal.main, [0, -armLen / 2, 0]); a.box('m', .12, .1, .13, pal.trim, [0, -armLen + .02, .01]); }
    if (s === 'R' && def.weapon !== 'none') { const w = P(); weapon(w, def.weapon, pal); parts.weapon = w; }
    if (s === 'L' && ex.has('shield')) { a.cyl('m', .26, .26, .04, 12, pal.main, [-.06, -armLen * .7, .1], [0, 0, Math.PI / 2], [1, 1, 1.25]); a.ring('m', .26, .02, pal.trim, [-.085, -armLen * .7, .1], [0, Math.PI / 2, 0], 16); a.gem('g', .05, pal.glow, [-.1, -armLen * .7, .1]); }
    if (s === 'L' && def.weapon === 'none' && (ex.has('orbs') || ex.has('crescent'))) a.ball('g', .06, pal.glow, [0, -armLen - .05, .05]);
    parts['arm' + s] = a; piv['arm' + s] = [sign * (shoulderW + .03), torsoH * .88, 0];
  }
  piv.weapon = [0, -armLen - .02, .03];
  // Head.
  const h = P(); head(h, def.head, pal); parts.head = h; piv.head = [0, torsoH + (colossus ? .1 : .06), ex.has('hunch') ? .08 : 0];
  // Floating extras around the head/body.
  const aura = P();
  if (ex.has('eclipse')) { aura.cyl('s', .3, .3, .02, 28, 0x050408, [0, 0, -.06], [Math.PI / 2, 0, 0]); aura.ring('g', .33, .03, pal.glow, [0, 0, -.07], [0, 0, 0], 36); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; aura.cone('g', .022, .12, 4, pal.glow, [Math.sin(a) * .42, Math.cos(a) * .42, -.07], [0, 0, -a]); } piv.aura = [0, torsoH + .3, -.22]; parts.auraScale = .72; }
  else if (ex.has('halo')) { aura.ring('g', .2, .018, pal.glow, [0, 0, 0], [Math.PI / 2 - .25, 0, 0], 28); piv.aura = [0, torsoH + .42, -.02]; }
  else if (ex.has('crescent')) { aura.add('glow', new THREE.TorusGeometry(.26, .035, 4, 20, Math.PI * 1.2), pal.glow, [0, 0, 0], [0, 0, Math.PI * .9]); piv.aura = [0, torsoH + .28, -.12]; }
  if (!aura.isEmpty()) parts.aura = aura;
  const orbit = P();
  const orbitDef = ex.has('orbs') ? [5, .45, pal.glow, 'gem'] : ex.has('frost') ? [6, .5, pal.glow, 'shard'] : ex.has('embers') ? [8, .45, pal.glow, 'ball'] : ex.has('flies') ? [9, .4, pal.glow, 'ball'] : ex.has('shards') ? [6, .55, pal.glow, 'crescent'] : ex.has('masks') ? [2, .5, pal.skin, 'mask'] : ex.has('runes') ? [5, .55, pal.glow, 'rune'] : null;
  if (orbitDef) {
    const [n, r, col, kind] = orbitDef;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, p = [Math.sin(a) * r, Math.sin(i * 1.7) * .12, Math.cos(a) * r];
      if (kind === 'gem') orbit.gem('g', .05, col, p, [1, 1.5, 1]);
      else if (kind === 'shard') orbit.gem('g', .05, col, p, [.6, 2, .6]);
      else if (kind === 'ball') orbit.ball('g', .022, col, p);
      else if (kind === 'crescent') orbit.add('glow', new THREE.TorusGeometry(.07, .015, 3, 10, Math.PI), col, p, [0, a, 0]);
      else if (kind === 'rune') orbit.box('g', .07, .1, .015, col, p, [0, a, 0]);
      else if (kind === 'mask') { orbit.ball('s', .1, col, p, [1, 1.2, .5]); orbit.cone('s', .05, .18, 6, col, [p[0], p[1] - .04, p[2] + .1], [Math.PI / 2 + .3, 0, 0]); orbit.ball('g', .02, pal.glow, [p[0] - .035, p[1] + .02, p[2] + .06]); orbit.ball('g', .02, pal.glow, [p[0] + .035, p[1] + .02, p[2] + .06]); }
    }
    parts.orbit = orbit; piv.orbit = [0, legLen + torsoH * .7, 0];
  }
  if (ex.has('drips')) { const d = P(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; d.ball('g', .025, pal.glow, [Math.sin(a) * .3, .02, Math.cos(a) * .3], [1, .4, 1]); } parts.ground = d; }
  // Wings, on the torso's back.
  if (ex.has('batwings') || ex.has('featherwings')) {
    for (const s of [-1, 1]) {
      const w = P(), col = ex.has('featherwings') ? 0xf0e8d8 : pal.cloth;
      if (ex.has('featherwings')) for (let i = 0; i < 5; i++) w.box('s', .5 - i * .06, .06, .02, col, [s * (.25 - i * .02), -i * .08, 0], [0, 0, s * (.25 + i * .12)]);
      else { w.box('s', .06, .5, .02, 0x14100c, [s * .2, .05, 0], [0, 0, s * 1.1]); for (let i = 0; i < 3; i++) w.cone('s', .14, .45, 3, col, [s * (.22 + i * .12), -.12 - i * .04, 0], [0, 0, s * (2.4 - i * .2)], [1, 1, .1]); }
      parts['wing' + (s < 0 ? 'L' : 'R')] = w; piv['wing' + (s < 0 ? 'L' : 'R')] = [s * .08, torsoH * .85, -.12];
    }
  }
  return { parts, piv, legLen, torsoH, robed, colossus, float: ex.has('float') };
}

function buildBeast(def) {
  const P = () => new PartBuilder(), pal = def.pal, ex = new Set(def.extras || []);
  const parts = {}, piv = {};
  const bodyY = .55;
  const t = P();
  t.ball('s', .28, pal.main, [0, 0, 0], [1, .8, 1.6], 12, 8);
  t.ball('s', .22, pal.main, [0, .05, .3], [1.1, 1, 1]);
  if (ex.has('thorns')) for (let i = 0; i < 9; i++) t.cone('s', .035, .22, 4, pal.trim, [((i % 3) - 1) * .1, .2 + (i % 2) * .04, -.35 + i * .09], [-.3, 0, ((i % 3) - 1) * .4]);
  for (let i = 0; i < 4; i++) t.ball('g', .02, pal.glow, [((i % 2) - .5) * .3, -.05, -.2 + i * .14]);
  t.cyl('s', .04, .015, .5, 6, pal.main, [0, .05, -.6], [-1.1, 0, 0]);
  parts.torso = t; piv.hips = bodyY; piv.torso = [0, 0, 0];
  const h = P();
  h.ball('s', .17, pal.main, [0, 0, 0], [1, .9, 1.2]);
  h.box('s', .18, .1, .18, pal.main, [0, -.06, .14]);
  for (const s of [-1, 1]) { h.ball('g', .03, pal.glow, [s * .08, .04, .17]); if (ex.has('horns')) h.cone('s', .04, .3, 5, pal.trim, [s * .12, .16, -.02], [-.5, 0, -s * .6]); for (let k = 0; k < 2; k++) h.cone('s', .015, .06, 4, COL.bone, [s * (.04 + k * .04), -.12, .22], [Math.PI, 0, 0]); }
  parts.head = h; piv.head = [0, .14, .5];
  for (const [name, x, z] of [['legFL', -.15, .3], ['legFR', .15, .3], ['legBL', -.15, -.3], ['legBR', .15, -.3]]) {
    const g = P(); g.cyl('s', .06, .045, bodyY, 6, pal.main, [0, -bodyY / 2, 0]); g.box('s', .1, .05, .14, pal.trim, [0, -bodyY + .02, .03]);
    for (let k = -1; k <= 1; k++) g.cone('s', .014, .05, 4, COL.bone, [k * .03, -bodyY + .02, .11], [Math.PI / 2, 0, 0]);
    parts[name] = g; piv[name] = [x, bodyY, z];
  }
  return { parts, piv, legLen: bodyY, torsoH: .3, beast: true };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createBossFactory({ glowTexture } = {}) {
  const materials = {
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .82, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .38, metalness: .35 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  };
  const cache = new Map();
  function baked(id) {
    if (cache.has(id)) return cache.get(id);
    const rig = buildRig(BOSSES[id]);
    const auraScale = rig.parts.auraScale; delete rig.parts.auraScale;
    const out = { ...rig, auraScale, baked: Object.fromEntries(Object.entries(rig.parts).map(([k, b]) => [k, bake(b)])) };
    cache.set(id, out);
    return out;
  }
  function meshes(g) {
    const group = new THREE.Group();
    for (const list of ['stone', 'metal', 'glow']) { if (!g[list]) continue; const m = new THREE.Mesh(g[list], materials[list]); m.castShadow = list !== 'glow'; m.receiveShadow = list !== 'glow'; group.add(m); }
    return group;
  }
  const at = (g, p) => { if (p) g.position.set(p[0], p[1], p[2]); return g; };

  function create(id) {
    const def = BOSSES[id]; if (!def) return null;
    const r = baked(id), b = r.baked, piv = r.piv;
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body); body.scale.setScalar(def.scale || 1);
    const hips = new THREE.Group(); hips.position.y = piv.hips; body.add(hips);
    const n = {};
    const addTo = (parent, key, pivot) => { if (!b[key]) return null; const g = at(meshes(b[key]), pivot); parent.add(g); n[key] = g; return g; };
    addTo(hips, 'torso', piv.torso);
    for (const leg of ['legL', 'legR', 'legFL', 'legFR', 'legBL', 'legBR']) if (b[leg]) { const g = at(meshes(b[leg]), [piv[leg][0], 0, piv[leg][2]]); hips.add(g); n[leg] = g; }
    if (r.beast) addTo(hips, 'head', piv.head);
    else {
      addTo(n.torso, 'head', piv.head);
      addTo(n.torso, 'armL', piv.armL); addTo(n.torso, 'armR', piv.armR);
      if (b.weapon && n.armR) { const w = at(meshes(b.weapon), piv.weapon); n.armR.add(w); n.weapon = w; }
      addTo(n.torso, 'cape', piv.cape);
      addTo(n.torso, 'wingL', piv.wingL); addTo(n.torso, 'wingR', piv.wingR);
      addTo(n.torso, 'aura', piv.aura); if (n.aura && r.auraScale) n.aura.scale.setScalar(r.auraScale);
    }
    if (b.orbit) { const g = at(meshes(b.orbit), piv.orbit); body.add(g); n.orbit = g; }
    if (b.ground) { const g = meshes(b.ground); body.add(g); n.ground = g; }
    // Hit flash: an additive glow that pulses over the boss when it is struck.
    let flash = null;
    if (glowTexture) { flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); flash.position.y = (r.legLen + r.torsoH * .6) * (def.scale || 1); flash.scale.setScalar(1.6 * (def.scale || 1)); root.add(flash); }
    let phase = Math.random() * TAU, yaw = 0, lastX = null, lastZ = null, swing = 0;
    const hoverBase = r.float ? .25 : 0;

    function update(s, dt, time) {
      // Facing: toward where it moved this frame; toward the keep while attacking.
      if (lastX != null) {
        const dx = s.x - lastX, dz = s.y - lastZ;
        if (!s.attacking && Math.hypot(dx, dz) > 1e-4) s.want = Math.atan2(dx, dz);
      }
      lastX = s.x; lastZ = s.y;
      const want = s.attacking && s.faceAngle != null ? s.faceAngle : (s.want ?? yaw);
      let d = want - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * Math.min(1, dt * 6);
      root.rotation.y = yaw;
      const walking = !s.attacking && !s.paused;
      phase += dt * (walking ? 7 * (s.speed || .5) / .3 : 1.5);
      const sw = walking ? Math.sin(phase) : 0, bob = walking ? Math.abs(Math.cos(phase)) * .035 : Math.sin(time * 2) * .01;
      hips.position.y = piv.hips + bob + hoverBase + (r.float ? Math.sin(time * 1.6) * .05 : 0);
      if (n.legL) { n.legL.rotation.x = sw * .55; n.legR.rotation.x = -sw * .55; }
      if (n.legFL) { n.legFL.rotation.x = sw * .6; n.legBR.rotation.x = sw * .6; n.legFR.rotation.x = -sw * .6; n.legBL.rotation.x = -sw * .6; }
      if (r.beast && n.head) n.head.rotation.x = s.attacking ? -.3 + Math.sin(time * 8) * .35 : sw * .08;
      if (n.torso && !r.beast) n.torso.rotation.z = sw * .04;
      // Arms swing with the walk; the weapon arm chops while attacking.
      swing = s.attacking ? swing + dt * 5 : 0;
      if (n.armL) n.armL.rotation.x = -sw * .35 + (r.float ? -.3 : 0);
      if (n.armR) n.armR.rotation.x = s.attacking ? -1.3 - Math.sin(swing) * 1.1 : sw * .35 + (r.float ? -.3 : 0);
      if (n.cape) n.cape.rotation.x = .15 + (walking ? .12 + Math.sin(phase * 2) * .05 : .04 * Math.sin(time * 1.5));
      if (n.wingL) { const f = Math.sin(time * (r.float ? 3 : 1.2)) * (r.float ? .35 : .1); n.wingL.rotation.y = .4 + f; n.wingR.rotation.y = -.4 - f; }
      if (n.aura) n.aura.rotation.z += dt * .3;
      if (n.orbit) n.orbit.rotation.y += dt * 1.2;
      if (n.head && !r.beast) n.head.rotation.y = Math.sin(time * .7) * .15;
      // Hurt: a flinch and a flash.
      const hit = Math.max(0, Math.min(1, (s.hit || 0) / .11));
      body.rotation.x = -hit * .12;
      if (flash) flash.material.opacity = hit * .55;
      // Low health: the boss stoops.
      if (n.torso && !r.beast) n.torso.rotation.x = (1 - Math.max(0, Math.min(1, s.hp ?? 1))) * .25;
    }
    function dispose() { flash?.material.dispose(); }
    return { root, update, dispose, height: (r.legLen + r.torsoH + .4) * (def.scale || 1) };
  }
  function dispose() {
    for (const r of cache.values()) for (const g of Object.values(r.baked)) for (const list of ['stone', 'metal', 'glow']) g[list]?.dispose();
    cache.clear(); Object.values(materials).forEach(m => m.dispose());
  }
  return { create, dispose, ids: BOSS_MODEL_IDS };
}
