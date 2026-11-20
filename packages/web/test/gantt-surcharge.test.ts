import { describe, expect, it } from 'vitest';
import { joursSurcharge, rectSurcharge, texteSurcharge } from '../src/gantt/surcharge.js';

/*
 * Lot 3g (D-114 (4), (5)) : jours en surcharge du Gantt du projet. Signatures :
 *   joursSurcharge(lignes) → Map<id de l'élément, jours AAAA-MM-JJ triés, sans doublon> ; seules les
 *     lignes à `surcharge` vraie comptent ; un élément sans jour rouge est absent de la Map
 *   rectSurcharge(origine, jour, zoom, indexLigne) → { x, y, largeur, hauteur } en px
 *   texteSurcharge(jours triés) → suffixe de l'annonce de la barre active, '' sans jour
 */
const ligne = (element_id: number, assignation_id: number, jour: string, surcharge: boolean) => ({
  element_id,
  assignation_id,
  ressource_id: 1,
  jour,
  charge: 1,
  surcharge,
});

const ORIGINE = '2027-01-04';

describe('Jours en surcharge du Gantt (lot 3g)', () => {
  it('GEO-33 : union des assignations sans doublon, jours triés, lignes à surcharge faux ignorées, plusieurs éléments, liste vide', () => {
    const lignes = [
      ligne(10, 100, '2027-01-12', true),
      ligne(10, 100, '2027-01-05', true),
      ligne(10, 101, '2027-01-05', true),
      ligne(10, 101, '2027-01-08', true),
      ligne(10, 100, '2027-01-06', false),
      ligne(20, 200, '2027-01-07', false),
      ligne(30, 300, '2027-01-09', true),
    ];
    const jours = joursSurcharge(lignes);
    expect([...jours.keys()].sort((a, b) => a - b)).toEqual([10, 30]);
    expect(jours.get(10)).toEqual(['2027-01-05', '2027-01-08', '2027-01-12']);
    expect(jours.get(30)).toEqual(['2027-01-09']);
    expect(jours.has(20)).toBe(false);
    expect(joursSurcharge([]).size).toBe(0);
  });

  it('GEO-34 : géométrie d’un jour rouge aux trois zooms ; y et hauteur de la barre ; un jour hors de la barre est calculé quand même', () => {
    expect(rectSurcharge(ORIGINE, '2027-01-09', 'jour', 0)).toEqual({
      x: 120,
      y: 8,
      largeur: 24,
      hauteur: 16,
    });
    expect(rectSurcharge(ORIGINE, '2027-01-09', 'semaine', 0)).toEqual({
      x: 40,
      y: 8,
      largeur: 8,
      hauteur: 16,
    });
    expect(rectSurcharge(ORIGINE, '2027-01-09', 'mois', 0)).toEqual({
      x: 20,
      y: 8,
      largeur: 4,
      hauteur: 16,
    });
    expect(rectSurcharge(ORIGINE, '2027-01-09', 'jour', 3).y).toBe(104);
    expect(rectSurcharge(ORIGINE, '2027-01-09', 'jour', 3).hauteur).toBe(16);
    expect(rectSurcharge(ORIGINE, '2027-01-02', 'jour', 0).x).toBe(-48);
  });

  it('GEO-35 : texte de l’annonce : aucun jour, un jour, cinq jours, six jours (« et 1 autre »), sept jours (« et 2 autres »)', () => {
    expect(texteSurcharge([])).toBe('');
    expect(texteSurcharge(['2027-01-09'])).toBe(', jours en surcharge : 09/01/2027');
    const cinq = ['2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09'];
    expect(texteSurcharge(cinq)).toBe(
      ', jours en surcharge : 05/01/2027, 06/01/2027, 07/01/2027, 08/01/2027, 09/01/2027',
    );
    expect(texteSurcharge([...cinq, '2027-01-10'])).toBe(
      ', jours en surcharge : 05/01/2027, 06/01/2027, 07/01/2027, 08/01/2027, 09/01/2027 et 1 autre',
    );
    expect(texteSurcharge([...cinq, '2027-01-10', '2027-01-11'])).toBe(
      ', jours en surcharge : 05/01/2027, 06/01/2027, 07/01/2027, 08/01/2027, 09/01/2027 et 2 autres',
    );
  });
});
