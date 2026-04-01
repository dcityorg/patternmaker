// --- Truchet Tile Pattern ---
export const name = "Truchet";

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

// --- Arc band path generation ---
function arcBandPath(cx, cy, dx1, dy1, dx2, dy2, nomW, nomH, arcFraction, roundness) {
    const fmt = v => v.toFixed(2);
    const k = 0.5523;
    const r = Math.max(0, Math.min(1, roundness));

    const r1nom = Math.abs(dx1) > 0.5 ? nomW : nomH;
    const r2nom = Math.abs(dx2) > 0.5 ? nomW : nomH;

    const rOut1 = r1nom * (1 + arcFraction);
    const rOut2 = r2nom * (1 + arcFraction);
    const rIn1 = r1nom * (1 - arcFraction);
    const rIn2 = r2nom * (1 - arcFraction);

    const ox1 = cx + rOut1 * dx1, oy1 = cy + rOut1 * dy1;
    const ox2 = cx + rOut2 * dx2, oy2 = cy + rOut2 * dy2;
    const ix1 = cx + rIn1 * dx1, iy1 = cy + rIn1 * dy1;
    const ix2 = cx + rIn2 * dx2, iy2 = cy + rIn2 * dy2;

    const icx = cx + rIn1 * dx1 + rIn2 * dx2;
    const icy = cy + rIn1 * dy1 + rIn2 * dy2;

    let d = `M ${fmt(ox1)},${fmt(oy1)}`;

    // Outer curve (edge1 to edge2)
    if (r < 0.01) {
        d += ` L ${fmt(cx)},${fmt(cy)} L ${fmt(ox2)},${fmt(oy2)}`;
    } else {
        const cp1x = cx + r * (rOut1 * dx1 + k * rOut2 * dx2);
        const cp1y = cy + r * (rOut1 * dy1 + k * rOut2 * dy2);
        const cp2x = cx + r * (k * rOut1 * dx1 + rOut2 * dx2);
        const cp2y = cy + r * (k * rOut1 * dy1 + rOut2 * dy2);
        d += ` C ${fmt(cp1x)},${fmt(cp1y)} ${fmt(cp2x)},${fmt(cp2y)} ${fmt(ox2)},${fmt(oy2)}`;
    }

    d += ` L ${fmt(ix2)},${fmt(iy2)}`;

    // Inner curve (edge2 to edge1, reverse)
    if (r < 0.01) {
        d += ` L ${fmt(icx)},${fmt(icy)} L ${fmt(ix1)},${fmt(iy1)}`;
    } else {
        const cir_cp1x = cx + k * rIn1 * dx1 + rIn2 * dx2;
        const cir_cp1y = cy + k * rIn1 * dy1 + rIn2 * dy2;
        const cir_cp2x = cx + rIn1 * dx1 + k * rIn2 * dx2;
        const cir_cp2y = cy + rIn1 * dy1 + k * rIn2 * dy2;

        const cp1x = icx + (cir_cp1x - icx) * r;
        const cp1y = icy + (cir_cp1y - icy) * r;
        const cp2x = icx + (cir_cp2x - icx) * r;
        const cp2y = icy + (cir_cp2y - icy) * r;

        d += ` C ${fmt(cp1x)},${fmt(cp1y)} ${fmt(cp2x)},${fmt(cp2y)} ${fmt(ix1)},${fmt(iy1)}`;
    }

    d += " Z";
    return d;
}

// --- Grid generation with rotate/flip ---
function buildOrientationGrid(seed, baseCols, baseRows, rotation, flipH, flipV) {
    const rng = mulberry32(seed);

    // Generate base grid
    let grid = [];
    for (let row = 0; row < baseRows; row++) {
        grid[row] = [];
        for (let col = 0; col < baseCols; col++) {
            grid[row][col] = rng() < 0.5 ? 0 : 1;
        }
    }

    // Apply rotation (each 90° CW: (col,row) -> (rows-1-row, col), orientation flips)
    let rows = baseRows, cols = baseCols;
    for (let r = 0; r < rotation; r++) {
        const newGrid = [];
        const newRows = cols;
        const newCols = rows;
        for (let row = 0; row < newRows; row++) {
            newGrid[row] = [];
            for (let col = 0; col < newCols; col++) {
                newGrid[row][col] = 1 - grid[rows - 1 - col][row];
            }
        }
        grid = newGrid;
        rows = newRows;
        cols = newCols;
    }

    // Apply flips (each flip mirrors the grid and inverts orientations)
    if (flipH) {
        const flipped = [];
        for (let row = 0; row < rows; row++) {
            flipped[row] = [];
            for (let col = 0; col < cols; col++) {
                flipped[row][col] = 1 - grid[row][cols - 1 - col];
            }
        }
        grid = flipped;
    }
    if (flipV) {
        const flipped = [];
        for (let row = 0; row < rows; row++) {
            flipped[row] = [];
            for (let col = 0; col < cols; col++) {
                flipped[row][col] = 1 - grid[rows - 1 - row][col];
            }
        }
        grid = flipped;
    }

    return { grid, rows, cols };
}

// --- Public API ---
export function generate(config) {
    const w = config.width;
    const h = config.height;
    const gridSize = config.truchetGrid || 8;
    const balance = config.truchetBalance ?? 20;
    const roundness = (config.truchetRoundness ?? 100) / 100;
    const rotation = config.rotation || 0;
    const flipH = config.flipH || false;
    const flipV = config.flipV || false;

    // Compute base dimensions (undo rotation's width/height swap)
    let baseW = w, baseH = h;
    if (rotation % 2 === 1) {
        baseW = h;
        baseH = w;
    }

    // Base grid dimensions (before rotation)
    const baseCols = gridSize;
    const baseTileSize = baseW / baseCols;
    const baseRows = Math.max(1, Math.round(baseH / baseTileSize));

    // Build orientation grid with transforms applied
    const { grid, rows, cols } = buildOrientationGrid(
        config.seed, baseCols, baseRows, rotation, flipH, flipV
    );

    const tileW = w / cols;
    const tileH = h / rows;
    const nomW = tileW / 2;
    const nomH = tileH / 2;
    const arcFraction = 0.15 + (balance / 100) * 0.70;

    const paths = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const orientation = grid[row][col];
            const tx = col * tileW;
            const ty = row * tileH;

            if (orientation === 0) {
                // Top-left + bottom-right corners
                paths.push(arcBandPath(tx, ty, 1, 0, 0, 1, nomW, nomH, arcFraction, roundness));
                paths.push(arcBandPath(tx + tileW, ty + tileH, -1, 0, 0, -1, nomW, nomH, arcFraction, roundness));
            } else {
                // Top-right + bottom-left corners
                paths.push(arcBandPath(tx + tileW, ty, -1, 0, 0, 1, nomW, nomH, arcFraction, roundness));
                paths.push(arcBandPath(tx, ty + tileH, 1, 0, 0, -1, nomW, nomH, arcFraction, roundness));
            }
        }
    }

    return paths;
}
