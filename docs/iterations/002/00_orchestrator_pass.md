[ORCHESTRATOR INPUT]
- Goal of this iteration
  Start a design reset pass for PiChan difficulty and arena structure.
  Replace arena-rotation-led escalation with a simpler fixed-arena arcade wave model.
- Known state of the game
  PiChan is a finite-arena arcade game with existing level progression, arena shapes, runtime arena rotation, Onion V2 pressure, and layered feedback.
  Prior documents still describe arena rotation as pending or previously approved, but the new human direction rejects arena rotation as a future design direction.
  The current product goal remains readability, game feel, and loop clarity through small, reversible, testable changes.
- Relevant codebase notes
  `config/levels.json` is the confirmed level/progression data source.
  `js/core/LevelManager.js` is the confirmed runtime progression layer.
  `js/core/Arena.js` is the confirmed arena shape/rotation layer.
  `js/entities/Onion.js` is the confirmed enemy pressure layer.
  `js/entities/Bullet.js` and `js/entities/Player.js` remain relevant to feel/readability but are not the center of this reset.
  Any spawn ownership, wave ownership, or onion-count ownership outside the mapped files is not confirmed and must be verified before implementation planning.
- Prior outputs available
  `docs/MASTER_STATE.md`
  `docs/GAME_VISION.md`
  `docs/CODEBASE_MAP.md`
  `docs/iterations/001/03_master_patch_brief.md`

[AGENT CONSULTATION PLAN]
- Which agents will be consulted
  `game-designer` first.
  `gameplay-programmer` second.
  `pixel-artist` not consulted for this pass.
- In what order
  1. `game-designer`
  2. `gameplay-programmer`
  3. `orchestrator` final normalization
  4. `build-agent` only after build readiness is explicit
- Why
  The current problem is rules, progression, and difficulty structure, not implementation.
  The designer must define the minimum wave model before the programmer maps it to files.
  The programmer must verify actual spawn/progression ownership before any build brief.
  Pixel/art work is out of scope because the requested reset can be evaluated through rules and tuning first.

[NORMALIZED FINDINGS]
- Confirmed observations
  Arena rotation is rejected as a future design direction for PiChan difficulty.
  A finite arena cannot safely scale difficulty by increasing onions alive indefinitely.
  The current documents identify `config/levels.json`, `LevelManager.js`, `Arena.js`, and Onion-related behavior as likely pressure/progression hotspots.
  Iteration 001 was a feedback-reduction pass, not a full difficulty model reset.
  No new art, enemy type, HUD layer, or code implementation is requested for this pass.
- Concrete proposals
  Use a stable arena as the default difficulty base.
  Separate `maxAliveOnions` from `totalOnions` for each level or wave.
  Use `maxAliveOnions` to control moment-to-moment readability and spatial pressure.
  Use `totalOnions` to control wave length, endurance, scoring opportunity, and completion.
  Use a spawn queue so killed onions are replaced only while the remaining wave budget allows it.
  Use spawn cadence to control pressure spikes without flooding the finite arena.
  Use enemy pressure behavior and spawn timing before adding new enemy types.
  Use clear wave completion when the spawn queue is empty and no onions remain alive.
  Treat arena shape as stable per level or wave unless a later design spec proves that shape changes improve readability.
- Assumptions
  The game currently has or can support some concept of onion spawning/progression, but exact ownership is not confirmed from the documents alone.
  Existing arena shapes may remain useful if they are stable and readable.
  Difficulty can be expressed with existing onion behavior, counts, cadence, and arena constraints before adding systems.
  A minimal wave model is preferable to a broad progression redesign.
- Risks
  If spawn logic is scattered or implicit, implementation may require a wider technical pass than expected.
  If `maxAliveOnions` is too high, the finite arena becomes unreadable regardless of wave length.
  If `totalOnions` is too high, waves may feel like grind instead of arcade pressure.
  If spawn cadence is too fast, the cap will not protect readability.
  If spawn cadence is too slow, the loop may feel empty or stalled.
  If arena shape changes remain frequent, they may continue acting like a gimmick instead of a readable pressure rule.
- Conflicts
  Existing master documents still list arena rotation as current or approved direction, but the new iteration rejects it.
  Prior direction included arena transformation as part of escalation; iteration 002 must replace that with capped wave pressure.
  Build readiness is blocked until design numbers, file ownership, runtime changes, manual tests, and forbidden files are explicit.

[DECISIONS]
- Approved
  Arena rotation is removed from future design direction.
  Difficulty must not scale by increasing onions alive indefinitely.
  Future difficulty structure must separate:
  `maxAliveOnions`: active pressure cap.
  `totalOnions`: wave budget and completion target.
  The next design model should use stable arena, capped alive enemies, spawn queue, spawn cadence, enemy pressure behavior, and clear wave completion.
  Existing systems should be reviewed before adding anything new.
  Likely review targets are:
  `config/levels.json`
  `js/core/LevelManager.js`
  `js/core/Arena.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
  any confirmed spawn or game-loop owner discovered by code inspection
- Rejected
  Arena rotation as a future difficulty direction.
  Infinite or uncapped alive-onion scaling.
  New enemy types for this reset.
  New art for this reset.
  New HUD layers for this reset.
  Difficulty based on visual spectacle or arena motion.
- Deferred
  Concrete numeric tuning for `maxAliveOnions`, `totalOnions`, and spawn cadence.
  Any config edits.
  Any gameplay code edits.
  Any arena shape-order changes.
  Any scoring changes.
  Any wave-complete visual or audio treatment.
  Any new enemy archetype.
- Out of Scope
  Implementing code.
  Editing `config/levels.json`.
  Adding assets.
  Adding enemy types.
  Refactoring architecture.
  Rewriting the full loop.
  Pixel-art consultation.

[REQUESTS FOR NEXT ROUND]
- To Game Designer
  Produce `docs/iterations/002/01_design_patch_spec.md`.
  Define the smallest fixed-arena wave model using existing gameplay parts.
  Specify level or wave rules for `maxAliveOnions`, `totalOnions`, spawn queue behavior, spawn cadence, onion pressure behavior, and wave completion.
  State what arena shapes are kept, reduced, or deferred.
  Do not propose arena rotation.
  Do not propose new enemy types.
  Do not propose new art.
  Include manual acceptance tests with action, context, and expected observable result.
- To Gameplay Programmer
  Wait for the design spec before writing `docs/iterations/002/02_implementation_patch_spec.md`.
  Then inspect the real code to identify the actual owners of spawning, active onion count, level completion, arena shape application, and enemy pressure tuning.
  Translate the design into the smallest local implementation plan.
  State allowed files, forbidden files, runtime deltas, risks, and manual tests.
  Do not implement.
- To Pixel Artist
  No request.
  Visual work is deferred unless the rules-only wave model fails readability tests after implementation.

[BUILD READINESS]
- Status: NOT READY
- Reason
  The iteration has a clear strategic direction, but no build-ready patch exists.
  Design rules, numeric ranges, code ownership, allowed files, forbidden files, runtime changes, and final manual tests are not yet specified.
  The old arena-rotation direction is rejected, but the replacement model still needs a design spec and implementation spec.
- Missing pieces, if any
  `01_design_patch_spec.md`
  `02_implementation_patch_spec.md`
  Final orchestrator normalization or master patch brief after the specs exist
  Confirmed spawn/progression ownership from code inspection
  Explicit allowed and forbidden files
  Concrete runtime changes
  Concrete manual tests

[MASTER PATCH BRIEF]
- Objective
  Reset PiChan difficulty direction away from arena rotation and toward a readable fixed-arena wave model based on capped active pressure, queued spawns, cadence, enemy behavior, and clear completion.
- Scope
  Orchestration only.
  No implementation.
  No config edits.
  No gameplay code edits.
  Next handoff is design specification.
- Gameplay Changes
  Proposed only, not approved for build:
  Stable arena during a wave or level.
  Capped alive onion pressure through `maxAliveOnions`.
  Separate wave budget through `totalOnions`.
  Spawn queue that replaces defeated onions while budget remains.
  Spawn cadence that controls pressure timing.
  Clear wave completion when queue is empty and no onions remain alive.
  Existing onion pressure behavior used before any new enemy type is considered.
- Technical Changes
  None in this pass.
  Systems likely requiring review in the next technical pass:
  `config/levels.json`
  `js/core/LevelManager.js`
  `js/core/Arena.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
  any actual spawn/game-loop owner found in code
- Visual Changes
  None.
- Required Assets
  None.
- Manual Test Cases
  To be finalized after design and implementation specs.
  Future tests must cover:
  Start a first wave in a stable arena.
  Expected: player understands the active space without arena motion.
  Fight with the alive onion cap reached.
  Expected: pressure is readable and finite, not a crowd flood.
  Kill one onion while wave budget remains.
  Expected: replacement follows the defined spawn cadence instead of appearing as arbitrary chaos.
  Clear the final onion after the spawn queue is empty.
  Expected: wave completion is obvious from gameplay state.
  Compare early and later waves.
  Expected: later difficulty comes from budget, cap, cadence, and onion pressure, not from rotation or indefinite enemy count.
- Risks
  The actual spawn system may not match the assumed model.
  Separating alive cap and total budget may require touching progression code, not only config.
  A stable arena may expose weaknesses in onion pressure that rotation previously masked.
  Poor cadence tuning can make the loop either empty or unreadable.
  Removing rotation direction conflicts with current master documents until they are updated in a later approved documentation pass.
- Deferred Items
  Design patch spec.
  Implementation patch spec.
  Build-ready master patch brief.
  Config changes.
  Code changes.
  Documentation updates to master state and game vision.
  New enemy types.
  New art.
