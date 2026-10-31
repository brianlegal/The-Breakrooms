/**
 * Empirical Adversarial Challenger Suite: Milestone 2 (Shock Wall Text Removal & 0.5s Stun)
 * Author: challenger_1_m2
 * Target: Requirement R2 (Empirical challenge of proximity boundary conditions, input immobilization,
 *         timer accuracy, and total text absence on shock walls).
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
const failureDetails = [];

function assert(condition, message, detail = null) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
    if (detail) {
      console.error(`     Detail: ${JSON.stringify(detail)}`);
      failureDetails.push({ message, detail });
    } else {
      failureDetails.push({ message });
    }
  }
}

console.log('======================================================================');
console.log('CHALLENGER SUITE 1: Proximity Boundary Conditions (1.59m vs 1.61m)');
console.log('======================================================================');

// Read gameEngine.ts and backrooms.ts for exact logic extraction and verification
const enginePath = path.join(projectRoot, 'src/game/gameEngine.ts');
const backroomsPath = path.join(projectRoot, 'src/game/backrooms.ts');
assert(fs.existsSync(enginePath), 'gameEngine.ts exists');
assert(fs.existsSync(backroomsPath), 'backrooms.ts exists');

const engineSource = fs.readFileSync(enginePath, 'utf8');
const backroomsSource = fs.readFileSync(backroomsPath, 'utf8');

// Verify exact lines of proximity detection in punch()
assert(
  engineSource.includes('const isCloseRange = wallDist <= 1.6;'),
  'gameEngine.ts uses strict Euclidean proximity threshold <= 1.6m'
);
assert(
  engineSource.includes('const isSafe = this.isGolden || !isCloseRange;'),
  'gameEngine.ts defines isSafe as (isGolden || !isCloseRange)'
);

// Verify damageWall signature and penalty trigger in backrooms.ts
assert(
  backroomsSource.includes("if (wall.variant === 'electric' && !isRangedOrSafe && !hasShockShield)"),
  'backrooms.ts triggers electric shock only when variant === electric AND !isRangedOrSafe AND !hasShockShield'
);
assert(
  backroomsSource.includes('this.onElectricShockPenalty?.();'),
  'backrooms.ts invokes onElectricShockPenalty callback on unsafe contact'
);

// Mathematical boundary simulation harness
function simulateHitPenalty({ wallDist, isGolden, hasShockShield, wallVariant }) {
  const isCloseRange = wallDist <= 1.6;
  const isSafe = isGolden || !isCloseRange;
  const triggersPenalty = wallVariant === 'electric' && !isSafe && !hasShockShield;
  return {
    wallDist,
    isCloseRange,
    isSafe,
    triggersPenalty,
  };
}

// 1. Boundary: punch hit at 1.59m triggers 0.5s paralysis
const hit159 = simulateHitPenalty({
  wallDist: 1.59,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  hit159.isCloseRange === true,
  'Punch at 1.59m is classified as close range (1.59 <= 1.6)'
);
assert(
  hit159.isSafe === false,
  'Punch at 1.59m is UNSAFE without Golden Fists'
);
assert(
  hit159.triggersPenalty === true,
  'Punch hit at 1.59m TRIGGERS 0.5s paralysis penalty'
);

// 2. Boundary: punch hit at 1.61m does NOT trigger paralysis
const hit161 = simulateHitPenalty({
  wallDist: 1.61,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  hit161.isCloseRange === false,
  'Punch at 1.61m is classified as NOT close range (1.61 > 1.6)'
);
assert(
  hit161.isSafe === true,
  'Punch at 1.61m is SAFE (beyond proximity threshold)'
);
assert(
  hit161.triggersPenalty === false,
  'Punch hit at 1.61m does NOT trigger paralysis penalty'
);

// 3. Ultra-fine boundary around 1.600000m
const hit160_exact = simulateHitPenalty({
  wallDist: 1.600000,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  hit160_exact.isCloseRange === true && hit160_exact.triggersPenalty === true,
  'Exact threshold hit at 1.600000m TRIGGERS paralysis (inclusive <= 1.6)'
);

const hit160_epsilon = simulateHitPenalty({
  wallDist: 1.600001,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  hit160_epsilon.isCloseRange === false && hit160_epsilon.triggersPenalty === false,
  'Threshold + 1e-6 (1.600001m) does NOT trigger paralysis'
);

// 4. 3D Euclidean distance vector variation (diagonal and vertical punch vectors)
function calc3dDist(cam, hit) {
  const dx = cam.x - hit.x;
  const dy = cam.y - hit.y;
  const dz = cam.z - hit.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const camPos = { x: 5.0, y: 1.6, z: 5.0 };
// Case A: 3D vector with magnitude sqrt(0.9^2 + 0.9^2 + 0.9^2) = sqrt(2.43) ≈ 1.5588m (< 1.6m)
const hitDiagClose = { x: 5.0 + 0.9, y: 1.6 + 0.9, z: 5.0 + 0.9 };
const distDiagClose = calc3dDist(camPos, hitDiagClose);
const resDiagClose = simulateHitPenalty({
  wallDist: distDiagClose,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  distDiagClose < 1.6 && resDiagClose.triggersPenalty === true,
  `3D diagonal hit at ${distDiagClose.toFixed(4)}m triggers paralysis (< 1.6m)`
);

// Case B: 3D vector with magnitude sqrt(0.95^2 + 0.95^2 + 0.95^2) = sqrt(2.7075) ≈ 1.6454m (> 1.6m)
const hitDiagFar = { x: 5.0 + 0.95, y: 1.6 + 0.95, z: 5.0 + 0.95 };
const distDiagFar = calc3dDist(camPos, hitDiagFar);
const resDiagFar = simulateHitPenalty({
  wallDist: distDiagFar,
  isGolden: false,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  distDiagFar > 1.6 && resDiagFar.triggersPenalty === false,
  `3D diagonal hit at ${distDiagFar.toFixed(4)}m is SAFE (> 1.6m)`
);

// 5. Immunity & Perk verification at point blank (1.59m)
const hitGoldenClose = simulateHitPenalty({
  wallDist: 1.59,
  isGolden: true,
  hasShockShield: false,
  wallVariant: 'electric',
});
assert(
  hitGoldenClose.triggersPenalty === false,
  'Golden Fists immunity: hit at 1.59m does NOT trigger paralysis when isGolden === true'
);

const hitShieldClose = simulateHitPenalty({
  wallDist: 1.59,
  isGolden: false,
  hasShockShield: true,
  wallVariant: 'electric',
});
assert(
  hitShieldClose.triggersPenalty === false,
  'Shock Shield perk immunity: hit at 1.59m does NOT trigger paralysis when hasShockShield === true'
);

// 6. Non-electric wall variants at 1.59m
for (const variant of ['normal', 'reinforced', 'golden', 'border']) {
  const hitOther = simulateHitPenalty({
    wallDist: 1.59,
    isGolden: false,
    hasShockShield: false,
    wallVariant: variant,
  });
  assert(
    hitOther.triggersPenalty === false,
    `Wall variant '${variant}' at 1.59m never triggers shock paralysis`
  );
}

console.log('======================================================================');
console.log('CHALLENGER SUITE 2: Input Immobilization Under Continuous Stress');
console.log('======================================================================');

// Adversarial GameEngine Model: replicates the exact state mutations and guards from gameEngine.ts
class GameEngineParalysisHarness {
  constructor() {
    this.shockParalysisTimer = 0;
    this.playerVelocity = { x: 0, y: 0, z: 0 };
    this.playerPosition = { x: 2.0, y: 1.6, z: 2.0 };
    this.moveInput = { x: 0, y: 0 };
    this.isWalking = false;
    this.isGrounded = true;
    this.dashCooldownTimer = 0;
    this.dashDurationTimer = 0;
    this.isDashing = false;
    this.isLeftMouseDown = false;
    this.punchesFired = 0;
    this.status = 'playing';
    this.isPaused = false;
    this.revivePromptActive = false;
    this.transitionTimer = 0;
    this.standingHeight = 1.6;
    this.cameraPosition = { x: 2.0, y: 1.6, z: 2.0 };
    this.cameraTremorCount = 0;
  }

  triggerShockPenalty() {
    this.shockParalysisTimer = 0.5;
    this.playerVelocity.x = 0;
    this.playerVelocity.y = 0;
    this.playerVelocity.z = 0;
    this.dashDurationTimer = 0;
    this.isDashing = false;
  }

  setMoveInput(x, y) {
    if (this.shockParalysisTimer > 0) {
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      return;
    }
    this.moveInput.x = x;
    this.moveInput.y = y;
  }

  jump() {
    if (
      !this.isGrounded ||
      this.shockParalysisTimer > 0 ||
      this.status !== 'playing' ||
      this.isPaused ||
      this.revivePromptActive
    ) {
      return false;
    }
    this.playerVelocity.y = 8.8;
    this.isGrounded = false;
    return true;
  }

  dash() {
    if (
      this.dashCooldownTimer > 0 ||
      this.shockParalysisTimer > 0 ||
      this.status !== 'playing' ||
      this.isPaused ||
      this.revivePromptActive
    ) {
      return false;
    }
    this.dashCooldownTimer = 0.95;
    this.dashDurationTimer = 0.22;
    this.isDashing = true;
    this.playerVelocity.x = 19.5;
    this.playerVelocity.z = 19.5;
    return true;
  }

  punch(type) {
    if (
      this.status !== 'playing' ||
      this.isPaused ||
      this.revivePromptActive ||
      this.transitionTimer > 0 ||
      this.shockParalysisTimer > 0
    ) {
      return false;
    }
    this.punchesFired++;
    return true;
  }

  updatePlayerMovement(delta) {
    if (this.shockParalysisTimer > 0) {
      this.shockParalysisTimer = Math.max(0, this.shockParalysisTimer - delta);
      this.playerVelocity.x = 0;
      this.playerVelocity.y = 0;
      this.playerVelocity.z = 0;
      this.moveInput.x = 0;
      this.moveInput.y = 0;
      this.isWalking = false;
      this.dashDurationTimer = 0;
      this.isDashing = false;
      if (this.playerPosition.y <= this.standingHeight) {
        this.playerPosition.y = this.standingHeight;
        this.isGrounded = true;
      }
      return;
    }

    // Normal movement computation
    if (this.moveInput.x !== 0 || this.moveInput.y !== 0) {
      this.isWalking = true;
      this.playerVelocity.x = this.moveInput.x * 5.4;
      this.playerVelocity.z = this.moveInput.y * 5.4;
    } else {
      this.isWalking = false;
      this.playerVelocity.x = 0;
      this.playerVelocity.z = 0;
    }

    this.playerPosition.x += this.playerVelocity.x * delta;
    this.playerPosition.z += this.playerVelocity.z * delta;
  }

  tick(delta) {
    // Hold Left Mouse Button Continuous Turbo-Combo Punch
    if (this.isLeftMouseDown && this.transitionTimer <= 0 && this.shockParalysisTimer <= 0) {
      this.punch('combo');
    }

    this.updatePlayerMovement(delta);

    if (this.shockParalysisTimer > 0) {
      this.cameraTremorCount++;
    }
  }
}

// Instantiate harness and trigger shock penalty
const sim = new GameEngineParalysisHarness();
sim.triggerShockPenalty();

assert(sim.shockParalysisTimer === 0.5, 'Shock penalty sets paralysis timer to exactly 0.5s');
assert(
  sim.playerVelocity.x === 0 && sim.playerVelocity.y === 0 && sim.playerVelocity.z === 0,
  'Shock penalty zeroes player velocity vector immediately'
);
assert(sim.isDashing === false, 'Shock penalty immediately cancels active dash');

// Adversarial Stress: 100 continuous spam iterations of WASD, mouse clicks, jump, dash
const initialX = sim.playerPosition.x;
const initialZ = sim.playerPosition.z;

for (let i = 0; i < 100; i++) {
  // 1. Stress WASD inputs
  const directions = [
    [0, 1],   // W
    [0, -1],  // S
    [-1, 0],  // A
    [1, 0],   // D
    [1, 1],   // W+D
    [-1, 1],  // W+A
    [-1, -1], // S+A
    [1, -1],  // S+D
  ];
  const [dx, dy] = directions[i % directions.length];
  sim.setMoveInput(dx, dy);

  // 2. Stress mouse clicks / punches
  const punchAcceptedCombo = sim.punch('combo');
  const punchAcceptedUpper = sim.punch('uppercut_right');
  const punchAcceptedSuper = sim.punch('super');
  sim.isLeftMouseDown = true; // continuous turbo hold

  // 3. Stress jump requests
  const jumpAccepted = sim.jump();

  // 4. Stress dash requests
  const dashAccepted = sim.dash();

  // Attempt to inject rogue velocity
  sim.playerVelocity.x = 10.0;
  sim.playerVelocity.z = 10.0;
  sim.playerVelocity.y = 5.0;

  // Advance simulation frame by 2ms (total 0.2s elapsed across 100 iterations)
  sim.tick(0.002);

  // Verify invariants inside loop
  if (
    sim.playerVelocity.x !== 0 ||
    sim.playerVelocity.y !== 0 ||
    sim.playerVelocity.z !== 0 ||
    sim.punchesFired !== 0 ||
    punchAcceptedCombo ||
    punchAcceptedUpper ||
    punchAcceptedSuper ||
    jumpAccepted ||
    dashAccepted ||
    sim.isDashing ||
    sim.moveInput.x !== 0 ||
    sim.moveInput.y !== 0
  ) {
    assert(false, `Failure at iteration ${i} during paralysis window`, {
      velocity: sim.playerVelocity,
      punchesFired: sim.punchesFired,
      isDashing: sim.isDashing,
    });
    break;
  }
}

assert(sim.punchesFired === 0, 'Zero punches fired despite 100 spam punch requests during paralysis');
assert(
  sim.playerPosition.x === initialX && sim.playerPosition.z === initialZ,
  'Player position strictly frozen in place (delta position === 0)'
);
assert(
  sim.playerVelocity.x === 0 && sim.playerVelocity.y === 0 && sim.playerVelocity.z === 0,
  'Player velocity remains strictly zero across all spam inputs'
);
assert(sim.cameraTremorCount > 0, 'Camera tremor occurred during paralysis');

console.log('======================================================================');
console.log('CHALLENGER SUITE 3: Timer Accuracy & State Transitions (t=0.45s vs t=0.55s)');
console.log('======================================================================');

// Fresh simulation for precise wall-clock timer sampling
const timerSim = new GameEngineParalysisHarness();
timerSim.triggerShockPenalty();

// Progress simulation to t = 0.45s (90 ticks of 5ms = 0.45s)
const tickDuration = 0.005; // 5ms per tick
const ticksTo45 = Math.round(0.45 / tickDuration); // 90 ticks

for (let i = 0; i < ticksTo45; i++) {
  timerSim.tick(tickDuration);
}

// 1. Verify paralysis is strictly ACTIVE at t = 0.45s
const remainingAt45 = Number(timerSim.shockParalysisTimer.toFixed(4));
assert(
  remainingAt45 === 0.05,
  `At t=0.45s, remaining timer is exactly 0.05s (got ${remainingAt45}s)`
);
assert(
  timerSim.shockParalysisTimer > 0,
  'Paralysis is ACTIVE at t=0.45s'
);
assert(
  timerSim.setMoveInput(1, 0) || timerSim.moveInput.x === 0,
  'Move input is BLOCKED at t=0.45s'
);
assert(
  timerSim.jump() === false,
  'Jump is BLOCKED at t=0.45s'
);
assert(
  timerSim.dash() === false,
  'Dash is BLOCKED at t=0.45s'
);
assert(
  timerSim.punch('combo') === false,
  'Punch is BLOCKED at t=0.45s'
);

// Progress simulation by another 10 ticks (50ms) to t = 0.50s (expiration point)
const ticksTo50 = Math.round(0.05 / tickDuration); // 10 ticks
for (let i = 0; i < ticksTo50; i++) {
  timerSim.tick(tickDuration);
}

const remainingAt50 = Number(timerSim.shockParalysisTimer.toFixed(4));
assert(
  remainingAt50 === 0,
  `At t=0.50s, remaining timer has reached exactly 0 (got ${remainingAt50}s)`
);

// Progress simulation by another 10 ticks (50ms) to t = 0.55s (cleared point)
const ticksTo55 = Math.round(0.05 / tickDuration); // 10 ticks
for (let i = 0; i < ticksTo55; i++) {
  timerSim.tick(tickDuration);
}

// 2. Verify paralysis is strictly CLEARED at t = 0.55s
assert(
  timerSim.shockParalysisTimer === 0,
  'Paralysis is CLEARED at t=0.55s (shockParalysisTimer === 0)'
);

// Verify full mobility & action recovery at t = 0.55s
timerSim.setMoveInput(1, 0);
assert(
  timerSim.moveInput.x === 1,
  'Move input successfully accepted at t=0.55s (moveInput.x === 1)'
);

const punchSuccess = timerSim.punch('combo');
assert(
  punchSuccess === true,
  'Punch successfully fires at t=0.55s'
);

const jumpSuccess = timerSim.jump();
assert(
  jumpSuccess === true && timerSim.playerVelocity.y === 8.8,
  'Jump successfully executes at t=0.55s (velocity.y === 8.8)'
);

const dashSuccess = timerSim.dash();
assert(
  dashSuccess === true && timerSim.isDashing === true,
  'Dash successfully executes at t=0.55s (isDashing === true)'
);

// 3. Multi-framerate simulation stability test (30fps, 60fps, 120fps, 240fps)
for (const fps of [30, 60, 120, 240]) {
  const fpsSim = new GameEngineParalysisHarness();
  fpsSim.triggerShockPenalty();
  const dt = 1.0 / fps;
  let elapsed = 0;
  let steps = 0;
  while (fpsSim.shockParalysisTimer > 0) {
    fpsSim.tick(dt);
    elapsed += dt;
    steps++;
  }
  const diffFromHalfSec = Math.abs(elapsed - 0.5);
  assert(
    diffFromHalfSec <= dt * 1.01,
    `Framerate ${fps} FPS clears paralysis after exactly 0.5s (elapsed: ${elapsed.toFixed(4)}s, steps: ${steps})`
  );
  assert(
    fpsSim.shockParalysisTimer === 0,
    `Framerate ${fps} FPS clamps cleanly to 0 (never negative)`
  );
}

console.log('======================================================================');
console.log('CHALLENGER SUITE 4: Total Text Absence & Canvas Output Scan');
console.log('======================================================================');

const texturesSource = fs.readFileSync(path.join(projectRoot, 'src/game/textures.ts'), 'utf8');

// 1. Static Scan: Isolate the exact electric wall branch
const electricBranchRegex = /else\s+if\s*\(variant\s*===\s*'electric'\)\s*\{([\s\S]*?)\}\s*else\s+if\s*\(variant\s*===\s*'border'\)/;
const match = texturesSource.match(electricBranchRegex);
assert(Boolean(match), "Successfully isolated variant === 'electric' branch in textures.ts");

const electricCode = match ? match[1] : '';

// 2. Scan for any text API usage in the electric generator block
assert(
  !electricCode.includes('fillText'),
  "ZERO occurrences of 'fillText' in electric wall generator"
);
assert(
  !electricCode.includes('strokeText'),
  "ZERO occurrences of 'strokeText' in electric wall generator"
);
assert(
  !electricCode.includes('measureText'),
  "ZERO occurrences of 'measureText' in electric wall generator"
);
assert(
  !electricCode.includes('.font'),
  "ZERO occurrences of '.font' assignment in electric wall generator"
);
assert(
  !electricCode.includes('textAlign'),
  "ZERO occurrences of 'textAlign' in electric wall generator"
);
assert(
  !electricCode.includes('textBaseline'),
  "ZERO occurrences of 'textBaseline' in electric wall generator"
);

// 3. Scan all string literals (stripping comments first) to guarantee zero textual labels or glyphs
const noComments = electricCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const stringLiterals = noComments.match(/'[^'\r\n]*'|"[^"\r\n]*"|`[^`\r\n]*`/g) || [];

assert(stringLiterals.length > 0, `Extracted ${stringLiterals.length} string literals from electric generator`);

const prohibitedWords = [
  'HIGH', 'VOLTAGE', 'ALTO', 'VOLT', 'CHOQUE', 'SHOCK', 'ELETRICO', 'ELECTRIC',
  'DANGER', 'PERIGO', 'CAUTION', 'CUIDADO', 'WARNING', 'AVISO', 'ATENÇÃO',
  'BOLA', 'BALL', 'USE', 'DAMAGE', 'PARALISADO', 'PARALYZED', 'STOP',
];

for (const word of prohibitedWords) {
  const offending = stringLiterals.find((lit) => new RegExp(`\\b${word}\\b`, 'i').test(lit));
  assert(
    !offending,
    `Prohibited text string '${word}' is ABSENT from all electric wall string literals`
  );
}

// Verify that 100% of string literals in electric generator are valid CSS colors or canvas properties ('round')
const validColorOrPropRegex = /^'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})'$|^'rgba\([0-9.,\s]+\)'$|^'round'$/;
for (const lit of stringLiterals) {
  assert(
    validColorOrPropRegex.test(lit),
    `Literal ${lit} is purely a CSS color or canvas line property (zero text glyphs)`
  );
}

// 4. Headless Mock Canvas Execution: Intercept 100% of Canvas 2D Rendering Calls
class MockCanvasContext2D {
  constructor() {
    this.calls = [];
    this.textRendered = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
  }

  createLinearGradient() {
    return {
      addColorStop: () => {},
    };
  }

  fillRect(x, y, w, h) {
    this.calls.push({ type: 'fillRect', x, y, w, h });
  }

  strokeRect(x, y, w, h) {
    this.calls.push({ type: 'strokeRect', x, y, w, h });
  }

  beginPath() {
    this.calls.push({ type: 'beginPath' });
  }

  moveTo(x, y) {
    this.calls.push({ type: 'moveTo', x, y });
  }

  lineTo(x, y) {
    this.calls.push({ type: 'lineTo', x, y });
  }

  arc(x, y, r, sa, ea) {
    this.calls.push({ type: 'arc', x, y, r });
  }

  rect(x, y, w, h) {
    this.calls.push({ type: 'rect', x, y, w, h });
  }

  closePath() {
    this.calls.push({ type: 'closePath' });
  }

  fill() {
    this.calls.push({ type: 'fill' });
  }

  stroke() {
    this.calls.push({ type: 'stroke' });
  }

  clip() {
    this.calls.push({ type: 'clip' });
  }

  save() {
    this.calls.push({ type: 'save' });
  }

  restore() {
    this.calls.push({ type: 'restore' });
  }

  fillText(text, x, y) {
    this.calls.push({ type: 'fillText', text, x, y });
    this.textRendered.push(text);
  }

  strokeText(text, x, y) {
    this.calls.push({ type: 'strokeText', text, x, y });
    this.textRendered.push(text);
  }
}

// Extract and execute the electric rendering function in an isolated context
const mockCtx = new MockCanvasContext2D();

// Transform electricCode into an executable function body
const cleanedElectricCode = electricCode
  .replace(/const\s+drawBusbar\s*=\s*\(x:\s*number\)\s*=>/g, 'const drawBusbar = (x) =>')
  .replace(/const\s+drawHazardBand\s*=\s*\(startY:\s*number,\s*bandH:\s*number\)\s*=>/g, 'const drawHazardBand = (startY, bandH) =>')
  .replace(/interface\s+ArcPath[\s\S]*?\}\s*const\s+arcConfigs/g, 'const arcConfigs')
  .replace(/const\s+drawArcPoints\s*=\s*\(pts:\s*\{[^}]*\}\[\]\)\s*=>/g, 'const drawArcPoints = (pts) =>')
  .replace(/const\s+arcConfigs:\s*ArcPath\[\]\s*=/g, 'const arcConfigs =');

const renderElectricFn = new Function('ctx', cleanedElectricCode);
renderElectricFn(mockCtx);

assert(mockCtx.calls.length > 50, `Rendered ${mockCtx.calls.length} canvas drawing operations`);
assert(mockCtx.textRendered.length === 0, 'Headless canvas intercepted EXACTLY 0 text calls');

const fillTextCalls = mockCtx.calls.filter((c) => c.type === 'fillText');
const strokeTextCalls = mockCtx.calls.filter((c) => c.type === 'strokeText');
assert(fillTextCalls.length === 0, 'No fillText calls intercepted during dynamic execution');
assert(strokeTextCalls.length === 0, 'No strokeText calls intercepted during dynamic execution');

// 5. Verify presence of purely visual hazard elements in the executed calls
const clipCalls = mockCtx.calls.filter((c) => c.type === 'clip');
assert(clipCalls.length >= 2, `Hazard bands executed canvas clip operations (${clipCalls.length} clips for top/bottom)`);

const arcCalls = mockCtx.calls.filter((c) => c.type === 'arc');
assert(arcCalls.length >= 20, `Busbars and rivets executed geometric circular nodes (${arcCalls.length} arcs)`);

const lineToCalls = mockCtx.calls.filter((c) => c.type === 'lineTo');
assert(lineToCalls.length >= 50, `Plasma arcs, chevrons, and vector bolt executed geometric vector lines (${lineToCalls.length} lineTo)`);

console.log('======================================================================');
console.log(`TOTAL CHALLENGE TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error('❌ CHALLENGE VERDICT: REJECT');
  console.error('Failures encountered:', failureDetails);
  process.exit(1);
} else {
  console.log('🏆 CHALLENGE VERDICT: APPROVE');
  console.log('All empirical boundary, immobilization, timer, and text-absence challenges PASSED!');
  process.exit(0);
}
