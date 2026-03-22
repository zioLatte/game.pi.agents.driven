# PiChan / PI.Onion — Repository Agent Guide

## Project identity
PiChan è un arcade 2D retrò anni '90 basato su codebase esistente JavaScript.
Non è un progetto greenfield.
L'obiettivo non è aggiungere feature casuali, ma migliorare leggibilità, game feel, loop arcade e coerenza generale con patch piccole e verificabili.

## Core priorities
Ordine di priorità assoluto:
1. leggibilità
2. game feel
3. chiarezza del loop
4. scope controllato
5. patch incrementali e reversibili
6. minimizzazione delle regressioni

## Hard rules
- Niente feature creep.
- Prima migliorare ciò che esiste, poi aggiungere.
- Non inventare sistemi grossi se bastano patch locali.
- Non rifattorizzare architettura senza una ragione forte e documentata.
- Non toccare file non necessari.
- Ogni modifica deve avere test manuali verificabili.
- Se una richiesta è ambigua ma implementabile in forma minima ragionevole, scegliere la forma minima e dichiararla.
- Se una richiesta è bloccata da ambiguità reale o conflitto tecnico serio, fermarsi solo su quel punto.
- Se una proposta non è verificabile, ridurla.
- Se una proposta richiede un sistema grosso non previsto, marcarla `OUT OF SCOPE`.

## Working style
- Preferire analisi della codebase reale a supposizioni.
- Distinguere sempre tra:
  - osservazione confermata
  - proposta
  - assunzione
  - rischio
  - dipendenza
- Mantenere output sintetici, strutturati, anti-fuffa.
- Non fare coaching generico.
- Non lodare il lavoro svolto. Identificare solo ciò che serve davvero.
- Quando possibile, preferire tuning/config a nuova logica.
- Quando possibile, preferire hook riusabili a nuovi sistemi.

## Mandatory workflow
Per task non banali, seguire questo flusso:
1. chiarire lo scope del ciclo
2. analizzare i file coinvolti
3. produrre o usare un brief strutturato
4. proporre patch minima
5. definire test manuali
6. dichiarare rischi e differiti

## Agent roles in this repo
Questi ruoli esistono come skill specializzate:
- `orchestrator`: coordina, normalizza, taglia scope, decide readiness
- `game-designer`: definisce regole, difficulty, scoring, progression
- `gameplay-programmer`: traduce il design in patch tecniche implementabili
- `build-agent`: applica patch concrete ai file
- `pixel-artist`: definisce esigenze visive, leggibilità, feedback, asset list

## Source of truth
Usare e aggiornare il file:
- `docs/MASTER_STATE.md`

Questo file deve contenere:
- goal del ciclo corrente
- decisioni approvate
- rischi aperti
- asset richiesti
- ultimo master patch brief
- test manuali

Non usare la memoria della chat come unica fonte di verità.

## Suggested repo map
Se presenti, dare priorità a:
- `docs/MASTER_STATE.md`
- `config/levels.json`
- `js/core/LevelManager.js`
- `js/core/Arena.js`
- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`

## Output discipline
Quando si restituisce un risultato tecnico, usare strutture leggibili.
Per patch o proposte complesse, includere sempre:
- goal
- file impattati
- cambi runtime
- test manuali
- rischi
- differiti

## Definition of done for small gameplay patches
Una patch è considerata pronta solo se:
- il perimetro è chiaro
- i file toccati sono noti
- il comportamento atteso è descritto
- esistono test manuali
- i rischi residui sono dichiarati
- non contiene cambi gratuiti fuori scope

## Forbidden behavior
- introdurre nuove feature senza giustificazione
- cambiare stile del gioco senza relazione con leggibilità o game feel
- proporre refactor massivi per problemi piccoli
- dichiarare “fatto” senza test manuali
- confondere design, implementazione e asset finali nello stesso output

## Preferred tone
Secco, tecnico, critico, concreto.