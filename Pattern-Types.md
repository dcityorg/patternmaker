# Pattern Types

PatternMaker includes 13 seamless tile pattern types. All patterns tile perfectly and use only two colors.

---

## Voronoi
Organic cell shapes based on Voronoi tessellation.  
**Controls:** cell count, shape rounding, uniformity, spacing.  
Great for: organic textures, stone/ceramic looks, natural surfaces.

---

## Truchet
Quarter-arc tiles that connect at edges — a classic algorithmic pattern.  
**Controls:** balance (arc vs gap thickness), arc shape (sharp L-bends to smooth curves).  
Great for: maze-like patterns, flowing curves, Celtic-inspired designs.

---

## Masonry
Irregular rounded rectangles in a brick-like grid.  
**Controls:** subdivision (splits cells), size variation (adds randomness), spacing, corner radius.  
Great for: stone walls, paving, architectural textures.

---

## Cityscape
Irregular quadrilaterals placed in Voronoi-distributed territories.  
**Controls:** shape irregularity (warps rectangles into trapezoids), subdivision, uniformity.  
Great for: urban/map-like patterns, irregular geometric grids.

---

## Rorschach
Organic inkblot shapes from domain-warped Perlin noise.  
**Controls:** warp (creates flowing, swirling forms), scale, detail.  
Great for: organic blobs, cloud-like patterns, abstract art.

---

## Reaction-Diffusion
Simulation-based patterns using the Gray-Scott model.  
**Controls:** style (sweeps from labyrinths through worms to spots), scale, detail.  
⚠️ May take 1–3 seconds to generate. Tiling may not be seamless with all combinations — try adjusting Scale or using square dimensions if you see edge mismatches.  
Great for: biological textures, coral, labyrinth patterns.

---

## Circle Packing
Multi-scale circles packed tightly with varying sizes.  
**Controls:** size bias and size range (control mix of large and small circles), spacing.  
Great for: bubble patterns, polka dots with variation, atomic/cellular looks.

---

## Fractal Carpet
Sierpinski carpet — recursive square subdivisions with center cutouts.  
**Controls:** invert mode (fills the holes instead), depth, spacing.  
Great for: geometric fractals, architectural grilles, lace patterns.

---

## Fractal Hilbert
Hilbert space-filling curve rendered as a filled band.  
**Controls:** corner radius (rounds the turns), balance (band thickness).  
Great for: space-filling curves, data-visualization-inspired art, labyrinthine designs.

---

## Fractal Peano
Peano space-filling curve as a filled band.  
Similar to Hilbert but with a 3-fold grid structure.  
**Controls:** corner radius, balance.  
Great for: dense space-filling patterns, geometric mazes.

---

## Shapes Aligned
Geometric shapes on a regular grid.  
**Controls:** 10 shape types, row offset (creates brick/hex layouts), size, spacing, corner radius.  
Great for: regular geometric tiles, polka dots, honeycomb grids.

---

## Shapes Scattered
Geometric shapes at Voronoi-distributed positions (irregular spacing).  
**Controls:** 10 shape types, rotation (per-shape random spin), uniformity, size, spacing.  
Great for: scattered confetti looks, organic irregular fields.

---

## Hexagon Grid *(new)*
Flat-top hexagonal grid with internal geometric line patterns rendered as filled bands.  
**Controls:** 10 styles — from simple radials (Tri, Starburst) to complex subdivisions (Diamond Cross, Lattice Star, Grid Lattice). Balance controls band thickness.  
Great for: honeycomb patterns, geometric tile designs, architectural grilles.
