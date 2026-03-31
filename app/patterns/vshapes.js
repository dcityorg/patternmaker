// --- Voronoi Shapes Pattern ---
// Places geometric shapes at Voronoi-distributed seed points.
// Uses periodic Voronoi for seamless tiling.

import { Delaunay } from "https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm";

export const name = "Shapes Scattered";

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

// --- Seed generation (normalized 0-1) ---
function makeSeeds(config, count) {
    const rng = mulberry32(config.seed);
    const seeds = [];
    for (let i = 0; i < count; i++) {
        seeds.push([rng(), rng()]);
    }
    for (let r = 0; r < config.rotation; r++) {
        for (let i = 0; i < seeds.length; i++) {
            const [x, y] = seeds[i];
            seeds[i] = [1 - y, x];
        }
    }
    if (config.flipH) {
        for (let i = 0; i < seeds.length; i++) seeds[i][0] = 1 - seeds[i][0];
    }
    if (config.flipV) {
        for (let i = 0; i < seeds.length; i++) seeds[i][1] = 1 - seeds[i][1];
    }
    return seeds;
}

// --- Lloyd's relaxation (periodic) ---
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
        if (!polygon) { centroids.push(null); continue; }
        const poly = polygon.slice(0, -1);
        let cx = 0, cy = 0, area = 0;
        for (let j = 0; j < poly.length; j++) {
            const k = (j + 1) % poly.length;
            const cross = poly[j][0] * poly[k][1] - poly[k][0] * poly[j][1];
            area += cross;
            cx += (poly[j][0] + poly[k][0]) * cross;
            cy += (poly[j][1] + poly[k][1]) * cross;
        }
        if (Math.abs(area) < 1e-10) { centroids.push(null); continue; }
        area /= 2;
        centroids.push([cx / (6 * area), cy / (6 * area)]);
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

// --- Compute min distance to nearest neighbor for each seed (periodic) ---
function computeNeighborDistances(seeds, w, h) {
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
    const n = seeds.length;
    const centerStart = 4 * n;
    const distances = [];

    for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        for (const j of delaunay.neighbors(centerStart + i)) {
            const dx = allPoints[centerStart + i][0] - allPoints[j][0];
            const dy = allPoints[centerStart + i][1] - allPoints[j][1];
            const d = Math.hypot(dx, dy);
            if (d < minDist) minDist = d;
        }
        distances.push(minDist);
    }
    return distances;
}

// --- Shape path generators ---
// All generate a path centered at (cx, cy) with given radius r
// cornerRadius is 0-1, rotation is in radians

const f = v => v.toFixed(2);

function circlePath(cx, cy, r) {
    return `M ${f(cx - r)},${f(cy)} A ${f(r)},${f(r)} 0 1,0 ${f(cx + r)},${f(cy)} A ${f(r)},${f(r)} 0 1,0 ${f(cx - r)},${f(cy)} Z`;
}

function regularPolygonPoints(cx, cy, r, sides, angle) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
        const a = angle + (i * 2 * Math.PI) / sides;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

function starPoints(cx, cy, outerR, innerR, points, angle) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
        const a = angle + (i * Math.PI) / points;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

function polygonPath(pts, cornerRadius) {
    if (cornerRadius <= 0.01) {
        let d = `M ${f(pts[0][0])},${f(pts[0][1])}`;
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${f(pts[i][0])},${f(pts[i][1])}`;
        }
        return d + " Z";
    }

    // Rounded corners via quadratic Bezier at each vertex
    const n = pts.length;
    const t = Math.min(cornerRadius, 0.5); // max 50% of edge consumed by rounding
    let d = "";
    for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const curr = pts[i];
        const next = pts[(i + 1) % n];

        // Points t-fraction along edges from curr
        const px = curr[0] + (prev[0] - curr[0]) * t;
        const py = curr[1] + (prev[1] - curr[1]) * t;
        const nx = curr[0] + (next[0] - curr[0]) * t;
        const ny = curr[1] + (next[1] - curr[1]) * t;

        if (i === 0) {
            d = `M ${f(px)},${f(py)}`;
        } else {
            d += ` L ${f(px)},${f(py)}`;
        }
        d += ` Q ${f(curr[0])},${f(curr[1])} ${f(nx)},${f(ny)}`;
    }
    return d + " Z";
}

function squarePoints(cx, cy, r, angle) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
        const a = angle + Math.PI / 4 + (i * Math.PI) / 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
}

function crossPoints(cx, cy, r, angle) {
    const armWidth = r * 0.38;
    const raw = [
        [-armWidth, -r], [armWidth, -r],
        [armWidth, -armWidth], [r, -armWidth], [r, armWidth],
        [armWidth, armWidth], [armWidth, r],
        [-armWidth, r], [-armWidth, armWidth],
        [-r, armWidth], [-r, -armWidth],
        [-armWidth, -armWidth],
    ];
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return raw.map(([x, y]) => [
        cx + x * cos - y * sin,
        cy + x * sin + y * cos,
    ]);
}

function diamondPoints(cx, cy, r, angle) {
    return regularPolygonPoints(cx, cy, r, 4, angle);
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;

    const cellCount = config.vshapesCells ?? 30;
    const uniformity = config.vshapesUniformity ?? 0;
    const shapeScale = config.vshapesScale ?? 70;
    const spacing = config.vshapesSpacing ?? 5;
    const cornerRadius = (config.vshapesRadius ?? 20) / 100;
    const rotationAmt = (config.vshapesRotation ?? 0) / 100;
    const shapeType = config.vshapesShape ?? "circle";

    // Generate and relax seeds
    const rawSeeds = makeSeeds(config, cellCount);
    const seeds = relaxSeeds(rawSeeds, uniformity);

    // Use a per-shape PRNG for rotation
    const rng = mulberry32(config.seed + 7919);

    // Compute min neighbor distance for each seed (determines shape size)
    const neighborDists = computeNeighborDistances(seeds, w, h);

    // Generate shapes
    const shapes = []; // { cx, cy, r, angle }
    for (let i = 0; i < seeds.length; i++) {
        const cx = seeds[i][0] * w;
        const cy = seeds[i][1] * h;
        const halfDist = neighborDists[i] / 2;
        if (!isFinite(halfDist) || halfDist <= 0) continue;

        // Shape radius: scale factor applied, then subtract spacing
        // Fixed min radius for manufacturability (1.5% of min tile dimension)
        const minR = Math.min(w, h) * 0.015;
        const r = Math.max(halfDist * (shapeScale / 100) - spacing / 2, minR);

        // Per-shape random rotation
        const angle = -Math.PI / 2 + rotationAmt * rng() * 2 * Math.PI;

        shapes.push({ cx, cy, r, angle });
    }

    // Render paths with ghost copies for tiling
    const paths = [];
    for (const s of shapes) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cx = s.cx + dx * w;
                const cy = s.cy + dy * h;

                // Skip if shape is entirely outside tile
                if (cx + s.r < 0 || cx - s.r > w || cy + s.r < 0 || cy - s.r > h) continue;

                const path = makeShapePath(shapeType, cx, cy, s.r, s.angle, cornerRadius);
                if (path) paths.push(path);
            }
        }
    }

    return paths;
}

function makeShapePath(shape, cx, cy, r, angle, cornerRadius) {
    switch (shape) {
        case "circle":
            return circlePath(cx, cy, r);
        case "cross":
            return polygonPath(crossPoints(cx, cy, r, angle), cornerRadius);
        case "diamond":
            return polygonPath(diamondPoints(cx, cy, r, angle), cornerRadius);
        case "hexagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 6, angle), cornerRadius);
        case "octagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 8, angle), cornerRadius);
        case "pentagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 5, angle), cornerRadius);
        case "roundedSquare":
            return polygonPath(squarePoints(cx, cy, r, angle), Math.max(cornerRadius, 0.2));
        case "square":
            return polygonPath(squarePoints(cx, cy, r, angle), cornerRadius);
        case "star":
            return polygonPath(starPoints(cx, cy, r, r * 0.45, 6, angle), cornerRadius);
        case "triangle":
            return polygonPath(regularPolygonPoints(cx, cy, r, 3, angle), cornerRadius);
        default:
            return circlePath(cx, cy, r);
    }
}
