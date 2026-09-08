"""Build the Battle 4.0 keep arena headlessly with Blender and export it as GLB.

Run from the repository root:

    python3 tools/blender/build_battlefield.py            # needs `pip install bpy`
    blender --background --python tools/blender/build_battlefield.py   # or desktop Blender

Everything is derived from the road table in ROADS, so changing a road is a
table edit and a re-export. See docs/BATTLE_4_DESIGN.md for the design.

Outputs:
    assets/battlefield3d/keep_arena.glb          the arena (terrain, keep, walls, gates, rubble, pads, instancing meshes)
    assets/battlefield3d/keep_arena.layout.json  roads, doors, pads, keep footprint, per-tile terrain heights
    assets/battlefield3d/keep_arena.preview.png  a Workbench render, for review only

Coordinate contract (shared with src/Battle3D/layout.js):
    sim tile (x, y)  ->  Blender (x + .5, -(y + .5), height)  ->  glTF (x + .5, height, y + .5)
    1 tile = 1 world unit. Tile y grows toward the south gate, glTF +Z.

The scene is authored in "sim" space (Blender y = tile y) because every rule
here is written in tile coordinates, then mirrored once in mirror_scene()
before export. Without the mirror the arena reads back to front when viewed
from the south: the sim grid (x right, y down) is left-handed seen from above,
Blender and glTF are right-handed.
"""
import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.join(ROOT, 'assets', 'battlefield3d')
os.makedirs(OUT_DIR, exist_ok=True)

COLS, ROWS = 16, 18
SUBDIV = 4                      # vertices per tile edge
KEEP_TILES = [(7, 8), (8, 8), (7, 9), (8, 9)]
KEEP_CENTER = (8.0, 9.0)        # world x, world "y" (tile space, +.5 applied)

# Winding authored roads: gate tile first, keep door tile last. Orthogonal steps only.
ROADS = {
    'south': {'opens': 'wave 1', 'tiles': [(8, 17), (8, 16), (9, 16), (9, 15), (10, 15), (10, 14), (9, 14), (9, 13), (8, 13), (8, 12), (7, 12), (7, 11), (8, 11), (8, 10)]},
    'west':  {'opens': 'first breach', 'tiles': [(0, 9), (1, 9), (1, 10), (2, 10), (2, 11), (3, 11), (3, 10), (4, 10), (4, 9), (5, 9), (5, 8), (6, 8), (6, 9)]},
    'north': {'opens': 'second breach', 'tiles': [(7, 0), (7, 1), (6, 1), (6, 2), (6, 3), (7, 3), (7, 4), (8, 4), (8, 5), (7, 5), (7, 6), (7, 7)]},
    'east':  {'opens': 'third breach', 'tiles': [(15, 8), (14, 8), (14, 7), (13, 7), (13, 6), (12, 6), (12, 7), (11, 7), (11, 8), (10, 8), (10, 9), (9, 9), (9, 8)]},
}
SEALED = ['west', 'north', 'east']

ROAD_HALF_WIDTH = 0.52
ROAD_SHOULDER = 0.55
KEEP_PLATEAU_RADIUS = 2.1
KEEP_PLATEAU_SHOULDER = 1.2
HILL_HEIGHT = 1.35


def validate_roads():
    all_tiles = {}
    for name, road in ROADS.items():
        tiles = road['tiles']
        for a, b in zip(tiles, tiles[1:]):
            if abs(a[0] - b[0]) + abs(a[1] - b[1]) != 1:
                raise SystemExit(f'road {name}: {a} -> {b} is not an orthogonal step')
        for t in tiles:
            if t in KEEP_TILES:
                raise SystemExit(f'road {name} crosses the keep at {t}')
            if not (0 <= t[0] < COLS and 0 <= t[1] < ROWS):
                raise SystemExit(f'road {name} leaves the grid at {t}')
            if t in all_tiles and all_tiles[t] != name:
                raise SystemExit(f'roads {all_tiles[t]} and {name} share tile {t}')
            all_tiles[t] = name
        door = tiles[-1]
        if not any(abs(door[0] - k[0]) + abs(door[1] - k[1]) == 1 for k in KEEP_TILES):
            raise SystemExit(f'road {name}: door {door} does not touch the keep')
    return all_tiles


ROAD_TILES = validate_roads()


def road_distance(x, y):
    """Distance in tiles from a world point to the nearest road tile centre line."""
    best = 1e9
    for (tx, ty) in ROAD_TILES:
        d = math.hypot(x - (tx + .5), y - (ty + .5))
        if d < best:
            best = d
    return best


def smoothstep(edge0, edge1, v):
    t = max(0.0, min(1.0, (v - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3 - 2 * t)


def hill_height(x, y):
    p = Vector((x * .19, y * .19, 0.7))
    h = noise.noise(p) * .6 + noise.noise(p * 2.3 + Vector((11, 5, 0))) * .28 + noise.noise(p * 5.1) * .1
    # A gentle bowl: the arena rises toward the perimeter so the keep sits in a valley floor.
    rim = math.hypot((x - KEEP_CENTER[0]) / (COLS * .5), (y - KEEP_CENTER[1]) / (ROWS * .5))
    return HILL_HEIGHT * (h * .5 + .5) * .8 + rim * rim * .45


def terrain_height(x, y):
    hill = hill_height(x, y)
    road_d = road_distance(x, y)
    keep_d = math.hypot(x - KEEP_CENTER[0], y - KEEP_CENTER[1])
    road_level = .30
    keep_level = .42
    # smoothstep(edge0, edge1, v) rises from 0 at edge0 to 1 at edge1, so the
    # masks are 1 - smoothstep(inner, outer, d): 1 on the road / plateau, 0 past the shoulder.
    flat = 1 - smoothstep(ROAD_HALF_WIDTH, ROAD_HALF_WIDTH + ROAD_SHOULDER, road_d)
    plateau = 1 - smoothstep(KEEP_PLATEAU_RADIUS, KEEP_PLATEAU_RADIUS + KEEP_PLATEAU_SHOULDER, keep_d)
    h = hill * (1 - flat) + road_level * flat
    h = h * (1 - plateau) + keep_level * plateau
    return h, flat, plateau


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    return scene


def material(name, rgba, roughness=.9, metallic=0.0, use_vertex_color=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if use_vertex_color:
        attr = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def build_terrain():
    bm = bmesh.new()
    nx, ny = COLS * SUBDIV, ROWS * SUBDIV
    verts = {}
    color_layer = bm.loops.layers.color.new('Col')
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, y = i / SUBDIV, j / SUBDIV
            h, flat, plateau = terrain_height(x, y)
            verts[(i, j)] = bm.verts.new((x, y, h))
    bm.verts.ensure_lookup_table()
    heights = {}
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((verts[(i, j)], verts[(i + 1, j)], verts[(i + 1, j + 1)], verts[(i, j + 1)]))
            for loop in f.loops:
                vx, vy, vz = loop.vert.co
                h, flat, plateau = terrain_height(vx, vy)
                # Slope from finite differences drives the rock mask.
                dx = terrain_height(vx + .12, vy)[0] - terrain_height(vx - .12, vy)[0]
                dy = terrain_height(vx, vy + .12)[0] - terrain_height(vx, vy - .12)[0]
                slope = min(1.0, math.hypot(dx, dy) * 2.2)
                rock = smoothstep(.35, .8, slope) * (1 - flat)
                grass = max(0.0, 1 - flat - rock - plateau * .85)
                loop[color_layer] = (flat, grass, rock, 1.0)
    mesh = bpy.data.meshes.new('terrain')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('terrain', mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material('terrain', (.22, .34, .16, 1), use_vertex_color=True))
    for poly in mesh.polygons:
        poly.use_smooth = True
    # Per-tile heights for the runtime, sampled at tile centres.
    for ty in range(ROWS):
        for tx in range(COLS):
            heights[f'{tx},{ty}'] = round(terrain_height(tx + .5, ty + .5)[0], 3)
    return obj, heights


def box(name, center, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    obj.data.materials.append(mat)
    return obj


def cylinder(name, center, radius, depth, mat, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def build_keep():
    stone = material('keep_stone', (.28, .27, .3, 1), roughness=.95)
    dark = material('keep_dark', (.08, .07, .1, 1))
    roof = material('keep_roof', (.16, .1, .12, 1), roughness=.7)
    cx, cy = KEEP_CENTER
    base = .42
    parts = []
    parts.append(box('keep_plinth', (cx, cy, base + .2), (2.7, 2.7, .4), stone))
    parts.append(box('keep_walls', (cx, cy, base + .4 + .95), (2.2, 2.2, 1.9), stone))
    parts.append(box('keep_roof', (cx, cy, base + 2.35 + .12), (2.4, 2.4, .24), roof))
    parts.append(box('keep_tower_core', (cx, cy, base + 2.35 + .8), (1.1, 1.1, 1.6), stone))
    parts.append(box('keep_tower_roof', (cx, cy, base + 3.95 + .16), (1.3, 1.3, .32), roof))
    for i, (dx, dy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
        parts.append(cylinder(f'keep_corner_{i}', (cx + dx * 1.1, cy + dy * 1.1, base + 1.25), .36, 2.5, stone))
        parts.append(cylinder(f'keep_corner_cap_{i}', (cx + dx * 1.1, cy + dy * 1.1, base + 2.6), .42, .2, roof))
    # Doors face each road's door tile.
    for name, road in ROADS.items():
        dx_, dy_ = road['tiles'][-1]
        door_dir = (math.copysign(1, (dx_ + .5) - cx) if abs((dx_ + .5) - cx) > abs((dy_ + .5) - cy) else 0,
                    math.copysign(1, (dy_ + .5) - cy) if abs((dy_ + .5) - cy) >= abs((dx_ + .5) - cx) else 0)
        parts.append(box(f'keep_door_{name}', (cx + door_dir[0] * 1.12, cy + door_dir[1] * 1.12, base + .4 + .45), (.5 if door_dir[0] else .16, .5 if door_dir[1] else .16, .9), dark))
    return parts


def build_perimeter():
    stone = material('wall_stone', (.24, .23, .26, 1), roughness=.95)
    rubble = material('rubble', (.3, .28, .27, 1), roughness=1)
    parts = []
    gates = {name: road['tiles'][0] for name, road in ROADS.items()}
    h = 1.1
    # Four wall runs with a 1.6-tile gap at each gate.
    def run(name, a, b, gap_at=None, axis='x'):
        length = (b - a)
        if gap_at is None:
            parts.append(box(name, ((a + b) / 2, WALL_Y, h / 2 + .2) if axis == 'x' else (WALL_X, (a + b) / 2, h / 2 + .2),
                             (length, .5, h) if axis == 'x' else (.5, length, h), stone))
            return
        g0, g1 = gap_at - .8, gap_at + .8
        for (s, e, suffix) in ((a, g0, 'a'), (g1, b, 'b')):
            if e - s > .1:
                parts.append(box(f'{name}_{suffix}', ((s + e) / 2, WALL_Y, h / 2 + .2) if axis == 'x' else (WALL_X, (s + e) / 2, h / 2 + .2),
                                 (e - s, .5, h) if axis == 'x' else (.5, e - s, h), stone))
        # gate pillars
        for px in (g0, g1):
            parts.append(box(f'{name}_pillar_{px:.1f}', (px, WALL_Y, h / 2 + .5) if axis == 'x' else (WALL_X, px, h / 2 + .5),
                             (.45, .7, h + .6) if axis == 'x' else (.7, .45, h + .6), stone))
    global WALL_X, WALL_Y
    WALL_Y = 0.2;            run('wall_north', 0, COLS, gap_at=gates['north'][0] + .5, axis='x')
    WALL_Y = ROWS - 0.2;     run('wall_south', 0, COLS, gap_at=gates['south'][0] + .5, axis='x')
    WALL_X = 0.2;            run('wall_west', 0, ROWS, gap_at=gates['west'][1] + .5, axis='y')
    WALL_X = COLS - 0.2;     run('wall_east', 0, ROWS, gap_at=gates['east'][1] + .5, axis='y')
    # Rubble seals the gates that have not been breached yet.
    for name in SEALED:
        gx, gy = gates[name]
        cx, cy = gx + .5, gy + .5
        for k in range(7):
            ang = k * 2.4
            r = .18 + (k % 3) * .14
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=r, location=(cx + math.cos(ang) * .38, cy + math.sin(ang) * .38, .3 + r * .6))
            o = bpy.context.active_object
            o.name = f'rubble_{name}_{k}'
            o.data.materials.append(rubble)
            parts.append(o)
    return parts


def build_pads(heights):
    pad_mat = material('pad', (.55, .5, .36, 1), roughness=.8)
    pads = []
    road = set(ROAD_TILES)
    keep = set(KEEP_TILES)
    seen = set()
    for (tx, ty) in road:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            x, y = tx + dx, ty + dy
            if not (0 <= x < COLS and 0 <= y < ROWS) or (x, y) in road or (x, y) in keep or (x, y) in seen:
                continue
            seen.add((x, y))
            z = heights[f'{x},{y}']
            pad = cylinder(f'pad_{x}_{y}', (x + .5, y + .5, z + .02), .38, .04, pad_mat, verts=20)
            pads.append((x, y, z))
    return pads


def build_instancing_meshes():
    grass_mat = material('grass_blade', (.32, .52, .2, 1), roughness=1)
    if hasattr(grass_mat, 'blend_method'):
        try:
            grass_mat.blend_method = 'BLEND'
        except Exception:
            pass  # Blender 4.2+/5 replaced blend_method; the runtime sets alpha itself
    bm = bmesh.new()
    # A single bent blade: two quads tapering to a tip, root at the origin.
    pts = [(-.035, 0, 0), (.035, 0, 0), (.028, 0, .18), (-.028, 0, .18), (.012, .02, .36), (-.012, .02, .36), (0, .05, .5)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[2], v[3]))
    bm.faces.new((v[3], v[2], v[4], v[5]))
    bm.faces.new((v[5], v[4], v[6]))
    mesh = bpy.data.meshes.new('grass_blade')
    bm.to_mesh(mesh); bm.free()
    grass = bpy.data.objects.new('grass_blade', mesh)
    grass.location = (-2, -2, 0)  # parked outside the arena; the runtime instances it
    bpy.context.collection.objects.link(grass)
    grass.data.materials.append(grass_mat)
    stone = cylinder('road_stone', (-2, -3, .08), .16, .16, material('road_stone', (.42, .4, .38, 1)), verts=7)
    return grass, stone


def mirror_scene():
    """Negate Blender y on everything so glTF +Z is sim +y (toward the south gate)."""
    for obj in list(bpy.data.objects):
        if obj.type != 'MESH':
            continue
        if obj.name == 'terrain':
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            for v in bm.verts:
                v.co.y = -v.co.y
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
            bm.to_mesh(obj.data)
            bm.free()
            obj.data.update()
        else:
            # Primitives are symmetric about their own centre; a location flip
            # plus a mirrored spin keeps rubble and pillars where the roads expect them.
            obj.location.y = -obj.location.y
            obj.rotation_euler.z = -obj.rotation_euler.z
            obj.rotation_euler.x = -obj.rotation_euler.x


def export(layout):
    glb = os.path.join(OUT_DIR, 'keep_arena.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_apply=True, export_yup=True)
    with open(os.path.join(OUT_DIR, 'keep_arena.layout.json'), 'w', encoding='utf-8') as f:
        json.dump(layout, f, indent=1)
    return glb


def preview():
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new('preview_cam')
    cam = bpy.data.objects.new('preview_cam', cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (KEEP_CENTER[0], KEEP_CENTER[1] + 15.5, 13.5)
    cam.rotation_euler = (math.radians(50), 0, math.radians(180))
    cam_data.lens = 34
    scene.camera = cam
    sun_data = bpy.data.lights.new('sun', 'SUN'); sun_data.energy = 3
    sun = bpy.data.objects.new('sun', sun_data); bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55), math.radians(-20), math.radians(30))
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    scene.render.filepath = os.path.join(OUT_DIR, 'keep_arena.preview.png')
    try:
        bpy.ops.render.render(write_still=True)
        return scene.render.filepath
    except Exception as error:  # a preview is a convenience, never a build failure
        print('preview render skipped:', error)
        return None
    finally:
        bpy.data.objects.remove(cam); bpy.data.objects.remove(sun)


def main():
    reset_scene()
    terrain, heights = build_terrain()
    build_keep()
    build_perimeter()
    pads = build_pads(heights)
    build_instancing_meshes()
    layout = {
        'version': 1,
        'grid': {'cols': COLS, 'rows': ROWS},
        'coordinates': 'sim tile (x,y) -> glTF (x+.5, height, y+.5); 1 tile = 1 unit',
        'keep': {'tiles': KEEP_TILES, 'center': list(KEEP_CENTER), 'plateauHeight': .42},
        'roads': {name: {'opens': road['opens'], 'tiles': road['tiles'], 'gate': road['tiles'][0], 'door': road['tiles'][-1], 'sealed': name in SEALED} for name, road in ROADS.items()},
        'pads': [{'x': x, 'y': y, 'height': z} for (x, y, z) in sorted(pads)],
        'heights': heights,
    }
    tri_count = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    mirror_scene()
    glb = export(layout)
    # Workbench rendering needs a GL context (libEGL). Without one Blender aborts
    # the whole process instead of raising, so the preview is opt-in and runs
    # after the export has already been written.
    preview_path = preview() if os.environ.get('BATTLEFIELD_PREVIEW') == '1' else None
    print(json.dumps({'glb': os.path.relpath(glb, ROOT), 'bytes': os.path.getsize(glb), 'triangles': tri_count,
                      'pads': len(pads), 'roads': {k: len(v['tiles']) for k, v in ROADS.items()}, 'preview': preview_path and os.path.relpath(preview_path, ROOT)}))


if __name__ == '__main__':
    main()
