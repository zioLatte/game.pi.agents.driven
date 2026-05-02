[ROLE]
Game Designer

[INPUTS RECEIVED]
- `AGENTS.md`
- `docs/MASTER_STATE.md`
- `docs/GAME_VISION.md`
- `docs/CODEBASE_MAP.md`
- `docs/FIRST_ITERATION_BRIEF.md`
- `docs/iterations/001/00_orchestrator_pass.md`
- Assumption: first-minute validation is judged mainly on PI0 full cycle and PI1 entry, not on late PI escalation.

[CURRENT GAME MODEL]
- current loop
  Player moves, shoots bouncing bullets, triggers onion chase by shooting, dies on onion contact or own bullet contact, clears all onions to level up, then re-enters a new arena shape.
- existing rules identified
  Shape progression is active.
  Onion count and speed scale across levels.
  Bullet bounce count scales across levels.
  Arena rotation exists but appears later in the cycle.
  Onion V2 uses chase plus light dodge.
  Player, bullets, and onions all carry layered feedback effects.
- current progression identified
  Early levels already escalate through shape change, enemy count, bounce count, and chase speed. Rotation is added on top later. The game is not lacking escalation; it is risking too many simultaneous signals.
- weak signals
  The first-minute loop does not yet clearly separate danger signal from spectacle.
  Shooting currently risks becoming both the main action and the main source of visual noise.
  Onion aggression is visible, but not yet cleanly prioritized over the rest of the screen.
  Rotation threatens to arrive before baseline space-reading is fully stable.

[ANALYSIS]
- readability problems
  Player shot feedback, bullet feedback, and onion feedback all demand attention at the same time. This weakens signal hierarchy.
  The onion already has enough state communication through movement and chase behavior; extra ring/glow/saturation layers risk redundancy.
  Bullet self-danger is acceptable only if bullet readability stays clean. Right now the visual stack makes that uncertain.
- rhythm problems
  The game has a strong action trigger, but the response stack is too wide: shot feedback, global chase response, bullet trail, bounce event, onion visual escalation.
  The result risks feeling busy instead of sharp.
- balance problems
  Current chase aggression is not wrong in principle, but it is too coarse for first-minute onboarding if it remains long, broad, and visually overstated.
  The first minute should punish bad positioning, not punish the player for losing track of their own shot feedback.
- progression problems
  Shape progression is already enough to teach spatial change.
  Early rotation is not yet justified as part of onboarding. It adds one more thing to parse before the base loop is proven clean.
  Progression should step one readable variable at a time; the current stack risks changing too many perceived variables together.
- promising elements to preserve
  Shape-based arena variation.
  Onion as the main pressure source.
  Shot-triggered aggression as core arcade identity.
  Recoil and controlled squash as feel anchors.
  Bounce-based bullet identity.

[DECISIONS]
- 1. Player shot feedback matrix
  Purpose: keep shot feel strong without flooding the screen.
  Expected player impact: shooting stays satisfying and readable; the player can still track self-position and immediate threat after firing.
  Priority: P0
  Risk: over-cutting can make shots feel dry.
  Dependency: gameplay-programmer tuning only.
  KEEP: recoil.
  KEEP: light squash.
  REDUCE: muzzle flash size and duration.
  REDUCE: shot shake strength.
  CUT: per-shot full-screen flash.
- 2. Bullet feedback matrix
  Purpose: keep bullets trackable as hazards and tools.
  Expected player impact: ricochets stay meaningful, but bullet path remains readable during pressure.
  Priority: P0
  Risk: over-reduction can make bounces feel weak.
  Dependency: gameplay-programmer tuning only.
  KEEP: visible bullet core.
  KEEP: bounce event as a readable contact cue.
  REDUCE: trail length and opacity.
  REDUCE: bounce spark/explosion size and particle count.
  CUT: per-bounce screen shake.
- 3. Onion feedback matrix
  Purpose: make onion pressure readable through behavior first, effects second.
  Expected player impact: the enemy feels more intentional, less noisy; chase is easier to parse under movement and ricochet pressure.
  Priority: P0
  Risk: too much reduction can make chase state feel flat.
  Dependency: gameplay-programmer tuning only.
  KEEP: chase state itself.
  KEEP: directional/chase sprite distinction.
  KEEP: a single compact size-change cue on chase entry.
  REDUCE: wobble amplitude.
  REDUCE: continuous glow strength.
  REDUCE: chase size peak and sustain.
  CUT: chase ring.
  CUT: extra saturation boost if chase readability remains clear without it.
- 4. Early progression/rotation matrix
  Purpose: teach geometry first, then add spectacle only if it still helps.
  Expected player impact: the first minute reads as controlled escalation rather than stacked novelty.
  Priority: P0
  Risk: delaying rotation may reduce perceived variety if shape progression is too subtle.
  Dependency: gameplay-programmer tuning in level config.
  KEEP: shape progression.
  KEEP: early enemy-count and speed escalation.
  REDUCE: simultaneous escalation of multiple visible variables in the same early step.
  DELAY: early rotation.
  Explicit rotation decision: DELAY.
- 5. Chase aggression decision
  Purpose: keep the core “shoot and wake the arena” identity without making first-minute pressure feel indiscriminate.
  Expected player impact: aggression feels earned and legible instead of globally noisy.
  Priority: P0
  Risk: if tuned too low, onion loses identity; if left too broad, readability remains broken.
  Dependency: gameplay-programmer tuning in existing chase behavior.
  Explicit chase decision: RETUNE.
  RETUNE means: preserve shot-triggered aggression as the rule, but reduce first-minute overwhelm by making the spike shorter, cleaner, and less visually redundant.
- 6. First-minute pressure targets
  Purpose: define success in observable player-facing terms.
  Expected player impact: difficulty rises through readable danger, not through uncertainty.
  Priority: P0
  Risk: targets may still need human validation.
  Dependency: human test plus gameplay-programmer mapping.
  Target A: within the first seconds, the player must read safe space, bullet path, and nearest onion threat without arena rotation.
  Target B: the first chase trigger must create a clear pressure spike within one second, but the player must still be able to identify escape space and their own bullet path.
  Target C: early escalation must come primarily from more constrained space and stronger onion pressure, not from more screen noise.
  Target D: in bounce-heavy moments, the player must be able to track at least the last threatening ricochet without losing the onion threat.
  Target E: by PI1 entry, the game must feel harder because it is more hostile, not because it is more decorated.

[REQUESTS TO GAMEPLAY PROGRAMMER]
- Translate Decision 1 into the smallest local tuning pass in player shot feedback. Do not add new shot states.
- Translate Decision 2 into the smallest local tuning pass in bullet readability. Do not add new projectile behavior.
- Translate Decision 3 into the smallest local tuning pass in onion feedback. Preserve chase state and sprite readability; remove redundant accents first.
- Translate Decision 4 by delaying first-minute rotation in existing level config. Do not invent a new progression rule.
- Translate Decision 5 by retuning existing chase behavior only. Preserve shot-triggered aggression; reduce first-minute overwhelm through timing/intensity tuning, not new AI systems.
- Provide manual tests that directly validate Targets A-E.

[REQUESTS TO PIXEL ARTIST]
- No request. Current readability issues should be attacked through reduction/tuning first.

[OUTPUT ARTIFACT]
DESIGN PATCH SPEC
- Objective
  Make the first minute cleaner, harsher, and more readable by stripping redundant feedback and delaying rotation until the base loop proves itself.
- Rules
  Player shot feedback
  KEEP: recoil, light squash.
  REDUCE: muzzle flash, shot shake.
  CUT: per-shot full-screen flash.
  Bullet feedback
  KEEP: bullet core, readable bounce cue.
  REDUCE: trail length/opacity, bounce spark density.
  CUT: per-bounce screen shake.
  Onion feedback
  KEEP: chase behavior, chase sprite distinction, one compact chase-entry size cue.
  REDUCE: wobble, glow, chase size peak.
  CUT: chase ring, extra saturation boost if redundant.
  Early progression/rotation
  KEEP: shape progression, onion count/speed escalation.
  REDUCE: early stacking of multiple visible escalators in one step.
  DELAY: rotation in the first-minute onboarding path.
  Explicit verdicts
  Early rotation: DELAY.
  Current chase aggression: RETUNE.
- Difficulty
  First-minute pressure must come from readable pursuit and shrinking spatial comfort, not from accumulated effects.
  The first chase spike should feel dangerous immediately, but it must still leave the player able to parse lanes, bullets, and nearest onion.
  PI1 entry may feel sharper than PI0, but not noisier.
- Scoring
  Keep current scoring logic. The issue is not reward structure; it is signal quality around survival and kill clarity.
- Progression
  Preserve shape progression as the main first-minute progression language.
  Delay rotation until after baseline shape-reading is established.
  Escalate one dominant readable variable at a time in early play.
- Feedback Needs
  No new asset request.
  The required change is subtraction and tuning, not additional communication layers.
  If readability still fails after reduction, only then reopen a visual support request.
- Open Risks
  Over-reduction can flatten impact.
  Under-reduction keeps the loop noisy.
  Delaying rotation may expose weak shape differentiation if shape progression is not strong enough on its own.
  Retuning chase may shift difficulty more than expected.
- Out of Scope
  New mechanics.
  New systems.
  New enemies.
  HUD changes.
  Asset production not forced by a confirmed readability failure.
  Late-cycle optimization beyond what first-minute validation strictly needs.
