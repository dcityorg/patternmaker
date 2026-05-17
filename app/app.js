import * as voronoi from "./patterns/voronoi.js";
import * as truchet from "./patterns/truchet.js";
import * as masonry from "./patterns/masonry.js";
import * as cityscape from "./patterns/cityscape.js";
import * as noise from "./patterns/noise.js";
import * as rd from "./patterns/rd.js";
import * as circles from "./patterns/circles.js";
import * as vshapes from "./patterns/vshapes.js";
import * as shapegrid from "./patterns/shapegrid.js";
import * as carpet from "./patterns/carpet.js";
import * as hilbert from "./patterns/hilbert.js";
import * as peano from "./patterns/peano.js";
import * as hexgrid from "./patterns/hexgrid.js?v=11";
import * as pinwheel from "./patterns/pinwheel.js?v=12";
import { HELP_SECTIONS } from "./help-content.js";

// --- Pattern registry ---
const patterns = { voronoi, truchet, masonry, cityscape, noise, rd, circles, vshapes, shapegrid, carpet, hilbert, peano, hexgrid, pinwheel };
let activePattern = voronoi;

// --- State ---
let savedStateHash = null;
let panX = 0, panY = 0;

// --- Undo/Redo History ---
const MAX_HISTORY = 50;
const DEBOUNCE_MS = 300;
let historyPast = [];
let historyFuture = [];
let lastRecordedParams = null;
let skipNextChange = false;
let debounceTimer = null;

function snapshotConfig() {
    return JSON.parse(JSON.stringify(config));
}

function restoreConfig(snapshot) {
    Object.assign(config, snapshot);
}

function skipNextHistoryRecord() {
    skipNextChange = true;
}

function recordChange() {
    if (skipNextChange) {
        skipNextChange = false;
        lastRecordedParams = snapshotConfig();
        return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    const prev = lastRecordedParams;
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (prev) {
            historyPast.push(prev);
            if (historyPast.length > MAX_HISTORY) historyPast.shift();
            historyFuture = [];
        }
        lastRecordedParams = snapshotConfig();
        updateUndoRedoButtons();
    }, DEBOUNCE_MS);
    if (lastRecordedParams === null) {
        lastRecordedParams = snapshotConfig();
    }
}

function doUndo() {
    if (historyPast.length === 0) return;
    const current = snapshotConfig();
    const restored = historyPast.pop();
    historyFuture.unshift(current);
    skipNextHistoryRecord();
    restoreConfig(restored);
    syncAllControls();
    render();
    markUnsaved();
    updateUndoRedoButtons();
}

function doRedo() {
    if (historyFuture.length === 0) return;
    const current = snapshotConfig();
    const restored = historyFuture.shift();
    historyPast.push(current);
    skipNextHistoryRecord();
    restoreConfig(restored);
    syncAllControls();
    render();
    markUnsaved();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    if (undoBtn) undoBtn.disabled = historyPast.length === 0;
    if (redoBtn) redoBtn.disabled = historyFuture.length === 0;
}

function clearHistory() {
    historyPast = [];
    historyFuture = [];
    lastRecordedParams = null;
    updateUndoRedoButtons();
}

// Default values per pattern for Reset button
const patternDefaults = {
    voronoi: { seedCount: 30, roundness: 0.5, uniformity: 0, spacing: 5 },
    truchet: { truchetGrid: 8, truchetBalance: 20, truchetRoundness: 100 },
    masonry: { masonryGrid: 8, masonrySizeVar: 60, masonrySubdiv: 40, masonrySpacing: 5, masonryRadius: 20, masonryIrregularity: 40 },
    cityscape: { cityscapeCells: 30, cityscapeUniformity: 0, cityscapeSizeVar: 60, cityscapeSubdiv: 40, cityscapeSpacing: 5, cityscapeRadius: 20, cityscapeIrregularity: 40, cityscapeMinSize: 3 },
    rd: { rdScale: 50, rdStyle: 30, rdDetail: 3, rdThreshold: 50, rdSmoothness: 70 },
    circles: { circlesScale: 50, circlesSizeRange: 70, circlesDensity: 50, circlesSpacing: 5, circlesSizeBias: 50 },
    carpet: { carpetDepth: 3, carpetSpacing: 2, carpetRadius: 0, carpetInvert: false },
    hilbert: { hilbertDepth: 3, hilbertBalance: 50, hilbertRadius: 50 },
    peano: { peanoDepth: 2, peanoBalance: 50, peanoRadius: 50 },
    noise: { noiseScale: 52, noiseWarp: 50, noiseDetail: 3, noiseThreshold: 50, noiseSmoothness: 70 },
    vshapes: { vshapesCells: 30, vshapesUniformity: 0, vshapesScale: 70, vshapesSpacing: 5, vshapesRadius: 20, vshapesRotation: 0 },
    shapegrid: { sgridCols: 8, sgridOffset: 50, sgridSpacing: 5, sgridRadius: 20, sgridRotation: 0 },
    hexgrid: { hexgridGrid: 4, hexgridLineWidth: 4, hexgridSpacing: 12, hexgridStyle: "starburst" },
    pinwheel: { pinwheelArms: 4, pinwheelGrid: 5, pinwheelNode: 30, pinwheelThickness: 60, pinwheelSwirl: 80, pinwheelDirection: "cw", pinwheelVariation: 0, pinwheelTip: 0 },
    colors: { cellColor: "#000000", gapColor: "#ffffff" },
    dimensions: { width: 400, height: 400, rotation: 0, flipH: false, flipV: false },
};

const config = {
    pattern: "voronoi",
    seedCount: 30,
    seed: Math.floor(Math.random() * 100000),
    width: 400,
    height: 400,
    roundness: 0.5,
    spacing: 5,
    uniformity: 0,
    zoom: 100,
    showTiling: false,
    cellColor: "#000000",
    gapColor: "#ffffff",
    rotation: 0,
    flipH: false,
    flipV: false,
    truchetGrid: 8,
    truchetBalance: 20,
    truchetRoundness: 100,
    masonryGrid: 8,
    masonrySizeVar: 60,
    masonrySubdiv: 40,
    masonrySpacing: 5,
    masonryRadius: 20,
    masonryIrregularity: 40,
    cityscapeCells: 30,
    cityscapeUniformity: 0,
    cityscapeSizeVar: 60,
    cityscapeSubdiv: 40,
    cityscapeSpacing: 5,
    cityscapeRadius: 20,
    cityscapeIrregularity: 40,
    cityscapeMinSize: 3,
    noiseScale: 52,
    noiseWarp: 50,
    noiseDetail: 3,
    noiseThreshold: 50,
    noiseSmoothness: 70,
    rdScale: 50,
    rdStyle: 30,
    rdDetail: 3,
    rdThreshold: 50,
    rdSmoothness: 70,
    circlesScale: 50,
    circlesSizeRange: 70,
    circlesDensity: 50,
    circlesSpacing: 5,
    circlesSizeBias: 50,
    vshapesShape: "star",
    vshapesCells: 30,
    vshapesUniformity: 0,
    vshapesScale: 70,
    vshapesSpacing: 5,
    vshapesRadius: 20,
    vshapesRotation: 0,
    sgridShape: "hexagon",
    sgridCols: 8,
    sgridOffset: 50,
    sgridSpacing: 5,
    sgridRadius: 20,
    sgridRotation: 0,
    carpetDepth: 3,
    carpetSpacing: 2,
    carpetRadius: 0,
    carpetInvert: false,
    hilbertDepth: 3,
    hilbertBalance: 50,
    hilbertRadius: 50,
    peanoDepth: 2,
    peanoBalance: 50,
    peanoRadius: 50,
    hexgridStyle: "starburst",
    hexgridGrid: 4,
    hexgridLineWidth: 4,
    hexgridSpacing: 12,
    pinwheelArms: 4,
    pinwheelGrid: 5,
    pinwheelNode: 30,
    pinwheelThickness: 60,
    pinwheelSwirl: 80,
    pinwheelDirection: "cw",
    pinwheelVariation: 0,
    pinwheelTip: 0,
};

function getStateHash() {
    return JSON.stringify([config.pattern, config.seedCount, config.seed, config.width, config.height,
        config.roundness, config.spacing, config.uniformity,
        config.cellColor, config.gapColor, config.rotation,
        config.flipH, config.flipV,
        config.truchetGrid, config.truchetBalance, config.truchetRoundness,
        config.masonryGrid, config.masonrySizeVar, config.masonrySubdiv,
        config.masonrySpacing, config.masonryRadius, config.masonryIrregularity,
        config.cityscapeCells, config.cityscapeUniformity, config.cityscapeSizeVar,
        config.cityscapeSubdiv, config.cityscapeSpacing, config.cityscapeRadius,
        config.cityscapeIrregularity, config.cityscapeMinSize,
        config.noiseScale, config.noiseWarp, config.noiseDetail,
        config.noiseThreshold, config.noiseSmoothness,
        config.rdScale, config.rdStyle, config.rdDetail,
        config.rdThreshold, config.rdSmoothness,
        config.circlesScale, config.circlesSizeRange,
        config.circlesDensity, config.circlesSpacing,
        config.circlesSizeBias,
        config.vshapesShape, config.vshapesCells, config.vshapesUniformity,
        config.vshapesScale, config.vshapesSpacing, config.vshapesRadius,
        config.vshapesRotation,
        config.sgridShape, config.sgridCols, config.sgridOffset,
        config.sgridSpacing, config.sgridRadius, config.sgridRotation,
        config.carpetDepth, config.carpetSpacing, config.carpetRadius,
        config.carpetInvert,
        config.hilbertDepth, config.hilbertBalance, config.hilbertRadius,
        config.peanoDepth, config.peanoBalance, config.peanoRadius,
        config.hexgridStyle, config.hexgridGrid, config.hexgridLineWidth, config.hexgridSpacing,
        config.pinwheelArms, config.pinwheelGrid, config.pinwheelNode, config.pinwheelThickness,
        config.pinwheelSwirl, config.pinwheelDirection, config.pinwheelVariation, config.pinwheelTip]);
}

function markUnsaved() {
    const dot = document.getElementById("unsaved-dot");
    if (!dot) return;
    dot.classList.toggle("visible", getStateHash() !== savedStateHash);
    recordChange();
}

function markSaved() {
    savedStateHash = getStateHash();
    const dot = document.getElementById("unsaved-dot");
    if (dot) dot.classList.remove("visible");
}

function getFilename() {
    const input = document.getElementById("filename-input");
    return (input && input.value.trim()) || "my-pattern";
}

// --- Sync all UI controls from config ---
function syncAllControls() {
    setActivePattern(config.pattern);
    document.getElementById("pattern-type").value = config.pattern;
    document.getElementById("cellcount").value = config.seedCount;
    document.getElementById("cellcount-value").textContent = config.seedCount;
    const seedEl = document.getElementById("seed-input");
    seedEl.value = config.seed;
    const seedLen = Math.min(7, Math.max(5, String(config.seed).length));
    seedEl.style.width = (seedLen * 8 + 20) + "px";
    document.getElementById("roundness").value = Math.round(config.roundness * 100);
    document.getElementById("roundness-value").textContent = Math.round(config.roundness * 100);
    document.getElementById("uniformity").value = config.uniformity;
    document.getElementById("uniformity-value").textContent = config.uniformity;
    document.getElementById("spacing").value = Math.round(config.spacing * 4);
    document.getElementById("spacing-value").textContent = config.spacing.toFixed(1);
    document.getElementById("width").value = config.width;
    document.getElementById("width-value").textContent = config.width;
    document.getElementById("height").value = config.height;
    document.getElementById("height-value").textContent = config.height;
    document.getElementById("zoom").value = config.zoom;
    document.getElementById("zoom-value").textContent = config.zoom;
    document.getElementById("show-tiling").checked = config.showTiling;
    document.getElementById("cell-color").value = config.cellColor;
    document.getElementById("gap-color").value = config.gapColor;
    document.getElementById("cell-hex").value = config.cellColor;
    document.getElementById("gap-hex").value = config.gapColor;
    document.getElementById("truchet-grid").value = config.truchetGrid;
    document.getElementById("truchet-grid-value").textContent = config.truchetGrid;
    document.getElementById("truchet-balance").value = config.truchetBalance;
    document.getElementById("truchet-balance-value").textContent = config.truchetBalance;
    document.getElementById("truchet-roundness").value = config.truchetRoundness;
    document.getElementById("truchet-roundness-value").textContent = config.truchetRoundness;
    document.getElementById("masonry-grid").value = config.masonryGrid;
    document.getElementById("masonry-grid-value").textContent = config.masonryGrid;
    document.getElementById("masonry-sizevar").value = config.masonrySizeVar;
    document.getElementById("masonry-sizevar-value").textContent = config.masonrySizeVar;
    document.getElementById("masonry-subdiv").value = config.masonrySubdiv;
    document.getElementById("masonry-subdiv-value").textContent = config.masonrySubdiv;
    document.getElementById("masonry-spacing").value = config.masonrySpacing;
    document.getElementById("masonry-spacing-value").textContent = config.masonrySpacing;
    document.getElementById("masonry-radius").value = config.masonryRadius;
    document.getElementById("masonry-radius-value").textContent = config.masonryRadius;
    document.getElementById("masonry-irregularity").value = config.masonryIrregularity;
    document.getElementById("masonry-irregularity-value").textContent = config.masonryIrregularity;
    document.getElementById("cityscape-cells").value = config.cityscapeCells;
    document.getElementById("cityscape-cells-value").textContent = config.cityscapeCells;
    document.getElementById("cityscape-uniformity").value = config.cityscapeUniformity;
    document.getElementById("cityscape-uniformity-value").textContent = config.cityscapeUniformity;
    document.getElementById("cityscape-sizevar").value = config.cityscapeSizeVar;
    document.getElementById("cityscape-sizevar-value").textContent = config.cityscapeSizeVar;
    document.getElementById("cityscape-subdiv").value = config.cityscapeSubdiv;
    document.getElementById("cityscape-subdiv-value").textContent = config.cityscapeSubdiv;
    document.getElementById("cityscape-spacing").value = config.cityscapeSpacing;
    document.getElementById("cityscape-spacing-value").textContent = config.cityscapeSpacing;
    document.getElementById("cityscape-radius").value = config.cityscapeRadius;
    document.getElementById("cityscape-radius-value").textContent = config.cityscapeRadius;
    document.getElementById("cityscape-irregularity").value = config.cityscapeIrregularity;
    document.getElementById("cityscape-irregularity-value").textContent = config.cityscapeIrregularity;
    document.getElementById("cityscape-minsize").value = config.cityscapeMinSize;
    document.getElementById("cityscape-minsize-value").textContent = config.cityscapeMinSize;
    document.getElementById("noise-scale").value = config.noiseScale;
    document.getElementById("noise-scale-value").textContent = config.noiseScale;
    document.getElementById("noise-warp").value = config.noiseWarp;
    document.getElementById("noise-warp-value").textContent = config.noiseWarp;
    document.getElementById("noise-detail").value = config.noiseDetail;
    document.getElementById("noise-detail-value").textContent = config.noiseDetail;
    document.getElementById("noise-threshold").value = config.noiseThreshold;
    document.getElementById("noise-threshold-value").textContent = config.noiseThreshold;
    document.getElementById("noise-smoothness").value = config.noiseSmoothness;
    document.getElementById("noise-smoothness-value").textContent = config.noiseSmoothness;
    document.getElementById("rd-scale").value = config.rdScale;
    document.getElementById("rd-scale-value").textContent = config.rdScale;
    document.getElementById("rd-style").value = config.rdStyle;
    document.getElementById("rd-style-value").textContent = config.rdStyle;
    document.getElementById("rd-detail").value = config.rdDetail;
    document.getElementById("rd-detail-value").textContent = config.rdDetail;
    document.getElementById("rd-threshold").value = config.rdThreshold;
    document.getElementById("rd-threshold-value").textContent = config.rdThreshold;
    document.getElementById("rd-smoothness").value = config.rdSmoothness;
    document.getElementById("rd-smoothness-value").textContent = config.rdSmoothness;
    document.getElementById("circles-scale").value = config.circlesScale;
    document.getElementById("circles-scale-value").textContent = config.circlesScale;
    document.getElementById("circles-sizerange").value = config.circlesSizeRange;
    document.getElementById("circles-sizerange-value").textContent = config.circlesSizeRange;
    document.getElementById("circles-density").value = config.circlesDensity;
    document.getElementById("circles-density-value").textContent = config.circlesDensity;
    document.getElementById("circles-spacing").value = config.circlesSpacing;
    document.getElementById("circles-spacing-value").textContent = config.circlesSpacing;
    document.getElementById("circles-sizebias").value = config.circlesSizeBias;
    document.getElementById("circles-sizebias-value").textContent = config.circlesSizeBias;
    document.getElementById("vshapes-shape").value = config.vshapesShape;
    document.getElementById("vshapes-cells").value = config.vshapesCells;
    document.getElementById("vshapes-cells-value").textContent = config.vshapesCells;
    document.getElementById("vshapes-uniformity").value = config.vshapesUniformity;
    document.getElementById("vshapes-uniformity-value").textContent = config.vshapesUniformity;
    document.getElementById("vshapes-scale").value = config.vshapesScale;
    document.getElementById("vshapes-scale-value").textContent = config.vshapesScale;
    document.getElementById("vshapes-spacing").value = config.vshapesSpacing;
    document.getElementById("vshapes-spacing-value").textContent = config.vshapesSpacing;
    document.getElementById("vshapes-radius").value = config.vshapesRadius;
    document.getElementById("vshapes-radius-value").textContent = config.vshapesRadius;
    document.getElementById("vshapes-rotation").value = config.vshapesRotation;
    document.getElementById("vshapes-rotation-value").textContent = config.vshapesRotation;
    document.getElementById("sgrid-shape").value = config.sgridShape;
    document.getElementById("sgrid-cols").value = config.sgridCols;
    document.getElementById("sgrid-cols-value").textContent = config.sgridCols;
    document.getElementById("sgrid-offset").value = config.sgridOffset;
    document.getElementById("sgrid-offset-value").textContent = config.sgridOffset;
    document.getElementById("sgrid-spacing").value = config.sgridSpacing;
    document.getElementById("sgrid-spacing-value").textContent = config.sgridSpacing;
    document.getElementById("sgrid-radius").value = config.sgridRadius;
    document.getElementById("sgrid-radius-value").textContent = config.sgridRadius;
    document.getElementById("sgrid-rotation").value = config.sgridRotation;
    document.getElementById("sgrid-rotation-value").textContent = config.sgridRotation;
    document.getElementById("carpet-depth").value = config.carpetDepth;
    document.getElementById("carpet-depth-value").textContent = config.carpetDepth;
    document.getElementById("carpet-spacing").value = config.carpetSpacing;
    document.getElementById("carpet-spacing-value").textContent = config.carpetSpacing;
    document.getElementById("carpet-radius").value = config.carpetRadius;
    document.getElementById("carpet-radius-value").textContent = config.carpetRadius;
    document.getElementById("carpet-invert").checked = config.carpetInvert;
    document.getElementById("hilbert-depth").value = config.hilbertDepth;
    document.getElementById("hilbert-depth-value").textContent = config.hilbertDepth;
    document.getElementById("hilbert-balance").value = config.hilbertBalance;
    document.getElementById("hilbert-balance-value").textContent = config.hilbertBalance;
    document.getElementById("hilbert-radius").value = config.hilbertRadius;
    document.getElementById("hilbert-radius-value").textContent = config.hilbertRadius;
    document.getElementById("peano-depth").value = config.peanoDepth;
    document.getElementById("peano-depth-value").textContent = config.peanoDepth;
    document.getElementById("peano-balance").value = config.peanoBalance;
    document.getElementById("peano-balance-value").textContent = config.peanoBalance;
    document.getElementById("peano-radius").value = config.peanoRadius;
    document.getElementById("peano-radius-value").textContent = config.peanoRadius;
    document.getElementById("hexgrid-style").value = config.hexgridStyle;
    document.getElementById("hexgrid-grid").value = config.hexgridGrid;
    document.getElementById("hexgrid-grid-value").textContent = config.hexgridGrid;
    document.getElementById("hexgrid-linewidth").value = config.hexgridLineWidth;
    document.getElementById("hexgrid-linewidth-value").textContent = config.hexgridLineWidth;
    document.getElementById("hexgrid-spacing").value = config.hexgridSpacing;
    document.getElementById("hexgrid-spacing-value").textContent = config.hexgridSpacing <= 1 ? 0 : config.hexgridSpacing;
    document.getElementById("pinwheel-arms").value = String(config.pinwheelArms);
    document.getElementById("pinwheel-grid").value = config.pinwheelGrid;
    document.getElementById("pinwheel-grid-value").textContent = config.pinwheelGrid;
    document.getElementById("pinwheel-node").value = config.pinwheelNode;
    document.getElementById("pinwheel-node-value").textContent = config.pinwheelNode;
    document.getElementById("pinwheel-thickness").value = config.pinwheelThickness;
    document.getElementById("pinwheel-thickness-value").textContent = config.pinwheelThickness;
    document.getElementById("pinwheel-swirl").value = config.pinwheelSwirl;
    document.getElementById("pinwheel-swirl-value").textContent = config.pinwheelSwirl;
    document.getElementById("pinwheel-direction").value = config.pinwheelDirection;
    document.getElementById("pinwheel-variation").value = config.pinwheelVariation;
    document.getElementById("pinwheel-variation-value").textContent = config.pinwheelVariation;
    document.getElementById("pinwheel-tip").value = config.pinwheelTip;
    document.getElementById("pinwheel-tip-value").textContent = config.pinwheelTip;
    applyTransform();
}

// --- Rendering ---
function render() {
    const paths = activePattern.generate(config);
    const svg = document.getElementById("voronoi-svg");
    const tileGroup = document.getElementById("tile-cells");
    const w = config.width;
    const h = config.height;

    const defs = svg.querySelector("defs");
    while (svg.childNodes.length > 0) svg.removeChild(svg.lastChild);
    svg.appendChild(defs);

    tileGroup.innerHTML = "";
    for (const pathData of paths) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", config.cellColor);
        path.setAttribute("stroke", "none");
        tileGroup.appendChild(path);
    }

    if (config.showTiling) {
        svg.setAttribute("viewBox", `0 0 ${3 * w} ${3 * h}`);
        svg.setAttribute("width", 3 * w);
        svg.setAttribute("height", 3 * h);

        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("width", 3 * w);
        bg.setAttribute("height", 3 * h);
        bg.setAttribute("fill", config.gapColor);
        svg.appendChild(bg);

        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
                use.setAttribute("href", "#tile-cells");
                use.setAttribute("transform", `translate(${dx * w},${dy * h})`);
                svg.appendChild(use);
            }
        }
    } else {
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("width", w);
        svg.setAttribute("height", h);

        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("width", w);
        bg.setAttribute("height", h);
        bg.setAttribute("fill", config.gapColor);
        svg.appendChild(bg);

        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", "#tile-cells");
        svg.appendChild(use);
    }

    applyTransform();
}

// --- SVG Export ---
function exportSVG() {
    const w = config.width;
    const h = config.height;
    const tileGroup = document.getElementById("tile-cells");
    const pathsHTML = tileGroup.innerHTML;

    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect x="-1" y="-1" width="${w + 2}" height="${h + 2}" fill="${config.gapColor}"/>
  ${pathsHTML}
</svg>`;

    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFilename() + ".svg";
    a.click();
    URL.revokeObjectURL(url);
}

// --- Copy SVG to Clipboard ---
function copySVG() {
    const w = config.width;
    const h = config.height;
    const tileGroup = document.getElementById("tile-cells");
    const pathsHTML = tileGroup.innerHTML;

    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect x="-1" y="-1" width="${w + 2}" height="${h + 2}" fill="${config.gapColor}"/>
  ${pathsHTML}
</svg>`;

    const btn = document.getElementById("copy-svg");
    const orig = btn.innerHTML;
    const showFeedback = (text) => {
        btn.innerHTML = text;
        setTimeout(() => btn.innerHTML = orig, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(svgString).then(() => showFeedback("\u2713 Copied")).catch(() => {
            // Fallback for insecure context (HTTP localhost)
            const ta = document.createElement("textarea");
            ta.value = svgString;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            showFeedback("\u2713 Copied");
        });
    } else {
        const ta = document.createElement("textarea");
        ta.value = svgString;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showFeedback("\u2713 Copied");
    }
}

// --- Save / Load Design ---
function saveDesign() {
    const design = {
        version: 1,
        pattern: config.pattern,
        seedCount: config.seedCount,
        seed: config.seed,
        width: config.width,
        height: config.height,
        roundness: config.roundness,
        spacing: config.spacing,
        uniformity: config.uniformity,
        zoom: config.zoom,
        showTiling: config.showTiling,
        cellColor: config.cellColor,
        gapColor: config.gapColor,
        rotation: config.rotation,
        flipH: config.flipH,
        flipV: config.flipV,
        truchetGrid: config.truchetGrid,
        truchetBalance: config.truchetBalance,
        truchetRoundness: config.truchetRoundness,
        masonryGrid: config.masonryGrid,
        masonrySizeVar: config.masonrySizeVar,
        masonrySubdiv: config.masonrySubdiv,
        masonrySpacing: config.masonrySpacing,
        masonryRadius: config.masonryRadius,
        masonryIrregularity: config.masonryIrregularity,
        cityscapeCells: config.cityscapeCells,
        cityscapeUniformity: config.cityscapeUniformity,
        cityscapeSizeVar: config.cityscapeSizeVar,
        cityscapeSubdiv: config.cityscapeSubdiv,
        cityscapeSpacing: config.cityscapeSpacing,
        cityscapeRadius: config.cityscapeRadius,
        cityscapeIrregularity: config.cityscapeIrregularity,
        cityscapeMinSize: config.cityscapeMinSize,
        noiseScale: config.noiseScale,
        noiseWarp: config.noiseWarp,
        noiseDetail: config.noiseDetail,
        noiseThreshold: config.noiseThreshold,
        noiseSmoothness: config.noiseSmoothness,
        rdScale: config.rdScale,
        rdStyle: config.rdStyle,
        rdDetail: config.rdDetail,
        rdThreshold: config.rdThreshold,
        rdSmoothness: config.rdSmoothness,
        circlesScale: config.circlesScale,
        circlesSizeRange: config.circlesSizeRange,
        circlesDensity: config.circlesDensity,
        circlesSpacing: config.circlesSpacing,
        circlesSizeBias: config.circlesSizeBias,
        vshapesShape: config.vshapesShape,
        vshapesCells: config.vshapesCells,
        vshapesUniformity: config.vshapesUniformity,
        vshapesScale: config.vshapesScale,
        vshapesSpacing: config.vshapesSpacing,
        vshapesRadius: config.vshapesRadius,
        vshapesRotation: config.vshapesRotation,
        sgridShape: config.sgridShape,
        sgridCols: config.sgridCols,
        sgridOffset: config.sgridOffset,
        sgridSpacing: config.sgridSpacing,
        sgridRadius: config.sgridRadius,
        sgridRotation: config.sgridRotation,
        carpetDepth: config.carpetDepth,
        carpetSpacing: config.carpetSpacing,
        carpetRadius: config.carpetRadius,
        carpetInvert: config.carpetInvert,
        hilbertDepth: config.hilbertDepth,
        hilbertBalance: config.hilbertBalance,
        hilbertRadius: config.hilbertRadius,
        peanoDepth: config.peanoDepth,
        peanoBalance: config.peanoBalance,
        peanoRadius: config.peanoRadius,
        hexgridStyle: config.hexgridStyle,
        hexgridGrid: config.hexgridGrid,
        hexgridLineWidth: config.hexgridLineWidth,
        hexgridSpacing: config.hexgridSpacing,
        pinwheelArms: config.pinwheelArms,
        pinwheelGrid: config.pinwheelGrid,
        pinwheelNode: config.pinwheelNode,
        pinwheelThickness: config.pinwheelThickness,
        pinwheelSwirl: config.pinwheelSwirl,
        pinwheelDirection: config.pinwheelDirection,
        pinwheelVariation: config.pinwheelVariation,
        pinwheelTip: config.pinwheelTip,
    };

    const json = JSON.stringify(design, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFilename() + ".json";
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
}

function loadDesign(file) {
    const name = file.name.replace(/\.json$/i, "");
    document.getElementById("filename-input").value = name;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const design = JSON.parse(e.target.result);

            config.pattern = design.pattern ?? "voronoi";
            config.seedCount = design.seedCount ?? 30;
            config.seed = design.seed ?? 12345;
            config.width = design.width ?? 400;
            config.height = design.height ?? 400;
            config.roundness = design.roundness ?? 0.5;
            config.spacing = design.spacing ?? 5;
            config.uniformity = design.uniformity ?? 0;
            config.zoom = design.zoom ?? 100;
            config.showTiling = design.showTiling ?? false;
            config.cellColor = design.cellColor ?? "#000000";
            config.gapColor = design.gapColor ?? "#ffffff";
            config.rotation = design.rotation ?? 0;
            config.flipH = design.flipH ?? false;
            config.flipV = design.flipV ?? false;
            config.truchetGrid = design.truchetGrid ?? 8;
            config.truchetBalance = design.truchetBalance ?? 20;
            config.truchetRoundness = design.truchetRoundness ?? 100;
            config.masonryGrid = design.masonryGrid ?? 8;
            config.masonrySizeVar = design.masonrySizeVar ?? 60;
            config.masonrySubdiv = design.masonrySubdiv ?? 40;
            config.masonrySpacing = design.masonrySpacing ?? 5;
            config.masonryRadius = design.masonryRadius ?? 20;
            config.masonryIrregularity = design.masonryIrregularity ?? 40;
            config.cityscapeCells = design.cityscapeCells ?? 30;
            config.cityscapeUniformity = design.cityscapeUniformity ?? 0;
            config.cityscapeSizeVar = design.cityscapeSizeVar ?? 60;
            config.cityscapeSubdiv = design.cityscapeSubdiv ?? 40;
            config.cityscapeSpacing = design.cityscapeSpacing ?? 5;
            config.cityscapeRadius = design.cityscapeRadius ?? 20;
            config.cityscapeIrregularity = design.cityscapeIrregularity ?? 40;
            config.cityscapeMinSize = design.cityscapeMinSize ?? 3;
            config.noiseScale = design.noiseScale ?? 52;
            config.noiseWarp = design.noiseWarp ?? 50;
            config.noiseDetail = design.noiseDetail ?? 3;
            config.noiseThreshold = design.noiseThreshold ?? 50;
            config.noiseSmoothness = design.noiseSmoothness ?? 70;
            config.rdScale = design.rdScale ?? 50;
            config.rdStyle = design.rdStyle ?? 30;
            config.rdDetail = design.rdDetail ?? 3;
            config.rdThreshold = design.rdThreshold ?? 50;
            config.rdSmoothness = design.rdSmoothness ?? 70;
            config.circlesScale = design.circlesScale ?? 50;
            config.circlesSizeRange = design.circlesSizeRange ?? 70;
            config.circlesDensity = design.circlesDensity ?? 50;
            config.circlesSpacing = design.circlesSpacing ?? 5;
            config.circlesSizeBias = design.circlesSizeBias ?? 50;
            config.vshapesShape = design.vshapesShape ?? "star";
            config.vshapesCells = design.vshapesCells ?? 30;
            config.vshapesUniformity = design.vshapesUniformity ?? 0;
            config.vshapesScale = design.vshapesScale ?? 70;
            config.vshapesSpacing = design.vshapesSpacing ?? 5;
            config.vshapesRadius = design.vshapesRadius ?? 20;
            config.vshapesRotation = design.vshapesRotation ?? 0;
            config.sgridShape = design.sgridShape ?? "hexagon";
            config.sgridCols = design.sgridCols ?? 8;
            config.sgridOffset = design.sgridOffset ?? 50;
            config.sgridSpacing = design.sgridSpacing ?? 5;
            config.sgridRadius = design.sgridRadius ?? 20;
            config.sgridRotation = design.sgridRotation ?? 0;
            config.carpetDepth = design.carpetDepth ?? 3;
            config.carpetSpacing = design.carpetSpacing ?? 2;
            config.carpetRadius = design.carpetRadius ?? 0;
            config.carpetInvert = design.carpetInvert ?? false;
            config.hilbertDepth = design.hilbertDepth ?? 3;
            config.hilbertBalance = design.hilbertBalance ?? 50;
            config.hilbertRadius = design.hilbertRadius ?? 50;
            config.peanoDepth = design.peanoDepth ?? 2;
            config.peanoBalance = design.peanoBalance ?? 50;
            config.peanoRadius = design.peanoRadius ?? 50;
            config.hexgridStyle = design.hexgridStyle ?? "starburst";
            config.hexgridGrid = design.hexgridGrid ?? 4;
            config.hexgridLineWidth = design.hexgridLineWidth ?? 4;
            config.hexgridSpacing = design.hexgridSpacing ?? 12;
            config.pinwheelArms = design.pinwheelArms ?? 4;
            config.pinwheelGrid = design.pinwheelGrid ?? 5;
            config.pinwheelNode = design.pinwheelNode ?? 30;
            config.pinwheelThickness = design.pinwheelThickness ?? 60;
            config.pinwheelSwirl = design.pinwheelSwirl ?? 80;
            config.pinwheelDirection = design.pinwheelDirection ?? "cw";
            config.pinwheelVariation = design.pinwheelVariation ?? 0;
            config.pinwheelTip = design.pinwheelTip ?? 0;

            skipNextHistoryRecord();
            clearHistory();
            syncAllControls();
            render();
            markSaved();
        } catch (err) {
            alert("Failed to load design file: " + err.message);
        }
    };
    reader.readAsText(file);
}

// --- Pattern switching ---
function setActivePattern(patternId) {
    activePattern = patterns[patternId] || voronoi;
    config.pattern = patternId;

    // Show/hide pattern-specific control sections
    document.querySelectorAll(".pattern-controls").forEach(el => {
        el.style.display = "none";
    });
    const section = document.getElementById(patternId + "-controls");
    if (section) section.style.display = "";
}

// --- Zoom & Pan ---
function applyTransform() {
    const wrapper = document.getElementById("svg-wrapper");
    const scale = config.zoom / 100;
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// --- UI Wiring ---
function setupControls() {
    const patternSelect = document.getElementById("pattern-type");
    const cellcountInput = document.getElementById("cellcount");
    const seedInput = document.getElementById("seed-input");
    const uniformityInput = document.getElementById("uniformity");
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const roundnessInput = document.getElementById("roundness");
    const spacingInput = document.getElementById("spacing");
    const zoomInput = document.getElementById("zoom");
    const tilingInput = document.getElementById("show-tiling");
    const newPatternBtn = document.getElementById("new-pattern");
    const loadBtn = document.getElementById("load-design");
    const saveBtn = document.getElementById("save-design");
    const exportBtn = document.getElementById("export-svg");
    const fileLoader = document.getElementById("file-loader");

    function updateLabel(id, value) {
        document.getElementById(id + "-value").textContent = value;
    }

    // Pattern selector
    patternSelect.addEventListener("change", () => {
        setActivePattern(patternSelect.value);
        render();
        markUnsaved();
    });

    // Reset buttons
    document.querySelectorAll(".reset-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const patternId = link.dataset.pattern;
            const defaults = patternDefaults[patternId];
            if (defaults) {
                Object.assign(config, defaults);
                syncAllControls();
                render();
                markUnsaved();
            }
        });
    });

    // Auto-size seed input to fit its value (capped to keep New Pattern visible)
    function autoSizeSeed() {
        const len = Math.min(7, Math.max(5, seedInput.value.length));
        seedInput.style.width = (len * 8 + 20) + "px";
    }

    // Show initial seed value
    seedInput.value = config.seed;
    autoSizeSeed();
    seedInput.addEventListener("input", autoSizeSeed);

    cellcountInput.addEventListener("input", () => {
        config.seedCount = parseInt(cellcountInput.value);
        updateLabel("cellcount", config.seedCount);
        render();
        markUnsaved();
    });

    function applySeed() {
        const val = parseInt(seedInput.value);
        if (!isNaN(val)) {
            config.seed = val;
            render();
            markUnsaved();
        }
    }
    seedInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            applySeed();
        }
    });
    seedInput.addEventListener("blur", applySeed);

    newPatternBtn.addEventListener("click", () => {
        config.seed = Math.floor(Math.random() * 100000);
        seedInput.value = config.seed;
        autoSizeSeed();
        render();
        markUnsaved();
    });

    uniformityInput.addEventListener("input", () => {
        const val = parseInt(uniformityInput.value);
        config.uniformity = val;
        updateLabel("uniformity", val);
        render();
        markUnsaved();
    });

    document.getElementById("rotate-btn").addEventListener("click", () => {
        config.rotation = (config.rotation + 1) % 4;
        const temp = config.width;
        config.width = config.height;
        config.height = temp;
        widthInput.value = config.width;
        heightInput.value = config.height;
        updateLabel("width", config.width);
        updateLabel("height", config.height);
        render();
        markUnsaved();
    });

    document.getElementById("flip-h-btn").addEventListener("click", () => {
        config.flipH = !config.flipH;
        render();
        markUnsaved();
    });

    document.getElementById("flip-v-btn").addEventListener("click", () => {
        config.flipV = !config.flipV;
        render();
        markUnsaved();
    });

    widthInput.addEventListener("input", () => {
        config.width = parseInt(widthInput.value);
        updateLabel("width", config.width);
        render();
        markUnsaved();
    });

    heightInput.addEventListener("input", () => {
        config.height = parseInt(heightInput.value);
        updateLabel("height", config.height);
        render();
        markUnsaved();
    });

    roundnessInput.addEventListener("input", () => {
        const val = parseInt(roundnessInput.value);
        config.roundness = val / 100;
        updateLabel("roundness", val);
        render();
        markUnsaved();
    });

    spacingInput.addEventListener("input", () => {
        const raw = parseInt(spacingInput.value);
        config.spacing = raw / 4;
        updateLabel("spacing", config.spacing.toFixed(1));
        render();
        markUnsaved();
    });

    zoomInput.addEventListener("input", () => {
        config.zoom = parseInt(zoomInput.value);
        updateLabel("zoom", config.zoom);
        applyTransform();
    });

    document.querySelector(".canvas-area").addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        config.zoom = Math.max(25, Math.min(800, config.zoom + delta));
        zoomInput.value = config.zoom;
        updateLabel("zoom", config.zoom);
        applyTransform();
    }, { passive: false });

    const cellColorInput = document.getElementById("cell-color");
    const gapColorInput = document.getElementById("gap-color");
    const cellHexInput = document.getElementById("cell-hex");
    const gapHexInput = document.getElementById("gap-hex");
    const swapBtn = document.getElementById("swap-colors");

    function expandHex(val) {
        val = val.trim().toLowerCase().replace(/^[#x]/, "");
        if (/^[0-9a-f]$/.test(val)) {
            return "#" + val.repeat(6);
        }
        if (/^[0-9a-f]{2}$/.test(val)) {
            return "#" + val.repeat(3);
        }
        if (/^[0-9a-f]{3}$/.test(val)) {
            return "#" + val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
        }
        if (/^[0-9a-f]{6}$/.test(val)) {
            return "#" + val;
        }
        return null;
    }

    function syncColors() {
        cellHexInput.value = config.cellColor;
        gapHexInput.value = config.gapColor;
        cellColorInput.value = config.cellColor;
        gapColorInput.value = config.gapColor;
    }

    function onCellColor() {
        config.cellColor = cellColorInput.value;
        cellHexInput.value = config.cellColor;
        render();
        markUnsaved();
    }
    cellColorInput.addEventListener("input", onCellColor);
    cellColorInput.addEventListener("change", onCellColor);

    function onGapColor() {
        config.gapColor = gapColorInput.value;
        gapHexInput.value = config.gapColor;
        render();
        markUnsaved();
    }
    gapColorInput.addEventListener("input", onGapColor);
    gapColorInput.addEventListener("change", onGapColor);

    function applyCellHex() {
        const hex = expandHex(cellHexInput.value);
        if (hex) {
            config.cellColor = hex;
            syncColors();
            render();
            markUnsaved();
        } else {
            cellHexInput.value = config.cellColor;
        }
    }
    cellHexInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyCellHex(); } });
    cellHexInput.addEventListener("blur", applyCellHex);

    function applyGapHex() {
        const hex = expandHex(gapHexInput.value);
        if (hex) {
            config.gapColor = hex;
            syncColors();
            render();
            markUnsaved();
        } else {
            gapHexInput.value = config.gapColor;
        }
    }
    gapHexInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyGapHex(); } });
    gapHexInput.addEventListener("blur", applyGapHex);

    swapBtn.addEventListener("click", () => {
        const temp = config.cellColor;
        config.cellColor = config.gapColor;
        config.gapColor = temp;
        syncColors();
        render();
        markUnsaved();
    });

    tilingInput.addEventListener("change", () => {
        config.showTiling = tilingInput.checked;
        render();
    });

    // Save / Load
    saveBtn.addEventListener("click", saveDesign);

    loadBtn.addEventListener("click", () => {
        fileLoader.click();
    });

    fileLoader.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            loadDesign(e.target.files[0]);
            fileLoader.value = "";
        }
    });

    exportBtn.addEventListener("click", exportSVG);
    document.getElementById("copy-svg").addEventListener("click", copySVG);

    // --- Truchet controls ---
    const truchetGridInput = document.getElementById("truchet-grid");
    const truchetBalanceInput = document.getElementById("truchet-balance");
    const truchetRoundnessInput = document.getElementById("truchet-roundness");

    truchetGridInput.addEventListener("input", () => {
        config.truchetGrid = parseInt(truchetGridInput.value);
        updateLabel("truchet-grid", config.truchetGrid);
        render();
        markUnsaved();
    });

    truchetBalanceInput.addEventListener("input", () => {
        config.truchetBalance = parseInt(truchetBalanceInput.value);
        updateLabel("truchet-balance", config.truchetBalance);
        render();
        markUnsaved();
    });

    truchetRoundnessInput.addEventListener("input", () => {
        config.truchetRoundness = parseInt(truchetRoundnessInput.value);
        updateLabel("truchet-roundness", config.truchetRoundness);
        render();
        markUnsaved();
    });

    // --- Masonry controls ---
    const masonryGridInput = document.getElementById("masonry-grid");
    const masonrySizevarInput = document.getElementById("masonry-sizevar");
    const masonrySubdivInput = document.getElementById("masonry-subdiv");
    const masonrySpacingInput = document.getElementById("masonry-spacing");
    const masonryRadiusInput = document.getElementById("masonry-radius");
    const masonryIrregularityInput = document.getElementById("masonry-irregularity");

    masonryGridInput.addEventListener("input", () => {
        config.masonryGrid = parseInt(masonryGridInput.value);
        updateLabel("masonry-grid", config.masonryGrid);
        render();
        markUnsaved();
    });

    masonrySizevarInput.addEventListener("input", () => {
        config.masonrySizeVar = parseInt(masonrySizevarInput.value);
        updateLabel("masonry-sizevar", config.masonrySizeVar);
        render();
        markUnsaved();
    });

    masonrySubdivInput.addEventListener("input", () => {
        config.masonrySubdiv = parseInt(masonrySubdivInput.value);
        updateLabel("masonry-subdiv", config.masonrySubdiv);
        render();
        markUnsaved();
    });

    masonrySpacingInput.addEventListener("input", () => {
        config.masonrySpacing = parseInt(masonrySpacingInput.value);
        updateLabel("masonry-spacing", config.masonrySpacing);
        render();
        markUnsaved();
    });

    masonryRadiusInput.addEventListener("input", () => {
        config.masonryRadius = parseInt(masonryRadiusInput.value);
        updateLabel("masonry-radius", config.masonryRadius);
        render();
        markUnsaved();
    });

    masonryIrregularityInput.addEventListener("input", () => {
        config.masonryIrregularity = parseInt(masonryIrregularityInput.value);
        updateLabel("masonry-irregularity", config.masonryIrregularity);
        render();
        markUnsaved();
    });

    // --- Cityscape controls ---
    const cityscapeCellsInput = document.getElementById("cityscape-cells");
    const cityscapeUniformityInput = document.getElementById("cityscape-uniformity");
    const cityscapeSizevarInput = document.getElementById("cityscape-sizevar");
    const cityscapeSubdivInput = document.getElementById("cityscape-subdiv");
    const cityscapeSpacingInput = document.getElementById("cityscape-spacing");
    const cityscapeRadiusInput = document.getElementById("cityscape-radius");
    const cityscapeIrregularityInput = document.getElementById("cityscape-irregularity");
    const cityscapeMinsizeInput = document.getElementById("cityscape-minsize");

    cityscapeCellsInput.addEventListener("input", () => {
        config.cityscapeCells = parseInt(cityscapeCellsInput.value);
        updateLabel("cityscape-cells", config.cityscapeCells);
        render();
        markUnsaved();
    });

    cityscapeUniformityInput.addEventListener("input", () => {
        config.cityscapeUniformity = parseInt(cityscapeUniformityInput.value);
        updateLabel("cityscape-uniformity", config.cityscapeUniformity);
        render();
        markUnsaved();
    });

    cityscapeSizevarInput.addEventListener("input", () => {
        config.cityscapeSizeVar = parseInt(cityscapeSizevarInput.value);
        updateLabel("cityscape-sizevar", config.cityscapeSizeVar);
        render();
        markUnsaved();
    });

    cityscapeSubdivInput.addEventListener("input", () => {
        config.cityscapeSubdiv = parseInt(cityscapeSubdivInput.value);
        updateLabel("cityscape-subdiv", config.cityscapeSubdiv);
        render();
        markUnsaved();
    });

    cityscapeSpacingInput.addEventListener("input", () => {
        config.cityscapeSpacing = parseInt(cityscapeSpacingInput.value);
        updateLabel("cityscape-spacing", config.cityscapeSpacing);
        render();
        markUnsaved();
    });

    cityscapeRadiusInput.addEventListener("input", () => {
        config.cityscapeRadius = parseInt(cityscapeRadiusInput.value);
        updateLabel("cityscape-radius", config.cityscapeRadius);
        render();
        markUnsaved();
    });

    cityscapeIrregularityInput.addEventListener("input", () => {
        config.cityscapeIrregularity = parseInt(cityscapeIrregularityInput.value);
        updateLabel("cityscape-irregularity", config.cityscapeIrregularity);
        render();
        markUnsaved();
    });

    cityscapeMinsizeInput.addEventListener("input", () => {
        config.cityscapeMinSize = parseInt(cityscapeMinsizeInput.value);
        updateLabel("cityscape-minsize", config.cityscapeMinSize);
        render();
        markUnsaved();
    });

    // --- Noise controls ---
    const noiseScaleInput = document.getElementById("noise-scale");
    const noiseWarpInput = document.getElementById("noise-warp");
    const noiseDetailInput = document.getElementById("noise-detail");
    const noiseThresholdInput = document.getElementById("noise-threshold");
    const noiseSmoothnessInput = document.getElementById("noise-smoothness");

    noiseScaleInput.addEventListener("input", () => {
        config.noiseScale = parseInt(noiseScaleInput.value);
        updateLabel("noise-scale", config.noiseScale);
        render();
        markUnsaved();
    });

    noiseWarpInput.addEventListener("input", () => {
        config.noiseWarp = parseInt(noiseWarpInput.value);
        updateLabel("noise-warp", config.noiseWarp);
        render();
        markUnsaved();
    });

    noiseDetailInput.addEventListener("input", () => {
        config.noiseDetail = parseInt(noiseDetailInput.value);
        updateLabel("noise-detail", config.noiseDetail);
        render();
        markUnsaved();
    });

    noiseThresholdInput.addEventListener("input", () => {
        config.noiseThreshold = parseInt(noiseThresholdInput.value);
        updateLabel("noise-threshold", config.noiseThreshold);
        render();
        markUnsaved();
    });

    noiseSmoothnessInput.addEventListener("input", () => {
        config.noiseSmoothness = parseInt(noiseSmoothnessInput.value);
        updateLabel("noise-smoothness", config.noiseSmoothness);
        render();
        markUnsaved();
    });

    // --- Reaction-Diffusion controls ---
    const rdScaleInput = document.getElementById("rd-scale");
    const rdStyleInput = document.getElementById("rd-style");
    const rdDetailInput = document.getElementById("rd-detail");
    const rdThresholdInput = document.getElementById("rd-threshold");
    const rdSmoothnessInput = document.getElementById("rd-smoothness");

    rdScaleInput.addEventListener("input", () => {
        config.rdScale = parseInt(rdScaleInput.value);
        updateLabel("rd-scale", config.rdScale);
        render();
        markUnsaved();
    });

    rdStyleInput.addEventListener("input", () => {
        config.rdStyle = parseInt(rdStyleInput.value);
        updateLabel("rd-style", config.rdStyle);
        render();
        markUnsaved();
    });

    rdDetailInput.addEventListener("input", () => {
        config.rdDetail = parseInt(rdDetailInput.value);
        updateLabel("rd-detail", config.rdDetail);
        render();
        markUnsaved();
    });

    rdThresholdInput.addEventListener("input", () => {
        config.rdThreshold = parseInt(rdThresholdInput.value);
        updateLabel("rd-threshold", config.rdThreshold);
        render();
        markUnsaved();
    });

    rdSmoothnessInput.addEventListener("input", () => {
        config.rdSmoothness = parseInt(rdSmoothnessInput.value);
        updateLabel("rd-smoothness", config.rdSmoothness);
        render();
        markUnsaved();
    });

    // --- Circle Packing controls ---
    const circlesScaleInput = document.getElementById("circles-scale");
    const circlesSizerangeInput = document.getElementById("circles-sizerange");
    const circlesDensityInput = document.getElementById("circles-density");
    const circlesSpacingInput = document.getElementById("circles-spacing");
    const circlesSizebiasInput = document.getElementById("circles-sizebias");

    circlesScaleInput.addEventListener("input", () => {
        config.circlesScale = parseInt(circlesScaleInput.value);
        updateLabel("circles-scale", config.circlesScale);
        render();
        markUnsaved();
    });

    circlesSizerangeInput.addEventListener("input", () => {
        config.circlesSizeRange = parseInt(circlesSizerangeInput.value);
        updateLabel("circles-sizerange", config.circlesSizeRange);
        render();
        markUnsaved();
    });

    circlesDensityInput.addEventListener("input", () => {
        config.circlesDensity = parseInt(circlesDensityInput.value);
        updateLabel("circles-density", config.circlesDensity);
        render();
        markUnsaved();
    });

    circlesSpacingInput.addEventListener("input", () => {
        config.circlesSpacing = parseInt(circlesSpacingInput.value);
        updateLabel("circles-spacing", config.circlesSpacing);
        render();
        markUnsaved();
    });

    circlesSizebiasInput.addEventListener("input", () => {
        config.circlesSizeBias = parseInt(circlesSizebiasInput.value);
        updateLabel("circles-sizebias", config.circlesSizeBias);
        render();
        markUnsaved();
    });

    // --- Voronoi Shapes controls ---
    const vshapesShapeInput = document.getElementById("vshapes-shape");
    const vshapesCellsInput = document.getElementById("vshapes-cells");
    const vshapesUniformityInput = document.getElementById("vshapes-uniformity");
    const vshapesScaleInput = document.getElementById("vshapes-scale");
    const vshapesSpacingInput = document.getElementById("vshapes-spacing");
    const vshapesRadiusInput = document.getElementById("vshapes-radius");
    const vshapesRotationInput = document.getElementById("vshapes-rotation");

    vshapesShapeInput.addEventListener("change", () => {
        config.vshapesShape = vshapesShapeInput.value;
        render();
        markUnsaved();
    });

    vshapesCellsInput.addEventListener("input", () => {
        config.vshapesCells = parseInt(vshapesCellsInput.value);
        updateLabel("vshapes-cells", config.vshapesCells);
        render();
        markUnsaved();
    });

    vshapesUniformityInput.addEventListener("input", () => {
        config.vshapesUniformity = parseInt(vshapesUniformityInput.value);
        updateLabel("vshapes-uniformity", config.vshapesUniformity);
        render();
        markUnsaved();
    });

    vshapesScaleInput.addEventListener("input", () => {
        config.vshapesScale = parseInt(vshapesScaleInput.value);
        updateLabel("vshapes-scale", config.vshapesScale);
        render();
        markUnsaved();
    });

    vshapesSpacingInput.addEventListener("input", () => {
        config.vshapesSpacing = parseInt(vshapesSpacingInput.value);
        updateLabel("vshapes-spacing", config.vshapesSpacing);
        render();
        markUnsaved();
    });

    vshapesRadiusInput.addEventListener("input", () => {
        config.vshapesRadius = parseInt(vshapesRadiusInput.value);
        updateLabel("vshapes-radius", config.vshapesRadius);
        render();
        markUnsaved();
    });

    vshapesRotationInput.addEventListener("input", () => {
        config.vshapesRotation = parseInt(vshapesRotationInput.value);
        updateLabel("vshapes-rotation", config.vshapesRotation);
        render();
        markUnsaved();
    });

    // --- Fractal Carpet controls ---
    const carpetDepthInput = document.getElementById("carpet-depth");
    const carpetSpacingInput = document.getElementById("carpet-spacing");
    const carpetRadiusInput = document.getElementById("carpet-radius");
    const carpetInvertInput = document.getElementById("carpet-invert");

    carpetDepthInput.addEventListener("input", () => {
        config.carpetDepth = parseInt(carpetDepthInput.value);
        updateLabel("carpet-depth", config.carpetDepth);
        render();
        markUnsaved();
    });

    carpetSpacingInput.addEventListener("input", () => {
        config.carpetSpacing = parseInt(carpetSpacingInput.value);
        updateLabel("carpet-spacing", config.carpetSpacing);
        render();
        markUnsaved();
    });

    carpetRadiusInput.addEventListener("input", () => {
        config.carpetRadius = parseInt(carpetRadiusInput.value);
        updateLabel("carpet-radius", config.carpetRadius);
        render();
        markUnsaved();
    });

    carpetInvertInput.addEventListener("change", () => {
        config.carpetInvert = carpetInvertInput.checked;
        render();
        markUnsaved();
    });

    // --- Fractal Hilbert controls ---
    const hilbertDepthInput = document.getElementById("hilbert-depth");
    const hilbertBalanceInput = document.getElementById("hilbert-balance");
    const hilbertRadiusInput = document.getElementById("hilbert-radius");

    hilbertDepthInput.addEventListener("input", () => {
        config.hilbertDepth = parseInt(hilbertDepthInput.value);
        updateLabel("hilbert-depth", config.hilbertDepth);
        render();
        markUnsaved();
    });

    hilbertBalanceInput.addEventListener("input", () => {
        config.hilbertBalance = parseInt(hilbertBalanceInput.value);
        updateLabel("hilbert-balance", config.hilbertBalance);
        render();
        markUnsaved();
    });

    hilbertRadiusInput.addEventListener("input", () => {
        config.hilbertRadius = parseInt(hilbertRadiusInput.value);
        updateLabel("hilbert-radius", config.hilbertRadius);
        render();
        markUnsaved();
    });

    // --- Fractal Peano controls ---
    const peanoDepthInput = document.getElementById("peano-depth");
    const peanoBalanceInput = document.getElementById("peano-balance");
    const peanoRadiusInput = document.getElementById("peano-radius");

    peanoDepthInput.addEventListener("input", () => {
        config.peanoDepth = parseInt(peanoDepthInput.value);
        updateLabel("peano-depth", config.peanoDepth);
        render();
        markUnsaved();
    });

    peanoBalanceInput.addEventListener("input", () => {
        config.peanoBalance = parseInt(peanoBalanceInput.value);
        updateLabel("peano-balance", config.peanoBalance);
        render();
        markUnsaved();
    });

    peanoRadiusInput.addEventListener("input", () => {
        config.peanoRadius = parseInt(peanoRadiusInput.value);
        updateLabel("peano-radius", config.peanoRadius);
        render();
        markUnsaved();
    });

    // --- Hexagon Grid controls ---
    const hexgridStyleInput = document.getElementById("hexgrid-style");
    const hexgridGridInput = document.getElementById("hexgrid-grid");
    const hexgridLinewidthInput = document.getElementById("hexgrid-linewidth");
    const hexgridSpacingInput = document.getElementById("hexgrid-spacing");

    hexgridStyleInput.addEventListener("change", () => {
        config.hexgridStyle = hexgridStyleInput.value;
        render();
        markUnsaved();
    });

    hexgridGridInput.addEventListener("input", () => {
        config.hexgridGrid = parseInt(hexgridGridInput.value);
        updateLabel("hexgrid-grid", config.hexgridGrid);
        render();
        markUnsaved();
    });

    hexgridLinewidthInput.addEventListener("input", () => {
        config.hexgridLineWidth = parseInt(hexgridLinewidthInput.value);
        updateLabel("hexgrid-linewidth", config.hexgridLineWidth);
        render();
        markUnsaved();
    });

    hexgridSpacingInput.addEventListener("input", () => {
        config.hexgridSpacing = parseInt(hexgridSpacingInput.value);
        updateLabel("hexgrid-spacing", config.hexgridSpacing <= 1 ? 0 : config.hexgridSpacing);
        render();
        markUnsaved();
    });

    // --- Pinwheel controls ---
    const pinwheelArmsInput = document.getElementById("pinwheel-arms");
    const pinwheelGridInput = document.getElementById("pinwheel-grid");
    const pinwheelNodeInput = document.getElementById("pinwheel-node");
    const pinwheelThicknessInput = document.getElementById("pinwheel-thickness");
    const pinwheelSwirlInput = document.getElementById("pinwheel-swirl");
    const pinwheelDirectionInput = document.getElementById("pinwheel-direction");
    const pinwheelVariationInput = document.getElementById("pinwheel-variation");

    pinwheelArmsInput.addEventListener("change", () => {
        config.pinwheelArms = parseInt(pinwheelArmsInput.value);
        render();
        markUnsaved();
    });

    pinwheelGridInput.addEventListener("input", () => {
        config.pinwheelGrid = parseInt(pinwheelGridInput.value);
        updateLabel("pinwheel-grid", config.pinwheelGrid);
        render();
        markUnsaved();
    });

    pinwheelNodeInput.addEventListener("input", () => {
        config.pinwheelNode = parseInt(pinwheelNodeInput.value);
        updateLabel("pinwheel-node", config.pinwheelNode);
        render();
        markUnsaved();
    });

    pinwheelThicknessInput.addEventListener("input", () => {
        config.pinwheelThickness = parseInt(pinwheelThicknessInput.value);
        updateLabel("pinwheel-thickness", config.pinwheelThickness);
        render();
        markUnsaved();
    });

    pinwheelSwirlInput.addEventListener("input", () => {
        config.pinwheelSwirl = parseInt(pinwheelSwirlInput.value);
        updateLabel("pinwheel-swirl", config.pinwheelSwirl);
        render();
        markUnsaved();
    });

    pinwheelDirectionInput.addEventListener("change", () => {
        config.pinwheelDirection = pinwheelDirectionInput.value;
        render();
        markUnsaved();
    });

    pinwheelVariationInput.addEventListener("input", () => {
        config.pinwheelVariation = parseInt(pinwheelVariationInput.value);
        updateLabel("pinwheel-variation", config.pinwheelVariation);
        render();
        markUnsaved();
    });

    const pinwheelTipInput = document.getElementById("pinwheel-tip");
    pinwheelTipInput.addEventListener("input", () => {
        config.pinwheelTip = parseInt(pinwheelTipInput.value);
        updateLabel("pinwheel-tip", config.pinwheelTip);
        render();
        markUnsaved();
    });

    // --- Shape Grid controls ---
    const sgridShapeInput = document.getElementById("sgrid-shape");
    const sgridColsInput = document.getElementById("sgrid-cols");
    const sgridOffsetInput = document.getElementById("sgrid-offset");
    const sgridSpacingInput = document.getElementById("sgrid-spacing");
    const sgridRadiusInput = document.getElementById("sgrid-radius");
    const sgridRotationInput = document.getElementById("sgrid-rotation");

    sgridShapeInput.addEventListener("change", () => {
        config.sgridShape = sgridShapeInput.value;
        render();
        markUnsaved();
    });

    sgridColsInput.addEventListener("input", () => {
        config.sgridCols = parseInt(sgridColsInput.value);
        updateLabel("sgrid-cols", config.sgridCols);
        render();
        markUnsaved();
    });

    sgridOffsetInput.addEventListener("input", () => {
        config.sgridOffset = parseInt(sgridOffsetInput.value);
        updateLabel("sgrid-offset", config.sgridOffset);
        render();
        markUnsaved();
    });

    sgridSpacingInput.addEventListener("input", () => {
        config.sgridSpacing = parseInt(sgridSpacingInput.value);
        updateLabel("sgrid-spacing", config.sgridSpacing);
        render();
        markUnsaved();
    });

    sgridRadiusInput.addEventListener("input", () => {
        config.sgridRadius = parseInt(sgridRadiusInput.value);
        updateLabel("sgrid-radius", config.sgridRadius);
        render();
        markUnsaved();
    });

    sgridRotationInput.addEventListener("input", () => {
        config.sgridRotation = parseInt(sgridRotationInput.value);
        updateLabel("sgrid-rotation", config.sgridRotation);
        render();
        markUnsaved();
    });

    // --- Pan (click-drag with transform) ---
    const canvasArea = document.querySelector(".canvas-area");
    let isPanning = false;
    let panStartX, panStartY, panOriginX, panOriginY;

    canvasArea.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panOriginX = panX;
        panOriginY = panY;
        canvasArea.classList.add("panning");
    });

    window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        panX = panOriginX + (e.clientX - panStartX);
        panY = panOriginY + (e.clientY - panStartY);
        applyTransform();
    });

    window.addEventListener("mouseup", () => {
        if (isPanning) {
            isPanning = false;
            canvasArea.classList.remove("panning");
        }
    });

    // --- Undo / Redo buttons ---
    document.getElementById("undo-btn").addEventListener("click", doUndo);
    document.getElementById("redo-btn").addEventListener("click", doRedo);

    // --- Keyboard shortcuts ---
    window.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "z") {
            e.preventDefault();
            if (e.shiftKey) doRedo();
            else doUndo();
        }
    });

    // --- Expand / Collapse all sections ---
    document.getElementById("toggle-sections-btn").addEventListener("click", () => {
        const scrollContainer = document.querySelector(".sidebar-scroll");
        const details = scrollContainer.querySelectorAll("details");
        const allOpen = Array.from(details).every(d => d.open);
        details.forEach(d => d.open = !allOpen);
    });

    // --- Help Panel ---
    const helpPanel = document.getElementById("help-panel");
    const helpBtn = document.getElementById("help-btn");
    const helpCloseBtn = document.getElementById("help-close-btn");
    const helpScroll = document.getElementById("help-scroll");
    let helpOpen = false;

    function buildHelpContent() {
        helpScroll.innerHTML = "";
        HELP_SECTIONS.forEach((section, si) => {
            const details = document.createElement("details");
            details.className = "help-section";
            if (si === 0) details.open = true;

            const summary = document.createElement("summary");
            summary.textContent = section.title;
            details.appendChild(summary);

            const content = document.createElement("div");
            content.className = "help-section-content";

            for (const block of section.blocks) {
                if (block.type === "paragraph") {
                    const p = document.createElement("p");
                    p.textContent = block.text;
                    content.appendChild(p);
                } else if (block.type === "heading") {
                    const h3 = document.createElement("h3");
                    h3.textContent = block.text;
                    content.appendChild(h3);
                } else if (block.type === "list") {
                    const ul = document.createElement("ul");
                    for (const item of block.items) {
                        const li = document.createElement("li");
                        li.textContent = item;
                        ul.appendChild(li);
                    }
                    content.appendChild(ul);
                } else if (block.type === "tip") {
                    const div = document.createElement("div");
                    div.className = "help-tip";
                    div.innerHTML = '<span class="tip-label">Tip: </span>' + escapeHTML(block.text);
                    content.appendChild(div);
                } else if (block.type === "keyvalue") {
                    const div = document.createElement("div");
                    div.className = "help-kv";
                    for (const item of block.items) {
                        const row = document.createElement("div");
                        row.className = "help-kv-item";
                        row.innerHTML = '<span class="kv-key">' + escapeHTML(item.key) + '</span><span class="kv-value">' + escapeHTML(item.value) + '</span>';
                        div.appendChild(row);
                    }
                    content.appendChild(div);
                }
            }

            details.appendChild(content);
            helpScroll.appendChild(details);
        });
    }

    function escapeHTML(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function toggleHelp() {
        helpOpen = !helpOpen;
        helpPanel.style.display = helpOpen ? "" : "none";
        helpBtn.classList.toggle("active", helpOpen);
    }

    buildHelpContent();
    helpBtn.addEventListener("click", toggleHelp);
    helpCloseBtn.addEventListener("click", toggleHelp);

    // --- Help panel resize ---
    const helpResizeHandle = document.getElementById("help-resize-handle");
    let helpDragging = false;
    let helpStartX = 0;
    let helpStartWidth = 0;

    helpResizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        helpDragging = true;
        helpStartX = e.clientX;
        helpStartWidth = helpPanel.offsetWidth;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (!helpDragging) return;
        const delta = helpStartX - e.clientX;
        const newWidth = Math.min(600, Math.max(240, helpStartWidth + delta));
        helpPanel.style.width = newWidth + "px";
    });

    window.addEventListener("mouseup", () => {
        if (helpDragging) {
            helpDragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        }
    });
}

// --- Init ---
setActivePattern("voronoi");
setupControls();
render();
savedStateHash = getStateHash();
lastRecordedParams = snapshotConfig();
