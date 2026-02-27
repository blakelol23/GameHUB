// ============================================================
//  TOWERS.JS  -  Blockie Tower Defense V2
//  8 rebalanced towers | 4 upgrades each | active abilities
// ============================================================

const TOWER_DEFS = {
    // ── Dart Tower ── cheap backbone, no special detection base ────────────
    dart: {
        name:'Dart Tower', icon:'', cost:100,
        damage:9, range:138, fireRate:2.6, projSpeed:460, projColor:'#82b1ff',
        color:'#1565C0', desc:'Fast, cheap backbone tower. Reliable single-target DPS.',
        detects:[], aoe:0, size:18,
        ability:{ name:'BURST', desc:'Unleash 5 shots instantly.', cooldown:18, duration:0 },
        upgrades:[
            { name:'Sharper Tips',    cost:200,  dmgMult:1.35, rangeMult:1.0,  rateMult:1.0,  desc:'+35% damage.' },
            { name:'Rapid Loader',    cost:420,  dmgMult:1.0,  rangeMult:1.0,  rateMult:1.5,  desc:'+50% fire rate.' },
            { name:'Long Barrel',     cost:800,  dmgMult:1.0,  rangeMult:1.35, rateMult:1.0,  desc:'+35% range. Detects hidden.', unlocks:['hidden'] },
            { name:'HYPERFIRE',       cost:2000, dmgMult:1.6,  rangeMult:1.1,  rateMult:1.20, desc:'Max DPS upgrade. High rate and power.' },
        ],
    },
    // ── Cryo Tower ── slows, detects flying; hidden at upgrade 3 ───────────
    cryo: {
        name:'Cryo Tower', icon:'', cost:300,
        damage:7, range:148, fireRate:1.0, projSpeed:220, projColor:'#80deea',
        color:'#0097A7', desc:'Slows all enemies. Essential for buying time.',
        detects:['flying'], aoe:0, slowFactor:0.50, size:20,
        ability:{ name:'BLIZZARD', desc:'Freeze all in range for 1.8s.', cooldown:30, duration:1.8 },
        upgrades:[
            { name:'Deep Freeze',    cost:380,  dmgMult:1.0,  rangeMult:1.0,  rateMult:1.0,  desc:'Slow becomes 65%.', slowBoost:0.15 },
            { name:'Cryo Amp',       cost:750,  dmgMult:1.7,  rangeMult:1.0,  rateMult:1.25, desc:'+70% damage, faster fire.' },
            { name:'Blizzard Zone',  cost:1400, dmgMult:1.0,  rangeMult:1.45, rateMult:1.0,  desc:'+45% range. Detects hidden.', unlocks:['hidden'] },
            { name:'ABSOLUTE ZERO',  cost:3200, dmgMult:1.8,  rangeMult:1.15, rateMult:1.35, desc:'Frozen enemies shatter for bonus damage.' },
        ],
    },
    // ── Sniper ── long-range pierce; detects flying+hidden from the start ──
    sniper: {
        name:'Sniper', icon:'', cost:700,
        damage:85, range:320, fireRate:0.40, projSpeed:9999, projColor:'#ff80ab',
        color:'#AD1457', desc:'Piercing shots through all enemies in a line. Armor-piercing.',
        detects:['flying','hidden'], aoe:0, piercing:true, size:19,
        ability:{ name:'HEADSHOT', desc:'Next shot deals 3x damage.', cooldown:20, duration:0 },
        upgrades:[
            { name:'Tungsten Core',   cost:900,  dmgMult:1.6,  rangeMult:1.0,  rateMult:1.0,  desc:'+60% damage. Full armor pierce.' },
            { name:'Extended Scope',  cost:1800, dmgMult:1.0,  rangeMult:1.38, rateMult:1.0,  desc:'+38% range. Nearly cross-map.' },
            { name:'Tri-Burst',       cost:3000, dmgMult:1.0,  rangeMult:1.0,  rateMult:1.6,  desc:'+60% fire rate.' },
            { name:'APEX ROUND',      cost:9000, dmgMult:2.0,  rangeMult:1.15, rateMult:1.25, desc:'Extreme power. Devastates single targets.' },
        ],
    },
    // ── Flak Cannon ── AoE swarm control; gains flying detect at upgrade 3 ─
    farm: {
        name:'Farm', icon:'🌾', cost:250,
        damage:0, range:0, fireRate:0, projSpeed:0, projColor:'#ffd600',
        color:'#2e7d32', desc:'Passive income. Earns $100 per wave clear. Max 8 placed.',
        detects:[], aoe:0, size:18,
        ability:null,
        upgrades:[
            { name:'Fertilizer',  cost:300,  dmgMult:1, rangeMult:1, rateMult:1, desc:'$250 per wave clear.' },
            { name:'Irrigation',  cost:650,  dmgMult:1, rangeMult:1, rateMult:1, desc:'$625 per wave clear.' },
            { name:'Greenhouse',  cost:1300, dmgMult:1, rangeMult:1, rateMult:1, desc:'$1,562 per wave clear.' },
            { name:'GOLD FIELDS', cost:2500, dmgMult:1, rangeMult:1, rateMult:1, desc:'$2,500 per wave. Maximum crop output.' },
        ],
    },
    // ── Chain Lightning ── chains to flying; hidden detect at upgrade 3 ────
    arc: {
        name:'Chain Lightning', icon:'', cost:900,
        damage:18, range:170, fireRate:1.5, projSpeed:0, projColor:'#40c4ff',
        color:'#0288D1', desc:'Lightning arcs chain to nearby enemies. Shocks slow movement speed.',
        detects:['flying'], chainCount:3, size:20,
        ability:{ name:'STORM', desc:'Arc jumps 10x for 6 seconds.', cooldown:24, duration:6 },
        upgrades:[
            { name:'Overcharge',      cost:1000, dmgMult:1.45, rangeMult:1.0,  rateMult:1.0,  desc:'+45% damage.' },
            { name:'Wide Arc',        cost:1800, dmgMult:1.0,  rangeMult:1.32, rateMult:1.0,  desc:'+32% range.', chainAdd:1 },
            { name:'Shock Field',     cost:3000, dmgMult:1.0,  rangeMult:1.0,  rateMult:1.4,  desc:'Heavier shock: slows 70%. Detects hidden.', special:'shock', unlocks:['hidden'] },
            { name:'SUPERCONDUCTOR',  cost:6000, dmgMult:1.65, rangeMult:1.12, rateMult:1.2,  chainAdd:2, desc:'Max chain count. Extreme output. 80% slow.', special:'shock' },
        ],
    },
    // ── Void Cannon ── Armor-piercing flat damage + Void Mark vulnerability debuff ──
    // Each shot Void Marks the target: +25% damage taken from ALL sources for 4s.
    // VOID PULSE ability: burst 2000 armorPierce + marks all in range for 5s.
    void: {
        name:'Void Cannon', icon:'', cost:4000,
        damage:260, range:195, fireRate:0.42, projSpeed:440, projColor:'#ce93d8',
        color:'#6A1B9A',
        desc:'Armor-piercing bolts. Each hit Void Marks the target: +25% damage taken from all sources for 4s. Detects everything.',
        detects:['flying','hidden'], voidMark:0.25, voidMarkDur:4.0, size:21,
        ability:{ name:'VOID PULSE', desc:'All enemies in range take 2000 armor-piercing damage and are Void Marked for 5s.', cooldown:42, duration:0 },
        upgrades:[
            { name:'Phase Lock',   cost:4000,  dmgMult:1.55, rangeMult:1.0,  rateMult:1.0,  desc:'+55% damage. Void Mark bonus rises to +32%.', markBoost:0.07 },
            { name:'Null Field',   cost:7000,  dmgMult:1.0,  rangeMult:1.30, rateMult:1.25, desc:'+30% range, +25% fire rate.' },
            { name:'Reality Tear', cost:11000, dmgMult:1.60, rangeMult:1.0,  rateMult:1.0,  desc:'+60% damage. Void Mark → +44% vuln, lasts 6s.', markBoost:0.12, markDurBoost:2.0 },
            { name:'OBLIVION',     cost:22000, dmgMult:1.80, rangeMult:1.18, rateMult:1.22, desc:'Devastating. +80% damage. +20% range/rate. Void Mark → +56% vuln.', markBoost:0.12 },
        ],
    },
    // ── Laser Array ── sustained ramp-up DPS beam; detects flying+hidden ───
    laser: {
        name:'Laser Array', icon:'', cost:2000,
        damage:16, range:162, fireRate:0, projSpeed:0, projColor:'#ff1744',
        color:'#B71C1C', desc:'Continuous burn beam. Ramp-up DPS — longer on one target = more damage. Detects everything.',
        detects:['flying','hidden'], laserDPS:16, size:20,
        ability:{ name:'OVERHEAT', desc:'2.5x beam damage for 4 seconds.', cooldown:22, duration:4 },
        upgrades:[
            { name:'Focused Beam',    cost:2800, dmgMult:1.6,  rangeMult:1.0,  rateMult:1.0,  desc:'+60% DPS. Higher ramp cap.' },
            { name:'Extended Emitter',cost:5000, dmgMult:1.0,  rangeMult:1.42, rateMult:1.0,  desc:'+42% range.' },
            { name:'Scatter Array',   cost:9000, dmgMult:1.0,  rangeMult:1.0,  rateMult:1.0,  desc:'3 simultaneous beams.', scatterBeams:3 },
            { name:'INFERNO',         cost:20000,dmgMult:1.75, rangeMult:1.15, rateMult:1.0,  desc:'Extreme DPS. Max ramp at 3.5x. Burns through anything.' },
        ],
    },
    // ── Siege Core ── heavy single shell; gains hidden detect at upgrade 2 ─
    siege: {
        name:'Siege Core', icon:'', cost:3200,
        damage:420, range:220, fireRate:0.27, projSpeed:180, projColor:'#ff6d00',
        color:'#BF360C', desc:'Massive armor-piercing shell. Huge blast radius. Devastating sustained damage.',
        detects:[], aoe:110, size:26,
        ability:{ name:'CARPET BOMB', desc:'Fire 3 rapid shells instantly.', cooldown:44, duration:0 },
        upgrades:[
            { name:'Payload',         cost:3500, dmgMult:1.8,  rangeMult:1.0,  rateMult:1.0,  desc:'+80% damage.' },
            { name:'Seismic',         cost:5500, dmgMult:1.0,  rangeMult:1.32, rateMult:1.45, desc:'+32% range & +45% rate. Stuns. Detects hidden.', special:'stun', unlocks:['hidden'], aoeMult:1.0 },
            { name:'Annihilator',     cost:9000, dmgMult:2.0,  rangeMult:1.0,  rateMult:1.0,  desc:'+100% dmg. Blast radius +65%.', aoeMult:1.65 },
            { name:'WORLD ENDER',     cost:25000,dmgMult:2.2,  rangeMult:1.15, rateMult:1.3,  desc:'Apocalyptic. All stats maximised.', aoeMult:1.25 },
        ],
    },
};

const TOWER_ORDER = ['dart','cryo','sniper','farm','arc','void','laser','siege'];

//  Lightning arc visual 
const lightningArcs = [];

class LightningArc {
    constructor(x1,y1,x2,y2,color,life=.18){
        this.x1=x1;this.y1=y1;this.x2=x2;this.y2=y2;
        this.color=color;this.life=life;this.maxLife=life;
        this.pts=this._gen();
    }
    _gen(){
        const pts=[{x:this.x1,y:this.y1}];
        for(let i=1;i<7;i++){
            const t=i/7;
            pts.push({
                x:this.x1+(this.x2-this.x1)*t+(Math.random()-.5)*26,
                y:this.y1+(this.y2-this.y1)*t+(Math.random()-.5)*26,
            });
        }
        pts.push({x:this.x2,y:this.y2});
        return pts;
    }
    update(dt){ this.life-=dt; return this.life>0; }
    draw(ctx){
        if(this.life<=0) return;
        const a=this.life/this.maxLife;
        ctx.save();
        ctx.strokeStyle=this.color; ctx.lineWidth=2;
        ctx.shadowColor=this.color; ctx.shadowBlur=14;
        ctx.globalAlpha=a*.9;
        ctx.beginPath(); ctx.moveTo(this.pts[0].x,this.pts[0].y);
        for(let i=1;i<this.pts.length;i++) ctx.lineTo(this.pts[i].x,this.pts[i].y);
        ctx.stroke();
        ctx.lineWidth=.8; ctx.globalAlpha=a*.45;
        ctx.beginPath(); ctx.moveTo(this.pts[0].x,this.pts[0].y);
        for(let i=1;i<this.pts.length;i++) ctx.lineTo(this.pts[i].x,this.pts[i].y);
        ctx.stroke();
        ctx.restore();
    }
}

//  Bullet 
class Bullet {
    constructor(x,y,target,damage,speed,color,opts={}){
        this.x=x; this.y=y; this.target=target;
        this.damage=damage; this.speed=speed; this.color=color;
        this.aoe      = opts.aoe      || 0;
        this.slow     = opts.slow     || 0;
        this.slowDur  = opts.slowDur  || 0;
        this.stun     = opts.stun     || 0;
        this.burn     = opts.burn     || false;
        this.burnDPS  = opts.burnDPS  || 0;
        this.burnDur  = opts.burnDur  || 0;
        this.piercing = opts.piercing || false;
        this.voidPct     = opts.voidPct     || 0;     // legacy percent-HP damage
        this.voidMark    = opts.voidMark    || 0;     // void mark vulnerability bonus
        this.voidMarkDur = opts.voidMarkDur || 4.0;   // mark duration in seconds
        this.armorPierce = opts.armorPierce || false; // bypass armor flag
        this.frost    = opts.frost    || false;  // cryo bullets track freeze stacks
        this.size     = opts.size     || 4;
        this.dead     = false;
        this._didAoeImpact = false;
        this.trail    = [];
        this._pierced = new Set();
        this._angle   = 0;
        this._dir     = null;
        this._savedX  = null;   // last known target x (AoE bullets continue here on target death)
        this._savedY  = null;
    }

    update(dt, enemies){
        if(this.dead) return;
        // Track target position every frame so we can fly there after it dies
        if(this.target && !this.target.isDead){
            this._savedX = this.target.x;
            this._savedY = this.target.y;
        }
        if(!this.target || this.target.isDead){
            // AoE bullets (siege/flak) continue to last known target position and detonate
            if(this.aoe > 0 && this._savedX !== null){
                const dx=this._savedX-this.x, dy=this._savedY-this.y;
                const dist=Math.hypot(dx,dy);
                if(dist < 8){
                    this._angle=Math.atan2(dy,dx);
                    this._impact(enemies); return;
                }
                const step=this.speed*dt;
                this.trail.push({x:this.x,y:this.y});
                if(this.trail.length>6) this.trail.shift();
                this.x+=dx/dist*step; this.y+=dy/dist*step;
                return;
            }
            if(this.piercing){
                this._continueDir(dt,enemies); return;
            }
            this.dead=true; return;
        }
        const dx=this.target.x-this.x, dy=this.target.y-this.y;
        const dist=Math.hypot(dx,dy);
        if(dist<8||this.speed>=9000){
            this._angle=Math.atan2(dy,dx);
            this._impact(enemies); return;
        }
        const step=this.speed*dt;
        this.trail.push({x:this.x,y:this.y});
        if(this.trail.length>6) this.trail.shift();
        this.x+=dx/dist*step; this.y+=dy/dist*step;
    }

    _continueDir(dt,enemies){
        if(!this._dir){
            this._dir={x:Math.cos(this._angle),y:Math.sin(this._angle)};
        }
        // Soft steering: curve toward the nearest enemy in the forward arc so the
        // bullet tracks the next target instead of flying in a dead-straight line.
        // Only steer within ~60° of current heading so the bullet never reverses.
        if(dt > 0){
            let bestDist = Infinity, steerTarget = null;
            for(const e of enemies){
                if(e.isDead || this._pierced.has(e)) continue;
                const ex = e.x - this.x, ey = e.y - this.y;
                const dist = Math.hypot(ex, ey);
                if(dist < 10 || dist > 380) continue;
                const dot = (ex / dist) * this._dir.x + (ey / dist) * this._dir.y;
                if(dot > 0.5 && dist < bestDist){ bestDist = dist; steerTarget = e; }
            }
            if(steerTarget){
                const ex = steerTarget.x - this.x, ey = steerTarget.y - this.y;
                const dist = Math.hypot(ex, ey);
                const steer = 4.0 * dt;
                const nx = this._dir.x + (ex / dist) * steer;
                const ny = this._dir.y + (ey / dist) * steer;
                const len = Math.hypot(nx, ny);
                this._dir.x = nx / len; this._dir.y = ny / len;
            }
        }
        const step=this.speed*dt;
        this.x+=this._dir.x*step; this.y+=this._dir.y*step;
        if(this.x<-60||this.x>3000||this.y<-60||this.y>2000){this.dead=true;return;}
        for(const e of enemies){
            if(e.isDead||this._pierced.has(e)) continue;
            if(Math.hypot(e.x-this.x,e.y-this.y)<(e.size+this.size)){
                this._hitEnemy(e);
                if(this.dead) break;  // Lead armor stopped the bullet
            }
        }
    }

    _impact(enemies){
        this._didAoeImpact = this.aoe > 0;
        if(this.aoe>0){
            for(const e of enemies){
                if(e.isDead) continue;
                if(Math.hypot(e.x-this.x,e.y-this.y)<=this.aoe) this._hitEnemy(e);
            }
            spawnAoeRing(this.x,this.y,this.aoe,this.color);
        } else {
            this._hitEnemy(this.target);
        }
        if(this.piercing){
            this._dir=null;
            // Cap continuation speed so instant-delivery bullets (sniper speed≥9000)
            // don't fly clean off the map before steering can find the next target.
            if(this.speed >= 9000) this.speed = 700;
            this._continueDir(0,enemies);
            this.target = null;  // release original target — prevents re-homing to already-pierced enemy
        } else {
            this.dead=true;
        }
    }

    _hitEnemy(e){
        if(this._pierced.has(e)) return;
        this._pierced.add(e);
        const isAoe = !!(this._didAoeImpact && this.aoe > 0);
        // Apply Void Mark BEFORE damage so the bonus is included on this very hit
        if(this.voidMark > 0) e.applyVoidMark(this.voidMark, this.voidMarkDur);
        if(this.voidPct > 0){
            // Legacy percent-HP path (no longer used by void tower)
            let vdmg = e.maxHealth * this.voidPct;
            if(e.isBoss || e.isSuper) vdmg = Math.min(vdmg, 45000);
            e.applyDamage(vdmg, {armorPierce:true, aoe:isAoe});
        } else {
            const pierce = !!(this.piercing || this.armorPierce || this.voidMark > 0);
            e.applyDamage(this.damage, {armorPierce:pierce, aoe:isAoe});
        }
        if(this.slow>0 && this.slowDur>0){
            if(this.frost) e.applyFrost(this.slow, this.slowDur);
            else           e.applySlow(this.slow, this.slowDur);
        }
        if(this.stun>0)                    e.applyStun(this.stun);
        if(this.burn && this.burnDPS>0)    e.applyBurn(this.burnDPS, this.burnDur||3);
        // Lead armor: a piercing bullet is stopped if the Lead enemy survives the hit.
        // If the hit kills the Lead enemy, the bullet punches through and keeps going.
        if(this.piercing && e._lead && !e.isDead){
            this.dead = true;
        }
    }

    draw(ctx){
        if(this.dead) return;
        ctx.save();
        for(let i=0;i<this.trail.length;i++){
            const a=(i+1)/this.trail.length*0.55;
            ctx.fillStyle=this.color; ctx.globalAlpha=a;
            ctx.beginPath();
            ctx.arc(this.trail[i].x,this.trail[i].y,(this.size*.7)*(i/this.trail.length),0,Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha=1;
        ctx.shadowColor=this.color; ctx.shadowBlur=12;
        ctx.fillStyle=this.color;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.7)';
        ctx.shadowBlur=0;
        ctx.beginPath(); ctx.arc(this.x-1,this.y-1,this.size*.35,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

//  AoE ring visual 
const aoeRings = [];
function spawnAoeRing(x,y,r,color){
    aoeRings.push({x,y,r,maxR:r,life:0,color});
}
function updateAoeRings(dt){
    for(let i=aoeRings.length-1;i>=0;i--){
        aoeRings[i].life+=dt;
        if(aoeRings[i].life>0.4) aoeRings.splice(i,1);
    }
}
function drawAoeRings(ctx){
    for(const ring of aoeRings){
        const a=Math.max(0,1-ring.life/0.4);
        const r=ring.r*(0.5+ring.life/0.4*0.5);
        ctx.save();
        ctx.globalAlpha=a*0.55;
        ctx.strokeStyle=ring.color;
        ctx.lineWidth=2.5;
        ctx.shadowColor=ring.color; ctx.shadowBlur=14;
        ctx.beginPath(); ctx.arc(ring.x,ring.y,r,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=a*0.12;
        ctx.fillStyle=ring.color;
        ctx.beginPath(); ctx.arc(ring.x,ring.y,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

// Helper to darken a hex color string by fraction f (0..1)
function _darkenHex(hex, f){
    try {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        const m = 1 - f;
        return `rgb(${(r*m)|0},${(g*m)|0},${(b*m)|0})`;
    } catch(_){ return hex; }
}

//  Tower 
class Tower {
    constructor(type,x,y){
        const def=TOWER_DEFS[type];
        this.type=type; this.x=x; this.y=y;
        this._def=def;
        this.level=0;     // 0=base, 1-4=upgrades applied
        this.maxLevel=def.upgrades.length;

        this.damage    = def.damage;
        this.range     = def.range;
        this.fireRate  = def.fireRate;
        this.projSpeed = def.projSpeed;
        this.projColor = def.projColor;
        this.color     = def.color;
        this.aoe       = def.aoe       || 0;
        this.slowFactor= def.slowFactor|| 0;
        this.chainCount= def.chainCount|| 0;
        this.voidPct   = def.voidPct   || 0;  // legacy (unused by void tower post-rework)
        this.voidMark    = def.voidMark    || 0;   // vulnerability bonus applied on hit
        this.voidMarkDur = def.voidMarkDur || 4.0; // duration of Void Mark in seconds
        this.laserDPS  = def.laserDPS  || 0;
        this.scatterBeams = 1;
        this.piercing  = def.piercing  || false;
        this._detects  = new Set(def.detects||[]);

        this._fireCooldown  = 0;
        this._abilityCooldown = 0;
        this._abilityActive   = false;
        this._abilityTimer    = 0;

        this.kills    = 0;
        this.totalDmg = 0;
        this.targeting= 'first';  // 'first' | 'last' | 'strong' | 'close'
        this.selected = false;
        this._hovered = false;

        // Laser-specific
        this._laserTarget        = null;
        this._laserCharge        = 0;   // ramp-up 0-1
        this._laserBeamPts       = [];  // for draw
        this._laserRampTime      = 0;   // seconds on current target
        this._laserRampTarget    = null;
        this._laserRampMult      = 1.0;  // stored each frame for draw use
        this._laserScatterTargets= [];  // active scatter-beam targets for draw
        this._laserFloatAccum    = 0;
        this._laserFloatTimer    = 0;

        // Arc-specific
        this._arcShockFactor = 0.55;  // slow factor: 0.55 = 45% slow (base)

        // Visual
        this._shootFlash = 0;
        this._baseAngle  = -Math.PI / 2;
        this._turretAngle= -Math.PI / 2;
        this._totalSpend = def.cost;

        // Corruption (used by hidden wave)
        this._stunTimer     = 0;      // seconds remaining stunned
        this._corruptBuf    = null;   // { type:'buff'|'debuff', restore:fn, timer:0 }
        this._corruptGlitch = 0;      // visual glitch flash 0-1
    }

    //  Upgrade 
    canUpgrade(){ return this.level < this.maxLevel; }

    getUpgradeDef(){
        if(!this.canUpgrade()) return null;
        return this._def.upgrades[this.level];
    }

    getUpgradeCost(){
        const u=this.getUpgradeDef();
        return u ? u.cost : 0;
    }

    applyUpgrade(){
        const u=this._def.upgrades[this.level];
        if(!u) return;
        if(u.dmgMult)   this.damage    *= u.dmgMult;
        if(u.rangeMult) this.range     *= u.rangeMult;
        if(u.rateMult)  this.fireRate  *= u.rateMult;
        if(u.aoeMult)   this.aoe       *= u.aoeMult;
        if(u.slowBoost) this.slowFactor = Math.max(0, this.slowFactor - u.slowBoost);
        if(u.chainAdd)  this.chainCount+= u.chainAdd;
        if(u.voidBoost)    this.voidPct     += u.voidBoost;     // legacy
        if(u.markBoost)   this.voidMark    += u.markBoost;
        if(u.markDurBoost)this.voidMarkDur += u.markDurBoost;
        if(u.scatterBeams) this.scatterBeams = u.scatterBeams;
        if(u.unlocks){
            for(const s of u.unlocks) this._detects.add(s);
        }
        if(u.special === 'stun') this._stunOnHit = 0.5;
        if(u.special === 'shock') this._arcShockFactor = (this.level+1 >= this._def.upgrades.length) ? 0.20 : 0.30;  // 70% or 80% slow
        this._totalSpend += u.cost;
        this.level++;
        if(this.laserDPS>0) this.laserDPS = this.damage;
    }

    getSellValue(){ return Math.floor(this._totalSpend * 0.60); }

    //  Update 
    update(dt, enemies, bullets){
        // Corruption stun
        if(this._stunTimer > 0){
            this._stunTimer -= dt;
            this._corruptGlitch = Math.min(1, this._corruptGlitch + dt * 4);
            return;  // stunned — skip all firing
        }
        this._corruptGlitch = Math.max(0, this._corruptGlitch - dt * 3);
        // Corruption buff/debuff countdown
        if(this._corruptBuf){
            this._corruptBuf.timer -= dt;
            if(this._corruptBuf.timer <= 0){
                try { this._corruptBuf.restore(); } catch(_){}
                this._corruptBuf = null;
            }
        }

        this._shootFlash = Math.max(0, this._shootFlash - dt * 6);

        // Ability timer
        if(this._abilityActive){
            this._abilityTimer -= dt;
            if(this._abilityTimer <= 0) this._abilityActive = false;
        }
        if(this._abilityCooldown > 0) this._abilityCooldown -= dt;

        // Farm towers are passive income — no combat update
        if(this.type === 'farm') return;

        // Laser tower special handling
        if(this.laserDPS > 0){ this._updateLaser(dt,enemies); return; }

        // Fire rate
        if(this._fireCooldown > 0){ this._fireCooldown -= dt; return; }

        const target = this._pickTarget(enemies);
        if(!target) { this._laserTarget=null; return; }

        // Aim turret
        this._turretAngle = Math.atan2(target.y - this.y, target.x - this.x);

        this._fire(target, enemies, bullets);
        const rate = this._abilityActive && this.type==='dart' ? this.fireRate*3 : this.fireRate;
        this._fireCooldown = 1 / rate;
    }

    _updateLaser(dt, enemies){
        if(this._fireCooldown > 0){ this._fireCooldown -= dt; }

        const target = this._pickTarget(enemies);
        if(!target){
            this._laserTarget=null; this._laserCharge=Math.max(0,this._laserCharge-.08);
            // Only reset ramp when the wave is fully clear (all enemies gone)
            if(enemies.length === 0) this._laserRampTime = 0;
            return;
        }
        this._laserTarget = target;
        this._turretAngle = Math.atan2(target.y-this.y, target.x-this.x);
        // Snap to full charge on first lock-on — beam is at full brightness immediately
        if(this._laserCharge === 0) this._laserCharge = 1.0;
        this._laserCharge = Math.min(1, this._laserCharge + dt*1.5);

        // Ramp-up: persist across target switches and kills — only flush floats on switch
        if(this._laserRampTarget !== target){
            // flush accumulated damage float for the previous target before switching
            if(this._laserFloatAccum >= 1 && this._laserRampTarget){
                spawnDmgFloat(this._laserRampTarget.x, this._laserRampTarget.y - this._laserRampTarget.size * 0.9,
                    Math.round(this._laserFloatAccum), '#ff1744');
            }
            this._laserRampTarget = target;
            // Ramp time is preserved — power carries over to next target
            this._laserFloatAccum = 0;
            this._laserFloatTimer = 0;
        }
        this._laserRampTime += dt;
        // Ramp goes 1.0 → 5.0× over 5.5s; INFERNO (level 4) pushes cap to 6.5×
        const rampCap  = this.level >= 4 ? 6.5 : 5.0;
        const rampTime = 5.5;
        const rampMult = Math.min(rampCap, 1.0 + (rampCap - 1.0) * (this._laserRampTime / rampTime));
        this._laserRampMult = rampMult;  // store for draw

        const dps = this.laserDPS * this._laserCharge * rampMult *
                    (this._abilityActive ? 2.5 : 1);

        // Deal ramp-up damage (silent — floats are batched below to avoid spam)
        const dmgDealt = target.applyDamage(dps * dt, { silent: true });
        this.totalDmg += dmgDealt;
        this._laserFloatAccum += dmgDealt;
        this._laserFloatTimer += dt;

        // Flush a single float every 0.5 seconds instead of every frame
        if(this._laserFloatTimer >= 0.5){
            if(this._laserFloatAccum >= 1){
                spawnDmgFloat(target.x, target.y - target.size * 0.9,
                    Math.round(this._laserFloatAccum), '#ff1744');
            }
            this._laserFloatAccum = 0;
            this._laserFloatTimer = 0;
        }

        if(target.isDead){
            // flush remaining accum on kill
            if(this._laserFloatAccum >= 1){
                spawnDmgFloat(target.x, target.y - target.size * 0.9,
                    Math.round(this._laserFloatAccum), '#ff6d00');
            }
            this._laserFloatAccum = 0;
            this._laserFloatTimer = 0;
            this.kills++;
            this._laserTarget     = null;
            this._laserRampTarget = null;
            // Ramp time is preserved — power does NOT reset on kill
        }

        // Burn effect
        target.applyBurn(dps * 0.3, 1.5);

        // Scatter beams — damage + store targets for rendering
        this._laserScatterTargets = [];
        if(this.scatterBeams > 1){
            let count = 0;
            for(const e of enemies){
                if(e===target||e.isDead) continue;
                if(count >= this.scatterBeams-1) break;
                const dist=Math.hypot(e.x-this.x,e.y-this.y);
                if(dist<=this.range){
                    e.applyDamage(dps*dt*0.65, { silent:true });
                    e.applyBurn(dps*0.15,1);
                    this._laserScatterTargets.push(e);
                    count++;
                }
            }
        }
    }

    _fire(target, enemies, bullets){
        this._shootFlash = 1;
        if(typeof sfxFiles!=='undefined') sfxFiles.play('shoot');
        // Arc / chain lightning
        if(this.type==='arc'){
            this._fireArc(target, enemies);
            return;
        }

        // Void
        if(this.type==='void'){
            this._fireVoid(target, enemies, bullets);
            return;
        }

        // Cryo
        if(this.type==='cryo'){
            const b=new Bullet(this.x,this.y,target,this.damage,this.projSpeed,this.projColor,{
                aoe:     this.aoe,
                slow:    this.slowFactor,
                slowDur: 2.2,
                frost:   true,    // tracks cryo stacks — freezes after 4 hits
            });
            bullets.push(b);
            return;
        }

        // Normal / Sniper / Flak / Siege / Dart
        const opts={
            aoe:      this.aoe,
            size:     this.type==='siege' ? 7 : this.type==='sniper' ? 4 : 4,
            piercing: this.piercing,
        };
        if(this._stunOnHit) opts.stun = this._stunOnHit;

        const dmg = this._abilityActive && this.type==='sniper'
            ? this.damage * 3
            : this.damage;
        if(this._abilityActive && this.type==='sniper') this._abilityActive=false;

        const b=new Bullet(this.x,this.y,target,dmg,this.projSpeed,this.projColor,opts);
        bullets.push(b);

        // Flak barrage ability
        if(this._abilityActive && this.type==='flak' && this._barrageShots > 0){
            this._barrageShots--;
            // extra bullets handled via rapid cooldown
        }
    }

    _fireArc(target, enemies){
        if(typeof sfxFiles!=='undefined') sfxFiles.play('shoot');
        let current = target;
        const hit   = new Set([target]);
        const chains = this._abilityActive ? 10 : this.chainCount;

        for(let c = 0; c < chains; c++){
            const dmg = this.damage * Math.pow(0.78, c);
            current.applyDamage(dmg, {});
            this.totalDmg += dmg;
            if(current.isDead) this.kills++;
            // Shock: always slow (never stun). Factor improves with upgrades.
            const slowDur = 1.0 + c * 0.18;
            current.applySlow(this._arcShockFactor, slowDur);

            // Find next
            let next=null, bestD=180;
            for(const e of enemies){
                if(e.isDead||hit.has(e)) continue;
                const d=Math.hypot(e.x-current.x,e.y-current.y);
                if(d<bestD){ bestD=d; next=e; }
            }
            lightningArcs.push(new LightningArc(current.x,current.y,
                next?next.x:current.x+(Math.random()-.5)*30,
                next?next.y:current.y+(Math.random()-.5)*30,
                this.projColor));
            if(!next) break;
            hit.add(next);
            current=next;
        }
    }

    _fireVoid(target, enemies, bullets){
        if(this._abilityActive){
            // VOID PULSE: flat 2000 armor-piercing burst + Void Mark all in range
            for(const e of enemies){
                if(e.isDead) continue;
                if(Math.hypot(e.x-this.x,e.y-this.y)<=this.range){
                    e.applyVoidMark(this.voidMark, 5.0);
                    const dmg = e.applyDamage(2000, {armorPierce:true});
                    this.totalDmg += dmg;
                }
            }
            spawnAoeRing(this.x,this.y,this.range,this.projColor);
            this._abilityActive=false;
            return;
        }

        const b=new Bullet(this.x,this.y,target,this.damage,this.projSpeed,this.projColor,
            {voidMark:this.voidMark, voidMarkDur:this.voidMarkDur, armorPierce:true, size:5});
        bullets.push(b);
    }

    activateAbility(){
        const ab=this._def.ability;
        if(!ab) return false;
        if(this._abilityCooldown>0) return false;

        this._abilityCooldown = ab.cooldown;
        this._abilityActive   = ab.duration > 0;
        this._abilityTimer    = ab.duration;

        // Instant effects
        if(this.type==='dart'){
            // Burst: handled by rapid cooldown reset
            this._fireCooldown = 0;
            this._burstShots   = 5;
        }
        if(this.type==='cryo' && ab.name==='BLIZZARD'){
            // Freeze all enemies in range immediately
            if(typeof game !== 'undefined'){
                for(const e of game.enemies){
                    if(!e.isDead && Math.hypot(e.x-this.x,e.y-this.y)<=this.range){
                        e.applyFreeze(ab.duration);
                        e._cryoHits=0;  // reset stacks on hard freeze
                    }
                }
            }
            if(typeof spawnAoeRing==='function') spawnAoeRing(this.x,this.y,this.range,'#4FC3F7');
        }
        if(this.type==='siege'){
            this._barrageShots = 3;
            this._fireCooldown = 0;
        }
        return true;
    }

    //  Target picking 
    _pickTarget(enemies){
        let best=null, bestVal=-Infinity;
        for(const e of enemies){
            if(e.isDead) continue;
            if(this.isFlying && !this._detects.has('flying') && !e.isFlying && e.type!=='phantom') {}
            if(!e.isFlying && e.isFlying){}  // normal OK

            // Check detect
            if(!this._canDetect(e)) continue;

            const dist=Math.hypot(e.x-this.x,e.y-this.y);
            if(dist>this.range) continue;

            let val;
            switch(this.targeting){
                case 'first':  val=e.distTravelled; break;
                case 'last':   val=-e.distTravelled; break;
                case 'strong': val=e.health; break;
                case 'close':  val=-dist; break;
                default:       val=e.distTravelled;
            }
            if(val>bestVal){ bestVal=val; best=e; }
        }
        return best;
    }

    _canDetect(e){
        if(e.isFlying && !this._detects.has('flying')) return false;
        if(e.isHidden && !e._isDetected && !this._detects.has('hidden')) return false;
        return true;
    }

    //  Draw 
    draw(ctx, showRanges){
        const showR = showRanges || this.selected || this._hovered;

        // Range circle
        if(showR){
            ctx.save();
            ctx.globalAlpha = this.selected ? 0.22 : 0.1;
            ctx.fillStyle   = this.color;
            ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha = this.selected ? 0.55 : 0.2;
            ctx.strokeStyle = this.color;
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([5,5]);
            ctx.beginPath(); ctx.arc(this.x,this.y,this.range,0,Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // ── Octagonal base platform ───────────────────────────────────
        const R = 15, SIDES = 8;
        const _octPath = (offx, offy) => {
            for (let i = 0; i < SIDES; i++) {
                const a = (i / SIDES) * Math.PI * 2 - Math.PI / 8;
                const ox = Math.cos(a) * R + offx;
                const oy = Math.sin(a) * R + offy;
                i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
            }
            ctx.closePath();
        };

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,.48)';
        ctx.beginPath(); _octPath(2, 3); ctx.fill();

        // Base plate radial gradient
        const bg = ctx.createRadialGradient(-4, -5, 1, 0, 0, R);
        bg.addColorStop(0, '#2c3e52');
        bg.addColorStop(1, '#0d1421');
        ctx.shadowColor = this.color;
        ctx.shadowBlur  = this._shootFlash * 20 + (this.selected ? 16 : 4);
        ctx.fillStyle   = bg;
        ctx.beginPath(); _octPath(0, 0); ctx.fill();
        ctx.shadowBlur  = 0;

        // Colored edge trim
        ctx.strokeStyle = this.color + 'cc';
        ctx.lineWidth   = 1.8;
        ctx.beginPath(); _octPath(0, 0); ctx.stroke();

        // Inner dial ring
        ctx.strokeStyle = this.color + '40';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();

        // Corner micro-bolts at alternating vertices
        ctx.fillStyle = this.color + '80';
        for (let bi = 0; bi < SIDES; bi += 2) {
            const ba = (bi / SIDES) * Math.PI * 2 - Math.PI / 8;
            ctx.beginPath();
            ctx.arc(Math.cos(ba) * R * 0.78, Math.sin(ba) * R * 0.78, 1.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Top-left bevel highlight
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(0, 0, R, Math.PI * 1.1, Math.PI * 1.85); ctx.stroke();
        ctx.restore();

        // Turret
        ctx.rotate(this._turretAngle + Math.PI / 2);
        this._drawTurret(ctx);
        ctx.restore();

        // Laser beam draw
        if(this.laserDPS>0 && this._laserTarget && this._laserCharge>0.05){
            this._drawLaserBeam(ctx);
        }

        // Level pips
        if(this.level>0){
            ctx.save();
            for(let l=0;l<this.level;l++){
                const a=(l/4)*Math.PI*2-Math.PI/2;
                ctx.fillStyle=this.color;
                ctx.beginPath();
                ctx.arc(this.x+Math.cos(a)*16.5, this.y+Math.sin(a)*16.5, 2.2, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Corruption stun overlay
        if(this._stunTimer > 0){
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
            ctx.save();
            ctx.globalAlpha  = 0.65 * pulse;
            ctx.strokeStyle  = '#cc44ff';
            ctx.lineWidth    = 3;
            ctx.shadowColor  = '#cc44ff';
            ctx.shadowBlur   = 14;
            ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur   = 0;
            ctx.globalAlpha  = 0.28 * pulse;
            ctx.fillStyle    = '#9900ff';
            ctx.beginPath(); ctx.arc(this.x, this.y, 18, 0, Math.PI*2); ctx.fill();
            // \u26a1 glitch icon above
            ctx.globalAlpha  = 0.9;
            ctx.font         = '11px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = '#cc44ff';
            ctx.fillText('\u26a1', this.x, this.y - 22);
            ctx.restore();
        }
        // Corruption buff/debuff glow
        if(this._corruptBuf && !this._stunTimer){
            const pulse2 = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
            const isBuff = this._corruptBuf.type === 'buff';
            const gc = isBuff ? '#00ffcc' : '#ff3366';
            ctx.save();
            ctx.globalAlpha  = 0.45 * pulse2;
            ctx.strokeStyle  = gc;
            ctx.lineWidth    = 2;
            ctx.shadowColor  = gc;
            ctx.shadowBlur   = 10;
            ctx.beginPath(); ctx.arc(this.x, this.y, 16, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur   = 0;
            ctx.restore();
        }
    }

    _drawTurret(ctx){
        const c  = this.color;
        const pc = this.projColor || c;
        const fl = this._shootFlash;
        ctx.shadowColor = c;

        switch(this.type){

            // ── DART ─ dual-barrel rapid-fire cannon ─────────────────────────
            case 'dart': {
                const lv = this.level;
                // Hexagonal housing body (widens at lv 3+ for FULL AUTO)
                ctx.fillStyle = c;
                ctx.beginPath();
                if(lv >= 3){
                    ctx.moveTo(-8, 5); ctx.lineTo(-10, 0); ctx.lineTo(-8, -6);
                    ctx.lineTo( 8, -6); ctx.lineTo( 10, 0); ctx.lineTo( 8, 5);
                } else {
                    ctx.moveTo(-5, 5); ctx.lineTo(-7, 0); ctx.lineTo(-5, -6);
                    ctx.lineTo( 5, -6); ctx.lineTo( 7, 0); ctx.lineTo( 5, 5);
                }
                ctx.closePath(); ctx.fill();
                // Cooling vents
                ctx.strokeStyle = 'rgba(0,0,0,.42)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-5,-1); ctx.lineTo(5,-1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.stroke();
                // Left barrel
                ctx.fillStyle = _darkenHex(c, 0.15);
                ctx.fillRect(-5, -19, 3, 14);
                // Right barrel
                ctx.fillRect( 2, -19, 3, 14);
                // lv 2+: center barrel (Tri-Shot)
                if(lv >= 2){
                    ctx.fillRect(-1.5, -21, 3, 16);
                }
                // Barrel band join
                ctx.fillStyle = c;
                ctx.fillRect(-5, -13, 10, 2);
                ctx.fillRect(-5,  -9, 10, 2);
                // lv 3+: muzzle compensator wings (FULL AUTO)
                if(lv >= 3){
                    ctx.fillStyle = _darkenHex(c, 0.22);
                    ctx.fillRect(-9, -21, 4, 2);
                    ctx.fillRect( 5, -21, 4, 2);
                    ctx.strokeStyle = 'rgba(0,0,0,.4)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(-9,-20); ctx.lineTo(-5,-20); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo( 5,-20); ctx.lineTo( 9,-20); ctx.stroke();
                }
                // lv 4: amber rapid-fire side stripe
                if(lv >= 4){
                    ctx.shadowBlur = 4 + fl * 10;
                    ctx.fillStyle  = '#ffaa00';
                    ctx.fillRect(-9, -6, 3, 1.5);
                    ctx.fillRect( 6, -6, 3, 1.5);
                }
                // Muzzle glow
                ctx.shadowBlur = 8 + fl * 26;
                ctx.fillStyle  = pc;
                ctx.fillRect(-6, -20, 5, 3);
                ctx.fillRect( 1, -20, 5, 3);
                if(lv >= 2){ ctx.fillRect(-2.5, -22, 5, 2); }
                // Specular on tips
                ctx.shadowBlur = 0;
                ctx.fillStyle  = 'rgba(255,255,255,.7)';
                ctx.fillRect(-4, -20, 1, 1);
                ctx.fillRect( 3, -20, 1, 1);
                if(lv >= 2){ ctx.fillRect(-1, -22, 1, 1); }
                break;
            }

            // ── CRYO ─ freeze emitter with triple crystal spires ─────────────
            case 'cryo': {
                const lv = this.level;
                const spireExtra = lv * 3;  // spires grow 3px per level
                // Hexagonal wide body (widens at lv 2+)
                ctx.fillStyle = c;
                ctx.beginPath();
                if(lv >= 2){
                    ctx.moveTo(-10, 5); ctx.lineTo(-12,-1); ctx.lineTo(-8,-8);
                    ctx.lineTo(  8,-8); ctx.lineTo( 12,-1); ctx.lineTo(10, 5);
                } else {
                    ctx.moveTo(-8, 5); ctx.lineTo(-10,-1); ctx.lineTo(-6,-8);
                    ctx.lineTo( 6,-8); ctx.lineTo( 10,-1); ctx.lineTo( 8, 5);
                }
                ctx.closePath(); ctx.fill();
                // Body mid-panel line
                ctx.strokeStyle = 'rgba(0,0,0,.28)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-8,-2); ctx.lineTo(8,-2); ctx.stroke();
                // Side cryo tanks (grow at lv 1+, wider at lv 2+)
                const tankW  = lv >= 1 ? 5 : 4;
                const tankOX = lv >= 2 ? 15 : 13;
                ctx.fillStyle = _darkenHex(c, 0.22);
                ctx.fillRect(-tankOX-tankW, -5, tankW, 9);
                ctx.fillRect( tankOX,       -5, tankW, 9);
                ctx.fillStyle = pc;
                ctx.fillRect(-tankOX-tankW, -7, tankW, 2);
                ctx.fillRect( tankOX,       -7, tankW, 2);
                // Central emitter shaft
                ctx.fillStyle = _darkenHex(c, 0.1);
                ctx.fillRect(-3, -16, 6, 9);
                // Crystal spires (grow with level)
                ctx.shadowBlur = 12 + fl * 22 + lv * 4;
                ctx.fillStyle  = pc;
                // Center spire
                ctx.beginPath();
                ctx.moveTo(-2,-16); ctx.lineTo(2,-16);
                ctx.lineTo(1,-23-spireExtra); ctx.lineTo(0,-25-spireExtra); ctx.lineTo(-1,-23-spireExtra);
                ctx.closePath(); ctx.fill();
                // Left spire
                ctx.beginPath();
                ctx.moveTo(-6,-12); ctx.lineTo(-3,-12);
                ctx.lineTo(-5,-20-spireExtra); ctx.lineTo(-7,-19-spireExtra);
                ctx.closePath(); ctx.fill();
                // Right spire
                ctx.beginPath();
                ctx.moveTo(3,-12); ctx.lineTo(6,-12);
                ctx.lineTo(7,-19-spireExtra); ctx.lineTo(5,-20-spireExtra);
                ctx.closePath(); ctx.fill();
                // lv 3+: two extra outer spires (ABSOLUTE ZERO crown)
                if(lv >= 3){
                    ctx.beginPath();
                    ctx.moveTo(-11,-8); ctx.lineTo(-8,-8);
                    ctx.lineTo(-10,-17-spireExtra); ctx.lineTo(-12,-16-spireExtra);
                    ctx.closePath(); ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo( 8,-8); ctx.lineTo(11,-8);
                    ctx.lineTo(12,-16-spireExtra); ctx.lineTo(10,-17-spireExtra);
                    ctx.closePath(); ctx.fill();
                }
                // Frost aura ring
                ctx.shadowBlur = 0;
                ctx.strokeStyle = pc + '50';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(0,-18,10,0,Math.PI*2); ctx.stroke();
                // lv 2+: second larger frost ring (Blizzard Zone)
                if(lv >= 2){
                    ctx.strokeStyle = pc + '38';
                    ctx.beginPath(); ctx.arc(0,-18,15,0,Math.PI*2); ctx.stroke();
                }
                // lv 4: ABSOLUTE ZERO — ice crown glow ring
                if(lv >= 4){
                    ctx.shadowColor = pc;
                    ctx.shadowBlur  = 10 + fl * 18;
                    ctx.strokeStyle = '#aaeeff' + 'bb';
                    ctx.lineWidth   = 2;
                    ctx.beginPath(); ctx.arc(0,-18,19,0,Math.PI*2); ctx.stroke();
                    ctx.shadowBlur  = 0;
                }
                // Specular on center spire tip
                ctx.fillStyle = 'rgba(255,255,255,.7)';
                ctx.beginPath(); ctx.arc(-0.5,-22-spireExtra,1.3,0,Math.PI*2); ctx.fill();
                break;
            }

            // ── SNIPER ─ precision long-range rifle ──────────────────────────
            case 'sniper': {
                const lv = this.level;
                const barrelW   = lv >= 3 ? 2.5 : 1.5;   // APEX: wider barrel
                const barrelTop = lv >= 2 ? -29 : -25;    // longer at lv 2+
                const barrelH   = lv >= 2 ? 21  : 17;
                const muTop     = barrelTop - 2;
                // Bipod legs
                ctx.strokeStyle = _darkenHex(c, 0.28);
                ctx.lineWidth   = 1.8;
                ctx.beginPath(); ctx.moveTo(-2,-3); ctx.lineTo(-7,5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 2,-3); ctx.lineTo( 7,5); ctx.stroke();
                // Bipod feet
                ctx.strokeStyle = _darkenHex(c, 0.22);
                ctx.lineWidth   = 2.5;
                ctx.beginPath(); ctx.moveTo(-8,5); ctx.lineTo(-6,5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 6,5); ctx.lineTo( 8,5); ctx.stroke();
                // Stock (rear wedge)
                ctx.fillStyle = _darkenHex(c, 0.18);
                ctx.fillRect(-4, 0, 8, 5);
                // lv 3+: reinforced cheek rest panels
                if(lv >= 3){
                    ctx.fillStyle = _darkenHex(c, 0.3);
                    ctx.fillRect(-5, 1, 2, 4);
                    ctx.fillRect( 3, 1, 2, 4);
                }
                // Lower receiver
                ctx.fillStyle = c;
                ctx.fillRect(-3,-9, 6, 11);
                // Scope mount rail
                ctx.fillStyle = _darkenHex(c, 0.05);
                ctx.fillRect(-2,-10, 4, 3);
                // Primary scope
                ctx.fillStyle = '#c2185b';
                ctx.fillRect(-6,-14, 3, 6);
                ctx.fillStyle = '#ff80ab';
                ctx.fillRect(-5.5,-13.5, 2, 2);
                ctx.fillStyle = 'rgba(255,255,255,.8)';
                ctx.beginPath(); ctx.arc(-4.5,-12,1,0,Math.PI*2); ctx.fill();
                // lv 2+: second advanced optic (Marksman)
                if(lv >= 2){
                    ctx.fillStyle = '#c2185b';
                    ctx.fillRect(-6,-19, 2.5, 5);
                    ctx.fillStyle = '#ff80ab';
                    ctx.fillRect(-5.5,-18.5, 1.5, 1.5);
                    ctx.fillStyle = 'rgba(255,255,255,.6)';
                    ctx.beginPath(); ctx.arc(-5,-17,0.8,0,Math.PI*2); ctx.fill();
                }
                // Barrel
                ctx.fillStyle = c;
                ctx.fillRect(-barrelW, barrelTop, barrelW*2, barrelH);
                // Muzzle brake
                ctx.fillStyle = _darkenHex(c, 0.12);
                ctx.fillRect(-3.5, muTop, 7, 3);
                ctx.strokeStyle = 'rgba(0,0,0,.5)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-1, muTop); ctx.lineTo(-1, muTop+3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 1, muTop); ctx.lineTo( 1, muTop+3); ctx.stroke();
                // lv 3+: APEX compensator fins
                if(lv >= 3){
                    ctx.fillStyle = _darkenHex(c, 0.22);
                    ctx.fillRect(-7.5, muTop+0.5, 3.5, 2);
                    ctx.fillRect( 4.0, muTop+0.5, 3.5, 2);
                }
                // Muzzle glow
                ctx.shadowBlur = 10 + fl * 30;
                ctx.fillStyle  = pc;
                ctx.fillRect(-4, muTop-1.5, 8, 2.5);
                break;
            }

            // ── FLAK ─ anti-air burst cannon ─────────────────────────────────
            // ── FARM ─ passive income tower ────────────────────────────────────
            case 'farm': {
                const lv = this.level;
                const goldFields = lv >= 4;
                const cropColor  = goldFields ? '#fdd835' : (lv >= 2 ? '#aed581' : '#66bb6a');

                // Soil plot (faint green/gold tint over base)
                ctx.save();
                ctx.globalAlpha = 0.22;
                ctx.fillStyle   = goldFields ? '#ffc107' : '#388e3c';
                ctx.fillRect(-11, -11, 22, 18);
                ctx.restore();

                // Fence posts at four corners
                ctx.fillStyle = '#5d4037';
                for(const [fx, fy] of [[-11,-11],[ 9,-11],[-11, 6],[ 9, 6]]){
                    ctx.fillRect(fx, fy, 2, 5);
                }
                // Fence rails
                ctx.strokeStyle = '#5d4037';
                ctx.lineWidth   = 1;
                ctx.beginPath();
                ctx.moveTo(-10,-8); ctx.lineTo(10,-8);
                ctx.moveTo(-10, 9); ctx.lineTo(10, 9);
                ctx.stroke();

                // Barn body
                const barnColor = goldFields ? '#e65100' : '#8d6e63';
                ctx.fillStyle = barnColor;
                ctx.fillRect(-5, -5, 10, 10);
                // Barn roof (triangle)
                ctx.fillStyle = goldFields ? '#bf360c' : '#4e342e';
                ctx.beginPath();
                ctx.moveTo(-8, -5); ctx.lineTo(0, -14); ctx.lineTo(8, -5);
                ctx.closePath(); ctx.fill();
                // Barn door
                ctx.fillStyle = 'rgba(0,0,0,.5)';
                ctx.fillRect(-2, 0, 4, 5);
                // Barn window
                ctx.fillStyle = goldFields ? '#ffe57f' : 'rgba(255,255,255,.3)';
                ctx.fillRect(-4, -4, 2.5, 2.5);
                ctx.fillRect( 1.5,-4, 2.5, 2.5);

                // Wheat stalks — more at higher levels
                const stalkCount = lv >= 3 ? 8 : lv >= 1 ? 6 : 4;
                const stalkXs = [-9,-7,-5, 5, 7, 9,-8, 8];
                ctx.shadowBlur  = goldFields ? 7 : 0;
                ctx.shadowColor = '#ffd600';
                ctx.strokeStyle = cropColor;
                ctx.lineWidth   = 1.5;
                for(let i = 0; i < stalkCount; i++){
                    const sx = stalkXs[i];
                    const sh = -5 - lv * 1.2;  // stalks grow taller per level
                    ctx.beginPath();
                    ctx.moveTo(sx, 5); ctx.lineTo(sx, sh); ctx.stroke();
                    // Grain head
                    ctx.beginPath();
                    ctx.moveTo(sx, sh); ctx.lineTo(sx - 2, sh - 3);
                    ctx.moveTo(sx, sh); ctx.lineTo(sx + 2, sh - 3);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;

                // GOLD FIELDS: floating coin above barn
                if(goldFields){
                    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.004);
                    ctx.shadowBlur  = 8 + pulse * 10;
                    ctx.shadowColor = '#ffd600';
                    ctx.fillStyle   = '#ffd600';
                    ctx.beginPath(); ctx.arc(0, -19, 4.5, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur  = 0;
                    ctx.fillStyle   = '#5d4037';
                    ctx.font        = 'bold 5.5px sans-serif';
                    ctx.textAlign   = 'center';
                    ctx.textBaseline= 'middle';
                    ctx.fillText('$', 0, -19);
                    ctx.textBaseline= 'alphabetic';
                }
                break;
            }

            // ── ARC ─ tesla coil with insulator stack ────────────────────────
            case 'arc': {
                const lv = this.level;
                const numDiscs  = lv >= 2 ? 4 : 3;
                const colTop    = lv >= 2 ? -23 : -19;
                const sphereY   = lv >= 2 ? -25 : -21;
                const sphereR   = lv >= 4 ? 7   : (lv >= 2 ? 6 : 5);
                const discYs    = lv >= 2 ? [-22,-15,-8,-1] : [-15,-8,-1];
                // Anchor bolts at base
                ctx.fillStyle = _darkenHex(c, 0.3);
                ctx.fillRect(-6, 1, 3, 6);
                ctx.fillRect( 3, 1, 3, 6);
                // Central insulator column
                ctx.fillStyle = c;
                ctx.fillRect(-3, colTop, 6, Math.abs(colTop) + 4);
                // Insulator discs
                for(const dy of discYs){
                    ctx.fillStyle = _darkenHex(c, 0.08);
                    ctx.fillRect(-6, dy, 12, 3);
                    ctx.fillStyle = 'rgba(255,255,255,.12)';
                    ctx.fillRect(-6, dy, 12, 1);
                    ctx.fillStyle = 'rgba(0,0,0,.22)';
                    ctx.fillRect(-6, dy+2, 12, 1);
                }
                // Side discharge wires
                ctx.strokeStyle = pc + '55';
                ctx.lineWidth   = 1;
                ctx.beginPath(); ctx.moveTo(-3, colTop+1); ctx.lineTo(-9, colTop+8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 3, colTop+1); ctx.lineTo( 9, colTop+8); ctx.stroke();
                // lv 3+: extended outer discharge arms (Tesla Storm)
                if(lv >= 3){
                    ctx.strokeStyle = pc + '88';
                    ctx.lineWidth   = 1.2;
                    ctx.beginPath(); ctx.moveTo(-3, colTop+1); ctx.lineTo(-13, colTop+5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo( 3, colTop+1); ctx.lineTo( 13, colTop+5); ctx.stroke();
                }
                // Energy sphere at apex
                ctx.shadowBlur = 14 + fl * 30;
                ctx.fillStyle  = pc;
                ctx.beginPath(); ctx.arc(0, sphereY, sphereR, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 5;
                ctx.fillStyle  = 'rgba(255,255,255,.9)';
                ctx.beginPath(); ctx.arc(-1.5, sphereY-1.5, 2, 0, Math.PI*2); ctx.fill();
                // Pulse ring
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = pc + (fl > 0.3 ? 'dd' : '44');
                ctx.lineWidth   = 1.5;
                ctx.beginPath(); ctx.arc(0, sphereY, sphereR+3, 0, Math.PI*2); ctx.stroke();
                // lv 2+: animated orbital ring (Chain Pulse / Tesla Storm)
                const now = Date.now() * 0.001;
                if(lv >= 2){
                    ctx.save();
                    ctx.translate(0, sphereY);
                    ctx.rotate(now * 1.3);
                    ctx.strokeStyle = pc + 'cc';
                    ctx.lineWidth   = 1;
                    ctx.beginPath(); ctx.ellipse(0, 0, sphereR+5, 2.5, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();
                }
                // lv 4: OVERLOAD — second orbital ring + crown spark tips
                if(lv >= 4){
                    ctx.save();
                    ctx.translate(0, sphereY);
                    ctx.rotate(-now * 0.9 + Math.PI / 3);
                    ctx.strokeStyle = '#ffff88cc';
                    ctx.lineWidth   = 1.2;
                    ctx.beginPath(); ctx.ellipse(0, 0, sphereR+7, 3, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();
                    ctx.shadowBlur = 6 + fl * 18;
                    ctx.fillStyle  = '#ffffff';
                    for(let s=0; s<4; s++){
                        const sa = now * 3 + s * Math.PI / 2;
                        const sr = sphereR + 3;
                        ctx.beginPath();
                        ctx.arc(Math.cos(sa)*sr, sphereY + Math.sin(sa)*sr, 1.5, 0, Math.PI*2);
                        ctx.fill();
                    }
                    ctx.shadowBlur = 0;
                }
                // Outer faint pulse ring
                ctx.strokeStyle = pc + '22';
                ctx.lineWidth   = 0.8;
                ctx.beginPath(); ctx.arc(0, sphereY, sphereR+8, 0, Math.PI*2); ctx.stroke();
                break;
            }

            // ── VOID ─ dark matter cannon with orbiting rings ─────────────────
            case 'void': {
                const lv = this.level;
                // Corrupted asymmetric housing
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.moveTo(-5, 5); ctx.lineTo(-7,-1); ctx.lineTo(-4,-11);
                ctx.lineTo( 0,-12);ctx.lineTo( 5,-9); ctx.lineTo( 6,-1);
                ctx.lineTo( 4, 5); ctx.closePath(); ctx.fill();
                // Dark inner housing panel
                ctx.fillStyle = _darkenHex(c, 0.38);
                ctx.beginPath();
                ctx.moveTo(-2, 5); ctx.lineTo(-4,-1); ctx.lineTo(-2,-9);
                ctx.lineTo( 2,-9); ctx.lineTo( 4,-1); ctx.lineTo( 2, 5);
                ctx.closePath(); ctx.fill();
                // Corruption crack lines (more intense at high levels)
                ctx.strokeStyle = pc + (lv >= 3 ? 'cc' : '66');
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-6,-5); ctx.lineTo(-2,0); ctx.lineTo(-5,4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 5,-6); ctx.lineTo( 2,-1);ctx.lineTo( 4,3); ctx.stroke();
                // lv 3+: extra cracks (Reality Tear)
                if(lv >= 3){
                    ctx.strokeStyle = pc + '88';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.moveTo(-3,-10); ctx.lineTo(0,-6); ctx.lineTo(3,-10); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(3,-3); ctx.stroke();
                }
                // Void barrel (dark)
                ctx.fillStyle = _darkenHex(c, 0.32);
                ctx.fillRect(-2.5,-22, 5, 12);
                // Void orb (grows with level)
                const orbR = lv >= 4 ? 8 : (lv >= 3 ? 7 : 5.5);
                ctx.shadowBlur = 18 + fl * 35 + lv * 4;
                ctx.fillStyle  = pc;
                ctx.beginPath(); ctx.arc(0,-21, orbR, 0, Math.PI*2); ctx.fill();
                // Void eye
                ctx.shadowBlur = 5;
                ctx.fillStyle  = 'rgba(255,255,255,.9)';
                ctx.beginPath(); ctx.arc(0,-21, orbR * 0.45, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle  = '#000';
                ctx.beginPath(); ctx.arc(0,-21, orbR * 0.2,  0, Math.PI*2); ctx.fill();
                // lv 4: OBLIVION corona glow rings
                if(lv >= 4){
                    ctx.shadowBlur  = 12 + fl * 20;
                    ctx.strokeStyle = pc + 'aa';
                    ctx.lineWidth   = 2;
                    ctx.beginPath(); ctx.arc(0,-21, orbR+4, 0, Math.PI*2); ctx.stroke();
                    ctx.strokeStyle = pc + '44';
                    ctx.lineWidth   = 4;
                    ctx.beginPath(); ctx.arc(0,-21, orbR+9, 0, Math.PI*2); ctx.stroke();
                }
                // Orbiting distortion rings (animated)
                const now = Date.now() * 0.001;
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = pc + 'aa';
                ctx.lineWidth   = 1.2;
                // Ring 1 (always)
                ctx.save();
                ctx.translate(0,-21);
                ctx.rotate(now * 0.9 + Math.PI/4);
                ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI*2); ctx.stroke();
                ctx.rotate(Math.PI/2);
                ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
                // Ring 2 (lv 2+ — Null Field)
                if(lv >= 2){
                    ctx.save();
                    ctx.translate(0,-21);
                    ctx.rotate(-now * 0.7 + Math.PI/6);
                    ctx.strokeStyle = pc + '88';
                    ctx.lineWidth   = 1;
                    ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.rotate(Math.PI/2);
                    ctx.beginPath(); ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();
                }
                // Ring 3 (lv 3+ — Reality Tear)
                if(lv >= 3){
                    ctx.save();
                    ctx.translate(0,-21);
                    ctx.rotate(now * 1.2 - Math.PI/5);
                    ctx.strokeStyle = pc + '66';
                    ctx.lineWidth   = 0.9;
                    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.rotate(Math.PI/3);
                    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();
                }
                break;
            }

            // ── LASER ─ precision beam projector ─────────────────────────────
            case 'laser': {
                const lv = this.level;
                const inferno = lv >= 4;
                const emitColor  = inferno ? '#ff7020' : pc;
                const innerColor = inferno ? '#ffeeaa' : '#ffffff';

                if(lv >= 3){
                    // ── SCATTER ARRAY: wide tri-barrel manifold ─────────────
                    // Power conduit base connecting all three barrels
                    ctx.fillStyle = _darkenHex(c, 0.28);
                    ctx.fillRect(-11, -3, 22, 8);
                    // Manifold top plate
                    ctx.fillStyle = _darkenHex(c, 0.14);
                    ctx.fillRect(-11, -6, 22, 4);
                    ctx.strokeStyle = 'rgba(0,0,0,.4)';
                    ctx.lineWidth   = 0.8;
                    for(let si=0; si<4; si++){
                        ctx.beginPath();
                        ctx.moveTo(-10+si*6.5, -6);
                        ctx.lineTo(-10+si*6.5,  5);
                        ctx.stroke();
                    }
                    // Horizontal linking yoke / strut
                    ctx.fillStyle = c;
                    ctx.fillRect(-10, -10, 20, 4);
                    ctx.strokeStyle = 'rgba(0,0,0,.35)';
                    ctx.lineWidth = 0.9;
                    ctx.beginPath(); ctx.moveTo(-10,-8); ctx.lineTo(10,-8); ctx.stroke();
                    // Three barrel tubes
                    const fxs = [-6, 0, 6];
                    for(const fx of fxs){
                        // Barrel body
                        ctx.fillStyle = _darkenHex(c, 0.06);
                        ctx.fillRect(fx-2.5, -22, 5, 13);
                        // Energy collar ring on each barrel
                        ctx.fillStyle = _darkenHex(c, 0.18);
                        ctx.fillRect(fx-3.5, -17, 7, 2);
                        ctx.fillRect(fx-3.0, -14, 6, 1.5);
                        // Emitter head disk
                        ctx.shadowBlur = (inferno ? 20 : 12) + fl * 24;
                        ctx.fillStyle  = emitColor;
                        ctx.beginPath(); ctx.arc(fx, -23, inferno ? 3.5 : 3, 0, Math.PI*2); ctx.fill();
                        // Inner hot core
                        ctx.shadowBlur = 4;
                        ctx.fillStyle  = innerColor;
                        ctx.beginPath(); ctx.arc(fx, -23, inferno ? 1.8 : 1.4, 0, Math.PI*2); ctx.fill();
                        // Specular
                        ctx.shadowBlur = 0;
                        ctx.fillStyle  = 'rgba(255,255,255,.9)';
                        ctx.beginPath(); ctx.arc(fx-0.6, -23.6, 0.9, 0, Math.PI*2); ctx.fill();
                    }
                    // INFERNO: heat-shimmer rings around outer barrels
                    if(inferno){
                        ctx.shadowBlur  = 6 + fl * 14;
                        ctx.strokeStyle = '#ff9040aa';
                        ctx.lineWidth   = 1.2;
                        for(const fx of [-6, 6]){
                            ctx.beginPath(); ctx.arc(fx, -23, 5.5, 0, Math.PI*2); ctx.stroke();
                        }
                        ctx.shadowBlur = 0;
                    }
                } else {
                    // ── SINGLE EMITTER (lv 0-2) ─────────────────────────────
                    // Rear power block
                    ctx.fillStyle = _darkenHex(c, 0.3);
                    ctx.fillRect(-6, 0, 12, 8);
                    // Main body
                    ctx.fillStyle = c;
                    ctx.fillRect(-5, -10, 10, 12);
                    // Body panel lines
                    ctx.strokeStyle = 'rgba(0,0,0,.35)';
                    ctx.lineWidth   = 0.9;
                    ctx.beginPath(); ctx.moveTo(-5,-4); ctx.lineTo(5,-4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
                    // Side power conduits
                    ctx.fillStyle = _darkenHex(c, 0.2);
                    ctx.fillRect(-8, -8, 3, 16);
                    ctx.fillRect( 5, -8, 3, 16);
                    // Conduit node dots (lv 1+ adds a second pair)
                    ctx.fillStyle = pc + 'cc';
                    const nodeYs = lv >= 1 ? [-6, -2, 2] : [-4, 2];
                    for(const ny of nodeYs){
                        ctx.beginPath(); ctx.arc(-6.5, ny, 1.2, 0, Math.PI*2); ctx.fill();
                        ctx.beginPath(); ctx.arc( 6.5, ny, 1.2, 0, Math.PI*2); ctx.fill();
                    }
                    // Barrel shaft
                    const bW = lv >= 1 ? 3.5 : 2.5;
                    ctx.fillStyle = _darkenHex(c, 0.08);
                    ctx.fillRect(-bW, -22, bW*2, 13);
                    // Energy collar rings on barrel (more at lv2)
                    const collarYs = lv >= 2 ? [-20, -16, -13] : [-18, -14];
                    for(const cy of collarYs){
                        ctx.fillStyle = _darkenHex(c, 0.2);
                        ctx.fillRect(-(bW+2), cy, (bW+2)*2, 2);
                    }
                    // lv 2: micro targeting fins
                    if(lv >= 2){
                        ctx.fillStyle = _darkenHex(c, 0.22);
                        ctx.fillRect(-(bW+4), -10, 2.5, 4);
                        ctx.fillRect(  bW+1.5,-10, 2.5, 4);
                    }
                    // Emitter lens
                    ctx.shadowBlur = 14 + fl * 30;
                    ctx.fillStyle  = emitColor;
                    ctx.beginPath(); ctx.arc(0, -23, lv >= 1 ? 4 : 3, 0, Math.PI*2); ctx.fill();
                    // Hot core
                    ctx.shadowBlur = 5;
                    ctx.fillStyle  = innerColor;
                    ctx.beginPath(); ctx.arc(0, -23, lv >= 1 ? 1.8 : 1.3, 0, Math.PI*2); ctx.fill();
                    // Specular
                    ctx.shadowBlur = 0;
                    ctx.fillStyle  = 'rgba(255,255,255,.9)';
                    ctx.beginPath(); ctx.arc(-0.7, -23.7, 1.1, 0, Math.PI*2); ctx.fill();
                }
                break;
            }

            // ── SIEGE ─ heavy artillery, single massive barrel ────────────────
            case 'siege': {
                const lv = this.level;
                const barrelW   = lv >= 4 ? 10 : (lv >= 3 ? 8 : 6);
                const barrelTop = lv >= 4 ? -26 : (lv >= 3 ? -24 : -22);
                const barrelH   = Math.abs(barrelTop) - 7;   // bottom always near y=-7
                // Rear stabilizer braces
                ctx.strokeStyle = _darkenHex(c, 0.32);
                ctx.lineWidth   = 3;
                ctx.beginPath(); ctx.moveTo(-7,-2); ctx.lineTo(-11,6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 7,-2); ctx.lineTo( 11,6); ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,.3)';
                ctx.lineWidth   = 1;
                ctx.beginPath(); ctx.moveTo(-10,6); ctx.lineTo(-12,6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( 10,6); ctx.lineTo( 12,6); ctx.stroke();
                // Armored side plates
                ctx.fillStyle = _darkenHex(c, 0.22);
                ctx.fillRect(-10,-8, 3, 14);
                ctx.fillRect(  7,-8, 3, 14);
                // Main body
                ctx.fillStyle = c;
                ctx.fillRect(-7,-8, 14, 14);
                // Horizontal reinforcement straps
                ctx.strokeStyle = 'rgba(0,0,0,.28)';
                ctx.lineWidth   = 1.2;
                ctx.beginPath(); ctx.moveTo(-7,-2); ctx.lineTo(7,-2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.stroke();
                // Rivet bolts
                ctx.fillStyle = 'rgba(0,0,0,.42)';
                for(const [rx,ry] of [[-8,-6],[-8,0],[-8,4],[6,-6],[6,0],[6,4]]){
                    ctx.beginPath(); ctx.arc(rx,ry,1.3,0,Math.PI*2); ctx.fill();
                }
                // Recoil pistons
                ctx.fillStyle = _darkenHex(c, 0.28);
                ctx.fillRect(-5,-8, 2, 5);
                ctx.fillRect( 3,-8, 2, 5);
                // lv 2+: hidden-detect sensor spike (right-side mount)
                if(lv >= 2){
                    ctx.fillStyle = '#ff8c00';
                    ctx.fillRect(9,-7, 2, 5);   // mount pad on plate edge
                    ctx.beginPath();
                    ctx.moveTo(11,-7); ctx.lineTo(11,-4); ctx.lineTo(15,-5.5);
                    ctx.closePath(); ctx.fill();
                    ctx.shadowBlur = 4;
                    ctx.fillStyle  = '#ffcc44';
                    ctx.beginPath(); ctx.arc(14.5,-5.5, 1.2, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;
                }
                // Barrel (grows wider and longer per tier)
                ctx.fillStyle = lv >= 3 ? _darkenHex(c, 0.08) : c;
                ctx.fillRect(-barrelW, barrelTop, barrelW*2, barrelH);
                // Barrel reinforcement rings
                ctx.fillStyle = _darkenHex(c, 0.14);
                ctx.fillRect(-(barrelW+1), barrelTop+4, barrelW*2+2, 3);
                ctx.fillRect(-(barrelW+1), barrelTop+9, barrelW*2+2, 2);
                // Barrel detail seam
                ctx.strokeStyle = 'rgba(0,0,0,.3)';
                ctx.lineWidth   = 0.8;
                ctx.beginPath(); ctx.moveTo(-barrelW, barrelTop+2); ctx.lineTo(barrelW, barrelTop+2); ctx.stroke();
                // lv 4: WORLD ENDER — glowing breach ring at barrel base
                if(lv >= 4){
                    ctx.shadowBlur = 8 + fl * 28;
                    ctx.fillStyle  = pc + 'bb';
                    ctx.fillRect(-barrelW, -7, barrelW*2, 2.5);
                    ctx.shadowBlur = 0;
                }
                // Muzzle brake (flared)
                ctx.fillStyle = _darkenHex(c, 0.1);
                ctx.fillRect(-(barrelW+2), barrelTop-2, barrelW*2+4, 3);
                // Muzzle glow
                ctx.shadowBlur = fl * 45;
                ctx.fillStyle  = pc + 'cc';
                ctx.fillRect(-(barrelW+1), barrelTop-2.5, barrelW*2+2, 4);
                // Muzzle line
                ctx.shadowBlur  = 0;
                ctx.strokeStyle = 'rgba(0,0,0,.35)';
                ctx.lineWidth   = 0.8;
                ctx.beginPath(); ctx.moveTo(-(barrelW+1), barrelTop-2); ctx.lineTo(barrelW+1, barrelTop-2); ctx.stroke();
                break;
            }
        }
        ctx.shadowBlur = 0;
    }

    _drawLaserBeam(ctx){
        const e=this._laserTarget;
        if(!e) return;
        const a = this._laserCharge;
        // Normalise rampMult into 0-1 for visual scaling
        const rampCap = this.level >= 4 ? 6.5 : 5.0;
        const rn = Math.min(1, (this._laserRampMult - 1.0) / (rampCap - 1.0));
        // Beam core: 2.5px → 5px;  glow halo: 7px → 20px
        const coreW = (2.5 + rn * 2.5) * a;
        const haloW = (7   + rn * 13)  * a;
        const abilBoost = this._abilityActive ? 1.6 : 1.0;

        const _drawBeam = (x1, y1, x2, y2, cw, hw, alpha) => {
            ctx.globalAlpha = alpha * 0.28 * abilBoost;
            ctx.shadowColor = this.projColor; ctx.shadowBlur = 18 + rn * 20;
            ctx.strokeStyle = this.projColor;
            ctx.lineWidth   = hw * abilBoost;
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
            ctx.globalAlpha = alpha * 0.92;
            ctx.shadowBlur  = 8 + rn * 12;
            ctx.lineWidth   = cw * abilBoost;
            ctx.strokeStyle = rn > 0.7 ? '#ffffff' : this.projColor;
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        };

        ctx.save();

        if(this.level >= 3){
            // Each beam fires from its barrel's actual world position.
            const ang = this._turretAngle + Math.PI / 2;
            const toWorld = (lx, ly) => ({
                x: this.x + lx * Math.cos(ang) - ly * Math.sin(ang),
                y: this.y + lx * Math.sin(ang) + ly * Math.cos(ang),
            });
            // side emitter tips are at local (±6, -19); center at (0, -24)
            const origins = [
                toWorld(-6, -19),
                toWorld( 0, -24),
                toWorld( 6, -19),
            ];
            const scales = [0.85, 1.00, 0.85];
            // Pass 1 — glow haloes first so the red outer glow is behind all white cores
            for(let i = 0; i < 3; i++){
                const o = origins[i], s = scales[i];
                ctx.globalAlpha = a * s * 0.28 * abilBoost;
                ctx.shadowColor = this.projColor; ctx.shadowBlur = 18 + rn * 20;
                ctx.strokeStyle = this.projColor;
                ctx.lineWidth   = haloW * s * abilBoost;
                ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
            }
            // Pass 2 — all three white cores drawn last so none are overwritten by a later glow
            ctx.strokeStyle = rn > 0.7 ? '#ffffff' : this.projColor;
            ctx.shadowBlur  = 8 + rn * 12;
            for(let i = 0; i < 3; i++){
                const o = origins[i], s = scales[i];
                ctx.globalAlpha = a * 0.92;
                ctx.lineWidth   = coreW * s * abilBoost;
                ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(e.x, e.y); ctx.stroke();
            }
        } else {
            // Single beam from tower centre
            _drawBeam(this.x, this.y, e.x, e.y, coreW, haloW, a);
            // Scatter beams (65% width/alpha)
            for(const se of (this._laserScatterTargets||[])){
                if(!se || se.isDead) continue;
                _drawBeam(this.x, this.y, se.x, se.y, coreW*0.65, haloW*0.65, a*0.65);
            }
        }

        ctx.restore();
    }
}

// hidden detection helper (towers with 'hidden' in detects reveal hidden enemies)
function updateHiddenDetection(towers, enemies){
    const detectors = towers.filter(t=>t._detects.has('hidden'));
    for(const e of enemies){
        if(!e.isHidden){ e._isDetected=true; continue; }
        e._isDetected = false;
        for(const t of detectors){
            if(Math.hypot(e.x-t.x,e.y-t.y)<=t.range){ e._isDetected=true; break; }
        }
    }
}

// Lightning arc helpers
function updateLightningArcs(dt){
    for(let i=lightningArcs.length-1;i>=0;i--){
        if(!lightningArcs[i].update(dt)) lightningArcs.splice(i,1);
    }
}
function drawLightningArcs(ctx){
    for(const arc of lightningArcs) arc.draw(ctx);
}
