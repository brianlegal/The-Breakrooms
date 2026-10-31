/**
 * PILAR 7: Vitrine 3D Real da Luva/Manopla (GloveShowcase3D)
 * - Instancia a geometria 3D esculpida real da luva do jogador (palma chanfrada, cravos nos nós dos dedos,
 *   munhequeira, anel metálico e 5 dedos fechados articulados idênticos ao `playerArms.ts`).
 * - Gira rapidamente no eixo Y (`rotation.y += delta * 3.2`) com inclinação dinâmica.
 * - Efeito VANTABLACK: Se `!isUnlocked`, aplica `new THREE.MeshBasicMaterial({ color: 0x000000 })`
 *   em todas as malhas da luva (zero reação à luz, zero reflexo, silhueta 100% negra absoluta).
 *   Quando desbloqueada, revela instantaneamente a textura, cores e cravos metálicos da skin!
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GloveSkinId } from '../game/progression';
import { materialFactory } from '../game/materials';

interface GloveShowcase3DProps {
  skinId: GloveSkinId;
  isUnlocked: boolean;
}

interface MeshMatEntry {
  mesh: THREE.Mesh;
  role: 'glove' | 'dark' | 'gold';
  outlineMesh: THREE.Object3D;
}

export const GloveShowcase3D: React.FC<GloveShowcase3DProps> = ({ skinId, isUnlocked }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<MeshMatEntry[]>([]);
  const vantablackMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = 260;
    const height = 210;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 20);
    camera.position.set(0, 0.06, 0.82);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Showcase Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff7d6, 1.8);
    keyLight.position.set(2.5, 3.5, 3.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-2.5, -1.5, -2.0);
    scene.add(rimLight);

    const vantablackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    vantablackMatRef.current = vantablackMat;

    const gloveMat = materialFactory.getBoxingGloveMaterial(false, skinId);
    const darkGloveMat = materialFactory.getGlovePalmMaterial();
    const goldMat = materialFactory.getGoldTrimMaterial();

    const entries: MeshMatEntry[] = [];
    const registerMesh = (
      geo: THREE.BufferGeometry,
      role: 'glove' | 'dark' | 'gold',
      outlineThickness = 0.012
    ): THREE.Mesh => {
      const baseMat = role === 'glove' ? gloveMat : role === 'dark' ? darkGloveMat : goldMat;
      const mesh = new THREE.Mesh(geo, baseMat);
      const outline = materialFactory.createOutlineMesh(geo, outlineThickness, 0x000000, 0xffffff);
      mesh.add(outline);
      entries.push({ mesh, role, outlineMesh: outline });
      return mesh;
    };

    // Pivot container centered on the sculpted gauntlet
    const pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    const handGroup = new THREE.Group();
    // Center the glove geometry around (0, 0, 0) so rotation is balanced
    handGroup.position.set(0, -0.01, 0.13);
    handGroup.scale.setScalar(1.38);
    pivotGroup.add(handGroup);

    // 1. Wrist Guard Cuff
    const cuffGeo = new THREE.CylinderGeometry(0.098, 0.092, 0.145, 16);
    cuffGeo.rotateX(Math.PI / 2);
    const cuffMesh = registerMesh(cuffGeo, 'dark', 0.012);
    cuffMesh.position.set(0, 0, 0.015);
    handGroup.add(cuffMesh);

    const goldRingGeo = new THREE.TorusGeometry(0.096, 0.012, 10, 24);
    const goldRing = registerMesh(goldRingGeo, 'gold', 0.008);
    goldRing.position.set(0, 0, -0.048);
    handGroup.add(goldRing);

    // 2. Sculpted Dorsal Hand & Metacarpal Armor Plate (exact geometry from playerArms.ts)
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
    const palmMesh = registerMesh(palmGeo, 'glove', 0.014);
    palmMesh.position.set(0, 0.008, -0.13);
    handGroup.add(palmMesh);

    // 3. Metallic Knuckle Impact Bar + 4 Pyramid Studs
    const knuckleBarGeo = new THREE.BoxGeometry(0.205, 0.046, 0.048, 4, 2, 2);
    const knuckleBar = registerMesh(knuckleBarGeo, 'gold', 0.01);
    knuckleBar.position.set(0, 0.038, -0.218);
    handGroup.add(knuckleBar);

    for (const kx of [-0.072, -0.024, 0.024, 0.072]) {
      const studGeo = new THREE.OctahedronGeometry(0.022, 0);
      const studMesh = registerMesh(studGeo, 'gold', 0.006);
      studMesh.position.set(kx, 0.045, -0.242);
      handGroup.add(studMesh);
    }

    // 4. Inner Palm Grip Cushion
    const gripPadGeo = new THREE.SphereGeometry(0.072, 14, 10);
    gripPadGeo.scale(1.15, 0.45, 1.05);
    const gripPad = registerMesh(gripPadGeo, 'dark', 0.008);
    gripPad.position.set(0, -0.035, -0.13);
    handGroup.add(gripPad);

    // 5. Five Articulated Closed-Fist Fingers
    const buildClosedFinger = (
      lenScale: number,
      radScale: number,
      isThumb: boolean
    ): THREE.Group => {
      const baseGroup = new THREE.Group();
      const r = 0.023 * radScale;
      const l1 = 0.068 * lenScale;
      const l2 = 0.054 * lenScale;
      const l3 = 0.044 * lenScale;

      const knuckleGeo = new THREE.SphereGeometry(r * 1.22, 10, 8);
      baseGroup.add(registerMesh(knuckleGeo, 'dark', 0.007));

      const proximalJoint = new THREE.Group();
      proximalJoint.rotation.x = isThumb ? 0.55 : 1.38;
      proximalJoint.rotation.y = isThumb ? -0.65 : 0;
      baseGroup.add(proximalJoint);

      const seg1Geo = new THREE.CylinderGeometry(r * 0.92, r * 1.06, l1, 10);
      seg1Geo.rotateX(Math.PI / 2);
      seg1Geo.translate(0, 0, -l1 * 0.5);
      proximalJoint.add(registerMesh(seg1Geo, 'glove', 0.009));

      const middleJoint = new THREE.Group();
      middleJoint.position.set(0, 0, -l1);
      middleJoint.rotation.x = isThumb ? 0.85 : 1.62;
      proximalJoint.add(middleJoint);

      const seg2Geo = new THREE.CylinderGeometry(r * 0.84, r * 0.92, l2, 10);
      seg2Geo.rotateX(Math.PI / 2);
      seg2Geo.translate(0, 0, -l2 * 0.5);
      middleJoint.add(registerMesh(seg2Geo, 'glove', 0.008));

      const distalJoint = new THREE.Group();
      distalJoint.position.set(0, 0, -l2);
      distalJoint.rotation.x = isThumb ? 0.65 : 1.35;
      middleJoint.add(distalJoint);

      const seg3Geo = new THREE.CylinderGeometry(r * 0.72, r * 0.84, l3, 10);
      seg3Geo.rotateX(Math.PI / 2);
      seg3Geo.translate(0, 0, -l3 * 0.5);
      distalJoint.add(registerMesh(seg3Geo, 'dark', 0.007));

      return baseGroup;
    };

    const fingerSpecs = [
      { x: -0.072, y: 0.016, z: -0.22, len: 0.96, rad: 0.96 },
      { x: -0.024, y: 0.022, z: -0.228, len: 1.06, rad: 1.02 },
      { x: 0.024, y: 0.018, z: -0.222, len: 0.98, rad: 0.96 },
      { x: 0.07, y: 0.008, z: -0.21, len: 0.82, rad: 0.86 },
    ];
    for (const f of fingerSpecs) {
      const fg = buildClosedFinger(f.len, f.rad, false);
      fg.position.set(f.x, f.y, f.z);
      handGroup.add(fg);
    }

    const thumb = buildClosedFinger(0.9, 1.14, true);
    thumb.position.set(-0.098, -0.014, -0.125);
    thumb.rotation.set(0.15, -0.48, -0.38);
    handGroup.add(thumb);

    entriesRef.current = entries;

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Fast Y-axis showcase rotation + subtle dynamic tilt
      pivotGroup.rotation.y += delta * 3.2;
      pivotGroup.rotation.x = 0.32 + Math.sin(elapsed * 2.4) * 0.08;
      pivotGroup.rotation.z = Math.cos(elapsed * 1.9) * 0.06;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  // Dynamically update materials whenever `skinId` or `isUnlocked` changes (Vantablack vs Unlocked Skin)
  useEffect(() => {
    const entries = entriesRef.current;
    const vantablack = vantablackMatRef.current;
    if (!entries.length || !vantablack) return;

    const gloveMat = materialFactory.getBoxingGloveMaterial(false, skinId);
    const darkMat = materialFactory.getGlovePalmMaterial();
    const goldMat = materialFactory.getGoldTrimMaterial();

    for (const item of entries) {
      if (!isUnlocked) {
        // 100% Vantablack silhouette: pure black unlit material, hide inner white cartoon outlines
        item.mesh.material = vantablack;
        item.outlineMesh.visible = false;
      } else {
        item.mesh.material =
          item.role === 'glove' ? gloveMat : item.role === 'dark' ? darkMat : goldMat;
        item.outlineMesh.visible = true;
      }
    }
  }, [skinId, isUnlocked]);

  return (
    <div
      ref={mountRef}
      className="relative flex h-[210px] w-[260px] items-center justify-center overflow-hidden rounded-[26px] border-4 border-[#7a1c14] shadow-[0_6px_0_#7a1c14,inset_0_0_28px_rgba(0,0,0,0.85)]"
      style={{
        background: isUnlocked
          ? 'radial-gradient(circle at 50% 45%, rgba(250, 204, 21, 0.35) 0%, #2a1810 72%)'
          : 'radial-gradient(circle at 50% 45%, rgba(148, 163, 184, 0.28) 0%, #0f172a 75%)',
      }}
    />
  );
};
