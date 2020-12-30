# Ricarica Tesla
Script in nodejs per avviare e arrestare da remoto la ricarica di auto Tesla

# Prerequisiti
* Nodejs: https://nodejs.dev/
* Token di accesso e token di refresh per le API Tesla (per ottenerli è possibile usare ad esempio [questo script](https://gist.github.com/eiannone/c70a65226693a3779b97ef06ff418884#file-tesla-token-mjs))
* Identificativo della propria auto (vehicle id). Per ottenerlo è possibile usare ad esempio [questo script](https://gist.github.com/eiannone/90da6cd236bd25d3b708623f0b98d5ae#file-tesla-vehicle-id-mjs).

# Installazione
Copiare il contenuto in una cartella, oppure (con git installato) clonare il repository tramite il comando:
```
git clone https://github.com/eiannone/tesla-ricarica
```

Da riga di comando, posizionarsi nella cartella `tesla-ricarica` ed installare le dipendenze del progetto tramite il comando:
```
npm install
```

Modificare il file `tokens.json` specificando i propri token di accesso e di refresh per le API di Tesla:
```json
{
    "access_token": "qts-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "refresh_token": "35345345bn345345345uihi345345nni5345345mi435345",
    "vehicle_id": "123456789"
}
```

# Uso dello script
Comando per avviare la ricarica:
```
node ricarica.js start
```

Comando per terminare la ricarica:
```
node ricarica.js stop
```
