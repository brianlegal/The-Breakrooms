/**
 * Official Web Portal SDK Integration Bridge for Poki (`window.PokiSDK`) and CrazyGames (`window.CrazyGames.SDK`).
 * Handles mandatory lifecycle events (`gameplayStart`, `gameplayStop`, `commercialBreak`, `rewardedBreak`)
 * and automatic audio suspension during ads.
 */
import { soundManager } from './audio';

export interface PokiSDKInterface {
  init?: (options?: Record<string, unknown>) => Promise<void>;
  setDebug?: (debug?: boolean) => void;
  isAdBlocked?: () => boolean;
  gameLoadingFinished?: () => void;
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  commercialBreak?: (onStart?: () => void) => Promise<void>;
  rewardedBreak?: (onStart?: () => void) => Promise<boolean>;
  happyTime?: (magnitude?: number) => void;
}

export interface CrazyGamesSDKInterface {
  ad?: {
    requestAd?: (
      type: 'midgame' | 'rewarded',
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: unknown) => void;
      }
    ) => void;
  };
  game?: {
    gameplayStart?: () => void;
    gameplayStop?: () => void;
    happytime?: () => void;
  };
}

declare global {
  interface Window {
    PokiSDK?: PokiSDKInterface;
    CrazyGames?: {
      SDK?: CrazyGamesSDKInterface;
    };
  }
}

export class PortalSDKManager {
  public static readonly COMMERCIAL_COOLDOWN_MS = 150_000; // 150s minimum between ads
  public static readonly REWARDED_GRACE_MS = 90_000; // Do not show commercial break right after a rewarded ad

  private isGameplayActive = false;
  private pendingGameplayStart = false;
  private initialized = false;
  private isPokiAvailable = false;
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

  public get pokiAvailable(): boolean {
    return this.isPokiAvailable;
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

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof window !== 'undefined' && window.PokiSDK?.init) {
      Promise.race([
        window.PokiSDK.init(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('PokiSDK init timeout')), 5000)
        ),
      ])
        .then(() => {
          this.isPokiAvailable = true;
          this.hasAdBlocker = false;
          try {
            window.PokiSDK?.gameLoadingFinished?.();
          } catch {
            // safe ignore
          }
        })
        .catch(() => {
          // Ad blocker detected or running offline/outside Poki platform
          this.isPokiAvailable = false;
          this.hasAdBlocker = true;
          try {
            window.PokiSDK?.gameLoadingFinished?.();
          } catch {
            // safe ignore
          }
        });
    } else {
      this.isPokiAvailable = false;
      this.hasAdBlocker = false;
    }
  }

  /**
   * Fires mandatory `gameplayStart` event for Poki & CrazyGames when active gameplay begins/resumes.
   */
  public gameplayStart(): void {
    if (this.adInProgress) {
      this.pendingGameplayStart = true;
      return;
    }
    this.pendingGameplayStart = false;
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;

    try {
      window.PokiSDK?.gameplayStart?.();
    } catch {
      // ignore
    }

    try {
      window.CrazyGames?.SDK?.game?.gameplayStart?.();
    } catch {
      // ignore
    }
  }

  /**
   * Fires mandatory `gameplayStop` event for Poki & CrazyGames when entering menu, pause, or game over.
   */
  public gameplayStop(): void {
    this.pendingGameplayStart = false;
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;

    try {
      window.PokiSDK?.gameplayStop?.();
    } catch {
      // ignore
    }

    try {
      window.CrazyGames?.SDK?.game?.gameplayStop?.();
    } catch {
      // ignore
    }
  }

  public happyTime(magnitude = 0.5): void {
    try {
      window.PokiSDK?.happyTime?.(magnitude);
    } catch {
      // ignore
    }

    try {
      window.CrazyGames?.SDK?.game?.happytime?.();
    } catch {
      // ignore
    }
  }

  /**
   * Resilient Commercial Break with safety timeout & audio suspension.
   * Poki handles internal rate-limiting (approx once every 2-3 minutes).
   * Wrapped in a 12s timeout and try/catch to guarantee zero soft-locking.
   */
  public async commercialBreak(): Promise<void> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      const canShowPoki =
        typeof window !== 'undefined' && Boolean(window.PokiSDK?.commercialBreak);

      if (canShowPoki && window.PokiSDK?.commercialBreak) {
        await Promise.race([
          window.PokiSDK.commercialBreak(() => {
            soundManager.suspendForAd();
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
   * Requests a real Rewarded Ad from PokiSDK (or CrazyGames SDK), automatically muting/suspending
   * WebAudio during the ad and resuming afterwards.
   * Strictly returns `false` if blocked by AdBlocker, unfilled, or cancelled.
   */
  public async requestRewardedAd(onCountdownTick?: (secLeft: number) => void): Promise<boolean> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      // 1. Check PokiSDK
      if (typeof window !== 'undefined' && Boolean(window.PokiSDK?.rewardedBreak)) {
        const success = await Promise.race([
          window.PokiSDK!.rewardedBreak!(() => {
            soundManager.suspendForAd();
          }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 35000)),
        ]);

        if (success) {
          this.lastRewardedAdTimestamp = Date.now();
          this.lastAdTimestamp = Date.now();
          return true;
        }
        return false;
      }

      // 2. Check CrazyGames SDK
      if (typeof window !== 'undefined' && window.CrazyGames?.SDK?.ad?.requestAd) {
        const crazySuccess = await Promise.race([
          new Promise<boolean>((resolve) => {
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

      // 3. Neither PokiSDK nor CrazyGames exists
      if (typeof window === 'undefined') {
        onCountdownTick?.(0);
        return true;
      }
      if (!import.meta.env?.DEV) {
        return false;
      }
      return false;
    } catch {
      if (typeof window !== 'undefined' && Boolean(window.PokiSDK || window.CrazyGames)) {
        return false;
      }
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

