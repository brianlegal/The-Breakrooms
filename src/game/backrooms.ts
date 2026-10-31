/**
 * Backrooms Escalating Room Generator, 4-Biome 3D Architecture & Wall Management System.
 * - Biome 1 ('level0', Lv. 1–3): Classic Yellow Wallpaper + 3D Square Office Pillars
 * - Biome 2 ('poolrooms', Lv. 4–6): White/Cyan Tiles + 3D Translucent Water Layer (y = 0.16) + 3D Cylindrical Tile Columns
 * - Biome 3 ('pipedreams', Lv. 7–9): Dark Concrete + 3D Cylindrical Ceiling Steam Pipes & Flanges + Amber Industrial Lights
 * - Biome 4 ('hospital', Lv. 10+): Level "!" Red Emergency Hospital Corridor + Crimson Bio-Containment Pillars & Strobes
 */
import * as THREE from 'three';
import { materialFactory } from './materials';
import { textureFactory, WallVariant, BiomeType } from './textures';
import { FractureEngine } from './destruction';
import { ComicEffectsManager } from './comicEffects';
import { soundManager } from './audio';
import { progressionManager } from './progression';
import { t } from './i18n';

export interface DestructibleWall {
  id: string;
  gridX: number;
  gridZ: number;
  orientation: 'H' | 'V';
  meshGroup: THREE.Group;
  collider: THREE.Box3;
  health: number;
  maxHealth: number;
  variant: WallVariant;
  biome: BiomeType;
  size: THREE.Vector3;
  center: THREE.Vector3;
  isDestroyed: boolean;
  isIndestructible: boolean;
  hitShakeTimer: number;
  rebuildDelayTimer: number;
  rebuildAnimProgress: number;
  crackMesh?: THREE.LineSegments;
}

export interface PowerUpItem {
  id: string;
  type: 'mega_gloves' | 'almond_water' | 'golden_fists';
  mesh: THREE.Group;
  position: THREE.Vector3;
  isCollected: boolean;
}

export class BackroomsWorld {
  public scene: THREE.Scene;
  public walls: Map<string, DestructibleWall> = new Map();
  public powerUps: PowerUpItem[] = [];
  public startPosition: THREE.Vector3 = new THREE.Vector3(2.0, 1.6, 2.0);
  public currentBiome: BiomeType = 'level0';
  public isJackpotFloor = false;

  public readonly cellSize = 4.0;
  public readonly wallHeight = 3.6;
  public readonly wallThickness = 0.36;
  public gridWidth = 4;
  public gridDepth = 4;

  private floorMesh: THREE.Mesh | null = null;
  private waterLayerMesh: THREE.Mesh | null = null;
  private ceilingMesh: THREE.Mesh | null = null;
  private fixtureMeshes: THREE.Object3D[] = [];
  private flickeringLights: THREE.PointLight[] = [];
  private pillarColliders: Array<{ x: number; z: number; radius: number }> = [];
  public onElectricShockPenalty?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Generates a Backrooms room scaled to the current Level, Biome, Jackpot status, and breakable wall target.
   */
  public generate(
    level = 1,
    targetBreakableWalls = 8,
    gridWidth = 4,
    gridDepth = 4,
    biome: BiomeType = 'level0',
    isJackpotFloor = false
  ) {
    this.clear();

    this.gridWidth = gridWidth;
    this.gridDepth = gridDepth;
    this.currentBiome = biome;
    this.isJackpotFloor = isJackpotFloor;

    // Update scene atmosphere to match the 4 Distinct Biomes (or Gleaming Golden Vault on Jackpot Floors!)
    const bgHex = isJackpotFloor
      ? 0xd97706
      : biome === 'poolrooms'
      ? 0x0e7490
      : biome === 'pipedreams'
      ? 0x18181b
      : biome === 'hospital'
      ? 0x2a0808
      : 0xb8a356;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(
      bgHex,
      isJackpotFloor ? 0.028 : biome === 'pipedreams' ? 0.044 : biome === 'hospital' ? 0.042 : 0.035
    );

    const worldWidth = this.gridWidth * this.cellSize;
    const worldDepth = this.gridDepth * this.cellSize;

    // 1. FLOOR (Gleaming Gold Floor on Jackpot Floors!)
    const floorGeom = new THREE.PlaneGeometry(worldWidth + 6, worldDepth + 6);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = isJackpotFloor
      ? materialFactory.getWallMaterial('golden', 'level0')
      : materialFactory.getFloorMaterial(biome);
    if (floorMat.map) {
      floorMat.map.repeat.set(this.gridWidth * 1.5, this.gridDepth * 1.5);
    }
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.position.set(worldWidth / 2, 0, worldDepth / 2);
    this.scene.add(this.floorMesh);

    // 1B. BIOME 2 (POOLROOMS): 3D TRANSLUCENT WATER LAYER AT y = 0.16!
    if (biome === 'poolrooms' && !isJackpotFloor) {
      const waterGeom = new THREE.PlaneGeometry(worldWidth + 4, worldDepth + 4);
      waterGeom.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x0891b2,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.46,
        roughness: 0.12,
        metalness: 0.25,
      });
      this.waterLayerMesh = new THREE.Mesh(waterGeom, waterMat);
      this.waterLayerMesh.position.set(worldWidth / 2, 0.16, worldDepth / 2);
      this.scene.add(this.waterLayerMesh);
    }

    // 2. CEILING
    const ceilGeom = new THREE.PlaneGeometry(worldWidth + 6, worldDepth + 6);
    ceilGeom.rotateX(Math.PI / 2);
    const ceilMat = isJackpotFloor
      ? materialFactory.getWallMaterial('golden', 'level0')
      : materialFactory.getCeilingMaterial(biome);
    if (ceilMat.map) {
      ceilMat.map.repeat.set(this.gridWidth, this.gridDepth);
    }
    this.ceilingMesh = new THREE.Mesh(ceilGeom, ceilMat);
    this.ceilingMesh.position.set(worldWidth / 2, this.wallHeight, worldDepth / 2);
    this.scene.add(this.ceilingMesh);

    // 3. CEILING LIGHT FIXTURES & 3D BIOME ARCHITECTURAL STRUCTURES
    this.spawnFluorescentLights(isJackpotFloor ? 'level0' : biome);
    this.spawnBiomeArchitecture(isJackpotFloor ? 'level0' : biome, worldWidth, worldDepth);

    // 4. GENERATE ESCALATING ROOM WALLS
    this.generateRoomWalls(level, targetBreakableWalls, biome);

    // 5. POWER-UP ANOMALIES
    this.spawnPowerUps(level);
  }

  private spawnFluorescentLights(biome: BiomeType) {
    const lightColor =
      biome === 'poolrooms'
        ? 0xa5f3fc
        : biome === 'pipedreams'
        ? 0xfb923c
        : biome === 'hospital'
        ? 0xff2222
        : 0xffecb3;
    const fixtureMat = new THREE.MeshBasicMaterial({ color: lightColor });
    const casingMat = materialFactory.getCartoonLineMaterial();

    const step = this.gridWidth <= 5 ? 2 : 3;
    for (let x = 1; x < this.gridWidth; x += step) {
      for (let z = 1; z < this.gridDepth; z += step) {
        const posX = x * this.cellSize + this.cellSize * 0.5;
        const posZ = z * this.cellSize + this.cellSize * 0.5;

        const fixtureGeom = new THREE.BoxGeometry(1.6, 0.12, 0.5);
        const fixtureMesh = new THREE.Mesh(fixtureGeom, fixtureMat);
        fixtureMesh.position.set(posX, this.wallHeight - 0.06, posZ);

        const edges = new THREE.EdgesGeometry(fixtureGeom);
        const outline = new THREE.LineSegments(edges, casingMat);
        fixtureMesh.add(outline);

        this.scene.add(fixtureMesh);
        this.fixtureMeshes.push(fixtureMesh);

        const light = new THREE.PointLight(
          lightColor,
          biome === 'hospital' ? 1.85 : 1.55,
          12.0
        );
        light.position.set(posX, this.wallHeight - 0.4, posZ);
        this.scene.add(light);
        this.fixtureMeshes.push(light);

        if (biome === 'hospital' || Math.random() < 0.35) {
          this.flickeringLights.push(light);
        }
      }
    }
  }

  /**
   * Spawns 3D Architectural Props unique to each Biome:
   * - 'level0': Square Office Structural Pillars at intersections
   * - 'poolrooms': Cylindrical White/Cyan Ceramic Columns with Aqua Rings
   * - 'pipedreams': 3D Overhead Steam Pipes with Flanges & Vertical Rusted Conduits
   * - 'hospital': Emergency Containment Columns with Red Alert Beacon Rings
   */
  private spawnBiomeArchitecture(biome: BiomeType, worldWidth: number, worldDepth: number) {
    const lineMat = materialFactory.getCartoonLineMaterial();
    const ramp = materialFactory.getToonRamp();

    // Place structural columns at interior grid intersections (every 2 cells, away from spawn)
    for (let gx = 2; gx < this.gridWidth; gx += 2) {
      for (let gz = 2; gz < this.gridDepth; gz += 2) {
        const px = gx * this.cellSize;
        const pz = gz * this.cellSize;

        if (biome === 'level0') {
          // 3D Square Office Pillar (Solid Gold on Jackpot Floors!)
          const colGeo = new THREE.BoxGeometry(0.56, this.wallHeight, 0.56);
          const colMat = materialFactory.getWallMaterial(
            this.isJackpotFloor ? 'golden' : 'normal',
            'level0'
          );
          const colMesh = new THREE.Mesh(colGeo, colMat);
          colMesh.position.set(px, this.wallHeight / 2, pz);
          colMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(colGeo), lineMat));
          this.scene.add(colMesh);
          this.fixtureMeshes.push(colMesh);
          this.pillarColliders.push({ x: px, z: pz, radius: 0.48 });
        } else if (biome === 'poolrooms') {
          // 3D Cylindrical Poolrooms Ceramic Tile Column
          const colGroup = new THREE.Group();
          colGroup.position.set(px, 0, pz);

          const cylGeo = new THREE.CylinderGeometry(0.38, 0.38, this.wallHeight, 14);
          const cylMat = materialFactory.getWallMaterial('normal', 'poolrooms');
          const cylMesh = new THREE.Mesh(cylGeo, cylMat);
          cylMesh.position.y = this.wallHeight / 2;
          cylMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(cylGeo, 25), lineMat));
          colGroup.add(cylMesh);

          // Aqua base & capital rings
          const ringGeo = new THREE.CylinderGeometry(0.48, 0.50, 0.28, 14);
          const ringMat = new THREE.MeshToonMaterial({ color: 0x06b6d4, gradientMap: ramp });
          const baseRing = new THREE.Mesh(ringGeo, ringMat);
          baseRing.position.y = 0.18;
          colGroup.add(baseRing);

          const topRing = new THREE.Mesh(ringGeo, ringMat);
          topRing.position.y = this.wallHeight - 0.14;
          colGroup.add(topRing);

          this.scene.add(colGroup);
          this.fixtureMeshes.push(colGroup);
          this.pillarColliders.push({ x: px, z: pz, radius: 0.52 });
        } else if (biome === 'pipedreams') {
          // Vertical Rusted Steam Riser Column with Valve Wheel
          const pipeColGroup = new THREE.Group();
          pipeColGroup.position.set(px, 0, pz);

          const pipeGeo = new THREE.CylinderGeometry(0.28, 0.28, this.wallHeight, 12);
          const pipeMat = new THREE.MeshToonMaterial({ color: 0x9a3412, gradientMap: ramp });
          const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
          pipeMesh.position.y = this.wallHeight / 2;
          pipeMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(pipeGeo, 25), lineMat));
          pipeColGroup.add(pipeMesh);

          // Iron flange collars
          const flangeGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 12);
          const flangeMat = new THREE.MeshToonMaterial({ color: 0x27272a, gradientMap: ramp });
          for (const fy of [0.8, 1.8, 2.8]) {
            const flange = new THREE.Mesh(flangeGeo, flangeMat);
            flange.position.y = fy;
            pipeColGroup.add(flange);
          }

          this.scene.add(pipeColGroup);
          this.fixtureMeshes.push(pipeColGroup);
          this.pillarColliders.push({ x: px, z: pz, radius: 0.45 });
        } else if (biome === 'hospital') {
          // Level "!" Red Emergency Hospital Containment Pillar
          const hospGroup = new THREE.Group();
          hospGroup.position.set(px, 0, pz);

          const colGeo = new THREE.BoxGeometry(0.58, this.wallHeight, 0.58);
          const colMat = materialFactory.getWallMaterial('normal', 'hospital');
          const colMesh = new THREE.Mesh(colGeo, colMat);
          colMesh.position.y = this.wallHeight / 2;
          colMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(colGeo), lineMat));
          hospGroup.add(colMesh);

          // Glowing Crimson Beacon Band
          const beaconGeo = new THREE.BoxGeometry(0.64, 0.26, 0.64);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.y = 2.6;
          hospGroup.add(beacon);

          this.scene.add(hospGroup);
          this.fixtureMeshes.push(hospGroup);
          this.pillarColliders.push({ x: px, z: pz, radius: 0.50 });
        }
      }
    }

    // BIOME 3 ('pipedreams'): 3D Overhead Ceiling Steam Pipes running across the hall!
    if (biome === 'pipedreams') {
      const steamPipeMat = new THREE.MeshToonMaterial({ color: 0x7c2d12, gradientMap: ramp });
      const darkSteelMat = new THREE.MeshToonMaterial({ color: 0x3f3f46, gradientMap: ramp });

      for (let gz = 1; gz < this.gridDepth; gz += 2) {
        const pz = gz * this.cellSize + 0.65;
        const mainPipeGeo = new THREE.CylinderGeometry(0.16, 0.16, worldWidth, 10);
        mainPipeGeo.rotateZ(Math.PI / 2);
        const mainPipe = new THREE.Mesh(mainPipeGeo, steamPipeMat);
        mainPipe.position.set(worldWidth / 2, this.wallHeight - 0.26, pz);
        mainPipe.add(new THREE.LineSegments(new THREE.EdgesGeometry(mainPipeGeo, 25), lineMat));
        this.scene.add(mainPipe);
        this.fixtureMeshes.push(mainPipe);

        // Secondary parallel steel conduit
        const secPipeGeo = new THREE.CylinderGeometry(0.11, 0.11, worldWidth, 8);
        secPipeGeo.rotateZ(Math.PI / 2);
        const secPipe = new THREE.Mesh(secPipeGeo, darkSteelMat);
        secPipe.position.set(worldWidth / 2, this.wallHeight - 0.22, pz - 0.38);
        this.scene.add(secPipe);
        this.fixtureMeshes.push(secPipe);
      }
    }
  }

  private generateRoomWalls(level: number, targetBreakableWalls: number, biome: BiomeType) {
    const worldW = this.gridWidth * this.cellSize;
    const worldD = this.gridDepth * this.cellSize;

    // 1. Exterior Indestructible Perimeter Walls (Dark Navy Steel & Concrete with Red Alert Beacons)
    this.createWallEntity(worldW / 2, 0, 'H', 0, 0, worldW + 1.6, 'border', biome, true, 1);
    this.createWallEntity(worldW / 2, worldD, 'H', 0, this.gridDepth, worldW + 1.6, 'border', biome, true, 1);
    this.createWallEntity(0, worldD / 2, 'V', 0, 0, worldD + 1.6, 'border', biome, true, 1);
    this.createWallEntity(worldW, worldD / 2, 'V', this.gridWidth, 0, worldD + 1.6, 'border', biome, true, 1);

    // 2. Collect all valid interior wall slots & weight them into structured corridors/rings!
    interface WallSlot {
      cx: number;
      cz: number;
      orientation: 'H' | 'V';
      gx: number;
      gz: number;
      priority: number;
    }

    const slots: WallSlot[] = [];
    const midX = this.gridWidth / 2;
    const midZ = this.gridDepth / 2;

    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridDepth; z++) {
        // Keep the player spawn cell (0,0) clear
        if (x === 0 && z === 0) continue;

        if (z > 0 && z < this.gridDepth) {
          // Prefer structured concentric rings and continuous corridor lines
          const isRing = z === 1 || z === this.gridDepth - 1 || Math.abs(z - midZ) <= 1;
          const priority = (isRing ? 1.5 : 0.6) + Math.random() * 0.85;
          slots.push({
            cx: x * this.cellSize + this.cellSize / 2,
            cz: z * this.cellSize,
            orientation: 'H',
            gx: x,
            gz: z,
            priority,
          });
        }

        if (x > 0 && x < this.gridWidth) {
          const isRing = x === 1 || x === this.gridWidth - 1 || Math.abs(x - midX) <= 1;
          const priority = (isRing ? 1.5 : 0.6) + Math.random() * 0.85;
          slots.push({
            cx: x * this.cellSize,
            cz: z * this.cellSize + this.cellSize / 2,
            orientation: 'V',
            gx: x,
            gz: z,
            priority,
          });
        }
      }
    }

    // Sort by architectural ring/corridor priority so walls form dense, satisfying structures
    slots.sort((a, b) => b.priority - a.priority);

    const countToSpawn = Math.min(slots.length, Math.max(1, targetBreakableWalls));
    const hpScale = this.isJackpotFloor ? 0.65 : 1 + (level - 1) * 0.14;
    const goldChance = progressionManager.hasBudgetEquipped('gold_rush') ? 0.22 : 0.10;

    for (let i = 0; i < countToSpawn; i++) {
      const s = slots[i];
      let variant: WallVariant = 'normal';

      if (this.isJackpotFloor) {
        // On Jackpot Floors, 100% of walls are Gleaming Gold!
        variant = 'golden';
      } else {
        const roll = Math.random();
        if (roll < goldChance) {
          variant = 'golden';
        } else if (level >= 5 && roll < goldChance + 0.16) {
          variant = 'electric';
        } else if (roll < Math.min(0.52, goldChance + 0.12 + level * 0.03)) {
          variant = 'reinforced';
        }
      }

      this.createWallEntity(
        s.cx,
        s.cz,
        s.orientation,
        s.gx,
        s.gz,
        this.cellSize,
        variant,
        this.isJackpotFloor ? 'level0' : biome,
        false,
        hpScale
      );
    }
  }

  private createWallEntity(
    cx: number,
    cz: number,
    orientation: 'H' | 'V',
    gridX: number,
    gridZ: number,
    length: number,
    variant: WallVariant,
    biome: BiomeType,
    isPerimeter = false,
    hpScale = 1.0
  ) {
    const id = `wall_${gridX}_${gridZ}_${orientation}_${Math.random().toString(36).substring(2, 6)}`;
    const group = new THREE.Group();

    const isIndestructible = isPerimeter || variant === 'border';
    const thickness = isIndestructible ? 0.8 : this.wallThickness;
    const w = orientation === 'H' ? length : thickness;
    const h = isIndestructible ? this.wallHeight + 0.6 : this.wallHeight;
    const d = orientation === 'H' ? thickness : length;
    const size = new THREE.Vector3(w, h, d);

    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = materialFactory.getWallMaterial(variant, biome);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, h / 2, 0);
    group.add(mesh);

    if (!isIndestructible) {
      const trimGeom = new THREE.BoxGeometry(
        orientation === 'H' ? w + 0.02 : w + 0.07,
        0.24,
        orientation === 'H' ? d + 0.07 : d + 0.02
      );
      const trimColor =
        variant === 'golden'
          ? biome === 'poolrooms'
            ? 0x22d3ee
            : biome === 'pipedreams'
            ? 0xea580c
            : biome === 'hospital'
            ? 0xe11d48
            : 0xb45309
          : variant === 'electric'
          ? 0x0284c7
          : biome === 'poolrooms'
          ? 0x0284c7
          : biome === 'pipedreams'
          ? 0x27272a
          : biome === 'hospital'
          ? 0x991b1b
          : 0x4a3814;
      const trimMat = new THREE.MeshToonMaterial({
        color: trimColor,
        gradientMap: materialFactory.getToonRamp(),
      });
      const trimMesh = new THREE.Mesh(trimGeom, trimMat);
      trimMesh.position.set(0, 0.12, 0);
      group.add(trimMesh);
    }

    const duoOutline = materialFactory.createDuoEdgeLines(geom, 15, !isIndestructible);
    duoOutline.position.set(0, h / 2, 0);
    group.add(duoOutline);

    group.position.set(cx, 0, cz);
    this.scene.add(group);

    let maxHealth = Math.round(100 * hpScale);
    if (variant === 'reinforced') maxHealth = Math.round(240 * hpScale);
    if (variant === 'electric') maxHealth = Math.round(140 * hpScale);
    if (variant === 'golden') maxHealth = Math.round(150 * hpScale);
    if (isIndestructible) maxHealth = 999999;

    const collider = new THREE.Box3();
    collider.setFromObject(group);

    const wall: DestructibleWall = {
      id,
      gridX,
      gridZ,
      orientation,
      meshGroup: group,
      collider,
      health: maxHealth,
      maxHealth,
      variant,
      biome,
      size,
      center: new THREE.Vector3(cx, h / 2, cz),
      isDestroyed: false,
      isIndestructible,
      hitShakeTimer: 0,
      rebuildDelayTimer: 0,
      rebuildAnimProgress: 0,
    };

    this.walls.set(id, wall);
    return wall;
  }

  public findEmptyWallSlotNear(
    pos: THREE.Vector3,
    playerPos: THREE.Vector3
  ): { cx: number; cz: number; gx: number; gz: number; orientation: 'H' | 'V' } | null {
    const candidates: Array<{
      cx: number;
      cz: number;
      gx: number;
      gz: number;
      orientation: 'H' | 'V';
      dist: number;
    }> = [];

    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridDepth; z++) {
        const orientations: Array<'H' | 'V'> = ['H', 'V'];
        for (const ori of orientations) {
          if (ori === 'H' && (z <= 0 || z >= this.gridDepth)) continue;
          if (ori === 'V' && (x <= 0 || x >= this.gridWidth)) continue;

          const cx = ori === 'H' ? x * this.cellSize + this.cellSize / 2 : x * this.cellSize;
          const cz = ori === 'H' ? z * this.cellSize : z * this.cellSize + this.cellSize / 2;

          let occupied = false;
          for (const w of this.walls.values()) {
            if (w.isDestroyed || w.isIndestructible) continue;
            if (
              w.orientation === ori &&
              Math.abs(w.center.x - cx) < 0.8 &&
              Math.abs(w.center.z - cz) < 0.8
            ) {
              occupied = true;
              break;
            }
          }
          if (occupied) continue;

          const distToPlayer = Math.hypot(playerPos.x - cx, playerPos.z - cz);
          if (distToPlayer < 2.6) continue;

          const distToEntity = Math.hypot(pos.x - cx, pos.z - cz);
          candidates.push({ cx, cz, gx: x, gz: z, orientation: ori, dist: distToEntity });
        }
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[0];
  }

  public spawnConstructedWall(
    cx: number,
    cz: number,
    gx: number,
    gz: number,
    orientation: 'H' | 'V',
    level: number
  ): DestructibleWall {
    const hpScale = 1 + (level - 1) * 0.14;
    const wall = this.createWallEntity(
      cx,
      cz,
      orientation,
      gx,
      gz,
      this.cellSize,
      'normal',
      this.currentBiome,
      false,
      hpScale
    );
    wall.hitShakeTimer = 0.25;
    wall.meshGroup.scale.set(1.0, 0.1, 1.0);
    return wall;
  }

  private spawnPowerUps(level: number) {
    const types: Array<'mega_gloves' | 'almond_water' | 'golden_fists'> = [
      'mega_gloves',
      'almond_water',
      'golden_fists',
    ];

    const count = Math.min(5, 1 + Math.floor(level / 2));
    for (let i = 0; i < count; i++) {
      const rx = 1 + Math.floor(Math.random() * Math.max(1, this.gridWidth - 2));
      const rz = 1 + Math.floor(Math.random() * Math.max(1, this.gridDepth - 2));
      const pos = new THREE.Vector3(
        rx * this.cellSize + this.cellSize / 2,
        0.6,
        rz * this.cellSize + this.cellSize / 2
      );

      const type = types[i % types.length];
      const group = new THREE.Group();
      group.position.copy(pos);

      if (type === 'almond_water') {
        const bottleGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 14);
        const bottleMat = new THREE.MeshToonMaterial({ color: 0x38bdf8 });
        const bottle = new THREE.Mesh(bottleGeom, bottleMat);
        group.add(bottle);
        group.add(materialFactory.createOutlineMesh(bottleGeom, 0.06));

        const labelTex = textureFactory.createComicTextTexture('BOOST', '#38bdf8');
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }));
        sprite.position.set(0, 0.6, 0);
        sprite.scale.set(0.9, 0.45, 1);
        group.add(sprite);
      } else if (type === 'mega_gloves') {
        const gloveGeom = new THREE.SphereGeometry(0.25, 14, 14);
        const gloveMat = materialFactory.getBoxingGloveMaterial(false);
        const glove = new THREE.Mesh(gloveGeom, gloveMat);
        group.add(glove);
        group.add(materialFactory.createOutlineMesh(gloveGeom, 0.08));

        const labelTex = textureFactory.createComicTextTexture('GIGA', '#ff2222');
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }));
        sprite.position.set(0, 0.6, 0);
        sprite.scale.set(0.9, 0.45, 1);
        group.add(sprite);
      } else {
        const goldGeom = new THREE.OctahedronGeometry(0.24, 0);
        const goldMat = new THREE.MeshToonMaterial({ color: 0xffd700 });
        const gold = new THREE.Mesh(goldGeom, goldMat);
        group.add(gold);
        group.add(materialFactory.createOutlineMesh(goldGeom, 0.08));

        const labelTex = textureFactory.createComicTextTexture('GOLD', '#ffd700');
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }));
        sprite.position.set(0, 0.6, 0);
        sprite.scale.set(0.9, 0.45, 1);
        group.add(sprite);
      }

      this.scene.add(group);
      this.powerUps.push({
        id: `powerup_${i}`,
        type,
        mesh: group,
        position: pos,
        isCollected: false,
      });
    }
  }

  public damageWall(
    wallId: string,
    damage: number,
    hitPoint: THREE.Vector3,
    punchDir: THREE.Vector3,
    fractureEngine: FractureEngine,
    comicEffects: ComicEffectsManager,
    punchForce = 1.0,
    isRangedOrSafe = false
  ): boolean {
    const wall = this.walls.get(wallId);
    if (!wall || wall.isDestroyed) return false;

    if (wall.isIndestructible) {
      soundManager.playMetallicClang();
      comicEffects.triggerPunchShake(0.06, 20, punchDir);
      comicEffects.spawnShockwave(hitPoint, punchDir.clone().negate(), 1.2);
      comicEffects.spawnComicText(hitPoint, t().comicUnbreakable);
      return false;
    }

    const hasShockShield = progressionManager.hasBudgetEquipped('shock_shield');
    if (wall.variant === 'electric' && !isRangedOrSafe && !hasShockShield) {
      soundManager.playElectricShock();
      comicEffects.triggerPunchShake(0.16, 40, punchDir);
      comicEffects.spawnShockwave(hitPoint, punchDir.clone().negate(), 1.9);
      comicEffects.spawnComicText(hitPoint, t().comicElectricShock, '#22d3ee');
      this.onElectricShockPenalty?.();
      wall.health -= damage * 0.45;
    } else {
      wall.health -= damage;
      soundManager.playPunchImpact(punchForce, wall.variant, wall.biome);
      comicEffects.triggerPunchShake(0.09 * Math.min(2.0, punchForce), 28, punchDir);
      comicEffects.spawnShockwave(hitPoint, punchDir.clone().negate(), 1.65);
      comicEffects.spawnComicText(hitPoint);
    }

    if (wall.health <= 0) {
      wall.isDestroyed = true;
      wall.hitShakeTimer = 0;
      wall.rebuildAnimProgress = 0;
      // On Jackpot Floors, walls dynamically reconstruct themselves after 1.5s!
      wall.rebuildDelayTimer = this.isJackpotFloor ? 1.5 : 0;
      this.scene.remove(wall.meshGroup);

      fractureEngine.fractureWall(
        wall.center,
        wall.size,
        punchDir,
        wall.variant,
        punchForce,
        wall.biome
      );

      const isConcrete = Boolean(
        wall.variant === 'reinforced' || wall.biome === 'pipedreams' || wall.id
      );
      soundManager.playWallCollapse(
        wall.variant === 'golden' || wall.variant === 'electric',
        wall.biome,
        isConcrete
      );
      comicEffects.spawnComicText(
        wall.center,
        this.isJackpotFloor
          ? ['JACKPOT!']
          : wall.variant === 'electric'
          ? t().comicElectricChain
          : t().comicBreakWords,
        this.isJackpotFloor ? '#facc15' : wall.variant === 'electric' ? '#22d3ee' : undefined
      );
      return true;
    } else {
      wall.hitShakeTimer = 0.22;
      wall.meshGroup.position.x = wall.center.x + punchDir.x * 0.09;
      wall.meshGroup.position.z = wall.center.z + punchDir.z * 0.09;
      wall.meshGroup.scale.set(1.04, 0.97, 1.04);
      this.addCrackEffect(wall, hitPoint);
      return false;
    }
  }

  private addCrackEffect(wall: DestructibleWall, hitPoint: THREE.Vector3) {
    if (wall.crackMesh) {
      wall.meshGroup.remove(wall.crackMesh);
      wall.crackMesh.geometry.dispose();
    }

    const crackPoints: THREE.Vector3[] = [];
    const localHit = hitPoint.clone().sub(wall.center);
    const damageRatio = 1 - Math.max(0, wall.health / wall.maxHealth);
    const branches = Math.round(6 + damageRatio * 6);

    for (let b = 0; b < branches; b++) {
      let cur = localHit.clone();
      cur.y += this.wallHeight / 2;

      const angle = (b / branches) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const length = 0.55 + damageRatio * 0.65 + Math.random() * 0.45;

      const segments = 4;
      for (let s = 0; s < segments; s++) {
        const next = cur.clone();
        next.x += (Math.cos(angle) * length) / segments + (Math.random() - 0.5) * 0.12;
        next.y += (Math.sin(angle) * length) / segments + (Math.random() - 0.5) * 0.12;
        crackPoints.push(cur.clone(), next.clone());
        cur = next;
      }
    }

    const crackGeom = new THREE.BufferGeometry().setFromPoints(crackPoints);
    const crackLineMat = new THREE.LineBasicMaterial({ color: 0x09090b, linewidth: 4 });
    const crackLines = new THREE.LineSegments(crackGeom, crackLineMat);
    crackLines.position.z += wall.orientation === 'H' ? 0.015 : 0;
    crackLines.position.x += wall.orientation === 'V' ? 0.015 : 0;

    wall.crackMesh = crackLines;
    wall.meshGroup.add(crackLines);
  }

  public resolvePlayerCollision(
    playerPos: THREE.Vector3,
    playerVelocity: THREE.Vector3,
    playerRadius = 0.45
  ): { position: THREE.Vector3; collidedWithWall: boolean } {
    const resolved = playerPos.clone();
    let collidedWithWall = false;

    const worldW = this.gridWidth * this.cellSize;
    const worldD = this.gridDepth * this.cellSize;
    const minX = playerRadius + 0.42;
    const maxX = worldW - playerRadius - 0.42;
    const minZ = playerRadius + 0.42;
    const maxZ = worldD - playerRadius - 0.42;

    if (resolved.x <= minX) {
      resolved.x = minX;
      if (playerVelocity.x < 0) playerVelocity.x = 0;
      collidedWithWall = true;
    } else if (resolved.x >= maxX) {
      resolved.x = maxX;
      if (playerVelocity.x > 0) playerVelocity.x = 0;
      collidedWithWall = true;
    }

    if (resolved.z <= minZ) {
      resolved.z = minZ;
      if (playerVelocity.z < 0) playerVelocity.z = 0;
      collidedWithWall = true;
    } else if (resolved.z >= maxZ) {
      resolved.z = maxZ;
      if (playerVelocity.z > 0) playerVelocity.z = 0;
      collidedWithWall = true;
    }

    for (let pass = 0; pass < 3; pass++) {
      // 1. Resolve against breakable & interior walls
      for (const wall of this.walls.values()) {
        if (wall.isDestroyed || wall.isIndestructible) continue;

        const halfW = wall.size.x / 2 + playerRadius;
        const halfD = wall.size.z / 2 + playerRadius;

        const dx = resolved.x - wall.center.x;
        const dz = resolved.z - wall.center.z;

        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          collidedWithWall = true;
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);

          if (overlapX < overlapZ) {
            const pushDir = dx > 0 ? 1 : -1;
            resolved.x += pushDir * overlapX;
            if (playerVelocity.x * pushDir < 0) {
              playerVelocity.x = 0;
            }
          } else {
            const pushDir = dz > 0 ? 1 : -1;
            resolved.z += pushDir * overlapZ;
            if (playerVelocity.z * pushDir < 0) {
              playerVelocity.z = 0;
            }
          }
        }
      }

      // 2. Smooth physical collision against 3D Biome Structural Columns / Pillars
      for (const pillar of this.pillarColliders) {
        const dx = resolved.x - pillar.x;
        const dz = resolved.z - pillar.z;
        const dist = Math.hypot(dx, dz);
        const minDist = pillar.radius + playerRadius;
        if (dist < minDist) {
          collidedWithWall = true;
          const nx = dist > 0.0001 ? dx / dist : 1;
          const nz = dist > 0.0001 ? dz / dist : 0;
          const overlap = minDist - dist;
          resolved.x += nx * overlap;
          resolved.z += nz * overlap;

          // Project velocity tangentially along pillar circumference for smooth sliding
          const vn = playerVelocity.x * nx + playerVelocity.z * nz;
          if (vn < 0) {
            playerVelocity.x -= vn * nx;
            playerVelocity.z -= vn * nz;
          }
        }
      }
    }

    return { position: resolved, collidedWithWall };
  }

  public getWallAhead(
    raycaster: THREE.Raycaster,
    maxDistance = 3.2
  ): { wall: DestructibleWall; hitPoint: THREE.Vector3 } | null {
    let closestWall: DestructibleWall | null = null;
    let closestDist = maxDistance;
    let closestHit: THREE.Vector3 | null = null;

    const hitTarget = new THREE.Vector3();

    for (const wall of this.walls.values()) {
      if (wall.isDestroyed) continue;

      const hit = raycaster.ray.intersectBox(wall.collider, hitTarget);
      if (hit) {
        const dist = raycaster.ray.origin.distanceTo(hit);
        if (dist < closestDist) {
          closestDist = dist;
          closestWall = wall;
          closestHit = hit.clone();
        }
      }
    }

    if (closestWall && closestHit) {
      return { wall: closestWall, hitPoint: closestHit };
    }
    return null;
  }

  public getClosestStandingWall(playerPos: THREE.Vector3): DestructibleWall | null {
    let best: DestructibleWall | null = null;
    let bestDist = Infinity;
    for (const wall of this.walls.values()) {
      if (wall.isDestroyed || wall.isIndestructible) continue;
      const d = Math.hypot(wall.center.x - playerPos.x, wall.center.z - playerPos.z);
      if (d < bestDist) {
        bestDist = d;
        best = wall;
      }
    }
    return best;
  }

  public getWallsInRadius(center: THREE.Vector3, radius: number): DestructibleWall[] {
    const result: DestructibleWall[] = [];
    for (const wall of this.walls.values()) {
      if (wall.isDestroyed) continue;
      const dist = wall.center.distanceTo(center);
      if (dist <= radius) {
        result.push(wall);
      }
    }
    return result;
  }

  public checkPowerUpCollection(playerPos: THREE.Vector3): PowerUpItem | null {
    for (const item of this.powerUps) {
      if (item.isCollected) continue;
      if (item.position.distanceTo(playerPos) < 1.45) {
        item.isCollected = true;
        this.scene.remove(item.mesh);
        soundManager.playPowerup(item.type);
        return item;
      }
    }
    return null;
  }

  public update(time: number, delta = 0.016, playerPos?: THREE.Vector3) {
    // Subtle ripple on Poolrooms 3D Translucent Water Layer (y = 0.16)
    if (this.waterLayerMesh) {
      this.waterLayerMesh.position.y = 0.16 + Math.sin(time * 2.8) * 0.018;
    }

    for (const light of this.flickeringLights) {
      if (this.currentBiome === 'hospital') {
        light.intensity = 1.15 + Math.sin(time * 8 + light.id) * 0.65;
      } else {
        const flicker = Math.sin(time * 30 + light.id * 10) * Math.cos(time * 15);
        light.intensity = flicker > 0.8 ? 0.35 : 1.35 + Math.sin(time * 5) * 0.15;
      }
    }

    for (const item of this.powerUps) {
      if (item.isCollected) continue;
      item.mesh.rotation.y = time * 2.5;
      item.mesh.position.y = item.position.y + Math.sin(time * 3.5 + item.position.x) * 0.12;
    }

    for (const wall of this.walls.values()) {
      // Dynamic Animated Wall Self-Reconstruction on Jackpot Floors!
      if (this.isJackpotFloor && wall.isDestroyed && wall.rebuildDelayTimer > 0) {
        wall.rebuildDelayTimer -= delta;
        if (wall.rebuildDelayTimer <= 0) {
          const distToPlayer = playerPos
            ? Math.hypot(playerPos.x - wall.center.x, playerPos.z - wall.center.z)
            : 99;
          if (distToPlayer < 1.38) {
            // Wait slightly if player is standing right inside the wall slot
            wall.rebuildDelayTimer = 0.25;
          } else {
            wall.isDestroyed = false;
            wall.health = wall.maxHealth;
            wall.rebuildDelayTimer = 0;
            wall.rebuildAnimProgress = 0.01;
            if (wall.crackMesh) {
              wall.meshGroup.remove(wall.crackMesh);
              wall.crackMesh.geometry.dispose();
              wall.crackMesh = undefined;
            }
            wall.meshGroup.position.set(wall.center.x, 0, wall.center.z);
            wall.meshGroup.scale.set(1.16, 0.04, 1.16);
            this.scene.add(wall.meshGroup);
          }
        }
        continue;
      }

      if (!wall.isDestroyed && wall.rebuildAnimProgress > 0 && wall.rebuildAnimProgress < 1) {
        wall.rebuildAnimProgress = Math.min(1, wall.rebuildAnimProgress + delta * 2.4);
        const p = wall.rebuildAnimProgress;
        // Elastic rising bounce curve (0 -> 1.12 -> 1.0)
        const scaleY =
          p < 0.75
            ? (p / 0.75) * 1.14
            : 1.14 - ((p - 0.75) / 0.25) * 0.14;
        const scaleXZ = 1 + (1 - p) * 0.16;
        wall.meshGroup.position.set(wall.center.x, 0, wall.center.z);
        wall.meshGroup.scale.set(scaleXZ, Math.max(0.04, scaleY), scaleXZ);
        if (p >= 1) {
          wall.rebuildAnimProgress = 0;
          wall.meshGroup.scale.set(1, 1, 1);
        }
        continue;
      }

      if (wall.isDestroyed || wall.hitShakeTimer <= 0) continue;
      wall.hitShakeTimer = Math.max(0, wall.hitShakeTimer - delta);
      if (wall.hitShakeTimer > 0) {
        const jiggle = Math.sin(wall.hitShakeTimer * 85) * 0.04;
        wall.meshGroup.position.x = THREE.MathUtils.lerp(
          wall.meshGroup.position.x,
          wall.center.x + jiggle,
          0.35
        );
        wall.meshGroup.position.z = THREE.MathUtils.lerp(
          wall.meshGroup.position.z,
          wall.center.z + jiggle,
          0.35
        );
        wall.meshGroup.scale.lerp(new THREE.Vector3(1, 1, 1), 0.25);
      } else {
        wall.meshGroup.position.set(wall.center.x, 0, wall.center.z);
        wall.meshGroup.scale.set(1, 1, 1);
      }
    }
  }

  public clear() {
    for (const wall of this.walls.values()) {
      this.scene.remove(wall.meshGroup);
      wall.meshGroup.traverse((c) => {
        if (c instanceof THREE.Mesh || c instanceof THREE.LineSegments) {
          c.geometry?.dispose();
        }
      });
    }
    this.walls.clear();

    for (const item of this.powerUps) {
      this.scene.remove(item.mesh);
    }
    this.powerUps = [];

    for (const obj of this.fixtureMeshes) {
      this.scene.remove(obj);
    }
    this.fixtureMeshes = [];
    this.flickeringLights = [];
    this.pillarColliders = [];

    if (this.floorMesh) {
      this.scene.remove(this.floorMesh);
      this.floorMesh.geometry.dispose();
      this.floorMesh = null;
    }

    if (this.waterLayerMesh) {
      this.scene.remove(this.waterLayerMesh);
      this.waterLayerMesh.geometry.dispose();
      this.waterLayerMesh = null;
    }

    if (this.ceilingMesh) {
      this.scene.remove(this.ceilingMesh);
      this.ceilingMesh.geometry.dispose();
      this.ceilingMesh = null;
    }
  }
}
