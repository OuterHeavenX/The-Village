import * as THREE from 'three';

const shadow=mesh=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh};
const part=(geometry,material,x,y,z)=>{const mesh=shadow(new THREE.Mesh(geometry,material));mesh.position.set(x,y,z);return mesh};
const cube=(w,h,d,m,x=0,y=h/2,z=0)=>part(new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cylinder=(r,h,m,x=0,y=h/2,z=0,sides=12)=>part(new THREE.CylinderGeometry(r,r,h,sides),m,x,y,z);

function roof(w,d,h,m,x=0,y=0,z=0){
  const mesh=part(new THREE.ConeGeometry(Math.max(w,d)*.72,h,4),m,x,y,z);
  mesh.rotation.y=Math.PI/4;mesh.scale.set(w/Math.max(w,d),1,d/Math.max(w,d));return mesh;
}
function glowWindow(m,x,y,z,w=.7,h=1.1){
  const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h*.12);shape.quadraticCurveTo(0,h*.58,-w/2,h*.12);shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),m);mesh.position.set(x,y,z);mesh.renderOrder=4;return mesh;
}
function door(m,x=0,z=3.03,w=1.15,h=2.2){return cube(w,h,.16,m,x,h/2,z)}
function beamFrame(g,m,w,h,d){
  for(const x of [-w/2+.22,w/2-.22])g.add(cube(.28,h+.1,.24,m,x,h/2,d/2+.13));
  for(const y of [1.2,h-1])g.add(cube(w,.23,.24,m,0,y,d/2+.13));
  for(const s of [-1,1]){const b=cube(.2,Math.hypot(w/2,h/2),.18,m,s*w*.24,h*.52,d/2+.15);b.rotation.z=s*.58;g.add(b)}
}
function chimney(g,m,x,z,height=2.2){g.add(cube(.65,height,.65,m,x,height/2,z),cube(.85,.22,.85,m,x,height+.05,z))}
function lantern(g,m,x,y,z){
  g.add(cube(.08,1,.08,m.iron,x,y+.35,z));const lamp=part(new THREE.OctahedronGeometry(.2),m.glow,x,y,z);g.add(lamp);
  const light=new THREE.PointLight(0xff9a46,.55,7,2);light.position.set(x,y,z);g.add(light);
}
function barrel(g,m,x,z,s=1){const b=cylinder(.32*s,.7*s,m.wood,x,.35*s,z,12);b.rotation.z=Math.PI/2;g.add(b)}
function crate(g,m,x,z,s=1){const c=cube(.7*s,.7*s,.7*s,m.wood,x,.35*s,z);g.add(c);for(const r of [-.22,.22])g.add(cube(.08*s,.74*s,.74*s,m.iron,x+r*s,.37*s,z))}
function sign(g,m,textKind='diamond',x=2.8,z=3.25){
  g.add(cube(.12,2,.12,m.iron,x,1.3,z));const geom=textKind==='round'?new THREE.CircleGeometry(.52,16):new THREE.OctahedronGeometry(.5);const s=part(geom,m.accent,x,2.25,z);if(textKind==='round')s.rotation.y=0;g.add(s);
}
function stairs(g,m,z=3.4,w=2.6){for(let i=0;i<3;i++)g.add(cube(w+i*.45,.18,.55,m.stone,0,.09+i*.18,z+i*.4))}

function shell(g,m,{w=5.5,d=5.5,h=3.6,upper=false,roofHeight=2.4,accent=true}={}){
  g.add(cube(w,.45,d,m.foundation,0,.22,0));
  g.add(cube(w-.35,h,d-.35,m.plaster,0,.45+h/2,0));
  beamFrame(g,m.timber,w-.35,h,d-.35);
  if(upper){g.add(cube(w+.7,2.15,d+.35,m.plaster,0,h+1.45,0));beamFrame(g,m.timber,w+.7,2.15,d+.35)}
  const top=upper?h+2.55:h+.55;g.add(roof(w+1.25,d+1.25,roofHeight,m.roof,0,top+roofHeight/2,0));
  g.add(door(m.door,0,d/2+.12));stairs(g,m,d/2+.5,2.4);
  for(const x of [-1.7,1.7])g.add(glowWindow(m.glass,x,2.15,d/2+.2,.62,1.25));
  if(upper)for(const x of [-2,0,2])g.add(glowWindow(m.glass,x,h+1.55,d/2+.32,.55,1));
  if(accent){g.add(cube(w+.55,.18,.3,m.accent,0,h-.2,d/2+.22));lantern(g,m,-1.05,1.8,d/2+.48);lantern(g,m,1.05,1.8,d/2+.48)}
}

function house(id,m){
  const g=new THREE.Group();const level=Number(id.match(/\d+/)?.[0]||1);shell(g,m,{w:4.6+level*.38,d:4.8+level*.25,h:3.2+level*.22,upper:level>=2,roofHeight:2+level*.12});
  chimney(g,m.stone,-1.45,-.75,level>=3?3.2:2.4);
  if(level>=3){const balcony=cube(3,.22,1.1,m.wood,0,4.1,3.05);g.add(balcony);for(const x of [-1.35,-.45,.45,1.35])g.add(cube(.08,.65,.08,m.iron,x,4.45,3.48))}
  if(level>=4){sign(g,m,'diamond',3.2,3.1);for(const x of [-2.3,2.3])g.add(cylinder(.22,2.2,m.stone,x,1.1,-2.2,8))}
  return g;
}
function farm(m){
  const g=new THREE.Group();shell(g,m,{w:5.8,d:4.5,h:3.2,roofHeight:2.1});
  const awning=cube(3.2,.16,1.7,m.accent,1.1,2.45,3.05);awning.rotation.x=-.15;g.add(awning);
  for(let row=-1;row<=1;row++)for(let col=0;col<5;col++){const crop=cylinder(.08,.7,m.crop,-3.6+col*.65,.35,-1+row*.8,6);g.add(crop)}
  const cart=cube(2,.55,1.05,m.wood,-3.2,.45,2);g.add(cart);for(const z of [1.45,2.55]){const wheel=part(new THREE.TorusGeometry(.42,.1,8,16),m.iron,-4.1,.42,z);wheel.rotation.y=Math.PI/2;g.add(wheel)}
  barrel(g,m,2.3,2.7);return g;
}
function lumber(m){
  const g=new THREE.Group();shell(g,m,{w:5.4,d:4.7,h:3.3,roofHeight:2.25});
  const shed=cube(4.4,2.2,2.2,m.timber,-4,1.1,.7);g.add(shed);g.add(roof(4.9,2.8,1.4,m.roof,-4,2.9,.7));
  for(let i=0;i<6;i++){const log=cylinder(.28,2.6,m.wood,-4.8+(i%3)*.65,.32+Math.floor(i/3)*.55,2.2,12);log.rotation.z=Math.PI/2;g.add(log)}
  const saw=part(new THREE.CylinderGeometry(.72,.72,.08,20),m.iron,2.3,1.2,2.65);saw.rotation.x=Math.PI/2;g.add(saw);return g;
}
function quarry(m){
  const g=new THREE.Group();g.add(cube(6,.5,5.5,m.foundation));g.add(cube(4.8,3,4,m.stone,0,1.75,-.4));g.add(roof(5.8,5,2,m.roof,0,4.25,-.4));door(m.door,0,2.1);g.add(door(m.door,0,2.15));
  for(const [x,z,s] of [[-3.6,1.8,1],[3.4,2,.8],[-3.2,-1.4,.7]]){const rock=part(new THREE.DodecahedronGeometry(s),m.stone,x,s*.55,z);rock.scale.y=.65;g.add(rock)}
  const crane=cube(.28,4,.28,m.wood,3.1,2,-1.5);g.add(crane);const arm=cube(3.4,.22,.22,m.wood,1.6,3.85,-1.5);g.add(arm);const chain=cube(.05,2,.05,m.iron,.2,2.9,-1.5);g.add(chain);return g;
}
function warehouse(m){
  const g=new THREE.Group();shell(g,m,{w:7,d:5.6,h:4.1,upper:false,roofHeight:2.8});
  const dock=cube(6,.5,2,m.wood,0,.35,3.7);g.add(dock);g.add(cube(2.6,2.7,.18,m.door,0,1.7,2.95));
  for(const [x,z] of [[-2.5,3.7],[2.5,3.6],[3.25,3.8]])crate(g,m,x,z,.9);barrel(g,m,-3.1,3.7);sign(g,m,'diamond',3.8,3.25);return g;
}
function library(m){
  const g=new THREE.Group();g.add(cube(7,.6,6.2,m.foundation));g.add(cube(6.3,5.4,5.5,m.stone,0,3,-.2));
  for(const x of [-2.35,2.35]){g.add(cylinder(.34,5,m.carved,x,2.9,2.72,10));g.add(glowWindow(m.glass,x,3.2,2.62,.75,2.2))}
  g.add(roof(7.4,6.7,3.2,m.roof,0,7,-.2));g.add(glowWindow(m.glass,0,4.2,2.64,1.1,2.7));g.add(door(m.door,0,2.65,1.4,2.5));stairs(g,m,3.1,3.3);sign(g,m,'round',3.7,3.1);return g;
}
function arcane(id,m){
  const g=new THREE.Group();g.add(cylinder(3.25,5.5,m.stone,0,2.9,0,12));g.add(roof(7.2,7.2,4.1,m.roof,0,8.1,0));g.add(door(m.door,0,3.05,1.1,2.4));
  for(let i=0;i<6;i++){const a=i*Math.PI/3;g.add(glowWindow(m.glass,Math.sin(a)*3.18,3.5,Math.cos(a)*3.18,.55,1.35))}
  const crystal=part(new THREE.OctahedronGeometry(.72),id==='alchemist'?m.alchemy:m.arcane,0,9.8,0);g.add(crystal);
  if(id==='alchemist'){for(const [x,z] of [[-2.7,2.8],[2.7,2.8]]){const vial=part(new THREE.SphereGeometry(.35,12,8),m.alchemy,x,1.15,z);g.add(vial)}}
  else{for(const x of [-2,0,2]){const rune=part(new THREE.TorusGeometry(.42,.08,8,20),m.arcane,x,2.3,3.12);g.add(rune)}}
  lantern(g,m,-1.1,1.8,3.45);lantern(g,m,1.1,1.8,3.45);return g;
}
function blacksmith(m){
  const g=new THREE.Group();shell(g,m,{w:6.2,d:5,h:3.4,roofHeight:2.3});chimney(g,m.stone,-1.9,-.9,4.3);
  const forge=cube(2.2,1.4,1.7,m.stone,2.4,.7,2.9);g.add(forge);const fire=part(new THREE.ConeGeometry(.45,1,10),m.glow,2.4,1.8,2.9);g.add(fire);
  const anvil=cube(1.1,.35,.55,m.iron,-2.5,1.1,3);g.add(anvil);g.add(cylinder(.22,1,m.iron,-2.5,.5,3,8));sign(g,m,'diamond',3.4,2.9);return g;
}
function tavern(m){
  const g=new THREE.Group();shell(g,m,{w:7,d:5.7,h:3.8,upper:true,roofHeight:2.6});chimney(g,m.stone,-2,-1,3.4);
  const awning=cube(4,.16,1.6,m.accent,0,3.05,3.85);awning.rotation.x=-.18;g.add(awning);
  sign(g,m,'round',4.05,3.25);for(const x of [-2.3,2.3])barrel(g,m,x,3.6);return g;
}
function keep(m){
  const g=new THREE.Group();g.add(cube(7.5,.75,6.8,m.foundation));g.add(cube(6.8,6.5,6,m.stone,0,3.65,0));
  for(const x of [-3.2,3.2]){g.add(cylinder(1.25,8,m.carved,x,4.3,.2,10));g.add(roof(3.2,3.2,3.3,m.roof,x,9.85,.2))}
  g.add(cube(7.2,.4,.45,m.carved,0,6.6,3.15));for(const x of [-2.5,-1.25,0,1.25,2.5])g.add(cube(.55,.9,.55,m.carved,x,7.15,3.1));
  g.add(door(m.door,0,3.05,1.5,2.8));stairs(g,m,3.6,3.6);for(const x of [-2.1,2.1])g.add(glowWindow(m.glass,x,4.2,3.12,.65,1.5));return g;
}

function chapel(m){
  const g=new THREE.Group();g.add(cube(6,.55,7,m.foundation));g.add(cube(5.3,5.3,6.2,m.stone,0,2.9,0));
  g.add(roof(6.3,7.2,3.5,m.roof,0,7.2,0));g.add(door(m.door,0,3.22,1.25,2.7));stairs(g,m,3.75,3);
  g.add(glowWindow(m.glass,0,4.1,3.14,1.2,2.5));for(const x of [-2.15,2.15])g.add(cylinder(.38,5.2,m.carved,x,2.9,3.05,10));
  g.add(cylinder(.72,1,m.iron,0,8.55,0,12));g.add(cube(.16,2,.16,m.iron,0,10,0),cube(1.1,.16,.16,m.iron,0,10.35,0));return g;
}

function materialSet(textures={}){
  const mk=(opts)=>new THREE.MeshStandardMaterial(opts);
  return {
    foundation:mk({map:textures.masonry,color:0x4e5661,roughness:.96}),stone:mk({map:textures.masonry,color:0x747c88,roughness:.92}),carved:mk({map:textures.tracery,color:0x6a7280,roughness:.84}),
    plaster:mk({color:0x786f68,roughness:.98}),timber:mk({color:0x2a1714,roughness:.9}),wood:mk({color:0x41251a,roughness:.88}),roof:mk({map:textures.copper,color:0x343b4b,roughness:.72,metalness:.18}),
    iron:mk({map:textures.iron,color:0x4b535e,roughness:.5,metalness:.72}),door:mk({color:0x1d1112,roughness:.8}),accent:mk({color:0x6f2030,roughness:.76}),crop:mk({color:0x61743a,roughness:.9}),
    glass:mk({map:textures.glass,color:0xffbe78,emissive:0xff6a19,emissiveMap:textures.glass,emissiveIntensity:1.7,roughness:.22}),glow:mk({color:0xffc16e,emissive:0xff711b,emissiveIntensity:2.4}),
    arcane:mk({color:0x775dba,emissive:0x4d2f9e,emissiveIntensity:2}),alchemy:mk({color:0x49b78a,emissive:0x187a54,emissiveIntensity:2})
  };
}

export const AUTHORED_BUILDING_IDS=new Set(['house_lv1','house_lv2','house_lv3','house_lv4','house_lv5','farm','lumber_camp','quarry','warehouse','library','alchemist','enchanter','blacksmith','tavern','keep','cathedral']);

export function createAuthoredBuilding(id,{textures}={}){
  const m=materialSet(textures);let g;
  if(id.startsWith('house_'))g=house(id,m);else if(id==='farm')g=farm(m);else if(id==='lumber_camp')g=lumber(m);else if(id==='quarry')g=quarry(m);else if(id==='warehouse')g=warehouse(m);else if(id==='library')g=library(m);else if(id==='alchemist'||id==='enchanter')g=arcane(id,m);else if(id==='blacksmith')g=blacksmith(m);else if(id==='tavern')g=tavern(m);else if(id==='keep')g=keep(m);else if(id==='cathedral')g=chapel(m);else return null;
  g.name=`Village2_Authored_${id}`;g.userData.authoredRuntime=true;return g;
}
