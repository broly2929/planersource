import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = new URL('../sbom.mjs', import.meta.url).pathname;
const FIXTURE = new URL('./fixtures/sbom/', import.meta.url).pathname;
const REPO = new URL('../../', import.meta.url).pathname;

interface Composant {
  'bom-ref': string;
  name: string;
  licenses?: { license?: { id?: string; name?: string } }[];
  properties?: { name: string; value: string }[];
}
interface Dependance {
  ref: string;
  dependsOn?: string[];
}
interface Sbom {
  specVersion?: string;
  serialNumber?: string;
  metadata: {
    timestamp?: string;
    tools?: unknown;
    component?: Composant;
    lifecycles?: { phase: string }[];
  };
  components: Composant[];
  dependencies: Dependance[];
}

/** Copie de la fixture dans un dossier temporaire (chaque test isole son dossier). */
function copieFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'ps-sbom-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

/** Lance le script en processus fils, jamais importé. */
function run(root: string, ...args: string[]) {
  const r = spawnSync('node', [SCRIPT, '--root', root, ...args], { encoding: 'utf8', cwd: REPO });
  return { code: r.status, out: `${r.stdout}${r.stderr}`, err: r.stderr };
}

/** Écrit le SBOM de la fixture et le renvoie (octets lus, objet analysé). */
function ecrit(root: string): { texte: string; sbom: Sbom } {
  const r = run(root);
  expect(r.code, r.out).toBe(0);
  const texte = readFileSync(join(root, 'sbom.cdx.json'), 'utf8');
  return { texte, sbom: JSON.parse(texte) as Sbom };
}

const trie = (xs: string[]) => [...xs].sort();

describe('SBOM CycloneDX (D-169)', () => {
  it('SBOM-1 : deux écritures successives donnent des fichiers identiques octet pour octet', () => {
    const root = copieFixture();
    const premier = ecrit(root).texte;
    const second = ecrit(root).texte;
    expect(second).toBe(premier);
    expect(premier.endsWith('}\n')).toBe(true);
  });

  it('SBOM-2 : ni serialNumber, ni metadata.timestamp, ni metadata.tools ; specVersion, metadata.component et phase pre-build présents', () => {
    const { sbom } = ecrit(copieFixture());
    expect(sbom).not.toHaveProperty('serialNumber');
    expect(sbom.metadata).not.toHaveProperty('timestamp');
    expect(sbom.metadata).not.toHaveProperty('tools');
    expect(sbom.specVersion).toBeTruthy();
    expect(sbom.metadata.component).toBeTruthy();
    expect(sbom.metadata.lifecycles).toEqual([{ phase: 'pre-build' }]);
  });

  it('SBOM-3 : components triés par bom-ref, dependencies par ref, chaque dependsOn trié', () => {
    const { sbom } = ecrit(copieFixture());
    const refs = sbom.components.map((c) => c['bom-ref']);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs).toEqual(trie(refs));
    const deps = sbom.dependencies.map((d) => d.ref);
    expect(deps.length).toBeGreaterThan(0);
    expect(deps).toEqual(trie(deps));
    for (const d of sbom.dependencies) {
      expect(d.dependsOn ?? [], d.ref).toEqual(trie(d.dependsOn ?? []));
    }
  });

  it("SBOM-4 : X (aussi devDependency de e2e) et packages/a figurent ; Y, Z et @planersource/e2e sont absents ; aucun composant n'est development", () => {
    const { sbom } = ecrit(copieFixture());
    const refs = sbom.components.map((c) => c['bom-ref']);
    const x = sbom.components.find((c) => c.name === 'ms');
    expect(x, 'X (ms) présent').toBeTruthy();
    expect(x?.licenses?.[0]?.license?.id).toBe('MIT');
    expect(refs).toContain('@planersource/a@0.0.0');
    const retires = ['is-number@7.0.0', 'isarray@2.0.5', '@planersource/e2e@0.0.0'];
    const refsDependencies = sbom.dependencies.map((d) => d.ref);
    const refsDependsOn = sbom.dependencies.flatMap((d) => d.dependsOn ?? []);
    for (const r of retires) {
      expect(refs, `composant ${r}`).not.toContain(r);
      expect(refsDependencies, `ref ${r}`).not.toContain(r);
      expect(refsDependsOn, `dependsOn ${r}`).not.toContain(r);
    }
    for (const c of sbom.components) {
      const dev = c.properties?.find((p) => p.name === 'cdx:npm:package:development');
      expect(dev?.value, c['bom-ref']).not.toBe('true');
    }
  });

  it('SBOM-5 : chaque ref de dependencies et chaque dependsOn désigne un composant présent ou metadata.component', () => {
    const { sbom } = ecrit(copieFixture());
    const connus = new Set(sbom.components.map((c) => c['bom-ref']));
    const racine = sbom.metadata.component?.['bom-ref'];
    expect(racine).toBeTruthy();
    connus.add(racine as string);
    for (const d of sbom.dependencies) {
      expect(connus.has(d.ref), `ref ${d.ref}`).toBe(true);
      for (const cible of d.dependsOn ?? []) {
        expect(connus.has(cible), `${d.ref} dépend de ${cible}`).toBe(true);
      }
    }
  });

  it('SBOM-6 : --check sur un fichier à jour renvoie 0 et laisse le fichier inchangé (contenu et date)', () => {
    const root = copieFixture();
    const { texte } = ecrit(root);
    const fichier = join(root, 'sbom.cdx.json');
    const ancienne = new Date('2020-01-01T00:00:00Z');
    utimesSync(fichier, ancienne, ancienne);
    const avant = statSync(fichier).mtimeMs;
    const r = run(root, '--check');
    expect(r.code, r.out).toBe(0);
    expect(readFileSync(fichier, 'utf8')).toBe(texte);
    expect(statSync(fichier).mtimeMs).toBe(avant);
  });

  it('SBOM-7 : --check sur un fichier périmé ou absent renvoie 1, nomme le composant et npm run sbom, sans rien écrire', () => {
    const root = copieFixture();
    const { sbom } = ecrit(root);
    const fichier = join(root, 'sbom.cdx.json');
    const perime = {
      ...sbom,
      components: sbom.components.filter((c) => c.name !== 'ms'),
    };
    writeFileSync(fichier, `${JSON.stringify(perime, null, 2)}\n`);
    const avant = readFileSync(fichier, 'utf8');
    const r = run(root, '--check');
    expect(r.code, r.out).toBe(1);
    expect(r.err).toContain('ms@2.1.3');
    expect(r.err).toContain('npm run sbom');
    expect(readFileSync(fichier, 'utf8')).toBe(avant);

    const vide = copieFixture();
    const absent = run(vide, '--check');
    expect(absent.code, absent.out).toBe(1);
    expect(absent.err).toContain('npm run sbom');
    expect(existsSync(join(vide, 'sbom.cdx.json'))).toBe(false);
  });

  it("SBOM-8 : ci.yml a l'étape npm run sbom -- --check après npm run licenses et avant l'installation de Playwright", () => {
    const lignes = readFileSync(join(REPO, '.github/workflows/ci.yml'), 'utf8').split('\n');
    const index = (re: RegExp) => lignes.findIndex((l) => re.test(l));
    const licences = index(/run:\s*npm run licenses\s*$/);
    const sbom = index(/run:\s*npm run sbom -- --check\s*$/);
    const playwright = index(/playwright install/);
    expect(licences, 'étape licences').toBeGreaterThanOrEqual(0);
    expect(sbom, 'étape sbom').toBeGreaterThanOrEqual(0);
    expect(playwright, 'étape playwright').toBeGreaterThanOrEqual(0);
    expect(sbom).toBeGreaterThan(licences);
    expect(sbom).toBeLessThan(playwright);
  });

  it('SBOM-9 : package.json a le script sbom ; .prettierignore contient sbom.cdx.json', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.sbom).toBe('node scripts/sbom.mjs');
    const ignore = readFileSync(join(REPO, '.prettierignore'), 'utf8').split('\n');
    expect(ignore.map((l) => l.trim())).toContain('sbom.cdx.json');
  });

  it('SBOM-10 : le SBOM ne dépend pas du nom du dossier de la racine (D-170 (1))', () => {
    const parent = mkdtempSync(join(tmpdir(), 'ps-sbom-noms-'));
    const a = join(parent, 'nom-a');
    const b = join(parent, 'nom-b');
    cpSync(FIXTURE, a, { recursive: true });
    cpSync(FIXTURE, b, { recursive: true });
    const texteA = ecrit(a).texte;
    const { texte: texteB, sbom } = ecrit(b);
    expect(texteB).toBe(texteA);
    const pkg = JSON.parse(readFileSync(join(FIXTURE, 'package.json'), 'utf8')) as { name: string };
    expect(sbom.metadata.component?.name).toBe(pkg.name);
    cpSync(join(a, 'sbom.cdx.json'), join(b, 'sbom.cdx.json'));
    const r = run(b, '--check');
    expect(r.code, r.out).toBe(0);
  });
});
