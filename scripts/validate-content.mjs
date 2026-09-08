// Content integrity checks for the data registries.
//
// These are the cheap, high-value invariants that a browser game silently
// violates: a duplicate id that shadows an earlier entry, a research project
// that unlocks a building that does not exist, a building nothing can ever
// unlock, a chapter pointing at a relic the registry does not have.
//
// This deliberately imports only the pure data modules under src/data/ and
// src/Ascension/, never the DOM-owning engine modules, so it runs in plain Node.
import {
  VILLAGE_BUILDINGS,
  VILLAGE_BUILD_CATEGORIES,
  VILLAGE_RESEARCH,
  VILLAGE_STARTER_BUILDINGS
} from '../src/data/villageBuildings.js';
import { CAMPAIGN_CHAPTERS } from '../src/data/campaign.js';
import { MODEL_FOR_BUILDING, VILLAGE_MODELS } from '../src/Village/worldRegistry.js';
import {
  COMPANION_REGISTRY,
  ELEMENT_REGISTRY,
  EQUIPMENT_REGISTRY,
  FUSION_REGISTRY,
  GEM_REGISTRY,
  RELIC_REGISTRY
} from '../src/Ascension/registry.js';

const failures = [];
const fail = message => failures.push(message);

function checkUniqueIds(label, entries, idOf = entry => entry.id) {
  const seen = new Set();
  for (const entry of entries) {
    const id = idOf(entry);
    if (!id) fail(`${label}: an entry has no id`);
    else if (seen.has(id)) fail(`${label}: duplicate id "${id}"`);
    seen.add(id);
  }
}

// --- Registry ids are unique -------------------------------------------------
checkUniqueIds('chapters', CAMPAIGN_CHAPTERS);
checkUniqueIds('relics', RELIC_REGISTRY);
checkUniqueIds('equipment', EQUIPMENT_REGISTRY);
checkUniqueIds('gems', GEM_REGISTRY);
checkUniqueIds('fusions', FUSION_REGISTRY);
checkUniqueIds('companions', COMPANION_REGISTRY);
checkUniqueIds('elements', ELEMENT_REGISTRY);
checkUniqueIds('village research', VILLAGE_RESEARCH);
checkUniqueIds('build categories', VILLAGE_BUILD_CATEGORIES, entry => entry[0]);

// A gem and a fusion recipe share one id space in save.ascension.gems, so a
// collision between the two registries would silently merge two stacks.
const gemIds = new Set(GEM_REGISTRY.map(gem => gem.id));
for (const recipe of FUSION_REGISTRY) {
  if (gemIds.has(recipe.id)) fail(`fusion recipe "${recipe.id}" collides with a gem id`);
}

// --- Campaign spine ----------------------------------------------------------
const chapterNumbers = CAMPAIGN_CHAPTERS.map(chapter => chapter.number);
const finalStage = Math.max(...chapterNumbers);
for (const [index, chapter] of CAMPAIGN_CHAPTERS.entries()) {
  if (chapter.number !== index + 1) {
    fail(`chapter "${chapter.id}" is number ${chapter.number} at position ${index + 1}; campaign rewards index by registry order`);
  }
  if (!chapter.map) fail(`chapter "${chapter.id}" has no map`);
  if (!chapter.boss?.id) fail(`chapter "${chapter.id}" has no boss`);
  if (!(chapter.waves > 0)) fail(`chapter "${chapter.id}" has no wave count`);
}
// game.js assigns chapter relics as RELIC_REGISTRY[number - 1].
if (RELIC_REGISTRY.length < CAMPAIGN_CHAPTERS.length) {
  fail(`only ${RELIC_REGISTRY.length} relics for ${CAMPAIGN_CHAPTERS.length} chapters; the last chapters would award nothing`);
}

// --- Village construction ----------------------------------------------------
const buildingIds = new Set(Object.keys(VILLAGE_BUILDINGS));
const categoryIds = new Set(VILLAGE_BUILD_CATEGORIES.map(entry => entry[0]));

for (const [id, def] of Object.entries(VILLAGE_BUILDINGS)) {
  if (!def.name) fail(`building "${id}" has no name`);
  if (!def.cat) fail(`building "${id}" has no category`);
  else if (!categoryIds.has(def.cat)) fail(`building "${id}" uses unknown category "${def.cat}"`);
  if (!def.production) fail(`building "${id}" has no production label`);
  const costs = def.costs || { gold: def.cost };
  if (!Object.values(costs).some(value => Number(value) > 0)) fail(`building "${id}" is free`);
}

for (const id of VILLAGE_STARTER_BUILDINGS) {
  if (!buildingIds.has(id)) fail(`starter building "${id}" has no catalog entry`);
}

for (const research of VILLAGE_RESEARCH) {
  if (!research.unlocks?.length) fail(`research "${research.id}" unlocks nothing`);
  for (const unlock of research.unlocks || []) {
    if (!buildingIds.has(unlock)) fail(`research "${research.id}" unlocks unknown building "${unlock}"`);
  }
  if (!(research.requiresStage >= 1)) {
    fail(`research "${research.id}" has no requiresStage`);
  } else if (research.requiresStage > finalStage) {
    fail(`research "${research.id}" requires chapter ${research.requiresStage}, past the final chapter ${finalStage}; it can never be offered`);
  }
  if (VILLAGE_STARTER_BUILDINGS.some(id => research.unlocks?.includes(id))) {
    fail(`research "${research.id}" unlocks a building that is already a starter`);
  }
}

// Every catalog entry needs a 3D model, or it is placed in the Village as
// nothing at all.
for (const id of buildingIds) {
  const model = MODEL_FOR_BUILDING[id];
  if (!model) fail(`building "${id}" has no MODEL_FOR_BUILDING entry; it would render as an empty plot`);
  else if (!VILLAGE_MODELS.includes(model)) fail(`building "${id}" maps to unknown model "${model}"`);
}

// The check that matters most: a catalog entry no route in the game can reach
// is content the player pays for in art and confusion but can never build.
const reachable = new Set([
  ...VILLAGE_STARTER_BUILDINGS,
  ...VILLAGE_RESEARCH.flatMap(research => research.unlocks || [])
]);
for (const id of buildingIds) {
  if (!reachable.has(id)) {
    fail(`building "${id}" is unreachable: it is not a starter and no research unlocks it`);
  }
}

if (failures.length) {
  console.error(`Content validation failed:\n${failures.map(item => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(
  `Content validation passed: ${CAMPAIGN_CHAPTERS.length} chapters, ${RELIC_REGISTRY.length} relics, ` +
  `${Object.keys(VILLAGE_BUILDINGS).length} buildings all reachable through ${VILLAGE_RESEARCH.length} research projects, ` +
  `${EQUIPMENT_REGISTRY.length} equipment, ${GEM_REGISTRY.length} gems, ${FUSION_REGISTRY.length} fusions, ${COMPANION_REGISTRY.length} companions.`
);
