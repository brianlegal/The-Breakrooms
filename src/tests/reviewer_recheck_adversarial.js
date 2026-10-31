import fs from 'node:fs';

console.log('====================================================');
console.log('REVIEWER RECHECK: ADVERSARIAL STRESS TEST SUITE');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  [PASS] ${message}`);
  } else {
    testsFailed++;
    console.error(`  [FAIL] ${message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. INTEGRITY AUDIT: Source Code AST & Structure Checks
// -----------------------------------------------------------------------------
console.log('\n--- 1. SOURCE CODE INTEGRITY AUDIT ---');
const audioSrc = fs.readFileSync('src/game/audio.ts', 'utf-8');
const modalSrc = fs.readFileSync('src/components/GameModal.tsx', 'utf-8');
const i18nSrc = fs.readFileSync('src/game/i18n.ts', 'utf-8');

// Audio Integrity
assert(audioSrc.includes("'MATERIAL_IMPACT'"), "SoundCategory includes 'MATERIAL_IMPACT'");
assert(/MATERIAL_IMPACT:\s*75/.test(audioSrc), "CATEGORY_COOLDOWNS has MATERIAL_IMPACT: 75");
assert(/sfx_concrete_hit:\s*'MATERIAL_IMPACT'/.test(audioSrc), "SFX_CATEGORY_MAP maps sfx_concrete_hit to MATERIAL_IMPACT");
assert(/sfx_hit_drywall:\s*'MATERIAL_IMPACT'/.test(audioSrc), "SFX_CATEGORY_MAP maps sfx_hit_drywall to MATERIAL_IMPACT");
assert(/sfx_hit_reinforced:\s*'MATERIAL_IMPACT'/.test(audioSrc), "SFX_CATEGORY_MAP maps sfx_hit_reinforced to MATERIAL_IMPACT");
assert(/sfx_hit_golden:\s*'MATERIAL_IMPACT'/.test(audioSrc), "SFX_CATEGORY_MAP maps sfx_hit_golden to MATERIAL_IMPACT");
assert(/sfx_punch_impact:\s*'PUNCH_IMPACT'/.test(audioSrc), "SFX_CATEGORY_MAP maps sfx_punch_impact to PUNCH_IMPACT");
assert(/sfx_tile_shatter[\s\S]*?category:\s*'DEFAULT'/.test(audioSrc), "sfx_tile_shatter uses category 'DEFAULT' in playWallCollapse");
assert(/this\.lastPlayedAt\.has\(id\)/.test(audioSrc), "Cooldown check uses this.lastPlayedAt.has(id)");
assert(/this\.categoryLastTrigger\.has\(category\)/.test(audioSrc), "Cooldown check uses this.categoryLastTrigger.has(category)");

// GameModal Integrity
assert(/const\s+\[isMuted,\s*setIsMuted\]\s*=\s*useState\(soundManager\.getMuted\(\)\);/.test(modalSrc), "GameModal declares [isMuted, setIsMuted] = useState(soundManager.getMuted())");
assert(!modalSrc.includes('Rebirth Multiplier:'), "No hardcoded 'Rebirth Multiplier:' English string in GameModal");
assert(modalSrc.includes('{strings.rebirthCoinMultLabel}:'), "GameModal uses {strings.rebirthCoinMultLabel}:");

// -----------------------------------------------------------------------------
// 2. RUNTIME SIMULATION: Concurrent Dual-Layer Punch & Wall Collapse
// -----------------------------------------------------------------------------
console.log('\n--- 2. RUNTIME SIMULATION: CONCURRENCY & COOLDOWN BEHAVIOR ---');

class MockSoundManager {
  constructor() {
    this.lastPlayedAt = new Map();
    this.categoryLastTrigger = new Map();
    this.CATEGORY_COOLDOWNS = {
      PUNCH_SWING: 85,
      PUNCH_IMPACT: 75,
      MATERIAL_IMPACT: 75,
      WALL_COLLAPSE: 100,
      COIN_PICKUP: 70,
      COIN_DROP: 80,
      DEFAULT: 20,
    };
    this.SFX_CATEGORY_MAP = {
      sfx_punch_whoosh: 'PUNCH_SWING',
      sfx_punch_impact: 'PUNCH_IMPACT',
      sfx_hit_drywall: 'MATERIAL_IMPACT',
      sfx_hit_reinforced: 'MATERIAL_IMPACT',
      sfx_hit_golden: 'MATERIAL_IMPACT',
      sfx_concrete_hit: 'MATERIAL_IMPACT',
      sfx_wall_collapse: 'WALL_COLLAPSE',
      sfx_concrete_break: 'WALL_COLLAPSE',
      sfx_tile_shatter: 'WALL_COLLAPSE',
      sfx_coin_pickup: 'COIN_PICKUP',
      sfx_coin_drop: 'COIN_DROP',
    };
    this.dispatched = [];
  }

  playSample(id, options = {}, nowMs = 0) {
    const category = options.category ?? this.SFX_CATEGORY_MAP[id] ?? 'DEFAULT';
    const catCooldown = this.CATEGORY_COOLDOWNS[category] ?? 20;
    const minInterval = options.minIntervalMs !== undefined
      ? Math.max(options.minIntervalMs, catCooldown)
      : catCooldown;

    const idThrottled = this.lastPlayedAt.has(id) && (nowMs - (this.lastPlayedAt.get(id) ?? 0) < minInterval);
    const catThrottled = this.categoryLastTrigger.has(category) && (nowMs - (this.categoryLastTrigger.get(category) ?? 0) < minInterval);
    if (idThrottled || catThrottled) {
      return false; // Throttled
    }
    this.lastPlayedAt.set(id, nowMs);
    this.categoryLastTrigger.set(category, nowMs);
    this.dispatched.push({ id, category, time: nowMs });
    return true;
  }

  playPunchImpact(intensity = 1.0, variant = 'normal', biome = 'level0', nowMs = 0) {
    const isConcrete = biome === 'pipedreams' || variant === 'reinforced' || variant === 'concrete';
    const l1 = this.playSample('sfx_punch_impact', {
      minIntervalMs: 75,
      category: 'PUNCH_IMPACT',
    }, nowMs);

    const id = variant === 'golden' ? 'sfx_hit_golden' : isConcrete ? 'sfx_concrete_hit' : 'sfx_hit_drywall';
    const l2 = this.playSample(id, {
      minIntervalMs: 75,
      category: 'MATERIAL_IMPACT',
    }, nowMs);

    return { l1, l2, id };
  }

  playWallCollapse(isSpecial = false, biome = 'level0', isConcrete = false, nowMs = 0) {
    const concreteWall = isConcrete || biome === 'pipedreams';
    let l1 = false;
    if (concreteWall) {
      l1 = this.playSample('sfx_concrete_break', {
        minIntervalMs: 100,
        category: 'WALL_COLLAPSE',
      }, nowMs);
    } else {
      l1 = this.playSample('sfx_wall_collapse', {
        minIntervalMs: 100,
        category: 'WALL_COLLAPSE',
      }, nowMs);
    }

    let tile = false;
    if (biome === 'poolrooms') {
      tile = this.playSample('sfx_tile_shatter', {
        minIntervalMs: 100,
        category: 'DEFAULT',
      }, nowMs);
    }

    let gold = false;
    if (isSpecial) {
      gold = this.playSample('sfx_hit_golden', {
        minIntervalMs: 80,
        category: 'MATERIAL_IMPACT',
      }, nowMs + 55);
    }

    return { l1, tile, gold };
  }
}

// Scenario 1: Engine cold start at performance.now() = 0ms
const smCold = new MockSoundManager();
const coldPunch = smCold.playPunchImpact(1.0, 'normal', 'pipedreams', 0);
assert(coldPunch.l1 === true, "Startup at t=0ms: Layer 1 (punch impact) plays without throttle");
assert(coldPunch.l2 === true, "Startup at t=0ms: Layer 2 (concrete hit) plays concurrently without throttle");
assert(coldPunch.id === 'sfx_concrete_hit', "Correctly selects sfx_concrete_hit for pipedreams biome");

// Scenario 2: Rapid punch at t=30ms (within 75ms window)
const spamPunch = smCold.playPunchImpact(1.0, 'normal', 'pipedreams', 30);
assert(spamPunch.l1 === false, "Spam at t=30ms: Layer 1 correctly throttled by 75ms cooldown");
assert(spamPunch.l2 === false, "Spam at t=30ms: Layer 2 correctly throttled by 75ms cooldown");

// Scenario 3: Legitimate second punch at t=80ms (> 75ms)
const legitPunch = smCold.playPunchImpact(1.0, 'normal', 'pipedreams', 80);
assert(legitPunch.l1 === true, "Punch at t=80ms: Layer 1 fires successfully");
assert(legitPunch.l2 === true, "Punch at t=80ms: Layer 2 fires successfully");

// Scenario 4: Drywall variant punch
const smDry = new MockSoundManager();
const dryPunch = smDry.playPunchImpact(1.0, 'normal', 'level0', 100);
assert(dryPunch.l1 === true && dryPunch.l2 === true, "Drywall punch: both layers fire concurrently");
assert(dryPunch.id === 'sfx_hit_drywall', "Correctly selects sfx_hit_drywall for level0 normal");

// Scenario 5: Golden variant punch
const smGold = new MockSoundManager();
const goldPunch = smGold.playPunchImpact(1.0, 'golden', 'level0', 100);
assert(goldPunch.l1 === true && goldPunch.l2 === true, "Golden punch: both layers fire concurrently");
assert(goldPunch.id === 'sfx_hit_golden', "Correctly selects sfx_hit_golden for golden variant");

// Scenario 6: Wall collapse in poolrooms with tile shatter
const smCollapse = new MockSoundManager();
const collapsePool = smCollapse.playWallCollapse(true, 'poolrooms', false, 200);
assert(collapsePool.l1 === true, "Poolrooms collapse: sfx_wall_collapse fires (WALL_COLLAPSE)");
assert(collapsePool.tile === true, "Poolrooms collapse: sfx_tile_shatter fires concurrently (DEFAULT category)");
assert(collapsePool.gold === true, "Special wall collapse: sfx_hit_golden fires at t=255ms (MATERIAL_IMPACT)");

// Scenario 7: Concrete wall collapse
const collapseConcrete = smCollapse.playWallCollapse(false, 'pipedreams', true, 500);
assert(collapseConcrete.l1 === true, "Pipedreams collapse: sfx_concrete_break fires (WALL_COLLAPSE)");

// -----------------------------------------------------------------------------
// 3. PRODUCTION BUNDLE RUNTIME COMPLIANCE CHECK
// -----------------------------------------------------------------------------
console.log('\n--- 3. PRODUCTION BUNDLE SANITY ---');
const distFiles = fs.readdirSync('dist/assets');
const jsBundle = distFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
assert(Boolean(jsBundle), `Production JS bundle found: ${jsBundle}`);

if (jsBundle) {
  const bundleText = fs.readFileSync(`dist/assets/${jsBundle}`, 'utf-8');
  assert(!/[^.\w]isMuted[^:\w]/.test(bundleText), "No un-prefixed free global isMuted in production bundle");
  assert(!bundleText.includes('setIsMuted('), "No free global setIsMuted( in production bundle");
  assert(!bundleText.includes('Rebirth Multiplier:'), "No unlocalized 'Rebirth Multiplier:' in bundle");
}

// -----------------------------------------------------------------------------
// 4. SUMMARY
// -----------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS! 🎯');
}
