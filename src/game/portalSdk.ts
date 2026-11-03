/**
 * Official CrazyGames HTML5 SDK v3 Integration Bridge (`window.CrazyGames.SDK`).
 * Handles mandatory async `SDK.init()`, lifecycle events (`loadingStart`, `loadingStop`,
 * `gameplayStart`, `gameplayStop`, `happytime`), `ad.requestAd('midgame' | 'rewarded')`,
 * and automatic WebAudio suspension during ads.
 */
import { soundManager } from './audio';

export interface CrazyGamesSDKInterface {
  environment?: 'local' | 'crazygames' | 'disabled' | 'uninitialized' | string;
  init?: () => Promise<void>;
  game?: {
    loadingStart?: () => void;
    loadingStop?: () => void;
    gameplayStart?: () => void;
    gameplayStop?: () => void;
    happytime?: () => void;
  };
  ad?: {
    requestAd?: (
      type: 'midgame' | 'rewarded',
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: unknown) => void;
      }
    ) => void;
    hasAdblock?: () => Promise<boolean>;
  };
  data?: {
    getItem?: (key: string) => string | null;
    setItem?: (key: string, value: string) => void;
    removeItem?: (key: string) => void;
    clear?: () => void;
  };
}

declare global {
  interface Window {
    __CRAZY_SDK_INITIALIZED__?: boolean;
    CrazyGames?: {
      SDK?: CrazyGamesSDKInterface;
    };
  }
}

function ensureLocalSdkForPreviewHost(): void {
  if (typeof window === 'undefined' || !window.location) return;
  const host = window.location.hostname || '';
  if (host.endsWith('.run.app') || host.includes('googleusercontent.com')) {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('useLocalSdk') !== 'true') {
        params.set('useLocalSdk', 'true');
        const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ''}`;
        window.history?.replaceState?.(null, '', nextUrl);
      }
    } catch {
      // ignore URL update errors
    }
  }
}

export class PortalSDKManager {
  public static readonly COMMERCIAL_COOLDOWN_MS = 150_000; // 150s minimum between ads
  public static readonly REWARDED_GRACE_MS = 90_000; // Do not show commercial break right after a rewarded ad

  private isGameplayActive = false;
  private pendingGameplayStart = false;
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  private isSdkAvailable = false;
  private hasAdBlocker = false;
  private adInProgress = false;
  private lastAdTimestamp = 0;
  private lastRewardedAdTimestamp = 0;

  public get isAdActive(): boolean {
    return this.adInProgress;
  }

  public get isBlocked(): boolean {
    return this.hasAdBlocker;
  }

  public get sdkAvailable(): boolean {
    return this.isSdkAvailable;
  }

  public get pokiAvailable(): boolean {
    return this.isSdkAvailable;
  }

  /**
   * Flowchart Rule F: Have more than 150s passed since the last ad?
   */
  public hasPassedCommercialCooldown(now = Date.now()): boolean {
    if (this.lastAdTimestamp <= 0) return true;
    return now - this.lastAdTimestamp >= PortalSDKManager.COMMERCIAL_COOLDOWN_MS;
  }

  /**
   * Flowchart Rule G: Did the player watch a rewarded ad recently?
   */
  public hasWatchedRewardedAdRecently(now = Date.now()): boolean {
    if (this.lastRewardedAdTimestamp <= 0) return false;
    return now - this.lastRewardedAdTimestamp < PortalSDKManager.REWARDED_GRACE_MS;
  }

  /**
   * Flowchart Decision (F -> G -> H / I):
   * Only allow a Commercial Break on definitive Game Over if >150s have passed since the last ad
   * AND the player has NOT watched a rewarded ad recently.
   */
  public canShowGameOverCommercialBreak(now = Date.now()): boolean {
    if (!this.hasPassedCommercialCooldown(now)) return false;
    if (this.hasWatchedRewardedAdRecently(now)) return false;
    return true;
  }

  private isCrazySdkReady(): boolean {
    if (typeof window === 'undefined' || !window.CrazyGames?.SDK) return false;
    try {
      const env = window.CrazyGames.SDK.environment;
      if (env === 'uninitialized' || env === 'disabled') {
        return false;
      }
      if (env === 'local' || env === 'crazygames') {
        return this.isSdkAvailable;
      }
    } catch {
      return false;
    }
    if (typeof window.CrazyGames.SDK.init === 'function') {
      return this.isSdkAvailable;
    }
    return true;
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    ensureLocalSdkForPreviewHost();

    if (typeof window !== 'undefined' && typeof window.CrazyGames?.SDK?.init === 'function') {
      this.initPromise = Promise.race([
        window.CrazyGames.SDK.init(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('CrazyGames SDK init timeout')), 5000)
        ),
      ])
        .then(async () => {
          const env = window.CrazyGames?.SDK?.environment;
          if (env === 'uninitialized' || env === 'disabled') {
            this.isSdkAvailable = false;
            this.hasAdBlocker = false;
            if (typeof window !== 'undefined') {
              window.__CRAZY_SDK_INITIALIZED__ = false;
            }
            return false;
          }

          this.isSdkAvailable = true;
          this.hasAdBlocker = false;
          if (typeof window !== 'undefined') {
            window.__CRAZY_SDK_INITIALIZED__ = true;
          }

          try {
            window.CrazyGames?.SDK?.game?.loadingStart?.();
            window.CrazyGames?.SDK?.game?.loadingStop?.();
          } catch {
            // safe ignore
          }

          try {
            if (window.CrazyGames?.SDK?.ad?.hasAdblock) {
              const blocked = await window.CrazyGames.SDK.ad.hasAdblock();
              this.hasAdBlocker = Boolean(blocked);
            }
          } catch {
            // safe ignore
          }

          if (this.isGameplayActive) {
            try {
              window.CrazyGames?.SDK?.game?.gameplayStart?.();
            } catch {
              // safe ignore
            }
          }

          return true;
        })
        .catch(() => {
          this.isSdkAvailable = false;
          this.hasAdBlocker = true;
          if (typeof window !== 'undefined') {
            window.__CRAZY_SDK_INITIALIZED__ = false;
          }
          return false;
        });
    } else {
      this.isSdkAvailable = false;
      this.hasAdBlocker = false;
      this.initPromise = Promise.resolve(false);
    }
  }

  /**
   * Fires mandatory `gameplayStart` event for CrazyGames SDK v3 when active gameplay begins/resumes.
   */
  public gameplayStart(): void {
    if (this.adInProgress) {
      this.pendingGameplayStart = true;
      return;
    }
    this.pendingGameplayStart = false;
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;

    if (!this.isCrazySdkReady()) return;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart?.();
    } catch {
      // ignore
    }
  }

  /**
   * Fires mandatory `gameplayStop` event for CrazyGames SDK v3 when entering menu, pause, or game over.
   */
  public gameplayStop(): void {
    this.pendingGameplayStart = false;
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;

    if (!this.isCrazySdkReady()) return;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStop?.();
    } catch {
      // ignore
    }
  }

  public happyTime(magnitude = 0.5): void {
    void magnitude;
    if (!this.isCrazySdkReady()) return;
    try {
      window.CrazyGames?.SDK?.game?.happytime?.();
    } catch {
      // ignore
    }
  }

  /**
   * Resilient Midgame Commercial Break (`ad.requestAd('midgame')`) with 12s safety timeout & audio suspension.
   */
  public async commercialBreak(): Promise<void> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      if (this.initPromise) {
        await this.initPromise;
      }

      if (this.isCrazySdkReady() && window.CrazyGames?.SDK?.ad?.requestAd) {
        await Promise.race([
          new Promise<void>((resolve) => {
            try {
              window.CrazyGames!.SDK!.ad!.requestAd!('midgame', {
                adStarted: () => {
                  soundManager.suspendForAd();
                },
                adFinished: () => {
                  resolve();
                },
                adError: () => {
                  resolve();
                },
              });
            } catch {
              resolve();
            }
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 12000)),
        ]);
      }
    } catch {
      // Ad failed or blocked - proceed immediately without soft-locking
    } finally {
      this.lastAdTimestamp = Date.now();
      this.adInProgress = false;
      soundManager.resumeAfterAd();
      if (this.pendingGameplayStart) {
        this.pendingGameplayStart = false;
        this.gameplayStart();
      }
    }
  }

  /**
   * Requests a real Rewarded Ad from CrazyGames SDK v3 (`ad.requestAd('rewarded')`),
   * automatically muting/suspending WebAudio during the ad and resuming afterwards.
   * Strictly returns `false` if blocked by AdBlocker, unfilled, or errored.
   */
  public async requestRewardedAd(onCountdownTick?: (secLeft: number) => void): Promise<boolean> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      if (this.initPromise) {
        await this.initPromise;
      }

      if (this.isCrazySdkReady() && window.CrazyGames?.SDK?.ad?.requestAd) {
        const crazySuccess = await Promise.race([
          new Promise<boolean>((resolve) => {
            try {
              window.CrazyGames!.SDK!.ad!.requestAd!('rewarded', {
                adStarted: () => {
                  soundManager.suspendForAd();
                },
                adFinished: () => {
                  resolve(true);
                },
                adError: () => {
                  resolve(false);
                },
              });
            } catch {
              resolve(false);
            }
          }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 35000)),
        ]);

        if (crazySuccess) {
          this.lastRewardedAdTimestamp = Date.now();
          this.lastAdTimestamp = Date.now();
          return true;
        }
        return false;
      }

      if (typeof window === 'undefined') {
        onCountdownTick?.(0);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      this.adInProgress = false;
      soundManager.resumeAfterAd();
      if (this.pendingGameplayStart) {
        this.pendingGameplayStart = false;
        this.gameplayStart();
      }
    }
  }
}

export const portalSDK = new PortalSDKManager();
