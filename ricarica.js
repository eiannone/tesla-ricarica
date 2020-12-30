import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from "url";
import { TeslaApi, ApiError } from '@eiannone/tesla-api';


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
    console.log(msg);
}

const cmd = (process.argv.length > 2)? process.argv[2] : null;
if (cmd != 'start' && cmd != 'stop') {
    log("Passare il parametro 'start' o 'stop' da riga di comando.", 'error');
    process.exit(-1);
}

const configPath = dirname(fileURLToPath(import.meta.url)) + '/tokens.json';
const conf = JSON.parse(fs.readFileSync(configPath));
const api = new TeslaApi(conf.access_token, conf.vehicle_id, conf.refresh_token);
api.onTokenRefreh((access_token, refresh_token) => {
    conf.access_token = access_token;
    conf.refresh_token = refresh_token;
    log('Nuovi token ottenuti. Aggiornamento file ' + configPath + '...', 'info');
    fs.writeFileSync(configPath, JSON.stringify(conf, null, 2));
});

try {
    // Verifica se il veicolo è online
    let v = await api.getVehicle();
    if (typeof v == "undefined" || typeof v.state == "undefined") 
        throw "Impossibile rilevare lo stato dell'auto.";
    if (v.state == 'offline')
        throw "Auto in stato offline, impossibile connettersi.";
    if (v.state == 'service')
        throw "Auto in assistenza, impossibile connettersi.";
    if (v.state != "online" && v.state != "asleep")
        throw "Auto in stato sconosciuto: '" + v.state + "'";
    // Se il veicolo è in sleep, tenta di svegliarlo
    let tentativi = 0;
    while(v.state == "asleep") {
        if (tentativi == 0)
            log("Auto in stato 'asleep'. Riattivazione in corso...");
        else if (tentativi == 10) // 30 secondi
            throw "Timeout tentativi di riattivazione."; 
        else {
            log("Tentativo " + (tentativi + 1) + "...");
            await sleep(3000);
        }
        v = await api.wakeUp();
        tentativi++;
    }
    // Veicolo on-line, verifica se il cavo di ricarica è collegato
    const r = await api.getChargeState();        
    if (!r.charge_port_door_open) throw "Nessun cavo di ricarica collegato.";
    if (r.conn_charge_cable == '<invalid>') throw "Nessun cavo valido di ricarica collegato.";
        // Possibili spie:
    // - battery_level: 42
    // - charge_current_request: 10
    // - charge_enable_request: false/true (true quando in ricarica)
    // - charge_limit_soc: 100
    // - charge_port_door_open: false/true
    // - charge_port_latch: 'Engaged'
    // - charge_rate: 0
    // - charger_actual_current: 0,
    // - charger_phases: null/1,
    // - charger_power: 0/2 (kW potenza)
    // - charger_voltage: 2
    // - charging_state: 'Disconnected'/'Stopped'/'Charging'
    // - conn_charge_cable: '<invalid>','IEC'
    // - managed_charging_active: false
    // - user_charge_enable_request: null
    log("Cavo di ricarica collegato: " + r.conn_charge_cable);
    log("Stato ricarica: " + r.charging_state);
    if (r.charging_state == 'Charging') {
        log("Ricarica in corso a " + r.charger_actual_current + " A (" + r.charger_power + " kW)");
    }
    else {
        log("Corrente di ricarica impostata: " + r.charge_current_request + " A");
    }
    // console.log(r);

    let res;
    if (cmd == 'start') {
        log("Avvio ricarica...");
        const res = await api.command('charge_start');
        if (!res.result) throw "Impossibile avviare ricarica: " + res.reason;
    }
    else if (cmd == 'stop') {
        log("Arresto ricarica...");
        const res = await api.command("charge_stop");
        if (!res.result) throw "Impossibile arrestare ricarica: " + res.reason;
    }    
    log("OK");
    process.exit(0);
}
catch(err) {
    let message;
    if (err instanceof ApiError) {
        switch(err.reason) {
            case ApiError.TIMEOUT:
                message = "Richiesta in timeout.";
                break;
            case ApiError.UNAVAILABLE:
                message = "Veicolo non disponibile.";
                break;
            case ApiError.IN_SERVICE:
                message = "Veicolo in assistenza.";
                break;
            default:
                message = "ApiError [" + err.reason + "]: " + err.message;
        }
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    else {
        message = err;
    }
    log(message, 'error');
    process.exit(-1);
}