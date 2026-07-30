export const villageModels = [
  'house_lv1', 'house_lv2', 'house_lv3', 'house_lv4', 'house_lv5',
  'farm', 'lumber_camp', 'quarry', 'warehouse', 'library', 'alchemist',
  'enchanter', 'blacksmith', 'tavern', 'keep', 'cathedral', 'stone_wall',
  'fence', 'bench', 'market_stall', 'wagon', 'barrel', 'lamp_post', 'statue',
  'bridge', 'dead_tree', 'shrub', 'rock_cluster'
];

export const citizenSprites = [
  ['Blonde Woman', 'blonde_woman'],
  ['Blonde Man', 'blonde_man'],
  ['Blonde Kid Girl', 'blonde_kid_girl'],
  ['Farmer', 'farmer'],
  ['Knight', 'knight']
];

export const shadowFamilies = [
  ['shadow_lv_01-03', 1, 'Swordsman_lvl1'],
  ['shadow_lv_01-03', 2, 'Swordsman_lvl2'],
  ['shadow_lv_01-03', 3, 'Swordsman_lvl3'],
  ['shadow_lv_04-06', 4, 'lvl4'],
  ['shadow_lv_04-06', 5, 'lvl5'],
  ['shadow_lv_04-06', 6, 'lvl6'],
  ['shadow_lv_07-09', 7, 'lvl7'],
  ['shadow_lv_07-09', 8, 'lvl8'],
  ['shadow_lv_07-09', 9, 'lvl9']
];

export const enemyFamilies = [
  ['goblins', 'Orc1', 'orc1', true],
  ['goblins', 'Orc2', 'orc2', true],
  ['goblins', 'Orc3', 'orc3', true],
  ['flower', 'Plant1', 'Plant1', false],
  ['flower', 'Plant2', 'Plant2', false],
  ['flower', 'Plant3', 'Plant3', false],
  ['vampire', 'Vampires1', 'Vampires1', false],
  ['vampire', 'Vampires2', 'Vampires2', false],
  ['vampire', 'Vampires3', 'Vampires3', false],
  ['zombie', 'Zombie1', 'Zombie1', false],
  ['zombie', 'Zombie2', 'Zombie2', false],
  ['zombie', 'Zombie3', 'Zombie3', false],
  ['floating_eye', 'Beholder1', 'Beholder1', false],
  ['floating_eye', 'Beholder2', 'Beholder2', false],
  ['floating_eye', 'Beholder3', 'Beholder3', false]
];

const shadowActions = ['Walk', 'Idle', 'attack'];
const enemyActions = ['Walk', 'Attack', 'Hurt', 'Death', 'Idle'];
const golemActions = ['Walk', 'Attack', 'Idle', 'Death'];

export function runtimePublicAssets() {
  const assets = new Set([
    'assets/village/house_lv01.png',
    'assets/village/house_lv02.png',
    'assets/village/farm_plot.png'
  ]);

  for (const id of villageModels) {
    assets.add(`assets/village/The_Village_Gothic_GLBS_Phase1/${id}.glb`);
  }
  for (const [folder, stem] of citizenSprites) {
    assets.add(`assets/citizens/${folder}/${stem}.png`);
    assets.add(`assets/citizens/${folder}/${stem}_shadow.png`);
  }
  for (const [group, level, prefix] of shadowFamilies) {
    for (const action of shadowActions) {
      assets.add(`assets/characters/${group}/PNG/Swordsman_lvl${level}/With_shadow/${prefix}_${action}_with_shadow.png`);
    }
  }
  for (const [group, folder, prefix, lower] of enemyFamilies) {
    for (const action of enemyActions) {
      assets.add(`assets/enemies/${group}/PNG/${folder}/With_shadow/${prefix}_${lower ? action.toLowerCase() : action}_with_shadow.png`);
    }
  }
  for (let form = 1; form <= 3; form++) {
    for (const action of golemActions) {
      assets.add(`assets/enemies/boss_enemies/boss_golem_1/Tiled_files/Golem${form}_${action}_with_shadow.png`);
    }
  }
  return [...assets].sort();
}

export const viteManagedAssets = [
  'assets/characters/shadow_portrait_lvl-01/shadow_portrait_lvl-01.png',
  'assets/audio/music/battle/battle_01.ogg',
  'assets/audio/music/boss/boss_battle_01.ogg',
  'assets/audio/music/village/untitled.ogg'
];
