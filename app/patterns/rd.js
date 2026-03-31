// --- Reaction-Diffusion Pattern (Gray-Scott Model) ---
export const name = "Reaction-Diffusion";

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

function lerp(a, b, t) {
    return a + t * (b - a);
}

// --- Map Style slider to Gray-Scott feed/kill parameters ---
// Waypoints from Pearson classification for Du=0.2097, Dv=0.105:
// 0=labyrinth, 25=worms, 50=stripes, 75=spots, 100=sparse spots
function getGrayScottParams(style) {
    const waypoints = [
        [0,   0.018, 0.051],
        [25,  0.029, 0.057],
        [50,  0.040, 0.060],
        [75,  0.037, 0.065],
        [100, 0.050, 0.065],
    ];

    let lo = waypoints[0], hi = waypoints[waypoints.length - 1];
    for (let i = 0; i < waypoints.length - 1; i++) {
        if (style >= waypoints[i][0] && style <= waypoints[i + 1][0]) {
            lo = waypoints[i];
            hi = waypoints[i + 1];
            break;
        }
    }

    const t = (style - lo[0]) / (hi[0] - lo[0] || 1);
    return {
        F: lo[1] + t * (hi[1] - lo[1]),
        k: lo[2] + t * (hi[2] - lo[2]),
    };
}

// --- Gray-Scott simulation with torus (periodic) boundaries ---
function simulate(size, F, k, iterations, seed) {
    const rng = mulberry32(seed);
    const n = size * size;

    const U = new Float32Array(n);
    const V = new Float32Array(n);
    U.fill(1.0);

    // Seed V in random circular blobs
    const numSeeds = Math.max(4, Math.round(n / 800));
    for (let s = 0; s < numSeeds; s++) {
        const cx = Math.floor(rng() * size);
        const cy = Math.floor(rng() * size);
        const r = 2 + Math.floor(rng() * 3);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy > r * r) continue;
                const x = ((cx + dx) % size + size) % size;
                const y = ((cy + dy) % size + size) % size;
                const idx = y * size + x;
                U[idx] = 0.5 + rng() * 0.1;
                V[idx] = 0.25 + rng() * 0.1;
            }
        }
    }

    const Du = 0.2097;
    const Dv = 0.105;
    const nextU = new Float32Array(n);
    const nextV = new Float32Array(n);

    for (let iter = 0; iter < iterations; iter++) {
        for (let y = 0; y < size; y++) {
            const yp = y === size - 1 ? 0 : y + 1;
            const ym = y === 0 ? size - 1 : y - 1;
            const yOff = y * size;
            const ypOff = yp * size;
            const ymOff = ym * size;

            for (let x = 0; x < size; x++) {
                const xp = x === size - 1 ? 0 : x + 1;
                const xm = x === 0 ? size - 1 : x - 1;
                const i = yOff + x;

                const lapU = U[yOff + xp] + U[yOff + xm] + U[ypOff + x] + U[ymOff + x] - 4 * U[i];
                const lapV = V[yOff + xp] + V[yOff + xm] + V[ypOff + x] + V[ymOff + x] - 4 * V[i];

                const uvv = U[i] * V[i] * V[i];
                nextU[i] = U[i] + Du * lapU - uvv + F * (1 - U[i]);
                nextV[i] = V[i] + Dv * lapV + uvv - (F + k) * V[i];
            }
        }
        U.set(nextU);
        V.set(nextV);
    }

    return V;
}

// --- Bilinear sample with torus wrapping ---
function sampleField(field, size, nx, ny) {
    nx = ((nx % 1) + 1) % 1;
    ny = ((ny % 1) + 1) % 1;

    const fx = nx * size;
    const fy = ny * size;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;

    const x0 = ix % size;
    const x1 = (ix + 1) % size;
    const y0 = iy % size;
    const y1 = (iy + 1) % size;

    return (1 - tx) * (1 - ty) * field[y0 * size + x0] +
           tx * (1 - ty) * field[y0 * size + x1] +
           (1 - tx) * ty * field[y1 * size + x0] +
           tx * ty * field[y1 * size + x1];
}

// --- Marching squares ---
function marchingSquaresSegments(field, cols, rows, threshold, cellW, cellH, offsetX, offsetY) {
    const segments = [];

    for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
            const tl = field[j * cols + i] >= threshold ? 1 : 0;
            const tr = field[j * cols + i + 1] >= threshold ? 1 : 0;
            const br = field[(j + 1) * cols + i + 1] >= threshold ? 1 : 0;
            const bl = field[(j + 1) * cols + i] >= threshold ? 1 : 0;
            const code = (tl << 3) | (tr << 2) | (br << 1) | bl;

            if (code === 0 || code === 15) continue;

            const x0 = offsetX + i * cellW;
            const y0 = offsetY + j * cellH;

            const vTL = field[j * cols + i];
            const vTR = field[j * cols + i + 1];
            const vBR = field[(j + 1) * cols + i + 1];
            const vBL = field[(j + 1) * cols + i];

            const interpT = (threshold - vTL) / (vTR - vTL || 0.001);
            const interpR = (threshold - vTR) / (vBR - vTR || 0.001);
            const interpB = (threshold - vBL) / (vBR - vBL || 0.001);
            const interpL = (threshold - vTL) / (vBL - vTL || 0.001);

            const top = [x0 + interpT * cellW, y0];
            const right = [x0 + cellW, y0 + interpR * cellH];
            const bottom = [x0 + interpB * cellW, y0 + cellH];
            const left = [x0, y0 + interpL * cellH];

            switch (code) {
                case 1:  segments.push([bottom, left]); break;
                case 2:  segments.push([right, bottom]); break;
                case 3:  segments.push([right, left]); break;
                case 4:  segments.push([top, right]); break;
                case 5:  segments.push([top, right]); segments.push([bottom, left]); break;
                case 6:  segments.push([top, bottom]); break;
                case 7:  segments.push([top, left]); break;
                case 8:  segments.push([left, top]); break;
                case 9:  segments.push([bottom, top]); break;
                case 10: segments.push([left, top]); segments.push([right, bottom]); break;
                case 11: segments.push([right, top]); break;
                case 12: segments.push([left, right]); break;
                case 13: segments.push([bottom, right]); break;
                case 14: segments.push([left, bottom]); break;
            }
        }
    }
    return segments;
}

// --- Trace segments into closed contours ---
function traceContours(segments) {
    const EPS = 0.05;
    const contours = [];

    function key(x, y) {
        return Math.round(x / EPS) + "," + Math.round(y / EPS);
    }

    const startMap = new Map();
    for (let i = 0; i < segments.length; i++) {
        const k = key(segments[i][0][0], segments[i][0][1]);
        if (!startMap.has(k)) startMap.set(k, []);
        startMap.get(k).push(i);
    }

    const used = new Uint8Array(segments.length);

    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;
        const poly = [segments[i][0], segments[i][1]];
        used[i] = 1;

        let closed = false;
        let safety = 0;
        while (safety++ < 100000) {
            const last = poly[poly.length - 1];
            const first = poly[0];
            if (Math.abs(last[0] - first[0]) < EPS && Math.abs(last[1] - first[1]) < EPS) {
                poly.pop();
                closed = true;
                break;
            }
            const k = key(last[0], last[1]);
            const candidates = startMap.get(k);
            let found = -1;
            if (candidates) {
                for (const idx of candidates) {
                    if (!used[idx]) { found = idx; break; }
                }
            }
            if (found < 0) break;
            used[found] = 1;
            poly.push(segments[found][1]);
        }

        if (closed && poly.length >= 3) contours.push(poly);
    }

    return contours;
}

// --- Sutherland-Hodgman polygon clipping ---
function clipPolygon(poly, x0, y0, x1, y1) {
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

// --- Chaikin corner-cutting subdivision ---
function chaikinSmooth(points, iterations, w, h) {
    const EDGE_EPS = 0.5;
    function onBoundary(p) {
        return p[0] <= EDGE_EPS || p[0] >= w - EDGE_EPS ||
               p[1] <= EDGE_EPS || p[1] >= h - EDGE_EPS;
    }

    let pts = points;
    for (let iter = 0; iter < iterations; iter++) {
        const n = pts.length;
        const next = [];
        for (let i = 0; i < n; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];

            if (onBoundary(a)) {
                next.push(a);
            } else {
                next.push([
                    a[0] * 0.75 + b[0] * 0.25,
                    a[1] * 0.75 + b[1] * 0.25,
                ]);
            }

            if (!onBoundary(a) && !onBoundary(b)) {
                next.push([
                    a[0] * 0.25 + b[0] * 0.75,
                    a[1] * 0.25 + b[1] * 0.75,
                ]);
            }
        }
        pts = next;
    }
    return pts;
}

// --- Downsample polygon, keeping boundary points ---
function downsample(points, step, w, h) {
    if (step <= 1 || points.length <= 10) return points;
    const EDGE_EPS = 0.5;
    const result = [];
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const onB = p[0] <= EDGE_EPS || p[0] >= w - EDGE_EPS ||
                    p[1] <= EDGE_EPS || p[1] >= h - EDGE_EPS;
        if (onB || i % step === 0) result.push(p);
    }
    return result.length >= 3 ? result : points;
}

// --- Build SVG path from contour with smoothing ---
function smoothContour(points, smoothness, w, h) {
    if (points.length < 3) {
        return "M" + points.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L") + "Z";
    }

    const dsStep = Math.round(lerp(5, 2, smoothness));
    const ds = downsample(points, dsStep, w, h);

    const iterations = smoothness > 0.3 ? Math.round(lerp(1, 2, (smoothness - 0.3) / 0.7)) : 0;
    const smoothed = iterations > 0 ? chaikinSmooth(ds, iterations, w, h) : ds;

    return "M" + smoothed.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L") + "Z";
}

// --- Check minimum width of a polygon ---
function minWidth(pts) {
    if (pts.length < 3) return 0;
    let minW = Infinity;
    for (let angle = 0; angle < Math.PI; angle += Math.PI / 8) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let lo = Infinity, hi = -Infinity;
        for (const [px, py] of pts) {
            const proj = px * cos + py * sin;
            if (proj < lo) lo = proj;
            if (proj > hi) hi = proj;
        }
        minW = Math.min(minW, hi - lo);
    }
    return minW;
}

// --- Polygon area ---
function polyArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i][0] * pts[j][1];
        area -= pts[j][0] * pts[i][1];
    }
    return Math.abs(area) / 2;
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;
    const seed = config.seed;
    const rotation = config.rotation || 0;
    const flipH = config.flipH || false;
    const flipV = config.flipV || false;

    const scale = config.rdScale ?? 50;
    const style = config.rdStyle ?? 30;
    const detail = config.rdDetail ?? 3;
    const threshold = config.rdThreshold ?? 50;
    const smoothness = config.rdSmoothness ?? 70;

    // Map sliders to simulation parameters
    const { F, k } = getGrayScottParams(style);
    const simSize = Math.round(lerp(160, 48, (scale - 10) / 90));
    const iterations = [2000, 3500, 5000, 7000, 9000][detail - 1] || 5000;

    // Run Gray-Scott simulation (square grid, torus boundaries)
    const simField = simulate(simSize, F, k, iterations, seed);

    // Normalize simulation output to 0-1
    let minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < simField.length; i++) {
        if (simField[i] < minV) minV = simField[i];
        if (simField[i] > maxV) maxV = simField[i];
    }
    const range = maxV - minV || 1;
    for (let i = 0; i < simField.length; i++) {
        simField[i] = (simField[i] - minV) / range;
    }

    // Build marching squares field with rotation/flip transforms
    const msRes = 80;
    const cols = msRes + 1;
    const rows = Math.round(msRes * h / w) + 1;
    const cellW = w / (cols - 1);
    const cellH = h / (rows - 1);

    const field = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            let nx = i / (cols - 1);
            let ny = j / (rows - 1);

            if (flipH) nx = 1 - nx;
            if (flipV) ny = 1 - ny;
            for (let r = 0; r < rotation; r++) {
                const tmp = nx;
                nx = ny;
                ny = 1 - tmp;
            }

            field[j * cols + i] = sampleField(simField, simSize, nx, ny);
        }
    }

    // Force field periodicity (last col/row = first col/row)
    for (let j = 0; j < rows; j++) {
        field[j * cols + (cols - 1)] = field[j * cols];
    }
    for (let i = 0; i < cols; i++) {
        field[(rows - 1) * cols + i] = field[i];
    }

    const thresh = threshold / 100;

    // Run marching squares on 3x3 tiled copies for clean edge contours
    const allSegments = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const segs = marchingSquaresSegments(field, cols, rows, thresh, cellW, cellH, dx * w, dy * h);
            for (const seg of segs) allSegments.push(seg);
        }
    }

    // Trace closed contours
    const contours = traceContours(allSegments);

    // Clip to center tile and filter
    const smooth = smoothness / 100;
    const minDim = Math.min(w, h);
    const minAreaThresh = minDim * 0.3;
    const minWidthThresh = minDim * 0.015;
    const EDGE_EPS = 0.5;
    const paths = [];

    for (const contour of contours) {
        const clipped = clipPolygon(contour, 0, 0, w, h);
        // Extend boundary vertices slightly past tile edges to prevent
        // anti-aliasing seams when tiled on physical objects
        const over = 0.5;
        for (const p of clipped) {
            if (p[0] <= 0.01) p[0] = -over;
            else if (p[0] >= w - 0.01) p[0] = w + over;
            if (p[1] <= 0.01) p[1] = -over;
            else if (p[1] >= h - 0.01) p[1] = h + over;
        }
        if (clipped.length < 3) continue;

        // Check if shape touches tile boundary (partial shape that completes when tiled)
        const onBoundary = clipped.some(p =>
            p[0] <= EDGE_EPS || p[0] >= w - EDGE_EPS ||
            p[1] <= EDGE_EPS || p[1] >= h - EDGE_EPS);

        if (!onBoundary) {
            // Interior shapes: apply full filtering
            const area = polyArea(clipped);
            if (area < minAreaThresh) continue;
            if (minWidth(clipped) < minWidthThresh) continue;
        }

        paths.push(smoothContour(clipped, smooth, w, h));
    }

    if (paths.length === 0 && thresh < 0.5) {
        paths.push(`M0,0L${w},0L${w},${h}L0,${h}Z`);
    }

    return paths;
}
