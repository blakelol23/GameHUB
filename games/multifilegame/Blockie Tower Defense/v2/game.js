// ============================================================
//  GAME.JS  -  Blockie Tower Defense V2
//  Main game loop, input, placement, effects
// ============================================================
'use strict';

//  Constants 
const TILE          = 36;        // grid cell size for placement snapping
const TOWER_SIZE    = 14;        // tower body radius
const PATH_MARGIN   = 22;        // distance from path center that blocks placement
const LIVES_START   = 100;
const CASH_START    = 200;
const BASE_BONUS    = 80;        // per-wave bonus cash
const INTEREST_PCT  = 0.07;     // 7% interest on cash each wave
const SCORE_KILL    = 10;
const SCORE_WAVE    = 250;
const SHAKE_DECAY   = 6;

//  Globals 
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');

let W = 0, H = 0;
let _tipX = 0, _tipY = 0;  // last known mouse client coords for live tooltip refresh

// ── Warp/FOV post-process effect ─────────────────────────────
function _applyWarpEffect(ctx, src, W, H, amt) {
    if (amt <= 0.001) { ctx.drawImage(src, 0, 0); return; }
    const now = Date.now();

    // 1. Barrel distortion via horizontal strips (32 for performance) ──────
    const STRIPS = 32;
    const sh = H / STRIPS;
    for (let i = 0; i < STRIPS; i++) {
        const ny     = (i / (STRIPS - 1)) * 2 - 1;       // −1 → +1
        const barrel = amt * 0.64 * (ny * ny);            // more stretch near top/bottom
        const dw     = W * (1 + barrel);
        const dx     = (W - dw) / 2;                      // keep centred
        const vertPull = ny * amt * 14;                   // pinch rows toward centre
        ctx.drawImage(src, 0, i * sh, W, sh + 1, dx, i * sh + vertPull, dw, sh + 1);
    }

    // 2. Chromatic aberration (reduced for performance) ─────────────────────
    const chroma = Math.round(amt * 8);
    if (chroma > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.25 * amt;
        // Red fringe — shift right
        ctx.filter = 'saturate(9) hue-rotate(-30deg) brightness(0.6)';
        ctx.drawImage(src, 0, 0, W, H, chroma, 0, W, H);
        // Cyan/blue fringe — shift left
        ctx.filter = 'saturate(9) hue-rotate(185deg) brightness(0.6)';
        ctx.drawImage(src, 0, 0, W, H, -chroma, 0, W, H);
        ctx.restore();
    }

    // 3. Radial speed lines (hyperspace tunnel) ───────────────
    ctx.save();
    ctx.translate(W / 2, H / 2);
    const scroll = (now % 560) / 560;   // scrolls outward at ~1.8 rev/s
    const lineCount = 28;
    for (let i = 0; i < lineCount; i++) {
        const a     = (i / lineCount) * Math.PI * 2;
        const jit   = Math.sin(i * 7.43) * 0.10;         // per-line jitter
        const inner = H * (0.03 + scroll * 0.28 + jit) * amt;
        const outer = H * (0.75 + jit * 0.25);
        if (inner >= outer) continue;
        const alpha = amt * (0.07 + 0.24 * Math.abs(Math.sin(i * 3.7)));
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = i % 7 === 0 ? '#dd55ff' : i % 3 === 0 ? '#9922ee' : '#ffffff';
        ctx.lineWidth   = 0.7 + Math.abs(Math.sin(i * 2.2)) * 1.5;
        ctx.shadowColor = '#aa33ff';
        ctx.shadowBlur  = amt * 7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 4. Central lens glow ─────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = amt * 0.28;
    const cg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H * 0.42);
    cg.addColorStop(0,   'rgba(210,150,255,0.7)');
    cg.addColorStop(0.38,'rgba(100, 0, 210,0.25)');
    cg.addColorStop(1,   'rgba(0,  0,  0,  0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 5. Edge vignette ─────────────────────────────────────────
    ctx.save();
    const vg = ctx.createRadialGradient(W/2, H/2, H * 0.2, W/2, H/2, H * 0.82);
    vg.addColorStop(0,    'rgba(0,0,0,0)');
    vg.addColorStop(0.55, `rgba(8,0,20,${0.32 * amt})`);
    vg.addColorStop(1,    `rgba(1,0,6, ${0.96 * amt})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // 6. Scan crush ────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = amt * 0.08;
    ctx.fillStyle   = '#000';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
    ctx.restore();
}

//  Game object 
const game = {
    // state
    running:   false,
    paused:    false,
    over:      false,
    won:       false,
    cash:      CASH_START,
    lives:     LIVES_START,
    score:     0,
    wave:      0,
    mapId:     null,
    _lastTs:   0,
    _raf:      null,

    // entity lists
    towers:    [],   // Tower instances
    enemies:   [],   // Enemy instances
    bullets:   [],   // Bullet instances

    // shake
    shake:     { x:0, y:0, mag:0, dur:0 },

    // last played map (for restart)
    _lastMapId: null,

    //  start / restart 
    start(mapId){
        game._lastMapId = mapId;
        game.running = true;
        game.paused  = false;
        game.over    = false;
        game.won     = false;
        game.cash    = CASH_START;
        game.lives   = LIVES_START;
        game.score   = 0;
        game.wave    = 0;
        game.towers  = [];
        game.enemies = [];
        game.bullets = [];
        game.shake   = { x:0, y:0, mag:0, dur:0 };
        game.mapId   = mapId;

        // reset external arrays
        if(typeof aoeRings   !=='undefined') aoeRings.length   = 0;
        if(typeof lightningArcs!=='undefined') lightningArcs.length = 0;
        if(typeof dmgFloats  !=='undefined') dmgFloats.length  = 0;
        if(typeof particles  !=='undefined') particles.length  = 0;
        if(typeof cashAnims  !=='undefined') cashAnims.length  = 0;

        resizeCanvas();
        loadMap(mapId, W, H);

        // use per-map starting stats
        const mapDef = typeof MAP_DEFS!=='undefined' && MAP_DEFS.find(m=>m.id===mapId);
        if(mapDef){ game.cash=mapDef.startCash||CASH_START; game.lives=mapDef.startLives||LIVES_START; }

        waveState.phase      = 'idle';
        waveState.waveNum    = 0;
        waveState.queue      = [];
        waveState.intermissionEnd = 0;
        setTimeout(()=>waveState.init(), 300);

        selectedTowerType = null;
        selectedTower     = null;
        speedIdx = 0;
        gameSpeed = 1;
        if(el.btnSpeed) el.btnSpeed.textContent=' 1';
        if(el.btnSpeed) el.btnSpeed.classList.remove('active');

        hideTitleScreen();
        hidePanels();
        buildShop();
        refreshShop(game.cash);
        updateHUD(game.cash, game.lives, game.wave, game.score, 'idle', 0, 0);
        setWaveBar(0);
        updateBossBar(null);

        cancelAnimationFrame(game._raf);
        game._lastTs = performance.now();
        game._raf    = requestAnimationFrame(game._loop);
    },

    restart(){
        if(game._lastMapId) game.start(game._lastMapId);
        else showTitleScreen();
    },

    returnToMenu(){
        cancelAnimationFrame(game._raf);
        game.running = false;
        hidePanels();
        showTitleScreen();
        buildMapSelect();
    },

    togglePause(){
        if(game.over || game.won) return;
        game.paused = !game.paused;
        if(game.paused){
            showPause();
        } else {
            hidePause();
            game._lastTs = performance.now();
            game._raf    = requestAnimationFrame(game._loop);
        }
    },

    //  Main loop 
    _loop(ts){
        if(!game.running || game.paused){ return; }
        const rawDt = Math.min((ts - game._lastTs) / 1000, 0.1);
        game._lastTs = ts;
        const dt = rawDt * gameSpeed;

        game._update(dt, rawDt);
        game._draw();

        game._raf = requestAnimationFrame(game._loop);
    },

    //  Update 
    _update(dt, rawDt){
        rawDt = rawDt !== undefined ? rawDt : dt;
        const W2=W, H2=H;
        if(typeof updateAmbient==='function') updateAmbient(dt, W2, H2);

        // wave tick (ms-based, no dt param)
        const wt = waveState.tick(game.enemies);
        if(wt){
            if(wt.action==='spawn'){
                const def = ENEMY_DEFS[wt.type];
                if(def){
                    const mult = wt.mult || 1;
                    const e = new Enemy(wt.type, mult);
                    game.enemies.push(e);
                    // play wave-start sfx on very first spawn of each wave
                    if(waveState.totalSpawned === 1){
                        if(typeof sfxFiles!=='undefined') sfxFiles.play('waveStart');
                        else if(typeof audio!=='undefined') try{ audio.sfx('wave_start'); }catch(_){}
                    }
                }
            }
            else if(wt.action==='waveCleared'){
                game.wave = wt.wave;
                game._onWaveCleared(wt.wave);
            }
            else if(wt.action==='victory'){
                game._victory();
            }
        }

        // hidden detection
        if(typeof updateHiddenDetection==='function')
            updateHiddenDetection(game.towers, game.enemies);

        // update towers — use scaled dt so fire rate, reload, and stun timers
        // all accelerate with gameSpeed, matching enemies and bullets
        for(const t of game.towers){
            t.update(dt, game.enemies, game.bullets, game.cash);
        }

        // update bullets
        for(let i=game.bullets.length-1;i>=0;i--){
            const b=game.bullets[i];
            b.update(dt, game.enemies);
            if(b.dead) game.bullets.splice(i,1);
        }

        // update enemies
        for(let i=game.enemies.length-1;i>=0;i--){
            const e=game.enemies[i];
            if(e.isDead){
                if(typeof sfxFiles!=='undefined') sfxFiles.play('die');
                waveState.enemyKilled();
                game.enemies.splice(i,1);
                continue;
            }
            const reached = e.update(dt);
            if(reached){
                // reached the end — deal damage
                waveState.enemyLeaked();
                const dmg = e.isSuper ? 20 : e.isBoss ? 5 : 1;
                game.lives = Math.max(0, game.lives - dmg);
                game.enemies.splice(i,1);
                e.isDead = true;  // mark dead so hidden-wave boss tracking resolves the softlock
                if(game.lives<=0){ game._gameOver(); return; }
            }
        }

        // aoe rings, lightning arcs
        if(typeof updateAoeRings   ==='function') updateAoeRings(dt);
        if(typeof updateLightningArcs==='function') updateLightningArcs(dt);

        // hidden wave visual tick
        if(typeof hiddenWave !== 'undefined' && hiddenWave.active) hiddenWave.tick(dt);

        // Tower panel auto-refresh at 2 Hz when open
        if(typeof selectedTower !== 'undefined' && selectedTower){
            this._panelRefreshT = (this._panelRefreshT||0) + dt;
            if(this._panelRefreshT >= 0.5){
                this._panelRefreshT = 0;
                if(typeof _renderPanel === 'function') _renderPanel(selectedTower);
            }
        } else {
            this._panelRefreshT = 0;
        }

        // hidden wave spawning system tick
        if(typeof hiddenWaveSystem !== 'undefined' && hiddenWaveSystem.active){
            const hwt = hiddenWaveSystem.tick(game.enemies);
            if(hwt){
                if(hwt.action === 'hiddenSpawn'){
                    const def = typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS[hwt.type] : null;
                    if(def){
                        const mult = hiddenWaveSystem._mult || 6;
                        const e = new Enemy(hwt.type, mult);
                        game.enemies.push(e);
                        waveState.enemiesAlive++;
                    }
                } else if(hwt.action === 'hiddenVictory'){
                    if(typeof hiddenWave !== 'undefined') hiddenWave._triggerVictory();
                }
            }
        }

        // particles etc
        if(typeof updateParticles  ==='function') updateParticles(dt);
        if(typeof updateDmgFloats  ==='function') updateDmgFloats(dt);
        if(typeof updateCashAnims  ==='function') updateCashAnims(dt);

        // shake
        if(game.shake.dur>0){
            game.shake.dur  -= dt;
            game.shake.mag  *= (1 - SHAKE_DECAY * dt);
            game.shake.x     = (Math.random()*2-1)*game.shake.mag;
            game.shake.y     = (Math.random()*2-1)*game.shake.mag;
        } else {
            game.shake.x=game.shake.y=0;
        }

        // boss bar  find first boss
        let boss = game.enemies.find(e=>e.isBoss||e.isSuper);
        updateBossBar(boss||null);

        // hud update (every frame for wave phase)
        if(waveState.waveNum > game.wave) game.wave = waveState.waveNum;
        updateHUD(game.cash, game.lives, game.wave, game.score,
            waveState.phase, waveState.intermissionRemaining(), waveState.countdownRemaining());
        setWaveBar(game.wave / waveState.maxWaves);
        // Live tooltip refresh — keep HP bar current every frame without requiring mouse movement
        if(typeof _updateEnemyTooltip==='function' && _tipX > 0 && game.running && !game.over && !game.won){
            let _hov=null;
            for(let _i=game.enemies.length-1;_i>=0;_i--){
                const _en=game.enemies[_i];
                if(!_en.isDead && Math.hypot(_en.x-mouseX,_en.y-mouseY)<=_en.size+5){_hov=_en;break;}
            }
            _updateEnemyTooltip(_hov,_tipX,_tipY);
        }
    },

    //  Draw 
    _draw(){
        const warpActive = typeof hiddenWave !== 'undefined'
            && hiddenWave.active && hiddenWave._warpAmt > 0.001;

        // Route scene to offscreen canvas when warp is active
        let dc = ctx;
        if (warpActive) {
            if (!game._warpCanvas || game._warpCanvas.width !== W || game._warpCanvas.height !== H) {
                game._warpCanvas = document.createElement('canvas');
                game._warpCanvas.width  = W;
                game._warpCanvas.height = H;
                game._warpCtx = game._warpCanvas.getContext('2d');
            }
            dc = game._warpCtx;
        }

        dc.clearRect(0, 0, W, H);
        dc.save();
        dc.translate(game.shake.x, game.shake.y);

        // Map
        if(typeof drawMap==='function') drawMap(dc, W, H);

        // Purple map hue during hidden wave (sits between map and entities)
        if(typeof hiddenWave !== 'undefined' && hiddenWave.active){
            const hwA = hiddenWave._scanAmt;
            dc.globalAlpha = 0.22 * hwA;
            dc.fillStyle = '#6600cc';
            dc.fillRect(0, 0, W, H);
            dc.globalAlpha = 1;
            const hg = dc.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.88);
            hg.addColorStop(0,'rgba(50,0,100,0)');
            hg.addColorStop(0.6,'rgba(90,0,180,0)');
            hg.addColorStop(1,`rgba(140,0,255,${0.38*hwA})`);
            dc.fillStyle = hg;
            dc.fillRect(0, 0, W, H);
            if(Math.random() < 0.02){
                dc.globalAlpha = 0.07 * Math.random() * hwA;
                dc.fillStyle = '#bb44ff';
                dc.fillRect(0, 0, W, H);
            }
            dc.globalAlpha = 1;
        }

        // Towers
        for(const t of game.towers) t.draw(dc, showRanges);

        // Enemies
        if(typeof drawParticles==='function') drawParticles(dc);  // under enemies
        for(const e of game.enemies) e.draw(dc);

        // Bullets
        for(const b of game.bullets) b.draw(dc);

        // Lightning arcs
        if(typeof drawLightningArcs==='function') drawLightningArcs(dc);

        // AoE rings
        if(typeof drawAoeRings==='function') drawAoeRings(dc);

        // Ambient (top layer particles)
        if(typeof drawAmbient==='function') drawAmbient(dc);

        // Damage floats, cash anims
        if(typeof drawDmgFloats==='function') drawDmgFloats(dc);
        if(typeof drawCashAnims==='function') drawCashAnims(dc);

        // Placement ghost
        if(typeof drawPlacementGhost==='function') drawPlacementGhost(dc);

        dc.restore();

        // Blit offscreen → main canvas through warp distortion
        if (warpActive) {
            ctx.clearRect(0, 0, W, H);
            _applyWarpEffect(ctx, game._warpCanvas, W, H, hiddenWave._warpAmt);
        }

        // Hidden wave glitch overlay (drawn unshaken, on top of everything)
        if(typeof hiddenWave !== 'undefined') hiddenWave.draw(ctx, W, H);
    },

    //  Wave cleared 
    _onWaveCleared(waveNum){
        const bonus      = BASE_BONUS + waveNum * 10;
        // Interest cap: prevents runaway scaling when cash is very high
        const rawInterest = Math.floor(game.cash * INTEREST_PCT);
        const interest    = Math.min(rawInterest, 80 + waveNum * 12);
        const clearBonus = (waveState._leaked === 0) ? Math.floor(60 + waveNum * 12) : 0;
        game.cash  += bonus + interest + clearBonus;
        game.score += SCORE_WAVE * waveNum;
        if(clearBonus > 0) game.score += Math.floor(clearBonus * 0.5);
        // Farm tower passive income: $100 base × 2.5 per upgrade level, capped at $2,500
        for(const t of game.towers){
            if(t.type !== 'farm') continue;
            const farmIncome = Math.min(2500, Math.round(100 * Math.pow(2.5, t.level)));
            game.awardCash(farmIncome, t.x, t.y - 20);
        }
        refreshShop(game.cash);
        showWaveBanner(waveNum, bonus, interest, clearBonus);
        if(typeof audio!=='undefined') try{ audio.sfx('wave_clear'); }catch(_){}

        // Music escalation at wave 20
        if(waveNum === 19 && typeof audio !== 'undefined'){
            setTimeout(()=>{ try{ audio.fadeToTrack('lategame', 2.5); }catch(_){} }, 1200);
        }

        // Auto-trigger hidden wave after clearing wave 30
        if(waveNum >= 30 && typeof hiddenWave !== 'undefined' && !hiddenWave.active){
            setTimeout(()=>{ try{ hiddenWave.activate(); }catch(_){} }, 2500);
        }

        // Also check hiddenWaveSystem condition (score-based)
        if(typeof hiddenWaveSystem !== 'undefined'){
            hiddenWaveSystem.checkAutoTrigger(game.lives, game.score);
        }
    },

    //  Game Over 
    _gameOver(){
        if(game.over) return;
        game.over   = true;
        game.running= false;
        cancelAnimationFrame(game._raf);
        game.shakeScreen(18, 0.6);
        setTimeout(()=>showGameOver(game.wave, game.score), 900);
    },

    //  Victory 
    _victory(){
        if(game.won) return;
        game.won    = true;
        game.running= false;
        cancelAnimationFrame(game._raf);
        game.score += 5000; // completion bonus
        try{
            const vic = new Audio('../Audio/victory-wave777.mp3');
            vic.volume = 0.7; vic.play().catch(()=>{});
        } catch(_){}
        setTimeout(()=>showVictory(game.score), 800);
    },

    //  Skip Wave (kills remaining enemies & awards their cash) 
    skipWave(){
        if(!waveState.isInWave()) return;
        // Deny perfect-clear bonus — skipping isn't a flawless defense
        const hadLiving = game.enemies.some(e => !e.isDead);
        for(const e of game.enemies){
            if(e.isDead) continue;
            game.awardCash(e.value||0, e.x, e.y);
            game.score += SCORE_KILL;
        }
        game.enemies.length = 0;
        waveState.enemiesAlive = 0;
        if(hadLiving) waveState._leaked = Math.max(waveState._leaked || 0, 1);
        if(waveState.phase === 'spawning') waveState.phase = 'waiting';
    },

    //  Shake 
    shakeScreen(intensity, duration){
        game.shake.mag = intensity;
        game.shake.dur = duration;
    },

    //  Cash 
    awardCash(amount, x, y){
        game.cash += amount;
        if(typeof spawnCashAnim==='function') spawnCashAnim(x, y, amount);
        refreshShop(game.cash);
    },

    spendCash(amount){
        if(game.cash < amount) return false;
        game.cash -= amount;
        refreshShop(game.cash);
        updateHUD(game.cash, game.lives, game.wave, game.score,
            waveState.phase, waveState.intermissionRemaining(), waveState.countdownRemaining());
        return true;
    },

    //  Tower placement 
    tryPlaceTower(type, px, py){
        if(!game.running || game.paused || game.over || game.won) return;
        const def = TOWER_DEFS[type];
        if(!def) return;
        if(game.cash < def.cost){ toast('Not enough cash!'); return; }
        if(!game.isValidPlacement(px, py)){ toast('Cannot place there!'); return; }
        // Farm tower hard placement cap
        if(type === 'farm'){
            const farmCount = game.towers.filter(t => t.type === 'farm').length;
            if(farmCount >= 8){ toast('Farm limit reached! (max 8)'); return; }
        }

        if(!game.spendCash(def.cost)) return;

        const t = new Tower(type, px, py);
        game.towers.push(t);
        if(typeof sfxFiles!=='undefined') sfxFiles.play('place');
        else if(typeof audio!=='undefined') try{ audio.sfx('place'); }catch(_){}
        cancelPlacement();
        openTowerPanel(t);
        game.score += 5;
    },

    isValidPlacement(px, py){
        if(!currentPath) return false;
        // Must be inside canvas
        const margin = TOWER_SIZE + 2;
        if(px < margin || py < margin || px > W - margin || py > H - margin) return false;
        // Must not be on path
        if(currentPath.isNearPath(px, py, PATH_MARGIN)) return false;
        // Must not overlap other towers
        for(const t of game.towers){
            const dx=t.x-px, dy=t.y-py;
            if(Math.sqrt(dx*dx+dy*dy) < TOWER_SIZE*2+4) return false;
        }
        // Must not be on top of environment props (trees, rocks, buildings)
        if(typeof builtProps !== 'undefined'){
            for(const p of builtProps){
                // block radius for each prop type (based on drawn visual footprint)
                const blockR = p.type === 'tree'     ? 30
                             : p.type === 'building' ? 26
                             : 20;  // rock / crystal / light
                const dx = p.x - px, dy = p.y - py;
                if(Math.sqrt(dx*dx+dy*dy) < blockR + TOWER_SIZE) return false;
            }
        }
        return true;
    },

    //  Sell tower 
    sellTower(tower){
        const val = tower.getSellValue();
        game.awardCash(val, tower.x, tower.y);
        if(typeof sfxFiles!=='undefined') sfxFiles.play('sell');
        else if(typeof audio!=='undefined') try{ audio.sfx('sell'); }catch(_){}
        const idx = game.towers.indexOf(tower);
        if(idx!==-1) game.towers.splice(idx,1);
        // remove bullets belonging to this tower
        for(let i=game.bullets.length-1;i>=0;i--){
            if(game.bullets[i].ownerType===tower.type &&
               game.bullets[i].ox===tower.x &&
               game.bullets[i].oy===tower.y){
                game.bullets.splice(i,1);
            }
        }
        toast('Sold for $'+val);
        game.score = Math.max(0, game.score - 20);
    },
};

//  Canvas & resize 
function resizeCanvas(){
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if(game.running && currentPath){
        loadMap(game.mapId, W, H);
    }
}

window.addEventListener('resize', ()=>{
    resizeCanvas();
    if(!game.running){
        document.querySelectorAll('.map-preview').forEach(c=>{
            const d=MAP_DEFS.find(m=>m.id===c.dataset.id);
            if(d) renderMapPreview(c,d);
        });
    }
});

//  Mouse / touch input 
canvas.addEventListener('mousemove', e=>{
    const r=canvas.getBoundingClientRect();
    mouseX=e.clientX-r.left;
    mouseY=e.clientY-r.top;
    _tipX=e.clientX; _tipY=e.clientY;
    // Enemy hover tooltip
    if(game.running && !game.over && !game.won){
        let found=null;
        for(let i=game.enemies.length-1;i>=0;i--){
            const en=game.enemies[i];
            if(!en.isDead && Math.hypot(en.x-mouseX,en.y-mouseY)<=en.size+5){
                found=en; break;
            }
        }
        if(typeof _updateEnemyTooltip==='function') _updateEnemyTooltip(found, e.clientX, e.clientY);
    } else {
        if(typeof _updateEnemyTooltip==='function') _updateEnemyTooltip(null, 0, 0);
    }
});

canvas.addEventListener('click', e=>{
    if(game.over || game.won || game.paused) return;
    const r=canvas.getBoundingClientRect();
    const cx=e.clientX-r.left, cy=e.clientY-r.top;

    if(selectedTowerType){
        game.tryPlaceTower(selectedTowerType, cx, cy);
        return;
    }

    // Check tower click
    let found=null;
    // reverse order so topmost drawn is picked first
    for(let i=game.towers.length-1;i>=0;i--){
        const t=game.towers[i];
        const dx=t.x-cx, dy=t.y-cy;
        if(Math.sqrt(dx*dx+dy*dy)<=TOWER_SIZE+6){ found=t; break; }
    }
    if(found){
        if(selectedTower===found){ closeTowerPanel(); }
        else openTowerPanel(found);
    } else {
        closeTowerPanel();
    }
});

canvas.addEventListener('contextmenu', e=>{
    e.preventDefault();
    cancelPlacement();
    closeTowerPanel();
});

// Touch support
canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0];
    const r=canvas.getBoundingClientRect();
    const cx=t.clientX-r.left, cy=t.clientY-r.top;
    mouseX=cx; mouseY=cy;

    if(game.over||game.won||game.paused) return;

    if(selectedTowerType){
        game.tryPlaceTower(selectedTowerType,cx,cy); return;
    }

    let found=null;
    for(let i=game.towers.length-1;i>=0;i--){
        const tw=game.towers[i];
        const dx=tw.x-cx,dy=tw.y-cy;
        if(Math.sqrt(dx*dx+dy*dy)<=TOWER_SIZE+14){ found=tw; break; }
    }
    if(found){
        if(selectedTower===found) closeTowerPanel();
        else openTowerPanel(found);
    } else { closeTowerPanel(); }
},{passive:false});

//  Keyboard 
window.addEventListener('keydown', e=>{
    if(!game.running) return;
    handleKeydown(e);
});

//  startGame hook (called from title screen) 
function startGame(mapId){
    game.start(mapId);
}

//  Init 
(function init(){
    resizeCanvas();
    buildMapSelect();
    wireButtons();
    showTitleScreen();
    // draw empty canvas so it's not white
    ctx.fillStyle='#0a0a0f';
    ctx.fillRect(0,0,W,H);
})();
