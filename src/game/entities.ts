/**
 * Level 3+ Backrooms Skeletal Architect Entities & Level 10 Giant Architect Mini-Boss.
 * - Remodeled after Kane Pixels' "Bacteria" creature:
 *   - Crooked asymmetric "S"-curved spine column
 *   - Elongated wire-like arms reaching almost to the floor
 *   - Unsettling 15° rapid head twitches every 0.4s
 * - Appears starting at Level 3 (slower tutorial pace on Lv. 3–4, scaling up afterwards).
 * - On Level 10 (and multiples of 10), spawns THE GIANT ARCHITECT MINI-BOSS that locks the room until defeated!
 */
import * as THREE from 'three';
import { materialFactory } from './materials';
import { textureFactory } from './textures';
import { BackroomsWorld, DestructibleWall } from './backrooms';
import { FractureEngine } from './destruction';
import { ComicEffectsManager } from './comicEffects';
import { soundManager } from './audio';
import { progressionManager } from './progression';
import { t } from './i18n';

export type EntityState = 'stalking' | 'building' | 'staggered';

export interface SkeletalEntity {
  id: string;
  isBoss: boolean;
  root: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  buildBeams: THREE.LineSegments;
  hpBarFill: THREE.Mesh;
  statusSprite: THREE.Sprite;
  collider: THREE.Box3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetYaw: number;
  health: number;
  maxHealth: number;
  state: EntityState;
  stateTimer: number;
  buildCooldown: number;
  animPhase: number;
  twitchTimer: number;
  twitchRotZ: number;
  twitchRotX: number;
  targetSlot: {
    cx: number;
    cz: number;
    gx: number;
    gz: number;
    orientation: 'H' | 'V';
  } | null;
  wallsBuiltCount: number;
  isDead: boolean;
}

export class SkeletalEntityManager {
  private scene: THREE.Scene;
  public entities: SkeletalEntity[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns Skeletal Builder Entities starting at Level 3+, and Giant Architect Mini-Boss on Level 10!
   */
  public spawnForLevel(level: number, world: BackroomsWorld) {
    this.clearAll();
    if (level < 3) return;

    const isBossLevel = level >= 10 && level % 10 === 0;

    if (isBossLevel) {
      // Spawn THE GIANT ARCHITECT MINI-BOSS in the center of the room!
      // Scale Boss maxHealth by the player's current Punch Force & Rebirth power!
      const playerForceMult = Math.max(
        1,
        progressionManager.getStatMultiplier('punchForce') *
          progressionManager.getRebirthDamageMultiplier()
      );
      const bossPos = new THREE.Vector3(
        (world.gridWidth * world.cellSize) / 2,
        0,
        (world.gridDepth * world.cellSize) / 2
      );
      const bossHp = Math.round((1600 + (level - 10) * 240) * playerForceMult);
      this.createSkeletalEntity(bossPos, bossHp, 0, true);
    }

    const count =
      level <= 4
        ? 1
        : level < 10
        ? Math.min(2, 1 + Math.floor((level - 4) / 3))
        : Math.min(3, 1 + Math.floor((level - 8) / 3));

    const maxHp =
      level <= 4
        ? Math.round(180 + (level - 3) * 35)
        : Math.round(240 + (level - 5) * 40);

    for (let i = 0; i < count; i++) {
      const rx = Math.max(
        1,
        Math.min(world.gridWidth - 1, Math.floor(world.gridWidth * 0.55 + (i % 2) * 2))
      );
      const rz = Math.max(
        1,
        Math.min(world.gridDepth - 1, Math.floor(world.gridDepth * 0.55 + Math.floor(i / 2) * 2))
      );
      const spawnPos = new THREE.Vector3(
        rx * world.cellSize + world.cellSize * 0.5 + (Math.random() - 0.5) * 1.2,
        0,
        rz * world.cellSize + world.cellSize * 0.5 + (Math.random() - 0.5) * 1.2
      );

      this.createSkeletalEntity(spawnPos, maxHp, i + 1, false);
    }
  }

  /**
   * Builds a multi-jointed 3D Pitch-Black "Bacteria" Skeletal Entity with:
   * - S-Curved asymmetric spine
   * - Elongated arms hanging nearly to the floor
   * - Twitching skull & Duo White/Black comic outlines
   */
  private createSkeletalEntity(
    pos: THREE.Vector3,
    maxHealth: number,
    idx: number,
    isBoss = false
  ): SkeletalEntity {
    const root = new THREE.Group();
    root.position.copy(pos);
    const bossScale = isBoss ? 1.58 : 1.0;
    root.scale.setScalar(bossScale);

    const boneMat = materialFactory.getEntityMaterial();
    const eyeMat = new THREE.MeshBasicMaterial({ color: isBoss ? 0xfacc15 : 0xff1133 });
    const whiteGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const makeBone = (geo: THREE.BufferGeometry, outlineThick = 0.022): THREE.Mesh => {
      const m = new THREE.Mesh(geo, boneMat);
      m.add(
        materialFactory.createOutlineMesh(
          geo,
          outlineThick,
          isBoss ? 0xff2244 : 0xffffff,
          0x000000
        )
      );
      m.add(materialFactory.createDuoEdgeLines(geo, 22, true));
      return m;
    };

    // 1. TORSO & ASYMMETRIC "S"-CURVED BACTERIA SPINE
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.22, 0);
    root.add(torsoGroup);

    const pelvisGeo = new THREE.BoxGeometry(0.42, 0.15, 0.24);
    const pelvis = makeBone(pelvisGeo, 0.02);
    torsoGroup.add(pelvis);

    // 3-Segment Asymmetric S-Curved Spine
    const spineSeg1Geo = new THREE.CylinderGeometry(0.055, 0.072, 0.36, 7);
    spineSeg1Geo.translate(0, 0.18, 0);
    const spineSeg1 = makeBone(spineSeg1Geo, 0.02);
    spineSeg1.rotation.set(-0.24, 0, 0.16); // Bottom of S-curve leans back & right
    torsoGroup.add(spineSeg1);

    const spineSeg2Geo = new THREE.CylinderGeometry(0.05, 0.058, 0.38, 7);
    spineSeg2Geo.translate(0, 0.19, 0);
    const spineSeg2 = makeBone(spineSeg2Geo, 0.02);
    spineSeg2.position.set(-0.05, 0.34, -0.07);
    spineSeg2.rotation.set(0.48, 0, -0.22); // Mid S-curve hunches forward & left
    torsoGroup.add(spineSeg2);

    const spineSeg3Geo = new THREE.CylinderGeometry(0.048, 0.055, 0.36, 7);
    spineSeg3Geo.translate(0, 0.18, 0);
    const spineSeg3 = makeBone(spineSeg3Geo, 0.02);
    spineSeg3.position.set(0.03, 0.68, 0.08);
    spineSeg3.rotation.set(0.32, 0, 0.12); // Upper neck/thoracic hunch
    torsoGroup.add(spineSeg3);

    // 5 Crooked Asymmetric Rib Pairs
    for (let r = 0; r < 5; r++) {
      const ribY = 0.26 + r * 0.145;
      const ribWidth = 0.36 + Math.sin((r / 4) * Math.PI) * 0.20;
      const ribGeo = new THREE.TorusGeometry(ribWidth * 0.5, 0.025, 6, 12, Math.PI * 1.35);
      ribGeo.rotateX(Math.PI / 2);
      ribGeo.rotateZ(-Math.PI * 0.175);
      const ribMesh = makeBone(ribGeo, 0.018);
      ribMesh.position.set((r % 2 === 0 ? 1 : -1) * 0.025, ribY, 0.05 + r * 0.022);
      ribMesh.rotation.z = (r % 2 === 0 ? 1 : -1) * 0.08;
      torsoGroup.add(ribMesh);
    }

    // Wide Crooked Clavicle Bar
    const clavicleGeo = new THREE.BoxGeometry(0.84, 0.085, 0.14);
    const clavicle = makeBone(clavicleGeo, 0.02);
    clavicle.position.set(0, 0.98, 0.18);
    clavicle.rotation.z = 0.07;
    torsoGroup.add(clavicle);

    // 2. TWITCHING BACTERIA SKULL & VOID HORNS
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.14, 0.24);
    torsoGroup.add(headGroup);

    const craniumGeo = new THREE.BoxGeometry(0.28, 0.36, 0.32);
    const cranium = makeBone(craniumGeo, 0.024);
    cranium.position.set(0, 0.12, 0);
    headGroup.add(cranium);

    const jawGeo = new THREE.BoxGeometry(0.22, 0.15, 0.24);
    const jaw = makeBone(jawGeo, 0.02);
    jaw.position.set(0, -0.11, 0.04);
    headGroup.add(jaw);

    const eyeGeo = new THREE.OctahedronGeometry(0.046, 0);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.075, 0.14, 0.165);
    leftEye.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), whiteGlowMat));
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.075, 0.14, 0.165);
    rightEye.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), whiteGlowMat));
    headGroup.add(rightEye);

    // Tangled Bacteria Wire Horns (Boss gets a 4-horn Abyssal Crown!)
    const hornCount = isBoss ? [-1.6, -0.8, 0.8, 1.6] : [-1, 1];
    for (const sign of hornCount) {
      const hornGeo = new THREE.CylinderGeometry(0.014, 0.042, isBoss ? 0.48 : 0.36, 6);
      hornGeo.translate(0, isBoss ? 0.24 : 0.18, 0);
      const horn = makeBone(hornGeo, 0.018);
      horn.position.set(sign * 0.09, 0.26, -0.02);
      horn.rotation.z = -sign * 0.32;
      horn.rotation.x = -0.22;
      headGroup.add(horn);
    }

    // 3. ELONGATED BACTERIA ARMS REACHING NEARLY TO THE FLOOR
    const buildArm = (sign: number) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(sign * 0.42, 0.98, 0.18);
      torsoGroup.add(armPivot);

      // Elongated upper arm (0.76m)
      const upperLen = 0.76;
      const upperGeo = new THREE.CylinderGeometry(0.038, 0.052, upperLen, 7);
      upperGeo.translate(0, -upperLen * 0.5, 0);
      const upperMesh = makeBone(upperGeo, 0.02);
      armPivot.add(upperMesh);

      const forearmPivot = new THREE.Group();
      forearmPivot.position.set(0, -upperLen, 0);
      armPivot.add(forearmPivot);

      // Elongated forearm (0.84m) so fingertips dangle near floor level!
      const foreLen = 0.84;
      const foreGeo = new THREE.CylinderGeometry(0.028, 0.042, foreLen, 7);
      foreGeo.translate(0, -foreLen * 0.5, 0);
      const foreMesh = makeBone(foreGeo, 0.02);
      forearmPivot.add(foreMesh);

      for (let c = -1; c <= 1; c++) {
        const clawGeo = new THREE.ConeGeometry(0.022, 0.34, 5);
        clawGeo.rotateX(Math.PI);
        clawGeo.translate(c * 0.05, -foreLen - 0.15, 0.03);
        const claw = makeBone(clawGeo, 0.015);
        forearmPivot.add(claw);
      }

      return { armPivot, forearmPivot };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    // 4. LONG ARTICULATED STALKING LEGS
    const buildLeg = (sign: number) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(sign * 0.18, 1.20, 0);
      root.add(legPivot);

      const thighGeo = new THREE.CylinderGeometry(0.05, 0.065, 0.62, 7);
      thighGeo.translate(0, -0.31, 0);
      const thigh = makeBone(thighGeo, 0.02);
      legPivot.add(thigh);

      const shinGeo = new THREE.CylinderGeometry(0.036, 0.05, 0.62, 7);
      shinGeo.translate(0, -0.92, -0.04);
      const shin = makeBone(shinGeo, 0.02);
      legPivot.add(shin);

      return legPivot;
    };

    const leftLegPivot = buildLeg(-1);
    const rightLegPivot = buildLeg(1);

    // 5. WALL CONSTRUCTION ARCHITECT BEAMS
    const beamGeo = new THREE.BufferGeometry();
    const beamVerts = new Float32Array(6 * 3);
    beamGeo.setAttribute('position', new THREE.BufferAttribute(beamVerts, 3));
    const beamMat = new THREE.LineBasicMaterial({
      color: isBoss ? 0xfacc15 : 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const buildBeams = new THREE.LineSegments(beamGeo, beamMat);
    buildBeams.visible = false;
    root.add(buildBeams);

    // 6. FLOATING 3D HEALTH BAR & TAG ABOVE ENTITY
    const hpBgGeo = new THREE.PlaneGeometry(isBoss ? 1.25 : 0.9, 0.12);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    hpBg.position.set(0, 2.78, 0);
    root.add(hpBg);

    const hpFillGeo = new THREE.PlaneGeometry(isBoss ? 1.18 : 0.84, 0.08);
    const hpFillMat = new THREE.MeshBasicMaterial({
      color: isBoss ? 0xfacc15 : 0xff1133,
      side: THREE.DoubleSide,
    });
    const hpBarFill = new THREE.Mesh(hpFillGeo, hpFillMat);
    hpBarFill.position.set(0, 0, 0.01);
    hpBg.add(hpBarFill);

    const statusTex = textureFactory.createComicTextTexture(
      isBoss ? 'BOSS ARQUITETO' : 'BACTERIA',
      isBoss ? '#facc15' : '#ff1133'
    );
    const statusSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: statusTex, transparent: true, depthTest: false })
    );
    statusSprite.position.set(0, 3.12, 0);
    statusSprite.scale.set(isBoss ? 1.45 : 1.15, 0.52, 1);
    root.add(statusSprite);

    this.scene.add(root);

    const collider = new THREE.Box3();
    this.updateEntityCollider(pos, collider, isBoss);

    const entity: SkeletalEntity = {
      id: `entity_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      isBoss,
      root,
      headGroup,
      torsoGroup,
      leftArmPivot: leftArm.armPivot,
      rightArmPivot: rightArm.armPivot,
      leftForearmPivot: leftArm.forearmPivot,
      rightForearmPivot: rightArm.forearmPivot,
      leftLegPivot,
      rightLegPivot,
      buildBeams,
      hpBarFill,
      statusSprite,
      collider,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      targetYaw: Math.random() * Math.PI * 2,
      health: maxHealth,
      maxHealth,
      state: 'stalking',
      stateTimer: 0,
      buildCooldown: isBoss ? 1.2 : 2.2 + idx * 1.1,
      animPhase: Math.random() * 10,
      twitchTimer: Math.random() * 0.4,
      twitchRotZ: 0,
      twitchRotX: 0,
      targetSlot: null,
      wallsBuiltCount: 0,
      isDead: false,
    };

    this.entities.push(entity);
    return entity;
  }

  private updateEntityCollider(pos: THREE.Vector3, box: THREE.Box3, isBoss = false) {
    const r = isBoss ? 0.92 : 0.58;
    const h = isBoss ? 3.8 : 2.65;
    box.min.set(pos.x - r, 0, pos.z - r);
    box.max.set(pos.x + r, h, pos.z + r);
  }

  public getEntityAhead(
    raycaster: THREE.Raycaster,
    maxDistance = 3.6
  ): { entity: SkeletalEntity; hitPoint: THREE.Vector3 } | null {
    let closest: SkeletalEntity | null = null;
    let closestDist = maxDistance;
    let closestHit: THREE.Vector3 | null = null;
    const hitTarget = new THREE.Vector3();

    for (const ent of this.entities) {
      if (ent.isDead) continue;
      const hit = raycaster.ray.intersectBox(ent.collider, hitTarget);
      if (hit) {
        const dist = raycaster.ray.origin.distanceTo(hit);
        if (dist < closestDist) {
          closestDist = dist;
          closest = ent;
          closestHit = hit.clone();
        }
      }
    }

    if (closest && closestHit) {
      return { entity: closest, hitPoint: closestHit };
    }
    return null;
  }

  public getEntitiesInRadius(center: THREE.Vector3, radius: number): SkeletalEntity[] {
    const res: SkeletalEntity[] = [];
    for (const ent of this.entities) {
      if (ent.isDead) continue;
      const d = Math.hypot(ent.position.x - center.x, ent.position.z - center.z);
      if (d <= radius + (ent.isBoss ? 0.5 : 0)) res.push(ent);
    }
    return res;
  }

  public hasLivingBoss(): SkeletalEntity | null {
    return this.entities.find((e) => !e.isDead && e.isBoss) || null;
  }

  public damageEntity(
    entityId: string,
    damage: number,
    hitPoint: THREE.Vector3,
    hitDir: THREE.Vector3,
    fractureEngine: FractureEngine,
    comicEffects: ComicEffectsManager
  ): boolean {
    const ent = this.entities.find((e) => e.id === entityId);
    if (!ent || ent.isDead) return false;

    // Boss Damage Cap: No single punch or ball hit can deal more than 12% of the Boss's maxHealth,
    // guaranteeing at least 9 to 10 direct hits are required to defeat the Giant Architect!
    const effectiveDamage = ent.isBoss
      ? Math.min(damage, Math.floor(ent.maxHealth * 0.118))
      : damage;

    ent.health -= effectiveDamage;
    const hpRatio = Math.max(0, ent.health / ent.maxHealth);
    ent.hpBarFill.scale.x = Math.max(0.001, hpRatio);
    const barHalfW = ent.isBoss ? 0.59 : 0.42;
    ent.hpBarFill.position.x = -(1 - hpRatio) * barHalfW;

    comicEffects.spawnShockwave(hitPoint, hitDir.clone().negate(), ent.isBoss ? 2.1 : 1.55);

    if (ent.health <= 0) {
      ent.isDead = true;
      this.scene.remove(ent.root);
      this.disposeEntity(ent);

      soundManager.playEntityDeath(ent.isBoss);
      fractureEngine.fractureEntity(ent.position, hitDir, ent.isBoss);
      comicEffects.triggerPunchShake(ent.isBoss ? 0.24 : 0.16, 45, hitDir);
      comicEffects.spawnComicText(
        ent.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
        ent.isBoss ? t().comicBossKilled : t().comicEntityKilled,
        ent.isBoss ? '#facc15' : '#ffffff'
      );
      return true;
    } else {
      ent.state = 'staggered';
      ent.stateTimer = ent.isBoss ? 0.22 : 0.45;
      ent.buildBeams.visible = false;
      const pushDist = ent.isBoss ? 0.18 : 0.55;
      ent.position.x += hitDir.x * pushDist;
      ent.position.z += hitDir.z * pushDist;

      soundManager.playEntityHit();
      comicEffects.triggerPunchShake(0.10, 26, hitDir);
      comicEffects.spawnComicText(
        hitPoint,
        ent.isBoss ? ['BOSS ARMOR!', 'CRACK!', 'TITAN HIT!'] : ['CRACK!', 'BONE HIT!', 'STAGGER!'],
        ent.isBoss ? '#facc15' : '#f43f5e'
      );
      return false;
    }
  }

  public update(
    delta: number,
    time: number,
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
    world: BackroomsWorld,
    comicEffects: ComicEffectsManager,
    level: number,
    onWallConstructed: (newWall: DestructibleWall) => void
  ) {
    const worldW = world.gridWidth * world.cellSize;
    const worldD = world.gridDepth * world.cellSize;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const ent = this.entities[i];
      if (ent.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      ent.animPhase += delta * (ent.state === 'building' ? 14 : 7.5);
      if (ent.buildCooldown > 0) ent.buildCooldown -= delta;

      // Rapid 15-degree (~0.26 rad) head twitch spasm every 0.4s (Kane Pixels Bacteria signature!)
      ent.twitchTimer -= delta;
      if (ent.twitchTimer <= 0) {
        ent.twitchTimer = 0.35 + Math.random() * 0.18;
        const signZ = Math.random() < 0.5 ? -1 : 1;
        ent.twitchRotZ = signZ * (0.22 + Math.random() * 0.14); // ~15° snap
        ent.twitchRotX = (Math.random() - 0.5) * 0.28;
      }

      const hpBg = ent.hpBarFill.parent;
      if (hpBg) {
        hpBg.lookAt(camera.position);
      }

      if (ent.state === 'staggered') {
        ent.stateTimer -= delta;
        ent.torsoGroup.rotation.x = -0.35 * Math.sin(ent.stateTimer * 25);
        ent.torsoGroup.rotation.z = 0.25 * Math.cos(ent.stateTimer * 25);
        if (ent.stateTimer <= 0) {
          ent.state = 'stalking';
          ent.torsoGroup.rotation.set(0, 0, 0);
        }
      } else if (ent.state === 'stalking') {
        ent.buildBeams.visible = false;

        const maxWalls = ent.isBoss ? 10 : level <= 4 ? 3 : 6;
        if (!ent.targetSlot && ent.buildCooldown <= 0 && ent.wallsBuiltCount < maxWalls) {
          ent.targetSlot = world.findEmptyWallSlotNear(ent.position, playerPos);
        }

        let moveTargetX = playerPos.x;
        let moveTargetZ = playerPos.z;

        if (ent.targetSlot) {
          moveTargetX = ent.targetSlot.cx;
          moveTargetZ = ent.targetSlot.cz;
          const distToSlot = Math.hypot(moveTargetX - ent.position.x, moveTargetZ - ent.position.z);

          if (distToSlot < 1.35) {
            const playerDistToSlot = Math.hypot(playerPos.x - moveTargetX, playerPos.z - moveTargetZ);
            if (playerDistToSlot > 1.8) {
              ent.state = 'building';
              ent.stateTimer = ent.isBoss ? 1.45 : level <= 4 ? 2.6 : 2.0;
              soundManager.playEntityBuild();
              comicEffects.spawnComicText(
                ent.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
                t().comicBuildingWall,
                '#a855f7'
              );
              continue;
            } else {
              ent.targetSlot = null;
            }
          }
        }

        const dx = moveTargetX - ent.position.x;
        const dz = moveTargetZ - ent.position.z;
        const dist = Math.hypot(dx, dz);
        const stopDist = ent.targetSlot ? 0.15 : ent.isBoss ? 1.65 : 1.38;
        if (dist > stopDist) {
          // Slower tutorial pace on Levels 3-4 so new players learn to fight it!
          const speed =
            level <= 4
              ? 2.25
              : ent.isBoss
              ? 3.85
              : 3.2 + Math.min(2.0, (level - 5) * 0.16);
          ent.position.x += (dx / dist) * speed * delta;
          ent.position.z += (dz / dist) * speed * delta;
          ent.targetYaw = Math.atan2(dx, dz);
        } else if (!ent.targetSlot && dist > 0.01) {
          ent.targetYaw = Math.atan2(dx, dz);
        }

        const stride = Math.sin(ent.animPhase);
        ent.leftLegPivot.rotation.x = stride * 0.65;
        ent.rightLegPivot.rotation.x = -stride * 0.65;
        // Long dangling arms swing eerily near the floor
        ent.leftArmPivot.rotation.x = -0.25 - stride * 0.42;
        ent.rightArmPivot.rotation.x = -0.25 + stride * 0.42;
        ent.leftForearmPivot.rotation.x = -0.22;
        ent.rightForearmPivot.rotation.x = -0.22;
        ent.headGroup.rotation.z = ent.twitchRotZ;
        ent.headGroup.rotation.x = ent.twitchRotX;
      } else if (ent.state === 'building') {
        ent.stateTimer -= delta;

        if (ent.targetSlot) {
          const dx = ent.targetSlot.cx - ent.position.x;
          const dz = ent.targetSlot.cz - ent.position.z;
          ent.targetYaw = Math.atan2(dx, dz);

          const weave = Math.sin(ent.animPhase * 1.6);
          ent.leftArmPivot.rotation.set(-1.35 + weave * 0.35, 0.25, -0.35);
          ent.rightArmPivot.rotation.set(-1.35 - weave * 0.35, -0.25, 0.35);
          ent.leftForearmPivot.rotation.x = -0.4 + Math.cos(ent.animPhase) * 0.3;
          ent.rightForearmPivot.rotation.x = -0.4 - Math.cos(ent.animPhase) * 0.3;
          ent.headGroup.rotation.z = ent.twitchRotZ * 1.3;

          ent.buildBeams.visible = true;
          const localSlotX =
            (ent.targetSlot.cx - ent.position.x) * Math.cos(-ent.root.rotation.y) -
            (ent.targetSlot.cz - ent.position.z) * Math.sin(-ent.root.rotation.y);
          const localSlotZ =
            (ent.targetSlot.cx - ent.position.x) * Math.sin(-ent.root.rotation.y) +
            (ent.targetSlot.cz - ent.position.z) * Math.cos(-ent.root.rotation.y);

          const posAttr = ent.buildBeams.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.setXYZ(0, -0.38, 1.85, 0.45);
          posAttr.setXYZ(1, localSlotX - 0.5, 0.2 + Math.abs(weave) * 1.4, localSlotZ);
          posAttr.setXYZ(2, 0.38, 1.85, 0.45);
          posAttr.setXYZ(3, localSlotX + 0.5, 0.2 + Math.abs(weave) * 1.4, localSlotZ);
          posAttr.setXYZ(4, 0, 2.25, 0.3);
          posAttr.setXYZ(5, localSlotX, 1.2, localSlotZ);
          posAttr.needsUpdate = true;
        }

        if (ent.stateTimer <= 0) {
          ent.buildBeams.visible = false;
          if (ent.targetSlot) {
            const newWall = world.spawnConstructedWall(
              ent.targetSlot.cx,
              ent.targetSlot.cz,
              ent.targetSlot.gx,
              ent.targetSlot.gz,
              ent.targetSlot.orientation,
              level
            );
            ent.wallsBuiltCount++;
            soundManager.playEntityBuild();
            comicEffects.spawnShockwave(newWall.center, new THREE.Vector3(0, 1, 0), 2.1);
            comicEffects.spawnComicText(newWall.center, t().comicWallBuilt, '#ffffff');
            onWallConstructed(newWall);
          }
          ent.targetSlot = null;
          ent.state = 'stalking';
          ent.buildCooldown =
            level <= 4 ? 6.5 : ent.isBoss ? 2.4 : Math.max(3.2, 5.5 - (level - 5) * 0.2);
        }
      }

      // Hard minimum separation from player camera (1.35m) so black mesh never blinds the screen
      const minPlayerDist = ent.isBoss ? 1.65 : 1.35;
      const pdx = ent.position.x - playerPos.x;
      const pdz = ent.position.z - playerPos.z;
      const pDist = Math.hypot(pdx, pdz);
      if (pDist < minPlayerDist) {
        if (pDist > 0.001) {
          ent.position.x = playerPos.x + (pdx / pDist) * minPlayerDist;
          ent.position.z = playerPos.z + (pdz / pDist) * minPlayerDist;
        } else {
          ent.position.x = playerPos.x + minPlayerDist;
        }
      }

      ent.position.x = THREE.MathUtils.clamp(ent.position.x, 1.2, worldW - 1.2);
      ent.position.z = THREE.MathUtils.clamp(ent.position.z, 1.2, worldD - 1.2);

      const yawDiff = Math.atan2(
        Math.sin(ent.targetYaw - ent.root.rotation.y),
        Math.cos(ent.targetYaw - ent.root.rotation.y)
      );
      ent.root.rotation.y += yawDiff * Math.min(1, delta * 10);
      ent.root.position.copy(ent.position);
      this.updateEntityCollider(ent.position, ent.collider, ent.isBoss);
    }
  }

  private disposeEntity(ent: SkeletalEntity) {
    ent.root.traverse((c) => {
      if (c instanceof THREE.Mesh || c instanceof THREE.LineSegments) {
        c.geometry?.dispose();
      }
    });
  }

  public clearAll() {
    for (const ent of this.entities) {
      this.scene.remove(ent.root);
      this.disposeEntity(ent);
    }
    this.entities = [];
  }
}
