import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/api.js';
import { decalageJours, estGlisser, type Zoom } from '../src/gantt/echelle.js';
import {
  corpsPatchGeste,
  gestesPermis,
  type CalendrierGeste,
  type ElementGeste,
} from '../src/gantt/gestes.js';
import { ENFANTS_ACTIVITE, texteRefusCode, texteRefusGeste } from '../src/screens/projet/commun.js';

/*
 * Lot 3d-3a (D-094), contrat proposé (à relire) :
 *   echelle.ts : decalageJours(dx, zoom) → entier (zéro positif) ; estGlisser(dx, dy) → booléen
 *   gestes.ts  : gestesPermis(element, peutEcrire, zoom) → { corps, gauche, droite }
 *                corpsPatchGeste(element, geste, decalage, calendrier) → corps du PATCH | null
 *                geste : 'corps' | 'gauche' | 'droite' ; calendrier : { jours_travailles, feries }
 *   commun.tsx : texteRefusGeste(err) → texte de l'alerte ; texteRefusCode gère dates_incoherentes
 */

describe('Décalage d’un glisser (GEO-13)', () => {
  it('GEO-13 : Math.round(dx / px par jour), zéro positif', () => {
    const cas: [Zoom, number, number][] = [
      ['jour', 11, 0],
      ['jour', 13, 1],
      ['jour', -13, -1],
      ['jour', 50, 2],
      ['semaine', 3, 0],
      ['semaine', 5, 1],
      ['semaine', 21, 3],
      ['semaine', -21, -3],
      ['semaine', -3, 0],
    ];
    for (const [zoom, dx, attendu] of cas) {
      expect(decalageJours(dx, zoom), `${zoom} ${dx}`).toBe(attendu);
    }
    expect(Object.is(decalageJours(-3, 'semaine'), 0)).toBe(true);
  });
});

describe('Seuil de glisser (GEO-14)', () => {
  it('GEO-14 : distance euclidienne depuis l’appui, seuil 4 px', () => {
    for (const [dx, dy] of [
      [3, 0],
      [0, 3],
      [2, 3],
    ] as const) {
      expect(estGlisser(dx, dy), `(${dx}, ${dy})`).toBe(false);
    }
    for (const [dx, dy] of [
      [4, 0],
      [3, 3],
    ] as const) {
      expect(estGlisser(dx, dy), `(${dx}, ${dy})`).toBe(true);
    }
  });
});

const element = (champs: Partial<ElementGeste>): ElementGeste => ({
  type: 'activite',
  mode: 'START',
  est_parent: false,
  close: false,
  debut_valide: null,
  fin_valide: null,
  debut_planifie: '2027-01-11',
  fin_planifiee: '2027-01-15',
  ...champs,
});

describe('Gestes permis (GEO-15)', () => {
  const tous = { corps: true, gauche: true, droite: true };
  const aucun = { corps: false, gauche: false, droite: false };

  it('GEO-15 : selon le mode', () => {
    const attendus: [string, typeof tous][] = [
      ['START', { corps: true, gauche: false, droite: false }],
      ['STARR', { corps: true, gauche: false, droite: false }],
      ['FDUR', tous],
      ['DDUR', tous],
      ['ALAP', { corps: false, gauche: false, droite: true }],
      ['REGUL', tous],
    ];
    for (const [mode, permis] of attendus) {
      expect(gestesPermis(element({ mode }), true, 'jour'), mode).toEqual(permis);
      expect(gestesPermis(element({ mode }), true, 'semaine'), `${mode} semaine`).toEqual(permis);
    }
  });

  it('GEO-15 : aucun geste hors des cas permis', () => {
    for (const mode of ['ASAP', 'MAN']) {
      expect(gestesPermis(element({ mode }), true, 'jour'), mode).toEqual(aucun);
    }
    expect(gestesPermis(element({ type: 'jalon' }), true, 'jour'), 'jalon').toEqual(aucun);
    expect(gestesPermis(element({ est_parent: true }), true, 'jour'), 'parent').toEqual(aucun);
    expect(gestesPermis(element({ mode: 'REGUL', close: true }), true, 'jour'), 'close').toEqual(
      aucun,
    );
    expect(gestesPermis(element({ mode: 'REGUL' }), false, 'jour'), 'lecture seule').toEqual(aucun);
    expect(gestesPermis(element({ mode: 'REGUL' }), true, 'mois'), 'zoom mois').toEqual(aucun);
    expect(
      gestesPermis(element({ mode: 'REGUL', debut_planifie: null }), true, 'jour'),
      'sans debut_planifie',
    ).toEqual(aucun);
  });
});

describe('Corps du PATCH d’un geste (GEO-16)', () => {
  // Calendrier lundi à vendredi, férié 2027-01-06 (le mercredi).
  const calendrier: CalendrierGeste = {
    jours_travailles: [1, 2, 3, 4, 5],
    feries: [{ jour: '2027-01-06', libelle: 'Férié' }],
  };
  const patch = (e: ElementGeste, geste: 'corps' | 'gauche' | 'droite', d: number) =>
    corpsPatchGeste(e, geste, d, calendrier);

  it('GEO-16 : START et STARR, corps +3', () => {
    for (const mode of ['START', 'STARR']) {
      const e = element({ mode, debut_valide: '2027-01-04' });
      expect(patch(e, 'corps', 3), mode).toEqual({ debut_valide: '2027-01-14' });
    }
  });

  it('GEO-16 : FDUR planifié du 11 au 15/01', () => {
    const e = element({ mode: 'FDUR', debut_valide: '2027-01-11' });
    expect(patch(e, 'corps', 3)).toEqual({ debut_valide: '2027-01-14' });
    expect(patch(e, 'gauche', -2)).toEqual({ debut_valide: '2027-01-09' });
    expect(patch(e, 'droite', 3)).toEqual({ duree_validee: 6 });
    expect(patch(e, 'droite', -3)).toEqual({ duree_validee: 2 });
    expect(patch(e, 'droite', -10)).toEqual({ duree_validee: 1 });
  });

  it('GEO-16 : FDUR planifié du 04 au 08/01, le férié du 06 est exclu', () => {
    const e = element({
      mode: 'FDUR',
      debut_valide: '2027-01-04',
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
    });
    expect(patch(e, 'droite', 3)).toEqual({ duree_validee: 5 });
  });

  it('GEO-16 : DDUR planifié du 11 au 15/01, poignée droite +3', () => {
    const e = element({ mode: 'DDUR', debut_valide: '2027-01-11' });
    expect(patch(e, 'droite', 3)).toEqual({ duree_validee: 6 });
  });

  it('GEO-16 : ALAP planifié du 11 au 15/01, poignée droite +3', () => {
    const e = element({ mode: 'ALAP', fin_valide: '2027-01-15' });
    expect(patch(e, 'droite', 3)).toEqual({ fin_valide: '2027-01-18' });
  });

  it('GEO-16 : REGUL, corps +7 sur les dates validées (planifié du 05 au 15/01)', () => {
    const e = element({
      mode: 'REGUL',
      debut_valide: '2027-01-04',
      fin_valide: '2027-01-15',
      debut_planifie: '2027-01-05',
      fin_planifiee: '2027-01-15',
    });
    expect(patch(e, 'corps', 7)).toEqual({
      debut_valide: '2027-01-11',
      fin_valide: '2027-01-22',
    });
  });

  it('GEO-16 : REGUL validé et planifié du 04 au 15/01, poignées et bornes', () => {
    const e = element({
      mode: 'REGUL',
      debut_valide: '2027-01-04',
      fin_valide: '2027-01-15',
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-15',
    });
    expect(patch(e, 'gauche', 3)).toEqual({ debut_valide: '2027-01-07' });
    expect(patch(e, 'gauche', 20)).toEqual({ debut_valide: '2027-01-15' });
    expect(patch(e, 'droite', -3)).toEqual({ fin_valide: '2027-01-12' });
    expect(patch(e, 'droite', -20)).toEqual({ fin_valide: '2027-01-04' });
  });

  it('GEO-16 : un décalage de 0 ne donne aucun corps', () => {
    const regul = element({
      mode: 'REGUL',
      debut_valide: '2027-01-04',
      fin_valide: '2027-01-15',
    });
    const fdur = element({ mode: 'FDUR', debut_valide: '2027-01-11' });
    const alap = element({ mode: 'ALAP', fin_valide: '2027-01-15' });
    const start = element({ mode: 'START', debut_valide: '2027-01-11' });
    for (const geste of ['corps', 'gauche', 'droite'] as const) {
      for (const e of [regul, fdur, alap, start]) {
        expect(patch(e, geste, 0), `${e.mode} ${geste}`).toBeNull();
      }
    }
  });
});

describe('Texte des refus d’un geste (GEO-17)', () => {
  it('GEO-17 : texte selon le statut et le code', () => {
    const generique = 'Cette opération enfreint une règle du planning.';
    const impossible = 'Modification impossible pour le moment. Réessayez.';
    expect(texteRefusGeste(new ApiError(400, 'Données invalides'))).toBe(
      'Modification refusée : dates invalides.',
    );
    expect(texteRefusGeste(new ApiError(422, 'x', 'dates_incoherentes'))).toBe(
      'Modification refusée : la fin validée précède le début validé.',
    );
    expect(texteRefusGeste(new ApiError(422, 'x', 'parent_clos'))).toBe(
      'Le projet ou l’activité parente est clos.',
    );
    expect(texteRefusGeste(new ApiError(422, 'x', 'enfants_ouverts'))).toBe(ENFANTS_ACTIVITE);
    expect(texteRefusGeste(new ApiError(422, 'x'))).toBe(generique);
    expect(texteRefusGeste(new ApiError(422, 'x', 'autre'))).toBe(generique);
    expect(texteRefusGeste(new ApiError(403))).toBe('Modification impossible : rechargez la page.');
    expect(texteRefusGeste(new ApiError(404))).toBe('Modification impossible : rechargez la page.');
    expect(texteRefusGeste(new ApiError(500))).toBe(impossible);
    expect(texteRefusGeste(new TypeError('Failed to fetch'))).toBe(impossible);
  });

  it('GEO-17 : texteRefusCode, dates_incoherentes selon la cible', () => {
    const err = new ApiError(422, 'x', 'dates_incoherentes');
    expect(texteRefusCode(err, 'element')).toBe(
      'Modification refusée : la fin validée précède le début validé.',
    );
    expect(texteRefusCode(err, 'projet')).toBeNull();
  });
});
