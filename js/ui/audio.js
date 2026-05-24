// Audio controller for game SFX/BGM.
export function createAudioController(elements) {
  const {
    bgmEl,
    gameoverSfxEl,
    shotSfxEl,
    bounceSfxEl,
    onionDeathSfxEl,
    levelupSfxEl
  } = elements || {};

  const BGM_BASE_VOLUME = 0.5;
  const BGM_CHASE_VOLUME = BGM_BASE_VOLUME;
  let bgmStarted = false;
  let bgmFadeId = null;
  let bgmEnabled = true;
  let levelupFadeId = null;

  const createSfxPool = (sourceEl, size = 4) => {
    if (!sourceEl) return [];
    return Array.from({ length: size }, () => {
      const clone = sourceEl.cloneNode(true);
      clone.preload = "auto";
      return clone;
    });
  };

  const shotPool = createSfxPool(shotSfxEl, 5);
  const bouncePool = createSfxPool(bounceSfxEl, 4);
  const onionDeathPool = createSfxPool(onionDeathSfxEl, 4);
  const poolCursors = new WeakMap();

  const playPooledSfx = (sourceEl, pool, volume = null) => {
    if (!sourceEl) return;

    if (!pool.length) {
      if (volume !== null) sourceEl.volume = volume;
      sourceEl.currentTime = 0;
      sourceEl.play().catch(() => {});
      return;
    }

    let cursor = poolCursors.get(pool) || 0;
    let node = pool.find((candidate) => candidate.paused || candidate.ended);
    if (!node) {
      node = pool[cursor % pool.length];
      cursor += 1;
      poolCursors.set(pool, cursor);
    }

    if (volume !== null) node.volume = volume;
    node.currentTime = 0;
    node.play().catch(() => {});
  };

  const startBgmOnce = () => {
    if (!bgmEl || bgmStarted || !bgmEnabled) return;
    bgmStarted = true;
    bgmEl.volume = BGM_BASE_VOLUME;
    bgmEl.play().catch(() => {
      bgmStarted = false;
    });
  };

  const stopBgm = () => {
    if (!bgmEl) return;
    if (bgmFadeId) {
      cancelAnimationFrame(bgmFadeId);
      bgmFadeId = null;
    }
    bgmEl.pause();
    bgmEl.currentTime = 0;
  };

  const fadeBgm = (targetVolume, durationMs) => {
    if (!bgmEl || !bgmEnabled) return;
    if (bgmFadeId) cancelAnimationFrame(bgmFadeId);

    const startVolume = bgmEl.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      bgmEl.volume = startVolume + (targetVolume - startVolume) * t;
      if (t < 1) {
        bgmFadeId = requestAnimationFrame(step);
      } else {
        bgmFadeId = null;
      }
    };

    bgmFadeId = requestAnimationFrame(step);
  };

  const playGameOverSfx = () => {
    if (!gameoverSfxEl) return;
    gameoverSfxEl.currentTime = 0;
    gameoverSfxEl.play().catch(() => {});
  };

  const stopGameOverSfx = () => {
    if (!gameoverSfxEl) return;
    gameoverSfxEl.pause();
    gameoverSfxEl.currentTime = 0;
  };

  const playShotSfx = () => {
    playPooledSfx(shotSfxEl, shotPool, 0.8);
  };

  const playBounceSfx = () => {
    playPooledSfx(bounceSfxEl, bouncePool);
  };

  const playOnionDeathSfx = () => {
    playPooledSfx(onionDeathSfxEl, onionDeathPool);
  };

  const playLevelupSfx = () => {
    if (!levelupSfxEl) return;
    levelupSfxEl.currentTime = 0;
    levelupSfxEl.volume = 1;
    levelupSfxEl.play().catch(() => {});
  };

  const fadeLevelupSfx = (durationMs) => {
    if (!levelupSfxEl) return;
    if (levelupFadeId) cancelAnimationFrame(levelupFadeId);

    const startVolume = levelupSfxEl.volume;
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationMs);
      levelupSfxEl.volume = startVolume * (1 - t);
      if (t < 1) {
        levelupFadeId = requestAnimationFrame(step);
      } else {
        levelupFadeId = null;
        levelupSfxEl.pause();
        levelupSfxEl.currentTime = 0;
      }
    };

    levelupFadeId = requestAnimationFrame(step);
  };

  const stopLevelupSfx = () => {
    if (!levelupSfxEl) return;
    if (levelupFadeId) {
      cancelAnimationFrame(levelupFadeId);
      levelupFadeId = null;
    }
    levelupSfxEl.pause();
    levelupSfxEl.currentTime = 0;
  };

  const stopAllAudio = () => {
    stopBgm();
  };

  return {
    BGM_BASE_VOLUME,
    BGM_CHASE_VOLUME,
    startBgmOnce,
    stopBgm,
    fadeBgm,
    playGameOverSfx,
    stopGameOverSfx,
    playShotSfx,
    playBounceSfx,
    playOnionDeathSfx,
    playLevelupSfx,
    fadeLevelupSfx,
    stopLevelupSfx,
    stopAllAudio
  };
}
