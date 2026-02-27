// ============================================================
//  ADMIN.JS  -  Blockie Tower Defense V2
//  Debug / cheat console  (backtick ` to toggle)
//  Spawn buttons are auto-derived from ENEMY_DEFS — adding a
//  new enemy to enemies.js makes it appear here automatically.
// ============================================================
'use strict';

const admin = (function(){
    let open    = false;
    let panel   = null;
    let koState = 0;
    const KO_SEQ = [38,38,40,40,37,39,37,39,66,65];

    // FPS counter via rAF
    let _fps = 0, _fpsFrames = 0, _fpsRafId = 0, _fpsLast = performance.now();
    function _rafTick(ts){
        _fpsFrames++;
        const dt = ts - _fpsLast;
        if(dt >= 1000){ _fps = Math.round(_fpsFrames * 1000 / dt); _fpsFrames = 0; _fpsLast = ts; }
        _fpsRafId = requestAnimationFrame(_rafTick);
    }

    // ── Auto-build the enemy spawn grid from ENEMY_DEFS ────────────
    function _buildSpawnGrid(){
        if(typeof ENEMY_DEFS === 'undefined')
            return '<span style="color:#ff6060;font-size:10px">ENEMY_DEFS not loaded</span>';
        const groups = { STANDARD: [], VOID: [], BOSS: [] };
        for(const [type, def] of Object.entries(ENEMY_DEFS)){
            const key = def.isBoss ? 'BOSS' : type.startsWith('void_') ? 'VOID' : 'STANDARD';
            groups[key].push({ type, def });
        }
        return Object.entries(groups).map(([grp, entries]) => {
            if(!entries.length) return '';
            const btns = entries.map(({ type, def }) => {
                const col   = def.color || '#888';
                const label = def.label || type;
                const hp    = def.health >= 1000 ? Math.round(def.health/1000) + 'k' : def.health;
                const stats = 'HP:' + hp + ' SPD:' + def.speed;
                return '<button class="adm-enemy-btn" style="--ec:' + col + '" '
                     + 'onclick="admin.spawnEnemy(\'' + type + '\')" '
                     + 'title="' + stats + '">' + label + '</button>';
            }).join('');
            return '<div class="adm-sub">' + grp + '</div>'
                 + '<div class="adm-row" style="flex-wrap:wrap;gap:4px">' + btns + '</div>';
        }).join('');
    }

    // ── CSS ─────────────────────────────────────────────────────────
    function _injectCSS(){
        if(document.getElementById('adm-style')) return;
        const s = document.createElement('style');
        s.id = 'adm-style';
        s.textContent = [
            /* panel shell */
            '#admin-panel{position:fixed;top:50px;right:14px;z-index:9999;width:364px;max-height:87vh;',
            'overflow-y:auto;overflow-x:hidden;',
            'background:linear-gradient(165deg,rgba(6,6,22,.98) 0%,rgba(10,4,28,.98) 100%);',
            'border:1px solid rgba(160,120,255,.22);border-top:2px solid rgba(160,120,255,.55);',
            'border-radius:0 0 14px 14px;',
            "font-family:'Segoe UI',ui-monospace,'Courier New',monospace;",
            'font-size:12px;color:#c8c0e8;',
            'box-shadow:0 0 0 1px rgba(0,0,0,.6),0 12px 60px rgba(80,0,220,.28),inset 0 1px 0 rgba(200,160,255,.07);',
            'display:none}',
            '#admin-panel.visible{display:block;animation:admSlideIn .18s ease-out}',
            '@keyframes admSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
            '#admin-panel::-webkit-scrollbar{width:4px}',
            '#admin-panel::-webkit-scrollbar-track{background:rgba(255,255,255,.03)}',
            '#admin-panel::-webkit-scrollbar-thumb{background:rgba(160,120,255,.35);border-radius:2px}',
            /* header */
            '.adm-head{display:flex;justify-content:space-between;align-items:center;',
            'padding:10px 14px 9px;',
            'background:linear-gradient(90deg,rgba(120,60,255,.20),rgba(60,0,160,.10));',
            'border-bottom:1px solid rgba(160,120,255,.18);',
            'position:sticky;top:0;z-index:10;backdrop-filter:blur(4px)}',
            '.adm-head-left{display:flex;align-items:center;gap:7px}',
            '.adm-head-right{display:flex;align-items:center;gap:8px}',
            '.adm-logo{font-size:15px;color:#b080ff;text-shadow:0 0 12px #8040ff}',
            '.adm-title{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;',
            'color:#e0d0ff;text-shadow:0 0 14px rgba(180,120,255,.6)}',
            '.adm-cursor{color:#b080ff;font-size:13px;line-height:1;animation:admBlink .9s step-end infinite}',
            '@keyframes admBlink{0%,100%{opacity:1}50%{opacity:0}}',
            '.adm-badge{font-size:9px;padding:2px 7px;border-radius:10px;',
            'background:rgba(120,60,255,.18);border:1px solid rgba(160,120,255,.25);',
            'color:#a888ee;letter-spacing:1px}',
            '.adm-x{background:none;border:1px solid rgba(160,120,255,.2);border-radius:4px;',
            'color:#a080cc;font-size:11px;cursor:pointer;padding:2px 6px;transition:all .12s;line-height:1}',
            '.adm-x:hover{background:rgba(255,60,80,.18);border-color:rgba(255,80,100,.4);color:#ff8090}',
            /* body */
            '.adm-body{padding:8px 12px 18px}',
            /* section headers */
            '.adm-section{display:flex;align-items:center;gap:6px;',
            'font-size:8.5px;letter-spacing:2.5px;text-transform:uppercase;font-weight:700;',
            'color:rgba(180,140,255,.55);margin:14px 0 6px;padding-bottom:5px;',
            'border-bottom:1px solid rgba(120,80,255,.14)}',
            '.adm-sec-icon{color:rgba(180,140,255,.35);font-size:8px}',
            '.adm-sub{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;',
            'color:rgba(200,180,255,.28);margin:5px 0 3px;padding-left:2px}',
            /* base button */
            '.adm-body button,#admin-panel button{padding:5px 10px;',
            'background:rgba(120,80,255,.10);border:1px solid rgba(160,120,255,.22);border-radius:5px;',
            'color:#c8b8ee;font-size:11px;cursor:pointer;font-family:inherit;letter-spacing:.3px;',
            'transition:background .1s,border-color .1s,box-shadow .1s;white-space:nowrap}',
            '.adm-body button:hover,#admin-panel button:hover{background:rgba(160,100,255,.22);',
            'border-color:rgba(200,160,255,.45);box-shadow:0 0 8px rgba(140,80,255,.18);color:#e8d8ff}',
            '.adm-body button:active,#admin-panel button:active{background:rgba(200,140,255,.32);transform:scale(.97)}',
            /* colour variants */
            '.adm-btn-cash{border-color:rgba(200,180,40,.30);color:#e8d870}',
            '.adm-btn-cash:hover{background:rgba(200,180,40,.18)!important;border-color:rgba(220,200,60,.5)!important;color:#ffe860!important}',
            '.adm-btn-max{background:rgba(200,160,20,.14)!important}',
            '.adm-btn-life{border-color:rgba(80,220,100,.28);color:#80ee90}',
            '.adm-btn-life:hover{background:rgba(60,200,80,.16)!important;border-color:rgba(100,240,120,.45)!important}',
            '.adm-btn-god{background:rgba(80,200,80,.12)!important}',
            '.adm-btn-warn{border-color:rgba(255,180,40,.30);color:#ffcc60}',
            '.adm-btn-warn:hover{background:rgba(255,160,30,.18)!important}',
            '.adm-btn-danger{border-color:rgba(255,60,60,.30);color:#ff9090}',
            '.adm-btn-danger:hover{background:rgba(255,40,40,.18)!important;border-color:rgba(255,80,80,.50)!important}',
            '.adm-btn-hidden{border-color:rgba(200,100,255,.40);color:#d080ff;background:rgba(160,60,255,.14)!important}',
            '.adm-btn-hidden:hover{background:rgba(200,80,255,.28)!important}',
            '.adm-track-btn{font-size:10px;padding:4px 8px;color:#aab0cc}',
            '.adm-map-btn{font-size:10px;padding:4px 9px;color:#a0c8b0;border-color:rgba(80,200,140,.22)}',
            '.adm-speed-btn{min-width:42px;text-align:center;font-weight:600}',
            /* wave grid */
            '.adm-wave-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin-bottom:4px}',
            '.adm-wave-btn{padding:4px 0!important;font-size:10px!important;min-width:0!important;',
            'text-align:center;border-radius:4px!important}',
            /* enemy buttons — colour via --ec CSS var */
            '.adm-enemy-btn{font-size:10px!important;padding:4px 8px!important;',
            'border-color:color-mix(in srgb,var(--ec) 45%,transparent)!important;',
            'color:color-mix(in srgb,var(--ec) 85%,#ffffff 15%)!important;',
            'background:color-mix(in srgb,var(--ec) 12%,transparent)!important;',
            'text-shadow:0 0 6px color-mix(in srgb,var(--ec) 60%,transparent)}',
            '.adm-enemy-btn:hover{background:color-mix(in srgb,var(--ec) 28%,transparent)!important;',
            'border-color:color-mix(in srgb,var(--ec) 70%,transparent)!important;',
            'box-shadow:0 0 10px color-mix(in srgb,var(--ec) 35%,transparent)!important}',
            /* hidden wave tag */
            '.adm-hw-tag{font-size:9.5px;color:#c080ff;margin-left:8px;padding:2px 8px;border-radius:8px;',
            "background:rgba(160,60,255,.10);border:1px solid rgba(160,80,255,.20);",
            "font-family:'Courier New',monospace;letter-spacing:.5px}",
            /* live stats */
            '.adm-stats{font-size:10px;color:#a090b8;line-height:2;padding:8px 10px;margin-top:4px;',
            'background:rgba(0,0,0,.30);border-radius:6px;border:1px solid rgba(120,80,200,.12);',
            "font-family:'Courier New',ui-monospace,monospace;white-space:pre;letter-spacing:.4px}",
            '#admin-panel .adm-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px}',
        ].join('');
        document.head.appendChild(s);
    }

    // ── Build DOM ──────────────────────────────────────────────────
    function _build(){
        if(panel) return;
        if(!_fpsRafId) _fpsRafId = requestAnimationFrame(_rafTick);
        _injectCSS();
        panel = document.createElement('div');
        panel.id = 'admin-panel';

        const waveJump = Array.from({length:31}, (_, i) =>
            '<button class="adm-wave-btn" onclick="admin.jumpToWave(' + (i+1) + ')">' + (i+1) + '</button>'
        ).join('');

        const trackBtns = ['title','gameplay','lategame','boss','hidden','victory','gameover']
            .map(t => '<button class="adm-track-btn" onclick="admin.playTrack(\'' + t + '\')">' + t + '</button>')
            .join('');

        const mapBtns = ['greenfield','desert','frozen','volcanic','neon','abyss']
            .map(m => '<button class="adm-map-btn" onclick="admin.loadMap(\'' + m + '\')">' + m + '</button>')
            .join('');

        const speedBtns = [1,2,3,5,10]
            .map(s => '<button class="adm-speed-btn" onclick="admin.setSpeed(' + s + ')">\u00D7' + s + '</button>')
            .join('');

        panel.innerHTML =
            '<div class="adm-head">' +
              '<div class="adm-head-left">' +
                '<span class="adm-logo">\u25C8</span>' +
                '<span class="adm-title">ADMIN CONSOLE</span>' +
                '<span class="adm-cursor">\u2588</span>' +
              '</div>' +
              '<div class="adm-head-right">' +
                '<span id="adm-fps-badge" class="adm-badge">-- FPS</span>' +
                '<button class="adm-x" onclick="admin.close()" title="Close">\u2715</button>' +
              '</div>' +
            '</div>' +
            '<div class="adm-body">' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> RESOURCES</div>' +
            '<div class="adm-row">' +
              '<button class="adm-btn-cash" onclick="admin.addCash(500)">+$500</button>' +
              '<button class="adm-btn-cash" onclick="admin.addCash(5000)">+$5K</button>' +
              '<button class="adm-btn-cash" onclick="admin.addCash(50000)">+$50K</button>' +
              '<button class="adm-btn-cash adm-btn-max" onclick="admin.setCash(999999)">\u221E CASH</button>' +
            '</div>' +
            '<div class="adm-row">' +
              '<button class="adm-btn-life" onclick="admin.setLives(100)">\u2665 Full Lives</button>' +
              '<button class="adm-btn-life adm-btn-god" onclick="admin.godMode()">\u26A1 God Mode</button>' +
              '<button onclick="admin.mortalMode()">\u2620 Mortal</button>' +
            '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> WAVE CONTROL</div>' +
            '<div class="adm-row">' +
              '<button class="adm-btn-warn" onclick="admin.skipWave()">\u23ED Skip Wave</button>' +
              '<button class="adm-btn-danger" onclick="admin.killAll()">\u2620 Kill All</button>' +
            '</div>' +
            '<div class="adm-wave-grid">' + waveJump + '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> SPAWN ENEMY</div>' +
            '<div id="adm-spawn-area">' + _buildSpawnGrid() + '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> GAME SPEED</div>' +
            '<div class="adm-row">' + speedBtns + '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> TOWERS</div>' +
            '<div class="adm-row">' +
              '<button onclick="admin.maxAllTowers()">\u2B06 Max All</button>' +
              '<button class="adm-btn-danger" onclick="admin.removeAllTowers()">\u2715 Remove All</button>' +
            '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> AUDIO</div>' +
            '<div class="adm-row"><button id="adm-mute-btn" onclick="admin.muteToggle()">\uD83D\uDD07 Mute</button></div>' +
            '<div class="adm-row" style="flex-wrap:wrap;gap:4px">' + trackBtns + '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> MAP</div>' +
            '<div class="adm-row" style="flex-wrap:wrap;gap:4px">' + mapBtns + '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> HIDDEN WAVE</div>' +
            '<div class="adm-row" style="align-items:center">' +
              '<button class="adm-btn-hidden" onclick="admin.triggerHidden()">\u25B6 Force Trigger</button>' +
              '<span id="adm-hw-status" class="adm-hw-tag"></span>' +
            '</div>' +

            '<div class="adm-section"><span class="adm-sec-icon">\u25C6</span> LIVE STATS</div>' +
            '<div id="adm-status" class="adm-stats">Waiting for game...</div>' +

            '</div>';

        document.body.appendChild(panel);
    }

    function _status(msg){
        const el = document.getElementById('adm-status');
        if(el) el.textContent = msg;
    }

    // ── God mode hook ──────────────────────────────────────────────
    let _godMode = false;
    function _hookGodMode(){
        if(typeof game === 'undefined' || !game || typeof game._gameOver !== 'function') return;
        const orig = game._gameOver.bind(game);
        game._gameOver = function(){
            if(_godMode){ if(typeof toast==='function') toast('GOD MODE: lives reset!'); game.lives=100; return; }
            orig();
        };
    }

    // ── Public API ─────────────────────────────────────────────────
    return {
        open(){  _build(); panel && panel.classList.add('visible'); open=true; this.refresh(); },
        close(){ panel && panel.classList.remove('visible'); open=false; },
        toggle(){ open ? this.close() : this.open(); },
        isOpen(){ return open; },

        refresh(){
            if(!open) return;
            const badge = document.getElementById('adm-fps-badge');
            if(badge) badge.textContent = _fps + ' FPS';

            const g = (typeof game !== 'undefined') ? game : null;
            if(!g || !g.running){ _status('Waiting for game to start...'); return; }

            const hw     = (typeof hiddenWave !== 'undefined') ? hiddenWave : null;
            const hwText = hw && hw.active
                ? 'ACTIVE \u2014 ' + (hw.phase||'?') + ' (sub ' + ((hw.subWaveIdx||0)+1) + ')'
                : 'inactive';
            const hwEl = document.getElementById('adm-hw-status');
            if(hwEl) hwEl.textContent = hwText;

            const enAlive  = g.enemies?.length ?? 0;
            const twrCount = g.towers?.length ?? 0;
            const ws       = (typeof waveState !== 'undefined') ? waveState : null;
            const phase    = ws?.phase ?? '?';
            const track    = (typeof audio !== 'undefined') ? (audio?.track ?? 'none') : 'none';
            const spd      = (typeof gameSpeed !== 'undefined') ? gameSpeed : 1;
            _status(
                'FPS   : ' + String(_fps).padEnd(6)        + ' Speed : \u00D7' + spd      + '\n' +
                'Wave  : ' + String(g.wave??'-').padEnd(6)  + ' Phase : ' + phase          + '\n' +
                'Cash  : $' + String(g.cash??0).padEnd(5)   + ' Lives : ' + (g.lives??0)  + '\n' +
                'Enm   : ' + String(enAlive).padEnd(6)      + ' Twrs  : ' + twrCount       + '\n' +
                'Score : ' + String(g.score??0).padEnd(5)   + ' Map   : ' + (g.mapId??'?')+ '\n' +
                'Track : ' + String(track).padEnd(10)       + ' God: '  + (_godMode?'ON':'OFF')
            );
        },

        addCash(amt){
            if(!game?.running){ _status('Game not running'); return; }
            game.cash += amt;
            if(typeof refreshShop==='function') refreshShop(game.cash);
            if(typeof updateHUD==='function') updateHUD(game.cash,game.lives,game.wave,game.score,waveState.phase,0,0);
            _status('+$' + amt + '  Total: $' + game.cash);
        },
        setCash(amt){
            if(!game?.running) return;
            game.cash = amt;
            if(typeof refreshShop==='function') refreshShop(game.cash);
            _status('Cash set to $' + amt);
        },

        setLives(n){
            if(!game?.running){ _status('Game not running'); return; }
            game.lives = n;
            _status('Lives set to ' + n);
        },

        godMode(){
            _godMode = true;
            if(typeof game !== 'undefined' && game) _hookGodMode();
            _status('God mode ON');
        },
        mortalMode(){ _godMode = false; _status('God mode OFF'); },

        skipWave(){
            if(typeof waveState !== 'undefined' && typeof waveState.skipToNext === 'function'){
                waveState.skipToNext();
                _status('Skipped to next wave');
            } else {
                _status('waveState not available');
            }
        },

        killAll(){
            if(!game?.enemies?.length){ _status('No enemies'); return; }
            const n = game.enemies.length;
            for(const e of game.enemies) e.applyDamage(999999, { armorPierce: true });
            _status('Killed ' + n + ' enemies');
        },

        triggerHidden(){
            if(typeof hiddenWave !== 'undefined' && typeof hiddenWave.activate === 'function'){
                hiddenWave.activate();
                _status('Hidden wave triggered via hiddenWave');
            } else if(typeof hiddenWaveSystem !== 'undefined' && typeof hiddenWaveSystem.activate === 'function'){
                hiddenWaveSystem.activate();
                _status('Hidden wave triggered via hiddenWaveSystem');
            } else {
                _status('Hidden wave system not found');
            }
        },

        jumpToWave(n){
            if(!game?.running){ _status('Game not running'); return; }
            if(n < 1 || n > 31){ _status('Wave must be 1-31'); return; }
            game.enemies.length = 0;
            if(typeof waveState !== 'undefined'){
                waveState.phase           = 'intermission';
                waveState.waveNum         = n - 1;
                waveState.enemiesAlive    = 0;
                waveState.intermissionEnd = Date.now() + 100;
            }
            _status('Jumping to wave ' + n);
        },

        spawnEnemy(type){
            if(!game?.running){ _status('Game not running'); return; }
            if(typeof currentPath === 'undefined' || !currentPath){ _status('No path loaded'); return; }
            if(typeof ENEMY_DEFS === 'undefined' || !ENEMY_DEFS[type]){ _status('Unknown enemy: ' + type); return; }
            const mult = (typeof getWaveMult==='function' && typeof DIFF_MULT!=='undefined')
                ? getWaveMult(game.wave || 1, DIFF_MULT[game.mapId] || 1)
                : 1;
            const e = new Enemy(type, mult);
            game.enemies.push(e);
            if(typeof waveState !== 'undefined') waveState.enemiesAlive++;
            _status('Spawned ' + (ENEMY_DEFS[type].label || type));
        },

        setSpeed(s){
            if(typeof gameSpeed !== 'undefined') gameSpeed = s;
            try {
                if(typeof el !== 'undefined' && el?.btnSpeed){
                    el.btnSpeed.textContent = '\u00D7' + s;
                    el.btnSpeed.classList.toggle('active', s > 1);
                }
            } catch(_){}
            _status('Speed set to \u00D7' + s);
        },

        maxAllTowers(){
            if(!game?.towers?.length){ _status('No towers'); return; }
            for(const t of game.towers){
                while(typeof t.canUpgrade === 'function' && t.canUpgrade()) t.applyUpgrade();
            }
            _status('Maxed ' + game.towers.length + ' towers');
        },

        removeAllTowers(){
            if(!game?.towers){ _status('Game not running'); return; }
            const n = game.towers.length;
            game.towers.length = 0;
            if(game.bullets) game.bullets.length = 0;
            if(typeof closeTowerPanel === 'function') closeTowerPanel();
            _status('Removed ' + n + ' towers');
        },

        muteToggle(){
            if(typeof audio === 'undefined'){ _status('Audio not loaded'); return; }
            const muted = audio.toggleMute();
            const btn = document.getElementById('adm-mute-btn');
            if(btn) btn.textContent = muted ? '\uD83D\uDD07 Unmute' : '\uD83D\uDD07 Mute';
            _status(muted ? 'Audio muted' : 'Audio unmuted');
        },

        playTrack(name){
            if(typeof audio === 'undefined'){ _status('Audio not loaded'); return; }
            audio.fadeToTrack(name, 0.5);
            _status('Playing: ' + name);
        },

        loadMap(mapId){
            if(!game?.running){ _status('Game not running'); return; }
            game.mapId = mapId;
            if(typeof loadMap === 'function') loadMap(mapId, W, H);
            _status('Loaded map: ' + mapId);
        },

        handleKey(e){
            if(e.key === '`' && !e.ctrlKey){ this.toggle(); return; }
            if(e.keyCode === KO_SEQ[koState]){ koState++; } else koState = 0;
            if(koState >= KO_SEQ.length){
                koState = 0;
                this.open();
                if(typeof toast === 'function') toast('Admin unlocked via Konami!');
            }
        },
    };
})();

// Hook keyboard globally
window.addEventListener('keydown', e => { try { admin.handleKey(e); } catch(_){} });

// Refresh live stats twice per second
setInterval(() => { try { admin.refresh(); } catch(_){} }, 500);
