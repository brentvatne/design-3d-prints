---
name: cadquery-3d-printing
description: "PREFERRED for all 3D printing tasks. Use CadQuery (Python) instead of OpenSCAD for: creating 3D models, designing for 3D printing, parametric designs, device stands/holders, functional objects. CadQuery handles fillets, edge selection, and complex geometry that OpenSCAD cannot. Only fall back to OpenSCAD if user explicitly requests it or for trivial single-primitive shapes."
---

# CadQuery 3D Printing Design Skill

Generate reliable, printable CadQuery (Python) code for functional objects optimized for FDM 3D printing.

> ✅ **PREFERRED** for all 3D printing tasks. CadQuery handles edge fillets, chamfers, workplanes on arbitrary faces, and complex geometry that OpenSCAD cannot.

## When to Use This Skill

**Always use CadQuery for:**
- Device stands, holders, trays, cradles
- Any design requiring fillets or chamfers
- Geometry on sloped/tilted surfaces
- Complex multi-step boolean operations
- Designs requiring edge selection (fillet some edges, not others)

**Only use OpenSCAD when:**
- User explicitly requests OpenSCAD
- Editing existing `.scad` files
- Trivial single-primitive shapes with no edge treatments

## Why CadQuery Over OpenSCAD

| Challenge | OpenSCAD | CadQuery |
|-----------|----------|----------|
| Geometry on sloped surfaces | Manual trig, fragile | `faces(">Z").workplane()` |
| Different fillet radii | Nearly impossible | `edges().fillet()` with selectors |
| Adding geometry after booleans | Union with overlap hacks | Workplanes on any face |
| Lofting between profiles | Manual polyhedron | `loft()` built-in |
| Edge/face selection | Not possible | Full selector system |
| Shell operations | Manual difference | `shell()` built-in |

## Environment Setup

### Installation

```bash
# Option 1: pip (recommended)
pip install cadquery-ocp

# Option 2: conda
conda install -c conda-forge cadquery

# CQ-Editor (standalone IDE)
pip install cq-editor

# VS Code extension
# Install "OCP CAD Viewer" from marketplace
```

### Development Workflow

```bash
# Run CadQuery script
python my_design.py

# Export to STL
cq-cli export my_design.py output.stl

# Live preview with CQ-Editor
cq-editor my_design.py

# VS Code with OCP CAD Viewer
# Just open .py file and use command palette: "OCP: Show CAD"
```

## Design Process

### Phase 1: Requirements Gathering

Same structured questions as OpenSCAD skill - gather device dimensions, tilt angles, shelf/lip requirements, tolerances, etc.

### Phase 2: Formal Specification

Use the same specification template as OpenSCAD skill.

### Phase 3: Implementation

CadQuery uses a **fluent API** with method chaining. The mental model is different from OpenSCAD:

| OpenSCAD | CadQuery |
|----------|----------|
| CSG (add/subtract primitives) | B-rep (boundary representation) |
| `difference() { ... }` | `.cut(other)` |
| `union() { ... }` | `.union(other)` or `+` |
| `translate([x,y,z])` | `.translate((x,y,z))` |
| Start with primitives | Start with workplane, sketch, extrude |

## Code Structure

```python
#!/usr/bin/env python3
"""
Object Name - Brief description
"""

import cadquery as cq
from cadquery import exporters

# ============================================
# PARAMETERS
# ============================================

# User Parameters
width = 100          # Object width (mm)
depth = 80           # Object depth (mm)
height = 50          # Object height (mm)
wall = 3             # Wall thickness (mm)

# Tolerances
clearance = 0.3      # Fit clearance (mm)
shrinkage = 0.002    # Material shrinkage (0.2% for PLA)

# Derived (calculated)
inner_width = width - 2 * wall
inner_depth = depth - 2 * wall

# ============================================
# HELPER FUNCTIONS
# ============================================

def compensate(dim: float, material: str = "pla") -> float:
    """Compensate dimension for material shrinkage."""
    shrink = {"pla": 0.002, "petg": 0.004, "abs": 0.008}.get(material, 0)
    return dim * (1 + shrink)

# ============================================
# MAIN DESIGN
# ============================================

def create_model():
    """Create the main model."""
    result = (
        cq.Workplane("XY")
        .rect(width, depth)
        .extrude(height)
        .edges("|Z")
        .fillet(3)
    )
    return result

# ============================================
# EXPORT
# ============================================

if __name__ == "__main__":
    model = create_model()

    # Show in viewer (CQ-Editor or VS Code)
    show_object(model, name="main")

    # Export STL
    exporters.export(model, "output.stl")
```

## Core Concepts

### 1. Workplanes

Workplanes are the foundation. They define where you sketch and extrude.

```python
# Start on XY plane at origin
wp = cq.Workplane("XY")

# Move workplane up 10mm
wp = cq.Workplane("XY").workplane(offset=10)

# Create workplane on a face of existing geometry
result = (
    cq.Workplane("XY")
    .box(50, 30, 20)
    .faces(">Z")           # Select top face
    .workplane()           # Create workplane ON that face
    .circle(10)
    .extrude(15)           # Extrude up from top face
)
```

### 2. Sketching

Sketches are 2D geometry on a workplane.

```python
# Rectangle
.rect(width, height)

# Circle
.circle(radius)

# Polygon
.polygon(n_sides, diameter)

# Slot (rounded rectangle)
.slot2D(length, width)

# Arbitrary polyline
.polyline([(0,0), (10,0), (10,10), (0,10)])
.close()

# Spline
.spline([(0,0), (5,10), (10,0)], includeCurrent=True)
```

### 3. 3D Operations

```python
# Extrude (positive = up from workplane)
.extrude(height)

# Extrude both directions
.extrude(height, both=True)

# Cut (extrude into material)
.cutBlind(depth)

# Through cut
.cutThruAll()

# Revolve
.revolve(360)

# Loft between profiles
.loft()

# Sweep along path
.sweep(path)
```

### 4. Selectors (The Power Feature)

Selectors let you pick specific faces, edges, or vertices for operations.

```python
# Face selectors
.faces(">Z")       # Topmost face (max Z)
.faces("<Z")       # Bottommost face (min Z)
.faces("+Z")       # Faces with normal pointing +Z
.faces("-Y")       # Faces with normal pointing -Y
.faces("#Z")       # Faces perpendicular to Z
.faces("|Z")       # Faces parallel to Z axis

# Edge selectors
.edges(">Z")       # Highest edges
.edges("<Z")       # Lowest edges
.edges("|Z")       # Vertical edges (parallel to Z)
.edges("#Z")       # Horizontal edges (perpendicular to Z)
.edges(">X and >Y")  # Combine with and/or

# By position
.edges(cq.NearestToPointSelector((x, y, z)))

# By length
.edges(cq.selectors.LengthNthSelector(-1))  # Longest edges
.edges(cq.selectors.LengthNthSelector(0))   # Shortest edges

# Invert selection
.edges(">Z").edges("<Y", tag="my_edges")  # Tag for later

# Custom vector directions (for tilted surfaces)
.faces(">(0, 0.2, 0.98)")   # Face with normal ~12° from vertical
.edges(">(1, 1, 0)")        # Edges in diagonal direction
```

### 5. Filleting and Chamfering

```python
# Fillet all vertical edges
result = box.edges("|Z").fillet(3)

# Fillet only top edges
result = box.edges(">Z").fillet(2)

# Fillet specific edges
result = box.edges(">Z and >X").fillet(5)

# Chamfer
result = box.edges("|Z").chamfer(1)

# Variable fillet (different radii)
result = box.edges("|Z").fillet(3).edges(">Z").fillet(1)
```

### 5b. Internal Fillets After Boolean Operations

Filleting internal corners (like where a floor meets walls in a hollow compartment) requires special handling after boolean cuts.

**The Problem:** Boolean cuts create internal edges that standard selectors (`edges("<Z")`, `BoxSelector`) often fail to find reliably.

**Best Practices:**

1. **Pre-fillet before boolean** - Fillet the cutting solid's edges before performing the cut:
```python
# Build compartment separately with filleted edges
compartment = (
    cq.Workplane("XY")
    .workplane(offset=floor_thickness)
    .rect(inner_w, inner_d)
    .extrude(height)
)
# Fillet vertical edges while isolated
compartment = compartment.edges("|Z").fillet(radius)

# Then cut from main solid
result = solid.cut(compartment)
```

2. **Use NearestToPointSelector for remaining edges** - Target specific edges by their geometric center:
```python
# Floor-to-wall edges at Z = floor_thickness
floor_edge_points = [
    (0, -inner_d/2, floor_thickness),    # Front edge center
    (0, inner_d/2, floor_thickness),     # Back edge center
    (-inner_w/2, 0, floor_thickness),    # Left edge center
    (inner_w/2, 0, floor_thickness),     # Right edge center
]

for point in floor_edge_points:
    try:
        result = result.edges(
            cq.selectors.NearestToPointSelector(point)
        ).fillet(radius)
    except:
        pass  # Edge may not exist after complex booleans
```

3. **Use shell() when possible** - For simple hollow shapes, `shell()` creates cleaner internal geometry:
```python
# Preferred for uniform wall thickness
result = (
    cq.Workplane("XY")
    .rect(outer_w, outer_d)
    .extrude(height)
    .faces(">Z")
    .shell(-wall_thickness)
)
```

**Common Pitfalls:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Edge selection fails silently | Interior edges vanish after boolean | Pre-fillet cutting solid |
| NearestToPointSelector picks wrong edge | Multiple edges equidistant | Use more specific point on edge |
| Fillet causes invalid geometry | Radius too large for wall | Keep radius < 50% wall thickness |
| Some edges unfillettable | Topologically orphaned after cut | Accept or use shell() approach |

### 5c. Chamfering Remaining Sharp Edges

After applying fillets to specific edges, apply subtle chamfers to remaining sharp edges for a finished look.

**The Challenge:** Bulk chamfer operations often fail because:
- Some edges are too small for the chamfer radius
- Filleted edges (arcs) can't be chamfered
- Complex geometry creates edges that OCCT can't process

**Solution 1: Target edge groups by direction**

```python
subtle_chamfer = 0.5  # mm

# Horizontal edges (perpendicular to Z) - lip inner edges, shelf edges
try:
    result = result.edges("#Z").chamfer(subtle_chamfer)
except:
    pass

# Vertical edges (parallel to Z) - if not already filleted
try:
    result = result.edges("|Z").chamfer(subtle_chamfer)
except:
    pass

# Top edges - note: tilted surfaces may not have ">Z" edges
try:
    result = result.edges(">Z").chamfer(subtle_chamfer)
except:
    pass
```

**Solution 2: Use `%LINE` selector (excludes fillet arcs automatically)**

The `%LINE` selector works correctly - BRep_API errors come from subsequent fillet/chamfer operations on problematic geometry, not from the selector itself.

```python
# Select only straight edges - automatically excludes fillet arcs (%CIRCLE)
result = result.edges("%LINE").chamfer(0.3)

# Combine with direction
result = result.edges("%LINE and >Z").chamfer(0.3)

# Exclude circles (arcs are classified as %CIRCLE, not %ARC)
result = result.edges("not %CIRCLE").chamfer(0.3)
```

**If chamfer/fillet fails after boolean operations**, use `.clean()`:
```python
result = (
    part1.union(part2)
    .clean()  # Clean up topology - fixes many BRep_API errors
    .edges("%LINE")
    .fillet(0.5)
)
```

**Available type selectors:** `%LINE`, `%CIRCLE` (includes arcs), `%ELLIPSE`, `%BSPLINE`, `%BEZIER`

**Programmatic alternative if string syntax fails:**
```python
from cadquery.selectors import TypeSelector, InverseSelector

# Equivalent to "not %CIRCLE"
result = result.edges(InverseSelector(TypeSelector("CIRCLE"))).chamfer(0.3)
```

**Solution 3: Filter by minimum length (skip edges too small for chamfer)**

CadQuery has built-in methods for filtering edges by length:

```python
# Method 1: Use .filter() with lambda (simplest)
chamfer_size = 0.5
min_length = chamfer_size * 3  # Edges must be 3x chamfer size

result = result.edges("#Z").filter(
    lambda e: e.Length() >= min_length
).chamfer(chamfer_size)

# Method 2: Use LengthNthSelector to get longest/shortest edges
from cadquery.selectors import LengthNthSelector

# Select longest edges
result.edges(LengthNthSelector(-1)).fillet(3)

# Select shortest edges
result.edges(LengthNthSelector(0)).chamfer(0.3)

# Method 3: Custom MinLengthSelector (reusable)
from cadquery import Selector

class MinLengthSelector(Selector):
    def __init__(self, min_length):
        self.min_length = min_length

    def filter(self, objectList):
        return [o for o in objectList if o.Length() >= self.min_length]

result = result.edges(MinLengthSelector(1.5)).chamfer(0.5)
```

> 💡 **Tip:** The `cq-kit` library provides `EdgeLengthSelector` with string constraints like `EdgeLengthSelector(">5.0")`

**Key insights:**
- `#Z` (perpendicular to Z) catches horizontal edges like lip tops and shelf edges
- `>Z` only works for truly horizontal top surfaces, not tilted ones
- `%LINE` selects only straight edges, automatically excluding fillet arcs
- Filleted edges (arcs) are automatically excluded from directional selectors
- Wrap each chamfer in try/except - some will fail, that's OK
- Use small chamfer values (0.3-0.8mm) to avoid geometry failures
- Filter by minimum edge length (3x chamfer size) to prevent failures

### 5d. Selecting Edges on Tilted Surfaces

Standard selectors like `edges(">Z")` don't work for tilted faces. Use these patterns instead:

**Pattern 1: Select face first, then get its edges**
```python
# Select tilted face, then all its edges
tilted_edges = wedge.faces(">(0, 0.2, 0.98)").edges()

# Filter edges on the tilted face
front_edge = wedge.faces(">(0, 0.2, 0.98)").edges("<Y")
```

**Pattern 2: Custom vector with ParallelDirSelector**
```python
import math
from cadquery.selectors import ParallelDirSelector
from cadquery import Vector

# For 12-degree tilt from horizontal
tilt_rad = math.radians(12)
tilted_normal = Vector(0, -math.sin(tilt_rad), math.cos(tilt_rad))

# Select faces with this normal
tilted_face = wedge.faces(ParallelDirSelector(tilted_normal, tolerance=0.05))

# Get all boundary edges
all_edges = tilted_face.edges()
```

**Pattern 3: Direct API for boundary edges**
```python
# Get the face object
face_obj = wedge.faces(">(0, 0.2, 0.98)").val()

# Get outer boundary wire and its edges
outer_edges = face_obj.outerWire().Edges()

# For inner boundaries (holes)
inner_wires = face_obj.innerWires()
```

**String syntax for custom vectors:**
```python
# Face normal pointing roughly up-back at 12 degrees
wedge.faces(">(0, 0.2, 0.98)")

# Edges in diagonal direction
wedge.edges(">(1, 1, 0)")
```

> 💡 **Key insight:** String selectors like `">Z"` evaluate edge **direction** (tangent vector), not the face they belong to. For tilted surfaces, select the face first with `.faces()`, then call `.edges()` to get its boundary.

### 6. Boolean Operations

```python
# Union
result = part1.union(part2)
result = part1 + part2  # Shorthand

# Difference (cut)
result = part1.cut(part2)
result = part1 - part2  # Shorthand

# Intersection
result = part1.intersect(part2)
result = part1 & part2  # Shorthand
```

> 💡 **Tip:** After boolean operations, use `.clean()` to fix topology issues that cause fillet/chamfer failures:
> ```python
> result = part1.union(part2).clean().edges("|Z").fillet(3)
> ```

### 6b. Sequential Cuts and Overlap

When making multiple cuts that meet at a boundary, **always overlap the cuts slightly** to avoid leftover geometry artifacts.

**The Problem:** Two adjacent cuts that meet exactly at a boundary can leave small protrusions or ledges due to:
- Floating point precision
- Filleted edges on one cut not reaching the other
- Profile edges that don't perfectly align

**Solution: Overlap cuts by 1-5mm**

```python
# BAD: Cuts meet exactly at boundary
pocket_cut_depth = pocket_d                    # Ends at pocket_d
back_opening_start = pocket_d                  # Starts at pocket_d
# Result: Small protrusions at junction

# GOOD: Extend one cut to overlap
pocket_cut_depth = pocket_d + 5                # Extends past pocket_d
back_opening_start = pocket_d                  # Starts at pocket_d
# Result: Clean junction, no artifacts
```

**When to use:**
- Multiple cuts that share a boundary (pocket + back opening)
- Cuts with filleted edges meeting unfilleted regions
- Any sequential cuts where geometry must flow seamlessly

**Which cut to extend:** Extend the cut whose extra depth doesn't affect functional dimensions. In a device tray:
- Extending pocket depth into an open back area = OK (back is open anyway)
- Extending back opening into pocket = changes where device sits

### 6c. Wall Thickness and Fillet Radius Relationship

When wall thickness equals fillet radius, vertical fillets terminate cleanly at the inner wall surface.

**The Rule: `wall = corner_r` for clean corners**

```python
wall = 5        # Wall thickness
corner_r = 5    # Outer vertical fillet radius (same as wall)
```

**Why this matters:**
- Fillet curves inward by `corner_r` from outer edge
- If `corner_r > wall`, fillet extends past inner surface → creates notch/ledge
- If `corner_r = wall`, fillet terminates exactly at inner surface → clean transition
- If `corner_r < wall`, fillet contained within wall → small flat remains

**Application:** When a filleted wall meets an opening (like back of a tray), matching wall and fillet radius ensures:
- No ledge where fillet overshoots
- No notch where surfaces awkwardly intersect
- Continuous wrap-around blend at corners

### 7. Shell (Hollow Out)

> ⚠️ **Limitations:** `shell()` only works for simple uniform hollowing. It does NOT work for:
> - Tilted interior ceilings (like wedge-shaped compartments)
> - Non-uniform wall thicknesses
> - Interior shelves at specific heights
> - Complex multi-level interiors
>
> For these cases, use explicit boolean cuts with pre-filleted cutting solids (see Section 5b).

```python
# Shell with uniform wall thickness
# Negative = hollow inside, positive = hollow outside
result = box.shell(-wall_thickness)

# Shell leaving specific faces open
result = (
    box
    .faces(">Z")           # Select top face
    .shell(-wall_thickness)  # Hollow, leaving top open
)

# Shell multiple open faces
result = (
    box
    .faces(">Z or <Z")     # Top and bottom
    .shell(-wall_thickness)
)
```

## Common Patterns

### Device Tray/Stand with Lips

When building a tilted tray with raised lips (like a device stand), use these patterns:

**1. Side lips extending to back:**
Make the back opening cut narrower than the full stand width so side lips extend to the back:

```python
# Back opening only removes the middle (pocket_w wide), leaving side lips intact
back_opening = back_opening_profile.extrude(pocket_w)  # NOT stand_width
back_opening = back_opening.translate((-pocket_w/2, -pocket_d/2, 0))
```

**2. Pocket cut extending to full depth:**
Extend the pocket cut all the way to `stand_depth` to eliminate ledges at back corners:

```python
# Extend pocket to full stand depth for clean back geometry
pocket_cut_depth = stand_depth  # NOT pocket_d
```

**3. Construction order for trays:**
```python
# 1. Create outer wedge shell with rounded vertical edges
# 2. Hollow out battery/storage compartment (stops at shelf level)
# 3. Cut pocket (device area) - extend to full depth
# 4. Cut back opening (narrower than full width to preserve side lips)
# 5. Cut shelf opening (access to compartment)
# 6. Cut cable holes
# 7. Apply corner blends at back corners
# 8. Apply subtle chamfers to remaining horizontal edges (#Z selector)
```

**4. Why this works:**
- Side lips are part of original outer shell, not leftover material
- No seams between lips and main body
- Pocket extending to full depth eliminates corner ledges
- Back opening being narrower preserves continuous side lip geometry

### Parametric Box with Lid

```python
def box_with_lid(inner_w, inner_d, inner_h, wall=2.4, lid_overlap=5):
    """Create a box and matching lid."""

    outer_w = inner_w + wall * 2
    outer_d = inner_d + wall * 2
    outer_h = inner_h + wall

    # Box body
    box = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(outer_h)
        .edges("|Z")
        .fillet(3)
        .faces(">Z")
        .shell(-wall)  # Hollow, open top
    )

    # Lid
    lid_clearance = 0.25
    lid = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(wall)
        .edges("|Z")
        .fillet(3)
        # Inner lip
        .faces("<Z")
        .workplane(invert=True)
        .rect(inner_w - lid_clearance*2, inner_d - lid_clearance*2)
        .extrude(lid_overlap)
        .edges("|Z and <Z")
        .fillet(1)
    )

    return box, lid
```

### Wedge Stand (Simplified Example)

> ⚠️ **Warning:** This simplified example uses `.transformed(rotate=...)` and frame extrusion for lips. For production tilted trays with integrated lips, use the **Device Tray/Stand with Lips** pattern above instead, which uses strategic cut ordering to create seamless geometry.

```python
def wedge_stand_simple(
    device_w, device_d, device_h,
    tilt_angle=12,
    wall=5,
    lip_height=10,
    shelf_width=10
):
    """
    Simplified device stand - demonstrates tilted workplane concept.
    For production use, see Device Tray/Stand with Lips pattern.
    """

    import math

    clearance = 0.5
    pocket_w = device_w + clearance * 2
    pocket_d = device_d + clearance * 2
    stand_w = pocket_w + wall * 2
    stand_d = pocket_d + wall * 2

    front_height = 50
    tilt_rise = stand_d * math.tan(math.radians(tilt_angle))
    back_height = front_height + tilt_rise

    # Create wedge by extruding side profile
    stand = (
        cq.Workplane("YZ")
        .moveTo(0, 0)
        .lineTo(stand_d, 0)
        .lineTo(stand_d, back_height)
        .lineTo(0, front_height)
        .close()
        .extrude(stand_w)
        .translate((-stand_w/2, -stand_d/2, 0))
    )

    # Round vertical edges
    stand = stand.edges("|Z").fillet(wall)  # wall = corner_r

    # NOTE: For lips that extend to back corners, use cut-based approach
    # from Device Tray/Stand pattern, not frame extrusion

    return stand
```

### L-Bracket with Different Fillet Radii

```python
def l_bracket(arm_a=50, arm_b=60, width=40, thickness=4):
    """L-bracket with large outer fillet, small inner fillet."""

    # Create L-shape
    bracket = (
        cq.Workplane("XY")
        # Vertical arm
        .rect(thickness, width)
        .extrude(arm_a)
        # Horizontal arm
        .faces("<Z")
        .workplane()
        .center(0, width/2 - thickness/2)
        .rect(arm_b, thickness)
        .extrude(-thickness)
    )

    # Large outer fillet on outside corner
    bracket = bracket.edges(">X and >Z").fillet(10)

    # Small inner fillet for stress relief
    bracket = bracket.edges("<X and <Z and |Y").fillet(2)

    # Round all vertical edges
    bracket = bracket.edges("|Z").fillet(2)

    return bracket
```

### Snap-Fit Clip

```python
def snap_clip(length=15, width=8, thickness=1.5, hook_height=2):
    """Cantilever snap-fit clip."""

    # Base
    clip = (
        cq.Workplane("XY")
        .rect(thickness * 2, width)
        .extrude(5)  # Base height
    )

    # Cantilever beam
    clip = (
        clip
        .faces(">Z")
        .workplane()
        .center(0, 0)
        .rect(thickness, width)
        .extrude(length)
    )

    # Hook at end
    clip = (
        clip
        .faces(">Z")
        .workplane()
        # Angled entry ramp
        .center(thickness/2, 0)
        .lineTo(hook_height, 0)
        .lineTo(hook_height, -width/2)
        .lineTo(0, -width/2)
        .close()
        .extrude(hook_height)
    )

    return clip
```

## Manufacturing Constraints

Same constraints as OpenSCAD skill:

| Application | Min Wall | Recommended |
|-------------|----------|-------------|
| Decorative | 0.8mm | 1.2mm |
| Structural | 1.6mm | 2.4mm |
| Load-bearing | 2.4mm | 3.2mm |

### Tolerances

```python
# Fit type constants
CLEARANCE_LOOSE = 0.4
CLEARANCE_FREE = 0.25
CLEARANCE_CLOSE = 0.15
INTERFERENCE_LIGHT = -0.05

# Usage
hole_d = nominal_d + CLEARANCE_FREE
shaft_d = nominal_d - CLEARANCE_FREE
```

### Self-Supporting Angles

```python
# Maximum overhang without supports
MAX_OVERHANG = 45  # degrees

# Teardrop hole for horizontal printing
def teardrop_hole(d, h):
    """Horizontal hole that prints without supports."""
    return (
        cq.Workplane("XY")
        .circle(d/2)
        .polygon(4, d/2 * 1.414, circumscribed=True)  # Diamond
        .extrude(h)
    )
```

## Testing and Validation

### Visual Inspection for Seams

When reviewing model changes, check for undesirable seams:

1. **What to look for:**
   - Visible lines where two cut surfaces meet
   - Unexpected edges running across flat areas
   - Steps or ledges at geometry transitions

2. **Common causes:**
   - Multiple boolean cuts meeting at a boundary
   - Filleted edges meeting unfilleted edges
   - Overlapping cuts that don't perfectly align

3. **Verification:**
   - Render from multiple angles in OpenSCAD or viewer
   - **Important:** OpenSCAD may show false seams where coplanar surfaces meet - verify in actual STL viewer (Bambu Studio, PrusaSlicer, etc.)
   - Real seams will appear as edges in the slicer preview

4. **Fixes:**
   - Combine multiple cuts into single unified shapes
   - Ensure boolean cuts overlap slightly into already-cut regions
   - Match fillet radii at transitions

### Corner Blends (Ball Corners / Wrap-Around Fillets)

When a vertical fillet meets a horizontal edge at a corner, a **continuous wrap-around fillet** creates a smooth, professional appearance (like on consumer electronics).

**Terminology:**
- "Ball corner" / "vertex blend" - spherical surface where 3 equal-radius fillets meet
- "Wrap-around fillet" - continuous fillet that flows around a corner
- "G2 continuous" - smooth curvature continuity at transitions

**Implementation approaches:**

1. **Equal-radius fillets (preferred):** Apply same fillet radius to all converging edges - OCCT kernel creates spherical blend automatically:
```python
# All vertical edges with same radius creates automatic ball corners
result = box.edges("|Z").fillet(8)
```

2. **Fillet corner edges after construction:** Target specific corner edges after main geometry:
```python
corner_point = (x, y, z)  # Near corner vertex
result = result.edges(
    cq.selectors.NearestToPointSelector(corner_point)
).fillet(radius)
```

3. **Sphere subtraction (fallback):** Less ideal - creates distinct cut rather than continuous surface:
```python
sphere = cq.Workplane().sphere(radius).translate(corner_point)
result = result.cut(sphere)
```

**Key insight:** For true wrap-around fillets, the fillet operations must be applied in the right order and with matching radii so OCCT can blend them automatically. Sphere cuts create visible transitions rather than continuous surfaces.

### Bounding Box Check

```python
def check_bed_fit(model, bed_x=220, bed_y=220, bed_z=250):
    """Verify model fits on print bed."""
    bb = model.val().BoundingBox()
    size = (bb.xlen, bb.ylen, bb.zlen)

    fits = size[0] <= bed_x and size[1] <= bed_y and size[2] <= bed_z

    print(f"Model size: {size[0]:.1f} x {size[1]:.1f} x {size[2]:.1f} mm")
    print(f"Fits on bed: {'Yes' if fits else 'NO'}")

    return fits
```

### Volume Calculation

```python
def estimate_material(model, density_g_cm3=1.24):
    """Estimate material usage (PLA density = 1.24 g/cm³)."""
    volume_mm3 = model.val().Volume()
    volume_cm3 = volume_mm3 / 1000
    mass_g = volume_cm3 * density_g_cm3

    print(f"Volume: {volume_cm3:.1f} cm³")
    print(f"Mass: {mass_g:.1f} g")

    return volume_cm3, mass_g
```

### Export

```python
from cadquery import exporters

# STL export
exporters.export(model, "output.stl")

# STEP export (preserves B-rep, good for CAM)
exporters.export(model, "output.step")

# STL with tolerance
exporters.export(model, "output.stl", tolerance=0.01, angularTolerance=0.1)
```

## IDE Integration

### CQ-Editor

```python
# show_object() displays in CQ-Editor
show_object(model, name="main", options={"color": "steelblue"})

# Debug objects
show_object(debug_shape, name="debug", options={"alpha": 0.3})

# Log messages
log(f"Model size: {size}")
```

### VS Code with OCP CAD Viewer

```python
# Same show_object() works with OCP CAD Viewer extension
show_object(model)

# Multi-part assembly
show_object(part1, name="base")
show_object(part2.translate((0, 0, 50)), name="lid")
```

## Comparison: Same Design in Both Languages

### OpenSCAD

```openscad
module rounded_box(w, d, h, r) {
    hull() {
        for (x = [r, w-r])
        for (y = [r, d-r])
            translate([x, y, 0])
            cylinder(r=r, h=h, $fn=32);
    }
}

difference() {
    rounded_box(100, 60, 40, 5);
    translate([3, 3, 3])
        rounded_box(94, 54, 40, 3);
}
```

### CadQuery

```python
result = (
    cq.Workplane("XY")
    .rect(100, 60)
    .extrude(40)
    .edges("|Z").fillet(5)
    .faces(">Z").shell(-3)
)
```

**Lines of code:** OpenSCAD: 12 → CadQuery: 6
**Key difference:** CadQuery's `shell()` and `fillet()` work on existing geometry without manual calculation.

## Additional Resources

See reference files:
- `references/design-patterns.md` - Common CadQuery patterns
- `references/selectors.md` - Complete selector reference
- `references/manufacturing.md` - Print constraints and tolerances
- `examples/` - Working Python files

External resources:
- [CadQuery Documentation](https://cadquery.readthedocs.io/)
- [CQ-Editor](https://github.com/CadQuery/CQ-editor)
- [VS Code OCP CAD Viewer](https://marketplace.visualstudio.com/items?itemName=bernhard-42.ocp-cad-viewer)
