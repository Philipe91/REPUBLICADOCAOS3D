# PLANO — REPÚBLICA DO CAOS · Fase "Game Feel"
(Chief Architect, 2026-09-04)

## 1. Objetivo geral
Transformar o vertical slice num jogo agradável de jogar, assistir e gravar: feedback imediato, leitura clara, personalidade por personagem, especiais espetaculares e curtos. Zero reestruturação de sistemas que funcionam; zero conteúdo novo.

## 2. Arquitetura proposta (decisões)

**Princípio-mestre:** sistemas de jogo emitem eventos; sistemas de apresentação (câmera, partículas, áudio, memes, tempo) apenas escutam. Nunca o inverso. Nenhum sistema de apresentação altera estado de jogo.

**(a) ChaosScore e memes — dois módulos novos, pequenos**
- `core/ChaosScore.js` (~60 LOC, sem Three.js): escuta o bus, acumula pontos por evento (peso em `Config.chaos`), decai por segundo, emite `chaosSpike {level}` ao cruzar `chaosThreshold`. Exposto em `game.chaos.value` para debug.
- `effects/MemeDirector.js` (~80 LOC): escuta bus + `chaosSpike`, aplica cooldown global (`memeCooldown`) e probabilidade (`memeFrequency`), chama `FloatingTextManager.showScreenMeme(text)`. FloatingTextManager continua sendo só renderizador. Regras de meme = tabela declarativa `{evento, condição, texto, prioridade}`.

**(b) Dano no frame de impacto sem quebrar CharacterVisual**
- Interface ganha um parâmetro opcional: `playAttack(strength, onImpact)`. O visual chama `onImpact()` no frame de impacto; Unit.js aplica dano/spawna projétil somente nesse callback.
- Unit: `ATTACK` vira `ATTACK_WINDUP → (impact) → ATTACK_RECOVER`. Alvo é revalidado no callback (morreu/saiu de alcance → golpe no vazio, sem dano).
- Fallback obrigatório: se o callback não vier em `Config.combat.impactTimeout` (ex.: 0,6 s), Unit aplica o dano assim mesmo. Garante GLB futuro sem marcadores e nunca trava combate.
- Timing do impacto pertence ao visual (spec em CharacterFactory: `attackWindup`, `attackImpactAt`), não à Unit. Adapter GLB futuro mapeia marcador de clip → mesmo callback.
- Cooldown de ataque ≥ windup + recover (validar em Config, warn no console se violado).

**(c) Hit-stop / slow motion — `core/TimeController.js` (~50 LOC)**
- Game passa a ter `rawDt` (relógio real) e `gameDt = rawDt × speedParam × tretaMultiplier × timeController.scale`.
- TimeController: lista de efeitos `{scale, remaining}`; escala efetiva = mínimo entre ativos; `hitStop(ms)` e `slowMo(scale, ms)`. Ignora novo hit-stop enquanto um está ativo. Cap total por segundo.
- Escuta o bus (`powerImpact`, `baseDestroyed`, `attackImpact strength=heavy`); ninguém chama direto.
- Usam `rawDt`: câmera (shake), UI, partículas de tela, áudio. Usam `gameDt`: units, projéteis, bot, Capital, timers de partida, partículas de mundo. Input de cartas nunca é bloqueado pelo hit-stop.

**(d) Personalidade e mortes sem inflar ProceduralCharacter.js**
Extração para pasta `visual/procedural/`, animações como funções puras `(rig, t, params)`:
- `ProceduralCharacter.js` — só rig, blend de estados, dispatch (meta ≤ 450 LOC após extração).
- `Animations.js` — idle/walk/attack/hit genéricos parametrizados.
- `Deaths.js` — 5 variações; tabela `força → variações candidatas`.
- `Gestures.js` — recesso (celular, sentar, coçar, café, bocejo), poses, olhar para os lados.
- `Profiles.js` — dados apenas, por personagem: `tempo, bob, armSwing, rigidity, windup, gestures[], deathBias`. CharacterFactory mescla no spec.
- Limite: nenhum arquivo novo > 350 LOC; personalidade = variação de parâmetros, não código novo por personagem (salvo Dino/Jurássico e gestos específicos).

**(e) Novos eventos no EventBus** (payload mínimo, nomes fixos):
`attackImpact {attacker, target, strength}` · `unitKnockback {unit, force}` · `specialStart/specialEnd {unit, type}` · `powerStart/powerImpact {power, lane, team, position}` · `baseCritical {team}` · `tretaFinal` · `chaosSpike {level}` · `capitalFull {team}` · `engagementGain {unit, level}` · `stressTest {count}`.
`strength` é enum: `light | medium | heavy | special`, calculado em Unit por `dano / Config.combat.strengthThresholds`.

**Outros pontos fixos**
- Ring de time: 3º InstancedMesh dentro de HealthBarManager; não criar DOM. Zero draw call por unidade.
- Câmera: CameraController escuta eventos e aplica impulsos (zoom/offset/shake) com decaimento; todos os valores em `Config.camera`. Câmera estratégica é o estado de repouso; impulsos máx. 400 ms.
- Perf stats: `debug/PerfStats.js`, só com `?debug=1`, lê `renderer.info` (calls, triangles) + FPS + activeUnits/Particles no lil-gui.

## 3. Etapas (ordem de execução)

**E1 — Fundação técnica**
- Objetivo: Config novas chaves (item 18) + TimeController + PerfStats + Stress Test (10/20/30/50 + LIMPAR) + constantes de eventos novos (documentadas em EventBus.js).
- Arquivos: Config.js, Game.js, core/TimeController.js (novo), debug/PerfStats.js (novo), DebugPanel.js, UnitManager.js (spawn em massa), EventBus.js.
- Pronto: run.mjs passa; stress 50 sem erro de console e FPS/draw calls registrados; COPIAR CONFIG inclui chaves novas; `?speed=N` continua funcionando; hit-stop chamado manualmente (botão debug) congela unidades mas não a UI.
- Riscos: misturar rawDt/gameDt (listar quem usa qual no relatório).

**E2 — Extração procedural (refactor mecânico, comportamento idêntico)**
- Objetivo: criar `visual/procedural/{Animations,Deaths,Gestures,Profiles}.js`; Deaths com 1 variação (a atual), Profiles vazio/default.
- Arquivos: ProceduralCharacter.js, novos acima, CharacterFactory.js, ProceduralCharacterVisual.js.
- Dependências: E1.
- Pronto: screenshots antes/depois visualmente iguais (shot.mjs); run.mjs passa; ProceduralCharacter ≤ 450 LOC; interface CharacterVisual inalterada.
- Riscos: regressão silenciosa de animação — exigir screenshots comparadas.

**E3 — UX Player vs Bot (itens 1, 17)**
- Objetivo: cartas clicáveis com hover/escala/sombra/glow; "Capital insuficiente" visível; cancelamento (ESC/clique fora/botão direito); highlight de lane no hover; entrada de carta nova rápida; Capital com pulso discreto; cooldown visível.
- Arquivos: CardUI.js, HUD.js, ui.css, PlayerController.js, Arena.js.
- Dependências: E1. Pode correr em paralelo com E2.
- Pronto: novo `test/player.mjs` (playwright): seleciona carta → clica lane → unidade spawna na lane certa; carta sem Capital → recusa visível; cancela seleção. Screenshots dos 4 estados de carta. Sem erro de console. Latência clique→spawn < 100 ms.
- Riscos: overlay de UI capturando cliques do 3D; z-index.

**E4 — Identidade de time + Spawn (itens 2, 4)**
- Objetivo: ring sob unidade por time (instanced), detalhes de cor (acessório/faixa, nunca corpo inteiro), barras HP coerentes; spawn = círculo + flash + fumaça + nome < 1 s; entradas especiais por custo (Barbudo público, Capitão flash+som, Careca carimbo, Dino impacto) escaladas por `spawnEffectScale`.
- Arquivos: HealthBarManager.js, CharacterFactory.js, UnitManager.js, ParticleManager.js, AudioManager.js, FloatingTextManager.js.
- Dependências: E2.
- Pronto: screenshot com 2 times distinguíveis a distância; unidade já se move/combate durante a entrada; stress 50 sem aumento de draw calls por unidade (delta ≤ 3 calls vs E1).
- Riscos: spawn bloqueando movimento; poluição visual com horda (militante = spawn mínimo).

**E5 — Impacto sincronizado, hit reaction, mortes (itens 5, 6, 7)**
- Objetivo: callback `onImpact`; estados WINDUP/RECOVER; fallback timeout; `strength`; reações por força (recuo / recuo+flash `hitFlashDuration` / knockback+partículas+shake); projéteis com spawn e impacto visíveis; 5 mortes procedurais por força, pequenos voam mais (`deathKnockbackMultiplier`).
- Arquivos: Unit.js, CharacterVisual.js, ProceduralCharacterVisual.js, GLBCharacterVisual.js (stub), Animations.js, Deaths.js, ProjectileManager.js, ParticleManager.js, CameraController.js, Config.js.
- Dependências: E2.
- Pronto: teste automatizado registra `attackImpact` e `unitDamaged` no mesmo frame em ≥ 50 amostras; fallback testado forçando visual sem callback; run.mjs passa; DPS efetivo por unidade dentro de ±10 % do anterior (ou ajuste consciente relatado); ataque comum não gera shake; screenshots de 5 mortes.
- Riscos: maior da fase — alvo morrer no windup, dobrar dano no fallback, alterar balanceamento. Exigir contagem de danos por ataque = 1.

**E6 — Personalidade por personagem (item 3)**
- Objetivo: preencher `Profiles.js` para os 9 tipos + gestos idle específicos (Barbudo microfone, Tiozap celular, Assessor papéis, Influencer pose, Capitão rígido, Careca pesado, Militantes com seed de variação).
- Arquivos: Profiles.js, Gestures.js, Animations.js, CharacterFactory.js.
- Dependências: E5.
- Pronto: screenshots idle/walk/attack por personagem; militantes de uma mesma horda visivelmente não sincronizados; run.mjs passa; nenhum arquivo > 350 LOC.
- Riscos: inflar código com casos especiais — recusar se Profiles deixar de ser dados.

**E7 — Especiais de unidade (item 11 + SUSPENSO/Engajamento/CERCADINHO)**
- Objetivo: MODO JURÁSSICO (para, câmera `specialCameraZoom`, silhueta cresce, cauda/dentes, som grave, texto, retoma; total ≤ 1,2 s); SUSPENSO com antecipação enorme + impacto + texto; Engajamento com animação; eventos `specialStart/End`.
- Arquivos: UnitBehaviors.js, ProceduralCharacter.js/Animations.js, CameraController.js, AudioManager.js, FloatingTextManager.js.
- Dependências: E5, E6.
- Pronto: sequência de 4 screenshots do Jurássico; duração medida; Dino invulnerável ou não durante transformação definido em Config e relatado; run.mjs passa.
- Riscos: cutscene longa; câmera atrapalhando cartas (zoom ≤ Config, sempre reversível).

**E8 — CANETADA (item 8)**
- Objetivo: sequência aviso→sombra→caneta→impacto→onda→papéis→knockback→texto→shake→hit-stop, ≤ 1,5 s total. Dano no `powerImpact`.
- Arquivos: Powers.js, ParticleManager.js, TimeController (só escuta), CameraController.js, AudioManager.js, Assets.js (geometria da caneta).
- Dependências: E5, E1.
- Pronto: dano aplicado no frame do impacto; hit-stop ≤ 80 ms; sequência cronometrada; screenshots de 3 fases.
- Riscos: aviso no chão invisível (deve durar ≥ 400 ms e ser legível).

**E9 — MOTOCIATA + RECESSO (itens 9, 10)**
- Objetivo: Motociata com som crescendo, motos atravessando, fumaça/rastro/empurrão/shake sem bloquear leitura; Recesso com texto, gestos aleatórios de `Gestures.js`, sinal sonoro no fim, retomada.
- Arquivos: Powers.js, Gestures.js, ParticleManager.js, AudioManager.js, Unit.js (estado PAUSED já existe — só trocar animação).
- Dependências: E6, E8.
- Pronto: screenshots; unidades retomam ataque sem alvo perdido após Recesso; partículas não cobrem barras de HP; run.mjs passa.

**E10 — Base, câmera e TRETA FINAL (itens 14, 15, 16)**
- Objetivo: reações da base por força; crítico = mais caos; destruição = slow-mo curto + peças voando + shake + vencedores `playVictory`; movimento cinematográfico curto; TRETA FINAL = escurecer, alerta, texto, Capital 2x, `tretaFinalSpeedMultiplier`, intensidade sonora.
- Arquivos: Base.js, CameraController.js, SceneSetup.js, Game.js, HUD.js, AudioManager.js.
- Dependências: E1, E5.
- Pronto: run.mjs bot vs bot termina em 100 % de 5 execuções (incluindo com Treta Final); destruição sem erro; slow-mo ≤ 600 ms; UI clicável durante tudo.
- Riscos: partida sem fim (empate) — definir regra de desempate em Config e relatar.

**E11 — ChaosScore + Memes + intensidade sonora (itens 12, 13)**
- Objetivo: módulos de (a); tabela de memes; `chaosSpike` modulando levemente câmera/partículas; áudio escuta `chaosSpike`/`tretaFinal`.
- Arquivos: core/ChaosScore.js, effects/MemeDirector.js (novos), Game.js, CameraController.js, AudioManager.js, Config.js.
- Dependências: E5–E10.
- Pronto: log de memes em partida bot vs bot mostra cooldown respeitado; ChaosScore visível só no debug; memes não sobrepõem texto de poder.

**E12 — Balanceamento e finalização (itens 21, 23)**
- Objetivo: ajustar valores (só Config) para "FUN primeiro"; validação final.
- Arquivos: Config.js apenas.
- Pronto: 1 partida completa Player vs Bot via `test/player.mjs` + 1 manual descrita; stress 50 com FPS ≥ 50 e draw calls relatados; console limpo; tabela final de valores alterados com justificativa; se draw calls > alvo, registrar InstancedMesh como próximo passo (não fazer).

## 4. O que NÃO deve ser feito
- Novos políticos, arenas, multiplayer, login, servidor, Blender/GLB real, skins, progressão, loja.
- Mudar assinatura de CharacterVisual além de `onImpact`.
- Sistemas de apresentação alterando estado de jogo; sistemas de jogo chamando câmera/áudio direto.
- DOM por unidade; otimizações prematuras; frameworks novos; reescrever ProceduralCharacter.
- Cutscenes > 1,5 s; shake em ataques comuns; efeitos que atrasem spawn ou bloqueiem cartas.
- Valores hardcoded fora de Config.

## 5. Riscos conhecidos
1. Dessincronia dano/impacto (E5) — teste de mesmo frame + fallback.
2. Balanceamento deslocado por windup — medir DPS antes/depois.
3. Poluição visual com hordas — militante = efeitos mínimos; memes com cooldown.
4. Draw calls com rings/partículas — tudo instanced; medir no E1 e E4.
5. Partida sem fim na Treta — regra de desempate.
6. Regressão silenciosa no refactor E2 — screenshots comparadas.
7. Inflação de código por personagem — Profiles como dados, limite de LOC.

## 6. Ordem
E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9 → E10 → E11 → E12. E3 pode correr em paralelo com E2. Um commit por etapa.

## 7. Formato do relatório de entrega (máx. 30 linhas)
```
ETAPA: En — título
RESUMO: 3 linhas
ARQUIVOS: lista com LOC delta
TESTES: comandos rodados + resultado
CRITÉRIOS: checklist ✔/✘ item a item
MÉTRICAS: FPS, draw calls, triangles (quando aplicável)
RISCOS/PENDÊNCIAS: bullets
DECISÕES TOMADAS FORA DO PLANO: bullets (ou "nenhuma")
```
