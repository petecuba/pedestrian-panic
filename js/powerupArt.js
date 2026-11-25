/**
 * Pedestrian Panic — Animated Powerup Sprite Generator
 * Generates bicubic pixel-art walk-cycle animations matching Hero & Pedestrians
 * (44x68 per-person pixel scale -> Mitchell-Netravali bicubic resampling,
 *  rounded steady shoulders, subtle head bounce, 20% opacity ground shadows):
 *
 *  1. Couple Holding Hands (2 people side-by-side clasping hands)
 *  2. Side-by-Side Strollers (2 parents walking abreast pushing baby strollers)
 *  3. Tourist Family with Maps (4 tourists looking side-to-side holding open maps)
 */
import { bicubicResampleCanvas } from './pedestrianArt.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shadeHex(hex, delta) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + delta));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + delta));
  const b = Math.min(255, Math.max(0, (num & 255) + delta));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 8-frame cycle for smooth walking + head-turn animations (zero shoulder bounce!)
const CYCLE_8 = [
  { lf: 62, rf: 62, lc: 0,  rc: 0,  hb: 0,  look: 0 },
  { lf: 63, rf: 59, lc: -1, rc: 1,  hb: 0,  look: 1 },
  { lf: 64, rf: 56, lc: -2, rc: 1,  hb: -1, look: 2 },
  { lf: 63, rf: 59, lc: -1, rc: 1,  hb: 0,  look: 1 },
  { lf: 62, rf: 62, lc: 0,  rc: 0,  hb: 0,  look: 0 },
  { lf: 59, rf: 63, lc: 1,  rc: -1, hb: 0,  look: -1 },
  { lf: 56, rf: 64, lc: 1,  rc: -2, hb: -1, look: -2 },
  { lf: 59, rf: 63, lc: 1,  rc: -1, hb: 0,  look: -1 },
];

function drawShadow(ctx, ox, oy, w = 28) {
  const c = 'rgba(18, 20, 24, 0.20)';
  px(ctx, ox + 3, oy,     w - 6, 1, c);
  px(ctx, ox,     oy + 1, w,     3, c);
  px(ctx, ox + 3, oy + 4, w - 6, 1, c);
}

/**
 * Reusable chibi person helper with rounded steady shoulders, subtle head bounce,
 * optional head-look offset (-2..+2), and flexible left/right arm modes.
 */
function drawPerson(ctx, ox, oy, p, pose, opts = {}) {
  const ty = oy + 30;
  const hy = oy + 4 + pose.hb;
  const look = opts.look || 0;
  const scaleKid = Boolean(opts.isKid);

  const skinDark = shadeHex(p.skin, -28);
  const hairHi = shadeHex(p.hair, 26);
  const hairDark = shadeHex(p.hair, -26);
  const shirtHi = shadeHex(p.shirt, 24);
  const shirtDark = shadeHex(p.shirt, -34);
  const pantsDark = shadeHex(p.pants, -22);

  // Ground shadow (20% opacity)
  drawShadow(ctx, ox + (scaleKid ? 10 : 8), oy + 61, scaleKid ? 24 : 28);

  if (scaleKid) {
    // Compact kid proportions (shorter, cute oversized backpack!)
    const drawKidLeg = (x, footY) => {
      const top = oy + 53;
      const h = Math.max(3, footY - top);
      px(ctx, ox + x, top, 5, h, p.pants);
      px(ctx, ox + x + 3, top, 2, h, pantsDark);
      px(ctx, ox + x, footY, 5, 3, '#26211e');
    };
    drawKidLeg(15, oy + pose.lf);
    drawKidLeg(24, oy + pose.rf);

    // Kid rounded shoulders & tee
    const kty = oy + 38;
    px(ctx, ox + 15, kty - 1, 14, 2, shirtHi);
    px(ctx, ox + 13, kty,     18, 3, p.shirt);
    px(ctx, ox + 12, kty + 2, 20, 14, p.shirt);
    px(ctx, ox + 12, kty + 3, 3, 12, shirtHi);
    px(ctx, ox + 29, kty + 3, 3, 13, shirtDark);
    px(ctx, ox + 13, kty + 15, 18, 2, shirtDark);
    // Kid arms
    px(ctx, ox + 9,  kty + 3, 3, 10 + pose.lc, p.shirt);
    px(ctx, ox + 9,  kty + 13 + pose.lc, 3, 2, p.skin);
    px(ctx, ox + 32, kty + 3, 3, 10 + pose.rc, shirtDark);
    px(ctx, ox + 32, kty + 13 + pose.rc, 3, 2, p.skin);
    // Kid backpack
    px(ctx, ox + 16, kty + 4, 12, 10, p.acc || '#e06353');
    px(ctx, ox + 17, kty + 5, 10, 3, shadeHex(p.acc || '#e06353', 24));
    px(ctx, ox + 16, kty + 11, 12, 3, shadeHex(p.acc || '#e06353', -28));

    // Kid head (shifts subtly with look!)
    const khy = oy + 16 + pose.hb;
    px(ctx, ox + 10 + look, khy + 10, 2, 5, skinDark);
    px(ctx, ox + 32 + look, khy + 10, 2, 5, skinDark);
    px(ctx, ox + 12 + look, khy + 5, 20, 17, p.skin);
    px(ctx, ox + 12 + look, khy + 2, 20, 14, p.hair);
    px(ctx, ox + 11 + look, khy + 4, 22, 12, p.hair);
    px(ctx, ox + 14 + look, khy + 3, 8, 3, hairHi);
    px(ctx, ox + 29 + look, khy + 4, 4, 11, hairDark);
    return;
  }

  // Adult legs & shoes
  const drawLeg = (x, footY) => {
    const legTop = oy + 51;
    const legH = Math.max(4, footY - legTop);
    px(ctx, ox + x, legTop, 6, legH, p.pants);
    px(ctx, ox + x + 4, legTop, 2, legH, pantsDark);
    px(ctx, ox + x, footY, 6, 3, p.shoes || '#2b2420');
  };
  drawLeg(14, oy + pose.lf);
  drawLeg(24, oy + pose.rf);

  // Arms (left/right can be 'hang', 'reachRight', 'reachLeft', 'pushForward', 'holdMap')
  const leftMode = opts.leftArm || 'hang';
  const rightMode = opts.rightArm || 'hang';

  // Left arm
  if (leftMode === 'hang') {
    const ab = ty + 20 + pose.lc;
    px(ctx, ox + 10, ty + 2, 3, 2, p.shirt);
    px(ctx, ox + 9,  ty + 3, 4, 3, p.shirt);
    px(ctx, ox + 8,  ty + 5, 4, ab - (ty + 5), shirtDark);
    px(ctx, ox + 9,  ty + 5, 3, ab - (ty + 6), p.shirt);
    px(ctx, ox + 9,  ab, 3, 3, p.skin);
  } else if (leftMode === 'reachLeft') {
    // Reaches left toward partner's hand!
    px(ctx, ox + 10, ty + 2, 3, 3, p.shirt);
    px(ctx, ox + 7,  ty + 5, 5, 12, p.shirt);
    px(ctx, ox + 4,  ty + 14, 5, 4, p.shirt);
    px(ctx, ox + 1,  ty + 15, 4, 3, p.skin);
  } else if (leftMode === 'pushForward' || leftMode === 'holdMap') {
    // Reaches forward/upward to grip stroller handlebar or open map
    px(ctx, ox + 10, ty + 2, 3, 3, p.shirt);
    px(ctx, ox + 8,  ty - 3, 4, 12, p.shirt);
    px(ctx, ox + 8,  ty - 6, 4, 4, p.skin);
  }

  // Right arm
  if (rightMode === 'hang') {
    const ab = ty + 20 + pose.rc;
    px(ctx, ox + 31, ty + 2, 3, 2, shirtDark);
    px(ctx, ox + 31, ty + 3, 4, 3, p.shirt);
    px(ctx, ox + 32, ty + 5, 4, ab - (ty + 5), p.shirt);
    px(ctx, ox + 34, ty + 5, 2, ab - (ty + 5), shirtDark);
    px(ctx, ox + 32, ab, 3, 3, p.skin);
  } else if (rightMode === 'reachRight') {
    // Reaches right toward partner's hand!
    px(ctx, ox + 31, ty + 2, 3, 3, shirtDark);
    px(ctx, ox + 32, ty + 5, 5, 12, p.shirt);
    px(ctx, ox + 35, ty + 14, 5, 4, p.shirt);
    px(ctx, ox + 39, ty + 15, 4, 3, p.skin);
  } else if (rightMode === 'pushForward' || rightMode === 'holdMap') {
    px(ctx, ox + 31, ty + 2, 3, 3, shirtDark);
    px(ctx, ox + 32, ty - 3, 4, 12, p.shirt);
    px(ctx, ox + 34, ty - 3, 2, 12, shirtDark);
    px(ctx, ox + 32, ty - 6, 4, 4, p.skin);
  }

  // Rounded-shoulder torso
  px(ctx, ox + 15, ty - 2, 14, 3, shirtHi);
  px(ctx, ox + 13, ty,     18, 2, p.shirt);
  px(ctx, ox + 11, ty + 1, 22, 2, p.shirt);
  px(ctx, ox + 10, ty + 3, 24, 2, p.shirt);
  px(ctx, ox + 12, ty + 4, 20, 17, p.shirt);
  px(ctx, ox + 13, ty + 21, 18, 2, shirtDark);
  px(ctx, ox + 13, ty + 1, 4, 2, shirtHi);
  px(ctx, ox + 12, ty + 4, 3, 16, shirtHi);
  px(ctx, ox + 29, ty + 4, 3, 17, shirtDark);

  // Optional Hawaiian shirt pattern or camera strap for tourists!
  if (p.pattern === 'floral') {
    px(ctx, ox + 15, ty + 6, 3, 3, '#fde047');
    px(ctx, ox + 23, ty + 9, 3, 3, '#fb7185');
    px(ctx, ox + 16, ty + 14, 3, 3, '#a7f3d0');
    px(ctx, ox + 24, ty + 16, 3, 2, '#fde047');
  } else if (p.pattern === 'camera') {
    for (let k = 0; k < 12; k++) {
      px(ctx, ox + 14 + k, ty + 3 + k, 2, 2, '#22252a');
    }
    px(ctx, ox + 24, ty + 14, 6, 5, '#1e2229');
    px(ctx, ox + 26, ty + 15, 2, 2, '#94a3b8');
  }

  // Head, ears & hair (horizontally shifts subtly when looking around!)
  px(ctx, ox + 6 + look,  hy + 12, 3, 6, skinDark);
  px(ctx, ox + 35 + look, hy + 12, 3, 6, skinDark);
  px(ctx, ox + 10 + look, hy + 5, 24, 20, p.skin);
  px(ctx, ox + 9 + look,  hy + 8, 26, 15, p.skin);
  px(ctx, ox + 12 + look, hy + 23, 20, 3, skinDark);

  if (p.hat === 'sunhat') {
    px(ctx, ox + 9 + look,  hy + 15, 26, 8, p.hair);
    px(ctx, ox + 4 + look,  hy + 10, 36, 5, '#e2c994');
    px(ctx, ox + 5 + look,  hy + 9,  34, 3, '#f0dcaf');
    px(ctx, ox + 11 + look, hy + 2,  22, 8, '#e2c994');
    px(ctx, ox + 11 + look, hy + 8,  22, 2, p.hatBand || '#c94949');
  } else if (p.hat === 'cap') {
    px(ctx, ox + 9 + look,  hy + 15, 26, 6, p.hair);
    px(ctx, ox + 10 + look, hy + 2,  24, 15, p.hatColor || '#2d5278');
    px(ctx, ox + 8 + look,  hy + 5,  28, 12, p.hatColor || '#2d5278');
    px(ctx, ox + 12 + look, hy + 3,  10, 4, shadeHex(p.hatColor || '#2d5278', 24));
    // Visor peeks slightly left or right when head turns!
    if (look > 0) px(ctx, ox + 33 + look, hy + 4, 5, 4, shadeHex(p.hatColor || '#2d5278', -24));
    if (look < 0) px(ctx, ox + 6 + look,  hy + 4, 5, 4, shadeHex(p.hatColor || '#2d5278', -24));
  } else if (p.hairStyle === 'ponytail') {
    px(ctx, ox + 10 + look, hy + 1, 24, 20, p.hair);
    px(ctx, ox + 8 + look,  hy + 3, 28, 17, p.hair);
    px(ctx, ox + 12 + look, hy + 3, 10, 4, hairHi);
    px(ctx, ox + 32 + look, hy + 5, 4, 15, hairDark);
    px(ctx, ox + 18 + look, hy + 16, 8, 2, '#e06377');
    px(ctx, ox + 18 + look, hy + 18, 8, 10, p.hair);
  } else if (p.hairStyle === 'bun') {
    px(ctx, ox + 10 + look, hy + 1, 24, 20, p.hair);
    px(ctx, ox + 8 + look,  hy + 3, 28, 17, p.hair);
    px(ctx, ox + 12 + look, hy + 3, 10, 4, hairHi);
    px(ctx, ox + 16 + look, hy + 6, 12, 2, '#e06377');
    px(ctx, ox + 18 + look, hy,     8, 6, hairDark);
    px(ctx, ox + 18 + look, hy + 1, 6, 4, hairHi);
  } else {
    const hH = p.hairStyle === 'bob' ? 23 : 20;
    px(ctx, ox + 11 + look, hy,      22, hH, p.hair);
    px(ctx, ox + 9 + look,  hy + 2,  26, hH - 2, p.hair);
    px(ctx, ox + 8 + look,  hy + 4,  28, hH - 5, p.hair);
    px(ctx, ox + 13 + look, hy + 2,  11, 4, hairHi);
    px(ctx, ox + 32 + look, hy + 4,  4, hH - 5, hairDark);
    px(ctx, ox + 10 + look, hy + hH - 2, 24, 2, hairDark);
  }
}

/**
 * Draws a top-down/3/4 back-view baby stroller right in front of a parent!
 */
function drawStroller(ctx, ox, oy, canopyColor, wheelPhase) {
  const canopyHi = shadeHex(canopyColor, 26);
  const canopyDark = shadeHex(canopyColor, -34);
  const frame = '#2e333b';
  const frameHi = '#646d7a';

  // Soft 20% stroller shadow
  drawShadow(ctx, ox + 5, oy + 20, 34);

  // Wheels (subtle tread tick animation)
  const treadCol = wheelPhase % 2 === 0 ? '#181a1f' : '#3a404a';
  px(ctx, ox + 8,  oy + 4,  3, 6, treadCol);
  px(ctx, ox + 33, oy + 4,  3, 6, treadCol);
  px(ctx, ox + 8,  oy + 22, 3, 6, treadCol);
  px(ctx, ox + 33, oy + 22, 3, 6, treadCol);

  // Metal stroller side rails & back push handlebar
  px(ctx, ox + 10, oy + 5,  2, 24, frame);
  px(ctx, ox + 32, oy + 5,  2, 24, frame);
  px(ctx, ox + 10, oy + 26, 24, 3, frame);
  px(ctx, ox + 12, oy + 26, 20, 1, frameHi); // Handlebar grip

  // Seat / basket base
  px(ctx, ox + 12, oy + 6,  20, 20, '#3a404a');
  px(ctx, ox + 13, oy + 14, 18, 10, '#e8e2d5'); // Baby blanket peeking out!
  px(ctx, ox + 18, oy + 15, 8,  6, '#f2c7a5');  // Tiny baby head peeking out!
  px(ctx, ox + 19, oy + 14, 6,  3, '#d9a44e');

  // Rounded front sun canopy (arched over front half of stroller)
  px(ctx, ox + 13, oy + 2,  18, 14, canopyColor);
  px(ctx, ox + 11, oy + 4,  22, 11, canopyColor);
  px(ctx, ox + 14, oy + 3,  10, 4,  canopyHi);
  px(ctx, ox + 11, oy + 13, 22, 2,  canopyDark);
  px(ctx, ox + 29, oy + 4,  4,  11, canopyDark);
}

/**
 * Draws an unfolded multi-panel paper tourist map held wide in front of a tourist!
 */
function drawOpenMap(ctx, ox, oy, sway) {
  const mx = ox + 5 + sway;
  const my = oy + 10;
  // Paper base with 3 creased folds
  px(ctx, mx,      my + 1, 11, 16, '#f5eedc');
  px(ctx, mx + 11, my,     12, 17, '#ebe2cb');
  px(ctx, mx + 23, my + 1, 11, 16, '#f5eedc');
  // Map graphics: green Central Park patch, blue river, red transit lines!
  px(ctx, mx + 3,  my + 4, 6,  5, '#74b86a');
  px(ctx, mx + 13, my + 3, 5, 11, '#68a6d4');
  px(ctx, mx + 25, my + 5, 6,  4, '#74b86a');
  px(ctx, mx + 4,  my + 11, 26, 1, '#d6564b');
  px(ctx, mx + 16, my + 2, 1, 13, '#d99a38');
  // Crease shadows & paper border
  px(ctx, mx + 11, my + 1, 1, 15, 'rgba(60,50,40,0.22)');
  px(ctx, mx + 23, my + 1, 1, 15, 'rgba(60,50,40,0.22)');
  px(ctx, mx, my + 16, 34, 1, '#b8ae96');
}

function renderSequence(masterW, masterH, outW, outH, frameCount, drawFn) {
  const master = document.createElement('canvas');
  master.width = masterW;
  master.height = masterH;
  const mCtx = master.getContext('2d');
  mCtx.imageSmoothingEnabled = false;

  const frames = [];
  for (let f = 0; f < frameCount; f++) {
    mCtx.clearRect(0, 0, masterW, masterH);
    drawFn(mCtx, f);
    frames.push(bicubicResampleCanvas(master, outW, outH));
  }
  return frames;
}

export function buildPowerupSprites() {
  const heroStyle = {
    skin: '#f2c7a5', hair: '#4a3020', hairStyle: 'short',
    shirt: '#55a3b8', pants: '#8f7c63', shoes: '#3d2d22',
  };

  // 1. Couple Holding Hands (8 frames, master 82x68 -> out 65x54, draw ~86x69)
  const partnerStyle = {
    skin: '#e8b996', hair: '#6e3a24', hairStyle: 'ponytail',
    shirt: '#d65c6b', pants: '#3b4252', shoes: '#26201e',
  };
  const coupleFrames = renderSequence(82, 68, 65, 54, 8, (ctx, f) => {
    const p1 = CYCLE_8[f];
    const p2 = CYCLE_8[(f + 3) % 8]; // Slightly offset natural couple stride!
    drawPerson(ctx, 0,  0, heroStyle,    p1, { rightArm: 'reachRight' });
    drawPerson(ctx, 38, 0, partnerStyle, p2, { leftArm: 'reachLeft' });
    // Joined hands highlight right in the middle
    px(ctx, 38, 45, 6, 4, '#f0c4a0');
    px(ctx, 39, 48, 4, 1, '#c99773');
  });

  // 2. Side-by-Side Strollers (8 frames, master 100x88 -> out 80x70, draw ~106x92)
  const parent2Style = {
    skin: '#d89c72', hair: '#2b1e18', hairStyle: 'bun',
    shirt: '#6e8a4a', pants: '#3e4452', shoes: '#241f1c',
  };
  const strollerFrames = renderSequence(100, 88, 80, 70, 8, (ctx, f) => {
    const p1 = CYCLE_8[f];
    const p2 = CYCLE_8[(f + 4) % 8];
    // Strollers sit ahead (near top of canvas) pushed by parents behind them!
    drawStroller(ctx, 4,  0, '#2c7a8c', f);
    drawStroller(ctx, 52, 0, '#d98a38', f + 1);
    drawPerson(ctx, 4,  20, heroStyle,    p1, { leftArm: 'pushForward', rightArm: 'pushForward' });
    drawPerson(ctx, 52, 20, parent2Style, p2, { leftArm: 'pushForward', rightArm: 'pushForward' });
  });

  // 3. Tourist Family Looking Around Holding Maps (8 frames, master 144x78 -> out 115x62, draw ~152x82)
  const dadTourist = {
    skin: '#f2c7a5', hair: '#593c28', hat: 'cap', hatColor: '#2d5278',
    shirt: '#e07a3d', pants: '#b5a282', shoes: '#474c57', pattern: 'floral',
  };
  const kidTourist = {
    skin: '#ecc09c', hair: '#6b4228',
    shirt: '#e3b83b', pants: '#3b5275', acc: '#d6564b',
  };
  const momTourist = {
    skin: '#f0c4a0', hair: '#8c4427', hat: 'sunhat', hatBand: '#c94949',
    shirt: '#55a3b8', pants: '#455166', shoes: '#362d2a',
  };
  const auntTourist = {
    skin: '#e5b38c', hair: '#a6a09c', hairStyle: 'bob',
    shirt: '#8f6eab', pants: '#4f4c48', shoes: '#2d2826', pattern: 'camera',
  };

  const touristFrames = renderSequence(144, 78, 115, 62, 8, (ctx, f) => {
    const p1 = CYCLE_8[f];
    const p2 = CYCLE_8[(f + 2) % 8];
    const p3 = CYCLE_8[(f + 4) % 8];
    const p4 = CYCLE_8[(f + 6) % 8];

    // Open tourist maps held out in front of Dad (left) & Hero/Mom (center-right)!
    drawOpenMap(ctx, 2,  0, p1.look);
    drawOpenMap(ctx, 68, 0, p3.look);

    // 4-person tourist blockade looking left & right as they walk!
    drawPerson(ctx, 0,   10, dadTourist,  p1, { leftArm: 'holdMap', rightArm: 'holdMap', look: p1.look });
    drawPerson(ctx, 36,  10, kidTourist,  p2, { isKid: true, look: -p2.look });
    drawPerson(ctx, 66,  10, momTourist,  p3, { leftArm: 'holdMap', rightArm: 'holdMap', look: p3.look });
    drawPerson(ctx, 100, 10, auntTourist, p4, { look: -p4.look });
  });

  return {
    couple:   { frames: coupleFrames,   drawW: 86,  drawH: 69, anchorDy: -4 },
    strollers:{ frames: strollerFrames, drawW: 106, drawH: 92, anchorDy: -12 },
    tourists: { frames: touristFrames,  drawW: 150, drawH: 82, anchorDy: -8 },
  };
}
