// --- Fractal Carpet Pattern ---
// Sierpinski carpet: recursively remove center squares at each depth level.
// Seamless tiling by construction (square subdivides into 9ths).

export const name = "Fractal Carpet";

const f = v => v.toFixed(2);

// --- Generate rounded rectangle path ---
function rectPath(x, y, w, h, cornerRadius) {
    if (cornerRadius <= 0.01) {
        return `M ${f(x)},${f(y)} L ${f(x + w)},${f(y)} L ${f(x + w)},${f(y + h)} L ${f(x)},${f(y + h)} Z`;
    }
    // Corner radius as fraction of half the smaller dimension
    const maxR = Math.min(w, h) / 2;
    const r = maxR * cornerRadius;
    return `M ${f(x + r)},${f(y)} L ${f(x + w - r)},${f(y)} Q ${f(x + w)},${f(y)} ${f(x + w)},${f(y + r)} L ${f(x + w)},${f(y + h - r)} Q ${f(x + w)},${f(y + h)} ${f(x + w - r)},${f(y + h)} L ${f(x + r)},${f(y + h)} Q ${f(x)},${f(y + h)} ${f(x)},${f(y + h - r)} L ${f(x)},${f(y + r)} Q ${f(x)},${f(y)} ${f(x + r)},${f(y)} Z`;
}

// --- Recursively collect hole rectangles ---
function collectHoles(x, y, cellW, cellH, depth, maxDepth, spacing) {
    if (depth > maxDepth) return [];

    const thirdW = cellW / 3;
    const thirdH = cellH / 3;
    const holes = [];

    // Center hole (inset by spacing/2 on each side)
    const inset = spacing / 2;
    const hx = x + thirdW + inset;
    const hy = y + thirdH + inset;
    const hw = thirdW - spacing;
    const hh = thirdH - spacing;

    if (hw > 0 && hh > 0) {
        holes.push({ x: hx, y: hy, w: hw, h: hh });
    }

    // Recurse into the 8 surrounding sub-cells
    if (depth < maxDepth) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (row === 1 && col === 1) continue; // Skip center
                const subHoles = collectHoles(
                    x + col * thirdW,
                    y + row * thirdH,
                    thirdW, thirdH, depth + 1, maxDepth, spacing
                );
                holes.push(...subHoles);
            }
        }
    }

    return holes;
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;

    const depth = config.carpetDepth ?? 3;
    const spacing = config.carpetSpacing ?? 2;
    const cornerRadius = (config.carpetRadius ?? 0) / 100;
    const invert = config.carpetInvert ?? false;

    // Collect all hole rectangles
    const holes = collectHoles(0, 0, w, h, 1, depth, spacing);

    // Apply rotation/flip to hole centers
    const rects = holes.map(hole => {
        let cx = hole.x + hole.w / 2;
        let cy = hole.y + hole.h / 2;

        for (let rot = 0; rot < (config.rotation || 0); rot++) {
            const nx = cy / h;
            const ny = 1 - cx / w;
            cx = nx * w;
            cy = ny * h;
        }
        if (config.flipH) cx = w - cx;
        if (config.flipV) cy = h - cy;

        return { x: cx - hole.w / 2, y: cy - hole.h / 2, w: hole.w, h: hole.h };
    });

    if (invert) {
        // Invert: the holes become filled shapes
        const paths = [];
        for (const r of rects) {
            paths.push(rectPath(r.x, r.y, r.w, r.h, cornerRadius));
        }
        return paths;
    } else {
        // Normal: full tile with holes cut out
        // Build a single path: outer rectangle (CW) + each hole (CCW) for cutout via even-odd fill
        let d = `M 0,0 L ${f(w)},0 L ${f(w)},${f(h)} L 0,${f(h)} Z`;

        for (const r of rects) {
            if (cornerRadius <= 0.01) {
                // CCW winding for hole cutout
                d += ` M ${f(r.x)},${f(r.y)} L ${f(r.x)},${f(r.y + r.h)} L ${f(r.x + r.w)},${f(r.y + r.h)} L ${f(r.x + r.w)},${f(r.y)} Z`;
            } else {
                const maxRad = Math.min(r.w, r.h) / 2;
                const rad = maxRad * cornerRadius;
                // CCW rounded rectangle
                d += ` M ${f(r.x + rad)},${f(r.y)}`;
                d += ` Q ${f(r.x)},${f(r.y)} ${f(r.x)},${f(r.y + rad)}`;
                d += ` L ${f(r.x)},${f(r.y + r.h - rad)}`;
                d += ` Q ${f(r.x)},${f(r.y + r.h)} ${f(r.x + rad)},${f(r.y + r.h)}`;
                d += ` L ${f(r.x + r.w - rad)},${f(r.y + r.h)}`;
                d += ` Q ${f(r.x + r.w)},${f(r.y + r.h)} ${f(r.x + r.w)},${f(r.y + r.h - rad)}`;
                d += ` L ${f(r.x + r.w)},${f(r.y + rad)}`;
                d += ` Q ${f(r.x + r.w)},${f(r.y)} ${f(r.x + r.w - rad)},${f(r.y)}`;
                d += ` Z`;
            }
        }

        return [d];
    }
}
