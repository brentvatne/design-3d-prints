# Gear Stand Design Reference

Reference documentation for designing 3D printable stands, cases, and mounts for synthesizers, drum machines, MIDI controllers, and other electronic music equipment.

## Contents

- [device-dimensions.md](device-dimensions.md) - Comprehensive device specifications
- [design-patterns.md](design-patterns.md) - Common stand design patterns and techniques
- [print-settings.md](print-settings.md) - Recommended print settings and materials
- [examples.md](examples.md) - Analyzed real-world examples with geometry data

## Quick Reference

### Most Common Device Families

| Family | Shared Dimensions | Key Feature |
|--------|------------------|-------------|
| Elektron (DT/DN/ST) | 215 × 176 × 63 mm | VESA 100×100, M4 max 7mm |
| Roland Boutique | 300 × 128 × 46-49 mm | Consistent W×D |
| Moog 60HP | 319 × 107 mm panel | Eurorack compatible |
| Korg Volca | 193 × 115 × 46 mm | All identical |
| TE OP-1 Field | 288 × 102 × 29 mm | Lightweight |

### Design Pattern Selection

```
Simple desk stand → End Cheek / Side Bracket
Angled viewing → Asymmetric Height or Wedge
Multiple devices → Tiered or Modular
Portable/touring → Snap-fit with Decksaver compatibility
Minimal material → Simple Wedge
```

### Critical Safety Note

**Elektron Devices**: Never use M4 screws longer than 7mm in VESA mount holes - longer screws will hit the PCB and damage the device!
