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

  /**
   * Detects when the game is running inside AI Studio Build / Cloud Run preview (`*.run.app`)
   * or local development rather than Poki's production domain (`*.poki.com`, `*.poki-gdn.com`).
   * Returns `false` in Node test harnesses where `window.location` is undefined.
   */
  private isBuildOrLocalEnvironment(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const host = window.location?.hostname;
    if (!host) return false;
    const isPokiDomain =
      host === 'poki.com' ||
      host.endsWith('.poki.com') ||
      host.endsWith('.poki-gdn.com') ||
      host.endsWith('.gdn.poki.com');
    return !isPokiDomain;
  }

  /**
   * Renders a clean, self-contained Rewarded Ad simulation overlay inside AI Studio Build mode
   * when Poki's live IMA/DoubleClick video ad cannot play in the sandboxed iframe, guaranteeing
   * that the player sees clear ad feedback and receives 100% of their reward.
   */
  private async showBuildModeRewardedAdOverlay(
    onCountdownTick?: (secLeft: number) => void
  ): Promise<boolean> {
    if (typeof document === 'undefined' || !document.body) {
      for (let s = 2; s >= 1; s--) {
        onCountdownTick?.(s);
        await new Promise((r) => setTimeout(r, 850));
      }
      onCountdownTick?.(0);
      return true;
    }

    const overlay = document.createElement('div');
    overlay.setAttribute('data-poki-build-ad', 'true');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'background:rgba(9,9,15,0.92)',
      'backdrop-filter:blur(8px)',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'font-family:"Arial Black",Impact,sans-serif',
      'color:#ffffff',
      'user-select:none',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%)',
      'border:4px solid #facc15',
      'border-radius:20px',
      'padding:28px 36px',
      'max-width:420px',
      'width:90%',
      'text-align:center',
      'box-shadow:0 20px 50px rgba(0,0,0,0.85),0 0 30px rgba(250,204,21,0.35)',
    ].join(';');

    const badge = document.createElement('div');
    badge.style.cssText = [
      'display:inline-block',
      'background:#facc15',
      'color:#09090b',
      'font-size:12px',
      'font-weight:900',
      'letter-spacing:1.5px',
      'padding:4px 12px',
      'border-radius:6px',
      'margin-bottom:14px',
      'border:2px solid #000',
    ].join(';');
    badge.textContent = 'POKI SDK • BUILD MODE AD';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:22px;font-weight:900;color:#ffffff;margin-bottom:8px;text-shadow:0 3px 0 #000;';
    title.textContent = 'REWARDED VIDEO AD';

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:14px;font-family:sans-serif;font-weight:700;color:#fde047;margin-bottom:18px;';
    subtitle.textContent = 'Liberando recompensa em 2s...';

    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'width:100%;height:14px;background:#09090b;border:2px solid #000;border-radius:8px;overflow:hidden;';

    const barFill = document.createElement('div');
    barFill.style.cssText = 'width:15%;height:100%;background:linear-gradient(90deg,#22c55e,#facc15);transition:width 0.75s linear;';
    barWrap.appendChild(barFill);

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(barWrap);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    try {
      onCountdownTick?.(2);
      requestAnimationFrame(() => {
        barFill.style.width = '55%';
      });
      await new Promise((r) => setTimeout(r, 750));

      subtitle.textContent = 'Liberando recompensa em 1s...';
      onCountdownTick?.(1);
      barFill.style.width = '100%';
      await new Promise((r) => setTimeout(r, 750));

      subtitle.textContent = 'Recompensa garantida!';
      onCountdownTick?.(0);
      await new Promise((r) => setTimeout(r, 150));
    } finally {
      overlay.remove();
    }

    return true;
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const isBuildEnv = this.isBuildOrLocalEnvironment();
    if (isBuildEnv && typeof window !== 'undefined') {
      try {
        window.PokiSDK?.setDebug?.(true);
      } catch {
        // safe ignore
      }
    }

    if (typeof window !== 'undefined' && window.PokiSDK?.init) {
      Promise.race([
        isBuildEnv ? window.PokiSDK.init({ debug: true }) : window.PokiSDK.init(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('PokiSDK init timeout')), 5000)
        ),
      ])
        .then(() => {
          this.isPokiAvailable = true;
          this.hasAdBlocker = false;
          try {
            if (isBuildEnv) {
              window.PokiSDK?.setDebug?.(true);
            }
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
        (this.isPokiAvailable || !this.hasAdBlocker) &&
        typeof window !== 'undefined' &&
        Boolean(window.PokiSDK?.commercialBreak);

      if (canShowPoki && window.PokiSDK?.commercialBreak) {
        const isBuildEnv = this.isBuildOrLocalEnvironment();
        if (isBuildEnv) {
          try {
            window.PokiSDK.setDebug?.(true);
          } catch {
            // ignore
          }
        }
        await Promise.race([
          window.PokiSDK.commercialBreak(() => {
            soundManager.suspendForAd();
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 12000)),
          ...(isBuildEnv ? [new Promise<void>((resolve) => setTimeout(resolve, 350))] : []),
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
   * Includes 35s safety timeout and fallback support for ad blockers / AI Studio Build mode.
   */
  public async requestRewardedAd(onCountdownTick?: (secLeft: number) => void): Promise<boolean> {
    this.adInProgress = true;
    this.gameplayStop();
    soundManager.suspendForAd();

    try {
      const isBuildEnv = this.isBuildOrLocalEnvironment();
      const canShowPoki =
        (this.isPokiAvailable || !this.hasAdBlocker) &&
        typeof window !== 'undefined' &&
        Boolean(window.PokiSDK?.rewardedBreak);

      // 1. Check PokiSDK
      if (canShowPoki && window.PokiSDK?.rewardedBreak) {
        if (isBuildEnv) {
          try {
            window.PokiSDK.setDebug?.(true);
          } catch {
            // ignore
          }
        }

        let adStarted = false;
        const success = await Promise.race([
          window.PokiSDK.rewardedBreak(() => {
            adStarted = true;
            soundManager.suspendForAd();
          }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 35000)),
          ...(isBuildEnv
            ? [
                new Promise<boolean>((resolve) =>
                  setTimeout(() => {
                    if (!adStarted) resolve(false);
                  }, 1200)
                ),
              ]
            : []),
        ]);

        if (success) {
          this.lastRewardedAdTimestamp = Date.now();
          this.lastAdTimestamp = Date.now();
          return true;
        }

        // In AI Studio Build / Local Preview mode, Poki's SDK resolves `false` when outside
        // `*.poki.com` or when Google IMA is blocked by iframe CSP. Run the Build Mode ad
        // simulation so rewards are 100% guaranteed during development and testing.
        if (isBuildEnv) {
          const simOk = await this.showBuildModeRewardedAdOverlay(onCountdownTick);
          if (simOk) {
            this.lastRewardedAdTimestamp = Date.now();
            this.lastAdTimestamp = Date.now();
          }
          return simOk;
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
        if (isBuildEnv) {
          const simOk = await this.showBuildModeRewardedAdOverlay(onCountdownTick);
          if (simOk) {
            this.lastRewardedAdTimestamp = Date.now();
            this.lastAdTimestamp = Date.now();
          }
          return simOk;
        }
        return false;
      }

      // 3. Safe Dev / Ad-Blocker / Build Mode Fallback
      const fallbackOk = await this.showBuildModeRewardedAdOverlay(onCountdownTick);
      if (fallbackOk) {
        this.lastRewardedAdTimestamp = Date.now();
        this.lastAdTimestamp = Date.now();
      }
      return fallbackOk;
    } catch {
      this.lastRewardedAdTimestamp = Date.now();
      this.lastAdTimestamp = Date.now();
      return true;
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

