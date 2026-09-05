// ============================================================
// CARTAS — definição das cartas do jogo.
// type 'troop' → spawna unidades (unit = chave em Config.units)
// type 'power' → efeito instantâneo (power = chave em Config.powers)
// target: 'lane' (escolhe lane) | 'global' (usa na hora)
// ============================================================

export const CARDS = {
  militantes: { id: 'militantes', name: 'MILITANTES', type: 'troop', unit: 'militante', icon: '✊', cls: 'SWARM',   desc: '5 bonequinhos gritando.' },
  tiozap:     { id: 'tiozap',     name: 'TIO DO ZAP', type: 'troop', unit: 'tiozap',    icon: '📱', cls: 'RANGED',  desc: 'Atira mensagens encaminhadas.' },
  assessor:   { id: 'assessor',   name: 'ASSESSOR',   type: 'troop', unit: 'assessor',  icon: '💼', cls: 'SUPPORT', desc: 'Buff de velocidade/ataque perto.' },
  influencer: { id: 'influencer', name: 'INFLUENCER', type: 'troop', unit: 'influencer',icon: '💡', cls: 'RANGED',  desc: 'Ganha ENGAJAMENTO com mortes.' },
  barbudo:    { id: 'barbudo',    name: 'BARBUDO',    type: 'troop', unit: 'barbudo',   icon: '🎤', cls: 'TANK/SUP',desc: 'COMPANHEIRADA + DISCURSO.' },
  capitao:    { id: 'capitao',    name: 'CAPITÃO',    type: 'troop', unit: 'capitao',   icon: '🫡', cls: 'DPS',     desc: 'CERCADINHO + MOTOCIATA.' },
  careca:     { id: 'careca',     name: 'CARECA DA CANETA', type: 'troop', unit: 'careca', icon: '🖊️', cls: 'TANK/CTRL', desc: 'CANETADA lenta e forte. SUSPENSO!' },
  dino:       { id: 'dino',       name: 'DINO',       type: 'troop', unit: 'dino',      icon: '🦖', cls: 'TANK',    desc: 'A 50% HP: MODO JURÁSSICO.' },
  // ---- ELENCO 2 ----
  agroboy:    { id: 'agroboy',    name: 'AGRO BOY',   type: 'troop', unit: 'agroboy',   icon: '🤠', cls: 'CONTROL', desc: 'LAÇO puxa o inimigo e chuta.' },
  coach:      { id: 'coach',      name: 'COACH',      type: 'troop', unit: 'coach',     icon: '💪', cls: 'BUFF',    desc: 'MOTIVAÇÃO: buff aos aliados, mas fica vulnerável.' },
  pastor:     { id: 'pastor',     name: 'PASTOR',     type: 'troop', unit: 'pastor',    icon: '📖', cls: 'SPAWNER', desc: 'Invoca FIÉIS e prega (+veloc.).' },
  pneus:      { id: 'pneus',      name: 'PNEUS',      type: 'troop', unit: 'pneus',     icon: '🛞', cls: 'RANGED',  desc: 'Rola pneus pelo chão.' },
  maconheiro: { id: 'maconheiro', name: 'MACONHEIRO', type: 'troop', unit: 'maconheiro',icon: '🌿', cls: 'CONTROL', desc: 'NUVEM: inimigos perto ficam lentos.' },
  musico:     { id: 'musico',     name: 'MÚSICO',     type: 'troop', unit: 'musico',    icon: '🎸', cls: 'SUPPORT', desc: 'ACORDE empurra quem está perto.' },
  mascote:    { id: 'mascote',    name: 'MASCOTE',    type: 'troop', unit: 'mascote',   icon: '🎭', cls: 'TANK',    desc: 'TOMBAMENTO: investida que atropela.' },

  canetada:   { id: 'canetada',   name: 'CANETADA',   type: 'power', power: 'canetada', icon: '✒️', cls: 'PODER', target: 'lane',   desc: 'Caneta gigante cai na lane. Dano em área.' },
  motociata:  { id: 'motociata',  name: 'MOTOCIATA',  type: 'power', power: 'motociata',icon: '🏍️', cls: 'PODER', target: 'lane',   desc: 'Motos atravessam a lane. Dano + knockback.' },
  recesso:    { id: 'recesso',    name: 'RECESSO',    type: 'power', power: 'recesso',  icon: '☕', cls: 'PODER', target: 'global', desc: 'Todo mundo para por 2 segundos.' },
  pesquisa:   { id: 'pesquisa',   name: 'PESQUISA',   type: 'power', power: 'pesquisa', icon: '📊', cls: 'PODER', target: 'lane',   desc: 'Buff aleatório numa lane aliada.' },
};

export const CARD_LIST = Object.values(CARDS);
export const DECK_SIZE = 8;
export const HAND_SIZE = 4;
