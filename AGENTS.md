# PiChan / PI.Onion — Repository Agent Guide

## Project identity
PiChan / PI.Onion è un arcade 2D retrò anni '90 basato su una codebase JavaScript esistente.
Non è un progetto greenfield.
L'obiettivo è migliorare il gioco con patch piccole, verificabili e reversibili, evitando feature creep e regressioni.

## Core priorities
Ordine di priorità assoluto:
1. leggibilità
2. game feel
3. chiarezza del loop arcade
4. scope controllato
5. patch incrementali e reversibili
6. minimizzazione regressioni

## Hard rules
- Niente feature creep.
- Prima migliorare o semplificare ciò che esiste, poi eventualmente aggiungere.
- Non preservare codice legacy solo perché esiste: se ostacola il modello approvato, proporre rimozione o sostituzione motivata.
- Non fare broad rewrite senza approvazione esplicita nel task thread.
- Non toccare file fuori dall'approved impact surface.
- Ogni modifica deve avere test manuali verificabili.
- Se una proposta non è verificabile, ridurla.
- Se una proposta richiede un sistema grosso non previsto, marcarla `OUT_OF_SCOPE`.
- Distinguere sempre: fatti confermati, assunzioni, proposta, rischio, dipendenza.

## Current strategic direction
La direzione corrente del gioco è fixed-arena / wave-based.
- Runtime arena rotation è rifiutata come direzione di difficoltà.
- La difficoltà non deve crescere aumentando all'infinito il numero di onion vive.
- Il modello preferito separa:
  - `maxAliveOnions`: cap di pressione attiva e leggibile
  - `totalOnions`: budget finito della wave
  - `spawnIntervalMs`: cadenza di rimpiazzo
  - `onionPressure`: intensità ottenuta tramite comportamenti/tuning esistenti prima di nuovi nemici
- Prima validare il modello wave con un'arena statica, poi valutare eventuale varietà statica.

## Stable references
Prima di agire, usare queste fonti in ordine:
1. codice reale del repo
2. `AGENTS.md`
3. `.agents/contracts/pichan-gameplay-contract.md`
4. `.agents/contracts/pichan-wave-model-contract.md`
5. task thread corrente: `.agents/threads/<thread-basename>.state.json`
6. task thread corrente: `.agents/threads/<thread-basename>.log.jsonl`
7. task thread corrente: `.agents/threads/<thread-basename>.md`
8. documenti storici in `docs/` solo se coerenti con il thread corrente

La memoria chat non è source of truth.

## Allowed roles
Usare le skill esplicitamente quando possibile:
- `task-orchestrator`
- `game-designer`
- `gameplay-programmer`
- `impact-regression-guard`
- `build-agent`
- `browser-runtime-qa`
- `review-maintainability-guard`
- `pixel-artist` solo quando serve davvero una review di leggibilità visiva/asset

## Canonical workflow
Questo workflow è hub-and-spoke.
- Solo `task-orchestrator` crea, aggiorna e rinomina i thread file canonici.
- Solo `task-orchestrator` aggiorna lo stato canonico `.state.json`.
- Solo `task-orchestrator` aggiorna il summary umano `.md`.
- I ruoli non-orchestrator non si passano lavoro direttamente.
- Ogni ruolo non-orchestrator termina con:
  - `status_proposal`
  - `next_owner: task-orchestrator`
  - `human_handoff_prompt`: prompt completo pronto per copia/incolla per l'umano
- `task-orchestrator` converte proposte in stato canonico e decide il prossimo owner.
- Ogni owner, incluso `task-orchestrator`, deve sempre preparare un prompt completo per il prossimo owner umano-operabile.
- Se il prossimo owner canonico è `task-orchestrator`, il prompt deve comunque essere completo e invocabile, es. `$task-orchestrator .agents/threads/<thread-basename>/thread.md`.
- Se `task-orchestrator` decide un owner successivo diverso, deve produrre il prompt completo per quel ruolo, es. `$impact-regression-guard .agents/threads/<thread-basename>/thread.md`.
- `browser-runtime-qa` non modifica codice, asset, CSS, JS o config.
- `browser-runtime-qa` usa Chrome DevTools MCP solo per raccogliere evidenze runtime osservabili nel browser reale.
- `browser-runtime-qa` non sostituisce `review-maintainability-guard`: dopo la validazione propone sempre uno stato e ritorna a `task-orchestrator`.

## Task thread files
Ogni task non banale deve usare tre file companion:
- `.agents/threads/<thread-basename>.md`
- `.agents/threads/<thread-basename>.state.json`
- `.agents/threads/<thread-basename>.log.jsonl`

Per nuovi task, partire dai template:
- `.agents/templates/thread_template.md`
- `.agents/templates/thread_state_template.json`
- `.agents/templates/thread_log_template.jsonl`

Thread basename pattern:
`<status>-<previous-owner-2-current-owner>-<thread-name>`

Esempio:
`APPROVED_FOR_BUILD-impact-regression-guard-2-build-agent-002-fixed-arena-wave-model`

## Canonical states
- `NEW`
- `DESIGN_REQUESTED`
- `DESIGN_DONE`
- `IMPACT_ANALYSIS_REQUESTED`
- `IMPACT_ANALYSIS_DONE`
- `APPROVED_FOR_BUILD`
- `BUILD_DONE`
- `IN_REVIEW`
- `NEEDS_REWORK`
- `BLOCKED`
- `DONE`

## Mandatory gate before any role acts
Ogni ruolo deve verificare:
- `current_owner` nello `.state.json` coincide con il ruolo
- `status` è compatibile con il ruolo
- latest log contiene `status_proposal` e `next_owner`
- latest `next_owner` è compatibile col ruolo
- il task è coerente con la missione del ruolo

Se il gate fallisce:
- non lavorare sul codice
- spiegare il mismatch nel log
- proporre ritorno a `task-orchestrator`

## Role routing
Default:
1. `task-orchestrator` intake / stato / routing
2. `game-designer` se serve definire regole, loop, difficoltà, wave model, scoring, pressure
3. `task-orchestrator`
4. `gameplay-programmer` per implementation spec e file impact
5. `task-orchestrator`
6. `impact-regression-guard` per regressioni, call site, file scope, compatibilità
7. `task-orchestrator`
8. `build-agent` solo se `APPROVED_FOR_BUILD`
9. `task-orchestrator`
10. `browser-runtime-qa` dopo build completata, quando serve validazione runtime browser reale
11. `task-orchestrator`
12. `review-maintainability-guard`
13. `task-orchestrator` chiude `DONE` o `NEEDS_REWORK`

`pixel-artist` è opzionale e va usato solo per problemi reali di leggibilità visiva o asset.

## Build approval gate
`APPROVED_FOR_BUILD` richiede:
- objective chiaro
- approved impact surface esplicito
- forbidden files espliciti
- runtime changes espliciti
- data/tuning changes espliciti
- manual test checklist
- validation commands disponibili o motivazione se assenti
- regressioni principali note
- reviewer/impact guard pass completato o esplicitamente saltato dal task-orchestrator con motivazione

## Review gate
`DONE` richiede:
- build report presente
- diff scope rispettato
- validation eseguita o motivata
- manual test checklist presente
- review-maintainability-guard con verdict `APPROVE` oppure `APPROVE_WITH_NOTES`
- `solution_applied` compilato nello state e nel summary

## Validation discipline
Per repo JavaScript senza `package.json`, usare almeno:
- JSON parse per config modificati
- `node --input-type=module --check < file.js` per JS modificati
- eventuale test browser/manuale dichiarato
- PHPMD non applicabile salvo presenza reale di PHP e config PHPMD

## Human handoff prompt
Ogni owner deve chiudere il proprio output con un handoff umano pronto per copia/incolla.

Includere sempre:
- modello Codex consigliato
- reasoning consigliato
- se aprire nuova chat Codex o continuare
- owner successivo
- stato proposto o stato canonico
- prompt completo pronto da copiare

Il prompt completo deve includere almeno:
- skill/owner da invocare, es. `$build-agent`
- path del thread canonico, preferendo `.agents/threads/<thread-basename>/thread.md`
- solo istruzioni specifiche del thread corrente che non siano gia' coperte da `AGENTS.md`, dai contratti o dalla skill del ruolo

Esempio minimo:
`$impact-regression-guard .agents/threads/002-fixed-arena-wave-model/thread.md`

Esempio con delta specifico:
```text
$impact-regression-guard

Thread:
.agents/threads/002-fixed-arena-wave-model/thread.md

Focus specifico:
- review del build gia' implementato, senza fix
- attenzione a dirty worktree fuori scope
- verificare ordering wave completion/cap/cadence
```

## Output style
Secco, tecnico, critico, concreto. Niente lodi, niente fuffa.

quando un task è terminato, fornisci sempre messaggio per la commit
