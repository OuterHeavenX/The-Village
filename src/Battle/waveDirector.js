export const WAVE_IDENTITIES = Object.freeze(['scouts','swarm','fast','armored','miniboss','mixed','elite','boss']);
export function waveIdentity(wave, totalWaves) { if (wave >= totalWaves) return 'boss'; if (wave === 5) return 'miniboss'; return WAVE_IDENTITIES[Math.min(6, Math.max(0, wave - 1))]; }
export function waveBreathingPeriod(wave, totalWaves) { return wave >= totalWaves ? 3.2 : wave === 5 ? 2.8 : 2.15; }
export function waveSpawnCount(wave) { return Math.min(14, 5 + Math.floor(wave * .85)); }
