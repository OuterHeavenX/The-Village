// Authored cathedral-to-breach routes. Only an initial segment is active at
// battle start; wave events reveal the rest without changing living enemies.
const ROUTES=Object.freeze({
 left:[[10,3],[10,4],[9,4],[8,4],[7,4],[6,4],[6,5],[5,5],[4,5],[4,6],[3,6],[3,7],[2,7],[2,8],[3,8],[3,9],[4,9],[4,10],[3,10],[3,11],[2,11],[2,12],[3,12],[3,13],[4,13],[4,14],[3,14],[3,15],[2,15],[2,16]],
 right:[[10,3],[10,4],[11,4],[12,4],[13,4],[13,5],[14,5],[14,6],[13,6],[13,7],[14,7],[14,8],[13,8],[12,8],[12,9],[13,9],[14,9],[14,10],[13,10],[13,11],[12,11],[12,12],[13,12],[14,12],[14,13],[13,13],[13,14],[14,14],[14,15],[13,15],[13,16]],
 center:[[10,3],[10,4],[9,4],[9,5],[8,5],[8,6],[7,6],[7,7],[8,7],[8,8],[7,8],[7,9],[8,9],[9,9],[9,10],[8,10],[8,11],[7,11],[7,12],[8,12],[9,12],[9,13],[8,13],[8,14],[7,14],[7,15],[8,15],[8,16]]
});
const clone=name=>ROUTES[name].map(([x,y])=>({x,y}));
const event=(wave,type,routeIndex,count=0,label='ROAD EXPANDS')=>({wave,type,routeIndex,count,label});

export function authoredRoadPlans(stage=1){
 const n=Math.max(1,Number(stage)||1),split=n>=5,triple=n>=11;
 const plans=triple?[clone('left'),clone('center'),clone('right')]:split?[clone('left'),clone('right')]:[clone(n%2?'left':'right')];
 const initialLength=n===1?14:n<5?13:12,events=[];
 const waves=n===1?[2,4,6]:n<5?[2,4,7]:[2,4,7];
 for(const [i,wave] of waves.entries())events.push(event(wave,'EXTEND_ROUTE',0,i===waves.length-1?99:4,i===waves.length-1?'OUTER BREACH REVEALED':'ROAD EXPANDS'));
 if(split){events.push(event(n===5?5:4,'OPEN_ROUTE',1,8,'SECOND BREACH'));events.push(event(n===5?8:7,'EXTEND_ROUTE',1,8,'SECOND ROAD EXPANDS'));events.push(event(n===5?11:n<=10?9:10,'EXTEND_ROUTE',1,99,'SECOND BREACH FULLY OPEN'));}
 if(triple){events.push(event(7,'OPEN_ROUTE',2,8,'THIRD BREACH'));events.push(event(12,'EXTEND_ROUTE',2,99,'THIRD INVASION ROAD'));}
 return {pattern:triple?'triple-split':split?'y-split':'standard',plans,initialLength,events:events.sort((a,b)=>a.wave-b.wave)};
}

export function roadSegmentsForPlan(plan,routeIndex=0,size=5){const segments=[];for(let start=0;start<plan.length;start+=size)segments.push({id:`route_${routeIndex+1}_segment_${String(segments.length+1).padStart(2,'0')}`,routeIndex,start,end:Math.min(plan.length,start+size),cells:plan.slice(start,start+size)});return segments}
export const CATHEDRAL_ENTRANCE=Object.freeze({gateX:10.36,gateY:2.75,cellX:10,cellY:3});
