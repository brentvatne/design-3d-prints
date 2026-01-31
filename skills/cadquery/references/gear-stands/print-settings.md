# Print Settings for Gear Stands

Recommended print settings based on analysis of successful community designs.

## General Recommendations

### Layer Height
| Quality Level | Layer Height | Use Case |
|--------------|--------------|----------|
| Draft | 0.28-0.32 mm | Prototypes, testing fit |
| Standard | 0.20 mm | Most stands |
| Quality | 0.16 mm | Visible surfaces, snap-fits |
| Fine | 0.12 mm | Detailed features |

**Consensus**: 0.16-0.20 mm is optimal for stands

### Wall Count / Perimeters
| Walls | Strength | Use Case |
|-------|----------|----------|
| 2 | Adequate | Light devices (<500g) |
| 3 | Good | Medium devices (500g-1.5kg) |
| 4+ | Excellent | Heavy devices, high stress |

**Consensus**: 2 walls is sufficient for most stands

### Infill
| Infill % | Strength | Material Use |
|----------|----------|--------------|
| 10% | Light | Fast prints, light devices |
| 15% | Standard | **Most common recommendation** |
| 20% | Strong | Heavier devices |
| 25% | Very Strong | Performance/touring use |
| 100% | Maximum | Small parts, high stress areas |

**Consensus**: 15-20% infill with grid or gyroid pattern

---

## Material Selection

### PLA
**Best for**: Most desktop stands

| Property | Rating |
|----------|--------|
| Ease of printing | ★★★★★ |
| Strength | ★★★☆☆ |
| Heat resistance | ★★☆☆☆ |
| Cost | ★★★★★ |

**Limitations**: Can deform in hot environments (>50°C), may creep under constant load

### PETG
**Best for**: Touring, outdoor use, higher durability

| Property | Rating |
|----------|--------|
| Ease of printing | ★★★★☆ |
| Strength | ★★★★☆ |
| Heat resistance | ★★★★☆ |
| Cost | ★★★★☆ |

**Benefits**: Better layer adhesion, more flexible, higher heat tolerance

### ABS
**Best for**: Maximum durability, professional use

| Property | Rating |
|----------|--------|
| Ease of printing | ★★☆☆☆ |
| Strength | ★★★★★ |
| Heat resistance | ★★★★★ |
| Cost | ★★★★☆ |

**Considerations**: Requires enclosure, prone to warping, emits fumes

### ASA
**Best for**: Outdoor/sunlight exposure

| Property | Rating |
|----------|--------|
| Ease of printing | ★★★☆☆ |
| Strength | ★★★★★ |
| UV resistance | ★★★★★ |
| Cost | ★★★☆☆ |

---

## Orientation Guidelines

### Side Brackets
```
RECOMMENDED: Print standing (Z = height direction)
- Maximizes layer adhesion for vertical loads
- Better surface quality on visible faces
- May need supports for overhangs
```

### Flat Pieces (Crossbars, Trays)
```
RECOMMENDED: Print flat (Z = thickness)
- Fastest print time
- No supports needed
- Best dimensional accuracy
```

### Wedge Stands
```
RECOMMENDED: Print on back face
- No supports needed
- Good surface on device contact area
```

---

## Support Settings

### When Supports Are Needed
- Overhangs > 45-50°
- Bridging > 50mm
- Screw holes in horizontal surfaces

### When Supports Can Be Avoided
- Simple angular geometry
- Rest-on designs
- Careful orientation selection

### Support Settings (when needed)
| Setting | Value |
|---------|-------|
| Pattern | Grid or Lines |
| Density | 10-15% |
| Z Distance | 0.2mm |
| Interface Layers | 2-3 |

---

## Hardware Integration

### Rubber Feet
- **Common Size**: 8mm diameter, 2-3mm height
- **Purpose**: Prevent scratching, add grip
- **Attachment**: Adhesive backed or press-fit holes

### Threaded Inserts
- **M3**: Small accessories, light loads
- **M4**: Elektron VESA mounting, medium loads
- **M5+**: Heavy devices, high-stress connections

### Heat-Set Inserts
| Size | Hole Diameter | Depth |
|------|---------------|-------|
| M3 | 4.0-4.2 mm | 5-6 mm |
| M4 | 5.0-5.3 mm | 6-7 mm |
| M5 | 6.0-6.4 mm | 7-8 mm |

---

## Tolerance Guidelines

### Friction Fit Parts
| Fit Type | Tolerance | Use Case |
|----------|-----------|----------|
| Loose | +0.3 to +0.5 mm | Easy assembly, removable |
| Standard | +0.15 to +0.25 mm | Most applications |
| Tight | +0.05 to +0.15 mm | Snap-fits, permanent |
| Press-fit | -0.05 to +0.05 mm | Interference fit |

### Device Contact Surfaces
- Add 0.5-1.0 mm clearance around device
- Account for protective covers (Decksaver: +3-5mm)
- Test with actual device before final print

---

## Quality Checklist

Before printing a gear stand:

- [ ] Layer height appropriate for detail level
- [ ] Wall count sufficient for device weight
- [ ] Infill adequate for structural needs
- [ ] Material suitable for environment
- [ ] Orientation optimizes strength
- [ ] Supports added only where necessary
- [ ] Tolerances adjusted for printer
- [ ] Hardware holes sized correctly
- [ ] Rubber feet positions marked

---

## Common Issues & Solutions

### Warping
- Use brim (5-10mm)
- Ensure bed adhesion (glue stick, PEI)
- Reduce bed temperature after first layers
- Consider enclosure for ABS

### Weak Layer Adhesion
- Increase nozzle temperature 5-10°C
- Reduce print speed
- Check for cooling fan issues
- Switch to PETG for better adhesion

### Poor Surface Quality on Device Contact
- Orient for best surface on contact areas
- Use lower layer height
- Enable ironing for top surfaces

### Screw Holes Too Tight/Loose
- Calibrate printer flow rate
- Adjust hole diameter in design
- Use heat-set inserts for reliability
