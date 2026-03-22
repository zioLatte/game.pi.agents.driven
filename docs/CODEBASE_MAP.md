# PiChan / PI.Onion — CODEBASE_MAP

## Purpose
Questo documento mappa il perimetro tecnico attualmente noto della codebase di PiChan / PI.Onion.

Non è una documentazione esaustiva del progetto.
Serve a:
- identificare i file chiave del loop arcade attuale
- chiarire ownership e responsabilità
- aiutare ORCHESTRATOR, GAME DESIGNER, GAMEPLAY PROGRAMMER e BUILD AGENT a capire dove intervenire
- ridurre modifiche inutili fuori scope

Se emergono nuovi file realmente rilevanti, questo documento va aggiornato.

## Reliability Note
Questa mappa distingue tra:
- `Confirmed`: informazione già confermata nel contesto
- `Likely`: deduzione ragionevole ma da verificare sul codice reale
- `Unknown`: punto non ancora verificato

Non inventare dettagli mancanti.

---

## High-Level Runtime Areas

### Level / Progression Layer
Responsabile della progressione, dei parametri per livello e dell’evoluzione della difficoltà.

File noti:
- `config/levels.json`
- `js/core/LevelManager.js`

### Arena / Space Layer
Responsabile della geometria del campo di gioco, delle shape e della rotazione runtime.

File noto:
- `js/core/Arena.js`

### Player Layer
Responsabile del comportamento del player, del feel di movimento/sparo e dei feedback immediati del personaggio.

File noto:
- `js/entities/Player.js`

### Enemy Layer
Responsabile del comportamento della onion, della pressione esercitata sul player e dei feedback associati al nemico.

File noto:
- `js/entities/Onion.js`

### Projectile Layer
Responsabile del comportamento dei proiettili e dei relativi feedback.

File noto:
- `js/entities/Bullet.js`

---

## File Map

## `config/levels.json`
### Status
Confirmed

### Role
Fonte dati della progressione livello per livello.

### Known responsibilities
- definizione delle shape dell’arena per livello
- definizione della rotazione dell’arena per livello tramite `arenaRotationSpeed`
- supporto alla progressione organizzata a cicli
- supporto all’incremento di difficoltà quando il ciclo riparte

### Likely responsibilities
- parametri numerici di difficulty scaling
- mapping tra livello e configurazione runtime
- eventuali valori di tuning riusabili dal `LevelManager`

### Typical reasons to edit
- cambiare ordine delle shape
- ritoccare progressione
- cambiare velocità di rotazione
- cambiare tuning per escalation

### Risks when editing
- rompere la leggibilità della progressione
- introdurre spike di difficoltà arbitrari
- creare mismatch con logica letta da `LevelManager.js`

### Primary owner
Gameplay Programmer

### Secondary readers
Game Designer, Orchestrator

---

## `js/core/LevelManager.js`
### Status
Confirmed

### Role
Layer centrale della progressione runtime.

### Known responsibilities
- legge shape e rotazione dal livello
- gestisce progressione per ciclo
- applica la crescita di difficoltà quando il ciclo riparte

### Likely responsibilities
- avanzamento di livello
- sincronizzazione tra livello attuale e runtime
- passaggio dei parametri ai sistemi gameplay
- fallback quando i dati di tuning sono incompleti

### Typical reasons to edit
- correggere errori di progressione
- cambiare logica di escalation
- migliorare fallback o mapping dati-runtime
- allineare la lettura di `levels.json` ai bisogni del gameplay

### Risks when editing
- rompere il pacing globale
- introdurre bug di progressione
- creare incoerenza tra livello mostrato e difficoltà percepita
- alterare più sistemi insieme senza volerlo

### Primary owner
Gameplay Programmer

### Secondary readers
Game Designer, Build Agent, Orchestrator

### Notes for agents
Il Game Designer non dovrebbe proporre modifiche qui in termini di codice, ma solo in termini di regole e progressione.
Il Build Agent deve toccarlo solo con brief chiaro.

---

## `js/core/Arena.js`
### Status
Confirmed

### Role
Gestione runtime della forma del campo di gioco e della sua trasformazione.

### Known responsibilities
- supporto shape multiple
- supporto alla rotazione runtime dell’arena
- preservazione dello stato su resize

### Likely responsibilities
- geometria attiva dell’arena
- aggiornamento stato spaziale
- eventuali collision bounds o limiti di movimento dipendenti dalla shape
- eventuale coordinamento con rendering della shape

### Typical reasons to edit
- correggere problemi di shape
- migliorare gestione della rotazione
- preservare meglio lo stato su resize
- ridurre impatti negativi della rotazione sulla leggibilità

### Risks when editing
- rompere la percezione spaziale
- alterare collisioni o navigazione del player
- introdurre desincronizzazione tra stato logico e visuale
- rendere il campo più gimmick che utile

### Primary owner
Gameplay Programmer

### Secondary readers
Game Designer, Pixel Artist, Build Agent

### Notes for agents
Ogni modifica ad Arena deve essere valutata contro un criterio semplice:
migliora la pressione leggibile o aggiunge solo rumore?

---

## `js/entities/Player.js`
### Status
Confirmed

### Role
Gestione del player, del suo feel e dei feedback diretti.

### Known responsibilities
- feedback di recoil
- feedback di squash
- muzzle flash
- facing persistente già sistemato

### Likely responsibilities
- movimento del player
- gestione input
- orientamento e sparo
- eventuale stato di danno o invulnerabilità
- hook per effetti immediati

### Typical reasons to edit
- migliorare il game feel
- correggere facing, sparo, risposta ai comandi
- ridurre o calibrare effetti che sporcano
- allineare feedback visivo e risposta del gameplay

### Risks when editing
- peggiorare il controllo percepito
- rompere il comportamento dello sparo
- creare mismatch tra input e feedback
- rendere il player appariscente ma meno leggibile

### Primary owner
Gameplay Programmer

### Secondary readers
Game Designer, Pixel Artist, Build Agent

### Notes for agents
Qui si gioca gran parte della soddisfazione percepita.
Piccole modifiche possono avere impatto molto alto.
Non aprire refactor grossi senza necessità reale.

---

## `js/entities/Onion.js`
### Status
Confirmed

### Role
Gestione del nemico principale e della sua pressione sul player.

### Known responsibilities
- Onion V2 come base comportamentale
- dodge leggero dei proiettili
- chase più aggressivo
- wobble
- pulse
- glow
- ring

### Likely responsibilities
- logica AI base del nemico
- ricerca del player
- movimento e pressione spaziale
- hook di hit / death / state feedback
- tuning di aggressività e reattività

### Typical reasons to edit
- aumentare o ridurre pressione
- ripulire comportamenti confusi
- migliorare lettura del nemico
- ridurre effetti non utili
- ritoccare chase e dodge

### Risks when editing
- trasformare il nemico in caos poco leggibile
- rendere il dodge sleale
- rendere l’aggressività rumorosa invece che minacciosa
- sporcare la silhouette o i segnali di stato

### Primary owner
Gameplay Programmer

### Secondary readers
Game Designer, Pixel Artist, Build Agent

### Notes for agents
Questo file è uno dei punti più sensibili del progetto.
Le modifiche devono essere sempre giudicate su:
- pressure
- readability
- fairness
- noise

---

## `js/entities/Bullet.js`
### Status
Confirmed

### Role
Gestione dei proiettili e dei feedback associati al loro movimento/impatto.

### Known responsibilities
- bullet trail
- bounce sparks

### Likely responsibilities
- movimento del proiettile
- collisioni del proiettile
- lifetime del proiettile
- eventuali effetti di impatto o rimbalzo

### Typical reasons to edit
- migliorare chiarezza dei proiettili
- ridurre rumore visivo
- calibrare trail/sparks
- correggere collisioni o comportamento di bounce

### Risks when editing
- peggiorare la leggibilità dei colpi
- far sembrare il gioco più ricco ma meno chiaro
- introdurre rumore nelle scene affollate
- creare costi visivi superiori al valore reale

### Primary owner
Gameplay Programmer

### Secondary readers
Pixel Artist, Game Designer, Build Agent

### Notes for agents
Qualsiasi effetto su bullet deve passare un test semplice:
si capisce meglio il proiettile oppure si vede solo più roba?

---

## Cross-File Dependency Map

### `config/levels.json` -> `js/core/LevelManager.js`
Dipendenza diretta confermata.
`LevelManager` legge configurazione di progressione e la applica al runtime.

### `js/core/LevelManager.js` -> `js/core/Arena.js`
Dipendenza molto probabile.
Il `LevelManager` dovrebbe impostare shape e rotazione dell’arena in base al livello.

### `js/core/LevelManager.js` -> entity tuning
Likely.
La progressione potrebbe influire anche su aggressività, pressione o altri parametri di entity/runtime.

### `js/entities/Player.js` <-> `js/entities/Bullet.js`
Likely.
Lo sparo del player genera o configura bullet/runtime correlato.

### `js/entities/Onion.js` <-> `js/entities/Bullet.js`
Likely.
La onion può reagire ai proiettili, specialmente per dodge o hit feedback.

### `js/core/Arena.js` <-> `Player.js` / `Onion.js` / `Bullet.js`
Likely.
La geometria dell’arena influenza movimento, lettura spaziale e forse collisioni/percorso.

---

## Hotspots
Questi sono i punti della codebase dove piccole modifiche possono avere impatto molto alto.

### Hotspot 1 — `Player.js`
Impatto diretto su game feel e soddisfazione del controllo.

### Hotspot 2 — `Onion.js`
Impatto diretto su pressione, fairness e identità del gioco.

### Hotspot 3 — `LevelManager.js`
Impatto diretto su ritmo, escalation e coerenza della progressione.

### Hotspot 4 — `Arena.js`
Impatto diretto sulla leggibilità spaziale e sul valore reale delle shape.

### Hotspot 5 — `Bullet.js`
Impatto diretto su chiarezza di combattimento e rumore visivo.

---

## Safe Entry Points for Small Patches
Aree che, in linea generale, si prestano meglio a patch incrementali locali:

- tuning di valori in `config/levels.json`
- piccoli aggiustamenti di escalation in `LevelManager.js`
- piccoli aggiustamenti di chase/dodge/feedback in `Onion.js`
- piccoli aggiustamenti di feel in `Player.js`
- riduzione o calibrazione di trail/sparks in `Bullet.js`

## Dangerous Change Areas
Aree dove il rischio di regressione o caos è più alto:

- logica di rotazione arena in `Arena.js`
- logica di transizione livello in `LevelManager.js`
- coupling implicito tra Arena e entity movement/collision
- cambi simultanei a `Onion.js`, `Player.js` e `Bullet.js` senza test intermedi

---

## Agent Usage Guidance

## For ORCHESTRATOR
Usare questa mappa per:
- capire quali skill consultare
- limitare lo scope
- evitare che una patch piccola diventi redesign generale

## For GAME DESIGNER
Usare questa mappa per:
- sapere dove vivono progressione, pressione e loop
- non proporre codice
- formulare richieste che corrispondano a sistemi reali

## For GAMEPLAY PROGRAMMER
Usare questa mappa per:
- identificare rapidamente il perimetro
- scegliere patch locali
- dichiarare dipendenze e rischi

## For PIXEL ARTIST
Usare questa mappa per:
- capire quali sistemi generano feedback visivi
- chiedere hook mirati
- evitare richieste scollegate dal runtime

## For BUILD AGENT
Usare questa mappa per:
- confermare file da toccare
- evitare extra edits
- mantenere patch minime e testabili

---

## Patch Classification Rules
Quando si modifica uno di questi file, classificare sempre la patch come una di queste:

### Tuning Patch
Modifica numeri, timing, intensità, soglie, order di progressione.

### Feedback Patch
Modifica feedback visivi o percettivi già esistenti.

### Behavior Patch
Modifica comportamento runtime di player, onion, bullet, arena o progressione.

### Structural Patch
Modifica struttura o ownership della logica.
Da evitare salvo necessità reale.

---

## Unknowns
Punti ancora non confermati e che non vanno dati per scontati:

- struttura completa del bootstrap runtime
- sistema di rendering esatto
- sistema di collisione esatto
- eventuali altri entity o manager rilevanti
- eventuale HUD dedicato
- eventuale separazione tra visual state e gameplay state
- eventuali helper comuni o utilità condivise
- eventuale scena principale o game loop centrale

Questi punti vanno verificati sul codice reale prima di fare affermazioni forti.

---

## Update Protocol
Aggiornare questo file quando:
- emerge un nuovo file davvero centrale
- si scopre una ownership diversa da quella ipotizzata
- cambia il perimetro del ciclo corrente
- una dipendenza prima solo “Likely” viene confermata
- un hotspot si rivela falso o incompleto

## Final Rule
Usare questa mappa per ridurre il caos, non per giustificare cambi più grandi.
Se un cambiamento non ha perimetro chiaro nella mappa, probabilmente non è ancora pronto per essere implementato.