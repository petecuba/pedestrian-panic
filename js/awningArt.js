/**
 * Pedestrian Panic — Procedural Randomized Storefront Awning Generator
 * Based directly on Pete's original angled right-edge awnings (awning.png..awning6.png):
 *  - Right-wall projection with 3/4 isometric top/bottom slope & darker underside
 *  - Soft downward sidewalk drop shadow beneath each canopy
 *  - Clean text-free styles: bold stripes, thin pinstripes, ribbed solid, trimmed valance, two-tone
 *  - Randomized color palettes just like the Pedestrians
 */

export const AWNING_PALETTE = [
  { main: '#c92a2a', stripe: '#f03e3e', dark: '#6e1414', trim: '#fff0c2' }, // Classic NYC red
  { main: '#1b5e36', stripe: '#2b7a4b', dark: '#0e361e', trim: '#d8f5a2' }, // Grocer green
  { main: '#b89f12', stripe: '#d4b81c', dark: '#6b5b08', trim: '#f4fce3' }, // Warm gold
  { main: '#0b5c8a', stripe: '#187ab0', dark: '#06324d', trim: '#d0ebff' }, // Striped blue
  { main: '#9c5609', stripe: '#bd6d14', dark: '#542c04', trim: '#ffe0b2' }, // Amber-brown
  { main: '#0c5c52', stripe: '#147d70', dark: '#073630', trim: '#c3fae8' }, // Deep teal
  { main: '#7a2540', stripe: '#9e3556', dark: '#421020', trim: '#ffdeeb' }, // Wine burgundy
  { main: '#3c4a7a', stripe: '#51639e', dark: '#1f2745', trim: '#dbe4ff' }, // Slate indigo
  { main: '#bf4b24', stripe: '#de6137', dark: '#69240e', trim: '#fff4e6' }, // Terracotta orange
  { main: '#583878', stripe: '#744d9c', dark: '#2d1a42', trim: '#f3d9fa' }, // Plum awning
  { main: '#4d6630', stripe: '#668542', dark: '#293818', trim: '#e9fac8' }, // Olive deli
  { main: '#2d3748', stripe: '#4a5568', dark: '#171c26', trim: '#fde047' }, // Charcoal cafe
];

const AWNING_BLUEPRINTS = [
  { style: 'stripes',     width: 38, bodyH: 142 },
  { style: 'solid',       width: 32, bodyH: 168 },
  { style: 'trimmed',     width: 30, bodyH: 126 },
  { style: 'stripes',     width: 32, bodyH: 110 },
  { style: 'thinStripes', width: 34, bodyH: 150 },
  { style: 'twoTone',     width: 36, bodyH: 132 },
  { style: 'solid',       width: 28, bodyH: 158 },
  { style: 'stripes',     width: 40, bodyH: 154 },
  { style: 'trimmed',     width: 26, bodyH: 116 },
  { style: 'thinStripes', width: 32, bodyH: 138 },
  { style: 'twoTone',     width: 34, bodyH: 146 },
  { style: 'stripes',     width: 30, bodyH: 128 },
  { style: 'solid',       width: 36, bodyH: 164 },
  { style: 'trimmed',     width: 30, bodyH: 130 },
  { style: 'thinStripes', width: 32, bodyH: 122 },
  { style: 'twoTone',     width: 38, bodyH: 148 },
];

function renderAwningCanvas(bp, colors) {
  const w = bp.width;
  const skewY = Math.round(w * 0.72); // Angled isometric projection matching original awnings
  const bodyH = bp.bodyH;
  const shadowH = 52;
  const totalH = bodyH + shadowH;
  const scale = 2; // HiDPI crispness

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 1. Soft sidewalk drop shadow extending downward beneath awning
  const shadGrad = ctx.createLinearGradient(0, bodyH, 0, totalH);
  shadGrad.addColorStop(0, 'rgba(12, 14, 18, 0.44)');
  shadGrad.addColorStop(0.55, 'rgba(12, 14, 18, 0.22)');
  shadGrad.addColorStop(1, 'rgba(12, 14, 18, 0)');
  ctx.fillStyle = shadGrad;
  ctx.beginPath();
  ctx.moveTo(2, bodyH);
  ctx.lineTo(w, bodyH);
  ctx.lineTo(w, totalH);
  ctx.lineTo(2, totalH);
  ctx.closePath();
  ctx.fill();

  // Subtle soft left-edge shadow fade
  const leftFade = ctx.createLinearGradient(0, 0, 8, 0);
  leftFade.addColorStop(0, 'rgba(0,0,0,0)');
  leftFade.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = leftFade;
  ctx.fillRect(0, skewY, 8, bodyH - skewY);

  // 2. Darker underside triangular wedge at bottom of angled awning
  ctx.fillStyle = colors.dark;
  ctx.beginPath();
  ctx.moveTo(0, bodyH);
  ctx.lineTo(w, bodyH - skewY);
  ctx.lineTo(w, bodyH);
  ctx.closePath();
  ctx.fill();

  // 3. Main slanted awning canopy polygon
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, skewY);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, bodyH - skewY);
  ctx.lineTo(0, bodyH);
  ctx.closePath();
  ctx.clip();

  // Base fill
  ctx.fillStyle = colors.main;
  ctx.fillRect(0, 0, w, bodyH);

  // Subtle right-side highlight ridge near storefront wall
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(w - 6, 0, 6, bodyH);

  if (bp.style === 'stripes') {
    const stripePitch = 20;
    ctx.fillStyle = colors.stripe;
    for (let y = -w; y < bodyH + w; y += stripePitch) {
      ctx.beginPath();
      ctx.moveTo(0, y + skewY);
      ctx.lineTo(w, y);
      ctx.lineTo(w, y + stripePitch * 0.5);
      ctx.lineTo(0, y + skewY + stripePitch * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (bp.style === 'thinStripes') {
    const stripePitch = 13;
    ctx.fillStyle = colors.trim;
    ctx.globalAlpha = 0.72;
    for (let y = -w; y < bodyH + w; y += stripePitch) {
      ctx.beginPath();
      ctx.moveTo(0, y + skewY);
      ctx.lineTo(w, y);
      ctx.lineTo(w, y + 3.2);
      ctx.lineTo(0, y + skewY + 3.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (bp.style === 'trimmed') {
    ctx.fillStyle = colors.stripe;
    ctx.fillRect(0, 0, 9, bodyH);
    ctx.fillStyle = colors.trim;
    ctx.fillRect(9, 0, 2, bodyH);
  } else if (bp.style === 'twoTone') {
    ctx.fillStyle = colors.dark;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, 11, bodyH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.trim;
    ctx.fillRect(10, 0, 2.5, bodyH);
  } else if (bp.style === 'solid') {
    // Subtle canopy fabric seam ribs following the isometric slope
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.2;
    for (let y = 12; y < bodyH; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y + skewY);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // Crisp left valance edge line
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, skewY, 2, bodyH - skewY);
  ctx.restore();

  return {
    canvas,
    width: w,
    height: totalH,
  };
}

/**
 * Generates a freshly randomized pool of 16 text-free storefront awnings.
 */
export function buildAwningSprites() {
  return AWNING_BLUEPRINTS.map((bp) => {
    const colors = AWNING_PALETTE[Math.floor(Math.random() * AWNING_PALETTE.length)];
    return renderAwningCanvas(bp, colors);
  });
}
