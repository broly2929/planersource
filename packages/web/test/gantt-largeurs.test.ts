import { describe, expect, it } from 'vitest';
import { PX_PAR_JOUR, joursEntre } from '../src/gantt/echelle.js';
import { etendrePlage } from '../src/gantt/plage.js';

/*
 * Lot 3b, largeurs (D-069, SPEC §6 Affichage 16). Signature :
 *   etendrePlage(plage, largeurDisponible, zoom) → { debut, fin }
 * Ajoute des semaines entières à droite tant que la largeur de la plage est inférieure à la largeur
 * disponible ; sinon plage inchangée. Valeurs imposées par le porteur.
 */
const PLAGE = { debut: '2027-01-04', fin: '2027-02-21' };
const largeur = (p: { debut: string; fin: string }, zoom: 'jour' | 'semaine' | 'mois') =>
  (joursEntre(p.debut, p.fin) + 1) * PX_PAR_JOUR[zoom];

describe('GEO-10 : extension de plage', () => {
  it('jour, 1300 px : fin au 28/02/2027, largeur 1344', () => {
    const p = etendrePlage(PLAGE, 1300, 'jour');
    expect(p).toEqual({ debut: '2027-01-04', fin: '2027-02-28' });
    expect(largeur(p, 'jour')).toBe(1344);
  });

  it('semaine, 1300 px : fin au 20/06/2027, largeur 1344', () => {
    const p = etendrePlage(PLAGE, 1300, 'semaine');
    expect(p).toEqual({ debut: '2027-01-04', fin: '2027-06-20' });
    expect(largeur(p, 'semaine')).toBe(1344);
  });

  it('mois, 1300 px : fin au 28/11/2027, largeur 1316', () => {
    const p = etendrePlage(PLAGE, 1300, 'mois');
    expect(p).toEqual({ debut: '2027-01-04', fin: '2027-11-28' });
    expect(largeur(p, 'mois')).toBe(1316);
  });

  it('semaine, 392 px (largeur déjà atteinte) : plage inchangée', () => {
    expect(etendrePlage(PLAGE, 392, 'semaine')).toEqual(PLAGE);
  });

  it('largeur disponible 0 (premier rendu) : plage inchangée', () => {
    expect(etendrePlage(PLAGE, 0, 'semaine')).toEqual(PLAGE);
  });
});
