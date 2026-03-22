// ==========================================================
// LevelManager.js — Gestione livelli, spawn entità e reset
// ==========================================================

import { Arena } from "./Arena.js";
import { Onion } from "../entities/Onion.js";
import { Player } from "../entities/Player.js";

export class LevelManager {
  constructor(ctx, worldWidth = 960, worldHeight = 600, levelConfig = null) {
    this.ctx = ctx;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.player = null;
    this.onions = [];
    this.arena = null;
    this.currentLevel = 1;

    this.piTable = Array.isArray(levelConfig?.piTable) ? levelConfig.piTable : [];
    this.#rebuildConfigIndex();
  }

  setConfig(levelConfig = null) {
    this.piTable = Array.isArray(levelConfig?.piTable) ? levelConfig.piTable : [];
    this.#rebuildConfigIndex();
  }

  #rebuildConfigIndex() {
    this.levelIndex = new Map();
    this.lastConfig = null;
    let levelCounter = 1;

    this.piTable.forEach((entry) => {
      if (!entry || !Array.isArray(entry.levels)) return;
      entry.levels.forEach((levelEntry, levelInCycleIndex) => {
        const level = levelCounter;
        levelCounter += 1;
        const config = {
          pressureIndex: Number(entry.pi) || 0,
          levelInCycle: levelInCycleIndex + 1,
          cycleLength: entry.levels.length,
          arenaShape: levelEntry?.arenaShape || entry.arenaShape || "rect",
          arenaRotationSpeed: Number(levelEntry?.arenaRotationSpeed ?? entry?.arenaRotationSpeed) || 0,
          bulletBounces: Number(levelEntry?.bulletBounces) || 0,
          onionCount: Number(levelEntry?.onionCount) || 0,
          onionChaseSpeedScale: levelEntry?.onionChaseSpeedScale ?? [1],
          onionSpeedScale: levelEntry?.onionSpeedScale ?? [1]
        };
        this.levelIndex.set(level, config);
        if (!this.lastConfig || level > this.lastConfig.level) {
          this.lastConfig = { level, ...config };
        }
      });
    });
  }

  loadLevel(num = 1) {
    this.clearLevel();

    window.isShooting = false;
    window.lastPlayerShot = Number.NEGATIVE_INFINITY;
    window.chaseEndTime = Number.NEGATIVE_INFINITY;

    this.currentLevel = num;
    this.#buildLevel();
  }

  clearLevel() {
    this.player = null;
    this.onions = [];
    this.arena = null;
  }

  #buildLevel() {
    const config = this.getLevelConfig(this.currentLevel);

    this.player = new Player(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.ctx,
      this.worldWidth,
      this.worldHeight
    );

    this.arena = new Arena(
      this.worldWidth,
      this.worldHeight,
      config.arenaShape,
      0,
      0,
      { rotationSpeed: (config.arenaRotationSpeed || 0) * (Math.PI / 180) }
    );
    this.player.arena = this.arena;

    const onionCount = config.onionCount;
    const edgeMargin = 10;

    for (let i = 0; i < onionCount; i++) {
      let ox = 0;
      let oy = 0;
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        ox = edgeMargin;
        oy = edgeMargin + Math.random() * (this.worldHeight - edgeMargin * 2);
      } else if (side === 1) {
        ox = this.worldWidth - edgeMargin;
        oy = edgeMargin + Math.random() * (this.worldHeight - edgeMargin * 2);
      } else if (side === 2) {
        ox = edgeMargin + Math.random() * (this.worldWidth - edgeMargin * 2);
        oy = edgeMargin;
      } else {
        ox = edgeMargin + Math.random() * (this.worldWidth - edgeMargin * 2);
        oy = this.worldHeight - edgeMargin;
      }

      const onion = new Onion(
        ox,
        oy,
        this.ctx,
        this.worldWidth,
        this.worldHeight,
        this.onions,
        this.player
      );
      onion.arena = this.arena;
      onion.chaseSpeedScale = this.getChaseSpeedScaleForIndex(config.onionChaseSpeedScale, i);
      onion.speedScale = this.getSpeedScaleForIndex(config.onionSpeedScale, i);
      onion.dodgeEnabled = config.pressureIndex >= 2 && (i % 3 === 0);

      if (this.arena) {
        const res = this.arena.constrainCircle(onion.x, onion.y, onion.r);
        onion.x = res.x;
        onion.y = res.y;
      }

      this.onions.push(onion);
    }
  }

  getPlayer() {
    return this.player;
  }

  getOnions() {
    return this.onions;
  }

  getOnionCountForLevel(level = this.currentLevel) {
    return this.getLevelConfig(level).onionCount;
  }

  getLevelConfig(level = this.currentLevel) {
    const baseConfig = this.getBaseLevelConfig(level);
    return {
      pressureIndex: baseConfig.pressureIndex,
      levelInCycle: baseConfig.levelInCycle,
      cycleLength: baseConfig.cycleLength,
      arenaShape: baseConfig.arenaShape,
      arenaRotationSpeed: baseConfig.arenaRotationSpeed,
      onionCount: baseConfig.onionCount,
      onionSpeedScale: baseConfig.onionSpeedScale,
      onionChaseSpeedScale: baseConfig.onionChaseSpeedScale,
      bulletBounces: baseConfig.bulletBounces
    };
  }

  getBaseLevelConfig(level = this.currentLevel) {
    const direct = this.levelIndex.get(level);
    if (direct) return direct;
    if (this.lastConfig) return this.lastConfig;

    const pressureIndex = this.getPressureIndex(level);
    const config = this.piTable[Math.min(pressureIndex, this.piTable.length - 1)];
    return {
      pressureIndex: config?.pi ?? 0,
      levelInCycle: 1,
      cycleLength: Array.isArray(config?.levels) ? config.levels.length : 1,
      arenaShape: config?.arenaShape ?? "rect",
      arenaRotationSpeed: Number(config?.arenaRotationSpeed) || 0,
      onionCount: config?.onionCount ?? 0,
      onionSpeedScale: config?.onionSpeedScale ?? [1],
      onionChaseSpeedScale: config?.onionChaseSpeedScale ?? 1,
      bulletBounces: config?.bulletBounces ?? 0
    };
  }

  getPressureIndex(level = this.currentLevel) {
    const direct = this.levelIndex.get(level);
    if (direct) return direct.pressureIndex;
    if (this.lastConfig) return this.lastConfig.pressureIndex;
    return 0;
  }

  getBulletBounceCount(level = this.currentLevel) {
    return this.getLevelConfig(level).bulletBounces;
  }

  getChaseSpeedScaleForIndex(value, index = 0) {
    if (Array.isArray(value) && value.length > 0) {
      if (index < value.length) return value[index];
      const lastValue = value[value.length - 1];
      return Number.isFinite(lastValue) ? lastValue : 1;
    }
    return Number.isFinite(value) ? value : 1;
  }

  getSpeedScaleForIndex(value, index = 0) {
    if (Array.isArray(value) && value.length > 0) {
      if (index < value.length) return value[index];
      const lastValue = value[value.length - 1];
      return Number.isFinite(lastValue) ? lastValue : 1;
    }
    return Number.isFinite(value) ? value : 1;
  }
}
