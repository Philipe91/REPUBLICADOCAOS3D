# MACONHEIRO v2 — a partir de art_ref/maconheiro/folha_sol_01.png: gorro rasta grande e caído para trás,
# dreads até o ombro, cavanhaque, olhos sonolentos + sorrisinho torto, colar da paz, camiseta creme com
# folha, bermuda larga, meias brancas, tênis vermelhos de listras. Pose: mão esquerda no bolso,
# mão direita com o cigarrinho perto da boca, fumacinha.
import math
import charlib as C
import orglib as O
import v2_face as F

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_maconheiro', hx(0xd6a06c))
    shirt = C.material('shirt_maconheiro', hx(0xece2cf), roughness=0.9)
    leaf = C.material('leaf', hx(0x3f8f3a))
    shorts = C.material('shorts_maconheiro', hx(0x3a4531), roughness=0.9)
    sock = C.material('sock', (0.95, 0.95, 0.95))
    shoe = C.material('shoe_maconheiro', hx(0xc8282a), roughness=0.6)
    stripe = C.material('stripe', (0.97, 0.97, 0.97))
    hair = C.material('hair_maconheiro', hx(0x2b1a10))
    red = C.material('gorro_red', hx(0xc8282a)); yel = C.material('gorro_yellow', hx(0xf0c419)); grn = C.material('gorro_green', hx(0x1f8a3a))
    band = C.material('TEAM_band', hx(0x2bb3c0))
    metal = C.material('metal', (0.75, 0.75, 0.78), 0.35)
    smoke = C.material('smoke', (0.85, 0.85, 0.85), 1.0)

    H = 2.1
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ = 0.86
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.15, 0, hipZ)); P['leg' + side] = g
        O.blob('short' + side, shorts, [O.ellipsoid((sx * 0.17, 0.0, 0.70), 0.14, (0.17, 0.18, 0.21))], g)
        O.blob('shin' + side, skin, [O.ellipsoid((sx * 0.16, 0.0, 0.44), 0.09, (0.085, 0.09, 0.19))], g, resolution=0.04)
        O.blob('sock' + side, sock, [O.ellipsoid((sx * 0.16, 0.0, 0.27), 0.1, (0.105, 0.11, 0.10))], g, resolution=0.035)
        O.blob('shoe' + side, shoe, [
            O.ellipsoid((sx * 0.16, -0.11, 0.11), 0.13, (0.13, 0.26, 0.10)),
            O.ellipsoid((sx * 0.16, 0.05, 0.13), 0.11, (0.12, 0.13, 0.11)),
        ], g, resolution=0.035)
        O.box('sole' + side, stripe, (0.28, 0.52, 0.05), g, (sx * 0.16, -0.09, 0.025), bevel=0.02)
        O.blob('toecap' + side, stripe, [O.ellipsoid((sx * 0.16, -0.30, 0.09), 0.08, (0.11, 0.08, 0.07))], g, resolution=0.03, subdiv=0)
        for k in range(3):   # listras brancas laterais
            O.box(f'stripe{side}{k}', stripe, (0.012, 0.03, 0.09), g, (sx * 0.29, -0.16 + k * 0.06, 0.12), rot=(0, 0, 0.3 * sx), bevel=0)
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.0, 1.30), 0.28, (0.36, 0.24, 0.22)),
        O.ellipsoid((0, 0.0, 1.06), 0.24, (0.29, 0.22, 0.24)),
        O.ellipsoid((0, 0.0, 0.90), 0.22, (0.27, 0.22, 0.12)),
    ], body, resolution=0.045)
    # folha de sete pontas no peito (genérica) + caule
    for i, a in enumerate((-1.35, -0.9, -0.45, 0.0, 0.45, 0.9, 1.35)):
        L = (0.07, 0.10, 0.13, 0.15, 0.13, 0.10, 0.07)[i]
        O.box(f'leaf{i}', leaf, (0.03, 0.015, L), body, (math.sin(a) * L * 0.55, -0.247, 1.10 + math.cos(a) * L * 0.55), rot=(0, -a, 0), bevel=0.006)
    O.box('leafStem', leaf, (0.015, 0.015, 0.08), body, (0, -0.247, 1.03), bevel=0)
    O.torus('necklace', C.material('cord', hx(0x4a3520)), 0.19, 0.014, body, (0, -0.02, 1.44), rot=(1.25, 0, 0), seg=24)
    O.torus('peace', metal, 0.045, 0.012, body, (0, -0.255, 1.29), rot=(1.57, 0, 0), seg=16)
    O.box('peaceBar', metal, (0.012, 0.012, 0.085), body, (0, -0.255, 1.29), bevel=0)
    O.box('peaceBar2', metal, (0.012, 0.012, 0.05), body, (-0.018, -0.255, 1.272), rot=(0, 0.8, 0), bevel=0)
    O.box('peaceBar3', metal, (0.012, 0.012, 0.05), body, (0.018, -0.255, 1.272), rot=(0, -0.8, 0), bevel=0)
    armLen = 0.60
    # braço esquerdo: relaxado, mão indo para o bolso da bermuda
    g = C.empty('armL', body, (-0.38, 0.0, 1.36)); P['armL'] = g
    O.blob('sleeveL', shirt, [O.ellipsoid((-0.38, 0, 1.31), 0.12, (0.12, 0.12, 0.15))], g, resolution=0.04)
    O.blob('forearmL', skin, [
        O.ellipsoid((-0.40, 0, 1.12), 0.09, (0.09, 0.09, 0.17)),
        O.ellipsoid((-0.38, -0.08, 0.95), 0.085, (0.085, 0.10, 0.13)),
    ], g, resolution=0.04)
    P['handL'] = O.blob('handL', skin, [O.ellipsoid((-0.33, -0.17, 0.84), 0.10, (0.10, 0.09, 0.10))], g, resolution=0.035)
    for i, m in enumerate((red, yel, grn)):
        O.cylinder(f'braceletL{i}', m, 0.095, 0.025, g, (-0.39, -0.03, 0.90 + i * 0.03), rot=(0.4, 0, 0), seg=14)
    O.cylinder('teamBand', band, 0.125, 0.09, g, (-0.39, 0, 1.20), seg=14)
    # braço direito: dobrado, cigarrinho perto da boca
    g = C.empty('armR', body, (0.38, 0.0, 1.36)); P['armR'] = g
    O.blob('sleeveR', shirt, [O.ellipsoid((0.38, 0, 1.31), 0.12, (0.12, 0.12, 0.15))], g, resolution=0.04)
    O.blob('forearmR', skin, [
        O.ellipsoid((0.40, -0.02, 1.14), 0.09, (0.09, 0.10, 0.16)),
        O.ellipsoid((0.38, -0.20, 1.10), 0.085, (0.09, 0.16, 0.085)),          # antebraço vindo para frente
        O.ellipsoid((0.36, -0.32, 1.22), 0.085, (0.085, 0.10, 0.14)),          # subindo até a altura do queixo
    ], g, resolution=0.04)
    P['handR'] = O.blob('handR', skin, [
        O.ellipsoid((0.35, -0.36, 1.36), 0.10, (0.09, 0.09, 0.11)),
        O.ball((0.30, -0.42, 1.42), 0.04), O.ball((0.38, -0.44, 1.42), 0.04),
    ], g, resolution=0.035)
    for i, m in enumerate((red, yel, grn)):
        O.cylinder(f'braceletR{i}', m, 0.095, 0.025, g, (0.34, -0.22, 1.13 + i * 0.03), rot=(1.4, 0, 0), seg=14)
    neckZ = 1.58
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.36
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 0.96, hs * 0.94, hs * 1.0)),
        O.ellipsoid((0, -0.08, hc[2] - 0.18), 0.18, (0.27, 0.18, 0.18)),
        O.ball((0, 0.03, neckZ + 0.05), 0.11),
    ], head, resolution=0.035)
    F.ears(head, skin, hc, hs, r=0.065)
    F.nose(head, skin, hc, hs, w=0.08, d=0.10, h=0.085)
    F.eyes(head, skin, hc, hs, r=0.085, dx=0.14, squint=0.6, tilt=-0.3, iris=(0.3, 0.16, 0.06), gaze=0.3)     # olhos sonolentos espiando por baixo da pálpebra
    F.brows(head, hair, hc, hs, size=(0.16, 0.05, 0.045), dx=0.14, angle=-0.25, lift=0.01, dz=0.02)  # uma levantada
    F.mouth(head, hc, hs, kind='smirk', w=0.15, dz=-0.24)
    O.blob('goatee', hair, [O.ellipsoid((0, -hs * 0.82, hc[2] - 0.36), 0.06, (0.08, 0.06, 0.11)), O.ellipsoid((0, -hs * 0.92, hc[2] - 0.30), 0.04, (0.05, 0.04, 0.05))], head, resolution=0.025, subdiv=0)
    O.blob('lipHair', hair, [O.ellipsoid((0, -hs * 0.95, hc[2] - 0.20), 0.03, (0.07, 0.03, 0.02))], head, resolution=0.02, subdiv=0)
    # gorro rasta grande, caído para trás (domo verde + "saco" atrás) e duas faixas grossas
    topZ = hc[2] + hs * 0.45
    O.blob('gorroGreen', grn, [
        O.ellipsoid((0, 0.06, topZ + 0.24), 0.3, (hs * 1.15, hs * 1.15, 0.30)),
        O.ellipsoid((0, 0.30, topZ + 0.30), 0.2, (hs * 0.85, hs * 0.9, 0.24)),
        O.ellipsoid((0, 0.46, topZ + 0.16), 0.2, (hs * 0.6, hs * 0.5, 0.18)),
    ], head, resolution=0.035)
    O.torus('gorroYellow', yel, hs * 1.06, 0.06, head, (0, 0.04, topZ + 0.11), rot=(-0.12, 0, 0), seg=28)
    O.torus('gorroRed', red, hs * 1.08, 0.06, head, (0, 0.04, topZ + 0.01), rot=(-0.12, 0, 0), seg=28)
    # dreads longos pelos lados e nuca (até o ombro)
    import random
    rnd = random.Random(4)
    for i in range(16):
        a = i * (2 * math.pi) / 16
        x, y = math.cos(a) * hs * 0.98, math.sin(a) * hs * 0.98
        if y < -0.30 or (y < -0.1 and abs(x) < 0.25): continue   # não tapa o rosto
        n = 5 + rnd.randint(0, 3)
        dx, dy = x * 0.05, y * 0.05
        O.blob(f'dread{i}', hair, [O.ellipsoid((x + dx * k, y + dy * k, topZ - 0.02 - k * 0.095), 0.05, (0.05, 0.05, 0.08)) for k in range(n)], head, resolution=0.03, subdiv=0)
    # cigarrinho na mão direita + fumaça
    w = C.empty('weapon', P['handR'], (0.35, -0.36, 1.36)); P['weapon'] = w
    O.cylinder('cig', C.material('white', (1, 1, 1)), 0.016, 0.16, w, (0.32, -0.45, 1.49), rot=(0.5, 0.35, 0), seg=8)
    O.sphere('ember', C.material('ember', hx(0xff6a1a), 0.5, emissive=hx(0xff4a00)), 0.02, w, (0.36, -0.49, 1.56), seg=8)
    # fumaça sobe ao LADO da cabeça (fora do rosto)
    O.blob('smoke', smoke, [O.ball((0.42, -0.50, 1.66), 0.03), O.ball((0.48, -0.50, 1.76), 0.035), O.ball((0.50, -0.48, 1.88), 0.04), O.ball((0.55, -0.46, 2.0), 0.045)], w, resolution=0.025, subdiv=0)
    return P, dict(legH=hipZ, bodyR=0.3, bodyLen=0.5, hs=hs, armLen=armLen, height=H)
