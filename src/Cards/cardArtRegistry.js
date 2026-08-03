const CARD_ART = Object.freeze({
  dagger: new URL('../../assets/cards/tower-art/dagger.webp', import.meta.url).href,
  axe: new URL('../../assets/cards/tower-art/axe.webp', import.meta.url).href,
  crossbow: new URL('../../assets/cards/tower-art/crossbow.webp', import.meta.url).href,
  ballista: new URL('../../assets/cards/tower-art/ballista.webp', import.meta.url).href,
  arcane: new URL('../../assets/cards/tower-art/arcane.webp', import.meta.url).href
});

export const RESERVED_CARD_ART = Object.freeze({
  holyTower: new URL('../../assets/cards/tower-art/holy_tower.webp', import.meta.url).href
});

export function cardArtFor(cardOrId) {
  const id = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id;
  return CARD_ART[id] || null;
}

export function cardArtHTML(card, options = {}) {
  const source = cardArtFor(card);
  if (!source) return '';
  return `<img class="card-art-image" src="${source}" alt="${card.name} tower artwork" loading="${options.eager ? 'eager' : 'lazy'}" decoding="async" draggable="false">`;
}

export const CARD_ART_IDS = Object.freeze(Object.keys(CARD_ART));
