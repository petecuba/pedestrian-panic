/**
 * Pedestrian Panic — Procedural Bicubic Pixel-Art Hero & Pedestrian Generator
 *  - Hero redrawn directly from Pete's original sprite (sky-blue collared shirt,
 *    brown hair, khaki pants, right hand holding smartphone) in the exact same
 *    44x68 -> 35x54 Mitchell-Netravali bicubic style as the Pedestrians
 *  - 32 distinct pedestrian archetypes with randomized skin, hair, clothing,
 *    pants, and accessory palettes
 *  - Softly rounded shoulders matching Hero's silhouette (no square shoulders)
 *  - Rock-steady shoulders/torso during walk cycles (zero shoulder bounce!)
 */

const MASTER_W = 44;
const MASTER_H = 68;
const OUT_W = 35;
const OUT_H = 54;

// ---------------------------------------------------------------------------
// Easy-to-edit Color Palettes (randomized per pedestrian)
// ---------------------------------------------------------------------------
export const SKIN_PALETTE = [
  '#f7d5bc', '#f2c7a5', '#ecc09c', '#e5b38c',
  '#d89c72', '#c78a5e', '#b3754d', '#99603d',
  '#824e31', '#693c24',
];

export const HAIR_PALETTE = [
  '#1c1716', '#2b1e18', '#3d281c', '#543624',
  '#6e462d', '#8c3f26', '#a85a32', '#c99b4f',
  '#dec692', '#7d7a78', '#b8b6b4', '#472a3d',
];

// Excludes Hero's sky-blue shirt (#57a4ba) so Hero always stands out!
export const CLOTHING_PALETTE = [
  '#d6564b', '#c93f4b', '#e07a3d', '#d9a438',
  '#c9b842', '#7a9442', '#3d7d5b', '#2b6b5e',
  '#354e7a', '#485680', '#664e82', '#8f6eab',
  '#b55b7a', '#cc7489', '#7d3143', '#8c4b32',
  '#b89468', '#8a7965', '#4f545e', '#3a3f4a',
  '#d6cfc2', '#e08e79', '#5d7360', '#9e6240',
];

export const PANTS_PALETTE = [
  '#2d323d', '#3a4252', '#474f5e', '#3b3938',
  '#4f463e', '#5e5448', '#2a3a4a', '#3d3647',
  '#52574a', '#262629',
];

export const ACCENT_PALETTE = [
  '#e6d5af', '#3f5f7d', '#784a2a', '#de9c83',
  '#363c42', '#cc4949', '#2d4e6e', '#d9a438',
  '#4c7a5b', '#e3e7ed', '#7a486e', '#c96840',
];

// ---------------------------------------------------------------------------
// 32 Distinct Pedestrian Archetypes
// ---------------------------------------------------------------------------
const ARCHETYPES = [
  { hairStyle: 'bob',      outfit: 'jacket',   accessory: 'tote' },
  { hairStyle: 'short',    outfit: 'hoodie',   accessory: 'backpack' },
  { hairStyle: 'ponytail', outfit: 'jacket',   accessory: 'none' },
  { hairStyle: 'short',    outfit: 'blazer',   accessory: 'briefcase' },
  { hairStyle: 'bun',      outfit: 'sweater',  accessory: 'tote' },
  { hairStyle: 'beanie',   outfit: 'jacket',   accessory: 'backpack' },
  { hairStyle: 'long',     outfit: 'trench',   accessory: 'none' },
  { hairStyle: 'curly',    outfit: 'jacket',   accessory: 'headphones' },
  { hairStyle: 'short',    outfit: 'sweater',  accessory: 'backpack' },
  { hairStyle: 'cap',      outfit: 'jacket',   accessory: 'none' },
  { hairStyle: 'bob',      outfit: 'blazer',   accessory: 'briefcase' },
  { hairStyle: 'short',    outfit: 'sweater',  accessory: 'headphones' },

  { hairStyle: 'pigtails', outfit: 'striped',  accessory: 'backpack' },
  { hairStyle: 'fedora',   outfit: 'trench',   accessory: 'briefcase' },
  { hairStyle: 'beret',    outfit: 'sweater',  accessory: 'tote' },
  { hairStyle: 'mohawk',   outfit: 'vest',     accessory: 'headphones' },
  { hairStyle: 'bald',     outfit: 'blazer',   accessory: 'messenger' },
  { hairStyle: 'hoodUp',   outfit: 'hoodie',   accessory: 'backpack' },
  { hairStyle: 'sunhat',   outfit: 'striped',  accessory: 'grocery' },
  { hairStyle: 'braids',   outfit: 'jacket',   accessory: 'messenger' },
  { hairStyle: 'topknot',  outfit: 'vest',     accessory: 'yogaMat' },
  { hairStyle: 'wavy',     outfit: 'trench',   accessory: 'umbrella' },
  { hairStyle: 'spiky',    outfit: 'hoodie',   accessory: 'coffee' },
  { hairStyle: 'parted',   outfit: 'blazer',   accessory: 'coffee' },
  { hairStyle: 'beanie',   outfit: 'vest',     accessory: 'duffel' },
  { hairStyle: 'cap',      outfit: 'striped',  accessory: 'skateboard' },
  { hairStyle: 'bun',      outfit: 'trench',   accessory: 'scarf' },
  { hairStyle: 'curly',    outfit: 'overalls', accessory: 'tote' },
  { hairStyle: 'long',     outfit: 'hoodie',   accessory: 'headphones' },
  { hairStyle: 'ponytail', outfit: 'vest',     accessory: 'yogaMat' },
  { hairStyle: 'short',    outfit: 'overalls', accessory: 'grocery' },
  { hairStyle: 'bob',      outfit: 'jacket',   accessory: 'scarf' },
];

// 5-frame walk cycle: ZERO vertical shoulder/torso bounce!
// Only feet stride cleanly and lower sleeve cuffs shift subtly.
const FRAME_POSES = [
  { leftFootY: 62, rightFootY: 62, leftCuffDy: 0,  rightCuffDy: 0 },
  { leftFootY: 63, rightFootY: 59, leftCuffDy: -1, rightCuffDy: 1 },
  { leftFootY: 64, rightFootY: 56, leftCuffDy: -2, rightCuffDy: 1 },
  { leftFootY: 59, rightFootY: 63, leftCuffDy: 1,  rightCuffDy: -1 },
  { leftFootY: 56, rightFootY: 64, leftCuffDy: 1,  rightCuffDy: -2 },
];

function shadeHex(hex, delta) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + delta));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + delta));
  const b = Math.min(255, Math.max(0, (num & 255) + delta));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function pickRandom(arr, exclude = null) {
  if (!exclude || arr.length <= 1) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  let choice = arr[Math.floor(Math.random() * arr.length)];
  for (let i = 0; i < 6 && choice === exclude; i++) {
    choice = arr[Math.floor(Math.random() * arr.length)];
  }
  return choice;
}

export function randomizePedestrianColors(archetype) {
  const skin = pickRandom(SKIN_PALETTE);
  const hair = pickRandom(HAIR_PALETTE);
  const jacket = pickRandom(CLOTHING_PALETTE);
  const pants = pickRandom(PANTS_PALETTE, jacket);
  const acc = pickRandom(ACCENT_PALETTE, jacket);
  const hat = pickRandom(ACCENT_PALETTE, jacket);

  return {
    ...archetype,
    skin,
    skinDark: shadeHex(skin, -28),
    hair,
    hairHi: shadeHex(hair, 26),
    hairDark: shadeHex(hair, -26),
    jacket,
    jacketHi: shadeHex(jacket, 24),
    jacketDark: shadeHex(jacket, -34),
    pants,
    pantsDark: shadeHex(pants, -22),
    shoes: '#221e1c',
    acc,
    accHi: shadeHex(acc, 22),
    accDark: shadeHex(acc, -30),
    hat,
    hatHi: shadeHex(hat, 24),
    hatDark: shadeHex(hat, -30),
  };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Draws a softly rounded-shoulder torso + fixed shoulder caps (matching Hero's silhouette).
 * Shoulders taper organically from collar out to the sleeves — never square 90-degree corners.
 */
function drawRoundedShouldersTorso(ctx, ty, torsoH, baseCol, hiCol, darkCol) {
  // Collar band
  px(ctx, 15, ty - 2, 14, 3, hiCol);
  px(ctx, 16, ty - 2, 12, 1, shadeHex(hiCol, 12));

  // Tapered rounded shoulder curve (5 progressive steps down to full width)
  px(ctx, 13, ty,     18, 2, baseCol);
  px(ctx, 11, ty + 1, 22, 2, baseCol);
  px(ctx, 10, ty + 3, 24, 2, baseCol);

  // Main torso body with softly rounded lower hem corners
  px(ctx, 12, ty + 4, 20, torsoH - 6, baseCol);
  px(ctx, 13, ty + torsoH - 2, 18, 2, darkCol);
  px(ctx, 14, ty + torsoH - 1, 16, 1, darkCol);

  // Subtle stepped shading along left highlight & right shadow
  px(ctx, 13, ty + 1, 4, 2, hiCol);
  px(ctx, 12, ty + 4, 3, torsoH - 7, hiCol);
  px(ctx, 29, ty + 4, 3, torsoH - 6, darkCol);
  px(ctx, 30, ty + 2, 3, 3, darkCol);
}

/**
 * Draws a single steady-shoulder hanging arm (top shoulder curve fixed; only bottom cuff/hand shifts slightly).
 */
function drawRoundedArm(ctx, side, ty, cuffDy, sleeveCol, sleeveDark, skinCol, skinDark) {
  const isLeft = side === 'left';
  const armBottom = ty + 20 + cuffDy;
  const armTop = ty + 4;
  const armH = Math.max(10, armBottom - armTop);

  if (isLeft) {
    // Rounded upper-left shoulder cap blending seamlessly into torso
    px(ctx, 10, ty + 2, 3, 2, sleeveCol);
    px(ctx, 9,  ty + 3, 4, 3, sleeveCol);
    px(ctx, 8,  armTop + 1, 4, armH - 1, sleeveDark);
    px(ctx, 9,  armTop + 1, 3, armH - 2, sleeveCol);
    // Hand at cuff
    px(ctx, 9,  armBottom, 3, 3, skinCol);
    px(ctx, 9,  armBottom + 2, 3, 1, skinDark);
  } else {
    // Rounded upper-right shoulder cap
    px(ctx, 31, ty + 2, 3, 2, sleeveDark);
    px(ctx, 31, ty + 3, 4, 3, sleeveCol);
    px(ctx, 32, armTop + 1, 4, armH - 1, sleeveCol);
    px(ctx, 34, armTop + 1, 2, armH - 1, sleeveDark);
    // Hand at cuff
    px(ctx, 32, armBottom, 3, 3, skinCol);
    px(ctx, 32, armBottom + 2, 3, 1, skinDark);
  }
}

/**
 * Draws Hero redrawn directly from Pete's original ped1..ped5 art:
 *  - Brown short hair with warm highlight, peach ears/neck
 *  - Collared sky-blue shirt with softly rounded shoulders
 *  - Left arm down by side; right arm bent UP holding a glowing smartphone!
 *  - Khaki pants + brown shoes, zero shoulder bounce during walk cycle!
 */
function drawHeroFrame(ctx, frameIdx) {
  const pose = FRAME_POSES[frameIdx];
  const ty = 30;
  const hy = 4;

  const skin = '#f2c7a5';
  const skinDark = '#d1a27e';
  const hair = '#4a3020';
  const hairHi = '#63432e';
  const hairDark = '#2e1c12';
  const shirt = '#55a3b8';
  const shirtHi = '#72bdd1';
  const shirtDark = '#3a7d91';
  const pants = '#8f7c63';
  const pantsDark = '#6b5b47';
  const shoes = '#3d2d22';

  // 1. Ground shadow
  px(ctx, 10, 61, 24, 5, 'rgba(28, 28, 32, 0.72)');
  px(ctx, 8,  62, 28, 3, 'rgba(28, 28, 32, 0.65)');
  px(ctx, 12, 62, 20, 3, 'rgba(18, 18, 22, 0.45)');

  // 2. Khaki legs & brown shoes
  const drawLeg = (x, footY) => {
    const legTop = 51;
    const legH = Math.max(4, footY - legTop);
    px(ctx, x, legTop, 6, legH, pants);
    px(ctx, x + 4, legTop, 2, legH, pantsDark);
    px(ctx, x, footY, 6, 3, shoes);
    px(ctx, x + 1, footY + 2, 4, 1, '#241913');
  };
  drawLeg(14, pose.leftFootY);
  drawLeg(24, pose.rightFootY);

  // 3. Left arm hanging steadily (no shoulder bounce)
  drawRoundedArm(ctx, 'left', ty, pose.leftCuffDy, shirt, shirtDark, skin, skinDark);

  // 4. Right arm bent UP holding smartphone (matches Pete's original Hero pose!)
  px(ctx, 31, ty + 2, 3, 2, shirtDark);
  px(ctx, 31, ty + 3, 4, 4, shirt);
  px(ctx, 32, ty + 5, 4, 10, shirt);
  px(ctx, 34, ty + 5, 2, 10, shirtDark);
  // Forearm angled up to hold phone
  px(ctx, 33, ty + 11, 5, 4, shirtDark);
  px(ctx, 34, ty + 8,  4, 6, shirt);
  // Hand holding phone
  px(ctx, 35, ty + 5,  4, 4, skin);
  px(ctx, 36, ty + 8,  3, 1, skinDark);
  // Smartphone (dark bezel + bright white glowing screen!)
  px(ctx, 33, ty - 4, 7, 10, '#3a3f47');
  px(ctx, 34, ty - 3, 5, 8,  '#f2f6fa');
  px(ctx, 35, ty - 2, 3, 5,  '#ffffff');
  px(ctx, 35, ty + 4, 3, 1,  '#cbd5e1');

  // 5. Collared sky-blue rounded-shoulder torso
  drawRoundedShouldersTorso(ctx, ty, 23, shirt, shirtHi, shirtDark);

  // 6. Head, Ears & Neck
  px(ctx, 6,  hy + 12, 3, 6, skinDark);
  px(ctx, 7,  hy + 13, 2, 4, skin);
  px(ctx, 35, hy + 12, 3, 6, skinDark);
  px(ctx, 35, hy + 13, 2, 4, skin);

  px(ctx, 10, hy + 5,  24, 20, skin);
  px(ctx, 9,  hy + 8,  26, 15, skin);
  px(ctx, 12, hy + 23, 20, 3,  skinDark);

  // 7. Hero's brown rounded short hair
  px(ctx, 11, hy,      22, 20, hair);
  px(ctx, 9,  hy + 2,  26, 18, hair);
  px(ctx, 8,  hy + 4,  28, 15, hair);
  px(ctx, 13, hy + 2,  11, 4,  hairHi);
  px(ctx, 10, hy + 4,  4,  6,  hairHi);
  px(ctx, 32, hy + 4,  4,  15, hairDark);
  px(ctx, 10, hy + 18, 24, 2,  hairDark);
}

/**
 * Draws one crisp 44x68 pedestrian frame with rounded shoulders & zero shoulder bounce.
 */
function drawFinePixelFrame(ctx, s, frameIdx) {
  const pose = FRAME_POSES[frameIdx];
  const ty = 30;
  const hy = 4;

  // 1. Stepped ground shadow
  px(ctx, 10, 61, 24, 5, 'rgba(28, 28, 32, 0.72)');
  px(ctx, 8,  62, 28, 3, 'rgba(28, 28, 32, 0.65)');
  px(ctx, 12, 62, 20, 3, 'rgba(18, 18, 22, 0.45)');

  // 2. Legs & Shoes
  const drawLeg = (x, footY) => {
    const legTop = 51;
    const legH = Math.max(4, footY - legTop);
    px(ctx, x, legTop, 6, legH, s.pants);
    px(ctx, x + 4, legTop, 2, legH, s.pantsDark);
    px(ctx, x, footY, 6, 3, s.shoes);
    px(ctx, x + 1, footY + 2, 4, 1, '#121010');
  };
  drawLeg(14, pose.leftFootY);
  drawLeg(24, pose.rightFootY);

  // 3. Arms with rounded fixed shoulders (no bouncing!)
  const sleeveCol = s.outfit === 'vest' ? shadeHex(s.jacketHi, 30) : s.jacket;
  const sleeveDark = s.outfit === 'vest' ? shadeHex(s.jacket, 10) : s.jacketDark;

  drawRoundedArm(ctx, 'left', ty, pose.leftCuffDy, sleeveCol, sleeveDark, s.skin, s.skinDark);
  drawRoundedArm(ctx, 'right', ty, pose.rightCuffDy, sleeveCol, sleeveDark, s.skin, s.skinDark);

  // Side held accessories (track lower cuff subtly without bouncing shoulders)
  const leftHandY = ty + 20 + pose.leftCuffDy;
  const rightHandY = ty + 20 + pose.rightCuffDy;

  if (s.accessory === 'briefcase') {
    const by = rightHandY - 2;
    px(ctx, 35, by, 6, 10, s.accDark);
    px(ctx, 35, by + 1, 5, 8, s.acc);
    px(ctx, 37, by - 2, 2, 2, s.accDark);
    px(ctx, 36, by + 4, 4, 1, s.accHi);
  } else if (s.accessory === 'tote') {
    const tyBag = leftHandY - 4;
    px(ctx, 3, tyBag, 6, 11, s.accDark);
    px(ctx, 3, tyBag + 1, 5, 9, s.acc);
    px(ctx, 5, tyBag - 4, 2, 4, s.accDark);
  } else if (s.accessory === 'grocery') {
    const gy = leftHandY - 5;
    px(ctx, 2, gy, 7, 12, '#c7a474');
    px(ctx, 3, gy + 1, 5, 10, '#d9b98b');
    px(ctx, 3, gy - 3, 2, 3, '#529448');
    px(ctx, 6, gy - 2, 2, 2, '#d6564b');
  } else if (s.accessory === 'duffel') {
    const dy = rightHandY - 3;
    px(ctx, 34, dy, 8, 9, s.accDark);
    px(ctx, 35, dy + 1, 6, 7, s.acc);
    px(ctx, 36, dy + 2, 4, 2, s.accHi);
  } else if (s.accessory === 'coffee') {
    const cy = rightHandY - 5;
    px(ctx, 35, cy, 4, 6, '#ece9e4');
    px(ctx, 35, cy, 4, 1, '#3d281c');
    px(ctx, 35, cy + 2, 4, 2, '#b88856');
  } else if (s.accessory === 'umbrella') {
    const uy = rightHandY - 8;
    px(ctx, 36, uy, 2, 20, s.accDark);
    px(ctx, 36, uy + 2, 2, 14, s.acc);
    px(ctx, 35, uy - 2, 3, 2, '#5c3c24');
  }

  // 4. Rounded-Shoulder Torso / Outfit
  const torsoH = s.outfit === 'trench' ? 27 : 23;
  drawRoundedShouldersTorso(ctx, ty, torsoH, s.jacket, s.jacketHi, s.jacketDark);

  // Outfit-specific pixel details
  if (s.outfit === 'striped') {
    for (let sy = ty + 5; sy < ty + torsoH - 3; sy += 5) {
      px(ctx, 12, sy, 20, 2, '#f0eee9');
      px(ctx, 29, sy, 3, 2, '#cfccc6');
    }
  } else if (s.outfit === 'blazer') {
    px(ctx, 21, ty + 3, 2, torsoH - 5, s.jacketDark);
  } else if (s.outfit === 'hoodie' && s.hairStyle !== 'hoodUp') {
    px(ctx, 15, ty, 14, 7, s.jacketDark);
    px(ctx, 16, ty + 1, 12, 5, s.jacketHi);
  } else if (s.outfit === 'overalls') {
    px(ctx, 15, ty + 1, 3, torsoH - 2, s.pants);
    px(ctx, 26, ty + 1, 3, torsoH - 2, s.pants);
    px(ctx, 12, ty + 10, 20, torsoH - 12, s.pants);
    px(ctx, 29, ty + 10, 3, torsoH - 12, s.pantsDark);
  } else if (s.outfit === 'trench') {
    px(ctx, 12, ty + 14, 20, 3, s.jacketDark);
    px(ctx, 20, ty + 14, 4, 3, s.accHi);
  }

  // Back-worn accessories
  if (s.accessory === 'backpack') {
    px(ctx, 15, ty + 4, 14, 15, s.acc);
    px(ctx, 14, ty + 5, 16, 13, s.acc);
    px(ctx, 14, ty + 5, 2, 13, s.accDark);
    px(ctx, 28, ty + 5, 2, 13, s.accDark);
    px(ctx, 16, ty + 5, 12, 3, s.accHi);
    px(ctx, 15, ty + 12, 14, 6, s.accDark);
    px(ctx, 16, ty + 13, 12, 4, s.acc);
    px(ctx, 19, ty + 2, 6, 2, s.accDark);
  } else if (s.accessory === 'messenger') {
    for (let k = 0; k < 14; k++) {
      px(ctx, 13 + k, ty + 2 + k, 3, 2, s.accDark);
    }
    px(ctx, 22, ty + 14, 11, 9, s.accDark);
    px(ctx, 23, ty + 15, 9, 7, s.acc);
  } else if (s.accessory === 'yogaMat') {
    for (let k = 0; k < 15; k++) {
      px(ctx, 12 + k, ty + 2 + Math.round(k * 0.85), 5, 4, s.acc);
      px(ctx, 12 + k, ty + 5 + Math.round(k * 0.85), 5, 1, s.accDark);
    }
  } else if (s.accessory === 'skateboard') {
    px(ctx, 18, ty, 8, 25, s.accDark);
    px(ctx, 19, ty + 1, 6, 23, s.acc);
    px(ctx, 17, ty + 6, 10, 2, '#d8dce3');
    px(ctx, 17, ty + 18, 10, 2, '#d8dce3');
  } else if (s.accessory === 'scarf') {
    px(ctx, 13, ty - 1, 18, 5, s.acc);
    px(ctx, 13, ty + 3, 18, 1, s.accDark);
    px(ctx, 24, ty + 3, 5, 10, s.acc);
    px(ctx, 25, ty + 11, 4, 2, s.accDark);
  }

  // 5. Head, Ears & Neck
  px(ctx, 6, hy + 12, 3, 6, s.skinDark);
  px(ctx, 7, hy + 13, 2, 4, s.skin);
  px(ctx, 35, hy + 12, 3, 6, s.skinDark);
  px(ctx, 35, hy + 13, 2, 4, s.skin);

  px(ctx, 10, hy + 5, 24, 20, s.skin);
  px(ctx, 9,  hy + 8, 26, 15, s.skin);
  px(ctx, 12, hy + 23, 20, 3, s.skinDark);

  // 6. Hair & Headwear
  if (s.hairStyle === 'bald') {
    px(ctx, 11, hy + 2, 22, 22, s.skin);
    px(ctx, 9,  hy + 5, 26, 16, s.skin);
    px(ctx, 14, hy + 4, 8, 4, shadeHex(s.skin, 20));
    px(ctx, 9,  hy + 15, 26, 4, s.hair);
    px(ctx, 10, hy + 18, 24, 2, s.hairDark);
  } else if (s.hairStyle === 'beanie') {
    px(ctx, 9,  hy + 15, 26, 6, s.hair);
    px(ctx, 10, hy + 2, 24, 15, s.hat);
    px(ctx, 8,  hy + 5, 28, 12, s.hat);
    px(ctx, 12, hy + 3, 10, 4, s.hatHi);
    px(ctx, 8,  hy + 13, 28, 4, s.hatDark);
    px(ctx, 32, hy + 5, 4, 12, s.hatDark);
  } else if (s.hairStyle === 'cap') {
    px(ctx, 9,  hy + 15, 26, 6, s.hair);
    px(ctx, 10, hy + 2, 24, 15, s.hat);
    px(ctx, 8,  hy + 5, 28, 12, s.hat);
    px(ctx, 12, hy + 3, 10, 4, s.hatHi);
    px(ctx, 32, hy + 5, 4, 12, s.hatDark);
    px(ctx, 18, hy + 14, 8, 4, s.hair);
    px(ctx, 18, hy + 14, 8, 2, '#e2e6ec');
  } else if (s.hairStyle === 'fedora') {
    px(ctx, 9,  hy + 15, 26, 6, s.hair);
    px(ctx, 5,  hy + 12, 34, 4, s.hatDark);
    px(ctx, 6,  hy + 11, 32, 2, s.hat);
    px(ctx, 11, hy + 2, 22, 10, s.hat);
    px(ctx, 13, hy + 3, 9, 3, s.hatHi);
    px(ctx, 11, hy + 9, 22, 2, '#221f26');
  } else if (s.hairStyle === 'sunhat') {
    px(ctx, 9,  hy + 16, 26, 8, s.hair);
    px(ctx, 4,  hy + 10, 36, 5, '#e0c794');
    px(ctx, 5,  hy + 9, 34, 3, '#edd8aa');
    px(ctx, 11, hy + 2, 22, 8, '#e0c794');
    px(ctx, 11, hy + 8, 22, 2, s.hat);
  } else if (s.hairStyle === 'beret') {
    px(ctx, 9,  hy + 13, 26, 9, s.hair);
    px(ctx, 7,  hy + 3, 28, 11, s.hat);
    px(ctx, 10, hy + 1, 22, 5, s.hatHi);
    px(ctx, 21, hy, 3, 2, s.hatDark);
    px(ctx, 8,  hy + 11, 26, 3, s.hatDark);
  } else if (s.hairStyle === 'hoodUp') {
    px(ctx, 8,  hy + 2, 28, 23, s.jacket);
    px(ctx, 10, hy, 24, 25, s.jacket);
    px(ctx, 11, hy + 2, 8, 10, s.jacketHi);
    px(ctx, 31, hy + 3, 5, 21, s.jacketDark);
    px(ctx, 10, hy + 22, 24, 4, s.jacketDark);
  } else if (s.hairStyle === 'curly') {
    px(ctx, 10, hy, 24, 22, s.hair);
    px(ctx, 6,  hy + 4, 32, 16, s.hair);
    px(ctx, 8,  hy + 2, 5, 4, s.hairHi);
    px(ctx, 16, hy + 1, 6, 4, s.hairHi);
    px(ctx, 26, hy + 3, 5, 4, s.hairHi);
    px(ctx, 8,  hy + 18, 28, 4, s.hairDark);
    px(ctx, 34, hy + 8, 4, 10, s.hairDark);
  } else if (s.hairStyle === 'mohawk') {
    px(ctx, 10, hy + 3, 24, 18, s.skin);
    px(ctx, 18, hy - 1, 8, 23, s.hair);
    px(ctx, 19, hy, 4, 16, s.hairHi);
    px(ctx, 24, hy + 1, 2, 20, s.hairDark);
  } else if (s.hairStyle === 'spiky') {
    px(ctx, 9,  hy + 4, 26, 16, s.hair);
    px(ctx, 10, hy, 4, 5, s.hair);
    px(ctx, 16, hy - 1, 5, 6, s.hairHi);
    px(ctx, 23, hy, 5, 5, s.hair);
    px(ctx, 29, hy + 1, 4, 4, s.hairDark);
    px(ctx, 31, hy + 5, 4, 15, s.hairDark);
  } else {
    const hairH = (s.hairStyle === 'long' || s.hairStyle === 'wavy') ? 28
      : (s.hairStyle === 'bob' || s.hairStyle === 'braids') ? 24 : 20;
    px(ctx, 10, hy + 1, 24, hairH, s.hair);
    px(ctx, 8,  hy + 3, 28, hairH - 3, s.hair);
    px(ctx, 12, hy + 3, 11, 4, s.hairHi);
    px(ctx, 10, hy + 5, 4, 6, s.hairHi);
    px(ctx, 32, hy + 5, 4, hairH - 5, s.hairDark);
    px(ctx, 10, hy + hairH - 2, 24, 2, s.hairDark);

    if (s.hairStyle === 'parted') {
      px(ctx, 17, hy + 2, 2, 10, s.skinDark);
    } else if (s.hairStyle === 'wavy') {
      px(ctx, 7,  hy + 15, 3, 10, s.hair);
      px(ctx, 34, hy + 15, 3, 10, s.hairDark);
    } else if (s.hairStyle === 'bun') {
      px(ctx, 16, hy + 6, 12, 2, s.hat);
      px(ctx, 18, hy, 8, 6, s.hairDark);
      px(ctx, 18, hy + 1, 6, 4, s.hairHi);
    } else if (s.hairStyle === 'topknot') {
      px(ctx, 18, hy - 2, 8, 5, s.hair);
      px(ctx, 19, hy - 1, 4, 3, s.hairHi);
      px(ctx, 17, hy + 3, 10, 2, s.hat);
    } else if (s.hairStyle === 'ponytail') {
      px(ctx, 18, hy + 16, 8, 2, s.hat);
      px(ctx, 18, hy + 18, 8, 10, s.hair);
      px(ctx, 19, hy + 19, 4, 6, s.hairHi);
      px(ctx, 20, hy + 27, 4, 2, s.hairDark);
    } else if (s.hairStyle === 'pigtails') {
      px(ctx, 6,  hy + 12, 4, 2, s.hat);
      px(ctx, 5,  hy + 14, 5, 11, s.hair);
      px(ctx, 34, hy + 12, 4, 2, s.hat);
      px(ctx, 34, hy + 14, 5, 11, s.hairDark);
    } else if (s.hairStyle === 'braids') {
      px(ctx, 12, hy + 18, 5, 12, s.hairDark);
      px(ctx, 13, hy + 20, 3, 2, s.hairHi);
      px(ctx, 13, hy + 24, 3, 2, s.hairHi);
      px(ctx, 27, hy + 18, 5, 12, s.hairDark);
      px(ctx, 28, hy + 20, 3, 2, s.hairHi);
      px(ctx, 28, hy + 24, 3, 2, s.hairHi);
    }
  }

  // Over-ear headphones
  if (s.accessory === 'headphones') {
    px(ctx, 10, hy + 1, 24, 2, s.acc);
    px(ctx, 6,  hy + 3, 4, 8, s.acc);
    px(ctx, 34, hy + 3, 4, 8, s.acc);
    px(ctx, 4,  hy + 10, 4, 8, s.accDark);
    px(ctx, 36, hy + 10, 4, 8, s.accDark);
    px(ctx, 5,  hy + 12, 2, 4, s.accHi);
    px(ctx, 37, hy + 12, 2, 4, s.accHi);
  }
}

/**
 * Mitchell-Netravali bicubic kernel (B = 1/3, C = 1/3) — Photoshop-style crisp
 * bicubic downsampling with subtle pixel-edge fuzziness.
 */
function mitchellWeight(x) {
  const ax = Math.abs(x);
  if (ax < 1) {
    return ((7 * ax * ax * ax) - (12 * ax * ax) + (16 / 3)) / 6;
  }
  if (ax < 2) {
    return (-(7 / 3) * ax * ax * ax + 12 * ax * ax - 20 * ax + (32 / 3)) / 6;
  }
  return 0;
}

function bicubicResampleCanvas(srcCanvas, dstW, dstH) {
  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;
  const sCtx = srcCanvas.getContext('2d');
  const src = sCtx.getImageData(0, 0, srcW, srcH).data;

  const tmp = new Float32Array(dstW * srcH * 4);
  const scaleX = srcW / dstW;

  for (let dx = 0; dx < dstW; dx++) {
    const cx = (dx + 0.5) * scaleX - 0.5;
    const x0 = Math.floor(cx);
    const weights = [0, 0, 0, 0];
    let wSum = 0;
    for (let k = -1; k <= 2; k++) {
      const w = mitchellWeight(x0 + k - cx);
      weights[k + 1] = w;
      wSum += w;
    }
    for (let i = 0; i < 4; i++) weights[i] /= wSum;

    for (let y = 0; y < srcH; y++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = -1; k <= 2; k++) {
        const sx = Math.min(srcW - 1, Math.max(0, x0 + k));
        const idx = (y * srcW + sx) * 4;
        const w = weights[k + 1];
        const alpha = src[idx + 3] / 255;
        r += src[idx] * alpha * w;
        g += src[idx + 1] * alpha * w;
        b += src[idx + 2] * alpha * w;
        a += alpha * w;
      }
      const outIdx = (y * dstW + dx) * 4;
      tmp[outIdx] = r;
      tmp[outIdx + 1] = g;
      tmp[outIdx + 2] = b;
      tmp[outIdx + 3] = a;
    }
  }

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dCtx = dstCanvas.getContext('2d');
  const dstImg = dCtx.createImageData(dstW, dstH);
  const dst = dstImg.data;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    const cy = (dy + 0.5) * scaleY - 0.5;
    const y0 = Math.floor(cy);
    const weights = [0, 0, 0, 0];
    let wSum = 0;
    for (let k = -1; k <= 2; k++) {
      const w = mitchellWeight(y0 + k - cy);
      weights[k + 1] = w;
      wSum += w;
    }
    for (let i = 0; i < 4; i++) weights[i] /= wSum;

    for (let dx = 0; dx < dstW; dx++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = -1; k <= 2; k++) {
        const sy = Math.min(srcH - 1, Math.max(0, y0 + k));
        const idx = (sy * dstW + dx) * 4;
        const w = weights[k + 1];
        r += tmp[idx] * w;
        g += tmp[idx + 1] * w;
        b += tmp[idx + 2] * w;
        a += tmp[idx + 3] * w;
      }
      const outIdx = (dy * dstW + dx) * 4;
      const clampedA = Math.min(1, Math.max(0, a));
      if (clampedA > 0.004) {
        dst[outIdx] = Math.min(255, Math.max(0, Math.round(r / clampedA)));
        dst[outIdx + 1] = Math.min(255, Math.max(0, Math.round(g / clampedA)));
        dst[outIdx + 2] = Math.min(255, Math.max(0, Math.round(b / clampedA)));
        dst[outIdx + 3] = Math.round(clampedA * 255);
      }
    }
  }

  dCtx.putImageData(dstImg, 0, 0);
  return dstCanvas;
}

/**
 * Renders the 5-frame redrawn Hero sprite set matching the Pedestrians' bicubic pixel style.
 */
export function buildHeroSprites() {
  const master = document.createElement('canvas');
  master.width = MASTER_W;
  master.height = MASTER_H;
  const mCtx = master.getContext('2d');
  mCtx.imageSmoothingEnabled = false;

  const frames = [];
  for (let f = 0; f < 5; f++) {
    mCtx.clearRect(0, 0, MASTER_W, MASTER_H);
    drawHeroFrame(mCtx, f);
    frames.push(bicubicResampleCanvas(master, OUT_W, OUT_H));
  }
  return frames;
}

/**
 * Pre-renders all 32 pedestrian archetypes with freshly randomized skin, hair,
 * and clothing colors through the bicubic downsampler (5 frames each).
 */
export function buildPedestrianSprites() {
  const master = document.createElement('canvas');
  master.width = MASTER_W;
  master.height = MASTER_H;
  const mCtx = master.getContext('2d');
  mCtx.imageSmoothingEnabled = false;

  return ARCHETYPES.map((arch) => {
    const style = randomizePedestrianColors(arch);
    const frames = [];
    for (let f = 0; f < 5; f++) {
      mCtx.clearRect(0, 0, MASTER_W, MASTER_H);
      drawFinePixelFrame(mCtx, style, f);
      frames.push(bicubicResampleCanvas(master, OUT_W, OUT_H));
    }
    return frames;
  });
}

export const PEDESTRIAN_VARIANT_COUNT = ARCHETYPES.length;
