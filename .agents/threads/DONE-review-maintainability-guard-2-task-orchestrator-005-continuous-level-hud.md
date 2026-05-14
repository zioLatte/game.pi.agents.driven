# TASK SUMMARY

Thread basename: `DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud`
Canonical state file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.state.json`
Structured log file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-005`
- Thread name: `continuous-level-hud`
- Title: continuous wave transition and readable side HUD
- Problem statement: wave completion currently triggers a blocking level overlay and engine stop; the player needs continuous level transitions plus readable level/score/wave progress feedback without changing wave-based progression.
- Game flow context: waves / level up feedback / HUD / score readability / onion pressure
- Task level: `L2`
- Patch budget: `small`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `none`
- Tracked execution time: `00h 28m`
- Last updated at: `2026-05-12 07:39 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `.agents/templates/thread_template.md`
- `.agents/templates/thread_state_template.json`
- `.agents/templates/thread_log_template.jsonl`
- `main.js`
- `js/core/LevelManager.js`
- `index.html`
- `css/game.css`
- existing UI modules under `js/ui/` only if needed for impact mapping

## Validated Decisions

- Speed Dot is already implemented and must not be redesigned in this iteration.
- Progression remains wave-based, not score-based.
- Wave completion remains based on finite budget exhausted plus zero pressure onions.
- Level transition must become continuous and non-blocking.
- A minimal side panel or HUD is explicitly in scope for this task despite the older contract listing HUD wave meter as out of scope by default.

## Draft Assumptions In Play

- DOM side panel is likely acceptable because `index.html` already has side panels and overlays.
- Canvas HUD can be used if it is smaller and less invasive, but current canvas HUD appears minimal and not clearly sufficient for side-panel readability.
- Existing level overlay may remain for other flows if still used, but must not be used as the wave-completion transition.
- Existing dirty worktree changes are external input and must not be reverted.
- `resetGame(nextLevel, false)` is accepted as the v1 transition primitive if impact review confirms the player/bullet reset tradeoff is acceptable.
- DOM HUD is the preferred implementation path unless impact review finds a concrete layout blocker.
- Impact-regression-guard `LOG-004` approves routing to build with strict file/scope constraints.
- Build-agent `LOG-006` proposes `BUILD_DONE`; task-orchestrator routes to review-maintainability-guard.
- Review-maintainability-guard `LOG-008` verdict is `APPROVE_WITH_NOTES`; status proposal `DONE`.

## Approved Direction

- Add `LevelManager.getWaveProgress()` as a read-only API with derived current level, spawned budget, total budget, active pressure count, cleared/remaining/queued onions, progress ratio and completion.
- Implement HUD ownership in `main.js` with DOM targets from `index.html`; keep HUD read-only and out of progression/scoring decisions.
- Replace only the wave-completion calls that block gameplay: `fadeBgm(0, 800)`, `engine.stop()` and `showLevelOverlay(nextLevel)`.
- Keep `showLevelOverlay()` infrastructure for now; no wave-completion path may call it.
- Use non-blocking toast/status feedback that does not affect `isOverlayActive()` and does not capture input.
- Keep Speed Dot behavior and current rendering layer; current two `drawSpeedDot()` call sites are mutually exclusive branches unless impact review proves otherwise.
- Build is approved with guard constraints from `LOG-004`.
- Build must add explicit `maxLevel`/`localStorage` update for continuous transitions.
- Build must keep level-up toast non-blocking, outside `isOverlayActive()`, and unable to capture input.
- Build must keep HUD read-only; HUD must not drive progression, score or wave completion.
- Review must verify the built diff before any `DONE` decision.
- Thread is closed `DONE` with review notes.

## Scope

### Approved impact surface for build

- `js/core/LevelManager.js`
- `main.js`
- `index.html`
- `css/game.css`
- `js/ui/canvas.js` only if implementation/manual layout check proves the side panel cannot fit without a narrow responsive sizing fix.

### Build diff scope reported

- Modified in approved runtime surface: `js/core/LevelManager.js`, `main.js`, `index.html`, `css/game.css`
- Thread log updated: `.agents/threads/IN_REVIEW-build-agent-2-review-maintainability-guard-005-continuous-level-hud.log.jsonl`
- Canonical thread log updated and renamed to `DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.log.jsonl`
- `js/ui/canvas.js` not modified.
- Dirty worktree outside scope remains present and must be treated as external: `js/entities/Player.js`, `js/entities/Onion.js`, `.codex/skills/*`, unrelated `.agents/skills/` and other thread directories.

### Explicit non-goals

- No score-based progression.
- No shop, upgrades, interstitials, recap screens or new mechanics.
- No level config tuning in `config/levels.json` unless a blocking bug is found and justified.
- No Speed Dot redesign.
- No broad refactor.
- No runtime arena rotation work.
- No network/presence changes.
- No physical continuity rewrite that preserves player position/bullets across waves.
- No edits to `js/ui/canvas.js` unless the sizing issue is proven during build.

### Freeze zones

- `config/levels.json` by default.
- `js/entities/Player.js`, `js/entities/Bullet.js`, `js/entities/Onion.js`, `js/ai/OnionAI.js` unless gameplay-programmer proves a narrow bug-linked dependency.
- assets and sounds.
- online/network/presence files.
- unrelated dirty worktree changes.
- `.agents/threads/*.state.json` and `.agents/threads/*.md` for non-orchestrator roles.
- `js/net/` and `js/services/` network/presence files.

## Validation And Checks

### Required validations

- `node --input-type=module --check < changed-js-file>` for every changed JS file.
- JSON parse only if a JSON file is changed; config changes are not expected.
- Manual browser smoke test of continuous wave completion.
- PHPMD is not applicable unless PHP files/config are actually introduced or discovered.

### Human test checklist

- Complete a wave and confirm the next wave starts without engine stop.
- Confirm no blocking level overlay appears on wave completion.
- Confirm movement/input remains active through level-up feedback.
- Confirm level-up SFX plays.
- Confirm HUD/panel shows LV, OPINION, NEXT WAVE progress and ONIONS remaining or completed/total.
- Confirm progression still advances only on wave completion.
- Confirm Speed Dot still spawns, renders once at the intended layer, can be collected, and keeps previous behavior.
- Smoke-check onion spawn/cap/cadence, chase, collisions, bullets and game over.
- Confirm goto overlay, pause/resume, play again and continue still work.
- Confirm desktop and <=900px layouts do not overlap HUD, canvas or touch controls.
- Confirm `stats.maxLevel` and `localStorage.pi_max_level` update immediately after continuous transition.
- Confirm level-up SFX stops/fades without relying on `#level-overlay.visible`.

### Build validations from LOG-006

- `PASS: node --input-type=module --check < main.js`
- `PASS: node --input-type=module --check < js/core/LevelManager.js`
- `PASS: rg confirmed drawHUD() has no remaining occurrence.`
- `PASS: rg confirmed remaining showLevelOverlay() is only the legacy function definition, not the wave-completion call site.`
- `PASS: rg confirmed fadeBgm(0,800) no longer appears in the wave-completion branch.`
- `PASS: local HTTP server responded on http://127.0.0.1:8083/index.html.`
- `PASS: Chrome headless smoke loaded initial HUD values.`
- `PASS: Chrome screenshot smoke at 1280x800 and 390x844 showed no HUD/canvas overlap.`
- `NOT_RUN: JSON parse because no JSON/config file was changed.`
- `NOT_APPLICABLE: PHPMD because no PHP files/config were introduced or modified.`

### Review Verdict

- Verdict: `APPROVE_WITH_NOTES`
- Status proposal accepted: `DONE`
- No code rework required.
- Human browser tests remain pending notes, not blockers for this closure:
  - live wave completion;
  - held input during toast;
  - level-up SFX fade/stop;
  - Speed Dot behavior;
  - goto/pause/gameover/continue flows.
- Dirty worktree outside scope was not normalized:
  - `js/entities/Player.js`
  - `js/entities/Onion.js`
  - `.codex/skills/*`
  - `.agents/skills/`
  - other thread directories

## Open Questions

- none

## Artifacts

- `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.md`
- `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.state.json`
- `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-005-continuous-level-hud.log.jsonl`

## Solution Applied

`Applied by build-agent in LOG-006 and approved with notes by review-maintainability-guard in LOG-008. Closed DONE by task-orchestrator in LOG-009.`
