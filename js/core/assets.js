// Lightweight optional image asset loader for pixel-art rendering.

export const ARENA_ASSET_MANIFEST = [];

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
