# 3D Print Design Skills

Claude Code skills for designing and implementing 3D printable objects.

## Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `3d-print-design` | Requirements & specs | **Use first** - gathers requirements, creates formal specifications |
| `cadquery` | CadQuery implementation | **Preferred** - Python CAD with edge selection, fillets, workplanes |
| `openscad` | OpenSCAD implementation | **Deprecated** - only for existing .scad files or explicit requests |

## Workflow

```
1. User: "Design a stand for my device"
   ↓
2. 3d-print-design skill: Gather requirements, create spec
   ↓
3. cadquery skill: Implement the design in Python
   ↓
4. Export STL/STEP for printing
```

## Structure

```
design-3d-prints/
├── skills/
│   ├── 3d-print-design/     # Requirements & specification
│   │   └── SKILL.md
│   ├── cadquery/            # CadQuery implementation
│   │   ├── SKILL.md
│   │   ├── examples/
│   │   └── references/
│   └── openscad/            # OpenSCAD implementation (deprecated)
│       ├── SKILL.md
│       ├── examples/
│       ├── references/
│       └── scripts/
└── shared/
    └── manufacturing.md     # Shared constraints & hardware data
```

## Installation

Symlink skills to Claude's skills directory:

```bash
ln -s ~/code/design-3d-prints/skills/3d-print-design ~/.claude/skills/
ln -s ~/code/design-3d-prints/skills/cadquery ~/.claude/skills/
ln -s ~/code/design-3d-prints/skills/openscad ~/.claude/skills/
```

## Why CadQuery over OpenSCAD?

| Challenge | OpenSCAD | CadQuery |
|-----------|----------|----------|
| Edge fillets | Manual hull() hacks | `.edges().fillet()` |
| Selective chamfers | Nearly impossible | Edge selectors |
| Geometry on slopes | Manual trig | `.faces(">Z").workplane()` |
| Edge selection | Not possible | Full selector system |
