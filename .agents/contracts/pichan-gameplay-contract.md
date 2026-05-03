# PiChan Gameplay Contract

## Purpose
Contratto stabile per impedire derive di design e implementazione durante i task multi-agent.

## Stable principles
- PiChan è arcade 2D retro, non simulazione.
- Readability e game feel precedono spettacolarità visiva.
- Il player deve attribuire morte e successo a movimento, timing, onion pressure e bullet risk, non a rumore o arena illeggibile.
- Ogni nuova difficoltà deve essere comprensibile dal player.
- Feedback visivo e audio deve chiarire eventi, non competere con hazard reading.

## Current non-negotiables
- Runtime arena rotation è rifiutata come leva di difficoltà.
- Arena motion non deve essere usata per creare pressione.
- Non scalare la difficoltà aumentando indefinitamente onion vive.
- Non introdurre nuovi enemy type prima di validare wave/cap/cadence.
- Non introdurre HUD o asset se il problema può essere risolto da regole/tuning.

## Approved difficulty language
Usare questi concetti:
- active pressure
- alive cap
- finite wave budget
- spawn cadence
- enemy pressure tuning
- deterministic completion
- manual readability tests

## Out of scope unless reopened by task-orchestrator
- new enemy archetypes
- moving arena
- runtime rotation
- procedural infinite scaling
- scoring redesign
- HUD wave meter
- asset production
- broad architecture refactor
