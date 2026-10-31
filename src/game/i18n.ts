/**
 * Internationalization (i18n) System for Poki & CrazyGames Global Compliance.
 * Zero emojis — all visual indicators use bespoke cartoon vector icons.
 */

export type Locale = 'pt' | 'en';

const detectDefaultLocale = (): Locale => {
  try {
    const saved = localStorage.getItem('smash_backrooms_lang');
    if (saved === 'pt' || saved === 'en') return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('pt') ? 'pt' : 'en';
  } catch {
    return 'en';
  }
};

let currentLocale: Locale = detectDefaultLocale();
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  try {
    localStorage.setItem('smash_backrooms_lang', locale);
  } catch {
    // ignore storage errors
  }
  listeners.forEach((cb) => cb(locale));
}

export function toggleLocale(): Locale {
  const next: Locale = currentLocale === 'pt' ? 'en' : 'pt';
  setLocale(next);
  return next;
}

export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const STRINGS = {
  pt: {
    roomLabel: 'SALA',
    brokenPct: 'QUEBRADAS',
    wallsUnit: 'PAREDES',
    timerLabel: 'CRONÔMETRO',
    bonusLabel: 'BÔNUS',
    upgradesBtn: 'LOBBY [TAB]',
    pausedTitle: 'JOGO PAUSADO',
    pausedSub: 'Clique para travar o mouse e continuar demolindo ou volte ao Lobby.',
    resumeBtn: 'CONTINUAR',
    openWorkshopBtn: 'VOLTAR AO LOBBY [U]',
    entitiesAlertSingle: 'ENTIDADE ESQUELÉTICA (CONSTRÓI PAREDES • +4.5s)',
    entitiesAlertMulti: 'ENTIDADES ESQUELÉTICAS (CONSTROEM PAREDES • +4.5s)',
    bossAlert: 'MINI-BOSS: O ARQUITETO GIGANTE BLOQUEOU A SALA!',
    rageReady: 'RAGE 100%! APERTE [F] P/ SUPER SMASH!',
    ballHeldBanner: 'SEGURANDO BOLA! CLIQUE P/ ARREMESSAR!',
    roomClearedBadge: 'SALA DEMOLIDA!',
    nextLevelTitle: 'PRÓXIMO NÍVEL',
    bonusTimerTag: 'NO CRONÔMETRO!',
    bonusCoinsTag: 'MOEDAS!',
    expandedRoomSub: 'SALA EXPANDIDA • PAREDES PARA QUEBRAR',
    entityLabel: 'ENTIDADE ESQUELÉTICA',
    bossLabel: 'O ARQUITETO GIGANTE (BOSS)',
    buildingTag: '(ERGUE PAREDE!)',
    clickToLock: 'CLIQUE E SEGURE P/ TURBO-SOCO • [TAB] LOBBY',
    lastWallsRadar: 'ÚLTIMAS PAREDES',
    biomeLevel0: 'NÍVEL 0 • THE LOBBY',
    biomePoolrooms: 'NÍVEL 37 • POOLROOMS',
    biomePipeDreams: 'NÍVEL 2 • PIPE DREAMS',
    biomeHospital: 'NÍVEL "!" • HOSPITAL',
    reviveTitle: 'CRONÔMETRO ZERADO!',
    reviveSub: 'Continue exatamente de onde parou:',
    reviveAdBtn: 'ASSISTIR ANÚNCIO: +12 SEGUNDOS + SUPER SMASH',
    reviveGiveUpBtn: 'DESISTIR',
    comicHitWords: ['POW!', 'SMASH!', 'KRAK!', 'BOOM!', 'WHAM!', 'CRASH!'],
    comicBreakWords: ['KRAK!', 'SMASH!!', 'DEMOLIDO!', 'BOOM!'],
    comicUnbreakable: ['INDESTRUTÍVEL!', 'BLINDAGEM LIMITE!', 'CLANG!'],
    comicElectricShock: ['CHOQUE ELÉTRICO! (0.5s)', 'PARALISADO!'],
    comicElectricChain: ['EXPLOSÃO EM CADEIA!', 'SOBRECARGA!'],
    comicWindSlash: ['FÚRIA METEORO X2!', 'HIT DUPLO!'],
    comicMultiBall: ['MULTI-BOLA X3!', 'CAOS TRIPLO!'],
    comicEntityKilled: ['ENTIDADE EXTERMINADA!', 'OSSO QUEBRADO!', 'FATAL SMASH!'],
    comicBossKilled: ['ARQUITETO GIGANTE DERROTADO!', 'SALA DESTRANCADA!'],
    comicBuildingWall: ['CONSTRUINDO PAREDE!', 'ARQUITETO SOMBRIO!'],
    comicWallBuilt: ['PAREDE ERGUIDA!', '+1 PAREDE!'],
    comicBallPicked: ['BOLA NA MÃO!', 'CLIQUE P/ DISPARAR!'],
    comicBallThrown: ['DISPARO!', 'RICOCHETE!'],
    comicCoins: 'MOEDAS!',
    powerUpWater: 'ÁGUA DE AMÊNDOAS (VELOCIDADE + RAGE MÁXIMA!)',
    powerUpMega: 'LUVAS GIGA (+100% DANO DE DEMOLIÇÃO!)',
    powerUpGold: 'PUNHOS DE OURO (QUEBRA INSTANTÂNEA!)',
    powerUpSuperStart: 'SUPER BUFF: PUNHOS DE OURO + MULTI-BOLA (25s)!',
    touchThrow: 'LANÇAR',
    touchJump: 'PULAR',
    touchDash: 'DASH',
    touchCombo: 'TURBO',
    touchHeavy: 'PESADO',

    // Lobby Actions & Top Bar
    playBtn: 'JOGAR',
    buffBtn: 'BUFF',
    skinsBtn: 'LUVAS',
    recordsBtn: 'RECORDES',
    rebirthBtn: 'REBIRTH',
    budgetsBtn: 'ITENS',
    jackpotBtn: 'JACKPOT',
    resetBtn: 'RESET',
    freeAdBadge: 'GRÁTIS',
    langLabel: 'PT',
    soundLabel: 'SOM',

    // Upgrade Card Titles & Descriptions
    upgradeMoveSpeed: 'VELOCIDADE',
    upgradeMoveSpeedDesc: 'Velocidade ao andar e no dash',
    upgradePunchForce: 'FORÇA DO SOCO',
    upgradePunchForceDesc: 'Dano de demolição por soco',
    upgradePunchSpeed: 'VEL. DO SOCO',
    upgradePunchSpeedDesc: 'Cadência rápida de socos',
    upgradeBallForce: 'FORÇA DA BOLA',
    upgradeBallForceDesc: 'Velocidade e dano da bola',

    // Modal Titles
    rebirthModalTitle: 'REBIRTH DIMENSIONAL',
    recordsModalTitle: 'RECORDES GLOBAIS',
    budgetsModalTitle: 'ITENS & PERKS',
    skinsModalTitle: 'LUVAS & ARMAS 3D',
    jackpotModalTitle: 'JACKPOT CELEBRATÓRIO',

    // Jackpot Celebratory Presentation & Scaling
    jackpotModalSub: 'Multiplique as moedas obtidas na partida assistindo a um anúncio premiado!',
    jackpotSpinBtn: 'REIVINDICAR JACKPOT (ANÚNCIO)',
    jackpotSpinning: 'PREPARANDO PRÊMIO...',
    jackpotWonTitle: 'PARABÉNS! VOCÊ GANHOU:',
    jackpotCoinsSuffix: 'MOEDAS!',
    jackpotClaimBtn: 'REIVINDICAR JACKPOT (ANÚNCIO)',
    jackpotClaiming: 'PREPARANDO PRÊMIO...',
    jackpotMatchCoins: 'MOEDAS NA PARTIDA',
    jackpotRoomBonus: 'BÔNUS DE SALA',
    jackpotSafetyFloor: 'PISO MÍNIMO GARANTIDO',
    jackpotTierGrand: 'GRANDE JACKPOT',
    jackpotTierMega: 'MEGA JACKPOT',
    jackpotTierUltra: 'ULTRA JACKPOT',
    jackpotCreditedNotice: 'MOEDAS CREDITADAS AO SEU SALDO!',
    jackpotVaultFloorAlert: 'ANDAR JACKPOT • QUEBRE TUDO!',
    jackpotVaultFloorSub: 'SALA JACKPOT DOURADA • PAREDES SE RECONSTROEM!',

    // Rebirth Details
    rebirthCoinMultLabel: 'MULTIPLICADOR DE MOEDAS',
    rebirthDamageLabel: 'BÔNUS DE DANO DE SOCO',
    rebirthTimerLabel: 'BÔNUS DE TEMPO INICIAL',
    rebirthSlotsLabel: 'SLOTS DE ITENS ATIVOS',
    rebirthRoomReqLabel: 'SALA ALVO NECESSÁRIA',
    rebirthCostLabel: 'CUSTO DE REBIRTH',
    rebirthActionBtn: 'CONFIRMAR REBIRTH',

    // Records Details
    statBestLevel: 'MAIOR SALA',
    statBestWalls: 'PAREDES NA RUN',
    statMaxCombo: 'COMBO MÁXIMO',
    statBestScore: 'MAIOR PONTUAÇÃO',

    // Budgets / Perks Details
    budgetSlotLabel: 'SLOT',
    budgetOn: 'ATIVO',
    budgetEquip: 'EQUIPAR',
    budgetLockedRebirth1: 'REBIRTH 1',

    // Skins Details
    skinEquip: 'EQUIPAR',
    skinEquipped: 'EQUIPADO',
    skinUnlockAd: 'DESTRAVAR C/ ANÚNCIO',
    skinLocked: 'BLOQUEADO',
    doubleRunCoinsBtn: '2X MOEDAS',
  },
  en: {
    roomLabel: 'ROOM',
    brokenPct: 'SMASHED',
    wallsUnit: 'WALLS',
    timerLabel: 'TIMER',
    bonusLabel: 'BONUS',
    upgradesBtn: 'LOBBY [TAB]',
    pausedTitle: 'GAME PAUSED',
    pausedSub: 'Click to lock mouse and resume smashing, or return to the Lobby.',
    resumeBtn: 'RESUME',
    openWorkshopBtn: 'BACK TO LOBBY [U]',
    entitiesAlertSingle: 'SKELETAL ENTITY (BUILDS WALLS • +4.5s)',
    entitiesAlertMulti: 'SKELETAL ENTITIES (BUILD WALLS • +4.5s)',
    bossAlert: 'MINI-BOSS: THE GIANT ARCHITECT LOCKED THE ROOM!',
    rageReady: 'RAGE 100%! PRESS [F] FOR SUPER SMASH!',
    ballHeldBanner: 'HOLDING WRECKING BALL! CLICK TO LAUNCH!',
    roomClearedBadge: 'ROOM DEMOLISHED!',
    nextLevelTitle: 'NEXT LEVEL',
    bonusTimerTag: 'ON THE CLOCK!',
    bonusCoinsTag: 'COINS!',
    expandedRoomSub: 'ROOM EXPANDED • WALLS TO SMASH',
    entityLabel: 'SKELETAL ENTITY',
    bossLabel: 'GIANT ARCHITECT (BOSS)',
    buildingTag: '(BUILDING WALL!)',
    clickToLock: 'CLICK & HOLD FOR TURBO-PUNCH • [TAB] LOBBY',
    lastWallsRadar: 'LAST WALLS',
    biomeLevel0: 'LEVEL 0 • THE LOBBY',
    biomePoolrooms: 'LEVEL 37 • POOLROOMS',
    biomePipeDreams: 'LEVEL 2 • PIPE DREAMS',
    biomeHospital: 'LEVEL "!" • HOSPITAL',
    reviveTitle: 'TIME UP!',
    reviveSub: 'Continue this room right now:',
    reviveAdBtn: 'WATCH AD: +12 SECONDS + SUPER SMASH BLAST',
    reviveGiveUpBtn: 'GIVE UP',
    comicHitWords: ['POW!', 'SMASH!', 'KRAK!', 'BOOM!', 'WHAM!', 'CRASH!'],
    comicBreakWords: ['KRAK!', 'SMASH!!', 'DEMOLISHED!', 'BOOM!'],
    comicUnbreakable: ['UNBREAKABLE!', 'ARMOR LIMIT!', 'CLANG!'],
    comicElectricShock: ['HIGH VOLTAGE SHOCK! (0.5s)', 'PARALYZED!'],
    comicElectricChain: ['CHAIN EXPLOSION!', 'OVERLOAD!'],
    comicWindSlash: ['METEOR FURY X2!', 'DOUBLE HIT!'],
    comicMultiBall: ['MULTI-BALL X3!', 'TRIPLE CHAOS!'],
    comicEntityKilled: ['ENTITY OBLITERATED!', 'BONE SHATTER!', 'FATAL SMASH!'],
    comicBossKilled: ['GIANT ARCHITECT DEFEATED!', 'ROOM UNLOCKED!'],
    comicBuildingWall: ['BUILDING WALL!', 'SHADOW ARCHITECT!'],
    comicWallBuilt: ['WALL ERECTED!', '+1 WALL!'],
    comicBallPicked: ['BALL GRIPPED!', 'CLICK TO LAUNCH!'],
    comicBallThrown: ['LAUNCHED!', 'RICOCHET!'],
    comicCoins: 'COINS!',
    powerUpWater: 'ALMOND WATER (SPEED BOOST + MAX RAGE!)',
    powerUpMega: 'GIGA GAUNTLETS (+100% SMASH DAMAGE!)',
    powerUpGold: 'GOLDEN FISTS (INSTANT ONE-HIT BREAK!)',
    powerUpSuperStart: 'SUPER BUFF: GOLDEN FISTS + MULTI-BALL (25s)!',
    touchThrow: 'THROW',
    touchJump: 'JUMP',
    touchDash: 'DASH',
    touchCombo: 'TURBO',
    touchHeavy: 'HEAVY',

    // Lobby Actions & Top Bar
    playBtn: 'PLAY',
    buffBtn: 'BUFF',
    skinsBtn: 'SKINS',
    recordsBtn: 'RECORDS',
    rebirthBtn: 'REBIRTH',
    budgetsBtn: 'BUDGETS',
    jackpotBtn: 'JACKPOT',
    resetBtn: 'RESET',
    freeAdBadge: 'FREE',
    langLabel: 'EN',
    soundLabel: 'SOUND',

    // Upgrade Card Titles & Descriptions
    upgradeMoveSpeed: 'MOVE SPEED',
    upgradeMoveSpeedDesc: 'Walk and dash sprint velocity',
    upgradePunchForce: 'PUNCH FORCE',
    upgradePunchForceDesc: 'Demolition damage per punch',
    upgradePunchSpeed: 'PUNCH SPEED',
    upgradePunchSpeedDesc: 'Rapid punch strike rate',
    upgradeBallForce: 'BALL FORCE',
    upgradeBallForceDesc: 'Ball throw velocity and kinetic impact',

    // Modal Titles
    rebirthModalTitle: 'DIMENSIONAL REBIRTH',
    recordsModalTitle: 'GLOBAL RECORDS',
    budgetsModalTitle: 'PERKS & BUDGETS',
    skinsModalTitle: '3D GLOVES & WEAPONS',
    jackpotModalTitle: 'CELEBRATORY JACKPOT',

    // Jackpot Celebratory Presentation & Scaling
    jackpotModalSub: 'Multiply coins earned in your match run by watching a rewarded ad!',
    jackpotSpinBtn: 'CLAIM JACKPOT (WATCH AD)',
    jackpotSpinning: 'PREPARING REWARD...',
    jackpotWonTitle: 'CONGRATULATIONS! YOU WON:',
    jackpotCoinsSuffix: 'COINS!',
    jackpotClaimBtn: 'CLAIM JACKPOT (WATCH AD)',
    jackpotClaiming: 'PREPARING REWARD...',
    jackpotMatchCoins: 'MATCH RUN COINS',
    jackpotRoomBonus: 'ROOM LEVEL BONUS',
    jackpotSafetyFloor: 'GUARANTEED MIN FLOOR',
    jackpotTierGrand: 'GRAND JACKPOT',
    jackpotTierMega: 'MEGA JACKPOT',
    jackpotTierUltra: 'ULTRA JACKPOT',
    jackpotCreditedNotice: 'COINS CREDITED TO YOUR BALANCE!',
    jackpotVaultFloorAlert: 'JACKPOT VAULT • SMASH EVERYTHING!',
    jackpotVaultFloorSub: 'GOLDEN JACKPOT VAULT • WALLS RECONSTRUCT!',

    // Rebirth Details
    rebirthCoinMultLabel: 'COIN MULTIPLIER',
    rebirthDamageLabel: 'PUNCH DAMAGE BONUS',
    rebirthTimerLabel: 'INITIAL TIMER BONUS',
    rebirthSlotsLabel: 'ACTIVE PERK SLOTS',
    rebirthRoomReqLabel: 'REQUIRED ROOM',
    rebirthCostLabel: 'REBIRTH COST',
    rebirthActionBtn: 'CONFIRM REBIRTH',

    // Records Details
    statBestLevel: 'BEST ROOM',
    statBestWalls: 'WALLS IN RUN',
    statMaxCombo: 'MAX COMBO',
    statBestScore: 'HIGH SCORE',

    // Budgets / Perks Details
    budgetSlotLabel: 'SLOT',
    budgetOn: 'ON',
    budgetEquip: 'EQUIP',
    budgetLockedRebirth1: 'REBIRTH 1',

    // Skins Details
    skinEquip: 'EQUIP',
    skinEquipped: 'EQUIPPED',
    skinUnlockAd: 'UNLOCK VIA AD',
    skinLocked: 'LOCKED',
    doubleRunCoinsBtn: '2X COINS',
  },
};

export function t(): (typeof STRINGS)['pt'] {
  return STRINGS[currentLocale];
}
