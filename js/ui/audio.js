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
    if (!shotSfxEl) return;
    shotSfxEl.volume = 0.8;
    shotSfxEl.currentTime = 0;
    shotSfxEl.play().catch(() => {});
  };

  const playBounceSfx = () => {
    if (!bounceSfxEl) return;
    bounceSfxEl.currentTime = 0;
    bounceSfxEl.play().catch(() => {});
  };

  const playOnionDeathSfx = () => {
    if (!onionDeathSfxEl) return;
    onionDeathSfxEl.currentTime = 0;
    onionDeathSfxEl.play().catch(() => {});
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
