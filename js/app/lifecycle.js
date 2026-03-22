export function createLifecycle({
  engine,
  getIsPaused,
  setIsPaused,
  isOverlayActive,
  startEngineIfReady,
  updatePlayersPanelVisibility,
  pauseAudio,
  resumeAudio
}) {
  return {
    pauseGame() {
      if (getIsPaused()) return;
      setIsPaused(true);
      engine.stop();
      updatePlayersPanelVisibility();
      pauseAudio();
    },

    resumeGame() {
      if (!getIsPaused() || isOverlayActive()) return;
      setIsPaused(false);
      resumeAudio();
      startEngineIfReady();
    },

    handleBlur() {
      engine.stop();
      updatePlayersPanelVisibility();
    },

    handleFocus() {
      if (getIsPaused() || isOverlayActive()) return;
      startEngineIfReady();
    }
  };
}
