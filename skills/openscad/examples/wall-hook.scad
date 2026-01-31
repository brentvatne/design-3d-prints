// ============================================
// PARAMETRIC WALL HOOK
// Sturdy hook for coats, bags, or towels
// ============================================

/* [Hook Dimensions] */
hook_width = 30;        // Width of hook
hook_depth = 40;        // How far hook extends from wall
hook_upturn = 15;       // Upturn height to retain items
hook_thickness = 6;     // Material thickness

/* [Back Plate] */
back_height = 60;       // Total height of back plate
corner_radius = 4;      // Rounding on edges

/* [Mounting] */
screw_size = 4;         // Screw size (M3, M4, M5, etc.)
screw_count = 2;        // Number of mounting screws
countersink = true;     // Use countersunk screws

/* [Hidden] */
$fn = $preview ? 24 : 48;
epsilon = 0.01;

// ============================================
// VALIDATION
// ============================================

assert(hook_thickness >= 4, "Hook thickness should be at least 4mm for strength");
assert(hook_depth >= 25, "Hook depth should be at least 25mm to retain items");
assert(back_height >= hook_depth + 20, "Back plate must be taller than hook depth");
assert(screw_count >= 1 && screw_count <= 4, "Screw count should be 1-4");

// ============================================
// CALCULATED VALUES
// ============================================

// Screw hole positions
screw_spacing = (back_height - 20) / max(screw_count - 1, 1);
screw_start = back_height * 0.15;

// Profile points for 2D hook shape
inner_corner_r = max(corner_radius - 1, 1);

// ============================================
// MODULES
// ============================================

module hook_2d_profile() {
    // Create 2D profile with rounded corners
    offset(r = corner_radius) offset(r = -corner_radius)
    polygon([
        // Back plate (bottom-left, going clockwise)
        [0, 0],
        [hook_thickness, 0],
        // Up the back
        [hook_thickness, back_height - hook_thickness],
        // Out to hook
        [hook_thickness + hook_depth - hook_upturn, back_height - hook_thickness],
        // Upturn
        [hook_thickness + hook_depth - hook_upturn, back_height],
        [hook_thickness + hook_depth, back_height],
        // Down the front of upturn
        [hook_thickness + hook_depth, back_height - hook_thickness - hook_upturn],
        // Back along bottom of hook
        [hook_thickness * 2, back_height - hook_thickness - hook_upturn],
        // Down inside of back plate
        [hook_thickness * 2, hook_thickness],
        // Along bottom inside
        [0, hook_thickness]
    ]);
}

module screw_hole(depth) {
    if (countersink) {
        // Countersunk hole
        cs_d = screw_size * 2 + 0.5;
        hole_d = screw_size + 0.4;
        cs_depth = (cs_d - hole_d) / 2;

        // Through hole
        cylinder(h = depth + epsilon, d = hole_d, $fn = 24);

        // Countersink
        cylinder(h = cs_depth + epsilon, d1 = cs_d, d2 = hole_d, $fn = 32);
    } else {
        // Clearance hole only
        cylinder(h = depth + epsilon, d = screw_size + 0.4, $fn = 24);
    }
}

module wall_hook() {
    difference() {
        // Main hook body
        linear_extrude(hook_width)
            hook_2d_profile();

        // Mounting holes
        for (i = [0 : screw_count - 1]) {
            hole_z = hook_width * (i + 1) / (screw_count + 1);
            hole_y = screw_start + (screw_count > 1 ? i * screw_spacing : back_height/2 - screw_start);

            translate([0, hole_y, hole_z])
                rotate([0, 90, 0])
                rotate([0, 0, 180])
                screw_hole(hook_thickness + epsilon);
        }
    }
}

// ============================================
// RENDER
// ============================================

color("DarkSlateGray")
wall_hook();

// ============================================
// INFO OUTPUT
// ============================================

echo(str("=== Wall Hook ==="));
echo(str("Size: ", hook_width, " × ", hook_depth, " × ", back_height, " mm"));
echo(str("Material thickness: ", hook_thickness, " mm"));
echo(str("Mounting: ", screw_count, " × M", screw_size, " screws"));
echo(str("Countersunk: ", countersink));
