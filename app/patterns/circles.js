// --- Circle Packing Pattern ---
export const name = "Circle Packing";

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

// --- Circle SVG path (two arcs) ---
function circlePath(cx, cy, r) {
    const f = v => v.toFixed(2);
    return `M ${f(cx - r)},${f(cy)} A ${f(r)},${f(r)} 0 1,0 ${f(cx + r)},${f(cy)} A ${f(r)},${f(r)} 0 1,0 ${f(cx - r)},${f(cy)} Z`;
}

// --- Generate circle packing pattern ---
export function generate(config) {
    const w = config.width;
    const h = config.height;
    const rng = mulberry32(config.seed);

    const scale = config.circlesScale ?? 50;
    const sizeRange = config.circlesSizeRange ?? 70;
    const density = config.circlesDensity ?? 50;
    const spacing = config.circlesSpacing ?? 5;
    const sizeBias = config.circlesSizeBias ?? 50;

    // Generate seed points in normalized 0-1 coords, then apply rotation/flip
    // We generate circle centers + radii in normalized space

    const minDim = Math.min(w, h);
    // Max radius: scale 100 → ~15% of tile size
    const maxRadius = minDim * (scale / 100) * 0.15;
    // Min radius based on size range (0 = uniform, 100 = wide range)
    const baseMinRadius = Math.max(
        maxRadius * (1 - sizeRange / 100),
        minDim * 0.008 // minimum for manufacturability
    );

    // Size Bias shifts the effective radius range:
    // bias 0 (small): effective max shrinks toward min, few large circles possible
    // bias 50 (neutral): full range
    // bias 100 (large): effective min grows toward max, few small circles possible
    const biasT = sizeBias / 100; // 0 to 1
    const effectiveMaxRadius = baseMinRadius + (maxRadius - baseMinRadius) * (0.3 + 0.7 * biasT);
    const effectiveMinRadius = baseMinRadius + (maxRadius - baseMinRadius) * 0.5 * Math.max(0, biasT - 0.5);

    // Total placement attempts scales with density
    const totalAttempts = Math.round(200 + density * 30);

    const circles = []; // {cx, cy, r} in pixel coords

    // Check if candidate circle fits (periodic boundary collision check)
    function fits(cx, cy, r) {
        for (const c of circles) {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const ox = c.cx + dx * w;
                    const oy = c.cy + dy * h;
                    const dist = Math.hypot(cx - ox, cy - oy);
                    if (dist < r + c.r + spacing) return false;
                }
            }
        }
        return true;
    }

    // Generate candidates with random radii, then sort largest-first
    const candidates = [];
    for (let i = 0; i < totalAttempts; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        // Continuous random radius within the bias-adjusted range
        const t = rng();
        const r = effectiveMinRadius + (effectiveMaxRadius - effectiveMinRadius) * t;
        candidates.push({ cx, cy, r });
    }
    candidates.sort((a, b) => b.r - a.r);

    // Place circles largest-first
    for (const cand of candidates) {
        if (fits(cand.cx, cand.cy, cand.r)) {
            circles.push(cand);
        }
    }

    // Apply rotation/flip transforms to circle centers
    for (let rot = 0; rot < (config.rotation || 0); rot++) {
        for (const c of circles) {
            const nx = c.cy / h;
            const ny = 1 - c.cx / w;
            c.cx = nx * w;
            c.cy = ny * h;
        }
    }
    if (config.flipH) {
        for (const c of circles) {
            c.cx = w - c.cx;
        }
    }
    if (config.flipV) {
        for (const c of circles) {
            c.cy = h - c.cy;
        }
    }

    // Generate SVG paths, including ghost copies for edge-crossing circles
    const paths = [];
    for (const c of circles) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cx = c.cx + dx * w;
                const cy = c.cy + dy * h;
                // Only include if circle overlaps with tile area
                if (cx + c.r > 0 && cx - c.r < w && cy + c.r > 0 && cy - c.r < h) {
                    paths.push(circlePath(cx, cy, c.r));
                }
            }
        }
    }

    return paths;
}
