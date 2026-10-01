const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  { name: 'OpenAI API Key', regex: /\b(sk-(?:proj-|admin-|svcacct-)?[a-zA-Z0-9_-]{20,})\b/ },
  { name: 'Anthropic API Key', regex: /\b(sk-ant-(?:api\d{2}-)?[a-zA-Z0-9_-]{20,})\b/ },
  { name: 'GitHub Token', regex: /\b(?:gh[pousr]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{50,})\b/ },
  { name: 'Slack Token', regex: /\b(xox[baprs]-[0-9a-zA-Z-]{10,})\b/ },
  { name: 'AWS Access Key ID', regex: /\b(AKIA[0-9A-Z]{16})\b/ },
  { name: 'JWT Token', regex: /\b(ey[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_=]{10,}\.?[A-Za-z0-9-_.+/=]*)\b/ },
  { name: 'Private Key', regex: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/ },
];

const SAFE_PLACEHOLDERS = new Set([
  '',
  'placeholder',
  'your_api_key_here',
  'your-api-key-here',
  'change_me',
  'changeme',
  'xxx',
  'xxxx',
  'secret',
  'todo',
  'dummy',
  'test',
]);

/**
 * Calculates the Shannon entropy of a string.
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;
  const frequencies = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Scans key-value variables or raw content for leaked secrets and high-entropy strings.
 */
function scanSecrets(varsOrContent, options = {}) {
  const minEntropy = options.minEntropy || 3.8;
  const minLength = options.minLength || 16;
  const leaks = [];

  const vars = typeof varsOrContent === 'string' ? parseEnv(varsOrContent) : varsOrContent;

  for (const [key, val] of Object.entries(vars)) {
    if (typeof val !== 'string' || !val) continue;

    const lowerVal = val.toLowerCase().trim();
    if (SAFE_PLACEHOLDERS.has(lowerVal) || lowerVal.startsWith('your_') || lowerVal.startsWith('your-')) {
      continue;
    }

    // 1. Check known regex patterns
    let matchedPattern = null;
    for (const pat of SECRET_PATTERNS) {
      if (pat.regex.test(val)) {
        matchedPattern = pat.name;
        break;
      }
    }

    if (matchedPattern) {
      leaks.push({
        key,
        type: 'pattern',
        patternName: matchedPattern,
        maskedValue: maskSecret(val),
      });
      continue;
    }

    // 2. Check Shannon entropy on sufficiently long token-like values
    if (val.length >= minLength) {
      const entropy = calculateEntropy(val);
      if (entropy >= minEntropy) {
        leaks.push({
          key,
          type: 'high-entropy',
          entropy: Number(entropy.toFixed(2)),
          maskedValue: maskSecret(val),
        });
      }
    }
  }

  return leaks;
}

function maskSecret(val) {
  if (val.length <= 8) return '********';
  return val.slice(0, 4) + '...' + val.slice(-4);
}

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
 * Validates local .env against .env.example and audits for secret leaks.
 */
function diagnose(envPath, examplePath, options = {}) {
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

  // Scan example file for accidentally committed secrets
  const exampleLeaks = scanSecrets(exampleVars, options);

  // Scan current env file for leaks
  const envLeaks = scanSecrets(envVars, options);

  return {
    valid: missing.length === 0 && empty.length === 0 && exampleLeaks.length === 0,
    missing,
    empty,
    extra,
    exampleLeaks,
    envLeaks,
    totalExpected: Object.keys(exampleVars).length,
    totalConfigured: Object.keys(envVars).length,
  };
}

module.exports = {
  parseEnv,
  diagnose,
  calculateEntropy,
  scanSecrets,
};

