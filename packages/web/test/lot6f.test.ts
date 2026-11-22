import { describe, expect, it } from 'vitest';
import {
  adresseExportImputations,
  adresseExportPlan,
  periodeExportValide,
  periodeSemaine,
} from '../src/export/logique.js';

/*
 * Lot 6f (D-160, SPEC « Exports CSV (lot 6f, D-160) ») : logique pure des boutons d'export. Signatures :
 *   periodeSemaine(lundi) → { du, au } (lundi et dimanche de la semaine, AAAA-MM-JJ)
 *   periodeExportValide(du, au) → booléen : les deux dates saisies, au plus 366 jours bornes comprises
 *   adresseExportPlan(debut, equipe), adresseExportImputations(du, au, equipe) : equipe = 'toutes' | 'aucune' | entier
 */

describe('Exports CSV : logique web (D-160 (5), (6))', () => {
  it('GEO-53 : periodeSemaine', () => {
    expect(periodeSemaine('2027-01-04')).toEqual({ du: '2027-01-04', au: '2027-01-10' });
    expect(periodeSemaine('2026-12-28')).toEqual({ du: '2026-12-28', au: '2027-01-03' });
  });

  it('GEO-54 : periodeExportValide (366 jours bornes comprises)', () => {
    expect(periodeExportValide('2028-01-01', '2028-12-31')).toBe(true);
    expect(periodeExportValide('2027-01-01', '2028-01-02')).toBe(false);
    expect(periodeExportValide('2027-01-01', '2027-01-01')).toBe(true);
    expect(periodeExportValide('2027-01-02', '2027-01-01')).toBe(false);
    expect(periodeExportValide('', '2027-01-01')).toBe(false);
    expect(periodeExportValide('2027-01-01', '')).toBe(false);
  });

  it('GEO-55 : adresses de téléchargement', () => {
    expect(adresseExportPlan('2027-01', 'toutes')).toBe('/api/plan-de-charge/export?debut=2027-01');
    expect(adresseExportPlan('2027-01', 'aucune')).toBe(
      '/api/plan-de-charge/export?debut=2027-01&equipe=aucune',
    );
    expect(adresseExportPlan('2027-01', 7)).toBe(
      '/api/plan-de-charge/export?debut=2027-01&equipe=7',
    );
    expect(adresseExportImputations('2027-01-04', '2027-01-10', 'toutes')).toBe(
      '/api/imputations/export?du=2027-01-04&au=2027-01-10',
    );
    expect(adresseExportImputations('2027-01-04', '2027-01-10', 'aucune')).toBe(
      '/api/imputations/export?du=2027-01-04&au=2027-01-10&equipe=aucune',
    );
    expect(adresseExportImputations('2027-01-04', '2027-01-10', 7)).toBe(
      '/api/imputations/export?du=2027-01-04&au=2027-01-10&equipe=7',
    );
  });
});
