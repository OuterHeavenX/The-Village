// V37.7 — Chapter boons. Every card is in hand by Chapter 8, so the second
// half of the campaign used to reward only a relic. Each road from Chapter 9
// on now also grants a permanent boon: a small, always-on bonus that carries
// into every hunt (campaign and endless) once that road is cleared.
//
// Effects (summed over every cleared road):
//   reserve  — extra Essence in the reserve at the start of a hunt
//   gateHp   — extra gate health
//   damage   — tower damage multiplier (+0.05 = +5%)
//   points   — Battle Points to spend on tower upgrades from the first wave
//   cardXp   — extra card XP from battles (+0.25 = +25%)

export const CHAPTER_BOONS = Object.freeze({
  harbor:          { icon: '⚓', name: 'Harbor Tithe',        desc: '+12 reserve Essence every hunt.',        effect: { reserve: 12 } },
  monastery:       { icon: '🕯️', name: 'Ashen Vigil',         desc: '+2 gate health.',                         effect: { gateHp: 2 } },
  underkingdom:    { icon: '👑', name: "Underking's Signet",  desc: 'Start every hunt with 1 Battle Point.',   effect: { points: 1 } },
  sunlessvault:    { icon: '⚒️', name: 'Vault Steel',         desc: '+5% tower damage.',                       effect: { damage: .05 } },
  catacombs:       { icon: '📜', name: 'Catacomb Rites',      desc: '+25% card XP from battles.',              effect: { cardXp: .25 } },
  hollowcathedral: { icon: '🪙', name: 'Hollow Offering',     desc: '+12 reserve Essence every hunt.',         effect: { reserve: 12 } },
  weepingspire:    { icon: '🛡️', name: 'Spire Ward',          desc: '+3 gate health.',                         effect: { gateHp: 3 } },
  bonecathedral:   { icon: '🦴', name: 'Bone-Forged Edge',    desc: '+5% tower damage.',                       effect: { damage: .05 } },
  observatory:     { icon: '🔭', name: 'Star Chart',          desc: 'Start every hunt with 1 more Battle Point.', effect: { points: 1 } },
  shatteredmoon:   { icon: '🌙', name: 'Moonshard',           desc: '+6% tower damage.',                       effect: { damage: .06 } },
  abyssgate:       { icon: '🌀', name: 'Abyssal Lore',        desc: '+25% card XP from battles.',              effect: { cardXp: .25 } },
  throne:          { icon: '☀️', name: 'Eclipse Crown',       desc: '+5% tower damage and +3 gate health.',    effect: { damage: .05, gateHp: 3 } }
});

export function boonForChapter(chapterId) { return CHAPTER_BOONS[chapterId] || null; }

export function earnedBoons(completed = []) {
  return completed.map(id => CHAPTER_BOONS[id] && { id, ...CHAPTER_BOONS[id] }).filter(Boolean);
}

export function boonTotals(completed = []) {
  const total = { reserve: 0, gateHp: 0, damage: 0, points: 0, cardXp: 0 };
  for (const boon of earnedBoons(completed)) for (const [key, value] of Object.entries(boon.effect)) total[key] = (total[key] || 0) + value;
  return total;
}
