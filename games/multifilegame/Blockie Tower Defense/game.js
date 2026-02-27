// Game constants
const MAX_TOWERS = 15;
const TOWER_SPACING = 100;
const BASE_WAVE_BONUS = 200;

const GLITCH_MESSAGES = [
    "GREETINGS PLAYER",
    "YOU HAVE PROVEN YOURSELF QUITE SKILLFUL SO FAR.",
    "LET'S SEE HOW SKILLED YOU TRULY ARE.",
    "WILL YOU HOLD OR WILL YOU FALL?"
];

const GLITCH_HORDE_POOL = [
    { type: 'emerald', weight: 6, healthMult: 1.3, speedMult: 1.06, valueMult: 2.2 },
    { type: 'berserker', weight: 5, healthMult: 1.4, speedMult: 1.05, valueMult: 2.4 },
    { type: 'sam', weight: 4, healthMult: 1.15, speedMult: 1.0, valueMult: 2.8 },
    { type: 'hidden', weight: 3, healthMult: 1.35, speedMult: 1.1, valueMult: 2.6 },
    { type: 'flying', weight: 3, healthMult: 1.2, speedMult: 1.12, valueMult: 2.1 },
    { type: 'tank', weight: 2, healthMult: 1.6, speedMult: 0.95, valueMult: 3.0 },
    { type: 'superBoss', weight: 0.1, healthMult: 1.9, speedMult: 0.88, valueMult: 3.8 }
];

const GLITCH_BOSS_DIALOG = [
    "MAN IDK WTF TO PUT HERE YET",
    "GOOD LUCK IG",
    "TEMP ZOMBIES IN THE ARENA",
    "SURVIVE THIS AND THE CLUSTER CLEARS."
];

const GLITCH_BOSS_TYPES = ['bluelol', 'ButthurtAF'];
const GLITCH_BOSS_HEALTH = 600000;

const GLITCH_UNICODE = [
    '░','▒','▓','█','¥','Ø','Ξ','Ж','§','¶','¤','◘','■','▟','▚','▞','⌁','¤'
];

function skipGlitchBossWait() {
    if (glitchModeActive && !glitchBossPhaseActive) {
        displayGlitchMessage("ADMIN OVERRIDE: FORCING BOSS PHASE", () => {
            startGlitchBossPhase();
        });
    } else if (!glitchModeActive) {
        displayGlitchMessage("HIDDEN WAVE NOT ACTIVE");
    } else {
        displayGlitchMessage("BOSS PHASE ALREADY ACTIVE");
    }
}

const GLITCH_FLASH_INTERVAL = 2000;
const GLITCH_FLASH_DURATION = 400;
//let glitchFlashLastPulse = 0;
//let glitchFlashEntries = [];
// const glitchFlashLookup = new Map();

const GLITCH_FOOTER_TYPING_INTERVAL = 120;
const GLITCH_FOOTER_HOLD_DURATION = 1800;
const GLITCH_FOOTER_FADE_DURATION = 900;
const GLITCH_FOOTER_Y_OFFSET = 64;

const GLITCH_BOSS_FOOTER_SPAM = [
    'ERROR: SIGNAL BREACHED',
    '███ WAKE UP ██',
    'YOU SHOULD NOT BE HERE',
    'ADMIN ACCESS IS FUTILE',
    'THE GRID IS COLLAPSING',
    'GODMODE? TRY HARDER',
    'STACK OVERFLOW DETECTED',
    'REWRITE THE CODE OR DIE',
    'NULL POINTER INCOMING',
    'WHO INVITED YOU?' ,
    'GLITCH PROTOCOL++',
    'S.O.S. FROM PATH NODE 42'
];

const GLITCH_ADMIN_PENALTIES = {
    speedMult: 1.4,
    healthMult: 2.5,
    spawnRateMult: 0.35,
    message: 'ADMIN MENU DETECTED — PROTOCOL OMEGA'
};

let glitchOverlayEl = null;
let glitchTextContainerEl = null;
//let screenFlashEl = null;
let glitchPersistentDark = false;
let glitchMessageIndex = 0;
let glitchMessagesActive = false;

const glitchFooterState = {
    active: false,
    completed: false,
    messageIndex: 0,
    revealed: 0,
    phase: 'typing',
    nextUpdate: 0,
    holdUntil: 0,
    fadeUntil: 0,
    alpha: 1
};

function handleGlitchHiddenEnded() {
    if (!glitchHiddenMusic) return;
    glitchHiddenMusic.removeEventListener('ended', handleGlitchHiddenEnded);
    if (!glitchModeActive || glitchBossPhaseActive) return;
    startGlitchBossPhase();
}

function getTowerLimit() {
    return glitchModeActive ? glitchTowerLimit : MAX_TOWERS;
}

function pickGlitchHordeEntry() {
    const totalWeight = GLITCH_HORDE_POOL.reduce((sum, entry) => sum + entry.weight, 0);
    let choice = Math.random() * totalWeight;
    for (const entry of GLITCH_HORDE_POOL) {
        choice -= entry.weight;
        if (choice <= 0) {
            return entry;
        }
    }
    return GLITCH_HORDE_POOL[GLITCH_HORDE_POOL.length - 1];
}

function spawnGlitchHorde() {
    if (glitchBossPhaseActive) return;
    const enemiesPerCycle = 3;
    const adminPenalty = (glitchModeActive && adminMenuOpen) ? GLITCH_ADMIN_PENALTIES : null;
    
    if (glitchSuperBossCooldown > 0) {
        glitchSuperBossCooldown--;
    }

    let superBossesThisCycle = 0;
    for (let i = 0; i < enemiesPerCycle; i++) {
        let entry = pickGlitchHordeEntry();
        if (entry.type === 'superBoss' && (glitchSuperBossCooldown > 0 || superBossesThisCycle >= 1)) {
            let retries = 0;
            while (retries < 5 && entry.type === 'superBoss') {
                entry = pickGlitchHordeEntry();
                retries++;
            }
        }

        const { type, healthMult = 1.3, speedMult = 1.05, valueMult = 2.2 } = entry;
        const enemy = new Enemy(path, type);
        enemy.health *= healthMult * (adminPenalty ? adminPenalty.healthMult : 1);
        enemy.maxHealth = enemy.health;
        enemy.speed *= speedMult * (adminPenalty ? adminPenalty.speedMult : 1);
        enemy.value *= valueMult;
        enemy.glitch = true;
        enemies.push(enemy);

        if (type === 'superBoss') {
            superBossesThisCycle++;
            glitchSuperBossCooldown = 4;
        }
    }
}

function getGlitchFooterText() {
    if (!glitchFooterState.active) return '';
    const messages = glitchBossPhaseActive && glitchBossFooterMessages.length
        ? glitchBossFooterMessages
        : GLITCH_MESSAGES;
    if (!messages.length) return '';
    const currentMessage = messages[glitchFooterState.messageIndex % messages.length];
    const count = Math.min(glitchFooterState.revealed, currentMessage.length);
    return currentMessage.slice(0, count);
}

function startGlitchBossPhase() {
    if (glitchBossPhaseActive) return;
    if (glitchBossTimerId) {
        clearTimeout(glitchBossTimerId);
        glitchBossTimerId = null;
    }
    clearGlitchTimeouts();
    cancelGlitchBossSupport();
    glitchBossIntroDisplayed = true;
    glitchBossPhaseActive = true;
    glitchBossFooterMessages = [...GLITCH_BOSS_FOOTER_SPAM];
    arenaChaosLevel = 0;
    stopGlitchHordeMusic();
    playGlitchBossMusic();
    if (adminMenuOpen) {
        displayGlitchMessage(GLITCH_ADMIN_PENALTIES.message, () => {
            runGlitchBossIntro(() => spawnBosses());
        });
    } else {
        runGlitchBossIntro(() => spawnBosses());
    }
    
    function spawnBosses() {
        if (!glitchModeActive) return;
        spawnBossEnemy('bluelol', {
            maxHealth: 300000,
            value: 1000000,
            speedMult: 0.5,
            scale: 1.2,
            ability: 'blink'
        });
        scheduleGlitchTimeout(() => {
            if (!glitchModeActive || !glitchBossPhaseActive) return;
            spawnBossEnemy('ButthurtAF', {
                maxHealth: 350000,
                value: 1250000,
                speedMult: 0.45,
                scale: 1.35,
                ability: 'shield'
            });
        }, 7000);
        scheduleGlitchTimeout(() => {
            if (!glitchModeActive || !glitchBossPhaseActive) return;
            startGlitchBossSupport();
        }, 4200);
        scheduleGlitchTimeout(() => {
            if (!glitchModeActive || !glitchBossPhaseActive) return;
            escalateArenaChaos();
        }, 2000);
    }
}

function runGlitchBossIntro(done) {
    const messages = [
        "MAN IDK WTF TO PUT HERE",
        "NEW SIGNATURES DETECTED",
        "bluelol AND ButthurtAF HAVE ENTERED THE ARENA",
        "SURVIVE THIS AND THE CLUSTER CLEARS"
    ];
    let i = 0;
    const next = () => {
        if (i >= messages.length) {
            done?.();
            return;
        }
        displayGlitchMessage(messages[i], () => {
            scheduleGlitchTimeout(() => {
                if (!glitchModeActive) return;
                i++;
                next();
            }, 1100);
        });
    };
    next();
}

function spawnBossEnemy(type, overrides = {}) {
    const enemy = new Enemy(path, type);
    enemy.maxHealth = overrides.maxHealth ?? 60000;
    enemy.health = enemy.maxHealth;
    enemy.value = overrides.value ?? GLITCH_BOSS_VALUE;
    enemy.speed *= overrides.speedMult ?? 0.7;
    enemy.baseSpeed = enemy.speed;
    enemy.scale = overrides.scale ?? 1;
    enemy.glitch = true;
    if (overrides.ability) enemy.glitchAbility = overrides.ability;
    enemy.update = (function(originalUpdate) {
        return function enhancedUpdate(deltaMult = 1) {
            if (this.glitchAbility === 'blink' && Math.random() < 0.0025) {
                this.pathProgress += 120 * deltaMult;
                addGlitchShake(18);
            }
            if (this.glitchAbility === 'shield') {
                if (!this.nextShieldPulse || Date.now() >= this.nextShieldPulse) {
                    this.nextShieldPulse = Date.now() + 5500;
                    emitBossPulse(this, 220);
                }
            }
            return originalUpdate.call(this, deltaMult * 0.85);
        };
    })(enemy.update.bind(enemy));
    enemy.onBossDeath = () => handleBossDefeat(enemy);
    enemies.push(enemy);
    glitchBossEnemies.add(enemy);
}

function handleBossDefeat(enemy) {
    glitchBossEnemies.delete(enemy);
    if (glitchBossEnemies.size === 0) {
        triggerGlitchBossDefeat();
    }
}

function triggerGlitchBossDefeat() {
    if (!glitchModeActive) return;
    displayGlitchMessage("YOU ENDURED THE CLUSTER.", () => {
        displayGlitchMessage("CONGRATULATIONS, SURVIVOR.", () => finishGlitchMode());
    });
    stopGlitchBossMusic();
    playGlitchHordeMusic();
    glitchBossPhaseActive = false;
    cancelGlitchBossSupport();
    arenaChaosLevel = 0;
}

function finishGlitchMode() {
    glitchModeActive = false;
    restoreGlitchWaveState();
    resetGlitchState();
}

function restoreGlitchWaveState() {
    if (!glitchStoredWaveState) return;
    waveInProgress = glitchStoredWaveState.waveInProgress;
    enemiesSpawned = glitchStoredWaveState.enemiesSpawned;
    waveQueue = [...(glitchStoredWaveState.waveQueue || [])];
    waveQueueIndex = glitchStoredWaveState.waveQueueIndex || 0;
    enemiesPerWave = glitchStoredWaveState.enemiesPerWave || enemiesPerWave;
    waveEndTime = glitchStoredWaveState.waveEndTime ?? waveEndTime;
    glitchStoredWaveState = null;
}

function playGlitchBossMusic() {
    glitchBossMusic = glitchBossMusic || document.getElementById('glitchBossMusic');
    if (!glitchBossMusic) return;
    glitchBossMusic.currentTime = 0;
    glitchBossMusic.play().catch(err => console.warn('Boss music play failed', err));
}

function stopGlitchBossMusic() {
    if (glitchBossMusic) {
        glitchBossMusic.pause();
        glitchBossMusic.currentTime = 0;
    }
}

function stopGlitchHordeMusic() {
    if (!glitchHiddenMusic) return;
    glitchHiddenMusic.pause();
    glitchHiddenMusic.currentTime = 0;
    glitchHiddenMusic.removeEventListener('ended', handleGlitchHiddenEnded);
}

function addGlitchFlash(x, y, duration, startTime, isBossPhase = false) {
    const flash = {
        x: x,
        y: y,
        duration: duration,
        startTime: startTime,
        isBossPhase: isBossPhase,
        update() {
            const elapsed = Date.now() - this.startTime;
            return elapsed < this.duration;
        },
        draw(ctx) {
            const elapsed = Date.now() - this.startTime;
            const progress = elapsed / this.duration;
            const alpha = Math.max(0, 1 - progress);
            
            ctx.save();
            
            // Choose random glitch effect type for boss phase
            if (this.isBossPhase) {
                const effectType = Math.floor(Math.random() * 6);
                
                switch(effectType) {
                    case 0: // RGB Channel Separation
                        this.drawRGBGlitch(ctx, alpha, progress);
                        break;
                    case 1: // Screen Tearing
                        this.drawScreenTear(ctx, alpha, progress);
                        break;
                    case 2: // Data Corruption Blocks
                        this.drawCorruptionBlocks(ctx, alpha, progress);
                        break;
                    case 3: // Digital Noise
                        this.drawDigitalNoise(ctx, alpha, progress);
                        break;
                    case 4: // Glitch Waves
                        this.drawGlitchWave(ctx, alpha, progress);
                        break;
                    case 5: // Text Artifacts
                        this.drawTextArtifacts(ctx, alpha, progress);
                        break;
                }
            } else {
                // Regular glitch circles for normal mode
                const baseSize = 20;
                const sizeVariation = 30;
                const size = baseSize + progress * sizeVariation;
                
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        },
        
        drawRGBGlitch(ctx, alpha, progress) {
            // RGB channel separation effect - toned down
            const offset = (Math.random() - 0.5) * 12 * (1 - progress);
            const size = 50 + Math.random() * 40;
            
            // Red channel
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x - size/2 + offset, this.y - size/2, size, size);
            
            // Green channel
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(this.x - size/2 - offset * 0.5, this.y - size/2 + offset * 0.3, size, size);
            
            // Blue channel
            ctx.fillStyle = '#0000FF';
            ctx.fillRect(this.x - size/2 + offset * 0.7, this.y - size/2 - offset * 0.6, size, size);
        },
        
        drawScreenTear(ctx, alpha, progress) {
            // Screen tearing effect - toned down
            const tearCount = 2 + Math.floor(Math.random() * 2);
            const tearHeight = 1 + Math.random() * 2;
            
            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
            
            for (let i = 0; i < tearCount; i++) {
                const tearY = this.y - 25 + Math.random() * 50;
                const tearWidth = 60 + Math.random() * 80;
                const offset = (Math.random() - 0.5) * 20 * (1 - progress);
                
                // Main tear line
                ctx.fillRect(this.x - tearWidth/2 + offset, tearY, tearWidth, tearHeight);
            }
        },
        
        drawCorruptionBlocks(ctx, alpha, progress) {
            // Data corruption block effect - toned down
            const blockCount = 3 + Math.floor(Math.random() * 3);
            
            ctx.globalAlpha = alpha * 0.5;
            
            for (let i = 0; i < blockCount; i++) {
                const blockSize = 6 + Math.random() * 10;
                const blockX = this.x - 30 + Math.random() * 60;
                const blockY = this.y - 30 + Math.random() * 60;
                
                // Random corrupted colors
                const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0080', '#80FF00'];
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                
                // Block with slight rotation for corruption effect
                ctx.save();
                ctx.translate(blockX, blockY);
                ctx.rotate((Math.random() - 0.5) * 0.2);
                ctx.fillRect(-blockSize/2, -blockSize/2, blockSize, blockSize);
                ctx.restore();
                
                // Add some "corrupted" pixels around the block - less frequent
                if (Math.random() < 0.2) {
                    ctx.fillStyle = '#FFFFFF';
                    const pixelCount = 2 + Math.floor(Math.random() * 3);
                    for (let p = 0; p < pixelCount; p++) {
                        const pixelX = blockX - blockSize + Math.random() * (blockSize * 2);
                        const pixelY = blockY - blockSize + Math.random() * (blockSize * 2);
                        ctx.fillRect(pixelX, pixelY, 1, 1);
                    }
                }
            }
        },
        
        drawDigitalNoise(ctx, alpha, progress) {
            // Digital noise/static effect - toned down
            const noiseSize = 1;
            const noiseArea = 40 + Math.random() * 30;
            
            ctx.globalAlpha = alpha * 0.3;
            
            // Less dense noise
            for (let x = this.x - noiseArea/2; x < this.x + noiseArea/2; x += noiseSize * 2) {
                for (let y = this.y - noiseArea/2; y < this.y + noiseArea/2; y += noiseSize * 2) {
                    if (Math.random() < 0.15) {
                        ctx.fillStyle = Math.random() < 0.5 ? '#FFFFFF' : '#000000';
                        ctx.fillRect(x, y, noiseSize, noiseSize);
                    }
                }
            }
            
            // Add some colored noise for extra effect - less frequent
            if (Math.random() < 0.2) {
                ctx.globalAlpha = alpha * 0.2;
                for (let i = 0; i < 8; i++) {
                    const noiseX = this.x - noiseArea/2 + Math.random() * noiseArea;
                    const noiseY = this.y - noiseArea/2 + Math.random() * noiseArea;
                    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
                    ctx.fillRect(noiseX, noiseY, 1, 1);
                }
            }
        },
        
        drawGlitchWave(ctx, alpha, progress) {
            // Rippling glitch wave effect - toned down
            const waveCount = 1 + Math.floor(Math.random() * 2);
            const waveLength = 50 + Math.random() * 40;
            
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
            ctx.lineWidth = 1 + Math.random() * 1;
            
            for (let w = 0; w < waveCount; w++) {
                ctx.beginPath();
                const startY = this.y - waveLength/2 + (w * waveLength / waveCount);
                const amplitude = 6 + Math.random() * 12;
                const frequency = 0.08 + Math.random() * 0.08;
                
                ctx.moveTo(this.x - waveLength/2, startY);
                for (let x = -waveLength/2; x <= waveLength/2; x += 8) {
                    const y = startY + Math.sin(x * frequency + progress * 6) * amplitude;
                    ctx.lineTo(this.x + x, y);
                }
                ctx.stroke();
            }
        },
        
        drawTextArtifacts(ctx, alpha, progress) {
            // Random text/character artifacts - toned down
            const charCount = 3 + Math.floor(Math.random() * 3);
            const glitchChars = '░▒▓█▀▄▌▐■□▪▫▬▭▮▯▰▱▲▼◄►◆◇◈◉◊○◌◍◎●◐◑◒◓◔◕◖◗◘◙◚◛◜◝◞◟◠◡◢◣◤◥◦◧◨◩◪◫◬◭◮◯◰◱◲◳◴◵◶◷◸◹◺◻◼◽◾◿';
            
            ctx.globalAlpha = alpha * 0.6;
            ctx.font = `${10 + Math.random() * 12}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (let i = 0; i < charCount; i++) {
                const charX = this.x - 25 + Math.random() * 50;
                const charY = this.y - 25 + Math.random() * 50;
                const char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                
                // Random color with moderate saturation
                ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, ${45 + Math.random() * 20}%)`;
                ctx.fillText(char, charX, charY);
                
                // Sometimes add a shadow/glow effect - less frequent
                if (Math.random() < 0.15) {
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 3 + Math.random() * 5;
                    ctx.fillText(char, charX, charY);
                    ctx.shadowBlur = 0;
                }
            }
        }
    };
    animationSystem.add(flash);
}

function addScreenWideFlash(now) {
    const flash = {
        startTime: now,
        duration: 200 + Math.random() * 300,
        update() {
            const elapsed = Date.now() - this.startTime;
            return elapsed < this.duration;
        },
        draw(ctx) {
            const elapsed = Date.now() - this.startTime;
            const progress = elapsed / this.duration;
            const alpha = Math.max(0, (1 - progress) * 0.4);
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${20 + Math.random() * 30}%)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    };
    animationSystem.add(flash);
}

function cancelGlitchBossSupport() {
    if (glitchBossSupportTimerId) {
        clearTimeout(glitchBossSupportTimerId);
        glitchBossSupportTimerId = null;
    }
    if (glitchBossFlashTimerId) {
        glitchBossFlashTimerId = null;
    }
}

function startGlitchBossSupport() {
    if (!glitchModeActive || !glitchBossPhaseActive) return;
    const supportTypes = ['normal', 'fast', 'tank', 'berserker'];
    glitchBossSupportTimerId = scheduleGlitchTimeout(() => {
        if (!glitchModeActive || !glitchBossPhaseActive) return;
        const type = supportTypes[Math.floor(Math.random() * supportTypes.length)];
        const enemy = new Enemy(path, type);
        enemy.health *= 1.5;
        enemy.maxHealth = enemy.health;
        enemy.speed *= 1.2;
        enemy.value *= 2;
        enemy.glitch = true;
        enemies.push(enemy);
        startGlitchBossSupport();
    }, 2500 + Math.random() * 3000);
}

function escalateArenaChaos() {
    arenaChaosLevel++;
    if (arenaChaosLevel > 5) arenaChaosLevel = 5;
    if (glitchBossPhaseActive) {
        glitchBossFooterMessages = [...GLITCH_BOSS_FOOTER_SPAM].sort(() => Math.random() - 0.5);
        startGlitchFooterSequence();
    }
}

function addArenaFlashBurst(now, isBossPhase = false) {
    const burstCount = isBossPhase ? 3 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 10);
    const duration = isBossPhase ? 400 + Math.random() * 300 : 200 + Math.random() * 400;
    
    for (let i = 0; i < burstCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        addGlitchFlash(x, y, duration, now, isBossPhase);
    }
    
    // Less violent shake during boss phase
    addGlitchShake(isBossPhase ? 8 + Math.random() * 8 : 12);
    
    // Less frequent screen-wide flash effects
    if (isBossPhase && Math.random() < 0.15) {
        addScreenWideFlash(now);
    }
}

function emitBossPulse(boss, radius) {
    for (const enemy of enemies) {
        if (enemy === boss) continue;
        const dx = enemy.x - boss.x;
        const dy = enemy.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
            enemy.jammedUntil = Date.now() + 3000;
        }
    }
    addArenaFlashBurst(Date.now());
}
const PERFORMANCE = {
    quality: 'high', // 'low', 'medium', 'high'
    maxParticles: 100,
    maxBullets: 200,
    useShadows: true,
    useGlow: true,
    animationQuality: 'high',
    
    // Auto-adjust based on quality
    setQuality(level) {
        this.quality = level;
        switch(level) {
            case 'low':
                this.maxParticles = 30;
                this.maxBullets = 100;
                this.useShadows = false;
                this.useGlow = false;
                this.animationQuality = 'low';
                break;
            case 'medium':
                this.maxParticles = 60;
                this.maxBullets = 150;
                this.useShadows = false;
                this.useGlow = true;
                this.animationQuality = 'medium';
                break;
            case 'high':
            default:
                this.maxParticles = 100;
                this.maxBullets = 200;
                this.useShadows = true;
                this.useGlow = true;
                this.animationQuality = 'high';
                break;
        }
    }
};

class ObjectPool {
    constructor(createFn, resetFn, initialSize = 50) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        // Pre-allocate objects
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    get(...args) {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.resetFn(obj, ...args);
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.pool.push(obj);
        }
    }
    
    getActive() {
        return this.active;
    }
    
    clear() {
        this.pool = this.pool.concat(this.active);
        this.active = [];
    }
}

// Optimization: Helper functions for conditional effects
function setShadow(ctx, color, blur, offsetX = 0, offsetY = 0) {
    if (PERFORMANCE.useShadows) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
    }
}

function clearShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function setGlow(ctx, color, blur) {
    if (PERFORMANCE.useGlow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
    }
}

let waveStreak = 0;
let lives = 100;

// Wave completion animation
class WaveCompletionEffect {
  constructor() {
    this.progress = 0;
    this.active = false;
    this.startTime = 0;
    this.duration = 3000;
    this.arrowSize = 30;
    this.pulseSpeed = 0.005;
  }

  start() {
    this.active = true;
    this.progress = 0;
    this.startTime = Date.now();
  }

  update() {
    if (!this.active) return;
    
    const elapsed = Date.now() - this.startTime;
    this.progress = elapsed / this.duration;
    
    if (this.progress >= 1) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    // Calculate position along path
    const pathProgress = Math.min(1, (Date.now() - this.startTime) / this.duration);
    const currentSegment = path[0];
    const point = currentSegment.getPointAt(pathProgress);

    // Draw pulsing arrow
    ctx.save();
    ctx.translate(point.x, point.y);
    
    // Make arrow point in direction of path
    const nextPoint = currentSegment.getPointAt(Math.min(1, pathProgress + 0.1));
    const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
    ctx.rotate(angle);

    // Pulse size and opacity
    const pulsePhase = Date.now() * this.pulseSpeed;
    const scale = 1 + Math.sin(pulsePhase) * 0.2;
    const opacity = Math.max(0, 1 - this.progress);
    
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "#4FC3F7";
    ctx.beginPath();
    ctx.moveTo(this.arrowSize * scale, 0);
    ctx.lineTo(-this.arrowSize * scale * 0.5, this.arrowSize * scale * 0.5);
    ctx.lineTo(-this.arrowSize * scale * 0.5, -this.arrowSize * scale * 0.5);
    ctx.closePath();
    ctx.fill();

    // Add glow effect
    ctx.shadowColor = "#4FC3F7";
    ctx.shadowBlur = 15;
    ctx.fill();
    
    ctx.restore();
  }
}

// Initialize wave completion effect
const waveCompletionEffect = new WaveCompletionEffect();

// Cash system for managing player's money
const cashSystem = {
  cash: 600,
  getCash() {
    return this.cash;
  },
  addCash(amount) {
    // Apply double cash modifier if enabled
    const bonus = (typeof modifiers !== 'undefined' && modifiers.doubleCash && modifiers.doubleCash.active) ? 2 : 1;
    this.cash += parseInt(amount * bonus);
    updateCashDisplay();
  },
  spendCash(amount) {
    if (this.cash >= amount) {
      this.cash -= amount;
      updateCashDisplay();
      return true;
    }
    return false;
  },
  subtractCash(amount) {
    this.cash -= amount;
    updateCashDisplay();
  },
  setCash(amount) {
    this.cash = amount;
    updateCashDisplay();
  }
};

// Cash animation class for small popup text (enemy kills, etc)
class CashAnimation {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.opacity = 1;
    this.scale = 1;
    this.lifetime = 1000; // Reduced from 1500 for better performance
    this.startTime = Date.now();
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const progress = elapsed / this.lifetime;
    
    this.y -= 1.5; // Float upward
    this.opacity = Math.max(0, 1 - progress);
    this.scale = 1 + progress * 0.3;
    
    return progress < 1;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    // OPTIMIZED: Only add glow on high performance
    if (PERFORMANCE.useGlow) {
        setGlow(ctx, '#FFD700', 8 * this.opacity);
    }
    
    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${Math.floor(18 * this.scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // OPTIMIZED: Single stroke instead of separate stroke+fill
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    
    clearShadow(ctx);
    ctx.restore();
  }
}

// Wave Completion Notification
class WaveCompletionNotification {
  constructor(waveNum, bonuses, isSkipped = false) {
    this.waveNum = waveNum;
    this.bonuses = bonuses;
    this.isSkipped = isSkipped;
    this.opacity = 0;
    this.scale = 0.5;
    this.lifetime = 1800; // Reduced from 2500 for better performance
    this.startTime = Date.now();
    this.baseY = canvas.height / 2 - 80;
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const progress = elapsed / this.lifetime;
    
    if (progress < 0.2) {
      // Pop in
      const intro = progress / 0.2;
      const eased = 1 - Math.pow(1 - intro, 3); // Ease out cubic
      this.opacity = eased;
      this.scale = 0.5 + (eased * 0.5);
    } else if (progress > 0.8) {
      // Fade out
      const outro = (progress - 0.8) / 0.2;
      this.opacity = 1 - outro;
    } else {
      this.opacity = 1;
      this.scale = 1;
    }
    
    return progress < 1;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    const centerX = canvas.width / 2;
    let y = this.baseY;
    
    // OPTIMIZED: Main title with conditional glow
    const mainColor = this.isSkipped ? '#FF5252' : '#4CAF50';
    const glowColor = this.isSkipped ? '#FF9800' : '#8BC34A';
    
    if (PERFORMANCE.useGlow) {
        setGlow(ctx, glowColor, 15 * this.scale);
    }
    ctx.fillStyle = mainColor;
    ctx.font = `bold ${Math.floor(48 * this.scale)}px Arial`;
    ctx.textAlign = 'center';
    
    // OPTIMIZED: Thinner outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 3;
    
    const title = this.isSkipped ? 'WAVE SKIPPED' : 'WAVE CLEARED';
    ctx.strokeText(title, centerX, y);
    ctx.fillText(title, centerX, y);
    clearShadow(ctx);
    
    y += 50;
    
    // Wave number
    ctx.font = `${Math.floor(18 * this.scale)}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeText(`Wave ${this.waveNum - 1}`, centerX, y);
    ctx.fillText(`Wave ${this.waveNum - 1}`, centerX, y);
    
    y += 40;
    
    // Bonuses
    if (PERFORMANCE.useGlow) {
        setGlow(ctx, '#FFD700', 10 * this.scale);
    }
    ctx.font = `bold ${Math.floor(32 * this.scale)}px Arial`;
    ctx.fillStyle = glitchModeActive ? '#ff94ff' : '#FFD700';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 3;
    
    const totalBonus = this.bonuses.waveBonus + (this.isSkipped ? 0 : this.bonuses.clearBonus);
    const bonusText = `+$${totalBonus}`;
    ctx.strokeText(bonusText, centerX, y);
    ctx.fillText(bonusText, centerX, y);
    clearShadow(ctx);
    
    // Streak indicator
    if (this.bonuses.streak > 1 && !glitchModeActive) {
      y += 35;
      ctx.font = `bold ${Math.floor(22 * this.scale)}px Arial`;
      ctx.fillStyle = '#cfd8dc';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 2;
      const streakText = `🔥 ${this.bonuses.streak}x STREAK`;
      ctx.strokeText(streakText, centerX, y);
      ctx.fillText(streakText, centerX, y);
    }
    
    ctx.restore();
  }
}

// Animation system for managing multiple animations (OPTIMIZED)
const animationSystem = {
  animations: [],
  
  add(animation) {
    // Performance: Limit max particles
    if (this.animations.length >= PERFORMANCE.maxParticles) {
      this.animations.shift(); // Remove oldest
    }
    this.animations.push(animation);
  },
  
  update() {
    // Optimization: Use for loop instead of filter for better performance
    for (let i = this.animations.length - 1; i >= 0; i--) {
      if (!this.animations[i].update()) {
        this.animations.splice(i, 1);
      }
    }
  },
  
  draw(ctx) {
    // Optimization: Direct loop is faster than forEach
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].draw(ctx);
    }
  }
};

function createCashAnimation(x, y, text) {
  animationSystem.add(new CashAnimation(x, y, text));
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;
let lastFrameTime = Date.now();

// Game Variables
let gameOver = false;
let gamePaused = false; // Pause when tab is not visible
let pauseStartTime = 0; // When pause started
let totalPausedTime = 0; // Total time spent paused
let wave = 1;
let health = 100;
let towers = [];
let enemies = [];
let bullets = [];
let lastEnemySpawn = 0;
let enemySpawnInterval = 1000;
let selectedTowerType = null;
let enemiesSpawned = 0;
let enemiesPerWave = 10;
let waveInProgress = false;
let placingTower = false;
let previewTower = null;
let selectedTower = null;
let gameStarted = false;

// Snap to grid system
let snapToGridEnabled = false;
const GRID_SIZE = 40; // Size of each grid cell in pixels
let countdownTime = 3;
let lastCountdownUpdate = 0;
let waveCashBonus = 500 * Math.pow(1.1, wave - 1);
let waveGracePeriod = 3000;
let lastCashAmount = 0;
let cashGlowIntensity = 0;
// Deterministic wave spawning
let waveQueue = [];
let waveQueueIndex = 0;

// Intermission/wave timer state
let intermissionActive = false;
let intermissionEndTime = 0;
let intermissionDurationMs = 3000; // 3s intermission between waves
let intermissionLastSecond = 0;
let intermissionBounceStart = 0;
let waveStartTime = 0;
let hudButtons = { skip: null };
let streakDisabledThisWave = false;
let waveDurationMs = 50000; // 50s wave duration
let waveEndTime = 0;
let waveSkippedThisWave = false;

// Skip Wave UI Class
class SkipWaveUI {
  constructor() {
    this.visible = false;
    this.animProgress = 0;
    this.dismissedUntil = 0;
    this.bounds = null;
    this.buttons = {
      skip: null,
      cancel: null,
      close: null
    };
    
    // UI dimensions
    this.width = 340;
    this.height = 150;
    this.animSpeed = 0.15;
  }
  
  shouldShow(waveInProgress, timeRemaining) {
    if (!waveInProgress) return false;
    const secondsRemaining = Math.ceil(timeRemaining / 1000);
    const notDismissed = Date.now() >= this.dismissedUntil;
    return secondsRemaining <= 35 && notDismissed;
  }
  
  update(waveInProgress, timeRemaining) {
    this.visible = this.shouldShow(waveInProgress, timeRemaining);
    
    // Smooth animation
    const target = this.visible ? 1 : 0;
    this.animProgress += (target - this.animProgress) * this.animSpeed;
    
    // Cleanup when fully hidden
    if (this.animProgress < 0.01) {
      this.bounds = null;
      this.buttons = { skip: null, cancel: null, close: null };
    }
  }
  
  isVisible() {
    return this.animProgress > 0.02;
  }
  
  dismiss() {
    this.visible = false;
    this.dismissedUntil = Date.now() + 999999; // Don't show again this wave
  }
  
  dismissTemporary(durationMs = 3000) {
    this.visible = false;
    this.dismissedUntil = Date.now() + durationMs;
  }
  
  reset() {
    this.dismissedUntil = 0;
    this.visible = false;
  }
  
  close() {
    this.visible = false;
    this.dismissedUntil = Date.now() + 999999; // Don't reopen this wave
  }
  
  isPointInButton(x, y, btn) {
    if (!btn) return false;
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }
  
  handleClick(x, y) {
    if (!this.isVisible()) return false;
    
    // Check close button - permanently dismiss this wave
    if (this.isPointInButton(x, y, this.buttons.close)) {
      this.dismiss();
      return true;
    }
    
    // Check skip button
    if (this.isPointInButton(x, y, this.buttons.skip)) {
      skipWave();
      return true;
    }
    
    // Check cancel button - permanently dismiss this wave
    if (this.isPointInButton(x, y, this.buttons.cancel)) {
      this.dismiss();
      return true;
    }
    
    // Check if clicked outside panel - temporarily dismiss (allows re-showing after 3s)
    if (this.bounds) {
      const inBounds = x >= this.bounds.x && x <= this.bounds.x + this.bounds.w &&
                      y >= this.bounds.y && y <= this.bounds.y + this.bounds.h;
      if (!inBounds) {
        this.dismissTemporary(3000);
        return false; // Let other handlers process
      }
    }
    
    return true; // Clicked inside panel
  }
  
  draw(ctx, panelX, panelY, panelW, panelH) {
    if (!this.isVisible()) return;
    
    ctx.save();
    
    // Calculate position (centered below main HUD panel)
    const centerX = panelX + panelW / 2;
    const baseY = panelY + panelH + 12;
    const slideOffset = (1 - this.animProgress) * -this.height;
    const finalY = baseY + slideOffset;
    const finalX = centerX - this.width / 2;
    
    // Apply fade
    ctx.globalAlpha = this.animProgress;
    
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    
    // Main panel background
    ctx.fillStyle = 'rgba(20, 20, 26, 0.98)';
    this.roundRect(ctx, finalX, finalY, this.width, this.height, 12);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Header with warning stripe
    const headerHeight = 38;
    ctx.fillStyle = 'rgba(244, 67, 54, 0.2)';
    ctx.beginPath();
    this.roundRectPath(ctx, finalX, finalY, this.width, headerHeight, 12, true, false);
    ctx.fill();
    
    // Warning icon
    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⚠', finalX + 16, finalY + 26);
    
    // Header text
    ctx.fillStyle = glitchModeActive ? '#ffb7ff' : '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Skip Current Wave?', finalX + 42, finalY + 26);
    
    // Close button (X)
    const closeX = finalX + this.width - 32;
    const closeY = finalY + 12;
    const closeSize = 16;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(closeX, closeY);
    ctx.lineTo(closeX + closeSize, closeY + closeSize);
    ctx.moveTo(closeX + closeSize, closeY);
    ctx.lineTo(closeX, closeY + closeSize);
    ctx.stroke();
    this.buttons.close = { x: closeX - 8, y: closeY - 8, w: closeSize + 16, h: closeSize + 16 };
    
    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(finalX + 12, finalY + headerHeight);
    ctx.lineTo(finalX + this.width - 12, finalY + headerHeight);
    ctx.stroke();
    
    // Warning messages
    const msgY = finalY + headerHeight + 20;
    ctx.fillStyle = glitchModeActive ? '#e4c2ff' : '#B0C4DE';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('• You will lose your current streak', finalX + 20, msgY);
    ctx.fillText('• You will NOT receive the Clear Bonus', finalX + 20, msgY + 20);
    ctx.fillText('• Wave Bonus will still be awarded', finalX + 20, msgY + 40);
    
    // Buttons
    const btnY = finalY + this.height - 42;
    const btnHeight = 34;
    const btnSpacing = 12;
    const btnWidth = (this.width - btnSpacing * 3) / 2;
    
    // Skip button (red)
    const skipX = finalX + btnSpacing;
    ctx.fillStyle = '#EF5350';
    this.roundRect(ctx, skipX, btnY, btnWidth, btnHeight, 8);
    ctx.fill();
    ctx.fillStyle = glitchModeActive ? '#ffe9ff' : '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Skip Wave', skipX + btnWidth / 2, btnY + btnHeight / 2 + 4);
    this.buttons.skip = { x: skipX, y: btnY, w: btnWidth, h: btnHeight };
    
    // Cancel button (gray)
    const cancelX = finalX + btnSpacing + btnWidth + btnSpacing;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    this.roundRect(ctx, cancelX, btnY, btnWidth, btnHeight, 8);
    ctx.fill();
    
    // Cancel button border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, cancelX, btnY, btnWidth, btnHeight, 8);
    ctx.stroke();
    
    ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#ffffff';
    ctx.fillText('Keep Fighting', cancelX + btnWidth / 2, btnY + btnHeight / 2 + 4);
    this.buttons.cancel = { x: cancelX, y: btnY, w: btnWidth, h: btnHeight };
    
    // Store bounds for click detection
    this.bounds = { x: finalX, y: finalY, w: this.width, h: this.height };
    
    ctx.restore();
  }
  
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, w, h, r);
  }
  
  roundRectPath(ctx, x, y, w, h, r, topOnly = false, bottomOnly = false) {
    const tl = topOnly || (!bottomOnly);
    const tr = topOnly || (!bottomOnly);
    const bl = bottomOnly || (!topOnly);
    const br = bottomOnly || (!topOnly);
    
    ctx.moveTo(x + (tl ? r : 0), y);
    ctx.lineTo(x + w - (tr ? r : 0), y);
    if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - (br ? r : 0));
    if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + (bl ? r : 0), y + h);
    if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + (tl ? r : 0));
    if (tl) ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

// Initialize Skip Wave UI
let skipUI = new SkipWaveUI();

// New Upgrade Menu System
class ModernUpgradeMenu {
  constructor() {
    this.visible = false;
    this.tower = null;
    this.animProgress = 0;
    this.barAnimProgress = [0, 0, 0, 0];
    this.floatOffset = 0;
    this.glowPulse = 0;
    this.frameCount = 0;
  }

  show(tower) {
    this.tower = tower;
    this.visible = true;
    this.animProgress = 0;
    this.barAnimProgress = [0, 0, 0, 0];
  }

  hide() {
    this.visible = false;
    this.tower = null;
  }

  update() {
    if (this.visible && this.animProgress < 1) {
      this.animProgress += 0.12;
    } else if (!this.visible && this.animProgress > 0) {
      this.animProgress -= 0.15;
    }

    // Animate upgrade bars
    if (this.tower) {
      for (let i = 0; i < 4; i++) {
        const target = i < this.tower.level ? 1 : 0;
        this.barAnimProgress[i] += (target - this.barAnimProgress[i]) * 0.12;
      }
    }

    this.floatOffset += 0.02;
    this.glowPulse += 0.03;
    this.frameCount++;
  }

  draw(ctx) {
    if (this.animProgress <= 0 || !this.tower) return;

    const tower = this.tower;
    const menuWidth = 420;
    const menuHeight = 200;
    const menuX = (canvas.width - menuWidth) / 2;
    const baseY = canvas.height - 300;
    const floatAmount = Math.sin(this.floatOffset) * 2;
    const menuY = baseY + (1 - this.animProgress) * 40 + floatAmount;

    ctx.save();
    ctx.globalAlpha = this.animProgress;

    // Optimized: only glow on every other frame
    if (this.frameCount % 2 === 0) {
      ctx.save();
      const glowIntensity = 0.5 + Math.sin(this.glowPulse) * 0.15;
      ctx.shadowColor = 'rgba(127, 255, 0, ' + (glowIntensity * 0.5) + ')';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = 'transparent';
      roundRect(ctx, menuX, menuY, menuWidth, menuHeight, 14);
      ctx.stroke();
      ctx.restore();
    }

    // Main background with depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;
    const bgGrad = ctx.createLinearGradient(menuX, menuY, menuX, menuY + menuHeight);
    bgGrad.addColorStop(0, 'rgba(30, 30, 45, 0.98)');
    bgGrad.addColorStop(0.5, 'rgba(20, 20, 35, 0.98)');
    bgGrad.addColorStop(1, 'rgba(15, 15, 25, 0.98)');
    ctx.fillStyle = bgGrad;
    roundRect(ctx, menuX, menuY, menuWidth, menuHeight, 18);
    ctx.fill();
    
    // Inner highlight
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    const highlightGrad = ctx.createLinearGradient(menuX, menuY, menuX, menuY + 60);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGrad;
    roundRect(ctx, menuX, menuY, menuWidth, 50, 14);
    ctx.fill();
    
    // Animated border with pulse
    const borderPulse = 0.4 + Math.sin(this.glowPulse) * 0.3;
    ctx.shadowColor = `rgba(127, 255, 0, ${borderPulse})`;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = `rgba(127, 255, 0, ${borderPulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Tower preview box
    const boxSize = 75;
    const boxX = menuX + 12;
    const boxY = menuY + 12;
    
    // Box shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    const boxGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxSize);
    boxGrad.addColorStop(0, 'rgba(50, 50, 65, 0.9)');
    boxGrad.addColorStop(1, 'rgba(30, 30, 45, 0.9)');
    ctx.fillStyle = boxGrad;
    roundRect(ctx, boxX, boxY, boxSize, boxSize, 10);
    ctx.fill();
    
    // Box border with glow
    ctx.shadowColor = tower.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = tower.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = this.animProgress * 0.6;
    ctx.stroke();
    ctx.globalAlpha = this.animProgress;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw tower icon with glow (optimized)
    ctx.shadowColor = tower.color;
    ctx.shadowBlur = 15;
    const iconGrad = ctx.createRadialGradient(
      boxX + boxSize/2, boxY + boxSize/2, 0,
      boxX + boxSize/2, boxY + boxSize/2, boxSize * 0.7
    );
    const baseColor = tower.color;
    iconGrad.addColorStop(0, this.adjustBrightness(baseColor, 20));
    iconGrad.addColorStop(0.7, baseColor);
    iconGrad.addColorStop(1, this.adjustBrightness(baseColor, -40));
    ctx.fillStyle = iconGrad;
    const iconSize = 48;
    const iconX = boxX + (boxSize - iconSize)/2;
    const iconY = boxY + (boxSize - iconSize)/2;
    ctx.fillRect(iconX, iconY, iconSize, iconSize);
    
    // Icon shine effect
    ctx.shadowBlur = 0;
    const shineGrad = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGrad;
    ctx.fillRect(iconX, iconY, iconSize, iconSize);
    
    // Scan line (optimized - every 3 frames)
    if (this.frameCount % 3 === 0) {
      const scanY = iconY + (Date.now() % 2000) / 2000 * iconSize;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(iconX, scanY, iconSize, 2);
    }

    // Level display
    const levelX = boxX + boxSize + 18;
    ctx.shadowColor = 'rgba(127, 255, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#7FFF00';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv. ${tower.level}`, levelX, menuY + 32);
    ctx.shadowBlur = 0;

    // Level name
    const levelNames = ['■ NOVICE', '■■ TRAINED', '■■■ VETERAN', '■■■■ ELITE'];
    const levelName = levelNames[tower.level - 1] || '■■■■■ MAX';
    ctx.fillStyle = 'rgba(180, 180, 200, 0.9)';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(levelName, levelX, menuY + 48);

    // XP/Progress bar
    const barX = levelX;
    const barY = menuY + 60;
    const barWidth = 200;
    const barHeight = 20;
    
    // Bar background with inset shadow
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    roundRect(ctx, barX, barY, barWidth, barHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bar fill with gradient and animation
    const fillWidth = barWidth * (tower.level / tower.maxLevel);
    if (fillWidth > 0) {
      ctx.save();
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
      fillGrad.addColorStop(0, '#7FFF00');
      fillGrad.addColorStop(0.5, '#32CD32');
      fillGrad.addColorStop(1, '#228B22');
      ctx.fillStyle = fillGrad;
      
      // Clip for fill
      ctx.beginPath();
      pathRoundRect(ctx, barX, barY, fillWidth, barHeight, 8);
      ctx.clip();
      
      // Fill with gradient
      ctx.fillRect(barX, barY, fillWidth, barHeight);
      
      // Animated stripes (optimized)
      if (this.frameCount % 2 === 0) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        const stripeW = 8;
        const stripeGap = 16;
        const offset = (Date.now() * 0.06) % stripeGap;
        for (let x = barX - offset; x < barX + fillWidth + barHeight; x += stripeGap) {
          ctx.save();
          ctx.translate(x, barY);
          ctx.rotate(-Math.PI / 6);
          ctx.fillRect(0, 0, stripeW, barHeight * 2);
          ctx.restore();
        }
      }
      
      // Gloss effect
      const glossGrad = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = glossGrad;
      ctx.fillRect(barX, barY, fillWidth, barHeight);
      
      ctx.restore();
      
      // Outer glow with pulse
      ctx.save();
      const barGlowPulse = 0.4 + Math.sin(this.glowPulse * 1.2) * 0.2;
      ctx.shadowColor = '#7FFF00';
      ctx.shadowBlur = 20;
      ctx.globalAlpha = barGlowPulse;
      roundRect(ctx, barX, barY, fillWidth, barHeight, 8);
      ctx.restore();
      
      // Shimmer effect (reduced frequency)
      if (this.frameCount % 4 === 0) {
        const shimmerX = (Date.now() % 3000) / 3000 * fillWidth;
        const shimmerGrad = ctx.createLinearGradient(barX + shimmerX - 20, 0, barX + shimmerX + 20, 0);
        shimmerGrad.addColorStop(0, 'transparent');
        shimmerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        shimmerGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shimmerGrad;
        ctx.fillRect(barX, barY, fillWidth, barHeight);
      }
    }

    // Progress text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${tower.level} / ${tower.maxLevel}`, barX + barWidth/2, barY + barHeight/2 + 4);

    // Close button
    const closeSize = 22;
    const closeX = menuX + menuWidth - closeSize - 10;
    const closeY = menuY + 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    const closeGrad = ctx.createRadialGradient(closeX + closeSize/2, closeY + closeSize/2, 0, closeX + closeSize/2, closeY + closeSize/2, closeSize/2);
    closeGrad.addColorStop(0, 'rgba(244, 67, 54, 0.9)');
    closeGrad.addColorStop(1, 'rgba(198, 40, 40, 0.9)');
    ctx.fillStyle = closeGrad;
    roundRect(ctx, closeX, closeY, closeSize, closeSize, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✕', closeX + closeSize/2, closeY + closeSize/2 + 6);

    // Upgrade bars section
    const upgradeY = menuY + 95;
    const upgradeBarWidth = 85;
    const upgradeBarHeight = 10;
    const upgradeSpacing = 12;

    for (let i = 0; i < 4; i++) {
      const ux = menuX + 15 + i * (upgradeBarWidth + upgradeSpacing);
      
      // Bar background with depth
      ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
      roundRect(ctx, ux, upgradeY, upgradeBarWidth, upgradeBarHeight, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bar fill with animation and gradient
      if (this.barAnimProgress[i] > 0.01) {
        ctx.save();
        const fillW = upgradeBarWidth * this.barAnimProgress[i];
        
        if (i < tower.level) {
          // Completed bar - green gradient
          const barGrad = ctx.createLinearGradient(ux, upgradeY, ux + fillW, upgradeY);
          barGrad.addColorStop(0, '#7FFF00');
          barGrad.addColorStop(1, '#32CD32');
          ctx.fillStyle = barGrad;
        } else {
          // Incomplete bar - gray
          ctx.fillStyle = 'rgba(100, 100, 120, 0.4)';
        }
        
        ctx.beginPath();
        pathRoundRect(ctx, ux, upgradeY, fillW, upgradeBarHeight, 5);
        ctx.clip();
        ctx.fillRect(ux, upgradeY, fillW, upgradeBarHeight);
        
        // Gloss
        if (i < tower.level) {
          const barGloss = ctx.createLinearGradient(0, upgradeY, 0, upgradeY + upgradeBarHeight);
          barGloss.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
          barGloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = barGloss;
          ctx.fillRect(ux, upgradeY, fillW, upgradeBarHeight);
        }
        
        ctx.restore();
      }
    }

    // Description area
    const descY = upgradeY + 22;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    const descGrad = ctx.createLinearGradient(menuX, descY, menuX, descY + 70);
    descGrad.addColorStop(0, 'rgba(35, 35, 50, 0.85)');
    descGrad.addColorStop(1, 'rgba(25, 25, 40, 0.85)');
    ctx.fillStyle = descGrad;
    roundRect(ctx, menuX + 12, descY, menuWidth - 24, 70, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Border accent
    ctx.strokeStyle = 'rgba(127, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Show upgrade info
    ctx.fillStyle = '#e8e8e8';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    if (tower.level < tower.maxLevel) {
      const next = tower.getNextUpgrade();
      if (next) {
        ctx.fillText(`Next: ${next.name || 'Upgrade'}`, menuX + 20, descY + 18);
        
        // Stats
        ctx.fillStyle = '#b8b8c8';
        ctx.font = '11px Arial';
        ctx.fillText(`📏 Range: +${Math.round((next.range - 1) * 100)}%`, menuX + 20, descY + 36);
        ctx.fillText(`⚔️ Damage: +${Math.round((next.damage - 1) * 100)}%`, menuX + 20, descY + 50);
        
        // Upgrade button
        const btnX = menuX + menuWidth - 105;
        const btnY = descY + 20;
        const btnW = 90;
        const btnH = 32;
        const cost = tower.getUpgradeCost();
        const canAfford = cashSystem.getCash() >= cost;
        
        // Button shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        
        if (canAfford) {
          const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
          btnGrad.addColorStop(0, 'rgba(76, 175, 80, 1)');
          btnGrad.addColorStop(1, 'rgba(56, 142, 60, 1)');
          ctx.fillStyle = btnGrad;
        } else {
          ctx.fillStyle = 'rgba(70, 70, 80, 0.6)';
        }
        
        roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Button text
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UPGRADE', btnX + btnW/2, btnY + btnH/2 - 2);
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = canAfford ? '#FFD700' : '#999';
        ctx.fillText(`$${cost}`, btnX + btnW/2, btnY + btnH/2 + 12);
        ctx.shadowBlur = 0;
      }
    } else {
      // Max level display
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = glitchModeActive ? '#ff94ff' : '#FFD700';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 MAX LEVEL', menuX + menuWidth/2, descY + 36);
    }

    ctx.restore();
  }

  adjustBrightness(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  isPointInMenu(x, y) {
    if (!this.visible || this.animProgress < 0.5) return false;
    const menuWidth = 420;
    const menuHeight = 200;
    const menuX = (canvas.width - menuWidth) / 2;
    const menuY = canvas.height - 220;
    return x >= menuX && x <= menuX + menuWidth && y >= menuY && y <= menuY + menuHeight;
  }

  isPointInCloseButton(x, y) {
    if (!this.visible || this.animProgress < 0.5) return false;
    const menuWidth = 420;
    const menuX = (canvas.width - menuWidth) / 2;
    const menuY = canvas.height - 220;
    const closeSize = 22;
    const closeX = menuX + menuWidth - closeSize - 10;
    const closeY = menuY + 10;
    return x >= closeX && x <= closeX + closeSize && y >= closeY && y <= closeY + closeSize;
  }

  isPointInUpgradeButton(x, y) {
    if (!this.visible || this.animProgress < 0.5 || !this.tower) return false;
    const menuWidth = 420;
    const menuX = (canvas.width - menuWidth) / 2;
    const menuY = canvas.height - 220;
    const upgradeY = menuY + 95;
    const descY = upgradeY + 22;
    const btnX = menuX + menuWidth - 105;
    const btnY = descY + 20;
    const btnW = 90;
    const btnH = 32;
    return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
  }
}

let modernUpgradeMenu = new ModernUpgradeMenu();

let mouseX = 0;
let mouseY = 0;
let useModernUpgradeMenu = true; // Toggle for new upgrade menu

let cliffTiles = [];

// Admin menu state flag (avoid name collision with functions below)
let adminMenuOpen = false;

// UI state for health bar animations
let uiLivesDisplay = lives;
let uiHealthFlash = 0; // 0..1 damage flash intensity
let uiPulseT = 0;      // low health pulse timer
let uiLastLives = lives;
let uiFlashUntil = 0;  // timestamp until which red flash is visible
let uiShake = 0;       // shake intensity in pixels
const UI_SHAKE_DECAY = 0.86;

//let glitchUIShake = 0;
//let glitchUICycle = 0;

function addGlitchShake(intensity = 18) {
    glitchUIShake = Math.max(glitchUIShake, intensity);
}

function applyGlitchToValue(value, variance = 40) {
    if (!glitchModeActive) return value;
    const noise = (Math.random() - 0.5) * variance;
    return value + noise;
}

function drawGlitchText(ctx, text, x, y, options = {}) {
    ctx.save();
    const {
        baseColor = '#ff00ff',
        shadowColor = '#400040',
        font = 'bold 16px Arial',
        align = 'left'
    } = options;

    ctx.font = font;
    ctx.textAlign = align;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 12 + Math.sin(Date.now() * 0.04) * 6;

    ctx.fillStyle = baseColor;
    ctx.globalAlpha = 0.85 + Math.random() * 0.15;
    ctx.fillText(text, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);

    ctx.fillStyle = '#00ffff';
    ctx.globalAlpha = 0.4 + Math.random() * 0.3;
    ctx.fillText(text, x + 2 + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);

    ctx.fillStyle = '#ff0080';
    ctx.globalAlpha = 0.4 + Math.random() * 0.3;
    ctx.fillText(text, x - 2 + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);

    ctx.restore();
}

function drawGlitchBars(ctx, x, y, width, height) {
    ctx.save();
    const barCount = 6;
    for (let i = 0; i < barCount; i++) {
        const barY = y + (height / barCount) * i + Math.random() * 3;
        const barH = (height / barCount) * (0.4 + Math.random() * 0.6);
        const barW = width * (0.5 + Math.random() * 0.45);
        ctx.fillStyle = `rgba(${140 + Math.random() * 80}, 0, ${200 + Math.random() * 55}, ${0.2 + Math.random() * 0.2})`;
        ctx.fillRect(x + Math.random() * 10, barY, barW, barH);
    }
    ctx.restore();
}

function triggerScreenFlash() {
    if (!screenFlashEl) return;
    screenFlashEl.classList.remove('active');
    // Force reflow to restart animation
    // eslint-disable-next-line no-unused-expressions
    screenFlashEl.offsetWidth;
    screenFlashEl.classList.add('active');
}

function clearGlitchTimeouts() {
    glitchTimeouts.forEach(id => clearTimeout(id));
    glitchTimeouts = [];
}

function clearGlitchMessageTimeouts() {
    glitchMessageTimeouts.forEach(id => clearTimeout(id));
    glitchMessageTimeouts = [];
}

function scheduleGlitchMessageTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    glitchMessageTimeouts.push(id);
    return id;
}

function scheduleGlitchTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    glitchTimeouts.push(id);
    return id;
}

function clearGlitchFlash() {
    glitchFlashEntries = [];
    glitchFlashLookup.clear();
    glitchFlashLastPulse = 0;
}

function weightedPick(pool, count, excludeRefs) {
    const picks = [];
    const available = pool.filter(item => !excludeRefs.has(item.ref));
    while (picks.length < count && available.length) {
        let totalWeight = 0;
        for (const item of available) totalWeight += item.weight;
        let choice = Math.random() * totalWeight;
        let index = 0;
        for (let i = 0; i < available.length; i++) {
            choice -= available[i].weight;
            if (choice <= 0) {
                index = i;
                break;
            }
        }
        const [selected] = available.splice(index, 1);
        excludeRefs.add(selected.ref);
        picks.push(selected);
    }
    return picks;
}

function selectGlitchFlashTargets(count) {
    const baseCandidates = [];
    const allCandidates = [];

    trees.forEach(tree => {
        const entry = { ref: tree, type: 'tree', weight: 3 };
        allCandidates.push(entry);
        if (!glitchFlashLookup.has(tree)) {
            baseCandidates.push(entry);
        }
    });

    cliffTiles.forEach(cliff => {
        const entry = { ref: cliff, type: 'cliff', weight: 1.5 };
        allCandidates.push(entry);
        if (!glitchFlashLookup.has(cliff)) {
            baseCandidates.push(entry);
        }
    });

    const selections = [];
    const usedRefs = new Set();

    selections.push(...weightedPick(baseCandidates, count, usedRefs));

    if (selections.length < count) {
        const needed = count - selections.length;
        selections.push(...weightedPick(allCandidates, needed, usedRefs));
    }

    return selections;
}

function updateGlitchFlash(now = Date.now()) {
    if (!glitchModeActive) {
        if (glitchFlashEntries.length || glitchFlashLookup.size) {
            clearGlitchFlash();
        }
        return;
    }

    if (glitchBossPhaseActive) {
        if (!glitchBossFlashTimerId || now >= glitchBossFlashTimerId) {
            glitchBossFlashTimerId = now + 300; // Slower frequency
            addArenaFlashBurst(now, true);
        }
    }

    if (glitchFlashEntries.length) {
        const active = [];
        for (const entry of glitchFlashEntries) {
            if (entry.endTime > now) {
                active.push(entry);
            } else {
                glitchFlashLookup.delete(entry.ref);
            }
        }
        glitchFlashEntries = active;
    }

    if (now - glitchFlashLastPulse >= GLITCH_FLASH_INTERVAL) {
        glitchFlashLastPulse = now;
        const targetCount = glitchBossPhaseActive ? 8 : 5; // Fewer targets during boss phase
        const selections = selectGlitchFlashTargets(targetCount);
        selections.forEach(sel => {
            const entry = {
                ref: sel.ref,
                type: sel.type,
                color: glitchBossPhaseActive 
                    ? `hsl(${Math.floor(Math.random() * 360)}, ${70 + Math.random() * 20}%, ${40 + Math.random() * 30}%)`
                    : `hsl(${Math.floor(Math.random() * 360)}, 100%, ${45 + Math.random() * 20}%)`,
                endTime: now + (glitchBossPhaseActive ? GLITCH_FLASH_DURATION * 1.2 : GLITCH_FLASH_DURATION)
            };
            glitchFlashEntries.push(entry);
            glitchFlashLookup.set(sel.ref, entry);
        });
    }
}

function applyGlitchDarkness() {
    if (!glitchOverlayEl) return;
    glitchPersistentDark = true;
    glitchOverlayEl.classList.add('active');
    glitchOverlayEl.classList.add('dim');
    if (glitchTextContainerEl) {
        glitchTextContainerEl.innerHTML = '';
    }
}

function displayGlitchMessage(message, callback) {
    if (!glitchTextContainerEl) {
        if (callback) callback();
        return;
    }

    if (glitchOverlayEl) {
        glitchOverlayEl.classList.add('active');
        glitchOverlayEl.classList.remove('dim');
        glitchPersistentDark = false;
    }

    let displayed = Array(message.length).fill('');
    let charIndex = 0;

    glitchTextContainerEl.innerHTML = '';

    function resolveGlitch(index = 0) {
        if (index >= message.length) {
            if (callback) scheduleGlitchMessageTimeout(callback, 900);
            return;
        }
        displayed[index] = message[index];
        glitchTextContainerEl.innerHTML = displayed.join('');
        scheduleGlitchMessageTimeout(() => resolveGlitch(index + 1), 18);
    }

    function step() {
        if (charIndex < message.length) {
            const char = message[charIndex];
            if (char !== ' ' && Math.random() < 0.35) {
                const glitchChar = GLITCH_UNICODE[Math.floor(Math.random() * GLITCH_UNICODE.length)];
                displayed[charIndex] = `<span class="glitch">${glitchChar}</span>`;
            } else {
                displayed[charIndex] = char;
            }
            glitchTextContainerEl.innerHTML = displayed.join('');
            charIndex++;
            scheduleGlitchMessageTimeout(step, 80 + Math.random() * 60);
        } else {
            resolveGlitch();
        }
    }

    step();
}

function hideGlitchOverlay() {
    glitchPersistentDark = false;
    if (glitchOverlayEl) {
        glitchOverlayEl.classList.remove('active');
        glitchOverlayEl.classList.remove('dim');
    }
    if (glitchTextContainerEl) glitchTextContainerEl.innerHTML = '';
}

function startGlitchMessageSequence() {
    if (glitchMessagesLocked || glitchMessagesActive) return;
    if (!glitchOverlayEl || !glitchTextContainerEl) return;
    glitchOverlayEl.classList.add('active');
    glitchOverlayEl.classList.remove('dim');
    glitchPersistentDark = false;
    glitchMessageIndex = 0;
    glitchMessagesActive = true;

    function nextMessage() {
        if (!glitchModeActive) return;
        if (glitchMessageIndex >= GLITCH_MESSAGES.length) {
            scheduleGlitchMessageTimeout(() => {
                if (glitchModeActive) {
                    applyGlitchDarkness();
                } else {
                    hideGlitchOverlay();
                }
                glitchMessagesActive = false;
                glitchMessagesLocked = true;
            }, 1600);
            return;
        }
        const message = GLITCH_MESSAGES[glitchMessageIndex];
        glitchMessageIndex++;
        displayGlitchMessage(message, nextMessage);
    }

    clearGlitchMessageTimeouts();
    nextMessage();
}

function startGlitchOnslaught() {
    if (!glitchModeActive) return;
    glitchGoodLuckActive = false;
    glitchPhase = 'onslaught';
    glitchPhaseStart = Date.now();
    spawnGlitchHorde();
    const spawnRate = (glitchModeActive && adminMenuOpen) 
        ? 1800 * GLITCH_ADMIN_PENALTIES.spawnRateMult 
        : 1800;
    scheduleGlitchTimeout(() => {
        if (!glitchModeActive || glitchBossPhaseActive) return;
        spawnGlitchHorde();
        startGlitchOnslaught();
    }, spawnRate);
}

function startGlitchFooterSequence() {
    if (glitchBossPhaseActive && glitchBossFooterMessages.length) {
        glitchFooterState.active = true;
        glitchFooterState.alpha = 1;
        glitchFooterState.revealed = 0;
        glitchFooterState.phase = 'typing';
        glitchFooterState.nextUpdate = Date.now() + 90;
        return;
    }
    glitchFooterState.active = true;
    glitchFooterState.messageIndex = 0;
    glitchFooterState.revealed = 0;
    glitchFooterState.phase = 'typing';
    glitchFooterState.nextUpdate = Date.now() + GLITCH_FOOTER_TYPING_INTERVAL;
    glitchFooterState.holdUntil = 0;
    glitchFooterState.fadeUntil = 0;
    glitchFooterState.alpha = 1;
    glitchFooterState.completed = false;
}

function resetGlitchFooter() {
    glitchFooterState.active = false;
    glitchFooterState.messageIndex = 0;
    glitchFooterState.revealed = 0;
    glitchFooterState.phase = 'typing';
    glitchFooterState.nextUpdate = 0;
    glitchFooterState.holdUntil = 0;
    glitchFooterState.fadeUntil = 0;
    glitchFooterState.alpha = 1;
    glitchFooterState.completed = false;
}

function updateGlitchFooter(now = Date.now()) {
    if (!glitchModeActive) {
        if (glitchFooterState.active) {
            resetGlitchFooter();
        }
        return;
    }

    if (!glitchFooterState.active && !glitchFooterState.completed) {
        startGlitchFooterSequence();
    }

    const messages = glitchBossPhaseActive && glitchBossFooterMessages.length
        ? glitchBossFooterMessages
        : GLITCH_MESSAGES;
    if (!messages.length || !glitchFooterState.active) {
        return;
    }

    const currentIndex = glitchFooterState.messageIndex % messages.length;
    const currentMessage = messages[currentIndex];

    switch (glitchFooterState.phase) {
        case 'typing': {
            glitchFooterState.alpha = 1;
            if (now >= glitchFooterState.nextUpdate) {
                glitchFooterState.revealed = Math.min(currentMessage.length, glitchFooterState.revealed + 1);
                glitchFooterState.nextUpdate = now + GLITCH_FOOTER_TYPING_INTERVAL + Math.random() * 90;
                if (glitchFooterState.revealed >= currentMessage.length) {
                    glitchFooterState.phase = 'hold';
                    glitchFooterState.holdUntil = now + GLITCH_FOOTER_HOLD_DURATION;
                }
            }
            break;
        }
        case 'hold': {
            glitchFooterState.alpha = 1;
            if (now >= glitchFooterState.holdUntil) {
                glitchFooterState.phase = 'fade';
                glitchFooterState.fadeUntil = now + GLITCH_FOOTER_FADE_DURATION;
            }
            break;
        }
        case 'fade': {
            const remaining = Math.max(0, glitchFooterState.fadeUntil - now);
            glitchFooterState.alpha = remaining > 0 ? remaining / GLITCH_FOOTER_FADE_DURATION : 0;
            if (remaining <= 0) {
                if (glitchFooterState.messageIndex < messages.length - 1) {
                    glitchFooterState.messageIndex += 1;
                    glitchFooterState.revealed = 0;
                    glitchFooterState.phase = 'typing';
                    glitchFooterState.nextUpdate = now + GLITCH_FOOTER_TYPING_INTERVAL;
                    glitchFooterState.holdUntil = 0;
                    glitchFooterState.fadeUntil = 0;
                    glitchFooterState.alpha = 1;
                } else {
                    glitchFooterState.active = false;
                    glitchFooterState.completed = true;
                    glitchFooterState.alpha = 0;
                }
            }
            break;
        }
        default: {
            glitchFooterState.phase = 'typing';
            glitchFooterState.nextUpdate = now + GLITCH_FOOTER_TYPING_INTERVAL;
            glitchFooterState.alpha = 1;
            break;
        }
    }
}

// --- UI Layout Constants (non-healthbar) ---
const UI_TOWER_BTN_WIDTH = 86;
const UI_TOWER_BTN_HEIGHT = 60;
const UI_TOWER_SPACING = 14;
const UI_TOWER_BAR_Y_OFFSET = 72; // distance from bottom (smaller bar)

const player = {
  cash: 600,
  health: 100,
};

// Track lives lost during wave
let livesLostThisWave = false;

function takeDamage() {
  lives -= Math.ceil(this.health);
  livesLostThisWave = true;
  if (lives <= 0) {
    gameOver = true;
    stopBackgroundMusic();
  }
  // Trigger HUD effects and sound
  uiFlashUntil = Date.now() + 100; // 0.1s flash
  uiHealthFlash = 1;
  uiShake = Math.min(12, uiShake + 8);
  try {
    const hurt = document.getElementById('zombieDieSound');
    if (hurt) {
      hurt.currentTime = 0;
      hurt.play().catch(() => {});
    }
  } catch (_) {}
}

// Apply fixed leak damage when an enemy reaches the exit
function playerLeak(amount) {
  lives -= amount;
  livesLostThisWave = true;
  if (lives <= 0) {
    lives = 0;
    gameOver = true;
    stopBackgroundMusic();
  }
  // HUD effects (reuse same as takeDamage)
  const now = Date.now();
  // Flash duration scales with damage: ~1s at 5 dmg, up to ~1.4s for big hits
  const flashMs = Math.max(300, Math.min(300, 800 + amount * 40));
  uiFlashUntil = now + flashMs;
  uiHealthFlash = 1;
  // Shake only for larger single hits (>=15), scale with amount
  if (amount >= 15) {
    const addShake = (amount - 15) * 0.2; // 0 at 15 dmg, grows with dmg
    uiShake = Math.min(12, uiShake + addShake);
  }
  try {
    const hurt = document.getElementById('zombieDieSound');
    if (hurt) {
      hurt.currentTime = 0;
      hurt.play().catch(() => {});
    }
  } catch (_) {}
}

// Tower stats and costs
const towerStats = {
  basic: {
    cost: 150,
    damage: 1,
    range: 5,
    fireRate: 1108,
    description: "Balanced tower with moderate stats"
  },
  machine: {
    cost: 800,
    damage: 2,
    range: 35,
    fireRate: 300,
    description: "Fast firing, low damage"
  },
  sniper: {
    cost: 1500,
    damage: 5,
    range: 80,
    fireRate: 2000,
    description: "High damage, long range"
  },
  hunter: {
    cost: 1250,
    damage: 5,
    range: 45,
    fireRate: 1500,
    description: "Area damage"
  },
  minigunner: {
    cost: 2500,
    damage: 2,
    range: 35,
    fireRate: 200,
    description: "Rapid fire"
  },
  support: {
    cost: 750,
    damage: 2,
    range: 28,
    fireRate: 700,
    description: "Support tower that buffs nearby towers"
  }/*
  admin: {
    cost: 2,
    damage: 10,
    range: 300,
    fireRate: 3000,
    description: "AOE damage with fire effect"
  }*/
};

const enemyStats = {
  normal: {
    health: 5,
    speed: 1,
    value: 10
  },
  fast: {
    health: 6,
    speed: 2,
    value: 15
  },
  tank: {
    health: 40,
    speed: 0.5,
    value: 25
  },
  flying: {
    health: 25,
    speed: 1.5,
    value: 20
  },
  boss: {
    health: 190,
    speed: 0.7,
    value: 100
  }
};

class Tower {
  constructor(x, y, type = "basic") {
    // Return appropriate subclass for special tower types
    if (type === 'support' && !(this instanceof SupportTower)) {
      return new SupportTower(x, y);
    }
    
    this.x = x;
    this.y = y;
    this.type = type;
    this.lastShot = 0;
    this.target = null;
    this.level = 1;
    this.maxLevel = this.type === 'basic' ? 4 : 5;
    this.spinAngle = 0;
    this.selected = false;
    this.totalSpent = 0;
    this.barrelAngle = 0;
    this.targetAngle = 0;
    this.isHovered = false;
    this.dashOffset = 0;
    this.stunnedUntil = 0;
    this.canHitFlying = false;
    this.canHitHidden = false;
    this.targetingMode = 'first'; // 'first' | 'last' | 'strongest'

    // tower upgrades
    this.upgrades = {
      basic: [
        { name: "Faster Reloading", cost: null, damage: 0, range: 0, fireRateChange: -300 },
        { name: "Precise Aiming", cost: null, damage: 1, range: 2, fireRateChange: 0 },
        { name: "Stronger Equipment", cost: 950, damage: 4, range: 0, fireRateChange: -100 },
        { name: "Akimbo", cost: 2500, damage: 2, range: 2, fireRateChange: -350 }
      ],
      machine: [
        { name: "Rapid Assault", range: 1.1, damage: 1.1, fireRate: 1.2 },
        { name: "Twin Cannons", range: 1.2, damage: 1.2, fireRate: 1.2 },
        { name: "Triple Burst", range: 1.3, damage: 1.3, fireRate: 1.3 },
        { name: "Lead Tempest", range: 1.4, damage: 1.4, fireRate: 1.4 }
      ],
      sniper: [
        { name: "Hawkeye Lens", range: 1.4, damage: 1.3, fireRate: 1.0 },
        { name: "Armor Piercer", range: 1.2, damage: 1.6, fireRate: 1.0 },
        { name: "Rapid Sights", range: 1.1, damage: 1.4, fireRate: 1.3 },
        { name: "Precision Master", range: 1.3, damage: 2, fireRate: 2.0 }
      ],
      hunter: [
        { name: "Sonic Boom", range: 1.2, damage: 1.2, fireRate: 1.1 },
        { name: "Tremor", range: 1.1, damage: 1.4, fireRate: 1.1 },
        { name: "Ripple Effect", range: 1.2, damage: 1.3, fireRate: 1.2 },
        { name: "Vortex", range: 1.3, damage: 5.1, fireRate: 1.2 }
      ],
      minigunner: [
        { name: "Overdrive", range: 1.1, damage: 1.2, fireRate: 1.1 },
        { name: "Bounce Shot", range: 1.1, damage: 1.4, fireRate: 1.2 },
        { name: "Tri-Barrel", range: 1.2, damage: 1.7, fireRate: 1.3, barrels: 2 },
        { name: "Endless Rounds", range: 1.2, damage: 1.8, fireRate: 1.4}
      ],
      support: [
        { name: "Buff Boost", range: 1.1, damage: 1.1, fireRate: 1.1 },
        { name: "Shield", range: 1.1, damage: 1.1, fireRate: 1.1 },
        { name: "Healing Aura", range: 1.1, damage: 1.1, fireRate: 1.1 },
        { name: "Damage Boost", range: 1.1, damage: 1.1, fireRate: 1.1 }
      ]/*
      admin: [
        { name: "Boost", range: 1.1, damage: 1.2, fireRate: 1.1 },
        { name: "Expansion", range: 1.2, damage: 1.2, fireRate: 1.1 },
        { name: "Intensification", range: 1.1, damage: 1.3, fireRate: 1.1 },
        { name: "Mastery", range: 1.2, damage: 1.4, fireRate: 1.1 }
      ]*/
    };

    // Set base properties
    switch (type) {
      case "minigunner":
        this.range = 35;
        this.damage = 2;
        this.fireRate = 150;
        this.color = "#E91E63";
        this.bulletSpeed = 25;
        this.cost = 2200;
        this.barrels = 4;
        this.canHitFlying = true;
        break;
      case "sniper":
        this.range = 80;
        this.damage = 20;
        this.fireRate = 1800;
        this.color = "#f44336";
        this.bulletSpeed = 25;
        this.cost = 1200;
        this.canHitFlying = true;
        break;
      case "machine":
        this.range = 35;
        this.damage = 2;
        this.fireRate = 250;
        this.color = "#2196f3";
        this.bulletSpeed = 25;
        this.cost = 700;
        break;
      case "hunter":
        this.range = 45;
        this.damage = 6;
        this.fireRate = 900;
        this.color = "#ff9800";
        this.bulletSpeed = 25;
        this.cost = 1100;
        this.canHitFlying = true;
        break;
      case "support":
        this.range = 28;
        this.damage = 1;
        this.fireRate = 700;
        this.color = "#FFD700";
        this.bulletSpeed = 25;
        this.cost = 750;
        break;
      case "admin":
        this.range = 300;
        this.damage = 10;
        this.fireRate = 3;
        this.color = "#FF5722";
        this.bulletSpeed = 20;
        this.cost = 2000;
        this.explosionRadius = 100;
        break;
      default: // basic
        this.range = 12; 
        this.damage = 1;
        this.fireRate = 1108;
        this.color = "#4caf50"; // 
        this.bulletSpeed = 25;
        this.cost = 150;
        this.canHitHidden = false;
    }

    this.totalSpent = this.cost;
    
    this.baseRange = this.range;
    this.baseDamage = this.damage;
    this.baseFireRate = this.fireRate;
  }

  // Convert studs to pixels for game calculations (1 stud = 10 pixels)
  getPixelRange() {
    return this.range * 10;
  }

  getTotalValue() {
    return this.totalSpent;
  }

  getNextUpgrade() {
    if (this.level >= this.maxLevel) return null;
    return this.upgrades[this.type][this.level - 1];
  }

  getUpgradeCost() {
    const upgrade = this.getNextUpgrade();
    if (!upgrade) return 0;
    
    // Basic tower uses fixed costs from upgrade data
    let cost;
    if (this.type === 'basic' && upgrade.cost !== null) {
      cost = upgrade.cost;
    } else {
      cost = Math.floor(this.cost * 0.75 * this.level);
    }
    
    // Apply doubleCash modifier debuff (+50% upgrade cost)
    if (modifiers.doubleCash?.active) {
        cost = Math.floor(cost * 1.5);
    }
    
    // Apply upgrade discount from support
    if (this.supportBuffs?.upgradeDiscount) {
      cost = Math.floor(cost * 0.75); // 25% discount
    }
    
    return cost;
  }

  getUpgradeStats() {
    const upgrade = this.getNextUpgrade();
    if (!upgrade) return null;

    let stats;
    if (this.type === 'basic') {
      // Basic tower uses additive stats
      stats = {
        range: this.range + (upgrade.range || 0),
        damage: this.damage + (upgrade.damage || 0),
        fireRate: Math.round(1000 / (this.fireRate + upgrade.fireRateChange)),
        cost: this.getUpgradeCost()
      };
    } else {
      // Other towers use multiplier stats
      stats = {
        range: Math.round(this.range * upgrade.range),
        damage: Math.round(this.damage * upgrade.damage),
        fireRate: Math.round(1000 / (this.fireRate * upgrade.fireRate)),
        cost: this.getUpgradeCost()
      };
    }

    return stats;
  }

  upgrade() {
    const upgradeCost = this.getUpgradeCost();
    const upgrade = this.getNextUpgrade();

    if (!upgrade || this.level >= this.maxLevel || !cashSystem.spendCash(upgradeCost)) {
      return false;
    }

    if (this.type === 'basic') {
      // Basic tower uses additive stats
      this.range += (upgrade.range || 0);
      this.damage += (upgrade.damage || 0);
      this.fireRate += upgrade.fireRateChange;
    } else {
      // Other towers use multiplier stats
      this.range *= upgrade.range;
      this.damage *= upgrade.damage;
      this.fireRate *= (1 / upgrade.fireRate);
    }

    this.totalSpent += upgradeCost;
    this.level++;
    // Unlocks: basic level 2 gains hidden detection, level 3 gains flying detection
    if (this.type === 'basic') {
      if (this.level >= 2) {
        this.canHitHidden = true;
      }
      if (this.level >= 3) {
        this.canHitFlying = true;
      }
    }
    return true;
  }

  sell() {
    // Calculate sell value (70% of total spent)
    const sellValue = Math.floor(this.totalSpent * 0.7);
    
    // Add money from selling
    cashSystem.addCash(sellValue);
    
    // Play sell sound
    if (towerSellSound) {
        towerSellSound.currentTime = 0;
        towerSellSound.play().catch(e => console.error('Sell sound error:', e));
    }
    
    // Create sell animation
    const particles = [];
    const numParticles = 8;
    const colors = ['#FFD700', '#FFA500', '#FF8C00']; // Gold colors
    
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            size: 4,
            alpha: 1,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    // Create cash popup animation
    const cashAnim = new CashAnimation(this.x, this.y - 20, `+$${sellValue}`);
    animationSystem.add(cashAnim);
    
    // Add particle animation
    const sellAnimation = {
        update() {
            let alive = false;
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha *= 0.95;
                if (p.alpha > 0.1) alive = true;
            });
            return alive;
        },
        draw(ctx) {
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    };
    
    animationSystem.add(sellAnimation);
    
    // Clear any references to this tower
    if (selectedTower === this) {
        selectedTower = null;
    }
    
    // Remove tower from array
    const index = towers.indexOf(this);
    if (index > -1) {
        towers.splice(index, 1);
    }
    
    // Clear tower-specific data
    this.target = null;
    this._targetBtnRegions = null;
    this._abilityButtons = null;
  }

  findTarget() {
    let chosen = null;
    let bestMetric = this.targetingMode === 'last' ? Infinity : -Infinity;
    
    // Check if we can hit flying enemies (native ability or support buff)
    const canTargetFlying = this.canHitFlying || (this.supportBuffs?.flyingDetection);
    
    // Apply range boost from support
    let effectiveRange = this.getPixelRange();
    if (this.supportBuffs?.rangeBoost) {
      effectiveRange = this.getPixelRange() * 1.4; // 40% more range
    }
    
    for (const enemy of enemies) {
      // Skip flying enemies if we can't target them
      if (enemy.flying && !canTargetFlying) continue;
      // Skip hidden enemies if we can't detect them
      if (enemy.hidden && !this.canHitHidden) continue;
      
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > effectiveRange) continue;

      let metric;
      if (this.targetingMode === 'strongest') {
        metric = enemy.health;
        if (metric > bestMetric) { bestMetric = metric; chosen = enemy; }
      } else {
        // path progress metric
        const segLen = enemy.path[enemy.pathIndex]?.length || 1;
        const pathProgress = enemy.pathIndex + (enemy.pathProgress / segLen);
        metric = pathProgress;
        if (this.targetingMode === 'first') {
          if (metric > bestMetric) { bestMetric = metric; chosen = enemy; }
        } else { // 'last'
          if (metric < bestMetric) { bestMetric = metric; chosen = enemy; }
        }
      }
    }
    return chosen;
  }

  update() {
    const now = Date.now();
    if (now < this.stunnedUntil) {
      // stunned towers skip targeting/shooting
      return;
    }
    
    this.target = this.findTarget();

    // Apply fire rate boost from support
    let effectiveFireRate = getModifiedFireRate(this.fireRate);
    if (this.supportBuffs?.fireRateBoost) {
      effectiveFireRate = effectiveFireRate * 0.5; // 50% faster (half the time)
    }

    if (this.target && now - this.lastShot >= effectiveFireRate) {
      this.shoot();
      this.lastShot = now;
    }
  }

  shoot() {
    const target = this.findTarget(enemies);
    if (target) {
      // Apply modifier effects to damage
      const modifiedDamage = getModifiedDamage(this.damage);
      target.health -= Math.round(modifiedDamage);
      target.isTargeted = true;
      towerShootSound.currentTime = 0;
      towerShootSound.play();
    }
  }

  draw(isPreview = false) {
    ctx.save();
    
    const towerSize = 24;
    
    ctx.fillStyle = isPreview && !isValidPlacement(this.x, this.y) ? "rgba(255, 0, 0, 0.5)" : this.color;
    if (this.isHovered && !isPreview) {
      ctx.fillStyle = this.lightenColor(this.color, 30);
    }
    ctx.fillRect(
      this.x - towerSize/2,
      this.y - towerSize/2,
      towerSize,
      towerSize
    );

    // gives towers a blocky look
    ctx.fillStyle = this.darkenColor(this.color, 30);
    ctx.fillRect(
      this.x - towerSize/2,
      this.y + towerSize/2,
      towerSize,
      towerSize/4
    );

    if (this.type === "minigunner" && !isPreview) {
      this.spinAngle += 0.15;
      const barrelRadius = towerSize/2 - 4;
      
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i / 6) + this.spinAngle;
        const barrelX = this.x + Math.cos(angle) * barrelRadius;
        const barrelY = this.y + Math.sin(angle) * barrelRadius;
        
        ctx.fillStyle = "#424242";
        ctx.beginPath();
        ctx.arc(barrelX, barrelY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!isPreview) {
      // Draw barrel with smooth rotation
      ctx.fillStyle = this.darkenColor(this.color, 50);
      const barrelWidth = 8;
      const barrelLength = 12;
      
      if (this.target) {
        this.targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        
        // Smoothly rotate barrel
        let angleDiff = this.targetAngle - this.barrelAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.barrelAngle += angleDiff * 0.1;

        // Draw targeting line
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
        ctx.lineWidth = 1;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
      }
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.barrelAngle);
      ctx.fillRect(0, -barrelWidth/2, barrelLength, barrelWidth);
      ctx.restore();
    }

    if (selectedTower === this || isPreview) {
      // Calculate effective range for display
      let displayRange = this.getPixelRange();
      if (!isPreview && this.supportBuffs?.rangeBoost) {
        displayRange = this.getPixelRange() * 1.4;
      }
      
      ctx.strokeStyle = isPreview && !isValidPlacement(this.x, this.y) 
        ? "rgba(255, 0, 0, 0.15)" 
        : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRange, 0, Math.PI * 2);
      ctx.stroke();

      // Draw spinning dotted circle for range indicator
      this.dashOffset = (this.dashOffset || 0) + 0.05;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = this.dashOffset;
      ctx.strokeStyle = isPreview && !isValidPlacement(this.x, this.y)
        ? "rgba(255, 0, 0, 0.3)"
        : "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Show base range if boosted
      if (!isPreview && this.supportBuffs?.rangeBoost) {
        ctx.strokeStyle = "rgba(255, 215, 0, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.getPixelRange(), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (this.target && !isPreview) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.stroke();
    }

    // Draw buff indicators
    if (!isPreview && this.buffedBySupport && this.supportBuffs) {
      // Gold glow effect
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, towerSize/2 + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw active buff icons above tower
      let iconX = this.x - 12;
      const iconY = this.y - towerSize - 8;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      
      if (this.supportBuffs.flyingDetection && !this.canHitFlying) {
        ctx.fillText('✨', iconX, iconY);
        iconX += 12;
      }
      if (this.supportBuffs.fireRateBoost) {
        ctx.fillText('🔥', iconX, iconY);
        iconX += 12;
      }
      if (this.supportBuffs.rangeBoost) {
        ctx.fillText('📡', iconX, iconY);
        iconX += 12;
      }
      if (this.supportBuffs.upgradeDiscount) {
        ctx.fillText('💰', iconX, iconY);
      }
    }

    if (!isPreview) {
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(this.level, this.x, this.y + 4);
    }

    if (isPreview && !isValidPlacement(this.x, this.y)) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x - towerSize/2, this.y - towerSize/2);
      ctx.lineTo(this.x + towerSize/2, this.y + towerSize/2);
      ctx.moveTo(this.x + towerSize/2, this.y - towerSize/2);
      ctx.lineTo(this.x - towerSize/2, this.y + towerSize/2);
      ctx.stroke();
    }

    ctx.restore();
  }

  darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const b = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const g = Math.max(0, (num & 0x0000FF) - amount);
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }

  lightenColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.min(255, (num >> 16) + amount);
    const b = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const g = Math.min(255, (num & 0x0000FF) + amount);
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }
}

/*class adminTower extends Tower {
  constructor(x, y) {
    super(x, y, "admin");
    this.range = 300;
    this.damage = 10;
    this.fireRate = 3000;
    this.color = "#FF5722";
    this.bulletSpeed = 20;
    this.cost = 2000;
    this.explosionRadius = 100;
    this.lastShotTime = 0;
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastShotTime >= this.fireRate) {
      let target = null;
      enemies.forEach(enemy => {
        const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (distance < this.range) {
          target = enemy;
        }
      });
      if (target) {
        this.explode(target);
        this.lastShotTime = now;
      }
    }
  }

  explode(target) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 69, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(target.x, target.y, this.explosionRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    enemies.forEach(enemy => {
      const distance = Math.hypot(enemy.x - target.x, enemy.y - target.y);
      if (distance < this.explosionRadius) {
        enemy.takeDamage?.(this.damage);
        enemy.applyFire();
      }
    });
  }
}*/

class SniperTower extends Tower {
  constructor(x, y) {
    super(x, y, "sniper");
    this.range = 80; 
    this.damage = 15;
    this.fireRate = 2000;
  }
}

class SupportTower extends Tower {
  constructor(x, y) {
    super(x, y, "support");
    this.range = 28; 
    this.color = "#FFD700";
    
    // Ability system
    this.abilities = {
      flyingDetection: { active: true, cooldown: 0, maxCooldown: 0 },
      fireRateBoost: { active: false, cooldown: 0, maxCooldown: 30000, duration: 10000, endTime: 0 },
      rangeBoost: { active: false, cooldown: 0, maxCooldown: 25000, duration: 15000, endTime: 0 },
      upgradeDiscount: { active: false, cooldown: 0, maxCooldown: 45000, duration: 20000, endTime: 0 }
    };
    
    // Buff multipliers
    this.flyingDetectionBuff = true;
    this.fireRateBoostMultiplier = 0.5; // 50% faster
    this.rangeBoostMultiplier = 1.4; // 40% more range
    this.upgradeDiscountAmount = 0.25; // 25% discount
  }

  activateAbility(abilityName) {
    const ability = this.abilities[abilityName];
    if (!ability || ability.cooldown > 0) return false;
    
    const now = Date.now();
    ability.active = true;
    ability.cooldown = ability.maxCooldown;
    ability.endTime = now + ability.duration;
    return true;
  }

  updateAbilities() {
    const now = Date.now();
    
    Object.keys(this.abilities).forEach(key => {
      const ability = this.abilities[key];
      
      // Update cooldowns
      if (ability.cooldown > 0) {
        ability.cooldown = Math.max(0, ability.cooldown - 16); // ~60fps
      }
      
      // Check if timed abilities expired
      if (ability.active && ability.duration && now >= ability.endTime) {
        ability.active = false;
      }
    });
  }

  getBuffedTowers() {
    return towers.filter(tower => {
      if (tower === this) return false;
      const distance = Math.hypot(tower.x - this.x, tower.y - this.y);
      return distance <= this.range;
    });
  }

  applyBuffs() {
    const buffedTowers = this.getBuffedTowers();
    
    buffedTowers.forEach(tower => {
      // Mark tower as buffed for visual indicator
      tower.buffedBySupport = true;
      tower.supportBuffs = {
        flyingDetection: this.abilities.flyingDetection.active,
        fireRateBoost: this.abilities.fireRateBoost.active,
        rangeBoost: this.abilities.rangeBoost.active,
        upgradeDiscount: this.abilities.upgradeDiscount.active
      };
    });
  }

  update() {
    this.updateAbilities();
    this.applyBuffs();
    
    // Call parent update for shooting
    const now = Date.now();
    if (now < this.stunnedUntil) return;
    
    this.target = this.findTarget();
    if (this.target && now - this.lastShot >= this.fireRate) {
      this.shoot();
      this.lastShot = now;
    }
  }
}

/*
Tower.prototype.update = function() {
  if (this.type === "admin") {
    this.shoot();
  }
  const now = Date.now();
  
  // Find new target
  this.target = this.findTarget();

  // If we have a target and enough time has passed since last shot
  if (this.target && now - this.lastShot >= this.fireRate) {
    this.shoot();
    this.lastShot = now;
  }
}; */

// Boss Health Bar class
class BossHealthBar {
  constructor(boss) {
    this.boss = boss;
    this.width = 50;
    this.height = 30;
    this.opacity = 0;
    this.shakeAmount = 0;
    this.shakeDecay = 0.9;
    this.nameOpacity = 0;
    this.bossName = this.getBossName();
  }

  getBossName() {
    switch (this.boss.type) {
      case "boss":
        return "BOSS";
      case "superBoss":
        return "SUPER BOSS";
      default:
        return "MEGA BOSS";
    }
  }

  update() {
    // Fade in effects
    if (this.opacity < 1) this.opacity += 0.02;
    if (this.nameOpacity < 1) this.nameOpacity += 0.01;
    
    // Update shake effect
    if (this.shakeAmount > 0) {
      this.shakeAmount *= this.shakeDecay;
    }
  }

  shake(amount) {
    this.shakeAmount = amount;
  }

  draw(ctx) {
    ctx.save();
    
    // Apply shake effect
    const shakeX = (Math.random() - 0.5) * this.shakeAmount;
    const shakeY = (Math.random() - 0.5) * this.shakeAmount;
    
    // Position the health bar at the top center of the screen
    const x = (canvas.width - this.width) / 2 + shakeX;
    const y = 30 + shakeY;

    // Draw boss name with fade in
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = `rgba(255, 255, 255, ${this.nameOpacity})`;
    ctx.textAlign = "center";
    ctx.fillText(this.bossName, canvas.width / 2, y - 10);

    // Draw health bar background
    ctx.fillStyle = `rgba(40, 40, 40, ${this.opacity})`;
    ctx.fillRect(x, y, this.width, this.height);

    // Draw health bar
    const healthPercent = this.boss.health / this.boss.maxHealth;
    const barWidth = this.width * healthPercent;
    
    // Create gradient for health bar
    const gradient = ctx.createLinearGradient(x, y, x + barWidth, y + this.height);
    gradient.addColorStop(0, `rgba(220, 50, 50, ${this.opacity})`);
    gradient.addColorStop(1, `rgba(255, 100, 100, ${this.opacity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, this.height);

    // Draw health text
    ctx.font = "16px Arial";
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(this.boss.health)}/${this.boss.maxHealth} HP`, canvas.width / 2, y + 20);

    ctx.restore();
  }
}

// Enemy Object
class Enemy {
  constructor(path, type = "normal") {
    this.path = path;
    this.pathIndex = 0;
    this.x = path[0].params.start.x;
    this.y = path[0].params.start.y;
    this.type = type;
    this.pathProgress = 0;
    this.hit = false;
    this.isTargeted = false;
    this.fadeOut = false;
    this.fadeAlpha = 1;
    
    // Set enemy properties based on type
    switch(type) {
      case "fast":
        this.speed = 2;
        this.maxHealth = 6;
        this.color = "blue";
        this.size = 15;
        break;
      case "tank":
        this.speed = 0.5;
        this.maxHealth = 40;
        this.color = "lightgrey";
        this.damageReduction = 0.75;
        this.size = 25;
        break;
      case "boss":
        this.speed = 0.3;
        this.maxHealth = 190;
        this.color = "#9C27B0";
        this.size = 35;
        break;
      case "flying":
        this.speed = 1.5;
        this.maxHealth = 25;
        this.color = "#03A9F4";
        this.size = 20;
        this.flying = true;
        break;
      case "hidden":
        this.speed = 1.2;
        this.maxHealth = 15;
        this.color = "#8B4513";
        this.size = 18;
        this.hidden = true;
        break;
      case "stun":
        this.speed = 1.2;
        this.maxHealth = 75;
        this.color = "lightblue";
        this.size = 20;
        this.pulseInterval = 3000;
        this.lastPulse = Date.now();
        this.stunRadius = 140;
        this.stunDuration = 1500;
        break;
      case "armored":
        this.speed = 0.7;
        this.maxHealth = 60;
        this.color = "darkgrey";
        this.damageReduction = 0;
        this.armorColor = "#90A4AE";
        this.size = 20;
        break;
      case "berserker":
        this.speed = 1.5;
        this.maxHealth = 350;
        this.color = "#D50000";
        this.size = 30;
        break;
      case "emerald":
        this.speed = 0.8;
        this.maxHealth = 250;
        this.color = "#4CAF50";
        this.size = 23;
        this.regenRate = 500;
        break;
      case "splitter":
        this.speed = 1.2;
        this.maxHealth = 65;
        this.color = "orange";
        this.size = 25;
        this.splitCount = 2;
        break;
      case "superBoss":
        this.speed = 0.2;
        this.maxHealth = 10000;
        this.color = "#9C27B0";
        this.size = 100;
        break;
      case "sam":
        this.speed = 2.0;
        this.maxHealth = 2000;
        this.color = "purple";
        this.size = 20;
        this.lowHealthSoundPlayed = false;
        this.playSpawnSound();
        break;
      default: // normal
        this.speed = 1;
        this.maxHealth = 5;
        this.color = "green";
        this.size = 20;
    }
    
    this.health = this.maxHealth;
    // Cash reward is 1 gold per 1 HP
    this.value = Math.round(this.maxHealth);
    this.frozen = false;
    this.frozenTime = 0;
    this.baseSpeed = this.speed;
  }

  playSpawnSound() {
    const spawnSound = document.getElementById(`${this.type}SpawnSound`);
    if (spawnSound) {
      spawnSound.currentTime = 0;
      spawnSound.play().catch(error => console.error(`Failed to play ${this.type} spawn sound:`, error));
    } else {
      console.error(`${this.type} spawn sound element not found`);
    }
  }

  takeDamage(amount) {
    const actualDamage = amount * (1 - (this.damageReduction || 0));
    this.health -= actualDamage;
    this.hit = true;
    setTimeout(() => this.hit = false, 100);

    if (this.health <= 0) {
      this.die();
      return true;
    }

    if (this.health <= 10 && !this.lowHealthSoundPlayed) {
      this.lowHealthSoundPlayed = true;
      const lowHealthSound = document.getElementById(`${this.type}DieSound`);
      if (lowHealthSound) {
        lowHealthSound.play().catch(error => {
          console.error(`Failed to play ${this.type} low health sound:`, error);
        });
      } else {
        console.error(`${this.type} low health sound element not found`);
      }
    }

    return false;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    cashSystem.addCash(this.value);
    createCashAnimation(this.x, this.y, `+$${this.value}`);
    const dieSound = document.getElementById(`${this.type}DieSound`);
    if (dieSound) {
      dieSound.currentTime = 0;
      dieSound.play().then(() => {
      }).catch(error => {
        console.error(`Failed to play ${this.type} die sound:`, error);
      });
    } else {
      console.error(`${this.type} die sound element not found`);
    }
  }

  update(deltaMultiplier = 1) {
    if (this.frozen) {
      if (Date.now() - this.frozenTime > 2000) {
        this.frozen = false;
        this.speed = this.baseSpeed;
      } else {
        this.speed = this.baseSpeed * 0.5;
      }
    }

    if (this.pathIndex < this.path.length) {
      this.pathProgress += this.speed * deltaMultiplier;

      while (this.pathIndex < this.path.length) {
        const segment = this.path[this.pathIndex];
        const start = segment.params.start;
        const end = segment.params.end;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (this.pathProgress < distance) {
          const progress = this.pathProgress / distance;
          this.x = start.x + dx * progress;
          this.y = start.y + dy * progress;
          break;
        }

        this.pathProgress -= distance;
        this.pathIndex++;

        if (this.pathIndex >= this.path.length) {
          const exitPoint = segment?.params?.end;
          if (exitPoint) {
            this.x = exitPoint.x;
            this.y = exitPoint.y;
          }
          return true;
        }
      }
    }

    if (this.pathIndex >= this.path.length) {
      return true;
    }

    // Stun enemy pulse to stun towers
    if (this.type === 'stun') {
      const now = Date.now();
      if (now - (this.lastPulse || 0) >= (this.pulseInterval || 3000)) {
        towers.forEach(t => {
          const dx = t.x - this.x;
          const dy = t.y - this.y;
          if (Math.hypot(dx, dy) <= (this.stunRadius || 140)) {
            t.stunnedUntil = now + (this.stunDuration || 1500);
          }
        });
        this.lastPulse = now;
      }
    }
    
    return false;
  }

  draw() {
    ctx.save();
    
    if (this.fadeOut) {
      ctx.globalAlpha = this.fadeAlpha;
      this.fadeAlpha -= 0.1;
    }
    
    // Draw enemy
    ctx.fillStyle = this.frozen ? "#B3E5FC" : this.color;
    if (this.isTargeted) {
      ctx.fillStyle = this.lightenColor(this.color, 30);
    }
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Santa hat only in winter theme
    if (currentTheme && currentTheme.treeLights) {
      const hatSize = this.size * 0.7;
      // Hat base (red part)
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.moveTo(this.x - hatSize/2, this.y - this.size/2);
      ctx.lineTo(this.x, this.y - this.size/2 - hatSize);
      ctx.lineTo(this.x + hatSize/2, this.y - this.size/2);
      ctx.fill();
      // Hat trim (white part)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(this.x - hatSize/2, this.y - this.size/2, hatSize, hatSize/4);
      // Hat bobble
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.size/2 - hatSize, hatSize/4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw health bar
    const healthBarWidth = this.size;
    const healthBarHeight = 3;
    const healthPercent = this.health / this.maxHealth;
    
    // Health bar background
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(this.x - healthBarWidth/2, this.y - this.size/2 - 8, healthBarWidth, healthBarHeight);
    
    // Health bar
    const healthColor = healthPercent > 0.6 ? "#4CAF50" : healthPercent > 0.3 ? "#FFC107" : "#F44336";
    ctx.fillStyle = healthColor;
    ctx.fillRect(this.x - healthBarWidth/2, this.y - this.size/2 - 8, healthBarWidth * healthPercent, healthBarHeight);
    
    // Draw targeted indicator
    if (this.isTargeted) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size/2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  freeze() {
    this.frozen = true;
    this.frozenTime = Date.now();
  }

  applyFire() {
    const fireDuration = 2000;
    const fireDamage = 0.5;
    const fireInterval = 500;

    const fireEffect = setInterval(() => {
      this.takeDamage?.(fireDamage);
    }, fireInterval);

    setTimeout(() => {
      clearInterval(fireEffect);
    }, fireDuration);
  }

  lightenColor(color, amount) {
    return color.replace(/[\d]+/g, str => Math.min(255, parseInt(str) + amount));
  }
}

class ArmoredZombie extends Enemy {
  constructor(path) {
    super(path, "armored");
    this.health = 300;
    this.baseSpeed = 0.3;
  }
}

class FastZombie extends Enemy {
  constructor(path) {
    super(path, "fast");
    this.health = 50;
    this.baseSpeed = 2;
  }
}

class BossZombie extends Enemy {
  constructor(path) {
    super(path, "boss");
    this.maxHealth = 2000;
    this.health = this.maxHealth;
    this.baseSpeed = 0.4;
    this.speed = this.baseSpeed;
    this.size = 40;
    this.color = "#9C27B0";
    this.healthBar = new BossHealthBar(this);
    this.attackPattern = 0;
    this.lastAttackTime = Date.now();
    this.attackCooldown = 3000;
    this.value = Math.floor(this.maxHealth * 0.2 + 5);
    this.isCharging = false;
    this.chargeTarget = null;
    this.originalSpeed = this.speed;
  }

  takeDamage(amount) {
    const prevHealth = this.health;
    super.takeDamage(amount);
    
    // Shake effect for big hits
    if (amount > 50) {
      const shakeIntensity = Math.min(amount / 10, 20);
      this.healthBar.shake(shakeIntensity);
    }

    // Trigger rage mode at 50% health
    if (prevHealth > this.maxHealth / 2 && this.health <= this.maxHealth / 2) {
      this.enterRageMode();
    }
  }

  enterRageMode() {
    this.color = "#FF0000";
    this.attackCooldown = 2000;
    this.speed = this.baseSpeed * 1.5;
  }

  update(deltaMultiplier = 1) {
    const reachedEnd = super.update(deltaMultiplier);
    if (reachedEnd) {
      return true;
    }
    this.healthBar.update();

    // Special attacks
    if (Date.now() - this.lastAttackTime > this.attackCooldown) {
      this.performAttack();
      this.lastAttackTime = Date.now();
    }

    // Update charge attack if active
    if (this.isCharging && this.chargeTarget) {
      const dx = this.chargeTarget.x - this.x;
      const dy = this.chargeTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        this.isCharging = false;
        this.speed = this.originalSpeed;
      }
    }
    return false;
  }

  performAttack() {
    this.attackPattern = (this.attackPattern + 1) % 3;
    
    switch(this.attackPattern) {
      case 0:
        this.shockwaveAttack();
        break;
      case 1:
        this.chargeAttack();
        break;
      case 2:
        this.summonMinions();
        break;
    }
  }

  shockwaveAttack() {
    // Create a damaging shockwave
    const range = 200;
    towers.forEach(tower => {
      const dx = tower.x - this.x;
      const dy = tower.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < range) {
        tower.takeDamage?.(30);
      }
    });
  }

  chargeAttack() {
    // Find nearest tower and charge at it
    let nearestTower = null;
    let minDist = Infinity;
    
    towers.forEach(tower => {
      const dx = tower.x - this.x;
      const dy = tower.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearestTower = tower;
      }
    });

    if (nearestTower) {
      this.isCharging = true;
      this.chargeTarget = nearestTower;
      this.speed = this.originalSpeed * 3;
    }
  }

  summonMinions() {
    // Spawn smaller enemies around the boss
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spawnX = this.x + Math.cos(angle) * 50;
      const spawnY = this.y + Math.sin(angle) * 50;
      
      const enemy = new Enemy(path, "normal");
      enemy.x = spawnX;
      enemy.y = spawnY;
      enemy.health = 100;
      enemy.maxHealth = 100;
      enemy.speed = 1.2;
      enemy.size = 15;
      enemies.push(enemy);
    }
  }

  draw(ctx) {
    super.draw(ctx);
    this.healthBar.draw(ctx);
    
    // Draw charge effect
    if (this.isCharging) {
      ctx.beginPath();
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.chargeTarget.x, this.chargeTarget.y);
      ctx.stroke();
    }
  }
}

class superBossZombie extends Enemy {
  constructor(path) {
    super(path, "boss");
    this.maxHealth = 10000;
    this.health = this.maxHealth;
    this.baseSpeed = 0.2;
    this.speed = this.baseSpeed;
    this.size = 100;
    this.color = "#9C27B0";
    this.healthBar = new BossHealthBar(this);
    this.attackPattern = 0;
    this.lastAttackTime = Date.now();
    this.attackCooldown = 3000;
    this.value = Math.floor(this.maxHealth * 0.2 + 5);
    this.isCharging = false;
    this.chargeTarget = null;
    this.originalSpeed = this.speed;
  }

  takeDamage(amount) {
    const prevHealth = this.health;
    super.takeDamage(amount);
    
    // Shake effect for big hits
    if (amount > 50) {
      const shakeIntensity = Math.min(amount / 10, 20);
      this.healthBar.shake(shakeIntensity);
    }

    // Trigger rage mode at 50% health
    if (prevHealth > this.maxHealth / 2 && this.health <= this.maxHealth / 2) {
      this.enterRageMode();
    }
  }

  enterRageMode() {
    this.color = "#FF0000";
    this.attackCooldown = 2000;
    this.speed = this.baseSpeed * 1.5;
  }

  update() {
    super.update();
    this.healthBar.update();

    // Special attacks
    if (Date.now() - this.lastAttackTime > this.attackCooldown) {
      this.performAttack();
      this.lastAttackTime = Date.now();
    }

    // Update charge attack if active
    if (this.isCharging && this.chargeTarget) {
      const dx = this.chargeTarget.x - this.x;
      const dy = this.chargeTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        this.isCharging = false;
        this.speed = this.originalSpeed;
      }
    }
  }

  performAttack() {
    this.attackPattern = (this.attackPattern + 1) % 3;
    
    switch(this.attackPattern) {
      case 0:
        this.shockwaveAttack();
        break;
      case 1:
        this.chargeAttack();
        break;
      case 2:
        this.summonMinions();
        break;
    }
  }

  shockwaveAttack() {
    // Create a damaging shockwave
    const range = 200;
    towers.forEach(tower => {
      const dx = tower.x - this.x;
      const dy = tower.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < range) {
        tower.takeDamage?.(30);
      }
    });
  }

  chargeAttack() {
    // Find nearest tower and charge at it
    let nearestTower = null;
    let minDist = Infinity;
    
    towers.forEach(tower => {
      const dx = tower.x - this.x;
      const dy = tower.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearestTower = tower;
      }
    });

    if (nearestTower) {
      this.isCharging = true;
      this.chargeTarget = nearestTower;
      this.speed = this.originalSpeed * 3;
    }
  }

  summonMinions() {
    // Spawn smaller enemies around the boss
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spawnX = this.x + Math.cos(angle) * 50;
      const spawnY = this.y + Math.sin(angle) * 50;
      
      const enemy = new Enemy(path, "normal");
      enemy.x = spawnX;
      enemy.y = spawnY;
      enemy.health = 100;
      enemy.maxHealth = 100;
      enemy.speed = 1.2;
      enemy.size = 15;
      enemies.push(enemy);
    }
  }

  draw(ctx) {
    super.draw(ctx);
    this.healthBar.draw(ctx);
    
    // Draw charge effect
    if (this.isCharging) {
      ctx.beginPath();
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.chargeTarget.x, this.chargeTarget.y);
      ctx.stroke();
    }
  }
}

class StunZombie extends Enemy {
  constructor(path) {
    super(path, "stun");
    this.stunRange = 300;
    this.pulseInterval = 5000;
    this.lastPulse = Date.now();
    this.showShockwave = false;
  }

  update(deltaMultiplier = 1) {
    const reachedEnd = super.update(deltaMultiplier);
    if (reachedEnd) {
      return true;
    }
    const now = Date.now();
    if (now - this.lastPulse >= this.pulseInterval) {
      this.emitShockwave();
      this.lastPulse = now;
      this.showShockwave = true;
      setTimeout(() => this.showShockwave = false, 500);
    }
    return false;
  }

  emitShockwave() {
    towers.forEach(tower => {
      const distance = Math.hypot(tower.x - this.x, tower.y - this.y);
      if (distance < this.stunRange && !tower.stunned) {
        tower.stunned = true;
        setTimeout(() => tower.stunned = false, 3000);
      }
    });
  }

  draw() {
    super.draw();
    if (this.showShockwave) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.stunRange, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fill();
    }
  }
}

class SamZombie extends Enemy {
  constructor(path) {
    super(path, "sam");
    this.maxHealth = 2000;
    this.health = this.maxHealth;
    this.speed = 2.0;
    this.size = 20;
    this.color = "purple";
    this.playSpawnSound();
  }

  playSpawnSound() {
    const samSpawnSound = document.getElementById('samSpawnSound');
    if (samSpawnSound) {
      samSpawnSound.play().catch(error => console.error('Failed to play Sam spawn sound:', error));
    } else {
      console.error('Sam spawn sound element not found');
    }
  }

  die() {
    const index = enemies.indexOf(this);
    if (index > -1) {
      enemies.splice(index, 1);
    }
    cashSystem.addCash(this.value);
    createCashAnimation(this.x, this.y, `+$${this.value}`);
    const samDieSound = document.getElementById('samDieSound');
    if (samDieSound) {
      samDieSound.currentTime = 0;
      samDieSound.play().catch(error => {
        console.error('Failed to play Sam die sound:', error);
      });
    } else {
      console.error('Sam die sound element not found');
    }
  }

  takeDamage(amount) {
    const actualDamage = amount * (1 - (this.damageReduction || 0));
    this.health -= actualDamage;
    this.hit = true;
    setTimeout(() => this.hit = false, 100);

    if (this.health <= 0) {
      this.die();
      return true;
    }

    if (this.health <= 10 && !this.lowHealthSoundPlayed) {
      this.lowHealthSoundPlayed = true;
      const samLowHealthSound = document.getElementById('samDieSound');
      if (samLowHealthSound) {
        samLowHealthSound.play().catch(error => {
          console.error('Failed to play Sam low health sound:', error);
        });
      } else {
        console.error('Sam low health sound element not found');
      }
    }

    return false;
  }
}

// Bullet Object
class Bullet {
  constructor(x, y, target, damage) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 5;
    this.damage = damage;
  }

  draw() {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  update(deltaMultiplier = 1) {
    if (!this.target) {
      return;
    }
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    const step = this.speed * deltaMultiplier;
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;

    // Check for collision with target
    const distance = Math.hypot(this.target.x - this.x, this.target.y - this.y);
    if (distance < this.target.size) {
      this.target.health -= this.damage;
      // cash is awarded only on death via Enemy.die()
      if (this.target.health <= 0 && !this.target.hit) {
        this.target.hit = true;
      }
      this.target = null;
    }
  }
}

// Path segment types and path definition
class PathSegment {
  constructor(type, params) {
    this.type = type;
    this.params = params;
    this.length = this.calculateLength();
  }

  calculateLength() {
    if (this.type === 'line') {
      return Math.hypot(
        this.params.end.x - this.params.start.x,
        this.params.end.y - this.params.start.y
      );
    } else if (this.type === 'circle') {
      // For a circle, length is the arc length
      return Math.abs(this.params.radius * this.params.angleRange);
    } else if (this.type === 'bezier') {
      // Approximate length of Bezier curve
      const { start, control1, control2, end } = this.params;
      const points = [
        start,
        control1,
        control2,
        end
      ];
      let length = 0;
      for (let i = 0; i < points.length - 1; i++) {
        length += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      }
      return length;
    }
  }

  // Get point at distance t along the segment (t is 0 to 1)
  getPointAt(t) {
    if (this.type === 'line') {
      return {
        x: this.params.start.x + (this.params.end.x - this.params.start.x) * t,
        y: this.params.start.y + (this.params.end.y - this.params.start.y) * t
      };
    } else if (this.type === 'circle') {
      const angle = this.params.startAngle + this.params.angleRange * t;
      return {
        x: this.params.center.x + this.params.radius * Math.cos(angle),
        y: this.params.center.y + this.params.radius * Math.sin(angle)
      };
    } else if (this.type === 'bezier') {
      const { start, control1, control2, end } = this.params;
      const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * control1.x + 3 * (1 - t) * Math.pow(t, 2) * control2.x + Math.pow(t, 3) * end.x;
      const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * control1.y + 3 * (1 - t) * Math.pow(t, 2) * control2.y + Math.pow(t, 3) * end.y;
      return { x, y };
    }
  }

  // Check if a point is near this segment
  isPointNear(x, y, threshold) {
    if (this.type === 'line') {
      const start = this.params.start;
      const end = this.params.end;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      
      const dot = ((x - start.x) * dx + (y - start.y) * dy) / (length * length);
      const closestX = start.x + dot * dx;
      const closestY = start.y + dot * dy;
      const distance = Math.hypot(x - closestX, y - closestY);
      return distance < threshold && dot >= 0 && dot <= 1;
    } else if (this.type === 'circle') {
      const angleToPoint = Math.atan2(
        y - this.params.center.y,
        x - this.params.center.x
      );
      
      let normalizedAngle = angleToPoint;
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      
      const distanceFromCenter = Math.hypot(
        x - this.params.center.x,
        y - this.params.center.y
      );
      
      const isInAngleRange = this.isAngleInRange(normalizedAngle);
      const isNearRadius = Math.abs(distanceFromCenter - this.params.radius) < threshold;
      
      return isInAngleRange && isNearRadius;
    } else if (this.type === 'bezier') {
      // Approximate distance from point to Bezier curve
      const { start, control1, control2, end } = this.params;
      const points = [
        start,
        control1,
        control2,
        end
      ];
      let minDistance = Infinity;
      for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const length = Math.hypot(dx, dy);
        const dot = ((x - points[i].x) * dx + (y - points[i].y) * dy) / (length * length);
        const closestX = points[i].x + dot * dx;
        const closestY = points[i].y + dot * dy;
        const distance = Math.hypot(x - closestX, y - closestY);
        minDistance = Math.min(minDistance, distance);
      }
      return minDistance < threshold;
    }
  }

  isAngleInRange(angle) {
    let start = this.params.startAngle;
    let end = start + this.params.angleRange;
    
    // Normalize angles to 0-2π range
    while (start < 0) start += Math.PI * 2;
    while (end < 0) end += Math.PI * 2;
    while (angle < 0) angle += Math.PI * 2;
    
    if (this.params.angleRange > 0) {
      return angle >= start && angle <= end;
    } else {
      return angle <= start && angle >= end;
    }
  }
}

// Define a path using only line segments
const path = [
  new PathSegment('line', {
    start: { x: 0, y: canvas.height * 0.2 },
    end: { x: canvas.width * 0.2, y: canvas.height * 0.2 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.2, y: canvas.height * 0.2 },
    end: { x: canvas.width * 0.2, y: canvas.height * 0.6 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.2, y: canvas.height * 0.6 },
    end: { x: canvas.width * 0.5, y: canvas.height * 0.6 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.5, y: canvas.height * 0.6 },
    end: { x: canvas.width * 0.5, y: canvas.height * 0.2 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.5, y: canvas.height * 0.2 },
    end: { x: canvas.width * 0.8, y: canvas.height * 0.2 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.8, y: canvas.height * 0.2 },
    end: { x: canvas.width * 0.8, y: canvas.height * 0.8 }
  }),
  new PathSegment('line', {
    start: { x: canvas.width * 0.8, y: canvas.height * 0.8 },
    end: { x: canvas.width, y: canvas.height * 0.8 }
  })
];

// Generate fixed positions for trees and cliffs
function generateObstacles() {
  const obstacles = [];
  for (let i = 0; i < 10; i++) {
    let x, y;
    do {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
    } while (isOnPath(x, y));
    obstacles.push({ x, y });
  }
  return obstacles;
}

const trees = generateObstacles();
const cliffs = generateObstacles().filter((obstacle) => {
  const distanceToPath = Math.min(...path.map((segment) => {
    return segment.isPointNear(obstacle.x, obstacle.y, 100) ? 0 : 100;
  }));
  return distanceToPath < 100;
});

function isOnPath(x, y) {
  const pathWidth = 20;
  for (const segment of path) {
    if (segment.type === 'line') {
      const { start, end } = segment.params;
      const minX = Math.min(start.x, end.x) - pathWidth;
      const maxX = Math.max(start.x, end.x) + pathWidth;
      const minY = Math.min(start.y, end.y) - pathWidth;
      const maxY = Math.max(start.y, end.y) + pathWidth;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
  }
  return false;
}

function isTooCloseToOtherTowers(x, y) {
  return towers.some(tower => Math.hypot(tower.x - x, tower.y - y) < 40);
}

// Snap to grid functions
function snapToGrid(x, y) {
    if (!snapToGridEnabled) {
        return { x, y };
    }
    
    // Calculate snapped position (center of grid cell)
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    
    return { x: snappedX, y: snappedY };
}

function findNearestValidGridPosition(x, y) {
    if (!snapToGridEnabled) {
        return { x, y };
    }
    
    // Start with the direct snap
    const directSnap = snapToGrid(x, y);
    if (isValidPlacement(directSnap.x, directSnap.y)) {
        return directSnap;
    }
    
    // If direct snap is invalid, search nearby grid cells
    // Check in a spiral pattern outward
    const searchRadius = 3; // Check up to 3 cells away
    
    for (let radius = 1; radius <= searchRadius; radius++) {
        // Check cells at this radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check cells at the current radius (not inner ones we already checked)
                if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                    const testX = directSnap.x + (dx * GRID_SIZE);
                    const testY = directSnap.y + (dy * GRID_SIZE);
                    
                    // Check if this position is valid
                    if (isValidPlacement(testX, testY)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }
    }
    
    // If no valid position found, return the direct snap anyway
    return directSnap;
}

function isValidPlacement(x, y) {
    // Check if on path
    if (isOnPath(x, y)) {
        return false;
    }
    
    // Check if too close to other towers
    if (isTooCloseToOtherTowers(x, y)) {
        return false;
    }

    // Check cliff tower restrictions
    const isOnCliff = cliffTiles.some(cliff => {
        const dx = x - cliff.x;
        const dy = y - cliff.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = cliff.width ? cliff.width/2 : 20;
        return distance < maxDistance;
    });

    // For sniper towers
    if (selectedTowerType === "sniper") {
        if (!isOnCliff) {
            return false;
        }
    } else {
        // For non-sniper towers
        if (isOnCliff) {
            return false;
        }
    }

    // Prevent placing on trees (treat as blocked like cliffs)
    const isOnTree = trees.some(tree => {
        const dx = x - tree.x;
        const dy = y - tree.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = 26; // block radius around trees
        return distance < radius;
    });
    if (isOnTree) {
        return false;
    }

    // Check spawn and exit point restrictions
    const spawnPoint = path[0].params.start;
    const exitPoint = path[path.length - 1].params.end;
    
    const spawnDist = Math.hypot(x - spawnPoint.x, y - spawnPoint.y);
    const exitDist = Math.hypot(x - exitPoint.x, y - exitPoint.y);
    
    const restrictedDistance = 100; // Increased from 50 to 100
    if (spawnDist < restrictedDistance || exitDist < restrictedDistance) {
        return false;
    }
    return true;
}

// Add function to draw restricted areas
function drawRestrictedAreas() {
    if (!placingTower) return;
    
    const spawnPoint = path[0].params.start;
    const exitPoint = path[path.length - 1].params.end;
    const restrictedDistance = 100;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#FF0000";

    // Draw spawn point restriction
    ctx.beginPath();
    ctx.arc(spawnPoint.x, spawnPoint.y, restrictedDistance, 0, Math.PI * 2);
    ctx.fill();

    // Draw exit point restriction
    ctx.beginPath();
    ctx.arc(exitPoint.x, exitPoint.y, restrictedDistance, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw grid overlay when snap-to-grid is enabled
function drawGridOverlay() {
    if (!snapToGridEnabled || !placingTower) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Highlight valid grid cells in green, invalid in red
    ctx.globalAlpha = 0.15;
    for (let x = GRID_SIZE / 2; x < canvas.width; x += GRID_SIZE) {
        for (let y = GRID_SIZE / 2; y < canvas.height; y += GRID_SIZE) {
            if (isValidPlacement(x, y)) {
                ctx.fillStyle = glitchModeActive ? 'rgba(255, 0, 255, 0.35)' : 'rgba(76, 175, 80, 0.3)';
            } else {
                ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
            }
            ctx.fillRect(x - GRID_SIZE/2, y - GRID_SIZE/2, GRID_SIZE, GRID_SIZE);
        }
    }
    
    ctx.restore();
}

// Draw snap-to-grid indicator
function drawSnapIndicator() {
    if (!snapToGridEnabled) return;
    
    ctx.save();
    
    // Draw indicator in top-right corner
    const indicatorX = canvas.width - 150;
    const indicatorY = 20;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(indicatorX, indicatorY, 130, 36, 8);
    ctx.fill();
    
    // Icon (grid symbol)
    ctx.strokeStyle = '#64C8FF';
    ctx.lineWidth = 2;
    const iconX = indicatorX + 12;
    const iconY = indicatorY + 18;
    const iconSize = 16;
    
    // Draw small grid
    for (let i = 0; i <= 2; i++) {
        const offset = i * (iconSize / 2);
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(iconX + offset, iconY - iconSize/2);
        ctx.lineTo(iconX + offset, iconY + iconSize/2);
        ctx.stroke();
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(iconX - iconSize/2, iconY + offset - iconSize/2);
        ctx.lineTo(iconX + iconSize/2, iconY + offset - iconSize/2);
        ctx.stroke();
    }
    
    // Text
    ctx.fillStyle = '#64C8FF';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Snap to Grid', iconX + 24, indicatorY + 23);
    
    // Hotkey hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px Arial';
    ctx.fillText('Press G', indicatorX + 85, indicatorY + 30);
    
    ctx.restore();
}

function gameLoop() {
    const now = Date.now();
    let deltaMs = now - lastFrameTime;
    if (deltaMs < 0) {
        deltaMs = 0;
    }
    if (deltaMs > 250) {
        deltaMs = 250;
    }
    const deltaMultiplier = deltaMs / FRAME_DURATION;

    updateGlitchFooter(now);
    updateGlitchFlash(now);

    if (!gameOver && !gamePaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawMap();
        drawRestrictedAreas(); // Add this line to draw restricted areas
        
        // Clear buffs from all towers
        towers.forEach(tower => {
            tower.buffedBySupport = false;
            tower.supportBuffs = null;
        });
        
        // Update and draw towers
        towers.forEach((tower) => {
            tower.update();
            tower.draw();
        });

        // Update and draw enemies
        if (gameStarted && waveInProgress && (!glitchModeActive || glitchPhase === 'onslaught')) {
            // Spawn enemies
            if (enemiesSpawned < enemiesPerWave && now - lastEnemySpawn >= enemySpawnInterval) {
                spawnEnemy();
                lastEnemySpawn = now;
            }
        }

        // Handle enemies
        enemies = enemies.filter((enemy) => {
            if (enemy.health <= 0 || enemy.isDead) { if (!enemy.isDead) enemy.die?.(); return false; }
            
            if (enemy.update(deltaMultiplier)) {
                // Handle enemy reaching the end: apply remaining HP ONCE, then remove
                const leak = Math.max(0, Math.ceil(enemy.health));
                if (leak > 0) {
                    playerLeak(leak);
                }
                return false; // remove from enemies so it doesn't apply again
            }
            enemy.draw();
            // Track hovered enemy for tooltip
            const dx = mouseX - enemy.x;
            const dy = mouseY - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist <= enemy.size/2 + 6) {
                drawEnemyTooltip(enemy);
            }
            return true;
        });

        // Update and draw bullets
        bullets = bullets.filter((bullet) => bullet.target);
        bullets.forEach((bullet) => {
            bullet.draw();
            bullet.update(deltaMultiplier);
        });

        // Update and draw wave completion effect
        waveCompletionEffect.update();
        waveCompletionEffect.draw(ctx);

        // Draw HUD
        drawHUD();
        
        // Draw active modifiers
        drawActiveModifiers(ctx);
        
        // Draw grid overlay when placing towers with snap enabled
        drawGridOverlay();
        
        // Draw tower placement preview
        if (placingTower && previewTower) {
            // Preview position is already updated in mousemove handler
            previewTower.draw(true);
            if (isValidPlacement(previewTower.x, previewTower.y)) {
                drawPlacementRings(previewTower.x, previewTower.y);
            }
        }
        
        // Draw snap-to-grid indicator
        drawSnapIndicator();

        // Draw upgrade menu if tower is selected
        if (selectedTower) {
            if (useModernUpgradeMenu && selectedTower.type === 'basic') {
                // Modern menu shown separately below
            } else if (selectedTower.type === 'support') {
                drawSupportUpgradeMenu(selectedTower);
            } else {
                drawUpgradeMenu(selectedTower);
            }
        }

        // Draw modern upgrade menu (shown above tower placement UI)
        modernUpgradeMenu.draw(ctx);

        // Draw tower placement UI
        drawTowerPlacementUI();

        // Update animations
        animationSystem.update();
        modernUpgradeMenu.update();
        animationSystem.draw(ctx);

        // Auto-skip when wave countdown hits zero
        if (!glitchModeActive && waveInProgress && waveEndTime && Date.now() >= waveEndTime) {
            skipWave();
        }

        // Handle countdown and game state
        if (!gameStarted) {
            // Draw semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw countdown
            ctx.fillStyle = "white";
            ctx.font = "bold 100px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            if (now - lastCountdownUpdate >= 1000) {
                countdownTime--;
                lastCountdownUpdate = now;

                if (countdownTime < 0) {
                    gameStarted = true;
                    lastEnemySpawn = now;
                    startWave();
                }
            }

            if (countdownTime >= 0) {
                ctx.fillText(countdownTime > 0 ? countdownTime : "GO!", canvas.width / 2, canvas.height / 2);
            }
        }

        // Check wave completion
        if (waveInProgress && enemies.length === 0 && enemiesSpawned >= enemiesPerWave && (!glitchModeActive || glitchPhase === 'onslaught')) {
            completeWave();
        }

        // Start first wave if game just started
        if (!glitchModeActive && gameStarted && !waveInProgress && wave === 1) {
            startWave();
        }

        // Update cash display
        updateCashDisplay();
    }

    // Check game over
    if (lives <= 0) {
        gameOver = true;
    }

    if (gameOver) {
        showGameOverScreen();
    }
    
    // Show pause indicator when game is paused
    if (gamePaused && !gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ PAUSED', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = glitchModeActive ? '#e4c2ff' : '#B0C4DE';
        ctx.fillText('Game paused while tab is inactive', canvas.width / 2, canvas.height / 2 + 30);
        ctx.restore();
    }

    lastFrameTime = now;
    requestAnimationFrame(gameLoop);
}

// Page Visibility API - Pause game when tab is not active
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Tab is hidden - pause the game
        gamePaused = true;
        pauseStartTime = Date.now();
    } else {
        // Tab is visible again - unpause the game
        if (gamePaused && pauseStartTime > 0) {
            const pauseDuration = Date.now() - pauseStartTime;
            
            // Adjust all time-based variables by the pause duration
            if (intermissionEndTime > 0) {
                intermissionEndTime += pauseDuration;
            }
            if (waveEndTime > 0) {
                waveEndTime += pauseDuration;
            }
            if (lastEnemySpawn > 0) {
                lastEnemySpawn += pauseDuration;
            }
            if (intermissionBounceStart > 0) {
                intermissionBounceStart += pauseDuration;
            }
            
            // Adjust tower cooldowns
            towers.forEach(tower => {
                if (tower.lastShot) {
                    tower.lastShot += pauseDuration;
                }
                // Adjust support tower abilities
                if (tower.type === 'support' && tower.abilities) {
                    Object.values(tower.abilities).forEach(ability => {
                        if (ability.lastUsed) {
                            ability.lastUsed += pauseDuration;
                        }
                        if (ability.endTime) {
                            ability.endTime += pauseDuration;
                        }
                    });
                }
            });
            
            // Adjust enemy timers
            enemies.forEach(enemy => {
                if (enemy.lastPulse) {
                    enemy.lastPulse += pauseDuration;
                }
                if (enemy.lastRegen) {
                    enemy.lastRegen += pauseDuration;
                }
                if (enemy.frozenTime) {
                    enemy.frozenTime += pauseDuration;
                }
            });
            
            pauseStartTime = 0;
        }
        gamePaused = false;
        lastFrameTime = Date.now();
    }
});

function completeWave() {
    waveInProgress = false;
    enemiesSpawned = 0;
    wave++;
  
    // Increase streak if no lives were lost this wave
    if (!livesLostThisWave && !streakDisabledThisWave) {
        waveStreak++;
    } else {
        waveStreak = 0;
    }
    livesLostThisWave = false;
    // Reset streakDisabledThisWave after checking it - it only blocks one wave
    streakDisabledThisWave = false;
  
    // Calculate bonus with streak multiplier
    const streakMultiplier = 1 + (waveStreak * 0.15); // 15% bonus per streak
    const bonus = Math.floor(BASE_WAVE_BONUS * Math.pow(1.12, wave) * streakMultiplier); // 12% scaling per wave
    const clearBonus = Math.floor(bonus * 0.8); // 80% of wave bonus for clearing (not skipping)
    cashSystem.addCash(bonus);
    if (!waveSkippedThisWave) {
      cashSystem.addCash(clearBonus);
    }
  
    // Create modern wave completion notification
    const notification = new WaveCompletionNotification(
        wave,
        {
            waveBonus: bonus,
            clearBonus: waveSkippedThisWave ? 0 : clearBonus,
            streak: waveStreak
        },
        waveSkippedThisWave
    );
    animationSystem.add(notification);
  
    // Start wave completion effect
    waveCompletionEffect.start();
  
    // Start next wave after delay
    intermissionDurationMs = 3000; // 3s intermission
    intermissionEndTime = Date.now() + intermissionDurationMs;
    intermissionActive = true;
    intermissionLastSecond = Math.ceil(intermissionDurationMs / 1000);
    intermissionBounceStart = Date.now();
    setTimeout(() => {
        if (!gameOver && intermissionActive) {
            startWave();
        }
    }, intermissionDurationMs + 20);
}

function drawHUD() {
    const panelW = 360;
    const panelH = 126;
    const panelXBase = (canvas.width - panelW) / 2;
    const panelYBase = 10;
    // Apply shake
    if (uiShake > 0.05) {
        const ox = (Math.random() * 2 - 1) * uiShake;
        const oy = (Math.random() * 2 - 1) * uiShake * 0.6;
        var panelX = panelXBase + ox;
        var panelY = panelYBase + oy;
        uiShake *= UI_SHAKE_DECAY;
    } else {
        var panelX = panelXBase;
        var panelY = panelYBase;
        uiShake = 0;
    }

    if (glitchModeActive) {
        const gShake = Math.max(8, glitchUIShake);
        panelX += (Math.random() - 0.5) * gShake;
        panelY += (Math.random() - 0.5) * gShake * 0.4;
        glitchUIShake = Math.max(0, glitchUIShake * 0.9);
        glitchUICycle += 0.2;
    } else {
        glitchUIShake = 0;
        glitchUICycle = 0;
    }
    const cornerRadius = 12;

    // Detect lives change to trigger flash
    if (lives < uiLastLives) {
        uiHealthFlash = 1;
    }
    uiLastLives = lives;

    // Smoothly interpolate displayed lives
    uiLivesDisplay += (lives - uiLivesDisplay) * 0.15;
    const healthPercentage = Math.max(0, Math.min(1, uiLivesDisplay / 100));

    // Low-health pulse timer
    if (healthPercentage < 0.3) {
        uiPulseT += 0.1;
    } else {
        uiPulseT *= 0.9;
    }

    // Panel background
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 10, 0.6)';
    roundRect(ctx, panelX, panelY, panelW, panelH, cornerRadius);
    ctx.restore();

    // Health bar geometry
    const healthBarX = panelX + 15;
    const healthBarY = panelY + 14;
    const healthBarWidth = panelW - 30;
    const healthBarHeight = 26;

    // Background of health bar
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, healthBarX, healthBarY, healthBarWidth, healthBarHeight, 8);

    // Compute color based on percentage (green->yellow->red), force red during flash
    const pct = healthPercentage;
    const flashing = Date.now() < uiFlashUntil;
    const leftColor = flashing ? '#FF4D4D' : (pct > 0.5 ? '#4CAF50' : '#FFA000');
    const rightColor = flashing ? '#FF0000' : (pct > 0.5 ? '#8BC34A' : '#F44336');

    // Filled width
    const fillW = Math.max(0, healthBarWidth * pct);

    if (fillW > 0) {
        // Fill gradient
        ctx.save();
        const grad = ctx.createLinearGradient(healthBarX, healthBarY, healthBarX + fillW, healthBarY);
        grad.addColorStop(0, leftColor);
        grad.addColorStop(1, rightColor);
        ctx.fillStyle = grad;
        roundRect(ctx, healthBarX, healthBarY, fillW, healthBarHeight, 8);

        // Clip to filled portion for stripes and gloss
        ctx.save();
        ctx.beginPath();
        pathRoundRect(ctx, healthBarX, healthBarY, fillW, healthBarHeight, 8);
        ctx.clip();

        // Stripes
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ffffff';
        const stripeW = 10;
        const stripeGap = 18;
        for (let x = healthBarX - healthBarHeight; x < healthBarX + fillW; x += stripeGap) {
            ctx.save();
            ctx.translate(x, healthBarY);
            ctx.rotate(-Math.PI / 6);
            ctx.fillRect(0, 0, stripeW, healthBarHeight * 2);
            ctx.restore();
        }

        // Gloss on top half
        const gloss = ctx.createLinearGradient(0, healthBarY, 0, healthBarY + healthBarHeight);
        gloss.addColorStop(0, 'rgba(255,255,255,0.35)');
        gloss.addColorStop(0.5, 'rgba(255,255,255,0.10)');
        gloss.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = gloss;
        ctx.fillRect(healthBarX, healthBarY, fillW, healthBarHeight);

        ctx.restore(); // end clip

        // Glow and low-health pulse
        ctx.shadowColor = rightColor;
        const pulse = Math.max(0, Math.sin(uiPulseT) * 6);
        ctx.shadowBlur = pct < 0.3 ? 20 + pulse : 8;
        ctx.globalAlpha = 0.25;
        roundRect(ctx, healthBarX, healthBarY, fillW, healthBarHeight, 8);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();

        // Damage flash overlay (timed)
        if (flashing || uiHealthFlash > 0) {
            ctx.save();
            const a = flashing ? 0.4 : (0.4 * uiHealthFlash);
            ctx.globalAlpha = a;
            ctx.fillStyle = '#FF5252';
            roundRect(ctx, healthBarX, healthBarY, fillW, healthBarHeight, 8);
            ctx.restore();
            if (!flashing) uiHealthFlash = Math.max(0, uiHealthFlash - 0.12);
        }
    }

    // Health text and icon
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    const hpText = `${Math.max(0, Math.ceil(uiLivesDisplay))} HP`;
    ctx.fillText('❤', healthBarX + 8, healthBarY + healthBarHeight / 2 + 5);
    ctx.fillText(hpText, healthBarX + 30, healthBarY + healthBarHeight / 2 + 5);
    ctx.restore();

    if (glitchModeActive) {
        drawGlitchBars(ctx, healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        drawGlitchText(ctx, `${Math.max(0, Math.ceil(uiLivesDisplay))} HP`, healthBarX + 30, healthBarY + healthBarHeight / 2 + 5, {
            font: 'bold 18px "Courier New"',
            baseColor: '#ff89ff',
            align: 'left'
        });
    }

    // Wave info (centered title with progress underneath)
    const waveTitleY = panelY + 52;
    ctx.textAlign = 'center';
    if (glitchModeActive) {
        drawGlitchText(ctx, 'Wave: ???', panelX + panelW / 2, waveTitleY, {
            font: 'bold 22px "Courier New"',
            baseColor: '#ff9bff',
            align: 'center'
        });
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Wave ${wave}`, panelX + panelW / 2, waveTitleY);
    }

    const waveY = panelY + 64;
    const waveBarWidth = panelW - 30;
    const waveBarHeight = 18;
    const waveProgress = waveInProgress ? Math.min(1, enemiesSpawned / Math.max(1, enemiesPerWave)) : 1;
    const glitchFillWidth = waveBarWidth * (0.35 + Math.random() * 0.6);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, healthBarX, waveY, waveBarWidth, waveBarHeight, 6);
    if (glitchModeActive) {
        const glitchGradient = ctx.createLinearGradient(healthBarX, waveY, healthBarX + waveBarWidth, waveY + waveBarHeight);
        glitchGradient.addColorStop(0, 'rgba(255, 0, 255, 0.35)');
        glitchGradient.addColorStop(0.5, 'rgba(120, 0, 255, 0.6)');
        glitchGradient.addColorStop(1, 'rgba(0, 255, 255, 0.35)');
        ctx.fillStyle = glitchGradient;
        roundRect(ctx, healthBarX, waveY, glitchFillWidth, waveBarHeight, 6);
    } else if (waveInProgress) {
        ctx.fillStyle = '#2196F3';
        roundRect(ctx, healthBarX, waveY, waveBarWidth * waveProgress, waveBarHeight, 6);
    }
    ctx.fillStyle = '#B0C4DE';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    const waveSub = glitchModeActive ? `??? ${Math.round(Math.random()*999)}` : (waveInProgress ? `${enemiesSpawned}/${enemiesPerWave}` : `Ready`);
    ctx.fillText(waveSub, panelX + panelW / 2, waveY + waveBarHeight / 2 + 5);

    if (glitchModeActive) {
        drawGlitchBars(ctx, healthBarX, waveY, waveBarWidth, waveBarHeight);
        drawGlitchText(ctx, waveSub, panelX + panelW / 2, waveY + waveBarHeight / 2 + 5, {
            font: 'bold 14px "Courier New"',
            baseColor: '#a88bff',
            align: 'center'
        });
    }

    // Bottom row: Cash (left), Streak (center), Timer (right)
    const rowY = panelY + 100;
    // Cash left
    const currentCash = cashSystem.getCash();
    if (currentCash !== lastCashAmount) {
        cashGlowIntensity = 1;
        lastCashAmount = currentCash;
    }
    ctx.font = 'bold 18px Arial';
    if (cashGlowIntensity > 0) {
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 14 * cashGlowIntensity;
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('💰 $' + currentCash.toLocaleString(), panelX + 12, rowY);
        ctx.restore();
        cashGlowIntensity = Math.max(0, cashGlowIntensity - 0.05);
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('💰 $' + currentCash.toLocaleString(), panelX + 12, rowY);
    }

    if (glitchModeActive) {
        drawGlitchText(ctx, `💰 $${currentCash.toLocaleString()}`, panelX + 12, rowY, {
            font: 'bold 19px "Courier New"',
            baseColor: '#ffe1ff',
            align: 'left'
        });
    }

    // Streak center
    if (waveStreak > 1) {
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FF7043';
        ctx.textAlign = 'center';
        ctx.fillText(`${waveStreak}x Streak!`, panelX + panelW / 2, rowY);
        ctx.restore();
    }

    // Timer right
    ctx.save();
    ctx.textAlign = 'right';
    let timerText = '';
    let timerColor = '#B0C4DE';
    let drawBounce = false;
    let scale = 1;
    if (glitchWaveTimerInfinite) {
        timerText = '∞';
        timerColor = '#ff8dff';
    } else if (typeof intermissionActive !== 'undefined' && intermissionActive) {
        const now = Date.now();
        const rem = Math.max(0, intermissionEndTime - now);
        const secs = Math.ceil(rem / 1000);
        timerText = `Next: ${secs}`;
        if (secs < 15) timerColor = '#FF5252';
        // 0.2s bounce after each second tick
        if (secs !== intermissionLastSecond) {
            intermissionLastSecond = secs;
            intermissionBounceStart = now;
        }
        const t = Math.min(1, (now - intermissionBounceStart) / 200);
        if (t < 1) {
            drawBounce = true;
            scale = 1 + 0.15 * (1 - t);
        }
        hudButtons.skip = null;
    } else if (waveInProgress && typeof waveStartTime !== 'undefined' && waveStartTime) {
        const now = Date.now();
        const remWave = Math.max(0, waveEndTime - now);
        const mm = Math.floor(remWave / 60000).toString().padStart(2, '0');
        const ss = Math.floor((remWave % 60000) / 1000).toString().padStart(2, '0');
        timerText = `${mm}:${ss}`;
        
        // Update and draw skip UI
        skipUI.update(waveInProgress, remWave);
        skipUI.draw(ctx, panelX, panelY, panelW, panelH);
    }
    ctx.fillStyle = timerColor;
    ctx.font = 'bold 16px Arial';
    if (drawBounce) {
        ctx.save();
        const tx = panelX + panelW - 12;
        const ty = rowY;
        ctx.translate(tx, ty);
        ctx.scale(scale, scale);
        ctx.fillText(timerText, 0, 0);
        ctx.restore();
    } else {
        ctx.fillText(timerText, panelX + panelW - 12, rowY);
    }
    ctx.restore();

    if (glitchModeActive) {
        drawGlitchText(ctx, timerText || '∞', panelX + panelW - 12, rowY, {
            font: 'bold 18px "Courier New"',
            baseColor: '#ffc8ff',
            align: 'right'
        });
    }
}

function skipWave() {
    if (glitchModeActive) return;
    // Close the skip UI immediately
    skipUI.close();
    
    if (waveInProgress) {
        // Mark that this wave was skipped
        waveSkippedThisWave = true;
        waveStreak = 0; // lose streak immediately
        streakDisabledThisWave = true; // prevent gain for the next wave
        
        // Complete the current wave (this will give wave bonus but not clear bonus)
        // Don't clear enemies - let them continue to next wave
        completeWave();
    } else if (intermissionActive) {
        // Skipping during intermission: start next wave immediately
        streakDisabledThisWave = true;
        intermissionActive = false;
        startWave();
    }
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Create a rounded-rect path without filling (for clipping)
function pathRoundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Helper function to darken a color
function darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const b = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const g = Math.max(0, (num & 0x0000FF) - amount);
    return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Enemy hover tooltip showing health, name, and modifiers
function drawEnemyTooltip(enemy) {
    const name = enemy.type ? enemy.type.charAt(0).toUpperCase() + enemy.type.slice(1) : 'Enemy';
    const hpText = `${Math.ceil(enemy.health)}/${enemy.maxHealth} HP`;
    const mods = [];
    if (enemy.flying) mods.push('Flying');
    if (enemy.armored || enemy.damageReduction) mods.push('Armored');
    if (enemy.canStun) mods.push('Stun');
    if (enemy.canSplit) mods.push('Splitter');
    if (enemy.regenRate) mods.push('Regen');
    if (enemy.isSam) mods.push('Sam');
    if (enemy.type === 'boss' || enemy.type === 'superBoss') mods.push('Boss');
    const modText = mods.length ? mods.join(', ') : 'None';

    const padding = 8;
    const lineH = 16;
    const width = 160;
    const height = mods.length ? padding*2 + lineH*3 : padding*2 + lineH*2;
    let x = Math.min(mouseX + 16, canvas.width - width - 10);
    let y = Math.min(mouseY - height - 10, canvas.height - height - 10);
    if (y < 10) y = mouseY + 16; // flip below if near top

    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(20,20,25,0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(name, x + padding, y + padding + 12);

    ctx.font = '12px Arial';
    ctx.fillStyle = '#B0C4DE';
    ctx.fillText(hpText, x + padding, y + padding + 12 + lineH);

    if (mods.length) {
        ctx.fillStyle = glitchModeActive ? '#d197ff' : '#9e9e9e';
        ctx.fillText(`Mods: ${modText}`, x + padding, y + padding + 12 + lineH*2);
    }
    ctx.restore();
}

function drawUpgradeMenu(tower) {
    // Match support menu dimensions for consistency - compact and mobile-friendly
    const menuWidth = 320;
    const menuHeight = 300;

    // Calculate menu position to ensure it stays within canvas bounds
    let menuX = tower.x + 40;
    let menuY = tower.y - 60;

    // Adjust if menu would go off screen
    if (menuX + menuWidth > canvas.width) {
        menuX = tower.x - menuWidth;
    }
    if (menuY < 0) {
        menuY = tower.y + menuHeight;
    }

    ctx.save();

    // Match support menu background style - clean and professional
    ctx.shadowColor = glitchModeActive ? 'rgba(255, 0, 200, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = glitchModeActive ? 26 : 20;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = glitchModeActive ? 'rgba(10, 0, 28, 0.92)' : 'rgba(20, 20, 25, 0.95)';
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Gold accent border like support menu
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 14);
    ctx.stroke();

    // Header with gold gradient like support menu
    const headerGrad = ctx.createLinearGradient(menuX, menuY + 12, menuX, menuY + 60);
    headerGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    headerGrad.addColorStop(1, 'rgba(255, 215, 0, 0.1)');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(menuX + 8, menuY + 8, menuWidth - 16, 52, 10);
    ctx.fill();

    // Tower icon in header like support menu
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.roundRect(menuX + 16, menuY + 16, 36, 36, 8);
    ctx.fill();

    ctx.fillStyle = '#1a1a1f';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⬜', menuX + 34, menuY + 42); // Basic tower square

    // Title like support menu
    ctx.fillStyle = glitchModeActive ? '#ff94ff' : '#FFD700';
    ctx.font = glitchModeActive ? 'bold 18px "Courier New"' : 'bold 18px Arial';
    ctx.textAlign = 'left';
    const titleText = 'Basic Tower';
    ctx.fillText(glitchModeActive ? applyGlitchToValue(titleText) : titleText, menuX + 64, menuY + 32);

    ctx.fillStyle = glitchModeActive ? '#e4c2ff' : '#B0C4DE';
    ctx.font = glitchModeActive ? '12px "Courier New"' : '12px Arial';
    const levelText = `Level ${tower.level}/${tower.maxLevel}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(levelText) : levelText, menuX + 64, menuY + 48);

    // Stats section like support menu
    let yOffset = menuY + 76;
    ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#ffffff';
    ctx.font = glitchModeActive ? 'bold 13px "Courier New"' : 'bold 13px Arial';
    const statsLabel = 'Current Stats';
    ctx.fillText(glitchModeActive ? applyGlitchToValue(statsLabel) : statsLabel, menuX + 16, yOffset);
    yOffset += 20;

    ctx.font = glitchModeActive ? '12px "Courier New"' : '12px Arial';
    ctx.fillStyle = glitchModeActive ? '#f4d6ff' : '#cfd8dc';

    // Simple stat display like support menu
    const rangeText = `🎯 Range: ${Math.round(tower.range)}`;
    const damageText = `⚔️ Damage: ${Math.round(tower.damage)}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(rangeText) : rangeText, menuX + 16, yOffset);
    ctx.fillText(glitchModeActive ? applyGlitchToValue(damageText) : damageText, menuX + 170, yOffset);
    yOffset += 20;

    const rateText = `⚡ Rate: ${(tower.fireRate/1000).toFixed(2)}s`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(rateText) : rateText, menuX + 16, yOffset);

    // Targeting selector - simplified like support menu
    yOffset += 28;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🎯 Targeting', menuX + 16, yOffset);
    yOffset += 8;

    const modes = ['first','last','strongest'];
    const labels = { first: 'First', last: 'Last', strongest: 'Strongest' };

    tower._targetBtnRegions = tower._targetBtnRegions || [];
    modes.forEach((mode, index) => {
        const btnY = yOffset + 16 + (index * 56);
        const btnH = 48;

        // Button background
        const isSelected = tower.targetingMode === mode;
        if (isSelected) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        } else {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        }
        ctx.beginPath();
        ctx.roundRect(menuX + 16, btnY, menuWidth - 32, btnH, 8);
        ctx.fill();

        // Button border
        if (isSelected) {
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
        } else {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(menuX + 16, btnY, menuWidth - 32, btnH, 8);
        ctx.stroke();

        // Button content
        ctx.fillStyle = isSelected ? '#4CAF50' : '#FFD700';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('🎯', menuX + 32, btnY + 32);

        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(labels[mode], menuX + 64, btnY + 22);

        // Store regions for click detection
        tower._targetBtnRegions[index] = { x: menuX + 16, y: btnY, w: menuWidth - 32, h: btnH, mode: mode };
    });

    // Next upgrade preview
    yOffset = yOffset + 16 + (modes.length * 56) + 8;
    ctx.fillStyle = glitchModeActive ? '#e4c2ff' : '#B0C4DE';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Next Upgrade:', menuX + 12, yOffset);

    ctx.font = '12px Arial';
    if (tower.level < tower.maxLevel) {
        const next = tower.getNextUpgrade();
        if (next) {
            const newRange = Math.round(tower.range + (next.range || 0));
            const newDmg = Math.round(tower.damage + (next.damage || 0));
            ctx.fillText(`Range: ${Math.round(tower.range)} → ${newRange}`, menuX + 12, yOffset + 18);
            ctx.fillText(`Damage: ${Math.round(tower.damage)} → ${newDmg}`, menuX + 12, yOffset + 36);

            // Special unlocks
            if (tower.level + 1 >= 3 && !tower.canHitFlying) {
                ctx.fillStyle = '#00ff88';
                ctx.fillText(`✨ Flying Detection Unlock!`, menuX + 12, yOffset + 54);
            }
        }
    } else {
        ctx.fillText(`Max level reached!`, menuX + 12, yOffset + 18);
    }

    // Upgrade & Sell buttons like support menu
    const btnBaseY = menuY + menuHeight - 50;
    if (tower.level < tower.maxLevel) {
        const upgradeCost = tower.getUpgradeCost();
        const canAfford = cashSystem.getCash() >= upgradeCost;

        ctx.fillStyle = canAfford ? 'rgba(76, 175, 80, 0.9)' : 'rgba(158, 158, 158, 0.5)';
        ctx.fillRect(menuX + 16, btnBaseY, 136, 36);
        ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#fff';
        ctx.font = glitchModeActive ? 'bold 12px "Courier New"' : 'bold 12px Arial';
        ctx.textAlign = 'left';
        const upgradeLabel = `Upgrade: $${upgradeCost}`;
        ctx.fillText(glitchModeActive ? applyGlitchToValue(upgradeLabel) : upgradeLabel, menuX + 24, btnBaseY + 22);
    } else {
        ctx.fillStyle = 'rgba(158, 158, 158, 0.5)';
        ctx.fillRect(menuX + 16, btnBaseY, 136, 36);
        ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#fff';
        ctx.font = glitchModeActive ? 'bold 12px "Courier New"' : 'bold 12px Arial';
        ctx.textAlign = 'left';
        const maxLabel = 'Max Level';
        ctx.fillText(glitchModeActive ? applyGlitchToValue(maxLabel) : maxLabel, menuX + 24, btnBaseY + 22);
    }

    ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
    ctx.fillRect(menuX + 168, btnBaseY, 136, 36);
    ctx.fillStyle = '#fff';
    const sellLabel = `Sell: $${Math.floor(tower.totalSpent * 0.7)}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(sellLabel) : sellLabel, menuX + 176, btnBaseY + 22);

    ctx.restore();
}

function drawSupportUpgradeMenu(tower) {
    // Fixed size menu (responsive scaling was breaking button positions)
    const menuWidth = 320;
    const menuHeight = 460;
    
    // Calculate menu position
    let menuX = tower.x + 40;
    let menuY = tower.y - 60;
    
    if (menuX + menuWidth > canvas.width) {
        menuX = tower.x - menuWidth;
    }
    if (menuY < 0) {
        menuY = tower.y + menuHeight;
    }

    ctx.save();
    if (glitchModeActive) {
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    // Main panel
    ctx.shadowColor = glitchModeActive ? 'rgba(255, 0, 200, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = glitchModeActive ? 26 : 20;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = glitchModeActive ? 'rgba(10, 0, 28, 0.92)' : 'rgba(20, 20, 25, 0.95)';
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 14);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Gold accent border
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 14);
    ctx.stroke();

    // Header with gold gradient
    const headerGrad = ctx.createLinearGradient(menuX, menuY + 12, menuX, menuY + 60);
    headerGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    headerGrad.addColorStop(1, 'rgba(255, 215, 0, 0.1)');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(menuX + 8, menuY + 8, menuWidth - 16, 52, 10);
    ctx.fill();

    // Tower icon
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.roundRect(menuX + 16, menuY + 16, 36, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#1a1a1f';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', menuX + 34, menuY + 42);

    // Title
    ctx.fillStyle = glitchModeActive ? '#ff94ff' : '#FFD700';
    ctx.font = glitchModeActive ? 'bold 18px "Courier New"' : 'bold 18px Arial';
    ctx.textAlign = 'left';
    const supportLabel = 'Support Tower';
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportLabel) : supportLabel, menuX + 64, menuY + 32);
    ctx.fillStyle = glitchModeActive ? '#e4c2ff' : '#B0C4DE';
    ctx.font = glitchModeActive ? '12px "Courier New"' : '12px Arial';
    const supportLevel = `Level ${tower.level}/${tower.maxLevel}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportLevel) : supportLevel, menuX + 64, menuY + 48);

    // Stats section
    let yOffset = menuY + 76;
    ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#ffffff';
    ctx.font = glitchModeActive ? 'bold 13px "Courier New"' : 'bold 13px Arial';
    const baseStatsLabel = 'Base Stats';
    ctx.fillText(glitchModeActive ? applyGlitchToValue(baseStatsLabel) : baseStatsLabel, menuX + 16, yOffset);
    yOffset += 20;

    ctx.font = glitchModeActive ? '12px "Courier New"' : '12px Arial';
    ctx.fillStyle = glitchModeActive ? '#f4d6ff' : '#cfd8dc';
    const supportRange = `🎯 Range: ${Math.round(tower.range)}`;
    const supportDamage = `⚔️ Damage: ${Math.round(tower.damage)}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportRange) : supportRange, menuX + 16, yOffset);
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportDamage) : supportDamage, menuX + 170, yOffset);
    yOffset += 20;
    const supportRate = `⚡ Rate: ${(tower.fireRate/1000).toFixed(2)}s`;
    const supportBuff = `👥 Buffed: ${tower.getBuffedTowers().length}`;
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportRate) : supportRate, menuX + 16, yOffset);
    ctx.fillText(glitchModeActive ? applyGlitchToValue(supportBuff) : supportBuff, menuX + 170, yOffset);

    // Abilities section
    yOffset += 28;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('⚡ Abilities', menuX + 16, yOffset);
    yOffset += 8;

    // Ability buttons
    const abilities = [
        { key: 'fireRateBoost', name: 'Fire Rate Boost', icon: '🔥', desc: '+50% Fire Rate (10s)' },
        { key: 'rangeBoost', name: 'Range Boost', icon: '📡', desc: '+40% Range (15s)' },
        { key: 'upgradeDiscount', name: 'Upgrade Discount', icon: '💰', desc: '25% Off Upgrades (20s)' }
    ];

    tower._abilityButtons = [];
    abilities.forEach((abil, idx) => {
        const ability = tower.abilities[abil.key];
        const btnY = yOffset + 16 + (idx * 64);
        const btnH = 56;
        const isOnCooldown = ability.cooldown > 0;
        const isActive = ability.active;

        // Button background
        if (isActive) {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        } else if (isOnCooldown) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        } else {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        }
        ctx.beginPath();
        ctx.roundRect(menuX + 16, btnY, menuWidth - 32, btnH, 8);
        ctx.fill();

        // Button border
        if (isActive) {
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
        } else if (isOnCooldown) {
            ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
        } else {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(menuX + 16, btnY, menuWidth - 32, btnH, 8);
        ctx.stroke();

        // Icon
        ctx.font = '24px Arial';
        ctx.fillText(abil.icon, menuX + 32, btnY + 36);

        // Ability name
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = isOnCooldown ? '#888' : '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(abil.name, menuX + 64, btnY + 22);

        // Description
        ctx.font = glitchModeActive ? '11px "Courier New"' : '11px Arial';
        ctx.fillStyle = isOnCooldown ? '#666' : (glitchModeActive ? '#e4c2ff' : '#B0C4DE');
        ctx.fillText(glitchModeActive ? applyGlitchToValue(abil.desc) : abil.desc, menuX + 64, btnY + 38);

        // Cooldown / Active status
        if (isActive) {
            const remaining = Math.ceil((ability.endTime - Date.now()) / 1000);
            ctx.fillStyle = glitchModeActive ? '#ff5cff' : '#4CAF50';
            ctx.font = glitchModeActive ? 'bold 11px "Courier New"' : 'bold 11px Arial';
            ctx.textAlign = 'right';
            const activeLabel = `ACTIVE ${remaining}s`;
            ctx.fillText(glitchModeActive ? applyGlitchToValue(activeLabel) : activeLabel, menuX + menuWidth - 28, btnY + 30);
        } else if (isOnCooldown) {
            const cdSecs = Math.ceil(ability.cooldown / 1000);
            ctx.fillStyle = glitchModeActive ? '#888' : '#888';
            ctx.font = glitchModeActive ? '11px "Courier New"' : '11px Arial';
            ctx.textAlign = 'right';
            const cooldownLabel = `${cdSecs}s`;
            ctx.fillText(glitchModeActive ? applyGlitchToValue(cooldownLabel) : cooldownLabel, menuX + menuWidth - 28, btnY + 30);
            
            // Cooldown progress bar
            const progress = 1 - (ability.cooldown / ability.maxCooldown);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fillRect(menuX + 64, btnY + 44, (menuWidth - 96) * progress, 4);
        }

        // Store button region for click detection
        tower._abilityButtons.push({
            key: abil.key,
            x: menuX + 16,
            y: btnY,
            w: menuWidth - 32,
            h: btnH
        });
    });

    // Flying Detection (always active)
    yOffset = yOffset + 16 + (abilities.length * 64) + 8;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    ctx.beginPath();
    ctx.roundRect(menuX + 16, yOffset, menuWidth - 32, 40, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(menuX + 16, yOffset, menuWidth - 32, 40, 8);
    ctx.stroke();
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('✨', menuX + 32, yOffset + 28);
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Flying Detection', menuX + 64, yOffset + 18);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#B0C4DE';
    ctx.fillText('Grants flying detection to towers', menuX + 64, yOffset + 32);
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = glitchModeActive ? '#ff5cff' : '#4CAF50';
    ctx.textAlign = 'right';
    ctx.fillText('PASSIVE', menuX + menuWidth - 28, yOffset + 25);

    // Upgrade & Sell buttons
    const btnBaseY = menuY + menuHeight - 50;
    if (tower.level < tower.maxLevel) {
        const upgradeCost = tower.getUpgradeCost();
        const canAfford = cashSystem.getCash() >= upgradeCost;
        
        ctx.fillStyle = canAfford ? 'rgba(76, 175, 80, 0.9)' : 'rgba(158, 158, 158, 0.5)';
        ctx.fillRect(menuX + 16, btnBaseY, 136, 36);
        ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#fff';
        ctx.font = glitchModeActive ? 'bold 12px "Courier New"' : 'bold 12px Arial';
        ctx.textAlign = 'left';
        const supportUpgradeLabel = `Upgrade: $${upgradeCost}`;
        ctx.fillText(glitchModeActive ? applyGlitchToValue(supportUpgradeLabel) : supportUpgradeLabel, menuX + 24, btnBaseY + 22);
    } else {
        ctx.fillStyle = 'rgba(158, 158, 158, 0.5)';
        ctx.fillRect(menuX + 16, btnBaseY, 136, 36);
        ctx.fillStyle = glitchModeActive ? '#ffe6ff' : '#fff';
        ctx.font = glitchModeActive ? 'bold 12px "Courier New"' : 'bold 12px Arial';
        ctx.textAlign = 'left';
        const supportMaxLabel = 'Max Level';
        ctx.fillText(glitchModeActive ? applyGlitchToValue(supportMaxLabel) : supportMaxLabel, menuX + 24, btnBaseY + 22);
    }

    ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
    ctx.fillRect(menuX + 168, btnBaseY, 136, 36);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Sell: $${Math.floor(tower.totalSpent * 0.7)}`, menuX + 176, btnBaseY + 22);

    ctx.restore();
}

function handleGameOverClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if (mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100 && mouseY > canvas.height / 2 + 50 && mouseY < canvas.height / 2 + 100) {
        canvas.removeEventListener("click", handleGameOverClick);
        resetGame();
    }
}

function showGameOverScreen() {
    // Dark overlay with fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Game Over text with red glow
    ctx.fillStyle = '#f44336';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#f44336';
    ctx.shadowBlur = 20;
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 3);
    ctx.shadowBlur = 0;

    // Stats with golden glow for high scores
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';

    // Wave stats
    ctx.fillText(`Waves Survived: ${wave - 1}`, canvas.width / 2, canvas.height / 2);

    // Score with golden glow if high
    if (cashSystem.getCash() > 5000) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
    }
    ctx.fillText(`Final Score: $${cashSystem.getCash()}`, canvas.width / 2, canvas.height / 2 + 40);

    // Streak bonus display
    if (waveStreak > 1) {
        ctx.shadowColor = '#FF5722';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FF5722';
        ctx.fillText(`${waveStreak}x Streak!`, canvas.width / 2, canvas.height / 2 + 80);
    }

    // Restart button with pulsing green glow
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height * 0.7;

    const time = Date.now() * 0.001;
    const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;

    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 20 * glowIntensity;
    ctx.fillStyle = '#4CAF50';
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 10);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Play Again', canvas.width / 2, buttonY + 33);

    // Add click listener for restart
    canvas.addEventListener("click", handleGameOverClick);
}

function resetGame() {
    wave = 1;
    cashSystem.addCash(600);
    lives = 100;
    towers = [];
    enemies = [];
    bullets = [];
    gameOver = false;
    waveInProgress = false;
    startBackgroundMusic();
}

function updateCashDisplay() {
    const cashInput = document.querySelector('input[type="number"]');
    if (cashInput) cashInput.value = cashSystem.getCash();
}

// Audio elements
const backgroundMusic = document.getElementById('backgroundMusic');
const zombieDieSound = document.getElementById('zombieDieSound');
const towerShootSound = document.getElementById('towerShootSound');
const waveStartSound = document.getElementById('waveStartSound');
const towerPlaceSound = document.getElementById('towerPlaceSound');
const towerSellSound = document.getElementById('towerSellSound');
const samSpawnSound = document.getElementById('samSpawnSound');
const samDieSound = document.getElementById('samDieSound');
//const glitchHiddenMusic = document.getElementById('glitchHiddenMusic');

document.addEventListener('DOMContentLoaded', () => {
    glitchOverlayEl = document.getElementById('glitchOverlay');
    glitchTextContainerEl = document.getElementById('glitchTextContainer');
    screenFlashEl = document.getElementById('screenFlash');
});

// Set background music volume
backgroundMusic.volume = 0.3;
if (glitchHiddenMusic) {
    glitchHiddenMusic.volume = 0.85;
    glitchHiddenMusic.loop = false;
}

// Function to start background music
function startBackgroundMusic() {
    backgroundMusic.play().catch(error => {
        console.log("Audio play failed:", error);
    });
}

// Function to stop background music
function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

// Add click handler to start music (browsers require user interaction)
document.addEventListener('click', function startAudio() {
    startBackgroundMusic();
    if (glitchHiddenMusic) {
        glitchHiddenMusic.play().then(() => {
            glitchHiddenMusic.pause();
            glitchHiddenMusic.currentTime = 0;
        }).catch(err => {
            console.warn('Hidden music pre-play failed:', err);
        });
    }
    document.removeEventListener('click', startAudio);
});

function toggleAdminMenu() {
    const overlay = document.getElementById('adminMenuOverlay');
    if (!overlay) return;
    
    adminMenuOpen = !adminMenuOpen;
    overlay.style.display = adminMenuOpen ? 'block' : 'none';
}

// Add keyboard shortcut for admin menu
document.addEventListener('keydown', function(event) {
    if (event.key === '`') { // Backtick key
        toggleAdminMenu();
    }
});

function adminAddCash(amount) {
    cashSystem.addCash(amount);
    createCashAnimation(canvas.width / 2, canvas.height / 2, `+$${amount}`);
}

function adminTogglePerformance() {
    const qualities = ['low', 'medium', 'high'];
    const currentIndex = qualities.indexOf(PERFORMANCE.quality);
    const nextQuality = qualities[(currentIndex + 1) % qualities.length];
    PERFORMANCE.setQuality(nextQuality);
    
    // Regenerate snowflakes with new count
    snowflakes = Array(getSnowflakeCount()).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1 + Math.random() * 2,
        size: 1 + Math.random() * 3
    }));
    
    // Update button text
    const btn = document.getElementById('performanceText');
    if (btn) {
        btn.textContent = nextQuality.charAt(0).toUpperCase() + nextQuality.slice(1);
    }
    
    // Show notification
    createCashAnimation(canvas.width / 2, canvas.height / 2, `Performance: ${nextQuality.toUpperCase()}`);
}

function adminSetLives(amount) {
    lives = amount;
}

function adminSkipWave() {
    if (waveInProgress) {
        enemies = [];
        completeWave();
    }
}

function adminSetWave() {
    const overlay = document.getElementById('waveSelectOverlay');
    const wavePreview = document.getElementById('wavePreview');
    const waveDetails = document.getElementById('waveDetails');
    const waveSlider = document.getElementById('waveSlider');
    const waveNumber = document.getElementById('waveNumber');

    // Show the overlay
    overlay.style.display = 'block';

    // Update wave preview function
    function updateWavePreview(selectedWave) {
        waveNumber.textContent = selectedWave;
        
        // Calculate enemy stats for this wave
        const baseEnemies = 8;
        const maxEnemies = 250;
        const enemyCount = Math.min(maxEnemies, Math.floor(baseEnemies + (selectedWave * 1.5)));
        const spawnInterval = Math.max(800, 1500 * Math.pow(0.98, selectedWave - 1));
        const bonus = Math.floor(BASE_WAVE_BONUS * Math.pow(1.08, selectedWave));
        
        // Calculate enemy type probabilities
        let enemyTypes = "Normal";
        if (selectedWave >= 15) {
            enemyTypes = "15% Boss, 25% Tank, 20% Fast, 20% Flying, 20% Normal";
        } else if (selectedWave >= 10) {
            enemyTypes = "30% Tank, 20% Fast, 20% Flying, 30% Normal";
        } else if (selectedWave >= 5) {
            enemyTypes = "40% Fast, 30% Flying, 30% Normal";
        }

        // Update the preview
        wavePreview.innerHTML = `
            <h3 style="color: #4CAF50; margin-bottom: 10px;">Wave ${selectedWave} Preview</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                <p style="margin: 5px 0;">🎯 Enemy Types: ${enemyTypes}</p>
                <p style="margin: 5px 0;">👥 Enemy Count: ${enemyCount}</p>
                <p style="margin: 5px 0;">⚡ Spawn Interval: ${(spawnInterval/1000).toFixed(2)}s</p>
                <p style="margin: 5px 0;">💰 Wave Bonus: $${bonus}</p>
            </div>
        `;

        // Update details with enemy stats
        waveDetails.innerHTML = `
            <h4 style="color: #2196F3; margin: 10px 0;">Enemy Stats</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                ${Object.entries(enemyStats).map(([type, stats]) => `
                    <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px;">
                        <strong style="color: ${
                            type === 'normal' ? '#8bc34a' :
                            type === 'fast' ? '#2196f3' :
                            type === 'tank' ? '#ff9800' :
                            type === 'flying' ? '#03a9f4' :
                            type === 'boss' ? '#e91e63' : '#ffffff'
                        };">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                        <br>HP: ${stats.health}
                        <br>Speed: ${stats.speed}x
                        <br>Value: $${stats.value}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Set up the wave slider
    waveSlider.value = wave;
    waveSlider.addEventListener('input', () => updateWavePreview(parseInt(waveSlider.value)));
    updateWavePreview(wave);
}

function confirmWaveSelection() {
    const waveSlider = document.getElementById('waveSlider');
    const newWave = parseInt(waveSlider.value);
    if (!isNaN(newWave) && newWave > 0) {
        wave = newWave;
        if (waveInProgress) {
            enemies = [];
            completeWave();
        }
    }
    closeWaveSelect();
}

function closeWaveSelect() {
    const overlay = document.getElementById('waveSelectOverlay');
    overlay.style.display = 'none';
}

function adminUpgradeAllTowers() {
    towers.forEach(tower => {
        // Max out all upgrades
        tower.rangeLevel = 3;
        tower.damageLevel = 3;
        tower.fireRateLevel = 3;
        tower.range *= 1.5;
        tower.damage *= 1.5;
        tower.fireRate *= 0.5;
    });
}

function adminRemoveAllTowers() {
    towers = [];
}

function adminToggleGodMode() {
    godMode = !godMode;
    if (godMode) {
        // Store original values
        _originalValues.lives = lives;
        _originalValues.cash = cashSystem.getCash();
        lives = Infinity;
        cashSystem.addCash(1000000 - cashSystem.getCash()); // Set to 1M
    } else {
        // Restore original values
        lives = _originalValues.lives || 100;
        cashSystem.subtractCash(cashSystem.getCash() - _originalValues.cash);
        _originalValues = { lives: null, cash: null };
    }
}

function adminResetGame() {
    if (confirm("Are you sure you want to reset the game?")) {
        // Reset game state
        resetGlitchState();
        wave = 1;
        lives = 100;
        cashSystem.setCash(500);
        towers = [];
        enemies = [];
        bullets = [];
        waveInProgress = false;
        gameStarted = false;
        gameOver = false;
        godMode = false;
        
        // Reset UI
        toggleAdminMenu();
        
        // Start new game
        startGame();
    }
}




// Admin Menu Functions
let godMode = false;
let _originalValues = {
    lives: null,
    cash: null
};

// --- Modifiers System (FULLY OVERHAULED with Buffs/Debuffs) ---
const modifiers = {
    doubleCash: {
        active: false,
        name: '💵 Double Cash',
        shortName: 'Double Cash',
        icon: '💰',
        color: '#4CAF50',
        buffs: [
            '2x cash from kills',
            '2x cash from wave bonuses'
        ],
        debuffs: [
            'Tower upgrades cost 1.5x'
        ]
    },
    doubleSpawn: {
        active: false,
        name: '⚡ Speed Wave',
        shortName: 'Speed Wave',
        icon: '⚡',
        color: '#FF9800',
        buffs: [
            '1.5x tower fire rate',
            '+50% tower range'
        ],
        debuffs: [
            'Enemies spawn 2x faster'
        ]
    },
    beefedUp: {
        active: false,
        name: '🛡️ Beefed Enemies',
        shortName: 'Beefed',
        icon: '🛡️',
        color: '#F44336',
        buffs: [
            '2x damage per shot',
            'Towers cost 30% less'
        ],
        debuffs: [
            'Enemies have +50% health'
        ]
    },
    fastReload: {
        active: false,
        name: '⚡ Fast Reload',
        shortName: 'Fast Reload',
        icon: '🔥',
        color: '#FF5722',
        buffs: [
            '2x tower fire rate',
            'Instant reload'
        ],
        debuffs: [
            '-30% tower damage',
            'Towers cost 2x more'
        ]
    },
    christmas: {
        active: false,
        name: '🎄 Christmas Mode',
        shortName: 'Christmas',
        icon: '❄️',
        color: '#03A9F4',
        buffs: [
            'Winter theme enabled',
            'Festive visuals'
        ],
        debuffs: []
    }
};

// Track hovered modifier for tooltips
let hoveredModifier = null;

// Modifier effect calculators
function getModifiedDamage(baseDamage) {
    let damage = baseDamage;
    
    // Beefed Up: 2x damage
    if (modifiers.beefedUp?.active) {
        damage *= 2;
    }
    
    // Fast Reload: -30% damage
    if (modifiers.fastReload?.active) {
        damage *= 0.7;
    }
    
    return damage;
}

function getModifiedFireRate(baseFireRate) {
    let fireRate = baseFireRate;
    
    // Speed Wave: 1.5x fire rate (divide to shoot faster)
    if (modifiers.doubleSpawn?.active) {
        fireRate /= 1.5;
    }
    
    // Fast Reload: 2x fire rate
    if (modifiers.fastReload?.active) {
        fireRate /= 2;
    }
    
    return fireRate;
}

function getModifiedRange(baseRange) {
    let range = baseRange;
    
    // Speed Wave: +50% range
    if (modifiers.doubleSpawn?.active) {
        range *= 1.5;
    }
    
    return range;
}

function getModifiedTowerCost(baseCost) {
    let cost = baseCost;
    
    // Beefed Up: -30% tower cost
    if (modifiers.beefedUp?.active) {
        cost *= 0.7;
    }
    
    // Fast Reload: 2x tower cost
    if (modifiers.fastReload?.active) {
        cost *= 2;
    }
    
    return Math.floor(cost);
}

function toggleModifier(name) {
    if (!(name in modifiers)) {
        console.warn(`Unknown modifier: ${name}`);
        return;
    }
    
    const modifier = modifiers[name];
    modifier.active = !modifier.active;
    
    // Special handling for Christmas mode
    if (name === 'christmas' && modifier.active) {
        if (glitchModeActive) {
            modifier.active = false;
            createCashAnimation(canvas.width / 2, canvas.height / 2 - 90, '⚠️ Glitch override');
            updateModifierButtons();
            return;
        }
        // Save current theme before switching to winter
        previousTheme = currentTheme;
        currentTheme = THEMES.WINTER;
    } else if (name === 'christmas' && !modifier.active) {
        // Revert to previous theme when disabling Christmas
        currentTheme = previousTheme;
    }
    
    // Update button visual in HTML
    updateModifierButtons();
    
    // Show notification
    const status = modifier.active ? 'ENABLED' : 'DISABLED';
    const color = modifier.active ? modifier.color : '#888';
    createCashAnimation(canvas.width / 2, canvas.height / 2 - 50, `${modifier.icon} ${status}`);
    
    console.log(`Modifier ${name} is now ${modifier.active ? 'ON' : 'OFF'}`);
}

function updateModifierButtons() {
    // Update HTML button states
    const buttonContainer = document.getElementById('modifierButtons');
    if (!buttonContainer) return;
    
    // Find all modifier buttons and update their appearance
    Object.keys(modifiers).forEach(key => {
        const button = Array.from(buttonContainer.children).find(btn => 
            btn.getAttribute('onclick')?.includes(key)
        );
        if (button) {
            const isActive = modifiers[key].active;
            if (isActive) {
                button.style.background = `linear-gradient(135deg, ${modifiers[key].color}88, ${modifiers[key].color}66)`;
                button.style.borderColor = modifiers[key].color;
                button.style.boxShadow = `0 0 15px ${modifiers[key].color}66`;
            } else {
                button.style.background = 'rgba(255, 255, 255, 0.05)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                button.style.boxShadow = 'none';
            }
        }
    });
}

// Draw active modifiers on HUD (BOTTOM LEFT with hover tooltips)
function drawActiveModifiers(ctx) {
    const activeModifiers = Object.entries(modifiers).filter(([_, mod]) => mod.active);
    if (activeModifiers.length === 0) {
        hoveredModifier = null;
        return;
    }

    ctx.save();
    const iconSize = 28;
    const spacing = 4;
    const startX = 10;
    const startY = canvas.height - iconSize - 10;

    // Check mouse hover
    hoveredModifier = null;

    activeModifiers.forEach(([key, mod], index) => {
        const x = startX + (iconSize + spacing) * index;
        const y = startY;

        // Check if mouse is over this icon
        const isHovered = mouseX >= x && mouseX <= x + iconSize &&
                         mouseY >= y && mouseY <= y + iconSize;

        if (isHovered) {
            hoveredModifier = { key, mod, x: x + iconSize/2, y: y - 10 };
        }

        // Draw icon background with subtle glow
        ctx.fillStyle = mod.color + 'CC';
        ctx.beginPath();
        ctx.roundRect(x, y, iconSize, iconSize, 6);
        ctx.fill();

        // Add subtle border
        ctx.strokeStyle = mod.color + '66';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw icon
        ctx.fillStyle = '#FFF';
        ctx.font = `${iconSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mod.icon, x + iconSize/2, y + iconSize/2);

        // Add glow effect when active
        if (PERFORMANCE.useGlow && isHovered) {
            ctx.shadowColor = mod.color;
            ctx.shadowBlur = 8;
            ctx.fillText(mod.icon, x + iconSize/2, y + iconSize/2);
            ctx.shadowBlur = 0;
        }
    });

    // Draw tooltip for hovered modifier
    if (hoveredModifier) {
        drawModifierTooltip(ctx, hoveredModifier);
    }

    ctx.restore();
}

// Draw tooltip showing buffs and debuffs
function drawModifierTooltip(ctx, { mod, x, y }) {
    ctx.save();
    
    const padding = 12;
    const lineHeight = 18;
    const maxWidth = 250;
    
    // Calculate tooltip dimensions
    const buffCount = mod.buffs.length;
    const debuffCount = mod.debuffs.length;
    const totalLines = 1 + buffCount + (debuffCount > 0 ? 1 : 0) + debuffCount;
    const tooltipHeight = totalLines * lineHeight + padding * 2;
    const tooltipWidth = maxWidth;
    
    // Position tooltip above the icons (since they're now at bottom)
    let tooltipX = x - tooltipWidth/2;
    let tooltipY = y - tooltipHeight - 10;
    
    // Ensure tooltip stays on screen
    if (tooltipX < 10) tooltipX = 10;
    if (tooltipX + tooltipWidth > canvas.width - 10) tooltipX = canvas.width - tooltipWidth - 10;
    if (tooltipY < 10) tooltipY = y + 40; // Flip below if near top
    
    // Background
    setShadow(ctx, 'rgba(0, 0, 0, 0.5)', 15);
    ctx.fillStyle = 'rgba(20, 20, 30, 0.98)';
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    clearShadow(ctx);
    
    // Border
    ctx.strokeStyle = mod.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Title
    ctx.fillStyle = mod.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(mod.name, tooltipX + padding, tooltipY + padding + 14);
    
    let currentY = tooltipY + padding + 14 + lineHeight;
    
    // Buffs
    if (buffCount > 0) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '12px Arial';
        mod.buffs.forEach(buff => {
            ctx.fillText(`✓ ${buff}`, tooltipX + padding + 5, currentY);
            currentY += lineHeight;
        });
    }
    
    // Debuffs
    if (debuffCount > 0) {
        ctx.fillStyle = '#F44336';
        ctx.font = '12px Arial';
        mod.debuffs.forEach(debuff => {
            ctx.fillText(`✗ ${debuff}`, tooltipX + padding + 5, currentY);
            currentY += lineHeight;
        });
    }
    
    ctx.restore();
}

// Allow admin to quickly place a strong tower
function startAdminTowerPlacement() {
    selectedTowerType = 'minigunner';
    placingTower = true;
    previewTower = new Tower(mouseX, mouseY, selectedTowerType);
    if (selectedTower) {
        selectedTower.selected = false;
    }
    selectedTower = null;
}

function spawnZombie(type) {
    // Normalize type names to match Enemy class expectations
    if (type === 'superboss') type = 'superBoss';
    const enemy = new Enemy(path, type);
    enemies.push(enemy);
}

function adminSpawnZombie(type) {
    if (cashSystem.getCash() >= getZombieCost(type)) {
        spawnZombie(type);
        cashSystem.subtractCash(getZombieCost(type));
        updateCashDisplay();
    }
}

function getZombieCost(type) {
    if (type === 'superboss') type = 'superBoss';
    const costs = {
        normal: 10,
        fast: 15,
        tank: 25,
        boss: 50,
        flying: 20,
        stun: 15,
        armored: 30,
        berserker: 30,
        emerald: 30,
        splitter: 30,
        superBoss: 100,
        sam: 100,
        bluelol: 200,
        butthurtAF: 300,
        hidden: 40
    };
    return costs[type] || 0;
}

function getZombieEmoji(type) {
    const emojis = {
        normal: "🧟",
        fast: "🏃",
        tank: "🛡️",
        boss: "👑",
        flying: "🦇",
        stun: "⚡",
        armored: "🔰",
        berserker: "🔥",
        emerald: "🩹",
        splitter: "🔪",
        superboss: "👑",
        sam: "👻",
        bluelol: "😈",
        butthurtAF: "👹",
        hidden: "👤"
    };
    return emojis[type] || "🧟";
}

// Add keyboard shortcut for admin menu
document.addEventListener('keydown', function(event) {
    if (event.key === 'z') { // Backtick key
        toggleAdminMenu();
    }
});

function drawAdminMenu() {
    const menuWidth = 300;
    const menuHeight = 600; // Much taller for all buttons
    const menuX = canvas.width - menuWidth - 10;
    const menuY = 10;
    const buttonHeight = 25; // Smaller buttons
    const buttonSpacing = 3; // Tighter spacing

    // Draw menu background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

    // Draw title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Admin Menu', menuX + menuWidth/2, menuY + 20);

    // Draw buttons
    const buttons = [
        { text: 'Add $500', action: () => cashSystem.addCash(500) },
        { text: 'Add Wave', action: () => waveSystem.startNextWave() },
        { text: 'Kill All', action: () => enemies.length = 0 },
        { text: `Quality: ${PERFORMANCE.quality}`, action: () => {
            const qualities = ['low', 'medium', 'high'];
            const currentIndex = qualities.indexOf(PERFORMANCE.quality);
            const nextQuality = qualities[(currentIndex + 1) % qualities.length];
            PERFORMANCE.setQuality(nextQuality);
            snowflakes = Array(getSnowflakeCount()).fill().map(() => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: 1 + Math.random() * 2,
                size: 1 + Math.random() * 3
            }));
        }}
    ];

    // Add theme buttons in a compact row format
    const themeButtons = [
        { text: '🌿', action: () => currentTheme = THEMES.GRASSLAND, theme: 'Grassland' },
        { text: '❄️', action: () => currentTheme = THEMES.WINTER, theme: 'Winter' },
        { text: '🍂', action: () => currentTheme = THEMES.AUTUMN, theme: 'Autumn' },
        { text: '🏜️', action: () => currentTheme = THEMES.DESERT, theme: 'Desert' },
        { text: '🌋', action: () => currentTheme = THEMES.VOLCANO, theme: 'Volcano' },
        { text: '🌊', action: () => currentTheme = THEMES.OCEAN, theme: 'Ocean' },
        { text: '🌙', action: () => currentTheme = THEMES.NIGHT, theme: 'Night' },
        { text: '🍭', action: () => currentTheme = THEMES.CANDY, theme: 'Candy' }
    ];

    buttons.push({ text: 'Themes:', action: () => {}, isHeader: true });

    // Add zombie spawn buttons
    const zombieTypes = ['normal', 'fast', 'tank', 'boss', 'flying', 'stun', 'armored', 'berserker', 'emerald', 'splitter', 'superBoss', 'sam', 'bluelol', 'butthurtAF', 'hidden'];
    buttons.push({ text: 'Spawn Zombies:', action: () => {}, isHeader: true });

    zombieTypes.forEach(type => {
        const emoji = getZombieEmoji(type);
        const cost = getZombieCost(type);
        const displayName = type.charAt(0).toUpperCase() + type.slice(1);
        buttons.push({
            text: `${emoji} ${displayName} $${cost}`,
            action: () => adminSpawnZombie(type),
            isGlitchButton: type === 'bluelol' || type === 'butthurtAF'
        });
    });

    let buttonY = menuY + 30;
    buttons.forEach((button, index) => {
        if (button.isHeader) {
            // Draw section header
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(button.text, menuX + 15, buttonY + 15);
            buttonY += buttonHeight + buttonSpacing;
            return;
        }

        // Special glitching effect for Bluelol and ButthurtAF buttons
        if (button.isGlitchButton && Math.random() < 0.1) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
            ctx.globalAlpha = 0.8 + Math.random() * 0.4;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        }

        ctx.fillRect(menuX + 10, buttonY, menuWidth - 20, buttonHeight);

        // Reset context if we applied glitch effects
        if (button.isGlitchButton && Math.random() < 0.1) {
            ctx.restore();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(menuX + 10, buttonY, menuWidth - 20, buttonHeight);
        }

        // Draw button text
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(button.text, menuX + menuWidth/2, buttonY + 16);

        // Store button data for click handling
        adminButtons[index] = {
            x: menuX + 10,
            y: buttonY,
            width: menuWidth - 20,
            height: buttonHeight,
            action: button.action
        };

        buttonY += buttonHeight + buttonSpacing;
    });

    // Draw theme buttons in a grid at the bottom
    let themeX = menuX + 15;
    let themeY = buttonY + 10;
    themeButtons.forEach((themeBtn, idx) => {
        const isCurrentTheme = currentTheme.name === themeBtn.theme;
        ctx.fillStyle = isCurrentTheme ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(themeX, themeY, 25, 25);

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(themeBtn.text, themeX + 12, themeY + 18);

        adminButtons[buttons.length + idx] = {
            x: themeX,
            y: themeY,
            width: 25,
            height: 25,
            action: themeBtn.action
        };

        themeX += 30;
        if ((idx + 1) % 4 === 0) {
            themeX = menuX + 15;
            themeY += 30;
        }
    });
}

// Game themes - Complete remake with better visuals
const THEMES = {
    GRASSLAND: {
        name: "Grassland",
        icon: "🌿",
        ground: "#7CB342",
        groundAccent: "#9CCC65",
        path: "#8D6E63",
        pathOutline: "#6D4C41",
        cliff: "#A1887F",
        treeColor: "#558B2F",
        treeAccent: "#33691E",
        skyTint: "rgba(135, 206, 250, 0.1)",
        hasSnow: false,
        hasLeaves: true,
        treeLights: false,
        particles: false
    },
    WINTER: {
        name: "Winter Wonderland",
        icon: "❄️",
        ground: "#ECEFF1",
        groundAccent: "#F5F5F5",
        path: "#B0BEC5",
        pathOutline: "#78909C",
        cliff: "#90CAF9",
        treeColor: "#1B5E20",
        treeAccent: "#2E7D32",
        skyTint: "rgba(200, 230, 255, 0.2)",
        hasSnow: true,
        hasLeaves: false,
        treeLights: true,
        particles: 'snow'
    },
    AUTUMN: {
        name: "Autumn Forest",
        icon: "🍂",
        ground: "#D7CCC8",
        groundAccent: "#BCAAA4",
        path: "#8D6E63",
        pathOutline: "#5D4037",
        cliff: "#A1887F",
        treeColor: "#D84315",
        treeAccent: "#BF360C",
        skyTint: "rgba(255, 152, 0, 0.1)",
        hasSnow: false,
        hasLeaves: true,
        treeLights: false,
        particles: 'leaves'
    },
    DESERT: {
        name: "Desert Sands",
        icon: "🏜️",
        ground: "#FFEB3B",
        groundAccent: "#FDD835",
        path: "#FF8F00",
        pathOutline: "#F57C00",
        cliff: "#FFB74D",
        treeColor: "#795548",
        treeAccent: "#5D4037",
        skyTint: "rgba(255, 193, 7, 0.15)",
        hasSnow: false,
        hasLeaves: false,
        treeLights: false,
        particles: false
    },
    VOLCANO: {
        name: "Volcanic Wasteland",
        icon: "🌋",
        ground: "#424242",
        groundAccent: "#616161",
        path: "#D32F2F",
        pathOutline: "#C62828",
        cliff: "#FF5722",
        treeColor: "#212121",
        treeAccent: "#000000",
        skyTint: "rgba(255, 87, 34, 0.2)",
        hasSnow: false,
        hasLeaves: false,
        treeLights: false,
        particles: 'embers'
    },
    OCEAN: {
        name: "Ocean Shore",
        icon: "🌊",
        ground: "#81D4FA",
        groundAccent: "#4FC3F7",
        path: "#FFE082",
        pathOutline: "#FFD54F",
        cliff: "#0277BD",
        treeColor: "#00695C",
        treeAccent: "#004D40",
        skyTint: "rgba(3, 169, 244, 0.15)",
        hasSnow: false,
        hasLeaves: true,
        treeLights: false,
        particles: false
    },
    NIGHT: {
        name: "Moonlit Night",
        icon: "🌙",
        ground: "#263238",
        groundAccent: "#37474F",
        path: "#455A64",
        pathOutline: "#263238",
        cliff: "#546E7A",
        treeColor: "#1B5E20",
        treeAccent: "#33691E",
        skyTint: "rgba(13, 71, 161, 0.3)",
        hasSnow: false,
        hasLeaves: false,
        treeLights: false,
        particles: 'stars'
    },
    CANDY: {
        name: "Candy Land",
        icon: "🍭",
        ground: "#F8BBD0",
        groundAccent: "#FCE4EC",
        path: "#F48FB1",
        pathOutline: "#EC407A",
        cliff: "#CE93D8",
        treeColor: "#AB47BC",
        treeAccent: "#8E24AA",
        skyTint: "rgba(233, 30, 99, 0.1)",
        hasSnow: false,
        hasLeaves: false,
        treeLights: true,
        particles: false
    }
};

let currentTheme = THEMES.GRASSLAND; // Default grassland theme
let previousTheme = THEMES.GRASSLAND; // Track previous theme for Christmas mode

const GLITCH_THEME = {
    name: "Glitch Realm",
    icon: "🌀",
    ground: "#2a0033",
    groundAccent: "#3b0054",
    path: "#c200ff",
    pathOutline: "#7500a8",
    cliff: "#55008f",
    treeColor: "#ff00e6",
    treeAccent: "#a000ff",
    skyTint: "rgba(120, 0, 180, 0.35)",
    hasSnow: false,
    hasLeaves: false,
    treeLights: false,
    particles: false
};

// Theme cycling function for the admin menu button
function changeTheme() {
    if (glitchModeActive) return;
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.findIndex(key => THEMES[key] === currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    currentTheme = THEMES[themeKeys[nextIndex]];
}

// Function to draw the game map
function drawMap() {
  const now = Date.now();
  const glitchPhase = glitchModeActive ? Math.min(1, (now - glitchStartTime) / 1000) : 0;

  ctx.save();

  // Base ground
  ctx.fillStyle = currentTheme.ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (glitchModeActive) {
      const darkness = 0.4 + glitchPhase * 0.25;
      ctx.fillStyle = `rgba(10, 0, 35, ${darkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw cliffs
  cliffTiles.forEach(cliff => {
      const flashEntry = glitchFlashLookup.get(cliff);
      ctx.fillStyle = flashEntry ? flashEntry.color : currentTheme.cliff;
      ctx.fillRect(cliff.x - 20, cliff.y - 20, 40, 40);

      ctx.fillStyle = flashEntry ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(cliff.x - 15, cliff.y - 15, 15, 15);

      if (glitchModeActive) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          if (flashEntry) {
              ctx.fillStyle = flashEntry.color;
          } else {
              ctx.fillStyle = `rgba(${120 + Math.random() * 90}, 0, ${200 + Math.random() * 55}, ${0.18 + Math.random() * 0.25})`;
          }
          ctx.fillRect(cliff.x - 24, cliff.y - 24, 44, 44);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + Math.random() * 0.2})`;
          ctx.fillRect(cliff.x - 20, cliff.y - 28 + Math.random() * 4, 40, 6);
          
          // More violent boss phase effects
          if (glitchBossPhaseActive) {
              // Random color overlays
              ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${40 + Math.random() * 30}%)`;
              ctx.globalAlpha = 0.3 + Math.random() * 0.4;
              ctx.fillRect(cliff.x - 30, cliff.y - 30, 60, 60);
              
              // Distortion lines
              ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
              ctx.lineWidth = 2 + Math.random() * 4;
              ctx.beginPath();
              const numDistortions = 3 + Math.floor(Math.random() * 4);
              for (let i = 0; i < numDistortions; i++) {
                  const startX = cliff.x - 25 + Math.random() * 50;
                  const startY = cliff.y - 25 + Math.random() * 50;
                  const endX = startX + (Math.random() - 0.5) * 40;
                  const endY = startY + (Math.random() - 0.5) * 40;
                  if (i === 0) ctx.moveTo(startX, startY);
                  ctx.lineTo(endX, endY);
              }
              ctx.stroke();
              
              // Random glitch blocks
              ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
              ctx.globalAlpha = 0.2 + Math.random() * 0.3;
              for (let i = 0; i < 5; i++) {
                  const blockX = cliff.x - 20 + Math.random() * 40;
                  const blockY = cliff.y - 20 + Math.random() * 40;
                  const blockW = 5 + Math.random() * 15;
                  const blockH = 3 + Math.random() * 10;
                  ctx.fillRect(blockX, blockY, blockW, blockH);
              }
          }
          
          ctx.restore();
      }
  });

  // Draw path
  ctx.strokeStyle = currentTheme.path;
  ctx.lineWidth = 50;
  ctx.beginPath();
  const firstSegment = path[0];
  ctx.moveTo(firstSegment.params.start.x, firstSegment.params.start.y);
  for (const segment of path) {
      if (segment.type === 'line') {
          ctx.lineTo(segment.params.end.x, segment.params.end.y);
      }
  }
  ctx.stroke();

  if (glitchModeActive) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 56;
      ctx.strokeStyle = `rgba(${140 + Math.random() * 100}, 0, 255, 0.25)`;
      ctx.setLineDash([10, 18]);
      ctx.beginPath();
      ctx.moveTo(firstSegment.params.start.x, firstSegment.params.start.y);
      for (const segment of path) {
          if (segment.type === 'line') {
              ctx.lineTo(segment.params.end.x, segment.params.end.y);
          }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
  }

  // Trees and foliage
  const lightTime = currentTheme.treeLights ? now * 0.001 : 0;
  const numLights = PERFORMANCE.quality === 'low' ? 3 : 6;

  trees.forEach(tree => {
      const flashEntry = glitchFlashLookup.get(tree);
      const fillColor = flashEntry ? flashEntry.color : currentTheme.treeColor;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 20, 0, Math.PI * 2);
      ctx.fill();

      if (glitchModeActive) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          if (flashEntry) {
              ctx.fillStyle = flashEntry.color;
              const glowRadius = 22 + Math.random() * 18;
              ctx.beginPath();
              ctx.arc(tree.x, tree.y, glowRadius, 0, Math.PI * 2);
              ctx.fill();
          } else {
              ctx.fillStyle = `rgba(${150 + Math.random() * 80}, ${Math.random() * 40}, 255, ${0.25 + Math.random() * 0.35})`;
              const glowRadius = 18 + Math.random() * 12;
              ctx.beginPath();
              ctx.arc(tree.x, tree.y, glowRadius, 0, Math.PI * 2);
              ctx.fill();
              for (let i = 0; i < 3; i++) {
                  const sliceY = tree.y - 20 + Math.random() * 40;
                  ctx.fillStyle = `rgba(255, 0, 255, ${0.1 + Math.random() * 0.1})`;
                  ctx.fillRect(tree.x - 18, sliceY, 36, 2);
              }
          }
          
          // More violent boss phase effects for trees
          if (glitchBossPhaseActive) {
              // Multiple overlapping glitch circles
              for (let i = 0; i < 3; i++) {
                  ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${50 + Math.random() * 30}%)`;
                  ctx.globalAlpha = 0.4 + Math.random() * 0.3;
                  const radius = 15 + Math.random() * 25;
                  const offsetX = (Math.random() - 0.5) * 30;
                  const offsetY = (Math.random() - 0.5) * 30;
                  ctx.beginPath();
                  ctx.arc(tree.x + offsetX, tree.y + offsetY, radius, 0, Math.PI * 2);
                  ctx.fill();
              }
              
              // Distortion spikes
              ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
              ctx.lineWidth = 1 + Math.random() * 3;
              ctx.beginPath();
              const numSpikes = 5 + Math.floor(Math.random() * 8);
              for (let i = 0; i < numSpikes; i++) {
                  const angle = (Math.PI * 2 * i) / numSpikes + Math.random() * 0.3;
                  const length = 20 + Math.random() * 30;
                  const endX = tree.x + Math.cos(angle) * length;
                  const endY = tree.y + Math.sin(angle) * length;
                  if (i === 0) ctx.moveTo(tree.x, tree.y);
                  ctx.lineTo(endX, endY);
              }
              ctx.stroke();
              
              // Random glitch pixels
              ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 60%)`;
              ctx.globalAlpha = 0.3 + Math.random() * 0.4;
              for (let i = 0; i < 8; i++) {
                  const pixelX = tree.x - 25 + Math.random() * 50;
                  const pixelY = tree.y - 25 + Math.random() * 50;
                  const pixelSize = 2 + Math.random() * 4;
                  ctx.fillRect(pixelX, pixelY, pixelSize, pixelSize);
              }
              
              // Screen tearing effect
              ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
              ctx.globalAlpha = 0.15 + Math.random() * 0.25;
              const tearCount = 2 + Math.floor(Math.random() * 3);
              for (let i = 0; i < tearCount; i++) {
                  const tearY = tree.y - 15 + Math.random() * 30;
                  const tearWidth = 10 + Math.random() * 20;
                  const tearHeight = 1 + Math.random() * 3;
                  ctx.fillRect(tree.x - tearWidth/2, tearY, tearWidth, tearHeight);
              }
          }
          
          ctx.restore();
      }

      if (currentTheme.treeLights) {
          const colors = ['#ff0000', '#ffff00', '#ff6600'];
          for (let i = 0; i < numLights; i++) {
              const angle = (lightTime + i * (Math.PI * 2 / numLights)) % (Math.PI * 2);
              const radius = 18;
              const lightX = tree.x + Math.cos(angle) * radius;
              const lightY = tree.y + Math.sin(angle) * radius;
              const colorIndex = Math.floor((lightTime * 2 + i) % colors.length);
              ctx.fillStyle = colors[colorIndex];
              ctx.beginPath();
              ctx.arc(lightX, lightY, 3, 0, Math.PI * 2);
              ctx.fill();

              if (PERFORMANCE.useGlow) {
                  ctx.fillStyle = `rgba(255, 255, 0, ${0.1 + 0.1 * Math.sin(lightTime * 3 + i)})`;
                  ctx.beginPath();
                  ctx.arc(lightX, lightY, 6, 0, Math.PI * 2);
                  ctx.fill();
              }
          }
      }
  });

  // Snow
  if (currentTheme.hasSnow) {
    snowflakes.forEach(flake => {
        flake.y += flake.speed;
        if (flake.y > canvas.height) {
            flake.y = 0;
            flake.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = glitchModeActive ? `rgba(255, 255, 255, ${0.35 + Math.random() * 0.25})` : 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
    });
  }

  // Leaves
  if (currentTheme.hasLeaves) {
    trees.forEach(tree => {
        ctx.fillStyle = glitchModeActive ? 'rgba(180, 0, 255, 0.35)' : 'rgba(0, 128, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, 30, 0, Math.PI * 2);
        ctx.fill();
    });
  }

  ctx.restore();

  if (glitchModeActive) {
    ctx.save();
    ctx.globalAlpha = 0.12 + Math.random() * 0.08;
    for (let i = 0; i < 22; i++) {
        const barHeight = 10 + Math.random() * 24;
        const y = (canvas.height / 22) * i + Math.sin(now * 0.006 + i) * 10;
        ctx.fillStyle = `rgba(${120 + Math.random() * 135}, 0, ${200 + Math.random() * 55}, ${0.18 + Math.random() * 0.18})`;
        ctx.fillRect(0, y, canvas.width, barHeight);
    }
    
    // More violent background effects during boss phase
    if (glitchBossPhaseActive) {
        // Random vertical glitch bars
        ctx.globalAlpha = 0.15 + Math.random() * 0.1;
        for (let i = 0; i < 8; i++) {
            const barWidth = 20 + Math.random() * 80;
            const barX = Math.random() * canvas.width;
            const barHeight = canvas.height;
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${30 + Math.random() * 40}%)`;
            ctx.fillRect(barX, 0, barWidth, barHeight);
        }
        
        // Horizontal distortion lines
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 60%)`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.globalAlpha = 0.2 + Math.random() * 0.15;
        for (let i = 0; i < 15; i++) {
            const y = Math.random() * canvas.height;
            const length = 100 + Math.random() * 300;
            const startX = Math.random() * (canvas.width - length);
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + length, y + (Math.random() - 0.5) * 10);
            ctx.stroke();
        }
        
        // Random color flashes
        ctx.globalAlpha = 0.08 + Math.random() * 0.12;
        const numFlashes = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numFlashes; i++) {
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${40 + Math.random() * 30}%)`;
            const flashX = Math.random() * canvas.width;
            const flashY = Math.random() * canvas.height;
            const flashSize = 50 + Math.random() * 150;
            ctx.beginPath();
            ctx.arc(flashX, flashY, flashSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(5, 0, 25, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Additional overlay during boss phase
    if (glitchBossPhaseActive) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${150 + Math.random() * 100}, 0, ${200 + Math.random() * 55}, ${0.1 + Math.random() * 0.05})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();
  }
}

// Optimize: Reduce snowflakes based on performance
const getSnowflakeCount = () => {
    switch(PERFORMANCE.quality) {
        case 'low': return 30;
        case 'medium': return 60;
        default: return 100;
    }
};

let snowflakes = Array(getSnowflakeCount()).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    speed: 1 + Math.random() * 2,
    size: 1 + Math.random() * 3
}));

function spawnByType(type) {
    const enemy = new Enemy(path, type);
    // Per-wave health scaling for difficulty
    let healthScale = wave >= 5 ? Math.pow(1.08, Math.max(0, wave - 5)) : 1;
    if (modifiers.beefedUp?.active) {
        healthScale *= 1.5;
    }
    enemy.maxHealth = Math.round(enemy.maxHealth * healthScale);
    enemy.health = enemy.maxHealth;
    // Update cash value to match scaled health
    enemy.value = Math.round(enemy.maxHealth);
    enemies.push(enemy);
    enemiesSpawned++;
}

function spawnEnemy() {
    // Backward-compatible: if no queue, default to normal
    const type = (waveQueue && waveQueueIndex < waveQueue.length) ? waveQueue[waveQueueIndex++] : 'normal';
    spawnByType(type);
}

function spawnNextEnemyFromQueue() {
    if (waveQueueIndex >= waveQueue.length) return;
    const type = waveQueue[waveQueueIndex++];
    spawnByType(type);
}

// Update wave spawning system
function startWave() {
    if (waveInProgress || glitchModeActive) return;
  
    waveInProgress = true;
    enemiesSpawned = 0;
    intermissionActive = false;
    waveStartTime = Date.now();
    // Reset wave skip flag for this new wave
    waveSkippedThisWave = false;
    // Keep streakDisabledThisWave - it will be reset in completeWave after being checked
    waveEndTime = waveStartTime + waveDurationMs;
    // Reset skip UI for new wave
    skipUI.reset();
    waveQueue = [];
    waveQueueIndex = 0;
    // Wave composition - restructured for better balance
    if (wave === 1) {
        waveQueue = Array(8).fill('normal');
    } else if (wave === 2) {
        waveQueue = Array(10).fill('normal');
    } else {
        const baseCount = Math.max(8, 8 + Math.floor((wave - 2) * 1.5));
        let normals = Math.ceil(baseCount * 0.5);
        let fasts = (wave >= 3) ? Math.floor(baseCount * 0.25) : 0;
        let hiddens = (wave >= 4) ? Math.floor(baseCount * 0.15) : 0;
        let flyings = (wave >= 5) ? Math.floor(baseCount * 0.1) : 0;
        let tanks = (wave >= 7) ? Math.floor(baseCount * 0.1) : 0;
        
        // ensure at least 1 normal
        if (normals < 1) normals = 1;
        
        const types = [];
        types.push(...Array(normals).fill('normal'));
        types.push(...Array(fasts).fill('fast'));
        types.push(...Array(hiddens).fill('hidden'));
        types.push(...Array(flyings).fill('flying'));
        types.push(...Array(tanks).fill('tank'));
        
        // trim or fill to baseCount
        while (types.length > baseCount) types.pop();
        while (types.length < baseCount) types.push('normal');
        
        // Shuffle for variety
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        
        waveQueue = types;
        
        // Boss waves
        if (wave === 8) {
            waveQueue.push('boss');
        } else if (wave === 16) {
            waveQueue.push('boss', 'boss');
        } else if (wave === 24) {
            waveQueue.push('superBoss');
        }
    }
    enemiesPerWave = waveQueue.length;
  
    // Slower spawn rate (apply doubleSpawn modifier)
    let baseInterval = Math.max(700, 1200 * Math.pow(0.98, wave - 1));
    enemySpawnInterval = modifiers.doubleSpawn?.active ? baseInterval / 2 : baseInterval; 
  
    // Play wave start sound
    if (waveStartSound) {
        waveStartSound.currentTime = 0;
        waveStartSound.play().catch(error => {
            console.error('Failed to play wave start sound:', error);
        });
    }
}

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameOver) {
        handleGameOverClick(e);
    } else {
        handleGameClick(x, y);
    }
});

function handleGameClick(x, y) {
    // Skip UI takes priority - handle its clicks first
    if (skipUI.handleClick(x, y)) {
        return; // Click was handled by skip UI
    }

    // Check modern upgrade menu clicks first
    if (modernUpgradeMenu.visible) {
        if (modernUpgradeMenu.isPointInMenu(x, y)) {
            // Click is inside menu, handle menu interactions
            if (modernUpgradeMenu.isPointInCloseButton(x, y)) {
                modernUpgradeMenu.hide();
                selectedTower = null;
                return;
            }
            if (modernUpgradeMenu.isPointInUpgradeButton(x, y)) {
                const tower = modernUpgradeMenu.tower;
                if (tower && tower.level < tower.maxLevel) {
                    const cost = tower.getUpgradeCost();
                    if (cashSystem.getCash() >= cost) {
                        tower.upgrade();
                    }
                }
                return;
            }
            return; // Click was inside menu but not on specific button, consume it
        } else {
            // Click outside menu, close it
            modernUpgradeMenu.hide();
            selectedTower = null;
        }
    }
    // Check for tower placement buttons (new toolbar)
    const towerTypes = ["basic", "machine", "sniper", "hunter", "minigunner", "support"];
    const buttonWidth = UI_TOWER_BTN_WIDTH;
    const spacing = UI_TOWER_SPACING;
    const totalWidth = (buttonWidth + spacing) * towerTypes.length - spacing;
    const startX = (canvas.width - totalWidth) / 2;
    const barY = canvas.height - UI_TOWER_BAR_Y_OFFSET;
    const buttonHeight = UI_TOWER_BTN_HEIGHT;
    if (y > barY && y < barY + buttonHeight) {
        towerTypes.forEach((type, index) => {
            const tx = startX + (buttonWidth + spacing) * index;
            if (x > tx && x < tx + buttonWidth) {
                selectedTowerType = type;
                placingTower = true;
                previewTower = new Tower(x, y, type);
                if (selectedTower) {
                    selectedTower.selected = false;
                    selectedTower = null;
                }
                modernUpgradeMenu.hide();
            }
        });
        return;
    }

    if (selectedTower) {
        let menuX = selectedTower.x + 40;
        let menuY = selectedTower.y - 60;
        const menuWidth = 320;
        const menuHeight = selectedTower.type === 'support' ? 460 : 300;
        
        // Adjust menu position if it would go off screen
        if (menuX + menuWidth > canvas.width) {
            menuX = selectedTower.x - menuWidth;
        }
        if (menuY < 0) {
            menuY = selectedTower.y + menuHeight;
        }

        // Support tower ability clicks
        if (selectedTower.type === 'support' && selectedTower._abilityButtons) {
            for (const btn of selectedTower._abilityButtons) {
                if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                    selectedTower.activateAbility(btn.key);
                    return;
                }
            }
        }

        // Targeting selector clicks
        if (selectedTower._targetBtnRegions) {
            for (const r of selectedTower._targetBtnRegions) {
                if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                    selectedTower.targetingMode = r.mode;
                    return;
                }
            }
        }

        // Check if click is within upgrade button
        const upgradeX = selectedTower.type === 'support' ? (menuX + 16) : (menuX + 12);
        const upgradeW = selectedTower.type === 'support' ? 136 : 160;
        if (x >= upgradeX && x <= upgradeX + upgradeW && 
            y >= menuY + (menuHeight - 50) && y <= menuY + (menuHeight - 14)) {
            if (selectedTower.level < selectedTower.maxLevel) {
                const upgradeCost = selectedTower.getUpgradeCost();
                if (cashSystem.getCash() >= upgradeCost) {
                    selectedTower.upgrade();
                }
            }
            return;
        }
        
        // Check if click is within sell button
        const sellX = selectedTower.type === 'support' ? (menuX + 168) : (menuX + menuWidth - 104);
        const sellW = selectedTower.type === 'support' ? 136 : 92;
        if (x >= sellX && x <= sellX + sellW && 
            y >= menuY + (menuHeight - 50) && y <= menuY + (menuHeight - 14)) {
            selectedTower.sell(); // sell() handles clearing selectedTower
            return;
        }

        // Check if clicking a different tower
        const clickedTower = towers.find(t => 
            Math.hypot(t.x - x, t.y - y) < 20
        );
        
        if (clickedTower && clickedTower !== selectedTower) {
            selectedTower = clickedTower;
        } else if (!clickedTower) {
            selectedTower = null;
        }
        return;
    }

    // Handle tower placement
    if (placingTower) {
        if (towers.length >= getTowerLimit()) {
            alert('Tower limit reached!');
            placingTower = false;
            previewTower = null;
            return;
        }
        if (isValidPlacement(x, y)) {
            const tower = new Tower(x, y, selectedTowerType);
            if (cashSystem.getCash() >= tower.cost) {
                cashSystem.spendCash(tower.cost);
                towers.push(tower);
                if (towerPlaceSound) {
                    towerPlaceSound.currentTime = 0;
                    towerPlaceSound.play();
                }
                // Close modern upgrade menu when placing tower
                modernUpgradeMenu.hide();
            }
        }
        placingTower = false;
        previewTower = null;
        selectedTowerType = null;
        return;
    }

    // Handle tower selection
    const clickedTower = towers.find(t => 
        Math.hypot(t.x - x, t.y - y) < 20
    );
    
    if (clickedTower) {
        selectedTower = clickedTower;
        // Show modern menu for basic towers
        if (useModernUpgradeMenu && clickedTower.type === 'basic') {
            modernUpgradeMenu.show(clickedTower);
        } else {
            modernUpgradeMenu.hide();
        }
    } else {
        selectedTower = null;
        modernUpgradeMenu.hide();
    }
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update mouse position
    mouseX = x;
    mouseY = y;

    // Update preview tower position with snap-to-grid
    if (placingTower && previewTower) {
        if (snapToGridEnabled) {
            const snapped = snapToGrid(x, y);
            previewTower.x = snapped.x;
            previewTower.y = snapped.y;
        } else {
            previewTower.x = x;
            previewTower.y = y;
        }
    }

    // Update cursor for upgrade and sell buttons (match redesigned menu)
    if (selectedTower) {
        let menuX = selectedTower.x + 40;
        let menuY = selectedTower.y - 60;
        const menuWidth = 320;
        const menuHeight = selectedTower.type === 'support' ? 460 : 300;
        
        // Adjust menu position if it would go off screen
        if (menuX + menuWidth > canvas.width) {
            menuX = selectedTower.x - menuWidth;
        }
        if (menuY < 0) {
            menuY = selectedTower.y + menuHeight;
        }

        // Check if mouse is over upgrade or sell buttons
        const upgradeX = selectedTower.type === 'support' ? (menuX + 16) : (menuX + 12);
        const upgradeW = selectedTower.type === 'support' ? 136 : 160;
        const sellX = selectedTower.type === 'support' ? (menuX + 168) : (menuX + menuWidth - 104);
        const sellW = selectedTower.type === 'support' ? 136 : 92;
        
        const overUpgrade = x >= upgradeX && x <= upgradeX + upgradeW && 
                           y >= menuY + (menuHeight - 50) && y <= menuY + (menuHeight - 14);
        const overSell = x >= sellX && x <= sellX + sellW && 
                        y >= menuY + (menuHeight - 50) && y <= menuY + (menuHeight - 14);
        
        // Check if over ability buttons for support tower
        let overAbility = false;
        if (selectedTower.type === 'support' && selectedTower._abilityButtons) {
            for (const btn of selectedTower._abilityButtons) {
                if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                    overAbility = true;
                    break;
                }
            }
        }
        
        // Check if over targeting buttons
        let overTargeting = false;
        if (selectedTower._targetBtnRegions) {
            for (const r of selectedTower._targetBtnRegions) {
                if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                    overTargeting = true;
                    break;
                }
            }
        }
        
        canvas.style.cursor = (overUpgrade || overSell || overAbility || overTargeting) ? 'pointer' : 'default';
    } else {
        // No tower selected - reset cursor to default
        canvas.style.cursor = placingTower ? 'crosshair' : 'default';
    }
});

document.addEventListener('keydown', (e) => {
    // Tower selection hotkeys (1-6)
    const towerTypes = ["basic", "machine", "sniper", "hunter", "minigunner", "support"];
    const keyToIndex = {
        '1': 0, // Basic Tower
        '2': 1, // Machine Tower
        '3': 2, // Sniper Tower
        '4': 3, // Hunter Tower
        '5': 4, // Minigunner Tower
        '6': 5  // Support Tower
    };

    // Toggle snap-to-grid with 'G' key
    if (e.key.toLowerCase() === 'g') {
        snapToGridEnabled = !snapToGridEnabled;
        console.log(`Snap to Grid: ${snapToGridEnabled ? 'ON' : 'OFF'}`);
        return;
    }

    // Cancel tower placement with 'Q' key
    if (e.key.toLowerCase() === 'q' && placingTower) {
        placingTower = false;
        previewTower = null;
        selectedTowerType = null;
        return;
    }

    if (keyToIndex.hasOwnProperty(e.key)) {
        const towerType = towerTypes[keyToIndex[e.key]];
        selectedTowerType = towerType;
        placingTower = true;
        previewTower = new Tower(mouseX, mouseY, towerType);
        if (selectedTower) {
            selectedTower.selected = false;
            selectedTower = null;
        }
    }

    // Tower upgrade/sell hotkeys (only when tower is selected)
    if (selectedTower) {
        // Upgrade with 'E' key
        if (e.key.toLowerCase() === 'e') {
            if (selectedTower.level < selectedTower.maxLevel) {
                const upgradeCost = selectedTower.getUpgradeCost();
                if (cashSystem.getCash() >= upgradeCost) {
                    selectedTower.upgrade();
                }
            }
        }
        // Sell with 'C' key
        else if (e.key.toLowerCase() === 'c') {
            selectedTower.sell(); // sell() handles clearing selectedTower
        }
    }
});

function sellTower(tower) {
    // Calculate sell value (70% of total spent)
    const sellValue = Math.floor(tower.totalSpent * 0.7);
    
    // Add money from selling
    cashSystem.addCash(sellValue);
    
    // Create sell animation
    const particles = [];
    const numParticles = 8;
    const colors = ['#FFD700', '#FFA500', '#FF8C00']; // Gold colors
    
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        particles.push({
            x: tower.x,
            y: tower.y,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            size: 4,
            alpha: 1,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    // Create cash popup animation
    const cashAnim = new CashAnimation(tower.x, tower.y - 20, `+$${sellValue}`);
    animationSystem.add(cashAnim);
    
    // Add particle animation
    const sellAnimation = {
        update() {
            let alive = false;
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha *= 0.95;
                if (p.alpha > 0.1) alive = true;
            });
            return alive;
        },
        draw(ctx) {
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
    };
    
    animationSystem.add(sellAnimation);
    
    // Remove tower from array
    const index = towers.indexOf(tower);
    if (index > -1) {
        towers.splice(index, 1);
    }
}

init();
gameLoop();