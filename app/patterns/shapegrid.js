// --- Shape Grid Pattern ---
// Places geometric shapes on a regular grid with optional row offset.
// Seamless tiling by construction (grid aligns to tile boundaries).

export const name = "Shapes Aligned";

// --- Shape path helpers ---
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

function crossPoints(cx, cy, r, angle) {
    // Plus/cross shape: 12-vertex polygon
    const armWidth = r * 0.38; // arm is ~38% of radius
    const raw = [
        [-armWidth, -r], [armWidth, -r],    // top arm
        [armWidth, -armWidth], [r, -armWidth], [r, armWidth], // right arm
        [armWidth, armWidth], [armWidth, r],  // bottom arm
        [-armWidth, r], [-armWidth, armWidth],
        [-r, armWidth], [-r, -armWidth],      // left arm
        [-armWidth, -armWidth],
    ];
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return raw.map(([x, y]) => [
        cx + x * cos - y * sin,
        cy + x * sin + y * cos,
    ]);
}

function diamondPoints(cx, cy, r, angle) {
    // Diamond is a square rotated 45°, but with r as tip-to-center distance
    return regularPolygonPoints(cx, cy, r, 4, angle);
}

function squarePoints(cx, cy, r, angle) {
    const pts = [];
    for (let i = 0; i < 4; i++) {
        const a = angle + Math.PI / 4 + (i * Math.PI) / 2;
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
    const n = pts.length;
    const t = Math.min(cornerRadius, 0.5);
    let d = "";
    for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const curr = pts[i];
        const next = pts[(i + 1) % n];
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

function makeShapePath(shape, cx, cy, r, angle, cornerRadius) {
    switch (shape) {
        case "circle":
            return circlePath(cx, cy, r);
        case "square":
            return polygonPath(squarePoints(cx, cy, r, angle), cornerRadius);
        case "roundedSquare":
            return polygonPath(squarePoints(cx, cy, r, angle), Math.max(cornerRadius, 0.2));
        case "diamond":
            return polygonPath(diamondPoints(cx, cy, r, angle), cornerRadius);
        case "star":
            return polygonPath(starPoints(cx, cy, r, r * 0.45, 6, angle), cornerRadius);
        case "cross":
            return polygonPath(crossPoints(cx, cy, r, angle), cornerRadius);
        case "triangle":
            return polygonPath(regularPolygonPoints(cx, cy, r, 3, angle), cornerRadius);
        case "pentagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 5, angle), cornerRadius);
        case "hexagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 6, angle), cornerRadius);
        case "octagon":
            return polygonPath(regularPolygonPoints(cx, cy, r, 8, angle), cornerRadius);
        default:
            return circlePath(cx, cy, r);
    }
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;

    const cols = config.sgridCols ?? 8;
    const rowOffset = (config.sgridOffset ?? 0) / 100; // 0-0.5
    const spacing = config.sgridSpacing ?? 5;
    const cornerRadius = (config.sgridRadius ?? 20) / 100;
    const rotationDeg = config.sgridRotation ?? 0;
    const shapeType = config.sgridShape ?? "hexagon";

    const angle = (rotationDeg * Math.PI) / 180 - Math.PI / 2;

    // Cell width from column count — divides tile width exactly
    const cellW = w / cols;

    // Row count: aim for square cells, forced even so offset pattern tiles
    let rows = Math.round(h / cellW);
    if (rows < 2) rows = 2;
    if (rows % 2 !== 0) {
        // Pick the even number that gives cellH closest to cellW
        const rDown = Math.max(2, rows - 1);
        const rUp = rows + 1;
        rows = Math.abs(h / rDown - cellW) < Math.abs(h / rUp - cellW) ? rDown : rUp;
    }
    const cellH = h / rows;

    // Shape radius: fit within the smaller cell dimension
    const maxR = Math.min(cellW, cellH) / 2 - spacing / 2;
    const minR = Math.min(w, h) * 0.015;
    const r = Math.max(maxR, minR);

    // Generate grid centers — rows x cols fit exactly into tile
    const centers = [];
    for (let row = 0; row < rows; row++) {
        const xShift = (row % 2) * rowOffset * cellW;
        for (let col = 0; col < cols; col++) {
            centers.push({
                cx: col * cellW + cellW / 2 + xShift,
                cy: row * cellH + cellH / 2,
            });
        }
    }

    // Apply rotation/flip transforms to centers
    for (let rot = 0; rot < (config.rotation || 0); rot++) {
        for (const c of centers) {
            const nx = c.cy / h;
            const ny = 1 - c.cx / w;
            c.cx = nx * w;
            c.cy = ny * h;
        }
    }
    if (config.flipH) {
        for (const c of centers) c.cx = w - c.cx;
    }
    if (config.flipV) {
        for (const c of centers) c.cy = h - c.cy;
    }

    // Render with ghost copies for edge-crossing shapes
    const paths = [];
    for (const c of centers) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const sx = c.cx + dx * w;
                const sy = c.cy + dy * h;
                if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue;
                paths.push(makeShapePath(shapeType, sx, sy, r, angle, cornerRadius));
            }
        }
    }

    return paths;
}
