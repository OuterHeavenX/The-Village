// V37.2 chapter moods for the 3D battlefield. Every chapter used to render the
// same lit green meadow; each map now sets its own light, sky, fog and ground.
// Colours are linear-space values fed straight to the scene (the grade pass
// does tone mapping and the sRGB encode), so they read darker than CSS hex.
//
//   grass   : [low, high, dry] ground tones blended by noise in the terrain shader
//   blade   : instanced grass blade tint
//   sky     : [horizon, zenith]
//   fog     : [colour, near, far]
//   hemi    : [sky, ground, intensity]
//   moon    : [colour, intensity]   (the shadow-casting key light)
//   ambient : [colour, intensity]
//   stars   : star-field opacity (0 = overcast or underground)
//   exposure: grade-pass exposure

const BASE = {
  grass: [0x0a1712, 0x1a2c1c, 0x1c2414], blade: 0x26402a,
  sky: [0x161a2e, 0x03040a], fog: [0x0b0d18, 26, 54],
  hemi: [0x2c3a6c, 0x0c100c, .42], moon: [0xb8c8ff, .82], ambient: [0x161a30, .32],
  stars: .75, moonDisc: 0xf4f1e0, exposure: .9
};

export const BATTLE_MOODS = Object.freeze({
  // 1 — cold blue graveyard night, mist on the ground
  cemetery: { grass: [0x08140f, 0x16261a, 0x1b2016], blade: 0x223a2c, sky: [0x141a30, 0x020309], fog: [0x0c1220, 22, 50], hemi: [0x2a3a70, 0x080c0a, .38], moon: [0xaec4ff, .78], exposure: .86 },
  // 2 — deep moonlit green
  forest: { grass: [0x06160a, 0x14321a, 0x1a2a12], blade: 0x1f4a26, sky: [0x0f1f22, 0x02060a], fog: [0x0a1612, 22, 50], hemi: [0x24484a, 0x081006, .4], moon: [0xc4e0ff, .8], exposure: .88 },
  // 3 — a burning village: ember horizon, warm smoke
  village: { grass: [0x14130a, 0x262414, 0x302410], blade: 0x3a3a1e, sky: [0x3a160a, 0x07040a], fog: [0x1c100a, 22, 50], hemi: [0x4a3020, 0x140a04, .42], moon: [0xffb27a, .7], ambient: [0x2a1408, .36], stars: .25, moonDisc: 0xff9a60, exposure: .92 },
  // 4 — frozen cathedral: frost on the ground, bright icy moon
  cathedral: { grass: [0x2a3644, 0x5a6c80, 0x40505e], blade: 0x6a8aa0, sky: [0x24344e, 0x050814], fog: [0x1a2434, 22, 52], hemi: [0x5a76b0, 0x1a2230, .5], moon: [0xd4e4ff, .95], exposure: .88 },
  // 5 — crimson marsh: red mist over olive bog
  marsh: { grass: [0x10120a, 0x22240e, 0x2a1a0e], blade: 0x34361a, sky: [0x3a0c10, 0x08020a], fog: [0x240a0e, 22, 50], hemi: [0x5a2026, 0x0c0806, .4], moon: [0xffa0a0, .7], ambient: [0x220a0c, .34], stars: .3, moonDisc: 0xff6a5a, exposure: .9 },
  // 6 — siege: grey stone dusk
  walls: { grass: [0x101410, 0x20261c, 0x26241a], blade: 0x2c3426, sky: [0x2a2630, 0x07070c], fog: [0x16161c, 22, 50], hemi: [0x404458, 0x0e0e0c, .44], moon: [0xd8d4e8, .8], stars: .35, exposure: .9 },
  // 7 — moon temple: silver-violet, huge moon
  temple: { grass: [0x0e1020, 0x222844, 0x1c1c30], blade: 0x30386a, sky: [0x241a44, 0x05030e], fog: [0x120e24, 24, 54], hemi: [0x4a3c8a, 0x0a0814, .5], moon: [0xe0d8ff, 1.0], stars: 1, moonDisc: 0xf6f0ff, exposure: .9 },
  // 8 — vampire castle: blood sky
  castle: { grass: [0x120a0c, 0x24141a, 0x2a1012], blade: 0x3a1c24, sky: [0x44060e, 0x0a0206], fog: [0x1c0608, 22, 50], hemi: [0x5a1a24, 0x0c0406, .42], moon: [0xff8a8a, .76], ambient: [0x200608, .34], stars: .4, moonDisc: 0xff4a4a, exposure: .9 },
  // 9 — drowned harbour: thick teal sea fog
  harbor: { grass: [0x08161a, 0x143032, 0x1a2622], blade: 0x1e4448, sky: [0x10282e, 0x02080a], fog: [0x0c1e22, 18, 44], hemi: [0x24565c, 0x061010, .44], moon: [0xa8e8ec, .7], stars: .1, moonDisc: 0xc0f0f0, exposure: .92 },
  // 10 — ashen monastery: grey ash, smouldering horizon
  monastery: { grass: [0x16161a, 0x2c2c30, 0x302822], blade: 0x3c3c40, sky: [0x2e1a12, 0x060506], fog: [0x18161a, 22, 50], hemi: [0x4a4248, 0x100c0a, .42], moon: [0xe8c8b0, .72], ambient: [0x1c1410, .34], stars: .15, moonDisc: 0xffb890, exposure: .9 },
  // 11+ — underground and the eclipse road: no sky light, torch-led
  underkingdom: { grass: [0x0c0a10, 0x1c1824, 0x201a1a], blade: 0x2a2234, sky: [0x0a0810, 0x000000], fog: [0x08060c, 22, 50], hemi: [0x2a2040, 0x060406, .34], moon: [0x9a8ac8, .55], ambient: [0x140e1c, .4], stars: 0, moonDisc: 0x000000, exposure: .96 },
  sunlessvault: { grass: [0x0c0c0c, 0x1c1a18, 0x24201a], blade: 0x2a2620, sky: [0x080706, 0x000000], fog: [0x0a0908, 18, 44], hemi: [0x3a3020, 0x060404, .32], moon: [0xc8a878, .5], ambient: [0x18120a, .42], stars: 0, moonDisc: 0x000000, exposure: .96 },
  catacombs: { grass: [0x0e100a, 0x1e2214, 0x22200e], blade: 0x2a3018, sky: [0x0a0c06, 0x000000], fog: [0x0c0e08, 18, 44], hemi: [0x344020, 0x060604, .34], moon: [0xb8d08a, .5], ambient: [0x121608, .4], stars: 0, moonDisc: 0x000000, exposure: .96 },
  hollowcathedral: { grass: [0x14161e, 0x2a2e3c, 0x26262c], blade: 0x383e52, sky: [0x1a1e2e, 0x020306], fog: [0x101420, 22, 50], hemi: [0x40486a, 0x0a0a10, .44], moon: [0xd0d8ff, .85], stars: .5, exposure: .9 },
  weepingspire: { grass: [0x0a1014, 0x18242c, 0x1a2024], blade: 0x223440, sky: [0x142430, 0x02050a], fog: [0x0c161e, 18, 44], hemi: [0x2c4a60, 0x060a0c, .4], moon: [0xa8c8e8, .7], stars: .2, exposure: .92 },
  bonecathedral: { grass: [0x1e1a14, 0x3a3428, 0x342a1c], blade: 0x4a4232, sky: [0x2a2014, 0x060403], fog: [0x1a1610, 22, 50], hemi: [0x5a4c34, 0x100c08, .44], moon: [0xf0e0c0, .82], stars: .4, moonDisc: 0xfff0d0, exposure: .88 },
  observatory: { grass: [0x140a10, 0x2a1622, 0x2a1418], blade: 0x3c2030, sky: [0x3a0e2a, 0x06020a], fog: [0x180a14, 26, 58], hemi: [0x5a2a5a, 0x0a040a, .46], moon: [0xffb0e0, .85], stars: 1, moonDisc: 0xff90c0, exposure: .9 },
  shatteredmoon: { grass: [0x0c0e18, 0x1e2238, 0x1a1a2a], blade: 0x2a3050, sky: [0x1c1e3a, 0x02020a], fog: [0x0e1020, 26, 60], hemi: [0x3a4080, 0x08080e, .48], moon: [0xe8ecff, 1.05], stars: 1, moonDisc: 0xffffff, exposure: .88 },
  abyssgate: { grass: [0x0a0610, 0x1a0e24, 0x1c0c1a], blade: 0x2a1438, sky: [0x24062e, 0x000000], fog: [0x10041a, 22, 50], hemi: [0x40125a, 0x060208, .4], moon: [0xc080ff, .66], ambient: [0x14061c, .4], stars: .2, moonDisc: 0xa040ff, exposure: .94 },
  throne: { grass: [0x100808, 0x221212, 0x2a1408], blade: 0x341a14, sky: [0x3a1a04, 0x000000], fog: [0x160a04, 22, 50], hemi: [0x5a3010, 0x0a0402, .42], moon: [0xffc870, .78], ambient: [0x1e0e04, .38], stars: .3, moonDisc: 0x2a1000, exposure: .92 }
});

export function battleMood(mapId) {
  return { ...BASE, ...(BATTLE_MOODS[mapId] || {}) };
}
