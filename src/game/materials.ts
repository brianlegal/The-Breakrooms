/**
 * Cel-shading cartoon materials with bump relief and Duo Black & White Outline generators.
 * Caches shared materials to eliminate WebGL material allocation leaks, supports all 4 Biomes
 * (with 100% biome-accurate shard cores and darkened grounded rubble), and 5 unlockable 3D Glove Skins.
 */
import * as THREE from 'three';
import { textureFactory, WallVariant, BiomeType } from './textures';
import { GloveSkinId } from './progression';

export class MaterialFactory {
  private toonRamp: THREE.DataTexture;
  private outlineMatCache: Map<string, THREE.MeshBasicMaterial> = new Map();
  private wallMatCache: Map<string, THREE.MeshToonMaterial> = new Map();
  private groundedWallMatCache: Map<string, THREE.MeshToonMaterial> = new Map();
  private coreMatCache: Map<string, THREE.MeshToonMaterial> = new Map();
  private groundedCoreMatCache: Map<string, THREE.MeshToonMaterial> = new Map();
  private gloveMatCache: Map<string, THREE.MeshToonMaterial> = new Map();
  private entityBlackMat: THREE.MeshToonMaterial;
  private duoBlackLineMat: THREE.LineBasicMaterial;
  private duoWhiteLineMat: THREE.LineBasicMaterial;

  constructor() {
    this.toonRamp = textureFactory.getToonRamp();

    this.entityBlackMat = new THREE.MeshToonMaterial({
      color: 0x09090f,
      gradientMap: this.toonRamp,
    });

    this.duoBlackLineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 3,
    });

    this.duoWhiteLineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.92,
    });
  }

  public getToonRamp(): THREE.DataTexture {
    return this.toonRamp;
  }

  private getOutlineMaterial(colorHex: number, isInnerLayer: boolean): THREE.MeshBasicMaterial {
    const key = `${colorHex}_${isInnerLayer ? 'inner' : 'outer'}`;
    let mat = this.outlineMatCache.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.BackSide,
        depthWrite: !isInnerLayer,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: isInnerLayer ? 1 : 2,
        polygonOffsetUnits: isInnerLayer ? 1 : 2,
      });
      this.outlineMatCache.set(key, mat);
    }
    return mat;
  }

  /**
   * Creates a Duo Black & White Cartoon Outline (Outer Silhouette + Inner High-Contrast Rim)
   * using a dual-layer inverted hull technique.
   */
  public createOutlineMesh(
    geometry: THREE.BufferGeometry,
    thickness = 0.024,
    outerColor = 0x000000,
    innerColor = 0xffffff
  ): THREE.Mesh {
    const safeThickness = Math.min(0.055, Math.max(0.006, thickness));

    const outerMat = this.getOutlineMaterial(outerColor, false);
    const innerMat = this.getOutlineMaterial(innerColor, true);

    const outerMesh = new THREE.Mesh(geometry, outerMat);
    const outerScale = 1 + safeThickness * 1.45;
    outerMesh.scale.setScalar(outerScale);
    outerMesh.renderOrder = -2;

    const innerMesh = new THREE.Mesh(geometry, innerMat);
    const innerScale = (1 + safeThickness * 0.68) / outerScale;
    innerMesh.scale.setScalar(innerScale);
    innerMesh.renderOrder = -1;

    outerMesh.add(innerMesh);
    return outerMesh;
  }

  /**
   * Creates a Duo Black & White Edge Line group using a provided or newly generated EdgesGeometry.
   */
  public createDuoEdgeLines(
    geometry: THREE.BufferGeometry,
    thresholdAngle = 18,
    includeInnerWhite = true,
    precomputedEdges?: THREE.EdgesGeometry
  ): THREE.Group {
    const group = new THREE.Group();
    const edges = precomputedEdges || new THREE.EdgesGeometry(geometry, thresholdAngle);

    const blackLines = new THREE.LineSegments(edges, this.duoBlackLineMat);
    blackLines.scale.setScalar(1.004);
    group.add(blackLines);

    if (includeInnerWhite) {
      const whiteLines = new THREE.LineSegments(edges, this.duoWhiteLineMat);
      whiteLines.scale.setScalar(0.994);
      group.add(whiteLines);
    }

    return group;
  }

  public getEntityMaterial(): THREE.MeshToonMaterial {
    return this.entityBlackMat;
  }

  /**
   * Cached Wall Material with Backrooms wallpaper, bump map relief, and toon shading.
   */
  public getWallMaterial(
    variant: WallVariant = 'normal',
    biome: BiomeType = 'level0'
  ): THREE.MeshToonMaterial {
    const key = `v6_${variant}_${biome}`;
    let mat = this.wallMatCache.get(key);
    if (!mat) {
      const tex = textureFactory.getBackroomsWallpaper(variant, biome);
      const bump = textureFactory.getWallBumpMap();
      const color =
        variant === 'golden'
          ? biome === 'poolrooms'
            ? 0xe0f2fe
            : biome === 'pipedreams'
            ? 0xffedd5
            : biome === 'hospital'
            ? 0xffe4e6
            : 0xffe566
          : 0xffffff;
      mat = new THREE.MeshToonMaterial({
        map: tex,
        bumpMap: bump,
        bumpScale: variant === 'reinforced' ? 0.045 : 0.025,
        color,
        emissive: variant === 'electric' ? 0x083344 : 0x000000,
        emissiveIntensity: variant === 'electric' ? 0.6 : 0.0,
        gradientMap: this.toonRamp,
      });
      this.wallMatCache.set(key, mat);
    }
    return mat;
  }

  /**
   * Darkened wall material applied when debris fragments settle on the floor (`isGrounded = true`)
   * using biome-neutral darkening so Poolrooms/Pipe Dreams shards never get tinted yellow!
   */
  public getGroundedWallMaterial(
    variant: WallVariant = 'normal',
    biome: BiomeType = 'level0'
  ): THREE.MeshToonMaterial {
    const key = `grounded_v6_${variant}_${biome}`;
    let mat = this.groundedWallMatCache.get(key);
    if (!mat) {
      const tex = textureFactory.getBackroomsWallpaper(variant, biome);
      const darkTint =
        biome === 'poolrooms'
          ? 0x67a3b8
          : biome === 'pipedreams'
          ? 0x66666e
          : biome === 'hospital'
          ? 0x707885
          : 0x757062;
      mat = new THREE.MeshToonMaterial({
        map: tex,
        color: darkTint,
        gradientMap: this.toonRamp,
      });
      this.groundedWallMatCache.set(key, mat);
    }
    return mat;
  }

  public getFloorMaterial(biome: BiomeType = 'level0'): THREE.MeshToonMaterial {
    const tex = textureFactory.getDampCarpetTexture(biome);
    return new THREE.MeshToonMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: 0.02,
      gradientMap: this.toonRamp,
    });
  }

  public getCeilingMaterial(biome: BiomeType = 'level0'): THREE.MeshToonMaterial {
    const tex = textureFactory.getCeilingTexture(biome);
    return new THREE.MeshToonMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: 0.02,
      gradientMap: this.toonRamp,
    });
  }

  /**
   * Biome-specific interior shard core material.
   */
  public getDrywallCoreMaterial(biome: BiomeType = 'level0'): THREE.MeshToonMaterial {
    let mat = this.coreMatCache.get(biome);
    if (!mat) {
      const coreTex = textureFactory.getDrywallCoreTexture(biome);
      mat = new THREE.MeshToonMaterial({
        map: coreTex,
        bumpMap: coreTex,
        bumpScale: 0.03,
        gradientMap: this.toonRamp,
      });
      this.coreMatCache.set(biome, mat);
    }
    return mat;
  }

  public getGroundedCoreMaterial(biome: BiomeType = 'level0'): THREE.MeshToonMaterial {
    let mat = this.groundedCoreMatCache.get(biome);
    if (!mat) {
      const coreTex = textureFactory.getDrywallCoreTexture(biome);
      const tint =
        biome === 'poolrooms'
          ? 0x67a3b8
          : biome === 'pipedreams'
          ? 0x52525b
          : biome === 'hospital'
          ? 0x64748b
          : 0x78716c;
      mat = new THREE.MeshToonMaterial({
        map: coreTex,
        color: tint,
        gradientMap: this.toonRamp,
      });
      this.groundedCoreMatCache.set(biome, mat);
    }
    return mat;
  }

  /**
   * Brawler Glove Material supporting Golden Fists and all 5 Unlockable Glove Skins!
   */
  public getBoxingGloveMaterial(
    isGolden = false,
    skinId: GloveSkinId = 'classic_red'
  ): THREE.MeshToonMaterial {
    const key = `glove_${isGolden}_${skinId}`;
    let mat = this.gloveMatCache.get(key);
    if (!mat) {
      const leatherTex = textureFactory.getGloveLeatherTexture(isGolden, skinId);
      mat = new THREE.MeshToonMaterial({
        map: leatherTex,
        bumpMap: leatherTex,
        bumpScale: 0.025,
        color: isGolden ? 0xffea55 : 0xffffff,
        gradientMap: this.toonRamp,
      });
      this.gloveMatCache.set(key, mat);
    }
    return mat;
  }

  public getGloveMaterial(isDarkCuff = false, skinId: GloveSkinId = 'classic_red'): THREE.MeshToonMaterial {
    if (isDarkCuff) {
      return this.getGlovePalmMaterial();
    }
    return this.getBoxingGloveMaterial(false, skinId);
  }

  public getGlovePalmMaterial(): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
      color: 0x18181c,
      gradientMap: this.toonRamp,
    });
  }

  public getMetallicHardwareMaterial(colorHex = 0xfacc15): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.85,
      roughness: 0.22,
    });
  }

  public getGoldTrimMaterial(): THREE.MeshStandardMaterial {
    return this.getMetallicHardwareMaterial();
  }

  public getBoxingLacesMaterial(): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
      color: 0xf4f4f5,
      gradientMap: this.toonRamp,
    });
  }

  public getStrapMaterial(): THREE.MeshToonMaterial {
    return this.getBoxingLacesMaterial();
  }

  public getArmSkinMaterial(): THREE.MeshToonMaterial {
    const skinTex = textureFactory.getArmSkinTexture();
    return new THREE.MeshToonMaterial({
      map: skinTex,
      gradientMap: this.toonRamp,
    });
  }

  public getSkinMaterial(): THREE.MeshToonMaterial {
    return this.getArmSkinMaterial();
  }

  public getDemolitionBallMaterial(): THREE.MeshToonMaterial {
    const tex = textureFactory.getDemolitionBallTexture();
    return new THREE.MeshToonMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: 0.02,
      gradientMap: this.toonRamp,
    });
  }

  public getBallMaterial(): THREE.MeshToonMaterial {
    return this.getDemolitionBallMaterial();
  }

  public getCartoonLineMaterial(): THREE.LineBasicMaterial {
    return this.duoBlackLineMat;
  }

  public getWhiteLineMaterial(): THREE.LineBasicMaterial {
    return this.duoWhiteLineMat;
  }
}

export const materialFactory = new MaterialFactory();
