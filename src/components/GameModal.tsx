/**
 * Lobby & Pop-up GUI System with Procedural Hand-Painted Cartoon Textures & Multi-Layer Vector Icons
 * (Modeled directly after the "CARTOON BUTTONS SET" reference sheet — zero emojis anywhere).
 */

import React, { useEffect, useState } from 'react';
import { GameState } from '../game/gameEngine';
import {
  UPGRADE_CATALOG,
  GLOVE_SKINS_CATALOG,
  BUDGETS_CATALOG,
  UpgradeKey,
  GloveSkinId,
  BudgetId,
  progressionManager,
} from '../game/progression';
import { portalSDK } from '../game/portalSdk';
import { GloveShowcase3D } from './GloveShowcase3D';
import { initCartoonUiTextures } from './cartoonUiTextures';
import { t, toggleLocale } from '../game/i18n';
import { soundManager } from '../game/audio';
import {
  CartoonPlayIcon,
  CartoonArrowRightIcon,
  CartoonResetIcon,
  CartoonRebirthIcon,
  CartoonCloseIcon,
  CartoonCheckIcon,
  CartoonTrophyIcon,
  CartoonStarIcon,
  CartoonVideoAdIcon,
  CartoonCoinIcon,
  CartoonGloveIcon,
  CartoonBoltIcon,
  CartoonHammerIcon,
  CartoonFlameIcon,
  CartoonDoorIcon,
  CartoonLockIcon,
  CartoonBudgetIcon,
  CartoonLanguageIcon,
  CartoonJackpotIcon,
  CartoonSoundIcon,
  CartoonMoveSpeedIcon,
  CartoonPunchForceIcon,
  CartoonPunchSpeedIcon,
  CartoonBallForceIcon,
} from './CartoonIcons';

// Ensure procedural hand-painted textures are generated immediately
initCartoonUiTextures();

export type ActiveGuiType = 'none' | 'skins' | 'records' | 'rebirth' | 'budgets' | 'jackpot';

interface GameModalProps {
  state: GameState;
  onStartRun: (startLevel?: number, withSuperBuff?: boolean) => void;
  onBuyUpgrade: (key: UpgradeKey) => void;
  onFreeAdUpgrade: (key: UpgradeKey) => void;
  onPerformRebirth: () => void;
  onBuyOrToggleBudget: (budgetId: BudgetId) => void;
  onDoubleRunCoins: () => void;
  onSelectOrBuySkin: (skinId: GloveSkinId) => void;
  onUnlockSkinViaAd: (skinId: GloveSkinId) => void;
  onClaimAdJackpot: (coins: number) => void;
  onResetAccount: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  state,
  onStartRun,
  onBuyUpgrade,
  onFreeAdUpgrade,
  onPerformRebirth,
  onBuyOrToggleBudget,
  onDoubleRunCoins,
  onSelectOrBuySkin,
  onUnlockSkinViaAd,
  onClaimAdJackpot,
  onResetAccount,
}) => {
  const [activeGui, setActiveGui] = useState<ActiveGuiType>('none');
  const [superBuffArmed, setSuperBuffArmed] = useState(false);
  const [previewSkinId, setPreviewSkinId] = useState<GloveSkinId>(
    state.profile.equippedSkin || 'classic_red'
  );
  const [justBoughtKey, setJustBoughtKey] = useState<UpgradeKey | null>(null);
  const [busyAdAction, setBusyAdAction] = useState<string | null>(null);
  const [jackpotWonResult, setJackpotWonResult] = useState<{
    amount: number;
    tier: 'grand' | 'mega' | 'ultra';
    mult: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  useEffect(() => {
    initCartoonUiTextures();
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') {
      soundManager.setMusicContext('lobby', 'level0', false, activeGui !== 'none');
    }
  }, [state.status, activeGui]);

  const switchGui = (target: ActiveGuiType) => {
    const next = activeGui === target ? 'none' : target;
    if (next === 'none') {
      soundManager.playModalClose();
    } else {
      soundManager.playModalOpen();
    }
    setActiveGui(next);
  };

  if (state.status === 'playing') return null;

  const strings = t();
  const profile = state.profile;

  const rebirthCount = profile.rebirthCount || 0;
  const currentMult = progressionManager.getRebirthCoinMultiplier();
  const nextMult = currentMult + 1;

  const currentDmgPct = Math.round(progressionManager.getRebirthDamageMultiplier() * 100);
  const nextDmgPct = currentDmgPct + 25;

  const currentBonusSec = progressionManager.getRebirthTimerBonus();
  const nextBonusSec = currentBonusSec + 1.5;

  const currentSlots = progressionManager.getMaxBudgetSlots();
  const nextSlots = 2;

  const targetRoom = progressionManager.getRebirthTargetRoom();
  const rebirthCost = progressionManager.getRebirthCost();
  const roomReqMet = profile.records.bestLevel >= targetRoom;
  const coinReqMet = profile.coins >= rebirthCost;
  const canRebirthNow = roomReqMet && coinReqMet;

  const runCoinsEarned = state.runCoinsEarned ?? 0;
  const effectiveRoomLevel = Math.max(1, state.level || 1, profile.records.bestLevel || 1);
  const roomBonus = Math.round(effectiveRoomLevel * 250 * currentMult);
  const floorPrize = Math.round(1000 * currentMult);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.toggleMute();
    setIsMuted(soundManager.getMuted());
  };

  const handleToggleLocale = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playUiClick();
    toggleLocale();
  };

  // Upgrade Card Click: Buy with Coins if affordable, otherwise Watch Ad for Free Upgrade
  const handleUpgradeCardClick = async (key: UpgradeKey, canAfford: boolean) => {
    if (canAfford) {
      onBuyUpgrade(key);
      setJustBoughtKey(key);
      setTimeout(() => setJustBoughtKey(null), 280);
    } else {
      if (busyAdAction) return;
      setBusyAdAction(`upg_${key}`);
      const rewarded = await portalSDK.requestRewardedAd();
      setBusyAdAction(null);
      if (rewarded) {
        onFreeAdUpgrade(key);
        setJustBoughtKey(key);
        setTimeout(() => setJustBoughtKey(null), 320);
      }
    }
  };

  // Arm Super Buff via Rewarded Ad before pressing PLAY
  const handleArmBuffAd = async () => {
    if (superBuffArmed || busyAdAction) return;
    soundManager.playUiClick();
    setBusyAdAction('arm_buff');
    const rewarded = await portalSDK.requestRewardedAd();
    setBusyAdAction(null);
    if (rewarded) {
      soundManager.playPowerup('golden_fists');
      setSuperBuffArmed(true);
    }
  };

  // Start Run (consumes armed Super Buff if active)
  const handlePlayClick = () => {
    soundManager.playUiClick();
    const useBuff = superBuffArmed;
    setSuperBuffArmed(false);
    setActiveGui('none');
    onStartRun(1, useBuff);
  };

  // Poki-style Skin Unlock via Ad
  const handleUnlockSkinAd = async (skinId: GloveSkinId) => {
    if (busyAdAction) return;
    setBusyAdAction(`skin_${skinId}`);
    const rewarded = await portalSDK.requestRewardedAd();
    setBusyAdAction(null);
    if (rewarded) {
      onUnlockSkinViaAd(skinId);
    }
  };

  // Requirement R1: Dynamic Scaled Jackpot via Rewarded Ad
  const handleClaimJackpot = async () => {
    if (busyAdAction) return;
    soundManager.playUiClick();
    setBusyAdAction('jackpot_claim');
    const rewarded = await portalSDK.requestRewardedAd();
    setBusyAdAction(null);
    if (!rewarded) return;

    // Scaling calculation proportional to current match
    const L = Math.max(1, state.level || 1, profile.records.bestLevel || 1);
    const rebirthMult = progressionManager.getRebirthCoinMultiplier();
    const roomBonusCalc = Math.round(L * 250 * rebirthMult);
    const floorCalc = Math.round(1000 * rebirthMult);

    // Tiers: Grande Jackpot (60%, 2.0x), Mega Jackpot (30%, 3.5x), Ultra Jackpot (10%, 5.0x)
    const roll = Math.random();
    let chosenTier: { tier: 'grand' | 'mega' | 'ultra'; mult: number };
    if (roll < 0.60) {
      chosenTier = { tier: 'grand', mult: 2.0 };
    } else if (roll < 0.90) {
      chosenTier = { tier: 'mega', mult: 3.5 };
    } else {
      chosenTier = { tier: 'ultra', mult: 5.0 };
    }

    const calculatedPrize = Math.max(
      floorCalc,
      Math.round(runCoinsEarned * chosenTier.mult) + roomBonusCalc
    );

    // Immediately credit coins via onClaimAdJackpot and play celebratory fanfare
    onClaimAdJackpot(calculatedPrize);
    soundManager.playJackpotWin();

    setJackpotWonResult({
      amount: calculatedPrize,
      tier: chosenTier.tier,
      mult: chosenTier.mult,
    });
  };

  const selectedSkinMeta =
    GLOVE_SKINS_CATALOG.find((s) => s.id === previewSkinId) || GLOVE_SKINS_CATALOG[0];
  const isSelectedSkinUnlocked = profile.unlockedSkins.includes(previewSkinId);
  const isSelectedSkinEquipped = profile.equippedSkin === previewSkinId;

  return (
    <div
      onPointerOver={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button')) {
          soundManager.playUiHover();
        }
      }}
      className="fixed inset-0 z-40 backdrop-blur-[5px] bg-black/30 pointer-events-none select-none overflow-hidden"
    >
      {/* TOP-LEFT: LANGUAGE TOGGLE & SOUND MUTE TOGGLE BUTTONS */}
      <div className="fixed top-5 left-6 z-40 pointer-events-auto flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleToggleLocale}
          className="cartoon-btn px-3.5 py-2 font-arcade text-xs flex items-center gap-1.5"
          title="Switch Language (PT/EN)"
        >
          <CartoonLanguageIcon className="h-5 w-5" />
          <span>{strings.langLabel}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleMute}
          className={`cartoon-btn ${
            isMuted ? 'cartoon-btn-red' : ''
          } h-10 w-10 flex items-center justify-center !rounded-full`}
          title={strings.soundLabel}
        >
          <CartoonSoundIcon muted={isMuted} className="h-5 w-5" />
        </button>
      </div>

      {/* TOP-CENTER: DAILY AD JACKPOT / LUCKY WHEEL BUTTON */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            switchGui('jackpot');
          }}
          className="cartoon-btn cartoon-badge-gold px-5 py-2 font-arcade text-sm flex items-center gap-2 animate-bounce cursor-pointer"
        >
          <CartoonJackpotIcon className="h-5 w-5" />
          <span>{strings.jackpotBtn}</span>
        </button>
      </div>

      {/* TOP-RIGHT: PAINTED BRONZE-AMBER COIN COUNTER CARD */}
      <div className="fixed top-5 right-6 z-40 pointer-events-auto flex items-center gap-3">
        <div className="cartoon-card flex items-center gap-2.5 px-5 py-2.5">
          <CartoonCoinIcon className="h-8 w-8 shrink-0" />
          <span className="font-arcade text-2xl leading-none text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
            {profile.coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* PILAR 2: LEFT COLUMN — 4 TEXTURED CARTOON UPGRADE CARDS WITH HANGING PRICE BADGE */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 pointer-events-auto">
        {UPGRADE_CATALOG.map((meta) => {
          const currentPct = progressionManager.getStatPercentage(meta.key);
          const cost = progressionManager.getUpgradeCost(meta.key);
          const canAfford = profile.coins >= cost;
          const isPopping = justBoughtKey === meta.key;

          const renderAttributeIcon = () => {
            switch (meta.key) {
              case 'moveSpeed':
                return <CartoonMoveSpeedIcon className="h-6 w-6 text-[#06b6d4] shrink-0" />;
              case 'punchForce':
                return <CartoonPunchForceIcon className="h-6 w-6 text-[#f59e0b] shrink-0" />;
              case 'punchSpeed':
                return <CartoonPunchSpeedIcon className="h-6 w-6 text-[#10b981] shrink-0" />;
              case 'ballForce':
                return <CartoonBallForceIcon className="h-6 w-6 text-[#ec4899] shrink-0" />;
            }
          };

          const getLocalizedTitle = () => {
            switch (meta.key) {
              case 'moveSpeed':
                return strings.upgradeMoveSpeed;
              case 'punchForce':
                return strings.upgradePunchForce;
              case 'punchSpeed':
                return strings.upgradePunchSpeed;
              case 'ballForce':
                return strings.upgradeBallForce;
            }
          };

          return (
            <button
              key={meta.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUpgradeCardClick(meta.key, canAfford);
              }}
              className={`cartoon-card relative w-60 text-left px-4 py-3.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                isPopping ? 'scale-105 ring-3 ring-yellow-300' : ''
              }`}
            >
              {/* 1) Title + Dedicated Attribute Icon */}
              <div className="flex items-center gap-2 font-arcade text-sm sm:text-base tracking-wider text-[#fff7c2] uppercase leading-none drop-shadow-[0_2px_0_#380905]">
                {renderAttributeIcon()}
                <span>{getLocalizedTitle()}</span>
              </div>

              {/* 2) Current Percentage Only (Recessed Mahogany Pill) */}
              <div
                className="mt-2 inline-flex items-center cartoon-pill-inset px-3 py-0.5 font-arcade text-xl leading-tight"
                style={{ color: meta.accentColor }}
              >
                {currentPct}%
              </div>

              {/* 3) Painted Cartoon Price Badge Isolated Wrapper (Fixes translateY(-50%) conflict) */}
              <div className="!absolute -right-9 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <div
                  className={`cartoon-btn pointer-events-auto ${
                    canAfford ? '' : 'cartoon-btn-purple'
                  } px-3 py-1.5 font-arcade text-xs flex items-center gap-1.5`}
                >
                  {canAfford ? (
                    <>
                      <CartoonCoinIcon className="h-4 w-4" />
                      <span>{cost.toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <CartoonVideoAdIcon className="h-4 w-4" />
                      <span>{strings.freeAdBadge}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* BOTTOM-LEFT: GLOSSY CARTOON ACCOUNT RESET BUTTON */}
      <div className="fixed bottom-6 left-6 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSuperBuffArmed(false);
            setPreviewSkinId('classic_red');
            setActiveGui('none');
            onResetAccount();
          }}
          className="cartoon-btn cartoon-btn-red px-4 py-3 font-arcade text-xs sm:text-sm flex items-center gap-2"
        >
          <CartoonResetIcon className="h-5 w-5" />
          <span>{strings.resetBtn}</span>
        </button>
      </div>

      {/* PILAR 3.1: BOTTOM-CENTER BAR — [BUFF] + [PLAY] + [SKINS] */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3.5 z-40 pointer-events-auto">
        {/* Ad Buff Buffer Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleArmBuffAd();
          }}
          disabled={busyAdAction === 'arm_buff'}
          className={`cartoon-btn ${
            superBuffArmed ? 'cartoon-btn-green ring-2 ring-yellow-300' : ''
          } px-5 py-3.5 font-arcade text-sm flex items-center gap-2`}
        >
          {superBuffArmed ? (
            <>
              <CartoonCheckIcon className="h-5 w-5" />
              <span>{strings.buffBtn}</span>
              <CartoonArrowRightIcon className="h-4 w-4" />
            </>
          ) : (
            <>
              <CartoonVideoAdIcon className="h-5 w-5" />
              <span>{strings.buffBtn}</span>
            </>
          )}
        </button>

        {/* Main PLAY Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePlayClick();
          }}
          className="cartoon-btn cartoon-btn-green px-8 py-3.5 font-arcade text-xl flex items-center gap-2.5"
        >
          {superBuffArmed && <CartoonBoltIcon className="h-6 w-6 animate-bounce" />}
          <CartoonPlayIcon className="h-6 w-6" />
          <span>{strings.playBtn}</span>
        </button>

        {/* SKINS Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewSkinId(profile.equippedSkin);
            switchGui('skins');
          }}
          className={`cartoon-btn ${
            activeGui === 'skins' ? 'cartoon-btn-purple ring-2 ring-yellow-300' : ''
          } px-5 py-3.5 font-arcade text-sm flex items-center gap-2`}
        >
          <CartoonGloveIcon className="h-5 w-5" />
          <span>{strings.skinsBtn}</span>
        </button>
      </div>

      {/* PILAR 3.2: BOTTOM-RIGHT BAR — [RECORDS] + [REBIRTH] + [BUDGETS] */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            switchGui('records');
          }}
          className={`cartoon-btn ${
            activeGui === 'records' ? 'cartoon-btn-green' : ''
          } px-4 py-3 font-arcade text-xs sm:text-sm flex items-center gap-2`}
        >
          <CartoonTrophyIcon className="h-5 w-5" />
          <span>{strings.recordsBtn}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            switchGui('rebirth');
          }}
          className={`cartoon-btn relative ${
            activeGui === 'rebirth' ? 'cartoon-btn-green' : 'cartoon-btn-purple'
          } px-4 py-3 font-arcade text-xs sm:text-sm flex items-center gap-2`}
        >
          <CartoonRebirthIcon className="h-5 w-5" />
          <span>{strings.rebirthBtn}</span>
          {canRebirthNow && (
            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full border-2 border-[#4a0e09] bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            switchGui('budgets');
          }}
          className={`cartoon-btn ${
            activeGui === 'budgets' ? 'cartoon-btn-green' : ''
          } px-4 py-3 font-arcade text-xs sm:text-sm flex items-center gap-2`}
        >
          <CartoonBoltIcon className="h-5 w-5" />
          <span>{strings.budgetsBtn}</span>
        </button>
      </div>

      {/* PILAR 3.3: CENTER POP-UP CARTOON WINDOW WITH RED [X] CLOSE BUTTON */}
      {activeGui !== 'none' && (
        <div
          onClick={() => switchGui('none')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="cartoon-window w-full max-w-md p-5"
          >
            {/* Window Header + Glossy Cartoon Red [X] Close Button */}
            <div className="flex items-center justify-between border-b-3 border-[#380905]/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5 font-arcade text-2xl tracking-wider text-[#fff36b] uppercase drop-shadow-[0_2px_0_#380905]">
                {activeGui === 'rebirth' && (
                  <>
                    <CartoonRebirthIcon className="h-7 w-7 text-[#fff36b]" />
                    <span>{strings.rebirthModalTitle}</span>
                  </>
                )}
                {activeGui === 'records' && (
                  <>
                    <CartoonTrophyIcon className="h-7 w-7 text-[#fff36b]" />
                    <span>{strings.recordsModalTitle}</span>
                  </>
                )}
                {activeGui === 'budgets' && (
                  <>
                    <CartoonBoltIcon className="h-7 w-7 text-[#fff36b]" />
                    <span>{strings.budgetsModalTitle}</span>
                  </>
                )}
                {activeGui === 'skins' && (
                  <>
                    <CartoonGloveIcon className="h-7 w-7 text-[#fff36b]" />
                    <span>{strings.skinsModalTitle}</span>
                  </>
                )}
                {activeGui === 'jackpot' && (
                  <>
                    <CartoonJackpotIcon className="h-7 w-7 text-[#fff36b]" />
                    <span>{strings.jackpotModalTitle}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => switchGui('none')}
                className="cartoon-btn cartoon-btn-red flex h-11 w-11 items-center justify-center !rounded-full"
              >
                <CartoonCloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* PILAR 4: REBIRTH GUI (RECESSED MAHOGANY CARTOON INFO CARDS — CURRENT -> GREEN NEXT) */}
            {activeGui === 'rebirth' && (
              <div className="flex flex-col gap-3">
                <div className="cartoon-card-cream flex items-center justify-between px-4 py-2.5 font-arcade text-lg">
                  <span className="flex items-center gap-2.5 text-[#fff36b] drop-shadow-[0_2px_0_#2b0704]">
                    <CartoonCoinIcon className="h-6 w-6" />
                    <span>{currentMult}X</span>
                  </span>
                  <CartoonArrowRightIcon className="h-5 w-5 text-[#f7c122]" />
                  <span className="cartoon-card-green px-3 py-0.5 text-base">{nextMult}X</span>
                </div>

                <div className="cartoon-card-cream flex items-center justify-between px-4 py-2.5 font-arcade text-lg">
                  <span className="flex items-center gap-2.5 text-[#fff36b] drop-shadow-[0_2px_0_#2b0704]">
                    <CartoonGloveIcon className="h-6 w-6 text-[#f7c122]" />
                    <span>{currentDmgPct}%</span>
                  </span>
                  <CartoonArrowRightIcon className="h-5 w-5 text-[#f7c122]" />
                  <span className="cartoon-card-green px-3 py-0.5 text-base">{nextDmgPct}%</span>
                </div>

                <div className="cartoon-card-cream flex items-center justify-between px-4 py-2.5 font-arcade text-lg">
                  <span className="flex items-center gap-2.5 text-[#fff36b] drop-shadow-[0_2px_0_#2b0704]">
                    <CartoonBudgetIcon id="plus_timer" className="h-6 w-6 text-[#38bdf8]" />
                    <span>+{currentBonusSec.toFixed(1)}s</span>
                  </span>
                  <CartoonArrowRightIcon className="h-5 w-5 text-[#f7c122]" />
                  <span className="cartoon-card-green px-3 py-0.5 text-base">
                    +{nextBonusSec.toFixed(1)}s
                  </span>
                </div>

                <div className="cartoon-card-cream flex items-center justify-between px-4 py-2.5 font-arcade text-lg">
                  <span className="flex items-center gap-2.5 text-[#fff36b] drop-shadow-[0_2px_0_#2b0704]">
                    <CartoonBoltIcon className="h-6 w-6 text-[#facc15]" />
                    <span>{currentSlots}</span>
                  </span>
                  <CartoonArrowRightIcon className="h-5 w-5 text-[#f7c122]" />
                  <span className="cartoon-card-green px-3 py-0.5 text-base">{nextSlots}</span>
                </div>

                {/* Room Target Cartoon Card */}
                <div
                  className={`${
                    roomReqMet ? 'cartoon-card-green' : 'cartoon-card-red'
                  } flex items-center justify-center gap-2 py-2.5 font-arcade text-base`}
                >
                  <CartoonDoorIcon className="h-5 w-5" />
                  <span>
                    {strings.rebirthRoomReqLabel}: {profile.records.bestLevel} / {targetRoom}
                  </span>
                </div>

                {/* High Coin Cost Rebirth Action Button */}
                <button
                  type="button"
                  onClick={() => onPerformRebirth()}
                  disabled={!canRebirthNow}
                  className={`cartoon-btn ${
                    canRebirthNow ? 'cartoon-btn-green' : 'cartoon-btn-disabled'
                  } mt-1 w-full py-3.5 font-arcade text-base flex items-center justify-center gap-2`}
                >
                  <CartoonRebirthIcon className="h-5 w-5" />
                  <span>{strings.rebirthActionBtn} •</span>
                  <CartoonCoinIcon className="h-5 w-5" />
                  <span>{rebirthCost.toLocaleString()}</span>
                </button>
              </div>
            )}

            {/* PILAR 5: RECORDS GUI (MAHOGANY CARTOON RECORD CARDS — TITLE DIRECTLY ABOVE ICON + PILL VALUE) */}
            {activeGui === 'records' && (
              <div className="grid grid-cols-2 gap-3.5">
                <div className="cartoon-card-cream flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                  <span className="text-[11px] sm:text-xs font-arcade tracking-wider text-amber-200/90 uppercase min-h-[20px] flex items-center justify-center">
                    {strings.statBestLevel}
                  </span>
                  <CartoonTrophyIcon className="h-10 w-10 text-[#facc15] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                  <span className="cartoon-pill-inset px-3.5 py-1 font-arcade text-xl text-[#facc15] min-w-[5.5rem] inline-flex items-center justify-center">
                    LV. {profile.records.bestLevel}
                  </span>
                </div>

                <div className="cartoon-card-cream flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                  <span className="text-[11px] sm:text-xs font-arcade tracking-wider text-amber-200/90 uppercase min-h-[20px] flex items-center justify-center">
                    {strings.statBestWalls}
                  </span>
                  <CartoonHammerIcon className="h-10 w-10 text-[#f87171] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                  <span className="cartoon-pill-inset px-3.5 py-1 font-arcade text-xl text-[#f87171] min-w-[5.5rem] inline-flex items-center justify-center">
                    {profile.records.bestWallsInRun}
                  </span>
                </div>

                <div className="cartoon-card-cream flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                  <span className="text-[11px] sm:text-xs font-arcade tracking-wider text-amber-200/90 uppercase min-h-[20px] flex items-center justify-center">
                    {strings.statMaxCombo}
                  </span>
                  <CartoonFlameIcon className="h-10 w-10 text-[#fb923c] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                  <span className="cartoon-pill-inset px-3.5 py-1 font-arcade text-xl text-[#fb923c] min-w-[5.5rem] inline-flex items-center justify-center">
                    X{profile.records.longestCombo}
                  </span>
                </div>

                <div className="cartoon-card-cream flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                  <span className="text-[11px] sm:text-xs font-arcade tracking-wider text-amber-200/90 uppercase min-h-[20px] flex items-center justify-center">
                    {strings.statBestScore}
                  </span>
                  <CartoonStarIcon className="h-10 w-10 text-[#34d399] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                  <span className="cartoon-pill-inset px-3.5 py-1 font-arcade text-lg text-[#34d399] min-w-[5.5rem] inline-flex items-center justify-center">
                    {profile.records.bestScore.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* PILAR 6: BUDGETS GUI (2 CARTOON SLOTS + 6 MAHOGANY CARTOON ITEM CARDS) */}
            {activeGui === 'budgets' && (
              <div className="flex flex-col gap-3.5">
                {/* 2 Slot Indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((slotIdx) => {
                    const isSlotLocked = slotIdx === 1 && rebirthCount < 1;
                    const equippedId = profile.equippedBudgets[slotIdx];
                    const equippedMeta = BUDGETS_CATALOG.find((b) => b.id === equippedId);

                    return (
                      <div
                        key={slotIdx}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 font-arcade text-xs ${
                          isSlotLocked
                            ? 'cartoon-btn cartoon-btn-disabled'
                            : equippedMeta
                            ? 'cartoon-card-green'
                            : 'cartoon-card-cream'
                        }`}
                      >
                        {isSlotLocked ? (
                          <>
                            <CartoonLockIcon className="h-4 w-4" />
                            <span>{strings.budgetLockedRebirth1}</span>
                          </>
                        ) : equippedMeta ? (
                          <>
                            <CartoonBudgetIcon id={equippedMeta.id} className="h-4 w-4" />
                            <span>{equippedMeta.title}</span>
                          </>
                        ) : (
                          <span>[ {strings.budgetSlotLabel} {slotIdx + 1} ]</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 6 Budgets Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {BUDGETS_CATALOG.map((b) => {
                    const isUnlocked = profile.unlockedBudgets.includes(b.id);
                    const isEquipped = profile.equippedBudgets.includes(b.id);
                    const canAfford = profile.coins >= b.cost;

                    return (
                      <div
                        key={b.id}
                        className={`cartoon-card-cream flex flex-col items-center justify-between gap-2 p-3 ${
                          isEquipped ? 'ring-3 ring-[#34d399]' : ''
                        }`}
                      >
                        <div style={{ color: b.accentColor }}>
                          <CartoonBudgetIcon id={b.id} className="h-9 w-9" />
                        </div>
                        <div
                          className="font-arcade text-xs text-center uppercase leading-tight drop-shadow-[0_2px_0_#2b0704]"
                          style={{ color: b.accentColor }}
                        >
                          {b.title}
                        </div>

                        <button
                          type="button"
                          onClick={() => onBuyOrToggleBudget(b.id)}
                          disabled={!isUnlocked && !canAfford}
                          className={`cartoon-btn ${
                            isEquipped
                              ? 'cartoon-btn-green'
                              : isUnlocked || canAfford
                              ? ''
                              : 'cartoon-btn-disabled'
                          } w-full py-1.5 font-arcade text-xs flex items-center justify-center gap-1.5`}
                        >
                          {isEquipped ? (
                            <>
                              <CartoonCheckIcon className="h-4 w-4" />
                              <span>{strings.budgetOn}</span>
                            </>
                          ) : isUnlocked ? (
                            <span>{strings.budgetEquip}</span>
                          ) : (
                            <>
                              <CartoonCoinIcon className="h-4 w-4" />
                              <span>{b.cost.toLocaleString()}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PILAR 7: SKINS GUI (REAL 3D ROTATING GLOVE + VANTABLACK SILHOUETTE + CARTOON THUMBNAILS) */}
            {activeGui === 'skins' && (
              <div className="flex flex-col items-center gap-3.5">
                {/* 3D Rotating Glove Showcase */}
                <GloveShowcase3D
                  skinId={previewSkinId}
                  isUnlocked={isSelectedSkinUnlocked}
                />

                {/* Selected Skin Name in Cartoon Inset Pill */}
                <div className="cartoon-pill-inset px-4 py-1 font-arcade text-base tracking-wider uppercase">
                  {isSelectedSkinUnlocked ? selectedSkinMeta.nameEn : strings.skinLocked}
                </div>

                {/* 5 Skin Thumbnails (Vantablack + Lock for locked skins) */}
                <div className="flex items-center justify-center gap-2.5">
                  {GLOVE_SKINS_CATALOG.map((skin) => {
                    const unlocked = profile.unlockedSkins.includes(skin.id);
                    const selected = previewSkinId === skin.id;

                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => {
                          soundManager.playUiClick();
                          setPreviewSkinId(skin.id);
                        }}
                        className={`cursor-pointer relative flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#4a0e09] shadow-[0_5px_0_#4a0e09] transition-transform ${
                          selected
                            ? 'scale-110 ring-3 ring-yellow-300'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: unlocked ? skin.primaryColor : '#000000',
                        }}
                      >
                        {unlocked ? (
                          <CartoonGloveIcon className="h-6 w-6 text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]" />
                        ) : (
                          <CartoonLockIcon className="h-5 w-5 text-neutral-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Poki-Style Acquisition / Equip Buttons */}
                <div className="w-full mt-1">
                  {isSelectedSkinEquipped ? (
                    <button
                      type="button"
                      disabled
                      className="cartoon-btn cartoon-btn-green flex w-full items-center justify-center gap-2 py-3 font-arcade text-sm"
                    >
                      <CartoonCheckIcon className="h-5 w-5" />
                      <span>{strings.skinEquipped}</span>
                    </button>
                  ) : isSelectedSkinUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onSelectOrBuySkin(previewSkinId)}
                      className="cartoon-btn w-full py-3 font-arcade text-sm"
                    >
                      {strings.skinEquip}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectOrBuySkin(previewSkinId)}
                        disabled={profile.coins < selectedSkinMeta.coinPrice}
                        className={`cartoon-btn ${
                          profile.coins >= selectedSkinMeta.coinPrice
                            ? ''
                            : 'cartoon-btn-disabled'
                        } py-3 font-arcade text-xs flex items-center justify-center gap-1.5`}
                      >
                        <CartoonCoinIcon className="h-4 w-4" />
                        <span>{selectedSkinMeta.coinPrice.toLocaleString()}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUnlockSkinAd(previewSkinId)}
                        disabled={busyAdAction === `skin_${previewSkinId}`}
                        className="cartoon-btn cartoon-btn-purple flex items-center justify-center gap-1.5 py-3 font-arcade text-xs"
                      >
                        <CartoonVideoAdIcon className="h-4 w-4" />
                        <span>{strings.skinUnlockAd}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PILAR 8: CELEBRATORY SCALED JACKPOT MODAL */}
            {activeGui === 'jackpot' && (
              <div className="flex flex-col items-center gap-4 text-center">
                {/* Celebratory Gold Banner Header */}
                <div className="cartoon-jackpot-banner w-full">
                  <CartoonJackpotIcon className="h-8 w-8 text-[#380905] shrink-0 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
                  <span className="text-base sm:text-lg font-arcade tracking-wider uppercase text-[#380905]">
                    {strings.jackpotModalTitle}
                  </span>
                  <CartoonTrophyIcon className="h-7 w-7 text-[#380905] shrink-0 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
                </div>

                <p className="font-arcade text-xs sm:text-sm text-amber-200/90 max-w-sm">
                  {strings.jackpotModalSub}
                </p>

                {/* Match Run Breakdown Card */}
                <div className="cartoon-card-cream w-full flex flex-col gap-2.5 p-3.5 text-center">
                  <div className="flex items-center justify-between px-2 font-arcade text-xs sm:text-sm">
                    <span className="flex items-center gap-1.5 text-amber-200/90">
                      <CartoonCoinIcon className="h-5 w-5 text-amber-400 shrink-0" />
                      {strings.jackpotMatchCoins}:
                    </span>
                    <span className="cartoon-pill-inset px-2.5 py-0.5 text-yellow-300 font-arcade">
                      +{runCoinsEarned.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 font-arcade text-xs sm:text-sm">
                    <span className="flex items-center gap-1.5 text-amber-200/90">
                      <CartoonTrophyIcon className="h-5 w-5 text-amber-400 shrink-0" />
                      {strings.jackpotRoomBonus} (Lv. {effectiveRoomLevel}):
                    </span>
                    <span className="cartoon-pill-inset px-2.5 py-0.5 text-amber-300 font-arcade">
                      +{roomBonus.toLocaleString()}
                    </span>
                  </div>

                  {currentMult > 1 && (
                    <div className="flex items-center justify-between px-2 font-arcade text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-300/90">
                        <CartoonRebirthIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                        {strings.rebirthCoinMultLabel}:
                      </span>
                      <span className="cartoon-pill-inset px-2.5 py-0.5 text-emerald-400 font-arcade">
                        {currentMult.toFixed(1)}X
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#380905]/40 pt-2 flex items-center justify-between px-2 font-arcade text-[11px] text-amber-200/70">
                    <span>{strings.jackpotSafetyFloor}:</span>
                    <span className="text-yellow-300/90">+{floorPrize.toLocaleString()}</span>
                  </div>
                </div>

                {/* Multiplier Tier Preview Badges */}
                <div className="grid grid-cols-3 gap-2 w-full font-arcade text-xs">
                  <div className="cartoon-pill-inset p-2 flex flex-col items-center">
                    <span className="text-[10px] text-blue-300 tracking-wider">
                      {strings.jackpotTierGrand}
                    </span>
                    <span className="text-blue-200 text-sm font-bold">2.0X</span>
                    <span className="text-[9px] text-amber-200/60">60%</span>
                  </div>
                  <div className="cartoon-pill-inset p-2 flex flex-col items-center">
                    <span className="text-[10px] text-purple-300 tracking-wider">
                      {strings.jackpotTierMega}
                    </span>
                    <span className="text-purple-200 text-sm font-bold">3.5X</span>
                    <span className="text-[9px] text-amber-200/60">30%</span>
                  </div>
                  <div className="cartoon-pill-inset p-2 flex flex-col items-center">
                    <span className="text-[10px] text-amber-300 tracking-wider">
                      {strings.jackpotTierUltra}
                    </span>
                    <span className="text-amber-300 text-sm font-bold">5.0X</span>
                    <span className="text-[9px] text-amber-200/60">10%</span>
                  </div>
                </div>

                {/* Victory Celebratory Banner (When won/claimed) */}
                {jackpotWonResult !== null && (
                  <div className="cartoon-jackpot-glow w-full p-4 flex flex-col items-center gap-2 animate-bounce">
                    <div className="flex items-center justify-center gap-2 text-amber-300 font-arcade text-sm sm:text-base tracking-wider uppercase">
                      <CartoonStarIcon className="h-5 w-5 text-amber-300 shrink-0 drop-shadow" />
                      <span>
                        {jackpotWonResult.tier === 'grand' && strings.jackpotTierGrand}
                        {jackpotWonResult.tier === 'mega' && strings.jackpotTierMega}
                        {jackpotWonResult.tier === 'ultra' && strings.jackpotTierUltra}
                        {' '}({jackpotWonResult.mult.toFixed(1)}X)
                      </span>
                      <CartoonStarIcon className="h-5 w-5 text-amber-300 shrink-0 drop-shadow" />
                    </div>

                    <div className="flex items-center justify-center gap-2 font-arcade text-2xl sm:text-3xl text-[#fff36b] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      <CartoonCoinIcon className="h-8 w-8 shrink-0" />
                      <span>+{jackpotWonResult.amount.toLocaleString()} {strings.jackpotCoinsSuffix}</span>
                    </div>

                    <div className="cartoon-pill-inset px-3.5 py-1 font-arcade text-[11px] sm:text-xs text-emerald-300 flex items-center justify-center gap-1.5">
                      <CartoonCheckIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{strings.jackpotCreditedNotice}</span>
                    </div>
                  </div>
                )}

                {/* Claim / Rewarded Ad Button */}
                <button
                  type="button"
                  onClick={handleClaimJackpot}
                  disabled={busyAdAction === 'jackpot_claim'}
                  className="cartoon-btn cartoon-btn-green w-full py-3.5 font-arcade text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
                >
                  <CartoonVideoAdIcon className="h-6 w-6" />
                  <span>
                    {busyAdAction === 'jackpot_claim'
                      ? strings.jackpotClaiming
                      : strings.jackpotClaimBtn}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
