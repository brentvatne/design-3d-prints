# OpenSCAD Validation & Analysis Scripts

Node.js tools for validating and analyzing OpenSCAD designs for 3D printability.

## Requirements

- Node.js 16+
- OpenSCAD installed and accessible (via PATH or standard install location)

## Scripts

### validate.js - Design Validator

Validates OpenSCAD files for syntax errors, manufacturing constraints, and best practices.

```bash
# Basic validation
node validate.js model.scad

# Strict mode (warnings become errors)
node validate.js model.scad --strict

# JSON output for CI/CD integration
node validate.js model.scad --json

# Custom configuration
node validate.js model.scad --config=my-config.json
```

**Checks performed:**
- OpenSCAD syntax validation (via CLI)
- Wall thickness minimums
- Parameter naming conventions
- $fn resolution settings
- Epsilon usage for boolean operations
- File structure (parameters at top, sections)

### analyze-geometry.js - Geometry Analyzer

Exports design to STL and analyzes for printability issues.

```bash
# Basic analysis
node analyze-geometry.js model.scad

# Keep the generated STL
node analyze-geometry.js model.scad --stl

# Detailed output
node analyze-geometry.js model.scad --detailed

# JSON output
node analyze-geometry.js model.scad --json
```

**Analysis performed:**
- Bounding box dimensions
- Volume and surface area calculation
- Overhang detection and classification
- Thin wall detection
- Print time estimation
- Material usage estimation
- Printability score (0-100)

### test-design.js - Test Suite

Run comprehensive tests on designs with parameter variations.

```bash
# Automatic tests (parameter boundaries, STL validity, manifold check)
node test-design.js model.scad --auto

# Run from test definition file
node test-design.js model.scad --test-file tests.json

# JSON output
node test-design.js model.scad --auto --json
```

**Test types:**
- `render` - Verify design renders without errors
- `boundary` - Test parameter min/max values
- `stl-valid` - Verify STL output is valid
- `manifold` - Check for non-manifold geometry

**Test file format:**
```json
[
  {
    "type": "render",
    "name": "Default render",
    "params": {}
  },
  {
    "type": "boundary",
    "param": "width",
    "values": [10, 50, 100, 200],
    "baseParams": { "height": 30 }
  },
  {
    "type": "stl-valid",
    "name": "Export test",
    "params": { "quality": "high" }
  },
  {
    "type": "manifold",
    "name": "Manifold check",
    "params": {}
  }
]
```

## Configuration

Edit `scad-config.json` to customize validation rules:

```json
{
  "constraints": {
    "minWallThickness": 1.2,
    "minStructuralWall": 2.4,
    "maxOverhangAngle": 45
  },
  "printer": {
    "bedSize": [220, 220, 250],
    "nozzleWidth": 0.4
  }
}
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Validate OpenSCAD Designs

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install OpenSCAD
        run: sudo apt-get install -y openscad

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Validate designs
        run: |
          for file in designs/*.scad; do
            node scripts/validate.js "$file" --strict --json
          done

      - name: Run tests
        run: |
          for file in designs/*.scad; do
            node scripts/test-design.js "$file" --auto --json
          done
```

## Exit Codes

All scripts return:
- `0` - All checks passed
- `1` - One or more checks failed

Use `--json` for machine-readable output in CI/CD pipelines.
