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

**Before ANY design work**, use the AskUserQuestion tool to gather requirements. Ask too many questions rather than making assumptions.

### How to Prompt

Use AskUserQuestion with 2-4 focused questions per round. Group related questions together. Continue until all requirements are gathered.

### For Stands/Holders/Cradles

**Round 1 - Device & Orientation:**
```
Question: "What device is this stand for?"
Options: [User describes device] → Follow up to get exact W × D × H dimensions

Question: "Should the device be tilted?"
Options: ["Flat (0°)", "Slight tilt (5-10°)", "Ergonomic tilt (12-15°)", "Steep (20°+)"]
```

**Round 2 - Support Configuration:**
```
Question: "How should the device be held in place?"
Options: [
  "Shelf on all sides with front lip (most secure)",
  "Shelf on sides, open back for cables",
  "Minimal - just corners",
  "Let me specify each side"
]
→ If "specify each side", ask about front/back/left/right individually
```

**Round 3 - Interior & Features:**
```
Question: "Does the stand need hollow interior storage?"
Options: ["No - solid base", "Yes - for batteries/cables", "Yes - for specific items"]
→ If yes, ask what goes inside with dimensions

Question: "What openings are needed?"
Options: ["Cable hole in back", "Ventilation slots", "USB/power access", "None", "Multiple"]
```

**Round 4 - Construction:**
```
Question: "How sturdy should this be?"
Options: [
  "Light duty (3mm walls) - decorative, light devices",
  "Standard (5mm walls) - most devices (Recommended)",
  "Heavy duty (8mm walls) - heavy equipment"
]

Question: "Corner style?"
Options: ["Rounded (8mm) - comfortable grip", "Subtle (3-5mm)", "Sharp - industrial look"]
```

**Round 5 - Printer:**
```
Question: "What printer will you use?"
Options: ["Bambu P2S (256mm) (Recommended)", "Bambu P1S/A1 (256mm)", "Prusa MK4 (250×210mm)", "Ender 3 (220mm)", "Other"]
```

### For Boxes/Enclosures

**Round 1:** What needs to fit inside? (get dimensions)
**Round 2:** Lid type? (none, removable, hinged, sliding)
**Round 3:** Wall thickness and mounting method?
**Round 4:** Which sides need openings?

### For Brackets/Mounts

**Round 1:** What's being mounted? (dimensions, weight)
**Round 2:** Mounting surface? (wall, desk, pole) + attachment method?
**Round 3:** Load direction? (hanging, resting, cantilevered)
**Round 4:** Fixed or adjustable?

### For Cable Management

**Round 1:** Cable diameter(s) and quantity?
**Round 2:** Entry/exit configuration?
**Round 3:** Mounting method? (adhesive, screw, clip-on)

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
