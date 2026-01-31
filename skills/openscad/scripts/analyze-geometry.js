#!/usr/bin/env node

/**
 * OpenSCAD Geometry Analyzer
 *
 * Analyzes OpenSCAD designs for printability issues:
 * - Estimates print time and material usage
 * - Identifies thin walls and small features
 * - Detects overhang issues
 * - Suggests optimizations
 *
 * Requires OpenSCAD to be installed.
 *
 * Usage:
 *   node analyze-geometry.js <file.scad> [--stl] [--detailed]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// ============================================
// CONFIGURATION
// ============================================

// Material profiles with print characteristics
const MATERIALS = {
  pla: {
    name: 'PLA',
    density: 1.24,          // g/cm³
    costPerKg: 25,          // $/kg
    printSpeedMultiplier: 1.0,
  },
  petg: {
    name: 'PETG',
    density: 1.27,
    costPerKg: 30,
    printSpeedMultiplier: 0.85, // Slower for quality
  },
  abs: {
    name: 'ABS',
    density: 1.04,
    costPerKg: 28,
    printSpeedMultiplier: 0.9,
  },
  tpu: {
    name: 'TPU',
    density: 1.21,
    costPerKg: 35,
    printSpeedMultiplier: 0.5, // Much slower for flex
  },
};

// Printer profiles with speed capabilities
const PRINTERS = {
  'p1s': { name: 'Bambu Lab P1S', speedMultiplier: 1.5 },
  'p1p': { name: 'Bambu Lab P1P', speedMultiplier: 1.3 },
  'p2s': { name: 'Bambu Lab P2S', speedMultiplier: 1.6 }, // CoreXY, high-speed
  'x1c': { name: 'Bambu Lab X1 Carbon', speedMultiplier: 1.6 },
  'a1': { name: 'Bambu Lab A1', speedMultiplier: 1.4 },
  'a1mini': { name: 'Bambu Lab A1 Mini', speedMultiplier: 1.3 },
  'prusa-mk4': { name: 'Prusa MK4', speedMultiplier: 1.2 },
  'prusa-mini': { name: 'Prusa Mini', speedMultiplier: 1.0 },
  'ender3': { name: 'Creality Ender 3', speedMultiplier: 0.8 },
  'voron': { name: 'Voron 2.4', speedMultiplier: 1.8 },
  'generic': { name: 'Generic Printer', speedMultiplier: 1.0 },
};

const DEFAULT_PRINT_SETTINGS = {
  layerHeight: 0.2,       // mm
  nozzleWidth: 0.4,       // mm
  infillPercent: 20,      // %
  wallLineCount: 3,
  topBottomLayers: 4,
};

// Base print rate in cm³/hour for a generic printer with PLA
// Real-world measurements show ~15-40 cm³/hr depending on settings
const BASE_PRINT_RATE = 20; // cm³/hour (conservative baseline)

// ============================================
// STL ANALYSIS
// ============================================

function parseSTLBinary(buffer) {
  const triangles = [];

  // Skip 80-byte header
  const triangleCount = buffer.readUInt32LE(80);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    // Normal vector (3 floats)
    const normal = [
      buffer.readFloatLE(offset),
      buffer.readFloatLE(offset + 4),
      buffer.readFloatLE(offset + 8)
    ];
    offset += 12;

    // 3 vertices (9 floats total)
    const vertices = [];
    for (let v = 0; v < 3; v++) {
      vertices.push([
        buffer.readFloatLE(offset),
        buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8)
      ]);
      offset += 12;
    }

    // Attribute byte count (skip)
    offset += 2;

    triangles.push({ normal, vertices });
  }

  return triangles;
}

function parseSTLAscii(content) {
  const triangles = [];
  const lines = content.split('\n');

  let currentTriangle = null;
  let vertexIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('facet normal')) {
      const parts = trimmed.split(/\s+/);
      currentTriangle = {
        normal: [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])],
        vertices: []
      };
    } else if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/);
      currentTriangle.vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ]);
    } else if (trimmed.startsWith('endfacet')) {
      if (currentTriangle && currentTriangle.vertices.length === 3) {
        triangles.push(currentTriangle);
      }
      currentTriangle = null;
    }
  }

  return triangles;
}

function parseSTL(filePath) {
  const buffer = fs.readFileSync(filePath);

  // Check if binary or ASCII
  const header = buffer.slice(0, 80).toString('utf-8');
  if (header.startsWith('solid') && buffer.indexOf('facet normal') > 0) {
    return parseSTLAscii(buffer.toString('utf-8'));
  }
  return parseSTLBinary(buffer);
}

// ============================================
// GEOMETRY CALCULATIONS
// ============================================

function calculateBoundingBox(triangles) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const tri of triangles) {
    for (const v of tri.vertices) {
      minX = Math.min(minX, v[0]);
      minY = Math.min(minY, v[1]);
      minZ = Math.min(minZ, v[2]);
      maxX = Math.max(maxX, v[0]);
      maxY = Math.max(maxY, v[1]);
      maxZ = Math.max(maxZ, v[2]);
    }
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ]
  };
}

function calculateVolume(triangles) {
  // Signed volume using divergence theorem
  let volume = 0;

  for (const tri of triangles) {
    const [v1, v2, v3] = tri.vertices;

    // Signed volume of tetrahedron with origin
    volume += (
      v1[0] * (v2[1] * v3[2] - v3[1] * v2[2]) -
      v2[0] * (v1[1] * v3[2] - v3[1] * v1[2]) +
      v3[0] * (v1[1] * v2[2] - v2[1] * v1[2])
    ) / 6;
  }

  return Math.abs(volume);
}

function calculateSurfaceArea(triangles) {
  let area = 0;

  for (const tri of triangles) {
    const [v1, v2, v3] = tri.vertices;

    // Cross product for triangle area
    const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
    const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];

    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;

    area += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }

  return area;
}

function analyzeOverhangs(triangles) {
  const overhangs = {
    safe: 0,      // < 45°
    moderate: 0,  // 45-60°
    steep: 0,     // 60-75°
    extreme: 0    // > 75° (needs support)
  };

  for (const tri of triangles) {
    const [nx, ny, nz] = tri.normal;

    // Angle from vertical (Z-up)
    const angleFromVertical = Math.acos(Math.abs(nz)) * 180 / Math.PI;

    // For downward-facing surfaces
    if (nz < 0) {
      if (angleFromVertical < 45) overhangs.safe++;
      else if (angleFromVertical < 60) overhangs.moderate++;
      else if (angleFromVertical < 75) overhangs.steep++;
      else overhangs.extreme++;
    }
  }

  return overhangs;
}

function detectThinWalls(triangles, minThickness = 1.2) {
  // Simplified detection: find triangles that are very close together
  // (facing opposite directions)
  const issues = [];
  const checked = new Set();

  for (let i = 0; i < triangles.length; i++) {
    if (checked.has(i)) continue;

    const t1 = triangles[i];
    const center1 = [
      (t1.vertices[0][0] + t1.vertices[1][0] + t1.vertices[2][0]) / 3,
      (t1.vertices[0][1] + t1.vertices[1][1] + t1.vertices[2][1]) / 3,
      (t1.vertices[0][2] + t1.vertices[1][2] + t1.vertices[2][2]) / 3
    ];

    for (let j = i + 1; j < triangles.length; j++) {
      const t2 = triangles[j];

      // Check if normals are opposite
      const dot = t1.normal[0] * t2.normal[0] +
                  t1.normal[1] * t2.normal[1] +
                  t1.normal[2] * t2.normal[2];

      if (dot < -0.9) { // Nearly opposite
        const center2 = [
          (t2.vertices[0][0] + t2.vertices[1][0] + t2.vertices[2][0]) / 3,
          (t2.vertices[0][1] + t2.vertices[1][1] + t2.vertices[2][1]) / 3,
          (t2.vertices[0][2] + t2.vertices[1][2] + t2.vertices[2][2]) / 3
        ];

        const distance = Math.sqrt(
          (center2[0] - center1[0]) ** 2 +
          (center2[1] - center1[1]) ** 2 +
          (center2[2] - center1[2]) ** 2
        );

        if (distance < minThickness) {
          issues.push({
            location: center1,
            thickness: distance,
            message: `Thin wall detected: ~${distance.toFixed(2)}mm`
          });
          checked.add(j);
        }
      }
    }
  }

  return issues;
}

// ============================================
// PRINT ESTIMATION
// ============================================

function estimatePrintTime(volume, surfaceArea, boundingBox, printer = 'generic', material = 'pla') {
  const settings = DEFAULT_PRINT_SETTINGS;
  const printerProfile = PRINTERS[printer] || PRINTERS.generic;
  const materialProfile = MATERIALS[material] || MATERIALS.pla;

  // Layer count
  const layers = Math.ceil(boundingBox.size[2] / settings.layerHeight);

  // Estimate effective print volume (accounting for infill)
  // Shell thickness = nozzle * wall count = 0.4 * 3 = 1.2mm typical
  const shellThickness = settings.nozzleWidth * settings.wallLineCount;

  // Estimate shell vs infill split based on surface-to-volume ratio
  // Higher ratio = more shell-dominated (small/thin parts)
  const svRatio = surfaceArea / volume; // mm^-1

  // Empirical: typical objects have 20-40% shell, rest is infill
  // Small objects (high SV ratio) are more shell-dominated
  const shellFraction = Math.min(0.6, 0.2 + svRatio * 10);
  const infillFraction = 1 - shellFraction;

  // Effective volume considering infill percentage
  const effectiveVolume = volume * (
    shellFraction * 1.0 +                           // Shell is solid
    infillFraction * (settings.infillPercent / 100) // Infill is sparse
  );

  // Calculate print rate based on printer and material
  // Faster printers (like P2S) and easier materials (like PLA) increase throughput
  const printRateCm3PerHour = BASE_PRINT_RATE * printerProfile.speedMultiplier * materialProfile.printSpeedMultiplier;

  // Base print time from volume
  const volumePrintTimeHours = (effectiveVolume / 1000) / printRateCm3PerHour;

  // Add time for layer changes and travel (~10% overhead)
  const totalTimeHours = volumePrintTimeHours * 1.1;

  // Add per-layer overhead (heating, z-hop, etc.) - about 1 second per layer
  const layerOverheadHours = layers / 3600;

  return (totalTimeHours + layerOverheadHours) * 3600; // Return seconds
}

function estimateMaterialUsage(volume, material = 'pla') {
  const settings = DEFAULT_PRINT_SETTINGS;
  const materialProfile = MATERIALS[material] || MATERIALS.pla;

  // Account for infill and walls
  const effectiveVolume = volume * (
    (settings.infillPercent / 100) * 0.8 + 0.2  // Rough shell/infill ratio
  );

  const weightGrams = effectiveVolume / 1000 * materialProfile.density;
  const cost = (weightGrams / 1000) * materialProfile.costPerKg;

  return {
    volumeCm3: volume / 1000,
    weightGrams,
    cost,
    material: materialProfile.name
  };
}


// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
OpenSCAD Geometry Analyzer

Usage: node analyze-geometry.js <file.scad> [options]

Options:
  --printer <name>   Printer profile (default: p2s)
                     Options: ${Object.keys(PRINTERS).join(', ')}
  --material <name>  Material type (default: pla)
                     Options: ${Object.keys(MATERIALS).join(', ')}
  --stl              Keep generated STL file
  --detailed         Show detailed triangle analysis
  --json             Output as JSON
  --help             Show this help

The tool will:
1. Export the OpenSCAD file to STL
2. Analyze the geometry for printability
3. Estimate print time and material usage

Examples:
  node analyze-geometry.js model.scad --printer p2s --material pla
  node analyze-geometry.js model.scad --printer ender3 --material petg
`);
    process.exit(0);
  }

  // Parse arguments
  let filePath = null;
  let printer = 'p2s';  // Default to P2S
  let material = 'pla'; // Default to PLA
  const keepStl = args.includes('--stl');
  const detailed = args.includes('--detailed');
  const asJson = args.includes('--json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--printer' && args[i + 1]) {
      printer = args[++i].toLowerCase();
    } else if (args[i] === '--material' && args[i + 1]) {
      material = args[++i].toLowerCase();
    } else if (!args[i].startsWith('--')) {
      filePath = args[i];
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Find OpenSCAD
  const openscadPaths = [
    '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
    '/usr/bin/openscad',
    '/usr/local/bin/openscad',
    'openscad'
  ];

  let openscad = null;
  for (const p of openscadPaths) {
    try {
      execSync(`"${p}" --version 2>/dev/null`);
      openscad = p;
      break;
    } catch {}
  }

  if (!openscad) {
    console.error('Error: OpenSCAD not found. Please install OpenSCAD.');
    process.exit(1);
  }

  // Export to STL
  const tmpStl = path.join(os.tmpdir(), `analyze-${Date.now()}.stl`);

  console.log('Exporting to STL...');
  try {
    execSync(`"${openscad}" -o "${tmpStl}" "${filePath}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 120000
    });
  } catch (error) {
    console.error('Error exporting STL:', error.message);
    process.exit(1);
  }

  // Parse STL
  console.log('Analyzing geometry...\n');
  const triangles = parseSTL(tmpStl);

  // Calculate metrics
  const bbox = calculateBoundingBox(triangles);
  const volume = calculateVolume(triangles);
  const surfaceArea = calculateSurfaceArea(triangles);
  const overhangs = analyzeOverhangs(triangles);
  const thinWalls = detectThinWalls(triangles);
  const printTime = estimatePrintTime(volume, surfaceArea, bbox, printer, material);
  const materialUsage = estimateMaterialUsage(volume, material);
  const printerProfile = PRINTERS[printer] || PRINTERS.generic;
  const materialProfile = MATERIALS[material] || MATERIALS.pla;

  // Cleanup
  if (!keepStl) {
    fs.unlinkSync(tmpStl);
  } else {
    console.log(`STL saved to: ${tmpStl}\n`);
  }

  // Output results
  const results = {
    file: path.basename(filePath),
    triangleCount: triangles.length,
    boundingBox: {
      size: bbox.size.map(v => Math.round(v * 100) / 100),
      min: bbox.min.map(v => Math.round(v * 100) / 100),
      max: bbox.max.map(v => Math.round(v * 100) / 100)
    },
    volume: {
      mm3: Math.round(volume * 100) / 100,
      cm3: Math.round(volume / 1000 * 100) / 100
    },
    surfaceArea: {
      mm2: Math.round(surfaceArea * 100) / 100,
      cm2: Math.round(surfaceArea / 100 * 100) / 100
    },
    overhangs: {
      safe: overhangs.safe,
      moderate: overhangs.moderate,
      steep: overhangs.steep,
      extreme: overhangs.extreme,
      needsSupport: overhangs.extreme > 0
    },
    thinWalls: thinWalls.length > 0 ? thinWalls.slice(0, 5) : [],
    printer: printerProfile.name,
    material: materialProfile.name,
    printEstimate: {
      timeMinutes: Math.round(printTime / 60),
      timeFormatted: `${Math.floor(printTime / 3600)}h ${Math.floor((printTime % 3600) / 60)}m`,
      materialGrams: Math.round(materialUsage.weightGrams * 10) / 10,
      materialCost: `$${materialUsage.cost.toFixed(2)}`
    },
    printability: {
      score: calculatePrintabilityScore(overhangs, thinWalls, bbox),
      issues: []
    }
  };

  // Add issues
  if (overhangs.extreme > triangles.length * 0.05) {
    results.printability.issues.push('Significant overhangs detected - supports recommended');
  }
  if (thinWalls.length > 0) {
    results.printability.issues.push(`${thinWalls.length} thin wall areas detected`);
  }
  if (bbox.size[2] > 200) {
    results.printability.issues.push('Tall print - consider printing in parts');
  }
  if (Math.max(...bbox.size) > 250) {
    results.printability.issues.push('Large dimensions - verify printer bed size');
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('═══════════════════════════════════════════');
    console.log('  GEOMETRY ANALYSIS RESULTS');
    console.log('═══════════════════════════════════════════\n');

    console.log(`📁 File: ${results.file}`);
    console.log(`△  Triangles: ${results.triangleCount.toLocaleString()}\n`);

    console.log('📐 Dimensions:');
    console.log(`   ${bbox.size[0].toFixed(1)} × ${bbox.size[1].toFixed(1)} × ${bbox.size[2].toFixed(1)} mm\n`);

    console.log('📦 Volume: ' + results.volume.cm3 + ' cm³');
    console.log('📏 Surface Area: ' + results.surfaceArea.cm2 + ' cm²\n');

    console.log('🔽 Overhangs:');
    console.log(`   Safe (<45°): ${overhangs.safe}`);
    console.log(`   Moderate (45-60°): ${overhangs.moderate}`);
    console.log(`   Steep (60-75°): ${overhangs.steep}`);
    console.log(`   Extreme (>75°): ${overhangs.extreme}`);
    console.log(`   Needs Support: ${results.overhangs.needsSupport ? 'Yes ⚠️' : 'No ✅'}\n`);

    if (thinWalls.length > 0) {
      console.log('⚠️  Thin Walls Detected:');
      for (const tw of thinWalls.slice(0, 3)) {
        console.log(`   ${tw.thickness.toFixed(2)}mm at [${tw.location.map(v => v.toFixed(1)).join(', ')}]`);
      }
      if (thinWalls.length > 3) {
        console.log(`   ... and ${thinWalls.length - 3} more`);
      }
      console.log('');
    }

    console.log(`🖨️  Print Estimate (${printerProfile.name} / ${materialProfile.name}):`);
    console.log(`   Time: ~${results.printEstimate.timeFormatted} (rough estimate)`);
    console.log(`   Material: ~${results.printEstimate.materialGrams}g ${materialProfile.name}`);
    console.log(`   Cost: ~${results.printEstimate.materialCost}`);
    console.log(`   ⚠️  For accurate time, slice in Bambu Studio\n`);

    console.log('📊 Printability Score: ' + results.printability.score + '/100');
    if (results.printability.issues.length > 0) {
      console.log('\n⚠️  Issues:');
      for (const issue of results.printability.issues) {
        console.log(`   • ${issue}`);
      }
    }
    console.log('');
  }
}

function calculatePrintabilityScore(overhangs, thinWalls, bbox) {
  let score = 100;

  // Deduct for overhangs
  const totalFaces = overhangs.safe + overhangs.moderate + overhangs.steep + overhangs.extreme;
  if (totalFaces > 0) {
    const extremeRatio = overhangs.extreme / totalFaces;
    const steepRatio = overhangs.steep / totalFaces;
    score -= extremeRatio * 30;
    score -= steepRatio * 10;
  }

  // Deduct for thin walls
  score -= Math.min(thinWalls.length * 5, 20);

  // Deduct for large size
  if (Math.max(...bbox.size) > 200) score -= 5;
  if (Math.max(...bbox.size) > 300) score -= 10;

  return Math.max(0, Math.round(score));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
