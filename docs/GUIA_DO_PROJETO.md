# GUIA DO PROJETO — REPÚBLICA DO CAOS: Batalha pelo Planalto

Documento de contexto para quem entra no projeto (Philipe pelo celular, ou uma nova sessão do Claude). Explica o que é o jogo, o que já existe, como foi construído, como testar e como continuamos.

Última atualização: 04/09/2026 — vertical slice v0.1 entregue.

---

## 1. O que é o jogo

Sátira cartunesca da política brasileira, em 3D, rodando direto no navegador (Chrome/Edge desktop). Gênero "lane battler" (referência de gameplay: Castle Crush, sem copiar nada dele):

- batalha em tempo real, 3 lanes, duas bases (SEDE DO PODER, 5000 HP cada);
- cartas com custo em **Capital Político** (0–10, regenera 1 ponto a cada 1,5 s);
- tropas automáticas (o jogador não controla os bonecos, só escolhe carta + lane);
- unidades melee, ranged e support, com passivas e especiais;
- poderes instantâneos; bot adversário; partida de 3 minutos com TRETA FINAL.

Personagens são **paródias fictícias de arquétipos** (Barbudo, Capitão, Careca da Caneta, Dino, Tio do Zap, Assessor, Influencer, Militantes). Nenhum retrato realista, nenhum sangue, nenhuma cor política fixa.

## 2. Estado atual (o que já funciona)

Tudo abaixo foi testado numa partida completa bot vs bot no Chromium headless, sem erros no console, terminando em vitória.

| Área | Status |
|---|---|
| Arena PRAÇA DO CAOS (lanes, jardins, prédios fictícios, postes, cones, carros, palanques, placas, papéis, bandeiras) | ✅ |
| Bases com 4 estágios de dano + CRISE INSTITUCIONAL (peças voando) | ✅ |
| 8 unidades procedurais com passivas/especiais | ✅ |
| 4 poderes: Canetada, Motociata, Recesso, Pesquisa | ✅ |
| Deck (8) / mão (4) / próxima carta / montador de deck no menu | ✅ |
| Capital Político, HUD, cronômetro, TRETA FINAL, telas de vitória/derrota, restart | ✅ |
| Bot ajustável (defesa, ataque, aleatoriedade) | ✅ |
| Feel: antecipação, avanço, flash, partículas, floating damage, knockback, hit-stop, camera shake, mortes exageradas, memes | ✅ |
| Barras de vida em InstancedMesh (zero DOM por unidade) | ✅ |
| Sons placeholder sintetizados (WebAudio) | ✅ |
| lil-gui completo (tecla G) + COPIAR CONFIG + modo debug | ✅ |
| Arquitetura pronta para trocar bonecos por GLB do Blender | ✅ |
| Balanceamento fino | ⏳ (números são um chute razoável) |
| Ultimate DECISÃO MONOCRÁTICA do Careca | ⏳ não implementado |
| InstancedMesh para hordas / otimização de draw calls | ⏳ |
| Sons reais, bloom/post-processing | ⏳ |
| Personagens definitivos no Blender | ⏳ (fase seguinte) |

## 3. Como rodar e testar

```bash
npm install
npm run dev          # abre em http://localhost:5173
npm run build        # gera dist/
npm run standalone   # gera standalone/index.html (arquivo único, abre com duplo clique)
```

Parâmetros de URL úteis: `?autostart=1` (pula menu), `?auto=1` (bot joga por você), `?speed=4`, `?debug=1`.

Controles: clique na carta (ou teclas 1–4) → clique na lane. RECESSO joga direto. Botão direito/Esc cancela. **G** abre o painel de ajustes.

Teste automático (requer `npm i -D playwright`, removido do package.json de propósito):

```bash
node test/run.mjs        # bot vs bot em velocidade alta; imprime RESULT e ERRORS
node test/screens.mjs    # menu, deck, jogada manual, vitória, derrota, restart
node test/shot.mjs '{"camera":{"cameraY":40}}' out.png 5   # screenshot com overrides de Config
```

## 4. Arquitetura (o mapa)

```
src/
  main.js                     entrada; expõe window.game e window.Config para debug
  config/Config.js            TODOS os números ajustáveis (lil-gui edita este objeto)
  config/Cards.js             definição das cartas (troop/power, custo vem do Config)
  core/Game.js                loop, partida, hit-stop, slow-mo, TRETA FINAL, vitória/derrota
  core/EventBus.js            eventos: unitDied, unitHit, baseHit, baseDestroyed, cardPlayed...
  core/Assets.js              geometrias/materiais compartilhados + texturas de texto (placas)
  scene/SceneSetup.js         renderer, luzes, fog, câmera
  scene/CameraController.js   posição via Config + camera shake + zoom punch
  scene/Arena.js              PRAÇA DO CAOS; laneX(i), spawnZ(team), baseFront, highlights de lane
  scene/Base.js               SEDE DO PODER: HP, estágios de dano, destruição; implementa interface de alvo
  units/Unit.js               LÓGICA da unidade: estados, alvo, ataque, buffs, stun, recesso, knockback
  units/UnitBehaviors.js      passivas/especiais por tipo (hooks onSpawn/onUpdate/onHit/onDamaged/trySpecial)
  units/UnitManager.js        spawn (formação em V para hordas), listas por lane/time, update, limpeza
  visual/CharacterVisual.js   INTERFACE: playIdle/Walk/Attack/Hit/Death/Special/Victory/Stun, setFacing, transform, dispose
  visual/ProceduralCharacter.js         boneco de primitivas + animações procedurais (rotação/translação de grupos)
  visual/ProceduralCharacterVisual.js   adapter procedural → CharacterVisual
  visual/GLBCharacterVisual.js          adapter GLB + AnimationMixer (pronto, não usado ainda)
  visual/CharacterFactory.js  spec caricata de cada personagem; escolhe GLB se existir, senão procedural
  visual/AssetManager.js      tenta carregar public/models/*.glb em segundo plano; falha = silenciosa
  cards/Deck.js               deck circular (8) e mão (4)
  cards/PlayerController.js   Capital Político + jogar carta (usado pelo humano E pelo bot)
  cards/Powers.js             Canetada, Motociata (motos), Recesso, Pesquisa
  ai/Bot.js                   decisão por lane: ameaça → defender; lane vazia → atacar; aleatoriedade
  effects/ParticleManager.js  1 InstancedMesh: cubos, papéis, fumaça + anéis expansivos
  effects/FloatingTextManager.js  sprites com pool (dano, SUSPENSO!) + meme de tela (1 DOM)
  effects/ProjectileManager.js    projéteis com pool (zap = balão de mensagem, like = coração)
  effects/HealthBarManager.js     2 InstancedMeshes billboard (fundo + preenchimento colorido)
  audio/AudioManager.js       sons sintetizados; load(name,url) preparado para samples reais
  ui/HUD.js, CardUI.js, Screens.js, ui.css
  debug/DebugPanel.js (lil-gui), DebugDraw.js (ranges, alvos, spawn points, stats, decisões do bot)
```

### Coordenadas do campo
- Eixo principal é **Z**. Base do jogador em z = +20 (embaixo da tela), base do bot em z = −20.
- Jogador avança para −z (`dir = −1`), bot para +z (`dir = +1`).
- Lanes em x = −6 / 0 / +6 (`laneSpacing`), largura 4. Sem navmesh: a unidade só anda em z e volta suavemente ao seu offset lateral.
- `arena.baseFront` é a face da base voltada ao campo; a unidade ataca a base quando `|z − baseFront| ≤ attackRange`.

### Fluxo da unidade
`SPAWNING → MOVING → (encontra inimigo na mesma lane à frente) → TARGETING → ATTACKING → ... → chega à base → ATTACK BASE`. Estados extras: `SPECIAL`, `HIT` (stun), `DEAD`. Recesso e stun são timers que congelam o update.

Ataque = `windup` (antecipação, visual inclina pra trás) → impacto (dano aplicado em `attackWindup`) → recuperação. Ranged spawna projétil que persegue o alvo; o dano só entra na chegada.

### Interface de alvo
Unidades e Bases compartilham: `alive`, `pos`, `hitPoint`, `radius`, `isBase`, `takeDamage(amount, source, opts)`. Assim o mesmo código de ataque serve para os dois.

### Passivas e especiais (UnitBehaviors.js)
- Assessor: aura +15% velocidade/ritmo (raio 4.5). Ao apanhar, papéis voam.
- Influencer: cada morte a ≤5 u dá +1 ENGAJAMENTO (+25% dano, máx 4, 6 s). No máximo → meme VIRALIZOU!
- Barbudo: COMPANHEIRADA (aura em unidades pequenas). DISCURSO a cada 10 s: anel + buff 30% por 5 s.
- Capitão: CERCADINHO (+8% dano por aliado próximo, máx 5). MOTOCIATA a cada 12 s na própria lane.
- Careca: golpe lento e forte. SUSPENSO a cada 9 s: stun de 2,5 s no alvo.
- Dino: a 50% HP → MODO JURÁSSICO (`visual.transform('jurassic')`: cauda, crista, dentes, bracinhos, escala 1.35; dano ×1.8, knockback ×2.2, velocidade ×0.7).
- Tio do Zap: 12% de chance de "ENCAMINHADA MUITAS VEZES" ao disparar.

### Regras de partida (Game.js)
3 min. Ao zerar: TRETA FINAL — capital regenera 2×, dano nas bases sobe 2%/s, máximo 60 s de overtime; depois vence quem tiver mais HP na base. Vitória = slow-mo + shake + zoom + explosão + comemoração, depois tela.

## 5. Como o vertical slice foi construído (método)

Ordem seguida (a mesma do briefing): projeto/cena/arena/lanes/bases/lil-gui → personagem procedural + combate → cartas/capital/HUD → bot + partida completa → 8 unidades → 4 poderes → polimento → COPIAR CONFIG.

Método de trabalho que deu certo e deve continuar:

1. **Escrever o arquivo de verdade**, nunca código teórico. Um sistema por arquivo, nomes explícitos.
2. **Buildar e rodar sempre** (`npm run build` + teste headless). Erro no console é bug bloqueante — o primeiro bug encontrado foi exatamente assim (Base sem `isBase`, unidade quebrava ao mirar a base).
3. **Screenshot para decisões visuais** (câmera, escala dos bonecos, barras de vida). A câmera atual (pos 0/38/44, alvo 0/0/3, fov 38) foi escolhida olhando capturas, não chutando.
4. **Números só no Config.** Se precisar de um valor novo, cria no `Config.js` e ele aparece no lil-gui automaticamente (`DebugPanel` percorre `Config.units` e `Config.powers`).
5. **Visual nunca vaza pra lógica.** Qualquer coisa que o boneco precise fazer entra como método da interface `CharacterVisual`, implementado no procedural e no GLB.
6. **Pooling em tudo que nasce e morre rápido** (partículas, projéteis, floating text, motos, canetas). Personagens não são pooled (são poucos e têm materiais clonados para o flash individual).
7. **Um commit por feature**, mensagem em português.

Decisões técnicas que valem lembrar:
- Materiais dos bonecos são **clonados por personagem** (para flash de dano individual) e não são "disposed" ao morrer, para não recompilar shader a cada spawn.
- Barras de vida: `fill` precisa ser `transparent: true` como o `bg`, senão a ordem de render engole o preenchimento (bug já corrigido).
- Hit-stop congela `dt` das unidades (visual roda a 5%), câmera continua.
- ~900 draw calls com 30 unidades. OK para GPU de desktop; se hordas crescerem, ir para InstancedMesh nos militantes.
- Fontes: Bangers (display) + Nunito (UI) via Google Fonts, com fallback. Sem internet elas caem no fallback, o jogo continua.

## 6. Como trabalhamos (para o Claude no celular)

- Philipe acompanha via **mobile** e conecta o Claude pelo celular. Ele quer respostas **curtas, diretas, em português casual**. Nada de relatório gigante; se precisar de detalhe, apontar para este guia.
- Toda mudança: editar arquivos na pasta do projeto, `npm run build`, rodar o teste headless quando possível, commit local. **Push é do Philipe** (`git push -u origin main`) — o ambiente não tem credencial do GitHub.
- Remote: `https://github.com/Philipe91/REPUBLICADOCAOS3D.git` (branch `main`).
- Quando ele pedir "abre pra mim": o dev server local não é alcançável de fora; usar `npm run standalone` e abrir `standalone/index.html`, ou publicar como artefato.
- Para ver como está sem rodar nada: `test/shot.mjs` gera screenshot com overrides de Config.
- Balanceamento: ele ajusta no lil-gui em jogo, aperta COPIAR CONFIG e cola o JSON; o Claude aplica em `Config.js`.

## 7. Próximos passos sugeridos

1. Jogar 5–10 partidas e balancear pelo lil-gui (custos, HP, dano, regen do bot).
2. Ultimate do Careca (DECISÃO MONOCRÁTICA — papel gigante cai no campo).
3. InstancedMesh para militantes; medir FPS com `?debug=1`.
4. Sons reais via `AudioManager.load()`; bloom opcional.
5. Personagens no Blender: exportar GLB com clipes `Idle, Walk, Attack, Hit, Death, Special, Victory` para `public/models/<nome>.glb`. `CharacterFactory` troca automaticamente.
6. Mais cartas só depois que o núcleo estiver divertido.
