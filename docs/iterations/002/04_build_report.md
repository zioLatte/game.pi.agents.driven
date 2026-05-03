[BUILD INPUT]
- Master Patch Brief received
  `docs/iterations/002/03_master_patch_brief.md` was read and treated as the implementation source of truth.
- Minimal assumptions adopted
  v1 is five authored static waves using the approved ladder.
  `LevelManager.js` owns wave lifecycle, active cap, spawn budget, queued spawning, cleanup, and completion state.
  `main.js` only calls `LevelManager` wave methods and keeps the existing transition shell, score-per-kill behavior, and goto/overlay usability.
  `js/core/Arena.js` was not changed because static arena construction works without touching rotation internals.

[CODEBASE TARGET]
- files modified
  `config/levels.json`
  `js/core/LevelManager.js`
  `main.js`
  `docs/iterations/002/04_build_report.md`
- responsibility of each file
  `config/levels.json`: authored v1 wave data, fixed rect arena, active cap, total budget, cadence, existing bullet bounce and onion pressure tuning.
  `js/core/LevelManager.js`: wave runtime owner, initial spawn, queued replacement spawn, active/dying pressure count, budget count, deterministic completion.
  `main.js`: local integration with `LevelManager` wave lifecycle, static arena update path, overlay/goto wording without spin/rotation language.
  `docs/iterations/002/04_build_report.md`: build report.
- files intentionally not touched
  `js/core/Arena.js`
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  `js/ai/OnionAI.js`
  `assets/**`
  `sounds/**`
  `css/**`
  online/network/presence/nickname/lifecycle service files

[IMPLEMENTATION PLAN]
1. Replace active level data with the v1 wave ladder.
   Purpose: remove active arena rotation and old `onionCount` semantics from runtime config.
   Impacted files: `config/levels.json`.
   Risk: shorter five-wave config changes goto/start-level assumptions.
2. Move spawn budget and cap ownership into `LevelManager`.
   Purpose: enforce initial spawn, queued replacements, max active onions, total budget, and deterministic completion.
   Impacted files: `js/core/LevelManager.js`.
   Risk: cleanup/spawn ordering could affect collision, drawing, or level transition timing.
3. Integrate wave lifecycle in the main loop.
   Purpose: use `LevelManager` for onion cleanup, queued spawn, and completion without taking wave ownership back into `main.js`.
   Impacted files: `main.js`.
   Risk: local onion reference must stay synchronized with `LevelManager`.
4. Remove active arena rotation language and update navigation labels locally.
   Purpose: keep overlay/goto usable without advertising rotation/spin/shape cycling as v1 progression.
   Impacted files: `main.js`.
   Risk: `index.html` table headers remain generic because it was outside approved file scope.

[PATCH]
- FILE: `config/levels.json`
  CHANGE TYPE: modify
  WHY: replace old shape-cycle/onion-count progression with the approved fixed-arena finite wave model.
  SUMMARY OF CHANGE: defined five rect waves with `maxAliveOnions`, `totalOnions`, and `spawnIntervalMs`; removed active `arenaRotationSpeed` and `onionCount`; kept existing compatible `bulletBounces`, `onionSpeedScale`, and `onionChaseSpeedScale`.

- FILE: `js/core/LevelManager.js`
  CHANGE TYPE: modify
  WHY: make `LevelManager` own v1 wave lifecycle.
  SUMMARY OF CHANGE: added wave state, initial spawn up to `min(maxAliveOnions, totalOnions)`, queued single-onion replacement after cadence, inactive cleanup, active/dying pressure count, spawned budget tracking, and deterministic completion only when budget is spent and no active/dying onions remain. Arena construction is static and no nonzero rotation speed is passed.

- FILE: `main.js`
  CHANGE TYPE: modify
  WHY: integrate `LevelManager` wave lifecycle without broad loop rewrite.
  SUMMARY OF CHANGE: replaced local onion filtering/completion with `LevelManager` cleanup, update, and completion checks; removed the per-frame arena rotation update call; updated overlay and goto row text to show waves, cap/budget, and cadence instead of spin/rotation/shape-cycle details; adjusted direct wave starts for the five-wave config.

- FILE: `docs/iterations/002/04_build_report.md`
  CHANGE TYPE: create
  WHY: required build artifact for iteration 002.
  SUMMARY OF CHANGE: records implementation scope, patch, validation, manual tests, risks, deferred items, and build status.

[MANUAL TEST CASES]
- action
  Start a new game at Wave 1.
  context
  v1 fixed-arena wave config.
  expected observable result
  One onion appears initially, the arena is static, and no arena rotation or shape motion occurs.

- action
  Wait in Wave 1 without killing the first onion.
  context
  `maxAliveOnions` is 1 and wave budget remains.
  expected observable result
  No second onion appears while the first onion is active or visually dying.

- action
  Kill the first onion in Wave 1.
  context
  Wave budget remains.
  expected observable result
  Pressure relaxes after the death fade; one replacement appears only after the configured cadence; no instant refill occurs.

- action
  Play Wave 2 until two onions are active.
  context
  `maxAliveOnions` is 2.
  expected observable result
  No third onion appears while two onions are active.

- action
  Kill one onion in Wave 2 while one onion remains.
  context
  Budget remains and active count drops below cap after death cleanup.
  expected observable result
  Exactly one queued onion spawns after cadence; pressure restores without exceeding the cap.

- action
  Clear all budgeted onions in Wave 1 or Wave 2.
  context
  Spawned count equals `totalOnions` and no active or visually dying onions remain.
  expected observable result
  No replacement spawns; the existing level transition starts deterministically.

- action
  Use the goto helper to jump to Wave 4 or Wave 5.
  context
  Capped three-onion wave.
  expected observable result
  Active onion count never exceeds 3; difficulty comes from budget, cadence, and existing pressure tuning.

- action
  Observe the level overlay and goto table.
  context
  After completing a wave and while selecting a later wave.
  expected observable result
  No spin/rotation text appears; helper output remains usable.

- action
  Shoot onions and observe score.
  context
  Any v1 wave.
  expected observable result
  Score still increases by the existing per-kill rule; no new scoring rule appears.

- action
  Resize the browser during a wave.
  context
  Static arena with active onions and bullets.
  expected observable result
  Arena, player, onions, and bullets remain constrained; arena does not begin rotating after resize.

[VALIDATION]
- `package.json` inspection
  No `package.json` exists in the repo root, so no npm lint/test/build scripts are available.
- project validation scripts
  No `Makefile`, ESLint config, PHP files, Composer file, or PHPMD config was found within the inspected project depth.
- commands run
  `node --input-type=module --check < js/core/LevelManager.js`
  Result: passed.
  `node --input-type=module --check < main.js`
  Result: passed.
  `node -e "JSON.parse(require('fs').readFileSync('config/levels.json','utf8')); console.log('json ok')"`
  Result: passed.
- PHPMD
  Not applicable. This repo is a JavaScript game repo and no PHP/PHPMD files were found.
- manual validation
  Not run in browser during this build. Manual test cases above remain required.

[KNOWN RISKS]
- possible regressions
  Reassigning the `LevelManager` onion list during cleanup changes the previous local-only filtering behavior in `main.js`.
  Replacement cadence is measured after the active/dying pressure slot opens, so cadence can feel slower than old instant spawn-all progression.
  After Wave 5, existing fallback behavior reuses the last config if play continues past authored v1 waves.
  Goto table headers in `index.html` still use existing generic labels because `index.html` was outside approved scope.
- assumptions
  Dying onions remain `alive` during fade and are removed only after the existing death fade sets `alive = false`.
  `Arena.js` rotation internals can remain untouched because no active config or main-loop path now drives arena rotation.
  Existing `onionSpeedScale`, `onionChaseSpeedScale`, dodge gating, scoring, player, bullet, onion, and AI behavior remain acceptable for v1.
- unresolved dependencies
  Browser manual testing is still needed to validate spawn timing, visual cap, transition timing, and resize behavior.

[DEFERRED ITEMS]
- postponed items
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
- reason
  All listed items are outside the approved iteration 002 v1 build scope.

[BUILD STATUS]
- READY TO TEST
- reason
  The approved v1 fixed-arena finite wave model is implemented in the approved files only, `Arena.js` was not touched, forbidden gameplay/entity/asset/style/service files were not modified, syntax and JSON validation passed, and manual browser tests are defined.
