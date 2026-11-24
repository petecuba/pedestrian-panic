/**
 * Pedestrian Panic — Unified Input Manager
 * Supports:
 *  - Keyboard: ArrowLeft/ArrowRight (or A/D) to steer, Space to slow down
 *  - Tilt: DeviceOrientationEvent (gamma) for mobile/iOS steering
 *  - Press: Pointer/Touch hold on the game canvas to slow down
 */
export class InputManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.keys = { left: false, right: false, space: false };
    this.pointerSlow = false;
    this.activePointers = new Set();

    // Device tilt state
    this.tiltEnabled = false;
    this.tiltSupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    this.tiltAxis = 0;
    this.tiltGamma = 0;
    this.tiltBaseline = 0;
    this.hasTiltReading = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onOrientation = this._onOrientation.bind(this);

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  _onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keys.left = true;
      e.preventDefault();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keys.right = true;
      e.preventDefault();
    } else if (e.code === 'Space') {
      this.keys.space = true;
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keys.left = false;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keys.right = false;
    } else if (e.code === 'Space') {
      this.keys.space = false;
    }
  }

  _onBlur() {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.space = false;
    this.activePointers.clear();
    this.pointerSlow = false;
  }

  _onPointerDown(e) {
    // Only capture primary/touch pointers directly on the playfield
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.activePointers.add(e.pointerId);
    this.pointerSlow = true;
  }

  _onPointerUp(e) {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.delete(e.pointerId);
    }
    this.pointerSlow = this.activePointers.size > 0;
  }

  /**
   * Requests DeviceOrientation permission (required on iOS 13+ Safari inside a user gesture).
   * Returns { ok: boolean, message: string }.
   */
  async enableTilt() {
    if (!this.tiltSupported) {
      return { ok: false, message: 'Tilt not supported on this device' };
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') {
          return { ok: false, message: 'Tilt permission denied' };
        }
      }
      if (!this.tiltEnabled) {
        window.addEventListener('deviceorientation', this._onOrientation);
        this.tiltEnabled = true;
        this.hasTiltReading = false;
      }
      return { ok: true, message: 'Tilt steering enabled' };
    } catch (err) {
      return { ok: false, message: 'Could not enable tilt' };
    }
  }

  calibrateTilt() {
    if (this.hasTiltReading) {
      this.tiltBaseline = this.tiltGamma;
    }
  }

  _onOrientation(e) {
    if (typeof e.gamma !== 'number' || Number.isNaN(e.gamma)) return;
    this.tiltGamma = e.gamma;
    if (!this.hasTiltReading) {
      this.hasTiltReading = true;
      // Gently capture resting angle near zero
      this.tiltBaseline = Math.abs(e.gamma) < 12 ? e.gamma : 0;
    }

    const rel = e.gamma - this.tiltBaseline;
    // Ported from GameScene.swift: deadZone (~3 deg ~ 0.05g) + progressive accelerationFactor
    const deadzone = 2.8;
    const maxAngle = 24;
    if (Math.abs(rel) <= deadzone) {
      this.tiltAxis = 0;
    } else {
      const sign = Math.sign(rel);
      const norm = Math.min(1, (Math.abs(rel) - deadzone) / (maxAngle - deadzone));
      // Progressive curve matching iOS: fine precision at gentle tilts, snappy across-lane speed at steeper tilts
      const accelCurve = Math.min(1, norm * (0.65 + norm * 0.85));
      this.tiltAxis = sign * accelCurve;
    }
  }

  resetSlowLatchState() {
    this.activePointers.clear();
    this.pointerSlow = false;
  }

  getState() {
    let keyAxis = 0;
    if (this.keys.left) keyAxis -= 1;
    if (this.keys.right) keyAxis += 1;

    // Keyboard overrides tilt if actively pressed; otherwise use tilt axis
    const moveAxis = keyAxis !== 0 ? keyAxis : (this.tiltEnabled ? this.tiltAxis : 0);
    const slowHeld = this.keys.space || this.pointerSlow;
    return { moveAxis, slowHeld };
  }
}
