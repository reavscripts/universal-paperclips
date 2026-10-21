# Universal Paperclips

Versione del gioco con interfaccia moderna, adattamento mobile e supporto per l'installazione come app. HTML, CSS e JavaScript sono già inclusi in `index.html`: il progetto non richiede compilazione, dipendenze o variabili d'ambiente.

## Pubblicazione su GitHub

1. Estrai lo ZIP sul computer e apri la cartella `universal-paperclips`.
2. Vai su https://github.com/new e crea un repository chiamato `universal-paperclips`. Scegli il tuo account personale come proprietario. Puoi usare un repository privato oppure pubblico.
3. Lascia disattivata la creazione automatica di README, .gitignore e licenza: README e .gitignore sono già inclusi.
4. Nel repository vuoto seleziona **uploading an existing file**. Se il repository contiene già file, usa **Add file → Upload files**.
5. Trascina i file CONTENUTI nella cartella, quindi scegli **Commit changes**. Non caricare lo ZIP o la cartella come ulteriore livello: `index.html` deve comparire direttamente nella pagina principale del repository.

## Pubblicazione su Vercel

1. Accedi a https://vercel.com con GitHub e seleziona **Add New → Project** / **New Project**.
2. Collega GitHub se richiesto, concedi l'accesso al repository appena creato e seleziona **Import** accanto al suo nome.
3. Controlla queste impostazioni. Il file `vercel.json` configura già framework, build e cartella di output.

| Impostazione | Valore |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` (radice del repository) |
| Build Command | vuoto; Override attivo se lo imposti dalla schermata |
| Output Directory | `.` |
| Install Command | predefinito |
| Environment Variables | nessuna |

4. Premi **Deploy**, attendi il completamento e apri il dominio di produzione `.vercel.app` assegnato al progetto.

## Salvataggi e installazione

Prima di passare dal file locale al sito, usa **Export save** nel gioco locale; sul sito usa **Import save**. I progressi restano nel browser: non vengono sincronizzati tra dispositivi o domini.

Apri il sito online una prima volta e attendi che l'app segnali la disponibilità offline. Usa **Install app** e segui le indicazioni per il tuo browser. Continua a giocare sullo stesso dominio di produzione per ritrovare i salvataggi.

## Aggiornamenti

Carica e conferma le versioni aggiornate dei file nello stesso repository. I commit sul ramo di produzione, normalmente `main`, avviano una nuova pubblicazione Vercel.

Per gli aggiornamenti dell'app offline, pubblica insieme HTML, manifest, icone e il nuovo `sw.js` fornito con la versione aggiornata. Ogni nuova versione deve avere una diversa identificazione della cache nel service worker; il pacchetto attuale la include già. Chiudi tutte le finestre dell'app e riaprila per attivare un aggiornamento in attesa.

## File principali

- `index.html`: gioco completo.
- `manifest.webmanifest`, `sw.js` e le quattro icone PNG: app installabile e disponibilità offline.
- `vercel.json`: impostazioni di pubblicazione e cache del service worker.

Documentazione: [GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [Vercel: configurazione build](https://vercel.com/docs/builds/configure-a-build), [Vercel: integrazione Git](https://vercel.com/docs/git).
