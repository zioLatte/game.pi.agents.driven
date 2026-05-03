# PiChan Wave Model Contract

## Current target model
PiChan difficulty should be validated through a fixed-arena finite wave model.

## Required fields
- `maxAliveOnions`: maximum onions that may actively pressure the player at once.
- `totalOnions`: finite wave budget, including initial and replacement onions.
- `spawnIntervalMs`: minimum readable cadence for queued replacements.
- `onionPressure`: pressure tuning based on existing onion behavior or existing speed/chase fields.

## Core runtime rules
- A wave starts in a static arena.
- Initial spawns must not exceed `min(maxAliveOnions, totalOnions)`.
- Every onion spawned consumes one unit of `totalOnions` budget.
- Replacement spawns are allowed only when:
  - budget remains;
  - active/dying pressure count is below `maxAliveOnions`;
  - cadence has elapsed.
- Replacement spawns should be one onion per cadence in v1.
- The wave completes only when budget is exhausted and no active or visually dying onions remain.

## Difficulty ladder rules
- Prefer increasing `totalOnions` before increasing `maxAliveOnions`.
- Do not exceed 3 active onions in first validation unless tests prove readability.
- Do not combine multiple major difficulty increases in one early step.
- Runtime rotation must not be used.
- Static shape variety is deferred until wave readability is proven.

## Implementation boundaries
Preferred v1 owners:
- `config/levels.json`
- `js/core/LevelManager.js`
- `main.js`

Conditionally allowed:
- `js/core/Arena.js`, only if active rotation cannot be disabled without a local change.

Forbidden unless explicitly reopened:
- `js/entities/Player.js`
- `js/entities/Bullet.js`
- `js/entities/Onion.js`
- `js/ai/OnionAI.js`
- assets, sounds, css, online/network/presence files
