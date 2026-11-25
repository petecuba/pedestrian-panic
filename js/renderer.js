/**
 * Pedestrian Panic — Canvas Renderer
 * Handles:
 *  - Procedurally generated scrolling sidewalk + curb
 *  - Randomized storefront awnings scrolling along the right edge
 *  - Sidewalk pigeons that peck and flutter away when Hero or Pedestrians approach
 *  - Y-sorted Hero & 32 randomized bicubic pixel-art Pedestrians (20% shadows, no underfoot circles)
 *  - Comic contact reactions (!, censored cuss words, rare "I'M WALKIN' HERE!")
 *  - Optional debug rounded-corner hitbox overlay
 */
import { CONFIG } from './config.js';
import { buildHeroSprites, buildPedestrianSprites, buildPigeonSprites } from './pedestrianArt.js';
import { buildAwningSprites } from './awningArt.js';
import { buildPowerupSprites } from './powerupArt.js';

const WALK_CYCLE = [0, 1, 2, 1, 0, 3, 4, 3];

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.resize();

    this.sidewalkTile = this.buildSidewalkTile();
    this.heroFrames = buildHeroSprites();
    this.powerupSprites = buildPowerupSprites();
    this.pedSprites = buildPedestrianSprites();
    this.pigeonSprites = buildPigeonSprites();
    this.awningPool = buildAwningSprites();

    // Scrolling awning track along the right edge
    this.awnings = [];
    this.lastDistance = 0;

    // Ambient sidewalk pigeons
    this.pigeons = [];
    this.pigeonDistAccum = 0;
    this.nextPigeonGap = 180;

    // Visual effects
    this.popups = [];
    this.skidMarks = [];
    this.skidTimer = 0;
  }

  refreshPedestrians() {
    this.pedSprites = buildPedestrianSprites();
    this.awningPool = buildAwningSprites();
  }

  rebuildAwnings() {
    this.awningPool = buildAwningSprites();
    this.initAwnings();
  }

  /**
   * Procedurally generates a seamless 320x640 (2x HiDPI = 640x1280) urban sidewalk tile.
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

    let seed = 42197;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const curbX = CONFIG.CURB_X;

    // 1. Asphalt street strip on left
    ctx.fillStyle = '#5c6066';
    ctx.fillRect(0, 0, curbX - 4, H);
    for (let i = 0; i < 950; i++) {
      const gx = rand() * (curbX - 5);
      const gy = rand() * H;
      ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.16)';
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }

    // 2. Concrete sidewalk slabs
    const cols = 5;
    const rows = 10;
    const slabW = (W - curbX) / cols;
    const slabH = H / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = curbX + c * slabW;
        const sy = r * slabH;
        const tone = 184 + Math.floor(rand() * 26);
        ctx.fillStyle = `rgb(${tone}, ${tone + 1}, ${tone + 2})`;
        ctx.fillRect(sx, sy, slabW + 0.5, slabH + 0.5);

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

    // 3. Slab expansion joints
    ctx.strokeStyle = 'rgba(84, 88, 94, 0.72)';
    ctx.lineWidth = 1.25;
    for (let r = 0; r < rows; r++) {
      const y = r * slabH + 0.5;
      ctx.beginPath();
      ctx.moveTo(curbX, y);
      ctx.lineTo(W, y);
      ctx.stroke();
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

    // 4. Raised Left Curbstone & Gutter Drop-Shadow
    ctx.fillStyle = 'rgba(20, 22, 26, 0.52)';
    ctx.fillRect(curbX - 7, 0, 3, H);
    ctx.fillStyle = '#8b9096';
    ctx.fillRect(curbX - 4, 0, 4, H);
    ctx.fillStyle = '#cfd4da';
    ctx.fillRect(curbX - 1, 0, 2, H);
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
    // Wait briefly for Geist Pixel webfont so awning storefront signs render in Geist Pixel
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
    }
    this.awningPool = buildAwningSprites();
    this.resetEffects();
  }

  resetEffects() {
    this.popups = [];
    this.skidMarks = [];
    this.skidTimer = 0;
    this.lastDistance = 0;
    this.pigeons = [];
    this.pigeonDistAccum = 0;
    this.nextPigeonGap = 150 + Math.random() * 110;
    this.initAwnings();
    // Seed a couple welcoming sidewalk pigeons ahead of Hero right away
    this.spawnPigeonFlock(135);
  }

  initAwnings() {
    this.awnings = [];
    if (this.awningPool.length === 0) return;
    let y = -180;
    let prevIdx = -1;
    while (y < CONFIG.HEIGHT + 180) {
      let idx = Math.floor(Math.random() * this.awningPool.length);
      if (this.awningPool.length > 1 && idx === prevIdx) {
        idx = (idx + 1) % this.awningPool.length;
      }
      prevIdx = idx;
      const sprite = this.awningPool[idx];
      this.awnings.push({ sprite, y, idx });
      y += sprite.height + 48 + Math.random() * 82;
    }
  }

  spawnPigeonFlock(baseY = -22) {
    const count = Math.random() < 0.45 ? 1 : (Math.random() < 0.7 ? 2 : 3);
    const centerX = CONFIG.CURB_X + 36 + Math.random() * (CONFIG.WIDTH - CONFIG.CURB_X - 88);
    for (let i = 0; i < count; i++) {
      const px = Math.max(
        CONFIG.CURB_X + 16,
        Math.min(CONFIG.WIDTH - 46, centerX + (Math.random() - 0.5) * 44)
      );
      const py = baseY + (Math.random() - 0.5) * 28;
      this.pigeons.push({
        x: px,
        y: py,
        facing: Math.random() < 0.5 ? -1 : 1,
        state: 'ground', // 'ground' | 'flying'
        peckTimer: Math.random() * 2.2,
        isPecking: false,
        vx: 0,
        vy: 0,
        altitude: 0,
        flapPhase: Math.random() * 4,
      });
    }
  }

  addReactionPopup(x, y, text, isRare = false, chainDepth = 1) {
    this.popups.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      text,
      isRare,
      chainDepth,
      life: 0,
      maxLife: isRare ? 1.35 : 0.74,
    });
  }

  /**
   * Updates awnings, sidewalk pigeons, skid marks, and reaction popups.
   * Returns { pigeonStartled: boolean } so main can trigger subtle flutter SFX.
   */
  updateEffects(dt, sim) {
    const deltaDist = Math.max(0, sim.distance - this.lastDistance);
    this.lastDistance = sim.distance;
    let pigeonStartled = false;

    // 1. Scroll procedural awnings locked directly to Hero's travel distance
    if (this.awnings.length > 0 && deltaDist > 0) {
      let topMostY = Infinity;
      for (const aw of this.awnings) {
        aw.y += deltaDist;
        if (aw.y < topMostY) topMostY = aw.y;
      }
      for (const aw of this.awnings) {
        if (aw.y > CONFIG.HEIGHT + 40) {
          const nextIdx = Math.floor(Math.random() * this.awningPool.length);
          aw.sprite = this.awningPool[nextIdx];
          aw.idx = nextIdx;
          const gap = 48 + Math.random() * 88;
          aw.y = topMostY - aw.sprite.height - gap;
          topMostY = aw.y;
        }
      }
    }

    // 2. Spawn & update NYC sidewalk pigeons
    if (deltaDist > 0) {
      this.pigeonDistAccum += deltaDist;
      if (this.pigeonDistAccum >= this.nextPigeonGap && this.pigeons.length < 10) {
        this.pigeonDistAccum = 0;
        this.nextPigeonGap = 240 + Math.random() * 240;
        this.spawnPigeonFlock(-24);
      }
    }

    const scareRadius = 62;
    const scareRadiusSq = scareRadius * scareRadius;

    for (const p of this.pigeons) {
      if (p.state === 'ground') {
        p.y += deltaDist;
        // Idle pecking animation
        p.peckTimer -= dt;
        if (p.peckTimer <= 0) {
          p.isPecking = !p.isPecking;
          p.peckTimer = p.isPecking ? (0.16 + Math.random() * 0.22) : (0.55 + Math.random() * 1.4);
          if (!p.isPecking && Math.random() < 0.25) {
            p.facing *= -1;
          }
        }

        // Check if Hero or any Pedestrian is close enough to startle this pigeon!
        let threatX = null;
        let threatY = null;
        const hdx = p.x - sim.hero.x;
        const hdy = p.y - sim.hero.y;
        if (hdx * hdx + hdy * hdy < scareRadiusSq) {
          threatX = sim.hero.x;
          threatY = sim.hero.y;
        } else {
          for (const ped of sim.pedestrians) {
            const pdx = p.x - ped.x;
            const pdy = p.y - ped.y;
            if (pdx * pdx + pdy * pdy < scareRadiusSq) {
              threatX = ped.x;
              threatY = ped.y;
              break;
            }
          }
        }

        // Nearby startled pigeon also spooks flockmates!
        if (threatX === null) {
          for (const other of this.pigeons) {
            if (other !== p && other.state === 'flying' && other.altitude < 18) {
              const odx = p.x - other.x;
              const ody = p.y - other.y;
              if (odx * odx + ody * ody < 46 * 46) {
                threatX = p.x - other.vx * 0.1;
                threatY = p.y + 20;
                break;
              }
            }
          }
        }

        if (threatX !== null) {
          p.state = 'flying';
          pigeonStartled = true;
          const awayX = p.x - threatX;
          const flyDir = Math.abs(awayX) > 4 ? Math.sign(awayX) : (p.x < CONFIG.WIDTH * 0.5 ? -1 : 1);
          p.facing = flyDir;
          p.vx = flyDir * (125 + Math.random() * 75);
          p.vy = -(75 + Math.random() * 85);
          p.altitude = 1;
        }
      } else {
        // Flying away: climb into the sky, flap rapidly, dart off-screen
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.altitude += 52 * dt;
        p.flapPhase += dt * 18;
      }
    }

    this.pigeons = this.pigeons.filter(
      (p) => p.x > -60 && p.x < CONFIG.WIDTH + 60 && p.y > -80 && p.y < CONFIG.HEIGHT + 70
    );

    // 3. Subtle shoe-brake skid marks on pavement while Hero is slowing down
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

    // 4. Floating comic reaction popups
    for (const p of this.popups) {
      p.y -= (p.isRare ? 22 : 34) * dt;
      p.life += dt;
    }
    this.popups = this.popups.filter((p) => p.life < p.maxLife);

    return { pigeonStartled };
  }

  render(sim, timeSec) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Scrolling Procedural Sidewalk + Left Curb
    this.drawSidewalk(ctx, sim.distance);

    // 2. Subtle center recovery guide when Hero has been pushed up
    if (sim.hero.y < CONFIG.HERO.CENTER_Y - 36) {
      this.drawCenterGuide(ctx, sim.hero);
    }

    // 3. Brake skid marks on pavement
    this.drawSkidMarks(ctx);

    // 4. Grounded sidewalk pigeons (drawn beneath characters)
    this.drawPigeons(ctx, 'ground');

    // 5. Y-sorted entities (Hero + Pedestrians — NO underfoot indicator circles!)
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

    // 6. Overhead right-side storefront awnings (characters pass underneath)
    this.drawAwnings(ctx);

    // 7. Flying pigeons soaring above characters & awnings!
    this.drawPigeons(ctx, 'flying');

    // 8. Optional debug hitbox outlines (toggled from Physics Tuning)
    if (CONFIG.DEBUG.SHOW_HITBOXES) {
      this.drawHitboxes(ctx, sim);
    }

    // 9. Floating comic reaction popups (!, censored cuss words, "I'M WALKIN' HERE!")
    this.drawPopups(ctx);

    // 10. Top danger-zone glow when Hero is close to being pushed off the top
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
      const alpha = (1 - sk.life / sk.maxLife) * 0.22;
      ctx.fillStyle = `rgba(30, 40, 48, ${alpha})`;
      ctx.fillRect(sk.x - 6, sk.y, 3, 6);
      ctx.fillRect(sk.x + 3, sk.y, 3, 6);
    }
  }

  drawPigeons(ctx, targetState) {
    for (const p of this.pigeons) {
      if (p.state !== targetState) continue;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (p.state === 'ground') {
        // Soft 20% ground shadow
        ctx.fillStyle = 'rgba(18, 20, 24, 0.20)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 6, 8, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        const sprite = p.isPecking ? this.pigeonSprites.peck : this.pigeonSprites.idle;
        ctx.translate(p.x, p.y);
        ctx.scale(p.facing, 1);
        ctx.drawImage(sprite, -12, -14, 24, 24);
      } else {
        // Shadow stays lower on the pavement & fades out as pigeon climbs!
        const shadowAlpha = Math.max(0, 0.20 * (1 - p.altitude / 90));
        if (shadowAlpha > 0.01) {
          ctx.fillStyle = `rgba(18, 20, 24, ${shadowAlpha})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 8 + p.altitude * 0.6, 7.5, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        const frames = this.pigeonSprites.fly;
        const sprite = frames[Math.floor(p.flapPhase) % frames.length];
        const liftScale = 1 + Math.min(0.45, p.altitude / 120);
        ctx.translate(p.x, p.y - p.altitude * 0.35);
        ctx.scale(p.facing * liftScale, liftScale);
        ctx.drawImage(sprite, -13, -13, 26, 26);
      }

      ctx.restore();
    }
  }

  drawHero(ctx, hero) {
    const activePowerup = hero.powerup && hero.powerup !== 'none'
      ? this.powerupSprites[hero.powerup]
      : null;

    ctx.save();
    const lean = (hero.vx / CONFIG.HERO.LATERAL_SPEED) * (activePowerup ? 0.045 : 0.08);
    const blend = hero.slowBlend || 0;
    const squashY = 1.0 - 0.05 * blend;
    const stretchX = 1.0 + 0.05 * blend;

    ctx.translate(hero.x, hero.y);
    ctx.rotate(lean);
    ctx.scale(stretchX, squashY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (activePowerup) {
      const idx = Math.floor(hero.walkPhase * 0.85) % activePowerup.frames.length;
      const sprite = activePowerup.frames[idx];
      const w = activePowerup.drawW;
      const h = activePowerup.drawH;
      ctx.drawImage(sprite, -w / 2, -h / 2 + activePowerup.anchorDy, w, h);
    } else {
      const w = CONFIG.HERO.SPRITE_W;
      const h = CONFIG.HERO.SPRITE_H;
      const frameIdx = WALK_CYCLE[Math.floor(hero.walkPhase) % WALK_CYCLE.length];
      const sprite = this.heroFrames[frameIdx] || this.heroFrames[0];
      if (sprite) {
        ctx.drawImage(sprite, -w / 2, -h / 2 - 4, w, h);
      } else {
        ctx.fillStyle = '#4ea1b8';
        ctx.fillRect(-hero.hw, -hero.hh, hero.hw * 2, hero.hh * 2);
      }
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
    const wiggle = ped.isImpededByHero ? Math.sin(timeSec * 28 + ped.id) * 0.04 : 0;
    const lean = Math.max(-0.08, Math.min(0.08, (ped.vx / 45) * 0.05)) + wiggle;

    ctx.translate(ped.x, ped.y);
    ctx.rotate(lean);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, -w / 2, -h / 2 - 4, w, h);
    ctx.restore();
  }

  drawAwnings(ctx) {
    for (const aw of this.awnings) {
      const x = CONFIG.WIDTH - aw.sprite.width;
      ctx.drawImage(aw.sprite.canvas, x, aw.y, aw.sprite.width, aw.sprite.height);
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

    const h = sim.hero;
    this.drawRoundedCornerBox(ctx, h.x, h.y, h.hw, h.hh, h.rTop, h.rBot);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.95)';
    ctx.fill();
    ctx.stroke();

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
      const alpha = t < 0.16 ? t / 0.16 : 1 - (t - 0.16) / 0.84;
      ctx.globalAlpha = Math.max(0, alpha);

      const fontSize = p.isRare ? 13 : (p.text.length > 2 ? 12 : 14);
      ctx.font = `400 ${fontSize}px "Geist Pixel", monospace`;

      // Keep wide reactions like "I'M WALKIN' HERE!" cleanly inside the screen edges
      const halfW = ctx.measureText(p.text).width / 2 + 8;
      const drawX = Math.max(halfW, Math.min(CONFIG.WIDTH - halfW, p.x));

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeText(p.text, drawX, p.y);

      if (p.isRare) {
        ctx.fillStyle = '#fde047';
      } else if (p.text === '!' || p.text === '!!') {
        ctx.fillStyle = p.chainDepth > 1 ? '#fb923c' : '#facc15';
      } else {
        ctx.fillStyle = '#f87171'; // Punchy comic red-coral for censored cuss words
      }
      ctx.fillText(p.text, drawX, p.y);
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
