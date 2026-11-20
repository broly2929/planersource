import { describe, expect, it } from 'vitest';
import {
  CLE_RECALCUL_AUTO,
  ecrireRecalculAuto,
  etatInitialFile,
  evenementFile,
  lireRecalculAuto,
  type EtatFile,
} from '../src/calcul/auto.js';

/*
 * Lot 3d-4 (D-101), contrat proposé (à relire) :
 *   calcul/auto.ts : type EtatFile = { enCours: boolean; attente: boolean }
 *                    etatInitialFile : EtatFile (inactif : enCours faux, attente faux)
 *                    evenementFile(etat, evenement) → { etat: EtatFile; lancer: boolean }
 *                      evenement : 'demande' | 'fin' | 'decocher'
 *                    CLE_RECALCUL_AUTO = 'planersource.recalculAuto'
 *                    lireRecalculAuto(stockage: Pick<Storage, 'getItem'>) → boolean
 *                    ecrireRecalculAuto(stockage: Pick<Storage, 'setItem'>, valeur: boolean) → void
 *                      ('1' ou '0' ; ne lève jamais)
 */

const inactif: EtatFile = { enCours: false, attente: false };
const enCours: EtatFile = { enCours: true, attente: false };
const enCoursEtAttente: EtatFile = { enCours: true, attente: true };

describe('File du recalcul automatique (RECALC-1)', () => {
  it('RECALC-1a : inactif + demande → lancer, en cours sans attente', () => {
    expect(etatInitialFile).toEqual(inactif);
    expect(evenementFile(inactif, 'demande')).toEqual({ etat: enCours, lancer: true });
  });

  it('RECALC-1b : en cours + demande → en attente, rien à lancer', () => {
    expect(evenementFile(enCours, 'demande')).toEqual({ etat: enCoursEtAttente, lancer: false });
  });

  it('RECALC-1c : en cours + 3 demandes → une seule attente', () => {
    let etat = enCours;
    for (let i = 0; i < 3; i++) {
      const r = evenementFile(etat, 'demande');
      expect(r.lancer).toBe(false);
      etat = r.etat;
    }
    expect(etat).toEqual(enCoursEtAttente);
  });

  it('RECALC-1d : en cours et en attente + fin → lancer, en cours, plus d’attente', () => {
    expect(evenementFile(enCoursEtAttente, 'fin')).toEqual({ etat: enCours, lancer: true });
  });

  it('RECALC-1e : en cours sans attente + fin → inactif, rien à lancer', () => {
    expect(evenementFile(enCours, 'fin')).toEqual({ etat: inactif, lancer: false });
  });

  it('RECALC-1f : décocher en cours et en attente → en cours sans attente, rien à lancer', () => {
    expect(evenementFile(enCoursEtAttente, 'decocher')).toEqual({ etat: enCours, lancer: false });
  });
});

describe('Préférence du recalcul automatique (RECALC-2)', () => {
  const stockage = (valeur: string | null) => ({ getItem: () => valeur });

  it('RECALC-2a : la clé est planersource.recalculAuto', () => {
    expect(CLE_RECALCUL_AUTO).toBe('planersource.recalculAuto');
  });

  it("RECALC-2b : '1' → vrai ; '0' ou absente → faux", () => {
    expect(lireRecalculAuto(stockage('1'))).toBe(true);
    expect(lireRecalculAuto(stockage('0'))).toBe(false);
    expect(lireRecalculAuto(stockage(null))).toBe(false);
  });

  it('RECALC-2c : getItem qui lève → faux', () => {
    const leve = {
      getItem: () => {
        throw new Error('stockage illisible');
      },
    };
    expect(lireRecalculAuto(leve)).toBe(false);
  });

  it("RECALC-2d : écrit '1' ou '0' sous la clé ; setItem qui lève → pas d’exception", () => {
    const ecrits: [string, string][] = [];
    const memoire = { setItem: (k: string, v: string) => void ecrits.push([k, v]) };
    ecrireRecalculAuto(memoire, true);
    ecrireRecalculAuto(memoire, false);
    expect(ecrits).toEqual([
      ['planersource.recalculAuto', '1'],
      ['planersource.recalculAuto', '0'],
    ]);
    const leve = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => ecrireRecalculAuto(leve, true)).not.toThrow();
  });
});
