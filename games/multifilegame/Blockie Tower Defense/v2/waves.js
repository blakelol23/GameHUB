// ============================================================
//  WAVES.JS  -  Blockie Tower Defense V2
//  30 hand-crafted waves + procedural infinite mode
// ============================================================

// W1-W30 templates:  [{type, count, interval}]
// interval = ms between spawns in this group
const WAVE_TEMPLATES = [
    /* W1  */ [{type:'grunt',  count:8,  interval:1300}],
    /* W2  */ [{type:'grunt',  count:10, interval:1200},{type:'scout',  count:3, interval:900}],
    /* W3  */ [{type:'grunt',  count:8,  interval:1100},{type:'scout',  count:6, interval:800}],
    /* W4  */ [{type:'grunt',  count:6,  interval:1000},{type:'brute',  count:3, interval:1400}],
    /* W5  */ [{type:'scout',  count:7,  interval:750}, {type:'flyer',  count:4, interval:1000}],
    /* W6  */ [{type:'grunt',  count:8,  interval:900}, {type:'brute',  count:4, interval:1200},{type:'scout',count:5,interval:750}],
    /* W7  */ [{type:'shade',  count:6,  interval:950}, {type:'grunt',  count:8, interval:900}],
    /* W8  */ [{type:'swarm',  count:18, interval:380}, {type:'brute',  count:3, interval:1400}],
    /* W9  */ [{type:'flyer',  count:7,  interval:750}, {type:'brute',  count:4, interval:1150},{type:'scout',count:5,interval:700}],
    /* W10 */ [{type:'grunt',  count:10, interval:700}, {type:'overlord',count:1,interval:0}],

    /* W11 */ [{type:'scout',  count:9,  interval:650}, {type:'shade',  count:7, interval:900},{type:'brute',count:4,interval:1000}],
    /* W12 */ [{type:'swarm',  count:22, interval:330}, {type:'juggernaut',count:2,interval:1600}],
    /* W13 */ [{type:'flyer',  count:9,  interval:700}, {type:'shade',  count:8, interval:700}],
    /* W14 */ [{type:'brute',  count:8,  interval:950}, {type:'scout',  count:10,interval:600}],
    /* W15 */ [{type:'overlord',count:2, interval:4000},{type:'swarm',  count:14,interval:380}],
    /* W16 */ [{type:'juggernaut',count:4,interval:1300},{type:'brute', count:8, interval:900},{type:'shade',count:6,interval:850}],
    /* W17 */ [{type:'swarm',  count:28, interval:280}, {type:'flyer',  count:9, interval:650}],
    /* W18 */ [{type:'phantom',count:5,  interval:950}, {type:'shade',  count:8, interval:800},{type:'flyer',count:7,interval:700}],
    /* W19 */ [{type:'overlord',count:2, interval:3500},{type:'phantom',count:6, interval:900}],
    /* W20 */ [{type:'grunt',  count:8,  interval:700}, {type:'swarm',  count:15,interval:320},{type:'titan',count:1,interval:0}],

    /* W21 */ [{type:'phantom',count:8,  interval:850}, {type:'juggernaut',count:3,interval:1400}],
    /* W22 */ [{type:'swarm',  count:30, interval:260}, {type:'brute',  count:10,interval:800}],
    /* W23 */ [{type:'shade',  count:10, interval:750}, {type:'phantom',count:7, interval:850},{type:'flyer',count:8,interval:700}],
    /* W24 */ [{type:'juggernaut',count:5,interval:1200},{type:'overlord',count:2,interval:3000},{type:'scout',count:10,interval:600}],
    /* W25 */ [{type:'titan',  count:1,  interval:0},   {type:'swarm',  count:20,interval:300},{type:'phantom',count:6,interval:900}],
    /* W26 */ [{type:'brute',  count:12, interval:800}, {type:'juggernaut',count:5,interval:1100},{type:'shade',count:10,interval:750}],
    /* W27 */ [{type:'swarm',  count:35, interval:230}, {type:'flyer',  count:12,interval:600},{type:'phantom',count:5,interval:900}],
    /* W28 */ [{type:'overlord',count:3, interval:2800},{type:'phantom',count:8, interval:800},{type:'brute',count:10,interval:850}],
    /* W29 */ [{type:'titan',  count:1,  interval:0},   {type:'overlord',count:2,interval:3200},{type:'swarm',count:20,interval:280}],
    /* W30 */ [{type:'titan',  count:2,  interval:6000},{type:'overlord',count:3,interval:2500},{type:'swarm',count:30,interval:250},{type:'phantom',count:8,interval:800}],
];

function buildWaveQueue(waveNum){
    const idx = waveNum - 1;
    const template = idx < WAVE_TEMPLATES.length
        ? WAVE_TEMPLATES[idx]
        : _generateWave(waveNum);

    const queue = [];
    for(const g of template){
        for(let i=0;i<g.count;i++){
            queue.push({ type:g.type, delay:g.interval });
        }
    }
    return queue;
}

function _generateWave(waveNum){
    const extra = waveNum - WAVE_TEMPLATES.length;
    const base  = Math.floor(14 + waveNum * 0.9);
    const grps  = [];
    grps.push({type:'grunt',  count:Math.ceil(base*.25), interval:Math.max(350,900-extra*4)});
    grps.push({type:'scout',  count:Math.ceil(base*.22), interval:Math.max(300,800-extra*4)});
    if(extra%2===0)  grps.push({type:'brute',      count:Math.ceil(base*.12),interval:900});
    if(extra%3===0)  grps.push({type:'flyer',       count:Math.ceil(base*.15),interval:700});
    if(extra%4===0)  grps.push({type:'shade',       count:Math.ceil(base*.14),interval:800});
    if(extra%5===0)  grps.push({type:'swarm',       count:Math.ceil(base*.3), interval:280});
    if(extra%6===0)  grps.push({type:'juggernaut',  count:Math.ceil(base*.08),interval:1200});
    if(extra%7===0)  grps.push({type:'phantom',     count:Math.ceil(base*.12),interval:850});
    if(extra%10===0) grps.push({type:'overlord',    count:1,                  interval:0});
    if(extra%20===0) grps.push({type:'titan',       count:1,                  interval:0});
    return grps;
}

// Health/speed scalar per wave
function getWaveMult(waveNum, mapDiffMult=1){
    return Math.pow(1.085, waveNum-1) * mapDiffMult;
}

const DIFF_MULT = {
    greenfield: 1.0,
    desert:     1.15,
    frozen:     1.30,
    volcanic:   1.55,
    neon:       1.35,
    abyss:      1.80,
};

//  Wave state machine 
const waveState = {
    phase:           'idle',
    waveNum:         0,
    queue:           [],
    queueIndex:      0,
    nextSpawnAt:     0,
    enemiesAlive:    0,
    totalSpawned:    0,
    intermissionEnd: 0,
    INTERMISSION_MS: 7500,
    countdownEnd:    0,
    COUNTDOWN_MS:    3000,
    _waveMult:       1,
    maxWaves:        30,
    _leaked:         0,
    _waveStartTime:  0,

    init(){
        this.phase        = 'countdown';
        this.waveNum      = 0;
        this.countdownEnd = Date.now() + this.COUNTDOWN_MS;
    },

    startWave(){
        this.waveNum++;
        const diff = DIFF_MULT[currentMap?.id] || 1.0;
        this._waveMult   = getWaveMult(this.waveNum, diff);
        this.queue        = buildWaveQueue(this.waveNum);
        this.queueIndex   = 0;
        this.enemiesAlive = 0;
        this.totalSpawned = 0;
        this.nextSpawnAt  = Date.now() + 400;
        this.phase        = 'spawning';
        this._leaked      = 0;
        this._waveStartTime = Date.now();
    },

    skipToNext(){
        if(this.phase==='countdown'){
            this.countdownEnd=Date.now();
        } else if(this.phase==='intermission'){
            this.intermissionEnd=Date.now();
        }
    },

    tick(enemies){
        if(this.phase==='hidden') return null;
        const now=Date.now();

        if(this.phase==='countdown'){
            if(now>=this.countdownEnd) this._waveMult=this.startWave()||this._waveMult;
            return null;
        }

        if(this.phase==='spawning'){
            if(this.queueIndex<this.queue.length && now>=this.nextSpawnAt){
                const entry=this.queue[this.queueIndex++];
                this.nextSpawnAt = now + (entry.delay||800);
                this.enemiesAlive++;
                this.totalSpawned++;
                return {action:'spawn', type:entry.type, mult:this._waveMult};
            }
            if(this.queueIndex>=this.queue.length) this.phase='waiting';
            return null;
        }

        if(this.phase==='waiting'){
            if(this.enemiesAlive<=0){
                this.phase='intermission';
                this.intermissionEnd=now+this.INTERMISSION_MS;
                return {action:'waveCleared', wave:this.waveNum};
            }
            return null;
        }

        if(this.phase==='intermission'){
            if(now>=this.intermissionEnd){
                if(this.waveNum>=this.maxWaves){
                    return {action:'victory'};
                }
                this.startWave();
            }
            return null;
        }

        return null;
    },

    enemyKilled(){ this.enemiesAlive=Math.max(0,this.enemiesAlive-1); },
    enemyLeaked(){ this.enemiesAlive=Math.max(0,this.enemiesAlive-1); this._leaked++; },

    intermissionRemaining(){
        if(this.phase!=='intermission') return 0;
        return Math.max(0,(this.intermissionEnd-Date.now())/1000);
    },
    countdownRemaining(){
        if(this.phase!=='countdown') return 0;
        return Math.max(0,(this.countdownEnd-Date.now())/1000);
    },
    isInWave(){ return this.phase==='spawning'||this.phase==='waiting'; },
    spawnProgress(){
        if(!this.queue.length) return 0;
        return this.queueIndex/this.queue.length;
    },
    waveElapsed(){
        if(!this.isInWave()||!this._waveStartTime) return 0;
        return (Date.now()-this._waveStartTime)/1000;
    },
};

// ============================================================
//  THE HIDDEN WAVE  —  Wave 31 "The Void Awakens"
//  Unlock conditions (ANY of):
//    1. Finish wave 30 with lives >= 50 and score >= 40 000
//    2. admin.triggerHidden()
//    3. Click each corner of the canvas within 3 seconds
// ============================================================

// Sub-waves of the hidden sequence
const HIDDEN_WAVE_TEMPLATES = [
    /* HW1  */ [{type:'void_wisp',  count:12, interval:580}],
    /* HW2  */ [{type:'void_swarm', count:22, interval:180},{type:'void_wisp', count:6, interval:600}],
    /* HW3  */ [{type:'void_wisp',  count:16, interval:480},{type:'void_wraith',count:4,interval:1100}],
    /* HW4  */ [{type:'void_swarm', count:28, interval:160},{type:'void_wraith',count:5,interval:1000}],
    /* HW5  */ [{type:'void_wraith',count:8,  interval:850},{type:'void_wisp',  count:12,interval:380}],
    /* HW6  */ [{type:'void_swarm', count:32, interval:150},{type:'void_wraith',count:7, interval:900}],
    /* HW7  */ [{type:'void_wraith',count:10, interval:750},{type:'void_swarm', count:18,interval:190},{type:'void_wisp',count:8,interval:350}],
    /* HW8  */ [{type:'void_god',   count:1,  interval:0},  {type:'void_wraith',count:6, interval:1600},{type:'void_wisp',count:10,interval:320}],
    /* HW9  */ [{type:'void_titan', count:1,  interval:0},  {type:'void_swarm', count:24,interval:170},{type:'void_wraith',count:8,interval:850}],
    /* HW10 */ [{type:'void_god',   count:2,  interval:5500},{type:'void_titan',count:1, interval:0},   {type:'void_wraith',count:12,interval:750},{type:'void_swarm',count:20,interval:180}],
];

const hiddenWaveSystem = {
    active:      false,
    triggered:   false,
    subWave:     0,
    phase:       'idle',     // idle | intro | spawning | waiting | interlude | complete
    queue:       [],
    queueIndex:  0,
    nextSpawnAt: 0,
    enemiesAlive:0,
    interludeEnd:0,
    INTERLUDE_MS:5000,
    introEnd:    0,
    INTRO_MS:    3500,

    // Corner-tap unlock
    _cornerTaps: [],
    _cornerTimeout: null,

    activate(){
        if(this.active) return;
        this.active     = true;
        this.triggered  = true;
        this.subWave    = 0;
        this.phase      = 'intro';
        this.introEnd   = Date.now() + this.INTRO_MS;
        this.enemiesAlive = 0;
        if(typeof audio!=='undefined') audio.fadeToTrack('hidden', 2.5);
        if(typeof audio!=='undefined') audio.sfx('hidden_trigger');
        if(typeof toast !=='undefined') toast('☠ THE VOID AWAKENS ☠', 3500);
        if(typeof game  !=='undefined') game.shakeScreen(22, 1.2);
    },

    deactivate(){
        this.active=false; this.phase='idle'; this.subWave=0;
        this.queue=[]; this.enemiesAlive=0;
    },

    tick(enemies){
        if(!this.active) return null;
        const now = Date.now();

        if(this.phase==='intro'){
            if(now >= this.introEnd) this._startSubWave();
            return null;
        }

        if(this.phase==='spawning'){
            if(this.queueIndex < this.queue.length && now >= this.nextSpawnAt){
                const entry = this.queue[this.queueIndex++];
                this.nextSpawnAt = now + (entry.delay || 700);
                this.enemiesAlive++;
                return {action:'hiddenSpawn', type:entry.type };
            }
            if(this.queueIndex >= this.queue.length) this.phase = 'waiting';
            return null;
        }

        if(this.phase==='waiting'){
            if(this.enemiesAlive <= 0){
                if(this.subWave >= HIDDEN_WAVE_TEMPLATES.length){
                    this.phase = 'complete';
                    return {action:'hiddenVictory'};
                }
                this.phase = 'interlude';
                this.interludeEnd = now + this.INTERLUDE_MS;
                return {action:'hiddenSubWaveCleared', subWave: this.subWave};
            }
            return null;
        }

        if(this.phase==='interlude'){
            if(now >= this.interludeEnd) this._startSubWave();
            return null;
        }

        return null;
    },

    _startSubWave(){
        if(this.subWave >= HIDDEN_WAVE_TEMPLATES.length){ this.phase='waiting'; return; }
        const template = HIDDEN_WAVE_TEMPLATES[this.subWave++];
        this.queue = [];
        for(const g of template) for(let i=0;i<g.count;i++) this.queue.push({type:g.type,delay:g.interval});
        this.queueIndex  = 0;
        this.enemiesAlive= 0;
        this.nextSpawnAt = Date.now() + 600;
        this.phase       = 'spawning';
    },

    enemyKilled(){ this.enemiesAlive = Math.max(0, this.enemiesAlive - 1); },
    enemyLeaked(){ this.enemiesAlive = Math.max(0, this.enemiesAlive - 1); },

    // Corner tap detection — call this from canvas click handler
    onCanvasClick(x, y, W, H){
        if(this.active) return;
        const corners = [
            {cx:0,   cy:0},
            {cx:W,   cy:0},
            {cx:W,   cy:H},
            {cx:0,   cy:H},
        ];
        const CORNER_RADIUS = Math.min(W,H)*0.09;
        let hitCorner = -1;
        corners.forEach((c,i)=>{
            if(Math.hypot(x-c.cx, y-c.cy) < CORNER_RADIUS) hitCorner = i;
        });
        if(hitCorner === -1) return;

        const expectedNext = this._cornerTaps.length % 4;
        if(hitCorner !== expectedNext){ this._cornerTaps=[]; return; }

        this._cornerTaps.push(hitCorner);
        if(this._cornerTaps.length >= 4){
            this._cornerTaps = [];
            this.activate();
        } else {
            // Reset if no tap within 3s
            clearTimeout(this._cornerTimeout);
            this._cornerTimeout = setTimeout(()=>{ this._cornerTaps=[]; }, 3000);
        }
    },

    // Check win-condition for auto-trigger
    checkAutoTrigger(lives, score){
        if(this.triggered) return false;
        if(lives >= 50 && score >= 40000){
            this.activate(); return true;
        }
        return false;
    },

    interludeRemaining(){
        if(this.phase!=='interlude') return 0;
        return Math.max(0,(this.interludeEnd-Date.now())/1000);
    },
    introRemaining(){
        if(this.phase!=='intro') return 0;
        return Math.max(0,(this.introEnd-Date.now())/1000);
    },
};
