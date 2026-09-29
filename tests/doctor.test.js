const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseEnv, diagnose } = require('../src/index');

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

test('diagnose flags missing and empty environment keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
  const examplePath = path.join(tmpDir, '.env.example');
  const envPath = path.join(tmpDir, '.env');

  fs.writeFileSync(examplePath, 'PORT=3000\nDATABASE_URL=\nAPI_KEY=\n');
  fs.writeFileSync(envPath, 'PORT=8080\nDATABASE_URL=\n');

  const report = diagnose(envPath, examplePath);
  assert.strictEqual(report.valid, false);
  assert.deepStrictEqual(report.missing, ['API_KEY']);
  assert.deepStrictEqual(report.empty, ['DATABASE_URL']);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
