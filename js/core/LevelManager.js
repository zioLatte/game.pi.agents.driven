// ==========================================================
// LevelManager.js — Gestione livelli, spawn entità e reset
// ==========================================================

import { Arena } from "./Arena.js";
import { resolveGateSpawn } from "./ArenaGates.js";
import { Onion } from "../entities/Onion.js";
import { Player } from "../entities/Player.js";

const SPEED_DOT_DEFAULTS = {
  enabled: true,
  radius: 10,
  boostDurationMs: 3000,
  boostSpeedMultiplier: 1.35,
  firstSpawnDelayMsRange: [5000, 8000],
  respawnDelayMsRange: [6000, 10000]
};
const ARENA_OUTER_PADDING_RATIO = 0.1;
const ARENA_OUTER_PADDING_MIN = 44;
const ARENA_OUTER_PADDING_MAX = 72;

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
    this.speedDotConfig = this.#resolveSpeedDotConfig(levelConfig?.speedDot);
    this.speedDotState = this.#createSpeedDotState();

    this.piTable = Array.isArray(levelConfig?.piTable) ? levelConfig.piTable : [];
    this.#rebuildConfigIndex();
  }

  setConfig(levelConfig = null) {
    this.#clearSpeedDotTargets();
    this.piTable = Array.isArray(levelConfig?.piTable) ? levelConfig.piTable : [];
    this.speedDotConfig = this.#resolveSpeedDotConfig(levelConfig?.speedDot);
    this.speedDotState = this.#createSpeedDotState();
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
    this.#clearSpeedDotTargets();
    this.player = null;
    this.onions = [];
    this.arena = null;
    this.waveState = this.#createEmptyWaveState();
    this.speedDotState = this.#createSpeedDotState();
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

    const arenaPadding = this.#resolveArenaPadding();
    this.arena = new Arena(
      this.worldWidth,
      this.worldHeight,
      config.arenaShape,
      arenaPadding.x,
      arenaPadding.y
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

  getSpeedDot() {
    const dot = this.speedDotState;
    if (!dot?.active) return null;
    return {
      x: dot.x,
      y: dot.y,
      r: dot.r,
      spawnedAt: dot.spawnedAt,
      targetOnion: dot.targetOnion
    };
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

  updateSpeedDot(now = performance.now()) {
    const frameNow = Number.isFinite(now) ? now : performance.now();
    const dot = this.speedDotState;
    const config = this.speedDotConfig;

    if (!config.enabled || !this.player || !this.arena) {
      this.#clearSpeedDotTargets();
      this.speedDotState = this.#createSpeedDotState();
      return null;
    }

    if (dot.active) {
      const constrained = this.arena.constrainCircle(dot.x, dot.y, dot.r);
      dot.x = constrained.x;
      dot.y = constrained.y;
      this.#assignSpeedDotTarget(frameNow);
      return this.getSpeedDot();
    }

    if (!Number.isFinite(dot.nextSpawnAt)) {
      dot.nextSpawnAt = frameNow + this.#randomDelay(config.firstSpawnDelayMsRange);
      return null;
    }

    if (frameNow < dot.nextSpawnAt) return null;

    this.#spawnSpeedDot(frameNow);
    this.#assignSpeedDotTarget(frameNow);
    return this.getSpeedDot();
  }

  consumeSpeedDot(collector, now = performance.now()) {
    const dot = this.speedDotState;
    if (!dot?.active || !collector || typeof collector.applySpeedBoost !== "function") {
      return false;
    }

    const frameNow = Number.isFinite(now) ? now : performance.now();
    const applied = collector.applySpeedBoost(
      this.speedDotConfig.boostSpeedMultiplier,
      this.speedDotConfig.boostDurationMs,
      frameNow
    );

    if (!applied) return false;

    dot.active = false;
    dot.x = 0;
    dot.y = 0;
    dot.spawnedAt = 0;
    dot.targetOnion = null;
    dot.nextSpawnAt = frameNow + this.#randomDelay(this.speedDotConfig.respawnDelayMsRange);
    this.#clearSpeedDotTargets();
    return true;
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

  getWaveProgress() {
    const activePressureCount = this.getPressureOnionCount();
    const totalOnions = Math.max(0, Number(this.waveState.totalOnions) || 0);
    const spawnedOnions = Math.max(0, Number(this.waveState.spawnedOnions) || 0);
    const clearedOnions = Math.min(totalOnions, Math.max(0, spawnedOnions - activePressureCount));
    const remainingOnions = Math.max(0, totalOnions - clearedOnions);
    const queuedOnions = Math.max(0, totalOnions - spawnedOnions);
    const progressRatio = totalOnions > 0 ? clearedOnions / totalOnions : 1;

    return {
      currentLevel: this.currentLevel,
      maxAliveOnions: this.waveState.maxAliveOnions,
      totalOnions,
      spawnIntervalMs: this.waveState.spawnIntervalMs,
      spawnedOnions,
      activePressureCount,
      clearedOnions,
      remainingOnions,
      queuedOnions,
      progressRatio: Math.max(0, Math.min(1, progressRatio)),
      isComplete: spawnedOnions >= totalOnions && activePressureCount === 0
    };
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

  #createSpeedDotState() {
    return {
      active: false,
      x: 0,
      y: 0,
      r: this.speedDotConfig?.radius ?? SPEED_DOT_DEFAULTS.radius,
      spawnedAt: 0,
      nextSpawnAt: null,
      targetOnion: null
    };
  }

  #resolveSpeedDotConfig(raw = null) {
    const readRange = (value, fallback) => {
      if (!Array.isArray(value) || value.length < 2) return fallback;
      const min = Number(value[0]);
      const max = Number(value[1]);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
      return [Math.max(0, Math.min(min, max)), Math.max(0, Math.max(min, max))];
    };

    const radius = Number(raw?.radius);
    const duration = Number(raw?.boostDurationMs);
    const multiplier = Number(raw?.boostSpeedMultiplier);

    return {
      enabled: raw?.enabled !== false,
      radius: Number.isFinite(radius) && radius > 0 ? radius : SPEED_DOT_DEFAULTS.radius,
      boostDurationMs: Number.isFinite(duration) && duration > 0 ? duration : SPEED_DOT_DEFAULTS.boostDurationMs,
      boostSpeedMultiplier: Number.isFinite(multiplier) && multiplier > 1 ? multiplier : SPEED_DOT_DEFAULTS.boostSpeedMultiplier,
      firstSpawnDelayMsRange: readRange(raw?.firstSpawnDelayMsRange, SPEED_DOT_DEFAULTS.firstSpawnDelayMsRange),
      respawnDelayMsRange: readRange(raw?.respawnDelayMsRange, SPEED_DOT_DEFAULTS.respawnDelayMsRange)
    };
  }

  #randomDelay(range) {
    const min = Number(range?.[0]) || 0;
    const max = Number(range?.[1]) || min;
    return min + Math.random() * Math.max(0, max - min);
  }

  #resolveArenaPadding() {
    const minDimension = Math.min(this.worldWidth, this.worldHeight);
    const padding = Math.max(
      ARENA_OUTER_PADDING_MIN,
      Math.min(ARENA_OUTER_PADDING_MAX, minDimension * ARENA_OUTER_PADDING_RATIO)
    );
    return { x: padding, y: padding };
  }

  #spawnSpeedDot(now) {
    const dot = this.speedDotState;
    const radius = this.speedDotConfig.radius;
    const margin = radius + 12;
    const playerClearance = (this.player?.r ?? 0) + radius + 40;
    let best = null;

    for (let i = 0; i < 8; i += 1) {
      const x = margin + Math.random() * Math.max(1, this.worldWidth - margin * 2);
      const y = margin + Math.random() * Math.max(1, this.worldHeight - margin * 2);
      const candidate = this.arena.constrainCircle(x, y, radius);
      best = candidate;

      const dx = candidate.x - this.player.x;
      const dy = candidate.y - this.player.y;
      if (dx * dx + dy * dy >= playerClearance * playerClearance) break;
    }

    dot.active = true;
    dot.x = best?.x ?? this.worldWidth / 2;
    dot.y = best?.y ?? this.worldHeight / 2;
    dot.r = radius;
    dot.spawnedAt = now;
    dot.nextSpawnAt = null;
    dot.targetOnion = null;
  }

  #assignSpeedDotTarget(now) {
    const dot = this.speedDotState;
    if (!dot?.active) {
      this.#clearSpeedDotTargets();
      return null;
    }

    let best = null;
    let bestDistSq = Infinity;
    const target = {
      x: dot.x,
      y: dot.y,
      r: dot.r
    };
    for (const onion of this.onions) {
      if (!onion || typeof onion.canTargetSpeedDot !== "function" || !onion.canTargetSpeedDot(now, target)) {
        onion?.clearSpeedDotTarget?.();
        continue;
      }

      const dx = onion.x - dot.x;
      const dy = onion.y - dot.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        best = onion;
        bestDistSq = distSq;
      }
    }

    for (const onion of this.onions) {
      if (onion === best) {
        onion.setSpeedDotTarget(target);
      } else {
        onion?.clearSpeedDotTarget?.();
      }
    }

    dot.targetOnion = best;
    return best;
  }

  #clearSpeedDotTargets() {
    for (const onion of this.onions) {
      onion?.clearSpeedDotTarget?.();
    }
    if (this.speedDotState) this.speedDotState.targetOnion = null;
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
      const gateSpawn = resolveGateSpawn(this.arena, onion.r, spawnIndex, Math.random);
      if (gateSpawn) {
        onion.x = gateSpawn.x;
        onion.y = gateSpawn.y;
      }
      const res = this.arena.constrainCircle(onion.x, onion.y, onion.r);
      onion.x = res.x;
      onion.y = res.y;
    }

    this.onions.push(onion);
    this.waveState.spawnedOnions += 1;
    return onion;
  }
}
