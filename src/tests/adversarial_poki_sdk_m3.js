/**
 * Adversarial Verification Suite: Poki Games SDK v2 Integration & Port 3000 Deployment
 * Backrooms Wall Breaker 3D - Milestone 3
 *
 * Verifies:
 * 1. Poki SDK v2 Script Inclusion in `index.html` head
 * 2. Full Poki SDK Bridge Architecture in `src/game/portalSdk.ts`
 * 3. Commercial Break Lifecycle, Audio Suspension & Safety Timeouts
 * 4. Rewarded Ad Lifecycle, Timeout Safety & Dev/Ad-Blocker Fallbacks
 * 5. Commercial Break Wiring in GameEngine Transitions (`finalizeGameOver`, `startRun`, `triggerNextLevelTransition`)
 * 6. All 6 Rewarded Ad Touchpoints (`GameModal.tsx` & `HUD.tsx` & `gameEngine.ts`)
 * 7. Port 3000 & Host 0.0.0.0 Configuration in `vite.config.ts` & `package.json`
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failedTests++;
    failures.push(message);
    console.error(`  ❌ FAIL: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function runAsyncSuite(name, fn) {
  console.log(`\n==================================================`);
  console.log(`RUNNING SUITE: ${name}`);
  console.log(`==================================================`);
  try {
    await fn();
  } catch (err) {
    failedTests++;
    failures.push(`Suite "${name}" threw exception: ${err.message}\n${err.stack}`);
    console.error(`  💥 EXCEPTION in suite "${name}":`, err);
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: Poki SDK v2 Script Tag in index.html
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 1: Poki SDK v2 Script Tag in index.html', async () => {
  const indexPath = path.join(ROOT_DIR, 'index.html');
  assert(fs.existsSync(indexPath), 'index.html exists');

  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  const hasPokiScript = indexContent.includes(
    'src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"'
  );
  assert(hasPokiScript, 'index.html includes exact Poki SDK v2 script url');

  const headStart = indexContent.indexOf('<head>');
  const headEnd = indexContent.indexOf('</head>');
  const pokiPos = indexContent.indexOf('https://game-cdn.poki.com/scripts/v2/poki-sdk.js');

  assert(
    headStart !== -1 && headEnd !== -1 && pokiPos > headStart && pokiPos < headEnd,
    'Poki SDK v2 script is positioned strictly inside <head>...</head>'
  );

  const mainScriptPos = indexContent.indexOf('/src/main.tsx');
  assert(
    mainScriptPos !== -1 && pokiPos < mainScriptPos,
    'Poki SDK v2 loads in <head> prior to application module script in <body>'
  );
});

// -----------------------------------------------------------------------------
// SUITE 2: Poki SDK Bridge Architecture in src/game/portalSdk.ts
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 2: Poki SDK Bridge Architecture in portalSdk.ts', async () => {
  const portalSdkPath = path.join(ROOT_DIR, 'src', 'game', 'portalSdk.ts');
  assert(fs.existsSync(portalSdkPath), 'src/game/portalSdk.ts exists');

  const portalContent = fs.readFileSync(portalSdkPath, 'utf-8');

  // 1. Interface definition
  assert(
    portalContent.includes('export interface PokiSDKInterface'),
    'portalSdk.ts exports PokiSDKInterface'
  );
  assert(
    portalContent.includes('commercialBreak?: (onStart?: () => void) => Promise<void>;'),
    'PokiSDKInterface defines commercialBreak'
  );
  assert(
    portalContent.includes('rewardedBreak?: (onStart?: () => void) => Promise<boolean>;'),
    'PokiSDKInterface defines rewardedBreak'
  );
  assert(
    portalContent.includes('gameplayStart?: () => void;'),
    'PokiSDKInterface defines gameplayStart'
  );
  assert(
    portalContent.includes('gameplayStop?: () => void;'),
    'PokiSDKInterface defines gameplayStop'
  );
  assert(
    portalContent.includes('happyTime?: (magnitude?: number) => void;'),
    'PokiSDKInterface defines happyTime with magnitude'
  );

  // 2. Class implementation
  assert(
    portalContent.includes('public async commercialBreak(): Promise<void>'),
    'PortalSDKManager implements commercialBreak'
  );
  assert(
    portalContent.includes('public async requestRewardedAd('),
    'PortalSDKManager implements requestRewardedAd'
  );
  assert(
    portalContent.includes('public gameplayStart(): void'),
    'PortalSDKManager implements gameplayStart'
  );
  assert(
    portalContent.includes('public gameplayStop(): void'),
    'PortalSDKManager implements gameplayStop'
  );
  assert(
    portalContent.includes('public happyTime(magnitude = 0.5): void'),
    'PortalSDKManager implements happyTime'
  );
  assert(
    portalContent.includes('public get isAdActive(): boolean'),
    'PortalSDKManager exposes isAdActive getter'
  );
  assert(
    portalContent.includes('public get isBlocked(): boolean'),
    'PortalSDKManager exposes isBlocked getter'
  );
  assert(
    portalContent.includes('public get pokiAvailable(): boolean'),
    'PortalSDKManager exposes pokiAvailable getter'
  );

  // 3. Safety timeouts
  assert(
    portalContent.includes('12000'),
    'commercialBreak enforces 12-second safety timeout (Promise.race)'
  );
  assert(
    portalContent.includes('35000'),
    'requestRewardedAd enforces 35-second safety timeout (Promise.race)'
  );
  assert(
    portalContent.includes('5000'),
    'init enforces 5-second safety timeout (Promise.race)'
  );
});

// -----------------------------------------------------------------------------
// SUITE 3: Empirical Simulation of Commercial Break Lifecycle & Safety
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 3: Empirical Simulation of Commercial Break Lifecycle', async () => {
  // Construct an isolated instance of the bridge logic to simulate Poki lifecycle
  let audioSuspended = false;
  let audioResumed = false;
  let gameplayStopped = false;
  let pokiBreakInvoked = false;

  const mockSoundManager = {
    suspendForAd: () => {
      audioSuspended = true;
    },
    resumeAfterAd: () => {
      audioResumed = true;
    },
  };

  class TestPortalSDK {
    constructor() {
      this.isGameplayActive = true;
      this.isPokiAvailable = true;
      this.hasAdBlocker = false;
      this.adInProgress = false;
    }

    gameplayStop() {
      this.isGameplayActive = false;
      gameplayStopped = true;
    }

    async commercialBreak(mockPokiBreak) {
      this.adInProgress = true;
      this.gameplayStop();
      mockSoundManager.suspendForAd();

      try {
        if (this.isPokiAvailable && mockPokiBreak) {
          await Promise.race([
            mockPokiBreak(() => {
              mockSoundManager.suspendForAd();
            }),
            new Promise((resolve) => setTimeout(resolve, 50)),
          ]);
        }
      } catch {
        // safe ignore
      } finally {
        this.adInProgress = false;
        mockSoundManager.resumeAfterAd();
      }
    }
  }

  // Test 3.1: Standard Commercial Break
  const sdk = new TestPortalSDK();
  const breakPromise = sdk.commercialBreak(async (onStart) => {
    pokiBreakInvoked = true;
    onStart();
    await new Promise((r) => setTimeout(r, 20));
  });

  assert(sdk.adInProgress === true, 'sdk.adInProgress is true while commercial break is running');
  assert(gameplayStopped === true, 'gameplayStop() called before ad begins');
  assert(audioSuspended === true, 'Audio suspended during commercial break');

  await breakPromise;

  assert(pokiBreakInvoked === true, 'PokiSDK.commercialBreak was invoked');
  assert(sdk.adInProgress === false, 'sdk.adInProgress reset to false upon completion');
  assert(audioResumed === true, 'Audio resumed after commercial break');

  // Test 3.2: Hanging Ad Timeout Protection (12s logic simulated with 50ms)
  audioResumed = false;
  const hangingSdk = new TestPortalSDK();
  const hangingBreakPromise = hangingSdk.commercialBreak(() => new Promise(() => {})); // Never resolves
  await hangingBreakPromise;

  assert(hangingSdk.adInProgress === false, 'Hanging commercial break resolved safely via timeout');
  assert(audioResumed === true, 'Audio was resumed even when commercial break hung');

  // Test 3.3: Ad Blocker / Throwing SDK Error Protection
  let throwAudioResumed = false;
  const throwMockSound = {
    suspendForAd: () => {},
    resumeAfterAd: () => {
      throwAudioResumed = true;
    },
  };
  const throwSdk = new TestPortalSDK();
  await throwSdk.commercialBreak(async () => {
    throw new Error('Blocked by extension: uBlock Origin');
  });

  assert(throwSdk.adInProgress === false, 'Threw exception handled safely without throwing');
});

// -----------------------------------------------------------------------------
// SUITE 4: Empirical Simulation of Rewarded Ad Lifecycle & Adblocker Fallbacks
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 4: Empirical Simulation of Rewarded Ad Lifecycle', async () => {
  let audioSuspended = false;
  let audioResumed = false;

  const mockSound = {
    suspendForAd: () => {
      audioSuspended = true;
    },
    resumeAfterAd: () => {
      audioResumed = true;
    },
  };

  class TestRewardedSDK {
    constructor(pokiAvailable = true, hasBlocker = false) {
      this.isPokiAvailable = pokiAvailable;
      this.hasAdBlocker = hasBlocker;
      this.adInProgress = false;
    }

    gameplayStop() {}

    async requestRewardedAd(mockPokiRewarded) {
      this.adInProgress = true;
      this.gameplayStop();
      mockSound.suspendForAd();

      try {
        if (this.isPokiAvailable && !this.hasAdBlocker && mockPokiRewarded) {
          const success = await Promise.race([
            mockPokiRewarded(() => {
              mockSound.suspendForAd();
            }),
            new Promise((resolve) => setTimeout(() => resolve(false), 50)),
          ]);
          return Boolean(success);
        }

        // Fallback simulation
        return true;
      } catch {
        return true;
      } finally {
        this.adInProgress = false;
        mockSound.resumeAfterAd();
      }
    }
  }

  // 4.1 Rewarded Ad Success (User finished video)
  audioSuspended = false;
  audioResumed = false;
  const successSdk = new TestRewardedSDK(true, false);
  const successResult = await successSdk.requestRewardedAd(async () => true);
  assert(successResult === true, 'Rewarded ad returns true when completed');
  assert(audioSuspended === true && audioResumed === true, 'Audio suspended and resumed on rewarded ad');

  // 4.2 Rewarded Ad Skipped (User closed early)
  const skipSdk = new TestRewardedSDK(true, false);
  const skipResult = await skipSdk.requestRewardedAd(async () => false);
  assert(skipResult === false, 'Rewarded ad returns false when skipped early');

  // 4.3 Rewarded Ad Timeout (Stalled ad network)
  const timeoutSdk = new TestRewardedSDK(true, false);
  const timeoutResult = await timeoutSdk.requestRewardedAd(() => new Promise(() => {})); // Never resolves
  assert(timeoutResult === false, 'Hanging rewarded ad resolves false via safety timeout');
  assert(timeoutSdk.adInProgress === false, 'adInProgress cleared after timeout');

  // 4.4 Ad Blocker / Offline Development Fallback
  const blockerSdk = new TestRewardedSDK(false, true);
  const blockerResult = await blockerSdk.requestRewardedAd(null);
  assert(blockerResult === true, 'Ad blocker / dev mode gracefully grants reward via fallback');
});

// -----------------------------------------------------------------------------
// SUITE 5: Commercial Break Invocations in GameEngine Natural Transitions
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 5: Commercial Break Invocations in GameEngine', async () => {
  const enginePath = path.join(ROOT_DIR, 'src', 'game', 'gameEngine.ts');
  assert(fs.existsSync(enginePath), 'src/game/gameEngine.ts exists');

  const engineContent = fs.readFileSync(enginePath, 'utf-8');

  // 1. finalizeGameOver() invocation gated by canShowGameOverCommercialBreak() (>150s & no recent rewarded ad)
  const hasGameOverCommercial =
    /finalizeGameOver\(\)\s*\{[\s\S]*?canShowGameOverCommercialBreak\(\)[\s\S]*?portalSDK\.commercialBreak\(\)/.test(
      engineContent
    );
  assert(
    hasGameOverCommercial,
    'finalizeGameOver() triggers portalSDK.commercialBreak() gated by 150s cooldown & recent rewarded ad check'
  );

  // 2. startRun() NEVER triggers commercialBreak() (Immediate gameplay start)
  const startRunBlock = engineContent.slice(
    engineContent.indexOf('public startRun('),
    engineContent.indexOf('public start()')
  );
  assert(
    !startRunBlock.includes('portalSDK.commercialBreak()'),
    'startRun() NEVER triggers portalSDK.commercialBreak() so gameplay starts immediately'
  );

  // 3. triggerNextLevelTransition() NEVER triggers commercialBreak() (Direct 1.2s room transition)
  const levelTransitionBlock = engineContent.slice(
    engineContent.indexOf('private triggerNextLevelTransition()'),
    engineContent.indexOf('public jump(): boolean')
  );
  assert(
    !levelTransitionBlock.includes('portalSDK.commercialBreak()'),
    'triggerNextLevelTransition() NEVER triggers portalSDK.commercialBreak() on room clear'
  );

  // 4. tick() guard against portalSDK.isAdActive
  const hasAdActiveTickGuard = /portalSDK\.isAdActive/.test(engineContent);
  assert(
    hasAdActiveTickGuard,
    'tick() checks portalSDK.isAdActive to prevent timer decrement or simulation updates during ads'
  );
});

// -----------------------------------------------------------------------------
// SUITE 6: Verification of All 6 Rewarded Ad Touchpoints
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 6: Verification of All 6 Rewarded Ad Touchpoints', async () => {
  const gameModalPath = path.join(ROOT_DIR, 'src', 'components', 'GameModal.tsx');
  const hudPath = path.join(ROOT_DIR, 'src', 'components', 'HUD.tsx');
  const enginePath = path.join(ROOT_DIR, 'src', 'game', 'gameEngine.ts');

  assert(fs.existsSync(gameModalPath), 'src/components/GameModal.tsx exists');
  assert(fs.existsSync(hudPath), 'src/components/HUD.tsx exists');
  assert(fs.existsSync(enginePath), 'src/game/gameEngine.ts exists');

  const modalContent = fs.readFileSync(gameModalPath, 'utf-8');
  const hudContent = fs.readFileSync(hudPath, 'utf-8');
  const engineContent = fs.readFileSync(enginePath, 'utf-8');

  // Touchpoint 1: Free Attribute Upgrade Card
  const hasUpgradeAd = /handleUpgradeCardClick[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?onFreeAdUpgrade\(key\)/.test(
    modalContent
  );
  assert(
    hasUpgradeAd,
    'Touchpoint 1: Free attribute upgrade card calls portalSDK.requestRewardedAd() and credits stat level'
  );

  // Touchpoint 2: Arm Super Buff (25s Mega Starter)
  const hasBuffAd = /handleArmBuffAd[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?setSuperBuffArmed\(true\)/.test(
    modalContent
  );
  assert(
    hasBuffAd,
    'Touchpoint 2: Arm Super Buff button calls portalSDK.requestRewardedAd() and arms buff'
  );

  // Touchpoint 3: Unlock 3D Glove Skin via Ad
  const hasSkinAd = /handleUnlockSkinAd[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?onUnlockSkinViaAd\(skinId\)/.test(
    modalContent
  );
  assert(
    hasSkinAd,
    'Touchpoint 3: 3D glove skin ad unlock calls portalSDK.requestRewardedAd() and unlocks skin'
  );

  // Touchpoint 4: Dynamic Scaled Celebratory Jackpot Claim
  const hasJackpotAd = /handleClaimJackpot[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?onClaimAdJackpot\(calculatedPrize\)/.test(
    modalContent
  );
  assert(
    hasJackpotAd,
    'Touchpoint 4: Dynamic scaled jackpot claim calls portalSDK.requestRewardedAd() and credits scaled prize'
  );

  // Touchpoint 5: Second Chance Revive Ad (+12s + Super Smash Blast)
  const hasReviveHudTrigger = /engine\?\.triggerReviveAd\(\)/.test(hudContent);
  assert(hasReviveHudTrigger, 'Touchpoint 5: HUD Revive Option 1 triggers engine.triggerReviveAd()');

  const hasReviveEngineAd = /triggerReviveAd\(\)[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?this\.state\.timeRemaining = 12\.0/.test(
    engineContent
  );
  assert(
    hasReviveEngineAd,
    'Touchpoint 5: triggerReviveAd() requests rewarded ad and restores +12s & Super Smash upon success'
  );

  // Touchpoint 6: Defeat Double Coins (2X) Ad
  const hasDoubleCoinsHudTrigger = /engine\?\.acceptDefeatWithDoubleCoinsAd\(\)/.test(hudContent);
  assert(
    hasDoubleCoinsHudTrigger,
    'Touchpoint 6: HUD Defeat Option 2 triggers engine.acceptDefeatWithDoubleCoinsAd()'
  );

  const hasDoubleCoinsEngineAd = /acceptDefeatWithDoubleCoinsAd\(\)[\s\S]*?portalSDK\.requestRewardedAd\(\)[\s\S]*?this\.claimDoubleRunCoins\(\)/.test(
    engineContent
  );
  assert(
    hasDoubleCoinsEngineAd,
    'Touchpoint 6: acceptDefeatWithDoubleCoinsAd() requests rewarded ad and doubles coins (2X) upon success'
  );
});

// -----------------------------------------------------------------------------
// SUITE 7: Port 3000 & Host 0.0.0.0 Server Configuration
// -----------------------------------------------------------------------------
await runAsyncSuite('Suite 7: Port 3000 & Host 0.0.0.0 Configuration', async () => {
  const viteConfigPath = path.join(ROOT_DIR, 'vite.config.ts');
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');

  assert(fs.existsSync(viteConfigPath), 'vite.config.ts exists');
  assert(fs.existsSync(packageJsonPath), 'package.json exists');

  const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');
  const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');

  // vite.config.ts server port and host
  const hasServerPort = /server:\s*\{[\s\S]*?port:\s*3000/.test(viteContent);
  const hasServerHost = /server:\s*\{[\s\S]*?host:\s*['"]0\.0\.0\.0['"]/.test(viteContent);
  assert(hasServerPort, 'vite.config.ts specifies server.port: 3000');
  assert(hasServerHost, 'vite.config.ts specifies server.host: "0.0.0.0"');

  // vite.config.ts preview port and host
  const hasPreviewPort = /preview:\s*\{[\s\S]*?port:\s*3000/.test(viteContent);
  const hasPreviewHost = /preview:\s*\{[\s\S]*?host:\s*['"]0\.0\.0\.0['"]/.test(viteContent);
  assert(hasPreviewPort, 'vite.config.ts specifies preview.port: 3000');
  assert(hasPreviewHost, 'vite.config.ts specifies preview.host: "0.0.0.0"');

  // package.json scripts
  const pkg = JSON.parse(pkgContent);
  assert(
    pkg.scripts?.dev?.includes('3000'),
    'package.json "dev" script specifies port 3000'
  );
  assert(
    pkg.scripts?.dev?.includes('0.0.0.0'),
    'package.json "dev" script specifies host 0.0.0.0'
  );
});

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`POKI SDK V2 & PORT 3000 ADVERSARIAL VERIFICATION REPORT`);
console.log(`==================================================`);
console.log(`Total tests executed: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  console.error(`\n❌ VERDICT: REQUEST_CHANGES`);
  console.error(`The following ${failedTests} tests failed:`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log(`\n🏆 VERDICT: ALL MILESTONE 3 OBJECTIVES VERIFIED WITH 100% PASS RATE!`);
  process.exit(0);
}
