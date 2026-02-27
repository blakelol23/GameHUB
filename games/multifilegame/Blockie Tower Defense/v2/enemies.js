// ============================================================
//  ENEMIES.JS  -  Blockie Tower Defense V2
//  10 enemy types | Status effects | polished draw routines
// ============================================================

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
        r = Math.min(r, w/2, h/2);
        this.moveTo(x+r,y); this.lineTo(x+w-r,y);
        this.arcTo(x+w,y,  x+w,y+r,  r); this.lineTo(x+w,y+h-r);
        this.arcTo(x+w,y+h,x+w-r,y+h,r); this.lineTo(x+r,y+h);
        this.arcTo(x,y+h,  x,y+h-r,  r); this.lineTo(x,y+r);
        this.arcTo(x,y,    x+r,y,    r); this.closePath(); return this;
    };
}

//  Enemy stat definitions 
const ENEMY_DEFS = {
    grunt: {
        label:'Grunt',      health:12,   speed:75,  value:12,   size:18, damage:1,
        color:'#e53935',
    },
    scout: {
        label:'Scout',      health:9,    speed:160, value:18,   size:14, damage:1,
        color:'#FB8C00',
    },
    brute: {
        label:'Brute',      health:95,   speed:45,  value:40,   size:26, damage:3,
        color:'#5E35B1', armor:0.35,
    },
    shade: {
        label:'Shade',      health:28,   speed:85,  value:32,   size:16, damage:1,
        color:'#00796B', isHidden:true,
    },
    flyer: {
        label:'Flyer',      health:35,   speed:105, value:30,   size:16, damage:1,
        color:'#0097A7', isFlying:true,
    },
    swarm: {
        label:'Swarm',      health:5,    speed:122, value:8,    size:10, damage:1,
        color:'#F9A825',
    },
    juggernaut: {
        label:'Juggernaut', health:240,  speed:32,  value:65,   size:32, damage:4,
        color:'#1565C0', armor:0.30,
    },
    phantom: {
        label:'Phantom',    health:55,   speed:90,  value:55,   size:17, damage:2,
        color:'#4A148C', isHidden:true, isFlying:true,
    },
    overlord: {
        label:'Overlord',   health:1100, speed:30,  value:280,  size:40, damage:6,
        color:'#B71C1C', isBoss:true,
    },
    titan: {
        label:'Titan',      health:4200, speed:20,  value:900,  size:54, damage:15,
        color:'#3E1F6E', isBoss:true, isSuper:true,
    },
    // ── Void (Hidden Wave) enemies ──────────────────────────
    void_wisp: {
        label:'Void Wisp',  health:45,   speed:98,  value:22,   size:13, damage:1,
        color:'#9c27b0', isHidden:true,
    },
    void_wraith: {
        label:'Void Wraith',health:220,  speed:68,  value:60,   size:20, damage:2,
        color:'#6a1b9a', isHidden:true, isFlying:true, armor:0.15,
    },
    void_god: {
        label:'Void God',   health:5500, speed:25,  value:700,  size:50, damage:10,
        color:'#4a0072', isBoss:true, isSuper:true,
    },
    void_titan: {
        label:'Void Titan', health:14000,speed:14,  value:1800, size:64, damage:30,
        color:'#12003a', isBoss:true, isSuper:true,
    },
    void_swarm: {
        label:'Void Swarm', health:4,    speed:150, value:6,    size:9,  damage:1,
        color:'#7c4dff', isHidden:true,
    },
    creator: {
        label:'The Creator', health:400000, speed:20, value:8000, size:68, damage:100,
        color:'#0a0018', isBoss:true, isSuper:true, armor:0.38,
    },
};

//  Enemy class 
class Enemy {
    constructor(type, waveMult = 1) {
        const def  = ENEMY_DEFS[type] || ENEMY_DEFS.grunt;
        this.type  = type;
        this.label = def.label;

        this.maxHealth = Math.ceil(def.health * waveMult);
        this.health    = this.maxHealth;
        this.speed     = def.speed;
        this.value     = def.value;
        this.size      = def.size;
        this.color     = def.color;
        this.damage    = def.damage;

        this.armor     = def.armor     || 0;
        this.isFlying  = def.isFlying  || false;
        this.isHidden  = def.isHidden  || false;
        this.isBoss    = def.isBoss    || false;
        this.isSuper   = def.isSuper   || false;

        // Status timers (seconds)
        this.stunTimer  = 0;
        this.slowTimer  = 0;
        this.slowFactor = 1;
        this.burnTimer  = 0;
        this.burnDPS    = 0;
        this.freezeTimer= 0;
        this._cryoHits  = 0;  // cryo frost stacks before freeze
        this._voidMarkTimer = 0;   // seconds of Void Mark remaining
        this._voidMarkBonus = 0;   // vulnerability multiplier bonus (e.g. 0.25 = +25% dmg taken)

        // Modifier flags
        this._waveMult  = waveMult;
        this._beefed    = waveMult >= 2.5;  // heavily scaled — show as "Beefed Up"
        this._noStun    = def.isBoss || type === 'juggernaut';  // immune to stun
        this._lead      = (type === 'juggernaut' && waveMult >= 3.0) ||
                          (type === 'brute'      && waveMult >= 5.0);  // non-AoE capped at 1 dmg

        // Path progress
        this.distTravelled = 0;
        this.x = 0; this.y = 0; this.angle = 0;

        // State flags
        this.isDead    = false;
        this.reached   = false;
        this._isDetected = !this.isHidden;    // hidden start undetected

        // Cosmetics
        this.bobOffset  = Math.random() * Math.PI * 2;
        this.spawnAnim  = 1.0;     // scale effect on spawn
        this._hitFlash  = 0;       // white flash on damage

        this._cachedKills = 0;

        this._updatePos();
    }

    _updatePos() {
        if (!currentPath || !currentPath.built) return;
        const p = currentPath.getPointAtDist(this.distTravelled);
        this.x = p.x; this.y = p.y; this.angle = p.angle;
    }

    update(dt) {
        if (this.isDead || this.reached) return this.reached;

        // Spawn scale animation
        if (this.spawnAnim > 0) {
            this.spawnAnim = Math.max(0, this.spawnAnim - dt * 4);
        }

        // Stun
        if (this.stunTimer > 0) {
            this.stunTimer = Math.max(0, this.stunTimer - dt);
            if (this.stunTimer > 0) return false;
        }

        // Freeze
        if (this.freezeTimer > 0) {
            this.freezeTimer = Math.max(0, this.freezeTimer - dt);
            if (this.freezeTimer > 0) return false;
        }

        // Creator arming phase — frozen in place
        if (this._creatorStopped) return false;

        // Slow
        let speedMult = 1;
        if (this.slowTimer > 0) {
            this.slowTimer = Math.max(0, this.slowTimer - dt);
            speedMult = (this.slowTimer > 0) ? this.slowFactor : 1;
        }

        // Burn DoT
        if (this.burnTimer > 0) {
            this.burnTimer = Math.max(0, this.burnTimer - dt);
            this.applyDamage(this.burnDPS * dt, { dot: true });
        }

        // Void Mark timer
        if (this._voidMarkTimer > 0) {
            this._voidMarkTimer = Math.max(0, this._voidMarkTimer - dt);
            if (this._voidMarkTimer <= 0) this._voidMarkBonus = 0;
        }

        // Move
        this.distTravelled += this.speed * speedMult * dt;

        if (this.distTravelled >= currentPath.totalLen) {
            this.reached = true;
            return true;
        }

        this._updatePos();
        return false;
    }

    applyDamage(amount, opts = {}) {
        if (this.isDead) return 0;
        if (this._invulnerable) {
            if (!opts.silent) spawnDmgFloat(this.x, this.y - this.size * 0.9, 0, '#555');
            return 0;
        }

        // Lead armor: non-AoE, non-dot damage capped at 1
        if (this._lead && !opts.aoe && !opts.armorPierce && !opts.dot && amount > 1) {
            amount = 1;
            if (!opts.silent) spawnDmgFloat(this.x, this.y - this.size * 0.9, 1, '#b0bec5');
            this.health -= 1;
            this._hitFlash = 0.08;
            if (this.health <= 0 && !this.isDead) this.die();
            return 1;
        }

        let dmg = amount;
        if (!opts.armorPierce && !opts.dot) dmg *= (1 - this.armor);
        if (dmg <= 0) dmg = 0;

        // Void Mark vulnerability amplification
        if (this._voidMarkTimer > 0 && this._voidMarkBonus > 0) dmg *= (1 + this._voidMarkBonus);

        this.health -= dmg;
        this._hitFlash = 0.12;

        // Damage float (silent opt suppresses for batching, e.g. laser)
        if (!opts.silent && (!opts.dot || Math.random() < 0.12)) {
            const col = this.armor > 0 && !opts.armorPierce ? '#90CAF9'
                      : dmg >= 80 ? '#FF6D00'
                      : dmg >= 25 ? '#FFCC02'
                      : '#EF9A9A';
            spawnDmgFloat(this.x, this.y - this.size * 0.9, dmg, col);
        }

        if (this.health <= 0 && !this.isDead) this.die();
        return dmg;
    }

    applySlow(factor, duration) {
        if (factor < this.slowFactor || this.slowTimer <= 0) {
            this.slowFactor = Math.min(this.slowFactor, factor);
        }
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    applyStun(duration) {
        if (this._immuneToStun || this._noStun) return;
        this.stunTimer = Math.max(this.stunTimer, duration);
    }

    applyFreeze(duration) {
        this.freezeTimer = Math.max(this.freezeTimer, duration);
        this.slowFactor  = 0;
        this.slowTimer   = duration;
    }

    // Called by cryo bullets — tracks stacks, freezes on 4th hit
    applyFrost(slowFactor, slowDur) {
        if (this.freezeTimer > 0) return;   // already frozen — don't stack
        this._cryoHits++;
        this.applySlow(slowFactor, slowDur);
        if (this._cryoHits >= 4) {
            this._cryoHits = 0;
            this.applyFreeze(2.0);
            spawnTextFloat(this.x, this.y - this.size * 1.1, '\u2744 FROZEN', '#4FC3F7');
        }
    }

    applyBurn(dps, duration) {
        this.burnTimer = Math.max(this.burnTimer, duration);
        this.burnDPS   = Math.max(this.burnDPS, dps);
    }

    // Void Mark: makes enemy take more damage from all sources for a duration.
    // Strongest application wins; duration always refreshes to max.
    applyVoidMark(bonus, dur) {
        this._voidMarkBonus = Math.max(this._voidMarkBonus, bonus);
        this._voidMarkTimer = Math.max(this._voidMarkTimer, dur);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (typeof game !== 'undefined') game.awardCash(this.value, this.x, this.y);
        if (typeof game !== 'undefined') game.score += Math.ceil(this.value * 1.5);
        spawnDeathParticles(this.x, this.y, this.color, this.isBoss ? 22 : (this.size > 20 ? 12 : 7));
    }

    //  Draw 
    draw(ctx) {
        if (this.isDead) return;
        const now = performance.now();
        const bob = Math.sin(now * 0.004 + this.bobOffset) * (this.isBoss ? 3 : 2);

        // Flying shadow
        if (this.isFlying) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y + this.size * 0.9, this.size * 0.65, this.size * 0.22, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        const drawY  = this.y - (this.isFlying ? this.size * 0.5 : 0) + bob;
        const scaleMod = this.spawnAnim > 0 ? 1 + this.spawnAnim * 0.5 : 1;

        ctx.save();
        ctx.translate(this.x, drawY);
        ctx.rotate(this.angle);
        if (scaleMod !== 1) ctx.scale(scaleMod, scaleMod);

        // Hidden opacity
        if (this.isHidden) {
            ctx.globalAlpha = this._isDetected ? 0.65 : 0.18;
        }

        // Status glow
        if (this.burnTimer > 0) {
            ctx.shadowColor = '#FF5722'; ctx.shadowBlur = 14;
        } else if (this.freezeTimer > 0 || this.slowTimer > 0) {
            ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 10;
        } else if (this.stunTimer > 0) {
            ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
        }

        // Hit flash
        if (this._hitFlash > 0) {
            ctx.globalAlpha = (ctx.globalAlpha || 1) * 1;
            this._hitFlash = Math.max(0, this._hitFlash - 0.02);
        }

        const s = this.size;
        if (this.isBoss) {
            if      (this.type === 'void_god')   this._drawArchitectI(ctx, s, now);
            else if (this.type === 'void_titan')  this._drawArchitectII(ctx, s, now);
            else if (this.type === 'creator')     this._drawCreator(ctx, s, now);
            else                                  this._drawBoss(ctx, s, now);
        } else if (this.type === 'flyer' || this.type === 'phantom' || this.type === 'void_wraith') this._drawFlyer(ctx, s, now);
        else if (this.type === 'swarm' || this.type === 'void_swarm') this._drawSwarm(ctx, s);
        else if (this.type === 'void_wisp') this._drawWisp(ctx, s, now);
        else                    this._drawBlock(ctx, s);

        // Hit white overlay
        if (this._hitFlash > 0) {
            ctx.globalAlpha = this._hitFlash * 3;
            ctx.fillStyle = '#ffffff';
            if (this.isBoss) ctx.fillRect(-s/2, -s/2, s, s);
            else             ctx.fillRect(-s/2, -s/2, s, s);
        }

        ctx.restore();

        this._drawHealthBar(ctx, drawY);
    }

    _drawBlock(ctx, s) {
        const base  = this.color;
        const light = this._lighten(base, 0.22);
        const dark  = this._darken(base, 0.32);

        // Main body
        ctx.fillStyle = base;
        ctx.fillRect(-s/2, -s/2, s, s);

        // Top highlight strip (pixel-art shading)
        ctx.fillStyle = light;
        ctx.fillRect(-s/2, -s/2, s, s * 0.22);

        // Left highlight strip
        ctx.fillStyle = this._lighten(base, 0.1);
        ctx.fillRect(-s/2, -s/2, s * 0.14, s);

        // Bottom shadow strip
        ctx.fillStyle = dark;
        ctx.fillRect(-s/2, s/2 - s * 0.2, s, s * 0.2);

        // Right shadow strip
        ctx.fillStyle = this._darken(base, 0.18);
        ctx.fillRect(s/2 - s * 0.12, -s/2, s * 0.12, s);

        // Pixel border
        ctx.strokeStyle = 'rgba(0,0,0,.4)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-s/2, -s/2, s, s);

        // Armor sheen
        if (this.armor > 0) {
            ctx.strokeStyle = 'rgba(180,220,255,.55)';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(-s/2+1.5, -s/2+1.5, s-3, s-3);
            ctx.fillStyle = 'rgba(180,220,255,.07)';
            ctx.fillRect(-s/2, -s/2, s, s * 0.4);
            // Armor rivets
            ctx.fillStyle = 'rgba(180,220,255,.35)';
            const rv = s * 0.1;
            ctx.fillRect(-s*.38, -s*.38, rv, rv);
            ctx.fillRect( s*.28, -s*.38, rv, rv);
            ctx.fillRect(-s*.38,  s*.28, rv, rv);
            ctx.fillRect( s*.28,  s*.28, rv, rv);
        }

        // Eyes (bright, blocky pixel style)
        const ew = s * 0.25, eh = s * 0.22;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-s*.34, -s*.18, ew, eh);
        ctx.fillRect( s*.09, -s*.18, ew, eh);
        ctx.fillStyle = '#111';
        ctx.fillRect(-s*.3,  -s*.14, ew*.5, eh*.6);
        ctx.fillRect( s*.13, -s*.14, ew*.5, eh*.6);
        // Pupil glint
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.fillRect(-s*.28, -s*.13, ew*.22, eh*.22);
        ctx.fillRect( s*.15, -s*.13, ew*.22, eh*.22);

        // Feet (block style)
        ctx.fillStyle = this._darken(base, 0.35);
        ctx.fillRect(-s*.36, s*.34, s*.28, s*.18);
        ctx.fillRect( s*.08, s*.34, s*.28, s*.18);

        // Phantom shimmer
        if (this.type === 'phantom' && this._isDetected) {
            ctx.strokeStyle = 'rgba(180,100,255,.45)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s/2, -s/2, s, s);
        }
        // Void shimmer for void_wisp (fallback)
        if (this.type === 'void_wisp') {
            ctx.strokeStyle = 'rgba(140,0,255,.5)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s/2, -s/2, s, s);
        }
    }

    _drawWisp(ctx, s, now) {
        // Pulsing void orb
        const pulse = 0.8 + 0.2 * Math.sin(now * 0.009 + this.bobOffset);
        const r = s * 0.55 * pulse;

        ctx.shadowColor = '#b040ff';
        ctx.shadowBlur  = 16;
        // Outer glow ring
        ctx.fillStyle = 'rgba(140,0,255,.18)';
        ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
        // Main orb
        const grad = ctx.createRadialGradient(-r * .2, -r * .2, r * .05, 0, 0, r);
        grad.addColorStop(0, '#e040fb');
        grad.addColorStop(0.5, '#9c27b0');
        grad.addColorStop(1, '#4a0080');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // Inner bright core
        ctx.fillStyle = 'rgba(255,180,255,.7)';
        ctx.beginPath(); ctx.arc(-r*.18, -r*.2, r*.28, 0, Math.PI * 2); ctx.fill();
        // Trailing void particles (small orbiting dots)
        for (let i = 0; i < 3; i++) {
            const a = now * 0.006 + (i / 3) * Math.PI * 2;
            const ox = Math.cos(a) * r * 1.3;
            const oy = Math.sin(a) * r * 0.8;
            ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.6;
            ctx.fillStyle = '#ce93d8';
            ctx.beginPath(); ctx.arc(ox, oy, r * 0.18, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
    }

    _drawFlyer(ctx, s, now) {
        const isPhantom = this.type === 'phantom';
        const isWraith  = this.type === 'void_wraith';
        const wCol = isPhantom ? '#ce93d8' : isWraith ? '#b040ff' : 'rgba(255,255,255,.55)';

        // Wing flap
        const wv = 0.32 + 0.3 * Math.sin(now * 0.015 + this.bobOffset);

        if (isWraith) {
            // Void wraith: dark cloak shape
            ctx.shadowColor = '#9c27b0'; ctx.shadowBlur = 14;
            // Cloak body
            ctx.fillStyle = this._darken(this.color, 0.1);
            ctx.beginPath();
            ctx.moveTo(0, -s*.7);
            ctx.lineTo(s*.55 + wv * s * .2, s*.1 + wv * s * .15);
            ctx.lineTo(s*.2, s*.7);
            ctx.lineTo(-s*.2, s*.7);
            ctx.lineTo(-s*.55 - wv * s * .2, s*.1 + wv * s * .15);
            ctx.closePath();
            ctx.fill();
            // Inner void glow
            ctx.fillStyle = 'rgba(150,0,255,.4)';
            ctx.beginPath(); ctx.arc(0, s*.05, s*.28, 0, Math.PI * 2); ctx.fill();
            // Glowing eyes
            ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#e040fb';
            ctx.beginPath(); ctx.arc(-s*.17, -s*.18, s*.09, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc( s*.17, -s*.18, s*.09, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            // Diamond body
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -s*.68);
            ctx.lineTo(s*.52, 0);
            ctx.lineTo(0, s*.68);
            ctx.lineTo(-s*.52, 0);
            ctx.closePath();
            ctx.fill();
            // Body sheen
            ctx.fillStyle = 'rgba(255,255,255,.15)';
            ctx.beginPath();
            ctx.moveTo(0, -s*.68);
            ctx.lineTo(s*.52, 0);
            ctx.lineTo(0, -s*.1);
            ctx.closePath();
            ctx.fill();

            // Wings
            ctx.strokeStyle = wCol; ctx.lineWidth = 2.2;
            ctx.shadowColor = wCol; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.moveTo(-s*.5, 0); ctx.lineTo(-s*(0.9+wv*.32), -s*.36); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-s*.5, 0); ctx.lineTo(-s*(0.7+wv*.18), -s*.12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*.5, 0); ctx.lineTo( s*(0.9+wv*.32), -s*.36); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*.5, 0); ctx.lineTo( s*(0.7+wv*.18), -s*.12); ctx.stroke();
            ctx.shadowBlur = 0;

            // Eye
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, -s*.2, s*.14, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = isPhantom ? '#b040ff' : '#111';
            ctx.beginPath(); ctx.arc(0, -s*.2, s*.07, 0, Math.PI*2); ctx.fill();
            // Glint
            ctx.fillStyle = 'rgba(255,255,255,.8)';
            ctx.beginPath(); ctx.arc(-s*.03, -s*.23, s*.04, 0, Math.PI*2); ctx.fill();
        }
    }

    _drawSwarm(ctx, s) {
        const isVoid = this.type === 'void_swarm';
        if (isVoid) {
            // Void swarm: spiky purple fragment
            ctx.shadowColor = '#7c4dff'; ctx.shadowBlur = 10;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            const spikes = 5;
            for (let k = 0; k < spikes * 2; k++) {
                const a = (k / (spikes * 2)) * Math.PI * 2;
                const r = k % 2 === 0 ? s * .55 : s * .25;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0;
            // Bright center
            ctx.fillStyle = 'rgba(180,100,255,.7)';
            ctx.beginPath(); ctx.arc(0, 0, s * .2, 0, Math.PI * 2); ctx.fill();
        } else {
            // Regular swarm: spiky blob
            ctx.fillStyle = this.color;
            ctx.beginPath();
            const spikes = 6;
            for (let k = 0; k < spikes; k++) {
                const a  = (k / spikes) * Math.PI * 2;
                const r1 = s * (.42 + (k%2) * .24);
                ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
            }
            ctx.closePath(); ctx.fill();
            // Top highlight
            ctx.fillStyle = this._lighten(this.color, 0.3);
            ctx.beginPath();
            for (let k = 0; k < spikes; k++) {
                const a = (k / spikes) * Math.PI * 2 - 0.4;
                const r1 = s * (.3 + (k%2) * .15);
                ctx.lineTo(Math.cos(a) * r1 - s*.08, Math.sin(a) * r1 - s*.12);
            }
            ctx.closePath(); ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-s*.14, -s*.09, s*.14, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( s*.14, -s*.09, s*.14, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(-s*.12, -s*.07, s*.07, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( s*.16, -s*.07, s*.07, 0, Math.PI*2); ctx.fill();
        }
    }

    _drawBoss(ctx, s, now) {
        const pulse = 1 + .055 * Math.sin(now * .0028 + this.bobOffset);
        ctx.scale(pulse, pulse);

        const isVoidGod   = this.type === 'void_god';
        const isVoidTitan = this.type === 'void_titan';
        const isTitan     = this.type === 'titan';

        if (isVoidGod || isVoidTitan) {
            // ── Void bosses ──────────────────────────────────────
            const voidColor = isVoidTitan ? '#2a0060' : '#4a0072';
            const accentCol = isVoidTitan ? '#b040ff' : '#e040fb';

            ctx.fillStyle = voidColor;
            ctx.fillRect(-s/2, -s/2, s, s);

            // Void gradient overlay
            const vg = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            vg.addColorStop(0, 'rgba(160,0,255,.18)');
            vg.addColorStop(1, 'rgba(0,0,0,.35)');
            ctx.fillStyle = vg;
            ctx.fillRect(-s/2, -s/2, s, s);

            // Pixel shading
            ctx.fillStyle = this._lighten(voidColor, 0.2);
            ctx.fillRect(-s/2, -s/2, s, s * 0.18);
            ctx.fillStyle = this._darken(voidColor, 0.3);
            ctx.fillRect(-s/2, s/2 - s * 0.18, s, s * 0.18);

            // Void cracks
            ctx.strokeStyle = `${accentCol}88`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-s*.25, -s*.4); ctx.lineTo(s*.1, s*.3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*.2, -s*.38); ctx.lineTo(-s*.08, s*.25); ctx.stroke();
            if (isVoidTitan) {
                ctx.strokeStyle = `${accentCol}aa`; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-s*.42, -s*.1); ctx.lineTo(s*.42, s*.1); ctx.stroke();
            }

            // Orbiting runes
            const runes = ['☽','✦','⧖','∅','☿','⊗'];
            ctx.font = `${s * (isVoidTitan ? .22 : .18)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = accentCol; ctx.shadowBlur = 14;
            ctx.fillStyle = accentCol;
            const numRunes = isVoidTitan ? 6 : 4;
            for (let r = 0; r < numRunes; r++) {
                const ra = (r / numRunes) * Math.PI * 2 + now * (isVoidTitan ? .0009 : .0013);
                const rd = s * (isVoidTitan ? .85 : .75);
                ctx.fillText(runes[r % runes.length], Math.cos(ra) * rd, Math.sin(ra) * rd);
            }
            ctx.shadowBlur = 0;

            // Crown spikes (void style)
            ctx.fillStyle = accentCol;
            ctx.shadowColor = accentCol; ctx.shadowBlur = 12;
            const numSpikes = isVoidTitan ? 5 : 3;
            for (let i = 0; i < numSpikes; i++) {
                const ix = (i / (numSpikes-1) - 0.5) * s * .8;
                ctx.beginPath();
                ctx.moveTo(ix - s*.1, -s/2);
                ctx.lineTo(ix, -s/2 - s * (isVoidTitan ? .34 : .28));
                ctx.lineTo(ix + s*.1, -s/2);
                ctx.closePath(); ctx.fill();
            }

            // Glowing void eyes
            ctx.shadowBlur = 20;
            ctx.fillStyle = accentCol;
            if (isVoidTitan) {
                // 4 eyes
                ctx.beginPath(); ctx.arc(-s*.28, -s*.12, s*.1, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(-s*.08, -s*.12, s*.1, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc( s*.08, -s*.12, s*.1, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc( s*.28, -s*.12, s*.1, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(-s*.22, -s*.1, s*.1, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc( s*.22, -s*.1, s*.1, 0, Math.PI*2); ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Void mouth (jagged)
            ctx.fillStyle = 'rgba(0,0,0,.7)';
            ctx.fillRect(-s*.28, s*.15, s*.56, s*.14);
            ctx.fillStyle = accentCol + '88';
            for (let t = 0; t < 5; t++) {
                ctx.fillRect(-s*.26 + t * s*.12, s*.15, s*.06, s*.06 + (t%2)*s*.06);
            }

        } else if (isTitan) {
            // ── Titan ────────────────────────────────────────────
            ctx.fillStyle = this.color;
            ctx.fillRect(-s/2, -s/2, s, s);
            // Metallic sheen
            const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            grad.addColorStop(0, 'rgba(255,255,255,.16)');
            grad.addColorStop(0.45, 'rgba(255,255,255,.04)');
            grad.addColorStop(1, 'rgba(0,0,0,.25)');
            ctx.fillStyle = grad; ctx.fillRect(-s/2, -s/2, s, s);
            // Pixel shading
            ctx.fillStyle = this._lighten(this.color, 0.18);
            ctx.fillRect(-s/2, -s/2, s, s * 0.16);
            ctx.fillStyle = this._darken(this.color, 0.25);
            ctx.fillRect(-s/2, s/2 - s * 0.16, s, s * 0.16);
            // Cracks
            ctx.strokeStyle = '#e040fbbb'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-s*.3, -s*.35); ctx.lineTo(s*.1, s*.15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*.22, -s*.38); ctx.lineTo(-s*.1, s*.28); ctx.stroke();
            // Rune ring
            const runeT = ['','','',''];
            ctx.fillStyle = '#e040fb'; ctx.font = `${s*.2}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 14;
            for (let r = 0; r < 4; r++) {
                const ra = (r/4)*Math.PI*2 + now*.0012;
                ctx.fillText(runeT[r], Math.cos(ra)*s*.74, Math.sin(ra)*s*.74);
            }
            ctx.shadowBlur = 0;
            // Crown
            ctx.fillStyle = '#e040fb'; ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 10;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i*s*.3 - s*.12, -s/2);
                ctx.lineTo(i*s*.3, -s/2 - s*.32);
                ctx.lineTo(i*s*.3 + s*.12, -s/2);
                ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = '#e040fb'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(-s*.22, -s*.1, s*.1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( s*.22, -s*.1, s*.1, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;

        } else {
            // ── Overlord / regular boss ──────────────────────────
            ctx.fillStyle = this.color;
            ctx.fillRect(-s/2, -s/2, s, s);
            // Metallic sheen
            const grad2 = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            grad2.addColorStop(0, 'rgba(255,255,255,.16)');
            grad2.addColorStop(1, 'rgba(0,0,0,.25)');
            ctx.fillStyle = grad2; ctx.fillRect(-s/2, -s/2, s, s);
            // Pixel shading
            ctx.fillStyle = this._lighten(this.color, 0.2);
            ctx.fillRect(-s/2, -s/2, s, s * 0.18);
            ctx.fillStyle = this._darken(this.color, 0.28);
            ctx.fillRect(-s/2, s/2 - s * 0.18, s, s * 0.18);
            // Pixel border
            ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2;
            ctx.strokeRect(-s/2, -s/2, s, s);
            // Crown
            ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i*s*.3 - s*.12, -s/2);
                ctx.lineTo(i*s*.3, -s/2 - s*.26);
                ctx.lineTo(i*s*.3 + s*.12, -s/2);
                ctx.closePath(); ctx.fill();
            }
            // Glowing eyes
            ctx.fillStyle = '#FFD700'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.arc(-s*.22, -s*.1, s*.11, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( s*.22, -s*.1, s*.11, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            // Mouth
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-s*.28, s*.2);
            ctx.lineTo(-s*.14, s*.28);
            ctx.lineTo(0, s*.2);
            ctx.lineTo( s*.14, s*.28);
            ctx.lineTo( s*.28, s*.2);
            ctx.stroke();
        }
    }

    // ── Architect I: crystalline void sorcerer (purple) ────────
    _drawArchitectI(ctx, s, now) {
        const pulse = 1 + .06 * Math.sin(now * .003 + this.bobOffset);
        ctx.scale(pulse, pulse);
        const ACC = '#e040fb', DARK = '#0d001e';

        // Void pool under feet
        const pool = ctx.createRadialGradient(0, s*.4, 0, 0, s*.4, s*.62);
        pool.addColorStop(0, 'rgba(200,0,255,.32)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pool;
        ctx.beginPath(); ctx.ellipse(0, s*.4, s*.62, s*.22, 0, 0, Math.PI*2); ctx.fill();

        // Hexagonal body
        ctx.shadowColor = ACC; ctx.shadowBlur = 22;
        ctx.fillStyle = DARK;
        ctx.beginPath();
        for (const [hx,hy] of [[0,-s*.74],[s*.42,-s*.38],[s*.44,s*.3],[0,s*.54],[-s*.44,s*.3],[-s*.42,-s*.38]])
            ctx.lineTo(hx, hy);
        ctx.closePath(); ctx.fill();
        const gg = ctx.createLinearGradient(-s*.42,-s*.74, s*.42,s*.54);
        gg.addColorStop(0,'rgba(210,0,255,.22)'); gg.addColorStop(1,'rgba(0,0,0,.32)');
        ctx.fillStyle = gg; ctx.fill();

        // Crystal wings
        ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 15;
        for (const flip of [-1,1]) {
            ctx.save(); ctx.scale(flip,1);
            ctx.fillStyle = 'rgba(180,0,255,.13)';
            ctx.beginPath();
            ctx.moveTo(s*.42,-s*.2); ctx.lineTo(s*.95,-s*.62); ctx.lineTo(s*.8,s*.14); ctx.lineTo(s*.42,s*.14);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#b040ff'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        }

        // Crown spikes
        ctx.fillStyle = ACC; ctx.shadowColor = ACC; ctx.shadowBlur = 20;
        for (let i = 0; i < 3; i++) {
            const bx = (i-1)*s*.32;
            ctx.beginPath();
            ctx.moveTo(bx-s*.08,-s*.74); ctx.lineTo(bx, -s*.74 - s*(i===1?.46:.32)); ctx.lineTo(bx+s*.08,-s*.74);
            ctx.closePath(); ctx.fill();
        }

        // Cat-eye slits
        ctx.shadowColor = '#ff99ff'; ctx.shadowBlur = 24; ctx.fillStyle = '#ff99ff';
        for (const flip of [-1,1]) {
            ctx.save(); ctx.scale(flip,1);
            ctx.beginPath(); ctx.ellipse(s*.19,-s*.19,s*.16,s*.058,Math.PI*.18,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = DARK; ctx.beginPath(); ctx.ellipse(s*.19,-s*.19,s*.06,s*.044,Math.PI*.18,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Orbiting crystal gems
        ctx.shadowColor = ACC; ctx.shadowBlur = 14;
        const gemC = [ACC,'#cc88ff','#ff88ff'];
        for (let i = 0; i < 3; i++) {
            const a = (i/3)*Math.PI*2 + now*.0024;
            ctx.fillStyle = gemC[i];
            ctx.beginPath(); ctx.arc(Math.cos(a)*s*.82, Math.sin(a)*s*.82, s*.11, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // ── Architect II: armored void golem (dark violet) ────────
    _drawArchitectII(ctx, s, now) {
        const pulse = 1 + .04 * Math.sin(now * .002 + this.bobOffset);
        ctx.scale(pulse, pulse);
        const ACC = '#9933ff', GLOW = '#cc44ff', DARK = '#07000f';

        // Wide armored body
        ctx.shadowColor = ACC; ctx.shadowBlur = 26;
        ctx.fillStyle = DARK; ctx.fillRect(-s*.54,-s*.5,s*1.08,s*1.0);

        // Shoulder plates
        ctx.fillStyle = '#110020';
        ctx.fillRect(-s*.76,-s*.46,s*.24,s*.46);
        ctx.fillRect( s*.52,-s*.46,s*.24,s*.46);

        // Gradient sheen
        const sh = ctx.createLinearGradient(-s/2,-s/2,s*.18,s/2);
        sh.addColorStop(0,'rgba(150,0,255,.15)'); sh.addColorStop(1,'rgba(0,0,0,.24)');
        ctx.fillStyle = sh; ctx.fillRect(-s*.76,-s*.5,s*1.52,s*1.0);

        // Chest crack — void energy
        ctx.shadowColor = GLOW; ctx.shadowBlur = 34;
        ctx.strokeStyle = GLOW; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(s*.02,-s*.38); ctx.lineTo(-s*.07,s*.04); ctx.lineTo(s*.05,s*.3); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ff99ff';
        ctx.beginPath(); ctx.moveTo(-s*.05,-s*.3); ctx.lineTo(s*.06,-s*.04); ctx.stroke();
        ctx.globalAlpha = .2; ctx.fillStyle = GLOW;
        ctx.beginPath(); ctx.ellipse(0, -s*.04, s*.12, s*.34, -0.1, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // 4 eyes (2x2)
        const eyes = [[-s*.22,-s*.2],[s*.22,-s*.2],[-s*.22,s*.05],[s*.22,s*.05]];
        ctx.fillStyle = GLOW; ctx.shadowColor = GLOW; ctx.shadowBlur = 22;
        for (const [ex,ey] of eyes) {
            ctx.beginPath(); ctx.arc(ex,ey,s*.095,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffe0ff';
            ctx.beginPath(); ctx.arc(ex-s*.028,ey-s*.028,s*.034,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = GLOW;
        }

        // Slow orbiting runes
        ctx.font = `${s*.22}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = ACC; ctx.shadowColor = ACC; ctx.shadowBlur = 16;
        for (let i = 0; i < 4; i++) {
            const a = (i/4)*Math.PI*2 + now*.00055;
            ctx.fillText(['\u262b','\u29d6','\u221e','\u03a9'][i], Math.cos(a)*s*.99, Math.sin(a)*s*.99);
        }
        ctx.shadowBlur = 0;
    }

    // ── The Creator: armored warrior-king, the final conqueror ─
    _drawCreator(ctx, s, now) {
        const isArming   = this._armorPhase === 'arming';
        const isEnraged  = this._armorPhase === 'enraged';
        const isSlamming = this._armorPhase === 'slam_windup';
        const isShielded = !!(this._barrierActive || this._barrierMaterializing);
        const pulse = 1 + 0.022 * Math.sin(now * 0.0028 + (this.bobOffset || 0));
        ctx.scale(pulse, pulse);

        const STEEL  = '#1c2030';
        const TRIM   = '#c8a000';
        const RUNE   = isEnraged ? '#ff5500' : '#4466dd';
        const EYE    = isEnraged ? '#ff2200' : '#88ccff';
        const CAPE   = isEnraged ? '#1a0000' : '#0c0c1e';
        const GLOW   = isEnraged ? '#ff5500' : '#2244aa';

        // ── Cape (drawn first, behind everything) ───────────────
        const cw = Math.sin(now * 0.0022) * s * 0.07;
        ctx.fillStyle   = CAPE;
        ctx.shadowColor = GLOW; ctx.shadowBlur = isEnraged ? 20 : 8;
        ctx.beginPath();
        ctx.moveTo(-s * 0.36, -s * 0.38);
        ctx.bezierCurveTo(-s * 0.62 + cw, s * 0.12, -s * 0.50 - cw, s * 0.68, -s * 0.24, s * 0.96);
        ctx.lineTo( s * 0.24, s * 0.96);
        ctx.bezierCurveTo( s * 0.50 + cw, s * 0.68,  s * 0.62 - cw, s * 0.12,  s * 0.36, -s * 0.38);
        ctx.closePath(); ctx.fill();
        // Enraged: tattered lower edge
        if (isEnraged) {
            ctx.strokeStyle = '#330000'; ctx.lineWidth = 1.8; ctx.shadowBlur = 4;
            for (let i = 0; i < 5; i++) {
                const ex = -s * 0.20 + i * s * 0.10 + Math.sin(now * 0.006 + i) * s * 0.04;
                ctx.beginPath();
                ctx.moveTo(ex, s * 0.88);
                ctx.lineTo(ex + (Math.random() - 0.5) * s * 0.08, s * 0.96 + s * 0.06 * Math.random());
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;

        // ── Leg armour (greaves) ─────────────────────────────────
        ctx.fillStyle = STEEL; ctx.shadowColor = GLOW; ctx.shadowBlur = 5;
        ctx.fillRect(-s * 0.18, s * 0.28, s * 0.14, s * 0.44);
        ctx.fillRect( s * 0.04, s * 0.28, s * 0.14, s * 0.44);
        ctx.strokeStyle = TRIM; ctx.lineWidth = 1.5;
        ctx.strokeRect(-s * 0.18, s * 0.28, s * 0.14, s * 0.44);
        ctx.strokeRect( s * 0.04, s * 0.28, s * 0.14, s * 0.44);
        ctx.shadowBlur = 0;

        // ── Chest plate (tapered, wider at shoulder) ─────────────
        ctx.fillStyle   = STEEL;
        ctx.shadowColor = GLOW; ctx.shadowBlur = isEnraged ? 30 : 14;
        ctx.beginPath();
        ctx.moveTo(-s * 0.36, -s * 0.42);
        ctx.lineTo( s * 0.36, -s * 0.42);
        ctx.lineTo( s * 0.28, s * 0.28);
        ctx.lineTo(-s * 0.28, s * 0.28);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = TRIM; ctx.lineWidth = 2.2; ctx.stroke();
        // Gold horizontal torso band
        ctx.fillStyle = TRIM + '88';
        ctx.fillRect(-s * 0.28, -s * 0.04, s * 0.56, s * 0.06);

        // Enraged armor cracks glow from within
        if (isEnraged) {
            const ct = now * 0.0048;
            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 1.6;
            ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 14;
            ctx.globalAlpha = 0.65 + 0.30 * Math.sin(ct);
            ctx.beginPath(); ctx.moveTo(-s*0.20, -s*0.30); ctx.lineTo(-s*0.08, -s*0.10); ctx.lineTo(-s*0.14, s*0.14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*0.04, -s*0.34); ctx.lineTo( s*0.12, -s*0.06); ctx.lineTo( s*0.06, s*0.20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*0.18, -s*0.26); ctx.lineTo( s*0.22,  s*0.06); ctx.stroke();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }

        // ── Pauldrons (shoulder armour) ──────────────────────────
        ctx.fillStyle   = STEEL; ctx.shadowColor = TRIM; ctx.shadowBlur = 10;
        ctx.beginPath();  // Left
        ctx.moveTo(-s*0.36, -s*0.42); ctx.lineTo(-s*0.62, -s*0.34);
        ctx.lineTo(-s*0.64, -s*0.12); ctx.lineTo(-s*0.36, -s*0.08);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = TRIM; ctx.lineWidth = 2.0; ctx.stroke();
        ctx.beginPath();  // Right
        ctx.moveTo( s*0.36, -s*0.42); ctx.lineTo( s*0.62, -s*0.34);
        ctx.lineTo( s*0.64, -s*0.12); ctx.lineTo( s*0.36, -s*0.08);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = TRIM; ctx.lineWidth = 2.0; ctx.stroke();
        ctx.shadowBlur = 0;

        // ── Chest rune (pulsing diamond) ─────────────────────────
        const ra = 0.52 + 0.40 * Math.sin(now * 0.0038);
        ctx.globalAlpha = ra;
        ctx.strokeStyle = RUNE; ctx.lineWidth = 1.6;
        ctx.shadowColor = RUNE; ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo( 0,         -s*0.26);
        ctx.lineTo( s*0.10,    -s*0.10);
        ctx.lineTo( 0,          s*0.06);
        ctx.lineTo(-s*0.10,    -s*0.10);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s*0.14, -s*0.10); ctx.lineTo(s*0.14, -s*0.10); ctx.stroke();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;

        // ── Helmet ───────────────────────────────────────────────
        ctx.fillStyle = STEEL; ctx.shadowColor = TRIM; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-s*0.24, -s*0.42);
        ctx.lineTo( s*0.24, -s*0.42);
        ctx.lineTo( s*0.20, -s*0.74);
        ctx.lineTo(-s*0.20, -s*0.74);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = TRIM; ctx.lineWidth = 2.0; ctx.stroke();
        // Visor slit
        ctx.fillStyle = '#000000';
        ctx.fillRect(-s*0.14, -s*0.62, s*0.28, s*0.06);
        ctx.shadowBlur = 0;

        // ── Crown ────────────────────────────────────────────────
        ctx.fillStyle   = TRIM;
        ctx.shadowColor = isEnraged ? '#ff8800' : '#ffd700';
        ctx.shadowBlur  = isEnraged ? 32 : 18;
        // Base band
        ctx.fillRect(-s*0.23, -s*0.76, s*0.46, s*0.055);
        ctx.strokeStyle = '#7a5800'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-s*0.23, -s*0.76, s*0.46, s*0.055);
        // Five teeth
        const cTeeth  = [-s*0.20, -s*0.10, 0, s*0.10, s*0.20];
        const cHts    = [s*0.13,  s*0.08,  s*0.17, s*0.08, s*0.13];
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(cTeeth[i] - s*0.04, -s*0.76);
            ctx.lineTo(cTeeth[i],           -s*0.76 - cHts[i]);
            ctx.lineTo(cTeeth[i] + s*0.04, -s*0.76);
            ctx.closePath(); ctx.fill();
        }
        // Centre crown gem
        ctx.fillStyle   = isEnraged ? '#ff1100' : '#5577ff';
        ctx.shadowColor = isEnraged ? '#ff4400' : '#7799ff'; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(0, -s*0.82, s*0.052, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // ── Eyes ────────────────────────────────────────────────
        ctx.shadowColor = EYE; ctx.shadowBlur = 24; ctx.fillStyle = EYE;
        ctx.beginPath(); ctx.ellipse(-s*0.09, -s*0.58, s*0.055, s*0.034, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( s*0.09, -s*0.58, s*0.055, s*0.034, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(-s*0.09, -s*0.58, s*0.022, s*0.028, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( s*0.09, -s*0.58, s*0.022, s*0.028, 0, 0, Math.PI*2); ctx.fill();

        // ── Enraged armour glow ring ─────────────────────────────
        if (isEnraged) {
            const ep = 0.45 + 0.35 * Math.sin(now * 0.0044);
            ctx.globalAlpha = ep * 0.35;
            ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 4;
            ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 28;
            ctx.beginPath(); ctx.arc(0, -s*0.10, s*0.90, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }

        // ── Sword (left side — raised overhead during slam) ──────
        const slamFrac = isSlamming ? Math.min(1, (this._slamWindupT || 0) / 0.55) : 0;
        // Angle: 0 = blade upright at left side; slamFrac → raised 95° toward overhead
        const swordAngle = slamFrac * (Math.PI * 0.53);
        // Hide sword body while in the air (throwing phase)
        if (this._armorPhase !== 'throwing') {
            ctx.save();
            ctx.translate(-s*0.50, s*0.06);  // grip anchor at left side
            ctx.rotate(swordAngle);

            const sG = (isArming || isSlamming) ? '#ff6600' : isEnraged ? '#ff3300' : TRIM;

            // Blade (tapered: wide at guard, narrow tip pointing UP in local space)
            ctx.shadowColor = sG; ctx.shadowBlur = isEnraged ? 28 : 16;
            ctx.fillStyle   = isArming ? '#ff9900' : '#b8b8cc';
            ctx.beginPath();
            ctx.moveTo(-s*0.058, -s*0.04);
            ctx.lineTo( s*0.058, -s*0.04);
            ctx.lineTo( s*0.018, -s*0.80);
            ctx.lineTo(-s*0.018, -s*0.80);
            ctx.closePath(); ctx.fill();
            // Gold edge lines
            ctx.strokeStyle = sG; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-s*0.058,-s*0.04); ctx.lineTo(-s*0.018,-s*0.80); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( s*0.058,-s*0.04); ctx.lineTo( s*0.018,-s*0.80); ctx.stroke();
            // Blade runes
            const br = 0.48 + 0.38 * Math.sin(now * 0.0058);
            ctx.globalAlpha = br;
            ctx.strokeStyle = isEnraged ? '#ffaa00' : '#aabbff'; ctx.lineWidth = 1.1;
            ctx.shadowColor = isEnraged ? '#ff6600' : '#8899ee'; ctx.shadowBlur = 8;
            for (let i = 0; i < 3; i++) {
                const ry = -s*0.22 - i*s*0.18;
                ctx.beginPath(); ctx.moveTo(-s*0.036, ry); ctx.lineTo(s*0.036, ry); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            // Cross-guard
            ctx.fillStyle   = TRIM;
            ctx.shadowColor = sG; ctx.shadowBlur = 12;
            ctx.fillRect(-s*0.15, -s*0.06, s*0.30, s*0.052);
            ctx.strokeStyle = '#7a5800'; ctx.lineWidth = 1.4;
            ctx.strokeRect(-s*0.15, -s*0.06, s*0.30, s*0.052);
            // Grip
            ctx.fillStyle = '#1e1000'; ctx.shadowBlur = 0;
            ctx.fillRect(-s*0.040, -s*0.02, s*0.080, s*0.26);
            ctx.strokeStyle = TRIM + 'aa'; ctx.lineWidth = 0.9;
            for (let i = 0; i < 4; i++) {
                const gy = -s*0.01 + i*s*0.058;
                ctx.beginPath(); ctx.moveTo(-s*0.040, gy); ctx.lineTo(s*0.040, gy); ctx.stroke();
            }
            // Pommel
            ctx.fillStyle = TRIM; ctx.shadowColor = sG; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(0, s*0.24, s*0.062, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // ── Rune barrier (orbiting glyphs when shielded) ─────────
        if (isShielded) {
            const mat = this._barrierMaterializing
                ? Math.min(1, (this._barrierMatT || 0) / 0.8)
                : 1.0;
            const bCol = isEnraged ? '#ffaa00' : '#5588ff';
            ctx.globalAlpha = mat * 0.85;
            ctx.strokeStyle = bCol; ctx.lineWidth = 1.8 * mat;
            ctx.shadowColor = bCol; ctx.shadowBlur = 22 * mat;
            ctx.beginPath(); ctx.arc(0, 0, s*1.26, 0, Math.PI*2); ctx.stroke();
            // Inner ring
            ctx.globalAlpha = mat * 0.40;
            ctx.lineWidth   = 3 * mat;
            ctx.beginPath(); ctx.arc(0, 0, s*1.10, 0, Math.PI*2); ctx.stroke();
            // 6 rotating rune glyphs
            ctx.font = `bold ${Math.round(s*0.22)}px serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = bCol;
            for (let i = 0; i < 6; i++) {
                const ga = (i/6)*Math.PI*2 + now*0.0012;
                const gx = Math.cos(ga) * s*1.26;
                const gy = Math.sin(ga) * s*1.26;
                ctx.globalAlpha = mat * (0.72 + 0.26*Math.sin(now*0.007 + i*1.05));
                ctx.fillText(['\u16B1','\u16A2','\u16BE','\u16D6','\u16A0','\u16DA'][i], gx, gy);
            }
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }
    }

    _drawHealthBar(ctx, drawY) {
        const barW  = this.size * (this.isBoss ? 1.7 : 1.35);
        const barH  = this.isBoss ? 6 : 4;
        const bx    = this.x - barW / 2;
        const by    = drawY - this.size * (this.isFlying ? 1.35 : .95);
        const pct   = Math.max(0, this.health / this.maxHealth);

        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.beginPath(); ctx.roundRect(bx-1, by-1, barW+2, barH+2, 2); ctx.fill();

        const hCol = pct > .6 ? '#4CAF50' : pct > .3 ? '#FFA726' : '#EF5350';
        ctx.fillStyle = hCol;
        ctx.beginPath(); ctx.roundRect(bx, by, barW * pct, barH, 2); ctx.fill();
    }

    _darken(hex, amt) {
        let r = parseInt(hex.slice(1,3),16),
            g = parseInt(hex.slice(3,5),16),
            b = parseInt(hex.slice(5,7),16);
        return `rgb(${Math.max(0,(r*(1-amt))|0)},${Math.max(0,(g*(1-amt))|0)},${Math.max(0,(b*(1-amt))|0)})`;
    }

    _lighten(hex, amt) {
        try {
            let r = parseInt(hex.slice(1,3),16),
                g = parseInt(hex.slice(3,5),16),
                b = parseInt(hex.slice(5,7),16);
            return `rgb(${Math.min(255,(r+(255-r)*amt)|0)},${Math.min(255,(g+(255-g)*amt)|0)},${Math.min(255,(b+(255-b)*amt)|0)})`;
        } catch(_) { return hex; }
    }
}

//  Damage floats 
const dmgFloats = [];

function spawnDmgFloat(x, y, amount, color) {
    dmgFloats.push({
        x, y, text: amount < 1 ? amount.toFixed(1) : Math.round(amount).toString(),
        color, alpha: 1, vy: -52, life: 0,
        big: amount >= 40,
    });
}

function spawnTextFloat(x, y, text, color) {
    dmgFloats.push({ x, y, text, color, alpha: 1, vy: -58, life: 0, big: true });
}

function updateDmgFloats(dt) {
    for (let i = dmgFloats.length - 1; i >= 0; i--) {
        const f = dmgFloats[i];
        f.life += dt;
        f.y    += f.vy * dt;
        f.vy   += 30 * dt;
        f.alpha = Math.max(0, 1 - f.life * 1.4);
        if (f.alpha <= 0) dmgFloats.splice(i, 1);
    }
}

function drawDmgFloats(ctx) {
    if (!dmgFloats.length) return;
    ctx.save();
    for (const f of dmgFloats) {
        ctx.globalAlpha = f.alpha;
        ctx.font = f.big ? 'bold 16px "Segoe UI",Arial' : 'bold 12px "Segoe UI",Arial';
        ctx.fillStyle   = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur  = f.big ? 10 : 6;
        ctx.textAlign   = 'center';
        ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
}

//  Death particles 
const particles = [];

function spawnDeathParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = 60 + Math.random() * 140;
        particles.push({
            x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd,
            color, alpha: 0.95, size: 3 + Math.random() * 5, life: 0,
        });
    }
}

//  Cash pop animations 
const cashAnims = [];

function spawnCashAnim(x, y, amount) {
    cashAnims.push({ x, y, amount, alpha: 1, vy: -40, life: 0 });
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy   += 160 * dt; p.alpha = Math.max(0, 1 - p.life * 1.8);
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function drawParticles(ctx) {
    ctx.save();
    for (const p of particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath(); ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function updateCashAnims(dt) {
    for (let i = cashAnims.length - 1; i >= 0; i--) {
        const c = cashAnims[i];
        c.life += dt; c.y += c.vy * dt; c.alpha = Math.max(0, 1 - c.life * 1.3);
        if (c.alpha <= 0) cashAnims.splice(i, 1);
    }
}

function drawCashAnims(ctx) {
    ctx.save();
    for (const c of cashAnims) {
        ctx.globalAlpha = c.alpha;
        ctx.font = 'bold 13px "Segoe UI",Arial';
        ctx.fillStyle   = '#fdd835';
        ctx.shadowColor = '#ffa000';
        ctx.shadowBlur  = 6;
        ctx.textAlign   = 'center';
        ctx.fillText('+$' + c.amount, c.x, c.y);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.restore();
}
