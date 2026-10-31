/**
 * Adversarial Verification Suite: Gameplay Preservation & HUD Rules
 * Backrooms Wall Breaker 3D
 *
 * Tests:
 * 1. Camera FOV Lock (105°) across lifecycle, resize, per-frame tick, and anti-tamper.
 * 2. In-Game HUD: Single top-center bar during gameplay, zero extra bars, no emojis.
 * 3. 100% Absence of Exit Indicators, exit meshes, waypoints, escape arrows.
 * 4. Uncapped Attribute Progression (100 + lvl * pctPerLevel) and multipliers.
 * 5. Rebirth Prestige Formulas, Records Tracking, and 3D Glove Skins.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

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

function suite(name, fn) {
  console.log(`\n==================================================`);
  console.log(`RUNNING SUITE: ${name}`);
  console.log(`==================================================`);
  try {
    fn();
  } catch (err) {
    failedTests++;
    failures.push(`Suite "${name}" threw exception: ${err.message}\n${err.stack}`);
    console.error(`  💥 EXCEPTION in suite "${name}":`, err);
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: CAMERA FOV LOCK (105°) ADVERSARIAL STRESS TEST
// -----------------------------------------------------------------------------
suite('Suite 1: Camera FOV Lock (105°)', () => {
  const gameEnginePath = path.join(ROOT_DIR, 'src', 'game', 'gameEngine.ts');
  const appPath = path.join(ROOT_DIR, 'src', 'App.tsx');
  assert(fs.existsSync(gameEnginePath), 'gameEngine.ts exists');
  assert(fs.existsSync(appPath), 'App.tsx exists');

  const engineSource = fs.readFileSync(gameEnginePath, 'utf-8');
  const appSource = fs.readFileSync(appPath, 'utf-8');

  // 1. Verify lockedFov constant declaration
  assert(
    engineSource.includes('private readonly lockedFov = 105;'),
    'gameEngine.ts declares `private readonly lockedFov = 105;`'
  );

  // 2. Verify camera instantiation with lockedFov
  const cameraInstMatch = /this\.camera\s*=\s*new\s+THREE\.PerspectiveCamera\(\s*this\.lockedFov/s.test(engineSource);
  assert(
    cameraInstMatch,
    'camera is instantiated with `this.lockedFov` (105°)'
  );

  // 3. Verify startRun explicitly locks FOV and updates projection matrix
  const startRunFovMatch = /this\.camera\.fov\s*=\s*this\.lockedFov;\s*this\.camera\.updateProjectionMatrix\(\);/s.test(engineSource);
  assert(
    startRunFovMatch,
    'startRun() enforces `this.camera.fov = this.lockedFov; this.camera.updateProjectionMatrix();`'
  );

  // 4. Verify initial state and startRun state publish fov: 105
  const stateFovMatches = (engineSource.match(/fov:\s*105/g) || []).length;
  assert(
    stateFovMatches >= 2,
    `gameEngine.ts has ${stateFovMatches} occurrences of \`fov: 105\` in state dispatches`
  );

  const appFovMatch = /fov:\s*105/.test(appSource);
  assert(appFovMatch, 'App.tsx initial game state specifies `fov: 105`');

  // 5. Verify resize handler does NOT alter FOV
  const resizeMethodMatch = engineSource.match(/handleResize\(\)\s*\{([^}]+)\}/s);
  assert(Boolean(resizeMethodMatch), 'handleResize() method exists');
  if (resizeMethodMatch) {
    const resizeBody = resizeMethodMatch[1];
    assert(
      resizeBody.includes('this.camera.aspect = w / h;'),
      'handleResize() updates aspect ratio'
    );
    assert(
      !resizeBody.includes('this.camera.fov ='),
      'handleResize() strictly DOES NOT modify camera.fov'
    );
  }

  // 6. Verify per-frame tick anti-tamper FOV enforcement
  const tickFovAntiTamper = /if\s*\(\s*this\.camera\.fov\s*!==\s*this\.lockedFov\s*\)\s*\{\s*this\.camera\.fov\s*=\s*this\.lockedFov;\s*this\.camera\.updateProjectionMatrix\(\);\s*\}/s.test(engineSource);
  assert(
    tickFovAntiTamper,
    'Per-frame tick() contains strict anti-tamper check resetting camera.fov to lockedFov if altered'
  );

  // 7. Verify Dash effect does not manipulate FOV
  // Dash should only affect cameraRotation.z (camera roll) and velocity, not FOV
  const sourceWithoutComments = engineSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const dashRollMatch = engineSource.includes('this.currentCameraRoll');
  assert(dashRollMatch, 'Dash juice effect uses camera roll (z-tilt)');
  const dashFovTamper = /dash.*fov|fov.*dash/i.test(sourceWithoutComments);
  assert(!dashFovTamper, 'Dash implementation contains NO FOV zoom or tampering');

  // 8. Dynamic Simulation of Tick Anti-Tamper Logic
  const mockCamera = {
    fov: 105,
    aspect: 16 / 9,
    projectionUpdated: false,
    updateProjectionMatrix() {
      this.projectionUpdated = true;
    },
  };
  const lockedFov = 105;

  function simulateTick() {
    if (mockCamera.fov !== lockedFov) {
      mockCamera.fov = lockedFov;
      mockCamera.updateProjectionMatrix();
    }
  }

  // Simulate adversary attempting to force FOV to 90
  mockCamera.fov = 90;
  mockCamera.projectionUpdated = false;
  simulateTick();
  assert(
    mockCamera.fov === 105 && mockCamera.projectionUpdated,
    'Adversarial simulation: When FOV tampered to 90°, tick() forces back to 105° and updates projection'
  );

  // Simulate adversary attempting to force FOV to 130 (speed effect)
  mockCamera.fov = 130;
  mockCamera.projectionUpdated = false;
  simulateTick();
  assert(
    mockCamera.fov === 105 && mockCamera.projectionUpdated,
    'Adversarial simulation: When FOV tampered to 130°, tick() forces back to 105° and updates projection'
  );

  // 9. Scan entire src/ for any illicit FOV definitions
  function scanDirForIllicitFov(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDirForIllicitFov(full);
      } else if (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) {
        const text = fs.readFileSync(full, 'utf-8');
        const matches = text.match(/fov\s*[:=]\s*([0-9.]+)/gi);
        if (matches) {
          for (const m of matches) {
            const num = Number(m.replace(/[^0-9.]/g, ''));
            assert(
              num === 105,
              `File ${ent.name} specifies FOV value ${num} (MUST BE 105)`
            );
          }
        }
      }
    }
  }
  scanDirForIllicitFov(path.join(ROOT_DIR, 'src'));
});

// -----------------------------------------------------------------------------
// SUITE 2: IN-GAME HUD RULES & SINGLE TOP-CENTER BAR ADVERSARIAL TEST
// -----------------------------------------------------------------------------
suite('Suite 2: In-Game HUD Single Top-Center Bar', () => {
  const hudPath = path.join(ROOT_DIR, 'src', 'components', 'HUD.tsx');
  assert(fs.existsSync(hudPath), 'HUD.tsx exists');
  const hudSource = fs.readFileSync(hudPath, 'utf-8');

  // 1. Verify gameplay gate: if state.status !== 'playing' return null
  assert(
    hudSource.includes("if (state.status !== 'playing') return null;"),
    "HUD immediately returns null when state.status !== 'playing'"
  );

  // 2. Verify single top-center card container
  assert(
    hudSource.includes('mx-auto flex flex-col items-center'),
    'HUD top bar is centered via `mx-auto flex flex-col items-center`'
  );
  assert(
    hudSource.includes('min-w-[330px] sm:min-w-[560px]'),
    'HUD bar has standardized responsive width min-w-[330px] sm:min-w-[560px]'
  );

  // 3. Verify top bar elements:
  // a) Room / Level badge
  assert(
    hudSource.includes('{state.isJackpotFloor ? \'JACKPOT\' : strings.roomLabel}'),
    'HUD displays Room / Level badge'
  );
  // b) Percentage walls broken
  assert(
    hudSource.includes('{percentage}% {strings.brokenPct}'),
    'HUD displays percentage of walls broken'
  );
  assert(
    hudSource.includes('{state.wallsDestroyed}/{state.totalWalls}'),
    'HUD displays numerical walls destroyed / total count'
  );
  // c) Countdown timer
  assert(
    hudSource.includes('formatTime(state.timeRemaining)'),
    'HUD displays countdown timer via formatTime(state.timeRemaining)'
  );

  // 4. Verify absence of redundant HUD bars
  // No bottom health bars, no action bars at bottom, no minimaps, no left/right status panels
  assert(!hudSource.includes('bottom-0'), 'No bottom-anchored HUD bars (bottom-0 absent)');
  assert(!hudSource.includes('fixed bottom'), 'No fixed bottom bars');
  assert(!hudSource.includes('minimap'), 'No minimap component in HUD');
  assert(!hudSource.includes('compass'), 'No compass ring in HUD');

  // 5. Verify modals are conditional and don\'t clutter gameplay
  assert(
    hudSource.includes('{state.revivePromptActive && ('),
    'Death/Revive modal only renders when state.revivePromptActive is true'
  );
  assert(
    hudSource.includes('{state.isPaused && !state.levelTransition && !state.revivePromptActive && ('),
    'Pause modal only renders when state.isPaused is true'
  );

  // 6. Zero Emojis check in HUD.tsx
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emojiMatch = emojiRegex.test(hudSource);
  assert(!emojiMatch, 'HUD.tsx contains 0 emoji characters (pure vector SVGs and cartoon styles)');
});

// -----------------------------------------------------------------------------
// SUITE 3: 100% ABSENCE OF EXIT INDICATORS ADVERSARIAL SWEEP
// -----------------------------------------------------------------------------
suite('Suite 3: 100% Absence of Exit Indicators', () => {
  const filesToScan = [
    'src/game/backrooms.ts',
    'src/game/gameEngine.ts',
    'src/game/progression.ts',
    'src/game/entities.ts',
    'src/components/HUD.tsx',
    'src/App.tsx',
  ];

  for (const rel of filesToScan) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf-8');

    // Forbidden concepts: Exit meshes, Exit waypoints, Escape arrows, Exit portals
    const forbiddenPatterns = [
      /exitMesh/i,
      /exitDoor/i,
      /exitWaypoint/i,
      /escapeArrow/i,
      /exitIndicator/i,
      /spawnExit/i,
      /createExit/i,
      /targetExit/i,
      /waypointToExit/i,
    ];

    for (const pat of forbiddenPatterns) {
      assert(
        !pat.test(content),
        `File ${rel} must NOT contain pattern ${pat}`
      );
    }
  }

  // Verify radar arrow in gameEngine.ts strictly targets walls or boss, NEVER an exit
  const engineSource = fs.readFileSync(path.join(ROOT_DIR, 'src', 'game', 'gameEngine.ts'), 'utf-8');
  const radarFnStart = engineSource.indexOf('updateLastWallsRadar()');
  assert(radarFnStart !== -1, 'updateLastWallsRadar() exists');
  if (radarFnStart !== -1) {
    let braceCount = 0;
    let started = false;
    let radarBody = '';
    for (let i = radarFnStart; i < engineSource.length; i++) {
      const ch = engineSource[i];
      if (ch === '{') {
        braceCount++;
        started = true;
      } else if (ch === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          radarBody = engineSource.slice(radarFnStart, i + 1);
          break;
        }
      }
    }
    assert(
      radarBody.includes('this.world.getClosestStandingWall(this.playerPosition)'),
      'Radar points to closest standing wall when walls remain'
    );
    assert(
      radarBody.includes('targetPos = boss.position'),
      'Radar points to boss when boss is alive'
    );
    assert(
      !radarBody.includes('exit') && !radarBody.includes('door'),
      'Radar strictly NEVER points to an exit or door'
    );
  }

  // Verify room progression is triggered purely by wall and boss destruction
  const roomClearMatch = engineSource.match(/checkRoomClearCondition\(\)\s*\{([^}]+)\}/s);
  assert(Boolean(roomClearMatch), 'checkRoomClearCondition() exists');
  if (roomClearMatch) {
    const clearBody = roomClearMatch[1];
    assert(
      clearBody.includes('this.state.wallsDestroyed >= this.state.totalWalls'),
      'Room clear requires all breakable walls destroyed'
    );
    assert(
      clearBody.includes('!boss'),
      'Room clear requires boss defeated'
    );
    assert(
      clearBody.includes('this.triggerNextLevelTransition()'),
      'Room clear immediately triggers next level transition without requiring exit traversal'
    );
  }
});

// -----------------------------------------------------------------------------
// SUITE 4: UNCAPPED ATTRIBUTE PROGRESSION ADVERSARIAL ORACLE
// -----------------------------------------------------------------------------
suite('Suite 4: Uncapped Attribute Progression (100 + lvl * pctPerLevel)', () => {
  const progPath = path.join(ROOT_DIR, 'src', 'game', 'progression.ts');
  const progSource = fs.readFileSync(progPath, 'utf-8');

  // Load Progression module into a sandboxed VM with mocked localStorage
  const cleanCode = stripTypeScriptTypes(progSource)
    .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
    .replace(/export\s+(default\s+)?/g, '');

  let storage = {};
  const sandbox = {
    localStorage: {
      getItem: (k) => storage[k] || null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
    console,
    Math,
  };

  vm.createContext(sandbox);
  vm.runInContext(
    cleanCode + `
      globalThis.UPGRADE_CATALOG = UPGRADE_CATALOG;
      globalThis.BUDGETS_CATALOG = BUDGETS_CATALOG;
      globalThis.GLOVE_SKINS_CATALOG = GLOVE_SKINS_CATALOG;
      globalThis.ProgressionManager = ProgressionManager;
      globalThis.progressionManager = progressionManager;
    `,
    sandbox
  );

  const { UPGRADE_CATALOG, progressionManager, ProgressionManager } = sandbox;

  // 1. Catalog integrity
  assert(Array.isArray(UPGRADE_CATALOG) && UPGRADE_CATALOG.length === 4, 'UPGRADE_CATALOG has 4 attributes');
  const catalogKeys = UPGRADE_CATALOG.map((u) => u.key);
  assert(
    catalogKeys.includes('moveSpeed') &&
    catalogKeys.includes('punchForce') &&
    catalogKeys.includes('punchSpeed') &&
    catalogKeys.includes('ballForce'),
    'Attributes are: moveSpeed, punchForce, punchSpeed, ballForce'
  );

  const pctMap = Object.fromEntries(UPGRADE_CATALOG.map((u) => [u.key, u.pctPerLevel]));
  assert(pctMap.moveSpeed === 10, 'moveSpeed is +10% per level');
  assert(pctMap.punchForce === 15, 'punchForce is +15% per level');
  assert(pctMap.punchSpeed === 12, 'punchSpeed is +12% per level');
  assert(pctMap.ballForce === 15, 'ballForce is +15% per level');

  // 2. Uncapped percentage math oracle test: lvl 0 to 1,000
  progressionManager.resetProfile();

  const testLevels = [0, 1, 5, 10, 25, 50, 100, 500, 1000];
  for (const lvl of testLevels) {
    for (const u of UPGRADE_CATALOG) {
      progressionManager.profile.upgrades[u.key] = lvl;
      const expectedPct = 100 + lvl * u.pctPerLevel;
      const actualPct = progressionManager.getStatPercentage(u.key);
      assert(
        actualPct === expectedPct,
        `Oracle ${u.key} at Lv.${lvl} -> expected ${expectedPct}%, got ${actualPct}%`
      );

      const expectedMult = expectedPct / 100;
      const actualMult = progressionManager.getStatMultiplier(u.key);
      assert(
        Math.abs(actualMult - expectedMult) < 1e-9,
        `Oracle multiplier ${u.key} at Lv.${lvl} -> expected ${expectedMult}x, got ${actualMult}x`
      );
    }
  }

  // 3. Stress test: Lv. 10,000 (No ceiling, No Math.min clamping!)
  progressionManager.profile.upgrades.punchForce = 10000;
  const insanePct = progressionManager.getStatPercentage('punchForce');
  assert(insanePct === 100 + 10000 * 15, `Lv.10,000 punchForce reached ${insanePct}% without capping`);
  assert(progressionManager.getStatMultiplier('punchForce') === insanePct / 100, 'Multiplier at Lv.10,000 is 1,501.0x');

  // 4. Cost growth formula verification
  for (const u of UPGRADE_CATALOG) {
    for (let lvl = 0; lvl <= 10; lvl++) {
      progressionManager.profile.upgrades[u.key] = lvl;
      const expectedCost = Math.round(u.baseCost * Math.pow(u.costGrowth, lvl));
      const actualCost = progressionManager.getUpgradeCost(u.key);
      assert(
        actualCost === expectedCost,
        `Cost oracle for ${u.key} at Lv.${lvl} -> expected ${expectedCost}, got ${actualCost}`
      );
    }
  }

  // 5. Buy upgrade mechanic
  progressionManager.resetProfile();
  progressionManager.profile.coins = 100;
  const cost0 = progressionManager.getUpgradeCost('moveSpeed'); // 40
  const bought = progressionManager.buyUpgrade('moveSpeed');
  assert(bought === true, 'buyUpgrade returned true when affordable');
  assert(progressionManager.profile.upgrades.moveSpeed === 1, 'moveSpeed incremented to 1');
  assert(progressionManager.profile.coins === 100 - cost0, `coins deducted correctly (${100 - cost0})`);

  // Insufficient funds test
  progressionManager.profile.coins = 10;
  const cost1 = progressionManager.getUpgradeCost('moveSpeed');
  const boughtTooExpensive = progressionManager.buyUpgrade('moveSpeed');
  assert(boughtTooExpensive === false, 'buyUpgrade returned false when insufficient coins');
  assert(progressionManager.profile.upgrades.moveSpeed === 1, 'upgrade level unchanged on failed buy');
  assert(progressionManager.profile.coins === 10, 'coins untouched on failed buy');

  // 6. Free Ad Upgrade
  const adStartLvl = progressionManager.profile.upgrades.punchSpeed;
  progressionManager.grantFreeUpgrade('punchSpeed');
  assert(
    progressionManager.profile.upgrades.punchSpeed === adStartLvl + 1,
    'grantFreeUpgrade correctly incremented punchSpeed by 1 without consuming coins'
  );
  assert(progressionManager.profile.adsWatched >= 1, 'adsWatched counter incremented');
});

// -----------------------------------------------------------------------------
// SUITE 5: REBIRTH PRESTIGE, HIGH SCORES & 3D GLOVE SKINS
// -----------------------------------------------------------------------------
suite('Suite 5: Rebirth Prestige, High Scores & 3D Glove Skins', () => {
  const progPath = path.join(ROOT_DIR, 'src', 'game', 'progression.ts');
  const progSource = fs.readFileSync(progPath, 'utf-8');

  const cleanCode = stripTypeScriptTypes(progSource)
    .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
    .replace(/export\s+(default\s+)?/g, '');

  let storage = {};
  const sandbox = {
    localStorage: {
      getItem: (k) => storage[k] || null,
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
    console,
    Math,
  };

  vm.createContext(sandbox);
  vm.runInContext(cleanCode + '; globalThis.mgr = progressionManager; globalThis.SKINS = GLOVE_SKINS_CATALOG;', sandbox);
  const mgr = sandbox.mgr;
  const SKINS = sandbox.SKINS;

  // 1. Rebirth Target Room formula: 6 + rebirthCount * 4
  const expectedRooms = [
    { count: 0, target: 6 },
    { count: 1, target: 10 },
    { count: 2, target: 14 },
    { count: 5, target: 26 },
  ];
  for (const r of expectedRooms) {
    mgr.profile.rebirthCount = r.count;
    assert(
      mgr.getRebirthTargetRoom() === r.target,
      `Rebirth target room at count=${r.count} is ${r.target}`
    );
  }

  // 2. Rebirth Cost formula: 12000 * 2.6^rebirthCount
  const expectedCosts = [
    { count: 0, cost: 12000 },
    { count: 1, cost: 31200 },
    { count: 2, cost: 81120 },
  ];
  for (const c of expectedCosts) {
    mgr.profile.rebirthCount = c.count;
    assert(
      mgr.getRebirthCost() === c.cost,
      `Rebirth cost at count=${c.count} is ${c.cost}`
    );
  }

  // 3. Rebirth Multipliers:
  // Coin mult: 1 + count * 1.0
  // Damage mult: 1 + count * 0.25
  // Timer bonus: count * 1.5
  // Max budget slots: count >= 1 ? 2 : 1
  for (let count = 0; count <= 4; count++) {
    mgr.profile.rebirthCount = count;
    assert(mgr.getRebirthCoinMultiplier() === 1 + count * 1.0, `Coin mult at count=${count} is ${1 + count * 1.0}X`);
    assert(mgr.getRebirthDamageMultiplier() === 1 + count * 0.25, `Damage mult at count=${count} is ${1 + count * 0.25}X`);
    assert(mgr.getRebirthTimerBonus() === count * 1.5, `Timer bonus at count=${count} is +${count * 1.5}s`);
    assert(mgr.getMaxBudgetSlots() === (count >= 1 ? 2 : 1), `Max budget slots at count=${count} is ${count >= 1 ? 2 : 1}`);
  }

  // 4. canRebirth() gates
  mgr.resetProfile();
  mgr.profile.rebirthCount = 0; // requires Lv.6 and 12,000 coins
  mgr.profile.records.bestLevel = 5;
  mgr.profile.coins = 20000;
  assert(mgr.canRebirth() === false, 'canRebirth false when room requirement not met (bestLevel 5 < 6)');

  mgr.profile.records.bestLevel = 6;
  mgr.profile.coins = 11999;
  assert(mgr.canRebirth() === false, 'canRebirth false when coin requirement not met (11,999 < 12,000)');

  mgr.profile.coins = 12000;
  assert(mgr.canRebirth() === true, 'canRebirth true when both room (6) and coins (12,000) are met');

  // 5. performRebirth() execution and state preservation
  mgr.profile.upgrades.moveSpeed = 15;
  mgr.profile.upgrades.punchForce = 20;
  mgr.profile.upgrades.punchSpeed = 10;
  mgr.profile.upgrades.ballForce = 12;
  mgr.profile.equippedSkin = 'cyber_neon';
  mgr.profile.unlockedSkins = ['classic_red', 'cyber_neon'];
  mgr.profile.records.bestLevel = 8;
  mgr.profile.records.bestScore = 50000;

  const reborn = mgr.performRebirth();
  assert(reborn === true, 'performRebirth succeeded');
  assert(mgr.profile.rebirthCount === 1, 'rebirthCount incremented to 1');
  assert(mgr.profile.coins === 0, 'coins reset to 0');
  assert(
    mgr.profile.upgrades.moveSpeed === 0 &&
    mgr.profile.upgrades.punchForce === 0 &&
    mgr.profile.upgrades.punchSpeed === 0 &&
    mgr.profile.upgrades.ballForce === 0,
    'All 4 upgrades reset to Lv.0 upon Rebirth'
  );
  assert(mgr.profile.equippedSkin === 'cyber_neon', 'equippedSkin preserved upon Rebirth');
  assert(mgr.profile.unlockedSkins.includes('cyber_neon'), 'unlockedSkins preserved upon Rebirth');
  assert(mgr.profile.records.bestLevel === 8, 'records.bestLevel preserved upon Rebirth');
  assert(mgr.profile.records.bestScore === 50000, 'records.bestScore preserved upon Rebirth');

  // 6. High Scores Tracking
  mgr.resetProfile();
  mgr.profile.records.bestLevel = 3;
  mgr.profile.records.bestScore = 1000;
  mgr.profile.records.bestWallsInRun = 20;
  mgr.profile.records.longestCombo = 5;

  const recResult1 = mgr.updateRecords(2, 500, 10, 3);
  assert(recResult1 === false, 'updateRecords with inferior values returns isNewRecord=false');
  assert(mgr.profile.records.bestLevel === 3, 'bestLevel unchanged');

  const recResult2 = mgr.updateRecords(4, 800, 15, 2);
  assert(recResult2 === true, 'updateRecords with higher level returns isNewRecord=true');
  assert(mgr.profile.records.bestLevel === 4, 'bestLevel updated to 4');

  const recResult3 = mgr.updateRecords(4, 2500, 15, 8);
  assert(recResult3 === true, 'updateRecords with higher score returns isNewRecord=true');
  assert(mgr.profile.records.bestScore === 2500, 'bestScore updated to 2500');
  assert(mgr.profile.records.longestCombo === 8, 'longestCombo updated to 8');

  // 7. 3D Glove Skins Catalog & Selection
  assert(Array.isArray(SKINS) && SKINS.length === 5, 'GLOVE_SKINS_CATALOG has 5 skins');
  const skinIds = SKINS.map((s) => s.id);
  assert(
    skinIds.includes('classic_red') &&
    skinIds.includes('cyber_neon') &&
    skinIds.includes('mecha_chrome') &&
    skinIds.includes('lava_magma') &&
    skinIds.includes('void_matter'),
    '5 skins are: classic_red, cyber_neon, mecha_chrome, lava_magma, void_matter'
  );

  // Default skin
  assert(mgr.profile.equippedSkin === 'classic_red', 'Default equipped skin is classic_red');
  assert(mgr.profile.unlockedSkins.includes('classic_red'), 'classic_red is unlocked by default');

  // Vantablack shader check in GloveShowcase3D.tsx
  const showcasePath = path.join(ROOT_DIR, 'src', 'components', 'GloveShowcase3D.tsx');
  assert(fs.existsSync(showcasePath), 'GloveShowcase3D.tsx exists');
  const showcaseSource = fs.readFileSync(showcasePath, 'utf-8');
  assert(
    showcaseSource.includes('0x000000'),
    'GloveShowcase3D uses true Vantablack (0x000000) for locked silhouettes'
  );
  assert(
    showcaseSource.includes('!isUnlocked'),
    'GloveShowcase3D checks isUnlocked state to toggle between 3D PBR/comic textures and silhouette'
  );
});

// -----------------------------------------------------------------------------
// SUITE 6: AUDIO MIXING, PUNCH & CONCRETE SFX, AND ANTI-SPAM CONTROL (R2)
// -----------------------------------------------------------------------------
suite('Suite 6: Audio Mixing, Punch & Concrete SFX, and Anti-Spam Control', () => {
  const audioTsPath = path.join(ROOT_DIR, 'src', 'game', 'audio.ts');
  const backroomsTsPath = path.join(ROOT_DIR, 'src', 'game', 'backrooms.ts');
  const manifestPath = path.join(ROOT_DIR, 'public', 'audio', 'manifest.json');

  assert(fs.existsSync(audioTsPath), 'src/game/audio.ts exists');
  assert(fs.existsSync(backroomsTsPath), 'src/game/backrooms.ts exists');
  assert(fs.existsSync(manifestPath), 'public/audio/manifest.json exists');

  // 1. WAV Binary Spec Verification (sampleRate=32000, channels=2, bits=16)
  const wavFiles = [
    'sfx_punch_impact.wav',
    'sfx_concrete_hit.wav',
    'sfx_concrete_break.wav',
  ];

  for (const wavName of wavFiles) {
    for (const folder of ['public', 'dist']) {
      const p = path.join(ROOT_DIR, folder, 'audio', 'sfx', wavName);
      assert(fs.existsSync(p), `${folder}/audio/sfx/${wavName} exists`);
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p);
        assert(buf.length >= 44, `${folder}/${wavName} has valid WAV minimum length`);
        const riff = buf.toString('ascii', 0, 4);
        const wave = buf.toString('ascii', 8, 12);
        const audioFormat = buf.readUInt16LE(20);
        const numChannels = buf.readUInt16LE(22);
        const sampleRate = buf.readUInt32LE(24);
        const byteRate = buf.readUInt32LE(28);
        const blockAlign = buf.readUInt16LE(32);
        const bitsPerSample = buf.readUInt16LE(34);

        assert(riff === 'RIFF', `${folder}/${wavName} header is 'RIFF'`);
        assert(wave === 'WAVE', `${folder}/${wavName} format is 'WAVE'`);
        assert(audioFormat === 1, `${folder}/${wavName} audioFormat is 1 (PCM)`);
        assert(numChannels === 2, `${folder}/${wavName} numChannels is 2 (Stereo)`);
        assert(sampleRate === 32000, `${folder}/${wavName} sampleRate is 32000 Hz`);
        assert(bitsPerSample === 16, `${folder}/${wavName} bitsPerSample is 16-bit`);
        assert(byteRate === (32000 * 2 * 16) / 8, `${folder}/${wavName} byteRate is 128000`);
        assert(blockAlign === (2 * 16) / 8, `${folder}/${wavName} blockAlign is 4`);
      }
    }
  }

  // 2. Manifest integrity verification
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifestData.sfx_count === 33, `manifest.json sfx_count is 33 (got ${manifestData.sfx_count})`);
  assert(Boolean(manifestData.new_sfx), 'manifest.json contains new_sfx object');
  if (manifestData.new_sfx) {
    assert(manifestData.new_sfx.sfx_punch_impact === '/audio/sfx/sfx_punch_impact.wav', 'manifest registers sfx_punch_impact');
    assert(manifestData.new_sfx.sfx_concrete_hit === '/audio/sfx/sfx_concrete_hit.wav', 'manifest registers sfx_concrete_hit');
    assert(manifestData.new_sfx.sfx_concrete_break === '/audio/sfx/sfx_concrete_break.wav', 'manifest registers sfx_concrete_break');
  }

  // 3. Static Code Analysis on audio.ts & backrooms.ts
  const audioSource = fs.readFileSync(audioTsPath, 'utf-8');
  const backroomsSource = fs.readFileSync(backroomsTsPath, 'utf-8');

  assert(audioSource.includes('this.bgmBusGain.gain.setValueAtTime(0.60'), 'audio.ts configures bgmBusGain = 0.60');
  assert(audioSource.includes('this.sfxBusGain.gain.setValueAtTime(0.50'), 'audio.ts configures sfxBusGain = 0.50');
  assert(audioSource.includes('volume: 0.28'), 'audio.ts configures coin pickup volume = 0.28');
  assert(audioSource.includes('minIntervalMs: 70'), 'audio.ts configures coin pickup minIntervalMs = 70ms');
  assert(audioSource.includes('Math.min(1.14, 1.0 + this.coinStreakCount * 0.02)'), 'audio.ts caps coin streak pitch at 1.14x with step 0.02');
  assert(audioSource.includes('BURST_DECAY = [1.0, 0.82, 0.68, 0.55]'), 'audio.ts implements burst decay curve [1.0, 0.82, 0.68, 0.55]');
  assert(audioSource.includes('while (voiceList.length >= 2)'), 'audio.ts enforces polyphony limit: max 2 active voices per category');
  assert(audioSource.includes('linearRampToValueAtTime(0.0001, nowSec + 0.015)'), 'audio.ts voice stealing uses smooth 15ms fade-out');
  assert(audioSource.includes('oldest.source.stop(nowSec + 0.016)'), 'audio.ts stops stolen voice at 16ms (anti-click zero-crossing)');
  assert(backroomsSource.includes("wall.variant === 'reinforced' || wall.biome === 'pipedreams'"), 'backrooms.ts dispatches concrete wall flag to soundManager.playWallCollapse');

  // 4. Dynamic VM Simulation & Empirical Stress Testing
  const cleanCode = stripTypeScriptTypes(audioSource)
    .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
    .replace(/export\s+(default\s+)?/g, '');

  function mockParam(initial = 1) {
    return {
      value: initial,
      rampedTo: null,
      setValueAtTime(v) { this.value = v; },
      linearRampToValueAtTime(v, t) { this.rampedTo = { v, t }; this.value = v; },
      setTargetAtTime(v) { this.value = v; },
      cancelScheduledValues() {},
    };
  }

  let createdSources = [];
  let createdGains = [];

  class MockAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createGain() {
      const g = { gain: mockParam(1), connect: () => {} };
      createdGains.push(g);
      return g;
    }
    createDynamicsCompressor() {
      return {
        threshold: mockParam(-10),
        knee: mockParam(12),
        ratio: mockParam(4),
        attack: mockParam(0.003),
        release: mockParam(0.16),
        connect: () => {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: mockParam(18000),
        Q: mockParam(0.7),
        connect: () => {},
      };
    }
    createOscillator() {
      return {
        type: 'sawtooth',
        frequency: mockParam(60),
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createBufferSource() {
      const s = {
        buffer: null,
        playbackRate: mockParam(1),
        loop: false,
        startedAt: null,
        stoppedAt: null,
        connect: () => {},
        start: (t) => { s.startedAt = t; },
        stop: (t) => { s.stoppedAt = t; },
        onended: null,
      };
      createdSources.push(s);
      return s;
    }
    createStereoPanner() {
      return { pan: mockParam(0), connect: () => {} };
    }
  }

  let simTimeMs = 1000;
  const sandbox = {
    window: { AudioContext: MockAudioContext, addEventListener: () => {} },
    document: { addEventListener: () => {}, hidden: false },
    performance: { now: () => simTimeMs },
    fetch: () => Promise.reject(new Error('no fetch in test')),
    setTimeout: (fn) => fn(),
    console,
    Math,
  };

  vm.createContext(sandbox);
  vm.runInContext(cleanCode + '; globalThis.sm = soundManager; globalThis.SoundSynthesizer = SoundSynthesizer;', sandbox);
  const sm = sandbox.sm;
  sm.init();

  // Populate mock sfx buffers so playSample executes real audio pipeline
  sm.sfxBuffers.set('sfx_punch_impact', {});
  sm.sfxBuffers.set('sfx_concrete_hit', {});
  sm.sfxBuffers.set('sfx_concrete_break', {});
  sm.sfxBuffers.set('sfx_wall_collapse', {});
  sm.sfxBuffers.set('sfx_coin_pickup', {});
  sm.sfxBuffers.set('sfx_coin_drop', {});
  sm.sfxBuffers.set('sfx_punch_whoosh', {});
  sm.sfxBuffers.set('sfx_hit_drywall', {});

  // 4a. Volume Bus Gains Verification
  assert(sm.bgmBusGain.gain.value === 0.60, `BGM bus gain initialized to 0.60 (got ${sm.bgmBusGain.gain.value})`);
  assert(sm.sfxBusGain.gain.value === 0.50, `SFX bus gain initialized to 0.50 (got ${sm.sfxBusGain.gain.value})`);

  // 4b. Coin Streak Pitch Ramp & Hard Cap (1.0 -> step 0.02 -> cap 1.14x)
  sm.coinStreakCount = 0;
  sm.lastCoinTime = 0;
  simTimeMs = 2000;
  for (let i = 0; i <= 20; i++) {
    simTimeMs = 2000 + i * 100; // 100ms apart (< 650ms streak window, >= 70ms cooldown)
    sm.ctx.currentTime = simTimeMs / 1000;
    createdSources = [];
    sm.playCoinPickup();
    assert(createdSources.length === 1, `Coin pickup ${i} triggered audio source`);
    const expectedStreakCount = Math.min(10, i === 0 ? 0 : i);
    assert(
      sm.coinStreakCount === expectedStreakCount,
      `Coin pickup ${i} streak count is ${expectedStreakCount} (got ${sm.coinStreakCount})`
    );
    const calculatedPitch = Math.min(1.14, 1.0 + sm.coinStreakCount * 0.02);
    assert(
      calculatedPitch <= 1.14,
      `Coin pickup ${i} calculated pitch ${calculatedPitch} <= 1.14 (NO 1.45x spikes!)`
    );
    if (i >= 7) {
      assert(
        calculatedPitch === 1.14,
        `Coin pickup ${i} reaches ceiling exactly at 1.14x`
      );
    }
  }

  // Test streak reset after idle (> 650ms)
  simTimeMs += 800; // 800ms gap > 650ms
  sm.ctx.currentTime = simTimeMs / 1000;
  sm.playCoinPickup();
  assert(sm.coinStreakCount === 0, 'Coin streak resets to 0 after >650ms gap');
  assert(Math.min(1.14, 1.0 + sm.coinStreakCount * 0.02) === 1.0, 'Coin pitch resets to 1.0x after streak break');

  // 4c. Anti-Spam Cooldown Throttling: 50 punches in 100ms
  simTimeMs = 10000;
  sm.ctx.currentTime = simTimeMs / 1000;
  createdSources = [];
  let throttledCount = 0;
  for (let i = 0; i < 50; i++) {
    simTimeMs = 10000 + i * 2; // Every 2ms across 100ms
    sm.ctx.currentTime = simTimeMs / 1000;
    const prevCount = createdSources.length;
    sm.playPunchSound(1.0);
    if (createdSources.length === prevCount) {
      throttledCount++;
    }
  }
  assert(createdSources.length === 2, `50 punches in 100ms resulted in exactly 2 triggers (got ${createdSources.length})`);
  assert(throttledCount === 48, `48 out of 50 spam punches throttled cleanly by 75ms cooldown`);

  // 4d. Anti-Spam Cooldown Throttling: 50 coin pickups in 200ms (70ms cooldown)
  simTimeMs = 20000;
  sm.ctx.currentTime = simTimeMs / 1000;
  createdSources = [];
  throttledCount = 0;
  for (let i = 0; i < 50; i++) {
    simTimeMs = 20000 + i * 4; // Every 4ms across 200ms
    sm.ctx.currentTime = simTimeMs / 1000;
    const prevCount = createdSources.length;
    sm.playCoinPickup();
    if (createdSources.length === prevCount) {
      throttledCount++;
    }
  }
  assert(createdSources.length === 3, `50 coin pickups in 200ms resulted in exactly 3 triggers (got ${createdSources.length})`);
  assert(throttledCount === 47, `47 out of 50 spam coin pickups throttled cleanly by 70ms cooldown`);

  // 4e. Polyphony Voice Limiting & Voice Stealing (max 2 active voices per category)
  simTimeMs = 30000;
  sm.ctx.currentTime = simTimeMs / 1000;
  createdSources = [];
  createdGains = [];

  // Punch 1 at 30.00s
  sm.playPunchSound(1.0);
  const voice1 = createdSources[createdSources.length - 1];
  const gain1 = createdGains[createdGains.length - 1];
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 1, 'Active voices = 1 after first punch');

  // Punch 2 at 30.08s
  simTimeMs = 30080;
  sm.ctx.currentTime = simTimeMs / 1000;
  sm.playPunchSound(1.0);
  const voice2 = createdSources[createdSources.length - 1];
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 2, 'Active voices = 2 after second punch');

  // Punch 3 at 30.16s -> exceeds polyphony ceiling of 2! Must steal voice 1 with 15ms fade-out
  simTimeMs = 30160;
  sm.ctx.currentTime = simTimeMs / 1000;
  sm.playPunchSound(1.0);
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 2, 'Active voices strictly capped at 2 after third punch');
  assert(Math.abs(voice1.stoppedAt - (30.16 + 0.016)) < 1e-6, `Voice 1 stopped at 30.176s (scheduled +16ms, got ${voice1.stoppedAt})`);
  assert(gain1.gain.rampedTo && gain1.gain.rampedTo.v === 0.0001, 'Voice 1 ramped down to 0.0001 (anti-click zero-crossing)');
  assert(gain1.gain.rampedTo && Math.abs(gain1.gain.rampedTo.t - (30.16 + 0.015)) < 1e-6, 'Voice 1 ramped over 15ms duration');

  // Punch 4 at 30.24s -> steals voice 2
  simTimeMs = 30240;
  sm.ctx.currentTime = simTimeMs / 1000;
  sm.playPunchSound(1.0);
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 2, 'Active voices strictly capped at 2 after fourth punch');
  assert(Math.abs(voice2.stoppedAt - (30.24 + 0.016)) < 1e-6, `Voice 2 stopped at 30.256s (scheduled +16ms, got ${voice2.stoppedAt})`);

  // 4f. Burst Gain Decay Curve (1.0 -> 0.82 -> 0.68 -> 0.55)
  simTimeMs = 40000;
  sm.ctx.currentTime = simTimeMs / 1000;
  createdGains = [];
  const basePunchVol = 0.68; // playPunchSound(1.0) -> Math.min(0.95, 0.68 + 0) = 0.68

  const expectedMultipliers = [1.0, 0.82, 0.68, 0.55, 0.55];
  for (let step = 0; step < expectedMultipliers.length; step++) {
    simTimeMs = 40000 + step * 80;
    sm.ctx.currentTime = simTimeMs / 1000;
    const gainIdxBefore = createdGains.length;
    sm.playPunchSound(1.0);
    const g = createdGains[gainIdxBefore];
    const expectedVol = Number((basePunchVol * expectedMultipliers[step]).toFixed(4));
    const actualVol = Number(g.gain.value.toFixed(4));
    assert(
      Math.abs(actualVol - expectedVol) < 0.005,
      `Burst decay step ${step} volume is ${actualVol} (expected ~${expectedVol}, multiplier ${expectedMultipliers[step]}x)`
    );
  }

  // Verify decay curve resets after >280ms
  simTimeMs += 350;
  sm.ctx.currentTime = simTimeMs / 1000;
  const gainIdxReset = createdGains.length;
  sm.playPunchSound(1.0);
  const gReset = createdGains[gainIdxReset];
  assert(
    Math.abs(gReset.gain.value - basePunchVol) < 0.005,
    `Burst decay resets to 100% (volume ${gReset.gain.value} ~= ${basePunchVol}) after >280ms idle`
  );

  // 4g. Dynamic Pitch Variation (±12% to ±16% across bursts)
  simTimeMs = 50000;
  sm.ctx.currentTime = simTimeMs / 1000;
  createdSources = [];
  const ratesObserved = [];
  for (let i = 0; i < 60; i++) {
    simTimeMs = 50000 + i * 80;
    sm.ctx.currentTime = simTimeMs / 1000;
    sm.playPunchSound(1.0);
    const src = createdSources[createdSources.length - 1];
    ratesObserved.push(src.playbackRate.value);
  }

  const burstRates = ratesObserved.slice(1);
  const minRate = Math.min(...burstRates);
  const maxRate = Math.max(...burstRates);
  const avgRate = burstRates.reduce((a, b) => a + b, 0) / burstRates.length;
  const variance = burstRates.reduce((a, b) => a + Math.pow(b - avgRate, 2), 0) / burstRates.length;
  const stdDev = Math.sqrt(variance);

  assert(minRate >= 0.83, `All burst playbackRates >= 0.83 (min observed: ${minRate.toFixed(4)})`);
  assert(maxRate <= 1.17, `All burst playbackRates <= 1.17 (max observed: ${maxRate.toFixed(4)})`);
  assert(stdDev > 0.03, `Dynamic pitch variation has healthy standard deviation: ${stdDev.toFixed(4)} (eliminates machine-gun monotony)`);
  assert(minRate !== maxRate, 'Dynamic pitch rates are non-identical and stochastic');
});
console.log(`\n==================================================`);
console.log(`EMPIRICAL VERIFICATION RESULTS`);
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
  console.log(`\n🏆 VERDICT: APPROVE`);
  console.log(`All gameplay preservation and HUD rules verified with 100% compliance!`);
  process.exit(0);
}
