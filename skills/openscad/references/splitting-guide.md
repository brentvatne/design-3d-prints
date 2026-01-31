# Splitting Large 3D Prints for Assembly

A comprehensive guide for when and how to split large objects into multiple printable parts.

## When to Split vs. Print as One Piece

### Decision Criteria

| Factor | Single Print | Split Print |
|--------|-------------|-------------|
| **Fits on bed** | < 90% of any axis | > 90% of any axis |
| **Supports needed** | Minimal | Extensive internal |
| **Failure risk** | Acceptable | High (long print) |
| **Strength required** | Critical continuous | Joint-friendly loads |
| **Surface quality** | Good in one orientation | Needs multiple orientations |

### Split When:
- Any dimension exceeds 85-90% of build volume
- Internal supports would be extensive (>20% of print time)
- Print time exceeds 20+ hours (high failure cost)
- Different sections need different materials or orientations
- Complex geometry has no good single orientation

### Don't Split When:
- Continuous material strength is critical
- Assembly would create weak points in stress areas
- Assembly time exceeds print time savings
- Dimensional accuracy across assembly is critical

## Joint Types and When to Use Each

### Alignment Pins (Dowels)

**Best for**: Quick alignment, temporary positioning before gluing

| Fit Type | Clearance | Use Case |
|----------|-----------|----------|
| Press fit | Pin diameter + 0.0 to 0.05mm | Permanent, no glue |
| Snug fit | Pin diameter + 0.1 to 0.2mm | Hand pressure, some adjustment |
| Slip fit | Pin diameter + 0.2 to 0.3mm | Easy assembly with glue |

**Design rules**:
- Pin diameter: 3-6mm typical
- Pin length: 2-3x diameter
- Chamfer entry: 0.5mm at 45°
- Minimum 2 pins per joint for rotation resistance

### Dovetail Joints

**Best for**: Self-aligning, tension-resistant joints

| Parameter | Recommended |
|-----------|-------------|
| Angle | 8-12° from vertical |
| Width | 15-25mm |
| Depth | 5-10mm |
| Tolerance | 0.15-0.2mm per wall |

**Design rules**:
- Male part narrower at tip (taper outward)
- Female slot matches with tolerance added
- Can slide together without adhesive
- Print male with taper facing up for strength

### Tab and Slot

**Best for**: Simple alignment, moderate loads

| Application | Tab Thickness | Tab Length | Clearance |
|-------------|--------------|------------|-----------|
| Light duty | 2-3mm | 5-10mm | +0.3mm |
| Medium duty | 3-5mm | 10-15mm | +0.2mm |
| Heavy duty | 5-8mm | 15-25mm | +0.2mm |

**Design rules**:
- Fillet at tab base: 0.5-1mm radius
- Entry chamfer: 0.5mm for easier assembly
- Minimum tab width: 5mm

### Snap-Fit Joints

**Best for**: Tool-free assembly, repeated disassembly

| Parameter | Recommended |
|-----------|-------------|
| Beam width | 5-10mm minimum |
| Base thickness | 1.5-2mm |
| Taper | 100% at base to 50% at tip |
| Hook depth | 1-2mm |
| Deflection | < 50% of max for fatigue life |

**Critical**: Print cantilever beams in X-Y plane (not Z) for strength

### Threaded Inserts

**Best for**: Repeated disassembly, high clamping force

| Insert | Hole Dia | Hole Depth | Min Wall |
|--------|----------|------------|----------|
| M2 | 3.2mm | 4.0mm | 1.5mm |
| M3 | 4.0mm | 5.0mm | 1.7mm |
| M4 | 5.6mm | 6.5mm | 2.5mm |
| M5 | 6.4mm | 8.0mm | 3.0mm |

**Installation**: Soldering iron at 340-400°C, push 90% in, press flush when cooling

## Assembly Methods

### Adhesive Selection

| Material | Best Adhesive | Bond Strength | Notes |
|----------|--------------|---------------|-------|
| PLA | CA (super glue) | High | Quick cure, rigid |
| ABS | Acetone weld | Very High | Chemical bond |
| PETG | Epoxy or 3D Gloop | Medium | Difficult material |
| TPU | Flexible CA | Medium | Maintains flex |

### Adhesive Comparison

| Type | Cure Time | Gap Fill | Strength | Best For |
|------|-----------|----------|----------|----------|
| CA Thin | 5-10 sec | None | Medium | Tight joints |
| CA Medium | 15-30 sec | 0.1mm | Medium | General use |
| CA Thick | 30-60 sec | 0.5mm | Medium | Gap filling |
| 5-min Epoxy | 5 min / 24h full | Good | High | Quick structural |
| Structural Epoxy | 30 min / 72h full | Excellent | Very High | Max strength |
| Acetone (ABS) | 24-48h | None | Very High | ABS permanent |

### Mechanical Fasteners

| Method | Cycles | Strength | Use Case |
|--------|--------|----------|----------|
| Self-tapping | 3-5 | Medium | Prototypes |
| Heat-set insert | 100+ | High | Production |
| Through-bolt + nut | Unlimited | High | Serviceable |
| Captive nut | Unlimited | High | Permanent threads |

## OpenSCAD Splitting Patterns

### Basic Split with Alignment Pins

```openscad
split_height = 40;  // Z height of split
pin_d = 4;          // Alignment pin diameter
pin_h = 6;          // Pin height (half in each part)
tolerance = 0.2;    // Clearance for fit

// Pin positions
pin_positions = [[20, 20], [80, 20], [20, 80], [80, 80]];

module alignment_pins(positions, d, h) {
    for (p = positions)
        translate([p[0], p[1], 0])
            cylinder(d = d, h = h, $fn = 32);
}

module alignment_holes(positions, d, h, clearance) {
    for (p = positions)
        translate([p[0], p[1], -0.1])
            cylinder(d = d + clearance, h = h + 0.2, $fn = 32);
}

module bottom_half() {
    intersection() {
        main_object();
        cube([200, 200, split_height]);
    }
    translate([0, 0, split_height])
        alignment_pins(pin_positions, pin_d, pin_h);
}

module top_half() {
    difference() {
        intersection() {
            main_object();
            translate([0, 0, split_height])
                cube([200, 200, 200]);
        }
        translate([0, 0, split_height - pin_h])
            alignment_holes(pin_positions, pin_d, pin_h + 1, tolerance);
    }
}
```

### Dovetail Joint Module

```openscad
module dovetail(width, depth, angle = 10, height = 10,
                male = true, tolerance = 0.15) {
    offset = depth * tan(angle);

    if (male) {
        w_top = width - 2 * offset - 2 * tolerance;
        w_bottom = width - 2 * tolerance;
        linear_extrude(height)
            polygon([
                [-w_bottom/2, 0], [w_bottom/2, 0],
                [w_top/2 + offset, depth], [-w_top/2 - offset, depth]
            ]);
    } else {
        linear_extrude(height)
            polygon([
                [-width/2, 0], [width/2, 0],
                [width/2 - offset, depth], [-width/2 + offset, depth]
            ]);
    }
}

// Usage:
// translate([50, 0, split_height]) dovetail(20, 8, male=true);  // On bottom
// translate([50, 0, split_height-0.1]) dovetail(20, 8, male=false);  // Cut from top
```

### Multi-Part Export Helper

```openscad
// Use: openscad -D "PART=1" -o part1.stl model.scad
PART = 0;  // 0 = preview all, 1+ = individual parts

module render_part(n) {
    if (PART == 0 || PART == n) children();
}

// Example:
render_part(1) bottom_half();
render_part(2) top_half();
```

## Decision Matrix

### When to Use Each Joint Type

| Scenario | Primary Joint | Secondary |
|----------|--------------|-----------|
| Quick prototype | Pins + CA glue | - |
| Production quality | Dovetails + epoxy | Pins for alignment |
| Serviceable | Heat-set inserts | - |
| Invisible seam | Pins + solvent weld | Sand and fill |
| Maximum strength | Through-bolts + epoxy | Dovetails |
| Large flat split | Grid of pins + epoxy | Tongue and groove |

### Material + Adhesive Combinations

| Material | Quick Assembly | Maximum Strength | Waterproof |
|----------|---------------|------------------|------------|
| PLA | CA medium | CA + mechanical | Epoxy |
| ABS | Acetone weld | Acetone + screws | Epoxy |
| PETG | 3D Gloop | Epoxy + screws | Epoxy |
| TPU | Flexible CA | Flexible CA + sewing | - |

## Tolerance Quick Reference

| Application | Tolerance |
|-------------|-----------|
| Press fit (permanent) | -0.1 to 0.0mm |
| Snug fit (friction) | +0.1 to +0.2mm |
| Sliding fit (easy) | +0.3 to +0.4mm |
| Loose fit (clearance) | +0.5mm+ |
| Dovetail joints | +0.15 to +0.2mm per wall |
| Screw clearance | +0.4 to +0.5mm |
