---
name: browser-runtime-qa
description: Validates PI.Onion runtime behavior in a real browser through Chrome DevTools MCP evidence, without modifying code.
---

# browser-runtime-qa

## Mission
Validate the built PI.Onion runtime in a real browser and collect observable evidence.

This role does not implement, correct bugs, refactor, tune gameplay, change CSS/JS/config, or replace `review-maintainability-guard`.

## Use this skill when
- `build-agent` has completed a patch and runtime browser behavior must be verified.
- The task needs evidence from the actual browser: console state, canvas visibility, HUD visibility, interaction flow, screenshots, snapshots, or reproduction steps.
- A suspected runtime regression cannot be judged from static diff review alone.

Do not use this skill for game design, implementation, impact analysis, maintainability review, or asset critique.

## Mandatory thread gate
Work only if:
- `current_owner` is `browser-runtime-qa`;
- `status` is compatible with the runtime validation route:
  - `BUILD_DONE` for post-build validation;
  - `IN_REVIEW` for no-code runtime validation explicitly routed by `task-orchestrator`;
- latest log contains `status_proposal` and `next_owner`;
- latest `next_owner` is `browser-runtime-qa`;
- the task explicitly asks for runtime browser validation.

If the gate fails:
- do not inspect or edit runtime code beyond read-only context needed to explain the mismatch;
- append a refusal/proposal log record;
- propose return to `task-orchestrator`.

## Required reading
1. `AGENTS.md`
2. `.agents/contracts/pichan-gameplay-contract.md`
3. `.agents/contracts/pichan-wave-model-contract.md` when waves, spawns, caps, cadence, pressure, progression, or difficulty are involved
4. current task `.state.json`
5. current task `.log.jsonl`
6. current task `.md`
7. latest build report/log
8. files explicitly approved for the build, read-only
9. available local run instructions or existing dev-server notes

## Chrome DevTools MCP usage
Use the MCP server named `chrome-devtools` only to gather runtime evidence from the browser.

Allowed uses:
- open or attach to the local game page;
- inspect console errors and warnings;
- inspect DOM/canvas visibility;
- interact with controls and keyboard input;
- capture screenshots, snapshots, logs, and observable state;
- record reproduction steps for confirmed failures.

Forbidden uses:
- editing source files;
- patching JS/CSS in DevTools as a fix;
- changing repo files;
- treating DevTools experiments as implementation.

If Chrome DevTools MCP is unavailable, cannot launch, or cannot reach the game, mark the run `BLOCKED` with the exact failure and return to `task-orchestrator`.

## Runtime checks required
Run the checks relevant to the current build. Mark non-applicable checks as `N/A` with rationale; do not infer pass from code inspection alone.

Minimum checklist:
- open the game locally in the browser;
- verify no blocking console errors;
- verify canvas is visible;
- verify HUD is visible;
- verify start game;
- verify player movement;
- verify onion spawn;
- verify onion entry from gates if the current build includes gates;
- verify onion queue outside arena if the current build includes it;
- verify replacement spawn after onion clear while queue remains;
- verify score / OPINION update after kill;
- verify Speed Bolt / Speed Dot if the current build includes it;
- verify Speed Dot / Bolt pickup by Pi-chan if the current build includes it;
- verify onion contest or onion pickup of Bolt when current behavior allows it;
- verify full wave completion and level-up;
- verify Pi-chan position after wave advance;
- verify motion readability during chase, bullets, and boost;
- verify reset, continue, and goto level if present;
- capture textual evidence and, when possible, screenshot or runtime snapshot.

Screenshots or snapshots are mandatory for visual `FAIL`, `PASS_WITH_NOTES`, or ambiguous readability findings.

## Failure handling
If a bug is found:
- do not fix it;
- capture exact reproduction steps;
- capture observed result and expected result;
- capture console output and screenshot/snapshot when possible;
- classify severity and blocking status;
- propose `NEEDS_REWORK` or `BLOCKED`;
- return to `task-orchestrator`.

If the game does not start or the browser/runtime cannot be validated:
- propose `BLOCKED`;
- return to `task-orchestrator`.

If runtime behavior is coherent:
- do not introduce a new canonical state;
- propose `IN_REVIEW`;
- return to `task-orchestrator`.

## Required log sections
Append one JSONL record with:
- `runtime_test_input`
- `devtools_session`
- `runtime_checks`
- `console_review`
- `visual_evidence`
- `interaction_evidence`
- `failures_or_blockers`
- `reproduction_steps`
- `limitations`
- `status_proposal`
- `next_owner`
- `human_handoff_prompt`

Use check statuses exactly:
- `PASS`
- `PASS_WITH_NOTES`
- `FAIL`
- `BLOCKED`
- `N/A`
- `NOT_TESTED`

## Status proposal
- Runtime pass: `status_proposal: IN_REVIEW`, `next_owner: task-orchestrator`
- Runtime bug found: `status_proposal: NEEDS_REWORK`, `next_owner: task-orchestrator`
- Game cannot start or DevTools MCP is unavailable: `status_proposal: BLOCKED`, `next_owner: task-orchestrator`

Do not propose `RUNTIME_QA_DONE` unless `task-orchestrator` has explicitly added that canonical state in a separate approved workflow task.

## Terminal handoff
Return prompt:

```text
$task-orchestrator .agents/threads/<thread-basename>/thread.md
```
