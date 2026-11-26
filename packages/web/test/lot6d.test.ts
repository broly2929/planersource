import { describe, expect, it } from 'vitest';
import {
  adressePlan,
  boutonsMois,
  cellulePlan,
  decalerMois,
  enteteMois,
  libelleProjet,
  libelleRessource,
  moisDe,
  parametresPlan,
} from '../src/plan-de-charge/logique.js';
import { analyserChargeVendue } from '../src/gantt/vendu.js';

/*
 * Lot 6d (D-154), contrat proposé (à relire) : packages/web/src/plan-de-charge/logique.ts
 *   parametresPlan(search: URLSearchParams, moisCourant: string)
 *     → { debut: 'AAAA-MM', equipe: 'toutes' | 'aucune' | number, corrige: boolean }
 *   adressePlan(debut, equipe) → '/pilotage?onglet=charge&debut=AAAA-MM[&equipe=…]' (révision GEO-43-r1, D-245)
 *   decalerMois(debut, n) → 'AAAA-MM' ; moisDe('AAAA-MM-JJ') → 'AAAA-MM' ; enteteMois('AAAA-MM') → 'MM/AAAA'
 *   boutonsMois(debut) → { precedent: boolean, suivant: boolean } (D-155 (3) : bornes 2000-01 et 2099-12)
 *   libelleProjet({ code, nom }) → '<code> · <nom>' ou 'Autres projets' (code et nom null)
 *   libelleRessource(nom, actif) → nom, suivi de ' (inactif)' si inactif
 *   cellulePlan({ charge, disponible, ecart }) → { texte, titre, surcharge }
 * Valeurs attendues recopiées de D-154 (8), (9) ; le moins typographique (U+2212) est celui de D-149 (8).
 */

describe('Paramètres de l’adresse (D-154 (8))', () => {
  const courant = '2026-11';
  const q = (s: string) => new URLSearchParams(s);

  it('GEO-42 : valeurs valides conservées ; invalides ramenées au défaut avec corrige vrai', () => {
    expect(parametresPlan(q('debut=2027-03&equipe=5'), courant)).toEqual({
      debut: '2027-03',
      equipe: 5,
      corrige: false,
    });
    expect(parametresPlan(q('debut=2027-03&equipe=aucune'), courant)).toEqual({
      debut: '2027-03',
      equipe: 'aucune',
      corrige: false,
    });
    expect(parametresPlan(q('debut=2027-03'), courant)).toEqual({
      debut: '2027-03',
      equipe: 'toutes',
      corrige: false,
    });
    for (const invalide of ['', 'debut=2027-13', 'debut=1999-12', 'debut=2100-01', 'debut=abc']) {
      expect(parametresPlan(q(invalide), courant), invalide).toEqual({
        debut: courant,
        equipe: 'toutes',
        corrige: true,
      });
    }
    for (const invalide of ['equipe=abc', 'equipe=1.5']) {
      expect(parametresPlan(q(`debut=2027-03&${invalide}`), courant), invalide).toEqual({
        debut: '2027-03',
        equipe: 'toutes',
        corrige: true,
      });
    }
  });

  it('GEO-43-r1 : adresse des filtres', () => {
    expect(adressePlan('2027-01', 'toutes')).toBe('/pilotage?onglet=charge&debut=2027-01');
    expect(adressePlan('2027-01', 'aucune')).toBe(
      '/pilotage?onglet=charge&debut=2027-01&equipe=aucune',
    );
    expect(adressePlan('2027-01', 7)).toBe('/pilotage?onglet=charge&debut=2027-01&equipe=7');
  });

  it('GEO-44 : décalage de mois et mois d’une date', () => {
    expect(decalerMois('2027-12', 1)).toBe('2028-01');
    expect(decalerMois('2027-01', -1)).toBe('2026-12');
    expect(decalerMois('2027-01', 0)).toBe('2027-01');
    expect(moisDe('2027-01-18')).toBe('2027-01');
  });
});

describe('Textes du tableau (D-154 (9))', () => {
  it('GEO-45 : en-tête de mois, libellés de projet et de ressource', () => {
    expect(enteteMois('2027-01')).toBe('01/2027');
    expect(libelleProjet({ code: 'P1', nom: 'Projet un' })).toBe('P1 · Projet un');
    expect(libelleProjet({ code: null, nom: null })).toBe('Autres projets');
    expect(libelleRessource('Alice', true)).toBe('Alice');
    expect(libelleRessource('Alice', false)).toBe('Alice (inactif)');
  });

  it('GEO-46 : cellule d’une ressource : texte, title, surcharge', () => {
    expect(cellulePlan({ charge: 3.75, disponible: 21, ecart: 17.25 })).toEqual({
      texte: '3,75',
      titre: 'Charge 3,75 j, disponible 21 j, écart 17,25 j',
      surcharge: false,
    });
    expect(cellulePlan({ charge: 22, disponible: 21, ecart: -1 })).toEqual({
      texte: '22',
      titre: 'Charge 22 j, disponible 21 j, écart −1 j',
      surcharge: true,
    });
    expect(cellulePlan({ charge: 0, disponible: 21, ecart: 21 })).toEqual({
      texte: '0',
      titre: 'Charge 0 j, disponible 21 j, écart 21 j',
      surcharge: false,
    });
    expect(cellulePlan({ charge: 21, disponible: 21, ecart: 0 }).surcharge).toBe(false);
  });
});

describe('Saisie de la charge vendue (D-154 (12))', () => {
  it('GEO-47 : un chiffre de chaque côté du séparateur', () => {
    for (const invalide of ['.5', ',5', '5.', '5,']) {
      expect(analyserChargeVendue(invalide), invalide).toEqual({ ok: false });
    }
    expect(analyserChargeVendue('0.5')).toEqual({ ok: true, valeur: 0.5 });
    expect(analyserChargeVendue('5')).toEqual({ ok: true, valeur: 5 });
    expect(analyserChargeVendue('5,50')).toEqual({ ok: true, valeur: 5.5 });
  });
});

describe('Bornes des boutons de mois (D-155 (3))', () => {
  it('GEO-48 : précédent refusé à 2000-01, suivant refusé à 2099-12, les deux permis ailleurs', () => {
    expect(boutonsMois('2000-01')).toEqual({ precedent: false, suivant: true });
    expect(boutonsMois('2099-12')).toEqual({ precedent: true, suivant: false });
    expect(boutonsMois('2027-06')).toEqual({ precedent: true, suivant: true });
  });
});
