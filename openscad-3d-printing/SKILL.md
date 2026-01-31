---
name: openscad-3d-printing
description: "DEPRECATED in favor of CadQuery. Only use OpenSCAD when: (1) user explicitly requests OpenSCAD, (2) editing existing .scad files, or (3) trivial single-primitive shapes. For new 3D models, device stands, holders, or any design requiring fillets/chamfers, use cadquery-3d-printing instead."
---

# OpenSCAD 3D Printing Design Skill

> ⚠️ **DEPRECATED**: Use **CadQuery** (`cadquery-3d-printing` skill) for new 3D models. OpenSCAD cannot handle edge fillets, chamfers on specific edges, or geometry on sloped surfaces. Only use this skill when:
> - User explicitly requests OpenSCAD
> - Editing existing `.scad` files
> - Trivial shapes (single cube/cylinder with no edge treatments)

Generate reliable, printable OpenSCAD code for functional objects optimized for FDM 3D printing.

## Design Process

### Phase 1: Requirements Gathering (MANDATORY)

**Before writing ANY code**, gather complete requirements through structured questions. Err on the side of asking too many questions rather than making assumptions.

#### For Stands/Holders/Cradles:

Ask ALL of these questions (user can answer "research it" for any):

1. **Device dimensions**: What are the exact W × D × H measurements?
2. **Tilt angle**: Should the device be tilted? At what angle? (0° = flat)
3. **For EACH side (front, back, left, right)**:
   - Does it need a **shelf** (horizontal surface supporting weight from below)?
   - Does it need a **lip** (vertical wall preventing sliding)?
   - If shelf: how wide should it extend under the device? (default: 10mm)
   - If lip: how tall should the retaining wall be? (default: 10mm)
4. **Hollow interior**: Is there internal storage? What goes inside? (dimensions)
5. **Cutouts/holes**: Any cable holes, ventilation, access ports? Where and what size?
6. **Wall thickness**: Structural (5mm) or lighter (3mm)?
7. **Corner radius**: Sharp (0mm), subtle (3-5mm), or rounded (8-10mm)?
8. **Printer**: What printer/bed size? (for fit checking)

#### For Boxes/Enclosures:

1. **Interior dimensions**: What needs to fit inside?
2. **Lid type**: None, removable, hinged, sliding?
3. **Wall thickness**: Light (2mm), standard (3mm), structural (4mm+)?
4. **Mounting**: Screws, clips, magnets, friction fit?
5. **Access**: Which sides need openings?

#### For Brackets/Mounts:

1. **What is being mounted**: Dimensions and weight?
2. **Mounting surface**: Wall, desk, pole? Screw holes or clamp?
3. **Load direction**: Hanging, resting, cantilevered?
4. **Adjustment needed**: Fixed or adjustable angle/position?

### Phase 2: Formal Specification (MANDATORY)

After gathering requirements, present a formal spec for user approval. **DO NOT write code until the spec is approved.**

```
╔══════════════════════════════════════════════════════════════╗
║                    DESIGN SPECIFICATION                       ║
╠══════════════════════════════════════════════════════════════╣
║ Object: [Name]                                                ║
║ Type: Stand / Box / Bracket / Other                           ║
╠══════════════════════════════════════════════════════════════╣
║ DEVICE/CONTENTS                                               ║
║   Dimensions: ___ × ___ × ___ mm                              ║
║   Clearance: ___ mm (default: 0.5mm)                          ║
╠══════════════════════════════════════════════════════════════╣
║ STAND GEOMETRY (if applicable)                                ║
║   Tilt angle: ___°                                            ║
║   Front height: ___ mm                                        ║
║                                                               ║
║   SIDE CONFIG:        Shelf?    Lip?    Shelf Width  Lip Ht  ║
║   ─────────────────────────────────────────────────────────── ║
║   Front:              [Y/N]     [Y/N]      ___mm     ___mm   ║
║   Back:               [Y/N]     [Y/N]      ___mm     ___mm   ║
║   Left:               [Y/N]     [Y/N]      ___mm     ___mm   ║
║   Right:              [Y/N]     [Y/N]      ___mm     ___mm   ║
╠══════════════════════════════════════════════════════════════╣
║ INTERIOR                                                      ║
║   Hollow: [Y/N]                                               ║
║   Contents: [description and dimensions]                      ║
╠══════════════════════════════════════════════════════════════╣
║ FEATURES                                                      ║
║   □ Cable hole: ___×___mm at [location], radius ___mm        ║
║   □ Ventilation: [description]                                ║
║   □ Mounting holes: [description]                             ║
║   □ Other: [description]                                      ║
╠══════════════════════════════════════════════════════════════╣
║ CONSTRUCTION                                                  ║
║   Wall thickness: ___ mm                                      ║
║   Floor thickness: ___ mm                                     ║
║   Corner radius: ___ mm                                       ║
╠══════════════════════════════════════════════════════════════╣
║ PRINTER                                                       ║
║   Target: [printer name]                                      ║
║   Bed size: ___ × ___ × ___ mm                                ║
╚══════════════════════════════════════════════════════════════╝
```

**Ask the user**: "Does this specification match what you want? Please review each line and let me know if anything needs to change."

### Phase 3: Write Test Suite and Validate Spec (Iterative)

**This phase iterates between writing tests and refining the specification.** The goal is to ensure the spec is complete and unambiguous before implementation.

```
┌─────────────────────────────────────────────────────────────┐
│                    SPEC ←→ TESTS ITERATION                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐         ┌──────────────────┐            │
│   │ Specification │ ←────→ │ Test Suite       │            │
│   │ (Phase 2)     │         │ (Phase 3)        │            │
│   └──────────────┘         └──────────────────┘            │
│          ↑                          │                       │
│          │    Tests reveal gaps     │                       │
│          └──────────────────────────┘                       │
│                                                             │
│   1. Write tests from spec                                  │
│   2. Review: Can every spec item be tested?                 │
│   3. Review: Do tests imply requirements not in spec?       │
│   4. If gaps found → ask user for clarification             │
│   5. Update spec, update tests, repeat until complete       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Spec → Tests: Testability Check

For each spec item, ask: "How would I test this?"

| Spec Item | Test Approach | Testable? |
|-----------|--------------|-----------|
| "Shelf on back" | Check vertices at back Y, shelf Z level | ✅ Yes |
| "Looks good" | ??? | ❌ No - clarify what "good" means |
| "Strong enough" | ??? | ❌ No - need load requirements |

If an item cannot be tested objectively, **ask for clarification** before proceeding.

#### Tests → Spec: Reverse Engineering Check

After writing tests, review them and ask: "What spec does this imply?"

```javascript
// This test implies:
// - Back shelf exists (not just wrap area)
// - Shelf spans from X~5 to X~200+
// - Shelf is at Y~172 (inner back edge)
// - Shelf is at Z~82.6 (tilted shelf level at back)

test('Back shelf spans full width', (vertices) => {
    const edgeVertices = getVerticesInRegion(vertices,
        0, DERIVED.stand_width,
        DERIVED.back_shelf_y - 3, DERIVED.back_shelf_y + 3,
        DERIVED.shelf_z_back - 5, DERIVED.shelf_z_back + 5
    );
    const xs = edgeVertices.map(v => v.x);
    const span = Math.max(...xs) - Math.min(...xs);
    return { pass: span >= 180 };
});
```

Compare these implied requirements to the spec. If anything is:
- **In tests but not spec** → Add to spec or remove test
- **In spec but not tests** → Add test or clarify why untestable

#### Questions to Ask When Gaps Found

- "The spec says [X] but I'm not sure how to verify this. Can you clarify what specifically should be true about [X]?"
- "To test [feature], I need to know [specific dimension/position]. What should this be?"
- "The test implies [requirement]. Is this correct, or should the spec say something different?"

#### Test Suite Implementation

Create an executable test suite that validates the design against the spec. **This is critical because visual analysis of 3D renders is unreliable** - I cannot accurately interpret rendered images to verify geometry.

```javascript
#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// 1. ENCODE THE SPEC AS CODE
const SPEC = {
    device: { width: 215, depth: 176, height: 63 },
    clearance: 0.5,
    wall: 5,
    tilt_angle: 12,
    shelf: { width: 10, thickness: 5, front: true, back: true, left: true, right: true },
    lip: { height: 10, front: true, back: false, left: true, right: true },
    // ... complete spec
};

// 2. CALCULATE DERIVED DIMENSIONS
const DERIVED = {};
function calculateDerived() {
    DERIVED.stand_width = SPEC.device.width + SPEC.clearance * 2 + SPEC.wall * 2;
    DERIVED.shelf_top_front = SPEC.front_height - SPEC.lip.height;
    DERIVED.shelf_top_back = DERIVED.shelf_top_front + DERIVED.pocket_d * Math.tan(SPEC.tilt_angle * Math.PI / 180);
    // ... all positions mathematically derived
}

// 3. EXPORT STL AND PARSE VERTICES
function parseSTL(stlFile) {
    const content = fs.readFileSync(stlFile, 'utf8');
    const vertices = [];
    const regex = /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        vertices.push({ x: parseFloat(match[1]), y: parseFloat(match[2]), z: parseFloat(match[3]) });
    }
    return vertices;
}

// 4. TEST GEOMETRY AT CALCULATED POSITIONS
test('Back shelf spans full width', (vertices) => {
    const edgeVertices = getVerticesInRegion(vertices,
        0, DERIVED.stand_width,           // Full X range
        DERIVED.back_shelf_y - 3, DERIVED.back_shelf_y + 3,  // At shelf edge
        DERIVED.shelf_z_back - 5, DERIVED.shelf_z_back + 5   // At shelf height
    );
    const xs = edgeVertices.map(v => v.x);
    const span = Math.max(...xs) - Math.min(...xs);
    return { pass: span >= 180, actual: span, expected: '>= 180mm' };
});
```

#### Key Testing Principles

**1. STL Vertex Analysis, Not Visual Inspection**
- Export model to STL, parse ASCII format for vertex positions
- Query vertices in specific regions to verify geometry exists
- Calculate expected positions mathematically from spec

**2. Check SPAN, Not Point Existence**
- STL flat surfaces only have vertices at EDGES, not in the middle
- Don't look for vertices at center of a flat face - they won't exist
- Instead, verify that edge vertices span the expected range

```javascript
// WRONG: Looking for vertices in center of flat surface
const centerVertices = getVerticesInRegion(vertices, centerX - 10, centerX + 10, ...);
// This fails because flat faces have no interior vertices!

// RIGHT: Check that edge vertices span across the expected region
const edgeVertices = getVerticesInRegion(vertices, 0, fullWidth, edgeY - 2, edgeY + 2, ...);
const xs = edgeVertices.map(v => v.x);
const span = Math.max(...xs) - Math.min(...xs);
const pass = span >= expectedWidth * 0.9;  // Spans most of the width
```

**3. Account for Tilted Geometry**
- For tilted surfaces, calculate Z position at each Y position
- Use `Z = base_z + (Y - start_y) * tan(tilt_angle)`

**4. Test at Feature Boundaries**
- Test where features START and END, not arbitrary middle points
- For a shelf from Y=5 to Y=15, test at Y≈5 and Y≈15

**5. Test Hollow Volumes at Multiple Positions**
- For hollow interiors, don't just check one region - check at multiple Y (or X) slices
- Especially important when interior connects to tilted surfaces
- A single-point check may pass while geometry fails to connect elsewhere

```javascript
// Test hollow interior at multiple Y positions along tilted axis
const slices = [20, 50, 100, 150];
slices.forEach(y => {
    // Calculate expected cavity top Z at this Y (accounting for tilt)
    const topZ = baseZ + (y - startY) * Math.tan(tiltAngle);

    const interiorVerts = getVerticesInRegion(vertices,
        innerXMin, innerXMax,
        y - 5, y + 5,
        floorZ + 2, topZ - 2  // Inside the cavity
    );

    // Should find NO vertices inside a hollow cavity
    assert(interiorVerts.length === 0, 'Interior should be hollow at Y=' + y);
});
```

**6. Write Defensive Tests (Positive AND Negative)**

For every test that asserts expected behavior, also write a test that ensures unexpected behavior doesn't occur. This catches regressions and unintended side effects.

```javascript
// POSITIVE: Test that feature EXISTS where expected
test('Shelf exists at front', (vertices) => {
    const shelfVerts = getVerticesInRegion(vertices,
        innerLeft, innerRight,
        frontY, frontY + shelfWidth,
        shelfZ - 2, shelfZ + 2
    );
    return { pass: shelfVerts.length >= 2 };
});

// DEFENSIVE: Test that feature does NOT exist where it shouldn't
test('NO shelf in center opening (battery access)', (vertices) => {
    const centerVerts = getVerticesInRegion(vertices,
        centerX - 30, centerX + 30,
        centerY - 30, centerY + 30,
        shelfZ - 2, shelfZ + 2
    );
    // Opening should be empty
    return { pass: centerVerts.length <= 2 };
});

// POSITIVE: Back lip is removed
test('Back has NO lip (open for cables)', (vertices) => {
    const lipVerts = getVerticesInRegion(vertices,
        centerX - 50, centerX + 50,
        backY - 5, backY + 5,
        shelfZ + 5, shelfZ + lipHeight + 5
    );
    return { pass: lipVerts.length <= 2 };
});

// DEFENSIVE: But side lips still exist
test('Side lips still exist after back removal', (vertices) => {
    const leftLipVerts = getVerticesInRegion(vertices,
        0, cornerR + 2,
        midY - 10, midY + 10,
        shelfZAtMidY, backHeight
    );
    return { pass: leftLipVerts.length >= 2 };
});
```

**Defensive Test Patterns:**

| Expected Behavior | Defensive Check |
|------------------|-----------------|
| Shelf exists on front | No shelf in opening |
| Lip on left/right | No lip on back |
| Hole cuts through wall | Hole doesn't cut too deep |
| Pocket has fillet | Sharp corner doesn't exist |
| Bottom chamfer exists | Full height not at Z=0 |
| Interior is hollow | No stray geometry inside |

#### Iterating on Tests

Tests themselves need iteration:

1. **Run tests, observe failures**
2. **Analyze diagnostic output** - dump vertices in region to understand actual geometry
3. **Adjust test logic** - if geometry exists but test fails, the test may be wrong
4. **Verify with known-good geometry** - if model is visually correct, tests should pass

```javascript
// Add diagnostic dumps to understand what's actually in the STL
test('DIAGNOSTIC: Back region vertices', (vertices) => {
    const region = getVerticesInRegion(vertices, 0, width, backY - 5, depth, shelfZ - 10, shelfZ + 20);
    console.log('Vertices in back region:');
    region.forEach(v => console.log(`  X:${v.x.toFixed(1)} Y:${v.y.toFixed(1)} Z:${v.z.toFixed(1)}`));
    return { pass: true };  // Diagnostic always passes
});
```

#### Why Tests Before Implementation

- **Forces precise specification** - ambiguity becomes test failures
- **Enables autonomous iteration** - I can run tests without visual interpretation
- **Documents expected behavior** - tests are executable requirements
- **Catches regressions** - changes that break geometry are detected
- **Validates my understanding** - if I misunderstood the spec, tests will fail

#### Test Performance Optimization

OpenSCAD export is the bottleneck. Optimize test runs with:

**1. STL Caching** - Skip re-export if .scad file hasn't changed:
```javascript
const CACHE_FILE = '/tmp/model-test-cache.json';

function isCacheValid() {
    if (!fs.existsSync(STL_FILE) || !fs.existsSync(CACHE_FILE)) return false;
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const stats = fs.statSync(SCAD_FILE);
    return cache.mtime === stats.mtimeMs;
}

function runOpenSCAD() {
    if (isCacheValid()) {
        console.log('Using cached STL...');
        return;
    }
    execSync(`"${OPENSCAD}" -D "$fn=16" -o "${STL_FILE}" "${SCAD_FILE}"`);
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ mtime: fs.statSync(SCAD_FILE).mtimeMs }));
}
```

**2. Lower $fn for tests** - Use `$fn=16` instead of production `$fn=64`:
```bash
openscad -D '$fn=16' -o test.stl model.scad
```

**Results**: ~30x speedup on cached runs (0.02s vs 0.7s), geometry accuracy preserved.

**3. Ghost Object Intersection Tests** - Verify contents don't clip through walls:
```javascript
test('Ghost device does not intersect shelf', (vertices) => {
    // Device bottom at shelf_z + small_gap, should not penetrate shelf
    const deviceBottomZ = DERIVED.shelf_top + 0.5;
    const intersectingVerts = getVerticesInRegion(vertices,
        deviceXMin, deviceXMax,
        deviceYMin, deviceYMax,
        deviceBottomZ, deviceBottomZ + deviceHeight
    );
    // Should find only shelf surface vertices, not internal geometry
    return { pass: intersectingVerts.length < threshold };
});
```

### Phase 4: Implementation

Only after tests are written **and the spec is validated through the test-writing process**, analyze in `<design_thinking>` tags:
1. **Geometry decomposition** - Break object into primitives and operations
2. **Parameter identification** - List all user-configurable dimensions
3. **Constraint validation** - Verify against manufacturing limits
4. **Print orientation** - Determine optimal build orientation
5. **Failure mode check** - Identify potential weak points

Then output code in `<scad_code>` tags followed by `<print_notes>` with orientation and settings.

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

## Critical Manufacturing Constraints

### Wall Thickness
| Application | Minimum | Recommended |
|------------|---------|-------------|
| Decorative | 0.8mm | 1.2mm |
| Structural | 1.6mm | 2.4mm |
| Load-bearing | 2.4mm | 3.2mm |

Always use multiples of nozzle width (0.4mm): 0.8, 1.2, 1.6, 2.0, 2.4, 3.2mm

### Tolerances
| Fit Type | Clearance | Use Case |
|----------|-----------|----------|
| Press fit | -0.1 to -0.2mm | Permanent joints |
| Snug fit | +0.1 to +0.2mm | Friction hold |
| Sliding fit | +0.3 to +0.4mm | Moving parts |
| Loose fit | +0.5mm+ | Easy assembly |

Add +0.4mm to designed hole diameters (holes print smaller).

### Overhangs and Bridging
- Maximum unsupported overhang: 45° from vertical
- Maximum bridge span: 10mm without sag
- Use teardrop shapes for horizontal holes
- Design chamfers instead of 90° overhangs

### Screw Holes
| Screw | Clearance Hole | Self-tap Pilot | Heat-set Insert |
|-------|---------------|----------------|-----------------|
| M2 | 2.4mm | 1.6mm | 3.2mm |
| M3 | 3.4mm | 2.5mm | 4.0mm |
| M4 | 4.5mm | 3.3mm | 5.6mm |
| M5 | 5.5mm | 4.2mm | 6.4mm |

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
