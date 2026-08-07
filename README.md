# Social analytics app

Tutto il codice è già scritto e collega Instagram, TikTok e YouTube allo stesso
database, salvando ogni giorno uno snapshot (follower, view, performance dei
video) per costruire lo storico.

**Il codice non serve che tu lo capisca.** Ci sono solo alcuni passaggi che
puoi fare solo tu, perché richiedono il tuo account e la tua identità — nessun
programma può farli al posto tuo. Sono elencati qui sotto, uno per uno.

## Cosa devi fare tu (una volta sola, per piattaforma)

### YouTube — 5 minuti
1. Vai su console.cloud.google.com, crea un progetto (basta dargli un nome).
2. Cerca "YouTube Data API v3" e "YouTube Analytics API" e clicca "Abilita" su entrambe.
3. Vai su "Credenziali" → "Crea credenziali" → "ID client OAuth" → scegli "Applicazione web".
4. Copia le due stringhe che ti dà ("Client ID" e "Client secret") e incollale
   nel file `.env` (righe `YT_CLIENT_ID` e `YT_CLIENT_SECRET`).

### Instagram — 15-20 minuti (richiede che il tuo profilo sia già Business o Creator)
1. Se il tuo profilo Instagram non è già "Business" o "Creator": nell'app Instagram
   vai su Impostazioni → Account → passa a un account professionale.
2. Vai su developers.facebook.com, crea un'app di tipo "Business".
3. Aggiungi il prodotto "Facebook Login" e collega la tua Pagina Facebook
   (deve essere collegata al tuo profilo Instagram — se non l'hai già fatto,
   Instagram te lo chiede quando passi ad account professionale).
4. Copia "ID app" e "Chiave segreta app" nel file `.env` (`IG_APP_ID`, `IG_APP_SECRET`).

### TikTok — 15-20 minuti
1. Vai su developers.tiktok.com, registrati come sviluppatore.
2. Crea una nuova app, aggiungi il prodotto "Login Kit".
3. Copia "Client Key" e "Client Secret" nel file `.env` (`TT_CLIENT_KEY`, `TT_CLIENT_SECRET`).

*(Per ora funziona subito con il tuo account personale in modalità test. Se in
futuro vorrai che l'app funzioni anche per altri account/persone, TikTok
richiede una revisione aggiuntiva — ma per tracciare i tuoi dati non serve.)*

## Poi (questi comandi te li faccio girare io se lavoriamo insieme in Claude Code)

```bash
npm install        # installa le dipendenze
npm run migrate     # crea le tabelle nel database
npm start            # avvia il server
```

A quel punto apri nel browser, uno alla volta:
- `http://localhost:3000/auth/youtube/start`
- `http://localhost:3000/auth/instagram/start`
- `http://localhost:3000/auth/tiktok/start`

Per ognuno ti verrà chiesto di fare login e "autorizza" — è l'unico click
manuale che serve, e va fatto una volta sola per account.

Da lì in poi tutto è automatico: ogni notte alle 03:00 l'app salva da sola un
nuovo snapshot dei tuoi dati.

## Cosa manca ancora

- **Un posto dove far girare il server 24/7** (oggi gira solo su un computer
  acceso). Serve un hosting — te ne consiglio uno adatto quando arriviamo lì.
- **Un database Postgres** raggiungibile da internet (posso proporti un'opzione
  gratuita quando siamo pronti).
- **La dashboard** che mostra i grafici — è il prossimo pezzo da costruire.

## Struttura del progetto (solo per riferimento)

```
src/
  server.js              avvia il server e lo scheduler giornaliero
  db/schema.sql            struttura delle tabelle
  routes/auth.js           collegamento (OAuth) di YouTube, Instagram, TikTok
  routes/youtube.js        lettura dati da YouTube
  routes/instagram.js      lettura dati da Instagram
  routes/tiktok.js         lettura dati da TikTok
  jobs/dailySnapshot.js     salva lo snapshot giornaliero per tutte le piattaforme
```
