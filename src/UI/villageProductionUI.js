const LEGACY_VILLAGE_STYLE_IDS = ['villageV17CriticalUI', 'villageV30ConstructionCatalog'];

const RESOURCE_META = {
  homeEssence: ['ESSENCE', '◆'], homeEmbers: ['EMBERS', '✦'],
  homeKingdomRank: ['RANK', '♛'], homeVictories: ['VICTORIES', '⚔']
};

function retireLegacyVillageStyles() {
  LEGACY_VILLAGE_STYLE_IDS.forEach((id) => document.getElementById(id)?.remove());
}

function decorateResources() {
  Object.entries(RESOURCE_META).forEach(([id, [label, icon]]) => {
    const value = document.getElementById(id);
    const chip = value?.closest('span');
    if (!chip || chip.dataset.productionUi === 'ready') return;
    chip.dataset.productionUi = 'ready'; chip.dataset.resource = label.toLowerCase();
    chip.replaceChildren();
    const glyph = document.createElement('i'); glyph.textContent = icon;
    const copy = document.createElement('span');
    const caption = document.createElement('small'); caption.textContent = label;
    copy.append(caption, value); chip.append(glyph, copy);
  });
}

function syncCloudState() {
  const source = document.getElementById('cloudSaveIndicator');
  const hud = document.querySelector('#menu .village-hud');
  if (!source || !hud) return;
  let compact = document.getElementById('villageCloudState');
  if (!compact) {
    compact = document.createElement('div'); compact.id = 'villageCloudState'; compact.className = 'village-cloud-state';
    compact.setAttribute('role', 'status'); hud.append(compact);
  }
  const apply = () => {
    const state = source.dataset.state || (source.classList.contains('hidden') ? 'saved' : 'pending');
    compact.dataset.state = state;
    compact.textContent = state === 'saved' ? '● SYNCED' : state === 'saving' || state === 'loading' ? '◌ SAVING' : state === 'offline' ? '○ OFFLINE' : '◌ SYNC PENDING';
  };
  apply(); new MutationObserver(apply).observe(source, { attributes: true, childList: true, characterData: true, subtree: true });
}

function installContextLabels() {
  const build = document.getElementById('villageBuildBtn');
  if (build) build.innerHTML = '<span>⌁</span><b>BUILD</b><small>Open construction</small>';
  document.querySelectorAll('#bottomNav [data-nav]').forEach((button) => button.setAttribute('aria-label', button.querySelector('small')?.textContent || button.dataset.nav));
}

function installDistrictBanner() {
  const menu = document.getElementById('menu');
  if (!menu || document.getElementById('villageDistrictReveal')) return;
  const reveal = document.createElement('div'); reveal.id = 'villageDistrictReveal'; reveal.className = 'village-district-reveal hidden';
  reveal.innerHTML = '<small>DISTRICT DISCOVERED</small><b></b><span></span>'; menu.append(reveal);
  let timer;
  window.addEventListener('village:district-reveal', (event) => {
    const detail = event.detail || {};
    reveal.querySelector('b').textContent = detail.name || 'The Village';
    reveal.querySelector('span').textContent = detail.description || 'A refuge beneath the eternal moon.';
    reveal.classList.remove('hidden', 'leaving'); clearTimeout(timer);
    timer = setTimeout(() => reveal.classList.add('leaving'), 3200);
    setTimeout(() => reveal.classList.add('hidden'), 3700);
  });
}

export function initializeVillageProductionUI() {
  retireLegacyVillageStyles(); decorateResources(); syncCloudState(); installContextLabels(); installDistrictBanner();
  document.documentElement.classList.add('village-production-ui');
}
