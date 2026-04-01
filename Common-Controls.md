# Common Controls

## Dimensions & View

| Control | Description |
|---------|-------------|
| Width / Height | Tile size in pixels (10–1200). The SVG export uses these dimensions. |
| Rotate | Rotates the pattern 90° clockwise and swaps width/height. |
| Flip H / Flip V | Mirrors the pattern horizontally or vertically. |
| Zoom | Canvas zoom (25–800%). Also controllable with mouse scroll wheel. |
| Tiling Preview | Shows a 3×3 grid of the tile to verify seamless edges. **Always check this before exporting.** |

## Colors

| Control | Description |
|---------|-------------|
| Cell / Gap | The two colors used in the pattern. Click the swatch to pick, or type a hex value. |
| Swap | Exchanges cell and gap colors. |
| Hex input | Supports shorthand: "f" → #ffffff, "a0" → #a0a0a0, "f80" → #ff8800. |

## Shared Sliders

| Slider | Description |
|--------|-------------|
| Spacing | Gap width between shapes. Ensures minimum physical thickness for manufacturing. |
| Corner Radius | Rounds sharp corners. 0 = sharp, 100 = maximum rounding. |
| Balance | Ratio of filled area to gap area (Truchet, Hilbert, Peano). Clamped to prevent features too thin to manufacture. |
| Uniformity | How evenly cells are distributed (Voronoi, Cityscape, Shapes Scattered). Uses Lloyd's relaxation. |
| Subdivision | Splits cells into sub-regions (Masonry, Cityscape). |

## Mouse Controls

| Action | Result |
|--------|--------|
| Left drag | Pan the canvas view |
| Scroll wheel | Zoom in/out |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘Z | Undo |
| ⌘⇧Z | Redo |
| ← → | Click a slider, then use arrow keys to nudge the value one step at a time |
