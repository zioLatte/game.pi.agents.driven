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
    this.waveState = this.#createEmptyWaveState();

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
          bulletBounces: Number(levelEntry?.bulletBounces) || 0,
          maxAliveOnions: Math.min(3, Math.max(0, Number(levelEntry?.maxAliveOnions) || 0)),
          totalOnions: Math.max(0, Number(levelEntry?.totalOnions) || 0),
          spawnIntervalMs: Math.max(0, Number(levelEntry?.spawnIntervalMs) || 0),
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
    this.waveState = this.#createEmptyWaveState();
  }

  #buildLevel() {
    const config = this.getLevelConfig(this.currentLevel);
    this.waveState = {
      maxAliveOnions: config.maxAliveOnions,
      totalOnions: config.totalOnions,
      spawnIntervalMs: config.spawnIntervalMs,
      spawnedOnions: 0,
      pressureOpenSince: null
    };

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
      0
    );
    this.player.arena = this.arena;

    const initialCount = Math.min(this.waveState.maxAliveOnions, this.waveState.totalOnions);
    for (let i = 0; i < initialCount; i++) {
      this.#spawnQueuedOnion(config);
    }
  }

  getPlayer() {
    return this.player;
  }

  getOnions() {
    return this.onions;
  }

  getOnionCountForLevel(level = this.currentLevel) {
    return this.getLevelConfig(level).maxAliveOnions;
  }

  getLevelConfig(level = this.currentLevel) {
    const baseConfig = this.getBaseLevelConfig(level);
    return {
      pressureIndex: baseConfig.pressureIndex,
      levelInCycle: baseConfig.levelInCycle,
      cycleLength: baseConfig.cycleLength,
      arenaShape: baseConfig.arenaShape,
      maxAliveOnions: baseConfig.maxAliveOnions,
      totalOnions: baseConfig.totalOnions,
      spawnIntervalMs: baseConfig.spawnIntervalMs,
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
      maxAliveOnions: Math.min(3, Math.max(0, Number(config?.maxAliveOnions) || 0)),
      totalOnions: Math.max(0, Number(config?.totalOnions) || 0),
      spawnIntervalMs: Math.max(0, Number(config?.spawnIntervalMs) || 0),
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

  removeInactiveOnions() {
    this.onions = this.onions.filter((onion) => onion.alive);
    return this.onions;
  }

  getPressureOnionCount() {
    return this.onions.filter((onion) => onion.alive || onion.dying).length;
  }

  updateWave(now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    const config = this.getLevelConfig(this.currentLevel);
    this.removeInactiveOnions();

    const activeCount = this.getPressureOnionCount();
    const budgetRemains = this.waveState.spawnedOnions < this.waveState.totalOnions;
    const belowCap = activeCount < this.waveState.maxAliveOnions;

    if (!budgetRemains || !belowCap) {
      this.waveState.pressureOpenSince = null;
      return this.onions;
    }

    if (!Number.isFinite(this.waveState.pressureOpenSince)) {
      this.waveState.pressureOpenSince = frameNow;
      return this.onions;
    }

    if (frameNow - this.waveState.pressureOpenSince < this.waveState.spawnIntervalMs) {
      return this.onions;
    }

    this.#spawnQueuedOnion(config);
    this.waveState.pressureOpenSince = null;
    return this.onions;
  }

  isWaveComplete() {
    return this.waveState.spawnedOnions >= this.waveState.totalOnions
      && this.getPressureOnionCount() === 0;
  }

  getWaveState() {
    return { ...this.waveState };
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

  #createEmptyWaveState() {
    return {
      maxAliveOnions: 0,
      totalOnions: 0,
      spawnIntervalMs: 0,
      spawnedOnions: 0,
      pressureOpenSince: null
    };
  }

  #spawnQueuedOnion(config = this.getLevelConfig(this.currentLevel)) {
    if (this.waveState.spawnedOnions >= this.waveState.totalOnions) return null;
    if (this.getPressureOnionCount() >= this.waveState.maxAliveOnions) return null;

    const edgeMargin = 10;
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

    const spawnIndex = this.waveState.spawnedOnions;
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
    onion.chaseSpeedScale = this.getChaseSpeedScaleForIndex(config.onionChaseSpeedScale, spawnIndex);
    onion.speedScale = this.getSpeedScaleForIndex(config.onionSpeedScale, spawnIndex);
    onion.dodgeEnabled = config.pressureIndex >= 2 && (spawnIndex % 3 === 0);

    if (this.arena) {
      const res = this.arena.constrainCircle(onion.x, onion.y, onion.r);
      onion.x = res.x;
      onion.y = res.y;
    }

    this.onions.push(onion);
    this.waveState.spawnedOnions += 1;
    return onion;
  }
}
