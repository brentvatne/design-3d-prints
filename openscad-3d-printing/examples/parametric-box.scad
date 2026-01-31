// ============================================
// PARAMETRIC BOX WITH LID
// A complete example demonstrating best practices
// ============================================

/* [Box Dimensions] */
inner_width = 60;       // Inner width in mm
inner_depth = 40;       // Inner depth in mm
inner_height = 30;      // Inner height in mm

/* [Structure] */
wall_thickness = 2.4;   // Wall thickness (multiple of 0.4mm nozzle)
base_thickness = 1.6;   // Base thickness (multiple of 0.2mm layer)
corner_radius = 3;      // Corner rounding radius

/* [Lid Options] */
lid_style = "friction"; // [friction, snap, screw]
lid_clearance = 0.3;    // Gap between lid and box
lid_overlap = 5;        // How far lid lip extends into box

/* [Features] */
include_divider = false; // Add internal divider
divider_position = 0.5;  // Divider position (0-1)

/* [Hidden] */
$fn = $preview ? 24 : 48;
epsilon = 0.01;

// ============================================
// DERIVED DIMENSIONS
// ============================================

outer_width = inner_width + 2 * wall_thickness;
outer_depth = inner_depth + 2 * wall_thickness;
outer_height = inner_height + base_thickness;

lip_width = inner_width - 2 * lid_clearance;
lip_depth = inner_depth - 2 * lid_clearance;

// ============================================
// VALIDATION
// ============================================

assert(wall_thickness >= 1.2, "Wall thickness must be at least 1.2mm");
assert(base_thickness >= 0.8, "Base thickness must be at least 0.8mm");
assert(corner_radius < min(inner_width, inner_depth) / 2,
       "Corner radius too large for box dimensions");
assert(lid_overlap < inner_height / 2,
       "Lid overlap cannot exceed half the inner height");

// ============================================
// MODULES
// ============================================

module rounded_box(size, r) {
    hull() {
        for (x = [r, size[0] - r])
        for (y = [r, size[1] - r])
            translate([x, y, 0])
            cylinder(r = r, h = size[2]);
    }
}

module box_base() {
    inner_r = max(corner_radius - wall_thickness, 0.5);

    difference() {
        // Outer shell
        rounded_box([outer_width, outer_depth, outer_height], corner_radius);

        // Inner cavity
        translate([wall_thickness, wall_thickness, base_thickness])
            rounded_box([inner_width, inner_depth, inner_height + epsilon],
                       inner_r);
    }

    // Optional divider
    if (include_divider) {
        translate([wall_thickness + inner_width * divider_position - wall_thickness/2,
                  wall_thickness,
                  base_thickness])
            cube([wall_thickness, inner_depth, inner_height * 0.8]);
    }
}

module lid_friction() {
    lip_r = max(corner_radius - wall_thickness - lid_clearance, 0.5);

    // Top plate
    rounded_box([outer_width, outer_depth, wall_thickness], corner_radius);

    // Inner lip (hollow for weight reduction)
    translate([wall_thickness + lid_clearance,
               wall_thickness + lid_clearance,
               -lid_overlap + wall_thickness])
        difference() {
            rounded_box([lip_width, lip_depth, lid_overlap], lip_r);
            translate([wall_thickness, wall_thickness, -epsilon])
                rounded_box([lip_width - 2*wall_thickness,
                            lip_depth - 2*wall_thickness,
                            lid_overlap + epsilon], max(lip_r - wall_thickness, 0.5));
        }
}

module lid_snap() {
    snap_depth = 1.0;
    snap_height = 3.0;
    tab_width = 15;

    lid_friction();  // Base lid shape

    // Snap tabs on sides
    for (y = [outer_depth * 0.3, outer_depth * 0.7]) {
        // Left side
        translate([wall_thickness + lid_clearance - snap_depth,
                  y - tab_width/2,
                  -lid_overlap + wall_thickness])
            snap_tab(tab_width, snap_depth, snap_height);

        // Right side
        translate([outer_width - wall_thickness - lid_clearance,
                  y - tab_width/2,
                  -lid_overlap + wall_thickness])
            mirror([1, 0, 0]) snap_tab(tab_width, snap_depth, snap_height);
    }
}

module snap_tab(width, depth, height) {
    hull() {
        cube([depth, width, height * 0.3]);
        translate([0, 0, height * 0.5])
            cube([depth * 1.5, width, height * 0.3]);
    }
}

module lid_screw() {
    screw_inset = 8;

    difference() {
        lid_friction();

        // Countersunk screw holes
        for (x = [screw_inset, outer_width - screw_inset])
        for (y = [screw_inset, outer_depth - screw_inset]) {
            translate([x, y, -epsilon])
                countersink(3, wall_thickness + 2*epsilon);
        }
    }
}

// Countersink module
module countersink(screw_size, through_depth) {
    cs_d = screw_size * 2 + 0.5;
    hole_d = screw_size + 0.4;
    cs_depth = (cs_d - hole_d) / 2;

    cylinder(h = through_depth, d = hole_d, $fn = 24);
    translate([0, 0, through_depth - cs_depth - epsilon])
        cylinder(h = cs_depth + epsilon, d1 = hole_d, d2 = cs_d, $fn = 32);
}

// ============================================
// RENDER
// ============================================

// Box base
color("SteelBlue") box_base();

// Lid (offset for visualization)
translate([0, outer_depth + 10, lid_overlap]) {
    color("LightSteelBlue")
    if (lid_style == "friction") {
        lid_friction();
    } else if (lid_style == "snap") {
        lid_snap();
    } else if (lid_style == "screw") {
        lid_screw();
    }
}

// ============================================
// INFO OUTPUT
// ============================================

echo(str("=== Box Dimensions ==="));
echo(str("Outer: ", outer_width, " × ", outer_depth, " × ", outer_height, " mm"));
echo(str("Inner: ", inner_width, " × ", inner_depth, " × ", inner_height, " mm"));
echo(str("Wall: ", wall_thickness, " mm, Base: ", base_thickness, " mm"));
echo(str("Lid style: ", lid_style));
