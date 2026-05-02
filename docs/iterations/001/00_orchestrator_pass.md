[ORCHESTRATOR INPUT]
- Goal of this iteration
  Validate and tighten the current `juicy + Onion V2` state for the first minute only. No expansion. Priority order stays `Readability`, `Game Feel`, `Pressure`, `Progression clarity`, `Scope control`.
- Known state of the game
  Required docs align on the same intent: the game already has multi-shape arena progression, cycle-based difficulty, runtime arena rotation, Onion V2 aggression, and multiple juicy feedback layers on player, bullets, and onions. `docs/MASTER_STATE.md` still marks the cycle `NOT READY`.
- Relevant codebase notes
  `config/levels.json` currently defines 5 PI cycles with 7 shape steps each; rotation is mostly absent at early steps and appears later in cycles with stronger values in later PIs.
  `js/core/LevelManager.js` applies shape, rotation, onion counts, speed scales, chase scales, and enables dodge only from `pressureIndex >= 2` and only for every third onion.
  `main.js` is a real integration point for this cycle even if it is not listed in the brief: it applies `bulletBounces` to the player on reset, updates arena rotation every frame, rebuilds the level on advance, and gates level transitions through a short overlay.
  `js/entities/Player.js` stacks recoil, squash, muzzle-flash explosion, screen shake, and game flash on each shot.
  `js/entities/Bullet.js` adds trail, bounce explosion, and bounce shake. Bullets can also kill the player.
  `js/ai/OnionAI.js` and `js/entities/Onion.js` combine global shot-triggered chase, chase windup, wobble, ring, glow, saturation, and chase sprite swaps.
- Prior outputs available
  `docs/MASTER_STATE.md`
  `docs/GAME_VISION.md`
  `docs/CODEBASE_MAP.md`
  `docs/FIRST_ITERATION_BRIEF.md`

[AGENT CONSULTATION PLAN]
- Which agents will be consulted
  `game-designer`
  `gameplay-programmer`
- In what order
  `game-designer` first, `gameplay-programmer` second. `pixel-artist` skipped unless reduction/tuning fails to solve a confirmed readability problem.
- Why
  The repository is not blocked by missing systems. It is blocked by unresolved keep/reduce/cut decisions inside an already dense feedback stack.
  The minimum next handoff is design, not build: freeze what stays, what gets reduced, and what gets cut in first-minute play.
  After that, `gameplay-programmer` can map the decision set to the smallest local patch. Build now would force design choices into implementation.

[NORMALIZED FINDINGS]
- Confirmed observations
  Active scope is validation and tightening of the existing first-minute loop, not expansion.
  Early progression is authored and concrete: shape, onion count, bounce count, and speed scales are defined in config, not implied.
  Runtime integration exists for the current progression claims: arena rotation updates each frame and level bullet bounce count is applied to the player on reset.
  Shot feedback density is already high on the player side.
  Bullet feedback density is already high on the projectile side.
  Onion feedback density is already high on the enemy side.
  Onion aggression is tightly coupled to the act of shooting: recent shots can trigger chase broadly, and bullets remain a self-danger source.
  No artifact in the current source of truth proves that the present stack has passed first-minute manual validation with pass/fail criteria.
- Concrete proposals
  Freeze the next cycle around reduction and tuning only.
  Make the next design artifact a keep/reduce/cut matrix for four clusters only: `Player shot feedback`, `Bullet feedback`, `Onion feedback`, `Early progression/rotation`.
  Treat `config/levels.json`, `main.js`, `js/entities/Player.js`, `js/entities/Bullet.js`, `js/entities/Onion.js`, and `js/ai/OnionAI.js` as the likely technical perimeter for the next pass.
  Keep `js/core/Arena.js` and `js/core/LevelManager.js` out unless a specific blocking defect is confirmed.
  Judge first-minute pressure primarily on PI0 full cycle and PI1 entry. Do not optimize PI2+ before early readability is stable.
- Assumptions
  First-minute exposure is likely dominated by PI0 and early PI1 rather than PI2+; this is plausible from the current level flow but not yet validated by human play.
  Current assets are sufficient unless a readability failure survives pure reduction/tuning.
- Risks
  `Readability`: glow, flash, wobble, trail, shake, and arena border treatment can collapse visual hierarchy.
  `Pressure`: global chase-on-shot plus bullet self-danger can punish the core action instead of clarifying risk.
  `Progression`: shape and rotation escalation can read as novelty instead of controlled danger if early deltas are masked by effect density.
  `Scope`: touching config and multiple entities without frozen decisions will reopen design during implementation.
  Documentation drift exists outside the source-of-truth docs; code must win over stale descriptions.
- Conflicts
  `Readability` vs `Noise` is unresolved.
  `Pressure` vs fairness is unresolved around chase timing and self-danger readability.
  `Progression` vs arena spectacle is unresolved around the real value of rotation in first-minute play.

[DECISIONS]
- Approved
  Keep the cycle restricted to first-minute validation and tightening of existing systems only.
  Use `docs/FIRST_ITERATION_BRIEF.md` as the active iteration brief.
  Route the next handoff to `game-designer`.
  Keep `pixel-artist` out unless a confirmed readability issue cannot be solved by tuning or reduction.
- Rejected
  New mechanics, new enemies, new HUD layers, new asset production, and broad refactors.
  Sending the current state to `build-agent`.
  Expanding the technical perimeter before keep/reduce/cut decisions are frozen.
- Deferred
  PI2+ dodge distribution and late-cycle escalation polish unless they directly corrupt first-minute readability.
  Any `Arena.js` geometry change unless a concrete runtime defect is confirmed.
  Any asset request.
- Out of Scope
  New content.
  New systems created to solve problems that can be solved by trimming the current stack.
  Architectural cleanup unrelated to first-minute readability, feel, pressure, or progression clarity.

[REQUESTS FOR NEXT ROUND]
- To Game Designer
  Produce the minimum decision artifact: a keep/reduce/cut matrix for first-minute play covering only `Player shot feedback`, `Bullet feedback`, `Onion feedback`, and `Early progression/rotation`.
  Define first-minute pressure targets in operational terms: what must remain immediately readable, what may stay intense, and what must be reduced if it competes with danger reading.
  State explicitly whether early rotation is `keep as is`, `reduce`, or `delay further`.
  State explicitly whether current chase aggression is `keep`, `reduce`, or `retune`.
- To Gameplay Programmer
  Wait for the matrix above, then translate it into one small patch spec with file ownership, runtime deltas, manual tests, and regression risks.
  Default implementation bias: config and timing reduction first, local logic edits second, no new systems.
- To Pixel Artist
  No request. Escalate only if a confirmed readability failure cannot be solved by reduction/tuning of current effects.

[BUILD READINESS]
- Status: NOT READY
- Reason
  The repository state is rich enough to tighten, but the brief is still evaluative instead of decisive. It does not yet freeze what stays, what gets reduced, and what gets cut inside the current feedback stack.
- Missing pieces, if any
  First-minute keep/reduce/cut matrix.
  Explicit decision on early rotation.
  Explicit decision on chase aggression and fairness target.
  Manual test script with observable pass/fail criteria for early levels.

[MASTER PATCH BRIEF]
- Objective
  Tighten the first minute by reducing or retuning existing feedback and pressure sources so readability wins without flattening arcade feel.
- Scope
  Existing systems only. Likely perimeter: `config/levels.json`, `main.js`, `js/entities/Player.js`, `js/entities/Bullet.js`, `js/entities/Onion.js`, `js/ai/OnionAI.js`. Touch `js/core/LevelManager.js` or `js/core/Arena.js` only if a specific blocking defect is confirmed.
- Gameplay Changes
  No new mechanics.
  Retune or remove only the feedback and pressure elements that hide danger or progression in the first minute.
  Prioritize early-cycle clarity over late-cycle spectacle.
- Technical Changes
  Prefer config and timing changes first.
  Prefer local reductions of effect intensity, frequency, or duration over structural rewrites.
  Keep the current reset and level-flow architecture unchanged.
- Visual Changes
  Reduction only: lower or cut redundant glow, flash, ring, wobble, trail, or shake where they compete with hazard reading.
  No new HUD or asset layer.
- Required Assets
  None currently justified.
- Manual Test Cases
  Start at level 1 and clear through at least PI0 full cycle; verify player position, bullets, onion threat, and arena boundary remain readable while moving and shooting.
  Compare level 1 against the first rotating late-PI0 stage; verify rotation adds tension without obscuring safe space or bullet paths.
  Fire continuously during onion pressure; verify the act of shooting does not collapse threat reading into noise.
  Observe bounce-heavy moments; verify bullets remain trackable and self-danger stays understandable.
  Compare the first PI1 level against PI0 start; verify escalation is felt as pressure/progression, not only visual variation.
- Risks
  Over-trimming can flatten identity and impact.
  Under-trimming leaves the same readability conflict unresolved.
  Changing chase timing or effect density can alter difficulty more than expected.
- Deferred Items
  PI2+ dodge distribution and late-cycle escalation polish after the first-minute matrix is validated.
  Any asset or presentation work not required by a confirmed readability failure.
