# TASK SUMMARY

Thread basename: `DONE-review-maintainability-guard-2-task-orchestrator-014-mobile-gyro-delta-control`
Canonical state file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-014-mobile-gyro-delta-control.state.json`
Structured log file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-014-mobile-gyro-delta-control.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-014`
- Thread name: `mobile-gyro-delta-control`
- Title: mobile gyro movement must use delta input
- Problem statement: mobile motion movement currently maps absolute device tilt to player movement; requested behavior is relative delta motion, comparable to mouse movement.
- Game flow context: movement / mobile controls / player readability
- Task level: `L1`
- Patch budget: `tiny`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 05m`
- Last updated at: `2026-05-24 17:36 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `js/core/Input.js`

## Validated Decisions

- `js/core/Input.js` is the only runtime module that reads `DeviceOrientationEvent`.
- Existing motion control uses absolute `gamma` and `beta` values.
- Requested behavior is delta/relative motion, not absolute tilt.

## Draft Assumptions In Play

- Keyboard, desktop, shooting, wave, onion, arena, HUD, audio, and asset behavior must remain unchanged.
- Manual mobile browser validation is required for final confidence because desktop checks cannot emit real device orientation data.

## Approved Direction

- Convert mobile motion handling to compute deltas between consecutive screen-adjusted orientation samples.
- Establish baseline on first valid sample without moving the player.
- Reset the motion baseline when screen orientation changes or motion is cleared.
- Keep patch local to input handling.

## Scope

### Approved impact surface

- `js/core/Input.js`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-014-mobile-gyro-delta-control.md`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-014-mobile-gyro-delta-control.state.json`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-014-mobile-gyro-delta-control.log.jsonl`

### Explicit non-goals

- No player movement speed redesign.
- No keyboard or touch shoot changes.
- No UI/HUD changes.
- No wave, onion, arena, audio, asset, or CSS changes.
- No new mobile calibration UI.

### Freeze zones

- `main.js`
- `js/entities/Player.js`
- `js/core/LevelManager.js`
- `js/core/Arena.js`
- `css/game.css`
- `assets/**`
- `docs/**`

## Validation And Checks

### Required validations

- PASS: `node --input-type=module --check < js/core/Input.js`
- PASS: Node sensor simulation for first sample, steady sample, one-frame delta, next-frame reset, and screen-orientation reset.
- PASS: Node keyboard simulation for ArrowRight and release.
- PASS: JSON parse for thread state/log files.
- Manual mobile hardware checklist remains recommended.

### Human test checklist

- On mobile, enabling motion while the phone is already tilted must not immediately move the player.
- Slowly rotating the phone right/left/up/down must move the player only while rotation changes.
- Holding the phone steady after a rotation must stop motion instead of continuing drift from absolute tilt.
- Rotating the screen orientation must not produce a large jump.
- Desktop keyboard movement and shooting still work.

## Open Questions

- none

## Artifacts

- `js/core/Input.js`

## Solution Applied

Implemented in `js/core/Input.js`:

- mobile motion input now computes deltas between consecutive screen-adjusted orientation samples;
- first valid sample seeds baseline and produces no movement;
- pending gyro delta is consumed once per frame, so holding the phone steady does not keep moving the player;
- motion baseline resets on clear and screen-orientation change.
