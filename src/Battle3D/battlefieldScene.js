// The Three.js battlefield: loads the Blender-built keep arena, grows grass on
// it, and draws the battle's entities as billboards over it.
//
// This module knows nothing about game.js. It renders a plain "view" object
// built by battleBridge.js each frame (see BATTLE_VIEW_SHAPE below) and answers
// two questions back: which tile is under a screen point, and where on screen
// a world point lands (for the 2D overlay that draws health bars and damage
// numbers on top of it).
//
// Coordinate contract (docs/BATTLE_4_DESIGN.md): sim tile (x, y) maps to world
// (x, height, y) with 1 tile = 1 unit and the south gate toward +Z. Sim
// positions are already continuous (tile centres sit at +.5), so world x/z
// are the sim numbers unchanged.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { KEEP_CENTER, KEEP_LAYOUT, KEEP_ROAD_ORDER, groundHeight } from './layout.js';

export const BATTLE_VIEW_SHAPE = `
{
  time, width, height,                      // seconds; CSS size of the host canvas
  camera: { zoom, panX, panY, pxPerTile },  // the 2D battle camera, reused as-is
  openRoutes: number,                       // G.routes.length -> which rubble piles are gone
  keepHp: 0..1,
  placing: 'tower'|'support'|'trap'|null,
  pads: [{ x, y, valid }],                  // placement slots while placing
  hover: { x, y, valid } | null,
  selected: { x, y, range } | null,
  sprites: [{ img, cell, frame, row, x, y, size, alpha, tint, lean }],
  towers: [{ canvas, key, x, y }],
  shots: [{ x, y, color, size }],
  traps: [{ x, y, color }],
  particles: [{ x, y, color, alpha, size }],
  rings: [{ x, y, radius, color, alpha }],
  links: [{ ax, ay, bx, by, color, alpha }],   // synergy links between towers
  lanes: [{ x, y, dx, dy, length, q, color }]  // lane shots, q = 0..1 progress
}`;

const GLB_URL = new URL('../../assets/battlefield3d/keep_arena.glb', import.meta.url).href;
// The Village's own gothic keep stands in for the Blender blockout; the arena
// GLB keeps only the doors. Dressing comes from the same set. Document-relative
// like villageThreeWorld.js: scripts/prepare-runtime-assets.mjs copies the
// folder into the build, and a relative path works on a path-prefixed host.
const VILLAGE_MODELS = 'assets/village/The_Village_Gothic_GLBS_Phase1/';
const KEEP_MODEL_URL = VILLAGE_MODELS + 'keep.glb';
const DRESSING = [
  { model: 'dead_tree.glb', at: [[2.5, 2.5], [13.5, 1.5], [1.5, 13.5], [14.5, 13.5], [1.5, 5.5], [14.5, 10.5], [4.5, 15.5], [12.5, 12.5]], scale: .3 },
  { model: 'rock_cluster.glb', at: [[5.5, 3.5], [11.5, 15.5], [3.5, 13.5], [12.5, 3.5]], scale: .5 },
  { model: 'lamp_post.glb', at: [[6.5, 11.5], [10.5, 11.5], [6.5, 6.5], [10.5, 6.5]], scale: .38 }
];
const KEEP_FOOTPRINT = 2.6;   // tiles across; the model is 14.5 units wide
const COLS = KEEP_LAYOUT.grid.cols, ROWS = KEEP_LAYOUT.grid.rows;
const PITCH = THREE.MathUtils.degToRad(42);
const FOV = 40;
const SPRITE_LEAN = PITCH * .5;

const colorCache = new Map();
function cssColor(value, fallback = '#ffffff') {
  const key = String(value || fallback);
  let c = colorCache.get(key);
  if (!c) {
    c = new THREE.Color();
    try { c.set(key.startsWith('rgba') ? key.replace(/rgba\(([^)]+),[^,]+\)$/, 'rgb($1)') : key); } catch { c.set(fallback); }
    colorCache.set(key, c);
  }
  return c;
}

function glowTexture() {
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

// Procedural surface detail shared by the terrain and the stone shader: hash
// noise, fbm, and a cell pattern that reads as cobbles or masonry. No image
// textures, so nothing to load and nothing to tile badly.
const PROCEDURAL_GLSL = `
  float c3hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float c3noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    float a = c3hash(i), b = c3hash(i + vec2(1., 0.)), c = c3hash(i + vec2(0., 1.)), d = c3hash(i + vec2(1., 1.));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
  float c3fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * c3noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
  // returns (cell shade 0..1, distance to nearest cell edge)
  vec2 c3cells(vec2 p) { vec2 i = floor(p), f = fract(p); float md = 8., md2 = 8., shade = 0.;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(c3hash(i + g), c3hash(i + g + 7.3)); vec2 r = g + o - f; float d = dot(r, r);
      if (d < md) { md2 = md; md = d; shade = c3hash(i + g + 3.1); } else if (d < md2) { md2 = d; } }
    return vec2(shade, sqrt(md2) - sqrt(md)); }
`;

const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: .55 }, uExposure: { value: .95 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uExposure; varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure;
      c = aces(c);
      // gothic grade: cool shadows, faintly warm highlights, a touch of contrast
      float l = dot(c, vec3(.299, .587, .114));
      c *= mix(vec3(.86, .9, 1.14), vec3(1.06, 1., .94), smoothstep(.08, .75, l));
      c = (c - .5) * 1.07 + .5;
      vec2 d = vUv - .5; c *= 1. - smoothstep(.3, 1.05, dot(d, d) * 2.4) * uVignette;
      c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
      gl_FragColor = vec4(c, 1.);
    }`
};

export function detectQuality() {
  const ua = navigator.userAgent || '';
  const coarse = matchMedia?.('(pointer:coarse)')?.matches || /iPad|iPhone|iPod|Android/i.test(ua);
  const shortSide = Math.min(innerWidth || 1024, innerHeight || 768);
  if (coarse && shortSide < 700) return { tier: 'phone', grass: 5000, pixelRatioCap: 1.5, antialias: false, shadowMap: 0, bloom: false, torches: 2, spriteShadows: false };
  if (coarse) return { tier: 'tablet', grass: 10000, pixelRatioCap: 1.6, antialias: false, shadowMap: 1024, bloom: true, torches: 4, spriteShadows: false };
  return { tier: 'desktop', grass: 24000, pixelRatioCap: 2, antialias: true, shadowMap: 2048, bloom: true, torches: 8, spriteShadows: true };
}

// Debug-only look switches: ?look=noshadow,nostone,nopost,nokeep
const LOOK_OFF = new Set(String(new URLSearchParams(globalThis.location?.search || '').get('look') || '').split(',').filter(Boolean));

export function createBattlefieldScene({ host, quality = detectQuality(), onContextLost } = {}) {
  if (LOOK_OFF.has('noshadow')) quality = { ...quality, shadowMap: 0, spriteShadows: false };
  if (LOOK_OFF.has('nopost')) quality = { ...quality, bloom: false };
  const canvas = document.createElement('canvas');
  canvas.id = 'battle3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.parentNode.insertBefore(canvas, host);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.antialias, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    canvas.remove();
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality.pixelRatioCap));
  // Linear pipeline: the scene renders linear into the composer; the grade pass
  // does exposure, ACES, the gothic grade and the sRGB encode.
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x070810, 1);
  renderer.shadowMap.enabled = quality.shadowMap > 0;
  renderer.shadowMap.type = quality.tier === 'desktop' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0d18, 30, 58);
  const camera = new THREE.PerspectiveCamera(FOV, 1, .5, 160);
  const hemi = new THREE.HemisphereLight(0x33427a, 0x10150f, .5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xc2d0ff, .95);
  moon.position.set(COLS / 2 - 9, 22, ROWS / 2 + 11);
  moon.target.position.set(COLS / 2, 0, ROWS / 2);
  scene.add(moon, moon.target);
  if (quality.shadowMap) {
    moon.castShadow = true;
    moon.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 13, bottom: -13, near: 4, far: 60 });
    moon.shadow.bias = -.0006;
    moon.shadow.normalBias = .03;
  }
  scene.add(new THREE.AmbientLight(0x1b2038, .35));

  // Torches: warm point lights at the keep doors and the lamp posts, with a
  // small glow sprite for the flame. Tiered by count; flicker in render().
  const torches = [];
  function addTorch(x, y, h, strength = 1) {
    if (torches.length >= quality.torches) return;
    const light = new THREE.PointLight(0xff9a3c, 2.2 * strength, 6.5, 2);
    light.position.set(x, h, y);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff8f2e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    flame.scale.setScalar(.22 * strength);
    flame.position.set(x, h + .05, y);
    scene.add(light, flame);
    torches.push({ light, flame, base: 2.2 * strength, seed: torches.length * 1.7 });
  }

  // Sky: a gradient dome, a moon and a scatter of stars, all beyond the fog.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(110, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { horizon: { value: new THREE.Color(0x1a1d34) }, zenith: { value: new THREE.Color(0x04050c) } },
    vertexShader: 'varying float vH; void main() { vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 horizon; uniform vec3 zenith; varying float vH; void main() { gl_FragColor = vec4(mix(horizon, zenith, smoothstep(-.05, .6, vH)), 1.); }'
  }));
  sky.position.set(COLS / 2, 0, ROWS / 2);
  scene.add(sky);
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i++) { const a = Math.random() * Math.PI * 2, e = .12 + Math.random() * 1.3, r = 100; starPositions.set([COLS / 2 + Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, ROWS / 2 + Math.sin(a) * Math.cos(e) * r], i * 3); }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: .75, fog: false, toneMapped: false }));
  scene.add(stars);
  const glow = glowTexture();
  const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xf4f1e0, transparent: true, fog: false, toneMapped: false, depthWrite: false }));
  moonDisc.scale.setScalar(9);
  moonDisc.position.set(COLS / 2 - 30, 62, ROWS / 2 - 60);
  scene.add(moonDisc);

  // Ground beyond the walls so the arena is not floating in sky.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x0c110d, roughness: 1 }));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(COLS / 2, -.02, ROWS / 2);
  apron.receiveShadow = true;
  scene.add(apron);

  const wind = { value: 0 };
  const disposables = [apron.geometry, apron.material, glow, sky.geometry, sky.material, starGeometry, stars.material, moonDisc.material];

  // ---- arena ---------------------------------------------------------------
  const arena = new THREE.Group();
  scene.add(arena);
  const pads = new Map();          // 'x,y' -> mesh
  const rubble = new Map();        // road name -> [mesh]
  let terrain = null, keepWalls = null, grass = null, stones = null;
  const keepMaterials = [];
  const padMaterials = {
    valid: new THREE.MeshLambertMaterial({ color: 0x3a4a34, emissive: 0x8f7a2a, emissiveIntensity: .55 }),
    hover: new THREE.MeshLambertMaterial({ color: 0x6d8a4a, emissive: 0xffe58a, emissiveIntensity: .95 }),
    blocked: new THREE.MeshLambertMaterial({ color: 0x3a2a2a, emissive: 0x7a2a2a, emissiveIntensity: .4 })
  };
  disposables.push(...Object.values(padMaterials));

  function terrainMaterial() {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vArenaPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArenaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vArenaPos;' + PROCEDURAL_GLSL)
        .replace('#include <color_fragment>', `
          vec2 uvw = vArenaPos.xz;
          float n = c3fbm(uvw * 1.6), n2 = c3noise(uvw * 9.), n3 = c3noise(uvw * 27.);
          vec3 grass = mix(vec3(.06, .15, .07), vec3(.15, .27, .10), n);
          grass = mix(grass, vec3(.11, .2, .05), smoothstep(.55, .85, n2) * .55) * (.88 + .24 * n3);
          vec2 cb = c3cells(uvw * 6.5);
          float c3grout = smoothstep(.0, .12, cb.y);
          vec3 road = mix(vec3(.21, .19, .17), vec3(.33, .30, .27), cb.x) * (.5 + .5 * c3grout) * (.88 + .24 * n3);
          vec3 dirt = vec3(.2, .15, .1) * (.75 + .5 * n2);
          vec3 rock = mix(vec3(.16, .17, .2), vec3(.28, .29, .33), c3cells(uvw * 5.).x) * (.85 + .3 * n3);
          float c3road = smoothstep(.2, .85, vColor.r);
          vec3 c = mix(grass, rock, vColor.b);
          c = mix(c, dirt, smoothstep(.02, .3, vColor.r) * (1. - c3road));
          c = mix(c, road, c3road);
          diffuseColor.rgb = c;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, .72, c3road * c3grout);');
    };
    return material;
  }

  // Masonry on the models: a triplanar cell pattern modulating the model's own
  // colour, so the keep, walls, rubble and rocks stop reading as flat plastic.
  const stoned = new WeakSet();
  function stoneify(material, scale = 3.2) {
    if (!material || stoned.has(material) || !material.isMeshStandardMaterial || LOOK_OFF.has('nostone')) return;
    stoned.add(material);
    material.metalness = 0; material.roughness = Math.max(.8, material.roughness || 0);
    material.onBeforeCompile = shader => {
      shader.uniforms.uStoneScale = { value: scale };
      // The Village models ship without vertex normals, so the loader flat-shades
      // them and the normal only exists per fragment; the triplanar weights are
      // taken there, after <normal_fragment_begin>, never from a vertex varying.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vArenaPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArenaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vArenaPos; uniform float uStoneScale;' + PROCEDURAL_GLSL)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec3 c3wn = inverseTransformDirection(normal, viewMatrix);
          vec3 w = abs(c3wn); w /= (w.x + w.y + w.z + 1e-4);
          vec2 cx = c3cells(vArenaPos.zy * uStoneScale * vec2(1., 2.)), cy = c3cells(vArenaPos.xz * uStoneScale), cz = c3cells(vArenaPos.xy * uStoneScale * vec2(1., 2.));
          float shade = cx.x * w.x + cy.x * w.y + cz.x * w.z;
          float edge = cx.y * w.x + cy.y * w.y + cz.y * w.z;
          float grout = smoothstep(.0, .08, edge);
          float grain = c3noise(vArenaPos.xz * 23. + vArenaPos.y * 17.);
          diffuseColor.rgb *= (.78 + .44 * shade) * (.62 + .38 * grout) * (.92 + .16 * grain);`);
    };
    material.customProgramCacheKey = () => 'c3stone';
    material.needsUpdate = true;
  }

  function grassMaterial() {
    const material = new THREE.MeshLambertMaterial({ color: 0x2e5a2a, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
      shader.uniforms.uTime = wind;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vBlade;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vBlade = position.y * 2.0;
          #ifdef USE_INSTANCING
            float sway = sin(uTime * 1.7 + instanceMatrix[3].x * 1.3 + instanceMatrix[3].z * .9) * .16 * vBlade * vBlade;
            transformed.x += sway;
            transformed.z += sway * .35;
          #endif`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBlade;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(.45, 1.15, vBlade);');
    };
    return material;
  }

  function sampleGrass(geometry, count) {
    const pos = geometry.attributes.position, col = geometry.attributes.color, index = geometry.index;
    const triCount = index ? index.count / 3 : pos.count / 3;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
    const weights = new Float32Array(triCount);
    let total = 0;
    const vid = (t, k) => index ? index.getX(t * 3 + k) : t * 3 + k;
    for (let t = 0; t < triCount; t++) {
      const i0 = vid(t, 0), i1 = vid(t, 1), i2 = vid(t, 2);
      a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
      const density = col ? (col.getY(i0) + col.getY(i1) + col.getY(i2)) / 3 : 1;
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * .5;
      weights[t] = area * Math.max(0, density - .08);
      total += weights[t];
    }
    const matrices = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let t = 0; t < triCount && matrices.length < count; t++) {
      const n = weights[t] / total * count;
      const whole = Math.floor(n) + (rnd() < n - Math.floor(n) ? 1 : 0);
      if (!whole) continue;
      a.fromBufferAttribute(pos, vid(t, 0)); b.fromBufferAttribute(pos, vid(t, 1)); c.fromBufferAttribute(pos, vid(t, 2));
      for (let k = 0; k < whole && matrices.length < count; k++) {
        let u = rnd(), v = rnd();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        p.copy(a).addScaledVector(ab.subVectors(b, a), u).addScaledVector(ac.subVectors(c, a), v);
        if (p.x < .3 || p.x > COLS - .3 || p.z < .3 || p.z > ROWS - .3) continue;
        q.setFromAxisAngle(up, rnd() * Math.PI * 2);
        const scale = .55 + rnd() * .5;
        s.set(scale, scale * (.8 + rnd() * .5), scale);
        matrices.push(m.compose(p, q, s).clone());
      }
    }
    return matrices;
  }

  function placeRoadStones(geometry, material) {
    const matrices = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let seed = 99;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (const name of KEEP_ROAD_ORDER) {
      const tiles = KEEP_LAYOUT.roads[name].tiles;
      for (let i = 1; i < tiles.length; i++) {
        const [ax, ay] = tiles[i - 1], [bx, by] = tiles[i], dx = bx - ax, dy = by - ay;
        for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
          if (rnd() < .55) continue;
          const t = (k + rnd()) / 2, cx = ax + .5 + dx * t, cy = ay + .5 + dy * t;
          const ox = -dy * side * (.58 + rnd() * .12), oy = dx * side * (.58 + rnd() * .12);
          p.set(cx + ox, groundHeight(cx + ox, cy + oy) + .02, cy + oy);
          q.setFromAxisAngle(up, rnd() * Math.PI);
          const scale = .28 + rnd() * .3;
          s.set(scale, scale * .55, scale);
          matrices.push(m.compose(p, q, s).clone());
        }
      }
    }
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  const ready = new Promise((resolve, reject) => {
    new GLTFLoader().load(GLB_URL, gltf => {
      const root = gltf.scene;
      let grassGeometry = null, stoneGeometry = null, stoneMaterial = null;
      root.traverse(node => {
        if (!node.isMesh) return;
        node.frustumCulled = true;
        if (node.name === 'terrain') {
          terrain = node;
          node.material.dispose();
          node.material = terrainMaterial();
        } else if (node.name === 'grass_blade') {
          grassGeometry = node.geometry; node.visible = false;
        } else if (node.name === 'road_stone') {
          stoneGeometry = node.geometry; stoneMaterial = node.material; node.visible = false;
        } else if (node.name.startsWith('pad_')) {
          const [, x, y] = node.name.split('_');
          pads.set(`${x},${y}`, node);
          node.material = padMaterials.valid;
          node.visible = false;
        } else if (node.name.startsWith('rubble_')) {
          const road = node.name.split('_')[1];
          if (!rubble.has(road)) rubble.set(road, []);
          rubble.get(road).push(node);
        } else if (node.name.startsWith('keep_') && !node.name.startsWith('keep_door')) {
          node.visible = false;   // replaced by the Village keep model below
        }
        if (node.material?.isMeshStandardMaterial) { node.material.roughness = Math.min(1, node.material.roughness); }
        if (node.name === 'terrain') { node.receiveShadow = true; }
        else if (/^(wall_|rubble_|keep_door)/.test(node.name)) { node.castShadow = true; node.receiveShadow = true; stoneify(node.material, node.name.startsWith('rubble_') ? 5 : 3.2); }
      });
      arena.add(root);
      if (grassGeometry) {
        const matrices = sampleGrass(terrain.geometry, quality.grass);
        grass = new THREE.InstancedMesh(grassGeometry, grassMaterial(), matrices.length);
        matrices.forEach((mat, i) => grass.setMatrixAt(i, mat));
        grass.instanceMatrix.needsUpdate = true;
        grass.frustumCulled = false;
        grass.receiveShadow = quality.shadowMap > 0;
        arena.add(grass);
        disposables.push(grass.material);
      }
      if (stoneGeometry) {
        stones = placeRoadStones(stoneGeometry, stoneMaterial);
        stones.castShadow = true;
        arena.add(stones);
      }
      resolve();
    }, undefined, reject);
  });

  const roadTiles = new Set(KEEP_ROAD_ORDER.flatMap(name => KEEP_LAYOUT.roads[name].tiles.map(([x, y]) => `${x},${y}`)));
  const padTiles = new Set(KEEP_LAYOUT.pads.map(pad => `${pad.x},${pad.y}`));
  const loader = new GLTFLoader();
  const loadModel = url => new Promise((resolve, reject) => loader.load(url, gltf => resolve(gltf.scene), undefined, reject));
  const keepPlateau = KEEP_LAYOUT.keep.plateauHeight || .42;
  // Failures here are cosmetic: the arena is playable without its dressing.
  const dressed = ready.then(() => loadModel(KEEP_MODEL_URL)).then(model => {
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    const scale = KEEP_FOOTPRINT / Math.max(size.x, size.z);
    model.scale.setScalar(scale);
    model.position.set(KEEP_CENTER.x, keepPlateau - box.min.y * scale, KEEP_CENTER.y);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.frustumCulled = false; node.castShadow = true; node.receiveShadow = true;
      node.material = node.material.clone();
      node.material.metalness = 0;
      if (/window/i.test(node.material.name)) { node.material.emissive.set(0xffa040); node.material.emissiveIntensity = 2.2; node.material.toneMapped = false; }
      else { if (!LOOK_OFF.has('nokeepstone')) stoneify(node.material, /roof/i.test(node.material.name) ? 9 : 2.6); keepMaterials.push(node.material); }
    });
    keepWalls = model;
    arena.add(model);
    // Torches at the keep doors (one per distinct door tile) first, lamps after.
    const doors = new Map();
    for (const name of KEEP_ROAD_ORDER) { const [dx, dy] = KEEP_LAYOUT.roads[name].door; doors.set(`${dx},${dy}`, [dx, dy]); }
    for (const [dx, dy] of doors.values()) { const tx = dx + .5 + Math.sign(KEEP_CENTER.x - dx - .5) * .35, ty = dy + .5 + Math.sign(KEEP_CENTER.y - dy - .5) * .35; addTorch(tx, ty, keepPlateau + 1.15, 1.1); }
  }).then(() => Promise.all(DRESSING.map(entry => loadModel(VILLAGE_MODELS + entry.model).then(model => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (const [x, y] of entry.at) {
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      if (roadTiles.has(key) || padTiles.has(key)) continue;
      const clone = model.clone();
      clone.scale.setScalar(entry.scale * (.85 + rnd() * .3));
      clone.rotation.y = rnd() * Math.PI * 2;
      clone.position.set(x, groundHeight(x, y) - .02, y);
      clone.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; if (node.material?.isMeshStandardMaterial) node.material.metalness = 0; if (/window/i.test(node.material?.name)) { node.material = node.material.clone(); node.material.emissive.set(0xffa040); node.material.emissiveIntensity = 2.4; node.material.toneMapped = false; } else if (/stone/i.test(node.material?.name)) stoneify(node.material, 4); } });
      if (entry.model === 'lamp_post.glb') addTorch(x, y, groundHeight(x, y) + 3.6 * entry.scale, .8);
      arena.add(clone);
    }
  })))).catch(error => console.warn('[Battle3D] dressing skipped', error));

  // ---- billboards ----------------------------------------------------------
  const textures = new Map();   // Image | canvas key -> texture
  function textureFor(source, key = source) {
    let texture = textures.get(key);
    if (!texture) {
      texture = new THREE.Texture(source);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.encoding = THREE.sRGBEncoding;
      texture.needsUpdate = true;
      textures.set(key, texture);
      if (textures.size > 96) { const [oldKey, old] = textures.entries().next().value; old.dispose(); textures.delete(oldKey); }
    }
    return texture;
  }
  const placeholder = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  placeholder.needsUpdate = true;
  disposables.push(placeholder);

  function makeBillboardPool(group) {
    const pool = [];
    return {
      acquire(i) {
        let mesh = pool[i];
        if (!mesh) {
          const geometry = new THREE.PlaneGeometry(1, 1);
          geometry.translate(0, .5, 0);
          const material = new THREE.MeshBasicMaterial({ map: placeholder, transparent: true, alphaTest: .3, depthWrite: true, side: THREE.DoubleSide, fog: false, toneMapped: false });
          mesh = new THREE.Mesh(geometry, material);
          mesh.matrixAutoUpdate = true;
          mesh.castShadow = quality.spriteShadows;
          mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: placeholder, alphaTest: .3, side: THREE.DoubleSide });
          group.add(mesh);
          pool[i] = mesh;
        }
        mesh.visible = true;
        return mesh;
      },
      release(from) { for (let i = from; i < pool.length; i++) pool[i].visible = false; },
      dispose() { for (const mesh of pool) { mesh.geometry.dispose(); mesh.material.dispose(); } }
    };
  }
  const spriteGroup = new THREE.Group(), towerGroup = new THREE.Group();
  scene.add(spriteGroup, towerGroup);
  const spritePool = makeBillboardPool(spriteGroup), towerPool = makeBillboardPool(towerGroup);

  // Soft contact shadow under every sprite and tower, so they sit on the
  // ground instead of floating on it.
  const blobTexture = (() => { const size = 64, c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), rg = g.createRadialGradient(32, 32, 2, 32, 32, 32); rg.addColorStop(0, 'rgba(0,0,0,.9)'); rg.addColorStop(.6, 'rgba(0,0,0,.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, size, size); const t = new THREE.CanvasTexture(c); return t; })();
  const blobGeometry = new THREE.PlaneGeometry(1, 1);
  blobGeometry.rotateX(-Math.PI / 2);
  disposables.push(blobTexture, blobGeometry);
  const blobPool = [];
  function contactShadow(i, x, y, size) {
    let blob = blobPool[i];
    if (!blob) {
      blob = new THREE.Mesh(blobGeometry, new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity: .6, depthWrite: false, fog: false, toneMapped: false }));
      blob.renderOrder = -1;
      markerGroup.add(blob);
      blobPool[i] = blob;
    }
    blob.visible = true;
    blob.position.set(x, groundHeight(x, y) + .025, y);
    blob.scale.set(size, 1, size * .7);
    return blob;
  }

  function setFrameUV(geometry, img, cell, frame, row) {
    const cols = Math.max(1, Math.floor(img.naturalWidth / cell)), rows = Math.max(1, Math.floor(img.naturalHeight / cell));
    const f = ((frame % cols) + cols) % cols, r = Math.max(0, Math.min(rows - 1, row));
    const u0 = f * cell / img.naturalWidth, u1 = (f + 1) * cell / img.naturalWidth;
    const v1 = 1 - r * cell / img.naturalHeight, v0 = 1 - (r + 1) * cell / img.naturalHeight;
    const uv = geometry.attributes.uv;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
  }
  function setFullUV(geometry) {
    const uv = geometry.attributes.uv;
    uv.setXY(0, 0, 1); uv.setXY(1, 1, 1); uv.setXY(2, 0, 0); uv.setXY(3, 1, 0);
    uv.needsUpdate = true;
  }
  function orient(mesh, x, z, lean = SPRITE_LEAN) {
    const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
    mesh.rotation.set(-lean, yaw, 0, 'YXZ');
  }

  // ---- effects -------------------------------------------------------------
  const PARTICLE_CAP = 900;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(PARTICLE_CAP * 3), particleColors = new Float32Array(PARTICLE_CAP * 3);
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3).setUsage(THREE.DynamicDrawUsage));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ size: .22, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  particles.frustumCulled = false;
  scene.add(particles);
  disposables.push(particleGeometry, particles.material);

  const shotPool = [];
  const shotGroup = new THREE.Group();
  scene.add(shotGroup);
  function shotSprite(i) {
    let sprite = shotPool[i];
    if (!sprite) {
      sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      shotGroup.add(sprite);
      shotPool[i] = sprite;
    }
    sprite.visible = true;
    return sprite;
  }

  const markerGroup = new THREE.Group();
  scene.add(markerGroup);
  const ringGeometry = new THREE.RingGeometry(.9, 1, 48);
  const hoverRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0x56dd82, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  hoverRing.rotation.x = -Math.PI / 2; hoverRing.visible = false;
  const rangeRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xb9eeff, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  rangeRing.rotation.x = -Math.PI / 2; rangeRing.visible = false;
  const rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x7ed2ff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false }));
  rangeFill.rotation.x = -Math.PI / 2; rangeFill.visible = false;
  markerGroup.add(hoverRing, rangeRing, rangeFill);
  disposables.push(ringGeometry, hoverRing.material, rangeRing.material, rangeFill.geometry, rangeFill.material);
  const trapPool = [], trapGeometry = new THREE.CircleGeometry(.34, 20);
  disposables.push(trapGeometry);
  function trapDisc(i) {
    let disc = trapPool[i];
    if (!disc) {
      disc = new THREE.Mesh(trapGeometry, new THREE.MeshBasicMaterial({ color: 0xc6a35c, transparent: true, opacity: .8, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2;
      markerGroup.add(disc);
      trapPool[i] = disc;
    }
    disc.visible = true;
    return disc;
  }
  const effectRingPool = [];
  function effectRing(i) {
    let ring = effectRingPool[i];
    if (!ring) {
      ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0x8edcff, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      markerGroup.add(ring);
      effectRingPool[i] = ring;
    }
    ring.visible = true;
    return ring;
  }

  // Flat glowing strips: synergy links between towers and lane shots.
  const stripGeometry = new THREE.PlaneGeometry(1, 1);
  stripGeometry.translate(.5, 0, 0);   // origin at one end, +x along the strip
  disposables.push(stripGeometry);
  function makeStripPool() {
    const pool = [];
    return {
      acquire(i) {
        let mesh = pool[i];
        if (!mesh) {
          mesh = new THREE.Mesh(stripGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
          mesh.rotation.order = 'YXZ';
          markerGroup.add(mesh);
          pool[i] = mesh;
        }
        mesh.visible = true;
        return mesh;
      },
      release(from) { for (let i = from; i < pool.length; i++) pool[i].visible = false; },
      dispose() { for (const mesh of pool) mesh.material.dispose(); }
    };
  }
  const linkPool = makeStripPool(), lanePool = makeStripPool();
  function layStrip(mesh, x0, y0, x1, y1, width, lift) {
    const dx = x1 - x0, dy = y1 - y0, length = Math.max(.01, Math.hypot(dx, dy));
    const h = Math.max(groundHeight(x0, y0), groundHeight(x1, y1)) + lift;
    mesh.position.set(x0, h, y0);
    mesh.rotation.set(-Math.PI / 2, -Math.atan2(dy, dx), 0);
    mesh.scale.set(length, width, 1);
  }

  // Rubble sinks away over a moment when its gate breaches, instead of vanishing.
  const rubbleOpenedAt = new Map();
  let lastOpenRoutes = 0;

  // ---- camera --------------------------------------------------------------
  // Post: linear render -> bloom (tiered) -> grade (exposure, ACES, vignette, sRGB).
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = quality.bloom ? new UnrealBloomPass(new THREE.Vector2(512, 512), .55, .35, .82) : null;
  if (bloom) composer.addPass(bloom);
  const grade = new ShaderPass(GRADE_SHADER);
  grade.uniforms.uVignette.value = quality.tier === 'phone' ? .45 : .55;
  composer.addPass(grade);

  let width = 1, height = 1, baseDistance = 24;
  const target = new THREE.Vector3(KEEP_CENTER.x, .5, KEEP_CENTER.y);
  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width || innerWidth); height = Math.max(1, rect.height || innerHeight);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    if (bloom) bloom.setSize(Math.round(width / 2), Math.round(height / 2));
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Cover framing like the 2D board: whichever of width and depth fits at
    // the nearer distance wins, the other axis crops and the player pans.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fitWidth = (COLS / 2 + .4) / (halfTan * camera.aspect);
    const fitDepth = (ROWS * Math.sin(PITCH) / 2 + .6) / halfTan;
    baseDistance = Math.min(fitWidth, fitDepth);
  }
  function pxPerTile(zoom = 1) {
    return height / (2 * (baseDistance / zoom) * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  }
  function applyCamera(view) {
    const zoom = Math.max(.4, Math.min(4, view?.camera?.zoom || 1));
    const ppt = pxPerTile(zoom);
    const panX = -(view?.camera?.panX || 0) / ppt, panZ = -(view?.camera?.panY || 0) / (ppt * Math.sin(PITCH));
    target.set(
      Math.max(1.5, Math.min(COLS - 1.5, KEEP_CENTER.x + panX)),
      groundHeight(KEEP_CENTER.x, KEEP_CENTER.y) + .4,
      Math.max(2, Math.min(ROWS - 1, KEEP_CENTER.y + .6 + panZ)));
    const focus = view?.camera?.focus;
    if (focus && focus.w > 0) {
      // Spawn points sit outside the walls; keep the look-at inside the arena.
      const w = Math.min(1, focus.w), fx = Math.max(1.5, Math.min(COLS - 1.5, focus.x)), fz = Math.max(2.5, Math.min(ROWS - 2.5, focus.y));
      target.x += (fx - target.x) * w;
      target.y += (groundHeight(fx, fz) + .4 - target.y) * w;
      target.z += (fz - target.z) * w;
    }
    const distance = baseDistance / zoom;
    camera.position.set(target.x, target.y + Math.sin(PITCH) * distance, target.z + Math.cos(PITCH) * distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  function worldAt(clientX, clientY) {
    const rect = host.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // Two passes: a flat guess finds the tile, then the tile's own height refines it.
    let plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.45);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundHeight(hit.x, hit.z));
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x, y: hit.z };
  }
  const projected = new THREE.Vector3();
  function project(x, y, h = groundHeight(x, y)) {
    projected.set(x, h, y).project(camera);
    return { x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height, visible: projected.z < 1 };
  }

  // ---- per-frame -----------------------------------------------------------
  const keepEmissive = new THREE.Color(0x000000);
  function render(view) {
    wind.value = view.time || 0;
    applyCamera(view);
    if (keepMaterials.length && !LOOK_OFF.has('nokeepemissive')) {
      const damage = 1 - Math.max(0, Math.min(1, view.keepHp ?? 1));
      keepEmissive.setRGB(damage * .32, damage * .04, 0);
      for (const material of keepMaterials) if (material.emissive) material.emissive.copy(keepEmissive);
    }
    const openRoutes = view.openRoutes || 1;
    if (openRoutes < lastOpenRoutes) rubbleOpenedAt.clear();   // a new battle re-seals the gates
    lastOpenRoutes = openRoutes;
    for (const [i, road] of KEEP_ROAD_ORDER.entries()) {
      const open = i < openRoutes;
      if (open && !rubbleOpenedAt.has(road)) rubbleOpenedAt.set(road, i === 0 ? -1e9 : view.time || 0);
      if (!open) rubbleOpenedAt.delete(road);
      const t = open ? Math.min(1, ((view.time || 0) - rubbleOpenedAt.get(road)) / .8) : 0;
      for (const piece of rubble.get(road) || []) {
        if (piece.userData.restY === undefined) { piece.userData.restY = piece.position.y; piece.userData.restScale = piece.scale.x; }
        piece.visible = !open || t < 1;
        piece.position.y = piece.userData.restY - t * .9;
        piece.scale.setScalar(piece.userData.restScale * (1 - t * .5));
      }
    }

    for (const pad of pads.values()) pad.visible = false;
    if (view.placing && view.placing !== 'trap') for (const slot of view.pads || []) {
      const pad = pads.get(`${slot.x},${slot.y}`);
      if (!pad) continue;
      pad.visible = true;
      const hovered = view.hover && view.hover.x === slot.x && view.hover.y === slot.y;
      pad.material = hovered ? padMaterials.hover : slot.valid ? padMaterials.valid : padMaterials.blocked;
    }
    hoverRing.visible = !!(view.placing && view.hover);
    if (hoverRing.visible) {
      const { x, y, valid } = view.hover;
      hoverRing.position.set(x + .5, groundHeight(x + .5, y + .5) + .06, y + .5);
      hoverRing.scale.setScalar(view.placing === 'trap' ? .38 : .46);
      hoverRing.material.color.set(valid ? 0x56dd82 : 0xe05262);
    }
    rangeRing.visible = rangeFill.visible = !!view.selected;
    if (view.selected) {
      const { x, y, range } = view.selected, cx = x + .5, cy = y + .5, h = groundHeight(cx, cy) + .08;
      rangeRing.position.set(cx, h, cy); rangeRing.scale.setScalar(range);
      rangeFill.position.set(cx, h, cy); rangeFill.scale.setScalar(range);
    }

    let n = 0, blobs = 0;
    for (const sprite of view.sprites || []) {
      const img = sprite.img;
      if (!img || !img.complete || img.naturalWidth < sprite.cell) continue;
      const mesh = spritePool.acquire(n++);
      mesh.material.map = textureFor(img, img.src);
      if (mesh.customDepthMaterial) mesh.customDepthMaterial.map = mesh.material.map;
      if (!sprite.lift) contactShadow(blobs++, sprite.x, sprite.y, sprite.size / 64 * .55);
      mesh.material.opacity = sprite.alpha ?? 1;
      mesh.material.color.copy(sprite.tint ? cssColor(sprite.tint) : cssColor('#ffffff'));
      setFrameUV(mesh.geometry, img, sprite.cell, sprite.frame || 0, sprite.row || 0);
      const size = sprite.size / 64;
      mesh.scale.set(size, size, 1);
      mesh.position.set(sprite.x, groundHeight(sprite.x, sprite.y) - size * .3 + (sprite.lift || 0), sprite.y);
      orient(mesh, sprite.x, sprite.y, sprite.lean ?? SPRITE_LEAN);
    }
    spritePool.release(n);

    n = 0;
    for (const tower of view.towers || []) {
      if (!tower.canvas) continue;
      const mesh = towerPool.acquire(n++);
      mesh.material.map = textureFor(tower.canvas, tower.key);
      mesh.material.opacity = 1;
      mesh.material.color.set(0xffffff);
      setFullUV(mesh.geometry);
      const size = tower.canvas.width / 64;
      mesh.scale.set(size, size * tower.canvas.height / tower.canvas.width, 1);
      const cx = tower.x + .5, cy = tower.y + .5;
      mesh.position.set(cx, groundHeight(cx, cy) - (tower.baseline ?? .33), cy);
      if (mesh.customDepthMaterial) mesh.customDepthMaterial.map = mesh.material.map;
      contactShadow(blobs++, cx, cy, 1.1);
      orient(mesh, cx, cy, SPRITE_LEAN * .8);
    }
    towerPool.release(n);
    for (let i = blobs; i < blobPool.length; i++) blobPool[i].visible = false;

    n = 0;
    for (const shot of view.shots || []) {
      const sprite = shotSprite(n++);
      sprite.material.color.copy(cssColor(shot.color, '#fff2c5'));
      sprite.scale.setScalar(shot.size || .38);
      sprite.position.set(shot.x, groundHeight(shot.x, shot.y) + .55, shot.y);
    }
    for (let i = n; i < shotPool.length; i++) shotPool[i].visible = false;

    n = 0;
    for (const trap of view.traps || []) {
      const disc = trapDisc(n++);
      disc.material.color.copy(cssColor(trap.color, '#c6a35c'));
      disc.position.set(trap.x + .5, groundHeight(trap.x + .5, trap.y + .5) + .04, trap.y + .5);
    }
    for (let i = n; i < trapPool.length; i++) trapPool[i].visible = false;

    n = 0;
    for (const ring of view.rings || []) {
      const mesh = effectRing(n++);
      mesh.material.color.copy(cssColor(ring.color, '#8edcff'));
      mesh.material.opacity = ring.alpha ?? .5;
      mesh.position.set(ring.x, groundHeight(ring.x, ring.y) + .1, ring.y);
      mesh.scale.setScalar(Math.max(.05, ring.radius));
    }
    for (let i = n; i < effectRingPool.length; i++) effectRingPool[i].visible = false;

    n = 0;
    for (const link of view.links || []) {
      const mesh = linkPool.acquire(n++);
      mesh.material.color.copy(cssColor(link.color, '#ffe58a'));
      mesh.material.opacity = (link.alpha ?? .5) * .8;
      layStrip(mesh, link.ax, link.ay, link.bx, link.by, .09, .22);
    }
    linkPool.release(n);

    n = 0;
    for (const lane of view.lanes || []) {
      const mesh = lanePool.acquire(n++);
      const d = Math.max(.2, lane.length * lane.q);
      mesh.material.color.copy(cssColor(lane.color, '#d9ecff'));
      mesh.material.opacity = .25 + .65 * (1 - lane.q);
      layStrip(mesh, lane.x, lane.y, lane.x + lane.dx * d, lane.y + lane.dy * d, .16, .45);
    }
    lanePool.release(n);

    n = 0;
    for (const p of view.particles || []) {
      if (n >= PARTICLE_CAP) break;
      const c = cssColor(p.color, '#ffffff'), a = Math.max(0, Math.min(1, p.alpha ?? 1));
      particlePositions[n * 3] = p.x; particlePositions[n * 3 + 1] = groundHeight(p.x, p.y) + (p.lift ?? .35); particlePositions[n * 3 + 2] = p.y;
      particleColors[n * 3] = c.r * a; particleColors[n * 3 + 1] = c.g * a; particleColors[n * 3 + 2] = c.b * a;
      n++;
    }
    particleGeometry.setDrawRange(0, n);
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;

    for (const torch of torches) {
      const t = (view.time || 0) * 11 + torch.seed;
      const flicker = .82 + .13 * Math.sin(t) + .05 * Math.sin(t * 2.7 + 1.3);
      torch.light.intensity = torch.base * flicker;
      torch.flame.material.opacity = .55 + .35 * flicker;
    }
    if (LOOK_OFF.has('nopost')) renderer.render(scene, camera); else composer.render();
  }

  let lost = false;
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; onContextLost?.(); }, false);

  function dispose() {
    spritePool.dispose(); towerPool.dispose(); linkPool.dispose(); lanePool.dispose();
    for (const s of shotPool) s.material.dispose();
    for (const d of trapPool) d.material.dispose();
    for (const r of effectRingPool) r.material.dispose();
    for (const t of textures.values()) t.dispose();
    textures.clear();
    arena.traverse(node => { if (node.isMesh) { node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach(m => m.dispose()); else node.material?.dispose(); } });
    for (const d of disposables) d.dispose?.();
    for (const torch of torches) torch.flame.material.dispose();
    for (const blob of blobPool) blob.material.dispose();
    composer.dispose?.();
    bloom?.dispose?.();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch { /* already gone */ }
    canvas.remove();
  }

  resize();
  return {
    canvas, ready, dressed, render, resize, dispose, worldAt, project,
    get lost() { return lost; },
    get quality() { return quality; },
    stats() { return { keep: keepMaterials.map(m => ({ name: m.name, type: m.type, color: m.color?.getHexString(), emissive: m.emissive?.getHexString(), vc: m.vertexColors, metal: m.metalness, rough: m.roughness, side: m.side, transparent: m.transparent, opacity: m.opacity })), grass: grass?.count || 0, stones: stones?.count || 0, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: textures.size, rubble: Object.fromEntries(KEEP_ROAD_ORDER.map(road => [road, (rubble.get(road) || []).slice(0, 1).map(p => ({ visible: p.visible, y: +p.position.y.toFixed(2), s: +p.scale.x.toFixed(2) }))[0] || null])) }; }
  };
}
