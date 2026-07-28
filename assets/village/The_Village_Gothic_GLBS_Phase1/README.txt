THE VILLAGE — GOTHIC GLB ASSET PACK · PHASE 1

Included:
- House Lv1
- House Lv2
- Farm
- Lumber Camp
- Quarry
- Warehouse
- Library
- Alchemist
- Enchanter
- Blacksmith
- Tavern
- Keep
- Cathedral

Technical conventions:
- GLB 2.0
- Y-up
- Front faces +Z
- Ground sits at Y=0
- PBR materials embedded
- Warm windows use emissive materials
- Separate named meshes
- Designed as stylized Gothic mobile/browser assets
- No external texture files required

Three.js:
  const loader = new GLTFLoader();
  loader.load('assets/village/3d/house_lv1.glb', (gltf) => {
    const building = gltf.scene;
    building.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(building);
  });

Important:
This is a cohesive procedural production prototype pack. It is usable immediately,
but these are not hand-sculpted marketplace models. Test House Lv1 and Cathedral
in-game first, then refine scale, materials, and silhouettes before replacing every
existing building at once.
