// --- Hexagon Grid Pattern ---
export const name = "Hexagon Grid";

// --- Sutherland-Hodgman polygon clipping ---
function clipPoly(poly, x0, y0, x1, y1) {
    let output = poly;
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

// --- Convert line segment to filled band (rectangle polygon) ---
function segToBand(x1, y1, x2, y2, hw, ext) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return null;
    const ux = dx / len, uy = dy / len;
    const nx = -uy * hw, ny = ux * hw;
    const ex1 = x1 - ux * ext, ey1 = y1 - uy * ext;
    const ex2 = x2 + ux * ext, ey2 = y2 + uy * ext;
    return [[ex1 + nx, ey1 + ny], [ex2 + nx, ey2 + ny], [ex2 - nx, ey2 - ny], [ex1 - nx, ey1 - ny]];
}

// --- Filled disc as 8-gon ---
function disc(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    return pts;
}

// --- Polygon to SVG path ---
function toPath(pts) {
    return "M" + pts.map(p => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L") + "Z";
}

// --- Hex vertex positions (flat-top) ---
function hexVerts(cx, cy, a, b) {
    return [
        [cx + a, cy],
        [cx + a / 2, cy + b],
        [cx - a / 2, cy + b],
        [cx - a, cy],
        [cx - a / 2, cy - b],
        [cx + a / 2, cy - b],
    ];
}

// --- Edge midpoints ---
function hexMids(V) {
    const M = [];
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        M.push([(V[i][0] + V[j][0]) / 2, (V[i][1] + V[j][1]) / 2]);
    }
    return M;
}

// --- Internal pattern line segments ---
function patternSegs(cx, cy, a, b, V, M, style) {
    const segs = [];

    // Hex edges — marked true so they render at double width (half gets clipped by hex)
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        segs.push([V[i][0], V[i][1], V[j][0], V[j][1], true]);
    }

    switch (style) {
        case "starburst":
            // 12 radials: center to vertices + edge midpoints
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
                segs.push([cx, cy, M[i][0], M[i][1]]);
            }
            break;

        case "asanoha":
            // Starburst + hemp leaf detail (midpoints to half-radii)
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
                segs.push([cx, cy, M[i][0], M[i][1]]);
                const hx1 = (cx + V[i][0]) / 2;
                const hy1 = (cy + V[i][1]) / 2;
                const hx2 = (cx + V[(i + 1) % 6][0]) / 2;
                const hy2 = (cy + V[(i + 1) % 6][1]) / 2;
                segs.push([M[i][0], M[i][1], hx1, hy1]);
                segs.push([M[i][0], M[i][1], hx2, hy2]);
            }
            break;

        case "star": {
            // Star of David (two overlapping triangles)
            segs.push([V[0][0], V[0][1], V[2][0], V[2][1]]);
            segs.push([V[2][0], V[2][1], V[4][0], V[4][1]]);
            segs.push([V[4][0], V[4][1], V[0][0], V[0][1]]);
            segs.push([V[1][0], V[1][1], V[3][0], V[3][1]]);
            segs.push([V[3][0], V[3][1], V[5][0], V[5][1]]);
            segs.push([V[5][0], V[5][1], V[1][0], V[1][1]]);
            break;
        }

        case "nested": {
            // Inner hexagon + vertex radial connections
            const s = 0.45;
            const IV = hexVerts(cx, cy, a * s, b * s);
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                segs.push([IV[i][0], IV[i][1], IV[j][0], IV[j][1]]);
                segs.push([V[i][0], V[i][1], IV[i][0], IV[i][1]]);
            }
            break;
        }

        case "tri":
            // 6-way triangle division (center to vertices only)
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
            }
            break;

        case "diamondcross":
            // 6 vertex radials divide hex into 6 equilateral triangles
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
            }
            // Each triangle gets a Y: 3 lines from its centroid to its 3 corners
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                const tcx = (cx + V[i][0] + V[j][0]) / 3;
                const tcy = (cy + V[i][1] + V[j][1]) / 3;
                segs.push([tcx, tcy, cx, cy]);
                segs.push([tcx, tcy, V[i][0], V[i][1]]);
                segs.push([tcx, tcy, V[j][0], V[j][1]]);
            }
            break;

        case "flowerstar":
            // Like asanoha but midpoints connect to 1/3 along radials (larger diamonds)
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
                segs.push([cx, cy, M[i][0], M[i][1]]);
                const t = 1 / 3;
                const px1 = cx + (V[i][0] - cx) * t;
                const py1 = cy + (V[i][1] - cy) * t;
                const j = (i + 1) % 6;
                const px2 = cx + (V[j][0] - cx) * t;
                const py2 = cy + (V[j][1] - cy) * t;
                segs.push([M[i][0], M[i][1], px1, py1]);
                segs.push([M[i][0], M[i][1], px2, py2]);
            }
            break;

        case "trisub": {
            // Diamond Cross base: 6 vertex radials + 6 Y's
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
            }
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                const tcx = (cx + V[i][0] + V[j][0]) / 3;
                const tcy = (cy + V[i][1] + V[j][1]) / 3;
                // Y arms: centroid to each corner of the triangle
                segs.push([tcx, tcy, cx, cy]);
                segs.push([tcx, tcy, V[i][0], V[i][1]]);
                segs.push([tcx, tcy, V[j][0], V[j][1]]);
                // Midpoints of each Y arm
                const mCx = (tcx + cx) / 2, mCy = (tcy + cy) / 2;
                const mVix = (tcx + V[i][0]) / 2, mViy = (tcy + V[i][1]) / 2;
                const mVjx = (tcx + V[j][0]) / 2, mVjy = (tcy + V[j][1]) / 2;
                // Connect midpoints to form inner triangle
                segs.push([mCx, mCy, mVix, mViy]);
                segs.push([mVix, mViy, mVjx, mVjy]);
                segs.push([mVjx, mVjy, mCx, mCy]);
            }
            break;
        }

        case "latticestar": {
            // 6 vertex radials
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
            }
            // Each triangle gets a half-size inner triangle + lines to outer vertices
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                // Outer triangle corners
                const c0x = cx, c0y = cy;
                const c1x = V[i][0], c1y = V[i][1];
                const c2x = V[j][0], c2y = V[j][1];
                // Centroid
                const gcx = (c0x + c1x + c2x) / 3;
                const gcy = (c0y + c1y + c2y) / 3;
                // Inner triangle: half-size, centered at centroid
                const s = 0.3;
                const i0x = gcx + (c0x - gcx) * s, i0y = gcy + (c0y - gcy) * s;
                const i1x = gcx + (c1x - gcx) * s, i1y = gcy + (c1y - gcy) * s;
                const i2x = gcx + (c2x - gcx) * s, i2y = gcy + (c2y - gcy) * s;
                // Inner triangle edges
                segs.push([i0x, i0y, i1x, i1y]);
                segs.push([i1x, i1y, i2x, i2y]);
                segs.push([i2x, i2y, i0x, i0y]);
                // Lines from inner vertices to outer vertices
                segs.push([i0x, i0y, c0x, c0y]);
                segs.push([i1x, i1y, c1x, c1y]);
                segs.push([i2x, i2y, c2x, c2y]);
            }
            break;
        }

        case "gridlattice": {
            // Diamond Cross base: 6 vertex radials + 6 Y's
            for (let i = 0; i < 6; i++) {
                segs.push([cx, cy, V[i][0], V[i][1]]);
            }
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                const tcx = (cx + V[i][0] + V[j][0]) / 3;
                const tcy = (cy + V[i][1] + V[j][1]) / 3;
                segs.push([tcx, tcy, cx, cy]);
                segs.push([tcx, tcy, V[i][0], V[i][1]]);
                segs.push([tcx, tcy, V[j][0], V[j][1]]);
            }
            // Medial triangle in each of the 6 big triangles
            for (let i = 0; i < 6; i++) {
                const j = (i + 1) % 6;
                // Midpoints of the 3 sides of triangle (center, V[i], V[j])
                const m0x = (cx + V[i][0]) / 2, m0y = (cy + V[i][1]) / 2;
                const m1x = (V[i][0] + V[j][0]) / 2, m1y = (V[i][1] + V[j][1]) / 2;
                const m2x = (V[j][0] + cx) / 2, m2y = (V[j][1] + cy) / 2;
                segs.push([m0x, m0y, m1x, m1y]);
                segs.push([m1x, m1y, m2x, m2y]);
                segs.push([m2x, m2y, m0x, m0y]);
            }
            break;
        }
    }

    return segs;
}

// --- Clip polygon to convex polygon (Sutherland-Hodgman) ---
function clipToConvex(poly, clipVerts) {
    let output = poly;
    for (let i = 0; i < clipVerts.length; i++) {
        if (output.length === 0) break;
        const j = (i + 1) % clipVerts.length;
        const ex = clipVerts[j][0] - clipVerts[i][0];
        const ey = clipVerts[j][1] - clipVerts[i][1];
        const vix = clipVerts[i][0], viy = clipVerts[i][1];
        const input = output;
        output = [];
        for (let k = 0; k < input.length; k++) {
            const curr = input[k];
            const prev = input[(k - 1 + input.length) % input.length];
            const crossC = ex * (curr[1] - viy) - ey * (curr[0] - vix);
            const crossP = ex * (prev[1] - viy) - ey * (prev[0] - vix);
            if (crossC >= 0) {
                if (crossP < 0) {
                    const t = crossP / (crossP - crossC);
                    output.push([prev[0] + t * (curr[0] - prev[0]), prev[1] + t * (curr[1] - prev[1])]);
                }
                output.push(curr);
            } else if (crossP >= 0) {
                const t = crossP / (crossP - crossC);
                output.push([prev[0] + t * (curr[0] - prev[0]), prev[1] + t * (curr[1] - prev[1])]);
            }
        }
    }
    return output;
}

// --- Boundary extension for anti-aliasing seam prevention ---
function extendBoundary(pts, w, h) {
    const over = 0.5;
    for (const p of pts) {
        if (p[0] <= 0.01) p[0] = -over;
        else if (p[0] >= w - 0.01) p[0] = w + over;
        if (p[1] <= 0.01) p[1] = -over;
        else if (p[1] >= h - 0.01) p[1] = h + over;
    }
}

// --- Main generate function ---
export function generate(config) {
    const w = config.width;
    const h = config.height;

    const gridVal = config.hexgridGrid || 4;
    const style = config.hexgridStyle || "starburst";
    const lineWidth = config.hexgridLineWidth || 4;
    const rawSpacing = config.hexgridSpacing ?? 12;
    // Slider min=1 maps to 0 spacing (no gap)
    const spacing = rawSpacing <= 1 ? 0 : rawSpacing;

    // Compute hex dimensions for tileable grid
    let a, b, numPairsX, numRows;
    if (gridVal <= 1) {
        // Single hex centered in tile
        a = Math.min(w, h) * 0.4;
        b = a * Math.sqrt(3) / 2;
        numPairsX = 1;
        numRows = 1;
    } else {
        // Repeat unit: 3a wide × 2b tall
        numPairsX = Math.max(1, Math.floor(gridVal / 2));
        a = w / (numPairsX * 3);
        const bRegular = a * Math.sqrt(3) / 2;
        numRows = Math.max(1, Math.round(h / (2 * bRegular)));
        b = h / (numRows * 2);
    }

    const hw = lineWidth / 2;

    // Inset hex for spacing between hexagons (tiny overlap margin prevents hairline gaps)
    const inset = Math.max(0, spacing / 2 - 0.5);
    const ai = Math.max(hw * 2, a - inset);
    const bi = Math.max(hw * 2, b - inset);

    const subpaths = [];

    // Generate hex centers with ghost margin for edge clipping
    const centers = [];
    if (gridVal <= 1) {
        // Single hex centered in tile
        centers.push([w / 2, h / 2]);
    } else {
        for (let col = -1; col <= numPairsX * 2 + 1; col++) {
            const isOdd = ((col % 2) + 2) % 2;
            for (let row = -1; row <= numRows + 1; row++) {
                centers.push([col * 1.5 * a, row * 2 * b + isOdd * b]);
            }
        }
    }

    for (const [cx, cy] of centers) {
            // Skip if hex center is too far from tile
            const margin = Math.max(a, b) * 1.5;
            if (cx < -margin || cx > w + margin || cy < -margin || cy > h + margin) continue;

            const V = hexVerts(cx, cy, ai, bi);
            const M = hexMids(V);
            const segs = patternSegs(cx, cy, ai, bi, V, M, style);

            // Render all bands: extend past endpoints, then clip to hex polygon
            for (const seg of segs) {
                const [x1, y1, x2, y2, isEdge] = seg;
                const bandHW = isEdge ? hw * 2 : hw;
                let band = segToBand(x1, y1, x2, y2, bandHW, bandHW * 0.5);
                if (!band) continue;
                // Clip to hex polygon (prevents protrusions outside hex)
                band = clipToConvex(band, V);
                if (band.length < 3) continue;
                // Then clip to tile boundary
                const clipped = clipPoly(band, 0, 0, w, h);
                if (clipped.length >= 3) {
                    extendBoundary(clipped, w, h);
                    subpaths.push(toPath(clipped));
                }
            }

            // Disc at hex center for styles with radials meeting there
            if (style !== "star" && style !== "nested" && style !== "gridlattice" && style !== "diamondcross") {
                const discR = (style === "starburst" || style === "asanoha" || style === "flowerstar") ? hw * 4
                    : style === "trisub" ? hw * 3
                    : hw * 2.2;
                const d = disc(cx, cy, discR);
                const clipped = clipPoly(d, 0, 0, w, h);
                if (clipped.length >= 3) {
                    extendBoundary(clipped, w, h);
                    subpaths.push(toPath(clipped));
                }
            }
    }

    return subpaths;
}
