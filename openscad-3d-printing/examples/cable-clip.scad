// ============================================
// PARAMETRIC CABLE CLIP
// Desktop cable management clips
// ============================================

/* [Cable Settings] */
cable_diameter = 6;     // Diameter of cable to hold
clip_count = 4;         // Number of clips in strip

/* [Clip Design] */
clip_style = "c";       // [c:C-Clip, loop:Full Loop, slot:Slot Entry]
opening_angle = 70;     // Opening angle for C-clip style (degrees)

/* [Base Settings] */
base_style = "flat";    // [flat:Flat Base, adhesive:Adhesive Pad, screw:Screw Mount]
spacing = 20;           // Distance between clip centers

/* [Advanced] */
wall = 2;               // Clip wall thickness
base_height = 3;        // Base platform height

/* [Hidden] */
$fn = $preview ? 24 : 48;
epsilon = 0.01;

// ============================================
// CALCULATED VALUES
// ============================================

clip_outer_d = cable_diameter + 2 * wall;
clip_height = clip_outer_d * 0.8;
base_width = clip_outer_d + 4;
base_depth = clip_outer_d + 2;
total_width = (clip_count - 1) * spacing + base_width;

// Cable hole is slightly larger for easy insertion
cable_hole_d = cable_diameter + 0.4;

// ============================================
// VALIDATION
// ============================================

assert(cable_diameter >= 2, "Cable diameter must be at least 2mm");
assert(wall >= 1.2, "Wall thickness must be at least 1.2mm");
assert(clip_count >= 1 && clip_count <= 10, "Clip count should be 1-10");
assert(opening_angle >= 45 && opening_angle <= 120, "Opening angle should be 45-120 degrees");

// ============================================
// MODULES
// ============================================

module clip_c_style() {
    difference() {
        // Outer cylinder
        cylinder(d = clip_outer_d, h = clip_height, $fn = 32);

        // Inner hole
        translate([0, 0, -epsilon])
            cylinder(d = cable_hole_d, h = clip_height + 2*epsilon, $fn = 32);

        // Opening wedge
        rotate([0, 0, 90 - opening_angle/2])
            translate([0, 0, -epsilon])
            linear_extrude(clip_height + 2*epsilon)
            polygon([
                [0, 0],
                [clip_outer_d, clip_outer_d * tan(opening_angle/2)],
                [clip_outer_d, -clip_outer_d * tan(opening_angle/2)]
            ]);
    }
}

module clip_loop_style() {
    difference() {
        // Outer cylinder
        cylinder(d = clip_outer_d, h = clip_height, $fn = 32);

        // Inner hole
        translate([0, 0, -epsilon])
            cylinder(d = cable_hole_d, h = clip_height + 2*epsilon, $fn = 32);
    }

    // Entry ramp (printed as bridge)
    entry_width = cable_hole_d * 0.8;
    translate([-entry_width/2, clip_outer_d/2 - wall, 0])
        cube([entry_width, wall + 2, clip_height]);
}

module clip_slot_style() {
    slot_width = cable_diameter * 0.7;

    difference() {
        // Outer cylinder
        cylinder(d = clip_outer_d, h = clip_height, $fn = 32);

        // Inner hole
        translate([0, 0, -epsilon])
            cylinder(d = cable_hole_d, h = clip_height + 2*epsilon, $fn = 32);

        // Vertical entry slot
        translate([-slot_width/2, 0, -epsilon])
            cube([slot_width, clip_outer_d, clip_height + 2*epsilon]);
    }

    // Flexible retention lips
    lip_thickness = 1.0;
    for (x = [-1, 1]) {
        translate([x * (slot_width/2 + lip_thickness/2), cable_hole_d/2 - 1, 0])
            cube([lip_thickness, 2, clip_height]);
    }
}

module single_clip() {
    // Base platform
    translate([-base_width/2, -base_depth/2, 0])
        cube([base_width, base_depth, base_height]);

    // Clip body
    translate([0, 0, base_height])
        if (clip_style == "c") {
            clip_c_style();
        } else if (clip_style == "loop") {
            clip_loop_style();
        } else if (clip_style == "slot") {
            clip_slot_style();
        }
}

module base_flat() {
    // Simple flat base connecting all clips
    translate([-base_width/2, -base_depth/2, 0])
        cube([total_width, base_depth, base_height]);
}

module base_adhesive() {
    // Thin base optimized for adhesive tape
    translate([-base_width/2, -base_depth/2, 0])
        cube([total_width, base_depth, 1.5]);

    // Raised platforms under clips
    for (i = [0 : clip_count - 1]) {
        translate([i * spacing - base_width/2 + 2, -base_depth/2 + 2, 0])
            cube([base_width - 4, base_depth - 4, base_height]);
    }
}

module base_screw() {
    difference() {
        // Thicker base for screw holes
        translate([-base_width/2, -base_depth/2, 0])
            cube([total_width, base_depth, base_height + 1]);

        // Countersunk screw holes at ends
        for (x = [base_width/2, total_width - base_width/2]) {
            translate([x - base_width/2, 0, -epsilon])
                cylinder(d = 3.4, h = base_height + 2, $fn = 24);
            translate([x - base_width/2, 0, base_height - 1])
                cylinder(d1 = 3.4, d2 = 7, h = 2 + epsilon, $fn = 24);
        }
    }
}

module cable_clip_strip() {
    difference() {
        union() {
            // Base
            if (base_style == "flat") {
                base_flat();
            } else if (base_style == "adhesive") {
                base_adhesive();
            } else if (base_style == "screw") {
                base_screw();
            }

            // Clips
            for (i = [0 : clip_count - 1]) {
                translate([i * spacing, 0, 0])
                    translate([0, 0, base_height])
                    if (clip_style == "c") {
                        clip_c_style();
                    } else if (clip_style == "loop") {
                        clip_loop_style();
                    } else if (clip_style == "slot") {
                        clip_slot_style();
                    }
            }
        }
    }
}

// ============================================
// RENDER
// ============================================

color("DimGray")
cable_clip_strip();

// ============================================
// INFO OUTPUT
// ============================================

echo(str("=== Cable Clip Strip ==="));
echo(str("Cable diameter: ", cable_diameter, " mm"));
echo(str("Clip style: ", clip_style));
echo(str("Clips: ", clip_count, " at ", spacing, "mm spacing"));
echo(str("Total length: ", total_width, " mm"));
echo(str("Base style: ", base_style));
