# TASK SUMMARY

Thread basename: `DONE-review-maintainability-guard-2-task-orchestrator-015-localhost-https-dev-server`
Canonical state file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-015-localhost-https-dev-server.state.json`
Structured log file: `.agents/threads/DONE-review-maintainability-guard-2-task-orchestrator-015-localhost-https-dev-server.log.jsonl`

This markdown file is the human-facing task summary.
Canonical owner, status, routing and execution state live in the companion `.state.json`.
Detailed handoff history lives in the companion `.log.jsonl`.
Only `task-orchestrator` updates this summary.

## Problem

- Task id: `PI-015`
- Thread name: `localhost-https-dev-server`
- Title: make localhost HTTPS easy for local testing
- Problem statement: local HTTPS is documented but requires manual TLS env vars; user wants to use localhost over HTTPS.
- Game flow context: local development / mobile secure-context testing
- Task level: `L1`
- Patch budget: `tiny`

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Expected handoff owner: `task-orchestrator`
- Tracked execution time: `00h 05m`
- Last updated at: `2026-05-24 17:47 CEST`

## Scope Inputs

- `AGENTS.md`
- `.agents/contracts/pichan-gameplay-contract.md`
- `serve.sh`
- `https_server.py`
- `README.md`

## Validated Decisions

- `serve.sh` already has HTTP and HTTPS modes.
- `serve.sh --https` currently requires explicit `TLS_CERT` and `TLS_KEY`.
- `dev-cert.pem` and `dev-key.pem` are ignored by `.gitignore`.
- `https_server.py` is tracked but points to `cert.pem`, which is not the current local cert naming.

## Draft Assumptions In Play

- Local self-signed certificates are acceptable for development.
- Runtime game files must not change.
- The generated cert/key must remain untracked.

## Approved Direction

- Make `./serve.sh --https` work with default local cert paths.
- Generate a self-signed localhost certificate automatically when missing and `openssl` is available.
- Keep HTTPS serving dependency-free beyond Python and OpenSSL.
- Align `https_server.py` with the same local certificate files.

## Scope

### Approved impact surface

- `serve.sh`
- `https_server.py`
- `README.md`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-015-localhost-https-dev-server.md`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-015-localhost-https-dev-server.state.json`
- `.agents/threads/APPROVED_FOR_BUILD-task-orchestrator-2-build-agent-015-localhost-https-dev-server.log.jsonl`

### Explicit non-goals

- No gameplay/runtime code changes.
- No dependency manager or package.json introduction.
- No committed TLS private key or certificate.
- No production HTTPS deployment.

### Freeze zones

- `main.js`
- `js/**`
- `css/**`
- `assets/**`
- `config/**`

## Validation And Checks

### Required validations

- PASS: `bash -n serve.sh`
- PASS: `python3 -m py_compile https_server.py`
- PASS: JSON parse for thread state/log files.
- PASS: `./serve.sh --https` generated SAN localhost certificate.
- PASS: `curl -k -I --max-time 5 https://localhost:8443` returned HTTP 200.
- PASS: `./serve.sh --https --port 9443` plus curl returned HTTP 200.
- PASS: partial TLS env vars fail with clear error.

### Human test checklist

- Run `./serve.sh --https`.
- Open `https://localhost:8443` or the printed URL.
- Accept the self-signed certificate warning if the browser prompts.
- Confirm the game loads.

## Open Questions

- none

## Artifacts

- `serve.sh`
- `https_server.py`
- `README.md`

## Solution Applied

Implemented:

- `./serve.sh --https` now serves `https://localhost:8443` by default.
- Local `dev-cert.pem` / `dev-key.pem` are generated or refreshed when missing localhost SAN.
- Explicit `TLS_CERT` / `TLS_KEY` custom certs remain supported and are not overwritten.
- `https_server.py` now uses the same cert defaults and supports `HOST` / `PORT`.
- README quickstart documents the HTTPS path.
