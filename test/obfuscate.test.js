// Lightweight unit test for the obfuscator (static build checks)
const { spawnSync } = require('child_process');
const path = require('path');

const bin = path.join(__dirname, '..', 'scripts', 'obfuscate.js');
// Use .build/public as the output directory (CI/build output path)
const publicDir = path.join(__dirname, '..', '.build', 'public');

console.log('Running obfuscator --dry-run --assets --check --json against', publicDir);
const res = spawnSync('node', [bin, publicDir, '--dry-run', '--assets', '--check', '--json'], { encoding: 'utf8' });
if (res.error) {
  console.error('Failed to spawn obfuscator:', res.error);
  process.exit(2);
}
if (res.status !== 0 && res.status !== 3) {
  console.error('Obfuscator exited with unexpected code', res.status);
  console.error(res.stdout);
  console.error(res.stderr);
  process.exit(2);
}

let out = res.stdout || '';
try {
  const parsed = JSON.parse(out);
  if (!parsed || !parsed.health) {
    console.error('Invalid JSON health output from obfuscator');
    console.error(out);
    process.exit(2);
  }
  const health = parsed.health;
  // basic assertions
  if (typeof health.sriAnyMismatch !== 'boolean') throw new Error('sriAnyMismatch missing');
  if (!health.obfuscation) throw new Error('obfuscation summary missing');
  console.log('Health summary:', JSON.stringify(health, null, 2));
  if (health.sriAnyMismatch) {
    console.error('SRI mismatches found — failing unit test');
    process.exit(1);
  }
  console.log('Unit test passed: no SRI mismatches reported.');
  process.exit(0);
} catch (e) {
  console.error('Failed to parse obfuscator output as JSON:', e && e.message);
  console.error('Raw output:\n', out);
  console.error('Stderr:\n', res.stderr);
  process.exit(2);
}
