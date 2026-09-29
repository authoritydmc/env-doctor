const fs = require('fs');
const path = require('path');

/**
 * Parses simple .env format into key-value map.
 */
function parseEnv(content) {
  const result = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      result[key] = val;
    }
  }
  return result;
}

/**
 * Validates local .env against .env.example
 */
function diagnose(envPath, examplePath) {
  if (!fs.existsSync(examplePath)) {
    return { error: `Example file not found: ${examplePath}` };
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf8');
  const exampleVars = parseEnv(exampleContent);

  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const envVars = parseEnv(envContent);

  const missing = [];
  const empty = [];
  const extra = [];

  for (const key of Object.keys(exampleVars)) {
    if (!(key in envVars)) {
      missing.push(key);
    } else if (envVars[key] === '') {
      empty.push(key);
    }
  }

  for (const key of Object.keys(envVars)) {
    if (!(key in exampleVars)) {
      extra.push(key);
    }
  }

  return {
    valid: missing.length === 0 && empty.length === 0,
    missing,
    empty,
    extra,
    totalExpected: Object.keys(exampleVars).length,
    totalConfigured: Object.keys(envVars).length,
  };
}

module.exports = {
  parseEnv,
  diagnose,
};
