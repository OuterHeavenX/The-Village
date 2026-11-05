// V37.4 — 3D emblems for the cards that are not towers (skills, traps, hero
// upgrades). Built from the same primitive kit and materials as the tower
// models, so every card's art comes out of one style. Each emblem stands on
// the origin, about one unit tall, facing +Z (the camera).

import * as THREE from 'three';
import { PartBuilder, COL } from './towerModels.js';

const TAU = Math.PI * 2;

function cross(b, list, color, pos, size = 1, orthodox = false) {
  const [x, y, z] = pos;
  b.box(list, .09 * size, .62 * size, .09 * size, color, [x, y, z]);
  b.box(list, .38 * size, .09 * size, .09 * size, color, [x, y + .12 * size, z]);
  if (orthodox) {
    b.box(list, .2 * size, .06 * size, .09 * size, color, [x, y + .24 * size, z]);
    b.box(list, .24 * size, .06 * size, .09 * size, color, [x, y - .16 * size, z], [0, 0, -.35]);
  }
}
function axe(b, pos, rot = [0, 0, 0], s = 1) {
  const g = new PartBuilder();
  g.box('s', .05, .6, .05, COL.wood, [0, 0, 0]);
  g.box('s', .06, .12, .06, COL.crimson, [0, -.18, 0]);
  g.half('m', .17, .03, COL.steel, [0, .22, .02], [Math.PI / 2, 0, Math.PI / 2], -Math.PI / 2);
  g.half('m', .12, .03, COL.steel, [0, .22, -.02], [Math.PI / 2, 0, Math.PI / 2], Math.PI / 2);
  g.cone('m', .025, .1, 4, COL.gold, [0, .34, 0]);
  return merge(b, g, pos, rot, s);
}
function sword(b, pos, rot = [0, 0, 0], s = 1) {
  const g = new PartBuilder();
  g.box('m', .06, .62, .016, COL.steel, [0, .2, 0]);
  g.cone('m', .043, .1, 4, COL.steel, [0, .56, 0], [0, Math.PI / 4, 0], [1, 1, .3]);
  g.box('m', .24, .04, .05, COL.gold, [0, -.12, 0]);
  g.cyl('s', .022, .022, .16, 6, COL.leather, [0, -.22, 0]);
  g.ball('m', .035, COL.gold, [0, -.31, 0]);
  return merge(b, g, pos, rot, s);
}
// Copies another builder's parts into `b` under a transform.
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
function merge(b, g, pos, rot, s) {
  tmpE.set(rot[0], rot[1], rot[2]); tmpQ.setFromEuler(tmpE);
  tmpM.compose(tmpP.set(...pos), tmpQ, tmpS.set(s, s, s));
  for (const list of ['stone', 'metal', 'glow']) for (const part of g.lists[list]) b.lists[list].push({ ...part, matrix: tmpM.clone().multiply(part.matrix) });
  return b;
}
function altar(b, r = .34, h = .14, color = COL.stoneLight) {
  b.cyl('s', r + .06, r + .1, .06, 8, COL.stoneDark, [0, .03, 0], [0, Math.PI / 8, 0]);
  b.cyl('s', r, r + .02, h, 8, color, [0, .06 + h / 2, 0], [0, Math.PI / 8, 0]);
  b.cyl('m', r + .01, r + .01, .02, 8, COL.gold, [0, .06 + h, 0], [0, Math.PI / 8, 0]);
  return .07 + h;
}
function sparks(b, color, n, radius, y0, y1, size = .03) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + i * .7, r = radius * (.6 + .4 * ((i * 37) % 10) / 10);
    b.gem('g', size * (.6 + ((i * 13) % 5) / 8), color, [Math.sin(a) * r, y0 + (y1 - y0) * (((i * 29) % 11) / 10), Math.cos(a) * r * .6]);
  }
}

export const EMBLEMS = {
  // --- skills --------------------------------------------------------------
  waterSkill(b) {
    const top = altar(b);
    b.ball('g', .2, 0x8ad8ff, [0, top + .24, 0], [1, 1.05, 1], 14, 12);
    b.ball('g', .1, 0xe8fbff, [0, top + .27, 0]);
    b.cyl('g', .06, .08, .14, 10, 0x9fe0ff, [0, top + .5, 0]);
    b.cyl('m', .075, .075, .05, 10, COL.gold, [0, top + .58, 0]);
    b.ball('m', .05, COL.gold, [0, top + .63, 0]);
    b.ring('m', .205, .018, COL.gold, [0, top + .24, 0], [Math.PI / 2, 0, 0], 20);
    for (const [x, y] of [[-.34, .5], [.36, .62], [-.28, .82], [.24, .9]]) { b.ball('g', .045, 0x9fe8ff, [x, top + y, .05], [1, 1.4, 1]); b.cone('g', .03, .07, 6, 0x9fe8ff, [x, top + y + .06, .05]); }
  },
  crossSkill(b) {
    cross(b, 'm', COL.gold, [0, .55, 0], 1.25);
    cross(b, 'g', 0xfff2b0, [0, .55, .05], 1.05);
    cross(b, 'm', COL.gold, [-.42, .45, -.1], .6);
    cross(b, 'm', COL.gold, [.42, .45, -.1], .6);
    b.ring('g', .46, .014, 0xffe18b, [0, .62, 0], [Math.PI / 2 - .25, 0, 0], 40);
    sparks(b, 0xfff2b0, 12, .6, .1, 1.1);
  },
  summon(b) {
    const top = altar(b, .3, .1);
    sword(b, [-.1, top + .36, 0], [0, 0, .5]);
    sword(b, [.1, top + .36, 0], [0, 0, -.5]);
    b.cyl('s', .2, .2, .05, 14, COL.crimson, [0, top + .34, .08], [Math.PI / 2, 0, 0], [1, 1, 1.25]);
    b.ring('m', .2, .02, COL.gold, [0, top + .34, .11], [0, 0, 0], 20);
    b.ball('s', .1, COL.iron, [0, top + .36, .13], [1, .8, .6]);
    b.box('g', .09, .015, .02, 0x9fe8ff, [0, top + .37, .19]);
  },
  axeRain(b) {
    axe(b, [0, .58, .05], [0, 0, .45], 1.45);
    axe(b, [-.4, .86, -.12], [0, 0, 1.9], 1.05);
    axe(b, [.42, .34, -.1], [0, 0, -1.3], 1.05);
    for (let i = 0; i < 3; i++) b.ring('g', .26 + i * .12, .012, 0xffb27a, [0, .18 + i * .34, -.25], [Math.PI / 2 + .3, 0, 0], 28);
  },
  grandCross(b) {
    const top = altar(b, .38, .2);
    cross(b, 'm', COL.gold, [0, top + .42, 0], 1.3, true);
    cross(b, 'g', 0xfff2b0, [0, top + .42, .05], 1.1, true);
    b.ring('g', .26, .016, 0xfff2b0, [0, top + .6, -.05], [0, 0, 0], 32);
    sparks(b, 0xfff2b0, 10, .55, top, top + .95);
  },
  // --- hero upgrades ---------------------------------------------------------
  soulPact(b) {
    const top = altar(b, .28, .12, COL.stone);
    sword(b, [0, top + .42, 0], [0, 0, 0], 1.05);
    b.gem('g', .07, 0xff3048, [0, top + .3, .03], [1, 1.4, 1]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; b.ball('g', .025, 0xff5a6a, [Math.sin(a) * .3, top + .2 + (i % 3) * .2, Math.cos(a) * .2]); }
  },
  sharpen(b) {
    b.box('s', .6, .1, .2, COL.stoneLight, [0, .1, 0]);
    b.box('s', .64, .04, .24, COL.wood, [0, .03, 0]);
    sword(b, [.05, .48, 0], [0, 0, -1.1], 1.1);
    b.box('g', .05, .32, .03, 0xffe27a, [-.2, .7, .1], [0, 0, .5]);
    b.box('g', .05, .3, .03, 0xffe27a, [-.12, .5, .1], [0, 0, -.5]);
    sparks(b, 0xffe9a8, 8, .3, .2, .5, .025);
  },
  moonBlessing(b) {
    // An eclipse: a dark moon in front of a burning corona, a thin crescent of light.
    const top = altar(b, .3, .12), y = top + .52;
    b.cyl('g', .3, .3, .02, 32, 0xffe9b0, [0, y, -.04], [Math.PI / 2, 0, 0]);
    b.ring('g', .34, .03, 0xffc860, [0, y, -.03], [0, 0, 0], 40);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = .4 + (i % 2) * .08; b.cone('g', .025, .12 + (i % 2) * .06, 4, 0xffd890, [Math.sin(a) * r, y + Math.cos(a) * r, -.05], [0, 0, -a]); }
    b.cyl('s', .27, .27, .05, 32, 0x0c0a12, [.05, y + .03, .02], [Math.PI / 2, 0, 0]);
    b.add('glow', new THREE.TorusGeometry(.28, .02, 4, 24, Math.PI * .9), 0xfff4d0, [-.02, y - .01, .03], [0, 0, Math.PI * .55]);
    sparks(b, 0xfff0c0, 8, .55, top + .05, top + 1, .025);
  },
  fortify(b) {
    // Hunter's Reach: a chain flail swung wide inside a range ring.
    const top = altar(b, .28, .1);
    b.ring('g', .5, .014, 0x9fe0ff, [0, top + .02, 0], [Math.PI / 2, 0, 0], 40);
    b.ring('g', .36, .01, 0x9fe0ff, [0, top + .02, 0], [Math.PI / 2, 0, 0], 32);
    b.cyl('s', .04, .05, .5, 6, COL.wood, [0, top + .25, 0]);
    b.box('s', .07, .1, .07, COL.leather, [0, top + .45, 0]);
    for (let i = 0; i < 7; i++) b.ring('m', .035, .011, COL.steel, [.06 + i * .06, top + .52 + Math.sin(i * .5) * .05, 0], [0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2], 8);
    b.ball('m', .08, COL.iron, [.5, top + .62, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; b.cone('m', .022, .07, 4, COL.steel, [.5 + Math.sin(a) * .08, top + .62 + Math.cos(a) * .08, 0], [0, 0, -a]); }
    b.cone('g', .05, .16, 4, 0x9fe0ff, [.4, top + .02, .3], [Math.PI / 2, 0, -.6]);
  },
  // --- battle boosters -------------------------------------------------------
  fieldRepair(b) {
    const top = altar(b, .32, .1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - (r % 2); c++) b.box('s', .2, .1, .14, r === 2 && c === 1 ? COL.stoneLight : COL.stone, [(c - (2 - (r % 2)) / 2) * .21, top + .06 + r * .11, 0]);
    b.box('s', .06, .4, .06, COL.wood, [.22, top + .52, .12], [0, 0, -.6]);
    b.box('m', .22, .1, .1, COL.iron, [.34, top + .7, .12], [0, 0, -.6]);
    b.ring('g', .34, .014, 0x8aff9a, [0, top + .2, 0], [Math.PI / 2, 0, 0], 32);
    for (const [x, y] of [[-.3, .5], [-.12, .62], [.05, .48]]) { b.box('g', .1, .03, .03, 0x8aff9a, [x, top + y, .1]); b.box('g', .03, .1, .03, 0x8aff9a, [x, top + y, .1]); }
  },
  fieldMerge(b) {
    // Two small towers fusing into a star above an anvil.
    b.box('m', .44, .12, .24, COL.iron, [0, .2, 0]);
    b.box('m', .26, .14, .18, COL.iron, [0, .07, 0]);
    b.cone('m', .1, .2, 4, COL.iron, [.3, .22, 0], [0, 0, -Math.PI / 2], [1, 1, .9]);
    for (const s of [-1, 1]) { b.cyl('s', .07, .08, .26, 8, COL.stone, [s * .16, .39, 0], [0, 0, -s * .35]); b.cone('s', .09, .12, 8, COL.slate, [s * .2, .55, 0], [0, 0, -s * .35]); }
    b.gem('g', .11, 0xffe9a8, [0, .78, 0], [1, 1.3, 1]);
    b.ring('g', .2, .012, 0xffe9a8, [0, .78, 0], [0, 0, 0], 28);
    sparks(b, 0xffe9a8, 10, .42, .35, .95, .028);
  },
  battleInsight(b) {
    const top = altar(b, .3, .12);
    b.box('s', .5, .03, .34, 0x5a2416, [0, top + .06, 0], [-.5, 0, 0]);
    b.box('s', .22, .02, .3, COL.parchment, [-.12, top + .09, 0], [-.5, 0, .14]);
    b.box('s', .22, .02, .3, COL.parchment, [.12, top + .09, 0], [-.5, 0, -.14]);
    b.ball('g', .1, 0xbfe8ff, [0, top + .42, 0], [1.5, .9, .6]);
    b.ball('s', .05, 0x0a1220, [0, top + .42, .05]);
    b.ring('g', .16, .012, 0xbfe8ff, [0, top + .42, 0], [0, 0, 0], 24);
    sparks(b, 0xbfe8ff, 8, .45, top + .2, top + .85, .025);
  },
  overclockLine(b) {
    const top = altar(b, .28, .1), y = top + .45;
    b.cyl('m', .26, .26, .07, 16, COL.goldDark, [0, y, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; b.box('m', .08, .08, .07, COL.goldDark, [Math.sin(a) * .29, y + Math.cos(a) * .29, 0], [0, 0, -a]); }
    b.cyl('s', .1, .1, .09, 12, COL.stoneDark, [0, y, 0], [Math.PI / 2, 0, 0]);
    b.box('g', .07, .34, .03, 0xffe27a, [.03, y + .08, .07], [0, 0, .45]);
    b.box('g', .07, .3, .03, 0xffe27a, [-.03, y - .14, .07], [0, 0, .45]);
    b.box('g', .14, .05, .03, 0xffe27a, [0, y - .03, .07], [0, 0, .45]);
  },
  // --- traps -----------------------------------------------------------------
  spikeTrap(b) {
    b.box('m', .7, .05, .7, COL.iron, [0, .025, 0]);
    b.box('m', .74, .02, .74, COL.goldDark, [0, .055, 0]);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) b.cone('m', .06, .34 + ((i + j + 2) % 2) * .1, 4, COL.steel, [i * .22, .24, j * .22]);
  },
  oilTrap(b) {
    b.cyl('s', .52, .52, .012, 20, 0x0c0905, [.05, .008, .05]);
    b.cyl('m', .42, .42, .006, 20, 0x2a1c0c, [.08, .016, .08]);
    // A barrel tipped on its side, spilling.
    b.cyl('s', .2, .2, .48, 12, COL.wood, [-.16, .2, -.08], [0, .5, Math.PI / 2]);
    for (const t of [-.17, .17]) b.ring('m', .205, .016, COL.iron, [-.16 + Math.cos(.5) * t, .2, -.08 - Math.sin(.5) * t], [0, Math.PI / 2 + .5, 0], 16);
    b.cyl('s', .17, .17, .02, 12, COL.woodDark, [-.16 + Math.cos(.5) * .245, .2, -.08 - Math.sin(.5) * .245], [0, .5, Math.PI / 2]);
    b.ball('g', .05, 0xffa040, [.32, .06, .22]);
    b.cone('g', .05, .18, 6, 0xffc060, [.32, .17, .22]);
    b.cone('g', .03, .12, 6, 0xffe0a0, [.26, .12, .25]);
  },
  bearTrap(b) {
    // Built flat, then tipped toward the viewer so the jaws read from the front.
    const flat = new PartBuilder(); const outer = b; b = flat;
    b.cyl('m', .36, .4, .05, 16, COL.iron, [0, .025, 0]);
    b.cyl('m', .12, .12, .07, 10, COL.goldDark, [0, .06, 0]);
    // Two semicircular jaws sprung half-open in a V, teeth pointing inward.
    for (const s of [-1, 1]) {
      const jaw = new PartBuilder();
      jaw.add('metal', new THREE.TorusGeometry(.34, .035, 5, 16, Math.PI), COL.iron);
      for (let k = 0; k < 7; k++) {
        const t = (k + .5) / 7 * Math.PI;
        jaw.cone('m', .03, .1, 4, COL.steel, [Math.cos(t) * .3, Math.sin(t) * .3, 0], [0, 0, t + Math.PI / 2]);
      }
      merge(b, jaw, [0, .06, 0], [s * .55, 0, 0], 1.15);
    }
    for (let i = 0; i < 5; i++) b.ring('m', .04, .012, COL.steel, [.44 + i * .07, .03, .12], [Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0], 8);
    merge(outer, flat, [0, .12, 0], [.55, -.35, 0], 1.25);
  },
  frostRune(b) {
    b.cyl('s', .46, .5, .06, 6, COL.stoneLight, [0, .03, 0]);
    b.ring('g', .38, .02, 0x9fe8ff, [0, .07, 0], [Math.PI / 2, 0, 0], 6);
    b.ring('g', .24, .016, 0x9fe8ff, [0, .07, 0], [Math.PI / 2, 0, Math.PI / 6], 6);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; b.box('g', .03, .01, .3, 0xbff4ff, [Math.sin(a) * .15, .075, Math.cos(a) * .15], [0, a, 0]); }
    for (const [x, z, h, t] of [[0, 0, .6, 0], [-.18, .1, .36, -.3], [.2, .06, .42, .3], [.04, -.18, .3, .1]]) b.gem('g', .1, 0xcff6ff, [x, .1 + h / 2, z], [.7, h / .2, .7]);
  },
  poisonFog(b) {
    b.ball('m', .3, 0x1c1a20, [0, .3, 0], [1, .85, 1], 14, 10);
    b.ring('m', .26, .035, COL.iron, [0, .52, 0], [Math.PI / 2, 0, 0], 20);
    b.cyl('g', .24, .24, .02, 18, 0x7aff5a, [0, .53, 0]);
    for (const [x, y, z, r] of [[-.08, .62, .02, .07], [.1, .7, -.04, .05], [0, .82, .05, .04], [-.12, .92, 0, .03], [.15, 1.0, .02, .05]]) b.ball('g', r, 0x9aff6a, [x, y, z]);
    for (const s of [-1, 1]) b.cone('m', .04, .14, 4, COL.iron, [s * .2, .06, .1]);
  },
  holyBanner(b) {
    b.cyl('s', .2, .24, .08, 8, COL.stoneLight, [0, .04, 0]);
    b.cyl('m', .025, .025, 1.15, 6, COL.gold, [0, .62, 0]);
    b.cone('m', .045, .12, 4, COL.gold, [0, 1.25, 0]);
    b.box('m', .5, .03, .03, COL.gold, [.2, 1.12, 0]);
    b.box('s', .42, .52, .02, COL.crimson, [.21, .84, 0]);
    b.cone('s', .21, .16, 3, COL.crimson, [.21, .5, 0], [Math.PI, 0, 0], [1, 1, .1]);
    cross(b, 'm', COL.gold, [.21, .82, .02], .55);
  },
  watchBell(b) {
    for (const s of [-1, 1]) b.box('s', .07, .8, .07, COL.wood, [s * .3, .4, 0]);
    b.box('s', .7, .07, .1, COL.wood, [0, .8, 0]);
    b.cone('s', .3, .16, 4, COL.slate, [0, .91, 0], [0, Math.PI / 4, 0]);
    b.cyl('m', .08, .22, .34, 14, COL.gold, [0, .56, 0]);
    b.ring('m', .22, .02, COL.goldDark, [0, .4, 0], [Math.PI / 2, 0, 0], 18);
    b.ball('m', .05, COL.iron, [0, .36, 0]);
    for (let i = 0; i < 3; i++) b.ring('g', .34 + i * .1, .008, 0xffe27a, [0, .56, .02], [0, 0, 0], 28);
  },
  shadowMine(b) {
    b.ball('s', .26, 0x17121e, [0, .28, 0], [1, .9, 1], 14, 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; b.cone('m', .04, .14, 4, COL.iron, [Math.sin(a) * .26, .28, Math.cos(a) * .26], [Math.cos(a) * Math.PI / 2, 0, -Math.sin(a) * Math.PI / 2]); }
    b.cone('m', .04, .14, 4, COL.iron, [0, .56, 0]);
    b.ring('g', .27, .015, 0xa070ff, [0, .3, 0], [Math.PI / 2, 0, 0], 24);
    b.ring('g', .2, .012, 0xa070ff, [0, .3, 0], [.6, 0, 0], 24);
    b.ball('g', .06, 0xc08cff, [0, .3, .25]);
  },
  soulLantern(b) {
    b.cyl('s', .18, .22, .07, 8, COL.stoneLight, [0, .035, 0]);
    b.cyl('m', .025, .025, .5, 6, COL.iron, [0, .32, 0]);
    b.box('m', .26, .025, .26, COL.iron, [0, .58, 0]);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.box('m', .025, .32, .025, COL.iron, [Math.sin(a) * .13, .75, Math.cos(a) * .13]); }
    b.box('g', .2, .28, .2, 0xff9d59, [0, .75, 0]);
    b.ball('g', .07, 0xffe0a0, [0, .74, 0]);
    b.cone('s', .2, .16, 4, COL.slate, [0, .99, 0], [0, Math.PI / 4, 0]);
    b.ring('m', .05, .012, COL.iron, [0, 1.1, 0], [0, 0, 0], 10);
  },
  // --- fallback: a medallion on an altar; the card's own icon goes on top in HTML
  medallion(b, accent = 0xffd08a) {
    const top = altar(b, .3, .12);
    b.cyl('s', .34, .34, .06, 24, COL.stoneDark, [0, top + .42, 0], [Math.PI / 2, 0, 0]);
    b.ring('m', .34, .03, COL.gold, [0, top + .42, .03], [0, 0, 0], 28);
    b.ring('g', .28, .01, accent, [0, top + .42, .035], [0, 0, 0], 28);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; b.cone('m', .02, .08, 4, COL.gold, [Math.sin(a) * .4, top + .42 + Math.cos(a) * .4, 0], [0, 0, -a]); }
  }
};

export function buildEmblem(id, accent) {
  const b = new PartBuilder();
  (EMBLEMS[id] || EMBLEMS.medallion)(b, accent);
  return { builder: b, medallion: !EMBLEMS[id] };
}
