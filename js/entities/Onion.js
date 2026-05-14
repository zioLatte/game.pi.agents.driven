// ==========================================================
// Onion.js — Gestione nemico “Onion” (AI, movimento, morte)
// ==========================================================

import { updateOnionAI, getOnionColor, registerOnion, ONION_STATE } from "../ai/OnionAI.js";
import { getSprite } from "../core/sprites.js";
import { Explosion } from "./Explosion.js";

export class Onion {
  constructor(x, y, ctx, worldWidth = 960, worldHeight = 600, allOnions = [], playerRef = null) {
    this.x = x;
    this.y = y;
    this.r = 28;

    this.ctx = ctx;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.allOnions = allOnions;
    this.player = playerRef;

    this.baseSpeed = 100;
    this.speedScale = 1;
    this.speed = this.baseSpeed;

    this.alive = true;
    this.fade = 1.0;
    this.dying = false;
    this.fadeTimer = 0;
    this.fadeDuration = 0.4;
    this.knockbackX = 0;
    this.knockbackY = 0;

    this.state = ONION_STATE.RANDOM_MOVE;
    this.color = "#ff6347";

    this.spriteIdle = this.#loadSprite("./assets/onion.small.png");
    this.spriteRight = this.#loadSprite("./assets/onion_dx.small.png");
    this.spriteLeft = this.#loadSprite("./assets/onion_sx.small.png");
    this.spriteUp = this.#loadSprite("./assets/onion_up.small.png");
    this.spriteDown = this.#loadSprite("./assets/onion_down.small.png");
    this.spriteRightChase = this.#loadSprite("./assets/onion_dx.small_chase.png");
    this.spriteLeftChase = this.#loadSprite("./assets/onion_sx.small_chase.png");
    this.spriteUpChase = this.#loadSprite("./assets/onion_up.small_chase.png");
    this.spriteDownChase = this.#loadSprite("./assets/onion_down.small_chase.png");

    this.sprite = this.spriteIdle.img;
    this.spriteReady = false;
    this.drawScale = 1;
    this.targetScale = 1;
    this.visualAngle = 0;
    this.wigglePhase = Math.random() * Math.PI * 2;
    this.spawnTimer = 0;
    this.reactionCooldown = 0;
    this.dodgeEnabled = false;
    this.surgeOffset = Math.random() * Math.PI * 2;
    this.frameNow = 0;
    this.speedBoostMultiplier = 1;
    this.speedBoostUntil = 0;
    this.speedBoostStartedAt = 0;
    this.speedBoostDurationMs = 0;
    this.speedDotTarget = null;

    const dirs = ["up", "down", "left", "right"];
    this.currentDirection = dirs[Math.floor(Math.random() * dirs.length)];
    this.#setVelocityFromDirection();
    this.changeDirTimer = 1.6 + Math.random() * 2.2;

    this.arena = null;
    this.chaseSpeedScale = 1;
    this.chaseStartTime = 0;

    registerOnion(this);
  }

  #loadSprite(path) {
    const version = window.ASSET_VERSION;
    const separator = path.includes("?") ? "&" : "?";
    const src = version ? `${path}${separator}v=${version}` : path;
    const ref = getSprite(src);
    if (ref.img.complete && ref.img.naturalWidth > 0) {
      ref.loaded = true;
      this.spriteReady = true;
    } else if (ref.loaded) {
      this.spriteReady = true;
    } else {
      ref.img.addEventListener("load", () => {
        this.spriteReady = true;
      }, { once: true });
    }
    return ref;
  }

  #setVelocityFromDirection(now = this.frameNow) {
    const inChase = this.state === ONION_STATE.CHASE_PICHAN;
    const movementSpeed = this.#getMovementSpeed(now);
    switch (this.currentDirection) {
      case "up":
        this.vx = 0; this.vy = -movementSpeed;
        if (inChase && this.spriteUpChase.loaded) this.sprite = this.spriteUpChase.img;
        else if (this.spriteUp.loaded) this.sprite = this.spriteUp.img;
        break;
      case "down":
        this.vx = 0; this.vy = movementSpeed;
        if (inChase && this.spriteDownChase.loaded) this.sprite = this.spriteDownChase.img;
        else if (this.spriteDown.loaded) this.sprite = this.spriteDown.img;
        break;
      case "left":
        this.vx = -movementSpeed; this.vy = 0;
        if (inChase && this.spriteLeftChase.loaded) this.sprite = this.spriteLeftChase.img;
        else if (this.spriteLeft.loaded) this.sprite = this.spriteLeft.img;
        break;
      case "right":
        this.vx = movementSpeed; this.vy = 0;
        if (inChase && this.spriteRightChase.loaded) this.sprite = this.spriteRightChase.img;
        else if (this.spriteRight.loaded) this.sprite = this.spriteRight.img;
        break;
      default:
        this.vx = 0; this.vy = 0;
        if (this.spriteIdle.loaded) this.sprite = this.spriteIdle.img;
        break;
    }
  }

  #maybeDodgeBullets(dt) {
    if (!this.dodgeEnabled || !this.player?.bullets?.length || this.state === ONION_STATE.CHASE_PICHAN || this.reactionCooldown > 0) return;

    let threat = null;
    let bestTimeToImpact = 0.24;

    for (const bullet of this.player.bullets) {
      if (!bullet.alive) continue;

      const toOnionX = this.x - bullet.x;
      const toOnionY = this.y - bullet.y;
      const bulletSpeedSq = bullet.vx * bullet.vx + bullet.vy * bullet.vy;
      if (bulletSpeedSq <= 0.0001) continue;

      const approach = bullet.vx * toOnionX + bullet.vy * toOnionY;
      if (approach <= 0) continue;

      const bulletSpeed = Math.sqrt(bulletSpeedSq);
      const lateralDist = Math.abs((-bullet.vy * toOnionX + bullet.vx * toOnionY) / bulletSpeed);
      const safeLane = this.r + (bullet.r || 0) + 18;
      if (lateralDist > safeLane) continue;

      const timeToImpact = approach / bulletSpeedSq;
      if (timeToImpact >= bestTimeToImpact) continue;

      const side = ((-bullet.vy * toOnionX) + (bullet.vx * toOnionY)) >= 0 ? 1 : -1;
      threat = { bullet, side };
      bestTimeToImpact = timeToImpact;
    }

    if (!threat) return;

    const dodgeX = -threat.bullet.vy * threat.side;
    const dodgeY = threat.bullet.vx * threat.side;

    if (Math.abs(dodgeX) > Math.abs(dodgeY)) {
      this.currentDirection = dodgeX > 0 ? 'right' : 'left';
    } else {
      this.currentDirection = dodgeY > 0 ? 'down' : 'up';
    }

    this.targetScale = Math.max(this.targetScale, 1.06);
    this.changeDirTimer = 0.22 + Math.random() * 0.12;
    this.reactionCooldown = 0.42;
    this.#setVelocityFromDirection();
  }

  startDeathFade() {
    if (this.dying) return;
    this.clearSpeedDotTarget();
    this.dying = true;
    this.fadeTimer = 0;
    this.vx = 0;
    this.vy = 0;
    if (Array.isArray(this.player?.explosions)) {
      this.player.explosions.push(new Explosion(this.x, this.y, this.ctx, {
        duration: 0.22,
        maxRadius: 34,
        innerColor: [255, 245, 215],
        midColor: [255, 120, 100],
        outerColor: [220, 40, 60],
        shadowColor: 'rgba(255, 120, 80, 0.85)',
        shadowBlur: 16,
        sparkCount: 7,
        sparkLength: 16
      }));
    }
  }

  update(dt, now) {
    if (!this.alive) return;
    const frameNow = now ?? performance.now();
    this.frameNow = frameNow;
    this.spawnTimer += dt;
    this.wigglePhase += dt * (this.state === ONION_STATE.CHASE_PICHAN ? 10 : 4.5);
    this.reactionCooldown = Math.max(0, this.reactionCooldown - dt);

    if (this.dying) {
      this.clearSpeedDotTarget();
      this.x += this.knockbackX * dt;
      this.y += this.knockbackY * dt;
      this.knockbackX *= 0.85;
      this.knockbackY *= 0.85;
      this.visualAngle += dt * 10;
      this.fadeTimer += dt;
      this.fade = 1 - (this.fadeTimer / this.fadeDuration);
      this.drawScale += (0.7 - this.drawScale) * Math.min(1, dt * 8);

      if (this.fade <= 0) {
        this.fade = 0;
        this.alive = false;
      }

      return;
    }

    updateOnionAI(this, frameNow, window.isShooting || false, window.lastPlayerShot || 0);
    if (this.speedDotTarget && !this.canTargetSpeedDot(frameNow)) {
      this.clearSpeedDotTarget();
    }

    this.#maybeDodgeBullets(dt);

    if (this.state !== ONION_STATE.CHASE_PICHAN) {
      this.#setVelocityFromDirection(frameNow);
    }

    if (this.state === ONION_STATE.RANDOM_MOVE || this.state === ONION_STATE.COOLDOWN) {
      const spawnPunch = Math.max(0, 1 - this.spawnTimer * 3.5) * 0.14;
      const idlePulse = Math.sin(this.wigglePhase) * 0.025;
      this.targetScale = 1 + spawnPunch + idlePulse;
      if (!this.#moveToSpeedDot(dt, frameNow)) {
        this.#randomMove(dt);
      }
    } else if (this.state === ONION_STATE.CHASE_PICHAN) {
      const elapsed = (frameNow - (this.chaseStartTime || 0)) / 1000;
      const growDuration = 0.32;
      const shrinkDuration = 0.58;
      if (elapsed < growDuration) {
        const t = Math.min(1, Math.max(0, elapsed / growDuration));
        const easeOut = 1 - (1 - t) * (1 - t);
        this.targetScale = 1 + 1.05 * easeOut;
        this.vx = 0;
        this.vy = 0;
        return;
      }
      const shrinkT = Math.min(1, Math.max(0, (elapsed - growDuration) / shrinkDuration));
      const easeIn = shrinkT * shrinkT;
      this.targetScale = 2.05 - 0.72 * easeIn + Math.sin(this.wigglePhase * 1.4) * 0.03;
      const playerSpeed = this.player?.speed ?? this.baseSpeed;
      const surge = 1 + Math.sin(frameNow / 120 + this.surgeOffset) * 0.09;
      this.speed = playerSpeed * (this.chaseSpeedScale || 1) * surge;
      if (!this.#moveToSpeedDot(dt, frameNow)) {
        this.#chase(dt, frameNow);
      }
    }

    this.color = getOnionColor(this, frameNow);

    const desiredAngle = Math.atan2(this.vy || 0, this.vx || 0) * 0.08;
    this.visualAngle += (desiredAngle - this.visualAngle) * Math.min(1, dt * 8);

    const scaleLerp = Math.min(1, dt * 8);
    this.drawScale += (this.targetScale - this.drawScale) * scaleLerp;
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

  getSpeedBoostRemainingRatio(now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    if (!this.isSpeedBoosted(frameNow) || this.speedBoostDurationMs <= 0) return 0;
    const remaining = this.speedBoostUntil - frameNow;
    return Math.max(0, Math.min(1, remaining / this.speedBoostDurationMs));
  }

  canTargetSpeedDot(now = performance.now(), dot = this.speedDotTarget) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    if (!this.alive || this.dying || this.isSpeedBoosted(frameNow)) return false;
    if (this.state !== ONION_STATE.CHASE_PICHAN) return true;
    if (!dot || !this.player) return false;

    const dotDistance = Math.hypot(dot.x - this.x, dot.y - this.y);
    const playerDistance = Math.hypot(this.player.x - this.x, this.player.y - this.y);
    const usefulDistance = Math.max(0, Number(dot.chaseOpportunityDistance) || 0);
    const immediatePlayerDistance = Math.max(0, Number(dot.chaseImmediatePlayerDistance) || 0);
    const advantageRatio = Math.max(0, Number(dot.chaseDotAdvantageRatio) || 0.75);

    return dotDistance <= usefulDistance
      && playerDistance > immediatePlayerDistance
      && dotDistance < playerDistance * advantageRatio;
  }

  setSpeedDotTarget(dot) {
    if (!dot || !this.canTargetSpeedDot(this.frameNow, dot)) {
      this.clearSpeedDotTarget();
      return;
    }
    this.speedDotTarget = {
      x: dot.x,
      y: dot.y,
      r: dot.r,
      chaseOpportunityDistance: dot.chaseOpportunityDistance,
      chaseImmediatePlayerDistance: dot.chaseImmediatePlayerDistance,
      chaseDotAdvantageRatio: dot.chaseDotAdvantageRatio
    };
  }

  clearSpeedDotTarget() {
    this.speedDotTarget = null;
  }

  #randomMove(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.arena) {
      this.#applyArenaConstraint(true);
    } else {
      if (this.x < this.r) {
        this.x = this.r;
        this.currentDirection = "right";
        this.#setVelocityFromDirection();
      } else if (this.x > this.worldWidth - this.r) {
        this.x = this.worldWidth - this.r;
        this.currentDirection = "left";
        this.#setVelocityFromDirection();
      }

      if (this.y < this.r) {
        this.y = this.r;
        this.currentDirection = "down";
        this.#setVelocityFromDirection();
      } else if (this.y > this.worldHeight - this.r) {
        this.y = this.worldHeight - this.r;
        this.currentDirection = "up";
        this.#setVelocityFromDirection();
      }
    }

    this.changeDirTimer -= dt;
    if (this.changeDirTimer <= 0) {
      this.changeDirTimer = 1.2 + Math.random() * 2.1;
      const dirs = ["up", "down", "left", "right"];
      this.currentDirection = dirs[Math.floor(Math.random() * dirs.length)];
      this.#setVelocityFromDirection();
    }
  }

  #getMovementSpeed(now = this.frameNow) {
    return this.speed * (this.isSpeedBoosted(now) ? this.speedBoostMultiplier : 1);
  }

  #moveToSpeedDot(dt, now) {
    const target = this.speedDotTarget;
    if (!target || !this.canTargetSpeedDot(now, target)) return false;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      this.vx = 0;
      this.vy = 0;
      return true;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      this.currentDirection = dx > 0 ? "right" : "left";
    } else {
      this.currentDirection = dy > 0 ? "down" : "up";
    }

    this.changeDirTimer = Math.max(this.changeDirTimer, 0.2);
    this.#setVelocityFromDirection(now);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.arena) {
      this.#applyArenaConstraint(false);
    } else {
      this.x = Math.max(this.r, Math.min(this.worldWidth - this.r, this.x));
      this.y = Math.max(this.r, Math.min(this.worldHeight - this.r, this.y));
    }

    return true;
  }

  #chase(dt, now) {
    if (!this.player) return;

    if (this.chaseUntil && now > this.chaseUntil) {
      this.state = ONION_STATE.COOLDOWN;
      this.color = "#ffa500";
      this.cooldownUntil = now + 1800;
      this.speed = this.baseSpeed;
      return;
    }

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.currentDirection = dx > 0 ? "right" : "left";
    } else {
      this.currentDirection = dy > 0 ? "down" : "up";
    }

    this.#setVelocityFromDirection();

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.arena) {
      this.#applyArenaConstraint(false);
    } else {
      this.x = Math.max(this.r, Math.min(this.worldWidth - this.r, this.x));
      this.y = Math.max(this.r, Math.min(this.worldHeight - this.r, this.y));
    }
  }

  #applyArenaConstraint(updateDirection) {
    const res = this.arena.constrainCircle(this.x, this.y, this.r);
    if (!res.hit) return;

    this.x = res.x;
    this.y = res.y;

    if (!updateDirection) return;

    if (Math.abs(res.normalX) > Math.abs(res.normalY)) {
      this.currentDirection = res.normalX > 0 ? "right" : "left";
    } else {
      this.currentDirection = res.normalY > 0 ? "down" : "up";
    }
    this.#setVelocityFromDirection();
  }

  draw(ctx, now) {
    if (!ctx) return;

    const frameNow = now ?? performance.now();
    const renderAssets = typeof window !== "undefined" ? window.PICHAN_RENDER_ASSETS : null;
    const pipelineSprite = renderAssets?.getImage?.("sprites.onionIdle") || null;
    const boostRingSprite = renderAssets?.getImage?.("sprites.boostRing") || null;
    ctx.save();
    const inChase = this.state === ONION_STATE.CHASE_PICHAN;
    const boosted = this.isSpeedBoosted(frameNow);
    const chaseBoost = this.chaseSpeedScale ?? 1;
    let saturation = 1;
    if (inChase && chaseBoost > 1) {
      saturation = 1.8;
    } else if (boosted) {
      saturation = 1.45;
    }
    ctx.filter = `saturate(${saturation})`;
    let alpha = this.fade;
    ctx.globalAlpha = alpha;

    const spriteScale = (typeof window !== "undefined" && window.SPRITE_SCALE) ? window.SPRITE_SCALE : 1;
    const size = Math.round(this.r * 2.34 * this.drawScale * spriteScale);
    const wobble = Math.sin(this.wigglePhase) * 1.1;

    ctx.translate(this.x, this.y + wobble);
    ctx.rotate(this.visualAngle + Math.sin(this.wigglePhase * 0.65) * 0.03);

    const glowAlpha = inChase ? 0.65 : 0.24;
    ctx.shadowColor = boosted ? "rgba(95, 235, 255, 0.72)" : (inChase ? 'rgba(255, 95, 95, 0.65)' : 'rgba(255, 170, 90, 0.28)');
    ctx.shadowBlur = boosted ? 14 : (inChase ? 10 : 5);

    const sprite = pipelineSprite || (this.sprite && this.sprite.complete ? this.sprite : null);
    if (sprite) {
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = inChase ? "#bf2d35" : "#a84d31";
      ctx.beginPath();
      ctx.arc(0, 2, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = inChase ? "#ff8075" : "#d9834c";
      ctx.beginPath();
      ctx.arc(-size * 0.08, -size * 0.05, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6eac54";
      ctx.fillRect(-2, -size * 0.47, 4, size * 0.2);
      ctx.strokeStyle = "#2b1a12";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 2, size * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (boosted) {
      const pulse = 0.5 + 0.5 * Math.sin(frameNow / 90 + this.surgeOffset);
      const remainingRatio = this.getSpeedBoostRemainingRatio(frameNow);
      const ringRadius = this.r * 1.18 + pulse * 2;
      if (boostRingSprite) {
        const ringSize = ringRadius * 2.35;
        ctx.globalAlpha = alpha * 0.74;
        ctx.drawImage(boostRingSprite, -ringSize * 0.5, -ringSize * 0.5, ringSize, ringSize);
      } else {
        ctx.globalAlpha = alpha * 0.18;
        ctx.strokeStyle = "rgba(255, 247, 180, 0.75)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha * 0.78;
      ctx.strokeStyle = "rgba(255, 235, 85, 0.95)";
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

    ctx.globalAlpha = alpha * glowAlpha * 0.65;
    ctx.fillStyle = inChase ? 'rgba(255, 110, 110, 0.7)' : 'rgba(255, 214, 128, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.42, size * 0.24, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
