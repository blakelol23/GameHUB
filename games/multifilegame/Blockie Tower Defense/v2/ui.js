// ============================================================
//  UI.JS  -  Blockie Tower Defense V2
//  HUD, shop, upgrade panel, screens, toasts
// ============================================================

//  Element cache 
const $ = id => document.getElementById(id);
const el = {
    canvas:       $('game-canvas'),
    screenTitle:  $('screen-title'),
    mapGrid:      $('map-grid'),
    hud:          $('hud'),
    hudCash:      $('hud-cash'),
    hudLives:     $('hud-lives'),
    hudWave:      $('hud-wave'),
    hudScore:     $('hud-score'),
    hudPhase:     $('hud-phase'),
    waveBarFill:  $('wave-bar-fill'),
    btnRanges:    $('btn-ranges'),
    btnSpeed:     $('btn-speed'),
    btnPause:     $('btn-pause'),
    btnSkip:      $('btn-skip'),
    btnMenu:      $('btn-menu'),
    shop:         $('shop'),
    infoPanel:    $('info-panel'),
    panelContent: $('panel-content'),
    btnClosePanel:$('btn-close-panel'),
    waveBanner:   $('wave-banner'),
    bannerWave:   $('banner-wave-text'),
    bannerSub:    $('banner-wave-sub'),
    bannerBonus:  $('banner-bonus-text'),
    bannerClear:  $('banner-clear-text'),
    bossBarWrap:  $('boss-bar-wrap'),
    bossBarFill:  $('boss-bar-fill'),
    bossBarLabel: $('boss-bar-label'),
    toastCont:    $('toast-container'),
    screenPause:  $('screen-pause'),
    screenGO:     $('screen-gameover'),
    screenVic:    $('screen-victory'),
    btnResume:    $('btn-resume'),
    btnRestartP:  $('btn-restart-pause'),
    btnMenuP:     $('btn-menu-pause'),
    btnRestart:   $('btn-restart'),
    btnMenuGO:    $('btn-menu-go'),
    goSub:        $('go-sub-text'),
    goScore:      $('go-score-text'),
    btnRestartV:  $('btn-restart-vic'),
    btnMenuV:     $('btn-menu-vic'),
    vicSub:       $('vic-sub-text'),
    vicScore:     $('vic-score-text'),
};

//  Game state visible to UI 
let selectedTowerType = null;
let selectedTower     = null;
let showRanges        = false;
let gameSpeed         = 1;
let mouseX = 0, mouseY = 0;

//  Canvas resize 
function resizeCanvas(){
    el.canvas.width  = window.innerWidth;
    el.canvas.height = window.innerHeight;
}

//  Map Select screen 
function buildMapSelect(){
    el.mapGrid.innerHTML='';
    for(const def of MAP_DEFS){
        const card=document.createElement('div');
        card.className='map-card';
        card.style.setProperty('--accent', def.theme.accent);
        card.innerHTML=`
            <canvas class="map-preview" data-id="${def.id}" width="260" height="130"></canvas>
            <div class="map-info">
                <div class="map-name">${def.name}</div>
                <div class="map-diff ${def.diffClass}">${def.difficulty}</div>
                <div class="map-desc">${def.desc}</div>
            </div>`;
        card.addEventListener('click', ()=>startGame(def.id));
        el.mapGrid.appendChild(card);
    }
    requestAnimationFrame(()=>{
        document.querySelectorAll('.map-preview').forEach(c=>{
            const d=MAP_DEFS.find(m=>m.id===c.dataset.id);
            if(d) renderMapPreview(c,d);
        });
    });
}

function showTitleScreen(){
    el.screenTitle.classList.remove('hidden');
    el.hud.style.display='none';
    el.shop.style.display='none';
    hidePanels();
}
function hideTitleScreen(){
    el.screenTitle.classList.add('hidden');
    el.hud.style.display='flex';
    el.shop.style.display='flex';
}

//  HUD 
let _dcash=-1, _dlives=-1, _dwave=-1, _dscore=-1;
function updateHUD(cash, lives, wave, score, phase, interSec, cntSec){
    if(cash!==_dcash){     _dcash=cash;   el.hudCash.textContent='$'+cash.toLocaleString(); }
    if(lives!==_dlives){   _dlives=lives; el.hudLives.textContent=lives;
        el.hudLives.style.color=lives<=10?'#ff2020':lives<=30?'#ff9800':''; }
    if(wave!==_dwave){     _dwave=wave;   el.hudWave.textContent=wave; }
    if(score!==_dscore){   _dscore=score; el.hudScore.textContent=score.toLocaleString(); }

    if(phase==='countdown'){
        el.hudPhase.textContent='STARTING '+Math.ceil(cntSec)+'';
    } else if(phase==='spawning'||phase==='waiting'){
        el.hudPhase.textContent='WAVE IN PROGRESS';
    } else if(phase==='intermission'){
        el.hudPhase.textContent='NEXT WAVE '+Math.ceil(interSec)+'s';
    } else {
        el.hudPhase.textContent='READY';
    }
    // Wave skip button — show during active wave after 35 seconds
    if(el.btnSkip){
        const inWave = (phase==='spawning'||phase==='waiting');
        const elapsed = (typeof waveState!=='undefined') ? waveState.waveElapsed() : 0;
        el.btnSkip.classList.toggle('skip-hidden', !(inWave && elapsed > 35));
    }
}

function setWaveBar(pct){
    el.waveBarFill.style.width = Math.max(0,Math.min(100,pct*100))+'%';
}

//  Shop 
let _shopEls = {};

function buildShop(){
    el.shop.innerHTML='';
    _shopEls={};
    TOWER_ORDER.forEach((type,i)=>{
        const def=TOWER_DEFS[type];
        const div=document.createElement('div');
        div.className='shop-tower';
        div.dataset.type=type;
        div.style.setProperty('--tc', def.color);
        // Shorten name to fit card
        const shortName = def.name
            .replace(' Tower','').replace(' Array','').replace(' Cannon','')
            .replace(' Core','').replace('Chain ','');
        div.innerHTML=`
            <div class="st-key">${i+1}</div>
            <div class="st-icon" style="color:${def.color}">${def.icon||'⬡'}</div>
            <div class="st-name">${shortName}</div>
            <div class="st-cost">$${def.cost.toLocaleString()}</div>`;
        div.addEventListener('click',()=>selectBuildType(type));
        el.shop.appendChild(div);
        _shopEls[type]=div;
    });
}

function refreshShop(cash){
    for(const [type,el2] of Object.entries(_shopEls)){
        const def=TOWER_DEFS[type];
        el2.classList.toggle('unaffordable', cash<def.cost);
        el2.classList.toggle('selected', selectedTowerType===type);
    }
}

function selectBuildType(type){
    if(selectedTowerType===type){
        cancelPlacement(); return;
    }
    selectedTowerType=type;
    closeTowerPanel();           // MUST come before clearing selectedTower
    refreshShop(game.cash);
    document.body.style.cursor='crosshair';
}

function cancelPlacement(){
    selectedTowerType=null;
    document.body.style.cursor='';
    refreshShop(game?.cash||0);
}

//  Tower info/upgrade panel 
function openTowerPanel(tower){
    if(selectedTower && selectedTower !== tower) selectedTower.selected = false;
    selectedTower=tower;
    tower.selected = true;
    _renderPanel(tower);
    el.infoPanel.classList.add('visible');
}

function closeTowerPanel(){
    if(selectedTower) selectedTower.selected = false;
    selectedTower=null;
    el.infoPanel.classList.remove('visible');
}

function _renderPanel(tower){
    if(!tower){ el.panelContent.innerHTML=''; return; }
    const def  = TOWER_DEFS[tower.type];
    const abDef= def.ability;
    const abCD = Math.ceil(tower._abilityCooldown);
    const abilityReady = tower._abilityCooldown <= 0;

    // Stat bars (generous maxes so mid-game values look active)
    const DMG_MAX=600, RNG_MAX=500, RATE_MAX=5;
    const dmgPct  = Math.min(100, ((tower.laserDPS||tower.damage)/DMG_MAX)*100).toFixed(1);
    const rngPct  = Math.min(100, (tower.range/RNG_MAX)*100).toFixed(1);
    const ratePct = Math.min(100, (tower.fireRate/RATE_MAX)*100).toFixed(1);

    // Level pips
    let pipsHTML='';
    for(let i=0;i<tower.maxLevel;i++)
        pipsHTML+=`<div class="panel-pip ${i<tower.level?'done':''}"></div>`;

    // Stat label/value
    const statLbl = tower.laserDPS>0 ? 'DPS' : tower.voidPct>0 ? 'Void%' : 'Dmg';
    const statVal = tower.laserDPS>0 ? Math.round(tower.laserDPS)
        : tower.voidPct>0 ? Math.round(tower.voidPct*100)+'%'
        : Math.round(tower.damage);

    // Upgrade path nodes
    let upgHTML='';
    def.upgrades.forEach((u,i)=>{
        const isDone = i<tower.level;
        const isNext = i===tower.level;
        const canAff = game.cash>=u.cost;
        const cls = isDone?'done':isNext?'next':'locked';
        const dotChar = isDone?'✓':(i+1);
        const costBadge = isDone
            ? '<span style="color:rgba(255,255,255,.2);font-size:9px">DONE</span>'
            : isNext
                ? (canAff
                    ? `<span class="upg-cost-badge">$${u.cost.toLocaleString()}</span>`
                    : `<span class="upg-cost-badge" style="color:#f87171">$${u.cost.toLocaleString()}</span>`)
                : '';
        upgHTML+=`
        <div class="upg-node ${cls}" data-idx="${i}">
            <div class="upg-dot">${dotChar}</div>
            <div class="upg-info">
                <div class="upg-name">${u.name}</div>
                <div class="upg-desc-text">${u.desc}</div>
            </div>
            ${costBadge}
        </div>`;
    });

    // Targeting
    const targeting=['first','last','strong','close'];
    const tgtHTML=targeting.map(m=>{
        const active=tower.targeting===m;
        const style=active?`style="border-color:${def.color};color:${def.color};background:${def.color}22"`:'';
        return `<button class="tgt-btn" data-target="${m}" ${style}>${m.toUpperCase()}</button>`;
    }).join('');

    // Ability
    const abHTML=abDef?`
    <div class="panel-sep"></div>
    <button class="ability-btn ${abilityReady?'':'cooldown'}" id="panel-ability-btn">
        <span style="font-size:16px">${abilityReady?'⚡':'⏳'}</span>
        <span style="flex:1">
            <span style="font-size:12px;font-weight:900;letter-spacing:.5px">${abDef.name}</span>
            <span class="ab-key">&nbsp;${abilityReady?'[A]':'CD: '+abCD+'s'}</span>
            <span class="ab-desc">${abDef.desc}</span>
        </span>
    </button>`:
    '';

    el.panelContent.innerHTML=`
    <div class="panel-hdr" style="--tc:${def.color}">
        <div class="panel-hdr-accent"></div>
        <div class="panel-hdr-title">${def.name}</div>
        <div class="panel-hdr-meta">
            <div class="panel-hdr-pips">${pipsHTML}</div>
            <span class="panel-hdr-kills">Lv.${tower.level} &middot; ${tower.kills} kills</span>
        </div>
    </div>
    <div class="panel-body" style="--tc:${def.color}">
        <div class="panel-section-lbl">Stats</div>
        <div class="stat-bar-row">
            <span class="sbl">${statLbl}</span>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${dmgPct}%"></div></div>
            <span class="sbv">${statVal}</span>
        </div>
        <div class="stat-bar-row">
            <span class="sbl">Range</span>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${rngPct}%"></div></div>
            <span class="sbv">${Math.round(tower.range)}</span>
        </div>
        ${tower.fireRate>0?`
        <div class="stat-bar-row">
            <span class="sbl">Rate</span>
            <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${ratePct}%"></div></div>
            <span class="sbv">${tower.fireRate.toFixed(1)}/s</span>
        </div>`:''}

        <div class="panel-sep" style="margin-top:4px"></div>
        <div class="panel-section-lbl">Targeting</div>
        <div class="tgt-row" style="margin-bottom:2px">${tgtHTML}</div>

        <div class="panel-sep"></div>
        <div class="panel-section-lbl" style="margin-bottom:8px">Upgrades</div>
        <div class="upg-path">${upgHTML}</div>

        ${abHTML}

        <div class="panel-sep"></div>
        <button class="sell-btn" id="panel-sell-btn">Sell &nbsp;&#43;$${tower.getSellValue().toLocaleString()}</button>

        <div class="panel-kb-strip">
            <span class="pkb"><kbd class="kbd">E</kbd> Upgrade</span>
            <span class="pkb"><kbd class="kbd">A</kbd> Ability</span>
            <span class="pkb"><kbd class="kbd">Tab</kbd> Target</span>
            <span class="pkb"><kbd class="kbd">Q</kbd> Sell</span>
            <span class="pkb"><kbd class="kbd">[ ]</kbd> Cycle</span>
            <span class="pkb"><kbd class="kbd">Esc</kbd> Close</span>
        </div>
    </div>`;

    // Upgrade click
    el.panelContent.querySelectorAll('.upg-node[data-idx]').forEach(node=>{
        node.addEventListener('click',()=>{
            const idx=parseInt(node.dataset.idx);
            if(idx!==tower.level) return;
            const uc=tower.getUpgradeCost();
            if(!game.spendCash(uc)){ toast('Not enough cash!'); return; }
            tower.applyUpgrade();
            refreshShop(game.cash);
            _renderPanel(tower);
        });
    });

    // Targeting click
    el.panelContent.querySelectorAll('button[data-target]').forEach(btn=>{
        btn.addEventListener('click',()=>{
            tower.targeting=btn.dataset.target;
            _renderPanel(tower);
        });
    });

    // Ability click
    const abBtn=$('panel-ability-btn');
    if(abBtn) abBtn.addEventListener('click',()=>{
        tower.activateAbility();
        _renderPanel(tower);
    });

    // Sell click
    const sellBtn=$('panel-sell-btn');
    if(sellBtn) sellBtn.addEventListener('click',()=>{
        game.sellTower(tower);
        closeTowerPanel();
    });
}

//  Wave banner 
let _bannerTimeout=null;

function showWaveBanner(waveNum, bonusCash, bonusInterest, clearBonus=0){
    el.bannerWave.textContent='Wave '+waveNum+' Complete!';
    el.bannerSub.textContent = clearBonus > 0 ? '— FLAWLESS CLEAR —' : '— WAVE COMPLETE —';
    el.bannerBonus.textContent='+$'+(bonusCash+bonusInterest).toLocaleString()+' earned';
    if(el.bannerClear){
        if(clearBonus > 0){
            el.bannerClear.textContent='⭐ PERFECT CLEAR  +$'+clearBonus.toLocaleString();
            el.bannerClear.classList.add('show');
        } else {
            el.bannerClear.classList.remove('show');
        }
    }
    el.waveBanner.classList.add('visible');
    if(_bannerTimeout) clearTimeout(_bannerTimeout);
    _bannerTimeout=setTimeout(()=>el.waveBanner.classList.remove('visible'), 3400);
}

//  Boss bar 
function updateBossBar(boss){
    if(!boss||boss.isDead){
        el.bossBarWrap.classList.remove('visible'); return;
    }
    el.bossBarWrap.classList.add('visible');
    el.bossBarLabel.textContent=boss.label+(boss.isSuper?' [TITAN]':' [BOSS]');
    el.bossBarFill.style.width=Math.max(0,boss.health/boss.maxHealth*100)+'%';
}

//  Toasts 
const _toasts=[];
function toast(msg, dur=2400){
    const t=document.createElement('div');
    t.className='toast'; t.textContent=msg;
    el.toastCont.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; },(dur-400));
    setTimeout(()=>t.remove(), dur);
}

//  Speed cycling 
const SPEEDS=[1,2,3];
let speedIdx=0;
function cycleSpeed(){
    speedIdx=(speedIdx+1)%SPEEDS.length;
    gameSpeed=SPEEDS[speedIdx];
    el.btnSpeed.textContent=gameSpeed+'×';
    el.btnSpeed.classList.toggle('active', gameSpeed>1);
}

//  Ranges toggle 
function toggleRanges(){
    showRanges=!showRanges;
    el.btnRanges.classList.toggle('active',showRanges);
}

//  Pause 
function showPause(){  el.screenPause.classList.remove('hidden'); }
function hidePause(){  el.screenPause.classList.add('hidden'); }

//  Game Over / Victory 
function showGameOver(wave, score){
    el.goSub.textContent='You survived to Wave '+wave;
    el.goScore.textContent='Score: '+score.toLocaleString();
    el.screenGO.classList.remove('hidden');
}
function hideGameOver(){ el.screenGO.classList.add('hidden'); }

function showVictory(score){
    el.vicScore.textContent='Final Score: '+score.toLocaleString();
    el.screenVic.classList.remove('hidden');
}
function hideVictory(){ el.screenVic.classList.add('hidden'); }

function hidePanels(){
    hideGameOver(); hideVictory(); hidePause();
    el.waveBanner.classList.remove('visible');
    el.bossBarWrap.classList.remove('visible');
    closeTowerPanel();
}

//  Wire up persistent buttons 
function wireButtons(){
    el.btnRanges.addEventListener('click',  toggleRanges);
    el.btnSpeed.addEventListener('click',   cycleSpeed);
    el.btnPause.addEventListener('click',   ()=>game.togglePause());
    if(el.btnSkip) el.btnSkip.addEventListener('click', ()=>{ if(typeof game!=='undefined'&&game.skipWave) game.skipWave(); });
    el.btnMenu.addEventListener('click',    ()=>{ if(confirm('Return to main menu?')) game.returnToMenu(); });
    el.btnClosePanel.addEventListener('click', closeTowerPanel);

    el.btnResume.addEventListener('click',  ()=>game.togglePause());
    el.btnRestartP.addEventListener('click',()=>{ hidePause(); game.restart(); });
    el.btnMenuP.addEventListener('click',   ()=>{ hidePause(); game.returnToMenu(); });

    el.btnRestart.addEventListener('click', ()=>{ hideGameOver(); game.restart(); });
    el.btnMenuGO.addEventListener('click',  ()=>{ hideGameOver(); game.returnToMenu(); });

    el.btnRestartV.addEventListener('click',()=>{ hideVictory(); game.restart(); });
    el.btnMenuV.addEventListener('click',   ()=>{ hideVictory(); game.returnToMenu(); });

    // Keybind overlay: click backdrop to close
    const kbOv = document.getElementById('keybind-overlay');
    if(kbOv) kbOv.addEventListener('click', e =>{
        if(e.target === kbOv) closeKeybindHelp();
    });
}

//  Keybind help overlay 
let _kbOverlayOpen = false;
function toggleKeybindHelp(){
    _kbOverlayOpen = !_kbOverlayOpen;
    const ov = document.getElementById('keybind-overlay');
    if(ov) ov.classList.toggle('visible', _kbOverlayOpen);
}
function closeKeybindHelp(){
    _kbOverlayOpen = false;
    const ov = document.getElementById('keybind-overlay');
    if(ov) ov.classList.remove('visible');
}

//  Keyboard shortcuts 
const TARGET_MODES = ['first','last','strong','close'];

function handleKeydown(e){
    if(e.repeat) return;
    const k = e.key;
    const tag = document.activeElement?.tagName;
    // Don't capture keys if user is typing in an input
    if(tag==='INPUT'||tag==='TEXTAREA') return;

    // Help overlay swallows everything except close keys
    if(_kbOverlayOpen){
        if(k==='Escape'||k.toLowerCase()==='h'||k==='?'){ closeKeybindHelp(); e.preventDefault(); }
        return;
    }

    // Tab: cycle targeting on selected tower (before switch to avoid browser focus shift)
    if(k==='Tab' && selectedTower){
        e.preventDefault();
        const cur = TARGET_MODES.indexOf(selectedTower.targeting);
        selectedTower.targeting = TARGET_MODES[(cur+1)%TARGET_MODES.length];
        toast('Targeting: '+selectedTower.targeting.toUpperCase(), 900);
        _renderPanel(selectedTower);
        return;
    }

    // Delete / Backspace: sell selected tower
    if((k==='Delete'||k==='Backspace') && selectedTower){
        e.preventDefault();
        const val = selectedTower.getSellValue();
        game.sellTower(selectedTower);
        closeTowerPanel();
        toast('Sold for $'+val.toLocaleString(), 1200);
        return;
    }

    // Number keys: select tower type
    const idx = parseInt(k)-1;
    if(!isNaN(idx) && idx>=0 && idx<TOWER_ORDER.length){
        selectBuildType(TOWER_ORDER[idx]); return;
    }

    // Cycle through placed towers: [ = prev, ] = next
    if((k==='['||k===']') && typeof game!=='undefined' && game.towers?.length){
        e.preventDefault();
        const towers = game.towers;
        if(!towers.length) return;
        const cur = towers.indexOf(selectedTower);
        let next;
        if(k===']') next = (cur+1)%towers.length;
        else         next = (cur-1+towers.length)%towers.length;
        cancelPlacement();
        openTowerPanel(towers[next]);
        return;
    }

    switch(k.toLowerCase()){
        case 'escape':
            if(selectedTowerType){ cancelPlacement(); return; }
            if(selectedTower){ closeTowerPanel(); return; }
            break;

        case 'p': game.togglePause(); break;
        case 'f': cycleSpeed(); break;
        case 'r': toggleRanges(); break;
        case ' ': e.preventDefault(); waveState.skipToNext(); break;

        case 'h':
        case '?': toggleKeybindHelp(); break;

        case 'a':
            if(selectedTower){
                selectedTower.activateAbility();
                _renderPanel(selectedTower);
            }
            break;

        case 'e':
            if(selectedTower){
                if(!selectedTower.canUpgrade()){ toast('Tower is fully upgraded!', 1200); return; }
                const uc = selectedTower.getUpgradeCost();
                if(!game.spendCash(uc)){ toast('Not enough cash! Need $'+uc.toLocaleString(), 1600); return; }
                selectedTower.applyUpgrade();
                refreshShop(game.cash);
                _renderPanel(selectedTower);
                toast('Upgraded!', 900);
            }
            break;

        case 'q':
            if(selectedTower){
                const val = selectedTower.getSellValue();
                game.sellTower(selectedTower);
                closeTowerPanel();
                toast('Sold for $'+val.toLocaleString(), 1200);
            }
            break;

        case 'x':
            if(selectedTowerType){ cancelPlacement(); return; }
            if(selectedTower){ closeTowerPanel(); return; }
            break;
    }
}

// ── Enemy hover tooltip ───────────────────────────────────────────────────
let _enemyTooltipEl = null;

function _ensureTooltip() {
    if (!_enemyTooltipEl) {
        _enemyTooltipEl = document.createElement('div');
        _enemyTooltipEl.id = 'enemy-tooltip';
        _enemyTooltipEl.style.cssText = [
            'position:fixed',
            'pointer-events:none',
            'z-index:9999',
            'background:rgba(6,2,16,0.93)',
            'border:1px solid rgba(160,100,255,0.35)',
            'border-radius:7px',
            'padding:9px 13px',
            'font-family:"Courier New",monospace',
            'font-size:12px',
            'color:#e0d0ff',
            'min-width:170px',
            'max-width:250px',
            'box-shadow:0 4px 22px rgba(0,0,0,0.72)',
            'display:none',
            'line-height:1.45',
        ].join(';');
        document.body.appendChild(_enemyTooltipEl);
    }
    return _enemyTooltipEl;
}

function _updateEnemyTooltip(enemy, mx, my) {
    const tip = _ensureTooltip();
    if (!enemy) { tip.style.display = 'none'; return; }

    const pct = Math.max(0, enemy.health / enemy.maxHealth);
    const hpc = pct > 0.6 ? '#66bb6a' : pct > 0.25 ? '#ffb300' : '#f44336';

    // Collect applicable modifier badges
    const mods = [];
    if (enemy._beefed)
        mods.push({ label: 'Beefed Up',  color: '#ff7043', desc: '2.5× wave scaling' });
    if (enemy.armor > 0)
        mods.push({ label: 'Armored',    color: '#90caf9', desc: `${Math.round(enemy.armor*100)}% dmg reduction` });
    if (enemy._noStun || enemy._immuneToStun)
        mods.push({ label: 'No Stun',    color: '#fff176', desc: 'Immune to stun effects' });
    if (enemy._lead)
        mods.push({ label: 'Lead',       color: '#b0bec5', desc: 'Non-AoE capped at 1 dmg' });
    if (enemy.isHidden)
        mods.push({ label: 'Hidden',     color: '#80cbc4', desc: 'Needs detector tower' });
    if (enemy.isFlying)
        mods.push({ label: 'Flying',     color: '#29b6f6', desc: 'Ground towers ignore' });
    if (enemy.isBoss)
        mods.push({ label: enemy.isSuper ? 'SUPER BOSS' : 'Boss', color: '#ff4444', desc: 'High threat' });
    if (enemy.freezeTimer > 0)
        mods.push({ label: '❄ Frozen',   color: '#4fc3f7', desc: `${enemy.freezeTimer.toFixed(1)}s remaining` });
    else if (enemy._cryoHits > 0)
        mods.push({ label: `❄ Frost ×${enemy._cryoHits}`, color: '#81d4fa', desc: 'Freezes at 4 stacks' });
    if (enemy.slowTimer > 0)
        mods.push({ label: '⟳ Slowed',   color: '#4dd0e1', desc: `${Math.round((1-enemy.slowFactor)*100)}% slow` });
    if (enemy.burnTimer > 0)
        mods.push({ label: '🔥 Burning',  color: '#ff7043', desc: `${Math.round(enemy.burnDPS)} DPS burn` });

    const modHTML = mods.map(m =>
        `<div style="color:${m.color};font-size:10px;margin-top:2px">⬟ <b>${m.label}</b>`+
        `<span style="color:rgba(200,180,255,0.45);font-size:9px"> — ${m.desc}</span></div>`
    ).join('');

    const hpPct = Math.round(pct * 100);

    tip.innerHTML =
        `<div style="font-weight:bold;font-size:13px;color:${enemy.color};text-shadow:0 0 8px ${enemy.color}">${enemy.label}</div>`+
        `<div style="background:rgba(255,255,255,0.1);border-radius:3px;height:5px;margin:5px 0 3px;overflow:hidden">`+
            `<div style="width:${hpPct}%;background:${hpc};height:100%;border-radius:3px"></div></div>`+
        `<div style="color:rgba(255,255,255,0.55);font-size:10px">HP <span style="color:${hpc}">`+
            `${Math.max(0,Math.ceil(enemy.health)).toLocaleString()} / ${enemy.maxHealth.toLocaleString()}</span></div>`+
        `<div style="color:rgba(255,255,255,0.38);font-size:10px;margin-top:2px">`+
            `SPD: ${enemy.speed} · VAL: $${enemy.value}` +
            (enemy.isBoss ? ` · DMG: ${enemy.damage}` : '') +
        `</div>`+
        (modHTML ? `<div style="margin-top:5px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">${modHTML}</div>` : '');

    // Position near cursor, keep on screen
    const tipW = 210, tipH = 80 + mods.length * 16;
    let tx = mx + 18, ty = my - 10;
    if (tx + tipW > window.innerWidth)  tx = mx - tipW - 10;
    if (ty < 4)                          ty = 4;
    if (ty + tipH > window.innerHeight) ty = window.innerHeight - tipH - 4;

    tip.style.left    = tx + 'px';
    tip.style.top     = ty + 'px';
    tip.style.display = 'block';
}

//  Placement ghost drawing 
function drawPlacementGhost(ctx){
    if(!selectedTowerType) return;
    const def=TOWER_DEFS[selectedTowerType];
    const valid=game.isValidPlacement(mouseX,mouseY);

    ctx.save();
    ctx.globalAlpha=0.6;

    // Range preview
    ctx.fillStyle = valid ? def.color+'22' : 'rgba(255,50,50,.12)';
    ctx.beginPath(); ctx.arc(mouseX,mouseY,def.range,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = valid ? def.color+'88' : 'rgba(255,50,50,.55)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.arc(mouseX,mouseY,def.range,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    // Tower ghost body
    ctx.globalAlpha = valid ? 0.75 : 0.38;
    ctx.fillStyle   = valid ? def.color : '#ef5350';
    ctx.shadowColor = valid ? def.color : '#ef5350';
    ctx.shadowBlur  = 14;
    ctx.beginPath(); ctx.arc(mouseX,mouseY,14,0,Math.PI*2); ctx.fill();

    // X mark if invalid
    if(!valid){
        ctx.strokeStyle='#ef5350'; ctx.lineWidth=2.5; ctx.shadowBlur=0;
        ctx.beginPath();
        ctx.moveTo(mouseX-8,mouseY-8); ctx.lineTo(mouseX+8,mouseY+8); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mouseX+8,mouseY-8); ctx.lineTo(mouseX-8,mouseY+8); ctx.stroke();
    }

    ctx.restore();
}

//  Pan/zoom not implemented  canvas fills viewport 
function drawBossBarCanvas(ctx, W, boss){
    // Boss bar handled by DOM element  nothing to draw here
}
