// Nickname generation and prompt flow.
export function createNicknameManager(elements) {
  const {
    nicknameOverlay,
    nicknameValueEl,
    nicknameApplyBtn,
    nicknameRegenBtn,
    nicknameError
  } = elements || {};

  const NICKNAME_MIN = 10;
  const NICKNAME_MAX = 28;
  const NICKNAME_REGEN_MAX = 3;
  const NICK_DICT_NOUN = [
    "Photon",
    "Quark",
    "Neutrino",
    "Electron",
    "Proton",
    "Entropy",
    "Singularity",
    "Vector",
    "Tensor",
    "Wave",
    "Field",
    "Matrix",
    "Flux",
    "Orbit",
    "Spectrum",
    "Resonance",
    "Particle",
    "System",
    "Signal",
    "Noise",
    "Continuum",
    "Invariant",
    "Observer",
    "Frame",
    "State",
    "Phase",
    "Amplitude",
    "Frequency",
    "Probability",
    "Momentum"
  ];
  const NICK_DICT_VERB = [
    "Drifting",
    "Hesitating",
    "Overthinking",
    "Wandering",
    "Miscalculating",
    "SecondGuessing",
    "Looping",
    "Panicking",
    "Stalling",
    "Improvising",
    "Delaying",
    "Oscillating",
    "Approximating",
    "Correcting",
    "Adjusting",
    "Reevaluating",
    "Rechecking",
    "Propagating",
    "Decaying",
    "Entangling"
  ];
  const NICK_DICT_ADJ = [
    "Uncertain",
    "Late",
    "Tired",
    "Confused",
    "Approximate",
    "Noisy",
    "Unstable",
    "AlmostStable",
    "ProbablyFine",
    "Uncalibrated",
    "Misaligned",
    "Inaccurate",
    "Finite",
    "Infinite",
    "Coherent",
    "Chaotic",
    "Silent",
    "Dense",
    "Sparse",
    "Residual"
  ];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const generateNickname = () => {
    let noun = pick(NICK_DICT_NOUN);
    let verb = pick(NICK_DICT_VERB);
    let adj = pick(NICK_DICT_ADJ);
    if (verb === noun) {
      verb = pick(NICK_DICT_VERB);
    }
    if (adj === noun || adj === verb) {
      adj = pick(NICK_DICT_ADJ);
    }

    let candidate = `${noun}${verb}${adj}`;
    if (candidate.length > NICKNAME_MAX) {
      candidate = `${noun}${adj}`;
    }
    if (candidate.length > NICKNAME_MAX) {
      candidate = candidate.slice(0, NICKNAME_MAX);
    }
    return candidate;
  };

  const requestNickname = () => new Promise((resolve) => {
    if (!nicknameOverlay || !nicknameApplyBtn || !nicknameRegenBtn || !nicknameValueEl) {
      resolve(generateNickname());
      return;
    }

    nicknameOverlay.classList.add("visible");
    if (nicknameError) nicknameError.textContent = "";
    let current = generateNickname();
    let regenLeft = NICKNAME_REGEN_MAX;
    nicknameValueEl.textContent = current;
    nicknameApplyBtn.textContent = "YEAH";
    nicknameRegenBtn.disabled = false;
    nicknameRegenBtn.textContent = `NOPE (${regenLeft})`;

    const submit = () => {
      if (current.length < NICKNAME_MIN) {
        if (nicknameError) {
          nicknameError.textContent = `Nickname obbligatorio (min ${NICKNAME_MIN}).`;
        }
        return;
      }
      nicknameOverlay.classList.remove("visible");
      nicknameApplyBtn.removeEventListener("click", submit);
      nicknameRegenBtn.removeEventListener("click", regenerate);
      resolve(current);
    };

    const regenerate = () => {
      if (regenLeft <= 0) return;
      regenLeft -= 1;
      current = generateNickname();
      nicknameValueEl.textContent = current;
      if (nicknameError) nicknameError.textContent = "";
      nicknameRegenBtn.textContent = `NOPE (${regenLeft})`;
      if (regenLeft === 0) nicknameRegenBtn.disabled = true;
    };

    nicknameApplyBtn.addEventListener("click", submit);
    nicknameRegenBtn.addEventListener("click", regenerate);
  });

  return {
    requestNickname
  };
}
