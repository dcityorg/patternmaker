// --- Cityscape Pattern ---
// Irregular quadrilaterals placed within Voronoi cell territories
import { Delaunay } from "https://cdn.jsdelivr.net/npm/d3-delaunay@6/+esm";

export const name = "Cityscape";

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

// --- Seed generation with rotation/flip ---
function makeSeeds(seed, count, rotation, flipH, flipV) {
    const rng = mulberry32(seed);
    const seeds = [];
    for (let i = 0; i < count; i++) {
        seeds.push([rng(), rng()]);
    }
    for (let r = 0; r < rotation; r++) {
        for (let i = 0; i < seeds.length; i++) {
            const [x, y] = seeds[i];
            seeds[i] = [1 - y, x];
        }
    }
    if (flipH) {
        for (let i = 0; i < seeds.length; i++) seeds[i][0] = 1 - seeds[i][0];
    }
    if (flipV) {
        for (let i = 0; i < seeds.length; i++) seeds[i][1] = 1 - seeds[i][1];
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

// --- Polygon to SVG path with boundary-aware corner rounding ---
function polygonToPath(polygon, roundness, tileW, tileH) {
    const fmt = v => v.toFixed(2);
    if (polygon.length < 3) return "";

    if (roundness <= 0.01) {
        return "M " + polygon.map(p => `${fmt(p[0])},${fmt(p[1])}`).join(" L ") + " Z";
    }

    const n = polygon.length;
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
            sharp: false, v: curr,
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

// --- Generate irregular quadrilateral within a bounding region ---
function generateQuad(x, y, w, h, irregularity, sizeVar, rng) {
    // Size variation (random shrinkage)
    const shrinkW = sizeVar * w * 0.5 * rng();
    const shrinkH = sizeVar * h * 0.5 * rng();
    const sw = w - shrinkW;
    const sh = h - shrinkH;
    const sx = x + shrinkW / 2;
    const sy = y + shrinkH / 2;

    const hw = sw / 2, hh = sh / 2;
    const cx = sx + hw, cy = sy + hh;

    // Irregularity jitter on each corner
    const jx = irregularity * hw * 0.6;
    const jy = irregularity * hh * 0.6;

    return [
        [cx - hw + jx * (rng() * 2 - 1), cy - hh + jy * (rng() * 2 - 1)],
        [cx + hw + jx * (rng() * 2 - 1), cy - hh + jy * (rng() * 2 - 1)],
        [cx + hw + jx * (rng() * 2 - 1), cy + hh + jy * (rng() * 2 - 1)],
        [cx - hw + jx * (rng() * 2 - 1), cy + hh + jy * (rng() * 2 - 1)],
    ];
}

// --- Public API ---
export function generate(config) {
    const w = config.width;
    const h = config.height;
    const cellCount = config.cityscapeCells || 30;
    const uniformity = config.cityscapeUniformity ?? 0;
    const sizeVar = (config.cityscapeSizeVar ?? 60) / 100;
    const subdiv = (config.cityscapeSubdiv ?? 40) / 100;
    const spacing = config.cityscapeSpacing ?? 5;
    const cornerRadius = (config.cityscapeRadius ?? 20) / 100;
    const irregularity = (config.cityscapeIrregularity ?? 40) / 100;
    const minThick = config.cityscapeMinSize ?? 3;
    const rotation = config.rotation || 0;
    const flipH = config.flipH || false;
    const flipV = config.flipV || false;

    // Generate and relax seeds
    const originalSeeds = makeSeeds(config.seed, cellCount, rotation, flipH, flipV);
    const seeds = relaxSeeds(originalSeeds, uniformity);

    // Scale to pixel coords and build 3x3 ghost points
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
    const paths = [];

    for (let block = 0; block < 9; block++) {
        for (let i = 0; i < n; i++) {
            // Per-cell RNG — same for all 9 blocks of the same cell
            const cellRng = mulberry32(config.seed ^ ((i + 1) * 104729));

            // Parking lot (skip entire cell)
            if (cellRng() < sizeVar * 0.15) continue;

            const polygon = voronoi.cellPolygon(block * n + i);
            if (!polygon) continue;
            const poly = polygon.slice(0, -1);

            // Bounding box of the Voronoi cell
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const [px, py] of poly) {
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                maxX = Math.max(maxX, px);
                maxY = Math.max(maxY, py);
            }

            // Inset by spacing
            minX += spacing;
            minY += spacing;
            maxX -= spacing;
            maxY -= spacing;

            const bw = maxX - minX;
            const bh = maxY - minY;
            if (bw < minThick || bh < minThick) continue;

            // Skip if bbox doesn't intersect the tile
            if (maxX <= 0 || maxY <= 0 || minX >= w || minY >= h) continue;

            // Subdivide the bounding box
            const regions = [];
            const subdivRoll = cellRng();

            if (subdivRoll < subdiv * 0.4) {
                // Vertical split (top / bottom)
                const split = 0.25 + cellRng() * 0.5;
                const gap = spacing / 2;
                regions.push({ x: minX, y: minY, w: bw, h: bh * split - gap });
                regions.push({ x: minX, y: minY + bh * split + gap, w: bw, h: bh * (1 - split) - gap });
            } else if (subdivRoll < subdiv * 0.8) {
                // Horizontal split (left / right)
                const split = 0.25 + cellRng() * 0.5;
                const gap = spacing / 2;
                regions.push({ x: minX, y: minY, w: bw * split - gap, h: bh });
                regions.push({ x: minX + bw * split + gap, y: minY, w: bw * (1 - split) - gap, h: bh });
            } else if (subdivRoll < subdiv) {
                // Three-way split
                const splitY = 0.3 + cellRng() * 0.3;
                const splitX = 0.3 + cellRng() * 0.4;
                const gap = spacing / 2;
                regions.push({ x: minX, y: minY, w: bw, h: bh * splitY - gap });
                regions.push({ x: minX, y: minY + bh * splitY + gap, w: bw * splitX - gap, h: bh * (1 - splitY) - gap });
                regions.push({ x: minX + bw * splitX + gap, y: minY + bh * splitY + gap, w: bw * (1 - splitX) - gap, h: bh * (1 - splitY) - gap });
            } else {
                regions.push({ x: minX, y: minY, w: bw, h: bh });
            }

            for (const reg of regions) {
                if (reg.w < minThick || reg.h < minThick) continue;

                // Skip individual subcell (parking lot within subdivision)
                if (regions.length > 1 && cellRng() < sizeVar * 0.1) continue;

                // Generate irregular quadrilateral
                const quad = generateQuad(reg.x, reg.y, reg.w, reg.h, irregularity, sizeVar, cellRng);

                // Min thickness check on the quad
                let qMinX = Infinity, qMinY = Infinity, qMaxX = -Infinity, qMaxY = -Infinity;
                for (const [px, py] of quad) {
                    qMinX = Math.min(qMinX, px);
                    qMinY = Math.min(qMinY, py);
                    qMaxX = Math.max(qMaxX, px);
                    qMaxY = Math.max(qMaxY, py);
                }
                if (qMaxX - qMinX < minThick || qMaxY - qMinY < minThick) continue;

                // Clip to tile boundary
                const clipped = clipPolygonToRect(quad, 0, 0, w, h);
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

                // Area check (skip degenerate slivers)
                let area = 0;
                for (let j = 0; j < clipped.length; j++) {
                    const k = (j + 1) % clipped.length;
                    area += clipped[j][0] * clipped[k][1] - clipped[k][0] * clipped[j][1];
                }
                if (Math.abs(area) < 1) continue;

                const path = polygonToPath(clipped, cornerRadius, w, h);
                if (path) paths.push(path);
            }
        }
    }

    return paths;
}
