export function draftWeightProfile(state, limits = { attack: 5, total: 8 }) {
  if (typeof limits === 'number') limits = { attack: limits, total: limits + 3 };
  const attack = state.towers.filter(t => !t.supportOnly).length, total = state.towers.length + (state.traps?.length || 0), progress = (state.draftsCompleted || 0) / Math.max(1, state.chapterWaves || 1);
  if (attack >= limits.attack || total >= limits.total) return { tower: 0, other: 1 };
  if (progress < .3) return { tower: .7, other: .3 };
  if (progress < .7) return { tower: .5, other: .5 };
  return { tower: .1, other: .9 };
}
export function weightedDraftPool(hand, state, tactical, limits = { attack: 5, total: 8 }) {
  const profile = draftWeightProfile(state, limits), towers = hand.filter(card => card.type === 'tower'), other = [...hand.filter(card => card.type !== 'tower'), ...tactical];
  if (!profile.tower) return other;
  return [...Array(Math.max(1, Math.round(profile.tower * 10))).fill(towers).flat(), ...Array(Math.max(1, Math.round(profile.other * 10))).fill(other).flat()];
}
