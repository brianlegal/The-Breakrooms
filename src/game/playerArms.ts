import * as THREE from 'three';
import { materialFactory } from './materials';
import { GloveSkinId } from './progression';

export type PunchState =
  | 'idle'
  | 'left'
  | 'right'
  | 'hook_left'
  | 'uppercut_right'
  | 'super'
  | 'throw';

export type PunchType =
  | 'left'
  | 'right'
  | 'hook_left'
  | 'uppercut_right'
  | 'super'
  | 'throw';

interface FingerJointRig {
  baseGroup: THREE.Group;
  proximalJoint: THREE.Group;
  middleJoint: THREE.Group;
  distalJoint: THREE.Group;
  isThumb: boolean;
  spreadAngle: number;
}

interface SkeletalArmRig {
  side: 'left' | 'right';
  sign: number; // -1 for left, +1 for right
  shoulderPivot: THREE.Group;
  upperArmGroup: THREE.Group;
  bicepMesh: THREE.Mesh;
  elbowPivot: THREE.Group;
  forearmGroup: THREE.Group;
  wristPivot: THREE.Group;
  handGroup: THREE.Group;
  fingers: FingerJointRig[];
  gloveMeshes: THREE.Mesh[];
  impactStreak: THREE.Mesh;
  chargeAura: THREE.Mesh;
}

/**
 * Hierarchical 3D Skeletal Arm Rig with:
 * - +55% Oversized Armored Brawler Gauntlets & Extended Forearm Cuffs (fixes FOV 105° perspective distortion!)
 * - Upward-tilted Knuckle Impact Pitch (`wristRotX` +0.06 to +0.14) so brass knuckle studs face the camera on impact!
 * - 4-Hit Boxing Combo Animations: Left Jab -> Right Cross -> Left Hook -> Right Uppercut + Super Smash + Ball Throw
 * - Real-time Unlockable 3D Glove Skins ('classic_red', 'cyber_neon', 'mecha_chrome', 'lava_magma', 'void_matter')
 */
export class PlayerArms {
  public group: THREE.Group;
  private leftRig: SkeletalArmRig;
  private rightRig: SkeletalArmRig;

  public state: PunchState = 'idle';
  private punchTimer = 0;
  private punchDuration = 0.24;
  private bobTimer = 0;
  private swayX = 0;
  private swayY = 0;
  private chargeRatio = 0;

  // Held ball state (0 = closed fist, 1 = cupping ball in palms with fingers over top circumference)
  private isHoldingBall = false;
  private ballHoldBlend = 0;
  private heldBallVisual: THREE.Group;
  private heldBallCore: THREE.Mesh;
  private heldBallRing: THREE.Mesh;

  // Speed multiplier, skin & powerup state
  private speedMultiplier = 1.0;
  private armScale = 1.0;
  private readonly baseGloveScale = 1.55; // +55% massive brawler gauntlet scale!
  private isGolden = false;
  private currentSkin: GloveSkinId = 'classic_red';

  constructor() {
    this.group = new THREE.Group();

    this.leftRig = this.buildSkeletalArm('left');
    this.rightRig = this.buildSkeletalArm('right');

    // Apply +55% base gauntlet scale so the gloves are the visual protagonist in 105° FOV!
    this.leftRig.handGroup.scale.setScalar(this.baseGloveScale);
    this.rightRig.handGroup.scale.setScalar(this.baseGloveScale);

    this.group.add(this.leftRig.shoulderPivot);
    this.group.add(this.rightRig.shoulderPivot);

    // Held Ball Visual
    this.heldBallVisual = new THREE.Group();
    this.heldBallVisual.position.set(0, -0.23, -0.82);
    this.heldBallVisual.visible = false;

    const ballRadius = 0.23;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 28, 22);
    const ballMat = materialFactory.getBallMaterial();
    this.heldBallCore = new THREE.Mesh(ballGeo, ballMat);
    this.heldBallCore.add(materialFactory.createOutlineMesh(ballGeo, 0.02, 0x000000, 0xffffff));
    this.heldBallVisual.add(this.heldBallCore);

    const ringGeo = new THREE.TorusGeometry(ballRadius * 1.02, 0.013, 10, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.9,
    });
    this.heldBallRing = new THREE.Mesh(ringGeo, ringMat);
    this.heldBallRing.rotation.x = Math.PI * 0.18;
    this.heldBallVisual.add(this.heldBallRing);

    this.group.add(this.heldBallVisual);

    this.applyPoseToArm(this.leftRig, 0, 0);
    this.applyPoseToArm(this.rightRig, 0, 0);
  }

  public get root(): THREE.Group {
    return this.group;
  }

  public setSpeedMultiplier(mult: number) {
    this.speedMultiplier = Math.max(0.5, mult);
  }

  public setPunchSpeedMultiplier(mult: number) {
    this.setSpeedMultiplier(mult);
  }

  public setArmScale(scale: number) {
    this.armScale = scale;
    const handScale = this.baseGloveScale * (1 + (scale - 1) * 0.65);
    this.leftRig.handGroup.scale.setScalar(handScale);
    this.rightRig.handGroup.scale.setScalar(handScale);
  }

  public setGolden(isGolden: boolean) {
    this.isGolden = isGolden;
    this.refreshGloveMaterials();
  }

  public setSkin(skinId: GloveSkinId) {
    this.currentSkin = skinId;
    this.refreshGloveMaterials();
  }

  private refreshGloveMaterials() {
    const targetMat = materialFactory.getBoxingGloveMaterial(this.isGolden, this.currentSkin);
    for (const m of this.leftRig.gloveMeshes) m.material = targetMat;
    for (const m of this.rightRig.gloveMeshes) m.material = targetMat;
  }

  /**
   * Builds a full hierarchical skeletal arm rig with extended forearm gauntlet armor cuff
   * and +55% oversized brawler gloves!
   */
  private buildSkeletalArm(side: 'left' | 'right'): SkeletalArmRig {
    const sign = side === 'left' ? -1 : 1;

    const skinMat = materialFactory.getSkinMaterial();
    const gloveMat = materialFactory.getBoxingGloveMaterial(false, this.currentSkin);
    const darkGloveMat = materialFactory.getGlovePalmMaterial();
    const strapMat = materialFactory.getStrapMaterial();
    const goldMat = materialFactory.getGoldTrimMaterial();
    const gloveMeshes: THREE.Mesh[] = [];

    // 1. SHOULDER PIVOT
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(sign * 0.50, -0.34, -0.26);

    const upperArmGroup = new THREE.Group();
    shoulderPivot.add(upperArmGroup);

    const deltoidGeo = new THREE.SphereGeometry(0.115, 16, 14);
    deltoidGeo.scale(1.0, 0.95, 1.15);
    const deltoidMesh = new THREE.Mesh(deltoidGeo, skinMat);
    deltoidMesh.add(materialFactory.createOutlineMesh(deltoidGeo, 0.015, 0x000000, 0xffffff));
    upperArmGroup.add(deltoidMesh);

    const upperArmLen = 0.34;
    const upperArmGeo = new THREE.CylinderGeometry(0.088, 0.105, upperArmLen, 16, 4);
    upperArmGeo.rotateX(Math.PI / 2);
    upperArmGeo.translate(0, 0, -upperArmLen * 0.5);
    const upperArmMesh = new THREE.Mesh(upperArmGeo, skinMat);
    upperArmMesh.add(materialFactory.createOutlineMesh(upperArmGeo, 0.015, 0x000000, 0xffffff));
    upperArmGroup.add(upperArmMesh);

    const bicepGeo = new THREE.SphereGeometry(0.085, 14, 12);
    bicepGeo.scale(0.95, 1.15, 1.55);
    const bicepMesh = new THREE.Mesh(bicepGeo, skinMat);
    bicepMesh.position.set(-sign * 0.015, 0.038, -upperArmLen * 0.52);
    bicepMesh.add(materialFactory.createOutlineMesh(bicepGeo, 0.013, 0x000000, 0xffffff));
    upperArmGroup.add(bicepMesh);

    // 2. ELBOW PIVOT
    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, 0, -upperArmLen);
    upperArmGroup.add(elbowPivot);

    const elbowKnobGeo = new THREE.SphereGeometry(0.084, 14, 12);
    const elbowKnob = new THREE.Mesh(elbowKnobGeo, skinMat);
    elbowKnob.add(materialFactory.createOutlineMesh(elbowKnobGeo, 0.013, 0x000000, 0xffffff));
    elbowPivot.add(elbowKnob);

    const forearmGroup = new THREE.Group();
    elbowPivot.add(forearmGroup);

    const forearmLen = 0.36;
    const forearmGeo = new THREE.CylinderGeometry(0.074, 0.098, forearmLen, 18, 6);
    const fPos = forearmGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const x = fPos.getX(i);
      const y = fPos.getY(i);
      const z = fPos.getZ(i);
      const normY = (y + forearmLen * 0.5) / forearmLen;
      const muscleBell = Math.sin(normY * Math.PI) * 0.022;
      const tendonGroove = Math.cos(Math.atan2(z, x) * 2) * 0.005;
      const scale = 1 + muscleBell + tendonGroove;
      fPos.setXYZ(i, x * scale, y, z * scale);
    }
    forearmGeo.computeVertexNormals();
    forearmGeo.rotateX(Math.PI / 2);
    forearmGeo.translate(0, 0, -forearmLen * 0.5);

    const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
    forearmMesh.add(materialFactory.createOutlineMesh(forearmGeo, 0.015, 0x000000, 0xffffff));
    forearmGroup.add(forearmMesh);

    // EXTENDED FOREARM GAUNTLET SLEEVE (Covers the front 60% of the forearm so it never looks like a bare sausage!)
    const gauntletSleeveGeo = new THREE.CylinderGeometry(0.092, 0.088, 0.22, 16);
    gauntletSleeveGeo.rotateX(Math.PI / 2);
    const gauntletSleeveMesh = new THREE.Mesh(gauntletSleeveGeo, gloveMat);
    gauntletSleeveMesh.position.set(0, 0, -forearmLen + 0.10);
    gauntletSleeveMesh.add(
      materialFactory.createOutlineMesh(gauntletSleeveGeo, 0.014, 0x000000, 0x000000)
    );
    forearmGroup.add(gauntletSleeveMesh);
    gloveMeshes.push(gauntletSleeveMesh);

    // Athletic Combat Straps & Gold Buckles over the Forearm Gauntlet Sleeve
    for (let w = 0; w < 2; w++) {
      const wrapGeo = new THREE.CylinderGeometry(0.101, 0.101, 0.036, 16);
      wrapGeo.rotateX(Math.PI / 2);
      const wrapMesh = new THREE.Mesh(wrapGeo, w === 0 ? goldMat : strapMat);
      wrapMesh.position.set(0, 0, -forearmLen + 0.065 + w * 0.095);
      wrapMesh.add(materialFactory.createOutlineMesh(wrapGeo, 0.012, 0x000000, 0x000000));
      forearmGroup.add(wrapMesh);
    }

    // 3. WRIST PIVOT
    const wristPivot = new THREE.Group();
    wristPivot.position.set(0, 0, -forearmLen);
    forearmGroup.add(wristPivot);

    const handGroup = new THREE.Group();
    wristPivot.add(handGroup);

    // Heavy Brawler Wrist Guard Cuff overlapping wristPivot (z = +0.015) to eliminate any wrist seam!
    const cuffGeo = new THREE.CylinderGeometry(0.098, 0.092, 0.145, 16);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = new THREE.Mesh(cuffGeo, darkGloveMat);
    cuffMesh.position.set(0, 0, 0.015);
    cuffMesh.add(materialFactory.createOutlineMesh(cuffGeo, 0.013, 0x000000, 0x000000));
    handGroup.add(cuffMesh);

    const goldRingGeo = new THREE.TorusGeometry(0.096, 0.012, 10, 24);
    const goldRing = new THREE.Mesh(goldRingGeo, goldMat);
    goldRing.position.set(0, 0, -0.048);
    handGroup.add(goldRing);

    // Sculpted Dorsal Hand & Metacarpal Armor Plate
    const palmGeo = new THREE.BoxGeometry(0.21, 0.115, 0.195, 6, 4, 6);
    const pPos = palmGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      let px = pPos.getX(i);
      let py = pPos.getY(i);
      let pz = pPos.getZ(i);
      const dist = Math.sqrt(px * px + py * py + pz * pz);
      if (dist > 0.12) {
        const s = (0.12 + (dist - 0.12) * 0.62) / dist;
        px *= s;
        py *= s;
        pz *= s;
      }
      if (py > 0) {
        py += (1 - (px / 0.11) ** 2) * 0.028;
      } else {
        py += (1 - (px / 0.11) ** 2) * 0.015;
      }
      if (pz < 0) px *= 1.14;
      pPos.setXYZ(i, px, py, pz);
    }
    palmGeo.computeVertexNormals();
    const palmMesh = new THREE.Mesh(palmGeo, gloveMat);
    palmMesh.position.set(0, 0.008, -0.13);
    palmMesh.add(materialFactory.createOutlineMesh(palmGeo, 0.015, 0x000000, 0xffffff));
    handGroup.add(palmMesh);
    gloveMeshes.push(palmMesh);

    // Metallic Brass/Gold Knuckle Impact Bar + 4 Individual Pyramid Knuckle Studs!
    const knuckleBarGeo = new THREE.BoxGeometry(0.205, 0.046, 0.048, 4, 2, 2);
    const knuckleBar = new THREE.Mesh(knuckleBarGeo, goldMat);
    knuckleBar.position.set(0, 0.038, -0.218);
    knuckleBar.add(materialFactory.createOutlineMesh(knuckleBarGeo, 0.01, 0x000000, 0xffffff));
    handGroup.add(knuckleBar);

    for (const kx of [-0.072, -0.024, 0.024, 0.072]) {
      const studGeo = new THREE.OctahedronGeometry(0.022, 0);
      const studMesh = new THREE.Mesh(studGeo, goldMat);
      studMesh.position.set(kx, 0.045, -0.242);
      handGroup.add(studMesh);
    }

    // Padded Inner Palm Grip Cushion
    const gripPadGeo = new THREE.SphereGeometry(0.072, 14, 10);
    gripPadGeo.scale(1.15, 0.45, 1.05);
    const gripPad = new THREE.Mesh(gripPadGeo, darkGloveMat);
    gripPad.position.set(0, -0.035, -0.13);
    handGroup.add(gripPad);

    // 4. FIVE ARTICULATED FINGERS
    const fingers: FingerJointRig[] = [];
    const fingerSpecs = [
      { xOffset: -sign * 0.072, yOffset: 0.016, zOffset: -0.22, lengthScale: 0.96, radiusScale: 0.96, spread: -sign * 0.11 },
      { xOffset: -sign * 0.024, yOffset: 0.022, zOffset: -0.228, lengthScale: 1.06, radiusScale: 1.02, spread: -sign * 0.03 },
      { xOffset: sign * 0.024, yOffset: 0.018, zOffset: -0.222, lengthScale: 0.98, radiusScale: 0.96, spread: sign * 0.04 },
      { xOffset: sign * 0.070, yOffset: 0.008, zOffset: -0.210, lengthScale: 0.82, radiusScale: 0.86, spread: sign * 0.12 },
    ];

    for (const spec of fingerSpecs) {
      const fingerRig = this.createArticulatedFinger(
        spec.lengthScale,
        spec.radiusScale,
        spec.spread,
        false,
        gloveMat,
        darkGloveMat,
        skinMat,
        gloveMeshes
      );
      fingerRig.baseGroup.position.set(spec.xOffset, spec.yOffset, spec.zOffset);
      handGroup.add(fingerRig.baseGroup);
      fingers.push(fingerRig);
    }

    const thumbRig = this.createArticulatedFinger(
      0.90,
      1.14,
      -sign * 0.35,
      true,
      gloveMat,
      darkGloveMat,
      skinMat,
      gloveMeshes
    );
    thumbRig.baseGroup.position.set(-sign * 0.098, -0.014, -0.125);
    thumbRig.baseGroup.rotation.set(0.15, -sign * 0.48, -sign * 0.38);
    handGroup.add(thumbRig.baseGroup);
    fingers.push(thumbRig);

    // Kinetic Punch Shockcone around Fist
    const streakGeo = new THREE.ConeGeometry(0.24, 0.58, 14, 1, true);
    streakGeo.rotateX(Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const impactStreak = new THREE.Mesh(streakGeo, streakMat);
    impactStreak.position.set(0, 0, -0.26);
    handGroup.add(impactStreak);

    // Super Charge Golden Aura
    const auraGeo = new THREE.SphereGeometry(0.21, 16, 14);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.0,
      wireframe: true,
    });
    const chargeAura = new THREE.Mesh(auraGeo, auraMat);
    chargeAura.position.set(0, 0, -0.16);
    handGroup.add(chargeAura);

    return {
      side,
      sign,
      shoulderPivot,
      upperArmGroup,
      bicepMesh,
      elbowPivot,
      forearmGroup,
      wristPivot,
      handGroup,
      fingers,
      gloveMeshes,
      impactStreak,
      chargeAura,
    };
  }

  private createArticulatedFinger(
    lenScale: number,
    radScale: number,
    spreadAngle: number,
    isThumb: boolean,
    gloveMat: THREE.Material,
    darkGloveMat: THREE.Material,
    skinMat: THREE.Material,
    gloveMeshes: THREE.Mesh[]
  ): FingerJointRig {
    const baseGroup = new THREE.Group();
    const r = 0.023 * radScale;
    const l1 = 0.068 * lenScale;
    const l2 = 0.054 * lenScale;
    const l3 = 0.044 * lenScale;

    const knuckleGeo = new THREE.SphereGeometry(r * 1.22, 10, 8);
    const knuckleMesh = new THREE.Mesh(knuckleGeo, darkGloveMat);
    knuckleMesh.add(materialFactory.createOutlineMesh(knuckleGeo, 0.008, 0x000000, 0xffffff));
    baseGroup.add(knuckleMesh);

    const proximalJoint = new THREE.Group();
    baseGroup.add(proximalJoint);

    const seg1Geo = new THREE.CylinderGeometry(r * 0.92, r * 1.08, l1, 10);
    seg1Geo.rotateX(Math.PI / 2);
    seg1Geo.translate(0, 0, -l1 * 0.5);
    const seg1Mesh = new THREE.Mesh(seg1Geo, gloveMat);
    seg1Mesh.add(materialFactory.createOutlineMesh(seg1Geo, 0.009, 0x000000, 0xffffff));
    proximalJoint.add(seg1Mesh);
    gloveMeshes.push(seg1Mesh);

    const middleJoint = new THREE.Group();
    middleJoint.position.set(0, 0, -l1);
    proximalJoint.add(middleJoint);

    const pipJointGeo = new THREE.SphereGeometry(r * 0.96, 8, 8);
    const pipMesh = new THREE.Mesh(pipJointGeo, darkGloveMat);
    middleJoint.add(pipMesh);

    const seg2Geo = new THREE.CylinderGeometry(r * 0.84, r * 0.94, l2, 10);
    seg2Geo.rotateX(Math.PI / 2);
    seg2Geo.translate(0, 0, -l2 * 0.5);
    const seg2Mesh = new THREE.Mesh(seg2Geo, isThumb ? gloveMat : gloveMat);
    seg2Mesh.add(materialFactory.createOutlineMesh(seg2Geo, 0.008, 0x000000, 0xffffff));
    middleJoint.add(seg2Mesh);
    gloveMeshes.push(seg2Mesh);

    const distalJoint = new THREE.Group();
    distalJoint.position.set(0, 0, -l2);
    middleJoint.add(distalJoint);

    const seg3Geo = new THREE.CylinderGeometry(r * 0.68, r * 0.84, l3, 10);
    seg3Geo.rotateX(Math.PI / 2);
    seg3Geo.translate(0, 0, -l3 * 0.5);
    const seg3Mesh = new THREE.Mesh(seg3Geo, darkGloveMat);
    seg3Mesh.add(materialFactory.createOutlineMesh(seg3Geo, 0.008, 0x000000, 0xffffff));
    distalJoint.add(seg3Mesh);

    const tipDomeGeo = new THREE.SphereGeometry(r * 0.70, 8, 8);
    const tipDome = new THREE.Mesh(tipDomeGeo, skinMat);
    tipDome.position.set(0, 0, -l3);
    distalJoint.add(tipDome);

    return {
      baseGroup,
      proximalJoint,
      middleJoint,
      distalJoint,
      isThumb,
      spreadAngle,
    };
  }

  private poseFingers(rig: SkeletalArmRig, ballBlend: number, punchImpactSqueeze: number) {
    const sign = rig.sign;
    for (let i = 0; i < rig.fingers.length; i++) {
      const f = rig.fingers[i];

      if (f.isThumb) {
        const fistProxX = -0.58 - punchImpactSqueeze * 0.15;
        const fistProxY = sign * 0.52;
        const fistMidX = -0.82 - punchImpactSqueeze * 0.15;
        const fistDistX = -0.65;

        const ballProxX = -0.18;
        const ballProxY = sign * 0.22;
        const ballMidX = -0.35;
        const ballDistX = -0.38;

        f.proximalJoint.rotation.set(
          THREE.MathUtils.lerp(fistProxX, ballProxX, ballBlend),
          THREE.MathUtils.lerp(fistProxY, ballProxY, ballBlend),
          0
        );
        f.middleJoint.rotation.set(THREE.MathUtils.lerp(fistMidX, ballMidX, ballBlend), 0, 0);
        f.distalJoint.rotation.set(THREE.MathUtils.lerp(fistDistX, ballDistX, ballBlend), 0, 0);
      } else {
        const fistProxX = -1.52 - punchImpactSqueeze * 0.16;
        const fistMidX = -1.72 - punchImpactSqueeze * 0.14;
        const fistDistX = -1.42 - punchImpactSqueeze * 0.12;
        const fistSpreadY = f.spreadAngle * 0.12;

        const ballProxX = -0.28;
        const ballMidX = -0.54;
        const ballDistX = -0.62;
        const ballSpreadY = f.spreadAngle * 1.95;

        f.proximalJoint.rotation.set(
          THREE.MathUtils.lerp(fistProxX, ballProxX, ballBlend),
          THREE.MathUtils.lerp(fistSpreadY, ballSpreadY, ballBlend),
          0
        );
        f.middleJoint.rotation.set(THREE.MathUtils.lerp(fistMidX, ballMidX, ballBlend), 0, 0);
        f.distalJoint.rotation.set(THREE.MathUtils.lerp(fistDistX, ballDistX, ballBlend), 0, 0);
      }
    }
  }

  public setHoldingBall(holding: boolean) {
    this.isHoldingBall = holding;
    this.heldBallVisual.visible = holding;
  }

  public setCharge(ratio: number) {
    this.chargeRatio = Math.max(0, Math.min(1, ratio));
  }

  public addCameraSway(dx: number, dy: number) {
    this.swayX = THREE.MathUtils.clamp(this.swayX - dx * 0.0018, -0.07, 0.07);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.0018, -0.07, 0.07);
  }

  public punch(hand: PunchType): boolean {
    if (this.state !== 'idle') return false;
    this.state = hand;
    this.punchTimer = 0;
    const baseDur =
      hand === 'super'
        ? 0.42
        : hand === 'throw'
        ? 0.30
        : hand === 'hook_left' || hand === 'uppercut_right'
        ? 0.25
        : 0.22;
    this.punchDuration = Math.max(0.085, baseDur / Math.min(2.6, this.speedMultiplier));
    return true;
  }

  private applyPoseToArm(rig: SkeletalArmRig, bobX: number, bobY: number) {
    const sign = rig.sign;
    const b = this.ballHoldBlend;

    // 1. BASE BOXER GUARD POSE
    let shRotX = -0.54 + bobY * 0.6;
    let shRotY = -sign * 0.34 + bobX * 0.5;
    let shRotZ = sign * 0.24;

    let elbowFlexX = 1.42 + Math.sin(this.bobTimer * 2) * 0.03;
    let forearmTwistZ = sign * 0.45;

    let wristRotX = 0.12;
    let wristRotY = -sign * 0.14;
    let wristRotZ = 0;

    let shPosX = sign * 0.50 + this.swayX + bobX * 0.45;
    let shPosY = -0.34 + this.swayY + bobY * 0.55;
    let shPosZ = -0.27;

    let bicepFlex = 1.0;
    let punchSqueeze = 0.0;
    let streakOpacity = 0.0;

    // 2. BALL HOLDING POSE
    if (b > 0.001) {
      const ballShPosX = sign * 0.44 + this.swayX * 0.6;
      const ballShPosY = -0.32 + this.swayY * 0.6 + bobY * 0.35;
      const ballShPosZ = -0.30;

      const ballShRotX = -0.32;
      const ballShRotY = -sign * 0.46;
      const ballShRotZ = sign * 0.18;

      const ballElbowFlexX = 0.92;
      const ballForearmTwistZ = sign * 0.68;
      const ballWristRotX = -0.22;
      const ballWristRotY = -sign * 0.38;
      const ballWristRotZ = -sign * 0.22;

      shPosX = THREE.MathUtils.lerp(shPosX, ballShPosX, b);
      shPosY = THREE.MathUtils.lerp(shPosY, ballShPosY, b);
      shPosZ = THREE.MathUtils.lerp(shPosZ, ballShPosZ, b);

      shRotX = THREE.MathUtils.lerp(shRotX, ballShRotX, b);
      shRotY = THREE.MathUtils.lerp(shRotY, ballShRotY, b);
      shRotZ = THREE.MathUtils.lerp(shRotZ, ballShRotZ, b);

      elbowFlexX = THREE.MathUtils.lerp(elbowFlexX, ballElbowFlexX, b);
      forearmTwistZ = THREE.MathUtils.lerp(forearmTwistZ, ballForearmTwistZ, b);
      wristRotX = THREE.MathUtils.lerp(wristRotX, ballWristRotX, b);
      wristRotY = THREE.MathUtils.lerp(wristRotY, ballWristRotY, b);
      wristRotZ = THREE.MathUtils.lerp(wristRotZ, ballWristRotZ, b);
      bicepFlex = THREE.MathUtils.lerp(1.0, 1.18, b);
    }

    // 3. SUPER CHARGE TREMOR
    if (this.chargeRatio > 0 && this.state === 'idle') {
      const shake = (Math.random() - 0.5) * 0.025 * this.chargeRatio;
      shPosX += sign * 0.06 * this.chargeRatio + shake;
      shPosY -= 0.04 * this.chargeRatio - shake;
      shRotX -= 0.28 * this.chargeRatio;
      shRotY += sign * 0.22 * this.chargeRatio;
      elbowFlexX += 0.32 * this.chargeRatio;
      bicepFlex += 0.35 * this.chargeRatio;
      punchSqueeze = this.chargeRatio;
    }

    // 4. MULTI-KEYFRAME SKELETAL PUNCH & THROW ANIMATIONS (Jab, Cross, Hook, Uppercut, Super)
    const isLeftStrike = this.state === 'left' || this.state === 'hook_left';
    const isRightStrike = this.state === 'right' || this.state === 'uppercut_right';
    const isPunchingThisArm =
      (rig.side === 'left' && isLeftStrike) ||
      (rig.side === 'right' && isRightStrike) ||
      this.state === 'super' ||
      this.state === 'throw';
    const isOffHandDuringSinglePunch =
      (isLeftStrike && rig.side === 'right') || (isRightStrike && rig.side === 'left');

    if (isPunchingThisArm) {
      const t = Math.min(1, this.punchTimer / this.punchDuration);

      if (this.state === 'throw') {
        if (t < 0.22) {
          const w = t / 0.22;
          shRotX -= w * 0.25;
          elbowFlexX += w * 0.35;
        } else if (t < 0.58) {
          const p = (t - 0.22) / 0.36;
          const easeOut = 1 - Math.pow(1 - p, 3);
          shPosZ -= easeOut * 0.16;
          shRotX += easeOut * 0.55;
          shRotY -= sign * easeOut * 0.22;
          elbowFlexX = THREE.MathUtils.lerp(elbowFlexX + 0.35, 0.16, easeOut);
          forearmTwistZ = THREE.MathUtils.lerp(forearmTwistZ, -sign * 0.85, easeOut);
          wristRotX = 0.08;
          streakOpacity = Math.sin(p * Math.PI) * 0.55;
        } else {
          const r = (t - 0.58) / 0.42;
          const easeRec = 1 - Math.pow(1 - r, 2);
          shPosZ -= (1 - easeRec) * 0.16;
          shRotX += (1 - easeRec) * 0.55;
          elbowFlexX = THREE.MathUtils.lerp(0.16, elbowFlexX, easeRec);
          forearmTwistZ = THREE.MathUtils.lerp(-sign * 0.85, forearmTwistZ, easeRec);
        }
      } else {
        const isSuper = this.state === 'super';
        const isHook = this.state === 'hook_left';
        const isUppercut = this.state === 'uppercut_right';
        const isCross = this.state === 'right';

        // Target rotations tailored per strike type for rich visual variety!
        const targetShRotX = isUppercut ? 0.36 : isHook ? 0.12 : isSuper ? 0.18 : 0.15;
        const targetShRotY = -sign * (isHook ? 0.54 : isCross ? 0.38 : isSuper ? 0.26 : 0.32);
        const targetShRotZ = -sign * (isHook ? 0.55 : isUppercut ? -0.25 : isCross ? 0.32 : 0.15);
        const targetElbowFlex = isHook ? 0.42 : isUppercut ? 0.38 : isSuper ? 0.12 : 0.16;
        const targetForearmTwist = isUppercut ? sign * 0.95 : isHook ? -sign * 0.65 : -sign * 1.15;

        if (t < 0.18) {
          // KEYFRAME 1: Chamber / Wind-up
          const w = t / 0.18;
          const easeW = Math.sin(w * Math.PI * 0.5);
          shPosX += sign * (isHook ? 0.14 : 0.06) * easeW;
          shPosY -= (isUppercut ? 0.14 : 0.04) * easeW;
          shRotX -= 0.35 * easeW;
          shRotY += sign * (isHook ? 0.48 : 0.26) * easeW;
          elbowFlexX += 0.38 * easeW;
          forearmTwistZ += sign * 0.35 * easeW;
          bicepFlex = 1.0 + 0.32 * easeW;
          punchSqueeze = easeW;
        } else if (t < 0.46) {
          // KEYFRAME 2: Explosive Extension toward Center Crosshair
          const p = (t - 0.18) / 0.28;
          const easeOut = 1 - Math.pow(1 - p, 4);

          shPosX = THREE.MathUtils.lerp(shPosX + sign * 0.06, sign * (isSuper ? 0.28 : 0.24), easeOut);
          shPosY = THREE.MathUtils.lerp(
            shPosY - (isUppercut ? 0.14 : 0.04),
            isUppercut ? -0.14 : -0.22,
            easeOut
          );
          shPosZ = THREE.MathUtils.lerp(shPosZ, -0.42 - (isSuper ? 0.06 : 0), easeOut);

          shRotX = THREE.MathUtils.lerp(shRotX - 0.35, targetShRotX, easeOut);
          shRotY = THREE.MathUtils.lerp(shRotY + sign * 0.28, targetShRotY, easeOut);
          shRotZ = THREE.MathUtils.lerp(shRotZ, targetShRotZ, easeOut);

          elbowFlexX = THREE.MathUtils.lerp(1.74, targetElbowFlex, easeOut);
          forearmTwistZ = THREE.MathUtils.lerp(sign * 0.75, targetForearmTwist, easeOut);

          // CRITICAL VISUAL FIX: Keep wristRotX positive (+0.08 to +0.14) so the front knuckle plate
          // and golden studs stay proudly facing the camera on impact!
          wristRotX = THREE.MathUtils.lerp(0.12, 0.10, easeOut);
          wristRotY = THREE.MathUtils.lerp(-sign * 0.14, sign * 0.15, easeOut);

          bicepFlex = 1.32 - 0.12 * easeOut;
          punchSqueeze = 1.0;
          streakOpacity = easeOut * (isSuper ? 0.85 : 0.65);
        } else if (t < 0.60) {
          // KEYFRAME 3: Impact Follow-Through & Kinetic Knuckle Presentation
          const imp = (t - 0.46) / 0.14;
          const vib = Math.sin(imp * Math.PI * 3) * 0.025 * (1 - imp);

          shPosX = sign * (isSuper ? 0.28 : 0.24) + vib;
          shPosY = (isUppercut ? -0.14 : -0.22) - vib * 0.5;
          shPosZ = -0.42 - (isSuper ? 0.06 : 0) - Math.sin(imp * Math.PI) * 0.035;

          shRotX = targetShRotX + vib;
          shRotY = targetShRotY;
          shRotZ = targetShRotZ;

          elbowFlexX = targetElbowFlex + imp * 0.08;
          forearmTwistZ = targetForearmTwist;
          // Positive wristRotX (+0.08 to +0.14) keeps the golden knuckle studs facing the player!
          wristRotX = 0.08 + Math.sin(imp * Math.PI) * 0.06;
          wristRotY = sign * 0.15;

          bicepFlex = 1.25;
          punchSqueeze = 1.0;
          streakOpacity = (1 - imp) * 0.6;
        } else {
          // KEYFRAME 4: Snappy Elastic Guard Retraction
          const rec = (t - 0.60) / 0.40;
          const easeRec = 1 - Math.pow(1 - rec, 2.5);

          shPosX = THREE.MathUtils.lerp(sign * (isSuper ? 0.28 : 0.24), shPosX, easeRec);
          shPosY = THREE.MathUtils.lerp(isUppercut ? -0.14 : -0.22, shPosY, easeRec);
          shPosZ = THREE.MathUtils.lerp(-0.42, shPosZ, easeRec);

          shRotX = THREE.MathUtils.lerp(targetShRotX, shRotX, easeRec);
          shRotY = THREE.MathUtils.lerp(targetShRotY, shRotY, easeRec);
          shRotZ = THREE.MathUtils.lerp(targetShRotZ, shRotZ, easeRec);

          elbowFlexX = THREE.MathUtils.lerp(targetElbowFlex, elbowFlexX, easeRec);
          forearmTwistZ = THREE.MathUtils.lerp(targetForearmTwist, forearmTwistZ, easeRec);
          wristRotX = THREE.MathUtils.lerp(0.10, wristRotX, easeRec);
          wristRotY = THREE.MathUtils.lerp(sign * 0.15, wristRotY, easeRec);

          bicepFlex = THREE.MathUtils.lerp(1.22, 1.0, easeRec);
          punchSqueeze = 1 - easeRec;
          streakOpacity = 0;
        }
      }
    } else if (isOffHandDuringSinglePunch) {
      const t = Math.min(1, this.punchTimer / this.punchDuration);
      const guardPulse = Math.sin(t * Math.PI);
      shPosX -= sign * 0.04 * guardPulse;
      shPosY += 0.05 * guardPulse;
      shRotX -= 0.18 * guardPulse;
      elbowFlexX += 0.26 * guardPulse;
      bicepFlex = 1.0 + 0.18 * guardPulse;
      punchSqueeze = guardPulse * 0.6;
    }

    rig.shoulderPivot.position.set(shPosX, shPosY, shPosZ);
    rig.upperArmGroup.rotation.set(shRotX, shRotY, shRotZ);
    rig.bicepMesh.scale.set(0.95 * bicepFlex, 1.15 * bicepFlex, 1.55);

    rig.elbowPivot.rotation.set(elbowFlexX, 0, 0);
    rig.forearmGroup.rotation.set(0, 0, forearmTwistZ);
    rig.wristPivot.rotation.set(wristRotX, wristRotY, wristRotZ);

    const effectiveBallBlend = this.state === 'throw' ? 0 : b;
    this.poseFingers(rig, effectiveBallBlend, punchSqueeze);

    const streakMat = rig.impactStreak.material as THREE.MeshBasicMaterial;
    streakMat.opacity = streakOpacity;
    rig.impactStreak.rotation.z += 0.35 * sign;

    const auraMat = rig.chargeAura.material as THREE.MeshBasicMaterial;
    auraMat.opacity = this.chargeRatio * 0.55;
    rig.chargeAura.rotation.y += 0.08 * sign;
    rig.chargeAura.rotation.x += 0.05;
  }

  public update(dt: number, isMoving: boolean, timeOrDashing: number | boolean = false, isDashingFlag = false) {
    const isDashing = typeof timeOrDashing === 'boolean' ? timeOrDashing : isDashingFlag;
    this.swayX = THREE.MathUtils.lerp(this.swayX, 0, Math.min(1, dt * 10));
    this.swayY = THREE.MathUtils.lerp(this.swayY, 0, Math.min(1, dt * 10));

    const targetBallBlend = this.isHoldingBall ? 1 : 0;
    this.ballHoldBlend = THREE.MathUtils.lerp(this.ballHoldBlend, targetBallBlend, Math.min(1, dt * 16));

    const bobSpeed = isDashing ? 20 : isMoving ? 11 : 2.4;
    const bobAmp = isDashing ? 0.048 : isMoving ? 0.025 : 0.007;
    this.bobTimer += dt * bobSpeed;

    const bobX = Math.cos(this.bobTimer * 0.5) * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobTimer)) * bobAmp;

    if (this.state !== 'idle') {
      this.punchTimer += dt;
      if (this.punchTimer >= this.punchDuration) {
        this.state = 'idle';
        this.punchTimer = 0;
      }
    }

    if (this.isHoldingBall) {
      this.heldBallVisual.position.set(
        this.swayX * 0.65 + bobX * 0.35,
        -0.23 + this.swayY * 0.65 + bobY * 0.45,
        -0.82
      );
      this.heldBallCore.rotation.y += dt * 2.2;
      this.heldBallCore.rotation.x += dt * 1.1;
      this.heldBallRing.rotation.z -= dt * 3.5;
      const pulse = 1 + Math.sin(this.bobTimer * 3) * 0.025;
      this.heldBallVisual.scale.setScalar(pulse);
    }

    this.applyPoseToArm(this.leftRig, bobX, bobY);
    this.applyPoseToArm(this.rightRig, -bobX, bobY);
  }
}
