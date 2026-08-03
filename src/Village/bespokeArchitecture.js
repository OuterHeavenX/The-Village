import * as THREE from 'three';

const shadowed=mesh=>{mesh.castShadow=true;mesh.receiveShadow=true;return mesh};
const box=(w,h,d,material,x,y,z)=>{const mesh=shadowed(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material));mesh.position.set(x,y,z);return mesh};

function pointedRoof(width,height,depth,material,x,y,z){
  const roof=shadowed(new THREE.Mesh(new THREE.ConeGeometry(width,height,4),material));
  roof.scale.z=depth/width;roof.rotation.y=Math.PI/4;roof.position.set(x,y,z);return roof;
}

function pointedWindow(width,height,material,x,y,z){
  const shape=new THREE.Shape();
  shape.moveTo(-width/2,-height/2);shape.lineTo(width/2,-height/2);shape.lineTo(width/2,height*.12);
  shape.quadraticCurveTo(width/2,height*.35,0,height/2);shape.quadraticCurveTo(-width/2,height*.35,-width/2,height*.12);shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.position.set(x,y,z);mesh.renderOrder=5;return mesh;
}

function finial(material,x,y,z,scale=1){
  const group=new THREE.Group();
  const post=box(.12,1.25,.12,material,0,.55,0);group.add(post);
  const cross=box(.72,.12,.12,material,0,.85,0);group.add(cross);
  group.position.set(x,y,z);group.scale.setScalar(scale);return group;
}

export function createBespokeCathedral({scene,x=0,z=-32,textures}){
  const group=new THREE.Group();group.name='Village2_Bespoke_Cathedral';
  const masonry=new THREE.MeshStandardMaterial({map:textures.masonry,color:0xb9bec7,roughness:.92,metalness:.04});
  const carved=new THREE.MeshStandardMaterial({map:textures.tracery,color:0x8e949e,roughness:.86,metalness:.08});
  const roofMat=new THREE.MeshStandardMaterial({map:textures.copper,color:0x7d7166,roughness:.72,metalness:.35});
  const iron=new THREE.MeshStandardMaterial({map:textures.iron,color:0x6c7079,roughness:.52,metalness:.72});
  const glass=new THREE.MeshStandardMaterial({map:textures.glass,color:0xffffff,emissive:0xff7a35,emissiveMap:textures.glass,emissiveIntensity:1.55,roughness:.28});
  const warmGlass=glass.clone();warmGlass.emissiveIntensity=2.15;

  // Raised sacred precinct and layered nave.
  group.add(box(22,.8,18,masonry,0,.4,0),box(18,9,15,masonry,0,4.9,-.5),box(12,5,18,masonry,0,7.3,-1.4));
  group.add(pointedRoof(9,5,11,roofMat,0,12.2,-1.4));
  // Twin bell towers and asymmetric damaged upper masonry.
  for(const side of [-1,1]){
    group.add(box(5.2,15,5.5,masonry,side*6.8,7.9,1.2));
    group.add(box(6,.72,6.2,carved,side*6.8,15.05,1.2));
    group.add(pointedRoof(3.55,7,3.55,roofMat,side*6.8,18.7,1.2));
    group.add(finial(iron,side*6.8,21.4,1.2,.78));
    const belfry=pointedWindow(1.45,3.25,warmGlass,side*6.8,11.9,4.01);group.add(belfry);
    // Stepped buttresses give the façade real depth and silhouette.
    for(const bx of [side*4.65,side*9.15]){
      group.add(box(1.05,8.6,2.15,carved,bx,4.5,3.6));
      group.add(pointedRoof(.82,1.8,.82,roofMat,bx,9.55,3.6));
    }
  }
  // Open, vertically articulated facade. The former full-width rectangular
  // screen hid the nave and made the Cathedral read as one giant masonry box.
  group.add(box(12.5,3.5,.34,carved,0,2.15,7.18));
  for(const fx of [-5.55,5.55])group.add(box(1.25,9.4,.7,carved,fx,5.05,7.28));
  const gableShape=new THREE.Shape();gableShape.moveTo(-5.2,0);gableShape.lineTo(5.2,0);gableShape.lineTo(0,5.2);gableShape.closePath();
  const gable=new THREE.Mesh(new THREE.ShapeGeometry(gableShape),carved);gable.position.set(0,5.1,7.2);gable.renderOrder=3;group.add(gable);
  const rose=new THREE.Mesh(new THREE.CircleGeometry(1.8,32),glass);rose.position.set(0,8.0,7.43);rose.renderOrder=7;group.add(rose);
  for(const wx of [-3.55,3.55])group.add(pointedWindow(1.35,3.8,glass,wx,5.6,7.46));
  const surround=pointedWindow(5.1,7.2,carved,0,4.15,7.48);group.add(surround);
  const door=pointedWindow(3.85,6.05,iron,0,3.72,7.52);group.add(door);
  for(const dx of [-.9,.9])group.add(pointedWindow(.42,2.8,warmGlass,dx,3.9,7.56));
  // Door surround, stair procession, banners and gargoyle silhouettes.
  group.add(box(5.2,.55,1.3,carved,0,.85,7.65),box(7,.38,2.1,masonry,0,.55,8.15),box(9,.3,2.6,masonry,0,.28,8.65));
  const bannerMat=new THREE.MeshStandardMaterial({color:0x641d2c,roughness:.82,side:THREE.DoubleSide});
  for(const bx of [-4.9,4.9]){
    const banner=new THREE.Mesh(new THREE.PlaneGeometry(1.15,4.2),bannerMat);banner.position.set(bx,7.1,7.55);group.add(banner);
    const gargoyle=shadowed(new THREE.Mesh(new THREE.ConeGeometry(.45,1.4,5),iron));gargoyle.rotation.x=Math.PI/2;gargoyle.position.set(bx,11.25,7.7);group.add(gargoyle);
  }
  // Flying buttresses along both sides.
  for(const side of [-1,1])for(const dz of [-5,-.5,4]){
    const brace=box(.55,6.2,1,carved,side*10.1,3.2,dz);group.add(brace);
    const arch=box(3.2,.42,.55,carved,side*8.65,5.5,dz);arch.rotation.z=side*.52;group.add(arch);
  }
  // Local light suggests sanctuary life without washing the district.
  const sanctum=new THREE.PointLight(0xff873c,2.4,18,2);sanctum.position.set(0,7,7.8);group.add(sanctum);
  const moonRim=new THREE.PointLight(0x6e8fcb,1.25,22,2);moonRim.position.set(-6,15,-3);group.add(moonRim);
  group.scale.setScalar(.72);group.position.set(x,0,z);scene.add(group);return group;
}

export function createBespokeBridge({scene,x,z,textures}){
  const group=new THREE.Group();group.name='Village2_Gothic_Bridge';
  const stone=new THREE.MeshStandardMaterial({map:textures.masonry,color:0x818895,roughness:.94});
  const iron=new THREE.MeshStandardMaterial({map:textures.iron,color:0x626a74,roughness:.58,metalness:.65});
  const glow=new THREE.MeshStandardMaterial({color:0xffd08a,emissive:0xff7b24,emissiveIntensity:2.2});
  group.add(box(20,.7,5.8,stone,0,.4,0));
  for(const side of [-1,1]){
    group.add(box(20,.45,.38,stone,0,1,side*2.65));
    for(let bx=-8;bx<=8;bx+=4){
      group.add(box(.18,1.25,.18,iron,bx,1.55,side*2.65));
      const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(.25),glow);lamp.position.set(bx,2.35,side*2.65);group.add(lamp);
    }
  }
  for(const side of [-1,1])group.add(box(2.1,1.65,6.6,stone,side*9.4,.75,0));
  group.position.set(x,0,z);scene.add(group);return group;
}

export function createDistrictGateway({scene,x,z,rotation=0,textures,accent=0x7b2332}){
  const group=new THREE.Group();group.name='Village2_District_Gateway';
  const stone=new THREE.MeshStandardMaterial({map:textures.tracery,color:0x858b95,roughness:.88});
  const roof=new THREE.MeshStandardMaterial({map:textures.copper,color:0x75685f,roughness:.72,metalness:.28});
  const banner=new THREE.MeshStandardMaterial({color:accent,roughness:.86,side:THREE.DoubleSide});
  const glow=new THREE.MeshStandardMaterial({color:0xffd38f,emissive:0xff7a25,emissiveIntensity:2.4});
  for(const side of [-1,1]){
    group.add(box(1.05,5.2,1.2,stone,side*4,2.6,0));
    group.add(pointedRoof(.9,2,.9,roof,side*4,6.15,0));
    const lantern=new THREE.Mesh(new THREE.OctahedronGeometry(.24),glow);lantern.position.set(side*3.45,3.8,.7);group.add(lantern);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(.9,2.4),banner);flag.position.set(side*3.25,3.1,.64);group.add(flag);
  }
  const lintel=box(7.2,.55,.8,stone,0,4.55,0);group.add(lintel);
  const crest=new THREE.Mesh(new THREE.OctahedronGeometry(.62),stone);crest.position.set(0,5.2,.12);crest.scale.y=1.3;group.add(crest);
  group.position.set(x,0,z);group.rotation.y=rotation;scene.add(group);return group;
}
