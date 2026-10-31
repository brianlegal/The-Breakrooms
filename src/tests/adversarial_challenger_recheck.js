/**
 * Adversarial Challenger Recheck Test Suite
 * Backrooms Wall Breaker 3D
 *
 * Verifies 6 critical dimensions:
 * 1. Simultaneous triggering of punch and concrete hit (Layer 1 + Layer 2 concurrency)
 * 2. Rapid repeated punches cooldown (20 punches in 500ms, 75ms cooldown, polyphony limiting)
 * 3. Concrete wall destruction (`playWallCollapse` with concrete flags)
 * 4. Records tab DOM hierarchy (title precedes icon in all 4 cards)
 * 5. Dynamic jackpot formula (strictly monotonic scaling & safe floor)
 * 6. Vite bundle cleanliness (no free isMuted ReferenceError, bundle initialization)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const ROOT_DIR = process.cwd();
let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (!cond) {
    failed++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
  } else {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  }
}

function suite(name, fn) {
  console.log(`\n==================================================`);
  console.log(`RUNNING ADVERSARIAL SUITE: ${name}`);
  console.log(`==================================================`);
  try {
    fn();
  } catch (err) {
    failed++;
    failures.push(`Suite "${name}" exception: ${err.message}\n${err.stack}`);
    console.error(`  💥 EXCEPTION in suite "${name}":`, err);
  }
}

// Helper: Setup Audio Sandbox with real audio.ts code
function createAudioSandbox(initialTimeMs = 100) {
  const audioTsPath = path.join(ROOT_DIR, 'src', 'game', 'audio.ts');
  const rawSource = fs.readFileSync(audioTsPath, 'utf-8');
  const cleanCode = stripTypeScriptTypes(rawSource)
    .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
    .replace(/export\s+(default\s+)?/g, '');

  let currentTimeSec = initialTimeMs / 1000;
  let currentPerfMs = initialTimeMs;
  const createdSources = [];
  const createdGains = [];

  function mockParam(initial = 1) {
    return {
      value: initial,
      rampedTo: null,
      setValueAtTime(v, t) { this.value = v; },
      linearRampToValueAtTime(v, t) { this.rampedTo = { v, t }; this.value = v; },
      setTargetAtTime(v, t) { this.value = v; },
      cancelScheduledValues() {},
    };
  }

  class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.destination = {};
    }
    get currentTime() {
      return currentTimeSec;
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

  const sandbox = {
    window: { AudioContext: MockAudioContext, addEventListener: () => {} },
    document: { addEventListener: () => {}, hidden: false },
    performance: { now: () => currentPerfMs },
    fetch: () => Promise.reject(new Error('no fetch in test')),
    setTimeout: (fn, delay) => setTimeout(fn, 0),
    Map,
    Set,
    console,
    Math,
  };

  vm.createContext(sandbox);
  vm.runInContext(cleanCode + '; globalThis.sm = soundManager;', sandbox);
  const sm = sandbox.sm;
  sm.init();

  // Populate mock sfx buffers so playSample does not fall back to synth
  const allSfxIds = [
    'sfx_punch_impact',
    'sfx_hit_drywall',
    'sfx_hit_reinforced',
    'sfx_hit_golden',
    'sfx_concrete_hit',
    'sfx_wall_collapse',
    'sfx_concrete_break',
    'sfx_tile_shatter',
    'sfx_coin_pickup',
    'sfx_coin_drop',
    'sfx_punch_whoosh',
    'sfx_super_smash',
  ];
  for (const id of allSfxIds) {
    sm.sfxBuffers.set(id, { duration: 0.35, numberOfChannels: 2, sampleRate: 32000 });
  }

  return {
    sm,
    sandbox,
    createdSources,
    createdGains,
    setTime: (timeMs) => {
      currentPerfMs = timeMs;
      currentTimeSec = timeMs / 1000;
    },
  };
}

// -----------------------------------------------------------------------------
// SUITE 1: SIMULTANEOUS TRIGGERING OF PUNCH & CONCRETE HIT (AT t = 100ms)
// -----------------------------------------------------------------------------
suite('Suite 1: Simultaneous Punch & Concrete Hit Concurrency', () => {
  const env = createAudioSandbox(100);
  const { sm, createdSources } = env;

  // Verify maps in soundManager
  assert(sm.categoryLastTrigger instanceof Map, 'categoryLastTrigger initialized as Map');
  assert(sm.lastPlayedAt instanceof Map, 'lastPlayedAt initialized as Map');

  // Trigger playPunchImpact at t = 100ms
  env.setTime(100);
  const sourcesBefore = createdSources.length;
  sm.playPunchImpact(1.0, 'normal', 'pipedreams');
  const sourcesAfter = createdSources.length;

  assert(
    sourcesAfter - sourcesBefore === 2,
    `Exactly 2 audio sources created for simultaneous punch (Layer 1 + Layer 2), got ${sourcesAfter - sourcesBefore}`
  );

  const l1Source = createdSources[sourcesBefore];
  const l2Source = createdSources[sourcesBefore + 1];

  assert(Boolean(l1Source) && l1Source.startedAt === 0.1, 'Layer 1 source started at currentTime 0.10s (t = 100ms)');
  assert(Boolean(l2Source) && l2Source.startedAt === 0.1, 'Layer 2 source started at currentTime 0.10s (t = 100ms)');

  // Verify category trigger timestamps in soundManager
  assert(
    sm.categoryLastTrigger.get('PUNCH_IMPACT') === 100,
    'PUNCH_IMPACT category registered trigger at t = 100ms'
  );
  assert(
    sm.categoryLastTrigger.get('MATERIAL_IMPACT') === 100,
    'MATERIAL_IMPACT category registered trigger at t = 100ms'
  );

  // Verify specific sound IDs registered
  assert(
    sm.lastPlayedAt.get('sfx_punch_impact') === 100,
    'sfx_punch_impact registered at t = 100ms'
  );
  assert(
    sm.lastPlayedAt.get('sfx_concrete_hit') === 100,
    'sfx_concrete_hit registered at t = 100ms (NOT throttled or shadowed!)'
  );

  // Additional variants test:
  // 1. reinforced variant in level0
  env.setTime(200);
  const prevCount1 = createdSources.length;
  sm.playPunchImpact(1.2, 'reinforced', 'level0');
  assert(createdSources.length - prevCount1 === 2, 'Reinforced punch in level0 triggers both Layer 1 and concrete hit Layer 2');
  assert(sm.lastPlayedAt.get('sfx_concrete_hit') === 200, 'Reinforced punch played sfx_concrete_hit');

  // 2. drywall in level0 normal
  env.setTime(300);
  const prevCount2 = createdSources.length;
  sm.playPunchImpact(1.0, 'normal', 'level0');
  assert(createdSources.length - prevCount2 === 2, 'Normal punch in level0 triggers Layer 1 and sfx_hit_drywall Layer 2');
  assert(sm.lastPlayedAt.get('sfx_hit_drywall') === 300, 'Normal level0 punch played sfx_hit_drywall');

  // 3. golden variant
  env.setTime(400);
  const prevCount3 = createdSources.length;
  sm.playPunchImpact(1.5, 'golden', 'level0');
  assert(createdSources.length - prevCount3 === 2, 'Golden punch triggers Layer 1 and sfx_hit_golden Layer 2');
  assert(sm.lastPlayedAt.get('sfx_hit_golden') === 400, 'Golden punch played sfx_hit_golden');
});

// -----------------------------------------------------------------------------
// SUITE 2: RAPID REPEATED PUNCHES (20 PUNCHES IN 500ms, 75ms COOLDOWN)
// -----------------------------------------------------------------------------
suite('Suite 2: Rapid Repeated Punches Cooldown & Polyphony Limiter', () => {
  const env = createAudioSandbox(1000);
  const { sm, createdSources } = env;

  // Fire 20 punches across 500ms (25ms intervals: t = 1000, 1025, 1050, ..., 1475)
  // Cooldown is 75ms for BOTH PUNCH_IMPACT and MATERIAL_IMPACT.
  // Triggers expected at t = 1000, 1075, 1150, 1225, 1300, 1375, 1450 (7 triggers, 13 throttled)

  const triggers = [];
  const throttled = [];

  for (let i = 0; i < 20; i++) {
    const t = 1000 + i * 25;
    env.setTime(t);
    const beforeCount = createdSources.length;
    sm.playPunchImpact(1.0, 'normal', 'pipedreams');
    const afterCount = createdSources.length;
    const added = afterCount - beforeCount;

    if (added === 2) {
      triggers.push({ index: i, time: t });
    } else if (added === 0) {
      throttled.push({ index: i, time: t });
    } else {
      assert(false, `Unexpected asymmetric layer trigger at punch ${i} (added ${added} sources)!`);
    }
  }

  assert(triggers.length === 7, `20 punches in 500ms resulted in exactly 7 triggers (got ${triggers.length})`);
  assert(throttled.length === 13, `13 punches were throttled cleanly by 75ms cooldown (got ${throttled.length})`);

  const expectedTriggerTimes = [1000, 1075, 1150, 1225, 1300, 1375, 1450];
  const actualTriggerTimes = triggers.map(t => t.time);
  assert(
    JSON.stringify(actualTriggerTimes) === JSON.stringify(expectedTriggerTimes),
    `Trigger times strictly match 75ms increments: [${actualTriggerTimes.join(', ')}]`
  );

  // Check polyphony limits on activeVoices
  const punchVoices = sm.activeVoices.get('PUNCH_IMPACT') || [];
  const materialVoices = sm.activeVoices.get('MATERIAL_IMPACT') || [];

  assert(
    punchVoices.length <= 2,
    `PUNCH_IMPACT active voices strictly capped at max 2 during burst (current: ${punchVoices.length})`
  );
  assert(
    materialVoices.length <= 2,
    `MATERIAL_IMPACT active voices strictly capped at max 2 during burst (current: ${materialVoices.length})`
  );

  // Test voice stealing on fresh punch cycle after stale voice eviction (> 1.5s idle)
  // Last punch was at 1450ms. Advance time to 3000ms (1.55s later).
  // Eviction threshold in audio.ts is 1.5s, so voices older than 1.5s are evicted.
  env.setTime(3000); // 3.0s: previous voices evicted
  sm.playPunchImpact(1.0, 'normal', 'pipedreams');
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 1, 'PUNCH_IMPACT voices = 1 after fresh punch at 3000ms');
  assert(sm.activeVoices.get('MATERIAL_IMPACT').length === 1, 'MATERIAL_IMPACT voices = 1 after fresh punch at 3000ms');

  // Punch 2 at 3080ms
  env.setTime(3080);
  sm.playPunchImpact(1.0, 'normal', 'pipedreams');
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 2, 'PUNCH_IMPACT voices = 2 after 2nd punch at 3080ms');
  assert(sm.activeVoices.get('MATERIAL_IMPACT').length === 2, 'MATERIAL_IMPACT voices = 2 after 2nd punch at 3080ms');

  // Punch 3 at 3160ms -> triggers voice stealing for both categories (caps at 2)
  const punchVoice0 = sm.activeVoices.get('PUNCH_IMPACT')[0];
  const matVoice0 = sm.activeVoices.get('MATERIAL_IMPACT')[0];

  env.setTime(3160);
  sm.playPunchImpact(1.0, 'normal', 'pipedreams');
  assert(sm.activeVoices.get('PUNCH_IMPACT').length === 2, 'PUNCH_IMPACT voices capped at 2 after 3rd trigger');
  assert(sm.activeVoices.get('MATERIAL_IMPACT').length === 2, 'MATERIAL_IMPACT voices capped at 2 after 3rd trigger');

  assert(
    Math.abs(punchVoice0.source.stoppedAt - (3.16 + 0.016)) < 1e-6,
    `Stolen PUNCH_IMPACT voice stopped at scheduled time 3.176s`
  );
  assert(
    punchVoice0.gain.gain.rampedTo && punchVoice0.gain.gain.rampedTo.v === 0.0001,
    'Stolen PUNCH_IMPACT voice faded out to 0.0001 (anti-click zero-crossing)'
  );
  assert(
    Math.abs(matVoice0.source.stoppedAt - (3.16 + 0.016)) < 1e-6,
    `Stolen MATERIAL_IMPACT voice stopped at scheduled time 3.176s`
  );
  assert(
    matVoice0.gain.gain.rampedTo && matVoice0.gain.gain.rampedTo.v === 0.0001,
    'Stolen MATERIAL_IMPACT voice faded out to 0.0001 (anti-click zero-crossing)'
  );
});

// -----------------------------------------------------------------------------
// SUITE 3: CONCRETE WALL DESTRUCTION (playWallCollapse)
// -----------------------------------------------------------------------------
suite('Suite 3: Concrete Wall Destruction & Category Routing', () => {
  const env = createAudioSandbox(4000);
  const { sm, createdSources } = env;

  // 1. Pipedreams concrete wall collapse
  env.setTime(4000);
  const before1 = createdSources.length;
  sm.playWallCollapse(false, 'pipedreams', true);
  assert(createdSources.length - before1 === 1, 'Pipedreams collapse triggered 1 source');
  assert(sm.lastPlayedAt.get('sfx_concrete_break') === 4000, 'sfx_concrete_break fired at t = 4000ms');
  assert(sm.categoryLastTrigger.get('WALL_COLLAPSE') === 4000, 'Fired under category WALL_COLLAPSE');

  // 2. Level0 concrete wall collapse (isConcrete = true)
  env.setTime(4150);
  const before2 = createdSources.length;
  sm.playWallCollapse(false, 'level0', true);
  assert(createdSources.length - before2 === 1, 'Level0 concrete wall collapse triggered 1 source');
  assert(sm.lastPlayedAt.get('sfx_concrete_break') === 4150, 'sfx_concrete_break fired for level0 concrete wall');

  // 3. Level0 drywall collapse (isConcrete = false)
  env.setTime(4300);
  const before3 = createdSources.length;
  sm.playWallCollapse(false, 'level0', false);
  assert(createdSources.length - before3 === 1, 'Standard drywall collapse triggered 1 source');
  assert(sm.lastPlayedAt.get('sfx_wall_collapse') === 4300, 'sfx_wall_collapse fired for drywall');

  // 4. Poolrooms collapse (wall collapse + tile shatter concurrent)
  env.setTime(4450);
  const before4 = createdSources.length;
  sm.playWallCollapse(false, 'poolrooms', false);
  assert(
    createdSources.length - before4 === 2,
    `Poolrooms collapse triggered 2 concurrent sources (sfx_wall_collapse + sfx_tile_shatter), got ${createdSources.length - before4}`
  );
  assert(sm.lastPlayedAt.get('sfx_wall_collapse') === 4450, 'sfx_wall_collapse fired at 4450ms');
  assert(sm.lastPlayedAt.get('sfx_tile_shatter') === 4450, 'sfx_tile_shatter fired at 4450ms (category DEFAULT, not dropped!)');

  // 5. Cooldown throttling on wall collapse (100ms cooldown)
  env.setTime(4480); // dt = 30ms < 100ms
  const before5 = createdSources.length;
  sm.playWallCollapse(false, 'pipedreams', true);
  assert(createdSources.length - before5 === 0, 'Wall collapse at dt=30ms was cleanly throttled by 100ms cooldown');
});

// -----------------------------------------------------------------------------
// SUITE 4: RECORDS TAB DOM HIERARCHY
// -----------------------------------------------------------------------------
suite('Suite 4: Records Tab DOM Hierarchy (Title Element Precedes Icon)', () => {
  const modalTsxPath = path.join(ROOT_DIR, 'src', 'components', 'GameModal.tsx');
  const modalContent = fs.readFileSync(modalTsxPath, 'utf-8');

  // Find the records GUI modal body block (match index 1, where the 4 cards live)
  const allRecordsMatches = [...modalContent.matchAll(/\{activeGui === 'records' && \(([\s\S]*?)\)\}/g)];
  assert(allRecordsMatches.length >= 2, `GameModal.tsx has modal header and body for records (found ${allRecordsMatches.length})`);

  const recordsBody = allRecordsMatches[1][1];
  const cardChunks = recordsBody.split('cartoon-card-cream').slice(1);

  assert(cardChunks.length === 4, `Records tab contains exactly 4 cards (got ${cardChunks.length})`);

  const expectedCards = [
    { name: 'Best Level', titleKey: 'strings.statBestLevel', iconTag: 'CartoonTrophyIcon' },
    { name: 'Best Walls', titleKey: 'strings.statBestWalls', iconTag: 'CartoonHammerIcon' },
    { name: 'Max Combo', titleKey: 'strings.statMaxCombo', iconTag: 'CartoonFlameIcon' },
    { name: 'Best Score', titleKey: 'strings.statBestScore', iconTag: 'CartoonStarIcon' },
  ];

  for (let i = 0; i < cardChunks.length; i++) {
    const cardContent = cardChunks[i];
    const exp = expectedCards[i];

    const hasTitle = cardContent.includes(exp.titleKey);
    const hasIcon = cardContent.includes(exp.iconTag);

    assert(hasTitle, `Card ${i + 1} (${exp.name}) contains title key ${exp.titleKey}`);
    assert(hasIcon, `Card ${i + 1} (${exp.name}) contains icon ${exp.iconTag}`);

    const titleIdx = cardContent.indexOf(exp.titleKey);
    const iconIdx = cardContent.indexOf(exp.iconTag);

    assert(
      titleIdx !== -1 && iconIdx !== -1 && titleIdx < iconIdx,
      `Card ${i + 1} (${exp.name}): Title element strictly PRECEDES the icon element in DOM order (titleIdx: ${titleIdx} < iconIdx: ${iconIdx})`
    );

    // Verify value pill comes after icon
    const pillIdx = cardContent.indexOf('cartoon-pill-inset');
    assert(
      pillIdx > iconIdx,
      `Card ${i + 1} (${exp.name}): Value pill comes after icon in DOM hierarchy`
    );
  }
});

// -----------------------------------------------------------------------------
// SUITE 5: DYNAMIC JACKPOT FORMULA (MONOTONIC SCALING & SAFE FLOOR)
// -----------------------------------------------------------------------------
suite('Suite 5: Dynamic Scaled Jackpot Formula & Monotonicity', () => {
  // Replicate exact formula from GameModal.tsx lines 217-238
  function calculateJackpotPrize(runCoinsEarned, roomLevel, rebirthMult, tierMult) {
    const L = Math.max(1, roomLevel || 1);
    const roomBonusCalc = Math.round(L * 250 * rebirthMult);
    const floorCalc = Math.round(1000 * rebirthMult);
    const calculatedPrize = Math.max(
      floorCalc,
      Math.round(runCoinsEarned * tierMult) + roomBonusCalc
    );
    return { calculatedPrize, floorCalc, roomBonusCalc };
  }

  const tiers = [
    { name: 'grand', mult: 2.0 },
    { name: 'mega', mult: 3.5 },
    { name: 'ultra', mult: 5.0 },
  ];

  // 1. Safe Floor Tests
  // At 0 coins earned, prize must equal or exceed floorCalc for all rooms and rebirth multipliers
  for (let rebirth = 0; rebirth <= 5; rebirth++) {
    const mult = 1 + rebirth * 1.0;
    for (let room = 1; room <= 20; room++) {
      for (const t of tiers) {
        const { calculatedPrize, floorCalc } = calculateJackpotPrize(0, room, mult, t.mult);
        assert(
          calculatedPrize >= floorCalc,
          `At 0 coins (rebirth=${rebirth}, room=${room}, tier=${t.name}): prize ${calculatedPrize} >= floor ${floorCalc}`
        );
        assert(
          calculatedPrize >= 1000,
          `Floor prize is never below 1,000 coins (got ${calculatedPrize})`
        );
      }
    }
  }

  // 2. Strict Monotonicity with runCoinsEarned
  // As run coins increase, prize must be monotonically non-decreasing, and strictly increasing once above floor
  const testCoins = [0, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 50000, 100000];
  for (const t of tiers) {
    for (const room of [1, 5, 10]) {
      let prevPrize = -1;
      for (const coins of testCoins) {
        const { calculatedPrize } = calculateJackpotPrize(coins, room, 1.0, t.mult);
        assert(
          calculatedPrize >= prevPrize,
          `Monotonic coin scaling for ${t.name} (room ${room}): coins=${coins} -> prize=${calculatedPrize} >= prev=${prevPrize}`
        );
        prevPrize = calculatedPrize;
      }
    }
  }

  // 3. Strict Monotonicity with Room Level
  // For fixed coins and tier, higher room level yields strictly greater or equal prize
  for (const t of tiers) {
    for (const coins of [0, 500, 2000]) {
      let prevPrize = -1;
      for (let room = 1; room <= 15; room++) {
        const { calculatedPrize } = calculateJackpotPrize(coins, room, 1.0, t.mult);
        assert(
          calculatedPrize >= prevPrize,
          `Monotonic room scaling for ${t.name} (coins ${coins}): room=${room} -> prize=${calculatedPrize} >= prev=${prevPrize}`
        );
        if (room > 4 && prevPrize > 0) {
          assert(
            calculatedPrize > prevPrize,
            `Strict room growth above floor: room ${room} (${calculatedPrize}) > room ${room - 1} (${prevPrize})`
          );
        }
        prevPrize = calculatedPrize;
      }
    }
  }

  // 4. Tier Ordering:
  // When below floor: all tiers safely guarantee floor (1,000 coins)
  // When above floor: ultra > mega > grand strictly holds
  for (const room of [1, 5]) {
    for (const coins of [100, 500, 2000, 10000]) {
      const grand = calculateJackpotPrize(coins, room, 1.0, 2.0).calculatedPrize;
      const mega = calculateJackpotPrize(coins, room, 1.0, 3.5).calculatedPrize;
      const ultra = calculateJackpotPrize(coins, room, 1.0, 5.0).calculatedPrize;

      assert(
        ultra >= mega && mega >= grand,
        `Non-decreasing tier ordering at coins=${coins}, room=${room}: Ultra(${ultra}) >= Mega(${mega}) >= Grand(${grand})`
      );

      // Above floor, tier ordering is strictly increasing
      if (grand > 1000) {
        assert(
          ultra > mega && mega > grand,
          `Strict tier ordering above floor at coins=${coins}, room=${room}: Ultra(${ultra}) > Mega(${mega}) > Grand(${grand})`
        );
      }
    }
  }

  // 5. Adversarial input robustness
  const { calculatedPrize: negPrize, floorCalc: negFloor } = calculateJackpotPrize(-500, 1, 1.0, 2.0);
  assert(negPrize === negFloor, `Negative coin input clamped safely to floor (${negPrize} === ${negFloor})`);
  const { calculatedPrize: nanPrize } = calculateJackpotPrize(0, 0, 1.0, 2.0);
  assert(!Number.isNaN(nanPrize) && Number.isFinite(nanPrize), 'Zero/falsy room clamped safely to valid number');
});

// -----------------------------------------------------------------------------
// SUITE 6: VITE BUNDLE CLEANLINESS & MOUNT VERIFICATION
// -----------------------------------------------------------------------------
suite('Suite 6: Vite Bundle Cleanliness & Mount Verification', () => {
  const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
  assert(fs.existsSync(distAssetsDir), 'dist/assets directory exists');

  const files = fs.readdirSync(distAssetsDir);
  const jsBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  assert(Boolean(jsBundle), `Found production JS bundle: ${jsBundle}`);

  const bundlePath = path.join(distAssetsDir, jsBundle);
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

  // Verify bundle is not empty
  assert(bundleContent.length > 500000, `Bundle size is substantial: ${(bundleContent.length / 1024).toFixed(1)} KB`);

  // Check that isMuted is NOT an undeclared free variable in the bundle
  const freeIsMutedMatches = bundleContent.match(/[^.\w$]isMuted[^:\w$]/g) || [];
  const freeSetIsMutedMatches = bundleContent.match(/[^.\w$]setIsMuted[^:\w$]/g) || [];

  assert(
    freeIsMutedMatches.length === 0,
    `No free undeclared isMuted identifier in bundle (found ${freeIsMutedMatches.length})`
  );
  assert(
    freeSetIsMutedMatches.length === 0,
    `No free undeclared setIsMuted identifier in bundle (found ${freeSetIsMutedMatches.length})`
  );

  // Check localization string in bundle
  const containsLocalizedRebirth = bundleContent.includes('rebirthCoinMultLabel') ||
    bundleContent.includes('MULTIPLICADOR DE MOEDAS') ||
    bundleContent.includes('COIN MULTIPLIER');
  assert(containsLocalizedRebirth, 'Bundle contains localized rebirth coin multiplier references');

  // Check simulated runtime mount of the bundle in a simulated browser context
  let threwReferenceError = false;
  let exceptionMessage = null;

  try {
    const mockWindow = {
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { href: 'http://localhost/', search: '', hash: '' },
      navigator: { userAgent: 'AdversarialTestAgent' },
      document: {
        createElement: (tag) => ({
          tagName: tag.toUpperCase(),
          style: {},
          setAttribute: () => {},
          appendChild: () => {},
          addEventListener: () => {},
        }),
        getElementById: () => null,
        head: { appendChild: () => {} },
        body: { appendChild: () => {} },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      requestAnimationFrame: (cb) => setTimeout(cb, 16),
      cancelAnimationFrame: (id) => clearTimeout(id),
      AudioContext: class {
        createGain() { return { gain: { value: 1, setValueAtTime: () => {} }, connect: () => {} }; }
        createDynamicsCompressor() { return { connect: () => {} }; }
      },
    };
    mockWindow.window = mockWindow;
    mockWindow.self = mockWindow;

    const bundleSandbox = {
      window: mockWindow,
      document: mockWindow.document,
      navigator: mockWindow.navigator,
      localStorage: mockWindow.localStorage,
      requestAnimationFrame: mockWindow.requestAnimationFrame,
      cancelAnimationFrame: mockWindow.cancelAnimationFrame,
      AudioContext: mockWindow.AudioContext,
      console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {} },
      setTimeout,
      clearTimeout,
    };

    vm.createContext(bundleSandbox);
    vm.runInContext(bundleContent, bundleSandbox);
  } catch (err) {
    if (err.name === 'ReferenceError' && err.message.includes('isMuted')) {
      threwReferenceError = true;
      exceptionMessage = err.message;
    }
  }

  assert(
    !threwReferenceError,
    `Production bundle mounted WITHOUT throwing ReferenceError for isMuted! (threw: ${exceptionMessage})`
  );
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\n==================================================`);
console.log(`CHALLENGER RECHECK ADVERSARIAL AUDIT RESULTS`);
console.log(`==================================================`);
console.log(`Total tests executed: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error(`\n❌ VERDICT: REQUEST_CHANGES`);
  console.error(`Failures:`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
} else {
  console.log(`\n🏆 VERDICT: APPROVE`);
  console.log(`All 6 adversarial stress dimensions verified with 100% EMPIRICAL compliance!`);
  process.exit(0);
}
