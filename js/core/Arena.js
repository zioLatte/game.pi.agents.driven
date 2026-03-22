// ==========================================================
// Arena.js — Gestione forma arena, rotazione e vincoli di bordo
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Definire la forma dell'arena (poligoni convessi).
// • Fornire un metodo per contenere cerchi all'interno.
// • Supportare shape statiche e shape in rotazione.
// • Esporre la forma corrente per debug o usi futuri.
//
// ==========================================================

export class Arena {
  constructor(width, height, shape = "rect", paddingX = 0, paddingY = 20, options = {}) {
    this.width = width;
    this.height = height;
    this.cx = width / 2;
    this.cy = height / 2;
    this.paddingX = paddingX;
    this.paddingY = paddingY;
    this.shape = null;
    this.basePoints = [];
    this.points = [];
    this.normals = [];
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.setShape(shape, options);
  }

  setShape(shape, options = {}) {
    this.shape = shape;
    if (Number.isFinite(options.rotation)) {
      this.rotation = options.rotation;
    }
    if (Number.isFinite(options.rotationSpeed)) {
      this.rotationSpeed = options.rotationSpeed;
    }
    this.basePoints = this.#buildPolygon(shape);
    this.#rebuildGeometry();
  }

  setMotion({ rotation = this.rotation, rotationSpeed = this.rotationSpeed } = {}) {
    if (Number.isFinite(rotation)) this.rotation = rotation;
    if (Number.isFinite(rotationSpeed)) this.rotationSpeed = rotationSpeed;
    this.#rebuildGeometry();
  }

  update(dt) {
    if (!Number.isFinite(this.rotationSpeed) || this.rotationSpeed === 0) return;
    this.rotation += this.rotationSpeed * dt;
    this.#rebuildGeometry();
  }

  getShape() {
    return this.shape;
  }

  getRotationSpeedDeg() {
    return this.rotationSpeed * (180 / Math.PI);
  }

  // --------------------------------------------------------
  // constrainCircle(x, y, r)
  // • Mantiene un cerchio dentro l'arena (poligono convesso).
  // • Restituisce nuova posizione e normale del bordo colpito.
  // --------------------------------------------------------
  constrainCircle(x, y, r) {
    if (!this.points.length) return { x, y, hit: false, normalX: 0, normalY: 0 };

    let minDist = Infinity;
    let minNormal = null;

    for (let i = 0; i < this.points.length; i++) {
      const p1 = this.points[i];
      const normal = this.normals[i];
      const dx = x - p1.x;
      const dy = y - p1.y;
      const dist = dx * normal.x + dy * normal.y;
      if (dist < minDist) {
        minDist = dist;
        minNormal = normal;
      }
    }

    if (minDist >= r) {
      return { x, y, hit: false, normalX: 0, normalY: 0 };
    }

    const push = r - minDist;
    return {
      x: x + minNormal.x * push,
      y: y + minNormal.y * push,
      hit: true,
      normalX: minNormal.x,
      normalY: minNormal.y
    };
  }

  #rebuildGeometry() {
    this.points = this.#rotatePoints(this.basePoints, this.rotation);
    this.normals = this.#buildNormals(this.points);
  }

  #rotatePoints(points, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map((p) => {
      const dx = p.x - this.cx;
      const dy = p.y - this.cy;
      return {
        x: this.cx + dx * cos - dy * sin,
        y: this.cy + dx * sin + dy * cos
      };
    });
  }

  // --------------------------------------------------------
  // Costruzione poligoni (convessi)
  // --------------------------------------------------------
  #buildPolygon(shape) {
    const radiusX = Math.max(1, this.width / 2 - this.paddingX);
    const radiusY = Math.max(1, this.height / 2 - this.paddingY);

    switch (shape) {
      case "triangle":
        return this.#fitPolygon(this.#regularPolygon(3), radiusX, radiusY);
      case "diamond":
        return this.#fitPolygon(this.#regularPolygon(4), radiusX, radiusY);
      case "pentagon":
        return this.#fitPolygon(this.#regularPolygon(5), radiusX, radiusY);
      case "hexagon":
        return this.#fitPolygon(this.#regularPolygon(6), radiusX, radiusY);
      case "heptagon":
        return this.#fitPolygon(this.#regularPolygon(7), radiusX, radiusY);
      case "octagon":
        return this.#fitPolygon(this.#regularPolygon(8), radiusX, radiusY);
      case "circle":
        return this.#fitPolygon(this.#regularPolygon(72), radiusX, radiusY);
      case "irregular":
        return this.#fitPolygon(this.#irregularPolygon(8), radiusX, radiusY);
      case "rect":
      default:
        return [
          { x: this.paddingX, y: this.paddingY },
          { x: this.width - this.paddingX, y: this.paddingY },
          { x: this.width - this.paddingX, y: this.height - this.paddingY },
          { x: this.paddingX, y: this.height - this.paddingY }
        ];
    }
  }

  #regularPolygon(sides) {
    const pts = [];
    const step = (Math.PI * 2) / sides;
    const start = -Math.PI / 2;

    for (let i = 0; i < sides; i++) {
      const angle = start + i * step;
      pts.push({
        x: Math.cos(angle),
        y: Math.sin(angle)
      });
    }

    return pts;
  }

  #irregularPolygon(sides) {
    const pts = [];
    const step = (Math.PI * 2) / sides;
    const start = -Math.PI / 2;
    const scales = [1, 0.84, 0.96, 0.78, 1, 0.88, 0.76, 0.92];

    for (let i = 0; i < sides; i++) {
      const angle = start + i * step;
      const scale = scales[i % scales.length];
      pts.push({
        x: Math.cos(angle) * scale,
        y: Math.sin(angle) * scale
      });
    }

    return pts;
  }

  #fitPolygon(points, radiusX, radiusY) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = Math.max(1e-6, maxX - minX);
    const height = Math.max(1e-6, maxY - minY);
    const scaleX = radiusX * 2 / width;
    const scaleY = radiusY * 2 / height;
    const scale = Math.min(scaleX, scaleY);
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;

    return points.map((p) => ({
      x: this.cx + (p.x - centerX) * scale,
      y: this.cy + (p.y - centerY) * scale
    }));
  }

  #buildNormals(points) {
    const normals = [];
    const count = points.length;

    for (let i = 0; i < count; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % count];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      let nx = dy;
      let ny = -dx;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;

      const midX = (p1.x + p2.x) * 0.5;
      const midY = (p1.y + p2.y) * 0.5;
      const toCenterX = this.cx - midX;
      const toCenterY = this.cy - midY;
      if (nx * toCenterX + ny * toCenterY < 0) {
        nx *= -1;
        ny *= -1;
      }

      normals.push({ x: nx, y: ny });
    }

    return normals;
  }
}
