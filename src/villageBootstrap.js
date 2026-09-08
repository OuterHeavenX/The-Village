import { createVillageThreeWorld, describeLoadError } from './Renderer/villageThreeWorld.js?v=3410';
import { queueCloudSave } from './online/cloudSave.js';
import { VILLAGE_BUILDINGS, VILLAGE_BUILD_CATEGORIES } from './data/villageBuildings.js';
// V30.1 — claim Village ownership immediately at module evaluation time.
// Battle/game.js contains a preserved legacy Village controller guarded by this
// flag. Setting it only inside DOMContentLoaded allowed both controllers to bind
// on iPad, so one BUILD tap opened the catalog and the legacy handler instantly
// closed it again.
window.__ROTK_VILLAGE_BOOTSTRAP__ = true;

const ready = (fn) => {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
};

ready(() => {
  const viewport = document.querySelector('.pixel-village');
  const world = document.getElementById('villageWorld');
  if (!viewport || !world) return;

  // One requestAnimationFrame for the whole Village.
  //
  // The Village ran four independent frame loops — Shadow, the citizens, the
  // day/night atmosphere and the construction juice. Each rescheduled itself
  // every frame, and three of them opened with their own `viewport.offsetParent`
  // read, which forces a style and layout flush; animateKael then wrote back to
  // an inline style in the same frame. That is three forced layouts and four rAF
  // dispatches per frame, sustained even during a battle where every one of them
  // had already decided it had nothing to do.
  //
  // One driver now runs them in order and resolves the visibility questions once
  // per frame. The callbacks read the same answers they computed for themselves
  // before, so behaviour is unchanged. A callback that throws is disabled and
  // reported rather than silently taking its own loop down, which is what
  // happened when each owned its own rAF chain.
  const villageFrameCallbacks = [];
  const villageFrame = { onScreen: false, documentVisible: true, battle: false };
  let villageFrameHandle = 0;

  function runVillageFrame(now) {
    villageFrameHandle = 0;
    villageFrame.battle = document.body.classList.contains('battle-mode');
    villageFrame.onScreen = viewport.offsetParent !== null;
    villageFrame.documentVisible = !document.hidden;
    for (const entry of villageFrameCallbacks) {
      if (entry.failed) continue;
      try {
        entry.callback(now);
      } catch (error) {
        entry.failed = true;
        console.error(`Village frame callback "${entry.name}" disabled after an error.`, error);
      }
    }
    scheduleVillageFrame();
  }

  function scheduleVillageFrame() {
    if (villageFrameHandle) return;
    villageFrameHandle = requestAnimationFrame(runVillageFrame);
  }

  function registerVillageFrame(name, callback) {
    villageFrameCallbacks.push({ name, callback, failed: false });
    scheduleVillageFrame();
  }

  // Clear any stale recovery marker from an earlier failed Village boot.
  viewport.classList.remove('village-boot-failed');

  window.__ROTK_VILLAGE_BOOTSTRAP__ = true;
  viewport.dataset.villageReady = 'standalone';

  // V31.0 — single authored Village backdrop. All legacy district tiles and
  // portal coordinates have been retired.
  const TILE_W = 1536;
  const TILE_H = 1024;
  const OLD_X = 0;
  const OLD_Y = 0;
  const WORLD_W = 1536;
  const WORLD_H = 1024;
  const DISTRICTS = { oldTown: { x: 0, y: 0, label: 'The Village' } };
  const camera = { x: 0, y: 0, scale: 1.38, min: 1.38, max: 1.38 };
  const FIXED_TOWN_CAMERA = true;
  // V31.4 — fixed, close FF4-style follow camera. No player zoom or panning.
  const cameraFollow = { focusX: 0, focusY: 0, lookX: 0, lookY: 0, ready: false };
  const CAMERA_DEAD_X = 34;
  const CAMERA_DEAD_Y = 24;
  const CAMERA_LOOK_X = 58;
  const CAMERA_LOOK_Y = 42;
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let suppressTapUntil = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function clampCamera() {
    const vw = viewport.clientWidth || 1;
    const vh = viewport.clientHeight || 1;
    const sw = WORLD_W * camera.scale;
    const sh = WORLD_H * camera.scale;
    const margin = 80;
    camera.x = sw <= vw ? (vw - sw) / 2 : clamp(camera.x, vw - sw - margin, margin);
    camera.y = sh <= vh ? (vh - sh) / 2 : clamp(camera.y, vh - sh - margin, margin);
  }

  function render() {
    clampCamera();
    world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    const out = document.getElementById('villageZoomReadout');
    if (out) out.textContent = `${Math.round(camera.scale * 100)}%`;
  }

  function cameraScales() {
    const vw = Math.max(1, viewport.clientWidth);
    const vh = Math.max(1, viewport.clientHeight);
    const contain = Math.min(vw / TILE_W, vh / TILE_H);
    // Close FF4-style framing. Tablets show roughly two thirds of the authored
    // map width, making streets, buildings, citizens, and Shadow read at RPG scale.
    // Smaller landscape phones retain enough context without exposing the full map.
    const locked = clamp(Math.min(vw / 900, vh / 560), 0.82, 1.42);
    const cover = locked;
    camera.min = locked;
    camera.max = locked;
    camera.scale = locked;
    return { contain, cover, locked };
  }

  function center(animate = false) {
    cameraScales();
    cameraFollow.focusX = kaelState.x;
    cameraFollow.focusY = kaelState.y;
    cameraFollow.lookX = 0;
    cameraFollow.lookY = 0;
    cameraFollow.ready = true;
    camera.x = viewport.clientWidth / 2 - kaelState.x * camera.scale;
    camera.y = viewport.clientHeight / 2 - kaelState.y * camera.scale;
    world.style.transition = animate ? 'transform 180ms ease-out' : 'none';
    render();
    if (animate) setTimeout(() => { world.style.transition = 'none'; }, 200);
  }

  function focusDistrict(id, animate = true) {
    const d = DISTRICTS[id] || DISTRICTS.oldTown;
    const scale = clamp(Math.min(viewport.clientWidth / TILE_W, viewport.clientHeight / TILE_H) * 0.98, camera.min, camera.max);
    camera.scale = scale;
    camera.x = viewport.clientWidth / 2 - (d.x + TILE_W / 2) * scale;
    camera.y = viewport.clientHeight / 2 - (d.y + TILE_H / 2) * scale;
    world.style.transition = animate ? 'transform 260ms ease-out' : 'none';
    render();
    document.querySelectorAll('[data-district-jump]').forEach((button) => button.classList.toggle('active', button.dataset.districtJump === id));
    if (animate) setTimeout(() => { world.style.transition = 'none'; }, 280);
  }

  function zoomAt() {
    cameraScales();
    render();
  }


  const isUi = (target) => Boolean(target.closest('.village-camera-controls,.village-build-btn,.village-build-tray,.village-building,.village-plot,.village-economy-strip,.village-economy-panel,.village-district-nav,.kael-controls'));

  viewport.addEventListener('pointerdown', (e) => {
    if (FIXED_TOWN_CAMERA || isUi(e.target)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) {
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, bx: camera.x, by: camera.y, moved: false };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        scale: camera.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2
      };
      drag = null;
    }
    e.preventDefault();
  }, { passive: false });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      if (!pinch) return;
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      zoomAt(pinch.scale * distance / pinch.distance, midX, midY);
      const dx = midX - pinch.midX;
      const dy = midY - pinch.midY;
      camera.x += dx;
      camera.y += dy;
      pinch.midX = midX;
      pinch.midY = midY;
      render();
      suppressTapUntil = performance.now() + 400;
    } else if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        viewport.classList.add('is-panning');
      }
      if (drag.moved) {
        camera.x = drag.bx + dx;
        camera.y = drag.by + dy;
        render();
        suppressTapUntil = performance.now() + 300;
      }
    }
    e.preventDefault();
  }, { passive: false });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    try { viewport.releasePointerCapture?.(e.pointerId); } catch {}
    if (pointers.size === 0) {
      drag = null;
      pinch = null;
      viewport.classList.remove('is-panning');
    } else if (pointers.size === 1) {
      const [id, p] = [...pointers.entries()][0];
      drag = { id, sx: p.x, sy: p.y, bx: camera.x, by: camera.y, moved: false };
      pinch = null;
    }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  viewport.addEventListener('wheel', (e) => {
    if (FIXED_TOWN_CAMERA) return;
    e.preventDefault();
    zoomAt(camera.scale * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
  }, { passive: false });

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  };
  bind('villageZoomIn', () => zoomAt(camera.scale * 1.2));
  bind('villageZoomOut', () => zoomAt(camera.scale / 1.2));
  bind('villageCenterBtn', () => center(true));
  document.querySelectorAll('[data-district-jump]').forEach((button) => {
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); focusDistrict(button.dataset.districtJump, true); });
  });

  function nav(name) {
    document.querySelector(`#bottomNav [data-nav="${name}"]`)?.click();
  }
  function moreTarget(name) {
    nav('more');
    requestAnimationFrame(() => document.querySelector(`[data-more-target="${name}"]`)?.click());
  }

  const economyPanel = document.getElementById('villageEconomyPanel');
  const economyStrip = document.getElementById('villageEconomyStrip');
  let economyRefreshTimer = 0;
  const fmt = (value) => Math.floor(Math.max(0, Number(value) || 0)).toLocaleString();
  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function renderEconomyProduction(data) {
    const root = document.getElementById('economyProductionList');
    if (!root) return;
    const counts = data.counts || {};
    const production = [
      ['farm', 'Farm Network', '🌾', data.foodRate, 'Food / hour'],
      ['sawmill', 'Lumber Camps', '🪵', data.woodRate, 'Wood / hour'],
      ['quarry', 'Quarry Works', '⛏', data.stoneRate, 'Stone / hour'],
      ['blacksmith', 'Forge District', '⚒', data.ironRate, 'Iron / hour'],
      ['chapel', 'Sacred Sites', '◆', data.essenceRate, 'Essence / hour']
    ].filter(([key, , , rate]) => (Number(counts[key]) || 0) > 0 || (Number(rate) || 0) > 0);
    root.replaceChildren();
    if (!production.length) {
      const empty = document.createElement('p'); empty.className = 'progression-empty';
      empty.textContent = 'Build a Farm, Lumber Camp, or Quarry to begin production.'; root.append(empty); return;
    }
    production.forEach(([key, name, icon, rate, unit]) => {
      const card = document.createElement('article'); card.className = 'economy-production-card';
      const glyph = document.createElement('span'); glyph.textContent = icon;
      const copy = document.createElement('div');
      const title = document.createElement('b'); title.textContent = name;
      const workers = document.createElement('small'); workers.textContent = `${fmt(counts[key])} active structure${Number(counts[key]) === 1 ? '' : 's'}`;
      const output = document.createElement('strong'); output.textContent = `+${fmt(rate)} ${unit}`;
      copy.append(title, workers); card.append(glyph, copy, output); root.append(card);
    });
  }
  function refreshVillageEconomy(showReport = false) {
    const data = window.ROTKGameBridge?.getVillageEconomy?.();
    if (!data) return null;
    setText('villageFoodTotal', fmt(data.food));
    setText('villageWoodTotal', fmt(data.wood));
    setText('villageStoneTotal', fmt(data.stone));
    setText('villagePopulationTotal', `${fmt(data.population)}/${fmt(data.capacity)}`);
    setText('villageFoodRate', `+${fmt(data.foodRate)}/h`);
    setText('villageWoodRate', `+${fmt(data.woodRate)}/h`);
    setText('villageStoneRate', `+${fmt(data.stoneRate)}/h`);
    const buildGold = document.getElementById('villageBuildGold');
    if (buildGold) buildGold.textContent = fmt(data.gold || 0);
    setText('economyFood', fmt(data.food));
    setText('economyWood', fmt(data.wood));
    setText('economyStone', fmt(data.stone));
    setText('economyIron', fmt(data.iron));setText('economyEssence', fmt(data.essence));
    setText('economyIronRate', `+${fmt(data.ironRate)} per hour`);setText('economyEssenceRate', `+${fmt(data.essenceRate)} per hour`);
    setText('economyPopulation', `${fmt(data.population)} / ${fmt(data.capacity)}`);
    setText('economyWorkforce', `${fmt(data.workersAssigned)} / ${fmt(data.workerDemand)}`);
    setText('economyWorkforceRate', data.workerDemand ? `${Math.round((Number(data.workforceRatio)||0)*100)}% production efficiency` : 'No staffed production yet');
    setText('economyStorage', fmt(data.storageCapacity));
    const capped=Object.values(data.storageCapped||{}).some(value=>(Number(value)||0)>.01);
    setText('economyStorageRate', capped ? 'Capacity reached · build a Warehouse' : 'Passive production capacity');
    setText('economyFoodRate', `+${fmt(data.foodRate)} per hour`);
    setText('economyWoodRate', `+${fmt(data.woodRate)} per hour`);
    setText('economyStoneRate', `+${fmt(data.stoneRate)} per hour`);
    setText('economyVillageLevel', data.level || 1);
    setText('economyHappiness', `${getVillageHappiness(data)}%`);
    setText('economyBuildingCount', `${data.buildings || 0} / 10`);
    setText('economyTotalRate', `${fmt(data.totalRate)} resources / hour`);
    setText('economyOfflineCap', `${data.maxOfflineHours || 12} hours`);
    renderEconomyProduction(data);
    setText('economyPopulationRate', data.counts?.house ? `${data.counts.house} house${data.counts.house === 1 ? '' : 's'} supporting the village` : 'Build Houses to expand');
    const report = document.getElementById('economyAwayReport');
    if (report) {
      const gain = data.lastReport;
      const meaningful = gain && (gain.food + gain.wood + gain.stone) >= .1;
      report.classList.toggle('hidden', !(showReport && meaningful));
      if (showReport && meaningful) report.innerHTML = `<b>While you were away</b><br>🌾 +${fmt(gain.food)} Food &nbsp; 🪵 +${fmt(gain.wood)} Wood &nbsp; 🪨 +${fmt(gain.stone)} Stone`;
    }
    return data;
  }
  function renderProgressionPanel(){
    const p=window.ROTKGameBridge?.getVillageProgression?.();if(!p)return;
    setText('economyProgressStage',p.stage>=10?'Chapter I complete':`Chapter I · Road ${p.stage}/10`);
    const research=document.getElementById('villageResearchList');
    if(research){const roadmap=(p.roadmap||[]).filter(r=>r.state!=='complete').slice(0,4);research.innerHTML=roadmap.length?roadmap.map(r=>r.state==='available'?`<button type="button" class="village-research-card" data-research-id="${r.id}"><span>${r.icon}</span><div><b>${r.name}</b><small>Unlocks ${r.unlocks.join(', ')} · ${costText(r.cost)}</small><em>${r.battle}</em></div></button>`:`<div class="village-research-card research-locked"><span>🔒</span><div><b>${r.name}</b><small>Complete campaign Road ${r.requiresStage}</small><em>${r.battle}</em></div></div>`).join(''):'<p class="progression-empty">All current kingdom research is complete.</p>';research.querySelectorAll('[data-research-id]').forEach(btn=>btn.addEventListener('click',()=>{const result=window.ROTKGameBridge?.completeVillageResearch?.(btn.dataset.researchId);if(result?.ok){toast(`${result.research.name} completed`);renderProgressionPanel();renderBuildTray();refreshVillageEconomy(false)}else toast(result?.reason==='resources'?'More resources are required':'Research is still locked')}));}
    const log=document.getElementById('kingdomChronicleList');if(log)log.innerHTML=(p.chronicle||[]).slice(0,8).map(x=>`<li><b>${x.type==='battle'?'⚔️':x.type==='research'?'📚':x.type==='awakening'?'◆':'🏰'}</b><span>${x.text}</span></li>`).join('')||'<li><span>The Chronicle awaits its first entry.</span></li>';
  }
  function openEconomyPanel() {
    refreshVillageEconomy(true);renderProgressionPanel();
    economyPanel?.classList.remove('hidden');
  }
  function closeEconomyPanel() { economyPanel?.classList.add('hidden'); }
  economyStrip?.addEventListener('pointerdown', (e) => e.stopPropagation());
  economyStrip?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openEconomyPanel(); });
  bind('villageEconomyClose', closeEconomyPanel);
  bind('economyCollectBtn', () => {
    window.ROTKGameBridge?.collectVillageEconomy?.();
    refreshVillageEconomy(false);
    toast('Village resources collected and saved');
  });
  const destinations = {
    playBtn: () => nav('campaign'),
    villageCardsBtn: () => nav('cards'),
    villageHeroesBtn: () => nav('heroes'),
    villageRelicsBtn: () => nav('relics'),
    kingdomBtn: () => openEconomyPanel(),
    forgeBtnHome: () => { nav('more'); requestAnimationFrame(() => document.getElementById('forgeBtn')?.click()); },
    codexBtn: () => moreTarget('codex'),
    villageAudioBtn: () => document.getElementById('audioBtn')?.click()
  };

  document.querySelectorAll('.village-building').forEach((button) => {
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (performance.now() < suppressTapUntil) return;
      destinations[button.id]?.();
    }, true);
  });

  // V22.4B — functional construction layered around the proven camera controller.
  const tray = document.getElementById('villageBuildTray');
  const hint = document.getElementById('villageBuildHint');
  const plotsRoot = document.getElementById('villagePlots');
  const buildButton = document.getElementById('villageBuildBtn');
  // V30.0 — Village-only construction catalog redesign.
  // Every currently buildable structure is visible in one catalog. Gold is the
  // construction currency; production labels describe the live village output.
  // The catalog itself lives in src/data/villageBuildings.js so the engine and
  // the content validator read the same source as this UI.
  const BUILDINGS = VILLAGE_BUILDINGS;
  const BUILD_CATEGORIES = VILLAGE_BUILD_CATEGORIES;
  let activeBuildCategory = 'all';
  let buildSearch = '';

  const RESOURCE_ICONS={gold:'🪙',food:'🌾',wood:'🪵',stone:'🪨',iron:'⚙️',essence:'◆'};
  function buildingCosts(def){return def.costs||{gold:def.cost||0}}
  function costText(cost){return Object.entries(cost).filter(([,n])=>Number(n)>0).map(([k,n])=>`${RESOURCE_ICONS[k]||''} ${Number(n).toLocaleString('en-US')}`).join(' · ')}
  function buildingUnlocked(key){return window.ROTKGameBridge?.canBuildVillageBuilding?.(key)!==false}
  function buildCardHTML(key, def){
    const art = def.image
      ? `<img src="${def.image}" alt="${def.name}">`
      : `<i class="build-placeholder" aria-hidden="true">${def.icon}</i>`;
    return `<button class="build-catalog-card${def.image?'':' is-placeholder'}" type="button" data-village-build="${key}" data-build-category="${def.cat}">`
      + `<span class="build-card-art">${art}</span>`
      + `<span class="build-card-copy"><b>${def.name}</b><small>${def.description}</small></span>`
      + `<span class="build-production"><i>PRODUCTION</i><strong>${def.production}</strong></span>`
      + `<span class="build-gold-cost"><i>BUILD COST</i><strong>${costText(buildingCosts(def))}</strong></span>`
      + `</button>`;
  }
  function renderBuildTray(){
    if (!tray) return;
    const root = tray.querySelector('.build-categories');
    const tabs = tray.querySelector('.build-category-tabs');
    const searchInput = tray.querySelector('#villageBuildSearch');
    const goldReadout = tray.querySelector('#villageBuildGold');
    if (goldReadout) goldReadout.textContent = Math.floor(getVillageGold()).toLocaleString('en-US');
    if (tabs) {
      const unlockedCategories=new Set(Object.entries(BUILDINGS).filter(([key])=>buildingUnlocked(key)).map(([,def])=>def.cat));
      tabs.innerHTML = BUILD_CATEGORIES.filter(([cat])=>cat==='all'||unlockedCategories.has(cat)).map(([cat,icon,label]) =>
        `<button type="button" class="build-filter${activeBuildCategory===cat?' active':''}" data-build-filter="${cat}"><span>${icon}</span>${label}</button>`
      ).join('');
      tabs.querySelectorAll('[data-build-filter]').forEach((button) => button.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        activeBuildCategory = button.dataset.buildFilter || 'all';
        renderBuildTray();
      }));
    }
    if (searchInput && searchInput.value !== buildSearch) searchInput.value = buildSearch;
    const query = buildSearch.trim().toLowerCase();
    const entries = Object.entries(BUILDINGS).filter(([key,def]) => {
      if(!buildingUnlocked(key))return false;
      const categoryMatch = activeBuildCategory === 'all' || def.cat === activeBuildCategory;
      const searchMatch = !query || `${def.name} ${def.description} ${def.production}`.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
    if (root) {
      root.innerHTML = entries.length
        ? `<div class="build-catalog-grid">${entries.map(([k,d])=>buildCardHTML(k,d)).join('')}</div>`
        : `<div class="build-empty-state"><b>No buildings found.</b><span>Try another category or search term.</span></div>`;
      root.querySelectorAll('[data-village-build]').forEach((card)=>{
        card.addEventListener('pointerdown',(e)=>e.stopPropagation());
        card.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); selectBuilding(card); });
      });
    }
  }
  const PLOT_KEY = 'theVillageFreshTownV1Plots';
  let buildType = null;
  let buildMode = false;
  let bridgeGrantChecked = false;

  const status = document.createElement('div');
  status.className = 'village-build-status hidden';
  status.innerHTML = '<b>BUILD MODE</b><span>Select a structure.</span><button type="button">CANCEL</button>';
  viewport.append(status);
  status.querySelector('button').addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); exitBuildMode();
  });

  function toast(message) {
    if (window.ROTKGameBridge?.toast) return window.ROTKGameBridge.toast(message);
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message; el.style.opacity = '1';
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.opacity = '0'; }, 1700);
  }
  function readPlots() {
    try { return JSON.parse(localStorage.getItem(PLOT_KEY) || '{}'); }
    catch { return {}; }
  }
  function writePlots(data) {
    localStorage.setItem(PLOT_KEY, JSON.stringify(data));
    queueCloudSave('village-building-change');

  }
  function getVillageGold() {
    if (window.ROTKGameBridge?.getVillageGold) return window.ROTKGameBridge.getVillageGold();
    return 0;
  }
  function updateStatus(text) {
    const label = status.querySelector('span');
    if (label) label.textContent = text;
    if (hint) hint.textContent = text;
  }
  function syncBuildUi() {
    viewport.classList.toggle('build-mode-active', buildMode);
    status.classList.toggle('hidden', !buildMode);
    buildButton?.classList.toggle('active', buildMode);
    if (buildButton) buildButton.innerHTML = buildMode ? '✕ CANCEL BUILD' : '🔨 BUILD';
    plotsRoot?.querySelectorAll('.village-plot.empty').forEach((plot) => {
      plot.classList.toggle('available', Boolean(buildMode && buildType));
    });
  }
  function enterBuildMode() {
    buildMode = true; buildType = null;
    tray?.classList.remove('hidden');
    document.body.classList.add('village-build-menu-open');
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.remove('selected'));
    updateStatus('Choose a structure from the construction menu.');
    if (!bridgeGrantChecked && window.ROTKGameBridge?.ensureVillageBuilderGrant) {
      bridgeGrantChecked = true;
      const grant = window.ROTKGameBridge.ensureVillageBuilderGrant();
      if (grant) toast(`Builder’s Treasury received · +${grant.toLocaleString('en-US')} Gold`);
    }
    renderBuildTray();
    syncBuildUi();
  }
  function exitBuildMode() {
    buildMode = false; buildType = null;
    tray?.classList.add('hidden');
    document.body.classList.remove('village-build-menu-open');
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.remove('selected'));
    updateStatus('Select a structure.');
    syncBuildUi();
  }
  function selectBuilding(choice) {
    const type = choice.dataset.villageBuild;
    const def = BUILDINGS[type];
    if (!def) return;
    buildMode = true; buildType = type;
    tray?.querySelectorAll('[data-village-build]').forEach((b) => b.classList.toggle('selected', b === choice));
    tray?.classList.add('hidden');
    document.body.classList.remove('village-build-menu-open');
    updateStatus(`${def.icon} ${def.name} selected · tap a glowing empty plot · ${costText(buildingCosts(def))}`);
    syncBuildUi();
    toast(`${def.name} selected — tap a glowing plot`);
  }
  function constructPlot(plot) {
    if (!buildMode || !buildType) {
      toast('Tap BUILD and select a structure first');
      return;
    }
    const index = plot.dataset.plot;
    const placed = readPlots();
    if (placed[index]) { toast('That construction plot is occupied'); return; }
    const def = BUILDINGS[buildType];
    const costs=buildingCosts(def);
    if (window.ROTKGameBridge?.spendVillageResources && !window.ROTKGameBridge.spendVillageResources(costs)) {
      plot.classList.add('denied');setTimeout(() => plot.classList.remove('denied'), 450);
      toast(`Insufficient resources · ${costText(costs)}`);updateStatus(`${def.name} requires ${costText(costs)}.`);return;
    }
    placed[index] = buildType;
    writePlots(placed);
    beginVillageConstruction(index, buildType);
    window.ROTKGameBridge?.villageBuildingConstructed?.(buildType);
    refreshVillageEconomy(false);
    plot.classList.add('constructing');
    updateStatus(`Workers are beginning ${def.name}…`);
    renderPlots();
    toast(`${def.name} funded · construction crews dispatched`);
    exitBuildMode();
  }
  const PLOT_LAYOUT = [
    [220,112,105,78],[335,112,105,78],[450,112,105,78],
    [220,210,105,82],[335,210,105,82],[450,210,105,82],
    [220,305,105,85],[335,305,105,85],[450,305,105,85],
    [980,112,110,78],[1100,112,110,78],[1220,112,105,78],
    [980,210,110,82],[1100,210,110,82],[1220,210,105,82],
    [980,305,110,85],[1100,305,110,85],[1220,305,105,85],
    [590,565,120,75],[805,565,120,75],
    [590,655,120,80],[720,655,75,80],[805,655,120,80],
    [590,745,120,80],[720,745,75,80],[805,745,120,80],
    [590,840,120,85],[720,840,75,85],[805,840,120,85]
  ];

  function renderPlots() {
    if (!plotsRoot) return;
    const placed = readPlots();
    plotsRoot.replaceChildren();
    for (let i = 0; i < PLOT_LAYOUT.length; i += 1) {
      const type = placed[i];
      const plot = document.createElement('button');
      plot.type = 'button';
      plot.className = `village-plot plot-${i} ${type ? `built building-${type}` : 'empty'}`;
      plot.dataset.plot = String(i);
      const [px,py,pw,ph] = PLOT_LAYOUT[i];
      plot.style.setProperty('left', `${px}px`, 'important');
      plot.style.setProperty('top', `${py}px`, 'important');
      plot.style.setProperty('width', `${pw}px`, 'important');
      plot.style.setProperty('height', `${ph}px`, 'important');
      if (type && BUILDINGS[type]) {
        const def = BUILDINGS[type];
        const construction = getConstructionVisual(i);
        if (construction.active) plot.classList.add('construction-active', `construction-stage-${construction.stage}`);
        plot.innerHTML = `<span class="placed-building">${def.image?`<img src="${def.image}" alt="${def.name}">`:`<i class="placed-building-icon">${def.icon}</i>`}<b>${construction.active ? construction.label : def.name}</b><small>${construction.active ? `${construction.percent}% · workers active` : def.production}</small>${construction.active ? '<i class="build-scaffold"></i><i class="hammer-sparks"></i>' : ''}</span>`;
        plot.setAttribute('aria-label', construction.active ? `${def.name}, under construction, ${construction.percent} percent` : `${def.name}, constructed`);
      } else {
        plot.innerHTML = '<span class="plot-plus">＋</span><small>BUILD PLOT</small>';
        plot.setAttribute('aria-label', `Empty construction plot ${i + 1}`);
      }
      plot.addEventListener('pointerdown', (e) => e.stopPropagation());
      plot.addEventListener('click', (e) => {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!type) constructPlot(plot);
        else toast(`${BUILDINGS[type]?.name || 'Building'} · already constructed`);
      }, true);
      plotsRoot.append(plot);
    }
    syncBuildUi();
  }

  bind('villageBuildBtn', () => buildMode ? exitBuildMode() : enterBuildMode());
  bind('villageBuildClose', () => exitBuildMode());
  tray?.addEventListener('pointerdown', (e) => e.stopPropagation());
  tray?.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-village-build]');
    if (!choice) return;
    e.preventDefault(); e.stopPropagation();
    selectBuilding(choice);
  });




  // V25.0 — KAEL LIVES: player-controlled Kael in the village.
  const kael = document.createElement('div');
  kael.id = 'villageKael';
  kael.className = 'kael-world-avatar facing-down';
  kael.innerHTML = '<i class="kael-world-sprite"></i><b class="kael-nameplate">HUNTER</b>';
  try {
    const progress=JSON.parse(localStorage.getItem('relicsEclipseSave')||'{}');
    const level=Math.max(1,Math.min(9,Number(progress.shadowLevel)||Number(progress.heroLevels?.[progress.selectedHero])||1));
    const group=level<=3?'shadow_lv_01-03':level<=6?'shadow_lv_04-06':'shadow_lv_07-09';
    const folder=`Swordsman_lvl${level}`,prefix=level<=3?`Swordsman_lvl${level}`:`lvl${level}`;
    kael.querySelector('.kael-world-sprite').style.backgroundImage=`url("assets/characters/${group}/PNG/${folder}/With_shadow/${prefix}_Walk_with_shadow.png?v=3410")`;
  } catch(err){console.warn('Could not apply Shadow level sprite.',err);}
  world.append(kael);
  function checkShadowAwakening(){const p=window.ROTKGameBridge?.getVillageProgression?.();if(!p?.pendingShadowAwakening)return;const modal=document.getElementById('shadowAwakeningModal');if(!modal)return;modal.classList.remove('hidden');modal.querySelector('[data-awaken-shadow]')?.addEventListener('click',()=>{if(window.ROTKGameBridge?.completeShadowAwakening?.()){modal.classList.add('hidden');toast('Shadow has awakened to Level II');setTimeout(()=>location.reload(),900)}},{once:true});}
  setTimeout(checkShadowAwakening,500);

  const controls = document.createElement('div');
  controls.id = 'kaelControls';
  controls.className = 'kael-controls';
  controls.innerHTML = '<div id="kaelStick" class="kael-stick"><i id="kaelStickKnob" class="kael-stick-knob"></i></div><button id="kaelInteract" class="kael-interact" type="button" aria-label="Interact">✦</button>';
  document.body.append(controls);
  const stick = controls.querySelector('#kaelStick');
  const knob = controls.querySelector('#kaelStickKnob');
  const interact = controls.querySelector('#kaelInteract');
  const input = window.KaelInput = window.KaelInput || { x: 0, y: 0, active: false };
  let stickPointer = null;
  function updateStick(clientX, clientY) {
    const r = stick.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
    const max = r.width * .31, d = Math.hypot(dx, dy) || 1;
    if (d > max) { dx *= max / d; dy *= max / d; }
    input.x = dx / max; input.y = dy / max; input.active = Math.hypot(input.x,input.y) > .08;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  }
  function releaseStick(e) {
    if (stickPointer !== null && e?.pointerId !== undefined && e.pointerId !== stickPointer) return;
    stickPointer = null; input.x = 0; input.y = 0; input.active = false;
    knob.style.transform = 'translate(-50%,-50%)';
  }
  stick.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); stickPointer=e.pointerId; stick.setPointerCapture?.(e.pointerId); updateStick(e.clientX,e.clientY); }, {passive:false});
  stick.addEventListener('pointermove', e => { if(e.pointerId!==stickPointer)return; e.preventDefault(); updateStick(e.clientX,e.clientY); }, {passive:false});
  stick.addEventListener('pointerup', releaseStick); stick.addEventListener('pointercancel', releaseStick);
  controls.addEventListener('pointerdown', e => e.stopPropagation());

  const movementKeys = new Set();
  const movementKeyDirections = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };
  const isEditableTarget = (target) => target instanceof Element &&
    Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
  function updateKeyboardMovement() {
    let x = 0, y = 0;
    movementKeys.forEach(code => {
      const direction = movementKeyDirections[code];
      if (direction) { x += direction[0]; y += direction[1]; }
    });
    input.x = Math.max(-1, Math.min(1, x));
    input.y = Math.max(-1, Math.min(1, y));
    input.active = input.x !== 0 || input.y !== 0;
  }
  addEventListener('keydown', e => {
    const villageVisible = viewport.offsetParent !== null && !document.body.classList.contains('battle-mode');
    if (!villageVisible || !movementKeyDirections[e.code] || isEditableTarget(e.target)) return;
    movementKeys.add(e.code);
    updateKeyboardMovement();
    e.preventDefault();
  });
  addEventListener('keyup', e => {
    if (!movementKeyDirections[e.code]) return;
    movementKeys.delete(e.code);
    updateKeyboardMovement();
  });
  addEventListener('blur', () => {
    movementKeys.clear();
    updateKeyboardMovement();
  });

  // V32.1 — the Hunter now begins the game standing at the cathedral steps,
  // facing the doors, rather than at the far southern wall. Verified walkable
  // against the collision mask with the full eight-point body footprint.
  const HUNTER_START = { x: 765, y: 400, face: 'up' };
  const kaelState = { x: HUNTER_START.x, y: HUNTER_START.y, speed: 145, face: HUNTER_START.face, moving: false };
  let villageThreeWorld = null;
  // paint the starting facing immediately so the opening shot has him looking
  // at the cathedral doors rather than the default downward idle.
  requestAnimationFrame(()=>{ if(typeof kael!=='undefined'&&kael){
    kael.classList.remove('facing-down','facing-up','facing-left','facing-right');
    kael.classList.add('facing-'+HUNTER_START.face); } });

  // V32.5.3 — Three.js-native navigation. The retired 2D road-mask and its
  // invisible collision rectangles have been removed completely. Movement is
  // constrained only by the actual 3D world boundary and river, with openings
  // precisely matching the two visible bridges.
  // V34.1 — these numbers ARE the white brick wall in villageThreeWorld.js.
  // They previously described a box well inside the visible ground, which is why
  // the Hunter stopped dead against nothing: the library, the warehouse and the
  // northern buildable plots all sat outside the walkable area. Wall and
  // collision are now the same line. If one changes, change the other.
  const THREE_WORLD_BOUNDS = { minX: -51, maxX: 51, minZ: -45, maxZ: 48 };
  const THREE_RIVER = { minX: -23.4, maxX: -12.6 };
  const THREE_BRIDGES = [
    { minZ: -8.2, maxZ: -1.8 },
    { minZ: 19.8, maxZ: 26.2 }
  ];

  function sourceToThree(x, y) {
    return { x: (x - 768) / 17.5, z: (y - 512) / 13.2 };
  }

  function insideActiveDistrict(x, y) {
    const p = sourceToThree(x, y);
    if (p.x < THREE_WORLD_BOUNDS.minX || p.x > THREE_WORLD_BOUNDS.maxX ||
        p.z < THREE_WORLD_BOUNDS.minZ || p.z > THREE_WORLD_BOUNDS.maxZ) return false;
    const inRiver = p.x > THREE_RIVER.minX && p.x < THREE_RIVER.maxX;
    if (!inRiver) return true;
    return THREE_BRIDGES.some(bridge => p.z >= bridge.minZ && p.z <= bridge.maxZ);
  }

  function nearestNavigationPoint(x, y) {
    const p = sourceToThree(x, y);
    const clampedX = clamp(p.x, THREE_WORLD_BOUNDS.minX, THREE_WORLD_BOUNDS.maxX);
    const clampedZ = clamp(p.z, THREE_WORLD_BOUNDS.minZ, THREE_WORLD_BOUNDS.maxZ);
    return { x: clampedX * 17.5 + 768, y: clampedZ * 13.2 + 512 };
  }

  function applyBridgeGuidance(x, y) { return x; }


  function nearestBuilding() {
    let best=null, bestD=155;
    document.querySelectorAll('.village-building').forEach(el=>{
      const x=parseFloat(getComputedStyle(el).left)||el.offsetLeft, y=parseFloat(getComputedStyle(el).top)||el.offsetTop;
      const d=Math.hypot((OLD_X+x)-kaelState.x,(OLD_Y+y)-kaelState.y);
      if(d<bestD){best=el;bestD=d;}
    });
    return best;
  }
  interact.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const b=nearestBuilding(); if(b)b.click(); else toast('Move closer to a building'); });
  let kaelLast=performance.now();
  function animateKael(now){
    const dt=Math.min(.04,(now-kaelLast)/1000); kaelLast=now;
    const battleVisible=villageFrame.battle;
    const villageVisible=villageFrame.onScreen && !battleVisible;
    const controlsDisplay=(villageVisible||battleVisible)?'flex':'none';
    if(controls.style.display!==controlsDisplay)controls.style.display=controlsDisplay;
    kaelState.moving = Boolean(villageVisible && input.active);
    if(villageVisible && input.active){
      const len=Math.hypot(input.x,input.y)||1;
      const nextX = kaelState.x + input.x / len * kaelState.speed * dt;
      const nextY = kaelState.y + input.y / len * kaelState.speed * dt;
      // Navigation-zone movement: free movement inside authored roads, smooth
      // wall sliding at edges, and a tiny recovery nudge when the feet approach
      // a seam between overlapping regions.
      if (insideActiveDistrict(nextX, kaelState.y)) kaelState.x = nextX;
      if (insideActiveDistrict(kaelState.x, nextY)) kaelState.y = nextY;
      if (!insideActiveDistrict(kaelState.x, kaelState.y)) {
        const recovery = nearestNavigationPoint(kaelState.x, kaelState.y);
        if (recovery) {
          kaelState.x += (recovery.x - kaelState.x) * Math.min(1, dt * 12);
          kaelState.y += (recovery.y - kaelState.y) * Math.min(1, dt * 12);
        }
      }
      kaelState.x = applyBridgeGuidance(kaelState.x, kaelState.y, dt);
      const face=directionFromDelta(input.x,input.y); kaelState.face=face;
      kael.classList.remove('facing-down','facing-up','facing-left','facing-right'); kael.classList.add(`facing-${face}`,'walking');
    }else kael.classList.remove('walking');

    // FF4-style camera follow: fixed close zoom, a small dead zone for stability,
    // directional look-ahead, and frame-rate-independent soft stopping.
    if (villageVisible) {
      if (!cameraFollow.ready) {
        cameraScales();
        cameraFollow.focusX = kaelState.x;
        cameraFollow.focusY = kaelState.y;
        cameraFollow.ready = true;
      }
      const dxFocus = kaelState.x - cameraFollow.focusX;
      const dyFocus = kaelState.y - cameraFollow.focusY;
      if (dxFocus > CAMERA_DEAD_X) cameraFollow.focusX = kaelState.x - CAMERA_DEAD_X;
      else if (dxFocus < -CAMERA_DEAD_X) cameraFollow.focusX = kaelState.x + CAMERA_DEAD_X;
      if (dyFocus > CAMERA_DEAD_Y) cameraFollow.focusY = kaelState.y - CAMERA_DEAD_Y;
      else if (dyFocus < -CAMERA_DEAD_Y) cameraFollow.focusY = kaelState.y + CAMERA_DEAD_Y;

      const moving = input.active && Math.hypot(input.x, input.y) > .08;
      const inputLen = moving ? (Math.hypot(input.x, input.y) || 1) : 1;
      const desiredLookX = moving ? (input.x / inputLen) * CAMERA_LOOK_X : 0;
      const desiredLookY = moving ? (input.y / inputLen) * CAMERA_LOOK_Y : 0;
      const lookEase = 1 - Math.exp(-dt * 7.5);
      cameraFollow.lookX += (desiredLookX - cameraFollow.lookX) * lookEase;
      cameraFollow.lookY += (desiredLookY - cameraFollow.lookY) * lookEase;

      const targetX = viewport.clientWidth / 2 - (cameraFollow.focusX + cameraFollow.lookX) * camera.scale;
      const targetY = viewport.clientHeight / 2 - (cameraFollow.focusY + cameraFollow.lookY) * camera.scale;
      const followEase = 1 - Math.exp(-dt * 8.5);
      camera.x += (targetX - camera.x) * followEase;
      camera.y += (targetY - camera.y) * followEase;
      render();
    }

    kael.style.left=`${kaelState.x}px`;kael.style.top=`${kaelState.y}px`;kael.style.zIndex=String(80+Math.floor(kaelState.y/20));
  }
  registerVillageFrame('shadow', animateKael);

  // V24.0 — THE LIVING VILLAGE
  // Lightweight road-following citizens using the supplied 4x8 (32px frame) sheets.
  const citizenLayer = document.createElement('div');
  citizenLayer.id = 'villageCitizenLayer';
  citizenLayer.className = 'village-citizen-layer';
  citizenLayer.setAttribute('aria-hidden', 'true');
  world.append(citizenLayer);
  citizenLayer.style.left = '0px';
  citizenLayer.style.top = '0px';
  citizenLayer.style.width = `${TILE_W}px`;
  citizenLayer.style.height = `${TILE_H}px`;

  const CITIZEN_ASSETS = {
    child: {
      label: 'Village Child',
      sheet: 'assets/citizens/Blonde Kid Girl/blonde_kid_girl.png',
      shadow: 'assets/citizens/Blonde Kid Girl/blonde_kid_girl_shadow.png',
      speed: 43,
      route: [[765,930],[765,850],[765,770],[765,690],[765,610],[765,520],[650,440],[430,440],[300,440],[430,440],[650,440]]
    },
    woman: {
      label: 'Village Resident',
      sheet: 'assets/citizens/Blonde Woman/blonde_woman.png',
      shadow: 'assets/citizens/Blonde Woman/blonde_woman_shadow.png',
      speed: 31,
      route: [[765,930],[765,820],[765,700],[765,585],[765,455],[1000,440],[1200,440],[1340,440]]
    },
    man: {
      label: 'Village Worker',
      sheet: 'assets/citizens/Blonde Man/blonde_man.png',
      shadow: 'assets/citizens/Blonde Man/blonde_man_shadow.png',
      speed: 34,
      route: [[620,930],[620,780],[620,610],[765,585],[910,585],[910,750],[910,900],[765,930]]
    },
    farmer: {
      label: 'Farmer',
      sheet: 'assets/citizens/Farmer/farmer.png',
      shadow: 'assets/citizens/Farmer/farmer_shadow.png',
      speed: 29,
      route: [[600,440],[480,440],[350,440],[230,440],[230,340],[330,300],[460,300],[560,340]]
    },
    knight: {
      label: 'Village Guard',
      sheet: 'assets/citizens/Knight/knight.png',
      shadow: 'assets/citizens/Knight/knight_shadow.png',
      speed: 36,
      route: [[765,960],[765,850],[765,730],[765,610],[765,500],[765,410],[765,320],[765,270],[720,300],[765,410]]
    }
  };

  const citizens = [];
  const directionFromDelta = (dx, dy) => {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  };

  function createCitizen(id, def, stagger = 0) {
    const el = document.createElement('div');
    el.className = `living-citizen citizen-${id} facing-down is-idle`;
    el.title = def.label;
    el.innerHTML = '<i class="citizen-shadow-sprite"></i><i class="citizen-body-sprite"></i>';
    el.style.setProperty('--citizen-sheet', `url("${def.sheet}")`);
    el.style.setProperty('--citizen-shadow', `url("${def.shadow}")`);
    citizenLayer.append(el);
    const start = stagger % def.route.length;
    const p = def.route[start];
    const citizen = {
      id, def, el, routeIndex: start, x: p[0], y: p[1],
      wait: .7 + stagger * .28, moving: false
    };
    el.style.left = `${citizen.x}px`;
    el.style.top = `${citizen.y}px`;
    citizens.push(citizen);
    return citizen;
  }

  Object.entries(CITIZEN_ASSETS).forEach(([id, def], index) => createCitizen(id, def, index));
  // V31.2 — add a few extra residents without adding new downloads. Reusing the
  // existing sheets keeps the update lightweight and reliable on iPad/iPhone.
  createCitizen('woman-2', { ...CITIZEN_ASSETS.woman, speed: 27, route: [...CITIZEN_ASSETS.woman.route].reverse() }, 3);
  createCitizen('worker-2', { ...CITIZEN_ASSETS.man, speed: 30, route: [[765,930],[765,820],[765,700],[765,585],[765,440],[910,440],[1040,440],[910,440],[765,440]] }, 5);
  createCitizen('guard-2', { ...CITIZEN_ASSETS.knight, speed: 32, route: [[1180,440],[1040,440],[910,440],[765,440],[620,440],[480,440],[340,440],[480,440],[620,440],[765,440],[910,440],[1040,440]] }, 7);

  let citizenLast = performance.now();
  let villagePace = 1;
  function animateCitizens(now) {
    const dt = Math.min(.05, Math.max(0, (now - citizenLast) / 1000));
    citizenLast = now;
    const villageVisible = villageFrame.documentVisible && villageFrame.onScreen;
    if (villageVisible) {
      for (const citizen of citizens) {
        if (citizen.wait > 0) {
          citizen.wait -= dt;
          if (citizen.moving) {
            citizen.moving = false;
            citizen.el.classList.add('is-idle');
          }
          continue;
        }
        const nextIndex = (citizen.routeIndex + 1) % citizen.def.route.length;
        const target = citizen.def.route[nextIndex];
        const dx = target[0] - citizen.x;
        const dy = target[1] - citizen.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 2) {
          citizen.x = target[0]; citizen.y = target[1]; citizen.routeIndex = nextIndex;
          citizen.wait = .7 + Math.random() * 3.4;
          citizen.moving = false;
          citizen.el.classList.add('is-idle');
          // Villagers occasionally look around while stopped, avoiding the
          // mechanical appearance of every NPC freezing in its travel direction.
          if (Math.random() < .62) {
            const looks = ['down','left','right','up'];
            const look = looks[Math.floor(Math.random() * looks.length)];
            citizen.el.classList.remove('facing-down','facing-left','facing-right','facing-up');
            citizen.el.classList.add(`facing-${look}`);
          }
        } else {
          const step = Math.min(distance, citizen.def.speed * villagePace * dt);
          const proposedX = citizen.x + dx / distance * step;
          const proposedY = citizen.y + dy / distance * step;
          // Citizens currently follow their authored patrol routes without
          // terrain collision. Building-only collision will be introduced later.
          citizen.x = proposedX;
          citizen.y = proposedY;
          const direction = directionFromDelta(dx, dy);
          citizen.el.classList.remove('facing-down','facing-left','facing-right','facing-up','is-idle');
          citizen.el.classList.add(`facing-${direction}`);
          citizen.moving = true;
        }
        citizen.el.style.left = `${citizen.x.toFixed(2)}px`;
        citizen.el.style.top = `${citizen.y.toFixed(2)}px`;
        citizen.el.style.zIndex = String(18 + Math.floor(citizen.y / 45));
      }
    }
  }
  registerVillageFrame('citizens', animateCitizens);

  // V32.6.8 — Three.js renderer can surface harmless hidden-world discoveries
  // through the existing Village toast UI.
  document.addEventListener('village-easter-egg', event => {
    const message=event?.detail?.message;
    if(message)toast(message);
  });
  function openVillageInterior(detail={}) {
    document.querySelector('.village-interior-overlay')?.remove();
    const name=detail.name||'Village Building';
    const descriptions={
      Cathedral:'The Cathedral is the spiritual heart of the Village. Receive blessings, review recovered boss relics, and prepare for future chapter events.',
      Keep:'Manage kingdom progression and the familiar who follows Shadow through the Village.',
      House:'Review residents, comfort, and future household upgrades.',
      Farm:'Assign farmers and review crop production.',
      Library:'Study relic research and future elemental discoveries.',
      Blacksmith:'Forge and improve equipment for Shadow and recruited hunters.',
      Tavern:'Hear rumors and prepare future recruitment.'
    };
    const overlay=document.createElement('div');overlay.className='village-interior-overlay';
    Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'9999',display:'grid',placeItems:'center',padding:'24px',background:'rgba(2,4,8,.82)',backdropFilter:'blur(7px)'});
    const panel=document.createElement('section');Object.assign(panel.style,{width:'min(620px,94vw)',border:'1px solid rgba(218,181,111,.65)',borderRadius:'18px',padding:'24px',background:'linear-gradient(180deg,rgba(22,25,34,.98),rgba(8,10,16,.98))',color:'#f1e5c8',boxShadow:'0 24px 70px rgba(0,0,0,.55)'});
    panel.innerHTML=`<div style="font:600 11px Georgia,serif;letter-spacing:.18em;color:#bda268">BUILDING DOSSIER</div><h2 style="margin:8px 0 12px;font:700 28px Georgia,serif">${name}</h2><p style="margin:0 0 20px;line-height:1.65;color:#d9cfba">${descriptions[name]||detail.action||'Inspect this building and its place within the settlement.'}</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button data-action="primary" style="padding:10px 14px;border-radius:10px;border:1px solid #b99552;background:#332714;color:#f6dda6">View Status</button><button data-action="close" style="padding:10px 14px;border-radius:10px;border:1px solid #665f52;background:#11141b;color:#eee3ca">Return to Village</button></div>`;
    overlay.append(panel);document.body.append(overlay);
    panel.querySelector('[data-action=close]').addEventListener('click',()=>overlay.remove());
    panel.querySelector('[data-action=primary]').addEventListener('click',()=>{const economy=window.ROTKGameBridge?.getVillageEconomy?.();toast(`${name} · Village level ${economy?.level||1} · ${economy?.buildings||0} structures active`);overlay.remove();});
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  }
  document.addEventListener('village-building-interact', event => {
    const detail=event?.detail||{};
    if(detail.name==='Cathedral') cathedralServices();
    else if(detail.name)openVillageInterior(detail);
  });
  document.addEventListener('village-construction-start',()=>toast('Construction has begun. Workers are raising the new structure.'));
  document.addEventListener('village-construction-complete',()=>toast('Construction complete. The Village grows stronger.'));

  // V31.2 — LIVING VILLAGE JUICE
  // Pure CSS/DOM ambience: no external libraries, no save-data changes and no
  // collision hooks. Effects automatically pause while the Village is hidden.
  const ambience = document.createElement('div');
  ambience.id = 'villageAmbience';
  ambience.className = 'village-ambience';
  ambience.setAttribute('aria-hidden', 'true');
  ambience.innerHTML = `
    <div class="river-life river-top"></div>
    <div class="river-life river-left"></div>
    <div class="river-life river-right"></div>
    <div class="lantern-glow glow-cathedral"></div>
    <div class="lantern-glow glow-crossroad"></div>
    <div class="lantern-glow glow-south"></div>
    <div class="village-motes"></div>`;
  world.append(ambience);

  const motes = ambience.querySelector('.village-motes');
  for (let i = 0; i < 18; i += 1) {
    const mote = document.createElement('i');
    mote.style.left = `${8 + Math.random() * 84}%`;
    mote.style.top = `${20 + Math.random() * 74}%`;
    mote.style.animationDelay = `${-Math.random() * 9}s`;
    mote.style.animationDuration = `${6 + Math.random() * 8}s`;
    motes.append(mote);
  }

  let ravenTimer = 0;
  function launchRavens() {
    if (document.hidden || viewport.offsetParent === null) return;
    const flock = document.createElement('div');
    flock.className = `raven-flock ${Math.random() < .5 ? 'from-left' : 'from-right'}`;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const bird = document.createElement('i');
      bird.style.setProperty('--raven-delay', `${i * .16}s`);
      bird.style.setProperty('--raven-rise', `${-22 + Math.random() * 46}px`);
      flock.append(bird);
    }
    ambience.append(flock);
    flock.addEventListener('animationend', (event) => { if (event.target === flock) flock.remove(); });
  }
  function scheduleRavens() {
    clearTimeout(ravenTimer);
    ravenTimer = window.setTimeout(() => { launchRavens(); scheduleRavens(); }, 8500 + Math.random() * 11500);
  }
  scheduleRavens();

  // A small arrival pulse makes entering the Village feel intentional without
  // changing the fixed FF4 camera or introducing disruptive screen shake.
  viewport.classList.add('village-arrival');
  window.setTimeout(() => viewport.classList.remove('village-arrival'), 1100);

  // V31.3 — LIVING VILLAGE: DAY, NIGHT & WEATHER
  // Atmosphere and exploration state use an isolated versioned key so the
  // established construction/card/battle/progression save schema is untouched.
  const LIVING_VILLAGE_KEY = 'rotk.village.living.v31_3';
  const livingState = (() => {
    const fallback = { epoch: Date.now(), rewards: {}, visits: {}, weatherSeed: Math.random() };
    try {
      const parsed = JSON.parse(localStorage.getItem(LIVING_VILLAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed, rewards: parsed.rewards || {}, visits: parsed.visits || {} } : fallback;
    } catch (_) { return fallback; }
  })();
  const saveLivingState = () => {
    try { localStorage.setItem(LIVING_VILLAGE_KEY, JSON.stringify(livingState));queueCloudSave('village-state'); } catch (_) {}
  };

  const livingFx = document.createElement('div');
  livingFx.id = 'livingVillageFx';
  livingFx.className = 'living-village-fx time-night weather-clear';
  livingFx.setAttribute('aria-hidden', 'true');
  livingFx.innerHTML = `
    <div class="daylight-tint"></div>
    <div class="night-vignette"></div>
    <div class="weather-fog fog-a"></div>
    <div class="weather-fog fog-b"></div>
    <div class="rain-field"></div>
    <div class="wind-leaves"></div>
    <div class="firefly-field"></div>`;
  world.append(livingFx);

  const statusHud = document.createElement('div');
  statusHud.className = 'village-atmosphere-hud';
  statusHud.innerHTML = '<span id="villageTimeLabel">Morning</span><i></i><span id="villageWeatherLabel">Clear</span>';
  viewport.append(statusHud);

  const leafField = livingFx.querySelector('.wind-leaves');
  for (let i = 0; i < 22; i += 1) {
    const leaf = document.createElement('i');
    leaf.style.setProperty('--leaf-x', `${Math.random() * 1536}px`);
    leaf.style.setProperty('--leaf-y', `${180 + Math.random() * 720}px`);
    leaf.style.setProperty('--leaf-delay', `${-Math.random() * 13}s`);
    leaf.style.setProperty('--leaf-duration', `${8 + Math.random() * 9}s`);
    leaf.style.setProperty('--leaf-spin', `${180 + Math.random() * 540}deg`);
    leafField.append(leaf);
  }

  const fireflyField = livingFx.querySelector('.firefly-field');
  for (let i = 0; i < 28; i += 1) {
    const fly = document.createElement('i');
    fly.style.left = `${8 + Math.random() * 84}%`;
    fly.style.top = `${38 + Math.random() * 54}%`;
    fly.style.animationDelay = `${-Math.random() * 8}s`;
    fly.style.animationDuration = `${3.5 + Math.random() * 5}s`;
    fireflyField.append(fly);
  }

  const rainField = livingFx.querySelector('.rain-field');
  for (let i = 0; i < 70; i += 1) {
    const drop = document.createElement('i');
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${-Math.random() * 1.2}s`;
    drop.style.animationDuration = `${.55 + Math.random() * .35}s`;
    rainField.append(drop);
  }

  const DAY_LENGTH_MS = 6 * 60 * 1000;
  const timeNames = ['Dawn', 'Morning', 'Afternoon', 'Evening', 'Night', 'Deep Night'];
  let currentTimeBand = '';
  function updateVillageTime(now = Date.now()) {
    const progress = ((now - livingState.epoch) % DAY_LENGTH_MS + DAY_LENGTH_MS) % DAY_LENGTH_MS / DAY_LENGTH_MS;
    const bandIndex = Math.floor(progress * timeNames.length) % timeNames.length;
    const band = ['dawn','morning','afternoon','evening','night','deep-night'][bandIndex];
    if (band !== currentTimeBand) {
      currentTimeBand = band;
      livingFx.classList.remove('time-dawn','time-morning','time-afternoon','time-evening','time-night','time-deep-night');
      livingFx.classList.add('time-night');
      world.dataset.villageTime = 'night';
      const label = document.getElementById('villageTimeLabel');
      if (label) label.textContent = 'Night';
    }
    return { progress, band };
  }

  const WEATHER = ['clear','clear','clear','rain'];
  let currentWeather = 'clear';
  let nextWeatherAt = Date.now() + 26000;
  function setWeather(weather, announce = false) {
    currentWeather = WEATHER.includes(weather) ? weather : 'clear';
    livingFx.classList.remove('weather-clear','weather-fog','weather-wind','weather-rain');
    livingFx.classList.add(`weather-${currentWeather}`);
    world.dataset.villageWeather = currentWeather;
    const names = { clear:'Clear Night', rain:'Rainy Night' };
    const label = document.getElementById('villageWeatherLabel');
    if (label) label.textContent = names[currentWeather];
    if (announce && currentWeather === 'rain') toast('Rain begins to fall over the Village');
  }
  function chooseWeather() {
    const options = WEATHER.filter((value) => value !== currentWeather || value === 'clear');
    setWeather(options[Math.floor(Math.random() * options.length)], true);
    nextWeatherAt = Date.now() + 48000 + Math.random() * 45000;
  }
  setWeather('clear');

  // A synthesized cathedral bell requires no new audio download. Browsers only
  // permit sound after a player gesture, so audio is armed silently on first use.
  let audioContext = null;
  let audioArmed = false;
  const armVillageAudio = () => {
    if (audioArmed) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioContext = audioContext || new Ctx();
      audioContext.resume?.();
      audioArmed = true;
    } catch (_) {}
  };
  viewport.addEventListener('pointerdown', armVillageAudio, { once: true, passive: true });
  function ringCathedralBell(soft = false) {
    if (!audioArmed || !audioContext || document.hidden || viewport.offsetParent === null) return;
    const now = audioContext.currentTime;
    [196, 293.66, 392].forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = index ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * .985, now + 2.8);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime((soft ? .035 : .065) / (index + 1), now + .03 + index * .04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2 + index * .35);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(now + index * .055);
      osc.stop(now + 3.8 + index * .35);
    });
  }
  let lastBellBand = '';

  const LANDMARKS = [
    { id:'cathedral', name:'Cathedral', x:765, y:245, radius:118, action() { livingState.visits.cathedral = (livingState.visits.cathedral || 0) + 1; saveLivingState(); ringCathedralBell(); toast('The cathedral bell answers Shadow’s presence'); } },
    { id:'market', name:'Village Market', x:1060, y:455, radius:105, action() { livingState.visits.market = (livingState.visits.market || 0) + 1; saveLivingState(); toast('Merchants are preparing supplies for the next hunt'); } },
    { id:'river', name:'Old River Crossing', x:455, y:450, radius:95, action() { livingState.visits.river = (livingState.visits.river || 0) + 1; saveLivingState(); toast('The river carries whispers from beyond the Village'); } },
    { id:'south-road', name:'Southern Road', x:765, y:885, radius:105, action() { livingState.visits.southRoad = (livingState.visits.southRoad || 0) + 1; saveLivingState(); toast('The southern road leads toward the next battle'); } }
  ];
  const SECRETS = [
    { id:'riverside-cache', name:'Riverside Cache', x:300, y:515, radius:64, reward:'A hidden cache yields 75 Gold', gold:75 },
    { id:'cathedral-relic', name:'Forgotten Offering', x:940, y:292, radius:60, reward:'You find a forgotten offering: 50 Gold', gold:50 },
    { id:'southern-herbs', name:'Moonlit Herbs', x:1110, y:790, radius:66, reward:'Rare moonlit herbs are added to the Village stores', gold:35 }
  ];

  function nearestVillagePoint() {
    let best = null;
    let bestDistance = Infinity;
    [...SECRETS, ...LANDMARKS].forEach((point) => {
      if (point.reward && livingState.rewards[point.id]) return;
      const distance = Math.hypot(point.x - kaelState.x, point.y - kaelState.y);
      if (distance <= point.radius && distance < bestDistance) { best = point; bestDistance = distance; }
    });
    return best;
  }
  function grantSecret(secret) {
    if (livingState.rewards[secret.id]) { toast('This secret has already been claimed'); return; }
    livingState.rewards[secret.id] = Date.now();
    saveLivingState();
    let granted = false;
    try {
      if (window.ROTKGameBridge?.grantVillageReward) {
        window.ROTKGameBridge.grantVillageReward({ gold: secret.gold || 0, source: secret.id });
        granted = true;
      }
    } catch (_) {}
    // Gold remains a real reward when the bridge supports it; otherwise the
    // discovery is safely recorded without mutating an unknown core save shape.
    toast(`${secret.reward}${granted ? '' : ' · discovery recorded'}`);
    const burst = document.createElement('div');
    burst.className = 'secret-found-burst';
    burst.style.left = `${secret.x}px`; burst.style.top = `${secret.y}px`;
    burst.textContent = '✦'; world.append(burst);
    setTimeout(() => burst.remove(), 1500);
  }

  // Extend the existing interact button while keeping constructed-building
  // interaction as the first priority.
  interact.replaceWith(interact.cloneNode(true));
  const enhancedInteract = document.getElementById('kaelInteract');
  enhancedInteract?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const building = nearestBuilding();
    if (building) { building.click(); return; }
    const point = nearestVillagePoint();
    if (!point) { toast('Move closer to a building or landmark'); return; }
    if (point.reward) grantSecret(point); else point.action();
  });

  let atmosphereLast = performance.now();
  function animateLivingVillage(now) {
    const dt = Math.min(.1, Math.max(0, (now - atmosphereLast) / 1000));
    atmosphereLast = now;
    const visible = villageFrame.documentVisible && villageFrame.onScreen;
    if (visible) {
      const time = updateVillageTime(Date.now());
      if (Date.now() >= nextWeatherAt) chooseWeather();
      if ((time.band === 'evening' || time.band === 'dawn') && lastBellBand !== time.band) {
        lastBellBand = time.band;
        ringCathedralBell(true);
      } else if (time.band !== 'evening' && time.band !== 'dawn') lastBellBand = '';
      // Citizens slow slightly during rain and settle into a calmer pace at night.
      const pace = currentWeather === 'rain' ? .82 : (time.band === 'night' || time.band === 'deep-night') ? .76 : 1;
      villagePace = pace;
      citizenLayer.style.setProperty('--village-pace', String(pace));
      statusHud.classList.toggle('near-secret', Boolean(nearestVillagePoint()?.reward));
    }
  }
  updateVillageTime();
  registerVillageFrame('atmosphere', animateLivingVillage);


  // ---- V31.5 — Living Economy, Construction and Village Life ------------
  // All new data is isolated from the established save schema. Existing plot
  // strings, battle progress, cards and economy saves remain fully readable.
  const VILLAGE_JUICE_KEY = 'rotk.village.juice.v31_5';
  const juiceState = (() => {
    const fallback = { constructions:{}, blessings:{}, trophies:[], event:null, nextEventAt:Date.now()+65000, happinessBonus:0 };
    try { return Object.assign(fallback, JSON.parse(localStorage.getItem(VILLAGE_JUICE_KEY)||'{}')); } catch (_) { return fallback; }
  })();
  function saveJuiceState(){ try{ localStorage.setItem(VILLAGE_JUICE_KEY, JSON.stringify(juiceState));queueCloudSave('village-event'); }catch(_){} }
  function beginVillageConstruction(index,type){
    juiceState.constructions[index] = { type, started:Date.now(), duration:30000 };
    saveJuiceState();
  }
  function getConstructionVisual(index){
    const c=juiceState.constructions[index];
    if(!c) return {active:false,stage:4,percent:100,label:''};
    const percent=Math.min(100,Math.floor((Date.now()-c.started)/Math.max(1,c.duration)*100));
    if(percent>=100){ delete juiceState.constructions[index]; saveJuiceState(); return {active:false,stage:4,percent:100,label:''}; }
    const stage=percent<22?0:percent<48?1:percent<76?2:3;
    const labels=['Laying Foundation','Raising Framework','Adding Walls','Finishing Roof'];
    return {active:true,stage,percent,label:labels[stage]};
  }
  function getVillageHappiness(core={}){
    const placed=Object.values(readPlots());
    const uplifting=new Set(['house','manor','almshouse','well','market','tavern','chapel','shrine','townhall','garden','fountain']);
    const builtBonus=placed.reduce((n,t)=>n+(uplifting.has(t)?2:1),0);
    const secretBonus=Object.keys(livingState.rewards||{}).length*2;
    const visitBonus=Math.min(8,Object.values(livingState.visits||{}).reduce((a,b)=>a+(Number(b)||0),0));
    return Math.max(45,Math.min(100,Math.round(58+builtBonus+secretBonus+visitBonus+(juiceState.happinessBonus||0))));
  }

  const lifeLayer=document.createElement('div');
  lifeLayer.className='village-life-layer';
  lifeLayer.innerHTML=`
    <div class="district-aura aura-residential"><b>RESIDENTIAL QUARTER</b></div>
    <div class="district-aura aura-commerce"><b>MARKET QUARTER</b></div>
    <div class="district-aura aura-civic"><b>SOUTH COMMONS</b></div>
    <div class="wildlife wildlife-cat">🐈</div><div class="wildlife wildlife-dog">🐕</div>
    <div class="wildlife wildlife-deer">🦌</div><div class="river-fish fish-a">◁</div><div class="river-fish fish-b">◁</div>
    <div class="economy-caravan"><i>🛒</i><span>Village Goods</span></div>
    <div class="delivery-worker worker-a"><i>🪵</i></div><div class="delivery-worker worker-b"><i>🪨</i></div>
    <div class="village-event-banner hidden" id="villageEventBanner"></div>`;
  world.append(lifeLayer);

  const servicePanel=document.createElement('div');
  servicePanel.className='village-service-panel hidden';
  servicePanel.innerHTML='<div class="service-card"><button class="service-close" type="button">×</button><h2></h2><p class="service-copy"></p><div class="service-actions"></div></div>';
  viewport.append(servicePanel);
  servicePanel.addEventListener('pointerdown',e=>e.stopPropagation());
  servicePanel.querySelector('.service-close').addEventListener('click',()=>servicePanel.classList.add('hidden'));
  function openVillageService(title,copy,actions){
    servicePanel.querySelector('h2').textContent=title;
    servicePanel.querySelector('.service-copy').textContent=copy;
    const root=servicePanel.querySelector('.service-actions'); root.replaceChildren();
    actions.forEach(a=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${a.icon||'✦'} ${a.name}</b><small>${a.detail||''}</small>`;b.onclick=()=>a.run?.();root.append(b)});
    servicePanel.classList.remove('hidden');
  }
  function cathedralServices(){
    openVillageService('Cathedral Services','The cathedral offers protection and recovery before Shadow returns to battle.',[
      {icon:'✨',name:'Blessing of Resolve',detail:'A lasting village blessing · 75 Gold',run(){ if(window.ROTKGameBridge?.spendVillageGold?.(75)){juiceState.blessings.resolve=Date.now();juiceState.happinessBonus=Math.min(12,(juiceState.happinessBonus||0)+2);saveJuiceState();ringCathedralBell();toast('Shadow receives the Blessing of Resolve');servicePanel.classList.add('hidden')}else toast('Not enough Gold for this blessing');}},
      {icon:'❤',name:'Rest and Recover',detail:'Restore courage before the next hunt',run(){juiceState.blessings.rested=Date.now();saveJuiceState();toast('Shadow rests beneath the cathedral light');servicePanel.classList.add('hidden')}},
      {icon:'🕯️',name:'Light a Memorial Candle',detail:'+1 Village happiness',run(){juiceState.happinessBonus=Math.min(12,(juiceState.happinessBonus||0)+1);saveJuiceState();ringCathedralBell(true);toast('A candle now burns for the fallen');servicePanel.classList.add('hidden')}}
    ]);
  }
  function shadowHomeServices(){
    const trophies=Object.keys(livingState.rewards||{}).length;
    openVillageService("Shadow's Home",'A quiet headquarters containing trophies, equipment, records and a place to rest.',[
      {icon:'🏆',name:'Trophy Room',detail:`${trophies} village discoveries displayed`,run(){toast(`${trophies} discoveries are displayed in Shadow’s trophy room`)}},
      {icon:'🛏️',name:'Rest Beneath the Moon',detail:'Records a safe rest without changing the eternal night',run(){juiceState.blessings.rested=Date.now();saveJuiceState();toast('Shadow rests while midnight watches over the Village');servicePanel.classList.add('hidden')}},
      {icon:'📖',name:'Hunter Journal',detail:'Review village growth and happiness',run(){toast(`Village happiness: ${getVillageHappiness()}% · ${Object.keys(readPlots()).length} structures`)}}
    ]);
  }
  // Replace the simple Cathedral action and add Shadow's headquarters.
  const cathedral=LANDMARKS.find(p=>p.id==='cathedral'); if(cathedral) cathedral.action=cathedralServices;
  LANDMARKS.push({id:'shadow-home',name:"Shadow's Home",x:655,y:720,radius:92,action:shadowHomeServices});

  const EVENTS=[
    {id:'caravan',name:'Merchant Caravan',copy:'A merchant caravan has arrived. Trade is flourishing.',bonus:3,duration:45000},
    {id:'festival',name:'Lantern Festival',copy:'Lanterns and music fill the village streets.',bonus:5,duration:50000},
    {id:'bard',name:'Traveling Bard',copy:'A traveling bard performs beside the market.',bonus:2,duration:40000},
    {id:'sale',name:'Blacksmith Sale',copy:'The blacksmith offers discounted repairs today.',bonus:2,duration:45000},
    {id:'ceremony',name:'Cathedral Ceremony',copy:'The cathedral holds a ceremony for returning hunters.',bonus:4,duration:48000}
  ];
  function startVillageEvent(){
    const event={...EVENTS[Math.floor(Math.random()*EVENTS.length)],started:Date.now()};
    juiceState.event=event; juiceState.nextEventAt=Date.now()+120000+Math.random()*90000; saveJuiceState();
    showVillageEvent(event,true);
  }
  function showVillageEvent(event,announce=false){
    const banner=document.getElementById('villageEventBanner'); if(!banner)return;
    const active=event&&Date.now()-event.started<event.duration;
    banner.classList.toggle('hidden',!active); world.classList.toggle(`event-${event?.id||'none'}`,active);
    if(active){banner.innerHTML=`<b>✦ ${event.name}</b><span>${event.copy}</span>`; if(announce)toast(`${event.name} begins in the Village`)}
  }
  let lastJuiceRender=0;
  function animateVillageJuice(now){
    if(now-lastJuiceRender>900){
      lastJuiceRender=now;
      const activeBuilds=Object.keys(juiceState.constructions||{}).length;
      lifeLayer.classList.toggle('construction-busy',activeBuilds>0);
      if(activeBuilds>0) renderPlots();
      if(juiceState.event&&Date.now()-juiceState.event.started>=juiceState.event.duration){juiceState.event=null;saveJuiceState();showVillageEvent(null)}
      else showVillageEvent(juiceState.event);
      if(!juiceState.event&&Date.now()>juiceState.nextEventAt)startVillageEvent();
      const data=window.ROTKGameBridge?.getVillageEconomy?.();
      setText('economyHappiness',`${getVillageHappiness(data||{})}%`);
    }
  }
  showVillageEvent(juiceState.event);
  registerVillageFrame('construction', animateVillageJuice);

  // The game bridge is created by game.js after this module. Render immediately,
  // then refresh economy and grant readiness once the rest of the game is loaded.
  const threeStatus = document.createElement('div');
  threeStatus.id = 'villageThreeStatus';
  threeStatus.textContent = 'INITIALIZING 3D VILLAGE…';
  viewport.appendChild(threeStatus);
  createVillageThreeWorld({
    viewport,
    world,
    getShadowState: () => kaelState,
    readPlots,
    buildingDefs: BUILDINGS,
    getBuildState: () => ({ active: buildMode, type: buildType }),
    onPlotSelected: (index) => {
      const plot = plotsRoot?.querySelector(`[data-plot="${index}"]`);
      if (plot) constructPlot(plot);
    }
  })
    .then((api) => {
      villageThreeWorld = api;
      if(new URLSearchParams(location.search).has('visualAudit'))window.VillageVisualAudit=api;
      document.body.classList.add('village-three-active');
      threeStatus.textContent = 'VILLAGE 2.0 WORLD ACTIVE';
      setTimeout(() => threeStatus.remove(), 2600);
    })
    .catch((error) => {
      // V32.6.2 — the old handler reported `error.message`, which is undefined for
      // the DOM ErrorEvents that Three.js loaders reject with, so every asset 404
      // surfaced as "Unknown WebGL error". It then set world.innerHTML, destroying
      // the 2D Village along with the plots, buildings and citizens — leaving a
      // black screen with no way back. The 3D layer is an enhancement; when it
      // fails the hand-drawn Village must simply carry on.
      const reason = describeLoadError(error);
      console.error('[Village Three.js] failed to initialize:', reason, error);
      document.body.classList.remove('village-three-active');
      document.body.classList.add('village-three-error');
      threeStatus.textContent = '3D VILLAGE UNAVAILABLE — ' + reason;
      threeStatus.title = reason;
      document.getElementById('villageThreeCanvas')?.remove();
      setTimeout(() => threeStatus.remove(), 7000);
      toast('3D Village unavailable — showing the classic Village.');
    });

  const plotObserver = new MutationObserver(() => villageThreeWorld?.rebuildPlots?.());
  if (plotsRoot) plotObserver.observe(plotsRoot, { childList:true, subtree:true });

  const buildSearchInput = document.getElementById('villageBuildSearch');
  buildSearchInput?.addEventListener('input', (e) => { buildSearch = e.target.value || ''; renderBuildTray(); });
  bind('villageBuildClearSearch', () => { buildSearch = ''; if (buildSearchInput) buildSearchInput.value = ''; renderBuildTray(); });
  renderBuildTray();
  renderPlots();
  window.addEventListener('load', () => { window.ROTKGameBridge?.refreshHome?.(); refreshVillageEconomy(true); }, { once: true });
  economyRefreshTimer = window.setInterval(() => refreshVillageEconomy(false), 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshVillageEconomy(true); });

  window.addEventListener('resize', () => { cameraFollow.ready = false; cameraScales(); center(false); }, { passive: true });
  requestAnimationFrame(() => center(false));
  window.ROTKVillageCamera = { center, zoomAt, render, camera };

  // ---- V29.8 — Konami code easter egg (a Metal Gear homage) ----------------
  const MGS = {
    key:'village.tactical.mode', on:false,
    lines:[
      'Kept you waiting, huh?',
      'Snake? Snake?! SNAAAAKE!',
      'This is Snake. Colonel, do you read me?',
      'A cardboard box. Standard issue.',
      'I need scissors! 61!',
      'Codec frequency 140.85 — the Village is listening.'
    ]
  };
  try { MGS.on = localStorage.getItem(MGS.key) === '1'; } catch (_) {}
  function mgsAlert(){
    const kael = document.querySelector('.kael-world-avatar');
    if (!kael) return;
    const bang = document.createElement('div');
    bang.className = 'mgs-alert';
    bang.textContent = '!';
    kael.appendChild(bang);
    setTimeout(()=>bang.remove(), 1400);
  }
  function mgsBox(){
    const kael = document.querySelector('.kael-world-avatar');
    if (!kael) return;
    kael.classList.toggle('in-cardboard-box', MGS.on);
  }
  function toggleTactical(){
    MGS.on = !MGS.on;
    try { localStorage.setItem(MGS.key, MGS.on ? '1' : '0'); } catch (_) {}
    document.body.classList.toggle('tactical-espionage', MGS.on);
    mgsBox();
    if (MGS.on) { mgsAlert(); toast('❗ TACTICAL ESPIONAGE VILLAGE'); }
    else toast('Tactical mode off. Colonel out.');
  }
  function mgsLine(){
    if (!MGS.on) return;
    toast(MGS.lines[Math.floor(Math.random()*MGS.lines.length)]);
  }
  function initKonamiVillage(){
    const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let i=0;
    addEventListener('keydown',(ev)=>{
      const k = ev.key.length===1 ? ev.key.toLowerCase() : ev.key;
      i = (k===seq[i]) ? i+1 : (k===seq[0] ? 1 : 0);
      if (i===seq.length){ i=0; toggleTactical(); }
    });
    // touch path: seven quick taps on the village crest
    const crest = document.querySelector('.village-topbar h1, .village-title, .pixel-village h1');
    if (crest){
      let n=0,last=0;
      crest.addEventListener('click',()=>{
        const t=Date.now(); n=(t-last<900)?n+1:1; last=t;
        if(n>=7){ n=0; toggleTactical(); }
      });
    }
    if (MGS.on){ document.body.classList.add('tactical-espionage'); mgsBox(); }
    // the Colonel checks in now and then
    setInterval(()=>{ if (MGS.on && Math.random()<0.5) mgsLine(); }, 45000);
  }
  initKonamiVillage();

});
