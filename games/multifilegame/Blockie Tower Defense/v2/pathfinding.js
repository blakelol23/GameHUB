// ============================================================
//  PATHFINDING.JS  -  Blockie Tower Defense V2
//  Smooth path system: lines, quadratic bezier arcs, full
//  circular arcs. Includes LUT-based distance sampling,
//  point-on-path queries, and tower-placement validation.
// ============================================================

// ── Segment types ────────────────────────────────────────────
// 'line'  : {x1,y1, x2,y2}
// 'quad'  : {ax,ay, cx,cy, bx,by}   quadratic bezier
// 'arc'   : {cx,cy, r, a0,a1}       canvas-compatible arc

// ── Utility ──────────────────────────────────────────────────
function _lerpPt(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ─────────────────────────────────────────────────────────────
//  GamePath
//  Builds from an array of waypoints:
//    { x, y }              normalised 0-1 coords
//    r (optional)          corner-rounding radius (px after scale)
//    arc (optional)        if { cx, cy, r, ccw } use a true arc
// ─────────────────────────────────────────────────────────────
class GamePath {
    constructor(waypoints) {
        this.waypoints = waypoints;
        this.segments  = [];
        this.lut       = [];
        this.totalLen  = 0;
        this.built     = false;
        this._W = 0; this._H = 0;
    }

    build(W, H) {
        this._W = W; this._H = H;
        this.segments = [];
        this.lut      = [];
        this.totalLen = 0;

        const pts = this.waypoints.map(wp => ({
            x:   wp.x * W,
            y:   wp.y * H,
            r:   (wp.r || 0),
            arc: wp.arc ? {
                cx:  wp.arc.cx * W,
                cy:  wp.arc.cy * H,
                r:   wp.arc.r,
                ccw: !!wp.arc.ccw,
            } : null,
        }));

        for (let i = 0; i < pts.length; i++) {
            const A = pts[i];

            // Pure arc waypoint
            if (A.arc) {
                const { cx, cy, r, ccw } = A.arc;
                const a0 = Math.atan2(A.y - cy, A.x - cx);
                // endpoint is next waypoint
                const B  = pts[i + 1];
                const a1 = B ? Math.atan2(B.y - cy, B.x - cx) : a0 + Math.PI * 2;
                this.segments.push({ type: 'arc', cx, cy, r, a0, a1, ccw });
                continue;
            }

            if (i === pts.length - 1) continue; // last non-arc pt

            const B  = pts[i + 1];
            if (B.arc) continue; // B will be handled as arc

            const rA = (i === 0)               ? 0 : A.r;
            const rB = (i === pts.length - 2)  ? 0 : B.r;

            const dx  = B.x - A.x, dy  = B.y - A.y;
            const len = Math.hypot(dx, dy) || 0.001;
            const ux  = dx / len, uy  = dy / len;

            if (rA <= 0 && rB <= 0) {
                this.segments.push({ type: 'line', x1: A.x, y1: A.y, x2: B.x, y2: B.y });
            } else {
                const trimA = Math.min(rA, len * 0.45);
                const trimB = Math.min(rB, len * 0.45);
                const lx1 = A.x + ux * trimA, ly1 = A.y + uy * trimA;
                const lx2 = B.x - ux * trimB, ly2 = B.y - uy * trimB;

                // Corner quad at A (from prev seg end → corner → line start)
                if (rA > 0 && i > 0 && !pts[i - 1].arc) {
                    const P  = pts[i - 1];
                    const dx0 = A.x - P.x, dy0 = A.y - P.y;
                    const len0 = Math.hypot(dx0, dy0) || 0.001;
                    const u0x = dx0 / len0, u0y = dy0 / len0;
                    const trim0 = Math.min(rA, len0 * 0.45);
                    const ax = A.x - u0x * trim0, ay = A.y - u0y * trim0;
                    this.segments.push({ type: 'quad', ax, ay, cx: A.x, cy: A.y, bx: lx1, by: ly1 });
                }

                if (Math.hypot(lx2 - lx1, ly2 - ly1) > 0.5) {
                    this.segments.push({ type: 'line', x1: lx1, y1: ly1, x2: lx2, y2: ly2 });
                }
            }
        }

        this._buildLUT(120);
        this.built = true;
    }

    _buildLUT(steps) {
        if (!this.segments.length) return;
        const first = this._evalSeg(0, 0);
        this.lut = [{ d: 0, x: first.x, y: first.y }];
        let totalD = 0;

        for (let si = 0; si < this.segments.length; si++) {
            for (let k = 1; k <= steps; k++) {
                const t  = k / steps;
                const t0 = (k - 1) / steps;
                const p  = this._evalSeg(si, t);
                const p0 = this._evalSeg(si, t0);
                const dd = Math.hypot(p.x - p0.x, p.y - p0.y);
                totalD += dd;
                this.lut.push({ d: totalD, x: p.x, y: p.y });
            }
        }
        this.totalLen = totalD;
    }

    _evalSeg(si, t) {
        const seg = this.segments[si];
        if (!seg) return { x: 0, y: 0 };

        if (seg.type === 'line') {
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * t,
                y: seg.y1 + (seg.y2 - seg.y1) * t,
            };
        }

        if (seg.type === 'quad') {
            const u = 1 - t;
            return {
                x: u*u*seg.ax + 2*u*t*seg.cx + t*t*seg.bx,
                y: u*u*seg.ay + 2*u*t*seg.cy + t*t*seg.by,
            };
        }

        if (seg.type === 'arc') {
            const { cx, cy, r, a0, a1, ccw } = seg;
            let da = a1 - a0;
            if (ccw) {
                while (da > 0) da -= Math.PI * 2;
            } else {
                while (da < 0) da += Math.PI * 2;
            }
            const a = a0 + da * t;
            return {
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
            };
        }

        return { x: 0, y: 0 };
    }

    // ── Public API ───────────────────────────────────────────

    /** Returns {x, y, angle} at distance d along path */
    getPointAtDist(d) {
        if (!this.lut.length) return { x: 0, y: 0, angle: 0 };
        d = Math.max(0, Math.min(d, this.totalLen));

        let lo = 0, hi = this.lut.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (this.lut[mid].d <= d) lo = mid; else hi = mid;
        }

        const a = this.lut[lo], b = this.lut[Math.min(hi, this.lut.length - 1)];
        const frac = (b.d - a.d > 0.001) ? (d - a.d) / (b.d - a.d) : 0;
        const x = a.x + (b.x - a.x) * frac;
        const y = a.y + (b.y - a.y) * frac;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        return { x, y, angle };
    }

    /** True if (px, py) is within halfWidth of any path segment */
    isNearPath(px, py, halfWidth = 32) {
        // Fast LUT sample check
        const hw2 = halfWidth * halfWidth;
        for (let i = 0; i < this.lut.length; i += 3) {
            const l = this.lut[i];
            const dx = px - l.x, dy = py - l.y;
            if (dx * dx + dy * dy < hw2) return true;
        }
        return false;
    }

    // ── Drawing ──────────────────────────────────────────────

    drawPath(ctx, theme) {
        if (!this.segments.length) return;
        ctx.save();

        // Wide road
        ctx.shadowColor = theme.pathGlow || 'rgba(0,0,0,0.2)';
        ctx.shadowBlur  = 18;
        ctx.strokeStyle = theme.path;
        ctx.lineWidth   = 52;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        this._strokeAll(ctx);

        // Edge scrolling dashes
        ctx.shadowBlur     = 0;
        ctx.strokeStyle    = theme.pathEdge || 'rgba(255,255,255,0.07)';
        ctx.lineWidth      = 1.5;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -(Date.now() * 0.025) % 20;
        this._strokeAll(ctx);
        ctx.setLineDash([]);

        // Centre line
        ctx.strokeStyle = theme.pathCenter || 'rgba(255,255,255,0.04)';
        ctx.lineWidth   = 1;
        this._strokeAll(ctx);

        ctx.restore();
    }

    _strokeAll(ctx) {
        ctx.beginPath();
        let started = false;
        for (const seg of this.segments) {
            if (seg.type === 'line') {
                if (!started) { ctx.moveTo(seg.x1, seg.y1); started = true; }
                ctx.lineTo(seg.x2, seg.y2);
            } else if (seg.type === 'quad') {
                if (!started) { ctx.moveTo(seg.ax, seg.ay); started = true; }
                ctx.quadraticCurveTo(seg.cx, seg.cy, seg.bx, seg.by);
            } else if (seg.type === 'arc') {
                if (!started) {
                    const s = this._evalSeg(this.segments.indexOf(seg), 0);
                    ctx.moveTo(s.x, s.y);
                    started = true;
                }
                ctx.arc(seg.cx, seg.cy, seg.r, seg.a0, seg.a1, seg.ccw);
            }
        }
        ctx.stroke();
    }

    /** Draw animated directional arrows along path */
    drawArrows(ctx) {
        if (!this.lut.length) return;
        const spacing = 110;
        const offset  = (Date.now() * 0.04) % spacing;
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle   = 'rgba(255,255,255,0.7)';
        for (let d = offset; d < this.totalLen; d += spacing) {
            const p = this.getPointAtDist(d);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.moveTo(7, 0);
            ctx.lineTo(-5, -5);
            ctx.lineTo(-3, 0);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }
}

// Export alias
const Path = GamePath;
