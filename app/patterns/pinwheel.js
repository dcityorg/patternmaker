// --- Pinwheel Pattern ---
// Each tile has a central node disc with curved arms reaching the tile-edge
// midpoints. Adjacent tiles' arms meet perpendicular at edges, forming
// continuous S-curves between centers (when swirl direction matches).
export const name = "Pinwheel";

// --- PRNG (mulberry32) ---
function mulberry32(a) {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// --- Sutherland-Hodgman polygon clipping ---
function clipPoly(poly, x0, y0, x1, y1) {
    let output = poly;
    const clips = [
        { inside: p => p[0] >= x0, intersect: (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; } },
        { inside: p => p[0] <= x1, intersect: (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; } },
        { inside: p => p[1] >= y0, intersect: (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y0]; } },
        { inside: p => p[1] <= y1, intersect: (a, b) => { const t = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y1]; } },
    ];
    for (const { inside, intersect } of clips) {
        if (output.length === 0) break;
        const input = output;
        output = [];
        for (let i = 0; i < input.length; i++) {
            const curr = input[i];
            const prev = input[(i - 1 + input.length) % input.length];
            if (inside(curr)) {
                if (!inside(prev)) output.push(intersect(prev, curr));
                output.push(curr);
            } else if (inside(prev)) {
                output.push(intersect(prev, curr));
            }
        }
    }
    return output;
}

// --- Disc polygon ---
function discPoly(cx, cy, r, N) {
    const pts = [];
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

// --- Polygon to SVG path ---
function polyToPath(pts) {
    if (pts.length < 3) return "";
    let d = "M" + pts[0][0].toFixed(2) + "," + pts[0][1].toFixed(2);
    for (let i = 1; i < pts.length; i++) {
        d += "L" + pts[i][0].toFixed(2) + "," + pts[i][1].toFixed(2);
    }
    return d + "Z";
}

// --- Build one arm as a closed polygon ---
// cx, cy   : tile/hex center
// R        : node-disc radius
// ex, ey   : tile-edge midpoint (where arm exits)
// theta    : angle from center to (ex,ey)
// dist     : distance from center to (ex,ey)
// W        : arm band width
// swirl    : 0..1 (0 = straight, 1 = max curl)
// dir      : +1 (CW in screen coords) or -1 (CCW)
function armPoly(cx, cy, R, ex, ey, theta, dist, W, swirl, dir, tipFrac) {
    // Disc-side P0 rotated around disc by swirl, sign by per-edge dir
    const swirlAng = swirl * Math.PI * 0.5;
    const startAng = theta + dir * swirlAng;
    const startR = R * (1 - tipFrac);
    const P0x = cx + startR * Math.cos(startAng);
    const P0y = cy + startR * Math.sin(startAng);

    // Exit tangent — sign by per-edge dir. Both adjacent tiles compute the same
    // dir for this shared edge (via edgeHash), so tangents match at the seam.
    const exitSwirlAng = swirl * Math.PI * 0.4;
    const exitAng = theta - dir * exitSwirlAng;
    const T3x = Math.cos(exitAng);
    const T3y = Math.sin(exitAng);

    // Quadratic Bezier from P0 to P3 with Q1 on the line through P3 along -T3.
    const chordLen = Math.hypot(ex - P0x, ey - P0y) || 1;
    const h = chordLen * 0.55;
    const Q1x = ex - T3x * h;
    const Q1y = ey - T3y * h;

    // Sample centerline
    const N = 28;
    const samples = new Array(N + 1);
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        const x = mt * mt * P0x + 2 * mt * t * Q1x + t * t * ex;
        const y = mt * mt * P0y + 2 * mt * t * Q1y + t * t * ey;
        samples[i] = [x, y];
    }

    // Width taper from min (at disc end) to full (at tile edge).
    // At tipFrac=0: minWidthFrac=0 → classic taper-to-point look.
    // At tipFrac=1: minWidthFrac=0.4 → arm has substantial body at the disc-side cap;
    //              combined with P0 at disc center, the disc fully covers the cap.
    const minWidthFrac = tipFrac * 0.4;
    const halfW = W / 2;
    const left = new Array(samples.length);
    const right = new Array(samples.length);
    const lastIdx = samples.length - 1;
    for (let i = 0; i < samples.length; i++) {
        const t = i / lastIdx;
        const s = t * t * (3 - 2 * t);
        const localHW = halfW * (minWidthFrac + (1 - minWidthFrac) * s);

        let tx, ty;
        if (i === lastIdx) {
            // Endpoint at tile edge — force tangent to exact T3 for perfect tiling
            tx = T3x;
            ty = T3y;
        } else if (i === 0) {
            tx = samples[1][0] - samples[0][0];
            ty = samples[1][1] - samples[0][1];
        } else {
            tx = samples[i + 1][0] - samples[i - 1][0];
            ty = samples[i + 1][1] - samples[i - 1][1];
        }
        const len = Math.hypot(tx, ty) || 1;
        const nx = -ty / len;
        const ny = tx / len;
        left[i] = [samples[i][0] + nx * localHW, samples[i][1] + ny * localHW];
        right[i] = [samples[i][0] - nx * localHW, samples[i][1] - ny * localHW];
    }

    // Closed polygon: left forward, right reversed
    const poly = left.slice();
    for (let i = right.length - 1; i >= 0; i--) poly.push(right[i]);
    return poly;
}

// --- Hex helpers (flat-top, matching hexgrid.js) ---
// Computes actual edge midpoints from the hex vertices. Works for non-regular
// hexes (when a !== b·2/√3 due to canvas aspect ratio) — the 4 diagonal mids
// are at (±3a/4, ±b/2), not at the angles you'd get from a regular hex.
function hexEdgeMids(cx, cy, a, b) {
    const verts = [
        [cx + a, cy],
        [cx + a / 2, cy + b],
        [cx - a / 2, cy + b],
        [cx - a, cy],
        [cx - a / 2, cy - b],
        [cx + a / 2, cy - b],
    ];
    const mids = [];
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        const mx = (verts[i][0] + verts[j][0]) / 2;
        const my = (verts[i][1] + verts[j][1]) / 2;
        const dx = mx - cx;
        const dy = my - cy;
        mids.push({ x: mx, y: my, theta: Math.atan2(dy, dx), dist: Math.hypot(dx, dy) });
    }
    return mids;
}

// --- Apply rotation/flip transform to a polygon (in-place) ---
function transformPoly(poly, w, h, flipH, flipV) {
    if (!flipH && !flipV) return poly;
    for (let i = 0; i < poly.length; i++) {
        if (flipH) poly[i][0] = w - poly[i][0];
        if (flipV) poly[i][1] = h - poly[i][1];
    }
    if (flipH !== flipV) poly.reverse(); // single flip inverts winding
    return poly;
}

// --- Square 4-arm generator ---
function generateSquare(config) {
    const w = config.width;
    const h = config.height;
    const cols = Math.max(2, config.pinwheelGrid || 6);
    const nodeFrac = Math.max(0, Math.min(1, (config.pinwheelNode ?? 30) / 100));
    const thickFrac = Math.max(0, Math.min(1, (config.pinwheelThickness ?? 35) / 100));
    const swirl = Math.max(0, Math.min(1, (config.pinwheelSwirl ?? 60) / 100));
    const baseDir = config.pinwheelDirection === "ccw" ? -1 : 1;
    const variation = Math.max(0, Math.min(1, (config.pinwheelVariation ?? 0) / 100));
    const tipFrac = Math.max(0, Math.min(1, (config.pinwheelTip ?? 0) / 100));
    const seed = config.seed | 0;

    const tileW = w / cols;
    const rows = Math.max(1, Math.round(h / tileW));
    const tileH = h / rows;
    const halfDim = Math.min(tileW, tileH) / 2;

    // Geometry
    const Rnode = Math.max(2, nodeFrac * halfDim * 0.55);
    const armW = Math.max(2, thickFrac * halfDim * 0.75);
    const halfTileW = tileW / 2;
    const halfTileH = tileH / 2;

    const paths = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cx = col * tileW + halfTileW;
            const cy = row * tileH + halfTileH;

            const arms = [
                { ex: cx + halfTileW, ey: cy, theta: 0, dist: halfTileW },
                { ex: cx, ey: cy + halfTileH, theta: Math.PI / 2, dist: halfTileH },
                { ex: cx - halfTileW, ey: cy, theta: Math.PI, dist: halfTileW },
                { ex: cx, ey: cy - halfTileH, theta: -Math.PI / 2, dist: halfTileH },
            ];
            for (const a of arms) {
                const ep = edgeParams(a.ex, a.ey, baseDir, variation, seed, w, h);
                const poly = armPoly(cx, cy, Rnode, a.ex, a.ey, a.theta, a.dist, armW * ep.thicknessMul, swirl, ep.dir, tipFrac);
                transformPoly(poly, w, h, config.flipH, config.flipV);
                paths.push(polyToPath(poly));
            }

            const disc = discPoly(cx, cy, Rnode, 32);
            transformPoly(disc, w, h, config.flipH, config.flipV);
            paths.push(polyToPath(disc));
        }
    }

    return paths;
}

// Per-edge variation. Both adjacent tiles compute the same midpoint coordinates
// for their shared edge, so hashing the midpoint produces identical params on
// both sides → seams stay perfect. Coords are wrapped modulo (w, h) so that
// arms crossing the canvas boundary also hash to matching values (an arm at
// x=W is the same edge as the arm at x=0 in the next tiled copy).
function edgeHash(mx, my, seed) {
    const ix = Math.round(mx * 1000) | 0;
    const iy = Math.round(my * 1000) | 0;
    let h = ((ix * 73856093) ^ (iy * 19349663) ^ (seed * 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

function edgeParams(mx, my, baseDir, variation, seed, w, h) {
    if (variation === 0) return { thicknessMul: 1.0, dir: baseDir };
    // Wrap to canvas dimensions so canvas-boundary edges tile correctly
    const wx = ((mx % w) + w) % w;
    const wy = ((my % h) + h) % h;
    const rng = mulberry32(edgeHash(wx, wy, seed));
    const tOffset = (rng() - 0.5) * 2; // [-1, 1]
    return {
        thicknessMul: 1.0 + variation * tOffset * 0.6,
        dir: baseDir,
    };
}

// --- Hex 6-arm generator ---
function generateHex(config) {
    const w = config.width;
    const h = config.height;
    const gridVal = Math.max(2, config.pinwheelGrid || 6);
    const nodeFrac = Math.max(0, Math.min(1, (config.pinwheelNode ?? 30) / 100));
    const thickFrac = Math.max(0, Math.min(1, (config.pinwheelThickness ?? 35) / 100));
    const swirl = Math.max(0, Math.min(1, (config.pinwheelSwirl ?? 60) / 100));
    const baseDir = config.pinwheelDirection === "ccw" ? -1 : 1;
    const variation = Math.max(0, Math.min(1, (config.pinwheelVariation ?? 0) / 100));
    const tipFrac = Math.max(0, Math.min(1, (config.pinwheelTip ?? 0) / 100));
    const seed = config.seed | 0;

    // Compute hex dims (mirror hexgrid.js so the grid is tileable)
    const numPairsX = Math.max(1, Math.floor(gridVal / 2));
    const a = w / (numPairsX * 3);
    const bRegular = a * Math.sqrt(3) / 2;
    const numRows = Math.max(1, Math.round(h / (2 * bRegular)));
    const b = h / (numRows * 2);

    // Apothem (center → edge midpoint) is b
    const halfDim = b;
    const Rnode = Math.max(2, nodeFrac * halfDim * 0.55);
    const armW = Math.max(2, thickFrac * halfDim * 0.85);

    const colMin = -1, colMax = numPairsX * 2 + 1;
    const rowMin = -1, rowMax = numRows + 1;

    const paths = [];

    for (let col = colMin; col <= colMax; col++) {
        const isOdd = ((col % 2) + 2) % 2;
        for (let row = rowMin; row <= rowMax; row++) {
            const cx = col * 1.5 * a;
            const cy = row * 2 * b + isOdd * b;

            // Skip hexes far from canvas
            const margin = Math.max(a, b) * 1.5;
            if (cx < -margin || cx > w + margin || cy < -margin || cy > h + margin) continue;

            const mids = hexEdgeMids(cx, cy, a, b);

            for (const m of mids) {
                const ep = edgeParams(m.x, m.y, baseDir, variation, seed, w, h);
                let poly = armPoly(cx, cy, Rnode, m.x, m.y, m.theta, m.dist, armW * ep.thicknessMul, swirl, ep.dir, tipFrac);
                transformPoly(poly, w, h, config.flipH, config.flipV);
                poly = clipPoly(poly, 0, 0, w, h);
                if (poly.length >= 3) paths.push(polyToPath(poly));
            }

            let disc = discPoly(cx, cy, Rnode, 32);
            transformPoly(disc, w, h, config.flipH, config.flipV);
            disc = clipPoly(disc, 0, 0, w, h);
            if (disc.length >= 3) paths.push(polyToPath(disc));
        }
    }

    return paths;
}

// --- Public API ---
export function generate(config) {
    const arms = config.pinwheelArms || 4;
    return arms === 6 ? generateHex(config) : generateSquare(config);
}
