# ============================================================
# humanoid — construtor genérico de personagem (espelha a CharacterFactory do jogo) + clipes padrão.
# build(spec) monta a hierarquia; clips(parts, spec) grava os 8 clipes; specs.py tem um spec por tipo.
# Nós com prefixo "JUR_" ficam ocultos e só aparecem no MODO JURÁSSICO (GLBCharacterVisual.transform);
# materiais "SKIN…" ficam verdes na transformação; "TEAM…" recebem a cor do time.
# ============================================================
import math
import charlib as C

BODY_W = {'small': 0.85, 'normal': 1.0, 'belly': 1.25, 'big': 1.35}
BODY_H = {'small': 0.9, 'normal': 1.0, 'belly': 1.0, 'big': 1.15}

def build(spec):
    s = dict(spec)
    hx = C.hexrgb
    skin = C.material('SKIN_' + s.get('id', 'x'), hx(s.get('skin', 0xf1c27d)))
    shirt = C.material(('TEAM_shirt' if s.get('teamShirt') else 'shirt_' + s.get('id', 'x')), hx(s.get('shirt', 0x4a6fa5)))
    pants = C.material('pants_' + s.get('id', 'x'), hx(s.get('pants', 0x2f3542)))
    shoes = C.material('shoes_' + s.get('id', 'x'), hx(s.get('shoes', 0x1e1e1e)))
    hair = C.material('hair_' + s.get('id', 'x'), hx(s.get('hairColor', 0x2b1d14)))
    white = C.material('white', (1, 1, 1)); black = C.material('black', (0.06, 0.06, 0.06), 0.4)
    mouthM = C.material('mouth', hx(0x5a1e1e))
    bw, bh = BODY_W[s.get('bodyType', 'normal')], BODY_H[s.get('bodyType', 'normal')]
    legH, bodyR, bodyLen = 0.55 * bh, 0.30 * bw, 0.42 * bh
    hs = 0.36 * s.get('headScale', 1.0) * 1.25          # raio da cabeça (charge: cabeça grande)
    P = {}
    root = C.empty('root'); P['root'] = root
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.16 * bw, 0, legH)); P['leg' + side] = g
        C.capsule('legm' + side, pants, 0.11 * bw, legH - 0.28, g, (0, 0, -legH / 2 + 0.04))
        C.box('foot' + side, shoes, (0.27 * bw, 0.42, 0.16), g, (0, -0.07, -legH + 0.08), bevel=0.05)
    body = C.empty('body', root, (0, 0, legH)); P['body'] = body
    C.capsule('torso', shirt, bodyR, bodyLen, body, (0, 0, bodyLen / 2 + bodyR * 0.9))
    if s.get('bodyType') == 'belly':
        C.sphere('belly', shirt, bodyR * 0.95, body, (0, -bodyR * 0.35, bodyLen * 0.5 + bodyR * 0.6), seg=16)
    if s.get('tie'):
        tie = C.material('tie_' + s['id'], hx(s['tie']))
        C.box('tie', tie, (0.1, 0.05, 0.42), body, (0, -bodyR - 0.02, bodyLen + bodyR * 0.55), bevel=0.01)
        C.box('knot', tie, (0.14, 0.06, 0.1), body, (0, -bodyR - 0.02, bodyLen + bodyR * 0.55 + 0.24), bevel=0.01)
    if s.get('suit'):
        lap = C.material('lapel', hx(0xf4f4f4))
        for sx in (-1, 1):
            C.box('lapel' + ('L' if sx < 0 else 'R'), lap, (0.1, 0.04, 0.5), body, (sx * 0.1, -bodyR - 0.01, bodyLen + bodyR * 0.5), rot=(0, sx * 0.25, 0), bevel=0)
    if s.get('cape'):
        cape = C.material('cape_' + s['id'], hx(s['cape']))
        C.box('cape', cape, (bodyR * 2.6, 0.06, bodyLen + bodyR * 2.2), body, (0, bodyR + 0.08, (bodyLen + bodyR * 2) * 0.45), bevel=0.02)
    armLen = 0.45 * bh
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('arm' + side, body, (sx * (bodyR + 0.07), 0, bodyLen + bodyR * 1.35)); P['arm' + side] = g
        C.capsule('armm' + side, shirt, 0.085 * bw, armLen - 0.18, g, (0, 0, -armLen / 2))
        hand = C.sphere('hand' + side, skin, 0.15, g, (0, 0, -armLen - 0.03)); P['hand' + side] = hand
    if s.get('teamBand', True) and not s.get('teamShirt'):
        C.cylinder('teamBand', C.material('TEAM_band', hx(0x2bb3c0)), 0.115 * bw, 0.14, P['armL'], (0, 0, -armLen * 0.36), seg=10)
    head = C.empty('head', body, (0, 0, bodyLen + bodyR * 2 - 0.02)); P['head'] = head
    C.sphere('skull', skin, hs, head, (0, 0, hs * 0.95), seg=24)
    ey, ez = hs * 1.05, -hs * 0.82
    if not s.get('sunglasses'):
        for sx in (-1, 1):
            n = 'L' if sx < 0 else 'R'
            C.sphere('eye' + n, white, 0.085 * hs / 0.45, head, (sx * hs * 0.38, ez, ey), seg=12)
            C.sphere('pupil' + n, black, 0.04 * hs / 0.45, head, (sx * hs * 0.38, ez - 0.07 * hs / 0.45, ey), seg=8)
            if s.get('eyeStyle') == 'angry':
                C.box('brow' + n, hair, (0.16, 0.04, 0.045), head, (sx * hs * 0.38, ez - 0.02, ey + 0.13 * hs / 0.45), rot=(0, sx * 0.5, 0), bevel=0)
            elif s.get('eyeStyle') == 'sleepy':
                C.box('lid' + n, skin, (0.19 * hs / 0.45, 0.06, 0.07 * hs / 0.45), head, (sx * hs * 0.38, ez - 0.03, ey + 0.05 * hs / 0.45), bevel=0)
    else:
        C.box('sunglasses', black, (hs * 1.3, 0.08, hs * 0.35), head, (0, ez, ey), bevel=0.01)
    if s.get('glasses'):
        fr = C.material('frame', hx(0x222222))
        for sx in (-1, 1):
            C.cylinder('frame' + ('L' if sx < 0 else 'R'), fr, 0.13 * hs / 0.45, 0.02, head, (sx * hs * 0.38, ez - 0.1, ey), rot=(math.pi / 2, 0, 0), seg=14)
    C.sphere('nose', skin, 0.07 * hs / 0.45 * (1.4 if s.get('bodyType') == 'belly' else 1), head, (0, -hs * 0.98, ey - hs * 0.22), seg=10)
    m = s.get('mouth', 'smile')
    if m == 'shout': C.sphere('mouth', mouthM, 0.09 * hs / 0.45, head, (0, -hs * 0.86, ey - hs * 0.55), scale=(1, 0.6, 1.2), seg=12)
    elif m == 'flat': C.box('mouth', mouthM, (0.18 * hs / 0.45, 0.04, 0.035 * hs / 0.45), head, (0, -hs * 0.86, ey - hs * 0.55), bevel=0)
    else: C.box('mouth', mouthM, (0.2 * hs / 0.45, 0.04, 0.04 * hs / 0.45), head, (0, -hs * 0.86, ey - hs * 0.55), rot=(0, 0, 0), bevel=0.01)
    if s.get('beard'):
        C.sphere('beard', hair, 1, head, (0, -hs * 0.35, ey - hs * 0.6), scale=(hs * 0.95, hs * 0.85, hs * 0.75), seg=14)
    top = hs * 0.95
    h = s.get('hair', 'short')
    if h == 'short': C.sphere('hairTop', hair, 1, head, (0, hs * 0.1, top + hs * 0.35), scale=(hs * 1.02, hs * 1.02, hs * 0.7), seg=16)
    elif h == 'side':
        C.sphere('hairTop', hair, 1, head, (hs * 0.1, hs * 0.05, top + hs * 0.45), scale=(hs * 1.03, hs * 1.0, hs * 0.55), seg=16)
        C.box('tuft', hair, (hs * 0.5, hs * 0.5, hs * 0.2), head, (-hs * 0.4, -hs * 0.3, top + hs * 0.75), rot=(0, 0.4, 0), bevel=0.02)
    elif h == 'bald': C.sphere('shine', white, 0.06, head, (-hs * 0.35, -hs * 0.45, top + hs * 0.7), seg=8)
    if h == 'cap' or s.get('accessory') == 'cap':
        capM = C.material('TEAM_cap', hx(0x2bb3c0))
        C.sphere('cap', capM, 1, head, (0, 0, top + hs * 0.45), scale=(hs * 1.05, hs * 1.05, hs * 0.6), seg=18)
        C.box('bill', capM, (hs * 1.1, hs * 0.6, 0.05), head, (0, -hs * 0.9, top + hs * 0.45), bevel=0.01)
    weapon(P, s)
    accessory(P, s, hs, top)
    if s.get('jurassic'): jurassic_parts(P, s, hs, bodyR)
    return P, dict(legH=legH, bodyR=bodyR, bodyLen=bodyLen, hs=hs, armLen=armLen)

def weapon(P, s):
    w = s.get('weapon'); hand = P['handR']
    if not w: return
    hx = C.hexrgb
    g = C.empty('weapon', hand); P['weapon'] = g
    if w == 'mic':
        C.cylinder('micStick', C.material('dark', hx(0x333333)), 0.04, 0.45, g, (0, -0.05, 0.2), rot=(0.4, 0, 0), seg=8)
        C.sphere('micBall', C.material('grey', hx(0x777777)), 0.13, g, (0, -0.15, 0.45), seg=12)
    elif w == 'pen':
        pg = C.empty('penG', g, (0.1, -0.2, 0.1), rot=(0.9, 0, 0))
        C.cylinder('penBody', C.material('ink', hx(0x1b1b3a)), 0.09, 1.9, pg, (0, 0, 0.6), seg=10)
        C.cylinder('penTip', C.material('gold', hx(0xffd700)), 0.09, 0.3, pg, (0, 0, -0.5), rot=(math.pi, 0, 0), seg=10, r2=0.0)
        C.box('penClip', C.material('gold', hx(0xffd700)), (0.04, 0.04, 0.5), pg, (0.1, 0, 1.0), bevel=0)
    elif w == 'phone':
        C.box('phone', C.material('dark', hx(0x222222)), (0.22, 0.05, 0.4), g, (0, -0.12, 0.1), rot=(-0.4, 0, 0), bevel=0.01)
        C.box('screen', C.material('screen', hx(0x5ce27a)), (0.18, 0.02, 0.32), g, (0, -0.15, 0.1), rot=(-0.4, 0, 0), bevel=0)
    elif w == 'sign':
        C.cylinder('stick', C.material('wood', hx(0x9b7653)), 0.03, 0.9, g, (0, 0, 0.35), seg=8)
        C.box('board', C.material('board', hx(0xfff5c2)), (0.62, 0.05, 0.42), g, (0, 0, 0.92), bevel=0.02)
        C.box('boardInk', C.material('inkText', hx(0x2a2a2a)), (0.44, 0.02, 0.06), g, (0, -0.035, 0.98), bevel=0)
    elif w == 'flag':
        C.cylinder('stick', C.material('wood', hx(0x9b7653)), 0.03, 1.2, g, (0, 0, 0.5), seg=8)
        C.box('flag', C.material('TEAM_flag', hx(0x2bb3c0)), (0.7, 0.03, 0.45), g, (0.35, 0, 0.9), bevel=0.01)
    elif w == 'papers':
        for i in range(3): C.box(f'paper{i}', C.material('paper', hx(0xfdfdf5)), (0.3, 0.01, 0.4), g, (0, -0.1 - i * 0.02, 0.15), rot=(0, (i - 1) * 0.2, 0), bevel=0)
    elif w == 'megaphone':
        C.cylinder('mega', C.material('red', hx(0xd94a4a)), 0.22, 0.45, g, (0, -0.3, 0.2), rot=(math.pi / 2 + 0.3, 0, 0), seg=10, r2=0.06)
    elif w == 'laco':
        C.cylinder('rope', C.material('rope', hx(0xc9a15a)), 0.22, 0.05, g, (0.05, -0.05, -0.05), rot=(0.6, 0, 0), seg=14)
    elif w == 'guitar':
        C.box('gBody', C.material('guitar', hx(0xa0522d)), (0.45, 0.12, 0.55), g, (0, -0.2, -0.05), bevel=0.04)
        C.box('gNeck', C.material('neck', hx(0x5a3a1e)), (0.08, 0.06, 0.7), g, (0.2, -0.2, 0.5), rot=(0, -0.4, 0), bevel=0)
    elif w == 'tire':
        C.cylinder('tire', C.material('tireM', hx(0x1e1e1e)), 0.3, 0.2, g, (0.1, -0.15, 0.05), rot=(0, math.pi / 2, 0), seg=16)
    elif w == 'book':
        C.box('book', C.material('bookCover', hx(s.get('bookColor', 0x3b2a6b))), (0.34, 0.1, 0.44), g, (0, -0.12, 0.1), bevel=0.01)

def accessory(P, s, hs, top):
    a = s.get('accessory'); hx = C.hexrgb
    if a == 'briefcase': C.box('briefcase', C.material('leather', hx(0x6b3e1e)), (0.45, 0.14, 0.35), P['handL'], (0, 0, -0.25), bevel=0.02)
    elif a == 'ringlight':
        C.cylinder('ring', C.material('ringM', hx(0xfff6d5)), hs * 1.6, 0.06, P['head'], (0, hs * 1.6, top + hs * 0.3), rot=(math.pi / 2, 0, 0), seg=24)
    elif a == 'hat':
        hm = C.material('hat', hx(s.get('hatColor', 0x8b5a2b)))
        C.cylinder('crown', hm, hs * 0.72, hs * 0.75, P['head'], (0, 0, top + hs * 0.7), seg=14, r2=hs * 0.62)
        C.cylinder('brim', hm, hs * 1.35, 0.05, P['head'], (0, 0, top + hs * 0.38), rot=(0.12, 0, 0), seg=18)
    elif a == 'headband':
        C.cylinder('headband', C.material('band', hx(s.get('bandColor', 0xf5b400))), hs * 1.0, hs * 0.22, P['head'], (0, 0, top + hs * 0.35), rot=(0.15, 0, 0), seg=18)
    elif a == 'whistle':
        C.box('whistle', C.material('whistleM', hx(0xd0d0d0)), (0.12, 0.14, 0.08), P['head'], (0, -hs * 0.75, -hs * 0.2), bevel=0.01)

def jurassic_parts(P, s, hs, bodyR):
    """peças do MODO JURÁSSICO, ocultas (prefixo JUR_): cauda, crista, dentes; o jogo mostra no transform"""
    hx = C.hexrgb
    green = C.material('SKIN_jur_green', hx(0x3f8f3a)); light = C.material('jur_light', hx(0x9fd67a)); white = C.material('white', (1, 1, 1))
    tail = C.empty('JUR_tail', P['body'], (0, 0.3, 0.5)); P['tail'] = tail
    for i in range(4):
        C.sphere(f'JUR_tailSeg{i}', green, 0.28 - i * 0.05, tail, (0, 0.35 + i * 0.32, -i * 0.1), seg=10)
    for i in range(3):
        C.cylinder(f'JUR_spike{i}', light, 0.1, 0.3, P['head'], (0, 0.15 - i * 0.16 + 0.1, hs * 1.9), rot=(-0.3, 0, 0), seg=6, r2=0.0)
    for sx in (-1, 1):
        C.cylinder('JUR_tooth' + ('L' if sx < 0 else 'R'), white, 0.04, 0.12, P['head'], (sx * 0.08, -hs * 0.95, hs * 0.45), rot=(math.pi, 0, 0), seg=4, r2=0.0)

# ---------------- clipes padrão ----------------
def clips(P, spec, dims):
    root, body, head, armL, armR, legL, legR = (P[k] for k in ('root', 'body', 'head', 'armL', 'armR', 'legL', 'legR'))
    R = {o: C.rest(o) for o in (root, body, head, armL, armR, legL, legR)}
    def k(o, f, rot=None, loc=None, sc=None):
        r0, l0, s0 = R[o]
        return (f, tuple(a + b for a, b in zip(r0, rot)) if rot else r0, tuple(a + b for a, b in zip(l0, loc)) if loc else l0, sc)
    heavy = spec.get('heavy', False)          # personagem pesado: passos mais lentos e baixos
    A = 0.5 if heavy else 0.7
    C.clip('idle', {
        body: [k(body, 1), k(body, 24, loc=(0, 0, 0.03)), k(body, 48)],
        head: [k(head, 1), k(head, 12, rot=(0, 0.05, 0)), k(head, 36, rot=(0, -0.05, 0)), k(head, 48)],
        armL: [k(armL, 1, rot=(0, -0.12, 0)), k(armL, 24, rot=(0.06, -0.16, 0)), k(armL, 48, rot=(0, -0.12, 0))],
        armR: [k(armR, 1, rot=(0, 0.12, 0)), k(armR, 24, rot=(0.06, 0.16, 0)), k(armR, 48, rot=(0, 0.12, 0))],
    })
    C.clip('walk', {
        legL: [k(legL, 1, rot=(A, 0, 0)), k(legL, 8, rot=(-A, 0, 0)), k(legL, 16, rot=(A, 0, 0))],
        legR: [k(legR, 1, rot=(-A, 0, 0)), k(legR, 8, rot=(A, 0, 0)), k(legR, 16, rot=(-A, 0, 0))],
        armL: [k(armL, 1, rot=(-A * 0.8, -0.15, 0)), k(armL, 8, rot=(A * 0.8, -0.15, 0)), k(armL, 16, rot=(-A * 0.8, -0.15, 0))],
        armR: [k(armR, 1, rot=(A * 0.8, 0.15, 0)), k(armR, 8, rot=(-A * 0.8, 0.15, 0)), k(armR, 16, rot=(A * 0.8, 0.15, 0))],
        body: [k(body, 1, rot=(-0.12, 0, 0), loc=(0, 0, 0.06)), k(body, 4, rot=(-0.12, 0, 0.05)), k(body, 8, rot=(-0.12, 0, 0), loc=(0, 0, 0.06)), k(body, 12, rot=(-0.12, 0, -0.05)), k(body, 16, rot=(-0.12, 0, 0), loc=(0, 0, 0.06))],
    })
    C.clip('attack', {
        body: [k(body, 1), k(body, 5, rot=(0.35, 0, 0), loc=(0, 0.12, 0)), k(body, 8, rot=(-0.65, 0, 0), loc=(0, -0.45, 0)), k(body, 14)],
        armR: [k(armR, 1), k(armR, 5, rot=(-2.4, 0.5, 0)), k(armR, 8, rot=(1.0, 0, 0)), k(armR, 14)],
        armL: [k(armL, 1), k(armL, 5, rot=(0.7, -0.3, 0)), k(armL, 8, rot=(-0.3, -0.3, 0)), k(armL, 14)],
        head: [k(head, 1), k(head, 8, rot=(0.25, 0, 0)), k(head, 14)],
    })
    C.clip('hit', {
        body: [k(body, 1), k(body, 3, rot=(0.5, 0, 0), loc=(0, 0.15, 0)), k(body, 8)],
        head: [k(head, 1), k(head, 3, rot=(0.4, 0, 0)), k(head, 8)],
        armL: [k(armL, 1), k(armL, 3, rot=(-1.2, -0.6, 0)), k(armL, 8)],
        armR: [k(armR, 1), k(armR, 3, rot=(-1.2, 0.6, 0)), k(armR, 8)],
    })
    C.clip('death', {
        root: [k(root, 1), k(root, 10, rot=(1.2, 0, 0), loc=(0, 0.3, 0.5)), k(root, 18, rot=(1.57, 0, 0), loc=(0, 0.45, 0.05)), k(root, 24, rot=(1.57, 0, 0), loc=(0, 0.45, -0.6))],
        armL: [k(armL, 1), k(armL, 12, rot=(-2.5, -0.3, 0)), k(armL, 24, rot=(-2.5, -0.3, 0))],
        armR: [k(armR, 1), k(armR, 12, rot=(-2.5, 0.3, 0)), k(armR, 24, rot=(-2.5, 0.3, 0))],
    })
    C.clip('victory', {
        root: [k(root, 1), k(root, 12, loc=(0, 0, 0.35)), k(root, 24)],
        armL: [k(armL, 1, rot=(-2.6, -0.5, 0)), k(armL, 12, rot=(-2.9, -0.5, 0)), k(armL, 24, rot=(-2.6, -0.5, 0))],
        armR: [k(armR, 1, rot=(-2.6, 0.5, 0)), k(armR, 12, rot=(-2.3, 0.5, 0)), k(armR, 24, rot=(-2.6, 0.5, 0))],
        head: [k(head, 1, rot=(0, 0.2, 0)), k(head, 12, rot=(0, -0.2, 0)), k(head, 24, rot=(0, 0.2, 0))],
    })
    C.clip('stun', {
        head: [k(head, 1, rot=(0.25, 0.35, 0)), k(head, 12, rot=(0.25, -0.35, 0)), k(head, 24, rot=(0.25, 0.35, 0))],
        body: [k(body, 1, rot=(0.15, 0.12, 0)), k(body, 12, rot=(0.15, -0.12, 0)), k(body, 24, rot=(0.15, 0.12, 0))],
        armL: [k(armL, 1, rot=(0.3, -0.9, 0)), k(armL, 24, rot=(0.3, -0.9, 0))],
        armR: [k(armR, 1, rot=(0.3, 0.9, 0)), k(armR, 24, rot=(0.3, 0.9, 0))],
    })
    C.clip('special', {
        armR: [k(armR, 1), k(armR, 6, rot=(-2.8, 0.3, 0)), k(armR, 20)],
        armL: [k(armL, 1), k(armL, 6, rot=(-2.8, -0.3, 0)), k(armL, 20)],
        root: [k(root, 1), k(root, 6, loc=(0, 0, 0.2)), k(root, 12), k(root, 16, loc=(0, 0, 0.2)), k(root, 20)],
    })
