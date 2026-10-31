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

    // Touch look drag handler on canvas container for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouchingLook = false;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > window.innerWidth * 0.35 || t.clientY < window.innerHeight * 0.6) {
        isTouchingLook = true;
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        soundManager.init();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingLook || !engineRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      touchStartX = t.clientX;
      touchStartY = t.clientY;

      const touchSensitivity = 0.0045;
      engineRef.current.rotateCamera(dx * touchSensitivity, dy * touchSensitivity);
    };

    const handleTouchEnd = () => {
      isTouchingLook = false;
    };

    const dom = mountRef.current;
    dom.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      dom.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
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

      {/* Mobile Touch Controls Overlay */}
      {gameState.status === 'playing' && !gameState.isPaused && !gameState.revivePromptActive && (
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
