/**
 * Pedestrian Panic — Pure Game Simulation & Physics
 *  - Pure geometric rounded-corner hitboxes (Hero rounded bottom, Pedestrians rounded top)
 *    with enhanced corner slipperiness & zero artificial left/right Pedestrian AI
 *  - Smoothly eased Slow Down (ease-in & ease-out, up to 1.0s, 0.75s cooldown)
 *  - Realistic crowd force limit: 1-4 Pedestrians can be held/shoved back when braking,
 *    while > 4 Pedestrians (5+) overpower Hero and push Hero forward
 *  - Contact-locked upward push: Hero is never pushed faster than the Pedestrians touching
 *    them and stops advancing immediately once contact ends (no ghost-bump gap)
 *  - Strict on-screen guard: off-screen Pedestrians cannot add to the score
 */
import { CONFIG } from './config.js';

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Exact Minkowski-sum collision check between two rounded-corner boxes A and B.
 * Uses A's bottom corner + B's top corner when B is below A (dy >= 0),
 * and A's top corner + B's bottom corner when B is above A (dy < 0).
 */
function roundedBoxOverlap(a, b, extraPad = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const totalHalfW = a.hw + b.hw + extraPad;
  const totalHalfH = a.hh + b.hh + extraPad;

  if (Math.abs(dx) >= totalHalfW || Math.abs(dy) >= totalHalfH) return null;

  const rA = dy >= 0 ? a.rBot : a.rTop;
  const rB = dy >= 0 ? b.rTop : b.rBot;
  const R = rA + rB + extraPad;

  const flatW = Math.max(0, (a.hw - rA) + (b.hw - rB));
  const flatH = Math.max(0, (a.hh - rA) + (b.hh - rB));

  const cx = clamp(dx, -flatW, flatW);
  const cy = clamp(dy, -flatH, flatH);
  const rx = dx - cx;
  const ry = dy - cy;

  if (rx !== 0 || ry !== 0) {
    const distSq = rx * rx + ry * ry;
    if (distSq >= R * R) return null;
    const dist = Math.sqrt(distSq) || 0.0001;
    return {
      nx: rx / dist,
      ny: ry / dist,
      pen: R - dist,
      dx,
      dy,
    };
  }

  const penX = totalHalfW - Math.abs(dx);
  const penY = totalHalfH - Math.abs(dy);
  if (penX < penY) {
    return { nx: dx >= 0 ? 1 : -1, ny: 0, pen: penX, dx, dy };
  }
  return { nx: 0, ny: dy >= 0 ? 1 : -1, pen: penY, dx, dy };
}

export class GameSimulation {
  constructor(variantCount = 12) {
    this.variantCount = variantCount;
    this.reset();
  }

  reset() {
    const H = CONFIG.HERO;
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.peakChain = 0;
    this.totalBlockedPeds = 0;
    this.gameOver = false;

    this.hero = {
      x: H.START_X,
      y: H.CENTER_Y,
      vx: 0,
      vy: 0,              // Unified smooth vertical velocity (negative = pushed up, positive = braking back down)
      hw: H.HALF_W,
      hh: H.HALF_H,
      rTop: H.CORNER_R_TOP,
      rBot: H.CORNER_R_BOT,
      worldSpeed: H.BASE_SPEED,
      walkPhase: 0,
      isSlowing: false,
      slowTimer: 0,       // 0 .. 1.0s
      cooldownTimer: 0,   // 0 .. 0.75s
      slowLatch: false,
      slowBlend: 0,       // Linear 0..1 envelope -> smoothstepped for silky ease-in / ease-out
      pushedAmount: 0,
    };

    this.pedestrians = [];
    this.nextPedId = 1;
    this.spawnTimer = CONFIG.SPAWN.INITIAL_DELAY;
    this.events = [];

    // Shuffle-bag ensures all 32 pedestrian variants cycle without back-to-back repeats
    this.variantBag = [];
    this.lastVariantIndex = -1;

    this.activeBlockedCount = 0;
    this.scrollSpeed = H.BASE_SPEED;
  }

  nextVariantIndex() {
    if (this.variantBag.length === 0) {
      for (let i = 0; i < this.variantCount; i++) {
        this.variantBag.push(i);
      }
      // Fisher-Yates shuffle
      for (let i = this.variantBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = this.variantBag[i];
        this.variantBag[i] = this.variantBag[j];
        this.variantBag[j] = tmp;
      }
      // Avoid immediate repeat across bag boundary
      if (this.variantBag.length > 1 && this.variantBag[this.variantBag.length - 1] === this.lastVariantIndex) {
        const swap = this.variantBag[0];
        this.variantBag[0] = this.variantBag[this.variantBag.length - 1];
        this.variantBag[this.variantBag.length - 1] = swap;
      }
    }
    const idx = this.variantBag.pop();
    this.lastVariantIndex = idx;
    return idx;
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /**
   * Sync live-tuned CONFIG values (corner radii, weights) onto active entities immediately
   * so adjusting sliders in the pause drawer takes effect right away on resume.
   */
  syncLiveConfig() {
    const H = CONFIG.HERO;
    const P = CONFIG.PED;
    this.hero.rBot = H.CORNER_R_BOT;
    this.hero.rTop = H.CORNER_R_TOP;

    const progress = clamp(this.elapsed / CONFIG.SPAWN.RAMP_DURATION, 0, 1);
    for (const ped of this.pedestrians) {
      ped.rTop = P.CORNER_R_TOP;
      ped.rBot = P.CORNER_R_BOT;
      // Preserve individual weight jitter while tracking updated WEIGHT_AVG
      ped.pushPower = P.WEIGHT_AVG + (ped.weightOffset || 0) + progress * P.PUSH_POWER_RAMP;
    }
  }

  /**
   * Builds exact BFS contact chain from Hero to Pedestrians behind Hero right now.
   * Returns Map<pedId, depth>.
   */
  computeContactChain(pad) {
    const hero = this.hero;
    const blockingGraph = new Map();
    const addEdge = (frontKey, backPed) => {
      let set = blockingGraph.get(frontKey);
      if (!set) {
        set = new Set();
        blockingGraph.set(frontKey, set);
      }
      set.add(backPed);
    };

    for (const ped of this.pedestrians) {
      const hit = roundedBoxOverlap(hero, ped, pad);
      if (hit && hit.dy > 2) {
        addEdge('hero', ped);
      }
    }

    const n = this.pedestrians.length;
    for (let i = 0; i < n; i++) {
      const a = this.pedestrians[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.pedestrians[j];
        const hit = roundedBoxOverlap(a, b, pad);
        if (hit) {
          if (hit.dy > 2) addEdge(a.id, b);
          else if (hit.dy < -2) addEdge(b.id, a);
        }
      }
    }

    const depthMap = new Map();
    const queue = [];
    const direct = blockingGraph.get('hero');
    if (direct) {
      for (const ped of direct) {
        depthMap.set(ped.id, 1);
        queue.push(ped);
      }
    }
    while (queue.length > 0) {
      const curr = queue.shift();
      const depth = depthMap.get(curr.id);
      const behind = blockingGraph.get(curr.id);
      if (behind) {
        for (const nextPed of behind) {
          if (!depthMap.has(nextPed.id)) {
            depthMap.set(nextPed.id, depth + 1);
            queue.push(nextPed);
          }
        }
      }
    }

    return depthMap;
  }

  /**
   * Step simulation by one fixed timestep `dt`.
   * @param {number} dt
   * @param {{ moveAxis: number, slowHeld: boolean }} input
   */
  step(dt, input) {
    if (this.gameOver) return;

    this.elapsed += dt;
    const H = CONFIG.HERO;
    const P = CONFIG.PED;
    const hero = this.hero;

    // 1. Slow Down state machine (hold up to 1.0s, then 0.75s cooldown)
    if (!input.slowHeld) {
      hero.slowLatch = false;
    }

    if (hero.cooldownTimer > 0) {
      hero.cooldownTimer = Math.max(0, hero.cooldownTimer - dt);
      if (hero.cooldownTimer === 0) {
        this.events.push({ type: 'cooldownReady' });
      }
    }

    if (hero.isSlowing) {
      hero.slowTimer += dt;
      if (!input.slowHeld || hero.slowTimer >= H.SLOW_MAX_DURATION) {
        hero.isSlowing = false;
        hero.slowTimer = 0;
        hero.cooldownTimer = H.SLOW_COOLDOWN;
        if (input.slowHeld) hero.slowLatch = true;
        this.events.push({ type: 'slowEnd' });
      }
    } else if (input.slowHeld && !hero.slowLatch && hero.cooldownTimer <= 0) {
      hero.isSlowing = true;
      hero.slowTimer = 0;
      this.events.push({ type: 'slowStart' });
    }

    // Smooth ease-in and ease-out envelope for Slow Down (Point #3)
    if (hero.isSlowing) {
      hero.slowBlend = Math.min(1, hero.slowBlend + dt / H.SLOW_EASE_IN_TIME);
    } else {
      hero.slowBlend = Math.max(0, hero.slowBlend - dt / H.SLOW_EASE_OUT_TIME);
    }
    const slowEase = smoothstep(hero.slowBlend);

    // 2. Smooth scroll speed driven directly by Hero's eased slowdown
    this.scrollSpeed = H.BASE_SPEED * (1 - (1 - H.SLOW_SPEED_MULT) * slowEase);

    // 3. Hero horizontal steering (clamped strictly inside curb & right wall)
    const axis = clamp(input.moveAxis || 0, -1, 1);
    const targetVx = axis * H.LATERAL_SPEED;
    hero.vx += (targetVx - hero.vx) * H.LATERAL_LERP;
    if (Math.abs(hero.vx) < 0.8 && Math.abs(axis) < 0.01) hero.vx = 0;

    hero.x += hero.vx * dt;
    const minHeroX = CONFIG.CURB_X + hero.hw;
    const maxHeroX = CONFIG.RIGHT_WALL_X - hero.hw;
    hero.x = clamp(hero.x, minHeroX, maxHeroX);

    // 4. Spawn incoming pedestrians from bottom of screen
    this.updateSpawning(dt);

    // 5. Measure LIVE physical contact stack right now (zero ghost-push when not touching — Point #5!)
    const livePushChain = this.computeContactChain(2.0);
    let totalCrowdWeight = 0;
    let pushingCount = 0;
    let stackCapSpeed = 0;

    const slowSpeedBonus = Math.max(0, H.BASE_SPEED - this.scrollSpeed);

    for (const ped of this.pedestrians) {
      const depth = livePushChain.get(ped.id) || 0;
      if (depth > 0) {
        const depthWeight = Math.max(0.88, 1.0 - (depth - 1) * 0.03);
        totalCrowdWeight += ped.pushPower * depthWeight;
        pushingCount += 1;
        // Pedestrians cannot push Hero upward faster than their own walking speed!
        const pedUpCap = ped.upwardSpeed * P.SPEED_MULT + slowSpeedBonus * 0.45;
        if (pedUpCap > stackCapSpeed) stackCapSpeed = pedUpCap;
      }
    }

    // 6. Unified smooth Hero vertical velocity:
    //    - Effective resistance mass = BASE_MASS + SLOW_EXTRA_MASS * slowEase.
    //    - Upward push scales with net crowd weight & PED.FORCE_MULT, strictly capped to stackCapSpeed.
    const effectiveMass = H.BASE_MASS + H.SLOW_EXTRA_MASS * slowEase;
    const netCrowdForce = totalCrowdWeight - effectiveMass;

    let targetHeroVy = 0;

    if (pushingCount > 0 && netCrowdForce > 0) {
      const crowdRatio = clamp((netCrowdForce * P.FORCE_MULT) / 240, 0, 1);
      targetHeroVy = -stackCapSpeed * (0.22 + 0.78 * crowdRatio);
    } else if (slowEase > 0.001) {
      const targetDownY = pushingCount > 0 ? H.MAX_SLOW_Y : H.CENTER_Y;
      const distToTarget = targetDownY - hero.y;
      if (distToTarget > 0.5) {
        const arrivalEase = clamp(distToTarget / 32, 0.12, 1.0);
        const loadDrag = pushingCount > 0
          ? clamp(1 - (totalCrowdWeight / (effectiveMass + 40)) * 0.72, 0.18, 1.0)
          : 1.0;
        targetHeroVy = H.RECOVER_Y_SPEED * slowEase * arrivalEase * loadDrag;
      }
    }

    if (pushingCount === 0 && hero.vy < 0) {
      hero.vy *= Math.exp(-H.NO_CONTACT_DAMP * dt);
      if (hero.vy > -0.5) hero.vy = 0;
    } else if (targetHeroVy < 0) {
      const blendRate = 10.0 * clamp(P.FORCE_MULT, 0.4, 2.5);
      hero.vy += (targetHeroVy - hero.vy) * Math.min(1, blendRate * dt);
      if (hero.vy < -stackCapSpeed) hero.vy = -stackCapSpeed;
    } else {
      const easeRate = hero.isSlowing ? 11.0 : 9.0;
      hero.vy += (targetHeroVy - hero.vy) * Math.min(1, easeRate * dt);
      if (Math.abs(hero.vy) < 0.3 && targetHeroVy === 0) hero.vy = 0;
    }

    const prevHeroY = hero.y;
    hero.y += hero.vy * dt;

    // 7. Advance Pedestrians straight upward — ZERO artificial left/right reaction
    const minPedX = CONFIG.CURB_X + P.HALF_W;
    const maxPedX = CONFIG.RIGHT_WALL_X - P.HALF_W;

    for (const ped of this.pedestrians) {
      ped.prevX = ped.x;
      ped.prevY = ped.y;

      const intendedScreenUp = ped.upwardSpeed * P.SPEED_MULT + slowSpeedBonus * 0.55;
      ped.intendedScreenUp = intendedScreenUp;
      ped.y -= intendedScreenUp * dt;
    }

    // 8. Pure geometric rounded-corner collision resolution (8 passes)
    //    Friction maps 0 (super slippery, 1.85x corner glide) -> 1 (very grippy, 0.15x)
    const heroPedFriction = clamp(0.55 * H.FRICTION + 0.45 * P.FRICTION, 0, 1);
    const heroPedSlip = 1.85 - heroPedFriction * 1.70;
    const pedPedSlip = 1.85 - clamp(P.FRICTION, 0, 1) * 1.70;
    const iterations = 8;

    for (let iter = 0; iter < iterations; iter++) {
      // 8a. Pedestrian vs Hero (Hero rounded bottom corners vs Ped rounded top corners)
      for (const ped of this.pedestrians) {
        const hit = roundedBoxOverlap(hero, ped, 0);
        if (!hit) continue;

        if (hit.dy >= 0) {
          const slideX = hit.nx * hit.pen * (Math.abs(hit.nx) > 0.01 ? heroPedSlip : 1.0);
          ped.x = clamp(ped.x + slideX, minPedX, maxPedX);
          ped.y += hit.ny * hit.pen;
        } else {
          const slideX = hit.nx * hit.pen * heroPedSlip;
          ped.x = clamp(ped.x + slideX * 0.92, minPedX, maxPedX);
          hero.x = clamp(hero.x - slideX * 0.08, minHeroX, maxHeroX);
          ped.y += hit.ny * hit.pen;
        }
      }

      // 8b. Pedestrian vs Pedestrian
      const n = this.pedestrians.length;
      for (let i = 0; i < n; i++) {
        const a = this.pedestrians[i];
        for (let j = i + 1; j < n; j++) {
          const b = this.pedestrians[j];
          const hit = roundedBoxOverlap(a, b, 0);
          if (!hit) continue;

          const sepX = hit.nx * hit.pen * 0.5 * (Math.abs(hit.nx) > 0.01 ? pedPedSlip : 1.0);
          a.x = clamp(a.x - sepX, minPedX, maxPedX);
          b.x = clamp(b.x + sepX, minPedX, maxPedX);

          const frontYield = slowEase > 0.15 ? 0.0 : 0.05;
          const backYield = 1.0 - frontYield;
          if (a.y > b.y) {
            b.y += hit.ny * hit.pen * frontYield;
            a.y -= hit.ny * hit.pen * backYield;
          } else {
            a.y -= hit.ny * hit.pen * frontYield;
            b.y += hit.ny * hit.pen * backYield;
          }
        }
      }
    }

    // Track pedestrian horizontal delta purely for subtle visual lean in renderer
    for (const ped of this.pedestrians) {
      ped.vx = (ped.x - ped.prevX) / dt;
    }

    // 9. Build settled Hero -> Ped -> Ped blocking graph for chain scoring
    const chainDepthMap = this.computeContactChain(CONFIG.SCORING.CONTACT_EPSILON);

    // 10. Advance street/awning scroll driven by Hero's effective speed
    const pushedUpRate = Math.max(0, (prevHeroY - hero.y) / dt);
    hero.pushedAmount = pushedUpRate;
    hero.worldSpeed = Math.max(20, this.scrollSpeed + pushedUpRate * 0.45);
    this.distance += hero.worldSpeed * dt;
    hero.walkPhase += (hero.worldSpeed / H.BASE_SPEED) * dt * 8.5;

    if (pushedUpRate > 28 && Math.random() < 0.14) {
      this.events.push({ type: 'push' });
    }

    // 11. Measure slowdown & award points ONLY for ON-SCREEN Hero-linked Pedestrians (Point #2)
    let blockedNow = 0;
    let framePoints = 0;

    for (const ped of this.pedestrians) {
      const actualScreenUp = (ped.prevY - ped.y) / dt;
      const intended = Math.max(1, ped.intendedScreenUp);
      const slowRatio = clamp((intended - actualScreenUp) / intended, 0, 1);

      const effectiveWorldSpeed = Math.max(16, this.scrollSpeed + actualScreenUp);
      ped.walkPhase += (effectiveWorldSpeed / H.BASE_SPEED) * dt * 8.0;

      // Strict on-screen check: pedestrian's body must be visibly on screen to score!
      const isOnScreen = (ped.y - ped.hh < CONFIG.HEIGHT - 6) && (ped.y + ped.hh > 0);

      const depth = chainDepthMap.get(ped.id) || 0;
      if (depth > 0) {
        ped.chainDepth = depth;
        ped.chainGrace = CONFIG.SCORING.CHAIN_GRACE;
      } else if (ped.chainGrace > 0) {
        ped.chainGrace = Math.max(0, ped.chainGrace - dt);
        if (ped.chainGrace === 0) ped.chainDepth = 0;
      } else {
        ped.chainDepth = 0;
      }

      const isSlowed = slowRatio >= CONFIG.SCORING.MIN_SLOW_RATIO;
      ped.isImpededByHero = isOnScreen && ped.chainDepth > 0 && isSlowed;
      ped.isImpededByOther = isOnScreen && ped.chainDepth === 0 && isSlowed;

      if (ped.isImpededByHero) {
        blockedNow++;
        if (!ped.everBlockedByHero) {
          ped.everBlockedByHero = true;
          this.totalBlockedPeds++;
        }
        const depthMult = 1 + (ped.chainDepth - 1) * CONFIG.SCORING.CHAIN_BONUS_PER_DEPTH;
        const pts = CONFIG.SCORING.POINTS_PER_SEC_FULL * slowRatio * depthMult * dt;
        framePoints += pts;
        ped.accumulatedPts += pts;
        ped.popupTimer += dt;

        if (ped.popupTimer >= 0.42 && ped.accumulatedPts >= 1.2) {
          const displayPts = Math.max(1, Math.round(ped.accumulatedPts));
          this.events.push({
            type: 'scorePopup',
            x: ped.x,
            y: ped.y - 31,
            points: displayPts,
            chainDepth: ped.chainDepth,
          });
          ped.accumulatedPts = 0;
          ped.popupTimer = 0;
        }
      } else {
        ped.popupTimer = 0;
        ped.accumulatedPts = 0;
      }
    }

    if (framePoints > 0) {
      this.score += framePoints;
    }
    this.activeBlockedCount = blockedNow;
    if (blockedNow > this.peakChain) {
      this.peakChain = blockedNow;
    }

    // 12. Clean up pedestrians off screen
    this.pedestrians = this.pedestrians.filter(
      (ped) => ped.y > P.DESPAWN_TOP_Y && ped.y < P.DESPAWN_BOTTOM_Y
    );

    // 13. Check Game Over: pushed off top of screen
    if (hero.y <= H.GAME_OVER_Y) {
      this.gameOver = true;
      this.events.push({ type: 'gameOver' });
    }
  }

  updateSpawning(dt) {
    const S = CONFIG.SPAWN;
    const baseRate = Math.max(0.25, S.RATE_MULT || 0.9);
    // Escalate effective spawn rate continuously over time so the street gets progressively more crowded
    const timeRamp = 1.0 + (this.elapsed / 32) * 0.72 + Math.pow(this.elapsed / 95, 1.35);
    const effectiveRate = baseRate * Math.min(3.4, timeRamp);

    this.spawnTimer -= dt * effectiveRate;
    if (this.spawnTimer > 0) return;

    const progress = clamp(this.elapsed / S.RAMP_DURATION, 0, 1);
    const interval = S.START_INTERVAL - (S.START_INTERVAL - S.MIN_INTERVAL) * progress;
    this.spawnTimer = interval * (0.82 + Math.random() * 0.36);

    if (this.pedestrians.length >= S.MAX_ACTIVE) return;

    this.spawnOnePedestrian(progress);

    // Increasing cluster & rush-hour wave chance as time goes on
    const clusterChance = S.CLUSTER_CHANCE_START + (S.CLUSTER_CHANCE_MAX - S.CLUSTER_CHANCE_START) * progress;
    if (Math.random() < clusterChance && this.pedestrians.length < S.MAX_ACTIVE) {
      this.spawnOnePedestrian(progress, 36 + Math.random() * 24);
    }
    if (this.elapsed > 35 && Math.random() < Math.min(0.4, (this.elapsed - 35) / 110) && this.pedestrians.length < S.MAX_ACTIVE) {
      this.spawnOnePedestrian(progress, 72 + Math.random() * 28);
    }
  }

  spawnOnePedestrian(difficultyProgress, extraYOffset = 0) {
    const P = CONFIG.PED;
    const minX = CONFIG.CURB_X + P.HALF_W + 4;
    const maxX = CONFIG.RIGHT_WALL_X - P.HALF_W - 4;
    const spawnY = CONFIG.HEIGHT + P.SPAWN_Y_OFFSET + extraYOffset;

    let x = minX + Math.random() * (maxX - minX);
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = minX + Math.random() * (maxX - minX);
      const overlaps = this.pedestrians.some(
        (other) => Math.hypot(other.x - candidate, other.y - spawnY) < P.HALF_W * 2.2
      );
      if (!overlaps) {
        x = candidate;
        break;
      }
    }

    const weightOffset = (Math.random() * 2 - 1) * P.WEIGHT_SPREAD;
    const pushPower = P.WEIGHT_AVG + weightOffset + difficultyProgress * P.PUSH_POWER_RAMP;

    const baseSpeed = P.MIN_REL_SPEED + Math.random() * (P.MAX_REL_SPEED - P.MIN_REL_SPEED);
    const variation = baseSpeed * ((Math.random() * 2 - 1) * P.SPEED_VARIATION);
    const upwardSpeed = baseSpeed + variation + difficultyProgress * 18;

    this.pedestrians.push({
      id: this.nextPedId++,
      x,
      y: spawnY,
      prevX: x,
      prevY: spawnY,
      vx: 0,
      hw: P.HALF_W,
      hh: P.HALF_H,
      rTop: P.CORNER_R_TOP,
      rBot: P.CORNER_R_BOT,
      weightOffset,
      pushPower,
      upwardSpeed,
      intendedScreenUp: upwardSpeed,
      variantIndex: this.nextVariantIndex(),
      walkPhase: Math.random() * 6,
      chainDepth: 0,
      chainGrace: 0,
      isImpededByHero: false,
      isImpededByOther: false,
      everBlockedByHero: false,
      accumulatedPts: 0,
      popupTimer: 0,
    });
  }
}
