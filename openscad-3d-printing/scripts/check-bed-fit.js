#!/usr/bin/env node
/**
 * Check if an OpenSCAD model fits on a printer bed
 * Supports multiple printer profiles with bed dimensions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Printer profiles (build volume in mm)
const PRINTERS = {
  'p1s': { name: 'Bambu Lab P1S', x: 256, y: 256, z: 256 },
  'p1p': { name: 'Bambu Lab P1P', x: 256, y: 256, z: 256 },
  'p2s': { name: 'Bambu Lab P2S', x: 256, y: 256, z: 256 },
  'x1c': { name: 'Bambu Lab X1 Carbon', x: 256, y: 256, z: 256 },
  'a1': { name: 'Bambu Lab A1', x: 256, y: 256, z: 256 },
  'a1mini': { name: 'Bambu Lab A1 Mini', x: 180, y: 180, z: 180 },
  'prusa-mk4': { name: 'Prusa MK4', x: 250, y: 210, z: 220 },
  'prusa-mini': { name: 'Prusa Mini', x: 180, y: 180, z: 180 },
  'ender3': { name: 'Creality Ender 3', x: 220, y: 220, z: 250 },
  'ender3-v3': { name: 'Creality Ender 3 V3', x: 220, y: 220, z: 250 },
  'voron-0': { name: 'Voron 0', x: 120, y: 120, z: 120 },
  'voron-2': { name: 'Voron 2.4 (300)', x: 300, y: 300, z: 280 },
};

// Safety margin (mm) - accounts for skirt, brim, purge line
const DEFAULT_MARGIN = 5;

function findOpenSCAD() {
  const possiblePaths = [
    '/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD',
    '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
    '/usr/local/bin/openscad',
    '/usr/bin/openscad',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    return execSync('which openscad', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function exportToSTL(scadFile) {
  const openscad = findOpenSCAD();
  if (!openscad) {
    console.error('❌ OpenSCAD not found');
    process.exit(1);
  }

  const tmpFile = path.join(os.tmpdir(), `bed-check-${Date.now()}.stl`);

  try {
    execSync(`"${openscad}" -o "${tmpFile}" "${scadFile}" 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 120000
    });
    return tmpFile;
  } catch (error) {
    console.error('❌ Failed to export STL:', error.message);
    process.exit(1);
  }
}

function parseSTLDimensions(stlFile) {
  const content = fs.readFileSync(stlFile, 'utf8');

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const vertexRegex = /vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/gi;
  let match;

  while ((match = vertexRegex.exec(content)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const z = parseFloat(match[3]);

    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  return {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
    minX, maxX, minY, maxY, minZ, maxZ
  };
}

function checkFit(dims, printer, margin) {
  const bed = PRINTERS[printer];
  const usableX = bed.x - margin * 2;
  const usableY = bed.y - margin * 2;
  const usableZ = bed.z - margin;

  const results = {
    printer: bed.name,
    bedSize: { x: bed.x, y: bed.y, z: bed.z },
    modelSize: { x: dims.x.toFixed(1), y: dims.y.toFixed(1), z: dims.z.toFixed(1) },
    margin,
    fits: {
      standard: dims.x <= usableX && dims.y <= usableY && dims.z <= usableZ,
      rotated: dims.y <= usableX && dims.x <= usableY && dims.z <= usableZ,
      onSide: dims.x <= usableX && dims.z <= usableY && dims.y <= usableZ,
      onEnd: dims.z <= usableX && dims.y <= usableY && dims.x <= usableZ,
    },
    overflow: {
      x: Math.max(0, dims.x - usableX),
      y: Math.max(0, dims.y - usableY),
      z: Math.max(0, dims.z - usableZ),
    },
    utilization: {
      x: ((dims.x / usableX) * 100).toFixed(1),
      y: ((dims.y / usableY) * 100).toFixed(1),
      z: ((dims.z / usableZ) * 100).toFixed(1),
    }
  };

  // Determine best orientation
  if (results.fits.standard) {
    results.bestOrientation = 'standard';
  } else if (results.fits.rotated) {
    results.bestOrientation = 'rotated 90° on Z';
  } else if (results.fits.onSide) {
    results.bestOrientation = 'on side (rotated on X)';
  } else if (results.fits.onEnd) {
    results.bestOrientation = 'on end (rotated on Y)';
  } else {
    results.bestOrientation = 'DOES NOT FIT - needs splitting';
  }

  return results;
}

function suggestSplits(dims, printer, margin) {
  const bed = PRINTERS[printer];
  const usableX = bed.x - margin * 2;
  const usableY = bed.y - margin * 2;

  const suggestions = [];

  // Calculate minimum splits needed for each axis
  const splitsX = Math.ceil(dims.x / usableX);
  const splitsY = Math.ceil(dims.y / usableY);

  if (splitsX > 1 || splitsY > 1) {
    suggestions.push({
      strategy: 'Grid split',
      parts: splitsX * splitsY,
      cuts: { x: splitsX - 1, y: splitsY - 1 },
      maxPartSize: {
        x: Math.ceil(dims.x / splitsX),
        y: Math.ceil(dims.y / splitsY),
        z: dims.z
      },
      joinMethod: 'Dovetails, dowels, or alignment pins',
      adhesive: 'CA glue or epoxy for permanent bond'
    });
  }

  // Suggest functional splits if applicable
  if (dims.z > bed.z) {
    suggestions.push({
      strategy: 'Vertical stack',
      parts: Math.ceil(dims.z / (bed.z - margin)),
      cuts: { z: Math.ceil(dims.z / (bed.z - margin)) - 1 },
      joinMethod: 'Interlocking tabs or threaded inserts',
      adhesive: 'Epoxy for structural loads'
    });
  }

  return suggestions;
}

function printReport(results, suggestions, jsonOutput) {
  if (jsonOutput) {
    console.log(JSON.stringify({ results, suggestions }, null, 2));
    return;
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  BED FIT ANALYSIS');
  console.log('═══════════════════════════════════════════\n');

  console.log(`🖨️  Printer: ${results.printer}`);
  console.log(`   Bed: ${results.bedSize.x} × ${results.bedSize.y} × ${results.bedSize.z} mm`);
  console.log(`   Margin: ${results.margin} mm\n`);

  console.log(`📐 Model Dimensions:`);
  console.log(`   ${results.modelSize.x} × ${results.modelSize.y} × ${results.modelSize.z} mm\n`);

  console.log(`📊 Bed Utilization:`);
  console.log(`   X: ${results.utilization.x}%`);
  console.log(`   Y: ${results.utilization.y}%`);
  console.log(`   Z: ${results.utilization.z}%\n`);

  const anyFits = Object.values(results.fits).some(v => v);

  if (anyFits) {
    console.log(`✅ FITS: ${results.bestOrientation}\n`);

    if (!results.fits.standard && results.bestOrientation !== 'standard') {
      console.log(`   Note: Requires reorientation in slicer\n`);
    }
  } else {
    console.log(`❌ DOES NOT FIT\n`);
    console.log(`   Overflow: X +${results.overflow.x.toFixed(1)}mm, Y +${results.overflow.y.toFixed(1)}mm, Z +${results.overflow.z.toFixed(1)}mm\n`);

    if (suggestions.length > 0) {
      console.log(`✂️  Split Suggestions:\n`);
      suggestions.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.strategy}`);
        console.log(`      Parts: ${s.parts}`);
        console.log(`      Max part size: ${s.maxPartSize.x} × ${s.maxPartSize.y} × ${s.maxPartSize.z} mm`);
        console.log(`      Join: ${s.joinMethod}`);
        console.log(`      Adhesive: ${s.adhesive}\n`);
      });
    }
  }

  // Summary line for scripting
  console.log(`───────────────────────────────────────────`);
  console.log(`Result: ${anyFits ? 'PASS' : 'FAIL - NEEDS SPLITTING'}`);
}

// CLI
const args = process.argv.slice(2);
let scadFile = null;
let printer = 'p1s';
let margin = DEFAULT_MARGIN;
let jsonOutput = false;
let listPrinters = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--printer' || args[i] === '-p') {
    printer = args[++i]?.toLowerCase();
  } else if (args[i] === '--margin' || args[i] === '-m') {
    margin = parseFloat(args[++i]);
  } else if (args[i] === '--json') {
    jsonOutput = true;
  } else if (args[i] === '--list-printers') {
    listPrinters = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: check-bed-fit.js <file.scad> [options]

Options:
  -p, --printer <name>   Printer profile (default: p1s)
  -m, --margin <mm>      Safety margin (default: 5mm)
  --json                 Output as JSON
  --list-printers        Show available printer profiles
  -h, --help             Show this help

Examples:
  check-bed-fit.js model.scad
  check-bed-fit.js model.scad --printer prusa-mk4
  check-bed-fit.js model.scad -p a1mini -m 10
`);
    process.exit(0);
  } else if (!args[i].startsWith('-')) {
    scadFile = args[i];
  }
}

if (listPrinters) {
  console.log('\nAvailable Printer Profiles:\n');
  Object.entries(PRINTERS).forEach(([key, val]) => {
    console.log(`  ${key.padEnd(12)} ${val.name.padEnd(25)} ${val.x}×${val.y}×${val.z} mm`);
  });
  console.log('');
  process.exit(0);
}

if (!scadFile) {
  console.error('Usage: check-bed-fit.js <file.scad> [--printer p1s] [--margin 5]');
  console.error('Run with --list-printers to see available profiles');
  process.exit(1);
}

if (!PRINTERS[printer]) {
  console.error(`Unknown printer: ${printer}`);
  console.error('Run with --list-printers to see available profiles');
  process.exit(1);
}

if (!fs.existsSync(scadFile)) {
  console.error(`File not found: ${scadFile}`);
  process.exit(1);
}

// Run analysis
const stlFile = exportToSTL(scadFile);
const dims = parseSTLDimensions(stlFile);
const results = checkFit(dims, printer, margin);
const suggestions = suggestSplits(dims, printer, margin);

// Cleanup
fs.unlinkSync(stlFile);

printReport(results, suggestions, jsonOutput);

// Exit code: 0 if fits, 1 if doesn't
process.exit(Object.values(results.fits).some(v => v) ? 0 : 1);
