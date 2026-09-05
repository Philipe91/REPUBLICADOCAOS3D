# MILITANTE v2 — a partir de art_ref/militante/folha_sol_01.png, SEM sigla/logo (regra do projeto).
# Identidade: cabelo preto cacheado e alto (a folha padrão é sem boné), bigodão, cara brava/determinada,
# pescoço e braços fortes, punhos grandes, camisa na COR DO TIME, calça escura, botas; bandeira lisa
# do time num mastro. Corpo atarracado.
import charlib as C
import orglib as O
import v2_face as F

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_militante', hx(0xd2955e))
    shirt = C.material('TEAM_shirt', hx(0x2bb3c0), roughness=0.85)
    flag = C.material('TEAM_flag', hx(0x2bb3c0), roughness=0.9)
    pants = C.material('pants_militante', hx(0x262a34), roughness=0.9)
    boots = C.material('boots_militante', hx(0x7a4a24), roughness=0.7)
    sole = C.material('sole_militante', hx(0x3a2a1e))
    hair = C.material('hair_militante', hx(0x141414))
    wood = C.material('wood', hx(0x9b7653))

    H = 2.1
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ = 0.78
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.17, 0, hipZ)); P['leg' + side] = g
        O.blob('legm' + side, pants, [
            O.ellipsoid((sx * 0.19, 0.0, 0.62), 0.15, (0.16, 0.18, 0.24)),
            O.ellipsoid((sx * 0.19, 0.0, 0.40), 0.13, (0.14, 0.15, 0.22)),
        ], g)
        O.blob('boot' + side, boots, [
            O.ellipsoid((sx * 0.19, -0.08, 0.13), 0.15, (0.17, 0.27, 0.14)),
            O.ellipsoid((sx * 0.19, 0.05, 0.19), 0.12, (0.15, 0.16, 0.16)),
        ], g, resolution=0.04)
        O.box('sole' + side, sole, (0.34, 0.52, 0.06), g, (sx * 0.19, -0.07, 0.03), bevel=0.02)
        O.box('lace' + side, sole, (0.09, 0.02, 0.09), g, (sx * 0.19, -0.18, 0.26), bevel=0.005)
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.02, 1.28), 0.34, (0.46, 0.30, 0.24)),      # peito largo (ombro a ombro)
        O.ellipsoid((0, -0.02, 1.04), 0.30, (0.36, 0.28, 0.24)),
        O.ellipsoid((0, 0.03, 0.88), 0.26, (0.31, 0.25, 0.13)),
    ], body, resolution=0.045)
    O.box('belt', C.material('belt', hx(0x3b2a1a)), (0.66, 0.56, 0.07), body, (0, 0, 0.82), bevel=0.02)
    armLen = 0.58
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('arm' + side, body, (sx * 0.49, 0.0, 1.32)); P['arm' + side] = g
        O.blob('sleeve' + side, shirt, [O.ellipsoid((sx * 0.49, 0, 1.26), 0.15, (0.17, 0.17, 0.19))], g, resolution=0.04)   # deltoide
        O.blob('forearm' + side, skin, [
            O.ellipsoid((sx * 0.53, -0.01, 1.06), 0.12, (0.14, 0.14, 0.17)),     # bíceps
            O.ellipsoid((sx * 0.55, -0.06, 0.88), 0.12, (0.13, 0.14, 0.15)),     # antebraço grosso
        ], g, resolution=0.04)
        hand = O.blob('hand' + side, skin, [
            O.ellipsoid((sx * 0.56, -0.10, 0.70), 0.14, (0.13, 0.12, 0.14)),     # punho cerrado grande
            O.ball((sx * 0.49, -0.17, 0.72), 0.055), O.ball((sx * 0.56, -0.20, 0.73), 0.055), O.ball((sx * 0.63, -0.17, 0.72), 0.055),
        ], g, resolution=0.035); P['hand' + side] = hand
    O.cylinder('teamBand', C.material('TEAM_band', hx(0x2bb3c0)), 0.15, 0.09, P['armL'], (-0.53, -0.01, 1.15), seg=14)
    neckZ = 1.50
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.38
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 0.98, hs * 0.94, hs * 1.0)),
        O.ellipsoid((0, -0.10, hc[2] - 0.16), 0.2, (0.32, 0.20, 0.18)),
        O.ball((0, 0.04, neckZ + 0.05), 0.16),                              # pescoço de touro
    ], head, resolution=0.035)
    F.ears(head, skin, hc, hs, r=0.07)
    F.nose(head, skin, hc, hs, w=0.10, d=0.12, h=0.10)
    F.eyes(head, skin, hc, hs, r=0.10, dx=0.145, squint=0.35, tilt=0.4, iris=(0.25, 0.14, 0.06))
    F.brows(head, hair, hc, hs, size=(0.22, 0.065, 0.075), dx=0.15, angle=0.6)
    F.mouth(head, hc, hs, kind='frown', w=0.15, dz=-0.29)
    # bigodão preto e largo cobrindo o lábio
    O.blob('mustache', hair, [
        O.ellipsoid((-0.10, -hs * 0.93, hc[2] - 0.21), 0.06, (0.12, 0.05, 0.05), rot=(0, 0.25, 0)),
        O.ellipsoid((0.10, -hs * 0.93, hc[2] - 0.21), 0.06, (0.12, 0.05, 0.05), rot=(0, -0.25, 0)),
        O.ball((0, -hs * 0.96, hc[2] - 0.20), 0.05),
    ], head, resolution=0.025, subdiv=0)
    # cabelo cacheado preto, alto e largo (nuvens de bolas pequenas), descendo pelas laterais e nuca
    O.cluster('hairTop', hair, (0, 0.04, hc[2] + hs * 0.60), 46, (0.06, 0.10), (hs * 1.08, hs * 1.0, 0.20), head, seed=5, resolution=0.035)
    O.cluster('hairSide', hair, (0, 0.10, hc[2] + 0.04), 30, (0.06, 0.09), (hs * 1.15, hs * 0.85, hs * 0.55), head, seed=9, resolution=0.035)
    O.cluster('hairBack', hair, (0, hs * 0.75, hc[2] - 0.05), 16, (0.06, 0.09), (hs * 0.8, 0.10, hs * 0.5), head, seed=17, resolution=0.035)
    # bandeira lisa do time num mastro, erguida à frente pela mão direita
    w = C.empty('weapon', P['handR'], (0.56, -0.10, 0.70)); P['weapon'] = w
    O.cylinder('stick', wood, 0.03, 1.4, w, (0.64, -0.30, 1.28), rot=(0.32, 0.10, 0), seg=8)
    # pano da bandeira: dois painéis finos com dobra (tremulando), presos ao topo do mastro
    O.box('flagCloth', flag, (0.50, 0.02, 0.40), w, (0.90, -0.46, 1.84), rot=(0.32, 0.10, 0.30), bevel=0.005)
    O.box('flagCloth2', flag, (0.40, 0.02, 0.36), w, (1.22, -0.60, 1.78), rot=(0.32, 0.10, -0.15), bevel=0.005)
    O.sphere('poleTip', C.material('gold', hx(0xd7b34a), 0.4), 0.045, w, (0.85, -0.78, 1.95), seg=10)
    return P, dict(legH=hipZ, bodyR=0.36, bodyLen=0.55, hs=hs, armLen=armLen, height=H)
