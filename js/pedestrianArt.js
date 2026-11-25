/**
 * Pedestrian Panic — Procedural Bicubic Pixel-Art Pedestrian Generator
 *  - 32 distinct pedestrian archetypes (12 original + 20 new styles/accessories)
 *  - Easy modular skin, hair, clothing, pants & accent color palettes picked randomly
 *    so pedestrians never look repetitive on the sidewalk
 *  - Drawn at 44x68 (50% smaller pixel size vs. 22x34) with flat stepped colors
 *    and resampled with a separable Mitchell-Netravali bicubic filter (Photoshop-style
 *    soft pixel edges without smooth color gradients)
 */

const MASTER_W = 44; // 50% smaller pixels compared to previous 22x34 grid
const MASTER_H = 68;
const OUT_W = 35;    // Bicubic-shrunk output matching Hero's 33x50 pixel softness
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

// Carefully excludes Hero's sky-blue shirt (#55a2b8) so Hero always stands out!
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
// 32 Distinct Archetypes (12 original + 20 new designs)
// ---------------------------------------------------------------------------
const ARCHETYPES = [
  // Original 12 silhouettes
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

  // 20 New Archetypes!
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

// 5-frame walk cycle on the 44x68 pixel grid
const FRAME_POSES = [
  { leftFootY: 62, rightFootY: 62, bob: 0,  leftArmDy: 0,  rightArmDy: 0 },
  { leftFootY: 63, rightFootY: 59, bob: -1, leftArmDy: -1, rightArmDy: 1 },
  { leftFootY: 64, rightFootY: 56, bob: -2, leftArmDy: -2, rightArmDy: 2 },
  { leftFootY: 59, rightFootY: 63, bob: -1, leftArmDy: 1,  rightArmDy: -1 },
  { leftFootY: 56, rightFootY: 64, bob: -2, leftArmDy: 2,  rightArmDy: -2 },
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

/**
 * Generates a randomized color palette for any archetype (skin, hair, clothing, pants, accent).
 */
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
 * Draws one crisp 44x68 pixel-art frame using flat stepped tones (zero smooth gradients).
 */
function drawFinePixelFrame(ctx, s, frameIdx) {
  const pose = FRAME_POSES[frameIdx];
  const b = pose.bob;

  // 1. Stepped ground shadow
  px(ctx, 10, 61, 24, 5, 'rgba(28, 28, 32, 0.72)');
  px(ctx, 8,  62, 28, 3, 'rgba(28, 28, 32, 0.65)');
  px(ctx, 12, 62, 20, 3, 'rgba(18, 18, 22, 0.45)');

  // 2. Legs & Shoes
  const drawLeg = (x, footY) => {
    const legTop = 51 + b;
    const legH = Math.max(4, footY - legTop);
    px(ctx, x, legTop, 6, legH, s.pants);
    px(ctx, x + 4, legTop, 2, legH, s.pantsDark);
    px(ctx, x, footY, 6, 3, s.shoes);
    px(ctx, x + 1, footY + 2, 4, 1, '#121010');
  };
  drawLeg(14, pose.leftFootY);
  drawLeg(24, pose.rightFootY);

  // 3. Arms & Hands
  const leftArmY = 32 + b + pose.leftArmDy;
  const rightArmY = 32 + b + pose.rightArmDy;
  const sleeveCol = s.outfit === 'vest' ? shadeHex(s.jacketHi, 30) : s.jacket;
  const sleeveDark = s.outfit === 'vest' ? shadeHex(s.jacket, 10) : s.jacketDark;

  // Left arm
  px(ctx, 8, leftArmY, 4, 17, sleeveDark);
  px(ctx, 9, leftArmY, 3, 16, sleeveCol);
  px(ctx, 8, leftArmY + 17, 4, 3, s.skin);
  px(ctx, 8, leftArmY + 19, 4, 1, s.skinDark);

  // Right arm
  px(ctx, 32, rightArmY, 4, 17, sleeveCol);
  px(ctx, 34, rightArmY, 2, 17, sleeveDark);
  px(ctx, 32, rightArmY + 17, 4, 3, s.skin);
  px(ctx, 32, rightArmY + 19, 4, 1, s.skinDark);

  // Side held accessories
  if (s.accessory === 'briefcase') {
    const by = rightArmY + 14;
    px(ctx, 35, by, 6, 10, s.accDark);
    px(ctx, 35, by + 1, 5, 8, s.acc);
    px(ctx, 37, by - 2, 2, 2, s.accDark);
    px(ctx, 36, by + 4, 4, 1, s.accHi);
  } else if (s.accessory === 'tote') {
    const ty = leftArmY + 12;
    px(ctx, 3, ty, 6, 11, s.accDark);
    px(ctx, 3, ty + 1, 5, 9, s.acc);
    px(ctx, 5, ty - 4, 2, 4, s.accDark);
  } else if (s.accessory === 'grocery') {
    const gy = leftArmY + 11;
    px(ctx, 2, gy, 7, 12, '#c7a474');
    px(ctx, 3, gy + 1, 5, 10, '#d9b98b');
    px(ctx, 3, gy - 3, 2, 3, '#529448'); // Greens peeking out!
    px(ctx, 6, gy - 2, 2, 2, '#d6564b');
  } else if (s.accessory === 'duffel') {
    const dy = rightArmY + 13;
    px(ctx, 34, dy, 8, 9, s.accDark);
    px(ctx, 35, dy + 1, 6, 7, s.acc);
    px(ctx, 36, dy + 2, 4, 2, s.accHi);
  } else if (s.accessory === 'coffee') {
    const cy = rightArmY + 11;
    px(ctx, 35, cy, 4, 6, '#ece9e4');
    px(ctx, 35, cy, 4, 1, '#3d281c');
    px(ctx, 35, cy + 2, 4, 2, '#b88856');
  } else if (s.accessory === 'umbrella') {
    const uy = rightArmY + 8;
    px(ctx, 36, uy, 2, 20, s.accDark);
    px(ctx, 36, uy + 2, 2, 14, s.acc);
    px(ctx, 35, uy - 2, 3, 2, '#5c3c24');
  }

  // 4. Torso / Outfit
  const ty = 30 + b;
  const torsoH = s.outfit === 'trench' ? 27 : 23;
  px(ctx, 12, ty, 20, torsoH, s.jacket);
  px(ctx, 14, ty - 2, 16, 3, s.jacketHi); // Collar
  px(ctx, 12, ty + 2, 3, torsoH - 3, s.jacketHi);
  px(ctx, 29, ty + 2, 3, torsoH - 2, s.jacketDark);
  px(ctx, 12, ty + torsoH - 2, 20, 2, s.jacketDark);

  // Outfit-specific pixel details
  if (s.outfit === 'striped') {
    for (let sy = ty + 4; sy < ty + torsoH - 3; sy += 5) {
      px(ctx, 12, sy, 20, 2, '#f0eee9');
      px(ctx, 29, sy, 3, 2, '#cfccc6');
    }
  } else if (s.outfit === 'blazer') {
    px(ctx, 21, ty + 2, 2, torsoH - 3, s.jacketDark); // Back vent seam
    px(ctx, 13, ty + 1, 18, 2, s.jacketHi);
  } else if (s.outfit === 'hoodie' && s.hairStyle !== 'hoodUp') {
    // Draped hood resting behind neck
    px(ctx, 14, ty, 16, 7, s.jacketDark);
    px(ctx, 15, ty + 1, 14, 5, s.jacketHi);
  } else if (s.outfit === 'overalls') {
    px(ctx, 14, ty, 4, torsoH, s.pants);
    px(ctx, 26, ty, 4, torsoH, s.pants);
    px(ctx, 12, ty + 10, 20, torsoH - 10, s.pants);
    px(ctx, 29, ty + 10, 3, torsoH - 10, s.pantsDark);
  } else if (s.outfit === 'trench') {
    // Belt across waist
    px(ctx, 12, ty + 14, 20, 3, s.jacketDark);
    px(ctx, 20, ty + 14, 4, 3, s.accHi);
  }

  // Back-worn accessories
  if (s.accessory === 'backpack') {
    px(ctx, 14, ty + 4, 16, 16, s.acc);
    px(ctx, 14, ty + 4, 2, 16, s.accDark);
    px(ctx, 28, ty + 4, 2, 16, s.accDark);
    px(ctx, 16, ty + 5, 12, 3, s.accHi);
    px(ctx, 15, ty + 12, 14, 7, s.accDark);
    px(ctx, 16, ty + 13, 12, 5, s.acc);
    px(ctx, 19, ty + 2, 6, 2, s.accDark); // Top strap loop
  } else if (s.accessory === 'messenger') {
    // Diagonal strap across back + low hip bag
    for (let k = 0; k < 14; k++) {
      px(ctx, 13 + k, ty + 2 + k, 3, 2, s.accDark);
    }
    px(ctx, 22, ty + 14, 11, 9, s.accDark);
    px(ctx, 23, ty + 15, 9, 7, s.acc);
  } else if (s.accessory === 'yogaMat') {
    // Rolled yoga mat strapped diagonally across back
    for (let k = 0; k < 16; k++) {
      px(ctx, 11 + k, ty + 1 + Math.round(k * 0.9), 5, 4, s.acc);
      px(ctx, 11 + k, ty + 4 + Math.round(k * 0.9), 5, 1, s.accDark);
    }
  } else if (s.accessory === 'skateboard') {
    // Skateboard tucked vertically behind backpack
    px(ctx, 18, ty - 1, 8, 26, s.accDark);
    px(ctx, 19, ty, 6, 24, s.acc);
    px(ctx, 17, ty + 5, 10, 2, '#d8dce3');
    px(ctx, 17, ty + 18, 10, 2, '#d8dce3');
  } else if (s.accessory === 'scarf') {
    px(ctx, 13, ty - 1, 18, 5, s.acc);
    px(ctx, 13, ty + 3, 18, 1, s.accDark);
    px(ctx, 24, ty + 3, 5, 10, s.acc);
    px(ctx, 25, ty + 11, 4, 2, s.accDark);
  }

  // 5. Head, Ears & Neck
  const hy = 4 + b;
  // Ears
  px(ctx, 6, hy + 12, 3, 6, s.skinDark);
  px(ctx, 7, hy + 13, 2, 4, s.skin);
  px(ctx, 35, hy + 12, 3, 6, s.skinDark);
  px(ctx, 35, hy + 13, 2, 4, s.skin);

  // Head/neck skin shape
  px(ctx, 10, hy + 5, 24, 20, s.skin);
  px(ctx, 9,  hy + 8, 26, 15, s.skin);
  px(ctx, 12, hy + 23, 20, 3, s.skinDark);

  // 6. Hair & Headwear (18 distinct pixel styles!)
  if (s.hairStyle === 'bald') {
    px(ctx, 11, hy + 2, 22, 22, s.skin);
    px(ctx, 9,  hy + 5, 26, 16, s.skin);
    px(ctx, 14, hy + 4, 8, 4, shadeHex(s.skin, 20)); // Shine
    px(ctx, 9,  hy + 15, 26, 4, s.hair);            // Hair fringe around lower back
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
    px(ctx, 5,  hy + 12, 34, 4, s.hatDark); // Brim
    px(ctx, 6,  hy + 11, 32, 2, s.hat);
    px(ctx, 11, hy + 2, 22, 10, s.hat);
    px(ctx, 13, hy + 3, 9, 3, s.hatHi);
    px(ctx, 11, hy + 9, 22, 2, '#221f26');  // Hatband
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
    px(ctx, 21, hy, 3, 2, s.hatDark); // Stem
    px(ctx, 8,  hy + 11, 26, 3, s.hatDark);
  } else if (s.hairStyle === 'hoodUp') {
    px(ctx, 8,  hy + 1, 28, 24, s.jacket);
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
 * bicubic downsampling that gives pixel edges subtle organic fuzziness without
 * turning flat pixel fills into smooth gradients.
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

  // Horizontal pass: srcW x srcH -> dstW x srcH (premultiplied alpha to avoid dark edge halos)
  const tmp = new Float32Array(dstW * srcH * 4);
  const scaleX = srcW / dstW;

  for (let dx = 0; dx < dstW; dx++) {
    const cx = (dx + 0.5) * scaleX - 0.5;
    const x0 = Math.floor(cx);
    const weights = [0, 0, 0, 0];
    let wSum = 0;
    for (let k = -1; k <= 2; k++) {
      const w = mitchellWeight((x0 + k - cx));
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

  // Vertical pass: dstW x srcH -> dstW x dstH
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
      const w = mitchellWeight((y0 + k - cy));
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
