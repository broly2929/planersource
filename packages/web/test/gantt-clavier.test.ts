import { describe, expect, it } from 'vitest';
import { barresParcourables, barreSuivante } from '../src/gantt/clavier.js';
import type { ElementGantt, LigneGantt } from '../src/gantt/GanttSvg.js';

/*
 * Lot 3d-3b (D-098), contrat proposé (à relire) :
 *   gantt/clavier.ts : barresParcourables(lignes) → identifiants des éléments (activités feuilles,
 *                      parents, jalons) ayant des dates planifiées, dans l'ordre des lignes ;
 *                      les sous-projets et les lignes sans dates sont sautés
 *                      barreSuivante(parcourables, active, touche) → identifiant | null
 *                      touche : 'haut' | 'bas' ; active : identifiant | null
 */

const element = (
  champs: Partial<ElementGantt> & Pick<ElementGantt, 'id' | 'type'>,
): LigneGantt => ({
  genre: 'element',
  element: {
    parent_id: null,
    rang: 0,
    wbs: '1',
    nom: `Élément ${champs.id}`,
    drapeaux: [],
    ...champs,
  },
});

describe('Barres parcourables (GEO-18)', () => {
  it('GEO-18 : activités, jalons et parents avec dates, dans l’ordre des lignes', () => {
    const lignes: LigneGantt[] = [
      element({
        id: 1,
        type: 'activite',
        debut_planifie: '2027-01-11',
        fin_planifiee: '2027-01-15',
      }),
      element({ id: 2, type: 'activite', debut_planifie: null, fin_planifiee: null }),
      element({ id: 3, type: 'jalon', date_planifiee: '2027-01-12' }),
      element({
        id: 4,
        type: 'activite',
        est_parent: true,
        debut_planifie: '2027-01-11',
        fin_planifiee: '2027-01-14',
      }),
      {
        genre: 'sous-projet',
        sousProjet: {
          id: 5,
          code: 'S',
          nom: 'Sous-projet',
          debut_planifie: '2027-01-11',
          fin_planifiee: '2027-01-15',
          clos: false,
        },
      },
    ];
    expect(barresParcourables(lignes)).toEqual([1, 3, 4]);
  });
});

describe('Barre suivante (GEO-19)', () => {
  const liste = [10, 20, 30];

  it('GEO-19 : ↓ et ↑ sans bouclage', () => {
    expect(barreSuivante(liste, null, 'bas')).toBe(10);
    expect(barreSuivante(liste, null, 'haut')).toBe(30);
    expect(barreSuivante(liste, 10, 'bas')).toBe(20);
    expect(barreSuivante(liste, 20, 'haut')).toBe(10);
    expect(barreSuivante(liste, 30, 'bas')).toBe(30);
    expect(barreSuivante(liste, 10, 'haut')).toBe(10);
    expect(barreSuivante(liste, 99, 'bas')).toBe(10);
    expect(barreSuivante([], null, 'bas')).toBeNull();
    expect(barreSuivante([], 10, 'haut')).toBeNull();
  });
});
