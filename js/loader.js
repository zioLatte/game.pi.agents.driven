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
const loadingStatus = document.getElementById("loading-status");

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
  window.PICHAN_WAIT_FOR_ARENA_PLAY = true;
  const url = new URL("../main.js", import.meta.url);
  if (versionValue) {
    url.searchParams.set("v", String(versionValue));
  }
  import(url.href);
};

// Preload moduli per scaldare la cache; main.js prepara l'arena e attende Play in canvas.
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
  if (loadingStatus) {
    loadingStatus.textContent = "";
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
    if (loadingOverlay) {
      loadingOverlay.classList.add("visible");
    }
    if (loadingStatus) {
      const failedList = results
        .map((res, idx) => (res.status === "rejected" ? JS_MODULES[idx] : null))
        .filter(Boolean);
      const detail = failedList.length ? ` (${failedList.join(", ")})` : "";
      loadingStatus.textContent = `Errore nel caricamento dei moduli${detail}.`;
    }
    return;
  }

  if (loadingOverlay) {
    loadingOverlay.classList.remove("visible");
  }
  startGame(versionValue);
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
