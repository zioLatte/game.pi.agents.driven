# PiChan / PI.Onion — GAME_VISION

## High Concept
PiChan / PI.Onion è un arcade 2D retrò anni '90 costruito attorno a un loop rapido, leggibile e reattivo.
Il gioco deve dare pressione immediata, controllo preciso e una progressione percepibile, senza diventare caotico o sporco.

Non deve sembrare un prototipo pieno di idee.
Deve sembrare un gioco piccolo ma deciso.

## Core Promise
Il gioco deve far sentire il player dentro un’arena viva e ostile, dove:
- ogni movimento conta
- ogni errore è leggibile
- ogni miglioramento si percepisce
- ogni level up cambia davvero la lettura del campo
- il feeling resta arcade, non simulativo

## Pillars
### Readability first
Il player deve capire rapidamente:
- dove si trova il pericolo
- dove si trova spazio utile
- come si stanno muovendo i nemici
- cosa sta facendo il proprio personaggio
- quando la difficoltà sta cambiando

Ogni effetto, animazione o variazione di arena deve aiutare questa lettura o sparire.

### Tight arcade feel
Il gioco deve risultare:
- secco
- reattivo
- immediato
- soddisfacente nei colpi, nel movimento e nella sopravvivenza

Il feel deve venire prima del virtuosismo tecnico.

### Escalation with clarity
La difficoltà deve crescere in modo percepibile ma non arbitrario.
Il player deve sentire che il gioco si fa più cattivo, non più confuso.

L’aumento di pressione deve derivare da:
- comportamento dei nemici
- shape dell’arena
- rotazione eventuale dell’arena
- densità e ritmo
- riduzione del margine di errore

Non da rumore visivo gratuito.

### Small scope, strong identity
Il progetto deve rimanere piccolo e controllato.
Meglio poche idee forti ben eseguite che molte idee mezze vive.

L’identità del gioco deve emergere da:
- onion aggressive e leggibili
- shape che cambiano la geometria della sopravvivenza
- feedback juicy misurati
- pressione arcade costante
- ritmo chiaro del loop

## Intended Player Experience
Nel primo minuto il player dovrebbe percepire:

- controllo immediato del personaggio
- minaccia concreta ma comprensibile
- soddisfazione nel muoversi e sparare
- crescita della tensione
- differenza tra una situazione facile e una più cattiva
- curiosità per la progressione successiva

Nel medio periodo il player dovrebbe percepire:

- che le shape cambiano davvero il gioco
- che Onion V2 crea pressione reale
- che il gioco richiede adattamento e non solo riflessi
- che gli effetti visivi supportano il gioco invece di distrarlo

## What the Game Is
Il gioco è:
- un arcade 2D retrò
- centrato sul game feel
- centrato sulla leggibilità
- centrato sulla progressione breve ma intensa
- orientato a patch iterative e tuning severo

## What the Game Is Not
Il gioco non è:
- un bullet hell estremo
- un sandbox
- una tech demo di effetti
- un esercizio di stile fine a sé stesso
- un contenitore di feature scollegate
- un progetto da espandere senza controllo

## Current Creative Direction
La direzione attuale è:
- estetica retrò anni '90
- energia arcade
- onion più aggressive e più vive
- arena come parte attiva della difficoltà
- shape e rotazione come variazioni strutturali del campo
- effetti juicy presenti, ma da tenere sotto controllo

## Gameplay Identity
Il cuore del gioco sta nell’interazione tra:
- mobilità del player
- pressione delle onion
- gestione dello spazio
- trasformazione dell’arena
- progressione dei livelli

Il gioco funziona se queste cinque forze restano leggibili e in tensione tra loro.

## Design Principles
Ogni decisione futura dovrebbe essere valutata contro questi principi:

### Keep
Tenere ciò che:
- aumenta la chiarezza
- aumenta la soddisfazione del controllo
- rende i nemici più leggibili ma più minacciosi
- rende la progressione percepibile
- migliora il ritmo

### Cut
Tagliare ciò che:
- aggiunge rumore
- rende difficile leggere collisioni e pericoli
- complica senza aggiungere pressione interessante
- richiede sistemi grossi per un guadagno minimo
- sembra “juicy” ma peggiora il gioco

### Defer
Rimandare ciò che:
- non serve al primo minuto di esperienza
- non aiuta il core loop
- non è necessario per validare il gioco
- ha costo tecnico o visivo troppo alto rispetto al valore immediato

## Success Criteria
Il gioco sta andando nella direzione giusta se:

- il player capisce rapidamente cosa succede
- il movimento del player è piacevole da usare
- Onion V2 genera pressione senza risultare sporca
- le shape cambiano la partita in modo percepibile
- la rotazione dell’arena, se presente, aggiunge tensione senza distruggere la lettura
- gli effetti visivi aumentano impatto e non confusione
- il primo minuto invoglia a fare un’altra run

## Failure Modes
Il gioco sta andando nella direzione sbagliata se:

- il player non legge bene il pericolo
- l’arena diventa più gimmick che valore
- la difficoltà cresce ma il motivo non è chiaro
- i feedback visivi si accavallano
- Onion V2 sembra solo più rumorosa invece che più intelligente o cattiva
- il codice cresce più del valore percepito del gameplay

## Scope Guardrails
Per preservare il progetto, evitare:
- macro-feature non validate
- refactor grandi senza necessità
- asset work pesante prima di capire cosa serve davvero
- redesign completo del loop
- sistemi che non migliorano immediatamente leggibilità, feel o progressione

## Shared Language for Agents
Quando gli agenti discutono il gioco, devono usare queste etichette:

- `Readability`
- `Pressure`
- `Game Feel`
- `Progression`
- `Noise`
- `Risk`
- `Out of Scope`

Questo serve a evitare discussioni vaghe.

## Current Strategic Goal
Nel breve termine, il gioco deve passare da:
“prototipo con elementi promettenti”
a:
“arcade piccolo ma con identità, tensione e chiarezza”

## Final Rule
Se una scelta rende il gioco più spettacolare ma meno leggibile, va rifiutata.
Se una scelta rende il gioco più semplice ma più forte, va considerata seriamente.