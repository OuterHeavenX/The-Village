// Cards 3.0 — the Battle Deck screen.
//
// One layout that adapts instead of three fighting stylesheets: a sticky
// header (title, deck counter, filter chips, sort/merge tools), a scrolling
// collection grid, and a six-slot deck strip that stays on screen — docked
// at the bottom above the nav on phones and tablets, docked right on desktop.
// Card detail opens as a bottom sheet on touch and as a side panel on desktop.
//
// game.js still owns every rule (what a card is, what equipping does, merges,
// gems, unlocks) and hands those functions in through `deps`; this module
// owns only the DOM of #deckScreen. Save fields touched: `deck`, `favorites`,
// `groundDefenseSlots`, `ui.cardFilter`, `ui.cardSort` — the same ones the
// previous screen used, with the same meanings.

const FILTERS = [
  { id: 'all', icon: '✦', label: 'All' },
  { id: 'tower', icon: '♜', label: 'Defense' },
  { id: 'support', icon: '✚', label: 'Support' },
  { id: 'skill', icon: '⚔', label: 'Skills' },
  { id: 'hero', icon: '⬆', label: 'Run Upgrades' },
  { id: 'ground', icon: '◬', label: 'Passives' },
  { id: 'heroProfile', icon: '☾', label: 'Hero' },
  { id: 'equipment', icon: '🛡', label: 'Equipment' },
  { id: 'gems', icon: '◆', label: 'Gems' },
  { id: 'fragments', icon: '✧', label: 'Fragments' },
  { id: 'fusion', icon: '⚗', label: 'Fusion' },
  { id: 'consumables', icon: '🧪', label: 'Consumables' }
];
const ASCENSION_FILTERS = ['equipment', 'gems', 'fragments', 'fusion', 'consumables'];
const SORTS = [['type', 'Type'], ['rarity', 'Rarity'], ['strength', 'Strength'], ['level', 'Level'], ['name', 'Name'], ['recent', 'Recent']];
const TYPE_GLYPH = { tower: '🛡️', support: '◈', skill: '⚔️', hero: '⬆️', trap: '◬' };
const DECK_SIZE = 6, GROUND_SIZE = 2;
const HOLD_MS = 240, DRAG_START_PX = 8, TAP_SLOP_PX = 10;

// cardHTML()/miniCardHTML() in game.js emit the legacy class names that the
// old deck stylesheet still styles with !important; renaming them on the way
// in keeps this screen's cascade its own.
const LEGACY_CLASS = { 'card-level': 'c3x-level', tag: 'c3x-tag', 'card-art': 'c3x-art', 'card-art-image': 'c3x-art-image', 'art-sigil': 'c3x-sigil', 'card-copy': 'c3x-copy', 'ascension-card-xp': 'c3x-xp', 'card-primary-stats': 'c3x-stats', 'defense-stats': 'c3x-defense', 'atk-stat': 'c3x-atk', 'hp-stat': 'c3x-hp', 'card-footer': 'c3x-footer', 'ascension-gem-slots': 'c3x-gems', 'deck-card-level': 'c3x-level', 'deck-card-art': 'c3x-art', 'deck-card-name': 'c3x-name', 'deck-card-stats': 'c3x-stats', 'system-road-art': 'c3x-system' };
const isolate = html => String(html).replace(/class="([^"]*)"/g, (m, cls) => `class="${cls.split(/\s+/).map(k => LEGACY_CLASS[k] || k).join(' ')}"`);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function installCardsScreen(deps) {
  const { root, card, inv, rarityDef, cardPower, cardHTML, miniCardHTML, cardIconHTML, CARD_POOL, HERO_GROUND_DEFENSES, groundCardById,
    toggleFavorite, mergeCard, canPayRarityUpgrade, requestMergeAllDuplicates, sortCards, shortType, unlockChapterForCard, cardMetrics, attackPattern,
    ascensionGemDef, renderAscensionInventory, renderHeroJPPanel, HEROES, currentShadowLevel, shadowPortraitHTML, ascensionEquipmentStats,
    EQUIPMENT_SLOTS, equipmentById, saveProgress, showToast, openScreen, screens, renderHeroes, ensureVisibleCardCollection, reconcileCardUnlocks } = deps;

  // game.js declares `save` with let and may replace it (cloud restore, reset);
  // reading through deps each time keeps this screen on the live object.
  const save = new Proxy({}, { get: (_, key) => deps.save[key], set: (_, key, value) => { deps.save[key] = value; return true; }, has: (_, key) => key in deps.save });
  const desktopQuery = matchMedia('(min-width: 1024px) and (pointer: fine)');
  const state = { mergeOnly: false, detail: null, swapFor: null, drag: null };

  root.innerHTML = `
  <div class="c3" data-mode="${desktopQuery.matches ? 'desktop' : 'touch'}">
    <header class="c3-head">
      <div class="c3-title">
        <button id="c3Back" class="c3-back" type="button" aria-label="Back to the Village">‹</button>
        <div class="c3-title-copy"><span class="c3-kicker">Hunter loadout</span><h2>Battle Deck</h2></div>
        <div id="c3Counter" class="c3-count" aria-live="polite">0 / ${DECK_SIZE}</div>
      </div>
      <div class="c3-chips" role="tablist" aria-label="Card categories">
        ${FILTERS.map(f => `<button type="button" role="tab" class="c3-chip" data-filter="${f.id}"><b>${f.icon}</b><span>${f.label}</span></button>`).join('')}
      </div>
      <div class="c3-tools">
        <select id="c3Sort" class="c3-select" aria-label="Sort collection">${SORTS.map(([v, l]) => `<option value="${v}">Sort: ${l}</option>`).join('')}</select>
        <label class="c3-toggle"><input id="c3MergeOnly" type="checkbox"><span>Merge ready</span></label>
        <button id="c3MergeAll" class="c3-merge" type="button" disabled>Rarity upgrades</button>
      </div>
    </header>
    <div class="c3-body">
      <button id="c3Hero" class="c3-hero" type="button" aria-label="Open the selected hunter">
        <span id="c3HeroPortrait" class="c3-hero-portrait"></span>
        <span class="c3-hero-copy"><small>Selected hunter</small><strong id="c3HeroName">Shadow</strong><em id="c3HeroLevel">Lv 1</em><span id="c3HeroGear" class="c3-hero-gear"></span></span>
        <span class="c3-hero-passives"><small>Passive ground defenses</small><span id="c3GroundSlots" class="c3-ground-slots"></span></span>
      </button>
      <div id="cardsCollection" class="c3-collection" aria-live="polite"></div>
    </div>
    <aside class="c3-deck" aria-label="Six-card battle deck">
      <div class="c3-deck-head"><span class="c3-kicker">Active loadout</span><span id="c3Analysis" class="c3-deck-analysis"></span><button id="c3Save" class="c3-save" type="button">Save Deck</button></div>
      <div id="c3Slots" class="c3-slots"></div>
    </aside>
    <div class="c3-scrim" hidden></div>
    <section id="cardsDetail" class="c3-sheet" role="dialog" aria-modal="true" aria-label="Card details" hidden>
      <div class="c3-sheet-handle" aria-hidden="true"><i></i></div>
      <button class="c3-sheet-close" type="button" aria-label="Close details">×</button>
      <div class="c3-sheet-body"></div>
    </section>
  </div>`;

  const el = {
    shell: root.querySelector('.c3'), body: root.querySelector('.c3-body'), collection: root.querySelector('#cardsCollection'),
    slots: root.querySelector('#c3Slots'), counter: root.querySelector('#c3Counter'), analysis: root.querySelector('#c3Analysis'),
    chips: root.querySelector('.c3-chips'), sort: root.querySelector('#c3Sort'), mergeOnly: root.querySelector('#c3MergeOnly'),
    mergeAll: root.querySelector('#c3MergeAll'), save: root.querySelector('#c3Save'), back: root.querySelector('#c3Back'),
    hero: root.querySelector('#c3Hero'), sheet: root.querySelector('#cardsDetail'), sheetBody: root.querySelector('.c3-sheet-body'),
    scrim: root.querySelector('.c3-scrim'), deck: root.querySelector('.c3-deck')
  };

  // ---- data helpers ----------------------------------------------------------
  const ui = () => (save.ui = save.ui || { cardFilter: 'all', cardSort: 'type' });
  const filter = () => (FILTERS.some(f => f.id === ui().cardFilter) ? ui().cardFilter : 'all');
  const sort = () => (SORTS.some(([v]) => v === ui().cardSort) ? ui().cardSort : 'type');
  const isOwned = id => !!card(id) && save.unlocked.includes(id) && inv(id).copies > 0;
  const inDeck = id => save.deck.includes(id);
  const groundOwned = id => !!groundCardById(id) && inv(id).copies > 0;
  const anyCard = id => card(id) || groundCardById(id) || null;

  function equipAt(id, index = null) {
    if (!isOwned(id)) { showToast('That card is still locked'); return false; }
    const next = save.deck.filter(x => x !== id);
    if (index !== null && index < next.length) next[index] = id;
    else if (next.length < DECK_SIZE) next.push(id);
    else { showToast('Deck already has six cards — tap a slot to swap'); return false; }
    save.deck = next.slice(0, DECK_SIZE);
    saveProgress();
    return true;
  }
  function unequip(id) {
    if (!inDeck(id)) return false;
    save.deck = save.deck.filter(x => x !== id);
    saveProgress();
    return true;
  }
  function equipGround(id, index = null) {
    if (!groundOwned(id)) { showToast('That passive is still locked'); return false; }
    const next = save.groundDefenseSlots.filter(x => x !== id);
    if (index !== null && index < next.length) next[index] = id;
    else if (next.length < GROUND_SIZE) next.push(id);
    else { showToast('Shadow already carries two Passive Cards'); return false; }
    save.groundDefenseSlots = next.slice(0, GROUND_SIZE);
    saveProgress();
    return true;
  }
  function unequipGround(id) {
    if (!save.groundDefenseSlots.includes(id)) return false;
    save.groundDefenseSlots = save.groundDefenseSlots.filter(x => x !== id);
    saveProgress();
    return true;
  }

  // ---- rendering -------------------------------------------------------------
  function collectionCard(c, { ground = false } = {}) {
    const item = inv(c.id), owned = ground ? groundOwned(c.id) : isOwned(c.id), equipped = ground ? save.groundDefenseSlots.includes(c.id) : inDeck(c.id);
    const fav = !ground && save.favorites.includes(c.id), unlockAt = unlockChapterForCard(c.id);
    const article = document.createElement('article');
    article.className = `c3-card rarity-${item.rarity}${equipped ? ' is-equipped' : ''}${owned ? '' : ' is-locked'}${ground ? ' is-ground' : ''}`;
    article.dataset.cardId = c.id;
    article.dataset.ground = ground ? '1' : '';
    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-label', `${c.name}${equipped ? ', equipped' : owned ? '' : ', locked'}`);
    article.innerHTML = isolate(cardHTML(c, true))
      + `<span class="c3-type" title="${esc(shortType(c.type))}">${TYPE_GLYPH[c.type] || '◆'}</span>`
      + (ground ? '' : `<button type="button" class="c3-fav${fav ? ' is-on' : ''}" data-act="favorite" aria-label="${fav ? 'Unfavorite' : 'Favorite'}">★</button>`)
      + (owned ? `<button type="button" class="c3-quick" data-act="${equipped ? 'remove' : 'equip'}" aria-label="${equipped ? 'Remove from deck' : 'Add to deck'}">${equipped ? '−' : '+'}</button>` : '')
      + (owned ? `<span class="c3-status">${equipped ? (ground ? 'ON SHADOW' : 'IN DECK') : `${item.copies} ${item.copies === 1 ? 'copy' : 'copies'}`}</span>`
               : `<span class="c3-lock"><b>🔒 Locked</b><small>${unlockAt ? `Chapter ${unlockAt.number}` : 'Campaign reward'}</small></span>`);
    return article;
  }

  function renderCollection() {
    const box = el.collection, f = filter();
    const scrollTop = el.body.scrollTop;
    box.innerHTML = '';
    if (ASCENSION_FILTERS.includes(f)) { box.className = 'c3-collection'; renderAscensionInventory(box, f); box.classList.add('c3-collection', 'is-panel'); }
    else if (f === 'heroProfile') { box.className = 'c3-collection'; renderHeroJPPanel(box, HEROES.find(h => h.id === save.selectedHero) || HEROES[0]); box.classList.add('c3-collection', 'is-panel'); }
    else {
      box.className = 'c3-collection is-grid';
      const cards = f === 'ground' ? HERO_GROUND_DEFENSES
        : sortCards(CARD_POOL.filter(c => (f === 'all' || c.type === f) && (!state.mergeOnly || canPayRarityUpgrade(inv(c.id), c.id))), sort());
      const fragment = document.createDocumentFragment();
      for (const c of cards) fragment.append(collectionCard(c, { ground: f === 'ground' }));
      if (!cards.length) { const empty = document.createElement('p'); empty.className = 'c3-empty'; empty.textContent = state.mergeOnly ? 'No card is ready for a rarity upgrade yet.' : 'Nothing here yet.'; fragment.append(empty); }
      box.append(fragment);
    }
    el.body.scrollTop = scrollTop;
  }

  function renderSlots() {
    el.slots.innerHTML = '';
    for (let i = 0; i < DECK_SIZE; i++) {
      const id = save.deck[i], c = id ? card(id) : null, slot = document.createElement('button');
      slot.type = 'button';
      slot.dataset.slot = String(i);
      if (c) {
        slot.className = `c3-slot is-filled rarity-${inv(id).rarity}`;
        slot.dataset.cardId = id;
        slot.innerHTML = isolate(miniCardHTML(c)) + `<span class="c3-slot-index">${i + 1}</span>`;
        slot.setAttribute('aria-label', `Slot ${i + 1}: ${c.name}`);
      } else {
        slot.className = 'c3-slot is-empty';
        slot.innerHTML = `<span class="c3-slot-plus">+</span><small>Slot ${i + 1}</small>`;
        slot.setAttribute('aria-label', `Slot ${i + 1}: empty`);
      }
      el.slots.append(slot);
    }
    el.deck.classList.toggle('is-swapping', !!state.swapFor);
    el.counter.textContent = `${save.deck.length} / ${DECK_SIZE}`;
    el.counter.classList.toggle('is-full', save.deck.length === DECK_SIZE);
    const d = save.deck.map(card).filter(Boolean);
    const count = type => d.filter(c => c.type === type).length;
    const notes = [];
    if (!count('tower')) notes.push('<i class="warn">no defense</i>');
    if (!count('support')) notes.push('<i class="warn">no support</i>');
    el.analysis.innerHTML = `Defense ${count('tower')} · Support ${count('support')} · Skills ${count('skill')} · Upgrades ${count('hero')}${notes.length ? ' · ' + notes.join(' · ') : ''}`;
  }

  function renderHero() {
    const hero = HEROES.find(h => h.id === save.selectedHero) || HEROES[0], level = Math.max(1, save.heroLevels?.[hero.id] || 1), stats = ascensionEquipmentStats();
    root.querySelector('#c3HeroPortrait').innerHTML = shadowPortraitHTML(currentShadowLevel());
    root.querySelector('#c3HeroName').textContent = hero.name;
    root.querySelector('#c3HeroLevel').textContent = `Lv ${level} · ${save.heroJP[hero.id] || 0} JP · Faith ${Math.round(stats.faith || 0)} · Bravery ${Math.round(stats.bravery || 0)}`;
    root.querySelector('#c3HeroGear').innerHTML = EQUIPMENT_SLOTS.map(slot => { const item = equipmentById(save.ascension.equipped[slot]); return `<span title="${esc(slot)}: ${esc(item?.name || 'Empty')}"${item ? ' class="is-set"' : ''}>${item?.icon || '◇'}</span>`; }).join('');
    const ground = root.querySelector('#c3GroundSlots');
    ground.innerHTML = '';
    for (let i = 0; i < GROUND_SIZE; i++) {
      const id = save.groundDefenseSlots[i], c = groundCardById(id), slot = document.createElement('span');
      slot.className = `c3-ground-slot${c ? ` is-filled rarity-${inv(c.id).rarity}` : ' is-empty'}`;
      slot.dataset.groundSlot = String(i);
      if (c) { slot.dataset.cardId = c.id; slot.innerHTML = `<b>${cardIconHTML(c, inv(c.id).level)}</b><small>${esc(c.name)}</small>`; slot.title = `${c.name} · Passive slot ${i + 1}`; }
      else slot.innerHTML = `<b>+</b><small>Slot ${i + 1}</small>`;
      ground.append(slot);
    }
  }

  function renderTools() {
    const f = filter();
    el.chips.querySelectorAll('.c3-chip').forEach(chip => { const on = chip.dataset.filter === f; chip.classList.toggle('is-active', on); chip.setAttribute('aria-selected', String(on)); if (on) chip.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); });
    el.sort.value = sort();
    el.mergeOnly.checked = state.mergeOnly;
    const ready = CARD_POOL.filter(c => canPayRarityUpgrade(inv(c.id), c.id)).length;
    el.mergeAll.disabled = !ready;
    el.mergeAll.textContent = ready ? `Rarity upgrades (${ready})` : 'Rarity upgrades';
    const grid = !ASCENSION_FILTERS.includes(f) && f !== 'heroProfile' && f !== 'ground';
    el.sort.hidden = !grid; el.mergeOnly.parentElement.hidden = !grid;
  }

  function render() {
    save.favorites = Array.isArray(save.favorites) ? save.favorites : [];
    ui();
    ensureVisibleCardCollection();
    const repaired = reconcileCardUnlocks();
    if (repaired.length) setTimeout(() => showToast(`Recovered unlocks: ${repaired.map(c => c.name).join(' + ')}`), 100);
    el.shell.dataset.mode = desktopQuery.matches ? 'desktop' : 'touch';
    renderHero(); renderSlots(); renderTools(); renderCollection();
    if (state.detail) { const c = anyCard(state.detail); if (c) renderDetail(c); else closeDetail(); }
  }

  // ---- detail sheet / side panel ---------------------------------------------
  function renderDetail(c) {
    const item = inv(c.id), r = rarityDef(item.rarity), ground = c.type === 'trap', pattern = attackPattern(c);
    const owned = ground ? groundOwned(c.id) : isOwned(c.id), equipped = ground ? save.groundDefenseSlots.includes(c.id) : inDeck(c.id);
    const fav = !ground && save.favorites.includes(c.id), unlockAt = unlockChapterForCard(c.id);
    const compat = ground ? 'Equips to one of Shadow’s two Passive Card slots.' : c.type === 'support' ? 'Whip, Dagger, Axe, Cross, Clock, Bone, Familiar, Cannon, Rosary, Garlic, Living Word' : c.type === 'tower' ? 'Holy Water Infusion · Chrono Sigil · Guardian Ward' : '—';
    const metrics = [...cardMetrics(c), ['Level', item.level], ['Rarity', r.name], ['Copies', item.copies], [ground ? 'Shadow' : 'Deck', equipped ? 'Equipped' : owned ? 'Reserve' : 'Locked'], ['Unlock', owned ? 'Unlocked' : unlockAt ? `Chapter ${unlockAt.number}: ${unlockAt.name}` : 'Campaign reward']];
    const gems = c.type === 'tower' ? `<section class="c3-gems"><h3>Permanent gem slots</h3>${item.gemSlots.map((id, index) => { const gem = ascensionGemDef(id); return `<div class="c3-gem"><span>${gem ? gem.icon : '○'}</span><div><b>${gem ? esc(gem.name) : `Gem slot ${index + 1}`}</b><small>${gem ? esc(Object.entries(gem.passiveEffects || gem.effects || {}).map(([k, v]) => `${k} +${Math.round(v * 100)}%`).join(' · ')) : 'Empty — socket one from the Gems tab.'}</small></div>${gem ? `<button type="button" data-act="remove-gem" data-index="${index}">Remove</button>` : ''}</div>`; }).join('')}</section>` : '';
    el.sheetBody.innerHTML = `
      <div class="c3-detail">
        <article class="c3-card c3-detail-card rarity-${item.rarity}">${isolate(cardHTML(c, true))}</article>
        <div class="c3-detail-copy">
          <div class="c3-detail-head"><span class="c3-kicker">${esc(r.name)} · Level ${item.level} · ${esc(shortType(c.type))}</span><h2>${cardIconHTML(c, item.level)} ${esc(c.name)}</h2><p>${esc(c.desc)}</p></div>
          <div class="c3-metrics">${metrics.map(([a, b]) => `<div><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join('')}</div>
          <section class="c3-pattern"><h3>${esc(ground ? 'Passive effects' : pattern.title)}</h3>${ground ? '' : pattern.html}<p>${esc(pattern.text)}</p></section>
          <section class="c3-compat"><h3>${ground ? 'Upgrade' : 'Support compatibility'}</h3><p>${ground ? `Level ${item.level} · ${Math.round(cardPower(c.id) * 100)}% card power. Fuse matching copies to improve this passive.` : esc(compat)}</p></section>
          ${gems}
        </div>
      </div>
      <div class="c3-detail-actions">
        <button type="button" class="c3-btn primary" data-act="${ground ? (equipped ? 'ground-remove' : 'ground-equip') : (equipped ? 'remove' : 'equip')}" ${owned ? '' : 'disabled'}>${owned ? (equipped ? (ground ? 'Remove from Shadow' : 'Remove from deck') : (ground ? 'Add to Shadow' : 'Add to deck')) : 'Locked'}</button>
        ${!ground && item.copies >= 3 ? `<button type="button" class="c3-btn gold" data-act="merge">Fuse 3 copies</button>` : ''}
        ${ground ? '' : `<button type="button" class="c3-btn ${fav ? 'is-on' : ''}" data-act="favorite">★ ${fav ? 'Favorited' : 'Favorite'}</button>`}
      </div>`;
    el.sheetBody.dataset.cardId = c.id;
  }
  function openDetail(c) {
    if (!c) return;
    state.detail = c.id;
    renderDetail(c);
    el.sheet.hidden = false; el.scrim.hidden = false;
    el.shell.classList.add('has-detail');
    requestAnimationFrame(() => { el.sheet.classList.add('is-open'); el.sheet.scrollTop = 0; });
  }
  function closeDetail() {
    state.detail = null;
    el.sheet.classList.remove('is-open');
    el.shell.classList.remove('has-detail');
    el.sheet.hidden = true; el.scrim.hidden = true;
  }
  function act(action, id, extra = {}) {
    const c = anyCard(id); if (!c) return;
    switch (action) {
      case 'equip': if (equipAt(id)) showToast(`${c.name} added to the deck`); else if (save.deck.length >= DECK_SIZE && isOwned(id)) { state.swapFor = id; el.deck.classList.add('is-swapping'); showToast('Tap a deck slot to swap'); } break;
      case 'remove': if (unequip(id)) showToast(`${c.name} removed from the deck`); break;
      case 'ground-equip': if (equipGround(id)) showToast(`${c.name} now rides with Shadow`); break;
      case 'ground-remove': if (unequipGround(id)) showToast(`${c.name} removed from Shadow`); break;
      case 'favorite': toggleFavorite(id); break;
      case 'merge': mergeCard(id); break;
      case 'remove-gem': { const item = inv(id), gemId = item.gemSlots[extra.index]; if (!gemId) return; save.ascension.gems[gemId] = (save.ascension.gems[gemId] || 0) + 1; item.gemSlots[extra.index] = null; saveProgress('gem-remove'); showToast('Gem returned to inventory'); break; }
      default: return;
    }
    render();
  }

  // ---- input: taps, holds, drags ---------------------------------------------
  // One capture-phase controller. Pointer events decide; a click within 500 ms
  // of a handled pointerup is the same gesture and is ignored (iPad Chromium
  // delivers both), and clicks during or right after a scroll are dropped.
  let lastPointerAction = 0, suppressClicksUntil = 0, gesture = null;
  const targetOf = event => event.target instanceof Element ? event.target : null;

  function activate(event) {
    const t = targetOf(event); if (!t) return;
    const hit = sel => t.closest(sel);
    const chip = hit('.c3-chip'); if (chip) { ui().cardFilter = chip.dataset.filter; saveProgress(); render(); el.body.scrollTop = 0; return true; }
    if (hit('#c3Back')) { closeDetail(); openScreen(screens.menu); return true; }
    if (hit('#c3Save')) { if (save.deck.length !== DECK_SIZE) showToast('Choose exactly six cards'); else { saveProgress(); showToast('Deck saved'); } return true; }
    if (hit('#c3MergeAll')) { requestMergeAllDuplicates(); return true; }
    if (hit('.c3-sheet-close') || hit('.c3-scrim')) { closeDetail(); return true; }
    const sheetAct = hit('.c3-sheet [data-act]'); if (sheetAct) { act(sheetAct.dataset.act, el.sheetBody.dataset.cardId, { index: Number(sheetAct.dataset.index) }); return true; }
    if (hit('#c3Hero') && !hit('.c3-ground-slot')) { openScreen(screens.heroes); renderHeroes(); return true; }
    const groundSlot = hit('.c3-ground-slot'); if (groundSlot) { const c = groundCardById(groundSlot.dataset.cardId); if (c) openDetail(c); else { ui().cardFilter = 'ground'; render(); showToast('Choose a passive from the collection'); } return true; }
    const slot = hit('.c3-slot'); if (slot) {
      const index = Number(slot.dataset.slot);
      if (state.swapFor) { const id = state.swapFor; state.swapFor = null; const c = card(id); if (equipAt(id, index)) showToast(`${c.name} swapped into slot ${index + 1}`); render(); return true; }
      const c = card(slot.dataset.cardId); if (c) openDetail(c); else showToast('Choose a card from the collection');
      return true;
    }
    const quick = hit('.c3-card [data-act]'); if (quick) { const article = quick.closest('.c3-card'); const action = article.dataset.ground ? (quick.dataset.act === 'equip' ? 'ground-equip' : quick.dataset.act === 'remove' ? 'ground-remove' : quick.dataset.act) : quick.dataset.act; act(action, article.dataset.cardId); return true; }
    const article = hit('.c3-card'); if (article && !article.classList.contains('c3-detail-card')) {
      const c = anyCard(article.dataset.cardId); if (!c) return true;
      if (article.classList.contains('is-locked')) { const at = unlockChapterForCard(c.id); showToast(at ? `Defeat Chapter ${at.number} to unlock ${c.name}` : `${c.name} is still locked`); return true; }
      openDetail(c); return true;
    }
    return false;
  }

  function startDrag(event, source) {
    const c = anyCard(source.dataset.cardId); if (!c) return;
    const fromSlot = source.classList.contains('c3-slot');
    const ghost = document.createElement('div');
    ghost.className = `c3-ghost rarity-${inv(c.id).rarity}`;
    ghost.innerHTML = `<b>${cardIconHTML(c, inv(c.id).level)}</b><small>${esc(c.name)}</small>`;
    root.append(ghost);
    state.drag = { id: c.id, ground: c.type === 'trap', fromSlot, ghost, over: null };
    el.shell.classList.add('is-dragging');
    moveDrag(event);
  }
  function moveDrag(event) {
    const d = state.drag; if (!d) return;
    d.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    d.ghost.hidden = false;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const target = under?.closest?.(d.ground ? '.c3-ground-slot' : '.c3-slot') || null;
    if (target !== d.over) { d.over?.classList.remove('is-drop'); d.over = target; d.over?.classList.add('is-drop'); }
    const overCollection = !!under?.closest?.('.c3-collection');
    el.collection.classList.toggle('is-drop-out', d.fromSlot && overCollection);
  }
  function endDrag(event, cancelled = false) {
    const d = state.drag; if (!d) return;
    state.drag = null;
    d.ghost.remove(); d.over?.classList.remove('is-drop');
    el.shell.classList.remove('is-dragging'); el.collection.classList.remove('is-drop-out');
    if (cancelled) return;
    const c = anyCard(d.id);
    if (d.over) {
      if (d.ground) { const index = Number(d.over.dataset.groundSlot); if (equipGround(d.id, index)) showToast(`${c.name} set in passive slot ${index + 1}`); }
      else { const index = Number(d.over.dataset.slot); if (equipAt(d.id, index)) showToast(`${c.name} set in slot ${index + 1}`); }
      render(); return;
    }
    const under = document.elementFromPoint(event.clientX, event.clientY);
    if (d.fromSlot && under?.closest?.('.c3-collection')) { if (unequip(d.id)) { showToast(`${c.name} removed from the deck`); render(); } }
  }

  root.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const t = targetOf(event); if (!t) return;
    const draggable = t.closest('.c3-card:not(.is-locked):not(.c3-detail-card), .c3-slot.is-filled');
    const interactive = t.closest('button, select, input, label, a, [role="button"], .c3-slot, .c3-card, .c3-scrim');
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, draggable, holdTimer: null, handled: false };
    if (draggable && !t.closest('[data-act]')) {
      gesture.holdTimer = setTimeout(() => { if (gesture && !gesture.moved && !state.drag) { gesture.handled = true; startDrag(event, draggable); } }, event.pointerType === 'mouse' ? 1e9 : HOLD_MS);
    }
    if (!interactive) gesture = null;
  }, { capture: true, passive: true });
  root.addEventListener('pointermove', event => {
    if (state.drag) { moveDrag(event); return; }
    if (!gesture || gesture.id !== event.pointerId) return;
    const dist = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
    if (dist > TAP_SLOP_PX) { gesture.moved = true; clearTimeout(gesture.holdTimer); }
    if (event.pointerType === 'mouse' && gesture.draggable && dist > DRAG_START_PX && !state.drag) { gesture.handled = true; startDrag(event, gesture.draggable); }
  }, { capture: true, passive: true });
  root.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state.drag) { endDrag(event); suppressClicksUntil = performance.now() + 700; gesture = null; return; }
    const g = gesture; gesture = null;
    if (!g || g.id !== event.pointerId) return;
    clearTimeout(g.holdTimer);
    if (g.moved || g.handled) { suppressClicksUntil = performance.now() + 700; return; }
    lastPointerAction = performance.now();
    if (activate(event)) { event.preventDefault(); event.stopPropagation(); }
  }, { capture: true, passive: false });
  root.addEventListener('pointercancel', event => { if (state.drag) endDrag(event, true); if (gesture) clearTimeout(gesture.holdTimer); gesture = null; suppressClicksUntil = performance.now() + 700; }, { capture: true, passive: true });
  root.addEventListener('lostpointercapture', event => { if (state.drag) endDrag(event, true); }, { capture: true, passive: true });
  // Once a long press has turned into a drag the finger's moves must not scroll
  // the grid; the browser would otherwise cancel the pointer stream.
  root.addEventListener('touchmove', event => { if (state.drag) event.preventDefault(); }, { passive: false });
  el.body.addEventListener('scroll', () => { if (gesture) { gesture.moved = true; clearTimeout(gesture.holdTimer); } suppressClicksUntil = performance.now() + 250; }, { passive: true });
  root.addEventListener('click', event => {
    if (performance.now() - lastPointerAction < 500 || performance.now() < suppressClicksUntil) { const t = targetOf(event); if (t?.closest('.c3-card, .c3-slot, .c3-chip, [data-act], .c3-scrim')) { event.preventDefault(); event.stopPropagation(); } return; }
    if (activate(event)) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.detail) { closeDetail(); event.preventDefault(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && targetOf(event)?.matches('.c3-card, .c3-slot, .c3-ground-slot')) { if (activate(event)) event.preventDefault(); }
  });
  el.sort.addEventListener('change', () => { ui().cardSort = el.sort.value; saveProgress(); render(); });
  el.mergeOnly.addEventListener('change', () => { state.mergeOnly = el.mergeOnly.checked; render(); });
  el.scrim.addEventListener('click', closeDetail);
  // Swipe the sheet down to dismiss on touch.
  let sheetDrag = null;
  el.sheet.addEventListener('pointerdown', event => { if (el.shell.dataset.mode !== 'touch') return; if (!targetOf(event)?.closest('.c3-sheet-handle') && el.sheet.scrollTop > 0) return; sheetDrag = { y: event.clientY, id: event.pointerId }; }, { passive: true });
  el.sheet.addEventListener('pointermove', event => { if (!sheetDrag || sheetDrag.id !== event.pointerId) return; const dy = Math.max(0, event.clientY - sheetDrag.y); el.sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
  const endSheetDrag = event => { if (!sheetDrag || sheetDrag.id !== event.pointerId) return; const dy = event.clientY - sheetDrag.y; sheetDrag = null; el.sheet.style.transform = ''; if (dy > 90) closeDetail(); };
  el.sheet.addEventListener('pointerup', endSheetDrag, { passive: true });
  el.sheet.addEventListener('pointercancel', endSheetDrag, { passive: true });
  desktopQuery.addEventListener?.('change', () => { if (!root.classList.contains('hidden')) render(); });

  return { render, openDetail, closeDetail };
}
