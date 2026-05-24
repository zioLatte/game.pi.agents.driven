// ==========================================================
// Input.js — Gestione input tastiera + touch per PI.Onion
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Tastiera: WASD + frecce + spazio
// • Touch: joystick top-down (solo direzione) + bottone SPARA
// • Motion: tilt dispositivo su smartphone
//
// CONTRATTO PUBBLICO
// ----------------------------------------------------------
// • input.getMoveVector() -> { dx, dy, shootHeld }
// • input.consumeShootPressed() -> boolean (tap mobile, edge)
//
// NOTE
// ----------------------------------------------------------
// • Touch joystick replica semanticamente le frecce: niente diagonali.
// • Distanza dal centro NON conta: serve solo l'angolo.
// • SPARA su mobile è solo tap (shootPressed), nessun autofire.
// • Motion produce un asse analogico normalizzato con deadzone.
//

export class Input {
  constructor(options = {}) {
    const {
      joystickEl = null,
      joystickKnobEl = null,
      fireBtnEl = null,
      upBtnEl = null,
      downBtnEl = null,
      leftBtnEl = null,
      rightBtnEl = null,
      motionEnabled = false,
      touchShootSurfaceEl = null,
      ignoreTouchShootSelector = ""
    } = options;

    // Stato sorgenti separate (merge con OR)
    this._kb = { up: false, down: false, left: false, right: false, shoot: false };
    this._touch = { up: false, down: false, left: false, right: false };
    this._motion = { dx: 0, dy: 0, active: false };

    // Touch internals
    this._joystickEl = joystickEl;
    this._joystickKnobEl = joystickKnobEl;
    this._fireBtnEl = fireBtnEl;
    this._upBtnEl = upBtnEl;
    this._downBtnEl = downBtnEl;
    this._leftBtnEl = leftBtnEl;
    this._rightBtnEl = rightBtnEl;
    this._motionEnabled = Boolean(motionEnabled);
    this._touchShootSurfaceEl = touchShootSurfaceEl;
    this._ignoreTouchShootSelector = ignoreTouchShootSelector;
    this._joystickPointerId = null;
    this._firePointerId = null;
    this._touchShootPointerIds = new Set();
    this._shootTapQueued = false;
    this._shootPressedFrame = false;
    this._moveVector = { dx: 0, dy: 0, shootHeld: false };

    // Tastiera
    window.addEventListener("keydown", (e) => this.#onKeyDown(e));
    window.addEventListener("keyup", (e) => this.#onKeyUp(e));

    // Touch (Pointer Events)
    this.#bindTouch();
    this.#bindDpad();
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
    if (!this._joystickEl && !this._fireBtnEl) return;

    // Joystick area
    if (this._joystickEl) {
      this._joystickEl.addEventListener("pointerdown", (e) => this.#onJoyDown(e));
      this._joystickEl.addEventListener("pointermove", (e) => this.#onJoyMove(e));
      this._joystickEl.addEventListener("pointerup", (e) => this.#onJoyUp(e));
      this._joystickEl.addEventListener("pointercancel", (e) => this.#onJoyUp(e));
      this._joystickEl.addEventListener("lostpointercapture", (e) => this.#onJoyUp(e));
    }

    // Fire button
    if (this._fireBtnEl) {
      this._fireBtnEl.addEventListener("pointerdown", (e) => this.#onFireDown(e));
      this._fireBtnEl.addEventListener("pointerup", (e) => this.#onFireUp(e));
      this._fireBtnEl.addEventListener("pointercancel", (e) => this.#onFireUp(e));
      this._fireBtnEl.addEventListener("lostpointercapture", (e) => this.#onFireUp(e));
    }
  }

  #bindDpad() {
    const bindBtn = (el, dirKey) => {
      if (!el) return;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._touch.up = false;
        this._touch.down = false;
        this._touch.left = false;
        this._touch.right = false;
        this._touch[dirKey] = true;
        el.classList.add("is-active");
        this.#mergeState();
      });
      const clear = (e) => {
        e.preventDefault();
        this._touch[dirKey] = false;
        el.classList.remove("is-active");
        this.#mergeState();
      };
      el.addEventListener("pointerup", clear);
      el.addEventListener("pointercancel", clear);
      el.addEventListener("lostpointercapture", clear);
      el.addEventListener("pointerleave", clear);
    };

    bindBtn(this._upBtnEl, "up");
    bindBtn(this._downBtnEl, "down");
    bindBtn(this._leftBtnEl, "left");
    bindBtn(this._rightBtnEl, "right");
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

    const onMotion = (event) => this.#onDeviceOrientation(event);
    const requestPermission = () => {
      const request = window.DeviceOrientationEvent?.requestPermission;
      if (typeof request !== "function") return;
      request.call(window.DeviceOrientationEvent)
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("deviceorientation", onMotion);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("deviceorientation", onMotion);
    window.addEventListener("pointerdown", requestPermission, { once: true, passive: true });
  }

  #onJoyDown(e) {
    // Solo 1 dito sul joystick
    if (this._joystickPointerId != null) return;
    this._joystickPointerId = e.pointerId;
    try { this._joystickEl.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
    this.#setTouchDirectionFromEvent(e);
  }

  #onJoyMove(e) {
    if (this._joystickPointerId !== e.pointerId) return;
    e.preventDefault();
    this.#setTouchDirectionFromEvent(e);
  }

  #onJoyUp(e) {
    if (this._joystickPointerId !== e.pointerId) return;
    e.preventDefault();
    this._joystickPointerId = null;
    this._touch.up = this._touch.down = this._touch.left = this._touch.right = false;
    this.#updateJoystickKnob(null);
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

  #setTouchDirectionFromEvent(e) {
    if (!this._joystickEl) return;
    const rect = this._joystickEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Se praticamente al centro, non muovere
    if (Math.hypot(dx, dy) < 6) {
      this._touch.up = this._touch.down = this._touch.left = this._touch.right = false;
      this.#updateJoystickKnob(null);
      this.#mergeState();
      return;
    }

    const angle = Math.atan2(dy, dx); // y positivo = down
    const deg = (angle * 180) / Math.PI;

    // Mappa su 4 direzioni (replica frecce)
    this._touch.up = this._touch.down = this._touch.left = this._touch.right = false;
    let dirX = 0;
    let dirY = 0;
    if (deg >= -45 && deg < 45) {
      this._touch.right = true;
      dirX = 1;
    } else if (deg >= 45 && deg < 135) {
      this._touch.down = true;
      dirY = 1;
    } else if (deg >= 135 || deg < -135) {
      this._touch.left = true;
      dirX = -1;
    } else {
      this._touch.up = true;
      dirY = -1;
    }

    // Visual knob: snap su 4 direzioni
    this.#updateJoystickKnob({
      dx: dirX,
      dy: dirY,
      radius: Math.min(rect.width, rect.height) / 2
    });
    this.#mergeState();
  }

  #updateJoystickKnob(payload) {
    if (!this._joystickKnobEl) return;
    if (!payload) {
      this._joystickKnobEl.style.transform = "translate(-50%, -50%)";
      this._joystickKnobEl.classList.remove("is-active");
      return;
    }
    const { dx, dy, radius } = payload;
    const max = Math.max(1, radius - 10);
    const m = Math.hypot(dx, dy) || 1;
    const clampedX = (dx / m) * Math.min(max, max);
    const clampedY = (dy / m) * Math.min(max, max);
    this._joystickKnobEl.classList.add("is-active");
    this._joystickKnobEl.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
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
