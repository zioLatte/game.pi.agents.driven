[ROLE]
Gameplay Programmer

[INPUTS RECEIVED]
- `AGENTS.md`
- `docs/MASTER_STATE.md`
- `docs/CODEBASE_MAP.md`
- `docs/GAME_VISION.md`
- `docs/iterations/001/00_orchestrator_pass.md`
- `docs/iterations/001/01_design_patch_spec.md`
- Concrete implementation assumption: "delay early rotation" is satisfied by removing the first rotating stage reached in the PI0 onboarding path. No PI1 rotation change is required for the minimum patch because PI1 entry is already static.
- Concrete implementation assumption: "retune chase aggression" is satisfied in the minimum patch by shortening chase duration and reducing chase-entry visual amplification, without changing onion counts, chase speed scales, or adding new AI logic.

[CODEBASE IMPACT MAP]
- `config/levels.json`
  current responsibility: per-level arena shape, rotation, bounce count, onion count, speed scales, chase scales.
  likely entry points: PI0 `irregular` level rotation value; only first-minute onboarding values.
- `js/entities/Player.js`
  current responsibility: shot spawn, recoil, squash, muzzle-flash explosion, per-shot shake, per-shot game flash.
  likely entry points: `shoot(now)` feedback block.
- `js/entities/Bullet.js`
  current responsibility: bullet trail, bounce explosion, per-bounce shake, bounce fade-out.
  likely entry points: constructor trail defaults, `onBounce()`, `draw()`.
- `js/entities/Onion.js`
  current responsibility: onion visual motion, chase-entry scale behavior, wobble, ring, glow, saturation-linked draw state.
  likely entry points: chase branch in `update(dt, now)`, `draw(ctx, now)`.
- `js/ai/OnionAI.js`
  current responsibility: chase/cooldown/random state timing and shot-triggered chase activation.
  likely entry points: `CHASE_DURATION_MS`; no new states or triggers required.

[ANALYSIS]
- feasibility of received requests
  The approved design direction is implementable as a pure tuning/reduction patch. No new system is needed.
  The minimum impacted file set is five files: `config/levels.json`, `js/entities/Player.js`, `js/entities/Bullet.js`, `js/entities/Onion.js`, `js/ai/OnionAI.js`.
  `main.js` does not need to change because the targeted flash/shake hooks are invoked locally from `Player.js` and `Bullet.js`.
  `js/core/LevelManager.js` and `js/core/Arena.js` do not need to change because existing config/runtime plumbing already supports level rotation changes.
- technical incoherences
  The design asks for reduced first-minute overwhelm, but the current runtime stacks feedback in three layers at once: player shot, bullet bounce/path, onion chase. Local reduction at each origin point is the cleanest implementation.
  Chase aggressiveness is mostly timing-driven in `OnionAI.js`; changing speed scales in `config/levels.json` would widen regression surface unnecessarily.
  Rotation delay is already compatible with authored progression; only the earliest rotating stage needs to be deferred for the minimum patch.
- regression risks
  `Player.js`: reducing shot feedback too far can make firing feel weak.
  `Bullet.js`: reducing trail/bounce effects too far can make ricochet state harder, not easier, to read.
  `Onion.js`: lowering chase-entry visual amplification too far can flatten enemy state readability.
  `OnionAI.js`: shortening chase duration changes difficulty and pacing across all levels, not just PI0/PI1.
  `config/levels.json`: delaying the first rotation may reduce perceived progression variety if shape deltas are too subtle on their own.
- dependencies between systems
  `config/levels.json` feeds `LevelManager`, but no `LevelManager` code change is required.
  `OnionAI.js` controls chase timing; `Onion.js` renders the visible chase state. These two files must be tuned coherently.
  `Player.js` and `Bullet.js` both push explosions into the same explosion pool; visual reductions in both files compound and should be reviewed together.

[DECISIONS]
- 1. P0 Player shot feedback reduction
  technical approach: keep recoil and squash intact; reduce muzzle-flash explosion duration/radius/spark count; remove per-shot `triggerGameFlash`; reduce per-shot `addScreenShake` amount rather than deleting shot feel entirely.
  impacted files: `js/entities/Player.js`
  risk: medium. Shot feel may become too dry if both explosion and shake are reduced too hard.
  priority: P0
- 2. P0 Bullet readability reduction
  technical approach: shorten bullet trail length and lower trail opacity/radius growth; reduce bounce explosion duration/radius/spark count; remove per-bounce `addScreenShake`; keep bounce SFX and bounce event itself.
  impacted files: `js/entities/Bullet.js`
  risk: medium. Bounce readability may drop if the trail and bounce burst are both over-reduced.
  priority: P0
- 3. P0 Onion chase readability reduction
  technical approach: preserve chase sprite swap and chase state; reduce wobble amplitude; reduce chase-entry scale peak and sustained chase scale; remove chase ring draw; reduce glow/shadow intensity; remove extra saturation boost if chase remains readable without it.
  impacted files: `js/entities/Onion.js`
  risk: medium-high. Enemy state must stay legible after removing redundant visual accents.
  priority: P0
- 4. P0 Chase aggression retune
  technical approach: shorten `CHASE_DURATION_MS` only. Do not change state machine structure, do not add cooldown rules, do not touch dodge logic, do not retune onion counts or chase speed arrays in the minimum patch.
  impacted files: `js/ai/OnionAI.js`
  risk: high. Timing changes affect pacing and effective difficulty across the whole game.
  priority: P0
- 5. P0 Early rotation delay
  technical approach: set the first rotating PI0 stage to non-rotating. Do not rewrite cycle order, do not change shapes, do not edit later PI values in the minimum patch.
  impacted files: `config/levels.json`
  risk: low-medium. First-minute spectacle reduces slightly; progression clarity should improve.
  priority: P0
- 6. P1 Scope cut to avoid unnecessary file churn
  technical approach: do not touch `main.js`, `js/core/LevelManager.js`, or `js/core/Arena.js` unless the build uncovers a runtime mismatch that cannot be solved locally.
  impacted files: none
  risk: low. This reduces regression surface.
  priority: P1

[REQUESTS TO GAME DESIGNER]
- No blocking clarification required.
- Implementation assumption locked: the minimum acceptable version of `RETUNE` is shorter chase duration plus lower chase visual amplification, with no change to chase trigger rule and no change to chase speed arrays.
- Implementation assumption locked: the minimum acceptable version of `DELAY` is removal of PI0's first rotating stage only.

[REQUESTS TO PIXEL ARTIST]
- No request.

[OUTPUT ARTIFACT]
IMPLEMENTATION PATCH SPEC
- Goal
  Deliver the smallest first-minute tuning patch that reduces feedback noise, delays the first arena rotation, and retunes chase intensity without changing architecture or adding systems.
- Files Impacted
  `config/levels.json`
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
- Systems Affected
  Level progression tuning
  Player shot feedback
  Bullet readability feedback
  Onion chase presentation
  Onion chase timing
- Runtime Changes
  Player shots still recoil and squash, but produce a smaller, shorter muzzle-flash burst, lower shot shake, and no per-shot full-screen flash.
  Bullets remain visible and still bounce, but leave a shorter/lighter trail and trigger a smaller bounce burst with no per-bounce screen shake.
  Onion chase remains behaviorally intact, but the enemy presents less wobble, less glow, no chase ring, and a smaller chase size spike/sustain.
  Chase windows end earlier, reducing prolonged first-minute overwhelm while preserving shot-triggered aggression.
  The first rotating PI0 stage becomes static, so first-minute onboarding teaches shape/space before rotation.
- Data/Tuning Changes
  `config/levels.json`
  Set PI0 `irregular` `arenaRotationSpeed` from `-5` to `0`.
  `js/ai/OnionAI.js`
  Lower `CHASE_DURATION_MS` from current value to a shorter first-minute-safe window. Recommended implementation target: 6500 ms -> 4200-4800 ms. Keep `SHOOT_TRIGGER_MS` unchanged in the minimum patch.
  `js/entities/Player.js`
  Lower shot explosion `duration`, `maxRadius`, `sparkCount`, and `sparkLength`.
  Lower `addScreenShake` amount.
  Remove `triggerGameFlash` call from shot feedback.
  `js/entities/Bullet.js`
  Lower `maxTrail`.
  Lower trail alpha/radius contribution in `draw()`.
  Lower bounce explosion `duration`, `maxRadius`, `sparkCount`, and `sparkLength`.
  Remove bounce `addScreenShake`.
  `js/entities/Onion.js`
  Lower wobble amplitude.
  Lower chase-entry `targetScale` peak and sustained chase scale target.
  Lower glow/shadow intensity.
  Remove chase ring draw block.
  Remove or neutralize chase-only saturation boost.
- Required Assets
  None.
- Manual Test Cases
  Target A
  Action: start at level 1 and fire while circling the nearest onion in PI0 early levels.
  Context: no arena rotation active.
  Expected: player sprite remains readable after each shot; nearest bullet path and nearest onion remain legible at the same time.
  Target B
  Action: trigger the first chase by shooting repeatedly, then kite the nearest onion through open space.
  Context: PI0 early levels.
  Expected: chase pressure becomes obvious within one second, but escape lanes and bullet path remain readable; chase ends earlier than current baseline.
  Target C
  Action: clear PI0 through the first few shape changes without stopping fire.
  Context: PI0 onboarding path.
  Expected: difficulty increase is perceived mainly from geometry and onion pressure, not from stacked flashes/shakes/trails.
  Target D
  Action: create bounce-heavy situations against walls in PI0 and PI1 entry.
  Context: 3-4 bounce bullets active while onions are alive.
  Expected: at least the most threatening recent ricochet remains trackable; onion chase state remains readable during ricochets.
  Target E
  Action: compare PI0 start to PI1 entry after clearing the first cycle.
  Context: same player behavior pattern in both cases.
  Expected: PI1 entry feels harsher because onion pressure and space demands increase, not because visual noise increases.
  Regression check 1
  Action: shoot repeatedly in open space with no immediate onion contact.
  Context: level 1.
  Expected: firing still feels responsive and satisfying; patch does not make the gun feel dead.
  Regression check 2
  Action: observe first rotating stage previously reached in PI0.
  Context: same progression point after patch.
  Expected: stage remains static; no level flow, load, or arena-shape regression occurs.
- Risks
  Global chase-duration tuning affects later levels too, not only first-minute content.
  Removing too much from onion visuals may hide chase state if sprite swap alone is insufficient.
  Reducing bullet feedback too hard may hurt self-danger readability instead of helping it.
  Delaying only the first rotation may be insufficient if human testing still finds shape onboarding noisy.
- Deferred Items
  Any PI1+ rotation changes beyond the minimum PI0 delay.
  Any chase speed-scale rebalance in `config/levels.json`.
  Any dodge retune, since dodge is not part of the first-minute path.
  Any change to `main.js`, `js/core/LevelManager.js`, or `js/core/Arena.js` unless the build reveals a concrete runtime dependency.
