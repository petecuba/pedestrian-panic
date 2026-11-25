/**
 * Pedestrian Panic — Procedural Randomized Storefront Awning Generator
 * Based directly on Pete's original angled right-edge awnings (awning.png..awning6.png):
 *  - Right-wall projection with 3/4 isometric top/bottom slope & darker underside
 *  - Soft downward sidewalk drop shadow beneath each canopy
 *  - Diagonal stripes, solid matte canopies, trimmed cafes, and vertical signage
 *    (DELI, PIZZA, CAFE, BAGELS, GROCER, KEYS, BAR, BOOKS, BAKERY, etc.)
 *  - Randomized color palettes just like the Pedestrians
 */

export const AWNING_PALETTE = [
  { main: '#c92a2a', stripe: '#f03e3e', dark: '#6e1414', text: '#fff0c2' }, // Classic NYC red
  { main: '#1b5e36', stripe: '#2b7a4b', dark: '#0e361e', text: '#d8f5a2' }, // Grocer green
  { main: '#b89f12', stripe: '#d4b81c', dark: '#6b5b08', text: '#f4fce3' }, // Keys yellow-gold
  { main: '#0b5c8a', stripe: '#187ab0', dark: '#06324d', text: '#d0ebff' }, // Striped blue
  { main: '#9c5609', stripe: '#bd6d14', dark: '#542c04', text: '#ffe0b2' }, // Bar amber-brown
  { main: '#0c5c52', stripe: '#147d70', dark: '#073630', text: '#c3fae8' }, // Deep teal
  { main: '#7a2540', stripe: '#9e3556', dark: '#421020', text: '#ffdeeb' }, // Wine burgundy
  { main: '#3c4a7a', stripe: '#51639e', dark: '#1f2745', text: '#dbe4ff' }, // Slate indigo
  { main: '#bf4b24', stripe: '#de6137', dark: '#69240e', text: '#fff4e6' }, // Terracotta orange
  { main: '#583878', stripe: '#744d9c', dark: '#2d1a42', text: '#f3d9fa' }, // Plum awning
  { main: '#4d6630', stripe: '#668542', dark: '#293818', text: '#e9fac8' }, // Olive deli
  { main: '#2d3748', stripe: '#4a5568', dark: '#171c26', text: '#fde047' }, // Charcoal cafe
];

const SIGN_LABELS = [
  'GROCER', 'KEYS', 'BAR', 'DELI', 'PIZZA', 'CAFE',
  'BAGELS', 'BOOKS', 'BAKERY', 'TACOS', 'RAMEN', 'DINER',
  'BODEGA', 'DONUTS', 'SUSHI', 'LAUNDRY', 'FLOWERS', 'GYM',
];

const AWNING_BLUEPRINTS = [
  { style: 'stripes', width: 38, bodyH: 138 },
  { style: 'sign',    width: 32, bodyH: 174 },
  { style: 'solid',   width: 28, bodyH: 122 },
  { style: 'stripes', width: 32, bodyH: 108 },
  { style: 'sign',    width: 34, bodyH: 150 },
  { style: 'trimmed', width: 36, bodyH: 132 },
  { style: 'sign',    width: 30, bodyH: 162 },
  { style: 'stripes', width: 40, bodyH: 152 },
  { style: 'solid',   width: 26, bodyH: 112 },
  { style: 'sign',    width: 32, bodyH: 136 },
  { style: 'trimmed', width: 34, bodyH: 144 },
  { style: 'stripes', width: 30, bodyH: 126 },
  { style: 'sign',    width: 36, bodyH: 168 },
  { style: 'solid',   width: 30, bodyH: 130 },
  { style: 'sign',    width: 32, bodyH: 124 },
  { style: 'trimmed', width: 38, bodyH: 148 },
];

function renderAwningCanvas(bp, colors, label) {
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

  // 3. Main slanted awning canopy polygon (clipped so stripes/text fit cleanly!)
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
  } else if (bp.style === 'trimmed') {
    // Classic cafe trim bands along outer valance + inner roof
    ctx.fillStyle = colors.stripe;
    ctx.fillRect(0, 0, 9, bodyH);
    ctx.fillStyle = colors.text;
    ctx.fillRect(9, 0, 2, bodyH);
  } else if (bp.style === 'sign' && label) {
    // Vertical storefront text matching GROCER / KEYS / BAR style!
    ctx.save();
    const midY = (skewY + bodyH) * 0.48;
    const midX = w * 0.46;
    ctx.translate(midX, midY);
    ctx.rotate(Math.PI / 2);
    // Slight shear to match slanted awning perspective
    ctx.transform(1, -0.22, 0, 1, 0, 0);
    const fontSize = label.length >= 6 ? 15 : 18;
    ctx.font = `400 ${fontSize}px "Geist Pixel", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillText(label, 1, 1.5);
    ctx.fillStyle = colors.text;
    ctx.fillText(label, 0, 0);
    ctx.restore();
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
 * Generates a freshly randomized pool of 16 storefront awnings with shuffled colors & NYC signage.
 */
export function buildAwningSprites() {
  const labels = [...SIGN_LABELS].sort(() => Math.random() - 0.5);
  let labelCursor = 0;

  return AWNING_BLUEPRINTS.map((bp) => {
    const colors = AWNING_PALETTE[Math.floor(Math.random() * AWNING_PALETTE.length)];
    const label = bp.style === 'sign' ? labels[labelCursor++ % labels.length] : null;
    return renderAwningCanvas(bp, colors, label);
  });
}
