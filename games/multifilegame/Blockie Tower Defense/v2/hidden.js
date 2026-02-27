// ============================================================
//  HIDDEN.JS  —  Blockie Tower Defense V2  [ REMAKE ]
//  "Protocol 777" — The secret wave beyond Wave 20.
//  Triggered automatically after Wave 20 is cleared.
// ============================================================

// ── Glitch character pool ─────────────────────────────────────
const HW_CHARS = '░▒▓█¥ØΞЖ§¶◘■▟▚▞⌁ΛΣ∅∞⊗⊕⧖⌀ΩΨΔΦΓ';

// ── Typed dialogue lines ──────────────────────────────────────
const HW_INTRO_LINES = [
    '> S Y S T E M   C R I T I C A L  —  0 x 7 7 7',
    '',
    '> YOU  WERE  NOT  SUPPOSED  TO  FIND  THIS.',
    '',
    '> THE  VOID  HAS  BEEN  WATCHING  YOU.',
    '',
    '> I T   H A S   B E E N   P A T I E N T .',
    '',
    '> T H A T   P A T I E N C E   E N D S   N O W .',
];

const HW_HORDE_FOOTER = [
    'THEY NEVER STOP',
    'THE VOID CONSUMES ALL',
    'THERE IS NO MERCY HERE',
    'YOUR DEFENSES ARE FAILING',
    'CAN YOU FEEL IT COLLAPSING',
    'ERROR: CONTAINMENT BREACHED',
    '[ SYSTEM OVERLOAD ]',
    'THE GRID IS SHATTERING',
    'THEY WERE ALWAYS HERE',
    'DO YOU HEAR IT SCREAMING',
    'MORE ARE COMING',
    'YOU CANNOT WIN THIS',
    'THE ARCHITECTS ARE WATCHING',
    '[ UNDEFINED BEHAVIOUR ]',
    'FATAL: PROCESS CANNOT BE CONTAINED',
    'YOUR REALITY IS FRAGMENTING',
    'EVERY SECOND YOU SURVIVE IS BORROWED',
    'THE HUNGER IS INFINITE',
    'STOP.  JUST  STOP.',
    'YOU  WERE  WARNED',
];

const HW_BOSS_INTRO_LINES = [
    '> . . .',
    '',
    '> STILL  HERE.  STILL  FIGHTING.',
    '',
    '> IMPRESSIVE.  POINTLESS.',
    '',
    '> THE  ARCHITECTS  HAVE  AWOKEN.',
    '',
    '> T H E Y   H A V E   N E V E R   L O S T .',
];

const HW_VICTORY_LINES = [
    '. . .',
    '',
    '> . . . H O W .',
    '',
    '> Y O U   A C T U A L L Y   W O N .',
    '',
    '> THE  VOID  IS  SILENT.',
    '',
    '> A C K N O W L E D G E D ,  S U R V I V O R .',
];

// ── Enemy horde tiers (escalates every 40 seconds) ────────────
const HW_HORDE_TIERS = [
    ['void_wisp', 'shade', 'void_swarm', 'flyer'],
    ['void_wraith', 'void_wisp', 'phantom', 'void_swarm', 'juggernaut'],
    ['void_wraith', 'phantom', 'juggernaut', 'void_swarm', 'overlord'],
];

// ── Map corruption schedule ────────────────────────────────────
const HW_CORRUPT_SCHEDULE = [
    { t: 8,  type: 'stun_wave',   duration: 3.0,  label: '\u26a1  S I G N A L   J A M M E D',         _fired: false },
    { t: 20, type: 'debuff_all',  duration: 12,   label: '\u25bc  V O I D   D R A I N',                _fired: false },
    { t: 32, type: 'buff_random', duration: 10,   label: '\u26a0  C H A O S   O V E R L O A D',        _fired: false },
    { t: 48, type: 'stun_wave',   duration: 4.5,  label: '\u26a1  S T A S I S   F I E L D',            _fired: false },
    { t: 58, type: 'move_tower',  duration: 0,    label: '\u21af  D I M E N S I O N A L   S H I F T',  _fired: false },
    { t: 68, type: 'debuff_all',  duration: 16,   label: '\u25bc  C O R E   D E C A Y',                _fired: false },
    { t: 80, type: 'buff_random', duration: 8,    label: '\u26a0  V O I D   C H A O S',                _fired: false },
];

// ═════════════════════════════════════════════════════════════
//  MAIN STATE MACHINE
// ═════════════════════════════════════════════════════════════
const hiddenWave = {
    active:  false,
    phase:   'idle',   // idle | intro | horde | boss_intro | boss | victory

    // Phase timers
    _pt:  0,
    _pt2: 0,

    // Horde state
    _hordeElapsed:  0,
    _spawnTimer:    0,
    _surgeTimer:    22,    // next massive surge countdown
    _surgeCount:    0,
    _midWallFired:  false,

    // Boss state
    _bossEnemies:   [],
    _bossSpawned:   false,

    // Typed text state
    _txt: { lines: [], done: [], rev: 0, lineT: 0, pauseT: 0, phase: 'done' },

    // ── Visuals ───────────────────────────────────────────────
    _slices:  [],
    _sliceT:  0,
    _scanAmt: 0,

    // Void tears (cracks from corners)
    _voidTears:    [],
    _tearProgress: 0,

    // Heartbeat pulse
    _pulseBeat: 0,
    _beatTimer: 2.0,
    _beatRate:  2.0,

    // Boss blood tint
    _bloodTint: 0,

    // Footer
    _footerIdx:   0,
    _footerAlpha: 0,
    _footerT:     0,
    _footerPhase: 'fade_in',

    // Wave mult
    _mult: 8.0,

    // ── Warp state — FIXED: _warpAmt is now actively driven ───
    _zoomPhase:   'idle',  // idle | out | sustained
    _zoomScale:   1.0,     // legacy compat
    _zoomT:       0,
    _warpAmt:     0,       // drives _applyWarpEffect in game.js
    _warpSustain: 0,       // builds during horde/boss

    // Audio
    _777audio: null,
    _beepAC:   null,

    // Map corruption
    _mapCorruptT: 0,
    _corruptMsg:  '',
    _corruptMsgT: 0,

    // Architect / Creator
    _architectDeathCount: 0,
    _architectKillTime:   -1,
    _creatorSpawned:      false,
    _creatorPending:      false,
    _creatorEnemy:        null,
    _thrownSword:         null,

    // ── Ensure DOM elements exist ─────────────────────────────
    _ensureDOM() {
        if (document.getElementById('hw-overlay')) return;

        const style = document.createElement('style');
        style.id = 'hw-style';
        style.textContent = `
#hw-overlay{position:fixed;inset:0;z-index:400;pointer-events:none;
  background:transparent;transition:background .5s;display:none}
#hw-overlay.visible{display:block}
#hw-overlay.dim{background:rgba(12,0,20,.15)}

#hw-flash{position:fixed;inset:0;z-index:410;pointer-events:none;
  background:radial-gradient(ellipse at center,#ff99ff 0%,#bb00ff 35%,#4a0070 100%);opacity:0;}
#hw-flash.active{animation:hw-flash-anim .55s ease-out forwards}
@keyframes hw-flash-anim{
  0%  {opacity:0} 6%{opacity:1} 16%{opacity:.9}
  32% {opacity:.55} 58%{opacity:.2} 100%{opacity:0}}
#hw-flash.heavy{background:radial-gradient(ellipse at center,
  #ffffff 0%,#ee66ff 20%,#8800cc 55%,#1a0028 100%)}

#hw-msgbar{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);
  padding:9px 28px;z-index:450;pointer-events:none;display:none;
  font-family:'Courier New',monospace;font-size:17px;font-weight:700;
  color:#ee88ff;text-shadow:0 0 14px #cc44ff;letter-spacing:.06em;
  text-align:center;white-space:pre;
  background:rgba(6,0,14,.82);border:1px solid rgba(200,0,255,.35);
  border-radius:6px;max-width:90vw}
#hw-msgbar.active{display:block}
.hw-g{color:#ff66ff}

#hw-scream{position:fixed;inset:0;z-index:460;pointer-events:none;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:'Courier New',monospace;font-weight:900;
  letter-spacing:.14em;text-align:center;
  color:#ee88ff;text-shadow:0 0 40px #cc44ff,0 0 80px #9900cc;
  opacity:0;transition:opacity .18s}
#hw-scream.active{opacity:1}
#hw-scream .hw-scream-title{font-size:3.4rem;line-height:1.1;
  text-shadow:0 0 60px #cc44ff,0 0 120px #7700bb}
#hw-scream .hw-scream-sub{font-size:1.05rem;opacity:.72;
  margin-top:20px;letter-spacing:.24em}

#hw-victory{position:fixed;inset:0;z-index:500;display:none;
  background:rgba(4,0,10,.97);color:#cc44ff;
  font-family:'Courier New',monospace;
  flex-direction:column;align-items:center;justify-content:center;text-align:center}
#hw-victory.visible{display:flex}
#hw-victory h1{font-size:2.4rem;letter-spacing:.2em;
  text-shadow:0 0 30px #cc44ff;margin-bottom:16px}
#hw-victory p{font-size:1rem;opacity:.7;margin:6px 0}
#hw-victory .hw-vic-wave{font-size:.85rem;opacity:.5;margin-top:18px}
#hw-victory button{margin-top:36px;padding:12px 36px;
  background:rgba(180,0,255,.1);border:1px solid #cc44ff;
  border-radius:8px;color:#cc44ff;font-size:1rem;
  cursor:pointer;font-family:inherit;letter-spacing:.1em}
#hw-victory button:hover{background:rgba(180,0,255,.25)}`;
        document.head.appendChild(style);

        const ov = document.createElement('div');
        ov.id = 'hw-overlay';
        document.body.appendChild(ov);

        const fl = document.createElement('div');
        fl.id = 'hw-flash';
        document.body.appendChild(fl);

        const mb = document.createElement('div');
        mb.id = 'hw-msgbar';
        document.body.appendChild(mb);

        // Large screaming title card (new)
        const sc = document.createElement('div');
        sc.id = 'hw-scream';
        sc.innerHTML = `<div class="hw-scream-title"></div><div class="hw-scream-sub"></div>`;
        document.body.appendChild(sc);

        const vic = document.createElement('div');
        vic.id = 'hw-victory';
        vic.innerHTML = `
          <h1>[ PROTOCOL 777 — CLEARED ]</h1>
          <p>THE ARCHITECTS HAVE FALLEN.</p>
          <p>THE VOID IS SILENT.</p>
          <p class="hw-vic-wave"></p>
          <button onclick="location.reload()">RETURN TO REALITY</button>`;
        document.body.appendChild(vic);
    },

    // ── Activate ──────────────────────────────────────────────
    activate() {
        if (this.active) return;
        this._ensureDOM();

        this.active  = true;
        this.phase   = 'intro';
        this._pt     = 0;
        this._pt2    = 0;
        this._scanAmt      = 0;
        this._slices       = [];
        this._voidTears    = [];
        this._tearProgress = 0;
        this._bossEnemies  = [];
        this._bossSpawned  = false;
        this._bloodTint    = 0;
        this._pulseBeat    = 0;
        this._beatTimer    = 2.0;
        this._beatRate     = 2.0;
        this._surgeTimer   = 22;
        this._surgeCount   = 0;
        this._midWallFired = false;

        this._mult        = Math.max(7.5, (waveState.waveNum || 20) * 0.38);
        this._mapCorruptT = 0;
        this._corruptMsg  = '';
        this._corruptMsgT = 0;

        for (const e of HW_CORRUPT_SCHEDULE) e._fired = false;

        waveState.phase = 'hidden_wave';

        // ── Warp ramps up from 0 immediately on activate ───────
        this._zoomScale   = 1.0;
        this._zoomPhase   = 'out';
        this._zoomT       = 0;
        this._warpAmt     = 0;
        this._warpSustain = 0;

        // Music
        const hwMusic = document.getElementById('hw-hidden-music');
        if (hwMusic) {
            hwMusic.currentTime = 0;
            hwMusic.play().catch(() => {
                if (typeof audio !== 'undefined') audio.fadeToTrack('hidden', 1.0);
            });
        } else {
            if (typeof audio !== 'undefined') audio.fadeToTrack('hidden', 1.0);
        }

        const ov = document.getElementById('hw-overlay');
        if (ov) ov.classList.add('visible');

        // ── Activation storm: triple heavy flash + big shake ───
        game.shakeScreen(40, 2.2);
        this._heavyFlash();
        setTimeout(() => { if (this.active) this._flash(); },       280);
        setTimeout(() => { if (this.active) this._heavyFlash(); },  560);
        setTimeout(() => { if (this.active) this._flash(); },       840);

        // ── Large title card for 3.5s, then start pure-timer intro ───────────
        this._introLineIdx = 0;
        this._scream('P R O T O C O L   7 7 7', 'SYSTEM BREACH — 0x777', 3500);
    },

    // ── Reset / cleanup ───────────────────────────────────────
    reset() {
        this.active = false;
        this.phase  = 'idle';
        this._pt    = 0;
        this._pt2   = 0;
        this._scanAmt           = 0;
        this._slices            = [];
        this._voidTears         = [];
        this._tearProgress      = 0;
        this._bossEnemies       = [];
        this._bossSpawned       = false;
        this._bloodTint         = 0;
        this._pulseBeat         = 0;
        this._txt.phase         = 'done';
        this._txt.done          = [];
        this._txt.lines         = [];
        this._txt.rev           = 0;
        this._footerAlpha       = 0;
        this._zoomScale         = 1.0;
        this._zoomPhase         = 'idle';
        this._zoomT             = 0;
        this._warpAmt           = 0;
        this._warpSustain       = 0;
        this._mapCorruptT       = 0;
        this._corruptMsg        = '';
        this._corruptMsgT       = 0;
        this._architectDeathCount = 0;
        this._architectKillTime   = -1;
        this._creatorSpawned      = false;
        this._creatorPending      = false;
        this._creatorEnemy        = null;
        this._thrownSword         = null;
        this._introLineIdx        = 0;

        const hwMusic = document.getElementById('hw-hidden-music');
        if (hwMusic) { try { hwMusic.pause(); hwMusic.currentTime = 0; } catch(_){} }

        const mb = document.getElementById('hw-msgbar');
        if (mb) { mb.classList.remove('active'); mb.innerHTML = ''; }

        const sc = document.getElementById('hw-scream');
        if (sc) sc.classList.remove('active');

        const ov = document.getElementById('hw-overlay');
        if (ov) { ov.classList.remove('visible'); ov.classList.remove('dim'); }

        if (typeof audio !== 'undefined') audio.fadeToTrack('gameplay', 1.5);
    },

    // ── Flash helpers ─────────────────────────────────────────
    _flash() {
        const el = document.getElementById('hw-flash');
        if (!el) return;
        el.classList.remove('active', 'heavy');
        void el.offsetWidth;
        el.classList.add('active');
    },

    _heavyFlash() {
        const el = document.getElementById('hw-flash');
        if (!el) return;
        el.classList.remove('active', 'heavy');
        void el.offsetWidth;
        el.classList.add('active', 'heavy');
    },

    // ── Screaming big-text overlay ────────────────────────────
    _scream(titleText, subText, duration, cb) {
        const sc = document.getElementById('hw-scream');
        if (!sc) { if (cb) setTimeout(cb, 10); return; }
        const titleEl = sc.querySelector('.hw-scream-title');
        const subEl   = sc.querySelector('.hw-scream-sub');
        if (titleEl) titleEl.textContent = titleText;
        if (subEl)   subEl.textContent   = subText;
        sc.classList.add('active');
        setTimeout(() => {
            sc.classList.remove('active');
            if (cb) setTimeout(cb, 200);
        }, duration);
    },

    // ── Start typed text sequence ─────────────────────────────
    _startText(lines) {
        this._txt.phase = 'typing';
        this._txt.done  = [];
        this._txt.lines = lines;
        this._showMsgSequence(lines, () => { this._txt.phase = 'done'; });
    },

    _tickText(_dt) {
        return this._txt.phase === 'done';
    },

    // ── Enemy pick / spawn ────────────────────────────────────
    _pickType() {
        const tier = Math.min(Math.floor(this._hordeElapsed / 40), HW_HORDE_TIERS.length - 1);
        const pool = HW_HORDE_TIERS[tier];
        return pool[Math.floor(Math.random() * pool.length)];
    },

    _spawnOne(type, healthMult, speedMult = 1.0) {
        try {
            const tier = Math.min(Math.floor(this._hordeElapsed / 40), 2);
            const hm   = (this._mult || 8) * healthMult * (1 + tier * 0.42);
            const e    = new Enemy(type, hm);
            e.speed   *= speedMult;
            e._glitch  = true;
            game.enemies.push(e);
            waveState.enemiesAlive++;
        } catch (_) {}
    },

    // ── Footer ticker ─────────────────────────────────────────
    _tickFooter(dt) {
        if (this.phase !== 'horde' && this.phase !== 'boss') return;
        this._footerT += dt;
        const HOLD = 2.2, FADE = 0.42;
        if (this._footerPhase === 'fade_in') {
            this._footerAlpha = Math.min(1, this._footerAlpha + dt * 3.2);
            if (this._footerAlpha >= 1) { this._footerPhase = 'hold'; this._footerT = 0; }
        } else if (this._footerPhase === 'hold') {
            if (this._footerT > HOLD) { this._footerPhase = 'fade_out'; this._footerT = 0; }
        } else {
            this._footerAlpha = Math.max(0, this._footerAlpha - dt / FADE);
            if (this._footerAlpha <= 0) {
                this._footerPhase = 'fade_in';
                this._footerT = 0;
                this._footerIdx = (this._footerIdx + 1) % HW_HORDE_FOOTER.length;
            }
        }
    },

    // ── Void tears: jagged cracks from screen corners ─────────
    _updateVoidTears(dt) {
        if (this.phase !== 'horde' && this.phase !== 'boss') return;
        this._tearProgress = Math.min(1, this._tearProgress + dt * 0.007);

        // Spawn new tears (capped lower for performance)
        if (this._voidTears.length < 10 && Math.random() < dt * 0.7) {
            const corner = Math.floor(Math.random() * 4);
            this._voidTears.push({
                corner,
                progress: 0,
                maxLen:   0.28 + Math.random() * 0.38,
                speed:    0.005 + Math.random() * 0.011,
                segs:     this._genTearSegments(corner),
                alpha:    0,
                width:    1.2 + Math.random() * 2.6,
                pulse:    Math.random() * Math.PI * 2,
            });
        }

        for (let i = this._voidTears.length - 1; i >= 0; i--) {
            const t = this._voidTears[i];
            t.progress = Math.min(t.maxLen, t.progress + t.speed);
            t.alpha    = Math.min(0.78, t.alpha + dt * 0.7);
        }
    },

    _genTearSegments(corner) {
        const steps = 10 + Math.floor(Math.random() * 14);
        const segs  = [];
        let nx = 0, ny = 0;
        const dx = (corner % 2 === 0) ?  1 : -1;
        const dy = (corner < 2)       ?  1 : -1;
        for (let i = 0; i < steps; i++) {
            nx = Math.max(0, Math.min(1, nx + dx * (0.05 + Math.random() * 0.07) + (Math.random() - 0.5) * 0.055));
            ny = Math.max(0, Math.min(1, ny + dy * (0.05 + Math.random() * 0.07) + (Math.random() - 0.5) * 0.055));
            segs.push([nx, ny]);
        }
        return segs;
    },

    _drawVoidTears(ctx, W, H) {
        if (!this._voidTears.length) return;
        const now = Date.now();
        ctx.save();
        for (const t of this._voidTears) {
            if (!t.segs.length) continue;
            const revealCount = Math.ceil(t.segs.length * (t.progress / t.maxLen));
            if (revealCount < 1) continue;

            // Anchor at the actual corner pixel
            const ox = (t.corner % 2 === 0) ? 0 : W;
            const oy = (t.corner < 2)       ? 0 : H;

            const pulse = 0.55 + 0.45 * Math.sin(now * 0.0045 + t.pulse);
            ctx.globalAlpha = t.alpha * pulse;
            ctx.shadowBlur  = 0;  // no per-tear shadow — too costly at scale
            ctx.strokeStyle = '#5500aa';
            ctx.lineWidth   = t.width;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            for (let i = 0; i < revealCount; i++) {
                const [nx, ny] = t.segs[i];
                const sx = (t.corner % 2 === 0) ? nx * W : W - nx * W;
                const sy = (t.corner < 2)       ? ny * H : H - ny * H;
                ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            // Bright inner filament
            ctx.globalAlpha = t.alpha * pulse * 0.5;
            ctx.strokeStyle = '#cc55ff';
            ctx.lineWidth   = t.width * 0.28;
            ctx.stroke();
        }
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ── Heartbeat void pulse ──────────────────────────────────
    _updatePulse(dt) {
        if (this.phase !== 'horde' && this.phase !== 'boss') return;
        this._beatTimer -= dt;
        if (this._beatTimer <= 0) {
            this._pulseBeat = 1.0;
            this._beatRate  = Math.max(0.45, 2.0 - this._hordeElapsed * 0.016);
            this._beatTimer = this._beatRate;
        }
        this._pulseBeat = Math.max(0, this._pulseBeat - dt * 4.0);
    },

    _drawVoidPulse(ctx, W, H) {
        if (this._pulseBeat <= 0) return;
        const t = 1 - this._pulseBeat;
        const r = Math.min(W, H) * (0.04 + t * 1.5);
        ctx.save();
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
        g.addColorStop(0,    `rgba(210,0,255,${this._pulseBeat * 0.22})`);
        g.addColorStop(0.40, `rgba(140,0,210,${this._pulseBeat * 0.15})`);
        g.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    },

    // ── Warp — persistent zoom effect that stays visible ──────
    _tickZoom(dt) {
        if (this._zoomPhase === 'out') {
            // Phase 1: ramp up from 0 → 1 over 2.4 seconds
            this._zoomT += dt;
            const RAMP = 2.4;
            if (this._zoomT < RAMP) {
                const p = this._zoomT / RAMP;
                this._warpAmt = Math.pow(p, 0.50);   // fast start, eases to peak
            } else {
                // ── Reached peak: hold, then decay to sustained level ──
                this._zoomPhase = 'peak';
                this._zoomT     = 0;
                this._warpAmt   = 1.0;
                if (typeof game !== 'undefined') game.shakeScreen(60, 2.8);
                this._heavyFlash();
                setTimeout(() => { if (this.active) this._flash(); },       90);
                setTimeout(() => { if (this.active) this._heavyFlash(); }, 180);
                setTimeout(() => { if (this.active) this._flash(); },      320);
                this._beepImpact();
            }
        } else if (this._zoomPhase === 'peak') {
            // Phase 2: hold full warp for 1.2s, then decay over 2.8s to sustained level
            this._zoomT += dt;
            if (this._zoomT < 1.2) {
                this._warpAmt = 1.0;
            } else {
                const fade = Math.min(1, (this._zoomT - 1.2) / 2.8);
                this._warpAmt = 1.0 - fade * 0.50;   // 1.0 → 0.50
                if (fade >= 1) {
                    this._warpSustain = 0.50;
                    this._zoomPhase   = 'sustained';
                }
            }
        } else if (this._zoomPhase === 'sustained') {
            // Phase 3: maintain strong breathing warp throughout horde/boss
            if (this.phase === 'horde' || this.phase === 'boss') {
                this._warpSustain = Math.min(0.62, this._warpSustain + dt * 0.020);
            } else if (this.phase === 'intro') {
                // Keep strong warp during intro — don't let it fade out
                this._warpSustain = Math.max(0.44, Math.min(0.52, this._warpSustain));
            } else {
                this._warpSustain = Math.max(0, this._warpSustain - dt * 0.12);
            }
            const breath  = 0.80 + 0.20 * Math.sin(this._pt * 0.38);
            this._warpAmt = this._warpSustain * breath;
        }
    },

    // ── Main update tick ──────────────────────────────────────
    tick(dt) {
        if (!this.active) return;

        this._pt     += dt;
        this._scanAmt = Math.min(1, this._scanAmt + dt * 1.2);

        this._tickZoom(dt);
        this._updateVoidTears(dt);
        this._updatePulse(dt);

        if (this._corruptMsgT > 0) this._corruptMsgT -= dt;

        if (this.phase === 'horde' || this.phase === 'boss') {
            this._mapCorruptT += dt;
            this._tickMapCorrupt();
        }

        // Blood tint builds during boss, fades otherwise
        if (this.phase === 'boss') {
            this._bloodTint = Math.min(1, this._bloodTint + dt * 0.04);
        } else {
            this._bloodTint = Math.max(0, this._bloodTint - dt * 0.22);
        }

        // Glitch slices — more frequent
        this._sliceT -= dt;
        if (this._sliceT <= 0) {
            this._sliceT = 0.02 + Math.random() * 0.15;
            if (Math.random() < 0.58) {
                this._slices.push({
                    yN:   Math.random(),
                    hN:   0.003 + Math.random() * 0.034,
                    xOff: (Math.random() - 0.5) * 0.1,
                    life: 0.025 + Math.random() * 0.095,
                    tint: Math.random() < 0.28,
                    cyan: Math.random() < 0.18,
                });
            }
        }
        for (let i = this._slices.length - 1; i >= 0; i--) {
            this._slices[i].life -= dt;
            if (this._slices[i].life <= 0) this._slices.splice(i, 1);
        }

        // Tick corruption buffs on towers
        if (typeof game !== 'undefined') {
            for (const t of game.towers) {
                if (t._corruptBuf) {
                    t._corruptBuf.timer -= dt;
                    if (t._corruptBuf.timer <= 0) {
                        t._corruptBuf.restore();
                        t._corruptBuf = null;
                    }
                }
            }
        }

        this._tickFooter(dt);

        switch (this.phase) {
            case 'intro':      this._doIntro(dt);      break;
            case 'horde':      this._doHorde(dt);      break;
            case 'boss_intro': this._doBossIntro(dt);  break;
            case 'boss':       this._doBoss(dt);       break;
            case 'victory':    this._doVictory(dt);    break;
        }
    },

    // ── Phase: intro ──────────────────────────────────────────
    // Pure timer-driven: no dependency on music playback or text-type state.
    // Lines appear at fixed seconds after activate(); horde launches at 15s.
    _doIntro(dt) {
        const mb = document.getElementById('hw-msgbar');

        // Show staggered intro lines (indices into HW_INTRO_LINES)
        const LINE_SHOW = [2, 4, 6, 8];
        const LINE_TIMES = [4.5, 7.0, 9.5, 12.0];
        for (let i = 0; i < LINE_SHOW.length; i++) {
            if (this._introLineIdx <= i && this._pt >= LINE_TIMES[i]) {
                this._introLineIdx = i + 1;
                if (mb) {
                    mb.classList.add('active');
                    mb.textContent = HW_INTRO_LINES[LINE_SHOW[i]] || '';
                }
                this._flash();
            }
        }

        // Clear message bar just before horde launches
        if (this._pt >= 14.0 && mb && mb.classList.contains('active')) {
            mb.classList.remove('active');
            mb.innerHTML = '';
        }

        // Launch horde at 15 seconds, no music/text dependency
        if (this._pt >= 15.0) {
            this.phase         = 'horde';
            this._pt           = 0;
            this._hordeElapsed = 0;
            this._spawnTimer   = 0.5;
            this._surgeTimer   = 22;
            this._surgeCount   = 0;
            this._midWallFired = false;

            if (mb) { mb.classList.remove('active'); mb.innerHTML = ''; }
            this._heavyFlash();
            game.shakeScreen(22, 1.2);
            this._scream('T H E Y   A R E   H E R E', 'WAVE 777 — INCOMING', 1800, () => {
                const ov = document.getElementById('hw-overlay');
                if (ov) ov.classList.add('dim');
            });
        }
    },

    // ── Phase: horde ──────────────────────────────────────────
    _doHorde(dt) {
        this._hordeElapsed += dt;
        this._spawnTimer   -= dt;
        this._surgeTimer   -= dt;

        // ── Regular spawn — aggressive escalation ─────────────
        if (this._spawnTimer <= 0) {
            // Enemies per tick: starts at 3, ramps to 9
            const count    = 3 + Math.floor(this._hordeElapsed / 22);
            const interval = Math.max(0.28, 1.7 - this._hordeElapsed * 0.009);
            this._spawnTimer = interval;

            for (let i = 0; i < count; i++) this._spawnOne(this._pickType(), 1.0);

            // Fast flanker
            if (Math.random() < 0.35) this._spawnOne('scout', 0.65, 1.8);

            // Void swarm bursts
            if (Math.random() < 0.32 && this._hordeElapsed > 15) {
                const pack = 3 + Math.floor(this._hordeElapsed / 28);
                for (let i = 0; i < pack; i++) this._spawnOne('void_swarm', 1.0, 1.3);
            }

            // Heavies at phase 2
            if (this._hordeElapsed > 40 && Math.random() < 0.22) {
                this._spawnOne('juggernaut', 1.0, 0.9);
            }
        }

        // ── SURGE: massive wave every ~22–35s ─────────────────
        if (this._surgeTimer <= 0) {
            this._surgeCount++;
            const surgeSize = 14 + this._surgeCount * 5;

            this._scream(
                `S U R G E   # ${this._surgeCount}`,
                `${surgeSize}  ENTITIES  INBOUND`,
                1500
            );
            this._flash();
            game.shakeScreen(24, 1.4);

            for (let i = 0; i < surgeSize; i++) {
                setTimeout(() => {
                    if (!this.active || this.phase !== 'horde') return;
                    const t = i < 5 ? 'void_swarm' : this._pickType();
                    this._spawnOne(t, 1.1 + this._surgeCount * 0.12);
                }, i * 240);
            }

            // Guaranteed heavy at the back of the surge
            setTimeout(() => {
                if (!this.active || this.phase !== 'horde') return;
                this._spawnOne('void_wraith', 1.5, 1.1);
                if (this._surgeCount >= 2) this._spawnOne('overlord', 1.3);
                if (this._surgeCount >= 3) this._spawnOne('void_wraith', 1.6, 0.9);
            }, 900);

            this._surgeTimer = 22 + Math.random() * 13;
        }

        // ── Mid-point juggernaut wall at 45s ──────────────────
        if (this._hordeElapsed >= 45 && !this._midWallFired) {
            this._midWallFired = true;
            this._scream('J U G G E R N A U T   W A L L', '— BRACE  YOURSELF —', 1800);
            this._heavyFlash();
            game.shakeScreen(30, 1.8);
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (!this.active) return;
                    this._spawnOne('juggernaut', 1.3);
                }, i * 1000);
            }
        }

        // ── Transition to boss at 85s ──────────────────────────
        if (this._hordeElapsed >= 85) {
            this.phase = 'boss_intro';
            this._pt   = 0;
            this._pt2  = 0;
            this._heavyFlash();
            game.shakeScreen(22, 1.6);
            const ov = document.getElementById('hw-overlay');
            if (ov) { ov.classList.remove('dim'); ov.classList.add('visible'); }
            this._startText(HW_BOSS_INTRO_LINES);
        }
    },

    // ── Phase: boss_intro ─────────────────────────────────────
    _doBossIntro(dt) {
        const done = this._tickText(dt);
        if (!done) return;

        this._pt2 += dt;
        if (this._pt2 > 2.0) {
            this._pt2 = 0;
            this.phase = 'boss';
            this._pt   = 0;

            this._heavyFlash();
            game.shakeScreen(32, 2.0);

            const ov = document.getElementById('hw-overlay');
            if (ov) ov.classList.add('dim');

            game.enemies.length    = 0;
            waveState.enemiesAlive = 0;

            this._doSpawnBosses();
        }
    },

    // ── Spawn the Architects ──────────────────────────────────
    _doSpawnBosses() {
        const bm = this._mult * 2.2;

        // ── Architect I ────────────────────────────────────────
        const b1       = new Enemy('void_god', bm);
        b1._glitch     = true;
        b1._glitchBoss = true;
        b1._bossLabel  = '\u2620 T H E   A R C H I T E C T   I';
        b1.color       = '#aa33ff';
        game.enemies.push(b1);
        waveState.enemiesAlive++;
        this._bossEnemies.push(b1);
        game.shakeScreen(20, 1.0);

        this._scream('A R C H I T E C T   I', 'VOID SORCERER  —  AWAKENED', 2000);

        // ── Architect II: 7 seconds later ─────────────────────
        setTimeout(() => {
            if (!this.active || this.phase !== 'boss') return;
            const b2       = new Enemy('void_titan', bm * 1.35);
            b2._glitch     = true;
            b2._glitchBoss = true;
            b2._bossLabel  = '\u2620 T H E   A R C H I T E C T   I I';
            b2.color       = '#c044ff';
            game.enemies.push(b2);
            waveState.enemiesAlive++;
            this._bossEnemies.push(b2);
            game.shakeScreen(26, 1.4);
            this._heavyFlash();
            this._scream('A R C H I T E C T   I I', 'VOID GOLEM  —  INDESTRUCTIBLE', 2200);
        }, 7000);

        // ── Relentless escort waves ────────────────────────────
        const escortSchedule = [
            { delay: 12000, count: 5, types: ['juggernaut', 'void_wraith', 'brute'] },
            { delay: 25000, count: 7, types: ['void_wraith', 'phantom', 'overlord'] },
            { delay: 40000, count: 9, types: ['void_wraith', 'void_swarm', 'juggernaut', 'overlord'] },
            { delay: 58000, count: 7, types: ['overlord', 'phantom', 'void_wraith', 'juggernaut'] },
        ];
        for (const wave of escortSchedule) {
            setTimeout(() => {
                if (!this.active || this.phase !== 'boss') return;
                this._flash();
                game.shakeScreen(12, 0.5);
                for (let i = 0; i < wave.count; i++) {
                    setTimeout(() => {
                        if (!this.active || this.phase !== 'boss') return;
                        this._spawnOne(wave.types[i % wave.types.length], 1.2);
                    }, i * 700);
                }
            }, wave.delay);
        }

        // ── Void swarm blasts every 18s ────────────────────────
        for (let w = 0; w < 5; w++) {
            setTimeout(() => {
                if (!this.active || this.phase !== 'boss') return;
                for (let i = 0; i < 9; i++) this._spawnOne('void_swarm', 1.0, 1.4);
                game.shakeScreen(7, 0.3);
            }, 10000 + w * 18000);
        }
    },

    // ── Phase: boss ───────────────────────────────────────────
    _doBoss(dt) {
        const architects = this._bossEnemies.filter(
            e => e.type === 'void_god' || e.type === 'void_titan'
        );
        if (architects.length < 2) return;

        // ── Track architect deaths → spawn The Creator ─────────
        const deadNow = architects.filter(e => e.isDead).length;
        while (this._architectDeathCount < deadNow) {
            if (this._architectDeathCount === 0) {
                this._architectKillTime = Date.now();
            } else if (!this._creatorSpawned) {
                const elapsed = (Date.now() - this._architectKillTime) / 1000;
                if (elapsed <= 90) {
                    this._creatorSpawned = true;
                    this._creatorPending = true;
                    this._startText([
                        '> . . .',
                        '',
                        '> T H E R E   I S   O N E   M O R E .',
                        '',
                        '> H E   M A D E   T H E   V O I D .',
                    ]);
                    setTimeout(() => this._spawnCreator(), 4500);
                }
            }
            this._architectDeathCount++;
        }

        // ── Creator mechanics ──────────────────────────────────
        const ce = this._creatorEnemy;
        if (ce && !ce.isDead) this._tickCreator(dt, ce);

        // Tick thrown sword
        if (this._thrownSword) {
            this._thrownSword.t += dt;
            if (this._thrownSword.t >= this._thrownSword.dur + 0.3) this._thrownSword = null;
        }

        // Victory check
        const anyBossAlive  = this._bossEnemies.some(e => !e.isDead);
        const anyGlitchLeft = game.enemies.some(e => e._glitch && !e.isDead);
        if (!anyBossAlive && !anyGlitchLeft && !this._creatorPending) this._triggerVictory();
    },

    // ── Spawn The Creator ─────────────────────────────────────
    _spawnCreator() {
        if (!this.active) return;
        this._creatorPending = false;

        game.shakeScreen(55, 3.2);
        this._heavyFlash();
        for (let i = 1; i <= 5; i++) {
            setTimeout(() => { if (this.active) this._flash(); }, i * 140);
        }
        this._scream('T H E   C R E A T O R', 'THE VOID  GIVEN  FORM', 2800);

        const ce = new Enemy('creator', this._mult * 5.0);
        ce._glitch               = true;
        ce._glitchBoss           = true;
        ce._bossLabel            = '\u2020 T H E   C R E A T O R';
        ce._immuneToStun         = true;
        ce._armorPhase           = 'normal';
        ce._armorPhaseTriggered  = false;
        ce._armorTimer           = 0;
        ce._invulnerable         = false;
        ce._creatorStopped       = false;
        // ── Sword throw ────────────────────────────────────────
        ce._swordCooldown        = 7.0;   // first sword throw at 7s
        ce._swordTarget          = null;
        ce._preThrowPhase        = 'normal';
        // ── Ground slam ────────────────────────────────────────
        ce._slamCooldown         = 20.0;  // first slam at 20s
        ce._slamWindup           = false;
        ce._slamWindupT          = 0;
        // ── Rune barrier ───────────────────────────────────────
        ce._barrierCooldown      = 22.0;  // first barrier at 22s
        ce._barrierActive        = false;
        ce._barrierMaterializing = false;
        ce._barrierMatT          = 0;
        ce._barrierDur           = 0;
        ce._shielded             = false;
        game.enemies.push(ce);
        waveState.enemiesAlive++;
        this._creatorEnemy = ce;
        this._bossEnemies.push(ce);
    },

    // ── Creator AI: sword throw, ground slam, rune barrier, enrage ──
    _tickCreator(dt, ce) {
        ce.stunTimer = 0;  // always stun-immune
        const enraged = ce._armorPhase === 'enraged';
        const busy    = ce._armorPhase === 'arming' || ce._armorPhase === 'throwing'
                     || ce._armorPhase === 'warning' || ce._armorPhase === 'slam_windup';

        // ════════════════════════════════════════════════════════
        //  ABILITY 1 — Sword throw (warn → fly → impact)
        // ════════════════════════════════════════════════════════
        ce._swordCooldown -= dt;
        if (ce._swordCooldown <= 0 && !busy && !ce._barrierActive && typeof game !== 'undefined') {
            const towers = game.towers;
            if (towers.length > 0) {
                let nearest = null, nearDist = Infinity;
                for (const t of towers) {
                    const d = Math.hypot(t.x - ce.x, t.y - ce.y);
                    if (d < nearDist) { nearDist = d; nearest = t; }
                }
                if (nearest) {
                    ce._preThrowPhase = ce._armorPhase;
                    ce._armorPhase    = 'warning';
                    ce._swordTarget   = nearest;
                    // Warn phase — target indicator only; sword stays on body
                    this._thrownSword = {
                        phase: 'warn', phaseT: 0,
                        cx: ce.x, cy: ce.y,
                        tx: nearest.x, ty: nearest.y,
                        t: 0, dur: 0.95,
                    };
                    game.shakeScreen(7, 0.3);
                }
            }
        }

        // Advance sword throw phases
        if (this._thrownSword) {
            const sw = this._thrownSword;
            sw.phaseT = (sw.phaseT || 0) + dt;
            sw.t      = (sw.t      || 0) + dt;

            if (sw.phase === 'warn') {
                // Update origin each frame so it tracks the Creator as it walks
                sw.cx = ce.x; sw.cy = ce.y;
                if (sw.phaseT >= 0.72) {
                    sw.phase  = 'fly';
                    sw.phaseT = 0;
                    ce._armorPhase = 'throwing';  // hide sword from body
                    game.shakeScreen(16, 0.6);
                    this._flash();
                }
            } else if (sw.phase === 'fly') {
                if (sw.phaseT >= sw.dur) {
                    sw.phase  = 'impact';
                    sw.phaseT = 0;
                    // Destroy the target tower
                    if (ce._swordTarget) {
                        const idx = game.towers.indexOf(ce._swordTarget);
                        if (idx !== -1) {
                            game.towers.splice(idx, 1);
                            try { spawnDeathParticles(ce._swordTarget.x, ce._swordTarget.y, '#ff8000', 30); } catch(_) {}
                        }
                        ce._swordTarget = null;
                    }
                    ce._armorPhase    = ce._preThrowPhase || 'normal';
                    ce._swordCooldown = enraged ? (5 + Math.random()*3) : (10 + Math.random()*4);
                    game.shakeScreen(28, 1.8);
                    this._heavyFlash();
                    try { spawnAoeRing(sw.tx, sw.ty, 55, '#ff8000'); } catch(_) {}
                }
            } else {  // impact
                if (sw.phaseT >= 0.38) this._thrownSword = null;
            }
        }

        // ════════════════════════════════════════════════════════
        //  ABILITY 2 — Ground slam (wind-up → shockwave)
        // ════════════════════════════════════════════════════════
        ce._slamCooldown -= dt;
        if (ce._slamCooldown <= 0 && !busy && !ce._barrierActive && typeof game !== 'undefined') {
            ce._armorPhase  = 'slam_windup';
            ce._slamWindup  = true;
            ce._slamWindupT = 0;
            game.shakeScreen(10, 0.5);
        }
        if (ce._armorPhase === 'slam_windup') {
            ce._slamWindupT = (ce._slamWindupT || 0) + dt;
            if (ce._slamWindupT >= 0.58) {
                const stunDur = enraged ? 3.4 : 2.4;
                const RANGE   = 200;
                for (const t of game.towers) {
                    if (Math.hypot(t.x - ce.x, t.y - ce.y) < RANGE) {
                        t._stunTimer = Math.max(t._stunTimer || 0, stunDur);
                    }
                }
                ce._armorPhase   = enraged ? 'enraged' : 'normal';
                ce._slamWindup   = false;
                ce._slamWindupT  = 0;
                ce._slamCooldown = enraged ? (12 + Math.random()*5) : (20 + Math.random()*8);
                game.shakeScreen(35, 2.4);
                this._flash();
                try { spawnAoeRing(ce.x, ce.y, RANGE, '#ff7700'); } catch(_) {}
                try { spawnTextFloat(ce.x, ce.y - ce.size * 1.2, 'GROUND SLAM!', '#ff8800'); } catch(_) {}
            }
        }

        // ════════════════════════════════════════════════════════
        //  ABILITY 3 — Rune barrier (materialise → invulnerable)
        // ════════════════════════════════════════════════════════
        if (!ce._barrierMaterializing && !ce._barrierActive) {
            ce._barrierCooldown -= dt;
            if (ce._barrierCooldown <= 0 && !busy) {
                ce._barrierMaterializing = true;
                ce._barrierMatT          = 0;
                game.shakeScreen(6, 0.3);
            }
        }
        if (ce._barrierMaterializing) {
            ce._barrierMatT = (ce._barrierMatT || 0) + dt;
            if (ce._barrierMatT >= 0.82) {
                ce._barrierMaterializing = false;
                ce._barrierActive        = true;
                ce._barrierDur           = enraged ? 2.0 : 3.2;
                ce._shielded             = true;
                ce._invulnerable         = true;
                this._flash();
            }
        }
        if (ce._barrierActive) {
            ce._barrierDur -= dt;
            if (ce._barrierDur <= 0) {
                ce._barrierActive   = false;
                ce._shielded        = false;
                if (ce._armorPhase !== 'arming') ce._invulnerable = false;
                ce._barrierCooldown = enraged ? (15 + Math.random()*6) : (28 + Math.random()*10);
            }
        }

        // ════════════════════════════════════════════════════════
        //  ENRAGE at 35% HP
        // ════════════════════════════════════════════════════════
        if (!ce._armorPhaseTriggered && ce.health / ce.maxHealth < 0.35) {
            ce._armorPhaseTriggered = true;
            ce._armorPhase     = 'arming';
            ce._armorTimer     = 2.8;
            ce._invulnerable   = true;
            ce._creatorStopped = true;
            game.shakeScreen(44, 2.6);
            this._heavyFlash();
            this._scream('E N R A G E D', 'THE CREATOR WILL NOT FALL', 2600);
        }
        if (ce._armorPhase === 'arming') {
            ce._armorTimer -= dt;
            if (ce._armorTimer <= 0) {
                ce._armorPhase     = 'enraged';
                ce._invulnerable   = ce._barrierActive;
                ce._creatorStopped = false;
                // Hard-cap speed at 26 — no ludicrous dash
                ce.speed = Math.min(26, ce.speed * 1.55);
                ce.armor = Math.min(0.50, (ce.armor || 0.30) + 0.20);
                game.shakeScreen(62, 4.5);
                this._heavyFlash();
                for (let i = 1; i <= 5; i++) {
                    setTimeout(() => { if (this.active) this._flash(); }, i * 110);
                }
            }
        }
    },

    // ── Trigger victory ───────────────────────────────────────
    _triggerVictory() {
        if (this.phase === 'victory') return;
        this.phase = 'victory';
        this._pt   = 0;
        this._pt2  = 0;

        game.enemies.forEach(e => { e.isDead = true; });
        game.shakeScreen(22, 2.5);
        this._flash();

        if (typeof audio !== 'undefined') audio.fadeToTrack('victory', 1.5);

        const ov = document.getElementById('hw-overlay');
        if (ov) { ov.classList.remove('dim'); ov.classList.add('visible'); }

        this._startText(HW_VICTORY_LINES);
    },

    _doVictory(dt) {
        if (!this._tickText(dt)) return;
        this._pt2 += dt;
        if (this._pt2 > 3.5) { this._pt2 = 0; _showHiddenVictory(); }
    },

    // ═══════════════════════════════════════════════════════════
    //  DRAWING
    // ═══════════════════════════════════════════════════════════
    draw(ctx, W, H) {
        if (!this.active) return;
        ctx.save();
        const now = Date.now();

        // 1. Scanlines
        const scanI = this.phase === 'boss' ? 0.18 : 0.10;
        if (this._scanAmt > 0) {
            ctx.globalAlpha = scanI * this._scanAmt;
            ctx.fillStyle   = '#000';
            for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);  // sparser for perf
            ctx.globalAlpha = 1;
        }

        // 2. Horizontal glitch tears
        for (const s of this._slices) {
            ctx.save();
            if (s.tint) {
                ctx.globalAlpha = 0.55;
                ctx.fillStyle   = 'rgba(180,0,255,0.15)';
                ctx.fillRect(0, s.yN * H, W, s.hN * H);
            } else if (s.cyan) {
                ctx.globalAlpha = 0.45;
                ctx.fillStyle   = 'rgba(80,0,255,0.1)';
                ctx.fillRect(s.xOff * W * 0.5, s.yN * H, W * 0.7, s.hN * H);
            } else {
                ctx.globalAlpha = 0.65;
                ctx.fillStyle   = '#07000a';
                ctx.fillRect(s.xOff * W, s.yN * H, W, s.hN * H);
            }
            ctx.restore();
        }

        // 3. Corner corruption pixels (reduced for performance)
        if (this.phase === 'horde' || this.phase === 'boss') {
            ctx.globalAlpha = 0.5 * this._scanAmt;
            const numPx = this.phase === 'boss' ? 6 : 4;
            for (let ci = 0; ci < numPx; ci++) {
                const cx = (ci % 2 === 0 ? 0 : W - 40) + Math.random() * 36;
                const cy = Math.random() < 0.5 ? Math.random() * 24 : H - Math.random() * 24;
                ctx.fillStyle = Math.random() < 0.5 ? '#cc44ff' : '#ff0088';
                ctx.fillRect(cx, cy, 4 * (1 + Math.random() * 3), 2);
            }
            ctx.globalAlpha = 1;
        }

        // 4. Deep purple vignette — grows as horde escalates
        if (this.phase === 'horde' || this.phase === 'boss') {
            const vigScale = this.phase === 'boss' ? 1.9
                           : (1.0 + Math.min(1, this._hordeElapsed / 55));
            const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.86);
            v.addColorStop(0, 'rgba(0,0,0,0)');
            v.addColorStop(1, `rgba(${this.phase === 'boss' ? 22 : 14},0,${this.phase === 'boss' ? 40 : 26},${0.54 * vigScale * this._scanAmt})`);
            ctx.fillStyle = v;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;

            this._drawChromaticFringe(ctx, W, H);

            if (Math.random() < 0.03) {
                ctx.globalAlpha = 0.07 * Math.random();
                ctx.fillStyle   = 'rgba(180,0,255,.2)';
                ctx.fillRect(0, 0, W, H);
                ctx.globalAlpha = 1;
            }
        }

        // 5. Boss blood tint — pulsing red
        if (this._bloodTint > 0) {
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.0033);
            ctx.globalAlpha = this._bloodTint * 0.11 * pulse;
            ctx.fillStyle   = 'rgba(200,0,20,1)';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // 6. Void tears from corners
        this._drawVoidTears(ctx, W, H);

        // 7. Heartbeat void pulse
        this._drawVoidPulse(ctx, W, H);

        // 8. Footer cryptic message
        if ((this.phase === 'horde' || this.phase === 'boss') && this._footerAlpha > 0) {
            this._drawFooter(ctx, W, H);
        }

        // 9. Boss health bars
        if (this.phase === 'boss' && this._bossEnemies.length) {
            this._drawBossHealth(ctx, W, H);
        }

        // 10. Thrown Creator sword
        if (this._thrownSword) this._drawThrownSword(ctx);

        // 11. Corruption banner
        if (this._corruptMsgT > 0 && this._corruptMsg) {
            this._drawCorruptBanner(ctx, W, H);
        }

        // 12. Phase label
        this._drawPhaseLabel(ctx, W, H);

        // 13. Protocol 777 tag (top-right)
        this._drawProtocolTag(ctx, W, H, now);

        ctx.restore();
    },

    // ── Protocol 777 tag ─────────────────────────────────────
    _drawProtocolTag(ctx, W, H, now) {
        const alpha  = 0.35 + 0.25 * Math.sin(now * 0.003);
        const glitch = Math.random() < 0.06;
        ctx.save();
        ctx.globalAlpha  = alpha;
        ctx.font         = '700 10px "Courier New", monospace';
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle    = '#cc44ff';
        ctx.shadowColor  = '#cc44ff';
        ctx.shadowBlur   = 7;
        ctx.fillText(glitch ? '[ P\u0354R\u0336O\u0338T\u0337O\u0337C\u0354O\u0354L\u0336 777 ]' : '[ PROTOCOL 777 ]', W - 18, 60);
        ctx.shadowBlur   = 0;
        ctx.restore();
    },

    // ── Chromatic fringe on screen edges ─────────────────────
    _drawChromaticFringe(ctx, W, H) {
        const str = 0.058 * this._scanAmt;
        const gl  = ctx.createLinearGradient(0, 0, 46, 0);
        gl.addColorStop(0, `rgba(255,0,0,${str})`);
        gl.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, 56, H);

        const gr = ctx.createLinearGradient(W, 0, W - 46, 0);
        gr.addColorStop(0, `rgba(0,80,255,${str})`);
        gr.addColorStop(1, 'rgba(0,80,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(W - 56, 0, 56, H);
    },

    // ── Footer cryptic message ────────────────────────────────
    _drawFooter(ctx, W, H) {
        const msg = HW_HORDE_FOOTER[this._footerIdx % HW_HORDE_FOOTER.length];
        ctx.save();
        ctx.globalAlpha  = this._footerAlpha * 0.82;
        ctx.font         = '600 12px "Courier New", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle    = '#cc44ff';
        ctx.shadowColor  = '#cc44ff';
        ctx.shadowBlur   = 16;
        ctx.fillText(`[ ${msg} ]`, W / 2, H - 86);
        ctx.shadowBlur   = 0;
        ctx.restore();
    },

    // ── Thrown Creator sword — spear-throw style ─────────────
    _drawThrownSword(ctx) {
        const sw = this._thrownSword;
        if (!sw) return;

        // ── WARN phase: pulsing target-lock ring at destination ──
        if (sw.phase === 'warn') {
            const wp    = (sw.phaseT || 0) / 0.72;
            const flash = 0.5 + 0.5 * Math.sin((sw.phaseT || 0) * Math.PI * 9);
            const r     = 32 + (1 - wp) * 18;
            ctx.save();
            ctx.globalAlpha  = (0.55 + 0.35 * flash) * Math.min(1, wp * 3);
            ctx.strokeStyle  = '#ff4400';
            ctx.shadowColor  = '#ff6600'; ctx.shadowBlur = 20;
            ctx.lineWidth    = 3.0;
            ctx.setLineDash([7, 5]);
            ctx.beginPath(); ctx.arc(sw.tx, sw.ty, r, 0, Math.PI * 2); ctx.stroke();
            // Cross-hair lines
            ctx.setLineDash([]);
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(sw.tx - r - 6, sw.ty); ctx.lineTo(sw.tx - r + 10, sw.ty);
            ctx.moveTo(sw.tx + r - 10, sw.ty); ctx.lineTo(sw.tx + r + 6, sw.ty);
            ctx.moveTo(sw.tx, sw.ty - r - 6); ctx.lineTo(sw.tx, sw.ty - r + 10);
            ctx.moveTo(sw.tx, sw.ty + r - 10); ctx.lineTo(sw.tx, sw.ty + r + 6);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = (0.80 + 0.18 * flash) * Math.min(1, wp * 4);
            ctx.fillStyle   = '#ff5500';
            ctx.font        = 'bold 11px "Courier New"';
            ctx.textAlign   = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText('\u26a0 TARGET LOCKED', sw.tx, sw.ty - r - 8);
            ctx.restore();
            return;
        }

        // ── IMPACT phase: shockwave flash at landing point ───────
        if (sw.phase === 'impact') {
            const ip = (sw.phaseT || 0) / 0.38;
            ctx.save();
            ctx.globalAlpha = (1 - ip) * 0.88;
            ctx.strokeStyle = '#ff8000';
            ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 28;
            ctx.lineWidth   = 3.5 - ip * 2.5;
            ctx.beginPath(); ctx.arc(sw.tx, sw.ty, 16 + ip * 58, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = (1 - ip) * 0.45;
            ctx.lineWidth   = 1.5;
            ctx.beginPath(); ctx.arc(sw.tx, sw.ty, 8 + ip * 30, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
            return;
        }

        // ── FLY phase: sword travels tip-first, ~1 rotation ──────
        const p   = Math.min(1, (sw.phaseT || 0) / sw.dur);
        // Slight upward arc and come down (height proportional to distance)
        const dist = Math.hypot(sw.tx - sw.cx, sw.ty - sw.cy);
        const arcH = Math.min(50, dist * 0.12);
        const sx  = sw.cx + (sw.tx - sw.cx) * p;
        const sy  = sw.cy + (sw.ty - sw.cy) * p - Math.sin(p * Math.PI) * arcH;

        // Angle: aimed tip-first toward target + ~1.8 rotation over full flight
        const travelAng = Math.atan2(sw.ty - sw.cy, sw.tx - sw.cx);
        const spinAng   = travelAng + Math.PI / 2 + p * Math.PI * 1.8;

        ctx.save();

        // Comet trail (5 ghost copies fading behind)
        for (let i = 5; i >= 1; i--) {
            const tp  = Math.max(0, p - i * 0.055);
            const trX = sw.cx + (sw.tx - sw.cx) * tp;
            const trY = sw.cy + (sw.ty - sw.cy) * tp - Math.sin(tp * Math.PI) * arcH;
            const tAng = travelAng + Math.PI / 2 + tp * Math.PI * 1.8;
            ctx.save();
            ctx.translate(trX, trY);
            ctx.rotate(tAng);
            ctx.globalAlpha = (0.38 - i * 0.06) * (1 - p * 0.5);
            ctx.strokeStyle = i < 3 ? '#ffcc00' : '#ff6600';
            ctx.lineWidth   = 5 - i * 0.7;
            ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 14); ctx.stroke();
            ctx.restore();
        }

        // The sword itself at current position
        ctx.translate(sx, sy);
        ctx.rotate(spinAng);
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 26;
        // Blade (tapered: wide near guard, narrow tip)
        ctx.fillStyle = '#c8c8d8';
        ctx.beginPath();
        ctx.moveTo(-5,  14); ctx.lineTo(5,  14);
        ctx.lineTo(2, -28); ctx.lineTo(-2, -28);
        ctx.closePath(); ctx.fill();
        // Gold edge trim
        ctx.strokeStyle = '#c8a000'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(-2, -28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( 5, 14); ctx.lineTo( 2, -28); ctx.stroke();
        // Cross-guard
        ctx.fillStyle = '#c8a000';
        ctx.fillRect(-13, 10, 26, 5);
        // Grip
        ctx.fillStyle = '#1e1000';
        ctx.fillRect(-4, 15, 8, 16);
        // Pommel
        ctx.beginPath(); ctx.arc(0, 33, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#c8a000'; ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    },

    // ── Boss health bars ──────────────────────────────────────
    _drawBossHealth(ctx, W, H) {
        const alive = this._bossEnemies.filter(e => e && !e.isDead);
        if (!alive.length) return;

        alive.forEach((boss, idx) => {
            const pct  = Math.max(0, boss.health / boss.maxHealth);
            const barW = W * 0.44;
            const barH = 17;
            const bx   = W / 2 - barW / 2;
            const by   = H - 158 - idx * 62;
            const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006 + idx * 1.4);
            // All architects share the purple family, Creator gets gold
            const glowColor = idx === 2 ? '#ffd700' : (idx === 1 ? '#9922cc' : '#cc44ff');

            ctx.save();
            ctx.fillStyle = 'rgba(8,0,18,0.92)';
            ctx.beginPath();
            ctx.roundRect(bx - 16, by - 6, barW + 32, barH + 30, 6);
            ctx.fill();
            ctx.strokeStyle = `${glowColor}44`;
            ctx.lineWidth   = 1;
            ctx.stroke();

            ctx.font         = '700 11px "Courier New", monospace';
            ctx.fillStyle    = glowColor;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            ctx.shadowColor  = glowColor;
            ctx.shadowBlur   = 12;
            ctx.fillText(boss._bossLabel || '\u2620 ARCHITECT', W / 2, by);
            ctx.shadowBlur   = 0;

            // Track
            ctx.fillStyle = '#0a0016';
            ctx.beginPath(); ctx.roundRect(bx, by + 15, barW, barH, 4); ctx.fill();

            // Fill
            const g = ctx.createLinearGradient(bx, 0, bx + barW * pct, 0);
            if (idx === 2) {
                g.addColorStop(0, '#2a1800');
                g.addColorStop(0.5, '#916200');
                g.addColorStop(1, '#ffd700');
            } else {
                g.addColorStop(0, '#1a004a');
                g.addColorStop(0.4, '#6600bb');
                g.addColorStop(1, glowColor);
            }
            ctx.fillStyle   = g;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur  = 16 * pulse;
            ctx.beginPath(); ctx.roundRect(bx, by + 15, barW * pct, barH, 4); ctx.fill();
            ctx.shadowBlur  = 0;

            // HP numbers
            ctx.font         = '700 10px "Courier New", monospace';
            ctx.fillStyle    = 'rgba(255,255,255,0.84)';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${Math.ceil(boss.health).toLocaleString()}  /  ${Math.ceil(boss.maxHealth).toLocaleString()}`,
                W / 2, by + 15 + barH / 2
            );
            ctx.restore();
        });
    },

    // ── Phase label ───────────────────────────────────────────
    _drawPhaseLabel(ctx, W, H) {
        if (this.phase === 'intro' || this.phase === 'victory') return;
        const labels = {
            horde:      '// HORDE_ACTIVE',
            boss_intro: '// BOSS_INCOMING',
            boss:       '// ARCHITECT_FIGHT',
        };
        const lbl = labels[this.phase];
        if (!lbl) return;
        const pulse = 0.45 + 0.35 * Math.sin(Date.now() * 0.004);
        ctx.save();
        ctx.globalAlpha  = pulse;
        ctx.font         = '600 11px "Courier New", monospace';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle    = '#cc44ff';
        ctx.shadowColor  = '#cc44ff';
        ctx.shadowBlur   = 8;
        ctx.fillText(lbl, 20, H - 85);
        ctx.shadowBlur   = 0;
        ctx.restore();
    },

    // ── Corruption alert banner ───────────────────────────────
    _drawCorruptBanner(ctx, W, H) {
        const alpha = Math.min(1, this._corruptMsgT / 0.4) * Math.min(1, this._corruptMsgT);
        if (alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha  = alpha * 0.95;
        ctx.font         = '700 16px "Courier New", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const tw = Math.min(W - 80, 580);
        ctx.fillStyle = 'rgba(22,0,40,0.92)';
        ctx.fillRect(W / 2 - tw / 2, H / 2 - 30, tw, 56);
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(W / 2 - tw / 2, H / 2 - 30, tw, 56);
        ctx.fillStyle   = '#ee88ff';
        ctx.shadowColor = '#cc44ff';
        ctx.shadowBlur  = 20;
        ctx.fillText(this._corruptMsg, W / 2, H / 2);
        ctx.shadowBlur  = 0;
        ctx.restore();
    },

    // ── Audio: typewriter beep ────────────────────────────────
    _beepChar() {
        try {
            if (!this._beepAC) this._beepAC = new (window.AudioContext || window.webkitAudioContext)();
            const ac = this._beepAC;
            if (ac.state === 'suspended') ac.resume();
            const osc = ac.createOscillator();
            const g   = ac.createGain();
            osc.frequency.value = 500 + Math.random() * 1400;
            osc.type = Math.random() < 0.6 ? 'square' : 'sawtooth';
            g.gain.setValueAtTime(0.03, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.065);
            osc.connect(g); g.connect(ac.destination);
            osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.065);
        } catch (_) {}
    },

    // ── Audio: heavy impact ───────────────────────────────────
    _beepImpact() {
        try {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            const o1 = ac.createOscillator(), g1 = ac.createGain();
            o1.type = 'sawtooth';
            o1.frequency.setValueAtTime(120, ac.currentTime);
            o1.frequency.exponentialRampToValueAtTime(32, ac.currentTime + 0.32);
            g1.gain.setValueAtTime(0.6, ac.currentTime);
            g1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.36);
            o1.connect(g1); g1.connect(ac.destination);
            o1.start(); o1.stop(ac.currentTime + 0.38);

            const o2 = ac.createOscillator(), g2 = ac.createGain();
            o2.type = 'square';
            o2.frequency.setValueAtTime(3600, ac.currentTime);
            o2.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.2);
            g2.gain.setValueAtTime(0.2, ac.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.24);
            o2.connect(g2); g2.connect(ac.destination);
            o2.start(); o2.stop(ac.currentTime + 0.26);
        } catch (_) {}
    },

    // ── Map corruption scheduler ──────────────────────────────
    _tickMapCorrupt() {
        for (const entry of HW_CORRUPT_SCHEDULE) {
            if (!entry._fired && this._mapCorruptT >= entry.t) {
                entry._fired = true;
                this._applyCorruptEffect(entry);
            }
        }
    },

    _applyCorruptEffect(entry) {
        const towers = (typeof game !== 'undefined') ? game.towers : [];
        this._corruptMsg  = entry.label;
        this._corruptMsgT = 3.0;
        this._flash();
        if (typeof game !== 'undefined') game.shakeScreen(10, 0.5);

        switch (entry.type) {
            case 'stun_wave': {
                for (const t of towers) t._stunTimer = entry.duration + Math.random() * 1.5;
                break;
            }
            case 'debuff_all': {
                for (const t of towers) {
                    if (t._corruptBuf) continue;
                    const origDmg = t.damage, origRng = t.range;
                    t.damage *= 0.40; t.range *= 0.72;
                    t._corruptBuf = {
                        type: 'debuff',
                        restore: () => { t.damage = origDmg; t.range = origRng; },
                        timer: entry.duration,
                    };
                }
                break;
            }
            case 'buff_random': {
                if (!towers.length) break;
                const tgt    = towers[Math.floor(Math.random() * towers.length)];
                if (tgt._corruptBuf) break;
                const origDmg = tgt.damage, origRng = tgt.range;
                const isBuf   = Math.random() < 0.5;
                if (isBuf) { tgt.damage *= 3.5; tgt.range *= 1.5; }
                else       { tgt.damage *= 0.08; tgt.range *= 0.5; }
                tgt._corruptBuf = {
                    type: isBuf ? 'buff' : 'debuff',
                    restore: () => { tgt.damage = origDmg; tgt.range = origRng; },
                    timer: entry.duration,
                };
                break;
            }
            case 'move_tower': {
                if (Math.random() > 0.05 || !towers.length) break;
                const tgt = towers[Math.floor(Math.random() * towers.length)];
                const can = document.querySelector('canvas');
                const cW  = can ? can.width  : 800;
                const cH  = can ? can.height : 600;
                for (let a = 0; a < 60; a++) {
                    const nx = 50 + Math.random() * (cW - 100);
                    const ny = 50 + Math.random() * (cH - 100);
                    const nearPath = (typeof currentPath !== 'undefined' && currentPath.segments)
                        ? currentPath.segments.some(s => Math.hypot(s.x - nx, s.y - ny) < 36)
                        : false;
                    if (!nearPath) { tgt.x = nx; tgt.y = ny; break; }
                }
                break;
            }
        }
    },

    // ── DOM typewriter sequence ───────────────────────────────
    _showMsgSequence(lines, doneCb) {
        let i = 0;
        const next = () => {
            if (!this.active) return;
            if (i >= lines.length) { if (doneCb) doneCb(); return; }
            const line = lines[i++];
            if (!line) { setTimeout(next, 220); return; }
            if (line.startsWith('> ') && !line.startsWith('> .')) this._beepImpact();
            this._typeMsgDOM(line, () => setTimeout(next, 700));
        };
        next();
    },

    _typeMsgDOM(msg, cb) {
        const el = document.getElementById('hw-msgbar');
        if (!el) { if (cb) cb(); return; }
        el.classList.add('active');
        el.innerHTML = '';
        const displayed = Array(msg.length).fill('');
        let charIndex = 0;
        const step = () => {
            if (!this.active) return;
            if (charIndex < msg.length) {
                const ch = msg[charIndex];
                if (ch !== ' ' && Math.random() < 0.35) {
                    const gc = HW_CHARS[Math.floor(Math.random() * HW_CHARS.length)];
                    displayed[charIndex] = `<span class="hw-g">${gc}</span>`;
                } else {
                    displayed[charIndex] = ch === '<' ? '&lt;' : ch;
                }
                el.innerHTML = displayed.join('');
                charIndex++;
                this._beepChar();
                setTimeout(step, 60 + Math.random() * 50);
            } else {
                const resolve = j => {
                    if (!this.active) return;
                    if (j >= msg.length) { if (cb) cb(); return; }
                    displayed[j] = msg[j] === '<' ? '&lt;' : msg[j];
                    el.innerHTML = displayed.join('');
                    setTimeout(() => resolve(j + 1), 12);
                };
                resolve(0);
            }
        };
        step();
    },
};

// ── Victory screen reveal ─────────────────────────────────────
function _showHiddenVictory() {
    const ov = document.getElementById('hw-overlay');
    if (ov) ov.classList.remove('visible');

    const vic = document.getElementById('hw-victory');
    if (vic) {
        vic.classList.add('visible');
        const ws = vic.querySelector('.hw-vic-wave');
        if (ws) ws.textContent = `Survived to Wave ${waveState.waveNum || 20} + Protocol 777`;
    }
    hiddenWave.reset();
}
