/**
 * Pedestrian Panic — Crisp Pixel-Art Pedestrian Sprite Generator
 * Renders 12 distinct 5-frame walk-cycle Pedestrian characters onto a crisp
 * 22x34 pixel grid using flat stepped color palettes (zero smooth gradients).
 */

const PX_W = 22;
const PX_H = 34;

const PEDESTRIAN_STYLES = [
  {
    name: 'coral-tote',
    skin: '#f0c29e', skinDark: '#cfa07c',
    hair: '#4f3122', hairHi: '#6b4531', hairDark: '#331e14',
    hairStyle: 'bob',
    jacket: '#d6564b', jacketHi: '#e87468', jacketDark: '#a33931',
    pants: '#454d59', pantsDark: '#2e343d',
    shoes: '#26201d',
    accessory: 'tote', acc: '#e6d5af', accDark: '#bfa97e',
  },
  {
    name: 'mustard-backpack',
    skin: '#d99e73', skinDark: '#b87e55',
    hair: '#2b1e18', hairHi: '#423028', hairDark: '#1a110e',
    hairStyle: 'short',
    jacket: '#dba539', jacketHi: '#f0be54', jacketDark: '#ad7c1f',
    pants: '#3b4b5e', pantsDark: '#273342',
    shoes: '#292320',
    accessory: 'backpack', acc: '#3f5f7d', accDark: '#2a435c',
  },
  {
    name: 'forest-ponytail',
    skin: '#f2c9aa', skinDark: '#d1a484',
    hair: '#cca052', hairHi: '#e3bb6f', hairDark: '#9e7634',
    hairStyle: 'ponytail',
    jacket: '#3d7d5b', jacketHi: '#549974', jacketDark: '#27573d',
    pants: '#3d3b3a', pantsDark: '#262423',
    shoes: '#2b201a',
    accessory: 'none',
  },
  {
    name: 'suit-briefcase',
    skin: '#e8b996', skinDark: '#c49574',
    hair: '#757270', hairHi: '#969390', hairDark: '#524f4d',
    hairStyle: 'short',
    jacket: '#424957', jacketHi: '#5a6375', jacketDark: '#2b303b',
    pants: '#303540', pantsDark: '#1e2129',
    shoes: '#1c1918',
    accessory: 'briefcase', acc: '#784a2a', accDark: '#4f2f18',
  },
  {
    name: 'lavender-bun',
    skin: '#8f5d3e', skinDark: '#6b4229',
    hair: '#241d1c', hairHi: '#3d3230', hairDark: '#120e0d',
    hairStyle: 'bun',
    jacket: '#8f6eab', jacketHi: '#a989c4', jacketDark: '#674b80',
    pants: '#3e434f', pantsDark: '#282b33',
    shoes: '#242120',
    accessory: 'tote', acc: '#de9c83', accDark: '#b5745b',
  },
  {
    name: 'burgundy-beanie',
    skin: '#f0c4a0', skinDark: '#cc9e7a',
    hair: '#3d281c', hairHi: '#573a29', hairDark: '#24160e',
    hairStyle: 'beanie',
    hat: '#cc4949', hatHi: '#e36868', hatDark: '#992e2e',
    jacket: '#7d3143', jacketHi: '#9c4459', jacketDark: '#571e2c',
    pants: '#4f5561', pantsDark: '#363b45',
    shoes: '#2b231d',
    accessory: 'backpack', acc: '#363c42', accDark: '#22262b',
  },
  {
    name: 'navy-auburn',
    skin: '#f4ceb3', skinDark: '#d1a88c',
    hair: '#8c3f26', hairHi: '#ad5639', hairDark: '#612714',
    hairStyle: 'long',
    jacket: '#374f78', jacketHi: '#4d6999', jacketDark: '#233554',
    pants: '#5c5248', pantsDark: '#3d352e',
    shoes: '#30221b',
    accessory: 'none',
  },
  {
    name: 'olive-curly',
    skin: '#75472d', skinDark: '#522f1c',
    hair: '#211b19', hairHi: '#382f2c', hairDark: '#120e0d',
    hairStyle: 'curly',
    jacket: '#6d7d48', jacketHi: '#86995d', jacketDark: '#4c5930',
    pants: '#3b3c42', pantsDark: '#25262b',
    shoes: '#211e1d',
    accessory: 'headphones', acc: '#e3e7ed', accDark: '#a8b0bd',
  },
  {
    name: 'rose-backpack',
    skin: '#e5b38f', skinDark: '#c2906d',
    hair: '#dbc59c', hairHi: '#f0ddb6', hairDark: '#b39b70',
    hairStyle: 'short',
    jacket: '#cc7489', jacketHi: '#e391a4', jacketDark: '#9e5063',
    pants: '#444b5c', pantsDark: '#2d3240',
    shoes: '#292321',
    accessory: 'backpack', acc: '#e3d1a8', accDark: '#baa67b',
  },
  {
    name: 'orange-cap',
    skin: '#c98e63', skinDark: '#a36d47',
    hair: '#261c16', hairHi: '#3d2e25', hairDark: '#140e0b',
    hairStyle: 'cap',
    hat: '#2d4e6e', hatHi: '#426b91', hatDark: '#1c344a',
    jacket: '#d97436', jacketHi: '#ed9155', jacketDark: '#a6511e',
    pants: '#3c4552', pantsDark: '#272e38',
    shoes: '#242221',
    accessory: 'none',
  },
  {
    name: 'plum-briefcase',
    skin: '#a8704e', skinDark: '#825236',
    hair: '#2e201a', hairHi: '#47342b', hairDark: '#1a110d',
    hairStyle: 'bob',
    jacket: '#66507d', jacketHi: '#81689c', jacketDark: '#473559',
    pants: '#33363f', pantsDark: '#202229',
    shoes: '#1f1b1a',
    accessory: 'briefcase', acc: '#523d30', accDark: '#33241b',
  },
  {
    name: 'tan-headphones',
    skin: '#f2c8a7', skinDark: '#cfa382',
    hair: '#573926', hairHi: '#734e37', hairDark: '#382215',
    hairStyle: 'short',
    jacket: '#ba9568', jacketHi: '#d1ae82', jacketDark: '#8f6d45',
    pants: '#3c444f', pantsDark: '#272d36',
    shoes: '#29211c',
    accessory: 'headphones', acc: '#db4f4b', accDark: '#a3312e',
  },
];

// Integer pixel offsets for 5-frame walk cycle:
// 0: neutral, 1: right mid, 2: right high, 3: left mid, 4: left high
const FRAME_POSES = [
  { leftFootY: 31, rightFootY: 31, bob: 0, leftArmDy: 0, rightArmDy: 0 },
  { leftFootY: 31, rightFootY: 29, bob: 0, leftArmDy: -1, rightArmDy: 1 },
  { leftFootY: 32, rightFootY: 28, bob: -1, leftArmDy: -1, rightArmDy: 1 },
  { leftFootY: 29, rightFootY: 31, bob: 0, leftArmDy: 1, rightArmDy: -1 },
  { leftFootY: 28, rightFootY: 32, bob: -1, leftArmDy: 1, rightArmDy: -1 },
];

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawPixelPedestrianFrame(ctx, style, frameIdx) {
  const pose = FRAME_POSES[frameIdx];
  const b = pose.bob;

  // 1. Flat pixel shadow on ground (stepped dark oval, no alpha gradient)
  px(ctx, 5, 30, 12, 3, 'rgba(30, 30, 34, 0.72)');
  px(ctx, 4, 31, 14, 1, 'rgba(30, 30, 34, 0.72)');
  px(ctx, 6, 31, 10, 2, 'rgba(20, 20, 24, 0.55)');

  // 2. Legs & Shoes (crisp integer pixel blocks)
  const drawLeg = (x, footY) => {
    const legTop = 26 + b;
    const legH = Math.max(2, footY - legTop);
    px(ctx, x, legTop, 3, legH, style.pants);
    px(ctx, x + 2, legTop, 1, legH, style.pantsDark);
    px(ctx, x, footY, 3, 2, style.shoes);
  };
  drawLeg(7, pose.leftFootY);
  drawLeg(12, pose.rightFootY);

  // 3. Arms & Hands (flat 2-tone pixel sleeves)
  const leftArmY = 16 + b + pose.leftArmDy;
  const rightArmY = 16 + b + pose.rightArmDy;
  // Left arm
  px(ctx, 4, leftArmY, 2, 9, style.jacketDark);
  px(ctx, 5, leftArmY, 1, 8, style.jacket);
  px(ctx, 4, leftArmY + 9, 2, 2, style.skin);
  // Right arm
  px(ctx, 16, rightArmY, 2, 9, style.jacket);
  px(ctx, 17, rightArmY, 1, 9, style.jacketDark);
  px(ctx, 16, rightArmY + 9, 2, 2, style.skin);

  // Side accessories (pixelated briefcase or tote)
  if (style.accessory === 'briefcase') {
    const by = rightArmY + 7;
    px(ctx, 18, by, 3, 5, style.accDark);
    px(ctx, 18, by, 2, 4, style.acc);
    px(ctx, 19, by - 1, 1, 1, style.accDark);
  } else if (style.accessory === 'tote') {
    const ty = leftArmY + 6;
    px(ctx, 1, ty, 3, 6, style.accDark);
    px(ctx, 1, ty, 2, 5, style.acc);
    px(ctx, 2, ty - 2, 1, 2, style.accDark);
  }

  // 4. Torso / Jacket (flat pixel base + crisp left highlight + right/bottom shade)
  const ty = 15 + b;
  px(ctx, 6, ty, 10, 12, style.jacket);
  px(ctx, 7, ty - 1, 8, 2, style.jacketHi);  // Collar
  px(ctx, 6, ty + 1, 2, 10, style.jacketHi); // Subtle pixel highlight
  px(ctx, 14, ty + 1, 2, 11, style.jacketDark);
  px(ctx, 6, ty + 11, 10, 1, style.jacketDark);

  // Backpack accessory (crisp pixel pack on back)
  if (style.accessory === 'backpack') {
    px(ctx, 7, ty + 2, 8, 8, style.acc);
    px(ctx, 7, ty + 2, 1, 8, style.accDark);
    px(ctx, 14, ty + 2, 1, 8, style.accDark);
    px(ctx, 7, ty + 6, 8, 4, style.accDark);
    px(ctx, 8, ty + 7, 6, 2, style.acc);
    px(ctx, 10, ty + 1, 2, 1, style.accDark); // Handle
  }

  // 5. Head, Ears & Neck (pixelated chibi head matching Hero proportions)
  const hy = 2 + b;
  // Ears
  px(ctx, 3, hy + 6, 1, 3, style.skinDark);
  px(ctx, 18, hy + 6, 1, 3, style.skinDark);
  // Neck / lower skin rim
  px(ctx, 5, hy + 10, 12, 3, style.skin);
  px(ctx, 6, hy + 12, 10, 1, style.skinDark);

  // 6. Hair / Hat (stepped 3-tone pixel art, zero gradients)
  if (style.hairStyle === 'beanie') {
    px(ctx, 4, hy + 8, 14, 3, style.hair);
    px(ctx, 5, hy + 1, 12, 7, style.hat);
    px(ctx, 4, hy + 2, 14, 6, style.hat);
    px(ctx, 6, hy + 1, 5, 2, style.hatHi);
    px(ctx, 4, hy + 6, 14, 2, style.hatDark); // Ribbed cuff
    px(ctx, 16, hy + 2, 2, 6, style.hatDark);
  } else if (style.hairStyle === 'cap') {
    px(ctx, 4, hy + 8, 14, 3, style.hair);
    px(ctx, 5, hy + 1, 12, 7, style.hat);
    px(ctx, 4, hy + 2, 14, 6, style.hat);
    px(ctx, 6, hy + 1, 5, 2, style.hatHi);
    px(ctx, 16, hy + 2, 2, 6, style.hatDark);
    // Cap back-strap cutout
    px(ctx, 9, hy + 7, 4, 2, style.hair);
    px(ctx, 9, hy + 7, 4, 1, '#dce0e6');
  } else if (style.hairStyle === 'curly') {
    px(ctx, 5, hy, 12, 11, style.hair);
    px(ctx, 3, hy + 2, 16, 8, style.hair);
    px(ctx, 4, hy + 1, 2, 2, style.hairHi);
    px(ctx, 8, hy + 1, 3, 2, style.hairHi);
    px(ctx, 13, hy + 2, 2, 2, style.hairHi);
    px(ctx, 4, hy + 9, 14, 2, style.hairDark);
    px(ctx, 17, hy + 4, 2, 5, style.hairDark);
  } else {
    const hairH = style.hairStyle === 'long' ? 14 : style.hairStyle === 'bob' ? 12 : 10;
    px(ctx, 5, hy, 12, hairH, style.hair);
    px(ctx, 4, hy + 1, 14, hairH - 1, style.hair);
    // Crisp 16-bit pixel highlight strip across crown
    px(ctx, 6, hy + 1, 6, 2, style.hairHi);
    px(ctx, 5, hy + 2, 2, 3, style.hairHi);
    // Pixel shadow on right & bottom hem of hair
    px(ctx, 16, hy + 2, 2, hairH - 2, style.hairDark);
    px(ctx, 5, hy + hairH - 1, 12, 1, style.hairDark);

    if (style.hairStyle === 'bun') {
      px(ctx, 8, hy + 3, 6, 1, '#e06377'); // Hair tie
      px(ctx, 9, hy, 4, 3, style.hairDark);
      px(ctx, 9, hy + 1, 3, 2, style.hairHi);
    } else if (style.hairStyle === 'ponytail') {
      px(ctx, 9, hy + 8, 4, 1, '#c94040'); // Hair tie
      px(ctx, 9, hy + 9, 4, 5, style.hair);
      px(ctx, 10, hy + 10, 2, 3, style.hairHi);
      px(ctx, 10, hy + 14, 2, 1, style.hairDark);
    }
  }

  // Over-ear pixel headphones
  if (style.accessory === 'headphones') {
    px(ctx, 5, hy, 12, 1, style.acc);
    px(ctx, 3, hy + 1, 2, 4, style.acc);
    px(ctx, 17, hy + 1, 2, 4, style.acc);
    px(ctx, 2, hy + 5, 2, 4, style.accDark);
    px(ctx, 18, hy + 5, 2, 4, style.accDark);
    px(ctx, 3, hy + 6, 1, 2, style.acc);
    px(ctx, 18, hy + 6, 1, 2, style.acc);
  }
}

/**
 * Pre-renders all pedestrian variants (5 frames each) onto crisp native 22x34 pixel canvases.
 */
export function buildPedestrianSprites() {
  return PEDESTRIAN_STYLES.map((style) => {
    const frames = [];
    for (let f = 0; f < 5; f++) {
      const canvas = document.createElement('canvas');
      canvas.width = PX_W;
      canvas.height = PX_H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      drawPixelPedestrianFrame(ctx, style, f);
      frames.push(canvas);
    }
    return frames;
  });
}

export const PEDESTRIAN_VARIANT_COUNT = PEDESTRIAN_STYLES.length;
