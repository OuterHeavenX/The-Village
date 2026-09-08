// Village construction and research data.
//
// This is pure data with no DOM or engine dependency, so it can be imported by
// the Village UI (src/villageBootstrap.js), the game bridge (src/Battle/game.js)
// and by scripts/validate-content.mjs, which checks that every entry here is
// actually reachable in a playthrough. It previously lived as two literals
// inside two different DOM-owning modules, which is why the reachability gap
// this file now guards against went unnoticed.

// The only structures offered on the first night. Everything else arrives
// through VILLAGE_RESEARCH, which is gated on completed campaign chapters.
export const VILLAGE_STARTER_BUILDINGS = Object.freeze(['house','farm','sawmill','quarry','storehouse']);

// requiresStage is a campaign chapter number (1-20); artifact, when present,
// is a boss relic that must also be held.
export const VILLAGE_RESEARCH = Object.freeze([
 {id:'waterworks',name:'Village Waterworks',icon:'⛲',requiresStage:2,cost:{gold:180,wood:80,stone:60},unlocks:['well'],battle:'Improves settlement happiness.'},
 {id:'orchardry',name:'Moon Orchardry',icon:'🍎',requiresStage:3,cost:{gold:240,wood:120,food:100},unlocks:['orchard','herbGarden'],battle:'Improves food reserves between hunts.'},
 {id:'buildersGuild',name:"Builder's Guild",icon:'🪚',requiresStage:4,cost:{gold:320,wood:160,stone:120},unlocks:['workshop','almshouse'],battle:'Strengthens village recovery and construction.'},
 {id:'nightCommerce',name:'Night Commerce',icon:'🏪',requiresStage:6,cost:{gold:450,wood:180,stone:120,food:150},unlocks:['market','tavern','stable'],battle:'+5 starting battle souls from an active Market.'},
 {id:'sacredRoads',name:'Sacred Roads',icon:'🕯️',requiresStage:8,cost:{gold:550,wood:140,stone:240,essence:20},unlocks:['chapel','shrine','graveyard'],battle:'Cathedral blessings add starting gate health.'},
 {id:'golemIndustry',name:'Golem-Forged Industry',icon:'⚒️',requiresStage:10,artifact:'heart-of-the-golem',cost:{gold:900,wood:300,stone:420,iron:40,essence:35},unlocks:['blacksmith','stonemason','watchtower','barracks'],battle:'Blacksmiths improve tower damage; guards strengthen the gate.'},
 {id:'merchantCharter',name:'Merchant Charter',icon:'📜',requiresStage:12,cost:{gold:1200,wood:350,stone:260,iron:60},unlocks:['manor','tannery','armory','palisade'],battle:'Unlocks advanced trade and military supply.'},
 {id:'arcaneFoundation',name:'Arcane Foundation',icon:'📚',requiresStage:14,cost:{gold:1600,wood:400,stone:500,iron:80,essence:90},unlocks:['library','alchemist','enchanter'],battle:'Unlocks elemental research and crafted battle supplies.'},
 {id:'arcaneMastery',name:'Arcane Mastery',icon:'🔮',requiresStage:17,cost:{gold:2200,wood:500,stone:650,iron:120,essence:160},unlocks:['observatory','runestone','reliquary','gemForge'],battle:'Reveals boss modifiers and empowers card fusion.'},
 {id:'divineKingdom',name:'Divine Kingdom',icon:'♛',requiresStage:20,cost:{gold:3200,wood:700,stone:900,iron:180,essence:250},unlocks:['townhall','bathhouse'],battle:'Completes the kingdom progression era.'}
]);

// The Village build catalog. Keys are the ids referenced by
// VILLAGE_STARTER_BUILDINGS and by VILLAGE_RESEARCH unlocks.
export const VILLAGE_BUILDINGS = Object.freeze({
  house:       { cat:'residential', name:'Village House', icon:'🏠', image:'assets/village/house_lv01.png', cost:120, costs:{gold:120,wood:80,stone:30}, production:'+4 Population', description:'A sturdy home for new villagers.' },
  manor:       { cat:'residential', name:'Gothic Manor', icon:'🏛️', image:'assets/village/house_lv02.png', cost:320, production:'+9 Population', description:'Expanded housing for established families.' },
  almshouse:   { cat:'residential', name:'Almshouse', icon:'🛏️', cost:220, production:'+6 Population · +1 Morale', description:'Shelter for travelers and displaced villagers.' },

  farm:        { cat:'production', name:'Farm Plot', icon:'🌾', image:'assets/village/farm_plot.png', cost:145, costs:{gold:145,wood:60,stone:20}, production:'+8 Food / h', description:'Produces food continuously, including offline.' },
  orchard:     { cat:'production', name:'Moon Orchard', icon:'🍎', cost:190, production:'+11 Food / h', description:'A high-yield orchard protected from the night.' },
  herbGarden:  { cat:'production', name:'Herb Garden', icon:'🌿', cost:210, production:'+5 Food / h · +2 Essence / h', description:'Cultivates medicinal and arcane herbs.' },
  well:        { cat:'production', name:'Stone Well', icon:'⛲', cost:105, production:'+3 Food / h · +1 Morale', description:'Clean water improves health and crop yields.' },
  sawmill:     { cat:'production', name:'Lumber Camp', icon:'🪵', cost:110, costs:{gold:110,wood:40,stone:25}, production:'+9 Wood / h', description:'Cuts timber for construction and repairs.' },
  quarry:      { cat:'production', name:'Quarry', icon:'⛏️', cost:125, costs:{gold:125,wood:45}, production:'+8 Stone / h', description:'Extracts stone for fortifications and civic works.' },
  tannery:     { cat:'production', name:'Tannery', icon:'🧵', cost:245, production:'+4 Leather / h', description:'Processes hides for armor and trade.' },

  market:      { cat:'commerce', name:'Night Market', icon:'🏪', cost:300, production:'+12 Gold / h', description:'Generates village Gold from trade.' },
  tavern:      { cat:'commerce', name:'Hunter Tavern', icon:'🍺', cost:260, production:'+5 Gold / h · +2 Morale', description:'Attracts hunters, rumors, and paying travelers.' },
  storehouse:  { cat:'commerce', name:'Warehouse', icon:'📦', cost:225, costs:{gold:225,wood:90,stone:80}, production:'+250 Resource Capacity', description:'Expands offline resource storage.' },
  stable:      { cat:'commerce', name:'Stables', icon:'🐴', cost:285, production:'+4 Gold / h · faster travel', description:'Supports caravans and district travel.' },

  blacksmith:  { cat:'military', name:'Blacksmith', icon:'🔨', cost:360, costs:{gold:360,wood:140,stone:180,iron:20}, production:'+3 Iron / h · tower repair', description:'Forges weapons and repairs village defenses.' },
  stonemason:  { cat:'production', name:'Stone Mason', icon:'🧱', cost:340, costs:{gold:340,wood:120,stone:160}, production:'+5 Stone / h · stronger works', description:'Shapes Golem-taught masonry for advanced construction.' },
  watchtower:  { cat:'military', name:'Watchtower', icon:'🗼', cost:295, production:'+1 Gate HP · road vision', description:'Warns the village before enemies arrive.' },
  barracks:    { cat:'military', name:'Barracks', icon:'⚔️', cost:420, production:'+2 Gate HP · hunter training', description:'Trains defenders and strengthens the gate.' },
  armory:      { cat:'military', name:'Armory', icon:'🛡️', cost:465, production:'+5% Tower Damage', description:'Stores improved weapons for defensive towers.' },
  palisade:    { cat:'military', name:'Palisade', icon:'🧱', cost:180, production:'+3 Gate HP', description:'A fast defensive reinforcement for the village.' },

  chapel:      { cat:'sacred', name:'Moon Chapel', icon:'⛪', cost:390, production:'+4 Essence / h', description:'A sacred refuge that gathers Blood Essence.' },
  shrine:      { cat:'sacred', name:'Roadside Shrine', icon:'🕯️', cost:165, production:'+2 Essence / h', description:'A small ward placed along the village road.' },
  reliquary:   { cat:'sacred', name:'Reliquary', icon:'📿', cost:510, production:'+1 Relic Slot', description:'Preserves unique artifacts recovered from bosses.' },
  graveyard:   { cat:'sacred', name:'Consecrated Graveyard', icon:'🪦', cost:195, production:'+3 Essence / h', description:'Honors the fallen and protects their spirits.' },

  library:     { cat:'arcane', name:'Arcane Library', icon:'📚', cost:440, production:'Unlocks Research', description:'Studies boss artifacts and elemental knowledge.' },
  alchemist:   { cat:'arcane', name:'Alchemist Laboratory', icon:'⚗️', cost:430, production:'+3 Essence / h · crafting', description:'Brews elemental essences and rare mixtures.' },
  enchanter:   { cat:'arcane', name:'Enchanter Workshop', icon:'✨', cost:520, production:'Equipment Imbuement', description:'Imbues hunter equipment with learned elements.' },
  gemForge:    { cat:'arcane', name:'Gem Forge', icon:'💎', cost:560, production:'Crafts · upgrades · removes · fuses Gems', description:'A modular elemental forge for fragments, permanent tower Gems, and hidden fusion recipes.' },
  observatory: { cat:'arcane', name:'Observatory', icon:'🔭', cost:540, production:'Reveals Boss Modifiers', description:'Studies omens before chapter boss encounters.' },
  runestone:   { cat:'arcane', name:'Rune Stone', icon:'🗿', cost:310, production:'+4% Card Merge Odds', description:'Strengthens card fusion rituals.' },

  townhall:    { cat:'civic', name:'Town Hall', icon:'🏰', cost:650, production:'+1 Village Level', description:'Coordinates districts and unlocks civic growth.' },
  bathhouse:   { cat:'civic', name:'Bathhouse', icon:'💧', cost:250, production:'+3 Morale', description:'Restores the villagers after long nights.' },
  workshop:    { cat:'civic', name:'Builder Workshop', icon:'🪚', cost:335, production:'-5% Future Build Cost', description:'Improves construction tools and planning.' }
});

export const VILLAGE_BUILD_CATEGORIES = Object.freeze([
  ['all','✦','All Buildings'],
  ['residential','🏠','Residential'],
  ['production','🌾','Production'],
  ['commerce','🏪','Commerce'],
  ['military','⚔️','Military'],
  ['sacred','⛪','Sacred'],
  ['arcane','⚗️','Arcane'],
  ['civic','🏛️','Civic']
]);
