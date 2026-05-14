// ==========================================================
// main.js — Punto di integrazione centrale del gioco PI.Onion
// ==========================================================

import { Engine } from "./js/core/Engine.js";
import { Input } from "./js/core/Input.js";
import { LevelManager } from "./js/core/LevelManager.js";
import { resolveCircleCircle } from "./js/core/physics.js";
import { state } from "./js/core/state.js";
import { AssetLoader, ARENA_ASSET_MANIFEST } from "./js/core/assets.js";
import { createAudioController } from "./js/ui/audio.js";
import { Explosion } from "./js/entities/Explosion.js";
import { refreshWorldSize, buildBackground } from "./js/ui/canvas.js";
import { createNicknameManager } from "./js/ui/nickname.js";
import { createOnlineService } from "./js/services/onlineService.js";
import { createLifecycle } from "./js/app/lifecycle.js";


// ----------------------------------------------------------
// CANVAS + DPI FIX
// ----------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const layoutEl = document.getElementById("layout");
const gameWrapEl = document.getElementById("game-wrap");
const gameoverOverlay = document.getElementById("gameover-overlay");
const playAgainBtn = document.getElementById("play-again");
const continueBtn = document.getElementById("continue-game");
const gameoverScoreEl = document.getElementById("gameover-score");
const gameoverTimeEl = document.getElementById("gameover-time");
const continueInfoEl = document.getElementById("continue-info");
const continueIconsEl = document.getElementById("continue-icons");
const levelOverlay = document.getElementById("level-overlay");
const levelTitleEl = document.getElementById("level-title");
const levelInfoEl = document.getElementById("level-info");
const gotoOverlay = document.getElementById("goto-overlay");
const gotoCloseBtn = document.getElementById("goto-close");
const gotoTable = document.getElementById("goto-table");
const gotoInput = document.getElementById("goto-input");
const gotoApplyBtn = document.getElementById("goto-apply");
const nicknameOverlay = document.getElementById("nickname-overlay");
const nicknameValueEl = document.getElementById("nickname-value");
const nicknameApplyBtn = document.getElementById("nickname-apply");
const nicknameRegenBtn = document.getElementById("nickname-regenerate");
const nicknameError = document.getElementById("nickname-error");
const mobileWarningEl = document.getElementById("mobile-warning");
const bgmEl = document.getElementById("bgm");
const gameoverSfxEl = document.getElementById("gameover-sfx");
const shotSfxEl = document.getElementById("shot-sfx");
const bounceSfxEl = document.getElementById("bounce-sfx");
const onionDeathSfxEl = document.getElementById("onion-death-sfx");
const levelupSfxEl = document.getElementById("levelup-sfx");
const titleOnionLineEl = document.getElementById("title-onion-line");
const titlePiLineEl = document.getElementById("title-pi-line");
const titleOpinionLineEl = document.getElementById("title-opinion-line");
const opinionFloatLayer = document.getElementById("opinion-float-layer");
const playersPanelEl = document.getElementById("players-panel");
const runHudEl = document.getElementById("run-hud");
const runHudLevelEl = document.getElementById("run-hud-level");
const runHudOpinionEl = document.getElementById("run-hud-opinion");
const runHudWaveTextEl = document.getElementById("run-hud-wave-text");
const runHudWaveBarEl = document.getElementById("run-hud-wave-bar");
const runHudOnionsEl = document.getElementById("run-hud-onions");
const runHudOnionsLeftEl = document.getElementById("run-hud-onions-left");
const runHudQueuedEl = document.getElementById("run-hud-queued");
const runHudBoostEl = document.getElementById("run-hud-boost");
const runHudDotEl = document.getElementById("run-hud-dot");
const levelToastEl = document.getElementById("level-toast");
const touchControlsEl = document.getElementById("touch-controls");
const touchFireBtnEl = document.getElementById("touch-fire");
const touchUpBtnEl = document.getElementById("touch-up");
const touchDownBtnEl = document.getElementById("touch-down");
const touchLeftBtnEl = document.getElementById("touch-left");
const touchRightBtnEl = document.getElementById("touch-right");
const LEVEL_START_DELAY_MS = 1400;
const LEVEL_TOAST_DURATION_MS = 1300;
const LEVELUP_SFX_FADE_DELAY_MS = 900;
const LEVELUP_SFX_FADE_MS = 350;
const MAX_CONTINUES = 3;
let levelOverlayTimeoutId = null;
let levelToastTimeoutId = null;
let levelupSfxFadeTimeoutId = null;
let lastChaseEndTime = 0;
let continueUses = 0;
let isPaused = false;
let playersPanelLayoutVisible = false;
let gotoResumeAllowed = false;
const audio = createAudioController({
  bgmEl,
  gameoverSfxEl,
  shotSfxEl,
  bounceSfxEl,
  onionDeathSfxEl,
  levelupSfxEl
});
let levelOnionPreloadPromise = null;
let levelOnionPreloadDone = false;
let levelOverlayPending = false;
let titleFlashTarget = null;
let titleFlashUntil = 0;
let lastOpinionFlashUntil = 0;
let assetsLoaded = false;
let startPending = false;
let levelOnionAnimHandler = null;
let levelOnionDirection = 1;
let pendingGameStart = true;
const onlineService = createOnlineService();
const STATS_KEYS = {
  games: "pi_games_played",
  maxScore: "pi_max_score",
  maxLevel: "pi_max_level"
};
const stats = {
  games: Number(localStorage.getItem(STATS_KEYS.games)) || 0,
  maxScore: Number(localStorage.getItem(STATS_KEYS.maxScore)) || 0,
  maxLevel: Number(localStorage.getItem(STATS_KEYS.maxLevel)) || 1
};
const screenFx = {
  trauma: 0,
  offsetX: 0,
  offsetY: 0,
  flashAlpha: 0,
  flashColor: "rgba(255,255,255,1)"
};

function addScreenShake(amount = 0.08) {
  screenFx.trauma = Math.min(1, screenFx.trauma + Math.max(0, amount));
}

function triggerGameFlash(color = "rgba(255,255,255,1)", alpha = 0.08) {
  screenFx.flashColor = color;
  screenFx.flashAlpha = Math.max(screenFx.flashAlpha, Math.max(0, alpha));
}

function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy < rr * rr;
}

function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function resolveSpeedDotPickup(now) {
  const dot = levelManager.getSpeedDot();
  if (!dot) return;

  const candidates = [];
  if (circlesOverlap(player.x, player.y, player.r, dot.x, dot.y, dot.r)) {
    candidates.push({
      collector: player,
      priority: 0,
      distSq: distanceSq(player.x, player.y, dot.x, dot.y)
    });
  }

  const targetOnion = dot.targetOnion;
  if (
    targetOnion
    && targetOnion.alive
    && !targetOnion.dying
    && targetOnion.canTargetSpeedDot?.(now)
    && circlesOverlap(targetOnion.x, targetOnion.y, targetOnion.r, dot.x, dot.y, dot.r)
  ) {
    candidates.push({
      collector: targetOnion,
      priority: 1,
      distSq: distanceSq(targetOnion.x, targetOnion.y, dot.x, dot.y)
    });
  }

  if (candidates.length === 0) return;

  candidates.sort((a, b) => (a.distSq - b.distSq) || (a.priority - b.priority));
  if (levelManager.consumeSpeedDot(candidates[0].collector, now)) {
    addScreenShake(0.045);
    triggerGameFlash("rgba(95, 235, 255, 1)", 0.08);
  }
}

function drawSpeedDot(ctx, dot, now) {
  if (!dot) return;
  const pulse = 0.5 + 0.5 * Math.sin((now || 0) / 130);
  const scale = 1 + pulse * 0.08;
  const size = dot.r * 2.9;
  const boltImage = getRenderAssetImage("sprites.speedBolt");

  ctx.save();
  ctx.translate(dot.x, dot.y);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "rgba(255, 232, 80, 0.9)";
  ctx.shadowBlur = 12 + pulse * 5;
  if (boltImage) {
    ctx.drawImage(boltImage, -size * 0.62, -size * 0.72, size * 1.24, size * 1.44);
  } else {
    ctx.fillStyle = "rgba(255, 235, 85, 0.95)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.05, -size * 0.62);
    ctx.lineTo(size * 0.42, -size * 0.62);
    ctx.lineTo(size * 0.12, -size * 0.08);
    ctx.lineTo(size * 0.48, -size * 0.08);
    ctx.lineTo(-size * 0.25, size * 0.68);
    ctx.lineTo(-size * 0.04, size * 0.12);
    ctx.lineTo(-size * 0.43, size * 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(40, 35, 12, 0.86)";
    ctx.stroke();
  }

  ctx.globalAlpha = 0.42 + pulse * 0.2;
  ctx.strokeStyle = "rgba(255, 255, 210, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.58, 0);
  ctx.lineTo(-size * 0.78, 0);
  ctx.moveTo(size * 0.58, 0);
  ctx.lineTo(size * 0.78, 0);
  ctx.moveTo(0, -size * 0.72);
  ctx.lineTo(0, -size * 0.92);
  ctx.moveTo(0, size * 0.72);
  ctx.lineTo(0, size * 0.92);
  ctx.stroke();

  ctx.restore();
}

window.addScreenShake = addScreenShake;
window.triggerGameFlash = triggerGameFlash;
const NICK_KEY = "pi_nickname";
let nickname = (localStorage.getItem(NICK_KEY) || "").trim();
let playMs = 0;
if (!nickname) {
  const nicknameManager = createNicknameManager({
    nicknameOverlay,
    nicknameValueEl,
    nicknameApplyBtn,
    nicknameRegenBtn,
    nicknameError
  });
  nickname = await nicknameManager.requestNickname();
  localStorage.setItem(NICK_KEY, nickname);
}

Promise.resolve(onlineService.init({ nickname, stats })).catch((e) => {
  console.error("[onlineService.init]", e);
});
const PI_START_LEVEL = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5
};
const ASSET_VERSION = window.ASSET_VERSION || window.BUILD_VERSION || null;
const renderAssets = new AssetLoader(ARENA_ASSET_MANIFEST, { version: ASSET_VERSION });
const renderPatternCache = new Map();
window.PICHAN_RENDER_ASSETS = renderAssets;

function withAssetVersion(path) {
  if (!ASSET_VERSION) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}

window.withAssetVersion = withAssetVersion;

function getRenderAssetImage(id) {
  return renderAssets.getImage(id);
}

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isTouchDevice() {
  // preferire feature-detection rispetto a UA sniffing
  const hasTouchPoints = Number(navigator.maxTouchPoints || 0) > 0;
  const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  return hasTouchPoints || coarsePointer || ("ontouchstart" in window);
}

function startBgmOnce() {
  audio.startBgmOnce();
}


function fadeBgm(targetVolume, durationMs) {
  audio.fadeBgm(targetVolume, durationMs);
}

function startEngineIfReady() {
  if (!assetsLoaded) {
    startPending = true;
    return;
  }
  if (engine.running) return;
  startPending = false;
  if (pendingGameStart) {
    pendingGameStart = false;
    stats.games += 1;
    localStorage.setItem(STATS_KEYS.games, String(stats.games));
  }
  syncMaxLevelStat();
  engine.start();
  updateRunHud();
  updatePlayersPanelVisibility();
}

function stopBgm() {
  audio.stopBgm();
}

function playGameOverSfx() {
  audio.playGameOverSfx();
}

function stopGameOverSfx() {
  audio.stopGameOverSfx();
}

function playShotSfx() {
  audio.playShotSfx();
}

function playBounceSfx() {
  audio.playBounceSfx();
}

window.playShotSfx = playShotSfx;
window.playBounceSfx = playBounceSfx;
function playOnionDeathSfx() {
  audio.playOnionDeathSfx();
}

function setTitleHighlight(target) {
  if (!titleOnionLineEl || !titlePiLineEl || !titleOpinionLineEl) return;
  titleOnionLineEl.classList.toggle("is-white", target === "onion");
  titlePiLineEl.classList.toggle("is-white", target === "pi");
  titleOpinionLineEl.classList.toggle("is-white", target === "opinion");
  if (target === "opinion") {
    titleOpinionLineEl.classList.remove("float-up");
    void titleOpinionLineEl.offsetWidth;
    titleOpinionLineEl.classList.add("float-up");
    spawnOpinionFloat();
  }
}

function spawnOpinionFloat() {
  if (!opinionFloatLayer || !gameWrapEl) return;
  if (isPaused || isOverlayActive()) return;
  const titleRect = titleOpinionLineEl?.getBoundingClientRect();
  const floatEl = document.createElement("div");
  floatEl.className = "opinion-float";
  floatEl.textContent = "OPINION";
  const left = titleRect ? titleRect.left : 0;
  const top = titleRect ? titleRect.top : 0;
  floatEl.style.left = `${left}px`;
  floatEl.style.top = `${top}px`;
  floatEl.style.position = "fixed";
  opinionFloatLayer.appendChild(floatEl);
  floatEl.addEventListener("animationend", () => {
    floatEl.remove();
  });
}

function flashTitle(target, durationMs = 300, now) {
  const frameNow = now ?? performance.now();
  titleFlashTarget = target;
  titleFlashUntil = frameNow + durationMs;
  setTitleHighlight(target);
}

window.flashTitlePi = (now) => flashTitle("pi", 180, now);
function flashTitleOpinion(now) {
  const frameNow = now ?? performance.now();
  lastOpinionFlashUntil = frameNow + 260;
  flashTitle("opinion", 260, frameNow);
}

function updateTitleFromState(now) {
  if (!titleOnionLineEl) return;
  const frameNow = now ?? performance.now();
  if (titleFlashTarget && frameNow < titleFlashUntil) {
    setTitleHighlight(titleFlashTarget);
    return;
  }
  if (titleFlashTarget) titleFlashTarget = null;
  const hasBullets = player?.bullets?.some((b) => b.alive);
  if (hasBullets) {
    setTitleHighlight("pi");
    return;
  }
  if (frameNow < lastOpinionFlashUntil) {
    setTitleHighlight("opinion");
    return;
  }
  setTitleHighlight("onion");
}

function playLevelupSfx() {
  audio.playLevelupSfx();
}

function fadeLevelupSfx(durationMs) {
  audio.fadeLevelupSfx(durationMs);
}

function syncMaxLevelStat() {
  if (levelManager.currentLevel <= stats.maxLevel) return;
  stats.maxLevel = levelManager.currentLevel;
  localStorage.setItem(STATS_KEYS.maxLevel, String(stats.maxLevel));
}

function clearLevelToast({ fadeAudio = false } = {}) {
  if (levelToastTimeoutId) {
    clearTimeout(levelToastTimeoutId);
    levelToastTimeoutId = null;
  }
  if (levelupSfxFadeTimeoutId) {
    clearTimeout(levelupSfxFadeTimeoutId);
    levelupSfxFadeTimeoutId = null;
  }
  if (levelToastEl) {
    levelToastEl.classList.remove("visible");
    levelToastEl.setAttribute("aria-hidden", "true");
  }
  if (fadeAudio) fadeLevelupSfx(LEVELUP_SFX_FADE_MS);
}

function scheduleLevelupSfxFade() {
  if (levelupSfxFadeTimeoutId) clearTimeout(levelupSfxFadeTimeoutId);
  levelupSfxFadeTimeoutId = setTimeout(() => {
    levelupSfxFadeTimeoutId = null;
    fadeLevelupSfx(LEVELUP_SFX_FADE_MS);
  }, LEVELUP_SFX_FADE_DELAY_MS);
}

function showLevelToast(level) {
  clearLevelToast();
  scheduleLevelupSfxFade();

  if (!levelToastEl) return;
  levelToastEl.textContent = `Wave ${Math.max(1, level)}`;
  levelToastEl.setAttribute("aria-hidden", "false");
  void levelToastEl.offsetWidth;
  levelToastEl.classList.add("visible");

  levelToastTimeoutId = setTimeout(() => {
    levelToastTimeoutId = null;
    levelToastEl.classList.remove("visible");
    levelToastEl.setAttribute("aria-hidden", "true");
  }, LEVEL_TOAST_DURATION_MS);
}

function updateRunHud() {
  const progress = levelManager.getWaveProgress();
  const percent = Math.round(progress.progressRatio * 100);
  const boostRatio = player?.getSpeedBoostRemainingRatio?.(performance.now()) ?? 0;
  const speedDot = levelManager.getSpeedDot();

  if (runHudLevelEl) runHudLevelEl.textContent = String(progress.currentLevel);
  if (runHudOpinionEl) runHudOpinionEl.textContent = String(state.score);
  if (runHudWaveTextEl) runHudWaveTextEl.textContent = progress.isComplete ? "CLEAR" : `${percent}%`;
  if (runHudWaveBarEl) runHudWaveBarEl.style.transform = `scaleX(${progress.progressRatio})`;
  if (runHudOnionsEl) runHudOnionsEl.textContent = `${progress.clearedOnions}/${progress.totalOnions}`;
  if (runHudOnionsLeftEl) runHudOnionsLeftEl.textContent = `${progress.remainingOnions} left`;
  if (runHudQueuedEl) runHudQueuedEl.textContent = String(progress.queuedOnions);
  if (runHudBoostEl) runHudBoostEl.textContent = boostRatio > 0 ? `${Math.ceil(boostRatio * 100)}%` : "READY";
  if (runHudDotEl) runHudDotEl.textContent = speedDot ? "FIELD" : "WAIT";
}

function stopAllAudio() {
  audio.stopAllAudio();
}



let WORLD_WIDTH = 0;
let WORLD_HEIGHT = 0;
let resizeTimeoutId = null;
const SPRITE_BASE_SIZE = 614;

function updateSpriteScale() {
  if (!window) return;
  if (!touchEnabled) {
    window.SPRITE_SCALE = 1;
    return;
  }
  const minDim = Math.min(WORLD_WIDTH, WORLD_HEIGHT);
  const rawScale = minDim / SPRITE_BASE_SIZE;
  const clamped = Math.max(0.6, Math.min(1.2, rawScale));
  window.SPRITE_SCALE = clamped;
}

function updateWorldSize() {
  const { width, height } = refreshWorldSize(canvas, ctx, layoutEl, gameWrapEl);
  WORLD_WIDTH = width;
  WORLD_HEIGHT = height;
}

updateWorldSize();
updatePlayersPanelAlignment();

// ----------------------------------------------------------
// BACKGROUND (static, low-contrast)
// ----------------------------------------------------------
let backgroundCanvas = buildBackground(WORLD_WIDTH, WORLD_HEIGHT);

function applyWorldResize() {
  updateWorldSize();
  updateSpriteScale();
  backgroundCanvas = buildBackground(WORLD_WIDTH, WORLD_HEIGHT);

  if (levelManager) {
    levelManager.worldWidth = WORLD_WIDTH;
    levelManager.worldHeight = WORLD_HEIGHT;
    if (levelManager.arena) {
      levelManager.arena.width = WORLD_WIDTH;
      levelManager.arena.height = WORLD_HEIGHT;
      levelManager.arena.cx = WORLD_WIDTH / 2;
      levelManager.arena.cy = WORLD_HEIGHT / 2;
      levelManager.arena.setShape(levelManager.arena.getShape(), {
        rotation: levelManager.arena.rotation,
        rotationSpeed: levelManager.arena.rotationSpeed
      });
    }
  }

  if (player) {
    player.worldWidth = WORLD_WIDTH;
    player.worldHeight = WORLD_HEIGHT;
    if (player.arena && levelManager?.arena) {
      player.arena = levelManager.arena;
    }
  }

  for (const onion of onions) {
    onion.worldWidth = WORLD_WIDTH;
    onion.worldHeight = WORLD_HEIGHT;
    if (onion.arena && levelManager?.arena) {
      onion.arena = levelManager.arena;
    }
  }

  if (player) {
    for (const bullet of player.bullets) {
      bullet.worldWidth = WORLD_WIDTH;
      bullet.worldHeight = WORLD_HEIGHT;
      if (bullet.arena && levelManager?.arena) {
        bullet.arena = levelManager.arena;
      }
    }
  }

  updatePlayersPanelAlignment();
}

window.addEventListener("resize", () => {
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId);
  }
  resizeTimeoutId = setTimeout(() => {
    resizeTimeoutId = null;
    applyWorldResize();
  }, 150);
});


// ----------------------------------------------------------
// INPUT + LEVEL MANAGEMENT
// ----------------------------------------------------------
const touchEnabled = isTouchDevice();
if (touchEnabled) {
  document.body.classList.add("is-touch");
  if (touchControlsEl) {
    touchControlsEl.setAttribute("aria-hidden", "false");
  }
  if (mobileWarningEl) {
    mobileWarningEl.classList.remove("visible");
  }
}
const PLAYER_SPEED_DESKTOP = 300;
const PLAYER_SPEED_MOBILE = 160;
const BULLET_SPEED_FACTOR_DESKTOP = 2.2;
const BULLET_SPEED_FACTOR_MOBILE = 2.4;

window.PLAYER_BASE_SPEED = touchEnabled ? PLAYER_SPEED_MOBILE : PLAYER_SPEED_DESKTOP;
window.BULLET_SPEED_FACTOR = touchEnabled ? BULLET_SPEED_FACTOR_MOBILE : BULLET_SPEED_FACTOR_DESKTOP;
window.BULLET_BASE_SPEED = window.PLAYER_BASE_SPEED * window.BULLET_SPEED_FACTOR;
updateSpriteScale();

const input = new Input({
  fireBtnEl: touchEnabled ? touchFireBtnEl : null,
  upBtnEl: touchEnabled ? touchUpBtnEl : null,
  downBtnEl: touchEnabled ? touchDownBtnEl : null,
  leftBtnEl: touchEnabled ? touchLeftBtnEl : null,
  rightBtnEl: touchEnabled ? touchRightBtnEl : null
});
const levelConfigResponse = await fetch(withAssetVersion("./config/levels.json"));
const levelConfig = await levelConfigResponse.json();
const levelManager = new LevelManager(ctx, WORLD_WIDTH, WORLD_HEIGHT, levelConfig);
window.reloadLevelConfig = async (path = "./config/levels.json") => {
  const response = await fetch(withAssetVersion(path));
  const nextConfig = await response.json();
  levelManager.setConfig(nextConfig);
  resetGame(levelManager.currentLevel, false);
  return nextConfig;
};

function formatScaleList(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "");
}

function buildGotoRows() {
  const rows = [];
  const tables = Array.isArray(levelManager.piTable) ? levelManager.piTable : [];
  let levelCounter = 1;
  for (const entry of tables) {
    const levels = Array.isArray(entry.levels) ? entry.levels : [];
    for (const levelEntry of levels) {
      const arenaShape = levelEntry?.arenaShape ?? entry?.arenaShape ?? "rect";
      const maxAlive = Number(levelEntry?.maxAliveOnions) || 0;
      const totalOnions = Number(levelEntry?.totalOnions) || 0;
      const spawnIntervalMs = Number(levelEntry?.spawnIntervalMs) || 0;
      rows.push({
        level: levelCounter,
        pi: `Wave ${levelCounter}`,
        arena: arenaShape,
        bounces: levelEntry?.bulletBounces ?? 0,
        onions: `${maxAlive}/${totalOnions} @ ${spawnIntervalMs}ms`,
        speed: formatScaleList(levelEntry?.onionSpeedScale ?? []),
        chase: formatScaleList(levelEntry?.onionChaseSpeedScale ?? [])
      });
      levelCounter += 1;
    }
  }
  return rows;
}

function renderGotoTable(rows) {
  if (!gotoTable) return;
  const tbody = gotoTable.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.level = String(row.level);
    tr.innerHTML = `
      <td>${row.level}</td>
      <td>${row.pi}</td>
      <td>${row.arena}</td>
      <td>${row.bounces}</td>
      <td>${row.onions}</td>
      <td>${row.speed}</td>
      <td>${row.chase}</td>
    `;
    tbody.appendChild(tr);
  });
}

function showGotoOverlay() {
  if (!gotoOverlay || gotoOverlay.classList.contains("visible")) return;
  renderGotoTable(buildGotoRows());
  gotoResumeAllowed = engine.running && !isPaused && !gameoverOverlay?.classList.contains("visible") && !levelOverlay?.classList.contains("visible");
  engine.stop();
  gotoOverlay.classList.add("visible");
  updatePlayersPanelVisibility();
}

function hideGotoOverlay({ resume = true } = {}) {
  if (!gotoOverlay) return;
  const wasVisible = gotoOverlay.classList.contains("visible");
  gotoOverlay.classList.remove("visible");
  const shouldResume = resume
    && wasVisible
    && gotoResumeAllowed
    && !isPaused
    && !gameoverOverlay?.classList.contains("visible")
    && !levelOverlay?.classList.contains("visible");
  gotoResumeAllowed = false;
  updatePlayersPanelVisibility();
  if (shouldResume) {
    startEngineIfReady();
  }
}

window.goto = (pi, levelInPi = 1) => {
  const tables = Array.isArray(levelManager.piTable) ? levelManager.piTable : [];
  if (pi == null) {
    showGotoOverlay();
    return;
  }

  const piValue = Number(pi);
  const levelIndex = Number(levelInPi);
  if (!Number.isFinite(piValue) || !Number.isFinite(levelIndex)) return;

  let baseLevel = 1;
  for (const entry of tables) {
    if (Number(entry?.pi) === piValue) {
      const count = Array.isArray(entry.levels) ? entry.levels.length : 0;
      if (count === 0) return;
      const clampedIndex = Math.max(1, Math.min(count, Math.floor(levelIndex)));
      const targetLevel = baseLevel + clampedIndex - 1;
      jumpToLevel(targetLevel);
      return;
    }
    const count = Array.isArray(entry?.levels) ? entry.levels.length : 0;
    baseLevel += count;
  }
};

levelManager.loadLevel(1);

let player = levelManager.getPlayer();
let onions = levelManager.getOnions();


// ----------------------------------------------------------
// RESET GAME STATE
// ----------------------------------------------------------
state.reset();
pendingGameStart = true;
updateRunHud();

function resetGame(level = 1, resetState = true) {
  levelManager.loadLevel(level);
  player = levelManager.getPlayer();
  onions = levelManager.getOnions();
  player.bulletMaxBounces = levelManager.getBulletBounceCount(level);
  if (resetState) state.reset();
  if (resetState) pendingGameStart = true;
  updateRunHud();
}

function showGameOver() {
  hideGotoOverlay({ resume: false });
  hideLevelOverlay();
  clearLevelToast({ fadeAudio: true });
  if (!gameoverOverlay) return;
  updatePlayersPanelVisibility();
  addScreenShake(0.24);
  triggerGameFlash("rgba(255, 70, 70, 1)", 0.16);
  stopAllAudio();
  stopGameOverSfx();
  playGameOverSfx();
  if (gameoverScoreEl) gameoverScoreEl.textContent = `Opinion: ${state.score}`;
  if (gameoverTimeEl) gameoverTimeEl.textContent = `Time: ${formatTime(state.gameTime)}`;
  updateContinueButton();
  gameoverOverlay.classList.add("visible");

  if (state.score > stats.maxScore) {
    stats.maxScore = state.score;
    localStorage.setItem(STATS_KEYS.maxScore, String(stats.maxScore));
  }
  syncMaxLevelStat();
}

function formatTime(totalSeconds) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function hideGameOver() {
  if (!gameoverOverlay) return;
  gameoverOverlay.classList.remove("visible");
  updatePlayersPanelVisibility();
}

function updateContinueButton() {
  const remaining = Math.max(0, MAX_CONTINUES - continueUses);
  const labelEl = continueInfoEl?.querySelector(".continue-label");

  if (continueIconsEl) {
    continueIconsEl.innerHTML = "";
  }

  if (remaining <= 0) {
    if (labelEl) {
      labelEl.textContent = "ZIO LATTE!";
    } else if (continueInfoEl) {
      continueInfoEl.textContent = "ZIO LATTE!";
    }
  } else if (continueIconsEl) {
    if (labelEl) {
      labelEl.textContent = "Continues:";
    }
    for (let i = 0; i < remaining; i += 1) {
      const img = document.createElement("img");
      const src = withAssetVersion("./assets/pi_chan_small.png");
      img.src = src;
      img.alt = "Continue";
      img.className = "continue-icon";
      continueIconsEl.appendChild(img);
    }
  } else if (continueInfoEl) {
    continueInfoEl.textContent = `Continues: ${remaining}`;
  }
  if (playAgainBtn) {
    playAgainBtn.textContent = remaining <= 0 ? "Play Now" : "Play Again";
  }
  if (!continueBtn) return;
  if (remaining <= 0) {
    continueBtn.style.display = "none";
  } else {
    continueBtn.style.display = "";
  }
}

function preloadLevelOnionSprites() {
  if (levelOnionPreloadPromise) return levelOnionPreloadPromise;
  const rightSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/onion_dx.small.png")
    : "./assets/onion_dx.small.png";
  const leftSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/onion_sx.small.png")
    : "./assets/onion_sx.small.png";
  levelOnionPreloadPromise = preloadImages([rightSrc, leftSrc]).then(() => {
    levelOnionPreloadDone = true;
  });
  return levelOnionPreloadPromise;
}

function showLevelOverlay(level) {
  if (!levelOverlay || !levelTitleEl || !levelInfoEl) return;
  if (levelOverlayPending) return;
  levelOverlayPending = true;

  const rightSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/onion_dx.small.png")
    : "./assets/onion_dx.small.png";
  const leftSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/onion_sx.small.png")
    : "./assets/onion_sx.small.png";

  const applyOverlay = () => {
    levelOverlayPending = false;
    const levelCfg = levelManager.getLevelConfig(level);
    levelTitleEl.textContent = `Wave ${Math.max(1, level)} · ${levelCfg?.arenaShape || "rect"}`;
    levelInfoEl.textContent = `Opinion: ${state.score} | Time: ${formatTime(state.gameTime)} | Onions: ${levelCfg?.maxAliveOnions ?? 0}/${levelCfg?.totalOnions ?? 0} | Cadence: ${levelCfg?.spawnIntervalMs ?? 0}ms`;
    const levelOnionEl = document.getElementById("level-onion");
    if (levelOnionEl) {
      levelOnionDirection = 1;
      levelOnionEl.src = rightSrc;
      if (!levelOnionAnimHandler) {
        levelOnionAnimHandler = () => {
          levelOnionDirection *= -1;
          levelOnionEl.src = levelOnionDirection > 0 ? rightSrc : leftSrc;
        };
        levelOnionEl.addEventListener("animationiteration", levelOnionAnimHandler);
      }
      levelOnionEl.style.animation = "none";
      levelOnionEl.offsetHeight;
      levelOnionEl.style.animation = "";
    }

    if (levelOverlayTimeoutId) clearTimeout(levelOverlayTimeoutId);
    levelOverlayTimeoutId = setTimeout(() => {
      hideLevelOverlay();
      fadeBgm(audio.BGM_BASE_VOLUME, 800);
      startEngineIfReady();
    }, LEVEL_START_DELAY_MS);

    levelOverlay.classList.add("visible");
    updatePlayersPanelVisibility();
  };

  if (!levelOnionPreloadDone) {
    preloadLevelOnionSprites().then(applyOverlay);
    return;
  }
  applyOverlay();

}

function hideLevelOverlay() {
  if (levelOverlayTimeoutId) {
    clearTimeout(levelOverlayTimeoutId);
    levelOverlayTimeoutId = null;
  }
  if (!levelOverlay) return;
  audio.stopLevelupSfx();
  levelOverlay.classList.remove("visible");
  updatePlayersPanelVisibility();
}

function jumpToPressureIndex(pi) {
  const level = PI_START_LEVEL[pi];
  if (!level) return;
  jumpToLevel(level);
}

function jumpToLevel(level) {
  engine.stop();
  hideGotoOverlay({ resume: false });
  hideGameOver();
  hideLevelOverlay();
  clearLevelToast({ fadeAudio: true });
  resetGame(level, true);
  continueUses = 0;
  updateContinueButton();
  stopGameOverSfx();
  startBgmOnce();
  fadeBgm(audio.BGM_BASE_VOLUME, 300);
  startEngineIfReady();
}

function isOverlayActive() {
  const gameOverVisible = gameoverOverlay?.classList.contains("visible");
  const levelVisible = levelOverlay?.classList.contains("visible");
  const gotoVisible = gotoOverlay?.classList.contains("visible");
  return Boolean(gameOverVisible || levelVisible || gotoVisible);
}

function updatePlayersPanelVisibility() {
  if (!playersPanelEl || !onlineService.hasPlayersPanel) {
    if (playersPanelEl) {
      playersPanelEl.classList.remove("is-visible");
    }
    layoutEl?.classList.remove("has-players-panel");
    if (playersPanelLayoutVisible) {
      playersPanelLayoutVisible = false;
      requestAnimationFrame(() => applyWorldResize());
    }
    return;
  }
  const shouldShow = (engine.running || isPaused) && !isOverlayActive();
  playersPanelEl.classList.toggle("is-visible", shouldShow);
  layoutEl?.classList.toggle("has-players-panel", shouldShow);
  if (playersPanelLayoutVisible !== shouldShow) {
    playersPanelLayoutVisible = shouldShow;
    requestAnimationFrame(() => applyWorldResize());
  }
}

function updatePlayersPanelAlignment() {
  if (!canvas || !layoutEl) return;
  const canvasRect = canvas.getBoundingClientRect();
  const layoutRect = layoutEl.getBoundingClientRect();
  const offsetTop = Math.max(0, Math.round(canvasRect.top - layoutRect.top));
  const panelHeight = `${Math.max(0, Math.round(canvasRect.height))}px`;

  if (runHudEl) {
    runHudEl.style.marginTop = `${offsetTop}px`;
    runHudEl.style.maxHeight = panelHeight;
  }
  if (playersPanelEl && onlineService.hasPlayersPanel) {
    playersPanelEl.style.marginTop = `${offsetTop}px`;
    playersPanelEl.style.maxHeight = panelHeight;
  }
}

function getRenderPattern(ctx, image) {
  if (!ctx || !image) return null;
  const key = image.currentSrc || image.src;
  const cached = renderPatternCache.get(key);
  if (cached) return cached;
  const pattern = ctx.createPattern(image, "repeat");
  if (pattern) renderPatternCache.set(key, pattern);
  return pattern;
}

function fillTexturedRect(ctx, assetId, x, y, width, height) {
  const image = getRenderAssetImage(assetId);
  const pattern = getRenderPattern(ctx, image);
  if (!pattern) return false;

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, Math.ceil(width), Math.ceil(height));
  ctx.restore();
  return true;
}

function drawArenaPath(ctx, points) {
  if (!points?.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function drawFallbackAsphalt(ctx, x, y, width, height) {
  ctx.save();
  const road = ctx.createLinearGradient(x, y, x, y + height);
  road.addColorStop(0, "#30302f");
  road.addColorStop(1, "#1b1c1b");
  ctx.fillStyle = road;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "rgba(255, 246, 190, 0.68)";
  const dashW = Math.max(4, Math.floor(Math.min(width, height) * 0.04));
  if (height >= width) {
    const cx = x + width * 0.5 - dashW * 0.5;
    for (let yy = y + 8; yy < y + height; yy += 44) ctx.fillRect(cx, yy, dashW, 20);
  } else {
    const cy = y + height * 0.5 - dashW * 0.5;
    for (let xx = x + 8; xx < x + width; xx += 44) ctx.fillRect(xx, cy, 20, dashW);
  }
  ctx.restore();
}

function drawOutsideTerrain(ctx) {
  const dirtReady = fillTexturedRect(ctx, "tiles.outsideDirt", 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  if (!dirtReady) {
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      ctx.fillStyle = "#1c1d18";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
  }

  const laneW = Math.max(58, WORLD_WIDTH * 0.15);
  const laneH = Math.max(58, WORLD_HEIGHT * 0.15);
  const asphaltReady = getRenderAssetImage("tiles.outsideAsphalt");
  if (asphaltReady) {
    fillTexturedRect(ctx, "tiles.outsideAsphalt", WORLD_WIDTH * 0.5 - laneW * 0.5, 0, laneW, WORLD_HEIGHT);
    fillTexturedRect(ctx, "tiles.outsideAsphalt", 0, WORLD_HEIGHT * 0.5 - laneH * 0.5, WORLD_WIDTH, laneH);
  } else {
    drawFallbackAsphalt(ctx, WORLD_WIDTH * 0.5 - laneW * 0.5, 0, laneW, WORLD_HEIGHT);
    drawFallbackAsphalt(ctx, 0, WORLD_HEIGHT * 0.5 - laneH * 0.5, WORLD_WIDTH, laneH);
  }
}

function drawFallbackArenaFloor(ctx) {
  ctx.fillStyle = "#111517";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = "#283034";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArenaFloor(ctx, arena) {
  if (!arena?.points?.length) return;

  ctx.save();
  drawArenaPath(ctx, arena.points);
  ctx.clip();
  if (!fillTexturedRect(ctx, "tiles.arenaFloor", 0, 0, WORLD_WIDTH, WORLD_HEIGHT)) {
    drawFallbackArenaFloor(ctx);
  }
  ctx.restore();
}

function getArenaGates(arena) {
  if (!arena?.points?.length) return [];
  const gates = [];
  const points = arena.points;

  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    if (length < 48) continue;

    const normal = arena.normals?.[i] || { x: 0, y: 1 };
    const tangentX = dx / length;
    const tangentY = dy / length;
    gates.push({
      x: (p1.x + p2.x) * 0.5,
      y: (p1.y + p2.y) * 0.5,
      length: Math.min(92, Math.max(54, length * 0.22)),
      wallLength: length,
      angle: Math.atan2(dy, dx),
      tangentX,
      tangentY,
      normalX: normal.x,
      normalY: normal.y,
      p1,
      p2
    });
  }

  return gates;
}

function drawWallRun(ctx, startX, width, thickness) {
  if (width <= 0) return;
  if (fillTexturedRect(ctx, "tiles.wallStraight", startX, -thickness * 0.5, width, thickness)) return;

  ctx.fillStyle = "#68645e";
  ctx.fillRect(startX, -thickness * 0.5, width, thickness);
  ctx.fillStyle = "#949085";
  ctx.fillRect(startX, -thickness * 0.5, width, 3);
  ctx.fillStyle = "#30302d";
  ctx.fillRect(startX, thickness * 0.5 - 4, width, 4);
}

function drawGate(ctx, gate, thickness) {
  const horizontal = Math.abs(Math.cos(gate.angle)) >= Math.abs(Math.sin(gate.angle));
  const image = getRenderAssetImage(horizontal ? "tiles.gateHorizontal" : "tiles.gateVertical");

  if (image) {
    ctx.save();
    ctx.translate(gate.x, gate.y);
    if (horizontal) {
      ctx.drawImage(image, -gate.length * 0.5, -thickness * 0.62, gate.length, thickness * 1.24);
    } else {
      ctx.drawImage(image, -thickness * 0.62, -gate.length * 0.5, thickness * 1.24, gate.length);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.rotate(gate.angle);
  ctx.fillStyle = "#191b1d";
  ctx.fillRect(-gate.length * 0.5, -thickness * 0.62, gate.length, thickness * 1.24);
  ctx.fillStyle = "#f1cf68";
  for (let x = -gate.length * 0.5 + 8; x < gate.length * 0.5 - 6; x += 16) {
    ctx.fillRect(x, -thickness * 0.42, 7, thickness * 0.84);
  }
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2;
  ctx.strokeRect(-gate.length * 0.5, -thickness * 0.62, gate.length, thickness * 1.24);
  ctx.restore();
}

function drawWallCorner(ctx, x, y, size) {
  const image = getRenderAssetImage("tiles.wallCorner");
  ctx.save();
  ctx.translate(x, y);
  if (image) {
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
  } else {
    ctx.fillStyle = "#7a766e";
    ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
    ctx.strokeStyle = "#292a28";
    ctx.lineWidth = 2;
    ctx.strokeRect(-size * 0.5, -size * 0.5, size, size);
  }
  ctx.restore();
}

function drawArenaWallsAndGates(ctx, arena, gates) {
  if (!arena?.points?.length) return;
  const thickness = Math.max(14, Math.min(22, WORLD_WIDTH * 0.032));

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
  ctx.shadowBlur = 8;
  for (const gate of gates) {
    const gap = gate.length;
    const leftWidth = (gate.wallLength - gap) * 0.5;
    const rightStart = leftWidth + gap;

    ctx.save();
    ctx.translate(gate.p1.x, gate.p1.y);
    ctx.rotate(gate.angle);
    drawWallRun(ctx, 0, leftWidth, thickness);
    drawWallRun(ctx, rightStart, gate.wallLength - rightStart, thickness);
    ctx.restore();
  }
  ctx.restore();

  for (const gate of gates) {
    drawGate(ctx, gate, thickness);
  }

  for (const point of arena.points) {
    drawWallCorner(ctx, point.x, point.y, thickness * 1.1);
  }
}

function drawQueuedOnionPreview(ctx, x, y, size, now, index) {
  const image = getRenderAssetImage("sprites.onionQueued") || getRenderAssetImage("sprites.onionIdle");
  const bob = Math.sin((now || 0) / 260 + index * 0.8) * 1.5;

  ctx.save();
  ctx.translate(Math.floor(x) + 0.5, Math.floor(y + bob) + 0.5);
  ctx.globalAlpha = 0.9;
  if (image) {
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
  } else {
    ctx.fillStyle = "#9f4e32";
    ctx.beginPath();
    ctx.arc(0, 2, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d37a42";
    ctx.beginPath();
    ctx.arc(-size * 0.08, -size * 0.02, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#72b35f";
    ctx.fillRect(-2, -size * 0.45, 4, size * 0.22);
    ctx.strokeStyle = "#2b1a12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 2, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawQueuedOnionPreviews(ctx, gates, progress, now) {
  if (!gates.length || !progress) return;
  const queuedCount = Math.max(0, Number(progress.queuedOnions) || 0);
  const size = Math.max(18, Math.min(30, WORLD_WIDTH * 0.046));

  for (let i = 0; i < queuedCount; i += 1) {
    const gate = gates[i % gates.length];
    const row = Math.floor(i / gates.length);
    const laneOffset = ((row % 3) - 1) * size * 0.78;
    const depth = size * 0.9 + row * size * 0.72;
    const outsideX = -gate.normalX;
    const outsideY = -gate.normalY;
    const x = gate.x + outsideX * depth + gate.tangentX * laneOffset;
    const y = gate.y + outsideY * depth + gate.tangentY * laneOffset;
    drawQueuedOnionPreview(ctx, x, y, size, now, i);
  }
}


// ==========================================================
// UPDATE — logica del gioco
// ==========================================================
function update(dt, now) {

  // input frame (tap mobile + merge stati)
  input.beginFrame();

  screenFx.trauma = Math.max(0, screenFx.trauma - dt * 1.9);
  const shakeStrength = screenFx.trauma * screenFx.trauma * 18;
  screenFx.offsetX = shakeStrength > 0.01 ? (Math.random() * 2 - 1) * shakeStrength : 0;
  screenFx.offsetY = shakeStrength > 0.01 ? (Math.random() * 2 - 1) * shakeStrength : 0;
  screenFx.flashAlpha = Math.max(0, screenFx.flashAlpha - dt * 1.6);
  // 1) tempo
  state.gameTime += dt;
  if (!isOverlayActive() && !isPaused) {
    playMs += dt * 1000;
  }
  onlineService.updateGameState({
    level: levelManager.currentLevel,
    score: state.score
  }, now);
  onlineService.writeStats({
    totalScore: state.score,
    maxLevel: stats.maxLevel,
    gamesPlayed: stats.games,
    totalPlayMs: Math.floor(playMs)
  }, now);

  // 1b) chase feedback (solo flash onion + BGM boost)
  const chaseEnd = window.chaseEndTime || 0;
  const remainingMs = Math.max(0, chaseEnd - now);
  if (remainingMs > 0) {
    window.chaseFlashActive = remainingMs <= 3000;
    if (chaseEnd > lastChaseEndTime) {
      lastChaseEndTime = chaseEnd;
      fadeBgm(audio.BGM_CHASE_VOLUME, 200);
    }
  } else {
    window.chaseFlashActive = false;
    if (lastChaseEndTime !== 0) {
      lastChaseEndTime = 0;
      fadeBgm(audio.BGM_BASE_VOLUME, 300);
    }
  }

  // 2) player
  player.update(dt, input, now);
  window.isShooting = now - (window.lastPlayerShot ?? Number.NEGATIVE_INFINITY) < 120;
  updateTitleFromState(now);

  // 3) onions
  for (const o of onions) o.update(dt, now);
  onions = levelManager.removeInactiveOnions();
  levelManager.updateWave(now);
  onions = levelManager.getOnions();
  levelManager.updateSpeedDot(now);

  // 3b) collisioni BULLET → PLAYER (game over)
  let hitPlayer = false;
  for (const bullet of player.bullets) {
    if (!bullet.alive) continue;
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const distSq = dx * dx + dy * dy;
    const rr = (player.r + bullet.r) ** 2;
    if (distSq < rr) {
      bullet.alive = false;
      hitPlayer = true;
      break;
    }
  }
  if (hitPlayer) {
    showGameOver();
    engine.stop();
    input.endFrame();
    return;
  }

  // level up quando il budget della wave è esaurito e non restano onion visibili
  if (levelManager.isWaveComplete()) {
    const nextLevel = levelManager.currentLevel + 1;
    addScreenShake(0.2);
    triggerGameFlash("rgba(255, 245, 210, 1)", 0.14);
    resetGame(nextLevel, false);
    syncMaxLevelStat();
    playLevelupSfx();
    showLevelToast(nextLevel);
    updateRunHud();
    input.endFrame();
    return;
  }

  // 4) collisioni BULLET → ONION
  for (const bullet of player.bullets) {
    if (!bullet.alive) continue;

    for (const o of onions) {
      if (!o.alive || o.dying) continue;

      const dx = o.x - bullet.x;
      const dy = o.y - bullet.y;

      const distSq = dx*dx + dy*dy;
      const rr = (o.r + bullet.r) ** 2;

      if (distSq < rr) {
        // bullet scompare subito
        bullet.alive = false;
        bullet.fade = 0;

        state.onionsKilled++;
        state.score += 1;

        // knockback onion
        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;

        o.knockbackX = nx * 480;
        o.knockbackY = ny * 480;
        o.startDeathFade();
        player.explosions.push(new Explosion(o.x, o.y, ctx, {
          duration: 0.28,
          maxRadius: 44,
          innerColor: [255, 245, 220],
          midColor: [255, 110, 90],
          outerColor: [210, 30, 60],
          shadowColor: "rgba(255, 120, 80, 0.9)",
          shadowBlur: 22,
          sparkCount: 9,
          sparkLength: 20
        }));
        addScreenShake(0.12);
        triggerGameFlash("rgba(255, 170, 120, 1)", 0.1);
        playOnionDeathSfx();
        flashTitleOpinion(now);

        break;
      }
    }
    if (!bullet.alive) continue;
  }

  // 4b) collisioni SPEED DOT → PI-CHAN / ONION assegnata
  resolveSpeedDotPickup(now);

  // 5) collisioni ONION ↔ PLAYER
  for (const o of onions) {
    if (!o.alive || o.dying) continue;

    // game over se onion tocca il player
    const dx = player.x - o.x;
    const dy = player.y - o.y;
    const distSq = dx * dx + dy * dy;
    const rr = (player.r + o.r) ** 2;
    if (distSq < rr) {
      showGameOver();
      engine.stop();
      input.endFrame();
      return;
    }

    const res = resolveCircleCircle(
      player.x, player.y, player.r,
      o.x, o.y, o.r
    );

    player.x = res.ax;
    player.y = res.ay;

    o.x = res.bx;
    o.y = res.by;
  }

  // 6) collisioni ONION ↔ ONION (evita sovrapposizioni)
  const n = onions.length;
  for (let i = 0; i < n; i++) {
    const a = onions[i];
    if (!a.alive || a.dying) continue;
    for (let j = i + 1; j < n; j++) {
      const b = onions[j];
      if (!b.alive || b.dying) continue;

      const res = resolveCircleCircle(
        a.x, a.y, a.r,
        b.x, b.y, b.r
      );

      a.x = res.ax;
      a.y = res.ay;
      b.x = res.bx;
      b.y = res.by;
    }
  }

  updateRunHud();
  input.endFrame();
}


// ==========================================================
// DRAW — grafica
// ==========================================================
function draw(now) {
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const arena = levelManager.arena;

  ctx.save();
  ctx.translate(screenFx.offsetX, screenFx.offsetY);

  if (arena && arena.points.length) {
    const gates = getArenaGates(arena);
    const progress = levelManager.getWaveProgress();

    drawOutsideTerrain(ctx);
    drawArenaFloor(ctx, arena);
    drawArenaWallsAndGates(ctx, arena, gates);
    drawQueuedOnionPreviews(ctx, gates, progress, now);
    drawSpeedDot(ctx, levelManager.getSpeedDot(), now);
    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx, now);
  } else {
    drawOutsideTerrain(ctx);
    drawSpeedDot(ctx, levelManager.getSpeedDot(), now);
    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx, now);
  }

  ctx.restore();

  if (screenFx.flashAlpha > 0.001) {
    ctx.save();
    ctx.globalAlpha = screenFx.flashAlpha;
    ctx.fillStyle = screenFx.flashColor;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.restore();
  }
}

// ==========================================================
// ENGINE SETUP
// ==========================================================
const engine = new Engine(update, draw);
const lifecycle = createLifecycle({
  engine,
  getIsPaused: () => isPaused,
  setIsPaused: (next) => {
    isPaused = Boolean(next);
  },
  isOverlayActive,
  startEngineIfReady,
  updatePlayersPanelVisibility,
  pauseAudio: () => {
    if (bgmEl) bgmEl.pause();
  },
  resumeAudio: () => {
    if (bgmEl) {
      bgmEl.play().catch(() => {});
    }
  }
});
// Mobile ora supportato tramite controlli touch: non bloccare il gioco.
if (mobileWarningEl) {
  mobileWarningEl.classList.remove("visible");
}
const ASSET_IMAGES = [
  "./assets/pi_chan_small.png",
  "./assets/pi_chan_dx_small.png",
  "./assets/pi_chan_sx_small.png",
  "./assets/pi_chan_up_small.png",
  "./assets/pi_chan_down_small.png",
  "./assets/onion.small.png",
  "./assets/onion_dx.small.png",
  "./assets/onion_sx.small.png",
  "./assets/onion_up.small.png",
  "./assets/onion_down.small.png",
  "./assets/onion_dx.small_chase.png",
  "./assets/onion_sx.small_chase.png",
  "./assets/onion_up.small_chase.png",
  "./assets/onion_down.small_chase.png"
].map(withAssetVersion);

function preloadImages(paths) {
  return Promise.all(paths.map((src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  })));
}

await Promise.all([
  preloadImages(ASSET_IMAGES),
  renderAssets.loadAll()
]);
const missingRenderAssets = renderAssets.getMissing();
if (missingRenderAssets.length > 0) {
  console.info("[render-assets] optional PNG assets missing; using canvas fallbacks", missingRenderAssets);
}
assetsLoaded = true;
startEngineIfReady();


// ----------------------------------------------------------
// RESET — tasto R
// ----------------------------------------------------------
window.addEventListener("keydown", (e) => {
  startBgmOnce();
  if (e.key === "r" || e.key === "R") {
    resetGame(1);
  }
  if (e.key === "p" || e.key === "P") {
    if (isOverlayActive()) return;
    if (isPaused) lifecycle.resumeGame();
    else lifecycle.pauseGame();
  }

});

window.addEventListener("pointerdown", () => {
  startBgmOnce();
});

let gotoKeyHits = [];
window.addEventListener("keydown", (event) => {
  if (event.key === "x" || event.key === "X") {
    const now = performance.now();
    gotoKeyHits = gotoKeyHits.filter((t) => now - t < 800);
    gotoKeyHits.push(now);
    if (gotoKeyHits.length >= 3) {
      gotoKeyHits = [];
      window.goto();
    }
  }
});

if (gotoCloseBtn) {
  gotoCloseBtn.addEventListener("click", () => {
    hideGotoOverlay({ resume: true });
  });
}

if (gotoOverlay) {
  gotoOverlay.addEventListener("click", (event) => {
    if (event.target === gotoOverlay) {
      hideGotoOverlay({ resume: true });
    }
  });
}

if (gotoTable) {
  gotoTable.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-level]");
    if (!row) return;
    const level = Number(row.dataset.level);
    if (!Number.isFinite(level)) return;
    if (gotoInput) gotoInput.value = String(level);
    hideGotoOverlay({ resume: false });
    jumpToLevel(level);
  });
}

if (gotoApplyBtn) {
  gotoApplyBtn.addEventListener("click", () => {
    const target = Number(gotoInput?.value);
    if (!Number.isFinite(target)) return;
    hideGotoOverlay({ resume: false });
    jumpToLevel(Math.floor(target));
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (gotoOverlay?.classList.contains("visible")) {
    hideGotoOverlay({ resume: true });
  }
});

window.addEventListener("blur", () => {
  lifecycle.handleBlur();
});

window.addEventListener("focus", () => {
  lifecycle.handleFocus();
});

if (playAgainBtn) {
  playAgainBtn.addEventListener("click", () => {
    hideGameOver();
    resetGame(1);
    continueUses = 0;
    updateContinueButton();
    stopGameOverSfx();
    if (bgmEl) {
      bgmEl.currentTime = 0;
      bgmEl.play().catch(() => {});
    }
    fadeBgm(audio.BGM_BASE_VOLUME, 800);
    startEngineIfReady();
  });
}

if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    if (continueUses >= MAX_CONTINUES) return;
    hideGameOver();
    resetGame(levelManager.currentLevel, false);
    continueUses += 1;
    updateContinueButton();
    stopGameOverSfx();
    if (bgmEl) {
      bgmEl.currentTime = 0;
      bgmEl.play().catch(() => {});
    }
    fadeBgm(audio.BGM_BASE_VOLUME, 800);
    startEngineIfReady();
  });
}

window.addEventListener("pagehide", () => {
  onlineService.dispose();
});
