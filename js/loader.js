const asciiBanner = `
ZZZZZ  III   OOO
   Z    I   O   O
  Z     I   O   O
 Z      I   O   O
ZZZZZ  III   OOO

L      AAAAA  TTTTT  TTTTT  EEEEE
L      A   A    T      T    E
L      AAAAA    T      T    EEE
L      A   A    T      T    E
LLLLL  A   A    T      T    EEEEE
`;
console.log(asciiBanner);
const VERSION_KEY = "pi_version";
const versionOverlay = document.getElementById("version-overlay");
const versionReload = document.getElementById("version-reload");
const cssLink = document.getElementById("game-css");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingBox = document.getElementById("loading-box");
const loadingPi = document.getElementById("loading-pi");
const loadingSpinner = document.getElementById("loading-spinner");
const loadingStatus = document.getElementById("loading-status");
const loadingPlay = document.getElementById("loading-play");
let loadingPiDirection = 1;
let loadingPiAnimHandler = null;
let loadingPiCycleId = null;
const loadingPiIdleSprites = [
  "./assets/pi_chan_down_small.png",
  "./assets/pi_chan_sx_small.png",
  "./assets/pi_chan_up_small.png",
  "./assets/pi_chan_dx_small.png"
];
const stopLoadingPiCycle = () => {
  if (loadingPiCycleId) {
    clearInterval(loadingPiCycleId);
    loadingPiCycleId = null;
  }
  if (loadingPiAnimHandler && loadingPi) {
    loadingPi.removeEventListener("animationiteration", loadingPiAnimHandler);
    loadingPiAnimHandler = null;
  }
};

const appendVersion = (path, versionValue) => {
  if (!versionValue) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${versionValue}`;
};

const applyAssetVersion = (versionValue) => {
  window.ASSET_VERSION = versionValue;
  if (cssLink) {
    const href = cssLink.getAttribute("href");
    if (href) cssLink.setAttribute("href", appendVersion(href, versionValue));
  }
  document.querySelectorAll("audio").forEach((el) => {
    const src = el.getAttribute("src");
    if (!src) return;
    el.setAttribute("src", appendVersion(src, versionValue));
  });
};

const showVersionOverlay = () => {
  if (versionOverlay) {
    versionOverlay.classList.add("visible");
  }
};

const forceReload = (versionValue) => {
  const base = window.location.pathname.replace(/\/?index\.html$/, "/");
  const target = `${base}?v=${versionValue}`;
  window.location.replace(target);
};

let gameStarted = false;

const startGame = (versionValue) => {
  if (gameStarted) return;
  gameStarted = true;
  applyAssetVersion(versionValue);
  const url = new URL("../main.js", import.meta.url);
  if (versionValue) {
    url.searchParams.set("v", String(versionValue));
  }
  import(url.href);
};

// Preload moduli per scaldare la cache; main.js viene importato solo dopo Play.
const JS_MODULES = [
  "./core/Engine.js",
  "./core/Input.js",
  "./core/state.js",
  "./core/assets.js",
  "./core/LevelManager.js",
  "./core/physics.js",
  "./core/utils.js",
  "./core/Arena.js",
  "./entities/Bullet.js",
  "./entities/Player.js",
  "./entities/Explosion.js",
  "./entities/Onion.js",
  "./ai/OnionAI.js"
];

const preloadScriptsAndStart = async (versionValue) => {
  if (loadingOverlay) {
    loadingOverlay.classList.add("visible");
  }
  if (loadingBox) {
    loadingBox.classList.remove("loading-ready");
  }
  if (loadingPi) {
    const rightSrc = "./assets/pi_chan_dx_small.png";
    const leftSrc = "./assets/pi_chan_sx_small.png";
    loadingPiDirection = 1;
    loadingPi.src = rightSrc;
    loadingPi.style.left = "";
    loadingPi.style.transform = "";
    loadingPi.classList.remove("loading-pi--idle");
    stopLoadingPiCycle();
    if (!loadingPiAnimHandler) {
      loadingPiAnimHandler = () => {
        loadingPiDirection *= -1;
        loadingPi.src = loadingPiDirection > 0 ? rightSrc : leftSrc;
      };
      loadingPi.addEventListener("animationiteration", loadingPiAnimHandler);
    }
    loadingPi.style.animation = "none";
    loadingPi.offsetHeight;
    loadingPi.style.animation = "";
  }
  if (loadingSpinner) {
    loadingSpinner.style.display = "";
  }
  if (loadingStatus) {
    loadingStatus.textContent = "";
  }
  if (loadingPlay) {
    loadingPlay.classList.remove("visible");
    loadingPlay.disabled = true;
  }

  const results = await Promise.allSettled(
    JS_MODULES.map((path) => {
      const url = new URL(path, import.meta.url);
      return import(appendVersion(url.href, versionValue)).catch(() => {
        throw new Error(`Failed to load ${path}`);
      });
    })
  );

  const failed = results.some((res) => res.status === "rejected");
  if (failed) {
    if (loadingStatus) {
      const failedList = results
        .map((res, idx) => (res.status === "rejected" ? JS_MODULES[idx] : null))
        .filter(Boolean);
      const detail = failedList.length ? ` (${failedList.join(", ")})` : "";
      loadingStatus.textContent = `Errore nel caricamento dei moduli${detail}.`;
    }
    return;
  }

  if (loadingStatus) {
    loadingStatus.textContent = "";
  }
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
  if (loadingBox) {
    loadingBox.classList.add("loading-ready");
  }
  if (loadingPi) {
    loadingPi.src = "./assets/pi_chan_down_small.png";
    loadingPi.style.animation = "";
    loadingPi.classList.add("loading-pi--idle");
    stopLoadingPiCycle();
    let idleIndex = 0;
    loadingPiCycleId = setInterval(() => {
      if (!loadingPi) return;
      loadingPi.src = loadingPiIdleSprites[idleIndex % loadingPiIdleSprites.length];
      idleIndex += 1;
    }, 450);
  }
  if (loadingPlay) {
    loadingPlay.classList.add("visible");
    loadingPlay.disabled = false;
    loadingPlay.addEventListener("click", () => {
      if (loadingOverlay) {
        loadingOverlay.classList.remove("visible");
      }
      stopLoadingPiCycle();
      if (loadingPi) {
        loadingPi.classList.remove("loading-pi--idle");
      }
      startGame(versionValue);
    }, { once: true });
  }
};

const parseVersion = (value) => {
  if (!value) return [0, 0, 0];
  return String(value)
    .split(".")
    .slice(0, 3)
    .map((part) => {
      const num = Number(part);
      return Number.isFinite(num) ? num : 0;
    });
};

const compareVersion = (a, b) => {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
};

const checkVersionAndStart = async () => {
  const effectiveVersion = window.BUILD_VERSION || null;
  preloadScriptsAndStart(effectiveVersion);
};

if (document.readyState === "complete") {
  checkVersionAndStart();
} else {
  window.addEventListener("load", checkVersionAndStart, { once: true });
}
