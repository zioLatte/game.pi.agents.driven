# TASK SUMMARY

Thread id: `003-audio-not-playing`
Canonical state file: `.agents/threads/003-audio-not-playing/state.json`
Structured log file: `.agents/threads/003-audio-not-playing/log.jsonl`

## Problem

- Task id: `PI-003`
- Thread name: `audio-not-playing`
- Title: Audio playback not audible
- Problem statement: User reports that game sounds are not audible.
- Game flow context: feedback / SFX / BGM / input gesture / browser audio lifecycle
- Task level: `L1`
- Patch budget: `small`

## Current Snapshot

- Status: `IMPACT_ANALYSIS_REQUESTED`
- Current owner: `gameplay-programmer`
- Last completed owner: `task-orchestrator`
- Expected handoff owner: `task-orchestrator`
- Last updated at: `2026-05-03 20:42 CEST`
- Resolved at: `null`

## Objective

Diagnose the existing audio path and produce the smallest implementation spec that restores audible feedback without changing gameplay rules.

The next owner must identify whether the failure is caused by asset paths, cache/versioning, browser autoplay policy, DOM wiring, lifecycle pause/resume, swallowed playback errors, or missing user gesture handling.

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `.agents/contracts/pichan-wave-model-contract.md`
- `.agents/templates/thread_template.md`
- `.agents/templates/thread_state_template.json`
- `.agents/templates/thread_log_template.jsonl`
- `README.md`
- `index.html`
- `js/ui/audio.js`
- `js/loader.js`
- `main.js`
- `sounds/*.mp3`

## Validated Facts

- `index.html` declares `<audio>` tags for BGM and five SFX: `bgm`, `gameover-sfx`, `shot-sfx`, `bounce-sfx`, `onion-death-sfx`, and `levelup-sfx`.
- Referenced audio asset files exist under `sounds/` and are non-empty.
- `js/ui/audio.js` owns the audio controller for BGM/SFX playback.
- `main.js` wires DOM audio elements into `createAudioController`.
- `README.md` states that WebAudio/BGM starts only after a user gesture.
- `js/loader.js` versions `<audio>` URLs through existing asset versioning.
- Current wave model direction remains unrelated; this task must not reopen wave rules.

## Draft Assumptions In Play

- The report refers to the current browser game runtime, not editor/export tooling.
- The correct fix is likely in existing audio wiring or browser lifecycle handling, not in new audio asset production.
- Swallowed `play()` promise failures may hide the real browser-side cause during testing.
- A small diagnostic/manual browser checklist is required because audio audibility cannot be proven by static checks alone.

## Current Direction

- Route to `gameplay-programmer` for an implementation spec and impact map.
- Keep the task as a bugfix, not an audio redesign.
- Prefer restoring existing SFX/BGM behavior over adding controls, new sounds, or new systems.
- Require manual browser validation after any build because audio depends on user gesture and browser policy.

## Candidate Scope

### Candidate impact surface to evaluate

- `index.html`
- `js/ui/audio.js`
- `main.js`
- `js/loader.js`

### Candidate read-only evidence

- `README.md`
- `sounds/*.mp3`
- browser console / network / media playback state during manual test

### Explicit non-goals

- No new audio assets.
- No replacement soundtrack or SFX redesign.
- No gameplay rule, wave, arena, scoring, enemy, player, bullet, or onion behavior changes.
- No HUD/audio settings panel unless a minimal browser-unlock affordance is proven necessary.
- No broad loader or app lifecycle rewrite.
- No online/network/presence/nickname work.

### Freeze zones

- `config/levels.json`
- `js/core/LevelManager.js`
- `js/core/Arena.js`
- `js/entities/**`
- `js/ai/**`
- `assets/**`
- `css/**`
- online/network/presence files
- nickname service files

## Validation And Checks

### Required validations

- For changed JS files: `node --input-type=module --check < changed-js-file>`.
- For changed HTML: browser load plus console/network check for audio asset requests.
- If `index.html` audio tags are changed, manually verify referenced files resolve.
- Manual browser audio checklist is mandatory.

### Human test checklist draft

- Start the game through the normal Play/user gesture path. Expected: BGM becomes audible or a clear unlock path exists.
- Fire a shot. Expected: shot SFX is audible.
- Bounce a bullet. Expected: bounce SFX is audible.
- Kill an onion. Expected: onion death SFX is audible.
- Trigger game over. Expected: game-over SFX is audible and BGM behavior remains coherent.
- Trigger level transition. Expected: level-up SFX is audible and fade behavior remains coherent.
- Pause/background and resume the tab. Expected: audio does not remain permanently muted.
- Hard refresh after asset versioning. Expected: no stale missing audio URL remains.

## Open Questions

- Are audio requests succeeding in the browser network panel?
- Does the browser reject `play()` with `NotAllowedError`, `AbortError`, unsupported media, missing asset, or another reason?
- Does audio fail for all sounds or only BGM/SFX?
- Does the issue reproduce only before the first user gesture, after game over/continue, or after tab visibility changes?

## Artifacts

- `.agents/threads/003-audio-not-playing/thread.md`
- `.agents/threads/003-audio-not-playing/state.json`
- `.agents/threads/003-audio-not-playing/log.jsonl`

## Solution Applied

`Pending task completion.`
