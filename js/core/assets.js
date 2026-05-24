// Lightweight optional image asset loader for pixel-art rendering.

export const ARENA_ASSET_MANIFEST = [
  { id: "sprites.pichanIdle", path: "./assets/collage/player_idle.png" },
  { id: "sprites.pichanUp", path: "./assets/collage/player_up.png" },
  { id: "sprites.pichanDown", path: "./assets/collage/player_down.png" },
  { id: "sprites.pichanLeft", path: "./assets/collage/player_left.png" },
  { id: "sprites.pichanRight", path: "./assets/collage/player_right.png" },
  { id: "sprites.onionIdle", path: "./assets/collage/onion_idle.png" },
  { id: "sprites.onionChase", path: "./assets/collage/onion_chase.png" },
  { id: "sprites.onionDefeated", path: "./assets/collage/onion_defeated.png" },
  { id: "sprites.onionQueued", path: "./assets/collage/onion_queued.png" },
  { id: "sprites.speedBolt", path: "./assets/collage/pickup_power.png" },
  { id: "sprites.boostRing", path: "./assets/collage/pickup_energy.png" },
  { id: "sprites.scoreStar", path: "./assets/collage/pickup_score_star.png" },
  { id: "tiles.arenaFloor", path: "./assets/collage/paper_arena_bg.png" },
  { id: "tiles.gateHorizontal", path: "./assets/collage/gate_horizontal.png" },
  { id: "tiles.gateVertical", path: "./assets/collage/gate_vertical.png" },
  { id: "tiles.wallStraight", path: "./assets/collage/wall_straight.png" },
  { id: "tiles.wallCorner", path: "./assets/collage/block_gate.png" },
  { id: "tiles.purpleStain", path: "./assets/collage/purple_stain.png" }
];

export class AssetLoader {
  constructor(manifest = [], { version = null } = {}) {
    this.version = version;
    this.records = new Map();

    for (const entry of manifest) {
      if (!entry?.id || !entry?.path) continue;
      this.records.set(entry.id, {
        id: entry.id,
        path: entry.path,
        src: this.#withVersion(entry.path),
        img: null,
        loaded: false,
        error: false,
        promise: null
      });
    }
  }

  loadAll() {
    return Promise.all([...this.records.values()].map((record) => this.#loadRecord(record)));
  }

  getImage(id) {
    const record = this.records.get(id);
    if (!record?.loaded || !record.img) return null;
    return record.img;
  }

  getStatus(id) {
    const record = this.records.get(id);
    if (!record) return null;
    return {
      id: record.id,
      path: record.path,
      src: record.src,
      loaded: record.loaded,
      error: record.error
    };
  }

  getMissing() {
    return [...this.records.values()]
      .filter((record) => !record.loaded)
      .map((record) => ({
        id: record.id,
        path: record.path,
        error: record.error
      }));
  }

  #loadRecord(record) {
    if (record.promise) return record.promise;

    record.promise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        record.img = img;
        record.loaded = true;
        record.error = false;
        resolve(record);
      };
      img.onerror = () => {
        record.img = null;
        record.loaded = false;
        record.error = true;
        resolve(record);
      };
      img.src = record.src;
    });

    return record.promise;
  }

  #withVersion(path) {
    if (!this.version) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${this.version}`;
  }
}
