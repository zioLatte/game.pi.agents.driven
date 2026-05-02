[ROLE]
Gameplay Programmer

[INPUTS RECEIVED]
- AGENTS.md
- docs/MASTER_STATE.md
- docs/GAME_VISION.md
- docs/CODEBASE_MAP.md
- docs/iterations/002/00_orchestrator_pass.md
- docs/iterations/002/01_design_patch_spec.md
- config/levels.json
- main.js
- js/core/LevelManager.js
- js/core/Arena.js
- js/entities/Onion.js
- js/ai/OnionAI.js
- js/entities/Player.js
- js/entities/Bullet.js
- js/core/state.js

[CODEBASE IMPACT MAP]
- `config/levels.json`
  current responsibility: level data source. Currently organized as `piTable` cycles with per-level `arenaShape`, `arenaRotationSpeed`, `bulletBounces`, `onionCount`, `onionSpeedScale`, and `onionChaseSpeedScale`.
  likely entry points: fetched in `main.js`, parsed by `LevelManager#setConfig`, indexed by `LevelManager#rebuildConfigIndex`, displayed by `main.js` goto overlay.

- `js/core/LevelManager.js`
  current responsibility: owns level loading, player creation, arena creation, initial onion spawning, level config parsing, bullet bounce lookup, onion speed/chase scale assignment.
  likely entry points: `loadLevel`, `clearLevel`, `#buildLevel`, `getLevelConfig`, `getBaseLevelConfig`, `getOnions`, `getBulletBounceCount`.

- `main.js`
  current responsibility: owns the runtime game loop, updates arena/player/onions, filters local onion array, detects all-onions-gone level advancement, applies score side effects, shows level overlay, renders goto table.
  likely entry points: `resetGame`, `update`, `showLevelOverlay`, `buildGotoRows`, local `onions` variable.

- `js/core/Arena.js`
  current responsibility: owns arena polygon shape, rotation state, rotation speed, geometry rebuild, collision constraint.
  likely entry points: constructor `options.rotationSpeed`, `setMotion`, `update`, `getRotationSpeedDeg`, `setShape`.

- `js/entities/Onion.js`
  current responsibility: owns one onion's movement, death fade, dodge behavior, chase movement response, visual feedback, arena constraint.
  likely entry points: constructor, `update`, `startDeathFade`, `dodgeEnabled`, `speedScale`, `chaseSpeedScale`, `alive`, `dying`.

- `js/ai/OnionAI.js`
  current responsibility: owns onion AI states, shoot-triggered chase, cooldown, base speed application.
  likely entry points: `updateOnionAI`, `startChase`, `setBaseSpeedAndColor`.

- `js/entities/Player.js`
  current responsibility: owns player movement, shooting, bullets, explosions, bullet bounce count.
  likely entry points: `update`, `shoot`, `bulletMaxBounces`.

- `js/entities/Bullet.js`
  current responsibility: owns projectile movement, arena bounce, fade, trail, bounce side effects.
  likely entry points: `update`, `onBounce`, `maxBounces`, `bounceCount`.

- `js/core/state.js`
  current responsibility: owns score, shots fired, onions killed, game time.
  likely entry points: `state.score`, `state.onionsKilled`, `reset`.

[ANALYSIS]
- feasibility of received requests
  The wave model is feasible without a new file and without a broad loop rewrite. `LevelManager.js` is already the spawn/progression construction owner and is the smallest sane owner for wave runtime state.
  Current code cannot satisfy the model by config-only edits. `onionCount` currently means "spawn all onions at level start". There is no spawn queue, no spawn cadence, and no separate total budget.
  Current all-onions-gone progression in `main.js` is deterministic but too primitive: it treats zero currently alive onions as level completion, not "budget exhausted plus zero alive onions".
  Arena rotation removal is both data cleanup and runtime-code cleanup. Setting all config rotation values to zero would stop visible rotation, but leaving rotation parsing, overlay labels, and arena motion APIs in active progression code keeps dead direction and future mistakes alive.

- technical incoherences
  `main.js` filters `onions = onions.filter(o => o.alive)`, which breaks the local variable away from `LevelManager.onions`. That is acceptable for the current one-shot level spawn, but it is unsafe for a LevelManager-owned wave queue.
  `LevelManager` currently owns initial spawn construction, but not ongoing spawn replacement or completion checks.
  `config/levels.json` is shape-cycle and rotation-oriented. Patching wave fields into the current shape cycle would preserve misleading structure.
  `main.js` level overlay and goto table still expose rotation/cycle language. That conflicts with the fixed-arena wave direction even if no new HUD is added.
  `OnionAI.js` has fixed chase duration/cooldown constants. For v1, `onionPressure` should map to existing speed/chase/dodge tuning in `LevelManager`; changing AI constants would increase blast radius.

- regression risks
  Moving onion array ownership back into `LevelManager` touches update, draw, collision, scoring, and completion flow in `main.js`.
  Replacing `onionCount` with `maxAliveOnions` and `totalOnions` requires updating every current consumer of `onionCount`.
  Removing active arena rotation from `Arena.js` can break resize preservation if callers still pass rotation options.
  If spawn cadence runs before dead onions are removed, replacements may appear while dying onions are still visually present and exceed readable pressure.
  If completion is checked before spawn budget state is updated, a wave can complete early after a temporary zero-alive gap.

- dependencies between systems
  `main.js` must use the same onion array owned by `LevelManager` for update, draw, collisions, spawn cap, and completion.
  `LevelManager` needs access to world size, context, player, arena, and config to spawn replacement onions with the same construction path as initial onions.
  `Player` and `Bullet` should remain unchanged; their behavior already supports the wave model.
  Score remains kill-based in `main.js`; larger `totalOnions` increases score opportunity by design side effect, not scoring redesign.

[DECISIONS]
1. Use `LevelManager.js` as the clear wave owner.
   Technical approach: extend the existing progression/spawn owner with wave state: spawned count, total budget, alive cap, spawn cadence timer, completion predicate, and a single spawn helper reused by initial and queued spawns.
   Impacted files: `js/core/LevelManager.js`, `main.js`, `config/levels.json`.
   Risk: moderate. This centralizes ownership but changes the runtime relationship between `main.js` and `LevelManager`.
   Priority: P0.

2. Replace `onionCount` with explicit wave fields.
   Technical approach: config entries should define `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, and pressure tuning. `onionCount` should not remain as an active config key because its old meaning conflicts with both cap and budget.
   Impacted files: `config/levels.json`, `js/core/LevelManager.js`, `main.js` goto table.
   Risk: moderate. Existing debug/readout code must be updated to avoid stale values.
   Priority: P0.

3. Remove arena rotation from active runtime direction.
   Technical approach: remove `arenaRotationSpeed` from config parsing and level display. Stop passing rotation speed into `Arena` for level construction. Remove or dead-end `Arena.update` usage for rotation if no remaining caller needs motion.
   Impacted files: `config/levels.json`, `js/core/LevelManager.js`, `main.js`, likely `js/core/Arena.js`.
   Risk: low to moderate. Shape collision must remain stable after removing motion.
   Priority: P0.

4. Keep static arena shape support, but use one fixed shape for v1.
   Technical approach: v1 config should use `arenaShape: "rect"` for early authored waves. Keep `Arena` polygon shape support because it does not conflict with fixed arena if static.
   Impacted files: `config/levels.json`, `js/core/Arena.js`.
   Risk: low.
   Priority: P1.

5. Enforce spawn cadence in `LevelManager`, not in `Onion`.
   Technical approach: `Onion` remains an enemy instance. `LevelManager` controls when new onions are created based on alive count, spawned budget, and a spawn timer. Spawn one queued onion per interval; do not burst refill multiple slots except initial wave fill.
   Impacted files: `js/core/LevelManager.js`, `main.js`.
   Risk: moderate. Ordering relative to death fade and cleanup must be explicit.
   Priority: P0.

6. Keep Onion behavior code for v1.
   Technical approach: preserve `Onion.js` and `OnionAI.js`. Map `onionPressure` through existing `speedScale`, `chaseSpeedScale`, and `dodgeEnabled` assignment during spawn.
   Impacted files: `js/core/LevelManager.js` only for assignment.
   Risk: low. If current chase is too noisy, reduce in a later feedback/AI pass.
   Priority: P1.

7. Keep score behavior.
   Technical approach: leave `state.score += 1` and `state.onionsKilled++` on bullet-onion kill. Do not add wave score bonuses or progress scoring.
   Impacted files: `main.js` only if kill handling is moved or touched during loop cleanup.
   Risk: low. Total wave budget changes score volume.
   Priority: P1.

8. Replace zero-onions completion with wave completion predicate.
   Technical approach: `main.js` should ask `LevelManager` whether the current wave is complete after onion cleanup/spawn update. Completion means spawned budget exhausted and no alive/dying onions remain.
   Impacted files: `js/core/LevelManager.js`, `main.js`.
   Risk: moderate. Wrong ordering can create early advancement or delayed completion.
   Priority: P0.

[REQUESTS TO GAME DESIGNER]
- No blocking clarification required.
- Implementation assumptions:
  - v1 may use `rect` as the only active arena shape.
  - `onionPressure` can be represented through existing onion speed/chase/dodge tuning rather than a new AI subsystem.
  - Completion does not require new HUD or new art; existing level transition overlay can remain as the completion transition.

[REQUESTS TO PIXEL ARTIST]
- No request.
- No new art or visual hierarchy work is required for implementation planning.

[OUTPUT ARTIFACT]
IMPLEMENTATION PATCH SPEC

- Goal
  Implement iteration 002 as a `Behavior Patch` plus `Tuning Patch`: replace the current spawn-all, shape-cycle, rotation-led level model with a fixed-arena wave model owned by `LevelManager`.

  Minimum viable v1:
  - one static arena shape, preferably `rect`;
  - no runtime arena rotation;
  - per-wave `maxAliveOnions`;
  - per-wave `totalOnions`;
  - per-wave `spawnIntervalMs`;
  - pressure tuning mapped to existing onion speed/chase/dodge fields;
  - queued replacement spawns under the alive cap;
  - deterministic completion when budget is exhausted and alive onion count is zero.

- Files Impacted
  Allowed for v1:
  - `config/levels.json`
    Replace shape-cycle/rotation/count data with authored early wave data.
  - `js/core/LevelManager.js`
    Own wave config parsing, wave state, initial spawn, queued spawn, alive cleanup, and completion predicate.
  - `main.js`
    Use `LevelManager` as onion/wave owner, replace zero-onions level-up check with wave completion, remove rotation/cycle display references from existing overlays/debug table.
  - `js/core/Arena.js`
    Remove or neutralize active rotation support if it is no longer called by level progression. Keep static shape construction and `constrainCircle`.

  Conditionally allowed only if build discovers a direct compile/runtime dependency:
  - `js/core/state.js`
    Only if wave state needs a non-scoring reset hook. Avoid unless required.

  Forbidden for v1:
  - `js/entities/Player.js`
  - `js/entities/Bullet.js`
  - `js/entities/Explosion.js`
  - `js/entities/Onion.js`
  - `js/ai/OnionAI.js`
  - `assets/**`
  - `sounds/**`
  - `css/**`
  - network, presence, nickname, lifecycle, and online service files
  - docs other than the later build report

- Systems Affected
  - Level/progression:
    Current level advancement remains numerically level-based, but each level becomes a wave entry.
  - Spawn ownership:
    Moves from one-time `#buildLevel` spawning plus local `main.js` filtering to `LevelManager` wave lifecycle ownership.
  - Alive onion count:
    Should be computed from the LevelManager-owned onion array, excluding removed dead onions and treating dying onions as still active until fade completes.
  - Wave completion:
    Moves from `main.js` local `onions.length === 0` to a LevelManager completion predicate.
  - Arena:
    Static geometry remains. Runtime rotation is removed from active progression.
  - Onion pressure:
    Existing `speedScale`, `chaseSpeedScale`, and `dodgeEnabled` remain the only v1 pressure levers.
  - Score:
    Kill-based scoring remains unchanged.

- Runtime Changes
  - On `loadLevel(level)`:
    - reset wave runtime state;
    - create player;
    - create static arena from the wave config;
    - initialize `totalOnions`, `maxAliveOnions`, `spawnIntervalMs`, spawned count, and spawn timer;
    - spawn initial onions up to `min(maxAliveOnions, totalOnions)`.
  - During each update:
    - update player and currently alive onions;
    - run bullet/player, bullet/onion, onion/player, and onion/onion collision handling with the LevelManager-owned onion list;
    - remove onions only after their death fade completes;
    - while spawned count is below `totalOnions`, alive count is below `maxAliveOnions`, and cadence has elapsed, spawn exactly one queued onion;
    - do not spawn if alive count is at cap;
    - do not spawn if total budget is exhausted;
    - complete the wave only when spawned count is at least `totalOnions` and alive count is zero.
  - Initial wave fill may spawn multiple onions immediately up to cap.
  - Replacement spawning should be one onion per `spawnIntervalMs`, not instant full refill.
  - Dead/dying onions should not allow unreadable overlap: a dying onion still occupies visual pressure until removed.
  - Level transition can continue to use existing level-up overlay and audio. Do not add wave HUD.

- Data/Tuning Changes
  - Replace current rotation/cycle readme language in `config/levels.json`.
  - Remove active `arenaRotationSpeed` fields from wave entries.
  - Replace active `onionCount` with:
    - `maxAliveOnions`
    - `totalOnions`
    - `spawnIntervalMs`
  - Keep `arenaShape`, but set v1 early waves to one static shape.
  - Keep `bulletBounces` if current shooting feel depends on it; do not redesign bullet progression in this pass.
  - Represent `onionPressure` without new AI:
    - option A, preferred: explicit `onionPressure` object containing existing tuning values such as `speedScale`, `chaseSpeedScale`, and `dodgeEnabled`;
    - option B, acceptable smaller patch: retain `onionSpeedScale` and `onionChaseSpeedScale` as implementation fields and treat them as the concrete pressure mapping.
  - Suggested first v1 waves:
    - Wave 1: `maxAliveOnions` 1, `totalOnions` 3, `spawnIntervalMs` 2200, low pressure.
    - Wave 2: `maxAliveOnions` 2, `totalOnions` 5, `spawnIntervalMs` 1900, low pressure.
    - Wave 3: `maxAliveOnions` 2, `totalOnions` 7, `spawnIntervalMs` 1600, medium pressure.
    - Wave 4: `maxAliveOnions` 3, `totalOnions` 8, `spawnIntervalMs` 1700, medium pressure.
    - Wave 5: `maxAliveOnions` 3, `totalOnions` 10, `spawnIntervalMs` 1400, medium-high pressure.
  - Do not exceed 3 active onions in v1.

- Code To Keep
  - `LevelManager` as the progression/spawn construction owner.
  - `Player` creation in `LevelManager`.
  - `Arena` static polygon construction and `constrainCircle`.
  - Existing `Onion` constructor and movement/death behavior.
  - Existing `OnionAI` chase/cooldown state machine.
  - Existing bullet bounce behavior.
  - Existing kill score side effects: `state.onionsKilled++` and `state.score += 1`.
  - Existing level overlay as the transition shell, with stale rotation/cycle labels removed.
  - Existing manual `goto` helper if updated to show wave fields instead of stale onion count/spin data.

- Code To Remove
  - Active `arenaRotationSpeed` parsing from `LevelManager`.
    Reason: direct conflict with no arena rotation.
  - Passing rotation speed into `new Arena(...)` during level load.
    Reason: runtime rotation is rejected.
  - `levelManager.arena.update(dt)` from the main update path if it only exists to rotate arena geometry.
    Reason: dead motion hook after rotation removal.
  - Rotation display in level overlay and goto table.
    Reason: exposes rejected direction to player/debug flow.
  - Active `onionCount` use as initial enemy count.
    Reason: old field conflates alive cap and total wave budget.
  - Shape-cycle copy and labels from config/readouts where they imply shape progression is the current difficulty model.
    Reason: misleading after fixed-arena reset.

- Code To Replace
  - Replace `#buildLevel` one-shot onion loop with reusable spawn helper plus wave initialization.
    Reason: queued replacement spawns need the same safe spawn construction as initial onions.
  - Replace local `main.js` onion array ownership with LevelManager-owned array access or mutation.
    Reason: current local filtering breaks central wave ownership.
  - Replace `if (onions.length === 0)` level-up check with `levelManager.isWaveComplete()` or equivalent.
    Reason: zero alive onions is not completion while spawn budget remains.
  - Replace `getOnionCountForLevel` with wave getters or remove if unused.
    Reason: the old term is ambiguous under the wave model.
  - Replace config index fields in `#rebuildConfigIndex` and `getLevelConfig` so wave entries expose `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, and pressure tuning.
    Reason: implementation must match the design model directly.

- Required Assets
  - None.

- Manual Test Cases
  - Action: start a new game at Wave 1.
    Context: v1 wave config, fixed arena.
    Expected observable result: arena is static, one onion appears initially, no arena rotation or shape motion occurs.
  - Action: wait in Wave 1 without killing the first onion.
    Context: `maxAliveOnions` is 1 and `totalOnions` remains above spawned count only if initial budget not exhausted.
    Expected observable result: no second onion appears while the first onion is alive.
  - Action: kill the first onion in Wave 1.
    Context: wave budget remains.
    Expected observable result: the onion finishes its death fade, then one replacement appears after the configured cadence; no instant refill.
  - Action: play Wave 2 until two onions are active.
    Context: `maxAliveOnions` is 2.
    Expected observable result: a third onion never appears while two onions are alive.
  - Action: kill one active onion in Wave 2 while one onion remains alive.
    Context: alive count drops below cap and budget remains.
    Expected observable result: pressure briefly relaxes, then exactly one queued onion spawns after cadence.
  - Action: clear all budgeted onions in Wave 1 or Wave 2.
    Context: spawned count equals `totalOnions` and no alive onions remain.
    Expected observable result: no replacement spawns; existing level transition starts.
  - Action: use the goto helper to jump to Wave 4 or Wave 5.
    Context: capped three-onion wave.
    Expected observable result: active onion count never exceeds 3; difficulty comes from budget, cadence, and pressure tuning.
  - Action: observe the level overlay after completing a wave.
    Context: transition screen.
    Expected observable result: no spin/rotation text appears; no new HUD is introduced.
  - Action: shoot onions and observe score.
    Context: any wave.
    Expected observable result: score still increases by 1 per onion kill; no new scoring rule appears.
  - Action: resize the browser during a wave.
    Context: static arena with active onions and bullets.
    Expected observable result: player, onions, bullets, and arena remain constrained; arena does not gain rotation after resize.

- Risks
  - Centralizing onion lifecycle in `LevelManager` is a small structural cleanup. It is justified because current local filtering conflicts with a queue owner, but it must stay local.
  - If dead/dying onion cleanup order is wrong, the visible alive cap can be exceeded during death fade.
  - If cadence starts at the wrong time, replacements can feel delayed by fade plus interval. This is acceptable for v1 if readable, but should be tested.
  - If `config/levels.json` is replaced too aggressively, `goto` helpers and `PI_START_LEVEL` assumptions may point at invalid level ranges.
  - Existing `PI_START_LEVEL` maps pi cycles to hardcoded level numbers. A shorter wave ladder can make this stale. Either update it locally or preserve enough entries to keep helper behavior stable.
  - Removing `Arena.update` or motion APIs too broadly could break resize code that currently preserves rotation fields.
  - Larger `totalOnions` increases score volume because scoring remains per kill.
  - Static rect-only v1 may feel flatter until cadence and onion pressure are tuned.

- Deferred Items
  - New enemy types.
  - New art.
  - HUD wave counter, queue indicator, or progress display.
  - Scoring redesign or wave clear bonuses.
  - Static multi-shape progression.
  - Late-game infinite or procedural scaling.
  - Onion AI duration/cooldown redesign.
  - Bullet behavior redesign.
  - Player feel changes.
  - Network/presence/stat schema changes.
  - Documentation updates to master state and game vision.
