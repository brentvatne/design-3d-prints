#!/usr/bin/env node

/**
 * OpenSCAD Design Validator
 *
 * Validates OpenSCAD files for:
 * - Syntax errors (via OpenSCAD CLI)
 * - Manufacturing constraint violations
 * - Common design pitfalls
 * - Best practice compliance
 *
 * Usage:
 *   node validate.js <file.scad> [options]
 *
 * Options:
 *   --strict     Enable strict mode (more warnings)
 *   --json       Output results as JSON
 *   --fix        Suggest fixes for issues
 *   --config     Path to custom config file
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG = {
  // Manufacturing constraints
  constraints: {
    minWallThickness: 1.2,      // mm
    minStructuralWall: 2.4,     // mm
    minBaseThickness: 0.8,      // mm
    maxOverhangAngle: 45,       // degrees from vertical
    maxBridgeSpan: 10,          // mm
    minHoleCompensation: 0.3,   // mm to add to holes
    minFeatureSize: 0.4,        // mm (nozzle width)
  },

  // Code quality rules
  codeQuality: {
    requireParameterComments: true,
    requireModuleDocstrings: false,
    maxModuleComplexity: 50,    // lines
    requireFnForCurves: true,
    minFnValue: 16,
    requireEpsilonForBooleans: true,
  },

  // File structure
  structure: {
    requireParametersAtTop: true,
    requireHiddenSection: true,
    maxFileLength: 1000,        // lines
  }
};

// ============================================
// PARSER
// ============================================

class OpenSCADParser {
  constructor(content) {
    this.content = content;
    this.lines = content.split('\n');
    this.tokens = this.tokenize();
  }

  tokenize() {
    const tokens = [];
    let inBlockComment = false;
    let inString = false;

    for (let lineNum = 0; lineNum < this.lines.length; lineNum++) {
      const line = this.lines[lineNum];
      let col = 0;

      while (col < line.length) {
        // Skip whitespace
        if (/\s/.test(line[col])) {
          col++;
          continue;
        }

        // Block comment
        if (line.slice(col, col + 2) === '/*') {
          inBlockComment = true;
          col += 2;
          continue;
        }
        if (line.slice(col, col + 2) === '*/') {
          inBlockComment = false;
          col += 2;
          continue;
        }
        if (inBlockComment) {
          col++;
          continue;
        }

        // Line comment
        if (line.slice(col, col + 2) === '//') {
          tokens.push({
            type: 'comment',
            value: line.slice(col),
            line: lineNum + 1,
            col: col + 1
          });
          break;
        }

        // String
        if (line[col] === '"') {
          let end = col + 1;
          while (end < line.length && (line[end] !== '"' || line[end - 1] === '\\')) {
            end++;
          }
          tokens.push({
            type: 'string',
            value: line.slice(col, end + 1),
            line: lineNum + 1,
            col: col + 1
          });
          col = end + 1;
          continue;
        }

        // Number
        if (/[0-9.]/.test(line[col])) {
          let end = col;
          while (end < line.length && /[0-9.eE+-]/.test(line[end])) {
            end++;
          }
          tokens.push({
            type: 'number',
            value: parseFloat(line.slice(col, end)),
            raw: line.slice(col, end),
            line: lineNum + 1,
            col: col + 1
          });
          col = end;
          continue;
        }

        // Identifier or keyword
        if (/[a-zA-Z_$]/.test(line[col])) {
          let end = col;
          while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) {
            end++;
          }
          const value = line.slice(col, end);
          const keywords = ['module', 'function', 'if', 'else', 'for', 'let',
                          'true', 'false', 'undef', 'include', 'use'];
          const builtins = ['cube', 'sphere', 'cylinder', 'polyhedron', 'circle',
                           'square', 'polygon', 'text', 'import', 'surface',
                           'union', 'difference', 'intersection', 'hull', 'minkowski',
                           'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
                           'linear_extrude', 'rotate_extrude', 'offset', 'projection',
                           'render', 'color', 'echo', 'assert'];
          tokens.push({
            type: keywords.includes(value) ? 'keyword' :
                  builtins.includes(value) ? 'builtin' : 'identifier',
            value,
            line: lineNum + 1,
            col: col + 1
          });
          col = end;
          continue;
        }

        // Operators and punctuation
        tokens.push({
          type: 'operator',
          value: line[col],
          line: lineNum + 1,
          col: col + 1
        });
        col++;
      }
    }

    return tokens;
  }

  // Extract parameter assignments at file top
  extractParameters() {
    const params = [];
    const paramPattern = /^(\w+)\s*=\s*([^;]+);/;

    for (const line of this.lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('module ') || trimmed.startsWith('function ')) {
        break; // Stop at first module/function
      }

      const match = trimmed.match(paramPattern);
      if (match && !trimmed.startsWith('//')) {
        const [, name, valueStr] = match;
        // Try to parse the value
        let value;
        try {
          value = eval(valueStr.trim()); // Simple evaluation
        } catch {
          value = valueStr.trim();
        }
        params.push({ name, value, line: this.lines.indexOf(line) + 1 });
      }
    }

    return params;
  }

  // Extract module definitions
  extractModules() {
    const modules = [];
    const modulePattern = /module\s+(\w+)\s*\(([^)]*)\)/g;

    let match;
    while ((match = modulePattern.exec(this.content)) !== null) {
      const lineNum = this.content.slice(0, match.index).split('\n').length;
      modules.push({
        name: match[1],
        params: match[2],
        line: lineNum
      });
    }

    return modules;
  }

  // Find all numeric literals used with specific functions
  findFunctionCalls(funcName) {
    const calls = [];
    const tokens = this.tokens.filter(t => t.type !== 'comment');

    for (let i = 0; i < tokens.length; i++) {
      if ((tokens[i].type === 'builtin' || tokens[i].type === 'identifier') &&
          tokens[i].value === funcName) {
        // Collect arguments
        let depth = 0;
        let args = [];
        let j = i + 1;

        while (j < tokens.length) {
          if (tokens[j].value === '(') depth++;
          if (tokens[j].value === ')') {
            depth--;
            if (depth === 0) break;
          }
          if (depth > 0) args.push(tokens[j]);
          j++;
        }

        calls.push({
          name: funcName,
          args,
          line: tokens[i].line
        });
      }
    }

    return calls;
  }
}

// ============================================
// VALIDATORS
// ============================================

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.passed = [];
  }

  error(message, line = null, fix = null) {
    this.errors.push({ severity: 'error', message, line, fix });
  }

  warning(message, line = null, fix = null) {
    this.warnings.push({ severity: 'warning', message, line, fix });
  }

  addInfo(message, line = null) {
    this.info.push({ severity: 'info', message, line });
  }

  pass(check) {
    this.passed.push(check);
  }

  get isValid() {
    return this.errors.length === 0;
  }

  get summary() {
    return {
      valid: this.isValid,
      errors: this.errors.length,
      warnings: this.warnings.length,
      passed: this.passed.length
    };
  }
}

// Syntax validation via OpenSCAD CLI
async function validateSyntax(filePath) {
  const result = new ValidationResult();
  const os = require('os');
  const tmpOutput = path.join(os.tmpdir(), `validate-${Date.now()}.stl`);

  try {
    // Check if OpenSCAD is available
    const openscadPath = findOpenSCAD();
    if (!openscadPath) {
      result.warning('OpenSCAD not found in PATH - skipping syntax validation');
      return result;
    }

    // Run OpenSCAD with temp output file to check syntax
    const output = execSync(
      `"${openscadPath}" -o "${tmpOutput}" "${filePath}" 2>&1`,
      { encoding: 'utf-8', timeout: 60000 }
    );

    // Clean up temp file
    try { fs.unlinkSync(tmpOutput); } catch {}

    // Parse warnings from output
    const warningPattern = /WARNING: (.+?) in file .+?, line (\d+)/g;
    let match;
    while ((match = warningPattern.exec(output)) !== null) {
      result.warning(match[1], parseInt(match[2]));
    }

    result.pass('syntax-valid');
  } catch (error) {
    // Clean up temp file on error too
    try { fs.unlinkSync(tmpOutput); } catch {}

    // Parse error messages
    const errorOutput = error.stdout || error.stderr || error.message;
    const errorPattern = /ERROR: (.+?)(?:\s+in file .+?, line (\d+))?/g;

    let match;
    while ((match = errorPattern.exec(errorOutput)) !== null) {
      result.error(match[1], match[2] ? parseInt(match[2]) : null);
    }

    if (result.errors.length === 0) {
      result.error(`OpenSCAD validation failed: ${errorOutput}`);
    }
  }

  return result;
}

// Manufacturing constraint validation
function validateConstraints(parser, config) {
  const result = new ValidationResult();
  const params = parser.extractParameters();
  const constraints = config.constraints;

  // Check wall thickness parameters
  const wallParams = params.filter(p =>
    p.name.includes('wall') || p.name.includes('thickness')
  );

  for (const param of wallParams) {
    if (typeof param.value === 'number') {
      if (param.name.includes('structural') || param.name.includes('load')) {
        if (param.value < constraints.minStructuralWall) {
          result.error(
            `Structural wall '${param.name}' = ${param.value}mm is below minimum ${constraints.minStructuralWall}mm`,
            param.line,
            `Set ${param.name} = ${constraints.minStructuralWall};`
          );
        } else {
          result.pass(`wall-thickness-${param.name}`);
        }
      } else {
        if (param.value < constraints.minWallThickness) {
          result.error(
            `Wall thickness '${param.name}' = ${param.value}mm is below minimum ${constraints.minWallThickness}mm`,
            param.line,
            `Set ${param.name} = ${constraints.minWallThickness};`
          );
        } else {
          result.pass(`wall-thickness-${param.name}`);
        }
      }
    }
  }

  // Check for very small feature sizes
  for (const param of params) {
    if (typeof param.value === 'number' && param.value > 0 && param.value < constraints.minFeatureSize) {
      if (!param.name.includes('epsilon') && !param.name.includes('tolerance') && !param.name.includes('clearance')) {
        result.warning(
          `Parameter '${param.name}' = ${param.value}mm may be too small to print reliably`,
          param.line
        );
      }
    }
  }

  // Check hole diameters for tolerance compensation
  const holeCalls = parser.findFunctionCalls('cylinder');
  for (const call of holeCalls) {
    // Look for 'd' or 'r' parameters
    const dArg = call.args.find(a => a.type === 'identifier' && a.value === 'd');
    if (dArg) {
      result.addInfo(`Cylinder at line ${call.line} - verify hole has tolerance compensation (+0.4mm)`, call.line);
    }
  }

  return result;
}

// Code quality validation
function validateCodeQuality(parser, config) {
  const result = new ValidationResult();
  const quality = config.codeQuality;

  // Check $fn usage
  if (quality.requireFnForCurves) {
    const hasFn = parser.content.includes('$fn');
    const hasFa = parser.content.includes('$fa');
    const hasFs = parser.content.includes('$fs');

    if (!hasFn && !hasFa && !hasFs) {
      result.warning(
        'No $fn, $fa, or $fs defined - curves may have low resolution',
        null,
        'Add $fn = $preview ? 24 : 48; in Hidden section'
      );
    } else {
      result.pass('resolution-defined');
    }

    // Check $fn values
    const fnPattern = /\$fn\s*=\s*(\d+)/g;
    let match;
    while ((match = fnPattern.exec(parser.content)) !== null) {
      const fnValue = parseInt(match[1]);
      if (fnValue < quality.minFnValue) {
        const lineNum = parser.content.slice(0, match.index).split('\n').length;
        result.warning(
          `$fn = ${fnValue} is low - may result in faceted curves`,
          lineNum,
          `Consider $fn = ${quality.minFnValue} or higher`
        );
      }
    }
  }

  // Check for epsilon in boolean operations
  if (quality.requireEpsilonForBooleans) {
    const hasDifference = parser.content.includes('difference()');
    const hasEpsilon = parser.content.includes('epsilon') ||
                       /[+-]\s*0\.0[01]/.test(parser.content);

    if (hasDifference && !hasEpsilon) {
      result.warning(
        'difference() used without epsilon - may cause rendering artifacts',
        null,
        'Add epsilon = 0.01; and extend cuts by epsilon'
      );
    } else if (hasDifference) {
      result.pass('epsilon-for-booleans');
    }
  }

  // Check for assert() usage for parameter validation
  const hasAssert = parser.content.includes('assert(');
  if (!hasAssert) {
    result.addInfo('Consider adding assert() statements to validate parameters');
  } else {
    result.pass('parameter-validation');
  }

  // Check module documentation
  const modules = parser.extractModules();
  if (quality.requireModuleDocstrings) {
    for (const mod of modules) {
      const linesBefore = parser.lines.slice(Math.max(0, mod.line - 5), mod.line - 1);
      const hasDoc = linesBefore.some(l => l.includes('/**') || l.includes('@param'));
      if (!hasDoc) {
        result.addInfo(`Module '${mod.name}' lacks documentation`, mod.line);
      }
    }
  }

  return result;
}

// Structure validation
function validateStructure(parser, config) {
  const result = new ValidationResult();
  const structure = config.structure;

  // Check file length
  if (parser.lines.length > structure.maxFileLength) {
    result.warning(
      `File has ${parser.lines.length} lines - consider splitting into modules`,
      null
    );
  } else {
    result.pass('file-length');
  }

  // Check for parameters at top
  if (structure.requireParametersAtTop) {
    const firstModule = parser.tokens.find(t => t.value === 'module');
    const params = parser.extractParameters();

    if (firstModule && params.length > 0) {
      const paramsAfterModule = params.filter(p => p.line > firstModule.line);
      if (paramsAfterModule.length > 0) {
        result.warning(
          'Some parameters defined after first module - move to top of file',
          paramsAfterModule[0].line
        );
      } else {
        result.pass('parameters-at-top');
      }
    }
  }

  // Check for [Hidden] section
  if (structure.requireHiddenSection) {
    const hasHidden = parser.content.includes('[Hidden]') ||
                      parser.content.includes('/* [Hidden] */');
    if (!hasHidden) {
      result.addInfo(
        'Consider adding /* [Hidden] */ section for internal parameters',
        null
      );
    } else {
      result.pass('hidden-section');
    }
  }

  // Check for Customizer sections
  const hasCustomizer = /\/\*\s*\[[\w\s]+\]\s*\*\//.test(parser.content);
  if (hasCustomizer) {
    result.pass('customizer-compatible');
  } else {
    result.addInfo('Consider adding Customizer sections: /* [Section Name] */');
  }

  return result;
}

// ============================================
// UTILITIES
// ============================================

function findOpenSCAD() {
  const paths = [
    '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',  // macOS
    '/usr/bin/openscad',                                     // Linux
    '/usr/local/bin/openscad',
    'C:\\Program Files\\OpenSCAD\\openscad.exe',            // Windows
    'openscad'                                               // In PATH
  ];

  for (const p of paths) {
    try {
      execSync(`"${p}" --version 2>/dev/null`, { encoding: 'utf-8' });
      return p;
    } catch {
      continue;
    }
  }

  return null;
}

function loadConfig(configPath) {
  if (configPath && fs.existsSync(configPath)) {
    const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...customConfig };
  }
  return DEFAULT_CONFIG;
}

function formatOutput(results, asJson = false) {
  if (asJson) {
    return JSON.stringify(results, null, 2);
  }

  let output = '';
  const allIssues = [
    ...results.errors.map(e => ({ ...e, icon: '❌' })),
    ...results.warnings.map(w => ({ ...w, icon: '⚠️' })),
    ...results.info.map(i => ({ ...i, icon: 'ℹ️' }))
  ].sort((a, b) => (a.line || 0) - (b.line || 0));

  if (allIssues.length === 0) {
    output += '✅ All checks passed!\n';
  } else {
    for (const issue of allIssues) {
      const lineStr = issue.line ? `:${issue.line}` : '';
      output += `${issue.icon} ${issue.message}${lineStr}\n`;
      if (issue.fix) {
        output += `   Fix: ${issue.fix}\n`;
      }
    }
  }

  output += '\n';
  output += `Summary: ${results.errors.length} errors, ${results.warnings.length} warnings, ${results.passed.length} passed\n`;

  return output;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
OpenSCAD Design Validator

Usage: node validate.js <file.scad> [options]

Options:
  --strict     Enable strict mode (treat warnings as errors)
  --json       Output results as JSON
  --fix        Show suggested fixes
  --config     Path to custom config file
  --help       Show this help message

Example:
  node validate.js my-design.scad --strict --json
`);
    process.exit(0);
  }

  const filePath = args.find(a => a.endsWith('.scad'));
  const strict = args.includes('--strict');
  const asJson = args.includes('--json');
  const configPath = args.find(a => a.startsWith('--config='))?.split('=')[1];

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const config = loadConfig(configPath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parser = new OpenSCADParser(content);

  // Run all validators
  const results = new ValidationResult();

  // Syntax validation
  const syntaxResults = await validateSyntax(filePath);
  results.errors.push(...syntaxResults.errors);
  results.warnings.push(...syntaxResults.warnings);
  results.passed.push(...syntaxResults.passed);

  // Manufacturing constraints
  const constraintResults = validateConstraints(parser, config);
  results.errors.push(...constraintResults.errors);
  results.warnings.push(...constraintResults.warnings);
  results.info.push(...constraintResults.info);
  results.passed.push(...constraintResults.passed);

  // Code quality
  const qualityResults = validateCodeQuality(parser, config);
  results.errors.push(...qualityResults.errors);
  results.warnings.push(...qualityResults.warnings);
  results.info.push(...qualityResults.info);
  results.passed.push(...qualityResults.passed);

  // Structure
  const structureResults = validateStructure(parser, config);
  results.errors.push(...structureResults.errors);
  results.warnings.push(...structureResults.warnings);
  results.info.push(...structureResults.info);
  results.passed.push(...structureResults.passed);

  // In strict mode, treat warnings as errors
  if (strict) {
    results.errors.push(...results.warnings);
    results.warnings = [];
  }

  // Output results
  console.log(formatOutput(results, asJson));

  // Exit with error code if validation failed
  process.exit(results.isValid ? 0 : 1);
}

main().catch(err => {
  console.error('Validation error:', err.message);
  process.exit(1);
});
