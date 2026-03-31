// --- Fractal Hilbert Pattern ---
// Hilbert curve rendered as a filled band with rounded turns.
// Seamless tiling via centered grid + 3x3 ghost copies.

export const name = "Fractal Hilbert";

const f = v => v.toFixed(2);

// --- Generate Hilbert curve points on a 2^depth grid ---
function hilbertPoints(depth) {
    const n = 1 << depth;
    const total = n * n;
    const points = [];

    for (let i = 0; i < total; i++) {
        let rx, ry, s, tx = 0, ty = 0;
        let ii = i;
        for (s = 1; s < n; s *= 2) {
            rx = 1 & (ii / 2);
            ry = 1 & (ii ^ rx);
            if (ry === 0) {
                if (rx === 1) {
                    tx = s - 1 - tx;
                    ty = s - 1 - ty;
                }
                const tmp = tx;
                tx = ty;
                ty = tmp;
            }
            tx += s * rx;
            ty += s * ry;
            ii = Math.floor(ii / 4);
        }
        points.push({ x: tx, y: ty });
    }

    return points;
}

// --- Rounded rectangle path ---
function rectPath(x, y, w, h, r) {
    if (w < 0.1 || h < 0.1) return null;
    if (r <= 0.01) {
        return `M ${f(x)},${f(y)} L ${f(x + w)},${f(y)} L ${f(x + w)},${f(y + h)} L ${f(x)},${f(y + h)} Z`;
    }
    const cr = Math.min(r, Math.min(w, h) / 2);
    if (cr >= Math.min(w, h) / 2 - 0.01) {
        const cx = x + w / 2, cy = y + h / 2;
        const rx2 = w / 2, ry2 = h / 2;
        return `M ${f(cx - rx2)},${f(cy)} A ${f(rx2)},${f(ry2)} 0 1 1 ${f(cx + rx2)},${f(cy)} A ${f(rx2)},${f(ry2)} 0 1 1 ${f(cx - rx2)},${f(cy)} Z`;
    }
    return `M ${f(x + cr)},${f(y)} L ${f(x + w - cr)},${f(y)} Q ${f(x + w)},${f(y)} ${f(x + w)},${f(y + cr)} L ${f(x + w)},${f(y + h - cr)} Q ${f(x + w)},${f(y + h)} ${f(x + w - cr)},${f(y + h)} L ${f(x + cr)},${f(y + h)} Q ${f(x)},${f(y + h)} ${f(x)},${f(y + h - cr)} L ${f(x)},${f(y + cr)} Q ${f(x)},${f(y)} ${f(x + cr)},${f(y)} Z`;
}

// --- Inside corner fill (cell-colored quarter circle added into the void) ---
// At a turn's inside corner, the band outline has a sharp 90° concave angle.
// This adds a small convex quarter-circle fill to round that corner.
function insideCornerFill(px, py, hw, dirIn, dirOut, R) {
    const dIn = { R: {x:1,y:0}, L: {x:-1,y:0}, D: {x:0,y:1}, U: {x:0,y:-1} }[dirIn];
    const dOut = { R: {x:1,y:0}, L: {x:-1,y:0}, D: {x:0,y:1}, U: {x:0,y:-1} }[dirOut];

    // Outside corner offset = (dIn - dOut); inside is opposite
    const sx = dIn.x - dOut.x;
    const sy = dIn.y - dOut.y;

    // Inside corner position (at edge of joint, where void meets the band)
    const ix = px - sx * hw;
    const iy = py - sy * hw;

    // The fill extends into the void (away from joint center)
    // p1: along horizontal edge into void, p2: along vertical edge into void
    const p1x = ix - sx * R;
    const p1y = iy;
    const p2x = ix;
    const p2y = iy - sy * R;

    // Sweep for the convex arc curving through the void
    const sweep = (sx * sy > 0) ? 0 : 1;

    let d = `M ${f(ix)},${f(iy)}`;
    d += ` L ${f(p1x)},${f(p1y)}`;
    d += ` A ${f(R)},${f(R)} 0 0 ${sweep} ${f(p2x)},${f(p2y)}`;
    d += ` Z`;
    return d;
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;

    const depth = config.hilbertDepth ?? 3;
    const balance = config.hilbertBalance ?? 50;
    const cornerRadius = (config.hilbertRadius ?? 50) / 100;

    const gridN = 1 << depth;
    const cellW = w / gridN;
    const cellH = h / gridN;

    // Balance controls band width
    const minFrac = 0.15;
    const maxFrac = 0.85;
    const bandFrac = minFrac + (balance / 100) * (maxFrac - minFrac);
    const hw = Math.min(cellW, cellH) / 2 * bandFrac;

    // Corner radius for joints: 0 = square, 1 = circle
    const jointR = cornerRadius * hw;

    // Generate Hilbert curve points → pixel coords (centered in tile)
    const gridPts = hilbertPoints(depth);
    const pts = gridPts.map(p => ({
        x: p.x * cellW + cellW / 2,
        y: p.y * cellH + cellH / 2
    }));

    // Apply rotation/flip transforms to curve points
    for (let rot = 0; rot < (config.rotation || 0); rot++) {
        for (const p of pts) {
            const nx = 1 - p.y / h;
            const ny = p.x / w;
            p.x = nx * w;
            p.y = ny * h;
        }
    }
    if (config.flipH) {
        for (const p of pts) p.x = w - p.x;
    }
    if (config.flipV) {
        for (const p of pts) p.y = h - p.y;
    }

    // Build segment rects and joint rects
    const rects = [];

    // Segments: axis-aligned rects between adjacent curve points
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = Math.abs(b.x - a.x);
        const dy = Math.abs(b.y - a.y);

        if (dx > dy) {
            const x1 = Math.min(a.x, b.x);
            rects.push({ x: x1, y: a.y - hw, w: dx, h: hw * 2, r: 0 });
        } else {
            const y1 = Math.min(a.y, b.y);
            rects.push({ x: a.x - hw, y: y1, w: hw * 2, h: dy, r: 0 });
        }
    }

    // Joints: rounded squares at each curve point
    for (const p of pts) {
        rects.push({ x: p.x - hw, y: p.y - hw, w: hw * 2, h: hw * 2, r: jointR });
    }

    // Compute directions for inside corner fills
    const dirs = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        dirs.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    }

    // 3x3 ghost copies for seamless tiling
    const paths = [];
    for (let gy = -1; gy <= 1; gy++) {
        for (let gx = -1; gx <= 1; gx++) {
            const ox = gx * w;
            const oy = gy * h;

            for (const r of rects) {
                const rx = r.x + ox;
                const ry = r.y + oy;

                if (rx + r.w < 0.1 || rx > w - 0.1 || ry + r.h < 0.1 || ry > h - 0.1) continue;

                const cx1 = Math.max(0, rx);
                const cy1 = Math.max(0, ry);
                const cx2 = Math.min(w, rx + r.w);
                const cy2 = Math.min(h, ry + r.h);
                const cw = cx2 - cx1;
                const ch = cy2 - cy1;

                if (cw < 0.1 || ch < 0.1) continue;

                const isClipped = cx1 > rx + 0.01 || cy1 > ry + 0.01 ||
                                  cx2 < rx + r.w - 0.01 || cy2 < ry + r.h - 0.01;
                const path = rectPath(cx1, cy1, cw, ch, isClipped ? 0 : r.r);
                if (path) paths.push(path);
            }

            // Inside corner fills (cell-colored quarter circles in the void)
            if (jointR > 0.01) {
                for (let i = 1; i < pts.length - 1; i++) {
                    if (dirs[i - 1] === dirs[i]) continue; // straight-through, no turn

                    const cpx = pts[i].x + ox;
                    const cpy = pts[i].y + oy;

                    // Quick reject
                    if (cpx + hw + jointR < 0.1 || cpx - hw - jointR > w - 0.1 ||
                        cpy + hw + jointR < 0.1 || cpy - hw - jointR > h - 0.1) continue;

                    // Compute inside corner position to check bounds
                    const dIn = { R: {x:1,y:0}, L: {x:-1,y:0}, D: {x:0,y:1}, U: {x:0,y:-1} }[dirs[i-1]];
                    const dOut = { R: {x:1,y:0}, L: {x:-1,y:0}, D: {x:0,y:1}, U: {x:0,y:-1} }[dirs[i]];
                    const sx = dIn.x - dOut.x;
                    const sy = dIn.y - dOut.y;
                    const ix = cpx - sx * hw;
                    const iy = cpy - sy * hw;

                    // Only include fills fully inside tile
                    const fx1 = Math.min(ix, ix - sx * jointR);
                    const fy1 = Math.min(iy, iy - sy * jointR);
                    const fx2 = Math.max(ix, ix - sx * jointR);
                    const fy2 = Math.max(iy, iy - sy * jointR);
                    if (fx1 < -0.1 || fx2 > w + 0.1 || fy1 < -0.1 || fy2 > h + 0.1) continue;

                    paths.push(insideCornerFill(cpx, cpy, hw, dirs[i - 1], dirs[i], jointR));
                }
            }
        }
    }

    return paths;
}
