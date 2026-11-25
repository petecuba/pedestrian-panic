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

    this.sidewalkImg = null;
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

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(CONFIG.WIDTH * this.dpr);
    this.canvas.height = Math.round(CONFIG.HEIGHT * this.dpr);
  }

  async loadAssets() {
    const [sidewalk, h1, h2, h3, h4, h5, a1, a2, a3, a4, a5, a6] = await Promise.all([
      loadImage('street/sidewalk-1.png'),
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

    this.sidewalkImg = sidewalk;
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
    if (this.sidewalkImg) {
      const tileH = this.sidewalkImg.height;
      const offset = ((distance % tileH) + tileH) % tileH;
      // Draw two stacked tiles to cover full viewport seamlessly
      ctx.drawImage(this.sidewalkImg, 0, offset - tileH, CONFIG.WIDTH, tileH);
      ctx.drawImage(this.sidewalkImg, 0, offset, CONFIG.WIDTH, tileH);
    } else {
      // Procedural fallback sidewalk with left curb
      ctx.fillStyle = '#6c7075';
      ctx.fillRect(0, 0, CONFIG.CURB_X, CONFIG.HEIGHT);
      ctx.fillStyle = '#c5c7c9';
      ctx.fillRect(CONFIG.CURB_X, 0, CONFIG.WIDTH - CONFIG.CURB_X, CONFIG.HEIGHT);
      const tile = 64;
      const offset = ((distance % tile) + tile) % tile;
      ctx.strokeStyle = '#9aa0a6';
      ctx.lineWidth = 1.5;
      for (let y = offset - tile; y < CONFIG.HEIGHT + tile; y += tile) {
        ctx.beginPath();
        ctx.moveTo(CONFIG.CURB_X, y);
        ctx.lineTo(CONFIG.WIDTH, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#4e5257';
      ctx.fillRect(CONFIG.CURB_X - 4, 0, 4, CONFIG.HEIGHT);
    }
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
    ctx.imageSmoothingEnabled = false;

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
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -w / 2, -h / 2 - 4, w, h);

    // Subtle frustration mark above head ONLY when impeded by Hero (visualizing scoring rule!)
    if (ped.isImpededByHero) {
      const bob = Math.sin(timeSec * 14 + ped.id) * 1.6;
      const badge = ped.chainDepth > 1 ? '!!' : '!';
      ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
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
        ? '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        : '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
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
