# OpenSCAD Design Principles for 3D Printing

## 1. Parametric Design Architecture

### Parameter Organization
```openscad
// ============================================
// SECTION 1: USER PARAMETERS
// These are meant to be modified by end users
// ============================================

/* [Main Dimensions] */
width = 100;          // Object width in mm
depth = 60;           // Object depth in mm
height = 40;          // Object height in mm

/* [Structure] */
wall_thickness = 2.4; // Wall thickness (use multiples of 0.4)
base_thickness = 1.6; // Base thickness (use multiples of 0.2)

/* [Features] */
include_lid = true;   // Generate matching lid
include_vents = false; // Add ventilation slots

/* [Tolerances] */
fit_clearance = 0.3;  // Gap for mating parts

// ============================================
// SECTION 2: DERIVED DIMENSIONS
// Calculated from user parameters - do not modify directly
// ============================================

inner_width = width - 2 * wall_thickness;
inner_depth = depth - 2 * wall_thickness;
inner_height = height - base_thickness;

// ============================================
// SECTION 3: CONSTANTS
// Fixed values for manufacturing
// ============================================

/* [Hidden] */
$fn = $preview ? 24 : 48;  // Resolution: low for preview, high for export
epsilon = 0.01;             // Small value for boolean overlaps
min_wall = 1.2;             // Absolute minimum wall thickness
```

### Naming Conventions
- Use `snake_case` for all variables and modules
- Prefix related parameters: `screw_hole_diameter`, `screw_head_diameter`
- Suffix with units or type: `_mm`, `_count`, `_angle`, `_enabled`
- Use descriptive names over abbreviations

## 2. Module Design Patterns

### Parameterized Modules
```openscad
/**
 * Creates a rounded rectangular box
 * @param size - [width, depth, height] vector
 * @param radius - corner radius
 * @param center - center the object on origin
 */
module rounded_box(size, radius, center = false) {
    assert(radius <= min(size[0], size[1]) / 2,
           "Radius cannot exceed half the smallest dimension");

    translate(center ? [-size[0]/2, -size[1]/2, 0] : [0, 0, 0])
    hull() {
        for (x = [radius, size[0] - radius])
        for (y = [radius, size[1] - radius])
            translate([x, y, 0])
            cylinder(r = radius, h = size[2]);
    }
}
```

### Composable Modules
```openscad
// Base shape module
module box_outer() {
    rounded_box([outer_width, outer_depth, outer_height], corner_radius);
}

// Cavity module
module box_cavity() {
    translate([wall, wall, base])
        rounded_box([inner_width, inner_depth, inner_height + epsilon],
                    max(corner_radius - wall, 1));
}

// Combined with features
module box_base() {
    difference() {
        box_outer();
        box_cavity();
        mounting_holes();
        ventilation_slots();
    }
}
```

## 3. Manifold Geometry Rules

### Avoid Non-Manifold Edges
```openscad
// BAD: Cubes touching at edge only
cube([10, 10, 10]);
translate([10, 0, 0]) cube([10, 10, 10]);

// GOOD: Slight overlap ensures solid mesh
cube([10, 10, 10]);
translate([9.99, 0, 0]) cube([10.01, 10, 10]);

// BETTER: Single unified geometry
cube([20, 10, 10]);
```

### Boolean Cut Extensions
```openscad
// BAD: Hole exactly matches surface
difference() {
    cube([20, 20, 10]);
    translate([10, 10, 0])
        cylinder(h = 10, d = 5);  // Ends exactly at surface
}

// GOOD: Extend past both surfaces
difference() {
    cube([20, 20, 10]);
    translate([10, 10, -epsilon])
        cylinder(h = 10 + 2*epsilon, d = 5);  // Extends past both ends
}
```

### Coincident Face Prevention
```openscad
// BAD: Two surfaces at identical Z
cube([20, 20, 10]);
translate([5, 5, 10]) cube([10, 10, 5]);  // Bottom at Z=10

// GOOD: Slight intersection
cube([20, 20, 10]);
translate([5, 5, 9.99]) cube([10, 10, 5.01]);
```

## 4. Print Orientation Design

### Layer Strength Awareness
- Z-axis (vertical) is 20-50% weaker than X-Y plane
- Design so primary loads are perpendicular to layer lines
- Orient longest dimension along build plate when possible

### Overhang Management
```openscad
// Convert 90-degree overhang to 45-degree chamfer
module printable_overhang(width, depth, height) {
    hull() {
        cube([width, depth, 1]);
        translate([height, height, height])
            cube([width - 2*height, depth - 2*height, 1]);
    }
}

// Teardrop hole for horizontal printing
module teardrop_hole(d, h) {
    cylinder(h = h, d = d);
    rotate([0, 0, 45])
        translate([0, 0, h/2])
        cube([d/sqrt(2), d/sqrt(2), h], center = true);
}
```

### Bridge Design
```openscad
// For spans over 10mm, add intermediate support
bridge_span = 30;
support_spacing = 10;
support_count = floor(bridge_span / support_spacing) - 1;

module bridged_span() {
    difference() {
        cube([bridge_span, 10, 2]);

        // Support columns that can be removed
        for (i = [1 : support_count])
            translate([i * support_spacing - 0.5, -epsilon, -epsilon])
                cube([1, 10 + 2*epsilon, 5]);
    }
}
```

## 5. Tolerance Application

### Fit Types Reference
| Fit Type | Clearance | Application |
|----------|-----------|-------------|
| Interference | -0.2 to -0.1mm | Press fits, permanent assembly |
| Transition | -0.1 to +0.1mm | Location fits, light press |
| Clearance (snug) | +0.1 to +0.2mm | Accurate location, friction hold |
| Clearance (normal) | +0.3 to +0.4mm | Easy assembly, moving parts |
| Clearance (loose) | +0.5mm+ | Free movement, thermal expansion |

### Hole Compensation
Printed holes are typically undersized due to:
- Perimeter overlap
- Corner rounding
- Thermal contraction

Apply these compensations:
```openscad
// Hole size compensation for FDM
hole_compensation = 0.4;  // Add to designed diameter

module compensated_hole(d, h) {
    cylinder(h = h, d = d + hole_compensation, $fn = max(24, d * 4));
}

// For different fit types
module clearance_hole(screw_size, h) {
    d = screw_size + 0.4 + hole_compensation;  // +0.4 for clearance
    cylinder(h = h, d = d);
}

module pilot_hole(screw_size, h) {
    d = screw_size * 0.8 + hole_compensation;  // 80% for self-tap
    cylinder(h = h, d = d);
}
```

### Sliding Fit Example
```openscad
// Two parts that slide together
rail_width = 10;
rail_tolerance = 0.3;  // Per side

module rail() {
    cube([rail_width, 100, 5]);
}

module rail_channel() {
    // Slot is wider by 2× tolerance (both sides)
    slot_width = rail_width + 2 * rail_tolerance;
    cube([slot_width, 100, 6]);
}
```

## 6. Structural Reinforcement

### Rib Design
```openscad
rib_height = wall * 2.5;          // 2-3× wall thickness
rib_thickness = wall * 0.5;       // 50-60% of wall
rib_spacing = wall * 2.5;         // 2-3× wall thickness

module reinforcement_ribs(length, count) {
    for (i = [0 : count - 1]) {
        translate([0, i * rib_spacing, 0])
            cube([length, rib_thickness, rib_height]);
    }
}
```

### Gusset Design
```openscad
gusset_size = 15;
gusset_thickness = wall * 0.5;

module corner_gusset() {
    // 45-degree triangular gusset
    linear_extrude(gusset_thickness)
    polygon([
        [0, 0],
        [gusset_size, 0],
        [0, gusset_size]
    ]);
}

module filleted_gusset() {
    fillet_r = gusset_thickness * 0.5;

    difference() {
        linear_extrude(gusset_thickness)
        offset(r = fillet_r)
        offset(r = -fillet_r)
        polygon([
            [0, 0],
            [gusset_size, 0],
            [0, gusset_size]
        ]);
    }
}
```

### Fillet Application
```openscad
// Interior corner fillet (stress relief)
module interior_fillet(r, h) {
    difference() {
        cube([r, r, h]);
        translate([r, r, -epsilon])
            cylinder(r = r, h = h + 2*epsilon);
    }
}

// Exterior chamfer (edge protection, printability)
module edge_chamfer(length, size) {
    rotate([0, 0, 45])
        translate([-size/sqrt(2), 0, 0])
        cube([size * sqrt(2), size * sqrt(2), length]);
}
```

## 7. Common Failure Prevention

### Stress Concentration Mitigation
```openscad
// BAD: Sharp corner under load
module weak_bracket() {
    difference() {
        cube([30, 30, 5]);
        translate([10, 10, -1]) cube([10, 10, 7]);  // Sharp corners
    }
}

// GOOD: Filleted corners
module strong_bracket() {
    difference() {
        cube([30, 30, 5]);
        translate([10, 10, -1])
            offset(r = 2) offset(r = -2)  // 2mm corner radius
            square([10, 10]);
    }
}
```

### Fatigue-Resistant Snap Fits
```openscad
// Design for 50% of maximum deflection for repeated use
snap_arm_length = 15;
snap_arm_thickness = 2;
snap_deflection = 1.0;  // 50% of 2mm max for fatigue life

module snap_arm() {
    cube([snap_arm_thickness, snap_arm_length, 5]);

    // Hook with lead-in ramp
    translate([0, snap_arm_length - 2, 0])
        hull() {
            cube([snap_arm_thickness, 0.1, 5]);
            translate([snap_deflection, 2, 0])
                cube([snap_arm_thickness, 0.1, 5]);
        }
}
```

### Creep-Resistant Design
For sustained loads, design for 50% of short-term strength:
```openscad
// Instead of thin press-fit bosses, use heat-set inserts
insert_od = 4.0;  // M3 insert outer diameter
boss_od = insert_od * 2;  // 2× insert diameter for strength

module insert_boss(h) {
    difference() {
        cylinder(d = boss_od, h = h);
        translate([0, 0, -epsilon])
            cylinder(d = insert_od - 0.1, h = h + 2*epsilon);  // Undersized for press
    }
}
```

## 8. Resolution and Performance

### Adaptive Resolution
```openscad
// Use $preview for fast iteration
$fn = $preview ? 16 : 48;

// Set resolution based on feature size
module scaled_resolution_cylinder(d, h) {
    fn = max(16, min(64, d * 4));  // 4 segments per mm, 16-64 range
    cylinder(d = d, h = h, $fn = fn);
}
```

### Render Caching for Complex Booleans
```openscad
// Cache expensive boolean results
module complex_part() {
    render()  // Force CGAL evaluation and cache
    difference() {
        complex_base();
        for (i = [1:50])
            transform(i) small_feature();
    }
}
```

### Minkowski Alternatives
```openscad
// SLOW: Full minkowski
module slow_rounded() {
    minkowski() {
        cube([20, 20, 10]);
        sphere(r = 2, $fn = 32);
    }
}

// FAST: Hull with corner spheres
module fast_rounded(size, r) {
    hull() {
        for (x = [r, size[0]-r])
        for (y = [r, size[1]-r])
        for (z = [r, size[2]-r])
            translate([x, y, z])
            sphere(r = r, $fn = 16);
    }
}

// FASTER: 2D offset + extrude (no Z rounding)
module fastest_rounded(size, r) {
    linear_extrude(size[2])
        offset(r = r) offset(r = -r)
        square([size[0], size[1]]);
}
```

## 9. Debug and Validation

### Visual Debugging
```openscad
// Highlight specific components
module debug_highlight() {
    # child_component();  // Transparent red highlight
}

// Show cross-section
module cross_section() {
    difference() {
        children();
        translate([-500, 0, -500])
            cube([1000, 1000, 1000]);
    }
}
```

### Dimension Validation
```openscad
// Assert valid dimensions
module validated_box(size, wall) {
    assert(size[0] > 2*wall, "Width too small for wall thickness");
    assert(size[1] > 2*wall, "Depth too small for wall thickness");
    assert(wall >= min_wall, str("Wall thickness below minimum: ", min_wall));

    // Proceed with validated dimensions
    difference() {
        cube(size);
        translate([wall, wall, wall])
            cube([size[0]-2*wall, size[1]-2*wall, size[2]]);
    }
}
```

### Echo Dimensions for Verification
```openscad
echo(str("=== Final Dimensions ==="));
echo(str("Outer: ", outer_width, " × ", outer_depth, " × ", outer_height, " mm"));
echo(str("Inner: ", inner_width, " × ", inner_depth, " × ", inner_height, " mm"));
echo(str("Wall: ", wall_thickness, " mm"));
echo(str("Estimated material: ", volume/1000, " cm³"));
```
