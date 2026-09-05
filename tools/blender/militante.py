# MILITANTE — piloto do fluxo Blender → GLB → jogo.
# Uso: "%LOCALAPPDATA%\Programs\Blender\blender.exe" -b -P tools/blender/militante.py -- public/models/militante.glb
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import charlib as C

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'militante.glb'
C.reset()

# ---------- materiais (TEAM… recebe a cor do time no jogo) ----------
skin = C.material('skin', C.hexrgb(0xf1c27d))
team = C.material('TEAM_shirt', C.hexrgb(0x2bb3c0))
teamCap = C.material('TEAM_cap', C.hexrgb(0x2bb3c0))
pants = C.material('pants', C.hexrgb(0x2f3542))
shoes = C.material('shoes', C.hexrgb(0x1e1e1e))
hair = C.material('hair', C.hexrgb(0x2b1d14))
white = C.material('white', (1, 1, 1))
black = C.material('black', (0.06, 0.06, 0.06), roughness=0.4)
mouthM = C.material('mouth', C.hexrgb(0x5a1e1e))
wood = C.material('wood', C.hexrgb(0x9b7653))
board = C.material('board', C.hexrgb(0xfff5c2))
ink = C.material('ink', C.hexrgb(0x2a2a2a))

# ---------- proporções (bodyType small do rig procedural, ~1.7 m) ----------
legH, bodyR, bodyLen, hs = 0.52, 0.30, 0.42, 0.44   # hs = raio da cabeça (cabeça grande = charge)
root = C.empty('root')
legL = C.empty('legL', root, (-0.15, 0, legH)); legR = C.empty('legR', root, (0.15, 0, legH))
for g, sx in ((legL, -1), (legR, 1)):
    C.capsule('leg' + g.name[-1], pants, 0.11, legH - 0.26, g, (0, 0, -legH / 2 + 0.04))
    C.box('foot' + g.name[-1], shoes, (0.26, 0.40, 0.16), g, (0, -0.06, -legH + 0.08), bevel=0.05)

body = C.empty('body', root, (0, 0, legH))
torso = C.capsule('torso', team, bodyR, bodyLen, body, (0, 0, bodyLen / 2 + bodyR * 0.9))
armL = C.empty('armL', body, (-(bodyR + 0.07), 0, bodyLen + bodyR * 1.3))
armR = C.empty('armR', body, ((bodyR + 0.07), 0, bodyLen + bodyR * 1.3))
armLen = 0.42
for g in (armL, armR):
    C.capsule('arm' + g.name[-1], team, 0.085, armLen - 0.18, g, (0, 0, -armLen / 2))
    C.sphere('hand' + g.name[-1], skin, 0.15, g, (0, 0, -armLen - 0.03))

head = C.empty('head', body, (0, 0, bodyLen + bodyR * 2 - 0.02))
C.sphere('skull', skin, hs, head, (0, 0, hs * 0.95), seg=24)
ey, ez = hs * 1.05, -hs * 0.82          # olhos na frente (-Y)
for sx in (-1, 1):
    C.sphere('eye' + ('L' if sx < 0 else 'R'), white, 0.085, head, (sx * hs * 0.38, ez, ey), seg=12)
    C.sphere('pupil' + ('L' if sx < 0 else 'R'), black, 0.04, head, (sx * hs * 0.38, ez - 0.07, ey), seg=8)
    C.box('brow' + ('L' if sx < 0 else 'R'), hair, (0.16, 0.04, 0.045), head, (sx * hs * 0.38, ez - 0.02, ey + 0.13), rot=(0, sx * 0.5, 0), bevel=0)
C.sphere('nose', skin, 0.07, head, (0, -hs * 0.98, ey - hs * 0.22), seg=10)
C.sphere('mouth', mouthM, 0.09, head, (0, -hs * 0.86, ey - hs * 0.55), scale=(1, 0.6, 1.2), seg=12)   # boca gritando
# boné do time (calota + aba)
C.sphere('cap', teamCap, hs * 1.04, head, (0, 0, hs * 0.95 + hs * 0.42), scale=(1, 1, 0.6), seg=20)
C.box('bill', teamCap, (hs * 1.1, hs * 0.75, 0.05), head, (0, -hs * 0.9, hs * 0.95 + hs * 0.45), bevel=0.02)
# placa na mão direita
sign = C.empty('sign', armR, (0, 0, -armLen - 0.03))
C.cylinder('stick', wood, 0.03, 0.9, sign, (0, 0, 0.35), seg=8)
C.box('boardMesh', board, (0.62, 0.05, 0.42), sign, (0, 0, 0.92), bevel=0.02)
C.box('boardInk', ink, (0.44, 0.02, 0.06), sign, (0, -0.035, 0.98), bevel=0)
C.box('boardInk2', ink, (0.32, 0.02, 0.06), sign, (0, -0.035, 0.87), bevel=0)

# ---------- clipes ----------
R = {o: C.rest(o) for o in (root, body, head, armL, armR, legL, legR)}
def k(o, f, rot=None, loc=None, sc=None):
    r0, l0, s0 = R[o]
    return (f, tuple(a + b for a, b in zip(r0, rot)) if rot else r0, tuple(a + b for a, b in zip(l0, loc)) if loc else l0, sc)

# idle (48 f): respira, cabeça balança, placa levanta um pouco
C.clip('idle', {
    body: [k(body, 1), k(body, 24, loc=(0, 0, 0.03)), k(body, 48)],
    head: [k(head, 1), k(head, 12, rot=(0, 0.05, 0)), k(head, 36, rot=(0, -0.05, 0)), k(head, 48)],
    armR: [k(armR, 1, rot=(0, 0.12, 0)), k(armR, 24, rot=(-0.25, 0.12, 0)), k(armR, 48, rot=(0, 0.12, 0))],
    armL: [k(armL, 1, rot=(0, -0.12, 0)), k(armL, 24, rot=(0.06, -0.15, 0)), k(armL, 48, rot=(0, -0.12, 0))],
})
# walk (16 f): passos rápidos de militante, placa balançando
A = 0.7
C.clip('walk', {
    legL: [k(legL, 1, rot=(A, 0, 0)), k(legL, 8, rot=(-A, 0, 0)), k(legL, 16, rot=(A, 0, 0))],
    legR: [k(legR, 1, rot=(-A, 0, 0)), k(legR, 8, rot=(A, 0, 0)), k(legR, 16, rot=(-A, 0, 0))],
    armL: [k(armL, 1, rot=(-A * 0.8, -0.15, 0)), k(armL, 8, rot=(A * 0.8, -0.15, 0)), k(armL, 16, rot=(-A * 0.8, -0.15, 0))],
    armR: [k(armR, 1, rot=(-1.6, 0.15, 0)), k(armR, 8, rot=(-1.3, 0.15, 0)), k(armR, 16, rot=(-1.6, 0.15, 0))],   # placa erguida
    body: [k(body, 1, rot=(-0.12, 0, 0), loc=(0, 0, 0.06)), k(body, 4, rot=(-0.12, 0, 0.05), loc=(0, 0, 0)), k(body, 8, rot=(-0.12, 0, 0), loc=(0, 0, 0.06)), k(body, 12, rot=(-0.12, 0, -0.05), loc=(0, 0, 0)), k(body, 16, rot=(-0.12, 0, 0), loc=(0, 0, 0.06))],
})
# attack (14 f): recua com a placa, bate (frame 8 = impacto ≈ windup 0.29 s), volta
C.clip('attack', {
    body: [k(body, 1), k(body, 5, rot=(0.35, 0, 0), loc=(0, 0.12, 0)), k(body, 8, rot=(-0.65, 0, 0), loc=(0, -0.45, 0)), k(body, 14)],
    armR: [k(armR, 1), k(armR, 5, rot=(-2.4, 0.5, 0)), k(armR, 8, rot=(1.0, 0, 0)), k(armR, 14)],
    armL: [k(armL, 1), k(armL, 5, rot=(0.7, -0.3, 0)), k(armL, 8, rot=(-0.3, -0.3, 0)), k(armL, 14)],
    head: [k(head, 1), k(head, 8, rot=(0.25, 0, 0)), k(head, 14)],
})
# hit (8 f): recua e treme
C.clip('hit', {
    body: [k(body, 1), k(body, 3, rot=(0.5, 0, 0), loc=(0, 0.15, 0)), k(body, 8)],
    head: [k(head, 1), k(head, 3, rot=(0.4, 0, 0)), k(head, 8)],
    armL: [k(armL, 1), k(armL, 3, rot=(-1.2, -0.6, 0)), k(armL, 8)],
    armR: [k(armR, 1), k(armR, 3, rot=(-1.2, 0.6, 0)), k(armR, 8)],
})
# death (24 f): tomba de costas com pulinho e afunda
C.clip('death', {
    root: [k(root, 1), k(root, 10, rot=(1.2, 0, 0), loc=(0, 0.3, 0.5)), k(root, 18, rot=(1.57, 0, 0), loc=(0, 0.45, 0.05)), k(root, 24, rot=(1.57, 0, 0), loc=(0, 0.45, -0.6))],
    armL: [k(armL, 1), k(armL, 12, rot=(-2.5, -0.3, 0)), k(armL, 24, rot=(-2.5, -0.3, 0))],
    armR: [k(armR, 1), k(armR, 12, rot=(-2.5, 0.3, 0)), k(armR, 24, rot=(-2.5, 0.3, 0))],
})
# victory (24 f, loop): pula com a placa no alto
C.clip('victory', {
    root: [k(root, 1), k(root, 12, loc=(0, 0, 0.35)), k(root, 24)],
    armL: [k(armL, 1, rot=(-2.6, -0.5, 0)), k(armL, 12, rot=(-2.9, -0.5, 0)), k(armL, 24, rot=(-2.6, -0.5, 0))],
    armR: [k(armR, 1, rot=(-2.6, 0.5, 0)), k(armR, 12, rot=(-2.3, 0.5, 0)), k(armR, 24, rot=(-2.6, 0.5, 0))],
    head: [k(head, 1, rot=(0, 0.2, 0)), k(head, 12, rot=(0, -0.2, 0)), k(head, 24, rot=(0, 0.2, 0))],
})
# stun (24 f, loop): tonto, cabeça rodando
C.clip('stun', {
    head: [k(head, 1, rot=(0.25, 0.35, 0)), k(head, 12, rot=(0.25, -0.35, 0)), k(head, 24, rot=(0.25, 0.35, 0))],
    body: [k(body, 1, rot=(0.15, 0.12, 0)), k(body, 12, rot=(0.15, -0.12, 0)), k(body, 24, rot=(0.15, 0.12, 0))],
    armL: [k(armL, 1, rot=(0.3, -0.9, 0)), k(armL, 24, rot=(0.3, -0.9, 0))],
    armR: [k(armR, 1, rot=(0.3, 0.9, 0)), k(armR, 24, rot=(0.3, 0.9, 0))],
})
# special (20 f): genérico — levanta a placa e pula
C.clip('special', {
    armR: [k(armR, 1), k(armR, 6, rot=(-2.8, 0.3, 0)), k(armR, 20)],
    armL: [k(armL, 1), k(armL, 6, rot=(-2.8, -0.3, 0)), k(armL, 20)],
    root: [k(root, 1), k(root, 6, loc=(0, 0, 0.2)), k(root, 12), k(root, 16, loc=(0, 0, 0.2)), k(root, 20)],
})

C.export(out)
