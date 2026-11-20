import { describe, expect, it } from 'vitest';
import { entetes } from '../src/gantt/entetes.js';
import { largeurBarre, partAvancement, positionJour } from '../src/gantt/echelle.js';
import { libelleDrapeau, libelleMode } from '../src/gantt/libelles.js';
import { pointsLien, type Point, type Rect } from '../src/gantt/liens.js';
import { calculerPlage } from '../src/gantt/plage.js';

/*
 * Lot 3b (D-066) : géométrie du Gantt en fonctions pures. Dates en chaînes AAAA-MM-JJ, calcul en jours
 * calendaires UTC. Signatures :
 *   positionJour(origine, jour, zoom) → px          largeurBarre(debut, fin, zoom) → px (fin incluse)
 *   partAvancement(largeur, avancement | null) → px calculerPlage({ debutProjet, jours, aujourdhui? }) → { debut, fin }
 *   entetes(plage, zoom) → { haut, bas } de cellules { libelle, x, largeur }
 *   pointsLien(type, predecesseur, successeur) → points   libelleMode(code), libelleDrapeau(code)
 */
const ORIGINE = '2027-01-04';

describe('Géométrie du Gantt (lot 3b)', () => {
  it('GEO-1 : position d’un jour depuis le lundi 04/01/2027', () => {
    expect(positionJour(ORIGINE, '2027-01-04', 'jour')).toBe(0);
    expect(positionJour(ORIGINE, '2027-01-06', 'jour')).toBe(48);
    expect(positionJour(ORIGINE, '2027-01-06', 'semaine')).toBe(16);
    expect(positionJour(ORIGINE, '2027-01-06', 'mois')).toBe(8);
  });

  it('GEO-2 : largeur d’une barre du 04 au 08/01 (120, 40, 20) ; barre d’un jour : 24 au zoom jour', () => {
    expect(largeurBarre('2027-01-04', '2027-01-08', 'jour')).toBe(120);
    expect(largeurBarre('2027-01-04', '2027-01-08', 'semaine')).toBe(40);
    expect(largeurBarre('2027-01-04', '2027-01-08', 'mois')).toBe(20);
    expect(largeurBarre('2027-01-04', '2027-01-04', 'jour')).toBe(24);
  });

  it('GEO-3 : changement d’heure, 29/03/2027 moins 27/03/2027 = 48 au zoom jour', () => {
    const o = '2027-03-22';
    expect(positionJour(o, '2027-03-29', 'jour') - positionJour(o, '2027-03-27', 'jour')).toBe(48);
  });

  it('GEO-4 : plage', () => {
    // (a)
    expect(
      calculerPlage({ debutProjet: '2027-01-06', jours: ['2027-01-06', '2027-02-19'] }),
    ).toEqual({ debut: '2027-01-04', fin: '2027-03-07' });
    // (b)
    expect(calculerPlage({ debutProjet: '2027-01-06', jours: [] })).toEqual({
      debut: '2027-01-04',
      fin: '2027-02-21',
    });
    // (c) la date du jour n'étend pas la plage
    expect(
      calculerPlage({ debutProjet: '2027-01-06', jours: [], aujourdhui: '2026-11-16' }),
    ).toEqual({ debut: '2027-01-04', fin: '2027-02-21' });
  });

  describe('GEO-5 : en-têtes', () => {
    const plage = { debut: '2027-01-04', fin: '2027-02-21' };

    it('semaine', () => {
      const e = entetes(plage, 'semaine');
      expect(e.bas[0]).toMatchObject({ libelle: 'S01', x: 0, largeur: 56 });
      expect(e.haut[0]).toMatchObject({ libelle: 'janvier 2027', x: 0 });
    });

    it('jour', () => {
      const e = entetes(plage, 'jour');
      expect(e.bas[0]).toMatchObject({ libelle: '4', x: 0, largeur: 24 });
    });

    it('mois', () => {
      const e = entetes(plage, 'mois');
      expect(e.haut[0]).toMatchObject({ libelle: '2027', x: 0 });
      expect(e.bas[0]).toMatchObject({ libelle: 'janv.', x: 0, largeur: 112 });
    });
  });

  describe('GEO-6 : liens en angles droits', () => {
    const pred: Rect = { x: 100, largeur: 40, y: 16 };
    const succDroite: Rect = { x: 200, largeur: 40, y: 48 };
    const succGauche: Rect = { x: 20, largeur: 40, y: 48 };

    const orthogonal = (pts: Point[]) => {
      expect(pts.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        expect(a.x === b.x || a.y === b.y, `segment ${i} oblique`).toBe(true);
      }
    };

    it('FD : de la fin du prédécesseur au début du successeur', () => {
      for (const succ of [succDroite, succGauche]) {
        const pts = pointsLien('FD', pred, succ);
        expect(pts[0]).toEqual({ x: 140, y: 16 });
        expect(pts[pts.length - 1]).toEqual({ x: succ.x, y: 48 });
        orthogonal(pts);
      }
    });

    it('DD : du début au début', () => {
      for (const succ of [succDroite, succGauche]) {
        const pts = pointsLien('DD', pred, succ);
        expect(pts[0]).toEqual({ x: 100, y: 16 });
        expect(pts[pts.length - 1]).toEqual({ x: succ.x, y: 48 });
        orthogonal(pts);
      }
    });

    it('FF : de la fin à la fin', () => {
      for (const succ of [succDroite, succGauche]) {
        const pts = pointsLien('FF', pred, succ);
        expect(pts[0]).toEqual({ x: 140, y: 16 });
        expect(pts[pts.length - 1]).toEqual({ x: succ.x + succ.largeur, y: 48 });
        orthogonal(pts);
      }
    });
  });

  it('GEO-7 : part d’avancement', () => {
    expect(partAvancement(120, 25)).toBe(30);
    expect(partAvancement(120, null)).toBe(0);
    expect(partAvancement(120, 100)).toBe(120);
  });

  it('GEO-8-r1 : libellés des huit modes (table de D-123 (5)) et des quatre drapeaux', () => {
    expect(libelleMode('ASAP')).toBe('Dès que possible');
    expect(libelleMode('START')).toBe('Pas avant une date');
    expect(libelleMode('STARR')).toBe('Démarrage imposé');
    expect(libelleMode('ALAP')).toBe('Fin visée');
    expect(libelleMode('FDUR')).toBe('Durée fixe');
    expect(libelleMode('DDUR')).toBe('Durée imposée');
    expect(libelleMode('REGUL')).toBe('Régulier entre deux dates');
    expect(libelleMode('MAN')).toBe('Planning manuel');
    expect(libelleDrapeau('retard')).toBe('Retard');
    expect(libelleDrapeau('debut_non_respecte')).toBe('Début non respecté');
    expect(libelleDrapeau('surcharge')).toBe('Surcharge');
    expect(libelleDrapeau('dependance_non_respectee')).toBe('Dépendance non respectée');
  });
});
