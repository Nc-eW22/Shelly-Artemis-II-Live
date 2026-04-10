// ⚡ SPARK_LABS: Artemis II Mission Control
// Target: Shelly Gen3 / Gen4
// Validated for SPARK_LABS Primer 1 v1.0.1

// 🥀 One red rose per crew member. One white rose for those we lost.
// ✨ One stargazer lily for everyone watching from Earth.
// Tradition upheld at Houston since STS-26, 1988.

const VERSION = '1.0.3';

const CONFIG = {
    orbit_url:  'https://artemis.cdnspace.ca/api/orbit',
    arow_url:   'https://artemis.cdnspace.ca/api/arow',
    dsn_url:    'https://artemis.cdnspace.ca/api/dsn',
    poll_ms:    60000,
    stale_multiplier: 3,
    debug:      true
};

let HANDLES = {
    stateEnum: null, earthDist: null, velocity: null, gForce: null,
    thrusters: null, roll: null, pitch: null, solarWings: null, status: null
};

let DATA = {
    orbitFails: 0, arowFails: 0, dsnFails: 0,
    metMs: 0, mode: '?', dish: '?', rtlt: '?'
};

function safeParse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

function writeVC(handle, value) {
    if (handle !== null && value !== null && value !== undefined) {
        handle.setValue(value);
    }
}

function formatNum(val, dec) {
    if (typeof val !== 'number') return val;
    if (dec === 0) return Math.round(val);
    let f = 1;
    let i = 0;
    while (i < dec) { f = f * 10; i++; }
    return Math.round(val * f) / f;
}

function cacheHandles() {
    HANDLES.stateEnum  = Virtual.getHandle('enum:200');
    HANDLES.earthDist  = Virtual.getHandle('number:200');
    HANDLES.velocity   = Virtual.getHandle('number:201');
    HANDLES.gForce     = Virtual.getHandle('number:202');
    HANDLES.thrusters  = Virtual.getHandle('number:203');
    HANDLES.roll       = Virtual.getHandle('number:204');
    HANDLES.pitch      = Virtual.getHandle('number:205');
    HANDLES.solarWings = Virtual.getHandle('text:200');
    HANDLES.status     = Virtual.getHandle('text:201');
    if (CONFIG.debug) console.log('[Artemis] VC Handles Cached');
}

function formatMET(ms) {
    if (!ms || ms <= 0) return '0d 00h 00m';
    let totalMin = ms / 60000;
    let totalHr  = totalMin / 60;
    let days   = Math.floor(totalHr / 24);
    let remHr  = Math.floor(totalHr - (days * 24));
    let remMin = Math.floor(totalMin - (days * 24 * 60) - (remHr * 60));
    let hrStr  = remHr < 10 ? '0' + remHr : String(remHr);
    let minStr = remMin < 10 ? '0' + remMin : String(remMin);
    return String(days) + 'd ' + hrStr + 'h ' + minStr + 'm';
}

function pickActiveDish(dishes) {
    if (!dishes || dishes.length === 0) return null;
    let i = 0;
    while (i < dishes.length) {
        if (dishes[i].downlinkActive === true) return dishes[i];
        i++;
    }
    return dishes[0];
}

function evalHealth() {
    let maxFails = Math.max(DATA.orbitFails, DATA.arowFails, DATA.dsnFails);
    if (maxFails === 0) return 'Nominal';
    if (maxFails >= (CONFIG.stale_multiplier * 3)) return 'LOS';
    if (maxFails >= CONFIG.stale_multiplier) return 'Stale';
    return 'Error';
}

function fetchOrbit() {
    Shelly.call('HTTP.GET', { url: CONFIG.orbit_url, timeout: 10 }, function(res, err) {
        if (err !== 0 || !res || res.code !== 200) {
            DATA.orbitFails++; assembleStatus(); return;
        }
        let body = safeParse(res.body);
        if (body) {
            DATA.orbitFails = 0;
            if (body.metMs !== undefined && body.metMs !== null) {
                DATA.metMs = body.metMs;
            }
            if (typeof body.earthDistKm === 'number') {
                writeVC(HANDLES.earthDist, formatNum(body.earthDistKm, 0));
            }
            if (typeof body.speedKmH === 'number') {
                writeVC(HANDLES.velocity, formatNum(body.speedKmH, 0));
            }
            if (typeof body.gForce === 'number') {
                writeVC(HANDLES.gForce, formatNum(body.gForce, 5));
            }
        }
        assembleStatus();
    });
}

function fetchArow() {
    Shelly.call('HTTP.GET', { url: CONFIG.arow_url, timeout: 10 }, function(res, err) {
        if (err !== 0 || !res || res.code !== 200) {
            DATA.arowFails++; assembleStatus(); return;
        }
        let body = safeParse(res.body);
        if (body) {
            DATA.arowFails = 0;
            if (body.spacecraftMode) { DATA.mode = body.spacecraftMode; }

            if (body.eulerDeg) {
                if (typeof body.eulerDeg.roll === 'number') {
                    writeVC(HANDLES.roll, formatNum(body.eulerDeg.roll, 1));
                }
                if (typeof body.eulerDeg.pitch === 'number') {
                    writeVC(HANDLES.pitch, formatNum(body.eulerDeg.pitch, 1));
                }
            }

            // ── THRUSTER FIX: rcsThrusters.thrusters is an OBJECT, not an array
            let activeThrusters = 0;
            if (body.rcsThrusters && body.rcsThrusters.thrusters) {
                let t = body.rcsThrusters.thrusters;
                for (let key in t) {
                    if (t[key] === true) { activeThrusters++; }
                }
            }
            writeVC(HANDLES.thrusters, activeThrusters);

            if (body.sawAngles) {
                let s1 = Math.round(body.sawAngles.saw1 || 0);
                let s2 = Math.round(body.sawAngles.saw2 || 0);
                let s3 = Math.round(body.sawAngles.saw3 || 0);
                let s4 = Math.round(body.sawAngles.saw4 || 0);
                let swText = '1:' + s1 + '° 2:' + s2 + '° 3:' + s3 + '° 4:' + s4 + '°';
                writeVC(HANDLES.solarWings, swText);
            }
        }
        assembleStatus();
    });
}

function fetchDsn() {
    Shelly.call('HTTP.GET', { url: CONFIG.dsn_url, timeout: 10 }, function(res, err) {
        if (err !== 0 || !res || res.code !== 200) {
            DATA.dsnFails++; assembleStatus(); return;
        }
        let body = safeParse(res.body);
        if (body && body.dishes) {
            DATA.dsnFails = 0;
            let active = pickActiveDish(body.dishes);
            if (active) {
                let sn = active.stationName || '?';
                let dn = active.dish || '?';
                DATA.dish = sn + ' ' + dn;
                if (active.rtltSeconds !== undefined && active.rtltSeconds !== null) {
                    DATA.rtlt = active.rtltSeconds;
                }
            }
        }
        assembleStatus();
    });
}

function assembleStatus() {
    writeVC(HANDLES.stateEnum, evalHealth());
    let metStr = formatMET(DATA.metMs);
    let txt = '🥀✨ MET ' + metStr + ' | Mode ' + DATA.mode + ' | ' + DATA.dish + ' | RTLT ' + DATA.rtlt + 's';
    writeVC(HANDLES.status, txt);
}

function tick() {
    if (CONFIG.debug) console.log('[Artemis] Fetching Telemetry...');
    fetchOrbit();
    fetchArow();
    fetchDsn();
}

// ── SLOW LAUNCH COUNTDOWN ─────────────────────────────────────────
let cdN = 10;
function countdown() {
    if (cdN > 0) {
        console.log('[HOUSTON] T-minus ' + cdN + '...');
        cdN--;
        Timer.set(1000, false, countdown);
    } else {
        console.log('[HOUSTON] LIFTOFF — telemetry stream live 🚀');
        console.log('🥀✨ Roses on the console. Stargazer lily for the dreamers.');
        tick();
        Timer.set(CONFIG.poll_ms, true, tick);
    }
}

function init() {
    console.log('=== SPARK_LABS · ARTEMIS II LIVE ===');
    console.log('Mission Control v' + VERSION);
    cacheHandles();
    writeVC(HANDLES.stateEnum, 'Boot');
    writeVC(HANDLES.status, 'BOOTING...');
    writeVC(HANDLES.solarWings, 'BOOTING...');
    console.log('[HOUSTON] Telemetry stack armed. Beginning launch sequence.');
    countdown();
}

init();
