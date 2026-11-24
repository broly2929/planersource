// Pré-contrôle de la suite complète (D-198 (1)) : tests structurels rapides, lancés avant la ligne
// `debut` du journal. Un échec arrête tout : aucune ligne au journal, la suite n'est pas consommée.
import { join } from 'node:path';

/** Fichier → identifiants des tests structurels qu'il porte. */
export const PRE_CONTROLE = [
  { fichier: 'scripts/test/tests-cibles.test.ts', ids: ['TC-5', 'TC-6', 'TC-12', 'TC-13'] },
  { fichier: 'scripts/test/garde-base-test.test.ts', ids: ['GBT-9'] },
  { fichier: 'scripts/test/suite-complete.test.ts', ids: ['SUI-8'] },
  { fichier: 'scripts/test/prettier-md.test.ts', ids: ['PRT-1'] },
  { fichier: 'scripts/test/aucune-reference-externe.test.ts', ids: ['PUB-1', 'PUB-2'] },
  { fichier: 'scripts/test/ci.test.ts', ids: ['CI-1'] },
  {
    fichier: 'packages/web/test/garde-dialogue-structure.test.ts',
    ids: ['GDL-5', 'GDL-6', 'GDL-7'],
  },
  // D-198 (4) : aucune adresse de pile codée en dur sous e2e/ (D-199 (12)).
  { fichier: 'scripts/test/adresses-e2e.test.ts', ids: ['E2P-9'] },
];

/** Motif de `vitest -t` : un identifiant de la liste, ni précédé d'un caractère de mot, ni suivi d'un chiffre. */
export function motifPreControle() {
  const ids = PRE_CONTROLE.flatMap((e) => e.ids);
  return `(?<![A-Za-z0-9-])(?:${ids.join('|')})(?![0-9])`;
}

/** Commandes du pré-contrôle, dans l'ordre. */
export function commandesPreControle(racine) {
  return [
    {
      commande: 'npx',
      args: ['vitest', 'run', ...PRE_CONTROLE.map((e) => e.fichier), '-t', motifPreControle()],
      cwd: racine,
    },
    { commande: 'npx', args: ['playwright', 'test', '--list'], cwd: join(racine, 'e2e') },
  ];
}
