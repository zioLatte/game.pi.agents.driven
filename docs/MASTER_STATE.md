# PiChan / PI.Onion — MASTER_STATE

## Project Identity
PiChan / PI.Onion è un arcade 2D retrò anni '90 basato su una codebase JavaScript esistente.
Il progetto non è greenfield: il lavoro deve partire dallo stato reale del codice e migliorarlo con patch piccole, verificabili e a basso rischio.

## Vision
Obiettivo del gioco:
costruire un arcade 2D leggibile, cattivo, reattivo e soddisfacente, con identità retrò chiara e loop immediato.

Priorità assolute:
1. leggibilità
2. game feel
3. chiarezza del loop arcade
4. scope controllato
5. patch incrementali e reversibili
6. riduzione delle regressioni

## Fixed Rules
- Niente feature creep.
- Prima migliorare ciò che esiste, poi aggiungere.
- Ogni modifica deve essere verificabile con test manuali.
- Se una proposta non è verificabile, va ridotta.
- Se una proposta richiede un sistema grande non previsto, va marcata `OUT OF SCOPE`.
- Non rifattorizzare architettura senza una motivazione forte.
- Non toccare file non necessari.
- Non usare la memoria della chat come unica fonte di verità.
- Le decisioni approvate devono essere riportate qui.

## Current Product Goal
Rendere il primo minuto di gioco più leggibile, più arcade e più soddisfacente, senza introdurre feature grosse non necessarie.

## Current Development Focus
Focus attuale:
- validare il pass “juicy + Onion V2”
- capire se il gioco è davvero più leggibile, più cattivo e più soddisfacente
- consolidare la progressione dei livelli
- verificare che gli effetti introdotti migliorino il gioco invece di sporcarlo
- distinguere ciò che è davvero utile da ciò che è solo rumore

## Known Codebase Scope
File attualmente rilevanti:

- `config/levels.json`
- `js/core/Arena.js`
- `js/core/LevelManager.js`
- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`

Altri file possono esistere, ma questi sono i punti principali da considerare per il pass corrente.

## Known Current State
Stato noto del gioco sulla base delle informazioni già confermate:

- esiste una progressione a livelli
- a ogni level up può cambiare la shape dell’arena
- la progressione delle shape è organizzata a cicli
- la difficoltà cresce quando il ciclo delle shape riparte
- sono state introdotte shape rotanti tramite `arenaRotationSpeed`
- `Arena.js` supporta shape multiple
- `Arena.js` supporta rotazione runtime dell’arena
- lo stato dell’arena viene preservato su resize
- `LevelManager.js` legge shape e rotazione dal livello
- `LevelManager.js` gestisce progressione per ciclo
- `Onion.js` include Onion V2 con dodge leggero dei proiettili
- `Onion.js` include chase più aggressivo
- `Onion.js` include wobble / pulse / glow / ring
- `Player.js` include recoil / squash
- `Player.js` include muzzle flash
- il facing persistente del player è già stato sistemato
- `Bullet.js` include bullet trail
- `Bullet.js` include bounce sparks

## Design Intent
Direzione desiderata del gioco:

- feeling arcade immediato
- controlli leggibili e reattivi
- nemici con pressione chiara ma non sporca
- progressione percepibile
- pattern e shape che cambiano la lettura del campo
- effetti visivi al servizio del gameplay, non decorazione gratuita
- difficoltà crescente ma comprensibile
- identità retrò anni '90 senza caos illeggibile

## Current Hypothesis
Ipotesi da verificare nel pass attuale:

Il gioco ha già ricevuto abbastanza elementi “juicy”, ma non è ancora dimostrato che il risultato finale sia davvero migliore sul piano di:
- leggibilità
- pressione arcade
- chiarezza del rischio
- soddisfazione del loop
- percezione della progressione

Questa ipotesi deve essere validata con test umani e review critica, non data per buona.

## Approved Decisions
Decisioni già considerate approvate o almeno presenti nello stato corrente:

- usare shape diverse lungo la progressione
- organizzare le shape in cicli
- aumentare la difficoltà quando il ciclo riparte
- introdurre rotazione runtime dell’arena
- mantenere Onion V2 come base comportamentale del nemico
- usare feedback juicy su player, bullet e onion solo se supportano il game feel
- mantenere il facing persistente del player

## Pending Validation
Elementi da validare sul gioco reale:

- la rotazione dell’arena migliora davvero la tensione o sporca la lettura?
- le shape diverse rendono il gioco più interessante o più confuso?
- Onion V2 è abbastanza aggressivo senza risultare sporco o sleale?
- wobble / pulse / glow / ring aiutano o aggiungono rumore?
- bullet trail e bounce sparks migliorano la leggibilità oppure la sporcano?
- recoil / squash / muzzle flash del player aumentano davvero la soddisfazione?
- il primo minuto di gioco comunica abbastanza bene il loop?

## Open Problems
Problemi aperti da chiarire o verificare:

- rischio di eccesso di rumore visivo
- rischio che la difficoltà salga senza sufficiente chiarezza
- rischio che la progressione delle shape sia percepita come gimmick e non come valore reale
- rischio che l’arena rotante penalizzi troppo la leggibilità
- rischio di mismatch tra tuning reale e resa percepita dal player

## Open Risks
Rischi tecnici e di prodotto:

- regressioni sul flow di gioco
- regressioni nella progressione livelli
- regressioni nella leggibilità spaziale con shape/rotazione
- accumulo di effetti visivi senza gerarchia
- introduzione di complessità superiore al valore percepito
- codice che cresce più velocemente della chiarezza del gameplay

## Out of Scope
Per il ciclo corrente sono fuori scope, salvo richiesta esplicita:

- nuove macro-feature
- refactor architetturali ampi
- sistemi grossi non richiesti
- redesign totale del loop
- pipeline asset complesse
- contenuti enormi o espansioni non validate
- polish puramente cosmetico non collegato a leggibilità o game feel

## Current Agent Workflow
Workflow approvato:

1. ORCHESTRATOR
2. GAME DESIGNER
3. GAMEPLAY PROGRAMMER
4. PIXEL ARTIST solo se serve davvero
5. ORCHESTRATOR
6. BUILD AGENT
7. HUMAN TEST

Regola:
nessun agente deve diventare source of truth.
La source of truth è questo file.

## Role Boundaries
### ORCHESTRATOR
Coordina, taglia scope, normalizza conflitti, decide readiness.

### GAME DESIGNER
Definisce regole, scoring, difficulty, progression, priorità di gameplay.

### GAMEPLAY PROGRAMMER
Traduce il design in modifiche tecniche piccole, testabili e locali.

### PIXEL ARTIST
Definisce bisogni di leggibilità visiva, feedback, HUD, asset necessari.

### BUILD AGENT
Implementa la patch approvata senza riaprire il design, salvo blocchi reali.

## Required Output Discipline
Ogni ciclo deve produrre almeno:

- obiettivo del ciclo
- file coinvolti
- decisioni approvate
- rischi
- test manuali
- differiti
- stato finale: `NOT READY`, `READY WITH RISKS`, oppure `BUILD READY`

## Manual Testing Policy
Ogni patch deve essere verificata manualmente.

Ogni test manuale deve indicare:
- azione
- contesto
- comportamento atteso osservabile

Non accettare come “done” una patch senza test manuali.

## Current Manual Test Goals
Per il pass attuale i test umani dovrebbero verificare almeno:

- leggibilità del player in movimento e da fermo
- chiarezza della pressione esercitata da Onion V2
- percezione della progressione livello dopo livello
- effetto reale delle shape diverse sulla giocabilità
- effetto reale della rotazione dell’arena sulla leggibilità
- chiarezza dei proiettili e delle collisioni
- qualità percepita del game feel del player
- rapporto tra quantità di feedback visivo e chiarezza complessiva

## Required Assets
Attualmente nessun nuovo asset è da considerarsi obbligatorio finché non emerge un problema reale di leggibilità o feedback.

Se dovessero servire, gli asset devono essere classificati come:
- indispensabili
- utili
- cosmetici

## Deferred Items
Da compilare a fine ciclo con ciò che viene rimandato esplicitamente.

- Nessuno ancora formalizzato.

## Last Orchestrator Status
Stato corrente del ciclo:

`NOT READY`

Motivo:
esistono molte modifiche introdotte, ma manca ancora una normalizzazione finale che distingua:
- ciò che funziona davvero
- ciò che è rumore
- ciò che va ridotto
- ciò che va consolidato in una patch definitiva

## Last Master Patch Brief
### Objective
Validare e consolidare il pass “juicy + Onion V2” per rendere il gioco più leggibile, più arcade e più soddisfacente nel primo minuto.

### Scope
Limitare il lavoro ai sistemi già esistenti collegati a:
- player
- onion
- bullet
- arena
- level progression
- level config

### Gameplay Changes
- verificare aggressività e comportamento di Onion V2
- verificare progressione shape/cicli/difficoltà
- verificare impatto arcade della rotazione arena
- ridurre eventuali elementi che sporcano il loop

### Technical Changes
- lavorare localmente sui file già noti
- evitare refactor ampi
- preferire tuning e pulizia a nuovi sistemi

### Visual Changes
- mantenere solo feedback che migliorano leggibilità o soddisfazione
- ridurre feedback ridondanti o rumorosi se emergono problemi

### Required Assets
- nessun asset nuovo obbligatorio in questa fase, salvo prova contraria

### Manual Test Cases
Da aggiornare dopo il prossimo ciclo orchestrato.

### Risks
- eccesso di rumore visivo
- complessità superiore al valore reale
- progressione percepita come gimmick
- peggioramento della leggibilità con arena rotante

### Deferred Items
- da definire dopo review critica del pass attuale

## Update Protocol
Alla fine di ogni ciclo aggiornare:
- `Current Product Goal` se cambia
- `Approved Decisions`
- `Pending Validation`
- `Open Problems`
- `Open Risks`
- `Required Assets`
- `Deferred Items`
- `Last Orchestrator Status`
- `Last Master Patch Brief`

## Definition of Done for Current Cycle
Il ciclo attuale può considerarsi chiuso solo se:

- è chiaro quali elementi del pass juicy restano
- è chiaro quali elementi vanno ridotti o rimossi
- la progressione shape/cicli è giudicata leggibile e utile
- Onion V2 è giudicato coerente con il feeling arcade desiderato
- esistono test manuali eseguiti con esito riportato
- il brief per la build successiva è corto, concreto e verificabile