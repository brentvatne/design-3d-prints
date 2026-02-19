# CadQuery Design Patterns

Common patterns for functional 3D printed parts.

## 0. Chamfers and Fillets

CadQuery makes chamfers and fillets much easier than OpenSCAD. Use them liberally.

### When to Use Each

| Feature | Chamfer | Fillet |
|---------|---------|--------|
| **Shape** | Flat 45° bevel | Smooth curved radius |
| **Method** | `.chamfer(size)` | `.fillet(radius)` |
| **Best for** | Bottom edges, holes, mounting | Outer corners, stress points |

### Size Guidelines

| Application | Chamfer | Fillet (outer) | Fillet (inner) |
|-------------|---------|----------------|----------------|
| Elephant foot | 0.4-0.5mm | -- | -- |
| Mounting holes | 0.5-1mm | -- | -- |
| Handheld objects | -- | 5-8mm | -- |
| Structural brackets | -- | 5-8mm | 2-3mm |
| Stress relief | -- | -- | 1-3mm |

### Critical: Inside Corners of Pockets

**Materials always break at the weakest link - the base of any pocket or inside corner.**

Every pocket, slot, or cutout needs a small radius at corners:

```python
# BAD: Sharp corners in pocket (will crack under stress)
part = (
    cq.Workplane("XY")
    .rect(50, 50)
    .extrude(20)
    .faces(">Z")
    .rect(30, 30)
    .cutBlind(-15)  # Sharp corners!
)

# GOOD: Filleted corners in pocket
part = (
    cq.Workplane("XY")
    .rect(50, 50)
    .extrude(20)
    .faces(">Z")
    .rect(30, 30)
    .cutBlind(-15)
    .edges(">Z").fillet(1)  # 1mm radius prevents cracking
)
```

### Edge Selectors for Targeting

```python
# Vertical edges (most common for boxes)
part.edges("|Z").fillet(3)

# Top edges only
part.edges(">Z").fillet(2)

# Bottom edges only (elephant foot prevention)
part.edges("<Z").chamfer(0.4)

# Specific corner (combine selectors with "and")
part.edges(">X and >Z").fillet(5)

# All edges on a face
part.faces(">Z").edges().fillet(1)

# Interior edges of a pocket (after cutting)
part.edges("<Z and not |Z").fillet(1)
```

### Common Patterns

```python
# Complete box with all edge treatments
def finished_box(w, d, h, wall=3):
    return (
        cq.Workplane("XY")
        .rect(w, d)
        .extrude(h)
        .edges("|Z").fillet(5)      # Round vertical edges
        .edges("<Z").chamfer(0.4)   # Bottom chamfer (elephant foot)
        .faces(">Z").shell(-wall)   # Hollow out
        .edges(">Z").fillet(1)      # Round top lip
    )

# Pocket with stress-relief fillets
def pocket_with_fillets(part, pocket_w, pocket_d, depth, fillet_r=1):
    return (
        part
        .faces(">Z")
        .rect(pocket_w, pocket_d)
        .cutBlind(-depth)
        .edges(
            cq.selectors.BoxSelector(
                (-pocket_w/2-1, -pocket_d/2-1, -depth-1),
                (pocket_w/2+1, pocket_d/2+1, 1)
            )
        ).fillet(fillet_r)
    )
```

### Material Considerations

- **PLA**: Brittle - generous outer fillets (3-5mm), always fillet inside corners
- **PETG**: More forgiving - standard radii work well
- **TPU**: Large outer radii (5-8mm), avoid any sharp inside corners
- **ABS**: Stress relief fillets critical on joints

## 1. Boxes and Enclosures

### Basic Shell Box

```python
def shell_box(width, depth, height, wall=2.4):
    """Box with uniform wall thickness, open top."""
    return (
        cq.Workplane("XY")
        .rect(width, depth)
        .extrude(height)
        .edges("|Z").fillet(3)
        .faces(">Z").shell(-wall)
    )
```

### Box with Lid

```python
def box_with_lid(inner_w, inner_d, inner_h, wall=2.4, lip=5, clearance=0.25):
    """Box and matching lid with overlap lip."""
    outer_w = inner_w + wall * 2
    outer_d = inner_d + wall * 2

    # Box
    box = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(inner_h + wall)
        .edges("|Z").fillet(3)
        .faces(">Z").shell(-wall)
    )

    # Lid with inner lip
    lid = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(wall)
        .edges("|Z").fillet(3)
        # Inner lip
        .faces("<Z")
        .workplane(invert=True)
        .rect(inner_w - clearance*2, inner_d - clearance*2)
        .extrude(lip)
        .edges("<Z and |Z").fillet(1)
    )

    return box, lid.translate((outer_w + 10, 0, 0))
```

### Electronics Enclosure with PCB Standoffs

```python
def electronics_enclosure(pcb_w, pcb_d, pcb_clearance=5, standoff_h=5, wall=2.4):
    """Enclosure sized for a PCB with corner standoffs."""
    inner_w = pcb_w + pcb_clearance * 2
    inner_d = pcb_d + pcb_clearance * 2
    inner_h = standoff_h + 25  # Room above PCB
    outer_w = inner_w + wall * 2
    outer_d = inner_d + wall * 2

    # Main box
    box = (
        cq.Workplane("XY")
        .rect(outer_w, outer_d)
        .extrude(inner_h + wall)
        .edges("|Z").fillet(3)
        .faces(">Z").shell(-wall)
    )

    # PCB standoffs at corners
    standoff_offset = 3  # Distance from PCB edge to mounting hole
    standoff_d = 6       # Standoff diameter
    hole_d = 2.5         # M2.5 pilot hole

    pcb_x = wall + pcb_clearance
    pcb_y = wall + pcb_clearance

    for x in [pcb_x + standoff_offset, pcb_x + pcb_w - standoff_offset]:
        for y in [pcb_y + standoff_offset, pcb_y + pcb_d - standoff_offset]:
            standoff = (
                cq.Workplane("XY")
                .center(x - outer_w/2, y - outer_d/2)
                .circle(standoff_d/2)
                .extrude(standoff_h + wall)
                .faces(">Z")
                .circle(hole_d/2)
                .cutBlind(-standoff_h)
            )
            box = box.union(standoff)

    return box
```

## 2. Stands and Cradles

### Wedge Stand with Tilted Platform

```python
import math

def wedge_stand(device_w, device_d, device_h, tilt=15, wall=5, lip=10, shelf=10):
    """Wedge stand with tilted platform and shelf."""
    clearance = 0.5
    pocket_w = device_w + clearance * 2
    pocket_d = device_d + clearance * 2
    stand_w = pocket_w + wall * 2
    stand_d = pocket_d + wall * 2

    front_h = 50
    tilt_rad = math.radians(tilt)
    back_h = front_h + stand_d * math.tan(tilt_rad)

    # Create wedge base using loft
    stand = (
        cq.Workplane("XZ")
        .center(0, 0)
        # Front profile
        .lineTo(stand_w, 0)
        .lineTo(stand_w, front_h)
        .lineTo(0, front_h)
        .close()
        .extrude(stand_d)
    )

    # Cut angled top
    stand = (
        stand
        .faces(">Z")
        .workplane()
        .transformed(rotate=(tilt, 0, 0))
        .rect(stand_w * 2, stand_d * 2)
        .cutBlind(-back_h)
    )

    # Round vertical edges
    stand = stand.edges("|Z").fillet(8)

    # Device pocket - workplane on sloped face
    stand = (
        stand
        .faces(">Z")
        .workplane()
        .rect(pocket_w, pocket_d)
        .cutBlind(-front_h/2)
    )

    # Shelf opening
    shelf_w = pocket_w - shelf * 2
    shelf_d = pocket_d - shelf * 2
    stand = (
        stand
        .faces(">Z")
        .workplane()
        .rect(shelf_w, shelf_d)
        .cutBlind(-wall * 2)
    )

    return stand
```

### Minimal Phone Stand

```python
def phone_stand(phone_w, phone_d=10, angle=70, wall=4, lip=8):
    """Minimal wedge stand for phone."""
    import math

    stand_w = phone_w + wall * 2
    depth = 60
    height = 30

    # Base wedge
    stand = (
        cq.Workplane("XY")
        .rect(stand_w, depth)
        .extrude(height)
        .edges("|Z").fillet(5)
    )

    # Cut phone slot
    slot_angle = 90 - angle
    stand = (
        stand
        .faces(">Y")
        .workplane()
        .center(0, height/2)
        .transformed(rotate=(slot_angle, 0, 0))
        .rect(phone_w, height * 2)
        .cutBlind(-depth)
    )

    # Front lip
    stand = (
        stand
        .faces("<Y")
        .workplane()
        .center(0, -height/2 + lip/2)
        .rect(phone_w, lip)
        .extrude(phone_d + 2)
    )

    # Cable slot
    stand = (
        stand
        .faces("<Y")
        .workplane()
        .center(0, lip/2)
        .rect(15, lip)
        .cutThruAll()
    )

    return stand
```

### Corbel Bracket (Column-to-Platform Support)

A **corbel** is a bracket projecting from a wall or column to support weight above, often with a concave curved profile underneath. Classic architectural element, great for stands where a thin column supports a wide platform.

```
Side view:
    ┌─────────────────────────┐  ← platform
    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
    └───────────────╮   ┌─────┘
                     ╲  │  ← column (thin, same width top to bottom)
                      ╲ │
                       ╲│
                        │
                        │
    ════════════════════════  ← desk
```

The column stays a uniform width. The concave curve sweeps from partway down the column face outward along the platform underside, providing structural support.

```python
def make_corbel_column(col_w, platform_z, corbel_r, wall, y_pos):
    """
    Column with corbel bracket underneath platform.

    Args:
        col_w: Column width (X dimension)
        platform_z: Z height of platform bottom
        corbel_r: Corbel curve radius (larger = more dramatic sweep)
        wall: Column depth (Y dimension, typically wall thickness)
        y_pos: Y position to place the column
    """
    # Arc from column inner face to platform underside
    # Center of curvature at (col_w + corbel_r, platform_z - corbel_r)
    mid_x = (col_w + corbel_r) - corbel_r * 0.707
    mid_z = (platform_z - corbel_r) + corbel_r * 0.707
    overlap = 2  # extend into platform for solid fusion

    col = (
        cq.Workplane("XZ")
        .moveTo(0, 0)
        .lineTo(col_w, 0)                          # column base
        .lineTo(col_w, platform_z - corbel_r)      # up column face
        .threePointArc((mid_x, mid_z),
                       (col_w + corbel_r, platform_z))  # concave sweep
        .lineTo(col_w + corbel_r, platform_z + overlap)  # into platform
        .lineTo(0, platform_z + overlap)             # across to outer
        .close()
        .extrude(wall)
        .translate((0, y_pos, 0))
    )
    return col
```

**Sizing guidelines:**
| Platform height | Corbel radius | Visual effect |
|----------------|---------------|---------------|
| 40-60mm | 20-30mm | Subtle bracket |
| 60-80mm | 30-45mm | Balanced (recommended) |
| 80-120mm | 40-60mm | Dramatic sweep |

**Key rule:** `corbel_r` should be roughly 40-60% of the platform height for good proportions.

## 3. Brackets and Mounts

### L-Bracket with Gusset

```python
def l_bracket(arm_v=50, arm_h=60, width=40, thick=4, gusset=20):
    """L-bracket with triangular gusset reinforcement."""

    # Vertical arm
    bracket = (
        cq.Workplane("XY")
        .rect(thick, width)
        .extrude(arm_v)
    )

    # Horizontal arm
    bracket = (
        bracket
        .faces("<Z")
        .workplane()
        .center(arm_h/2 - thick/2, 0)
        .rect(arm_h, width)
        .extrude(-thick)
    )

    # Gusset
    gusset_pts = [(0, 0), (gusset, 0), (0, gusset)]
    gusset_shape = (
        cq.Workplane("XZ")
        .center(thick, thick)
        .polyline(gusset_pts)
        .close()
        .extrude(width)
    )
    bracket = bracket.union(gusset_shape)

    # Fillet outer corner (large)
    bracket = bracket.edges(">X and >Z").fillet(8)

    # Fillet inner corner (small, stress relief)
    bracket = bracket.edges("<X and <Z and |Y").fillet(2)

    # Round vertical edges
    bracket = bracket.edges("|Z").fillet(2)

    # Mounting holes - vertical arm
    bracket = (
        bracket
        .faces("-Y")
        .workplane()
        .center(-thick/2, arm_v * 0.3)
        .circle(2.2).cutThruAll()
        .center(0, arm_v * 0.4)
        .circle(2.2).cutThruAll()
    )

    # Mounting holes - horizontal arm
    bracket = (
        bracket
        .faces("-Z")
        .workplane()
        .center(arm_h * 0.4, 0)
        .circle(2.2).cutThruAll()
        .center(arm_h * 0.3, 0)
        .circle(2.2).cutThruAll()
    )

    return bracket
```

### Wall Mount with Keyhole

```python
def wall_mount(width=50, height=30, thick=4):
    """Wall mount plate with keyhole slots."""

    plate = (
        cq.Workplane("XY")
        .rect(width, height)
        .extrude(thick)
        .edges("|Z").fillet(3)
    )

    # Keyhole slot
    def keyhole(wp):
        return (
            wp
            .circle(4.5)  # Screw head
            .center(0, -8)
            .circle(2.5)  # Screw shaft
            .loft()
        )

    # Add keyholes
    plate = (
        plate
        .faces(">Z")
        .workplane()
        .center(-width/4, 0)
        .circle(4.5)
        .center(0, -8)
        .circle(2.5)
        .extrude(-thick/2, taper=-20)
    )

    plate = (
        plate
        .faces(">Z")
        .workplane()
        .center(width/4, 0)
        .circle(4.5)
        .center(0, -8)
        .circle(2.5)
        .extrude(-thick/2, taper=-20)
    )

    return plate
```

## 4. Clips and Fasteners

### Cable Clip

```python
def cable_clip(cable_d=6, base_w=15, base_d=10, base_h=3):
    """Clip for holding cables."""
    clip_h = cable_d + 4
    clip_wall = 2

    # Base
    clip = (
        cq.Workplane("XY")
        .rect(base_w, base_d)
        .extrude(base_h)
        .edges("|Z").fillet(2)
    )

    # Clip cylinder
    clip = (
        clip
        .faces(">Z")
        .workplane()
        .circle((cable_d + clip_wall * 2) / 2)
        .circle(cable_d / 2 + 0.3)  # Clearance
        .extrude(clip_h)
    )

    # Entry slot
    slot_w = cable_d * 0.7
    clip = (
        clip
        .faces(">Z")
        .workplane()
        .center(0, -(cable_d + clip_wall * 2) / 2)
        .rect(slot_w, clip_wall * 2)
        .cutBlind(-clip_h * 0.6)
    )

    return clip
```

### Snap-Fit Clip

```python
def snap_clip(length=15, width=8, thick=1.5, hook=2):
    """Cantilever snap-fit clip."""

    # Base
    clip = (
        cq.Workplane("XY")
        .rect(thick * 2, width)
        .extrude(5)
    )

    # Beam
    clip = (
        clip
        .faces(">Z")
        .workplane()
        .rect(thick, width)
        .extrude(length)
    )

    # Hook
    clip = (
        clip
        .faces(">Z")
        .workplane()
        .center(thick/2 + hook/2, 0)
        .rect(hook, width)
        .extrude(2)
        # Angled entry
        .faces(">Z")
        .workplane()
        .center(-hook/2, 0)
        .transformed(rotate=(0, -45, 0))
        .rect(hook * 2, width)
        .cutBlind(-hook * 2)
    )

    return clip
```

## 5. Functional Features

### Threaded Boss

```python
def threaded_boss(outer_d=8, height=10, thread_d=4, thread_depth=8):
    """Boss for heat-set insert or self-tapping screw."""

    boss = (
        cq.Workplane("XY")
        .circle(outer_d / 2)
        .extrude(height)
        .faces(">Z")
        .circle(thread_d / 2)
        .cutBlind(-thread_depth)
        .edges(">Z").chamfer(0.5)
    )

    return boss
```

### Vent Pattern

```python
def vent_panel(width, height, thick, slot_w=2, slot_spacing=5):
    """Panel with ventilation slots."""

    panel = (
        cq.Workplane("XY")
        .rect(width, height)
        .extrude(thick)
        .edges("|Z").fillet(2)
    )

    # Add vent slots
    n_slots = int((width - 20) / slot_spacing)
    start_x = -width/2 + 10 + slot_w/2

    for i in range(n_slots):
        x = start_x + i * slot_spacing
        panel = (
            panel
            .faces(">Z")
            .workplane()
            .center(x, 0)
            .rect(slot_w, height - 20)
            .cutThruAll()
        )

    return panel
```

### Mounting Ear

```python
def add_mounting_ears(part, ear_w=15, ear_h=8, hole_d=4.5):
    """Add mounting ears to a part."""
    # Get bounding box
    bb = part.val().BoundingBox()

    # Left ear
    ear_l = (
        cq.Workplane("XY")
        .center(bb.xmin - ear_w/2, (bb.ymin + bb.ymax)/2)
        .rect(ear_w, ear_h)
        .extrude(bb.zmax - bb.zmin)
        .faces("<X")
        .workplane()
        .center(0, (bb.zmax - bb.zmin)/2)
        .circle(hole_d/2)
        .cutThruAll()
    )

    # Right ear
    ear_r = (
        cq.Workplane("XY")
        .center(bb.xmax + ear_w/2, (bb.ymin + bb.ymax)/2)
        .rect(ear_w, ear_h)
        .extrude(bb.zmax - bb.zmin)
        .faces(">X")
        .workplane()
        .center(0, (bb.zmax - bb.zmin)/2)
        .circle(hole_d/2)
        .cutThruAll()
    )

    return part.union(ear_l).union(ear_r)
```

## 6. Assembly Patterns

### Multi-Part with Alignment Pins

```python
def split_with_pins(part, split_z, pin_d=4, pin_h=6, clearance=0.2):
    """Split a part with alignment pins."""

    bb = part.val().BoundingBox()
    cx = (bb.xmin + bb.xmax) / 2
    cy = (bb.ymin + bb.ymax) / 2

    # Pin positions
    pin_positions = [
        (bb.xmin + 10, bb.ymin + 10),
        (bb.xmax - 10, bb.ymin + 10),
        (bb.xmin + 10, bb.ymax - 10),
        (bb.xmax - 10, bb.ymax - 10),
    ]

    # Bottom half with pins
    bottom = (
        part
        .faces("<Z")
        .workplane(offset=split_z)
        .split(keepBottom=True)
    )

    for x, y in pin_positions:
        pin = (
            cq.Workplane("XY")
            .center(x, y)
            .circle(pin_d / 2)
            .extrude(pin_h)
            .edges(">Z").chamfer(0.5)
        )
        pin = pin.translate((0, 0, split_z))
        bottom = bottom.union(pin)

    # Top half with holes
    top = (
        part
        .faces("<Z")
        .workplane(offset=split_z)
        .split(keepTop=True)
    )

    for x, y in pin_positions:
        top = (
            top
            .faces("<Z")
            .workplane()
            .center(x, y)
            .circle((pin_d + clearance * 2) / 2)
            .cutBlind(-pin_h - 1)
        )

    return bottom, top.translate((bb.xmax - bb.xmin + 10, 0, 0))
```

## 7. Utility Functions

### Bounding Box Check

```python
def fits_on_bed(part, bed_x=220, bed_y=220, bed_z=250):
    """Check if part fits on printer bed."""
    bb = part.val().BoundingBox()
    return (bb.xlen <= bed_x and
            bb.ylen <= bed_y and
            bb.zlen <= bed_z)
```

### Center on Origin

```python
def center_on_origin(part):
    """Move part so its center is at origin."""
    bb = part.val().BoundingBox()
    return part.translate((
        -(bb.xmin + bb.xmax) / 2,
        -(bb.ymin + bb.ymax) / 2,
        -bb.zmin
    ))
```

### Export Helpers

```python
def export_all(parts, base_name="part"):
    """Export multiple parts to STL files."""
    from cadquery import exporters

    for i, part in enumerate(parts):
        filename = f"{base_name}_{i+1}.stl"
        exporters.export(part, filename)
        print(f"Exported {filename}")
```

## 8. Adjustable Fit Patterns

When tolerances are tight, design for adjustment instead of relying on perfect dimensions.

### Slotted Holes

```python
def adjustable_mount(hole_d, adjust_range=5, thickness=4):
    """Slot instead of round hole allows position adjustment."""
    return (
        cq.Workplane("XY")
        .slot2D(hole_d + adjust_range, hole_d)
        .extrude(thickness)
    )
```

### Wedge Clamp

```python
def wedge_clamp(width, height, angle=5):
    """
    Wedge that slides to tighten.
    Self-locking due to friction angle (<15° for most materials).
    """
    import math
    wedge_length = height / math.tan(math.radians(angle))

    return (
        cq.Workplane("XZ")
        .lineTo(wedge_length, 0)
        .lineTo(0, height)
        .close()
        .extrude(width)
    )
```

### Eccentric Cam

```python
def eccentric_cam(outer_d=20, offset=2, thick=5):
    """
    Eccentric cam for fine position adjustment.
    Rotate to adjust by 2x offset distance.
    """
    return (
        cq.Workplane("XY")
        .circle(outer_d / 2)
        .extrude(thick)
        .faces(">Z")
        .workplane()
        .center(offset, 0)  # Off-center hole
        .circle(3)  # Adjustment tool socket
        .cutBlind(-thick + 1)
    )
```

## 9. Keyed Alignment

```python
def keyed_alignment(key_w=5, key_h=3, key_d=10):
    """
    Asymmetric key prevents wrong-orientation assembly.
    Use when parts look similar but aren't interchangeable.
    """
    # Asymmetric profile
    return (
        cq.Workplane("XY")
        .moveTo(-key_w/2, 0)
        .lineTo(key_w/2, 0)
        .lineTo(key_w/3, key_h)  # Asymmetric!
        .lineTo(-key_w/2, key_h)
        .close()
        .extrude(key_d)
    )
```

## 10. Label Recess

```python
def add_label_recess(part, label_w, label_h, depth=0.6, corner_r=2):
    """Add recessed area for label/sticker on top face."""
    return (
        part.faces(">Z").workplane()
        .rect(label_w, label_h)
        .cutBlind(-depth)
        .edges(">Z").fillet(corner_r)
    )
```

## 11. Magnet Pockets

```python
def add_magnet_pockets(part, magnet_d=6, magnet_h=3, positions=None):
    """
    Add pockets for press-fit magnets.
    Use interference fit: pocket = magnet_d - 0.2mm
    """
    pocket_d = magnet_d - 0.2
    for x, y in positions:
        part = (
            part.faces("<Z").workplane()
            .center(x, y)
            .circle(pocket_d / 2)
            .cutBlind(-magnet_h)
        )
    return part
```
