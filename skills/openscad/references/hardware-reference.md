# Hardware Reference for 3D Printed Parts

## Metric Screw Reference

### Clearance Holes (for screw to pass through freely)
| Screw | Nominal | Clearance Hole | Close Fit |
|-------|---------|----------------|-----------|
| M2 | 2.0mm | 2.4mm | 2.2mm |
| M2.5 | 2.5mm | 2.9mm | 2.7mm |
| M3 | 3.0mm | 3.4mm | 3.2mm |
| M4 | 4.0mm | 4.5mm | 4.3mm |
| M5 | 5.0mm | 5.5mm | 5.3mm |
| M6 | 6.0mm | 6.6mm | 6.4mm |
| M8 | 8.0mm | 8.8mm | 8.4mm |

### Self-Tapping Pilot Holes (for thread-forming in plastic)
| Screw | Pilot Hole | Boss OD (min) |
|-------|------------|---------------|
| M2 | 1.6mm | 5.0mm |
| M2.5 | 2.0mm | 6.0mm |
| M3 | 2.5mm | 7.0mm |
| M4 | 3.3mm | 9.0mm |
| M5 | 4.2mm | 11.0mm |
| M6 | 5.0mm | 13.0mm |

### Heat-Set Insert Holes
| Insert Size | Hole Diameter | Hole Depth | Boss OD |
|-------------|---------------|------------|---------|
| M2 | 3.2mm | 4.0mm | 6.0mm |
| M2.5 | 3.5mm | 4.5mm | 7.0mm |
| M3 | 4.0mm | 5.0mm | 8.0mm |
| M4 | 5.6mm | 6.5mm | 10.0mm |
| M5 | 6.4mm | 8.0mm | 12.0mm |

Note: Hole diameter is ~95% of insert OD for tight fit.

### Socket Head Cap Screw (SHCS) Counterbores
| Screw | Head Diameter | Head Height | Counterbore Ø | Counterbore Depth |
|-------|---------------|-------------|---------------|-------------------|
| M2 | 3.8mm | 2.0mm | 4.4mm | 2.2mm |
| M2.5 | 4.5mm | 2.5mm | 5.1mm | 2.7mm |
| M3 | 5.5mm | 3.0mm | 6.0mm | 3.3mm |
| M4 | 7.0mm | 4.0mm | 7.6mm | 4.4mm |
| M5 | 8.5mm | 5.0mm | 9.2mm | 5.5mm |
| M6 | 10.0mm | 6.0mm | 10.6mm | 6.5mm |
| M8 | 13.0mm | 8.0mm | 13.6mm | 8.6mm |

### Flat Head (Countersunk) Screws
| Screw | Head Diameter | Countersink Angle | Countersink Ø | Countersink Depth |
|-------|---------------|-------------------|---------------|-------------------|
| M2 | 4.0mm | 90° | 4.4mm | 1.2mm |
| M3 | 6.0mm | 90° | 6.5mm | 1.7mm |
| M4 | 8.0mm | 90° | 8.6mm | 2.3mm |
| M5 | 10.0mm | 90° | 10.6mm | 2.8mm |
| M6 | 12.0mm | 90° | 12.6mm | 3.3mm |

## Metric Nuts

### Hex Nut Pockets
| Nut | Width Across Flats | Width Across Corners | Thickness | Pocket Size (with clearance) |
|-----|--------------------|--------------------|-----------|------------------------------|
| M2 | 4.0mm | 4.6mm | 1.6mm | 4.4mm × 2.0mm |
| M2.5 | 5.0mm | 5.8mm | 2.0mm | 5.4mm × 2.4mm |
| M3 | 5.5mm | 6.4mm | 2.4mm | 6.0mm × 2.8mm |
| M4 | 7.0mm | 8.1mm | 3.2mm | 7.5mm × 3.6mm |
| M5 | 8.0mm | 9.2mm | 4.0mm | 8.5mm × 4.4mm |
| M6 | 10.0mm | 11.5mm | 5.0mm | 10.5mm × 5.4mm |
| M8 | 13.0mm | 15.0mm | 6.5mm | 13.6mm × 7.0mm |

### Square Nut Pockets
| Nut | Side Length | Thickness | Pocket Size |
|-----|-------------|-----------|-------------|
| M3 | 5.5mm | 1.8mm | 5.9mm × 2.2mm |
| M4 | 7.0mm | 2.2mm | 7.5mm × 2.6mm |
| M5 | 8.0mm | 2.7mm | 8.5mm × 3.1mm |
| M6 | 10.0mm | 3.2mm | 10.5mm × 3.6mm |

### T-Nut Slots (Drop-in)
| Nut | Slot Width | Slot Depth | Opening Width |
|-----|------------|------------|---------------|
| M3 | 5.7mm | 2.5mm | 3.4mm |
| M4 | 7.2mm | 3.5mm | 4.5mm |
| M5 | 8.2mm | 4.5mm | 5.5mm |

## OpenSCAD Modules

```openscad
// ============================================
// HARDWARE MODULES
// ============================================

// Clearance hole (through hole for screw)
module clearance_hole(screw_size, depth, countersink = false) {
    clearances = [
        [2, 2.4], [2.5, 2.9], [3, 3.4], [4, 4.5],
        [5, 5.5], [6, 6.6], [8, 8.8]
    ];
    d = lookup(screw_size, clearances);

    cylinder(h = depth + 0.1, d = d, $fn = 24);

    if (countersink) {
        cs_d = screw_size * 2 + 0.5;
        cs_depth = screw_size * 0.6;
        translate([0, 0, depth - cs_depth])
            cylinder(h = cs_depth + 0.1, d1 = d, d2 = cs_d, $fn = 24);
    }
}

// Self-tapping pilot hole
module pilot_hole(screw_size, depth) {
    pilots = [
        [2, 1.6], [2.5, 2.0], [3, 2.5], [4, 3.3],
        [5, 4.2], [6, 5.0]
    ];
    d = lookup(screw_size, pilots);

    cylinder(h = depth + 0.1, d = d, $fn = 24);
}

// Heat-set insert hole
module insert_hole(screw_size, depth = 0) {
    inserts = [
        [2, [3.2, 4.0]], [2.5, [3.5, 4.5]], [3, [4.0, 5.0]],
        [4, [5.6, 6.5]], [5, [6.4, 8.0]]
    ];
    data = lookup(screw_size, inserts);
    d = data[0];
    h = depth > 0 ? depth : data[1];

    cylinder(h = h + 0.1, d = d, $fn = 32);
}

// Screw boss for self-tapping
module screw_boss(screw_size, height) {
    boss_d = [
        [2, 5.0], [2.5, 6.0], [3, 7.0], [4, 9.0], [5, 11.0], [6, 13.0]
    ];
    od = lookup(screw_size, boss_d);

    difference() {
        cylinder(h = height, d = od, $fn = 32);
        translate([0, 0, -0.1])
            pilot_hole(screw_size, height + 0.2);
    }
}

// Hex nut pocket
module hex_nut_pocket(screw_size, depth = 0) {
    nuts = [
        [2, [4.6, 1.6]], [2.5, [5.8, 2.0]], [3, [6.4, 2.4]],
        [4, [8.1, 3.2]], [5, [9.2, 4.0]], [6, [11.5, 5.0]], [8, [15.0, 6.5]]
    ];
    data = lookup(screw_size, nuts);
    across_corners = data[0] + 0.4;  // Add clearance
    thickness = depth > 0 ? depth : data[1] + 0.4;

    cylinder(h = thickness, d = across_corners, $fn = 6);
}

// Square nut pocket
module square_nut_pocket(screw_size, depth = 0) {
    nuts = [
        [3, [5.5, 1.8]], [4, [7.0, 2.2]], [5, [8.0, 2.7]], [6, [10.0, 3.2]]
    ];
    data = lookup(screw_size, nuts);
    side = data[0] + 0.4;  // Add clearance
    thickness = depth > 0 ? depth : data[1] + 0.4;

    translate([-side/2, -side/2, 0])
        cube([side, side, thickness]);
}

// Counterbore for socket head cap screw
module counterbore(screw_size, through_depth, head_depth = 0) {
    heads = [
        [2, [3.8, 2.0]], [2.5, [4.5, 2.5]], [3, [5.5, 3.0]],
        [4, [7.0, 4.0]], [5, [8.5, 5.0]], [6, [10.0, 6.0]], [8, [13.0, 8.0]]
    ];
    data = lookup(screw_size, heads);
    head_d = data[0] + 0.5;  // Add clearance
    h_depth = head_depth > 0 ? head_depth : data[1] + 0.3;

    // Through hole
    clearance_hole(screw_size, through_depth);

    // Head recess
    translate([0, 0, through_depth - h_depth])
        cylinder(h = h_depth + 0.1, d = head_d, $fn = 32);
}

// Countersink for flat head screw
module countersink(screw_size, through_depth) {
    cs = [
        [2, 4.0], [3, 6.0], [4, 8.0], [5, 10.0], [6, 12.0]
    ];
    cs_d = lookup(screw_size, cs) + 0.5;
    cs_depth = (cs_d - screw_size) / 2;  // 90° countersink

    clearances = [[2, 2.4], [3, 3.4], [4, 4.5], [5, 5.5], [6, 6.6]];
    hole_d = lookup(screw_size, clearances);

    // Through hole
    cylinder(h = through_depth + 0.1, d = hole_d, $fn = 24);

    // Countersink
    translate([0, 0, through_depth - cs_depth])
        cylinder(h = cs_depth + 0.1, d1 = hole_d, d2 = cs_d, $fn = 32);
}

// Example usage:
// difference() {
//     cube([30, 30, 10]);
//     translate([15, 15, 0]) counterbore(4, 10, 5);
//     translate([15, 15, 5]) hex_nut_pocket(4);
// }
```

## Keyhole Slot Dimensions

For wall mounting with standard screws:

| Screw | Head Entry Ø | Slot Width | Slot Length | Slot Depth |
|-------|-------------|------------|-------------|------------|
| #6 | 8.0mm | 4.0mm | 10mm | 2.5mm |
| #8 | 9.0mm | 4.5mm | 12mm | 3.0mm |
| M4 | 9.0mm | 4.5mm | 12mm | 3.0mm |
| M5 | 10.0mm | 5.5mm | 14mm | 3.5mm |

```openscad
module keyhole_slot(head_d = 9, slot_w = 4.5, slot_l = 12, depth = 3) {
    hull() {
        cylinder(h = depth, d = head_d, $fn = 32);
        translate([0, -slot_l, 0])
            cylinder(h = depth, d = slot_w, $fn = 24);
    }
    // Wider entry at top
    cylinder(h = depth * 0.4, d = head_d, $fn = 32);
}
```

## Magnets

### Common Neodymium Magnet Pockets

| Diameter | Thickness | Pocket Ø | Pocket Depth |
|----------|-----------|----------|--------------|
| 6mm | 2mm | 6.2mm | 2.3mm |
| 6mm | 3mm | 6.2mm | 3.3mm |
| 8mm | 2mm | 8.2mm | 2.3mm |
| 8mm | 3mm | 8.2mm | 3.3mm |
| 10mm | 2mm | 10.2mm | 2.3mm |
| 10mm | 3mm | 10.2mm | 3.3mm |
| 12mm | 3mm | 12.2mm | 3.3mm |

```openscad
module magnet_pocket(d, h) {
    cylinder(h = h + 0.3, d = d + 0.2, $fn = 32);
}

// Press-fit magnet (tighter tolerance)
module magnet_pocket_press(d, h) {
    cylinder(h = h + 0.2, d = d + 0.1, $fn = 32);
}
```

## Bearings

### Common Ball Bearing Pockets

| Bearing | OD | ID | Width | Pocket OD | Pocket Depth |
|---------|----|----|-------|-----------|--------------|
| 608 | 22mm | 8mm | 7mm | 22.1mm | 7.2mm |
| 625 | 16mm | 5mm | 5mm | 16.1mm | 5.2mm |
| 626 | 19mm | 6mm | 6mm | 19.1mm | 6.2mm |
| MR105 | 10mm | 5mm | 4mm | 10.1mm | 4.2mm |
| MR148 | 8mm | 4mm | 3mm | 8.1mm | 3.2mm |

```openscad
module bearing_pocket(od, width, press_fit = false) {
    tolerance = press_fit ? 0.0 : 0.1;
    cylinder(h = width + 0.2, d = od + tolerance, $fn = 64);
}
```
