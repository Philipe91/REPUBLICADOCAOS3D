# HANDOFF — continuar o projeto em outra máquina / nova conversa

Atualizado em 04/09/2026 (PC de casa, após câmera lateral + E1 + E2). Leia isto primeiro, depois `CLAUDE.md`, depois `docs/GUIA_DO_PROJETO.md`, depois `docs/PLANO-GAME-FEEL.md`.

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
| E3..E12 | ⬜ não iniciadas |

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

**Próximo passo concreto:** E3 (UX Player vs Bot), só depois de o Philipe aprovar o relatório da E2. Arquivos da E1: `src/config/Config.js`, `src/core/Game.js`, `src/core/TimeController.js` (novo), `src/debug/PerfStats.js` (novo), `src/debug/DebugPanel.js`, `src/units/UnitManager.js`, `src/core/EventBus.js`. Critério de pronto está no plano.

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
