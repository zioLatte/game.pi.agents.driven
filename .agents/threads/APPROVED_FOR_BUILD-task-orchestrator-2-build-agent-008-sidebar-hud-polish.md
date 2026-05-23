# TASK SUMMARY

Thread basename: `APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-008-sidebar-hud-polish`
Canonical state file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-008-sidebar-hud-polish.state.json`
Structured log file: `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-008-sidebar-hud-polish.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-008`
- Thread name: `sidebar-hud-polish`
- Title: sidebar HUD arcade readability polish
- Problem statement: the right sidebar currently reads like a compact debug table and needs to become a legible arcade cabinet HUD without changing gameplay.
- Game flow context: UI/HUD only; current level, opinion score, wave progress, Pi-chan boost, Speed Dot/Bolt state, onion pressure.
- Task level: `L1`
- Patch budget: `small`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 08m`
- Last updated at: `2026-05-17 20:14 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- user prompt in current Codex chat
- real source files listed below

## Validated Decisions

- Sidebar/HUD may be restyled and restructured.
- HUD values must map to real runtime data.
- Gameplay, spawn, gates, collision, Speed Dot mechanics, controls and level progression must remain unchanged.
- No minimap, no decorative fake indicators, no new dependencies.
- Impact guard is explicitly skipped by task-orchestrator because the user supplied a narrow UI-only brief, the runtime risk is limited to read-only HUD data exposure, and the patch remains reversible.
- Build completed inside approved impact surface.
- Review verdict: `APPROVE_WITH_NOTES`.

## Draft Assumptions In Play

- A small `LevelManager` accessor for Speed Dot status/timer is acceptable because it only exposes existing state and does not mutate mechanics.
- Existing wave progress fields are the source of truth for cleared, total, remaining, queued and active pressure.
- Pi-chan status should use existing player boost ratio only; no HP is available.

## Approved Direction

- Rebuild the sidebar as a physical arcade-style panel.
- Make LV and OPINION the fastest-to-read elements.
- Use segmented NEXT WAVE progress with numeric cleared/total.
- Use ciano for Bolt/progress, giallo for Pi-chan/score, rosso for onion pressure.
- Keep the patch local and reversible.

## Scope

### Approved impact surface

- `index.html`
- `css/game.css`
- `main.js`
- `js/core/LevelManager.js`

### Explicit non-goals

- No gameplay changes.
- No spawn/cadence/cap/budget changes.
- No Speed Dot behavior changes.
- No gates, collision, controls or level progression changes.
- No minimap.
- No new mechanics.
- No new dependencies.
- No broad refactor.

### Freeze zones

- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`
- `js/ai/OnionAI.js`
- `config/levels.json`
- assets and sounds
- online/network/presence logic

## Validation And Checks

### Required validations

- `node --input-type=module --check < main.js` if `main.js` is modified.
- `node --input-type=module --check < js/core/LevelManager.js` if `LevelManager.js` is modified.
- Local game launch if possible.
- PHPMD: not applicable unless PHP/config is actually present.

### Human test checklist

- Start level 1.
- HUD is visible and readable.
- Score/OPINION changes after onion clear.
- NEXT WAVE numeric value and segmented bar change.
- Level up updates LV.
- Speed Dot/Bolt state changes between READY/ACTIVE/RESPAWN/BOOST when those real states occur.
- Pi-chan boost status is visible while player is boosted.
- Onion pressure/queued/remaining is coherent with wave state.
- No blocking overlay introduced.
- No gameplay/spawn/gate/collision/control regression observed.

## Open Questions

- none

## Artifacts

- build report to be appended by `build-agent`
- `/tmp/pichan-hud.png`

## Solution Applied

- Reworked the right sidebar into an arcade cabinet-style HUD panel.
- Added large LV and zero-padded OPINION display.
- Added NEXT WAVE cleared/total text and segmented progress using real wave state.
- Added PI-CHAN boost status from existing player boost ratio.
- Added BOLT status from read-only Speed Dot state.
- Added ONION PRESSURE active/left/queue values from existing wave progress.
- Gameplay, spawn, gates, collisions, Speed Dot behavior, controls and level progression were not changed.
