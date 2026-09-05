# art_ref — referências visuais dos personagens

Coloque aqui as folhas de modelo geradas pelo Sol (ou desenhadas), uma pasta por personagem,
com o mesmo id usado em `src/config/Cards.js` / `tools/blender/specs.py`:

```
art_ref/
  militante/  frente.png  lado.png  costas.png  pose.png
  barbudo/    ...
  capitao/ careca/ dino/ tiozap/ assessor/ influencer/
  agroboy/ coach/ pastor/ fiel/ pneus/ maconheiro/ musico/ mascote/
```

Regras: personagem fictício (sem rosto de pessoa real), estilo charge (cabeça ~1/3 da altura,
contorno forte, cores chapadas), pose neutra de braços levemente abertos nas três vistas,
fundo liso. A `pose.png` é o gesto característico (microfone, caneta, laço, transformação).
Os modelos v1 em `public/models/` foram feitos sem referência e estão DESLIGADOS
(`Config.visual.useGLB = false`); serão refeitos a partir destas imagens.
