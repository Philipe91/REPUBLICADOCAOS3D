# Rosto expressivo compartilhado pelos personagens v2 (segue as folhas: olhos grandes com pálpebra,
# sobrancelha grossa que faz a expressão, nariz com narinas, boca com formato — não uma linha reta).
# Tudo em coordenadas de MUNDO, parentado ao Empty da cabeça.
import charlib as C
import orglib as O

def eyes(head, skin, hc, hs, r=0.11, dx=0.15, squint=0.3, iris=(0.35, 0.2, 0.1), tilt=0.0, bags=False, gaze=0.1):
    """olhos com íris, pupila e pálpebra superior (squint 0 = arregalado, 1 = quase fechado).
    tilt > 0 = pálpebra com o canto interno mais baixo (cara brava); tilt < 0 = caída para fora (sonolento).
    gaze = quanto a íris desce (0 = centro, 0.3 = espiando por baixo da pálpebra).
    Convenção Blender: rotação Y positiva num ponto de +x desce esse ponto; o canto interno do olho
    esquerdo (sx=-1) fica em +x local, por isso rot_y = -sx*tilt."""
    white = C.material('eyewhite', (0.97, 0.96, 0.93))
    black = C.material('black', (0.06, 0.06, 0.06), 0.4)
    irisM = C.material('iris', iris, 0.5)
    ey, ez = hc[2] + 0.05, -hs * 0.86
    for sx in (-1, 1):
        n = 'L' if sx < 0 else 'R'
        O.sphere('eye' + n, white, r, head, (sx * dx, ez, ey), scale=(1, 0.7, 1.0), seg=16)
        O.sphere('iris' + n, irisM, r * 0.58, head, (sx * dx, ez - r * 0.52, ey - r * gaze), scale=(1, 0.5, 1), seg=12)
        O.sphere('pupil' + n, black, r * 0.32, head, (sx * dx, ez - r * 0.68, ey - r * gaze), seg=10)
        # pálpebra superior: meia-calota de pele cobrindo o topo do olho
        cover = 0.35 + squint * 0.55
        O.blob('lid' + n, skin, [O.ellipsoid((sx * dx, ez + r * 0.15, ey + r * (1.05 - cover)), r, (r * 1.2, r * 0.85, r * cover), rot=(0, -sx * tilt, 0))], head, resolution=0.02, subdiv=0)
        if bags:
            O.blob('bag' + n, skin, [O.ellipsoid((sx * dx, ez + r * 0.2, ey - r * 0.9), r, (r * 1.1, r * 0.7, r * 0.35))], head, resolution=0.02, subdiv=0)

def brows(head, mat, hc, hs, size=(0.2, 0.06, 0.07), dx=0.15, angle=0.5, lift=0.0, dz=0.0):
    """angle > 0 = ponta interna para baixo (bravo); angle < 0 = arqueada (relaxado/surpreso)"""
    ey, ez = hc[2] + 0.05, -hs * 0.86
    for sx in (-1, 1):
        n = 'L' if sx < 0 else 'R'
        O.box('brow' + n, mat, size, head, (sx * dx, ez - 0.02, ey + 0.13 + lift + dz * sx), rot=(0.1, -sx * angle, 0), bevel=0.015)

def nose(head, skin, hc, hs, w=0.10, d=0.11, h=0.10, dz=-0.08):
    O.blob('nose', skin, [
        O.ellipsoid((0, -hs * 0.98, hc[2] + dz), w, (w, d, h)),
        O.ball((-w * 0.6, -hs * 0.92, hc[2] + dz - h * 0.4), w * 0.45),
        O.ball((w * 0.6, -hs * 0.92, hc[2] + dz - h * 0.4), w * 0.45),
    ], head, resolution=0.025, subdiv=0)

def mouth(head, hc, hs, kind='frown', w=0.16, dz=-0.25, open_=0.0, teeth=False):
    """kind: frown (bravo/sério), smirk (sorrisinho torto), smile, yell (boca aberta)"""
    lip = C.material('mouth', (0.35, 0.12, 0.12))
    dark = C.material('mouthIn', (0.16, 0.05, 0.05))
    y = -hs * 0.93
    z = hc[2] + dz
    if kind == 'yell':
        O.blob('mouth', dark, [O.ellipsoid((0, y, z), w, (w * 0.6, 0.05, 0.08 + open_))], head, resolution=0.02, subdiv=0)
        O.box('teeth', C.material('teeth', (0.96, 0.96, 0.9)), (w * 0.9, 0.02, 0.035), head, (0, y - 0.03, z + 0.06 + open_ * 0.5), bevel=0.005)
        return
    if kind == 'frown':
        pts = [(-w * 0.5, z - 0.03), (-w * 0.25, z + 0.005), (0, z + 0.015), (w * 0.25, z + 0.005), (w * 0.5, z - 0.03)]
    elif kind == 'smile':
        pts = [(-w * 0.5, z + 0.035), (-w * 0.25, z + 0.005), (0, z - 0.01), (w * 0.25, z + 0.005), (w * 0.5, z + 0.035)]
    else:  # smirk
        pts = [(-w * 0.5, z - 0.005), (-w * 0.25, z - 0.012), (0, z - 0.01), (w * 0.25, z + 0.005), (w * 0.5, z + 0.04)]
    O.blob('mouth', lip, [O.ellipsoid((x, y, zz), 0.03, (0.045, 0.02, 0.022)) for x, zz in pts], head, resolution=0.015, subdiv=0)
    if teeth:
        O.box('teeth', C.material('teeth', (0.96, 0.96, 0.9)), (w * 0.6, 0.015, 0.03), head, (0, y - 0.005, z - 0.03), bevel=0.004)

def ears(head, skin, hc, hs, r=0.07):
    for sx in (-1, 1):
        O.blob('ear' + ('L' if sx < 0 else 'R'), skin, [
            O.ellipsoid((sx * hs * 1.0, 0.02, hc[2] - 0.03), r, (r * 0.7, r * 1.0, r * 1.3)),
            O.ball((sx * hs * 1.02, 0.0, hc[2] - 0.08), r * 0.5),
        ], head, resolution=0.025, subdiv=0)
