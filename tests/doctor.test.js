const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseEnv, diagnose, calculateEntropy, scanSecrets } = require('../src/index');

test('parseEnv correctly parses key-value pairs and comments', () => {
  const content = `
    # Database config
    DB_HOST=localhost
    DB_PORT=5432
    API_KEY="secret-token"
  `;
  const parsed = parseEnv(content);
  assert.strictEqual(parsed.DB_HOST, 'localhost');
  assert.strictEqual(parsed.DB_PORT, '5432');
  assert.strictEqual(parsed.API_KEY, 'secret-token');
});

test('calculateEntropy correctly measures Shannon entropy', () => {
  const zeroEntropy = calculateEntropy('aaaaaaaaaaaaaaaa');
  assert.strictEqual(zeroEntropy, 0);

  const highEntropy = calculateEntropy('9f8b4a2c7e1d5a8f3b6c2d0e');
  assert.ok(highEntropy > 3.0);
});

test('scanSecrets flags known API key patterns and high entropy secrets', () => {
  const secrets = {
    OPENAI_KEY: 'sk-proj-9823482734982739487239487293847',
    GITHUB_PAT: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    SLACK_TOKEN: 'xoxb-1234567890-abcdefghij',
    AWS_KEY: 'AKIA1234567890EXAMPLE',
    HIGH_ENTROPY_PASS: '8f7a#kL9$zQ2!vW0pX',
    SAFE_KEY: 'your_api_key_here',
    EMPTY_VAL: '',
  };

  const leaks = scanSecrets(secrets);
  assert.strictEqual(leaks.length, 5);

  const openaiLeak = leaks.find(l => l.key === 'OPENAI_KEY');
  assert.ok(openaiLeak);
  assert.strictEqual(openaiLeak.patternName, 'OpenAI API Key');

  const githubLeak = leaks.find(l => l.key === 'GITHUB_PAT');
  assert.ok(githubLeak);
  assert.strictEqual(githubLeak.patternName, 'GitHub Token');

  const entropyLeak = leaks.find(l => l.key === 'HIGH_ENTROPY_PASS');
  assert.ok(entropyLeak);
  assert.strictEqual(entropyLeak.type, 'high-entropy');

  const safeLeak = leaks.find(l => l.key === 'SAFE_KEY');
  assert.strictEqual(safeLeak, undefined);
});

test('diagnose flags missing, empty environment keys and leaked secrets in .env.example', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
  const examplePath = path.join(tmpDir, '.env.example');
  const envPath = path.join(tmpDir, '.env');

  fs.writeFileSync(
    examplePath,
    'PORT=3000\nDATABASE_URL=\nAPI_KEY=sk-proj-1234567890123456789012345\n'
  );
  fs.writeFileSync(envPath, 'PORT=8080\nDATABASE_URL=\nAPI_KEY=sk-proj-1234567890123456789012345\n');

  const report = diagnose(envPath, examplePath);
  assert.strictEqual(report.valid, false);
  assert.strictEqual(report.exampleLeaks.length, 1);
  assert.strictEqual(report.exampleLeaks[0].key, 'API_KEY');
  assert.deepStrictEqual(report.empty, ['DATABASE_URL']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

