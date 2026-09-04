# REPÚBLICA DO CAOS — Batalha pelo Planalto

Sátira cartunesca 3D da política brasileira, no navegador. Gênero "lane battler" (3 lanes, cartas, tropas automáticas, duas bases, recurso que regenera). Three.js + Vite + lil-gui. Sem backend.

## Rodar

```bash
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente http://localhost:5173). Chrome/Edge desktop.

## Controles

- Clique numa carta (ou teclas **1–4**) → as lanes acendem → clique na lane.
- RECESSO (poder global) joga direto no clique.
- Botão direito / **Esc** cancela a seleção.
- **G** abre/fecha o painel de ajustes (lil-gui). Lá tem **COPIAR CONFIG** (JSON no clipboard) e **REINICIAR PARTIDA**.

Parâmetros de URL para teste: `?autostart=1` (pula o menu), `?auto=1` (um bot joga por você), `?speed=4` (velocidade), `?debug=1` (stats + decisões do bot).

## Estrutura

```
src/
  main.js                     entrada
  config/Config.js            TODOS os valores ajustáveis (lil-gui edita este objeto)
  config/Cards.js             definição das cartas
  core/Game.js                loop, partida, vitória/derrota, TRETA FINAL
  core/EventBus.js, ObjectPool.js, Assets.js (geometrias/materiais compartilhados)
  scene/SceneSetup.js         renderer, luzes, fog, câmera
  scene/CameraController.js   câmera via Config + camera shake
  scene/Arena.js              PRAÇA DO CAOS (lanes, jardins, prédios, placas...)
  scene/Base.js               SEDE DO PODER (estágios de dano + CRISE INSTITUCIONAL)
  units/Unit.js               LÓGICA da unidade (estados, alvo, combate, buffs)
  units/UnitBehaviors.js      passivas/especiais por tipo (COMPANHEIRADA, MOTOCIATA, SUSPENSO, MODO JURÁSSICO...)
  units/UnitManager.js        spawn, listas por lane, update
  visual/CharacterVisual.js   INTERFACE visual (playIdle/playWalk/playAttack/...)
  visual/ProceduralCharacter.js         boneco de primitivas + animações procedurais
  visual/ProceduralCharacterVisual.js   adapter procedural → CharacterVisual
  visual/GLBCharacterVisual.js          adapter GLB + AnimationMixer (futuro)
  visual/CharacterFactory.js  specs caricatas por personagem; escolhe GLB ou procedural
  visual/AssetManager.js      carrega /models/*.glb se existirem (senão, procedural)
  cards/Deck.js, PlayerController.js (Capital Político + mão), Powers.js (Canetada, Motociata, Recesso, Pesquisa)
  ai/Bot.js                   bot simples e ajustável
  effects/ParticleManager.js  1 InstancedMesh (cubos, papéis, fumaça) + anéis
  effects/FloatingTextManager.js  sprites com pool + memes de tela (1 elemento DOM)
  effects/ProjectileManager.js    projéteis com pool
  effects/HealthBarManager.js     barras de vida em 2 InstancedMeshes (zero DOM)
  audio/AudioManager.js       sons placeholder sintetizados (WebAudio)
  ui/HUD.js, CardUI.js, Screens.js, ui.css
  debug/DebugPanel.js (lil-gui), DebugDraw.js
```

## Trocar bonecos procedurais por modelos do Blender

1. Exporte o GLB com animações nomeadas `Idle`, `Walk`, `Attack`, `Hit`, `Death`, `Special`, `Victory` (opcional `Stun`).
2. Coloque em `public/models/` com os nomes de `visual/AssetManager.js` (`barbudo.glb`, `capitao.glb`, `careca.glb`, `dino.glb`, `tio_zap.glb`, ...).
3. Pronto. `CharacterFactory` detecta o arquivo e usa `GLBCharacterVisual`. `Unit.js`, `CombatSystem` e `Bot` não mudam.

## Teste automático (opcional)

`test/run.mjs` roda bot vs bot no Chromium headless e verifica erros de console + fim de partida. Requer `npm i -D playwright` (removido do package.json de propósito para manter o `npm install` leve).
