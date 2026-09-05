# MACONHEIRO v2 — a partir de art_ref/maconheiro/folha_sol_01.png: gorro listrado (verde/amarelo/vermelho),
# dreads, cavanhaque, olhos sonolentos, colar da paz, camiseta creme, bermuda verde-escura, meias brancas,
# tênis vermelhos, cigarrinho na mão. Corpo magro e relaxado. build() no contrato do humanoid.clips.
import math
import charlib as C
import orglib as O

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_maconheiro', hx(0xd29a66))
    shirt = C.material('shirt_maconheiro', hx(0xece2cf), roughness=0.9)
    leaf = C.material('leaf', hx(0x3f8f3a))
    shorts = C.material('shorts_maconheiro', hx(0x3d4a33), roughness=0.9)
    sock = C.material('sock', (0.95, 0.95, 0.95))
    shoe = C.material('shoe_maconheiro', hx(0xc8282a), roughness=0.6)
    sole = C.material('sole_white', (0.92, 0.92, 0.9))
    hair = C.material('hair_maconheiro', hx(0x2b1a10))
    red = C.material('gorro_red', hx(0xc8282a)); yel = C.material('gorro_yellow', hx(0xf0c419)); grn = C.material('gorro_green', hx(0x1f8a3a))
    white = C.material('white', (1, 1, 1)); black = C.material('black', (0.06, 0.06, 0.06), 0.4)
    mouthM = C.material('mouth', hx(0x5a1e1e))
    band = C.material('TEAM_band', hx(0x2bb3c0))
    metal = C.material('metal', (0.75, 0.75, 0.78), 0.35)

    H = 2.1
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ = 0.84
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.15, 0, hipZ)); P['leg' + side] = g
        O.blob('short' + side, shorts, [O.ellipsoid((sx * 0.16, 0.0, 0.70), 0.14, (0.15, 0.16, 0.20))], g)
        O.blob('shin' + side, skin, [O.ellipsoid((sx * 0.16, 0.0, 0.44), 0.09, (0.09, 0.10, 0.20))], g, resolution=0.04)
        O.blob('sock' + side, sock, [O.ellipsoid((sx * 0.16, 0.0, 0.27), 0.1, (0.10, 0.11, 0.09))], g, resolution=0.035)
        O.blob('shoe' + side, shoe, [
            O.ellipsoid((sx * 0.16, -0.10, 0.11), 0.13, (0.13, 0.25, 0.10)),
            O.ellipsoid((sx * 0.16, 0.05, 0.13), 0.11, (0.12, 0.13, 0.11)),
        ], g, resolution=0.035)
        O.box('sole' + side, sole, (0.28, 0.5, 0.05), g, (sx * 0.16, -0.08, 0.025), bevel=0.02)
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.0, 1.30), 0.28, (0.36, 0.24, 0.22)),
        O.ellipsoid((0, 0.0, 1.06), 0.24, (0.28, 0.22, 0.24)),
        O.ellipsoid((0, 0.0, 0.90), 0.22, (0.26, 0.21, 0.12)),
    ], body, resolution=0.045)
    # estampa de folha genérica no peito (leque de 5 pétalas finas)
    for i, a in enumerate((-1.1, -0.55, 0.0, 0.55, 1.1)):
        L = 0.11 if i == 2 else (0.09 if i in (1, 3) else 0.07)
        O.box(f'leaf{i}', leaf, (0.035, 0.015, L), body, (math.sin(a) * L * 0.55, -0.245, 1.10 + math.cos(a) * L * 0.55), rot=(0, -a, 0), bevel=0.008)
    # colar de cordão com pingente da paz
    O.torus('necklace', C.material('cord', hx(0x4a3520)), 0.19, 0.014, body, (0, -0.02, 1.44), rot=(1.25, 0, 0), seg=24)
    O.torus('peace', metal, 0.045, 0.012, body, (0, -0.255, 1.29), rot=(1.57, 0, 0), seg=16)
    O.box('peaceBar', metal, (0.012, 0.012, 0.085), body, (0, -0.255, 1.29), bevel=0)
    O.box('peaceBar2', metal, (0.012, 0.012, 0.05), body, (-0.018, -0.255, 1.272), rot=(0, 0.8, 0), bevel=0)
    O.box('peaceBar3', metal, (0.012, 0.012, 0.05), body, (0.018, -0.255, 1.272), rot=(0, -0.8, 0), bevel=0)
    armLen = 0.60
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('arm' + side, body, (sx * 0.38, 0.0, 1.36)); P['arm' + side] = g
        O.blob('sleeve' + side, shirt, [O.ellipsoid((sx * 0.38, 0, 1.31), 0.12, (0.12, 0.12, 0.15))], g, resolution=0.04)
        O.blob('forearm' + side, skin, [
            O.ellipsoid((sx * 0.40, 0, 1.12), 0.09, (0.09, 0.09, 0.17)),
            O.ellipsoid((sx * 0.41, 0, 0.94), 0.085, (0.085, 0.085, 0.14)),
        ], g, resolution=0.04)
        hand = O.blob('hand' + side, skin, [
            O.ellipsoid((sx * 0.42, -0.02, 0.76), 0.11, (0.11, 0.09, 0.12)),
            O.ball((sx * 0.38, -0.08, 0.74), 0.045), O.ball((sx * 0.46, -0.08, 0.74), 0.045), O.ball((sx * 0.42, -0.09, 0.81), 0.045),
        ], g, resolution=0.035); P['hand' + side] = hand
        for i, m in enumerate((red, yel, grn)):   # pulseiras
            O.cylinder(f'bracelet{side}{i}', m, 0.10, 0.025, g, (sx * 0.41, 0, 0.88 + i * 0.03), seg=14)
    O.cylinder('teamBand', band, 0.125, 0.09, P['armL'], (-0.39, 0, 1.20), seg=14)
    neckZ = 1.56
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.36
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 0.96, hs * 0.94, hs * 1.0)),
        O.ellipsoid((0, -0.08, hc[2] - 0.18), 0.18, (0.27, 0.18, 0.17)),
        O.ball((0, 0.03, neckZ + 0.05), 0.11),
    ], head, resolution=0.035)
    for sx in (-1, 1):
        O.blob('ear' + ('L' if sx < 0 else 'R'), skin, [O.ellipsoid((sx * hs * 0.97, 0.02, hc[2] - 0.04), 0.06, (0.05, 0.065, 0.08))], head, resolution=0.03, subdiv=0)
    O.blob('nose', skin, [O.ellipsoid((0, -hs * 0.98, hc[2] - 0.08), 0.08, (0.07, 0.09, 0.08))], head, resolution=0.03, subdiv=0)
    ey, ez = hc[2] + 0.05, -hs * 0.86
    for sx in (-1, 1):
        n = 'L' if sx < 0 else 'R'
        O.sphere('eye' + n, white, 0.09, head, (sx * 0.14, ez, ey), scale=(1, 0.7, 0.9), seg=14)
        O.sphere('pupil' + n, black, 0.045, head, (sx * 0.14, ez - 0.055, ey - 0.02), seg=10)
        O.box('lid' + n, skin, (0.19, 0.07, 0.035), head, (sx * 0.14, ez - 0.01, ey + 0.06), rot=(0.2, 0, 0), bevel=0.008)   # pálpebra caída (olho sonolento)
        O.box('brow' + n, hair, (0.15, 0.05, 0.04), head, (sx * 0.14, ez - 0.03, ey + 0.12), rot=(0, -sx * 0.12, 0), bevel=0.01)
    O.box('mouth', mouthM, (0.12, 0.03, 0.03), head, (0.03, -hs * 0.93, hc[2] - 0.24), rot=(0, 0, 0.15), bevel=0.01)   # sorrisinho torto
    O.blob('goatee', hair, [O.ellipsoid((0, -hs * 0.80, hc[2] - 0.36), 0.06, (0.09, 0.06, 0.10))], head, resolution=0.025, subdiv=0)
    # gorro rasta: domo verde "caído" para trás + duas faixas (amarela, vermelha) abraçando a cabeça
    topZ = hc[2] + hs * 0.45
    O.blob('gorroGreen', grn, [
        O.ellipsoid((0, 0.04, topZ + 0.22), 0.3, (hs * 1.06, hs * 1.06, 0.26)),
        O.ellipsoid((0, 0.14, topZ + 0.44), 0.2, (hs * 0.8, hs * 0.9, 0.16)),
    ], head, resolution=0.035)
    O.torus('gorroYellow', yel, hs * 1.02, 0.045, head, (0, 0.03, topZ + 0.10), seg=28)
    O.torus('gorroRed', red, hs * 1.04, 0.045, head, (0, 0.03, topZ + 0.02), seg=28)
    # dreads caindo dos lados e de trás (não na frente do rosto)
    import random
    rnd = random.Random(4)
    for i in range(14):
        a = i * (2 * math.pi) / 14
        x, y = math.cos(a) * hs * 0.95, math.sin(a) * hs * 0.95
        if y < -0.22: continue   # não tapa o rosto
        n = 3 + rnd.randint(0, 3)
        dx, dy = x * 0.06, y * 0.06
        O.blob(f'dread{i}', hair, [O.ellipsoid((x + dx * k, y + dy * k, topZ - 0.02 - k * 0.10), 0.05, (0.05, 0.05, 0.085)) for k in range(n)], head, resolution=0.03, subdiv=0)
    # cigarrinho na mão direita
    w = C.empty('weapon', P['handR'], (0.42, -0.02, 0.76)); P['weapon'] = w
    O.cylinder('cig', white, 0.018, 0.16, w, (0.42, -0.12, 0.84), rot=(1.2, 0, 0), seg=8)
    O.sphere('ember', C.material('ember', hx(0xff6a1a)), 0.02, w, (0.42, -0.19, 0.88), seg=8)
    return P, dict(legH=hipZ, bodyR=0.3, bodyLen=0.5, hs=hs, armLen=armLen, height=H)
