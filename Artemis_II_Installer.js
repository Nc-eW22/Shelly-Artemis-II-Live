// SPARK_LABS: Artemis II Live — Mission Control Installer v1.0.2
const WIPE = true;
const DEBUG = true;
const ICONS = {
    state:'https://img.icons8.com/?size=100&id=48258&format=png&color=000000',
    earth:'https://img.icons8.com/?size=100&id=5QPiJN0glcYm&format=png&color=000000',
    velocity:'https://img.icons8.com/?size=100&id=48208&format=png&color=000000',
    gforce:'https://img.icons8.com/?size=100&id=87843&format=png&color=000000',
    thrusters:'https://img.icons8.com/?size=100&id=48328&format=png&color=000000',
    roll:'https://img.icons8.com/?size=100&id=49469&format=png&color=000000',
    pitch:'https://img.icons8.com/?size=100&id=69463&format=png&color=000000',
    solar:'https://img.icons8.com/?size=100&id=48128&format=png&color=000000',
    status:'https://img.icons8.com/?size=100&id=43660&format=png&color=000000'
};
const STEP_MS = 700;
const STATE_OPTS = ['Boot','Nominal','Maneuver','Stale','LOS','Error','critical alert'];
const STATE_TITLES = {'Boot':'⏳️','Nominal':'🟢','Maneuver':'🚀','Stale':'🟠','LOS':'🔇','Error':'⚠️','critical alert':'🚨'};
let TASKS = [];
let IDX = 0;
function log(m) { if (DEBUG) console.log('[HOUSTON] ' + m); }
function addV(type, id, cfg) { TASKS.push({ op:'add', method:'Virtual.Add', params:{ type:type, id:id, config:cfg } }); }
function delV(key) {
    let parts = key.split(':');
    let cap = parts[0].charAt(0).toUpperCase() + parts[0].substring(1);
    TASKS.push({ op:'del', method:cap + '.Delete', params:{ id:parseInt(parts[1]) } });
}
function buildCreateTasks() {
    // Phase 1: skeletons — minimal Virtual.Add calls
    addV('enum',   200, { name:'Mission state', options:STATE_OPTS, default_value:'Boot' });
    addV('text',   201, { name:'Mission Status', default_value:'BOOTING' });
    addV('number', 200, { name:'Distance from earth ', min:0, max:450000, default_value:0 });
    addV('number', 201, { name:'velocity', min:0, max:45000, default_value:0 });
    addV('number', 202, { name:'G Force', min:0, max:5, default_value:0 });
    addV('number', 203, { name:'Thrusters', min:0, max:14, default_value:0 });
    addV('number', 204, { name:'Roll', min:-90, max:90, default_value:0 });
    addV('number', 205, { name:'Pitch', min:-180, max:180, default_value:0 });
    addV('text',   200, { name:'Solar Wings', default_value:'BOOTING' });
    addV('group',  200, { name:'Artemis II LIVE' });

    // Phase 2: full config per VC (type-prefixed SetConfig)
    function sc(method, id, config) { TASKS.push({op:'cfg', method:method, params:{id:id, config:config}}); }
    sc('Enum.SetConfig',   200, { meta:{cloud:['log'], ui:{icon:ICONS.state, view:'label', titles:STATE_TITLES, webIcon:0}} });
    sc('Text.SetConfig',   201, { max_len:69, meta:{cloud:['log'], ui:{icon:ICONS.status, view:'label'}} });
    sc('Number.SetConfig', 200, { meta:{cloud:['log','measurement'], ui:{view:'progressbar', unit:'Km', step:1, icon:ICONS.earth, webIcon:9}} });
    sc('Number.SetConfig', 201, { meta:{cloud:['log','measurement'], ui:{view:'label', unit:'km/h', step:1, icon:ICONS.velocity, webIcon:0}} });
    sc('Number.SetConfig', 202, { meta:{cloud:['log','measurement'], ui:{view:'label', unit:'g', step:0.0001, icon:ICONS.gforce, webIcon:10}} });
    sc('Number.SetConfig', 203, { meta:{ui:{view:'label', unit:'🔊', step:1, icon:ICONS.thrusters}} });
    sc('Number.SetConfig', 204, { meta:{cloud:['log','measurement'], ui:{icon:ICONS.roll, view:'progressbar', step:1, unit:'°', webIcon:17}} });
    sc('Number.SetConfig', 205, { meta:{cloud:['log','measurement'], ui:{icon:ICONS.pitch, view:'progressbar', step:1, unit:'°', webIcon:17}} });
    sc('Text.SetConfig',   200, { max_len:55, meta:{cloud:['log'], ui:{icon:ICONS.solar, view:'label', webIcon:0}} });
    sc('Group.SetConfig',  200, { meta:{ui:{icon:null}} });

    // Phase 3: populate group members (locked display order)
    TASKS.push({op:'set', method:'Group.Set', params:{id:200, value:['enum:200','text:201','number:200','number:201','number:202','number:203','number:204','number:205','text:200']}});
}
function preflight(cb) {
    Shelly.call('Shelly.GetComponents',{dynamic_only:true},function(r,e,em){
        if (e !== 0 || !r || !r.components) { log('Telemetry link lost err='+e+' — proceeding blind'); cb(true,[]); return; }
        let found = [];
        let i = 0;
        while (i < r.components.length) {
            let k = r.components[i].key;
            if (k && (k.indexOf('enum:')===0 || k.indexOf('number:')===0 || k.indexOf('text:')===0 || k.indexOf('group:')===0 || k.indexOf('boolean:')===0)) { found.push(k); }
            i++;
        }
        if (found.length === 0) { console.log('[HOUSTON] Launch pad clear. Cleared for assembly.'); cb(true,[]); return; }
        console.log('[HOUSTON] Pre-launch scan found ' + found.length + ' legacy component(s):');
        let j = 0;
        while (j < found.length) { console.log('         - ' + found[j]); j++; }
        if (WIPE) { console.log('[HOUSTON] WIPE=true. Clearing ALL for fresh stack.'); cb(true,found); }
        else {
            console.log('');
            console.log('!!! MISSION ABORT !!!');
            console.log('[HOUSTON] Legacy hardware on the pad. Set WIPE=true or remove manually.');
            Timer.set(3000,false,function(){Shelly.call('Script.Stop',{id:Shelly.getCurrentScriptId()});});
            cb(false,found);
        }
    });
}
function runWipePhase(found, done) {
    if (found.length === 0) { done(); return; }
    log('Pad clearance phase: '+found.length+' component(s) to remove');
    let wi = 0;
    function nextDel() {
        if (wi >= found.length) {
            log('Pad clearance complete. Settling 2s before re-verification...');
            Timer.set(2000, false, function() { verifyClean(done); });
            return;
        }
        let key = found[wi];
        wi++;
        log('[Sweep '+wi+'/'+found.length+'] Virtual.Delete '+key);
        Shelly.call('Virtual.Delete', {key:key}, function(r,e,em){
            if (e !== 0) log('  ANOMALY: Virtual.Delete '+key+' err='+e+' '+(em||''));
            Timer.set(1000, false, nextDel);
        });
    }
    nextDel();
}

let SWEEP_ATTEMPTS = 0;
function verifyClean(done) {
    SWEEP_ATTEMPTS++;
    log('Re-scanning launch pad...');
    Shelly.call('Shelly.GetComponents',{dynamic_only:true},function(r,e,em){
        let remaining = [];
        if (r && r.components) {
            let i = 0;
            while (i < r.components.length) {
                let k = r.components[i].key;
                if (k && (k.indexOf('enum:')===0 || k.indexOf('number:')===0 || k.indexOf('text:')===0 || k.indexOf('group:')===0 || k.indexOf('boolean:')===0)) { remaining.push(k); }
                i++;
            }
        }
        if (remaining.length === 0) {
            console.log('[HOUSTON] Launch pad swept clean. Confirmed clear for assembly.');
            done();
        } else {
            console.log('[HOUSTON] WARNING: '+remaining.length+' component(s) still on pad after sweep:');
            let j = 0;
            while (j < remaining.length) { console.log('         - '+remaining[j]); j++; }
            if (SWEEP_ATTEMPTS >= 3) {
                console.log('[HOUSTON] MISSION SCRUB: 3 sweeps failed. Firmware rejecting deletes.');
                console.log('[HOUSTON] Remove remaining components manually via web UI and retry.');
                Timer.set(3000,false,function(){Shelly.call('Script.Stop',{id:Shelly.getCurrentScriptId()});});
                return;
            }
            console.log('[HOUSTON] Retrying sweep in 2s... (attempt '+(SWEEP_ATTEMPTS+1)+'/3)');
            Timer.set(2000, false, function() { runWipePhase(remaining, done); });
        }
    });
}

function runNext() {
    if (IDX >= TASKS.length) { countdown(5); return; }
    let t = TASKS[IDX];
    IDX++;
    log('[T+'+IDX+'/'+TASKS.length+'] '+t.method+' '+(t.params.type||'')+' '+(t.params.id||''));
    Shelly.call(t.method,t.params,function(r,e,em){
        if (e !== 0 && t.op !== 'del') log('  ANOMALY: '+t.method+' err='+e+' '+(em||''));
        Timer.set(STEP_MS,false,runNext);
    });
}
function countdown(n) {
    if (n <= 0) { console.log(''); console.log('[HOUSTON] 🚀 LIFTOFF! Houston, we have liftoff of Artemis II Live!'); finish(); return; }
    console.log('[HOUSTON] T-minus '+n+'...');
    Timer.set(1000,false,function(){countdown(n-1);});
}
function finish() {
    let info = Shelly.getDeviceInfo();
    let wifi = Shelly.getComponentStatus('wifi');
    let ip = (wifi && wifi.sta_ip) ? wifi.sta_ip : '?';
    let model = (info && info.model) ? info.model : '?';
    let id = (info && info.id) ? info.id : '?';
    console.log('');
    console.log('=== ARTEMIS II LIVE — STACK COMPLETE ===');
    console.log('Vehicle: '+model+' | ID: '+id+' | IP: '+ip);
    console.log('');
    console.log('FLIGHT CREW CHECKLIST:');
    console.log('1. Open Shelly Smart Control');
    console.log('2. Each number VC: edit > enable event logs > Statistics: measurements');
    console.log('3. Group > Extract as virtual device (premium)');
    console.log('4. Upload mission patch image to group');
    console.log('5. Verify webIcon on every component');
    console.log('6. Upload and start Artemis_II_Live.js — begin telemetry');
    console.log('[HOUSTON] Ground systems nominal. Signing off in 5s. Godspeed.');
    Timer.set(5000,false,function(){Shelly.call('Script.Stop',{id:Shelly.getCurrentScriptId()});});
}
function init() {
    console.log('');
    console.log('=== SPARK_LABS · ARTEMIS II LIVE ===');
    console.log('Mission Control Installer v1.0.2');
    console.log('[HOUSTON] Pre-flight initiated | WIPE='+WIPE);
    preflight(function(ok,found){
        if (!ok) return;
        runWipePhase(found, function() {
            buildCreateTasks();
            log('Flight manifest: '+TASKS.length+' tasks | step '+STEP_MS+'ms');
            log('Beginning stack assembly...');
            Timer.set(1000,false,runNext);
        });
    });
}
init();