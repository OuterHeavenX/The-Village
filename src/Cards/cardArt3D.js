// V37.4 — card art and 2D tower sprites rendered from the 3D models.
//
// One small offscreen WebGL renderer draws each card's art once (the tower
// model for tower cards, a 3D emblem for everything else) into a cached image.
// The same renderer draws transparent tower sprites for the 2D board, so a
// tower looks the same on its card, on the 2D board and on the 3D battlefield.
//
// Rendering is queued and spread over animation frames; markup is emitted at
// once with a placeholder and the <img> is swapped in when its art is ready.
// The WebGL context is released after a few idle seconds and re-created on
// demand, so it never sits beside the Village or battlefield contexts for long.

import * as THREE from 'three';
import { createTowerFactory } from '../Battle3D/towerModels.js';
import { buildEmblem, EMBLEMS } from '../Battle3D/cardEmblems.js';

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const CARD_W = 320, CARD_H = 400, SPRITE = 192;
// 2D sprites: 2.1 tiles wide, 2.52 tall; the tile's ground centre lands at
// SPRITE_ANCHOR of the image height (see towerSprite2D).
const SPRITE_PITCH = 38, SPRITE_TARGET = .85;
export const SPRITE_TILES_WIDE = 2.1, SPRITE_ANCHOR = (1.26 + SPRITE_TARGET * Math.cos(SPRITE_PITCH * Math.PI / 180)) / 2.52;
const TOWER_IDS = new Set(['dagger', 'whip', 'axe', 'cross', 'clock', 'bone', 'familiar', 'silver', 'rosary', 'garlic', 'scripture', 'crossbow', 'ballista', 'holy', 'arcane', 'freeze', 'guardian']);
const RARITY_GLOW = { common: 0x8c8c95, good: 0x58ba62, rare: 0x4f87e8, epic: 0x9b5de5, epicplus: 0xb06ae8, legendary: 0xe0b54f, legendaryplus: 0xf0c860, mythic: 0xd73138 };

const cache = new Map();      // key -> url
const images = new Map();     // key -> HTMLImageElement (2D sprites)
const queue = new Map();      // key -> job
let ctx = null, pumping = false, idleTimer = 0, unsupported = false;

export const cardArtSupported = () => !unsupported;
export const isTowerArt = id => TOWER_IDS.has(id);
const band = level => Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));

function makeContext() {
  if (ctx || unsupported) return ctx;
  try {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0x4a5a90, 0x0a0608, .42);
    const key = new THREE.DirectionalLight(0xd4ddff, 1.05);
    key.position.set(-2.4, 4, 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -1, near: .5, far: 12 });
    key.shadow.bias = -.0008;
    const rim = new THREE.DirectionalLight(0xffc070, 1.25); rim.position.set(1.6, 2.2, -3);
    const fill = new THREE.PointLight(0xff9a4a, .45, 6, 2); fill.position.set(1.4, .6, 1.6);
    scene.add(hemi, key, key.target, rim, fill);
    // Backdrop: a gradient dome tinted by rarity, plus a stone dais for the subject.
    const sky = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, toneMapped: false,
      uniforms: { tint: { value: new THREE.Color() }, top: { value: new THREE.Color(0x07060c) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 tint; uniform vec3 top; varying vec3 vP; void main(){ vec3 n = normalize(vP); float h = smoothstep(-.15, .55, n.y); float glow = pow(max(0., 1. - length(n.xy - vec2(0., .05)) * 1.15), 2.2); vec3 c = mix(tint * .16 + vec3(.012, .01, .016), top, h) + tint * glow * .42; gl_FragColor = vec4(c, 1.); }'
    }));
    const dais = new THREE.Group();
    const daisStone = new THREE.MeshStandardMaterial({ color: 0x1c191b, roughness: .9 });
    const daisGold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: .4, metalness: .35 });
    const d1 = new THREE.Mesh(new THREE.CylinderGeometry(.82, .9, .12, 8), daisStone); d1.position.y = -.06; d1.rotation.y = Math.PI / 8; d1.receiveShadow = true;
    const d2 = new THREE.Mesh(new THREE.TorusGeometry(.84, .02, 4, 8), daisGold); d2.position.y = .0; d2.rotation.set(Math.PI / 2, 0, Math.PI / 8);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.12; ground.receiveShadow = true;
    dais.add(d1, d2, ground);
    scene.add(sky, dais);
    scene.fog = new THREE.Fog(0x050408, 4, 9);
    const camera = new THREE.PerspectiveCamera(30, CARD_W / CARD_H, .1, 40);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 40);
    const factory = createTowerFactory();
    ctx = { renderer, scene, camera, ortho, sky, dais, rim, fill, factory };
  } catch (error) {
    console.warn('[CardArt] WebGL unavailable; cards keep their flat art', error);
    unsupported = true; ctx = null;
  }
  return ctx;
}

function releaseContext() {
  if (!ctx) return;
  try { ctx.factory.dispose(); ctx.renderer.dispose(); ctx.renderer.forceContextLoss(); } catch {}
  ctx = null;
}

function subjectFor(job) {
  const { factory } = ctx;
  if (job.tower) {
    const model = factory.create({ id: job.id, level: job.level, elite: job.elite, support: job.support, shadows: true });
    // Settle the pose: aim three-quarters toward the viewer, spin parts at rest.
    model.update({ aimX: .55, aimZ: 1 }, 1, 1.3);
    model.update({ aimX: .55, aimZ: 1 }, .016, 1.32);
    return { group: model.root, done: () => model.dispose() };
  }
  const { builder } = buildEmblem(job.id, job.accent);
  const group = factory.meshFromBuilder(builder);
  return { group, done: () => factory.disposeLoose() };
}

function frame(camera, box, aspect, pitch, pad) {
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.y * .5, size.x * .5 / aspect, size.z * .35) * pad;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camera.position.set(center.x, center.y + Math.sin(pitch) * dist, center.z + Math.cos(pitch) * dist);
  camera.lookAt(center.x, center.y, center.z);
  camera.aspect = aspect; camera.updateProjectionMatrix();
}

function renderJob(job) {
  const c = makeContext();
  if (!c) return null;
  const { renderer, scene, camera, ortho, sky, dais, rim } = c;
  const subject = subjectFor(job);
  scene.add(subject.group);
  subject.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(subject.group);
  let url;
  if (job.sprite) {
    // 2D board sprite: transparent, orthographic, a fixed scale for every tower
    // so a tile is the same width on all of them.
    sky.visible = dais.visible = false;
    const fog = scene.fog; scene.fog = null;
    renderer.setSize(SPRITE, SPRITE * 1.2, false);
    renderer.setClearColor(0x000000, 0);
    const pitch = THREE.MathUtils.degToRad(SPRITE_PITCH);
    Object.assign(ortho, { left: -1.05, right: 1.05, top: 1.26, bottom: -1.26 });
    ortho.position.set(0, SPRITE_TARGET + Math.sin(pitch) * 8, Math.cos(pitch) * 8); ortho.lookAt(0, SPRITE_TARGET, 0); ortho.updateProjectionMatrix();
    renderer.render(scene, ortho);
    url = renderer.domElement.toDataURL('image/png');
    scene.fog = fog;
  } else {
    sky.visible = dais.visible = true;
    sky.material.uniforms.tint.value.setHex(RARITY_GLOW[job.rarity] ?? RARITY_GLOW.common);
    scene.fog.color.copy(sky.material.uniforms.tint.value).multiplyScalar(.1);
    rim.color.setHex(job.accent ?? 0xffc070);
    renderer.setSize(CARD_W, CARD_H, false);
    renderer.setClearColor(0x000000, 1);
    frame(camera, box.union(new THREE.Box3(new THREE.Vector3(-.5, -.05, -.5), new THREE.Vector3(.5, .2, .5))), CARD_W / CARD_H, THREE.MathUtils.degToRad(job.tower ? 17 : 12), job.tower ? 1.08 : 1.18);
    renderer.render(scene, camera);
    url = renderer.domElement.toDataURL('image/webp', .9);
    if (!url.startsWith('data:image/webp')) url = renderer.domElement.toDataURL('image/jpeg', .9);
  }
  scene.remove(subject.group);
  subject.done();
  return url;
}

function sweep() {
  for (const img of document.querySelectorAll('img[data-card-art]')) {
    const url = cache.get(img.dataset.cardArt);
    if (url && img.getAttribute('src') !== url) { img.src = url; img.classList.add('is-ready'); }
  }
}

function pump() {
  pumping = false;
  const start = performance.now();
  for (const [key, job] of queue) {
    if (performance.now() - start > 14) break;
    queue.delete(key);
    let url = null;
    try { url = renderJob(job); } catch (error) { console.warn('[CardArt] render failed', key, error); }
    if (!url) { if (unsupported) { queue.clear(); break; } continue; }
    cache.set(key, url);
    if (job.sprite) { const img = new Image(); img.src = url; images.set(key, img); }
  }
  sweep();
  if (queue.size) schedule();
  else {
    setTimeout(sweep, 250);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!queue.size) releaseContext(); }, 4000);
  }
}
// requestAnimationFrame stops in a hidden tab or pane, so a timer races it.
function schedule() {
  if (pumping) return; pumping = true;
  let ran = false; const go = () => { if (ran) return; ran = true; pump(); };
  globalThis.requestAnimationFrame?.(go); setTimeout(go, 60);
}

function enqueue(key, job) {
  if (cache.has(key) || queue.has(key) || unsupported) return;
  queue.set(key, job);
  clearTimeout(idleTimer);
  schedule();
}

function jobFor(card, opts = {}) {
  const id = card?.id;
  const tower = TOWER_IDS.has(id) && (card.type === 'tower' || card.type === 'support' || !card.type);
  const level = band(opts.level);
  const rarity = opts.rarity || 'common';
  const accent = card?.color ? parseInt(String(card.color).replace('#', ''), 16) : undefined;
  const key = `card:${id}:${tower ? level : 1}:${rarity}:${opts.elite ? 1 : 0}`;
  return { key, job: { id, tower, level, rarity, elite: !!opts.elite, support: card?.type === 'support', accent } };
}

// Card art <img>. Non-tower cards without their own emblem get a medallion and
// keep their icon on top of it.
export function cardArt3DHTML(card, opts = {}) {
  if (!card?.id || unsupported) return '';
  const { key, job } = jobFor(card, opts);
  const url = cache.get(key);
  if (!url) enqueue(key, job);
  const medallion = !job.tower && !EMBLEMS[card.id];
  const glyph = medallion ? `<span class="card-art-glyph" aria-hidden="true">${opts.icon ?? card.icon ?? ''}</span>` : '';
  return `<img class="card-art-image card-art-3d${url ? ' is-ready' : ''}" data-card-art="${key}" src="${url || PLACEHOLDER}" alt="${String(card.name || '').replace(/"/g, '&quot;')}" decoding="async" draggable="false">${glyph}`;
}

// Transparent tower sprite for the 2D board, or null until it is ready.
export function towerSprite2D(id, level, elite, support) {
  if (!TOWER_IDS.has(id) || unsupported) return null;
  const key = `sprite:${id}:${band(level)}:${elite ? 1 : 0}:${support ? 1 : 0}`;
  const img = images.get(key);
  if (img) return img.complete && img.naturalWidth ? img : null;
  enqueue(key, { id, tower: true, sprite: true, level: band(level), elite: !!elite, support: !!support });
  return null;
}

// Renders a set of cards ahead of time (e.g. the deck when the game boots).
export function warmCardArt(cards, optsFor = () => ({})) {
  for (const c of cards || []) { if (!c?.id) continue; const { key, job } = jobFor(c, optsFor(c)); enqueue(key, job); }
}
