---
name: openscad
description: "DEPRECATED - use `cadquery` instead. Only use OpenSCAD when: (1) user explicitly requests it, (2) editing existing .scad files, or (3) trivial single-primitive shapes."
---

# OpenSCAD Implementation Skill

> ⚠️ **DEPRECATED**: Use **CadQuery** (`cadquery` skill) for new 3D models. OpenSCAD cannot handle edge fillets, chamfers on specific edges, or geometry on sloped surfaces.
>
> Only use this skill when:
> - User explicitly requests OpenSCAD
> - Editing existing `.scad` files
> - Trivial shapes (single cube/cylinder with no edge treatments)

## Prerequisites

> 📋 **Use `3d-print-design` skill first** to gather requirements and create a formal specification. This skill is for implementation only.

See also:
- `../shared/manufacturing.md` for tolerances, hardware data, and printer constraints
- `./references/` for OpenSCAD-specific patterns


## Code Structure Requirements

```openscad
// ============================================
// OBJECT NAME - Brief description
// ============================================

/* [User Parameters] */
width = 50;           // Main dimension
wall = 2.4;           // Wall thickness (multiple of 0.4mm nozzle)

/* [Derived - Do Not Modify] */
inner_width = width - 2 * wall;

/* [Hidden] */
$fn = $preview ? 24 : 48;
epsilon = 0.01;

// === MODULES ===
module component_name() { ... }

// === ASSEMBLY ===
final_assembly();
```

## Manufacturing Constraints

See `../shared/manufacturing.md` for:
- Wall thickness guidelines
- Tolerances and fits
- Screw/nut/insert dimensions
- Overhang and bridging limits

## Essential Patterns

### Boolean Operations
Always extend cuts beyond surfaces:
```openscad
difference() {
    base_shape();
    translate([x, y, z - 0.01])  // Extend past surface
        cutting_shape(h + 0.02);
}
```

### Rounded Box
```openscad
module rounded_box(size, r) {
    hull() for (x=[r,size[0]-r], y=[r,size[1]-r])
        translate([x, y, 0]) cylinder(r=r, h=size[2]);
}
```

### Parametric Shell
```openscad
module shell(outer, wall) {
    difference() {
        cube(outer);
        translate([wall, wall, wall])
            cube([outer[0]-2*wall, outer[1]-2*wall, outer[2]]);
    }
}
```

## Structural Reinforcement

### Ribs
- Height: 2-3× wall thickness
- Thickness: 50-60% of wall (prevents sink marks)
- Spacing: 2-3× wall thickness apart

### Gussets
- Angle: 45° for optimal strength/material ratio
- Fillet at base: 25-50% of gusset thickness

### Fillets
- Interior corners: radius = wall thickness minimum
- Exterior edges: 0.5-2mm chamfer for handling

## Aesthetic Defaults

Always apply these principles unless the user specifies otherwise:

### Rounded Corners and Edges
- **Default corner radius**: 8-10mm for handheld objects, 3-5mm for small parts
- Apply rounding to ALL exterior vertical edges (visible from top and bottom)
- Use `offset(r) offset(-r)` for 2D rounded rectangles, then `linear_extrude()`
- Rounded corners improve grip, reduce stress concentrations, and look more professional

```openscad
// 2D rounded rectangle helper
module rounded_rect_2d(w, d, r) {
    offset(r) offset(-r) square([w, d]);
}

// 3D rounded box
module rounded_box(w, d, h, r) {
    linear_extrude(h) rounded_rect_2d(w, d, r);
}
```

### Terminology: Shelf vs Ledge vs Lip

When designing stands and holders, use precise terminology:

| Term | Definition | Purpose |
|------|-----------|---------|
| **Shelf** | Horizontal surface that an object sits ON TOP OF | Supports the object's weight from below |
| **Ledge** | Narrow projection or rim (ambiguous - avoid) | Can mean shelf or just an edge |
| **Lip** | Vertical wall that prevents sliding | Retains the object, doesn't support weight |

**Always clarify:** When a device needs support, ask "Does it need a **shelf** (surface to rest on) or a **lip** (wall to prevent sliding) or both?"

```openscad
// Example: Device pocket with shelf and lip
// The SHELF is what the device bottom rests ON
// The LIP is the raised wall that prevents sliding

shelf_width = 10;      // How far shelf extends under device
shelf_thickness = 5;   // Shelf material thickness
lip_height = 8;        // How high the retaining wall is

// Shelf opening is SMALLER than device (device edges rest on shelf)
shelf_opening = device_size - shelf_width * 2;
```

### Lips and Retaining Walls
- **Lips must follow the surface angle** they sit on
- If a platform is tilted, the lip around it should be tilted at the same angle
- Apply the same rotation to both the shelf and its lip
- This ensures consistent visual appearance and proper device fit

```openscad
// Tilted platform with matching lip
tilt = 12;
translate([0, 0, platform_z])
rotate([tilt, 0, 0]) {
    // Shelf (device rests on this)
    linear_extrude(shelf_thickness) ...
    // Lip follows same tilt (prevents sliding)
    linear_extrude(lip_height) ...
}
```

### Tilted Geometry Consistency

**Critical**: When any surface is tilted, ALL connecting geometry must follow the same tilt angle. This includes:
- Interior voids/cavities below the tilted surface
- Openings or holes through the tilted surface
- Lips, walls, and features above the tilted surface
- Cuts that remove material from the tilted surface

**Common bug**: A flat-topped interior void won't connect properly with a tilted surface above it, leaving unintended solid material.

```openscad
// WRONG: Flat-topped void under tilted shelf creates gap at back
translate([wall, wall, base])
    cube([w, d, shelf_z - base]);  // Flat top at shelf_z everywhere

// RIGHT: Tilted void matches the shelf angle
translate([wall, wall, base])
hull() {
    cube([w, epsilon, front_height]);
    translate([0, d - epsilon, 0])
        cube([w, epsilon, back_height]);  // back_height = front_height + d * tan(tilt)
}
```

### Unified Geometry
- Avoid separate touching pieces that share edges (causes non-manifold)
- Overlap adjoining parts by 1mm to ensure proper union
- Build complex shapes with single `difference()` operations when possible

### Ghost Object Validation

**Always add "ghost" preview objects** to visualize what the stand/holder will contain:

```openscad
// Ghost device - shows where device sits (transparent, not part of model)
%translate([wall + clearance, wall + clearance, shelf_z])
    rotate([tilt, 0, 0])
    cube([device_width, device_depth, device_height]);

// Ghost power bank (in battery compartment)
%translate([wall + 10, center_y - pb_width/2, base_floor + 1])
    cube([pb_length, pb_width, pb_height]);
```

**Critical rule**: The solid model geometry must NEVER intersect with ghost objects:
- Ghost device should sit ON the shelf, not penetrate it
- Ghost contents should fit INSIDE cavities with clearance
- If ghost objects clip through walls/shelves, the design is wrong

**Use ghost objects to verify:**
- Device fits in pocket with proper clearance
- Internal contents (batteries, cables) have room
- Tilt angle positions device correctly
- Lips don't block device insertion/removal

## Functional Object Guidelines

### Hooks
- Hook depth: ≥25mm prevents slipping
- Upturn angle: 15-30° retains items
- Wall mounting: minimum 2 screws, vertically aligned

### Boxes with Lids
- Lid overlap: 2-3mm for dust seal
- Lid clearance: 0.3-0.5mm for easy fit
- Snap fit strain: 2-3% deflection

### Brackets
- Support depth: 60-80% of load surface
- Include 45° gusset for strength
- Safety factor: 3-4× expected load

### Stands/Holders
- Base depth ≥ support height for stability
- Front lip: 8-12mm prevents sliding
- Viewing angle: 60-75° for screens

## Validation Checklist

Before outputting code, verify:
- [ ] Parameters at file top with comments
- [ ] Wall thickness ≥ 1.2mm (structural ≥ 2.4mm)
- [ ] Interior corners filleted (r = wall thickness)
- [ ] Holes have tolerance compensation (+0.4mm)
- [ ] No overhangs > 45° or noted as needing support
- [ ] Boolean cuts extend past surfaces (+0.01mm)
- [ ] $fn set appropriately (32+ for visible curves)
- [ ] Print orientation identified in notes
- [ ] **Exterior corners rounded** (8-10mm default radius)
- [ ] **Lips follow surface tilt angle** (if platform is angled)
- [ ] **Adjoining parts overlap by 1mm** (prevents non-manifold)

## Post-Generation Validation (Required)

**After writing any OpenSCAD file, always run the validation scripts:**

```bash
# 1. Code validation - checks syntax, constraints, best practices
node ~/.claude/skills/openscad-3d-printing/scripts/validate.js <file.scad>

# 2. Geometry analysis - checks printability, estimates material
# Use --printer and --material flags for accurate time estimates
node ~/.claude/skills/openscad-3d-printing/scripts/analyze-geometry.js <file.scad> --printer p2s --material pla

# 3. Bed fit check - verify model fits on printer bed
node ~/.claude/skills/openscad-3d-printing/scripts/check-bed-fit.js <file.scad> --printer p2s

# 4. Full test suite - boundary tests, manifold check, STL validity
node ~/.claude/skills/openscad-3d-printing/scripts/test-design.js <file.scad> --auto
```

**Available printer profiles:** p1s, p1p, p2s, x1c, a1, a1mini, prusa-mk4, prusa-mini, ender3, voron
**Available materials:** pla, petg, abs, tpu

**Review and address any issues before presenting the design as complete:**
- Errors (❌) must be fixed
- Warnings (⚠️) should be addressed or explained
- Info notes (ℹ️) are suggestions to consider

## Visual Verification (Limited Reliability)

**Important:** Visual analysis of 3D renders has limited reliability. I cannot accurately interpret rendered images to verify precise geometry (heights, positions, existence of features). Use primarily for quick sanity checks, not precise verification.

**The test suite is the primary validation mechanism.**

### Validation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Write/modify OpenSCAD code                              │
│                         ↓                                   │
│  2. Run test suite: node <model>-spec-test.js               │
│                         ↓                                   │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │ Tests FAIL  │    │ Tests PASS  │                        │
│  └──────┬──────┘    └──────┬──────┘                        │
│         ↓                   ↓                               │
│  Fix geometry         Quick visual                          │
│  (loop back to 1)     sanity check                          │
│                             ↓                               │
│                    Present to user                          │
└─────────────────────────────────────────────────────────────┘
```

### When Tests Fail

1. **Read the failure message** - it shows expected vs actual
2. **Check diagnostic output** - vertex dumps show actual geometry
3. **Determine cause:**
   - Geometry bug → fix the OpenSCAD code
   - Test bug → fix the test (e.g., wrong region, wrong threshold)
4. **Re-run tests** - iterate without asking user

### When Tests Pass But Visual Looks Wrong

This indicates incomplete tests. Add more tests to cover the missing case:

```javascript
// If back shelf looks missing but tests pass, add a specific test:
test('Back shelf spans full width at center', (vertices) => {
    // Test specifically for the center region that looks wrong
});
```

### Visual Sanity Check (Quick, Not Precise)

After tests pass, optionally render for a quick sanity check:

```bash
OPENSCAD=$(find /Applications -name "OpenSCAD*" -type d 2>/dev/null | head -1)/Contents/MacOS/OpenSCAD
"$OPENSCAD" --autocenter --viewall --camera=0,0,0,55,0,25,0 --imgsize=1200,900 -o render.png <file.scad>
```

**Only check for:**
- Overall shape roughly matches intent
- No obvious broken geometry (holes, missing walls)
- Model appears complete (not empty)

**Do NOT try to visually verify:**
- Precise heights or dimensions
- Whether a specific feature exists
- Exact positions of geometry

**Report to user:**
- Test pass/fail summary with specific failures
- Only ask for user input when tests pass or when stuck on a persistent failure

## Handling Oversized Models

If the bed fit check fails, consider splitting the model:

### When to Split
- Model exceeds 85-90% of printer bed in any dimension
- Internal supports would exceed 20% of print time
- Print time exceeds 20+ hours (high failure risk)
- Different sections need different orientations for quality

### When NOT to Split
- Continuous material strength is critical
- Assembly would create weak points in stress areas
- Dimensional accuracy across assembly is critical

### Splitting Strategies
1. **Alignment pins**: 3-6mm diameter, 2-3x length, +0.2mm clearance
2. **Dovetails**: 8-12° angle, self-aligning, 0.15-0.2mm tolerance
3. **Tab and slot**: 3-5mm thick, 10-15mm long, +0.2mm clearance

### Assembly Methods
| Material | Best Adhesive | Notes |
|----------|--------------|-------|
| PLA | CA (super glue) | Quick cure |
| ABS | Acetone weld | Strongest bond |
| PETG | Epoxy | Difficult material |

See `references/splitting-guide.md` for detailed joint designs and OpenSCAD patterns.

## Additional Resources

Detailed patterns and examples in skill directory:
- `references/design-principles.md` - Comprehensive design rules
- `references/hardware-reference.md` - Screw, nut, insert dimensions
- `references/object-patterns.md` - Common object templates
- `references/splitting-guide.md` - Multi-part assembly guide
- `references/advanced-techniques.md` - Advanced patterns: bezier curves, lofting, threads, living hinges, snap fits, tolerance compensation, debugging
- `examples/` - Working OpenSCAD files
- `scripts/validate.js` - Code validator
- `scripts/analyze-geometry.js` - Geometry analyzer with print estimates
- `scripts/check-bed-fit.js` - Printer bed fit checker
- `scripts/test-design.js` - Full test suite
