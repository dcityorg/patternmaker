# Tips & Best Practices

## General

- **Always check Tiling Preview before exporting** — it reveals edge mismatches that are invisible on a single tile
- For physical objects, avoid very thin lines. Use the Spacing and Balance sliders to maintain minimum feature thickness
- The Seed number fully determines the pattern — same seed + settings = identical results every time
- Use Rotate and Flip to explore different orientations without changing the underlying pattern

## Performance

- **Reaction-Diffusion is the slowest pattern** — use lower Scale and Detail values while experimenting, then increase for the final export
- If the app feels slow, reduce the tile dimensions while designing, then increase for final export

## Color Tips

- Hex shorthand saves time: type `0` for black, `f` for white, `888` for medium gray
- Use **Swap** to quickly see both color inversions — sometimes the inverted version looks better
- For laser cutting: use pure black (`000000`) and white (`ffffff`) — no ambiguity about what gets cut

## For Laser Cutting

- Use high-contrast black/white colors
- Enable Tiling Preview to verify seamless edges before cutting a large sheet
- Spacing slider ensures a minimum feature size — set it based on your laser's kerf width
- SVG export has no stroke — just clean filled paths, exactly what laser software needs

## For VaseMaker Integration

- Export your SVG from PatternMaker
- In VaseMaker: enable SVG Pattern texture → Load SVG
- Adjust `# Tiles Around` and `# Tiles Vert` to scale the pattern on the vase
- Works best with high-contrast designs — grayscale produces multi-depth relief effects
