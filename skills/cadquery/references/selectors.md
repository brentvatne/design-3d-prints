# CadQuery Selectors Reference

Selectors are the key differentiator from OpenSCAD. They let you pick specific geometry for operations.

## Quick Reference Table

### Direction Selectors
| Selector | Meaning |
|----------|---------|
| `>Z` | Farthest in +Z (top) |
| `<Z` | Farthest in -Z (bottom) |
| `+Z` | Facing +Z direction (normal) |
| `-Z` | Facing -Z direction (normal) |
| `\|Z` | Parallel to Z axis |
| `#Z` | Perpendicular to Z axis |

### Type Selectors
| Selector | Meaning |
|----------|---------|
| `%Line` | Straight edges only |
| `%Circle` | Arcs and circles |
| `%Plane` | Planar faces |

### Nth Selectors (Positional)
| Selector | Meaning |
|----------|---------|
| `>Z[0]` | 1st closest in +Z direction |
| `>Z[-1]` | Farthest in +Z (same as `>Z`) |
| `>Z[-2]` | 2nd farthest in +Z |
| `>>Z[0]` | 1st by center position (not direction) |

### Combinators
| Operator | Meaning |
|----------|---------|
| `and` | Both conditions must match |
| `or` | Either condition matches |
| `not(...)` | Invert selection |
| `exc(...)` | Set difference (exclude) |

---

## Face Selectors

### Direction-Based

```python
# Select faces by position (centroid)
.faces(">Z")   # Face with highest Z centroid (top)
.faces("<Z")   # Face with lowest Z centroid (bottom)
.faces(">X")   # Face furthest in +X direction
.faces("<X")   # Face furthest in -X direction

# Select faces by normal orientation
.faces("+Z")   # Faces with normal pointing in +Z direction
.faces("-Z")   # Faces with normal pointing in -Z direction

# Parallel and perpendicular
.faces("|Z")   # Faces parallel to Z axis (vertical faces)
.faces("#Z")   # Faces perpendicular to Z (horizontal faces)
```

### Nth Selection (Multiple Tiers)

```python
# Multi-tier designs - select by position in sorted order
.faces(">Z[0]")    # Top face (same as >Z)
.faces(">Z[1]")    # Second from top
.faces(">Z[-2]")   # Second farthest from bottom
.faces(">Z[-1]")   # Farthest (same as >Z)

# Center-based selection (>> uses center, not direction)
.faces(">>Z[-2]")  # 2nd farthest by center position
```

### Custom Direction Vectors

```python
# Angled/tilted face selection
.faces(">(0, 0.2, 0.98)")   # 12° tilt from vertical
.faces(">(-1, 1, 0)")        # Diagonal direction (normalized)
```

---

## Edge Selectors

### Direction-Based

```python
# Select edges by position
.edges(">Z")   # Highest edges
.edges("<Z")   # Lowest edges (bottom)
.edges(">X")   # Furthest in +X

# Select edges by orientation
.edges("|Z")   # Vertical edges (parallel to Z axis)
.edges("|X")   # Edges parallel to X axis
.edges("#Z")   # Horizontal edges (perpendicular to Z)
```

### Type Selectors

```python
# Filter by geometry type
.edges("%Line")     # Straight edges only (excludes arcs)
.edges("%Circle")   # Arcs and circles only
```

### Nth Selection

```python
# Select specific edge from ordered set
.edges(">Z[0]")     # Highest edge
.edges(">Z[-2]")    # 2nd highest edge
.edges(">>Y[-2]")   # 2nd farthest by center position
```

---

## Combining Selectors

### Boolean Operations

```python
# AND - both conditions
.edges("|Z and >Y")      # Vertical edges on the +Y side
.edges(">Z and |X")      # Top edges parallel to X

# OR - either condition
.edges(">Z or <Z")       # Top and bottom edges
.faces(">Z or <Z")       # Top and bottom faces

# NOT - invert selection
.edges("not |Z")         # All non-vertical edges
.edges("not(<X or >X or <Y or >Y)")  # Interior edges only

# EXC - set difference
.edges(">Z exc %Circle")  # Top edges excluding arcs
```

### Practical Examples

```python
# Fillet only vertical edges on +Y side
box.edges("|Z and >Y").fillet(5)

# Chamfer all edges except the top
box.edges("not >Z").chamfer(0.5)

# Shell with open top and bottom
box.faces(">Z or <Z").shell(-2)

# Fillet interior edges (exclude boundary)
box.edges("not(<X or >X or <Y or >Y)").fillet(1)
```

---

## Class-Based Selectors

Import from `cadquery.selectors`:

```python
from cadquery.selectors import *
```

### RadiusSelector
```python
# Select edges by radius (for arcs/circles)
.edges(RadiusSelector(5))      # Edges with radius 5mm
.edges(RadiusSelector(5, 0.1)) # Radius 5mm ± 0.1mm tolerance
```

### LengthNthSelector
```python
# Select edges by length (ordered)
.edges(LengthNthSelector(0))   # Shortest edge
.edges(LengthNthSelector(-1))  # Longest edge
.edges(LengthNthSelector(-3))  # 3rd longest edge
```

### AreaNthSelector
```python
# Select faces/wires by area (for enclosures)
.faces(">Z").wires(AreaNthSelector(-1))  # Outer wire (largest area)
.faces(">Z").wires(AreaNthSelector(0))   # Inner wire (smallest area)
```

### NearestToPointSelector
```python
# Select geometry closest to a point
.edges(NearestToPointSelector((5, 5, 0)))
.faces(NearestToPointSelector((0, 0, 10)))
```

### BoxSelector
```python
# Select geometry within bounding box
.edges(BoxSelector((0, 0, 0), (10, 10, 10)))
.faces(BoxSelector((-5, -5, 0), (5, 5, 20)))
```

---

## Programmatic Selection

When string selectors aren't enough, use `filter()` and `sort()`:

### Filter by Property

```python
# Select edges longer than 3mm
.edges().filter(lambda e: e.Length() >= 3).fillet(1)

# Select faces with area > 100mm²
.faces().filter(lambda f: f.Area() > 100)

# Select only horizontal edges
.edges().filter(lambda e: abs(e.tangentAt(0).z) < 0.01)
```

### Sort and Select

```python
# Fillet the 3 longest edges
.edges().sort(lambda e: e.Length())[-3:].fillet(3)

# Select largest face
.faces().sort(lambda f: f.Area())[-1]

# Select edges from shortest to longest, take first 5
.edges().sort(lambda e: e.Length())[:5].chamfer(0.5)
```

### Combined Filter + Sort

```python
# Fillet vertical edges, longest first
(part
    .edges()
    .filter(lambda e: abs(e.tangentAt(0).z) > 0.99)
    .sort(lambda e: -e.Length())  # Negative for descending
    [:4]  # Top 4
    .fillet(5)
)
```

---

## Selector Chaining

Start from faces, then select their edges:

```python
# All edges of the top face
box.faces(">Z").edges().fillet(2)

# Only vertical edges of the top face
box.faces(">Z").edges("|Z").fillet(2)

# Horizontal edges of vertical faces
box.faces("|Z").edges("#Z").chamfer(0.5)
```

---

## Tagging for Later Reference

Save selections to return to later:

```python
result = (
    cq.Workplane("XY")
    .box(20, 20, 10)
    .faces(">Z")
    .tag("top_face")           # Tag this selection
    .end()                      # Go back one step
    .faces("<Z")
    .tag("bottom_face")
    .end()
    .workplaneFromTagged("top_face")  # Return to tagged face
    .circle(5)
    .extrude(10)
)
```

---

## Common 3D Printing Patterns

### Complete Edge Treatment

```python
def finished_box(w, d, h):
    return (
        cq.Workplane("XY")
        .box(w, d, h)
        .edges("|Z").fillet(5)      # Round vertical corners
        .edges("<Z").chamfer(0.4)   # Elephant foot prevention
        .edges(">Z").chamfer(0.3)   # Soften top edges
    )
```

### Fillet All Except Holes

```python
# Skip small circular edges (holes)
part.edges().filter(lambda e: e.Length() > 5).fillet(2)

# Or use type selector
part.edges("%Line").fillet(2)  # Only straight edges
```

### Multi-Tier Filleting

```python
# Different radii at different heights
part = (
    cq.Workplane("XY")
    .box(50, 50, 30)
    .edges("|Z").fillet(8)       # Large corner radius
    .edges(">Z[-1]").fillet(2)   # Small on top tier
    .edges(">Z[-2]").fillet(3)   # Medium on second tier
)
```

### Enclosure Lip Selection

```python
# Get outer and inner wires for lip creation
outer_wire = part.faces(">Z").wires(AreaNthSelector(-1))
inner_wire = part.faces(">Z").wires(AreaNthSelector(0))
```

---

## Debugging Selectors

```python
# Check what was selected
selected = box.faces(">Z")
print(f"Selected {len(selected.vals())} faces")

# Get edge lengths
for edge in box.edges().vals():
    print(f"Edge length: {edge.Length():.2f}")

# Visualize in CQ-editor
show_object(box, name="base", options={"alpha": 0.3})
show_object(box.edges("|Z"), name="selected", options={"color": "red"})
```
