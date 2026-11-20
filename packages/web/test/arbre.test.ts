import { describe, expect, it } from 'vitest';
import { aplatir, optionsProjetParent, racines, sousProjets } from '../src/projets/arbre.js';

/*
 * REX-2, R2-C (D-079) : fonctions pures de l'arborescence de l'écran Projets.
 * Profondeur : racine 0 ; sous-projet = profondeur du parent + 1 ;
 * élément = profondeur du projet + nombre de niveaux de son WBS (« 1 » → +1, « 1.1 » → +2).
 * `aplatir` ne lit que les projets visibles : un projet dont le parent n'est pas visible est une racine.
 */
interface P {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  peut_ecrire: boolean;
  est_modele: boolean;
}

const projet = (id: number, code: string, parent: number | null, extra: Partial<P> = {}): P => ({
  id,
  code,
  nom: `Nom ${code}`,
  parent_id: parent,
  peut_ecrire: true,
  est_modele: false,
  ...extra,
});

const codes = (l: { code: string }[]) => l.map((p) => p.code);

describe('Arbre des projets (D-079)', () => {
  it('ARB-1 : racines = sans parent ou parent invisible, triées par code sans tenir compte de la casse', () => {
    const visibles = [
      projet(1, 'b', null),
      projet(2, 'x', 1),
      projet(3, 'A', 99), // parent 99 non visible
      projet(4, 'c', null),
    ];
    expect(codes(racines(visibles))).toEqual(['A', 'b', 'c']);
    expect(codes(sousProjets(visibles, 1))).toEqual(['x']);
  });

  it('ARB-2 : trois niveaux de sous-projets, tous dépliés : ordre et profondeurs', () => {
    const visibles = [
      projet(3, 'C', 2),
      projet(1, 'A', null),
      projet(4, 'D', 3),
      projet(2, 'B', 1),
    ];
    const lignes = aplatir(visibles, new Set([1, 2, 3, 4]), new Map());
    expect(lignes.map((l) => [l.type === 'projet' ? l.projet.code : '?', l.profondeur])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 2],
      ['D', 3],
    ]);
  });

  it('ARB-3 : sous un projet déplié, éléments en ordre WBS puis sous-projets ; le repli masque tout', () => {
    const visibles = [projet(1, 'A', null), projet(2, 'B', 1)];
    const elements = new Map([
      [
        1,
        [
          { id: 10, type: 'activite', wbs: '1', nom: 'Parente' },
          { id: 11, type: 'activite', wbs: '1.1', nom: 'Fille' },
          { id: 12, type: 'jalon', wbs: '2', nom: 'Livraison' },
        ],
      ],
    ]);
    const lignes = aplatir(visibles, new Set([1]), elements);
    expect(
      lignes.map((l) =>
        l.type === 'projet' ? [l.projet.code, l.profondeur] : [l.element.nom, l.profondeur],
      ),
    ).toEqual([
      ['A', 0],
      ['Parente', 1],
      ['Fille', 2],
      ['Livraison', 1],
      ['B', 1],
    ]);

    // Replié : la seule ligne du projet.
    expect(aplatir(visibles, new Set(), elements)).toHaveLength(1);
    // Sous-projet déplié sous un parent replié : non visible.
    const replie = aplatir(visibles, new Set([2]), elements);
    expect(replie.map((l) => (l.type === 'projet' ? l.projet.code : '?'))).toEqual(['A']);
  });

  it('ARB-4 : options de « Projet parent » : ordinaires où l’on écrit, triées, sans le projet ni ses descendants', () => {
    const visibles = [
      projet(1, 'b-1', null),
      projet(2, 'A-2', null),
      projet(3, 'c-3', 1), // descendant de 1
      projet(4, 'd-4', 3), // descendant de 1 (deux niveaux)
      projet(5, 'e-5', null, { peut_ecrire: false }),
      projet(6, 'M-6', null, { est_modele: true }),
      projet(7, 'F-7', null),
    ];
    expect(optionsProjetParent(visibles)).toEqual([
      { value: '2', label: 'A-2 — Nom A-2' },
      { value: '1', label: 'b-1 — Nom b-1' },
      { value: '3', label: 'c-3 — Nom c-3' },
      { value: '4', label: 'd-4 — Nom d-4' },
      { value: '7', label: 'F-7 — Nom F-7' },
    ]);
    expect(optionsProjetParent(visibles, 1)).toEqual([
      { value: '2', label: 'A-2 — Nom A-2' },
      { value: '7', label: 'F-7 — Nom F-7' },
    ]);
  });
});
