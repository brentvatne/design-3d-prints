#!/usr/bin/env node

/**
 * OpenSCAD Design Test Suite
 *
 * Runs comprehensive tests on OpenSCAD designs:
 * - Parameter variation tests
 * - Boundary condition tests
 * - Export validation
 * - Regression testing
 *
 * Usage:
 *   node test-design.js <file.scad>
 *   node test-design.js <file.scad> --test-file tests.json
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

// ============================================
// TEST FRAMEWORK
// ============================================

class TestRunner {
  constructor(scadFile) {
    this.scadFile = scadFile;
    this.results = [];
    this.openscad = this.findOpenSCAD();
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scad-test-'));
  }

  findOpenSCAD() {
    const paths = [
      '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
      '/usr/bin/openscad',
      '/usr/local/bin/openscad',
      'openscad'
    ];

    for (const p of paths) {
      try {
        execSync(`"${p}" --version 2>/dev/null`);
        return p;
      } catch {}
    }
    return null;
  }

  // Run OpenSCAD with custom parameters
  runWithParams(params, outputType = 'stl') {
    if (!this.openscad) {
      throw new Error('OpenSCAD not found');
    }

    const paramArgs = Object.entries(params)
      .map(([k, v]) => `-D "${k}=${typeof v === 'string' ? `"${v}"` : v}"`)
      .join(' ');

    const outputFile = path.join(this.tmpDir, `output-${Date.now()}.${outputType}`);

    try {
      const result = execSync(
        `"${this.openscad}" ${paramArgs} -o "${outputFile}" "${this.scadFile}" 2>&1`,
        { encoding: 'utf-8', timeout: 60000 }
      );
      return { success: true, output: outputFile, log: result };
    } catch (error) {
      return { success: false, error: error.message, log: error.stdout || error.stderr };
    }
  }

  // Test that design renders without errors
  testRenders(name, params = {}) {
    const result = this.runWithParams(params);
    this.results.push({
      name,
      type: 'render',
      passed: result.success,
      params,
      error: result.error,
      log: result.log
    });
    return result.success;
  }

  // Test parameter boundaries
  testBoundary(paramName, values, otherParams = {}) {
    const results = [];

    for (const value of values) {
      const params = { ...otherParams, [paramName]: value };
      const name = `${paramName}=${value}`;
      const result = this.runWithParams(params);

      results.push({
        name,
        type: 'boundary',
        passed: result.success,
        params,
        error: result.error
      });

      this.results.push(results[results.length - 1]);
    }

    return results;
  }

  // Test that output file is valid STL
  testValidSTL(name, params = {}) {
    const result = this.runWithParams(params, 'stl');

    if (!result.success) {
      this.results.push({
        name,
        type: 'stl-valid',
        passed: false,
        params,
        error: result.error
      });
      return false;
    }

    // Check STL file
    const buffer = fs.readFileSync(result.output);
    let valid = false;
    let triangleCount = 0;

    try {
      if (buffer.toString('utf-8', 0, 5) === 'solid') {
        // ASCII STL
        const content = buffer.toString('utf-8');
        triangleCount = (content.match(/facet normal/g) || []).length;
        valid = triangleCount > 0 && content.includes('endsolid');
      } else {
        // Binary STL
        triangleCount = buffer.readUInt32LE(80);
        valid = buffer.length === 84 + triangleCount * 50;
      }
    } catch (e) {
      valid = false;
    }

    this.results.push({
      name,
      type: 'stl-valid',
      passed: valid,
      params,
      triangleCount,
      error: valid ? null : 'Invalid STL structure'
    });

    return valid;
  }

  // Test for non-manifold geometry
  testManifold(name, params = {}) {
    const result = this.runWithParams(params, 'stl');

    if (!result.success) {
      this.results.push({
        name,
        type: 'manifold',
        passed: false,
        params,
        error: result.error
      });
      return false;
    }

    // Check for manifold warnings in output
    const hasManifoldWarning = result.log &&
      (result.log.includes('WARNING: Object may not be a valid 2-manifold') ||
       result.log.includes('WARNING: Object is not a valid 2-manifold'));

    this.results.push({
      name,
      type: 'manifold',
      passed: !hasManifoldWarning,
      params,
      error: hasManifoldWarning ? 'Non-manifold geometry detected' : null,
      log: result.log
    });

    return !hasManifoldWarning;
  }

  // Test minimum feature sizes
  testMinimumSize(name, params, expectedMinSize = 1.2) {
    // This would require geometry analysis
    // For now, we just verify it renders
    return this.testRenders(`${name} (min size check)`, params);
  }

  // Run predefined test cases from JSON
  runTestFile(testFile) {
    const tests = JSON.parse(fs.readFileSync(testFile, 'utf-8'));

    console.log(`Running ${tests.length} tests from ${testFile}\n`);

    for (const test of tests) {
      switch (test.type) {
        case 'render':
          this.testRenders(test.name, test.params);
          break;
        case 'boundary':
          this.testBoundary(test.param, test.values, test.baseParams);
          break;
        case 'stl-valid':
          this.testValidSTL(test.name, test.params);
          break;
        case 'manifold':
          this.testManifold(test.name, test.params);
          break;
      }
    }
  }

  // Run automatic tests
  runAutoTests() {
    console.log('Running automatic tests...\n');

    // Parse the SCAD file to find parameters
    const content = fs.readFileSync(this.scadFile, 'utf-8');
    const params = this.extractParameters(content);

    // Test 1: Default render
    console.log('Test: Default render');
    this.testRenders('Default parameters', {});

    // Test 2: Valid STL output
    console.log('Test: STL validity');
    this.testValidSTL('Default STL output', {});

    // Test 3: Manifold check
    console.log('Test: Manifold geometry');
    this.testManifold('Default manifold check', {});

    // Test 4: Parameter boundaries
    for (const param of params) {
      if (typeof param.value === 'number') {
        console.log(`Test: Boundary for ${param.name}`);

        // Test minimum values
        const minTests = [
          param.value * 0.5,
          param.value * 0.25,
          0.1
        ].filter(v => v > 0);

        // Test maximum values
        const maxTests = [
          param.value * 2,
          param.value * 5
        ];

        this.testBoundary(param.name, [...minTests, ...maxTests]);
      }
    }
  }

  extractParameters(content) {
    const params = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('module ') || line.startsWith('function ')) break;

      const match = line.match(/^(\w+)\s*=\s*([^;]+);/);
      if (match && !line.startsWith('//')) {
        let value;
        try {
          value = eval(match[2].trim());
        } catch {
          value = match[2].trim();
        }
        params.push({ name: match[1], value });
      }
    }

    return params;
  }

  // Cleanup temp files
  cleanup() {
    try {
      fs.rmSync(this.tmpDir, { recursive: true });
    } catch {}
  }

  // Print results
  printResults(asJson = false) {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    if (asJson) {
      console.log(JSON.stringify({
        file: this.scadFile,
        summary: { passed, failed, total: this.results.length },
        tests: this.results
      }, null, 2));
      return;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('  TEST RESULTS');
    console.log('═══════════════════════════════════════════\n');

    for (const result of this.results) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.triangleCount !== undefined) {
        console.log(`   Triangles: ${result.triangleCount}`);
      }
    }

    console.log('\n───────────────────────────────────────────');
    console.log(`Total: ${passed} passed, ${failed} failed out of ${this.results.length} tests`);
    console.log('');

    return failed === 0;
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
OpenSCAD Design Test Suite

Usage:
  node test-design.js <file.scad> [options]

Options:
  --test-file <path>   Run tests defined in JSON file
  --auto               Run automatic parameter tests
  --json               Output results as JSON
  --help               Show this help

Test File Format (JSON):
  [
    { "type": "render", "name": "Test name", "params": { "width": 50 } },
    { "type": "boundary", "param": "width", "values": [10, 50, 100] },
    { "type": "stl-valid", "name": "STL check", "params": {} },
    { "type": "manifold", "name": "Manifold check", "params": {} }
  ]

Example:
  node test-design.js box.scad --auto
  node test-design.js box.scad --test-file box-tests.json
`);
    process.exit(0);
  }

  const scadFile = args.find(a => a.endsWith('.scad'));
  const testFile = args.find((a, i) => args[i - 1] === '--test-file');
  const autoTest = args.includes('--auto');
  const asJson = args.includes('--json');

  if (!scadFile || !fs.existsSync(scadFile)) {
    console.error(`Error: File not found: ${scadFile}`);
    process.exit(1);
  }

  const runner = new TestRunner(scadFile);

  if (!runner.openscad) {
    console.error('Error: OpenSCAD not found. Please install OpenSCAD.');
    process.exit(1);
  }

  try {
    if (testFile && fs.existsSync(testFile)) {
      runner.runTestFile(testFile);
    } else if (autoTest || !testFile) {
      runner.runAutoTests();
    }

    const success = runner.printResults(asJson);
    runner.cleanup();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Test error:', error.message);
    runner.cleanup();
    process.exit(1);
  }
}

main();
