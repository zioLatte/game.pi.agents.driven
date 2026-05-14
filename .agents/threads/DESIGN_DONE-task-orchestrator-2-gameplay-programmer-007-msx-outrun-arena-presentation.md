# TASK SUMMARY

Thread basename: `DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation`
Canonical state file: `.agents/threads/DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation.state.json`
Structured log file: `.agents/threads/DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-007`
- Thread name: `msx-outrun-arena-presentation`
- Title: MSX/OutRun arcade arena presentation
- Problem statement: the current canvas presentation still reads as empty/space-like and onion spawning is not visually connected to gates or wave queue state; evolve it toward a minimal retro asphalt/terrain arcade arena with visible gates, queued onion previews, a stronger right status panel, and continuous level feedback.
- Game flow context: fixed arena / finite waves / gate spawning / queued pressure / right HUD / continuous level transitions / lightning accelerator feedback
- Task level: `L3`
- Patch budget: `medium`, staged only

## Current Snapshot

- Status: `DESIGN_DONE`
- Current owner: `gameplay-programmer`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 00m`
- Last updated at: `2026-05-14 19:22 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `.agents/templates/thread_template.md`
- `.agents/templates/thread_state_template.json`
- `.agents/templates/thread_log_template.jsonl`
- `.agents/threads/004-speed-dot-contested-powerup/thread.md`
- `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.md`
- `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.md`
- `index.html`
- `css/game.css`
- `main.js`
- `js/core/LevelManager.js`
- `js/core/Arena.js`
- `js/ui/canvas.js`
- `js/entities/Onion.js`
- `js/entities/Player.js`
- `config/levels.json`

## Validated Decisions

- Fixed-arena / finite wave model remains the strategic direction.
- Runtime arena rotation remains rejected.
- Difficulty must keep `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, and existing onion pressure semantics intact.
- Normal level transition is already non-blocking in the wave-completion path: `main.js` resets to the next level, plays level-up SFX, shows `level-toast`, updates HUD, and does not call `showLevelOverlay()` there.
- The legacy `level-overlay` DOM and `showLevelOverlay()` function still exist and `isOverlayActive()` still includes it; goto/debug and other overlay flows must remain intact.
- Speed Dot / lightning accelerator already exists as a singleton power-up with shared boost duration and multiplier through `LevelManager` config defaults.
- Pi-chan and onion boost rings already exist and deplete from entity boost remaining ratio.
- Current background generation in `js/ui/canvas.js` uses blue/purple radial glows plus star-like dots; this conflicts with the requested no-space/no-galaxy direction.
- Current draw pipeline clips to the arena, draws `backgroundCanvas` inside the clip, draws speed dot, onions, player, then arena border; outside the arena is not a separate terrain layer.
- Current onion spawn uses random world edge positions and then `arena.constrainCircle(...)`; it is not gate-based.
- `LevelManager.getWaveProgress()` already exposes `queuedOnions`, so HUD and queued preview can be read-only derivations instead of new progression state.

## Draft Assumptions In Play

- The current request supplies enough game-design direction; the next bottleneck is implementation planning, call-site scope, and staging.
- A new small `js/core/ArenaGates.js` helper is likely acceptable if it stays pure/read-only over current arena geometry and avoids modifying `Arena.js`.
- Gate spawning should consume the same wave budget at the same moment as current `#spawnQueuedOnion`; only spawn position/source changes.
- Queued onion preview is decorative only in v1 and must not create entities, collisions, AI, or budget mutations.
- Right sidebar HUD can be extended in existing DOM/CSS instead of introducing a new UI system.
- `js/ui/canvas.js` may need to be in scope because it currently owns the space-like generated background imported by `main.js`.
- Thread 006 is still `BUILD_DONE` pending review in canonical files; the next implementation plan must treat current dirty Speed Dot/Onion/Player behavior as existing work and must not revert it.

## Approved Direction

- Produce a staged implementation plan first; no direct build yet.
- Stage 1 should replace background/draw layers with terrain/asphalt language while keeping the centered gameplay canvas.
- Stage 2 should introduce a small gate abstraction and gate drawing.
- Stage 3 should change onion spawn positions to gate-based while preserving cap, budget, cadence, completion, collision, and debug/goto behavior.
- Stage 4 should add decorative queued onion previews outside the arena near gates using `totalOnions - spawnedOnions`.
- Stage 5 should extend the right HUD with queued/boost/dot state using read-only runtime data.
- Stage 6 should verify continuous progression remains overlay-free for normal wave completion.
- Stage 7 should polish lightning/speed-dot visuals only if current implementation is insufficient after inspection.

## Scope

### Candidate impact surface for implementation spec

- `main.js`
- `js/core/LevelManager.js`
- `js/core/ArenaGates.js` if a helper module is justified
- `js/ui/canvas.js` if replacing the generated space-like background there is lower risk than duplicating terrain drawing in `main.js`
- `index.html`
- `css/game.css`
- `js/entities/Player.js` only for boost read-state/accessor or visual ring adjustment if current behavior is insufficient
- `js/entities/Onion.js` only for boost ring/readability or spawn-preview asset reuse constraints if current behavior is insufficient

### Conditional / avoid by default

- `js/core/Arena.js`: avoid changes unless gate geometry cannot be computed safely from existing `arena.points`.
- `config/levels.json`: avoid by default; optional fields only if the implementation plan proves a narrow backward-compatible need.

### Explicit non-goals

- No broad game-loop rewrite.
- No new enemy archetypes.
- No moving arena, arena rotation, or runtime arena motion.
- No scoring redesign.
- No new power-up system, multiple dots, or boost stacking.
- No changes to bullet behavior, controls, collision rules, audio, online/network/presence, or existing goto/debug functionality.
- No asset production unless a later owner explicitly proves canvas drawing cannot meet readability.
- No blocking inter-level overlay for normal progression.

### Freeze zones

- `js/ai/OnionAI.js`
- `js/entities/Bullet.js`
- `js/core/Engine.js`
- `js/core/physics.js`
- `assets/`
- `sounds/`
- `js/net/`
- `js/services/`
- unrelated dirty worktree changes
- canonical files for other threads except task-orchestrator updates

## Required Analysis For Gameplay-Programmer

- Identify the current draw pipeline in `main.js`, including clip order, entity order, border order, and fallback branch.
- Identify arena clipping and background ownership across `main.js` and `js/ui/canvas.js`.
- Identify current `LevelManager.#spawnQueuedOnion(...)` behavior and all call sites.
- Identify current speed dot lifecycle, pickup ordering, renderer, target assignment, and boost ring state.
- Identify current run HUD DOM bindings and update flow.
- Identify exactly where `level-overlay` still affects blocking UI and which normal progression paths no longer call it.
- Produce a staged implementation spec with approved files, forbidden files, runtime changes, data/tuning changes, backward compatibility notes, validation commands, and manual tests.

## Validation And Checks

### Required validations for later build

- `node --input-type=module --check < changed-js-file>` for every changed JS file.
- JSON parse for `config/levels.json` if changed.
- Local static server smoke if possible.
- Browser console check.
- Browser visual check for desktop and mobile-sized viewport.
- PHPMD check only if PHP files/config exist; current repo inspection found none, so PHPMD is not applicable unless later scope changes.

### Human test checklist

- Verify level 1 starts without console errors.
- Verify the canvas remains centered.
- Verify outside-arena area shows only ground/asphalt/terrain, not space/galaxy/nebula/deep sci-fi.
- Verify arena floor is separately readable inside the arena.
- Verify visible north/east/south/west gates.
- Verify onions enter from gates and remain constrained validly.
- Verify wave `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, and completion behavior remain intact.
- Verify queued onions are visible outside the arena near gates and count equals `totalOnions - spawnedOnions`.
- Verify right HUD shows level, opinion, next-level progress, onions cleared/total, queued count, Pi-chan boost state, and dot state if implemented.
- Verify speed/lightning pickup can be collected by Pi-chan.
- Verify onion can target/collect the pickup when convenient under existing thread 006 behavior.
- Verify boost ring appears and depletes for Pi-chan and onion.
- Verify normal level transition remains continuous and uses toast/HUD, not blocking level overlay.
- Verify goto/debug level UI remains intact.
- Verify game over, continue, pause/resume if present, collisions, bullets, and onion chase remain functional.

## Open Questions

- None blocking for gameplay-programmer. If implementation confidence drops below 95%, ask one focused question before build approval.

## Artifacts

- `.agents/threads/DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation.md`
- `.agents/threads/DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation.state.json`
- `.agents/threads/DESIGN_DONE-task-orchestrator-2-gameplay-programmer-007-msx-outrun-arena-presentation.log.jsonl`

## Solution Applied

`Pending. No runtime implementation by task-orchestrator.`
