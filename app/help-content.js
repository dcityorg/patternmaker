// Help content data — pure data, no DOM manipulation
export const HELP_SECTIONS = [
    {
        id: 'quick-start',
        title: 'Quick Start',
        blocks: [
            { type: 'paragraph', text: 'Pattern Maker is a seamless tile pattern generator. Adjust sliders on the left, see results instantly on the canvas, and export an SVG file for laser cutting, printing, or applying to physical objects like vases. All patterns tile perfectly and use only two colors.' },
            { type: 'heading', text: 'Basic Workflow' },
            { type: 'list', items: [
                'Pick a pattern type from the Pattern dropdown',
                'Adjust sliders to shape the pattern — changes preview instantly',
                'Click "New Pattern" to generate a new random variation',
                'Set your tile dimensions (Width / Height)',
                'Set Cell and Gap colors for your two-color design',
                'Toggle "Tiling Preview" to see how the pattern repeats in a 3×3 grid',
                'Export SVG when you\'re happy with the result',
            ]},
            { type: 'heading', text: 'Mouse Controls' },
            { type: 'keyvalue', items: [
                { key: 'Left drag', value: 'Pan the canvas view' },
                { key: 'Scroll wheel', value: 'Zoom in/out' },
            ]},
            { type: 'heading', text: 'Keyboard Shortcuts' },
            { type: 'keyvalue', items: [
                { key: '⌘Z', value: 'Undo' },
                { key: '⌘⇧Z', value: 'Redo' },
                { key: '← →', value: 'Click a slider, then use arrow keys to nudge the value one step at a time for precise control' },
            ]},
            { type: 'heading', text: 'Design Name' },
            { type: 'paragraph', text: 'The design name appears below the version line in the sidebar header. Click it to rename your design. The name is used for Save Design and Export SVG filenames. A green dot appears when you have unsaved changes.' },
            { type: 'paragraph', text: 'The name updates automatically when you load a design file. You can also click the name to type a new one at any time.' },
            { type: 'tip', text: 'Every pattern is controlled by a Seed number. Save a design to preserve the exact seed, or note it down to reproduce the pattern later.' },
        ],
    },
    {
        id: 'patterns',
        title: 'Pattern Types',
        blocks: [
            { type: 'keyvalue', items: [
                { key: 'Voronoi', value: 'Organic cell shapes based on Voronoi tessellation. Controls for cell count, shape rounding, uniformity, and spacing.' },
                { key: 'Truchet', value: 'Quarter-arc tiles that connect at edges. Balance controls arc vs gap thickness; Arc Shape goes from sharp L-bends to smooth curves.' },
                { key: 'Masonry', value: 'Irregular rounded rectangles in a brick-like grid. Subdivision splits cells; Size Variation adds randomness.' },
                { key: 'Cityscape', value: 'Irregular quadrilaterals placed in Voronoi-distributed territories. Shape Irregularity warps rectangles into trapezoids.' },
                { key: 'Rorschach', value: 'Organic inkblot shapes from domain-warped Perlin noise. Warp creates flowing, swirling forms.' },
                { key: 'Reaction-Diffusion', value: 'Simulation-based patterns (Gray-Scott model). Style sweeps from labyrinths through worms to spots. May take 1-3 seconds to generate. Note: tiling may not be seamless with all combinations of settings and dimensions — if you see edge mismatches, try adjusting Scale or using square dimensions.' },
                { key: 'Circle Packing', value: 'Multi-scale circles packed tightly. Size Bias and Size Range control the mix of large and small circles.' },
                { key: 'Fractal Carpet', value: 'Sierpinski carpet — recursive square subdivisions with center cutouts. Invert mode fills the holes instead.' },
                { key: 'Fractal Hilbert', value: 'Hilbert space-filling curve rendered as a filled band. Corner Radius rounds the turns.' },
                { key: 'Fractal Peano', value: 'Peano space-filling curve as a filled band. Similar to Hilbert but with a 3-fold grid.' },
                { key: 'Shapes Aligned', value: 'Geometric shapes on a regular grid. 10 shape types. Row Offset creates brick/hex layouts.' },
                { key: 'Shapes Scattered', value: 'Geometric shapes at Voronoi-distributed positions. Rotation adds per-shape random spin.' },
                { key: 'Hexagon Grid', value: 'Flat-top hexagonal grid with internal geometric line patterns rendered as filled bands. 10 styles from simple radials (Tri, Starburst) to complex subdivisions (Diamond Cross, Lattice Star, Grid Lattice).' },
            ]},
        ],
    },
    {
        id: 'controls',
        title: 'Common Controls',
        blocks: [
            { type: 'heading', text: 'Dimensions & View' },
            { type: 'keyvalue', items: [
                { key: 'Width / Height', value: 'Tile size in pixels (10–1200). The SVG export uses these dimensions.' },
                { key: 'Rotate', value: 'Rotates the pattern 90° clockwise and swaps width/height.' },
                { key: 'Flip H / Flip V', value: 'Mirrors the pattern horizontally or vertically.' },
                { key: 'Zoom', value: 'Canvas zoom (25–800%). Also controllable with mouse scroll wheel.' },
                { key: 'Tiling Preview', value: 'Shows a 3×3 grid of the tile to verify seamless edges.' },
            ]},
            { type: 'heading', text: 'Colors' },
            { type: 'keyvalue', items: [
                { key: 'Cell / Gap', value: 'The two colors used in the pattern. Click the swatch to pick, or type a hex value.' },
                { key: 'Swap', value: 'Exchanges cell and gap colors.' },
                { key: 'Hex input', value: 'Supports shorthand: "f" → #ffffff, "a0" → #a0a0a0, "f80" → #ff8800.' },
            ]},
            { type: 'heading', text: 'Shared Sliders' },
            { type: 'keyvalue', items: [
                { key: 'Spacing', value: 'Gap width between shapes. Ensures minimum physical thickness for manufacturing.' },
                { key: 'Corner Radius', value: 'Rounds sharp corners. 0 = sharp, 100 = maximum rounding.' },
                { key: 'Balance', value: 'Ratio of filled area to gap area (Truchet, Hilbert, Peano). Clamped to prevent features too thin to manufacture.' },
                { key: 'Uniformity', value: 'How evenly cells are distributed (Voronoi, Cityscape, Shapes Scattered). Uses Lloyd\'s relaxation.' },
                { key: 'Subdivision', value: 'Splits cells into sub-regions (Masonry, Cityscape).' },
            ]},
        ],
    },
    {
        id: 'save-export',
        title: 'Save & Export',
        blocks: [
            { type: 'paragraph', text: 'Save Design exports your parameters as a JSON file. Load Design imports a previously saved file. Your design is fully described by the parameters — no image data is stored, so files are tiny.' },
            { type: 'keyvalue', items: [
                { key: 'Save Design', value: 'Downloads a .json file with all parameters. Reload it later with Load Design.' },
                { key: 'Load Design', value: 'Opens a previously saved .json design file and restores all settings.' },
                { key: 'Export SVG', value: 'Downloads a clean SVG file (no stroke, cell/gap colors as specified). Ready for laser cutting or printing.' },
            ]},
            { type: 'tip', text: 'Save frequently! There is no auto-save. If you refresh the page, unsaved changes are lost.' },
            { type: 'tip', text: 'Chrome and Edge provide the best file management experience — save dialogs remember the last folder you used, and filenames carry over between Load, Save, and Export. Other browsers (Brave, Firefox, Safari) may not remember directories or read back renamed filenames.' },
        ],
    },
    {
        id: 'tips',
        title: 'Tips & Best Practices',
        blocks: [
            { type: 'list', items: [
                'Always check Tiling Preview before exporting — it reveals edge mismatches that are invisible on a single tile.',
                'For physical objects, avoid very thin lines. Use the Spacing and Balance sliders to maintain minimum thickness.',
                'Reaction-Diffusion is the slowest pattern. Use lower Scale and Detail values while experimenting, then increase for the final export.',
                'The Seed number fully determines the pattern. Two tiles with the same seed and settings produce identical results.',
                'Use Rotate and Flip to explore different orientations without changing the underlying pattern.',
                'Hex shorthand saves time: type "0" for black, "f" for white, "888" for medium gray.',
            ]},
        ],
    },
];
