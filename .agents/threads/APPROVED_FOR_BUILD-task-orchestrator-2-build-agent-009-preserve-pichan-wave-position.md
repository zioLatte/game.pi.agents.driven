# TASK SUMMARY

Thread basename: `APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-009-preserve-pichan-wave-position`
Canonical state file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-009-preserve-pichan-wave-position.state.json`
Structured log file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-009-preserve-pichan-wave-position.log.jsonl`

## Problem

- Task id: `PI-009`
- Thread name: `preserve-pichan-wave-position`
- Title: preserve Pi-chan position on wave/level advance
- Problem statement: when a wave completes and the next level starts, Pi-chan is reset to the center because the level load recreates the player with default coordinates.
- Game flow context: wave completion / level advance only.
- Task level: `L1`
- Patch budget: `tiny`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 02m`
- Last updated at: `2026-05-18 05:51 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `main.js`
- `js/core/LevelManager.js`

## Validated Decisions

- Preserve Pi-chan `x/y` only when advancing to the next wave/level from `isWaveComplete()`.
- Keep normal reset, goto, continue and reload behavior unless explicitly changed later.
- Do not preserve bullets, boost, cooldown, or other player runtime state.
- Do not change onion spawn, Speed Dot behavior, gates, collision, controls, score or progression rules.
- Review verdict: `APPROVE_WITH_NOTES`.

## Draft Assumptions In Play

- Creating the new Player at previous coordinates is safer than reusing the existing Player object.
- The preserved position should be constrained into the new arena after that arena is built.

## Approved Direction

- Add a small optional `playerStartPosition` input to level loading.
- Pass it only from the wave-complete level-up path.
- Keep all other callers defaulting to center spawn.

## Scope

### Approved impact surface

- `main.js`
- `js/core/LevelManager.js`

### Explicit non-goals

- No spawn/cadence/cap/budget changes.
- No Speed Dot mechanics changes.
- No onion behavior changes.
- No Player.js edits.
- No config changes.
- No HUD/style changes.

### Freeze zones

- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`
- `js/ai/OnionAI.js`
- `config/levels.json`
- `index.html`
- `css/game.css`
- assets and sounds

## Validation And Checks

### Required validations

- `node --input-type=module --check < main.js`
- `node --input-type=module --check < js/core/LevelManager.js`
- local static launch if possible
- PHPMD not applicable unless PHP/config is present

### Human test checklist

- Start level 1.
- Move Pi-chan away from center before clearing the wave.
- Clear wave.
- Verify next level starts with Pi-chan at the same position, constrained inside the new arena if needed.
- Verify goto/reset/continue still work and do not unintentionally inherit a stale position.
- Verify onion spawn, Speed Dot, collision and controls are unchanged.

## Open Questions

- none

## Artifacts

- build report to be appended by `build-agent`

## Solution Applied

- `LevelManager.loadLevel()` accepts an optional `playerStartPosition`.
- `LevelManager` still creates a fresh `Player`, but at provided `x/y` when present.
- Preserved coordinates are constrained into the new arena after arena creation.
- `main.js` passes Pi-chan's current position only from the wave-complete next-level path.
- Reset, goto, continue, spawn, Speed Dot and progression rules remain unchanged.
