# CadQuery Manufacturing Constraints

Same FDM printing constraints as OpenSCAD, but with CadQuery-specific implementation.

## Wall Thickness

| Application | Minimum | Recommended |
|-------------|---------|-------------|
| Decorative | 0.8mm | 1.2mm |
| Structural | 1.6mm | 2.4mm |
| Load-bearing | 2.4mm | 3.2mm |

Use multiples of nozzle width (0.4mm): 0.8, 1.2, 1.6, 2.0, 2.4, 3.2mm

## Tolerances

### Constants

```python
# Clearance fits (add to hole, subtract from shaft)
CLEARANCE_LOOSE = 0.4      # Easy sliding fit
CLEARANCE_FREE = 0.25       # Free running fit
CLEARANCE_CLOSE = 0.15      # Close sliding fit

# Transition fit
TRANSITION = 0.05           # May need light press

# Interference fit
INTERFERENCE_LIGHT = -0.05  # Light press fit
INTERFERENCE_MEDIUM = -0.1  # Medium press fit

# Material shrinkage
SHRINKAGE = {
    "pla": 0.002,    # 0.2%
    "petg": 0.004,   # 0.4%
    "abs": 0.008,    # 0.8%
}
```

### Tolerance Functions

```python
def hole_size(nominal_d, fit="free", material="pla"):
    """Calculate actual hole diameter with tolerance and shrinkage."""
    tol = {
        "loose": 0.4,
        "free": 0.25,
        "close": 0.15,
        "transition": 0.05,
        "press": -0.05
    }.get(fit, 0.25)

    shrink = SHRINKAGE.get(material, 0.002)
    return nominal_d * (1 + shrink) + tol


def shaft_size(nominal_d, fit="free", material="pla"):
    """Calculate actual shaft diameter with tolerance and shrinkage."""
    tol = {
        "loose": 0.4,
        "free": 0.25,
        "close": 0.15,
        "transition": 0.05,
        "press": -0.05
    }.get(fit, 0.25)

    shrink = SHRINKAGE.get(material, 0.002)
    return nominal_d * (1 + shrink) - tol
```

## Hole Modules

```python
def clearance_hole(wp, screw_d, depth, countersink=False):
    """Create clearance hole for screw."""
    hole_d = hole_size(screw_d + 0.4)  # +0.4 for clearance

    result = wp.circle(hole_d / 2).cutBlind(-depth)

    if countersink:
        head_d = screw_d * 2 + 0.5
        result = (
            result
            .faces(">Z")
            .workplane()
            .circle(head_d / 2)
            .cutBlind(-screw_d * 0.6)
        )

    return result


def pilot_hole(wp, screw_d, depth):
    """Create pilot hole for self-tapping screw."""
    # 80% of screw diameter for self-tap
    hole_d = hole_size(screw_d * 0.8)
    return wp.circle(hole_d / 2).cutBlind(-depth)


def insert_hole(wp, insert_size, depth=None):
    """Create hole for heat-set insert."""
    inserts = {
        "m2": (3.2, 4.0),
        "m2.5": (3.5, 4.5),
        "m3": (4.0, 5.0),
        "m4": (5.6, 6.5),
        "m5": (6.4, 8.0),
    }
    hole_d, default_depth = inserts.get(insert_size.lower(), (4.0, 5.0))
    actual_depth = depth or default_depth

    return wp.circle(hole_d / 2).cutBlind(-actual_depth)
```

## Hardware Reference

### Metric Screws

```python
SCREW_DATA = {
    # size: (head_d, head_h, clearance_d, pilot_d)
    "m2": (3.8, 2.0, 2.4, 1.6),
    "m2.5": (4.5, 2.5, 2.9, 2.0),
    "m3": (5.5, 3.0, 3.4, 2.5),
    "m4": (7.0, 4.0, 4.5, 3.3),
    "m5": (8.5, 5.0, 5.5, 4.2),
    "m6": (10.0, 6.0, 6.6, 5.0),
}

def counterbore(wp, size, through_depth, head_sink=None):
    """Create counterbored hole for socket head cap screw."""
    data = SCREW_DATA.get(size.lower())
    if not data:
        raise ValueError(f"Unknown screw size: {size}")

    head_d, head_h, clearance_d, _ = data
    head_depth = head_sink or head_h + 0.3

    return (
        wp
        .circle(clearance_d / 2).cutBlind(-through_depth)
        .faces(">Z").workplane()
        .circle((head_d + 0.5) / 2).cutBlind(-head_depth)
    )
```

### Hex Nuts

```python
NUT_DATA = {
    # size: (width_across_flats, width_across_corners, thickness)
    "m2": (4.0, 4.6, 1.6),
    "m2.5": (5.0, 5.8, 2.0),
    "m3": (5.5, 6.4, 2.4),
    "m4": (7.0, 8.1, 3.2),
    "m5": (8.0, 9.2, 4.0),
    "m6": (10.0, 11.5, 5.0),
}

def hex_nut_pocket(wp, size, depth=None):
    """Create pocket for hex nut."""
    data = NUT_DATA.get(size.lower())
    if not data:
        raise ValueError(f"Unknown nut size: {size}")

    waf, wac, thickness = data
    pocket_depth = depth or thickness + 0.4

    # Hex pocket (width across corners + clearance)
    return (
        wp
        .polygon(6, wac + 0.4)
        .cutBlind(-pocket_depth)
    )
```

## Print Optimization

### Overhang Handling

```python
MAX_OVERHANG_ANGLE = 45  # degrees

def teardrop_hole(wp, d, depth, direction="Y"):
    """Self-supporting horizontal hole."""
    # Teardrop is circle + 45-degree diamond on top
    return (
        wp
        .circle(d / 2)
        .polygon(4, d / 2 * 1.414)  # Diamond circumscribed
        .extrude(-depth)
    )
```

### Bottom Chamfer (Elephant Foot)

```python
def with_bottom_chamfer(part, chamfer=0.4):
    """Add chamfer to bottom edges to prevent elephant foot."""
    return part.edges("<Z").chamfer(chamfer)
```

### Bridge-Friendly Features

```python
def bridge_slot(wp, width, height, depth):
    """Slot with pointed top for better bridging."""
    # Rectangular bottom with 45-degree roof
    return (
        wp
        .rect(width, height * 0.7)
        .workplane(offset=height * 0.7)
        .lineTo(width/2, height * 0.3)
        .lineTo(-width/2, height * 0.3)
        .close()
        .loft()
        .cutBlind(-depth)
    )
```

## Structural Considerations

### Rib Design

```python
def add_ribs(part, face_selector, rib_height, rib_thick, spacing):
    """Add reinforcement ribs to a face."""
    face = part.faces(face_selector)
    bb = face.val().BoundingBox()

    n_ribs = int((bb.xlen - 10) / spacing)

    for i in range(n_ribs):
        x = bb.xmin + 5 + i * spacing
        rib = (
            cq.Workplane("XZ")
            .center(x, bb.zmin)
            .rect(rib_thick, rib_height)
            .extrude(bb.ylen)
        )
        part = part.union(rib)

    return part
```

### Gusset Design

```python
def gusset(size, thickness):
    """45-degree triangular gusset."""
    return (
        cq.Workplane("XZ")
        .lineTo(size, 0)
        .lineTo(0, size)
        .close()
        .extrude(thickness)
    )
```

## Export Settings

### STL Quality

```python
from cadquery import exporters

# Standard quality
exporters.export(model, "output.stl")

# High quality (smaller triangles)
exporters.export(
    model,
    "output_hq.stl",
    tolerance=0.01,        # Linear tolerance in mm
    angularTolerance=0.1   # Angular tolerance in degrees
)

# Lower quality for preview
exporters.export(
    model,
    "output_draft.stl",
    tolerance=0.1,
    angularTolerance=1.0
)
```

### STEP Export (for CAM)

```python
# STEP preserves B-rep, better for machining
exporters.export(model, "output.step")
```

## Validation

### Manifold Check

```python
def is_manifold(part):
    """Check if part is watertight."""
    shape = part.val()

    # Check for open shells
    for shell in shape.Shells():
        if not shell.Closed():
            return False

    return True
```

### Volume and Mass

```python
def part_stats(part, density=1.24):
    """Calculate volume and estimated mass."""
    shape = part.val()
    volume_mm3 = shape.Volume()
    volume_cm3 = volume_mm3 / 1000
    mass_g = volume_cm3 * density

    bb = shape.BoundingBox()

    return {
        "volume_cm3": volume_cm3,
        "mass_g": mass_g,
        "size": (bb.xlen, bb.ylen, bb.zlen),
        "center": shape.Center().toTuple(),
    }
```

### Bed Fit Check

```python
# Common printer bed sizes
PRINTERS = {
    "bambu_p1s": (256, 256, 256),
    "bambu_a1": (256, 256, 256),
    "bambu_a1_mini": (180, 180, 180),
    "prusa_mk4": (250, 210, 220),
    "prusa_mini": (180, 180, 180),
    "ender3": (220, 220, 250),
    "voron_0": (120, 120, 120),
    "voron_2": (350, 350, 350),
}

def fits_printer(part, printer="bambu_p1s"):
    """Check if part fits on printer bed."""
    bed = PRINTERS.get(printer, (220, 220, 250))
    bb = part.val().BoundingBox()

    fits = (bb.xlen <= bed[0] and
            bb.ylen <= bed[1] and
            bb.zlen <= bed[2])

    margin = [bed[i] - [bb.xlen, bb.ylen, bb.zlen][i] for i in range(3)]

    return {
        "fits": fits,
        "part_size": (bb.xlen, bb.ylen, bb.zlen),
        "bed_size": bed,
        "margin": margin,
    }
```
