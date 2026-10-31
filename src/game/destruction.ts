/**
 * Zero-Leak Pooled Irregular Wall Fracture Engine.
 * - Pre-allocates 12 irregular polyhedron geometries + EdgesGeometry and shared biome dust materials ONCE in constructor.
 * - Recycles fragment Groups via an Object Pool (zero runtime geometry/material allocations or GPU memory leaks).
 * - Uses 100% biome-accurate shard cores and dust colors (White/Cyan in Poolrooms, Concrete/Rust in Pipe Dreams, etc.).
 * - Automatically darkens fragments as soon as they settle on the floor (`isGrounded = true`) so standing walls pop!
 */
import * as THREE from 'three';
import { materialFactory } from './materials';
import { WallVariant, BiomeType } from './textures';

export interface Fragment {
  mesh: THREE.Group;
  innerMesh: THREE.Mesh;
  outlineGroup: THREE.Group;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  baseScale: THREE.Vector3;
  age: number;
  maxAge: number;
  isGrounded: boolean;
  isDust: boolean;
  variant: WallVariant;
  biome: BiomeType;
  isEntityBone: boolean;
}

interface PrecomputedChunkShape {
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
}

const MAX_ACTIVE_FRAGMENTS = 190;

export class FractureEngine {
  private fragments: Fragment[] = [];
  private fragmentPool: Fragment[] = [];
  private dustPool: Fragment[] = [];
  private scene: THREE.Scene;

  // Pre-allocated geometries & biome dust materials (created ONCE in constructor)
  private chunkShapes: PrecomputedChunkShape[] = [];
  private dustGeom: THREE.DodecahedronGeometry;
  private dustEdges: THREE.EdgesGeometry;
  private dustMatsByBiome: Record<BiomeType, THREE.MeshToonMaterial>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Pre-compute 12 unit-sized irregular polyhedron geometries & their EdgesGeometry
    for (let i = 0; i < 12; i++) {
      const geom = this.createUnitIrregularGeometry();
      const edges = new THREE.EdgesGeometry(geom, 22);
      this.chunkShapes.push({ geometry: geom, edges });
    }

    // 2. Pre-compute shared dust puff geometry, edges, and biome-matched dust materials
    this.dustGeom = new THREE.DodecahedronGeometry(1.0, 0);
    this.dustEdges = new THREE.EdgesGeometry(this.dustGeom);
    const ramp = materialFactory.getToonRamp();

    this.dustMatsByBiome = {
      level0: new THREE.MeshToonMaterial({
        color: 0xeadbb8,
        transparent: true,
        opacity: 0.82,
        gradientMap: ramp,
      }),
      poolrooms: new THREE.MeshToonMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.85,
        gradientMap: ramp,
      }),
      pipedreams: new THREE.MeshToonMaterial({
        color: 0x71717a,
        transparent: true,
        opacity: 0.85,
        gradientMap: ramp,
      }),
      hospital: new THREE.MeshToonMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.85,
        gradientMap: ramp,
      }),
    };
  }

  /**
   * Builds a unit (1x1x1) irregular polyhedron chunk with jittered vertices.
   */
  private createUnitIrregularGeometry(): THREE.BufferGeometry {
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      const jitter = 0.22;
      pos.setXYZ(
        i,
        vx + (Math.random() - 0.5) * jitter,
        vy + (Math.random() - 0.5) * jitter,
        vz + (Math.random() - 0.5) * jitter
      );
    }

    geom.computeVertexNormals();
    return geom;
  }

  private acquireWallFragment(
    variant: WallVariant,
    biome: BiomeType,
    isEntityBone = false
  ): Fragment {
    if (this.fragments.length >= MAX_ACTIVE_FRAGMENTS) {
      const oldestIdx = this.fragments.findIndex((f) => f.isGrounded);
      const idxToRecycle = oldestIdx !== -1 ? oldestIdx : 0;
      this.releaseFragmentAt(idxToRecycle);
    }

    const wallMat = isEntityBone
      ? materialFactory.getEntityMaterial()
      : materialFactory.getWallMaterial(variant, biome);
    const coreMat = isEntityBone
      ? materialFactory.getEntityMaterial()
      : materialFactory.getDrywallCoreMaterial(biome);

    const matArray = [wallMat, wallMat, coreMat, coreMat, wallMat, coreMat];

    let frag = this.fragmentPool.pop();
    if (!frag) {
      const shape = this.chunkShapes[Math.floor(Math.random() * this.chunkShapes.length)];
      const group = new THREE.Group();
      const innerMesh = new THREE.Mesh(shape.geometry, matArray);
      const outlineGroup = materialFactory.createDuoEdgeLines(
        shape.geometry,
        22,
        true,
        shape.edges
      );

      group.add(innerMesh);
      group.add(outlineGroup);

      frag = {
        mesh: group,
        innerMesh,
        outlineGroup,
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        baseScale: new THREE.Vector3(1, 1, 1),
        age: 0,
        maxAge: 6.0,
        isGrounded: false,
        isDust: false,
        variant,
        biome,
        isEntityBone,
      };
    } else {
      frag.innerMesh.material = matArray;
      frag.variant = variant;
      frag.biome = biome;
      frag.isEntityBone = isEntityBone;
    }

    return frag;
  }

  private acquireDustFragment(biome: BiomeType = 'level0'): Fragment {
    if (this.fragments.length >= MAX_ACTIVE_FRAGMENTS) {
      this.releaseFragmentAt(0);
    }

    const dustMat = this.dustMatsByBiome[biome] || this.dustMatsByBiome.level0;

    let frag = this.dustPool.pop();
    if (!frag) {
      const group = new THREE.Group();
      const innerMesh = new THREE.Mesh(this.dustGeom, dustMat);
      const outline = new THREE.LineSegments(
        this.dustEdges,
        materialFactory.getCartoonLineMaterial()
      );
      innerMesh.add(outline);
      group.add(innerMesh);

      frag = {
        mesh: group,
        innerMesh,
        outlineGroup: group,
        velocity: new THREE.Vector3(),
        rotVelocity: new THREE.Vector3(),
        baseScale: new THREE.Vector3(0.2, 0.2, 0.2),
        age: 0,
        maxAge: 0.9,
        isGrounded: false,
        isDust: true,
        variant: 'normal',
        biome,
        isEntityBone: false,
      };
    } else {
      frag.innerMesh.material = dustMat;
      frag.biome = biome;
    }
    return frag;
  }

  private releaseFragmentAt(index: number) {
    const frag = this.fragments[index];
    if (!frag) return;
    this.scene.remove(frag.mesh);
    this.fragments.splice(index, 1);
    if (frag.isDust) {
      this.dustPool.push(frag);
    } else {
      this.fragmentPool.push(frag);
    }
  }

  /**
   * Spawns an explosion of irregular chunks from a destroyed wall piece using the Object Pool.
   */
  public fractureWall(
    center: THREE.Vector3,
    size: THREE.Vector3,
    punchDir: THREE.Vector3,
    wallVariant: WallVariant = 'normal',
    punchForce = 1.0,
    biome: BiomeType = 'level0'
  ) {
    const chunkCount = 22;
    const rows = 4;
    const cols = 3;
    const depths = 2;

    const cellW = size.x / cols;
    const cellH = size.y / rows;
    const cellD = size.z / depths;

    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let d = 0; d < depths; d++) {
          if (index >= chunkCount) break;
          index++;

          const jitterX = (Math.random() - 0.5) * cellW * 0.7;
          const jitterY = (Math.random() - 0.5) * cellH * 0.7;
          const jitterZ = (Math.random() - 0.5) * cellD * 0.5;

          const posX = center.x - size.x / 2 + (c + 0.5) * cellW + jitterX;
          const posY = center.y - size.y / 2 + (r + 0.5) * cellH + jitterY;
          const posZ = center.z - size.z / 2 + (d + 0.5) * cellD + jitterZ;

          const w = cellW * (0.62 + Math.random() * 0.68);
          const h = cellH * (0.62 + Math.random() * 0.68);
          const depth = cellD * (0.78 + Math.random() * 0.5);

          const frag = this.acquireWallFragment(wallVariant, biome, false);
          frag.baseScale.set(w, h, depth);
          frag.mesh.scale.copy(frag.baseScale);
          frag.mesh.position.set(posX, posY, posZ);
          frag.mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );

          const radial = new THREE.Vector3(
            (posX - center.x) * 2.8,
            (posY - center.y) * 2.2 + 0.8,
            (posZ - center.z) * 2.8
          ).normalize();

          const baseSpeed = (6.0 + Math.random() * 8.0) * Math.min(2.4, punchForce);
          frag.velocity
            .copy(punchDir)
            .multiplyScalar(baseSpeed * 0.8)
            .addScaledVector(radial, baseSpeed * 0.5);
          frag.velocity.y += 2.0 + Math.random() * 3.5;

          frag.rotVelocity.set(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
          );
          frag.age = 0;
          frag.maxAge = 6.0 + Math.random() * 2.5;
          frag.isGrounded = false;

          this.scene.add(frag.mesh);
          this.fragments.push(frag);
        }
      }
    }

    this.spawnDustCloud(center, 10, biome);
  }

  /**
   * Shatters a killed Skeletal Backrooms Entity into pitch-black & white-outlined bone shards using the Object Pool.
   */
  public fractureEntity(center: THREE.Vector3, hitDir: THREE.Vector3, isBoss = false) {
    const boneCount = isBoss ? 32 : 20;
    const scaleMult = isBoss ? 1.55 : 1.0;

    for (let i = 0; i < boneCount; i++) {
      const isLongBone = i % 2 === 0;
      const w = (isLongBone ? 0.12 : 0.24) * scaleMult;
      const h = (isLongBone ? 0.55 + Math.random() * 0.35 : 0.24) * scaleMult;
      const d = (isLongBone ? 0.12 : 0.22) * scaleMult;

      const frag = this.acquireWallFragment('normal', 'level0', true);
      frag.baseScale.set(w, h, d);
      frag.mesh.scale.copy(frag.baseScale);
      frag.mesh.position.set(
        center.x + (Math.random() - 0.5) * 0.7 * scaleMult,
        0.5 + Math.random() * 2.1 * scaleMult,
        center.z + (Math.random() - 0.5) * 0.7 * scaleMult
      );

      const radial = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0.6 + Math.random() * 1.4,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 7 + Math.random() * 9;
      frag.velocity
        .copy(hitDir)
        .multiplyScalar(speed * 0.65)
        .addScaledVector(radial, speed * 0.6);

      frag.rotVelocity.set(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18
      );
      frag.age = 0;
      frag.maxAge = 5.0 + Math.random() * 2.0;
      frag.isGrounded = false;

      this.scene.add(frag.mesh);
      this.fragments.push(frag);
    }
  }

  private spawnDustCloud(pos: THREE.Vector3, count: number, biome: BiomeType = 'level0') {
    for (let i = 0; i < count; i++) {
      const radius = 0.16 + Math.random() * 0.24;
      const frag = this.acquireDustFragment(biome);
      frag.baseScale.setScalar(radius);
      frag.mesh.scale.copy(frag.baseScale);

      frag.mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.8,
        pos.y + (Math.random() - 0.5) * 0.8,
        pos.z + (Math.random() - 0.5) * 0.8
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      frag.velocity.set(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 2.5,
        Math.sin(angle) * speed
      );
      frag.rotVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
      frag.age = 0;
      frag.maxAge = 0.75 + Math.random() * 0.45;
      frag.isGrounded = false;

      this.scene.add(frag.mesh);
      this.fragments.push(frag);
    }
  }

  /**
   * Updates all active fragments and recycles expired ones back into the Object Pool.
   */
  public update(delta: number) {
    const gravity = -19.6;
    const floorY = 0.12;

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      frag.age += delta;

      if (frag.age >= frag.maxAge) {
        this.releaseFragmentAt(i);
        continue;
      }

      frag.velocity.y += gravity * delta;
      frag.mesh.position.addScaledVector(frag.velocity, delta);

      if (frag.mesh.position.y <= floorY) {
        frag.mesh.position.y = floorY;
        if (frag.velocity.y < -1.0) {
          frag.velocity.y = -frag.velocity.y * 0.32;
          frag.velocity.x *= 0.65;
          frag.velocity.z *= 0.65;
          frag.rotVelocity.multiplyScalar(0.7);
        } else if (!frag.isGrounded) {
          frag.velocity.set(0, 0, 0);
          frag.rotVelocity.set(0, 0, 0);
          frag.isGrounded = true;

          // Darken grounded wall debris with biome-specific tint so standing walls pop!
          if (!frag.isDust && !frag.isEntityBone) {
            const darkWall = materialFactory.getGroundedWallMaterial(frag.variant, frag.biome);
            const darkCore = materialFactory.getGroundedCoreMaterial(frag.biome);
            frag.innerMesh.material = [
              darkWall,
              darkWall,
              darkCore,
              darkCore,
              darkWall,
              darkCore,
            ];
          }
        }
      }

      if (!frag.isGrounded) {
        frag.mesh.rotation.x += frag.rotVelocity.x * delta;
        frag.mesh.rotation.y += frag.rotVelocity.y * delta;
        frag.mesh.rotation.z += frag.rotVelocity.z * delta;
      }

      const fadeWindow = frag.isDust ? 0.4 : 1.4;
      const remainingTime = frag.maxAge - frag.age;
      if (remainingTime < fadeWindow) {
        const s = Math.max(0.001, remainingTime / fadeWindow);
        frag.mesh.scale.copy(frag.baseScale).multiplyScalar(s);
      }
    }
  }

  public clearAll() {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      this.releaseFragmentAt(i);
    }
  }
}
