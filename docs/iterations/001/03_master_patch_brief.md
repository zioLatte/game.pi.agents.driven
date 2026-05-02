[ORCHESTRATOR INPUT]
- Goal of this iteration
  Produce a strict v1 minimum patch for first-minute validation only.
- Known state of the game
  The game already has enough pressure, progression, and feedback layers. The problem is not missing ideas. The problem is stacked signals and loose scope.
- Relevant codebase notes
  The smallest safe perimeter is `config/levels.json`, `js/entities/Player.js`, `js/entities/Bullet.js`, and `js/entities/Onion.js`.
  `js/ai/OnionAI.js` is explicitly excluded from v1 because chase-duration retune is global and conflicts with the first-minute-only constraint.
- Prior outputs available
  `docs/FIRST_ITERATION_BRIEF.md`
  `docs/iterations/001/00_orchestrator_pass.md`
  `docs/iterations/001/01_design_patch_spec.md`
  `docs/iterations/001/02_implementation_patch_spec.md`

[NORMALIZED FINDINGS]
- Confirmed observations
  Readability pressure is currently diluted by layered shot feedback, bullet feedback, and onion feedback happening at once.
  The approved design direction is reduction-first, not expansion.
  The implementation spec was close, but too wide because it pulled `js/ai/OnionAI.js` into v1.
  Early rotation can be delayed through config only; no runtime or architecture change is required.
  Onion cleanup for v1 should stay conservative: cut only the clearly redundant element first, then test.
- Concrete proposals
  Limit v1 to four files only.
  Keep player and bullet reductions local to their own entities.
  Use the smallest onion cleanup that preserves chase readability.
  Delay the earliest rotating onboarding stage reached during PI0 first-minute progression by making it non-rotating.
- Risks
  Over-cutting onion visuals in v1 could weaken chase readability.
  Over-specifying config too early could force the wrong value before build verifies the real onboarding path.
  Any chase-duration retune would leak beyond the first minute and widen regression risk.
- Conflicts
  No design conflict remains inside v1 once `js/ai/OnionAI.js` is deferred.

[DECISIONS]
- Approved
  V1 file scope is locked to:
  `config/levels.json`
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  Player v1: keep recoil and light squash; reduce muzzle-flash intensity and shot shake; cut per-shot full-screen flash.
  Bullet v1: keep bullet core and bounce event; reduce trail and bounce burst; cut per-bounce screen shake.
  Onion v1: keep chase state, sprite distinction, and one compact chase-entry cue; cut chase ring; reduce glow; reduce wobble lightly.
  Progression v1: set the earliest rotating onboarding stage reached during PI0 first-minute progression to non-rotating.
- Rejected
  New mechanics.
  New systems.
  HUD work.
  Asset work.
  Architecture changes.
  Any broader synthesis that reopens design.
- Deferred
  `js/ai/OnionAI.js` entirely.
  Any chase-duration retune or other global chase timing change.
  Any further onion cuts to saturation or scale unless v1 testing proves they are still necessary.
  Any PI1+ or wider rotation retune beyond the earliest PI0 onboarding rotation.
- Out of Scope
  Pixel-artist involvement.
  `main.js`, `js/core/LevelManager.js`, `js/core/Arena.js`.

[BUILD READINESS]
- Status: BUILD READY
- Reason
  Objective, gameplay changes, technical perimeter, tests, and residual risks are now small and explicit. The brief is narrower than the implementation spec and no unresolved cross-system conflict remains inside v1.
- Missing pieces, if any
  No blocking design decision remains for v1. The concrete config value is intentionally left for build-time confirmation against the real PI0 onboarding path.

[MASTER PATCH BRIEF]
- Objective
  Tighten the first minute by subtracting redundant feedback and delaying the earliest PI0 onboarding rotation, without touching global AI timing.
- Scope
  V1 minimum patch only:
  `config/levels.json`
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  Explicitly excluded from v1:
  `js/ai/OnionAI.js`
- Gameplay Changes
  Preserve the current loop and chase rule.
  Make shots easier to read by reducing excess flash/shake.
  Make bullets easier to track by reducing trail and bounce burst noise.
  Make onions easier to read by removing the chase ring and toning down glow/wobble without flattening chase state.
  Keep shape progression, but make the earliest PI0 onboarding rotation non-rotating.
- Technical Changes
  `config/levels.json`
  Set the earliest rotating onboarding stage reached during PI0 first-minute progression to non-rotating.
  `js/entities/Player.js`
  Reduce muzzle-flash explosion intensity.
  Reduce shot shake.
  Remove per-shot full-screen flash.
  `js/entities/Bullet.js`
  Reduce trail length/intensity.
  Reduce bounce burst intensity.
  Remove per-bounce screen shake.
  `js/entities/Onion.js`
  Remove chase ring.
  Reduce glow.
  Reduce wobble lightly.
  Preserve chase state, sprite distinction, and one compact chase-entry cue.
- Visual Changes
  Subtraction only.
  No new visual systems.
  No new assets.
- Required Assets
  None.
- Manual Test Cases
  Start at level 1 and fire while moving around the nearest onion.
  Expected: player, bullet path, and nearest onion remain readable together.
  Trigger the first chase in PI0 early levels.
  Expected: chase is still obvious, but the screen is less noisy than before.
  Create bounce-heavy moments near walls in PI0 and PI1 entry.
  Expected: recent ricochet remains trackable and onion threat remains readable.
  Clear through PI0 onboarding progression up to the earliest previously rotating stage.
  Expected: progression still reads through shape/pressure, and that onboarding stage is now non-rotating.
  Compare level 1 against PI1 entry.
  Expected: PI1 feels harsher because of pressure/progression, not because of added noise.
- Risks
  Shot feel may become too flat if player feedback is reduced too aggressively.
  Bullet readability may regress if trail and bounce burst are both over-cut.
  Onion chase readability may regress if glow/wobble reduction is stronger than intended.
  Delaying one rotation point may be insufficient if human testing still finds first-minute progression noisy.
- Deferred Items
  `js/ai/OnionAI.js` chase-duration retune.
  Any global chase retune.
  Any further onion cuts to saturation or scale.
  Any broader progression cleanup beyond the earliest PI0 onboarding rotation.
