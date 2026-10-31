/**
 * Official Web Portal SDK Integration Bridge for Poki (`window.PokiSDK`) and CrazyGames (`window.CrazyGames.SDK`).
 * Handles mandatory lifecycle events (`gameplayStart`, `gameplayStop`, `commercialBreak`, `rewardedBreak`)
 * and automatic audio suspension during ads.
 */
import { soundManager } from './audio';

export interface PokiSDKInterface {
  init?: () => Promise<void>;
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
  private isGameplayActive = false;
  private initialized = false;
  private isPokiAvailable = false;
  private hasAdBlocker = false;
  private adInProgress = false;

  public get isAdActive(): boolean {
    return this.adInProgress;
  }

  public get isBlocked(): boolean {
    return this.hasAdBlocker;
  }

  public get pokiAvailable(): boolean {
    return this.isPokiAvailable;
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
        (this.isPokiAvailable || !this.hasAdBlocker) &&
        typeof window !== 'undefined' &&
        Boolean(window.PokiSDK?.commercialBreak);

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
      this.adInProgress = false;
      soundManager.resumeAfterAd();
    }
  }

  /**
   * Requests a real Rewarded Ad from PokiSDK (or CrazyGames SDK), automatically muting/suspending
   * WebAudio during the ad and resuming afterwards.
   * Includes 35s safety timeout and fallback support for ad blockers / local development.
   */
  public async requestRewardedAd(onCountdownTick?: (secLeft: number) => void): Promise<boolean> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      const canShowPoki =
        (this.isPokiAvailable || !this.hasAdBlocker) &&
        typeof window !== 'undefined' &&
        Boolean(window.PokiSDK?.rewardedBreak);

      // 1. Check PokiSDK
      if (canShowPoki && window.PokiSDK?.rewardedBreak) {
        const success = await Promise.race([
          window.PokiSDK.rewardedBreak(() => {
            soundManager.suspendForAd();
          }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 35000)),
        ]);
        return Boolean(success);
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
        return Boolean(crazySuccess);
      }

      // 3. Safe Dev / Ad-Blocker Fallback (2 seconds countdown simulation)
      for (let s = 2; s >= 1; s--) {
        onCountdownTick?.(s);
        await new Promise((r) => setTimeout(r, 900));
      }
      onCountdownTick?.(0);
      return true;
    } catch {
      return true;
    } finally {
      this.adInProgress = false;
      soundManager.resumeAfterAd();
    }
  }
}

export const portalSDK = new PortalSDKManager();
