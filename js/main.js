/**
 * Pedestrian Panic — Main Controller, Game Loop & Live Physics Tuning UI
 */
import { CONFIG, DEFAULT_TUNING, applyTuningToConfig } from './config.js';
import { GameSimulation } from './physics.js';
import { GameRenderer } from './renderer.js';
import { InputManager } from './input.js';
import { SoundEngine } from './sound.js';
import { PEDESTRIAN_VARIANT_COUNT } from './pedestrianArt.js';

const HIGH_SCORE_KEY = 'pedestrian_panic_high_score_v1';
const TUNING_KEY = 'pedestrian_panic_tuning_v2';

const canvas = document.getElementById('game-canvas');
const splashOverlay = document.getElementById('splash-screen');
const endOverlay = document.getElementById('end-screen');
const tuneOverlay = document.getElementById('tune-overlay');
const hudEl = document.getElementById('hud');

const scoreEl = document.getElementById('hud-score');
const chainBadgeEl = document.getElementById('hud-chain');
const brakePillEl = document.getElementById('hud-brake');
const muteBtn = document.getElementById('mute-btn');
const tuneBtn = document.getElementById('tune-btn');
const resumeBtn = document.getElementById('resume-btn');
const tuneResetBtn = document.getElementById('tune-reset-btn');
const tuneCopyBtn = document.getElementById('tune-copy-btn');

const startBtn = document.getElementById('start-btn');
const tiltBtn = document.getElementById('tilt-btn');
const tiltStatusEl = document.getElementById('tilt-status');
const splashBestEl = document.getElementById('splash-best');

const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const statBlockedEl = document.getElementById('stat-blocked');
const statChainEl = document.getElementById('stat-chain');
const statTimeEl = document.getElementById('stat-time');
const newBestBadgeEl = document.getElementById('new-best-badge');
const splashCastEl = document.getElementById('splash-cast');

// Load any saved tuning tweaks before constructing simulation
let tuning = loadSavedTuning();
applyTuningToConfig(tuning);

const sim = new GameSimulation(PEDESTRIAN_VARIANT_COUNT);
const renderer = new GameRenderer(canvas);
const input = new InputManager(canvas);
const sound = new SoundEngine();

let state = 'splash'; // 'splash' | 'playing' | 'paused' | 'gameover'
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let lastFrameTime = performance.now();
let accumulator = 0;
let gameOverAt = 0;

function loadSavedTuning() {
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (!raw) return { ...DEFAULT_TUNING };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TUNING, ...parsed };
  } catch {
    return { ...DEFAULT_TUNING };
  }
}

function saveTuning() {
  try {
    localStorage.setItem(TUNING_KEY, JSON.stringify(tuning));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

const SLIDER_SPECS = [
  { key: 'heroCornerR', fmt: (v) => `${Number(v).toFixed(1)} px` },
  { key: 'heroSlowLength', fmt: (v) => `${Number(v).toFixed(2)} s` },
  { key: 'heroSlowCooldown', fmt: (v) => `${Number(v).toFixed(2)} s` },
  { key: 'heroSlowPower', fmt: (v) => `${Math.round(v)}` },
  { key: 'heroSlowRecover', fmt: (v) => `${Math.round(v)} px/s` },
  { key: 'heroWeight', fmt: (v) => `${Math.round(v)}` },
  { key: 'heroFriction', fmt: (v) => `${Number(v).toFixed(2)}` },
  { key: 'pedCornerR', fmt: (v) => `${Number(v).toFixed(1)} px` },
  { key: 'pedVelocity', fmt: (v) => `${Number(v).toFixed(2)}x` },
  { key: 'pedWeight', fmt: (v) => `${Math.round(v)}` },
  { key: 'pedForce', fmt: (v) => `${Number(v).toFixed(2)}x` },
  { key: 'pedFriction', fmt: (v) => `${Number(v).toFixed(2)}` },
  { key: 'tiltSensitivity', fmt: (v) => `${Number(v).toFixed(1)}x` },
  { key: 'spawnRate', fmt: (v) => `${Number(v).toFixed(2)}x` },
];

function syncTuningUI() {
  for (const spec of SLIDER_SPECS) {
    const el = document.getElementById(`tune-${spec.key}`);
    const out = document.getElementById(`val-${spec.key}`);
    if (el) el.value = String(tuning[spec.key]);
    if (out) out.textContent = spec.fmt(tuning[spec.key]);
  }
  const hbEl = document.getElementById('tune-showHitboxes');
  if (hbEl) hbEl.checked = Boolean(tuning.showHitboxes);
}

function initTuningControls() {
  syncTuningUI();

  for (const spec of SLIDER_SPECS) {
    const el = document.getElementById(`tune-${spec.key}`);
    const out = document.getElementById(`val-${spec.key}`);
    if (!el) continue;
    el.addEventListener('input', () => {
      const val = Number(el.value);
      tuning[spec.key] = val;
      if (out) out.textContent = spec.fmt(val);
      applyTuningToConfig(tuning);
      sim.syncLiveConfig();
      saveTuning();
    });
  }

  const hbEl = document.getElementById('tune-showHitboxes');
  if (hbEl) {
    hbEl.addEventListener('change', () => {
      tuning.showHitboxes = hbEl.checked;
      applyTuningToConfig(tuning);
      saveTuning();
    });
  }

  tuneResetBtn.addEventListener('click', () => {
    tuning = { ...DEFAULT_TUNING };
    applyTuningToConfig(tuning);
    sim.syncLiveConfig();
    syncTuningUI();
    saveTuning();
  });

  tuneCopyBtn.addEventListener('click', async () => {
    const payload = JSON.stringify(tuning, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      tuneCopyBtn.textContent = 'Copied!';
    } catch {
      // Fallback prompt if clipboard API is unavailable on non-focused mobile sheet
      window.prompt('Copy your tuned values:', payload);
      tuneCopyBtn.textContent = 'Shown';
    }
    setTimeout(() => {
      tuneCopyBtn.textContent = 'Copy Values';
    }, 1500);
  });
}

function openTuning() {
  if (state !== 'playing') return;
  state = 'paused';
  input.resetSlowLatchState();
  syncTuningUI();
  tuneOverlay.classList.remove('hidden');
  tuneBtn.classList.add('hidden');
}

function closeTuning() {
  if (state !== 'paused') return;
  tuneOverlay.classList.add('hidden');
  tuneBtn.classList.remove('hidden');
  input.resetSlowLatchState();
  lastFrameTime = performance.now();
  accumulator = 0;
  state = 'playing';
}

function updateBestDisplay() {
  if (highScore > 0) {
    splashBestEl.textContent = `Best: ${highScore.toLocaleString()} pts`;
    splashBestEl.hidden = false;
  } else {
    splashBestEl.hidden = true;
  }
}

function populateSplashCast() {
  if (!splashCastEl) return;
  splashCastEl.innerHTML = '';
  const sampleIndices = [0, 3, 5, 1];
  const leftPeds = sampleIndices.slice(0, 2);
  const rightPeds = sampleIndices.slice(2);

  const appendPedCanvas = (idx) => {
    const src = renderer.pedSprites[idx][0];
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.className = 'cast-sprite';
    c.getContext('2d').drawImage(src, 0, 0);
    splashCastEl.appendChild(c);
  };

  leftPeds.forEach(appendPedCanvas);

  const heroSrc = renderer.heroFrames[0];
  const heroCanvas = document.createElement('canvas');
  heroCanvas.width = heroSrc.width;
  heroCanvas.height = heroSrc.height;
  heroCanvas.className = 'cast-sprite cast-hero';
  heroCanvas.getContext('2d').drawImage(heroSrc, 0, 0);
  splashCastEl.appendChild(heroCanvas);

  rightPeds.forEach(appendPedCanvas);
}

function startGame() {
  sound.unlock();
  applyTuningToConfig(tuning);
  renderer.refreshPedestrians();
  sim.reset();
  renderer.resetEffects();
  input.resetSlowLatchState();
  input.calibrateTilt();

  state = 'playing';
  accumulator = 0;
  lastFrameTime = performance.now();
  splashOverlay.classList.add('hidden');
  endOverlay.classList.add('hidden');
  tuneOverlay.classList.add('hidden');
  hudEl.classList.remove('hidden');
  tuneBtn.classList.remove('hidden');
  updateHud();
}

function showGameOver() {
  state = 'gameover';
  gameOverAt = performance.now();
  hudEl.classList.add('hidden');
  tuneBtn.classList.add('hidden');
  tuneOverlay.classList.add('hidden');

  const finalPts = Math.round(sim.score);
  const isNewBest = finalPts > highScore && finalPts > 0;
  if (isNewBest) {
    highScore = finalPts;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }

  finalScoreEl.textContent = finalPts.toLocaleString();
  finalBestEl.textContent = highScore.toLocaleString();
  statBlockedEl.textContent = String(sim.totalBlockedPeds);
  statChainEl.textContent = `${sim.peakChain}x`;
  statTimeEl.textContent = `${sim.elapsed.toFixed(1)}s`;
  newBestBadgeEl.hidden = !isNewBest;

  updateBestDisplay();
  endOverlay.classList.remove('hidden');
}

function updateHud() {
  scoreEl.textContent = Math.round(sim.score).toLocaleString();

  if (sim.activeBlockedCount > 0) {
    chainBadgeEl.textContent = `${sim.activeBlockedCount}x BLOCKING`;
    chainBadgeEl.classList.add('active');
    chainBadgeEl.classList.toggle('mega', sim.activeBlockedCount >= 2);
  } else {
    chainBadgeEl.classList.remove('active', 'mega');
  }

  if (sim.hero.isSlowing) {
    brakePillEl.textContent = 'SLOWING';
    brakePillEl.dataset.state = 'slowing';
  } else if (sim.hero.cooldownTimer > 0) {
    brakePillEl.textContent = 'COOLING';
    brakePillEl.dataset.state = 'cooling';
  } else {
    brakePillEl.textContent = 'BRAKE READY';
    brakePillEl.dataset.state = 'ready';
  }
}

function handleEvents(events) {
  for (const ev of events) {
    switch (ev.type) {
      case 'slowStart':
        sound.playSlowStart();
        break;
      case 'slowEnd':
        sound.playSlowEnd();
        break;
      case 'cooldownReady':
        sound.playCooldownReady();
        break;
      case 'push':
        sound.playPush();
        break;
      case 'scorePopup':
        renderer.addScorePopup(ev.x, ev.y, ev.points, ev.chainDepth);
        sound.playScoreTick(ev.chainDepth);
        break;
      case 'gameOver':
        sound.playGameOver();
        showGameOver();
        break;
    }
  }
}

function loop(now) {
  const frameDt = Math.min(CONFIG.MAX_FRAME_DT, Math.max(0, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  const timeSec = now / 1000;

  if (state === 'playing') {
    accumulator += frameDt;
    const inputState = input.getState();

    while (accumulator >= CONFIG.FIXED_DT && state === 'playing') {
      sim.step(CONFIG.FIXED_DT, inputState);
      renderer.updateEffects(CONFIG.FIXED_DT, sim);
      const events = sim.drainEvents();
      handleEvents(events);
      accumulator -= CONFIG.FIXED_DT;
    }
    updateHud();
  } else if (state === 'splash') {
    sim.distance += CONFIG.HERO.BASE_SPEED * 0.55 * frameDt;
    sim.hero.walkPhase += frameDt * 5.5;
    renderer.updateEffects(frameDt, sim);
  }
  // When state === 'paused', simulation is frozen while canvas still renders live hitbox updates

  renderer.render(sim, timeSec);
  requestAnimationFrame(loop);
}

// Button & keyboard wiring
startBtn.addEventListener('click', () => startGame());
restartBtn.addEventListener('click', () => startGame());

// Prevent tapping Tune button from triggering canvas press-to-slow-down
tuneBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
tuneBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  openTuning();
});

resumeBtn.addEventListener('click', () => closeTuning());

tiltBtn.addEventListener('click', async () => {
  sound.unlock();
  const res = await input.enableTilt();
  tiltStatusEl.textContent = res.message;
  if (res.ok) {
    tiltBtn.textContent = 'Tilt Steering On';
    tiltBtn.classList.add('enabled');
  }
});

muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sound.unlock();
  const muted = sound.toggleMute();
  muteBtn.classList.toggle('muted', muted);
  muteBtn.querySelectorAll('.snd-wave').forEach((el) => { el.style.display = muted ? 'none' : ''; });
  muteBtn.querySelectorAll('.snd-mute').forEach((el) => { el.style.display = muted ? '' : 'none'; });
  muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'playing') {
      e.preventDefault();
      openTuning();
    } else if (state === 'paused') {
      e.preventDefault();
      closeTuning();
    }
    return;
  }

  if (state === 'splash' && (e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    startGame();
  } else if (state === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
    if (performance.now() - gameOverAt > 550) {
      e.preventDefault();
      startGame();
    }
  }
});

window.addEventListener('resize', () => {
  renderer.resize();
});

// Initialize
initTuningControls();
updateBestDisplay();
populateSplashCast();

if (!input.tiltSupported) {
  tiltBtn.hidden = true;
}

renderer.loadAssets().then(() => {
  requestAnimationFrame(loop);
});
