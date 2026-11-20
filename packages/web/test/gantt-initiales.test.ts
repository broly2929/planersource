import { describe, expect, it } from 'vitest';
import { ECART_INITIALES, lireInitiales, positionInitiales } from '../src/gantt/echelle.js';
import { libelleInitiales } from '../src/gantt/libelles.js';

/*
 * Lot 3d-1 (D-088 (2)) : position du texte des initiales = fin de la barre + ECART_INITIALES (6 px),
 * pas de position sans barre. Signatures :
 *   positionInitiales(origine, debut | null, fin | null, zoom) → px | null
 *   libelleInitiales(initiales) → « AB, CD »      lireInitiales(valeur de l'adresse | null) → booléen
 */
const ORIGINE = '2027-01-04';

describe('Initiales du Gantt (lot 3d-1)', () => {
  it('GEO-11 : x du texte = fin de la barre + écart, aux trois zooms ; null sans barre', () => {
    expect(ECART_INITIALES).toBe(6);
    expect(positionInitiales(ORIGINE, '2027-01-04', '2027-01-08', 'jour')).toBe(126);
    expect(positionInitiales(ORIGINE, '2027-01-04', '2027-01-08', 'semaine')).toBe(46);
    expect(positionInitiales(ORIGINE, '2027-01-04', '2027-01-08', 'mois')).toBe(26);
    expect(positionInitiales(ORIGINE, '2027-01-11', '2027-01-15', 'jour')).toBe(294);
    expect(positionInitiales(ORIGINE, '2027-01-11', '2027-01-15', 'semaine')).toBe(102);
    expect(positionInitiales(ORIGINE, '2027-01-11', '2027-01-15', 'mois')).toBe(54);
    for (const zoom of ['jour', 'semaine', 'mois'] as const) {
      expect(positionInitiales(ORIGINE, null, null, zoom)).toBeNull();
      expect(positionInitiales(ORIGINE, '2027-01-04', null, zoom)).toBeNull();
      expect(positionInitiales(ORIGINE, null, '2027-01-08', zoom)).toBeNull();
    }
  });

  it('GEO-12 : libellé « AB, CD » ; lecture de initiales=1 dans l’adresse', () => {
    expect(libelleInitiales(['AB', 'CD'])).toBe('AB, CD');
    expect(libelleInitiales(['AB'])).toBe('AB');
    expect(libelleInitiales([])).toBe('');
    expect(lireInitiales('1')).toBe(true);
    for (const v of [null, '0', 'oui', '']) expect(lireInitiales(v)).toBe(false);
  });
});
