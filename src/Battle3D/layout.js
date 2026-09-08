// The keep-at-centre arena in sim terms: road plans, breach schedule, tile
// heights and the tile <-> world mapping shared with the Blender generator.
//
// Everything here derives from assets/battlefield3d/keep_arena.layout.json,
// which tools/blender/build_battlefield.py writes next to the GLB. The road
// table lives in that script; this module only reads it, so a road change is
// a re-export, never a second copy of the tiles.
//
// Coordinate contract: sim tile (x, y) -> glTF (x + .5, height, y + .5).
// 1 tile = 1 world unit; tile y grows toward the south gate, world +Z.

import layoutData from '../../assets/battlefield3d/keep_arena.layout.json';

export const KEEP_LAYOUT = layoutData;
export const KEEP_ROAD_ORDER = Object.freeze(['south', 'west', 'north', 'east']);
export const KEEP_CENTER = Object.freeze({ x: layoutData.keep.center[0], y: layoutData.keep.center[1] });
export const KEEP_TILES = Object.freeze(layoutData.keep.tiles.map(([x, y]) => ({ x, y })));

const BREACH_LABELS = ['WEST GATE BREACHED', 'NORTH GATE BREACHED', 'EAST GATE BREACHED'];

// The cathedral road grows to 23 tiles by mid-chapter; the keep's roads stay
// 16-18 and the next-wave call is locked on fewer waves, so enemies reached
// the door about 30% sooner in the Stage C bot runs and chapters 2-3 fell.
// Walking speed is the one lever that scales every enemy and every road the
// same way; this brings travel time back to the cathedral board's.
export const KEEP_LAYOUT_TUNING = Object.freeze({ enemySpeed: .82 });

// Completed-wave numbers at which the sealed gates fall, by campaign stage.
// Mirrors the cathedral board's front count: one road through chapter 4 (a
// single breach in the last three waves as the finale twist), two fronts
// from chapter 5, three from chapter 11. The Stage C bot lost every chapter
// 2-3 run when the first breach came at wave 4 - a second front that early
// doubles the road a starting deck must cover.
export function breachWavesForStage(stage = 1) {
  const n = Math.max(1, Number(stage) || 1);
  if (n === 1) return [5];
  if (n === 2) return [7];
  if (n === 3) return [9];
  if (n === 4) return [11];
  if (n <= 10) return [4, 8];
  return [2, 5, 8];
}

// Same return shape as authoredRoadPlans() in roadRegistry.js so game.js can
// swap one for the other. Plans are stored door-first (the keep end) and gate
// last (the spawn end), the convention the cathedral routes already use:
// route.at(-1) is the outer end and routePoints() reverses toward the keep.
export function keepRoadPlans(stage = 1) {
  const plans = KEEP_ROAD_ORDER.map(name => [...KEEP_LAYOUT.roads[name].tiles].reverse().map(([x, y]) => ({ x, y })));
  const events = breachWavesForStage(stage).map((wave, i) => ({ wave, type: 'OPEN_ROUTE', routeIndex: i + 1, count: 99, label: BREACH_LABELS[i] }))
    .filter(event => event.routeIndex < plans.length);
  return { pattern: 'keep-siege', layout: 'keep', plans, initialLength: plans[0].length, events };
}

// Where a route's enemies appear: one tile beyond the gate, continuing the
// road's last step so they walk in through the arch.
export function routeSpawnPoint(route) {
  const outer = route.at(-1), prev = route.at(-2) || outer;
  const dx = Math.sign(outer.x - prev.x), dy = Math.sign(outer.y - prev.y);
  return { x: outer.x + .5 + dx * 1.2, y: outer.y + .5 + dy * 1.2 };
}

// Where a route's enemies stop and attack: the keep's face beyond the door
// tile, so they stand against the wall rather than inside it.
export function routeTargetPoint(route) {
  const door = route[0];
  const dx = KEEP_CENTER.x - (door.x + .5), dy = KEEP_CENTER.y - (door.y + .5);
  const axisX = Math.abs(dx) >= Math.abs(dy);
  return { x: door.x + .5 + (axisX ? Math.sign(dx) * .55 : 0), y: door.y + .5 + (axisX ? 0 : Math.sign(dy) * .55) };
}

const heightCache = new Map();
export function tileHeight(x, y) {
  const tx = Math.max(0, Math.min(KEEP_LAYOUT.grid.cols - 1, Math.floor(x))), ty = Math.max(0, Math.min(KEEP_LAYOUT.grid.rows - 1, Math.floor(y)));
  const key = `${tx},${ty}`;
  if (!heightCache.has(key)) heightCache.set(key, Number(KEEP_LAYOUT.heights[key]) || 0);
  return heightCache.get(key);
}

// Bilinear between the four nearest tile centres, so a sprite walking a slope
// does not step up per tile.
export function groundHeight(x, y) {
  const fx = x - .5, fy = y - .5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const h00 = tileHeight(x0, y0), h10 = tileHeight(x0 + 1, y0), h01 = tileHeight(x0, y0 + 1), h11 = tileHeight(x0 + 1, y0 + 1);
  return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
}

export function isKeepTile(x, y) {
  return KEEP_TILES.some(t => t.x === x && t.y === y);
}
