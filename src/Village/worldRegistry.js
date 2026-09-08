export const VILLAGE_WORLD_VERSION = 2;
export const VILLAGE_BOUNDS = Object.freeze({ minX:-51, maxX:51, minZ:-45, maxZ:48 });
export const VILLAGE_RIVER = Object.freeze({ minX:-23.4, maxX:-12.6 });
export const VILLAGE_BRIDGES = Object.freeze([{minZ:-8.2,maxZ:-1.8},{minZ:19.8,maxZ:26.2}]);

export const VILLAGE_MODELS = Object.freeze([
  'house_lv1','house_lv2','house_lv3','house_lv4','house_lv5','farm','lumber_camp','quarry','warehouse','library','alchemist',
  'enchanter','blacksmith','tavern','keep','cathedral','stone_wall','fence','bench','market_stall','wagon','barrel','lamp_post',
  'statue','bridge','dead_tree','shrub','rock_cluster'
]);

export const MODEL_FOR_BUILDING = Object.freeze({
  house:'house_lv1',almshouse:'house_lv2',manor:'house_lv3',bathhouse:'house_lv2',estate:'house_lv4',mansion:'house_lv5',
  farm:'farm',orchard:'farm',herbGarden:'farm',sawmill:'lumber_camp',stable:'lumber_camp',quarry:'quarry',stonemason:'quarry',
  storehouse:'warehouse',market:'warehouse',tannery:'warehouse',well:'warehouse',library:'library',observatory:'library',
  alchemist:'alchemist',enchanter:'enchanter',runestone:'enchanter',gemForge:'enchanter',blacksmith:'blacksmith',workshop:'blacksmith',armory:'blacksmith',
  tavern:'tavern',keep:'keep',townhall:'house_lv4',watchtower:'keep',barracks:'keep',palisade:'keep',chapel:'cathedral',
  shrine:'cathedral',reliquary:'cathedral',graveyard:'cathedral'
});

export const DISTRICTS = Object.freeze([
  {id:'sacred',name:'Cathedral Close',center:[0,-29],accent:0xb77a45},
  {id:'keep',name:'Last Bastion',center:[-22,-29],accent:0x7f3345},
  {id:'industry',name:'Ashworks',center:[31,-26],accent:0xd16632},
  {id:'residential',name:'Lantern Ward',center:[-34,1],accent:0xd5a55b},
  {id:'commerce',name:'Night Market',center:[31,19],accent:0xc58a4b},
  {id:'agriculture',name:'Moonfield',center:[-38,30],accent:0x78915a},
  {id:'arcane',name:'Veiled Academy',center:[0,37],accent:0x6b62bd}
]);

export const PRIMARY_ROADS = Object.freeze([
  [10,0,7,78],[10,-5,58,6],[10,23,58,6],[-35,-5,24,6],[-35,23,24,6],[20,-25,36,5],[22,17,30,5]
]);
export const SECONDARY_ROADS = Object.freeze([
  [-33,-10,2.3,11,0],[-33,1,2.3,11,0],[-33,12,2.3,8,0],[32,-10,2.3,11,0],[32,1,2.3,11,0],
  [32,12,2.3,8,0],[0,18,2.4,10,0],[0,29,2.4,10,0],[-7,-18,12,2.1,Math.PI/8],[7,-18,12,2.1,-Math.PI/8]
]);

export const LANDMARKS = Object.freeze([
  ['cathedral',0,-32,{rot:0,fit:19}],['keep',-20,-30,{rot:0,fit:13}],['lumber_camp',-43,-27,{rot:Math.PI/2,fit:8.4}],
  ['quarry',38,-26,{rot:-Math.PI/2,fit:8.6}],['farm',-42,31,{rot:Math.PI/2,fit:9.2}],['tavern',40,31,{rot:-Math.PI/2,fit:8.6}],
  ['blacksmith',20,-30,{rot:0,fit:8.2}],['library',-30,40,{rot:Math.PI,fit:9}],['warehouse',30,40,{rot:Math.PI,fit:8.6}]
]);

export const PLOT_POSITIONS = Object.freeze([
  [-42,-16],[-33,-16],[-24,-16],[-42,-5],[-33,-5],[-24,-5],[-42,7],[-33,7],[-24,7],
  [23,-16],[32,-16],[41,-16],[23,-5],[32,-5],[41,-5],[23,7],[32,7],[41,7],
  [-8,14],[7,14],[-8,23],[0,23],[8,23],[-8,32],[0,32],[8,32],[-8,41],[0,41],[8,41]
]);

export const CITIZEN_SCHEDULE_NODES = Object.freeze({
  square:[[0,-12],[8,-5],[-6,-5],[9,18],[-7,22]],homes:[[-39,-14],[-31,-14],[-25,-14],[-38,5]],
  farm:[[-41,27],[-38,32],[-44,34]],industry:[[34,-25],[21,-28],[-41,-26]],market:[[26,18],[32,18],[38,27]],
  sacred:[[-4,-25],[4,-25],[0,-18]],arcane:[[-29,36],[-4,38],[6,38]],guard:[[-47,-37],[47,-37],[-47,39],[47,39],[0,-8]]
});

export function modelForBuilding(type='house') {
  if (MODEL_FOR_BUILDING[type]) return MODEL_FOR_BUILDING[type];
  const value=String(type);
  if(/farm|orchard|herb|crop/i.test(value))return 'farm';if(/saw|lumber|wood|stable/i.test(value))return 'lumber_camp';
  if(/quarry|stone|mason/i.test(value))return 'quarry';if(/store|ware|market|granary|tan/i.test(value))return 'warehouse';
  if(/librar|observ|school/i.test(value))return 'library';if(/alchem|potion/i.test(value))return 'alchemist';if(/enchant|rune|arcane/i.test(value))return 'enchanter';
  if(/smith|forge|armor|workshop/i.test(value))return 'blacksmith';if(/tavern|inn|brew/i.test(value))return 'tavern';
  if(/keep|hall|tower|barrack|wall|palisade/i.test(value))return 'keep';if(/chapel|shrine|cathedral|reliquar|grave/i.test(value))return 'cathedral';
  return /mansion/i.test(value)?'house_lv5':/estate|townhall/i.test(value)?'house_lv4':/manor/i.test(value)?'house_lv3':/almshouse|bath/i.test(value)?'house_lv2':'house_lv1';
}
