# TASK SUMMARY

Thread basename: `APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-013-player-defeated-revive-flow`
Canonical state file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-013-player-defeated-revive-flow.state.json`
Structured log file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-013-player-defeated-revive-flow.log.jsonl`

## Problem

- Task id: `PI-013`
- Thread name: `player-defeated-revive-flow`
- Title: use player defeated sprite with auto revive and nonblocking level-up
- Problem statement: current Pi-Chan death flow uses game-over interruption/continue UI instead of showing the new defeated sprite and reviving in place after a short standby.
- Game flow context: player death / continue / revive / level transition / visual feedback
- Task level: `L2`
- Patch budget: `medium`

## Current Snapshot

- Status: `APPROVED_FOR_BUILD`
- Current owner: `build-agent`
- Expected handoff owner: `task-orchestrator`
- Last updated at: `2026-05-24 14:10 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- User request: normalize `assets/player_defeated.png`, replace current death effect, standby for a few seconds, revive in same position, keep level-up nonblocking.

## Validated Decisions

- Use the existing continue budget as the finite auto-revive limit.
- Do not change scoring, wave model, movement speeds, collision radii, level config, or enemy behavior.
- Normalize source `assets/player_defeated.png` into runtime `assets/collage/player_defeated.png`.

## Draft Assumptions In Play

- "Qualche secondo" means roughly two seconds of defeated standby.
- "Rianima nella stessa posizione" requires a short post-revive grace window to avoid immediate repeated death while overlapping a hazard.
- Existing game-over overlay remains only when auto-continues are exhausted.

## Approved Direction

- Add player defeated asset to the runtime manifest/preload.
- Draw defeated Pi-Chan with the new sprite.
- Replace immediate game-over stop on player hit with a short defeated standby and automatic revive while continue budget remains.
- Keep level-up path nonblocking; do not show blocking level overlay during wave completion.

## Scope

### Approved impact surface

- `main.js`
- `js/entities/Player.js`
- `js/core/assets.js`
- `index.html`
- `assets/collage/player_defeated.png`
- thread files

### Explicit non-goals

- No scoring changes.
- No wave model changes.
- No level data changes.
- No collision radius or movement speed changes.
- No new enemy/player systems.

### Freeze zones

- `config/levels.json`
- `js/core/LevelManager.js`
- `js/entities/Onion.js`
- unrelated assets and CSS

## Validation And Checks

### Required validations

- `node --input-type=module --check < changed-js-file>`
- PNG dimension/alpha validation for `assets/collage/player_defeated.png`
- Browser smoke normal mode

### Human test checklist

- player killed by bullet enters defeated standby
- player killed by onion enters defeated standby
- player revives in same position after delay
- no blocking game-over UI before continues are exhausted
- level-up continues without blocking overlay
- new defeated sprite has clean transparency/scaling

## Solution Applied

`Pending task completion.`
