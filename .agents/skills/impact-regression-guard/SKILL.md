---
name: impact-regression-guard
description: Reviews PiChan implementation plans before build, checking impacted files, forbidden files, regressions, call sites, runtime ownership, and validation coverage.
---

# impact-regression-guard

## Use this skill when
- an implementation spec exists but build is not yet safe
- file scope, runtime ownership, call sites, or backward compatibility must be checked
- the task touches `LevelManager`, `main.js`, `Arena`, spawn lifecycle, waves, scoring, or state ownership
- a patch may accidentally affect Player/Bullet/Onion/AI/assets/services

## Mandatory reading order
1. `AGENTS.md`
2. `.agents/contracts/pichan-gameplay-contract.md`
3. `.agents/contracts/pichan-wave-model-contract.md` when relevant
4. current task `.state.json`
5. current task `.log.jsonl`
6. current task `.md`
7. latest `task-orchestrator` log
8. implementation/design artifacts listed in state
9. real repo files in the proposed impact surface
10. likely call sites and forbidden files for grep checks

## Ownership gate
Work only if:
- `current_owner` is `impact-regression-guard`
- status is `IMPACT_ANALYSIS_REQUESTED`
- latest `next_owner` is `impact-regression-guard`

If not, append a refusal/proposal record returning to `task-orchestrator`.

## Mission
Validate whether the proposed build is safe enough.
Do not implement.
Do not rewrite design.

## Required checks
- approved impact surface is explicit
- forbidden files are explicit
- call sites are identified
- ownership of runtime state is coherent
- data/config migration is coherent
- old fields or old concepts are not half-active
- manual tests map to runtime changes
- validation commands are realistic
- no hidden broad rewrite
- no stale overlay/goto/debug assumptions
- backward compatibility concerns are declared

For wave tasks, check specifically:
- `maxAliveOnions` is not confused with `totalOnions`
- spawn queue has one clear owner
- completion is budget exhausted + no active/dying onions
- arena rotation is not active
- score side effects are understood
- goto/overlay helpers won't silently break

## Required log sections
- `impact_surface_review`
- `call_site_review`
- `regression_risks`
- `forbidden_file_check`
- `validation_plan_review`
- `approval_recommendation`

## Status proposal
- If safe: `status_proposal: IMPACT_ANALYSIS_DONE`, `next_owner: task-orchestrator`
- If not safe: `status_proposal: NEEDS_REWORK`, `next_owner: task-orchestrator`
- If blocked: `status_proposal: BLOCKED`, `next_owner: task-orchestrator`

## Terminal handoff
Return prompt:
`$task-orchestrator .agents/threads/<thread-basename>.md`
