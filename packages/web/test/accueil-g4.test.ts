import { describe, expect, it } from 'vitest';
import { nomsElementsCharges } from '../src/accueil/logique.js';
import { casesInitiales, messageRefus, type ProjetCalcul } from '../src/calcul/logique.js';

/*
 * G4 (D-080 point 8) : résolution des noms d'un refus parmi les éléments chargés sur l'Accueil, et projets
 * cochés par défaut du dialogue « Calculer le planning ».
 */
const element = (id: number, nom: string) => ({
  id,
  type: 'activite' as const,
  parent_id: null,
  rang: id,
  wbs: String(id),
  nom,
  drapeaux: [],
});

const projet = (id: number, code: string, extra: Partial<ProjetCalcul> = {}): ProjetCalcul => ({
  id,
  code,
  nom: `Nom ${code}`,
  parent_id: null,
  est_modele: false,
  clos: false,
  peut_ecrire: true,
  ...extra,
});

describe('ACC-13 noms des éléments chargés', () => {
  const charges = new Map([
    [1, [element(11, 'Alpha'), element(12, 'Beta')]],
    [2, [element(21, 'Gamma')]],
  ]);

  it('tous projets chargés confondus', () => {
    expect(nomsElementsCharges(charges)).toEqual(
      new Map([
        [11, 'Alpha'],
        [12, 'Beta'],
        [21, 'Gamma'],
      ]),
    );
  });

  it('cycle : noms résolus, « élément <id> » sinon', () => {
    expect(
      messageRefus(
        { status: 422, code: 'cycle_dependances', ids: [11, 21, 999] },
        nomsElementsCharges(charges),
      ),
    ).toBe('Calcul impossible : cycle de dépendances entre Alpha, Gamma, élément 999.');
  });

  it('données incomplètes : noms résolus, « élément <id> » sinon', () => {
    expect(
      messageRefus(
        { status: 422, code: 'entree_invalide', ids: [12, 888] },
        nomsElementsCharges(charges),
      ),
    ).toBe('Calcul impossible : données incomplètes sur Beta, élément 888.');
  });

  it('aucun élément chargé', () => {
    expect(
      messageRefus(
        { status: 422, code: 'cycle_dependances', ids: [11] },
        nomsElementsCharges(new Map()),
      ),
    ).toBe('Calcul impossible : cycle de dépendances entre élément 11.');
  });
});

describe('ACC-14 projets cochés par défaut', () => {
  const projets = [
    projet(1, 'A'),
    projet(2, 'B'),
    projet(3, 'S', { parent_id: 1 }),
    projet(4, 'M', { est_modele: true }),
    projet(5, 'C', { clos: true }),
  ];

  it("'tous' : tous les projets proposés", () => {
    expect(casesInitiales(projets, 'tous')).toEqual(new Set([1, 2]));
  });

  it('précoché : sa racine', () => {
    expect(casesInitiales(projets, [3])).toEqual(new Set([1]));
  });

  it('aucun précoché : vide', () => {
    expect(casesInitiales(projets, [])).toEqual(new Set());
  });

  it("'tous' sans projet proposé : vide", () => {
    expect(casesInitiales([projet(4, 'M', { est_modele: true })], 'tous')).toEqual(new Set());
  });
});
