// ==========================================================
// main.js — Punto di integrazione centrale del gioco PI.Onion
// ==========================================================

import { Engine } from "./js/core/Engine.js";
import { Input } from "./js/core/Input.js";
import { LevelManager } from "./js/core/LevelManager.js";
import { resolveCircleCircle } from "./js/core/physics.js";
import { state } from "./js/core/state.js";
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
const touchControlsEl = document.getElementById("touch-controls");
const touchFireBtnEl = document.getElementById("touch-fire");
const touchUpBtnEl = document.getElementById("touch-up");
const touchDownBtnEl = document.getElementById("touch-down");
const touchLeftBtnEl = document.getElementById("touch-left");
const touchRightBtnEl = document.getElementById("touch-right");
const LEVEL_START_DELAY_MS = 1400;
const MAX_CONTINUES = 3;
let levelOverlayTimeoutId = null;
let lastChaseEndTime = 0;
let continueUses = 0;
let isPaused = false;
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
  1: 8,
  2: 15,
  3: 22,
  4: 29
};
const ASSET_VERSION = window.ASSET_VERSION || window.BUILD_VERSION || null;

function withAssetVersion(path) {
  if (!ASSET_VERSION) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${ASSET_VERSION}`;
}

window.withAssetVersion = withAssetVersion;

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
  if (levelManager.currentLevel > stats.maxLevel) {
    stats.maxLevel = levelManager.currentLevel;
    localStorage.setItem(STATS_KEYS.maxLevel, String(stats.maxLevel));
  }
  engine.start();
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
      const rotation = Number(levelEntry?.arenaRotationSpeed ?? entry?.arenaRotationSpeed) || 0;
      const arenaLabel = rotation ? `${arenaShape} (${rotation > 0 ? "+" : ""}${rotation}°/s)` : arenaShape;
      rows.push({
        level: levelCounter,
        pi: entry?.pi ?? 0,
        arena: arenaLabel,
        bounces: levelEntry?.bulletBounces ?? 0,
        onions: levelEntry?.onionCount ?? 0,
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

function resetGame(level = 1, resetState = true) {
  levelManager.loadLevel(level);
  player = levelManager.getPlayer();
  onions = levelManager.getOnions();
  player.bulletMaxBounces = levelManager.getBulletBounceCount(level);
  if (resetState) state.reset();
  if (resetState) pendingGameStart = true;
}

function showGameOver() {
  hideGotoOverlay({ resume: false });
  hideLevelOverlay();
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
  if (levelManager.currentLevel > stats.maxLevel) {
    stats.maxLevel = levelManager.currentLevel;
    localStorage.setItem(STATS_KEYS.maxLevel, String(stats.maxLevel));
  }
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
    const spin = Number(levelCfg?.arenaRotationSpeed) || 0;
    const spinLabel = spin ? ` | Spin: ${spin > 0 ? "+" : ""}${spin}°/s` : "";
    levelTitleEl.textContent = `Level ${Math.max(1, level)} · ${levelCfg?.arenaShape || "rect"}`;
    levelInfoEl.textContent = `Opinion: ${state.score} | Time: ${formatTime(state.gameTime)} | Cycle: ${(levelCfg?.pressureIndex ?? 0) + 1} | Shape step: ${levelCfg?.levelInCycle ?? 1}/${levelCfg?.cycleLength ?? 1}${spinLabel}`;
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
    return;
  }
  const shouldShow = (engine.running || isPaused) && !isOverlayActive();
  playersPanelEl.classList.toggle("is-visible", shouldShow);
}

function updatePlayersPanelAlignment() {
  if (!playersPanelEl || !onlineService.hasPlayersPanel || !canvas || !layoutEl) return;
  const canvasRect = canvas.getBoundingClientRect();
  const layoutRect = layoutEl.getBoundingClientRect();
  const offsetTop = Math.max(0, Math.round(canvasRect.top - layoutRect.top));
  playersPanelEl.style.marginTop = `${offsetTop}px`;
  playersPanelEl.style.maxHeight = `${Math.max(0, Math.round(canvasRect.height))}px`;
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
  if (levelManager.arena?.update) {
    levelManager.arena.update(dt);
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
  updateTitleFromState(now);

  // 3) onions
  for (const o of onions) o.update(dt, now);
  onions = onions.filter(o => o.alive);

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

  // level up quando tutte le onion sono sparite
  if (onions.length === 0) {
    const nextLevel = levelManager.currentLevel + 1;
    addScreenShake(0.2);
    triggerGameFlash("rgba(255, 245, 210, 1)", 0.14);
    resetGame(nextLevel, false);
    playLevelupSfx();
    fadeBgm(0, 800);
    engine.stop();
    showLevelOverlay(nextLevel);
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

  input.endFrame();
}


// ==========================================================
// DRAW — grafica
// ==========================================================
function draw(now) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const arena = levelManager.arena;
  const pulse = 0.5 + 0.5 * Math.sin((now || 0) / 320);

  ctx.save();
  ctx.translate(screenFx.offsetX, screenFx.offsetY);

  if (arena && arena.points.length) {
    const pts = arena.points;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.clip();

    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    const aura = ctx.createRadialGradient(
      WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, WORLD_WIDTH * 0.06,
      WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, WORLD_WIDTH * 0.58
    );
    aura.addColorStop(0, `rgba(255, 245, 220, ${0.03 + pulse * 0.025})`);
    aura.addColorStop(1, "rgba(255, 245, 220, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx);

    const drawArenaPath = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
    };

    ctx.strokeStyle = `rgba(255, 233, 184, ${0.14 + pulse * 0.06})`;
    ctx.lineWidth = 12;
    ctx.shadowColor = `rgba(255, 233, 184, ${0.55 + pulse * 0.2})`;
    ctx.shadowBlur = 28 + pulse * 8;
    drawArenaPath();
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 244, 220, ${0.48 + pulse * 0.18})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `rgba(255, 250, 235, ${0.78 + pulse * 0.16})`;
    ctx.shadowBlur = 10;
    drawArenaPath();
    ctx.stroke();

    ctx.restore();
  } else {
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    } else {
      ctx.fillStyle = "#222";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
    onions.forEach((o) => o.draw(ctx, now));
    player.draw(ctx);
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


// ----------------------------------------------------------
// HUD
// ----------------------------------------------------------
function drawHUD() {
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";

  ctx.fillText(`Opinion: ${state.score}`, 10, 20);
  ctx.fillText(`Onion Killed: ${state.onionsKilled}`, 10, 40);
  ctx.fillText(`Shots Fired: ${state.shotsFired}`, 10, 60);

  ctx.fillText(`Time: ${state.gameTime.toFixed(1)}s`, 10, 80);

  ctx.restore();
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

await preloadImages(ASSET_IMAGES);
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
