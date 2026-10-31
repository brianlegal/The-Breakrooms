/**
 * PILAR 8: Agente Inteligente de Moedas Físicas no Chão (CoinDropAgent)
 * - Object Pooling estrito (máximo de 64 moedas 3D ativas simultaneamente na cena).
 * - Quando uma parede quebra (ou entidade é derrotada), instancia moedas físicas 3D
 *   dividindo proporcionalmente o valor total (`totalCoinReward`).
 * - Nos Andares JACKPOT (`isJackpotBurst === true`), despeja uma fonte espetacular de 8 a 10
 *   moedas douradas por parede quebrada!
 * - Caso o limite do pool seja atingido, absorve e redistribui o valor proporcionalmente
 *   nas moedas físicas mais próximas já presentes no chão (0 perda de moedas, 60 FPS cravados).
 */

import * as THREE from 'three';
import { materialFactory } from './materials';

export interface PhysicalCoin {
  active: boolean;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  value: number;
  bounces: number;
  spinPhase: number;
  age: number;
}

export class CoinDropAgent {
  private scene: THREE.Scene;
  private pool: PhysicalCoin[] = [];
  private readonly maxPoolSize = 64;
  private readonly floorY = 0.22;
  private readonly gravity = -18.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
  }

  private initPool() {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.85,
    });
    const innerRimMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.9,
    });

    // Coin cylinder oriented upright so it spins around Y axis
    const outerGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.065, 16);
    outerGeo.rotateZ(Math.PI / 2);

    const innerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.078, 8);
    innerGeo.rotateZ(Math.PI / 2);

    for (let i = 0; i < this.maxPoolSize; i++) {
      const group = new THREE.Group();
      group.visible = false;

      const bodyMesh = new THREE.Mesh(outerGeo, goldMat);
      bodyMesh.add(materialFactory.createOutlineMesh(outerGeo, 0.018, 0x000000, 0xffffff));
      group.add(bodyMesh);

      const coreMesh = new THREE.Mesh(innerGeo, innerRimMat);
      group.add(coreMesh);

      this.scene.add(group);

      this.pool.push({
        active: false,
        mesh: group,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        value: 1,
        bounces: 0,
        spinPhase: Math.random() * Math.PI * 2,
        age: 0,
      });
    }
  }

  public clearAll() {
    for (const coin of this.pool) {
      coin.active = false;
      coin.mesh.visible = false;
      coin.value = 0;
    }
  }

  /**
   * Sweeps and collects all active coins currently on the floor (used when a Jackpot Floor timer ends).
   */
  public collectAllRemainingCoins(): number {
    let total = 0;
    for (const coin of this.pool) {
      if (coin.active) {
        total += coin.value;
        coin.active = false;
        coin.mesh.visible = false;
        coin.value = 0;
      }
    }
    return total;
  }

  /**
   * Intelligent Coin Dropper:
   * Spawns 3 to 5 physical 3D coins (or 8 to 10 on Jackpot Floors!) at `origin` whose values sum to `totalCoinReward`.
   * If the pool is full, merges the reward proportionally into the nearest active coins.
   */
  public spawnCoinDrop(origin: THREE.Vector3, totalCoinReward: number, isJackpotBurst = false) {
    const reward = Math.max(1, Math.round(totalCoinReward));

    const desiredCount = isJackpotBurst
      ? 9
      : reward >= 60
      ? 5
      : reward >= 24
      ? 4
      : 3;

    const freeCoins: PhysicalCoin[] = [];
    for (const c of this.pool) {
      if (!c.active) {
        freeCoins.push(c);
        if (freeCoins.length >= desiredCount) break;
      }
    }

    // If pool is completely full, merge proportionally into nearest active coins!
    if (freeCoins.length === 0) {
      const activeCoins = this.pool
        .filter((c) => c.active)
        .sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));

      const mergeTargets = activeCoins.slice(0, Math.min(6, activeCoins.length));
      if (mergeTargets.length > 0) {
        const baseShare = Math.floor(reward / mergeTargets.length);
        let remainder = reward - baseShare * mergeTargets.length;
        for (const target of mergeTargets) {
          const extra = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder--;
          target.value += baseShare + extra;
          if (target.position.y <= this.floorY + 0.05) {
            target.velocity.y = 3.0;
          }
          target.mesh.scale.setScalar(1.26);
        }
      }
      return;
    }

    const spawnCount = freeCoins.length;
    const baseVal = Math.floor(reward / spawnCount);
    let remainder = reward - baseVal * spawnCount;

    for (let i = 0; i < spawnCount; i++) {
      const coin = freeCoins[i];
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;

      const coinValue = Math.max(1, baseVal + extra);

      const angle = (i / spawnCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
      const radialSpeed = isJackpotBurst
        ? 2.8 + Math.random() * 2.8
        : 2.1 + Math.random() * 1.9;

      coin.active = true;
      coin.value = coinValue;
      coin.bounces = 0;
      coin.age = 0;
      coin.spinPhase = Math.random() * Math.PI * 2;

      coin.position.set(
        origin.x + Math.cos(angle) * 0.28,
        Math.max(0.65, origin.y * 0.55),
        origin.z + Math.sin(angle) * 0.28
      );

      coin.velocity.set(
        Math.cos(angle) * radialSpeed,
        (isJackpotBurst ? 4.8 : 3.8) + Math.random() * 2.0,
        Math.sin(angle) * radialSpeed
      );

      coin.mesh.position.copy(coin.position);
      coin.mesh.scale.setScalar(isJackpotBurst ? 1.2 : coinValue >= 25 ? 1.15 : 1.0);
      coin.mesh.visible = true;
    }
  }

  /**
   * Updates all active physical coins:
   * - Gravity & 1–2 light floor bounces at y = 0.22
   * - Continuous arcade spin
   * - Magnetic pull & physical pickup
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    hasCoinMagnet: boolean,
    worldMaxX: number,
    worldMaxZ: number,
    onCollectCoin: (amount: number, pickupPos: THREE.Vector3) => void,
    isJackpotFloor = false
  ) {
    const collectRadius = isJackpotFloor ? 2.15 : 1.85;
    const collectRadiusSq = collectRadius * collectRadius;
    const magnetRadius = hasCoinMagnet ? 7.2 : isJackpotFloor ? 4.2 : 2.35;
    const magnetRadiusSq = magnetRadius * magnetRadius;

    const minBound = 0.65;
    const maxBoundX = Math.max(2.0, worldMaxX - 0.65);
    const maxBoundZ = Math.max(2.0, worldMaxZ - 0.65);

    for (const coin of this.pool) {
      if (!coin.active) continue;

      coin.age += delta;

      const dx = playerPos.x - coin.position.x;
      const dz = playerPos.z - coin.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= collectRadiusSq && coin.age >= 0.08) {
        const val = coin.value;
        const pos = coin.position.clone();
        coin.active = false;
        coin.mesh.visible = false;
        onCollectCoin(val, pos);
        continue;
      }

      if (distSq <= magnetRadiusSq && coin.age >= 0.12) {
        const dist = Math.max(0.1, Math.sqrt(distSq));
        const pullSpeed = hasCoinMagnet ? 16.5 : isJackpotFloor ? 11.5 : 6.5;
        coin.velocity.x = (dx / dist) * pullSpeed;
        coin.velocity.z = (dz / dist) * pullSpeed;
        coin.position.y = THREE.MathUtils.lerp(coin.position.y, 0.55, delta * 6);
      } else {
        if (coin.position.y > this.floorY || coin.velocity.y > 0) {
          coin.velocity.y += this.gravity * delta;
          coin.position.y += coin.velocity.y * delta;

          if (coin.position.y <= this.floorY) {
            coin.position.y = this.floorY;
            coin.bounces += 1;
            if (coin.bounces === 1) {
              coin.velocity.y = Math.abs(coin.velocity.y) * 0.38;
              coin.velocity.x *= 0.62;
              coin.velocity.z *= 0.62;
            } else if (coin.bounces === 2 && Math.abs(coin.velocity.y) > 0.9) {
              coin.velocity.y = Math.abs(coin.velocity.y) * 0.22;
              coin.velocity.x *= 0.45;
              coin.velocity.z *= 0.45;
            } else {
              coin.velocity.y = 0;
              coin.velocity.x = 0;
              coin.velocity.z = 0;
            }
          }
        } else {
          coin.velocity.x = THREE.MathUtils.damp(coin.velocity.x, 0, 8, delta);
          coin.velocity.z = THREE.MathUtils.damp(coin.velocity.z, 0, 8, delta);
        }
      }

      coin.position.x += coin.velocity.x * delta;
      coin.position.z += coin.velocity.z * delta;

      if (coin.position.x < minBound) {
        coin.position.x = minBound;
        coin.velocity.x = Math.abs(coin.velocity.x) * 0.5;
      } else if (coin.position.x > maxBoundX) {
        coin.position.x = maxBoundX;
        coin.velocity.x = -Math.abs(coin.velocity.x) * 0.5;
      }

      if (coin.position.z < minBound) {
        coin.position.z = minBound;
        coin.velocity.z = Math.abs(coin.velocity.z) * 0.5;
      } else if (coin.position.z > maxBoundZ) {
        coin.position.z = maxBoundZ;
        coin.velocity.z = -Math.abs(coin.velocity.z) * 0.5;
      }

      coin.spinPhase += delta * 5.6;
      const hoverOffset =
        coin.bounces >= 2 ? Math.sin(coin.spinPhase * 1.4) * 0.045 : 0;

      coin.mesh.position.set(
        coin.position.x,
        coin.position.y + hoverOffset,
        coin.position.z
      );
      coin.mesh.rotation.y = coin.spinPhase;
    }
  }
}
