import { describe, expect, it } from 'vitest';
import { calculer } from '../src/index.js';
import type { Saisie } from '../src/index.js';
import { ALICE, BOB, dep, entree, J, LUN_VEN, MAR_SAM, tache, type Tache } from './helpers.js';

/*
 * DRAP-5 (D-069, SPEC §6 Affichage 15) : caractérisation, une activité émet au plus 1 drapeau en pratique.
 * `drapeauxDuree` (modes/duree.ts:37-38) pourrait en émettre 2 (retard + surcharge) : la colonne Drapeaux du
 * Gantt est dimensionnée sur ce max structurel (144 px, E2E-41e). S'il casse, l'interface tient déjà.
 * Vert d'emblée.
 */
const MAX = 1;
const externe = [
  { ressourceId: ALICE, jour: J(4), charge: 100 },
  { ressourceId: ALICE, jour: J(6), charge: 100 },
];
const demi = (assignationId: number, jour: number, d: Saisie['demiJournee']): Saisie => ({
  assignationId,
  jour: J(jour),
  demiJournee: d,
  charge: 50,
});

const MODES: Record<string, { taches: Tache[]; extra?: Record<string, unknown> }> = {
  STARR: {
    taches: [
      tache(1, ALICE, 5, { mode: 'STARR', debutValide: J(6), finValide: J(7), dureeValidee: 1 }),
      tache(2, BOB, 5),
    ],
    extra: { dependances: [dep(2, 1)], travailExterne: externe },
  },
  FDUR: {
    taches: [tache(1, ALICE, 5, { mode: 'FDUR', dureeValidee: 2, debutValide: J(4) })],
    extra: { travailExterne: externe },
  },
  DDUR: {
    taches: [tache(1, ALICE, 5, { mode: 'DDUR', dureeValidee: 2, debutValide: J(4) })],
    extra: { travailExterne: externe },
  },
  'FDUR, deux ressources': {
    taches: [tache(1, ALICE, 2, { mode: 'FDUR', dureeValidee: 2 })],
    extra: {
      assignations: [
        {
          id: 9,
          activiteId: 1,
          ressourceId: BOB,
          taux: 10000,
          charge: 300,
          chargeReelle: 0,
          resteAFaire: 300,
        },
      ],
      travailExterne: externe,
    },
  },
  'DDUR, deux ressources, calendriers différents': {
    taches: [tache(1, ALICE, 5, { mode: 'DDUR', dureeValidee: 2 })],
    extra: {
      calendriers: [LUN_VEN, MAR_SAM],
      ressources: [
        { id: ALICE, capacite: 100, calendrierId: 2 },
        { id: BOB, capacite: 100, calendrierId: 1 },
      ],
      assignations: [
        {
          id: 9,
          activiteId: 1,
          ressourceId: BOB,
          taux: 10000,
          charge: 500,
          chargeReelle: 0,
          resteAFaire: 500,
        },
      ],
      travailExterne: externe,
    },
  },
  ALAP: {
    taches: [tache(1, ALICE, 5, { mode: 'ALAP', finValide: J(6) })],
    extra: { travailExterne: externe },
  },
  REGUL: {
    taches: [
      tache(1, ALICE, 5, { mode: 'REGUL', debutValide: J(4), finValide: J(6) }),
      tache(2, ALICE, 5, { mode: 'REGUL', debutValide: J(4), finValide: J(6), priorite: 100 }),
    ],
    extra: { travailExterne: externe },
  },
  MAN: {
    taches: [tache(1, ALICE, 1, { mode: 'MAN' }), tache(2, ALICE, 1, { mode: 'MAN' })],
    extra: {
      saisies: [
        demi(1, 5, 'matin'),
        demi(1, 5, 'apres_midi'),
        demi(2, 5, 'matin'),
        demi(2, 5, 'apres_midi'),
      ],
      travailExterne: externe,
    },
  },
};

describe('DRAP-5 : au plus 1 drapeau par activité', () => {
  for (const [mode, { taches, extra }] of Object.entries(MODES)) {
    it(mode, () => {
      const s = calculer(entree({ taches, ...extra }));
      expect(s.activites.length).toBeGreaterThan(0);
      for (const a of s.activites) expect(a.drapeaux.length).toBeLessThanOrEqual(MAX);
    });
  }
});
