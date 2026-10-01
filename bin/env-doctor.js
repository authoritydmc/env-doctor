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
  if (report.envLeaks && report.envLeaks.length > 0) {
    console.log(`\n⚠️  Notice: ${report.envLeaks.length} live secret/high-entropy values detected in your private .env (keep .env gitignored):`);
    report.envLeaks.forEach(l => {
      const detail = l.type === 'pattern' ? l.patternName : `high entropy: ${l.entropy}`;
      console.log(`    🔑 ${l.key} (${detail}): ${l.maskedValue}`);
    });
  }
  process.exit(0);
} else {
  console.error('❌ Environment configuration issues detected:\n');
  if (report.exampleLeaks && report.exampleLeaks.length > 0) {
    console.error(`  🚨 CRITICAL: Leaked secrets detected in .env.example (${report.exampleLeaks.length}):`);
    report.exampleLeaks.forEach(l => {
      const detail = l.type === 'pattern' ? l.patternName : `high entropy: ${l.entropy}`;
      console.error(`    - ${l.key} (${detail}): ${l.maskedValue}`);
    });
  }
  if (report.missing.length > 0) {
    console.error(`\n  Missing variables (${report.missing.length}):`);
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

