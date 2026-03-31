// --- Domain-Warped Noise Pattern ---
export const name = "Rorschach";

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

// --- Permutation table for noise ---
function buildPerm(rng) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    return perm;
}

// --- 2D gradient vectors ---
const GRAD2 = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
];

function grad2d(perm, ix, iy) {
    const idx = perm[((ix & 255) + perm[iy & 255]) & 255] & 7;
    return GRAD2[idx];
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

// --- Standard 2D Perlin noise ---
function perlin2d(perm, x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);

    const g00 = grad2d(perm, xi, yi);
    const g10 = grad2d(perm, xi + 1, yi);
    const g01 = grad2d(perm, xi, yi + 1);
    const g11 = grad2d(perm, xi + 1, yi + 1);

    const n00 = g00[0] * xf + g00[1] * yf;
    const n10 = g10[0] * (xf - 1) + g10[1] * yf;
    const n01 = g01[0] * xf + g01[1] * (yf - 1);
    const n11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

// --- Tileable 2D noise via torus mapping ---
function tileNoise(perm, nx, ny, freq, offsetX, offsetY) {
    const TWO_PI = Math.PI * 2;
    const cx = freq * Math.cos(nx * TWO_PI);
    const sx = freq * Math.sin(nx * TWO_PI);
    const cy = freq * Math.cos(ny * TWO_PI);
    const sy = freq * Math.sin(ny * TWO_PI);

    const n1 = perlin2d(perm, cx + offsetX, cy + offsetY);
    const n2 = perlin2d(perm, sx + offsetX + 73.9, sy + offsetY + 51.2);
    return (n1 + n2) * 0.5;
}

// --- Fractal Brownian motion ---
function fbm(perm, nx, ny, freq, octaves, offsetX, offsetY) {
    let value = 0;
    let amplitude = 1;
    let totalAmp = 0;
    let f = freq;
    let ox = offsetX, oy = offsetY;

    for (let i = 0; i < octaves; i++) {
        value += amplitude * tileNoise(perm, nx, ny, f, ox, oy);
        totalAmp += amplitude;
        amplitude *= 0.5;
        f *= 2;
        ox += 31.7;
        oy += 47.3;
    }
    return value / totalAmp;
}

// --- Domain warping (all in normalized coords, fully tileable) ---
function warpedNoise(perm, nx, ny, freq, octaves, warpAmount) {
    if (warpAmount <= 0) {
        return fbm(perm, nx, ny, freq, octaves, 0, 0);
    }

    const qx = fbm(perm, nx, ny, freq, octaves, 0, 0);
    const qy = fbm(perm, nx, ny, freq, octaves, 100, 200);

    if (warpAmount <= 50) {
        const t = warpAmount / 50;
        const ws = t * 0.2;
        return fbm(perm, nx + qx * ws, ny + qy * ws, freq, octaves, 50, 50);
    }

    const ws1 = 0.2;
    const rx = fbm(perm, nx + qx * ws1, ny + qy * ws1, freq, octaves, 150, 250);
    const ry = fbm(perm, nx + qx * ws1, ny + qy * ws1, freq, octaves, 300, 350);

    const t2 = (warpAmount - 50) / 50;
    const ws2 = lerp(0.15, 0.35, t2);
    return fbm(perm, nx + rx * ws2, ny + ry * ws2, freq, octaves, 50, 50);
}

// --- Marching squares ---
// Returns array of segments, each [[x1,y1],[x2,y2]]
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

// --- Trace segments into closed contours using spatial hash ---
function traceContours(segments) {
    const EPS = 0.05;
    const contours = [];

    // Build spatial hash for segment start points
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

    // Clip against each edge: left, right, top, bottom
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
// Each iteration replaces each edge with two new points at 25%/75% along the edge.
// This only ever rounds corners — never creates overshoots or spikes.
// Boundary points are preserved to maintain seamless tiling.
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
                // Keep boundary points exactly where they are
                next.push(a);
            } else {
                // Insert two new points at 25% and 75% along edge
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

// --- Downsample a polygon, keeping every nth point and all boundary points ---
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

// --- Smooth contour: Chaikin subdivision, boundary-aware ---
function smoothContour(points, smoothness, w, h) {
    if (points.length < 3) {
        return "M" + points.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L") + "Z";
    }

    // Low smoothness: aggressive downsample (angular), high: light downsample + Chaikin (smooth)
    const dsStep = Math.round(lerp(5, 2, smoothness));
    const ds = downsample(points, dsStep, w, h);

    const iterations = smoothness > 0.3 ? Math.round(lerp(1, 2, (smoothness - 0.3) / 0.7)) : 0;
    const smoothed = iterations > 0 ? chaikinSmooth(ds, iterations, w, h) : ds;

    return "M" + smoothed.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L") + "Z";
}

// --- Check minimum width of a polygon (thinnest dimension) ---
function minWidth(pts) {
    if (pts.length < 3) return 0;
    // Sample distances from each vertex to farthest edge
    // Use simplified approach: check width at multiple angles
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

// --- Polygon area (signed) ---
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

    const scale = config.noiseScale ?? 50;
    const warp = config.noiseWarp ?? 50;
    const detail = config.noiseDetail ?? 3;
    const threshold = config.noiseThreshold ?? 50;
    const smoothness = config.noiseSmoothness ?? 70;

    const rng = mulberry32(seed);
    const perm = buildPerm(rng);

    const freq = lerp(4.0, 1.0, (scale - 10) / 90);

    // Grid resolution for marching squares
    const gridRes = 80;
    const cols = gridRes + 1;
    const rows = Math.round(gridRes * h / w) + 1;
    const cellW = w / (cols - 1);
    const cellH = h / (rows - 1);

    // Generate noise field in normalized coordinates
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

            field[j * cols + i] = warpedNoise(perm, nx, ny, freq, detail, warp);
        }
    }

    // Normalize field to 0-1
    let minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < field.length; i++) {
        if (field[i] < minV) minV = field[i];
        if (field[i] > maxV) maxV = field[i];
    }
    const range = maxV - minV || 1;
    for (let i = 0; i < field.length; i++) {
        field[i] = (field[i] - minV) / range;
    }

    const thresh = threshold / 100;

    // Run marching squares on 3x3 tiled copies (same field, different offsets)
    const allSegments = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const segs = marchingSquaresSegments(field, cols, rows, thresh, cellW, cellH, dx * w, dy * h);
            for (const seg of segs) allSegments.push(seg);
        }
    }

    // Trace closed contours from all segments
    const contours = traceContours(allSegments);

    // Clip contours to center tile [0, w] x [0, h] and filter
    const smooth = smoothness / 100;
    const minDim = Math.min(w, h);
    const minAreaThresh = minDim * 0.3; // minimum area in sq pixels
    const minWidthThresh = minDim * 0.015; // minimum width for manufacturability
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

        const area = polyArea(clipped);
        if (area < minAreaThresh) continue;

        // Skip shapes too thin to manufacture
        if (minWidth(clipped) < minWidthThresh) continue;

        paths.push(smoothContour(clipped, smooth, w, h));
    }

    if (paths.length === 0 && thresh < 0.5) {
        paths.push(`M0,0L${w},0L${w},${h}L0,${h}Z`);
    }

    return paths;
}
