import { describe, expect, it } from 'vitest';
import { libelleMode as libelleModeGantt } from '../src/gantt/libelles.js';
import { aideMode, libelleMode, MODES_PLANIFICATION } from '../src/modes.js';
import { messagePosition, wbsDe } from '../src/screens/projet/deplacement.js';
import { caseDesactivee } from '../src/screens/planning-manuel-jours.js';

/*
 * REX-3a (D-123). Signatures :
 *   modes.ts : MODES_PLANIFICATION = [{ code, libelle, aide }] dans l'ordre ASAP, START, STARR, ALAP,
 *     FDUR, DDUR, REGUL, MAN ; libelleMode(code) (inconnu : le code) ; aideMode(code) (inconnu : '')
 *   screens/projet/deplacement.ts : messagePosition(nom, wbs) ; wbsDe(lignes, id) → wbs ou null
 *   screens/planning-manuel-jours.ts : caseDesactivee({ lectureSeule, nonOuvre, cochee }) → boolean
 * Libellés et aides recopiés de D-123 (5).
 */
const ATTENDU = [
  [
    'ASAP',
    'Dès que possible',
    'Démarre au plus tôt, selon les dépendances et la disponibilité des ressources.',
  ],
  [
    'START',
    'Pas avant une date',
    'Démarre au plus tôt à partir de la date de début saisie, jamais avant.',
  ],
  [
    'STARR',
    'Démarrage imposé',
    "Démarre à la date de début saisie, en priorité sur les autres activités ; signalée « Début non respecté » si c'est impossible.",
  ],
  [
    'ALAP',
    'Fin visée',
    'Planifiée à rebours pour finir à la date de fin saisie ; si elle ne tient pas, dès que possible.',
  ],
  [
    'FDUR',
    'Durée fixe',
    'Dure le nombre de jours saisi, selon la disponibilité ; ce qui ne tient pas passe après, avec « Retard ».',
  ],
  [
    'DDUR',
    'Durée imposée',
    'Dure exactement le nombre de jours saisi, même au-delà de la disponibilité (« Surcharge »).',
  ],
  [
    'REGUL',
    'Régulier entre deux dates',
    'Charge répartie également sur chaque jour ouvré entre les dates de début et de fin saisies.',
  ],
  ['MAN', 'Planning manuel', 'Charge saisie à la main, par ressource et par demi-journée.'],
] as const;

describe('Table des modes (REX-3a)', () => {
  it('MODL-1 : huit modes dans l’ordre, libellés et aides de D-123 (5)', () => {
    expect(MODES_PLANIFICATION.map((m) => [m.code, m.libelle, m.aide])).toEqual(ATTENDU);
  });

  it('MODL-2 : libelleMode et aideMode lisent la table ; code inconnu ; le Gantt partage la même fonction', () => {
    for (const [code, libelle, aide] of ATTENDU) {
      expect(libelleMode(code), code).toBe(libelle);
      expect(aideMode(code), code).toBe(aide);
    }
    expect(libelleMode('XYZ')).toBe('XYZ');
    expect(aideMode('XYZ')).toBe('');
    expect(libelleModeGantt).toBe(libelleMode);
  });
});

describe('Déplacement dans l’onglet Planning (REX-3a)', () => {
  it('POS-1 : message de position annoncée et WBS relu après rechargement', () => {
    expect(messagePosition('Charlie', '2')).toBe('Charlie est maintenant en position 2.');
    expect(messagePosition('Étude', '1.2')).toBe('Étude est maintenant en position 1.2.');
    const lignes = [
      { id: 7, wbs: '1' },
      { id: 9, wbs: '1.2' },
    ];
    expect(wbsDe(lignes, 9)).toBe('1.2');
    expect(wbsDe(lignes, 7)).toBe('1');
    expect(wbsDe(lignes, 99)).toBeNull();
  });
});

describe('Grille du Planning manuel (REX-3a)', () => {
  it('PMJ-1 : case désactivée en lecture seule, ou sur un jour non ouvré non coché ; activable si cochée ou ouvrée', () => {
    const c = (lectureSeule: boolean, nonOuvre: boolean, cochee: boolean) =>
      caseDesactivee({ lectureSeule, nonOuvre, cochee });
    expect(c(true, false, false)).toBe(true);
    expect(c(true, true, true)).toBe(true);
    expect(c(false, true, false)).toBe(true);
    expect(c(false, true, true)).toBe(false);
    expect(c(false, false, false)).toBe(false);
    expect(c(false, false, true)).toBe(false);
  });
});
