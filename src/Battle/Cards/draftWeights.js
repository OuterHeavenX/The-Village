export function draftWeightProfile(state, limits = { attack: 5, total: 8 }) {
  if (typeof limits === 'number') limits = { attack: limits, total: limits + 3 };
  const attack = state.towers.filter(t => !t.supportOnly).length, total = state.towers.length;
  // Progress is how much of the attack composition is actually built, not how
  // many drafts have been spent. Keyed to drafts, an eight-draft chapter cut tower
  // odds to 10% by the sixth draft regardless of what the player held, and a bot
  // reached the chapter boss with three towers of a ten-slot cap.
  // V37.8: towers stay in the draft at the cap, because picking one merges it
  // onto a matching tower (Raid Rush rules); only fully merged ones drop out.
  const progress = attack / Math.max(1, limits.attack);
  if (attack >= limits.attack || total >= limits.total) return { tower: .55, other: .45 };
  if (progress < .3) return { tower: .7, other: .3 };
  if (progress < .7) return { tower: .6, other: .4 };
  return { tower: .55, other: .45 };
}
const MERGE_MAX = 5;
export function weightedDraftPool(hand, state, tactical, limits = { attack: 5, total: 8 }) {
  const full = state.towers.length >= limits.towers; // traps have their own cap; they do not fill the structure board
  const canMerge = id => state.towers.some(t => t.id === id && !t.supportOnly && !t.destroyed && (t.mergeLevel || 1) < MERGE_MAX);
  const profile = draftWeightProfile(state, limits), towers = hand.filter(card => card.type === 'tower' && (!full || canMerge(card.id))), other = [...hand.filter(card => card.type !== 'tower'), ...tactical];
  if (!towers.length) return other;
  if (!profile.tower) return other;
  return [...Array(Math.max(1, Math.round(profile.tower * 10))).fill(towers).flat(), ...Array(Math.max(1, Math.round(profile.other * 10))).fill(other).flat()];
}
