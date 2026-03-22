// ==========================================================
// Input.js — Gestione input tastiera + touch per PI.Onion
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Tastiera: WASD + frecce + spazio
// • Touch: joystick top-down (solo direzione) + bottone SPARA
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
      rightBtnEl = null
    } = options;

    // Stato sorgenti separate (merge con OR)
    this._kb = { up: false, down: false, left: false, right: false, shoot: false };
    this._touch = { up: false, down: false, left: false, right: false };

    // Touch internals
    this._joystickEl = joystickEl;
    this._joystickKnobEl = joystickKnobEl;
    this._fireBtnEl = fireBtnEl;
    this._upBtnEl = upBtnEl;
    this._downBtnEl = downBtnEl;
    this._leftBtnEl = leftBtnEl;
    this._rightBtnEl = rightBtnEl;
    this._joystickPointerId = null;
    this._firePointerId = null;
    this._shootTapQueued = false;
    this._shootPressedFrame = false;
    this._moveVector = { dx: 0, dy: 0, shootHeld: false };

    // Tastiera
    window.addEventListener("keydown", (e) => this.#onKeyDown(e));
    window.addEventListener("keyup", (e) => this.#onKeyUp(e));

    // Touch (Pointer Events)
    this.#bindTouch();
    this.#bindDpad();
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
    if (up) { dy = -1; }
    else if (down) { dy = 1; }
    else if (left) { dx = -1; }
    else if (right) { dx = 1; }

    this._moveVector = { dx, dy, shootHeld: this._kb.shoot };
  }
}
