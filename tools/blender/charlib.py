# ============================================================
# charlib — biblioteca para construir personagens do REPÚBLICA DO CAOS no Blender por script
# e exportar GLB para o jogo (public/models/<tipo>.glb → GLBCharacterVisual).
#
# Convenções (contrato com o jogo):
#   - Z é "cima" no Blender; o boneco olha para -Y (o exportador Y-up transforma em +Z, que é
#     a frente que Unit.setFacing espera). Pés no z = 0.
#   - Hierarquia: root (Empty) > body > head/armL/armR ; root > legL/legR. Animação por
#     transformações dos objetos (sem armature), igual ao rig procedural — o AnimationMixer
#     do Three anima nós por nome.
#   - Clipes exportados pela NLA com estes nomes: idle, walk, attack, hit, death, victory,
#     stun, special (GLBCharacterVisual cai no idle se um faltar). 24 fps.
#   - Materiais: Principled BSDF (o glTF só exporta cor de nós). Material chamado "TEAM…"
#     recebe a cor do time no jogo (camisa/boné/bandeira do militante).
#   - Altura: ~1.7 m para bodyType normal; o jogo multiplica por Config.units[tipo].scale.
# Uso: blender -b -P tools/blender/<personagem>.py -- public/models/<tipo>.glb
# ============================================================
import bpy, math

FPS = 24

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS

# ---------------- materiais ----------------
_mats = {}
def material(name, rgb, roughness=0.75, emissive=None):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    m.diffuse_color = (*rgb, 1.0)   # cor de viewport (Workbench/render de revisão)
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.2
    if emissive: bsdf.inputs['Emission Color'].default_value = (*emissive, 1.0); bsdf.inputs['Emission Strength'].default_value = 1.0
    _mats[name] = m
    return m

def hexrgb(h):
    return ((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255)

# ---------------- primitivas ----------------
def _finish(ob, name, mat, parent, loc, rot, scale, smooth=True, bevel=0.0):
    ob.name = name
    ob.location = loc; ob.rotation_euler = rot; ob.scale = scale
    if mat: ob.data.materials.append(mat)
    if parent: ob.parent = parent
    if smooth:
        for p in ob.data.polygons: p.use_smooth = True
    if bevel > 0:
        b = ob.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 3; b.limit_method = 'ANGLE'
    return ob

def sphere(name, mat, r=0.5, parent=None, loc=(0, 0, 0), scale=(1, 1, 1), seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=max(8, seg // 2), location=(0, 0, 0))
    return _finish(bpy.context.active_object, name, mat, parent, loc, (0, 0, 0), scale)

def box(name, mat, size=(1, 1, 1), parent=None, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    ob = _finish(bpy.context.active_object, name, mat, parent, loc, rot, size, smooth=False, bevel=bevel)
    return ob

def cylinder(name, mat, r=0.5, h=1, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), seg=12, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=seg, location=(0, 0, 0))
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, vertices=seg, location=(0, 0, 0))
    return _finish(bpy.context.active_object, name, mat, parent, loc, rot, (1, 1, 1))

def capsule(name, mat, r=0.2, length=0.5, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    """cilindro com esferas nas pontas, eixo Z (comprimento total = length + 2r)"""
    g = empty(name, parent, loc, rot)
    cylinder(name + '_c', mat, r, length, g)
    sphere(name + '_t', mat, r, g, (0, 0, length / 2))
    sphere(name + '_b', mat, r, g, (0, 0, -length / 2))
    return g

def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc; ob.rotation_euler = rot
    if parent: ob.parent = parent
    return ob

# ---------------- animação ----------------
def clip(name, keys):
    """keys: {objeto: [(frame, rotation_euler_xyz|None, location|None, scale|None)]} → uma Action por
    objeto empurrada para uma NLA track com o nome do clipe (o exportador vira um clipe glTF por nome)."""
    for ob, kl in keys.items():
        act = bpy.data.actions.new(f'{name}|{ob.name}')
        ob.animation_data_create()
        ob.animation_data.action = act
        for k in kl:
            f, rot, loc = k[0], k[1], k[2]
            sc = k[3] if len(k) > 3 else None
            if rot is not None: ob.rotation_euler = rot; ob.keyframe_insert('rotation_euler', frame=f)
            if loc is not None: ob.location = loc; ob.keyframe_insert('location', frame=f)
            if sc is not None: ob.scale = sc; ob.keyframe_insert('scale', frame=f)
        track = ob.animation_data.nla_tracks.new(); track.name = name
        strip = track.strips.new(name, 1, act); strip.name = name
        ob.animation_data.action = None

def rest(ob):
    """pose de descanso atual do objeto, para os clipes partirem dela"""
    return (tuple(ob.rotation_euler), tuple(ob.location), tuple(ob.scale))

def export(path):
    bpy.ops.object.select_all(action='SELECT')
    kw = dict(filepath=path, export_format='GLB', export_animations=True, export_apply=True, export_yup=True)
    try:
        bpy.ops.export_scene.gltf(**kw, export_animation_mode='NLA_TRACKS')
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    print('GLB exportado:', path)
