/**
 * Aspect-Ratio-Independent Procedural Cartoon UI Textures
 * Fixes stretching on wide/tall elements by separating:
 * 1) Fixed-aspect-ratio (64x48) Top-Left Curved Crescent + Droplet Specular Highlight (`no-repeat`)
 * 2) Fixed-aspect-ratio (56x36) Bottom-Right Rim Bounce Reflection (`no-repeat`)
 * 3) Seamless Tileable (128x128) Organic Hand-Painted Brushwork Micro-Grain (`repeat`)
 */

function createCornerSpecularTexture(): string {
  const w = 64;
  const h = 48;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Soft warm ambient halo around the top-left corner curve
  const halo = ctx.createRadialGradient(18, 14, 2, 20, 16, 26);
  halo.addColorStop(0, 'rgba(255, 255, 245, 0.42)');
  halo.addColorStop(0.55, 'rgba(255, 255, 220, 0.14)');
  halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(20, 16, 26, 0, Math.PI * 2);
  ctx.fill();

  // Crisp curved crescent highlight hugging the top-left border radius
  ctx.fillStyle = 'rgba(255, 255, 252, 0.9)';
  ctx.beginPath();
  ctx.moveTo(6, 23);
  ctx.bezierCurveTo(5, 10, 14, 4, 28, 5);
  ctx.bezierCurveTo(18, 8, 11, 14, 6, 23);
  ctx.closePath();
  ctx.fill();

  // Detached small oval droplet highlight to the right of the crescent tip
  ctx.beginPath();
  ctx.ellipse(33, 6.5, 2.6, 1.7, 0.22, 0, Math.PI * 2);
  ctx.fill();

  return `url("${canvas.toDataURL('image/png')}")`;
}

function createBottomRightBounceTexture(): string {
  const w = 56;
  const h = 36;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.translate(34, 24);
  ctx.rotate(-0.24);
  const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
  grad.addColorStop(0, 'rgba(255, 245, 175, 0.65)');
  grad.addColorStop(0.6, 'rgba(255, 235, 140, 0.22)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return `url("${canvas.toDataURL('image/png')}")`;
}

function createSeamlessBrushGrainTexture(): string {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const twoPi = Math.PI * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Seamless periodic painted brush waves + subtle enamel grain
      const nx = (x / size) * twoPi;
      const ny = (y / size) * twoPi;
      const wave =
        Math.sin(nx * 2 + ny) * 0.5 +
        Math.cos(nx - ny * 2) * 0.35 +
        (((x * 17 + y * 31) % 11) - 5) * 0.08;

      if (wave >= 0) {
        data[idx] = 255;
        data[idx + 1] = 248;
        data[idx + 2] = 210;
        data[idx + 3] = Math.min(18, Math.round(wave * 11));
      } else {
        data[idx] = 45;
        data[idx + 1] = 12;
        data[idx + 2] = 4;
        data[idx + 3] = Math.min(20, Math.round(-wave * 12));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return `url("${canvas.toDataURL('image/png')}")`;
}

let initialized = false;

export function initCartoonUiTextures(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  const root = document.documentElement;
  root.style.setProperty('--tex-corner-spec', createCornerSpecularTexture());
  root.style.setProperty('--tex-corner-bounce', createBottomRightBounceTexture());
  root.style.setProperty('--tex-brush-grain', createSeamlessBrushGrainTexture());
}
