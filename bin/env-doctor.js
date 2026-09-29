#!/usr/bin/env node
const path = require('path');
const { diagnose } = require('../src/index');

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');
const examplePath = path.join(cwd, '.env.example');

console.log('🩺 Running env-doctor audit...\n');

const report = diagnose(envPath, examplePath);

if (report.error) {
  console.log(`ℹ️  ${report.error}`);
  process.exit(0);
}

if (report.valid) {
  console.log(`✅ All ${report.totalExpected} expected environment variables are properly configured!`);
  process.exit(0);
} else {
  console.error('❌ Environment configuration issues detected:\n');
  if (report.missing.length > 0) {
    console.error(`  Missing variables (${report.missing.length}):`);
    report.missing.forEach(k => console.error(`    - ${k}`));
  }
  if (report.empty.length > 0) {
    console.error(`\n  Empty variables (${report.empty.length}):`);
    report.empty.forEach(k => console.error(`    - ${k}`));
  }
  if (report.extra.length > 0) {
    console.log(`\n  Extra variables not in .env.example (${report.extra.length}):`);
    report.extra.forEach(k => console.log(`    + ${k}`));
  }
  process.exit(1);
}
