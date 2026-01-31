# CadQuery Selectors Reference

Selectors are the key differentiator from OpenSCAD. They let you pick specific geometry for operations.

## Face Selectors

### Direction-Based

```python
# Select faces by normal direction
.faces(">Z")   # Face with highest Z centroid (top)
.faces("<Z")   # Face with lowest Z centroid (bottom)
.faces(">X")   # Face furthest in +X direction
.faces("<X")   # Face furthest in -X direction
.faces(">Y")   # Face furthest in +Y direction
.faces("<Y")   # Face furthest in -Y direction

# Select faces by normal orientation
.faces("+Z")   # Faces with normal pointing in +Z direction
.faces("-Z")   # Faces with normal pointing in -Z direction
.faces("+X")   # Faces with normal pointing in +X
.faces("-X")   # Faces with normal pointing in -X

# Parallel and perpendicular
.faces("|Z")   # Faces parallel to Z axis (vertical faces)
.faces("|X")   # Faces parallel to X axis
.faces("#Z")   # Faces perpendicular to Z (horizontal faces)
```

### Examples

```python
# Select top face of a box
box = cq.Workplane("XY").box(10, 10, 5)
top_face = box.faces(">Z")

# Select all vertical faces
vertical_faces = box.faces("|Z")

# Select front face (normal pointing -Y)
front_face = box.faces("-Y")
```

## Edge Selectors

### Direction-Based

```python
# Select edges by position
.edges(">Z")   # Highest edges
.edges("<Z")   # Lowest edges
.edges(">X")   # Furthest in +X
.edges("<X")   # Furthest in -X

# Select edges by orientation
.edges("|Z")   # Vertical edges (parallel to Z axis)
.edges("|X")   # Edges parallel to X axis
.edges("|Y")   # Edges parallel to Y axis
.edges("#Z")   # Horizontal edges (perpendicular to Z)
```

### Combining Selectors

```python
# Boolean AND
.edges(">Z and |X")  # Top edges that are parallel to X

# Boolean OR
.edges(">Z or <Z")   # Top and bottom edges

# Boolean NOT
.edges("not |Z")     # All non-vertical edges
```

### Examples

```python
# Fillet only the top vertical edges
box.edges("|Z and >Z").fillet(2)

# Fillet all edges except bottom
box.edges("not <Z").fillet(1)

# Chamfer only the bottom horizontal edges
box.edges("#Z and <Z").chamfer(0.5)
```

## Advanced Selectors

### By Geometry Type

```python
from cadquery.selectors import *

# Select circular edges
.edges(RadiusSelector(5))      # Edges with radius 5

# Select edges by length
.edges(LengthSelector(10))     # Edges with length ~10

# Select by position
.edges(NearestToPointSelector((5, 5, 0)))  # Edge nearest to point
```

### String Selectors

```python
# Select by axis
">X"   # Maximum X direction
"<X"   # Minimum X direction
"|X"   # Parallel to X
"#X"   # Perpendicular to X

# Combine with boolean
">Z and |X"
">Z or <Z"
"not |Z"
```

### Box Selector

```python
from cadquery.selectors import BoxSelector

# Select geometry within a bounding box
.edges(BoxSelector((0, 0, 0), (10, 10, 10)))
```

## Tagging

Tag selections for later reference:

```python
result = (
    cq.Workplane("XY")
    .box(20, 20, 10)
    .faces(">Z")
    .tag("top_face")           # Tag this face
    .end()
    .faces("<Z")
    .tag("bottom_face")
    .end()
    .workplaneFromTagged("top_face")  # Return to tagged face
    .circle(5)
    .extrude(10)
)
```

## Selector Chaining

```python
# Start from faces, get their edges
result = (
    box
    .faces(">Z")              # Select top face
    .edges()                   # Get all edges of that face
    .fillet(2)
)

# Select specific edges of a face
result = (
    box
    .faces(">Z")
    .edges("|X")               # Only edges parallel to X on top face
    .fillet(2)
)
```

## Common Patterns

### Fillet Strategy

```python
# Fillet vertical edges first (larger radius)
# Then horizontal edges (smaller radius)
result = (
    cq.Workplane("XY")
    .box(50, 30, 20)
    .edges("|Z")
    .fillet(5)                 # Large radius on verticals
    .edges(">Z")
    .fillet(2)                 # Smaller radius on top
    .edges("<Z")
    .fillet(1)                 # Even smaller on bottom
)
```

### Selective Operations

```python
# Only chamfer bottom edges (for bed adhesion)
result = (
    box
    .edges("<Z")
    .chamfer(0.5)
)

# Fillet all except mounting holes
result = (
    box
    .edges()
    .filter(lambda e: e.Length() > 5)  # Skip small edges
    .fillet(2)
)
```

### Working with Holes

```python
# Add counterbore to existing holes
result = (
    part_with_holes
    .faces(">Z")
    .edges(RadiusSelector(2.5))  # Select 5mm diameter hole edges
    .chamfer(0.5)
)
```

## Debugging Selectors

```python
# Check what was selected
selected = box.faces(">Z")
print(f"Selected {len(selected.vals())} faces")

# Visualize selection
show_object(box, name="base", options={"alpha": 0.3})
show_object(selected, name="selected", options={"color": "red"})
```

## Selector Reference Table

| Selector | Meaning |
|----------|---------|
| `>X` | Maximum X position |
| `<X` | Minimum X position |
| `+X` | Normal pointing +X |
| `-X` | Normal pointing -X |
| `\|X` | Parallel to X axis |
| `#X` | Perpendicular to X axis |
| `and` | Boolean AND |
| `or` | Boolean OR |
| `not` | Boolean NOT |

Replace X with Y or Z as needed.
