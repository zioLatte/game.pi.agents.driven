// ==========================================================
// Player.js — Gestione del personaggio principale (Pi-Chan)
// ==========================================================

import { clamp } from "../core/utils.js";
import { state } from "../core/state.js";
import { Bullet } from "./Bullet.js";
import { getSprite } from "../core/sprites.js";
import { Explosion } from "./Explosion.js";

export class Player {
  constructor(x, y, ctx, worldWidth = 960, worldHeight = 600) {
    this.x = x;
    this.y = y;
    this.r = 24;
    const baseSpeed = (typeof window !== "undefined" && window.PLAYER_BASE_SPEED)
      ? window.PLAYER_BASE_SPEED
      : 300;
    this.speed = baseSpeed;

    this.ctx = ctx;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.arena = null;

    this.spriteIdle = this.#loadSprite("./assets/pi_chan_small.png");
    this.spriteRight = this.#loadSprite("./assets/pi_chan_dx_small.png");
    this.spriteLeft = this.#loadSprite("./assets/pi_chan_sx_small.png");
    this.spriteUp = this.#loadSprite("./assets/pi_chan_up_small.png");
    this.spriteDown = this.#loadSprite("./assets/pi_chan_down_small.png");

    this.sprite = this.spriteIdle.img;
    this.spriteLoaded = false;

    this.currentDirection = "idle";
    this.facingDirection = "right";

    this.bullets = [];
    this.explosions = [];
    this.bulletMaxBounces = null;

    this.cooldown = 0;
    this.cooldownTime = 0.16;
    this.shootBuffered = false;

    this.recoilX = 0;
    this.recoilY = 0;
    this.squash = 0;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.speedBoostMultiplier = 1;
    this.speedBoostUntil = 0;
    this.speedBoostStartedAt = 0;
    this.speedBoostDurationMs = 0;
  }

  #loadSprite(path) {
    const version = window.ASSET_VERSION;
    const separator = path.includes("?") ? "&" : "?";
    const src = version ? `${path}${separator}v=${version}` : path;
    const ref = getSprite(src);
    if (ref.img.complete && ref.img.naturalWidth > 0) {
      ref.loaded = true;
      this.spriteLoaded = true;
    } else if (ref.loaded) {
      this.spriteLoaded = true;
    } else {
      ref.img.addEventListener("load", () => {
        this.spriteLoaded = true;
      }, { once: true });
    }
    return ref;
  }

  #setSprite(spriteRef) {
    if (spriteRef.loaded) this.sprite = spriteRef.img;
    else if (this.spriteIdle.loaded) this.sprite = this.spriteIdle.img;

    if (this.spriteIdle.loaded || spriteRef.loaded) {
      this.spriteLoaded = true;
    }
  }

  update(dt, input, now) {
    const frameNow = now ?? performance.now();
    this.hoverTime += dt * 4;
    this.recoilX *= Math.max(0, 1 - dt * 10);
    this.recoilY *= Math.max(0, 1 - dt * 10);
    this.squash += (0 - this.squash) * Math.min(1, dt * 10);

    let dx = 0;
    let dy = 0;
    let newDirection = "idle";

    const move = input?.getMoveVector ? input.getMoveVector() : { dx: 0, dy: 0, shootHeld: false };
    dx = move.dx || 0;
    dy = move.dy || 0;
    if (dy < 0) {
      newDirection = "up";
      this.facingDirection = "up";
    } else if (dy > 0) {
      newDirection = "down";
      this.facingDirection = "down";
    } else if (dx < 0) {
      newDirection = "left";
      this.facingDirection = "left";
    } else if (dx > 0) {
      newDirection = "right";
      this.facingDirection = "right";
    }

    if (newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      switch (newDirection) {
        case "up": this.#setSprite(this.spriteUp); break;
        case "down": this.#setSprite(this.spriteDown); break;
        case "left": this.#setSprite(this.spriteLeft); break;
        case "right": this.#setSprite(this.spriteRight); break;
        default: this.#setSprite(this.spriteIdle); break;
      }
    }

    if (dx || dy) {
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
      const movementSpeed = this.getMovementSpeed(frameNow);
      this.x += dx * movementSpeed * dt;
      this.y += dy * movementSpeed * dt;
    }

    if (this.arena) {
      const res = this.arena.constrainCircle(this.x, this.y, this.r);
      if (res.hit) {
        this.x = res.x;
        this.y = res.y;
      }
    } else {
      this.x = clamp(this.x, this.r, this.worldWidth - this.r);
      this.y = clamp(this.y, this.r, this.worldHeight - this.r);
    }

    if (input?.consumeShootPressed && input.consumeShootPressed()) {
      this.shootBuffered = true;
    }

    this.cooldown -= dt;
    const wantsShoot = Boolean(move.shootHeld) || this.shootBuffered;
    if (wantsShoot && this.cooldown <= 0) {
      this.shoot(now);
      this.cooldown = this.cooldownTime;
      this.shootBuffered = false;
    }

    for (const b of this.bullets) b.update(dt);
    this.bullets = this.bullets.filter((b) => b.alive);

    for (const e of this.explosions) e.update(dt);
    this.explosions = this.explosions.filter((e) => e.alive);
  }

  applySpeedBoost(multiplier, durationMs, now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    if (this.isSpeedBoosted(frameNow)) return false;

    const boostMultiplier = Number(multiplier);
    const boostDuration = Number(durationMs);
    if (!Number.isFinite(boostMultiplier) || boostMultiplier <= 1) return false;
    if (!Number.isFinite(boostDuration) || boostDuration <= 0) return false;

    this.speedBoostMultiplier = boostMultiplier;
    this.speedBoostStartedAt = frameNow;
    this.speedBoostDurationMs = boostDuration;
    this.speedBoostUntil = frameNow + boostDuration;
    return true;
  }

  isSpeedBoosted(now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    return frameNow < this.speedBoostUntil;
  }

  getMovementSpeed(now = performance.now()) {
    return this.speed * (this.isSpeedBoosted(now) ? this.speedBoostMultiplier : 1);
  }

  getSpeedBoostRemainingRatio(now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    if (!this.isSpeedBoosted(frameNow) || this.speedBoostDurationMs <= 0) return 0;
    const remaining = this.speedBoostUntil - frameNow;
    return Math.max(0, Math.min(1, remaining / this.speedBoostDurationMs));
  }

  shoot(now) {
    let dirX = 0;
    let dirY = 0;
    switch (this.facingDirection) {
      case "up": dirY = -1; break;
      case "down": dirY = 1; break;
      case "left": dirX = -1; break;
      case "right": dirX = 1; break;
      default: dirX = 1;
    }

    const offset = 30;
    let speedFactor = 2.2;
    if (typeof window !== "undefined") {
      const raw = Number(window.BULLET_SPEED_FACTOR);
      if (Number.isFinite(raw)) speedFactor = raw;
    }
    const bulletSpeed = this.speed * speedFactor;

    const bullet = new Bullet(
      this.x + dirX * offset,
      this.y + dirY * offset,
      dirX,
      dirY,
      this.ctx,
      this.explosions,
      this.worldWidth,
      this.worldHeight,
      bulletSpeed
    );
    bullet.arena = this.arena;
    if (typeof this.bulletMaxBounces === "number") {
      bullet.maxBounces = this.bulletMaxBounces;
      bullet.bounceCount = this.bulletMaxBounces;
    }

    state.shotsFired += 1;
    this.bullets.push(bullet);

    this.recoilX -= dirX * 7;
    this.recoilY -= dirY * 7;
    this.squash = 0.22;
    this.explosions.push(new Explosion(
      this.x + dirX * 20,
      this.y + dirY * 20,
      this.ctx,
      {
        duration: 0.08,
        maxRadius: 16,
        innerColor: [255, 255, 240],
        midColor: [255, 230, 120],
        outerColor: [255, 140, 30],
        shadowBlur: 10,
        sparkCount: 3,
        sparkLength: 8
      }
    ));

    if (typeof window !== "undefined" && window.addScreenShake) {
      window.addScreenShake(0.035);
    }

    if (window.playShotSfx) {
      window.playShotSfx();
    }

    window.lastPlayerShot = now ?? performance.now();
  }

  draw(ctxOverride, now) {
    const ctx = ctxOverride || this.ctx;
    if (!ctx) return;
    const frameNow = now ?? performance.now();
    const boosted = this.isSpeedBoosted(frameNow);
    const renderAssets = typeof window !== "undefined" ? window.PICHAN_RENDER_ASSETS : null;
    const pipelineSprite = renderAssets?.getImage?.("sprites.pichanIdle") || null;
    const boostRingSprite = renderAssets?.getImage?.("sprites.boostRing") || null;

    const spriteScale = (typeof window !== "undefined" && window.SPRITE_SCALE) ? window.SPRITE_SCALE : 1;
    const baseSize = Math.round(this.r * 3.15 * spriteScale);
    const hoverOffset = Math.sin(this.hoverTime) * 1.6;
    const squashX = 1 + this.squash * 0.35;
    const squashY = 1 - this.squash * 0.3;
    const px = Math.floor(this.x + this.recoilX) + 0.5;
    const py = Math.floor(this.y + this.recoilY + hoverOffset) + 0.5;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(squashX, squashY);
    ctx.filter = boosted ? "saturate(1.9) brightness(1.08)" : "saturate(1.5)";
    ctx.shadowColor = boosted ? "rgba(90, 235, 255, 0.85)" : "rgba(255, 240, 180, 0.7)";
    ctx.shadowBlur = boosted ? 18 : 10;

    if (boosted) {
      const pulse = 0.5 + 0.5 * Math.sin(frameNow / 90);
      const remainingRatio = this.getSpeedBoostRemainingRatio(frameNow);
      const ringRadius = this.r * 1.28 + pulse * 2;
      ctx.save();
      if (boostRingSprite) {
        const ringSize = ringRadius * 2.35;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(boostRingSprite, -ringSize * 0.5, -ringSize * 0.5, ringSize, ringSize);
        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = "rgba(255, 235, 85, 0.96)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          ringRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * remainingRatio
        );
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = "rgba(255, 247, 180, 0.78)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = "rgba(255, 235, 85, 0.96)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          ringRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * remainingRatio
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    const sprite = pipelineSprite || (this.sprite && this.sprite.complete ? this.sprite : null);
    if (sprite) {
      ctx.drawImage(sprite, -baseSize / 2, -baseSize / 2, baseSize, baseSize);
    } else {
      ctx.fillStyle = "#f4df7c";
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.fillRect(-this.r * 0.38, -this.r * 0.2, this.r * 0.24, this.r * 0.18);
      ctx.fillRect(this.r * 0.14, -this.r * 0.2, this.r * 0.24, this.r * 0.18);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 3;
      ctx.strokeRect(-this.r * 0.62, -this.r * 0.64, this.r * 1.24, this.r * 1.24);
    }

    ctx.restore();

    this.bullets.forEach((b) => b.draw());
    this.explosions.forEach((e) => e.draw());
  }
}
