import { describe, expect, it } from 'vitest';
import { calculer, ErreurMoteur } from '../src/index.js';
import type { Entree } from '../src/index.js';
import {
  act,
  ALICE,
  ass,
  BOB,
  dep,
  entree,
  erreur,
  geler,
  J,
  jal,
  LUN_VEN,
  tache,
} from './helpers.js';

describe('erreurs et robustesse', () => {
  it('ERR-1 : cycle A→B→C→A : cycle_dependances, ids [A, B, C]', () => {
    const e = erreur(
      entree({
        taches: [tache(1, ALICE, 1), tache(2, ALICE, 1), tache(3, ALICE, 1)],
        dependances: [dep(1, 2), dep(2, 3), dep(3, 1)],
      }),
    );
    expect(e).toBeInstanceOf(ErreurMoteur);
    expect(e.code).toBe('cycle_dependances');
    expect(e.ids).toEqual([1, 2, 3]);
  });

  it('ERR-2-r4 : aucun mode ne donne mode_non_calcule ; une feuille de chacun des huit modes calcule sans erreur', () => {
    expect(() =>
      calculer(
        entree({
          taches: [
            tache(1, ALICE, 1),
            tache(2, ALICE, 1, { mode: 'START', debutValide: J(6) }),
            tache(3, ALICE, 1, { mode: 'STARR', debutValide: J(6) }),
            tache(4, ALICE, 1, { mode: 'ALAP', finValide: J(15) }),
            tache(5, ALICE, 1, { mode: 'FDUR', dureeValidee: 2 }),
            tache(6, ALICE, 1, { mode: 'DDUR', dureeValidee: 2 }),
            tache(7, ALICE, 1, { mode: 'REGUL', debutValide: J(4), finValide: J(15) }),
            tache(8, ALICE, 1, { mode: 'MAN' }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('ERR-8 : FDUR ou DDUR, feuille ouverte, dureeValidee 0 ou 1,5 : entree_invalide, ids triés ; activité close et parent non contrôlés', () => {
    const e = erreur(
      entree({
        elements: [act(5, { mode: 'FDUR', dureeValidee: 0 })],
        taches: [
          tache(3, ALICE, 1, { mode: 'FDUR', dureeValidee: 0 }),
          tache(1, ALICE, 1, { mode: 'DDUR', dureeValidee: 1.5 }),
          tache(4, ALICE, 1, { mode: 'FDUR', dureeValidee: 0, close: true }),
          tache(6, ALICE, 1, { parentId: 5 }),
        ],
      }),
    );
    expect(e.code).toBe('entree_invalide');
    expect(e.ids).toEqual([1, 3]);
  });

  it('ERR-3 : Alice 10 j, horizon 11/01 : posé 04, 05, 06, 07, 08 et 11/01 ; avertissement reste_non_pose, assignationId, reste 400', () => {
    const s = calculer(entree({ horizon: J(11), taches: [tache(1, ALICE, 10)] }));
    expect(s.travail.map((t) => [t.jour, t.charge])).toEqual(
      [4, 5, 6, 7, 8, 11].map((d) => [J(d), 100]),
    );
    expect(s.avertissements).toEqual([{ code: 'reste_non_pose', assignationId: 1, reste: 400 }]);
  });

  it('ERR-4 : entrée gelée en profondeur : deux appels identiques, sorties égales, entrée non modifiée, aucune exception', () => {
    const e = entree({
      taches: [tache(1, ALICE, 3), tache(2, BOB, 2)],
      elements: [jal(3)],
      dependances: [dep(1, 2), dep(2, 3)],
    });
    const copie = structuredClone(e);
    geler(e);
    const s1 = calculer(e);
    const s2 = calculer(e);
    expect(s2).toEqual(s1);
    expect(e).toEqual(copie);
  });

  it('ERR-5 : parent P avec enfant c ; P → S en FD, S → c en FD : cycle_dependances, ids [c, S, P] triés', () => {
    const e = erreur(
      entree({
        elements: [act(3, { rang: 1 })],
        taches: [tache(1, ALICE, 1, { parentId: 3, rang: 1 }), tache(2, ALICE, 1, { rang: 2 })],
        dependances: [dep(3, 2), dep(2, 1)],
      }),
    );
    expect(e.code).toBe('cycle_dependances');
    expect(e.ids).toEqual([1, 2, 3]);
  });

  const invalides: [string, Entree, number[]][] = [
    [
      'dépendance vers un id inconnu',
      entree({ taches: [tache(1, ALICE, 1)], dependances: [dep(1, 99)] }),
      [99],
    ],
    ['jalon fixe sans dateValidee', entree({ elements: [jal(5, { nature: 'fixe' })] }), [5]],
    [
      'saisies non vides',
      entree({
        taches: [tache(1, ALICE, 1)],
        saisies: [{ assignationId: 1, jour: J(4), demiJournee: 'matin', charge: 50 }],
      }),
      [1],
    ],
    [
      'assignation vers une activité inconnue',
      entree({ assignations: [ass(7, 99, ALICE, 1)] }),
      [7],
    ],
    [
      'calendrier sans jour travaillé',
      entree({ calendriers: [LUN_VEN, { id: 4, joursTravailles: [], feries: [] }] }),
      [4],
    ],
  ];

  it.each(invalides)('ERR-6 : %s : entree_invalide', (_nom, e, ids) => {
    const err = erreur(e);
    expect(err.code).toBe('entree_invalide');
    expect(err.ids).toEqual(ids);
  });

  it('ERR-7 : START ou STARR sans debutValide : entree_invalide avec l’id', () => {
    const start = erreur(entree({ taches: [tache(1, ALICE, 1, { mode: 'START' })] }));
    expect(start.code).toBe('entree_invalide');
    expect(start.ids).toEqual([1]);
    const starr = erreur(
      entree({
        taches: [tache(2, ALICE, 1, { mode: 'STARR' }), tache(3, ALICE, 1, { mode: 'START' })],
      }),
    );
    expect(starr.code).toBe('entree_invalide');
    expect(starr.ids).toEqual([2, 3]);
  });

  it('ERR-4b : entrée gelée avec START, STARR et ALAP : aucune mutation, sorties égales', () => {
    const e = entree({
      taches: [
        tache(1, ALICE, 2, { mode: 'START', debutValide: J(6) }),
        tache(2, ALICE, 2, { mode: 'STARR', debutValide: J(6) }),
        tache(3, ALICE, 3, { mode: 'ALAP', finValide: J(15) }),
      ],
    });
    const copie = structuredClone(e);
    geler(e);
    const s1 = calculer(e);
    const s2 = calculer(e);
    expect(s2).toEqual(s1);
    expect(e).toEqual(copie);
  });

  it('ERR-9 : REGUL feuille ouverte sans début, sans fin ou fin antérieure au début : entree_invalide, ids triés ; activité close et parent non contrôlés', () => {
    const e = erreur(
      entree({
        elements: [act(5, { mode: 'REGUL' })],
        taches: [
          tache(3, ALICE, 1, { mode: 'REGUL', debutValide: J(8), finValide: J(4) }),
          tache(2, ALICE, 1, { mode: 'REGUL', debutValide: J(4) }),
          tache(1, ALICE, 1, { mode: 'REGUL', finValide: J(8) }),
          tache(4, ALICE, 1, { mode: 'REGUL', close: true }),
          tache(6, ALICE, 1, { parentId: 5 }),
        ],
      }),
    );
    expect(e.code).toBe('entree_invalide');
    expect(e.ids).toEqual([1, 2, 3]);
    expect(() =>
      calculer(
        entree({
          elements: [act(5, { mode: 'REGUL' })],
          taches: [
            tache(4, ALICE, 1, { mode: 'REGUL', close: true }),
            tache(6, ALICE, 1, { parentId: 5 }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('ERR-4c : entrée gelée avec des REGUL : aucune mutation, sorties égales', () => {
    const e = entree({
      taches: [
        tache(1, ALICE, 3, { mode: 'REGUL', debutValide: J(4), finValide: J(15) }),
        tache(2, BOB, 2),
        tache(3, ALICE, 2, { mode: 'REGUL', debutValide: J(4), finValide: J(6) }),
      ],
      dependances: [dep(2, 1)],
    });
    const copie = structuredClone(e);
    geler(e);
    const s1 = calculer(e);
    const s2 = calculer(e);
    expect(s2).toEqual(s1);
    expect(e).toEqual(copie);
  });

  it('ERR-10 : saisie sur une assignation inconnue, non MAN, sur un parent, de charge ≠ 0,5 j ou en doublon : entree_invalide, ids des assignations triés ; MAN close : aucune erreur', () => {
    const saisie = (assignationId: number, jour = 5, charge = 50) => ({
      assignationId,
      jour: J(jour),
      demiJournee: 'matin' as const,
      charge,
    });
    const e = erreur(
      entree({
        elements: [act(3, { mode: 'MAN' })],
        taches: [
          tache(1, ALICE, 1, { mode: 'MAN' }),
          tache(2, ALICE, 1),
          tache(4, ALICE, 1, { mode: 'MAN', parentId: 3 }),
          tache(5, ALICE, 1, { mode: 'MAN' }),
          tache(6, ALICE, 1, { mode: 'MAN' }),
          tache(7, ALICE, 1, { mode: 'MAN', close: true }),
        ],
        assignations: [ass(3, 3, BOB, 1)],
        saisies: [
          saisie(1),
          saisie(99),
          saisie(2),
          saisie(3),
          saisie(5, 5, 100),
          saisie(6),
          saisie(6),
          saisie(7),
        ],
      }),
    );
    expect(e.code).toBe('entree_invalide');
    expect(e.ids).toEqual([2, 3, 5, 6, 99]);
    expect(() =>
      calculer(
        entree({
          taches: [tache(7, ALICE, 1, { mode: 'MAN', close: true })],
          saisies: [saisie(7)],
        }),
      ),
    ).not.toThrow();
  });

  it('ERR-4d : entrée gelée avec des saisies (MAN prédécesseur et successeur, avant et après D0) : aucune mutation, sorties égales', () => {
    const journee = (assignationId: number, jour: number) =>
      (['matin', 'apres_midi'] as const).map((demiJournee) => ({
        assignationId,
        jour: J(jour),
        demiJournee,
        charge: 50,
      }));
    const e = entree({
      d0: J(6),
      taches: [
        tache(1, ALICE, 2, { mode: 'MAN' }),
        tache(2, BOB, 2),
        tache(3, BOB, 1),
        tache(4, ALICE, 2, { mode: 'MAN' }),
      ],
      dependances: [dep(1, 2), dep(3, 4)],
      saisies: [...journee(1, 5), ...journee(1, 7), ...journee(4, 8)],
    });
    const copie = structuredClone(e);
    geler(e);
    const s1 = calculer(e);
    const s2 = calculer(e);
    expect(s2).toEqual(s1);
    expect(e).toEqual(copie);
  });
});
