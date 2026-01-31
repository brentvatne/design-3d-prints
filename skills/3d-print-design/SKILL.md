---
name: 3d-print-design
description: "Use BEFORE cadquery or openscad skills. Gathers requirements, creates formal specifications, and validates design constraints for 3D printable objects. Triggers on: 'design a stand', 'create a holder', 'make a bracket', 'I need a mount for...', or any 3D printing design request."
---

# 3D Print Design Skill

Gather requirements and create formal specifications for 3D printable objects before implementation.

> 📋 **Use this skill first**, then hand off to `cadquery` (preferred) or `openscad` for implementation.

## Design Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│  1. REQUIREMENTS    →   2. SPECIFICATION   →   3. IMPLEMENT │
│  (this skill)           (this skill)           (cadquery)   │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Requirements Gathering (MANDATORY)

**Before ANY design work**, gather complete requirements through structured questions. Ask too many questions rather than making assumptions.

### For Stands/Holders/Cradles

Ask ALL of these (user can answer "research it" for any):

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

### For Boxes/Enclosures

1. **Interior dimensions**: What needs to fit inside?
2. **Lid type**: None, removable, hinged, sliding?
3. **Wall thickness**: Light (2mm), standard (3mm), structural (4mm+)?
4. **Mounting**: Screws, clips, magnets, friction fit?
5. **Access**: Which sides need openings?

### For Brackets/Mounts

1. **What is being mounted**: Dimensions and weight?
2. **Mounting surface**: Wall, desk, pole? Screw holes or clamp?
3. **Load direction**: Hanging, resting, cantilevered?
4. **Adjustment needed**: Fixed or adjustable angle/position?

### For Cable Management

1. **Cable diameter(s)**: Single or multiple cables?
2. **Entry/exit**: How do cables enter and exit?
3. **Mounting**: Adhesive, screw, clip-on?
4. **Quantity needed**: How many clips/holders?

## Phase 2: Formal Specification (MANDATORY)

After gathering requirements, present a formal spec for user approval. **DO NOT proceed to implementation until the spec is approved.**

### Specification Template

```markdown
# [Object Name] - Design Specification

## Overview

| Field | Value |
|-------|-------|
| Object | [Name] |
| Type | Stand / Box / Bracket / Mount / Other |
| File | `[filename].py` |

## Device/Contents

| Parameter | Value |
|-----------|-------|
| Model | [Device name] |
| Width | ___ mm |
| Depth | ___ mm |
| Height | ___ mm |
| Weight | ___ kg |
| Clearance | ___ mm (default: 0.5) |

## Stand Geometry (if applicable)

| Parameter | Value | Derivation |
|-----------|-------|------------|
| Tilt angle | ___° | User specified |
| Front height | ___ mm | User specified |
| Back height | ___ mm | front_height + depth × tan(tilt) |
| Stand width | ___ mm | device_width + clearance×2 + wall×2 |
| Stand depth | ___ mm | device_depth + clearance×2 + wall×2 |

## Side Configuration

| Side | Shelf | Lip | Shelf Width | Lip Height |
|------|-------|-----|-------------|------------|
| Front | Y/N | Y/N | ___ mm | ___ mm |
| Back | Y/N | Y/N | ___ mm | ___ mm |
| Left | Y/N | Y/N | ___ mm | ___ mm |
| Right | Y/N | Y/N | ___ mm | ___ mm |

## Interior

| Parameter | Value |
|-----------|-------|
| Hollow | Y/N |
| Shape | [Description] |
| Contents | [What goes inside, with dimensions] |

## Features

| Feature | Enabled | Specification |
|---------|---------|---------------|
| Cable hole | Y/N | ___×___mm, location, corner radius |
| Ventilation | Y/N | [Description] |
| Mounting holes | Y/N | [Description] |
| Other | Y/N | [Description] |

## Construction

| Parameter | Value |
|-----------|-------|
| Wall thickness | ___ mm |
| Floor thickness | ___ mm |
| Corner radius | ___ mm |
| Bottom chamfer | 0.5 mm (elephant foot) |
| Pocket fillet | 3 mm (stress relief) |

## Printer

| Parameter | Value |
|-----------|-------|
| Target printer | [Name] |
| Bed size | ___ × ___ × ___ mm |
| Model footprint | ___ × ___ mm |
| Fit check | ✓/✗ |
```

**After presenting the spec, ask**: "Does this specification match what you want? Please review each section."

## Phase 3: Validate Spec Completeness

Before implementation, verify the spec is complete:

### Checklist

- [ ] All dimensions specified (no "TBD" or blanks)
- [ ] Clearances defined for moving/fitted parts
- [ ] Wall thickness appropriate for load
- [ ] Corner radii specified
- [ ] All features listed with dimensions
- [ ] Printer fit verified
- [ ] Interior contents fit verified (if hollow)

### Common Spec Gaps

| Missing | Impact | Resolution |
|---------|--------|------------|
| Clearance not specified | Parts won't fit | Ask: "How tight should the fit be?" |
| No corner radius | Sharp edges uncomfortable | Default to 3-5mm |
| Wall thickness unclear | Strength unknown | Ask about load requirements |
| Cable hole unspecified | Cables can't route | Ask about cable access |

## Manufacturing Constraints

### Minimum Wall Thickness

| Application | Minimum | Recommended |
|-------------|---------|-------------|
| Decorative | 0.8 mm | 1.2 mm |
| Functional | 1.2 mm | 2.0 mm |
| Structural | 1.6 mm | 2.4 mm |
| Load-bearing | 2.4 mm | 3.2 mm |

### Tolerances

| Fit Type | Clearance | Use Case |
|----------|-----------|----------|
| Loose | 0.4-0.6 mm | Easy insertion, rattles OK |
| Free | 0.2-0.3 mm | Smooth sliding fit |
| Close | 0.1-0.15 mm | Snug fit, slight friction |
| Press | -0.05 mm | Interference fit |

### Overhang Limits

- **Maximum overhang without supports**: 45°
- **Bridging limit**: ~50mm (printer dependent)
- **Minimum hole diameter**: 2mm (horizontal), 1mm (vertical)

### Chamfers and Fillets

| Location | Type | Size | Purpose |
|----------|------|------|---------|
| Bottom edges | Chamfer | 0.5 mm | Elephant foot prevention |
| Top edges | Chamfer | 0.3-0.8 mm | Chip prevention |
| Inside corners | Fillet | 2-3 mm | Stress relief |
| Outside corners | Fillet | 3-8 mm | Grip comfort, aesthetics |

## Handoff to Implementation

Once spec is approved, hand off to implementation:

```
✅ Spec approved → Use `cadquery` skill (PREFERRED)
                   or `openscad` skill (if explicitly requested)
```

The implementation skill will receive the spec and generate code.
