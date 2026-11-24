import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lancer, RACINE } from './outillage-helpers.js';

// Hook commit-msg suivi par git (D-198 (2)) : HCM-1 à HCM-5, dans des dépôts git temporaires.
const HOOK = '.githooks/commit-msg';
const SETUP = 'scripts/setup-depot.mjs';

function copier(dossier: string): void {
  for (const f of [HOOK, SETUP]) {
    mkdirSync(join(dossier, f, '..'), { recursive: true });
    copyFileSync(resolve(RACINE, f), join(dossier, f));
  }
}

const git = (dossier: string, ...args: string[]) =>
  lancer('git', ['-c', 'user.name=essai', '-c', 'user.email=essai@exemple.test', ...args], {
    cwd: dossier,
  });

async function depot(): Promise<string> {
  const d = mkdtempSync(join(tmpdir(), 'hcm-'));
  await git(d, 'init', '-q', '-b', 'essai');
  copier(d);
  const r = await lancer('node', [SETUP], { cwd: d });
  expect(r.code, r.sortie).toBe(0);
  writeFileSync(join(d, 'a.txt'), 'a\n');
  await git(d, 'add', 'a.txt');
  return d;
}

const tete = async (d: string) =>
  (await git(d, 'rev-parse', '--verify', '-q', 'HEAD')).sortie.trim();

async function committer(message: string): Promise<{ code: number; sortie: string; tete: string }> {
  const d = await depot();
  const fichier = join(d, '..', `${d.split('/').at(-1)}-msg.txt`);
  writeFileSync(fichier, message);
  const r = await git(d, 'commit', '-q', '--cleanup=strip', '-F', fichier);
  return { ...r, tete: await tete(d) };
}

const TRAILER = 'Co-Authored-By: Essai <essai@exemple.test>';

describe('HCM-1 sujet seul', () => {
  it('accepté, commit créé', async () => {
    const r = await committer('feat: sujet seul\n');
    expect(r.code, r.sortie).toBe(0);
    expect(r.tete).not.toBe('');
  });
});

describe('HCM-2 sujet, ligne vide, corps et trailer', () => {
  it('accepté', async () => {
    const r = await committer(`fix: sujet\n\nCorps du message.\n\n${TRAILER}\n`);
    expect(r.code, r.sortie).toBe(0);
    expect(r.tete).not.toBe('');
  });
});

describe('HCM-3 sujet suivi directement du trailer ou du corps', () => {
  it.each([
    ['trailer', `test: sujet\n${TRAILER}\n`],
    ['corps', 'docs: sujet\nCorps collé au sujet.\n\nAutre paragraphe.\n'],
  ])('%s : refusé, message, aucun commit', async (_cas, message) => {
    const r = await committer(message);
    expect(r.code).not.toBe(0);
    expect(r.sortie).toMatch(/ligne vide/);
    expect(r.tete).toBe('');
  });
});

describe('HCM-4 commentaires et ciseaux ignorés', () => {
  it('sujet, commentaires git, ciseaux et diff : accepté', async () => {
    const message = [
      'chore: sujet',
      '# Veuillez saisir le message de validation.',
      '# Les lignes commençant par « # » seront ignorées.',
      '# ------------------------ >8 ------------------------',
      '# Ne touchez pas à la ligne ci-dessus.',
      'diff --git a/a.txt b/a.txt',
      '+a',
      '',
    ].join('\n');
    const d = await depot();
    const fichier = join(d, '..', `${d.split('/').at(-1)}-msg.txt`);
    writeFileSync(fichier, message);
    const r = await git(d, 'commit', '-q', '--cleanup=scissors', '-F', fichier);
    expect(r.code, r.sortie).toBe(0);
    expect(await tete(d)).not.toBe('');
  });
});

describe('HCM-5 suivi par git et installation', () => {
  it('.githooks/commit-msg suivi avec le mode exécutable', () => {
    const ligne = execFileSync('git', ['ls-files', '-s', HOOK], { cwd: RACINE, encoding: 'utf8' });
    expect(ligne).toMatch(/^100755 /);
  });
  it('setup-depot pose core.hooksPath = .githooks', async () => {
    const d = await depot();
    const r = await git(d, 'config', '--get', 'core.hooksPath');
    expect(r.sortie.trim()).toBe('.githooks');
  });
  it('package.json déclare setup-depot', async () => {
    const { readFileSync } = await import('node:fs');
    const scripts = JSON.parse(readFileSync(resolve(RACINE, 'package.json'), 'utf8')).scripts;
    expect(scripts['setup-depot']).toBe('node scripts/setup-depot.mjs');
  });
  it('hors d’un dépôt git : code 0, rien de créé', async () => {
    const d = mkdtempSync(join(tmpdir(), 'hcm-hors-'));
    copier(d);
    const r = await lancer('node', [SETUP], { cwd: d, env: { GIT_CEILING_DIRECTORIES: tmpdir() } });
    expect(r.code, r.sortie).toBe(0);
    expect(existsSync(join(d, '.git'))).toBe(false);
  });
});
