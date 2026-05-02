[ORCHESTRATOR INPUT]
- Goal
  Normalize iteration 002 into a v1 build brief that proves a fixed-arena wave model without broad cleanup, legacy deletion, or unrelated gameplay changes.
- Inputs reviewed
  `AGENTS.md`
  `docs/MASTER_STATE.md`
  `docs/GAME_VISION.md`
  `docs/CODEBASE_MAP.md`
  `docs/iterations/002/00_orchestrator_pass.md`
  `docs/iterations/002/01_design_patch_spec.md`
  `docs/iterations/002/02_implementation_patch_spec.md`
- Normalization target
  Produce a strict build-ready master patch brief for:
  `docs/iterations/002/03_master_patch_brief.md`

[NORMALIZED FINDINGS]
- Confirmed observations
  Iteration 002 rejects arena rotation as the active difficulty direction.
  The replacement model is a finite wave model using `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, a spawn queue, and deterministic completion.
  `config/levels.json` is the level data source.
  `js/core/LevelManager.js` already owns level loading, player creation, arena creation, initial onion spawning, level config parsing, and onion tuning assignment.
  `main.js` owns the runtime update loop, local onion filtering, level completion check, level overlay, and goto table.
  `js/core/Arena.js` owns static arena shape support and runtime rotation internals.
- Scope corrections
  The implementation spec correctly identifies `LevelManager` as the likely wave lifecycle owner.
  The implementation spec is too broad where it suggests removing or dead-ending Arena rotation internals in v1.
  v1 should remove rotation from active config, level construction, progression display, and main update use only where required.
  v1 should not delete or refactor Arena rotation internals unless a direct runtime blocker is discovered during build.
  v1 should not broadly rewrite config/progression helpers. Existing goto and overlay helpers should either keep working or be updated locally to read the new wave fields.
  v1 should not touch Player, Bullet, Onion, or OnionAI. Onion pressure must be mapped through existing fields already assigned by `LevelManager`.
- Risks
  `main.js` currently keeps a local onion array and filters it, which can conflict with a `LevelManager`-owned spawn queue.
  Completion ordering can regress if the wave completes during a temporary zero-alive gap before the queue budget is exhausted.
  Dying onions can make the visual active count ambiguous if replacement spawning starts before death fade cleanup.
  Removing rotation too broadly can create avoidable Arena regressions.
  A shorter or reshaped level config can break `PI_START_LEVEL`, goto rows, or overlay expectations if those helpers are not preserved locally.

[DECISIONS]
- Approved for v1
  Implement a fixed-arena wave lifecycle.
  Treat this as a `Behavior Patch`, `Tuning Patch`, and small structural ownership cleanup inside `LevelManager.js` and `main.js`.
  Use `LevelManager.js` as the wave lifecycle owner.
  Add explicit wave data:
  `maxAliveOnions`
  `totalOnions`
  `spawnIntervalMs`
  Use a spawn queue based on remaining unspawned wave budget.
  Enforce deterministic wave completion only when the spawn budget is exhausted and no active or visually dying onions remain.
  Remove arena rotation from active progression by config/path/display first.
  Keep one fixed static arena shape for the first build unless existing data shape requires a smaller compatible step.
  Keep current scoring behavior.
  Keep current Player, Bullet, Onion, and OnionAI behavior.
- Deferred / Follow-up
  Arena rotation internals cleanup.
  Static multi-shape progression.
  Onion AI duration/cooldown redesign.
  Player feel changes.
  Bullet behavior changes.
  Feedback reduction pass.
  HUD wave counter, queue indicator, or progress display.
  Scoring redesign or wave-clear bonuses.
  Documentation updates to master state and game vision.
- Explicitly excluded
  Broad loop rewrite.
  Broad config/progression helper rewrite.
  New enemy types.
  New art.
  New HUD layer.
  New spawn-warning system.
  Network, presence, nickname, lifecycle, or online service changes.
- Out of Scope
  Any v1 change requiring edits to:
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
  `assets/**`
  `sounds/**`
  `css/**`
  online/network/presence files

[BUILD READINESS]
- Status
  BUILD READY
- Reason
  The v1 scope is small, explicit, file-bounded, and testable.
  It proves the fixed-arena wave model through config data, `LevelManager` wave lifecycle ownership, and local `main.js` integration.
  It does not require touching Player, Bullet, Onion, or OnionAI.
  Arena is conditional only and should be avoided unless active runtime integration cannot be made correct without a local Arena change.
- Build gate constraints
  Approved files are explicit.
  Forbidden files are explicit.
  Runtime changes are limited to wave spawn, queue, completion, and active rotation removal.
  Manual tests are defined.
  Risks and deferred items are stated.
  No unresolved design/code/readability conflict remains for v1.

[MASTER PATCH BRIEF]
- Objective
  Prove the fixed-arena wave model in v1: capped active onions, finite wave budget, readable replacement cadence, deterministic wave completion, and no arena rotation in active progression.

- Scope
  Implement the smallest playable wave lifecycle that replaces spawn-all level completion with:
  `maxAliveOnions`
  `totalOnions`
  `spawnIntervalMs`
  spawn queue
  completion when budget is exhausted and no onions remain active or visually dying

  Keep the existing arcade loop, player, bullets, onion behavior, scoring, assets, and styles intact.

- Approved Files
  `config/levels.json`
  `js/core/LevelManager.js`
  `main.js`

- Conditionally Allowed Files
  `js/core/Arena.js`

  Use only if strictly required to stop active progression rotation or fix a direct runtime dependency.
  Do not delete or refactor Arena rotation internals in v1 unless the build proves it is required.

- Forbidden Files
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
  `assets/**`
  `sounds/**`
  `css/**`
  online/network/presence files

- Runtime Changes
  On level or wave load:
  reset wave runtime state;
  read `maxAliveOnions`, `totalOnions`, and `spawnIntervalMs`;
  create the static arena through the existing path;
  spawn initial onions up to `min(maxAliveOnions, totalOnions)`;
  track spawned budget count.

  During update:
  keep `main.js` using the `LevelManager`-owned onion list or a locally compatible reference;
  remove onions only after existing death completion rules allow removal;
  treat visually dying onions as still occupying active pressure for cap/completion purposes unless the existing code proves otherwise;
  spawn exactly one queued onion only when budget remains, active count is below cap, and cadence has elapsed;
  never spawn above `maxAliveOnions`;
  never spawn after `totalOnions` has been spent;
  advance only when spawned count is at least `totalOnions` and no active or visually dying onions remain.

  Arena:
  no runtime arena rotation in active progression;
  no arena shape rotation during active waves;
  no new arena motion.

- Data/Tuning Changes
  Replace active `onionCount` usage with:
  `maxAliveOnions`
  `totalOnions`
  `spawnIntervalMs`

  Remove active `arenaRotationSpeed` from v1 wave entries or set it outside the active read path.
  Keep `arenaShape` but use one static readable shape for v1.
  Keep `bulletBounces` if current shooting progression depends on it.
  Keep existing onion pressure tuning fields if that is the smallest compatible mapping.
  Do not exceed 3 active onions in v1.

  Suggested v1 ladder:
  Wave 1: `maxAliveOnions` 1, `totalOnions` 3, `spawnIntervalMs` 2200.
  Wave 2: `maxAliveOnions` 2, `totalOnions` 5, `spawnIntervalMs` 1900.
  Wave 3: `maxAliveOnions` 2, `totalOnions` 7, `spawnIntervalMs` 1600.
  Wave 4: `maxAliveOnions` 3, `totalOnions` 8, `spawnIntervalMs` 1700.
  Wave 5: `maxAliveOnions` 3, `totalOnions` 10, `spawnIntervalMs` 1400.

- Code To Keep
  Existing `LevelManager` responsibility for level construction and onion creation.
  Existing `Player` creation path.
  Existing static Arena shape construction and collision constraint behavior.
  Existing `Onion` constructor, movement, death fade, dodge, chase, and visual feedback behavior.
  Existing `OnionAI` behavior.
  Existing bullet behavior.
  Existing per-kill score behavior.
  Existing level transition shell.
  Existing goto helper, updated only as needed to display or navigate wave fields correctly.

- Code To Remove From Active Path
  Active `arenaRotationSpeed` read/use during level construction.
  Passing nonzero rotation speed into active wave Arena construction.
  Main update calls that exist only to animate arena rotation, if no longer required by active gameplay.
  Rotation/spin labels from the level overlay and goto table.
  Active `onionCount` use as the initial enemy count.
  Any active shape-cycle display or path that implies arena rotation or shape cycling is the v1 difficulty model.

- Code To Defer
  Deleting Arena rotation internals.
  Refactoring Arena motion APIs.
  Reworking config indexing beyond the fields needed for v1 wave data.
  Replacing all helper terminology unless a stale helper breaks v1.
  Moving scoring ownership.
  Changing player, bullet, onion, or AI behavior.

- Manual Test Cases
  Action: start a new game at Wave 1.
  Context: v1 fixed-arena wave config.
  Expected observable result: one onion appears initially, the arena is static, and no arena rotation or shape motion occurs.

  Action: wait in Wave 1 without killing the first onion.
  Context: `maxAliveOnions` is 1 and wave budget remains.
  Expected observable result: no second onion appears while the first onion is active or visually dying.

  Action: kill the first onion in Wave 1.
  Context: wave budget remains.
  Expected observable result: pressure briefly relaxes; one replacement appears only after death cleanup and the configured cadence; no instant refill.

  Action: play Wave 2 until two onions are active.
  Context: `maxAliveOnions` is 2.
  Expected observable result: no third onion appears while two onions are active.

  Action: kill one onion in Wave 2 while one onion remains.
  Context: budget remains and active count drops below cap.
  Expected observable result: exactly one queued onion spawns after cadence; pressure restores without exceeding the cap.

  Action: clear all budgeted onions in Wave 1 or Wave 2.
  Context: spawned count equals `totalOnions` and no active or visually dying onions remain.
  Expected observable result: no replacement spawns; the existing level transition starts deterministically.

  Action: use the goto helper to jump to Wave 4 or Wave 5.
  Context: capped three-onion wave.
  Expected observable result: active onion count never exceeds 3; difficulty comes from budget, cadence, and existing pressure tuning.

  Action: observe the level overlay and goto table.
  Context: after completing a wave and while selecting a later wave.
  Expected observable result: no spin/rotation text appears; helper output remains usable.

  Action: shoot onions and observe score.
  Context: any v1 wave.
  Expected observable result: score still increases by the existing per-kill rule; no new scoring rule appears.

  Action: resize the browser during a wave.
  Context: static arena with active onions and bullets.
  Expected observable result: arena, player, onions, and bullets remain constrained; arena does not begin rotating after resize.

- Risks
  `main.js` onion ownership cleanup can affect update, draw, collision, scoring, and completion order.
  Wrong cleanup order can exceed the visible cap during death fade.
  Wrong completion order can advance early during a temporary zero-active gap.
  Cadence may feel too delayed if measured after death fade; accept for v1 if readable, then tune later.
  Config edits can break `PI_START_LEVEL`, goto rows, or overlay assumptions if helper compatibility is not preserved.
  Static rect-only v1 can feel flat if onion pressure and cadence are undertuned.
  Larger `totalOnions` changes score volume because scoring remains per kill.

- Deferred Items
  Arena rotation internals removal.
  Static multi-shape progression.
  New enemy types.
  New art.
  HUD wave counter, queue indicator, or progress display.
  Scoring redesign or wave-clear bonuses.
  Spawn warning system.
  Onion AI duration/cooldown redesign.
  Bullet behavior redesign.
  Player feel changes.
  Feedback reduction pass.
  Late-game infinite or procedural scaling.
  Network, presence, nickname, lifecycle, or online service changes.
  Documentation updates to master state and game vision.
