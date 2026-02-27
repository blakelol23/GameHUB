// ============================================================
// AUDIO.JS - Blockie Tower Defense V2 (Cinematic Audio Engine)
// ============================================================
'use strict';

const audio = (function(){
    let ctx = null;
    let masterGain = null;
    let _vol = 0.38;
    let _muted = false;
    let _track = null;
    let _trackName = '';
    let _schedulerHandle = null;
    let _nextBeatTime = 0;

    const LOOKAHEAD = 0.12;
    const SCHEDULE_INTERVAL = 80;

    // --------------- NOTES ---------------
    const NOTE = {};
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    for(let oct=0;oct<=8;oct++) noteNames.forEach((n,i)=>{
        NOTE[n+oct] = 440 * Math.pow(2,(oct-4)+(i-9)/12);
    });
    const _ = null;

    // --------------- TRACKS ---------------
    const TRACKS = {
    // -----------------------------
    // TITLE SCREEN - Dreamy, cinematic
    // -----------------------------
    title:{
        bpm:76,
        layers:[
            // Dreamy lead arpeggio
            { osc:'sawtooth', vol:0.18, pattern:[
                'C4','E4','G4','B4','C5','G4','E4','B3',
                'A3','C4','E4','G4','A4','E4','C4','G3'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:1200, filterFreqEnd:300, unison:true },

            // Pad chord
            { osc:'triangle', vol:0.12, pattern:[
                'C3','C3','C3','C3','A2','A2','A2','A2',
                'F2','F2','F2','F2','G2','G2','G2','G2'
            ], dur:Array(16).fill(2), filter:'lowpass', filterEnv:true, filterFreq:1000, filterFreqEnd:200, unison:true },

            // Gentle bass pulse
            { osc:'sine', vol:0.08, pattern:[
                'C2',_,_,_,'A1',_,_,_,'F1',_,_,_,'G1',_,_,_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:false, unison:false }
        ]
    },

    // -----------------------------
    // GAMEPLAY - Energetic
    // -----------------------------
    gameplay:{
        bpm:92,
        layers:[
            // Melody lead
            { osc:'square', vol:0.12, pattern:[
                'E4','G4','A4','B4','G4','E4','D4','E4',
                'A4','B4','C5','A4','G4','E4','D4',_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:2000, filterFreqEnd:800, unison:true },

            // Bassline
            { osc:'sawtooth', vol:0.15, pattern:[
                'E3',_,'E3',_,'A2',_,'A2',_,
                'F3',_,'F3',_,'G2',_,'G2',_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:400, filterFreqEnd:100, unison:true },

            // Rhythm stabs
            { osc:'square', vol:0.08, pattern:[
                'E2','E2','B2','E2','E2','B2','E2','B2',
                'A2','A2','E3','A2','G2','G2','D3','G2'
            ], dur:Array(16).fill(0.5), filter:'highpass', filterEnv:false, unison:false }
        ]
    },

    // -----------------------------
    // LATEGAME - Driving tension
    // -----------------------------
    lategame:{
        bpm:106,
        layers:[
            // Aggressive lead
            { osc:'sawtooth', vol:0.14, pattern:[
                'A4','G4','A4','B4','G4','E4','D4','E4',
                'F4','E4','F4','G4','E4','D4','C4','D4'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:2000, filterFreqEnd:500, unison:true },

            // Counter-bass
            { osc:'sawtooth', vol:0.15, pattern:[
                'A2','E2','A2','G2','E2','A2','E2','D2',
                'F2','C2','F2','E2','C2','F2','C2','A1'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:400, filterFreqEnd:100, unison:true },

            // Rhythm stabs
            { osc:'square', vol:0.08, pattern:[
                'A3',_,'A3',_,'G3','E3',_,'G3',
                'F3',_,'F3',_,'E3','C3',_,'E3'
            ], dur:Array(16).fill(0.5), filter:'highpass', filterEnv:false, unison:false },

            // Tension pad
            { osc:'triangle', vol:0.1, pattern:[
                'E3','E3','E3','E3','D3','D3','D3','D3',
                'C3','C3','C3','C3','D3','D3','D3','D3'
            ], dur:Array(16).fill(1), filter:'lowpass', filterEnv:true, filterFreq:1200, filterFreqEnd:200, unison:true }
        ]
    },

    // -----------------------------
    // BOSS - Heavy, cinematic
    // -----------------------------
    boss:{
        bpm:118,
        layers:[
            // Galloping bass
            { osc:'sawtooth', vol:0.25, pattern:[
                'E2','E2','B1','E2','B1','E2','G2','E2',
                'D2','D2','A1','D2','C2','G1','C2','G1'
            ], dur:Array(16).fill(0.25), filter:'lowpass', filterEnv:true, filterFreq:400, filterFreqEnd:50, unison:true },

            // Power stabs
            { osc:'sawtooth', vol:0.14, pattern:[
                'E4',_,'E4',_,'G4',_,'B4',_,'A4',_,'G4',_,'F#4',_,'E4',_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:1800, filterFreqEnd:600, unison:true },

            // Counter melody
            { osc:'triangle', vol:0.12, pattern:[
                'E3','E3','B3','E3','G3','E3','B3','G3',
                'D3','D3','A3','D3','C3','C3','G3','C3'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:1000, filterFreqEnd:300, unison:true },

            // Low dread pad
            { osc:'sine', vol:0.12, pattern:[
                'E1',_,_,_, _,_,_,_, 'D1',_,_,_, _,_,_,_
            ], dur:Array(16).fill(1), filter:'lowpass', filterEnv:true, filterFreq:600, filterFreqEnd:100, unison:true }
        ]
    },

    // -----------------------------
    // HIDDEN - Weird ambient
    // -----------------------------
    hidden:{
        bpm:38,
        layers:[
            { osc:'sine', vol:0.26, pattern:[
                'B0',_,_,_, _,_,_,_, 'A#0',_,_,_, _,_,_,_
            ], dur:Array(16).fill(2), filter:'lowpass', filterEnv:true, filterFreq:600, filterFreqEnd:50, unison:true },

            { osc:'sawtooth', vol:0.05, pattern:[
                _,'D#5',_,_, _,_,'A#4',_, _,'F5',_,_, _,_,'C#5',_
            ], dur:Array(16).fill(0.4), filter:'highpass', filterEnv:false, unison:true },

            { osc:'triangle', vol:0.12, pattern:[
                'D3',_,_,'C3', _,_,'B2',_, _,'A#2',_,_, 'A2',_,_,_
            ], dur:Array(16).fill(0.8), filter:'lowpass', filterEnv:true, filterFreq:1200, filterFreqEnd:200, unison:true },

            { osc:'sawtooth', vol:0.07, pattern:[
                'B1','A#1','B1','A1','B1','G#1','B1','A1',
                'A#1','A1','G#1','G1','A1','G1','F#1','G1'
            ], dur:Array(16).fill(0.7), filter:'lowpass', filterEnv:true, filterFreq:600, filterFreqEnd:100, unison:true }
        ]
    },

    // -----------------------------
    // VICTORY - Triumphant
    // -----------------------------
    victory:{
        bpm:138,
        layers:[
            { osc:'square', vol:0.14, pattern:[
                'C4','E4','G4','C5','E5','G5','E5','C5',
                'A4','C5','E5','A5','G5','E5','C5','G4'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:2000, filterFreqEnd:500, unison:true },

            { osc:'triangle', vol:0.1, pattern:[
                'G3','B3','D4','G4','C5','E5','C5','G4',
                'E4','G4','B4','E5','D5','B4','G4','D4'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:1200, filterFreqEnd:300, unison:true },

            { osc:'sine', vol:0.08, pattern:[
                'C5','G4','E4','C4','G4','E4','C4','G3',
                'A4','E4','C4','A3','G4','E4','C4','G3'
            ], dur:Array(16).fill(0.25), filter:'lowpass', filterEnv:true, filterFreq:1500, filterFreqEnd:400, unison:true },

            { osc:'triangle', vol:0.12, pattern:[
                'C3','C3','G2','C3','G2','C3','E3','C3',
                'A2','A2','E2','A2','G2','G2','D2','G2'
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:800, filterFreqEnd:150, unison:true }
        ]
    },

    // -----------------------------
    // GAMEOVER - Sad cinematic
    // -----------------------------
    gameover:{
        bpm:48,
        layers:[
            { osc:'sine', vol:0.22, pattern:[
                'G3',_,'F3',_, 'E3',_,'D3',_, 'C3',_,'B2',_, 'A2',_,_,_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:1000, filterFreqEnd:200, unison:true },

            { osc:'triangle', vol:0.14, pattern:[
                'E3',_,'D3',_, 'C3',_,'B2',_, 'A2',_,'G2',_, 'F2',_,_,_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:800, filterFreqEnd:100, unison:true },

            { osc:'sine', vol:0.16, pattern:[
                'C2','C2',_,_, _,'C2',_,_, 'A1','A1',_,_, _,_,_,_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:400, filterFreqEnd:50, unison:true },

            { osc:'triangle', vol:0.12, pattern:[
                'C3',_,_,_, _,'B2',_,_, _,'A2',_,_, _,'G2',_,_
            ], dur:Array(16).fill(0.5), filter:'lowpass', filterEnv:true, filterFreq:800, filterFreqEnd:150, unison:true }
        ]
    }
};

    // --------------- INSTRUMENTS ---------------
    function makeOsc(type,freq,vol,when,duration,{vibrato=0,filter=null,filterEnv=false,filterFreq=2000,filterFreqEnd=400,unison=false}={}){
        if(!ctx) return;
        if(!freq || !isFinite(freq) || freq <= 0) return;

        // Stereo detune for unison
        const detuneAmounts = unison ? [-5,5] : [0];
        detuneAmounts.forEach(detune=>{
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, when);
            if(detune) osc.detune.setValueAtTime(detune, when);

            // Vibrato
            if(vibrato){
                const vib = ctx.createOscillator();
                const vibGain = ctx.createGain();
                vib.frequency.setValueAtTime(5, when);
                vibGain.gain.setValueAtTime(freq*vibrato, when);
                vib.connect(vibGain);
                vibGain.connect(osc.frequency);
                vib.start(when); vib.stop(when+duration+0.05);
            }

            // Gain envelope
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, when);
            const att = Math.min(0.04,duration*0.1);
            const rel = Math.min(0.12,duration*0.3);
            gain.gain.linearRampToValueAtTime(vol, when+att);
            gain.gain.setValueAtTime(vol, when+duration-rel);
            gain.gain.linearRampToValueAtTime(0, when+duration);

            // Optional filter
            if(filter){
                const f = ctx.createBiquadFilter();
                f.type = filter;
                f.frequency.setValueAtTime(filterEnv ? filterFreq : filterFreqEnd, when);
                if(filterEnv){
                    f.frequency.linearRampToValueAtTime(filterFreqEnd, when+duration);
                }
                osc.connect(f); f.connect(gain);
            } else {
                osc.connect(gain);
            }

            gain.connect(masterGain);
            osc.start(when);
            osc.stop(when+duration+0.02);
        });
    }

    function makeDrum(when,type='kick'){
        if(!ctx) return;
        const g = ctx.createGain(); g.connect(masterGain);

        if(type==='kick'){
            const osc = ctx.createOscillator(); osc.type='sine';
            osc.frequency.setValueAtTime(180,when);
            osc.frequency.exponentialRampToValueAtTime(30,when+0.2);
            g.gain.setValueAtTime(0.5,when);
            g.gain.exponentialRampToValueAtTime(0.001,when+0.22);
            osc.connect(g); osc.start(when); osc.stop(when+0.23);
        } else if(type==='snare'){
            const buf = ctx.createBuffer(1,ctx.sampleRate*0.12,ctx.sampleRate);
            const data = buf.getChannelData(0);
            for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.6;
            const src = ctx.createBufferSource(); src.buffer=buf;
            const filt = ctx.createBiquadFilter(); filt.type='highpass'; filt.frequency.value=1500;
            g.gain.setValueAtTime(0.3,when); g.gain.exponentialRampToValueAtTime(0.001,when+0.12);
            src.connect(filt); filt.connect(g); src.start(when); src.stop(when+0.13);
        } else if(type==='hihat'){
            const buf = ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
            const data = buf.getChannelData(0);
            for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.4;
            const src = ctx.createBufferSource(); src.buffer=buf;
            const filt = ctx.createBiquadFilter(); filt.type='highpass'; filt.frequency.value=8000;
            g.gain.setValueAtTime(0.12,when); g.gain.exponentialRampToValueAtTime(0.001,when+0.04);
            src.connect(filt); filt.connect(g); src.start(when); src.stop(when+0.05);
        }
    }

    // --------------- SCHEDULER ---------------
    let _patternPositions = {};
    let _activeLayers = [];

    function _scheduleNotes(){
        if(!ctx||!_track) return;
        const now = ctx.currentTime;

        while(_nextBeatTime < now+LOOKAHEAD){
            _activeLayers.forEach((layer,li)=>{
                const pos = _patternPositions[li]||0;
                const note = layer.pattern[pos % layer.pattern.length];
                const dur  = (layer.dur[pos % layer.dur.length]||0.5)*(60/_track.bpm);

                if(note !== null){
                    const freq = NOTE[note];
                    if(freq && isFinite(freq)) makeOsc(layer.osc, freq, layer.vol*_vol*(_muted?0:1), _nextBeatTime, dur, layer);
                }

                _patternPositions[li] = pos+1;
            });

            // Dynamic drums
            if(['gameplay','boss','lategame'].includes(_trackName)){
                const beat = (_patternPositions[0]||0)%16;
                if(beat%2===0) makeDrum(_nextBeatTime,'kick');
                if([4,12].includes(beat%16)) makeDrum(_nextBeatTime,'snare');
                if(beat%2===1) makeDrum(_nextBeatTime,'hihat');
                if(_trackName==='boss' && beat===2) makeDrum(_nextBeatTime,'kick');
            }

            _nextBeatTime += ((_activeLayers[0]?.dur[0]||0.5))*(60/_track.bpm);
        }

        _schedulerHandle = setTimeout(_scheduleNotes, SCHEDULE_INTERVAL);
    }

    // --------------- SFX ---------------
    function _sfx(type){
        if(!ctx||_muted) return;
        const now = ctx.currentTime;

        switch(type){
            case 'place':
                makeOsc('sine',660,.25,now,.08,{vibrato:.02});
                makeOsc('sine',880,.18,now+.05,.08,{vibrato:.02});
                break;
            case 'sell':
                makeOsc('sine',440,.2,now,.05,{vibrato:.01});
                makeOsc('sine',330,.15,now+.04,.06,{vibrato:.01});
                break;
            case 'upgrade':
                [520,660,880].forEach((f,i)=>makeOsc('sine',f,.22,now+i*.06,.08,{vibrato:.02}));
                break;
            case 'wave_start':
                makeOsc('sawtooth',220,.15,now,.12,{vibrato:.01});
                makeOsc('sawtooth',277,.12,now+.1,.12,{vibrato:.01});
                makeOsc('sawtooth',330,.1,now+.2,.12,{vibrato:.01});
                break;
            case 'wave_clear':
                [440,550,660,880].forEach((f,i)=>makeOsc('triangle',f,.2,now+i*.08,.15));
                break;
            case 'boss_spawn':
                makeOsc('sawtooth',110,.4,now,.3);
                makeOsc('sawtooth',73,.35,now+.15,.3);
                makeOsc('sawtooth',55,.3,now+.3,.35);
                break;
            case 'hidden_trigger':
                for(let i=0;i<8;i++) makeOsc('sawtooth',55*Math.pow(2,i/12),.3,now+i*.06,.2);
                break;
            case 'gameover':
                makeOsc('sine',440,.3,now,.1);
                makeOsc('sine',392,.28,now+.15,.1);
                makeOsc('sine',349,.26,now+.3,.1);
                makeOsc('sine',294,.24,now+.45,.2);
                break;
            case 'buy_failed':
                makeOsc('square',200,.2,now,.04);
                makeOsc('square',150,.16,now+.05,.06);
                break;
        }
    }

    // --------------- PUBLIC API ---------------
    return {
        init(){
            if(ctx) return;
            try{
                ctx = new (window.AudioContext||window.webkitAudioContext)();
                masterGain = ctx.createGain();
                masterGain.gain.value = _vol;
                masterGain.connect(ctx.destination);
            } catch(e){ console.warn('Web Audio not available', e); }
        },

        play(trackName){
            if(!ctx) this.init();
            if(!ctx) return;
            if(_trackName===trackName && _schedulerHandle) return;

            this.stop();
            _track = TRACKS[trackName];
            if(!_track) return;
            _trackName = trackName;
            _activeLayers = _track.layers||[];
            _patternPositions = {};
            _nextBeatTime = ctx.currentTime+0.1;
            _scheduleNotes();
        },

        stop(){
            if(_schedulerHandle){ clearTimeout(_schedulerHandle); _schedulerHandle=null; }
            _track=null; _trackName=''; _activeLayers=[];
        },

        sfx(type){ _sfx(type); },

        fadeToTrack(name,fadeSec=1.5){
            if(!ctx) this.init();
            if(!ctx) return;
            if(_trackName===name) return;
            if(masterGain){
                masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime+fadeSec*0.4);
                setTimeout(()=>{
                    this.play(name);
                    if(masterGain) masterGain.gain.linearRampToValueAtTime(_vol*(_muted?0:1), ctx.currentTime+fadeSec*0.6);
                },fadeSec*400);
            } else { this.play(name); }
        },

        setVolume(v){
            _vol = Math.max(0,Math.min(1,v));
            if(masterGain) masterGain.gain.value = _muted ? 0 : _vol;
        },

        toggleMute(){
            _muted = !_muted;
            if(masterGain) masterGain.gain.value = _muted ? 0 : _vol;
            return _muted;
        },

        get muted(){ return _muted; },
        get volume(){ return _vol; },
        get track(){ return _trackName; },

        resume(){ if(ctx&&ctx.state==='suspended') ctx.resume(); },
    };
})();

// ============================================================
//  SFX FILES — HTML Audio pool for mp3 sound effects
//  Files live in ../Audio/ relative to v2/
// ============================================================
const sfxFiles = (function(){
    'use strict';
    const BASE = '../Audio/';

    // key → { file, vol, poolSize, _pool, _idx, _lastPlay, throttleMs }
    const DEFS = {
        shoot:    { file:'tower-shoot.mp3',      vol:0.32, poolSize:5, _pool:null, _idx:0, _lastPlay:0, throttleMs:80  },
        die:      { file:'zombie-die.mp3',        vol:0.36, poolSize:5, _pool:null, _idx:0, _lastPlay:0, throttleMs:65  },
        place:    { file:'tower-place.mp3',       vol:0.72, poolSize:2, _pool:null, _idx:0, _lastPlay:0, throttleMs:0   },
        sell:     { file:'tower-sell.mp3',        vol:0.68, poolSize:2, _pool:null, _idx:0, _lastPlay:0, throttleMs:0   },
        waveStart:{ file:'wave-start.mp3',        vol:0.80, poolSize:1, _pool:null, _idx:0, _lastPlay:0, throttleMs:0   },
        bg:       { file:'background-music.mp3',  vol:0.18, poolSize:1, _pool:null, _idx:0, _lastPlay:0, throttleMs:0   },
    };

    function _getPool(def){
        if(!def._pool){
            def._pool = [];
            for(let i = 0; i < def.poolSize; i++){
                const a = new Audio(BASE + def.file);
                a.volume = def.vol;
                def._pool.push(a);
            }
        }
        return def._pool;
    }

    return {
        play(key){
            const def = DEFS[key];
            if(!def) return;
            const now = Date.now();
            if(def.throttleMs && now - def._lastPlay < def.throttleMs) return;
            def._lastPlay = now;
            const pool = _getPool(def);
            const a = pool[def._idx % pool.length];
            def._idx++;
            a.currentTime = 0;
            a.play().catch(()=>{});
        },
        loop(key){
            const def = DEFS[key];
            if(!def) return;
            const pool = _getPool(def);
            const a = pool[0];
            a.loop = true;
            a.currentTime = 0;
            a.play().catch(()=>{});
        },
        stop(key){
            const def = DEFS[key];
            if(!def || !def._pool) return;
            for(const a of def._pool){ a.pause(); a.currentTime = 0; }
        },
        setVol(key, v){
            const def = DEFS[key];
            if(!def || !def._pool) return;
            for(const a of def._pool) a.volume = v;
        },
    };
})();
