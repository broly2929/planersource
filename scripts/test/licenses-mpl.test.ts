import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = new URL('../check-licenses.mjs', import.meta.url).pathname;

function run(root: string) {
  const r = spawnSync('node', [SCRIPT, '--root', root], {
    encoding: 'utf8',
    cwd: new URL('../..', import.meta.url),
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function fixture(license: string, kind: 'dependencies' | 'devDependencies'): string {
  const root = mkdtempSync(join(tmpdir(), 'ps-lic-'));
  const dep = join(root, 'node_modules', 'fixture-pkg');
  mkdirSync(dep, { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture-root',
      version: '1.0.0',
      license: 'MIT',
      [kind]: { 'fixture-pkg': '1.0.0' },
    }),
  );
  writeFileSync(
    join(dep, 'package.json'),
    JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', license }),
  );
  return root;
}

describe('Contrôle des licences (lot 0bis)', () => {
  it('LIC-5 : MPL-2.0 en exécution → échec ; en outillage de développement → succès', () => {
    const runtime = run(fixture('MPL-2.0', 'dependencies'));
    expect(runtime.code, runtime.out).toBe(1);
    expect(runtime.out).toContain('fixture-pkg');

    const dev = run(fixture('MPL-2.0', 'devDependencies'));
    expect(dev.code, dev.out).toBe(0);
  });
});
