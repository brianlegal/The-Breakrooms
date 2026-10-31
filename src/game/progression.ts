/**
 * Persistent Progression:
 * - 4 Pure Independent Attributes: moveSpeed (+10%), punchForce (+15%), punchSpeed (+12%), ballForce (+15%)
 * - Rebirth Prestige System (Room Target + High Coin Cost -> Permanent Coin Mult, Base Damage, Timer Bonus, and 2nd Budget Slot)
 * - 6 Self-Explanatory Budgets with 1-to-2 Equip Slots
 * - 5 Unlockable 3D Glove Skins (Unlockable via Coins or Poki Rewarded Ad)
 */

import { BiomeType } from './textures';

export type UpgradeKey =
  | 'moveSpeed'
  | 'punchForce'
  | 'punchSpeed'
  | 'ballForce';

export type GloveSkinId =
  | 'classic_red'
  | 'cyber_neon'
  | 'mecha_chrome'
  | 'lava_magma'
  | 'void_matter';

export type BudgetId =
  | 'coin_magnet'
  | 'multi_ball'
  | 'shock_shield'
  | 'plus_timer'
  | 'tnt_punch'
  | 'gold_rush';

export interface UpgradeLevels {
  moveSpeed: number;
  punchForce: number;
  punchSpeed: number;
  ballForce: number;
}

export interface PlayerRecords {
  bestLevel: number;
  bestScore: number;
  bestWallsInRun: number;
  totalWallsLifetime: number;
  longestCombo: number;
}

export interface PlayerProfile {
  coins: number;
  rebirthCount: number;
  upgrades: UpgradeLevels;
  records: PlayerRecords;
  adsWatched: number;
  equippedSkin: GloveSkinId;
  unlockedSkins: GloveSkinId[];
  unlockedBudgets: BudgetId[];
  equippedBudgets: BudgetId[];
}

export interface UpgradeMeta {
  key: UpgradeKey;
  title: string;
  pctPerLevel: number;
  baseCost: number;
  costGrowth: number;
  accentColor: string;
}

export const UPGRADE_CATALOG: UpgradeMeta[] = [
  {
    key: 'moveSpeed',
    title: 'MOVE SPEED',
    pctPerLevel: 10,
    baseCost: 40,
    costGrowth: 1.28,
    accentColor: '#06b6d4',
  },
  {
    key: 'punchForce',
    title: 'PUNCH FORCE',
    pctPerLevel: 15,
    baseCost: 45,
    costGrowth: 1.30,
    accentColor: '#f59e0b',
  },
  {
    key: 'punchSpeed',
    title: 'PUNCH SPEED',
    pctPerLevel: 12,
    baseCost: 40,
    costGrowth: 1.28,
    accentColor: '#10b981',
  },
  {
    key: 'ballForce',
    title: 'BALL FORCE',
    pctPerLevel: 15,
    baseCost: 50,
    costGrowth: 1.30,
    accentColor: '#ec4899',
  },
];

export interface BudgetMeta {
  id: BudgetId;
  title: string;
  cost: number;
  accentColor: string;
}

export const BUDGETS_CATALOG: BudgetMeta[] = [
  {
    id: 'coin_magnet',
    title: 'COIN MAGNET',
    cost: 1500,
    accentColor: '#38bdf8',
  },
  {
    id: 'multi_ball',
    title: 'MULTI-BALL',
    cost: 2500,
    accentColor: '#ec4899',
  },
  {
    id: 'shock_shield',
    title: 'SHOCK SHIELD',
    cost: 3200,
    accentColor: '#22d3ee',
  },
  {
    id: 'plus_timer',
    title: '+5s TIMER',
    cost: 4000,
    accentColor: '#4ade80',
  },
  {
    id: 'tnt_punch',
    title: 'TNT PUNCH',
    cost: 5500,
    accentColor: '#f97316',
  },
  {
    id: 'gold_rush',
    title: '2X GOLD WALLS',
    cost: 7500,
    accentColor: '#facc15',
  },
];

export interface GloveSkinMeta {
  id: GloveSkinId;
  namePt: string;
  nameEn: string;
  coinPrice: number;
  primaryColor: string;
  secondaryColor: string;
  trimColor: string;
  emissiveColor: string;
}

export const GLOVE_SKINS_CATALOG: GloveSkinMeta[] = [
  {
    id: 'classic_red',
    namePt: 'CRIMSON PRO',
    nameEn: 'CRIMSON PRO',
    coinPrice: 0,
    primaryColor: '#dc2626',
    secondaryColor: '#7f1d1d',
    trimColor: '#facc15',
    emissiveColor: '#ef4444',
  },
  {
    id: 'cyber_neon',
    namePt: 'CYBER NEON',
    nameEn: 'CYBER NEON',
    coinPrice: 800,
    primaryColor: '#06b6d4',
    secondaryColor: '#0f172a',
    trimColor: '#ec4899',
    emissiveColor: '#22d3ee',
  },
  {
    id: 'mecha_chrome',
    namePt: 'TITANIUM MK-IV',
    nameEn: 'TITANIUM MK-IV',
    coinPrice: 1800,
    primaryColor: '#94a3b8',
    secondaryColor: '#1e293b',
    trimColor: '#f59e0b',
    emissiveColor: '#fbbf24',
  },
  {
    id: 'lava_magma',
    namePt: 'VOLCANIC MAGMA',
    nameEn: 'VOLCANIC MAGMA',
    coinPrice: 3500,
    primaryColor: '#ea580c',
    secondaryColor: '#271206',
    trimColor: '#fde047',
    emissiveColor: '#f97316',
  },
  {
    id: 'void_matter',
    namePt: 'VOID ARCHITECT',
    nameEn: 'VOID ARCHITECT',
    coinPrice: 6500,
    primaryColor: '#9333ea',
    secondaryColor: '#09090f',
    trimColor: '#ffffff',
    emissiveColor: '#a855f7',
  },
];

const STORAGE_KEY = 'smash_backrooms_profile_v5';

const DEFAULT_PROFILE: PlayerProfile = {
  coins: 0,
  rebirthCount: 0,
  upgrades: {
    moveSpeed: 0,
    punchForce: 0,
    punchSpeed: 0,
    ballForce: 0,
  },
  records: {
    bestLevel: 1,
    bestScore: 0,
    bestWallsInRun: 0,
    totalWallsLifetime: 0,
    longestCombo: 0,
  },
  adsWatched: 0,
  equippedSkin: 'classic_red',
  unlockedSkins: ['classic_red'],
  unlockedBudgets: [],
  equippedBudgets: [],
};

export interface LevelRoomConfig {
  level: number;
  biome: BiomeType;
  isJackpotFloor: boolean;
  targetWalls: number;
  gridWidth: number;
  gridDepth: number;
  initialTime: number;
  bonusTimeOnClear: number;
  ballsCount: number;
}

export class ProgressionManager {
  private profile: PlayerProfile;

  constructor() {
    this.profile = this.load();
  }

  private load(): PlayerProfile {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('smash_backrooms_profile_v4') ||
        localStorage.getItem('smash_backrooms_profile_v3');
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      const parsed = JSON.parse(raw);
      const oldUpg = parsed.upgrades || {};

      return {
        coins: typeof parsed.coins === 'number' ? parsed.coins : DEFAULT_PROFILE.coins,
        rebirthCount: typeof parsed.rebirthCount === 'number' ? parsed.rebirthCount : 0,
        upgrades: {
          moveSpeed:
            typeof oldUpg.moveSpeed === 'number'
              ? oldUpg.moveSpeed
              : typeof oldUpg.walkAndDashSpeed === 'number'
              ? oldUpg.walkAndDashSpeed
              : 0,
          punchForce: typeof oldUpg.punchForce === 'number' ? oldUpg.punchForce : 0,
          punchSpeed: typeof oldUpg.punchSpeed === 'number' ? oldUpg.punchSpeed : 0,
          ballForce:
            typeof oldUpg.ballForce === 'number'
              ? oldUpg.ballForce
              : typeof oldUpg.itemsForce === 'number'
              ? oldUpg.itemsForce
              : 0,
        },
        records: {
          ...DEFAULT_PROFILE.records,
          ...(parsed.records || {}),
        },
        adsWatched: typeof parsed.adsWatched === 'number' ? parsed.adsWatched : 0,
        equippedSkin: parsed.equippedSkin || 'classic_red',
        unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ['classic_red'],
        unlockedBudgets: Array.isArray(parsed.unlockedBudgets) ? parsed.unlockedBudgets : [],
        equippedBudgets: Array.isArray(parsed.equippedBudgets) ? parsed.equippedBudgets : [],
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    }
  }

  public save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // Ignore storage quota errors
    }
  }

  public getProfile(): PlayerProfile {
    const maxSlots = this.getMaxBudgetSlots();
    if (this.profile.equippedBudgets.length > maxSlots) {
      this.profile.equippedBudgets = this.profile.equippedBudgets.slice(0, maxSlots);
    }
    return {
      coins: this.profile.coins,
      rebirthCount: this.profile.rebirthCount || 0,
      upgrades: { ...this.profile.upgrades },
      records: { ...this.profile.records },
      adsWatched: this.profile.adsWatched,
      equippedSkin: this.profile.equippedSkin,
      unlockedSkins: [...this.profile.unlockedSkins],
      unlockedBudgets: [...this.profile.unlockedBudgets],
      equippedBudgets: [...this.profile.equippedBudgets],
    };
  }

  /**
   * Required target room for the next Rebirth: 6 + rebirthCount * 4 (Lv. 6, Lv. 10, Lv. 14...).
   */
  public getRebirthTargetRoom(): number {
    return 6 + (this.profile.rebirthCount || 0) * 4;
  }

  /**
   * Required coin cost for the next Rebirth: 12000 * 2.6^rebirthCount.
   */
  public getRebirthCost(): number {
    return Math.round(12000 * Math.pow(2.6, this.profile.rebirthCount || 0));
  }

  /**
   * Requirement for Rebirth: reached targetRoom AND coins >= rebirthCost.
   */
  public canRebirth(): boolean {
    const targetRoom = this.getRebirthTargetRoom();
    const cost = this.getRebirthCost();
    return this.profile.records.bestLevel >= targetRoom && this.profile.coins >= cost;
  }

  /**
   * Permanent Global Coin & Score Multiplier from Rebirth: 1 + rebirthCount * 1.0 (1x, 2x, 3x...).
   */
  public getRebirthCoinMultiplier(): number {
    return 1 + (this.profile.rebirthCount || 0) * 1.0;
  }

  /**
   * Permanent +1.5s bonus on initial timer of every room per Rebirth.
   */
  public getRebirthTimerBonus(): number {
    return (this.profile.rebirthCount || 0) * 1.5;
  }

  /**
   * Permanent +25% Base Punch Damage per Rebirth.
   */
  public getRebirthDamageMultiplier(): number {
    return 1 + (this.profile.rebirthCount || 0) * 0.25;
  }

  /**
   * Maximum Budget Slots: starts at 1, unlocks 2nd slot at Rebirth >= 1.
   */
  public getMaxBudgetSlots(): number {
    return (this.profile.rebirthCount || 0) >= 1 ? 2 : 1;
  }

  /**
   * Executes Rebirth:
   * - Requires bestLevel >= targetRoom && coins >= rebirthCost.
   * - Resets the 4 upgrades to Lv. 0, resets remaining coins to 0, and increments rebirthCount += 1.
   */
  public performRebirth(): boolean {
    if (!this.canRebirth()) return false;

    this.profile.rebirthCount = (this.profile.rebirthCount || 0) + 1;
    this.profile.upgrades = {
      moveSpeed: 0,
      punchForce: 0,
      punchSpeed: 0,
      ballForce: 0,
    };
    this.profile.coins = 0;

    this.save();
    return true;
  }

  /**
   * Returns current total percentage for an attribute (starts at 100%, uncapped!).
   */
  public getStatPercentage(key: UpgradeKey): number {
    const meta = UPGRADE_CATALOG.find((u) => u.key === key)!;
    const lvl = this.profile.upgrades[key] || 0;
    return 100 + lvl * meta.pctPerLevel;
  }

  /**
   * Returns raw multiplier (e.g. 1.0 at level 0, 2.5 at 250%, uncapped).
   */
  public getStatMultiplier(key: UpgradeKey): number {
    return this.getStatPercentage(key) / 100;
  }

  /**
   * Smoothly damped movement multiplier so high levels of Move Speed remain controllable in corridors.
   */
  public getEffectiveMoveMultiplier(): number {
    const raw = this.getStatMultiplier('moveSpeed');
    if (raw <= 1.85) return raw;
    return 1.85 + Math.log2(1 + (raw - 1.85)) * 0.38;
  }

  /**
   * Calculates coin cost for the next upgrade level of an attribute.
   */
  public getUpgradeCost(key: UpgradeKey): number {
    const meta = UPGRADE_CATALOG.find((u) => u.key === key)!;
    const lvl = this.profile.upgrades[key] || 0;
    return Math.round(meta.baseCost * Math.pow(meta.costGrowth, lvl));
  }

  /**
   * Buys one level of an upgrade if player has enough coins.
   */
  public buyUpgrade(key: UpgradeKey): boolean {
    const cost = this.getUpgradeCost(key);
    if (this.profile.coins < cost) return false;
    this.profile.coins -= cost;
    this.profile.upgrades[key] = (this.profile.upgrades[key] || 0) + 1;
    this.save();
    return true;
  }

  /**
   * Grants +1 level of an upgrade for free via Rewarded Ad!
   */
  public grantFreeUpgrade(key: UpgradeKey) {
    this.profile.upgrades[key] = (this.profile.upgrades[key] || 0) + 1;
    this.profile.adsWatched += 1;
    this.save();
  }

  /**
   * Checks if a specific Budget is currently equipped.
   */
  public hasBudgetEquipped(budgetId: BudgetId): boolean {
    return this.profile.equippedBudgets.includes(budgetId);
  }

  /**
   * Buys a Budget (if locked) or toggles its Equipped state (respecting max 1 or 2 slots).
   */
  public buyOrToggleBudget(budgetId: BudgetId): boolean {
    const meta = BUDGETS_CATALOG.find((b) => b.id === budgetId);
    if (!meta) return false;

    const maxSlots = this.getMaxBudgetSlots();

    if (!this.profile.unlockedBudgets.includes(budgetId)) {
      if (this.profile.coins < meta.cost) return false;
      this.profile.coins -= meta.cost;
      this.profile.unlockedBudgets.push(budgetId);
      if (this.profile.equippedBudgets.length < maxSlots) {
        this.profile.equippedBudgets.push(budgetId);
      } else {
        this.profile.equippedBudgets[maxSlots - 1] = budgetId;
      }
      this.save();
      return true;
    }

    // Already unlocked -> toggle equip
    const idx = this.profile.equippedBudgets.indexOf(budgetId);
    if (idx !== -1) {
      this.profile.equippedBudgets.splice(idx, 1);
    } else {
      if (this.profile.equippedBudgets.length < maxSlots) {
        this.profile.equippedBudgets.push(budgetId);
      } else {
        this.profile.equippedBudgets[maxSlots - 1] = budgetId;
      }
    }
    this.save();
    return true;
  }

  public unlockOrEquipSkin(skinId: GloveSkinId): boolean {
    if (this.profile.unlockedSkins.includes(skinId)) {
      this.profile.equippedSkin = skinId;
      this.save();
      return true;
    }

    const meta = GLOVE_SKINS_CATALOG.find((s) => s.id === skinId);
    if (!meta || this.profile.coins < meta.coinPrice) return false;

    this.profile.coins -= meta.coinPrice;
    this.profile.unlockedSkins.push(skinId);
    this.profile.equippedSkin = skinId;
    this.save();
    return true;
  }

  /**
   * Unlocks and immediately equips a skin via Poki-style Rewarded Ad!
   */
  public unlockSkinViaAd(skinId: GloveSkinId) {
    if (!this.profile.unlockedSkins.includes(skinId)) {
      this.profile.unlockedSkins.push(skinId);
    }
    this.profile.equippedSkin = skinId;
    this.profile.adsWatched += 1;
    this.save();
  }

  public addCoins(amount: number) {
    this.profile.coins = Math.max(0, Math.round(this.profile.coins + amount));
    this.save();
  }

  public claimAdJackpot(rewardCoins: number) {
    this.profile.coins += rewardCoins;
    this.profile.adsWatched += 1;
    this.save();
  }

  public incrementLifetimeWalls(count = 1) {
    this.profile.records.totalWallsLifetime += count;
    this.save();
  }

  /**
   * Completely resets the player account to its initial zeroed state (0 coins, 0 levels, 0 rebirths, 0 budgets, starter skin).
   */
  public resetProfile() {
    this.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    try {
      localStorage.removeItem('smash_backrooms_profile_v4');
      localStorage.removeItem('smash_backrooms_profile_v3');
      localStorage.removeItem('smash_backrooms_profile_v2');
    } catch {
      // ignore
    }
    this.save();
  }

  public updateRecords(level: number, score: number, wallsDestroyedInRun: number, maxCombo: number) {
    let isNewRecord = false;
    if (level > this.profile.records.bestLevel) {
      this.profile.records.bestLevel = level;
      isNewRecord = true;
    }
    if (score > this.profile.records.bestScore) {
      this.profile.records.bestScore = score;
      isNewRecord = true;
    }
    if (wallsDestroyedInRun > this.profile.records.bestWallsInRun) {
      this.profile.records.bestWallsInRun = wallsDestroyedInRun;
      isNewRecord = true;
    }
    if (maxCombo > this.profile.records.longestCombo) {
      this.profile.records.longestCombo = maxCombo;
    }
    this.save();
    return isNewRecord;
  }

  public static getBiomeForLevel(level: number): BiomeType {
    const cycle = (level - 1) % 12;
    if (cycle < 3) return 'level0';
    if (cycle < 6) return 'poolrooms';
    if (cycle < 9) return 'pipedreams';
    return 'hospital';
  }

  /**
   * Computes level parameters (grid size capped at 9x9, wall count, timer + Rebirth & +5s Budget, and rare Jackpot Floor status).
   */
  public static getLevelConfig(
    level: number,
    rebirthTimerBonus = 0,
    plusTimerBudgetBonus = 0,
    isJackpotFloor = false
  ): LevelRoomConfig {
    const biome = isJackpotFloor ? 'level0' : ProgressionManager.getBiomeForLevel(level);
    const gridSize = isJackpotFloor
      ? 6
      : Math.min(9, 4 + Math.floor((level - 1) * 0.6));
    const targetWalls = isJackpotFloor
      ? 24
      : Math.min(48, 8 + (level - 1) * 4);
    const baseTime = isJackpotFloor
      ? 16.0
      : Math.max(11, 15.5 - Math.min(4.0, (level - 1) * 0.25));
    const initialTime = Number((baseTime + rebirthTimerBonus + plusTimerBudgetBonus).toFixed(1));
    const bonusTimeOnClear = Number(Math.max(5.5, 9.5 - Math.min(3.5, level * 0.25)).toFixed(1));
    const ballsCount = isJackpotFloor ? 3 : Math.min(4, 1 + Math.floor(level / 3));

    return {
      level,
      biome,
      isJackpotFloor,
      targetWalls,
      gridWidth: gridSize,
      gridDepth: gridSize,
      initialTime,
      bonusTimeOnClear,
      ballsCount,
    };
  }
}

export const progressionManager = new ProgressionManager();
