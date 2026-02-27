// ============================================================
//  MAPS.JS  -  Blockie Tower Defense V2
//  6 Maps: Greenfield, Desert, Frozen Circuit, Magma Ring,
//          Neon Labyrinth, The Abyss
// ============================================================

const THEMES = {
    grassland: {
        sky:'#111a11', ground:'#243822', path:'#9c8060', pathEdge:'rgba(255,230,180,.1)',
        pathGlow:'rgba(90,60,20,.35)', pathCenter:'rgba(255,255,255,.03)',
        tree:'#1d4d1d', treeHL:'#2e7a2e', cliff:'#5a4a3a', accent:'#4CAF50',
        ambient:'leaves'
    },
    desert: {
        sky:'#1e1408', ground:'#b07030', path:'#d8b870', pathEdge:'rgba(255,250,200,.1)',
        pathGlow:'rgba(200,140,40,.35)', pathCenter:'rgba(255,255,255,.03)',
        tree:'#6b4a1a', treeHL:'#8b6a2a', cliff:'#9a6030', accent:'#FF9800',
        ambient:'sand'
    },
    ice: {
        sky:'#0a1522', ground:'#8ab0c8', path:'#c0dff2', pathEdge:'rgba(200,230,255,.15)',
        pathGlow:'rgba(80,160,240,.3)', pathCenter:'rgba(255,255,255,.05)',
        tree:'#3a6a8a', treeHL:'#5a9aba', cliff:'#6a9ab2', accent:'#4FC3F7',
        ambient:'snow'
    },
    volcanic: {
        sky:'#140500', ground:'#231007', path:'#442010', pathEdge:'rgba(255,90,0,.15)',
        pathGlow:'rgba(255,60,0,.4)', pathCenter:'rgba(255,100,0,.04)',
        tree:'#3a1205', treeHL:'#5a2008', cliff:'#6a2808', accent:'#FF5722',
        ambient:'embers'
    },
    neon: {
        sky:'#06060f', ground:'#0d0d1e', path:'#1a1a35', pathEdge:'rgba(80,180,255,.22)',
        pathGlow:'rgba(100,80,255,.45)', pathCenter:'rgba(0,255,200,.06)',
        tree:'#0a1530', treeHL:'#1030a0', cliff:'#1a1a40', accent:'#00e5ff',
        ambient:'sparks'
    },
    abyss: {
        sky:'#04030e', ground:'#07050f', path:'#140b28', pathEdge:'rgba(180,80,255,.18)',
        pathGlow:'rgba(140,40,255,.45)', pathCenter:'rgba(200,100,255,.05)',
        tree:'#120525', treeHL:'#280a55', cliff:'#1a0835', accent:'#e040fb',
        ambient:'void'
    },
};

const MAP_DEFS = [
    {
        id:'greenfield', name:'Greenfield Run', difficulty:'Easy', diffClass:'diff-easy',
        desc:'A winding meadow path. Great for learning the ropes.',
        theme:THEMES.grassland, startLives:100, startCash:650, diffMult:1.0,
        waypoints:[
            {x:0,    y:.38, r:0},
            {x:.20,  y:.38, r:50},
            {x:.20,  y:.75, r:50},
            {x:.45,  y:.75, r:50},
            {x:.45,  y:.25, r:50},
            {x:.70,  y:.25, r:50},
            {x:.70,  y:.68, r:50},
            {x:.88,  y:.68, r:40},
            {x:1.0,  y:.68, r:0},
        ],
        props:[
            {type:'tree',x:.08,y:.58},{type:'tree',x:.12,y:.54},{type:'tree',x:.10,y:.64},
            {type:'tree',x:.30,y:.50},{type:'tree',x:.34,y:.46},{type:'tree',x:.28,y:.55},
            {type:'tree',x:.55,y:.48},{type:'tree',x:.60,y:.44},{type:'tree',x:.57,y:.55},
            {type:'tree',x:.82,y:.44},{type:'tree',x:.85,y:.50},
            {type:'rock',x:.06,y:.20},{type:'rock',x:.92,y:.85},{type:'rock',x:.48,y:.88},
        ],
    },
    {
        id:'desert', name:'Dust Bowl Canyon', difficulty:'Medium', diffClass:'diff-medium',
        desc:'Sweeping arcs through sun-baked desert canyons. More turns to manage.',
        theme:THEMES.desert, startLives:80, startCash:700, diffMult:1.15,
        waypoints:[
            {x:0,    y:.50, r:0},
            {x:.15,  y:.50, r:55},
            {x:.15,  y:.18, r:55},
            {x:.50,  y:.18, r:55},
            {x:.50,  y:.50, r:45},
            {x:.50,  y:.82, r:45},
            {x:.82,  y:.82, r:55},
            {x:.82,  y:.50, r:55},
            {x:.82,  y:.18, r:55},
            {x:1.0,  y:.18, r:0},
        ],
        props:[
            {type:'rock',x:.04,y:.32},{type:'rock',x:.07,y:.38},{type:'rock',x:.03,y:.42},
            {type:'rock',x:.32,y:.50},{type:'rock',x:.35,y:.54},
            {type:'tree',x:.66,y:.34},{type:'tree',x:.68,y:.40},
            {type:'rock',x:.93,y:.33},{type:'rock',x:.96,y:.36},
            {type:'rock',x:.65,y:.65},{type:'rock',x:.68,y:.70},
        ],
    },
    {
        id:'frozen', name:'Frozen Circuit', difficulty:'Hard', diffClass:'diff-hard',
        desc:'A icy racetrack that loops wide then funnels through a tight central cross.',
        theme:THEMES.ice, startLives:65, startCash:750, diffMult:1.30,
        waypoints:[
            {x:0,    y:.50, r:0},
            {x:.14,  y:.50, r:55},
            {x:.14,  y:.12, r:55},
            {x:.50,  y:.12, r:55},
            {x:.86,  y:.12, r:55},
            {x:.86,  y:.50, r:55},
            {x:.86,  y:.88, r:55},
            {x:.50,  y:.88, r:55},
            {x:.14,  y:.88, r:55},
            {x:.14,  y:.62, r:50},
            {x:.38,  y:.62, r:45},
            {x:.38,  y:.38, r:45},
            {x:.62,  y:.38, r:45},
            {x:.62,  y:.62, r:45},
            {x:.86,  y:.62, r:40},
            {x:1.0,  y:.62, r:0},
        ],
        props:[
            {type:'rock',x:.04,y:.05},{type:'rock',x:.92,y:.05},
            {type:'rock',x:.92,y:.93},{type:'rock',x:.04,y:.93},
            {type:'tree',x:.50,y:.50},{type:'tree',x:.52,y:.54},
            {type:'rock',x:.26,y:.26},{type:'rock',x:.74,y:.26},
            {type:'rock',x:.74,y:.74},{type:'rock',x:.26,y:.74},
        ],
    },
    {
        id:'volcanic', name:'Magma Ring', difficulty:'Expert', diffClass:'diff-expert',
        desc:'A giant outer loop around the caldera then a harrowing dash through the heart.',
        theme:THEMES.volcanic, startLives:50, startCash:800, diffMult:1.55,
        waypoints:[
            {x:0,    y:.50, r:0},
            {x:.10,  y:.50, r:70},
            {x:.10,  y:.10, r:70},
            {x:.50,  y:.10, r:70},
            {x:.90,  y:.10, r:70},
            {x:.90,  y:.50, r:70},
            {x:.90,  y:.90, r:70},
            {x:.50,  y:.90, r:70},
            {x:.10,  y:.90, r:70},
            {x:.10,  y:.66, r:55},
            {x:.32,  y:.66, r:50},
            {x:.32,  y:.35, r:50},
            {x:.50,  y:.35, r:45},
            {x:.68,  y:.35, r:50},
            {x:.68,  y:.66, r:50},
            {x:.90,  y:.66, r:45},
            {x:1.0,  y:.66, r:0},
        ],
        props:[
            {type:'rock',x:.50,y:.50},{type:'rock',x:.48,y:.54},{type:'rock',x:.52,y:.46},
            {type:'rock',x:.02,y:.04},{type:'rock',x:.96,y:.04},
            {type:'rock',x:.02,y:.94},{type:'rock',x:.96,y:.94},
            {type:'rock',x:.22,y:.22},{type:'rock',x:.78,y:.22},
            {type:'rock',x:.22,y:.78},{type:'rock',x:.78,y:.78},
        ],
    },
    {
        id:'neon', name:'Neon Labyrinth', difficulty:'Hard', diffClass:'diff-hard',
        desc:'A cyberpunk city grid with tight corridors. No breathing room.',
        theme:THEMES.neon, startLives:70, startCash:725, diffMult:1.35,
        waypoints:[
            {x:0,    y:.25, r:0},
            {x:.18,  y:.25, r:35},
            {x:.18,  y:.75, r:35},
            {x:.36,  y:.75, r:35},
            {x:.36,  y:.25, r:35},
            {x:.54,  y:.25, r:35},
            {x:.54,  y:.75, r:35},
            {x:.72,  y:.75, r:35},
            {x:.72,  y:.25, r:35},
            {x:.90,  y:.25, r:35},
            {x:.90,  y:.75, r:35},
            {x:1.0,  y:.75, r:0},
        ],
        props:[
            {type:'building',x:.08,y:.50},{type:'building',x:.27,y:.50},
            {type:'building',x:.45,y:.50},{type:'building',x:.63,y:.50},
            {type:'building',x:.81,y:.50},
            {type:'light',x:.18,y:.10},{type:'light',x:.36,y:.10},
            {type:'light',x:.54,y:.10},{type:'light',x:.72,y:.10},
            {type:'light',x:.18,y:.90},{type:'light',x:.36,y:.90},
            {type:'light',x:.54,y:.90},{type:'light',x:.72,y:.90},
        ],
    },
    {
        id:'abyss', name:'The Abyss', difficulty:'Extreme', diffClass:'diff-extreme',
        desc:'Concentric spirals of pure darkness. Only the finest commanders survive.',
        theme:THEMES.abyss, startLives:40, startCash:900, diffMult:1.80,
        waypoints:[
            {x:0,    y:.50, r:0},
            {x:.08,  y:.50, r:75},
            {x:.08,  y:.08, r:75},
            {x:.92,  y:.08, r:75},
            {x:.92,  y:.92, r:75},
            {x:.08,  y:.92, r:75},
            {x:.08,  y:.72, r:55},
            {x:.22,  y:.72, r:55},
            {x:.22,  y:.28, r:55},
            {x:.78,  y:.28, r:55},
            {x:.78,  y:.72, r:55},
            {x:.22,  y:.72, r:45},
            {x:.22,  y:.50, r:45},
            {x:.38,  y:.50, r:40},
            {x:.38,  y:.35, r:40},
            {x:.62,  y:.35, r:40},
            {x:.62,  y:.65, r:40},
            {x:.38,  y:.65, r:35},
            {x:.38,  y:.50, r:35},
            {x:1.0,  y:.50, r:0},
        ],
        props:[
            {type:'crystal',x:.50,y:.50},{type:'crystal',x:.46,y:.54},
            {type:'crystal',x:.54,y:.46},
            {type:'crystal',x:.04,y:.04},{type:'crystal',x:.94,y:.04},
            {type:'crystal',x:.04,y:.95},{type:'crystal',x:.94,y:.95},
            {type:'crystal',x:.15,y:.50},{type:'crystal',x:.85,y:.50},
        ],
    },
];

//  Active map state 
let currentMap  = null;
let currentPath = null;
let builtProps  = [];

function loadMap(mapId, W, H) {
    const def = MAP_DEFS.find(m => m.id === mapId);
    if (!def) return;
    currentMap  = def;
    currentPath = new GamePath(def.waypoints);
    currentPath.build(W, H);

    builtProps = def.props.map(p => ({
        type: p.type, x: p.x * W, y: p.y * H,
    }));

    initAmbient(W, H);
}

//  Map drawing 
function drawMap(ctx, W, H) {
    if (!currentMap || !currentPath) return;
    const t = currentMap.theme;

    // Ground
    ctx.fillStyle = t.ground;
    ctx.fillRect(0, 0, W, H);

    // Subtle vignette
    const vg = ctx.createRadialGradient(W/2,H/2,H*.2, W/2,H/2,H*.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Path
    currentPath.drawPath(ctx, t);

    // Directional arrows
    currentPath.drawArrows(ctx);

    // Ambient
    drawAmbient(ctx);

    // Props
    for (const prop of builtProps) drawProp(ctx, prop, t);

    // Start / End markers
    const start = currentPath.getPointAtDist(0);
    const end   = currentPath.getPointAtDist(currentPath.totalLen);
    drawMarker(ctx, start.x, start.y, '#66BB6A', '\u25B6 START');
    drawMarker(ctx, end.x,   end.y,   '#EF5350', 'END');
}

function drawProp(ctx, prop, theme) {
    switch (prop.type) {
        case 'tree':     drawTree(ctx, prop.x, prop.y, theme); break;
        case 'rock':     drawRock(ctx, prop.x, prop.y, theme); break;
        case 'building': drawBuilding(ctx, prop.x, prop.y, theme); break;
        case 'light':    drawLight(ctx, prop.x, prop.y, theme); break;
        case 'crystal':  drawCrystal(ctx, prop.x, prop.y, theme); break;
    }
}

function drawTree(ctx, x, y, t) {
    ctx.save();
    const px = x | 0, py = y | 0;
    const ISO = 4; // isometric face offset

    // ── Ground shadow ellipse ─────────────────────────────────
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(px + 4, py + 30, 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Trunk ─────────────────────────────────────────────────
    const tw = 7, th = 22;
    const tx = px - (tw >> 1), ty = py + 7;

    // Right face
    ctx.fillStyle = '#251005';
    ctx.beginPath();
    ctx.moveTo(tx + tw,         ty);
    ctx.lineTo(tx + tw + ISO,   ty - 2);
    ctx.lineTo(tx + tw + ISO,   ty + th - 2);
    ctx.lineTo(tx + tw,         ty + th);
    ctx.closePath(); ctx.fill();

    // Front face with wood grain texture
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(tx + 2, ty + 2, 1, th - 4);
    ctx.fillRect(tx + 5, ty + 1, 1, th - 4);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(tx, ty, 1, th);

    // Top face
    ctx.fillStyle = '#7a4820';
    ctx.beginPath();
    ctx.moveTo(tx,          ty);
    ctx.lineTo(tx + tw,     ty);
    ctx.lineTo(tx + tw + ISO, ty - 2);
    ctx.lineTo(tx + ISO,    ty - 2);
    ctx.closePath(); ctx.fill();

    // ── Canopy — 4 stacked blocks, sharply tapering ───────────
    // [ width, height, xOffset, yOffset (from py) ]
    const layers = [
        [38, 16,  0,  1 ],  // base  — wide, dark
        [30, 14,  2, -12],  // lower-mid
        [22, 13,  4, -24],  // upper-mid
        [14, 11,  6, -34],  // crown — narrow, bright
    ];

    for (let li = 0; li < layers.length; li++) {
        const [lw, lh, ox, oy] = layers[li];
        const lx = px - (lw >> 1) + ox;
        const ly = py + oy;
        const dark = (layers.length - 1 - li) * 0.13;  // bottom layers darker

        const front = _adjustColor(t.treeHL, -dark);
        const side  = _adjustColor(t.tree,   -(dark + 0.2));
        const top   = _adjustColor(t.treeHL,  0.22 - dark);

        // AO bottom strip
        ctx.fillStyle = side;
        ctx.fillRect(lx, ly + lh - 3, lw, 3);

        // Front face
        ctx.fillStyle = front;
        ctx.fillRect(lx, ly, lw, lh - 3);

        // Leaf texture: deterministic bright specks
        ctx.fillStyle = _adjustColor(t.treeHL, 0.18 - dark);
        const seed = (px * 7 + py * 13 + li * 17) | 0;
        const dots = 4 + li * 2;
        for (let d = 0; d < dots; d++) {
            const dx2 = ((seed * (d + 3) * 2531 + 1337) % (lw - 6)) + 3;
            const dy2 = ((seed * (d + 7) * 1913 + 997)  % (lh - 6)) + 2;
            ctx.fillRect(lx + dx2, ly + dy2, 2, 2);
        }

        // Left shadow strip
        ctx.fillStyle = side;
        ctx.fillRect(lx, ly, 3, lh);

        // Right face (isometric)
        ctx.fillStyle = side;
        ctx.beginPath();
        ctx.moveTo(lx + lw,       ly);
        ctx.lineTo(lx + lw + ISO, ly - ISO * 0.5);
        ctx.lineTo(lx + lw + ISO, ly + lh - ISO * 0.5);
        ctx.lineTo(lx + lw,       ly + lh);
        ctx.closePath(); ctx.fill();

        // Top face
        ctx.fillStyle = top;
        ctx.beginPath();
        ctx.moveTo(lx,            ly);
        ctx.lineTo(lx + lw,       ly);
        ctx.lineTo(lx + lw + ISO, ly - ISO * 0.5);
        ctx.lineTo(lx + ISO,      ly - ISO * 0.5);
        ctx.closePath(); ctx.fill();

        // Top-left highlight bevel
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        ctx.fillRect(lx + ISO + 2, ly - ISO * 0.5, 10, 3);

        // Pixel outline
        ctx.strokeStyle = 'rgba(0,0,0,.22)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(lx, ly, lw, lh);
    }

    ctx.restore();
}

// Helper to adjust color brightness
function _adjustColor(hex, amount) {
    try {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        const f = 1 + amount;
        const nr = Math.max(0, Math.min(255, (r * f)|0));
        const ng = Math.max(0, Math.min(255, (g * f)|0));
        const nb = Math.max(0, Math.min(255, (b * f)|0));
        return `rgb(${nr},${ng},${nb})`;
    } catch(_) { return hex; }
}

function drawRock(ctx, x, y, t) {
    ctx.save();
    const fc = t.cliff;
    const tc = _adjustColor(t.cliff,  0.28);   // top bright
    const rc = _adjustColor(t.cliff, -0.35);   // right dark

    // ── Ground shadow ─────────────────────────────────────────
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 16, 21, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Small back rock ──────────────────────────────────────
    ctx.fillStyle = _adjustColor(fc, -0.14);
    ctx.beginPath();
    ctx.moveTo(x + 5,  y + 14);
    ctx.lineTo(x + 9,  y + 4);
    ctx.lineTo(x + 19, y + 2);
    ctx.lineTo(x + 23, y + 14);
    ctx.closePath(); ctx.fill();
    // back rock top face
    ctx.fillStyle = _adjustColor(tc, -0.12);
    ctx.beginPath();
    ctx.moveTo(x + 9,  y + 4);
    ctx.lineTo(x + 10, y + 1);
    ctx.lineTo(x + 20, y - 0.5);
    ctx.lineTo(x + 19, y + 2);
    ctx.closePath(); ctx.fill();

    // ── Main rock: front face ─────────────────────────────────
    ctx.fillStyle = fc;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 15);
    ctx.lineTo(x - 14, y - 6);
    ctx.lineTo(x - 3,  y - 18);
    ctx.lineTo(x + 9,  y - 16);
    ctx.lineTo(x + 17, y - 3);
    ctx.lineTo(x + 18, y + 15);
    ctx.closePath(); ctx.fill();

    // Mid-tone sub-face (left slope / crevasse)
    ctx.fillStyle = _adjustColor(fc, 0.07);
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 15);
    ctx.lineTo(x - 10, y - 1);
    ctx.lineTo(x - 4,  y - 11);
    ctx.lineTo(x + 2,  y - 10);
    ctx.lineTo(x + 2,  y + 15);
    ctx.closePath(); ctx.fill();

    // ── Top face ──────────────────────────────────────────────
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 6);
    ctx.lineTo(x - 3,  y - 18);
    ctx.lineTo(x + 9,  y - 16);
    ctx.lineTo(x + 17, y - 3);
    ctx.lineTo(x + 9,  y - 1);
    ctx.lineTo(x - 2,  y - 4);
    ctx.closePath(); ctx.fill();

    // ── Right face ───────────────────────────────────────────
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.moveTo(x + 17, y - 3);
    ctx.lineTo(x + 23, y - 6);
    ctx.lineTo(x + 23, y + 12);
    ctx.lineTo(x + 18, y + 15);
    ctx.closePath(); ctx.fill();

    // ── Specular highlight (top-left sparkle) ─────────────────
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.moveTo(x - 2,  y - 16);
    ctx.lineTo(x + 4,  y - 18);
    ctx.lineTo(x + 5,  y - 13);
    ctx.lineTo(x,      y - 11);
    ctx.closePath(); ctx.fill();

    // ── Crack detail lines ─────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,0,0,.32)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(x - 2, y - 4);  ctx.lineTo(x + 4, y + 5);  ctx.lineTo(x + 2, y + 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y - 14); ctx.lineTo(x + 10,y - 6);  ctx.stroke();
    // top edge seam
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.moveTo(x + 17, y - 3); ctx.lineTo(x + 9, y - 1); ctx.lineTo(x - 2, y - 4); ctx.stroke();

    // ── Outer outline ─────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 15); ctx.lineTo(x - 14, y - 6);
    ctx.lineTo(x - 3,  y - 18); ctx.lineTo(x + 9,  y - 16);
    ctx.lineTo(x + 17, y - 3);  ctx.lineTo(x + 18, y + 15);
    ctx.closePath(); ctx.stroke();

    ctx.restore();
}

function drawBuilding(ctx, x, y, t) {
    ctx.save();
    const w = 26, h = 46;
    const bx = x - w / 2, by = y - h;
    const tw = 6; // iso top width offset

    // ── Right face (darker) ───────────────────────────────────
    ctx.fillStyle = _adjustColor('#0d1228', -0.15);
    ctx.beginPath();
    ctx.moveTo(bx + w, by);
    ctx.lineTo(bx + w + tw, by - 4);
    ctx.lineTo(bx + w + tw, by + h - 4);
    ctx.lineTo(bx + w, by + h);
    ctx.closePath(); ctx.fill();

    // ── Top face (slightly lighter) ───────────────────────────
    ctx.fillStyle = '#1a2040';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + w, by);
    ctx.lineTo(bx + w + tw, by - 4);
    ctx.lineTo(bx + tw, by - 4);
    ctx.closePath(); ctx.fill();

    // ── Front face ────────────────────────────────────────────
    ctx.fillStyle = '#0d1228';
    ctx.fillRect(bx, by, w, h);

    // Neon accent line (bottom base)
    ctx.fillStyle = t.accent + 'cc';
    ctx.fillRect(bx - 1, by + h - 3, w + 2, 3);

    // Neon trim lines
    ctx.strokeStyle = t.accent + '55';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, w, h);
    // Horizontal accent strips
    ctx.strokeStyle = t.accent + '33';
    for (let fl = 0; fl < 4; fl++) {
        ctx.beginPath();
        ctx.moveTo(bx, by + 10 + fl * 9);
        ctx.lineTo(bx + w, by + 10 + fl * 9);
        ctx.stroke();
    }

    // ── Windows (glowing) ─────────────────────────────────────
    const wCols = 2, wRows = 5;
    const wpw = 7, wph = 5;
    const wgx = (w - wCols * wpw - (wCols-1) * 3) / 2;
    const wgy = 5;
    const now = Date.now();
    for (let row = 0; row < wRows; row++) {
        for (let col = 0; col < wCols; col++) {
            // Animate some windows flickering
            const seed = (x * 97 + y * 31 + row * 7 + col * 13) % 100;
            const on = (now * 0.0004 + seed) % 1.0 > 0.18;
            if (!on && Math.random() < 0.02) continue; // rare flicker off
            const wx2 = bx + wgx + col * (wpw + 3);
            const wy2 = by + wgy + row * (wph + 4);
            ctx.shadowColor = t.accent;
            ctx.shadowBlur  = on ? 8 : 2;
            ctx.fillStyle   = on ? t.accent + 'cc' : t.accent + '44';
            ctx.fillRect(wx2, wy2, wpw, wph);
        }
    }
    ctx.shadowBlur = 0;

    // Right-face windows (iso right)
    for (let row = 0; row < 3; row++) {
        const wy2 = by + 8 + row * 12;
        ctx.fillStyle = t.accent + '33';
        ctx.beginPath();
        ctx.moveTo(bx + w + 1,      wy2);
        ctx.lineTo(bx + w + tw - 1, wy2 - (tw-2)*.6);
        ctx.lineTo(bx + w + tw - 1, wy2 - (tw-2)*.6 + 4);
        ctx.lineTo(bx + w + 1,      wy2 + 4);
        ctx.closePath(); ctx.fill();
    }

    // Rooftop antenna
    ctx.strokeStyle = t.accent + '88';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by - 12); ctx.stroke();
    ctx.fillStyle = t.accent;
    ctx.shadowColor = t.accent; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, by - 12, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
}

function drawLight(ctx, x, y, t) {
    ctx.save();

    // ── Pole ──────────────────────────────────────────────────
    // Base block
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(x - 3, y + 4, 6, 6);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(x - 3, y + 4, 2, 6); // left shadow
    // Pole
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 32); ctx.stroke();
    ctx.strokeStyle = '#888899';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 1, y + 4); ctx.lineTo(x - 1, y - 32); ctx.stroke();

    // ── Arm ───────────────────────────────────────────────────
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 32);
    ctx.lineTo(x + 14, y - 32);
    ctx.lineTo(x + 14, y - 26);
    ctx.stroke();

    // ── Light bulb ────────────────────────────────────────────
    ctx.shadowColor = t.accent;
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = t.accent;
    ctx.beginPath(); ctx.arc(x + 14, y - 24, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(x + 12, y - 26, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;

    // ── Light cone ────────────────────────────────────────────
    const cone = ctx.createRadialGradient(x + 14, y - 24, 2, x + 14, y - 24, 38);
    cone.addColorStop(0, t.accent + '55');
    cone.addColorStop(0.4, t.accent + '22');
    cone.addColorStop(1, t.accent + '00');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 24);
    ctx.lineTo(x - 6,  y + 14);
    ctx.lineTo(x + 34, y + 14);
    ctx.closePath(); ctx.fill();

    ctx.restore();
}

function drawCrystal(ctx, x, y, t) {
    ctx.save();
    const now = Date.now();
    const pulse = 1 + 0.06 * Math.sin(now * 0.0018 + x * 0.04);
    const h = (24 + Math.sin(now * 0.0009 + x * 0.05) * 4) * pulse;

    ctx.shadowColor = t.accent;
    ctx.shadowBlur  = 18;

    // ── Front face ────────────────────────────────────────────
    ctx.fillStyle   = t.accent + 'cc';
    ctx.beginPath();
    ctx.moveTo(x,     y - h);
    ctx.lineTo(x + 9, y + 5);
    ctx.lineTo(x,     y + 10);
    ctx.lineTo(x - 9, y + 5);
    ctx.closePath(); ctx.fill();

    // ── Right face (darker) ───────────────────────────────────
    ctx.fillStyle   = _adjustColor(t.accent, -0.35) + 'aa';
    ctx.beginPath();
    ctx.moveTo(x,     y - h);
    ctx.lineTo(x + 9, y + 5);
    ctx.lineTo(x + 14, y + 2);
    ctx.lineTo(x + 5,  y - h + 4);
    ctx.closePath(); ctx.fill();

    // ── Inner bright face ─────────────────────────────────────
    ctx.fillStyle   = t.accent + '55';
    ctx.beginPath();
    ctx.moveTo(x,     y - h * 0.4);
    ctx.lineTo(x + 5, y + 5);
    ctx.lineTo(x,     y + 10);
    ctx.lineTo(x - 5, y + 5);
    ctx.closePath(); ctx.fill();

    // ── Specular highlight ────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(x - 1, y - h * 0.95);
    ctx.lineTo(x + 2, y - h * 0.6);
    ctx.lineTo(x - 2, y - h * 0.5);
    ctx.closePath(); ctx.fill();

    // ── Small base crystal ────────────────────────────────────
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = t.accent + '66';
    ctx.beginPath();
    ctx.moveTo(x + 7,  y - 8);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 7,  y + 8);
    ctx.lineTo(x + 2,  y + 4);
    ctx.closePath(); ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.restore();
}

function drawMarker(ctx, x, y, color, label) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2);
    ctx.fillStyle = color + '33'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = color;
    ctx.font = 'bold 9px "Segoe UI", Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y - 15);
    ctx.restore();
}

//  Ambient particles 
let ambientParticles = [];

function _mkAmbient(W, H, random) {
    const type = currentMap?.theme?.ambient;
    if (!type) return null;
    const base = {
        type, life: 1, maxLife: 1,
        x: random ? Math.random() * W : (type === 'sand' ? -10 : (type === 'embers' ? Math.random() * W : Math.random() * W)),
        y: random ? Math.random() * H : (type === 'embers' ? H + 5 : (type === 'sand' ? H / 2 + (Math.random()-0.5)*H*.5 : -5)),
    };
    switch (type) {
        case 'snow':   return { ...base, vx:(Math.random()-.5)*18,  vy:22+Math.random()*32, size:1.5+Math.random()*3,  alpha:.45+Math.random()*.4 };
        case 'embers': return { ...base, vx:(Math.random()-.5)*35,  vy:-(28+Math.random()*55), size:1.2+Math.random()*2.8, alpha:.5+Math.random()*.5, color:Math.random()>.5?'#FF5722':'#FF9800', fl:Math.random()*Math.PI*2 };
        case 'leaves': return { ...base, vx:10+Math.random()*22,    vy:14+Math.random()*20,  rot:Math.random()*6.28, rotV:(Math.random()-.5)*4, size:4+Math.random()*5, alpha:.45+Math.random()*.35, color:Math.random()>.5?'#7CB342':'#C0CA33' };
        case 'sand':   return { ...base, vx:55+Math.random()*30,    vy:(Math.random()-.5)*14, size:.8+Math.random()*2,  alpha:.15+Math.random()*.25 };
        case 'sparks': return { ...base, vx:(Math.random()-.5)*60,  vy:(Math.random()-.5)*60, size:.8+Math.random()*2,  alpha:.6+Math.random()*.4, color:Math.random()>.5?'#00e5ff':'#7c4dff', life:0.4+Math.random()*.6, maxLife:undefined };
        case 'void':   return { ...base, vx:(Math.random()-.5)*20,  vy:(Math.random()-.5)*20, size:1+Math.random()*3,   alpha:.3+Math.random()*.5, color:Math.random()>.5?'#e040fb':'#7c4dff', fl:Math.random()*Math.PI*2 };
        default: return null;
    }
}

function initAmbient(W, H) {
    ambientParticles = [];
    const t = currentMap?.theme?.ambient;
    if (!t) return;
    const count = {snow:90, embers:55, leaves:45, sand:75, sparks:60, void:50}[t] || 40;
    for (let i = 0; i < count; i++) {
        const p = _mkAmbient(W, H, true);
        if (p) { if (!p.maxLife) p.maxLife = p.life; ambientParticles.push(p); }
    }
}

function updateAmbient(dt, W, H) {
    const t = currentMap?.theme?.ambient;
    if (!t) return;
    for (let i = ambientParticles.length - 1; i >= 0; i--) {
        const p = ambientParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.rot !== undefined) p.rot += p.rotV * dt;
        if (p.fl !== undefined)  p.fl  += dt * 9;
        if (p.life !== undefined && p.maxLife !== undefined) {
            if (t === 'sparks' || t === 'void') p.life -= dt / p.maxLife * 0.5;
        }
        const dead = p.y > H + 15 || p.y < -20 || p.x > W + 15 || p.x < -15 ||
                     (p.life !== undefined && p.life <= 0);
        if (dead) {
            const n = _mkAmbient(W, H, false);
            if (n) { if (!n.maxLife) n.maxLife = n.life; ambientParticles[i] = n; }
        }
    }
}

function drawAmbient(ctx) {
    if (!ambientParticles.length) return;
    ctx.save();
    for (const p of ambientParticles) {
        const t = p.type;
        let alpha = p.alpha;
        if (t === 'embers') alpha *= 0.4 + 0.6 * Math.abs(Math.sin(p.fl));
        if (t === 'sparks' || t === 'void') alpha *= p.life;
        ctx.globalAlpha = Math.max(0, alpha);

        if (t === 'snow') {
            ctx.fillStyle = '#d8eeff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        } else if (t === 'embers') {
            ctx.shadowColor = p.color; ctx.shadowBlur = 5;
            ctx.fillStyle   = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        } else if (t === 'leaves') {
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
            ctx.restore();
        } else if (t === 'sand') {
            ctx.fillStyle = '#e0b060';
            ctx.fillRect(p.x, p.y, p.size*1.8, p.size*.5);
        } else if (t === 'sparks' || t === 'void') {
            ctx.shadowColor = p.color; ctx.shadowBlur = 8;
            ctx.fillStyle   = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

//  Map preview (for select screen) 
function renderMapPreview(canvas, mapDef) {
    // ── Canvas setup (HiDPI) ─────────────────────────────────────────
    const DPR   = Math.min(window.devicePixelRatio || 1, 2);
    const CSS_W = Math.max(canvas.offsetWidth || 280, 160);
    const CSS_H = 150;
    canvas.width        = CSS_W * DPR;
    canvas.height       = CSS_H * DPR;
    canvas.style.width  = CSS_W + 'px';
    canvas.style.height = CSS_H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // ── Reference game dimensions & scale ────────────────────────────
    // Build the path + props at a fixed reference size so the 52px path
    // width and all prop pixel sizes stay proportionally correct.
    const REF_W = 800, REF_H = 500;
    const sx = CSS_W / REF_W;
    const sy = CSS_H / REF_H;

    const tmp = new GamePath(mapDef.waypoints);
    tmp.build(REF_W, REF_H);
    const t = mapDef.theme;

    // ── Ground fill ──────────────────────────────────────────────────
    ctx.fillStyle = t.ground;
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    // Subtle terrain grid texture
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 0.8;
    const gs = 22;
    for (let gx = 0; gx < CSS_W; gx += gs) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CSS_H); ctx.stroke();
    }
    for (let gy = 0; gy < CSS_H; gy += gs) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CSS_W, gy); ctx.stroke();
    }
    ctx.restore();

    // ── Scaled game-space rendering ──────────────────────────────────
    ctx.save();
    ctx.scale(sx, sy);

    // Path (line width / curves are proportionally correct in ref space)
    tmp.drawPath(ctx, t);

    // Props — at ref coords, slightly shrunk so they don't crowd the preview
    const PS = 0.72;
    for (const p of mapDef.props) {
        const px = p.x * REF_W;
        const py = p.y * REF_H;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(PS, PS);
        switch (p.type) {
            case 'tree':     drawTree(ctx,     0, 0, t); break;
            case 'rock':     drawRock(ctx,     0, 0, t); break;
            case 'crystal':  drawCrystal(ctx,  0, 0, t); break;
            case 'building': drawBuilding(ctx, 0, 0, t); break;
            case 'light':    drawLight(ctx,    0, 0, t); break;
        }
        ctx.restore();
    }

    ctx.restore(); // undo game-space scale

    // ── Vignette ─────────────────────────────────────────────────────
    const vg = ctx.createRadialGradient(
        CSS_W * 0.5, CSS_H * 0.5, CSS_H * 0.1,
        CSS_W * 0.5, CSS_H * 0.5, CSS_H * 1.0
    );
    vg.addColorStop(0,   'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    vg.addColorStop(1,   'rgba(0,0,0,0.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    // Bottom gradient — blends into card info section below
    const bg2 = ctx.createLinearGradient(0, CSS_H * 0.55, 0, CSS_H);
    bg2.addColorStop(0, 'rgba(0,0,0,0)');
    bg2.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = bg2;
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    // ── Start / End markers ──────────────────────────────────────────
    const _dot = (wx, wy, color) => {
        const mx = wx * sx, my = wy * sy;
        ctx.save();
        // Halo
        ctx.globalAlpha = 0.45;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = color;
        ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.fill();
        // Solid dot
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 10;
        ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2); ctx.fill();
        // White core
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    };
    const sPos = tmp.getPointAtDist(0);
    const ePos = tmp.getPointAtDist(tmp.totalLen);
    _dot(sPos.x, sPos.y, '#66BB6A');
    _dot(ePos.x, ePos.y, '#EF5350');

    // ── Top accent bar ───────────────────────────────────────────────
    const ab = ctx.createLinearGradient(0, 0, CSS_W, 0);
    ab.addColorStop(0,    t.accent + '00');
    ab.addColorStop(0.12, t.accent + 'ee');
    ab.addColorStop(0.88, t.accent + 'ee');
    ab.addColorStop(1,    t.accent + '00');
    ctx.fillStyle = ab;
    ctx.fillRect(0, 0, CSS_W, 2.5);
}
