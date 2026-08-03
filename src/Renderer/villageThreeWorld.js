// V33.0.1 — Safe Master / The Living Village: citizen jobs, day/night, familiar companion, construction staging, interiors, and ambience.
// V32.7.1 — Citizen visibility repair: resilient sprite loading, correct texture clones, larger grounded NPCs, and guaranteed central spawns.
// V32.6.7 — Living Village pass: layered terrain, connected paths, animated atmosphere, and lightweight NPC life.
// V32.6.2 — Three.js loaders reject with a DOM ErrorEvent, which has no
// `.message`. Reading `.message` blindly produced the misleading
// "Unknown WebGL error" banner for what was really a 404 on an art file.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VILLAGE_MODELS, VILLAGE_BOUNDS, VILLAGE_RIVER, DISTRICTS, MODEL_FOR_BUILDING, PRIMARY_ROADS, SECONDARY_ROADS, LANDMARKS, PLOT_POSITIONS, CITIZEN_SCHEDULE_NODES, modelForBuilding } from '../Village/worldRegistry.js';
import { createBespokeBridge, createBespokeCathedral, createDistrictGateway } from '../Village/bespokeArchitecture.js';
import { AUTHORED_BUILDING_IDS, createAuthoredBuilding } from '../Village/authoredBuildingFactory.js';
import { RELEASE_VERSION } from '../config/release.js';

const MATERIAL_ATLAS_URL=new URL('../../assets/village/v2/gothic_material_atlas_v2.png',import.meta.url).href;
const ARCHITECTURE_ATLAS_URL=new URL('../../assets/village/v2/gothic_architecture_atlas_v2.png',import.meta.url).href;

export function describeLoadError(err){
  if(!err)return 'unknown error';
  if(typeof err==='string')return err;
  if(err.message)return err.message;
  const src=err.target?.src||err.path?.[0]?.src;
  if(src)return 'could not load '+String(src).split('/').pop().split('?')[0];
  return err.type?('asset load failed ('+err.type+')'):'unknown error';
}

export async function createVillageThreeWorld({ viewport, world, getShadowState, readPlots, buildingDefs, getBuildState, onPlotSelected }) {
  const runtimeProof=Object.freeze({
    message:'VILLAGE 2 RUNTIME VERIFIED',renderer:'Three.js WebGLRenderer',
    worldImplementation:'src/Renderer/villageThreeWorld.js',
    buildingFactory:'src/Village/authoredBuildingFactory.js',
    nightSystem:'permanent-midnight / villageThreeWorld.js',buildVersion:RELEASE_VERSION
  });
  window.__VILLAGE_RUNTIME__=runtimeProof;
  console.info('VILLAGE 2 RUNTIME VERIFIED');
  console.table(runtimeProof);
  // V32.6.2 — pre-flight the GPU before Three.js does. iOS Safari enforces a
  // browser-wide WebGL context budget; with several tabs open, context creation
  // simply returns null and Three throws an opaque internal error. Asking first
  // lets us report the real cause instead of "Unknown WebGL error".
  (function preflightWebGL(){
    const probe=document.createElement('canvas');
    const gl=probe.getContext('webgl2')||probe.getContext('webgl')||probe.getContext('experimental-webgl');
    if(!gl)throw new Error('This browser could not create a WebGL context. On iPad, closing other Safari tabs usually frees one.');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  })();

  const canvas = document.createElement('canvas');
  canvas.id = 'villageThreeCanvas';
  canvas.setAttribute('aria-label', 'Three-dimensional Village world');
  viewport.prepend(canvas);

  let runtimeProofOverlay=null;
  if(import.meta.env.DEV && new URLSearchParams(location.search).has('runtimeProof')){
    runtimeProofOverlay=document.createElement('pre');runtimeProofOverlay.id='villageRuntimeProof';
    runtimeProofOverlay.textContent=`VILLAGE 2 RUNTIME VERIFIED\nrenderer: ${runtimeProof.renderer}\nworld: ${runtimeProof.worldImplementation}\nbuildings: ${runtimeProof.buildingFactory}\nnight: ${runtimeProof.nightSystem}\nbuild: ${runtimeProof.buildVersion}`;
    Object.assign(runtimeProofOverlay.style,{position:'absolute',left:'12px',top:'118px',zIndex:'80',margin:'0',padding:'8px 10px',maxWidth:'min(420px,calc(100vw - 24px))',whiteSpace:'pre-wrap',font:'10px/1.35 monospace',color:'#bfffc8',background:'rgba(3,10,7,.9)',border:'1px solid #4baa65',borderRadius:'7px',pointerEvents:'none'});
    viewport.append(runtimeProofOverlay);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x091018);
  // Visual lighting is permanently crisp night; gameplay time remains intact.
  scene.fog = null;

  // V32.6.2 — antialias is disabled on mobile GPUs. MSAA on a retina iPad costs
  // more than it returns at this camera distance, and it is a common trigger for
  // the renderer failing outright on memory-tight devices.
  const MOBILE_GPU = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE_GPU, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE_GPU ? 1.35 : 1.65));
  renderer.shadowMap.enabled = true;
  // V32.6.4 — the Village is a static diorama: buildings, terrain and trees are
  // the only shadow casters, and the player is a Sprite, which Three.js never
  // casts from. Re-rendering the whole village into the depth map 60 times a
  // second was pure waste on an iPad, and re-projecting it every frame is also
  // what let residual acne crawl. The map is now rendered on demand only.
  // requestShadowUpdate() must be called whenever a caster is added or moved.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = MOBILE_GPU ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;

  // V32.6.4 — near was 0.1 against a far of 300, a 3000:1 ratio that throws away
  // almost all depth precision. The follow camera sits at a fixed (0,16,22)
  // offset, so nothing is ever within ~15 units of it; a near plane of 1 is
  // completely safe and buys roughly 10x the depth resolution, which on a 16-bit
  // mobile depth buffer is the difference between 0.98 and 0.10 world units of
  // precision at the far side of the village.
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 260);
  const cameraOffset = new THREE.Vector3(0, 16, 22);
  const lookOffset = new THREE.Vector3(0, 2.2, -7);

  scene.add(new THREE.HemisphereLight(0x526b91, 0x070708, .68));
  const moon = new THREE.DirectionalLight(0xa9c8ff, 1.75);
  moon.position.set(-28, 42, 18);
  moon.castShadow = true;
  // A warmer low fill preserves readable doors and timber without washing out the night.
  const villageFill=new THREE.DirectionalLight(0x9b735c,.30);villageFill.position.set(24,18,-28);scene.add(villageFill);
  // V32.6.4 — shadow acne repair.
  //
  // This is what made every roof flash while the player walked. V32.6.2 halved
  // the shadow map to 1024 on mobile to save memory but left the bias values
  // that had been tuned for 2048. Halving the map doubles the world size of a
  // shadow texel, so `normalBias` of 0.025 was about 4x too small to clear the
  // depth error — the surface shadowed itself in stripes, and because the camera
  // translates while the map does not, that striping crawled across every lit
  // roof face as you moved.
  //
  // Both values are now derived from the geometry instead of hard-coded, so
  // changing the resolution or the frustum can never desynchronise them again.
  const SHADOW_MAP_SIZE = MOBILE_GPU ? 1024 : 2048;
  const SHADOW_EXTENT = 52;                       // half-width of the lit area
  const SHADOW_TEXEL = (SHADOW_EXTENT * 2) / SHADOW_MAP_SIZE;
  moon.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  moon.shadow.camera.left = -SHADOW_EXTENT; moon.shadow.camera.right = SHADOW_EXTENT;
  moon.shadow.camera.top = SHADOW_EXTENT;   moon.shadow.camera.bottom = -SHADOW_EXTENT;
  // The light sits ~53.6 units from the origin and the scene is ~110 across, so
  // the useful depth range is about 1 to 140. Three.js defaults a directional
  // light to 0.5/500, which wastes ~3.6x of the shadow map's depth resolution.
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 140;
  // normalBias offsets the lookup along the surface normal in world units, so it
  // must scale with the texel footprint. bias stays small and negative.
  moon.shadow.normalBias = SHADOW_TEXEL * 1.7;
  moon.shadow.bias = -0.0005;
  moon.shadow.camera.updateProjectionMatrix();
  scene.add(moon);

  // V33 — accelerated day/night cycle. One full village day lasts 12 real minutes.
  const dayNightBadge=document.createElement('div');
  dayNightBadge.className='village-day-night-badge';
  Object.assign(dayNightBadge.style,{position:'absolute',right:'16px',top:'66px',zIndex:'35',padding:'6px 10px',border:'1px solid rgba(218,181,111,.38)',borderRadius:'999px',background:'rgba(7,10,16,.72)',color:'#ecd59e',font:'600 11px Georgia,serif',letterSpacing:'.08em',pointerEvents:'none'});
  viewport.append(dayNightBadge);
  // The Last Safe Haven is permanently at midnight. A simulated clock used to
  // leak DAY/DAWN into the HUD even though rendering was intended to stay dark.
  const villageClock=()=>({phase:.75,hour:0,label:'NIGHT'});

  const mats = {
    ground: new THREE.MeshStandardMaterial({ color: 0x101713, roughness: 1 }),
    road: new THREE.MeshStandardMaterial({ color: 0x292a2d, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x3f3e42, roughness: .95 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x28282d, roughness: .95 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x121720, roughness: .82 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x3a291f, roughness: 1 }),
    crop: new THREE.MeshStandardMaterial({ color: 0x5a522b, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x142419, roughness: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x071b2a, roughness: .28, transparent: true, opacity: .96 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xffb253, emissive: 0xff7718, emissiveIntensity: 2.3 }),
    armor: new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: .68, metalness: .32 }),
    cape: new THREE.MeshStandardMaterial({ color: 0x4b171c, roughness: .72 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xb6bfca, metalness: .88, roughness: .18 })
  };


  // V32.5.7 — lightweight procedural textures keep this build self-contained and mobile-safe.
  // Safari only shipped CanvasRenderingContext2D.roundRect in 16.4. Without this
  // guard the cobble texture painter throws on older iPads and takes the whole
  // 3D village down with it.
  if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
      const rad=Math.min(typeof r==='number'?r:0,Math.abs(w)/2,Math.abs(h)/2);
      this.moveTo(x+rad,y);
      this.arcTo(x+w,y,x+w,y+h,rad);
      this.arcTo(x+w,y+h,x,y+h,rad);
      this.arcTo(x,y+h,x,y,rad);
      this.arcTo(x,y,x+w,y,rad);
      this.closePath();
      return this;
    };
  }
  function canvasTexture(size, painter, repeatX=1, repeatY=1){
    const c=document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d');painter(ctx,size);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);
    t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
    if('encoding' in t&&THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;
    return t;
  }
  const grassTexture=canvasTexture(256,(ctx,n)=>{
    ctx.fillStyle='#121b17';ctx.fillRect(0,0,n,n);
    let seed=3257;const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    for(let i=0;i<2200;i++){
      const v=28+Math.floor(rnd()*28);ctx.fillStyle=`rgba(${v-7},${v+10},${v-8},${.12+rnd()*.18})`;
      ctx.fillRect(rnd()*n,rnd()*n,1+rnd()*2,1+rnd()*3);
    }
  },11,10);
  const cobbleTexture=canvasTexture(256,(ctx,n)=>{
    ctx.fillStyle='#28292c';ctx.fillRect(0,0,n,n);
    ctx.strokeStyle='rgba(20,20,21,.48)';ctx.lineWidth=3;
    for(let y=-18;y<n+20;y+=22){const off=((y/22)&1)*18;for(let x=-36;x<n+36;x+=36){
      ctx.beginPath();ctx.roundRect(x+off,y,32,17,5);ctx.fillStyle=`rgba(${72+(x+y)%12},${70+(x+y)%10},${66+(x+y)%8},.9)`;ctx.fill();ctx.stroke();
    }}
  },5,12);
  mats.ground.map=grassTexture;mats.ground.color.set(0xffffff);mats.ground.needsUpdate=true;
  mats.road.map=cobbleTexture;mats.road.color.set(0xffffff);mats.road.needsUpdate=true;

  // Village 2.0 authored material atlas. Each quadrant is extracted once into
  // its own repeatable GPU texture, avoiding UV bleed and per-model downloads.
  async function loadQuadrantAtlas(url){
    const image=await new Promise((resolve,reject)=>{const source=new Image();source.decoding='async';source.onload=()=>resolve(source);source.onerror=reject;source.src=url;});
    const quadrant=(qx,qy)=>{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.drawImage(image,qx*image.naturalWidth/2,qy*image.naturalHeight/2,image.naturalWidth/2,image.naturalHeight/2,0,0,512,512);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);if('encoding' in t&&THREE.sRGBEncoding)t.encoding=THREE.sRGBEncoding;return t;};
    return {q00:quadrant(0,0),q10:quadrant(1,0),q01:quadrant(0,1),q11:quadrant(1,1)};
  }
  let villageMaterials=null,architectureMaterials=null;
  try{const atlas=await loadQuadrantAtlas(MATERIAL_ATLAS_URL);villageMaterials={cobble:atlas.q00,slate:atlas.q10,wood:atlas.q01,masonry:atlas.q11};mats.road.map=villageMaterials.cobble;mats.road.needsUpdate=true;}catch(error){console.warn('[Village 2.0] material atlas unavailable; using procedural surfaces.',describeLoadError(error));}
  try{const atlas=await loadQuadrantAtlas(ARCHITECTURE_ATLAS_URL);architectureMaterials={tracery:atlas.q00,glass:atlas.q10,copper:atlas.q01,iron:atlas.q11,masonry:villageMaterials?.masonry||atlas.q00};}catch(error){console.warn('[Village 2.0] architecture atlas unavailable; using base materials.',describeLoadError(error));architectureMaterials={tracery:villageMaterials?.masonry,glass:villageMaterials?.slate,copper:villageMaterials?.slate,iron:villageMaterials?.masonry,masonry:villageMaterials?.masonry};}

  // V32.5.8 — all visible construction now uses the user's supplied gothic art.
  // No pale prototype houses remain in the authored world or saved construction plots.
  function tuneArtTexture(texture){
    texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;
    if('encoding' in texture&&THREE.sRGBEncoding)texture.encoding=THREE.sRGBEncoding;
    return texture;
  }
  function loadTextureOnce(url){
    return new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));
  }
  // V32.6.2 — a missing art file must never take the whole world down. Before
  // this, `assets/village/house_lv02.png` was absent from the build (only the
  // .heic source shipped), Promise.all rejected with a bare ErrorEvent that had
  // no .message, and the catch handler printed the misleading fallback string
  // "Unknown WebGL error" while wiping the Village DOM. Each texture now falls
  // back through alternates and finally to a procedural stand-in.
  const missingArt=[];
  async function loadArtTexture(urls,procedural){
    const list=Array.isArray(urls)?urls:[urls];
    for(const url of list){
      try{ return tuneArtTexture(await loadTextureOnce(url)); }
      catch(_err){ missingArt.push(url.split('?')[0]); }
    }
    return tuneArtTexture(procedural());
  }
  function loadGLB(url){
    return new Promise((resolve,reject)=>{
      new GLTFLoader().load(url,gltf=>resolve(gltf.scene),undefined,reject);
    });
  }

  /* ======================================================================
     V32.6.3 — THE GOTHIC GLB PACK
     Every building in the Village is now a real authored model from
     assets/village/The_Village_Gothic_GLBS_Phase1/. The former placeholder
     systems — a single house GLB cloned for every structure with bolt-on
     prop meshes, the PNG-cropped "diorama" boxes, the procedural house(),
     artFarm() and the hand-built cathedral() — have all been deleted.

     Pack conventions (see the pack's README.txt): GLB 2.0, Y-up, front faces
     +Z, ground at Y=0, PBR materials embedded, emissive windows, no external
     texture files.
     ====================================================================== */
  const GLB_ROOT='assets/village/The_Village_Gothic_GLBS_Phase1';
  const GLB_MODELS=VILLAGE_MODELS;

  function modelIdForType(type){
    if(MODEL_FOR_BUILDING[type])return MODEL_FOR_BUILDING[type];
    const t=String(type||'');
    // fall back to a keyword match so a new build type still gets sensible art
    if(/farm|orchard|herb|crop/i.test(t))return 'farm';
    if(/saw|lumber|wood|stable/i.test(t))return 'lumber_camp';
    if(/quarry|stone|mason/i.test(t))return 'quarry';
    if(/store|ware|market|granary|tan/i.test(t))return 'warehouse';
    if(/librar|observ|school|scriptor/i.test(t))return 'library';
    if(/alchem|apothec|potion/i.test(t))return 'alchemist';
    if(/enchant|rune|arcane|mage/i.test(t))return 'enchanter';
    if(/smith|forge|armor|workshop/i.test(t))return 'blacksmith';
    if(/tavern|inn|brew/i.test(t))return 'tavern';
    if(/keep|hall|tower|barrack|wall|palisade|garrison/i.test(t))return 'keep';
    if(/chapel|shrine|cathedral|reliquar|grave|temple/i.test(t))return 'cathedral';
    if(/mansion|palace/i.test(t))return 'house_lv5';
    if(/estate|townhall/i.test(t))return 'house_lv4';
    if(/manor/i.test(t))return 'house_lv3';
    if(/almshouse|bath/i.test(t))return 'house_lv2';
    return modelForBuilding(type);
  }

  const glbTemplates=new Map();
  const glbMissing=[];
  await Promise.all(GLB_MODELS.map(async id=>{
    try{
      const root=await loadGLB(`${GLB_ROOT}/${id}.glb?v=3410`);
      // Measure once so placement can normalise scale and recentre the footprint.
      const bounds=new THREE.Box3().setFromObject(root);
      const size=bounds.getSize(new THREE.Vector3());
      const centre=bounds.getCenter(new THREE.Vector3());
      root.traverse(obj=>{
        if(!obj.isMesh)return;
        obj.castShadow=true;
        const meshName=String(obj.name||'').toLowerCase();
        const isRoof=meshName.includes('roof')||meshName.includes('spire')||meshName.includes('canopy');
        // V32.6.5 — iPad roof-flash repair. The generated GLBs contain broad,
        // shallow roof faces. Letting those faces receive the directional-light
        // shadow map caused self-shadow precision noise (shadow acne), visible as
        // flashing stripes whenever the follow camera moved. Roofs still cast
        // shadows onto the world, but no longer receive the moon shadow themselves.
        obj.receiveShadow=!isRoof;
        const tune=m=>{
          if(!m)return m;
          if('envMapIntensity' in m)m.envMapIntensity=.45;
          // Cohesive Gothic palette for the procedural GLB library.
          const mn=String(m.name||'').toLowerCase();
          if(m.color){
            if(mn.includes('stone'))m.color.multiply(new THREE.Color(0.52,0.56,0.62));
            else if(mn.includes('roof')||mn.includes('slate'))m.color.multiply(new THREE.Color(0.36,0.42,0.55));
            else if(mn.includes('wood'))m.color.multiply(new THREE.Color(0.58,0.42,0.32));
          }
          if(!m.map){
            if(mn.includes('roof')||mn.includes('slate'))m.map=architectureMaterials?.copper||villageMaterials?.slate;
            else if(mn.includes('window')||mn.includes('glass'))m.map=architectureMaterials?.glass;
            else if(mn.includes('wood')||mn.includes('timber'))m.map=villageMaterials?.wood;
            else if(mn.includes('stone')||mn.includes('wall'))m.map=architectureMaterials?.masonry||villageMaterials?.masonry;
            else if(mn.includes('iron')||mn.includes('metal'))m.map=architectureMaterials?.iron;
          }
          if(m.emissive&&mn.includes('window')){m.emissive.setHex(0xff6f16);m.emissiveIntensity=Math.max(1.5,m.emissiveIntensity||0);}
          if(isRoof){
            m.polygonOffset=true;
            m.polygonOffsetFactor=1;
            m.polygonOffsetUnits=2;
            m.shadowSide=THREE.FrontSide;
            m.needsUpdate=true;
          }
          return m;
        };
        obj.material=Array.isArray(obj.material)?obj.material.map(tune):tune(obj.material);
      });
      glbTemplates.set(id,{root,size,centre,footprint:Math.max(size.x||1,size.z||1)});
    }catch(err){
      glbMissing.push(id);
      console.warn(`[Village Three.js] model ${id}.glb unavailable:`,describeLoadError(err));
    }
  }));
  if(!glbTemplates.size)throw new Error('No Village building models could be loaded from '+GLB_ROOT);
  if(glbMissing.length)console.warn('[Village Three.js] models missing, substituted:',glbMissing.join(', '));

  // A plot pad is ~6.9 units across, so a model is normalised to sit inside it.
  const PLOT_FOOTPRINT=6.2;
  const animatedCropRows=[];
  const buildingInstances=[];
  const interactiveBuildings=[];
  const BUILDING_LABELS={house_lv1:'House',house_lv2:'House Lv.2',house_lv3:'Manor',house_lv4:'Estate',house_lv5:'Mansion',farm:'Farm',lumber_camp:'Lumber Camp',quarry:'Quarry',warehouse:'Warehouse',library:'Library',alchemist:'Alchemist',enchanter:'Enchanter',blacksmith:'Blacksmith',tavern:'Tavern',keep:'Keep',cathedral:'Cathedral'};
  const BUILDING_ACTIONS={House:'View residents and upgrades',Farm:'Manage crops and workers','Lumber Camp':'Manage timber production',Quarry:'Manage stone production',Warehouse:'Review village storage',Library:'Open research',Alchemist:'Craft elemental essences',Enchanter:'Imbue equipment',Blacksmith:'Forge and upgrade equipment',Tavern:'Recruit hunters and hear rumors',Keep:'Manage familiars and kingdom progression',Cathedral:'Receive blessings'};
  function placeModel(id,x,z,{rot=0,fit=PLOT_FOOTPRINT,scale=null,parent=scene}={}){
    if(AUTHORED_BUILDING_IDS.has(id)){
      const g=createAuthoredBuilding(id,{textures:architectureMaterials});
      const authoredFootprint=id==='keep'?8:id==='warehouse'||id==='tavern'?7.5:7;
      const s=scale!==null?scale:(fit/authoredFootprint);
      g.position.set(x,0,z);g.rotation.y=rot;g.scale.setScalar(s);
      g.userData.modelId=id;g.userData.isVillageBuilding=true;g.userData.displayName=BUILDING_LABELS[id]||id.replaceAll('_',' ');
      parent.add(g);buildingInstances.push(g);interactiveBuildings.push({root:g,id,label:g.userData.displayName,position:new THREE.Vector3(x,0,z)});return g;
    }
    const entry=glbTemplates.get(id)||glbTemplates.get('house_lv1')||[...glbTemplates.values()][0];
    const g=entry.root.clone(true);
    // Each placement owns its geometry and materials so rebuilding the plot
    // group can never dispose the shared template.
    g.traverse(obj=>{
      if(!obj.isMesh)return;
      if(obj.geometry)obj.geometry=obj.geometry.clone();
      if(obj.material)obj.material=Array.isArray(obj.material)?obj.material.map(m=>m.clone()):obj.material.clone();
      obj.castShadow=true;
      const meshName=String(obj.name||'').toLowerCase();
      const isRoof=meshName.includes('roof')||meshName.includes('spire')||meshName.includes('canopy');
      obj.receiveShadow=!isRoof;
      const mats=Array.isArray(obj.material)?obj.material:[obj.material];
      mats.filter(Boolean).forEach(m=>{
        if(isRoof){
          m.polygonOffset=true;
          m.polygonOffsetFactor=1;
          m.polygonOffsetUnits=2;
          m.shadowSide=THREE.FrontSide;
          m.needsUpdate=true;
        }
      });
    });
    if(id==='farm'){
      g.traverse(obj=>{
        if(!obj.isMesh||!String(obj.name||'').toLowerCase().includes('croprow'))return;
        obj.castShadow=false;
        animatedCropRows.push({mesh:obj,baseY:obj.position.y,phase:animatedCropRows.length*.73});
      });
    }
    const s=scale!==null?scale:(fit/(entry.footprint||1));
    // recentre horizontally on the plot; the pack already grounds models at Y=0
    g.position.set(x-(entry.centre?.x||0)*s,0,z-(entry.centre?.z||0)*s);
    g.rotation.y=rot;
    g.scale.setScalar(s);
    g.userData.modelId=id;
    g.userData.isVillageBuilding=true;
    g.userData.displayName=BUILDING_LABELS[id]||id.replaceAll('_',' ');
    parent.add(g);
    buildingInstances.push(g);
    interactiveBuildings.push({root:g,id,label:g.userData.displayName,position:new THREE.Vector3(x,0,z)});
    return g;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(112, 100), mats.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  function box(x,z,w,d,h=.08,mat=mats.road,y=h/2){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=h>.2;scene.add(m);return m; }
  // V32.5.3 — coherent authored terrain. The river is now a straight, explicit
  // channel and every crossing has full bank-to-bank road connections.
  PRIMARY_ROADS.forEach(([x,z,w,d])=>box(x,z,w,d));

  const river = new THREE.Mesh(new THREE.PlaneGeometry(10, 112), mats.water);
  river.rotation.x=-Math.PI/2; river.position.set(-18,.06,0); scene.add(river);

  // Diorama terrain banks and stone retaining walls make the world read as a miniature,
  // rather than one endless flat prototype plane.
  for(const bankX of [-23.6,-12.4]){
    const bank=new THREE.Mesh(new THREE.BoxGeometry(1.2,.72,100),mats.darkStone);
    bank.position.set(bankX,.18,0);bank.receiveShadow=bank.castShadow=true;scene.add(bank);
  }
  for(const [x,z,w,d] of [[-39,-19,25,29],[31,-19,35,29],[-39,20,25,27],[31,21,35,25],[0,34,20,16]]){
    const terrace=new THREE.Mesh(new THREE.BoxGeometry(w,.34,d),mats.ground);
    terrace.position.set(x,.15,z);terrace.receiveShadow=true;scene.add(terrace);
  }

  // V32.6.7 — gentle sculpted terrain. These low, broad mounds preserve all
  // navigation coordinates while breaking up the old tabletop-flat silhouette.
  const terrainMounds=[];
  for(const [x,z,sx,sz,h] of [[-43,-32,18,13,.55],[39,-30,20,14,.48],[-43,31,17,12,.42],[39,33,19,13,.46],[0,39,24,10,.34]]){
    const mound=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),mats.ground);
    mound.scale.set(sx,h,sz);mound.position.set(x,-.02,z);mound.receiveShadow=true;scene.add(mound);terrainMounds.push(mound);
  }

  // Short stone walkways connect occupied districts to the main roads. They are
  // visual-only and deliberately sit below Shadow's navigation plane.
  const walkwayMat=mats.road.clone();walkwayMat.color.multiplyScalar(.82);
  function walkway(x,z,w,d,rot=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.045,d),walkwayMat);m.position.set(x,.075,z);m.rotation.y=rot;m.receiveShadow=true;scene.add(m);return m;}
  SECONDARY_ROADS.forEach(v=>walkway(...v));

  // Irregular paved precincts break up the empty lawn without reintroducing a
  // visible tile grid. Each district receives a slightly different moonlit tint.
  DISTRICTS.forEach((district,index)=>{
    const [cx,cz]=district.center,rx=index===0?10:8.5,rz=index===0?8:6.6;
    const shape=new THREE.Shape();
    [[-rx*.82,-rz],[-rx,-rz*.2],[-rx*.72,rz*.86],[0,rz],[rx*.86,rz*.72],[rx,0],[rx*.68,-rz*.88]].forEach(([px,pz],i)=>i?shape.lineTo(px,pz):shape.moveTo(px,pz));shape.closePath();
    const tint=new THREE.Color(district.accent).multiplyScalar(.28);
    const material=new THREE.MeshStandardMaterial({map:villageMaterials?.cobble||cobbleTexture,color:tint,roughness:1,transparent:true,opacity:.72,polygonOffset:true,polygonOffsetFactor:-1});
    const precinct=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);precinct.rotation.x=-Math.PI/2;precinct.position.set(cx,.085,cz);precinct.receiveShadow=true;scene.add(precinct);
  });

  function bridge(x,z){
    const g=new THREE.Group();
    const deck=new THREE.Mesh(new THREE.BoxGeometry(20,.8,5.4),mats.darkStone);
    deck.position.y=.5; deck.castShadow=deck.receiveShadow=true; g.add(deck);
    for(const side of [-1,1]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(20,.72,.42),mats.stone);
      rail.position.set(0,1.05,side*2.35); rail.castShadow=true; g.add(rail);
    }
    // Solid abutments remove the unfinished floating ends visible in V32.5.2.
    for(const side of [-1,1]){
      const abutment=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.6,6.2),mats.stone);
      abutment.position.set(side*9.2,.55,0); abutment.castShadow=abutment.receiveShadow=true; g.add(abutment);
    }
    g.position.set(x,0,z); scene.add(g);
  }
  createBespokeBridge({scene,x:-18,z:-5,textures:architectureMaterials});
  createBespokeBridge({scene,x:-18,z:23,textures:architectureMaterials});







  // V32.6.3 — authored landmarks, every one a real model from the pack.
  // The cathedral anchors the head of the village; the industry and civic
  // buildings frame the outer roads.
  // V32.6.8 — every authored landmark now faces its nearest street/plaza.
  // The Phase 1 GLBs define their front door on local +Z.
  LANDMARKS.filter(([id])=>id!=='cathedral').forEach(([id,x,z,opts])=>placeModel(id,x,z,opts));
  createBespokeCathedral({scene,x:0,z:-37,textures:architectureMaterials});
  createDistrictGateway({scene,x:10,z:-13,rotation:0,textures:architectureMaterials,accent:0x7b2332});
  createDistrictGateway({scene,x:10,z:31,rotation:0,textures:architectureMaterials,accent:0x3e426f});
  createDistrictGateway({scene,x:27,z:23,rotation:Math.PI/2,textures:architectureMaterials,accent:0x7a4a24});

  // V32.6.6 — reusable Gothic environment library. These are real GLB props,
  // deliberately instanced sparsely so the iPad receives richer streets without
  // turning the Village into a GPU stress test.
  const PROP_LAYOUT=[
    ['statue',0,-18,{scale:1.15}],
    ['market_stall',25,18,{rot:-.12,scale:1.15}],['market_stall',31,18,{rot:.08,scale:1.05}],
    ['wagon',35,25,{rot:-.35,scale:.9}],['wagon',-36,28,{rot:.24,scale:.85}],
    ['bench',-7,-12,{rot:Math.PI/2,scale:1}],['bench',7,-12,{rot:Math.PI/2,scale:1}],
    ['bench',-8,27,{rot:Math.PI/2,scale:.95}],['bench',8,27,{rot:Math.PI/2,scale:.95}],
    ['barrel',36,35,{scale:1}],['barrel',37.4,35.2,{scale:.85}],['barrel',-40,-23,{scale:.9}],
    ['rock_cluster',41,-20,{scale:1.4}],['rock_cluster',34,-31,{scale:1.2}],
    ['rock_cluster',-38,35,{scale:1.1}],['rock_cluster',-24,-31,{scale:1.0}],
    ['shrub',-10,-24,{scale:1.15}],['shrub',10,-24,{scale:1.15}],
    ['shrub',-22,18,{scale:1}],['shrub',21,18,{scale:1}],
    ['dead_tree',-47,18,{rot:.2,scale:1.05}],['dead_tree',46,-14,{rot:-.3,scale:1.1}],
    ['dead_tree',-31,-34,{rot:.12,scale:.9}],
  ];
  PROP_LAYOUT.forEach(([id,x,z,opts])=>placeModel(id,x,z,opts));

  // Low stone boundaries and wooden fences make the districts feel authored.
  for(const [x,z,rot] of [[-34,13,0],[-28,13,0],[28,13,0],[34,13,0],[-34,-11,0],[-28,-11,0],[28,-11,0],[34,-11,0]])
    placeModel('fence',x,z,{rot,scale:1.15});
  for(const [x,z,rot] of [[-22,-24,Math.PI/2],[22,-24,Math.PI/2],[-22,31,Math.PI/2],[22,31,Math.PI/2]])
    placeModel('stone_wall',x,z,{rot,scale:1.25});

  // Bridges are bespoke architecture and share the Cathedral's masonry/iron language.

  const treeTexture=canvasTexture(8,(ctx,n)=>{ctx.fillStyle='#17100e';ctx.fillRect(0,0,n,n)});
  const treeMaterial=new THREE.MeshStandardMaterial({color:0x17100e,roughness:1});
  const swayingTrees=[];
  function branchBetween(a,b,r0,r1,material){
    const delta=new THREE.Vector3().subVectors(b,a),mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,delta.length(),7),material);mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());mesh.castShadow=true;return mesh;
  }
  function tree(x,z,s=1){
    const g=new THREE.Group();
    const trunk=[new THREE.Vector3(0,0,0),new THREE.Vector3(.15,3.1,0),new THREE.Vector3(-.28,6.1,.1),new THREE.Vector3(.12,8.2,0)];
    for(let i=0;i<trunk.length-1;i++)g.add(branchBetween(trunk[i],trunk[i+1],.48-i*.1,.34-i*.08,treeMaterial));
    const limbs=[[-.28,5.6,.1,-2.5,7.1,.25],[-1.4,6.45,.18,-3.3,7.8,.45],[.02,6.8,.05,2.45,8.2,-.3],[1.35,7.55,-.15,3.05,8.65,-.5],[-.05,7.65,.05,-1.3,9.2,-.2],[.1,8.05,0,1.25,9.7,.15]];
    for(const [ax,ay,az,bx,by,bz] of limbs){const a=new THREE.Vector3(ax,ay,az),b=new THREE.Vector3(bx,by,bz);g.add(branchBetween(a,b,.22,.06,treeMaterial));const twig=b.clone().add(new THREE.Vector3(Math.sign(bx)*.65,.8,(bz||.2)*.5));g.add(branchBetween(b,twig,.09,.025,treeMaterial))}
    for(const [rx,rz] of [[-.55,.2],[.45,.15],[0,-.5]]){const root=branchBetween(new THREE.Vector3(0,.18,0),new THREE.Vector3(rx,0,rz),.22,.05,treeMaterial);g.add(root)}
    g.position.set(x,0,z);g.scale.setScalar(s);g.rotation.y=((x*17+z*11)%31)*.1;g.userData.phase=(x*13+z*7)*.1;swayingTrees.push(g);scene.add(g);
  }

  /* ======================================================================
     V34.1 — WHITE BRICK BOUNDARY WALLS
     The Village had an invisible wall. The walkable box is x -47..47,
     z -36..36, but the visible ground plane runs x -56..56, z -50..50 — so
     there were 9 units of ground on each side, and 14 front and back, that you
     could clearly see (trees sit out at x +/-51, z +/-38) but simply stopped
     dead against nothing. The boundary is now a real, visible wall that sits
     exactly on the collision line, so where you can walk and what you can see
     finally agree.

     Built as a handful of long boxes rather than per-brick geometry: the brick
     course comes from a tiling texture, so the whole ring is about a dozen draw
     calls and one extra material.
     ====================================================================== */
  const whiteBrickTexture=canvasTexture(256,(ctx,n)=>{
    ctx.fillStyle='#cfc9be';ctx.fillRect(0,0,n,n);          // mortar bed
    const rowH=26, brickW=54;
    for(let row=0,y=0;y<n+rowH;y+=rowH,row++){
      const off=(row&1)?brickW/2:0;
      for(let x=-brickW;x<n+brickW;x+=brickW){
        // slight per-brick variation so the wall does not read as flat paint
        const seed=((x*7+y*13)>>>0)%17;
        ctx.fillStyle=`rgb(${234-seed},${230-seed},${221-seed})`;
        ctx.fillRect(x+off+2,y+2,brickW-4,rowH-4);
        ctx.strokeStyle='rgba(150,144,133,.55)';ctx.lineWidth=1;
        ctx.strokeRect(x+off+2.5,y+2.5,brickW-5,rowH-5);
      }
    }
  },1,1);
  const brickMat=new THREE.MeshStandardMaterial({map:architectureMaterials.masonry||whiteBrickTexture,color:0x727985,roughness:.94});
  const brickCapMat=new THREE.MeshStandardMaterial({map:architectureMaterials.tracery||null,color:0x5c626d,roughness:.86});

  // Kept in one place so the collision box in villageBootstrap.js and the wall
  // that represents it can never drift apart again.
  // Sized from the authored content, not guessed: the village spans
  // x -47.2..44.5 and z -41.2..44.5 once the cathedral, the library, the
  // warehouse and the northernmost plot pads are included. The old walkable box
  // of z -36..36 cut the library and warehouse off entirely and stranded
  // buildable plots at z 41 that the player could construct on but never reach.
  const WALL = { ...VILLAGE_BOUNDS, height:5.2, thick:1.4 };
  // The river runs through the north and south walls; leave it a water gate.
  const WALL_RIVER = VILLAGE_RIVER;

  function brickRun(cx,cz,w,d){
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,WALL.height,d),brickMat.clone());
    // tile the brick to the run length instead of stretching one copy across it
    const along=Math.max(w,d);
    body.material.map=(architectureMaterials.masonry||whiteBrickTexture).clone();
    body.material.map.wrapS=body.material.map.wrapT=THREE.RepeatWrapping;
    body.material.map.repeat.set(Math.max(1,Math.round(along/7)),Math.max(1,Math.round(WALL.height/2.6)));
    body.material.map.needsUpdate=true;
    body.position.set(cx,WALL.height/2,cz);
    body.castShadow=true;body.receiveShadow=true;scene.add(body);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(w+.5,.45,d+.5),brickCapMat);
    cap.position.set(cx,WALL.height+.2,cz);
    cap.castShadow=true;cap.receiveShadow=true;scene.add(cap);
    return body;
  }
  function cornerTower(x,z){
    const g=new THREE.Group();
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.35,WALL.height+2.2,12),brickMat.clone());
    shaft.position.y=(WALL.height+2.2)/2;shaft.castShadow=shaft.receiveShadow=true;g.add(shaft);
    const crown=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,.5,12),brickCapMat);
    crown.position.y=WALL.height+2.45;crown.castShadow=true;g.add(crown);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.7,2.6,12),mats.roof);
    roof.position.y=WALL.height+4;roof.castShadow=true;g.add(roof);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.3,8,8),mats.glow);
    lamp.position.y=WALL.height+2.9;g.add(lamp);
    g.position.set(x,0,z);scene.add(g);
  }

  {
    const t=WALL.thick, hx=(WALL.maxX-WALL.minX), hz=(WALL.maxZ-WALL.minZ);
    // east and west run unbroken; their outer face sits on the collision line
    brickRun(WALL.minX-t/2, 0, t, hz+t*2);
    brickRun(WALL.maxX+t/2, 0, t, hz+t*2);
    // north and south split around the river so the water still flows through
    for(const z of [WALL.minZ-t/2, WALL.maxZ+t/2]){
      const leftW = (WALL_RIVER.minX - WALL.minX);
      brickRun(WALL.minX + leftW/2, z, leftW, t);
      const rightW = (WALL.maxX - WALL_RIVER.maxX);
      brickRun(WALL_RIVER.maxX + rightW/2, z, rightW, t);
      // a low arch across the water so the gap reads as intentional
      const span=WALL_RIVER.maxX-WALL_RIVER.minX;
      const arch=new THREE.Mesh(new THREE.BoxGeometry(span,1.5,t),brickCapMat);
      arch.position.set((WALL_RIVER.minX+WALL_RIVER.maxX)/2, WALL.height-0.5, z);
      arch.castShadow=true;arch.receiveShadow=true;scene.add(arch);
      for(const px of [WALL_RIVER.minX+.7, WALL_RIVER.maxX-.7]){
        const pier=new THREE.Mesh(new THREE.BoxGeometry(1.4,WALL.height,t),brickMat.clone());
        pier.position.set(px,WALL.height/2,z);pier.castShadow=pier.receiveShadow=true;scene.add(pier);
      }
    }
    cornerTower(WALL.minX-t/2, WALL.minZ-t/2);
    cornerTower(WALL.maxX+t/2, WALL.minZ-t/2);
    cornerTower(WALL.minX-t/2, WALL.maxZ+t/2);
    cornerTower(WALL.maxX+t/2, WALL.maxZ+t/2);
  }

  const TREE_LAYOUT=[[-47.6,-34,1.1],[-47,-20,0.9],[-47.6,-5,1],[-47.6,12,0.85],[-47.6,27,1.05],[-45,37,0.9],[-31,-36,0.8],[-12,-37,0.75],[13,-37,0.8],[31,-36,0.8],[47.6,-34,1.1],[45,-20,0.9],[47.6,-5,1],[46,12,0.85],[47.6,27,1.05],[44,38,0.9],[-31,38,0.8],[-13,38,0.75],[10,38,0.8],[30,38,0.8],[-27,-18,0.72],[-27,9,0.72],[34,-5,0.7],[35,20,0.72]];
  TREE_LAYOUT.forEach(([x,z,scale])=>tree(x,z,scale));

  function gothicLamp(x,z){
    const g=new THREE.Group(),iron=new THREE.MeshStandardMaterial({map:architectureMaterials?.iron,color:0x292e36,metalness:.72,roughness:.48});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.32,.46,.55,8),iron);base.position.y=.28;g.add(base);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,3.4,8),iron);post.position.y=2.15;g.add(post);
    const crown=new THREE.Mesh(new THREE.ConeGeometry(.45,.45,4),iron);crown.position.y=4.12;crown.rotation.y=Math.PI/4;g.add(crown);
    const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(.28),mats.glow);lamp.position.y=3.72;g.add(lamp);
    for(const o of [base,post,crown])o.castShadow=true;g.position.set(x,0,z);scene.add(g);return g;
  }
  const livingLampLights=[];
  for(let z=-25;z<=30;z+=8){
    for(const x of [-4.8,4.8]){
      gothicLamp(x,z);
      if(z%16===-9||z%16===7){const l=new THREE.PointLight(0xff892d,1.35,9,2);l.position.set(x,3.35,z);l.userData.phase=(x+z)*.37;scene.add(l);livingLampLights.push(l);}
    }
  }

  // V32.6.7 — smoke, fireflies and lightweight villagers. These use simple
  // geometry rather than extra textures so they remain reliable on iPad Safari.
  const smokePuffs=[];
  const smokeMat=new THREE.MeshBasicMaterial({color:0x7f858d,transparent:true,opacity:.22,depthWrite:false});
  function smokeStack(x,z,height=6){for(let i=0;i<4;i++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.28+i*.06,8,6),smokeMat.clone());puff.position.set(x,height+i*.5,z);puff.userData={baseY:height,phase:i*.9,drift:(i%2?1:-1)*.18};scene.add(puff);smokePuffs.push(puff);}}
  [[-42,-27,5.2],[20,-30,6.1],[40,31,5.8],[-30,40,7.0],[30,40,6.0],[-33,-5,5.0],[32,-5,5.0]].forEach(v=>smokeStack(...v));

  const fireflies3D=[];
  const fireflyMat=new THREE.MeshBasicMaterial({color:0xffdf72,transparent:true,opacity:.85,depthWrite:false});
  let ffSeed=3267;const ffRnd=()=>((ffSeed=(ffSeed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<(MOBILE_GPU?24:40);i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.055,6,4),fireflyMat.clone());f.position.set(-46+ffRnd()*92,.8+ffRnd()*2.5,-34+ffRnd()*74);f.userData={ox:f.position.x,oz:f.position.z,phase:ffRnd()*Math.PI*2,speed:.35+ffRnd()*.45};scene.add(f);fireflies3D.push(f);}

  // V32.6.8 — actual citizen sprite sheets replace the temporary 3D capsules.
  // Sheets are 4 columns x 8 rows of 32px frames: idle rows 0-3, walk rows 4-7.
  const villagers=[];
  const citizenDefs=[
    ['assets/citizens/Blonde Woman/blonde_woman.png','assets/citizens/Blonde Woman/blonde_woman_shadow.png'],
    ['assets/citizens/Blonde Man/blonde_man.png','assets/citizens/Blonde Man/blonde_man_shadow.png'],
    ['assets/citizens/Farmer/farmer.png','assets/citizens/Farmer/farmer_shadow.png'],
    ['assets/citizens/Knight/knight.png','assets/citizens/Knight/knight_shadow.png'],
    ['assets/citizens/Blonde Kid Girl/blonde_kid_girl.png','assets/citizens/Blonde Kid Girl/blonde_kid_girl_shadow.png']
  ];
  async function loadCitizenDef(def,index){
    try{
      // Citizen sheets are required gameplay art, so load them directly instead of
      // invoking the generic procedural fallback (which was undefined for citizens).
      const [body,shade]=await Promise.all([
        loadTextureOnce(`${def[0]}?v=3410`),
        loadTextureOnce(`${def[1]}?v=3410`)
      ]);
      for(const tex of [body,shade]){
        tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
        tex.repeat.set(1/4,1/8);tex.offset.set(0,7/8);
        tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;
        tex.generateMipmaps=false;tex.matrixAutoUpdate=true;tex.needsUpdate=true;
        if('encoding' in tex&&THREE.sRGBEncoding)tex.encoding=THREE.sRGBEncoding;
      }
      return {body,shade,index};
    }catch(error){
      console.warn('[Village Citizens] Failed to load citizen sheet',def[0],error);
      return null;
    }
  }
  const citizenTextures=(await Promise.all(citizenDefs.map(loadCitizenDef))).filter(Boolean);
  if(!citizenTextures.length)console.warn('[Village Citizens] No citizen sprite sheets loaded.');
  const citizenDirectionRow={down:0,left:1,right:2,up:3};
  function setCitizenFrame(v,frame,face,moving=true){
    const row=(moving?4:0)+(citizenDirectionRow[face]??0);
    const f=moving?((frame%4)+4)%4:0;
    for(const tex of [v.bodyTex,v.shadowTex])tex.offset.set(f/4,1-(row+1)/8);
  }
  function makeVillager(x,z,textureIndex=0){
    if(!citizenTextures.length)return null;
    const source=citizenTextures[textureIndex%citizenTextures.length];
    // Every NPC needs independent texture offsets. Assign clones before creating
    // materials and explicitly mark them dirty for iOS Safari.
    const bodyTex=source.body.clone();
    const shadowTex=source.shade.clone();
    for(const tex of [bodyTex,shadowTex]){tex.matrixAutoUpdate=true;tex.needsUpdate=true;}
    const g=new THREE.Group();
    const shadowMat=new THREE.SpriteMaterial({map:shadowTex,transparent:true,alphaTest:.02,depthWrite:false,depthTest:true});
    const bodyMat=new THREE.SpriteMaterial({map:bodyTex,transparent:true,alphaTest:.02,depthWrite:false,depthTest:true});
    const shade=new THREE.Sprite(shadowMat);shade.center.set(.5,.08);shade.scale.set(3.65,3.65,1);shade.renderOrder=28;
    const body=new THREE.Sprite(bodyMat);body.center.set(.5,.08);body.scale.set(3.65,3.65,1);body.renderOrder=29;
    g.add(shade,body);g.position.set(x,.62,z);scene.add(g);
    const v={g,bodyTex,shadowTex,bodyMat,shadowMat,from:new THREE.Vector3(x,.62,z),to:new THREE.Vector3(x,.62,z),t:0,speed:.055+Math.random()*.025,wait:Math.random()*1.4,walk:0,face:'down'};
    setCitizenFrame(v,0,'down',false);villagers.push(v);return v;
  }
  // Two residents start beside the central road so their presence is immediately
  // verifiable; the remaining citizens begin throughout the authored districts.
  [[-2,-8,0],[3,-12,1],[-30,-4,2],[-26,22,3],[27,-2,4],[29,22,0],[-5,-17,1],[6,27,2],[-8,29,3],[4,-19,4]].forEach(v=>makeVillager(...v));
  console.info(`[Village Citizens] Spawned ${villagers.length} sprite citizens.`);
  const citizenJobs=['merchant','guard','farmer','priest','child','worker','alchemist','blacksmith','resident','scout'];
  villagers.forEach((v,i)=>{v.job=citizenJobs[i%citizenJobs.length];v.home=new THREE.Vector3(v.g.position.x,.62,v.g.position.z);});
  const vectors=points=>points.map(([x,z])=>new THREE.Vector3(x,.62,z));
  const jobDestinations={
    merchant:vectors(CITIZEN_SCHEDULE_NODES.market),guard:vectors(CITIZEN_SCHEDULE_NODES.guard),
    farmer:vectors(CITIZEN_SCHEDULE_NODES.farm),priest:vectors(CITIZEN_SCHEDULE_NODES.sacred),
    child:vectors(CITIZEN_SCHEDULE_NODES.square),worker:vectors(CITIZEN_SCHEDULE_NODES.industry),
    alchemist:vectors(CITIZEN_SCHEDULE_NODES.arcane),blacksmith:vectors(CITIZEN_SCHEDULE_NODES.industry),
    resident:vectors([...CITIZEN_SCHEDULE_NODES.homes,...CITIZEN_SCHEDULE_NODES.square]),
    scout:vectors([...CITIZEN_SCHEDULE_NODES.guard,...CITIZEN_SCHEDULE_NODES.market])
  };
  function roadRoute(from,destination){
    const route=[];
    const nearestCrossZ=Math.abs(from.z+5)<Math.abs(from.z-23)?-5:23;
    const targetCrossZ=Math.abs(destination.z+5)<Math.abs(destination.z-23)?-5:23;
    // Pull district travel onto the nearest authored east/west avenue, then
    // use the central spine before entering the destination district.
    if(Math.abs(from.x-10)>5)route.push(new THREE.Vector3(from.x,.62,nearestCrossZ));
    route.push(new THREE.Vector3(10,.62,nearestCrossZ));
    if(targetCrossZ!==nearestCrossZ)route.push(new THREE.Vector3(10,.62,targetCrossZ));
    if(Math.abs(destination.x-10)>5)route.push(new THREE.Vector3(destination.x,.62,targetCrossZ));
    route.push(destination.clone());
    return route.filter((point,index,list)=>index===0||point.distanceToSquared(list[index-1])>.25);
  }
  function chooseNpcTarget(v,hour=12){
    let points;
    if(hour>=21||hour<6) points=[v.home];
    else if(hour>=18) points=[v.home,new THREE.Vector3(0,.62,23)];
    else points=jobDestinations[v.job]||[new THREE.Vector3(0,.62,-20)];
    const p=points[Math.floor(Math.random()*points.length)];
    v.route=roadRoute(v.g.position,p);v.routeIndex=0;
    v.from.copy(v.g.position);v.to.copy(v.route[0]||p);v.t=0;v.wait=.6+Math.random()*2.8;
  }
  function advanceNpcRoute(v,hour){
    v.routeIndex=(v.routeIndex||0)+1;
    if(v.route&&v.routeIndex<v.route.length){
      v.from.copy(v.g.position);v.to.copy(v.route[v.routeIndex]);v.t=0;v.wait=.08+Math.random()*.22;
    }else chooseNpcTarget(v,hour);
  }
  villagers.forEach(v=>chooseNpcTarget(v,12));

  // Two subtle Metal Gear Solid homages: a suspicious box near the warehouse,
  // and a hidden codec-frequency plaque near the Keep. They are cosmetic only.
  const easterEggs=[];
  const boxMat=new THREE.MeshStandardMaterial({color:0x8b673f,roughness:.95});
  const tacticalBox=new THREE.Group();
  const boxBody=new THREE.Mesh(new THREE.BoxGeometry(1.35,.9,1.15),boxMat);boxBody.position.y=.45;boxBody.castShadow=boxBody.receiveShadow=true;tacticalBox.add(boxBody);
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.08,.92,1.17),new THREE.MeshStandardMaterial({color:0x5a4028,roughness:1}));seam.position.set(0,.46,0);tacticalBox.add(seam);
  tacticalBox.position.set(34,.02,36);tacticalBox.rotation.y=-.22;scene.add(tacticalBox);
  easterEggs.push({id:'tactical-box',object:tacticalBox,radius:2.2,message:'A suspiciously tactical cardboard box. It seems perfectly normal.'});
  const codecPlaque=new THREE.Group();
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(1.45,.72,.12),new THREE.MeshStandardMaterial({color:0x26382e,emissive:0x0b2416,emissiveIntensity:.55,roughness:.7}));plaque.position.y=.85;codecPlaque.add(plaque);
  const plaquePost=new THREE.Mesh(new THREE.BoxGeometry(.12,1.4,.12),mats.iron);plaquePost.position.y=.45;codecPlaque.add(plaquePost);
  codecPlaque.position.set(-18,.02,-25);codecPlaque.rotation.y=.15;scene.add(codecPlaque);
  easterEggs.push({id:'codec-14085',object:codecPlaque,radius:2.0,message:'An old frequency is scratched into the plaque: 140.85'});
  // Third MGS homage: a lone alert marker hidden among the northern trees.
  const alertMarker=new THREE.Group();
  const alertPost=new THREE.Mesh(new THREE.BoxGeometry(.10,1.35,.10),mats.iron);alertPost.position.y=.68;alertMarker.add(alertPost);
  const alertPlate=new THREE.Mesh(new THREE.BoxGeometry(.72,.92,.10),new THREE.MeshStandardMaterial({color:0x7b1717,emissive:0x320000,emissiveIntensity:.5,roughness:.65}));alertPlate.position.y=1.62;alertMarker.add(alertPlate);
  const alertDot=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),mats.glow);alertDot.position.set(0,1.36,.08);alertMarker.add(alertDot);
  alertMarker.position.set(45,.02,-31);alertMarker.rotation.y=-.25;scene.add(alertMarker);
  easterEggs.push({id:'alert-marker',object:alertMarker,radius:2.0,message:'!  For a moment, you feel like someone spotted you.'});
  let nearbyEgg='';

  // V32.5.4 — use the player's real Shadow walk sheet in the Three.js world.
  // Every supplied Shadow sheet is 6 columns x 4 direction rows with 64 px frames.
  function readShadowLevel(){
    try {
      const progress=JSON.parse(localStorage.getItem('relicsEclipseSave')||'{}');
      return Math.max(1,Math.min(9,Number(progress.shadowLevel)||Number(progress.heroLevels?.[progress.selectedHero])||1));
    } catch(_err){ return 1; }
  }
  const shadowLevel=readShadowLevel();
  const shadowGroup=shadowLevel<=3?'shadow_lv_01-03':shadowLevel<=6?'shadow_lv_04-06':'shadow_lv_07-09';
  const shadowFolder=`Swordsman_lvl${shadowLevel}`;
  const shadowPrefix=shadowLevel<=3?`Swordsman_lvl${shadowLevel}`:`lvl${shadowLevel}`;
  const shadowSheetUrl=`assets/characters/${shadowGroup}/PNG/${shadowFolder}/With_shadow/${shadowPrefix}_Walk_with_shadow.png?v=3410`;
  const shadowTexture=await loadArtTexture(shadowSheetUrl,()=>canvasTexture(64,(ctx,n)=>{
    ctx.clearRect(0,0,n,n);ctx.fillStyle='#e6d0b4';ctx.beginPath();ctx.arc(n/2,n/2,n*.3,0,7);ctx.fill();
  }));
  shadowTexture.wrapS=THREE.RepeatWrapping;
  shadowTexture.wrapT=THREE.RepeatWrapping;
  shadowTexture.repeat.set(1/6,1/4);
  shadowTexture.magFilter=THREE.NearestFilter;
  shadowTexture.minFilter=THREE.NearestFilter;
  shadowTexture.generateMipmaps=false;
  if ('encoding' in shadowTexture && THREE.sRGBEncoding) shadowTexture.encoding=THREE.sRGBEncoding;

  const shadowMaterial=new THREE.SpriteMaterial({
    map:shadowTexture,
    transparent:true,
    alphaTest:.08,
    depthWrite:false
  });
  const shadow=new THREE.Sprite(shadowMaterial);
  shadow.center.set(.5,.16);
  shadow.scale.set(5.6,5.6,1);
  shadow.renderOrder=20;
  scene.add(shadow);

  // V33 — familiar companion in the Village. Uses a lightweight procedural bat
  // so it works even when a specific familiar asset is not yet unlocked.
  const familiar=new THREE.Group();
  const familiarMat=new THREE.MeshBasicMaterial({color:0x5d3b73,transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide});
  const familiarBody=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),familiarMat);
  const wingGeo=new THREE.BufferGeometry();wingGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.55,.18,0,-.42,-.18,0,0,0,0,.55,.18,0,.42,-.18,0],3));
  familiar.add(familiarBody,new THREE.Mesh(wingGeo,familiarMat));
  familiar.position.set(1.2,2.2,0);scene.add(familiar);

  const directionRows={down:0,left:1,right:2,up:3};
  let shadowFrame=-1;
  let shadowFace='down';
  function setShadowFrame(frame,face){
    const safeFrame=((frame%6)+6)%6;
    const row=directionRows[face]??0;
    if(safeFrame===shadowFrame && face===shadowFace) return;
    shadowFrame=safeFrame;
    shadowFace=face;
    shadowTexture.offset.set(safeFrame/6,1-(row+1)/4);
  }
  setShadowFrame(0,'down');

  // Fixed construction districts. Index order deliberately matches the legacy
  // 29-slot save schema so every existing building survives without migration.
  const plotPads=new THREE.Group();scene.add(plotPads);
  const plotGroup=new THREE.Group();scene.add(plotGroup);
  const plotMeshes=[];
  const padBase=new THREE.MeshStandardMaterial({color:0x30322c,roughness:1,transparent:true,opacity:.48});
  const padAvailable=new THREE.MeshStandardMaterial({color:0xb98935,emissive:0x6b3e05,emissiveIntensity:1.25,transparent:true,opacity:.86});
  const padOccupied=new THREE.MeshStandardMaterial({color:0x1b241d,roughness:1,transparent:true,opacity:.12});
  PLOT_POSITIONS.forEach(([x,z],index)=>{
    // Prepared stone-and-earth foundations visually belong to the settlement.
    // They remain quiet until build mode instead of reading as UI circles.
    const pad=new THREE.Mesh(new THREE.BoxGeometry(6.25,.10,5.2),padBase.clone());
    pad.position.set(x,.055,z);pad.receiveShadow=true;pad.userData.plotIndex=index;
    const borderMat=new THREE.MeshStandardMaterial({color:0x625b4b,roughness:1,transparent:true,opacity:.58});
    [[0,-2.48,5.8,.12],[0,2.48,5.8,.12],[-3.02,0,.12,4.8],[3.02,0,.12,4.8]].forEach(([bx,bz,bw,bd])=>{
      const edge=new THREE.Mesh(new THREE.BoxGeometry(bw,.14,bd),borderMat);edge.position.set(bx,.10,bz);pad.add(edge);
    });
    const signGroup=new THREE.Group();signGroup.name='buildSign';
    const post=new THREE.Mesh(new THREE.BoxGeometry(.12,1.05,.12),mats.wood);post.position.set(2.25,.53,1.55);signGroup.add(post);
    const board=new THREE.Mesh(new THREE.BoxGeometry(.9,.48,.10),mats.wood);board.position.set(2.25,.93,1.55);signGroup.add(board);
    signGroup.visible=false;pad.add(signGroup);
    plotPads.add(pad);plotMeshes.push(pad);
  });

  function clearGroup(g){while(g.children.length){const c=g.children.pop();c.traverse?.(o=>{o.geometry?.dispose?.();});}}
  const constructionAnims=[];
  let plotsInitialized=false;
  let priorPlacedKeys=new Set();
  function rebuildPlots(){
    invalidatePlotCache(); // construction just changed; do not serve stale plot data
    clearGroup(plotGroup);const placed=readPlots?.()||{};
    Object.entries(placed).forEach(([idx,type])=>{
      const index=Number(idx);const p=PLOT_POSITIONS[index];if(!p)return;
      // V32.6.8 — face every plot building toward its nearest authored road.
      // Local +Z is the front door for every GLB in the Gothic pack.
      const roadTargets=[
        {x:10,z:p[1]},       // central north/south road
        {x:p[0],z:-5},       // lower east/west road
        {x:p[0],z:23}        // upper east/west road
      ];
      let target=roadTargets[0],best=Infinity;
      for(const candidate of roadTargets){const d=(candidate.x-p[0])**2+(candidate.z-p[1])**2;if(d<best){best=d;target=candidate;}}
      const rot=Math.atan2(target.x-p[0],target.z-p[1]);
      const built=placeModel(modelIdForType(type),p[0],p[1],{rot,parent:plotGroup});
      built.userData.plotIndex=index;
      built.userData.buildType=type;
      if(plotsInitialized&&!priorPlacedKeys.has(String(index))){
        built.userData.finalScale=built.scale.x;built.scale.setScalar(.08);
        constructionAnims.push({root:built,start:performance.now(),duration:4200});
        document.dispatchEvent(new CustomEvent('village-construction-start',{detail:{type,index}}));
      }
    });
    priorPlacedKeys=new Set(Object.keys(placed));
    plotsInitialized=true;
    requestShadowUpdate(); // a new building is a new shadow caster
  }
  // V32.6.2 — readPlots() is a synchronous localStorage.getItem + JSON.parse.
  // This ran once per rendered frame (~60x/second), which is a main-thread disk
  // read in the middle of the render loop and a serious source of iPad jank.
  // Plot data only changes on construction, which already calls rebuildPlots()
  // via the MutationObserver, so a short TTL cache is sufficient and safe.
  let plotCache=null,plotCacheAt=-1e9;
  const PLOT_CACHE_MS=500;
  function cachedPlots(now){
    if(plotCache&&now-plotCacheAt<PLOT_CACHE_MS)return plotCache;
    plotCache=readPlots?.()||{};plotCacheAt=now;return plotCache;
  }
  function invalidatePlotCache(){plotCache=null;plotCacheAt=-1e9}
  function updatePlotState(now=performance.now()){
    const placed=cachedPlots(now);const build=getBuildState?.()||{};
    plotMeshes.forEach((pad,index)=>{
      const occupied=Boolean(placed[index]);const available=Boolean(build.active&&build.type&&!occupied);
      // Foundations are environmental detail only while constructing. Empty
      // lots disappear into the terrain during normal exploration.
      pad.visible=available;
      pad.material.color.copy((available?padAvailable:occupied?padOccupied:padBase).color);
      pad.material.emissive?.copy((available?padAvailable:padBase).emissive||new THREE.Color(0));
      pad.material.emissiveIntensity=available?1.35:0;
      pad.material.opacity=available?.82:0;
      const sign=pad.getObjectByName('buildSign');if(sign)sign.visible=available;
      if(available)pad.position.y=.07+Math.sin(now*.004+index)*.035;else pad.position.y=.055;
    });
  }
  invalidatePlotCache();
  rebuildPlots();

  function requestShadowUpdate(){ renderer.shadowMap.needsUpdate = true; }
  requestShadowUpdate(); // bake once now that every static caster is in the scene

  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();
  const obstructionRay=new THREE.Raycaster();
  const fadedMeshes=new Set();
  const interactionPrompt=document.createElement('button');
  interactionPrompt.type='button';interactionPrompt.className='village-building-prompt';interactionPrompt.hidden=true;
  Object.assign(interactionPrompt.style,{position:'absolute',left:'50%',bottom:'118px',transform:'translateX(-50%)',zIndex:'42',padding:'9px 14px',border:'1px solid rgba(218,181,111,.75)',borderRadius:'12px',background:'rgba(7,10,16,.92)',color:'#f3d99d',font:'600 13px Georgia,serif',letterSpacing:'.03em',boxShadow:'0 8px 24px rgba(0,0,0,.35)',pointerEvents:'auto'});
  viewport.append(interactionPrompt);
  let nearbyBuilding=null;
  interactionPrompt.addEventListener('click',()=>{if(!nearbyBuilding)return;document.dispatchEvent(new CustomEvent('village-building-interact',{detail:{id:nearbyBuilding.id,name:nearbyBuilding.label,action:BUILDING_ACTIONS[nearbyBuilding.label]||'Inspect building'}}));});
  function setMeshFade(mesh,fade){
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const m of materials){if(!m)continue;if(m.userData.baseOpacity==null)m.userData.baseOpacity=m.opacity??1;m.transparent=fade||m.userData.baseOpacity<1;m.opacity=fade?.24:m.userData.baseOpacity;m.depthWrite=!fade;m.needsUpdate=true;}
  }
  function updateBuildingObstruction(){
    fadedMeshes.forEach(m=>setMeshFade(m,false));fadedMeshes.clear();
    const direction=shadow.position.clone().sub(camera.position);const distance=direction.length();if(distance<1)return;
    direction.normalize();obstructionRay.set(camera.position,direction);obstructionRay.far=Math.max(0,distance-1.1);
    const meshes=[];buildingInstances.forEach(root=>root.traverse(o=>{if(o.isMesh)meshes.push(o);}));
    for(const hit of obstructionRay.intersectObjects(meshes,false)){setMeshFade(hit.object,true);fadedMeshes.add(hit.object);}
  }
  function updateBuildingInteraction(){
    let best=null,bestD=Infinity;
    for(const b of interactiveBuildings){const d=Math.hypot(shadow.position.x-b.position.x,shadow.position.z-b.position.z);if(d<bestD){bestD=d;best=b;}}
    nearbyBuilding=bestD<4.3?best:null;
    interactionPrompt.hidden=!nearbyBuilding;
    if(nearbyBuilding)interactionPrompt.textContent=`✦ ${nearbyBuilding.label} — ${BUILDING_ACTIONS[nearbyBuilding.label]||'Inspect'}`;
  }
  function selectPlotFromPointer(event){
    const build=getBuildState?.()||{};if(!build.active||!build.type)return;
    const rect=canvas.getBoundingClientRect();
    pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(plotMeshes,false).find(item=>item.object.visible);
    if(hit){event.preventDefault();event.stopPropagation();onPlotSelected?.(hit.object.userData.plotIndex);}
  }
  canvas.addEventListener('pointerup',selectPlotFromPointer,{passive:false});

  let walk=0,last=performance.now(),rafId=0,disposed=false,contextLost=false;

  // V32.6.2 — iOS Safari drops WebGL contexts aggressively under memory pressure
  // and when the app is backgrounded. Without these handlers the Village went
  // permanently black with no explanation and no way back.
  canvas.addEventListener('webglcontextlost',(event)=>{
    event.preventDefault();
    contextLost=true;
    if(rafId)cancelAnimationFrame(rafId);
    rafId=0;
    document.body.classList.add('village-three-context-lost');
    console.warn('[Village Three.js] WebGL context lost; pausing the 3D Village.');
  },false);
  canvas.addEventListener('webglcontextrestored',()=>{
    contextLost=false;
    document.body.classList.remove('village-three-context-lost');
    last=performance.now();
    requestShadowUpdate(); // the restored context starts with an empty depth map
    if(!disposed&&!rafId)rafId=requestAnimationFrame(frame);
    console.warn('[Village Three.js] WebGL context restored.');
  },false);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden)last=performance.now(); });

  function mapState(s){return {x:(s.x-768)/17.5,z:(s.y-512)/13.2};}
  function resize(){
    const w=viewport.clientWidth||1,h=viewport.clientHeight||1,aspect=w/h;
    renderer.setSize(w,h,false);camera.aspect=aspect;
    // Portrait screens need a wider world view rather than a desktop camera
    // cropped into a narrow vertical slice of the Cathedral façade.
    if(aspect<.72){camera.fov=58;cameraOffset.set(0,23,32);lookOffset.set(0,2.2,-8)}
    else if(aspect<1.15){camera.fov=50;cameraOffset.set(0,19,27);lookOffset.set(0,2.2,-7.5)}
    else {camera.fov=48;cameraOffset.set(0,21,29);lookOffset.set(0,1.8,-8.5)}
    camera.updateProjectionMatrix();
  }
  const ro=new ResizeObserver(resize);ro.observe(viewport);resize();
  let activeDistrict='';
  const districtDescriptions={sacred:'The Cathedral keeps watch beneath the eternal moon.',keep:'The Last Bastion guards the western wall.',industry:'Forgefire and stonework sustain the kingdom.',residential:'Lanterns burn for the families of the last refuge.',commerce:'Trade continues after sunset in the Night Market.',agriculture:'Moonlit fields feed the settlement through the long night.',arcane:'Forbidden learning survives behind veiled doors.'};
  function frame(now){if(disposed||contextLost){rafId=0;return}const dt=Math.min(.04,(now-last)/1000);last=now;const s=getShadowState();const p=mapState(s);shadow.position.x=p.x;shadow.position.z=p.z;shadow.position.y=.9;
    const clock=villageClock(now);dayNightBadge.textContent='MIDNIGHT · 00:00';
    // The clock still drives schedules and simulation. It no longer changes
    // exposure, fog, ambient colour, or lamp visibility.
    moon.intensity=2.72;villageFill.intensity=.30;renderer.toneMappingExposure=.92;
    scene.background.set(0x091018);
    livingLampLights.forEach(l=>l.visible=true);
    const familiarPhase=now*.004;familiar.position.set(shadow.position.x+1.25+Math.sin(familiarPhase)*.25,shadow.position.y+1.8+Math.sin(familiarPhase*1.7)*.22,shadow.position.z+.35+Math.cos(familiarPhase)*.28);familiar.rotation.z=Math.sin(familiarPhase*3)*.18;
    for(let i=constructionAnims.length-1;i>=0;i--){const a=constructionAnims[i],t=Math.min(1,(now-a.start)/a.duration),ease=1-Math.pow(1-t,3);a.root.scale.setScalar(a.root.userData.finalScale*ease);a.root.position.y=Math.sin(t*Math.PI)*.18;if(t>=1){a.root.position.y=0;constructionAnims.splice(i,1);requestShadowUpdate();document.dispatchEvent(new CustomEvent('village-construction-complete',{detail:{type:a.root.userData.buildType,index:a.root.userData.plotIndex}}));}}
    const moving=Boolean(s.moving);
    if(moving){
      walk+=dt*9;
      setShadowFrame(Math.floor(walk)%6,s.face||shadowFace);
    }else{
      walk=0;
      setShadowFrame(0,s.face||shadowFace);
    }
    const desired=new THREE.Vector3(shadow.position.x+cameraOffset.x,3.1+cameraOffset.y,shadow.position.z+cameraOffset.z);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(shadow.position.x+lookOffset.x,2.8+lookOffset.y,shadow.position.z+lookOffset.z);
    mats.water.opacity=.86+Math.sin(now*.0015)*.04;// sway is +/-0.012 rad (0.7 deg); far too small to read in a baked shadow
    for(const t of swayingTrees)t.rotation.z=Math.sin(now*.00075+t.userData.phase)*.012;
    for(const row of animatedCropRows){row.mesh.position.y=row.baseY+Math.sin(now*.0018+row.phase)*.035;row.mesh.rotation.z=Math.sin(now*.0012+row.phase)*.012;}
    // Living Village atmosphere.
    mats.water.map&&(mats.water.map.offset.y=(now*.000035)%1);
    livingLampLights.forEach(l=>{l.intensity=1.18+Math.sin(now*.006+l.userData.phase)*.22+Math.sin(now*.017+l.userData.phase*2)*.08;});
    smokePuffs.forEach((p,i)=>{const age=((now*.00018+p.userData.phase)%1);p.position.y=p.userData.baseY+age*3.1;p.position.x+=Math.sin(now*.0008+i)*.0009;p.position.z+=p.userData.drift*.0007;p.scale.setScalar(.72+age*1.5);p.material.opacity=(1-age)*.22;});
    fireflies3D.forEach((f,i)=>{const t=now*.001*f.userData.speed+f.userData.phase;f.position.x=f.userData.ox+Math.sin(t*1.3+i)*1.1;f.position.z=f.userData.oz+Math.cos(t*.9+i*.4)*.8;f.position.y=1.0+Math.sin(t*1.8+i)*.75;f.material.opacity=.35+.55*(.5+.5*Math.sin(t*3.2));});
    villagers.forEach(v=>{
      if(v.wait>0){v.wait-=dt;setCitizenFrame(v,0,v.face,false);return;}
      v.t=Math.min(1,v.t+dt*v.speed*3.2);v.g.position.lerpVectors(v.from,v.to,v.t);
      const dx=v.to.x-v.from.x,dz=v.to.z-v.from.z;
      v.face=Math.abs(dx)>Math.abs(dz)?(dx<0?'left':'right'):(dz<0?'up':'down');
      v.walk+=dt*7;setCitizenFrame(v,Math.floor(v.walk),v.face,true);
      if(v.t>=1)advanceNpcRoute(v,clock.hour);
    });
    // Reveal each homage once when Shadow walks close; no gameplay reward or save mutation.
    const egg=easterEggs.find(e=>shadow.position.distanceTo(e.object.position)<e.radius);
    if(egg&&nearbyEgg!==egg.id){nearbyEgg=egg.id;console.info(`[Village Easter Egg] ${egg.message}`);document.dispatchEvent(new CustomEvent('village-easter-egg',{detail:{id:egg.id,message:egg.message}}));}
    else if(!egg)nearbyEgg='';
    const district=DISTRICTS.reduce((best,item)=>{const distance=Math.hypot(shadow.position.x-item.center[0],shadow.position.z-item.center[1]);return distance<(best?.distance??13)?{item,distance}:best;},null);
    if(district?.item.id!==activeDistrict){
      activeDistrict=district?.item.id||'';
      if(activeDistrict) window.dispatchEvent(new CustomEvent('village:district-reveal',{detail:{id:activeDistrict,name:district.item.name,description:districtDescriptions[activeDistrict]}}));
    }
    updateBuildingInteraction();
    updateBuildingObstruction();
    updatePlotState(now);
    if(!document.hidden)renderer.render(scene,camera);
    rafId=requestAnimationFrame(frame);}
  rafId=requestAnimationFrame(frame);

  return { rebuildPlots, invalidatePlotCache,
    setVisualAuditPosition(x,z){
      if(!new URLSearchParams(location.search).has('visualAudit'))return false;
      const state=getShadowState();state.x=768+x*17.5;state.y=512+z*13.2;state.moving=false;return true;
    },
    dispose(){disposed=true;if(rafId)cancelAnimationFrame(rafId);rafId=0;ro.disconnect();canvas.removeEventListener('pointerup',selectPlotFromPointer);interactionPrompt.remove();dayNightBadge.remove();runtimeProofOverlay?.remove();familiar.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});fadedMeshes.forEach(m=>setMeshFade(m,false));fadedMeshes.clear();shadowTexture.dispose();shadowMaterial.dispose();grassTexture.dispose();cobbleTexture.dispose();Object.values(villageMaterials||{}).forEach(texture=>texture?.dispose?.());Object.values(architectureMaterials||{}).forEach(texture=>texture?.dispose?.());treeTexture.dispose();treeMaterial.dispose();smokePuffs.forEach(p=>{p.geometry?.dispose?.();p.material?.dispose?.();});fireflies3D.forEach(f=>{f.geometry?.dispose?.();f.material?.dispose?.();});villagers.forEach(v=>{v.g.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});v.bodyTex?.dispose?.();v.shadowTex?.dispose?.();});citizenTextures.forEach(t=>{t.body?.dispose?.();t.shade?.dispose?.();});easterEggs.forEach(e=>e.object.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();}));walkwayMat.dispose();clearGroup(plotGroup);glbTemplates.forEach(e=>e.root.traverse(o=>{o.geometry?.dispose?.();const m=o.material;if(Array.isArray(m))m.forEach(x=>x?.dispose?.());else m?.dispose?.();}));glbTemplates.clear();renderer.dispose();canvas.remove();} };
}
