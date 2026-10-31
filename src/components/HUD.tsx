/**
 * Top-Center HUD + Memoized Anime Speed Wedges +
 * Second Chance Revive (+12s + Super Smash) Modal +
 * Auto-Pause Overlay + Directional Radar (Zero Emojis — Procedural Cartoon Textures & Multi-Layer Vector Icons).
 */
import React, { useEffect, useState } from 'react';
import { GameState, GameEngine } from '../game/gameEngine';
import { soundManager } from '../game/audio';
import { progressionManager } from '../game/progression';
import { t } from '../game/i18n';
import { initCartoonUiTextures } from './cartoonUiTextures';
import {
  CartoonPlayIcon,
  CartoonPauseIcon,
  CartoonGearIcon,
  CartoonSoundOnIcon,
  CartoonSoundOffIcon,
  CartoonVideoAdIcon,
  CartoonCoinIcon,
  CartoonExplosionIcon,
  CartoonTimerIcon,
  CartoonRebirthIcon,
  CartoonSkullIcon,
  CartoonFlameIcon,
  CartoonBombIcon,
  CartoonStarIcon,
} from './CartoonIcons';

interface HUDProps {
  engine: GameEngine | null;
  state: GameState;
  onOpenMenu: () => void;
}

const SPEED_WEDGES = Array.from({ length: 36 }).map((_, idx) => {
  const baseAngle = (idx / 36) * Math.PI * 2;
  const spread = 0.014 + (idx % 3) * 0.008;
  const innerR = idx % 2 === 0 ? 330 : 385;
  const outerR = 760;

  const x1 = 500 + Math.cos(baseAngle) * innerR;
  const y1 = 500 + Math.sin(baseAngle) * innerR;
  const x2 = 500 + Math.cos(baseAngle - spread) * outerR;
  const y2 = 500 + Math.sin(baseAngle - spread) * outerR;
  const x3 = 500 + Math.cos(baseAngle + spread) * outerR;
  const y3 = 500 + Math.sin(baseAngle + spread) * outerR;

  return {
    id: idx,
    points: `${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}`,
    isPrimary: idx % 2 === 0,
  };
});

const MemoizedSpeedWedges = React.memo<{ isDashing: boolean }>(({ isDashing }) => (
  <svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
    <defs>
      <radialGradient id="speedWedgeGrad" cx="50%" cy="50%" r="50%">
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        <stop
          offset="82%"
          stopColor={isDashing ? '#22d3ee' : '#facc15'}
          stopOpacity="0.45"
        />
        <stop
          offset="100%"
          stopColor={isDashing ? '#ffffff' : '#ff2244'}
          stopOpacity="0.88"
        />
      </radialGradient>
    </defs>
    {SPEED_WEDGES.map((w) => (
      <polygon
        key={w.id}
        points={w.points}
        fill="url(#speedWedgeGrad)"
        opacity={w.isPrimary ? 0.85 : 0.45}
      />
    ))}
  </svg>
));

export const HUD: React.FC<HUDProps> = ({ engine, state, onOpenMenu }) => {
  const [, setSoundTick] = useState(0);

  useEffect(() => {
    initCartoonUiTextures();
  }, []);

  if (state.status !== 'playing') return null;

  const strings = t();
  const isMuted = soundManager.getMuted();
  const rebirthMult = progressionManager.getRebirthCoinMultiplier();

  const toggleSound = () => {
    soundManager.toggleMute();
    setSoundTick((v) => v + 1);
  };

  const formatTime = (secs: number) => {
    const clamped = Math.max(0, secs);
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    const tenths = Math.floor((clamped % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  const percentage =
    state.totalWalls > 0
      ? Math.min(100, Math.round((state.wallsDestroyed / state.totalWalls) * 100))
      : 0;

  const isLowTime = state.timeRemaining <= 6.0;
  const showFrenzyVignette = state.isDashing || state.combo >= 3 || state.isRageFull;
  const pulseAlpha = Math.min(0.75, state.screenPulseIntensity * 0.65);

  const biomeBadge =
    state.biome === 'poolrooms'
      ? strings.biomePoolrooms
      : state.biome === 'pipedreams'
      ? strings.biomePipeDreams
      : state.biome === 'hospital'
      ? strings.biomeHospital
      : strings.biomeLevel0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden">
      {/* 1. DYNAMIC IMPACT SHOCKWAVE PULSE */}
      {state.screenPulseIntensity > 0.02 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 44%, ${state.screenPulseColor}33 78%, ${state.screenPulseColor}88 100%)`,
            opacity: pulseAlpha,
          }}
        >
          <svg className="h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <circle
              cx="500"
              cy="500"
              r={260 + (1 - state.screenPulseIntensity) * 340}
              fill="none"
              stroke={state.screenPulseColor}
              strokeWidth={12 * state.screenPulseIntensity}
              opacity={state.screenPulseIntensity * 0.85}
            />
            <circle
              cx="500"
              cy="500"
              r={190 + (1 - state.screenPulseIntensity) * 420}
              fill="none"
              stroke="#ffffff"
              strokeWidth={5 * state.screenPulseIntensity}
              opacity={state.screenPulseIntensity * 0.9}
            />
          </svg>
        </div>
      )}

      {/* 2. JUICE #9: MEMOIZED ANIME SPEED WEDGES */}
      {showFrenzyVignette && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{
            background: state.isDashing
              ? 'radial-gradient(circle, transparent 50%, rgba(6, 182, 212, 0.16) 76%, rgba(8, 145, 178, 0.45) 100%)'
              : state.isRageFull
              ? 'radial-gradient(circle, transparent 48%, rgba(250, 204, 21, 0.18) 76%, rgba(234, 88, 12, 0.48) 100%)'
              : 'radial-gradient(circle, transparent 54%, rgba(239, 68, 68, 0.14) 80%, rgba(185, 28, 28, 0.38) 100%)',
          }}
        >
          <MemoizedSpeedWedges isDashing={state.isDashing} />
        </div>
      )}

      {/* 3. ENTITY INTERFERENCE VIGNETTE */}
      {state.entitiesAlive > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow:
              'inset 0 0 65px rgba(0, 0, 0, 0.78), inset 0 0 22px rgba(225, 29, 72, 0.32)',
          }}
        />
      )}

      {/* TOP-CENTER TEXTURED CARTOON HUD CARD: PERCENTAGE OF WALLS BROKEN + COUNTDOWN TIMER */}
      <div className="pointer-events-auto mx-auto flex flex-col items-center">
        <div className="cartoon-card flex items-center gap-3 px-4 py-2.5 min-w-[330px] sm:min-w-[560px]">
          {/* Level Badge */}
          <div className="cartoon-card-cream flex flex-col items-center justify-center px-3 py-1">
            <span className="text-[9px] font-black uppercase tracking-tighter leading-none text-amber-200/80">
              {state.isJackpotFloor ? 'JACKPOT' : strings.roomLabel}
            </span>
            <span className="font-arcade text-sm leading-tight text-[#fff36b]">
              NV.{state.level}
            </span>
          </div>

          {/* Wall Destruction / Jackpot Coin Shower Bar */}
          <div className="flex-1">
            {state.isJackpotFloor ? (
              <>
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5 font-arcade tracking-wide text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
                    <CartoonCoinIcon className="h-4 w-4" />
                    <span>{strings.jackpotVaultFloorAlert}</span>
                  </span>
                  <span className="font-arcade text-xs text-[#4ade80] drop-shadow-[0_2px_0_#0b3b19]">
                    +{state.runCoinsEarned.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 h-4 w-full overflow-hidden rounded-full border-2 border-[#380905] bg-[#2b0704] p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-emerald-400 transition-all duration-100"
                    style={{
                      width: `${Math.min(100, Math.max(8, (state.timeRemaining / 16.0) * 100))}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5 font-arcade tracking-wide text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
                    <CartoonExplosionIcon className="h-4 w-4 text-[#facc15]" />
                    <span>
                      {percentage}% {strings.brokenPct}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-100">
                    {state.wallsDestroyed}/{state.totalWalls} {strings.wallsUnit}
                  </span>
                </div>

                <div className="mt-1 h-4 w-full overflow-hidden rounded-full border-2 border-[#380905] bg-[#2b0704] p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 transition-all duration-150"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex flex-col items-center justify-center px-3 py-1 ${
              state.isJackpotFloor
                ? 'cartoon-card-green'
                : isLowTime
                ? 'cartoon-card-red animate-pulse'
                : 'cartoon-card-cream'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest opacity-85">
              {state.isJackpotFloor ? strings.bonusLabel : strings.timerLabel}
            </span>
            <span className="flex items-center gap-1 font-arcade text-sm tracking-wider">
              <CartoonTimerIcon className="h-3.5 w-3.5" />
              <span>{formatTime(state.timeRemaining)}</span>
            </span>
          </div>

          {/* Coins, Lobby [TAB] & Mute Cartoon Buttons */}
          <div className="flex items-center gap-2 pl-1 border-l-2 border-[#380905]/50">
            <div className="hidden sm:flex items-center gap-1.5 cartoon-pill-inset px-2.5 py-1">
              <CartoonCoinIcon className="h-4 w-4" />
              <span className="font-arcade text-xs">{state.coins.toLocaleString()}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playModalClose();
                onOpenMenu();
              }}
              className="cartoon-btn flex h-9 w-9 items-center justify-center !rounded-full"
              title={strings.upgradesBtn}
            >
              <CartoonGearIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleSound}
              className={`cartoon-btn ${
                isMuted ? 'cartoon-btn-red' : ''
              } flex h-9 w-9 items-center justify-center !rounded-full`}
              title="Mute [M]"
            >
              {isMuted ? (
                <CartoonSoundOffIcon className="h-5 w-5" />
              ) : (
                <CartoonSoundOnIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Sub-banners: Jackpot Banner / Biome Badge / Rebirth Multiplier / Boss HP / Entity Threat / Combo / Ball / Super Smash */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {state.isJackpotFloor ? (
            <div className="cartoon-btn flex items-center gap-1.5 px-4 py-1 font-arcade text-xs pointer-events-none animate-bounce">
              <CartoonCoinIcon className="h-4 w-4" />
              <span>{strings.jackpotVaultFloorSub}</span>
            </div>
          ) : (
            <div className="cartoon-card-cream px-3 py-0.5 font-arcade text-[10px] text-[#fff36b]">
              {biomeBadge}
            </div>
          )}

          {rebirthMult > 1 && (
            <div className="cartoon-btn cartoon-btn-purple flex items-center gap-1 px-3 py-0.5 font-arcade text-[10px] pointer-events-none">
              <CartoonRebirthIcon className="h-3.5 w-3.5" />
              <span>REBIRTH {rebirthMult}X</span>
            </div>
          )}

          {state.bossAlive && state.bossHealth && (
            <div className="cartoon-card-red flex flex-col items-center px-4 py-1.5">
              <div className="flex items-center gap-2 font-arcade text-xs text-white">
                <CartoonSkullIcon className="h-4 w-4 text-yellow-300" />
                <span>{strings.bossAlert}</span>
              </div>
              <div className="mt-1 h-3 w-64 overflow-hidden rounded-full border-2 border-[#380905] bg-neutral-900">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 transition-all duration-100"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((state.bossHealth.current / state.bossHealth.max) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {state.entitiesAlive > 0 && !state.bossAlive && (
            <div className="cartoon-card-red flex items-center gap-1.5 px-3 py-1 font-arcade text-xs text-white">
              <CartoonSkullIcon className="h-4 w-4 text-yellow-200" />
              <span>
                {state.entitiesAlive}{' '}
                {state.entitiesAlive > 1
                  ? strings.entitiesAlertMulti
                  : strings.entitiesAlertSingle}
              </span>
            </div>
          )}

          {state.combo > 1 && (
            <div className="cartoon-card flex items-center gap-1.5 px-3 py-1 font-arcade text-xs text-[#fff36b]">
              <CartoonFlameIcon className="h-4 w-4 text-orange-400" />
              <span>COMBO X{state.combo}</span>
            </div>
          )}

          {state.isRageFull && (
            <div className="cartoon-card-green animate-bounce px-3 py-1 font-arcade text-xs">
              {strings.rageReady}
            </div>
          )}

          {state.hasBall && (
            <div className="cartoon-card-red flex items-center gap-2 px-4 py-1">
              <CartoonBombIcon className="h-4 w-4 text-yellow-200" />
              <span className="font-arcade text-xs text-white tracking-wide">
                {strings.ballHeldBanner}
              </span>
            </div>
          )}

          {state.activePowerUp && (
            <div className="cartoon-card-green flex items-center gap-1.5 px-3 py-1 font-arcade text-xs">
              <CartoonStarIcon className="h-4 w-4" />
              <span>{state.activePowerUp}</span>
            </div>
          )}
        </div>
      </div>

      {/* JUICE #10: SHORT LEVEL-UP ROOM TRANSITION BANNER */}
      {state.levelTransition && state.levelTransition.active && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-amber-400/20 backdrop-blur-[2px]">
          <div className="cartoon-window animate-bounce px-8 py-6 text-center">
            <div className="cartoon-card-cream inline-block px-3 py-0.5 font-arcade text-xs text-[#fff36b]">
              {strings.roomLabel} {state.levelTransition.clearedLevel} • {strings.roomClearedBadge}
            </div>
            <h2 className="mt-2 font-arcade text-3xl sm:text-4xl text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
              {strings.nextLevelTitle} {state.levelTransition.nextLevel}!
            </h2>
            <div className="mt-3 flex items-center justify-center gap-4 font-arcade text-sm">
              <span className="cartoon-card-green px-3 py-1">
                +{state.levelTransition.bonusTime}s {strings.bonusTimerTag}
              </span>
              <span className="cartoon-card-cream px-3 py-1 text-[#fff36b]">
                +{state.levelTransition.bonusCoins} {strings.bonusCoinsTag}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DEATH SCREEN MODAL: CHOOSE (+12s REVIVE AD) OR (ACCEPT DEFEAT + 2X COINS AD) */}
      {state.revivePromptActive && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="cartoon-window w-full max-w-md p-6 text-center">
            <div className="cartoon-card-red mx-auto inline-flex items-center gap-2 px-3.5 py-1 font-arcade text-xs text-white animate-pulse">
              <CartoonTimerIcon className="h-4 w-4" />
              <span>{Math.ceil(state.revivePromptCountdown)}s</span>
            </div>

            <h2 className="mt-3 font-arcade text-2xl sm:text-3xl text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
              {strings.reviveTitle}
            </h2>

            {/* Run Coins Collected Summary */}
            <div className="mt-2 mx-auto inline-flex items-center gap-2 cartoon-card-cream px-4 py-1.5 font-arcade text-lg text-[#fff36b]">
              <CartoonCoinIcon className="h-6 w-6" />
              <span>+{state.runCoinsEarned.toLocaleString()}</span>
            </div>

            {/* Countdown Progress Bar */}
            <div className="my-4 h-4 w-full overflow-hidden rounded-full border-2 border-[#380905] bg-[#2b0704] p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-300 to-emerald-400 transition-all duration-75"
                style={{ width: `${Math.min(100, (state.revivePromptCountdown / 8.0) * 100)}%` }}
              />
            </div>

            <div className="flex flex-col gap-3">
              {/* OPTION 1: Watch Ad to Revive (+12s + Super Smash) */}
              {!state.reviveUsedInRun && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine?.triggerReviveAd();
                  }}
                  className="cartoon-btn cartoon-btn-green flex w-full items-center justify-center gap-2.5 px-5 py-3.5 font-arcade text-xs sm:text-sm"
                >
                  <CartoonVideoAdIcon className="h-5 w-5 animate-bounce" />
                  <span>{strings.reviveAdBtn}</span>
                </button>
              )}

              {/* OPTION 2: Accept Defeat & Watch Ad for 2X Run Coins! */}
              {state.runCoinsEarned > 0 && !state.doubleRunCoinsClaimed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    engine?.acceptDefeatWithDoubleCoinsAd();
                  }}
                  className="cartoon-btn flex w-full items-center justify-center gap-2 px-5 py-3.5 font-arcade text-xs sm:text-sm"
                >
                  <CartoonVideoAdIcon className="h-5 w-5" />
                  <span>{strings.doubleRunCoinsBtn} (+{(state.runCoinsEarned * 2).toLocaleString()})</span>
                  <CartoonCoinIcon className="h-5 w-5" />
                </button>
              )}

              {/* OPTION 3: Accept Defeat without Ad (Return to Lobby) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  engine?.declineReviveOffer();
                }}
                className="cartoon-btn cartoon-btn-red mx-auto px-6 py-2 font-arcade text-xs"
              >
                {strings.reviveGiveUpBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-PAUSE MODAL WHEN POINTER LOCK IS RELEASED (ESC) */}
      {state.isPaused && !state.levelTransition && !state.revivePromptActive && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs">
          <div className="cartoon-window flex flex-col items-center p-7 text-center">
            <div className="flex items-center gap-2.5 font-arcade text-2xl sm:text-3xl text-[#fff36b] drop-shadow-[0_2px_0_#380905]">
              <CartoonPauseIcon className="h-7 w-7 text-[#fff36b]" />
              <span>{strings.pausedTitle}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  engine?.resumeGame();
                }}
                className="cartoon-btn cartoon-btn-green flex items-center gap-2 px-6 py-3 font-arcade text-xs sm:text-sm"
              >
                <CartoonPlayIcon className="h-5 w-5" />
                <span>{strings.resumeBtn}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMenu();
                }}
                className="cartoon-btn flex items-center gap-2 px-6 py-3 font-arcade text-xs sm:text-sm"
              >
                <CartoonGearIcon className="h-5 w-5" />
                <span>{strings.openWorkshopBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTER VIEWPORT: TACTILE AIMING RETICLE, DIRECTIONAL RADAR ARROW & ENTITY INSPECTOR */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {state.radarAngle !== null && !state.aimingAtWall && (
          <div
            className="absolute flex h-28 w-28 items-center justify-center"
            style={{
              transform: `rotate(${state.radarAngle}rad)`,
            }}
          >
            <div className="absolute -top-3 flex flex-col items-center">
              <div className="h-0 w-0 border-x-[9px] border-b-[16px] border-x-transparent border-b-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]" />
            </div>
          </div>
        )}

        <div
          className={`relative flex items-center justify-center transition-transform duration-100 ${
            state.aimingAtEntity ? 'scale-150' : state.aimingAtWall ? 'scale-125' : 'scale-100'
          }`}
        >
          <div
            className={`h-5 w-5 rounded-full border-2 transition-colors ${
              state.aimingAtEntity
                ? 'border-white bg-red-600/30 shadow-[0_0_12px_#ffffff]'
                : state.aimingAtWall
                ? 'border-red-500 shadow-[0_0_8px_#ef4444]'
                : 'border-white/80 shadow-[0_0_4px_#000000]'
            }`}
          />
          <div
            className={`absolute h-1.5 w-1.5 rounded-full ${
              state.aimingAtEntity
                ? 'bg-white'
                : state.aimingAtWall
                ? 'bg-red-500'
                : 'bg-amber-300'
            }`}
          />
        </div>

        {state.radarAngle !== null && !state.aimingAtWall && (
          <div className="cartoon-card-cream absolute top-[56%] flex items-center gap-1.5 px-3 py-0.5 font-arcade text-[10px] text-[#fff36b]">
            <span>
              {state.bossAlive
                ? strings.bossLabel
                : `${strings.lastWallsRadar} (${state.totalWalls - state.wallsDestroyed})`}
            </span>
          </div>
        )}

        {state.aimingAtEntity && state.targetEntityHealth && (
          <div className="cartoon-card-red absolute top-[54%] flex flex-col items-center px-3 py-1">
            <span className="flex items-center gap-1.5 font-arcade text-[10px] text-white">
              <CartoonSkullIcon className="h-3.5 w-3.5" />
              <span>
                {state.targetEntityHealth.isBoss
                  ? strings.bossLabel
                  : strings.entityLabel}{' '}
                {state.targetEntityHealth.isBuilding ? strings.buildingTag : ''}
              </span>
            </span>
            <div className="mt-1 h-2 w-28 rounded-full border border-[#380905] bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-yellow-300 transition-all duration-75"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (state.targetEntityHealth.current / state.targetEntityHealth.max) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {!state.isPointerLocked &&
          !state.isPaused &&
          !state.levelTransition &&
          !state.revivePromptActive && (
            <div className="cartoon-card-cream absolute top-[62%] px-4 py-2 font-arcade text-xs text-[#fff36b] hidden md:block">
              {strings.clickToLock}
            </div>
          )}
      </div>
    </div>
  );
};
