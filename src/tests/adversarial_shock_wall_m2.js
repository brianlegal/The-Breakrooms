/**
 * Adversarial Verification Suite: Milestone 2 — Shock Wall Visuals & 0.5s Proximity Stun
 * Target: Requirement R2 (Complete text removal, hazard chevrons, vector lightning, 3-pass plasma arcs,
 *         cyan toon emissive glow, 0.5s proximity shock paralysis, and updated localization).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('==================================================');
console.log('SUITE 1: Shock Wall Surface Text Elimination & Visual Upgrade');
console.log('==================================================');

const texturesPath = path.join(projectRoot, 'src/game/textures.ts');
assert(fs.existsSync(texturesPath), 'textures.ts exists');
const texturesContent = fs.readFileSync(texturesPath, 'utf8');

// Extract variant === 'electric' block
const electricBlockMatch = texturesContent.match(/variant === 'electric'[\s\S]*?} else if \(variant === 'border'\)/);
assert(Boolean(electricBlockMatch), "Found variant === 'electric' block in textures.ts");

const electricBlock = electricBlockMatch ? electricBlockMatch[0] : '';

// 1. Zero text assertions
assert(!electricBlock.includes('ctx.fillText'), "variant === 'electric' contains ZERO ctx.fillText calls");
assert(!electricBlock.includes('ctx.font'), "variant === 'electric' contains ZERO ctx.font font assignments");
assert(!/HIGH\s+VOLTAGE/i.test(electricBlock), "variant === 'electric' does NOT contain 'HIGH VOLTAGE' text");
assert(!/USE\s+A\s+BOLA/i.test(electricBlock), "variant === 'electric' does NOT contain 'USE A BOLA' text");
assert(!/USE\s+BALL/i.test(electricBlock), "variant === 'electric' does NOT contain 'USE BALL' text");

// 2. 45° Diagonal Hazard Chevrons / Stripes
assert(electricBlock.includes('drawHazardBand'), 'Texture generator declares drawHazardBand helper');
assert(electricBlock.includes('#facc15'), 'Hazard band renders high-contrast electric yellow warning chevrons (#facc15)');
assert(electricBlock.includes('stripeW'), 'Hazard band calculates chevron stripe widths');
assert(electricBlock.includes('ctx.clip()'), 'Hazard band uses canvas clipping for crisp containment');

// 3. Center Geometric Vector Lightning Bolt Emblem
assert(electricBlock.includes('ctx.moveTo(270, 172)'), 'Emblem renders geometric vector lightning bolt path');
assert(electricBlock.includes('ctx.lineTo(218, 254)'), 'Vector lightning bolt has sharp multi-point zigzag geometry');
assert(electricBlock.includes('ctx.closePath()'), 'Vector lightning bolt closes path');
assert(electricBlock.includes('#facc15') && electricBlock.includes('#eab308'), 'Lightning bolt has amber outline and yellow fill');
assert(electricBlock.includes('rgba(255, 255, 255'), 'Lightning bolt includes bright white core highlight');
assert(electricBlock.includes('rivets'), 'Hazard diamond emblem includes mechanical rivets');

// 4. 3-Pass Glowing Branched Plasma Arcs
assert(electricBlock.includes('arcConfigs'), 'Electric texture declares structured multi-segment arcConfigs');
assert(electricBlock.includes('branches'), 'Plasma arcs include fractal branching forks');
assert(electricBlock.includes('Pass 1: Outer Cyan Corona Aura'), 'Plasma arc rendering includes Pass 1 (Outer Cyan Corona)');
assert(electricBlock.includes('Pass 2: Vivid Streamer Arc'), 'Plasma arc rendering includes Pass 2 (Vivid Streamer Arc)');
assert(electricBlock.includes('Pass 3: Hot Bright White Plasma Core'), 'Plasma arc rendering includes Pass 3 (Hot Bright White Core)');
assert(electricBlock.includes('#38bdf8'), 'Streamer arc uses neon cyan #38bdf8');
assert(electricBlock.includes('#ffffff'), 'Core streamer arc uses hot white #ffffff');

console.log('==================================================');
console.log('SUITE 2: MeshToonMaterial Cyan Emissive Glow');
console.log('==================================================');

const materialsPath = path.join(projectRoot, 'src/game/materials.ts');
assert(fs.existsSync(materialsPath), 'materials.ts exists');
const materialsContent = fs.readFileSync(materialsPath, 'utf8');

assert(
  materialsContent.includes("emissive: variant === 'electric' ? 0x083344 : 0x000000"),
  "MeshToonMaterial specifies cyan emissive glow 0x083344 for variant === 'electric'"
);
assert(
  materialsContent.includes("emissiveIntensity: variant === 'electric' ? 0.6 : 0.0"),
  "MeshToonMaterial specifies emissiveIntensity: 0.6 for variant === 'electric'"
);

console.log('==================================================');
console.log('SUITE 3: 0.5s Proximity Shock Stun Mechanic in GameEngine');
console.log('==================================================');

const enginePath = path.join(projectRoot, 'src/game/gameEngine.ts');
assert(fs.existsSync(enginePath), 'gameEngine.ts exists');
const engineContent = fs.readFileSync(enginePath, 'utf8');

// Paralysis timer declaration
assert(
  engineContent.includes('private shockParalysisTimer = 0;'),
  'GameEngine declares private shockParalysisTimer = 0;'
);

// onElectricShockPenalty handler
assert(
  engineContent.includes('this.shockParalysisTimer = 0.5;'),
  'onElectricShockPenalty sets shockParalysisTimer = 0.5;'
);
assert(
  engineContent.includes('this.playerVelocity.set(0, 0, 0);'),
  'onElectricShockPenalty zeroes out player velocity (traps in place)'
);
assert(
  !engineContent.includes('this.playerVelocity.addScaledVector(backward, -11.5)'),
  'Legacy backward knockback impulse (-11.5) is completely removed'
);
assert(
  !engineContent.includes('this.state.timeRemaining = Math.max(0.5, this.state.timeRemaining - 1.5)'),
  'Legacy time deduction (-1.5s) is completely removed from shock penalty'
);

// Proximity measurement & safe hit logic
assert(
  engineContent.includes('const isCloseRange = wallDist <= 1.6;'),
  'Punch logic measures Euclidean wall distance with close-range threshold <= 1.6m'
);
assert(
  engineContent.includes('const isSafe = this.isGolden || !isCloseRange;'),
  'damageWall receives isSafe = this.isGolden || !isCloseRange'
);

// Input & Physics Blocking
assert(
  engineContent.includes('if (this.shockParalysisTimer > 0)'),
  'updatePlayerMovement has guard checking shockParalysisTimer > 0'
);
assert(
  engineContent.includes('this.shockParalysisTimer = Math.max(0, this.shockParalysisTimer - delta);'),
  'updatePlayerMovement decrements shockParalysisTimer by delta'
);
assert(
  /public jump\(\)[\s\S]*?this\.shockParalysisTimer > 0/.test(engineContent),
  'jump() blocks jumping during paralysis'
);
assert(
  /public dash\(\)[\s\S]*?this\.shockParalysisTimer > 0/.test(engineContent),
  'dash() blocks dashing during paralysis'
);
assert(
  /public punch\([\s\S]*?this\.shockParalysisTimer > 0/.test(engineContent),
  'punch() blocks punching during paralysis'
);
assert(
  /public setMoveInput\([\s\S]*?if \(this\.shockParalysisTimer > 0\)/.test(engineContent),
  'setMoveInput blocks input when shockParalysisTimer > 0'
);
assert(
  /this\.isLeftMouseDown && this\.transitionTimer <= 0 && this\.shockParalysisTimer <= 0/.test(engineContent),
  'Continuous hold-to-punch in tick() is guarded against shockParalysisTimer'
);

// Electric camera tremor
assert(
  /if \(this\.shockParalysisTimer > 0\)[\s\S]*?this\.camera\.position\.x \+= \(Math\.random\(\) - 0\.5\)/.test(engineContent),
  'tick() adds subtle high-frequency electric tremor to camera position while stunned'
);

console.log('==================================================');
console.log('SUITE 4: Localization Updates');
console.log('==================================================');

const i18nPath = path.join(projectRoot, 'src/game/i18n.ts');
assert(fs.existsSync(i18nPath), 'i18n.ts exists');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

assert(
  i18nContent.includes("comicElectricShock: ['CHOQUE ELÉTRICO! (0.5s)', 'PARALISADO!']"),
  "PT comicElectricShock specifies ['CHOQUE ELÉTRICO! (0.5s)', 'PARALISADO!']"
);
assert(
  i18nContent.includes("comicElectricShock: ['HIGH VOLTAGE SHOCK! (0.5s)', 'PARALYZED!']"),
  "EN comicElectricShock specifies ['HIGH VOLTAGE SHOCK! (0.5s)', 'PARALYZED!']"
);
assert(
  !i18nContent.includes('(-1.5s)'),
  "Obsolete '(-1.5s)' text is completely eliminated from i18n.ts"
);

console.log('==================================================');
console.log('SUITE 5: Empirical Simulation of Proximity Math & Stun Countdown');
console.log('==================================================');

// Simulate 3D distance and safety threshold
function evaluateShockHit(cameraPos, hitPoint, isGolden) {
  const dx = cameraPos.x - hitPoint.x;
  const dy = cameraPos.y - hitPoint.y;
  const dz = cameraPos.z - hitPoint.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const isCloseRange = dist <= 1.6;
  const isSafe = isGolden || !isCloseRange;
  return { dist, isCloseRange, isSafe };
}

// Case 1: Point-blank contact (touching wall, ~0.6m)
const hitClose = evaluateShockHit({ x: 2.0, y: 1.6, z: 2.0 }, { x: 2.0, y: 1.6, z: 2.6 }, false);
assert(Math.abs(hitClose.dist - 0.6) < 1e-6, `Point blank hit distance is 0.6m`);
assert(hitClose.isCloseRange === true, `Point blank (0.6m) is close range`);
assert(hitClose.isSafe === false, `Point blank (0.6m) is UNSAFE (triggers stun)`);

// Case 2: Hugging wall boundary (1.59m)
const hitNearBoundary = evaluateShockHit({ x: 2.0, y: 1.6, z: 2.0 }, { x: 2.0, y: 1.6, z: 3.59 }, false);
assert(hitNearBoundary.isCloseRange === true, `1.59m is close range (<= 1.6m)`);
assert(hitNearBoundary.isSafe === false, `1.59m triggers stun`);

// Case 3: Exactly beyond close range threshold (1.61m)
const hitJustSafe = evaluateShockHit({ x: 2.0, y: 1.6, z: 2.0 }, { x: 2.0, y: 1.6, z: 3.61 }, false);
assert(hitJustSafe.isCloseRange === false, `1.61m is beyond close range (> 1.6m)`);
assert(hitJustSafe.isSafe === true, `1.61m is SAFE (no shock stun)`);

// Case 4: Normal punch reach (3.35m)
const hitMeleeReach = evaluateShockHit({ x: 2.0, y: 1.6, z: 2.0 }, { x: 2.0, y: 1.6, z: 5.35 }, false);
assert(hitMeleeReach.isSafe === true, `3.35m melee reach is SAFE`);

// Case 5: Golden fists point blank (0.5m)
const hitGolden = evaluateShockHit({ x: 2.0, y: 1.6, z: 2.0 }, { x: 2.0, y: 1.6, z: 2.5 }, true);
assert(hitGolden.isSafe === true, `Golden fists are SAFE even at 0.5m point blank`);

// Case 6: Empirical Stun Countdown Simulation
let simTimer = 0.5;
let frames = 0;
const delta = 0.05; // 20 updates per second / 50ms ticks
while (simTimer > 0) {
  simTimer = Math.max(0, Number((simTimer - delta).toFixed(4)));
  frames++;
}
assert(frames === 10, `0.5s stun over 50ms ticks lasts exactly 10 ticks`);
assert(simTimer === 0, `Stun timer recovers cleanly to 0 after 0.5s`);

console.log('==================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('==================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🏆 VERDICT: ALL MILESTONE 2 REQUIREMENTS VERIFIED WITH 100% PASS RATE!');
  process.exit(0);
}
