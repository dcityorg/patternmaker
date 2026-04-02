# Pattern Maker

Multi-pattern seamless tile generator. Static web app (HTML/CSS/JS), deployed to Vercel.

## Use Case
Patterns are applied to physical objects (vases). Key constraints:
- Only 2 colors (cell + gap, typically black/white)
- No very thin lines or spaces — minimum physical thickness enforced
- Patterns must tile seamlessly when wrapped around surfaces
- All patterns use filled regions (no strokes)

## Stack
- Pure HTML/CSS/JS, no build step
- d3-delaunay via ESM CDN import (used by Voronoi, Cityscape, and Shapes Scattered patterns)
- Deployed to Vercel (CLI: `vercel --prod`)
- Local dev: `cd app && python3 -m http.server 8080`

## Project Structure
- `app/` — Deployable web app (served by Vercel via `outputDirectory`)
- `CLAUDE.md` — Project instructions (repo root)
- `vercel.json` — Vercel config with `outputDirectory: "app"`
- `docs/` — Development history and notes
- `.gitignore` — Excludes .vercel, .DS_Store, reference docs

## Architecture
All app files live in `app/`:
- `index.html` — UI with sidebar controls, SVG canvas, and help panel
- `style.css` — Dark theme matching VaseMaker (#0a0a0a bg, #6d9fff accent, #1a1a1a sidebar)
- `app.js` — UI manager, pattern registry, rendering, pan/zoom, save/load/export, undo/redo history
- `help-content.js` — Help panel content data (sections and blocks)
- `patterns/voronoi.js` — Voronoi pattern: PRNG, periodic Voronoi, inset, rounding
- `patterns/truchet.js` — Truchet tile pattern: quarter-arc bands with grid transforms
- `patterns/masonry.js` — Masonry pattern: irregular rounded rectangles in a grid
- `patterns/cityscape.js` — Cityscape pattern: irregular quads in Voronoi cell territories
- `patterns/noise.js` — Rorschach pattern: domain-warped Perlin noise, tileable via torus mapping
- `patterns/circles.js` — Circle Packing pattern: multi-scale greedy packing with periodic boundaries
- `patterns/carpet.js` — Fractal Carpet pattern: Sierpinski carpet with recursive hole cutouts
- `patterns/hilbert.js` — Fractal Hilbert pattern: Hilbert curve as filled band with rounded turns
- `patterns/peano.js` — Fractal Peano pattern: Peano curve as filled band with rounded turns
- `patterns/rd.js` — Reaction-Diffusion pattern: Gray-Scott simulation, tileable via torus boundaries
- `patterns/shapegrid.js` — Shapes Aligned pattern: geometric shapes on a regular grid with row offset
- `patterns/vshapes.js` — Shapes Scattered pattern: geometric shapes at Voronoi-distributed points
- `patterns/hexgrid.js` — Hexagon Grid pattern: flat-top hex grid with internal geometric line styles

### Pattern Module Interface
Each pattern in `patterns/` exports:
- `name` — Display name (string)
- `generate(config)` — Returns array of SVG path `d` strings

The app renders all paths with `config.cellColor` fill, no stroke.

### Adding a New Pattern
1. Create `app/patterns/<name>.js` with `name` and `generate(config)` exports
2. Import in `app/app.js`, add to `patterns` registry object
3. Add `<option>` to pattern dropdown in `app/index.html`
4. Add `<div id="<name>-controls" class="pattern-controls" style="display:none">` with controls
5. Wire controls in `app/app.js` setupControls(), add config keys, update getStateHash/save/load/syncAllControls

## Key Algorithms

### Voronoi
- **Periodic Voronoi**: 3x3 ghost points, compute Voronoi on expanded set, clip all 9 blocks to center tile
- **Sutherland-Hodgman**: Polygon clipping to tile boundary
- **Polygon inset**: Offset edges inward, intersect offset lines. Per-cell max inset capping (85% of centroid-to-edge distance) with self-intersection check and iterative fallback (8% steps)
- **Short edge merging**: Before Bezier rounding, edges shorter than 30% of average edge length are merged to eliminate flat-spot artifacts. Only applied when Cell Shape > 0.
- **Lloyd's relaxation**: Uniformity slider maps 0-100 to 0-3 fractional iterations
- **Boundary-aware rounding**: Quadratic Bezier on interior vertices, sharp corners on tile boundary for seamless tiling
- **Seeded PRNG**: mulberry32 for reproducible patterns

### Truchet
- **Quarter-arc bands**: Each tile has two arc bands at opposite corners, rendered as filled regions (not strokes)
- **Arc band rendering**: Cubic Bezier curves with roundness interpolation — from sharp L-shapes (0) to perfect quarter-circle arcs (100)
- **Balance**: Controls arc width vs gap width via arcFraction (clamped 0.15-0.85 for min thickness)
- **Grid with transforms**: Orientation grid generated from PRNG seed, then rotated/flipped to support rotate/flip buttons
- **Elliptical support**: Non-square tiles produce elliptical arcs via separate horizontal/vertical radii
- **Inherent tiling**: Truchet tiles connect at edge midpoints regardless of orientation — seamless by construction

### Masonry
- **Grid-based layout**: Divides canvas into rows/columns, places rounded rectangles in each cell
- **Subdivision**: Cells randomly split into 2-3 sub-cells (vertical, horizontal, or 3-way)
- **Size variation**: Random shrinkage per shape; high values also skip cells entirely ("parking lots")
- **Irregularity**: Random position offset for organic feel
- **Wall thickness**: Half-wall inset on each cell edge ensures seamless tiling
- **Grid transforms**: 2D grid array rotated/flipped for rotate/flip support

### Cityscape
- **Voronoi-based layout**: Random seed points define territories via periodic Voronoi (no visible grid)
- **Irregular quadrilaterals**: Rectangle corners jittered by Shape Irregularity — produces trapezoids and wonky 4-sided shapes
- **Periodic Voronoi**: Same 3x3 ghost point approach as Voronoi pattern for seamless tiling
- **Per-cell PRNG**: Each cell uses a seed derived from cell index, ensuring same shapes across all 9 tiling blocks
- **Lloyd's relaxation**: Uniformity slider controls distribution evenness (0-3 fractional iterations)
- **Subdivision**: Bounding box of each Voronoi cell can be split into 2-3 sub-regions
- **Min Size**: Drops shapes below a pixel threshold to prevent unprintable thin features
- **Clipping**: Shapes clipped to tile boundary with boundary-aware corner rounding (sharp at edges, smooth interior)

### Rorschach (noise.js)
- **Domain-warped Perlin noise**: Perlin noise fed into itself for organic, flowing inkblot shapes
- **Tileable via torus mapping**: 2D coordinates mapped onto circles in noise space (cos/sin of normalized coords × freq), producing seamless tiling
- **Two-layer warping**: Warp 0-50 applies single noise offset layer; 50-100 feeds warped coords back through noise for deeper swirling
- **Fractal Brownian motion**: Multiple octaves of tileable noise for detail control
- **3x3 tiled marching squares**: Same approach as Voronoi — run contour extraction on 9 copies, clip to center tile with Sutherland-Hodgman
- **Chaikin corner-cutting**: Smoothing via subdivision (no Bezier overshoot). Boundary vertices preserved sharp for tiling.
- **Min-width filter**: Contours checked at multiple projection angles; shapes thinner than 1.5% of tile size are dropped for manufacturability
- **Seeded PRNG**: mulberry32 for reproducible permutation table

### Reaction-Diffusion (rd.js)
- **Gray-Scott model**: Two-chemical reaction-diffusion system (activator U, inhibitor V) with feed rate F and kill rate k
- **Torus boundary conditions**: Simulation grid wraps on both axes — seamless tiling by construction
- **Style parameter**: Single slider sweeps through F-k parameter space via waypoints (labyrinth → worms → stripes → spots → sparse dots)
- **Diffusion constants**: Du=0.2097, Dv=0.105 (from Pearson/Munafo research, well-documented parameter map)
- **Bilinear sampling**: Simulation runs on square grid; output field sampled with bilinear interpolation and torus wrapping for rotation/flip support
- **3x3 tiled marching squares**: Same approach as Rorschach — contour extraction on 9 copies, clip to center tile
- **Boundary-aware filtering**: Shapes touching tile boundary skip area/width filter (partial shapes complete when tiled)
- **Chaikin smoothing**: Same boundary-preserving corner-cutting as Rorschach
- **Performance**: Simulation is compute-heavy (1-3 seconds typical). Scale slider controls grid size (48-160); Detail controls iterations (2000-9000).
- **Seeded PRNG**: mulberry32 for reproducible initial conditions

### Fractal Carpet (carpet.js)
- **Sierpinski carpet**: Recursively subdivide square into 9ths, remove center at each depth level
- **Compound path rendering**: Normal mode uses single path with outer rect (CW) + hole rects (CCW) for cutouts
- **Invert mode**: Holes rendered as separate filled shapes instead of cutouts
- **Corner rounding**: Quadratic Bezier on hole corners, controlled by Corner Radius slider
- **Non-square support**: Subdivides width and height independently so pattern fills full tile dimensions
- **Seamless tiling**: By construction — rectangle subdivides perfectly, edges always match
- **Depth control**: 1-5 recursion levels (depth 5 = 9^5 = ~59K sub-cells checked)

### Fractal Hilbert (hilbert.js)
- **Hilbert curve**: Space-filling curve on 2^depth grid, visits every cell exactly once
- **Band rendering**: Curve rendered as filled band — axis-aligned segment rects + rounded joint pieces at turns
- **Corner rounding**: Joint pieces interpolate from squares (0) to circles (100) for outside corners. Inside corners get additive quarter-circle fills (concave fillet) to round the sharp 90° concave angle.
- **Balance**: Controls band width vs gap width (clamped 0.15-0.85 for min thickness)
- **Centered grid**: Cell centers offset by half a cell so pattern is centered in tile
- **Rotation/flip**: Transform curve point coordinates after generation (CW rotation matching other patterns)
- **3x3 ghost copies**: Segments near tile edges duplicated at opposite side, clipped to tile bounds

### Fractal Peano (peano.js)
- **Peano curve**: Space-filling curve on 3^depth grid, serpentine back-and-forth pattern
- **Recursive generation**: Column-major serpentine traversal of 3×3 sub-grids; x-direction flips for middle rows, y-direction flips for middle columns to ensure continuity
- **Band rendering**: Same approach as Hilbert — segment rects + rounded joints + inside corner fills
- **Seamless tiling**: Centered grid + 3x3 ghost copies with clipping
- **Rotation/flip**: Same point-transform approach as Hilbert
- **Depth control**: 1-4 levels (depth 4 = 81×81 = 6561 cells)

### Shapes Aligned (shapegrid.js)
- **Regular grid placement**: Shapes placed on a cols×rows grid, cellW = w/cols, rows forced even for tiling
- **Row offset**: Alternating rows shifted horizontally (0 = square grid, 50 = brick/hex layout)
- **10 shape types**: Circle, Cross, Diamond, Hexagon, Octagon, Pentagon, Rounded Square, Square, Star, Triangle
- **Shape rendering**: Regular polygons, star (6-point inner/outer radius), cross (12-vertex plus sign)
- **Corner rounding**: Quadratic Bezier at polygon vertices, controlled by Corner Radius slider
- **Rotation**: All shapes rotated by user-specified angle (0-180°)
- **Seamless tiling**: Even row count ensures offset pattern repeats; ghost copies at tile edges
- **Rotation/flip**: Transform center coordinates after grid generation

### Shapes Scattered (vshapes.js)
- **Voronoi-distributed placement**: Random seed points relaxed via Lloyd's algorithm, shapes placed at centroids
- **Periodic Voronoi**: Same 3x3 ghost point approach as Voronoi pattern for seamless distribution
- **Shape sizing**: Each shape sized to half the distance to its nearest Voronoi neighbor
- **10 shape types**: Same set as Shapes Aligned (Circle, Cross, Diamond, etc.)
- **Per-shape random rotation**: Rotation slider controls 0 (all upright) to 100 (fully random)
- **Ghost rendering**: Shapes near tile edges duplicated at wrapped positions for seamless tiling
- **Seeded PRNG**: mulberry32 for reproducible patterns

### Circle Packing (circles.js)
- **Multi-scale greedy packing**: Generate random candidates with continuous random radii, sort largest-first, place if no collision
- **Periodic boundary conditions**: Collision check tests against 3x3 ghost copies (torus wrapping) for seamless tiling
- **Ghost rendering**: Circles near tile edges duplicated at wrapped positions so they tile correctly
- **Size Bias**: Controls effective radius range — low bias shrinks max radius (fewer large circles), high bias raises min radius (fewer small circles)
- **Size Range**: Controls spread between min and max radius (0 = uniform, 100 = wide variation)
- **Rotation/flip**: Transform circle center coordinates after generation
- **Seeded PRNG**: mulberry32 for reproducible patterns

### Hexagon Grid (hexgrid.js)
- **Flat-top hex grid**: Tileable honeycomb layout with configurable grid density
- **Line segment architecture**: Each style defines line segments; framework converts to filled bands, clips to hex polygon, then clips to tile boundary
- **Band rendering**: Segments become filled rectangles of width `2 * hw`, extended past endpoints to fill joint gaps
- **Hex clipping**: All bands clipped to hex polygon via Sutherland-Hodgman, preventing protrusions
- **Center disc**: Filled disc at hex center covers gaps where radials meet (skipped for styles without radials at center)
- **Edge bands**: Hex edge segments rendered at double width (outer half clipped by hex polygon)
- **10 styles**: Starburst (12 radials), Asanoha (hemp leaf), Star (Star of David), Nested (concentric hex), Tri (6 radials), Diamond Cross (6 radials + Y per triangle), Flower Star (like asanoha with 1/3 ratio), Triangle Sub (Diamond Cross + medial triangles), Lattice Star (inner triangles at 0.3 scale), Grid Lattice (Diamond Cross + medial triangles)
- **Spacing**: Inset hex vertices for gap between hexagons, with overlap margin to prevent hairline gaps
- **Ghost copies**: Hex centers generated beyond tile boundary for edge clipping

## Git History
- `master` — Current working version with all fixes merged
- `fix/cell-shape-pointy` — Merged into master. Kept for reference.
- Key revert point: commit `968659d` (pre-pointy-fix stable baseline)

## Resolved Issues
- Pointy/teardrop shapes on acute-angled cells: fixed with short-edge merging (mergeShortEdges)
- Uneven cell spacing: replaced isConvex with hasSelfIntersection check
- See `docs/pointy-fix-attempts.md` for full history of approaches tried

## Controls (sidebar order)
Title + Byline + Filename, Pattern dropdown, ---, [Pattern-specific controls], ---, Cell Color + Swap + Gap Color, Hex inputs, ---, Seed + New Pattern, ---, Width (px) + Rotate/FlipH/FlipV + Height (px), Zoom, Show Tiling Preview (3x3), (gap), Load Design, Save Design, Export SVG

### Voronoi Controls
Cell Count, Cell Shape (min 1), Cell Uniformity, Cell Spacing

### Truchet Controls
Grid Size (2-32), Balance (0-100), Arc Shape (0-100)

### Masonry Controls
Grid Size (4-20), Size Variation (0-100), Subdivision (0-100), Spacing (2-30), Corner Radius (0-100), Irregularity (0-100)

### Cityscape Controls
Cell Count (10-100), Uniformity (0-100), Size Variation (0-100), Subdivision (0-100), Spacing (2-30), Corner Radius (0-100), Shape Irregularity (0-100), Min Size (1-20)

### Reaction-Diffusion Controls
Scale (10-100), Style (0-100), Detail (1-5), Threshold (20-80), Smoothness (0-100)

### Fractal Carpet Controls
Depth (1-5), Spacing (0-30), Corner Radius (0-100), Invert (checkbox)

### Fractal Hilbert Controls
Depth (1-6), Balance (0-100), Corner Radius (0-100)

### Fractal Peano Controls
Depth (1-4), Balance (0-100), Corner Radius (0-100)

### Shapes Aligned Controls
Shape (dropdown: 10 types), Grid Size (3-20), Row Offset (0-50), Spacing (0-30), Corner Radius (0-100), Rotation (0-180°)

### Shapes Scattered Controls
Shape (dropdown: 10 types), Cell Count (5-200), Uniformity (0-100), Shape Scale (10-100), Spacing (0-30), Corner Radius (0-100), Rotation (0-100)

### Circle Packing Controls
Scale (10-100), Size Range (0-100), Density (0-100), Size Bias (0-100), Spacing (2-30)

### Hexagon Grid Controls
Style (dropdown: Starburst, Asanoha, Star, Nested, Tri, Diamond Cross, Flower Star, Triangle Sub, Lattice Star, Grid Lattice), Grid Size (1-12), Line Width (1-20), Spacing (1-50)

### Rorschach Controls
Scale (10-100), Warp (0-100), Detail (1-6), Threshold (10-90), Smoothness (0-100)

## UI Features
- **Pattern selector**: Dropdown switches between pattern types, shows/hides pattern-specific controls
- **Filename input**: Editable field below byline, pre-filled "my-pattern". Used for Save/Export filenames.
- **Unsaved indicator**: Green dot (#00d4aa) left of filename, appears when design params change since last save/load.
- **Pan**: Left-click drag on canvas to pan freely in any direction. Uses transform-based translate (not scroll).
- **Zoom wrapper**: SVG wrapped in div; both pan (translate) and zoom (scale) applied via CSS transform on wrapper.
- **Color pickers**: Cell and gap color swatches with swap button. Hex input fields below support shorthand.
- **Rotate/Flip**: Works for all patterns. Voronoi/Cityscape transform seed positions. Truchet rotates/flips orientation grid. Masonry rotates/flips grid array with subcell coordinate transforms.
- **Undo/Redo**: Full config snapshot history (max 50 entries). Debounced at 300ms so slider drags produce one undo step. Buttons (↶ ↷) in header row, also ⌘Z / ⌘⇧Z. History cleared on file load.
- **Expand/Collapse**: Toggle button (↕) in header row opens or closes all `<details>` sections in sidebar.
- **Help panel**: Slide-in panel on right side with accordion sections. Content defined in `help-content.js`. Resizable via drag handle (240–600px). Toggle button (?) in header turns blue when active.
- **Header buttons**: Title row has 4 icon buttons right-aligned: ↶ ↷ ↕ ? (matching VaseMaker layout).

## "save code" Command
When the user says "save code", perform these steps in order:
1. **Increment version**: Bump the patch version in `app/index.html` (the byline: "Seamless Tile Patterns — vX.X.X")
2. **Update docs**: Update `CLAUDE.md` and other relevant doc files if the changes warrant it
3. **Git commit**: Stage changed files and commit with a descriptive message
4. **Push**: Run `git push` — Vercel auto-deploys from `main` via GitHub integration

## Current Version
v1.0.2

## Important Constraints
- Voronoi: Spacing min=1 (not 0), Cell Shape min=1
- Voronoi: Cells must never disappear when spacing increases — they shrink instead
- Truchet: Balance clamped so arcs and gaps maintain minimum physical thickness
- Tiling preview must show seamless edges for all patterns
- SVG export should have no stroke, uses selected cell/gap colors
- Patterns are for physical objects — avoid features too thin to manufacture

## Credits
- **d3-delaunay**: https://github.com/d3/d3-delaunay — Delaunay/Voronoi computation
- **Fusion360Voronoi** by Hans Kellner: https://github.com/hanskellner/Fusion360Voronoi — Inspired the Shapes Aligned and Shapes Scattered patterns (placing geometric shapes at Voronoi cell locations instead of rendering the cells). Shape type set (circle, square, star, triangle, pentagon, hexagon, octagon) also drawn from this project. All code is original.
