[ROLE]
Game Designer

[INPUTS RECEIVED]
- AGENTS.md
- docs/MASTER_STATE.md
- docs/GAME_VISION.md
- docs/CODEBASE_MAP.md
- docs/FIRST_ITERATION_BRIEF.md
- docs/iterations/002/00_orchestrator_pass.md

[CURRENT GAME MODEL]
- current loop
  PiChan currently presents itself as a finite-arena arcade survival loop with player movement, shooting, Onion pressure, level progression, arena shape changes, and layered feedback. Prior direction used shape cycling and runtime arena rotation as difficulty/progression signals.
- existing rules identified
  Onion V2 is the current enemy basis, with more aggressive chase, light projectile dodge, and visual feedback. Player and bullet feedback already exist. Arena supports multiple shapes and runtime rotation. Level/progression data is known to live in config/progression files, but exact spawn ownership is not confirmed by the design documents.
- current progression identified
  Existing documents describe levels, shape changes, shape cycles, and difficulty increases when a cycle restarts. Iteration 002 rejects arena rotation as a future difficulty mechanic and redirects difficulty toward a fixed-arena wave model.
- weak signals
  Arena rotation conflicts with readability. Infinite alive-onion scaling does not fit a finite arena. Shape progression may still have value only if static and readable. Spawn count, alive cap, wave budget, cadence, and completion are not yet formalized as player-facing rules.

[ANALYSIS]
- readability problems
  Runtime arena motion asks the player to reread the boundary while also reading onions, bullets, movement, and collision danger. That is too expensive for first-minute clarity. A finite arena also becomes unreadable if active onions scale without a strict cap.
- rhythm problems
  Without a wave budget and spawn cadence, pressure can feel arbitrary: either empty when enemies are gone, or flooded when enemies stack. The game needs a readable cycle of start, pressure, replacement, final clear, completion.
- balance problems
  Difficulty must separate moment-to-moment density from total endurance. More onions alive raises spatial danger. More onions total lengthens a wave. Faster spawns reduce breathing room. Stronger onion pressure changes threat quality. Treating these as one difficulty knob will produce spikes.
- progression problems
  Prior progression leaned on arena transformation and rotation. Iteration 002 needs progression that grows through limited pressure variables while preserving field readability. The first pass should validate the wave model before shape variety or late-game escalation.
- promising elements to preserve
  Finite arena combat, aggressive readable onions, shooting and survival pressure, existing player/bullet feedback if it supports hazard reading, and static arena shape differences if they later prove useful without motion.

[DECISIONS]
1. CUT runtime arena rotation as a difficulty mechanic.
   Purpose: remove a readability cost that competes with enemy, bullet, and boundary reading.
   Expected player impact: the player can learn the active space and attribute deaths to movement or enemy pressure, not shifting geometry.
   Priority: P0.
   Risk: existing documents and code still treat rotation as current or approved, so later artifacts must normalize that conflict.
   Dependency: gameplay programmer must plan removal or disabling only after confirming current arena/progression ownership.

2. KEEP one fixed arena for the first wave-model implementation pass.
   Purpose: validate capped waves, queued spawns, cadence, and completion without shape noise.
   Expected player impact: early waves are easier to parse and pressure changes come from onion behavior and spawn timing.
   Priority: P0.
   Risk: using only one arena may make early progression feel flatter if onion pressure is undertuned.
   Dependency: use the most readable existing static arena shape; do not require new art or new geometry.

3. DEFER a very small set of static arena shapes.
   Purpose: preserve the possibility that static shape variety can support progression after the wave model works.
   Expected player impact: future variety can change spatial decisions without motion if tests prove it remains readable.
   Priority: P2.
   Risk: adding shape changes too early can hide whether the wave model itself works.
   Dependency: only revisit after manual tests validate fixed-arena wave readability.

4. KEEP `maxAliveOnions` as the moment-to-moment pressure cap.
   Purpose: limit active threats in the finite arena.
   Expected player impact: the player sees a clear maximum crowd size and can plan movement around readable pressure.
   Priority: P0.
   Risk: if set too high, the cap fails and the arena becomes a crowd flood; if too low, the loop becomes empty.
   Dependency: spawn rules must respect the cap at all times.

5. KEEP `totalOnions` as the wave budget.
   Purpose: define wave length, endurance, and completion independently from active density.
   Expected player impact: the player gets a finite objective: survive and clear the wave budget.
   Priority: P0.
   Risk: if set too high, waves feel like grind; if too low, progression lacks weight.
   Dependency: completion must wait until both the spawn budget is exhausted and no onions remain alive.

6. KEEP `spawnIntervalMs` as the replacement cadence.
   Purpose: control how quickly defeated onions are replaced while the wave budget remains.
   Expected player impact: pressure returns with a readable rhythm instead of instant arbitrary re-flooding.
   Priority: P0.
   Risk: too fast makes the cap feel fake; too slow makes the arcade loop stall.
   Dependency: cadence must apply after wave start and after onion deaths while respecting `maxAliveOnions` and remaining budget.

7. REDUCE difficulty growth to four knobs only: alive cap, total budget, spawn cadence, and onion pressure.
   Purpose: grow difficulty without adding visual or rules noise.
   Expected player impact: later waves feel tighter and more dangerous for understandable reasons.
   Priority: P0.
   Risk: onion behavior tuning may become too aggressive if used to compensate for low counts.
   Dependency: no new enemies, no new arena motion, no HUD additions, no scoring redesign.

8. KEEP clear wave completion through gameplay state.
   Purpose: make the loop legible without adding HUD work.
   Expected player impact: when the final onion is gone and no more spawn, the wave is understood as complete through the state change and transition pacing.
   Priority: P1.
   Risk: without HUD or new feedback, completion may be under-signaled if transition timing is weak.
   Dependency: completion rule must be deterministic: spawn queue empty plus zero alive onions.

9. KEEP current scoring assumptions and CUT scoring redesign.
   Purpose: prevent the difficulty reset from becoming a reward-system pass.
   Expected player impact: the player can focus on survival, clearing, and pressure reading.
   Priority: P1.
   Risk: wave budgets may change score opportunity volume if scoring is per kill.
   Dependency: gameplay programmer should flag score-side effects but not redesign scoring in this pass.

[REQUESTS TO GAMEPLAY PROGRAMMER]
- Identify the actual owners of onion spawning, alive onion count, level or wave advancement, arena shape application, and arena rotation.
- Translate the design into the smallest implementation plan that can express:
  `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, `onionPressure`, spawn queue, and wave completion.
- Treat exact numeric values below as first-pass design ranges, not mandatory constants if the existing code requires a smaller safe step.
- Keep the first implementation pass rules-only and tuning-focused where possible.
- Do not add new enemy types, new art, HUD, scoring redesign, moving arena, runtime arena rotation, or broad loop rewrite.
- Flag any implementation blocker where the current spawn/progression system cannot support the model locally.

[REQUESTS TO PIXEL ARTIST]
- No request.
- Visual work is deferred. The first pass must determine whether rules, caps, cadence, and existing feedback are enough for readability.

[OUTPUT ARTIFACT]
DESIGN PATCH SPEC

- Objective
  Define the smallest successful PiChan wave model for a finite, stable arena: capped active onions, finite wave budget, queued replacement spawns, readable cadence, existing onion pressure, and clear completion.

- Rules
  - A wave starts with a stable arena, a fixed wave budget, and an initial spawn set that cannot exceed `maxAliveOnions`.
  - Onions enter from the wave budget. Each onion spawned consumes one unit from `totalOnions`.
  - `maxAliveOnions` is the maximum number of onions allowed alive at the same time.
  - `totalOnions` is the total number of onions available in the wave, including initial onions and later replacements.
  - `spawnIntervalMs` is the minimum readable delay between eligible spawns while budget remains.
  - `onionPressure` is the behavior intensity of existing Onion V2 pressure, not a count and not a new enemy type.
  - When an onion dies and the wave budget remains, the queue may spawn another onion only after the cadence allows it and only if alive count is below cap.
  - A wave ends when `totalOnions` has been fully spent and alive onion count is zero.
  - Runtime arena rotation is not a valid wave rule.
  - Alive onion count must not scale indefinitely.

- Difficulty
  - Difficulty grows by limited pressure, not noise.
  - First-pass early wave ladder:
    - Wave 1: `maxAliveOnions` 1, `totalOnions` 3-4, `spawnIntervalMs` 1800-2400, `onionPressure` low.
    - Wave 2: `maxAliveOnions` 2, `totalOnions` 5-6, `spawnIntervalMs` 1600-2200, `onionPressure` low.
    - Wave 3: `maxAliveOnions` 2, `totalOnions` 7-8, `spawnIntervalMs` 1300-1800, `onionPressure` medium.
    - Wave 4: `maxAliveOnions` 3, `totalOnions` 8-10, `spawnIntervalMs` 1400-1900, `onionPressure` medium.
    - Wave 5: `maxAliveOnions` 3, `totalOnions` 10-12, `spawnIntervalMs` 1100-1600, `onionPressure` medium-high.
  - Do not exceed 3 alive onions in the first implementation pass unless human tests show the arena remains readable.
  - Prefer increasing `totalOnions` before increasing `maxAliveOnions`.
  - Prefer small cadence tightening before increasing onion behavior intensity.
  - Do not combine a cap increase, large budget increase, faster cadence, and higher onion pressure in the same early-wave step.

- Wave Model
  - Start: wave state initializes with a static arena, `totalOnions`, `maxAliveOnions`, `spawnIntervalMs`, and `onionPressure`.
  - Entry: initial onions spawn up to the alive cap or remaining budget, whichever is lower.
  - Active pressure: alive onions chase/pressure using existing Onion V2 behavior at the wave's pressure setting.
  - Replacement: defeated onions create room under the alive cap; queued onions enter only if budget remains and cadence has elapsed.
  - Exhaustion: when all budgeted onions have spawned, no further replacements occur.
  - Completion: when budget is exhausted and the last alive onion is cleared, the wave is complete.
  - Failure mode to avoid: a wave must never keep adding onions because time passed or because the player survived too long.

- Arena Model
  - First implementation pass uses one fixed static arena.
  - The arena does not rotate, move, pulse as geometry, or transform during a wave.
  - Existing arena shape support may remain technically available, but design validation uses one readable shape first.
  - A later pass may test a very small set of static shapes, one shape per wave or level, only after fixed-arena waves are validated.
  - Runtime rotation is explicitly rejected.

- Spawn Model
  - Spawning is budget-based, not endless.
  - Spawn queue exists conceptually as remaining unspawned onions in the wave budget.
  - Spawn cadence controls replacement rhythm and should be readable enough that a kill creates a short breathing beat.
  - Spawn cadence must not override alive cap.
  - Spawn cadence must not create simultaneous bursts that refill multiple enemies instantly unless the wave start explicitly does so under the cap.
  - Spawn placement must preserve fairness using existing spawn rules; do not add a new spawn-warning system in this pass.

- Scoring
  - KEEP current scoring behavior.
  - CUT scoring redesign from iteration 002.
  - The design accepts that `totalOnions` may affect kill opportunities, but this pass does not change score rules, rewards, multipliers, or HUD presentation.

- Progression
  - Early progression should be readable as:
    1. learn one-onion pressure;
    2. handle two active onions;
    3. endure a longer two-onion wave;
    4. handle a capped three-onion wave;
    5. handle tighter cadence and stronger onion pressure.
  - Progression should avoid adding multiple difficulty changes at once.
  - Wave-to-wave growth should stay finite and authored for practical early testing, not formulaic infinite scaling.
  - Static arena variety is deferred until the wave model itself is proven.

- Feedback Needs
  - Use existing feedback only.
  - Player, bullet, and onion feedback should remain subordinate to hazard readability.
  - Wave completion should be understandable from gameplay state and transition timing; no new HUD layer is requested.
  - If completion is not readable in human testing, first adjust pacing or existing feedback before requesting new art or HUD.
  - Onion feedback that obscures position, collision, or threat direction should be reduced in a later feedback pass, not expanded here.

- Manual Acceptance Tests
  - Action: start Wave 1 and move around without shooting for several seconds.
    Context: fixed arena, first wave settings.
    Expected observable result: arena boundary remains stable; the player can track self-position and one onion without geometry motion or crowd noise.
  - Action: clear the first onion in Wave 1.
    Context: remaining wave budget exists.
    Expected observable result: a replacement onion appears only after a readable delay, not instantly and not above the alive cap.
  - Action: play Wave 2 until two onions are alive.
    Context: `maxAliveOnions` is 2.
    Expected observable result: no third onion appears while two are alive, even if wave budget remains.
  - Action: kill one onion in Wave 2 while another remains alive.
    Context: budget remains and alive count drops below cap.
    Expected observable result: pressure briefly relaxes, then the queue restores pressure according to cadence.
  - Action: finish all budgeted onions in a wave.
    Context: spawn queue empty and final alive onion defeated.
    Expected observable result: no additional onion appears; the wave advances or enters its completion transition.
  - Action: compare Wave 1, Wave 3, and Wave 5 in one run.
    Context: early wave ladder.
    Expected observable result: difficulty growth is felt through more endurance, tighter cadence, capped active pressure, and stronger onion pressure, not arena motion or indefinite enemy count.
  - Action: observe bullet, player, and onion feedback during a capped three-onion wave.
    Context: Wave 4 or Wave 5.
    Expected observable result: effects do not obscure onion positions, bullet direction, player facing, or arena boundaries.
  - Action: continue playing after reaching the alive cap.
    Context: any early wave where budget remains.
    Expected observable result: active onion count stays at or below cap until the player kills one; pressure is high but finite.

- Open Risks
  - Actual spawn ownership may not match the conceptual wave model and may require a narrower technical compromise.
  - Existing level progression may be level-based rather than wave-budget-based, creating mapping risk.
  - Removing rotation as a design direction conflicts with older master documents until a later documentation update.
  - One fixed arena may expose that current Onion V2 pressure is either too weak or too visually noisy.
  - Without HUD work, wave completion may need careful transition pacing to be readable.
  - If scoring is kill-based, larger `totalOnions` changes score volume even without a scoring redesign.

- Out of Scope
  - Arena rotation.
  - Moving arena.
  - Runtime arena transformation.
  - Infinite alive-onion scaling.
  - New enemy types.
  - New art.
  - HUD work.
  - Scoring redesign.
  - New spawn-warning systems.
  - Broad loop rewrite.
  - Architecture refactor.
  - Late-game infinite scaling model.
  - Code implementation.
