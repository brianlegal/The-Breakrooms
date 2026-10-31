/**
 * Enhanced Procedural High-Detail Textures & Bump Maps for Backrooms Wall Breaker 3D.
 * Strict 100% Biome Separation (ZERO yellow bleed into Poolrooms, Pipe Dreams, or Hospital!):
 * - Biome 1 ('level0', Lv. 1–3): Classic Yellow Wallpaper & Yellow/Black Reinforced Brick
 * - Biome 2 ('poolrooms', Lv. 4–6): White/Aqua Ceramic Tiles & Deep Navy/Cyan Tempered Glass Block Reinforced Walls
 * - Biome 3 ('pipedreams', Lv. 7–9): Dark Industrial Concrete & Riveted Rusted Steel with Orange/Grey Stripes
 * - Biome 4 ('hospital', Lv. 10+): Level "!" Red Emergency Hospital Walls & Crimson Bio-Containment Armor
 */
import * as THREE from 'three';
import { GloveSkinId } from './progression';

export type WallVariant = 'normal' | 'reinforced' | 'golden' | 'border' | 'electric';
export type BiomeType = 'level0' | 'poolrooms' | 'pipedreams' | 'hospital';

class TextureFactory {
  private cache: Map<string, THREE.Texture> = new Map();

  /**
   * Cel-shading step ramp for MeshToonMaterial (5 rich tones for deep comic + PBR-like shading).
   */
  public getToonRamp(): THREE.DataTexture {
    const key = 'toon-ramp-v2';
    if (this.cache.has(key)) return this.cache.get(key) as THREE.DataTexture;

    const size = 256;
    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size; i++) {
      let level = 42;
      if (i > 215) level = 255;
      else if (i > 145) level = 225;
      else if (i > 85) level = 175;
      else if (i > 38) level = 115;

      data[i * 4] = level;
      data[i * 4 + 1] = level;
      data[i * 4 + 2] = level;
      data[i * 4 + 3] = 255;
    }

    const rampTexture = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    rampTexture.minFilter = THREE.NearestFilter;
    rampTexture.magFilter = THREE.NearestFilter;
    rampTexture.needsUpdate = true;
    this.cache.set(key, rampTexture);
    return rampTexture;
  }

  /**
   * Procedural Bump Map for walls.
   */
  public getWallBumpMap(): THREE.CanvasTexture {
    const key = 'wall-bump-v2';
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 44;
      const v = Math.max(0, Math.min(255, 128 + n));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = '#a8a8a8';
    ctx.lineWidth = 4;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 445, 512, 12);
    ctx.fillStyle = '#303030';
    ctx.fillRect(0, 457, 512, 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Backrooms Wall Texture Generator with 100% Biome Identity for BOTH 'normal' and 'reinforced' walls!
   */
  public getBackroomsWallpaper(
    variant: WallVariant = 'normal',
    biome: BiomeType = 'level0'
  ): THREE.CanvasTexture {
    const key = `wallpaper-v6-${variant}-${biome}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (variant === 'normal') {
      if (biome === 'poolrooms') {
        // BIOME 2 (LEVEL 37 POOLROOMS): Crisp White & Subliminal Aqua Ceramic Tiles (ZERO YELLOW!)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#f0fdfa');
        bgGrad.addColorStop(0.7, '#ccfbf1');
        bgGrad.addColorStop(1, '#5eead4');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#0d9488';
        ctx.lineWidth = 3;
        const tileS = 64;
        for (let y = 0; y < 512; y += tileS) {
          for (let x = 0; x < 512; x += tileS) {
            ctx.fillStyle = (x / tileS + y / tileS) % 2 === 0 ? '#f0fdfa' : '#e0f2fe';
            ctx.fillRect(x + 2, y + 2, tileS - 4, tileS - 4);
            ctx.strokeRect(x, y, tileS, tileS);
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillRect(x + 6, y + 6, tileS - 18, 8);
          }
        }

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 456, 512, 56);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 462, 512, 12);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 506);
      } else if (biome === 'pipedreams') {
        // BIOME 3 (LEVEL 2 PIPE DREAMS): Dark Industrial Concrete & Rust Pipes (ZERO YELLOW!)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#3f3f46');
        bgGrad.addColorStop(0.5, '#52525b');
        bgGrad.addColorStop(1, '#27272a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 5;
        ctx.strokeRect(8, 8, 240, 440);
        ctx.strokeRect(264, 8, 240, 440);

        const pipeY = [95, 365];
        for (const py of pipeY) {
          ctx.fillStyle = '#7c2d12';
          ctx.fillRect(0, py, 512, 34);
          ctx.fillStyle = '#c2410c';
          ctx.fillRect(0, py + 6, 512, 10);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.strokeRect(0, py, 512, 34);
        }

        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 456, 512, 56);
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 506);
      } else if (biome === 'hospital') {
        // BIOME 4 (LEVEL "!" EMERGENCY HOSPITAL): Sterile White/Grey Panels + Crimson Emergency Band (ZERO YELLOW!)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#e2e8f0');
        bgGrad.addColorStop(0.55, '#cbd5e1');
        bgGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Hospital sterile wall panel seams
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        for (let x = 128; x < 512; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 456);
          ctx.stroke();
        }

        // Red Emergency Corridor Stripe (Pure geometric trim — zero text!)
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(0, 210, 512, 76);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 218, 512, 60);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(0, 244, 512, 8);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 210, 512, 76);

        // Dark hospital bumper rail & baseboard
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 456, 512, 56);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, 462, 512, 10);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 506);
      } else {
        // BIOME 1 (LEVEL 0 THE LOBBY): Classic Mono-Yellow Vintage Wallpaper
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#cbb04c');
        bgGrad.addColorStop(0.15, '#e2c562');
        bgGrad.addColorStop(0.82, '#d5b650');
        bgGrad.addColorStop(1, '#9c812e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        const imgData = ctx.getImageData(0, 0, 512, 512);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const noise = (Math.random() - 0.5) * 18;
          d[i] = Math.max(0, Math.min(255, d[i] + noise));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise * 0.9));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise * 0.7));
        }
        ctx.putImageData(imgData, 0, 0);

        for (let x = 0; x < 512; x += 64) {
          ctx.fillStyle = 'rgba(175, 140, 42, 0.34)';
          ctx.fillRect(x, 0, 32, 456);
          ctx.fillStyle = 'rgba(95, 72, 16, 0.25)';
          ctx.fillRect(x + 30, 0, 2, 456);
        }

        for (let y = 36; y < 440; y += 64) {
          for (let x = 32; x < 512; x += 64) {
            ctx.strokeStyle = '#997a26';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y - 16);
            ctx.quadraticCurveTo(x + 16, y, x, y + 16);
            ctx.quadraticCurveTo(x - 16, y, x, y - 16);
            ctx.stroke();

            ctx.fillStyle = '#785e19';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#5c471b';
        ctx.fillRect(0, 456, 512, 56);
        ctx.fillStyle = '#785e24';
        ctx.fillRect(0, 462, 512, 12);

        ctx.strokeStyle = '#1f1808';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 506);
      }
    } else if (variant === 'reinforced') {
      // BIOME-SPECIFIC REINFORCED WALLS (No yellow outside Level 0!)
      if (biome === 'poolrooms') {
        // POOLROOMS REINFORCED: Deep Navy/Cyan Tempered Glass Blocks with Aqua Steel Grid (ZERO YELLOW!)
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(0, 0, 512, 512);

        const blockS = 64;
        for (let y = 0; y < 512; y += blockS) {
          for (let x = 0; x < 512; x += blockS) {
            const g = ctx.createLinearGradient(x, y, x + blockS, y + blockS);
            g.addColorStop(0, '#38bdf8');
            g.addColorStop(0.5, '#0284c7');
            g.addColorStop(1, '#082f49');
            ctx.fillStyle = g;
            ctx.fillRect(x + 4, y + 4, blockS - 8, blockS - 8);

            // Tempered glass specular reflection
            ctx.fillStyle = 'rgba(224, 242, 254, 0.55)';
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 8);
            ctx.lineTo(x + blockS - 14, y + 8);
            ctx.lineTo(x + 8, y + blockS - 14);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, blockS - 4, blockS - 4);
          }
        }

        // Cyan & Navy Tempered Armor Band in Center
        ctx.fillStyle = '#082f49';
        ctx.fillRect(0, 190, 512, 132);
        ctx.fillStyle = '#22d3ee';
        for (let i = -512; i < 1024; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 198);
          ctx.lineTo(i + 32, 198);
          ctx.lineTo(i - 40, 314);
          ctx.lineTo(i - 72, 314);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#082f49';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 498, 498);
      } else if (biome === 'pipedreams') {
        // PIPE DREAMS REINFORCED: Heavy Rusted Steel Plate with Rivets & Orange/Charcoal Stripes (ZERO YELLOW!)
        const steelGrad = ctx.createLinearGradient(0, 0, 512, 512);
        steelGrad.addColorStop(0, '#431407');
        steelGrad.addColorStop(0.5, '#27272a');
        steelGrad.addColorStop(1, '#18181b');
        ctx.fillStyle = steelGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Heavy welded iron plates & rivets
        const plateH = 64;
        const plateW = 128;
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4;
        for (let row = 0; row < 8; row++) {
          const y = row * plateH;
          const offset = (row % 2) * (plateW / 2);
          for (let col = -1; col < 5; col++) {
            const x = col * plateW + offset;
            ctx.fillStyle = (row + col) % 2 === 0 ? '#57534e' : '#7c2d12';
            ctx.fillRect(x + 3, y + 3, plateW - 6, plateH - 6);
            ctx.strokeRect(x, y, plateW, plateH);
            // Steel corner rivets
            ctx.fillStyle = '#a8a29e';
            ctx.beginPath();
            ctx.arc(x + 12, y + 12, 4, 0, Math.PI * 2);
            ctx.arc(x + plateW - 12, y + plateH - 12, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Rust-Orange & Charcoal Industrial Stripes (Zero yellow!)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 190, 512, 132);
        ctx.fillStyle = '#ea580c';
        for (let i = -512; i < 1024; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 198);
          ctx.lineTo(i + 32, 198);
          ctx.lineTo(i - 40, 314);
          ctx.lineTo(i - 72, 314);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 498, 498);
      } else if (biome === 'hospital') {
        // HOSPITAL LEVEL "!" REINFORCED: Crimson & Steel Bio-Containment Armor (ZERO YELLOW!)
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, 512, 512);

        const cellH = 64;
        const cellW = 128;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        for (let row = 0; row < 8; row++) {
          const y = row * cellH;
          for (let col = 0; col < 4; col++) {
            const x = col * cellW;
            ctx.fillStyle = (row + col) % 2 === 0 ? '#475569' : '#64748b';
            ctx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }

        // Crimson Red & White Bio-Containment Stripes
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(0, 190, 512, 132);
        ctx.fillStyle = '#ef4444';
        for (let i = -512; i < 1024; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 198);
          ctx.lineTo(i + 32, 198);
          ctx.lineTo(i - 40, 314);
          ctx.lineTo(i - 72, 314);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 498, 498);
      } else {
        // LEVEL 0 REINFORCED: Classic Yellow & Black Brick Wall
        ctx.fillStyle = '#9c8238';
        ctx.fillRect(0, 0, 512, 512);

        const brickH = 32;
        const brickW = 64;
        ctx.strokeStyle = '#473b18';
        ctx.lineWidth = 3;
        for (let row = 0; row < 16; row++) {
          const y = row * brickH;
          const offset = (row % 2) * (brickW / 2);
          for (let col = -1; col < 9; col++) {
            const x = col * brickW + offset;
            ctx.fillStyle = (row + col) % 3 === 0 ? '#8c732e' : '#a88c3f';
            ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
            ctx.strokeRect(x, y, brickW, brickH);
          }
        }

        ctx.fillStyle = 'rgba(24, 20, 15, 0.9)';
        ctx.fillRect(0, 190, 512, 132);
        ctx.fillStyle = '#facc15';
        for (let i = -512; i < 1024; i += 64) {
          ctx.beginPath();
          ctx.moveTo(i, 198);
          ctx.lineTo(i + 32, 198);
          ctx.lineTo(i - 40, 314);
          ctx.lineTo(i - 72, 314);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = '#14120e';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 498, 498);
      }
    } else if (variant === 'electric') {
      // Level 5+ Electric Hazard Wall: Pure Geometric Visual Warning with Chevrons, Vector Lightning & Glowing Plasma Arcs (ZERO TEXT)
      const elecGrad = ctx.createLinearGradient(0, 0, 0, 512);
      elecGrad.addColorStop(0, '#070b12');
      elecGrad.addColorStop(0.25, '#0f172a');
      elecGrad.addColorStop(0.75, '#1e293b');
      elecGrad.addColorStop(1, '#070b12');
      ctx.fillStyle = elecGrad;
      ctx.fillRect(0, 0, 512, 512);

      // 1. Electromagnetic Induction Busbars & Terminal Nodes (Vertical conductors)
      const drawBusbar = (x: number) => {
        const busGrad = ctx.createLinearGradient(x, 0, x + 24, 0);
        busGrad.addColorStop(0, '#0e7490');
        busGrad.addColorStop(0.45, '#67e8f9');
        busGrad.addColorStop(0.75, '#22d3ee');
        busGrad.addColorStop(1, '#0891b2');
        ctx.fillStyle = busGrad;
        ctx.fillRect(x, 16, 24, 480);
        ctx.strokeStyle = '#083344';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 16, 24, 480);

        // Insulator node rings
        for (let y = 48; y < 480; y += 48) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x + 12, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + 10, y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      drawBusbar(16);
      drawBusbar(472);

      // 2. Horizontal Conductor Grid Lines
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
      ctx.lineWidth = 3;
      for (let y = 64; y < 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(472, y);
        ctx.stroke();
      }

      // 3. 45° Diagonal Industrial Hazard Chevrons (Top & Bottom Warning Bands)
      const drawHazardBand = (startY: number, bandH: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(40, startY, 432, bandH);
        ctx.clip();

        // Dark slate base
        ctx.fillStyle = '#090d16';
        ctx.fillRect(40, startY, 432, bandH);

        // High-contrast electric yellow warning chevrons at 45°
        ctx.fillStyle = '#facc15';
        const stripeW = 28;
        for (let sx = 0; sx < 540 + bandH; sx += stripeW * 2) {
          ctx.beginPath();
          ctx.moveTo(sx, startY);
          ctx.lineTo(sx + stripeW, startY);
          ctx.lineTo(sx + stripeW - bandH, startY + bandH);
          ctx.lineTo(sx - bandH, startY + bandH);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Outer cyan containment frame for the hazard band
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, startY, 432, bandH);
      };
      drawHazardBand(20, 42);
      drawHazardBand(450, 42);

      // 4. Multi-Pass High-Energy Branched Plasma Arcs
      interface ArcPath {
        points: { x: number; y: number }[];
        branches?: { x: number; y: number }[][];
      }
      const arcConfigs: ArcPath[] = [
        {
          points: [
            { x: 40, y: 110 },
            { x: 105, y: 135 },
            { x: 165, y: 95 },
            { x: 230, y: 130 },
            { x: 310, y: 90 },
            { x: 385, y: 130 },
            { x: 472, y: 105 },
          ],
          branches: [
            [
              { x: 165, y: 95 },
              { x: 195, y: 70 },
              { x: 225, y: 65 },
            ],
            [
              { x: 310, y: 90 },
              { x: 345, y: 72 },
              { x: 370, y: 66 },
            ],
          ],
        },
        {
          points: [
            { x: 40, y: 220 },
            { x: 90, y: 250 },
            { x: 140, y: 205 },
            { x: 155, y: 235 },
          ],
          branches: [
            [
              { x: 90, y: 250 },
              { x: 115, y: 285 },
              { x: 140, y: 310 },
            ],
          ],
        },
        {
          points: [
            { x: 355, y: 245 },
            { x: 390, y: 215 },
            { x: 430, y: 260 },
            { x: 472, y: 230 },
          ],
          branches: [
            [
              { x: 390, y: 215 },
              { x: 415, y: 180 },
            ],
          ],
        },
        {
          points: [
            { x: 40, y: 390 },
            { x: 110, y: 365 },
            { x: 175, y: 415 },
            { x: 250, y: 380 },
            { x: 330, y: 420 },
            { x: 405, y: 375 },
            { x: 472, y: 400 },
          ],
          branches: [
            [
              { x: 175, y: 415 },
              { x: 205, y: 442 },
            ],
            [
              { x: 330, y: 420 },
              { x: 360, y: 445 },
            ],
          ],
        },
      ];

      const drawArcPoints = (pts: { x: number; y: number }[]) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      };

      const renderAllArcs = () => {
        for (const arc of arcConfigs) {
          drawArcPoints(arc.points);
          if (arc.branches) {
            for (const br of arc.branches) {
              drawArcPoints(br);
            }
          }
        }
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1: Outer Cyan Corona Aura
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.42)';
      ctx.lineWidth = 14;
      renderAllArcs();

      // Pass 2: Vivid Streamer Arc
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      renderAllArcs();

      // Pass 3: Hot Bright White Plasma Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      renderAllArcs();

      ctx.restore();

      // 5. Center Geometric Vector Lightning Hazard Emblem (Pure 2D Path, ZERO TEXT)
      // Outer Warning Diamond Plate
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(256, 142);
      ctx.lineTo(362, 256);
      ctx.lineTo(256, 370);
      ctx.lineTo(150, 256);
      ctx.closePath();
      ctx.fillStyle = '#090d16';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 7;
      ctx.stroke();

      // Inner Diamond Ring
      ctx.beginPath();
      ctx.moveTo(256, 156);
      ctx.lineTo(348, 256);
      ctx.lineTo(256, 356);
      ctx.lineTo(164, 256);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Corner Mechanical Rivets
      const rivets = [
        { x: 256, y: 160 },
        { x: 344, y: 256 },
        { x: 256, y: 352 },
        { x: 168, y: 256 },
      ];
      for (const r of rivets) {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(r.x - 1, r.y - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bold Geometric Vector Lightning Bolt (2D path)
      ctx.beginPath();
      ctx.moveTo(270, 172);
      ctx.lineTo(218, 254);
      ctx.lineTo(254, 254);
      ctx.lineTo(238, 338);
      ctx.lineTo(296, 246);
      ctx.lineTo(262, 246);
      ctx.closePath();

      // Electric Yellow fill with bright orange outline
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner White Hot Plasma Core Highlight
      ctx.beginPath();
      ctx.moveTo(268, 186);
      ctx.lineTo(228, 248);
      ctx.lineTo(252, 248);
      ctx.lineTo(245, 316);
      ctx.lineTo(285, 252);
      ctx.lineTo(260, 252);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fill();

      ctx.restore();

      // 6. Outer Heavy Cyan Electric Wall Trim
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, 500, 500);
    } else if (variant === 'border') {
      // INDESTRUCTIBLE PERIMETER WALL: Raw Dark Slate Concrete & Navy Steel + Crimson Alert Beacons
      const armorGrad = ctx.createLinearGradient(0, 0, 0, 512);
      armorGrad.addColorStop(0, '#0f172a');
      armorGrad.addColorStop(0.5, '#1e293b');
      armorGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = armorGrad;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#111827';
      ctx.fillRect(28, 28, 456, 160);
      ctx.fillRect(28, 324, 456, 160);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.strokeRect(28, 28, 456, 160);
      ctx.strokeRect(28, 324, 456, 160);

      ctx.fillStyle = '#450a0a';
      ctx.fillRect(20, 204, 472, 104);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.strokeRect(20, 204, 472, 104);

      const beaconX = [68, 444];
      for (const bx of beaconX) {
        const rad = ctx.createRadialGradient(bx, 256, 4, bx, 256, 28);
        rad.addColorStop(0, '#ffffff');
        rad.addColorStop(0.4, '#ef4444');
        rad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(bx, 256, 28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pure geometric armored chevron plate between perimeter beacons (zero text!)
      ctx.save();
      ctx.beginPath();
      ctx.rect(112, 214, 288, 84);
      ctx.clip();
      ctx.fillStyle = '#7f1d1d';
      for (let x = 80; x < 440; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 214);
        ctx.lineTo(x + 24, 214);
        ctx.lineTo(x - 4, 298);
        ctx.lineTo(x - 28, 298);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      ctx.strokeRect(112, 214, 288, 84);

      ctx.fillStyle = '#64748b';
      for (const rx of [48, 256, 464]) {
        for (const ry of [48, 168, 344, 464]) {
          ctx.beginPath();
          ctx.arc(rx, ry, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 18;
      ctx.strokeRect(9, 9, 494, 494);
    } else {
      // BIOME-SPECIFIC BONUS JACKPOT WALLS (variant === 'golden'): ZERO yellow outside Level 0 & ZERO text!
      if (biome === 'poolrooms') {
        // POOLROOMS BONUS: Aqua/Silver Diamond Crystal Mirrored Tiles (ZERO YELLOW & ZERO TEXT!)
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#cffafe');
        grad.addColorStop(0.65, '#22d3ee');
        grad.addColorStop(1, '#0284c7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        const cell = 64;
        for (let y = 0; y < 512; y += cell) {
          for (let x = 0; x < 512; x += cell) {
            ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? '#ecfeff' : '#67e8f9';
            ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
            // Diamond facet specular prism
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.moveTo(x + cell / 2, y + 6);
            ctx.lineTo(x + cell - 6, y + cell / 2);
            ctx.lineTo(x + cell / 2, y + cell - 6);
            ctx.lineTo(x + 6, y + cell / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0369a1';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, cell, cell);
          }
        }

        // Pure geometric diamond crystal centerpiece (zero text)
        ctx.fillStyle = '#083344';
        ctx.fillRect(48, 208, 416, 96);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 6;
        ctx.strokeRect(48, 208, 416, 96);
        for (const cx of [144, 256, 368]) {
          ctx.fillStyle = '#ecfeff';
          ctx.beginPath();
          ctx.moveTo(cx, 222);
          ctx.lineTo(cx + 34, 256);
          ctx.lineTo(cx, 290);
          ctx.lineTo(cx - 34, 256);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, 500, 500);
      } else if (biome === 'pipedreams') {
        // PIPE DREAMS BONUS: Copper/Magma Industrial Boiler Wall with Incandescent Core (ZERO YELLOW & ZERO TEXT!)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
        bgGrad.addColorStop(0, '#18181b');
        bgGrad.addColorStop(0.5, '#27272a');
        bgGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 512, 512);

        // Glowing Magma / Molten Copper Furnace Seams
        for (let y = 0; y < 512; y += 64) {
          const off = ((y / 64) % 2) * 64;
          for (let x = -64; x < 512; x += 128) {
            const g = ctx.createLinearGradient(x + off, y, x + off + 128, y + 64);
            g.addColorStop(0, '#431407');
            g.addColorStop(0.5, '#9a3412');
            g.addColorStop(1, '#27272a');
            ctx.fillStyle = g;
            ctx.fillRect(x + off + 4, y + 4, 120, 56);
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 4;
            ctx.strokeRect(x + off + 2, y + 2, 124, 60);
          }
        }

        // Incandescent Orange/Red Boiler Core Grate (pure geometric grate bars — zero text!)
        const coreGrad = ctx.createRadialGradient(256, 256, 16, 256, 256, 170);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.35, '#fb923c');
        coreGrad.addColorStop(0.7, '#ea580c');
        coreGrad.addColorStop(1, '#7c2d12');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(56, 196, 400, 120);
        ctx.fillStyle = '#18181b';
        for (let gx = 96; gx <= 416; gx += 40) {
          ctx.fillRect(gx - 5, 196, 10, 120);
        }
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 8;
        ctx.strokeRect(56, 196, 400, 120);

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, 500, 500);
      } else if (biome === 'hospital') {
        // HOSPITAL BONUS: Ruby Bio-Containment Vault Wall (Black/White Steel + Pulsing Red Core, ZERO YELLOW & ZERO TEXT!)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 512);

        for (let y = 0; y < 512; y += 64) {
          for (let x = 0; x < 512; x += 128) {
            ctx.fillStyle = (x / 128 + y / 64) % 2 === 0 ? '#f1f5f9' : '#1e293b';
            ctx.fillRect(x + 4, y + 4, 120, 56);
            ctx.strokeStyle = '#e11d48';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, 124, 60);
          }
        }

        const rubyGrad = ctx.createLinearGradient(48, 196, 464, 316);
        rubyGrad.addColorStop(0, '#881337');
        rubyGrad.addColorStop(0.5, '#e11d48');
        rubyGrad.addColorStop(1, '#4c0519');
        ctx.fillStyle = rubyGrad;
        ctx.fillRect(48, 196, 416, 120);
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 6;
        ctx.strokeRect(48, 196, 416, 120);

        // Pure geometric ruby vault core emblem (zero text)
        for (const rx of [144, 256, 368]) {
          ctx.fillStyle = '#ffe4e6';
          ctx.beginPath();
          ctx.moveTo(rx, 218);
          ctx.lineTo(rx + 36, 256);
          ctx.lineTo(rx, 294);
          ctx.lineTo(rx - 36, 256);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#881337';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        ctx.strokeStyle = '#ff1144';
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, 500, 500);
      } else {
        // LEVEL 0 BONUS: Classic Radiant Gold Bullion Brick Texture
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.35, '#facc15');
        grad.addColorStop(0.7, '#eab308');
        grad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 4;
        for (let y = 0; y < 512; y += 64) {
          const off = ((y / 64) % 2) * 64;
          for (let x = -64; x < 512; x += 128) {
            ctx.strokeRect(x + off, y, 128, 64);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.fillRect(x + off + 8, y + 8, 112, 12);
          }
        }

        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 502, 502);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Floor Texture supporting all 4 Biomes (Level 0 Carpet, Poolrooms Aqua Tiles, Pipe Dreams Grating, Hospital Floor).
   */
  public getDampCarpetTexture(biome: BiomeType = 'level0'): THREE.CanvasTexture {
    const key = `floor-tex-v4-${biome}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    if (biome === 'poolrooms') {
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      for (let y = 0; y < 512; y += 64) {
        for (let x = 0; x < 512; x += 64) {
          ctx.fillStyle = (x / 64 + y / 64) % 2 === 0 ? '#06b6d4' : '#0e7490';
          ctx.fillRect(x + 2, y + 2, 60, 60);
          ctx.strokeRect(x, y, 64, 64);
        }
      }
    } else if (biome === 'pipedreams') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 4;
      for (let y = 0; y < 512; y += 64) {
        for (let x = 0; x < 512; x += 64) {
          ctx.strokeRect(x, y, 64, 64);
          ctx.fillStyle = '#27272a';
          ctx.fillRect(x + 12, y + 12, 40, 40);
        }
      }
    } else if (biome === 'hospital') {
      // Dark Hospital Linoleum with Red Emergency Evacuation Stripe
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      for (let y = 0; y < 512; y += 64) {
        for (let x = 0; x < 512; x += 64) {
          ctx.fillStyle = (x / 64 + y / 64) % 2 === 0 ? '#0f172a' : '#1e293b';
          ctx.fillRect(x + 2, y + 2, 60, 60);
          ctx.strokeRect(x, y, 64, 64);
        }
      }
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(236, 0, 40, 512);
      ctx.fillRect(0, 236, 512, 40);
    } else {
      ctx.fillStyle = '#947e37';
      ctx.fillRect(0, 0, 512, 512);

      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const weave = ((x % 4 < 2 ? 1 : -1) * (y % 4 < 2 ? 1 : -1)) * 10;
          const noise = (Math.random() - 0.5) * 32 + weave;
          data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise * 0.9));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise * 0.65));
        }
      }
      ctx.putImageData(imgData, 0, 0);

      ctx.fillStyle = 'rgba(48, 38, 12, 0.24)';
      ctx.beginPath();
      ctx.ellipse(150, 200, 95, 65, 0.4, 0, Math.PI * 2);
      ctx.ellipse(380, 370, 85, 95, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(38, 30, 10, 0.5)';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 512, 512);
      ctx.beginPath();
      ctx.moveTo(256, 0);
      ctx.lineTo(256, 512);
      ctx.moveTo(0, 256);
      ctx.lineTo(512, 256);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Ceiling Tiles supporting all 4 Biomes.
   */
  public getCeilingTexture(biome: BiomeType = 'level0'): THREE.CanvasTexture {
    const key = `ceiling-tiles-v4-${biome}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle =
      biome === 'poolrooms'
        ? '#e0f2fe'
        : biome === 'pipedreams'
        ? '#27272a'
        : biome === 'hospital'
        ? '#1e293b'
        : '#dfd9bc';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle =
      biome === 'pipedreams' || biome === 'hospital'
        ? 'rgba(0,0,0,0.5)'
        : 'rgba(65, 58, 38, 0.42)';
    for (let y = 12; y < 512; y += 16) {
      for (let x = 12; x < 512; x += 16) {
        if ((x + y) % 32 === 0 || Math.random() > 0.35) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    ctx.strokeStyle =
      biome === 'poolrooms'
        ? '#0284c7'
        : biome === 'hospital'
        ? '#991b1b'
        : '#3b3524';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 504);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Biome-Specific Fractured Core Interior Texture for wall shards (prevents yellow interior in non-yellow biomes!).
   */
  public getDrywallCoreTexture(biome: BiomeType = 'level0'): THREE.CanvasTexture {
    const key = `drywall-core-v4-${biome}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    if (biome === 'poolrooms') {
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 650; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#bae6fd';
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
      }
    } else if (biome === 'pipedreams') {
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 650; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#9a3412' : '#27272a';
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 3.5, 3.5);
      }
    } else if (biome === 'hospital') {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 650; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#dc2626' : '#64748b';
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
      }
    } else {
      ctx.fillStyle = '#ece7dc';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 850; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#8c8270' : '#c4bca8';
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = Math.random() * 3.5 + 1;
        ctx.fillRect(x, y, r, r);
      }
    }

    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 250);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Muscular Skin Texture for giant forearms & knuckles.
   */
  public getArmSkinTexture(): THREE.CanvasTexture {
    const key = 'arm-skin-v2';
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#f5be97');
    grad.addColorStop(0.5, '#e6a376');
    grad.addColorStop(1, '#c98255');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 0.8));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(115, 58, 28, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(120, 60);
    ctx.quadraticCurveTo(160, 256, 130, 440);
    ctx.moveTo(380, 80);
    ctx.quadraticCurveTo(340, 256, 370, 430);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * High-Detail Demolition Ball Texture.
   */
  public getDemolitionBallTexture(): THREE.CanvasTexture {
    const key = 'demolition-ball-v2';
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(256, 170, 30, 256, 256, 280);
    grad.addColorStop(0, '#ff4d79');
    grad.addColorStop(0.45, '#e11d48');
    grad.addColorStop(0.85, '#881337');
    grad.addColorStop(1, '#4c0519');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 206, 512, 100);

    ctx.fillStyle = '#18181b';
    for (let x = -512; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 206);
      ctx.lineTo(x + 32, 206);
      ctx.lineTo(x - 16, 306);
      ctx.lineTo(x - 48, 306);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 70, 512, 12);
    ctx.strokeRect(0, 430, 512, 12);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);
    ctx.beginPath();
    ctx.moveTo(0, 206);
    ctx.lineTo(512, 206);
    ctx.moveTo(0, 306);
    ctx.lineTo(512, 306);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }

  /**
   * Procedural Comic Book Punch Impact Text Sprites (cached by text+color).
   */
  public createComicTextTexture(text: string, color = '#ff2222'): THREE.CanvasTexture {
    const cacheKey = `comic-txt-${text}-${color}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;

    const cx = 160;
    const cy = 70;
    const spikes = 14;
    const outerRadius = 64;
    const innerRadius = 38;

    ctx.save();
    ctx.beginPath();
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();

    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();

    ctx.font = '900 30px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 9;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy);

    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx - 1.5, cy - 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(cacheKey, tex);
    return tex;
  }

  /**
   * Stitched Leather, Cyber Neon, Mecha Chrome, Volcanic Magma, and Void Matter Textures for Brawler Gloves!
   */
  public getGloveLeatherTexture(
    isGolden = false,
    skinId: GloveSkinId = 'classic_red'
  ): THREE.CanvasTexture {
    const key = `glove-leather-v3-${isGolden}-${skinId}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const baseGrad = ctx.createRadialGradient(256, 180, 30, 256, 256, 340);
    if (isGolden) {
      baseGrad.addColorStop(0, '#fef08a');
      baseGrad.addColorStop(0.45, '#f59e0b');
      baseGrad.addColorStop(1, '#92400e');
    } else if (skinId === 'cyber_neon') {
      baseGrad.addColorStop(0, '#22d3ee');
      baseGrad.addColorStop(0.4, '#0284c7');
      baseGrad.addColorStop(0.8, '#0f172a');
      baseGrad.addColorStop(1, '#020617');
    } else if (skinId === 'mecha_chrome') {
      baseGrad.addColorStop(0, '#f8fafc');
      baseGrad.addColorStop(0.45, '#94a3b8');
      baseGrad.addColorStop(0.85, '#334155');
      baseGrad.addColorStop(1, '#0f172a');
    } else if (skinId === 'lava_magma') {
      baseGrad.addColorStop(0, '#fde047');
      baseGrad.addColorStop(0.35, '#ea580c');
      baseGrad.addColorStop(0.75, '#7c2d12');
      baseGrad.addColorStop(1, '#1c0a00');
    } else if (skinId === 'void_matter') {
      baseGrad.addColorStop(0, '#c084fc');
      baseGrad.addColorStop(0.4, '#6b21a8');
      baseGrad.addColorStop(0.8, '#1e1b4b');
      baseGrad.addColorStop(1, '#09090b');
    } else {
      baseGrad.addColorStop(0, '#ef4444');
      baseGrad.addColorStop(0.45, '#dc2626');
      baseGrad.addColorStop(0.85, '#991b1b');
      baseGrad.addColorStop(1, '#450a0a');
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 24;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.6));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.6));
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle =
      skinId === 'cyber_neon'
        ? '#f43f5e'
        : skinId === 'lava_magma'
        ? '#fde047'
        : skinId === 'void_matter'
        ? '#e879f9'
        : 'rgba(20, 10, 10, 0.65)';
    ctx.lineWidth = 6;
    for (let y = 80; y <= 320; y += 60) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.quadraticCurveTo(256, y - 24, 488, y);
      ctx.stroke();
    }

    ctx.strokeStyle = isGolden || skinId === 'lava_magma' ? '#fef3c7' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(18, 18, 476, 476);
    ctx.strokeRect(28, 28, 456, 456);
    ctx.setLineDash([]);

    ctx.fillStyle = '#09090b';
    ctx.fillRect(116, 372, 280, 92);
    ctx.strokeStyle =
      skinId === 'cyber_neon'
        ? '#22d3ee'
        : skinId === 'mecha_chrome'
        ? '#f59e0b'
        : skinId === 'void_matter'
        ? '#c084fc'
        : '#facc15';
    ctx.lineWidth = 5;
    ctx.strokeRect(116, 372, 280, 92);

    ctx.font = '900 26px Impact, "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SMASH PRO', 256, 412);
    ctx.font = '700 13px sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('HEAVY GAUNTLET', 256, 444);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, tex);
    return tex;
  }
}

export const textureFactory = new TextureFactory();
