import { terrainFor } from './terrainRegistry.js';
import { battlefieldVisualPreset } from '../battlefieldConfig.js';

// Battle 3 terrain is assembled once into a cached runtime surface. It uses no
// battlefield photograph/matte and costs one drawImage per frame after creation.
const foundationCache=new Map();
const fract=value=>value-Math.floor(value);
const noise=(x,y,seed=1)=>fract(Math.sin(x*127.1+y*311.7+seed*73.3)*43758.5453);

function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawStone(ctx,x,y,w,h,shade,cracked=false){
  ctx.fillStyle=shade;roundedRect(ctx,x,y,w,h,2);ctx.fill();
  ctx.strokeStyle='rgba(175,180,174,.07)';ctx.lineWidth=.8;ctx.stroke();
  if(cracked){ctx.strokeStyle='rgba(5,6,8,.42)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+w*.58,y+1);ctx.lineTo(x+w*.44,y+h*.45);ctx.lineTo(x+w*.67,y+h-1);ctx.stroke();}
}
function drawWall(ctx,x,y,w,h){
  ctx.fillStyle='#080b10';ctx.fillRect(x,y,w,h);ctx.fillStyle='#20252a';ctx.fillRect(x,y,w,8);
  for(let row=0;row<Math.ceil(h/13);row++)for(let col=0;col<Math.ceil(w/28);col++){
    const sx=x+col*28+(row%2?14:0),sy=y+10+row*13;
    ctx.fillStyle=noise(col,row,4)>.5?'#171b20':'#12161b';ctx.fillRect(sx,sy,26,11);
    ctx.strokeStyle='#05070a';ctx.strokeRect(sx,sy,26,11);
  }
  for(let bx=x;bx<x+w;bx+=42){ctx.fillStyle='#262b30';ctx.fillRect(bx,y-7,25,14);ctx.fillStyle='#090c10';ctx.fillRect(bx+4,y-4,17,8);}
}
function drawFence(ctx,x,y,length,vertical=false){
  ctx.save();ctx.translate(x,y);if(vertical)ctx.rotate(Math.PI/2);ctx.strokeStyle='#090b0e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.moveTo(0,11);ctx.lineTo(length,11);ctx.stroke();
  ctx.lineWidth=3;for(let i=0;i<=length;i+=22){ctx.beginPath();ctx.moveTo(i,-9);ctx.lineTo(i,19);ctx.stroke();ctx.fillStyle='#181c20';ctx.beginPath();ctx.moveTo(i,-13);ctx.lineTo(i-3,-7);ctx.lineTo(i+3,-7);ctx.closePath();ctx.fill()}ctx.restore();
}
function drawDeadTree(ctx,x,y,scale=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle='#0a090a';ctx.lineCap='round';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,24);ctx.lineTo(-2,-14);ctx.lineTo(-17,-34);ctx.moveTo(-2,-12);ctx.lineTo(17,-28);ctx.lineTo(27,-42);ctx.moveTo(-10,-25);ctx.lineTo(-25,-19);ctx.moveTo(16,-28);ctx.lineTo(10,-44);ctx.stroke();ctx.restore();
}
function buildFoundation(map,width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');
  const terrain=terrainFor(map?.id),stageSeed=[...String(map?.id||'default')].reduce((n,c)=>n+c.charCodeAt(0),0);
  const base=ctx.createLinearGradient(0,0,0,height);base.addColorStop(0,'#111820');base.addColorStop(.32,'#12191a');base.addColorStop(1,'#0b0e0e');ctx.fillStyle=base;ctx.fillRect(0,0,width,height);
  // Broad packed-earth and damaged-paving fields define the three combat zones.
  const fields=[[.49,.16,.34,.12],[.38,.46,.48,.25],[.55,.76,.56,.22]];
  for(const [fx,fy,fw,fh] of fields){const g=ctx.createRadialGradient(width*fx,height*fy,8,width*fx,height*fy,width*fw);g.addColorStop(0,'rgba(46,52,45,.38)');g.addColorStop(.7,'rgba(27,31,28,.20)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height*fh+height*fy);}
  // Ancient paving: about 820 batched stones on the cached surface, zero per-frame geometry.
  const stoneW=31,stoneH=17;
  for(let row=3;row<Math.ceil(height/stoneH);row++)for(let col=1;col<Math.ceil(width/stoneW)-1;col++){
    const n=noise(col,row,stageSeed);if(n<.16||noise(col,row,stageSeed+8)>.88)continue;
    const perspective=.72+(row*stoneH/height)*.30,w=stoneW*perspective-3,h=stoneH*perspective-3,x=col*stoneW+(row%2)*stoneW*.5,y=row*stoneH;
    const value=18+Math.floor(n*17);drawStone(ctx,x,y,w,h,`rgb(${value},${value+3},${value+2})`,n>.77);
  }
  // Moss, dirt and wear break the paving without obscuring placement territory.
  for(let i=0;i<95;i++){const x=noise(i,2,stageSeed)*width,y=(.15+noise(i,5,stageSeed)*.82)*height,r=5+noise(i,9,stageSeed)*23;ctx.fillStyle=`rgba(${28+Math.floor(noise(i,1)*12)},${39+Math.floor(noise(i,3)*15)},${29},${.035+noise(i,7)*.055})`;ctx.beginPath();ctx.ellipse(x,y,r,r*.42,noise(i,4)*Math.PI,0,Math.PI*2);ctx.fill();}
  // Fortress enclosure and defensive upper terrace.
  drawWall(ctx,0,0,width,45);drawWall(ctx,0,0,37,height);drawWall(ctx,width-37,0,37,height);
  ctx.fillStyle='#171b20';ctx.fillRect(width*.51,106,width*.28,7);ctx.fillStyle='#07090c';ctx.fillRect(width*.51,113,width*.28,14);
  drawFence(ctx,48,height*.39,128);drawFence(ctx,width-185,height*.52,137);drawFence(ctx,55,height*.70,100,true);drawFence(ctx,width-68,height*.68,125,true);
  // Ruins, graves and dead vegetation frame rather than occupy the central defense lane.
  for(let i=0;i<18;i++){const side=i%2,x=side?width-55-noise(i,2)*68:48+noise(i,2)*68,y=105+noise(i,4)*(.79*height);ctx.fillStyle='#23272a';ctx.fillRect(x-8,y-17,16,22);ctx.fillStyle='#303438';ctx.beginPath();ctx.arc(x,y-17,8,Math.PI,0);ctx.fill();ctx.fillStyle='#090b0c';ctx.fillRect(x-2,y-12,4,10);ctx.fillRect(x-6,y-8,12,3);}
  drawDeadTree(ctx,88,height*.24,.85);drawDeadTree(ctx,width-92,height*.34,1.05);drawDeadTree(ctx,94,height*.88,1.1);drawDeadTree(ctx,width-84,height*.84,.8);
  for(let i=0;i<36;i++){const side=i%2,x=side?width-52-noise(i,8)*85:44+noise(i,8)*85,y=70+noise(i,6)*(height-110),s=3+noise(i,1)*9;ctx.fillStyle=noise(i,4)>.5?'#2d3030':'#171a1a';ctx.save();ctx.translate(x,y);ctx.rotate(noise(i,3)*3);ctx.fillRect(-s,-s*.35,s*2,s*.7);ctx.restore();}
  // Restrained permanent-night grading and localized Cathedral moonlight.
  const moon=ctx.createRadialGradient(width*.65,height*.10,10,width*.65,height*.10,width*.42);moon.addColorStop(0,'rgba(113,145,172,.13)');moon.addColorStop(1,'rgba(23,31,38,0)');ctx.fillStyle=moon;ctx.fillRect(0,0,width,height*.62);
  const vignette=ctx.createRadialGradient(width/2,height*.52,height*.15,width/2,height*.52,width*.72);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.76,'rgba(0,0,0,.08)');vignette.addColorStop(1,'rgba(0,0,0,.48)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  return canvas;
}

export function preloadBattlefield(){ /* Runtime terrain has no external image dependency. */ }
export function renderBattlefieldFoundation(ctx,{map,width,height}){
  const key=`${map?.id||'default'}:${width}x${height}`;if(!foundationCache.has(key))foundationCache.set(key,buildFoundation(map,width,height));ctx.drawImage(foundationCache.get(key),0,0);
}

function roadTrace(ctx,centers){ctx.beginPath();ctx.moveTo(centers[0].x,centers[0].y);for(let i=1;i<centers.length-1;i++){const p=centers[i],n=centers[i+1];ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2)}ctx.lineTo(centers.at(-1).x,centers.at(-1).y);}
export function renderIntegratedRoad(ctx,path,{tileSize=64,mapId='default'}={}){
  if(!path?.length)return;const terrain=terrainFor(mapId),preset=battlefieldVisualPreset(mapId),centers=path.map(tile=>({x:(tile.x+.5)*tileSize,y:(tile.y+.5)*tileSize}));ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // Feathered compressed-earth shoulders, never an opaque black navigation line.
  roadTrace(ctx,centers);ctx.strokeStyle='rgba(10,12,13,.30)';ctx.lineWidth=tileSize*(preset.roadWidth+.28);ctx.stroke();
  roadTrace(ctx,centers);ctx.strokeStyle=terrain.road;ctx.globalAlpha=.66;ctx.lineWidth=tileSize*(preset.roadWidth+.08);ctx.stroke();
  roadTrace(ctx,centers);ctx.strokeStyle='rgba(83,78,72,.62)';ctx.globalAlpha=.72;ctx.lineWidth=tileSize*(preset.roadWidth-.05);ctx.stroke();
  // Individual damaged cobbles and wheel wear make the route physical.
  ctx.globalAlpha=.46;for(let i=0;i<centers.length;i++){const p=centers[i],count=3;for(let j=-1;j<=1;j++){const seed=noise(i,j+3,mapId.length),x=p.x+j*12+(seed-.5)*7,y=p.y+(noise(i,j+8)*2-1)*10,w=15+seed*7,h=7+noise(i,j+1)*4;ctx.save();ctx.translate(x,y);ctx.rotate((seed-.5)*.28);drawStone(ctx,-w/2,-h/2,w,h,seed>.5?'#4b4945':'#3c3c39',seed>.72);ctx.restore();}}
  // Break the vector-perfect shoulder with deterministic erosion, missing
  // paving and loose masonry along both sides of every active segment.
  for(let i=1;i<centers.length-1;i++){
    const p=centers[i],prev=centers[i-1],next=centers[i+1],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    for(const side of [-1,1]){const seed=noise(i,side+4,mapId.length+11),offset=tileSize*(preset.roadWidth*.52+.12)+(seed-.5)*9,x=p.x+nx*offset*side,y=p.y+ny*offset*side;ctx.globalAlpha=.48;ctx.fillStyle=seed>.46?'#252925':'#191c1b';ctx.beginPath();ctx.ellipse(x,y,7+seed*9,3+seed*5,(seed-.5)*1.4,0,Math.PI*2);ctx.fill();if(seed>.58){ctx.globalAlpha=.68;ctx.fillStyle='#57534b';ctx.save();ctx.translate(x+nx*side*3,y+ny*side*3);ctx.rotate(seed*2.4);ctx.fillRect(-6,-3,12,6);ctx.restore();}}
  }
  ctx.globalAlpha=.30;ctx.strokeStyle='#171719';ctx.lineWidth=2;roadTrace(ctx,centers);ctx.stroke();
  ctx.restore();
}

export function renderBattlefieldStructures(ctx,{routes=[],plans=[],tileSize=64,time=0}){
  ctx.save();
  // Every authored route terminates in a physical lower-ward breach. Inactive
  // routes remain barred; active routes show rubble and warm invasion light.
  for(let index=0;index<plans.length;index++){
    const plan=plans[index],active=routes[index],cell=(active?.at(-1)||plan?.at(-1));if(!cell)continue;const x=(cell.x+.5)*tileSize,y=(cell.y+.5)*tileSize,isOpen=!!active;
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#080a0d';ctx.fillRect(-31,-20,62,41);ctx.fillStyle='#292c2e';ctx.fillRect(-36,-24,12,48);ctx.fillRect(24,-24,12,48);ctx.fillRect(-36,-28,72,9);
    if(!isOpen){ctx.strokeStyle='#17191c';ctx.lineWidth=6;for(let bx=-20;bx<=20;bx+=10){ctx.beginPath();ctx.moveTo(bx,-18);ctx.lineTo(bx,20);ctx.stroke()}ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(25,0);ctx.stroke();}
    else{const glow=ctx.createRadialGradient(0,2,2,0,2,38);glow.addColorStop(0,`rgba(178,69,35,${.13+Math.sin(time*3+index)*.025})`);glow.addColorStop(1,'rgba(120,35,20,0)');ctx.fillStyle=glow;ctx.fillRect(-44,-38,88,76);for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#3b3936':'#242628';ctx.save();ctx.translate(-28+i*9,19+(i%3)*4);ctx.rotate((i-3)*.15);ctx.fillRect(-7,-4,14,8);ctx.restore();}}
    ctx.restore();
  }
  // Gothic lamps mark the final defensive zone and major courtyard line.
  for(const [x,y] of [[7.9,3.2],[12.6,3.2],[5.2,8.2],[14.8,8.2]]){const px=x*tileSize,py=y*tileSize;ctx.strokeStyle='#090b0d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(px,py+20);ctx.lineTo(px,py-27);ctx.stroke();ctx.fillStyle='#1f2326';ctx.fillRect(px-8,py-34,16,13);const light=ctx.createRadialGradient(px,py-28,1,px,py-28,38);light.addColorStop(0,`rgba(255,198,91,${.28+Math.sin(time*4+x)*.035})`);light.addColorStop(1,'rgba(255,154,65,0)');ctx.fillStyle=light;ctx.fillRect(px-40,py-68,80,80);ctx.fillStyle='#f0c16f';ctx.fillRect(px-3,py-31,6,7);}
  ctx.restore();
}

export function renderRoadNetworkDebug(ctx,{plans=[],routes=[],events=[],cathedral,tileSize=64}={}){ctx.save();ctx.font='10px monospace';ctx.textAlign='center';for(let routeIndex=0;routeIndex<plans.length;routeIndex++){const active=routes[routeIndex]?.length||0;for(let i=0;i<plans[routeIndex].length;i++){const cell=plans[routeIndex][i],x=(cell.x+.5)*tileSize,y=(cell.y+.5)*tileSize,on=i<active;ctx.fillStyle=on?'rgba(80,255,145,.40)':'rgba(255,100,150,.16)';ctx.beginPath();ctx.arc(x,y,on?5:3,0,Math.PI*2);ctx.fill()}}if(cathedral){ctx.strokeStyle='#ffe17a';ctx.beginPath();ctx.arc(cathedral.x*tileSize,cathedral.y*tileSize,12,0,Math.PI*2);ctx.stroke()}ctx.fillStyle='#ffd7e4';events.filter(event=>!event.applied).slice(0,8).forEach((event,index)=>ctx.fillText(`W${event.wave} ${event.type} R${event.routeIndex+1}`,95,26+index*13));ctx.restore()}
