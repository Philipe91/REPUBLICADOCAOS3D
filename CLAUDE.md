# CLAUDE.md — instruções para qualquer sessão do Claude neste projeto

Leia `docs/GUIA_DO_PROJETO.md` antes de mexer em qualquer coisa. Ele explica o jogo, a arquitetura, como o vertical slice foi construído, como testar e como continuamos o trabalho.

Regras curtas:

- Idioma: português brasileiro, casual e direto. Philipe acompanha muitas vezes pelo celular — respostas curtas, sem paredes de texto.
- Stack fixa: Three.js + JavaScript + HTML + CSS + Vite + lil-gui. Sem Unity/Godot/Unreal, sem backend, sem banco, sem multiplayer nesta fase.
- Personagens são procedurais (primitivas do Three.js) por enquanto. NUNCA mudar `Unit.js`, `UnitBehaviors.js`, `Bot.js` para acomodar visual — o visual entra só via a interface `CharacterVisual`.
- Todo número de balanceamento vive em `src/config/Config.js`. Não espalhar constantes mágicas pelo código.
- Antes de entregar: `npm run build` sem erro, e (se possível) `node test/run.mjs` terminando em `RESULT: victory|defeat` com `ERRORS: none`.
- Prioridade do projeto: gameplay > estabilidade > feedback visual > performance > humor > conteúdo.
- Não usar assets, nomes, sons, interface ou código de Castle Crush. Só a lógica geral do gênero.
- Sátira fictícia: nenhum personagem é retrato realista; sem cores políticas fixas nos militantes (eles usam a cor do time).
- Commits: mensagens em português, uma feature por commit. O push é feito pelo Philipe (credenciais do GitHub são dele).
