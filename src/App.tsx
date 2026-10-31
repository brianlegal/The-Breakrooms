/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameState } from './game/gameEngine';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { GameModal } from './components/GameModal';
import { soundManager } from './game/audio';
import {
  progressionManager,
  UpgradeKey,
  GloveSkinId,
  BudgetId,
} from './game/progression';
import { onLocaleChange } from './game/i18n';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [, setLocaleVersion] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia?.('(pointer: coarse)').matches === true
    );
  });

  const initialProfile = progressionManager.getProfile();
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    biome: 'level0',
    isJackpotFloor: false,
    wallsDestroyed: 0,
    totalWalls: 8,
    runWallsDestroyed: 0,
    entitiesAlive: 0,
    bossAlive: false,
    runEntitiesKilled: 0,
    score: 0,
    coins: initialProfile.coins,
    runCoinsEarned: 0,
    doubleRunCoinsClaimed: false,
    combo: 0,
    maxComboInRun: 0,
    comboTimer: 0,
    rage: 25,
    isRageFull: false,
    status: 'menu',
    isPaused: false,
    revivePromptActive: false,
    revivePromptCountdown: 0,
    reviveUsedInRun: false,
    timeRemaining: 15,
    elapsedTime: 0,
    activePowerUp: null,
    gloveScale: 1.0,
    isGolden: false,
    isPointerLocked: false,
    aimingAtWall: false,
    aimingAtEntity: false,
    radarAngle: null,
    playerGridPos: { x: 0, z: 0 },
    dashCooldown: 0,
    isGrounded: true,
    isDashing: false,
    fov: 105,
    hasBall: false,
    isNewRecord: false,
    screenPulseIntensity: 0,
    screenPulseColor: '#facc15',
    levelTransition: null,
    profile: initialProfile,
  });

  useEffect(() => {
    const unsub = onLocaleChange(() => {
      setLocaleVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Initialize 3D Game Engine once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new GameEngine(mountRef.current, (updatedState) => {
      setGameState(updatedState);
    });

    engineRef.current = engine;
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__GAME_ENGINE__ = engine;
    }

    // Universal reactive touch detection for convertible Chromebooks, iPads, and tablets
    const detectTouch = () => {
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        setIsTouchDevice(true);
      }
    };
    const onFirstTouch = () => setIsTouchDevice(true);
    detectTouch();
    window.addEventListener('touchstart', onFirstTouch, { passive: true });
    window.addEventListener('resize', detectTouch);

    // Multi-touch isolated look drag handler on canvas container (ignores touches on virtual buttons/joystick)
    let lookTouchId: number | null = null;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (lookTouchId !== null) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-touch-ui="true"]') || target?.closest('button')) {
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        // Ignore lower-left floating joystick zone; allow camera drag anywhere else on canvas
        const inLeftJoystickZone =
          t.clientX < window.innerWidth * 0.44 && t.clientY > window.innerHeight * 0.44;
        if (!inLeftJoystickZone) {
          lookTouchId = t.identifier;
          touchStartX = t.clientX;
          touchStartY = t.clientY;
          soundManager.init();
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lookTouchId === null || !engineRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === lookTouchId) {
          const dx = t.clientX - touchStartX;
          const dy = t.clientY - touchStartY;
          touchStartX = t.clientX;
          touchStartY = t.clientY;

          const touchSensitivity = 0.0045;
          engineRef.current.rotateCamera(dx * touchSensitivity, dy * touchSensitivity);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
          break;
        }
      }
    };

    const dom = mountRef.current;
    dom.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onFirstTouch);
      window.removeEventListener('resize', detectTouch);
      dom.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartRun = (startLevel = 1, withSuperBuff = false) => {
    soundManager.init();
    engineRef.current?.startRun(startLevel, withSuperBuff);
  };

  const handleBuyUpgrade = (key: UpgradeKey) => {
    soundManager.init();
    engineRef.current?.buyUpgrade(key);
  };

  const handleFreeAdUpgrade = (key: UpgradeKey) => {
    soundManager.init();
    engineRef.current?.grantFreeAdUpgrade(key);
  };

  const handlePerformRebirth = () => {
    soundManager.init();
    engineRef.current?.performRebirth();
  };

  const handleBuyOrToggleBudget = (budgetId: BudgetId) => {
    soundManager.init();
    engineRef.current?.buyOrToggleBudget(budgetId);
  };

  const handleDoubleRunCoins = () => {
    soundManager.init();
    engineRef.current?.claimDoubleRunCoins();
  };

  const handleSelectOrBuySkin = (skinId: GloveSkinId) => {
    soundManager.init();
    engineRef.current?.selectOrBuySkin(skinId);
  };

  const handleUnlockSkinViaAd = (skinId: GloveSkinId) => {
    soundManager.init();
    engineRef.current?.unlockSkinViaAd(skinId);
  };

  const handleClaimAdJackpot = (rewardCoins: number) => {
    soundManager.init();
    engineRef.current?.claimAdJackpot(rewardCoins);
  };

  const handleResetAccount = () => {
    soundManager.init();
    engineRef.current?.resetAccount();
  };

  const handleOpenMenu = () => {
    engineRef.current?.openMenu();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 cursor-crosshair touch-none"
      />

      {/* Top-Center HUD Overlay, Revive Ad Modal & Directional Radar */}
      <HUD
        engine={engineRef.current}
        state={gameState}
        onOpenMenu={handleOpenMenu}
      />

      {/* Universal Touch / Tablet / Hybrid Chromebook Controls Overlay */}
      {isTouchDevice &&
        gameState.status === 'playing' &&
        !gameState.isPaused &&
        !gameState.revivePromptActive && (
          <TouchControls
            engine={engineRef.current}
            canSuperSmash={gameState.isRageFull}
            hasBall={gameState.hasBall}
          />
        )}

      {/* Level 0 Blurred Corridor Lobby & Pop-up GUI System */}
      <GameModal
        state={gameState}
        onStartRun={handleStartRun}
        onBuyUpgrade={handleBuyUpgrade}
        onFreeAdUpgrade={handleFreeAdUpgrade}
        onPerformRebirth={handlePerformRebirth}
        onBuyOrToggleBudget={handleBuyOrToggleBudget}
        onDoubleRunCoins={handleDoubleRunCoins}
        onSelectOrBuySkin={handleSelectOrBuySkin}
        onUnlockSkinViaAd={handleUnlockSkinViaAd}
        onClaimAdJackpot={handleClaimAdJackpot}
        onResetAccount={handleResetAccount}
      />
    </div>
  );
}
