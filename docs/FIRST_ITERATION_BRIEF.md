# PiChan / PI.Onion — FIRST_ITERATION_BRIEF

## Iteration Name
First Critical Review — Juicy + Onion V2 Validation

## Context
PiChan / PI.Onion è un arcade 2D retrò anni '90 basato su codebase JavaScript esistente.

Il progetto ha già ricevuto un pass di modifiche orientate a:
- rendere il gioco più juicy
- rendere Onion più aggressiva e viva
- introdurre shape diverse dell’arena
- introdurre progressione a cicli
- introdurre rotazione runtime dell’arena

Questa iterazione non serve ad aggiungere altra roba.
Serve a capire cosa funziona davvero, cosa va ridotto e cosa va consolidato.

## Main Objective
Validare e consolidare il pass “juicy + Onion V2” per rendere il primo minuto di gioco:
- più leggibile
- più arcade
- più soddisfacente
- più coerente

senza introdurre feature grosse o refactor ampi.

## Hard Constraints
- Niente feature creep
- Niente macro-sistemi nuovi
- Niente redesign totale del loop
- Niente refactor architetturali ampi
- Preferire tuning e riduzione del rumore
- Ogni proposta deve essere verificabile
- Ogni proposta deve avere test manuali

## Strategic Priorities
Ordine di priorità:
1. Readability
2. Game Feel
3. Pressure
4. Progression clarity
5. Scope control

## Known Current State
Stato noto già confermato:

- esiste una progressione a livelli
- a ogni level up può cambiare la shape dell’arena
- le shape sono organizzate a cicli
- la difficoltà cresce quando il ciclo riparte
- sono state introdotte shape rotanti tramite `arenaRotationSpeed`
- `Arena.js` supporta shape multiple
- `Arena.js` supporta rotazione runtime
- `Arena.js` preserva stato su resize
- `LevelManager.js` legge shape e rotazione dal livello
- `LevelManager.js` gestisce progressione per ciclo
- `Onion.js` include Onion V2
- Onion V2 include dodge leggero dei proiettili
- Onion V2 include chase più aggressivo
- Onion V2 include wobble / pulse / glow / ring
- `Player.js` include recoil / squash / muzzle flash
- il facing persistente del player è già sistemato
- `Bullet.js` include bullet trail
- `Bullet.js` include bounce sparks

## Relevant Files
- `config/levels.json`
- `js/core/Arena.js`
- `js/core/LevelManager.js`
- `js/entities/Player.js`
- `js/entities/Onion.js`
- `js/entities/Bullet.js`

## Key Questions To Resolve
Questa iterazione deve rispondere in modo chiaro a queste domande:

### Readability
- Il player resta leggibile in movimento e da fermo?
- Onion è leggibile come minaccia?
- I bullet sono chiari o sono troppo rumorosi?
- Le shape e la rotazione rendono il campo più interessante o più confuso?

### Game Feel
- Recoil, squash e muzzle flash migliorano davvero la sensazione di controllo?
- Il movimento e lo sparo del player risultano più soddisfacenti?
- Gli effetti juicy aggiungono impatto o solo decorazione?

### Pressure
- Onion V2 è abbastanza aggressiva?
- Il dodge è interessante o risulta sleale/sporco?
- Il chase è leggibile?
- La pressione cresce in modo chiaro?

### Progression
- La progressione shape/cicli/difficoltà si percepisce davvero?
- Il riavvio del ciclo crea escalation o solo variazione estetica?
- Il primo minuto comunica la crescita del rischio?

### Noise
- Wobble / pulse / glow / ring aiutano o sporcano?
- Bullet trail e bounce sparks aiutano o sporcano?
- La rotazione arena aumenta tensione o degrada il controllo percettivo?

## Non-Goals
Questa iterazione non deve:
- introdurre nuovi nemici
- introdurre nuove armi
- introdurre nuovi sistemi di progressione
- introdurre nuovi contenuti grossi
- fare polish puramente cosmetico
- allargare il progetto senza validazione

## Requested Workflow
Seguire questo ordine:

1. ORCHESTRATOR
2. GAME DESIGNER
3. GAMEPLAY PROGRAMMER
4. PIXEL ARTIST solo se emerge un problema reale di leggibilità o feedback
5. ORCHESTRATOR
6. BUILD AGENT solo se il risultato è davvero pronto

## Required Orchestrator Output
L’ORCHESTRATOR deve produrre:

- piano di consultazione agenti
- sintesi normalizzata dei problemi
- conflitti tra design, codice e feedback visivo
- distinzione chiara tra:
  - confirmed observations
  - proposals
  - assumptions
  - risks
  - out of scope
- un `MASTER PATCH BRIEF` corto, concreto e verificabile

## Expected Deliverables From This Iteration
Alla fine di questo ciclo devono esistere:

### Minimum expected
- una lista di elementi da tenere
- una lista di elementi da ridurre o tagliare
- una lista di rischi aperti
- una valutazione se il gioco è davvero migliorato oppure no

### If build-ready
- un `MASTER PATCH BRIEF`
- file o sistemi impattati chiaramente identificati
- test manuali espliciti
- rischi residui dichiarati

## Build Readiness Gate
La build può partire solo se è chiaro:

- cosa va tenuto
- cosa va ridotto
- cosa va corretto
- quali file vanno toccati
- quali test manuali validano la patch
- che non ci sono conflitti aperti tra leggibilità, feel e implementazione

Se uno di questi punti manca, stato finale:
`NOT READY`

## Manual Test Focus
L’iterazione deve generare o confermare test manuali su:

- leggibilità del player
- leggibilità di Onion
- chiarezza dei bullet
- qualità percepita del recoil/squash/muzzle flash
- impatto reale di wobble/pulse/glow/ring
- impatto reale di trail/sparks
- utilità reale di shape progression
- utilità reale di arena rotation
- percezione della progressione nel primo minuto

## Decision Principles
Ogni decisione deve seguire queste regole:

### Keep
Tenere ciò che:
- migliora lettura del gioco
- migliora controllo percepito
- migliora pressione leggibile
- migliora soddisfazione del loop

### Cut
Tagliare ciò che:
- aggiunge rumore
- peggiora leggibilità
- rende Onion più sporca invece che più minacciosa
- rende l’arena più gimmick che gameplay
- complica il codice senza valore immediato

### Defer
Rimandare ciò che:
- non serve a validare il primo minuto
- richiede sistema grosso
- richiede asset pesanti
- non migliora direttamente readability / game feel / pressure / progression

## Final Instruction
Questa iterazione non deve produrre entusiasmo artificiale.
Deve produrre verità operative.

La domanda finale non è:
“quante cose nuove possiamo ancora aggiungere?”

La domanda finale è:
“il gioco ora è davvero più forte, oppure solo più pieno?”