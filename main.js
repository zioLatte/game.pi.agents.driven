// ==========================================================
// main.js — Punto di integrazione centrale del gioco PI.Onion
// ==========================================================

import { Engine } from "./js/core/Engine.js";
import { Input } from "./js/core/Input.js";
import { LevelManager } from "./js/core/LevelManager.js";
import { resolveArenaGates } from "./js/core/ArenaGates.js";
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
const arenaStartBtn = document.getElementById("arena-start-button");
const arenaStartImg = document.getElementById("arena-start-image");
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
const playersPanelEl = document.getElementById("players-panel");
const runHudEl = document.getElementById("run-hud");
const runHudLevelEl = document.getElementById("run-hud-level");
const runHudWaveTextEl = document.getElementById("run-hud-wave-text");
const runHudWaveBarEl = document.getElementById("run-hud-wave-bar");
const runHudOnionsEl = document.getElementById("run-hud-onions");
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
const PLAYER_DEFEATED_STANDBY_MS = 2000;
const PLAYER_REVIVE_GRACE_MS = 1200;
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
let assetsLoaded = false;
let startPending = false;
let levelOnionAnimHandler = null;
let levelOnionDirection = 1;
let pendingGameStart = true;
let awaitingArenaStartClick = window.PICHAN_WAIT_FOR_ARENA_PLAY === true;
let arenaStartMode = awaitingArenaStartClick ? "initial" : "hidden";
let arenaStartAnimId = null;
const arenaStartMotion = {
  x: 0,
  y: 0,
  vx: 160,
  vy: 112,
  lastNow: 0
};
const playerDefeatState = {
  active: false,
  reviveAt: 0,
  reviveGraceUntil: 0,
  x: 0,
  y: 0
};
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
const PERF_MODE = new URLSearchParams(window.location.search).get("perf") === "1";
const PERF_OPTIONS = {
  bulletTrail: !PERF_MODE,
  bulletShadowBlur: !PERF_MODE,
  explosionSparkScale: PERF_MODE ? 0.35 : 1,
  explosionShadowBlur: !PERF_MODE,
  canvasShellFilter: !PERF_MODE
};
window.PICHAN_PERF_MODE = PERF_MODE;
window.PICHAN_PERF_OPTIONS = PERF_OPTIONS;
if (PERF_MODE) {
  document.body.classList.add("perf-mode");
}

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
  const scale = 1 + pulse * 0.04;
  const size = Math.max(42, dot.r * 4.2);
  const boltImage = getRenderAssetImage("sprites.speedBolt");

  ctx.save();
  ctx.translate(dot.x, dot.y);
  ctx.scale(scale, scale);

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.shadowColor = "rgba(255, 232, 80, 0.58)";
  ctx.shadowBlur = 5 + pulse * 2;
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
const arenaFloorCache = {
  key: "",
  canvas: null
};
window.PICHAN_RENDER_ASSETS = renderAssets;

function withAssetVersion(path) {
  if (!ASSET_VERSION) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}

window.withAssetVersion = withAssetVersion;
if (arenaStartImg) {
  arenaStartImg.src = withAssetVersion("./assets/collage/play.png");
}

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

function getArenaStartAreaSize() {
  const rect = gameWrapEl?.getBoundingClientRect();
  return {
    width: Math.max(1, rect?.width || WORLD_WIDTH || canvas.clientWidth || 1),
    height: Math.max(1, rect?.height || WORLD_HEIGHT || canvas.clientHeight || 1)
  };
}

function getArenaStartButtonSize() {
  const area = getArenaStartAreaSize();
  const rect = arenaStartBtn?.getBoundingClientRect();
  const width = rect?.width || Math.min(area.width * 0.52, 430);
  const height = rect?.height || width * (264 / 760);
  return {
    width: Math.max(1, width),
    height: Math.max(1, height)
  };
}

function positionArenaStartButton(x, y) {
  if (!arenaStartBtn) return;
  arenaStartBtn.style.left = `${Math.round(x)}px`;
  arenaStartBtn.style.top = `${Math.round(y)}px`;
}

function centerArenaStartButton() {
  if (!arenaStartBtn) return;
  arenaStartBtn.style.left = "50%";
  arenaStartBtn.style.top = "50%";
}

function stopArenaStartMotion() {
  if (arenaStartAnimId) {
    cancelAnimationFrame(arenaStartAnimId);
    arenaStartAnimId = null;
  }
  arenaStartMotion.lastNow = 0;
}

function tickArenaStartMotion(now) {
  if (!awaitingArenaStartClick || arenaStartMode !== "restart") {
    stopArenaStartMotion();
    return;
  }

  const area = getArenaStartAreaSize();
  const button = getArenaStartButtonSize();
  const margin = 8;
  const minX = button.width * 0.5 + margin;
  const maxX = Math.max(minX, area.width - button.width * 0.5 - margin);
  const minY = button.height * 0.5 + margin;
  const maxY = Math.max(minY, area.height - button.height * 0.5 - margin);
  const lastNow = arenaStartMotion.lastNow || now;
  const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
  arenaStartMotion.lastNow = now;

  arenaStartMotion.x += arenaStartMotion.vx * dt;
  arenaStartMotion.y += arenaStartMotion.vy * dt;

  if (arenaStartMotion.x <= minX || arenaStartMotion.x >= maxX) {
    arenaStartMotion.x = Math.max(minX, Math.min(maxX, arenaStartMotion.x));
    arenaStartMotion.vx *= -1;
  }
  if (arenaStartMotion.y <= minY || arenaStartMotion.y >= maxY) {
    arenaStartMotion.y = Math.max(minY, Math.min(maxY, arenaStartMotion.y));
    arenaStartMotion.vy *= -1;
  }

  positionArenaStartButton(arenaStartMotion.x, arenaStartMotion.y);
  arenaStartAnimId = requestAnimationFrame(tickArenaStartMotion);
}

function startArenaStartMotion(now = performance.now()) {
  const area = getArenaStartAreaSize();
  arenaStartMotion.x = area.width * 0.28;
  arenaStartMotion.y = area.height * 0.34;
  arenaStartMotion.vx = Math.max(95, area.width * 0.19);
  arenaStartMotion.vy = Math.max(82, area.height * 0.23);
  arenaStartMotion.lastNow = now;
  positionArenaStartButton(arenaStartMotion.x, arenaStartMotion.y);
  if (!arenaStartAnimId) {
    arenaStartAnimId = requestAnimationFrame(tickArenaStartMotion);
  }
}

function setArenaStartVisible(next) {
  if (!arenaStartBtn) return;
  arenaStartBtn.classList.toggle("is-visible", Boolean(next));
  arenaStartBtn.setAttribute("aria-hidden", next ? "false" : "true");
  arenaStartBtn.tabIndex = next ? 0 : -1;
  if (!next) {
    stopArenaStartMotion();
  } else if (arenaStartMode !== "restart") {
    centerArenaStartButton();
  }
}

function drawArenaStartPreview() {
  updateRunHud();
  updatePlayersPanelVisibility();
  draw(performance.now());
}

function drawArenaOnly(now = performance.now()) {
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const arena = levelManager.arena;
  const staticLayer = getStaticRenderLayer(arena);
  if (staticLayer?.canvas) {
    ctx.drawImage(staticLayer.canvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else {
    drawOutsideTerrain(ctx);
  }
}

function startEngineIfReady() {
  if (!assetsLoaded) {
    startPending = true;
    return;
  }
  if (awaitingArenaStartClick) {
    startPending = false;
    setArenaStartVisible(true);
    if (arenaStartMode === "restart") {
      drawArenaOnly();
      startArenaStartMotion();
    } else {
      drawArenaStartPreview();
    }
    return;
  }
  if (engine.running) return;
  startPending = false;
  setArenaStartVisible(false);
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

function startFromArenaPlay() {
  if (!awaitingArenaStartClick) return;
  const wasRestart = arenaStartMode === "restart";
  awaitingArenaStartClick = false;
  arenaStartMode = "hidden";
  window.PICHAN_WAIT_FOR_ARENA_PLAY = false;
  setArenaStartVisible(false);
  if (wasRestart) {
    stopLevelupSfx();
  }
  startBgmOnce();
  startEngineIfReady();
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

function playLevelupSfx() {
  audio.playLevelupSfx();
}

function fadeLevelupSfx(durationMs) {
  audio.fadeLevelupSfx(durationMs);
}

function stopLevelupSfx() {
  audio.stopLevelupSfx();
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

function formatHudRatio(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(1, numericValue));
}

const runHudLastState = {
  level: null,
  onions: null,
  waveText: null,
  waveBarTransform: null
};

function updateRunHud({ force = false } = {}) {
  const progress = levelManager.getWaveProgress();
  const progressRatio = formatHudRatio(progress.progressRatio);
  const nextState = {
    level: String(progress.currentLevel),
    onions: `${progress.activePressureCount} / ${progress.maxAliveOnions}`,
    waveText: `${progress.clearedOnions} / ${progress.totalOnions}`,
    waveBarTransform: `scaleX(${progressRatio})`
  };

  if (runHudLevelEl && (force || runHudLastState.level !== nextState.level)) {
    runHudLevelEl.textContent = nextState.level;
    runHudLastState.level = nextState.level;
  }
  if (runHudOnionsEl && (force || runHudLastState.onions !== nextState.onions)) {
    runHudOnionsEl.textContent = nextState.onions;
    runHudLastState.onions = nextState.onions;
  }
  if (runHudWaveTextEl && (force || runHudLastState.waveText !== nextState.waveText)) {
    runHudWaveTextEl.textContent = nextState.waveText;
    runHudLastState.waveText = nextState.waveText;
  }
  if (runHudWaveBarEl && (force || runHudLastState.waveBarTransform !== nextState.waveBarTransform)) {
    runHudWaveBarEl.style.transform = nextState.waveBarTransform;
    runHudLastState.waveBarTransform = nextState.waveBarTransform;
  }
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
  const minDim = Math.min(WORLD_WIDTH, WORLD_HEIGHT);
  const rawScale = minDim / SPRITE_BASE_SIZE;
  const clamped = Math.max(0.58, Math.min(1.24, rawScale));
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
  invalidateStaticRenderLayer();

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
  if (awaitingArenaStartClick) {
    if (arenaStartMode === "restart") {
      drawArenaOnly();
      startArenaStartMotion();
    } else {
      drawArenaStartPreview();
    }
  }
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
updateRunHud({ force: true });

function resetGame(level = 1, resetState = true, options = {}) {
  playerDefeatState.active = false;
  playerDefeatState.reviveAt = 0;
  playerDefeatState.reviveGraceUntil = 0;
  levelManager.loadLevel(level, {
    playerStartPosition: options?.playerStartPosition ?? null
  });
  invalidateStaticRenderLayer();
  player = levelManager.getPlayer();
  onions = levelManager.getOnions();
  player.setDefeated?.(false);
  player.setReviveGraceUntil?.(0);
  player.bulletMaxBounces = levelManager.getBulletBounceCount(level);
  if (resetState) state.reset();
  if (resetState) pendingGameStart = true;
  updateRunHud({ force: true });
}

function isPlayerDefeated() {
  return playerDefeatState.active || Boolean(player?.defeated);
}

function isPlayerVulnerable(now) {
  const frameNow = Number.isFinite(now) ? now : performance.now();
  return !isPlayerDefeated() && frameNow >= playerDefeatState.reviveGraceUntil;
}

function beginPlayerDefeat(now) {
  if (!player || playerDefeatState.active) return true;

  if (continueUses >= MAX_CONTINUES) {
    beginArenaRestart(now);
    return false;
  }

  const frameNow = Number.isFinite(now) ? now : performance.now();
  continueUses += 1;
  updateContinueButton();

  playerDefeatState.active = true;
  playerDefeatState.reviveAt = frameNow + PLAYER_DEFEATED_STANDBY_MS;
  playerDefeatState.reviveGraceUntil = 0;
  playerDefeatState.x = player.x;
  playerDefeatState.y = player.y;

  player.setDefeated?.(true);
  player.setReviveGraceUntil?.(0);
  player.bullets.length = 0;
  player.shootBuffered = false;

  stopGameOverSfx();
  playGameOverSfx();
  addScreenShake(0.16);
  triggerGameFlash("rgba(255, 235, 180, 1)", 0.1);
  return true;
}

function beginArenaRestart(now = performance.now()) {
  hideGotoOverlay({ resume: false });
  hideGameOver();
  hideLevelOverlay();
  clearLevelToast({ fadeAudio: false });
  stopGameOverSfx();
  stopAllAudio();
  stopLevelupSfx();

  continueUses = 0;
  resetGame(1, true);
  updateContinueButton();

  awaitingArenaStartClick = true;
  arenaStartMode = "restart";
  window.PICHAN_WAIT_FOR_ARENA_PLAY = true;
  pendingGameStart = true;

  addScreenShake(0);
  screenFx.trauma = 0;
  screenFx.offsetX = 0;
  screenFx.offsetY = 0;
  screenFx.flashAlpha = 0;
  drawArenaOnly(now);
  setArenaStartVisible(true);
  startArenaStartMotion(now);
  playLevelupSfx();
  engine.stop();
}

function updatePlayerDefeat(now) {
  if (!playerDefeatState.active || !player) return false;

  player.x = playerDefeatState.x;
  player.y = playerDefeatState.y;
  player.setDefeated?.(true);

  const frameNow = Number.isFinite(now) ? now : performance.now();
  if (frameNow < playerDefeatState.reviveAt) return true;

  playerDefeatState.active = false;
  playerDefeatState.reviveGraceUntil = frameNow + PLAYER_REVIVE_GRACE_MS;
  player.setDefeated?.(false);
  player.setReviveGraceUntil?.(playerDefeatState.reviveGraceUntil);
  addScreenShake(0.06);
  triggerGameFlash("rgba(255, 255, 210, 1)", 0.08);
  return true;
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
      const src = withAssetVersion("./assets/collage/player_idle.png");
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
    ? window.withAssetVersion("./assets/collage/onion_chase.png")
    : "./assets/collage/onion_chase.png";
  const leftSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/collage/onion_idle.png")
    : "./assets/collage/onion_idle.png";
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
    ? window.withAssetVersion("./assets/collage/onion_chase.png")
    : "./assets/collage/onion_chase.png";
  const leftSrc = window.withAssetVersion
    ? window.withAssetVersion("./assets/collage/onion_idle.png")
    : "./assets/collage/onion_idle.png";

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
    runHudEl.style.marginTop = "0";
    runHudEl.style.maxHeight = "none";
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

function drawImageCover(ctx, image, x, y, width, height) {
  if (!ctx || !image || width <= 0 || height <= 0) return false;

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return false;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) * 0.5;
  const dy = y + (height - drawHeight) * 0.5;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  return true;
}

function getArenaRenderKey(arena, paperImage, stainImage) {
  if (!arena?.points?.length) return "";
  const pointKey = arena.points
    .map((point) => `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`)
    .join("|");
  const paperKey = paperImage?.currentSrc || paperImage?.src || "fallback";
  const stainKey = stainImage?.currentSrc || stainImage?.src || "none";
  return `${Math.round(WORLD_WIDTH)}x${Math.round(WORLD_HEIGHT)}:${paperKey}:${stainKey}:${pointKey}`;
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

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawOutsideTerrain(ctx) {
  if (backgroundCanvas) {
    ctx.drawImage(backgroundCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else {
    ctx.fillStyle = "#111426";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = "#fff1ad";
  ctx.lineWidth = 1;
  const step = Math.max(52, Math.min(76, Math.floor(Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.085)));
  for (let x = 0; x <= WORLD_WIDTH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFallbackArenaFloor(ctx) {
  ctx.fillStyle = "#ddd2bc";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const grid = Math.max(18, Math.min(28, Math.floor(Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.035)));

  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = "#8da6b3";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WORLD_WIDTH, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#6b5f52";
  ctx.lineWidth = 2;
  const creaseCount = Math.max(7, Math.floor((WORLD_WIDTH + WORLD_HEIGHT) / 180));
  for (let i = 0; i < creaseCount; i += 1) {
    const x = Math.random() * WORLD_WIDTH;
    const y = Math.random() * WORLD_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 96, y + (Math.random() - 0.5) * 96);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(
    WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.42, Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.16,
    WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, Math.max(WORLD_WIDTH, WORLD_HEIGHT) * 0.72
  );
  vignette.addColorStop(0, "rgba(255, 248, 218, 0.10)");
  vignette.addColorStop(0.64, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(89, 62, 38, 0.18)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.restore();
}

function drawArenaFloor(ctx, arena) {
  if (!arena?.points?.length) return;

  const paperImage = getRenderAssetImage("tiles.arenaFloor");
  const stainImage = getRenderAssetImage("tiles.purpleStain");
  const cacheKey = getArenaRenderKey(arena, paperImage, stainImage);
  if (arenaFloorCache.key === cacheKey && arenaFloorCache.canvas) {
    ctx.drawImage(arenaFloorCache.canvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    return;
  }

  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = Math.max(1, Math.ceil(WORLD_WIDTH));
  floorCanvas.height = Math.max(1, Math.ceil(WORLD_HEIGHT));
  const floorCtx = floorCanvas.getContext("2d");
  if (!floorCtx) return;
  floorCtx.imageSmoothingEnabled = false;

  floorCtx.save();
  drawArenaPath(floorCtx, arena.points);
  floorCtx.clip();
  if (!drawImageCover(floorCtx, paperImage, 0, 0, WORLD_WIDTH, WORLD_HEIGHT)) {
    drawFallbackArenaFloor(floorCtx);
  }
  drawArenaPaperDecoration(floorCtx, arena, stainImage);
  floorCtx.restore();

  arenaFloorCache.key = cacheKey;
  arenaFloorCache.canvas = floorCanvas;
  ctx.drawImage(floorCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

function drawArenaPaperDecoration(ctx, arena, stainImage = getRenderAssetImage("tiles.purpleStain")) {
  if (!arena?.points?.length || !stainImage) return;

  const size = Math.max(58, Math.min(98, Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.13));
  ctx.save();
  drawArenaPath(ctx, arena.points);
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.drawImage(stainImage, WORLD_WIDTH - size * 1.35, WORLD_HEIGHT - size * 1.25, size, size * 0.9);
  ctx.restore();
}

function drawWallRun(ctx, startX, width, thickness) {
  if (width <= 0) return;
  if (fillTexturedRect(ctx, "tiles.wallStraight", startX, -thickness * 0.5, width, thickness)) return;

  const y = -thickness * 0.5;
  const r = Math.min(thickness * 0.32, 8);

  ctx.save();
  roundedRectPath(ctx, startX, y, width, thickness, r);
  const wall = ctx.createLinearGradient(0, y, 0, y + thickness);
  wall.addColorStop(0, "#7d7890");
  wall.addColorStop(0.38, "#4a4a60");
  wall.addColorStop(1, "#272939");
  ctx.fillStyle = wall;
  ctx.fill();

  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "#fff0b1";
  roundedRectPath(ctx, startX + 3, y + 3, Math.max(0, width - 6), Math.max(1, thickness * 0.18), r * 0.5);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#10111e";
  roundedRectPath(ctx, startX, y, width, thickness, r);
  ctx.stroke();
  ctx.restore();
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

  const gateWidth = gate.length;
  const gateHeight = thickness * 1.22;
  const r = Math.min(10, gateHeight * 0.34);

  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.rotate(gate.angle);

  ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  roundedRectPath(ctx, -gateWidth * 0.5, -gateHeight * 0.5, gateWidth, gateHeight, r);
  ctx.fillStyle = "#34304d";
  ctx.fill();

  ctx.shadowColor = "transparent";
  roundedRectPath(ctx, -gateWidth * 0.5 + 4, -gateHeight * 0.5 + 4, gateWidth - 8, gateHeight - 8, Math.max(3, r - 3));
  const inset = ctx.createLinearGradient(0, -gateHeight * 0.5, 0, gateHeight * 0.5);
  inset.addColorStop(0, "#6b6388");
  inset.addColorStop(0.5, "#403b61");
  inset.addColorStop(1, "#252842");
  ctx.fillStyle = inset;
  ctx.fill();

  ctx.fillStyle = "#ffe27a";
  const toothCount = Math.max(3, Math.floor(gateWidth / 18));
  const toothGap = gateWidth / (toothCount + 1);
  for (let i = 1; i <= toothCount; i += 1) {
    const x = -gateWidth * 0.5 + toothGap * i;
    roundedRectPath(ctx, x - 3.2, -gateHeight * 0.28, 6.4, gateHeight * 0.56, 2.5);
    ctx.fill();
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#11111e";
  roundedRectPath(ctx, -gateWidth * 0.5, -gateHeight * 0.5, gateWidth, gateHeight, r);
  ctx.stroke();

  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = "#fff4ba";
  ctx.beginPath();
  ctx.moveTo(-gateWidth * 0.5 + 9, -gateHeight * 0.5 + 5);
  ctx.lineTo(gateWidth * 0.5 - 9, -gateHeight * 0.5 + 5);
  ctx.stroke();
  ctx.restore();
}

function drawWallCorner(ctx, x, y, size) {
  const image = getRenderAssetImage("tiles.wallCorner");
  ctx.save();
  ctx.translate(x, y);
  if (image) {
    ctx.drawImage(image, -size * 0.5, -size * 0.5, size, size);
  } else {
    const box = size * 1.02;
    roundedRectPath(ctx, -box * 0.5, -box * 0.5, box, box, Math.max(4, size * 0.18));
    const corner = ctx.createLinearGradient(0, -box * 0.5, 0, box * 0.5);
    corner.addColorStop(0, "#aaa37f");
    corner.addColorStop(0.45, "#6d6874");
    corner.addColorStop(1, "#35364a");
    ctx.fillStyle = corner;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#11111e";
    roundedRectPath(ctx, -box * 0.5, -box * 0.5, box, box, Math.max(4, size * 0.18));
    ctx.stroke();

    ctx.globalAlpha = 0.52;
    ctx.fillStyle = "#fff0b1";
    roundedRectPath(ctx, -box * 0.33, -box * 0.34, box * 0.66, box * 0.16, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawArenaWallsAndGates(ctx, arena, gates) {
  if (!arena?.points?.length) return;
  const thickness = Math.max(14, Math.min(22, WORLD_WIDTH * 0.032));

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
  ctx.shadowBlur = 10;
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

const staticRenderLayer = {
  key: "",
  canvas: null,
  gates: []
};

function invalidateStaticRenderLayer() {
  staticRenderLayer.key = "";
  staticRenderLayer.canvas = null;
  staticRenderLayer.gates = [];
}

function getStaticAssetKey() {
  return [
    "tiles.arenaFloor",
    "tiles.purpleStain",
    "tiles.wallStraight",
    "tiles.gateHorizontal",
    "tiles.gateVertical",
    "tiles.wallCorner"
  ].map((id) => {
    const image = getRenderAssetImage(id);
    return image?.currentSrc || image?.src || `${id}:fallback`;
  }).join("|");
}

function getStaticRenderKey(arena, gates) {
  const arenaKey = arena?.points?.length
    ? arena.points
      .map((point) => `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`)
      .join(";")
    : "no-arena";
  const gatesKey = gates?.length
    ? gates
      .map((gate) => [
        Math.round(gate.x * 10) / 10,
        Math.round(gate.y * 10) / 10,
        Math.round(gate.length * 10) / 10,
        Math.round(gate.angle * 1000) / 1000
      ].join(","))
      .join(";")
    : "no-gates";

  return [
    Math.round(WORLD_WIDTH),
    Math.round(WORLD_HEIGHT),
    levelManager?.currentLevel || 0,
    backgroundCanvas?.width || 0,
    backgroundCanvas?.height || 0,
    arenaKey,
    gatesKey,
    getStaticAssetKey()
  ].join(":");
}

function rebuildStaticRenderLayer(arena, gates, key) {
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = Math.max(1, Math.ceil(WORLD_WIDTH));
  layerCanvas.height = Math.max(1, Math.ceil(WORLD_HEIGHT));
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) return null;

  layerCtx.imageSmoothingEnabled = false;
  drawOutsideTerrain(layerCtx);
  if (arena?.points?.length) {
    drawArenaFloor(layerCtx, arena);
    drawArenaWallsAndGates(layerCtx, arena, gates);
  }

  staticRenderLayer.key = key;
  staticRenderLayer.canvas = layerCanvas;
  staticRenderLayer.gates = gates;
  return staticRenderLayer;
}

function getStaticRenderLayer(arena) {
  const gates = arena?.points?.length ? resolveArenaGates(arena) : [];
  const key = getStaticRenderKey(arena, gates);
  if (staticRenderLayer.canvas && staticRenderLayer.key === key) {
    return staticRenderLayer;
  }
  return rebuildStaticRenderLayer(arena, gates, key);
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
  const visibleMargin = size + 4;

  for (let i = 0; i < queuedCount; i += 1) {
    const gate = gates[i % gates.length];
    const row = Math.floor(i / gates.length);
    const laneOffset = ((row % 3) - 1) * size * 0.78;
    const depth = size * 0.9 + row * size * 0.72;
    const outsideX = -gate.normalX;
    const outsideY = -gate.normalY;
    const rawX = gate.x + outsideX * depth + gate.tangentX * laneOffset;
    const rawY = gate.y + outsideY * depth + gate.tangentY * laneOffset;
    const x = Math.max(visibleMargin, Math.min(WORLD_WIDTH - visibleMargin, rawX));
    const y = Math.max(visibleMargin, Math.min(WORLD_HEIGHT - visibleMargin, rawY));
    drawQueuedOnionPreview(ctx, x, y, size, now, i);
  }
}

function drawDefeatedOnionOverlays(ctx, now) {
  for (const onion of onions) {
    onion.drawDefeatedOverlay?.(ctx, now);
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

  if (updatePlayerDefeat(now)) {
    input.endFrame();
    return;
  }

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

  // 3) onions
  for (const o of onions) o.update(dt, now);
  onions = levelManager.removeInactiveOnions();
  levelManager.updateWave(now);
  onions = levelManager.getOnions();
  levelManager.updateSpeedDot(now);

  // 3b) collisioni BULLET → PLAYER
  let hitPlayer = false;
  if (isPlayerVulnerable(now)) {
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
  }
  if (hitPlayer) {
    beginPlayerDefeat(now);
    input.endFrame();
    return;
  }

  // level up quando il budget della wave è esaurito e non restano onion visibili
  if (levelManager.isWaveComplete()) {
    const nextLevel = levelManager.currentLevel + 1;
    const playerStartPosition = { x: player.x, y: player.y };
    addScreenShake(0.2);
    triggerGameFlash("rgba(255, 245, 210, 1)", 0.14);
    resetGame(nextLevel, false, { playerStartPosition });
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

    // defeated/revive flow se onion tocca il player
    const dx = player.x - o.x;
    const dy = player.y - o.y;
    const distSq = dx * dx + dy * dy;
    const rr = (player.r + o.r) ** 2;
    if (distSq < rr && isPlayerVulnerable(now)) {
      beginPlayerDefeat(now);
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
  if (awaitingArenaStartClick) {
    if (arenaStartMode === "restart") {
      drawArenaOnly();
      startArenaStartMotion();
    } else {
      drawArenaStartPreview();
    }
  }
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
  const staticLayer = getStaticRenderLayer(arena);

  ctx.save();
  ctx.translate(screenFx.offsetX, screenFx.offsetY);

  if (staticLayer?.canvas) {
    ctx.drawImage(staticLayer.canvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  } else {
    drawOutsideTerrain(ctx);
  }

  if (arena && arena.points.length) {
    const gates = staticLayer?.gates || resolveArenaGates(arena);
    const progress = levelManager.getWaveProgress();

    drawQueuedOnionPreviews(ctx, gates, progress, now);

    ctx.save();
    drawArenaPath(ctx, arena.points);
    ctx.clip();
    drawSpeedDot(ctx, levelManager.getSpeedDot(), now);
    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx, now);
    drawDefeatedOnionOverlays(ctx, now);
    ctx.restore();
  } else {
    drawSpeedDot(ctx, levelManager.getSpeedDot(), now);
    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx, now);
    drawDefeatedOnionOverlays(ctx, now);
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

function createPerfProfiler() {
  if (!PERF_MODE) return null;

  const overlay = document.createElement("div");
  overlay.className = "perf-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  const samples = [];
  const maxSamples = 300;
  let lastOverlayUpdate = 0;
  let lastConsoleUpdate = 0;

  const percentile = (values, ratio) => {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return sorted[index];
  };

  const average = (values) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const snapshot = () => {
    const frameTimes = samples.map((sample) => sample.frameMs);
    const workTimes = samples.map((sample) => sample.workMs);
    const avgFrameMs = average(frameTimes);
    const canvasRect = canvas.getBoundingClientRect();
    const progress = levelManager.getWaveProgress();
    const report = {
      fps: avgFrameMs > 0 ? 1000 / avgFrameMs : 0,
      avgFrameMs,
      avgWorkMs: average(workTimes),
      p95FrameMs: percentile(frameTimes, 0.95),
      p99FrameMs: percentile(frameTimes, 0.99),
      slow20: frameTimes.filter((value) => value > 20).length,
      slow33: frameTimes.filter((value) => value > 33).length,
      activeOnions: progress.activePressureCount,
      bullets: player?.bullets?.length || 0,
      explosions: player?.explosions?.length || 0,
      cssSize: `${Math.round(canvasRect.width)}x${Math.round(canvasRect.height)}`,
      backingSize: `${canvas.width}x${canvas.height}`,
      dpr: canvasRect.width > 0 ? canvas.width / canvasRect.width : 0,
      samples: samples.length
    };
    return report;
  };

  const renderReport = (report) => [
    "PI.Onion perf",
    `FPS avg: ${report.fps.toFixed(1)}`,
    `Frame avg: ${report.avgFrameMs.toFixed(2)}ms`,
    `Work avg: ${report.avgWorkMs.toFixed(2)}ms`,
    `p95/p99: ${report.p95FrameMs.toFixed(2)} / ${report.p99FrameMs.toFixed(2)}ms`,
    `Slow >20/>33: ${report.slow20} / ${report.slow33}`,
    `Onions: ${report.activeOnions}  Bullets: ${report.bullets}  Expl: ${report.explosions}`,
    `Canvas CSS: ${report.cssSize}`,
    `Buffer: ${report.backingSize}  DPR: ${report.dpr.toFixed(2)}`
  ].join("\n");

  return {
    record(metrics) {
      const frameMs = Number(metrics.rawFrameMs);
      const workMs = Number(metrics.workMs);
      if (Number.isFinite(frameMs) && frameMs > 0) {
        samples.push({
          frameMs,
          workMs: Number.isFinite(workMs) ? workMs : 0
        });
        if (samples.length > maxSamples) samples.shift();
      }

      if (metrics.timestamp - lastOverlayUpdate >= 500) {
        lastOverlayUpdate = metrics.timestamp;
        overlay.textContent = renderReport(snapshot());
      }

      if (metrics.timestamp - lastConsoleUpdate >= 5000) {
        lastConsoleUpdate = metrics.timestamp;
        console.info("[PI.Onion perf]", snapshot());
      }
    },
    getSnapshot: snapshot
  };
}

// ==========================================================
// ENGINE SETUP
// ==========================================================
const perfProfiler = createPerfProfiler();
window.PICHAN_PERF_PROFILER = perfProfiler;
const engine = new Engine(update, draw, {
  frameObserver: perfProfiler ? (metrics) => perfProfiler.record(metrics) : null
});
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
  "./assets/collage/player_idle.png",
  "./assets/collage/player_right.png",
  "./assets/collage/player_left.png",
  "./assets/collage/player_up.png",
  "./assets/collage/player_down.png",
  "./assets/collage/player_defeated.png",
  "./assets/collage/play.png",
  "./assets/collage/onion_idle.png",
  "./assets/collage/onion_chase.png",
  "./assets/collage/onion_defeated.png",
  "./assets/collage/pickup_energy.png",
  "./assets/collage/pickup_power.png",
  "./assets/collage/pickup_score_star.png",
  "./assets/collage/gate_horizontal.png",
  "./assets/collage/gate_vertical.png",
  "./assets/collage/block_gate.png",
  "./assets/collage/paper_arena_bg.png"
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
invalidateStaticRenderLayer();
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

if (arenaStartBtn) {
  arenaStartBtn.addEventListener("click", startFromArenaPlay);
}

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
