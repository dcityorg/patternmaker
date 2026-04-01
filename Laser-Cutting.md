# Laser Cutting Guide

PatternMaker exports clean SVG files optimized for laser cutting and fabrication.

## Setup for Laser Cutting

1. Set **Cell color** to your cut color (usually black `#000000`)
2. Set **Gap color** to your background (usually white `#ffffff`)
3. Adjust **Spacing** to ensure minimum feature thickness (match to your material and laser kerf)
4. Enable **Tiling Preview** to verify the pattern tiles seamlessly
5. Export SVG

## SVG Properties

The exported SVG:
- Uses **filled paths only** (no strokes)
- Exact pixel dimensions as set in Width/Height
- Two colors only — cell and gap
- Clean, minimal file size

## Tiling for Large Sheets

PatternMaker generates a single tile. To cover a large sheet:
- Import into Inkscape, Adobe Illustrator, or LightBurn
- Use pattern fill or array/tile to repeat across the sheet
- Since the tile is seamlessly tiling, edges will align perfectly

## Material Tips

- **Thin features**: Increase Spacing to prevent delicate bars that may not survive cutting or are too fragile for the material
- **Acrylic**: Clean geometric patterns (Shapes Aligned, Hexagon Grid, Fractal Carpet) work especially well
- **Wood**: Organic patterns (Voronoi, Reaction-Diffusion, Rorschach) look beautiful in wood grain
- **Paper/cardstock**: Any pattern works — paper tolerates very fine detail

## Using PatternMaker SVGs in VaseMaker

PatternMaker is a companion to [VaseMaker](https://vasemaker.dcity.org). Export your SVG pattern and apply it as a texture on a 3D-printable vase:

1. Design your pattern in PatternMaker → Export SVG
2. Open VaseMaker → enable SVG Pattern texture → Load SVG (or Paste SVG)
3. Adjust `# Tiles Around` and `# Tiles Vert` to scale the pattern on the vase
