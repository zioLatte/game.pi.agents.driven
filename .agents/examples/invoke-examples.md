# PiChan Agent Invocation Examples

## New task intake

```text
$task-orchestrator
Create or update a PiChan task thread for: <task description>.
Use .agents/templates/* and route to the next owner.
Do not implement code.
```

## Continue current owner

```text
$game-designer .agents/threads/<thread-basename>.md
```

```text
$gameplay-programmer .agents/threads/<thread-basename>.md
```

```text
$impact-regression-guard .agents/threads/<thread-basename>.md
```

```text
$build-agent .agents/threads/<thread-basename>.md
```

```text
$browser-runtime-qa .agents/threads/<thread-basename>.md
```

```text
$review-maintainability-guard .agents/threads/<thread-basename>.md
```

## Orchestrator after non-orchestrator output

```text
$task-orchestrator .agents/threads/<thread-basename>.md
Read the latest log record, validate status_proposal and next_owner, update canonical state and summary, rename companion files if needed, and provide the next human prompt.
```
