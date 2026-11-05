// V37.1 — Boss powers for Chapters 11–20.
//
// Every late boss had a power in src/data/campaign.js that existed only as
// text; in play they all fell through to "summon three skeletons". Each boss
// here gets one readable mechanic that matches its description.
//
// The module never touches game state directly. game.js passes a small `ctx`
// (see bossContext() in game.js) with the battle state and the handful of
// helpers a power needs, so the rules stay testable and in one place.
//
// Hooks a power may define:
//   init(boss, ctx)              once, when the boss spawns
//   update(boss, dt, ctx)        every simulation step while it is alive
//   onEnemyDeath(boss, dead, ctx) whenever another enemy dies while it lives
//   customSummons: true          replaces the generic skeleton summons
//
// Shared per-object fields read by game.js:
//   enemy.guard / enemy.guardT   damage-taken multiplier while guardT > 0
//   tower.stunT                  tower cannot fire while stunT > 0
//   tower.rotT                   tower reloads at half speed while rotT > 0
//   tower.cracks                 each crack is -10% tower damage (max 2)
//   G.bossDarkness               0..1, shrinks tower range by up to 20%
//   G.bossMarkers                telegraphs drawn by drawBossOverlay()

const MINIONS = {
  skeleton: { base: 30, speed: .55, reward: 7, name: 'Bone Soldier' },
  armor: { base: 70, speed: .34, reward: 16, name: 'Armoured Dead', armor: .45 },
  revenant: { base: 82, speed: .38, reward: 19, name: 'Plague Revenant', armor: .28 },
  ghoul: { base: 44, speed: .46, reward: 12, name: 'Ravenous Ghoul' },
  gazer: { base: 64, speed: .72, reward: 21, name: 'Void Gazer', air: true, holyOnly: true },
  dreadeye: { base: 104, speed: .56, reward: 29, name: 'Dread Eye', air: true },
  gravelord: { base: 145, speed: .27, reward: 27, name: 'Gravelord', armor: .46 },
  vampire: { base: 46, speed: .62, reward: 14, name: 'Vampire Spawn' }
};
export function minionDef(type) { return MINIONS[type] || MINIONS.skeleton; }

const liveMinions = (boss, ctx) => ctx.G.enemies.filter(e => !e.dead && e.summonedBy === boss).length;
const towersAlive = ctx => ctx.G.towers.filter(t => !t.destroyed && !t.supportOnly);
function pickRandom(list, n) {
  const pool = [...list], out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function nearestTowers(boss, ctx, n) {
  return towersAlive(ctx)
    .sort((a, b) => Math.hypot(a.x + .5 - boss.x, a.y + .5 - boss.y) - Math.hypot(b.x + .5 - boss.x, b.y + .5 - boss.y))
    .slice(0, n);
}
// A delayed strike on a tower: a marker counts down, then `apply` runs.
function telegraphTowerStrike(ctx, tower, delay, kind, apply) {
  ctx.G.bossMarkers = ctx.G.bossMarkers || [];
  ctx.G.bossMarkers.push({ kind, x: tower.x + .5, y: tower.y + .5, t: delay, total: delay, tower, apply });
}
export function updateBossMarkers(G, dt) {
  if (!G?.bossMarkers?.length) return;
  for (const m of G.bossMarkers) {
    m.t -= dt;
    if (m.t <= 0 && !m.done) { m.done = true; if (!m.tower?.destroyed && G.towers.includes(m.tower)) m.apply?.(m.tower); }
  }
  G.bossMarkers = G.bossMarkers.filter(m => !m.done || m.t > -.45); // keep a short impact flash
}
// Tower timers are decayed here so every renderer and the tower loop agree.
export function updateTowerAfflictions(G, dt) {
  for (const t of G?.towers || []) {
    if (t.stunT > 0) t.stunT = Math.max(0, t.stunT - dt);
    if (t.rotT > 0) t.rotT = Math.max(0, t.rotT - dt);
  }
}

export const BOSS_POWERS = {
  // Ch 11 — "Summons armored dead and bends the road beneath the earth."
  underking: {
    customSummons: true,
    init(b) { b.powerT = 5; b.burrowAt = [.6, .3]; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT <= 0) {
        b.powerT = 6;
        const room = 6 - liveMinions(b, ctx);
        for (let i = 0; i < Math.min(2, room); i++) ctx.spawnMinion(b, 'armor', { hpScale: .45, atBoss: true });
        if (room > 0) ctx.say(b, 'THE ARMOURED DEAD RISE', '#c7cbd6');
      }
      const ratio = b.hp / b.max;
      if (b.burrowAt.length && ratio <= b.burrowAt[0] && !(b.burrowT > 0)) {
        b.burrowAt.shift();
        b.burrowT = 1.6; b.guard = 0; b.guardT = 1.6;
        ctx.say(b, 'THE UNDERKING SINKS BENEATH THE ROAD', '#b48cff'); ctx.shake(.22);
      }
      if (b.burrowT > 0) {
        b.burrowT -= dt;
        if (b.burrowT <= 0) { ctx.advanceAlongRoute(b, 2); ctx.say(b, 'IT SURFACES FURTHER ALONG THE ROAD', '#b48cff'); ctx.burst(b.x, b.y, '#7d5fb0', 40); }
        return 'hold'; // does not walk while underground
      }
    }
  },

  // Ch 12 — "Splits into lesser saints as its light fails."
  hollowsaint: {
    init(b) { b.splitAt = [.66, .33]; },
    update(b, dt, ctx) {
      if (b.splitAt.length && b.hp / b.max <= b.splitAt[0]) {
        b.splitAt.shift();
        for (let i = 0; i < 2; i++) ctx.spawnMinion(b, b.type, { hpOfBoss: .14, atBoss: true, elite: true, name: 'Lesser Saint', speed: .4, offset: i ? .35 : -.35 });
        ctx.say(b, 'THE SAINT SPLITS AS ITS LIGHT FAILS', '#fff2c4'); ctx.burst(b.x, b.y, '#fff2c4', 50); ctx.shake(.2);
      }
    }
  },

  // Ch 13 — "Raises Plague Revenants from every corpse on the road."
  rotmarshal: {
    onEnemyDeath(b, dead, ctx) {
      if (dead === b || dead.raisedByMarshal || liveMinions(b, ctx) >= 6) return;
      if (Math.random() > .5) return; // every other corpse on average, or the road never clears
      const m = ctx.spawnMinion(b, 'revenant', { hpScale: .4, from: dead });
      if (m) { m.raisedByMarshal = true; ctx.say(dead, 'RISES AGAIN', '#9aa86b'); }
    }
  },

  // Ch 14 — "Its hymn rots defenses from the inside."
  plaguechoir: {
    init(b) { b.powerT = 4; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT > 0) return;
      b.powerT = 7;
      const hit = nearestTowers(b, ctx, 2);
      for (const t of hit) { t.rotT = 4.5; ctx.say({ x: t.x + .5, y: t.y + .2 }, 'ROTTING', '#a6c46b'); }
      if (hit.length) ctx.toast('The Plague Choir sings — nearby towers rot and reload at half speed');
    }
  },

  // Ch 15 — "Opens eyes across the battlefield that strike from above."
  voidprelate: {
    init(b) { b.powerT = 5; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT > 0) return;
      b.powerT = 7;
      const targets = pickRandom(towersAlive(ctx), 2);
      for (const t of targets) telegraphTowerStrike(ctx, t, 1.6, 'eye', tower => { tower.stunT = Math.max(tower.stunT || 0, 2.5); ctx.say({ x: tower.x + .5, y: tower.y + .2 }, 'STRUCK FROM ABOVE', '#c58cff'); ctx.burst(tower.x + .5, tower.y + .5, '#a05cff', 26); });
      if (targets.length) ctx.toast('Eyes open above your towers — they will be stunned');
    }
  },

  // Ch 16 — "Armours every enemy that passes beneath it."
  grandossuary: {
    update(b, dt, ctx) {
      for (const e of ctx.G.enemies) {
        if (e === b || e.dead || e.ossuaryArmour) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < 1.6) {
          e.ossuaryArmour = true; e.armor = Math.max(e.armor || 0, .35);
          ctx.say(e, 'ARMOURED', '#d6ccae');
        }
      }
    }
  },

  // Ch 17 — "Reads the moon and calls elites in threes."
  duskempress: {
    customSummons: true,
    init(b) { b.powerT = 6; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT > 0) return;
      b.powerT = 10;
      if (liveMinions(b, ctx) > 3) return;
      for (const type of ['ghoul', 'gazer', 'revenant']) ctx.spawnMinion(b, type, { hpScale: .55, elite: true });
      ctx.say(b, 'THE EMPRESS CALLS HER ELITES', '#e0637a'); ctx.shake(.18);
    }
  },

  // Ch 18 — "Falling moonlight damages towers directly."
  eclipseherald: {
    init(b) { b.powerT = 5; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT > 0) return;
      b.powerT = 8;
      const targets = pickRandom(towersAlive(ctx), 3);
      for (const t of targets) telegraphTowerStrike(ctx, t, 1.4, 'moon', tower => {
        tower.stunT = Math.max(tower.stunT || 0, 2);
        if ((tower.cracks || 0) < 2) { tower.cracks = (tower.cracks || 0) + 1; ctx.say({ x: tower.x + .5, y: tower.y + .2 }, 'CRACKED −10% DMG', '#8fa6e0'); }
        ctx.burst(tower.x + .5, tower.y + .5, '#cfe0ff', 30); ctx.shake(.16);
      });
      if (targets.length) ctx.toast('Moonlight is falling on your towers');
    }
  },

  // Ch 19 — "The final guard. Nothing has ever passed it."
  lastsentinel: {
    init(b) { b.powerT = 6; },
    update(b, dt, ctx) {
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT > 0) return;
      b.powerT = 10;
      b.guard = .25; b.guardT = 3.5;
      // While the aegis holds, its guards stand fast behind it as well.
      for (const e of ctx.G.enemies) if (e !== b && !e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 2.2) { e.guard = .5; e.guardT = 3.5; }
      ctx.say(b, 'AEGIS — DAMAGE −75%', '#ffd27a'); ctx.shake(.14);
    }
  },

  // Ch 20 — "Changes phases, summons elites, and darkens the battlefield."
  eclipselord: {
    customSummons: true,
    init(b) { b.phase = 1; b.powerT = 5; },
    update(b, dt, ctx) {
      const ratio = b.hp / b.max;
      const next = ratio <= .33 ? 3 : ratio <= .66 ? 2 : 1;
      if (next > b.phase) {
        b.phase = next;
        ctx.burst(b.x, b.y, next === 3 ? '#e05b72' : '#a05cff', 80); ctx.shake(.4); ctx.flash(.4);
        if (next === 2) { ctx.say(b, 'SECOND PHASE — THE COURT IS SUMMONED', '#e05b72'); b.powerT = 0; }
        if (next === 3) { ctx.say(b, 'FINAL NIGHT — TOWER RANGE −20%', '#ff8aa0'); b.speed *= 1.2; ctx.G.bossDarkness = 1; ctx.toast('The Lord of Final Night darkens the battlefield'); }
      }
      b.powerT -= dt * (ctx.tempo ?? 1);
      if (b.powerT <= 0) {
        b.powerT = b.phase >= 2 ? 9 : 6;
        const room = 6 - liveMinions(b, ctx);
        if (room > 0) {
          if (b.phase === 1) for (let i = 0; i < Math.min(3, room); i++) ctx.spawnMinion(b, 'skeleton', { hpScale: .5 });
          else for (const type of ['dreadeye', 'gravelord', 'vampire'].slice(0, room)) ctx.spawnMinion(b, type, { hpScale: .5, elite: true });
        }
      }
    }
  }
};

export function bossPower(boss) { return boss?.boss ? BOSS_POWERS[boss.type] || null : null; }
