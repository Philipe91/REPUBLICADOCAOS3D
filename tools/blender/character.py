# Gera o GLB de UM personagem a partir de specs.py.
# Uso: "%LOCALAPPDATA%\Programs\Blender\blender.exe" -b -P tools/blender/character.py -- <tipo> <saida.glb>
# Ex.:  ... -- barbudo public/models/barbudo.glb
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import charlib as C
import humanoid as H
from specs import SPECS

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) < 2: raise SystemExit('uso: -- <tipo> <saida.glb>')
kind, out = args[0], args[1]
spec = SPECS[kind]
C.reset()
P, dims = H.build(spec)
H.clips(P, spec, dims)
C.export(out)
