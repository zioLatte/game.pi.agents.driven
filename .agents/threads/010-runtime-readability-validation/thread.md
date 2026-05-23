# TASK SUMMARY

Thread basename: `010-runtime-readability-validation`
Canonical state file: `.agents/threads/010-runtime-readability-validation/state.json`
Structured log file: `.agents/threads/010-runtime-readability-validation/log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `state.json`.
Detailed handoff history lives in the companion `log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-010`
- Thread name: `runtime-readability-validation`
- Title: runtime readability validation for current PI.Onion build
- Problem statement: validate whether the current arena presentation, gate spawn language, outside-arena queue, sidebar HUD, continuous level flow, Speed Dot/Bolt readability, and wave progression are actually readable at runtime without adding features.
- Game flow context: fixed arena / finite waves / gate spawning / outside-arena queued onion previews / right arcade HUD / continuous level transition / Speed Dot-Bolt / collisions / reset-continue-goto.
- Task level: `L2`
- Patch budget: `none`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: none
- Tracked execution time: `00h 03m`
- Last updated at: `2026-05-23 17:09 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `docs/MASTER_STATE.md`
- `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-007-msx-outrun-arena-presentation.md`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-008-sidebar-hud-polish.md`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-009-preserve-pichan-wave-position.md`
- real source presence checked in `main.js`, `js/core/LevelManager.js`, `js/core/ArenaGates.js`, `index.html`, `css/game.css`, `config/levels.json`

## Validated Decisions

- No runtime implementation is approved in this thread.
- No new feature, asset, mechanic, refactor, scoring change, wave tuning change, collision change, level progression change, or OnionAI change is approved.
- Current build already contains shared arena gate helpers in `js/core/ArenaGates.js`.
- Current build already references queued onion state, sidebar BOLT/ONION PRESSURE UI, continuous `level-toast`, wave completion, and preserved Pi-chan position on wave advance.
- Static validation commands requested for this cycle passed on intake.
- PHPMD is not applicable: repo scan found no PHP files, `composer.json`, `phpmd.xml`, or `phpmd.xml.dist` within max depth 3.
- `review-maintainability-guard` was considered but not selected for the initial handoff because its skill gate requires `status: IN_REVIEW`; the user explicitly requested an initial state of `DESIGN_REQUESTED` or `IMPACT_ANALYSIS_REQUESTED`.
- `DESIGN_REQUESTED` is selected over `IMPACT_ANALYSIS_REQUESTED` because this pass needs a no-code readability verdict and rework-candidate list, not an implementation impact approval.
- LOG-002 game-designer is accepted as `DESIGN_DONE` for a partial no-code readability smoke.
- LOG-002 reports no observed `FAIL` items and no implementation requests.
- LOG-002 leaves core interactive checks `NOT_TESTED`: replacement spawn after clear, motion readability, Speed Dot pickup, onion contest, score update, wave completion, multi-level updates, collision death, reset, continue, and goto/debug.
- No build route is opened from LOG-002.
- LOG-004 review-maintainability-guard returned `APPROVE_WITH_NOTES` and `status_proposal: DONE`.
- LOG-004 confirmed tracked runtime diff scope is clean and only thread 010 files are part of this task's work surface.
- LOG-004 extended browser smoke covered reset, goto/debug, natural game over, and continue without captured runtime exceptions.
- No build or runtime rework is approved from this validation cycle.

## Draft Assumptions In Play

- The current build should be evaluated as-is.
- Any visual problem found should become a rework candidate, not an immediate code change.
- The manual checklist should be run in browser against the current branch before any later build task is opened.
- If a later owner finds a concrete regression, task-orchestrator must route a separate narrow rework through the normal impact/build/review gates.
- `review-maintainability-guard` may treat LOG-002 as the validation report for this no-code thread.
- Residual release-confidence checks should be handled as manual playthrough, not as automatic build work.

## Approved Direction

- Close this no-code validation cycle as `DONE` with notes.
- Keep the arena static and wave-based.
- Do not open build without a later observed concrete failure.

## Scope

### Approved impact surface

- `.agents/threads/010-runtime-readability-validation/thread.md`
- `.agents/threads/010-runtime-readability-validation/state.json`
- `.agents/threads/010-runtime-readability-validation/log.jsonl`
- Read-only inspection and manual browser validation of current runtime.
- Optional `review-maintainability-guard` manual/browser validation without runtime edits.

### Explicit non-goals

- No new assets.
- No new mechanics.
- No runtime feature implementation.
- No refactor.
- No OnionAI edits unless a later cycle proves a real blocker.
- No scoring changes.
- No wave budget, `maxAliveOnions`, spawn cadence, collision, or level progression changes.
- No HUD redesign in this pass.
- No arena rotation or moving arena.
- No build-agent route unless review finds a concrete, narrow, observed failure and task-orchestrator opens a separate approved build cycle.

### Freeze zones

- `main.js`
- `js/core/LevelManager.js`
- `js/core/ArenaGates.js`
- `js/core/Arena.js`
- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`
- `js/ai/OnionAI.js`
- `config/levels.json`
- `index.html`
- `css/game.css`
- `assets/`
- `sounds/`
- online/network/presence files
- unrelated dirty worktree changes
- build-agent route unless explicitly reopened by task-orchestrator

## Validation And Checks

### Required validations

- `node --input-type=module --check < main.js` - passed on intake.
- `node --input-type=module --check < js/core/LevelManager.js` - passed on intake.
- `node --input-type=module --check < js/core/ArenaGates.js` - passed on intake.
- JSON parse of `config/levels.json` - passed on intake.
- PHPMD - not applicable; no PHP files/config found in repo scan.

### Human test checklist

- Start a fresh level 1 run. Expected: no console errors; canvas, right sidebar, player, onions, gates, and outside terrain are visible immediately.
- At level 1 start, identify all visible arena gates without pausing. Expected: north/east/south/west gate positions read as entrances, not random wall decoration.
- Watch first onion entry without shooting it immediately. Expected: onion appears from or near a gate and movement direction makes the gate origin understandable.
- Clear one onion and wait for a replacement when queue remains. Expected: replacement enters through a gate; no onion pops into the middle of the arena or outside walkable space.
- Observe outside-arena queued onion previews at desktop size around `1280x800`. Expected: queue markers are visible outside the active arena, near gate language, and do not overlap player/onions/HUD.
- Observe the same queue at narrow mobile-like size around `390x844`. Expected: queued markers remain visible or gracefully reduced; they do not disappear off-canvas or cover the sidebar/controls.
- Compare queued preview count with sidebar queue/left values during a wave. Expected: visual queue and HUD values move in the same direction as onions spawn and are cleared.
- Confirm active arena readability while onions chase and bullets bounce. Expected: arena floor, walls, gates, onions, bullets, player, and Speed Dot/Bolt remain separable in motion.
- Collect Speed Dot/Bolt as Pi-chan. Expected: pickup is visible before collection; BOLT HUD state changes to active/boost timing; player boost feedback is readable without hiding hazards.
- Let an onion approach or collect/contest the Speed Dot when the existing behavior allows it. Expected: onion interaction remains readable and does not look like a spawn/collision bug.
- Score at least one onion clear. Expected: OPINION/score changes are legible in the sidebar without needing to search the screen.
- Finish a wave normally. Expected: level advances continuously with toast/HUD feedback; no blocking level overlay interrupts normal progression.
- During level advance, keep Pi-chan away from center. Expected: next wave starts with Pi-chan position preserved or constrained inside the new arena, not silently reset to center.
- Continue through multiple level ups. Expected: LV and NEXT WAVE update every wave; no stale HUD values after wave completion.
- Verify collision deaths. Expected: player death cause is attributable to onion/bullet/contact timing, not hidden by HUD, queue markers, terrain, or toast.
- Use reset. Expected: clean level restart, HUD values reset coherently, no stale queued onion previews.
- Use continue after game over if available. Expected: run resumes coherently, no stale boost/queue/sidebar state.
- Use goto/debug level flow if available. Expected: goto still changes level, overlay/debug UI remains usable, and normal progression still avoids invasive overlay.
- Confirm wave completion semantics. Expected: wave completes only after finite budget is exhausted and no active/dying onions remain.
- Confirm no visual regression in first minute. Expected: presentation reads as MSX/arcade asphalt/terrain, not space/galaxy; effects support playfield reading instead of competing with it.

## Open Questions

- Before release-level confidence, run a human playthrough focused on replacement spawn, score update, Speed Dot/Bolt pickup, onion contest, full wave completion/level-up, preserved Pi-chan position, and motion readability.

## Artifacts

- `.agents/threads/010-runtime-readability-validation/thread.md`
- `.agents/threads/010-runtime-readability-validation/state.json`
- `.agents/threads/010-runtime-readability-validation/log.jsonl`

## Solution Applied

No runtime solution was applied. PI-010 completed a no-code runtime/readability validation cycle: first-frame desktop/mobile smoke, scope review, syntax/JSON validations, and extended smoke for reset, goto/debug, natural game over, and continue.

Review verdict was `APPROVE_WITH_NOTES`. Residual manual playthrough checks remain for release-level confidence.

## Handoff To Game Designer

Game-designer must not design new features by default. The requested output is a runtime/readability validation rubric result:

- classify each manual checklist area as `PASS`, `PASS_WITH_NOTES`, `FAIL`, or `NOT_TESTED`;
- separate confirmed facts from assumptions;
- list only concrete rework candidates tied to observed failures;
- keep all implementation requests narrow and reversible;
- end with `status_proposal: DESIGN_DONE` and `next_owner: task-orchestrator`.

## Orchestrator Receipt - LOG-003

LOG-002 `game-designer` is accepted as a valid partial no-code readability pass.

Canonical decisions:

- Status is `IN_REVIEW`.
- Current owner is `review-maintainability-guard`.
- No build is approved.
- No runtime/code/data files may be edited.
- No observed `FAIL` item exists yet.
- The smoke evidence is not enough to close runtime/readability validation because many interactive checks are still `NOT_TESTED`.

Review-maintainability-guard must verify:

- diff scope remains limited to canonical thread files;
- forbidden runtime/data/assets files are untouched;
- LOG-002 validation evidence is accurately classified;
- missing manual coverage is either executed, explicitly waived with rationale, or returned as required follow-up;
- no feature, asset, mechanics, scoring, wave tuning, collision, level progression, or OnionAI change is requested without an observed failure;
- any rework candidate is concrete, narrow, and tied to observed runtime evidence.

Next owner prompt:

```text
$review-maintainability-guard .agents/threads/010-runtime-readability-validation/thread.md

Focus specifico:
- review della validazione no-code LOG-002, senza fix;
- nessuna modifica runtime, asset, config o CSS;
- controllare che il diff sia limitato ai thread file 010;
- se possibile estendere manualmente i punti NOT_TESTED più critici;
- se non possibile, classificare il rischio residuo e decidere APPROVE_WITH_NOTES, NEEDS_REWORK o BLOCKED;
- non proporre build salvo FAIL osservato e concreto da rimandare a task-orchestrator.
```

## Orchestrator Receipt - LOG-005

LOG-004 `review-maintainability-guard` is accepted.

Canonical closure:

- Status is `DONE`.
- Current owner is `task-orchestrator`.
- Verdict accepted: `APPROVE_WITH_NOTES`.
- No rework is required.
- No build is opened.
- Runtime/code/data/assets/CSS remain unchanged by this thread.

Residual notes:

- Release-level confidence still needs human playthrough coverage for replacement spawn after clear, score/OPINION update after kill, Speed Dot/Bolt pickup, onion contest, full wave completion/level-up, preserved Pi-chan position after wave advance, and motion readability under bullets/chase.
- Those residual checks do not block `DONE` for this no-code validation thread because no concrete `FAIL` or implementation defect was observed.

Terminal handoff:

```text
$task-orchestrator .agents/threads/010-runtime-readability-validation/thread.md
```
