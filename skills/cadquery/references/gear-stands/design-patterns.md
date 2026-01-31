# Gear Stand Design Patterns

Common patterns and techniques for designing 3D printable synth stands.

## Pattern 1: End Cheek / Side Bracket

**Most common pattern** - Two pieces that attach to device sides.

### Characteristics
- Two mirror-image pieces (left/right)
- Attach via device mounting holes or rest-on design
- Typically 15-25% of device width per bracket
- Height determines viewing angle

### When to Use
- Single device stands
- When VESA or screw mounting is available
- When minimal material is desired

### CadQuery Implementation
```python
def side_bracket(
    device_depth: float,
    bracket_height: float,
    bracket_width: float = 30,
    wall_thickness: float = 4,
    angle_deg: float = 15
):
    """Create a side bracket for a synth stand."""
    import cadquery as cq
    import math

    angle_rad = math.radians(angle_deg)

    # Base profile - angled support
    result = (
        cq.Workplane("XY")
        .moveTo(0, 0)
        .lineTo(device_depth, 0)
        .lineTo(device_depth, bracket_height)
        .lineTo(0, bracket_height - device_depth * math.tan(angle_rad))
        .close()
        .extrude(bracket_width)
    )

    # Add device rest ledge at top
    ledge = (
        cq.Workplane("XY")
        .workplane(offset=bracket_height - 10)
        .box(device_depth, wall_thickness, bracket_width)
    )

    return result.union(ledge)
```

### Real Example Dimensions
| Device | Bracket Width | Bracket Height | Volume |
|--------|--------------|----------------|--------|
| Elektron Digitakt | 127 mm | 150 mm | 165 cm³ |
| Roland Boutique | 68 mm | 20 mm | 46 cm³ |
| Elektron Syntakt | 175 mm | 99-108 mm | 115 cm³ |

---

## Pattern 2: Asymmetric Tilt

**Innovative approach** - Different heights for left/right create natural tilt.

### Characteristics
- Left bracket shorter than right (or vice versa)
- Height difference creates viewing angle
- No complex angle mechanisms needed
- Simple, elegant solution

### Angle Calculation
```python
import math

def calculate_tilt_angle(height_diff: float, device_width: float) -> float:
    """Calculate tilt angle from height difference."""
    return math.degrees(math.atan(height_diff / device_width))

# Example: Syntakt stand
# Left: 99mm, Right: 108mm, Width: 215mm
angle = calculate_tilt_angle(9, 215)  # ≈ 2.4°
```

### When to Use
- When slight ergonomic tilt is desired
- To avoid complex pivot mechanisms
- For devices with wide footprints

---

## Pattern 3: Modular Three-Piece

**Flexible assembly** - Two side brackets + connecting crossbar.

### Characteristics
- Two identical side pieces
- One or more connecting bars
- Allows size adjustment
- Easier to print (smaller parts)

### Components
1. **Side Brackets** (×2): Identical, vertical supports
2. **Crossbar**: Horizontal connector for rigidity
3. **Optional**: Additional crossbars for longer devices

### CadQuery Implementation
```python
def modular_stand_parts(
    device_width: float,
    device_depth: float,
    stand_height: float = 100,
    bracket_width: float = 32,
    crossbar_height: float = 25
):
    """Generate modular stand components."""
    import cadquery as cq

    # Side bracket
    bracket = (
        cq.Workplane("XY")
        .box(bracket_width, device_depth * 0.9, stand_height)
        # Add connection slots for crossbar
        .faces(">Z").workplane()
        .rect(crossbar_height, 4).cutBlind(-10)
    )

    # Crossbar
    crossbar_length = device_width - (2 * bracket_width) + 20  # overlap
    crossbar = (
        cq.Workplane("XY")
        .box(crossbar_length, 4, crossbar_height)
        # Add tabs for bracket slots
        .faces("<X").workplane()
        .rect(crossbar_height - 1, 3.5).extrude(10)
        .faces(">X").workplane()
        .rect(crossbar_height - 1, 3.5).extrude(10)
    )

    return {"bracket": bracket, "crossbar": crossbar}
```

### Real Example: Dreadbox Typhon Stand
| Part | Dimensions | Count |
|------|------------|-------|
| Side Bracket | 32 × 120 × 102 mm | 2 |
| Crossbar | 198 × 3.5 × 25 mm | 1 |

---

## Pattern 4: Dual-Device Tiered

**Multi-device setup** - Holds two devices at different heights.

### Characteristics
- Accommodates two devices
- Tiered arrangement for visibility
- Larger footprint
- Performance-focused

### Design Considerations
1. **Vertical Spacing**: 30-50mm between tiers typical
2. **Angle Difference**: Lower tier flatter, upper tier more angled
3. **Cable Routing**: Leave gaps for connections
4. **Weight Distribution**: Lower center of gravity

### When to Use
- Live performance setups
- Studio configurations with paired devices
- OP-1 + OP-XY, Digitakt + Digitone combos

### Real Example: TE OP-1 Field + OP-XY
| Specification | Value |
|---------------|-------|
| Total Height | 147 mm |
| Total Depth | 251 mm |
| Bracket Width | 24 mm each |

---

## Pattern 5: Simple Wedge

**Minimal design** - Basic angled platform.

### Characteristics
- Extremely simple geometry
- Very low triangle count
- Fast to print
- Universal compatibility

### CadQuery Implementation
```python
def simple_wedge(
    width: float,
    depth: float,
    front_height: float,
    back_height: float
):
    """Create a simple wedge stand."""
    import cadquery as cq

    # Create wedge profile
    result = (
        cq.Workplane("XZ")
        .moveTo(0, 0)
        .lineTo(depth, 0)
        .lineTo(depth, back_height)
        .lineTo(0, front_height)
        .close()
        .extrude(width)
    )

    return result
```

### When to Use
- Quick prototypes
- Universal/adjustable setups
- Minimal material usage
- Very fast print times

---

## Pattern 6: Snap-Fit / Clip-On

**Tool-free attachment** - Parts snap onto device.

### Characteristics
- No screws or glue required
- Tight friction fit
- May require precise tolerances
- Good for touring/portable use

### Design Tips
1. **Tolerance**: Start with 0.2mm clearance, adjust per printer
2. **Flex Features**: Add living hinges or flex points
3. **Grip Features**: Add texture or rubber inserts
4. **Test Fit**: Print test pieces before full stand

---

## Mounting Methods

### VESA Mount (Elektron)
- Pattern: 100 × 100 mm
- Screws: M4
- **Max Length: 7mm** (critical!)

### Rest-On (Roland Boutique)
- No attachment to device
- Relies on weight and rubber feet
- Easy removal

### Screw-Through
- Uses device's existing screw holes
- Most secure
- Requires matching hole pattern

### Friction Fit
- Tight tolerance grip
- No hardware needed
- Printer-dependent

---

## Ergonomic Guidelines

### Viewing Angles
| Use Case | Recommended Angle |
|----------|------------------|
| Seated desktop | 15-25° |
| Standing | 30-45° |
| Performance | 20-35° |

### Height Guidelines
| Context | Stand Height |
|---------|-------------|
| Low profile | 20-40 mm |
| Desktop ergonomic | 80-120 mm |
| Eye-level (seated) | 150-200 mm |

### Decksaver Compatibility
Many users keep protective covers on their devices. Design considerations:
- Add 3-5mm clearance around device edges
- Test fit with cover attached
- Document compatibility in design
