# TASK SUMMARY

Thread basename: `DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism`
Canonical state file: `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.state.json`
Structured log file: `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-006`
- Thread name: `chase-dot-opportunism`
- Title: Lightning speed boost with chase-onion opportunism
- Problem statement: current Speed Dot v1 needed to become a visual lightning accelerator, with identical temporary boost duration for Pi-chan and onions, proportional boost timer rings, and simple opportunistic chase-onion targeting when the lightning is clearly nearby and convenient.
- Game flow context: lightning accelerator / contested speed boost / onion chase opportunism / movement priority / readability / fixed-arena waves
- Task level: `L2`
- Patch budget: `small`

## Current Snapshot

- Status: `BUILD_DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `review-maintainability-guard`
- Tracked execution time: `00h 13m`
- Last updated at: `2026-05-12 09:01 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `.agents/threads/004-speed-dot-contested-powerup/state.json`
- `.agents/threads/004-speed-dot-contested-powerup/log.jsonl`
- `.agents/threads/004-speed-dot-contested-powerup/thread.md`
- `main.js`
- `js/core/LevelManager.js`
- `js/entities/Onion.js`
- `js/entities/Player.js`
- `js/ai/OnionAI.js` read-only unless later explicitly reopened

## Validated Decisions

- Speed Dot v1 exists and is closed `DONE` in thread 004.
- Thread 004 explicitly decided: onions in `CHASE_PICHAN` must not abandon Pi-chan for the dot.
- The new human request intentionally reopens that narrow decision.
- Current code reflects the old decision: `Onion.canTargetSpeedDot()` rejects `CHASE_PICHAN`, `Onion.update()` clears dot target during chase, and LevelManager target assignment skips onions that cannot target the dot.
- Current `main.js` Speed Dot pickup checks Pi-chan and the single assigned `dot.targetOnion`, not every onion near the dot.
- The human request evolved the task from design-only chase dot opportunism into a build request for a lightning accelerator and timer-ring feedback.
- The applied implementation keeps internal Speed Dot API names for backward compatibility while changing the rendered pickup to a lightning bolt.

## Draft Assumptions In Play

- The desired behavior should be opportunistic, not a full chase redesign: chase remains primary, but a nearby dot can become a short detour or pickup opportunity.
- "Si avvicina" needs a small, testable proximity rule to avoid chase onions abandoning Pi-chan from far away.
- The likely design question is threshold/priority: when a chased onion may divert, whether only one onion may target the dot, and whether unassigned chase onions may collect by contact.
- The smallest safe follow-up probably changes Speed Dot eligibility/collision logic, not OnionAI chase timers or wave tuning.
- Existing dot naming can remain internally for a reversible patch; visual language and gameplay copy can move to lightning without broad renames.

## Approved Direction

- Build applied after expanded human request supplied concrete implementation constraints.
- Preserve wave-based progression, spawn cap/cadence, scoring, bullets, and arena behavior.
- Preserve Speed Dot singleton/no-stack/atomic consume constraints.
- Keep the change small and reversible.
- Route to `review-maintainability-guard` before closing `DONE`.

## Scope

### Applied impact surface

- `js/core/LevelManager.js`
- `js/entities/Onion.js`
- `main.js`
- `js/entities/Player.js`

### Explicit non-goals

- No wave tuning or `config/levels.json` changes.
- No Speed Dot redesign beyond lightning visual replacement and timer-ring feedback.
- No multiple dots, boost stacking, new enemy, HP, big onion, scoring redesign, HUD, assets, sounds, shop, upgrades, or recap.
- No changes to bullets, player shooting, arena rotation, network/presence, audio, online services, or level progression.
- No broad refactor or generic power-up framework.

### Freeze zones

- `config/levels.json`
- `js/entities/Bullet.js`
- `js/ai/OnionAI.js`
- `js/core/Arena.js`
- `js/core/Engine.js`
- `js/core/physics.js`
- `assets/`
- `sounds/`
- `css/`
- `index.html`
- `js/net/`
- `js/services/`
- unrelated dirty worktree changes

## Validation And Checks

### Required validations

- `node --input-type=module --check < changed-js-file>` for every changed JS file.
- JSON parse only if a JSON file is changed; JSON/config changes are not expected.
- Manual browser smoke test focused on startup and chase onion near-lightning behavior.
- PHPMD is not applicable; no PHP files/config were discovered.

### Human test checklist draft

- Put a lightning pickup near a chased onion path and confirm the onion tries to take it when close.
- Confirm chase remains readable and the onion does not abandon Pi-chan from far away.
- Confirm a chased onion can consume the lightning and receive the existing boost.
- Confirm Pi-chan can still consume the lightning.
- Confirm no double pickup in one lightning lifecycle.
- Confirm non-chase onion targeting still works.
- Confirm Speed Dot no-stack and already-boosted behavior remains understood.
- Confirm spawn/cap/cadence, wave completion, bullets, collisions, game over, reset/continue/goto still work.

## Open Questions

- Pending human browser playtest: tune whether the initial opportunism thresholds feel too eager or too conservative.
- Pending review: decide whether internal Speed Dot naming is acceptable for this reversible patch or should be renamed in a later cleanup thread.

## Artifacts

- `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.md`
- `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.state.json`
- `.agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.log.jsonl`

## Solution Applied

- Rendered the existing Speed Dot pickup as a minimal MSX-style lightning bolt in `main.js` without adding assets.
- Kept pickup lifecycle atomic through the existing `consumeSpeedDot` path.
- Added configurable chase-opportunism thresholds to `LevelManager` defaults and assignment logic.
- Allowed chase onions to target the lightning only when unboosted, the lightning is within useful distance, Pi-chan is not immediate prey, and the lightning is clearly closer than direct chase.
- Added proportional speed-boost timer rings for Pi-chan and onions, with independent remaining-time state per entity.
- Kept boost duration shared through existing speed boost configuration and avoided stacking behavior changes.

## Build Validation

- `node --input-type=module --check < main.js`: pass.
- `node --input-type=module --check < js/core/LevelManager.js`: pass.
- `node --input-type=module --check < js/entities/Onion.js`: pass.
- `node --input-type=module --check < js/entities/Player.js`: pass.
- Local static server plus headless Chrome startup smoke on `http://127.0.0.1:8091/index.html`: pass.
- Package/lint/build scripts: no `package.json` found.
- PHPMD: not applicable; no PHP files/config found.

## Next Handoff

Recommended model: `GPT-5.4`
Recommended reasoning: `medium`
Continue this Codex chat.

Next owner: `review-maintainability-guard`
Proposed status: `BUILD_DONE`

```text
$review-maintainability-guard .agents/threads/DESIGN_REQUESTED-task-orchestrator-2-game-designer-006-chase-dot-opportunism.md

Focus specifico:
- review del build gia' implementato, senza fix
- verificare scope runtime: main.js, js/core/LevelManager.js, js/entities/Onion.js, js/entities/Player.js
- confermare che js/ai/OnionAI.js, Bullet, Arena/Engine, config/levels, assets/sounds, css/index/network/presence non siano stati toccati da questo task
- focus su lightning visual al posto del dot, timer ring proporzionale, boost durata comune, pickup atomico e chase-onion opportunism stabile
- mantenere fuori scope tuning/config e dirty worktree preesistente
```
