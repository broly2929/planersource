import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = new URL('../check-licenses.mjs', import.meta.url).pathname;

function run(root?: string) {
  const args = root ? [SCRIPT, '--root', root] : [SCRIPT];
  const r = spawnSync('node', args, { encoding: 'utf8', cwd: new URL('../..', import.meta.url) });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Projet factice : une dépendance (d'exécution ou de développement) sous une licence donnée. */
function fixture(license: string | undefined, kind: 'dependencies' | 'devDependencies'): string {
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

describe('Contrôle des licences', () => {
  it('LIC-1 : le contrôle passe sur les dépendances actuelles', () => {
    const r = run();
    expect(r.code, r.out).toBe(0);
  });

  it('LIC-2 : GPL-3.0, AGPL-3.0 ou LGPL-3.0 → échec', () => {
    for (const license of ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0']) {
      for (const kind of ['dependencies', 'devDependencies'] as const) {
        const r = run(fixture(license, kind));
        expect(r.code, `${license} ${kind}`).toBe(1);
        expect(r.out, `${license} ${kind}`).toContain('fixture-pkg');
      }
    }
  });

  it('LIC-4 : licence absente ou « UNKNOWN » → échec, en exécution comme en développement', () => {
    for (const license of [undefined, 'UNKNOWN']) {
      for (const kind of ['dependencies', 'devDependencies'] as const) {
        const r = run(fixture(license, kind));
        expect(r.code, `${license ?? 'absente'} ${kind}`).toBe(1);
        expect(r.out, `${license ?? 'absente'} ${kind}`).toContain('fixture-pkg');
      }
    }
  });

  it('LIC-3 : BlueOak-1.0.0 en exécution → échec ; en outillage de développement → succès', () => {
    const runtime = run(fixture('BlueOak-1.0.0', 'dependencies'));
    expect(runtime.code, runtime.out).toBe(1);
    expect(runtime.out).toContain('fixture-pkg');

    const dev = run(fixture('BlueOak-1.0.0', 'devDependencies'));
    expect(dev.code, dev.out).toBe(0);
  });
});
