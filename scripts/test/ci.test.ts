import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');

/** Lignes du bloc `on:` (sans dépendance YAML) : tout ce qui est indenté sous `on:`. */
function blocOn(): string[] {
  const lignes = workflow.split('\n');
  const debut = lignes.findIndex((l) => /^on:\s*$/.test(l));
  if (debut < 0) return [];
  const bloc: string[] = [];
  for (const l of lignes.slice(debut + 1)) {
    if (l.trim() !== '' && !/^\s/.test(l)) break;
    bloc.push(l);
  }
  return bloc;
}

describe('Workflow CI', () => {
  it('CI-1 : le workflow ci.yml ne se déclenche pas sur un push de tag (push limité aux branches) et garde pull_request', () => {
    const bloc = blocOn();
    const push = bloc.findIndex((l) => /^\s{2}push:\s*$/.test(l));
    expect(push, 'push: présent').toBeGreaterThanOrEqual(0);
    const sousPush: string[] = [];
    for (const l of bloc.slice(push + 1)) {
      if (/^\s{2}\S/.test(l)) break;
      sousPush.push(l);
    }
    const texte = sousPush.join('\n');
    expect(texte).toMatch(/^\s{4}branches:/m);
    expect(texte).not.toMatch(/tags/);
    expect(bloc.some((l) => /^\s{2}pull_request:/.test(l))).toBe(true);
  });
});
