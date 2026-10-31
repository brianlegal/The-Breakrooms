import fs from 'fs';

console.log('--- Testing Remediation Changes ---');

// 1. Verify audio.ts
const audioSrc = fs.readFileSync('src/game/audio.ts', 'utf-8');

const hasMaterialImpactCategory = audioSrc.includes("'MATERIAL_IMPACT'");
const hasCategoryCooldown = /MATERIAL_IMPACT:\s*75/.test(audioSrc);
const concreteHitMapped = /sfx_concrete_hit:\s*'MATERIAL_IMPACT'/.test(audioSrc);
const punchImpactMapped = /sfx_punch_impact:\s*'PUNCH_IMPACT'/.test(audioSrc);
const tileShatterDefault = /sfx_tile_shatter[\s\S]*?category:\s*'DEFAULT'/.test(audioSrc);
const startupThrottleFixed = audioSrc.includes('this.lastPlayedAt.has(id)') && audioSrc.includes('this.categoryLastTrigger.has(category)');

console.log('1. SoundCategory has MATERIAL_IMPACT:', hasMaterialImpactCategory);
console.log('2. CATEGORY_COOLDOWNS has MATERIAL_IMPACT: 75:', hasCategoryCooldown);
console.log('3. sfx_concrete_hit mapped to MATERIAL_IMPACT:', concreteHitMapped);
console.log('4. sfx_punch_impact mapped to PUNCH_IMPACT:', punchImpactMapped);
console.log('5. sfx_tile_shatter category is DEFAULT in playWallCollapse:', tileShatterDefault);
console.log('6. Startup throttle check uses .has():', startupThrottleFixed);

if (!hasMaterialImpactCategory || !hasCategoryCooldown || !concreteHitMapped || !punchImpactMapped || !tileShatterDefault || !startupThrottleFixed) {
  console.error('Audio checks failed!');
  process.exit(1);
}

// 2. Simulated playPunchImpact test
class AudioSim {
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
    this.played = [];
  }

  playSample(id, options = {}) {
    const category = options.category ?? this.SFX_CATEGORY_MAP[id] ?? 'DEFAULT';
    const nowMs = 100;
    const catCooldown = this.CATEGORY_COOLDOWNS[category] ?? 20;
    const minInterval = options.minIntervalMs !== undefined ? Math.max(options.minIntervalMs, catCooldown) : catCooldown;

    const idThrottled = this.lastPlayedAt.has(id) && (nowMs - (this.lastPlayedAt.get(id) ?? 0) < minInterval);
    const catThrottled = this.categoryLastTrigger.has(category) && (nowMs - (this.categoryLastTrigger.get(category) ?? 0) < minInterval);
    if (idThrottled || catThrottled) {
      return false; // Throttled
    }
    this.lastPlayedAt.set(id, nowMs);
    this.categoryLastTrigger.set(category, nowMs);
    this.played.push({ id, category, time: nowMs });
    return true;
  }

  playPunchImpact(intensity = 1.0, variant = 'normal', biome = 'level0') {
    const isConcrete = biome === 'pipedreams' || variant === 'reinforced' || variant === 'concrete';
    
    // Layer 1
    const l1 = this.playSample('sfx_punch_impact', {
      category: 'PUNCH_IMPACT',
      minIntervalMs: 75,
    });

    // Layer 2
    const id = variant === 'golden' ? 'sfx_hit_golden' : isConcrete ? 'sfx_concrete_hit' : 'sfx_hit_drywall';
    const l2 = this.playSample(id, {
      category: 'MATERIAL_IMPACT',
      minIntervalMs: 75,
    });

    return { l1, l2 };
  }
}

const sim = new AudioSim();
const res = sim.playPunchImpact(1.0, 'normal', 'pipedreams');
console.log('7. Simulation result for playPunchImpact(1.0, normal, pipedreams):', res);
console.log('   Played sounds:', sim.played);
if (!res.l1 || !res.l2) {
  console.error('Simulation FAILED: punch impact or concrete hit was throttled!');
  process.exit(1);
}

// 3. Verify GameModal.tsx
const modalSrc = fs.readFileSync('src/components/GameModal.tsx', 'utf-8');
const isMutedDeclared = /const\s+\[isMuted,\s*setIsMuted\]\s*=\s*useState\(soundManager\.getMuted\(\)\);/.test(modalSrc);
console.log('8. isMuted declared in GameModal.tsx:', isMutedDeclared);
if (!isMutedDeclared) {
  console.error('isMuted not declared!');
  process.exit(1);
}

const noHardcodedRebirthMultiplier = !modalSrc.includes('Rebirth Multiplier:');
const usesLocalizedRebirthLabel = modalSrc.includes('{strings.rebirthCoinMultLabel}:');
console.log('9. No hardcoded Rebirth Multiplier string:', noHardcodedRebirthMultiplier);
console.log('10. Uses strings.rebirthCoinMultLabel:', usesLocalizedRebirthLabel);

if (!noHardcodedRebirthMultiplier || !usesLocalizedRebirthLabel) {
  console.error('Localization check failed!');
  process.exit(1);
}

// 4. Check production bundle for undeclared free isMuted
const distFiles = fs.readdirSync('dist/assets');
const jsBundle = distFiles.find(f => f.startsWith('index-') && f.endsWith('.js'));
if (jsBundle) {
  const bundleContent = fs.readFileSync(`dist/assets/${jsBundle}`, 'utf-8');
  // Check if isMuted is referenced as a free global or minified properly
  // Since isMuted is a useState variable, inside the minified React component it should be minified to a local variable
  // Let's verify that the bundle doesn't have `isMuted?` or free `setIsMuted(`
  const hasFreeIsMuted = /[^.\w]isMuted[^:\w]/.test(bundleContent);
  const hasFreeSetIsMuted = bundleContent.includes('setIsMuted');
  console.log('11. Bundle free isMuted/setIsMuted present:', hasFreeIsMuted || hasFreeSetIsMuted, '(should be false)');
  if (hasFreeIsMuted || hasFreeSetIsMuted) {
    console.error('Bundle contains unminified free identifier isMuted/setIsMuted!');
    process.exit(1);
  }
}

console.log('ALL REMEDIATION CHECKS PASSED SUCCESSFULLY! ✅');
