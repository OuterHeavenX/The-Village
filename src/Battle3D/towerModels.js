// V37.3 — real 3D towers for the 3D battlefield.
//
// Every tower is built from code out of simple primitives in one shared gothic
// style: a tiered stone plinth with gold trim, a body with lit gothic windows
// and a crimson banner, a battlement ring, then a head that says what the tower
// does (an axe arm, a cannon, a clock, a skull pillar...). Level-ups are
// physical: more gold spikes, more banners, a glowing ring, orbiting runes and
// finally a halo. Elite towers get a gold crown.
//
// Geometry is merged per part into a handful of vertex-coloured meshes and
// cached per tower type and level, so twenty towers cost a few hundred draw
// calls at most and no per-frame allocation. Three shared materials: matte
// stone, shiny metal and unlit glow (which feeds the bloom pass).
//
// Model space: one unit is one board tile, +Y is up, and the aiming head faces
// +Z before it is turned toward its target.

import * as THREE from 'three';

const COL = {
  stone: 0x3a3634, stoneDark: 0x221f1f, stoneLight: 0x524c48, slate: 0x1b1719,
  gold: 0xc9a24a, goldDark: 0x7d5f26, crimson: 0x7a1d2c, crimsonDark: 0x45101a,
  iron: 0x3c4049, steel: 0xaeb7c4, silver: 0xd6dbe2, wood: 0x4e3322, woodDark: 0x2e1e14,
  bone: 0xd9cfb2, boneDark: 0x9c8f72, parchment: 0xe9dcb4, leather: 0x4a2618
};

// ---------------------------------------------------------------------------
// Part builder: collects primitives into three lists (stone, metal, glow) and
// merges each list into one non-indexed BufferGeometry with vertex colours.
// ---------------------------------------------------------------------------
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

class PartBuilder {
  constructor() { this.lists = { stone: [], metal: [], glow: [] }; }
  add(list, geometry, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    tmpE.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ'); tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(pos[0], pos[1], pos[2]), tmpQ, tmpS.set(scale[0], scale[1], scale[2]));
    this.lists[list].push({ geometry, color, matrix: tmpM.clone() });
    return this;
  }
  // Convenience primitives. `m` picks the material list: 's' stone, 'm' metal, 'g' glow.
  box(m, w, h, d, color, pos, rot, scale) { return this.add(L[m], new THREE.BoxGeometry(w, h, d), color, pos, rot, scale); }
  cyl(m, rt, rb, h, seg, color, pos, rot, scale) { return this.add(L[m], new THREE.CylinderGeometry(rt, rb, h, seg), color, pos, rot, scale); }
  cone(m, r, h, seg, color, pos, rot, scale) { return this.add(L[m], new THREE.ConeGeometry(r, h, seg), color, pos, rot, scale); }
  ball(m, r, color, pos, scale, w = 8, hs = 6) { return this.add(L[m], new THREE.SphereGeometry(r, w, hs), color, pos, [0, 0, 0], scale); }
  ring(m, r, tube, color, pos, rot, seg = 18) { return this.add(L[m], new THREE.TorusGeometry(r, tube, 4, seg), color, pos, rot); }
  half(m, r, thick, color, pos, rot, start = 0, seg = 10) { return this.add(L[m], new THREE.CylinderGeometry(r, r, thick, seg, 1, false, start, Math.PI), color, pos, rot); }
  gem(m, r, color, pos, scale) { return this.add(L[m], new THREE.OctahedronGeometry(r, 0), color, pos, [0, 0, 0], scale); }
  isEmpty() { return !this.lists.stone.length && !this.lists.metal.length && !this.lists.glow.length; }
}
const L = { s: 'stone', m: 'metal', g: 'glow' };

let seed = 1;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const color = new THREE.Color();

function mergeList(parts, jitter) {
  if (!parts.length) return null;
  let total = 0;
  const flats = parts.map(part => {
    const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    part.geometry.dispose();
    g.applyMatrix4(part.matrix);
    total += g.attributes.position.count;
    return { g, color: part.color };
  });
  const position = new Float32Array(total * 3), normal = new Float32Array(total * 3), colors = new Float32Array(total * 3);
  let offset = 0;
  for (const { g, color: hex } of flats) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, count = g.attributes.position.count;
    position.set(p, offset * 3); normal.set(n, offset * 3);
    color.setHex(hex);
    // A faint per-face shade variation reads as hand-painted stone instead of plastic.
    for (let v = 0; v < count; v += 3) {
      const k = jitter ? .9 + rnd() * .16 : 1;
      for (let j = 0; j < 3 && v + j < count; j++) colors.set([color.r * k, color.g * k, color.b * k], (offset + v + j) * 3);
    }
    offset += count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.computeBoundingSphere();
  return merged;
}

function bake(builder) {
  return { stone: mergeList(builder.lists.stone, true), metal: mergeList(builder.lists.metal, true), glow: mergeList(builder.lists.glow, false) };
}

// ---------------------------------------------------------------------------
// The shared gothic body. Returns the height of the battlement top.
// ---------------------------------------------------------------------------
function gothicBase(b, o) {
  const seg = o.shape === 'square' ? 4 : o.shape === 'round' ? 12 : 8;
  const rot = o.shape === 'square' ? Math.PI / 4 : Math.PI / 8;
  const r = o.r ?? .32, h = o.h ?? .6, accent = o.accent ?? 0xffb460, level = o.level, banner = o.elite ? COL.gold : (o.banner ?? COL.crimson);
  // Footing: two stepped plinth tiers and a gold trim band.
  b.cyl('s', .45, .49, .1, seg, COL.stoneDark, [0, .05, 0], [0, rot, 0]);
  b.cyl('s', r + .1, r + .13, .09, seg, COL.stone, [0, .145, 0], [0, rot, 0]);
  b.cyl('m', r + .085, r + .085, .025, seg, COL.gold, [0, .2, 0], [0, rot, 0]);
  const y0 = .2, top = y0 + h;
  // Body with a slight taper and darker coursing bands.
  b.cyl('s', r * .9, r, h, seg, COL.stone, [0, y0 + h / 2, 0], [0, rot, 0]);
  for (let y = y0 + .16; y < top - .06; y += .17) b.cyl('s', r * (1 - .1 * (y - y0) / h) + .008, r * (1 - .1 * (y - y0) / h) + .008, .018, seg, COL.stoneDark, [0, y, 0], [0, rot, 0]);
  // Lit gothic windows on the faces away from the banner.
  const faces = seg === 12 ? 6 : seg;
  const faceR = (r * .95) * Math.cos(Math.PI / seg);
  for (let i = 0; i < faces; i++) {
    const a = (i / faces) * Math.PI * 2 + (seg === 4 ? 0 : seg === 12 ? 0 : 0);
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < .3) continue; // banner side (+Z)
    const wx = Math.sin(a) * faceR, wz = Math.cos(a) * faceR, wy = y0 + h * .55;
    const winColor = o.stained ? [0xff6a6a, 0x7ad0ff, 0xffd86a, 0x9a7aff, 0x7aff9a][i % 5] : accent;
    b.box('g', .075, .17, .03, winColor, [wx, wy, wz], [0, a, 0]);
    b.box('g', .053, .053, .03, winColor, [wx, wy + .085, wz], [0, a, Math.PI / 4]);
    b.box('s', .11, .025, .05, COL.stoneLight, [wx * 1.02, wy - .1, wz * 1.02], [0, a, 0]);
  }
  // Front banner with a gold emblem.
  const front = faceR + .012;
  b.box('s', .15, .3, .016, banner, [0, y0 + h * .52, front]);
  b.cone('s', .075, .07, 3, banner, [0, y0 + h * .52 - .185, front], [Math.PI, 0, 0], [1, 1, .2]);
  b.box('m', .17, .02, .03, COL.gold, [0, y0 + h * .52 + .155, front]);
  if (o.emblem !== false) {
    b.box('m', .025, .13, .02, COL.gold, [0, y0 + h * .52, front + .01]);
    b.box('m', .08, .022, .02, COL.gold, [0, y0 + h * .52 + .03, front + .01]);
  }
  if (level >= 3) for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const bx = Math.sin(a) * (faceR + .012), bz = Math.cos(a) * (faceR + .012);
    b.box('s', .13, .26, .016, banner, [bx, y0 + h * .5, bz], [0, a, 0]);
    b.box('m', .15, .02, .03, COL.gold, [bx, y0 + h * .5 + .135, bz], [0, a, 0]);
  }
  // Battlement ring and merlons.
  const tr = r * .9 + .05;
  b.cyl('s', tr, tr - .02, .08, seg, COL.stoneLight, [0, top + .04, 0], [0, rot, 0]);
  b.cyl('m', tr + .005, tr + .005, .018, seg, COL.gold, [0, top + .005, 0], [0, rot, 0]);
  const merlons = o.merlons ?? 8;
  for (let i = 0; i < merlons; i++) {
    const a = (i / merlons) * Math.PI * 2 + Math.PI / merlons;
    b.box('s', .075, .075, .06, COL.stone, [Math.sin(a) * (tr - .02), top + .115, Math.cos(a) * (tr - .02)], [0, a, 0]);
    if (level >= 2 && i % 2 === 0) b.cone('m', .022, .11, 4, COL.gold, [Math.sin(a) * (tr - .02), top + .2, Math.cos(a) * (tr - .02)]);
  }
  // Gold corner spikes on the footing; more with levels.
  const spikes = level >= 2 ? 8 : 4;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + Math.PI / 4;
    b.box('s', .06, .07, .06, COL.stoneDark, [Math.sin(a) * .41, .135, Math.cos(a) * .41], [0, a, 0]);
    b.cone('m', .026, .13, 4, COL.gold, [Math.sin(a) * .41, .235, Math.cos(a) * .41]);
  }
  // Level 3+: a glowing rune ring set into the step.
  if (level >= 3) b.ring('g', r + .115, .012, accent, [0, .19, 0], [Math.PI / 2, 0, 0], 32);
  if (o.elite) { b.ring('m', tr + .03, .02, COL.gold, [0, top + .06, 0], [Math.PI / 2, 0, 0], 24); }
  return top + .08;
}

// ---------------------------------------------------------------------------
// Tower heads. Each returns builders for groups that the animator moves:
//   fixed : sits on the battlement, never moves
//   aim   : yaws to face the target; recoils on fire          (pivot at `pivot`)
//   arm   : child of aim that pitches forward on fire (swing)  (pivot at `armPivot`)
//   spin  : spins about Y at `spinSpeed`                       (pivot at `spinPivot`)
//   float : bobs gently                                        (pivot at `floatPivot`)
// Coordinates inside a group are relative to that group's pivot.
// ---------------------------------------------------------------------------
const HEADS = {
  dagger: {
    base: { shape: 'oct', r: .28, h: .72, accent: 0xff5a6a },
    head(top) {
      const fixed = new PartBuilder(), spin = new PartBuilder();
      fixed.cyl('s', .12, .16, .12, 8, COL.stoneDark, [0, top + .06, 0]);
      fixed.cone('m', .07, .55, 6, COL.steel, [0, top + .4, 0]);
      fixed.ring('m', .09, .018, COL.gold, [0, top + .14, 0], [Math.PI / 2, 0, 0]);
      fixed.gem('g', .045, 0xff3048, [0, top + .2, 0], [1, 1.5, 1]);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, x = Math.sin(a) * .22, z = Math.cos(a) * .22;
        spin.box('m', .028, .2, .01, COL.steel, [x, 0, z], [0, a, -.3]);
        spin.box('m', .08, .016, .022, COL.gold, [x * .82, -.1, z * .82], [0, a, -.3]);
        spin.cyl('s', .012, .012, .06, 5, COL.leather, [x * .76, -.14, z * .76], [0, a, -.3]);
      }
      return { fixed, spin, spinPivot: top + .32, spinSpeed: 2.2 };
    }
  },
  whip: {
    base: { shape: 'square', r: .32, h: .58, accent: 0xffc27a, merlons: 8, banner: 0x4a2a14 },
    head(top) {
      const aim = new PartBuilder(), arm = new PartBuilder();
      aim.cyl('s', .14, .17, .1, 8, COL.stoneDark, [0, .05, 0]);
      aim.cyl('m', .045, .05, .34, 6, COL.iron, [0, .27, 0]);
      aim.ball('m', .06, COL.gold, [0, .45, 0]);
      // The arm reaches forward from the post; the chain hangs off its tip.
      arm.box('m', .05, .05, .42, COL.iron, [0, 0, .2]);
      arm.box('s', .06, .06, .1, COL.leather, [0, 0, .05]);
      for (let i = 0; i < 5; i++) arm.ring('m', .028, .009, COL.steel, [0, -.04 - i * .05, .4], [0, i % 2 ? Math.PI / 2 : 0, 0], 8);
      arm.ball('m', .075, COL.iron, [0, -.32, .4]);
      for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) arm.cone('m', .022, .07, 4, COL.steel, [x * .08, -.32 + y * .08, .4 + z * .08], [z ? Math.PI / 2 * z : 0, 0, x ? -Math.PI / 2 * x : (y < 0 ? Math.PI : 0)]);
      return { aim, pivot: top, arm, armPivot: .45, swing: .9 };
    }
  },
  axe: {
    base: { shape: 'oct', r: .32, h: .6, accent: 0xff7a4a },
    head(top) {
      const aim = new PartBuilder(), arm = new PartBuilder();
      aim.cyl('s', .17, .2, .1, 8, COL.stoneDark, [0, .05, 0]);
      aim.box('m', .2, .14, .14, COL.iron, [0, .17, -.04]);
      aim.cyl('m', .065, .065, .26, 10, COL.gold, [0, .19, -.04], [0, 0, Math.PI / 2]);
      // Arm: crimson-wrapped haft rising forward to a double axe head.
      arm.box('s', .06, .06, .5, COL.wood, [0, .1, .2], [-.45, 0, 0]);
      arm.box('s', .07, .07, .14, COL.crimson, [0, .03, .07], [-.45, 0, 0]);
      const hx = 0, hy = .32, hz = .42;
      // Double-bit head in the swing plane: one crescent forward, one back.
      arm.half('m', .16, .024, COL.steel, [hx, hy, hz + .03], [0, 0, Math.PI / 2], -Math.PI / 2);
      arm.half('m', .11, .024, COL.steel, [hx, hy, hz - .03], [0, 0, Math.PI / 2], Math.PI / 2);
      arm.box('m', .07, .09, .09, COL.gold, [hx, hy, hz]);
      arm.cone('m', .03, .14, 4, COL.gold, [hx, hy + .12, hz]);
      return { aim, pivot: top, arm, armPivot: .19, swing: 1.1 };
    }
  },
  cross: {
    base: { shape: 'round', r: .3, h: .55, accent: 0xffe18b, banner: 0x5e4610 },
    head(top) {
      const fixed = new PartBuilder(), float = new PartBuilder(), spin = new PartBuilder();
      fixed.cyl('s', .14, .19, .12, 12, COL.stoneLight, [0, top + .06, 0]);
      fixed.cyl('m', .15, .15, .02, 12, COL.gold, [0, top + .13, 0]);
      float.box('m', .075, .52, .075, COL.gold, [0, 0, 0]);
      float.box('m', .32, .075, .075, COL.gold, [0, .1, 0]);
      float.box('g', .03, .46, .09, 0xfff2b0, [0, 0, 0]);
      float.box('g', .27, .03, .09, 0xfff2b0, [0, .1, 0]);
      float.gem('g', .045, 0xffffff, [0, .1, .05]);
      spin.ring('g', .26, .012, 0xffe18b, [0, 0, 0], [Math.PI / 2, 0, 0], 32);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; spin.gem('g', .03, 0xfff2b0, [Math.sin(a) * .26, 0, Math.cos(a) * .26]); }
      return { fixed, float, floatPivot: top + .45, spin, spinPivot: top + .5, spinSpeed: .8 };
    }
  },
  clock: {
    headScale: 1.1,
    base: { shape: 'square', r: .3, h: .78, accent: 0xb98cff, merlons: 4, banner: 0x3a1d5a },
    head(top) {
      const fixed = new PartBuilder(), hands = new PartBuilder();
      fixed.box('s', .44, .36, .44, COL.stone, [0, top + .2, 0]);
      fixed.box('m', .47, .03, .47, COL.gold, [0, top + .03, 0]);
      fixed.box('m', .47, .03, .47, COL.gold, [0, top + .37, 0]);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, x = Math.sin(a) * .225, z = Math.cos(a) * .225;
        fixed.cyl('g', .14, .14, .012, 16, 0xe9dcff, [x, top + .2, z], [Math.PI / 2, a, 0, 'YXZ']);
        fixed.ring('m', .145, .014, COL.gold, [x * 1.02, top + .2, z * 1.02], [0, a, 0], 20);
      }
      fixed.cone('s', .36, .34, 4, COL.slate, [0, top + .55, 0], [0, Math.PI / 4, 0]);
      fixed.cone('m', .07, .09, 8, COL.gold, [0, top + .47, 0], [Math.PI, 0, 0]);
      fixed.cone('m', .018, .16, 4, COL.gold, [0, top + .78, 0]);
      fixed.ball('m', .03, COL.gold, [0, top + .73, 0]);
      // One pair of hands on each face, spun together around Y would look wrong,
      // so the hands spin in the face plane: the front face's hands only.
      hands.box('m', .018, .11, .01, 0x2a1a3a, [0, .05, 0]);
      hands.box('m', .014, .075, .01, 0x2a1a3a, [0, .03, 0], [0, 0, 1.2]);
      return { fixed, face: hands, facePivot: [0, top + .2, .238], faceSpeed: 1.4 };
    }
  },
  bone: {
    base: { shape: 'round', r: .3, h: .28, accent: 0x9aff6a, merlons: 10, emblem: false, banner: 0x26361a },
    head(top) {
      const fixed = new PartBuilder(), spin = new PartBuilder();
      for (let i = 0; i < 5; i++) {
        const y = top + .05 + i * .095;
        fixed.cyl('s', .1 - i * .006, .115 - i * .006, .06, 8, COL.bone, [0, y, 0]);
        fixed.box('s', .26 - i * .02, .02, .03, COL.boneDark, [0, y + .01, 0], [0, i * .6, 0]);
        fixed.ball('s', .06, COL.boneDark, [0, y + .045, 0], [1, .5, 1]);
      }
      const sy = top + .6;
      fixed.ball('s', .135, COL.bone, [0, sy, 0], [1, .95, 1.05], 10, 8);
      fixed.box('s', .16, .06, .12, COL.bone, [0, sy - .12, .035]);
      fixed.ball('g', .03, 0x8aff5a, [-.05, sy + .01, .11]);
      fixed.ball('g', .03, 0x8aff5a, [.05, sy + .01, .11]);
      fixed.box('s', .03, .03, .02, COL.boneDark, [0, sy - .05, .13], [0, 0, Math.PI / 4]);
      for (const s of [-1, 1]) fixed.cone('s', .035, .2, 6, COL.bone, [s * .14, sy + .1, -.02], [0, 0, -s * .7]);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; spin.ball('g', .03, 0x9aff6a, [Math.sin(a) * .3, Math.sin(i * 2) * .08, Math.cos(a) * .3]); }
      return { fixed, spin, spinPivot: top + .3, spinSpeed: 1.3 };
    }
  },
  familiar: {
    base: { shape: 'oct', r: .3, h: .55, accent: 0xb98cff, banner: 0x341a48 },
    head(top) {
      const fixed = new PartBuilder(), bat = new PartBuilder(), wingL = new PartBuilder(), wingR = new PartBuilder();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; fixed.box('s', .05, .3, .05, COL.stone, [Math.sin(a) * .2, top + .15, Math.cos(a) * .2]); }
      fixed.box('m', .48, .03, .48, COL.gold, [0, top + .31, 0], [0, 0, 0]);
      fixed.cone('s', .31, .3, 4, COL.slate, [0, top + .47, 0], [0, Math.PI / 4, 0]);
      fixed.cone('m', .018, .14, 4, COL.gold, [0, top + .68, 0]);
      fixed.box('m', .3, .02, .02, COL.goldDark, [0, top + .1, 0]);
      fixed.ball('g', .07, 0xc08cff, [0, top + .2, 0]);
      // The familiar itself perches above the roost.
      bat.ball('s', .07, 0x2a2036, [0, 0, 0], [1, 1.15, .9]);
      bat.ball('s', .05, 0x2a2036, [0, .09, .02]);
      bat.cone('s', .02, .05, 4, 0x2a2036, [-.03, .14, .02]);
      bat.cone('s', .02, .05, 4, 0x2a2036, [.03, .14, .02]);
      bat.ball('g', .012, 0xff5a7a, [-.018, .1, .065]);
      bat.ball('g', .012, 0xff5a7a, [.018, .1, .065]);
      wingL.box('s', .2, .012, .12, 0x3a2a4a, [-.1, 0, 0], [0, 0, 0]);
      wingL.cone('s', .06, .1, 3, 0x3a2a4a, [-.2, 0, -.03], [0, 0, Math.PI / 2], [1, 1, .2]);
      wingR.box('s', .2, .012, .12, 0x3a2a4a, [.1, 0, 0]);
      wingR.cone('s', .06, .1, 3, 0x3a2a4a, [.2, 0, -.03], [0, 0, -Math.PI / 2], [1, 1, .2]);
      return { fixed, float: bat, floatPivot: [0, top + .4, .3], wings: [wingL, wingR] };
    }
  },
  silver: {
    base: { shape: 'square', r: .34, h: .48, accent: 0xcfe6ff, banner: 0x22344c },
    head(top) {
      const aim = new PartBuilder(), barrel = new PartBuilder();
      aim.cyl('s', .2, .23, .08, 10, COL.stoneDark, [0, .04, 0]);
      aim.box('s', .26, .1, .3, COL.woodDark, [0, .13, -.02]);
      for (const s of [-1, 1]) { aim.cyl('s', .09, .09, .04, 10, COL.wood, [s * .15, .11, -.02], [0, 0, Math.PI / 2]); aim.ring('m', .09, .012, COL.iron, [s * .17, .11, -.02], [0, Math.PI / 2, 0], 12); }
      barrel.cyl('m', .07, .095, .5, 12, COL.silver, [0, 0, .12], [Math.PI / 2, 0, 0]);
      barrel.ring('m', .085, .018, COL.gold, [0, 0, .36], [0, 0, 0], 14);
      barrel.ring('m', .1, .018, COL.gold, [0, 0, -.08], [0, 0, 0], 14);
      barrel.ball('m', .1, COL.silver, [0, 0, -.13]);
      barrel.cyl('g', .045, .045, .02, 10, 0xffe9b0, [0, 0, .375], [Math.PI / 2, 0, 0]);
      return { aim, pivot: top, barrel, barrelPivot: [0, .22, 0], recoilDistance: .9 };
    }
  },
  rosary: {
    base: { shape: 'round', r: .29, h: .45, accent: 0xffc8a0, banner: 0x5a2030 },
    head(top) {
      const fixed = new PartBuilder(), spin = new PartBuilder();
      fixed.box('s', .26, .24, .26, COL.stoneLight, [0, top + .12, 0]);
      fixed.box('g', .06, .12, .02, 0xffd6a0, [0, top + .12, .135]);
      fixed.cone('s', .22, .2, 4, COL.slate, [0, top + .34, 0], [0, Math.PI / 4, 0]);
      fixed.box('m', .025, .16, .025, COL.gold, [0, top + .52, 0]);
      fixed.box('m', .1, .025, .025, COL.gold, [0, top + .55, 0]);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2;
        spin.ball(i % 7 === 0 ? 'm' : 'g', i % 7 === 0 ? .032 : .022, i % 7 === 0 ? COL.gold : 0xffd8c0, [Math.sin(a) * .3, 0, Math.cos(a) * .3]);
      }
      spin.box('m', .03, .1, .015, COL.gold, [0, -.07, .3]);
      return { fixed, spin, spinPivot: top + .18, spinSpeed: .9, spinTilt: .35 };
    }
  },
  garlic: {
    base: { shape: 'round', r: .3, h: .48, accent: 0xd9efad, banner: 0x34441e },
    head(top) {
      const fixed = new PartBuilder(), aura = new PartBuilder();
      fixed.cyl('s', .17, .2, .08, 12, COL.stoneLight, [0, top + .04, 0]);
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; fixed.ball('s', .1, 0xeee6cf, [Math.sin(a) * .1, top + .22, Math.cos(a) * .1], [.8, 1.25, .8], 8, 8); }
      fixed.ball('s', .14, 0xf4eedc, [0, top + .22, 0], [1, 1.15, 1], 10, 8);
      fixed.cone('s', .05, .16, 6, 0xd8d0b0, [0, top + .42, 0]);
      fixed.cone('s', .022, .12, 5, 0x6a8a3a, [0, top + .55, 0]);
      // Hanging braids at the battlement corners.
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(a) * .29, z = Math.cos(a) * .29;
        for (let k = 0; k < 3; k++) fixed.ball('s', .035, 0xece4cc, [x, top - .06 - k * .07, z], [1, 1.2, 1]);
      }
      aura.ring('g', .36, .014, 0xd9efad, [0, 0, 0], [Math.PI / 2, 0, 0], 36);
      return { fixed, pulse: aura, pulsePivot: top - .02 };
    }
  },
  scripture: {
    base: { shape: 'oct', r: .32, h: .5, accent: 0xffe58a, banner: 0x5a3a10 },
    head(top, o) {
      const fixed = new PartBuilder(), spin = new PartBuilder(), float = new PartBuilder();
      fixed.cyl('s', .05, .08, .22, 6, COL.wood, [0, top + .11, 0]);
      fixed.box('s', .26, .03, .2, COL.wood, [0, top + .24, 0], [-.35, 0, 0]);
      fixed.box('s', .11, .02, .17, COL.parchment, [-.06, top + .265, 0], [-.35, 0, .12]);
      fixed.box('s', .11, .02, .17, COL.parchment, [.06, top + .265, 0], [-.35, 0, -.12]);
      fixed.box('g', .2, .005, .14, 0xfff0b0, [0, top + .28, 0], [-.35, 0, 0]);
      float.gem('g', .04, 0xfff0b0, [0, 0, 0], [1, 1.4, 1]);
      const books = Math.max(1, Math.min(6, o.level || 1));
      for (let i = 0; i < books; i++) {
        const a = i / books * Math.PI * 2;
        const x = Math.sin(a) * .32, z = Math.cos(a) * .32;
        spin.box('s', .12, .16, .05, 0x5a2416, [x, 0, z], [0, a, 0]);
        spin.box('s', .1, .14, .052, COL.parchment, [x + Math.sin(a) * .005, 0, z + Math.cos(a) * .005], [0, a, 0], [1, 1, .95]);
        spin.box('m', .02, .08, .056, COL.gold, [x, 0, z], [0, a, 0]);
        spin.box('m', .06, .02, .056, COL.gold, [x, .015, z], [0, a, 0]);
      }
      return { fixed, float, floatPivot: top + .42, spin, spinPivot: top + .3, spinSpeed: 1 };
    }
  },
  crossbow: {
    base: { shape: 'square', r: .32, h: .62, accent: 0xffd08a, banner: 0x3a2a1a },
    head(top) {
      const aim = new PartBuilder(), bolt = new PartBuilder();
      aim.cyl('s', .16, .19, .08, 8, COL.stoneDark, [0, .04, 0]);
      aim.cyl('m', .05, .06, .12, 6, COL.iron, [0, .14, 0]);
      aim.box('s', .08, .07, .46, COL.wood, [0, .22, .06]);
      aim.box('m', .1, .05, .06, COL.gold, [0, .22, -.15]);
      for (const s of [-1, 1]) {
        aim.box('m', .26, .035, .04, COL.iron, [s * .14, .23, .25], [0, s * .45, 0]);
        aim.cone('m', .018, .06, 4, COL.gold, [s * .27, .23, .19], [0, 0, s * Math.PI / 2]);
      }
      aim.box('s', .5, .008, .008, 0x1a1410, [0, .24, .18]);
      bolt.cyl('m', .014, .014, .36, 5, COL.silver, [0, 0, .1], [Math.PI / 2, 0, 0]);
      bolt.cone('m', .03, .07, 4, COL.steel, [0, 0, .31], [Math.PI / 2, 0, 0]);
      return { aim, pivot: top, barrel: bolt, barrelPivot: [0, .25, 0], recoilDistance: -1.4 };
    }
  },
  ballista: {
    base: { shape: 'oct', r: .38, h: .4, accent: 0xffa86a, banner: 0x5a2a10 },
    head(top) {
      const aim = new PartBuilder(), bolt = new PartBuilder();
      aim.cyl('s', .26, .29, .08, 10, COL.stoneDark, [0, .04, 0]);
      aim.cyl('m', .24, .24, .03, 16, COL.goldDark, [0, .09, 0]);
      aim.box('s', .14, .1, .62, COL.woodDark, [0, .17, .04], [-.12, 0, 0]);
      for (const s of [-1, 1]) {
        aim.box('s', .36, .06, .06, COL.wood, [s * .2, .22, .26], [0, s * .35, .1 * s]);
        aim.box('m', .07, .14, .07, COL.iron, [s * .08, .22, .22]);
        aim.cone('m', .025, .08, 4, COL.gold, [s * .38, .24, .2], [0, 0, -s * Math.PI / 2]);
      }
      aim.box('s', .7, .01, .01, 0x1a1410, [0, .24, .14]);
      bolt.cyl('s', .025, .025, .56, 6, COL.wood, [0, 0, .12], [Math.PI / 2, 0, 0]);
      bolt.cone('m', .05, .13, 4, COL.steel, [0, 0, .46], [Math.PI / 2, 0, 0]);
      bolt.box('s', .08, .004, .06, COL.crimson, [0, 0, -.12]);
      return { aim, pivot: top, barrel: bolt, barrelPivot: [0, .26, 0], recoilDistance: -1.6 };
    }
  },
  holy: {
    base: { shape: 'oct', r: .3, h: .7, accent: 0x8edcff, stained: true, banner: 0x1e3a6a },
    head(top) {
      const fixed = new PartBuilder(), float = new PartBuilder(), spin = new PartBuilder();
      fixed.cone('s', .27, .42, 8, COL.slate, [0, top + .21, 0], [0, Math.PI / 8, 0]);
      fixed.cyl('m', .2, .2, .02, 8, COL.gold, [0, top + .02, 0], [0, Math.PI / 8, 0]);
      fixed.box('m', .025, .18, .025, COL.gold, [0, top + .5, 0]);
      fixed.box('m', .1, .025, .025, COL.gold, [0, top + .54, 0]);
      float.ball('g', .085, 0x9fe8ff, [0, 0, 0], [1, 1, 1], 12, 10);
      float.ball('g', .045, 0xe8fbff, [0, 0, 0]);
      spin.ring('g', .17, .01, 0x8edcff, [0, 0, 0], [Math.PI / 2 - .3, 0, 0], 28);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; spin.ball('g', .022, 0xcff6ff, [Math.sin(a) * .17, Math.cos(a) * .05, Math.cos(a) * .17]); }
      return { fixed, float, floatPivot: top + .64, spin, spinPivot: top + .64, spinSpeed: 1.6 };
    }
  },
  arcane: {
    base: { shape: 'square', r: .27, h: .82, accent: 0xb98cff, banner: 0x3a1a5a },
    head(top) {
      const fixed = new PartBuilder(), float = new PartBuilder(), spin = new PartBuilder();
      fixed.cone('s', .23, .3, 4, COL.stoneDark, [0, top + .15, 0], [0, Math.PI / 4, 0]);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; fixed.box('g', .025, .2, .02, 0xc08cff, [Math.sin(a) * .1, top + .1, Math.cos(a) * .1], [0, a, 0], [1, 1, 1]); }
      float.gem('g', .1, 0xc79bff, [0, 0, 0], [1, 1.7, 1]);
      float.gem('g', .05, 0xffffff, [0, 0, 0], [1, 1.7, 1]);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; spin.gem('g', .04, 0x9a6aff, [Math.sin(a) * .24, (i - 1) * .05, Math.cos(a) * .24], [.6, 1.6, .6]); }
      return { fixed, float, floatPivot: top + .52, spin, spinPivot: top + .5, spinSpeed: 1.8, floatSpin: 1.2 };
    }
  },
  freeze: {
    base: { shape: 'round', r: .26, h: .3, accent: 0x9fe8ff, banner: 0x1e3a6a },
    head(top) {
      const fixed = new PartBuilder(), float = new PartBuilder(), spin = new PartBuilder();
      fixed.cyl('s', .12, .16, .08, 12, COL.stoneLight, [0, top + .04, 0]);
      float.cone('g', .1, .16, 10, 0xbff4ff, [0, .08, 0], [Math.PI, 0, 0]);
      float.cone('g', .1, .16, 10, 0xbff4ff, [0, -.08, 0]);
      float.cyl('m', .12, .12, .02, 10, COL.gold, [0, .17, 0]);
      float.cyl('m', .12, .12, .02, 10, COL.gold, [0, -.17, 0]);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; float.box('m', .015, .34, .015, COL.gold, [Math.sin(a) * .11, 0, Math.cos(a) * .11]); }
      spin.ring('g', .25, .012, 0x9fe8ff, [0, 0, 0], [Math.PI / 2, 0, 0], 32);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spin.box('g', .04, .01, .04, 0xdffbff, [Math.sin(a) * .25, 0, Math.cos(a) * .25], [0, a + Math.PI / 4, 0]); }
      return { fixed, float, floatPivot: top + .36, floatSpin: .7, spin, spinPivot: top + .12, spinSpeed: -.9 };
    }
  },
  guardian: {
    base: { shape: 'square', r: .26, h: .3, accent: 0xffd27a },
    head(top) {
      const fixed = new PartBuilder(), spin = new PartBuilder();
      for (const s of [-1, 1]) {
        fixed.box('m', .03, .4, .012, COL.steel, [s * .06, top + .22, -.04], [0, 0, s * .45]);
        fixed.box('m', .11, .02, .03, COL.gold, [s * .02, top + .07, -.04], [0, 0, s * .45]);
      }
      fixed.cyl('s', .15, .15, .04, 12, COL.crimson, [0, top + .2, .03], [Math.PI / 2, 0, 0], [1, 1, 1.25]);
      fixed.ring('m', .15, .018, COL.gold, [0, top + .2, .055], [0, 0, 0], 18);
      fixed.box('m', .03, .16, .02, COL.gold, [0, top + .2, .06]);
      fixed.box('m', .11, .03, .02, COL.gold, [0, top + .23, .06]);
      spin.ring('g', .3, .012, 0xffd27a, [0, 0, 0], [Math.PI / 2, 0, 0], 32);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; spin.box('g', .05, .05, .01, 0xfff0c0, [Math.sin(a) * .3, 0, Math.cos(a) * .3], [0, a, Math.PI / 4]); }
      return { fixed, spin, spinPivot: top + .06, spinSpeed: .6 };
    }
  },
  generic: {
    base: { shape: 'oct', r: .3, h: .55 },
    head(top, o) {
      const fixed = new PartBuilder(), float = new PartBuilder();
      fixed.cone('s', .25, .3, 8, COL.slate, [0, top + .15, 0], [0, Math.PI / 8, 0]);
      float.gem('g', .08, o.accent || 0xffd08a, [0, 0, 0], [1, 1.5, 1]);
      return { fixed, float, floatPivot: top + .5 };
    }
  }
};
const SUPPORT_IDS = new Set(['freeze', 'guardian']);

// ---------------------------------------------------------------------------
// Factory: caches baked geometry per (type, level band, elite) and hands out
// animated instances.
// ---------------------------------------------------------------------------
export function createTowerFactory({ glowTexture } = {}) {
  const materials = {
    stone: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .86, metalness: 0 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .38, metalness: .35 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  };
  const cache = new Map();

  function levelBand(level) { return Math.max(1, Math.min(5, Math.floor(level) || 1)); }

  function blueprint(id, level, elite, support) {
    const kind = HEADS[id] ? id : 'generic';
    const band = levelBand(level);
    const key = `${kind}|${band}|${elite ? 1 : 0}|${support ? 1 : 0}|${kind === 'scripture' ? band : ''}`;
    if (cache.has(key)) return cache.get(key);
    seed = [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const def = HEADS[kind];
    const base = new PartBuilder();
    const top = gothicBase(base, { ...def.base, h: (def.base.h ?? .6) * .8, level: band, elite });
    const head = def.head(top, { level: band, accent: def.base.accent });
    const headScale = def.headScale ?? 1.4;
    // The fixed part of the head never moves, so it is merged into the base
    // (scaled about the battlement top) to save draw calls.
    if (head.fixed) {
      const toHead = new THREE.Matrix4().makeTranslation(0, top, 0).multiply(new THREE.Matrix4().makeScale(headScale, headScale, headScale)).multiply(new THREE.Matrix4().makeTranslation(0, -top, 0));
      for (const list of ['stone', 'metal', 'glow']) for (const part of head.fixed.lists[list]) base.lists[list].push({ ...part, matrix: toHead.clone().multiply(part.matrix) });
    }
    const fixedBounds = head.fixed ? bake(head.fixed) : null;
    const baked = { base: bake(base), top, groups: {}, headScale };
    for (const name of ['aim', 'arm', 'spin', 'float', 'barrel', 'face', 'pulse']) if (head[name]) baked.groups[name] = bake(head[name]);
    if (head.wings) baked.groups.wings = head.wings.map(bake);
    // Upper levels: orbiting runes (4+) and a halo (5); elite: a floating crown.
    if (band >= 4) {
      const runes = new PartBuilder();
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; runes.box('g', .05, .07, .012, def.base.accent || 0xffd08a, [Math.sin(a) * .5, 0, Math.cos(a) * .5], [0, a, 0]); }
      baked.groups.runes = bake(runes);
    }
    if (band >= 5 || elite) {
      const crown = new PartBuilder();
      if (band >= 5) crown.ring('g', .2, .012, 0xfff0b0, [0, 0, 0], [Math.PI / 2, 0, 0], 28);
      if (elite) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; crown.cone('m', .025, .08, 4, COL.gold, [Math.sin(a) * .13, .04, Math.cos(a) * .13]); crown.ring('m', .13, .012, COL.gold, [0, 0, 0], [Math.PI / 2, 0, 0], 18); }
      baked.groups.crown = bake(crown);
    }
    baked.spec = head;
    // Highest point of the head (unscaled, absolute) so a crown can float above it.
    const py = p => Array.isArray(p) ? p[1] : p;
    const maxY = (g, offset) => Math.max(-Infinity, ...['stone', 'metal', 'glow'].map(k => { const geo = g?.[k]; if (!geo) return -Infinity; geo.computeBoundingBox(); return geo.boundingBox.max.y + offset; }));
    baked.headMax = Math.max(top + .2, maxY(fixedBounds, 0), maxY(baked.groups.float, py(head.floatPivot) ?? 0), maxY(baked.groups.spin, py(head.spinPivot) ?? 0), maxY(baked.groups.aim, py(head.pivot) ?? top), maxY(baked.groups.arm, (py(head.pivot) ?? top) + (py(head.armPivot) ?? 0) - .1), maxY(baked.groups.barrel, (py(head.pivot) ?? top) + (py(head.barrelPivot) ?? 0)));
    if (fixedBounds) for (const k of ['stone', 'metal', 'glow']) fixedBounds[k]?.dispose();
    baked.scale = support || SUPPORT_IDS.has(kind) ? .82 : 1;
    cache.set(key, baked);
    return baked;
  }

  function meshesFor(bakedGroup, castShadow) {
    const g = new THREE.Group();
    for (const list of ['stone', 'metal', 'glow']) {
      const geometry = bakedGroup[list];
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, materials[list]);
      mesh.castShadow = castShadow && list !== 'glow';
      mesh.receiveShadow = list !== 'glow';
      g.add(mesh);
    }
    return g;
  }

  function create({ id, level = 1, elite = false, support = false, shadows = true }) {
    const bp = blueprint(id, level, elite, support);
    const spec = bp.spec;
    const root = new THREE.Group();
    root.scale.setScalar(bp.scale);
    root.add(meshesFor(bp.base, shadows));
    const nodes = {};
    // Heads carry each tower's identity, so they are drawn larger than life
    // around the battlement top; pivots in the specs are absolute heights.
    const top = bp.top, hs = bp.headScale;
    const headRoot = new THREE.Group(); headRoot.position.y = top; headRoot.scale.setScalar(hs); root.add(headRoot);
    const at = (group, p) => { if (Array.isArray(p)) group.position.set(p[0], p[1] - top, p[2]); else group.position.set(0, (p ?? top) - top, 0); return group; };
    if (bp.groups.aim) {
      nodes.aim = at(meshesFor(bp.groups.aim, shadows), spec.pivot ?? top);
      headRoot.add(nodes.aim);
      const rel = (group, p) => { if (Array.isArray(p)) group.position.set(p[0], p[1], p[2]); else group.position.set(0, p || 0, 0); return group; };
      if (bp.groups.arm) { nodes.arm = rel(meshesFor(bp.groups.arm, shadows), spec.armPivot); nodes.aim.add(nodes.arm); }
      if (bp.groups.barrel) { nodes.barrel = rel(meshesFor(bp.groups.barrel, shadows), spec.barrelPivot); nodes.aim.add(nodes.barrel); nodes.barrelRest = nodes.barrel.position.z; }
    }
    if (bp.groups.spin) { nodes.spin = at(meshesFor(bp.groups.spin, false), spec.spinPivot); if (spec.spinTilt) nodes.spin.rotation.x = spec.spinTilt; headRoot.add(nodes.spin); }
    if (bp.groups.float) { nodes.float = at(meshesFor(bp.groups.float, shadows), spec.floatPivot); nodes.floatRest = nodes.float.position.y; headRoot.add(nodes.float); }
    if (bp.groups.face) { nodes.face = at(meshesFor(bp.groups.face, false), spec.facePivot); headRoot.add(nodes.face); }
    if (bp.groups.pulse) { nodes.pulse = at(meshesFor(bp.groups.pulse, false), spec.pulsePivot); headRoot.add(nodes.pulse); }
    if (bp.groups.wings && nodes.float) { nodes.wings = bp.groups.wings.map(w => { const g = meshesFor(w, false); nodes.float.add(g); return g; }); }
    const headTop = top + (bp.headMax - top) * hs + .06;
    if (bp.groups.runes) { nodes.runes = meshesFor(bp.groups.runes, false); nodes.runes.position.y = top * .55; root.add(nodes.runes); }
    if (bp.groups.crown) { nodes.crown = meshesFor(bp.groups.crown, false); nodes.crown.position.y = headTop; root.add(nodes.crown); }
    // Muzzle / pulse flash: one additive sprite per tower.
    if (glowTexture) {
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: HEADS[id]?.base?.accent ?? 0xffd08a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      flash.scale.setScalar(.7);
      flash.position.set(0, top + .35 * hs, 0);
      root.add(flash);
      nodes.flash = flash;
    }
    const phase = Math.random() * Math.PI * 2;
    let yaw = Math.PI, recoilKick = 0;

    function update(state, dt, time) {
      const rec = Math.max(0, Math.min(1, (state.recoil || 0) / .13));
      const fl = Math.max(0, Math.min(1, (state.flash || 0) / .1));
      if (nodes.aim && (state.aimX || state.aimZ)) {
        const want = Math.atan2(state.aimX, state.aimZ);
        let d = want - yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        yaw += d * Math.min(1, dt * 9);
        nodes.aim.rotation.y = yaw;
      } else if (nodes.aim) nodes.aim.rotation.y = yaw;
      if (nodes.arm) nodes.arm.rotation.x = (spec.swing || 1) * (rec > 0 ? Math.sin(rec * Math.PI) : 0) - .15 * Math.sin(time * 1.4 + phase) * .2;
      if (nodes.barrel) nodes.barrel.position.z = nodes.barrelRest - rec * .12 * (spec.recoilDistance || 1);
      if (nodes.spin) nodes.spin.rotation.y += dt * (spec.spinSpeed || 1) * (1 + fl * 4);
      if (nodes.float) {
        nodes.float.position.y = nodes.floatRest + Math.sin(time * 2 + phase) * .035;
        if (spec.floatSpin) nodes.float.rotation.y += dt * spec.floatSpin;
      }
      if (nodes.face) nodes.face.rotation.z = -time * (spec.faceSpeed || 1);
      if (nodes.pulse) { const s = 1 + .08 * Math.sin(time * 3 + phase) + fl * .25; nodes.pulse.scale.set(s, 1, s); }
      if (nodes.wings) { const f = Math.sin(time * 11 + phase) * .55; nodes.wings[0].rotation.z = f; nodes.wings[1].rotation.z = -f; }
      if (nodes.runes) nodes.runes.rotation.y -= dt * .6;
      if (nodes.crown) { nodes.crown.rotation.y += dt * .8; nodes.crown.position.y = headTop + Math.sin(time * 1.6 + phase) * .02; }
      recoilKick = Math.max(fl, recoilKick - dt * 6);
      if (nodes.flash) { nodes.flash.material.opacity = Math.min(.9, recoilKick * .9); nodes.flash.scale.setScalar(.45 + recoilKick * .5); }
      // Afflictions from boss powers: a stunned tower droops, a rotting one greys.
      root.rotation.z = state.stunned ? Math.sin(time * 9) * .04 : 0;
    }

    function dispose() { if (nodes.flash) nodes.flash.material.dispose(); }
    return { root, update, dispose, key: `${id}|${levelBand(level)}|${elite ? 1 : 0}|${support ? 1 : 0}` };
  }

  function dispose() {
    for (const bp of cache.values()) {
      const all = [bp.base, ...Object.values(bp.groups).flat()];
      for (const g of all) for (const list of ['stone', 'metal', 'glow']) g?.[list]?.dispose();
    }
    cache.clear();
    Object.values(materials).forEach(m => m.dispose());
  }

  return { create, dispose, ids: Object.keys(HEADS).filter(id => id !== 'generic') };
}
