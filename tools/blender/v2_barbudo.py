# BARBUDO v2 — a partir de art_ref/barbudo/folha_sol_01.png (caricatura genérica: barbudo grisalho,
# camisa vermelha, barriga, jeans, botas grandes). Proporções da folha: ~3,6 cabeças de altura,
# ombros largos, braços e pernas grossos, mãos e botas grandes.
# build() devolve (P, dims) no contrato do humanoid.clips.
import math
import charlib as C
import orglib as O
from mathutils import Vector

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_barbudo', hx(0xeab887))
    shirt = C.material('shirt_barbudo', hx(0xc8282a), roughness=0.85)
    jeans = C.material('jeans_barbudo', hx(0x2f5fb0), roughness=0.9)
    boots = C.material('boots_barbudo', hx(0x8b5a2b), roughness=0.7)
    sole = C.material('sole_barbudo', hx(0x3a2a1e))
    hair = C.material('hair_barbudo', hx(0x9d9d9d))
    brow = C.material('brow_barbudo', hx(0x2a2a2a))
    white = C.material('white', (1, 1, 1)); black = C.material('black', (0.06, 0.06, 0.06), 0.4)
    mouthM = C.material('mouth', hx(0x5a1e1e))
    teeth = C.material('teeth', (0.96, 0.96, 0.9))
    band = C.material('TEAM_band', hx(0x2bb3c0))

    H = 2.25                     # altura total (cabeça ≈ 1/3,5)
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ, kneeZ = 0.82, 0.40
    # ---------- pernas (jeans grossos) + botas grandes ----------
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.19, 0, hipZ)); P['leg' + side] = g
        O.blob('legm' + side, jeans, [
            O.ellipsoid((sx * 0.20, 0.0, 0.66), 0.17, (0.17, 0.19, 0.24)),
            O.ellipsoid((sx * 0.20, 0.0, 0.42), 0.15, (0.15, 0.16, 0.22)),
        ], g)
        O.blob('boot' + side, boots, [
            O.ellipsoid((sx * 0.20, -0.08, 0.14), 0.16, (0.18, 0.28, 0.15)),
            O.ellipsoid((sx * 0.20, 0.06, 0.18), 0.13, (0.16, 0.17, 0.16)),
        ], g, resolution=0.04)
        O.box('sole' + side, sole, (0.36, 0.54, 0.06), g, (sx * 0.20, -0.07, 0.03), bevel=0.02)
    # ---------- tronco: peito largo + barriga para frente ----------
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.02, 1.32), 0.36, (0.46, 0.32, 0.26)),      # peito/ombros
        O.ellipsoid((0, -0.10, 1.05), 0.34, (0.40, 0.36, 0.28)),     # barriga
        O.ellipsoid((0, 0.04, 0.90), 0.28, (0.34, 0.26, 0.14)),      # cintura/traseiro
    ], body, resolution=0.045)
    # barriga de fora (pele) por baixo da camisa
    O.blob('bellySkin', skin, [O.ellipsoid((0, -0.24, 0.92), 0.16, (0.22, 0.12, 0.09))], body, resolution=0.04)
    O.box('belt', C.material('belt', hx(0x3b2a1a)), (0.74, 0.62, 0.07), body, (0, 0, 0.86), bevel=0.02)
    # ---------- braços: manga curta (camisa) + antebraço grosso (pele) + mão grande ----------
    armLen = 0.60
    for side, sx in (('L', -1), ('R', 1)):
        sh = (sx * 0.50, 0.0, 1.36)
        g = C.empty('arm' + side, body, sh); P['arm' + side] = g
        O.blob('sleeve' + side, shirt, [O.ellipsoid((sx * 0.50, 0, 1.31), 0.15, (0.16, 0.16, 0.18))], g, resolution=0.04)
        O.blob('forearm' + side, skin, [
            O.ellipsoid((sx * 0.52, 0, 1.10), 0.12, (0.12, 0.12, 0.18)),
            O.ellipsoid((sx * 0.53, 0, 0.90), 0.11, (0.11, 0.11, 0.15)),
        ], g, resolution=0.04)
        hand = O.blob('hand' + side, skin, [
            O.ellipsoid((sx * 0.54, -0.02, 0.72), 0.13, (0.13, 0.11, 0.14)),
            O.ball((sx * 0.49, -0.10, 0.70), 0.055), O.ball((sx * 0.59, -0.10, 0.70), 0.055),
            O.ball((sx * 0.54, -0.11, 0.77), 0.055), O.ball((sx * 0.61, -0.02, 0.77), 0.055),
        ], g, resolution=0.035); P['hand' + side] = hand
    O.cylinder('teamBand', band, 0.16, 0.10, P['armL'], (-0.51, 0, 1.18), seg=14)
    # ---------- cabeça grande, orelhas, nariz, sobrancelhas grossas, barba e cabelo volumosos ----------
    neckZ = 1.54
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.40                                  # cabeça GRANDE (charge)
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 1.0, hs * 0.96, hs * 1.0)),
        O.ellipsoid((0, -0.12, hc[2] - 0.16), 0.20, (0.34, 0.20, 0.17)),   # bochechas/maxilar largos
        O.ball((0, 0.04, neckZ + 0.06), 0.13),                               # pescoço
    ], head, resolution=0.035)
    for sx in (-1, 1):
        O.blob('ear' + ('L' if sx < 0 else 'R'), skin, [O.ellipsoid((sx * hs * 0.98, 0.02, hc[2] - 0.04), 0.06, (0.05, 0.07, 0.09))], head, resolution=0.03, subdiv=0)
    O.blob('nose', skin, [O.ellipsoid((0, -hs * 0.98, hc[2] - 0.08), 0.1, (0.09, 0.10, 0.09))], head, resolution=0.03, subdiv=0)
    ey, ez = hc[2] + 0.06, -hs * 0.86
    for sx in (-1, 1):
        n = 'L' if sx < 0 else 'R'
        O.sphere('eye' + n, white, 0.09, head, (sx * 0.15, ez, ey), scale=(1, 0.75, 1.15), seg=14)
        O.sphere('pupil' + n, black, 0.045, head, (sx * 0.15, ez - 0.06, ey - 0.01), seg=10)
        O.box('brow' + n, brow, (0.2, 0.06, 0.07), head, (sx * 0.16, ez - 0.03, ey + 0.13), rot=(0, sx * 0.45, 0), bevel=0.015)
    # boca séria (linha) + barba fechando o queixo
    O.box('mouth', mouthM, (0.16, 0.03, 0.03), head, (0, -hs * 0.92, hc[2] - 0.24), bevel=0.01)
    O.cluster('beard', hair, (0, -hs * 0.55, hc[2] - 0.36), 26, (0.08, 0.13), (hs * 0.8, hs * 0.5, 0.15), head, seed=3, resolution=0.04)
    O.cluster('hairTop', hair, (0, 0.05, hc[2] + hs * 0.62), 30, (0.09, 0.15), (hs * 0.95, hs * 0.85, 0.12), head, seed=7, resolution=0.045)
    O.cluster('hairBack', hair, (0, hs * 0.55, hc[2] + 0.12), 18, (0.09, 0.14), (hs * 0.8, 0.12, hs * 0.55), head, seed=11, resolution=0.045)
    # microfone na mão direita (identidade do Barbudo)
    w = C.empty('weapon', P['handR'], (0.54, -0.02, 0.72)); P['weapon'] = w
    O.cylinder('micStick', C.material('dark', hx(0x333333)), 0.035, 0.42, w, (0.54, -0.12, 0.86), rot=(0.5, 0, 0), seg=10)
    O.sphere('micBall', C.material('grey', hx(0x777777)), 0.11, w, (0.54, -0.22, 1.06), seg=14)
    return P, dict(legH=hipZ, bodyR=0.4, bodyLen=0.6, hs=hs, armLen=armLen, height=H)
