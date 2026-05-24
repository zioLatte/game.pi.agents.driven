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
// • Motion produce un asse analogico normalizzato con deadzone.
//

export class Input {
  constructor(options = {}) {
    const {
      fireBtnEl = null,
      motionEnabled = false,
      touchShootSurfaceEl = null,
      ignoreTouchShootSelector = ""
    } = options;

    // Stato sorgenti separate (merge con OR)
    this._kb = { up: false, down: false, left: false, right: false, shoot: false };
    this._touch = { up: false, down: false, left: false, right: false };
    this._motion = { dx: 0, dy: 0, active: false };

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
      .catch(() => false);
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
    this._motion.dx = 0;
    this._motion.dy = 0;
    this._motion.active = false;
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

    const maxTilt = 24;
    const deadzone = 5;
    const normalize = (value) => {
      const magnitude = Math.abs(value);
      if (magnitude < deadzone) return 0;
      const sign = Math.sign(value);
      return sign * Math.min(1, (magnitude - deadzone) / (maxTilt - deadzone));
    };

    let dx = normalize(gamma);
    let dy = normalize(beta);
    const angle = Number(window.orientation ?? screen.orientation?.angle ?? 0);
    if (angle === 90) {
      [dx, dy] = [-dy, dx];
    } else if (angle === -90 || angle === 270) {
      [dx, dy] = [dy, -dx];
    } else if (Math.abs(angle) === 180) {
      dx *= -1;
      dy *= -1;
    }

    this._motion.dx = dx;
    this._motion.dy = dy;
    this._motion.active = dx !== 0 || dy !== 0;
    this.#mergeState();
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
