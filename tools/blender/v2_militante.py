# MILITANTE v2 — a partir de art_ref/militante/folha_sol_01.png, SEM sigla/logo (regra do projeto):
# cabelo preto cacheado, bigode, cara brava, camisa na COR DO TIME, calça escura, botas, boné do time
# (liso) e placa sem texto. Corpo atarracado, braços fortes. build() no contrato do humanoid.clips.
import charlib as C
import orglib as O

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_militante', hx(0xd9a06b))
    shirt = C.material('TEAM_shirt', hx(0x2bb3c0), roughness=0.85)
    cap = C.material('TEAM_cap', hx(0x2bb3c0), roughness=0.8)
    pants = C.material('pants_militante', hx(0x2b2f3a), roughness=0.9)
    boots = C.material('boots_militante', hx(0x7a4a24), roughness=0.7)
    sole = C.material('sole_militante', hx(0x3a2a1e))
    hair = C.material('hair_militante', hx(0x151515))
    white = C.material('white', (1, 1, 1)); black = C.material('black', (0.06, 0.06, 0.06), 0.4)
    mouthM = C.material('mouth', hx(0x5a1e1e))
    wood = C.material('wood', hx(0x9b7653)); board = C.material('board', hx(0xfff5c2)); ink = C.material('inkText', hx(0x2a2a2a))

    H = 2.1
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ = 0.78
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.17, 0, hipZ)); P['leg' + side] = g
        O.blob('legm' + side, pants, [
            O.ellipsoid((sx * 0.18, 0.0, 0.62), 0.15, (0.15, 0.17, 0.24)),
            O.ellipsoid((sx * 0.18, 0.0, 0.40), 0.13, (0.13, 0.14, 0.22)),
        ], g)
        O.blob('boot' + side, boots, [
            O.ellipsoid((sx * 0.18, -0.07, 0.13), 0.15, (0.16, 0.26, 0.14)),
            O.ellipsoid((sx * 0.18, 0.06, 0.18), 0.12, (0.14, 0.15, 0.15)),
        ], g, resolution=0.04)
        O.box('sole' + side, sole, (0.33, 0.5, 0.06), g, (sx * 0.18, -0.06, 0.03), bevel=0.02)
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.02, 1.26), 0.34, (0.44, 0.30, 0.24)),      # peito largo
        O.ellipsoid((0, -0.02, 1.02), 0.30, (0.36, 0.30, 0.24)),
        O.ellipsoid((0, 0.03, 0.86), 0.26, (0.31, 0.25, 0.13)),
    ], body, resolution=0.045)
    O.box('belt', C.material('belt', hx(0x3b2a1a)), (0.66, 0.56, 0.07), body, (0, 0, 0.82), bevel=0.02)
    armLen = 0.58
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('arm' + side, body, (sx * 0.47, 0.0, 1.30)); P['arm' + side] = g
        O.blob('sleeve' + side, shirt, [O.ellipsoid((sx * 0.47, 0, 1.25), 0.15, (0.15, 0.15, 0.17))], g, resolution=0.04)
        O.blob('forearm' + side, skin, [
            O.ellipsoid((sx * 0.50, 0, 1.06), 0.12, (0.12, 0.12, 0.17)),     # braço forte
            O.ellipsoid((sx * 0.51, 0, 0.88), 0.11, (0.11, 0.11, 0.14)),
        ], g, resolution=0.04)
        hand = O.blob('hand' + side, skin, [
            O.ellipsoid((sx * 0.52, -0.02, 0.70), 0.12, (0.12, 0.10, 0.13)),
            O.ball((sx * 0.47, -0.09, 0.68), 0.05), O.ball((sx * 0.57, -0.09, 0.68), 0.05), O.ball((sx * 0.52, -0.10, 0.75), 0.05),
        ], g, resolution=0.035); P['hand' + side] = hand
    neckZ = 1.48
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.38
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 0.98, hs * 0.94, hs * 1.0)),
        O.ellipsoid((0, -0.10, hc[2] - 0.16), 0.2, (0.32, 0.19, 0.17)),
        O.ball((0, 0.04, neckZ + 0.06), 0.12),
    ], head, resolution=0.035)
    for sx in (-1, 1):
        O.blob('ear' + ('L' if sx < 0 else 'R'), skin, [O.ellipsoid((sx * hs * 0.98, 0.02, hc[2] - 0.04), 0.06, (0.05, 0.07, 0.08))], head, resolution=0.03, subdiv=0)
    O.blob('nose', skin, [O.ellipsoid((0, -hs * 0.98, hc[2] - 0.08), 0.09, (0.08, 0.10, 0.09))], head, resolution=0.03, subdiv=0)
    ey, ez = hc[2] + 0.05, -hs * 0.86
    for sx in (-1, 1):
        n = 'L' if sx < 0 else 'R'
        O.sphere('eye' + n, white, 0.085, head, (sx * 0.14, ez, ey), scale=(1, 0.75, 1.1), seg=14)
        O.sphere('pupil' + n, black, 0.042, head, (sx * 0.14, ez - 0.055, ey - 0.01), seg=10)
        O.box('brow' + n, hair, (0.19, 0.06, 0.06), head, (sx * 0.15, ez - 0.03, ey + 0.12), rot=(0, sx * 0.5, 0), bevel=0.012)
    # bigode grosso + boca séria
    O.blob('mustache', hair, [O.ellipsoid((-0.08, -hs * 0.92, hc[2] - 0.20), 0.06, (0.10, 0.05, 0.045)), O.ellipsoid((0.08, -hs * 0.92, hc[2] - 0.20), 0.06, (0.10, 0.05, 0.045))], head, resolution=0.025, subdiv=0)
    O.box('mouth', mouthM, (0.13, 0.03, 0.03), head, (0, -hs * 0.93, hc[2] - 0.28), bevel=0.01)
    # cabelo cacheado preto (nuvem de bolas) + boné liso do time por cima
    O.cluster('hairTop', hair, (0, 0.03, hc[2] + hs * 0.55), 34, (0.07, 0.12), (hs * 1.0, hs * 0.9, 0.16), head, seed=5, resolution=0.04)
    O.cluster('hairSide', hair, (0, 0.10, hc[2] + 0.05), 20, (0.07, 0.11), (hs * 1.05, hs * 0.6, hs * 0.5), head, seed=9, resolution=0.04)
    # boné do time (liso, sem sigla) assentado sobre o cabelo, aba para frente
    O.blob('cap', cap, [
        O.ellipsoid((0, 0.04, hc[2] + hs * 0.62), 0.3, (hs * 1.08, hs * 1.08, 0.30)),
        O.ellipsoid((0, 0.02, hc[2] + hs * 0.95), 0.2, (hs * 0.8, hs * 0.8, 0.14)),
    ], head, resolution=0.035)
    O.box('bill', cap, (hs * 1.1, hs * 0.85, 0.045), head, (0, -hs * 1.0, hc[2] + hs * 0.50), rot=(0.12, 0, 0), bevel=0.012)
    # placa erguida na mão direita, à frente (sem texto: só riscos)
    w = C.empty('weapon', P['handR'], (0.52, -0.02, 0.70)); P['weapon'] = w
    O.cylinder('stick', wood, 0.03, 1.15, w, (0.58, -0.22, 1.20), rot=(0.35, 0.12, 0), seg=8)
    O.box('boardMesh', board, (0.80, 0.05, 0.50), w, (0.72, -0.42, 1.92), rot=(0.35, 0.12, 0.05), bevel=0.02)
    O.box('boardInk', ink, (0.56, 0.02, 0.07), w, (0.72, -0.465, 2.0), rot=(0.35, 0.12, 0.05), bevel=0)
    O.box('boardInk2', ink, (0.40, 0.02, 0.07), w, (0.70, -0.44, 1.86), rot=(0.35, 0.12, 0.05), bevel=0)
    return P, dict(legH=hipZ, bodyR=0.36, bodyLen=0.55, hs=hs, armLen=armLen, height=H)
