/**
 * Pedestrian Panic — Lightweight Procedural Web Audio SFX
 * Zero external audio files; unlocks automatically on first user gesture.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastTickTime = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, endFreq, duration, type = 'sine', gainVal = 0.08) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSlowStart() {
    this.playTone(340, 170, 0.14, 'triangle', 0.09);
  }

  playSlowEnd() {
    this.playTone(190, 260, 0.08, 'sine', 0.04);
  }

  playCooldownReady() {
    this.playTone(520, 680, 0.08, 'sine', 0.045);
  }

  playScoreTick(chainDepth = 1) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastTickTime < 140) return;
    this.lastTickTime = now;
    const base = 460 + Math.min(chainDepth - 1, 5) * 90;
    this.playTone(base, base * 1.15, 0.08, 'sine', 0.055);
  }

  playPush() {
    this.playTone(135, 95, 0.06, 'triangle', 0.035);
  }

  playGameOver() {
    if (this.muted || !this.ctx) return;
    this.playTone(360, 220, 0.18, 'sawtooth', 0.06);
    setTimeout(() => this.playTone(220, 125, 0.34, 'sawtooth', 0.06), 150);
  }
}
