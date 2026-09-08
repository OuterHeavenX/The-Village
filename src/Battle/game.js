
import { flushCloudSave, queueCloudSave, registerSaveProvider } from '../online/cloudSave.js';
import { canTriggerChoice, choiceTier, dynamicEssenceReward, essenceCapacity, nextChoiceMilestone, registerCompletedDraft } from './economy.js';
import { BATTLE_CHOICE_RULES, EARLY_STAGE_DIFFICULTY, TACTICAL_CHOICE_REGISTRY, cardLevelCapForStage, rarityUpgradeFor, rewardForStage } from '../Progression/economyRegistry.js';
import { beginProgressionTelemetry, endProgressionTelemetry, exportProgressionTelemetry, telemetryDamage, telemetryEnemyDeath, telemetryEnemySpawn, telemetryRarityUpgrade, telemetryReward } from '../Progression/battleTelemetry.js';
import { createBenchmarkProfile } from '../Progression/benchmarkProfiles.js';
import { preloadBattlefield, renderBattlefieldFoundation, renderIntegratedRoad, renderBattlefieldStructures, renderRoadNetworkDebug } from './Environment/battlefieldRenderer.js';
import { preloadCathedral, renderCathedralStateOverlay } from './Environment/cathedral.js';
import { calculateVillageRates, projectVillageProduction, VILLAGE_MAX_OFFLINE_HOURS } from '../Village/economyModel.js';
import { placementFeedback, placementSlots, renderPlacementPads } from './placementSystem.js';
import { battlefieldLimits } from './battlefieldConfig.js';
import { NEW_CORE_TOWERS, coreTower } from './Towers/towerRegistry.js';
import { preloadCoreTowerAtlases, renderCoreGothicTower } from './Towers/towerAnimations.js';
import { drawLaneProjectileAsset, drawProjectileAsset, impactPalette } from './projectileSystem.js';
import { authoredRoadPlans, CATHEDRAL_ENTRANCE } from './Environment/roadRegistry.js';
import { battleEvent, diagnosticSnapshot, installCanvasDiagnostics, validateBattleState } from './battleDiagnostics.js';
import { weightedDraftPool } from './Cards/draftWeights.js';
import { waveBreathingPeriod, waveIdentity, waveSpawnCount } from './waveDirector.js';
import { createBattleTelemetryOverlay } from './developmentTelemetry.js';
import { debugEnabled, debugSummary } from '../config/debug.js';
import { activateBattle3Runtime, deactivateBattle3Runtime } from './battle3Runtime.js';
import { cardArtHTML } from '../Cards/cardArtRegistry.js';
import {
  ASCENSION_SAVE_VERSION,
  ASCENSION_VERSION,
  BOSS_LOOT_REGISTRY,
  COMPANION_ASCENSION,
  COMPANION_BEHAVIOR_REGISTRY,
  COMPANION_REGISTRY,
  ELEMENT_REGISTRY,
  EQUIPMENT_REGISTRY,
  EQUIPMENT_SLOTS,
  FUSION_REGISTRY,
  GEM_REGISTRY,
  RELIC_REGISTRY,
  SUPPORT_EFFECT_REGISTRY,
  SUPPORT_REGISTRY,
  combinedEquipmentStats,
  bossLootTier,
  eligibleBossEquipment,
  equipmentById,
  gemById,
  supportCapacity
} from '../Ascension/registry.js';
import { VILLAGE_RESEARCH, VILLAGE_STARTER_BUILDINGS } from '../data/villageBuildings.js';
import { CAMPAIGN_CHAPTERS } from '../data/campaign.js';

'use strict';
// V32.4.1 — Stability audit, cleanup, Shadow Familiars and evolving battle Keep.
// V27.4 Split Roads: connected branching routes and multi-front enemy assaults.
const $=s=>document.querySelector(s), canvas=$('#game'), ctx=canvas.getContext('2d');
installCanvasDiagnostics(canvas);
preloadBattlefield();
preloadCathedral();
preloadCoreTowerAtlases();
const battleTelemetryOverlay=createBattleTelemetryOverlay({saveVersion:ASCENSION_SAVE_VERSION});
if(debugEnabled('diagnostics'))console.info(`[Village] Debug channels active: ${debugSummary()}`);
// V27.5 — Shadow and enemy sprite assets. Visual-only integration; combat values are unchanged.
const SPRITE_CACHE=new Map();
function spriteImage(src){const resolved=new URL(src,document.baseURI).href;if(!SPRITE_CACHE.has(resolved)){const img=new Image();img.decoding='async';img.src=resolved;SPRITE_CACHE.set(resolved,img)}return SPRITE_CACHE.get(resolved)}
const SHADOW_LEVELS={
 1:{root:'assets/characters/shadow_lv_01-03/PNG/Swordsman_lvl1/With_shadow',prefix:'Swordsman_lvl1'},
 2:{root:'assets/characters/shadow_lv_01-03/PNG/Swordsman_lvl2/With_shadow',prefix:'Swordsman_lvl2'},
 3:{root:'assets/characters/shadow_lv_01-03/PNG/Swordsman_lvl3/With_shadow',prefix:'Swordsman_lvl3'},
 4:{root:'assets/characters/shadow_lv_04-06/PNG/Swordsman_lvl4/With_shadow',prefix:'lvl4'},
 5:{root:'assets/characters/shadow_lv_04-06/PNG/Swordsman_lvl5/With_shadow',prefix:'lvl5'},
 6:{root:'assets/characters/shadow_lv_04-06/PNG/Swordsman_lvl6/With_shadow',prefix:'lvl6'},
 7:{root:'assets/characters/shadow_lv_07-09/PNG/Swordsman_lvl7/With_shadow',prefix:'lvl7'},
 8:{root:'assets/characters/shadow_lv_07-09/PNG/Swordsman_lvl8/With_shadow',prefix:'lvl8'},
 9:{root:'assets/characters/shadow_lv_07-09/PNG/Swordsman_lvl9/With_shadow',prefix:'lvl9'}
};
const SHADOW_LEVEL_ONE_PORTRAIT=new URL('../../assets/characters/shadow_portrait_lvl-01/shadow_portrait_lvl-01.png',import.meta.url).href;
const SHADOW_LEVEL_TWO_PORTRAIT=new URL('../../assets/characters/shadow_portrait_lvl-02/shadow_portrait_lv_02.png',import.meta.url).href;
const DRACULA_TOOTH_ART=new URL('../../assets/relics/draculas_fang.png',import.meta.url).href;
const GOTHIC_DAGGER_ATLAS=new URL('../../assets/towers/gothic_dagger/gothic_dagger_atlas.png',import.meta.url).href;
const gothicDaggerImage=spriteImage(GOTHIC_DAGGER_ATLAS);
function shadowAsset(level,action='Walk'){const n=Math.max(1,Math.min(9,Number(level)||1)),d=SHADOW_LEVELS[n];return `${d.root}/${d.prefix}_${action}_with_shadow.png`}
const GOLEM_ROOT='assets/enemies/boss_enemies/boss_golem_1/Tiled_files';
function golemAsset(form=1,action='Walk'){const n=Math.max(1,Math.min(3,Number(form)||1)),a=action==='Attack'?'Attack':action==='Idle'?'Idle':action==='Death'?'Death':'Walk';return `${GOLEM_ROOT}/Golem${n}_${a}_with_shadow.png`}
function currentShadowLevel(){return Math.max(1,Math.min(9,Number(save?.shadowLevel)||Number(save?.heroLevels?.[save?.selectedHero])||1))}

// V32.4 — Shadow Familiars. One equipped companion follows Shadow, gains its
// own persistent XP, and contributes a distinct autonomous battle ability.
const FAMILIARS=COMPANION_REGISTRY;
for(const familiar of FAMILIARS){const ascension=COMPANION_ASCENSION[familiar.id];if(ascension)familiar.role=`${ascension.ai} Passive: ${ascension.passive} Active: ${ascension.active} (${ascension.cooldown}s).`}
function familiarDef(id=save?.familiars?.equipped){return FAMILIARS.find(f=>f.id===id)||FAMILIARS[0]}
function familiarState(id){
 save.familiars=save.familiars&&typeof save.familiars==='object'?save.familiars:{equipped:'bat',unlocked:FAMILIARS.map(f=>f.id),progress:{}};
 save.familiars.progress=save.familiars.progress&&typeof save.familiars.progress==='object'?save.familiars.progress:{};
 const state=save.familiars.progress[id]||(save.familiars.progress[id]={level:1,xp:0});
 state.level=Math.max(1,Math.min(20,Number(state.level)||1));
 state.xp=state.level>=20?0:Math.max(0,Number(state.xp)||0);
 return state;
}
function familiarXpNeed(level){return 40+Math.max(0,level-1)*28}
function grantFamiliarXp(amount){
 if(!save?.familiars?.equipped)return;
 const st=familiarState(save.familiars.equipped);
 if(st.level>=20)return;
 st.xp+=Math.max(0,Math.round(Number(amount)||0));
 let leveled=false;
 while(st.level<20&&st.xp>=familiarXpNeed(st.level)){st.xp-=familiarXpNeed(st.level);st.level++;leveled=true}
 if(st.level>=20)st.xp=0;
 if(leveled)showToast(`${familiarDef().name} reached Level ${st.level}`);
 saveProgress();
}
function updateAscensionCompanion(dt){
 const fam=G?.familiar;if(!fam)return;
 const config=COMPANION_ASCENSION[fam.id]||COMPANION_ASCENSION.bat,behavior=COMPANION_BEHAVIOR_REGISTRY[fam.id]||COMPANION_BEHAVIOR_REGISTRY.bat,level=Math.max(1,fam.level||1);
 fam.ascension=config;fam.angle=(fam.angle||0)+dt*(behavior.visual?.orbitSpeed||.8);fam.t-=dt;fam.activeT=(fam.activeT??config.cooldown*.55)-dt;
 const inRange=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-G.hero.x,e.y-G.hero.y)<fam.range+level*.035);
 const progress=e=>(e.seg||0)+(e.prog||0);
 const density=e=>G.enemies.filter(other=>!other.dead&&Math.hypot(other.x-e.x,other.y-e.y)<1).length;
 const targets=[...inRange].sort((a,b)=>behavior.targeting==='armored'?(Number(b.armor||b.elite||b.boss)-Number(a.armor||a.elite||a.boss)):behavior.targeting==='progress'?progress(b)-progress(a):behavior.targeting==='clustered'?density(b)-density(a):b.speed-a.speed);
 if(fam.activeT<=0&&targets.length){const target=targets[0],power=fam.damage*(2.2+(level-1)*.16),active=behavior.activeEffect||{};if(active.type==='multiHit'){for(const e of targets.slice(0,active.targets||1))hit(e,power*(active.multiplier||1),{kind:'companionActive',noCrit:true})}else if(active.type==='heavyHit')hit(target,power*(active.multiplier||1),{kind:'companionActive',holy:active.holy});else if(active.type==='areaHit'){for(const e of G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-target.x,e.y-target.y)<(active.radius||1))){hit(e,power,{kind:'companionActive'});e.burn=Math.max(e.burn||0,active.burn||0)}}else if(active.type==='control'){for(const e of targets){e.freeze=Math.max(e.freeze||0,active.freeze||0);e.slow=Math.min(e.slow||1,active.slow||1)}}else if(active.type==='support'){G.faerieGuidance=active.duration||0;G.essence=Math.min(G.maxEssence,G.essence+(active.essenceBase||0)+Math.floor(level/(active.essenceLevelsPerBonus||Infinity)))}burst(target.x,target.y,fam.color,28);floatText(target.x,target.y-.35,config.active.toUpperCase(),fam.color);fam.activeT=config.cooldown}
 if(fam.t<=0){const target=targets[0];if(target){const scaling=config.scaling||{},projectile=behavior.projectile||{},dmg=fam.damage*(1+(level-1)*(scaling.damagePerLevel||.09));G.shots.push({x:G.hero.x+Math.cos(fam.angle)*.45,y:G.hero.y-.25+Math.sin(fam.angle)*.18,target,speed:projectile.speed||8.5,damage:dmg,color:fam.color,holy:!!projectile.holy,life:2,kind:'familiar',familiarId:fam.id,slow:projectile.slow?Math.max(.35,projectile.slow-level*(scaling.slowPerLevel||0)):0,burn:projectile.burn?projectile.burn+level*(scaling.burnPerLevel||0):0});fam.t=Math.max(.65,fam.rate-level*.045)}else fam.t=.2}
}
function keepBattleLevel(){const walls=Number(save?.keepUpgrades?.walls)||0,town=Number(save?.kingdom?.buildings?.townhall)||0;return Math.max(1,Math.min(5,1+Math.floor(walls/2)+Math.min(2,town)))}
// V32.4.2 — a dead per-type Walk-sheet lookup table was removed from here. It
// existed only to warm sixteen sheets that ENEMY_FAMILY already preloads below,
// and no code ever read it.
function directionRow(face){return ({down:0,up:1,left:2,right:3})[face]??0}
// V29.3 — Enemy animation states. Visual only; no combat values are changed.
const ENEMY_FAMILY={
 skeleton:{root:'assets/enemies/goblins/PNG/Orc1/With_shadow',prefix:'orc1',lower:true},
 wolf:{root:'assets/enemies/goblins/PNG/Orc2/With_shadow',prefix:'orc2',lower:true},
 armor:{root:'assets/enemies/goblins/PNG/Orc3/With_shadow',prefix:'orc3',lower:true},
 siegeknight:{root:'assets/enemies/goblins/PNG/Orc3/With_shadow',prefix:'orc3',lower:true},
 bat:{root:'assets/enemies/flower/PNG/Plant1/With_shadow',prefix:'Plant1'},
 ghost:{root:'assets/enemies/flower/PNG/Plant2/With_shadow',prefix:'Plant2'},
 thornbeast:{root:'assets/enemies/flower/PNG/Plant3/With_shadow',prefix:'Plant3'},
 bogqueen:{root:'assets/enemies/flower/PNG/Plant3/With_shadow',prefix:'Plant3'},
 vampire:{root:'assets/enemies/vampire/PNG/Vampires1/With_shadow',prefix:'Vampires1'},
 necromancer:{root:'assets/enemies/vampire/PNG/Vampires2/With_shadow',prefix:'Vampires2'},
 icebishop:{root:'assets/enemies/vampire/PNG/Vampires2/With_shadow',prefix:'Vampires2'},
 moonoracle:{root:'assets/enemies/vampire/PNG/Vampires2/With_shadow',prefix:'Vampires2'},
 warden:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'},
 bloodcount:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'},
 vampireking:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'},
 // V29.5 — the deep roster, unlocked from chapter 11
 ghoul:{root:'assets/enemies/zombie/PNG/Zombie1/With_shadow',prefix:'Zombie1'},
 revenant:{root:'assets/enemies/zombie/PNG/Zombie2/With_shadow',prefix:'Zombie2'},
 gravelord:{root:'assets/enemies/zombie/PNG/Zombie3/With_shadow',prefix:'Zombie3'},
 watcher:{root:'assets/enemies/floating_eye/PNG/Beholder1/With_shadow',prefix:'Beholder1'},
 gazer:{root:'assets/enemies/floating_eye/PNG/Beholder2/With_shadow',prefix:'Beholder2'},
 dreadeye:{root:'assets/enemies/floating_eye/PNG/Beholder3/With_shadow',prefix:'Beholder3'},
 rotmarshal:{root:'assets/enemies/zombie/PNG/Zombie3/With_shadow',prefix:'Zombie3'},
 hollowsaint:{root:'assets/enemies/floating_eye/PNG/Beholder3/With_shadow',prefix:'Beholder3'},
 plaguechoir:{root:'assets/enemies/zombie/PNG/Zombie2/With_shadow',prefix:'Zombie2'},
 voidprelate:{root:'assets/enemies/floating_eye/PNG/Beholder2/With_shadow',prefix:'Beholder2'},
 grandossuary:{root:'assets/enemies/zombie/PNG/Zombie1/With_shadow',prefix:'Zombie1'},
 eclipseherald:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'},
 lastsentinel:{root:'assets/enemies/goblins/PNG/Orc3/With_shadow',prefix:'orc3',lower:true},
 duskempress:{root:'assets/enemies/vampire/PNG/Vampires2/With_shadow',prefix:'Vampires2'},
 // these four bosses had no family entry and were silently rendering as orcs
 bellkeeper:{root:'assets/enemies/vampire/PNG/Vampires2/With_shadow',prefix:'Vampires2'},
 ashabbot:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'},
 underking:{root:'assets/enemies/goblins/PNG/Orc3/With_shadow',prefix:'orc3',lower:true},
 eclipselord:{root:'assets/enemies/vampire/PNG/Vampires3/With_shadow',prefix:'Vampires3'}
};
const ENEMY_ANIM={hurt:.26,attackFps:9,walkFps:8,idleFps:5,deathFps:11,corpseFade:.9,maxCorpses:40};
function enemyAsset(type,action='Walk'){
 const f=ENEMY_FAMILY[type]||ENEMY_FAMILY.skeleton;
 return `${f.root}/${f.prefix}_${f.lower?action.toLowerCase():action}_with_shadow.png`;
}
function isGolemBoss(e){return !!(e&&e.boss&&e.type==='golem')}
function enemyActionFor(e){
 if((e.cinematicPause||0)>0)return 'Idle';
 if(e.attacking)return 'Attack';
 if(!e.boss&&(e.hurtT||0)>0)return 'Hurt';
 if(e.freeze>0)return 'Idle';
 return 'Walk';
}
function enemySheet(e,action){
 // the golem sheets ship Walk/Idle/Attack/Death only
 return isGolemBoss(e)?golemAsset(e.golemForm||1,action==='Hurt'?'Walk':action):enemyAsset(e.type,action);
}
function sheetCols(img,fw,fallback=6){
 return (img&&img.naturalWidth)?Math.max(1,Math.floor(img.naturalWidth/fw)):fallback;
}
function enemyFrame(e,action,img){
 const cols=sheetCols(img,isGolemBoss(e)?128:64);
 if((e.cinematicPause||0)>0)return 0;
 if(action==='Hurt'){
  const p=1-Math.max(0,Math.min(1,(e.hurtT||0)/ENEMY_ANIM.hurt));
  return Math.min(cols-1,Math.floor(p*cols));
 }
 const fps=action==='Attack'?ENEMY_ANIM.attackFps:action==='Idle'?ENEMY_ANIM.idleFps:ENEMY_ANIM.walkFps;
 return Math.floor((e.animT||0)*fps+(e.routeIndex||0)*2);
}
function spawnCorpse(e){
 if(!G||!G.corpses)return;
 const golem=isGolemBoss(e);
 G.corpses.push({x:e.x,y:e.y,face:e.face||'down',golem,
  img:spriteImage(golem?golemAsset(e.golemForm||1,'Death'):enemyAsset(e.type,'Death')),
  size:(golem?320:e.boss?240:e.mini?98:e.elite?90:78),t:0});
 if(G.corpses.length>ENEMY_ANIM.maxCorpses)G.corpses.splice(0,G.corpses.length-ENEMY_ANIM.maxCorpses);
}
function corpseLife(c){return sheetCols(c.img,c.golem?128:64)/ENEMY_ANIM.deathFps}
function updateCorpses(dt){
 if(!G||!G.corpses)return;
 for(const c of G.corpses)c.t+=dt;
 G.corpses=G.corpses.filter(c=>c.t<corpseLife(c)+ENEMY_ANIM.corpseFade);
}
// V29.4 — Impact juice + Castlevania homage. Render-only; no combat values change.
const JUICE={sparkLife:[.16,.44],sparkSpeed:[1.8,5.4],cone:.85,kickMax:.20,kickDecay:2.6,
 squashT:.15,squash:.24,traumaDecay:2.0,shakeAmp:26,floatBase:12,floatCrit:16,floatWeak:10};
const MAX_CRIT_FLOATERS=10;
function pushImpactFloater(floater){
 if(!G)return;
 if(floater.crit){
  let critCount=0,reuse=null;
  for(const current of G.floaters){
   if(!current.crit)continue;
   critCount++;
   if(!reuse||current.life<reuse.life)reuse=current;
  }
  if(critCount>=MAX_CRIT_FLOATERS&&reuse){Object.assign(reuse,floater);return;}
 }
 G.floaters.push(floater);
}
const VK={key:'village.vk.mode',on:false,
 lines:["What a horrible night to have a curse.",
        "What is a man? A miserable little pile of secrets!",
        "Die, monster. You don't belong in this world!",
        "The night grows long. The whip remembers.",
        "Bloody tears fall on the cathedral steps."]};
try{VK.on=localStorage.getItem(VK.key)==='1'}catch(_){}
function vkSave(){try{localStorage.setItem(VK.key,VK.on?'1':'0')}catch(_){}}
function addTrauma(v,dx=0,dy=0,force=false){
 // V34: screen shake is reserved for bosses and major phase events only.
 if(!G||(!force&&!G.bossImpactWindow))return;
 G.trauma=Math.min(.62,(G.trauma||0)+Math.min(.34,v));
 const m=Math.hypot(dx,dy);if(m>.0001){G.impX=(G.impX||0)+dx/m*v*6;G.impY=(G.impY||0)+dy/m*v*6}
}
function sparks(x,y,dx,dy,color,n=9,cone=JUICE.cone){
 if(!G)return; const base=Math.atan2(dy,dx);
 for(let i=0;i<n;i++){
  const a=base+(Math.random()-.5)*cone*2,
        sp=JUICE.sparkSpeed[0]+Math.random()*(JUICE.sparkSpeed[1]-JUICE.sparkSpeed[0]);
  G.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
   life:JUICE.sparkLife[0]+Math.random()*(JUICE.sparkLife[1]-JUICE.sparkLife[0]),
   color,kind:'spark',size:1.4+Math.random()*2.4});
 }
}
function impactDir(e,shot){
 const src=shot&&shot.source;
 let dx=src?e.x-(src.x+.5):0, dy=src?e.y-(src.y+.5):-1;
 if(!dx&&!dy){dx=0;dy=-1}
 const m=Math.hypot(dx,dy)||1; return {x:dx/m,y:dy/m};
}
let lastCombatHitSound=0;
function combatHitSound(heavy,mid){
 const now=performance.now();
 if(now-lastCombatHitSound<28)return;
 lastCombatHitSound=now;
 const base=heavy?105:mid?155:205;
 playTone(base,heavy?.075:.05,'square',heavy?.055:.038);
 playTone(base*1.65,heavy?.045:.03,'triangle',heavy?.032:.022);
}
function impactFeedback(e,d,crit,shot){
 if(!G)return;
 telemetryDamage(shot?.source,Math.min(Math.max(0,d),Math.max(0,e.hp+d)));
 // damage-over-time ticks arrive every frame; accumulate them instead of
 // spawning a full impact (and a damage number) 60 times a second.
 if(d<1.2&&!crit){
  e.dotAccum=(e.dotAccum||0)+d;
  if(e.dotAccum>=6){
   pushImpactFloater({x:e.x,y:e.y-.25,text:`${Math.round(e.dotAccum)}`,color:'#ff9a5c',
    life:.85,vy:-.6,vx:(Math.random()-.5)*.4,size:JUICE.floatWeak,crit:false,pop:0});
   sparks(e.x,e.y-.15,0,-1,'#ff9a5c',4,Math.PI);
   e.dotAccum=0;
  }
  return;
 }
 const dir=impactDir(e,shot), heavy=crit||d>=18, mid=d>=7;
 combatHitSound(heavy,mid);
 e.kickX=dir.x; e.kickY=dir.y;
 e.hitKick=Math.min(JUICE.kickMax,(e.hitKick||0)+(heavy?.14:mid?.085:.05));
 e.squashT=JUICE.squashT;
 const authoredImpact=impactPalette(shot?.kind);
 const col=VK.on?(crit?'#ffe9a8':'#f4d68a'):(authoredImpact?.color||(crit?'#ffe36e':d<5?'#c8c2cc':'#fff4d8'));
 sparks(e.x,e.y-.18,dir.x,dir.y,col,heavy?Math.max(16,authoredImpact?.count||0):mid?Math.max(10,authoredImpact?.count||0):(authoredImpact?.count||6));
 if(crit)hitPause(48); else if(heavy)hitPause(24);
 const slot=floaterSlot(e.x,e.y-.25);
 pushImpactFloater({x:e.x+(slot%2?.34:-.34)*Math.ceil(slot/2),y:e.y-.25-slot*.20,
  text:`${crit?'CRIT ':''}${Math.max(1,Math.round(d))}`,
  color:crit?'#ffe36e':(d<5?'#9aa0aa':'#fff'),life:crit?.82:1,
  vy:crit?-.9:-.7,vx:(Math.random()-.5)*.5+(slot%2?.28:-.28),
  size:crit?JUICE.floatCrit:d<5?JUICE.floatWeak:JUICE.floatBase,crit,pop:0});
}
function deathBurst(e){
 telemetryEnemyDeath(e,G?.time||0);
 if(!G)return;
 const palette={skeleton:'#e9dfc7',ghost:'#b8d9ff',vampire:'#d94b6a',golem:'#c8a56f',armor:'#c7cbd6',wolf:'#9a8069'};
 const col=VK.on?'#e8c98a':(palette[e.type]||(e.boss?'#ff6b4a':'#b04b6a'));
 const count=e.boss?46:e.elite?22:14;sparks(e.x,e.y-.2,0,-1,col,count,Math.PI);
 if(e.type==='ghost')for(let i=0;i<9;i++)G.particles.push({x:e.x+(Math.random()-.5)*.35,y:e.y-.15,vx:(Math.random()-.5)*.25,vy:-.65-Math.random()*.8,life:.55+Math.random()*.55,color:'#cfe9ff',kind:'soul'});
 if(e.type==='skeleton'||e.type==='golem')for(let i=0;i<(e.boss?16:7);i++)G.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*3.2,vy:-1.3-Math.random()*2.4,life:.55+Math.random()*.5,color:col,kind:'debris',size:2+Math.random()*3});
 if(e.boss){bossShake(.34,0,-1,.42);hitPause(95);playTone(72,.35,'sawtooth',.055);}else if(e.elite)hitPause(38);
}
function updateJuice(dt){
 if(!G)return;
 G.trauma=Math.max(0,(G.trauma||0)-dt*JUICE.traumaDecay);
 const damp=Math.pow(.0022,dt);
 G.impX=(G.impX||0)*damp; G.impY=(G.impY||0)*damp;
}
function shakeOffset(){
 if(!G||!(G.trauma>0))return {x:0,y:0};
 const t=G.time||0,amp=Math.min(5.5,1.5+G.trauma*7);
 return {x:(Math.sin(t*91)+Math.sin(t*53)*.45)*amp*G.trauma,y:(Math.cos(t*77)+Math.sin(t*61)*.35)*amp*.72*G.trauma};
}
function bossShake(power=.22,dx=0,dy=1,duration=.22){
 if(!G)return;G.bossImpactWindow=true;addTrauma(power,dx,dy,true);clearTimeout(G._bossShakeTimer);G._bossShakeTimer=setTimeout(()=>{if(G)G.bossImpactWindow=false},Math.max(80,duration*1000));
}
function hitPause(ms=42){
 if(!G)return;G.hitStop=Math.max(G.hitStop||0,ms/1000);
}
function vkLine(){ if(!VK.on)return; showToast(VK.lines[Math.floor(Math.random()*VK.lines.length)]) }
function drawRoseWindow(){
 if(!VK.on)return;
 const cx=W/2, cy=-H*.16, R=Math.max(W,H)*.42, t=(G?.time||0);
 ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.09+.025*Math.sin(t*.6);
 const cols=['#8c2f4a','#3f5b8c','#c8a45c','#5a2f6b','#2f6b5a'];
 for(let ring=3;ring>=1;ring--){
  const r=R*ring/3, seg=6*ring;
  for(let i=0;i<seg;i++){
   const a0=i/seg*Math.PI*2+t*.02*ring, a1=(i+.72)/seg*Math.PI*2+t*.02*ring;
   ctx.fillStyle=cols[(i+ring)%cols.length];
   ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a0,a1); ctx.closePath(); ctx.fill();
  }
 }
 ctx.restore();
}
function toggleVK(){
 VK.on=!VK.on; vkSave();
 showToast(VK.on?'✝ VAMPIRE KILLER — the whip is yours':'Vampire Killer sealed away');
 if(G){addTrauma(.7,0,-1); if(VK.on)burst(GRID.cols/2,3,'#ffe6a8',70)}
 try{playTone(VK.on?880:220,.22,'triangle',.05)}catch(_){}
}
function initKonami(){
 const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
 let i=0;
 addEventListener('keydown',ev=>{
  const k=ev.key.length===1?ev.key.toLowerCase():ev.key;
  i=(k===seq[i])?i+1:(k===seq[0]?1:0);
  if(i===seq.length){i=0;toggleVK()}
 });
 // touch path: the crest/title responds to a rapid seven-tap
 const el=document.querySelector('#menu h1')||document.querySelector('#menu .title')||document.querySelector('#menu h2');
 if(el){let n=0,last=0;
  el.addEventListener('click',()=>{const t=Date.now();n=(t-last<900)?n+1:1;last=t;if(n>=7){n=0;toggleVK()}});
 }
}

/* ==========================================================================
   V32.4.2 — METAL GEAR SOLID HOMAGES
   Three presentation-only easter eggs, in the same spirit as the existing
   Vampire Killer/Konami homage. Nothing below reads or writes a combat value,
   a save-schema field, or a progression gate. All three degrade to no-ops if
   their host element is missing.
     1. Codec call    — dial 140.85 (type "14085", or triple-tap the weather
                        readout in battle).
     2. Alert         — the "!" spot marker and alert sting when a guardian
                        first notices you.
     3. Psycho Mantis — five quick taps on the Profile stat grid; he reads the
                        save file back to you, then moves the screen.
   ========================================================================== */
const MGS={frequency:'140.85',greetKey:'village.mgs.greeted',greeted:false,alertUntil:-1,alertX:0,alertY:0,typing:0};
try{MGS.greeted=localStorage.getItem(MGS.greetKey)==='1'}catch(_){}

const CODEC_CALLS=[
 {name:'COLONEL',face:'🎖️',lines:[
  'This is Colonel Campbell. The Village is holding — for now.',
  'Listen carefully. The road grows a little longer after every wave. That is by design.',
  'A tower alone is a tower wasted. Set them side by side and let them cover each other.',
  'I have every confidence in you. Campbell out.']},
 {name:'MEI LING',face:'📡',lines:[
  'Hey, it is Mei Ling. I saved your progress the moment you touched that card.',
  'There is an old Chinese saying: a road of a thousand tiles begins with a single road piece.',
  'Do not hoard your Essence. A vial that is never emptied defends nothing.',
  'Good luck out there. Call me any time on '+MGS.frequency+'.']},
 {name:'OTACON',face:'🕶️',lines:[
  'Otacon here. I have been reading the Eclipse telemetry all night.',
  'Those Golem forms? They are not separate bosses. It is one thing, rebuilding itself.',
  'Whatever you do, do not let it reach the gate. I have run the numbers. Twice.',
  'Sorry. I always talk too much when I am nervous.']},
 {name:'MASTER MILLER',face:'🕶️',lines:[
  'Miller. You are burning daylight and there is precious little of it left.',
  'Survival is not the strongest deck. It is the deck that adapts.',
  'Eat something. Sleep. The Village will still be here in the morning.',
  'That is all. Keep your eyes open.']}
];

function codecRoot(){
 let el=document.getElementById('codecOverlay');
 if(el)return el;
 el=document.createElement('div');
 el.id='codecOverlay';el.className='codec-overlay hidden';
 el.setAttribute('role','dialog');el.setAttribute('aria-label','Codec call');
 el.innerHTML=`<div class="codec-frame">
   <div class="codec-freq"><span>FREQ</span><b id="codecFreq">${MGS.frequency}</b></div>
   <div class="codec-screens">
     <div class="codec-face" id="codecFaceL">🗡️</div>
     <div class="codec-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
     <div class="codec-face" id="codecFaceR">📡</div>
   </div>
   <div class="codec-text"><b id="codecName">CODEC</b><p id="codecLine"></p></div>
   <div class="codec-hint">TAP TO CONTINUE</div>
 </div>`;
 document.body.appendChild(el);
 el.addEventListener('click',()=>codecAdvance());
 return el;
}

function codecBeep(){try{playTone(1180,.05,'square',.03);setTimeout(()=>playTone(1480,.05,'square',.025),70)}catch(_){}}

let codecQueue=[],codecTimer=0,codecName='';
function openCodec(call,freq){
 const el=codecRoot();
 document.getElementById('codecFreq').textContent=freq||MGS.frequency;
 document.getElementById('codecFaceR').textContent=call.face;
 document.getElementById('codecName').textContent=call.name;
 codecName=call.name;codecQueue=[...call.lines];
 el.classList.remove('hidden');
 codecBeep();
 codecAdvance(true);
}
function codecAdvance(first){
 const el=document.getElementById('codecOverlay');if(!el)return;
 const p=document.getElementById('codecLine');
 clearInterval(codecTimer);
 if(!first&&p&&p.dataset.full&&p.textContent!==p.dataset.full){p.textContent=p.dataset.full;return}
 const next=codecQueue.shift();
 if(next===undefined){closeCodec();return}
 if(!first)codecBeep();
 p.dataset.full=next;p.textContent='';
 let i=0;
 codecTimer=setInterval(()=>{
  i++;p.textContent=next.slice(0,i);
  if(i>=next.length)clearInterval(codecTimer);
 },18);
}
function closeCodec(){
 clearInterval(codecTimer);
 document.getElementById('codecOverlay')?.classList.add('hidden');
}

function dialCodec(){
 if(!MGS.greeted){
  MGS.greeted=true;try{localStorage.setItem(MGS.greetKey,'1')}catch(_){}
  showToast('Kept you waiting, huh?');
 }
 openCodec(CODEC_CALLS[Math.floor(Math.random()*CODEC_CALLS.length)]);
}

function initCodec(){
 // keyboard: dial the frequency
 let dialed='';
 addEventListener('keydown',ev=>{
  if(ev.key==='Escape'){closeCodec();return}
  if(!/^[0-9.]$/.test(ev.key))return;
  dialed=(dialed+ev.key).slice(-5);
  if(dialed==='14085'){dialed='';dialCodec()}
 });
 // touch: triple-tap the weather readout during a hunt
 const el=$('#weatherTxt');
 if(el){let n=0,last=0;
  el.addEventListener('click',()=>{const t=Date.now();n=(t-last<800)?n+1:1;last=t;if(n>=3){n=0;dialCodec()}});
 }
}

/* --- 2. "!" alert ------------------------------------------------------- */
function mgsAlert(e){
 if(!G||!e)return;
 MGS.alertUntil=(G.time||0)+1.45;MGS.alertX=e.x;MGS.alertY=e.y;
 try{playTone(1560,.07,'square',.05);setTimeout(()=>playTone(1560,.09,'square',.045),110)}catch(_){}
}
function drawMgsAlert(){
 if(!G||G.time>MGS.alertUntil)return;
 const left=MGS.alertUntil-G.time,pop=Math.min(1,(1.45-left)*7),rise=(1-Math.min(1,left/1.45))*10;
 const x=MGS.alertX*64,y=MGS.alertY*64-64-rise;
 ctx.save();
 ctx.globalAlpha=Math.min(1,left*3.2);
 ctx.translate(x,y);ctx.scale(.7+pop*.45,.7+pop*.45);
 ctx.font='bold 46px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.lineWidth=6;ctx.strokeStyle='#160d12';ctx.strokeText('!',0,0);
 ctx.fillStyle='#ffe14d';ctx.fillText('!',0,0);
 ctx.restore();
}

/* --- 3. Psycho Mantis --------------------------------------------------- */
function mantisReading(){
 const s=save.stats||{};
 const owned=CARD_POOL.filter(c=>inv(c.id).copies>0);
 const favourite=[...owned].sort((a,b)=>inv(b.id).copies-inv(a.id).copies)[0];
 const hero=HEROES.find(h=>h.id===save.selectedHero)?.name||'a nameless hunter';
 const chapters=(save.campaign?.completed||[]).length;
 const lines=['I can read your mind.'];
 lines.push(`You have walked out of this Village ${s.runs||0} time${(s.runs||0)===1?'':'s'}. You came back ${s.wins||0} time${(s.wins||0)===1?'':'s'} a victor.`);
 if(favourite)lines.push(`You favour the ${favourite.name}. You keep ${inv(favourite.id).copies} of them. You did not think anyone was counting.`);
 lines.push(`You fight as ${hero}. You have closed ${chapters} road${chapters===1?'':'s'} and reached wave ${s.highestWave||save.bestWave||0}.`);
 if((save.favorites||[]).length)lines.push(`You marked ${save.favorites.length} card${save.favorites.length===1?'':'s'} as a favourite. Sentiment is a weakness.`);
 lines.push('Now. Put your device down on the table. Do not touch it.');
 lines.push('…impressive, is it not? I moved it with my mind.');
 return {name:'PSYCHO MANTIS',face:'🧠',lines};
}
function psychoMantis(){
 openCodec(mantisReading(),'MANTIS');
 const screen=$('#profileScreen');
 if(!screen)return;
 setTimeout(()=>{
  screen.classList.add('mgs-mantis-move');
  setTimeout(()=>screen.classList.remove('mgs-mantis-move'),1500);
 },5200);
}
function initPsychoMantis(){
 const grid=$('#profileGrid');if(!grid)return;
 let n=0,last=0;
 grid.addEventListener('click',()=>{
  const t=Date.now();n=(t-last<700)?n+1:1;last=t;
  if(n>=5){n=0;psychoMantis()}
 });
}


/* --- 4. "SHADOW? SHADOW?! SHAAAADOW!" ----------------------------------- *
 * The MGS game-over cry, over the defeat screen. Gated on having dialled the
 * codec at least once, so the eggs chain into each other rather than firing at
 * a player who has not found the first one.                                   */
function mgsGameOverCry(){
 if(!MGS.greeted)return;
 const host=UI.over;if(!host||host.classList.contains('hidden'))return;
 if(document.getElementById('mgsCry'))return;
 const cry=document.createElement('div');
 cry.id='mgsCry';cry.className='mgs-cry';
 cry.innerHTML='<b>SHADOW?</b><b>SHADOW?!</b><b>SHAAAADOW!</b>';
 host.appendChild(cry);
 const beat=[0,620,1320];
 beat.forEach((ms,i)=>battleDelay(()=>{
  cry.children[i]?.classList.add('show');
  try{playTone(300-i*55,.3+i*.12,'sawtooth',.05)}catch(_){}
 },ms,'defeat cry beat'));
 battleDelay(()=>cry.remove(),5200,'defeat cry cleanup');
}

/* --- 5. "METAL GEAR?!" -------------------------------------------------- *
 * The Golem's third form is a walking weapon platform rebuilding itself, which
 * is the exact double-take moment. Presentation only.                         */
function mgsMetalGear(e){
 if(!G||!e)return;
 showToast('METAL GEAR?!');
 floatText(e.x,e.y-1.1,'METAL GEAR?!','#ffe14d');
 mgsAlert(e);
 try{playTone(140,.34,'sawtooth',.055);setTimeout(()=>playTone(96,.5,'sawtooth',.05),330)}catch(_){}
}

/* --- 6. The Sorrow — the river of the dead ------------------------------ *
 * Every enemy you have ever discovered drifts upstream past you, counted. Five
 * quick taps on the Codex completion figure.                                  */
const SORROW_NAMES={skeleton:'Bone Soldier',wolf:'Night Wolf',bat:'Nightwing Bat',ghost:'Castle Ghost',
 armor:'Axe Armor',vampire:'Vampire Spawn',necromancer:'Grave Necromancer',golem:'Golem of Three Forms',
 ghoul:'Ravenous Ghoul',revenant:'Plague Revenant',gravelord:'Gravelord',watcher:'Pale Watcher',
 gazer:'Void Gazer',dreadeye:'Dread Eye'};
function openSorrowRiver(){
 if(document.getElementById('sorrowRiver'))return;
 const seen=Object.keys(save.discoveredEnemies||{}).filter(k=>save.discoveredEnemies[k]);
 const kills=Number(save.stats?.totalKills)||0;
 const el=document.createElement('div');
 el.id='sorrowRiver';el.className='sorrow-river';
 el.setAttribute('role','dialog');el.setAttribute('aria-label','The river of the dead');
 const souls=seen.length?seen:['skeleton'];
 el.innerHTML=`<div class="sorrow-stream">${souls.map((id,i)=>
   `<span style="--lane:${(i%7)};--delay:${(i*0.9).toFixed(2)}s">${SORROW_NAMES[id]||id}</span>`).join('')}</div>
  <div class="sorrow-copy">
    <b>THE SORROW</b>
    <p>You have taken ${kills.toLocaleString()} live${kills===1?'':'s'} from these roads.</p>
    <p>${souls.length} kind${souls.length===1?'':'s'} of the dead remember your face.</p>
    <small>Tap to leave the river.</small>
  </div>`;
 document.body.appendChild(el);
 try{playTone(70,1.6,'sine',.035)}catch(_){}
 const close=()=>{el.remove();document.removeEventListener('keydown',onKey)};
 const onKey=ev=>{if(ev.key==='Escape')close()};
 el.addEventListener('click',close);
 document.addEventListener('keydown',onKey);
 setTimeout(()=>{if(document.body.contains(el))close()},26000);
}
function initSorrowRiver(){
 const pct=$('#codexPct');if(!pct)return;
 let n=0,last=0;
 pct.addEventListener('click',()=>{
  const t=Date.now();n=(t-last<700)?n+1:1;last=t;
  if(n>=5){n=0;openSorrowRiver()}
 });
}

function initMetalGear(){
 try{initCodec()}catch(e){console.warn('Codec unavailable',e)}
 try{initPsychoMantis()}catch(e){console.warn('Mantis unavailable',e)}
 try{initSorrowRiver()}catch(e){console.warn('Sorrow unavailable',e)}
}
// V29.5 — Synergy visualisation. Mirrors synergyFor() for display only; a unit
// test asserts the two never disagree. Combat maths is untouched.
const SYNERGY_STYLE={
 holy:{tint:'#ffe9a8',label:'Holy Infusion'},
 freeze:{tint:'#9fe4ff',label:'Frost Channel'},
 guardian:{tint:'#b9ffb0',label:'Guardian Watch'},
 daggerholy:{tint:'#ffe9a8',label:'Blessed Blades'},
 clockholy:{tint:'#e2c8ff',label:'Sanctified Time'},
 axebone:{tint:'#ff9a5c',label:'Bone Ignition'},
 whiprosary:{tint:'#ffd0e6',label:'Rosary Cadence'}
};
function synergyLinksFor(t){
 const out=[]; if(!G||!G.towers||t.supportOnly)return out;
 for(const n of G.towers){
  if(n===t)continue;
  if(Math.abs(n.x-t.x)+Math.abs(n.y-t.y)!==1)continue;
  if(n.supportOnly){
   if(n.id==='holy')    out.push({n,key:'holy',    damage:1.42,rate:1.22,range:1,holy:true, ignite:false});
   if(n.id==='freeze')  out.push({n,key:'freeze',  damage:1,   rate:1.30,range:1.14,holy:false,ignite:false});
   if(n.id==='guardian')out.push({n,key:'guardian',damage:1.22,rate:1.18,range:1,holy:false,ignite:false});
   continue;
  }
  if(t.id==='dagger'&&n.id==='holy') out.push({n,key:'daggerholy',damage:1.22,rate:1,range:1,   holy:true, ignite:false});
  if(t.id==='clock' &&n.id==='holy') out.push({n,key:'clockholy', damage:1.12,rate:1,range:1.18,holy:false,ignite:false});
  if(t.id==='axe'   &&n.id==='bone') out.push({n,key:'axebone',   damage:1.2, rate:1,range:1,   holy:false,ignite:true});
  if(t.id==='whip'  &&n.id==='rosary')out.push({n,key:'whiprosary',damage:1,  rate:1.18,range:1,holy:false,ignite:false});
 }
 return out;
}
function synergyTotals(t){
 let damage=1,range=1,rate=1,holy=false,ignite=false;
 for(const l of synergyLinksFor(t)){damage*=l.damage;range*=l.range;rate*=l.rate;holy=holy||l.holy;ignite=ignite||l.ignite}
 return {damage,range,rate,holy,ignite};
}
function synergyExplain(t){
 const links=synergyLinksFor(t); if(!links.length)return null;
 const tot=synergyTotals(t), pct=v=>Math.round((v-1)*100);
 const parts=[];
 if(tot.damage!==1)parts.push(`+${pct(tot.damage)}% damage`);
 if(tot.rate!==1)  parts.push(`+${pct(tot.rate)}% fire rate`);
 if(tot.range!==1) parts.push(`+${pct(tot.range)}% range`);
 if(tot.holy)      parts.push('attacks count as holy');
 if(tot.ignite)    parts.push('attacks ignite');
 return {links,summary:parts.join(' · '),
         names:links.map(l=>(SYNERGY_STYLE[l.key]||{}).label||'Synergy')};
}
function drawSynergyLinks(){
 if(!G||!G.towers)return;
 const t0=G.time||0;
 ctx.save(); ctx.globalCompositeOperation='screen'; ctx.lineCap='round';
 for(const t of G.towers){
  for(const l of synergyLinksFor(t)){
   const st=SYNERGY_STYLE[l.key]||{tint:'#ffe58a'};
   const ax=(t.x+.5)*64, ay=(t.y+.5)*64, bx=(l.n.x+.5)*64, by=(l.n.y+.5)*64;
   const pulse=.45+.30*Math.sin(t0*3.2+(t.x+t.y)*.9);
   ctx.globalAlpha=pulse*.75; ctx.strokeStyle=st.tint; ctx.lineWidth=3.4;
   ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
   ctx.globalAlpha=pulse*.35; ctx.lineWidth=8;
   ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
   // a mote riding the link shows which way the buff flows
   const k=(t0*.55+(t.x*.31+t.y*.17))%1, mx=bx+(ax-bx)*k, my=by+(ay-by)*k;
   ctx.globalAlpha=.85; ctx.fillStyle=st.tint;
   ctx.beginPath(); ctx.arc(mx,my,2.6+1.2*Math.sin(t0*7),0,Math.PI*2); ctx.fill();
  }
 }
 // a soft crown on every tower currently being buffed
 for(const t of G.towers){
  const links=synergyLinksFor(t); if(!links.length)continue;
  const st=SYNERGY_STYLE[links[0].key]||{tint:'#ffe58a'};
  const x=(t.x+.5)*64,y=(t.y+.5)*64,r=26+2.5*Math.sin(t0*4+t.x);
  ctx.globalAlpha=.22+.10*Math.sin(t0*4+t.y);
  ctx.strokeStyle=st.tint; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
 }
 ctx.restore();
}
// V29.5 — battlefield juice.
function towerFireFX(t,e){
 if(!G)return;
 t.flashT=.10;
 const dx=(e?e.x:t.x)-t.x, dy=(e?e.y:t.y+1)-t.y, m=Math.hypot(dx,dy)||1;
 t.recX=-dx/m; t.recY=-dy/m; t.recoil=.13;
 const syn=synergyLinksFor(t).length;
 sparks(t.x+.5,t.y+.35,dx/m,dy/m,syn?'#ffe9a8':'#ffd79a',syn?5:3,.5);
}
function updateTowerFX(dt){
 if(!G||!G.towers)return;
 for(const t of G.towers){
  if(t.flashT)t.flashT=Math.max(0,t.flashT-dt);
  if(t.recoil)t.recoil=Math.max(0,t.recoil-dt*2.4);
 }
 G.gateHurt=Math.max(0,(G.gateHurt||0)-dt*1.6);
}
function drawGateVignette(){
 if(!G||!(G.gateHurt>0))return;
 const a=Math.min(.5,G.gateHurt*.55);
 const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.max(W,H)*.72);
 g.addColorStop(0,'rgba(120,0,20,0)'); g.addColorStop(1,`rgba(150,10,28,${a})`);
 ctx.save(); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore();
}
// keep damage numbers from stacking into an unreadable pile
function floaterSlot(x,y){
 if(!G||!G.floaters)return 0;
 let n=0;
 for(const f of G.floaters){
  if(f.life>.55&&Math.abs(f.x-x)<.55&&Math.abs(f.y-y)<.55)n++;
 }
 return n;
}
function drawCorpses(){
 if(!G||!G.corpses)return;
 for(const c of G.corpses){
  const cols=sheetCols(c.img,c.golem?128:64),dur=corpseLife(c);
  const frame=Math.min(cols-1,Math.floor(c.t*ENEMY_ANIM.deathFps));
  const alpha=c.t<=dur?1:Math.max(0,1-(c.t-dur)/ENEMY_ANIM.corpseFade);
  (c.golem?drawGolemSprite:drawSheetSprite)(c.img,c.x*64,c.y*64,frame,directionRow(c.face),c.size,alpha);
 }
}
function drawSheetSprite(img,x,y,frame,row,drawSize=78,alpha=1){if(!img||!img.complete||img.naturalWidth<64||img.naturalHeight<64)return false;const sw=64,sh=64,cols=Math.max(1,Math.floor(img.naturalWidth/sw)),rows=Math.max(1,Math.floor(img.naturalHeight/sh));frame=((frame%cols)+cols)%cols;row=Math.max(0,Math.min(rows-1,row));const px=Math.round(x-drawSize/2),py=Math.round(y-drawSize*.62),size=Math.round(drawSize);ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,frame*sw,row*sh,sw,sh,px,py,size,size);ctx.restore();return true}
function drawGolemSprite(img,x,y,frame,row,drawSize=152,alpha=1){if(!img||!img.complete||img.naturalWidth<128||img.naturalHeight<128)return false;const sw=128,sh=128,cols=Math.max(1,Math.floor(img.naturalWidth/sw)),rows=Math.max(1,Math.floor(img.naturalHeight/sh));frame=((frame%cols)+cols)%cols;row=Math.max(0,Math.min(rows-1,row));const px=Math.round(x-drawSize/2),py=Math.round(y-drawSize*.62),size=Math.round(drawSize);ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,frame*sw,row*sh,sw,sh,px,py,size,size);ctx.restore();return true}
// V32.4.2 — sprite preloading is split by when the player can actually meet a
// sheet. The old code fired every family at module-evaluation time: ~2.07 MB of
// sheets competing with first paint, of which ~0.87 MB belonged to the deep
// roster that only appears from chapter 11. Chapters 1-10 need Shadow, the
// starting bestiary and the Golem forms, so those stay eager; the rest is warmed
// once the browser is idle. spriteImage() already fetches on demand, so nothing
// depends on the warm-up having finished.
const EARLY_ENEMY_TYPES=['skeleton','wolf','bat','ghost','armor','vampire','necromancer'];
const ANIM_ACTIONS=['Walk','Attack','Hurt','Death','Idle'];
Object.values(SHADOW_LEVELS).forEach((d)=>['Walk','Idle','attack'].forEach((a)=>spriteImage(`${d.root}/${d.prefix}_${a}_with_shadow.png`)));
EARLY_ENEMY_TYPES.forEach(t=>ANIM_ACTIONS.forEach(a=>spriteImage(enemyAsset(t,a))));
[1,2,3].forEach(form=>['Walk','Idle','Attack','Death'].forEach(action=>spriteImage(golemAsset(form,action))));
function warmDeepRoster(){
 Object.keys(ENEMY_FAMILY).filter(t=>!EARLY_ENEMY_TYPES.includes(t))
  .forEach(t=>ANIM_ACTIONS.forEach(a=>spriteImage(enemyAsset(t,a))));
}
(window.requestIdleCallback||(fn=>setTimeout(fn,2500)))(warmDeepRoster,{timeout:8000});

const UI={menu:$('#menu'),deck:$('#deckScreen'),choices:$('#choices'),over:$('#gameOver'),hud:$('#hud'),hand:$('#hand'),toast:$('#toast'),tutorial:$('#tutorial')};
let DPR=1,W=0,H=0,scale=1,ox=0,oy=0;
const CAMERA_LIMITS={minZoom:.72,maxZoom:2.65,margin:24};
const GRID={cols:16,rows:18,tile:64};
const CATHEDRAL={gateX:CATHEDRAL_ENTRANCE.gateX,gateY:CATHEDRAL_ENTRANCE.gateY,drawX:CATHEDRAL_ENTRANCE.gateX*64-61,drawY:-18};
const ROAD_GROWTH={startingTiles:6,maxTiles:54,safeMargin:1,focusZoom:1.22};
const CARD_POOL=[
 {id:'whip',name:'Whip Tower',type:'tower',icon:'⛓️',cost:34,desc:'Fast chained lashes. Strong general defense.',rarity:'Common',range:2.3,damage:14,rate:.7,color:'#d8c3a5'},
 {id:'holy',name:'Holy Water Infusion',type:'support',icon:'💧',cost:42,desc:'Consecrates a defense with holy splash and lingering damage.',rarity:'Rare',range:2.1,damage:10,rate:1.05,color:'#8edcff',aoe:.5,burn:5},
 {id:'dagger',name:'Dagger Tower',type:'tower',icon:'🗡️',cost:27,desc:'Fires a piercing straight-line dagger every 3 seconds, striking every enemy in its lane.',rarity:'Common',range:3,damage:8,rate:3,color:'#d9ecff',lanePierce:true},
 {id:'axe',name:'Axe Tower',type:'tower',icon:'🪓',cost:48,desc:'Heavy arcing strikes through armor.',rarity:'Rare',range:2.8,damage:26,rate:1.25,color:'#b8a0a0',pierce:2},
 {id:'cross',name:'Cross Tower',type:'tower',icon:'✝️',cost:56,desc:'Returning holy blades hit twice.',rarity:'Epic',range:3.0,damage:17,rate:.9,color:'#ffe18b',returning:true},
 {id:'clock',name:'Clock Tower',type:'tower',icon:'🕰️',cost:62,desc:'Slows nearby monsters in warped time.',rarity:'Epic',range:2.3,damage:4,rate:1.4,color:'#b98cff',slow:.55},
 {id:'bone',name:'Bone Pillar',type:'tower',icon:'🦴',cost:48,desc:'Twin fireballs punish clustered enemies.',rarity:'Rare',range:2.4,damage:23,rate:.8,color:'#f1c06b'},
 {id:'familiar',name:'Familiar Roost',type:'tower',icon:'🦇',cost:58,desc:'Summons bats that seek distant targets.',rarity:'Epic',range:3.1,damage:18,rate:.55,color:'#9f7bd2'},
 {id:'silver',name:'Silver Cannon',type:'tower',icon:'💥',cost:65,desc:'Slow explosive shot with enormous impact.',rarity:'Legendary',range:3.3,damage:60,rate:1.8,color:'#f5f2dc',aoe:.55},
 {id:'rosary',name:'Rosary Shrine',type:'tower',icon:'📿',cost:52,desc:'Sacred bolts weaken the front line.',rarity:'Rare',range:2.4,damage:12,rate:1.05,color:'#f3d59b',slow:.82},
 {id:'garlic',name:'Garlic Tower',type:'tower',icon:'🧄',cost:46,desc:'A pungent ward that damages and slows every undead creature inside its aura.',rarity:'Rare',range:2.05,damage:7,rate:.72,color:'#d9efad',slow:.78,aoe:.36},
 {id:'scripture',name:'Tower of the Living Word',type:'tower',icon:'📖',cost:60,essenceCost:18,desc:'Orbiting Bibles strike every undead creature that enters their sacred field. Each tower level adds another independently attacking Bible.',rarity:'Legendary',range:2.75,damage:13,rate:.82,color:'#ffe58a',holy:true},
 {id:'waterSkill',name:'Holy Water Barrage',type:'skill',icon:'🧪',cost:25,desc:'Calls blue-white sacred rain over a targeted area.',rarity:'Rare',cool:9},
 {id:'crossSkill',name:'Cross Storm',type:'skill',icon:'✨',cost:34,desc:'Holy crosses sweep the entire road.',rarity:'Epic',cool:14},
 {id:'freeze',name:'Chrono Sigil',type:'support',icon:'⏱️',cost:30,desc:'Attach to a defense tower: attacks slow enemies.',rarity:'Epic',cool:15},
 {id:'summon',name:'Eclipse Rally',type:'skill',icon:'⚔️',cost:40,desc:'Hero gains frenzy and heals the village.',rarity:'Legendary',cool:18},
 {id:'axeRain',name:'Axe Rain',type:'skill',icon:'🌪️',cost:36,desc:'Heavy axes strike every enemy.',rarity:'Rare',cool:12},
 {id:'grandCross',name:'Grand Cross',type:'skill',icon:'☦️',cost:55,desc:'A devastating holy blast across the map.',rarity:'Legendary',cool:20},
 {id:'guardian',name:'Guardian Ward',type:'support',icon:'👼',cost:45,desc:'Attach to a defense tower: grants protective healing every wave.',rarity:'Epic',cool:16},
 {id:'soulPact',name:'Relic Edge',type:'hero',icon:'🗡️',cost:0,desc:'Hero damage +25% for this run.',rarity:'Rare',heroStat:'damage'},
 {id:'sharpen',name:'Quickened Reflexes',type:'hero',icon:'⚡',cost:0,desc:'Hero attacks 18% faster for this run.',rarity:'Epic',heroStat:'rate'},
 {id:'fortify',name:"Hunter’s Reach",type:'hero',icon:'⛓️',cost:0,desc:'Hero attack range +20% for this run.',rarity:'Rare',heroStat:'range'},
 {id:'moonBlessing',name:'Eclipse Consecration',type:'hero',icon:'✨',cost:0,desc:'Hero attacks become holy and can critically strike.',rarity:'Legendary',heroStat:'holy'},
 ...SUPPORT_REGISTRY.map(s=>({
  id:s.id,name:s.name,type:'support',icon:s.icon,cost:44,desc:s.description,
  rarity:s.rarity,range:1.5,damage:0,rate:1.2,color:'#bca2d8',supportEffect:s.effect
 })),
 ...NEW_CORE_TOWERS
];

const ROAD_PIECES=[
 {id:'roadSingle',name:'Single Road Tile',type:'roadpiece',shape:'single',icon:'⬛',desc:'Place one road block from the road endpoint.',system:true},
 {id:'roadL',name:'L Road Piece',type:'roadpiece',shape:'L',icon:'◱',desc:'A three-block L-shaped road piece. Rotate before placing.',system:true},
 {id:'roadJ',name:'Mirrored L Road',type:'roadpiece',shape:'J',icon:'◲',desc:'A mirrored three-block L road. Rotate before placing.',system:true},
 {id:'roadS',name:'S Road Piece',type:'roadpiece',shape:'S',icon:'〽️',desc:'A three-block stepped road piece. Rotate before placing.',system:true}
];
const ROAD_SYSTEM={id:'roadSystem',name:'Road System',type:'roadpiece',icon:'🛣️',desc:'The Eclipse reveals a single, L, mirrored-L, or S road piece.',system:true,hiddenSystem:true};

const MAPS=[
 {id:'cemetery',name:'Forgotten Cemetery',ground:['#17121b','#09080d'],accent:'#7da6a1',sky:'#161020'},
 {id:'forest',name:'Moonlit Forest',ground:['#101a19','#070b0c'],accent:'#70a596',sky:'#101827'},
 {id:'village',name:'Ruined Village',ground:['#211713','#0c0908'],accent:'#c1774e',sky:'#26131a'},
 {id:'cathedral',name:'Frozen Cathedral',ground:['#17202b','#090d14'],accent:'#9ac7df',sky:'#17233b'},
 {id:'marsh',name:'Crimson Marsh',ground:['#26151d','#0e090c'],accent:'#c45c72',sky:'#27101d'},
 {id:'walls',name:'Blackstone Walls',ground:['#1c1d22','#090a0d'],accent:'#9da2aa',sky:'#151725'},
 {id:'temple',name:'Moon Temple',ground:['#141a2b','#070a12'],accent:'#8ca7e8',sky:'#101936'},
 {id:'castle',name:'Vampire Castle',ground:['#24121b','#0a0609'],accent:'#d0526c',sky:'#260b18'},
 {id:'harbor',name:'The Drowned Harbor',ground:['#102027','#060b0f'],accent:'#5ea8b9',sky:'#101b28'},
 {id:'monastery',name:'The Ashen Monastery',ground:['#211b19','#0d0908'],accent:'#c77f55',sky:'#28151a'},
 {id:'underkingdom',name:'The Underkingdom',ground:['#17131f','#08060b'],accent:'#9a72cf',sky:'#170f26'},
 {id:'sunlessvault',name:'The Sunless Vault',ground:['#1a1520','#0a080d'],accent:'#8f7bb0',sky:'#140f1c'},{id:'catacombs',name:'Rotting Catacombs',ground:['#1d1a14','#0b0a07'],accent:'#9aa86b',sky:'#161409'},{id:'hollowcathedral',name:'The Hollow Cathedral',ground:['#141c22','#080c10'],accent:'#7fb0c4',sky:'#101a26'},{id:'weepingspire',name:'The Weeping Spire',ground:['#221624','#0c080e'],accent:'#c07ab8',sky:'#1b0f20'},{id:'bonecathedral',name:'The Bone Cathedral',ground:['#211e19','#0c0b09'],accent:'#d6ccae',sky:'#191510'},{id:'observatory',name:'Crimson Observatory',ground:['#25141a','#0d0709'],accent:'#e0637a',sky:'#200e16'},{id:'shatteredmoon',name:'The Shattered Moon',ground:['#161b28','#080a10'],accent:'#8fa6e0',sky:'#111629'},{id:'abyssgate',name:'The Abyssal Gate',ground:['#120f1a','#060509'],accent:'#a05cff',sky:'#0d0916'},{id:'throne',name:'The Eclipse Throne',ground:['#251018','#090407'],accent:'#e05b72',sky:'#2b0715'}
];

const WEATHERS=[
 {id:'clear',name:'Clear Night',desc:'No combat modifier.'},
 {id:'rain',name:'Thunder Rain',desc:'Fire damage -20%; lightning and holy damage +18%.'},
 {id:'fog',name:'Grave Fog',desc:'Tower range -12%; enemy rewards +20%.'},
 {id:'blood',name:'Blood Moon',desc:'Enemies +18% HP; shared Battle XP +40%; rewards +30%.'}
];
const RELICS=RELIC_REGISTRY;
const relicEffect=(key,relic=G?.relic)=>Number(relic?.effect?.[key])||0;
// A private copy: the campaign rules below mutate chapters and their bosses.
const CHAPTERS=CAMPAIGN_CHAPTERS.map(chapter=>({...chapter,boss:{...chapter.boss}}));
// Campaign rewards consume registry order; relic content and effects live in
// the Ascension registry rather than in battle-system branches.
for(const chapter of CHAPTERS)chapter.relic=RELIC_REGISTRY[chapter.number-1]?.id||null;
// V28.0: The first ten campaign levels form the Golem arc. Existing map, wave, reward, and unlock data remain intact.
for(const chapter of CHAPTERS.slice(0,10)){chapter.boss={...chapter.boss,id:'golem',name:chapter.number===10?'Golem of Three Forms':(chapter.number>=5?'Awakened Golem':'Stone Golem'),power:chapter.number===10?'Transforms twice; its final form destroys one tower every six seconds.':chapter.number>=5?'Remains in its awakened second form.':'Remains in its first stone form.'};}
for(const chapter of CHAPTERS)chapter.boss.hp=Math.max(1,Math.round(chapter.boss.hp*.90));
const RARITIES=[
 {id:'common',name:'Common',mult:1,color:'#8c8c95'},
 {id:'good',name:'Uncommon',mult:1.04,color:'#58ba62'},
 {id:'rare',name:'Rare',mult:1.09,color:'#4f87e8'},
 {id:'epic',name:'Epic',mult:1.15,color:'#9b5de5'},
 {id:'epicplus',name:'Epic+',mult:1.22,color:'#b06ae8'},
 {id:'legendary',name:'Legendary',mult:1.30,color:'#e0b54f'},
 {id:'legendaryplus',name:'Legendary+',mult:1.39,color:'#e0b54f'},
 {id:'mythic',name:'Mythic Rare',mult:1.50,color:'#d73138'}
];
const HEROES=[
 {id:'warden',name:'Shadow',icon:'⚔️',desc:'Balanced hunter. +10% tower damage.',bonus:{tower:1.10}},
 {id:'alchemist',name:'Eclipse Alchemist',icon:'⚗️',desc:'Support effects are 30% stronger.',bonus:{support:1.30}},
 {id:'engineer',name:'Grave Engineer',icon:'⚙️',desc:'Placed defenses begin with bonus XP.',bonus:{xp:2}},
 {id:'guardian',name:'Last Guardian',icon:'🛡️',desc:'The keep begins with +8 health.',bonus:{hp:8}},
 {id:'arcanist',name:'Veil Arcanist',icon:'🔮',desc:'Road pity activates one draft sooner.',bonus:{roadPity:1}},
 {id:'beastmaster',name:'Night Beastmaster',icon:'🐺',desc:'Familiar defenses deal +35% damage.',bonus:{familiar:1.35}}
];
const KEEP_UPGRADES=[
 {id:'walls',name:'Reinforced Keep',desc:'+1 starting gate health per rank.',max:10,cost:20},
 {id:'souls',name:'Soul Reserve',desc:'+6 starting souls per rank.',max:10,cost:18},
 {id:'hunter',name:'Hunter Training',desc:'+3% permanent hero damage per rank.',max:10,cost:25},
 {id:'fortune',name:'Relic Fortune',desc:'+0.15% card-drop chance per rank.',max:10,cost:30}
];
const KINGDOM_BUILDINGS=[
 {id:'forge',name:'Royal Forge',icon:'⚒️',desc:'Improves all tower damage by 2% per level.',max:5,cost:35},
 {id:'chapel',name:'Moon Chapel',icon:'⛪',desc:'Adds 1 starting gate health per level.',max:5,cost:30},
 {id:'tavern',name:'Hunter Tavern',icon:'🍺',desc:'Adds 5 starting souls per level.',max:5,cost:28},
 {id:'library',name:'Eclipse Library',icon:'📚',desc:'Heroes gain 3% damage per level.',max:5,cost:40},
 {id:'market',name:'Night Market',icon:'🏪',desc:'Increases enemy rewards by 3% per level.',max:5,cost:32},
 {id:'museum',name:'Relic Museum',icon:'🏛️',desc:'Relic effects gain 4% strength per level.',max:5,cost:45}
];
const ENEMY_DECREE_GOALS=[100,500,1000,5000,10000,20000,50000,100000,250000,500000,1000000];
const decreeSeries=(key,label,goals,value,rewardScale=1)=>goals.map((goal,index)=>({
 id:`${key}-${goal}`,category:label,name:`${label} ${index+1}`,desc:`Reach ${goal.toLocaleString()} ${label.toLowerCase()}.`,
 goal,reward:Math.max(10,Math.round((12+index*8)*rewardScale)),value
}));
const totalHeroLevels=()=>Object.values(save.heroLevels||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
const totalFamiliarLevels=()=>Object.values(save.familiars?.progress||{}).reduce((sum,state)=>sum+Math.max(1,Number(state?.level)||1),0);
const totalOwnedCards=()=>Object.values(save.inventory||{}).reduce((sum,item)=>sum+Math.max(0,Number(item?.copies)||0),0);
const totalBuildings=()=>{const village=villageBuildingCounts();return Object.values(save.kingdom?.buildings||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0)+Object.values(village).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0)};
const villageProgressScore=()=>save.campaign.completed.length+(save.villageProgression?.researched?.length||0)+totalBuildings();
const ACHIEVEMENTS=[
 ...decreeSeries('enemies','Enemies Defeated',ENEMY_DECREE_GOALS,()=>save.stats.totalKills,1.2),
 ...decreeSeries('wave','Highest Wave',[5,10,15,20,30,50,75,100,250,500,1000],()=>save.stats.highestWave),
 ...decreeSeries('hunter-levels','Hunter Levels',[5,10,20,30,40,50],totalHeroLevels),
 ...decreeSeries('jp','Job Points',[1,5,10,20,30,50,100],()=>save.stats.jpEarned),
 ...decreeSeries('cards','Cards Recovered',[5,10,25,50,100,250,500,1000],totalOwnedCards),
 ...decreeSeries('gold','Gold Earned',ENEMY_DECREE_GOALS,()=>save.stats.goldEarned),
 ...decreeSeries('essence','Blood Essence Earned',ENEMY_DECREE_GOALS,()=>save.stats.bloodEssenceEarned,1.2),
 ...decreeSeries('bosses','Bosses Defeated',[1,5,10,25,50,100,250,500,1000],()=>save.stats.bosses,1.3),
 ...decreeSeries('buildings','Buildings Raised',[1,5,10,20,30,50,100],totalBuildings),
 ...decreeSeries('tower-merges','Tower Merges',[1,10,25,50,100,250,500,1000],()=>save.stats.towerMerges),
 ...decreeSeries('tower-placement','Tower Placements',[10,50,100,500,1000,5000,10000,20000,50000,100000],()=>save.stats.towersPlaced),
 ...decreeSeries('relics','Relics Recovered',[1,5,10,15,20],()=>save.unlockedRelics.length,1.4),
 ...decreeSeries('familiars','Familiar Levels',[5,10,20,40,60,80,100],totalFamiliarLevels),
 ...decreeSeries('village','Village Progress',[1,5,10,20,30,50,75,100],villageProgressScore),
 ...decreeSeries('perfect','Perfect Victories',[1,5,10,25,50,100,250,500],()=>save.stats.perfectVictories,1.5)
];
const HIDDEN_ACHIEVEMENTS=[
 {id:'hidden-vampire-killer',name:'Bloodline Remembered',desc:'An ancient command awakened the night.',reward:75,complete:()=>VK.on,cosmetic:'dogTag'},
 {id:'hidden-codec',name:'The Frequency',desc:'A forbidden transmission reached the Village.',reward:75,complete:()=>MGS.greeted,cosmetic:'dogTag'}
];
const DEFAULT_DECK=['whip','holy','dagger','waterSkill','freeze','crossSkill'];
const ESSENCE_COSTS={dagger:5,whip:7,holy:8,freeze:8,guardian:9,garlic:7,axe:10,cross:11,clock:11,bone:10,familiar:12,rosary:10,silver:15,scripture:18,waterSkill:8,crossSkill:11,summon:12,axeRain:10,grandCross:16};
const HERO_GROUND_DEFENSES=[
 {id:'spikeTrap',name:'Road Spikes',type:'trap',icon:'🔺',rarity:'common',essenceCost:4,desc:'Repeatedly wounds enemies crossing the tile.',damage:11,rate:.55,color:'#b9a27f',effect:'damage'},
 {id:'oilTrap',name:'Grave Oil',type:'trap',icon:'🛢️',rarity:'rare',essenceCost:5,desc:'Slows enemies and can ignite them.',damage:3,rate:.75,slow:.58,color:'#8f7354',effect:'oil'},
 {id:'bearTrap',name:'Iron Bear Trap',type:'trap',icon:'🪤',rarity:'rare',essenceCost:6,desc:'Snaps shut for heavy damage and briefly roots its victim.',damage:25,rate:1.45,root:1.1,color:'#b98c60',effect:'root'},
 {id:'frostRune',name:'Frost Rune',type:'trap',icon:'❄️',rarity:'epic',essenceCost:7,desc:'Freezes and damages every enemy standing on the rune.',damage:8,rate:.9,slow:.38,color:'#7bc9ff',effect:'frost'},
 {id:'poisonFog',name:'Poison Fog',type:'trap',icon:'☠️',rarity:'epic',essenceCost:7,desc:'Poisons enemies over time as they cross the cursed mist.',damage:5,rate:.65,color:'#87b94d',effect:'poison'},
 {id:'holyBanner',name:'Holy Banner',type:'trap',icon:'🚩',rarity:'legendary',essenceCost:8,desc:'Marks enemies so nearby defenses deal increased damage.',damage:2,rate:.8,color:'#f3d47a',effect:'vulnerable'},
 {id:'watchBell',name:'Watch Bell',type:'trap',icon:'🔔',rarity:'rare',essenceCost:6,desc:'Rings on contact, briefly slowing every enemy on the road.',damage:1,rate:1.2,slow:.68,color:'#d8b95c',effect:'bell'},
 {id:'shadowMine',name:'Shadow Mine',type:'trap',icon:'🌑',rarity:'legendary',essenceCost:9,desc:'Detonates in a wide burst, then slowly rearms.',damage:42,rate:2.4,color:'#9a67d7',effect:'blast'},
 {id:'soulLantern',name:'Soul Lantern',type:'trap',icon:'🏮',rarity:'epic',essenceCost:7,desc:'Burns nearby enemies and restores a sliver of gate health.',damage:7,rate:1.0,color:'#ff9d59',effect:'heal'}
];
function essenceCost(c){return c?.essenceCost??ESSENCE_COSTS[c?.id]??Math.max(4,Math.round((c?.cost||30)/5));}
const CHAPTER_CARD_UNLOCKS={
 // V32.1 — the withheld traps, garlic and scripture now arrive across the
 // campaign instead of all being handed over on the first launch.
 cemetery:['axe','crossbow','bone','garlic','bearTrap'],
 forest:['ballista','rosary','guardian','frostRune'],
 village:['arcane','cross','axeRain','poisonFog'],
 cathedral:['clock','soulPact','scripture'],
 marsh:['familiar','sharpen','holyBanner'],
 walls:['silver','fortify','watchBell'],
 temple:['summon','moonBlessing','shadowMine'],
 castle:['grandCross','soulLantern'],
 harbor:[],monastery:[],underkingdom:[],throne:[]
};
for(const support of SUPPORT_REGISTRY){if(support.unlockChapter)(CHAPTER_CARD_UNLOCKS[support.unlockChapter]||=[]).push(support.id)}
const unlockChapterForCard=id=>CHAPTERS.find(ch=>(CHAPTER_CARD_UNLOCKS[ch.id]||[]).includes(id));
const progressionUnlockedIds=completed=>{const ids=new Set(DEFAULT_DECK);for(const chapterId of completed||[])for(const id of CHAPTER_CARD_UNLOCKS[chapterId]||[])ids.add(id);return [...ids]};

// V32.0 — campaign-driven Village progression backbone.
function villageCompletedStage(){return Math.max(0,...(save.campaign?.completed||[]).map(id=>CHAPTERS.find(c=>c.id===id)?.number||0));}
function researchedVillageBuildings(){const out=new Set(VILLAGE_STARTER_BUILDINGS);for(const id of save.villageProgression?.researched||[]){const r=VILLAGE_RESEARCH.find(x=>x.id===id);for(const b of r?.unlocks||[])out.add(b)}return out;}
function villageBuildingUnlocked(id){return researchedVillageBuildings().has(id)}
function villageChronicle(text,type='milestone'){
 const log=save.villageProgression.chronicle;
 if(log.some(entry=>entry.text===text))return false;
 log.unshift({text,type,at:Date.now(),stage:villageCompletedStage()});save.villageProgression.chronicle=log.slice(0,80);return true;
}
function availableVillageResearch(){const stage=villageCompletedStage();return VILLAGE_RESEARCH.filter(r=>stage>=r.requiresStage&&!save.villageProgression.researched.includes(r.id)&&( !r.artifact||save.villageProgression.artifacts.includes(r.artifact)));}
function villageBattleBonuses(){const c=villageBuildingCounts();const n=id=>Number(c[id]||0);return {towerDamage:1+n('blacksmith')*.04+n('armory')*.05,heroDamage:1+n('library')*.03,gateHp:n('watchtower')+n('barracks')*2+n('chapel'),startingGold:n('market')*5+n('tavern')*3,reward:1+n('market')*.03};}

const STORAGE={
  get(key){try{return window.localStorage?.getItem(key)??null}catch(err){console.warn('Storage unavailable; using session memory.',err);return null}},
  set(key,value){try{window.localStorage?.setItem(key,value);return true}catch(err){console.warn('Could not save progress.',err);return false}},
  remove(key){try{window.localStorage?.removeItem(key)}catch(err){console.warn('Could not clear progress.',err)}}
};
let loadedSave=null;
// Quarantine rather than discard. A save that fails to parse, or that parses to
// something that is not a plain object, used to be dropped on the floor: the
// player silently started a new game and the very next saveProgress() wrote
// over the damaged original, making recovery impossible. Copy the raw text
// aside first so a support export can still reach it.
function quarantineDamagedSave(reason,raw){
 if(typeof raw!=='string'||!raw)return;
 const key=`village.saveRecovery.damaged.${Date.now()}`;
 try{
  STORAGE.set(key,JSON.stringify({format:'the-village-damaged-save',reason,capturedAt:new Date().toISOString(),gameVersion:ASCENSION_VERSION,raw}));
  // Keep only the three most recent so a repeatedly failing boot cannot fill the
  // storage quota and start breaking the writes that still work.
  const quarantined=Object.keys(localStorage).filter(k=>k.startsWith('village.saveRecovery.damaged.')).sort();
  for(const stale of quarantined.slice(0,Math.max(0,quarantined.length-3)))STORAGE.remove(stale);
  console.error(`[Village save] Unreadable save quarantined as ${key} (${reason}). A new profile was started; the original text is preserved.`);
 }catch(storageError){
  console.error('[Village save] Unreadable save could not be quarantined.',storageError?.message||storageError);
 }
}
{
 const rawSave=STORAGE.get('relicsEclipseSave')||STORAGE.get('gateRunnerSave')||'null';
 let parsed=null;
 try{parsed=JSON.parse(rawSave)}
 catch(err){console.warn('Invalid save ignored.',err);quarantineDamagedSave('parse-error',rawSave)}
 // `null` is the ordinary "no save yet" case and must not be quarantined.
 if(parsed!==null&&(typeof parsed!=='object'||Array.isArray(parsed))){
  quarantineDamagedSave('unexpected-shape',rawSave);
  parsed=null;
 }
 loadedSave=parsed;
}
function defaultInventory(){return Object.fromEntries(CARD_POOL.map((c,i)=>[c.id,{copies:DEFAULT_DECK.includes(c.id)?2:0,rarity:String(c.rarity||'common').toLowerCase(),level:1,xp:0,recent:DEFAULT_DECK.includes(c.id)&&i<3,lastFound:0,gemSlots:[null,null]}]));}
// V33.0.1 — save safety: never erase an existing Village save on startup.
// Older builds used a one-time fresh-start token that removed campaign, card,
// tower, plot, and Village keys. Keep the token only as historical metadata.
const FRESH_START_TOKEN='v32.2-new-beginning';
try{
 if(localStorage.getItem('villageFreshStartToken')!==FRESH_START_TOKEN){
  localStorage.setItem('villageFreshStartToken',FRESH_START_TOKEN);
 }
}catch(_){}
const BALANCE_PROFILE=import.meta.env.DEV?new URLSearchParams(location.search).get('balanceProfile'):null;
const BALANCE_SANDBOX=!!BALANCE_PROFILE;
let save=BALANCE_SANDBOX?createBenchmarkProfile(BALANCE_PROFILE,loadedSave||{}):(loadedSave||{});
const previousSaveVersion=Number(save.saveVersion)||0;
if(loadedSave&&previousSaveVersion<ASCENSION_SAVE_VERSION){try{STORAGE.set('relicsEclipseSave_backup_v35',JSON.stringify(loadedSave))}catch{}}
save.saveVersion=14;save.familiars=save.familiars&&typeof save.familiars==='object'?save.familiars:{equipped:'bat',unlocked:FAMILIARS.map(f=>f.id),progress:{}};save.familiars.unlocked=Array.isArray(save.familiars.unlocked)?save.familiars.unlocked:FAMILIARS.map(f=>f.id);save.familiars.progress=save.familiars.progress&&typeof save.familiars.progress==='object'?save.familiars.progress:{};if(!save.familiars.unlocked.includes(save.familiars.equipped))save.familiars.equipped=save.familiars.unlocked[0]||'bat';for(const f of FAMILIARS)familiarState(f.id);save.villageProgression=save.villageProgression&&typeof save.villageProgression==='object'?save.villageProgression:{};save.villageProgression.era=save.villageProgression.era||'settlement';save.villageProgression.researched=Array.isArray(save.villageProgression.researched)?save.villageProgression.researched:[];save.villageProgression.artifacts=Array.isArray(save.villageProgression.artifacts)?save.villageProgression.artifacts:[];save.villageProgression.chronicle=Array.isArray(save.villageProgression.chronicle)?save.villageProgression.chronicle:[];save.villageProgression.pendingShadowAwakening=!!save.villageProgression.pendingShadowAwakening;save.villageProgression.shadowAwakeningComplete=!!save.villageProgression.shadowAwakeningComplete;save.villageProgression.flags=save.villageProgression.flags&&typeof save.villageProgression.flags==='object'?save.villageProgression.flags:{};save.bestWave=save.bestWave||0;save.essence=save.essence||0;save.tutorialSeen=!!save.tutorialSeen;
save.inventory={...defaultInventory(),...(save.inventory||{})};for(const oldRoad of ['pathS','pathL','bloodTile','ironTile','cryptTile'])delete save.inventory[oldRoad];save.selectedHero=save.selectedHero||'warden';save.heroLevels=save.heroLevels||Object.fromEntries(HEROES.map(h=>[h.id,1]));save.keepUpgrades=save.keepUpgrades||{};save.runHistory=save.runHistory||[];save.settings={audio:true,music:true,sfx:true,musicVolume:.46,sfxVolume:.72,ambienceVolume:.34,...(save.settings||{})};save.materials={eclipseShards:0,bloodEssence:save.essence||0,ancientRelics:0,hunterMedallions:0,forgeEmbers:0,...(save.materials||{})};save.stats={runs:0,wins:0,totalKills:0,totalCards:0,fusions:0,bosses:0,highestWave:save.bestWave||0,towerMerges:0,towersPlaced:0,goldEarned:0,bloodEssenceEarned:save.essence||0,jpEarned:0,perfectVictories:0,...(save.stats||{})};save.discoveredEnemies=save.discoveredEnemies||{};save.discoveredMaps=save.discoveredMaps||{};save.campaign=save.campaign&&typeof save.campaign==='object'?save.campaign:{unlocked:1,completed:[],selected:'cemetery'};save.campaign.unlocked=Math.max(1,Math.min(CHAPTERS.length,Number(save.campaign.unlocked)||1));save.campaign.completed=Array.isArray(save.campaign.completed)?save.campaign.completed.filter(id=>CHAPTERS.some(c=>c.id===id)):[];save.campaign.selected=CHAPTERS.some(c=>c.id===save.campaign.selected)?save.campaign.selected:'cemetery';save.campaign.stars=save.campaign.stars&&typeof save.campaign.stars==='object'?save.campaign.stars:{};save.shadowLevel=Math.max(1,Math.min(9,Number(save.shadowLevel)||Number(save.heroLevels?.[save.selectedHero])||1));save.uniqueBossDrops=save.uniqueBossDrops&&typeof save.uniqueBossDrops==='object'?save.uniqueBossDrops:{};save.unlockedRelics=Array.isArray(save.unlockedRelics)?save.unlockedRelics:[];save.equippedRelic=save.equippedRelic||null;save.kingdom=save.kingdom||{buildings:{},renown:0};save.achievements=save.achievements&&typeof save.achievements==='object'?save.achievements:{claimed:[]};save.achievements.claimed=Array.isArray(save.achievements.claimed)?save.achievements.claimed:[];save.cosmetics=save.cosmetics&&typeof save.cosmetics==='object'?save.cosmetics:{};save.unlockedRelics=save.unlockedRelics.filter(id=>RELICS.some(r=>r.id===id));if(save.equippedRelic&&!save.unlockedRelics.includes(save.equippedRelic))save.equippedRelic=null;
save.cardFragments=save.cardFragments&&typeof save.cardFragments==='object'?save.cardFragments:{};
save.campaign.replayClears=save.campaign.replayClears&&typeof save.campaign.replayClears==='object'?save.campaign.replayClears:{};
save.saveVersion=ASCENSION_SAVE_VERSION;save.gameVersion=ASCENSION_VERSION;
save.ascension=save.ascension&&typeof save.ascension==='object'?save.ascension:{};
save.ascension.fragments=save.ascension.fragments&&typeof save.ascension.fragments==='object'?save.ascension.fragments:{};
for(const element of ELEMENT_REGISTRY)save.ascension.fragments[element.id]=Math.max(0,Number(save.ascension.fragments[element.id])||0);
save.ascension.gems=save.ascension.gems&&typeof save.ascension.gems==='object'?save.ascension.gems:{};
for(const gem of GEM_REGISTRY)save.ascension.gems[gem.id]=Math.max(0,Number(save.ascension.gems[gem.id])||0);
for(const recipe of FUSION_REGISTRY)save.ascension.gems[recipe.id]=Math.max(0,Number(save.ascension.gems[recipe.id])||0);
save.ascension.discoveredFusions=Array.isArray(save.ascension.discoveredFusions)?save.ascension.discoveredFusions.filter(id=>FUSION_REGISTRY.some(r=>r.id===id)):[];
save.ascension.equipmentInventory=Array.isArray(save.ascension.equipmentInventory)?save.ascension.equipmentInventory.filter(entry=>equipmentById(entry?.itemId)).map(entry=>({uid:String(entry.uid||`${entry.itemId}-${Date.now()}-${Math.random()}`),itemId:entry.itemId,locked:!!entry.locked})): [];
save.ascension.equipped=save.ascension.equipped&&typeof save.ascension.equipped==='object'?save.ascension.equipped:{};
for(const slot of EQUIPMENT_SLOTS)if(!equipmentById(save.ascension.equipped[slot]))save.ascension.equipped[slot]=null;
save.ascension.chapterGemRewards=Array.isArray(save.ascension.chapterGemRewards)?save.ascension.chapterGemRewards:[];
// Preserve already-awakened saves, while new profiles earn Dracula's Tooth at
// Stage 10 (the end of the Golem arc) rather than on the first road.
if(save.campaign.completed.includes('monastery')||save.uniqueBossDrops.draculaTooth||(save.shadowLevel||1)>=2){
 if(!save.unlockedRelics.includes('fang'))save.unlockedRelics.push('fang');
 save.uniqueBossDrops.draculaTooth=true;
 save.villageProgression.shadowAwakeningComplete=true;
 save.villageProgression.pendingShadowAwakening=false;
 save.shadowLevel=Math.max(2,save.shadowLevel||1);
 save.heroLevels.warden=Math.max(2,save.heroLevels.warden||1);
}
// Repair older saves that advanced the campaign counter without recording completed chapter IDs.
for(const ch of CHAPTERS){if(ch.number<save.campaign.unlocked&&!save.campaign.completed.includes(ch.id))save.campaign.completed.push(ch.id)}
const progressionIds=progressionUnlockedIds(save.campaign.completed);
// Never erase legitimate unlocks from an existing save. Merge them with progression rewards.
save.unlocked=[...new Set([...(Array.isArray(save.unlocked)?save.unlocked:[]),...progressionIds])].filter(id=>CARD_POOL.some(c=>c.id===id));
// Milestone 9D: starter cards are always real, visible, and usable.
for(const id of DEFAULT_DECK){if(!save.unlocked.includes(id))save.unlocked.push(id);const item=save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if(item.copies<1)item.copies=2;}
if(previousSaveVersion<6){save.deck=[...DEFAULT_DECK];}
save.deck=Array.isArray(save.deck)?save.deck.filter(id=>save.unlocked.includes(id)&&CARD_POOL.some(c=>c.id===id)).slice(0,6):[...DEFAULT_DECK];
while(save.deck.length<6){const id=[...DEFAULT_DECK,...save.unlocked].find(x=>CARD_POOL.some(c=>c.id===x)&&((save.inventory[x]||{}).copies||0)>0&&!save.deck.includes(x));if(!id)break;save.deck.push(id)}
for(const id of save.unlocked){const item=save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if(item.copies<1)item.copies=DEFAULT_DECK.includes(id)?2:1;}
save.favorites=Array.isArray(save.favorites)?save.favorites.filter(id=>CARD_POOL.some(c=>c.id===id)):[];
if((save.campaign?.completed||[]).includes('cemetery')&&!save.unlocked.includes('garlic'))save.unlocked.push('garlic');const garlicItem=save.inventory.garlic||(save.inventory.garlic={copies:0,rarity:'common',level:1,recent:false,lastFound:0});if((save.campaign?.completed||[]).includes('cemetery')&&garlicItem.copies<2)garlicItem.copies=2;
// V15.3 Scripture Tower preview: grant the new signature defense to every existing kingdom.
if((save.campaign?.completed||[]).includes('cathedral')&&!save.unlocked.includes('scripture'))save.unlocked.push('scripture');const scriptureItem=save.inventory.scripture||(save.inventory.scripture={copies:0,rarity:'legendary',level:1,recent:true,lastFound:Date.now()});if(scriptureItem.copies<2&&(save.campaign?.completed||[]).includes('cathedral'))scriptureItem.copies=2;if(scriptureItem.rarity==='common')scriptureItem.rarity='legendary';
save.ui=save.ui&&typeof save.ui==='object'?save.ui:{};save.ui.cardFilter=['all','tower','support','skill','hero','heroProfile','ground','equipment','gems','fragments','fusion','consumables'].includes(save.ui.cardFilter)?save.ui.cardFilter:'all';save.ui.cardSort=['type','rarity','strength','level','name','recent'].includes(save.ui.cardSort)?save.ui.cardSort:'type';
save.heroJP=save.heroJP&&typeof save.heroJP==='object'?save.heroJP:{};for(const h of HEROES)save.heroJP[h.id]=Math.max(0,Number(save.heroJP[h.id])||0);save.heroJobs=save.heroJobs&&typeof save.heroJobs==='object'?save.heroJobs:{};save.jpAwardedStages=Array.isArray(save.jpAwardedStages)?save.jpAwardedStages.filter(id=>CHAPTERS.some(c=>c.id===id)):[];if(!save.jpRetroGrantV1){save.heroJP[save.selectedHero]=(save.heroJP[save.selectedHero]||0)+10;save.jpRetroGrantV1=true;save.jpAwardedStages=[...new Set([...save.jpAwardedStages,...save.campaign.completed])];}save.stats.jpEarned=Math.max(save.stats.jpEarned||0,save.jpAwardedStages.length+(save.jpRetroGrantV1?10:0));for(const h of HEROES){const existing=save.heroJobs[h.id]&&typeof save.heroJobs[h.id]==='object'?save.heroJobs[h.id]:{};save.heroJobs[h.id]={vanguardRank:Math.max(0,Math.min(10,Number(existing.vanguardRank)||0)),...existing};}save.heroEquipment=save.heroEquipment&&typeof save.heroEquipment==='object'?save.heroEquipment:{};save.groundDefenseSlots=Array.isArray(save.groundDefenseSlots)?save.groundDefenseSlots.filter(id=>HERO_GROUND_DEFENSES.some(c=>c.id===id)).slice(0,2):HERO_GROUND_DEFENSES.slice(0,2).map(c=>c.id);// Existing arrays are intentional loadouts; only legacy saves with no field receive defaults.
// slots. The other seven are earned on the road (see CHAPTER_CARD_UNLOCKS).
const STARTER_GROUND=HERO_GROUND_DEFENSES.slice(0,2).map(c=>c.id);
const groundUnlocked=new Set([...STARTER_GROUND,...progressionUnlockedIds(save.campaign?.completed||[])]);
for(const passive of HERO_GROUND_DEFENSES){const item=save.inventory[passive.id]||(save.inventory[passive.id]={copies:groundUnlocked.has(passive.id)?1:0,rarity:passive.rarity||'common',level:1,recent:false,lastFound:0});if(groundUnlocked.has(passive.id)){if(item.copies<1)item.copies=1;}if(!item.rarity||item.rarity==='Good')item.rarity=passive.rarity||'common';}
const card=id=>CARD_POOL.find(c=>c.id===id);
const ascensionGemDef=id=>gemById(id)||FUSION_REGISTRY.find(recipe=>recipe.id===id)||null;
const rarityIndex=id=>Math.max(0,RARITIES.findIndex(r=>r.id===id));
const rarityDef=id=>RARITIES[rarityIndex(id)]||RARITIES[0];
const inv=id=>{const item=save.inventory[id]||(save.inventory[id]={copies:0,rarity:'common',level:1,xp:0,recent:false,lastFound:0,gemSlots:[null,null]});item.xp=Math.max(0,Number(item.xp)||0);item.gemSlots=Array.isArray(item.gemSlots)?item.gemSlots.slice(0,2):[];while(item.gemSlots.length<2)item.gemSlots.push(null);item.gemSlots=item.gemSlots.map(id=>ascensionGemDef(id)?id:null);return item};
const cardPower=id=>rarityDef(inv(id).rarity).mult*(1+(Math.max(1,inv(id).level)-1)*.10);
registerSaveProvider(()=>save);

let G;

let roadVersion=0;
const pathSetCache={v:-1,set:new Set()};
const routePointsCache={v:-1,points:[]};
function bumpRoadVersion(){roadVersion++;pathSetCache.v=-1;routePointsCache.v=-1;routePointsCache.points=[]}
function canvasFrameSignature(){
 try{
  const samples=[];let yellow=0;
  for(let gy=1;gy<=5;gy++)for(let gx=1;gx<=7;gx++){const x=Math.max(0,Math.min(canvas.width-1,Math.round(canvas.width*gx/8))),y=Math.max(0,Math.min(canvas.height-1,Math.round(canvas.height*gy/6))),data=ctx.getImageData(x,y,1,1).data,entry=[data[0],data[1],data[2],data[3]];samples.push(entry);if(entry[0]>130&&entry[1]>105&&entry[2]<105&&entry[0]/Math.max(1,entry[1])<1.8)yellow++}
  return {sampleCount:samples.length,yellowCount:yellow,yellowCoverage:yellow/samples.length,suspiciousYellow:yellow/samples.length>.68,samples};
 }catch(error){return {sampleCount:0,suspiciousYellow:false,error:String(error?.message||error)}}
}

// V26.4: stable public battle-control API with explicit UI-state synchronization. This is installed near the top of the
// module so the native HTML control bridge remains available even if a later,
// unrelated menu feature throws an exception.
window.VillageBattleAPI={
  center(){
    if(!G)return {ok:false,reason:'no-battle'};
    recenterCamera();
    return {ok:true};
  },
  speed(){
    if(!G)return {ok:false,reason:'no-battle'};
    G.speed=G.speed===1?2:G.speed===2?3:1;
    showToast('Battle speed ×'+G.speed);
    return {ok:true,speed:G.speed};
  },
  pause(){
    if(!G)return {ok:false,reason:'no-battle'};
    G.paused=!G.paused;
    showToast(G.paused?'Battle paused':'Battle resumed');
    return {ok:true,paused:G.paused};
  },
  menu(){
    returnToMainMenu();
    return {ok:true};
  },
  cards(){
    returnToCardsMenu();
    return {ok:true};
  },
  retry(){
    const mode=G?.mode||'chapter';
    const chapter=G?.chapter?.id||save.campaign.selected;
    UI.over.classList.add('hidden');
    freshGame(mode,chapter);
    return {ok:true};
  },
  startVisualAuditStage(stage){
    if(!['localhost','127.0.0.1'].includes(location.hostname))return {ok:false,reason:'local-only'};
    const chapter=CHAPTERS.find(entry=>entry.number===Number(stage));if(!chapter)return {ok:false,reason:'unknown-stage'};
    freshGame('chapter',chapter.id);return {ok:true,chapter:chapter.id};
  },
  prepareVisualAudit(){
    if(!G||!['localhost','127.0.0.1'].includes(location.hostname))return {ok:false};
    G.paused=true;UI.choices.classList.add('hidden');document.querySelector('#battleCinematic')?.classList.add('hidden');document.querySelector('#waveBanner')?.classList.add('hidden');
    if(!G.towers.length){const samples=[['dagger',3,6],['axe',5,4],['crossbow',8,5],['ballista',12,6],['holy',14,9],['arcane',4,12]];G.towers=samples.map(([id,x,y],index)=>{const c=card(id)||NEW_CORE_TOWERS.find(entry=>entry.id===id);return c?{...c,x,y,level:1+index%3,t:.6-index*.06,upgradeDamage:0,upgradeRange:0,upgradeRate:0,permanentPower:1,supports:[]}:null}).filter(Boolean)}
    return {ok:true,towers:G.towers.length};
  },
  setVisualAuditTravelProgress(progress){
    if(!G||new URLSearchParams(location.search).get('visualAudit')!=='1')return {ok:false};
    const q=Math.max(0,Math.min(1,Number(progress)||0)),overflow=Math.max(0,GRID.rows*GRID.tile*scale-H);G.camera.panY=(.5-q)*overflow*.92;clampCamera();return {ok:true,progress:q};
  },
  setVisualAuditRoadWave(wave){
    if(!G||new URLSearchParams(location.search).get('visualAudit')!=='1')return {ok:false,reason:'visual-audit-only'};
    if(G.enemies.length)return {ok:false,reason:'living-enemies'};
    const target=Math.max(1,Math.min(G.chapterWaves,Math.floor(Number(wave)||1))),from=Math.max(1,G._visualAuditRoadWave||1);G.paused=true;
    for(let completed=from;completed<target;completed++)growRoadAfterWave(completed);
    G._visualAuditRoadWave=target;G.wave=target;bumpRoadVersion();draw();
    return {ok:true,wave:target,routes:G.routes.map(route=>route.length),pending:(G.roadEvents||[]).filter(event=>!event.applied).map(event=>({wave:event.wave,type:event.type,routeIndex:event.routeIndex}))};
  },
  diagnostics(){return diagnosticSnapshot(G,{session:battleSessionId,activeTimers:[...battleTimers.values()],overlays:[...document.querySelectorAll('#gameOver,#choices,#battleUpgradeModal,#battleCinematic,#chapterTenCinematic,#waveBanner,#bossWrap,#placementBar,#towerInspector,#dropBanner,#codecOverlay,#mgsCry')].map(node=>({id:node.id,hidden:node.classList.contains('hidden'),display:getComputedStyle(node).display})),bodyClasses:[...document.body.classList],canvas:{width:canvas.width,height:canvas.height,cssWidth:W,cssHeight:H},context:{alpha:ctx.globalAlpha,composite:ctx.globalCompositeOperation,filter:ctx.filter,shadowBlur:ctx.shadowBlur,shadowColor:ctx.shadowColor,transform:[...ctx.getTransform().toFloat32Array()]},frame:canvasFrameSignature()})},
  async runSoak(stage=5,simulatedSeconds=600){
    if(!['localhost','127.0.0.1'].includes(location.hostname))return {ok:false,reason:'local-only'};
    const chapter=CHAPTERS.find(entry=>entry.number===Number(stage));if(!chapter)return {ok:false,reason:'unknown-stage'};
    freshGame('chapter',chapter.id);await new Promise(resolve=>setTimeout(resolve,2200));UI.choices.classList.add('hidden');G.draftsCompleted=99;G.draftChoices=null;G.draftOpen=false;G.pendingCard=null;G.paused=false;
    if(!G.towers.length){const samples=[['dagger',6,8],['axe',8,8],['crossbow',10,9],['ballista',5,11],['holy',9,11],['arcane',11,12]];G.towers=samples.map(([id,x,y],index)=>{const c=card(id)||NEW_CORE_TOWERS.find(entry=>entry.id===id);return c?{...c,x,y,level:3,t:index*.04,damage:(c.damage||12)*3,upgradeDamage:0,upgradeRange:0,upgradeRate:0,permanentPower:1,supports:[]}:null}).filter(Boolean)}
    const maxima={enemies:0,shots:0,particles:0,floaters:0,routes:0},steps=Math.max(1,Math.round(Math.min(1800,Number(simulatedSeconds)||600)*60));battleEvent('soak-start',{stage,seconds:simulatedSeconds});
    for(let i=0;i<steps&&G?.state==='play';i++){if(G.paused){if(G.waveTransition)beginNextWaveAfterExpansion();else{G.paused=false;G.draftOpen=false;UI.choices.classList.add('hidden')}}update(1/60,false,1/60);if(i%6===0){try{draw()}catch(error){battleEvent('render-error',{message:error.message,stack:error.stack});return {ok:false,stage,reason:'render-error',error:String(error?.stack||error),snapshot:diagnosticSnapshot(G),maxima}}}maxima.enemies=Math.max(maxima.enemies,G.enemies.length);maxima.shots=Math.max(maxima.shots,G.shots.length);maxima.particles=Math.max(maxima.particles,G.particles.length);maxima.floaters=Math.max(maxima.floaters,G.floaters.length);maxima.routes=Math.max(maxima.routes,G.routes.length);const invalid=validateBattleState(G);if(invalid.length)return {ok:false,stage,reason:'non-finite',invalid,snapshot:diagnosticSnapshot(G),maxima};if(i%300===0){const frame=canvasFrameSignature();if(frame.suspiciousYellow){battleEvent('yellow-frame-detected',{stage,wave:G.wave,frame});return {ok:false,stage,reason:'yellow-frame',frame,snapshot:diagnosticSnapshot(G),maxima}}}if(i%1200===0)await new Promise(resolve=>setTimeout(resolve,0))}
    const result={ok:true,stage,state:G.state,wave:G.wave,hp:G.hp,maxima,final:{enemies:G.enemies.length,shots:G.shots.length,particles:G.particles.length,floaters:G.floaters.length,routes:G.routes.map(route=>route.length)},snapshot:diagnosticSnapshot(G)};battleEvent('soak-complete',result);return result;
  },
  async runDefeatRestartSoak(cycles=20){
    if(!['localhost','127.0.0.1'].includes(location.hostname))return {ok:false,reason:'local-only'};
    const results=[];
    for(let cycle=0;cycle<Math.max(1,Number(cycles)||20);cycle++){
      const stage=[4,4,4,5,6][cycle%5],chapter=CHAPTERS.find(entry=>entry.number===stage);freshGame('chapter',chapter.id);await new Promise(resolve=>setTimeout(resolve,80));
      G.paused=false;G.pendingWave=false;G.draftOpen=false;UI.choices.classList.add('hidden');G.hp=0;endProgressionTelemetry({result:'defeat',towers:G.towers});endGame();
      if(G.state!=='over')return {ok:false,reason:'defeat-did-not-complete',cycle,stage,snapshot:window.VillageBattleAPI.diagnostics()};
      window.VillageBattleAPI.retry();await new Promise(resolve=>setTimeout(resolve,80));draw();const frame=canvasFrameSignature(),snapshot=window.VillageBattleAPI.diagnostics();
      const staleOverlay=snapshot.overlays.some(item=>['gameOver','battleUpgradeModal','mgsCry'].includes(item.id)&&!item.hidden&&item.display!=='none');
      results.push({cycle:cycle+1,stage,session:battleSessionId,frame,timers:snapshot.activeTimers.length,staleOverlay});
      if(frame.suspiciousYellow||staleOverlay||ctx.globalAlpha!==1||ctx.globalCompositeOperation!=='source-over'||ctx.filter!=='none')return {ok:false,reason:frame.suspiciousYellow?'yellow-frame':staleOverlay?'stale-overlay':'canvas-state',cycle:cycle+1,stage,snapshot,results};
    }
    return {ok:true,cycles:results.length,results,snapshot:window.VillageBattleAPI.diagnostics()};
  },
  testStageTenFinale(){
    if(!G||G.chapter?.number!==10||new URLSearchParams(location.search).get('visualAudit')!=='1')return {ok:false,reason:'visual-audit-stage-10-only'};
    save.uniqueBossDrops.draculaTooth=false;G.lastBossDeath={x:G.hero.x,y:G.hero.y,form:3,type:'golem',name:'Golem of Three Forms'};playDraculaToothCinematic();return {ok:true};
  },
  state(){const limits=G?battlefieldLimits(G):null;return G?{active:true,speed:G.speed,paused:G.paused,state:G.state,chapter:G.chapter?.number||null,structures:G.towers.length+G.traps.length,limits,shadowLevel:currentShadowLevel(),draculaTooth:!!save.uniqueBossDrops.draculaTooth}:{active:false};}
};
function resize(){
 const r=canvas.getBoundingClientRect();
 const desktopPointer=window.matchMedia?.('(pointer:fine)')?.matches;
 DPR=Math.min(devicePixelRatio||1,desktopPointer?3:2);
 // Use the canvas's real CSS display size rather than window.innerWidth/innerHeight.
 // On iPad Safari the visual viewport and layout viewport can differ, which caused
 // the rendered grid and touch coordinates to use different coordinate spaces.
 W=Math.max(1,r.width||visualViewport?.width||innerWidth);
 H=Math.max(1,r.height||visualViewport?.height||innerHeight);
 canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;
 // V25.8: battlefield uses cover scaling so the map fills the entire iPad
 // viewport. Players can still pinch outward to see more or pinch inward for detail.
 const worldW=GRID.cols*GRID.tile,worldH=GRID.rows*GRID.tile;
 scale=Math.max(W/worldW,H/worldH);
 ox=(W-worldW*scale)/2;
 // Bias the initial siege framing toward the painted cathedral. The lower breach
 // remains reachable through the existing pan/center controls.
 oy=Math.min(0,(H-worldH*scale)*.12);
}
addEventListener('resize',resize);visualViewport?.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);resize();
let battleSessionId=0;
const battleTimers=new Map();
function battleDelay(callback,delay,label='battle callback'){
 const session=battleSessionId,handle=setTimeout(()=>{battleTimers.delete(handle);battleEvent('battle-callback-fired',{label,session,currentSession:battleSessionId});if(session!==battleSessionId)return;callback()},delay);
 battleTimers.set(handle,{label,session,createdAt:performance.now(),delay});return handle;
}
const visualDebug=()=>debugEnabled('visual');
function resetBattleVisualState(reason='stage cleanup'){
 battleSessionId++;
 for(const handle of battleTimers.keys())clearTimeout(handle);battleTimers.clear();
 clearTimeout(showBattleCinematic.t);clearTimeout(showWaveBanner.t);clearTimeout(showToast.t);
 document.body.classList.remove('battle-paused','battle-instruction-active');
 for(const selector of ['#battleCinematic','#chapterTenCinematic','#battleUpgradeModal','#waveBanner','#bossWrap','#placementBar','#towerInspector','#dropBanner','#codecOverlay'])document.querySelector(selector)?.classList.add('hidden');
 document.querySelector('#mgsCry')?.remove();document.querySelectorAll('.essence-fly').forEach(node=>node.remove());
 UI?.toast&&(UI.toast.style.opacity=0);
 if(G){
  clearTimeout(G._bossShakeTimer);G.cameraTour=null;G.flash=0;G.weatherFlash=0;G.gateHurt=0;G.hitStop=0;
  G.trauma=0;G.impX=0;G.impY=0;G.bossImpactWindow=false;G.upgradeModalOpen=false;G.upgradeModalWasPaused=null;
 }
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 ctx.filter='none';ctx.shadowBlur=0;ctx.shadowColor='rgba(0,0,0,0)';ctx.setLineDash([]);
 if(visualDebug())console.info('[Battle visuals] reset',{reason,session:battleSessionId});
 return battleSessionId;
}
const key=(x,y)=>`${x},${y}`, inside=(x,y)=>x>=0&&y>=0&&x<GRID.cols&&y<GRID.rows;
function roadCellIsOpen(x,y,used=new Set()){
 return x>=ROAD_GROWTH.safeMargin&&x<GRID.cols-ROAD_GROWTH.safeMargin&&y>=3&&y<GRID.rows-ROAD_GROWTH.safeMargin&&!used.has(key(x,y));
}
function generateBranchPlan(side=-1){
 // V28.3: build a connected but genuinely varied route. Each row chooses a
 // different horizontal destination, creating bends, short runs, long runs,
 // occasional reversals, and different overall silhouettes every hunt.
 const cx=Math.floor(CATHEDRAL.gateX);
 const trunk=[{x:cx,y:3},{x:cx,y:4},{x:cx,y:5},{x:cx,y:6}];
 const minX=side<0?1:cx+1,maxX=side<0?cx-1:GRID.cols-2;
 const route=[...trunk];
 let x=cx,y=6;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Break away from the shared trunk by a random distance instead of always
 // travelling straight to the outer edge.
 let target=side<0?cx-(2+Math.floor(Math.random()*Math.max(2,cx-minX-1))):cx+(2+Math.floor(Math.random()*Math.max(2,maxX-cx-1)));
 target=clamp(target,minX,maxX);
 while(x!==target&&route.length<ROAD_GROWTH.maxTiles){x+=Math.sign(target-x);route.push({x,y})}
 let momentum=side;
 for(y=7;y<=GRID.rows-2&&route.length<ROAD_GROWTH.maxTiles;y++){
  route.push({x,y});
  const width=maxX-minX;
  const reverse=Math.random()<.34;
  if(reverse)momentum*=-1;
  const run=1+Math.floor(Math.random()*Math.max(2,Math.ceil(width*.72)));
  let next=clamp(x+momentum*run,minX,maxX);
  // Sometimes jump toward a fresh random waypoint to prevent repeating zigzags.
  if(Math.random()<.30)next=minX+Math.floor(Math.random()*(width+1));
  if(next===x)next=clamp(x+(Math.random()<.5?-1:1)*(1+Math.floor(Math.random()*2)),minX,maxX);
  while(x!==next&&route.length<ROAD_GROWTH.maxTiles){x+=Math.sign(next-x);route.push({x,y})}
 }
 return route;
}
function routeIsConnected(route){
 const gateColumn=Math.floor(CATHEDRAL.gateX);
 if(!Array.isArray(route)||route.length<12||route[0]?.x!==gateColumn||route[0]?.y!==3)return false;
 if(route.some(cell=>!roadCellIsOpen(cell.x,cell.y)))return false;
 for(let i=1;i<route.length;i++)if(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].y-route[i-1].y)!==1)return false;
 return true;
}
function generateCentralPlan(){
 const cx=Math.floor(CATHEDRAL.gateX),route=[{x:cx,y:3},{x:cx,y:4},{x:cx,y:5},{x:cx,y:6}];
 let x=cx,direction=Math.random()<.5?-1:1;
 for(let y=7;y<=GRID.rows-2&&route.length<ROAD_GROWTH.maxTiles;y++){
  route.push({x,y});
  const target=Math.max(2,Math.min(GRID.cols-3,cx+direction*(1+Math.floor(Math.random()*3))));
  while(x!==target&&route.length<ROAD_GROWTH.maxTiles){x+=Math.sign(target-x);route.push({x,y})}
  if(Math.random()<.72)direction*=-1;
 }
 return route;
}
function generateRoadPlans(chapterNumber=1){
 return authoredRoadPlans(chapterNumber);
 /* Legacy procedural generator retained below for save/debug archaeology only.
 const left=generateBranchPlan(-1),right=generateBranchPlan(1),center=generateCentralPlan();
 let pattern='standard',plans=[Math.random()<.5?left:right];
 const roll=Math.random();
 if(chapterNumber<=5){
  if(roll<.35){pattern='two-way';plans=Math.random()<.5?[left,right]:[right,left]}
 }else if(chapterNumber<=10){
  if(roll<.52){pattern='y-split';plans=[left,right]}
  else if(roll<.78){pattern='triple-split';plans=[left,right,center]}
  else{pattern='staggered';plans=[left,center,right]}
 }else{
  if(roll<.22){pattern='y-split';plans=[left,right]}
  else if(roll<.48){pattern='triple-split';plans=[left,right,center]}
  else if(roll<.73){pattern='split-reconnect';plans=[right,left]}
  else{pattern='staggered';plans=[left,center,right]}
 }
 return {pattern,plans:plans.filter(routeIsConnected)}; */
}
function rebuildVisiblePath(){
 if(!G)return;
 const seen=new Set(),all=[];
 for(const route of G.routes||[]){
  for(const p of route){const k=key(p.x,p.y);if(!seen.has(k)){seen.add(k);all.push({x:p.x,y:p.y})}}
 }
 G.path=all;
 bumpRoadVersion();
}
function generateStartingRoad(setup=generateRoadPlans()){
 const plans=setup.plans;
 const routes=[plans[0].slice(0,setup.initialLength||ROAD_GROWTH.startingTiles)],seen=new Set(),path=[];
 for(const route of routes)for(const cell of route){const id=key(cell.x,cell.y);if(!seen.has(id)){seen.add(id);path.push({...cell})}}
 return {pattern:setup.pattern,plans,routes,path,events:setup.events||[]};
}
function activeRoadEndpoints(){return (G?.routes||[]).filter(r=>r.length).map((r,i)=>({...r.at(-1),routeIndex:i}));}
function appendRouteTile(routeIndex){
 const route=G?.routes?.[routeIndex],plan=G?.roadPlans?.[routeIndex];
 if(!route||!plan||route.length>=plan.length)return null;
 const next=plan[route.length],last=route.at(-1);
 if(!next||Math.abs(next.x-last.x)+Math.abs(next.y-last.y)!==1)return null;
 const occupiedByRoad=new Set(G.path.map(p=>key(p.x,p.y)));
 // Shared trunk cells are allowed only while creating the second branch.
 if(occupiedByRoad.has(key(next.x,next.y))){
  route.push({...next});bumpRoadVersion();return {...next,routeIndex,shared:true};
 }
 if(!roadCellIsOpen(next.x,next.y)||occupied(next.x,next.y)||trapOccupied(next.x,next.y))return null;
 route.push({...next});rebuildVisiblePath();return {...next,routeIndex};
}
function activateNextRoute(){
 const routeIndex=G.routes.length,plan=G.roadPlans[routeIndex],trunkLength=4;
 if(!plan)return [];
 if(!routeIsConnected(plan))return [];
 G.routes.push(plan.slice(0,trunkLength));rebuildVisiblePath();
 const added=[];
 // Reveal enough road to make the new entrance visually unmistakable.
 for(let i=0;i<4;i++){const cell=appendRouteTile(routeIndex);if(!cell)break;if(!cell.shared)added.push(cell)}
 if(added.length){G.branchActive=true;G.spawnMode='split';}
 return added;
}
function roadGrowthForWave(completedWave){if(completedWave<=10)return 1;if(completedWave<=15)return Math.random()<.55?2:1;return 2}
function growRoadAfterWave(completedWave){
 const added=[];
 const scheduled=(G.roadEvents||[]).filter(event=>event.wave===completedWave&&!event.applied);
 for(const event of scheduled){event.applied=true;if(event.type==='OPEN_ROUTE'){while(G.routes.length<=event.routeIndex)G.routes.push(G.roadPlans[G.routes.length].slice(0,4));rebuildVisiblePath();G.branchActive=true;G.spawnMode='split';battleEvent('road-breach-opened',{wave:completedWave,route:event.routeIndex});}const target=G.routes[event.routeIndex];if(!target)continue;for(let i=0;i<event.count&&target.length<G.roadPlans[event.routeIndex].length;i++){const cell=appendRouteTile(event.routeIndex);if(cell&&!cell.shared)added.push(cell)}if(event.label)showToast(event.label,1900)}
 if(scheduled.length)return added;
 const count=completedWave%3===0?roadGrowthForWave(completedWave):0;
 for(let i=0;i<count;i++){
  let routeIndex=0;
  if(G.routes.length>1){
   const lengths=G.routes.map((route,index)=>({index,length:route.length})).sort((a,b)=>a.length-b.length);
   routeIndex=Math.random()<.72?lengths[0].index:Math.floor(Math.random()*G.routes.length);
  }
  let cell=appendRouteTile(routeIndex);
  if(!cell&&G.routes.length>1)for(let fallback=0;fallback<G.routes.length&&!cell;fallback++)if(fallback!==routeIndex)cell=appendRouteTile(fallback);
  if(!cell)break;
  if(!cell.shared)added.push(cell);
 }
 if(added.length){for(const cell of added)burst(cell.x+.5,cell.y+.5,G.map.accent||'#d7b268',18);playTone(185,.11,'square',.03)}
 return added;
}
function routePoints(routeIndex=0){
 if(routePointsCache.v!==roadVersion){routePointsCache.points=[];routePointsCache.v=roadVersion}
 const hit=routePointsCache.points[routeIndex];
 if(hit)return hit;
 const route=G?.routes?.[routeIndex]||G?.routes?.[0]||G?.path||[];
 const outer=route.at(-1);
 const pts=!outer
  ?[{x:CATHEDRAL.gateX,y:CATHEDRAL.gateY}]
  :[{x:outer.x+.5,y:outer.y+1.4},...[...route].reverse().map(p=>({x:p.x+.5,y:p.y+.5})),{x:CATHEDRAL.gateX,y:CATHEDRAL.gateY}];
 routePointsCache.points[routeIndex]=pts;
 return pts;
}
function chooseSpawnRoute(){
 if(!G.branchActive||G.routes.length<2)return 0;
 const n=G.spawnSequence++;
 if(G.spawnPattern==='alternate')return n%G.routes.length;
 if(G.spawnPattern==='rush')return n%4===0?(G.rushRoute+1)%G.routes.length:G.rushRoute;
 return n%G.routes.length;
}
function configureWaveSpawnPattern(){
 G.spawnSequence=0;
 if(!G.branchActive||G.routes.length<2){G.spawnPattern='single';G.spawnMode='single';return}
 const roll=Math.random();
 G.spawnPattern=roll<.34?'alternate':roll<.76?'split':'rush';
 G.rushRoute=Math.floor(Math.random()*G.routes.length);G.spawnMode=G.spawnPattern;
 const labels={alternate:'ALTERNATING ASSAULT',split:'SPLIT ARMY',rush:'RUSH FRONT'};
 showToast(`${labels[G.spawnPattern]} · Two entrances active`);
}
function cameraTargetForWorld(worldX,worldY,zoom){
 const gw=GRID.cols*GRID.tile,gh=GRID.rows*GRID.tile,z=Math.max(CAMERA_LIMITS.minZoom,Math.min(CAMERA_LIMITS.maxZoom,zoom));
 const baseX=ox+(gw*scale*(1-z))/2,baseY=oy+(gh*scale*(1-z))/2;
 return {zoom:z,panX:W/2-(baseX+worldX*scale*z),panY:H*.48-(baseY+worldY*scale*z)};
}
function startRoadReveal(added,onComplete){
 if(!added?.length){onComplete?.();return}
 const session=battleSessionId,endpoint=added.at(-1);showToast('NEW BREACH OPENED',1900);battleEvent('road-reveal-start',{wave:G?.wave,cells:added.length,endpoint});
 for(const cell of added){burst(cell.x+.5,cell.y+.5,G.map.accent||'#d7b268',22);for(let i=0;i<5;i++)G.particles.push({x:cell.x+.25+Math.random()*.5,y:cell.y+.25+Math.random()*.5,vx:(Math.random()-.5)*.3,vy:-.1-Math.random()*.25,life:.45+Math.random()*.35,maxLife:.8,color:'#7b6b61',kind:'debris',size:2+Math.random()*3})}
 playTone(152,.2,'square',.035);G.roadReveal={cells:added.map(cell=>({...cell})),life:.75,maxLife:.75};
 battleDelay(()=>{if(!G||G.state!=='play')return;battleEvent('road-reveal-complete',{wave:G.wave});onComplete?.()},480,'road reveal');
}
function updateCameraTour(dt){
 const t=G?.cameraTour;if(!t)return;
 t.time+=dt;
 const ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
 if(t.phase==='out'){
  const q=ease(Math.min(1,t.time/t.duration));
  G.camera.zoom=t.from.zoom+(t.to.zoom-t.from.zoom)*q;G.camera.panX=t.from.panX+(t.to.panX-t.from.panX)*q;G.camera.panY=t.from.panY+(t.to.panY-t.from.panY)*q;clampCamera();
  if(t.time>=t.duration){t.phase='hold';t.time=0}
 }else if(t.phase==='hold'){
  if(t.time>=t.hold){t.phase='back';t.time=0;t.from={...G.camera};t.to={...t.back}}
 }else{
  const q=ease(Math.min(1,t.time/t.duration));
  G.camera.zoom=t.from.zoom+(t.to.zoom-t.from.zoom)*q;G.camera.panX=t.from.panX+(t.to.panX-t.from.panX)*q;G.camera.panY=t.from.panY+(t.to.panY-t.from.panY)*q;clampCamera();
  if(t.time>=t.duration){const done=t.onComplete;G.cameraTour=null;done?.()}
 }
}
function beginNextWaveAfterExpansion(){
 if(!G||G.state!=='play')return;
 G.wave++;if(VK.on&&G.wave%4===0)vkLine();G.spawnLeft=waveSpawnCount(G.wave);G.waveDelay=waveBreathingPeriod(G.wave,G.chapterWaves);G.spawnTimer=.6;G.waveTransition=false;G.pendingWave=false;G.paused=false;configureWaveSpawnPattern();
 const identity=waveIdentity(G.wave,G.chapterWaves);showWaveBanner(G.wave,identity.toUpperCase());showToast(`WAVE ${G.wave} · ${identity.toUpperCase()} · ${G.routes.length} route${G.routes.length===1?'':'s'}`);
}
function beginWaveTransition(){
 if(!G||G.waveTransition)return;G.waveTransition=true;G.pendingWave=true;G.paused=true;
 const relicHealing=relicEffect('waveGateHealing');if(relicHealing)G.hp=Math.min(G.maxHp,G.hp+relicHealing);
 const supportHealing=G.towers.filter(t=>t.supportOnly).reduce((sum,t)=>sum+(Number((t.supportEffect||SUPPORT_EFFECT_REGISTRY[t.id])?.waveGateHealing)||0),0);if(supportHealing){const heal=Math.min(6,supportHealing);G.hp=Math.min(G.maxHp,G.hp+heal);showToast(`Support wards restore ${heal} Cathedral health`);}
 const added=growRoadAfterWave(G.wave);
 startRoadReveal(added,()=>battleDelay(beginNextWaveAfterExpansion,220,'next wave after road reveal'));
}

function freshGame(mode='chapter',chapterId=null){
 resize(); // A new run receives a clean Canvas backing surface and state stack.
 const session=resetBattleVisualState('stage initialization');
 resetBattlePointerGesture();
 AUDIO.unlock();AUDIO.setState('battle',true,true);
 const chapter=mode==='chapter'?(CHAPTERS.find(c=>c.id===(chapterId||save.campaign.selected))||CHAPTERS[0]):null;
 const chapterNumber=chapter?.number||Math.max(6,Math.floor((save.bestWave||1)/4));
 const roadSetup=generateStartingRoad(generateRoadPlans(chapterNumber)),roadPlans=roadSetup.plans,routes=roadSetup.routes,path=roadSetup.path;
 bumpRoadVersion(); // a new run means a brand new road; drop the previous run's cache
 // Battle 3.0 ships with one authored lighting state. Weather remains in the
 // save-compatible runtime for later chapters but cannot repaint the board.
 const weather=WEATHERS[0];
 const villageBonus=villageBattleBonuses();
 const map=chapter?(MAPS.find(m=>m.id===chapter.map)||MAPS[0]):MAPS[Math.floor(Math.random()*MAPS.length)];save.discoveredMaps[map.id]=true;
 const heroDef=HEROES.find(h=>h.id===save.selectedHero)||HEROES[0];const up=save.keepUpgrades,kb=save.kingdom.buildings||{},equippedRelic=RELICS.find(r=>r.id===save.equippedRelic)||null;
 G={mode,map,state:'play',paused:true,speed:1,time:0,last:performance.now(),hp:20+(heroDef.bonus.hp||0)+(up.walls||0)+(kb.chapel||0)+villageBonus.gateHp,maxHp:20+(heroDef.bonus.hp||0)+(up.walls||0)+(kb.chapel||0)+villageBonus.gateHp,essence:40,maxEssence:40,pendingEssence:0,essenceCarry:0,faerieEssenceRemainder:0,wave:1,kills:0,xp:0,xpNeed:8,level:1,battlePoints:0,cardUpgrades:{},path,towers:[],traps:[],enemies:[],shots:[],laneShots:[],particles:[],floaters:[],corpses:[],selected:null,selectedTower:null,towerEditMode:null,towerEditFirst:null,towerEditWasPaused:null,hand:[...save.deck.map(id=>({...card(id),coolLeft:0})),...save.groundDefenseSlots.map(groundCardById).filter(Boolean).map(c=>({...c,coolLeft:0}))],drawWeights:{},pickCounts:{},spawnLeft:5,spawnTimer:0,waveDelay:2,chapterWaves:mode==='endless'?999:chapter.waves,chapter,chapterCleared:false,roadPattern:roadSetup.pattern,roadPlans,routes,roadEvents:roadSetup.events,branchWaves:[],branchActive:false,spawnMode:'single',spawnPattern:'single',spawnSequence:0,rushRoute:0,hero:{x:CATHEDRAL.gateX-1.25,y:3.35,facing:'down',walking:false,anim:0,hp:100,max:100,rate:.48,t:0,damage:22*(1+(up.hunter||0)*.03+(kb.library||0)*.03)*villageBonus.heroDamage,range:2.5,holy:false,crit:.05,frenzy:0,def:heroDef},shake:0,flash:0,boss:false,globalDamage:(1+(kb.forge||0)*.02)*villageBonus.towerDamage,pendingWave:true,pendingCard:null,placementRotation:0,hoverTile:null,weather,relic:equippedRelic,relicKillCount:0,killChain:0,miniBossDefeated:false,openingDraft:false,activeDraftCard:null,draftChoices:null,draftChoiceCommitted:false,runDrops:[],roadMisses:0,lastDropAt:0,bossIntroPlayed:false,ambient:Array.from({length:42},(_,i)=>({x:Math.random()*GRID.cols,y:Math.random()*GRID.rows,v:.08+Math.random()*.18,phase:Math.random()*6.28,kind:i%3})),familiar:{...familiarDef(),...familiarState(save.familiars.equipped),t:1.1,angle:0},keepLevel:keepBattleLevel(),archerTimers:Array.from({length:Math.max(0,keepBattleLevel()-1)},(_,i)=>.6+i*.45),camera:{zoom:1,panX:0,panY:0},cameraPulse:0,hitStop:0,bossImpactWindow:false,rainSplashTimer:0,holyRains:[],queuedSkills:[],comboTimer:0,comboBest:0,weatherFlash:0,waveTransition:false,cameraTour:null};
 G.draftsCompleted=0;G.recentDrafts=[];G.essence=0;G.essenceEarned=0;G.essenceSpent=0;G.maxEssence=essenceCapacity(G);G.lastDraftTime=-Infinity;G.lastDraftWave=0;G.lastMeaningfulDecisionAt=0;G.economyDeadEndTime=0;activateBattle3Runtime(G);
 const onboarding=EARLY_STAGE_DIFFICULTY[chapterNumber];if(onboarding?.gateHealth){G.hp+=onboarding.gateHealth;G.maxHp+=onboarding.gateHealth;}
 beginProgressionTelemetry({stage:chapterNumber,accountPower:save.deck.reduce((sum,id)=>sum+cardPower(id),0)});
 if(currentShadowLevel()>=2){G.hero.damage*=1.06;G.hero.moveSpeed=1.04;G.hero.hp+=5;G.hero.max+=5;}
 applyVanguardBonuses();
 applyAscensionBonuses();
 $('#weatherTxt').textContent=map.name+' · '+weather.name;$('#relicTxt').textContent=G.relic?.name||'None';applyEquippedRelic();showToast((chapter?chapter.name:map.name)+' — '+weather.name+': '+weather.desc);
 [UI.menu,UI.deck,$('#campaignScreen'),$('#relicVaultScreen'),$('#heroesScreen'),$('#upgradesScreen'),$('#forgeScreen'),$('#codexScreen'),$('#profileScreen'),$('#cardInspectScreen'),$('#kingdomScreen'),$('#achievementsScreen'),$('#moreScreen')].forEach(s=>s?.classList.add('hidden'));UI.over.classList.add('hidden');UI.choices.classList.add('hidden');UI.hud.classList.remove('hidden');setBattleMode(true);UI.tutorial.classList.add('hidden');renderHand();
 if(visualDebug())console.info('[Battle visuals] stage initialized',{session,chapter:chapter?.id||'endless',index:chapter?chapter.number-1:null,map:map.id,camera:{...G.camera},weather:weather.id,overlays:document.querySelectorAll('.battle-cinematic:not(.hidden),.wave-banner:not(.hidden)').length});
 battleDelay(()=>beginLivingBattle(session),450,'begin living battle');
}
function applyEquippedRelic(){if(!G?.relic)return;const attackSpeed=relicEffect('heroAttackSpeed'),points=relicEffect('startingUpgradePoints'),gateHp=relicEffect('gateHp'),heroCrit=relicEffect('heroCriticalChance'),globalDamage=relicEffect('globalDamage')+relicEffect('towerDamage');if(attackSpeed)G.hero.rate/=1+attackSpeed;if(points)G.battlePoints=(G.battlePoints||0)+points;if(gateHp){G.hp+=gateHp;G.maxHp+=gateHp}if(heroCrit)G.hero.crit+=heroCrit;if(globalDamage)G.globalDamage*=1+globalDamage}

function showBattleCinematic(kicker,title,subtitle,duration=2350){
 const el=$('#battleCinematic');if(!el)return;
 $('#cinematicKicker').textContent=kicker;$('#cinematicTitle').textContent=title;$('#cinematicSubtitle').textContent=subtitle||'';
 el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;clearTimeout(showBattleCinematic.t);showBattleCinematic.t=setTimeout(()=>el.classList.add('hidden'),duration);
}
function beginLivingBattle(session=battleSessionId){
 if(!G)return;G.paused=true;showBattleCinematic(`CHAPTER ${G.chapter?.number||'∞'}`,G.map.name.toUpperCase(),G.weather.name+' · The last road must hold.');
 battleDelay(()=>{if(!G||G.state!=='play')return;G.pendingWave=false;G.spawnLeft=5;G.spawnTimer=.35;configureWaveSpawnPattern();showWaveBanner(1,'THE HUNT BEGINS');showToast('Choose your opening defense');triggerEssenceDraft(true);},2050,'opening draft');
}
function beginBossCinematic(enemy){
 AUDIO.setState('boss',true);AUDIO.sting('boss');
 if(!G||G.bossIntroPlayed)return;G.bossIntroPlayed=true;G.paused=true;G.flash=.3;enemy.cinematicPause=2.45;
 focusCameraOnBoss(enemy,1.15);bossShake(.20,0,1,.36);
 mgsAlert(enemy);
 showBattleCinematic('GUARDIAN OF THE ROAD',enemy.name.toUpperCase(),G.chapter?.boss.power||'The road trembles.',2700);
 battleDelay(()=>{if(!G||G.state!=='play')return;G.paused=false;showToast('BOSS BATTLE · '+enemy.name);},2350,'boss intro release');
}

function showWaveBanner(wave,kicker='WAVE'){
 if(wave>1)AUDIO.sting('wave');
 const banner=$('#waveBanner'),text=$('#waveBannerText'),label=$('#waveBannerKicker');if(!banner)return;
 label.textContent=kicker;text.textContent=wave;banner.classList.remove('hidden');banner.style.animation='none';void banner.offsetWidth;banner.style.animation='waveBanner 1.7s ease both';clearTimeout(showWaveBanner.t);showWaveBanner.t=setTimeout(()=>banner.classList.add('hidden'),1750);
}

function showToast(t,duration=1400){UI.toast.textContent=t;UI.toast.style.opacity=1;clearTimeout(showToast.t);showToast.t=setTimeout(()=>UI.toast.style.opacity=0,duration)}
function saveProgress(reason='progress'){
 if(BALANCE_SANDBOX){STORAGE.set('village.balanceSandbox',JSON.stringify(save));return;}
 STORAGE.set('relicsEclipseSave',JSON.stringify(save));queueCloudSave(reason);
}
// THE VILLAGE V23.0 bridge: live construction, persistent village economy,
// offline production, and backward-compatible access to the existing hunt save.
const VILLAGE_ECONOMY_MAX_OFFLINE_HOURS=VILLAGE_MAX_OFFLINE_HOURS;
function villagePlotData(){
 try{return JSON.parse(STORAGE.get('theVillageFreshTownV1Plots')||STORAGE.get('rotkVillagePlotsV224B')||STORAGE.get('rotkVillagePlots')||'{}')||{}}
 catch{return {}}
}
function villageBuildingCounts(){
 const counts={};
 Object.values(villagePlotData()).forEach(type=>{counts[type]=(counts[type]||0)+1});
 return counts;
}
function villageRates(){
 const c=villageBuildingCounts();
 return calculateVillageRates(c);
}
function ensureVillageEconomy(){
 if(!save.villageEconomy||typeof save.villageEconomy!=='object'){
  const hasBuildings=villageRates().buildings>0;
  save.villageEconomy={food:0,wood:0,stone:0,iron:0,essence:0,gold:0,lastTick:Date.now()-(hasBuildings?3600000:0),lastReport:null};
 }
 save.villageEconomy.food=Math.max(0,Number(save.villageEconomy.food)||0);
 save.villageEconomy.wood=Math.max(0,Number(save.villageEconomy.wood)||0);
 save.villageEconomy.stone=Math.max(0,Number(save.villageEconomy.stone)||0);
 save.villageEconomy.iron=Math.max(0,Number(save.villageEconomy.iron)||0);
 save.villageEconomy.essence=Math.max(0,Number(save.villageEconomy.essence)||0);
 save.villageEconomy.gold=Math.max(0,Number(save.villageEconomy.gold)||0);
 save.villageEconomy.lastTick=Number(save.villageEconomy.lastTick)||Date.now();
 save.villageEconomy.economyVersion=Math.max(2,Number(save.villageEconomy.economyVersion)||0);
 return save.villageEconomy;
}
function updateVillageEconomy(persist=true,commit=true){
 const stored=save.villageEconomy||{};
 const eco=commit?ensureVillageEconomy():{
  food:Math.max(0,Number(stored.food)||0),
  wood:Math.max(0,Number(stored.wood)||0),
  stone:Math.max(0,Number(stored.stone)||0),
  iron:Math.max(0,Number(stored.iron)||0),
  essence:Math.max(0,Number(stored.essence)||0),
  gold:Math.max(0,Number(stored.gold)||0),
  lastTick:Number(stored.lastTick)||Date.now(),
  lastReport:stored.lastReport||null
 };
 const rates=villageRates(),now=Date.now();
 const projection=projectVillageProduction(eco,rates,now-eco.lastTick),elapsedMs=projection.elapsedMs,hours=projection.hours;
 const gain={...projection.gain,hours},projected=projection.projected;
 if(commit){
  Object.assign(eco,projected,{lastTick:now});
  if(elapsedMs>=60000&&(gain.food+gain.wood+gain.stone+gain.iron+gain.essence+gain.gold)>=.1)eco.lastReport={food:gain.food,wood:gain.wood,stone:gain.stone,gold:gain.gold,hours,at:now};
  if(persist)saveProgress();
 }
 const level=1+Math.floor(rates.buildings/2);
 const happiness=Math.max(55,Math.min(100,75+(rates.counts.house||0)*3+(rates.counts.farm||0)*2-rates.buildings));
 return {...projected,goldRate:rates.gold,ironRate:rates.iron,essenceRate:rates.essence,population:rates.population,capacity:rates.populationCapacity,storageCapacity:rates.storageCapacity,workersAssigned:rates.workersAssigned,workerDemand:rates.workerDemand,workforceRatio:rates.workforceRatio,storageCapped:projection.capped,foodRate:rates.food,woodRate:rates.wood,stoneRate:rates.stone,totalRate:rates.food+rates.wood+rates.stone+rates.iron+rates.essence+rates.gold,counts:rates.counts,buildings:rates.buildings,level,happiness,maxOfflineHours:VILLAGE_ECONOMY_MAX_OFFLINE_HOURS,lastReport:eco.lastReport};
}
ensureVillageEconomy();
if(!save.villageProgression.flags.starterTreasury){const eco=ensureVillageEconomy();eco.gold+=1200;eco.food+=300;eco.wood+=500;eco.stone+=400;eco.iron+=25;eco.essence+=15;save.villageProgression.flags.starterTreasury=true;villageChronicle('Shadow founded a settlement beneath the Cathedral.','founding');saveProgress();}
window.ROTKGameBridge={
  getEssence(){return Math.max(0,Number(save.essence)||0)},
  getVillageGold(){updateVillageEconomy(false);return Math.max(0,Number(save.villageEconomy?.gold)||0)},
  ensureVillageBuilderGrant(){
    if(save.villageBuilderGrantV300)return 0;
    save.villageBuilderGrantV300=true;
    const eco=ensureVillageEconomy();
    eco.gold=(Number(eco.gold)||0)+2500;
    saveProgress();renderRoyalHome();
    return 2500;
  },
  spendVillageEssence(cost){
    cost=Math.max(0,Number(cost)||0);
    if((Number(save.essence)||0)<cost)return false;
    updateVillageEconomy(false);
    save.essence-=cost;save.materials.bloodEssence=save.essence;
    save.kingdom=save.kingdom||{buildings:{},renown:0};
    save.kingdom.renown=(save.kingdom.renown||0)+1;
    saveProgress();renderRoyalHome();
    return true;
  },
  refundVillageEssence(amount){
    save.essence=(Number(save.essence)||0)+Math.max(0,Number(amount)||0);
    save.materials.bloodEssence=save.essence;saveProgress();renderRoyalHome();
  },
  spendVillageGold(cost){
    cost=Math.max(0,Number(cost)||0);updateVillageEconomy(false);
    const eco=ensureVillageEconomy();if(eco.gold<cost)return false;
    eco.gold-=cost;saveProgress();renderRoyalHome();return true;
  },
  refundVillageGold(amount){
    const eco=ensureVillageEconomy();eco.gold+=Math.max(0,Number(amount)||0);
    saveProgress();renderRoyalHome();
  },
  grantVillageReward(reward={}){
    const eco=ensureVillageEconomy();
    eco.gold+=Math.max(0,Number(reward.gold)||0);
    eco.food+=Math.max(0,Number(reward.food)||0);
    eco.wood+=Math.max(0,Number(reward.wood)||0);
    eco.stone+=Math.max(0,Number(reward.stone)||0);
    eco.iron+=Math.max(0,Number(reward.iron)||0);
    eco.essence+=Math.max(0,Number(reward.essence)||0);
    saveProgress();renderRoyalHome();
    return true;
  },
  getVillageProgression(){const stage=villageCompletedStage();return {stage,era:save.villageProgression.era,research:[...save.villageProgression.researched],available:availableVillageResearch(),roadmap:VILLAGE_RESEARCH.map(r=>({...r,state:save.villageProgression.researched.includes(r.id)?'complete':stage>=r.requiresStage&&(!r.artifact||save.villageProgression.artifacts.includes(r.artifact))?'available':'locked'})),chronicle:[...save.villageProgression.chronicle],artifacts:[...save.villageProgression.artifacts],pendingShadowAwakening:save.villageProgression.pendingShadowAwakening,shadowAwakeningComplete:save.villageProgression.shadowAwakeningComplete};},
  canBuildVillageBuilding(id){return villageBuildingUnlocked(id)},
  spendVillageResources(cost={}){updateVillageEconomy(false);const eco=ensureVillageEconomy();for(const key of ['gold','food','wood','stone','iron','essence'])if((eco[key]||0)<Math.max(0,Number(cost[key])||0))return false;for(const key of ['gold','food','wood','stone','iron','essence'])eco[key]-=Math.max(0,Number(cost[key])||0);saveProgress();renderRoyalHome();return true;},
  getVillageResearch(){return {available:availableVillageResearch(),completed:VILLAGE_RESEARCH.filter(r=>save.villageProgression.researched.includes(r.id)),stage:villageCompletedStage()};},
  completeVillageResearch(id){const r=availableVillageResearch().find(x=>x.id===id);if(!r)return {ok:false,reason:'locked'};if(!this.spendVillageResources(r.cost))return {ok:false,reason:'resources'};save.villageProgression.researched.push(r.id);villageChronicle(`${r.name} was researched, unlocking ${r.unlocks.map(x=>x.replace(/([A-Z])/g,' $1')).join(', ')}.`,'research');saveProgress();return {ok:true,research:r};},
  completeShadowAwakening(){if(!save.villageProgression.pendingShadowAwakening)return false;save.villageProgression.pendingShadowAwakening=false;save.villageProgression.shadowAwakeningComplete=true;save.shadowLevel=Math.max(2,save.shadowLevel||1);save.heroLevels[save.selectedHero]=Math.max(2,save.heroLevels[save.selectedHero]||1);villageChronicle('The Heart of the Golem awakened Shadow to Level II.','awakening');saveProgress();renderRoyalHome();return true;},
  // The 15-second Village HUD poll is a projection only. Production is
  // committed by real economy/progression actions, so an idle screen does not
  // mutate lastTick or repeatedly put cloud synchronization back into pending.
  getVillageEconomy(){return updateVillageEconomy(false,false)},
  villageBuildingConstructed(){
    const result=updateVillageEconomy(true);renderRoyalHome();return result;
  },
  collectVillageEconomy(){
    const result=updateVillageEconomy(false);save.villageEconomy.lastReport=null;saveProgress();return {...result,lastReport:null};
  },
  refreshHome(){renderRoyalHome()},
  toast(message){showToast(message)}
};
function reconcileCardUnlocks(){
 const before=new Set(save.unlocked||[]), repaired=[];
 for(const id of progressionUnlockedIds(save.campaign?.completed||[])){
  if(!before.has(id)){save.unlocked.push(id);repaired.push(id)}
  const item=inv(id);if(item.copies<1)item.copies=DEFAULT_DECK.includes(id)?2:1;
 }
 save.unlocked=[...new Set(save.unlocked)].filter(id=>CARD_POOL.some(c=>c.id===id));
 if(repaired.length)saveProgress();
 return repaired.map(card).filter(Boolean);
}
function canPayRarityUpgrade(item,id){const rule=rarityUpgradeFor(item.rarity);return !!rule&&item.copies>=rule.copies&&(save.cardFragments[id]||0)>=(rule.cardFragments||0)&&Object.entries(rule.materials).every(([key,cost])=>(save.materials[key]||0)>=cost)}
function mergeCard(id){const item=inv(id),rule=rarityUpgradeFor(item.rarity);if(!rule)return showToast('This card is already Mythic');if(item.copies<rule.copies)return showToast(`${rule.copies} matching copies are required`);if((save.cardFragments[id]||0)<(rule.cardFragments||0))return showToast(`Need ${rule.cardFragments} targeted ${card(id).name} fragments`);const missing=Object.entries(rule.materials).find(([key,cost])=>(save.materials[key]||0)<cost);if(missing)return showToast(`Need ${missing[1]} ${missing[0]}`);const from=item.rarity;item.copies-=rule.copies;save.cardFragments[id]=(save.cardFragments[id]||0)-(rule.cardFragments||0);for(const [key,cost] of Object.entries(rule.materials))save.materials[key]-=cost;item.rarity=rule.to;item.recent=false;save.stats.fusions++;telemetryRarityUpgrade(id,from,rule.to);saveProgress('card-rarity-upgrade');showToast(`${card(id).name} fused to ${rarityDef(rule.to).name}`);renderDeck()}
function mergeAllDuplicates(){let merges=0;for(const c of CARD_POOL){const item=inv(c.id);while(canPayRarityUpgrade(item,c.id)){const rule=rarityUpgradeFor(item.rarity),from=item.rarity;item.copies-=rule.copies;save.cardFragments[c.id]=(save.cardFragments[c.id]||0)-(rule.cardFragments||0);for(const [key,cost] of Object.entries(rule.materials))save.materials[key]-=cost;item.rarity=rule.to;item.recent=false;save.stats.fusions++;telemetryRarityUpgrade(c.id,from,rule.to);merges++}}if(!merges)return showToast('No cards meet their copy, fragment, and material requirements');saveProgress('merge-all-rarity-upgrades');showToast(`Completed ${merges} rarity upgrade${merges===1?'':'s'}`);renderDeck()}
function requestMergeAllDuplicates(){
 const eligible=CARD_POOL.filter(c=>canPayRarityUpgrade(inv(c.id),c.id));
 if(!eligible.length)return showToast('No cards meet their copy, fragment, and material requirements');
 const dialog=$('#cardsMergeDialog'),summary=$('#cardsMergeSummary'),confirm=$('#cardsMergeConfirm'),cancel=$('#cardsMergeCancel');
 if(!dialog?.showModal)return mergeAllDuplicates();
 summary.textContent=`${eligible.length} card${eligible.length===1?' is':'s are'} eligible. All available rarity upgrades will be completed using the existing copy, fragment, and material requirements.`;
 confirm.onclick=()=>{dialog.close();mergeAllDuplicates()};cancel.onclick=()=>dialog.close();dialog.showModal();
}
function sortCards(cards,mode){return [...cards].sort((a,b)=>{if(mode==='rarity')return rarityIndex(inv(b.id).rarity)-rarityIndex(inv(a.id).rarity);if(mode==='strength')return cardPower(b.id)-cardPower(a.id);if(mode==='level')return inv(b.id).level-inv(a.id).level;if(mode==='name')return a.name.localeCompare(b.name);return a.type.localeCompare(b.type)||a.name.localeCompare(b.name)})}
function shortType(type){return {tower:'Defense',support:'Support',skill:'Skill',hero:'Run Upgrade',roadpiece:'System Road',trap:'Ground Defense'}[type]||type}
const HERO_GEAR={
 warden:[['weapon','Ashen Longsword','🗡️'],['armor','Warden Plate','🛡️'],['relic','Royal Seal','🔱'],['accessory','Hunter Ring','💍']],
 alchemist:[['weapon','Moon Flask','⚗️'],['armor','Veil Robes','🥋'],['relic','Ember Vial','🔥'],['accessory','Silver Lens','🔍']],
 engineer:[['weapon','Grave Hammer','🔨'],['armor','Iron Harness','⚙️'],['relic','Core Gear','🧿'],['accessory','Tool Belt','🧰']],
 guardian:[['weapon','Oath Blade','⚔️'],['armor','Keep Bulwark','🛡️'],['relic','Saint Crest','✝️'],['accessory','Vow Chain','⛓️']],
 arcanist:[['weapon','Veil Staff','🪄'],['armor','Star Mantle','🧥'],['relic','Moon Prism','🔮'],['accessory','Rune Band','💍']],
 beastmaster:[['weapon','Fang Spear','🔱'],['armor','Night Hide','🐺'],['relic','Pack Totem','🦴'],['accessory','Beast Charm','🦇']]
};
function heroGear(heroId){return HERO_GEAR[heroId]||HERO_GEAR.warden}
function toggleFavorite(id){const i=save.favorites.indexOf(id);if(i>=0)save.favorites.splice(i,1);else save.favorites.push(id);saveProgress()}
function ensureVisibleCardCollection(){
 // Keep starter cards available, but never auto-refill the active deck here.
 // Auto-refilling on every render made an intentionally removed card immediately
 // reappear, which broke both Remove and Add/replace deck management.
 for(const id of DEFAULT_DECK){
  if(!save.unlocked.includes(id))save.unlocked.push(id);
  const item=inv(id);if(item.copies<1)item.copies=2;
 }
 save.deck=Array.isArray(save.deck)
  ? [...new Set(save.deck)].filter(id=>save.unlocked.includes(id)&&card(id)&&inv(id).copies>0).slice(0,6)
  : [];
}
function setDeckCard(id,equip){
 if(!card(id)||!save.unlocked.includes(id)||inv(id).copies<1)return false;
 const next=save.deck.filter(x=>x!==id);
 if(equip){
  if(next.length>=6){showToast('Deck already has six cards');return false;}
  next.push(id);
 }
 save.deck=next;
 saveProgress();
 return true;
}
function setGroundDefenseCard(id,equip){
 const c=groundCardById(id);
 if(!c||inv(id).copies<1)return false;
 const next=save.groundDefenseSlots.filter(x=>x!==id);
 if(equip){
  if(next.length>=2){showToast('Hero already has two Passive Cards');return false}
  next.push(id);
 }
 save.groundDefenseSlots=next;
 saveProgress();
 return true;
}
function holyInfusionTier(level){return Math.max(1,Math.min(3,Number(level)||1))}
function cardIconHTML(c,level=1){
 if(c?.id==='holy'){
  const tier=holyInfusionTier(level);
  return `<span class="holy-infusion-icon tier-${tier}" aria-label="Holy Water Infusion ${['I','II','III'][tier-1]}"><i>💧</i><b>${'✦'.repeat(tier)}</b><small>${['I','II','III'][tier-1]}</small></span>`;
 }
 if(c?.id==='waterSkill')return '<span class="holy-barrage-icon" aria-label="Sacred blue-white holy water"><i>💧</i><b>💧</b><small>✦</small></span>';
 return c?.icon||'◆';
}
function miniCardHTML(c){
 const item=inv(c.id),power=cardPower(c.id);
 const atk=c.damage?Math.max(1,Math.round(c.damage*power)):c.type==='support'?Math.round(10*power):c.type==='skill'?Math.round((c.cost||30)*power):Math.round(8*power);
 const hp=c.type==='tower'?Math.round((90+(c.cost||30)*4)*power):c.type==='support'?Math.round(120*power):c.type==='hero'?Math.round(100*power):Math.round(70*power);
 const defenseCard=c.type==='tower'||c.type==='trap';
 return `<span class="deck-card-level">LV ${item.level}</span><div class="deck-card-art">${cardArtHTML(c,{eager:true})}<span>${cardIconHTML(c,item.level)}</span></div><strong class="deck-card-name">${c.name}</strong>${cardGemSlotsHTML(c)}<div class="deck-card-stats ${defenseCard?'defense-stats':''}"><span>⚔ ${atk}</span>${defenseCard?'':`<span>♥ ${hp}</span>`}</div>`;
}
function groundCardById(id){return HERO_GROUND_DEFENSES.find(c=>c.id===id)}
function renderGroundDefenseSlots(){
 const box=$('#groundDefenseSlots');if(!box)return;box.innerHTML='';
 for(let i=0;i<2;i++){
  const id=save.groundDefenseSlots[i],c=groundCardById(id),slot=document.createElement('button');
  slot.type='button';slot.className=`ground-defense-slot ${c?'filled rarity-'+inv(c.id).rarity:'empty'}`;
  if(c){slot.innerHTML=`<span class="ground-slot-label">SLOT ${i+1}</span>${cardHTML(c,true)}`;slot.title=`${c.name} · Hero bonus ground defense`;slot.onclick=()=>showToast(`${c.name} is equipped in Ground Slot ${i+1}`)}
  else{slot.innerHTML=`<span class="ground-slot-label">SLOT ${i+1}</span><span class="empty-plus">+</span><small>GROUND DEFENSE</small>`}
  box.append(slot);
 }
}

function shadowPortraitHTML(level){
 const n=Math.max(1,Math.min(9,Number(level)||1));
 const official=n===1||n===2,src=n===1?SHADOW_LEVEL_ONE_PORTRAIT:n===2?SHADOW_LEVEL_TWO_PORTRAIT:shadowAsset(n,'Idle');
 return `<span class="shadow-avatar-sprite shadow-lv-${n} ${official?'official-portrait':''}"><img src="${src}" alt="Shadow level ${n}" draggable="false" decoding="async"></span>`;
}
function renderAscensionInventory(box,filter){
 box.className='ascension-inventory-grid';box.innerHTML='';
 const stats=ascensionEquipmentStats();
 if(filter==='equipment'){
  box.innerHTML=`<section class="ascension-summary"><span class="section-kicker">SHADOW EQUIPMENT</span><h2>Faith ${Math.round(stats.faith||0)} · Bravery ${Math.round(stats.bravery||0)}</h2><p>Faith empowers defenses. Bravery strengthens Shadow and inspires nearby towers.</p><div class="equipment-slots">${EQUIPMENT_SLOTS.map(slot=>{const item=equipmentById(save.ascension.equipped[slot]);return `<div><small>${slot.replace(/\d/,' ')}</small><b>${item?`${item.icon} ${item.name}`:'Empty'}</b></div>`}).join('')}</div></section>`;
  for(const entry of save.ascension.equipmentInventory){const item=equipmentById(entry.itemId);if(!item)continue;const el=document.createElement('article');el.className=`ascension-item tier-${item.tier}`;el.innerHTML=`<span class="ascension-item-icon">${item.icon}</span><div><small>${item.rarity} · Tier ${item.tier} · ${item.slot}</small><h3>${item.name}</h3><p>${item.flavor}</p><div class="ascension-stats"><span>Faith +${item.faith}</span><span>Bravery +${item.bravery}</span>${Object.entries({...item.primaryStat,...item.secondaryStats}).map(([k,v])=>`<span>${k} ${Number(v)<1?`+${Math.round(Number(v)*100)}%`:`+${v}`}</span>`).join('')}</div></div><button type="button">${save.ascension.equipped[item.slot]===item.id?'Equipped':'Equip'}</button>`;el.querySelector('button').onclick=()=>{save.ascension.equipped[item.slot]=item.id;saveProgress('equipment-change');renderDeck();showToast(`${item.name} equipped`)};box.append(el)}
  if(!save.ascension.equipmentInventory.length)box.insertAdjacentHTML('beforeend','<p class="ascension-empty">Defeat chapter bosses to recover equipment.</p>');
  return;
 }
 if(filter==='gems'){
  const towers=CARD_POOL.filter(c=>c.type==='tower'&&inv(c.id).copies>0);
  for(const gem of [...GEM_REGISTRY,...FUSION_REGISTRY]){
   const count=save.ascension.gems[gem.id]||0;if(!count)continue;
   const upgrade=gem.element&&gem.level<3?gemById(gem.upgradePath):null,fragmentCost=gem.level*10,canUpgrade=!!upgrade&&count>=2&&(save.ascension.fragments[gem.element]||0)>=fragmentCost;
   const el=document.createElement('article');el.className='ascension-item gem-item';
   el.innerHTML=`<span class="ascension-item-icon">${gem.icon}</span><div><small>${gem.element||'Fused'} · ${count} owned</small><h3>${gem.name}</h3><p>${gem.description||Object.keys(gem.effects||{}).join(' · ')}</p></div><select>${towers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select><button type="button" data-socket-gem ${towers.length?'':'disabled'}>Socket</button>${upgrade?`<button type="button" data-upgrade-gem ${canUpgrade?'':'disabled'}>Upgrade · 2 Gems + ${fragmentCost} Fragments</button>`:''}`;
   el.querySelector('[data-socket-gem]').onclick=()=>{const towerId=el.querySelector('select').value,item=inv(towerId),slot=item.gemSlots.findIndex(id=>!id);if(slot<0)return showToast('That tower already has two gems. Remove one in card details first.');item.gemSlots[slot]=gem.id;save.ascension.gems[gem.id]--;saveProgress('gem-socket');renderDeck();showToast(`${gem.name} socketed into ${card(towerId).name}`)};
   const upgradeButton=el.querySelector('[data-upgrade-gem]');if(upgradeButton)upgradeButton.onclick=()=>{if(!canUpgrade)return;save.ascension.gems[gem.id]-=2;save.ascension.fragments[gem.element]-=fragmentCost;save.ascension.gems[upgrade.id]++;saveProgress('gem-upgrade');renderDeck();showToast(`${upgrade.name} forged`)};
   box.append(el);
  }
  if(!box.children.length)box.innerHTML='<p class="ascension-empty">Gems begin appearing with the Chapter 5 reward.</p>';return;
 }
 if(filter==='fragments'){
  for(const element of ELEMENT_REGISTRY){const count=save.ascension.fragments[element.id]||0,el=document.createElement('article');el.className='ascension-item fragment-item';el.innerHTML=`<span class="ascension-item-icon">${element.icon}</span><div><small>ELEMENTAL FRAGMENT</small><h3>${element.name} Fragments</h3><p>${count} owned · 10 craft a ${element.name} Gem I</p></div><button type="button" ${count<10?'disabled':''}>Craft Gem</button>`;el.querySelector('button').onclick=()=>{if(save.ascension.fragments[element.id]<10)return;save.ascension.fragments[element.id]-=10;save.ascension.gems[`${element.id}_1`]++;saveProgress('gem-craft');renderDeck();showToast(`${element.name} Gem I forged`)};box.append(el)}return;
 }
 if(filter==='fusion'){
  for(const recipe of FUSION_REGISTRY){const discovered=!recipe.hidden||save.ascension.discoveredFusions.includes(recipe.id),ready=recipe.inputs.every(id=>(save.ascension.gems[`${id}_1`]||0)>0),el=document.createElement('article');el.className=`ascension-item fusion-item ${discovered?'':'unknown'}`;el.innerHTML=`<span class="ascension-item-icon">${discovered?recipe.icon:'❔'}</span><div><small>${recipe.hidden?'HIDDEN RECIPE':'KNOWN RECIPE'}</small><h3>${discovered?recipe.name:'Unknown Fusion'}</h3><p>${discovered?`${recipe.inputs.map(id=>(ELEMENT_REGISTRY.find(e=>e.id===id)?.icon||'◆')).join(' + ')} · ${Object.keys(recipe.effects).join(', ')}`:'❔ + ❔ · Gather elemental Gems and experiment to reveal'}</p></div><button type="button" ${ready?'':'disabled'}>${discovered?'Fuse':'Experiment'}</button>`;el.querySelector('button').onclick=()=>{if(!ready)return;for(const id of recipe.inputs)save.ascension.gems[`${id}_1`]--;save.ascension.gems[recipe.id]++;if(!save.ascension.discoveredFusions.includes(recipe.id))save.ascension.discoveredFusions.push(recipe.id);save.stats.fusions++;saveProgress('gem-fusion');renderDeck();showToast(`${recipe.name} discovered`)};box.append(el)}return;
 }
 box.innerHTML='<p class="ascension-empty">Consumables are reserved for a future Ascension content drop.</p>';
}
function renderDeck(){save.favorites=Array.isArray(save.favorites)?save.favorites:[];save.ui=save.ui||{cardFilter:'all',cardSort:'type'};ensureVisibleCardCollection();const repairedUnlocks=reconcileCardUnlocks();if(repairedUnlocks.length)setTimeout(()=>showToast(`Recovered unlocks: ${repairedUnlocks.map(c=>c.name).join(' + ')}`),100);
 const equipped=$('#equippedDeck'),box=$('#collectionCards');equipped.innerHTML='';box.innerHTML='';box.className='cards portrait-grid';renderGroundDefenseSlots();
 const selectedHero=HEROES.find(h=>h.id===save.selectedHero)||HEROES[0];
 const heroLevel=Math.max(1,save.heroLevels?.[selectedHero.id]||1);
 const heroPortrait=$('#deckHeroPortrait'),heroName=$('#deckHeroName'),heroLevelEl=$('#deckHeroLevel'),heroCard=$('#deckHeroCard');
 if(heroPortrait){const shadowLv=currentShadowLevel();heroPortrait.innerHTML=shadowPortraitHTML(shadowLv);heroPortrait.title=`Shadow · Level ${shadowLv}`;}if(heroName)heroName.textContent=selectedHero.name;if(heroLevelEl){const stats=ascensionEquipmentStats();heroLevelEl.textContent=`Lv ${heroLevel} · ${save.heroJP[selectedHero.id]||0} JP · Faith ${Math.round(stats.faith||0)} · Bravery ${Math.round(stats.bravery||0)}`}
 const xp=$('#deckHeroXP');if(xp){const pct=Math.min(100,((heroLevel*37)%100));xp.title=`Mastery ${pct}%`;xp.querySelector('i').style.width=pct+'%'}
 const gear=$('#deckHeroGear');if(gear)gear.innerHTML=EQUIPMENT_SLOTS.map(slot=>{const item=equipmentById(save.ascension.equipped[slot]);return `<span title="${slot}: ${item?.name||'Empty'}"><i>${item?.icon||'◇'}</i><small>${slot.replace(/\d/,'')}</small></span>`}).join('');
 const heroSupports=$('#deckHeroSupports');if(heroSupports){
  const supportIds=save.deck.filter(id=>card(id)?.type==='support').slice(0,2);
  heroSupports.innerHTML=[0,1].map(i=>{const id=supportIds[i],c=id?card(id):null;return c?`<span class="hero-support-card rarity-${inv(id).rarity}" title="${c.name}"><i>${c.icon}</i><b>${c.name}</b><small>Lv ${inv(id).level}</small></span>`:`<span class="hero-support-card empty"><i>+</i><b>Support</b><small>Empty</small></span>`}).join('');
 }
 if(heroCard)heroCard.onclick=()=>{openScreen($('#heroesScreen'));renderHeroes()};
 for(let i=0;i<6;i++){
  const id=save.deck[i],slot=document.createElement('button');slot.className='deck-slot poker-mini-card'+(id?' filled rarity-'+inv(id).rarity:' empty');slot.type='button';slot.dataset.deckSlot=String(i);
  if(id){const c=card(id);slot.dataset.cardId=id;slot.dataset.cardsAction='inspect';slot.innerHTML=miniCardHTML(c)+`<span class="deck-card-view">View details</span>`;slot.setAttribute('aria-label',`View ${c.name} details`)}
  else{slot.dataset.cardsAction='empty-slot';slot.innerHTML='<span class="empty-plus">+</span><small>EMPTY</small>'}
  equipped.append(slot)
 }
 const filter=$('#deckTypeFilter')?.value||save.ui.cardFilter||'all',sort=$('#deckSort')?.value||save.ui.cardSort||'type',mergeOnly=$('#mergeOnly')?.checked||false;
 save.ui.cardFilter=filter;save.ui.cardSort=sort;
 if(['equipment','gems','fragments','fusion','consumables'].includes(filter)){renderAscensionInventory(box,filter);$('#deckCounter').textContent=`${save.deck.length} / 6`;document.querySelectorAll('.card-file-tab').forEach(t=>{const on=t.dataset.cardFilter===filter;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))});saveProgress();return;}
 if(filter==='heroProfile'){renderHeroJPPanel(box,selectedHero);$('#deckCounter').textContent=`${save.deck.length} / 6`;document.querySelectorAll('.card-file-tab').forEach(t=>{const on=t.dataset.cardFilter===filter;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))});saveProgress();return;}
 let cards=filter==='ground'?HERO_GROUND_DEFENSES:CARD_POOL.filter(c=>(filter==='all'||c.type===filter)&&(!mergeOnly||canPayRarityUpgrade(inv(c.id),c.id)));
 if(filter!=='ground')cards=sortCards(cards,sort);
 cards.forEach(c=>{
  if(filter==='ground'){
   const equipped=save.groundDefenseSlots.includes(c.id),owned=inv(c.id).copies>0,el=document.createElement('article');
   el.dataset.groundCardId=c.id;el.dataset.cardsAction='ground-inspect';el.tabIndex=0;el.setAttribute('role','button');
   el.className=`card portrait-card compact-card ground-collection-card rarity-${inv(c.id).rarity} ${equipped?'selected':''}`;
   el.innerHTML=cardHTML(c,true)+`<span class="collection-card-status">${equipped?'EQUIPPED · TAP FOR DETAILS':owned?'TAP FOR DETAILS':'LOCKED · VIEW REQUIREMENTS'}</span>`;
   box.append(el);return;
  }
  const item=inv(c.id),unlocked=save.unlocked.includes(c.id)&&item.copies>0,fav=save.favorites.includes(c.id),unlockAt=unlockChapterForCard(c.id),el=document.createElement('article');el.dataset.cardId=c.id;el.dataset.cardsAction=unlocked?'inspect':'locked';el.tabIndex=0;el.setAttribute('role','button');el.className=`card portrait-card compact-card rarity-${item.rarity} ${save.deck.includes(c.id)?'selected':''} ${unlocked?'':'locked-card'}`;el.innerHTML=cardHTML(c,true)+`<span class="card-type-corner" title="${shortType(c.type)}">${{tower:'🛡️',support:'✚',skill:'⚔️',hero:'⬆️'}[c.type]||'◆'}</span><span class="favorite-corner ${fav?'is-favorite':''}" aria-label="${fav?'Favorite':'Not favorite'}">★</span>${unlocked?'':`<div class="card-lock-overlay"><b>🔒 LOCKED</b><small>${unlockAt?`Defeat Chapter ${unlockAt.number}: ${unlockAt.name}`:'Campaign reward'}</small></div>`}`;
  if(unlocked){const status=document.createElement('span');status.className='collection-card-status';status.textContent=save.deck.includes(c.id)?'IN BATTLE DECK':'TAP FOR DETAILS';el.append(status)}
  box.append(el)
 });
 $('#deckCounter').textContent=`${save.deck.length} / 6`;$('#deckSort').value=sort;$('#deckTypeFilter').value=filter;const mergeAllBtn=$('#mergeAllBtn');if(mergeAllBtn){const ready=CARD_POOL.filter(c=>canPayRarityUpgrade(inv(c.id),c.id));mergeAllBtn.disabled=ready.length===0;mergeAllBtn.classList.toggle('ready',ready.length>0);mergeAllBtn.textContent=ready.length?`Complete Rarity Upgrades (${ready.length})`:'Complete Rarity Upgrades';}
 document.querySelectorAll('.card-file-tab').forEach(t=>{const on=t.dataset.cardFilter===filter;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))});
 renderDeckAnalysis();saveProgress();
}
function vanguardRank(heroId=save.selectedHero){return Math.max(0,Math.min(10,Number(save.heroJobs?.[heroId]?.vanguardRank)||0))}
const VANGUARD_SKILLS=[
 {name:'Vanguard Initiate',icon:'⚔',bonus:'+5% Shadow damage'},
 {name:'Tempered Guard',icon:'🛡',bonus:'+8% maximum HP'},
 {name:'Relentless',icon:'⚡',bonus:'+6% attack speed'},
 {name:'Long Reach',icon:'◎',bonus:'+0.25 attack radius'},
 {name:'Blooded Steel',icon:'🗡',bonus:'+8% Shadow damage'},
 {name:'Killer Instinct',icon:'✦',bonus:'+5% critical chance'},
 {name:'Iron Soul',icon:'♥',bonus:'+12% maximum HP'},
 {name:'Consecrated Blade',icon:'✚',bonus:'Attacks become Holy'},
 {name:'Eclipse Hunter',icon:'☾',bonus:'+12% Shadow damage'},
 {name:'Night Executioner',icon:'♛',bonus:'+20% damage to weakened foes'}
];
function applyVanguardBonuses(){
 if(!G?.hero)return;const rank=vanguardRank();
 const damageMult=1+(rank>=1?.05:0)+(rank>=5?.08:0)+(rank>=9?.12:0);
 const hpMult=1+(rank>=2?.08:0)+(rank>=7?.12:0);
 G.hero.damage*=damageMult;G.hero.max=Math.round(G.hero.max*hpMult);G.hero.hp=G.hero.max;
 if(rank>=3)G.hero.rate*=.94;if(rank>=4)G.hero.range+=.25;if(rank>=6)G.hero.crit+=.05;if(rank>=8)G.hero.holy=true;G.hero.executeBonus=rank>=10?.20:0;
}
function ascensionEquipmentStats(){return combinedEquipmentStats(save.ascension?.equipped||{})}
function towerGemEffects(t){
 const effects={};
 for(const id of inv(t.id).gemSlots){const gem=ascensionGemDef(id);if(!gem)continue;for(const [key,value] of Object.entries(gem.passiveEffects||gem.effects||{}))effects[key]=(effects[key]||0)+Number(value||0)}
 return effects;
}
function linkedSupportEffects(t){const effects={};for(const support of t.supports||[])for(const [key,value] of Object.entries(support.effect||{}))effects[key]=(effects[key]||0)+Number(value||0)*(support.power||1);return effects}
function applyAscensionBonuses(){
 if(!G?.hero)return;
 const stats=ascensionEquipmentStats(),faith=Math.max(0,Number(stats.faith)||0),bravery=Math.max(0,Number(stats.bravery)||0);
 G.ascensionStats=stats;G.faith=faith;G.bravery=bravery;
 G.hero.damage*=1+(Number(stats.attack)||0)/100+bravery*.006;
 G.hero.max+=Number(stats.hp)||0;G.hero.hp=G.hero.max;
 G.hero.crit+=(Number(stats.criticalChance)||0)+bravery*.0015;
 G.hero.critDamage=1.9+(Number(stats.criticalDamage)||0)+bravery*.003;
 G.hero.rate/=1+(Number(stats.attackSpeed)||0)+bravery*.002;
 G.hero.moveSpeed=1+(Number(stats.movement)||0)+bravery*.0015;
 G.globalDamage*=1+(Number(stats.towerDamage)||0);
 G.towerRateBonus=Number(stats.towerAttackSpeed)||0;
 G.towerRangeBonus=Number(stats.towerRange)||0;
 G.towerCritChance=Number(stats.towerCriticalChance)||0;
 G.towerBossDamage=Number(stats.towerBossDamage)||0;
 G.goldGain=(Number(stats.goldGain)||0)+faith*.001;
 G.xpGain=(Number(stats.xpGain)||0)+faith*.001;
 const familiarPassives=COMPANION_BEHAVIOR_REGISTRY[G.familiar?.id]?.passiveEffects||{};
 G.towerCritChance+=Number(familiarPassives.towerCriticalChance)||0;
 G.towerRangeBonus+=Number(familiarPassives.towerRange)||0;
}
function leadershipForTower(t){const near=G?.hero&&Math.hypot((t.x+.5)-G.hero.x,(t.y+.5)-G.hero.y)<=4.5;if(!near)return{damage:0,rate:0,range:0,crit:0,boss:0,status:0};return{damage:(G.faith||0)*.0025+(G.bravery||0)*.0015,rate:(G.faith||0)*.0018,range:(G.faith||0)*.001,crit:(G.faith||0)*.0012+(G.bravery||0)*.0008,boss:(G.faith||0)*.0015+(G.bravery||0)*.0012,status:(G.faith||0)*.001}}
function purchaseVanguardRank(heroId){
 const rank=vanguardRank(heroId),jp=save.heroJP[heroId]||0;if(rank>=10)return showToast('Shadow Vanguard is fully mastered');if(jp<1)return showToast('You need 1 JP');
 save.heroJP[heroId]=jp-1;save.heroJobs[heroId]=save.heroJobs[heroId]||{};save.heroJobs[heroId].vanguardRank=rank+1;saveProgress();showToast(`${VANGUARD_SKILLS[rank].name} unlocked`);renderDeck();
}
function renderHeroJPPanel(box,hero){
 const level=currentShadowLevel(),jp=save.heroJP[hero.id]||0,rank=vanguardRank(hero.id);
 box.className='hero-jp-panel';
  box.innerHTML=`<section class="hero-jp-header"><div class="hero-jp-avatar">${shadowPortraitHTML(level)}</div><div class="hero-jp-summary"><span class="section-kicker">HERO FILE</span><h2>Shadow</h2><p>Shadow Vanguard · Hero Level ${level}</p><div class="hero-jp-badges"><span><b>${jp}</b> JP Available</span><span><b>${rank}</b>/10 Vanguard</span></div></div><div class="hero-jp-help"><b>Job Points</b><p>Earn 1 JP the first time each campaign stage is cleared. Spend carefully—each rank is permanent.</p></div></section><section class="hero-job-board"><div class="job-board-title"><div><span class="section-kicker">SHADOW VANGUARD</span><h3>Level 1 Job Path</h3></div><strong>${rank}/10</strong></div><div class="job-node-grid">${VANGUARD_SKILLS.map((skill,i)=>{const n=i+1,unlocked=rank>=n,available=rank===i&&jp>0;return `<button type="button" class="job-node ${unlocked?'unlocked':available?'available':'locked'}" data-vanguard-rank="${n}" ${unlocked||available?'':'disabled'}><span class="job-rank">${n}</span><i>${skill.icon}</i><b>${skill.name}</b><small>${skill.bonus}</small><em>${unlocked?'UNLOCKED':available?'SPEND 1 JP':'LOCKED'}</em></button>`}).join('')}</div></section>`;
 box.querySelectorAll('[data-vanguard-rank]').forEach(btn=>btn.onclick=()=>{const requested=Number(btn.dataset.vanguardRank);if(requested===vanguardRank(hero.id)+1)purchaseVanguardRank(hero.id)});
}

function renderDeckAnalysis(){const el=$('#deckAnalysis');if(!el)return;const d=save.deck.map(card).filter(Boolean),support=d.filter(c=>c.type==='support').length,towers=d.filter(c=>c.type==='tower').length,skills=d.filter(c=>c.type==='skill').length,hero=d.filter(c=>c.type==='hero').length;const notes=[];if(!towers)notes.push('<span class="warning">⚠ No defense card equipped</span>');if(!support)notes.push('<span class="warning">⚠ No support card equipped</span>');notes.push('<span class="good-note">✓ Road System always included</span>');el.innerHTML=`<b>Deck profile</b> · Defense ${towers} · Supports ${support} · Skills ${skills} · Run upgrades ${hero}<br>${notes.join(' · ')}`}
function cardGemSlotsHTML(c){
 if(c.type!=='tower')return '';
 return `<div class="ascension-gem-slots" aria-label="${c.name} Gem sockets">${inv(c.id).gemSlots.map((id,index)=>{const gem=ascensionGemDef(id);return `<span class="${gem?'filled':'empty'}" title="${gem?gem.name:`Empty Gem Slot ${index+1}`}" aria-label="${gem?gem.name:`Empty Gem Slot ${index+1}`}">${gem?gem.icon:''}</span>`}).join('')}</div>`;
}
function cardHTML(c,collection=false){
 if(c.hiddenSystem)return `<span class="card-level">SYSTEM</span><span class="tag">Road</span><div class="card-art system-road-art">${c.icon}</div><h3>${c.name}</h3><p>${c.desc}</p><div class="card-footer"><span>Hidden run feature</span><span>Weight ${Math.round((c.drawWeight??1)*100)}%</span></div>`;
 const item=inv(c.id),r=rarityDef(item.rarity),power=cardPower(c.id),owned=c.type==='tower'&&G?G.towers.filter(t=>t.id===c.id).length:0;
 const atk=c.damage?Math.max(1,Math.round(c.damage*power)):c.type==='support'?Math.round(10*power):c.type==='skill'?Math.round((c.cost||30)*power):Math.round(8*power);
 const hp=c.type==='tower'?Math.round((90+(c.cost||30)*4)*power):c.type==='support'?Math.round(120*power):c.type==='hero'?Math.round(100*power):Math.round(70*power);
 const defenseCard=c.type==='tower'||c.type==='trap';
 return `<span class="card-level">LV ${item.level}</span><span class="tag">${shortType(c.type)}</span><div class="card-art">${cardArtHTML(c)}<div class="art-sigil">${cardIconHTML(c,item.level)}</div></div><div class="card-copy"><h3>${c.name}</h3></div>${cardGemSlotsHTML(c)}<div class="ascension-card-xp" title="${Math.min(100,item.xp)}% card XP"><i style="width:${Math.min(100,item.xp)}%"></i></div><div class="card-primary-stats ${defenseCard?'defense-stats':''}"><span class="atk-stat"><i>⚔</i><b>${atk}</b><small>ATK</small></span>${defenseCard?'':`<span class="hp-stat"><i>♥</i><b>${hp}</b><small>HP</small></span>`}</div><div class="card-footer"><span>${r.name}</span><span>${item.copies} copies${owned?` · ${owned} placed`:''}</span></div>`
}
function draftCardHTML(c){
 if(c.tactical)return `<span class="draft-level">TACTICAL</span><span class="draft-type">UTILITY</span><div class="draft-art"><div class="draft-icon">${c.icon}</div></div><h3>${c.name}</h3><div class="draft-passive"><small>IMMEDIATE EFFECT</small><p>${c.desc}</p></div><div class="draft-cost"><span>Stage choice</span><strong>NO ESSENCE COST</strong></div>`;
 if(c.hiddenSystem)return `<span class="draft-level">SYSTEM</span><span class="draft-type">ROAD</span><div class="draft-art"><div class="draft-icon">${c.icon}</div></div><h3>${c.name}</h3><div class="draft-passive"><small>SYSTEM EFFECT</small><p>${c.desc}</p></div><div class="draft-stat-grid"><div><small>ROLE</small><b>Road</b></div><div><small>DRAW WEIGHT</small><b>${Math.round((c.drawWeight??1)*100)}%</b></div></div>`;
 const item=inv(c.id),r=rarityDef(item.rarity),power=cardPower(c.id),damage=Math.round((c.damage||0)*power),speed=c.rate?`${(1/c.rate).toFixed(2)}/sec`:'—',range=c.range?`${c.range.toFixed(1)} tiles`:'—',cost=essenceCost(c);
 const role=shortType(c.type);
 const target=c.type==='tower'?(c.id==='dagger'||c.id==='cross'?'Air + Ground':c.id==='axe'?'Ground · Armor':c.id==='scripture'?'Ground · Chain':'Ground'):c.type==='support'?'Allied Tower':'Battlefield';
 const passive=c.desc||'No passive effect.';
 return `<span class="draft-level">LV ${item.level}</span><span class="draft-type">${role}</span><div class="draft-art"><div class="draft-icon">${cardIconHTML(c,item.level)}</div></div><h3>${c.name}</h3><div class="draft-stat-grid"><div><small>DAMAGE</small><b>${damage||'—'}</b></div><div><small>ATTACK SPEED</small><b>${speed}</b></div><div><small>RANGE</small><b>${range}</b></div><div><small>TARGETS</small><b>${target}</b></div></div><div class="draft-passive"><small>PASSIVE ABILITY</small><p>${passive}</p></div><div class="draft-cost"><span>${r.name} · Level ${item.level}</span><strong>✦ ${cost}</strong></div>`;
}

function renderHand(){
 if(!UI.hand||!G)return;
 UI.hand.innerHTML='';
 const c=G.activeDraftCard;
 if(!c){UI.hand.classList.add('hidden');UI.hand.setAttribute('aria-hidden','true');return;}
 if(c.tactical){UI.hand.classList.add('hidden');UI.hand.setAttribute('aria-hidden','true');return;}
 const cost=essenceCost(c),affordable=G.essence>=cost;
 const el=document.createElement('button');
 el.type='button';
 el.className=`hand-card active ${affordable?'affordable':'locked-cost'}`;
  el.innerHTML=`<span class="hlvl">Lv ${inv(c.id).level}</span><div class="hicon">${cardIconHTML(c,inv(c.id).level)}</div><div class="hname">${c.name}</div><div class="hcost">✦ ${cost}</div>`;
 el.title=affordable?`Place another ${c.name} for ${cost} Essence`:`Need ${cost-G.essence} more Essence`;
 el.onclick=()=>G.pendingCard&&!G.draftChoiceCommitted?reopenDraftChoices():selectEssenceCard(c);
 UI.hand.append(el);UI.hand.classList.remove('hidden');UI.hand.setAttribute('aria-hidden','false');
}
function selectEssenceCard(c){
 if(!G||G.state!=='play'||G.draftOpen)return;const cost=G.openingDraft&&!G.draftChoiceCommitted?0:essenceCost(c);
 if(G.essence<cost)return showToast(`Need ${cost-G.essence} more Essence`);
 if(!G.activeDraftCard||G.activeDraftCard.id!==c.id)return showToast('Fill the vial and draft a card first');
 if(c.tactical){applyTacticalChoice(c);G.activeDraftCard=null;renderEssenceVial();renderHand();return;}
 if(c.type==='hero'){applyHeroUpgrade(c);G.activeDraftCard=null;renderEssenceVial();renderHand();return;}
 if(c.type==='support'&&!G.towers.some(t=>!t.supportOnly))return showToast('Place an attack tower before a support tower');
 G.pendingCard={...c,essenceCost:cost};G.hoverTile=null;G.placementRotation=0;setPlacementUI(G.pendingCard);showToast(c.type==='trap'?`Place ${c.name} directly on the road`:c.type==='support'?`Place ${c.name} behind an attack tower`:`Place ${c.name} · costs ${cost} Essence`);renderHand();
}

// V32.4.2 — road-shape memoisation. G.path is append-only and G.routes only
// change between waves (road growth runs when the field is empty), so one
// version counter lets pathSet() and routePoints() cache instead of rebuilding.
// pathSet() was rebuilding a Set on every call and validTowerTile() calls it up
// to five times per pointer-move; routePoints() was rebuilding two arrays per
// enemy per frame in both update() and draw(). Both results are read-only.
function pathSet(){
 if(!G?.path)return pathSetCache.set;
 if(pathSetCache.v!==roadVersion){pathSetCache.set=new Set(G.path.map(p=>key(p.x,p.y)));pathSetCache.v=roadVersion}
 return pathSetCache.set;
}
function occupied(x,y){return G.towers.some(t=>t.x===x&&t.y===y)}
function trapOccupied(x,y){return G.traps.some(t=>t.x===x&&t.y===y)}
function validTrapTile(x,y){return inside(x,y)&&pathSet().has(key(x,y))&&!trapOccupied(x,y)}
function rotatePoint(p,r){let x=p.x,y=p.y;for(let i=0;i<r;i++){const nx=-y;y=x;x=nx}return{x,y}}
const ROAD_SHAPES={single:[{x:0,y:0}],L:[{x:0,y:0},{x:1,y:0},{x:1,y:1}],J:[{x:0,y:0},{x:1,y:0},{x:1,y:-1}],S:[{x:0,y:0},{x:0,y:1},{x:1,y:1}]};
function roadCells(c,anchor,rot=0){const raw=ROAD_SHAPES[c.shape]||ROAD_SHAPES.single;return raw.map(p=>{const q=rotatePoint(p,rot);return{x:anchor.x+q.x,y:anchor.y+q.y}})}
function validRoadPiece(c,anchor,rot=0){const cells=roadCells(c,anchor,rot),set=pathSet(),end=G.path.at(-1);if(Math.abs(end.x-anchor.x)+Math.abs(end.y-anchor.y)!==1)return false;const seen=new Set();for(const p of cells){const k=key(p.x,p.y);if(!inside(p.x,p.y)||set.has(k)||occupied(p.x,p.y)||seen.has(k))return false;seen.add(k)}for(let i=1;i<cells.length;i++){const a=cells[i-1],b=cells[i];if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return false}return true}
function placeRoadPiece(c,anchor,rot=0){const cells=roadCells(c,anchor,rot);if(!validRoadPiece(c,anchor,rot))return false;for(const p of cells)G.path.push(p);bumpRoadVersion();return true}

function adjacent4(x,y){return [{x:x+1,y},{x:x-1,y},{x,y:y+1},{x,y:y-1}]}
function isReservedRoadFrontier(x,y){if(!G)return false;const k=key(x,y);for(let i=0;i<(G.routes||[]).length;i++){const route=G.routes[i],plan=G.roadPlans?.[i]||[];for(const p of plan.slice(route.length,route.length+3))if(key(p.x,p.y)===k)return true;}if(!G.branchActive){for(const p of (G.roadPlans?.[1]||[]).slice(4,9))if(key(p.x,p.y)===k)return true;}return false;}
function validTowerTile(x,y){
 if(!inside(x,y)||pathSet().has(key(x,y)))return false;
 const existing=G.towers.find(t=>t.x===x&&t.y===y);
 if(existing)return true;
 if(isReservedRoadFrontier(x,y))return false;
 return adjacent4(x,y).some(n=>pathSet().has(key(n.x,n.y))||occupied(n.x,n.y));
}

function supportTargetsAt(x,y,cardDef=null){
 const rarity=inv(cardDef?.id||G?.pendingCard?.id).rarity||cardDef?.rarity||'common',cap=supportCapacity(rarity);
 return G.towers.filter(t=>!t.supportOnly&&!t.destroyed&&Math.max(Math.abs(t.x-x),Math.abs(t.y-y))===1)
  .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,cap);
}
function supportTargetAt(x,y){return supportTargetsAt(x,y)[0]||null}
function validSupportTile(x,y){return inside(x,y)&&!pathSet().has(key(x,y))&&!occupied(x,y)&&supportTargetsAt(x,y).length>0}

function firstValidRoadPlacement(c){
 const end=G.path.at(-1);
 for(const anchor of adjacent4(end.x,end.y))for(let rot=0;rot<4;rot++)if(validRoadPiece(c,anchor,rot))return {anchor,rot};
 return null;
}
function preparePlacement(c){
 G.pendingCard={...c,essenceCost:G.openingDraft?0:essenceCost(c)};G.placementRotation=0;
 if(c.type==='roadpiece'){
  const found=firstValidRoadPlacement(c);
  if(!found)return false;
  G.hoverTile=found.anchor;G.placementRotation=found.rot;
 }else if(c.type==='support'){G.hoverTile=G.towers[0]?{x:G.towers[0].x,y:G.towers[0].y}:null;if(!G.towers.length)return false;}else G.hoverTile=null;
 setPlacementUI(G.pendingCard);return true;
}

function setBattleInstruction(text='',showRotate=false){
 const bar=$('#placementBar');if(!bar)return;
 const active=!!text;
 bar.classList.toggle('hidden',!active);
 document.body.classList.toggle('battle-instruction-active',active);
 if(!active)return;
 $('#placementLabel').textContent=text;
 $('#rotateBtn').classList.toggle('hidden',!showRotate);
}
function setPlacementUI(c){
 if(!c){setBattleInstruction();return}
 const action=c.type==='roadpiece'?`Place ${c.name} · rotate as needed`:c.type==='support'?`Place ${c.name} behind a defense tower`:c.type==='trap'?`Place ${c.name} on a road tile`:`Place or cast ${c.name}`;
 setBattleInstruction(`${action} · drag to pan · pinch to zoom`,c.type==='roadpiece');
}
function cameraTransform(){
 const zoom=G?.camera?.zoom||1,worldScale=scale*zoom,gw=GRID.cols*GRID.tile,gh=GRID.rows*GRID.tile;
 return {zoom,worldScale,x:ox+(G?.camera?.panX||0)+(gw*scale*(1-zoom))/2,y:oy+(G?.camera?.panY||0)+(gh*scale*(1-zoom))/2};
}
function clampCamera(){
 if(!G?.camera)return;
 if(!Number.isFinite(G.camera.zoom)||!Number.isFinite(G.camera.panX)||!Number.isFinite(G.camera.panY)){
  G.camera={zoom:1,panX:0,panY:0};
 }
 G.camera.zoom=Math.max(CAMERA_LIMITS.minZoom,Math.min(CAMERA_LIMITS.maxZoom,G.camera.zoom));
 const c=cameraTransform(),worldW=GRID.cols*GRID.tile*c.worldScale,worldH=GRID.rows*GRID.tile*c.worldScale,m=CAMERA_LIMITS.margin;
 const minX=Math.min(m,W-m-worldW),maxX=Math.max(m,W-m-worldW),minY=Math.min(m,H-m-worldH),maxY=Math.max(m,H-m-worldH);
 const nx=Math.max(minX,Math.min(maxX,c.x)),ny=Math.max(minY,Math.min(maxY,c.y));G.camera.panX+=nx-c.x;G.camera.panY+=ny-c.y;
}
function recenterCamera(){if(!G)return;if(G.cameraTour){G.cameraTour.back={zoom:1,panX:0,panY:0};showToast('Camera will return to center after the road reveal');return;}G.camera={zoom:1,panX:0,panY:0};clampCamera();showToast('Battlefield centered')}
function pointerCanvasPoint(e){
 const r=canvas.getBoundingClientRect();const sx=W/Math.max(1,r.width),sy=H/Math.max(1,r.height);
 return{x:(e.clientX-r.left)*sx,y:(e.clientY-r.top)*sy};
}
function pointerWorldPoint(e){const p=pointerCanvasPoint(e),c=cameraTransform();return{x:(p.x-c.x)/c.worldScale,y:(p.y-c.y)/c.worldScale}}
function pointerTile(e){const p=pointerWorldPoint(e);return{x:Math.floor(p.x/GRID.tile),y:Math.floor(p.y/GRID.tile)};}
function zoomCameraAt(screenPoint,nextZoom){
 if(!G?.camera)return;const before=cameraTransform(),wx=(screenPoint.x-before.x)/before.worldScale,wy=(screenPoint.y-before.y)/before.worldScale;
 G.camera.zoom=Math.max(CAMERA_LIMITS.minZoom,Math.min(CAMERA_LIMITS.maxZoom,nextZoom));const after=cameraTransform();G.camera.panX+=screenPoint.x-(after.x+wx*after.worldScale);G.camera.panY+=screenPoint.y-(after.y+wy*after.worldScale);clampCamera();
}

function towerAtTile(x,y){return G?.towers?.find(t=>!t.destroyed&&t.x===x&&t.y===y)||null}
function validTowerMoveDestination(t,x,y){
 if(!G||!t||t.supportOnly||!inside(x,y)||pathSet().has(key(x,y))||isReservedRoadFrontier(x,y))return false;
 if(G.towers.some(other=>other!==t&&!other.destroyed&&other.x===x&&other.y===y))return false;
 return adjacent4(x,y).some(n=>pathSet().has(key(n.x,n.y))||G.towers.some(other=>other!==t&&!other.destroyed&&!other.supportOnly&&other.x===n.x&&other.y===n.y));
}
function showTowerEditBar(text){
 setBattleInstruction(text);
}
function cancelTowerEdit(message='Tower reposition cancelled'){
 if(!G)return;G.towerEditMode=null;G.towerEditFirst=null;G.selectedTower=null;setBattleInstruction();
 if(G.towerEditWasPaused===false)G.paused=false;G.towerEditWasPaused=null;renderInspector();if(message)showToast(message);
}
function beginTowerEdit(mode){
 if(!G)return;closeBattleUpgradeMenu();G.towerEditWasPaused=!!G.paused;G.paused=true;G.towerEditMode=mode;G.towerEditFirst=null;G.selectedTower=null;renderInspector();
 showTowerEditBar(mode==='swap'?'SWAP TOWERS · Tap the first attack tower':'MOVE TOWER · Tap an attack tower');
 showToast(mode==='swap'?'Choose the first tower to swap':'Choose the tower you want to move');
}
function handleTowerEditTap(tap){
 if(!G?.towerEditMode)return false;
 const tapped=towerAtTile(tap.x,tap.y);
 if(!G.towerEditFirst){
  if(!tapped||tapped.supportOnly)return showToast('Choose a placed attack tower');
  G.towerEditFirst=tapped;G.selectedTower=tapped;renderInspector();
  showTowerEditBar(G.towerEditMode==='swap'?'SWAP TOWERS · Tap the second attack tower':'MOVE TOWER · Tap an empty valid tower location');
  showToast(G.towerEditMode==='swap'?'Now choose the second tower':'Now choose an available tower location');return true;
 }
 const first=G.towerEditFirst;
 if(G.towerEditMode==='swap'){
  if(!tapped||tapped===first||tapped.supportOnly)return showToast('Choose a different attack tower');
  const ax=first.x,ay=first.y;first.x=tapped.x;first.y=tapped.y;tapped.x=ax;tapped.y=ay;
  burst(first.x+.5,first.y+.5,'#ffe28a',20);burst(tapped.x+.5,tapped.y+.5,'#ffe28a',20);
  cancelTowerEdit('Tower positions swapped');return true;
 }
 if(!validTowerMoveDestination(first,tap.x,tap.y))return showToast('That location is not available or is not connected to the road defense line');
 first.x=tap.x;first.y=tap.y;burst(first.x+.5,first.y+.5,'#ffe28a',24);cancelTowerEdit(`${first.name} moved`);return true;
}

function handleBattleTap(e){
 if(!G||G.state!=='play')return;const tap=pointerTile(e);
 if(G.towerEditMode){handleTowerEditTap(tap);return;}
 if(!G.pendingCard){const wp=pointerWorldPoint(e),tx=wp.x/GRID.tile,ty=wp.y/GRID.tile;const t=G.towers.map(t=>({t,d:Math.hypot((t.x+.5)-tx,(t.y+.5)-ty)})).filter(o=>o.d<=.68).sort((a,b)=>a.d-b.d)[0]?.t||null;G.selectedTower=t;renderInspector();if(t)showToast(`${t.name} selected`);return;}
 const c=G.pendingCard,p=tap;let used=false;
 if(c.type==='tower'){
  if(!validTowerTile(p.x,p.y))return showToast('Towers must touch a road or a road-connected tower');
  const existing=G.towers.find(t=>t.x===p.x&&t.y===p.y);
  const placement=placementFeedback(G,c,p.x,p.y,!!existing||validTowerTile(p.x,p.y));if(!existing&&!placement.valid)return showToast(placement.reason);
   if(existing){if(existing.id!==c.id||existing.level>=3)return showToast('Only identical towers can merge');existing.level++;existing.damage*=1.7;existing.range+=.18;save.stats.towerMerges++;burst(p.x+.5,p.y+.5,c.color,24);showToast(`Merged to level ${existing.level}`);used=true;}
   else {const tower={...c,x:p.x,y:p.y,level:1,t:0,upgradeDamage:0,upgradeRange:0,upgradeRate:0,elite:!!c.elite,permanentPower:cardPower(c.id),supports:[]};applyCardBattleUpgradesToTower(tower);G.towers.push(tower);save.stats.towersPlaced++;used=true;}
 } else if(c.type==='support'){
   const placement=placementFeedback(G,c,p.x,p.y,validSupportTile(p.x,p.y));if(!placement.valid)return showToast(placement.reason);
   if(!validSupportTile(p.x,p.y))return showToast('Support structures must be within one of the surrounding eight tiles of an attack tower');const targets=supportTargetsAt(p.x,p.y,c),target=targets[0],supportEffect=c.supportEffect||SUPPORT_EFFECT_REGISTRY[c.id]||{};const supportPower=(HEROES.find(h=>h.id===save.selectedHero)?.bonus?.support||1)*(1+(inv(c.id).level-1)*.10);const placedSupport={...c,x:p.x,y:p.y,level:1,t:0,supportOnly:true,supportTarget:target,supportTargets:targets,permanentPower:cardPower(c.id),supports:[],power:supportPower,supportEffect,infusionTier:supportEffect.visual==='holy'?holyInfusionTier(inv(c.id).level):1};G.towers.push(placedSupport);save.stats.towersPlaced++;for(const linked of targets){linked.supports=linked.supports||[];linked.supports.push({id:c.id,name:c.name,icon:c.icon,power:supportPower,effect:supportEffect})}burst(p.x+.5,p.y+.5,c.color||'#ffe49a',30);showToast(`${c.name} supports ${targets.length} tower${targets.length===1?'':'s'}`);used=true;
  } else if(c.type==='trap'){
  const placement=placementFeedback(G,c,p.x,p.y,validTrapTile(p.x,p.y));if(!placement.valid)return showToast(placement.reason);
  if(!validTrapTile(p.x,p.y))return showToast('Ground defenses must be placed on an empty road tile');G.traps.push({...c,x:p.x,y:p.y,t:0,level:1});burst(p.x+.5,p.y+.5,c.color,18);showToast(`${c.name} armed`);used=true;
 } else if(c.type==='roadpiece'){
  if(!placeRoadPiece(c,p,G.placementRotation))return showToast('Rotate or move the road ghost to a green position');used=true;playTone(185,.09,'square',.028);
 } else if(c.type==='skill'){castSkill(c,p.x+.5,p.y+.5);used=true;}
 if(used)finishCardPlacement();
}
const activePointers=new Map();let gesture={dragging:false,moved:false,lastX:0,lastY:0,pinchDistance:0,pinchZoom:1};
function resetBattlePointerGesture(){
 activePointers.clear();
 gesture={dragging:false,moved:false,lastX:0,lastY:0,pinchDistance:0,pinchZoom:G?.camera?.zoom||1};
}
canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',e=>{
 if(!G||G.state!=='play')return;canvas.setPointerCapture?.(e.pointerId);const p=pointerCanvasPoint(e);activePointers.set(e.pointerId,p);
 if(activePointers.size===1){gesture.dragging=true;gesture.moved=false;gesture.lastX=p.x;gesture.lastY=p.y;}
 else if(activePointers.size===2){const pts=[...activePointers.values()],dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;gesture.pinchDistance=Math.hypot(dx,dy);gesture.pinchZoom=G.camera.zoom;gesture.moved=true;}
});
canvas.addEventListener('pointermove',e=>{
 if(!G||G.state!=='play')return;const p=pointerCanvasPoint(e);if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,p);
 if(activePointers.size>=2){const pts=[...activePointers.values()].slice(0,2),dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y,dist=Math.max(20,Math.hypot(dx,dy)),mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};zoomCameraAt(mid,gesture.pinchZoom*dist/Math.max(20,gesture.pinchDistance));gesture.moved=true;return;}
 if(activePointers.size===1&&gesture.dragging){const dx=p.x-gesture.lastX,dy=p.y-gesture.lastY;if(Math.hypot(dx,dy)>1){G.camera.panX+=dx;G.camera.panY+=dy;clampCamera();gesture.moved=gesture.moved||Math.hypot(dx,dy)>4;}gesture.lastX=p.x;gesture.lastY=p.y;}
 if(G.pendingCard)G.hoverTile=pointerTile(e);
});
function endPointer(e){
 const wasSingle=activePointers.size===1&&activePointers.has(e.pointerId),shouldTap=wasSingle&&!gesture.moved;activePointers.delete(e.pointerId);
 if(shouldTap)handleBattleTap(e);if(activePointers.size===1){const p=[...activePointers.values()][0];gesture.lastX=p.x;gesture.lastY=p.y;gesture.dragging=true;gesture.moved=true;}else if(activePointers.size===0){gesture.dragging=false;gesture.pinchDistance=0;}
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('lostpointercapture',e=>{
 if(!activePointers.delete(e.pointerId))return;
 if(activePointers.size===1){const p=[...activePointers.values()][0];gesture.lastX=p.x;gesture.lastY=p.y;gesture.dragging=true;gesture.moved=true}
 else if(activePointers.size===0)resetBattlePointerGesture();
});
window.addEventListener('blur',resetBattlePointerGesture);
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetBattlePointerGesture()});
canvas.addEventListener('wheel',e=>{if(!G||G.state!=='play')return;e.preventDefault();const p=pointerCanvasPoint(e),factor=Math.exp(-e.deltaY*.0015);zoomCameraAt(p,G.camera.zoom*factor);},{passive:false});
function restoreEssenceCarry(){if(!G||G.essenceCarry<=0)return;const restored=Math.min(G.maxEssence-G.essence,G.essenceCarry);G.essence+=restored;G.essenceCarry-=restored;}
function finishCardPlacement(){
 const placed=G.pendingCard;
 const cost=Math.max(0,Number(placed?.essenceCost)||0);if(cost>G.essence)return showToast(`Need ${cost-G.essence} more Essence`);
 G.essence-=cost;G.essenceSpent=(G.essenceSpent||0)+cost;G.lastMeaningfulDecisionAt=G.time;
 commitDraftChoice(placed);
 G.openingDraft=false;G.maxEssence=essenceCapacity(G);
 G.pendingCard=null;G.selected=null;G.hoverTile=null;setPlacementUI(null);G.draftOpen=false;G.paused=false;G.pendingWave=false;renderEssenceVial();renderHand();
 if(placed&&G.activeDraftCard?.id===placed.id){const cost=essenceCost(placed);showToast(G.essence>=cost?`${G.essence} Essence left · tap ${placed.name} to place another`:`${placed.name} cycle complete · refill the vial`);}
}

const HOLY_WATER_RADIUS=2.35;
function startHolyWaterRain(x,y){
 const level=Math.max(1,inv('waterSkill').level||1),hits=5,perHit=16+level*4;
 const targets=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<HOLY_WATER_RADIUS);
 G.holyRains=G.holyRains||[];
 G.holyRains.push({x,y,radius:HOLY_WATER_RADIUS,elapsed:0,nextPulse:0,pulses:0,hits,perHit,targets,level,duration:.76});
 floatText(x,y-.35,`${hits}x HOLY BARRAGE`,'#c9f4ff');
}
function updateHolyWaterRains(dt){
 if(!G?.holyRains?.length)return;
 for(const rain of G.holyRains){
  rain.elapsed+=dt;
  while(rain.pulses<rain.hits&&rain.elapsed>=rain.nextPulse){
   for(const e of rain.targets)if(e&&!e.dead)hit(e,rain.perHit,{holy:true,skill:true,noCrit:true,kind:'holyWaterBarrage'});
   const drops=8+Math.min(4,rain.level);
   for(let i=0;i<drops;i++){
    const angle=Math.random()*Math.PI*2,radius=Math.sqrt(Math.random())*rain.radius;
    const px=rain.x+Math.cos(angle)*radius,py=rain.y+Math.sin(angle)*radius;
    G.particles.push({x:px,y:py-.65-Math.random()*.45,vx:-.08+Math.random()*.16,vy:4.8+Math.random()*1.8,life:.22+Math.random()*.10,maxLife:.32,color:i%3?'#aeeaff':'#f3fdff',kind:'holyDrop',impactY:py,size:1.4+Math.random()*1.6});
   }
   rain.pulses++;rain.nextPulse=rain.pulses*.13;
   if(rain.pulses===1){for(const e of rain.targets)if(e&&!e.dead)e.burn=Math.max(e.burn||0,7+rain.level)}
   hitPause(18);
  }
 }
 G.holyRains=G.holyRains.filter(r=>r.elapsed<r.duration);
 trimParticles();
}
function castSkill(c,x,y){
 if(!G.enemies.some(e=>!e.dead)&&['waterSkill','crossSkill','axeRain','grandCross'].includes(c.id)){
  G.queuedSkills.push({...c,target:{x,y}});showToast(`${c.name} armed — it will trigger when the next enemies enter`);floatText(GRID.cols/2,1.45,'SKILL ARMED','#ffe6a3');return;
 }
 if(c.id==='waterSkill'){
  startHolyWaterRain(x,y);
 }
 if(c.id==='crossSkill'){G.enemies.forEach(e=>hit(e,38));for(let i=0;i<80;i++)G.particles.push({x:Math.random()*GRID.cols,y:Math.random()*GRID.rows,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,life:1,color:'#ffe9a8'})}
 if(c.id==='freeze'){G.enemies.forEach(e=>e.freeze=3);G.flash=.35}
 if(c.id==='summon'){G.hero.frenzy=8;G.hp=Math.min(G.maxHp,G.hp+3);burst(G.hero.x,G.hero.y,'#f2d273',35)}
 if(c.id==='axeRain'){G.enemies.forEach(e=>hit(e,52,{holy:false}));hitPause(42);for(const e of G.enemies)burst(e.x,e.y,'#d8c0a0',10)}
 if(c.id==='grandCross'){G.enemies.forEach(e=>hit(e,82,{holy:true}));G.flash=.7;hitPause(55);}

}
function applyHeroUpgrade(c){
 if(c.heroStat==='damage')G.hero.damage*=1.25;
 if(c.heroStat==='rate')G.hero.rate*=.82;
 if(c.heroStat==='range')G.hero.range*=1.2;
 if(c.heroStat==='holy'){G.hero.holy=true;G.hero.crit+=.15;}
 burst(G.hero.x,G.hero.y,'#ffe89a',34);floatText(G.hero.x,G.hero.y-0.4,'HERO UPGRADE','#ffe89a');showToast(`${c.name} gained for this run`);
}
function applyTacticalChoice(c){
 if(c.id==='fieldRepair')G.hp=Math.min(G.maxHp,G.hp+Math.max(1,Math.ceil(G.maxHp*.20)));
 if(c.id==='fieldMerge'){const tower=G.towers.filter(t=>!t.supportOnly&&t.level<3).sort((a,b)=>a.level-b.level)[0];if(tower){tower.level++;tower.damage*=1.35;tower.range+=.1;save.stats.towerMerges++;}else G.battlePoints++;}
 if(c.id==='battleInsight')G.battlePoints++;
 if(c.id==='overclockLine')for(const tower of G.towers)if(!tower.supportOnly)tower.rate=Math.max(.08,tower.rate*.92);
 burst(G.hero.x,G.hero.y,'#ffe89a',24);floatText(G.hero.x,G.hero.y-.4,c.name.toUpperCase(),'#ffe89a');showToast(`${c.name} applied for this stage`);
}
// V34.1 — PERFORMANCE: cached glow sprites instead of ctx.shadowBlur.
//
// shadowBlur is by far the most expensive operation in Canvas2D: every draw that
// uses it forces the browser into a scratch surface and runs a gaussian blur
// over it. It was being set inside the per-tower, per-shot, per-lane-shot and
// per-particle loops, so a busy wave ran hundreds of blur passes every frame.
// On iPad Safari that is the difference between 60fps and roughly 15. A radial
// gradient is rasterised once per colour and then blitted with drawImage.
const GLOW_CACHE=new Map();
function glowSprite(color,size=48){
 const key=color+'@'+size;
 const hit=GLOW_CACHE.get(key);
 if(hit)return hit;
 const c=document.createElement('canvas');c.width=c.height=size;
 const g=c.getContext('2d');const r=size/2;
 const grad=g.createRadialGradient(r,r,0,r,r,r);
 grad.addColorStop(0,color);grad.addColorStop(.35,color);grad.addColorStop(1,'rgba(0,0,0,0)');
 g.globalAlpha=.85;g.fillStyle=grad;g.beginPath();g.arc(r,r,r,0,7);g.fill();
 GLOW_CACHE.set(key,c);return c;
}
function drawGlow(x,y,color,radius,alpha=1){
 const sprite=glowSprite(color,48);
 const a=ctx.globalAlpha;ctx.globalAlpha=a*alpha;
 ctx.drawImage(sprite,x-radius,y-radius,radius*2,radius*2);
 ctx.globalAlpha=a;
}
// V34.1 — PERFORMANCE: a hard particle budget. Nothing bounded G.particles.
// A skeleton death pushes 18, Cross Storm pushes 80 in one call, and a wave
// clearing several elites could stack past a thousand live particles, each
// costing an update, a filter pass and a draw every frame.
const MAX_PARTICLES = 420;
function trimParticles(){
 const list=G?.particles;
 if(!list||list.length<=MAX_PARTICLES)return;
 list.splice(0,list.length-MAX_PARTICLES);
}
function floatText(x,y,text,color='#fff'){if(!G)return;if(G.floaters.length>90)G.floaters.shift();G.floaters.push({x,y,text,color,life:1,vy:-.7})}
const AUDIO=(()=>{
 const MUSIC_FADE_SECONDS=.75;
 const fileTracks={
  battle:{url:new URL('../../assets/audio/music/battle/battle_01.ogg',import.meta.url).href,level:.32,label:'Battle'},
  boss:{url:new URL('../../assets/audio/music/boss/boss_battle_01.ogg',import.meta.url).href,level:.38,label:'Boss battle'},
  menu:{url:new URL('../../assets/audio/music/village/untitled.ogg',import.meta.url).href,level:.55,label:'Village'}
 };
 let ctx=null,master=null,limiter=null,musicBus=null,sfxBus=null,ambBus=null,unlocked=false,state='menu',timer=0,nextNote=0,step=0,noise=null,wind=null;
 for(const track of Object.values(fileTracks))track.data=fetch(track.url).then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.arrayBuffer()}).catch(error=>{console.warn(`${track.label} music preload failed`,error);return null});
 const progressions={menu:[[48,55,60],[46,53,58],[43,50,55],[41,48,53]],campaign:[[50,57,62],[48,55,60],[45,52,57],[43,50,55]],battle:[[45,52,57],[43,50,55],[41,48,53],[38,45,50]],boss:[[38,45,50],[39,46,51],[36,43,48],[34,41,46]],victory:[[48,55,60],[52,59,64],[55,62,67],[60,64,67]],defeat:[[43,50,55],[41,48,53],[38,45,50],[36,43,48]]};
 const hz=n=>440*Math.pow(2,(n-69)/12);
 function ensure(){if(ctx)return true;try{const AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();master=ctx.createGain();limiter=ctx.createDynamicsCompressor();musicBus=ctx.createGain();sfxBus=ctx.createGain();ambBus=ctx.createGain();limiter.threshold.value=-8;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.003;limiter.release.value=.18;musicBus.connect(master);sfxBus.connect(master);ambBus.connect(master);master.connect(limiter);limiter.connect(ctx.destination);noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.35;apply();return true}catch(e){console.warn('Web Audio unavailable',e);return false}}
  const volume=v=>Math.max(0,Math.min(1,Number(v)||0));
  function apply(){if(!ctx)return;const enabled=save.settings.audio!==false;master.gain.setTargetAtTime(enabled?1:0,ctx.currentTime,.03);musicBus.gain.setTargetAtTime(save.settings.music===false?0:volume(save.settings.musicVolume??.46),ctx.currentTime,.08);sfxBus.gain.setTargetAtTime(save.settings.sfx===false?0:volume(save.settings.sfxVolume??.72)*2.25,ctx.currentTime,.03);ambBus.gain.setTargetAtTime(volume(save.settings.ambienceVolume??.34),ctx.currentTime,.1)}
  async function unlock(){if(!ensure())return false;try{if(ctx.state!=='running')await ctx.resume();unlocked=ctx.state==='running';if(!unlocked)return false;startWind();setState(state,true);document.querySelector('#audioUnlockHint')?.remove();return true}catch(e){console.warn('Web Audio resume failed',e);unlocked=false;return false}}
 function osc(note,when,dur=.6,type='sine',gain=.025,bus=musicBus,detune=0){if(!ctx||!unlocked)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz(note),when);o.detune.value=detune;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(g);g.connect(bus);o.start(when);o.stop(when+dur+.03)}
  function bell(note,when,gain=.018,bus=musicBus){osc(note,when,2.6,'sine',gain,bus);osc(note+12,when,1.8,'sine',gain*.28,bus,4)}
  function schedule(){if(!ctx||!unlocked||state==='silence'||fileTracks[state])return;if(save.settings.audio===false||save.settings.music===false){nextNote=ctx.currentTime+.08;return}while(nextNote<ctx.currentTime+.22){const chords=progressions[state]||progressions.menu,ch=chords[Math.floor(step/8)%chords.length],beat=step%8;if(beat===0){bell(ch[0]-12,nextNote,.021);osc(ch[1],nextNote,1.6,'triangle',.016);osc(ch[2],nextNote+.012,1.5,'sine',.012)}if(state==='victory')osc(ch[beat%3]+12,nextNote,.45,'triangle',.015);if(state==='defeat'&&beat===4)bell(ch[0]-12,nextNote,.014);nextNote+=.42;step++}}
 function startWind(){if(wind||!noise)return;const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noise;src.loop=true;filter.type='lowpass';filter.frequency.value=650;g.gain.value=.035;src.connect(filter);filter.connect(g);g.connect(ambBus);src.start();wind={src,g};}
 async function decodeFileTrack(track){if(track.buffer)return track.buffer;if(!ctx)return null;if(!track.decode)track.decode=(async()=>{const data=await track.data;if(!data)return null;try{track.buffer=await ctx.decodeAudioData(data.slice(0));return track.buffer}catch(error){console.warn(`${track.label} music decoding failed`,error);return null}})();return track.decode}
 function stopFileTrack(track,fade=true){const source=track.source,gain=track.gain;if(!source||!gain||!ctx)return;track.source=null;track.gain=null;const now=ctx.currentTime,fadeTime=fade?MUSIC_FADE_SECONDS:0;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(Math.max(.0001,gain.gain.value),now);gain.gain.linearRampToValueAtTime(0,now+fadeTime);try{source.stop(now+fadeTime+.02)}catch(_){}}
 async function startFileTrack(name,restart=false){const track=fileTracks[name];if(!track||!ctx||!unlocked||state!==name)return;if(track.source&&!restart){const now=ctx.currentTime;track.gain.gain.cancelScheduledValues(now);track.gain.gain.setValueAtTime(Math.max(0,track.gain.gain.value),now);track.gain.gain.linearRampToValueAtTime(track.level,now+MUSIC_FADE_SECONDS);return}if(track.source)stopFileTrack(track,false);const buffer=await decodeFileTrack(track);if(!buffer||state!==name||!unlocked||track.source)return;const source=ctx.createBufferSource(),gain=ctx.createGain(),now=ctx.currentTime;source.buffer=buffer;source.loop=true;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(track.level,now+MUSIC_FADE_SECONDS);source.connect(gain);gain.connect(musicBus);track.source=source;track.gain=gain;source.onended=()=>{if(track.source===source){track.source=null;track.gain=null}};source.start(now)}
 function setState(next,force=false,restartBattle=false){state=next||'menu';if(!unlocked)return;for(const [name,track] of Object.entries(fileTracks)){if(name===state)startFileTrack(name,name==='battle'&&restartBattle);else stopFileTrack(track,true)}if(force||nextNote<ctx.currentTime){nextNote=ctx.currentTime+.05;step=0}clearInterval(timer);if(state==='silence'||fileTracks[state])return;timer=setInterval(schedule,80);schedule()}
  function tone(freq=220,dur=.08,type='sine',gain=.035){if(save.settings.audio===false||save.settings.sfx===false||!ensure())return;if(!unlocked||ctx.state!=='running'){unlock().then(ok=>{if(ok)tone(freq,dur,type,gain)});return}const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=Math.max(.0001,gain);o.connect(g);g.connect(sfxBus);o.start();g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.stop(ctx.currentTime+dur)}
  function sting(kind){if(save.settings.audio===false||save.settings.sfx===false||!ensure()||!unlocked)return;const now=ctx.currentTime+.03;if(kind==='boss'){[38,50,37,49].forEach((n,i)=>osc(n,now+i*.12,.55,'sawtooth',.025,sfxBus));bell(26,now,.045,sfxBus)}else if(kind==='victory'){[48,52,55,60,64].forEach((n,i)=>bell(n,now+i*.16,.026,sfxBus))}else if(kind==='defeat'){[48,45,41,36].forEach((n,i)=>bell(n,now+i*.28,.025,sfxBus))}else if(kind==='wave'){[60,67].forEach((n,i)=>osc(n,now+i*.1,.25,'triangle',.018,sfxBus))}}
 return {unlock,setState,tone,sting,apply,get state(){return state},get unlocked(){return unlocked}};
})();
['pointerdown','touchend','keydown'].forEach(ev=>window.addEventListener(ev,()=>AUDIO.unlock(),{once:true,passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AUDIO.unlocked)AUDIO.unlock()});
function playTone(freq=220,dur=.08,type='sine',gain=.035){AUDIO.tone(freq,dur,type,gain)}
let lastUiClickSound=0;
function playUiClickSound(event){
 const control=event.target.closest?.('button,[role="button"]');
 if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;
 const now=performance.now();if(now-lastUiClickSound<45)return;lastUiClickSound=now;
 playTone(520,.055,'triangle',.06);
 playTone(840,.035,'sine',.035);
}
document.addEventListener('pointerup',playUiClickSound,true);
document.addEventListener('click',playUiClickSound,true);



/* ==========================================================================
   V32.1 — PROLOGUE & ROADMAP
   A first-run opening story, then a living checklist that reads real save
   state so every tick is earned rather than scripted.
   ========================================================================== */
const PROLOGUE=[
 {title:'The Last Safe Haven',
  body:'The old kingdoms are gone. Their roads are walked by things that do not tire, and their cathedrals ring for no one.<br><br>One village still stands.'},
 {title:'The Hunter',
  body:'You are Shadow, and you have come to the cathedral because there is nowhere further to go.<br><br>You carry a whip, a flask of holy water, and a dagger. It is not much. It is what there is.'},
 {title:'The Road Brings the Night',
  body:'Each nightfall the road delivers what the dark has made. Hold the gate and the village lives to see morning.<br><br>Fail, and there is no second haven.'},
 {title:'Build by Day, Hunt by Night',
  body:'What you win on the road becomes timber, stone and bread at home. What you raise at home walks back onto the road with you.<br><br>Neither half survives alone.'}
];
function villagePlacedCount(){
 try{const raw=STORAGE.get('theVillageFreshTownV1Plots');if(!raw)return 0;
  const d=JSON.parse(raw);return Object.values(d||{}).filter(Boolean).length}catch(_){return 0}
}
const ROADMAP=[
 {id:'deck',label:'Assemble your Battle Deck',
  hint:'Cards — equip six cards. You begin with six.',
  done:()=>(save.deck||[]).filter(Boolean).length>=6},
 {id:'chapter1',label:'Clear Chapter I — The Forgotten Cemetery',
  hint:'Campaign — hold the cathedral gate for eight waves.',
  done:()=>(save.campaign?.completed||[]).includes('cemetery')},
 {id:'artifact',label:'Claim the Heart of the Golem',
  hint:'It is carried by the Chapter I boss.',
  done:()=>(save.villageProgression?.artifacts||[]).includes('heart-of-the-golem')},
 {id:'awaken',label:'Return home — Shadow awakens to Level II',
  hint:'Walk to the cathedral after the road is won.',
  done:()=>!!save.villageProgression?.shadowAwakeningComplete||Number(save.shadowLevel||1)>=2},
 {id:'build',label:'Raise your first structure',
  hint:'Village — BUILD. You may raise a House, Farm, Lumber Camp, Quarry or Warehouse.',
  done:()=>villagePlacedCount()>0},
 {id:'research',label:'Complete your first research project',
  hint:'Village — Research. New roads unlock new projects.',
  done:()=>(save.villageProgression?.researched||[]).length>0}
];
function roadmapProgress(){const d=ROADMAP.filter(s=>{try{return s.done()}catch(_){return false}}).length;return {done:d,total:ROADMAP.length}}
function ensureJourneyDom(){
 if(document.getElementById('journeyLayer'))return;
 const el=document.createElement('div');
 el.id='journeyLayer';
 el.innerHTML=`
  <div id="prologueOverlay" class="journey-overlay hidden" role="dialog" aria-label="Prologue">
    <div class="journey-panel prologue-panel">
      <div class="journey-kicker">THE LAST SAFE HAVEN</div>
      <h2 id="prologueTitle"></h2>
      <p id="prologueBody"></p>
      <div class="journey-dots" id="prologueDots"></div>
      <div class="journey-actions">
        <button id="prologueSkip" class="journey-ghost" type="button">Skip</button>
        <button id="prologueNext" class="journey-primary" type="button">Continue</button>
      </div>
    </div>
  </div>
  <div id="roadmapOverlay" class="journey-overlay hidden" role="dialog" aria-label="Roadmap">
    <div class="journey-panel roadmap-panel">
      <div class="journey-kicker">YOUR FIRST STEPS</div>
      <h2>The Road Ahead</h2>
      <div class="roadmap-progress"><span id="roadmapBar"></span></div>
      <ol id="roadmapList" class="roadmap-list"></ol>
      <div class="journey-actions">
        <button id="roadmapClose" class="journey-primary" type="button">Begin</button>
      </div>
    </div>
  </div>
  <button id="roadmapBtn" class="roadmap-fab hidden" type="button" aria-label="Open the roadmap">🗺️<span></span></button>`;
 document.body.appendChild(el);

 let page=0;
 const ov=el.querySelector('#prologueOverlay');
 const paint=()=>{
  const p=PROLOGUE[page];
  el.querySelector('#prologueTitle').textContent=p.title;
  el.querySelector('#prologueBody').innerHTML=p.body;
  el.querySelector('#prologueDots').innerHTML=PROLOGUE.map((_,i)=>`<i class="${i===page?'on':''}"></i>`).join('');
  el.querySelector('#prologueNext').textContent=page===PROLOGUE.length-1?'Take up the whip':'Continue';
 };
 const finish=()=>{ov.classList.add('hidden');save.introSeen=true;saveProgress();openRoadmap(true)};
 el.querySelector('#prologueNext').addEventListener('click',()=>{ if(page<PROLOGUE.length-1){page++;paint()} else finish() });
 el.querySelector('#prologueSkip').addEventListener('click',finish);
 el.querySelector('#roadmapClose').addEventListener('click',()=>el.querySelector('#roadmapOverlay').classList.add('hidden'));
 el.querySelector('#roadmapBtn').addEventListener('click',()=>openRoadmap(false));
 window.__showPrologue=()=>{page=0;paint();ov.classList.remove('hidden')};
}
function renderRoadmap(){
 const list=document.getElementById('roadmapList');if(!list)return;
 const {done,total}=roadmapProgress();
 list.innerHTML=ROADMAP.map(step=>{
  let ok=false;try{ok=step.done()}catch(_){}
  return `<li class="${ok?'is-done':''}"><i>${ok?'✓':'○'}</i><div><b>${step.label}</b><small>${step.hint}</small></div></li>`;
 }).join('');
 const bar=document.getElementById('roadmapBar');
 if(bar)bar.style.width=Math.round(done/total*100)+'%';
 const fab=document.getElementById('roadmapBtn');
 if(fab){
  fab.classList.toggle('hidden',done>=total);
  const badge=fab.querySelector('span');
  if(badge)badge.textContent=`${done}/${total}`;
 }
}
function openRoadmap(auto){
 ensureJourneyDom();renderRoadmap();
 const ov=document.getElementById('roadmapOverlay');if(!ov)return;
 ov.classList.remove('hidden');
 const btn=document.getElementById('roadmapClose');
 if(btn)btn.textContent=auto?'Begin':'Close';
}
function initJourney(){
 ensureJourneyDom();renderRoadmap();
 if(!save.introSeen){ setTimeout(()=>window.__showPrologue?.(),420); }
 // keep the checklist honest as the player actually plays
 setInterval(renderRoadmap,4000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderRoadmap()});
}
try{initJourney()}catch(e){console.warn('Journey layer unavailable',e)}

function spawnEssencePickup(e,amount){
 const canvasRect=canvas.getBoundingClientRect(),c=cameraTransform(),sx=canvasRect.left+(c.x+e.x*GRID.tile*c.worldScale)*(canvasRect.width/W),sy=canvasRect.top+(c.y+e.y*GRID.tile*c.worldScale)*(canvasRect.height/H),target=document.querySelector('.essence-pill')?.getBoundingClientRect();
 const mote=document.createElement('span');mote.className='essence-fly';mote.textContent=amount>=10?'✦':'•';mote.style.left=sx+'px';mote.style.top=sy+'px';document.body.append(mote);G.pendingEssence+=amount;
 requestAnimationFrame(()=>{mote.style.transform=`translate(${(target?target.left+target.width/2:sx)-sx}px,${(target?target.top+target.height/2:20)-sy}px) scale(.45)`;mote.style.opacity='0'});
 battleDelay(()=>{mote.remove();if(!G||G.state!=='play'||G.completionStarted)return;G.pendingEssence=Math.max(0,G.pendingEssence-amount);G.essence+=amount;G.essenceEarned=(G.essenceEarned||0)+amount;renderEssenceVial();playTone(610,.045,'triangle',.018);if(canTriggerChoice(G))triggerEssenceDraft(false)},430,'essence pickup');
}
function towerTags(t){return {holy:['holy','cross','rosary','garlic','scripture'].includes(t.id),fire:['holy','bone'].includes(t.id),lightning:['clock','scripture'].includes(t.id)};}
function synergyFor(t){let damage=1,range=1,rate=1,holy=false,ignite=false;for(const n of G.towers){if(n===t)continue;const d=Math.abs(n.x-t.x)+Math.abs(n.y-t.y);if(d!==1)continue;if(n.supportOnly){const effect=n.supportEffect||SUPPORT_EFFECT_REGISTRY[n.id]||{};damage*=1+(Number(effect.damage)||0);rate*=1+(Number(effect.attackSpeed)||0);range*=1+(Number(effect.range)||0);holy=holy||!!effect.holy;continue;}if(t.id==='dagger'&&n.id==='holy'){holy=true;damage*=1.22}if(t.id==='clock'&&n.id==='holy'){range*=1.18;damage*=1.12}if(t.id==='axe'&&n.id==='bone'){ignite=true;damage*=1.2}if(t.id==='whip'&&n.id==='rosary'){rate*=1.18}}
 return {damage,range,rate,holy,ignite};}
const TOWER_AOE_SCALE=.5; // V32.2.2: all tower attack/AoE radii are reduced by half.
function towerCombatRange(t){
 const syn=synergyFor(t),weather=G.weather.id==='fog'?.88:1;
 const base=Math.max(1.05,Number(t.range)||1.35),rangeUpgrade=Number(t.upgradeRange||0)*.30;
  const holyRange=towerTags(t).holy?relicEffect('holyTowerRange'):0;
  return (base+rangeUpgrade+Math.min(.20,((t.level||1)-1)*.05))*syn.range*weather*(1+holyRange+relicEffect('towerRange'))*(1+(G.towerRangeBonus||0)+(linkedSupportEffects(t).range||0)+leadershipForTower(t).range)*TOWER_AOE_SCALE;
}
function enemyInsideTowerAOE(t,e){return !e.dead&&Math.hypot(e.x-(t.x+.5),e.y-(t.y+.5))<=towerCombatRange(t);}
function cardUpgradeState(id){
 G.cardUpgrades=G.cardUpgrades||{};
 return G.cardUpgrades[id]||(G.cardUpgrades[id]={damage:0,range:0,rate:0});
}
function towerUpgradeCost(t,stat){const state=cardUpgradeState(t.id),rank=Number(state[stat]||0);return 1+Math.floor(rank/2)}
function towerUpgradeMax(stat){return stat==='range'?3:5}
function essenceTowerUpgradeCost(t,stat){const rank=Number(t?.runEssenceUpgrades?.[stat]||0);return 8+rank*6+(stat==='range'?3:0)}
function essenceUpgradeSelectedTower(stat){
 const t=G?.selectedTower;if(!t||t.supportOnly)return;const upgrades=t.runEssenceUpgrades||(t.runEssenceUpgrades={damage:0,rate:0,range:0}),rank=upgrades[stat]||0,max=stat==='range'?3:5,cost=essenceTowerUpgradeCost(t,stat);
 if(rank>=max)return showToast('This run upgrade is already complete');if(G.essence<cost)return showToast(`Need ${cost-G.essence} more Essence`);
 G.essence-=cost;G.essenceSpent=(G.essenceSpent||0)+cost;G.lastMeaningfulDecisionAt=G.time;upgrades[stat]=rank+1;
 if(stat==='damage')t.damage*=1.18;else if(stat==='rate')t.rate=Math.max(.18,t.rate*.9);else t.upgradeRange=(t.upgradeRange||0)+1;
 burst(t.x+.5,t.y+.5,'#cbb7ff',18);showToast(`${t.name} reinforced for ${cost} Essence`);renderEssenceVial();renderInspector();
}
function applyCardBattleUpgradesToTower(t){
 const state=cardUpgradeState(t.id);t.level=1+Math.max(state.damage||0,state.range||0,state.rate||0);t.upgradeDamage=state.damage||0;t.upgradeRange=state.range||0;t.upgradeRate=state.rate||0;
 if(t.upgradeDamage)t.damage*=Math.pow(1.24,t.upgradeDamage);
 if(t.upgradeRate)t.rate=Math.max(.18,t.rate*Math.pow(.86,t.upgradeRate));
}

function closeBattleUpgradeMenu(){
 const el=$('#battleUpgradeModal');if(el)el.classList.add('hidden');
 if(!G)return;G.upgradeModalOpen=false;if(G.upgradeModalWasPaused===false)G.paused=false;G.upgradeModalWasPaused=null;
}
function renderBattleUpgradeMenu(forceOpen=false){
 const el=$('#battleUpgradeModal');if(!el||!G)return;
 const representatives=[];const seen=new Set();
 for(const t of G.towers.filter(t=>!t.supportOnly&&!t.destroyed)){if(!seen.has(t.id)){seen.add(t.id);representatives.push(t)}}
 if(forceOpen&&!G.upgradeModalOpen){G.upgradeModalWasPaused=!!G.paused;G.upgradeModalOpen=true;G.paused=true;}
 if(!G.upgradeModalOpen)return;el.classList.remove('hidden');const points=G.battlePoints||0;
 el.innerHTML=`<div class="battle-upgrade-card"><button class="battle-upgrade-close" type="button" aria-label="Close">×</button><div class="battle-upgrade-kicker">BATTLE LEVEL ${G.level}</div><h2>Upgrade an Entire Card Type</h2><p class="battle-upgrade-summary">Available: <b>${points}</b> · Upgrades affect every placed and future copy of that tower for this hunt.</p><div class="battle-upgrade-list">${representatives.length?representatives.map((t,i)=>{const state=cardUpgradeState(t.id),count=G.towers.filter(x=>!x.supportOnly&&!x.destroyed&&x.id===t.id).length;const button=(stat,label)=>{const rank=state[stat]||0,max=towerUpgradeMax(stat),cost=towerUpgradeCost(t,stat),disabled=rank>=max||points<cost;return `<button data-modal-tower="${i}" data-modal-stat="${stat}" ${disabled?'disabled':''}>${label}<small>Lv ${rank}/${max} · ${cost} pt</small></button>`};return `<article class="battle-upgrade-row"><div class="battle-upgrade-name"><span>${t.icon}</span><div><b>All ${t.name}s</b><small>${count} deployed</small></div></div><div class="battle-upgrade-actions">${button('damage','⚔ ATK')}${button('rate','⚡ Speed')}${button('range','◎ Radius')}</div></article>`}).join(''):'<div class="battle-upgrade-empty">Place an attack tower first. Your points remain available.</div>'}</div><div class="battle-tactical-actions"><button class="battle-swap-towers" type="button">⇄ Swap Two Towers</button><button class="battle-move-tower" type="button">✥ Move One Tower</button></div><button class="battle-upgrade-later" type="button">Save Points for Later</button></div>`;
 el.querySelector('.battle-upgrade-close').onclick=closeBattleUpgradeMenu;el.querySelector('.battle-upgrade-later').onclick=closeBattleUpgradeMenu;
 el.querySelector('.battle-swap-towers').onclick=()=>beginTowerEdit('swap');el.querySelector('.battle-move-tower').onclick=()=>beginTowerEdit('move');
 el.querySelectorAll('[data-modal-tower]').forEach(btn=>btn.onclick=()=>{const t=representatives[Number(btn.dataset.modalTower)];if(!t)return;const manuallySelected=G.selectedTower;G.selectedTower=t;upgradeSelectedTower(btn.dataset.modalStat,false);G.selectedTower=manuallySelected;renderInspector();if((G.battlePoints||0)>0)renderBattleUpgradeMenu();else closeBattleUpgradeMenu();});
}

function openBattleUpgradeMenu(){if(!G)return;if((G.battlePoints||0)<=0)return showToast('Earn Battle XP to gain an Upgrade Point');renderBattleUpgradeMenu(true)}
function grantBattleXp(amount=1){const mult=G.weather.id==='blood'?1.4:1;G.xp+=amount*mult;let earned=0;while(G.xp>=G.xpNeed){G.xp-=G.xpNeed;G.level++;G.battlePoints=(G.battlePoints||0)+1;earned++;G.xpNeed=Math.ceil(G.xpNeed*1.32);showToast(`Battle Level ${G.level} — choose a card-wide upgrade`);floatText(GRID.cols/2,1.35,'+1 UPGRADE POINT','#ffe28a');playTone(690,.12,'triangle',.04)}if(earned){const session=battleSessionId;setTimeout(()=>{if(session===battleSessionId&&G&&G.state==='play'&&document.body.classList.contains('battle-mode'))renderBattleUpgradeMenu(true)},120)}}
function upgradeSelectedTower(stat,showDetails=true){
 const t=G?.selectedTower;if(!t||t.supportOnly)return;const state=cardUpgradeState(t.id),max=towerUpgradeMax(stat),rank=Number(state[stat]||0);if(rank>=max)return showToast(`${stat==='range'?'Radius':stat==='rate'?'Speed':'ATK'} is already Level ${max}`);const cost=towerUpgradeCost(t,stat);if((G.battlePoints||0)<cost)return showToast(`Need ${cost} Upgrade Point${cost===1?'':'s'}`);
 G.battlePoints-=cost;state[stat]=rank+1;
 const affected=G.towers.filter(x=>!x.supportOnly&&!x.destroyed&&x.id===t.id);
 for(const tower of affected){tower.level=1+Math.max(state.damage||0,state.range||0,state.rate||0);if(stat==='damage'){tower.upgradeDamage=(tower.upgradeDamage||0)+1;tower.damage*=1.24}else if(stat==='range')tower.upgradeRange=(tower.upgradeRange||0)+1;else if(stat==='rate'){tower.upgradeRate=(tower.upgradeRate||0)+1;tower.rate=Math.max(.18,tower.rate*.86)}burst(tower.x+.5,tower.y+.5,'#ffe28a',24)}
 showToast(`All ${t.name}s · ${stat==='range'?'Radius':stat==='rate'?'Speed':'ATK'} Level ${state[stat]}/${max}`);if(showDetails)renderInspector();const bp=$('#battlePointTxt');if(bp)bp.textContent=G.battlePoints||0;
}

window.upgradeSelectedTower=upgradeSelectedTower;window.openBattleUpgradeMenu=openBattleUpgradeMenu;
function awardRelic(){const pool=RELICS.filter(r=>!save.unlockedRelics.includes(r.id)),r=pool.length?pool[Math.floor(Math.random()*pool.length)]:RELICS[Math.floor(Math.random()*RELICS.length)],oldAttackSpeed=relicEffect('heroAttackSpeed');if(oldAttackSpeed)G.hero.rate*=1+oldAttackSpeed;G.relic=r;const newAttackSpeed=relicEffect('heroAttackSpeed');if(newAttackSpeed)G.hero.rate/=1+newAttackSpeed;if(relicEffect('killExplosionEvery'))G.relicKillCount=0;$('#relicTxt').textContent=r.name;if(!save.unlockedRelics.includes(r.id))save.unlockedRelics.push(r.id);saveProgress();showToast(`Relic discovered: ${r.name}`)}
function enemyDeath(e){if(e.type==='skeleton')for(let i=0;i<18;i++)G.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*4,vy:-Math.random()*3,life:.6+Math.random()*.5,color:'#d8d0be'});else if(e.type==='ghost')burst(e.x,e.y,'#bda8ff',28);else if(e.type==='vampire')for(let i=0;i<9;i++)G.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:.8,color:'#632b78'});else burst(e.x,e.y,e.boss?'#d6b1ff':'#ba233e',e.boss?70:14);const motes=e.boss?12:e.elite?7:4;for(let i=0;i<motes;i++)G.particles.push({x:e.x+(Math.random()-.5)*.25,y:e.y+(Math.random()-.5)*.2,vx:(Math.random()-.5)*.25,vy:-.55-Math.random()*.35,life:1.1+Math.random()*.55,color:'#cdb7ff',kind:'soul',phase:Math.random()*6.28})}
// V32.1 — one place to retune the entire campaign difficulty curve.
const DIFFICULTY={
 baseline:3.05,        // flat multiplier applied to every enemy's base HP
 bossBaseline:1.25,    // bosses already carry authored stage HP; do not triple it again
 perWave:0.19,         // how much each wave adds within a road
 waveEase:1.08,        // >1 makes later waves ramp faster than early ones
 perChapter:1.055,     // progression-aware step-up; authored enemy pools add later pressure
 perChapterDamage:0.04 // enemies also hit slightly harder each chapter
};
function spawnEnemy(){
 const mini=G.wave===5&&G.spawnLeft===1&&!G.miniBossDefeated;
 const boss=G.wave===G.chapterWaves&&G.spawnLeft===1;
 const deep=(G.chapter?.number||1)>=11;const roll=Math.random();let type='skeleton';if(!boss&&!mini){if(deep){if(roll<.13)type='ghoul';else if(roll<.24)type='watcher';else if(roll<.34)type='revenant';else if(roll<.44)type='gazer';else if(roll<.53)type='gravelord';else if(roll<.61)type='dreadeye';else if(roll<.69)type='armor';else if(roll<.77)type='vampire';else if(roll<.84)type='ghost';else if(roll<.90)type='wolf';else if(roll<.95)type='bat';}else{if(G.wave>=3&&roll<.16)type='wolf';else if(G.wave>=4&&roll<.29)type='bat';else if(G.wave>=6&&roll<.40)type='ghost';else if(G.wave>=7&&roll<.52)type='armor';else if(G.wave>=8&&roll<.60)type='vampire'}}
 let base={skeleton:30,wolf:24,bat:20,ghost:28,armor:70,vampire:46,ghoul:44,revenant:82,gravelord:145,watcher:36,gazer:64,dreadeye:104}[type]||30;
 let speed={skeleton:.55,wolf:.82,bat:.76,ghost:.5,armor:.34,vampire:.62,ghoul:.46,revenant:.38,gravelord:.27,watcher:.90,gazer:.72,dreadeye:.56}[type]||.55;
 let reward={skeleton:7,wolf:8,bat:8,ghost:11,armor:16,vampire:14,ghoul:12,revenant:19,gravelord:27,watcher:14,gazer:21,dreadeye:29}[type]||7;
 let name={skeleton:'Bone Soldier',wolf:'Night Wolf',bat:'Nightwing Bat',ghost:'Castle Ghost',armor:'Axe Armor',vampire:'Vampire Spawn',ghoul:'Ravenous Ghoul',revenant:'Plague Revenant',gravelord:'Gravelord',watcher:'Pale Watcher',gazer:'Void Gazer',dreadeye:'Dread Eye'}[type];save.discoveredEnemies[type]=true;
 if(mini){type='necromancer';base=260;speed=.30;reward=55;name='Grave Necromancer'}
 if(boss){const b=G.chapter?.boss||{id:'warden',name:'The Eclipse Warden',hp:520,speed:.28,reward:140};type=b.id;base=b.hp;speed=b.speed;reward=b.reward;name=b.name;save.discoveredEnemies[type]=true}
 // V32.1 — difficulty now ramps across the campaign, not just within a road.
 // Before this, a Chapter 20 wave 1 enemy had exactly the same HP as a
 // Chapter 1 wave 1 enemy; the only thing that changed was the boss.
 //   chapterCurve : each road is a measured step up (1.09^n)
 //   waveCurve    : slightly eased early so a fresh deck can find its feet
 // Both live in DIFFICULTY so the whole campaign can be retuned from one place.
 const chapterNum=Math.max(1,G.chapter?.number||1);
 const chapterCurve=Math.pow(DIFFICULTY.perChapter,chapterNum-1);
 const waveCurve=1+Math.pow(Math.max(0,G.wave-1),DIFFICULTY.waveEase)*DIFFICULTY.perWave;
 const onboardingHealth=boss?(EARLY_STAGE_DIFFICULTY[chapterNum]?.bossHealth||1):(EARLY_STAGE_DIFFICULTY[chapterNum]?.enemyHealth||1);
 let hp=base*waveCurve*chapterCurve*(G.weather.id==='blood'?1.18:1)*(boss?DIFFICULTY.bossBaseline:DIFFICULTY.baseline)*(1+relicEffect('enemyHealth'))*onboardingHealth;
 // Enemies also hit a little harder as the roads darken.
 const damageCurve=1+(chapterNum-1)*DIFFICULTY.perChapterDamage;
 const elite=!boss&&!mini&&G.wave>=3&&Math.random()<Math.min(.25,.06+G.wave*.014);if(elite){hp*=1.65;speed*=1.10;reward=Math.round(reward*1.70);name='Elite '+name;}
 const routeIndex=chooseSpawnRoute(),points=routePoints(routeIndex),outer=points[0];G.enemies.push({x:outer.x,y:outer.y,routeIndex,seg:0,prog:0,hp,max:hp,speed:speed*(1+Math.min(.25,G.wave*.006)),reward:Math.round(reward*(G.weather.id==='fog'?1.2:G.weather.id==='blood'?1.3:1)*(1+(save.kingdom.buildings.market||0)*.03)*villageBattleBonuses().reward),boss,mini,elite,type,name,slow:1,freeze:0,burn:0,dead:false,summonTimer:mini?4:boss?5:0,armor:type==='armor'?.45:type==='revenant'?.28:type==='gravelord'?.46:0,holyOnly:type==='ghost'||type==='gazer',air:type==='bat'||type==='watcher'||type==='gazer'||type==='dreadeye',attacking:false,attackTimer:0,attackRate:boss?0.78:(elite?0.92:1.18),attackDamage:Math.max(1,Math.round((boss?2:1)*damageCurve)),golemForm:boss&&type==='golem'?(G.chapter.number>=5&&G.chapter.number<=9?2:1):0,golemTransforming:false,towerDestroyTimer:6,bossPauseMarkers:boss?[.20,.58]:[],bossPauseDone:[],cinematicPause:0});
 const spawned=G.enemies[G.enemies.length-1];telemetryEnemySpawn(spawned,G.time);
 if(boss){G.boss=true;beginBossCinematic(spawned)}else if(mini){showToast('MINIBOSS: Grave Necromancer')}
 if(G.queuedSkills?.length){const armed=G.queuedSkills.shift(),target=G.enemies.find(e=>!e.dead);battleDelay(()=>{if(G&&target&&!target.dead)castSkill(armed,target.x,target.y);},120,'queued skill')}
}
function destroyTowerByGolem(e){
 const candidates=G.towers.filter(t=>!t.destroyed);
 if(!candidates.length){showToast('The final Golem strikes, but no towers remain');return;}
 const victim=candidates[Math.floor(Math.random()*candidates.length)];
 const removed=new Set([victim]);
 for(const support of G.towers)if(support.supportOnly&&support.supportTarget===victim)removed.add(support);
 G.towers=G.towers.filter(t=>!removed.has(t));
 if(G.selectedTower&&removed.has(G.selectedTower))G.selectedTower=null;
 burst(victim.x+.5,victim.y+.5,'#ff7a55',55);bossShake(.30,0,1,.36);G.flash=Math.max(G.flash,.18);
 showToast(`${e.name} shattered ${victim.name}!`);playTone(68,.32,'sawtooth',.075);
}
function updateGolemBoss(e,dt){
 if(!e.boss||e.type!=='golem')return;
 const finalChapter=G.chapter?.number===10;
 if(finalChapter){
  const ratio=Math.max(0,e.hp/e.max),next=ratio<=.34?3:ratio<=.67?2:1;
  if(next>e.golemForm){e.golemForm=next;if(next===3)mgsMetalGear(e);e.name=next===3?'Cataclysm Golem':next===2?'Awakened Golem':'Stone Golem';e.hitFlash=.5;G.flash=.4;bossShake(next===3?.42:.28,0,-1,.55);hitPause(next===3?120:80);burst(e.x,e.y,next===3?'#ff5a3d':'#d7a45f',90);showToast(next===3?'FINAL TRANSFORMATION — TOWERS ARE IN DANGER!':'THE GOLEM TRANSFORMS!');AUDIO.sting('boss');}
 }
 if(e.golemForm===3){e.towerDestroyTimer=(e.towerDestroyTimer??6)-dt;if(e.towerDestroyTimer<=0){e.towerDestroyTimer=6;destroyTowerByGolem(e);}}
}
function bossRouteProgress(e){const points=routePoints(e.routeIndex||0);return points.length>1?Math.max(0,Math.min(1,(e.seg+e.prog)/(points.length-1))):0}
function focusCameraOnBoss(e,hold=1.05){
 if(!G||!e||e.dead)return;
 const from={...G.camera},to=cameraTargetForWorld(e.x*GRID.tile,e.y*GRID.tile,Math.min(CAMERA_LIMITS.maxZoom,Math.max(1.34,G.camera.zoom*1.32)));
 G.cameraTour={phase:'out',time:0,duration:.42,hold,from,to,back:{zoom:1,panX:0,panY:0},onComplete:null};
}
function updateBossPresentation(e,dt){
 if(!e?.boss)return false;
 if((e.cinematicPause||0)>0){e.cinematicPause=Math.max(0,e.cinematicPause-dt);return true;}
 const progress=bossRouteProgress(e),markers=e.bossPauseMarkers||[];
 for(let i=0;i<markers.length;i++){
  if(progress>=markers[i]&&!e.bossPauseDone?.includes(i)){
   e.bossPauseDone=e.bossPauseDone||[];e.bossPauseDone.push(i);e.cinematicPause=i===0?1.55:1.25;
   focusCameraOnBoss(e,i===0?.9:.72);showToast(`${e.name} halts the advance`);return true;
  }
 }
 return false;
}
function daggerLaneLength(t){return Math.max(3,Math.min(5,3+(Math.max(1,t.level||1)-1)))}
function daggerDirection(t,target){
 const dx=target.x-(t.x+.5),dy=target.y-(t.y+.5);
 return Math.abs(dx)>=Math.abs(dy)?{x:Math.sign(dx)||1,y:0}:{x:0,y:Math.sign(dy)||1};
}
function enemyInDaggerLane(t,e,dir,length){
 if(e.dead)return false;const rx=e.x-(t.x+.5),ry=e.y-(t.y+.5),forward=rx*dir.x+ry*dir.y,side=Math.abs(rx*dir.y-ry*dir.x);
 return forward>=0&&forward<=length&&side<=.48;
}
function targetFor(t){
 if(t.id==='dagger'){
  let best=null,bp=-1;
  for(const e of G.enemies){if(e.dead)continue;const dx=e.x-(t.x+.5),dy=e.y-(t.y+.5),dir=Math.abs(dx)>=Math.abs(dy)?{x:Math.sign(dx)||1,y:0}:{x:0,y:Math.sign(dy)||1};if(enemyInDaggerLane(t,e,dir,daggerLaneLength(t))&&(e.seg+e.prog)>bp){best=e;bp=e.seg+e.prog}}
  return best;
 }
 let best=null,bp=-1;for(const e of G.enemies){if(enemyInsideTowerAOE(t,e)&&(e.seg+e.prog)>bp){best=e;bp=e.seg+e.prog}}return best
}
function scriptureBibleCount(t){return Math.max(1,Math.min(6,t.level||1));}
function scriptureOrbitPoint(t,index,count,lead=0){const phase=(G?.time||0)*(1.25+.08*(t.level||1))+index*Math.PI*2/count+lead;const radius=.48+.035*Math.sin((G?.time||0)*2.2+index);return{x:t.x+.5+Math.cos(phase)*radius,y:t.y+.5+Math.sin(phase)*radius*.72};}
function fireScripture(t){
 const syn=synergyFor(t),tags=towerTags(t),count=scriptureBibleCount(t),range=towerCombatRange(t);
 const candidates=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-(t.x+.5),e.y-(t.y+.5))<=range).sort((a,b)=>(b.seg+b.prog)-(a.seg+a.prog));
 if(!candidates.length)return false;
 let base=t.damage*G.globalDamage*syn.damage*(t.elite?1.5:1)*(t.permanentPower||1)*(G.hero.def?.bonus.tower||1);
 if(G.weather.id==='rain')base*=1.18;base*=1+relicEffect('holyTowerDamage');
 const supports=t.supports||[];let supportSlow=1,shotBurn=0;for(const sp of supports){if(sp.id==='holy'){base*=1.08*sp.power;shotBurn=5*sp.power}else if(sp.id==='freeze')supportSlow=Math.min(supportSlow,.62);else if(sp.id==='guardian')base*=1.05*sp.power;}
 for(let i=0;i<count;i++){
  const target=candidates[i%candidates.length],origin=scriptureOrbitPoint(t,i,count,.12);
  G.shots.push({x:origin.x,y:origin.y,px:origin.x,py:origin.y,target,speed:12,damage:base*(1+.10*(t.level-1)),color:'#ffe58a',aoe:0,pierce:0,slow:supportSlow,burn:shotBurn,holy:true,source:t,kind:'scripture',bibleIndex:i,spin:0,life:1.15,chain:t.level>=3?Math.min(2,t.level-2):0});
 }
 burst(t.x+.5,t.y+.5,'#ffe58a',Math.min(16,4+count*2));G.cameraPulse=Math.min(1,G.cameraPulse+.12);playTone(520+count*24,.07,'triangle',.05);
 t.t=t.rate/(1+.10*(t.level-1))/syn.rate;return true;
}
function fire(t,e){towerFireFX(t,e);const fireFreq=t.id==='axe'?145:t.id==='dagger'?520:t.id==='holy'?690:t.id==='bone'?210:330,fireType=t.id==='bone'?'sawtooth':'triangle';playTone(fireFreq,.06,fireType,.06);playTone(fireFreq*1.55,.03,'square',.028);if(t.id==='scripture'){fireScripture(t);return;}const syn=synergyFor(t),tags=towerTags(t);let shotSupportBurn=0,supportSlow=1;let dmg=t.damage*G.globalDamage*syn.damage*(t.elite?1.5:1)*(t.permanentPower||1)*(G.hero.def?.bonus.tower||1);if(t.id==='familiar')dmg*=G.hero.def?.bonus.familiar||1;const supports=t.supports||[];for(const s of supports){if(s.id==='holy'){dmg*=1.08*s.power;shotSupportBurn=5*s.power}else if(s.id==='freeze'){supportSlow=Math.min(supportSlow,.62)}else if(s.id==='guardian'){dmg*=1.05*s.power}}if(e.air&&['dagger','familiar','cross'].includes(t.id))dmg*=1.45;if(e.type==='armor'&&t.id==='axe')dmg*=1.6;if(G.weather.id==='rain'&&tags.fire)dmg*=.8;if(G.weather.id==='rain'&&(tags.holy||tags.lightning))dmg*=1.18;if(tags.holy)dmg*=1+relicEffect('holyTowerDamage');
 const gemFx=towerGemEffects(t),supportFx=linkedSupportEffects(t),leadership=leadershipForTower(t);
 const profaneTarget=['skeleton','ghost','vampire','necromancer','golem','ghoul','revenant','gravelord','dreadeye'].includes(e.type)||e.boss;
 dmg*=1+(supportFx.damage||0)+leadership.damage+(gemFx.armorPenetration||0)+(profaneTarget?((supportFx.holyDamage||0)+(gemFx.holyDamage||0)):0)+(e.boss?((gemFx.bossDamage||0)+(supportFx.bossDamage||0)+(G.towerBossDamage||0)+leadership.boss):0);
 if(Math.random()<(G.towerCritChance||0)+(supportFx.criticalChance||0)+leadership.crit)dmg*=1.6+(gemFx.criticalDamage||0);
 const gemBurn=(gemFx.burnDps||0)*20,gemPoison=((gemFx.poisonDps||0)+(supportFx.poisonDps||0))*20,gemFreeze=(gemFx.freezeChance&&Math.random()<gemFx.freezeChance) ? .8 : 0;
 supportSlow=Math.min(supportSlow,1-(supportFx.slow||0),1-(gemFx.slow||0));
 if(gemFreeze)supportSlow=Math.min(supportSlow,.08);shotSupportBurn+=gemPoison;
 if(gemFx.lifeSteal)G.hp=Math.min(G.maxHp,G.hp+dmg*gemFx.lifeSteal*.05);
 if(gemFx.chainChance&&Math.random()<gemFx.chainChance){for(const chained of G.enemies.filter(other=>!other.dead&&other!==e&&Math.hypot(other.x-e.x,other.y-e.y)<1.5).slice(0,2)){hit(chained,dmg*(gemFx.chainDamage||.35),{holy:(gemFx.holyDamage||0)>0,noCrit:true,kind:'gemChain'});burst(chained.x,chained.y,'#ffe072',7)}}
 if(t.id==='dagger'){
  const dir=daggerDirection(t,e),length=daggerLaneLength(t),victims=G.enemies.filter(target=>enemyInDaggerLane(t,target,dir,length));
  for(const target of victims){hit(target,dmg,{holy:tags.holy||syn.holy,source:t,kind:'daggerLane'});if(supportSlow<1)target.slow=Math.min(target.slow,supportSlow);if(shotSupportBurn)target.burn=Math.max(target.burn||0,shotSupportBurn)}
  G.laneShots=G.laneShots||[];G.laneShots.push({x:t.x+.5,y:t.y+.5,dx:dir.x,dy:dir.y,length,life:.18,maxLife:.18,color:t.color,kind:'gothicDagger'});
  burst(t.x+.5,t.y+.5,t.color,5);t.t=1/Math.max(.4,syn.rate*(1+.12*(t.level-1)));return;
 }
 if(t.id==='garlic'){
  const radius=towerCombatRange(t);let hits=0;
  for(const target of G.enemies){if(enemyInsideTowerAOE(t,target)){hit(target,dmg,{holy:true,source:t});target.slow=Math.min(target.slow,t.slow||.78);hits++;}}
  burst(t.x+.5,t.y+.5,t.color,Math.min(18,5+hits*2));t.t=t.rate/(1+.12*(t.level-1))/syn.rate;return;
 }
 burst(t.x+.5,t.y+.5,t.color,3);G.cameraPulse=Math.min(1,G.cameraPulse+.08);G.shots.push({x:t.x+.5,y:t.y+.5,px:t.x+.5,py:t.y+.5,target:e,speed:7,damage:dmg,color:t.color,aoe:t.aoe||0,pierce:t.pierce||0,slow:Math.min(t.slow||1,supportSlow),burn:(t.burn||0)+(syn.ignite?3:0)+shotSupportBurn+gemBurn,poison:gemPoison,freeze:gemFreeze?.7:0,chainChance:gemFx.chainChance||0,chainDamage:gemFx.chainDamage||0,holy:tags.holy||syn.holy||(gemFx.holyDamage||0)>0,source:t,kind:t.projectileKind||coreTower(t.id)?.projectile||t.id,spin:Math.random()*6.28,life:2});t.t=t.rate/(1+.12*(t.level-1))/syn.rate/(1+(G.towerRateBonus||0)+(supportFx.attackSpeed||0)+leadership.rate)}
// Enemy kills now award in-stage resources only. Permanent card progression is
// settled once at stage completion so fast-kill builds cannot farm copies.
function rollCardDrop(){return false;}
function showCardDrop(c,item){const b=$('#dropBanner');if(!b)return;b.className='drop-banner rarity-common';b.innerHTML=`<div>✦ COMMON CARD DROP ✦</div><strong>${c.icon} ${c.name}</strong><div class="small">Common copy · ${item.copies} copies${item.copies>=3?' · MERGE READY':''}</div>`;b.classList.remove('hidden');battleDelay(()=>b.classList.add('hidden'),1800,'drop banner');playTone(660,.18,'triangle',.06)}
function enemyEssenceReward(e){
 const raw=Math.max(1,e.reward/7*(1+relicEffect('essenceGain'))*(e.elite?1+relicEffect('eliteEssence'):1));
 const base=dynamicEssenceReward(e,G,raw);
 if(G.familiar?.id!=='faerie')return base;
 const accrued=(G.faerieEssenceRemainder||0)+base*.10,bonus=Math.floor(accrued+1e-9);
 G.faerieEssenceRemainder=accrued-bonus;
 return base+bonus;
}
// V32.7.0 damage pipeline: defense/resistance first, critical multiplier second,
// then a visible skill floor. This prevents criticals and multi-hit holy skills from collapsing to 1.
function hit(e,d,shot=null){e.hitFlash=.11;if(!e.boss&&!e.attacking&&!e.dead)e.hurtT=ENEMY_ANIM.hurt;e.hitKick=Math.min(.16,(e.hitKick||0)+.055);const rawDamage=Math.max(0,Number(d)||0);if(e.holyOnly&&!shot?.holy)d*=.22;if(e.armor&&!shot?.holy)d*=1-e.armor*(relicEffect('enemyArmorMultiplier')||1);if(e.air)d*=1+relicEffect('flyingDamage');if(e.boss)d*=1+relicEffect('bossDamage');const crit=!shot?.noCrit&&shot?.source==null&&G.hero&&Math.random()<G.hero.crit;if(crit){const critFloor=Math.max(8,rawDamage*.85,(G.hero.damage||10)*.55);d=Math.max(d*(G.hero.critDamage||1.9),critFloor);G.flash=Math.max(G.flash,.08);hitPause(48)}d=Math.max(shot?.skill?(shot?.holy?5:3):0,d);e.hp-=d;if(e.hp<=0&&e.boss&&G)G.lastBossDeath={x:e.x,y:e.y,form:e.golemForm||1,type:e.type,name:e.name};impactFeedback(e,d,crit,shot);if(e.hp<=0&&!e.dead){e.dead=true;spawnCorpse(e);deathBurst(e);if((e.boss||e.elite)&&navigator.vibrate)navigator.vibrate(e.boss?[35,30,55]:25);G.kills++;grantFamiliarXp(e.boss?18:e.elite?5:2);G.killChain++;G.comboTimer=2.4;G.comboBest=Math.max(G.comboBest||0,G.killChain);const essenceGain=enemyEssenceReward(e);spawnEssencePickup(e,essenceGain);
 const comboNames={2:'DOUBLE KILL',3:'TRIPLE KILL',5:'HOLY PURGE',8:'UNDEAD SLAUGHTER',12:'NIGHT CLEANSER'};if(comboNames[G.killChain]){floatText(GRID.cols/2,1.7,comboNames[G.killChain],'#ffe28a');playTone(420+G.killChain*18,.12,'triangle',.045)}const battleXp=e.boss?6:e.mini?4:e.elite?2:1;grantBattleXp(battleXp);floatText(e.x,e.y,`+${battleXp} battle XP`,'#ffe28a');floatText(e.x,e.y+.18,'+'+essenceGain+' essence','#d8c7ff');playTone(120+Math.random()*45,.05,'square',.018);rollCardDrop(e);enemyDeath(e);G.relicKillCount=(G.relicKillCount||0)+1;const explosionEvery=relicEffect('killExplosionEvery');if(explosionEvery&&G.relicKillCount%explosionEvery===0){burst(e.x,e.y,'#ffe7a4',32);floatText(e.x,e.y-.25,'RELIC EXPLOSION','#ffe7a4');playTone(190,.12,'sawtooth',.04);for(const o of [...G.enemies])if(!o.dead&&o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<1.5)hit(o,24,{holy:true,noCrit:true,kind:'ringExplosion'})}if(e.mini){G.miniBossDefeated=true;awardRelic()}}}
function weightedChoices(pool,count=3){
 const available=[...pool],out=[];
 while(out.length<count&&available.length){
  const total=available.reduce((a,c)=>a+(G.drawWeights[c.id]??1),0);let r=Math.random()*total,idx=0;
  for(;idx<available.length;idx++){r-=G.drawWeights[available[idx].id]??1;if(r<=0)break}
  out.push(available.splice(Math.min(idx,available.length-1),1)[0]);
 }
 return out;
}
function renderEssenceVial(){
 if(!G)return;
 const next=nextChoiceMilestone(G),previous=G.recentDraftMilestone||0,done=!Number.isFinite(next);
 $('#goldTxt').textContent=done?`${Math.floor(G.essence)} TO SPEND`:`${Math.floor(G.essence)} · ${Math.floor(G.essenceEarned||0)}/${next}`;
 const ef=document.querySelector('.essence-fill');if(ef)ef.style.width=`${done?100:Math.min(100,100*Math.max(0,(G.essenceEarned||0)-previous)/Math.max(1,next-previous))}%`;
 const pill=document.querySelector('.essence-pill');if(pill)pill.classList.toggle('vial-full',!done&&(G.essenceEarned||0)>=next);
}
function triggerEssenceDraft(opening=false){
 if(!G||G.state!=='play'||G.draftOpen||!canTriggerChoice(G,opening))return;
 G.draftOpen=true;renderEssenceVial();
 showWaveReward(G.wave,opening);
}
function showWaveReward(completedWave,opening=false,choicesOverride=null){
 G.paused=true;G.pendingWave=true;G.pendingCard=null;G.draftOpen=true;
 // Opening draft must establish a real defense: all three choices are placeable towers.
 // Support, skill, hero, and road-system cards return on later Essence drafts.
 const openingPool=G.hand.filter(c=>c.type==='tower');
 const limits=battlefieldLimits(G),draftPool=weightedDraftPool(G.hand,G,TACTICAL_CHOICE_REGISTRY,limits);
 let baseChoices=choicesOverride||weightedChoices(opening?openingPool:draftPool,3);
 const towerOfferTarget=Math.min(limits.attack,choiceTier(G).towerOfferUntil||4);
 if(!choicesOverride&&!opening&&G.towers.filter(t=>!t.supportOnly).length<towerOfferTarget&&!baseChoices.some(c=>c.type==='tower')){const tower=weightedChoices(G.hand.filter(c=>c.type==='tower'&&!baseChoices.some(choice=>choice.id===c.id)),1)[0];if(tower)baseChoices[baseChoices.length-1]=tower;}
 const choices=choicesOverride||baseChoices.map(c=>{const choice=Math.random()<.16&&c.type==='tower'?{...c,elite:true,name:'Elite '+c.name,desc:c.desc+' Deploys with +50% damage.'}:({...c});choice._resolved=choice.id==='roadSystem'?{...ROAD_PIECES[Math.floor(Math.random()*ROAD_PIECES.length)]}:null;return choice});
 G.draftChoices=choices;G.draftChoiceCommitted=false;G.openingDraft=opening;
 const box=$('#choicesCards');box.innerHTML='';
 $('#rewardTitle').textContent=opening?'Choose Your Opening Defense':'Essence Vial Full';
 $('#rewardText').textContent=opening?`Choose your first tower. This road supports up to ${limits.total} structures.`:'Choose one card. New structures remain available while useful positions and capacity remain.';
 choices.forEach(c=>{
  c.drawWeight=G.drawWeights[c.id]??1;
  const el=document.createElement('button');const rewardRarity=c.hiddenSystem||c.tactical?'common':inv(c.id).rarity;el.className=`card portrait-card draft-choice-card rarity-${rewardRarity}${c.elite?' elite-card':''}`;el.innerHTML=draftCardHTML(c);
  el.addEventListener('click',()=>{
   UI.choices.classList.add('hidden');playTone(c.elite?520:390,.12,'triangle',.05);
   const chosen=c._resolved?{...c._resolved}:c;
   G.activeDraftCard={...chosen};G.draftOpen=false;renderHand();
   if(chosen.type==='booster'||chosen.type==='hero'){commitDraftChoice(c);G.paused=false;G.pendingWave=false;selectEssenceCard(chosen);return;}
   if(!preparePlacement(chosen)){
    showToast('That choice has no legal placement — choose one of the other original cards');G.activeDraftCard=null;G.draftOpen=true;renderHand();
    battleDelay(reopenDraftChoices,250,'reopen-draft-choices');return;
   }
   showToast(chosen.type==='skill'?`Tap the battlefield to cast ${chosen.name}`:`Place ${chosen.name}`);
  });box.append(el);
 });UI.choices.classList.remove('hidden');playTone(130,.25,'sine',.04);
}
function commitDraftChoice(choice){
 if(!G||G.draftChoiceCommitted||!choice)return;
 const original=(G.draftChoices||[]).find(c=>c.id===choice.id||c._resolved?.id===choice.id)||choice;
 G.pickCounts[original.id]=(G.pickCounts[original.id]||0)+1;
 G.drawWeights[original.id]=Math.max(.015625,(G.drawWeights[original.id]??1)/2);
 G.recentDraftMilestone=nextChoiceMilestone(G);registerCompletedDraft(G);G.lastMeaningfulDecisionAt=G.time;
 G.draftChoiceCommitted=true;G.draftChoices=null;
}
function reopenDraftChoices(){
 if(!G?.draftChoices||G.draftChoiceCommitted)return;
 const originalChoices=G.draftChoices;
 G.pendingCard=null;G.activeDraftCard=null;G.hoverTile=null;setPlacementUI(null);G.draftOpen=true;G.paused=true;renderHand();
 showWaveReward(G.wave,!!G.openingDraft,originalChoices);showToast('Choose again from the original three cards');
}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=Math.random()*2.5;G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.7,color})}}
function battleHasLivingEnemies(){return !!G?.enemies?.some(e=>e&&!e.dead&&e.hp>0);}
function battleVictoryReady(){return !!G&&G.mode!=='endless'&&G.wave>=G.chapterWaves&&G.spawnLeft===0&&!battleHasLivingEnemies()&&!G.chapterCleared&&!G.completionStarted;}
function beginBattleVictory(){
 if(!battleVictoryReady())return false;
 G.completionStarted=true;G.paused=false;G.pendingWave=false;G.waveTransition=false;G.draftOpen=false;
 G.pendingCard=null;G.activeDraftCard=null;G.hoverTile=null;G.selected=null;G.selectedTower=null;
 UI.choices.classList.add('hidden');$('#towerInspector')?.classList.add('hidden');$('#placementBar')?.classList.add('hidden');setPlacementUI(null);
 try{chapterClear();}
 catch(error){
  console.error('Battle completion recovery',error);
  G.chapterCleared=true;G.state='over';UI.hud.classList.add('hidden');$('#bossWrap')?.classList.add('hidden');
  $('#endTitle').textContent=(G.chapter?.boss?.name||'The Chapter Boss')+' Has Fallen';
  $('#endStats').innerHTML=`The level is complete.<br>Monsters slain: <strong>${G.kills||0}</strong><br><br><em>Your progress was preserved. Return Home or open Cards to continue.</em>`;
  UI.over.classList.remove('hidden');
 }
 return true;
}
function update(dt,syncHud=true,visualDt=dt){
 if(!G)return;
 // V32.2.2 — Completion checks living enemies rather than the raw array. A
 // defeated final enemy can remain in G.enemies until end-of-frame cleanup; if
 // an Essence draft pauses first, the old length check never becomes true.
 // This guard runs before every pause/state exit, so victory cannot deadlock.
 if(G.state==='play'&&beginBattleVictory())return;
 if(G.state!=='play'||G.paused)return;
 G.hitStop=Math.max(0,(G.hitStop||0)-dt);
 G.time+=dt;if(G.comboTimer>0){G.comboTimer-=dt;if(G.comboTimer<=0)G.killChain=0;}G.shake*=Math.exp(-7.67*dt);G.flash=Math.max(0,G.flash-dt);G.cameraPulse=Math.max(0,(G.cameraPulse||0)-dt*2.2);for(const a of G.ambient||[]){a.x+=a.v*dt;if(a.x>GRID.cols+1)a.x=-1;a.phase+=dt*(.5+a.v)}
 const economyLimits=battlefieldLimits(G),activeCost=G.activeDraftCard?essenceCost(G.activeDraftCard):Infinity,activeCapacity=G.activeDraftCard?.type==='trap'?G.traps.length<economyLimits.groundDefense:G.towers.length<economyLimits.towers;
 const canPlaceActive=!!G.activeDraftCard&&activeCapacity&&G.essence>=activeCost,canUpgradeTower=G.towers.some(t=>!t.supportOnly&&['damage','rate','range'].some(stat=>(t.runEssenceUpgrades?.[stat]||0)<(stat==='range'?3:5)&&G.essence>=essenceTowerUpgradeCost(t,stat)));
 if(G.essence>=24&&!canPlaceActive&&!canUpgradeTower&&!G.draftOpen)G.economyDeadEndTime=(G.economyDeadEndTime||0)+dt;else G.economyDeadEndTime=0;
 if(canTriggerChoice(G)){triggerEssenceDraft(false);return;}
 updateHolyWaterRains(dt);
 if(G.weather.id==='rain'){G.rainSplashTimer=(G.rainSplashTimer||0)-dt;if(G.rainSplashTimer<=0){G.rainSplashTimer=.055+Math.random()*.09;const rx=Math.random()*GRID.cols,ry=Math.random()*GRID.rows;G.particles.push({x:rx,y:ry,vx:0,vy:0,life:.22,color:'#b9dcff',kind:'splash',size:3+Math.random()*4});}}
 G.spawnTimer-=dt;if(G.spawnLeft>0&&G.spawnTimer<=0){spawnEnemy();G.spawnLeft--;G.spawnTimer=Math.max(.24,(1.15-G.wave*.025)*.88)}
 if(G.spawnLeft===0&&G.enemies.length===0&&!G.pendingWave&&!G.waveTransition){G.waveDelay-=dt;if(G.waveDelay<=0){if(G.mode!=='endless'&&G.wave>=G.chapterWaves){chapterClear();return;}beginWaveTransition();return;}}
 for(const e of G.enemies){const points=routePoints(e.routeIndex||0);if(e.dead)continue;e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.hitKick=Math.max(0,(e.hitKick||0)-dt*1.8);e.animT=(e.animT||0)+dt;e.hurtT=Math.max(0,(e.hurtT||0)-dt);e.squashT=Math.max(0,(e.squashT||0)-dt);updateGolemBoss(e,dt);if(updateBossPresentation(e,dt))continue;if(e.freeze>0){e.freeze-=dt;continue}if(e.burn>0){e.burn-=dt;hit(e,4*dt,{holy:false})}if(e.attacking){e.attackTimer-=dt;if(e.attackTimer<=0){e.attackTimer=e.attackRate||1.18;G.hp-=e.attackDamage||1;G.gateHurt=Math.max(G.gateHurt||0,e.boss?1:.7);if(e.boss)bossShake(.28,0,1,.28);G.flash=Math.max(G.flash,e.boss?0.16:0.06);floatText(CATHEDRAL.gateX,CATHEDRAL.gateY-.35,`-${e.attackDamage||1} GATE`,'#ff6b78');playTone(e.boss?75:95,.08,'sawtooth',.035);}continue;}if((e.boss||e.mini)&&e.summonTimer>0){e.summonTimer-=dt;if(e.summonTimer<=0){e.summonTimer=e.boss?5:4;const summonRoute=e.routeIndex||0,summonPoints=routePoints(summonRoute),outer=summonPoints[0];const summonType=e.type==='thornbeast'?'wolf':e.type==='bloodcount'?'vampire':'skeleton';const summonCount=e.type==='icebishop'?2:(e.boss?3:2);for(let i=0;i<summonCount;i++)G.enemies.push({x:outer.x,y:outer.y,routeIndex:summonRoute,seg:0,prog:0,hp:78*(1+G.wave*.18),max:78*(1+G.wave*.18),speed:.62,reward:3,type:summonType,name:summonType==='wolf'?'Thorn Wolf':summonType==='vampire'?'Blood Spawn':'Summoned Bone',slow:1,freeze:0,burn:0,dead:false,attacking:false,attackTimer:0,attackRate:1.22,attackDamage:1});if(e.type==='icebishop'){for(const t of G.towers)t.t+=1.25;G.flash=.35;}showToast(e.boss?(e.type==='icebishop'?'The Frozen Bishop locks the towers in frost!':e.type==='thornbeast'?'The Thornbound Beast calls its pack!':e.type==='bloodcount'?'The Blood Count summons his spawn!':'The Warden summons reinforcements!'):'Necromancer raises the dead!')}}const a=points[e.seg],b=points[e.seg+1];if(!b){e.attacking=true;e.attackTimer=.35;e.x=CATHEDRAL.gateX;e.y=CATHEDRAL.gateY;continue}const len=Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y)),spd=e.speed*(e.slow||1);e.prog+=spd*dt/len;while(e.prog>=1){e.prog-=1;e.seg++;if(e.seg>=points.length-1){e.seg=points.length-1;e.prog=0;e.attacking=true;e.attackTimer=.35+Math.random()*.2;e.x=CATHEDRAL.gateX;e.y=CATHEDRAL.gateY;break}}if(!e.dead&&!e.attacking){const aa=points[e.seg],bb=points[e.seg+1];e.x=aa.x+(bb.x-aa.x)*e.prog;e.y=aa.y+(bb.y-aa.y)*e.prog;e.slow+=(1-e.slow)*dt*1.5}}
 for(const trap of G.traps){
  trap.t-=dt;
  const radius=trap.effect==='blast'?1.25:.68;
  const victims=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-(trap.x+.5),e.y-(trap.y+.5))<radius);
  if(trap.effect==='oil'||trap.effect==='frost')for(const e of victims)e.slow=Math.min(e.slow,trap.slow||.58);
  if(trap.t<=0&&victims.length){
   for(const e of victims){
    hit(e,trap.damage,{holy:['damage','vulnerable','heal'].includes(trap.effect)});
    if(trap.effect==='oil'&&Math.random()<.28)e.burn=2.8;
    if(trap.effect==='root')e.slow=Math.min(e.slow,.12),e.slowTimer=Math.max(e.slowTimer||0,trap.root||1);
    if(trap.effect==='poison')e.burn=Math.max(e.burn||0,4.2);
    if(trap.effect==='vulnerable')e.vulnerable=Math.max(e.vulnerable||0,3.5);
   }
   if(trap.effect==='bell')for(const e of G.enemies.filter(e=>!e.dead))e.slow=Math.min(e.slow,trap.slow||.68);
   if(trap.effect==='heal')G.hp=Math.min(G.maxHp,G.hp+.35);
   burst(trap.x+.5,trap.y+.5,trap.color,trap.effect==='blast'?18:7);trap.t=trap.rate;
  }
 }
 for(const t of G.towers){if(t.supportOnly)continue;t.t-=dt;if(t.t<=0){const e=targetFor(t);if(e)fire(t,e)}}
 // V32.4 — Keep archers and Shadow's equipped familiar.
 const archerCount=Math.max(0,(G.keepLevel||1)-1);
 for(let i=0;i<archerCount;i++){
  G.archerTimers[i]=(G.archerTimers[i]??(i*.35))-dt;
  if(G.archerTimers[i]<=0){let target=null,bd=5.2+(G.keepLevel||1)*.25;for(const e of G.enemies){if(e.dead)continue;const d=Math.hypot(e.x-CATHEDRAL.gateX,e.y-CATHEDRAL.gateY);if(d<bd){target=e;bd=d}}if(target){G.shots.push({x:CATHEDRAL.gateX+(i-(archerCount-1)/2)*.24,y:CATHEDRAL.gateY-.55,target,speed:8.5,damage:5+(G.keepLevel||1)*2.4,color:'#e8d5a0',holy:false,life:2,kind:'arrow',archer:true});G.archerTimers[i]=1.9-Math.min(.55,(G.keepLevel||1)*.08)+i*.08}else G.archerTimers[i]=.25}
 }
 updateAscensionCompanion(dt);
 // V25.6: Kael is an autonomous defender during battle. He patrols in
 // front of the cathedral, turns toward nearby threats, and attacks alone.
 const patrolCenter={x:CATHEDRAL.gateX,y:CATHEDRAL.gateY+1.15};
 let heroTarget=null,heroTargetDistance=Infinity;
 for(const enemy of G.enemies){
  if(enemy.dead)continue;
  const distance=Math.hypot(enemy.x-G.hero.x,enemy.y-G.hero.y);
  if(distance<heroTargetDistance){heroTarget=enemy;heroTargetDistance=distance}
 }
 let targetX=patrolCenter.x+Math.sin(G.time*.72)*1.05;
 let targetY=patrolCenter.y+Math.sin(G.time*1.13)*.42;
 if(heroTarget&&heroTargetDistance<G.hero.range*1.65){
  const dx=heroTarget.x-patrolCenter.x,dy=heroTarget.y-patrolCenter.y,len=Math.hypot(dx,dy)||1;
  targetX=patrolCenter.x+dx/len*Math.min(1.15,len);
  targetY=patrolCenter.y+dy/len*Math.min(.8,len);
 }
 const hdx=targetX-G.hero.x,hdy=targetY-G.hero.y,hd=Math.hypot(hdx,hdy);
 if(hd>.08){
  const step=Math.min(hd,1.42*(G.hero.moveSpeed||1)*dt);
  G.hero.x+=hdx/hd*step;G.hero.y+=hdy/hd*step;G.hero.walking=true;
  G.hero.facing=Math.abs(hdx)>Math.abs(hdy)?(hdx<0?'left':'right'):(hdy<0?'up':'down');
 }else G.hero.walking=false;
 if(heroTarget&&heroTargetDistance<G.hero.range*1.3){
  const dx=heroTarget.x-G.hero.x,dy=heroTarget.y-G.hero.y;
  G.hero.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
 }
 G.hero.anim=(G.hero.anim||0)+dt*(G.hero.walking?7:2.2);
 G.hero.t-=dt;G.hero.attackAnim=Math.max(0,(G.hero.attackAnim||0)-dt);G.hero.frenzy=Math.max(0,G.hero.frenzy-dt);if(G.hero.t<=0){let best=null,bd=G.hero.range;for(const e of G.enemies){const d=Math.hypot(e.x-G.hero.x,e.y-G.hero.y);if(d<bd){best=e;bd=d}}if(best){G.shots.push({x:G.hero.x,y:G.hero.y,target:best,speed:9,damage:G.hero.damage*(G.hero.frenzy?2:1)*(G.hero.executeBonus&&best.hp/best.max<.35?1+G.hero.executeBonus:1),color:'#fff2c5',holy:G.hero.holy,life:2});G.hero.attackAnim=.34;G.hero.t=G.hero.rate*(G.hero.frenzy?.45:1)}}
 for(const lane of G.laneShots||[]){lane.life-=dt;}
 for(const s of G.shots){s.life-=dt;if(!s.target||s.target.dead){s.life=0;continue}const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy);if(d<s.speed*dt+.15){if(s.source&&!enemyInsideTowerAOE(s.source,s.target)){s.life=0;continue}if(s.aoe)G.enemies.forEach(e=>{if(!e.dead&&Math.hypot(e.x-s.target.x,e.y-s.target.y)<s.aoe&&(!s.source||enemyInsideTowerAOE(s.source,e))){hit(e,s.damage,s);if(s.burn)e.burn=s.burn}});else {hit(s.target,s.damage,s);if(s.burn)s.target.burn=Math.max(s.target.burn||0,s.burn);if(s.kind==='scripture'&&s.chain>0){let from=s.target;const struck=new Set([s.target]);for(let jump=0;jump<s.chain;jump++){const next=G.enemies.filter(e=>!e.dead&&!struck.has(e)&&(!s.source||enemyInsideTowerAOE(s.source,e))&&Math.hypot(e.x-from.x,e.y-from.y)<1.25).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];if(!next)break;G.shots.push({x:from.x,y:from.y,px:from.x,py:from.y,target:next,speed:15,damage:s.damage*.62,color:'#fff3a6',holy:true,source:s.source,kind:'scripture',life:.75,chain:0});struck.add(next);from=next;}}}if(s.slow)s.target.slow=Math.min(s.target.slow,s.slow);burst(s.target.x,s.target.y,s.color,s.kind==='scripture'?9:5);s.life=0}else{s.px=s.x;s.py=s.y;s.x+=dx/d*s.speed*dt;s.y+=dy/d*s.speed*dt}}
 if(visualDt>0){
  for(const p of G.particles){
   p.life-=visualDt;
   if(p.kind==='soul'){p.phase=(p.phase||0)+visualDt*8;p.x+=((p.vx||0)+Math.sin(p.phase)*.16)*visualDt;p.y+=(p.vy||-.6)*visualDt;p.vy-=.12*visualDt}
   else if(p.kind==='holyDrop'){
    p.x+=p.vx*visualDt;p.y+=p.vy*visualDt;
    if(p.y>=p.impactY){p.y=p.impactY;p.kind='holySplash';p.life=.20;p.maxLife=.20;p.vx=0;p.vy=0;p.size=3+(p.size||2)}
   }else if(p.kind==='holySplash'||p.kind==='splash'){}
   else{p.x+=p.vx*visualDt;p.y+=p.vy*visualDt;p.vy+=1.3*visualDt}
  }
  for(const f of G.floaters){f.life-=visualDt;f.y+=f.vy*visualDt;f.x+=(f.vx||0)*visualDt;f.vy+=.55*visualDt;f.pop=Math.min(1,(f.pop||0)+visualDt*9)}
 G.particles=G.particles.filter(p=>p.life>0);trimParticles();G.floaters=G.floaters.filter(f=>f.life>0);updateCorpses(visualDt);updateJuice(visualDt);updateTowerFX(visualDt);
  if(G.roadReveal){G.roadReveal.life-=visualDt;if(G.roadReveal.life<=0)G.roadReveal=null}
 }
 G.enemies=G.enemies.filter(e=>!e.dead&&e.hp>0);G.shots=G.shots.filter(s=>s.life>0);G.laneShots=(G.laneShots||[]).filter(s=>s.life>0);
 // Resolve the win in the same frame that the final corpse is removed.
 if(beginBattleVictory())return;
 if(G.hp<=0){endProgressionTelemetry({result:'defeat',towers:G.towers});endGame();}
 if(syncHud){const boss=G.enemies.find(e=>(e.boss||e.mini)&&!e.dead);
 $('#bossWrap').classList.toggle('hidden',!boss);
 if(boss){$('#bossName').textContent=boss.name;$('#bossHpTxt').textContent=`${Math.ceil(100*boss.hp/boss.max)}%`;$('#bossBar').style.width=`${Math.max(0,100*boss.hp/boss.max)}%`;}
 $('#hpTxt').textContent=Math.max(0,Math.ceil(G.hp));renderEssenceVial();$('#waveTxt').textContent=`${G.wave} / ${G.chapterWaves}`;$('#xpBar').style.width=`${100*G.xp/G.xpNeed}%`;}

}
function grantEndChest(victory,firstClear=false){
 const stageId=G.chapter?.id||'endless',replayCount=save.campaign.replayClears[stageId]||0,policy=rewardForStage({victory,firstClear,replayCount,boss:!!G.chapter});
 const quality=firstClear?'First-Clear Reliquary':victory?'Road Replay Cache':'Recovered Fragments',rewards=[],pool=CARD_POOL.filter(c=>save.unlocked.includes(c.id)&&inv(c.id).copies>0);
 let copies=0,fragments=0;
 for(let i=0;i<policy.copies;i++){if(Math.random()>policy.copyChance||!pool.length)continue;const minimum=Math.min(...pool.map(c=>rarityIndex(inv(c.id).rarity))),eligible=pool.filter(c=>rarityIndex(inv(c.id).rarity)<=minimum+1),c=eligible[Math.floor(Math.random()*eligible.length)];inv(c.id).copies++;inv(c.id).recent=true;inv(c.id).lastFound=Date.now();G.runDrops.push(c.id);save.stats.totalCards++;copies++;rewards.push(`Card copy · ${c.name}`)}
 for(let i=0;i<policy.fragments;i++){if(!pool.length)break;const c=pool[Math.floor(Math.random()*pool.length)];save.cardFragments[c.id]=(save.cardFragments[c.id]||0)+1;fragments++;}
 if(fragments)rewards.push(`${fragments} targeted card fragment${fragments===1?'':'s'}`);if(!rewards.length)rewards.push('No permanent card copies — battle resources retained');telemetryReward({copies,fragments});return {quality,rewards,copies,fragments};
}
function grantAscensionBossLoot(firstClear){
 if(!G?.chapter)return [];
 const chapter=G.chapter.number,tier=bossLootTier(chapter),pool=firstClear?eligibleBossEquipment(chapter,tier.id):[],rewards=[];
 if(pool.length)for(let drop=0;drop<BOSS_LOOT_REGISTRY.equipmentDropsPerBoss;drop++){const total=pool.reduce((sum,item)=>sum+item.dropWeight,0);let roll=Math.random()*total,chosen=pool[0];for(const item of pool){roll-=item.dropWeight;if(roll<=0){chosen=item;break}}save.ascension.equipmentInventory.push({uid:globalThis.crypto?.randomUUID?.()||`${chosen.id}-${Date.now()}-${Math.random()}`,itemId:chosen.id,locked:false});rewards.push(`${chosen.icon} ${chosen.name}`)}
 const elements=ELEMENT_REGISTRY.filter(element=>chapter>=BOSS_LOOT_REGISTRY.fragmentChapterMinimum||BOSS_LOOT_REGISTRY.earlyFragmentElements.includes(element.id)),element=elements[Math.floor(Math.random()*elements.length)]||ELEMENT_REGISTRY[0],fragments=tier.fragmentBase+Math.floor(Math.random()*(BOSS_LOOT_REGISTRY.fragmentRandomBonus+1));save.ascension.fragments[element.id]+=fragments;rewards.push(`${element.icon} ${fragments} ${element.name} Fragments`);
 const guaranteed=BOSS_LOOT_REGISTRY.guaranteedChapterGems[chapter];
 if(firstClear&&guaranteed&&!save.ascension.chapterGemRewards.includes(chapter)){save.ascension.gems[guaranteed]++;save.ascension.chapterGemRewards.push(chapter);rewards.push(`${gemById(guaranteed).icon} ${gemById(guaranteed).name}`)}
 G.ascensionRewards=rewards;return rewards;
}
function grantDeckCardXp(amount){const cap=cardLevelCapForStage(G.chapter?.number||1);for(const id of save.deck){const item=inv(id);if(item.level>=cap)continue;item.xp+=Math.max(0,amount);while(item.xp>=100&&item.level<cap){item.xp-=100;item.level++}if(item.level>=cap)item.xp=Math.min(item.xp,99)}}
function recordRun(result,earned,chest){const eco=ensureVillageEconomy();const villageLoot={gold:Math.round(G.kills*(result==='victory'?2.4:1.1)),food:Math.round(G.kills*.7),wood:Math.round(G.wave*3),stone:Math.round(G.wave*2),iron:result==='victory'?Math.max(1,Math.floor(G.wave/4)):0,essence:result==='victory'?Math.max(1,Math.floor(G.wave/5)):0};for(const [k,v] of Object.entries(villageLoot))eco[k]=(eco[k]||0)+v;G.villageLoot=villageLoot;save.runHistory.unshift({date:Date.now(),result,wave:G.wave,kills:G.kills,hero:save.selectedHero,deck:[...save.deck],drops:[...G.runDrops],chest:chest.quality,map:G.map.name});save.runHistory=save.runHistory.slice(0,20);save.bestWave=Math.max(save.bestWave,G.wave);save.essence+=earned;save.materials.bloodEssence=save.essence;save.stats.runs++;save.stats.totalKills+=G.kills;save.stats.highestWave=Math.max(save.stats.highestWave,G.wave);save.stats.goldEarned+=villageLoot.gold;save.stats.bloodEssenceEarned+=earned;if(result==='victory'){save.stats.wins++;save.stats.bosses++;save.materials.eclipseShards+=2;save.materials.ancientRelics+=1;save.materials.hunterMedallions+=1;save.materials.forgeEmbers+=3}else if(G.miniBossDefeated){save.materials.eclipseShards+=1;save.materials.forgeEmbers+=1}saveProgress()}
function chapterClear(){
 if(!G||G.chapterCleared)return;
 G.chapterCleared=true;
 if(G.chapter?.number===10&&!save.uniqueBossDrops.draculaTooth){playDraculaToothCinematic();return;}
 finalizeChapterClear(false);
}
function playDraculaToothCinematic(){
 if(!G)return;
 G.paused=true;G.state='cinematic';UI.hud.classList.add('hidden');$('#bossWrap')?.classList.add('hidden');AUDIO.setState('silence',true);
 const el=$('#chapterTenCinematic');if(!el){completeDraculaAwakening();finalizeChapterClear(true);return;}
 const oldLevel=currentShadowLevel(),bossSheet=golemAsset(G.lastBossDeath?.form||1,'Death'),oldSheet=shadowAsset(oldLevel,'Idle'),newSheet=shadowAsset(2,'Idle');
 el.innerHTML=`<div class="finale-wind"></div><div class="finale-caption" data-finale-caption>THE GUARDIAN FALLS</div><div class="finale-stage"><div class="finale-boss" style="--boss-sheet:url('${bossSheet}')"></div><div class="finale-relic"><img src="${DRACULA_TOOTH_ART}" alt="Dracula's Tooth"></div><div class="finale-hero old" style="--hero-sheet:url('${oldSheet}')"></div><div class="finale-hero new" style="--hero-sheet:url('${newSheet}')"></div><div class="finale-runes"></div><div class="finale-flash"></div></div></div>`;
 el.classList.remove('hidden');el.classList.remove('phase-death','phase-walk','phase-relic','phase-transform','phase-reveal');void el.offsetWidth;el.classList.add('phase-death');
 const caption=el.querySelector('[data-finale-caption]');
 battleDelay(()=>{caption.textContent='THE WIND CALLS SHADOW FORWARD';el.classList.add('phase-walk')},2500,'chapter-ten-walk');
 battleDelay(()=>{caption.textContent="DRACULA'S TOOTH";el.classList.add('phase-relic');playTone(180,.8,'sine',.025)},5600,'chapter-ten-relic');
 battleDelay(()=>{caption.textContent='THE BLOODLINE AWAKENS';el.classList.add('phase-kneel','phase-transform');playTone(95,1.3,'sawtooth',.03)},7900,'chapter-ten-transform');
 battleDelay(()=>{completeDraculaAwakening();caption.textContent='SHADOW HAS AWAKENED.';el.classList.add('phase-reveal');playTone(520,.45,'triangle',.06)},10500,'chapter-ten-awakened');
 battleDelay(()=>{el.classList.add('hidden');el.innerHTML='';finalizeChapterClear(true)},12800,'chapter-ten-finish');
}
function completeDraculaAwakening(){
 if(save.uniqueBossDrops.draculaTooth)return false;
 save.uniqueBossDrops.draculaTooth=true;save.villageProgression.pendingShadowAwakening=false;save.villageProgression.shadowAwakeningComplete=true;
 save.shadowLevel=Math.max(2,save.shadowLevel||1);save.heroLevels.warden=Math.max(2,save.heroLevels.warden||1);
 if(!save.unlockedRelics.includes('fang'))save.unlockedRelics.push('fang');
 if(!save.villageProgression.artifacts.includes('draculas-tooth'))save.villageProgression.artifacts.push('draculas-tooth');
 villageChronicle("Dracula's Tooth awakened Shadow to Level II.",'awakening');saveProgress('chapter-one-awakening');return true;
}
function finalizeChapterClear(uniqueShadowRewardOverride=false){
 AUDIO.setState('victory',true);AUDIO.sting('victory');
 if(!G)return;
 G.state='over';UI.hud.classList.add('hidden');$('#bossWrap').classList.add('hidden');
 const earned=Math.floor(G.kills/2)+35;
 const firstClear=!!G.chapter&&!save.campaign.completed.includes(G.chapter.id);
 const earnedStars=G.chapter?(1+(G.hp/G.maxHp>=.8?1:0)+(G.hp>=G.maxHp?1:0)):0;
 if(G.chapter)save.campaign.stars[G.chapter.id]=Math.max(Number(save.campaign.stars[G.chapter.id])||0,earnedStars);
 const newlyUnlocked=[];
 let uniqueShadowReward=uniqueShadowRewardOverride;
 if(!uniqueShadowReward&&G.chapter?.number===10&&!save.uniqueBossDrops.draculaTooth){
  completeDraculaAwakening();
  uniqueShadowReward=true;
 }
 if(G.chapter){
  // Record completion first, then grant/reconcile every promised reward. This also repairs old broken clears.
  if(firstClear){save.campaign.completed.push(G.chapter.id);const artifact=`guardian-relic-${G.chapter.number}`;if(!save.villageProgression.artifacts.includes(artifact))save.villageProgression.artifacts.push(artifact);villageChronicle(`Road ${G.chapter.number} was reclaimed from ${G.chapter.boss.name}.`,'battle');if(G.chapter.number===10&&!save.villageProgression.artifacts.includes('heart-of-the-golem'))save.villageProgression.artifacts.push('heart-of-the-golem');}
  for(const id of CHAPTER_CARD_UNLOCKS[G.chapter.id]||[]){
   const wasAvailable=save.unlocked.includes(id)&&inv(id).copies>0;
   if(!save.unlocked.includes(id))save.unlocked.push(id);
   const item=inv(id);if(item.copies<1)item.copies=1;item.recent=true;item.lastFound=Date.now();
   if(!wasAvailable)newlyUnlocked.push(card(id));
  }
  save.campaign.unlocked=Math.min(CHAPTERS.length,Math.max(save.campaign.unlocked,G.chapter.number+1));
  const relicId=G.chapter.relic;if(!save.unlockedRelics.includes(relicId))save.unlockedRelics.push(relicId);
 }
 const repaired=reconcileCardUnlocks();
 for(const c of repaired)if(!newlyUnlocked.some(x=>x.id===c.id))newlyUnlocked.push(c);
  const stageId=G.chapter?.id;const jpEarned=firstClear&&stageId&&!save.jpAwardedStages.includes(stageId)?1:0;if(jpEarned){save.jpAwardedStages.push(stageId);save.heroJP[save.selectedHero]=(save.heroJP[save.selectedHero]||0)+1;save.stats.jpEarned++;}
 if(earnedStars===3)save.stats.perfectVictories++;
 grantDeckCardXp(firstClear?12+Math.min(10,G.chapter?.number||0):4+Math.floor((G.chapter?.number||1)/4));
 const ascensionRewards=grantAscensionBossLoot(firstClear);
 const chest=grantEndChest(true,firstClear);
 if(G.chapter)save.campaign.replayClears[G.chapter.id]=(save.campaign.replayClears[G.chapter.id]||0)+(firstClear?0:1);
 endProgressionTelemetry({result:'victory',towers:G.towers});
 recordRun('victory',earned,chest);
 const unlockHtml=newlyUnlocked.length?`<br><br><strong>NEW CARDS UNLOCKED</strong><br>${newlyUnlocked.map(c=>`${c.icon} ${c.name}`).join('<br>')}`:'<br><br><em>Chapter rewards already owned — duplicate cards added to your chest.</em>';
 const uniqueHtml=uniqueShadowReward?`<br><br><strong>UNIQUE CHAPTER RELIC</strong><br>🦷 Dracula's Tooth · Shadow Level II awakened.<br><em>This relic is permanent and can only be earned once.</em>`:'';
 $('#endTitle').textContent=(G.chapter?.boss.name||'The Eclipse Warden')+' Has Fallen';
 $('#endStats').innerHTML=`Waves survived: <strong>${G.wave}</strong><br>Monsters slain: <strong>${G.kills}</strong><br>Blood Essence: <strong>+${earned}</strong><br>Village supplies: <strong>+${G.villageLoot?.gold||0} Gold · +${G.villageLoot?.food||0} Food · +${G.villageLoot?.wood||0} Wood · +${G.villageLoot?.stone||0} Stone · +${G.villageLoot?.iron||0} Iron</strong><br>Run drops: <strong>${G.runDrops.length}</strong><br>Mission rating: <strong>${'★'.repeat(earnedStars)}${'☆'.repeat(3-earnedStars)}</strong><br>Job Points: <strong>+${jpEarned} JP</strong>${unlockHtml}${uniqueHtml}<br><br><strong>ASCENSION BOSS LOOT</strong><br>${ascensionRewards.join('<br>')}<br><br><strong>${chest.quality}</strong><br>${chest.rewards.join('<br>')}`;
 UI.over.classList.remove('hidden');
 if(newlyUnlocked.length)setTimeout(()=>showToast(`Unlocked: ${newlyUnlocked.map(c=>c.name).join(' + ')}`),500);
 burst(GRID.cols/2,GRID.rows/2,'#ffe7a4',120);
}
function endGame(){battleEvent('battle-defeat',{session:battleSessionId,stage:G.chapter?.number,wave:G.wave,timers:[...battleTimers.values()]});AUDIO.setState('defeat',true);AUDIO.sting('defeat');G.state='over';G.previousOutcome='defeat';G.paused=true;G.flash=0;G.weatherFlash=0;G.gateHurt=0;G.roadReveal=null;UI.hud.classList.add('hidden');$('#bossWrap').classList.add('hidden');const earned=Math.floor(G.kills/3),chest=grantEndChest(false);recordRun('defeat',earned,chest);$('#endTitle').textContent='The Last Keep Has Fallen';$('#endStats').innerHTML=`Wave reached: <strong>${G.wave}</strong><br>Monsters slain: <strong>${G.kills}</strong><br>Blood Essence: <strong>+${earned}</strong><br>Run drops: <strong>${G.runDrops.length}</strong><br><br><strong>${chest.quality}</strong><br>${chest.rewards.join('<br>')}`;UI.over.classList.remove('hidden');mgsGameOverCry()}
function drawScenery(map,gw,gh){
 const t=G?.time||0;
 if(map.id==='cemetery'){
  ctx.fillStyle='#28242b';for(let i=0;i<18;i++){const x=(i*79+33)%gw,y=(i*113+70)%gh;ctx.fillRect(x,y,16,25);ctx.beginPath();ctx.arc(x+8,y,8,Math.PI,0);ctx.fill();ctx.strokeStyle='#64706f55';ctx.beginPath();ctx.moveTo(x+8,y+5);ctx.lineTo(x+8,y+18);ctx.moveTo(x+3,y+11);ctx.lineTo(x+13,y+11);ctx.stroke()}
  ctx.fillStyle='#9de8dc22';for(let i=0;i<9;i++){const x=(i*131+t*8)%gw,y=40+(i*67)%Math.max(80,gh-90);ctx.beginPath();ctx.arc(x,y,5+2*Math.sin(t*2+i),0,7);ctx.fill()}
 }else if(map.id==='forest'){
  for(let i=0;i<16;i++){const x=(i*61+20)%gw,y=(i*97+20)%gh;ctx.fillStyle='#07110f';ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x+24,y+18);ctx.lineTo(x-24,y+18);ctx.fill();ctx.fillStyle='#2e4d43';ctx.fillRect(x-3,y+12,6,22)}
  ctx.fillStyle='#b8f5a822';for(let i=0;i<24;i++){const x=(i*91+t*13)%gw,y=(i*53)%gh;ctx.fillRect(x,y,2,2)}
 }else if(map.id==='village'){
  for(let i=0;i<8;i++){const x=(i*137+20)%gw,y=gh-72-(i%3)*40;ctx.fillStyle='#241713';ctx.fillRect(x,y,58,46);ctx.fillStyle='#120b0a';ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+29,y-28);ctx.lineTo(x+65,y);ctx.fill();ctx.fillStyle='#f3974a55';ctx.fillRect(x+12,y+17,8,11)}
  ctx.fillStyle='#d5753f44';for(let i=0;i<10;i++){const x=(i*109)%gw,y=gh-20-(i%2)*20;ctx.beginPath();ctx.arc(x,y,4+2*Math.sin(t*4+i),0,7);ctx.fill()}
 }else{
  ctx.strokeStyle='#86b9d055';ctx.lineWidth=3;for(let i=0;i<10;i++){const x=(i*91+40)%gw;ctx.beginPath();ctx.moveTo(x,gh);ctx.lineTo(x+15,gh-70);ctx.lineTo(x+35,gh);ctx.stroke()}
  ctx.fillStyle='#cbeeff66';for(let i=0;i<70;i++){const x=(i*47+t*18)%gw,y=(i*83+t*22)%gh;ctx.fillRect(x,y,2,2)}ctx.lineWidth=1;
 }
}
function drawCobblestoneTile(px,py,map,index){
 const seed=(index*37)%11;ctx.save();ctx.translate(px,py);
 const g=ctx.createLinearGradient(0,0,58,58);g.addColorStop(0,'#514850');g.addColorStop(1,'#26232b');ctx.fillStyle=g;ctx.fillRect(3,3,58,58);
 ctx.strokeStyle=(map.accent||'#9b6a83')+'77';ctx.lineWidth=1.5;ctx.strokeRect(4.5,4.5,55,55);
 ctx.strokeStyle='#17141a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,19+seed);ctx.lineTo(30,15);ctx.lineTo(58,20-seed*.3);ctx.moveTo(8,43-seed*.2);ctx.lineTo(35,39+seed*.2);ctx.lineTo(57,45);ctx.moveTo(23,5);ctx.lineTo(20,58);ctx.moveTo(47,5);ctx.lineTo(43,58);ctx.stroke();
 ctx.strokeStyle='#9a8b9555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(8,18+seed);ctx.lineTo(30,14);ctx.moveTo(8,42-seed*.2);ctx.lineTo(35,38+seed*.2);ctx.stroke();
 if(index%4===0){ctx.fillStyle='#42131d99';ctx.beginPath();ctx.ellipse(42,33,9,3,-.25,0,7);ctx.fill()}
 if(index%3===0){ctx.fillStyle='#334437aa';ctx.fillRect(7,50,12,3);ctx.fillRect(10,46,3,8)}ctx.restore();
}
function drawCathedralGate(){
 const hp=Math.max(0,Math.min(1,(G?.hp||20)/20));ctx.save();ctx.translate(CATHEDRAL.drawX,CATHEDRAL.drawY);ctx.shadowColor='#000';ctx.shadowBlur=24;
 ctx.fillStyle='#0b0810';ctx.fillRect(0,0,122,205);ctx.shadowBlur=0;
 ctx.fillStyle='#211822';ctx.strokeStyle='#8f5165';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(8,72);ctx.lineTo(24,32);ctx.lineTo(38,54);ctx.lineTo(61,2);ctx.lineTo(84,54);ctx.lineTo(98,32);ctx.lineTo(114,72);ctx.lineTo(114,202);ctx.lineTo(8,202);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#131018';ctx.fillRect(16,78,90,124);ctx.strokeStyle='#6d3e50';ctx.strokeRect(16,78,90,124);
 ctx.fillStyle='#08070b';ctx.beginPath();ctx.moveTo(31,202);ctx.lineTo(31,122);ctx.quadraticCurveTo(61,82,91,122);ctx.lineTo(91,202);ctx.closePath();ctx.fill();ctx.strokeStyle='#ba6476';ctx.stroke();
 ctx.fillStyle='#9d263d';ctx.fillRect(13,80,8,75);ctx.fillRect(101,80,8,75);ctx.fillStyle='#d7b268';ctx.fillRect(13,80,8,8);ctx.fillRect(101,80,8,8);
 const flame=(G?.time||0);for(const tx of [25,97]){ctx.save();ctx.translate(tx,118);ctx.fillStyle='#d66b2d';ctx.shadowColor='#ff9a3c';ctx.shadowBlur=16;ctx.beginPath();ctx.moveTo(0,12);ctx.quadraticCurveTo(-8,1,0,-10-3*Math.sin(flame*8+tx));ctx.quadraticCurveTo(9,2,0,12);ctx.fill();ctx.restore()}
 ctx.shadowBlur=0;ctx.fillStyle='#d8c7ad';ctx.font='22px Georgia';ctx.textAlign='center';ctx.fillText('✠',61,66);
 if(hp<.75){ctx.strokeStyle='#180d13';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(36,88);ctx.lineTo(45,105);ctx.lineTo(39,123);ctx.lineTo(51,143);ctx.stroke()}
 if(hp<.45){ctx.strokeStyle='#d06b4a66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(83,105);ctx.lineTo(71,126);ctx.lineTo(78,151);ctx.lineTo(66,176);ctx.stroke();ctx.fillStyle='#2a0f16aa';ctx.fillRect(100,145,9,31)}
 ctx.restore();ctx.lineWidth=1;
}
const DAGGER_TOWER_FRAMES=[
 {x:20,y:70,w:330,h:455},{x:365,y:55,w:330,h:470},{x:700,y:65,w:335,h:465},
 {x:1050,y:70,w:345,h:455},{x:1400,y:70,w:355,h:455}
];
function drawGothicDaggerTower(t){
 if(!gothicDaggerImage.complete||!gothicDaggerImage.naturalWidth)return false;
 const frame=t.recoil>.075?3:t.flashT>0?2:t.t<.22?4:t.t<.42?1:0,f=DAGGER_TOWER_FRAMES[frame];
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(gothicDaggerImage,f.x,f.y,f.w,f.h,-30,-43,60,78);ctx.restore();return true;
}
function drawTowerVisual(t,x,y){
 const pulse=.5+.5*Math.sin((G?.time||0)*3+t.x);
 const depth=.88+Math.max(0,Math.min(1,y/(GRID.rows*64)))*.22;
 ctx.save();ctx.translate(x,y);ctx.scale(1.18*depth,1.18*depth);
 if(t.id==='dagger'&&drawGothicDaggerTower(t)){ctx.restore();return;}
 if(renderCoreGothicTower(ctx,t,G?.time||0)){ctx.restore();return;}
 /* V34.1 — was ctx.shadowBlur=12 per tower per frame; a flat offset ellipse
    reads the same at this camera distance for a fraction of the cost. */
  ctx.save();ctx.globalAlpha=ctx.globalAlpha*.45;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(2,4,16,7,0,0,7);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.68;ctx.lineWidth=1;ctx.strokeStyle=t.supportOnly?'#587b82':'#665b51';ctx.fillStyle=t.supportOnly?'rgba(22,49,55,.48)':'rgba(35,31,30,.72)';ctx.beginPath();ctx.ellipse(0,15,t.supportOnly?22:20,t.supportOnly?8:7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
 ctx.fillStyle='#0d0a10';ctx.strokeStyle=t.elite?'#ffe16d':t.color;ctx.lineWidth=t.elite?4:2;
 if(t.id==='holy'){const tier=holyInfusionTier(t.infusionTier||1);ctx.fillStyle='#dff8ff';ctx.strokeStyle='#73ccef';ctx.beginPath();ctx.moveTo(-9,-16);ctx.lineTo(9,-16);ctx.lineTo(13,15);ctx.quadraticCurveTo(0,23,-13,15);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#64c9ef';ctx.beginPath();ctx.moveTo(-10,5);ctx.quadraticCurveTo(0,-1,10,5);ctx.lineTo(11,15);ctx.quadraticCurveTo(0,20,-11,15);ctx.closePath();ctx.fill();for(let i=0;i<tier;i++){const a=(G.time||0)*1.7+i*Math.PI*2/tier;const dx=Math.cos(a)*(18+i*3),dy=-18+Math.sin(a)*7;drawGlow(dx,dy,'#bff5ff',8,.65);ctx.fillStyle='#e9fdff';ctx.beginPath();ctx.arc(dx,dy,2.3,0,7);ctx.fill()}}
 else if(t.id==='dagger'){ctx.fillRect(-17,-13,34,31);ctx.strokeRect(-17,-13,34,31);ctx.rotate((G.time||0)*.8);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,-26);ctx.stroke()}}
 else if(t.id==='axe'){ctx.fillRect(-18,-12,36,30);ctx.strokeRect(-18,-12,36,30);ctx.rotate(-.25+.08*Math.sin(G.time*4));ctx.fillRect(-3,-30,6,24);ctx.strokeRect(-3,-30,6,24);ctx.beginPath();ctx.arc(6,-30,11,-1.5,1.5);ctx.stroke()}
 else if(t.id==='cross'){ctx.beginPath();ctx.arc(0,3,20,0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=.55+.35*pulse;ctx.fillStyle='#ffe79a';ctx.fillRect(-4,-30,8,40);ctx.fillRect(-14,-18,28,8)}
 else if(t.id==='clock'){ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-14);ctx.moveTo(0,0);ctx.lineTo(10,5);ctx.stroke();ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(0,0,28+pulse*5,0,7);ctx.stroke()}
 else if(t.id==='bone'){ctx.fillRect(-12,-22,24,42);ctx.strokeRect(-12,-22,24,42);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,-17+i*15,7,0,7);ctx.stroke()}ctx.fillStyle='#f0d271';ctx.fillRect(-4,-22,3,3);ctx.fillRect(2,-22,3,3)}
 else if(t.id==='familiar'){ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(20,15);ctx.lineTo(-20,15);ctx.closePath();ctx.fill();ctx.stroke();ctx.globalAlpha=.8;for(let i=0;i<3;i++){const a=G.time*1.8+i*2.1;ctx.fillText('⌁',Math.cos(a)*25,Math.sin(a)*10-12)}}
 else if(t.id==='silver'){ctx.fillRect(-22,-15,44,31);ctx.strokeRect(-22,-15,44,31);ctx.fillRect(4,-6,29,12);ctx.strokeRect(4,-6,29,12);ctx.beginPath();ctx.arc(-11,17,7,0,7);ctx.arc(12,17,7,0,7);ctx.stroke()}
 else if(t.id==='scripture'){
  const count=scriptureBibleCount(t);ctx.fillStyle='#18111d';ctx.beginPath();ctx.arc(0,7,20,0,7);ctx.fill();ctx.strokeStyle='#d9b85f';ctx.stroke();ctx.fillStyle='#806027';ctx.fillRect(-13,-4,26,22);ctx.strokeRect(-13,-4,26,22);ctx.fillStyle='#fff0aa';ctx.font='17px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✠',0,7);
  ctx.globalAlpha=.18+.10*pulse;ctx.fillStyle='#ffe58a';ctx.beginPath();ctx.arc(0,2,31,0,7);ctx.fill();ctx.globalAlpha=1;
  for(let i=0;i<count;i++){const a=(G.time||0)*(1.25+.08*t.level)+i*Math.PI*2/count,r=27+2*Math.sin((G.time||0)*2.2+i),bx=Math.cos(a)*r,by=Math.sin(a)*r*.72;ctx.save();ctx.translate(bx,by);ctx.rotate(a+Math.PI/2);ctx.fillStyle='#f3e5b2';ctx.strokeStyle='#9f7b35';ctx.lineWidth=1.2;ctx.fillRect(-7,-5,6,10);ctx.fillRect(1,-5,6,10);ctx.strokeRect(-7,-5,6,10);ctx.strokeRect(1,-5,6,10);ctx.strokeStyle='#d4b65e';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();ctx.restore();}
 } else if(t.id==='garlic'){ctx.fillStyle='#3d5335';ctx.beginPath();ctx.arc(0,7,21,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#e6efc8';for(let i=0;i<5;i++){const a=i*Math.PI*2/5+G.time*.08;ctx.beginPath();ctx.ellipse(Math.cos(a)*11,Math.sin(a)*7-3,7,11,a,0,7);ctx.fill();ctx.stroke()}ctx.fillStyle='#8eb06f';ctx.fillRect(-3,-27,6,14);ctx.globalAlpha=.22+.10*pulse;ctx.fillStyle='#d9efad';ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.fill()}
 else if(t.id==='rosary'){ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=.65;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.arc(Math.cos(a)*14,Math.sin(a)*14,3,0,7);ctx.fillStyle='#f3d59b';ctx.fill()}}
 else{ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(22,20);ctx.lineTo(-22,20);ctx.closePath();ctx.fill();ctx.stroke();ctx.font='23px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(t.icon,0,0)}
 if(t.supports?.some(s=>s.id==='holy')){ctx.globalAlpha=.35+.25*pulse;ctx.strokeStyle='#5ec8ff';ctx.beginPath();ctx.arc(0,0,29,0,7);ctx.stroke()}
 if(t.supports?.some(s=>s.id==='freeze')){ctx.globalAlpha=.4;ctx.strokeStyle='#b68cff';ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(0,0,34,0,7);ctx.stroke()}
 if(t.supports?.some(s=>s.id==='guardian')){ctx.globalAlpha=.28;ctx.strokeStyle='#ffe6a8';ctx.beginPath();ctx.arc(0,0,38,0,7);ctx.stroke()}
 ctx.shadowBlur=0;ctx.restore();
}
function draw(){
 battleTelemetryOverlay.update(G,nextChoiceMilestone(G));
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;ctx.setLineDash([]);
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);const _sh=shakeOffset(),sx=_sh.x,sy=_sh.y;const map=G?.map||MAPS[0];
 // The painted matte is the battlefield, not a backdrop behind a board.
 let screenGr=ctx.createLinearGradient(0,0,0,H);screenGr.addColorStop(0,map.sky||'#100b18');screenGr.addColorStop(.28,map.ground?.[0]||'#17121b');screenGr.addColorStop(1,map.ground?.[1]||'#08070c');ctx.fillStyle=screenGr;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.16;ctx.fillStyle=map.accent||'#8c5b74';for(let i=0;i<28;i++){const px=(i*97+(G?.time||0)*7)%Math.max(W,1),py=oy+GRID.rows*GRID.tile*scale+((i*53)%Math.max(90,H-oy));ctx.beginPath();ctx.arc(px,py,1+(i%3),0,7);ctx.fill()}ctx.globalAlpha=1;
 const cam=cameraTransform(),pixelX=Math.round((cam.x+sx)*DPR)/DPR,pixelY=Math.round((cam.y+sy)*DPR)/DPR;ctx.save();ctx.translate(pixelX,pixelY);ctx.scale(cam.worldScale,cam.worldScale);
 const gw=GRID.cols*GRID.tile,gh=GRID.rows*GRID.tile;renderBattlefieldFoundation(ctx,{map,width:gw,height:gh,time:G?.time||0});
 if(G){for(const route of G.routes||[G.path])renderIntegratedRoad(ctx,[{x:CATHEDRAL.gateX-.5,y:CATHEDRAL.gateY-.5},...route],{tileSize:GRID.tile,mapId:map.id});renderBattlefieldStructures(ctx,{routes:G.routes,plans:G.roadPlans,tileSize:GRID.tile,time:G.time});if(visualDebug())renderRoadNetworkDebug(ctx,{plans:G.roadPlans,routes:G.routes,events:G.roadEvents,cathedral:{x:CATHEDRAL.gateX,y:CATHEDRAL.gateY},tileSize:GRID.tile});
  if(G.roadReveal){const q=Math.max(0,G.roadReveal.life/G.roadReveal.maxLife);ctx.save();for(const [index,cell] of G.roadReveal.cells.entries()){const x=(cell.x+.5)*GRID.tile,y=(cell.y+.5)*GRID.tile;ctx.globalAlpha=.18*q;ctx.fillStyle='#d1b078';ctx.beginPath();ctx.ellipse(x,y,34*(1-q)+12,12*(1-q)+5,0,0,Math.PI*2);ctx.fill();for(let stone=0;stone<4;stone++){const a=(index*1.7+stone)*1.9,distance=(1-q)*(18+stone*5);ctx.globalAlpha=.65*q;ctx.fillStyle=stone%2?'#57534d':'#302f2e';ctx.save();ctx.translate(x+Math.cos(a)*distance,y+Math.sin(a)*distance*.55);ctx.rotate(a);ctx.fillRect(-5,-3,10,6);ctx.restore()}}ctx.restore()}
  const placingStructure=['tower','support'].includes(G.pendingCard?.type);
  renderPlacementPads(ctx,placementSlots(G,GRID.cols,GRID.rows),{tileSize:GRID.tile,active:placingStructure,time:G.time});
  if(G.pendingCard?.type==='roadpiece'){ctx.strokeStyle='#ffe18b';ctx.lineWidth=2;ctx.globalAlpha=.48+.32*Math.sin(G.time*4);ctx.setLineDash([7,6]);for(const end of activeRoadEndpoints()){ctx.beginPath();ctx.arc((end.x+.5)*64,(end.y+.5)*64,22,0,Math.PI*2);ctx.stroke()}ctx.setLineDash([]);ctx.globalAlpha=1;ctx.lineWidth=1;}
   if(G.pendingCard&&G.hoverTile){const p=G.hoverTile;if(G.pendingCard.type==='roadpiece'){const cells=roadCells(G.pendingCard,p,G.placementRotation),ok=validRoadPiece(G.pendingCard,p,G.placementRotation);ctx.globalAlpha=.62;ctx.fillStyle=ok?'#4fe07a':'#e04b5f';for(const q of cells)ctx.fillRect(q.x*64+5,q.y*64+5,54,54);ctx.globalAlpha=1}else if(['tower','support','trap'].includes(G.pendingCard.type)){const ok=G.pendingCard.type==='trap'?validTrapTile(p.x,p.y):G.pendingCard.type==='support'?validSupportTile(p.x,p.y):validTowerTile(p.x,p.y),color=ok?'#56dd82':'#e05262',radius=G.pendingCard.type==='trap'?23:28;ctx.save();ctx.globalAlpha=.25;ctx.fillStyle=color;ctx.beginPath();ctx.arc((p.x+.5)*64,(p.y+.5)*64,radius,0,7);ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(G.pendingCard.type==='support'?[5,4]:[]);ctx.stroke();ctx.restore()}}
   if(G.pendingCard?.type==='support'&&G.hoverTile){const p=G.hoverTile,targets=new Set(supportTargetsAt(p.x,p.y,G.pendingCard));ctx.save();ctx.lineWidth=2;ctx.setLineDash([5,4]);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const tower=G.towers.find(t=>!t.supportOnly&&t.x===p.x+dx&&t.y===p.y+dy);ctx.fillStyle=tower&&targets.has(tower)?'rgba(94,224,133,.24)':'rgba(202,176,102,.08)';ctx.strokeStyle=tower&&targets.has(tower)?'#5ee085':'#a78d5b88';ctx.fillRect((p.x+dx)*64+5,(p.y+dy)*64+5,54,54);ctx.strokeRect((p.x+dx)*64+5,(p.y+dy)*64+5,54,54)}ctx.setLineDash([]);ctx.fillStyle='#fff0b5';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(`SUPPORTS UP TO ${supportCapacity(inv(G.pendingCard.id).rarity)}`,(p.x+.5)*64,p.y*64-8);ctx.restore()}
  // Invisible destination aligned to the cathedral already painted in the matte.
  renderCathedralStateOverlay(ctx,{x:CATHEDRAL.gateX*64,y:CATHEDRAL.gateY*64-34,hpRatio:Math.max(0,G.hp/G.maxHp),time:G.time,debug:visualDebug()});
  if(G.selectedTower){const t=G.selectedTower,r=towerCombatRange(t)*64,x=(t.x+.5)*64,y=(t.y+.5)*64;ctx.save();ctx.fillStyle='rgba(126,210,255,.035)';ctx.strokeStyle='rgba(185,238,255,.52)';ctx.lineWidth=1.25;ctx.setLineDash([7,8]);ctx.beginPath();ctx.ellipse(x,y,r,r*.62,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='rgba(217,190,115,.62)';ctx.beginPath();ctx.ellipse(x,y,15,8,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
   for(const trap of G.traps){const x=(trap.x+.5)*64,y=(trap.y+.5)*64,pulse=.5+.5*Math.sin((G.time||0)*3+trap.x),id=String(trap.id||'');ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(4,5,7,.45)';ctx.beginPath();ctx.ellipse(0,8,25,10,0,0,Math.PI*2);ctx.fill();if(/spike|bear/i.test(id)){ctx.fillStyle='#25282a';ctx.strokeStyle='#090a0b';ctx.lineWidth=1.5;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*8-5,8);ctx.lineTo(i*8,-18-(i%2)*4);ctx.lineTo(i*8+5,8);ctx.closePath();ctx.fill();ctx.stroke()}}else if(/oil|fog|fire/i.test(id)){ctx.globalAlpha=.45+.16*pulse;const stain=ctx.createRadialGradient(0,5,2,0,5,25);stain.addColorStop(0,trap.color||'#6f5835');stain.addColorStop(1,'rgba(18,14,12,0)');ctx.fillStyle=stain;ctx.fillRect(-28,-23,56,56);for(let i=0;i<5;i++){ctx.fillStyle='#d47835';ctx.fillRect(-12+i*6,-2-Math.sin(i+G.time*5)*5,3,7)}}else{ctx.globalAlpha=.5+.16*pulse;ctx.strokeStyle=trap.color||'#c6a35c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,3,20,0,Math.PI*2);ctx.stroke();ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:17;i?ctx.lineTo(Math.cos(a)*r,3+Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,3+Math.sin(a)*r)}ctx.closePath();ctx.stroke()}ctx.restore()}
  drawSynergyLinks();
  ctx.save();for(const t of G.towers){const x=(t.x+.5)*64,y=(t.y+.5)*64;ctx.fillStyle='rgba(2,3,4,.52)';ctx.beginPath();ctx.ellipse(x,y+14,24,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#262728';ctx.strokeStyle='#111214';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-22,y+11);ctx.lineTo(x-17,y+2);ctx.lineTo(x+18,y+1);ctx.lineTo(x+23,y+11);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='rgba(174,159,125,.18)';ctx.beginPath();ctx.moveTo(x-14,y+5);ctx.lineTo(x+14,y+4);ctx.stroke()}ctx.restore();
  for(const t of G.towers){const x=(t.x+.5)*64,y=(t.y+.5)*64;ctx.save();if(t.recoil>0)ctx.translate((t.recX||0)*t.recoil*13,(t.recY||0)*t.recoil*13);drawTowerVisual(t,x,y);if((t.level||1)>1){ctx.save();ctx.globalAlpha=.34+.08*Math.sin((G.time||0)*3+t.x);ctx.strokeStyle=(t.level||1)>=5?'#ffe58a':(t.level||1)>=3?'#b8d9ff':'#c8b08a';ctx.lineWidth=1.5+Math.min(2,(t.level||1)*.3);ctx.beginPath();ctx.arc(x,y-7,20+Math.min(8,(t.level||1)*2),0,Math.PI*2);ctx.stroke();if((t.level||1)>=4){ctx.fillStyle='#8c2f4a';ctx.fillRect(x-18,y-31,5,13);ctx.fillRect(x+13,y-31,5,13)}ctx.restore()}if(t.flashT>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.min(.85,t.flashT*8);ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(x,y-6,13,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.restore();if(t.supportOnly){ctx.save();ctx.strokeStyle='#ffe58a';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((t.supportTarget.x+.5)*64,(t.supportTarget.y+.5)*64);ctx.stroke();ctx.restore();}ctx.font='11px serif';ctx.textAlign='center';ctx.fillStyle='#ffe69c';ctx.fillText('★'.repeat(Math.min(5,t.level)),x,y+28);if(t.supports?.length){ctx.font='13px serif';t.supports.forEach((s,i)=>{ctx.fillStyle='#15101ddd';ctx.beginPath();ctx.arc(x-14+i*16,y-34,9,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(s.icon,x-14+i*16,y-34)})}}
  for(const t of G.towers.filter(t=>!t.supportOnly)){const gems=inv(t.id).gemSlots.map(ascensionGemDef).filter(Boolean);if(!gems.length)continue;const x=(t.x+.5)*64,y=(t.y+.5)*64;ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='12px serif';gems.forEach((gem,index)=>{ctx.fillStyle='#09070ddd';ctx.strokeStyle=gem.color||'#e8c77a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+(index-.5)*16,y-45,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(gem.icon,x+(index-.5)*16,y-45)});ctx.restore()}
  // Keep progression remains active mechanically; no second façade is drawn over
  // the cathedral already present in the painted world.
  const hx=G.hero.x*64,hy=G.hero.y*64,heroLevel=currentShadowLevel();
  ctx.save();ctx.fillStyle='rgba(3,3,5,.42)';ctx.beginPath();ctx.ellipse(hx,hy+8,17,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
  const heroAction=(G.hero.attackAnim||0)>0?'attack':(G.hero.walking?'Walk':'Idle'),heroImg=spriteImage(shadowAsset(heroLevel,heroAction));
  const heroFrame=Math.floor((G.hero.anim||0)*(heroAction==='Idle'?.45:1));
  if(!drawSheetSprite(heroImg,hx,hy,heroFrame,directionRow(G.hero.facing||'down'),84)){ctx.fillStyle='#e6d0b4';ctx.beginPath();ctx.arc(hx,hy-10,8,0,7);ctx.fill();ctx.fillStyle='#5d1730';ctx.fillRect(hx-9,hy-2,18,25);}
  const fam=G.familiar;if(fam){const visual=COMPANION_BEHAVIOR_REGISTRY[fam.id]?.visual||{},orbit=(visual.orbitRadius||38)+(fam.level||1)*.35,fx=hx+Math.cos(fam.angle||0)*orbit,fy=hy-30+Math.sin(fam.angle||0)*14;ctx.save();ctx.translate(fx,fy);drawGlow(0,0,fam.color,17,.85);ctx.globalAlpha=.95;ctx.font=`${(visual.iconSize||22)+Math.min(8,(fam.level||1)/3)}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fam.icon,0,0);ctx.restore();}
  drawCorpses();
  for(const e of G.enemies){const x=e.x*64,y=e.y*64;const points=routePoints(e.routeIndex||0),a=points[e.seg],b=points[Math.min(points.length-1,e.seg+1)]||a;let face='down';if((e.cinematicPause||0)>0&&e.boss)face='down';else if(e.attacking)face='up';else if(a&&b){const dx=b.x-a.x,dy=b.y-a.y;face=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down')}e.face=face;const isGolem=isGolemBoss(e),enemyAction=enemyActionFor(e),img=spriteImage(enemySheet(e,enemyAction)),frame=enemyFrame(e,enemyAction,img),size=(isGolem?320:e.boss?240:e.mini?98:e.elite?90:78);ctx.save();if(e.hitKick)ctx.translate((e.kickX??-1)*(e.hitKick||0)*64,(e.kickY??0)*(e.hitKick||0)*64);if(e.squashT>0){const q=e.squashT/JUICE.squashT,sxq=1+JUICE.squash*q,syq=1-JUICE.squash*q*.8;ctx.translate(x,y);ctx.scale(sxq,syq);ctx.translate(-x,-y)}if(!(isGolem?drawGolemSprite(img,x,y,frame,directionRow(face),size):drawSheetSprite(img,x,y,frame,directionRow(face),size))){ctx.fillStyle=e.color||'#7e9b55';ctx.beginPath();ctx.arc(x,y-12,size*.22,0,Math.PI*2);ctx.fill();}ctx.restore();const barW=e.boss?112:e.mini?52:e.elite?48:44,barH=e.boss?9:5,barY=y+(isGolem?58:e.boss?46:e.mini?22:e.elite?20:18);ctx.fillStyle='#160b12';ctx.fillRect(x-barW/2,barY,barW,barH);ctx.fillStyle=e.boss?'#c22d55':'#d94458';ctx.fillRect(x-barW/2,barY,barW*Math.max(0,e.hp/e.max),barH);ctx.strokeStyle='#000';ctx.strokeRect(x-barW/2,barY,barW,barH)}
  drawMgsAlert();
  for(const lane of G.laneShots||[])drawLaneProjectileAsset(ctx,lane);
  for(const s of G.shots){const px=s.x*64,py=s.y*64,ang=Math.atan2(s.target.y-s.y,s.target.x-s.x);s.spin=(s.spin||0)+.22;ctx.save();ctx.translate(px,py);if(s.px!=null&&s.py!=null){ctx.save();ctx.rotate(-Math.atan2(s.y-s.py,s.x-s.px));ctx.globalAlpha=.24;ctx.fillStyle=s.color;ctx.fillRect(-26,-2,24,4);ctx.restore()}ctx.rotate(['dagger','axe','cross','gothicAxe'].includes(s.kind)?s.spin:ang);if(drawProjectileAsset(ctx,s,G.time)){ctx.restore();ctx.globalAlpha=1;continue}ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.globalAlpha=.9;ctx.lineWidth=2;if(s.kind==='scripture'){const tx=(s.target.x-s.x)*64,ty=(s.target.y-s.y)*64;ctx.strokeStyle='#fff3a6';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,0);const steps=5;for(let j=1;j<steps;j++){const q=j/steps,off=(j%2?1:-1)*(3+Math.sin((G.time||0)*18+j)*2);ctx.lineTo(tx*q+Math.cos(ang+Math.PI/2)*off,ty*q+Math.sin(ang+Math.PI/2)*off)}ctx.lineTo(tx,ty);ctx.stroke();drawGlow(0,0,'#ffe36e',9,.75);ctx.fillStyle='#fff8cf';ctx.beginPath();ctx.arc(0,0,3.5,0,7);ctx.fill()}else if(s.kind==='whip'){ctx.beginPath();ctx.moveTo(-20,0);ctx.quadraticCurveTo(-7,-10,5,0);ctx.quadraticCurveTo(13,8,20,-2);ctx.stroke()}else if(s.kind==='arrow'){ctx.fillRect(-10,-1,20,2);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(5,-3);ctx.lineTo(5,3);ctx.closePath();ctx.fill()}else if(s.kind==='familiar'){ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.fill()}else if(s.kind==='dagger'){ctx.fillRect(-9,-1.5,18,3);ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(4,-4);ctx.lineTo(4,4);ctx.closePath();ctx.fill()}else if(s.kind==='axe'){ctx.fillRect(-2,-10,4,20);ctx.beginPath();ctx.arc(3,-8,8,-1.4,1.4);ctx.stroke()}else if(s.kind==='bone'){ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(0,0,13,0,7);ctx.fill()}else if(s.kind==='cross'){ctx.fillRect(-2,-9,4,18);ctx.fillRect(-7,-3,14,5)}else{ctx.beginPath();ctx.arc(0,0,4,0,7);ctx.fill()}ctx.restore();ctx.globalAlpha=1}ctx.lineWidth=1;
  for(const a of G.ambient||[]){const ax=a.x*64,ay=(a.y+.18*Math.sin(a.phase))*64;ctx.globalAlpha=.18+.18*Math.sin(a.phase*1.7);ctx.fillStyle=a.kind===0?'#d8b86f':a.kind===1?'#a9c8d0':'#8b6b93';if(a.kind===2){ctx.beginPath();ctx.arc(ax,ay,2.2,0,7);ctx.fill()}else ctx.fillRect(ax,ay,1.5,4);ctx.globalAlpha=1}
  if(Math.sin(G.time*.35)>0.985){ctx.strokeStyle='#161018aa';ctx.lineWidth=2;for(let i=0;i<3;i++){const rx=((G.time*45+i*90)%gw),ry=45+i*10;ctx.beginPath();ctx.moveTo(rx-10,ry);ctx.quadraticCurveTo(rx,ry-8,rx+10,ry);ctx.quadraticCurveTo(rx+20,ry-8,rx+30,ry);ctx.stroke()}ctx.lineWidth=1}
  // Clear night is permanent in Battle 3.0. No full-board fog, rain or blood
  // filters are allowed to obscure the authored battlefield.
  for(const rain of G.holyRains||[]){const q=Math.max(0,1-rain.elapsed/rain.duration),r=rain.radius*64;ctx.save();ctx.globalAlpha=.12+.16*q;ctx.fillStyle='#8edcff';ctx.beginPath();ctx.arc(rain.x*64,rain.y*64,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.55*q;ctx.strokeStyle='#dffaff';ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.arc(rain.x*64,rain.y*64,r,0,Math.PI*2);ctx.stroke();ctx.restore()}
  for(const p of G.particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.maxLife?p.life/p.maxLife:p.life));ctx.fillStyle=p.color;if(p.kind==='soul'){const pr=2.2+Math.max(0,p.life);drawGlow(p.x*64,p.y*64,p.color,pr*3.1,.8);ctx.beginPath();ctx.arc(p.x*64,p.y*64,pr,0,7);ctx.fill()}else if(p.kind==='spark'){const k=Math.max(0,Math.min(1,p.life/.4)),sz=(p.size||2)*(.45+k);ctx.fillRect(p.x*64-sz/2,p.y*64-sz/2,sz,sz)}else if(p.kind==='holyDrop'){const x=p.x*64,y=p.y*64,len=8+(p.size||2)*3;drawGlow(x,y,p.color,7,.45);ctx.strokeStyle=p.color;ctx.lineWidth=p.size||2;ctx.beginPath();ctx.moveTo(x-2,y-len);ctx.lineTo(x,y);ctx.stroke()}else if(p.kind==='holySplash'){const q=Math.max(0,p.life/(p.maxLife||.2)),radius=(p.size||5)*(1-q);ctx.strokeStyle=p.color;ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(p.x*64,p.y*64,radius*2.2,radius*.55,0,0,7);ctx.stroke();ctx.fillStyle='#f3fdff';ctx.beginPath();ctx.arc(p.x*64,p.y*64-2,1.2*q,0,7);ctx.fill()}else if(p.kind==='splash'){ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(p.x*64,p.y*64,(p.size||4)*(1-p.life),2.2,0,0,7);ctx.stroke()}else if(p.kind==='debris'){const sz=p.size||3;ctx.fillRect(p.x*64-sz/2,p.y*64-sz/2,sz,sz)}else ctx.fillRect(p.x*64,p.y*64,3,3)}for(const f of G.floaters){const pop=1+.55*(1-Math.pow(1-(f.pop??1),3))-.55;const sz=Math.round((f.size||12)*(.55+.45*(f.pop??1))*(1+.18*pop));ctx.globalAlpha=Math.max(0,Math.min(1,f.life*1.4));ctx.font=`bold ${sz}px Georgia`;ctx.textAlign='center';if(f.crit){ctx.lineWidth=3;ctx.strokeStyle='#3a1420';ctx.strokeText(f.text,f.x*64,f.y*64)}ctx.fillStyle=f.color;ctx.fillText(f.text,f.x*64,f.y*64)}ctx.globalAlpha=1;
 }
 ctx.restore();drawGateVignette();drawRoseWindow();if(G?.flash){ctx.fillStyle=`rgba(220,210,255,${G.flash})`;ctx.fillRect(0,0,W,H)}
}

function renderInspector(){const el=$('#towerInspector');if(!G?.selectedTower){el.classList.add('hidden');return}const t=G.selectedTower,syn=synergyFor(t),state=cardUpgradeState(t.id),run=t.runEssenceUpgrades||{};el.classList.remove('hidden');const button=(stat,label,bonus)=>{const rank=state[stat]||0,max=towerUpgradeMax(stat),cost=towerUpgradeCost(t,stat);return `<button data-upgrade="${stat}" ${rank>=max?'disabled':''}>${label}<br><small>Lv ${rank}/${max} · ${bonus} · ${cost} pt</small></button>`},essenceButton=(stat,label)=>{const rank=run[stat]||0,max=stat==='range'?3:5,cost=essenceTowerUpgradeCost(t,stat);return `<button data-essence-upgrade="${stat}" ${rank>=max?'disabled':''}>${label}<br><small>Run Lv ${rank}/${max} · ✦ ${cost}</small></button>`};el.innerHTML=`<button id="closeInspect" class="inspect-close">×</button><h3>${t.icon} ${t.name}</h3><div>Damage <b>${Math.round(t.damage*G.globalDamage)}</b></div><div>Attack radius <b>${towerCombatRange(t).toFixed(2)} tiles</b></div><div>Attack <b>${(1/t.rate).toFixed(1)}/s</b></div><div>Spendable Essence <b>${Math.floor(G.essence)}</b></div><div class="tower-upgrade-grid essence-run-upgrades">${essenceButton('damage','✦ Damage')}${essenceButton('rate','✦ Speed')}${essenceButton('range','✦ Radius')}</div><div>Battle points <b>${G.battlePoints||0}</b></div><small class="card-wide-upgrade-note">Battle-point upgrades affect every ${t.name}; Essence reinforcements affect this tower for this hunt.</small><div class="tower-upgrade-grid">${button('damage','⚔ ATK','+24%')}${button('rate','⚡ Speed','+16%')}${button('range','◎ Radius','+0.30 tile')}</div><div>Card <b>${rarityDef(inv(t.id).rarity).name} · ${Math.round((t.permanentPower||1)*100)}%</b></div><div>Supports <b>${(t.supports||[]).map(s=>s.icon+' '+s.name).join(', ')||'None'}</b></div><div class="synergy-line">${(()=>{const ex=synergyExplain(t);if(!ex)return 'No active synergy — place this tower directly beside a partner tower (up, down, left or right) to form one.';return `✦ ${ex.names.join(' + ')}<br><small>${ex.summary}</small><br><small class="synergy-from">from ${ex.links.map(l=>l.n.name||l.n.id).join(', ')}</small>`})()}</div>`;$('#closeInspect').onclick=()=>{G.selectedTower=null;renderInspector()};el.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>upgradeSelectedTower(b.dataset.upgrade));el.querySelectorAll('[data-essence-upgrade]').forEach(b=>b.onclick=()=>essenceUpgradeSelectedTower(b.dataset.essenceUpgrade))}

const MAX_SIM_STEP=1/50;
// Outside a battle every animated term in draw() reads `G?.time||0`, which is 0,
// and shakeOffset() returns the origin — so the idle frame is pixel-identical on
// every tick. It was still being repainted 60 times a second behind an opaque
// Village or Cards screen: a full-viewport gradient, a 28-arc dust pass, the
// battlefield foundation, the gate vignette and the rose window, all while the
// 3D Village renderer and the Village DOM loops were competing for the same
// frame budget. Repaint it only when the canvas geometry actually moves.
let idleFrameKey='';
function paint(){
 try{draw()}catch(error){battleEvent('render-error',{message:error.message,stack:error.stack,wave:G?.wave});console.error('[Battle render failure]',error)}
}
function loop(now){trimParticles();const frameDt=Math.min(.05,(now-(G?.last||now))/1000);if(G)G.last=now;updateCameraTour(frameDt);const scaledDt=frameDt*(G?.speed||1),steps=Math.max(1,Math.ceil(scaledDt/MAX_SIM_STEP)),stepDt=scaledDt/steps;for(let i=0;i<steps;i++){const finalStep=i===steps-1;update(stepDt,finalStep,finalStep?scaledDt:0)}if(G&&Math.floor(now)%31===0)validateBattleState(G);
 if(G){idleFrameKey='';paint()}
 else{const key=`${W}|${H}|${DPR}|${ox}|${oy}|${scale}`;if(key!==idleFrameKey){idleFrameKey=key;paint()}}
 requestAnimationFrame(loop)}requestAnimationFrame(loop);
function setBattleMode(active){document.body.classList.toggle('battle-mode',!!active);if(!active)deactivateBattle3Runtime()}
function updateBottomNav(screen){
 const map={menu:'home',campaignScreen:'campaign',deckScreen:'cards',heroesScreen:'heroes',kingdomScreen:'more',relicVaultScreen:'relics',moreScreen:'more',upgradesScreen:'more',forgeScreen:'more',codexScreen:'more',profileScreen:'more',achievementsScreen:'more'};
 
// V27.2.2: one capture-phase controller for every Cards interaction.
// This intentionally avoids relying on fragile per-card click handlers on iPad/Chrome.
(function installCardsInteractionController(){
 const deckScreen=$('#deckScreen'),inspectScreen=$('#cardInspectScreen');
 if(!deckScreen||deckScreen.dataset.cardsController==='2722')return;
 deckScreen.dataset.cardsController='2722';
 let lastPointerAction=0,pointerGesture=null,suppressCardClickUntil=0;
 const activate=(event)=>{
  const keyboard=event.type==='keydown';
  if(keyboard&&event.key!=='Enter'&&event.key!==' ')return;
   if(event.type==='click'&&(performance.now()-lastPointerAction<500||performance.now()<suppressCardClickUntil))return;
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const tab=target.closest('.card-file-tab[data-card-filter]');
  if(tab&&deckScreen.contains(tab)){
   event.preventDefault();event.stopPropagation();
   const value=tab.dataset.cardFilter||'all';save.ui.cardFilter=value;
   const select=$('#deckTypeFilter');if(select)select.value=value;renderDeck();return;
  }
  const merge=target.closest('#mergeAllBtn');
  if(merge&&deckScreen.contains(merge)){event.preventDefault();event.stopPropagation();requestMergeAllDuplicates();return}
  const action=target.closest('[data-cards-action]');
  if(action&&deckScreen.contains(action)){
   event.preventDefault();event.stopPropagation();
   if(action.dataset.cardsAction==='empty-slot'){showToast('Choose a card from the collection');return}
    if(action.dataset.cardsAction==='ground-inspect'){
     const ground=groundCardById(action.dataset.groundCardId);
     if(ground)showCardDetail(ground);return;
   }
   const id=action.dataset.cardId,c=id?card(id):null;
   if(action.dataset.cardsAction==='locked'){const unlockAt=unlockChapterForCard(id);showToast(unlockAt?`Defeat Chapter ${unlockAt.number} to unlock ${c?.name||'this card'}`:`${c?.name||'This card'} is still locked`);return}
   if(c)showCardDetail(c);return;
  }
 };
 deckScreen.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const target=event.target instanceof Element?event.target.closest('[data-cards-action],.card-file-tab[data-card-filter],#mergeAllBtn'):null;
  pointerGesture=target?{id:event.pointerId,x:event.clientX,y:event.clientY,moved:false}:null;
 },{capture:true,passive:true});
 deckScreen.addEventListener('pointermove',event=>{
  if(!pointerGesture||pointerGesture.id!==event.pointerId)return;
  if(Math.hypot(event.clientX-pointerGesture.x,event.clientY-pointerGesture.y)>10)pointerGesture.moved=true;
 },{capture:true,passive:true});
 deckScreen.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const gesture=pointerGesture;pointerGesture=null;
  if(!gesture||gesture.id!==event.pointerId||gesture.moved){suppressCardClickUntil=performance.now()+700;return}
  lastPointerAction=performance.now();activate(event);
 },{capture:true,passive:false});
 deckScreen.addEventListener('pointercancel',()=>{pointerGesture=null;suppressCardClickUntil=performance.now()+700},{capture:true,passive:true});
 deckScreen.addEventListener('scroll',()=>{if(pointerGesture)pointerGesture.moved=true;suppressCardClickUntil=performance.now()+250},{capture:true,passive:true});
 deckScreen.addEventListener('click',activate,true);
 deckScreen.addEventListener('keydown',activate,true);
 let lastDetailPointer=0;
 const activateDetail=(event)=>{
  if(event.type==='click'&&performance.now()-lastDetailPointer<500)return;
  const btn=event.target instanceof Element?event.target.closest('[data-detail-action]'):null;if(!btn)return;
  event.preventDefault();event.stopPropagation();
   const id=btn.dataset.cardId,c=card(id)||groundCardById(id);if(!c)return;
   if(btn.dataset.detailAction==='deck'){
    const equipped=save.deck.includes(id);
    if(setDeckCard(id,!equipped)){openScreen(UI.deck);renderDeck();showToast(equipped?`${c.name} removed from battle deck`:`${c.name} added to battle deck`)}
   }else if(btn.dataset.detailAction==='ground'){
    const equipped=save.groundDefenseSlots.includes(id);
    if(setGroundDefenseCard(id,!equipped)){openScreen(UI.deck);renderDeck();showToast(equipped?`${c.name} removed from Hero`:`${c.name} added to Hero`)}
   }else if(btn.dataset.detailAction==='merge'){mergeCard(id);showCardDetail(c)}
 };
 inspectScreen?.addEventListener('pointerup',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;lastDetailPointer=performance.now();activateDetail(event)},{capture:true,passive:false});
 inspectScreen?.addEventListener('click',activateDetail,true);
})();

document.querySelectorAll('#bottomNav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===map[screen?.id]));
}
function openScreen(screen){
 if(document.body.classList.contains('battle-mode'))resetBattleVisualState('battle screen exit');
 [UI.menu,UI.deck,$('#campaignScreen'),$('#relicVaultScreen'),$('#heroesScreen'),$('#upgradesScreen'),$('#forgeScreen'),$('#codexScreen'),$('#profileScreen'),$('#cardInspectScreen'),$('#kingdomScreen'),$('#achievementsScreen'),$('#moreScreen')].forEach(s=>s?.classList.add('hidden'));
 UI.choices.classList.add('hidden');UI.over.classList.add('hidden');UI.hud.classList.add('hidden');setPlacementUI(null);
 screen.classList.remove('hidden');
 document.body.classList.toggle('cards-native-scroll',screen===UI.deck);
 setBattleMode(false);updateBottomNav(screen);if(screen===UI.menu)renderRoyalHome();
 const musicState=screen===UI.menu?'menu':screen?.id==='campaignScreen'?'campaign':'menu';AUDIO.setState(musicState);
}
function attackPattern(c){
 const map={axe:{title:'Rainbow Arc',html:'<div class="arc-demo"><span class="demo-tower">🪓</span><i></i><b>🦇</b><em>●</em></div>',text:'Throws a heavy axe through a high curved arc. It pierces clustered ground enemies and can strike flying bats along the arc.'},dagger:{title:'Rapid Line Volley',html:'<div class="line-demo"><span>🗡️</span><i>➤ ➤ ➤</i><b>●</b></div>',text:'Fires once every 3 seconds in a straight cardinal lane and pierces every enemy in its path. Level 1 reaches 3 tiles, Level 2 reaches 4, and Level 3 reaches 5.'},whip:{title:'Chain Sweep',html:'<div class="line-demo"><span>⛓️</span><i>⌁⌁⌁</i><b>● ●</b></div>',text:'Sweeps a short chain across nearby targets and excels at general defense.'},cross:{title:'Returning Path',html:'<div class="return-demo"><span>✝️</span><i>→ → ↩</i><b>●</b></div>',text:'The holy blade travels outward, then returns through enemies for a possible second hit.'},silver:{title:'Explosive Parabola',html:'<div class="arc-demo"><span>💥</span><i></i><b>●●●</b></div>',text:'Launches a slow shell in an arc that explodes across a clustered group.'},garlic:{title:'Pungent Aura',html:'<div class="line-demo"><span>🧄</span><i>◉ ◉ ◉</i><b>●●●</b></div>',text:'Continuously damages and slows every undead enemy inside its circular aura. Excellent beside bends and crowded road sections.'},familiar:{title:'Seeking Flight',html:'<div class="line-demo"><span>🦇</span><i>⌁ ↗ ⌁</i><b>●</b></div>',text:'Summoned familiars seek distant targets and naturally engage airborne enemies.'},scripture:{title:'Living Word Field',html:'<div class="line-demo"><span>📖</span><i>⚡ ✦ ⚡</i><b>● ● ●</b></div>',text:'Living Bibles orbit the tower and independently strike enemies inside its sacred field. Every level adds another Bible; level 3 and above chains holy lightning.'}};
 return map[c.id]||{title:c.type==='support'?'Tower Infusion':'Attack Profile',html:`<div class="line-demo"><span>${c.icon}</span><i>✦ ✦ ✦</i><b>●</b></div>`,text:c.desc};
}
function cardMetrics(c){
 if(c.type==='tower')return [['Damage',c.damage||0],['Range',(c.range||0).toFixed(1)+' tiles'],['Attack speed',(1/(c.rate||1)).toFixed(2)+'/s'],['Targets',['axe','dagger','cross','familiar'].includes(c.id)?'Ground + Flying':'Ground']];
 if(c.type==='support')return [['Role','Positional Support'],['Influence','Surrounding 8 tiles'],['Maximum Towers',supportCapacity(inv(c.id).rarity)],['Effect',c.id==='holy'?'Holy Splash':c.id==='freeze'?'Slow':c.supportEffect?Object.keys(c.supportEffect).join(' · '):'Protection']];
 if(c.type==='skill')return [['Role','One-use Skill'],['Targeting','Battlefield'],['Cost',c.cost+' souls']];
 if(c.type==='trap')return [['Category','Passive'],['Effect',c.effect||'Defense'],['Damage',c.damage||'—'],['Trigger speed',c.rate?`${(1/c.rate).toFixed(2)}/s`:'—']];
 return [['Role','Run-only Hero Upgrade'],['Duration','Current run'],['Cost','Free']];
}
function showCardDetail(c){
 const item=inv(c.id),r=rarityDef(item.rarity),ground=c.type==='trap',pattern=attackPattern(c);
 const compat=ground?'Equips to one of Shadow’s two Passive Card slots.':c.type==='support'?'Whip, Dagger, Axe, Cross, Clock, Bone, Familiar, Cannon, Rosary, Garlic, Living Word':c.type==='tower'?'Holy Water Infusion · Chrono Sigil · Guardian Ward':'—';
 const fav=save.favorites.includes(c.id),equipped=ground?save.groundDefenseSlots.includes(c.id):save.deck.includes(c.id);
 const unlockAt=unlockChapterForCard(c.id),owned=item.copies>0;
 const unlockText=owned?'Unlocked':unlockAt?`Defeat Chapter ${unlockAt.number}: ${unlockAt.name}`:'Campaign reward';
 const statusLabel=ground?'Hero Status':'Deck Status',statusValue=equipped?'Equipped':owned?'Reserve':'Locked';
 const action=ground?'ground':'deck',actionText=ground?(equipped?'Remove from Hero':'Add to Hero'):(equipped?'Remove From Deck':'Add To Deck');
 const favoriteControl=ground?'':`<button id="detailFavorite" class="favorite-button ${fav?'active':''}" type="button">★ ${fav?'Favorited':'Favorite'}</button>`;
 openScreen($('#cardInspectScreen'));
 const el=$('#cardDetail');
 el.innerHTML=`<div class="detail-card-wrap"><article class="card portrait-card detail-card rarity-${item.rarity}">${cardHTML(c,true)}</article></div><div class="detail-copy"><div class="detail-heading"><div class="detail-title-row"><span>${r.name} · Level ${item.level}</span>${favoriteControl}</div><h2>${cardIconHTML(c,item.level)} ${c.name}</h2><p>${c.desc}</p><small class="card-flavor">${ground?'A persistent Passive Card carried by Shadow into every hunt.':'A relic-bound technique preserved by the last defenders of the kingdom.'}</small></div><div class="metric-grid">${cardMetrics(c).map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}<div><small>Current Level</small><b>${item.level}</b></div><div><small>Rarity</small><b>${r.name}</b></div><div><small>Copies</small><b>${item.copies}</b></div><div><small>${statusLabel}</small><b>${statusValue}</b></div><div><small>Unlock Requirement</small><b>${unlockText}</b></div></div><section class="attack-panel"><h3>${ground?'Passive Effects':pattern.title}</h3>${ground?'':pattern.html}<p>${c.desc}</p></section><section><h3>${ground?'Upgrade Information':'Support compatibility'}</h3><p>${ground?`Level ${item.level} · ${Math.round(cardPower(c.id)*100)}% card power. Fuse matching copies when available to improve this passive.`:compat}</p></section></div><div class="detail-actions"><button id="detailEquip" data-detail-action="${action}" data-card-id="${c.id}" class="btn primary" ${owned?'':'disabled'}>${owned?actionText:'Locked'}</button>${!ground&&item.copies>=3?`<button id="detailMerge" data-detail-action="merge" data-card-id="${c.id}" class="btn gold">Fuse 3 Copies</button>`:''}</div>`;
 if(c.type==='tower'){const section=document.createElement('section');section.className='detail-gem-panel';section.innerHTML=`<h3>Permanent Gem Slots</h3><p>Each equipped gem permanently specializes every ${c.name}.</p><div>${item.gemSlots.map((id,index)=>{const gem=ascensionGemDef(id);return `<article><span>${gem?gem.icon:'○'}</span><div><b>${gem?gem.name:`Gem Slot ${index+1}`}</b><small>${gem?Object.entries(gem.passiveEffects||gem.effects||{}).map(([key,value])=>`${key} +${Math.round(value*100)}%`).join(' · '):'Empty — equip a gem from the Gems tab.'}</small></div>${gem?`<button type="button" data-remove-gem="${index}">Remove</button>`:''}</article>`}).join('')}</div>`;el.querySelector('.detail-copy')?.append(section);section.querySelectorAll('[data-remove-gem]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.removeGem),gemId=item.gemSlots[index];if(!gemId)return;save.ascension.gems[gemId]=(save.ascension.gems[gemId]||0)+1;item.gemSlots[index]=null;saveProgress('gem-remove');showCardDetail(c);showToast('Gem returned to inventory')})}
 const favoriteButton=$('#detailFavorite');if(favoriteButton)favoriteButton.onclick=()=>{toggleFavorite(c.id);showCardDetail(c)};
}

function renderCampaign(){
 const box=$('#chapterMap');
 const totalStars=Object.values(save.campaign.stars||{}).reduce((a,b)=>a+(Number(b)||0),0);
 $('#campaignProgress').textContent=`${Math.min(save.campaign.unlocked,CHAPTERS.length)} / ${CHAPTERS.length} · ${totalStars} ★`;
 box.innerHTML='<div class="campaign-map-title"><span>THE KINGDOM ROADS</span><strong>Choose the next cursed road</strong></div>';
 CHAPTERS.forEach((ch,index)=>{
  const unlocked=ch.number<=save.campaign.unlocked,done=save.campaign.completed.includes(ch.id),relic=RELICS.find(r=>r.id===ch.relic),stars=Number(save.campaign.stars?.[ch.id])||0;
  const el=document.createElement('article');
  el.className=`chapter-node map-node ${unlocked?'':'locked'} ${done?'completed':''} ${index%2?'map-right':'map-left'}`;
  el.innerHTML=`<div class="map-path-dot">${done?'✓':ch.number}</div><div class="chapter-art" style="--chapter-accent:${(MAPS.find(m=>m.id===ch.map)||MAPS[0]).accent}"><span>${relic?.icon||'☠️'}</span></div><div class="chapter-copy"><span class="section-kicker">CHAPTER ${ch.number}</span><h3>${ch.name}</h3><div class="chapter-stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p>${ch.lore}</p><div class="chapter-meta"><span>🌊 ${ch.waves} waves</span><span>☠️ ${ch.boss.name}</span><span>${relic?.icon||'◆'} ${relic?.name||'Relic'}</span></div><div class="star-objectives"><small>★ Clear the road</small><small>★ Keep Cathedral at 80%</small><small>★ Take no Cathedral damage</small></div></div><button class="btn ${unlocked?'primary':''}" ${unlocked?'':'disabled'}>${done?'Replay Road':'Enter Road'}</button>`;
  el.querySelector('button').onclick=()=>{if(!unlocked)return;save.campaign.selected=ch.id;saveProgress();freshGame('chapter',ch.id)};
  box.append(el);
 });
}
function renderRelicVault(){const box=$('#relicVaultGrid');const equipped=RELICS.find(r=>r.id===save.equippedRelic);$('#equippedRelicTxt').textContent=equipped?.name||'None';box.innerHTML='';RELICS.forEach((r,i)=>{const unlocked=save.unlockedRelics.includes(r.id),el=document.createElement('button');el.className=`relic-vault-card ${unlocked?'':'locked'} ${save.equippedRelic===r.id?'selected':''}`;el.disabled=!unlocked;el.innerHTML=`<div class="relic-icon">${unlocked&&r.image?`<img src="${r.image}" alt="">`:unlocked?r.icon:'?'}</div><span class="section-kicker">CHAPTER ${i+1} · UNIQUE RELIC</span><h3>${unlocked?r.name:'Undiscovered Relic'}</h3><p>${unlocked?(r.lore||r.desc):'Defeat the guardian of this chapter to reveal the relic.'}</p><small>${unlocked?r.desc:'This relic can only be earned once.'}</small><strong>${save.equippedRelic===r.id?'EQUIPPED':unlocked?'Tap to equip':'LOCKED'}</strong>`;el.onclick=()=>{save.equippedRelic=save.equippedRelic===r.id?null:r.id;saveProgress();renderRelicVault();showToast(save.equippedRelic?`${r.name} equipped`:'Relic unequipped')};box.append(el)})}
function renderHeroes(){const box=$('#heroCards');box.innerHTML='';const h=HEROES.find(x=>x.id===save.selectedHero)||HEROES[0],shadowLv=currentShadowLevel();const hero=document.createElement('article');hero.className='hero-choice selected';hero.innerHTML=`<div class="hero-avatar">${h.id==='warden'?shadowPortraitHTML(shadowLv):h.icon}</div><h3>${h.name}</h3><p>${h.desc}</p><div>Hunter level ${save.heroLevels[h.id]||1}</div>`;box.append(hero);const title=document.createElement('div');title.className='familiar-section-title';title.innerHTML='<span>SHADOW FAMILIARS</span><h3>Choose one companion</h3><p>Each familiar follows Shadow and keeps its own XP and level.</p>';box.append(title);for(const f of FAMILIARS){const st=familiarState(f.id),need=familiarXpNeed(st.level),pct=st.level>=20?100:Math.min(100,st.xp/need*100),el=document.createElement('button');el.className=`familiar-choice ${save.familiars.equipped===f.id?'selected':''}`;el.innerHTML=`<div class="familiar-icon">${f.icon}</div><div class="familiar-copy"><h3>${f.name}</h3><p>${f.role}</p><div class="familiar-level"><b>Level ${st.level}</b><span>${st.level>=20?'MAX':`${st.xp} / ${need} XP`}</span></div><div class="familiar-xp"><i style="width:${pct}%"></i></div></div><strong>${save.familiars.equipped===f.id?'EQUIPPED':'EQUIP'}</strong>`;el.onclick=()=>{save.familiars.equipped=f.id;saveProgress();renderHeroes();showToast(`${f.name} now follows Shadow`)};box.append(el)}}
function renderUpgrades(){const box=$('#upgradeCards');box.innerHTML='';$('#essenceTxt').textContent=save.essence;KEEP_UPGRADES.forEach(u=>{const rank=save.keepUpgrades[u.id]||0,cost=Math.round(u.cost*(1+rank*.45)),el=document.createElement('div');el.className='upgrade-card';el.innerHTML=`<h3>${u.name}</h3><p>${u.desc}</p><div>Rank ${rank} / ${u.max}</div><button class="btn" ${rank>=u.max||save.essence<cost?'disabled':''}>Upgrade · ${cost}</button>`;el.querySelector('button').onclick=()=>{if(save.essence<cost||rank>=u.max)return;save.essence-=cost;save.keepUpgrades[u.id]=rank+1;saveProgress();renderUpgrades();showToast(`${u.name} upgraded`)};box.append(el)})}

function renderKingdom(){const box=$('#kingdomBuildings');const levels=save.kingdom.buildings||{};const power=Object.values(levels).reduce((a,b)=>a+b,0);$('#kingdomRank').textContent=1+Math.floor(power/4);$('#kingdomPopulation').textContent=`Population ${12+power*4}`;$('#kingdomPower').textContent=`Kingdom Power ${power}`;box.innerHTML='';KINGDOM_BUILDINGS.forEach(b=>{const lv=levels[b.id]||0,cost=Math.round(b.cost*(1+lv*.55)),el=document.createElement('article');el.className=`kingdom-building ${lv?'':'unbuilt'}`;el.innerHTML=`<div class="building-icon">${b.icon}</div><h3>${b.name}</h3><p>${b.desc}</p><div>Level <b>${lv} / ${b.max}</b></div><button class="btn ${lv?'gold':''}" ${lv>=b.max||save.essence<cost?'disabled':''}>${lv?'Upgrade':'Construct'} · ${cost} Essence</button>`;el.querySelector('button').onclick=()=>{if(lv>=b.max||save.essence<cost)return;save.essence-=cost;save.materials.bloodEssence=save.essence;save.kingdom.buildings[b.id]=lv+1;save.kingdom.renown++;saveProgress();renderKingdom();showToast(`${b.name} is now level ${lv+1}`)};box.append(el)})}
function achievementValue(a){try{return Math.max(0,Number(a.value?.()??0)||0)}catch(_){return 0}}
function claimAchievement(a){
 if(save.achievements.claimed.includes(a.id))return;
 save.achievements.claimed.push(a.id);save.essence+=a.reward;save.materials.bloodEssence=save.essence;save.kingdom.renown+=2;
 if(a.cosmetic)save.cosmetics[a.cosmetic]=true;
 saveProgress();renderAchievements();showToast(`${a.name} claimed · ${a.cosmetic?'Dog Tag cosmetic unlocked · ':''}+${a.reward} Essence`);
}
function renderAchievements(){
 const box=$('#achievementGrid');let done=0;box.innerHTML='';
 for(const a of ACHIEVEMENTS){
  const v=achievementValue(a),complete=v>=a.goal,claimed=save.achievements.claimed.includes(a.id);if(complete)done++;
  const el=document.createElement('article');el.className=`achievement-card ${complete?'done':''} ${claimed?'claimed':''}`;
  el.innerHTML=`<span class="section-kicker">ROYAL DECREE · ${a.category}</span><h3>${complete?'✓ ':''}${a.name}</h3><p>${a.desc}</p><div class="progress"><i style="width:${Math.min(100,v/a.goal*100)}%"></i></div><div class="row spread"><span>${Math.min(v,a.goal).toLocaleString()} / ${a.goal.toLocaleString()}</span><b>🩸 ${a.reward}</b></div><button class="btn ${complete&&!claimed?'gold':''}" ${!complete||claimed?'disabled':''}>${claimed?'Claimed':complete?'Claim Reward':'In Progress'}</button>`;
  el.querySelector('button').onclick=()=>claimAchievement(a);box.append(el);
 }
 for(const a of HIDDEN_ACHIEVEMENTS){
  const complete=!!a.complete(),claimed=save.achievements.claimed.includes(a.id);if(complete)done++;
  const el=document.createElement('article');el.className=`achievement-card hidden-decree ${complete?'done revealed':''} ${claimed?'claimed':''}`;
  el.innerHTML=complete?`<span class="section-kicker">HIDDEN ROYAL DECREE</span><h3>✓ ${a.name}</h3><p>${a.desc}</p><div class="row spread"><span>1 / 1</span><b>🏷️ Dog Tag · 🩸 ${a.reward}</b></div><button class="btn ${!claimed?'gold':''}" ${claimed?'disabled':''}>${claimed?'Claimed':'Claim Secret Reward'}</button>`:`<span class="section-kicker">HIDDEN ROYAL DECREE</span><h3>Hidden Royal Decree</h3><p>Its title and purpose remain concealed.</p><div class="progress"><i style="width:0%"></i></div><div class="row spread"><span>0 / 1</span><b>Reward Hidden</b></div><button class="btn" disabled>Undiscovered</button>`;
  if(complete)el.querySelector('button').onclick=()=>claimAchievement(a);box.append(el);
 }
 $('#achievementCount').textContent=`${done} / ${ACHIEVEMENTS.length+HIDDEN_ACHIEVEMENTS.length}`;
}
function renderForge(){const box=$('#forgeCards');box.innerHTML='';$('#embersTxt').textContent=save.materials.forgeEmbers;CARD_POOL.filter(c=>inv(c.id).copies>0).forEach(c=>{const item=inv(c.id),rule=rarityUpgradeFor(item.rarity),next=rule?rarityDef(rule.to):null,materials=rule?Object.entries(rule.materials).map(([id,n])=>`${n} ${id}`).join(' · '):'',fragments=rule?.cardFragments?` · ${save.cardFragments[c.id]||0} / ${rule.cardFragments} fragments`:'';const el=document.createElement('article');el.className=`card portrait-card rarity-${item.rarity}`;el.innerHTML=`${cardHTML(c,true)}<div class="forge-line">${rule?`${item.copies} / ${rule.copies} copies${fragments}${materials?' · '+materials:''} · Next: ${next.name}`:'Maximum rarity'}</div><button class="btn gold" ${!canPayRarityUpgrade(item,c.id)?'disabled':''}>${rule?`Fuse ${rule.copies} Copies`:'Maximum rarity'}</button>`;el.querySelector('button').onclick=()=>{mergeCard(c.id);renderForge()};box.append(el)})}
function renderCodex(){const enemies=[['skeleton','Bone Soldier'],['wolf','Night Wolf'],['bat','Nightwing Bat'],['ghost','Castle Ghost'],['armor','Axe Armor'],['vampire','Vampire Spawn'],['necromancer','Grave Necromancer'],['warden','Eclipse Warden'],['thornbeast','Thornbound Beast'],['bloodcount','Blood Count'],['icebishop','Frozen Bishop'],['bogqueen','Bog Queen'],['siegeknight','Hollow Castellan'],['moonoracle','Fallen Oracle'],['vampireking','Blood King']];const entries=[...CARD_POOL.map(c=>({icon:c.icon,name:c.name,seen:inv(c.id).copies>0,type:'Card'})),...MAPS.map(m=>({icon:'🗺️',name:m.name,seen:!!save.discoveredMaps[m.id],type:'Map'})),...enemies.map(([id,name])=>({icon:'☠️',name,seen:!!save.discoveredEnemies[id],type:'Enemy'}))];const seen=entries.filter(e=>e.seen).length;$('#codexPct').textContent=Math.round(seen/entries.length*100)+'%';$('#codexGrid').innerHTML=entries.map(e=>`<div class="codex-entry ${e.seen?'':'locked'}"><span>${e.seen?e.icon:'?'}</span><b>${e.seen?e.name:'Undiscovered'}</b><small>${e.type}</small></div>`).join('')}
function renderProfile(){const s=save.stats;$('#profileGrid').innerHTML=[['Total Runs',s.runs],['Victories',s.wins],['Highest Wave',s.highestWave],['Total Kills',s.totalKills],['Common Cards Found',s.totalCards],['Fusions Completed',s.fusions],['Bosses Defeated',s.bosses],['Collection',CARD_POOL.filter(c=>inv(c.id).copies>0).length+'/'+CARD_POOL.length]].map(([a,b])=>`<div><small>${a}</small><strong>${b}</strong></div>`).join('');const labels={bloodEssence:'Blood Essence',eclipseShards:'Eclipse Shards',ancientRelics:'Ancient Relics',hunterMedallions:'Hunter Medallions',forgeEmbers:'Forge Embers'};$('#materialsGrid').innerHTML=Object.entries(labels).map(([k,v])=>`<div><span>${v}</span><b>${save.materials[k]||0}</b></div>`).join('');$('#historyList').innerHTML=save.runHistory.length?save.runHistory.map(r=>`<div class="history-row"><b>${r.result==='victory'?'Victory':'Defeat'} · Wave ${r.wave}</b><span>${r.map||'Unknown Map'} · ${r.kills} kills · ${r.chest}</span></div>`).join(''):'<p class="small">No hunts recorded yet.</p>'}

function renderRoyalHome(){
 const chapter=CHAPTERS[Math.max(0,Math.min(CHAPTERS.length-1,(save.campaign?.unlocked||1)-1))]||CHAPTERS[0];
 const rank=1+Object.values(save.kingdom?.buildings||{}).reduce((a,b)=>a+(b||0),0);
 const done=ACHIEVEMENTS.filter(a=>achievementValue(a)>=a.goal).length;
 const discovered=Object.values(save.discoveredMaps||{}).filter(Boolean).length+Object.values(save.discoveredEnemies||{}).filter(Boolean).length+CARD_POOL.filter(c=>inv(c.id).copies>0).length;
 const relic=RELICS.find(r=>r.id===save.equippedRelic);
 $('#homeHunterLevel').textContent=`Hunter Lv. ${Math.max(1,save.heroLevels?.[save.selectedHero]||1)}`;
 $('#homeEssence').textContent=save.essence||0;$('#homeEmbers').textContent=save.materials?.forgeEmbers||0;$('#homeKingdomRank').textContent=rank;$('#homeVictories').textContent=save.stats?.wins||0;
 $('#homeChapterText').textContent=`Chapter ${chapter.number}: ${chapter.name} · ${chapter.boss.name} awaits.`;
 $('#homeGreeting').textContent=(save.stats?.wins||0)>0?'The kingdom remembers your victories.':'The kingdom still stands.';
 $('#homeDeckText').textContent=`${save.deck.length} / 6 ready`;$('#homeRelicText').textContent=relic?relic.name:'No relic equipped';$('#homeDecreesText').textContent=`${done} completed`;$('#homeCodexText').textContent=`${discovered} discoveries`;
 const built=Object.values(save.kingdom?.buildings||{}).filter(Boolean).length;$('#homeKingdomText').textContent=built?`${built} chambers restored · Rank ${rank}`:'Build, upgrade, and strengthen every hunt.';
}

document.querySelectorAll('#bottomNav [data-nav]').forEach(btn=>btn.addEventListener('click',()=>{
 const dest=btn.dataset.nav;
 if(dest==='home')openScreen(UI.menu);
 if(dest==='campaign'){openScreen($('#campaignScreen'));renderCampaign()}
 if(dest==='cards'){openScreen(UI.deck);renderDeck()}
 if(dest==='heroes'){openScreen($('#heroesScreen'));renderHeroes()}
 if(dest==='kingdom'){openScreen($('#kingdomScreen'));renderKingdom()}
 if(dest==='relics'){openScreen($('#relicVaultScreen'));renderRelicVault()}
 if(dest==='more')openScreen($('#moreScreen'))
}));
document.querySelectorAll('[data-more-target]').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.moreTarget;if(t==='codex'){openScreen($('#codexScreen'));renderCodex()}if(t==='profile'){openScreen($('#profileScreen'));renderProfile()}if(t==='decrees'){openScreen($('#achievementsScreen'));renderAchievements()}}));
renderRoyalHome();updateBottomNav(UI.menu);

$('#kingdomBack').onclick=()=>openScreen(UI.menu);initKonami();initMetalGear();$('#achievementsBtn')?.addEventListener('click',()=>{openScreen($('#achievementsScreen'));renderAchievements()});$('#achievementsBack').onclick=()=>openScreen(UI.menu);

// V27.2.5: direct inspector return, exposed to the HTML button so it cannot be
// lost behind delegated/canvas input handling on iPad Chromium.
window.__returnToCardsDeck=function(event){
 event?.preventDefault?.();event?.stopPropagation?.();
 const now=performance.now();
 if(window.__cardsReturnAt&&now-window.__cardsReturnAt<250)return false;
 window.__cardsReturnAt=now;
 openScreen(UI.deck);renderDeck();
 requestAnimationFrame(()=>{window.scrollTo(0,0);UI.deck?.scrollTo?.(0,0);});
 return false;
};

const bindClick=(selector,handler)=>{const el=$(selector);if(el)el.addEventListener('click',handler);};
// iPad/Safari can lose synthetic click events while the battle canvas owns touch input.
// Battle HUD controls use pointer-up directly, with click as a keyboard/accessibility fallback.
const bindBattlePress=(selector,handler)=>{
 const el=$(selector);if(!el)return;
 let lastPointer=0;
 el.style.touchAction='manipulation';
 el.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();event.stopPropagation();lastPointer=performance.now();handler(event);
 });
 el.addEventListener('click',event=>{
  if(performance.now()-lastPointer<450)return;
  event.preventDefault();event.stopPropagation();handler(event);
 });
};
bindClick('#backBtn',()=>openScreen(UI.menu));
bindClick('#saveDeckBtn',()=>{if(save.deck.length!==6)return showToast('Choose exactly six cards');saveProgress();showToast('Deck saved')});
// V27.2.4: hardened inspector return for iPad/Chrome.
(function bindInspectorReturn(){
 const button=$('#inspectBack'),screen=$('#cardInspectScreen');
 if(!button||button.dataset.returnBound==='2724')return;
 button.dataset.returnBound='2724';
 let lastPointer=0;
 const goBack=(event)=>{
  event?.preventDefault?.();event?.stopPropagation?.();
  openScreen(UI.deck);renderDeck();
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
 };
 button.addEventListener('pointerup',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  lastPointer=performance.now();goBack(event);
 },{capture:true,passive:false});
 button.addEventListener('click',event=>{
  if(performance.now()-lastPointer<500)return;
  goBack(event);
 },true);
 screen?.addEventListener('keydown',event=>{
  if(event.key==='Escape')goBack(event);
 });
})();
$('#mergeOnly')?.addEventListener('change',renderDeck);
bindClick('#mergeAllBtn',requestMergeAllDuplicates);
bindClick('#forgeBtn',()=>{openScreen($('#forgeScreen'));renderForge()});bindClick('#forgeBack',()=>openScreen(UI.menu));
bindClick('#codexBack',()=>openScreen(UI.menu));
bindClick('#profileBtn',()=>{openScreen($('#profileScreen'));renderProfile()});bindClick('#profileBack',()=>openScreen(UI.menu));
bindClick('#campaignBack',()=>openScreen(UI.menu));bindClick('#relicVaultBack',()=>openScreen(UI.menu));
bindClick('#heroesBtn',()=>{openScreen($('#heroesScreen'));renderHeroes()});bindClick('#heroesBack',()=>openScreen(UI.menu));
bindClick('#upgradesBtn',()=>{openScreen($('#upgradesScreen'));renderUpgrades()});bindClick('#upgradesBack',()=>openScreen(UI.menu));
bindClick('#profileQuickBtn',()=>{openScreen($('#profileScreen'));renderProfile()});
if($('#deckTypeFilter'))$('#deckTypeFilter').value=save.ui.cardFilter;if($('#deckSort'))$('#deckSort').value=save.ui.cardSort;$('#deckTypeFilter')?.addEventListener('change',()=>{save.ui.cardFilter=$('#deckTypeFilter').value;renderDeck()});$('#deckSort')?.addEventListener('change',()=>{save.ui.cardSort=$('#deckSort').value;renderDeck()});
function returnToMainMenu(){
  // Fully tear down every battle-only layer before reopening the Royal Home.
  resetBattleVisualState('return to Village');
  if(G){G.paused=true;G.state='over';G.pendingCard=null;G.selected=null;G.selectedTower=null;}
  document.body.classList.remove('battle-mode');
  UI.hud.classList.add('hidden');
  UI.choices.classList.add('hidden');
  UI.over.classList.add('hidden');
  $('#battleCinematic')?.classList.add('hidden');
  $('#towerInspector')?.classList.add('hidden');
  $('#placementBar')?.classList.add('hidden');
  $('#bossWrap')?.classList.add('hidden');
  $('#waveBanner')?.classList.add('hidden');
  setPlacementUI(null);
  openScreen(UI.menu);
  renderRoyalHome();
  AUDIO.setState('menu',true);
  queueCloudSave('return-to-village');flushCloudSave('return-to-village');
  window.scrollTo(0,0);
}
function returnToCardsMenu(){
  // Same full teardown as Home, but land directly in the card/deck screen.
  resetBattleVisualState('return to Cards');
  if(G){G.paused=true;G.state='over';G.pendingCard=null;G.selected=null;G.selectedTower=null;G.draftOpen=false;}
  document.body.classList.remove('battle-mode');
  UI.hud.classList.add('hidden');UI.choices.classList.add('hidden');UI.over.classList.add('hidden');
  $('#chapterTenCinematic')?.classList.add('hidden');$('#battleCinematic')?.classList.add('hidden');
  $('#towerInspector')?.classList.add('hidden');$('#placementBar')?.classList.add('hidden');
  $('#bossWrap')?.classList.add('hidden');$('#waveBanner')?.classList.add('hidden');
  setPlacementUI(null);openScreen(UI.deck);renderDeck();AUDIO.setState('menu',true);queueCloudSave('battle-exit');flushCloudSave('battle-exit');
  requestAnimationFrame(()=>{window.scrollTo(0,0);UI.deck?.scrollTo?.(0,0);});
}

// V26.3 — one clean control route only. No capture routers, synthetic events,
// overlapping touch systems, or global gesture interception. The visible native
// buttons call window.VillageBattleAPI through the classic-script bridge in HTML.
function syncNativeBattleControls(explicitState){
  const state=explicitState&&typeof explicitState==='object'
    ? {...(window.VillageBattleAPI?.state?.()||{}),...explicitState}
    : (window.VillageBattleAPI?.state?.()||{active:false,speed:1,paused:false});
  const speedBtn=document.querySelector('#speedBtn');
  const pauseBtn=document.querySelector('#pauseBtn');
  const speedIcon=speedBtn?.querySelector('.command-icon');
  const speedLabel=speedBtn?.querySelector('small');
  const pauseIcon=pauseBtn?.querySelector('.command-icon');
  const pauseLabel=pauseBtn?.querySelector('small');
  const speed=Number(state.speed)||1;
  const paused=Boolean(state.paused);
  if(speedIcon)speedIcon.textContent='×'+speed;
  if(speedLabel)speedLabel.textContent='Speed';
  if(speedBtn){
    speedBtn.dataset.speed=String(speed);
    speedBtn.setAttribute('aria-label','Change battle speed. Current speed '+speed+' times');
    speedBtn.classList.toggle('is-active',speed>1);
  }
  if(pauseIcon)pauseIcon.textContent=paused?'▶':'Ⅱ';
  if(pauseLabel)pauseLabel.textContent=paused?'Resume':'Pause';
  if(pauseBtn){
    pauseBtn.dataset.paused=paused?'true':'false';
    pauseBtn.setAttribute('aria-label',paused?'Resume battle':'Pause battle');
    pauseBtn.classList.toggle('is-active',paused);
  }
  document.body.classList.toggle('battle-paused',paused&&document.body.classList.contains('battle-mode'));
  return {speed,paused};
}
window.syncNativeBattleControls=syncNativeBattleControls;

bindClick('#closeTut',()=>{UI.tutorial.classList.add('hidden');save.tutorialSeen=true;saveProgress()});
bindClick('#helpBtn',()=>UI.tutorial.classList.remove('hidden'));
bindClick('#rotateBtn',()=>{if(G?.pendingCard?.type==='roadpiece'){for(let i=1;i<=4;i++){const r=(G.placementRotation+i)%4;if(!G.hoverTile||validRoadPiece(G.pendingCard,G.hoverTile,r)){G.placementRotation=r;break}}showToast('Road piece rotated')}});
bindClick('#cancelPlaceBtn',()=>{if(!G)return;if(G.towerEditMode){cancelTowerEdit();return;}if(G.draftChoices&&!G.draftChoiceCommitted){reopenDraftChoices();return;}G.pendingCard=null;G.hoverTile=null;setPlacementUI(null);if(G.draftOpen){UI.choices.classList.remove('hidden');showToast('Choose one of the three cards')}else{G.paused=false;G.pendingWave=false;showToast('Placement cancelled')}});
// V32.2 — the old reset removed two keys out of the six this game writes, so
// the village plots, the legacy plot stores and the easter-egg flags all
// survived a "full reset". It also used a native confirm(), which blocks the
// main thread while the render loop, the audio graph and the village timers
// keep queueing work — then reloaded straight into that. On a memory-tight
// iPad that is a very good way to lose the tab.
const RESET_KEYS=['relicsEclipseSave','relicsEclipseSave_backup_v12','gateRunnerSave',
 'theVillageFreshTownV1Plots','rotkVillagePlots','rotkVillagePlotsV224B',
 'village.vk.mode','village.tactical.mode','villageFreshStartToken'];
// 'rotk.village.' was missing, so a confirmed "erase everything" left the
// Living Village state — claimed secrets, constructions, trophies — behind.
const RESET_PREFIXES=/^(relicsEclipse|gateRunner|rotkVillage|rotk\.village\.|theVillage|village\.)/;
function wipeAllProgress(){
 let removed=0;
 for(const k of RESET_KEYS){try{if(localStorage.getItem(k)!==null){localStorage.removeItem(k);removed++}}catch(_){}}
 try{
  for(const k of Object.keys(localStorage)){
   if(RESET_PREFIXES.test(k)){try{localStorage.removeItem(k);removed++}catch(_){}}
  }
 }catch(_){}
 return removed;
}
function hardReset(){
 // quiet everything down before the document is torn down
 try{ if(typeof G!=='undefined'&&G){G.paused=true;G.state='over';} }catch(_){}
 try{ AUDIO.setState('silence',true); }catch(_){}
 try{ window.__villageAudio?.(false); }catch(_){}
 wipeAllProgress();
 // replace() with a changed URL guarantees a genuinely fresh document rather
 // than a reload that can be served from the back/forward cache mid-frame
 setTimeout(()=>{try{location.replace(location.pathname+'?fresh='+Date.now())}catch(_){location.reload()}},80);
}
function confirmReset(){
 if(document.getElementById('resetConfirm'))return;
 const el=document.createElement('div');
 el.id='resetConfirm'; el.className='journey-overlay';
 el.innerHTML=`<div class="journey-panel" style="max-width:440px">
   <div class="journey-kicker">START OVER</div>
   <h2>Begin a new chronicle?</h2>
   <p>Every card, chapter, relic, research project and building will be lost, and
   the Village will be as it was on the first night. This cannot be undone.</p>
   <div class="journey-actions">
     <button class="journey-ghost" data-reset-cancel type="button">Keep my progress</button>
     <button class="journey-primary" data-reset-go type="button">Erase everything</button>
   </div></div>`;
 document.body.appendChild(el);
 el.querySelector('[data-reset-cancel]').addEventListener('click',()=>el.remove());
 el.querySelector('[data-reset-go]').addEventListener('click',()=>{el.remove();hardReset()});
}
// V33.0.1 — portable save backups without replacing the working navigation system.
const SAVE_BUNDLE_VERSION=1;
// Kept in step with src/online/cloudSave.js: this decides which keys reach a
// save export, a recovery backup and a restore.
const SAVE_KEY_PATTERN=/^(relicsEclipse|gateRunner|rotkVillage|rotk\.village\.|theVillage|village\.)/;
// An export or backup must not carry earlier backups: without this, every
// snapshot nested the one before it and the bundle compounded on each save. The
// debug channel is a per-device preference, not progress. Mirrors
// EXCLUDED_KEY_PATTERN in src/online/cloudSave.js.
const SAVE_KEY_EXCLUDED=/^village\.(cloud\.|saveRecovery\.|feedback\.|debug$)/;
const isSaveKey=key=>(SAVE_KEY_PATTERN.test(key)||key==='villageFreshStartToken')&&!SAVE_KEY_EXCLUDED.test(key);
function collectVillageStorage(){
 const entries={};
 try{
  for(const key of Object.keys(localStorage)){
   if(isSaveKey(key))entries[key]=localStorage.getItem(key);
  }
 }catch(err){console.warn('Could not collect Village save data.',err)}
 return entries;
}
function backupCurrentStorage(reason='manual'){
 const snapshot={format:'the-village-storage-backup',version:SAVE_BUNDLE_VERSION,reason,createdAt:new Date().toISOString(),entries:collectVillageStorage()};
 try{localStorage.setItem('village.saveRecovery.latestBackup',JSON.stringify(snapshot))}catch(_){}
 return snapshot;
}
function downloadJsonFile(filename,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=filename;link.style.display='none';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function exportVillageSave(){
 try{
  saveProgress();
  const bundle={format:'the-village-save-bundle',version:SAVE_BUNDLE_VERSION,gameVersion:ASCENSION_VERSION,exportedAt:new Date().toISOString(),entries:collectVillageStorage()};
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  downloadJsonFile(`The_Village_Save_${stamp}.json`,bundle);
  showToast('Save backup exported');
 }catch(err){console.error('Save export failed.',err);showToast('Could not export save')}
}
function normalizeImportedSave(payload){
 if(payload&&payload.format==='the-village-save-bundle'&&payload.entries&&typeof payload.entries==='object')return payload.entries;
 if(payload&&payload.format==='the-village-storage-backup'&&payload.entries&&typeof payload.entries==='object')return payload.entries;
 if(payload&&typeof payload==='object'&&!Array.isArray(payload))return {'relicsEclipseSave':JSON.stringify(payload)};
 throw new Error('Unsupported Village save file');
}
async function importVillageSaveFile(file){
 if(!file)return;
 try{
  const payload=JSON.parse(await file.text());
  const entries=normalizeImportedSave(payload);
  backupCurrentStorage('before-import');
  let restored=0;
  for(const [key,value] of Object.entries(entries)){
   if(isSaveKey(key)&&typeof value==='string'){
    localStorage.setItem(key,value);restored++;
   }
  }
  if(!restored)throw new Error('No Village save records found');
  showToast(`Restored ${restored} save records`);
  setTimeout(()=>location.reload(),500);
 }catch(err){console.error('Save import failed.',err);showToast('Invalid or unreadable save file')}
}
function parseStoredJson(key){
 try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}
}
function countUnlockedCards(data){
 const candidates=[data?.collection,data?.cards,data?.unlockedCards,data?.inventory];
 for(const value of candidates){
  if(Array.isArray(value))return value.length;
  if(value&&typeof value==='object')return Object.keys(value).filter(k=>value[k]!==false&&value[k]!=null).length;
 }
 return '—';
}
function getSaveSummary(){
 const data=parseStoredJson('relicsEclipseSave')||{};
 const entries=collectVillageStorage();
 const completed=data.completedLevels||data.completedStages||data.completedChapters||data.campaign?.completed||[];
 const highest=Array.isArray(completed)?Math.max(0,...completed.map(Number).filter(Number.isFinite)):(Number(data.highestLevel||data.highestStage||data.campaignLevel||data.levelCompleted)||0);
 const resources=data.resources||data.wallet||{};
 const towers=data.unlockedTowers||data.towersUnlocked||data.towerUnlocks||data.collection?.towers;
 const towerCount=Array.isArray(towers)?towers.length:(towers&&typeof towers==='object'?Object.keys(towers).filter(k=>towers[k]!==false).length:'—');
 return {
  version:ASCENSION_VERSION,
  saveVersion:data.saveVersion||data.version||'Legacy compatible',
  highestLevel:highest||data.currentLevel||data.stage||'—',
  hunterLevel:data.hunterLevel||data.playerLevel||data.shadowLevel||data.hero?.level||'—',
  towers:towerCount,
  cards:countUnlockedCards(data),
  gold:resources.gold??data.gold??'—',
  records:Object.keys(entries).length,
  updated:data.updatedAt||data.lastSaved||data.timestamp||new Date().toISOString()
 };
}
function renderSaveManagerInfo(){
 const host=$('#saveManagerInfo');if(!host)return;
 const info=getSaveSummary();
 const fields=[['Game Version',info.version],['Save Format',info.saveVersion],['Highest Level',info.highestLevel],['Hunter Level',info.hunterLevel],['Towers Unlocked',info.towers],['Cards Recorded',info.cards],['Gold',info.gold],['Storage Records',info.records],['Last Read',new Date(info.updated).toLocaleString()]];
 host.innerHTML=fields.map(([label,value])=>`<div><span>${label}</span><b>${String(value)}</b></div>`).join('');
}
function openSaveManager(){
 const modal=$('#saveManagerModal');if(!modal)return;
 renderSaveManagerInfo();
 renderBalanceTools();
 $('#saveManagerConfirm')?.classList.add('hidden');
 modal.classList.remove('hidden');
}
function renderBalanceTools(){
 if(!import.meta.env.DEV)return;const info=$('#saveManagerInfo');if(!info||document.querySelector('#balanceTools'))return;
 const panel=document.createElement('section');panel.id='balanceTools';panel.className='balance-tools';panel.innerHTML=`<h3>Development Balance Profiles</h3><p>These profiles are isolated from the live local and cloud save. Add <code>?balanceProfile=clean</code> or choose a benchmark.</p><div class="balance-tool-actions">${['clean','stage-5','stage-10','stage-20','stage-30','normalized-copy'].map(id=>`<button type="button" data-balance-profile="${id}">${id}</button>`).join('')}<button type="button" data-export-telemetry>Export telemetry</button></div>${BALANCE_SANDBOX?`<strong>Active sandbox: ${BALANCE_PROFILE}</strong>`:''}`;
 info.insertAdjacentElement('afterend',panel);panel.addEventListener('click',event=>{const profile=event.target.closest('[data-balance-profile]')?.dataset.balanceProfile;if(profile){const url=new URL(location.href);url.searchParams.set('balanceProfile',profile);location.assign(url);}if(event.target.closest('[data-export-telemetry]'))downloadJsonFile(`The_Village_Balance_Telemetry_${Date.now()}.json`,exportProgressionTelemetry())});
}
function closeSaveManager(){
 $('#saveManagerModal')?.classList.add('hidden');
 $('#saveManagerConfirm')?.classList.add('hidden');
}
function saveNowFromManager(){
 try{saveProgress('manual-save');flushCloudSave('manual-save');backupCurrentStorage('manual-save');renderSaveManagerInfo();showToast('Progress saved and cloud sync queued')}catch(err){console.error(err);showToast('Could not save progress')}
}
function restoreLatestBackup(){
 try{
  const snapshot=parseStoredJson('village.saveRecovery.latestBackup')||parseStoredJson('village.saveRecovery.initialBackup');
  if(!snapshot?.entries)throw new Error('No backup available');
  const current=backupCurrentStorage('before-restore');
  localStorage.setItem('village.saveRecovery.preRestoreBackup',JSON.stringify(current));
  let restored=0;
  for(const [key,value] of Object.entries(snapshot.entries)){
   if(isSaveKey(key)&&typeof value==='string'){localStorage.setItem(key,value);restored++}
  }
  if(!restored)throw new Error('Backup contained no save records');
  showToast(`Restored ${restored} save records`);setTimeout(()=>location.reload(),500);
 }catch(err){console.error('Backup restore failed.',err);showToast('No usable backup was found')}
}
let saveManagerConfirmAction=null;
function askSaveManagerConfirmation(message,action){
 const box=$('#saveManagerConfirm'),text=$('#saveManagerConfirmText');
 if(!box||!text)return;
 text.textContent=message;saveManagerConfirmAction=action;box.classList.remove('hidden');box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
bindClick('#saveManagerBtn',()=>openSaveManager());
bindClick('#saveManagerClose',()=>closeSaveManager());
$('#saveManagerModal')?.addEventListener('click',event=>{if(event.target.id==='saveManagerModal')closeSaveManager()});
bindClick('#saveNowBtn',()=>saveNowFromManager());
bindClick('#exportSaveBtn',()=>exportVillageSave());
bindClick('#importSaveBtn',()=>$('#importSaveFile')?.click());
bindClick('#restoreBackupBtn',()=>askSaveManagerConfirmation('Restore the latest safety backup? Your current save will be backed up first.',()=>restoreLatestBackup()));
bindClick('#refreshSaveInfoBtn',()=>{renderSaveManagerInfo();showToast('Save information refreshed')});
bindClick('#deleteSaveManagerBtn',()=>askSaveManagerConfirmation('Delete all local Village progress on this device? Export first if you may need it later.',()=>hardReset()));
bindClick('#saveManagerConfirmCancel',()=>{saveManagerConfirmAction=null;$('#saveManagerConfirm')?.classList.add('hidden')});
bindClick('#saveManagerConfirmGo',()=>{const action=saveManagerConfirmAction;saveManagerConfirmAction=null;$('#saveManagerConfirm')?.classList.add('hidden');if(action)action()});
$('#importSaveFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(file)askSaveManagerConfirmation(`Import ${file.name}? Your current save will be backed up first.`,()=>importVillageSaveFile(file))});
try{
 if(!localStorage.getItem('village.saveRecovery.initialBackup')){
  localStorage.setItem('village.saveRecovery.initialBackup',JSON.stringify({format:'the-village-storage-backup',version:SAVE_BUNDLE_VERSION,reason:'first-safe-start',createdAt:new Date().toISOString(),entries:collectVillageStorage()}));
 }
}catch(_){}

bindClick('#resetBtn',()=>confirmReset());
const audioPanel=$('#audioPanel'),audioBtn=$('#audioBtn');
function syncAudioControls(){if(!audioPanel)return;$('#audioMaster').checked=save.settings.audio!==false;$('#musicEnabled').checked=save.settings.music!==false;$('#sfxEnabled').checked=save.settings.sfx!==false;$('#musicVolume').value=save.settings.musicVolume??.46;$('#sfxVolume').value=save.settings.sfxVolume??.72;$('#ambienceVolume').value=save.settings.ambienceVolume??.34}
audioBtn?.addEventListener('click',e=>{e.stopPropagation();AUDIO.unlock();audioPanel.classList.toggle('hidden');syncAudioControls()});$('#audioClose')?.addEventListener('click',()=>audioPanel.classList.add('hidden'));
[['#audioMaster','audio','change'],['#musicEnabled','music','change'],['#sfxEnabled','sfx','change'],['#musicVolume','musicVolume','input'],['#sfxVolume','sfxVolume','input'],['#ambienceVolume','ambienceVolume','input']].forEach(([sel,key,ev])=>$(sel)?.addEventListener(ev,e=>{save.settings[key]=e.target.type==='checkbox'?e.target.checked:Number(e.target.value);AUDIO.apply();saveProgress()}));syncAudioControls();
renderDeckAnalysis();

/* Milestone 7.3 stability patch: fixed viewport, contained scrolling, reliable tabs */
(function installStabilityPatch(){
  const root=document.documentElement;
  const setAppHeight=()=>{
    // Use the layout viewport, not visualViewport. On iPhone Safari the browser
    // toolbar changes visualViewport.height during a swipe; continuously rewriting
    // the fixed app height interrupts native momentum scrolling.
    const h=Math.max(320,Math.round(window.innerHeight||root.clientHeight));
    root.style.setProperty('--app-height',`${h}px`);
  };
  setAppHeight();
  let viewportTimer=0;
  const scheduleAppHeight=()=>{
    clearTimeout(viewportTimer);
    viewportTimer=setTimeout(setAppHeight,180);
  };
  window.addEventListener('resize',scheduleAppHeight,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(setAppHeight,240),{passive:true});

  // Do not install a document-level touchmove preventDefault handler. Gameplay
  // already owns input on the canvas, while menus must retain untouched native
  // iOS scrolling. A global listener can cancel a Cards swipe after it begins.

  const tabs=document.querySelector('.card-file-tabs');
  if(tabs){
    tabs.addEventListener('click',event=>{
      const tab=event.target.closest('.card-file-tab');
      if(!tab)return;
      event.preventDefault();
      const filter=tab.dataset.cardFilter||'all';
      tabs.querySelectorAll('.card-file-tab').forEach(item=>{
        const selected=item===tab;
        item.classList.toggle('active',selected);
        item.setAttribute('aria-selected',String(selected));
      });
      const select=$('#deckTypeFilter');if(select)select.value=filter;save.ui.cardFilter=filter;saveProgress();
      renderDeck();
      const collection=$('#collectionCards');if(collection)collection.scrollTop=0;
    });
    tabs.querySelectorAll('.card-file-tab').forEach((tab,index)=>tab.setAttribute('aria-selected',String(index===0)));
  }

})();

// V32.4.2 — the legacy V22.3b Village controller that lived here has been
// removed. src/villageBootstrap.js sets window.__ROTK_VILLAGE_BOOTSTRAP__ at
// module-evaluation time and main.js imports it before this file, so the old
// controller's guard clause made every line below it permanently unreachable.
// Village ownership now lives in exactly one place: src/villageBootstrap.js.


// V25.7 native-link bootstrap. This deliberately uses a full page navigation
// for the two result-screen choices so iPad/WebKit cannot lose the command to
// canvas pointer capture or a stale overlay.
(function applyV257NavigationAction(){
 const params=new URLSearchParams(location.search);
 const action=params.get('v257');
 if(!action)return;
 history.replaceState(null,'',location.pathname+location.hash);
 if(action==='retry'){
  setTimeout(()=>freshGame('chapter',save.campaign.selected),120);
 }else if(action==='menu'){
  setTimeout(()=>returnToMainMenu(),0);
 }
})();
