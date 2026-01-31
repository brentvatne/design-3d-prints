# Advanced OpenSCAD Techniques

This reference covers techniques beyond basic CSG operations, filling gaps in the core skill.

## 1. Bezier Curves and Smooth Profiles

### When to Use
- Ergonomic grips and handles
- Smooth transitions between sections
- Organic shapes for enclosures
- Cable management channels with smooth bends

### Bezier Functions

```openscad
// Quadratic Bezier curve (3 control points)
function bezier_quadratic(t, p0, p1, p2) =
    pow(1-t, 2) * p0 +
    2 * (1-t) * t * p1 +
    pow(t, 2) * p2;

// Cubic Bezier curve (4 control points)
function bezier_cubic(t, p0, p1, p2, p3) =
    pow(1-t, 3) * p0 +
    3 * pow(1-t, 2) * t * p1 +
    3 * (1-t) * pow(t, 2) * p2 +
    pow(t, 3) * p3;

// Generate points along a cubic bezier curve
function bezier_points(p0, p1, p2, p3, steps=20) = [
    for (i = [0:steps])
        bezier_cubic(i/steps, p0, p1, p2, p3)
];

// 3D bezier point
function bezier3d(t, p0, p1, p2, p3) = [
    bezier_cubic(t, p0[0], p1[0], p2[0], p3[0]),
    bezier_cubic(t, p0[1], p1[1], p2[1], p3[1]),
    bezier_cubic(t, p0[2], p1[2], p2[2], p3[2])
];
```

### Practical Examples

```openscad
// Ergonomic grip profile
module ergonomic_grip(length=80) {
    p0 = [0, 0];
    p1 = [10, 30];   // Control point - pulls curve up
    p2 = [40, 30];   // Control point - maintains height
    p3 = [50, 0];

    points = bezier_points(p0, p1, p2, p3, steps=30);

    linear_extrude(height=length)
        polygon(concat(points, [[50, -5], [0, -5]]));
}

// Smooth fillet using bezier (quarter circle approximation)
module bezier_fillet(r, length, steps=10) {
    // Bezier approximation of quarter circle
    k = 0.5522847498;  // Magic number for circle approximation
    p0 = [0, r];
    p1 = [r * k, r];
    p2 = [r, r * k];
    p3 = [r, 0];

    points = [for (i = [0:steps])
        let(t = i/steps)
        bezier_cubic(t, p0, p1, p2, p3)
    ];

    linear_extrude(length)
        polygon(concat([[0, 0]], points));
}

// S-curve transition between two heights
module s_curve_transition(width, length, h1, h2, steps=20) {
    points = [
        for (i = [0:steps])
            let(
                t = i/steps,
                y = length * t,
                // S-curve: smooth transition using bezier
                z = bezier_cubic(t, h1, h1, h2, h2)
            )
            [y, z]
    ];

    rotate([90, 0, 90])
    linear_extrude(width)
        polygon(concat([[0, 0]], points, [[length, 0]]));
}
```

---

## 2. Lofting Between Cross-Sections

### When to Use
- Transitioning from rectangular to circular (adapters)
- Aerodynamic or ergonomic shapes
- Ventilation ducts with changing cross-sections
- Custom funnels

### Loft Module

```openscad
// Loft between two 2D profiles
// IMPORTANT: Both profiles must have the same number of points
module loft_profiles(profile1, profile2, height, slices=20) {
    assert(len(profile1) == len(profile2),
           "Profiles must have same point count");

    n = len(profile1);

    // Generate interpolated points for all layers
    points = [
        for (z = [0:slices])
            for (i = [0:n-1])
                let(t = z/slices)
                [
                    profile1[i][0] * (1-t) + profile2[i][0] * t,
                    profile1[i][1] * (1-t) + profile2[i][1] * t,
                    height * t
                ]
    ];

    // Generate faces
    faces = concat(
        // Bottom face
        [[for (i = [0:n-1]) i]],
        // Top face (reversed winding)
        [[for (i = [n-1:-1:0]) slices*n + i]],
        // Side faces
        [for (z = [0:slices-1])
            for (i = [0:n-1])
                let(
                    bl = z*n + i,
                    br = z*n + (i+1)%n,
                    tl = (z+1)*n + i,
                    tr = (z+1)*n + (i+1)%n
                )
                each [[bl, br, tr, tl]]
        ]
    );

    polyhedron(points=points, faces=faces, convexity=10);
}
```

### Practical Examples

```openscad
// Square to circle adapter
module square_to_circle(square_size, circle_d, height, n=32) {
    s = square_size / 2;

    // Square with n points (distributed evenly around perimeter)
    square_profile = [
        for (i = [0:n-1])
            let(
                side = floor(i / (n/4)),
                t = (i % (n/4)) / (n/4)
            )
            side == 0 ? [-s + 2*s*t, -s] :
            side == 1 ? [s, -s + 2*s*t] :
            side == 2 ? [s - 2*s*t, s] :
                        [-s, s - 2*s*t]
    ];

    // Circle with n points
    circle_profile = [
        for (i = [0:n-1])
            let(a = i * 360/n)
            [circle_d/2 * cos(a), circle_d/2 * sin(a)]
    ];

    loft_profiles(square_profile, circle_profile, height, slices=20);
}

// Tapered rectangular duct
module tapered_duct(w1, d1, w2, d2, height, n=40) {
    // Rectangle 1
    rect1 = [
        for (i = [0:n-1])
            let(
                side = floor(i / (n/4)),
                t = (i % (n/4)) / (n/4)
            )
            side == 0 ? [-w1/2 + w1*t, -d1/2] :
            side == 1 ? [w1/2, -d1/2 + d1*t] :
            side == 2 ? [w1/2 - w1*t, d1/2] :
                        [-w1/2, d1/2 - d1*t]
    ];

    // Rectangle 2
    rect2 = [
        for (i = [0:n-1])
            let(
                side = floor(i / (n/4)),
                t = (i % (n/4)) / (n/4)
            )
            side == 0 ? [-w2/2 + w2*t, -d2/2] :
            side == 1 ? [w2/2, -d2/2 + d2*t] :
            side == 2 ? [w2/2 - w2*t, d2/2] :
                        [-w2/2, d2/2 - d2*t]
    ];

    loft_profiles(rect1, rect2, height);
}
```

---

## 3. Threads (Screws, Nuts, Bottles)

### When to Use
- Custom screw threads for tight-tolerance fits
- Bottle caps and container lids
- Adjustment mechanisms (leveling feet, focus rings)
- Lead screws for linear motion

### ISO Metric Thread Generator

```openscad
// ISO metric thread parameters
// Thread pitch (mm) for standard coarse threads
function iso_pitch(d) =
    d == 2 ? 0.4 :
    d == 2.5 ? 0.45 :
    d == 3 ? 0.5 :
    d == 4 ? 0.7 :
    d == 5 ? 0.8 :
    d == 6 ? 1.0 :
    d == 8 ? 1.25 :
    d == 10 ? 1.5 :
    d == 12 ? 1.75 :
    d == 16 ? 2.0 :
    d == 20 ? 2.5 : 1.0;

// Generate metric thread
module metric_thread(
    d,                  // Nominal diameter (e.g., 8 for M8)
    length,             // Thread length
    pitch = 0,          // 0 = use standard pitch
    internal = false,   // true for nuts/holes
    clearance = 0.15    // Extra clearance for internal threads
) {
    p = pitch > 0 ? pitch : iso_pitch(d);

    // ISO 60-degree thread geometry
    H = p * sqrt(3) / 2;          // Theoretical thread height
    d_maj = d;                     // Major diameter
    d_min = d - 1.0825 * p;       // Minor diameter (ISO formula)

    // Adjust for internal threads
    d_major = internal ? d_maj + clearance * 2 : d_maj;
    d_minor = internal ? d_min + clearance * 2 : d_min;

    turns = ceil(length / p);
    segments = 32;

    // Thread profile points (60-degree, truncated per ISO)
    function thread_point(angle, z_base, r_base) =
        let(
            z = z_base + (angle / 360) * p,
            // Sinusoidal approximation of thread profile
            r_offset = (H/2 * 0.625) * cos(angle * segments)
        )
        [cos(angle) * (r_base + r_offset),
         sin(angle) * (r_base + r_offset),
         z];

    // Build thread using hull of segments
    r_mid = (d_major + d_minor) / 4;

    union() {
        // Core cylinder
        cylinder(d = d_minor, h = length, $fn = segments);

        // Helical thread
        for (turn = [0:turns-1]) {
            for (seg = [0:segments-1]) {
                a1 = seg * 360 / segments;
                a2 = (seg + 1) * 360 / segments;
                z1 = turn * p + (seg / segments) * p;
                z2 = turn * p + ((seg + 1) / segments) * p;

                if (z2 <= length + p) {
                    hull() {
                        translate([0, 0, z1])
                        rotate([0, 0, a1])
                        translate([d_minor/2, 0, 0])
                            cylinder(d = H * 0.6, h = 0.01, $fn = 4);

                        translate([0, 0, z2])
                        rotate([0, 0, a2])
                        translate([d_minor/2, 0, 0])
                            cylinder(d = H * 0.6, h = 0.01, $fn = 4);
                    }
                }
            }
        }
    }

    // Trim to exact length
    difference() {
        children();
        translate([0, 0, -p]) cylinder(d = d * 2, h = p);
        translate([0, 0, length]) cylinder(d = d * 2, h = p);
    }
}

// Simplified thread for faster preview (cosmetic only)
module cosmetic_thread(d, length, pitch=0) {
    p = pitch > 0 ? pitch : iso_pitch(d);

    difference() {
        cylinder(d = d, h = length, $fn = 32);

        // Helical groove (visual only)
        for (i = [0:length/p]) {
            translate([0, 0, i * p])
            linear_extrude(height = p, twist = 360, slices = 16)
            translate([d/2 - p/4, 0])
                circle(d = p/2, $fn = 8);
        }
    }
}
```

### Bottle Thread (Trapezoidal)

```openscad
// Bottle cap thread (trapezoidal profile, multi-start)
module bottle_thread(
    d,              // Outer diameter
    length,         // Thread length
    pitch = 3,      // Thread pitch
    starts = 2,     // Number of thread starts
    internal = false
) {
    clearance = internal ? 0.3 : 0;
    thread_depth = 1.5;

    d_outer = d + (internal ? clearance : 0);
    d_inner = d - thread_depth * 2;

    segments = 48;
    turns = length / pitch;

    union() {
        // Core
        cylinder(d = d_inner, h = length, $fn = segments);

        // Multi-start threads
        for (start = [0:starts-1]) {
            start_angle = start * 360 / starts;

            for (turn = [0:turns]) {
                for (seg = [0:segments-1]) {
                    a1 = start_angle + seg * 360 / segments;
                    a2 = start_angle + (seg + 1) * 360 / segments;
                    z1 = turn * pitch + (seg / segments) * pitch;
                    z2 = turn * pitch + ((seg + 1) / segments) * pitch;

                    if (z1 < length && z2 <= length + pitch/2) {
                        hull() {
                            rotate([0, 0, a1])
                            translate([d_inner/2, 0, min(z1, length)])
                                cube([thread_depth, 1, 0.01]);

                            rotate([0, 0, a2])
                            translate([d_inner/2, 0, min(z2, length)])
                                cube([thread_depth, 1, 0.01]);
                        }
                    }
                }
            }
        }
    }
}
```

---

## 4. Living Hinges

### When to Use
- Single-print enclosures with flip lids
- Flexible joints without hardware
- Snap-fit closures
- Print-in-place mechanisms

### Material Requirements
- **Best:** TPU, PP, PE (flexible materials)
- **Acceptable:** Thin PLA (0.3-0.4mm), PETG
- **Avoid:** ABS (too brittle)

### Living Hinge Patterns

```openscad
// Basic living hinge (alternating cuts)
module living_hinge_basic(
    width,              // Hinge width
    length,             // Hinge length (bend direction)
    thickness = 0.4,    // Web thickness (1-2 layers)
    cuts = 10,          // Number of cut pairs
    cut_width = 1.5,    // Width of each cut
    cut_depth = 0.7     // How far cuts extend (0-1, fraction of width)
) {
    cut_spacing = length / (cuts + 1);

    difference() {
        cube([width, length, thickness]);

        // Alternating cuts from each side
        for (i = [0:cuts-1]) {
            y_pos = cut_spacing * (i + 1);

            if (i % 2 == 0) {
                // Cut from left
                translate([-epsilon, y_pos - cut_width/2, -epsilon])
                    cube([width * cut_depth, cut_width, thickness + 2*epsilon]);
            } else {
                // Cut from right (with offset for better flex)
                translate([width * (1 - cut_depth), y_pos - cut_width/2, -epsilon])
                    cube([width * cut_depth + epsilon, cut_width, thickness + 2*epsilon]);
            }
        }
    }
}

// Serpentine living hinge (more flexible, longer fatigue life)
module living_hinge_serpentine(
    width,
    length,
    thickness = 0.8,
    amplitude = 3,      // Wave amplitude
    periods = 5,        // Number of waves
    path_width = 2      // Width of serpentine path
) {
    steps = periods * 20;

    // Generate serpentine center line
    points = [
        for (i = [0:steps])
            let(
                y = i * length / steps,
                x = width/2 + amplitude * sin(i * 360 / 20)
            )
            [x, y]
    ];

    // Create path with width
    linear_extrude(thickness)
    union() {
        for (i = [0:steps-1]) {
            hull() {
                translate(points[i]) circle(d = path_width, $fn = 16);
                translate(points[i+1]) circle(d = path_width, $fn = 16);
            }
        }
    }
}

// Lattice living hinge (best flexibility)
module living_hinge_lattice(
    width,
    length,
    thickness = 0.6,
    cell_size = 4,
    wall = 0.8
) {
    cols = floor(width / cell_size);
    rows = floor(length / cell_size);

    difference() {
        cube([width, length, thickness]);

        // Diamond pattern cuts
        for (row = [0:rows]) {
            for (col = [0:cols]) {
                offset_x = (row % 2) * cell_size / 2;
                x = col * cell_size + offset_x;
                y = row * cell_size / 2;

                if (x > wall && x < width - wall && y > wall && y < length - wall) {
                    translate([x, y, -epsilon])
                    rotate([0, 0, 45])
                        cube([cell_size - wall, cell_size - wall, thickness + 2*epsilon], center = true);
                }
            }
        }
    }
}
```

### Complete Box with Living Hinge Lid

```openscad
module hinged_box(
    inner_size,         // [width, depth, height]
    wall = 2,
    lid_height = 15,
    hinge_width = 30
) {
    w = inner_size[0];
    d = inner_size[1];
    h = inner_size[2];

    outer_w = w + wall * 2;
    outer_d = d + wall * 2;

    // Box body
    difference() {
        cube([outer_w, outer_d, h + wall]);
        translate([wall, wall, wall])
            cube([w, d, h + wall]);
    }

    // Living hinge (at back edge)
    translate([0, outer_d, h + wall - 0.01])
    rotate([0, 0, 0])
        living_hinge_serpentine(outer_w, hinge_width, thickness = 0.6);

    // Lid
    translate([0, outer_d + hinge_width, h + wall - 0.01])
        cube([outer_w, outer_d, wall]);

    // Lid lip
    translate([wall + 0.3, outer_d + hinge_width + wall, h + wall - 0.01])
        cube([w - 0.6, d - wall, lid_height]);
}
```

---

## 5. Snap Fits and Cantilever Clips

### Design Principles
- **Beam length:** Longer = more flexible, less stress
- **Thickness:** 1.5-2mm typical for PLA
- **Hook depth:** 1-2mm engagement
- **Deflection:** Keep under 50% of yield for fatigue life
- **Print orientation:** Beam in XY plane, not Z

### Cantilever Snap Clip

```openscad
// Cantilever snap-fit clip
module snap_clip(
    length = 15,        // Beam length (longer = more flex)
    width = 8,          // Clip width
    thickness = 1.5,    // Beam thickness
    hook_height = 2,    // Hook engagement depth
    hook_angle = 45,    // Entry ramp angle (45° = easy insert)
    base_height = 5     // Height of mounting base
) {
    // Mounting base
    cube([thickness * 2, width, base_height]);

    // Cantilever beam
    translate([thickness/2, 0, base_height])
        cube([thickness, width, length]);

    // Hook at end
    translate([thickness/2, 0, base_height + length]) {
        // Angled entry ramp
        hull() {
            cube([thickness, width, epsilon]);
            translate([hook_height, 0, hook_height])
                cube([epsilon, width, epsilon]);
        }

        // Catch surface (perpendicular retention)
        translate([0, 0, hook_height])
            cube([hook_height + thickness, width, 1.5]);
    }
}

// Mating pocket for snap clip
module snap_pocket(
    clip_thickness = 1.5,
    clip_width = 8,
    clip_length = 15,
    hook_height = 2,
    clearance = 0.3,
    wall = 2
) {
    pocket_w = clip_width + clearance * 2;
    pocket_t = clip_thickness * 2 + hook_height + clearance * 2;
    pocket_h = clip_length + hook_height + 5;

    difference() {
        cube([pocket_t + wall * 2, pocket_w + wall * 2, pocket_h]);

        // Clip slot
        translate([wall, wall, -epsilon])
            cube([pocket_t, pocket_w, pocket_h + epsilon * 2]);

        // Entry chamfer
        translate([wall + pocket_t/2, wall, pocket_h - 2])
        rotate([-90, 0, 0])
            cylinder(d = pocket_t, h = pocket_w, $fn = 32);
    }
}

// Annular snap fit (for round parts)
module annular_snap_ring(
    inner_d,            // Inner diameter
    outer_d,            // Outer diameter (wall thickness)
    height = 3,
    hook_height = 1,
    hook_angle = 30
) {
    difference() {
        cylinder(d = outer_d, h = height, $fn = 64);
        translate([0, 0, -epsilon])
            cylinder(d = inner_d, h = height + epsilon * 2, $fn = 64);
    }

    // Snap ridge
    translate([0, 0, height])
    difference() {
        cylinder(d = outer_d + hook_height * 2, h = hook_height, $fn = 64);
        translate([0, 0, -epsilon])
            cylinder(d = inner_d, h = hook_height + epsilon * 2, $fn = 64);

        // Entry taper
        translate([0, 0, hook_height])
            cylinder(d1 = outer_d + hook_height * 2,
                    d2 = outer_d + hook_height * 2 + hook_height * 2 * tan(hook_angle),
                    h = hook_height, $fn = 64);
    }
}

// Matching groove for annular snap
module annular_snap_groove(
    diameter,           // Diameter at groove
    groove_depth = 1,
    groove_width = 3,
    clearance = 0.2
) {
    rotate_extrude($fn = 64)
    translate([diameter/2 - groove_depth - clearance, 0])
        square([groove_depth + clearance, groove_width + clearance * 2]);
}
```

---

## 6. Chamfers and Fillets

### When to Use Each

| Feature | Chamfer | Fillet |
|---------|---------|--------|
| **Shape** | Flat 45° bevel | Smooth curved radius |
| **Look** | Angular, industrial | Soft, refined |
| **Best for** | Bottom edges, holes, mounting | Outer corners, stress points, grips |
| **Print speed** | Faster (less geometry) | Slightly slower |
| **Strength** | Minimal improvement | Significant stress relief |

### Size Guidelines

| Application | Chamfer | Fillet (outer) | Fillet (inner) |
|-------------|---------|----------------|----------------|
| Elephant foot | 0.4-0.5mm | -- | -- |
| Mounting holes | 0.5-1mm | -- | -- |
| Decorative edges | 1-2mm | 3-5mm | -- |
| Handheld objects | -- | 5-8mm | -- |
| Structural brackets | -- | 5-8mm | 2-3mm |
| Snap fits | -- | 2-3mm | 2-3mm |
| Stress relief | -- | -- | 1-3mm |

### Material Considerations

- **PLA**: Brittle - use generous outer fillets (3-5mm), always add inner stress relief fillets
- **PETG**: More forgiving - standard radii work well
- **TPU/Flexible**: Large outer radii (5-8mm) prevent tearing; avoid sharp inside corners
- **ABS**: Benefits from stress relief fillets on joints

### Critical: Inside Corners of Pockets

**Materials always break at the weakest link - that's the base of any pocket or inside corner.**

Every pocket, slot, or cutout should have a small radius at the bottom corners:
- Minimum: 0.5-1mm radius
- Recommended: 1-2mm radius for structural parts
- This applies to ALL inside corners, not just visible ones

### When NOT to Apply Fillets

**Internal voids (hollow cavities) do NOT need filleted corners:**
- Stress relief fillets are for **external** pockets where material is under load
- A hollow interior is just empty space - no stress concentration
- Applying fillets to thin slices (used in hull() operations) can collapse the geometry

```openscad
// WRONG: Filleting a thin slice collapses it
hull() {
    linear_extrude(epsilon)
        offset(r = 2) offset(r = -2) square([w, epsilon]);  // Depth < 2*r = collapses!
}

// RIGHT: Internal voids use simple geometry
hull() {
    cube([w, epsilon, front_h]);
    translate([0, d, 0]) cube([w, epsilon, back_h]);
}
```

```openscad
// BAD: Sharp corners in pocket (stress concentrator)
difference() {
    cube([50, 50, 20]);
    translate([10, 10, 5])
        cube([30, 30, 20]);  // Sharp corners will crack
}

// GOOD: Filleted corners in pocket
difference() {
    cube([50, 50, 20]);
    translate([10, 10, 5])
        linear_extrude(20)
        offset(r = 1) offset(r = -1)  // 1mm radius on corners
            square([30, 30]);
}
```

### Bottom Chamfer (Elephant Foot Prevention)

```openscad
// Chamfered cube - prevents elephant foot on first layer
module chamfered_cube(size, chamfer = 0.5) {
    sz = is_list(size) ? size : [size, size, size];
    c = chamfer;

    hull() {
        // Bottom (inset by chamfer)
        translate([c, c, 0])
            cube([sz[0] - 2*c, sz[1] - 2*c, epsilon]);

        // Full size above chamfer
        translate([0, 0, c])
            cube([sz[0], sz[1], sz[2] - c]);
    }
}

// Chamfered cylinder
module chamfered_cylinder(d, h, chamfer = 0.5) {
    hull() {
        cylinder(d = d - chamfer * 2, h = epsilon, $fn = 32);
        translate([0, 0, chamfer])
            cylinder(d = d, h = h - chamfer, $fn = 32);
    }
}

// Apply bottom chamfer to any 2D shape
module chamfer_extrude(height, chamfer = 0.5) {
    hull() {
        linear_extrude(epsilon)
            offset(r = -chamfer) children();
        translate([0, 0, chamfer])
            linear_extrude(height - chamfer)
                children();
    }
}
```

### Edge Fillets

```openscad
// 2D fillet for corners (use before linear_extrude)
module fillet_2d(r) {
    offset(r = r) offset(r = -r) children();
}

// 2D chamfer for corners
module chamfer_2d(c) {
    offset(delta = c) offset(delta = -c, chamfer = true) children();
}

// 3D vertical edge fillet (for extruded shapes)
module fillet_extrude(height, r) {
    linear_extrude(height)
        offset(r = r) offset(r = -r) children();
}

// Interior corner fillet (negative space fillet)
module interior_fillet(r, h) {
    difference() {
        cube([r + epsilon, r + epsilon, h]);
        translate([r, r, -epsilon])
            cylinder(r = r, h = h + epsilon * 2, $fn = 32);
    }
}

// Exterior corner round (positive space)
module exterior_round(r, h) {
    difference() {
        translate([0, 0, 0])
            cylinder(r = r, h = h, $fn = 32);
        translate([-r - epsilon, -r - epsilon, -epsilon])
            cube([r + epsilon, r * 2 + epsilon * 2, h + epsilon * 2]);
        translate([-r - epsilon, -r - epsilon, -epsilon])
            cube([r * 2 + epsilon * 2, r + epsilon, h + epsilon * 2]);
    }
}
```

### External Edge Chamfers (Chip Prevention)

**All exposed external edges should be chamfered or filleted** to prevent chipping during handling. This is especially important for:
- Top edges of walls and lips
- Exposed shelf edges
- Any edge a user might touch or bump

Think of concrete walls and steps - they always have chamfered edges to prevent chipping. The same principle applies to 3D prints.

**Where to Apply:**

| Location | Treatment | Size | Reason |
|----------|-----------|------|--------|
| Bottom edge (bed-facing) | Chamfer | 0.5mm | Elephant foot + printability |
| Top edges of walls/lips | Chamfer | 0.5-1mm | Chip prevention |
| Exposed shelf edges | Chamfer or Fillet | 0.5-1mm | Chip prevention + safety |
| Handle/grip areas | Fillet | 2-5mm | Comfort + durability |
| Interior void edges | None needed | -- | Not under stress |

**Chamfer vs Fillet for External Edges:**
- **Chamfers**: Easier to print (no overhangs), industrial look, faster to render
- **Fillets**: Slightly better chip resistance, softer feel, but create overhangs on downward-facing edges

**Rule of thumb**: Use chamfers for top edges (printable), fillets for outer corners (comfort).

```openscad
// Top edge chamfer - cuts a 45° bevel at the top of an extrusion
// Apply by subtracting from the top of your shape
module top_edge_chamfer_cut(w, d, chamfer = 0.5) {
    translate([0, 0, -chamfer])
    difference() {
        cube([w, d, chamfer * 2]);
        hull() {
            translate([0, 0, chamfer])
                cube([w, d, epsilon]);
            translate([chamfer, chamfer, 0])
                cube([w - chamfer * 2, d - chamfer * 2, epsilon]);
        }
    }
}

// Top edge chamfer using hull (additive approach)
// Creates geometry with chamfered top edge
module chamfered_top_extrude(height, chamfer = 0.5) {
    hull() {
        // Main body up to chamfer start
        linear_extrude(height - chamfer)
            children();
        // Inset top
        translate([0, 0, height - epsilon])
        linear_extrude(epsilon)
            offset(r = -chamfer) children();
    }
}

// Both top and bottom chamfers
module double_chamfer_extrude(height, chamfer = 0.5) {
    hull() {
        // Bottom (inset)
        linear_extrude(epsilon)
            offset(r = -chamfer) children();
        // Middle (full size)
        translate([0, 0, chamfer])
        linear_extrude(height - chamfer * 2)
            children();
        // Top (inset)
        translate([0, 0, height - epsilon])
        linear_extrude(epsilon)
            offset(r = -chamfer) children();
    }
}
```

**Example: Chamfered Wall/Lip**

```openscad
// A wall with chamfered top edge (prevents chipping)
module chamfered_wall(width, thickness, height, chamfer = 0.5) {
    hull() {
        // Main wall body
        cube([width, thickness, height - chamfer]);
        // Chamfered top (inset)
        translate([chamfer, chamfer, height - epsilon])
            cube([width - chamfer * 2, thickness - chamfer * 2, epsilon]);
    }
}

// Apply to all exposed lips around a pocket
module pocket_with_chamfered_lips(pocket_w, pocket_d, wall, lip_h, chamfer = 0.5) {
    // Front lip
    chamfered_wall(pocket_w + wall * 2, wall, lip_h, chamfer);
    // Left lip
    chamfered_wall(wall, pocket_d + wall * 2, lip_h, chamfer);
    // Right lip
    translate([pocket_w + wall, 0, 0])
        chamfered_wall(wall, pocket_d + wall * 2, lip_h, chamfer);
    // (back lip omitted if open for cables)
}
```

**Comprehensive Edge Treatment Checklist:**

Before finalizing any design, audit ALL external edges:

- [ ] Bottom edge: 0.5mm chamfer (elephant foot)
- [ ] Top edges of walls/lips: 0.5-1mm chamfer (chip prevention)
- [ ] Outer vertical corners: 5-10mm fillet (aesthetics, grip)
- [ ] Inside pocket corners: 1-2mm fillet (stress relief)
- [ ] Interior floor-wall junctions: 2-3mm fillet (structural)
- [ ] Shelf/platform edges: 0.5mm chamfer (chip prevention)
- [ ] Corner blends: where top chamfer meets vertical fillet
- [ ] NO treatment needed: internal void edges

### Corner Blends (Smooth Vertex Transitions)

When a chamfered top edge meets a filleted vertical corner, there's often a sharp transition point. A **corner blend** creates a smooth curved surface at this vertex.

**Terminology in other CAD systems:**
- Onshape: "Smooth fillet corners"
- Creo: "Corner sphere" or "corner blend"
- CATIA: "Blend corners with setback"
- BOSL2: `rounding_corner_mask()`

**OpenSCAD Implementation:**

```openscad
// Corner blend - spherical transition at vertex
// Position at the apex where vertical fillet meets top surface
// corner_r = radius of vertical fillet (e.g., 8mm)
// back_height = Z position of top surface at corner
// blend_r = radius of spherical blend (typically 3-8mm)

module corner_blend(corner_r, height, blend_r) {
    // Sphere positioned at fillet center, at top height
    translate([corner_r, corner_r, height])
        sphere(r = blend_r, $fn = 32);
}

// Usage: subtract from geometry in difference() block
difference() {
    your_shape();

    // Back-right corner blend
    translate([width - corner_r, depth - corner_r, 0])
        corner_blend(corner_r, height, blend_r);
}
```

**Sizing guidelines:**
- blend_r should be 50-100% of corner_r for smooth transition
- Smaller blend_r = subtle transition
- Larger blend_r = more pronounced curved surface
- For 8mm vertical fillet, use 4-8mm blend radius

---

## 7. Cross-Section Debugging

### Cross-Section Viewer

```openscad
// Parametric cross-section viewer
module cross_section(
    axis = "y",         // "x", "y", or "z"
    position = 0,       // Where to cut
    keep = "positive"   // "positive" or "negative" half
) {
    size = 1000;

    difference() {
        children();

        if (keep == "positive") {
            if (axis == "x")
                translate([position - size, -size/2, -size/2])
                    cube([size, size, size]);
            else if (axis == "y")
                translate([-size/2, position - size, -size/2])
                    cube([size, size, size]);
            else
                translate([-size/2, -size/2, position - size])
                    cube([size, size, size]);
        } else {
            if (axis == "x")
                translate([position, -size/2, -size/2])
                    cube([size, size, size]);
            else if (axis == "y")
                translate([-size/2, position, -size/2])
                    cube([size, size, size]);
            else
                translate([-size/2, -size/2, position])
                    cube([size, size, size]);
        }
    }
}

// Quadrant view (cuts away two quadrants)
module quadrant_view(x = 0, y = 0) {
    difference() {
        children();
        translate([x, -500, -500]) cube([1000, 1000, 1000]);
        translate([-500, y, -500]) cube([1000, 1000, 1000]);
    }
}

// Animated cross-section (use with View > Animate)
module animated_section(axis = "z", min = 0, max = 50) {
    pos = min + (max - min) * $t;
    cross_section(axis, pos, "positive") children();
}
```

### Dimension Visualization

```openscad
// Show dimension line between two points
module dimension_line(from, to, offset = 5, label = "") {
    dist = norm(to - from);
    dir = (to - from) / dist;
    perp = [-dir[1], dir[0], 0];

    color("red") {
        // Extension lines
        hull() {
            translate(from) sphere(d = 0.3, $fn = 8);
            translate(from + perp * offset) sphere(d = 0.3, $fn = 8);
        }
        hull() {
            translate(to) sphere(d = 0.3, $fn = 8);
            translate(to + perp * offset) sphere(d = 0.3, $fn = 8);
        }

        // Dimension line
        hull() {
            translate(from + perp * offset) sphere(d = 0.3, $fn = 8);
            translate(to + perp * offset) sphere(d = 0.3, $fn = 8);
        }

        // Text label
        translate((from + to) / 2 + perp * (offset + 3))
        linear_extrude(0.5)
        text(str(round(dist * 10) / 10, "mm"),
             size = 3, halign = "center", valign = "center");
    }
}

// Highlight specific geometry
module highlight() {
    # children();
}

// Show only outline (wireframe-ish)
module outline_only() {
    % children();
}
```

---

## 8. Tolerance Compensation

### Fit Types

```openscad
// Tolerance constants for different fit types
CLEARANCE_LOOSE = 0.4;      // Easy sliding, sloppy
CLEARANCE_FREE = 0.25;       // Free running
CLEARANCE_CLOSE = 0.15;      // Close sliding fit
TRANSITION = 0.05;           // May need light press
INTERFERENCE_LIGHT = -0.05;  // Light press fit
INTERFERENCE_MEDIUM = -0.1;  // Medium press fit

// Material shrinkage (multiply dimensions by 1 + shrinkage)
SHRINKAGE_PLA = 0.002;       // 0.2%
SHRINKAGE_PETG = 0.004;      // 0.4%
SHRINKAGE_ABS = 0.008;       // 0.8%

// Get tolerance for fit type
function fit_tolerance(fit = "free") =
    fit == "loose" ? CLEARANCE_LOOSE :
    fit == "free" ? CLEARANCE_FREE :
    fit == "close" ? CLEARANCE_CLOSE :
    fit == "transition" ? TRANSITION :
    fit == "press_light" ? INTERFERENCE_LIGHT :
    fit == "press_medium" ? INTERFERENCE_MEDIUM : 0;

// Get shrinkage for material
function material_shrinkage(mat = "pla") =
    mat == "pla" ? SHRINKAGE_PLA :
    mat == "petg" ? SHRINKAGE_PETG :
    mat == "abs" ? SHRINKAGE_ABS : 0;
```

### Tolerance-Aware Modules

```openscad
// Hole with fit tolerance and shrinkage compensation
module tolerance_hole(d, h, fit = "free", material = "pla") {
    tol = fit_tolerance(fit);
    shrink = material_shrinkage(material);

    // Compensate for shrinkage and add tolerance
    actual_d = d * (1 + shrink) + tol;

    cylinder(d = actual_d, h = h, $fn = max(32, d * 4));
}

// Shaft with fit tolerance and shrinkage compensation
module tolerance_shaft(d, h, fit = "free", material = "pla") {
    tol = fit_tolerance(fit);
    shrink = material_shrinkage(material);

    // Compensate for shrinkage, subtract tolerance (shaft is smaller)
    actual_d = d * (1 + shrink) - tol;

    cylinder(d = actual_d, h = h, $fn = max(32, d * 4));
}

// Rectangular pocket with tolerances
module tolerance_pocket(size, depth, fit = "free", material = "pla") {
    tol = fit_tolerance(fit);
    shrink = material_shrinkage(material);

    actual_w = size[0] * (1 + shrink) + tol * 2;
    actual_d = size[1] * (1 + shrink) + tol * 2;

    cube([actual_w, actual_d, depth]);
}

// Rectangular tab to fit in pocket
module tolerance_tab(size, height, fit = "free", material = "pla") {
    tol = fit_tolerance(fit);
    shrink = material_shrinkage(material);

    actual_w = size[0] * (1 + shrink) - tol * 2;
    actual_d = size[1] * (1 + shrink) - tol * 2;

    cube([actual_w, actual_d, height]);
}
```

### Elephant Foot Compensation

```openscad
// First layer compensation for elephant foot
module elephant_foot_comp(size, compensation = 0.2) {
    first_layer = 0.3;

    hull() {
        // First layer: inset by compensation
        linear_extrude(epsilon)
            offset(r = -compensation) children();

        // Above first layer: full size
        translate([0, 0, first_layer])
            linear_extrude(size - first_layer)
                children();
    }
}
```

---

## 9. Modular Design Patterns

### Configuration Object Pattern

```openscad
// Configuration as a lookup table
function config(
    wall = 3,
    tolerance = 0.3,
    corner_r = 5,
    fn = 32
) = [
    ["wall", wall],
    ["tolerance", tolerance],
    ["corner_r", corner_r],
    ["fn", fn]
];

function cfg_get(cfg, key) =
    let(idx = search([key], cfg, 1, 0)[0])
    cfg[idx][1];

// Usage:
// my_cfg = config(wall = 4, tolerance = 0.25);
// wall = cfg_get(my_cfg, "wall");  // Returns 4
```

### Component Interface Pattern

```openscad
// Standard mounting interface
module mounting_interface(type = "m3_clearance", depth = 10) {
    if (type == "m3_clearance")
        cylinder(d = 3.4, h = depth, $fn = 24);
    else if (type == "m3_insert")
        cylinder(d = 4.0, h = 5, $fn = 24);
    else if (type == "m4_clearance")
        cylinder(d = 4.5, h = depth, $fn = 24);
    else if (type == "m4_insert")
        cylinder(d = 5.6, h = 6.5, $fn = 24);
}

// Standard mounting hole pattern
module mounting_pattern(spacing, type = "m3_clearance", depth = 10) {
    for (x = [-spacing[0]/2, spacing[0]/2])
        for (y = [-spacing[1]/2, spacing[1]/2])
            translate([x, y, 0])
                mounting_interface(type, depth);
}
```

### Variant Pattern

```openscad
// Base module with variants
module enclosure_base(variant = "basic", size = [100, 60, 40], wall = 3) {
    difference() {
        // Outer shell (always present)
        cube(size);
        translate([wall, wall, wall])
            cube([size[0] - wall*2, size[1] - wall*2, size[2]]);

        // Variant-specific features
        if (variant == "vented")
            enclosure_vents(size, wall);
        else if (variant == "windowed")
            enclosure_window(size, wall);
    }

    // Variant-specific additions
    if (variant == "mounted")
        enclosure_mounting_ears(size, wall);
}

module enclosure_vents(size, wall) {
    vent_w = 2;
    vent_spacing = 5;
    vents = floor((size[0] - 20) / vent_spacing);

    for (i = [0:vents-1])
        translate([10 + i * vent_spacing, -epsilon, size[2]/2])
        rotate([-90, 0, 0])
            cube([vent_w, size[2]/3, wall + epsilon*2]);
}

module enclosure_window(size, wall) {
    translate([size[0]/4, -epsilon, size[2]/4])
    rotate([-90, 0, 0])
        cube([size[0]/2, size[2]/2, wall + epsilon*2]);
}

module enclosure_mounting_ears(size, wall) {
    ear_w = 15;
    ear_h = 5;

    for (x = [0, size[0] - ear_w])
        translate([x, size[1], 0])
        difference() {
            cube([ear_w, ear_h, wall]);
            translate([ear_w/2, ear_h/2, -epsilon])
                cylinder(d = 4, h = wall + epsilon*2, $fn = 24);
        }
}
```

---

## 10. Performance Optimization

### Adaptive Resolution

```openscad
// Adaptive $fn based on feature size
function adaptive_fn(d) =
    $preview ?
        max(12, min(24, d * 2)) :    // Lower for preview
        max(24, min(96, d * 4));      // Higher for render

// Fast cylinder (auto-adjusts resolution)
module fast_cylinder(d, h, critical = false) {
    fn = critical ?
        ($preview ? 32 : 64) :
        adaptive_fn(d);
    cylinder(d = d, h = h, $fn = fn);
}

// Resolution presets
$fn_preview = 16;
$fn_draft = 32;
$fn_quality = 64;
$fn_ultra = 128;
```

### Conditional Complexity

```openscad
// Only render expensive features when not in preview
module expensive_detail(enabled = true) {
    if (!$preview && enabled) {
        children();
    } else if ($preview && enabled) {
        // Simplified preview version
        % children();  // Show as ghost
    }
}

// Level of detail pattern
module lod_sphere(d, detail = "auto") {
    fn =
        detail == "low" ? 12 :
        detail == "medium" ? 24 :
        detail == "high" ? 48 :
        detail == "ultra" ? 96 :
        /* auto */ ($preview ? 16 : 48);

    sphere(d = d, $fn = fn);
}
```

### Avoiding Expensive Operations

```openscad
// SLOW: Full minkowski
module slow_rounded_cube(size, r) {
    minkowski() {
        cube([size[0] - r*2, size[1] - r*2, size[2] - r*2]);
        sphere(r = r, $fn = 32);
    }
}

// FAST: Hull approximation (no Z rounding)
module fast_rounded_cube(size, r) {
    linear_extrude(size[2])
        offset(r = r) offset(r = -r)
            square([size[0], size[1]]);
}

// FAST: Corner cylinders (rounds XY edges only)
module rounded_cube_xy(size, r) {
    hull() {
        for (x = [r, size[0] - r])
            for (y = [r, size[1] - r])
                translate([x, y, 0])
                    cylinder(r = r, h = size[2], $fn = 32);
    }
}
```

---

## 11. Text and Labels

### Version Stamps

```openscad
// Embossed version stamp (raised)
module version_stamp_emboss(version = "v1.0", size = 3, height = 0.4) {
    linear_extrude(height)
        text(version, size = size, halign = "center", valign = "center",
             font = "Liberation Mono:style=Bold");
}

// Debossed version stamp (recessed - better for top surfaces)
module version_stamp_deboss(version = "v1.0", size = 3, depth = 0.5) {
    translate([0, 0, -depth])
    linear_extrude(depth + epsilon)
        text(version, size = size, halign = "center", valign = "center",
             font = "Liberation Mono:style=Bold");
}
```

### Orientation Markers

```openscad
// Print orientation indicator
module orientation_marker() {
    // Arrow pointing to front
    color("gray")
    linear_extrude(0.4) {
        // Arrow head
        polygon([[-5, 0], [5, 0], [0, 8]]);
        // Arrow stem
        translate([-2, -8]) square([4, 8]);
    }

    // "FRONT" text
    translate([0, -15, 0])
    linear_extrude(0.4)
        text("FRONT", size = 4, halign = "center", valign = "center");
}

// Top/bottom indicator
module top_bottom_marker(which = "top") {
    linear_extrude(0.4)
        text(which == "top" ? "TOP" : "BTM",
             size = 4, halign = "center", valign = "center");
}
```

---

## 12. SVG/DXF Import

### Import Helpers

```openscad
// Import and scale SVG logo
module svg_logo(file, target_width, depth = 1) {
    // Note: Measure original width first with a test import
    // original_width = 100;  // Measure this
    // scale_factor = target_width / original_width;

    linear_extrude(depth)
        import(file, center = true);
}

// Import DXF profile for extrusion
module dxf_profile(file, layer = "0") {
    import(file, layer = layer);
}

// DXF to 3D with specified height
module dxf_extrude(file, height, layer = "0") {
    linear_extrude(height)
        import(file, layer = layer);
}
```

---

## Usage Tips

1. **For ergonomic grips:** Use bezier curves (Section 1)
2. **For adapters:** Use lofting (Section 2)
3. **For adjustable mechanisms:** Use threads (Section 3)
4. **For single-print enclosures:** Use living hinges (Section 4)
5. **For tool-free assembly:** Use snap fits (Section 5)
6. **For print quality:** Use systematic chamfers (Section 6)
7. **For debugging:** Use cross-sections (Section 7)
8. **For precise fits:** Use tolerance compensation (Section 8)
9. **For reusable code:** Use modular patterns (Section 9)
10. **For fast iteration:** Use performance optimization (Section 10)
