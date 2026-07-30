// V35 ASCENSION content registry. Core systems consume these plain records;
// future content can be added here without changing combat or save code.

export const ASCENSION_VERSION = '35.0.0';
export const ASCENSION_SAVE_VERSION = 15;

export const EQUIPMENT_SLOTS = Object.freeze([
  'weapon', 'helmet', 'armor', 'gloves', 'boots', 'accessory1', 'accessory2'
]);

export const COMPANION_REGISTRY = Object.freeze([
  {id:'bat',name:'Night Bat',icon:'🦇',role:'Fast strikes',color:'#b98cff',rate:2.2,damage:8,range:3.2,passive:'Exposes targets, granting towers +3% critical chance.',active:'Night Swarm',cooldown:10,ai:'fastest',aiDescription:'Prioritizes the fastest enemy.',scaling:{damagePerLevel:.10,criticalChancePerLevel:.004}},
  {id:'sword',name:'Giant Sword',icon:'⚔️',role:'Heavy slashes',color:'#dcecff',rate:3.0,damage:16,range:2.2,passive:'Heavy strikes ignore part of enemy armor.',active:'Moon Cleave',cooldown:12,ai:'armored',aiDescription:'Prioritizes armored and elite enemies.',scaling:{damagePerLevel:.14,armorPenetrationPerLevel:.008}},
  {id:'demon',name:'Demon',icon:'👹',role:'Burning blasts',color:'#ff785f',rate:3.8,damage:22,range:3.5,passive:'Attacks inflict a stacking burn.',active:'Infernal Burst',cooldown:14,ai:'clustered',aiDescription:'Prioritizes clustered enemies.',scaling:{damagePerLevel:.13,burnPerLevel:.012}},
  {id:'ghost',name:'Ghost',icon:'👻',role:'Slows enemies',color:'#cbbcff',rate:3.2,damage:10,range:3.8,passive:'Attacks slow enemies.',active:'Haunting Stillness',cooldown:16,ai:'progress',aiDescription:'Prioritizes enemies nearest the Cathedral.',scaling:{damagePerLevel:.08,slowPerLevel:.008}},
  {id:'faerie',name:'Faerie',icon:'🧚',role:'Radiant support',color:'#fff2a6',rate:4.0,damage:7,range:3.0,passive:'Increases Essence rewards and nearby tower range.',active:'Radiant Guidance',cooldown:18,ai:'support',aiDescription:'Supports the densest tower group.',scaling:{damagePerLevel:.06,rewardPerLevel:.005}}
]);

export const RELIC_REGISTRY = Object.freeze([
  {id:'fang',name:'Nightfang Sigil',icon:'🦇',desc:'Hero attacks 18% faster.',effect:{heroAttackSpeed:.18}},
  {id:'candle',name:'Eclipse Candle',icon:'🕯️',desc:'Holy towers gain +20% range and damage.',effect:{holyTowerRange:.20,holyTowerDamage:.20}},
  {id:'chalice',name:'Crimson Reliquary',icon:'🏆',desc:'Restore 2 gate HP after every wave.',effect:{waveGateHealing:2}},
  {id:'ring',name:'Ring of the Eclipse',icon:'💍',desc:'Every fifth kill explodes around the victim.',effect:{killExplosionEvery:5}},
  {id:'thorn',name:'Thornheart Crown',icon:'👑',desc:'Begin each hunt with 1 bonus Upgrade Point.',effect:{startingUpgradePoints:1}},
  {id:'banner',name:'Banner of Blackstone',icon:'🚩',desc:'The gate begins with +5 health.',effect:{gateHp:5}},
  {id:'moon',name:'Moon Oracle Lens',icon:'🔭',desc:'Hero critical chance +12%.',effect:{heroCriticalChance:.12}},
  {id:'bloodseal',name:'Royal Blood Seal',icon:'🩸',desc:'All damage +12%, but enemies gain 8% health.',effect:{globalDamage:.12,enemyHealth:.08}},
  {id:'tidebell',name:'Bell of the Drowned',icon:'🔔',desc:'Every tenth kill briefly slows all enemies.',effect:{globalSlowEvery:10}},
  {id:'ashcenser',name:'Ashen Censer',icon:'🏺',desc:'Burn effects last 35% longer.',effect:{burnDuration:.35}},
  {id:'underkey',name:'Key of the Underking',icon:'🗝️',desc:'Elite enemies award 30% more Essence.',effect:{eliteEssence:.30}},
  {id:'graveseal',name:'Grave Seal',icon:'⚰️',desc:'Restore 3 gate HP after every wave.',effect:{waveGateHealing:3}},
  {id:'voideye',name:'The Void Eye',icon:'👁️',desc:'Flying enemies take 30% more damage.',effect:{flyingDamage:.30}},
  {id:'rotcrown',name:'Crown of Rot',icon:'🥀',desc:'Blood Essence gained is increased by 20%.',effect:{essenceGain:.20}},
  {id:'ossuary',name:'Ossuary Key',icon:'🔑',desc:'Gate begins each hunt with 8 extra HP.',effect:{gateHp:8}},
  {id:'pallbearer',name:"Pallbearer's Oath",icon:'🕯️',desc:'Armoured enemies lose half their armour.',effect:{enemyArmorMultiplier:.50}},
  {id:'sunless',name:'Sunless Lantern',icon:'🏮',desc:'All towers gain 10% damage.',effect:{towerDamage:.10}},
  {id:'moonshard',name:'Moon Shard',icon:'🌙',desc:'All towers gain 10% range.',effect:{towerRange:.10}},
  {id:'abyssseal',name:'Seal of the Abyss',icon:'🕳️',desc:'Flying enemies take 30% more damage and towers gain 8% damage.',effect:{flyingDamage:.30,towerDamage:.08}},
  {id:'eclipsecrown',name:'Crown of Final Night',icon:'♛',desc:'Hero and towers deal +15% damage on boss waves.',effect:{bossDamage:.15}}
]);

// Companion mechanics are declarative. The battle engine understands behavior
// types, while this registry decides which targeting, active, projectile and
// presentation rules each companion uses.
export const COMPANION_BEHAVIOR_REGISTRY = Object.freeze({
  bat:{targeting:'fastest',passiveEffects:{towerCriticalChance:.03},activeEffect:{type:'multiHit',targets:3,multiplier:.65},projectile:{speed:8.5},visual:{orbitSpeed:2.1,orbitRadius:38,iconSize:22}},
  sword:{targeting:'armored',passiveEffects:{armorPenetration:.08},activeEffect:{type:'heavyHit',multiplier:1.5,holy:true},projectile:{speed:7},visual:{orbitSpeed:.8,orbitRadius:48,iconSize:30}},
  demon:{targeting:'clustered',passiveEffects:{burn:2.8},activeEffect:{type:'areaHit',radius:1.4,burn:5},projectile:{speed:8.5,burn:2.8},visual:{orbitSpeed:.8,orbitRadius:38,iconSize:22}},
  ghost:{targeting:'progress',passiveEffects:{slow:.72},activeEffect:{type:'control',freeze:1.25,slow:.25},projectile:{speed:8.5,slow:.72},visual:{orbitSpeed:.8,orbitRadius:38,iconSize:22}},
  faerie:{targeting:'support',passiveEffects:{essenceGain:.10,towerRange:.05},activeEffect:{type:'support',duration:6,essenceBase:4,essenceLevelsPerBonus:4},projectile:{speed:8.5,holy:true},visual:{orbitSpeed:.8,orbitRadius:38,iconSize:22}}
});

const tierDefaults = {
  1: { minChapter: 1, minBossTier: 1, rarity: 'Common', dropWeight: 100, sellValue: 30, scale: 1 },
  2: { minChapter: 11, minBossTier: 2, rarity: 'Epic', dropWeight: 42, sellValue: 140, scale: 2.1 },
  3: { minChapter: 18, minBossTier: 3, rarity: 'Legendary', dropWeight: 12, sellValue: 480, scale: 3.8 }
};

const equipment = (id, name, category, slot, tier, primaryStat, secondaryStats, faith, bravery, flavor, overrides = {}) => {
  const base = tierDefaults[tier];
  return Object.freeze({
    id, name, category, slot, tier,
    minChapter: base.minChapter,
    minBossTier: base.minBossTier,
    rarity: base.rarity,
    primaryStat,
    secondaryStats,
    faith,
    bravery,
    sellValue: base.sellValue,
    flavor,
    dropWeight: base.dropWeight,
    icon: overrides.icon || ({ weapon: '⚔️', helmet: '⛑️', armor: '🛡️', gloves: '🧤', boots: '🥾' }[slot] || '💍'),
    ...overrides
  });
};

export const EQUIPMENT_REGISTRY = Object.freeze([
  equipment('bronze_sword','Bronze Longsword','Sword','weapon',1,{attack:8},{criticalChance:.01},0,2,'A dependable blade from the first royal forge.'),
  equipment('iron_axe','Iron Headsman Axe','Axe','weapon',1,{attack:12},{attackSpeed:-.03,armorPenetration:.03},0,3,'Heavy iron that rewards a fearless swing.',{icon:'🪓'}),
  equipment('mythril_dagger','Mythril Dagger','Dagger','weapon',1,{attack:7},{attackSpeed:.05,criticalChance:.03},1,2,'A pale edge that moves before torchlight.',{icon:'🗡️',minChapter:6,rarity:'Uncommon',dropWeight:68}),
  equipment('hunter_bow','Hunter Bow','Bow','weapon',1,{attack:9},{criticalChance:.02,range:.08},1,1,'Carved for wardens who patrol beyond the walls.',{icon:'🏹'}),
  equipment('bronze_helm','Bronze Watch Helm','Helmet','helmet',1,{defense:7},{hp:20,statusResist:.02},1,1,'The battered helm of a village sentry.'),
  equipment('iron_buckler','Iron Chapel Buckler','Shield','accessory2',1,{defense:8},{statusResist:.03},2,1,'A compact shield stamped with the chapel bell.',{icon:'🛡️'}),
  equipment('leather_coat','Night Leather Coat','Leather Armor','armor',1,{defense:6},{hp:28,movement:.02},1,2,'Dark hide stitched for silent road patrols.',{icon:'🥋'}),
  equipment('iron_plate','Iron Village Plate','Heavy Armor','armor',1,{defense:11},{hp:42,movement:-.02},2,2,'Simple plate built to hold a narrow gate.'),
  equipment('leather_gloves','Roadworn Gloves','Gloves','gloves',1,{defense:3},{attackSpeed:.02,criticalChance:.01},0,2,'Worn smooth by a thousand drawn blades.'),
  equipment('scout_boots','Leather Scout Boots','Boots','boots',1,{movement:.05},{defense:2,statusResist:.02},1,1,'Soft-soled boots for the moonlit roads.'),
  equipment('bronze_ring','Bronze Oath Ring','Ring','accessory1',1,{hp:18},{goldGain:.03},2,0,'A humble oath carried by the first defenders.',{icon:'💍'}),
  equipment('prayer_book','Field Prayer Book','Book','accessory2',1,{faith:4},{xpGain:.03,statusChance:.02},4,0,'Its margins hold the names of the rescued.',{icon:'📕'}),
  equipment('gold_katana','Goldmoon Katana','Katana','weapon',2,{attack:24},{criticalChance:.07,criticalDamage:.12},2,7,'A curved flash drawn beneath an eclipsed moon.',{icon:'⚔️'}),
  equipment('diamond_spear','Diamond Saint Spear','Polearm','weapon',2,{attack:27},{bossDamage:.08,range:.12},6,4,'A crystalline point made for towering foes.',{icon:'🔱'}),
  equipment('platinum_whip','Platinum Thorn Whip','Whip','weapon',2,{attack:20},{attackSpeed:.08,lifeSteal:.02},3,6,'Each silver thorn remembers a tyrant.',{icon:'⛓️'}),
  equipment('eclipse_gun','Eclipse Hand Cannon','Gun','weapon',2,{attack:30},{criticalDamage:.18,attackSpeed:-.04},1,7,'Alchemy and thunder sealed in black steel.',{icon:'🔫'}),
  equipment('gold_circlet','Gold Command Circlet','Helmet','helmet',2,{defense:14},{criticalChance:.04,towerCriticalChance:.02},5,5,'A commander’s crown without a kingdom.'),
  equipment('diamond_aegis','Diamond Moon Aegis','Shield','accessory2',2,{defense:20},{hp:65,statusResist:.08},7,4,'Moonlight fractures across its crystalline face.',{icon:'🛡️'}),
  equipment('diamond_visor','Diamond War Visor','Helmet','helmet',2,{defense:18},{hp:55,statusResist:.08},3,6,'Faceted crystal turns fear aside.'),
  equipment('platinum_mail','Platinum Warden Mail','Armor','armor',2,{defense:26},{hp:95,bossDamage:.05},5,6,'Royal links recovered from the drowned armory.'),
  equipment('moon_robe','Moonlit Oracle Robe','Robe','armor',2,{faith:10},{statusChance:.08,skillCooldown:.05},10,1,'Moon-thread carries prayers farther than steel.',{icon:'🥻'}),
  equipment('gold_gauntlets','Gold Vanguard Gauntlets','Gauntlets','gloves',2,{attack:9},{defense:8,criticalDamage:.08},1,8,'Built for those who lead from the breach.'),
  equipment('diamond_treads','Diamond Pathfinders','Boots','boots',2,{movement:.09},{defense:7,criticalChance:.02},3,5,'Crystal soles that never lose the road.'),
  equipment('saint_ring','Ring of the Minor Saint','Ring','accessory1',2,{faith:9},{towerDamage:.04,towerRange:.04},9,0,'A small reliquary radiating quiet resolve.',{icon:'💍'}),
  equipment('war_manual','Crimson Battle Manual','Book','accessory2',2,{bravery:9},{towerDamage:.04,bossDamage:.04},0,9,'Every page describes a victory paid in blood.',{icon:'📕'}),
  equipment('ancient_excalibur','Excalibur of the Last Dawn','Named Sword','weapon',3,{attack:52},{holyDamage:.18,bossDamage:.15,criticalChance:.08},12,12,'The dawn survives as a line of gold along its edge.',{icon:'⚔️',minChapter:20,rarity:'Mythic',dropWeight:3,sellValue:1200}),
  equipment('nightmare_katana','Nightmare Crescent','Named Katana','weapon',3,{attack:46},{shadowDamage:.20,criticalDamage:.28,lifeSteal:.04},2,18,'It leaves a second wound inside the victim’s shadow.',{icon:'🌙',rarity:'Mythic',dropWeight:4,sellValue:1100}),
  equipment('judgment_staff','Staff of Judgment','Holy Staff','weapon',3,{attack:38},{holyDamage:.24,statusChance:.12,skillCooldown:.10},20,3,'Thunder answers every prayer spoken through it.',{icon:'🪄'}),
  equipment('ancient_crown','Crown of the First Village','Ancient Helmet','helmet',3,{defense:31},{towerDamage:.08,towerCriticalChance:.05,hp:100},18,8,'Older than the roads, yet shaped for Shadow.'),
  equipment('lastwall_shield','The Last Wall','Named Shield','accessory2',3,{defense:38},{hp:140,bossDamage:.08,statusResist:.12},12,14,'The final gate was patterned after this unbroken shield.',{icon:'🛡️',rarity:'Mythic',dropWeight:4,sellValue:1050}),
  equipment('seraph_plate','Seraphic Eclipse Plate','Holy Armor','armor',3,{defense:48},{hp:180,holyDamage:.12,statusResist:.15},16,10,'Black plate lit from within by captive starlight.'),
  equipment('void_robe','Vestment of the Hollow Star','Ancient Robe','armor',3,{faith:22},{shadowDamage:.15,statusChance:.15,towerRange:.08},22,2,'Its empty constellations watch the battlefield.',{icon:'🥻'}),
  equipment('king_gauntlets','Gauntlets of the Underking','Named Gauntlets','gloves',3,{attack:18},{armorPenetration:.14,criticalDamage:.15},3,18,'Stone fists once clenched around a buried crown.'),
  equipment('winged_boots','Saint’s Winged Boots','Holy Boots','boots',3,{movement:.15},{attackSpeed:.08,statusResist:.10},12,10,'They touch the road only when their bearer doubts.',{icon:'🥾'}),
  equipment('eclipse_signet','Final Eclipse Signet','Named Ring','accessory1',3,{bravery:20},{bossDamage:.12,towerBossDamage:.08,criticalChance:.05},5,20,'A royal seal pressed into the end of night.',{icon:'💍',minChapter:20,rarity:'Mythic',dropWeight:3,sellValue:1250}),
  equipment('cathedral_reliquary','Reliquary of Living Light','Holy Accessory','accessory2',3,{faith:22},{towerAttackSpeed:.08,xpGain:.10,goldGain:.10},22,0,'A warm fragment of the cathedral’s first bell.',{icon:'📿',rarity:'Mythic',dropWeight:4,sellValue:1150})
]);

export const ELEMENT_REGISTRY = Object.freeze([
  { id:'fire', name:'Fire', icon:'🔥', color:'#ff7848', fusionTags:['heat','burn'], effects:{burnDps:.08,bossDamage:.05} },
  { id:'ice', name:'Ice', icon:'❄️', color:'#8edcff', fusionTags:['cold','control'], effects:{slow:.06,freezeChance:.02} },
  { id:'poison', name:'Poison', icon:'☠️', color:'#8fd45f', fusionTags:['toxin','decay'], effects:{poisonDps:.06,armorPenetration:.04} },
  { id:'lightning', name:'Lightning', icon:'⚡', color:'#ffe072', fusionTags:['storm','chain'], effects:{chainChance:.10,chainDamage:.35} },
  { id:'holy', name:'Holy', icon:'✨', color:'#fff0a6', fusionTags:['light','purify'], effects:{holyDamage:.08} },
  { id:'shadow', name:'Shadow', icon:'🌑', color:'#b28cff', fusionTags:['void','curse'], effects:{criticalDamage:.10,lifeSteal:.01} }
]);

export const GEM_REGISTRY = Object.freeze(ELEMENT_REGISTRY.flatMap(element =>
  [1,2,3].map(level => ({
    id: `${element.id}_${level}`,
    name: `${element.name} Gem ${['I','II','III'][level-1]}`,
    element: element.id,
    level,
    icon: element.icon,
    description: `Permanently infuses a tower with ${element.name.toLowerCase()} power.`,
    passiveEffects: Object.fromEntries(Object.entries(element.effects).map(([key,value]) => [key, value * level])),
    fusionTags: element.fusionTags,
    upgradePath: level < 3 ? `${element.id}_${level+1}` : null,
    fragmentCost: level === 1 ? 10 : level === 2 ? 20 : 0
  }))
));

export const FUSION_REGISTRY = Object.freeze([
  { id:'hellfire', inputs:['fire','poison'], name:'Hellfire', icon:'🔥', hidden:false, effects:{burnDps:.22,poisonDps:.14,bossDamage:.10} },
  { id:'storm_crystal', inputs:['ice','lightning'], name:'Storm Crystal', icon:'🌩️', hidden:false, effects:{freezeChance:.08,chainChance:.28,chainDamage:.55} },
  { id:'purification_flame', inputs:['holy','fire'], name:'Purification Flame', icon:'🌟', hidden:true, effects:{holyDamage:.24,burnDps:.16,bossDamage:.16} },
  { id:'death_mist', inputs:['shadow','poison'], name:'Death Mist', icon:'🌫️', hidden:true, effects:{poisonDps:.24,armorPenetration:.16,criticalDamage:.18} },
  { id:'frozen_nightmare', inputs:['shadow','ice'], name:'Frozen Nightmare', icon:'🌑', hidden:true, effects:{freezeChance:.12,frozenDamage:.25,criticalDamage:.15} },
  { id:'judgment', inputs:['holy','lightning'], name:'Judgment', icon:'⚡', hidden:true, effects:{holyDamage:.20,chainChance:.32,chainDamage:.65} }
]);

export const SUPPORT_REGISTRY = Object.freeze([
  { id:'ravenScout', name:'Raven Scout', icon:'🐦‍⬛', rarity:'Good', unlockChapter:'forest', effect:{criticalChance:.06,range:.08}, description:'Marks distant prey and reveals weak points.' },
  { id:'blacksmithSupport', name:'Field Blacksmith', icon:'🔨', rarity:'Common', unlockChapter:'cemetery', effect:{damage:.12}, description:'Tempers nearby weapons between volleys.' },
  { id:'alchemistSupport', name:'Plague Alchemist', icon:'⚗️', rarity:'Epic', unlockChapter:'marsh', effect:{poisonDps:.08,statusChance:.08}, description:'Coats nearby ammunition in grave toxins.' },
  { id:'holyPriest', name:'Lantern Priest', icon:'🕯️', rarity:'Epic', unlockChapter:'cathedral', effect:{holyDamage:.15,bossDamage:.06}, description:'Consecrates the surrounding defenses.' },
  { id:'battleStrategist', name:'Veiled Strategist', icon:'♟️', rarity:'Legendary', unlockChapter:'walls', effect:{attackSpeed:.14,targeting:.20}, description:'Directs several defenses as one disciplined weapon.' },
  { id:'phantomDecoy', name:'Phantom Decoy', icon:'👤', rarity:'Good', unlockChapter:'village', effect:{slow:.08,distraction:.12}, description:'Projects false defenders that disrupt the enemy advance.' }
]);

export const SUPPORT_EFFECT_REGISTRY = Object.freeze({
  holy:{damage:.42,attackSpeed:.22,holy:true,linkedDamage:.08,burn:5,visual:'holy'},
  freeze:{attackSpeed:.30,range:.14,slow:.62,visual:'freeze'},
  guardian:{damage:.22,attackSpeed:.18,linkedDamage:.05,waveGateHealing:2,visual:'guardian'},
  ...Object.fromEntries(SUPPORT_REGISTRY.map(s=>[s.id,s.effect]))
});

export const BOSS_LOOT_REGISTRY = Object.freeze({
  tiers:[
    {id:1,minChapter:1,maxChapter:10,fragmentBase:2},
    {id:2,minChapter:11,maxChapter:17,fragmentBase:3},
    {id:3,minChapter:18,maxChapter:Infinity,fragmentBase:5}
  ],
  guaranteedChapterGems:{5:'fire_1',8:'ice_1',10:'lightning_1'},
  fragmentChapterMinimum:5,
  earlyFragmentElements:['fire','ice'],
  equipmentDropsPerBoss:1,
  fragmentRandomBonus:2
});

export const COMPANION_ASCENSION = Object.freeze(Object.fromEntries(
  COMPANION_REGISTRY.map(({id,passive,active,cooldown,aiDescription,scaling}) =>
    [id,{passive,active,cooldown,ai:aiDescription,scaling}])
));

export function supportCapacity(rarity = 'Common') {
  return ({ common:1, good:2, uncommon:2, rare:2, epic:3, epicplus:3, legendary:4, legendaryplus:4, mythic:4 })[String(rarity).toLowerCase()] || 1;
}

export function equipmentById(id) {
  return EQUIPMENT_REGISTRY.find(item => item.id === id) || null;
}

export function gemById(id) {
  return GEM_REGISTRY.find(gem => gem.id === id) || null;
}

export function combinedEquipmentStats(equipped = {}) {
  const totals = { faith:0, bravery:0 };
  for (const id of Object.values(equipped)) {
    const item = equipmentById(id);
    if (!item) continue;
    totals.faith += Number(item.faith) || 0;
    totals.bravery += Number(item.bravery) || 0;
    for (const source of [item.primaryStat, item.secondaryStats]) {
      for (const [stat, value] of Object.entries(source || {})) {
        if (stat === 'faith' || stat === 'bravery') continue;
        totals[stat] = (totals[stat] || 0) + Number(value || 0);
      }
    }
  }
  return totals;
}

export function bossLootTier(chapter) {
  return BOSS_LOOT_REGISTRY.tiers.find(tier => chapter >= tier.minChapter && chapter <= tier.maxChapter) || BOSS_LOOT_REGISTRY.tiers.at(-1);
}

export function eligibleBossEquipment(chapter, bossTier = bossLootTier(chapter).id) {
  return EQUIPMENT_REGISTRY.filter(item => item.minChapter <= chapter && item.minBossTier <= bossTier);
}
