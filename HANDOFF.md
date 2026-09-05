# HANDOFF — continuar o projeto em outra máquina / nova conversa

Atualizado em 04/09/2026 (PC de casa, após câmera lateral + E1..E12 + ELENCO 2 + piloto Blender). Leia isto primeiro, depois `CLAUDE.md`, depois `docs/GUIA_DO_PROJETO.md`, depois `docs/PLANO-GAME-FEEL.md`.

---

## 1. Onde o projeto está

- Repositório: https://github.com/Philipe91/REPUBLICADOCAOS3D.git, branch `main`.
- Commits até agora (todos já no GitHub):
  1. `ea143be` — vertical slice jogável (Three.js + Vite + lil-gui).
  2. `586d99b` — `CLAUDE.md` + `docs/GUIA_DO_PROJETO.md`.
  3. `90a8a23` — `docs/PLANO-GAME-FEEL.md` (plano da fase atual).
  4. este commit — `HANDOFF.md`.
- **Nenhuma linha de código de jogo foi alterada nesta sessão.** Só documentação. O vertical slice está exatamente como foi aprovado.

## 2. Armadilha do diretório (importante)

No PC do trabalho a raiz do git é a pasta `REPUBLIC CRUSH`. Dentro dela existe `Claude outputs/republica/`, uma cópia idêntica do código que está no `.gitignore` e **não entra em commit**. Uma sessão foi aberta lá por engano e quase commitou no lugar errado. No clone de casa isso não existe (pasta ignorada não é clonada), mas a regra fica: sempre trabalhar na raiz do repositório, onde estão `package.json`, `src/`, `CLAUDE.md`.

## 3. Como rodar no PC de casa

```bash
git clone https://github.com/Philipe91/REPUBLICADOCAOS3D.git
cd REPUBLICADOCAOS3D
npm install
npm run dev          # abre http://localhost:5173
```

Teste automático (opcional, bot vs bot no Chromium headless):

```bash
npm i -D playwright
npx playwright install chromium
node test/run.mjs    # esperado: RESULT: victory|defeat e ERRORS: none
```

Parâmetros de URL úteis: `?autostart=1`, `?auto=1` (bot joga pelo player), `?speed=4`, `?debug=1`. Tecla **G** abre o lil-gui.

## 4. O que foi decidido nesta sessão

1. **Vertical slice aprovado** pelo Philipe.
2. **Nova fase: "Game Feel".** Objetivo: deixar UMA partida extremamente divertida de jogar, assistir e gravar. Sem novos personagens, arenas, multiplayer, login, servidor, Blender, skins, progressão ou loja.
3. O Philipe passou uma especificação de 23 itens (player vs bot, identidade de time, personalidade procedural, spawn, dano no frame de impacto, hit reaction, mortes variadas, Canetada, Motociata, Recesso, Modo Jurássico, memes contextuais, ChaosScore, câmera, base, Treta Final, UI, lil-gui, perf stats, stress test, balanceamento "FUN primeiro", finalização com partida completa). Tudo isso está condensado no plano.
4. O **Chief Architect** (skill `/fableboss`, subagente modelo `fable`) transformou a spec no plano de 12 etapas em `docs/PLANO-GAME-FEEL.md`.

## 5. Fluxo de trabalho combinado (skill /fableboss)

- O Claude da conversa é o **executor**: implementa, testa, valida.
- O **arquiteto** é um subagente (`Agent`, `model: "fable"`, `subagent_type: "general-purpose"`) que recebe só briefings curtos, nunca o projeto inteiro.
- Para cada etapa: implementar → rodar testes → montar relatório no formato da seção 7 do plano (máx. 30 linhas) → enviar ao arquiteto → ele responde APROVADO ou REPROVADO → commit (uma etapa por commit, mensagem em português).
- Se a skill `/fableboss` não existir na máquina de casa, o papel do arquiteto pode ser reproduzido num prompt simples: "Atue como Chief Architect, revise só o resumo abaixo e responda APROVADO ou REPROVADO com lista de correções". As decisões de arquitetura já tomadas estão na seção 2 do plano.

## 6. Estado da fase Game Feel

| Etapa | Status |
|---|---|
| Plano E1..E12 | ✅ escrito, commitado |
| Câmera lateral (pré-E1, pedido do Philipe em 04/09) | ✅ implementada e commitada — aguarda aprovação VISUAL do Philipe |
| Aprovação do plano pelo Philipe | ⏳ pendente (ele viu o resumo, ainda não disse "aprovado") |
| E1 Fundação técnica (TimeController, PerfStats, Stress Test, chaves lil-gui) | ✅ concluída e commitada (04/09, PC de casa) |
| E2 Extração procedural (visual/procedural/) | ✅ concluída e commitada (04/09, PC de casa) |
| E3 UX Player vs Bot | ✅ concluída e commitada (04/09, PC de casa) |
| E4 Identidade de time + spawn | ✅ concluída e commitada (05/09, PC de casa) |
| E5 Impacto sincronizado, hit reaction, mortes | ✅ concluída e commitada (05/09, PC de casa) |
| E6 Personalidade por personagem | ✅ concluída e commitada (05/09, PC de casa) |
| E7 Especiais (Jurássico, Suspenso, Engajamento) | ✅ concluída e commitada (05/09, PC de casa) |
| E8 CANETADA completa | ✅ concluída e commitada (05/09, PC de casa) |
| E9 MOTOCIATA + RECESSO | ✅ concluída e commitada (05/09, PC de casa) |
| E10 Base, câmera e TRETA FINAL | ✅ concluída e commitada (05/09, PC de casa) |
| E11 ChaosScore + memes contextuais | ✅ concluída e commitada (05/09, PC de casa) |
| E12 Balanceamento e finalização | ✅ concluída e commitada (05/09, PC de casa) — falta o playtest MANUAL do Philipe |

**Câmera lateral (04/09, PC de casa):** a lógica do jogo NÃO mudou (eixo Z, lanes em x). A câmera fica no lado +X olhando para −X: base do jogador à esquerda, bot à direita, lanes em profundidade. `Config.camera` agora é `cameraSide/cameraDistance/cameraHeight/cameraSideOffset/cameraTarget*/cameraFov` (posição derivada em `CameraController.cameraPosition`). Decoração alta da Arena foi para o lado −X/além das bases. `visual.baseVisualScale` criada (1.0). Harness `test/*.mjs` portado para Windows (`executablePath` do playwright, `shell:true`, `VIEWPORT=`). Medido na RTX 3060: ~200 fps, 570–780 draw calls com 10–19 unidades.

**E1 (04/09, PC de casa) — plano e câmera aprovados pelo Philipe.**
- `core/TimeController.js`: única fonte de tempo. `update(rawDt)` → `gameDt` (unidades, bot, Capital, poderes, projéteis, cronômetro) e `visualDt` (bases, partículas; roda a `hitStopVisualRate` no hit-stop). UI/câmera/texto/perf usam `rawDt`. API: `hitStop(s, {force})` (só estende, orçamento `hitStopBudgetPerSecond`), `slowMotion(scale, hold, recovery)` (vários = menor scale, cada um expira), `setGameSpeed(v)` (escreve `Config.game.gameSpeed`), `reset()` (restart/menu). `Game.hitStop()` virou atalho; `finish()` usa `slowMotion` com `Config.time.matchEnd*`. `combat.hitStopDuration` = 0.045 (fica em `combat` porque Unit/Powers leem de lá).
- `debug/PerfStats.js`: fps/avg/min (janela `perf.perfSampleWindow`), frame ms, draw calls, tris, units/proj/part/txt. Overlay `#perf-overlay` com `perf.showPerfOverlay` ou `?debug=1`. `game.perf.snapshot()` = JSON do botão COPY PERF SNAPSHOT.
- `debug/StressTest.js`: `game.stress.run(n)` spawna n unidades reais (`debugSpawn=true`, times alternados, 3 lanes, fileiras a partir do spawn, sem Capital/cartas); `Base.takeDamage` ignora dano dessas unidades; `game.stress.clear()` remove só elas e limpa projéteis. lil-gui: pastas TIME / GAME FEEL (gameSpeed 0.25–3×, hit-stop, slow-mo, botões TEST HIT STOP / TEST SLOW MOTION / RESET TIME SCALE), PERFORMANCE, STRESS TEST 10/20/30/50/CLEAR.
- Testes: `node test/time.mjs` (8 testes puros do TimeController), `node test/stress.mjs` (bench headed com GPU), `run.mjs`, `screens.mjs`. Bench RTX 3060 @1600×900: 10 → 199 fps / 672 calls · 20 → 198 / 913 · 30 → 153 / 1204 · 50 → 103 fps (mín 53) / 1701 calls / 177k tris. Gargalo = draw calls por boneco (~30 por unidade): próximo passo de perf, quando necessário, é InstancedMesh para militantes (NÃO fazer antes de medir de novo na E4).

**E2 (04/09, PC de casa) — refactor neutro, aparência e timing iguais.**
- `src/visual/procedural/ProceduralRig.js`: SÓ o boneco (primitivas, materiais clonados, partes com pivô, pose de descanso, `transformJurassic`, `resetPose`, `setEmissive`). `ProceduralAnimations.js`: funções puras `(rig, tempo, params)` — idle/walk/attack/special/victory/stun/recesso/death/hitOverlay/secondary, fórmulas idênticas às antigas. `ProceduralAnimator.js`: estado (anim, tempos, variantes por instância, hit, flash) e a ordem por frame: resetPose → animação → hit sobreposto → flash → secundário. `ProceduralCharacterVisual.js` (adapter) mudou para essa pasta. `src/visual/ProceduralCharacter.js` e o adapter antigo foram removidos.
- `CharacterVisual.playAttack(windup, duration, { onImpact })`: callback OPCIONAL; procedural dispara em t ≥ windup, GLB por timeout = windup (ou marcador de clip no futuro). Unit.js NÃO passa callback ainda (E5) e não mudou. `playRecesso` entrou na interface.
- Validação: run.mjs, screens.mjs, e1.mjs (hit-stop, slow-mo, gameSpeed 2×, restart, stress 50) OK; capturas antes/depois em `test/shots/e2/` (lineup dos 8, combate, Jurássico) iguais; stress 30 → 161 fps / 1164 calls / 112k tris (E1: 153 / 1204 / 117k).

**E3 (04/09, PC de casa) — UX Player vs Bot.** Só `ui/CardUI.js`, `ui/HUD.js`, `ui/ui.css`, `index.html` (+ `Config.ui` e pasta UI / UX no lil-gui). Sem Capital: carta treme em vermelho, aviso "CAPITAL INSUFICIENTE · FALTA N" acima da mão (`#card-toast`), Capital pisca; carta bloqueada mostra barra de "quanto falta" (`--ready`) que enche com o regen. Hover na lane: destaque forte + hint com o nome (FRONTAL/CENTRAL/TRASEIRA conforme `cameraSide`) + cursor pointer/crosshair. Capital pulsa a cada ponto ganho. Cancela por ESC, botão direito, clique fora e clique na carta selecionada (já existia). `test/player.mjs` (headless) cobre tudo e mede latência clique→spawn (~20 ms); capturas dos estados em `test/shots/player/`.

**E4 (05/09, PC de casa) — identidade de time + spawn.** `HealthBarManager` ganhou um 3º InstancedMesh: anel de time no chão sob toda unidade viva (`visual.teamRingOpacity`), e o fundo da barra é tingido com a cor do time. `ProceduralRig` ganhou a braçadeira (`spec.teamBand`, 1 mesh, cor do time; militante não usa porque já veste a cor). `effects/SpawnEffects.js` (novo) só escuta `unitSpawned`: anel + flash + fumaça + nome flutuante em toda entrada, e entradas especiais (Barbudo papéis/anel dourado, Capitão flash/estilhaços, Careca carimbo escuro + shake, Dino terra + shake), tudo × `visual.spawnEffectScale`, < 1 s, sem tocar `Unit.spawnTime`. `UnitManager.spawn` perdeu os efeitos inline (só emite o evento). Sons novos: spawnHero, stamp, stomp. Testes: `test/e4.mjs`. Stress 50: 1688 draw calls (E1: 1701).

**E5 (05/09, PC de casa) — dano no frame de impacto.** `Unit._startAttack` passa `onImpact` ao visual; `Unit._impact()` aplica o dano UMA vez (guarda `attackHitDone`), revalida o alvo (morto/fora do alcance → golpe no vazio) e emite `attackImpact {attacker, target|null, strength, ranged}`. Fallback: se o visual não chamar, `_attackUpdate` chama `_impact()` em `windup + Config.combat.impactTimeout`. Força = enum `light|medium|heavy|special` por `mediumHitThreshold/bigHitThreshold`; knockback × 0.6 / 1.0 / 1.2. `unitDamaged` e `unitDied` carregam `strength`. Apresentação do dano saiu da Unit: `effects/HitEffects.js` (partículas, flash, recuo, shake e hit-stop SÓ em heavy, sons). Morte: `die(killer, strength)` dá empurrão extra (pequenos voam mais: `smallUnitDeathFlyMult`), `playDeath(strength)` escolhe entre 5 variações em `visual/procedural/Deaths.js` (tabela por força). Projéteis: faíscas no disparo e no impacto (`ProjectileManager(scene, particles)`). Testes: `test/e5.mjs` (mesmo frame ≥ 50 amostras, 1 dano por ataque, fallback, alvo morto no windup, cadência ±10%, shake só heavy, 5 mortes, ranged). Cadência de ataque inalterada; per-hit inalterado.

**E6 (05/09, PC de casa) — personalidade.** `visual/procedural/Profiles.js` = SÓ DADOS por tipo (`tempo, bob, armSwing, rigidity, lean, gesture, gestureEvery, gestureDuration, jitter`); `profileFor(type)` aplica jitter por instância (militantes da horda não sincronizam). `Gestures.js`: gestos de idle sobrepostos (shout, phone, papers, pose, mic, salute, pen, stretch) + poses de RECESSO (saíram de Animations). `ProceduralAnimations.idle/walk/attack` recebem o perfil (tempo/bob/armSwing/rigidity/lean); o TIMING do ataque continua vindo da Unit. `ProceduralAnimator` agenda o gesto no idle (`gestureEvery` com variação) e o encerra; `CharacterFactory` mescla `spec.profile = profileFor(type)`. Novo personagem = 1 linha em Profiles (+ 1 gesto se quiser). Teste: `test/e6.mjs`; capturas em `test/shots/e6/`.

**E7 (05/09, PC de casa) — especiais.** `Unit.startSpecial(kind, duration, {invulnerable, target})` emite `specialStart`; o fim do SPECIAL emite `specialEnd`; `takeDamage` ignora dano se `specialInvulnerable`. `effects/SpecialEffects.js` (novo) escuta esses eventos + `engagementGain`: Jurássico = burst/anel/texto/meme + shake + `camera.impulseZoom(specialCameraZoom)` (decai por `impulseDecay` ≈ 400 ms) + slow-mo curtíssimo (`time.specialSlow*`) + som `roar`; Suspenso = "SUSPENSO?" + som subindo + anel roxo no alvo + meme; Engajamento = texto/corações/VIRALIZOU. UnitBehaviors ficou só com lógica (dino: `jurassicDuration` 1.1 s e `jurassicInvulnerable` 1/0 em Config.units.dino — decisão: INVULNERÁVEL durante a transformação; influencer emite `engagementGain`; careca passa `target`). `window.bus` exposto para testes. Testes: `test/e7.mjs`; sequência em `test/shots/e7/`.

**E8 (05/09, PC de casa) — CANETADA.** `Powers.canetada` virou só lógica com fases: `warn` (`Config.powers.canetada.warnTime` 0,45 s, caneta invisível) → `fall` (`fallTime` 0,45 s) → impacto exato (`_penImpact`: dano em área `strength: 'special'` + base, emite `powerImpact {power, team, lane, position, radius, hits}`) → fincada 0,25 s → sobe e some (total 1,5 s). `powerStart` é emitido no uso. `effects/PowerEffects.js` (novo): marcador pulsante no chão durante o aviso (≥ 0,4 s legível), sombra crescendo sob a caneta na queda, e no impacto onda + tinta + dourado + papéis + texto + shake (`shake`) + hit-stop (`hitStop`, teto 80 ms) + sons; `update(visualDt)` chamado pelo Game; pools de marcador/sombra. Teste: `test/e8.mjs`; fases em `test/shots/e8/`. A geometria da caneta continua em Powers (não migrou para Assets.js).

**E9 (05/09, PC de casa) — MOTOCIATA + RECESSO.** `Powers.motociata` emite `powerStart` e, por atropelo, `powerImpact {target}` (dano `heavy`, 1 por moto/inimigo) e `powerImpact {base:true}` na chegada; fumaça/som/shake saíram para `PowerEffects` (ronco crescendo `motoRev`, shake `Config.powers.motociata.shake`, faíscas + `hitShake` por atropelo, fumaça baixa e marca de pneu por frame lendo `powers.motos`). `Powers.recesso` emite `powerStart {duration}` e `powerEnd` `endSignal` s antes do fim (sinal `recessoEnd` + "VOLTOU!"); o alvo não é perdido: ao descongelar a Unit volta a MOVING → re-checa → ataca o mesmo alvo. Recesso ganhou a variante 3 = gesto do perfil em loop (Gestures). Teste: `test/e9.mjs`; capturas em `test/shots/e9/`.

**E10 (05/09, PC de casa) — base, câmera e TRETA FINAL.** `Base.takeDamage(amount, source, {strength})` reage por força (light/medium/heavy: flash, wobble, entulho) e emite `baseHit {strength}`; ao entrar em ≤ 25% emite `baseCritical`. `effects/MatchEffects.js` (novo) escuta `baseCritical` (alarme + shake + meme + ticks a cada `Config.treta.alarmTickEvery`), `tretaFinal` (vinheta `body.treta` no CSS, luzes × `treta.lightMult`, alerta, som × `treta.audioIntensity` via `AudioManager.setIntensity`), `matchEnd` (slow-mo `time.matchEndSlow*` = 0,45 + 0,15 s ≤ 600 ms, shake, `camera.impulseZoom(endCameraZoom)` + `impulseOffset` curto para a base caída, meme, sons) e `matchStart/matchCleared` (reset). `Game.finish` ficou só com estado + comemoração; `updateMatchPhase` emite `tretaFinal` e põe `time.matchMultiplier = game.tretaFinalSpeedMultiplier` (1.25). Regra de desempate (já existia, agora documentada): `base_damage.tretaFinalMaxOvertime` = 60 s → vence quem tem mais HP na base (empate = jogador). `?dur=N` encurta a partida para testes. Teste: `test/e10.mjs` (headed): 5/5 partidas terminam com Treta e desempate, slow-mo ≈ 600 ms, câmera volta, restart limpa tudo. Observação para a E12: em bot vs bot o bot venceu 5/5 por HP no desempate — investigar viés antes do balanceamento.

**E11 (05/09, PC de casa) — ChaosScore + memes.** `core/ChaosScore.js` (sem Three): escuta o bus, soma pesos (`Config.chaos.weights`), decai `decayPerSecond` (tempo de jogo), emite `chaosSpike {level, value}` ao cruzar `thresholds` para cima (cooldown `spikeCooldown`); `game.chaos.value/level`, visível só no overlay de debug/perf. `effects/MemeDirector.js`: tabela declarativa `MEME_RULES` `{on, when, texts, color, priority, weight}`; cooldown `Config.memes.cooldown ÷ visual.memeFrequency`, chance × peso, nunca por cima de meme forçado na tela, candidato espera até `memes.maxWait`, meme de ambiente a cada `idleEvery`; `memeFrequency 0` desliga. Os memes aleatórios e o "TRETA!" por dano saíram do Game. `MatchEffects` escuta `chaosSpike` (shake `chaos.cameraShakePerLevel` × nível, som +`audioBoostPerLevel` × nível fora da Treta). `PlayerController` emite `capitalFull`. Teste: `test/e11.mjs`.

**E12 (05/09, PC de casa) — balanceamento + validação.** `test/e12.mjs` (headed; aceita overrides de Config e `quick`): (A) partidas ESPELHADAS com o mesmo deck → 3/6, sem viés estrutural; (B) decks padrão → com Motociata 70 o deck do bot (Dino + Motociata) vencia 6/6 e 8/8 (base do bot ~intacta); Dino mais fraco + Barbudo mais forte não mudou nada (0/8); Canetada mais forte sozinha 1/8; **Motociata é o desequilíbrio**: dano 30 → 3/8, 40 → 4/8 e 2/6, 45 → 1/8. Única mudança de Config da E12: `powers.motociata.damage` 70 → **40** (vale para a carta e para o especial do Capitão). (C) stress 50: 120 fps médio, mínimo 39, **1445 draw calls**, 140k tris, 42 unidades. (D) partida completa auto vs bot (180 s) termina sem erro a 143 fps. Playtest manual: NÃO feito (sessão autônoma) — fica para o Philipe.

**Valores de Config alterados na fase (E1–E12), com motivo:**
- `combat.hitStopDuration` 0.06 → 0.045 (E1, pedido); `combat.mediumHitThreshold` 25, `impactTimeout` 0.15, `hitFlashDuration` 0.08, `deathKnockbackMultiplier` 1.0, `smallUnitDeathFlyMult` 1.6 (E5, novos); knockback por força × 0.6 / 1.0 / 1.2 (E5).
- `time.*` (E1/E7/E10, novos): hit-stop budget 0.3/s, slow-mo 0.35/0.25/0.15, especial 0.45/0.2/0.15, fim de partida 0.25/0.45/0.15 (≤ 600 ms).
- `camera.specialCameraZoom` 5, `impulseDecay` 7, `endCameraZoom` 8, `endCameraTowards` 0.35 (E7/E10, novos).
- `visual.spawnEffectScale` 1, `teamRingOpacity` 0.6, `showUnitNameOnSpawn` (E4); `ui.*` (E3); `treta.*`, `chaos.*`, `memes.*` (E10/E11); `game.tretaFinalSpeedMultiplier` 1.25 (E10); `units.dino.jurassicDuration` 1.1 / `jurassicInvulnerable` 1 (E7); `powers.canetada` warnTime 0.45 / fallTime 0.45 / hitStop 0.07 / shake 0.9 (E8); `powers.motociata` shake/hitShake, `recesso.endSignal` 0.35 (E9).
- `powers.motociata.damage` 70 → 40 (E12, balanceamento medido).

**Recomendação de performance (não feita, só medida):** 1445 draw calls com 42–50 unidades vêm dos ~30 meshes por boneco procedural. Se o alvo for < 1000 calls com 50 unidades, o próximo passo é InstancedMesh para os militantes (horda) — decisão do Philipe.

## ELENCO 2 (05/09, PC de casa — a pedido do Philipe: "veja se dá pra aproveitar o jogo da pasta arquivo novo")

O projeto 2D em Godot (`D:\projeto-novo`, repo Philipe91/Republicadocaos) tem sprites em tiras 2D (a maioria com 128 px de altura; os principais com 2172×724). **Não viram modelo nem textura 3D**; o que foi aproveitado é o **design e as mecânicas** (docs `INIMIGOS-DA-DIREITA.md`, `GDD.md`, `ART_BIBLE.md`). Alerta: a ficha do Biroliro e o chefão são caricaturas muito próximas de pessoas reais — a regra dos dois projetos é personagem fictício; no 3D tudo ficou genérico/caricatural.

7 unidades novas, SÓ por dados + hooks existentes (nada em Bot.js/UnitManager.js; Unit.js só passou a ler `small/swarm/projectile/projectileGround` do Config em vez do nome do tipo):
| Carta | Custo | Papel | Mecânica (Config.units.*) |
|---|---|---|---|
| AGRO BOY 🤠 | 4 | CONTROL | LAÇO: puxa o inimigo mais distante no alcance (`lacoRange`), stuna (`lacoStun`) e chuta |
| COACH 💪 | 4 | BUFF | MOTIVAÇÃO: +25% dano/veloc. aos aliados (`motivacao*`); sofre dano extra enquanto grita (`motivacaoVulnerable`) |
| PASTOR 📖 | 5 | SPAWNER | Invoca FIÉIS (`fieisPorInvocacao`, teto `fieisMax`); PREGAÇÃO +20% veloc. aos fiéis perto; morrer remove a pregação |
| FIEL (não é carta) | 0 | horda | `small/swarm` como o militante, placa "AMÉM/GLÓRIA/SAI!" |
| PNEUS 🛞 | 3 | RANGED | Pneu que rola no chão (`projectile: 'pneu'`, `projectileGround`) |
| MACONHEIRO 🌿 | 3 | CONTROL | NUVEM: inimigos perto a 50% de veloc. e 75% de ritmo (`nuvem*`) |
| MÚSICO 🎸 | 3 | SUPPORT | ACORDE: 12 de dano + empurrão em área (`acorde*`) |
| MASCOTE 🎭 | 5 | TANK | TOMBAMENTO: investida de 7 u que atropela (60, 1× por inimigo) e fica tonto na base (`tombamento*`) |

Visual: `visual/procedural/Props.js` (novo) recebeu as armas/acessórios do Rig + laço, chapéu, faixa, apito, violão, pneu e livro. Perfis e gestos em `Profiles.js`; animações dos especiais novos em `ProceduralAnimations.special`. Decks padrão NÃO mudaram (as cartas novas entram pelo MONTAR DECK). Teste: `test/elenco.mjs`; capturas em `test/shots/elenco/`. Balanceamento das cartas novas: medido com `test/e12.mjs` (aceita decks por argv[6]/[7]): valores iniciais perdiam 6/6 nos dois sentidos; após duas rodadas de reforço (Mascote 1000/55, Agro Boy 500/36, Coach 560/30, Pastor 450 + 3 fiéis de 80/10, Pneus 250/44, Maconheiro 340/18, Músico 360/26) o HP final ficou ~3800×4200 e ~3600×3800 — perto da paridade, ainda um pouco abaixo do deck antigo.

## BLENDER (05/09, PC de casa — piloto do fluxo Blender → GLB → jogo)

- Blender 5.2.1 LTS portátil em `%LOCALAPPDATA%\Programs\Blender\blender.exe` (o MSI do winget pede UAC; o zip não). Headless: `blender.exe -b -P tools/blender/<personagem>.py -- public/models/<tipo>.glb`.
- `tools/blender/charlib.py`: materiais Principled (o glTF só exporta cor de nós; material "TEAM…" recebe a cor do time no jogo), primitivas suavizadas com bevel, hierarquia por Empties (root > body > head/armL/armR; root > legL/legR — igual ao rig procedural, sem armature), `clip()` grava Actions por objeto e empurra para NLA tracks (viram clipes glTF por nome), `export()`. Convenção: Z cima, boneco olha para -Y (vira +Z no jogo), pés no z = 0, ~1.7 m para bodyType normal.
- `tools/blender/militante.py`: primeiro personagem (boné e camisa do time, placa, 8 clipes: idle, walk, attack, hit, death, victory, stun, special). **`public/models/militante.glb` está no jogo**: o AssetManager troca o militante procedural pelo GLB automaticamente (os outros tipos continuam procedurais).
- `GLBCharacterVisual`: materiais clonados por instância, tint TEAM, flash por emissive, `_play` devolve false quando o clipe não existe (fallbacks: special_<kind> → special → idle; stun/victory/recesso → idle), walk com timeScale mínimo 0.5. Pendente: `transform('jurassic')` para GLB (trocar modelo ou clip), marcador de impacto no clip (hoje timeout = windup).
- Teste: `test/glb.mjs` (pula se não houver GLB). Captura: `test/shots/glb_militante_v1.png`. Próximos: Barbudo, Capitão, Careca, Dino, com as referências que o Sol gerar em `art_ref/<personagem>/`.

**Próximo passo concreto:** Philipe joga uma partida manual (Player vs Bot), ajusta pelo lil-gui o que sentir e cola o COPIAR CONFIG; Sol gera as folhas de modelo (frente/lado/costas + pose característica) em `art_ref/`; seguir com Barbudo → Capitão → Careca → Dino em `tools/blender/`. Arquivos da E1: `src/config/Config.js`, `src/core/Game.js`, `src/core/TimeController.js` (novo), `src/debug/PerfStats.js` (novo), `src/debug/DebugPanel.js`, `src/units/UnitManager.js`, `src/core/EventBus.js`. Critério de pronto está no plano.

## 7. Regras que valem para todas as etapas (resumo do plano e do CLAUDE.md)

- Apresentação (câmera, partículas, áudio, memes, tempo) só **escuta** eventos do `EventBus`; nunca altera estado de jogo.
- `Unit.js`, `UnitBehaviors.js` e `Bot.js` não mudam por causa de visual. A única mudança de interface permitida em `CharacterVisual` é o parâmetro opcional `onImpact` em `playAttack` (etapa E5), com fallback por timeout.
- Todo número vai em `src/config/Config.js` e aparece no lil-gui; COPIAR CONFIG tem de continuar funcionando.
- Nada de DOM por unidade; efeitos em InstancedMesh/pools existentes.
- Nenhum arquivo novo acima de 350 linhas; `ProceduralCharacter.js` deve cair para ≤ 450 após a E2.
- Antes de entregar qualquer etapa: `npm run build` sem erro e `node test/run.mjs` com `ERRORS: none`.
- Respostas curtas em português; o Philipe costuma acompanhar pelo celular.

## 8. Ferramentas configuradas no PC do trabalho (não obrigatórias em casa)

- `claude-mem` v13.24.0 instalado com provider local (`npx claude-mem install --provider claude`), worker iniciado com `npx claude-mem start`. É opcional; o projeto não depende disso.
- A memória do Claude Code no PC do trabalho já registra a armadilha do diretório e o estado da fase. Em casa a memória começa do zero, por isso este arquivo existe.
