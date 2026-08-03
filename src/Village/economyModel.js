const rate=(counts,id,value)=>(Number(counts[id])||0)*value;
export const VILLAGE_RESOURCE_KEYS=Object.freeze(['food','wood','stone','iron','essence','gold']);
export const VILLAGE_MAX_OFFLINE_HOURS=12;

export function calculateVillageRates(counts={}){
  const buildings=Object.values(counts).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  const populationCapacity=8+rate(counts,'house',4)+rate(counts,'manor',9)+rate(counts,'almshouse',6);
  const population=Math.min(populationCapacity,Math.max(4,4+Math.floor(buildings*1.4)));
  const workerDemand=rate(counts,'farm',2)+rate(counts,'orchard',2)+rate(counts,'herbGarden',1)+rate(counts,'sawmill',2)+rate(counts,'quarry',2)+rate(counts,'stonemason',2)+rate(counts,'blacksmith',2)+rate(counts,'market',1)+rate(counts,'tavern',1)+rate(counts,'alchemist',2);
  const workforceRatio=workerDemand?Math.min(1,population/workerDemand):1;
  const storageCapacity=500+rate(counts,'storehouse',500)+rate(counts,'market',75)+rate(counts,'townhall',250);
  const productive=value=>value*workforceRatio;
  return {
    food:productive(rate(counts,'farm',8)+rate(counts,'orchard',11)+rate(counts,'herbGarden',5)+rate(counts,'well',3)),
    wood:productive(rate(counts,'sawmill',9)),stone:productive(rate(counts,'quarry',8)+rate(counts,'stonemason',5)),
    iron:productive(rate(counts,'blacksmith',3)+rate(counts,'tannery',1)),
    essence:productive(rate(counts,'herbGarden',2)+rate(counts,'chapel',4)+rate(counts,'shrine',2)+rate(counts,'graveyard',3)+rate(counts,'alchemist',3)),
    gold:productive(rate(counts,'market',12)+rate(counts,'tavern',5)+rate(counts,'stable',4)),
    population,populationCapacity,capacity:populationCapacity,storageCapacity,workerDemand,workersAssigned:Math.min(population,workerDemand),workforceRatio,counts,buildings
  };
}

export function projectVillageProduction(economy,rates,elapsedMs){
  const boundedMs=Math.max(0,Math.min(Number(elapsedMs)||0,VILLAGE_MAX_OFFLINE_HOURS*3600000)),hours=boundedMs/3600000;
  const gain={},projected={},capped={};
  for(const key of VILLAGE_RESOURCE_KEYS){
    gain[key]=(Number(rates[key])||0)*hours;
    const before=Math.max(0,Number(economy[key])||0),limit=rates.storageCapacity;
    // Legacy saves and one-off rewards may legitimately sit above the passive
    // storage ceiling. Capacity stops new production; it must never confiscate
    // resources the player already earned.
    projected[key]=before>=limit?before:Math.min(limit,before+gain[key]);
    capped[key]=Math.max(0,before+gain[key]-projected[key]);gain[key]=projected[key]-before;
  }
  return {hours,elapsedMs:boundedMs,gain,projected,capped,storageCapacity:rates.storageCapacity};
}
