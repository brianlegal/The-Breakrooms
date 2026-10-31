/**
 * Enhanced Comic Book & Arcade Juice Visual Effects:
 * - Radially-offset floating 3D popups ("POW!", "SMASH!", "+COINS!") that rise along the outer flanks
 *   of the crosshair so the center reticle (50%, 50%) is NEVER obstructed!
 * - Pooled/shared geometry shockwave blast rings + 3D radial impact sparks
 * - Sonic Wind Blade projectiles unlocked at 250%+ Punch Speed!
 * - Directional camera punch kick, trauma shake, and Hit-Stop frame freeze
 */
import * as THREE from 'three';
import { textureFactory } from './textures';
import { t } from './i18n';

interface ComicPopup {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  initialScale: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  age: number;
  maxAge: number;
  maxRadius: number;
}

interface ImpactSpark {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
}

export class ComicEffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private popups: ComicPopup[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private sparks: ImpactSpark[] = [];

  // Shared geometries to avoid runtime geometry allocation leaks
  private sparkGeom = new THREE.OctahedronGeometry(0.07, 0);
  private burstStarGeom: THREE.BufferGeometry;
  private sharedRingGeom1 = new THREE.RingGeometry(0.14, 0.32, 28);
  private sharedRingGeom2 = new THREE.RingGeometry(0.06, 0.20, 24);
  private popupSideToggle = 1;

  // Camera screenshake & directional punch kick properties
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  public cameraOffset = new THREE.Vector3();
  public punchKickOffset = new THREE.Vector3();

  // Dynamic Screen-Space Impact Pulse for HUD VFX
  public screenPulseIntensity = 0;
  public screenPulseColor = '#facc15';

  // Hitstop (micro frame-freeze - Juice #2)
  public hitstopTimer = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.burstStarGeom = this.createStarburstGeometry(10, 0.42, 0.16);
  }

  private createStarburstGeometry(spikes: number, outerR: number, innerR: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = i * step;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  /**
   * Spawns a floating comic book text or coin reward popup with radial lateral offset
   * so the center aiming reticle (50%, 50%) always stays unobstructed!
   */
  public spawnComicText(pos: THREE.Vector3, textOptions?: string[], customColor?: string) {
    if (this.popups.length >= 16) {
      const oldest = this.popups.shift();
      if (oldest) {
        this.scene.remove(oldest.sprite);
        oldest.sprite.material.dispose();
      }
    }

    const words = textOptions || t().comicHitWords;
    const word = words[Math.floor(Math.random() * words.length)];

    const colors = ['#ff2222', '#ff6600', '#ff0055', '#facc15'];
    const color = customColor || colors[Math.floor(Math.random() * colors.length)];
    const tex = textureFactory.createComicTextTexture(word, color);

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });

    // Compute camera right vector to offset popup to the left or right flank of the crosshair
    this.popupSideToggle *= -1;
    const sideSign = this.popupSideToggle;
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const radialOffset = 0.55 + Math.random() * 0.4;

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.position.addScaledVector(camRight, sideSign * radialOffset);
    sprite.position.y += 0.45 + Math.random() * 0.35;
    sprite.scale.set(0.01, 0.01, 1);

    this.scene.add(sprite);

    const vel = new THREE.Vector3(0, 2.0 + Math.random() * 0.8, 0).addScaledVector(
      camRight,
      sideSign * (1.1 + Math.random() * 0.7)
    );

    this.popups.push({
      sprite,
      velocity: vel,
      age: 0,
      maxAge: 0.85,
      initialScale: 1.4,
    });
  }

  /**
   * Spawns a White & Gold Meteor Double-Hit Shockwave directly at the fist impact point
   * when Punch Speed >= 250% (Fúria Meteoro / Meteor Fury).
   */
  public spawnMeteorFistShockwave(pos: THREE.Vector3, normal: THREE.Vector3) {
    this.screenPulseIntensity = Math.min(1.0, Math.max(this.screenPulseIntensity, 0.85));
    this.screenPulseColor = '#fef08a';

    // 1. Pure White Core Impact Ring glued to the fist contact point
    const whiteRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    const whiteRing = new THREE.Mesh(this.sharedRingGeom1, whiteRingMat);
    whiteRing.position.copy(pos).addScaledVector(normal, 0.05);
    whiteRing.lookAt(pos.clone().add(normal));
    this.scene.add(whiteRing);

    this.shockwaves.push({
      mesh: whiteRing,
      age: 0,
      maxAge: 0.26,
      maxRadius: 2.35,
    });

    // 2. Golden Secondary Meteor Wave Ring
    const goldRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });
    const goldRing = new THREE.Mesh(this.sharedRingGeom2, goldRingMat);
    goldRing.position.copy(pos).addScaledVector(normal, 0.07);
    goldRing.lookAt(pos.clone().add(normal));
    this.scene.add(goldRing);

    this.shockwaves.push({
      mesh: goldRing,
      age: 0,
      maxAge: 0.32,
      maxRadius: 1.75,
    });

    this.spawnImpactSparks(pos, normal, 16);
  }

  /**
   * Spawns dual concentric shockwave rings, a 3D Starburst Impact Flash, AND 3D radial impact sparks (Juice #3).
   */
  public spawnShockwave(pos: THREE.Vector3, normal: THREE.Vector3, maxRadius = 1.8) {
    this.screenPulseIntensity = Math.min(1.0, Math.max(this.screenPulseIntensity, maxRadius * 0.48));
    this.screenPulseColor = maxRadius > 1.7 ? '#facc15' : '#ff3355';

    // 1. 3D Starburst Impact Flash
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    const starMesh = new THREE.Mesh(this.burstStarGeom, starMat);
    starMesh.position.copy(pos).addScaledVector(normal, 0.06);
    starMesh.lookAt(pos.clone().add(normal));
    starMesh.rotation.z = Math.random() * Math.PI;
    this.scene.add(starMesh);

    this.shockwaves.push({
      mesh: starMesh,
      age: 0,
      maxAge: 0.20,
      maxRadius: maxRadius * 1.25,
    });

    // 2. Outer yellow blast ring
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const ringMesh1 = new THREE.Mesh(this.sharedRingGeom1, ringMat1);
    ringMesh1.position.copy(pos).addScaledVector(normal, 0.04);
    ringMesh1.lookAt(pos.clone().add(normal));
    this.scene.add(ringMesh1);

    this.shockwaves.push({
      mesh: ringMesh1,
      age: 0,
      maxAge: 0.34,
      maxRadius,
    });

    // 3. Inner crimson core shockwave ring
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xff1144,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const ringMesh2 = new THREE.Mesh(this.sharedRingGeom2, ringMat2);
    ringMesh2.position.copy(pos).addScaledVector(normal, 0.05);
    ringMesh2.lookAt(pos.clone().add(normal));
    this.scene.add(ringMesh2);

    this.shockwaves.push({
      mesh: ringMesh2,
      age: 0,
      maxAge: 0.24,
      maxRadius: maxRadius * 0.68,
    });

    // 4. Spawn radial 3D sparks
    this.spawnImpactSparks(pos, normal, 12);
  }

  public spawnImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3, count = 12) {
    const colors = [0xffea00, 0xff2244, 0xffffff, 0x00e5ff];
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= 60) break;
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 1.0,
      });
      const spark = new THREE.Mesh(this.sparkGeom, mat);
      spark.position.copy(pos).addScaledVector(normal, 0.08);

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 9.5,
        1.8 + Math.random() * 6.0,
        (Math.random() - 0.5) * 9.5
      ).addScaledVector(normal, 3.8 + Math.random() * 4.5);

      this.scene.add(spark);
      this.sparks.push({
        mesh: spark,
        velocity: spread,
        age: 0,
        maxAge: 0.45 + Math.random() * 0.22,
      });
    }
  }

  /**
   * Triggers directional camera shake, recoil kick, and micro hitstop (Juice #2 & #5).
   */
  public triggerPunchShake(intensity = 0.08, hitstopMs = 30, kickDir?: THREE.Vector3) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = 0.20;
    this.shakeTimer = 0.20;
    this.hitstopTimer = Math.max(this.hitstopTimer, hitstopMs / 1000);

    if (kickDir) {
      this.punchKickOffset.addScaledVector(kickDir, -intensity * 1.35);
    }
  }

  /**
   * Per-frame update for effects, sparks, wind blades, and camera shake.
   */
  public update(delta: number): boolean {
    if (this.screenPulseIntensity > 0) {
      this.screenPulseIntensity = Math.max(0, this.screenPulseIntensity - delta * 4.5);
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      return true;
    }

    this.punchKickOffset.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 18));

    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const curIntensity = this.shakeIntensity * progress * progress;
      this.cameraOffset.set(
        (Math.random() - 0.5) * 2 * curIntensity + this.punchKickOffset.x,
        (Math.random() - 0.5) * 2 * curIntensity + this.punchKickOffset.y,
        (Math.random() - 0.5) * curIntensity * 0.7 + this.punchKickOffset.z
      );
    } else {
      this.cameraOffset.copy(this.punchKickOffset);
      this.shakeIntensity = 0;
    }

    // Popups update
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += delta;

      if (p.age >= p.maxAge) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.popups.splice(i, 1);
        continue;
      }

      p.sprite.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.94);

      const progress = p.age / p.maxAge;
      if (progress < 0.18) {
        const tProg = progress / 0.18;
        const s = p.initialScale * (0.2 + Math.sin(tProg * (Math.PI / 2)) * 1.25);
        p.sprite.scale.set(s, s * 0.45, 1);
      } else if (progress < 0.35) {
        const tProg = (progress - 0.18) / 0.17;
        const s = p.initialScale * THREE.MathUtils.lerp(1.45, 1.05, tProg);
        p.sprite.scale.set(s, s * 0.45, 1);
      } else {
        const fade = 1 - (progress - 0.35) / 0.65;
        p.sprite.material.opacity = Math.max(0, fade);
      }
    }

    // Shockwaves update (shared geometry is NOT disposed here!)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += delta;

      if (sw.age >= sw.maxAge) {
        this.scene.remove(sw.mesh);
        (sw.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = sw.age / sw.maxAge;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const scale = Math.max(0.1, easeOut * sw.maxRadius);
      sw.mesh.scale.set(scale, scale, 1);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - progress);
    }

    // 3D Sparks update
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.age += delta;
      if (sp.age >= sp.maxAge) {
        this.scene.remove(sp.mesh);
        (sp.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      sp.velocity.y -= 22.0 * delta;
      sp.mesh.position.addScaledVector(sp.velocity, delta);
      if (sp.mesh.position.y < 0.08) {
        sp.mesh.position.y = 0.08;
        sp.velocity.y = Math.abs(sp.velocity.y) * 0.6;
      }
      sp.mesh.rotation.x += 12 * delta;
      sp.mesh.rotation.y += 12 * delta;
      const p = 1 - sp.age / sp.maxAge;
      sp.mesh.scale.setScalar(Math.max(0.05, p));
    }

    return false;
  }

  public clearAll() {
    for (const p of this.popups) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this.popups = [];

    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      (sw.mesh.material as THREE.Material).dispose();
    }
    this.shockwaves = [];

    for (const sp of this.sparks) {
      this.scene.remove(sp.mesh);
      (sp.mesh.material as THREE.Material).dispose();
    }
    this.sparks = [];
  }
}
