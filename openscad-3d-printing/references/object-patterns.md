# Common Object Patterns for Functional 3D Prints

## 1. Box with Lid

### Friction Fit Lid
```openscad
// Parameters
inner_w = 60;
inner_d = 40;
inner_h = 30;
wall = 2.4;
lid_overlap = 5;
lid_clearance = 0.3;

// Calculated
outer_w = inner_w + 2 * wall;
outer_d = inner_d + 2 * wall;

module box_base() {
    difference() {
        cube([outer_w, outer_d, inner_h + wall]);
        translate([wall, wall, wall])
            cube([inner_w, inner_d, inner_h + 1]);
    }
}

module box_lid() {
    lip_w = inner_w - 2 * lid_clearance;
    lip_d = inner_d - 2 * lid_clearance;

    // Top plate
    cube([outer_w, outer_d, wall]);

    // Inner lip
    translate([wall + lid_clearance, wall + lid_clearance, -lid_overlap + wall])
        difference() {
            cube([lip_w, lip_d, lid_overlap]);
            translate([wall, wall, -0.1])
                cube([lip_w - 2*wall, lip_d - 2*wall, lid_overlap + 1]);
        }
}

box_base();
translate([outer_w + 10, 0, 0]) box_lid();
```

### Snap Fit Lid
```openscad
snap_depth = 1.0;      // How far snap engages
snap_height = 2.0;     // Height of snap feature
snap_clearance = 0.2;

module snap_tab(width = 10) {
    // Flexible tab with catch
    translate([0, 0, 0])
    difference() {
        cube([width, wall + snap_depth, snap_height]);
        // Angled lead-in
        translate([-0.1, wall, snap_height * 0.6])
            rotate([45, 0, 0])
            cube([width + 0.2, snap_depth * 2, snap_depth * 2]);
    }
}

module snap_catch(width = 10) {
    // Recess for snap tab
    cube([width + 0.4, wall + snap_depth + snap_clearance, snap_height + 0.2]);
}
```

### Living Hinge Box (PP/PE only)
```openscad
hinge_thickness = 0.4;  // Very thin for flexibility
hinge_length = 2.0;
hinge_segments = 5;

module living_hinge(width) {
    segment_w = width / hinge_segments;

    for (i = [0 : hinge_segments - 1]) {
        translate([i * segment_w, 0, 0])
            cube([segment_w - 0.5, hinge_length, hinge_thickness]);
    }
}
```

## 2. Wall Hook

### Simple Wall Hook
```openscad
hook_width = 25;
hook_thickness = 5;
back_height = 50;
hook_depth = 35;
hook_upturn = 12;
corner_r = 3;

module hook_2d_profile() {
    offset(r = corner_r) offset(r = -corner_r)
    polygon([
        [0, 0],
        [hook_thickness, 0],
        [hook_thickness, back_height],
        [hook_thickness + hook_depth, back_height],
        [hook_thickness + hook_depth, back_height - hook_thickness + hook_upturn],
        [hook_thickness * 2, back_height - hook_thickness],
        [hook_thickness * 2, hook_thickness],
        [0, hook_thickness]
    ]);
}

module wall_hook() {
    difference() {
        linear_extrude(hook_width) hook_2d_profile();

        // Mounting holes
        for (z = [hook_width * 0.25, hook_width * 0.75]) {
            translate([hook_thickness/2, back_height * 0.3, z])
                rotate([0, 90, 0])
                counterbore(4, hook_thickness + 1, 3);
        }
    }
}

wall_hook();
```

### Coat Hook with Rounded Profile
```openscad
hook_diameter = 12;
hook_length = 40;
hook_angle = 30;  // Upward angle
mount_width = 30;
mount_height = 60;
mount_thickness = 6;

module coat_hook() {
    // Mounting plate
    difference() {
        hull() {
            cube([mount_width, mount_thickness, 5]);
            translate([0, 0, mount_height - 5])
                cube([mount_width, mount_thickness, 5]);
        }

        // Mounting holes
        for (z = [15, mount_height - 15]) {
            translate([mount_width/2, -0.1, z])
                rotate([-90, 0, 0])
                counterbore(4, mount_thickness + 1, 4);
        }
    }

    // Hook arm
    translate([mount_width/2, mount_thickness, mount_height * 0.6])
        rotate([-90 + hook_angle, 0, 0])
        cylinder(d = hook_diameter, h = hook_length, $fn = 32);

    // End ball
    translate([mount_width/2,
               mount_thickness + (hook_length - 5) * cos(hook_angle),
               mount_height * 0.6 + (hook_length - 5) * sin(hook_angle)])
        sphere(d = hook_diameter * 1.3, $fn = 32);
}

coat_hook();
```

## 3. Bracket / Mount

### L-Bracket with Gusset
```openscad
bracket_width = 40;
arm_a = 50;       // Vertical arm
arm_b = 60;       // Horizontal arm
thickness = 4;
gusset_size = 20;

module l_bracket() {
    difference() {
        union() {
            // Vertical arm
            cube([bracket_width, thickness, arm_a]);

            // Horizontal arm
            cube([bracket_width, arm_b, thickness]);

            // Gusset
            translate([0, thickness, thickness])
                rotate([90, 0, 90])
                linear_extrude(bracket_width)
                polygon([
                    [0, 0],
                    [gusset_size, 0],
                    [0, gusset_size]
                ]);
        }

        // Mounting holes - vertical
        for (x = [bracket_width * 0.25, bracket_width * 0.75]) {
            translate([x, -0.1, arm_a * 0.3])
                rotate([-90, 0, 0]) clearance_hole(4, thickness + 1);
            translate([x, -0.1, arm_a * 0.7])
                rotate([-90, 0, 0]) clearance_hole(4, thickness + 1);
        }

        // Mounting holes - horizontal
        for (x = [bracket_width * 0.25, bracket_width * 0.75]) {
            translate([x, arm_b * 0.4, -0.1])
                clearance_hole(4, thickness + 1);
            translate([x, arm_b * 0.75, -0.1])
                clearance_hole(4, thickness + 1);
        }
    }
}

l_bracket();
```

### Shelf Bracket with Slots
```openscad
shelf_depth = 150;
bracket_height = 120;
thickness = 6;
slot_length = 15;  // For adjustment

module shelf_bracket() {
    difference() {
        union() {
            // Back plate
            cube([40, thickness, bracket_height]);

            // Shelf support
            cube([40, shelf_depth, thickness]);

            // Diagonal brace
            translate([0, thickness, thickness])
                rotate([90, 0, 90])
                linear_extrude(40)
                polygon([
                    [0, 0],
                    [shelf_depth - 20, 0],
                    [0, bracket_height - 20]
                ]);
        }

        // Vertical adjustment slots
        for (z = [25, bracket_height - 25]) {
            translate([20, -0.1, z])
                rotate([-90, 0, 0])
                hull() {
                    cylinder(d = 5, h = thickness + 1, $fn = 24);
                    translate([0, slot_length, 0])
                        cylinder(d = 5, h = thickness + 1, $fn = 24);
                }
        }
    }
}

shelf_bracket();
```

## 4. Phone/Tablet Stand

### Adjustable Angle Stand
```openscad
device_width = 80;      // Accommodate phone width
lip_height = 12;
lip_depth = 20;
back_height = 100;
stand_angle = 70;       // From horizontal
base_depth = 80;
wall = 4;
cable_slot_w = 25;

module phone_stand() {
    difference() {
        union() {
            // Base
            cube([device_width + 2*wall, base_depth, wall]);

            // Front lip
            cube([device_width + 2*wall, lip_depth, lip_height]);

            // Back support
            translate([0, base_depth - wall, 0])
                rotate([90 - stand_angle, 0, 0])
                cube([device_width + 2*wall, wall, back_height]);

            // Side supports
            for (x = [0, device_width + wall]) {
                translate([x, lip_depth, 0])
                    cube([wall, base_depth - lip_depth, wall * 2]);
            }
        }

        // Device slot
        translate([wall, wall, wall])
            cube([device_width, lip_depth, lip_height]);

        // Cable slot
        translate([(device_width + 2*wall - cable_slot_w)/2, -0.1, -0.1])
            cube([cable_slot_w, lip_depth + 1, wall + lip_height + 1]);
    }
}

phone_stand();
```

### Minimal Stand (Wedge)
```openscad
width = 70;
depth = 50;
front_height = 8;
back_height = 40;
lip = 10;

module minimal_stand() {
    difference() {
        // Wedge body
        hull() {
            cube([width, depth, front_height]);
            translate([0, depth - 5, 0])
                cube([width, 5, back_height]);
        }

        // Device slot
        translate([5, -0.1, front_height])
            rotate([-5, 0, 0])
            cube([width - 10, lip + 5, back_height]);
    }
}

minimal_stand();
```

## 5. Cable Organizer

### Desktop Cable Clips
```openscad
cable_d = 6;
clip_count = 4;
spacing = 20;
base_w = 15;
base_d = 10;
base_h = 3;

module single_clip() {
    // Base
    cube([base_w, base_d, base_h]);

    // Clip body
    translate([base_w/2, base_d/2, base_h])
    difference() {
        cylinder(d = cable_d + 4, h = cable_d, $fn = 32);
        translate([0, 0, -0.1])
            cylinder(d = cable_d + 0.5, h = cable_d + 1, $fn = 32);

        // Entry slot
        translate([0, 0, cable_d * 0.3])
            rotate([0, 0, 90])
            linear_extrude(cable_d + 1)
            polygon([
                [0, 0],
                [(cable_d + 4) * 0.7, (cable_d + 4) * 0.4],
                [(cable_d + 4) * 0.7, -(cable_d + 4) * 0.4]
            ]);
    }
}

module cable_clip_strip() {
    for (i = [0 : clip_count - 1]) {
        translate([i * spacing, 0, 0])
            single_clip();
    }

    // Connecting base
    cube([clip_count * spacing - spacing + base_w, base_d, base_h]);
}

cable_clip_strip();
```

### Under-Desk Cable Tray
```openscad
tray_length = 300;
tray_width = 80;
tray_height = 40;
wall = 2;
mount_spacing = 250;

module cable_tray() {
    difference() {
        // Outer shell
        cube([tray_length, tray_width, tray_height]);

        // Inner cavity
        translate([wall, wall, wall])
            cube([tray_length - 2*wall, tray_width, tray_height]);

        // Cable entry slots (sides)
        for (x = [50, 150, 250]) {
            translate([x, -0.1, wall])
                cube([30, wall + 1, tray_height - wall]);
        }
    }

    // Mounting tabs
    for (x = [(tray_length - mount_spacing)/2,
              (tray_length + mount_spacing)/2]) {
        translate([x - 15, tray_width, 0])
        difference() {
            cube([30, 20, wall]);
            translate([15, 10, -0.1])
                clearance_hole(4, wall + 1);
        }
    }
}

cable_tray();
```

## 6. Drawer Organizer

### Modular Grid System
```openscad
cell_size = 50;       // Base unit size
grid_cols = 4;
grid_rows = 3;
height = 40;
wall = 1.6;

module divider_grid() {
    total_w = grid_cols * cell_size + wall;
    total_d = grid_rows * cell_size + wall;

    difference() {
        cube([total_w, total_d, height]);

        for (c = [0 : grid_cols - 1]) {
            for (r = [0 : grid_rows - 1]) {
                translate([wall + c * cell_size,
                          wall + r * cell_size,
                          wall])
                    cube([cell_size - wall, cell_size - wall, height]);
            }
        }
    }
}

divider_grid();
```

### Customizable Compartments
```openscad
// Define compartment layout as [width_units, depth_units]
compartments = [
    [[2, 1], [1, 1], [1, 1]],  // Row 1
    [[1, 2], [3, 2]],          // Row 2-3
];

unit = 30;
height = 35;
wall = 1.6;

module custom_organizer() {
    // Implementation would iterate through compartments array
    // and create appropriately sized cells

    // Simplified example:
    difference() {
        cube([4 * unit + wall, 3 * unit + wall, height]);

        // Large compartment
        translate([wall, wall, wall])
            cube([2 * unit - wall, 3 * unit - wall, height]);

        // Medium compartments
        translate([2 * unit + wall, wall, wall])
            cube([2 * unit - wall, 1 * unit - wall, height]);
        translate([2 * unit + wall, unit + wall, wall])
            cube([2 * unit - wall, 2 * unit - wall, height]);
    }
}

custom_organizer();
```

## 7. Tool Holder

### Pegboard Tool Holder
```openscad
peg_diameter = 6.35;  // 1/4 inch
peg_spacing = 25.4;   // 1 inch
peg_length = 20;

hook_width = 50;
hook_depth = 40;
plate_thickness = 4;

module pegboard_mount() {
    // Back plate
    cube([hook_width, plate_thickness, 30]);

    // Pegs (2x1 pattern)
    for (x = [hook_width/2 - peg_spacing/2, hook_width/2 + peg_spacing/2]) {
        translate([x, -peg_length, 15])
            rotate([-90, 0, 0])
            cylinder(d = peg_diameter - 0.3, h = peg_length, $fn = 24);
    }
}

module tool_hook() {
    pegboard_mount();

    // Hook arm
    translate([0, plate_thickness, 0])
        cube([hook_width, hook_depth, plate_thickness]);

    // Upturn
    translate([0, plate_thickness + hook_depth - plate_thickness, 0])
        cube([hook_width, plate_thickness, 15]);
}

tool_hook();
```

### Screwdriver Holder
```openscad
hole_count = 6;
hole_diameters = [8, 8, 10, 10, 12, 12];  // Various sizes
spacing = 25;
block_depth = 30;
block_height = 40;
tilt_angle = 15;

module screwdriver_holder() {
    total_width = (hole_count - 1) * spacing + 30;

    difference() {
        // Main block (tilted)
        rotate([tilt_angle, 0, 0])
            translate([0, 0, -5])
            cube([total_width, block_depth, block_height + 5]);

        // Angled holes
        for (i = [0 : hole_count - 1]) {
            translate([15 + i * spacing, block_depth/2, -1])
                cylinder(d = hole_diameters[i], h = block_height + 10, $fn = 24);
        }

        // Flatten bottom
        translate([-1, -50, -50])
            cube([total_width + 2, 100, 50]);
    }
}

screwdriver_holder();
```

## 8. Functional Enclosure

### Electronics Project Box
```openscad
// PCB dimensions
pcb_w = 70;
pcb_d = 50;
pcb_h = 1.6;
component_h = 20;

// Enclosure
wall = 2.4;
standoff_h = 5;
standoff_d = 6;
lid_lip = 4;

inner_w = pcb_w + 4;
inner_d = pcb_d + 4;
inner_h = standoff_h + pcb_h + component_h + 3;
outer_w = inner_w + 2 * wall;
outer_d = inner_d + 2 * wall;

module enclosure_base() {
    difference() {
        // Outer shell
        rounded_box([outer_w, outer_d, inner_h + wall], 3);

        // Inner cavity
        translate([wall, wall, wall])
            rounded_box([inner_w, inner_d, inner_h + 1], 1);
    }

    // PCB standoffs
    pcb_offset = 2;  // From inner wall
    for (x = [wall + pcb_offset + 3, wall + pcb_offset + pcb_w - 3])
    for (y = [wall + pcb_offset + 3, wall + pcb_offset + pcb_d - 3]) {
        translate([x, y, wall])
        difference() {
            cylinder(d = standoff_d, h = standoff_h, $fn = 24);
            translate([0, 0, -0.1])
                cylinder(d = 2.5, h = standoff_h + 1, $fn = 24);
        }
    }
}

module enclosure_lid() {
    lip_clearance = 0.25;
    lip_w = inner_w - 2 * lip_clearance;
    lip_d = inner_d - 2 * lip_clearance;

    // Top plate
    rounded_box([outer_w, outer_d, wall], 3);

    // Inner lip
    translate([wall + lip_clearance, wall + lip_clearance, -lid_lip + wall])
        difference() {
            cube([lip_w, lip_d, lid_lip]);
            translate([wall, wall, -0.1])
                cube([lip_w - 2*wall, lip_d - 2*wall, lid_lip + 1]);
        }
}

enclosure_base();
translate([0, outer_d + 10, lid_lip]) enclosure_lid();
```

## Utility Modules

### Common rounded_box module used throughout
```openscad
module rounded_box(size, r, center = false) {
    translate(center ? [-size[0]/2, -size[1]/2, 0] : [0, 0, 0])
    hull() {
        for (x = [r, size[0] - r])
        for (y = [r, size[1] - r])
            translate([x, y, 0])
            cylinder(r = r, h = size[2], $fn = 32);
    }
}
```

### Chamfered base for better adhesion
```openscad
module chamfered_cube(size, chamfer = 0.5) {
    hull() {
        translate([chamfer, chamfer, 0])
            cube([size[0] - 2*chamfer, size[1] - 2*chamfer, 0.01]);
        translate([0, 0, chamfer])
            cube(size - [0, 0, chamfer]);
    }
}
```

### Anti-warp slots for large flat surfaces
```openscad
module warp_relief_slots(length, width, slot_spacing = 50) {
    slot_count = floor(width / slot_spacing);

    for (i = [1 : slot_count - 1]) {
        translate([5, i * slot_spacing, -0.1])
            cube([length - 10, 1, 1]);
    }
}
```
