// REX-3b (D-127 (3) à (5)) : pile d'annulation des gestes du Gantt et requêtes inverses. ANL-1 à ANL-7.
import { describe, expect, it } from 'vitest';
import {
  TAILLE_PILE,
  depiler,
  empiler,
  inverseBarre,
  inverseLienCree,
  inverseLienSupprime,
  inverseLigne,
  renumeroterLien,
  requeteInverse,
  sansContours,
  vider,
  type Inverse,
} from '../src/gantt/annulation.js';

const ligne = (id: number): Inverse => inverseLigne({ id, parent_id: null, rang: id });

describe('Pile d’annulation (REX-3b)', () => {
  it('ANL-1 : vider, empiler sans modifier la pile reçue, dépiler le dernier', () => {
    const vide = vider();
    expect(vide).toEqual([]);
    const un = empiler(vide, ligne(1));
    expect(vide).toEqual([]);
    const deux = empiler(un, ligne(2));
    expect(un).toEqual([ligne(1)]);
    expect(deux).toEqual([ligne(1), ligne(2)]);

    const d = depiler(deux);
    expect(d.inverse).toEqual(ligne(2));
    expect(d.pile).toEqual([ligne(1)]);
    expect(deux).toEqual([ligne(1), ligne(2)]);
    const d2 = depiler(d.pile);
    expect(d2.inverse).toEqual(ligne(1));
    expect(d2.pile).toEqual([]);
    expect(depiler([])).toEqual({ inverse: null, pile: [] });
  });

  it('ANL-2 : 20 gestes au plus, le 21e chasse le plus ancien', () => {
    expect(TAILLE_PILE).toBe(20);
    let pile = vider();
    for (let i = 1; i <= 21; i++) pile = empiler(pile, ligne(i));
    expect(pile).toHaveLength(20);
    expect(pile[0]).toEqual(ligne(2));
    expect(pile[19]).toEqual(ligne(21));
    const vus: Inverse[] = [];
    for (let i = 0; i < 20; i++) {
      const d = depiler(pile);
      vus.push(d.inverse!);
      pile = d.pile;
    }
    expect(vus).toEqual(Array.from({ length: 20 }, (_, i) => ligne(21 - i)));
    expect(pile).toEqual([]);
  });
});

describe('Requêtes inverses (REX-3b)', () => {
  it('ANL-3 : barre, PATCH avec les mêmes clés et les valeurs d’avant, null compris', () => {
    const avant = {
      id: 5,
      debut_valide: '2027-01-11',
      fin_valide: '2027-01-29',
      duree_validee: 5,
    };
    // START, corps.
    expect(requeteInverse(inverseBarre(avant, { debut_valide: '2027-01-14' }))).toEqual({
      methode: 'PATCH',
      chemin: '/api/activites/5',
      corps: { debut_valide: '2027-01-11' },
    });
    // ALAP, poignée droite.
    expect(requeteInverse(inverseBarre(avant, { fin_valide: '2027-02-02' }))).toEqual({
      methode: 'PATCH',
      chemin: '/api/activites/5',
      corps: { fin_valide: '2027-01-29' },
    });
    // FDUR, poignée droite.
    expect(requeteInverse(inverseBarre(avant, { duree_validee: 7 }))).toEqual({
      methode: 'PATCH',
      chemin: '/api/activites/5',
      corps: { duree_validee: 5 },
    });
    // REGUL, corps.
    expect(
      requeteInverse(inverseBarre(avant, { debut_valide: '2027-01-13', fin_valide: '2027-01-31' })),
    ).toEqual({
      methode: 'PATCH',
      chemin: '/api/activites/5',
      corps: { debut_valide: '2027-01-11', fin_valide: '2027-01-29' },
    });
    // Valeurs d'avant nulles ou absentes : null.
    expect(
      requeteInverse(inverseBarre({ id: 6, debut_valide: null }, { debut_valide: '2027-01-12' })),
    ).toEqual({ methode: 'PATCH', chemin: '/api/activites/6', corps: { debut_valide: null } });
    expect(requeteInverse(inverseBarre({ id: 6 }, { duree_validee: 3 }))).toEqual({
      methode: 'PATCH',
      chemin: '/api/activites/6',
      corps: { duree_validee: null },
    });
  });

  it('ANL-8 : l’entrée d’une barre mémorise le contour d’avant le geste, sans l’envoyer', () => {
    const avant = { id: 5, debut_valide: '2027-01-11' };
    const geste = { debut_valide: '2027-01-14' };
    const contour = { debut: '2027-01-12', fin: '2027-01-18' };
    const avecContour = inverseBarre(avant, geste, contour);
    const sansContour = inverseBarre(avant, geste, null);
    expect(avecContour).toMatchObject({ contour });
    expect(sansContour).toMatchObject({ contour: null });
    expect(requeteInverse(avecContour)).toEqual(requeteInverse(sansContour));
    expect(depiler(empiler(vider(), avecContour)).inverse).toMatchObject({ contour });
    expect(inverseLienCree(1)).not.toHaveProperty('contour');
    expect(ligne(1)).not.toHaveProperty('contour');
  });

  it('ANL-9 : sansContours met à null le contour des entrées « barre », sans toucher le reste ni la pile reçue', () => {
    const contour = { debut: '2027-01-12', fin: '2027-01-18' };
    const barre = inverseBarre(
      { id: 5, debut_valide: '2027-01-11' },
      { debut_valide: '2027-01-14' },
      contour,
    );
    const pile = empiler(empiler(empiler(vider(), ligne(1)), barre), inverseLienCree(9));
    const resultat = sansContours(pile);
    expect(resultat).toEqual([ligne(1), { ...barre, contour: null }, inverseLienCree(9)]);
    expect(pile[1]).toMatchObject({ contour });
  });

  it('ANL-4 : lien créé → DELETE de la dépendance, sans corps', () => {
    expect(requeteInverse(inverseLienCree(12))).toEqual({
      methode: 'DELETE',
      chemin: '/api/dependances/12',
    });
  });

  it('ANL-5 : lien supprimé → POST avec le même type et le même décalage, sans id ni drapeaux', () => {
    const d = {
      id: 12,
      predecesseur_id: 3,
      successeur_id: 4,
      type: 'DD' as const,
      delai: 2,
      drapeaux: ['dependance_non_respectee'],
    };
    expect(requeteInverse(inverseLienSupprime(7, d))).toEqual({
      methode: 'POST',
      chemin: '/api/projets/7/dependances',
      corps: { predecesseur_id: 3, successeur_id: 4, type: 'DD', delai: 2 },
    });
  });

  it('ANL-6 : ligne → POST …/deplacer avec le parent et le rang d’avant', () => {
    expect(requeteInverse(inverseLigne({ id: 9, parent_id: 4, rang: 2 }))).toEqual({
      methode: 'POST',
      chemin: '/api/elements/9/deplacer',
      corps: { parent_id: 4, rang: 2 },
    });
    expect(requeteInverse(inverseLigne({ id: 9, parent_id: null, rang: 3 }))).toEqual({
      methode: 'POST',
      chemin: '/api/elements/9/deplacer',
      corps: { parent_id: null, rang: 3 },
    });
  });

  it('ANL-7 : lien recréé, le nouvel id remplace l’ancien dans les inverses de la pile', () => {
    const pile = [inverseLienCree(12), ligne(1), inverseLienCree(13)];
    const r = renumeroterLien(pile, 12, 30);
    expect(r.map(requeteInverse)).toEqual([
      { methode: 'DELETE', chemin: '/api/dependances/30' },
      requeteInverse(ligne(1)),
      { methode: 'DELETE', chemin: '/api/dependances/13' },
    ]);
    expect(pile[0]).toEqual(inverseLienCree(12));
  });
});
