# TASK SUMMARY

Thread basename: `APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-012-runtime-stutter-performance`
Canonical state file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-012-runtime-stutter-performance.state.json`
Structured log file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-012-runtime-stutter-performance.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.

## Problem

- Task id: `PI-012`
- Thread name: `runtime-stutter-performance`
- Title: reduce runtime gameplay stutters without gameplay changes
- Problem statement: gameplay stutters occur during movement, shooting, collisions, explosions, wave progress, and transitions; initial loading is not the issue.
- Game flow context: movement / shooting / collision feedback / explosions / wave progress / level transitions / HUD / Canvas 2D rendering
- Task level: `L2`
- Patch budget: `medium`

## Current Snapshot

- Status: `APPROVED_FOR_BUILD`
- Current owner: `build-agent`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 00m`
- Last updated at: `2026-05-24 10:57 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- User task: runtime frame pacing fix, no stack migration, no gameplay/rules/scoring/wave changes.

## Validated Decisions

- Treat this as a performance implementation task, not a gameplay design task.
- Skip separate `game-designer`, `gameplay-programmer`, and `impact-regression-guard` passes because the user supplied explicit non-goals, implementation priorities, validation requirements, and impact files; no gameplay rule or wave model change is authorized.
- Build must preserve current HUD layout and values.
- `?perf=1` diagnostics must be opt-in and inactive in normal mode.

## Draft Assumptions In Play

- Runtime stutter is likely caused by per-frame DOM writes, repeated static canvas path/effect work, optional visual effects, or audio reset behavior.
- Static render caching is acceptable only for visuals that do not animate frame-to-frame.
- Perf visual downgrades are diagnostic only and must be gated behind `?perf=1`.

## Approved Direction

- Identify per-frame work in `update()` and `draw()` before editing.
- Refactor runtime HUD writes to dirty updates.
- Cache static arena/background rendering in an offscreen/static canvas layer and redraw that layer only on invalidation.
- Add lightweight opt-in profiler via `?perf=1`.
- Add opt-in perf-mode diagnostics for expensive visual effects and canvas shell filter.
- Review audio runtime calls and apply only small localized mitigation if clearly useful.

## Scope

### Approved impact surface

- `main.js`
- `js/core/Engine.js`
- `js/ui/canvas.js`
- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`
- `js/entities/Explosion.js`
- `js/ui/audio.js`
- `css/game.css`
- `index.html`

### Explicit non-goals

- No Phaser/Pixi/Unity or stack migration.
- No gameplay redesign.
- No gameplay rule changes.
- No scoring changes.
- No wave model changes.
- No new enemies, arenas, level data, or difficulty tuning.
- No broad architecture rewrite.
- No removal of visual identity in normal mode.

### Freeze zones

- `config/levels.json`
- `js/core/LevelManager.js`
- `js/core/Arena.js`
- `js/ai/OnionAI.js`
- assets and sound source files
- network/online/presence files
- unrelated docs

## Validation And Checks

### Required validations

- `node --input-type=module --check < changed-js-file>` for every changed JS file.
- Run game locally in normal mode.
- Run game locally with `?perf=1`.
- PHPMD only if PHP/PHPMD context exists; otherwise state not applicable.

### Human test checklist

- movement
- shooting
- bullet bounce
- onion death
- speed dot
- wave completion
- game over and continue
- normal mode visuals unchanged
- `?perf=1` profiler visible and normal mode profiler absent

## Open Questions

- none

## Artifacts

- Pending build report in log.

## Solution Applied

`Pending task completion.`
