// ==========================================================
// Input.js — Gestione input tastiera + touch per PI.Onion
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Tastiera: WASD + frecce + spazio
// • Touch: bottone SPARA
// • Motion: tilt dispositivo su smartphone
//
// CONTRATTO PUBBLICO
// ----------------------------------------------------------
// • input.getMoveVector() -> { dx, dy, shootHeld }
// • input.consumeShootPressed() -> boolean (tap mobile, edge)
//
// NOTE
// ----------------------------------------------------------
// • SPARA su mobile è solo tap (shootPressed), nessun autofire.
// • Motion usa trigger delta con direzione persistente, non tilt assoluto.
//

const MOTION_TRIGGER_THRESHOLD_DEG = 6;
const MOTION_NEUTRAL_DEADZONE_DEG = 4;
const MOTION_NEUTRAL_HOLD_MS = 180;
const MOTION_MIN_TRIGGER_INTERVAL_MS = 120;
const MOTION_CALIBRATION_DURATION_MS = 1000;
const MOTION_CALIBRATION_MIN_SAMPLES = 12;
const MOTION_CALIBRATION_MAX_DRIFT_DEG = 5;
const MOTION_CALIBRATION_TIMEOUT_MS = 2500;

export class Input {
  constructor(options = {}) {
    const {
      fireBtnEl = null,
      motionEnabled = false,
      touchShootSurfaceEl = null,
      ignoreTouchShootSelector = "",
      onMotionOrientationChange = null
    } = options;

    // Stato sorgenti separate (merge con OR)
    this._kb = { up: false, down: false, left: false, right: false, shoot: false };
    this._touch = { up: false, down: false, left: false, right: false };
    this._motion = {
      enabled: Boolean(motionEnabled),
      active: false,
      baseline: null,
      lastSample: null,
      latchedDirection: "idle",
      neutralSince: null,
      lastTriggerAt: -MOTION_MIN_TRIGGER_INTERVAL_MS,
      calibrationRequired: false,
      dx: 0,
      dy: 0
    };
    this._motionCalibration = null;

    // Touch internals
    this._fireBtnEl = fireBtnEl;
    this._motionEnabled = Boolean(motionEnabled);
    this._touchShootSurfaceEl = touchShootSurfaceEl;
    this._ignoreTouchShootSelector = ignoreTouchShootSelector;
    this._firePointerId = null;
    this._touchShootPointerIds = new Set();
    this._shootTapQueued = false;
    this._shootPressedFrame = false;
    this._moveVector = { dx: 0, dy: 0, shootHeld: false };
    this._motionHandler = null;
    this._motionListening = false;
    this._motionSignalSeen = false;
    this._motionSignalWaiters = [];
    this._onMotionOrientationChange =
      typeof onMotionOrientationChange === "function" ? onMotionOrientationChange : null;

    // Tastiera
    window.addEventListener("keydown", (e) => this.#onKeyDown(e));
    window.addEventListener("keyup", (e) => this.#onKeyUp(e));

    // Touch (Pointer Events)
    this.#bindTouch();
    this.#bindMotion();
    this.#bindTouchShootSurface();
  }

  // Chiamare a inizio frame (Engine.update)
  beginFrame() {
    // shootPressed è edge-trigger: valido solo per 1 frame
    this._shootPressedFrame = this._shootTapQueued;
    this._shootTapQueued = false;
    this.#settleMotionNeutralHold();
    this.#mergeState();
  }

  // Chiamare a fine frame (Engine.update)
  endFrame() {
    this._shootPressedFrame = false;
  }

  getMoveVector() {
    return this._moveVector;
  }

  consumeShootPressed() {
    const pressed = this._shootPressedFrame;
    this._shootPressedFrame = false;
    return pressed;
  }

  clearShoot() {
    this._shootTapQueued = false;
    this._shootPressedFrame = false;
  }

  calibrateMotion(options = {}) {
    if (!this._motionEnabled || typeof window === "undefined") {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    if (!this._motionListening) {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    if (this._motionCalibration?.active) {
      return this._motionCalibration.promise;
    }

    const durationMs = Math.max(0, Number(options.durationMs) || MOTION_CALIBRATION_DURATION_MS);
    const minSamples = Math.max(1, Math.floor(Number(options.minSamples) || MOTION_CALIBRATION_MIN_SAMPLES));
    const maxDriftDeg = Math.max(0, Number(options.maxDriftDeg) || MOTION_CALIBRATION_MAX_DRIFT_DEG);
    const timeoutMs = Math.max(durationMs, Number(options.timeoutMs) || MOTION_CALIBRATION_TIMEOUT_MS);
    const startedAt = this.#now();

    this.#clearMotion();
    this._motion.calibrationRequired = true;

    let resolveCalibration = null;
    const promise = new Promise((resolve) => {
      resolveCalibration = resolve;
    });

    const calibration = {
      active: true,
      samples: [],
      angle: null,
      startedAt,
      durationMs,
      minSamples,
      maxDriftDeg,
      timeoutId: null,
      durationId: null,
      resolve: resolveCalibration,
      promise
    };

    calibration.durationId = setTimeout(() => {
      this.#tryFinishMotionCalibration();
    }, durationMs);
    calibration.timeoutId = setTimeout(() => {
      this.#finishMotionCalibration({ ok: false, reason: "timeout" });
    }, timeoutMs);

    this._motionCalibration = calibration;
    return promise;
  }

  resetMotionCalibration({ requireCalibration = false } = {}) {
    this.#cancelMotionCalibration();
    this.#clearMotion();
    this._motion.calibrationRequired = Boolean(requireCalibration);
  }

  requestMotionPermission() {
    if (!this._motionEnabled || typeof window === "undefined") return Promise.resolve(false);
    if (!("DeviceOrientationEvent" in window)) return Promise.resolve(false);

    const request = window.DeviceOrientationEvent?.requestPermission;
    if (typeof request !== "function") {
      this.#startMotionListening();
      return Promise.resolve(true);
    }

    return request.call(window.DeviceOrientationEvent)
      .then((state) => {
        if (state === "granted") {
          this.#startMotionListening();
          return true;
        }
        this.#clearMotion();
        return false;
      })
      .catch(() => {
        this.#clearMotion();
        return false;
      });
  }

  waitForMotionSignal(timeoutMs = 1500) {
    if (!this._motionEnabled || typeof window === "undefined") return Promise.resolve(false);
    if (this._motionSignalSeen) return Promise.resolve(true);

    return new Promise((resolve) => {
      const done = (result) => {
        clearTimeout(timeoutId);
        this._motionSignalWaiters = this._motionSignalWaiters.filter((waiter) => waiter !== done);
        resolve(result);
      };
      const timeoutId = setTimeout(() => done(false), Math.max(0, timeoutMs));
      this._motionSignalWaiters.push(done);
    });
  }

  // ----------------------------------------------------------
  // Tastiera
  // ----------------------------------------------------------
  #onKeyDown(e) {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        this._kb.up = true;
        break;

      case "ArrowDown":
      case "s":
      case "S":
        this._kb.down = true;
        break;

      case "ArrowLeft":
      case "a":
      case "A":
        this._kb.left = true;
        break;

      case "ArrowRight":
      case "d":
      case "D":
        this._kb.right = true;
        break;

      case " ":
      case "Space":
      case "Spacebar":
        e.preventDefault();
        this._kb.shoot = true;
        break;
    }
    this.#mergeState();
  }

  #onKeyUp(e) {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        this._kb.up = false;
        break;

      case "ArrowDown":
      case "s":
      case "S":
        this._kb.down = false;
        break;

      case "ArrowLeft":
      case "a":
      case "A":
        this._kb.left = false;
        break;

      case "ArrowRight":
      case "d":
      case "D":
        this._kb.right = false;
        break;

      case " ":
      case "Space":
      case "Spacebar":
        this._kb.shoot = false;
        break;
    }
    this.#mergeState();
  }

  // ----------------------------------------------------------
  // Touch
  // ----------------------------------------------------------
  #bindTouch() {
    if (!this._fireBtnEl) return;

    // Fire button
    this._fireBtnEl.addEventListener("pointerdown", (e) => this.#onFireDown(e));
    this._fireBtnEl.addEventListener("pointerup", (e) => this.#onFireUp(e));
    this._fireBtnEl.addEventListener("pointercancel", (e) => this.#onFireUp(e));
    this._fireBtnEl.addEventListener("lostpointercapture", (e) => this.#onFireUp(e));
  }

  #bindTouchShootSurface() {
    const surface = this._touchShootSurfaceEl;
    if (!surface) return;

    surface.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      if (this.#shouldIgnoreTouchShoot(e.target)) return;
      this._touchShootPointerIds.add(e.pointerId);
      this._shootTapQueued = true;
    }, { passive: true });

    const clear = (e) => {
      this._touchShootPointerIds.delete(e.pointerId);
    };
    surface.addEventListener("pointerup", clear, { passive: true });
    surface.addEventListener("pointercancel", clear, { passive: true });
  }

  #shouldIgnoreTouchShoot(target) {
    if (!this._ignoreTouchShootSelector || !target?.closest) return false;
    return Boolean(target.closest(this._ignoreTouchShootSelector));
  }

  #bindMotion() {
    if (!this._motionEnabled || typeof window === "undefined") return;
    if (!("DeviceOrientationEvent" in window)) return;

    this._motionHandler = (event) => this.#onDeviceOrientation(event);
    if (typeof window.DeviceOrientationEvent?.requestPermission !== "function") {
      this.#startMotionListening();
    }
  }

  #startMotionListening() {
    if (this._motionListening || typeof window === "undefined") return;
    if (!this._motionHandler) {
      this._motionHandler = (event) => this.#onDeviceOrientation(event);
    }
    window.addEventListener("deviceorientation", this._motionHandler, { passive: true });
    this._motionListening = true;
  }

  #clearMotion() {
    this._motion.baseline = null;
    this._motion.lastSample = null;
    this._motion.neutralSince = null;
    this._motion.lastTriggerAt = -MOTION_MIN_TRIGGER_INTERVAL_MS;
    this.#setMotionDirection("idle");
    this.#mergeState();
  }

  #onFireDown(e) {
    // Tap singolo: no autofire
    if (this._firePointerId != null) return;
    this._firePointerId = e.pointerId;
    try { this._fireBtnEl.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
    this._shootTapQueued = true;
  }

  #onFireUp(e) {
    if (this._firePointerId !== e.pointerId) return;
    e.preventDefault();
    this._firePointerId = null;
  }

  #onDeviceOrientation(event) {
    const gamma = Number(event.gamma);
    const beta = Number(event.beta);
    if (!Number.isFinite(gamma) || !Number.isFinite(beta)) return;
    if (!this._motionSignalSeen) {
      this._motionSignalSeen = true;
      const waiters = this._motionSignalWaiters.splice(0);
      waiters.forEach((done) => done(true));
    }

    const motion = this._motion;
    const sample = this.#getMotionSample(gamma, beta);
    if (this.#recordMotionCalibrationSample(sample)) return;

    const previous = motion.lastSample;

    if (previous && previous.angle !== sample.angle) {
      this.#handleMotionOrientationChange(sample);
      return;
    }

    if (motion.calibrationRequired) {
      motion.lastSample = sample;
      this.#setMotionDirection("idle");
      this.#mergeState();
      return;
    }

    if (!motion.baseline || !previous) {
      this.#calibrateMotionBaseline(sample);
      this.#mergeState();
      return;
    }

    const now = this.#now();
    const fromBaselineX = this.#deltaDegrees(sample.x, motion.baseline.x);
    const fromBaselineY = this.#deltaDegrees(sample.y, motion.baseline.y);
    const isNeutral =
      Math.abs(fromBaselineX) <= MOTION_NEUTRAL_DEADZONE_DEG &&
      Math.abs(fromBaselineY) <= MOTION_NEUTRAL_DEADZONE_DEG;

    if (isNeutral) {
      if (motion.neutralSince == null) motion.neutralSince = now;
      if (this.#settleMotionNeutralHold()) {
        this.#mergeState();
      }
      motion.lastSample = sample;
      return;
    }

    motion.neutralSince = null;

    const deltaX = this.#deltaDegrees(sample.x, previous.x);
    const deltaY = this.#deltaDegrees(sample.y, previous.y);
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (
      now - motion.lastTriggerAt >= MOTION_MIN_TRIGGER_INTERVAL_MS &&
      Math.max(absX, absY) >= MOTION_TRIGGER_THRESHOLD_DEG
    ) {
      const direction = absX >= absY
        ? (deltaX > 0 ? "right" : "left")
        : (deltaY > 0 ? "down" : "up");

      if (direction !== motion.latchedDirection) {
        this.#setMotionDirection(direction);
        motion.lastTriggerAt = now;
        this.#mergeState();
      }
    }

    motion.lastSample = sample;
  }

  #getMotionSample(gamma, beta) {
    let x = gamma;
    let y = beta;
    const angle = Number(window.orientation ?? window.screen?.orientation?.angle ?? 0);
    if (angle === 90) {
      [x, y] = [-y, x];
    } else if (angle === -90 || angle === 270) {
      [x, y] = [y, -x];
    } else if (Math.abs(angle) === 180) {
      x *= -1;
      y *= -1;
    }

    return { x, y, angle };
  }

  #deltaDegrees(current, previous) {
    let delta = current - previous;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    return delta;
  }

  #calibrateMotionBaseline(sample) {
    this._motion.baseline = sample;
    this._motion.lastSample = sample;
    this._motion.neutralSince = null;
    this._motion.lastTriggerAt = this.#now() - MOTION_MIN_TRIGGER_INTERVAL_MS;
    this._motion.calibrationRequired = false;
    this.#setMotionDirection("idle");
  }

  #recordMotionCalibrationSample(sample) {
    const calibration = this._motionCalibration;
    if (!calibration?.active) return false;

    if (calibration.angle == null) {
      calibration.angle = sample.angle;
    }
    if (sample.angle !== calibration.angle) {
      this.#finishMotionCalibration({ ok: false, reason: "unstable" });
      return true;
    }

    calibration.samples.push(sample);
    this.#tryFinishMotionCalibration();
    return true;
  }

  #tryFinishMotionCalibration() {
    const calibration = this._motionCalibration;
    if (!calibration?.active) return;
    const elapsedMs = this.#now() - calibration.startedAt;
    if (elapsedMs < calibration.durationMs) return;
    if (calibration.samples.length < calibration.minSamples) return;

    const result = this.#buildMotionCalibrationResult(calibration);
    this.#finishMotionCalibration(result);
  }

  #buildMotionCalibrationResult(calibration) {
    const samples = calibration.samples;
    if (samples.length < calibration.minSamples) {
      return { ok: false, reason: "timeout" };
    }

    const origin = samples[0];
    const sum = samples.reduce((acc, sample) => {
      acc.x += this.#deltaDegrees(sample.x, origin.x);
      acc.y += this.#deltaDegrees(sample.y, origin.y);
      return acc;
    }, { x: 0, y: 0 });
    const baseline = {
      x: origin.x + sum.x / samples.length,
      y: origin.y + sum.y / samples.length,
      angle: origin.angle
    };

    const stability = samples.reduce((acc, sample) => {
      acc.maxDeltaX = Math.max(acc.maxDeltaX, Math.abs(this.#deltaDegrees(sample.x, baseline.x)));
      acc.maxDeltaY = Math.max(acc.maxDeltaY, Math.abs(this.#deltaDegrees(sample.y, baseline.y)));
      return acc;
    }, { maxDeltaX: 0, maxDeltaY: 0 });

    if (
      stability.maxDeltaX > calibration.maxDriftDeg ||
      stability.maxDeltaY > calibration.maxDriftDeg
    ) {
      return {
        ok: false,
        reason: "unstable",
        sampleCount: samples.length,
        stability
      };
    }

    return {
      ok: true,
      sampleCount: samples.length,
      baseline,
      stability
    };
  }

  #finishMotionCalibration(result) {
    const calibration = this._motionCalibration;
    if (!calibration?.active) return;

    calibration.active = false;
    clearTimeout(calibration.durationId);
    clearTimeout(calibration.timeoutId);
    this._motionCalibration = null;

    if (result.ok && result.baseline) {
      this.#calibrateMotionBaseline(result.baseline);
    } else {
      this.#clearMotion();
      this._motion.calibrationRequired = true;
    }

    calibration.resolve(result);
  }

  #cancelMotionCalibration() {
    const calibration = this._motionCalibration;
    if (!calibration) return;
    clearTimeout(calibration.durationId);
    clearTimeout(calibration.timeoutId);
    this._motionCalibration = null;
  }

  #handleMotionOrientationChange(sample) {
    this.#cancelMotionCalibration();
    this.#clearMotion();
    this._motion.lastSample = sample;
    this._motion.calibrationRequired = true;
    this._onMotionOrientationChange?.({ angle: sample.angle });
  }

  #settleMotionNeutralHold() {
    if (!this._motionEnabled) return false;
    const motion = this._motion;
    if (motion.latchedDirection === "idle" || motion.neutralSince == null) return false;
    if (this.#now() - motion.neutralSince < MOTION_NEUTRAL_HOLD_MS) return false;

    this.#setMotionDirection("idle");
    return true;
  }

  #setMotionDirection(direction) {
    this._motion.latchedDirection = direction;

    switch (direction) {
      case "right":
        this._motion.dx = 1;
        this._motion.dy = 0;
        break;
      case "left":
        this._motion.dx = -1;
        this._motion.dy = 0;
        break;
      case "up":
        this._motion.dx = 0;
        this._motion.dy = -1;
        break;
      case "down":
        this._motion.dx = 0;
        this._motion.dy = 1;
        break;
      default:
        this._motion.dx = 0;
        this._motion.dy = 0;
        this._motion.latchedDirection = "idle";
        break;
    }

    this._motion.active = this._motion.latchedDirection !== "idle";
  }

  #now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }
    return Date.now();
  }

  // Merge stato (OR) tra tastiera e touch
  #mergeState() {
    const up = this._kb.up || this._touch.up;
    const down = this._kb.down || this._touch.down;
    const left = this._kb.left || this._touch.left;
    const right = this._kb.right || this._touch.right;

    let dx = 0;
    let dy = 0;
    if (this._motion.active) {
      dx = this._motion.dx;
      dy = this._motion.dy;
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > 1) {
        dx /= magnitude;
        dy /= magnitude;
      }
    } else if (up) { dy = -1; }
    else if (down) { dy = 1; }
    else if (left) { dx = -1; }
    else if (right) { dx = 1; }

    this._moveVector = { dx, dy, shootHeld: this._kb.shoot };
  }
}
