// ==========================================================
// Bullet.js — Gestione proiettile di Pi-Chan
// ==========================================================

import { Explosion } from "./Explosion.js";

export class Bullet {
  constructor(x, y, dirX, dirY, ctx, explosionArray, worldWidth = 960, worldHeight = 600, baseSpeedOverride = null) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;

    const m = Math.hypot(dirX, dirY) || 1;
    const baseSpeed = Number.isFinite(baseSpeedOverride)
      ? baseSpeedOverride
      : ((typeof window !== "undefined" && window.BULLET_BASE_SPEED) ? window.BULLET_BASE_SPEED : 900);
    this.vx = (dirX / m) * baseSpeed;
    this.vy = (dirY / m) * baseSpeed;

    this.ctx = ctx;
    this.r = 4;
    this.color = "#ffeeaa";
    this.explosions = explosionArray;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.arena = null;
    this.fadeOut = false;
    this.fade = 1.0;
    this.maxBounces = 3;
    this.bounceCount = this.maxBounces;
    this.alive = true;
    this.life = 0;
    this.trail = [];
    this.maxTrail = 6;
  }

  onBounce() {
    this.bounceCount--;

    if (Array.isArray(this.explosions)) {
      this.explosions.push(new Explosion(this.x, this.y, this.ctx, {
        duration: 0.1,
        maxRadius: 14,
        innerColor: [255, 255, 240],
        midColor: [255, 220, 120],
        outerColor: [255, 150, 40],
        shadowBlur: 8,
        sparkCount: 3,
        sparkLength: 7
      }));
    }

    if (this.bounceCount <= 0) {
      this.startFadeOut();
    }

    if (window.playBounceSfx) {
      window.playBounceSfx();
    }
  }

  startFadeOut() {
    if (this.fadeOut) return;
    this.fadeOut = true;
  }

  die() {
    this.startFadeOut();
  }

  update(dt) {
    this.life += dt;
    this.prevX = this.x;
    this.prevY = this.y;

    const perfOptions = typeof window !== "undefined" ? window.PICHAN_PERF_OPTIONS : null;
    if (perfOptions?.bulletTrail === false) {
      this.trail.length = 0;
    } else {
      this.trail.unshift({ x: this.x, y: this.y, fade: this.fade, life: this.life });
      if (this.trail.length > this.maxTrail) {
        this.trail.length = this.maxTrail;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let bounced = false;
    if (this.arena) {
      const res = this.arena.constrainCircle(this.x, this.y, this.r);
      if (res.hit) {
        this.x = res.x;
        this.y = res.y;
        const dot = this.vx * res.normalX + this.vy * res.normalY;
        if (dot < 0) {
          this.vx -= 2 * dot * res.normalX;
          this.vy -= 2 * dot * res.normalY;
          bounced = true;
        }
      }
    } else {
      if (this.x - this.r < 0) {
        this.x = this.r;
        this.vx = Math.abs(this.vx);
        bounced = true;
      } else if (this.x + this.r > this.worldWidth) {
        this.x = this.worldWidth - this.r;
        this.vx = -Math.abs(this.vx);
        bounced = true;
      }

      if (this.y - this.r < 0) {
        this.y = this.r;
        this.vy = Math.abs(this.vy);
        bounced = true;
      } else if (this.y + this.r > this.worldHeight) {
        this.y = this.worldHeight - this.r;
        this.vy = -Math.abs(this.vy);
        bounced = true;
      }
    }

    if (bounced && this.onBounce) {
      this.onBounce();
    }

    if (this.fadeOut) {
      this.fade -= dt * 4;
      if (this.fade <= 0) {
        this.fade = 0;
        this.alive = false;
      }
    }
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    const perfOptions = typeof window !== "undefined" ? window.PICHAN_PERF_OPTIONS : null;
    if (perfOptions?.bulletTrail !== false) {
      for (let i = this.trail.length - 1; i >= 0; i -= 1) {
        const point = this.trail[i];
        const t = 1 - (i / Math.max(1, this.trail.length));
        const alpha = this.fade * t * 0.18;
        const radius = Math.max(1.2, this.r * (0.4 + t * 0.7));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffd36a';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = this.fade;
    ctx.shadowColor = 'rgba(255, 230, 160, 0.95)';
    ctx.shadowBlur = perfOptions?.bulletShadowBlur === false ? 0 : 14;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r + 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = this.fade * 0.9;
    ctx.fillStyle = '#fffef0';
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1.6, this.r * 0.55), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
