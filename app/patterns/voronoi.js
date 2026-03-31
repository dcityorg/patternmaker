import { Delaunay } from "https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm";

// --- Pattern metadata ---
export const name = "Voronoi";

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

// --- Seed generation ---
function makeSeeds(config) {
    const rng = mulberry32(config.seed);
    const seeds = [];
    for (let i = 0; i < config.seedCount; i++) {
        seeds.push([rng(), rng()]);
    }
    for (let r = 0; r < config.rotation; r++) {
        for (let i = 0; i < seeds.length; i++) {
            const [x, y] = seeds[i];
            seeds[i] = [1 - y, x];
        }
    }
    if (config.flipH) {
        for (let i = 0; i < seeds.length; i++) {
            seeds[i][0] = 1 - seeds[i][0];
        }
    }
    if (config.flipV) {
        for (let i = 0; i < seeds.length; i++) {
            seeds[i][1] = 1 - seeds[i][1];
        }
    }
    return seeds;
}

// --- Lloyd's relaxation ---
function computeCentroids(seeds) {
    const allPoints = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            for (const [x, y] of seeds) {
                allPoints.push([x + dx, y + dy]);
            }
        }
    }

    const delaunay = Delaunay.from(allPoints);
    const voronoi = delaunay.voronoi([-1, -1, 2, 2]);

    const n = seeds.length;
    const centerStart = 4 * n;
    const centroids = [];

    for (let i = 0; i < n; i++) {
        const polygon = voronoi.cellPolygon(centerStart + i);
        if (!polygon) {
            centroids.push(null);
            continue;
        }

        const poly = polygon.slice(0, -1);
        let cx = 0, cy = 0, area = 0;
        for (let j = 0; j < poly.length; j++) {
            const k = (j + 1) % poly.length;
            const cross = poly[j][0] * poly[k][1] - poly[k][0] * poly[j][1];
            area += cross;
            cx += (poly[j][0] + poly[k][0]) * cross;
            cy += (poly[j][1] + poly[k][1]) * cross;
        }
        if (Math.abs(area) < 1e-10) {
            centroids.push(null);
            continue;
        }
        area /= 2;
        cx /= 6 * area;
        cy /= 6 * area;
        centroids.push([cx, cy]);
    }

    return centroids;
}

function relaxSeeds(originalSeeds, uniformity) {
    let seeds = originalSeeds.map(s => [...s]);
    if (uniformity <= 0) return seeds;

    const totalIter = (uniformity * 3) / 100;
    const fullIters = Math.floor(totalIter);
    const frac = totalIter - fullIters;
    const maxIter = fullIters + (frac > 0 ? 1 : 0);

    for (let iter = 0; iter < maxIter; iter++) {
        const centroids = computeCentroids(seeds);
        const blend = iter < fullIters ? 1.0 : frac;

        for (let i = 0; i < seeds.length; i++) {
            if (!centroids[i]) continue;
            seeds[i][0] += (centroids[i][0] - seeds[i][0]) * blend;
            seeds[i][1] += (centroids[i][1] - seeds[i][1]) * blend;
            seeds[i][0] = ((seeds[i][0] % 1) + 1) % 1;
            seeds[i][1] = ((seeds[i][1] % 1) + 1) % 1;
        }
    }
    return seeds;
}

// --- Geometry helpers ---
function computeMaxInset(polygon) {
    let cx = 0, cy = 0;
    for (const p of polygon) {
        cx += p[0];
        cy += p[1];
    }
    cx /= polygon.length;
    cy /= polygon.length;

    let minDist = Infinity;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % n];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy);
        if (len < 1e-10) continue;
        const dist = Math.abs((cy - a[1]) * dx - (cx - a[0]) * dy) / len;
        minDist = Math.min(minDist, dist);
    }
    return minDist;
}

function hasSelfIntersection(polygon) {
    const n = polygon.length;
    if (n < 4) return false;
    for (let i = 0; i < n; i++) {
        const a = polygon[i], b = polygon[(i + 1) % n];
        for (let j = i + 2; j < n; j++) {
            if (j === (i + n - 1) % n) continue;
            const c = polygon[j], d = polygon[(j + 1) % n];
            if (segmentsIntersect(a, b, c, d)) return true;
        }
    }
    return false;
}

function segmentsIntersect(a, b, c, d) {
    const d1 = cross2d(c, d, a);
    const d2 = cross2d(c, d, b);
    const d3 = cross2d(a, b, c);
    const d4 = cross2d(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }
    return false;
}

function cross2d(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function polygonArea(polygon) {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i][0] * polygon[j][1];
        area -= polygon[j][0] * polygon[i][1];
    }
    return area / 2;
}

// --- Sutherland-Hodgman polygon clipping ---
function clipPolygonToRect(polygon, xmin, ymin, xmax, ymax) {
    let output = [...polygon];

    const edges = [
        { inside: (p) => p[0] >= xmin, intersect: (a, b) => [xmin, a[1] + (b[1] - a[1]) * (xmin - a[0]) / (b[0] - a[0])] },
        { inside: (p) => p[0] <= xmax, intersect: (a, b) => [xmax, a[1] + (b[1] - a[1]) * (xmax - a[0]) / (b[0] - a[0])] },
        { inside: (p) => p[1] >= ymin, intersect: (a, b) => [a[0] + (b[0] - a[0]) * (ymin - a[1]) / (b[1] - a[1]), ymin] },
        { inside: (p) => p[1] <= ymax, intersect: (a, b) => [a[0] + (b[0] - a[0]) * (ymax - a[1]) / (b[1] - a[1]), ymax] },
    ];

    for (const { inside, intersect } of edges) {
        if (output.length === 0) return [];
        const input = output;
        output = [];

        for (let i = 0; i < input.length; i++) {
            const curr = input[i];
            const next = input[(i + 1) % input.length];

            if (inside(curr)) {
                output.push(curr);
                if (!inside(next)) output.push(intersect(curr, next));
            } else if (inside(next)) {
                output.push(intersect(curr, next));
            }
        }
    }

    return output;
}

// --- Polygon inset ---
function insetPolygon(polygon, distance) {
    if (distance <= 0 || polygon.length < 3) return polygon;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        area += polygon[i][0] * polygon[j][1];
        area -= polygon[j][0] * polygon[i][1];
    }
    const sign = area > 0 ? 1 : -1;

    const n = polygon.length;
    const offsetEdges = [];

    for (let i = 0; i < n; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % n];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy);
        if (len < 1e-10) continue;

        const nx = (-sign * dy) / len;
        const ny = (sign * dx) / len;

        offsetEdges.push({
            a: [a[0] + nx * distance, a[1] + ny * distance],
            b: [b[0] + nx * distance, b[1] + ny * distance],
        });
    }

    if (offsetEdges.length < 3) return [];

    const result = [];
    for (let i = 0; i < offsetEdges.length; i++) {
        const e1 = offsetEdges[i];
        const e2 = offsetEdges[(i + 1) % offsetEdges.length];
        const pt = lineIntersection(e1.a, e1.b, e2.a, e2.b);
        if (pt) result.push(pt);
    }

    if (result.length < 3) return [];

    let newArea = 0;
    for (let i = 0; i < result.length; i++) {
        const j = (i + 1) % result.length;
        newArea += result[i][0] * result[j][1];
        newArea -= result[j][0] * result[i][1];
    }
    if (Math.sign(newArea) !== Math.sign(area)) return [];

    return result;
}

function lineIntersection(p1, p2, p3, p4) {
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    if (Math.abs(d) < 1e-10) return null;
    const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
    return [
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1]),
    ];
}

// --- Short edge merging ---
function mergeShortEdges(polygon, tileW, tileH) {
    if (polygon.length < 4) return polygon;

    const eps = 0.5;
    function onBoundary(p) {
        return p[0] < eps || p[0] > tileW - eps || p[1] < eps || p[1] > tileH - eps;
    }

    let totalLen = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = polygon[j][0] - polygon[i][0];
        const dy = polygon[j][1] - polygon[i][1];
        totalLen += Math.sqrt(dx * dx + dy * dy);
    }
    const avgLen = totalLen / n;
    const threshold = avgLen * 0.3;

    const merged = [...polygon];
    const skip = new Set();
    for (let i = 0; i < merged.length; i++) {
        if (skip.has(i)) continue;
        const j = (i + 1) % merged.length;
        if (skip.has(j)) continue;

        const dx = merged[j][0] - merged[i][0];
        const dy = merged[j][1] - merged[i][1];
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < threshold && !onBoundary(merged[i]) && !onBoundary(merged[j])) {
            merged[i] = [(merged[i][0] + merged[j][0]) / 2, (merged[i][1] + merged[j][1]) / 2];
            skip.add(j);
        }
    }

    const result = merged.filter((_, i) => !skip.has(i));
    return result.length >= 3 ? result : polygon;
}

// --- SVG path generation with boundary-aware smoothing ---
function polygonToPath(polygon, roundness, tileW, tileH) {
    const fmt = (v) => v.toFixed(2);

    if (roundness <= 0.01) {
        return polygon.length < 3 ? "" :
            "M " + polygon.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(" L ") + " Z";
    }

    polygon = mergeShortEdges(polygon, tileW, tileH);

    const n = polygon.length;
    if (n < 3) return "";

    const t = roundness * 0.45;
    const eps = 0.5;

    function onBoundary(p) {
        return p[0] < eps || p[0] > tileW - eps || p[1] < eps || p[1] > tileH - eps;
    }

    const verts = polygon.map((curr, i) => {
        const prev = polygon[(i - 1 + n) % n];
        const next = polygon[(i + 1) % n];
        if (onBoundary(curr)) {
            return { sharp: true, v: curr };
        }
        return {
            sharp: false,
            v: curr,
            p1: [curr[0] + (prev[0] - curr[0]) * t, curr[1] + (prev[1] - curr[1]) * t],
            p2: [curr[0] + (next[0] - curr[0]) * t, curr[1] + (next[1] - curr[1]) * t],
        };
    });

    function exitPt(i) {
        return verts[i].sharp ? verts[i].v : verts[i].p2;
    }

    const start = exitPt(0);
    let d = `M ${fmt(start[0])},${fmt(start[1])}`;

    for (let idx = 1; idx <= n; idx++) {
        const i = idx % n;
        const vi = verts[i];
        if (vi.sharp) {
            d += ` L ${fmt(vi.v[0])},${fmt(vi.v[1])}`;
        } else {
            d += ` L ${fmt(vi.p1[0])},${fmt(vi.p1[1])}`;
            d += ` Q ${fmt(vi.v[0])},${fmt(vi.v[1])} ${fmt(vi.p2[0])},${fmt(vi.p2[1])}`;
        }
    }

    d += " Z";
    return d;
}

// --- Periodic Voronoi computation ---
function computeVoronoiCells(seeds, config) {
    const w = config.width;
    const h = config.height;
    const scaledSeeds = seeds.map(([x, y]) => [x * w, y * h]);

    const allPoints = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            for (const [x, y] of scaledSeeds) {
                allPoints.push([x + dx * w, y + dy * h]);
            }
        }
    }

    const delaunay = Delaunay.from(allPoints);
    const voronoi = delaunay.voronoi([-w, -h, 2 * w, 2 * h]);

    const n = scaledSeeds.length;
    const cells = [];

    for (let block = 0; block < 9; block++) {
        for (let i = 0; i < n; i++) {
            const polygon = voronoi.cellPolygon(block * n + i);
            if (!polygon) continue;

            const poly = polygon.slice(0, -1);

            const maxInset = computeMaxInset(poly);
            let dist = Math.min(config.spacing, maxInset * 0.85);
            let inset = null;

            for (let attempt = 0; attempt < 12; attempt++) {
                const d = dist * (1 - attempt * 0.08);
                if (d < 0.25) break;
                const candidate = insetPolygon(poly, d);
                if (candidate.length >= 3 && !hasSelfIntersection(candidate)) {
                    inset = candidate;
                    break;
                }
            }
            if (!inset) {
                const tiny = insetPolygon(poly, 0.25);
                inset = (tiny.length >= 3) ? tiny : poly;
            }

            const clipped = clipPolygonToRect(inset, 0, 0, w, h);
            // Extend boundary vertices slightly past tile edges to prevent
            // anti-aliasing seams when tiled on physical objects
            const over = 0.5;
            for (const p of clipped) {
                if (p[0] <= 0.01) p[0] = -over;
                else if (p[0] >= w - 0.01) p[0] = w + over;
                if (p[1] <= 0.01) p[1] = -over;
                else if (p[1] >= h - 0.01) p[1] = h + over;
            }
            if (clipped.length >= 3) {
                const area = Math.abs(polygonArea(clipped));
                if (area > 0.5) {
                    cells.push(clipped);
                }
            }
        }
    }

    return cells;
}

// --- Public API ---
export function generate(config) {
    const originalSeeds = makeSeeds(config);
    const seeds = relaxSeeds(originalSeeds, config.uniformity);
    const cells = computeVoronoiCells(seeds, config);
    return cells.map(cell => polygonToPath(cell, config.roundness, config.width, config.height)).filter(Boolean);
}
