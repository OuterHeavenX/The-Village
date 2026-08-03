const DAGGER_URL=new URL('../../assets/towers/gothic_dagger/gothic_dagger_atlas.png',import.meta.url).href;
let daggerImage;
function dagger(){if(!daggerImage){daggerImage=new Image();daggerImage.decoding='async';daggerImage.src=DAGGER_URL}return daggerImage}

export function drawLaneProjectileAsset(ctx,lane){
  if(lane.kind!=='gothicDagger')return false;const img=dagger(),q=1-Math.max(0,lane.life/lane.maxLife),d=Math.max(.2,lane.length*q),px=(lane.x+lane.dx*d)*64,py=(lane.y+lane.dy*d)*64,ang=Math.atan2(lane.dy,lane.dx);
  if(!img.complete||!img.naturalWidth)return true;ctx.save();ctx.translate(px,py);ctx.rotate(ang+q*8);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,575,615,270,135,-22,-11,44,22);ctx.restore();
  if(q>.72){const ex=(lane.x+lane.dx*lane.length)*64,ey=(lane.y+lane.dy*lane.length)*64;ctx.save();ctx.globalAlpha=(q-.72)/.28;ctx.drawImage(img,920,570,245,205,ex-25,ey-25,50,50);ctx.restore()}return true;
}

export function projectileVisual(kind) { return ({silverBolt:{shape:'bolt',length:24,width:2,glow:'#eef3ef'},heavyBolt:{shape:'bolt',length:38,width:5,glow:'#d2b78a'},arcaneOrb:{shape:'orb',radius:7,glow:'#b88cff'},holyLance:{shape:'lance',radius:7,glow:'#fff0a6'},gothicAxe:{shape:'axe',radius:10,glow:'#c4b8ae'}})[kind]||null; }
export function drawProjectileAsset(ctx,shot,time=0){const v=projectileVisual(shot.kind);if(!v)return false;if(v.shape==='bolt'){ctx.fillStyle=v.glow;ctx.fillRect(-v.length/2,-v.width/2,v.length,v.width);ctx.beginPath();ctx.moveTo(v.length/2,0);ctx.lineTo(v.length/2-7,-5);ctx.lineTo(v.length/2-7,5);ctx.fill()}else if(v.shape==='orb'){ctx.globalAlpha=.28;ctx.fillStyle=v.glow;ctx.beginPath();ctx.arc(0,0,v.radius*2.1,0,7);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(0,0,v.radius,0,7);ctx.fill();ctx.strokeStyle='#f0ddff';ctx.rotate(time*3);ctx.strokeRect(-9,-9,18,18)}else if(v.shape==='lance'){ctx.fillStyle=v.glow;ctx.globalAlpha=.25;ctx.beginPath();ctx.arc(0,0,16,0,7);ctx.fill();ctx.globalAlpha=1;ctx.fillRect(-14,-2,28,4);ctx.fillRect(5,-8,4,16)}else{ctx.strokeStyle=v.glow;ctx.fillStyle='#59483f';ctx.lineWidth=3;ctx.fillRect(-2,-11,4,22);ctx.beginPath();ctx.arc(4,-8,v.radius,-1.4,1.4);ctx.stroke()}return true}

export function impactPalette(kind){return ({silverBolt:{color:'#e7edf0',count:4},heavyBolt:{color:'#c59462',count:10},arcaneOrb:{color:'#ad72ff',count:8},holyLance:{color:'#fff1a8',count:9},gothicAxe:{color:'#c6b7a8',count:7},gothicDagger:{color:'#d9ecff',count:5}})[kind]||null}

