// ============================================================
// CharacterFactory — cria o CharacterVisual de cada tipo de unidade.
// 1) Se AssetManager tiver um GLB carregado para o tipo → GLBCharacterVisual
// 2) Senão → ProceduralCharacterVisual com a "spec" caricata do personagem.
// A lógica (Unit.js) nunca sabe qual implementação recebeu.
// ============================================================
import { ProceduralCharacterVisual } from './ProceduralCharacterVisual.js';
import { GLBCharacterVisual } from './GLBCharacterVisual.js';
import { assetManager } from './AssetManager.js';
import { TEAM_COLORS, Config } from '../config/Config.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Specs visuais (caricaturas fictícias). Sem cores políticas fixas: as cores
// de camiseta/boné dos militantes vêm do time (deck).
export function buildSpec(type, team) {
  const teamColor = TEAM_COLORS[team];
  const scale = Config.units[type]?.scale ?? 1;
  switch (type) {
    case 'militante': {
      const variant = pick(['flag', 'sign', 'cap', 'plain']);
      return {
        scale, headScale: 1.05, bodyType: 'small',
        skin: pick([0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac]),
        shirt: teamColor, pants: pick([0x2f3542, 0x3b5998, 0x555555]),
        hair: variant === 'cap' ? 'cap' : pick(['short', 'side', 'bald']),
        hairColor: pick([0x2b1d14, 0x111111, 0x8b5a2b, 0xd9b26f]),
        weapon: variant === 'flag' ? 'flag' : variant === 'sign' ? 'sign' : null,
        flagColor: teamColor, teamColor,
        signText: pick(['JÁ ERA', 'FORA\nTODO MUNDO', 'CADÊ O\nPIX?', 'É HOJE', 'NÃO VALE\nPRINT', 'TÁ OK?']),
        mouth: 'shout', eyeStyle: 'angry',
      };
    }
    case 'tiozap':
      return {
        scale, headScale: 1.1, bodyType: 'belly',
        skin: 0xe8b98a, shirt: pick([0x2e8b57, 0x8b0000, 0x1e3f8a]), pants: 0x8b7355,
        hair: 'bald', hairColor: 0x777777, beard: false, glasses: true,
        weapon: 'phone', mouth: 'flat', teamColor,
      };
    case 'assessor':
      return {
        scale, headScale: 1.0, bodyType: 'normal',
        skin: 0xf1c27d, shirt: 0x2b2b3a, pants: 0x2b2b3a, shoes: 0x111111,
        hair: 'side', hairColor: 0x1a1a1a, suit: true, tie: 0xc0392b,
        weapon: 'papers', accessory: 'briefcase', mouth: 'flat', eyeStyle: 'sleepy', teamColor,
      };
    case 'influencer':
      return {
        scale, headScale: 1.05, bodyType: 'small',
        skin: 0xffdbac, shirt: 0xff4d8d, pants: 0xffffff, shoes: 0xffffff,
        hair: 'side', hairColor: 0xf7e26b, sunglasses: true,
        weapon: 'phone', accessory: 'ringlight', mouth: 'smile', teamColor,
      };
    case 'barbudo':
      return {
        scale, headScale: 1.3, bodyType: 'belly',
        skin: 0xd9a066, shirt: 0xf5f5f5, pants: 0x2f3542, shoes: 0x111111,
        hair: 'short', hairColor: 0xbdbdbd, beard: true, suit: true, tie: 0x8e2b2b,
        weapon: 'mic', mouth: 'shout', teamColor,
      };
    case 'capitao':
      return {
        scale, headScale: 1.2, bodyType: 'normal',
        skin: 0xf1c27d, shirt: 0x1c2a44, pants: 0x1c2a44, shoes: 0x111111,
        hair: 'side', hairColor: 0x3a3a3a, suit: true, tie: 0x2f8f4e,
        weapon: null, mouth: 'shout', eyeStyle: 'angry', teamColor,
      };
    case 'careca':
      return {
        scale, headScale: 1.45, bodyType: 'normal',
        skin: 0xf1c27d, shirt: 0x111111, pants: 0x111111, shoes: 0x111111,
        hair: 'bald', hairColor: 0x222222, cape: 0x111111, glasses: true,
        weapon: 'pen', mouth: 'flat', eyeStyle: 'angry', teamColor,
      };
    case 'dino':
      return {
        scale, headScale: 1.35, bodyType: 'big',
        skin: 0xf1c27d, shirt: 0x2c3e50, pants: 0x2c3e50, shoes: 0x111111,
        hair: 'short', hairColor: 0x111111, beard: true, suit: true, tie: 0x3d6db5,
        weapon: null, mouth: 'smile', teamColor,
      };
    default:
      return { scale, teamColor, shirt: teamColor };
  }
}

export function createCharacterVisual(type, team, scene) {
  const glb = assetManager.getModel(type);
  if (glb) return new GLBCharacterVisual(glb, scene, buildSpec(type, team));
  return new ProceduralCharacterVisual(buildSpec(type, team), scene);
}
