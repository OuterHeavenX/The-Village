import assert from 'node:assert/strict';
import { calculateVillageRates, projectVillageProduction } from '../src/Village/economyModel.js';

const staffed=calculateVillageRates({house:2,farm:2,sawmill:1,quarry:1,storehouse:1});
assert.equal(staffed.populationCapacity,16,'houses must expand population capacity');
assert.equal(staffed.storageCapacity,1000,'warehouse must expand passive storage');
assert.ok(staffed.workerDemand>0&&staffed.workforceRatio>0,'production buildings must request workers');

const offline=projectVillageProduction({food:0,wood:0,stone:0,iron:0,essence:0,gold:0},staffed,48*3600000);
assert.equal(offline.hours,12,'offline production must stop at twelve hours');
assert.ok(offline.projected.food>0,'staffed farms must produce food');

const full=projectVillageProduction({food:1000,wood:1000,stone:1000,iron:1000,essence:1000,gold:1000},staffed,3600000);
assert.equal(full.projected.food,1000,'full storage must stop production');
assert.equal(full.gain.food,0,'full storage must report no credited gain');

const legacy=projectVillageProduction({food:2400,wood:0,stone:0,iron:0,essence:0,gold:8000},staffed,3600000);
assert.equal(legacy.projected.food,2400,'legacy resources above capacity must never be removed');
assert.equal(legacy.projected.gold,8000,'earned currency above capacity must never be removed');

const understaffed=calculateVillageRates({farm:8,sawmill:5,quarry:5});
assert.ok(understaffed.workforceRatio<1,'production must reflect an understaffed settlement');
assert.ok(understaffed.food<64,'understaffed farms must not run at full output');

console.log('Village economy validation passed: workforce, storage, offline cap, and legacy balance preservation.');
