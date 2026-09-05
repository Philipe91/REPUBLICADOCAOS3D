# ============================================================
# orglib — formas ORGÂNICAS para os personagens v2 (a partir das folhas de referência em art_ref/).
# Em vez de primitivas emendadas, cada parte é um metaball próprio (bolas/elipsoides que se fundem),
# convertido em malha e suavizado. As partes são parentadas aos Empties de animação (body, head,
# armL/R, legL/R) preservando a posição no mundo, então os clipes do humanoid.clips continuam valendo.
# ============================================================
import bpy, math
from mathutils import Euler, Vector
import charlib as C

def _link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob

def parent_keep(ob, parent):
    """parenta mantendo a posição no mundo (o pivô de animação é a origem do parent)"""
    if not parent: return
    bpy.context.view_layer.update()
    ob.parent = parent
    ob.matrix_parent_inverse = parent.matrix_world.inverted()

def blob(name, mat, elements, parent=None, resolution=0.05, threshold=0.6, subdiv=1):
    """elements: [{co, r, size:(sx,sy,sz)|None, rot:(x,y,z)|None, neg:bool}] em coordenadas de MUNDO.
    Cria um metaball só dele (não se funde com outras partes), converte em malha e suaviza."""
    mb = bpy.data.metaballs.new('mb_' + name)
    mb.resolution = resolution
    mb.threshold = threshold
    # calibração (rigidez 2, limiar 0.6): raio visível da superfície ≈ K × radius; o size do elipsoide é RELATIVO
    K = 0.556
    for e in elements:
        el = mb.elements.new()
        el.co = e['co']
        if e.get('size'):
            a, b, c = e['size']                      # semi-eixos ABSOLUTOS desejados
            mx = max(a, b, c)
            el.type = 'ELLIPSOID'
            el.radius = mx / K
            el.size_x, el.size_y, el.size_z = a / mx, b / mx, c / mx
        else:
            el.radius = e['r'] / K                   # raio ABSOLUTO desejado
        if e.get('rot'):
            el.rotation = Euler(e['rot']).to_quaternion()
        if e.get('neg'):
            el.use_negative = True
        el.stiffness = e.get('stiff', 2.0)
    tmp = _link(bpy.data.objects.new('tmp_' + name, mb))
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    mesh.name = name
    ob = _link(bpy.data.objects.new(name, mesh))
    for p in mesh.polygons: p.use_smooth = True
    if mat: mesh.materials.append(mat)
    if subdiv > 0:
        m = ob.modifiers.new('subd', 'SUBSURF'); m.levels = subdiv; m.render_levels = subdiv
    parent_keep(ob, parent)
    return ob

def ball(co, r, **kw):
    d = {'co': co, 'r': r}; d.update(kw); return d

def ellipsoid(co, r, size, rot=None, **kw):
    """size = semi-eixos absolutos (x, y, z); r é ignorado (mantido por compatibilidade)"""
    d = {'co': co, 'r': r, 'size': size, 'rot': rot}; d.update(kw); return d

def box(name, mat, size, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.03):
    ob = C.box(name, mat, size, None, loc, rot, bevel=bevel)
    parent_keep(ob, parent)
    return ob

def sphere(name, mat, r, parent=None, loc=(0, 0, 0), scale=(1, 1, 1), seg=16):
    ob = C.sphere(name, mat, r, None, loc, scale, seg)
    parent_keep(ob, parent)
    return ob

def cylinder(name, mat, r, h, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), seg=14, r2=None):
    ob = C.cylinder(name, mat, r, h, None, loc, rot, seg, r2)
    parent_keep(ob, parent)
    return ob

def torus(name, mat, R, r, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), seg=24):
    """anel (colar, pulseira, aro do gorro); eixo Z"""
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=10, location=(0, 0, 0))
    ob = C._finish(bpy.context.active_object, name, mat, None, loc, rot, (1, 1, 1))
    parent_keep(ob, parent)
    return ob

def cluster(name, mat, center, count, radius_range, spread, parent=None, seed=1, size=None, resolution=0.05):
    """nuvem de bolas (cabelo cacheado, barba, dreads curtos): count bolas em torno de center"""
    import random
    rnd = random.Random(seed)
    els = []
    for i in range(count):
        a = rnd.uniform(0, math.pi * 2); b = rnd.uniform(-1, 1)
        co = (center[0] + math.cos(a) * spread[0] * math.sqrt(1 - b * b), center[1] + math.sin(a) * spread[1] * math.sqrt(1 - b * b), center[2] + b * spread[2])
        r = rnd.uniform(*radius_range)
        els.append(ball(co, r, size=size) if size else ball(co, r))
    return blob(name, mat, els, parent, resolution=resolution, threshold=0.5)
