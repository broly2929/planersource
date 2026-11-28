import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = new URL('../../', import.meta.url).pathname;
const SCRIPT = join(REPO, 'scripts/audit-securite.mjs');

interface Pkg {
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
}
const pkg = () => JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as Pkg;

/**
 * Faux npm placé en tête du PATH : note ses arguments dans un journal, puis sort avec le code
 * prévu pour l'appel (1er appel : CODE1, 2e : CODE2).
 */
function fauxNpm(code1: number, code2: number) {
  const dir = mkdtempSync(join(tmpdir(), 'ps-audit-'));
  const journal = join(dir, 'journal.txt');
  const npm = join(dir, 'npm');
  writeFileSync(
    npm,
    `#!/bin/sh
n=$(wc -l < "${journal}" 2>/dev/null || echo 0)
echo "$*" >> "${journal}"
if [ "$n" -eq 0 ]; then exit ${code1}; else exit ${code2}; fi
`,
  );
  chmodSync(npm, 0o755);
  const r = spawnSync('node', [SCRIPT], {
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
  });
  let appels: string[] = [];
  try {
    appels = readFileSync(journal, 'utf8').trim().split('\n');
  } catch {
    appels = [];
  }
  return { code: r.status, out: `${r.stdout}${r.stderr}`, appels };
}

describe('Outillage de sécurité (D-272)', () => {
  it('SECT-1 : eslint-plugin-security en devDependency, script lint:securite séparé, script lint inchangé et sans le plugin', () => {
    const p = pkg();
    expect(p.devDependencies['eslint-plugin-security']).toBeTruthy();
    expect(p.scripts['lint:securite']).toBe('eslint -c eslint.securite.config.js .');
    expect(p.scripts.lint).toBe('eslint . && prettier --check .');
    expect(readFileSync(join(REPO, 'eslint.config.js'), 'utf8')).not.toContain('security');
    expect(readFileSync(join(REPO, 'eslint.securite.config.js'), 'utf8')).toContain(
      'eslint-plugin-security',
    );
  });

  it('SECT-2 : audit-securite lance npm audit --omit=dev --audit-level=high puis npm audit ; code de sortie du premier seul', () => {
    expect(pkg().scripts['audit-securite']).toBe('node scripts/audit-securite.mjs');
    const vert = fauxNpm(0, 1);
    expect(vert.appels).toEqual(['audit --omit=dev --audit-level=high', 'audit']);
    expect(vert.code, vert.out).toBe(0);
    const rouge = fauxNpm(1, 0);
    expect(rouge.appels).toEqual(['audit --omit=dev --audit-level=high', 'audit']);
    expect(rouge.code, rouge.out).toBe(1);
  });

  it("SECT-3 : ci.yml a l'étape npm run audit-securite, non bloquante, après npm run licenses et avant l'installation de Playwright", () => {
    const lignes = readFileSync(join(REPO, '.github/workflows/ci.yml'), 'utf8').split('\n');
    const index = (re: RegExp) => lignes.findIndex((l) => re.test(l));
    const licences = index(/run:\s*npm run licenses\s*$/);
    const audit = index(/run:\s*npm run audit-securite\s*$/);
    const playwright = index(/playwright install/);
    expect(audit, 'étape audit-securite').toBeGreaterThan(licences);
    expect(audit).toBeLessThan(playwright);
    const etape = lignes.slice(Math.max(0, audit - 2), audit + 3).join('\n');
    expect(etape).toMatch(/continue-on-error:\s*true/);
  });
});
