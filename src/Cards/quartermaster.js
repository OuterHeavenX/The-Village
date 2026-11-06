// V37.9.3 — Quartermaster: a daily shop in the Battle Deck screen that sells
// copies of cards you already own for Village Gold. Copies are what levels a
// card, and Gold was piling up unused once chests became the only source of
// copies. Offers are rolled once per local day and stored in the save, so
// changing the deck does not reshuffle them.

export const QUARTERMASTER_COPIES = Object.freeze({ common: 5, good: 4, rare: 3, epic: 3, epicplus: 2, legendary: 2, legendaryplus: 1, mythic: 1 });
export const QUARTERMASTER_PRICE = Object.freeze({ common: 30, good: 45, rare: 70, epic: 110, epicplus: 160, legendary: 260, legendaryplus: 380, mythic: 600 });

export function quartermasterDay(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function msUntilNextDay(date = new Date()) {
  const next = new Date(date); next.setHours(24, 0, 0, 0);
  return Math.max(0, next - date);
}

function pick(list, taken) {
  const pool = list.filter(id => !taken.has(id));
  if (!pool.length) return null;
  const id = pool[Math.floor(Math.random() * pool.length)];
  taken.add(id);
  return id;
}

// deckIds: the six deck cards; ownedIds: every other owned (non-passive) card.
// rarityOf(id) → rarity id. Returns the offer list for the save.
export function rollQuartermaster({ deckIds = [], ownedIds = [], rarityOf }) {
  const taken = new Set(), offers = [];
  const make = (id, free = false) => {
    if (!id) return;
    const rarity = rarityOf(id) || 'common';
    const copies = free ? Math.max(1, Math.ceil((QUARTERMASTER_COPIES[rarity] || 1) / 2)) : (QUARTERMASTER_COPIES[rarity] || 1);
    offers.push({ id, copies, price: free ? 0 : copies * (QUARTERMASTER_PRICE[rarity] || 50), free, bought: false });
  };
  make(pick(deckIds, taken), true);
  make(pick(deckIds, taken));
  make(pick(deckIds, taken));
  make(pick(ownedIds, taken) || pick(deckIds, taken));
  return offers;
}

// Keeps save.quartermaster on today's offers; returns that object.
export function ensureQuartermaster(save, context) {
  const day = quartermasterDay();
  const qm = save.quartermaster;
  if (qm && qm.day === day && Array.isArray(qm.offers) && qm.offers.length) return qm;
  save.quartermaster = { day, offers: rollQuartermaster(context) };
  return save.quartermaster;
}
