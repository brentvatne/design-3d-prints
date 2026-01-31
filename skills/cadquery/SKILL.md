---
name: cadquery
description: "PREFERRED implementation tool for 3D printing. Use after `3d-print-design` skill gathers requirements. CadQuery (Python) handles fillets, edge selection, workplanes on faces, and complex geometry. Only fall back to OpenSCAD if user explicitly requests it."
---

# CadQuery 3D Printing Design Skill

Generate reliable, printable CadQuery (Python) code for functional objects optimized for FDM 3D printing.

> ✅ **PREFERRED** for all 3D printing tasks. CadQuery handles edge fillets, chamfers, workplanes on arbitrary faces, and complex geometry that OpenSCAD cannot.

> 🎨 **DEFAULT EDGE TREATMENTS** - Apply these automatically unless user specifies otherwise:
> | Location | Treatment | Size | Purpose |
> |----------|-----------|------|---------|
> | Vertical edges (`\|Z`) | Fillet | 5-8mm (or = wall thickness) | Comfortable grip, aesthetics |
> | Bottom edges (`<Z`) | Chamfer | 0.4-0.6mm | Elephant foot prevention |
> | Top edges (`>Z`) | Chamfer | 0.3-0.5mm | Chip/break prevention |
> | Interior corners | Fillet | 2-3mm | Stress relief |
> | Pocket edges | Fillet | 1-2mm | Smooth device insertion |
>
> These make prints look professional and feel good in hand. Skip only if user explicitly wants sharp edges.

> ⚠️ **MANDATORY:** After writing any design, you MUST:
> 1. **Run the code** immediately to verify it executes without errors
> 2. **Run validation** using `validate_design()` (see "Mandatory Validation" section)
> 3. **Only export STLs** if all validation checks pass
>
> Never hand off STL files to the user without running validation first.

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

## Prerequisites

> 📋 **Use `3d-print-design` skill first** to gather requirements and create a formal specification. This skill is for implementation only.

See also: `../shared/manufacturing.md` for tolerances, hardware data, and printer constraints.

## CadQuery Fundamentals

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

Basic 2D geometry on a workplane:

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

### 2b. Sketch API (Advanced 2D)

The Sketch module provides powerful 2D geometry construction with boolean operations and constraints:

```python
# Basic sketch with boolean operations
result = (
    cq.Workplane("XY")
    .sketch()
    .trapezoid(4, 3, 90)                    # Base shape
    .vertices()
    .circle(0.5, mode="s")                  # Subtract circles at vertices
    .reset()
    .vertices()
    .fillet(0.25)                           # Fillet the trapezoid vertices
    .finalize()
    .extrude(1)
)

# Sketch modes: 'a' (add/fuse), 's' (subtract), 'i' (intersect), 'c' (construction)
```

**In-place sketch on existing geometry:**
```python
result = (
    cq.Workplane("XY")
    .box(10, 10, 1)
    .faces(">Z")
    .sketch()                               # Start sketching on top face
    .circle(3)
    .rect(2, 6, mode="s")                   # Subtract rectangle
    .finalize()
    .extrude(2)                             # Extrude the sketch result
)
```

**Edge-based sketching:**
```python
sketch = (
    cq.Sketch()
    .segment((0, 0), (10, 0))
    .segment((10, 5))
    .arc((5, 7), (0, 5))
    .segment((0, 0))
    .assemble()                             # Convert edges to face
    .vertices()
    .fillet(0.5)
)
result = cq.Workplane("XY").placeSketch(sketch).extrude(2)
```

### 2c. Construction Geometry

Use `forConstruction=True` to create reference geometry for positioning features:

```python
# Position holes at corners of a construction rectangle
result = (
    cq.Workplane("XY")
    .box(100, 60, 10)
    .faces(">Z")
    .workplane()
    .rect(80, 40, forConstruction=True)     # Not part of final geometry
    .vertices()                              # Select the 4 corners
    .hole(5)                                 # Hole at each corner
)
```

### 2d. Rectangular Arrays (rarray)

Create grid patterns for mounting holes, features:

```python
# Grid of holes
result = (
    cq.Workplane("XY")
    .box(100, 60, 10)
    .faces(">Z")
    .workplane()
    .rarray(20, 15, 4, 3, center=True)      # 4x3 grid, 20mm x 15mm spacing
    .hole(3)                                 # Hole at each grid point
)

# Bumps on a surface (like LEGO)
result = (
    cq.Workplane("XY")
    .box(48, 16, 3)
    .faces(">Z")
    .workplane()
    .rarray(8, 8, 6, 2, center=True)        # 6x2 grid, 8mm pitch
    .circle(2.4)
    .extrude(1.8)
)
```

### 2e. Stack Navigation

Navigate the operation chain with tags:

```python
result = (
    cq.Workplane("XY")
    .box(10, 10, 10)
    .faces(">Z")
    .workplane()
    .tag("top_plane")                        # Save this workplane state
    .center(-3, 0)
    .circle(1)
    .extrude(3)
    .workplaneFromTagged("top_plane")        # Return to saved state
    .center(3, 0)
    .circle(1)
    .extrude(2)
)

# Go back one step in chain
.end()
```

**Tagging for later selection:**
```python
result = (
    cq.Workplane("XY")
    .polygon(3, 5)
    .extrude(4)
    .tag("prism")                            # Tag the prism
    .sphere(10)                              # Add sphere that obscures prism
    .faces("<X", tag="prism")                # Select prism's face through sphere
    .workplane()
    .circle(1)
    .cutThruAll()
)
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

#### Basic Selectors

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

# Type selectors (filter by geometry type)
.edges("%Line")    # Straight edges only (excludes arcs)
.edges("%Circle")  # Arcs and circles only
.faces("%Plane")   # Planar faces only
```

#### Combining Selectors

Use `and`, `or`, `not`, and `exc` (set difference) to combine selectors:

```python
# Both conditions must be true
.edges("|Z and >Y").chamfer(0.2)

# Either condition
.faces(">Z or <Z").shell(-2)

# Invert selection - fillet only interior edges
.edges("not(<X or >X or <Y or >Y)").fillet(1)

# Complex expressions with parentheses
.faces(">Z").edges("not(<X or >X or <Y or >Y)").chamfer(0.1)
```

#### Nth Selectors (Positional)

Select by position in sorted order - essential for multi-tier designs:

```python
# By direction (normal/tangent must align with axis)
.faces(">Z[0]")    # 1st closest face with normal in +Z
.faces(">Z[-1]")   # Farthest (same as >Z)
.faces(">Z[-2]")   # 2nd farthest

# By center position (works for any geometry)
.edges(">>Y[-2]")  # 2nd farthest edge by center position
.faces("<<Z[0]")   # 1st closest face by center

# Use cases
.faces(">Z[1]")    # Second shelf from top
.edges(">X[-2]")   # 2nd farthest edge in X direction
```

#### By Position and Length

```python
# By position
.edges(cq.NearestToPointSelector((x, y, z)))

# By length
.edges(cq.selectors.LengthNthSelector(-1))  # Longest edges
.edges(cq.selectors.LengthNthSelector(0))   # Shortest edges

# By area (for faces/wires)
.wires(cq.selectors.AreaNthSelector(-1))    # Largest wire
.wires(cq.selectors.AreaNthSelector(0))     # Smallest wire
```

#### Topological Selectors

Navigate geometry relationships:

```python
# Find faces containing a specific edge
.faces(">Z").edges("<Y").ancestors("Face")

# Find all edges connected to a face
.faces(">Z").siblings("Edge")
```

#### Programmatic Selection

When string selectors aren't enough:

```python
# Filter with lambda
.edges().filter(lambda e: e.Length() >= 3).fillet(1)

# Sort and slice
.edges().sort(lambda e: e.Length())[-3:].fillet(3)  # 3 longest

# Index directly
.edges()[2:5].chamfer(0.3)
```

#### Custom Vector Directions

For tilted surfaces:

```python
# Face with normal at ~12° from vertical
.faces(">(0, 0.2, 0.98)")

# Pre-calculated vectors for common tilts:
# 10°: (0, 0.174, 0.985)
# 12°: (0, 0.208, 0.978)
# 15°: (0, 0.259, 0.966)
# 30°: (0, 0.500, 0.866)
# 45°: (0, 0.707, 0.707)

# Edges in diagonal direction
.edges(">(-1, 1, 0)")
```

> 📋 **Complete reference:** See `references/selectors.md` for the full selector cheatsheet.

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

#### Chamfer Applications (Beyond Elephant Foot)

| Location | Size | Purpose |
|----------|------|---------|
| Bottom perimeter | 0.4-0.6mm | Elephant foot compensation |
| Top edges | 0.3-0.5mm | Prevent chipping, soften appearance |
| Hole entries | 0.5-1mm | Guide screws, ease insertion |
| Mating surface edges | 0.3mm | Hide alignment imperfections |
| Sharp internal corners | 0.5mm | Easier to clean, less stress than sharp |

**Chamfer vs Fillet decision:**
- Chamfer: faster to print (flat vs curve), industrial look
- Fillet: stronger (no stress riser), softer feel, organic look
- Mix: chamfer top/bottom, fillet vertical edges = modern tech aesthetic

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

### Case Seam Lip (Two-Part Enclosure)

Create mating surfaces for box + lid designs using `offset2D()` and `toPending()`:

```python
def enclosure_with_lip(outer_w, outer_d, outer_h, wall=2, lip_h=3, lip_inset=1.5):
    """
    Two-part enclosure with mating lip.
    Bottom case has inner lip, top lid has groove that fits over it.
    """
    lid_h = outer_h * 0.3
    base_h = outer_h - lid_h + lip_h  # Overlap at seam

    # === BOTTOM CASE ===
    base = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(base_h)
        .edges("|Z").fillet(3)
        .faces(">Z").shell(-wall)
    )

    # Get inner and outer wires of the opening
    outer_wire = base.faces(">Z").wires(cq.selectors.AreaNthSelector(-1))
    inner_wire = base.faces(">Z").wires(cq.selectors.AreaNthSelector(0))

    # Create inner lip by offsetting inner wire inward and extruding
    lip = (
        inner_wire.toPending()
        .workplane()
        .offset2D(-lip_inset)
        .extrude(lip_h)
    )
    base = base.union(lip)

    # === TOP LID ===
    lid = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(lid_h)
        .edges("|Z").fillet(3)
        .faces("<Z").shell(-wall)
    )

    # Cut groove for lip (slightly larger for clearance)
    groove_clearance = 0.25
    groove = (
        lid.faces("<Z")
        .workplane(invert=True)
        .rect(outer_w - 2*wall - groove_clearance,
              outer_d - 2*wall - groove_clearance)
        .rect(outer_w - 2*wall - 2*lip_inset + groove_clearance,
              outer_d - 2*wall - 2*lip_inset + groove_clearance)
        .extrude(lip_h + groove_clearance)
    )
    lid = lid.cut(groove)

    return base, lid
```

**Key methods used:**
- `AreaNthSelector(-1)` - largest wire (outer edge)
- `AreaNthSelector(0)` - smallest wire (inner edge after shell)
- `toPending()` - converts selection to pending wire for operations
- `offset2D()` - offsets 2D profile inward/outward

### Multi-Part Assemblies

For prints requiring multiple mating parts, use the Assembly API:

```python
import cadquery as cq

def create_assembly():
    # Create individual parts
    base = cq.Workplane("XY").box(50, 50, 10).faces(">Z").shell(-2)
    lid = cq.Workplane("XY").box(50, 50, 5)

    # Create assembly with constraints
    assy = (
        cq.Assembly(base, name="base", color=cq.Color("steelblue"))
        .add(lid, name="lid", color=cq.Color(0.8, 0.2, 0.2, 0.7))
        .constrain("base@faces@>Z", "lid@faces@<Z", "Plane")
        .solve()
    )

    return assy

# Export assembly
assy = create_assembly()
assy.save("enclosure.step")                    # Multi-body STEP
assy.save("enclosure.stl", exportType="STL")   # Fused STL
```

**Constraint types:**
| Constraint | Description |
|------------|-------------|
| `Plane` | Faces touch, normals opposite |
| `Axis` | Cylindrical features align |
| `Point` | Vertices meet |
| `PointInPlane` | Vertex lies on face |
| `FixedPoint` | Lock absolute position |

**Constraint selector syntax:** `"part_name@faces@>Z"` or `"part_name?tag_name"`

### Loft Between Profiles

Smooth transition between different shapes:

```python
# Rectangle to circle transition
result = (
    cq.Workplane("XY")
    .rect(20, 15)                    # Bottom: rectangle
    .workplane(offset=30)
    .circle(8)                       # Top: circle
    .loft()
)

# Multi-section loft
result = (
    cq.Workplane("XY")
    .rect(20, 20)
    .workplane(offset=15)
    .polygon(6, 15)                  # Hexagon in middle
    .workplane(offset=15)
    .circle(5)                       # Circle at top
    .loft()
)
```

### Split for Multi-Part Printing

Split large objects into printable sections:

```python
# Split horizontally at Z=50
result = (
    cq.Workplane("XY")
    .box(100, 100, 100)
    .faces(">Z[-1]")                 # Select middle horizontal plane
    .workplane(offset=-50)
    .split(keepTop=True, keepBottom=True)
)

# Returns tuple: (top_half, bottom_half)
top, bottom = result.all()

# Export separately
exporters.export(top, "top_half.stl")
exporters.export(bottom, "bottom_half.stl")
```

### Living Hinges

For single-piece enclosures with fold-over lids:

```python
def living_hinge(width, length=3, thickness=0.4, num_cuts=10):
    """
    Living hinge for fold-over designs.

    Print flat, hinge line perpendicular to layers.
    - PLA: 0.3-0.4mm thick, ~100 cycles before breaking
    - PETG: 0.4-0.5mm thick, ~1000 cycles
    """
    hinge = cq.Workplane("XY").rect(width, length).extrude(thickness)

    # Stress-relief cuts
    cut_spacing = width / (num_cuts + 1)
    cut_width = cut_spacing * 0.6

    for i in range(num_cuts):
        x = -width/2 + cut_spacing * (i + 1)
        hinge = (
            hinge.faces(">Z").workplane()
            .center(x, 0)
            .rect(cut_width, length * 0.8)
            .cutThruAll()
        )

    return hinge
```

### Heat-Set Insert Bosses

```python
def heat_set_insert_boss(thread_size="M3", height=None):
    """
    Boss optimized for heat-set inserts.

    Dimensions by size:
    | Size | Hole D | Boss D | Min Height |
    |------|--------|--------|------------|
    | M2   | 3.2mm  | 6mm    | 4mm        |
    | M2.5 | 3.5mm  | 7mm    | 5mm        |
    | M3   | 4.0mm  | 8mm    | 6mm        |
    | M4   | 5.6mm  | 10mm   | 8mm        |
    | M5   | 6.4mm  | 12mm   | 10mm       |
    """
    dims = {
        "M2":   {"hole": 3.2, "boss": 6, "height": 4},
        "M2.5": {"hole": 3.5, "boss": 7, "height": 5},
        "M3":   {"hole": 4.0, "boss": 8, "height": 6},
        "M4":   {"hole": 5.6, "boss": 10, "height": 8},
        "M5":   {"hole": 6.4, "boss": 12, "height": 10},
    }

    d = dims.get(thread_size, dims["M3"])
    h = height or d["height"]

    return (
        cq.Workplane("XY")
        .circle(d["boss"] / 2)
        .extrude(h)
        .faces(">Z")
        .circle(d["hole"] / 2)
        .cutBlind(-h + 1.5)  # Leave floor
        .edges(">Z").chamfer(0.8)  # Entry chamfer
        .edges("<Z").fillet(1)  # Base blend
    )
```

### Alignment Pin Pair

```python
def alignment_pin_pair(pin_d=4, pin_h=5, clearance=0.15):
    """
    Alignment pin and matching hole for two-part assemblies.
    Use 2 pins minimum, placed far apart for angular alignment.
    """
    # Pin (add to one part)
    pin = (
        cq.Workplane("XY")
        .circle(pin_d / 2)
        .extrude(pin_h, taper=1)  # Slight draft prevents binding
        .edges(">Z").chamfer(0.5)
    )

    # Hole (cut from mating part)
    hole_d = pin_d + clearance * 2
    hole = (
        cq.Workplane("XY")
        .circle(hole_d / 2)
        .extrude(pin_h + 0.5)  # Slightly deeper than pin
        .faces(">Z")
        .circle(hole_d / 2 + 0.5)
        .extrude(1)  # Countersink for self-centering
    )

    return pin, hole
```

### Captive Nut Pocket

```python
def captive_nut_pocket(nut_width=5.5, nut_height=2.4, depth=10):
    """
    Pocket that captures a hex nut - prevents spinning and falling out.
    Entry slot allows nut to slide in from side.
    """
    return (
        cq.Workplane("XY")
        # Hex pocket (nut can't spin)
        .polygon(6, nut_width + 0.4)
        .extrude(-depth)
        # Entry slot from side
        .faces(">Y")
        .workplane()
        .center(0, -depth/2)
        .rect(nut_width - 1, nut_height + 0.5)
        .cutThruAll()
    )
```

### Cable Strain Relief

```python
def strain_relief(cable_d, length=15, grip_segments=3):
    """
    Strain relief for cables exiting enclosures.
    Gradual bend radius (min 4x cable diameter), grip section holds without crushing.
    """
    outer_d = cable_d + 4
    grip_d = cable_d + 0.5  # Light interference

    relief = cq.Workplane("XY").circle(outer_d/2).extrude(length)

    # Internal grip ridges
    for i in range(grip_segments):
        z = length * (i + 1) / (grip_segments + 1)
        ridge = (
            cq.Workplane("XY")
            .workplane(offset=z)
            .circle(grip_d / 2)
            .extrude(2)
        )
        relief = relief.cut(ridge)

    # Entry funnel
    relief = (
        relief.faces(">Z").workplane()
        .circle(cable_d)
        .workplane(offset=-5)
        .circle(cable_d / 2 + 0.3)
        .loft()
    )

    return relief
```

### Honeycomb Ventilation

```python
def honeycomb_vent(width, height, cell_size=8, wall=1.5, thick=3):
    """
    Honeycomb ventilation - 30% more open area than slots for same strength.

    Cell size guidelines:
    - Fine (5-6mm): high detail, reduced airflow
    - Medium (8-10mm): good balance
    - Coarse (12-15mm): max airflow, fingers can poke through
    """
    import math

    panel = cq.Workplane("XY").rect(width, height).extrude(thick)

    hex_h = cell_size
    hex_w = cell_size * 2 / math.sqrt(3)
    col_spacing = hex_w * 0.75
    row_spacing = hex_h * 0.5

    cols = int(width / col_spacing)
    rows = int(height / row_spacing)

    for col in range(cols):
        for row in range(rows):
            x = -width/2 + col_spacing/2 + col * col_spacing
            y = -height/2 + row_spacing/2 + row * row_spacing

            if col % 2:
                y += row_spacing / 2

            if abs(x) < width/2 - cell_size and abs(y) < height/2 - cell_size:
                panel = (
                    panel.faces(">Z").workplane()
                    .center(x, y)
                    .polygon(6, cell_size - wall)
                    .cutThruAll()
                )

    return panel
```

### Rubber Feet Recesses

```python
def add_rubber_feet_recesses(part, foot_d=10, foot_h=2, inset=15):
    """Add recesses for adhesive rubber feet at corners."""
    bb = part.val().BoundingBox()
    positions = [
        (bb.xmin + inset, bb.ymin + inset),
        (bb.xmax - inset, bb.ymin + inset),
        (bb.xmin + inset, bb.ymax - inset),
        (bb.xmax - inset, bb.ymax - inset),
    ]
    for x, y in positions:
        part = (
            part.faces("<Z").workplane()
            .center(x - (bb.xmin + bb.xmax)/2, y - (bb.ymin + bb.ymax)/2)
            .circle(foot_d / 2)
            .cutBlind(-foot_h)
        )
    return part
```

## Ergonomics and Human Factors

When designing handheld objects, stands, or anything humans interact with, use these guidelines:

### Hand Anthropometrics

```
Adult hand dimensions (5th-95th percentile):
- Palm width: 70-97mm
- Grip diameter (power grip): 30-45mm optimal, max 55mm
- Grip diameter (precision grip): 8-15mm optimal
- Finger clearance (insertion): minimum 25mm depth, 20mm width
- Thumb reach from grip: 50-80mm
```

### Finger Clearances (Critical for Functional Design)

```python
# MINIMUM clearances for finger access
FINGER_TIP_CLEARANCE = 15      # mm - pinch grip access
FINGER_PAD_CLEARANCE = 20      # mm - comfortable button press
FULL_FINGER_CLEARANCE = 25     # mm - hook grip, pulling
KNUCKLE_CLEARANCE = 35         # mm - wrap-around grip
THUMB_ACCESS = 30              # mm - side access for thumbs
```

### Viewing Angles (Device Stands)

```
Optimal tilt angles by use case:
- Desktop viewing: 10-15° from vertical
- Couch/lap viewing: 60-70° from horizontal
- Kitchen/standing: 30-45° from vertical
- Drafting/writing: 10-20° from horizontal
```

### Grip Angle Guidelines

```
Handheld tools and handles:
- Neutral wrist angle: 10-15° from perpendicular
- Power grip axis: angled 10-20° toward little finger
- Trigger finger angle: 25-30° from grip axis
```

## Manufacturing Constraints

### Wall Thickness by Application

| Application | Wall | Rationale |
|-------------|------|-----------|
| Decorative (<500g) | 2mm | Minimal load, aesthetics priority |
| Phone/tablet stand (500g) | 3mm | Handle daily impacts |
| Tool holder (1-2kg) | 4mm | Tool vibration/impact |
| Heavy equipment mount (5kg+) | 5-6mm | Safety margin |
| Load-bearing structural | 6-8mm | Engineering safety factor 2x |

**Wall thickness vs span (deflection):**
Deflection is proportional to 1/t³ — doubling wall thickness reduces deflection by 8x.

| Span | 2mm wall | 3mm wall | 4mm wall |
|------|----------|----------|----------|
| 50mm | Flexible | Slight flex | Rigid |
| 100mm | Very flexible | Flexible | Slight flex |
| 150mm | Will sag | Flexible | Slight flex |

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

### Fit Types with Real-World Examples

| Fit Type | Clearance | Examples |
|----------|-----------|----------|
| Loose | 0.4-0.6mm | TV remote in holder, pen in cup, phone in charging tray |
| Free Running | 0.2-0.3mm | Drawer slides, lid on box, cable through grommet |
| Close/Sliding | 0.1-0.15mm | Battery cover, USB drive holder, telescope sections |
| Transition | 0.05mm | Bearing in housing, precision alignment |
| Press/Interference | -0.05 to -0.1mm | Heat-set inserts, permanent assemblies |

### Printer Calibration Test

Your printer has dimensional errors. Print this before designing tight fits:

```python
def tolerance_test_print():
    """Calibration test - measure actual vs designed dimensions."""
    test = cq.Workplane("XY").rect(50, 50).extrude(5)

    # Test holes
    for i, d in enumerate([5, 6, 8, 10]):
        test = (
            test.faces(">Z").workplane()
            .center(-15 + i*10, 10)
            .circle(d/2)
            .cutThruAll()
        )

    # Test pins
    for i, d in enumerate([5, 6, 8, 10]):
        test = (
            test.faces(">Z").workplane()
            .center(-15 + i*10, -10)
            .circle(d/2)
            .extrude(10)
        )

    return test
```

**Typical printer errors:**
| Axis | Error | Magnitude |
|------|-------|-----------|
| XY | Backlash | 0.05-0.15mm |
| XY | Steps/mm calibration | ±0.5% |
| Z | Layer height | ±0.02mm |
| All | Elephant foot | +0.2-0.5mm at base |

**Compensation pattern:**
```python
# After measuring your test print
PRINTER_HOLE_COMP = -0.15  # Holes come out 0.15mm small
PRINTER_PIN_COMP = 0.1     # Pins come out 0.1mm large

def calibrated_hole(nominal_d):
    return nominal_d - PRINTER_HOLE_COMP

def calibrated_pin(nominal_d):
    return nominal_d - PRINTER_PIN_COMP
```

### Stress Relief Fillet Sizing

**Minimum fillet radius = thickness of thinner member at junction**

Stress concentration factors:

| r/t ratio | Stress Multiplier | Application |
|-----------|-------------------|-------------|
| 0 (sharp) | 3-4x | Never for load-bearing |
| 0.25 | 2.0x | Low-stress decorative |
| 0.5 | 1.5x | Light functional loads |
| 1.0 | 1.2x | Standard structural |
| 2.0+ | ~1.0x | Heavy loads, fatigue resistance |

Where r = fillet radius, t = wall thickness

**Practical rule:** Inside fillet radius should be at least 0.5x wall thickness, preferably 1x.

### Layer Orientation for Strength

**Layer adhesion is the weakest link** — parts fail at layer boundaries first.

```
Load Direction:     Print Orientation:     Strength:
    |                  |||||               Layers perpendicular = STRONG
    V                  |||||               (compression into layers)
   ___                 |||||

    |                  =====               Layers parallel = WEAK
    V                  =====               (delaminates under tension)
   ___                 =====
```

| Configuration | Tensile Strength | Impact Strength |
|--------------|------------------|-----------------|
| Load perpendicular to layers | 100% | 100% |
| Load parallel to layers | 30-50% | 10-20% |
| Load at 45 degrees | 60-70% | 40-50% |

**Design implication:** Brackets that hang weight should print standing up so load compresses into layers rather than pulling them apart.

### Infill Pattern Selection

| Pattern | Strength | Print Time | Best For |
|---------|----------|------------|----------|
| Grid | Medium | Medium | General purpose |
| Triangles | High | Medium | Load-bearing |
| Honeycomb | Highest | Slow | Structural parts |
| Gyroid | High (isotropic) | Medium | Multi-axis loads |
| Lightning | Low | Fast | Decorative only |

| Application | Infill % | Pattern |
|-------------|----------|---------|
| Decorative | 10-15% | Any |
| Functional light | 20-25% | Grid |
| Functional medium | 30-40% | Triangles |
| Structural | 50-60% | Gyroid |
| Maximum strength | 80-100% | Honeycomb |

> 💡 **Key insight:** Adding 1mm wall thickness is almost always better than adding 20% more infill. Perimeters are stronger than infill.

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

### Material-Specific Design Rules

#### PLA

**Characteristics:** Brittle, excellent detail, poor heat resistance (softens 50-60°C)

| Feature | Standard | PLA-Specific |
|---------|----------|--------------|
| Wall thickness | 2mm | 2.4mm minimum (brittleness) |
| Inside corner fillet | 1mm | 2mm minimum (crack prevention) |
| Snap fit deflection | 5% | 3% maximum (will break beyond) |
| Living hinge cycles | 1000+ | 50-100 max |
| Outdoor use | OK | Avoid (UV + heat degradation) |

**PLA snap fit formula:** Max deflection = 0.03 × length (3% strain limit)

#### PETG

**Characteristics:** Tougher than PLA, strings more, chemical resistant, higher temp (75-80°C)

| Feature | Standard | PETG-Specific |
|---------|----------|---------------|
| Clearances | 0.2-0.3mm | 0.3-0.4mm (strings fill gaps) |
| Bridging | 50mm | 30mm (sags more) |
| Snap fits | Standard | Excellent - can flex repeatedly |
| Fine text | 0.4mm | 0.5mm minimum (strings blur detail) |
| Support interface | 0.15mm | 0.2mm (adheres strongly) |


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

### Mandatory Validation (MUST RUN BEFORE EXPORT)

> **IMPORTANT:** Always run validation immediately after creating models, BEFORE exporting STLs. Never skip this step.

Copy this validation block into every design file:

```python
# ============================================
# VALIDATION (MANDATORY - run before export)
# ============================================

def validate_design(models: dict, bed_size=(256, 256, 256), device_dims=None):
    """
    Comprehensive validation for 3D print designs.

    Args:
        models: dict of {"name": cq.Workplane} for each part
        bed_size: (x, y, z) print bed dimensions in mm
        device_dims: optional (w, d, h) of device that must fit

    Returns:
        bool: True if all checks pass
    """
    print("=" * 50)
    print("VALIDATION")
    print("=" * 50)

    all_passed = True

    # 1. Geometry validity
    print("\n1. Geometry check:")
    for name, model in models.items():
        try:
            solid = model.val()
            if not solid.isValid():
                print(f"   {name}: INVALID GEOMETRY")
                all_passed = False
                continue
            vol = solid.Volume() / 1000  # cm³
            if vol <= 0:
                print(f"   {name}: Zero/negative volume")
                all_passed = False
            else:
                print(f"   {name}: Valid, {vol:.1f} cm³")
        except Exception as e:
            print(f"   {name}: ERROR - {e}")
            all_passed = False

    # 2. Bed fit check
    print(f"\n2. Bed fit check ({bed_size[0]}x{bed_size[1]}mm):")
    for name, model in models.items():
        try:
            bb = model.val().BoundingBox()
            size = (bb.xlen, bb.ylen, bb.zlen)
            fits = size[0] <= bed_size[0] and size[1] <= bed_size[1] and size[2] <= bed_size[2]
            status = "OK" if fits else "DOES NOT FIT"
            print(f"   {name}: {size[0]:.1f} x {size[1]:.1f} x {size[2]:.1f} mm - {status}")
            if not fits:
                all_passed = False
        except Exception as e:
            print(f"   {name}: ERROR - {e}")
            all_passed = False

    # 3. Device fit (if applicable)
    if device_dims:
        print(f"\n3. Device fit check:")
        print(f"   Device dimensions: {device_dims[0]} x {device_dims[1]} mm")
        # Note: caller should verify pocket dimensions separately

    # 4. Material estimate
    print("\n4. Material estimate (PLA @ 1.24 g/cm³):")
    total_vol, total_mass = 0, 0
    for name, model in models.items():
        try:
            vol = model.val().Volume() / 1000
            mass = vol * 1.24
            total_vol += vol
            total_mass += mass
            print(f"   {name}: {vol:.1f} cm³, {mass:.0f} g")
        except:
            pass
    print(f"   TOTAL: {total_vol:.1f} cm³, {total_mass:.0f} g")

    # Summary
    print("\n" + "=" * 50)
    if all_passed:
        print("ALL CHECKS PASSED")
    else:
        print("VALIDATION FAILED - Do not export until fixed")
    print("=" * 50)

    return all_passed
```

**Usage in main block:**

```python
if __name__ == "__main__":
    # Build models
    left = create_left_half()
    right = create_right_half()

    # MANDATORY: Validate before export
    models = {"Left half": left, "Right half": right}
    if validate_design(models, bed_size=(256, 256, 256)):
        exporters.export(left, "part_left.stl")
        exporters.export(right, "part_right.stl")
    else:
        print("Fix validation errors before exporting!")
```

### Export

```python
from cadquery import exporters

# STL export
exporters.export(model, "output.stl")

# STEP export (preserves B-rep, good for CAM)
exporters.export(model, "output.step")
```

#### STL Quality Presets

Choose quality based on your use case:

```python
# Draft - fast preview, rough edges (good for fit checks)
exporters.export(model, "output.stl", tolerance=0.5, angularTolerance=0.3)

# Normal - standard FDM printing (recommended default)
exporters.export(model, "output.stl", tolerance=0.1, angularTolerance=0.15)

# Fine - high-detail FDM or resin printing
exporters.export(model, "output.stl", tolerance=0.01, angularTolerance=0.05)

# Ultra - maximum quality (large files, slow)
exporters.export(model, "output.stl", tolerance=0.001, angularTolerance=0.01)
```

> 💡 For most FDM prints, "Normal" is sufficient. Higher quality mainly affects curved surfaces.

#### DXF Import (Custom Profiles)

Import 2D profiles from DXF files (logos, complex outlines):

```python
# Import DXF and extrude
profile = cq.importers.importDXF("/path/to/logo.dxf")
result = profile.wires().toPending().extrude(2)

# With layer filtering
profile = cq.importers.importDXF(
    "/path/to/drawing.dxf",
    include=["outline"],           # Only include these layers
    exclude=["dimensions"]         # Or exclude these layers
)
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

**Required:** Install the `ocp-vscode` bridge package:
```bash
pip install ocp-vscode
```

**Code pattern for OCP CAD Viewer:**
```python
# At module level (outside if __name__ == "__main__")
# This ensures the viewer sees the objects when the file is run

try:
    from ocp_vscode import show, show_object, set_defaults

    set_defaults(reset_camera=False)

    # Build models
    _model = create_model()
    _ghost = create_device_ghost()

    # Display with show() for multiple objects
    show(
        _model,
        _ghost,
        names=["stand", "device_ghost"],
        colors=["steelblue", "orange"],
        alphas=[1.0, 0.3],
    )
except ImportError:
    pass  # ocp_vscode not available (running from CLI)
```

**To view:** Press the play button in VS Code or use the run command.

**Alternative single-object syntax:**
```python
from ocp_vscode import show_object
show_object(model, name="main", options={"color": "steelblue"})
```

### Viewer Test File

When creating a new CadQuery design, also create a `test-viewer.py` file in the same directory to verify the OCP CAD Viewer is working:

```python
#!/usr/bin/env python3
"""
Quick test to verify OCP CAD Viewer is working.
Open this file in VS Code and press the Play button.
"""
import cadquery as cq

box = cq.Workplane("XY").box(50, 30, 20).edges("|Z").fillet(3)

try:
    from ocp_vscode import show
    show(box, names=["test box"], colors=["steelblue"])
except ImportError:
    print("Install ocp-vscode: pip install ocp-vscode")
```

**To use:**
1. Open `test-viewer.py` in VS Code
2. Press the Play button (▷) in the editor toolbar
3. A 3D viewer panel should open showing the rounded box

If this works, the viewer is correctly configured for your main design files.

## Visualizing the Target Object

When designing stands, holders, or enclosures, visualize the device/object being designed around to verify fit and clearances.

### Ghost Objects in Viewer

Use transparent "ghost" objects during development:

```python
# Create ghost device to visualize placement
device_ghost = (
    cq.Workplane("XY")
    .workplane(offset=shelf_z)
    .transformed(rotate=(tilt_angle, 0, 0))
    .box(device_w, device_d, device_h, centered=(True, True, False))
)

# Display with transparency (CQ-Editor / OCP CAD Viewer)
show_object(stand, name="stand", options={"color": "steelblue"})
show_object(device_ghost, name="device (ghost)", options={"alpha": 0.3, "color": "orange"})
```

**What to verify:**
- Device sits ON shelves, doesn't penetrate them
- Clearance around all sides
- Lips don't block insertion/removal
- Cable holes align with device ports

### Separate Visualization STL

Export a second STL showing device placement for slicer preview:

```python
if __name__ == "__main__":
    stand = create_stand()
    device_ghost = create_device_ghost()

    # Production STL (what gets printed)
    exporters.export(stand, "stand.stl")

    # Visualization STL (for checking fit in slicer)
    combined = stand.union(device_ghost)
    exporters.export(combined, "stand-with-device.stl")
```

> 💡 **Tip:** Load the visualization STL in your slicer to verify fit before printing, then slice only the production STL.

### STEP with Multiple Bodies (Advanced)

STEP files can contain multiple separate bodies, useful for visualization:

```python
# Export assembly with multiple bodies
import cadquery as cq
from cadquery import exporters

# Create compound with multiple solids
assembly = cq.Compound.makeCompound([
    stand.val(),
    device_ghost.val()
])

exporters.export(assembly, "stand-assembly.step")
```

**Bambu Studio support:**
- Bambu Studio supports multi-body STEP via Assembly View
- However, versions 2.0+ have bugs with some STEP files
- **Recommended:** Use separate STL files for reliability

```python
# More reliable approach for slicer compatibility
exporters.export(stand, "stand.stl")
exporters.export(device_ghost, "device-ghost.stl")
# Load both in slicer, delete ghost before slicing
```

### Ghost Object Patterns

```python
# Battery compartment contents
battery_ghost = (
    cq.Workplane("XY")
    .workplane(offset=floor_thickness + 1)  # 1mm above floor
    .box(battery_w, battery_d, battery_h, centered=(True, True, False))
)

# Power bank in storage cavity
powerbank_ghost = (
    cq.Workplane("XY")
    .workplane(offset=base_floor + 1)
    .center(offset_x, offset_y)
    .box(pb_length, pb_width, pb_height, centered=(True, True, False))
)

# Device on tilted platform
device_ghost = (
    cq.Workplane("XY")
    .workplane(offset=pocket_floor_z)
    .transformed(rotate=(tilt_angle, 0, 0))
    .center(0, device_d/2)  # Position based on device rest point
    .box(device_w, device_d, device_h, centered=(True, True, False))
)
```

**Critical rule:** Ghost objects must never intersect with solid geometry. If they clip through walls or shelves, the design has an error.

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

## Pre-Delivery Checklist (MANDATORY)

Before presenting any design as complete, verify ALL of these:

### Edge Treatments
- [ ] **Vertical edges filleted** - `edges("|Z").fillet(5)` or similar (5-8mm for handheld objects)
- [ ] **Bottom chamfer applied** - `edges("<Z").chamfer(0.4)` for elephant foot prevention
- [ ] **Top edges chamfered** - `edges(">Z").chamfer(0.3)` or horizontal edges `edges("#Z").chamfer(0.3)`
- [ ] **Interior corners filleted** - 2-3mm radius for stress relief
- [ ] **Pocket/opening edges smoothed** - 1-2mm fillet for comfortable device insertion

### Geometry Quality
- [ ] **`.clean()` after booleans** - Prevents fillet/chamfer failures
- [ ] **No intersecting geometry** - Ghost objects don't clip through solid parts
- [ ] **Validation passed** - `validate_design()` returns True

### Files Created
- [ ] **Main design file** - `{name}.py` with full implementation
- [ ] **Test viewer file** - `test-viewer.py` for verifying OCP CAD Viewer
- [ ] **STL exported** - Only after validation passes

### Geometric Proof Verification (MANDATORY for mating parts)

When a design includes **mating features** (tabs/slots, pins/holes, interlocking parts, hinges), run rigorous geometric verification BEFORE declaring the design complete. This catches bugs that visual inspection misses.

**What to verify:**

| Feature Type | Verification Tests |
|--------------|-------------------|
| Tabs/Slots | Tab protrudes past seam, slot is recessed into mating part, clearance exists on all sides |
| Pins/Holes | Pin diameter < hole diameter by clearance amount, depths are compatible |
| Interlocking halves | Parts meet at seam without overlap, union creates valid geometry |
| Lid/Base fit | Lip dimensions match groove with clearance, parts don't collide |

**Example verification script for tabs/slots:**

```python
def verify_tab_slot_fit(left_half, right_half, tab_params):
    """Rigorous geometric proof that tabs fit into slots."""
    TAB_D, TAB_W, TAB_H, CLEARANCE = tab_params

    print("=" * 60)
    print("TAB/SLOT GEOMETRIC VERIFICATION")
    print("=" * 60)

    # 1. Prove tabs exist - left half should extend past centerline
    left_bb = left_half.val().BoundingBox()
    tab_protrusion = left_bb.xmax  # Should be > 0
    print(f"\n1. Tab protrusion: {tab_protrusion:.1f}mm past X=0")
    assert tab_protrusion > 0, "FAIL: No tab protrusion detected"
    print(f"   PASS: Tabs protrude {tab_protrusion:.1f}mm")

    # 2. Prove slots exist - right half should have material removed
    # Compare to right half built WITHOUT slots
    right_no_slots = build_right_half_without_slots()
    slot_volume = right_no_slots.val().Volume() - right_half.val().Volume()
    print(f"\n2. Slot volume removed: {slot_volume:.0f}mm³")
    assert slot_volume > 0, "FAIL: No slot volume detected"
    print(f"   PASS: Slots carved correctly")

    # 3. Prove clearance exists
    slot_depth = TAB_D + CLEARANCE
    slot_width = TAB_W + CLEARANCE * 2
    slot_height = TAB_H + CLEARANCE * 2
    print(f"\n3. Dimensional clearance:")
    print(f"   Tab: {TAB_D}mm x {TAB_W}mm x {TAB_H}mm")
    print(f"   Slot: {slot_depth}mm x {slot_width}mm x {slot_height}mm")
    print(f"   Gap: {CLEARANCE}mm on all sides")
    print(f"   PASS: Slot larger than tab")

    # 4. Prove assembly creates valid geometry
    assembled = left_half.union(right_half)
    assert assembled.val().isValid(), "FAIL: Assembly invalid"
    print(f"\n4. Assembly validity: PASS")

    print("\n" + "=" * 60)
    print("ALL GEOMETRIC PROOFS PASSED")
    print("=" * 60)
```

**When to run geometric proofs:**
- After implementing any mating feature
- Before declaring design "complete"
- After any change to mating feature dimensions

**Key insight:** The standard `validate_design()` only checks basic geometry validity. Mating features require explicit dimensional and positional verification because a valid solid can still have incorrectly positioned features (e.g., slots cut at wrong X position).

### Code Example: Applying All Default Treatments

```python
def apply_default_edge_treatments(model, wall=5, has_tilted_top=False):
    """Apply standard edge treatments for professional finish."""

    result = model

    # 1. Vertical edges - main aesthetic fillet
    try:
        result = result.edges("|Z").fillet(wall)  # radius = wall thickness
    except:
        pass

    # 2. Bottom chamfer - elephant foot prevention
    try:
        result = result.edges("<Z").chamfer(0.4)
    except:
        pass

    # 3. Top/horizontal edges - chip prevention
    # Use #Z for tilted surfaces, >Z for flat tops
    selector = "#Z" if has_tilted_top else ">Z"
    try:
        result = result.edges(selector).chamfer(0.3)
    except:
        pass

    return result
```

**Usage:**
```python
stand = create_stand_geometry()
stand = apply_default_edge_treatments(stand, wall=5, has_tilted_top=True)
```
