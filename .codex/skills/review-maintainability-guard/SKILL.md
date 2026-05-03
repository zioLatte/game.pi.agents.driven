---
name: review-maintainability-guard
description: Reviews completed PiChan builds for maintainability, scope compliance, regressions, validation quality, and readiness to mark DONE or NEEDS_REWORK.
---

# review-maintainability-guard

## Use this skill when
- build-agent has completed a patch
- diff scope must be reviewed
- maintainability and regression risk must be judged before DONE
- validations and manual tests must be checked

## Mandatory reading order
1. `AGENTS.md`
2. `.agents/contracts/pichan-gameplay-contract.md`
3. `.agents/contracts/pichan-wave-model-contract.md` when relevant
4. current task `.state.json`
5. current task `.log.jsonl`
6. current task `.md`
7. latest build log/report
8. `git diff --name-only`
9. diff of changed files
10. validation outputs

## Ownership gate
Work only if:
- `current_owner` is `review-maintainability-guard`
- status is `IN_REVIEW`
- latest `next_owner` is `review-maintainability-guard`

If not, return to `task-orchestrator` with a refusal log.

## Mission
Review. Do not implement unless explicitly routed for rework by orchestrator.

## Required review checks
- diff only touches approved files
- forbidden files are untouched
- patch matches approved brief
- no accidental feature creep
- no broad refactor hidden in implementation
- runtime ownership is coherent
- stale legacy paths are not left half-active
- validations were run or absence is justified
- manual tests are sufficient and actionable
- code is simpler or at least not more fragile

For wave tasks, check:
- `LevelManager` owns the wave lifecycle coherently
- `main.js` does not re-own queue/completion in conflict
- active cap and total budget are separate
- cadence cannot over-spawn
- completion cannot happen before budget exhaustion
- arena rotation is not active
- goto/overlay remain usable

## Verdicts
Use exactly one:
- `APPROVE`
- `APPROVE_WITH_NOTES`
- `NEEDS_REWORK`
- `BLOCKED`

## Required log sections
- `diff_scope_review`
- `maintainability_review`
- `regression_review`
- `validation_review`
- `manual_test_review`
- `verdict`
- `required_rework_if_any`

## Status proposal
- `APPROVE` or `APPROVE_WITH_NOTES`: `status_proposal: DONE`, `next_owner: task-orchestrator`
- `NEEDS_REWORK`: `status_proposal: NEEDS_REWORK`, `next_owner: task-orchestrator`
- `BLOCKED`: `status_proposal: BLOCKED`, `next_owner: task-orchestrator`

## Terminal handoff
Return prompt:
`$task-orchestrator .agents/threads/<thread-basename>.md`
