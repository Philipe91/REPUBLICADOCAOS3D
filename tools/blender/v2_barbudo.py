# BARBUDO v2 — a partir de art_ref/barbudo/folha_sol_01.png (caricatura genérica: barbudo grisalho,
# camisa vermelha, barriga de fora, jeans, botas grandes). ~3,6 cabeças; ombros largos; antebraços
# grossos; punhos fechados à frente; cara séria com sobrancelha grossa e olhar de cima.
import charlib as C
import orglib as O
import v2_face as F

def build(spec=None):
    hx = C.hexrgb
    skin = C.material('SKIN_barbudo', hx(0xedbd8c))
    shirt = C.material('shirt_barbudo', hx(0xc8282a), roughness=0.85)
    jeans = C.material('jeans_barbudo', hx(0x2f5fb0), roughness=0.9)
    boots = C.material('boots_barbudo', hx(0x8b5a2b), roughness=0.7)
    sole = C.material('sole_barbudo', hx(0x3a2a1e))
    hair = C.material('hair_barbudo', hx(0x9a9a9a))
    beardM = C.material('beard_barbudo', hx(0xb4b4b4))
    brow = C.material('brow_barbudo', hx(0x2a2a2a))
    band = C.material('TEAM_band', hx(0x2bb3c0))

    H = 2.25
    P = {}
    root = C.empty('root'); P['root'] = root
    hipZ = 0.82
    # ---------- pernas grossas + botas grandes ----------
    for side, sx in (('L', -1), ('R', 1)):
        g = C.empty('leg' + side, root, (sx * 0.19, 0, hipZ)); P['leg' + side] = g
        O.blob('legm' + side, jeans, [
            O.ellipsoid((sx * 0.21, 0.0, 0.66), 0.17, (0.18, 0.20, 0.24)),
            O.ellipsoid((sx * 0.21, 0.0, 0.42), 0.15, (0.16, 0.17, 0.22)),
        ], g)
        O.blob('boot' + side, boots, [
            O.ellipsoid((sx * 0.21, -0.09, 0.14), 0.16, (0.19, 0.30, 0.15)),
            O.ellipsoid((sx * 0.21, 0.05, 0.20), 0.13, (0.17, 0.18, 0.17)),
        ], g, resolution=0.04)
        O.box('sole' + side, sole, (0.38, 0.58, 0.06), g, (sx * 0.21, -0.08, 0.03), bevel=0.02)
        O.box('lace' + side, sole, (0.10, 0.02, 0.10), g, (sx * 0.21, -0.20, 0.27), bevel=0.005)
    # ---------- tronco: peito largo + barriga saltada para frente ----------
    body = C.empty('body', root, (0, 0, hipZ)); P['body'] = body
    O.blob('torso', shirt, [
        O.ellipsoid((0, 0.02, 1.34), 0.36, (0.48, 0.32, 0.26)),      # peito/ombros
        O.ellipsoid((0, -0.12, 1.06), 0.34, (0.42, 0.38, 0.28)),     # barriga
        O.ellipsoid((0, 0.04, 0.92), 0.28, (0.36, 0.28, 0.14)),
    ], body, resolution=0.045)
    O.blob('bellySkin', skin, [O.ellipsoid((0, -0.30, 0.90), 0.16, (0.26, 0.14, 0.11))], body, resolution=0.035)
    O.sphere('navel', C.material('navel', hx(0xb98860)), 0.02, body, (0, -0.44, 0.92), seg=8)
    O.box('belt', C.material('belt', hx(0x3b2a1a)), (0.76, 0.64, 0.07), body, (0, 0, 0.85), bevel=0.02)
    # ---------- braços: manga esticada, antebraço grosso dobrado para frente, punho fechado ----------
    armLen = 0.60
    for side, sx in (('L', -1), ('R', 1)):
        sh = (sx * 0.52, 0.0, 1.36)
        g = C.empty('arm' + side, body, sh); P['arm' + side] = g
        O.blob('sleeve' + side, shirt, [O.ellipsoid((sx * 0.52, 0, 1.30), 0.15, (0.17, 0.17, 0.19))], g, resolution=0.04)
        O.blob('forearm' + side, skin, [
            O.ellipsoid((sx * 0.55, -0.02, 1.10), 0.12, (0.13, 0.13, 0.17)),          # braço até o cotovelo
            O.ellipsoid((sx * 0.55, -0.14, 0.98), 0.13, (0.13, 0.18, 0.13)),          # antebraço grosso vindo para frente
            O.ellipsoid((sx * 0.53, -0.27, 0.92), 0.12, (0.12, 0.14, 0.12)),
        ], g, resolution=0.04)
        hand = O.blob('hand' + side, skin, [
            O.ellipsoid((sx * 0.51, -0.40, 0.90), 0.14, (0.13, 0.13, 0.14)),          # punho fechado
            O.ball((sx * 0.44, -0.48, 0.94), 0.055), O.ball((sx * 0.51, -0.51, 0.95), 0.055), O.ball((sx * 0.58, -0.48, 0.94), 0.055),
            O.ball((sx * 0.40, -0.42, 0.86), 0.05),
        ], g, resolution=0.035); P['hand' + side] = hand
    O.cylinder('teamBand', band, 0.165, 0.10, P['armL'], (-0.54, -0.01, 1.16), seg=14)
    # ---------- cabeça grande: maxilar largo, orelhas, nariz, sobrancelhas grossas, olhar de cima ----------
    neckZ = 1.56
    head = C.empty('head', body, (0, 0, neckZ)); P['head'] = head
    hs = 0.41
    hc = (0, 0, neckZ + hs * 0.88)
    O.blob('skull', skin, [
        O.ellipsoid(hc, hs, (hs * 1.0, hs * 0.96, hs * 1.0)),
        O.ellipsoid((0, -0.10, hc[2] - 0.18), 0.20, (0.36, 0.22, 0.18)),   # bochechas/maxilar largos
        O.ball((0, 0.04, neckZ + 0.06), 0.15),                               # pescoço grosso
    ], head, resolution=0.035)
    F.ears(head, skin, hc, hs, r=0.08)
    F.nose(head, skin, hc, hs, w=0.11, d=0.12, h=0.11)
    F.eyes(head, skin, hc, hs, r=0.105, dx=0.155, squint=0.45, tilt=0.35, iris=(0.3, 0.18, 0.08), bags=True)
    F.brows(head, brow, hc, hs, size=(0.24, 0.07, 0.085), dx=0.16, angle=0.55, lift=-0.005)
    F.mouth(head, hc, hs, kind='frown', w=0.17, dz=-0.25, teeth=True)
    # barba grande fechando o queixo e subindo pelas costeletas; cabelo grisalho volumoso puxado para trás
    O.cluster('beard', beardM, (0, -hs * 0.40, hc[2] - 0.48), 40, (0.08, 0.13), (hs * 1.0, hs * 0.6, 0.16), head, seed=3, resolution=0.04)
    for sx in (-1, 1):
        O.cluster('sideburn' + ('L' if sx < 0 else 'R'), beardM, (sx * hs * 0.88, -0.06, hc[2] - 0.18), 10, (0.07, 0.10), (0.08, 0.14, 0.18), head, seed=5 + sx, resolution=0.04)
    O.cluster('hairTop', hair, (0, 0.06, hc[2] + hs * 0.62), 34, (0.09, 0.15), (hs * 1.0, hs * 0.9, 0.14), head, seed=7, size=(0.15, 0.09, 0.08), resolution=0.045)
    O.cluster('hairBack', hair, (0, hs * 0.6, hc[2] + 0.10), 22, (0.09, 0.14), (hs * 0.85, 0.14, hs * 0.6), head, seed=11, size=(0.12, 0.10, 0.10), resolution=0.045)
    for sx in (-1, 1):
        O.cluster('hairSide' + ('L' if sx < 0 else 'R'), hair, (sx * hs * 0.92, 0.12, hc[2] + 0.12), 12, (0.08, 0.12), (0.08, 0.18, 0.16), head, seed=13 + sx, resolution=0.045)
    # microfone na mão direita (identidade do Barbudo)
    w = C.empty('weapon', P['handR'], (0.51, -0.40, 0.90)); P['weapon'] = w
    O.cylinder('micStick', C.material('dark', hx(0x333333)), 0.035, 0.40, w, (0.51, -0.48, 1.04), rot=(0.35, 0, 0), seg=10)
    O.sphere('micBall', C.material('grey', hx(0x777777)), 0.11, w, (0.51, -0.56, 1.24), seg=14)
    return P, dict(legH=hipZ, bodyR=0.4, bodyLen=0.6, hs=hs, armLen=armLen, height=H)
