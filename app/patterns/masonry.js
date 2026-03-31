// --- Masonry Pattern ---
export const name = "Masonry";

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

// --- Rounded rectangle SVG path ---
function roundedRectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r < 0.01) r = 0;
    const f = v => v.toFixed(2);
    if (r === 0) {
        return `M ${f(x)},${f(y)} h ${f(w)} v ${f(h)} h ${f(-w)} Z`;
    }
    return `M ${f(x + r)},${f(y)} ` +
        `h ${f(w - 2 * r)} ` +
        `q ${f(r)},0 ${f(r)},${f(r)} ` +
        `v ${f(h - 2 * r)} ` +
        `q 0,${f(r)} ${f(-r)},${f(r)} ` +
        `h ${f(-(w - 2 * r))} ` +
        `q ${f(-r)},0 ${f(-r)},${f(-r)} ` +
        `v ${f(-(h - 2 * r))} ` +
        `q 0,${f(-r)} ${f(r)},${f(-r)} Z`;
}

// --- Generate subcell data for one grid cell ---
// Returns array of { nx, ny, nw, nh } in normalized 0-1 coords within the cell
function generateCellSubcells(rng, subdivChance, sizeVar, irregularity, hwW, hwH) {
    // Chance to skip entire cell (tied to size variation)
    if (rng() < sizeVar * 0.15) return [];

    // Determine subdivision regions
    const roll = rng();
    let regions;

    if (roll < subdivChance * 0.4) {
        // Vertical split (top/bottom)
        const split = 0.25 + rng() * 0.5;
        regions = [
            { nx: 0, ny: 0, nw: 1, nh: split },
            { nx: 0, ny: split, nw: 1, nh: 1 - split }
        ];
    } else if (roll < subdivChance * 0.8) {
        // Horizontal split (left/right)
        const split = 0.25 + rng() * 0.5;
        regions = [
            { nx: 0, ny: 0, nw: split, nh: 1 },
            { nx: split, ny: 0, nw: 1 - split, nh: 1 }
        ];
    } else if (roll < subdivChance) {
        // Three-way split (one on top, two below)
        const splitY = 0.3 + rng() * 0.3;
        const splitX = 0.3 + rng() * 0.4;
        regions = [
            { nx: 0, ny: 0, nw: 1, nh: splitY },
            { nx: 0, ny: splitY, nw: splitX, nh: 1 - splitY },
            { nx: splitX, ny: splitY, nw: 1 - splitX, nh: 1 - splitY }
        ];
    } else {
        regions = [{ nx: 0, ny: 0, nw: 1, nh: 1 }];
    }

    // Build subcell rectangles within each region
    const subcells = [];
    for (const reg of regions) {
        // Skip individual subcells at high size variation
        if (regions.length > 1 && rng() < sizeVar * 0.1) continue;

        // Inset by half wall thickness
        let sx = reg.nx + hwW;
        let sy = reg.ny + hwH;
        let sw = reg.nw - 2 * hwW;
        let sh = reg.nh - 2 * hwH;

        if (sw <= 0.02 || sh <= 0.02) continue;

        // Size variation (random shrinkage)
        const shrinkW = sizeVar * sw * 0.5 * rng();
        const shrinkH = sizeVar * sh * 0.5 * rng();
        sw -= shrinkW;
        sh -= shrinkH;

        // Center the shrinkage, then apply irregularity offset
        sx += shrinkW / 2 + irregularity * reg.nw * 0.6 * (rng() - 0.5);
        sy += shrinkH / 2 + irregularity * reg.nh * 0.6 * (rng() - 0.5);

        if (sw > 0.02 && sh > 0.02) {
            subcells.push({ nx: sx, ny: sy, nw: sw, nh: sh });
        }
    }

    return subcells;
}

// --- Build grid with rotation/flip support ---
function buildGrid(seed, baseCols, baseRows, subdivChance, sizeVar, irregularity, hwW, hwH, rotation, flipH, flipV) {
    const rng = mulberry32(seed);

    // Build base grid
    let grid = [];
    for (let row = 0; row < baseRows; row++) {
        grid[row] = [];
        for (let col = 0; col < baseCols; col++) {
            grid[row][col] = generateCellSubcells(rng, subdivChance, sizeVar, irregularity, hwW, hwH);
        }
    }

    // Apply rotation (each 90° CW)
    let rows = baseRows, cols = baseCols;
    for (let r = 0; r < rotation; r++) {
        const newGrid = [];
        const newRows = cols;
        const newCols = rows;
        for (let row = 0; row < newRows; row++) {
            newGrid[row] = [];
            for (let col = 0; col < newCols; col++) {
                const srcCells = grid[rows - 1 - col][row];
                // Rotate each subcell 90° CW: (nx,ny,nw,nh) -> (1-ny-nh, nx, nh, nw)
                newGrid[row][col] = srcCells.map(s => ({
                    nx: 1 - s.ny - s.nh,
                    ny: s.nx,
                    nw: s.nh,
                    nh: s.nw
                }));
            }
        }
        grid = newGrid;
        rows = newRows;
        cols = newCols;
    }

    // Apply flips
    if (flipH) {
        const flipped = [];
        for (let row = 0; row < rows; row++) {
            flipped[row] = [];
            for (let col = 0; col < cols; col++) {
                const srcCells = grid[row][cols - 1 - col];
                flipped[row][col] = srcCells.map(s => ({
                    nx: 1 - s.nx - s.nw,
                    ny: s.ny,
                    nw: s.nw,
                    nh: s.nh
                }));
            }
        }
        grid = flipped;
    }
    if (flipV) {
        const flipped = [];
        for (let row = 0; row < rows; row++) {
            flipped[row] = [];
            for (let col = 0; col < cols; col++) {
                const srcCells = grid[rows - 1 - row][col];
                flipped[row][col] = srcCells.map(s => ({
                    nx: s.nx,
                    ny: 1 - s.ny - s.nh,
                    nw: s.nw,
                    nh: s.nh
                }));
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
    const gridSize = config.masonryGrid || 8;
    const sizeVar = (config.masonrySizeVar ?? 60) / 100;
    const subdiv = (config.masonrySubdiv ?? 40) / 100;
    const radius = (config.masonryRadius ?? 20) / 100;
    const wall = config.masonrySpacing ?? 5;
    const irregularity = (config.masonryIrregularity ?? 40) / 100;
    const rotation = config.rotation || 0;
    const flipH = config.flipH || false;
    const flipV = config.flipV || false;

    // Compute base dimensions (undo rotation's width/height swap)
    let baseW = w, baseH = h;
    if (rotation % 2 === 1) { baseW = h; baseH = w; }

    const baseCols = gridSize;
    const baseCellW = baseW / baseCols;
    const baseRows = Math.max(1, Math.round(baseH / baseCellW));
    const baseCellH = baseH / baseRows;

    // Half wall as fraction of cell dimensions
    const hwW = (wall / 2) / baseCellW;
    const hwH = (wall / 2) / baseCellH;

    const { grid, rows, cols } = buildGrid(
        config.seed, baseCols, baseRows, subdiv, sizeVar, irregularity,
        hwW, hwH, rotation, flipH, flipV
    );

    const cellW = w / cols;
    const cellH = h / rows;
    const maxR = Math.min(cellW, cellH) * 0.35;
    const r = radius * maxR;

    const paths = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cx = col * cellW;
            const cy = row * cellH;
            for (const s of grid[row][col]) {
                const rx = cx + s.nx * cellW;
                const ry = cy + s.ny * cellH;
                const rw = s.nw * cellW;
                const rh = s.nh * cellH;
                if (rw > 1 && rh > 1) {
                    paths.push(roundedRectPath(rx, ry, rw, rh, Math.min(r, rw / 2, rh / 2)));
                }
            }
        }
    }

    return paths;
}
