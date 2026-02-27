// Glitch Mode System
// Contains all glitch mode functionality

// Glitch mode variables
let glitchModeActive = false;
let glitchStartTime = 0;
let glitchTowerLimitBoost = 0;
let glitchTowerLimit = 50;
let glitchWaveTimerInfinite = false;
let glitchPhase = 'idle';
let glitchPhaseStart = 0;
let glitchGoodLuckActive = false;
let glitchMessagesLocked = false;
let glitchBossFooterMessages = [];
let glitchMessageTimeouts = [];
let glitchTimeouts = [];
let glitchBossTimerId = null;
let glitchMoneyBonus = 0;
let glitchUIShake = 0;
let glitchUICycle = 0;
let glitchSuperBossCooldown = 0;
let glitchBossPhaseActive = false;
let glitchBossIntroDisplayed = false;
let glitchBossEnemies = new Set();
let glitchStoredWaveState = null;
let glitchOriginalTheme = null;
let glitchFlashEntries = [];
let glitchFlashLookup = new Map();
let glitchFlashLastPulse = 0;
let glitchHiddenMusic = document.getElementById('glitchHiddenMusic');
let glitchBossMusic = document.getElementById('glitchBossMusic');
let glitchHordeMusic = null;
let arenaChaosLevel = 0;
let glitchBossSupportTimerId = null;
let glitchBossFlashTimerId = null;

// Additional missing variables
let screenFlashEl = null;

// Glitch mode functions
function activateGlitchProtocol() {
    if (glitchModeActive) return;

    glitchModeActive = true;
    glitchStartTime = Date.now();
    glitchTowerLimitBoost = 120;
    glitchTowerLimit = MAX_TOWERS + glitchTowerLimitBoost;
    glitchWaveTimerInfinite = true;
    waveEndTime = Infinity;
    stopBackgroundMusic();
    if (glitchHiddenMusic) {
        glitchHiddenMusic.pause();
        glitchHiddenMusic.currentTime = 0;
        requestAnimationFrame(() => {
            glitchHiddenMusic.play().catch(err => {
                console.warn('Failed to start glitchHiddenMusic on activate:', err);
            });
        });
    }

    scheduleGlitchTimeout(() => {
        if (!glitchModeActive) return;
        startGlitchMessageSequence();
    }, 25000);

    scheduleGlitchTimeout(() => {
        if (!glitchModeActive) return;
        startGlitchOnslaught();
    }, 32000);

    glitchBossTimerId = scheduleGlitchTimeout(() => {
        if (!glitchModeActive || glitchBossPhaseActive) return;
        startGlitchBossPhase();
    }, 270000);

    cashSystem.addCash(2000000);
    glitchMoneyBonus += 2000000;

    glitchOriginalTheme = glitchOriginalTheme || currentTheme;
    currentTheme = GLITCH_THEME;

    addGlitchShake(36);
    triggerScreenFlash();

    // Stop waves and enemies entirely
    enemies = [];
    enemiesSpawned = 0;
    waveInProgress = false;
    waveQueue = [];
    waveQueueIndex = 0;
    intermissionActive = false;
    waveEndTime = null;
    intermissionEndTime = 0;
    lastEnemySpawn = Date.now();
    glitchStoredWaveState = {
        waveInProgress,
        enemiesSpawned,
        waveQueue: [...waveQueue],
        waveQueueIndex,
        enemiesPerWave,
        waveEndTime
    };
    if (Array.isArray(bullets)) bullets.length = 0;
    if (typeof projectiles !== 'undefined' && Array.isArray(projectiles)) projectiles.length = 0;
    if (typeof enemyProjectiles !== 'undefined' && Array.isArray(enemyProjectiles)) enemyProjectiles.length = 0;
    if (typeof particles !== 'undefined' && Array.isArray(particles)) particles.length = 0;
    if (typeof waveTimer !== 'undefined') waveTimer = null;
    if (typeof intermissionTimer !== 'undefined') intermissionTimer = null;

    if (adminMenuOpen) {
        adminMenuOpen = false;
        const overlay = document.getElementById('adminMenuOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // Disable Christmas modifier visuals
    if (modifiers.christmas && modifiers.christmas.active) {
        modifiers.christmas.active = false;
        updateModifierButtons();
    }

    if (glitchTextContainerEl) glitchTextContainerEl.innerHTML = '';
    if (glitchOverlayEl) glitchOverlayEl.classList.add('active');
    startGlitchMessageSequence();
    startGlitchFooterSequence();

    updateCashDisplay();
}

function displayGoodLuckMessage() {
    // Create dramatic "GOOD LUCK" message with glitch effects
    const message = "GOOD LUCK";
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Add screen flash
    triggerScreenFlash();

    // Create particle burst effect
    const particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: centerX + (Math.random() - 0.5) * 200,
            y: centerY + (Math.random() - 0.5) * 200,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            size: 3 + Math.random() * 4,
            alpha: 1,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            life: 120
        });
    }

    const goodLuckMessage = {
        startTime: Date.now(),
        duration: 7000, // 7 seconds total
        particles: particles,

        update() {
            const elapsed = Date.now() - this.startTime;
            const progress = elapsed / this.duration;

            // Update particles
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha = Math.max(0, p.alpha - 0.02);
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.size *= 0.995;
                p.life--;
            });

            // Remove dead particles
            this.particles = this.particles.filter(p => p.life > 0);

            return elapsed < this.duration;
        },

        draw(ctx) {
            const elapsed = Date.now() - this.startTime;
            const progress = elapsed / this.duration;

            // Draw particles
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw "GOOD LUCK" text with glitch effects
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Pulsing and shaking effect
            const shake = Math.sin(elapsed * 0.01) * 3;
            const scale = 1 + Math.sin(elapsed * 0.008) * 0.1;
            const glowIntensity = 0.5 + Math.sin(elapsed * 0.005) * 0.3;

            ctx.translate(centerX + shake, centerY + shake);
            ctx.scale(scale, scale);

            // Outer glow
            ctx.shadowColor = `hsl(${elapsed * 0.5 % 360}, 100%, 70%)`;
            ctx.shadowBlur = 30 * glowIntensity;
            ctx.fillStyle = `hsl(${elapsed * 0.3 % 360}, 100%, 80%)`;
            ctx.font = 'bold 60px "Courier New"';
            ctx.fillText(message, 0, 0);

            // Inner text with color cycling
            ctx.shadowBlur = 0;
            ctx.fillStyle = `hsl(${elapsed * 0.8 % 360}, 100%, 90%)`;
            ctx.font = 'bold 58px "Courier New"';
            ctx.fillText(message, 0, 0);

            // Add glitch lines
            if (Math.random() < 0.3) {
                ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-150, Math.random() * 100 - 50);
                ctx.lineTo(150, Math.random() * 100 - 50);
                ctx.stroke();
            }

            ctx.restore();
        }
    };

    animationSystem.add(goodLuckMessage);
}

function startGlitchOnslaught() {
    // Epic transition to enemy spawning
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Massive screen flash
    triggerScreenFlash();
    addGlitchShake(20);

    // Start the wave with dramatic effects
    waveInProgress = true;
    enemiesSpawned = 0;
    lastEnemySpawn = Date.now() - 500; // Start spawning immediately
    intermissionActive = false;

    // Set up glitch wave composition - mix of high-level enemies
    const baseCount = Math.max(20, 15 + Math.floor((wave - 1) * 2)); // More enemies than normal
    let normals = Math.floor(baseCount * 0.2);
    let fasts = Math.floor(baseCount * 0.25);
    let tanks = Math.floor(baseCount * 0.2);
    let flyings = Math.floor(baseCount * 0.15);
    let bosses = Math.floor(baseCount * 0.1);
    let hiddens = Math.floor(baseCount * 0.1);

    // Ensure at least some enemies
    if (normals < 3) normals = 3;

    waveQueue = [];
    waveQueue.push(...Array(normals).fill('normal'));
    waveQueue.push(...Array(fasts).fill('fast'));
    waveQueue.push(...Array(tanks).fill('tank'));
    waveQueue.push(...Array(flyings).fill('flying'));
    waveQueue.push(...Array(bosses).fill('boss'));
    waveQueue.push(...Array(hiddens).fill('hidden'));

    // Shuffle for variety
    for (let i = waveQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [waveQueue[i], waveQueue[j]] = [waveQueue[j], waveQueue[i]];
    }

    enemiesPerWave = waveQueue.length;
    waveQueueIndex = 0;

    // Very fast spawning for the onslaught
    enemySpawnInterval = 200; // Much faster than normal

    // Create shockwave effect
    const shockwave = {
        radius: 0,
        maxRadius: Math.max(canvas.width, canvas.height),
        startTime: Date.now(),
        duration: 2000,

        update() {
            const elapsed = Date.now() - this.startTime;
            this.radius = (elapsed / this.duration) * this.maxRadius;
            return elapsed < this.duration;
        },

        draw(ctx) {
            ctx.save();
            ctx.strokeStyle = `hsl(${Date.now() * 0.5 % 360}, 100%, 70%)`;
            ctx.lineWidth = 8;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = `hsl(${Date.now() * 0.3 % 360}, 100%, 90%)`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    };

    animationSystem.add(shockwave);

    // Create particle explosion
    const explosionParticles = [];
    for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        explosionParticles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            alpha: 1,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            life: 180
        });
    }

    const particleExplosion = {
        particles: explosionParticles,

        update() {
            let alive = false;
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha *= 0.98;
                p.vx *= 0.99;
                p.vy *= 0.99;
                p.size *= 0.998;
                p.life--;
                if (p.life > 0) alive = true;
            });
            return alive;
        },

        draw(ctx) {
            this.particles.forEach(p => {
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

    animationSystem.add(particleExplosion);

    // Show "THE ONSLAUGHT BEGINS" message briefly
    const onslaughtMessage = {
        startTime: Date.now(),
        duration: 3000,

        update() {
            return Date.now() - this.startTime < this.duration;
        },

        draw(ctx) {
            const elapsed = Date.now() - this.startTime;
            const alpha = elapsed < 500 ? elapsed / 500 :
                         elapsed > 2500 ? (3000 - elapsed) / 500 : 1;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 40px "Courier New"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glitch effect
            if (Math.random() < 0.2) {
                ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
            }

            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.fillText('THE ONSLAUGHT BEGINS', centerX, centerY + 100);
            ctx.restore();
        }
    };

    animationSystem.add(onslaughtMessage);
}

// Placeholder functions for glitch boss phase (to be implemented)
function startGlitchBossPhase() {
    // TODO: Implement glitch boss phase
}

function resetGlitchState() {
    if (!glitchModeActive && glitchTowerLimit === MAX_TOWERS) {
        clearGlitchTimeouts();
        hideGlitchOverlay();
        return;
    }

    glitchModeActive = false;
    glitchWaveTimerInfinite = false;
    glitchTowerLimitBoost = 0;
    glitchTowerLimit = MAX_TOWERS;
    glitchMoneyBonus = 0;
    glitchUIShake = 0;
    glitchUICycle = 0;
    glitchPhase = 'idle';
    glitchPhaseStart = 0;
    glitchGoodLuckActive = false;
    glitchSuperBossCooldown = 0;
    glitchMessageTimeouts.length = 0;
    glitchTimeouts.length = 0;
    glitchBossTimerId = null;
    cancelGlitchBossSupport();
    glitchBossFooterMessages = [];
    arenaChaosLevel = 0;
    glitchBossPhaseActive = false;
    glitchBossIntroDisplayed = false;
    glitchBossEnemies.clear();
    glitchStoredWaveState = null;
    clearGlitchMessageTimeouts();
    clearGlitchTimeouts();
    hideGlitchOverlay();
    resetGlitchFooter();
    if (glitchOriginalTheme) {
        currentTheme = glitchOriginalTheme;
        glitchOriginalTheme = null;
    }
    glitchFlashEntries = [];
    glitchFlashLookup.clear();
    glitchFlashLastPulse = 0;
    stopGlitchBossMusic();
    stopGlitchHordeMusic();
    if (glitchHiddenMusic) {
        glitchHiddenMusic.pause();
        glitchHiddenMusic.currentTime = 0;
    }
    glitchHiddenMusic = document.getElementById('glitchHiddenMusic');
    glitchBossMusic = document.getElementById('glitchBossMusic') || glitchBossMusic;
    startBackgroundMusic();
}

// Helper functions
function scheduleGlitchTimeout(callback, delay) {
    const timeoutId = setTimeout(callback, delay);
    glitchTimeouts.push(timeoutId);
    return timeoutId;
}

function clearGlitchTimeouts() {
    glitchTimeouts.forEach(id => clearTimeout(id));
    glitchTimeouts.length = 0;
}

function clearGlitchMessageTimeouts() {
    glitchMessageTimeouts.forEach(id => clearTimeout(id));
    glitchMessageTimeouts.length = 0;
}

function clearGlitchFlash() {
    glitchFlashEntries = [];
    glitchFlashLookup.clear();
}

function addGlitchShake(intensity) {
    glitchUIShake = Math.max(glitchUIShake, intensity);
}

function cancelGlitchBossSupport() {
    // TODO: Implement boss support cancellation
}

function hideGlitchOverlay() {
    if (glitchOverlayEl) glitchOverlayEl.classList.remove('active');
}

function resetGlitchFooter() {
    // TODO: Implement footer reset
}

function stopGlitchBossMusic() {
    if (glitchBossMusic) {
        glitchBossMusic.pause();
        glitchBossMusic.currentTime = 0;
    }
}

function stopGlitchHordeMusic() {
    if (glitchHordeMusic) {
        glitchHordeMusic.pause();
        glitchHordeMusic.currentTime = 0;
    }
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

function startGlitchFooterSequence() {
    // TODO: Implement footer sequence
}

function skipGlitchBossWait() {
    if (glitchBossTimerId) {
        clearTimeout(glitchBossTimerId);
        glitchBossTimerId = null;
        startGlitchBossPhase();
    }
}



