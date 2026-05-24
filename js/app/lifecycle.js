export function createLifecycle({
  engine,
  getIsPaused,
  setIsPaused,
  isOverlayActive,
  startEngineIfReady,
  pauseAudio,
  resumeAudio
}) {
  return {
    pauseGame() {
      if (getIsPaused()) return;
      setIsPaused(true);
      engine.stop();
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
    },

    handleFocus() {
      if (getIsPaused() || isOverlayActive()) return;
      startEngineIfReady();
    }
  };
}
