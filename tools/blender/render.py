# Renderiza a folha de um personagem (vista 3/4 + frente + lado) para revisão.
# Uso: blender -b -P tools/blender/render.py -- <tipo> <pasta_saida> [engine]   (engine: WORKBENCH | EEVEE)
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import charlib as C
import humanoid as H
from specs import SPECS
import importlib
def build_any(kind):
    """v2_<tipo>.py (orgânico, a partir de art_ref/) se existir; senão o humanoid v1"""
    try:
        mod = importlib.import_module('v2_' + kind)
        return mod.build(SPECS.get(kind))
    except ModuleNotFoundError:
        return H.build(SPECS[kind])

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
kind, outdir = args[0], args[1]
engine = (args[2] if len(args) > 2 else 'WORKBENCH').upper()
os.makedirs(outdir, exist_ok=True)

C.reset()
P, dims = build_any(kind)
if SPECS[kind].get('jurassic'):
    for o in bpy.data.objects:
        if o.name.startswith('JUR_'): o.hide_render = True

scene = bpy.context.scene
scene.render.resolution_x, scene.render.resolution_y = 560, 720
scene.render.film_transparent = False
if engine == 'EEVEE':
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, 'SceneEEVEE') else 'BLENDER_EEVEE'
else:
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh = scene.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True
    sh.background_type = 'VIEWPORT'; sh.background_color = (0.86, 0.9, 0.95)
world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.86, 0.9, 0.95, 1)

# luzes (EEVEE) — no Workbench o estúdio já ilumina
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun)
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); scene.collection.objects.link(fill)
fill.data.energy = 1.2; fill.rotation_euler = (math.radians(60), 0, math.radians(140))

# chão suave
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
floor = bpy.context.active_object; floor.name = 'floor'
floor.data.materials.append(C.material('floor', (0.82, 0.84, 0.86)))

h = 2.3   # altura útil aproximada do boneco
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 50

from mathutils import Vector
def look(frm, at):
    cam.location = frm
    cam.rotation_euler = (Vector(at) - Vector(frm)).to_track_quat('-Z', 'Y').to_euler()

views = { 'tres_quartos': (-4.2, -6.2, 2.3), 'frente': (0, -7.4, 1.6), 'lado': (-7.4, 0, 1.6) }
for name, pos in views.items():
    look(pos, (0, 0, h * 0.5))
    scene.render.filepath = os.path.join(outdir, f'{kind}_{name}.png')
    bpy.ops.render.render(write_still=True)
print('renders em', outdir)
