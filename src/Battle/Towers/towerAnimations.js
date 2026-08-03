import { coreTower } from './towerRegistry.js';

const SOURCES = {
  axe: new URL('../../../assets/towers/gothic_axe/axe_atlas.png', import.meta.url).href,
  crossbow: new URL('../../../assets/towers/gothic_crossbow/crossbow_atlas.png', import.meta.url).href,
  ballista: new URL('../../../assets/towers/gothic_ballista/ballista_atlas.png', import.meta.url).href,
  holy: new URL('../../../assets/towers/gothic_holy/holy_atlas.png', import.meta.url).href,
  arcane: new URL('../../../assets/towers/gothic_arcane/arcane_atlas.png', import.meta.url).href
};
const images = new Map();
function imageFor(id) { if (!SOURCES[id]) return null; if (!images.has(id)) { const img = new Image(); img.decoding = 'async'; img.src = SOURCES[id]; images.set(id,img); } return images.get(id); }
export function preloadCoreTowerAtlases() { Object.keys(SOURCES).forEach(imageFor); }

export function towerAnimationPhase(tower) {
  if ((tower.recoil || 0) > .07) return 3;
  if ((tower.flashT || 0) > 0) return 2;
  if ((tower.t || 0) < .22) return 4;
  if ((tower.t || 0) < .46) return 1;
  return 0;
}

export function renderCoreGothicTower(ctx, tower) {
  if (!coreTower(tower.id) || tower.id === 'dagger') return false;
  const img=imageFor(tower.id); if (!img?.complete || !img.naturalWidth) return false;
  const frame=towerAnimationPhase(tower), sw=img.naturalWidth/5, sh=img.naturalHeight*.68;
  ctx.save(); ctx.imageSmoothingEnabled=true;
  ctx.drawImage(img,frame*sw,0,sw,sh,-35,-50,70,88);
  // The generated atlas carries authored masonry additions below its action row.
  // These are composited only for upgraded towers, so level changes are physical.
  const level=Math.max(1,tower.level||1);
  if(level>=2){const ux=img.naturalWidth*.27,uy=img.naturalHeight*.64,uw=img.naturalWidth*.19,uh=img.naturalHeight*.34;ctx.drawImage(img,ux,uy,uw,uh,-32,-25,29,30)}
  if(level>=3){const ux=img.naturalWidth*.49,uy=img.naturalHeight*.64,uw=img.naturalWidth*.22,uh=img.naturalHeight*.34;ctx.drawImage(img,ux,uy,uw,uh,3,-27,32,32)}
  ctx.restore(); return true;
}

