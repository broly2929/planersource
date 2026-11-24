import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Tests structurels de la garde des dialogues (D-188 (10) d, (6)) : recherche dans le code source. GDL-5 à GDL-7.
 */

const SRC = join(import.meta.dirname, '..', 'src');
function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fichiers(p) : p.endsWith('.tsx') ? [p] : [];
  });
}
const occurrences = (src: string, motif: RegExp) => (src.match(motif) ?? []).length;

describe('GDL-5 : sansGarde réservé aux cinq dialogues de l’audit', () => {
  const ATTENDU: Record<string, number> = {
    'calcul/DialogueCalcul.tsx': 1,
    'components/Confirmation.tsx': 1,
    'export/DialogueExport.tsx': 1,
    'screens/Validation.tsx': 1,
    'screens/projet/PlanningProjet.tsx': 1,
  };
  it('une occurrence JSX par dialogue de la liste, aucune ailleurs', () => {
    const trouve: Record<string, number> = {};
    for (const f of fichiers(SRC)) {
      const rel = relative(SRC, f);
      // Définitions (Dialog, FormulaireDialogue) et variable interne du routeur (D-172) : hors recherche.
      if (['components/Dialog.tsx', 'screens/projet/commun.tsx', 'router.tsx'].includes(rel))
        continue;
      const n = occurrences(readFileSync(f, 'utf8'), /\bsansGarde\b/g);
      if (n > 0) trouve[rel] = n;
    }
    expect(trouve).toEqual(ATTENDU);
  });
});

describe('GDL-6 : garde par défaut', () => {
  it('`Dialog` déclare `sansGarde = false` et la soupape `modifie`', () => {
    const src = readFileSync(join(SRC, 'components/Dialog.tsx'), 'utf8');
    expect(src).toMatch(/sansGarde\s*=\s*false/);
    expect(src).toMatch(/modifie\?\s*:\s*boolean/);
  });
});

describe('GDL-7 : « Annuler » de FormulaireDialogue passe par le contrôle de Dialog', () => {
  it('le bouton n’appelle pas `onAnnuler` directement', () => {
    const src = readFileSync(join(SRC, 'screens/projet/commun.tsx'), 'utf8');
    const bouton = /<Button[^>]*>\s*Annuler\s*<\/Button>/.exec(src)?.[0] ?? '';
    expect(bouton).not.toBe('');
    expect(bouton).not.toMatch(/onClick=\{onAnnuler\}/);
  });
});
