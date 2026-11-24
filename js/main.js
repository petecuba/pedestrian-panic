/**
 * Pedestrian Panic — Main Controller & Game Loop
 */
import { CONFIG } from './config.js';
import { GameSimulation } from './physics.js';
import { GameRenderer } from './renderer.js';
import { InputManager } from './input.js';
import { SoundEngine } from './sound.js';
import { PEDESTRIAN_VARIANT_COUNT } from './pedestrianArt.js';

const HIGH_SCORE_KEY = 'pedestrian_panic_high_score_v1';

const canvas = document.getElementById('game-canvas');
const splashOverlay = document.getElementById('splash-screen');
const endOverlay = document.getElementById('end-screen');
const hudEl = document.getElementById('hud');

const scoreEl = document.getElementById('hud-score');
const chainBadgeEl = document.getElementById('hud-chain');
const brakePillEl = document.getElementById('hud-brake');
const muteBtn = document.getElementById('mute-btn');

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

// Hero preview sprites on splash screen
const splashCastEl = document.getElementById('splash-cast');

const sim = new GameSimulation(PEDESTRIAN_VARIANT_COUNT);
const renderer = new GameRenderer(canvas);
const input = new InputManager(canvas);
const sound = new SoundEngine();

let state = 'splash'; // 'splash' | 'playing' | 'gameover'
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
let lastFrameTime = performance.now();
let accumulator = 0;
let gameOverAt = 0;

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
  // Show a few procedural pedestrian sprites alongside Hero on the splash card
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

  const heroImg = document.createElement('img');
  heroImg.src = 'assets/ped1.png';
  heroImg.alt = 'Hero';
  heroImg.className = 'cast-sprite cast-hero';
  splashCastEl.appendChild(heroImg);

  rightPeds.forEach(appendPedCanvas);
}

function startGame() {
  sound.unlock();
  sim.reset();
  renderer.resetEffects();
  input.resetSlowLatchState();
  input.calibrateTilt();

  state = 'playing';
  accumulator = 0;
  splashOverlay.classList.add('hidden');
  endOverlay.classList.add('hidden');
  hudEl.classList.remove('hidden');
  updateHud();
}

function showGameOver() {
  state = 'gameover';
  gameOverAt = performance.now();
  hudEl.classList.add('hidden');

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

  // Brake state pill (no recharge meter per user spec — crisp state label only)
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
    // Gentle idle stroll on splash background so the sidewalk feels alive
    sim.distance += CONFIG.HERO.BASE_SPEED * 0.55 * frameDt;
    sim.hero.walkPhase += frameDt * 5.5;
    renderer.updateEffects(frameDt, sim);
  }

  renderer.render(sim, timeSec);
  requestAnimationFrame(loop);
}

// Button & keyboard wiring
startBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  startGame();
});

tiltBtn.addEventListener('click', async () => {
  sound.unlock();
  const res = await input.enableTilt();
  tiltStatusEl.textContent = res.message;
  if (res.ok) {
    tiltBtn.textContent = 'Tilt Steering On';
    tiltBtn.classList.add('enabled');
  }
});

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
  if (state === 'splash' && (e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    startGame();
  } else if (state === 'gameover' && (e.code === 'Enter' || e.code === 'Space')) {
    // Guard against accidentally restarting immediately while holding Space at death
    if (performance.now() - gameOverAt > 550) {
      e.preventDefault();
      startGame();
    }
  }
});

window.addEventListener('resize', () => {
  renderer.resize();
});

// Initialize assets and start render loop
updateBestDisplay();
populateSplashCast();

// Show Tilt button on mobile/touch devices or when DeviceOrientation exists
if (!input.tiltSupported) {
  tiltBtn.hidden = true;
}

renderer.loadAssets().then(() => {
  requestAnimationFrame(loop);
});
