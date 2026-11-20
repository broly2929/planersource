import { describe, expect, it } from 'vitest';
import {
  casesInitiales,
  lignesAvertissements,
  libelleProjet,
  messageRefus,
  projetsListes,
  racineDe,
  type ProjetCalcul,
} from '../src/calcul/logique.js';

/*
 * Lot 3c-E (D-074 5, 7, 8 ; D-075 3, 5) : logique pure du dialogue « Calculer le planning ».
 *   projetsListes(projets) → racines où l'on écrit, hors modèles et clos, triées par code
 *   racineDe(projets, id) → identifiant de la racine (remontée par parent_id)
 *   libelleProjet(projet) → « <code> — <nom> »
 *   messageRefus({ status, code?, ids? }, noms) → texte du refus
 *   lignesAvertissements(avertissements, noms) → une ligne par avertissement reste_non_pose
 */
const p = (id: number, code: string, parent_id: number | null, extra: Partial<ProjetCalcul> = {}) =>
  ({
    id,
    code,
    nom: `Nom ${code}`,
    parent_id,
    est_modele: false,
    clos: false,
    peut_ecrire: true,
    ...extra,
  }) satisfies ProjetCalcul;

describe('Dialogue Calculer : logique pure (lot 3c-E)', () => {
  it('CLC-1 : projets listés = racines inscriptibles, ni modèle ni clos, triées par code', () => {
    const projets = [
      p(1, 'C-3', null),
      p(2, 'A-1', null),
      p(3, 'S-1', 1),
      p(4, 'M-1', null, { est_modele: true }),
      p(5, 'X-9', null, { clos: true }),
      p(6, 'L-2', null, { peut_ecrire: false }),
      p(7, 'B-2', null),
    ];
    expect(projetsListes(projets).map((x) => x.code)).toEqual(['A-1', 'B-2', 'C-3']);
  });

  it('CLC-2 : racine d’un projet, d’un sous-projet, d’un sous-sous-projet ; parent hors liste : dernier connu', () => {
    const projets = [p(1, 'R', null), p(2, 'S', 1), p(3, 'T', 2), p(4, 'O', 99)];
    expect(racineDe(projets, 1)).toBe(1);
    expect(racineDe(projets, 2)).toBe(1);
    expect(racineDe(projets, 3)).toBe(1);
    expect(racineDe(projets, 4)).toBe(4);
  });

  it('CLC-3 : libellé « <code> — <nom> »', () => {
    expect(libelleProjet(p(1, 'C-3', null, { nom: 'Racine C' }))).toBe('C-3 — Racine C');
  });

  it('CLC-4 : textes des refus (cycle, données incomplètes, 409, autre) ; identifiant inconnu : « élément <id> »', () => {
    const noms = new Map([
      [1, 'A'],
      [2, 'B'],
    ]);
    expect(messageRefus({ status: 422, code: 'cycle_dependances', ids: [1, 2] }, noms)).toBe(
      'Calcul impossible : cycle de dépendances entre A, B.',
    );
    expect(messageRefus({ status: 422, code: 'entree_invalide', ids: [1, 999] }, noms)).toBe(
      'Calcul impossible : données incomplètes sur A, élément 999.',
    );
    expect(messageRefus({ status: 409 }, noms)).toBe(
      'Un calcul est déjà en cours. Réessayez dans un instant.',
    );
    const autre = 'Calcul impossible pour le moment. Réessayez.';
    expect(messageRefus({ status: 500 }, noms)).toBe(autre);
    expect(messageRefus({ status: 422, code: 'mode_non_calcule', ids: [1] }, noms)).toBe(autre);
    expect(messageRefus({ status: 0 }, noms)).toBe(autre);
  });

  it('CLC-5 : lignes d’avertissement, virgule décimale ; assignation introuvable : « assignation <id> » ; autres codes ignorés', () => {
    const noms = new Map([
      [10, { activite: 'Act A', ressource: 'Alice' }],
      [11, { activite: 'Act B', ressource: 'Bob' }],
    ]);
    expect(
      lignesAvertissements(
        [
          { code: 'reste_non_pose', assignation_id: 10, reste: 1.5 },
          { code: 'reste_non_pose', assignation_id: 11, reste: 0.25 },
          { code: 'reste_non_pose', assignation_id: 12, reste: 3 },
          { code: 'autre_code', assignation_id: 10, reste: 9 },
        ],
        noms,
      ),
    ).toEqual([
      'Act A — Alice : 1,5 j non posé',
      'Act B — Bob : 0,25 j non posé',
      'assignation 12 : 3 j non posé',
    ]);
  });
});

/*
 * Lot 3g (D-114 (8)) : règle « racine d'écriture ». Projets proposés = peut_ecrire, ni modèle ni clos,
 * dont le parent est absent de la liste, en lecture seule ou clos ; `racineDe` remonte tant que le
 * parent est connu, peut_ecrire, ni modèle ni clos. `casesInitiales(projets, precoches | 'tous')`
 * en découle. Mêmes signatures qu'au lot 3c-E.
 */
const codes = (projets: ProjetCalcul[]) => projetsListes(projets).map((x) => x.code);

describe('Dialogue Calculer : racine d’écriture (lot 3g)', () => {
  it('CLC-6 : sous-projet inscriptible sous une racine en lecture seule : proposé ; sa racine d’écriture est lui-même', () => {
    const projets = [p(1, 'R', null, { peut_ecrire: false }), p(2, 'S', 1)];
    expect(codes(projets)).toEqual(['S']);
    expect(racineDe(projets, 2)).toBe(2);
  });

  it('CLC-7 : parent absent de la liste des projets : proposé ; sa racine d’écriture est lui-même', () => {
    const projets = [p(2, 'S', 99)];
    expect(codes(projets)).toEqual(['S']);
    expect(racineDe(projets, 2)).toBe(2);
  });

  it('CLC-8 : racine close : le sous-projet ouvert est proposé, la racine close non', () => {
    const projets = [p(1, 'R', null, { clos: true }), p(2, 'S', 1)];
    expect(codes(projets)).toEqual(['S']);
    expect(racineDe(projets, 2)).toBe(2);
  });

  it('CLC-9 : sous-sous-projet : la racine d’écriture est le plus haut ancêtre inscriptible, ouvert, non modèle, sans interruption', () => {
    // R (écriture) → S (lecture seule) → T (écriture) : R et T proposés
    const coupe = [p(1, 'R', null), p(2, 'S', 1, { peut_ecrire: false }), p(3, 'T', 2)];
    expect(codes(coupe)).toEqual(['R', 'T']);
    expect(racineDe(coupe, 3)).toBe(3);
    // R → S → T tous inscriptibles : R seul
    const chaine = [p(1, 'R', null), p(2, 'S', 1), p(3, 'T', 2)];
    expect(codes(chaine)).toEqual(['R']);
    expect(racineDe(chaine, 3)).toBe(1);
    // R (lecture seule) → S → T inscriptibles : S seul
    const haut = [p(1, 'R', null, { peut_ecrire: false }), p(2, 'S', 1), p(3, 'T', 2)];
    expect(codes(haut)).toEqual(['S']);
    expect(racineDe(haut, 3)).toBe(2);
  });

  it('CLC-10 : parent modèle : jamais proposé, le sous-projet l’est ; cases initiales selon la racine d’écriture', () => {
    const sousModele = [p(1, 'M', null, { est_modele: true }), p(2, 'S', 1)];
    expect(codes(sousModele)).toEqual(['S']);
    expect(racineDe(sousModele, 2)).toBe(2);

    const lectureSeule = [p(1, 'R', null, { peut_ecrire: false }), p(2, 'S', 1)];
    expect(casesInitiales(lectureSeule, [2])).toEqual(new Set([2]));
    expect(casesInitiales(lectureSeule, 'tous')).toEqual(new Set([2]));

    const ecriture = [p(1, 'R', null), p(2, 'S', 1)];
    expect(casesInitiales(ecriture, [2])).toEqual(new Set([1]));
  });
});
