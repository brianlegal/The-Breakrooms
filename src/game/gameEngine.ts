/**
 * Core Game Engine for Backrooms Wall Breaker 3D.
 * Integrates:
 * - 4 Distinct Biomes: Level 0 (Lv. 1–3), Poolrooms (Lv. 4–6), Pipe Dreams (Lv. 7–9), Hospital Level "!" (Lv. 10+)
 * - 4-Hit Boxing Combo (Jab -> Cross -> Hook -> Uppercut) + Hold Left Click Continuous Turbo-Punch
 * - Rebirth ("No-Clip Dimensional") Permanent Multipliers (Coins, Timer +1.5s, Base Damage +25%)
 * - 4 Rewarded Ad Touchpoints: Second Chance Revive (+12s + Super Smash), 2x Run Coins, Free Lightning Upgrade, Mega Start Buff (25s)
 * - Poki & CrazyGames SDK lifecycle (`gameplayStart`, `gameplayStop`, `rewardedBreak`) & Auto-Pause on Pointer-Lock loss
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundManager } from './audio';
import { PlayerArms, PunchType } from './playerArms';
import { FractureEngine } from './destruction';
import { ComicEffectsManager } from './comicEffects';
import { BackroomsWorld, DestructibleWall } from './backrooms';
import { BallManager } from './ballPhysics';
import { SkeletalEntityManager, SkeletalEntity } from './entities';
import { CoinDropAgent } from './coinAgent';
import {
  progressionManager,
  ProgressionManager,
  PlayerProfile,
  UpgradeKey,
  GloveSkinId,
  BudgetId,
} from './progression';
import { BiomeType } from './textures';
import { portalSDK } from './portalSdk';
import { t } from './i18n';

export interface LevelTransitionInfo {
  active: boolean;
  clearedLevel: number;
  nextLevel: number;
  bonusTime: number;
  bonusCoins: number;
  nextWallsCount: number;
}

export interface GameState {
  level: number;
  biome: BiomeType;
  isJackpotFloor: boolean;
  wallsDestroyed: number;
  totalWalls: number;
  runWallsDestroyed: number;
  entitiesAlive: number;
  bossAlive: boolean;
  bossHealth?: { current: number; max: number };
  runEntitiesKilled: number;
  score: number;
  coins: number;
  runCoinsEarned: number;
  doubleRunCoinsClaimed: boolean;
  combo: number;
  maxComboInRun: number;
  comboTimer: number;
  rage: number;
  isRageFull: boolean;
  status: 'menu' | 'playing' | 'gameover';
  isPaused: boolean;
  revivePromptActive: boolean;
  revivePromptCountdown: number;
  reviveUsedInRun: boolean;
  timeRemaining: number;
  elapsedTime: number;
  activePowerUp: string | null;
  gloveScale: number;
  isGolden: boolean;
  isPointerLocked: boolean;
  aimingAtWall: boolean;
  aimingAtEntity: boolean;
  targetWallHealth?: { current: number; max: number; variant: string; isIndestructible?: boolean };
  targetEntityHealth?: { current: number; max: number; isBuilding: boolean; isBoss?: boolean };
  radarAngle: number | null;
  playerGridPos: { x: number; z: number };
  dashCooldown: number;
  isGrounded: boolean;
  isDashing: boolean;
  fov: number;
  hasBall: boolean;
  isNewRecord: boolean;
  screenPulseIntensity: number;
  screenPulseColor: string;
  levelTransition: LevelTransitionInfo | null;
  profile: PlayerProfile;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Subsystems
  public world: BackroomsWorld;
  public arms: PlayerArms;
  public fractureEngine: FractureEngine;
  public comicEffects: ComicEffectsManager;
  public ballManager: BallManager;
  public entityManager: SkeletalEntityManager;
  public coinAgent: CoinDropAgent;

  // Player Kinematics
  public playerPosition = new THREE.Vector3(2.0, 1.6, 2.0);
  public playerVelocity = new THREE.Vector3();
  public cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ');
  private moveInput = new THREE.Vector2();
  private keyboardMoveInput = new THREE.Vector2();
  private touchMoveInput = new THREE.Vector2();
  private keyboardTurnInput = 0;
  private isWalking = false;
  private baseMoveSpeed = 5.4;
  private footstepTimer = 0;
  // Electric Hazard Wall 0.5s Shock Paralysis & Immobilization Timer
  private shockParalysisTimer = 0;

  // Jump & Gravity Physics
  public isGrounded = true;
  private gravity = -24.0;
  private jumpForce = 8.8;
  private standingHeight = 1.6;

  // Dash & Camera Roll (Juice #5) - FOV strictly locked at 105
  private dashCooldownTimer = 0;
  private dashDurationTimer = 0;
  private dashDirection = new THREE.Vector3();
  private currentCameraRoll = 0;
  private readonly lockedFov = 105;

  // 4-Hit Boxing Combo Alternation Index & Continuous Hold-to-Punch (Mouse, Keyboard, or Touch)
  private comboStrikeIndex = 0;
  private isLeftMouseDown = false;
  private isKeyPunchHeld = false;
  private isTouchPunchHeld = false;
  private hasLockedPointerInRun = false;
  private hasInteractedInRun = false;
  private hudSyncAccumulator = 0;

  // Second Chance Revive & Record-Breaking Jackpot tracking
  private reviveUsedInRun = false;
  private isReviveAdPlaying = false;
  private runStartingBestLevel = 1;
  private hasTriggeredRecordJackpotInRun = false;

  // Power-ups & temporary buffs
  private powerupDamageMult = 1.0;
  private gloveScale = 1.0;
  private isGolden = false;
  private goldenTimer = 0;
  private superMultiBallTimer = 0;
  private speedBoostTimer = 0;

  // Level transition timer (Juice #10)
  private transitionTimer = 0;
  private lastUrgentSecond = -1;
  private lastReviveUrgentSecond = -1;

  // Game tracking state
  public state: GameState;
  private onStateChange?: (state: GameState) => void;

  // Render loop tracking
  private isSoftwareGl: boolean;
  private animFrameId = 0;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private isRunning = false;

  constructor(container: HTMLElement, onStateChange?: (state: GameState) => void) {
    this.container = container;
    this.onStateChange = onStateChange;

    portalSDK.init();

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8a356);
    this.scene.fog = new THREE.FogExp2(0xb8a356, 0.038);

    this.camera = new THREE.PerspectiveCamera(
      this.lockedFov,
      container.clientWidth / container.clientHeight,
      0.1,
      90
    );
    this.camera.position.copy(this.playerPosition);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xfffae0, 0x8a7238, 0.95);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5cc, 1.25);
    keyLight.position.set(15, 22, 12);
    this.scene.add(keyLight);

    this.world = new BackroomsWorld(this.scene);
    this.fractureEngine = new FractureEngine(this.scene);
    this.comicEffects = new ComicEffectsManager(this.scene, this.camera);
    this.arms = new PlayerArms();
    this.ballManager = new BallManager(this.scene);
    this.entityManager = new SkeletalEntityManager(this.scene);
    this.coinAgent = new CoinDropAgent(this.scene);

    // Wire Electric Hazard Wall close-range shock penalty (0.5s paralysis, zero velocity, no knockback, no clock deduction)
    this.world.onElectricShockPenalty = () => {
      this.shockParalysisTimer = 0.5;
      this.playerVelocity.set(0, 0, 0);
      this.dashDurationTimer = 0;
      this.state.isDashing = false;
      this.comicEffects.screenPulseIntensity = 0.95;
      this.comicEffects.screenPulseColor = '#22d3ee';
      this.notifyState();
    };

    this.camera.add(this.arms.root);
    this.scene.add(this.camera);

    const profile = progressionManager.getProfile();
    this.arms.setSkin(profile.equippedSkin);

    this.state = {
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
      coins: profile.coins,
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
      timeRemaining:
        15 +
        progressionManager.getRebirthTimerBonus() +
        (progressionManager.hasBudgetEquipped('plus_timer') ? 5 : 0),
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
      profile,
    };

    this.arms.setPunchSpeedMultiplier(progressionManager.getStatMultiplier('punchSpeed'));
    this.loadLevelRoom(1, true);
    this.initEventListeners();

    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public refreshProfileState() {
    const profile = progressionManager.getProfile();
    this.state.coins = profile.coins;
    this.state.profile = profile;
    const punchSpeedMult = progressionManager.getStatMultiplier('punchSpeed');
    this.arms.setPunchSpeedMultiplier(punchSpeedMult);
    this.arms.setSkin(profile.equippedSkin);
    this.notifyState();
  }

  public buyUpgrade(key: UpgradeKey): boolean {
    const ok = progressionManager.buyUpgrade(key);
    if (ok) {
      soundManager.playUpgradeBuy();
      this.refreshProfileState();
    } else {
      soundManager.playUiError();
    }
    return ok;
  }

  public grantFreeAdUpgrade(key: UpgradeKey) {
    progressionManager.grantFreeUpgrade(key);
    soundManager.playUpgradeBuy();
    this.refreshProfileState();
  }

  public performRebirth(): boolean {
    const ok = progressionManager.performRebirth();
    if (ok) {
      soundManager.playRebirth();
      this.refreshProfileState();
    } else {
      soundManager.playUiError();
    }
    return ok;
  }

  public buyOrToggleBudget(budgetId: BudgetId): boolean {
    const ok = progressionManager.buyOrToggleBudget(budgetId);
    if (ok) {
      soundManager.playUpgradeBuy();
      this.refreshProfileState();
    } else {
      soundManager.playUiError();
    }
    return ok;
  }

  public unlockSkinViaAd(skinId: GloveSkinId) {
    progressionManager.unlockSkinViaAd(skinId);
    soundManager.playSkinEquip();
    this.refreshProfileState();
  }

  public claimDoubleRunCoins() {
    if (this.state.doubleRunCoinsClaimed || this.state.runCoinsEarned <= 0) return;
    const bonus = this.state.runCoinsEarned;
    progressionManager.claimAdJackpot(bonus);
    this.state.runCoinsEarned += bonus;
    this.state.doubleRunCoinsClaimed = true;
    soundManager.playJackpotWin();
    this.refreshProfileState();
  }

  public selectOrBuySkin(skinId: GloveSkinId): boolean {
    const ok = progressionManager.unlockOrEquipSkin(skinId);
    if (ok) {
      soundManager.playSkinEquip();
      this.refreshProfileState();
    } else {
      soundManager.playUiError();
    }
    return ok;
  }

  public claimAdJackpot(rewardCoins: number) {
    progressionManager.claimAdJackpot(rewardCoins);
    soundManager.playJackpotWin();
    this.refreshProfileState();
  }

  public resetAccount() {
    progressionManager.resetProfile();
    soundManager.playModalClose();
    this.state.runCoinsEarned = 0;
    this.state.doubleRunCoinsClaimed = false;
    this.state.score = 0;
    this.state.combo = 0;
    this.state.maxComboInRun = 0;
    this.state.isNewRecord = false;
    this.state.status = 'menu';
    this.refreshProfileState();
  }

  public openMenu() {
    portalSDK.gameplayStop();
    this.isLeftMouseDown = false;
    this.isKeyPunchHeld = false;
    this.isTouchPunchHeld = false;
    this.keyboardTurnInput = 0;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.state.status = 'menu';
    this.state.isPaused = false;
    this.state.revivePromptActive = false;
    soundManager.setUrgencyMode(false);
    soundManager.setMusicContext('lobby', 'level0', false, false);
    this.arms.setHoldingBall(false);
    this.arms.setGolden(false);
    this.loadLevelRoom(1, true);
    this.refreshProfileState();
  }

  public resumeGame() {
    if (this.state.status !== 'playing') return;
    this.state.isPaused = false;
    soundManager.playUiClick();
    soundManager.setMusicContext('playing', this.state.biome, this.state.isJackpotFloor, false);
    portalSDK.gameplayStart();
    const canvas = this.renderer.domElement;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    }
    this.notifyState();
  }

  /**
   * Starts a run at `startLevel`, optionally with the 25s Rewarded Ad Mega Starter Buff
   * (Golden Fists + Multi-Ball 25s!).
   */
  public startRun(startLevel = 1, withSuperBuff = false) {
    // Flowchart Rule C -> D: Clique no Botão JOGAR NUNCA dispara anúncio; Gameplay começa imediatamente!
    const profile = progressionManager.getProfile();
    this.powerupDamageMult = withSuperBuff ? 2.0 : 1.0;
    this.gloveScale = withSuperBuff ? 1.22 : 1.0;
    this.isGolden = withSuperBuff;
    this.goldenTimer = withSuperBuff ? 25.0 : 0;
    this.superMultiBallTimer = withSuperBuff ? 25.0 : 0;
    this.speedBoostTimer = withSuperBuff ? 12.0 : 0;
    this.dashCooldownTimer = 0;
    this.dashDurationTimer = 0;
    this.transitionTimer = 0;
    this.shockParalysisTimer = 0;
    this.comboStrikeIndex = 0;
    this.isLeftMouseDown = false;
    this.isKeyPunchHeld = false;
    this.isTouchPunchHeld = false;
    this.keyboardTurnInput = 0;
    this.hasLockedPointerInRun = false;
    this.hasInteractedInRun = true;
    this.reviveUsedInRun = false;
    this.isReviveAdPlaying = false;
    this.runStartingBestLevel = Math.max(1, profile.records.bestLevel);
    this.hasTriggeredRecordJackpotInRun = false;

    this.camera.fov = this.lockedFov;
    this.camera.updateProjectionMatrix();

    this.arms.setArmScale(withSuperBuff ? 1.22 : 1.0);
    this.arms.setGolden(withSuperBuff);
    this.arms.setSkin(profile.equippedSkin);
    this.arms.setHoldingBall(false);
    this.arms.setPunchSpeedMultiplier(progressionManager.getStatMultiplier('punchSpeed'));

    const rebirthTimerBonus = progressionManager.getRebirthTimerBonus();
    const plusTimerBonus = progressionManager.hasBudgetEquipped('plus_timer') ? 5.0 : 0;
    const lvlConfig = ProgressionManager.getLevelConfig(
      startLevel,
      rebirthTimerBonus,
      plusTimerBonus,
      false
    );

    this.state = {
      ...this.state,
      level: startLevel,
      biome: lvlConfig.biome,
      isJackpotFloor: false,
      wallsDestroyed: 0,
      totalWalls: lvlConfig.targetWalls,
      runWallsDestroyed: 0,
      entitiesAlive: 0,
      bossAlive: false,
      bossHealth: undefined,
      runEntitiesKilled: 0,
      score: 0,
      coins: profile.coins,
      runCoinsEarned: 0,
      doubleRunCoinsClaimed: false,
      combo: 0,
      maxComboInRun: 0,
      comboTimer: 0,
      rage: withSuperBuff ? 100 : 25,
      isRageFull: withSuperBuff,
      status: 'playing',
      isPaused: false,
      revivePromptActive: false,
      revivePromptCountdown: 0,
      reviveUsedInRun: false,
      timeRemaining: lvlConfig.initialTime,
      elapsedTime: 0,
      activePowerUp: withSuperBuff ? t().powerUpSuperStart : null,
      gloveScale: withSuperBuff ? 1.22 : 1.0,
      isGolden: withSuperBuff,
      dashCooldown: 0,
      isGrounded: true,
      isDashing: false,
      fov: 105,
      hasBall: false,
      isNewRecord: false,
      screenPulseIntensity: 0,
      levelTransition: null,
      radarAngle: null,
      profile,
    };

    this.loadLevelRoom(startLevel, false);
    portalSDK.gameplayStart();

    const canvas = this.renderer.domElement;
    try {
      canvas.requestPointerLock?.();
    } catch {
      // ignore if not triggered by direct gesture
    }

    this.notifyState();
  }

  public start() {
    this.startRun(1, false);
  }

  /**
   * Second Chance / Revive Ad Flow (+12s + Free Super Smash Blast!).
   */
  public async triggerReviveAd() {
    if (!this.state.revivePromptActive || this.isReviveAdPlaying) return;
    this.isReviveAdPlaying = true;
    this.notifyState();

    const rewarded = await portalSDK.requestRewardedAd();
    this.isReviveAdPlaying = false;

    if (rewarded) {
      this.reviveUsedInRun = true;
      this.state.reviveUsedInRun = true;
      this.state.revivePromptActive = false;
      this.state.revivePromptCountdown = 0;
      this.state.timeRemaining = 12.0;
      this.state.rage = 100;
      this.state.isRageFull = true;
      this.state.isPaused = false;

      // Detonate a Free Super Smash Blast around the player upon reviving!
      soundManager.setUrgencyMode(false);
      soundManager.setMusicContext('playing', this.state.biome, this.state.isJackpotFloor, false);
      soundManager.playSuperSmash();
      const punchDir = new THREE.Vector3();
      this.camera.getWorldDirection(punchDir);
      this.comicEffects.triggerPunchShake(0.2, 48, punchDir);
      this.comicEffects.screenPulseIntensity = 1.0;
      this.comicEffects.screenPulseColor = '#facc15';

      const nearbyWalls = this.world.getWallsInRadius(this.playerPosition, 6.2);
      let destroyedCount = 0;
      for (const wall of nearbyWalls) {
        if (wall.isIndestructible || wall.isDestroyed) continue;
        if (destroyedCount >= 5) break;
        const destroyed = this.world.damageWall(
          wall.id,
          9999,
          wall.center,
          punchDir,
          this.fractureEngine,
          this.comicEffects,
          2.2,
          true
        );
        if (destroyed) {
          destroyedCount++;
          this.registerWallDestruction(wall);
        }
      }

      const nearbyEntities = this.entityManager.getEntitiesInRadius(this.playerPosition, 6.5);
      for (const ent of nearbyEntities) {
        const killed = this.entityManager.damageEntity(
          ent.id,
          800,
          ent.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
          punchDir,
          this.fractureEngine,
          this.comicEffects
        );
        if (killed) {
          this.registerEntityKill(ent);
        }
      }

      portalSDK.gameplayStart();
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {
        // ignore
      }
      this.notifyState();
    } else {
      soundManager.playUiError();
      this.state.revivePromptCountdown = Math.max(this.state.revivePromptCountdown, 5.0);
      this.notifyState();
    }
  }

  /**
   * Accept defeat on the Death Screen, Watch Rewarded Ad to Double Run Coins (2X), and return to Lobby!
   */
  public async acceptDefeatWithDoubleCoinsAd() {
    if (!this.state.revivePromptActive || this.isReviveAdPlaying) return;
    this.isReviveAdPlaying = true;
    this.notifyState();

    const rewarded = await portalSDK.requestRewardedAd();
    this.isReviveAdPlaying = false;

    if (rewarded) {
      if (this.state.runCoinsEarned <= 0) {
        const minBonus = Math.round(50 * progressionManager.getRebirthCoinMultiplier());
        progressionManager.claimAdJackpot(minBonus);
        this.state.runCoinsEarned += minBonus;
        this.state.doubleRunCoinsClaimed = true;
        soundManager.playJackpotWin();
        this.refreshProfileState();
      } else {
        this.claimDoubleRunCoins();
      }
    }
    this.state.revivePromptActive = false;
    this.state.revivePromptCountdown = 0;
    this.finalizeGameOver();
  }

  public declineReviveOffer() {
    // 0.45s grace lock so rapid punching when the clock hits 0 never accidentally dismisses the offer
    if (this.state.revivePromptActive && this.state.revivePromptCountdown > 7.55) {
      return;
    }
    this.state.revivePromptActive = false;
    this.state.revivePromptCountdown = 0;
    this.finalizeGameOver();
  }

  private finalizeGameOver() {
    this.state.timeRemaining = 0;
    this.state.revivePromptActive = false;
    this.state.status = 'gameover';
    this.isLeftMouseDown = false;
    soundManager.setUrgencyMode(false);
    soundManager.setMusicContext('gameover', 'level0', false, false);
    portalSDK.gameplayStop();
    // Flowchart Rule E -> F -> G -> H / I:
    // Only trigger Commercial Break on definitive Game Over if >150s passed since last ad
    // AND the player did NOT watch a rewarded ad recently.
    if (portalSDK.canShowGameOverCommercialBreak()) {
      portalSDK.commercialBreak().catch(() => {});
    }
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    const isNewRec = progressionManager.updateRecords(
      this.state.level,
      this.state.score,
      this.state.runWallsDestroyed,
      this.state.maxComboInRun
    );
    if (isNewRec) this.state.isNewRecord = true;
    this.state.profile = progressionManager.getProfile();
    // Ensure Lobby background after Game Over is always a classic Level 0 corridor with hands in guard pose!
    this.arms.setHoldingBall(false);
    this.arms.setGolden(false);
    this.loadLevelRoom(1, true, false);
    this.notifyState();
  }

  /**
   * Loads the room geometry, balls, 4-Biome Architecture, and Level 3+ Skeletal Entities / Level 10 Boss.
   */
  private loadLevelRoom(level: number, isPreview = false, forceJackpot = false) {
    const rebirthTimerBonus = progressionManager.getRebirthTimerBonus();
    const plusTimerBonus = progressionManager.hasBudgetEquipped('plus_timer') ? 5.0 : 0;
    const isJackpot = !isPreview && forceJackpot;
    const cfg = ProgressionManager.getLevelConfig(
      level,
      rebirthTimerBonus,
      plusTimerBonus,
      isJackpot
    );

    this.fractureEngine.clearAll();
    this.comicEffects.clearAll();
    this.coinAgent.clearAll();
    this.world.generate(
      level,
      cfg.targetWalls,
      cfg.gridWidth,
      cfg.gridDepth,
      cfg.biome,
      isJackpot
    );
    this.ballManager.spawnBalls(this.world, cfg.ballsCount);

    if (!isPreview && level >= 3 && !isJackpot) {
      this.entityManager.spawnForLevel(level, this.world);
    } else {
      this.entityManager.clearAll();
    }

    this.playerPosition.set(2.0, this.standingHeight, 2.0);
    if (!isPreview) {
      this.cameraRotation.set(0, -Math.PI * 0.75, 0);
    }
    this.playerVelocity.set(0, 0, 0);
    this.shockParalysisTimer = 0;
    this.isGrounded = true;
    this.arms.setHoldingBall(false);

    let breakableCount = 0;
    for (const wall of this.world.walls.values()) {
      if (!wall.isIndestructible) breakableCount++;
    }

    const boss = this.entityManager.hasLivingBoss();
    this.state.biome = cfg.biome;
    this.state.isJackpotFloor = isJackpot;
    this.state.wallsDestroyed = 0;
    this.state.totalWalls = breakableCount;
    this.state.entitiesAlive = this.entityManager.entities.length;
    this.state.bossAlive = Boolean(boss);
    this.state.bossHealth = boss ? { current: boss.health, max: boss.maxHealth } : undefined;
    this.state.hasBall = false;
    this.state.radarAngle = null;
    this.lastUrgentSecond = -1;

    if (!isPreview) {
      soundManager.setUrgencyMode(false);
      soundManager.setMusicContext('playing', cfg.biome, isJackpot, false);
      if (isJackpot) {
        soundManager.playJackpotWin();
      } else if (boss) {
        soundManager.playBossAlert();
      }
    }
  }

  /**
   * Checks if room is 100% cleared (all breakable walls destroyed AND any Level 10 Boss defeated).
   * Note: On a Jackpot Floor, walls dynamically rebuild themselves, so the level only advances when the timer expires!
   */
  private checkRoomClearCondition() {
    if (this.state.isJackpotFloor) return;

    const boss = this.entityManager.hasLivingBoss();
    if (
      this.state.totalWalls > 0 &&
      this.state.wallsDestroyed >= this.state.totalWalls &&
      !boss &&
      this.transitionTimer <= 0
    ) {
      this.triggerNextLevelTransition();
    }
  }

  /**
   * Triggers Juice Mechanic #10: Short Level-Up Transition with Time Bonus & Room Expansion!
   * Applies Rebirth Global Coin/Score Multiplier and resets `comboTimer` between rooms.
   */
  private triggerNextLevelTransition() {
    // Flowchart Rule A -> B: Vitória de Sala / Level Clear NUNCA dispara anúncio; Próxima sala direta em 1.2s!
    portalSDK.gameplayStart();
    const clearedLevel = this.state.level;
    const nextLevel = clearedLevel + 1;
    const rebirthTimerBonus = progressionManager.getRebirthTimerBonus();
    const plusTimerBonus = progressionManager.hasBudgetEquipped('plus_timer') ? 5.0 : 0;
    const rebirthCoinMult = progressionManager.getRebirthCoinMultiplier();
    const curCfg = ProgressionManager.getLevelConfig(
      clearedLevel,
      rebirthTimerBonus,
      plusTimerBonus
    );
    const nextCfg = ProgressionManager.getLevelConfig(
      nextLevel,
      rebirthTimerBonus,
      plusTimerBonus
    );

    const bonusTime = Number((curCfg.bonusTimeOnClear + rebirthTimerBonus * 0.5).toFixed(1));
    const bonusCoins = Math.round((35 + clearedLevel * 20) * rebirthCoinMult);

    this.state.comboTimer = 0;
    this.state.combo = 0;
    this.state.revivePromptActive = false;

    progressionManager.addCoins(bonusCoins);
    this.state.coins = progressionManager.getProfile().coins;
    this.state.runCoinsEarned += bonusCoins;
    this.state.timeRemaining = Math.min(40, this.state.timeRemaining + bonusTime);
    this.state.score += Math.round(clearedLevel * 400 * rebirthCoinMult);

    const isNewRec = progressionManager.updateRecords(
      nextLevel,
      this.state.score,
      this.state.runWallsDestroyed,
      this.state.maxComboInRun
    );
    if (isNewRec) {
      this.state.isNewRecord = true;
      portalSDK.happyTime();
    }
    this.state.profile = progressionManager.getProfile();

    soundManager.playWin();
    this.comicEffects.triggerPunchShake(0.14, 40);

    this.transitionTimer = 1.2;
    this.state.levelTransition = {
      active: true,
      clearedLevel,
      nextLevel,
      bonusTime,
      bonusCoins,
      nextWallsCount: nextCfg.targetWalls,
    };

    this.notifyState();
  }

  public jump(): boolean {
    if (
      !this.isGrounded ||
      this.shockParalysisTimer > 0 ||
      this.state.status !== 'playing' ||
      this.state.isPaused ||
      this.state.revivePromptActive
    )
      return false;
    this.playerVelocity.y = this.jumpForce;
    this.isGrounded = false;
    this.state.isGrounded = false;
    soundManager.playJump();
    this.notifyState();
    return true;
  }

  public dash(): boolean {
    if (
      this.dashCooldownTimer > 0 ||
      this.shockParalysisTimer > 0 ||
      this.state.status !== 'playing' ||
      this.state.isPaused ||
      this.state.revivePromptActive
    ) {
      return false;
    }
    const moveMult = progressionManager.getEffectiveMoveMultiplier();

    const cooldownBase = Math.max(0.35, 0.95 / Math.sqrt(moveMult));
    this.dashCooldownTimer = cooldownBase;
    this.dashDurationTimer = 0.22;
    this.state.isDashing = true;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.cameraRotation.y
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.cameraRotation.y
    );
    const wish = new THREE.Vector3()
      .addScaledVector(forward, this.moveInput.y)
      .addScaledVector(right, this.moveInput.x);

    if (wish.lengthSq() > 0.001) {
      this.dashDirection.copy(wish.normalize());
    } else {
      this.dashDirection.copy(forward);
    }

    const dashSpeed = 19.5 * moveMult;
    this.playerVelocity.x = this.dashDirection.x * dashSpeed;
    this.playerVelocity.z = this.dashDirection.z * dashSpeed;

    soundManager.playDash();
    this.comicEffects.triggerPunchShake(0.045, 12);
    this.notifyState();
    return true;
  }

  /**
   * Universal Smart Action (Tap / Click anywhere on screen during gameplay):
   * 1. If holding a demolition ball -> Launches the ball ('throw')
   * 2. Else if Rage is 100% full -> Unleashes Super Smash ('super')
   * 3. Else -> Executes 4-hit boxing combo punch ('combo')
   */
  public triggerSmartAction(): boolean {
    if (this.ballManager.heldBall || this.state.hasBall) {
      return this.punch('throw');
    }
    if (this.state.isRageFull) {
      return this.punch('super');
    }
    return this.punch('combo');
  }

  /**
   * Executes a Punch (cycling through 4-hit combo on Left Click / Hold), Heavy Strike, Super Smash, or Ball Throw!
   */
  public punch(requestedType: PunchType | 'combo'): boolean {
    if (
      this.state.status !== 'playing' ||
      this.state.isPaused ||
      this.state.revivePromptActive ||
      this.transitionTimer > 0 ||
      this.shockParalysisTimer > 0
    ) {
      return false;
    }

    this.hasInteractedInRun = true;
    const punchSpeedMult = progressionManager.getStatMultiplier('punchSpeed');
    const rebirthDmgMult = progressionManager.getRebirthDamageMultiplier();
    const punchForceMult =
      progressionManager.getStatMultiplier('punchForce') *
      this.powerupDamageMult *
      rebirthDmgMult;
    const ballForceMult = progressionManager.getStatMultiplier('ballForce');
    const hasMultiBall =
      this.superMultiBallTimer > 0 ||
      progressionManager.hasBudgetEquipped('multi_ball') ||
      ballForceMult >= 2.5;
    const itemsSpeedMult = hasMultiBall ? Math.max(2.6, ballForceMult) : ballForceMult;
    const itemsForceMult = hasMultiBall ? Math.max(2.6, ballForceMult) : ballForceMult;

    this.arms.setPunchSpeedMultiplier(punchSpeedMult);

    // 1. IF HOLDING DEMOLITION BALL: Launch it (and split into Multi-Ball if Multi-Ball Budget or Super Buff is active!)
    if (this.ballManager.heldBall) {
      const threw = this.arms.punch('throw');
      if (threw) {
        const lookDir = new THREE.Vector3();
        this.camera.getWorldDirection(lookDir);
        this.ballManager.throwHeldBall(
          this.camera.position,
          lookDir,
          27.0,
          itemsSpeedMult,
          itemsForceMult,
          this.playerVelocity
        );
        this.state.hasBall = false;
        this.comicEffects.triggerPunchShake(0.08, 18, lookDir);
        this.comicEffects.spawnComicText(
          this.playerPosition.clone().addScaledVector(lookDir, 1.8),
          hasMultiBall ? t().comicMultiBall : t().comicBallThrown,
          hasMultiBall ? '#22d3ee' : '#ec4899'
        );
        this.notifyState();
        return true;
      }
    }

    // 2. RESOLVE 4-HIT BOXING COMBO VARIATION (Jab -> Cross -> Hook -> Uppercut)
    let type: PunchType;
    if (requestedType === 'combo') {
      const sequence: PunchType[] = ['left', 'right', 'hook_left', 'uppercut_right'];
      type = sequence[this.comboStrikeIndex % sequence.length];
      this.comboStrikeIndex = (this.comboStrikeIndex + 1) % sequence.length;
    } else {
      type = requestedType;
    }

    // Check if arm can accept the punch before playing audio (critical for Hold-to-Punch Turbo loop)
    const punched = this.arms.punch(type);
    if (!punched) return false;

    // 3. SUPER DOUBLE SMASH
    if (type === 'super') {
      if (this.state.rage < 100) return false;
      this.state.rage = 0;
      this.state.isRageFull = false;
      soundManager.playSuperSmash();
    } else {
      const pitch =
        type === 'uppercut_right'
          ? 0.85
          : type === 'hook_left'
          ? 0.95
          : type === 'right'
          ? 1.0
          : 1.12;
      soundManager.playWhoosh(pitch);
    }

    const punchDir = new THREE.Vector3();
    this.camera.getWorldDirection(punchDir);

    // 4. 250%+ PUNCH SPEED EPIC PERK: FÚRIA METEORO (SOCO DUPLO CORPO-A-CORPO + +1.0m ALCANCE!)
    const isMeteorFury = punchSpeedMult >= 2.5 && type !== 'super';
    const meteorReachBonus = isMeteorFury ? 1.0 : 0;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const punchReach =
      (type === 'super' ? 4.6 : 3.35) +
      meteorReachBonus +
      Math.min(1.5, (punchForceMult - 1) * 0.35);

    if (type === 'super') {
      const blastCenter = this.playerPosition.clone().addScaledVector(punchDir, 2.0);
      const blastRadius = 4.5 + Math.min(3.0, (punchForceMult - 1) * 0.8);

      const nearbyWalls = this.world.getWallsInRadius(blastCenter, blastRadius);
      for (const wall of nearbyWalls) {
        if (wall.isIndestructible || wall.isDestroyed) continue;
        const destroyed = this.world.damageWall(
          wall.id,
          600 * punchForceMult,
          wall.center,
          punchDir,
          this.fractureEngine,
          this.comicEffects,
          2.1 * Math.min(2.5, punchForceMult),
          true
        );
        if (destroyed) {
          this.registerWallDestruction(wall);
        }
      }

      const nearbyEntities = this.entityManager.getEntitiesInRadius(blastCenter, blastRadius + 0.5);
      for (const ent of nearbyEntities) {
        const killed = this.entityManager.damageEntity(
          ent.id,
          750 * punchForceMult,
          ent.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
          punchDir,
          this.fractureEngine,
          this.comicEffects
        );
        if (killed) {
          this.registerEntityKill(ent);
        }
      }

      this.comicEffects.triggerPunchShake(0.18, 45, punchDir);
    } else {
      let entityHit = this.entityManager.getEntityAhead(this.raycaster, punchReach + 0.35);
      let wallHit = this.world.getWallAhead(this.raycaster, punchReach);

      // Chromebook / Touch Magnetic Auto-Aim Assist (~20° cone):
      // If center ray missed slightly, snap to the best entity or destructible wall within ~20°!
      if (!entityHit && !wallHit) {
        const magnetHit = this.findMagneticConeTarget(punchReach, 20);
        if (magnetHit) {
          this.applySoftMagneticYawSnap(magnetHit.targetPoint, 0.38);
          if (magnetHit.entityHit) {
            entityHit = magnetHit.entityHit;
          } else if (magnetHit.wallHit) {
            wallHit = magnetHit.wallHit;
          }
        }
      }

      const isHeavyStrike = type === 'uppercut_right' || type === 'hook_left' || type === 'right';
      const baseDamage = isHeavyStrike ? 165 : 120;
      // Fúria Meteoro (250%+ Punch Speed) triggers a melee DOUBLE HIT (2x base damage + white/gold fist shockwave)!
      const meteorDamageMult = isMeteorFury ? 2.0 : 1.0;
      let finalDamage = baseDamage * punchForceMult * meteorDamageMult;
      if (this.isGolden) finalDamage = 9999;

      const entityDist = entityHit
        ? this.camera.position.distanceTo(entityHit.hitPoint)
        : Infinity;
      const wallDist = wallHit
        ? this.camera.position.distanceTo(wallHit.hitPoint)
        : Infinity;

      if (entityHit && entityDist <= wallDist) {
        if (isMeteorFury) {
          soundManager.playWindSlash();
          this.comicEffects.spawnMeteorFistShockwave(
            entityHit.hitPoint,
            punchDir.clone().negate()
          );
          this.comicEffects.spawnComicText(entityHit.hitPoint, t().comicWindSlash, '#facc15');
        }
        const killed = this.entityManager.damageEntity(
          entityHit.entity.id,
          finalDamage * 1.15,
          entityHit.hitPoint,
          punchDir,
          this.fractureEngine,
          this.comicEffects
        );
        this.addRage(isMeteorFury ? 28 : 22);
        if (killed) {
          this.registerEntityKill(entityHit.entity);
        } else {
          this.incrementCombo(isMeteorFury ? 75 : 45);
        }
      } else if (wallHit) {
        if (isMeteorFury && !wallHit.wall.isIndestructible) {
          soundManager.playWindSlash();
          this.comicEffects.spawnMeteorFistShockwave(
            wallHit.hitPoint,
            punchDir.clone().negate()
          );
          this.comicEffects.spawnComicText(wallHit.hitPoint, t().comicWindSlash, '#facc15');
        }
        const isCloseRange = wallDist <= 1.6;
        const isSafe = this.isGolden || !isCloseRange;

        const destroyed = this.world.damageWall(
          wallHit.wall.id,
          finalDamage,
          wallHit.hitPoint,
          punchDir,
          this.fractureEngine,
          this.comicEffects,
          (this.isGolden ? 1.85 : isMeteorFury ? 1.45 : 1.15) * Math.min(2.2, punchForceMult),
          isSafe
        );

        if (!wallHit.wall.isIndestructible) {
          this.addRage(isHeavyStrike ? 18 : 12);
          if (destroyed) {
            this.registerWallDestruction(wallHit.wall);
          } else {
            this.incrementCombo(isMeteorFury ? 45 : 25);
          }

          const hasTntPunch = progressionManager.hasBudgetEquipped('tnt_punch');
          if (hasTntPunch || punchForceMult >= 2.5 || wallHit.wall.variant === 'electric') {
            const cleaveRadius =
              wallHit.wall.variant === 'electric' ? 4.2 : hasTntPunch ? 3.3 : 2.5;
            const adjacent = this.world.getWallsInRadius(wallHit.hitPoint, cleaveRadius);
            for (const adj of adjacent) {
              if (adj.id === wallHit.wall.id || adj.isDestroyed || adj.isIndestructible) continue;
              const adjDestroyed = this.world.damageWall(
                adj.id,
                finalDamage * (hasTntPunch ? 0.95 : 0.75),
                adj.center,
                punchDir,
                this.fractureEngine,
                this.comicEffects,
                1.25,
                true
              );
              if (adjDestroyed) {
                this.registerWallDestruction(adj);
              }
            }
          }
        }
      }
    }

    this.notifyState();
    return true;
  }

  private addRage(amount: number) {
    const wasFull = this.state.isRageFull;
    this.state.rage = Math.min(100, this.state.rage + amount);
    this.state.isRageFull = this.state.rage >= 100;
    if (!wasFull && this.state.isRageFull) {
      soundManager.playRageReady();
    }
  }

  private incrementCombo(scoreAdd: number) {
    const rebirthMult = progressionManager.getRebirthCoinMultiplier();
    this.state.combo += 1;
    if (this.state.combo > this.state.maxComboInRun) {
      this.state.maxComboInRun = this.state.combo;
    }
    this.state.comboTimer = 4.0;
    this.state.score += Math.round(
      scoreAdd * Math.max(1, Math.floor(this.state.combo / 2)) * rebirthMult
    );
  }

  private registerEntityKill(ent: SkeletalEntity) {
    if (this.state.status !== 'playing') return;

    this.state.runEntitiesKilled += 1;
    this.state.entitiesAlive = this.entityManager.entities.filter((e) => !e.isDead).length;
    const boss = this.entityManager.hasLivingBoss();
    this.state.bossAlive = Boolean(boss);
    this.state.bossHealth = boss ? { current: boss.health, max: boss.maxHealth } : undefined;

    const rebirthMult = progressionManager.getRebirthCoinMultiplier();
    const totalCoinReward = Math.round(
      ((ent.isBoss ? 300 : 90) + this.state.combo * 5) * rebirthMult
    );
    // PILAR 8: Drop 3–5 physical 3D coins on the floor instead of instant mid-air credit!
    this.coinAgent.spawnCoinDrop(ent.position.clone().add(new THREE.Vector3(0, 0.9, 0)), totalCoinReward);
    soundManager.playCoinDrop();
    this.state.timeRemaining = Math.min(40, this.state.timeRemaining + (ent.isBoss ? 8.0 : 4.5));

    this.incrementCombo(ent.isBoss ? 3000 : 1000);

    const rewardPos = ent.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.comicEffects.spawnComicText(
      rewardPos,
      [`+${ent.isBoss ? '8.0' : '4.5'}s`],
      '#34d399'
    );

    if (ent.isBoss) {
      portalSDK.happyTime();
    }

    this.checkRoomClearCondition();
  }

  private registerWallDestruction(wall: DestructibleWall) {
    if (this.state.status !== 'playing') return;

    this.state.wallsDestroyed += 1;
    this.state.runWallsDestroyed += 1;
    progressionManager.incrementLifetimeWalls(1);

    const scoreBase =
      wall.variant === 'golden'
        ? 500
        : wall.variant === 'electric'
        ? 300
        : wall.variant === 'reinforced'
        ? 220
        : 120;
    this.incrementCombo(scoreBase);

    const baseCoins = this.state.isJackpotFloor
      ? 145
      : wall.variant === 'golden'
      ? 45
      : wall.variant === 'electric'
      ? 25
      : wall.variant === 'reinforced'
      ? 18
      : 9;
    const comboBonus = Math.min(45, Math.floor(this.state.combo * 2.2));
    const rebirthMult = progressionManager.getRebirthCoinMultiplier();
    const totalCoinReward = Math.round((baseCoins + comboBonus) * rebirthMult);

    // PILAR 8: Spawn physical bouncing 3D coins (or 9-coin Jackpot Fountain on Jackpot Floors!)
    this.coinAgent.spawnCoinDrop(wall.center, totalCoinReward, this.state.isJackpotFloor);
    soundManager.playCoinDrop();

    this.checkRoomClearCondition();
  }

  private applyPowerUp(type: 'mega_gloves' | 'almond_water' | 'golden_fists') {
    if (type === 'almond_water') {
      this.state.rage = 100;
      this.state.isRageFull = true;
      this.speedBoostTimer = 10.0;
      this.state.activePowerUp = t().powerUpWater;
    } else if (type === 'mega_gloves') {
      this.gloveScale = 1.38;
      this.powerupDamageMult = 2.0;
      this.arms.setArmScale(1.38);
      this.state.gloveScale = 1.38;
      this.state.activePowerUp = t().powerUpMega;
    } else if (type === 'golden_fists') {
      this.isGolden = true;
      this.goldenTimer = Math.max(this.goldenTimer, 14.0);
      this.arms.setGolden(true);
      this.state.isGolden = true;
      this.state.activePowerUp = t().powerUpGold;
    }

    setTimeout(() => {
      this.state.activePowerUp = null;
      this.notifyState();
    }, 3500);
  }

  private updateLastWallsRadar() {
    const boss = this.entityManager.hasLivingBoss();
    const pct = this.state.totalWalls > 0 ? this.state.wallsDestroyed / this.state.totalWalls : 0;
    const remainingWalls = this.state.totalWalls - this.state.wallsDestroyed;

    let targetPos: THREE.Vector3 | null = null;
    if (boss) {
      targetPos = boss.position;
    } else if (pct >= 0.78 || (remainingWalls > 0 && remainingWalls <= 3)) {
      const closestWall = this.world.getClosestStandingWall(this.playerPosition);
      if (closestWall) targetPos = closestWall.center;
    }

    if (!targetPos) {
      this.state.radarAngle = null;
      return;
    }

    const dx = targetPos.x - this.playerPosition.x;
    const dz = targetPos.z - this.playerPosition.z;
    const worldAngle = Math.atan2(dx, -dz);
    const camYaw = -this.cameraRotation.y;
    const relAngle = Math.atan2(Math.sin(worldAngle - camYaw), Math.cos(worldAngle - camYaw));
    this.state.radarAngle = relAngle;
  }

  /**
   * Main per-frame game loop.
   */
  private tick = () => {
    if (!this.isRunning) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // PILAR 1: When in 'menu' or 'gameover', render 1st-person player standing in a Level 0 corridor
    // with yellow wallpaper, fluorescent lights, and 3D gauntlets breathing in guard position!
    if (this.state.status === 'menu' || this.state.status === 'gameover') {
      this.cameraRotation.y = -Math.PI * 0.75 + Math.sin(time * 0.42) * 0.16;
      this.cameraRotation.x = Math.sin(time * 0.85) * 0.03;
      this.cameraRotation.z = 0;
      this.world.update(time, delta);
      this.arms.update(delta, false, false);
      this.camera.quaternion.setFromEuler(this.cameraRotation);
      this.camera.position.set(
        2.0 + Math.sin(time * 0.55) * 0.08,
        1.6 + Math.sin(time * 1.6) * 0.02,
        2.0 + Math.cos(time * 0.55) * 0.08
      );
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    // Second Chance / Revive dramatic prompt state
    if (this.state.status === 'playing' && this.state.revivePromptActive) {
      if (!this.isReviveAdPlaying) {
        this.state.revivePromptCountdown -= delta;
        const revSec = Math.ceil(this.state.revivePromptCountdown);
        if (revSec !== this.lastReviveUrgentSecond && revSec > 0 && revSec <= 6) {
          this.lastReviveUrgentSecond = revSec;
          soundManager.playTimerUrgent(revSec);
        }
        this.hudSyncAccumulator += delta;
        if (this.state.revivePromptCountdown <= 0) {
          this.finalizeGameOver();
        } else if (this.hudSyncAccumulator >= 0.08) {
          this.hudSyncAccumulator = 0;
          this.notifyState();
        }
      }
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    // Auto-Paused state or Ad Break Active
    if ((this.state.status === 'playing' && this.state.isPaused) || portalSDK.isAdActive) {
      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.state.status === 'playing') {
      this.state.elapsedTime += delta;
      this.hudSyncAccumulator += delta;

      // Hold Left Mouse, Universal Keyboard Action (Space / Enter / J), or Touch Anywhere for Continuous Smart Action (Throw Ball / Super Smash / Turbo-Combo)!
      if (this.isLeftMouseDown && this.transitionTimer <= 0 && this.shockParalysisTimer <= 0) {
        this.triggerSmartAction();
      } else if (
        (this.isKeyPunchHeld || this.isTouchPunchHeld) &&
        this.transitionTimer <= 0 &&
        this.shockParalysisTimer <= 0
      ) {
        this.triggerSmartAction();
      }

      // Handle short Level-Up Transition (Juice #10)
      if (this.transitionTimer > 0) {
        this.transitionTimer -= delta;
        if (this.transitionTimer <= 0 && this.state.levelTransition) {
          const nextLvl = this.state.levelTransition.nextLevel;
          this.state.level = nextLvl;
          this.state.levelTransition = null;

          // RULE: Player gets the Golden Jackpot Floor ONLY when surpassing their room record (bestLevel + 1), ONCE per run!
          // E.g. if the record at the start of the run was 50, room 51 is the Jackpot Floor!
          const isRecordJackpot =
            !this.hasTriggeredRecordJackpotInRun &&
            nextLvl === this.runStartingBestLevel + 1;

          if (isRecordJackpot) {
            this.hasTriggeredRecordJackpotInRun = true;
            this.isLeftMouseDown = false;
            this.isKeyPunchHeld = false;
            this.isTouchPunchHeld = false;
            this.setMoveInput(0, 0);
            const rebirthTimerBonus = progressionManager.getRebirthTimerBonus();
            const plusTimerBonus = progressionManager.hasBudgetEquipped('plus_timer') ? 5.0 : 0;
            const jackpotCfg = ProgressionManager.getLevelConfig(
              nextLvl,
              rebirthTimerBonus,
              plusTimerBonus,
              true
            );
            this.state.timeRemaining = jackpotCfg.initialTime;
            portalSDK
              .commercialBreak()
              .catch(() => {})
              .finally(() => {
                this.state.timeRemaining = jackpotCfg.initialTime;
                this.loadLevelRoom(nextLvl, false, true);
                portalSDK.gameplayStart();
                this.notifyState();
              });
          } else {
            this.loadLevelRoom(nextLvl, false, false);
            this.notifyState();
          }
        }
      } else if (this.hasInteractedInRun) {
        this.state.timeRemaining -= delta;
        const isUrgentNow =
          !this.state.isJackpotFloor &&
          this.state.timeRemaining > 0 &&
          this.state.timeRemaining <= 5.0;
        soundManager.setUrgencyMode(isUrgentNow);
        if (isUrgentNow) {
          const secLeft = Math.ceil(this.state.timeRemaining);
          if (secLeft !== this.lastUrgentSecond) {
            this.lastUrgentSecond = secLeft;
            soundManager.playTimerUrgent(secLeft);
          }
        }
        if (this.state.timeRemaining <= 0) {
          this.state.timeRemaining = 0;
          this.isLeftMouseDown = false;
          this.setMoveInput(0, 0);
          soundManager.setUrgencyMode(false);

          // JACKPOT FLOOR FINISHED: Automatically sweep all remaining floor coins
          // and advance to the next level (level + 1) with all collected coins!
          if (this.state.isJackpotFloor) {
            const sweptCoins = this.coinAgent.collectAllRemainingCoins();
            if (sweptCoins > 0) {
              progressionManager.addCoins(sweptCoins);
              this.state.coins = progressionManager.getProfile().coins;
              this.state.runCoinsEarned += sweptCoins;
              soundManager.playCoinPickup();
            }
            const rebirthBonus = progressionManager.getRebirthTimerBonus();
            const plusBonus = progressionManager.hasBudgetEquipped('plus_timer') ? 5.0 : 0;
            const nextCfg = ProgressionManager.getLevelConfig(
              this.state.level + 1,
              rebirthBonus,
              plusBonus,
              false
            );
            this.state.timeRemaining = nextCfg.initialTime;
            this.triggerNextLevelTransition();
            this.renderer.render(this.scene, this.camera);
            this.animFrameId = requestAnimationFrame(this.tick);
            return;
          }

          // NORMAL FLOOR DEATH: Show Death Screen with (+12s Revive Ad) OR (Accept Defeat + 2X Coins Ad)!
          this.state.revivePromptActive = true;
          this.state.revivePromptCountdown = 8.0;
          this.lastReviveUrgentSecond = -1;
          this.state.isPaused = false;
          soundManager.setMusicContext('revive', this.state.biome, false, true);
          soundManager.playGameOver();
          portalSDK.gameplayStop();
          if (document.pointerLockElement) {
            document.exitPointerLock?.();
          }
          this.notifyState();
          this.renderer.render(this.scene, this.camera);
          this.animFrameId = requestAnimationFrame(this.tick);
          return;
        }
      }

      if (this.state.comboTimer > 0 && this.transitionTimer <= 0) {
        this.state.comboTimer -= delta;
        if (this.state.comboTimer <= 0) {
          this.state.combo = 0;
          this.notifyState();
        }
      }

      if (this.isGolden) {
        this.goldenTimer -= delta;
        if (this.goldenTimer <= 0) {
          this.isGolden = false;
          this.arms.setGolden(false);
          this.state.isGolden = false;
          this.notifyState();
        }
      }

      if (this.superMultiBallTimer > 0) {
        this.superMultiBallTimer -= delta;
      }

      if (this.speedBoostTimer > 0) {
        this.speedBoostTimer -= delta;
      }

      if (this.dashCooldownTimer > 0) {
        this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - delta);
        this.state.dashCooldown = this.dashCooldownTimer;
      }

      if (this.camera.fov !== this.lockedFov) {
        this.camera.fov = this.lockedFov;
        this.camera.updateProjectionMatrix();
      }

      // Chromebook Keyboard Camera Rotation ([←]/[→] or [Q]/[E])
      if (this.keyboardTurnInput !== 0 && this.shockParalysisTimer <= 0) {
        const keyTurnSpeed = 2.45; // rad/s (~140 deg/s smooth arcade turn)
        this.rotateCamera(this.keyboardTurnInput * keyTurnSpeed * delta, 0);
      }

      // Mobile / Tablet One-Handed Analog Joystick Camera Steering:
      // Pointing the analog stick steers the camera smoothly toward the stick direction
      if (this.touchMoveInput.lengthSq() > 0.004 && this.shockParalysisTimer <= 0) {
        const steerX = this.touchMoveInput.x;
        if (Math.abs(steerX) > 0.03) {
          const steerCurve = Math.sign(steerX) * Math.pow(Math.abs(steerX), 1.12);
          const joystickTurnSpeed = 2.85; // rad/s (~163 deg/s smooth cornering)
          this.rotateCamera(steerCurve * joystickTurnSpeed * delta, 0);
        }
        // Automatically keep vertical aim leveled at eye height while steering with the stick
        this.cameraRotation.x = THREE.MathUtils.damp(this.cameraRotation.x, 0, 5.5, delta);
      }

      this.updatePlayerMovement(delta);

      const collected = this.world.checkPowerUpCollection(this.playerPosition);
      if (collected) {
        this.applyPowerUp(collected.type);
        this.notifyState();
      }

      const ballForceMult = progressionManager.getStatMultiplier('ballForce');
      const pickupRadius = 1.55 + Math.min(1.0, (ballForceMult - 1) * 0.25);
      const pickedBall = this.ballManager.checkPickup(this.playerPosition, pickupRadius);
      if (pickedBall) {
        this.state.hasBall = true;
        this.comicEffects.spawnComicText(
          this.playerPosition,
          t().comicBallPicked,
          '#ec4899'
        );
        this.notifyState();
      }
      this.arms.setHoldingBall(!!this.ballManager.heldBall);

      // PILAR 8: Update physical coins on the floor & proportional pickup
      const hasCoinMagnet = progressionManager.hasBudgetEquipped('coin_magnet');
      this.coinAgent.update(
        delta,
        this.playerPosition,
        hasCoinMagnet,
        this.world.gridWidth * this.world.cellSize,
        this.world.gridDepth * this.world.cellSize,
        (amount, pickupPos) => {
          progressionManager.addCoins(amount);
          this.state.coins = progressionManager.getProfile().coins;
          this.state.runCoinsEarned += amount;
          soundManager.playCoinPickup();
          const textPos = pickupPos.clone();
          textPos.y += 0.55;
          this.comicEffects.spawnComicText(
            textPos,
            [`+${amount} COINS`],
            '#facc15'
          );
          this.notifyState();
        },
        this.state.isJackpotFloor
      );

      this.updateAimingInspection();
      this.updateLastWallsRadar();

      if (this.hudSyncAccumulator >= 0.075) {
        this.hudSyncAccumulator = 0;
        this.notifyState();
      }
    }

    const isHitstop = this.comicEffects.update(delta);
    this.state.screenPulseIntensity = this.comicEffects.screenPulseIntensity;
    this.state.screenPulseColor = this.comicEffects.screenPulseColor;

    if (!isHitstop) {
      this.fractureEngine.update(delta);
      this.world.update(time, delta, this.playerPosition);
      this.arms.update(delta, this.isWalking && this.isGrounded, this.dashDurationTimer > 0);
      this.ballManager.update(
        delta,
        time,
        this.world,
        this.fractureEngine,
        this.comicEffects,
        (wall) => {
          this.registerWallDestruction(wall);
          this.notifyState();
        },
        this.entityManager,
        (killedEntity) => {
          this.registerEntityKill(killedEntity);
          this.notifyState();
        }
      );

      if (this.state.status === 'playing' && this.transitionTimer <= 0) {
        this.entityManager.update(
          delta,
          time,
          this.playerPosition,
          this.camera,
          this.world,
          this.comicEffects,
          this.state.level,
          () => {
            this.state.totalWalls += 1;
            this.comicEffects.screenPulseIntensity = 0.65;
            this.comicEffects.screenPulseColor = '#a855f7';
            this.notifyState();
          }
        );
        this.state.entitiesAlive = this.entityManager.entities.filter((e) => !e.isDead).length;
        const boss = this.entityManager.hasLivingBoss();
        this.state.bossAlive = Boolean(boss);
        this.state.bossHealth = boss ? { current: boss.health, max: boss.maxHealth } : undefined;
      }
    }

    const targetRoll = -this.moveInput.x * (this.dashDurationTimer > 0 ? 0.065 : 0.028);
    this.currentCameraRoll = THREE.MathUtils.damp(this.currentCameraRoll, targetRoll, 12, delta);
    this.cameraRotation.z = this.currentCameraRoll;

    this.camera.quaternion.setFromEuler(this.cameraRotation);
    this.camera.position.copy(this.playerPosition).add(this.comicEffects.cameraOffset);
    if (this.shockParalysisTimer > 0) {
      this.camera.position.x += (Math.random() - 0.5) * 0.05;
      this.camera.position.y += (Math.random() - 0.5) * 0.05;
      this.camera.position.z += (Math.random() - 0.5) * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private updatePlayerMovement(delta: number) {
    if (this.shockParalysisTimer > 0) {
      this.shockParalysisTimer = Math.max(0, this.shockParalysisTimer - delta);
      this.playerVelocity.set(0, 0, 0);
      this.moveInput.set(0, 0);
      this.isWalking = false;
      this.dashDurationTimer = 0;
      this.state.isDashing = false;
      if (this.playerPosition.y <= this.standingHeight) {
        this.playerPosition.y = this.standingHeight;
        this.isGrounded = true;
        this.state.isGrounded = true;
      }
      this.state.playerGridPos = {
        x: Math.floor(this.playerPosition.x / this.world.cellSize),
        z: Math.floor(this.playerPosition.z / this.world.cellSize),
      };
      return;
    }

    const rawWalkMult = progressionManager.getStatMultiplier('moveSpeed');
    const effectiveMoveMult = progressionManager.getEffectiveMoveMultiplier();
    const boostMult = this.speedBoostTimer > 0 ? 1.45 : 1.0;
    const moveSpeed = this.baseMoveSpeed * effectiveMoveMult * boostMult;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.cameraRotation.y
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.cameraRotation.y
    );

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, this.moveInput.y);
    wishDir.addScaledVector(right, this.moveInput.x);

    if (this.dashDurationTimer > 0) {
      this.dashDurationTimer -= delta;
      const dashSpeed = 19.5 * effectiveMoveMult;
      this.playerVelocity.x = this.dashDirection.x * dashSpeed;
      this.playerVelocity.z = this.dashDirection.z * dashSpeed;
      this.isWalking = true;

      const rammedEntities = this.entityManager.getEntitiesInRadius(this.playerPosition, 1.35);
      for (const ent of rammedEntities) {
        if (ent.state !== 'staggered') {
          const punchForceMult = progressionManager.getStatMultiplier('punchForce');
          const killed = this.entityManager.damageEntity(
            ent.id,
            150 * punchForceMult,
            ent.position.clone().add(new THREE.Vector3(0, 1.3, 0)),
            this.dashDirection.clone(),
            this.fractureEngine,
            this.comicEffects
          );
          if (killed) {
            this.registerEntityKill(ent);
          }
          this.notifyState();
        }
      }

      if (rawWalkMult >= 2.5) {
        const dashWalls = this.world.getWallsInRadius(this.playerPosition, 1.75);
        for (const w of dashWalls) {
          if (w.isDestroyed || w.isIndestructible) continue;
          const destroyed = this.world.damageWall(
            w.id,
            260,
            w.center,
            this.dashDirection.clone(),
            this.fractureEngine,
            this.comicEffects,
            1.4,
            true
          );
          if (destroyed) {
            this.registerWallDestruction(w);
            this.notifyState();
          }
        }
      }

      if (this.dashDurationTimer <= 0) {
        this.state.isDashing = false;
      }
    } else if (wishDir.lengthSq() > 0.001) {
      wishDir.normalize();
      this.isWalking = true;

      this.playerVelocity.x = THREE.MathUtils.damp(
        this.playerVelocity.x,
        wishDir.x * moveSpeed,
        12,
        delta
      );
      this.playerVelocity.z = THREE.MathUtils.damp(
        this.playerVelocity.z,
        wishDir.z * moveSpeed,
        12,
        delta
      );

      if (this.isGrounded) {
        this.footstepTimer += delta * Math.min(1.8, effectiveMoveMult);
        if (this.footstepTimer > 0.36) {
          this.footstepTimer = 0;
          soundManager.playFootstep(this.state.biome);
        }
      }
    } else {
      this.isWalking = false;
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, 14, delta);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, 14, delta);
    }

    const wasGrounded = this.isGrounded;
    const preLandVelY = this.playerVelocity.y;
    this.playerVelocity.y += this.gravity * delta;
    this.playerPosition.y += this.playerVelocity.y * delta;

    if (this.playerPosition.y <= this.standingHeight) {
      this.playerPosition.y = this.standingHeight;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
      this.state.isGrounded = true;
      if (!wasGrounded && preLandVelY < -3.0) {
        soundManager.playLand();
      }
    } else {
      this.isGrounded = false;
      this.state.isGrounded = false;
    }

    const ceilingMax = this.world.wallHeight - 0.25;
    if (this.playerPosition.y >= ceilingMax) {
      this.playerPosition.y = ceilingMax;
      if (this.playerVelocity.y > 0) this.playerVelocity.y = 0;
    }

    this.playerPosition.x += this.playerVelocity.x * delta;
    this.playerPosition.z += this.playerVelocity.z * delta;

    const collision = this.world.resolvePlayerCollision(
      this.playerPosition,
      this.playerVelocity,
      0.44
    );
    this.playerPosition.copy(collision.position);

    if (this.dashDurationTimer > 0 && collision.collidedWithWall) {
      this.dashDurationTimer = 0;
      this.state.isDashing = false;
      this.comicEffects.triggerPunchShake(0.08, 22);
    }

    this.state.playerGridPos = {
      x: Math.floor(this.playerPosition.x / this.world.cellSize),
      z: Math.floor(this.playerPosition.z / this.world.cellSize),
    };
  }

  private updateAimingInspection() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const entityTarget = this.entityManager.getEntityAhead(this.raycaster, 4.2);
    const wallTarget = this.world.getWallAhead(this.raycaster, 3.4);

    if (entityTarget) {
      this.state.aimingAtEntity = true;
      this.state.aimingAtWall = true;
      this.state.targetEntityHealth = {
        current: Math.max(0, entityTarget.entity.health),
        max: entityTarget.entity.maxHealth,
        isBuilding: entityTarget.entity.state === 'building',
        isBoss: entityTarget.entity.isBoss,
      };
      this.state.targetWallHealth = undefined;
    } else if (wallTarget) {
      this.state.aimingAtEntity = false;
      this.state.aimingAtWall = true;
      this.state.targetEntityHealth = undefined;
      this.state.targetWallHealth = {
        current: Math.max(0, wallTarget.wall.health),
        max: wallTarget.wall.maxHealth,
        variant: wallTarget.wall.variant,
        isIndestructible: wallTarget.wall.isIndestructible,
      };
    } else {
      // Check ~20° Magnetic Auto-Aim Assist Cone for nearby walls or entities
      const magnet = this.findMagneticConeTarget(3.6, 20);
      if (magnet) {
        // Gentle magnetic snap when moving or turning near a target within 20°
        if (this.isWalking || this.keyboardTurnInput !== 0) {
          this.applySoftMagneticYawSnap(magnet.targetPoint, 0.08);
        }
        if (magnet.entityHit) {
          this.state.aimingAtEntity = true;
          this.state.aimingAtWall = true;
          this.state.targetEntityHealth = {
            current: Math.max(0, magnet.entityHit.entity.health),
            max: magnet.entityHit.entity.maxHealth,
            isBuilding: magnet.entityHit.entity.state === 'building',
            isBoss: magnet.entityHit.entity.isBoss,
          };
          this.state.targetWallHealth = undefined;
        } else if (magnet.wallHit) {
          this.state.aimingAtEntity = false;
          this.state.aimingAtWall = true;
          this.state.targetEntityHealth = undefined;
          this.state.targetWallHealth = {
            current: Math.max(0, magnet.wallHit.wall.health),
            max: magnet.wallHit.wall.maxHealth,
            variant: magnet.wallHit.wall.variant,
            isIndestructible: magnet.wallHit.wall.isIndestructible,
          };
        }
      } else {
        this.state.aimingAtEntity = false;
        this.state.aimingAtWall = false;
        this.state.targetWallHealth = undefined;
        this.state.targetEntityHealth = undefined;
      }
    }
  }

  /**
   * Finds the closest living entity or breakable wall within `maxAngleDeg` (~20°) of the camera's
   * forward horizontal look vector and within `maxDistance` meters.
   */
  private findMagneticConeTarget(
    maxDistance: number,
    maxAngleDeg = 20
  ): {
    targetPoint: THREE.Vector3;
    entityHit?: { entity: SkeletalEntity; hitPoint: THREE.Vector3 };
    wallHit?: { wall: DestructibleWall; hitPoint: THREE.Vector3 };
  } | null {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z);
    if (forwardFlat.lengthSq() < 0.0001) return null;
    forwardFlat.normalize();

    const minCos = Math.cos(THREE.MathUtils.degToRad(maxAngleDeg));

    // 1. Prioritize living entities within the ~20° magnetic cone
    let bestEntity: SkeletalEntity | null = null;
    let bestEntityScore = -Infinity;
    for (const ent of this.entityManager.entities) {
      if (ent.isDead) continue;
      const toEnt = new THREE.Vector3(
        ent.position.x - this.playerPosition.x,
        0,
        ent.position.z - this.playerPosition.z
      );
      const dist = toEnt.length();
      if (dist < 0.15 || dist > maxDistance + 0.35) continue;
      toEnt.divideScalar(dist);
      const cosAngle = forwardFlat.dot(toEnt);
      if (cosAngle >= minCos) {
        const score = cosAngle * 2.0 - dist / maxDistance;
        if (score > bestEntityScore) {
          bestEntityScore = score;
          bestEntity = ent;
        }
      }
    }

    if (bestEntity) {
      const hitPoint = bestEntity.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      return {
        targetPoint: hitPoint,
        entityHit: { entity: bestEntity, hitPoint },
      };
    }

    // 2. Check breakable walls within the ~20° magnetic cone
    const candidateWalls = this.world.getWallsInRadius(this.playerPosition, maxDistance + 0.6);
    let bestWall: DestructibleWall | null = null;
    let bestWallPoint: THREE.Vector3 | null = null;
    let bestWallScore = -Infinity;

    for (const wall of candidateWalls) {
      if (wall.isDestroyed || wall.isIndestructible) continue;
      // Compute closest point on wall's horizontal AABB to player
      const halfX = wall.size.x * 0.5;
      const halfZ = wall.size.z * 0.5;
      const clampedX = Math.max(
        wall.center.x - halfX,
        Math.min(wall.center.x + halfX, this.playerPosition.x)
      );
      const clampedZ = Math.max(
        wall.center.z - halfZ,
        Math.min(wall.center.z + halfZ, this.playerPosition.z)
      );

      // Blend closest point with wall center for stable angular aiming
      const aimX = clampedX * 0.65 + wall.center.x * 0.35;
      const aimZ = clampedZ * 0.65 + wall.center.z * 0.35;
      const dx = aimX - this.playerPosition.x;
      const dz = aimZ - this.playerPosition.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1 || dist > maxDistance) continue;

      const cosAngle = (forwardFlat.x * dx + forwardFlat.z * dz) / dist;
      if (cosAngle >= minCos) {
        const score = cosAngle * 2.0 - dist / maxDistance;
        if (score > bestWallScore) {
          bestWallScore = score;
          bestWall = wall;
          bestWallPoint = new THREE.Vector3(clampedX, this.playerPosition.y, clampedZ);
        }
      }
    }

    if (bestWall && bestWallPoint) {
      return {
        targetPoint: bestWall.center,
        wallHit: { wall: bestWall, hitPoint: bestWallPoint },
      };
    }

    return null;
  }

  /**
   * Softly adjusts `cameraRotation.y` toward `targetPoint` when within the ~20° magnetic assist cone.
   */
  private applySoftMagneticYawSnap(targetPoint: THREE.Vector3, strength = 0.25) {
    const dx = targetPoint.x - this.playerPosition.x;
    const dz = targetPoint.z - this.playerPosition.z;
    if (dx * dx + dz * dz < 0.04) return;

    const desiredYaw = Math.atan2(-dx, -dz);
    let diff = desiredYaw - this.cameraRotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    const maxSnapRad = THREE.MathUtils.degToRad(20);
    if (Math.abs(diff) <= maxSnapRad) {
      this.cameraRotation.y += diff * strength;
    }
  }

  private syncCombinedMoveInput() {
    if (this.shockParalysisTimer > 0) {
      this.moveInput.set(0, 0);
      return;
    }
    // For touch analog joystick: horizontal deflection steers the camera, so pushing the stick
    // forward/diagonally/sideways drives forward movement along the aimed camera direction!
    let touchX = 0;
    let touchY = 0;
    const touchMag = Math.min(1, this.touchMoveInput.length());
    if (touchMag > 0.04) {
      if (this.touchMoveInput.y >= -0.3) {
        touchY = touchMag;
        touchX = this.touchMoveInput.x * 0.22;
      } else {
        touchY = this.touchMoveInput.y;
        touchX = this.touchMoveInput.x * 0.25;
      }
    }

    const combinedX = this.keyboardMoveInput.x + touchX;
    const combinedY = this.keyboardMoveInput.y + touchY;
    this.moveInput.set(combinedX, combinedY);
    if (this.moveInput.lengthSq() > 1) {
      this.moveInput.normalize();
    }
  }

  public setMoveInput(x: number, y: number) {
    if (x !== 0 || y !== 0) {
      this.hasInteractedInRun = true;
    }
    this.touchMoveInput.set(x, y);
    if (this.shockParalysisTimer > 0) {
      this.moveInput.set(0, 0);
      return;
    }
    this.syncCombinedMoveInput();
  }

  public setTouchPunchHeld(held: boolean) {
    this.isTouchPunchHeld = held;
  }

  public rotateCamera(deltaYaw: number, deltaPitch: number) {
    this.cameraRotation.y -= deltaYaw;
    this.cameraRotation.x -= deltaPitch;

    const maxPitch = (Math.PI / 180) * 82;
    this.cameraRotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.cameraRotation.x));
    this.arms.addCameraSway(deltaYaw * 180, deltaPitch * 180);
  }

  public handleResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private initEventListeners() {
    const keysDown = new Set<string>();

    const updateKeys = () => {
      let x = 0;
      let y = 0;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) y += 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) y -= 1;
      if (keysDown.has('KeyA')) x -= 1;
      if (keysDown.has('KeyD')) x += 1;

      this.keyboardMoveInput.set(x, y);
      this.syncCombinedMoveInput();

      // Chromebook Trackpad-Free Camera Rotation via [←]/[→] or [Q]/[E]
      let turn = 0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyQ')) turn -= 1;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyE')) turn += 1;
      this.keyboardTurnInput = turn;
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        soundManager.toggleMute();
        this.notifyState();
        return;
      }

      if (this.state.status === 'playing' && (e.code === 'Tab' || e.code === 'KeyU')) {
        e.preventDefault();
        this.openMenu();
        return;
      }

      if (
        this.state.status !== 'playing' ||
        this.state.isPaused ||
        this.state.revivePromptActive
      )
        return;
      this.hasInteractedInRun = true;
      soundManager.init();

      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'Space' ||
        e.code === 'Enter'
      ) {
        e.preventDefault();
      }

      keysDown.add(e.code);
      updateKeys();

      // Smart Space Bar (PC Pointer Lock = Jump; Chromebook unlocked keyboard mode = Turbo Punch)
      // while [Enter], [NumpadEnter], and [J] always execute Turbo Punch in any mode
      if (e.code === 'Space' && this.state.isPointerLocked) {
        e.preventDefault();
        this.jump();
      } else if (
        e.code === 'Space' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.code === 'KeyJ'
      ) {
        this.isKeyPunchHeld = true;
        this.punch('combo');
      } else if (e.code === 'KeyK' || e.code === 'KeyL') {
        this.punch('uppercut_right');
      } else if (e.code === 'KeyF' || e.code === 'KeyR') {
        if (this.state.isRageFull) {
          this.punch('super');
        }
      } else if (e.code === 'KeyC' || e.code === 'KeyV') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.dash();
      }
    });

    window.addEventListener('keyup', (e) => {
      keysDown.delete(e.code);
      if (
        e.code === 'Space' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.code === 'KeyJ'
      ) {
        this.isKeyPunchHeld = (
          keysDown.has('Space') ||
          keysDown.has('Enter') ||
          keysDown.has('NumpadEnter') ||
          keysDown.has('KeyJ')
        );
      }
      updateKeys();
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.state.status !== 'playing' || this.state.revivePromptActive) return;
      this.hasInteractedInRun = true;
      soundManager.init();
      if (this.state.isPaused) {
        this.resumeGame();
        return;
      }
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      this.state.isPointerLocked = locked;
      if (locked) {
        this.hasLockedPointerInRun = true;
        if (this.state.status === 'playing' && this.state.isPaused) {
          this.state.isPaused = false;
          soundManager.setMusicContext('playing', this.state.biome, this.state.isJackpotFloor, false);
          portalSDK.gameplayStart();
        }
      } else {
        this.isLeftMouseDown = false;
        if (
          this.hasLockedPointerInRun &&
          this.state.status === 'playing' &&
          !this.state.revivePromptActive &&
          this.transitionTimer <= 0
        ) {
          this.state.isPaused = true;
          soundManager.playModalOpen();
          soundManager.setMusicContext('paused', this.state.biome, this.state.isJackpotFloor, true);
          keysDown.clear();
          this.setMoveInput(0, 0);
          portalSDK.gameplayStop();
        }
      }
      this.notifyState();
    });

    document.addEventListener('mousemove', (e) => {
      if (
        document.pointerLockElement === canvas &&
        this.state.status === 'playing' &&
        !this.state.isPaused &&
        !this.state.revivePromptActive
      ) {
        const sensitivity = 0.0022;
        this.rotateCamera(e.movementX * sensitivity, e.movementY * sensitivity);
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (
        this.state.status !== 'playing' ||
        this.state.isPaused ||
        this.state.revivePromptActive
      )
        return;
      soundManager.init();
      if (e.button === 0) {
        // Hold Left Click / Screen Tap enables Continuous Smart Action (Throw Ball / Super Smash / Turbo Punch)!
        this.isLeftMouseDown = true;
        this.triggerSmartAction();
      } else if (e.button === 2) {
        if (this.state.isRageFull && !this.ballManager.heldBall) {
          this.punch('super');
        } else {
          this.punch('uppercut_right');
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isLeftMouseDown = false;
      }
    });

    window.addEventListener('blur', () => {
      this.isLeftMouseDown = false;
      this.isKeyPunchHeld = false;
      this.isTouchPunchHeld = false;
      this.keyboardTurnInput = 0;
      this.keyboardMoveInput.set(0, 0);
      this.touchMoveInput.set(0, 0);
      this.moveInput.set(0, 0);

      if (
        this.state.status === 'playing' &&
        !this.state.isPaused &&
        !this.state.revivePromptActive &&
        this.transitionTimer <= 0
      ) {
        this.state.isPaused = true;
        soundManager.setMusicContext('paused', this.state.biome, this.state.isJackpotFloor, true);
        portalSDK.gameplayStop();
        this.notifyState();
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.handleResize());
  }

  private notifyState() {
    this.onStateChange?.({ ...this.state });
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    this.renderer.dispose();
    this.world.clear();
    this.fractureEngine.clearAll();
    this.comicEffects.clearAll();
    this.ballManager.clearAll();
    this.entityManager.clearAll();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
