# FDM Manufacturing Constraints

Shared manufacturing constraints for 3D printing design, applicable to all CAD tools.

## Wall Thickness

| Application | Minimum | Recommended | Notes |
|-------------|---------|-------------|-------|
| Decorative | 0.8 mm | 1.2 mm | Non-structural |
| Functional | 1.2 mm | 2.0 mm | Light loads |
| Structural | 1.6 mm | 2.4 mm | Medium loads |
| Load-bearing | 2.4 mm | 3.2 mm | Heavy loads |

**Tip:** Use multiples of nozzle width (0.4mm): 0.8, 1.2, 1.6, 2.0, 2.4, 3.2mm

## Tolerances and Fits

### Clearance Fits

| Fit Type | Clearance | Use Case |
|----------|-----------|----------|
| Loose | 0.4-0.6 mm | Easy insertion, rattles OK |
| Free | 0.2-0.3 mm | Smooth sliding fit |
| Close | 0.1-0.15 mm | Snug fit, slight friction |
| Transition | 0.05 mm | May need light press |
| Press | -0.05 mm | Interference fit |

### Material Shrinkage

| Material | Shrinkage | Compensation |
|----------|-----------|--------------|
| PLA | 0.2% | Multiply dimensions by 1.002 |
| PETG | 0.4% | Multiply dimensions by 1.004 |
| ABS | 0.8% | Multiply dimensions by 1.008 |

## Hardware Reference

### Metric Screws (Socket Head Cap)

| Size | Head Ø | Head H | Clearance Ø | Pilot Ø |
|------|--------|--------|-------------|---------|
| M2 | 3.8 | 2.0 | 2.4 | 1.6 |
| M2.5 | 4.5 | 2.5 | 2.9 | 2.0 |
| M3 | 5.5 | 3.0 | 3.4 | 2.5 |
| M4 | 7.0 | 4.0 | 4.5 | 3.3 |
| M5 | 8.5 | 5.0 | 5.5 | 4.2 |
| M6 | 10.0 | 6.0 | 6.6 | 5.0 |

### Hex Nuts (DIN 934)

| Size | Width Across Flats | Width Across Corners | Thickness |
|------|-------------------|---------------------|-----------|
| M2 | 4.0 | 4.6 | 1.6 |
| M2.5 | 5.0 | 5.8 | 2.0 |
| M3 | 5.5 | 6.4 | 2.4 |
| M4 | 7.0 | 8.1 | 3.2 |
| M5 | 8.0 | 9.2 | 4.0 |
| M6 | 10.0 | 11.5 | 5.0 |

### Heat-Set Inserts

| Thread | Hole Ø | Depth |
|--------|--------|-------|
| M2 | 3.2 | 4.0 |
| M2.5 | 3.5 | 4.5 |
| M3 | 4.0 | 5.0 |
| M4 | 5.6 | 6.5 |
| M5 | 6.4 | 8.0 |

## Printer Bed Sizes

| Printer | Bed X | Bed Y | Bed Z |
|---------|-------|-------|-------|
| Bambu P1S/P2S | 256 | 256 | 256 |
| Bambu A1 | 256 | 256 | 256 |
| Bambu A1 Mini | 180 | 180 | 180 |
| Prusa MK4 | 250 | 210 | 220 |
| Prusa Mini | 180 | 180 | 180 |
| Ender 3 | 220 | 220 | 250 |
| Voron 0 | 120 | 120 | 120 |
| Voron 2.4 | 350 | 350 | 350 |

## Overhang and Bridging

| Feature | Limit | Notes |
|---------|-------|-------|
| Maximum overhang | 45° | Without supports |
| Maximum bridge | 50 mm | Printer dependent |
| Minimum vertical hole | 1 mm | May need cleanup |
| Minimum horizontal hole | 2 mm | Use teardrop shape |

## Edge Treatments

| Location | Type | Size | Purpose |
|----------|------|------|---------|
| Bottom edges | Chamfer | 0.3-0.5 mm | Elephant foot prevention |
| Top edges | Chamfer | 0.3-0.8 mm | Chip/break prevention |
| Inside corners | Fillet | 2-3 mm | Stress relief |
| Outside corners | Fillet | 3-10 mm | Grip comfort, aesthetics |

### Wall = Corner Radius Rule

When wall thickness equals fillet radius, vertical fillets terminate cleanly at the inner wall surface:
- `wall = 5mm, corner_r = 5mm` → Clean corners
- `wall = 5mm, corner_r = 8mm` → Fillet overshoots, creates ledge

## Layer-Aware Design

### Heights to Match Layer Height

For 0.2mm layer height, use multiples: 0.2, 0.4, 0.6, 0.8, 1.0, 1.2...

For 0.16mm layer height (quality): 0.16, 0.32, 0.48, 0.64, 0.8...

### Top/Bottom Shell

- Minimum 3 top layers for solid surface
- Minimum 3 bottom layers for bed adhesion
- At 0.2mm layer height: 0.6mm minimum top/bottom thickness
