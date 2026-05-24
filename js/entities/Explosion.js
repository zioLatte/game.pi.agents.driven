// ==========================================================
// Explosion.js — Effetto grafico di esplosione radiale
// ==========================================================

export class Explosion {
  constructor(x, y, ctx, options = {}) {
    this.x = x;
    this.y = y;
    this.ctx = ctx;

    this.age = 0;
    this.duration = Number.isFinite(options.duration) ? options.duration : 0.35;
    this.maxRadius = Number.isFinite(options.maxRadius) ? options.maxRadius : 60;
    this.alive = true;

    this.innerColor = options.innerColor || [255, 255, 220];
    this.midColor = options.midColor || [255, 210, 110];
    this.outerColor = options.outerColor || [255, 120, 30];
    const perfOptions = typeof window !== "undefined" ? window.PICHAN_PERF_OPTIONS : null;
    this.shadowColor = options.shadowColor || 'rgba(255,220,150,0.65)';
    const requestedShadowBlur = Number.isFinite(options.shadowBlur) ? options.shadowBlur : 20;
    this.shadowBlur = perfOptions?.explosionShadowBlur === false ? 0 : requestedShadowBlur;
    this.ring = options.ring !== false;
    const requestedSparkCount = Number.isFinite(options.sparkCount) ? options.sparkCount : 6;
    const sparkScale = Number.isFinite(perfOptions?.explosionSparkScale)
      ? perfOptions.explosionSparkScale
      : 1;
    this.sparkCount = Math.max(0, Math.round(requestedSparkCount * sparkScale));
    this.sparkLength = Number.isFinite(options.sparkLength) ? options.sparkLength : Math.max(8, this.maxRadius * 0.35);
    this.seed = Number.isFinite(options.seed) ? options.seed : Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.duration) {
      this.alive = false;
    }
  }

  draw() {
    if (!this.alive || !this.ctx) return;

    const ctx = this.ctx;
    const t = Math.min(1, this.age / this.duration);
    const easeOut = 1 - (1 - t) * (1 - t);
    const r = this.maxRadius * easeOut;
    const alpha = 1 - t;

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, Math.max(1, r));
    gradient.addColorStop(0, `rgba(${this.innerColor.join(',')},${alpha * 0.75})`);
    gradient.addColorStop(0.35, `rgba(${this.midColor.join(',')},${alpha * 0.45})`);
    gradient.addColorStop(0.75, `rgba(${this.outerColor.join(',')},${alpha * 0.18})`);
    gradient.addColorStop(1, `rgba(${this.outerColor.join(',')},0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    if (this.ring) {
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = Math.max(1.5, (1 - t) * 4);
      ctx.strokeStyle = `rgba(${this.midColor.join(',')},${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(1, r * 0.8), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.sparkCount > 0) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      for (let i = 0; i < this.sparkCount; i += 1) {
        const angle = this.seed + (Math.PI * 2 * i) / this.sparkCount + t * 0.5;
        const inner = r * 0.2;
        const outer = inner + this.sparkLength * (1 - t * 0.6);
        ctx.strokeStyle = `rgba(${this.innerColor.join(',')},${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(angle) * inner, this.y + Math.sin(angle) * inner);
        ctx.lineTo(this.x + Math.cos(angle) * outer, this.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
