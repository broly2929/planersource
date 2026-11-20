import { describe, expect, it } from 'vitest';
import { calculerPlage } from '../src/gantt/plage.js';
import { joursAccueil, lignesAccueil, projetsVisibles } from '../src/accueil/logique.js';

/*
 * G3 (D-080 points 2 et 6, D-081) : règles pures du dépliage de l'Accueil.
 * `lignesAccueil(projets, ouverts, elements)` : lignes visibles (D-079 (4), `aplatir` de arbre.ts) sur les
 * projets restants après le filtre D-081 (`projetsVisibles`). `joursAccueil(affiches, charges)` : jours de la
 * plage ; `charges` = éléments déjà chargés (cache), dont les dates planifiées et validées élargissent la plage.
 */
interface P {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  peut_ecrire: boolean;
  est_modele: boolean;
  clos: boolean;
  date_debut: string;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}
interface E {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
  drapeaux: string[];
  debut_valide?: string | null;
  debut_planifie?: string | null;
  fin_planifiee?: string | null;
}

const projet = (id: number, code: string, parent: number | null, extra: Partial<P> = {}): P => ({
  id,
  code,
  nom: `Nom ${code}`,
  parent_id: parent,
  peut_ecrire: true,
  est_modele: false,
  clos: false,
  date_debut: '2027-01-04',
  debut_planifie: null,
  fin_planifiee: null,
  ...extra,
});

const element = (id: number, wbs: string, extra: Partial<E> = {}): E => ({
  id,
  type: 'activite',
  parent_id: null,
  rang: id,
  wbs,
  nom: `Élément ${wbs}`,
  drapeaux: [],
  ...extra,
});

/** « p:CODE:profondeur » ou « e:WBS:profondeur ». */
const forme = (l: ReturnType<typeof lignesAccueil>) =>
  l.map((x) =>
    x.type === 'projet'
      ? `p:${x.projet.code}:${x.profondeur}`
      : `e:${x.element.wbs}:${x.profondeur}`,
  );

describe('lignesAccueil (D-080 2, D-081)', () => {
  it('ACC-9 : projet déplié : ses éléments en ordre WBS, puis ses sous-projets non clos triés par code sans casse', () => {
    const tous = [
      projet(1, 'A', null),
      projet(2, 'S-b', 1),
      projet(3, 'S-CLOS', 1, { clos: true }),
      projet(4, 'S-A', 1),
      projet(5, 'B', null),
    ];
    const elements = new Map<number, E[]>([
      [1, [element(10, '1'), element(11, '1.1'), element(12, '2')]],
    ]);
    expect(forme(lignesAccueil(tous, new Set([1]), elements))).toEqual([
      'p:A:0',
      'e:1:1',
      'e:1.1:2',
      'e:2:1',
      'p:S-A:1',
      'p:S-b:1',
      'p:B:0',
    ]);
  });

  it('ACC-10 : tout replié : les racines seules, même avec des éléments en cache ; sous-projet déplié sous un parent replié : absent ; descendance d’un projet clos et éléments d’un projet clos : absents', () => {
    const tous = [
      projet(1, 'A', null),
      projet(2, 'S', 1),
      projet(3, 'SS', 2),
      projet(4, 'CLOS', null, { clos: true }),
      projet(5, 'F', 4),
    ];
    const elements = new Map<number, E[]>([
      [1, [element(10, '1')]],
      [2, [element(20, '1')]],
      [4, [element(40, '1')]],
    ]);
    expect(forme(lignesAccueil(tous, new Set(), elements))).toEqual(['p:A:0']);
    expect(forme(lignesAccueil(tous, new Set([2]), elements))).toEqual(['p:A:0']);
    expect(forme(lignesAccueil(tous, new Set([1, 2, 3, 4, 5]), elements))).toEqual([
      'p:A:0',
      'e:1:1',
      'p:S:1',
      'e:1:2',
      'p:SS:2',
    ]);
  });
});

describe('plage de l’Accueil dépliée (D-080 6)', () => {
  const a = projet(1, 'A', null, {
    date_debut: '2027-01-04',
    debut_planifie: '2027-01-06',
    fin_planifiee: '2027-02-03',
  });
  const b = projet(2, 'B', null, { date_debut: '2027-01-11' });

  it('ACC-11 : un élément chargé dont le début validé est antérieur élargit la plage à gauche', () => {
    const charges = new Map<number, E[]>([[1, [element(10, '1', { debut_valide: '2026-12-16' })]]]);
    expect(calculerPlage(joursAccueil([a, b], charges))).toEqual({
      debut: '2026-12-14',
      fin: '2027-02-21',
    });
    // Sans élément chargé : plage de l'Accueil replié (ACC-8).
    expect(calculerPlage(joursAccueil([a, b], new Map()))).toEqual({
      debut: '2027-01-04',
      fin: '2027-02-21',
    });
  });

  it('ACC-12 : la plage ne dépend que des projets visibles et du cache, jamais des projets dépliés : un repli ne la réduit pas', () => {
    const tous = [
      a,
      b,
      projet(3, 'S', 1, { debut_planifie: '2027-01-11', fin_planifiee: '2027-03-10' }),
      projet(4, 'CLOS', null, { clos: true, fin_planifiee: '2028-01-05' }),
    ];
    const charges = new Map<number, E[]>([
      [1, [element(10, '1', { debut_planifie: '2027-01-06', fin_planifiee: '2027-03-31' })]],
    ]);
    const visibles = projetsVisibles(tous);
    expect(visibles.map((p) => p.code)).toEqual(['A', 'B', 'S']);
    // Le plus grand jour est la fin planifiée de l'élément, 2027-03-31 (mercredi) : dimanche 04-04, + 14 = 04-18.
    const plage = calculerPlage(joursAccueil(visibles, charges));
    expect(plage).toEqual({ debut: '2027-01-04', fin: '2027-04-18' });
    // Même plage tout replié : `joursAccueil` ne reçoit aucune information de dépliage.
    expect(joursAccueil.length).toBe(2);
    expect(forme(lignesAccueil(tous, new Set(), new Map()))).toEqual(['p:A:0', 'p:B:0']);
  });
});
