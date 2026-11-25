/**
 * Pedestrian Panic — Canvas Renderer
 * Handles scrolling sidewalk (with curb), Hero sprites, procedural Pedestrians,
 * Hero->Ped->Ped chain feedback, floating score popups, and overhead right-edge awnings.
 */
import { CONFIG } from './config.js';
import { buildPedestrianSprites } from './pedestrianArt.js';

// Walk cycle frame sequence matching ped1..ped5 (indices 0..4)
const WALK_CYCLE = [0, 1, 2, 1, 0, 3, 4, 3];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.resize();

    this.sidewalkTile = this.buildSidewalkTile();
    this.heroFrames = [];
    this.awningImgs = [];
    this.pedSprites = buildPedestrianSprites();

    // Scrolling awning track along the right edge
    this.awnings = [];
    this.lastDistance = 0;

    // Visual effects
    this.popups = [];
    this.skidMarks = [];
    this.skidTimer = 0;
  }

  refreshPedestrians() {
    this.pedSprites = buildPedestrianSprites();
  }

  /**
   * Procedurally generates a seamless 320x640 (rendered at 2x = 640x1280) urban sidewalk tile:
   *  - Dark speckled asphalt street on the left (x = 0..22)
   *  - Raised concrete curb with drop-shadow bevel & joints (x = 22..28)
   *  - Concrete sidewalk grid slabs with varied tones, subtle grain & hairline cracks (x = 28..320)
   */
  buildSidewalkTile() {
    const W = CONFIG.WIDTH;
    const H = 640;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Deterministic PRNG for consistent crisp sidewalk grain
    let seed = 42197;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const curbX = CONFIG.CURB_X;

    // 1. Asphalt street strip on left (0 .. curbX - 5)
    ctx.fillStyle = '#5c6066';
    ctx.fillRect(0, 0, curbX - 4, H);
    for (let i = 0; i < 950; i++) {
      const gx = rand() * (curbX - 5);
      const gy = rand() * H;
      const shade = rand() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.16)';
      ctx.fillStyle = shade;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }

    // 2. Concrete sidewalk slabs (5 columns across curbX..W, 10 rows of 64px)
    const cols = 5;
    const rows = 10;
    const slabW = (W - curbX) / cols;
    const slabH = H / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = curbX + c * slabW;
        const sy = r * slabH;
        const tone = 184 + Math.floor(rand() * 26); // #b8..#d2 varied concrete slabs
        ctx.fillStyle = `rgb(${tone}, ${tone + 1}, ${tone + 2})`;
        ctx.fillRect(sx, sy, slabW + 0.5, slabH + 0.5);

        // Concrete aggregate grain per slab
        const dots = 150 + Math.floor(rand() * 110);
        for (let d = 0; d < dots; d++) {
          const dx = sx + 1 + rand() * (slabW - 2);
          const dy = sy + 1 + rand() * (slabH - 2);
          ctx.fillStyle = rand() < 0.45
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(42,46,52,0.19)';
          const sz = rand() < 0.7 ? 1 : 1.5;
          ctx.fillRect(dx, dy, sz, sz);
        }

        // Occasional subtle hairline crack
        if (rand() < 0.14) {
          ctx.strokeStyle = 'rgba(78, 82, 88, 0.34)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          let cx = sx + 6 + rand() * (slabW - 12);
          let cy = sy + 6 + rand() * (slabH - 18);
          ctx.moveTo(cx, cy);
          for (let seg = 0; seg < 3; seg++) {
            cx += (rand() - 0.5) * 14;
            cy += 4 + rand() * 8;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
      }
    }

    // 3. Slab expansion-joint seams (horizontal + vertical)
    ctx.strokeStyle = 'rgba(84, 88, 94, 0.72)';
    ctx.lineWidth = 1.25;
    for (let r = 0; r < rows; r++) {
      const y = r * slabH + 0.5;
      ctx.beginPath();
      ctx.moveTo(curbX, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      // Subtle sunlit top highlight beside groove
      ctx.strokeStyle = 'rgba(240, 244, 248, 0.32)';
      ctx.beginPath();
      ctx.moveTo(curbX, y + 1.2);
      ctx.lineTo(W, y + 1.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(84, 88, 94, 0.72)';
    }
    for (let c = 1; c < cols; c++) {
      const x = curbX + c * slabW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // 4. Raised Left Curbstone & Gutter Drop-Shadow (strict boundary at CURB_X)
    ctx.fillStyle = 'rgba(20, 22, 26, 0.52)';
    ctx.fillRect(curbX - 7, 0, 3, H);        // Gutter shadow onto asphalt
    ctx.fillStyle = '#8b9096';
    ctx.fillRect(curbX - 4, 0, 4, H);        // Curb face
    ctx.fillStyle = '#cfd4da';
    ctx.fillRect(curbX - 1, 0, 2, H);        // Crisp top bevel edge
    ctx.strokeStyle = 'rgba(65, 68, 74, 0.65)';
    ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) {
      const y = r * slabH + 0.5;
      ctx.beginPath();
      ctx.moveTo(curbX - 4, y);
      ctx.lineTo(curbX + 1, y);
      ctx.stroke();
    }

    return canvas;
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(CONFIG.WIDTH * this.dpr);
    this.canvas.height = Math.round(CONFIG.HEIGHT * this.dpr);
  }

  async loadAssets() {
    const [h1, h2, h3, h4, h5, a1, a2, a3, a4, a5, a6] = await Promise.all([
      loadImage('assets/ped1.png'),
      loadImage('assets/ped2.png'),
      loadImage('assets/ped3.png'),
      loadImage('assets/ped4.png'),
      loadImage('assets/ped5.png'),
      loadImage('awnings/awning.png'),
      loadImage('awnings/awning2.png'),
      loadImage('awnings/awning3.png'),
      loadImage('awnings/awning4.png'),
      loadImage('awnings/awning5.png'),
      loadImage('awnings/awning6.png'),
    ]);

    this.heroFrames = [h1, h2, h3, h4, h5].filter(Boolean);
    this.awningImgs = [a1, a2, a3, a4, a5, a6].filter(Boolean);
    this.resetEffects();
  }

  resetEffects() {
    this.popups = [];
    this.skidMarks = [];
    this.skidTimer = 0;
    this.lastDistance = 0;
    this.initAwnings();
  }

  initAwnings() {
    this.awnings = [];
    if (this.awningImgs.length === 0) return;
    let y = -180;
    let prevIdx = -1;
    while (y < CONFIG.HEIGHT + 160) {
      let idx = Math.floor(Math.random() * this.awningImgs.length);
      if (this.awningImgs.length > 1 && idx === prevIdx) {
        idx = (idx + 1) % this.awningImgs.length;
      }
      prevIdx = idx;
      const img = this.awningImgs[idx];
      this.awnings.push({ img, y, idx });
      y += img.height + 55 + Math.random() * 85;
    }
  }

  addScorePopup(x, y, points, chainDepth) {
    this.popups.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      points,
      chainDepth,
      life: 0,
      maxLife: 0.72,
    });
  }

  updateEffects(dt, sim) {
    const deltaDist = Math.max(0, sim.distance - this.lastDistance);
    this.lastDistance = sim.distance;

    // Scroll awnings locked directly to Hero's travel distance (User Answer #4)
    if (this.awnings.length > 0 && deltaDist > 0) {
      let topMostY = Infinity;
      for (const aw of this.awnings) {
        aw.y += deltaDist;
        if (aw.y < topMostY) topMostY = aw.y;
      }
      // Recycle awnings that scrolled past bottom back above the top edge
      for (const aw of this.awnings) {
        if (aw.y > CONFIG.HEIGHT + 40) {
          const nextIdx = Math.floor(Math.random() * this.awningImgs.length);
          aw.img = this.awningImgs[nextIdx];
          aw.idx = nextIdx;
          const gap = 55 + Math.random() * 90;
          aw.y = topMostY - aw.img.height - gap;
          topMostY = aw.y;
        }
      }
    }

    // Subtle shoe-brake skid marks on sidewalk while Hero is slowing down
    if (sim.hero.isSlowing) {
      this.skidTimer += dt;
      if (this.skidTimer >= 0.04) {
        this.skidTimer = 0;
        this.skidMarks.push({
          x: sim.hero.x,
          y: sim.hero.y + 24,
          life: 0,
          maxLife: 0.45,
        });
      }
    }
    for (const sk of this.skidMarks) {
      sk.y += deltaDist;
      sk.life += dt;
    }
    this.skidMarks = this.skidMarks.filter((sk) => sk.life < sk.maxLife);

    // Floating score popups
    for (const p of this.popups) {
      p.y -= 34 * dt;
      p.life += dt;
    }
    this.popups = this.popups.filter((p) => p.life < p.maxLife);
  }

  render(sim, timeSec) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Scrolling Sidewalk + Left Curb
    this.drawSidewalk(ctx, sim.distance);

    // 2. Subtle center recovery guide when Hero has been pushed up
    if (sim.hero.y < CONFIG.HERO.CENTER_Y - 36) {
      this.drawCenterGuide(ctx, sim.hero);
    }

    // 3. Brake skid marks on pavement
    this.drawSkidMarks(ctx);

    // 4. Chain highlight links under feet (Hero -> Ped -> Ped)
    this.drawChainLinks(ctx, sim);

    // 5. Hero subtle locator ring (intensifies & pulses while slowing down)
    this.drawHeroRing(ctx, sim.hero, timeSec);

    // 6. Y-sorted entities (Hero + Pedestrians)
    const entities = [{ type: 'hero', y: sim.hero.y, obj: sim.hero }];
    for (const ped of sim.pedestrians) {
      entities.push({ type: 'ped', y: ped.y, obj: ped });
    }
    entities.sort((a, b) => a.y - b.y);

    for (const ent of entities) {
      if (ent.type === 'hero') {
        this.drawHero(ctx, ent.obj);
      } else {
        this.drawPedestrian(ctx, ent.obj, timeSec);
      }
    }

    // 7. Overhead right-side storefront awnings (characters pass underneath)
    this.drawAwnings(ctx);

    // 7b. Optional debug hitbox outlines (shows exact rounded-bottom Hero & rounded-top Ped boxes)
    if (CONFIG.DEBUG.SHOW_HITBOXES) {
      this.drawHitboxes(ctx, sim);
    }

    // 8. Floating score popups (drawn above awnings for legibility)
    this.drawPopups(ctx);

    // 9. Top danger-zone glow when Hero is close to being pushed off the top
    if (sim.hero.y < CONFIG.HERO.DANGER_Y) {
      this.drawDangerGlow(ctx, sim.hero.y, timeSec);
    }

    ctx.restore();
  }

  drawSidewalk(ctx, distance) {
    const tileH = 640;
    const offset = ((distance % tileH) + tileH) % tileH;
    ctx.drawImage(this.sidewalkTile, 0, offset - tileH, CONFIG.WIDTH, tileH);
    ctx.drawImage(this.sidewalkTile, 0, offset, CONFIG.WIDTH, tileH);
  }

  drawCenterGuide(ctx, hero) {
    const cy = CONFIG.HERO.CENTER_Y;
    const distAbove = Math.min(1, (cy - hero.y - 36) / 140);
    ctx.save();
    ctx.strokeStyle = `rgba(38, 175, 200, ${0.14 + distAbove * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.CURB_X + 8, cy);
    ctx.lineTo(CONFIG.WIDTH - 24, cy);
    ctx.stroke();
    ctx.restore();
  }

  drawSkidMarks(ctx) {
    for (const sk of this.skidMarks) {
      const alpha = (1 - sk.life / sk.maxLife) * 0.25;
      ctx.fillStyle = `rgba(30, 40, 48, ${alpha})`;
      ctx.fillRect(sk.x - 6, sk.y, 3, 6);
      ctx.fillRect(sk.x + 3, sk.y, 3, 6);
    }
  }

  drawHeroRing(ctx, hero, timeSec) {
    ctx.save();
    const blend = hero.slowBlend || 0;
    if (blend > 0.02) {
      const pulse = 1 + Math.sin(timeSec * 20) * 0.07 * blend;
      const rx = (20.5 + 3.5 * blend) * pulse;
      const ry = (8.2 + 1.6 * blend) * pulse;
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.55 + 0.37 * blend})`;
      ctx.fillStyle = `rgba(34, 211, 238, ${0.22 * blend})`;
      ctx.lineWidth = 1.6 + 0.8 * blend;
      ctx.beginPath();
      ctx.ellipse(hero.x, hero.y + 22, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Subtle always-on player ring so Hero stays effortless to track in dense crowds
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(hero.x, hero.y + 22, 20.5, 8.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawChainLinks(ctx, sim) {
    const impeded = sim.pedestrians.filter((p) => p.isImpededByHero);
    if (impeded.length === 0) return;

    ctx.save();
    for (const ped of impeded) {
      // Golden glow ring under feet showing this Pedestrian is actively scoring!
      const isChain = ped.chainDepth > 1;
      ctx.fillStyle = isChain ? 'rgba(255, 168, 38, 0.24)' : 'rgba(250, 204, 21, 0.22)';
      ctx.strokeStyle = isChain ? 'rgba(249, 115, 22, 0.92)' : 'rgba(234, 179, 8, 0.9)';
      ctx.lineWidth = isChain ? 2.2 : 1.8;
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 22.5, 20.5, 8.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHero(ctx, hero) {
    const w = CONFIG.HERO.SPRITE_W;
    const h = CONFIG.HERO.SPRITE_H;
    const frameIdx = WALK_CYCLE[Math.floor(hero.walkPhase) % WALK_CYCLE.length];
    const sprite = this.heroFrames[frameIdx] || this.heroFrames[0];

    ctx.save();
    // Slight lean when steering horizontally or smoothly bracing during slow-down
    const lean = (hero.vx / CONFIG.HERO.LATERAL_SPEED) * 0.08;
    const blend = hero.slowBlend || 0;
    const squashY = 1.0 - 0.05 * blend;
    const stretchX = 1.0 + 0.05 * blend;

    ctx.translate(hero.x, hero.y);
    ctx.rotate(lean);
    ctx.scale(stretchX, squashY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (sprite) {
      // Anchor sprite center slightly above feet so rounded hitbox sits cleanly on body
      ctx.drawImage(sprite, -w / 2, -h / 2 - 4, w, h);
    } else {
      ctx.fillStyle = '#4ea1b8';
      ctx.fillRect(-hero.hw, -hero.hh, hero.hw * 2, hero.hh * 2);
    }
    ctx.restore();
  }

  drawPedestrian(ctx, ped, timeSec) {
    const w = CONFIG.PED.SPRITE_W;
    const h = CONFIG.PED.SPRITE_H;
    const frames = this.pedSprites[ped.variantIndex % this.pedSprites.length];
    const frameIdx = WALK_CYCLE[Math.floor(ped.walkPhase) % WALK_CYCLE.length];
    const sprite = frames[frameIdx];

    ctx.save();
    // Tiny irritated wiggle when actively stuck in Hero's traffic jam
    const wiggle = ped.isImpededByHero ? Math.sin(timeSec * 28 + ped.id) * 0.045 : 0;
    const lean = Math.max(-0.08, Math.min(0.08, (ped.vx / 45) * 0.05)) + wiggle;

    ctx.translate(ped.x, ped.y);
    ctx.rotate(lean);
    // High-quality smoothing over our bicubic-resampled 35x54 sprites matches Hero's soft pixel edges
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, -w / 2, -h / 2 - 4, w, h);

    // Subtle frustration mark above head ONLY when impeded by Hero (visualizing scoring rule!)
    if (ped.isImpededByHero) {
      const bob = Math.sin(timeSec * 14 + ped.id) * 1.6;
      const badge = ped.chainDepth > 1 ? '!!' : '!';
      ctx.font = '400 13px "Geist Pixel", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20, 20, 24, 0.85)';
      ctx.strokeText(badge, 0, -h / 2 - 6 + bob);
      ctx.fillStyle = ped.chainDepth > 1 ? '#fb923c' : '#facc15';
      ctx.fillText(badge, 0, -h / 2 - 6 + bob);
    }

    ctx.restore();
  }

  drawAwnings(ctx) {
    for (const aw of this.awnings) {
      const x = CONFIG.WIDTH - aw.img.width;
      ctx.drawImage(aw.img, x, aw.y);
    }
  }

  drawRoundedCornerBox(ctx, x, y, hw, hh, rTop, rBot) {
    const left = x - hw;
    const right = x + hw;
    const top = y - hh;
    const bottom = y + hh;
    const rt = Math.min(rTop, hw, hh);
    const rb = Math.min(rBot, hw, hh);

    ctx.beginPath();
    ctx.moveTo(left + rt, top);
    ctx.lineTo(right - rt, top);
    ctx.arcTo(right, top, right, top + rt, rt);
    ctx.lineTo(right, bottom - rb);
    ctx.arcTo(right, bottom, right - rb, bottom, rb);
    ctx.lineTo(left + rb, bottom);
    ctx.arcTo(left, bottom, left, bottom - rb, rb);
    ctx.lineTo(left, top + rt);
    ctx.arcTo(left, top, left + rt, top, rt);
    ctx.closePath();
  }

  drawHitboxes(ctx, sim) {
    ctx.save();
    ctx.lineWidth = 1.6;

    // Hero rounded-bottom hitbox
    const h = sim.hero;
    this.drawRoundedCornerBox(ctx, h.x, h.y, h.hw, h.hh, h.rTop, h.rBot);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.fill();
    ctx.stroke();

    // Pedestrians rounded-top hitboxes
    for (const p of sim.pedestrians) {
      this.drawRoundedCornerBox(ctx, p.x, p.y, p.hw, p.hh, p.rTop, p.rBot);
      ctx.fillStyle = p.isImpededByHero
        ? 'rgba(250, 204, 21, 0.18)'
        : 'rgba(255, 255, 255, 0.10)';
      ctx.strokeStyle = p.isImpededByHero
        ? 'rgba(250, 204, 21, 0.95)'
        : 'rgba(255, 255, 255, 0.78)';
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPopups(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    for (const p of this.popups) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = p.chainDepth > 1
        ? '400 14px "Geist Pixel", monospace'
        : '400 13px "Geist Pixel", monospace';
      const label = `+${p.points}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeText(label, p.x, p.y);
      ctx.fillStyle = p.chainDepth > 1 ? '#fb923c' : '#fde047';
      ctx.fillText(label, p.x, p.y);
    }
    ctx.restore();
  }

  drawDangerGlow(ctx, heroY, timeSec) {
    const severity = Math.min(1, Math.max(0, (CONFIG.HERO.DANGER_Y - heroY) / CONFIG.HERO.DANGER_Y));
    const pulse = 0.65 + Math.sin(timeSec * 14) * 0.35;
    const alpha = severity * 0.48 * pulse;

    const grad = ctx.createLinearGradient(0, 0, 0, 72);
    grad.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.WIDTH, 72);
  }
}
