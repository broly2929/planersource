import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import { activite, ALICE, BOB, entree, J, projet, projetSortie, tache } from './helpers.js';

describe('projets partiels (SPEC §5.8, D-044)', () => {
  it('AGR-4 : projet dont le parent est absent de l’entrée : aucune exception, dates et charges agrégées ; sous-projet agrégé dans son parent', () => {
    const s = calculer(
      entree({
        projets: [projet(10, { parentId: 99 }), projet(11)],
        taches: [tache(1, ALICE, 1, { projetId: 10 }), tache(2, ALICE, 1, { projetId: 11 })],
      }),
    );
    expect(activite(s, 1)).toMatchObject({ debut: J(4), fin: J(4) });
    expect(activite(s, 2)).toMatchObject({ debut: J(5), fin: J(5) });
    expect(projetSortie(s, 10)).toMatchObject({ debut: J(4), fin: J(4), charge: 100 });
    expect(projetSortie(s, 11)).toMatchObject({ debut: J(5), fin: J(5), charge: 100 });

    const t = calculer(
      entree({
        projets: [projet(10, { parentId: 99 }), projet(12, { parentId: 10 })],
        taches: [tache(1, ALICE, 1, { projetId: 10 }), tache(3, BOB, 2, { projetId: 12 })],
      }),
    );
    expect(projetSortie(t, 12)).toMatchObject({ charge: 200 });
    expect(projetSortie(t, 10)).toMatchObject({ charge: 300 });
  });
});
