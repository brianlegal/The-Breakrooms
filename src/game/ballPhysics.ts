/**
 * Bouncing Demolition Ball Physics System + Plasma Afterimage Trail (Juice #7) + Multi-Ball Split (250%+ Perk).
 * - Fixes "Camera Blindness" on throw by spawning the ball 1.32m ahead of the camera AND adding the player's
 *   forward velocity component so the player never runs through their own thrown ball!
 * - At 250%+ Items Speed or Items Force, throwing the ball splits it into 2 or 3 Multi-Balls!
 */
import * as THREE from 'three';
import { BackroomsWorld, DestructibleWall } from './backrooms';
import { FractureEngine } from './destruction';
import { ComicEffectsManager } from './comicEffects';
import { SkeletalEntityManager, SkeletalEntity } from './entities';
import { soundManager } from './audio';
import { materialFactory } from './materials';
import { t } from './i18n';

export interface DemolitionBall {
  id: string;
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  radius: number;
  isHeld: boolean;
  isThrown: boolean;
  isClone: boolean;
  bounces: number;
  lifetime: number;
  maxLifetime: number;
  forceMultiplier: number;
  speedMultiplier: number;
  borderCooldown: number;
  wallCooldowns: Map<string, number>;
  trailTimer: number;
}

interface TrailNode {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
}

export class BallManager {
  private scene: THREE.Scene;
  public balls: DemolitionBall[] = [];
  public heldBall: DemolitionBall | null = null;
  private trailNodes: TrailNode[] = [];
  private sharedTrailGeom = new THREE.SphereGeometry(0.18, 10, 10);
  private sharedBallGeom = new THREE.SphereGeometry(0.33, 24, 24);
  private sharedRingGeom = new THREE.TorusGeometry(0.33 * 1.03, 0.018, 10, 28);
  private sharedAuraGeom = new THREE.TorusGeometry(0.33 * 1.16, 0.012, 8, 24);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sharedRingGeom.rotateX(Math.PI / 2);
  }

  /**
   * Spawns demolition balls across the current room.
   */
  public spawnBalls(world: BackroomsWorld, count = 3) {
    this.clearAll();

    for (let i = 0; i < count; i++) {
      const rx = 1 + Math.floor(Math.random() * Math.max(1, world.gridWidth - 2));
      const rz = 1 + Math.floor(Math.random() * Math.max(1, world.gridDepth - 2));
      const pos = new THREE.Vector3(
        rx * world.cellSize + world.cellSize / 2 + (Math.random() - 0.5) * 1.2,
        0.5,
        rz * world.cellSize + world.cellSize / 2 + (Math.random() - 0.5) * 1.2
      );

      this.createBall(pos, false);
    }
  }

  /**
   * Create a single 3D Demolition Ball with metallic equatorial ring and Duo Black & White outline.
   */
  public createBall(pos: THREE.Vector3, isClone = false): DemolitionBall {
    const group = new THREE.Group();
    const radius = 0.33;

    const ballMat = materialFactory.getDemolitionBallMaterial();
    const ballMesh = new THREE.Mesh(this.sharedBallGeom, ballMat);
    group.add(ballMesh);

    const outline = materialFactory.createOutlineMesh(
      this.sharedBallGeom,
      0.032,
      0x000000,
      isClone ? 0x22d3ee : 0xffffff
    );
    ballMesh.add(outline);

    const ringMesh = new THREE.Mesh(
      this.sharedRingGeom,
      materialFactory.getMetallicHardwareMaterial(isClone ? 0x22d3ee : 0xfacc15)
    );
    group.add(ringMesh);

    const auraMat = new THREE.MeshBasicMaterial({
      color: isClone ? 0x22d3ee : 0xff2266,
      transparent: true,
      opacity: 0.85,
    });
    const auraRing = new THREE.Mesh(this.sharedAuraGeom, auraMat);
    auraRing.rotation.x = Math.PI * 0.25;
    group.add(auraRing);

    group.position.copy(pos);
    this.scene.add(group);

    const ball: DemolitionBall = {
      id: `ball_${Math.random().toString(36).substring(2, 7)}`,
      mesh: group,
      velocity: new THREE.Vector3(0, 0, 0),
      rotVelocity: new THREE.Vector3(0, 0, 0),
      radius,
      isHeld: false,
      isThrown: false,
      isClone,
      bounces: 0,
      lifetime: 0,
      maxLifetime: isClone ? 7.5 : 14.0,
      forceMultiplier: 1.0,
      speedMultiplier: 1.0,
      borderCooldown: 0,
      wallCooldowns: new Map(),
      trailTimer: 0,
    };

    this.balls.push(ball);
    return ball;
  }

  /**
   * Checks if player walks near a free ball on the floor to pick it up.
   */
  public checkPickup(playerPos: THREE.Vector3, pickupRadius = 1.55): DemolitionBall | null {
    if (this.heldBall) return null;

    for (const ball of this.balls) {
      if (ball.isHeld || ball.isThrown || ball.isClone) continue;

      const dist = Math.hypot(
        ball.mesh.position.x - playerPos.x,
        ball.mesh.position.z - playerPos.z
      );
      if (dist < pickupRadius) {
        ball.isHeld = true;
        ball.mesh.visible = false;
        this.heldBall = ball;
        soundManager.playBallPickup();
        return ball;
      }
    }
    return null;
  }

  /**
   * Throws the currently held ball forward with velocity and force scaled by player upgrades.
   * - Spawns 1.32m ahead of camera + adds player forward speed so the camera NEVER clips inside the ball!
   * - If Items Speed >= 250% or Items Force >= 250%, spawns 2 extra Multi-Ball clones!
   */
  public throwHeldBall(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    baseSpeed = 27.0,
    speedMultiplier = 1.0,
    forceMultiplier = 1.0,
    playerVelocity?: THREE.Vector3
  ): DemolitionBall | null {
    if (!this.heldBall) return null;

    const ball = this.heldBall;
    this.heldBall = null;

    // Dampen extreme ball speed above 280% so physics sub-stepping stays crisp while converting excess into Multi-Ball!
    const effectiveSpeedMult =
      speedMultiplier <= 2.5
        ? speedMultiplier
        : 2.5 + Math.log2(1 + (speedMultiplier - 2.5)) * 0.45;

    const forwardPlayerSpeed = playerVelocity
      ? Math.max(0, playerVelocity.dot(direction))
      : 0;
    const finalSpeed = baseSpeed * effectiveSpeedMult + forwardPlayerSpeed * 1.15;

    const configureLaunchedBall = (targetBall: DemolitionBall, launchDir: THREE.Vector3) => {
      targetBall.isHeld = false;
      targetBall.isThrown = true;
      targetBall.mesh.visible = true;
      targetBall.bounces = 0;
      targetBall.lifetime = 0;
      targetBall.speedMultiplier = effectiveSpeedMult;
      targetBall.forceMultiplier = forceMultiplier;
      targetBall.borderCooldown = 0;
      targetBall.wallCooldowns.clear();

      // Spawn 1.32m in front of camera so player NEVER collides with or sees inside the ball on frame 1!
      targetBall.mesh.position.copy(origin).addScaledVector(launchDir, 1.32);
      targetBall.mesh.position.y = Math.max(0.55, Math.min(2.6, targetBall.mesh.position.y - 0.12));

      targetBall.velocity.copy(launchDir).multiplyScalar(finalSpeed);
      targetBall.velocity.y += 1.25;

      targetBall.rotVelocity.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18
      );
    };

    configureLaunchedBall(ball, direction);

    // 250%+ EPIC PERK: Multi-Ball Split (spawns 2 clone balls at +/- 14 degrees)
    if (speedMultiplier >= 2.5 || forceMultiplier >= 2.5) {
      const upAxis = new THREE.Vector3(0, 1, 0);
      const spreadAngles = [-0.24, 0.24];
      for (const ang of spreadAngles) {
        const cloneDir = direction.clone().applyAxisAngle(upAxis, ang).normalize();
        const cloneBall = this.createBall(origin.clone(), true);
        configureLaunchedBall(cloneBall, cloneDir);
      }
    }

    soundManager.playBallThrow();
    return ball;
  }

  private spawnTrailNode(pos: THREE.Vector3, isSuperCharged: boolean) {
    if (this.trailNodes.length >= 45) return;
    const mat = new THREE.MeshBasicMaterial({
      color: isSuperCharged ? 0xfacc15 : 0xff2266,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.sharedTrailGeom, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.trailNodes.push({
      mesh,
      age: 0,
      maxAge: 0.24,
    });
  }

  /**
   * Physics update loop: handles ball flight, clean wall/border ricochets, plasma trail, and damage.
   */
  public update(
    delta: number,
    time: number,
    world: BackroomsWorld,
    fractureEngine: FractureEngine,
    comicEffects: ComicEffectsManager,
    onWallDestroyed: (wall: DestructibleWall) => void,
    entityManager?: SkeletalEntityManager,
    onEntityKilled?: (entity: SkeletalEntity) => void
  ) {
    const gravity = -18.0;
    const floorY = 0.34;
    const ceilingY = world.wallHeight - 0.34;

    // Update plasma afterimage trail nodes
    for (let i = this.trailNodes.length - 1; i >= 0; i--) {
      const node = this.trailNodes[i];
      node.age += delta;
      if (node.age >= node.maxAge) {
        this.scene.remove(node.mesh);
        (node.mesh.material as THREE.Material).dispose();
        this.trailNodes.splice(i, 1);
        continue;
      }
      const p = 1 - node.age / node.maxAge;
      node.mesh.scale.setScalar(Math.max(0.05, p));
      (node.mesh.material as THREE.MeshBasicMaterial).opacity = p * 0.6;
    }

    for (let bIdx = this.balls.length - 1; bIdx >= 0; bIdx--) {
      const ball = this.balls[bIdx];

      if (!ball.isHeld && !ball.isThrown) {
        if (ball.isClone) {
          // Remove expired temporary Multi-Ball clone
          this.scene.remove(ball.mesh);
          this.balls.splice(bIdx, 1);
          continue;
        }
        ball.mesh.visible = true;
        ball.mesh.rotation.y = time * 2.2;
        ball.mesh.position.y = floorY + 0.14 + Math.sin(time * 3.8 + ball.mesh.position.x) * 0.08;
        continue;
      }

      if (ball.isHeld) {
        continue;
      }

      if (ball.isThrown) {
        ball.lifetime += delta;
        if (ball.borderCooldown > 0) ball.borderCooldown -= delta;

        for (const [wid, cd] of ball.wallCooldowns.entries()) {
          if (cd - delta <= 0) ball.wallCooldowns.delete(wid);
          else ball.wallCooldowns.set(wid, cd - delta);
        }

        ball.trailTimer += delta;
        if (ball.trailTimer >= 0.028) {
          ball.trailTimer = 0;
          this.spawnTrailNode(ball.mesh.position, ball.forceMultiplier > 1.35 || ball.isClone);
        }

        ball.velocity.y += gravity * delta;

        const speedMag = ball.velocity.length();
        const steps = Math.min(4, Math.max(1, Math.ceil((speedMag * delta) / 0.35)));
        const stepDelta = delta / steps;
        const bounceRetention = Math.min(0.94, 0.86 + (ball.speedMultiplier - 1) * 0.04);

        for (let step = 0; step < steps; step++) {
          const nextPos = ball.mesh.position.clone().addScaledVector(ball.velocity, stepDelta);

          if (nextPos.y <= floorY) {
            nextPos.y = floorY;
            if (ball.velocity.y < -1.5) {
              ball.velocity.y = Math.abs(ball.velocity.y) * 0.78;
              ball.velocity.x *= 0.95;
              ball.velocity.z *= 0.95;
              ball.bounces++;
              soundManager.playBallBounce(0.95);
            } else {
              ball.velocity.y = 0;
            }
          }

          if (nextPos.y >= ceilingY) {
            nextPos.y = ceilingY;
            ball.velocity.y = -Math.abs(ball.velocity.y) * 0.78;
          }

          // 1. OUTER INDESTRUCTIBLE PERIMETER WALL COLLISION
          const worldW = world.gridWidth * world.cellSize;
          const worldD = world.gridDepth * world.cellSize;
          const borderPad = 0.42 + ball.radius;
          const minX = borderPad;
          const maxX = worldW - borderPad;
          const minZ = borderPad;
          const maxZ = worldD - borderPad;

          let hitOuterBorder = false;
          const borderNormal = new THREE.Vector3();

          if (nextPos.x <= minX) {
            nextPos.x = minX + 0.02;
            ball.velocity.x = Math.max(4.0, Math.abs(ball.velocity.x) * bounceRetention);
            hitOuterBorder = true;
            borderNormal.set(1, 0, 0);
          } else if (nextPos.x >= maxX) {
            nextPos.x = maxX - 0.02;
            ball.velocity.x = -Math.max(4.0, Math.abs(ball.velocity.x) * bounceRetention);
            hitOuterBorder = true;
            borderNormal.set(-1, 0, 0);
          }

          if (nextPos.z <= minZ) {
            nextPos.z = minZ + 0.02;
            ball.velocity.z = Math.max(4.0, Math.abs(ball.velocity.z) * bounceRetention);
            hitOuterBorder = true;
            borderNormal.set(0, 0, 1);
          } else if (nextPos.z >= maxZ) {
            nextPos.z = maxZ - 0.02;
            ball.velocity.z = -Math.max(4.0, Math.abs(ball.velocity.z) * bounceRetention);
            hitOuterBorder = true;
            borderNormal.set(0, 0, -1);
          }

          if (hitOuterBorder && ball.borderCooldown <= 0) {
            ball.borderCooldown = 0.16;
            ball.bounces++;
            soundManager.playMetallicClang();
            comicEffects.spawnShockwave(nextPos, borderNormal, 1.35);
            comicEffects.spawnComicText(nextPos, t().comicUnbreakable);
          }

          // 2. INTERIOR BREAKABLE WALL COLLISIONS
          for (const wall of world.walls.values()) {
            if (wall.isDestroyed || wall.isIndestructible) continue;
            if (ball.wallCooldowns.has(wall.id)) continue;

            const halfW = wall.size.x / 2 + ball.radius;
            const halfD = wall.size.z / 2 + ball.radius;

            const dx = nextPos.x - wall.center.x;
            const dz = nextPos.z - wall.center.z;

            if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
              const overlapX = halfW - Math.abs(dx);
              const overlapZ = halfD - Math.abs(dz);

              const hitNormal = new THREE.Vector3();
              if (overlapX < overlapZ) {
                const sign = dx >= 0 ? 1 : -1;
                nextPos.x = wall.center.x + sign * (halfW + 0.02);
                ball.velocity.x = sign * Math.max(3.5, Math.abs(ball.velocity.x) * bounceRetention);
                hitNormal.set(sign, 0, 0);
              } else {
                const sign = dz >= 0 ? 1 : -1;
                nextPos.z = wall.center.z + sign * (halfD + 0.02);
                ball.velocity.z = sign * Math.max(3.5, Math.abs(ball.velocity.z) * bounceRetention);
                hitNormal.set(0, 0, sign);
              }

              ball.wallCooldowns.set(wall.id, 0.14);
              ball.bounces++;

              const hitPoint = nextPos.clone().addScaledVector(hitNormal, -ball.radius);
              const impactDir = hitNormal.clone().negate();

              const currentSpeed = ball.velocity.length();
              const baseDamage = Math.max(120, currentSpeed * 9.5) * ball.forceMultiplier;

              // Ranged ball impact safely breaks Electric Hazard Walls!
              const destroyed = world.damageWall(
                wall.id,
                baseDamage,
                hitPoint,
                impactDir,
                fractureEngine,
                comicEffects,
                1.35 * ball.forceMultiplier,
                true // isRangedOrSafe
              );

              soundManager.playBallBounce(1.05 + Math.random() * 0.25);
              comicEffects.spawnShockwave(hitPoint, hitNormal, 1.5 * Math.min(2.2, ball.forceMultiplier));
              comicEffects.triggerPunchShake(0.08 * Math.min(2.0, ball.forceMultiplier), 16);

              if (destroyed) {
                onWallDestroyed(wall);
              }

              // If Items Force is upgraded (or wall was electric), splash cleaves nearby walls!
              if (ball.forceMultiplier > 1.15 || wall.variant === 'electric') {
                const splashRadius =
                  wall.variant === 'electric'
                    ? 4.6
                    : 1.6 + Math.min(3.2, (ball.forceMultiplier - 1.0) * 1.4);
                const nearby = world.getWallsInRadius(hitPoint, splashRadius);
                for (const nw of nearby) {
                  if (nw.id === wall.id || nw.isDestroyed || nw.isIndestructible) continue;
                  const splashDestroyed = world.damageWall(
                    nw.id,
                    baseDamage * (wall.variant === 'electric' ? 1.5 : 0.7),
                    nw.center,
                    impactDir,
                    fractureEngine,
                    comicEffects,
                    1.2 * ball.forceMultiplier,
                    true
                  );
                  if (splashDestroyed) {
                    onWallDestroyed(nw);
                  }
                }
              }

              break;
            }
          }

          // 3. SKELETAL ENTITY & BOSS COLLISIONS
          if (entityManager) {
            for (const ent of entityManager.entities) {
              if (ent.isDead || ball.wallCooldowns.has(ent.id)) continue;
              const dx = nextPos.x - ent.position.x;
              const dz = nextPos.z - ent.position.z;
              const hitRadius = (ent.isBoss ? 1.05 : 0.65) + ball.radius;
              const dist = Math.hypot(dx, dz);
              if (dist < hitRadius && nextPos.y < (ent.isBoss ? 3.5 : 2.65)) {
                const nx = dist > 0.01 ? dx / dist : 1;
                const nz = dist > 0.01 ? dz / dist : 0;
                nextPos.x = ent.position.x + nx * (hitRadius + 0.04);
                nextPos.z = ent.position.z + nz * (hitRadius + 0.04);

                const speedNow = Math.max(8.0, ball.velocity.length() * bounceRetention);
                ball.velocity.x = nx * speedNow;
                ball.velocity.z = nz * speedNow;
                ball.wallCooldowns.set(ent.id, 0.16);
                ball.bounces++;

                const dmg = Math.max(160, speedNow * 11.0) * ball.forceMultiplier;
                const killed = entityManager.damageEntity(
                  ent.id,
                  dmg,
                  nextPos.clone(),
                  new THREE.Vector3(-nx, 0.2, -nz).normalize(),
                  fractureEngine,
                  comicEffects
                );
                if (killed && onEntityKilled) {
                  onEntityKilled(ent);
                }
                break;
              }
            }
          }

          ball.mesh.position.copy(nextPos);
        }

        ball.mesh.rotation.x += ball.rotVelocity.x * delta;
        ball.mesh.rotation.y += ball.rotVelocity.y * delta;
        ball.mesh.rotation.z += ball.rotVelocity.z * delta;

        const horizSpeed = Math.hypot(ball.velocity.x, ball.velocity.z);
        if ((horizSpeed < 1.4 && ball.mesh.position.y <= floorY + 0.06) || ball.lifetime > ball.maxLifetime) {
          ball.isThrown = false;
          ball.velocity.set(0, 0, 0);
          ball.rotVelocity.set(0, 0, 0);
          ball.mesh.position.y = floorY;
        }
      }
    }
  }

  public clearAll() {
    for (const ball of this.balls) {
      this.scene.remove(ball.mesh);
    }
    this.balls = [];
    this.heldBall = null;

    for (const node of this.trailNodes) {
      this.scene.remove(node.mesh);
      (node.mesh.material as THREE.Material).dispose();
    }
    this.trailNodes = [];
  }
}
