import { describe, expect, it } from 'vitest';
import type { ElementGantt } from '../src/gantt/GanttSvg.js';
import { corpsCreation, entreesMenu, libelleEntree } from '../src/gantt/menu.js';

/*
 * Lot 3f-2 (D-111), contrat proposé (à relire) :
 *   gantt/menu.ts :
 *     type EntreeMenu = 'activite' | 'jalon' | 'sous-activite'
 *     entreesMenu(type: 'activite' | 'jalon') → EntreeMenu[], dans l'ordre d'affichage
 *     libelleEntree(entree) → « Nouvelle activité » | « Nouveau jalon » | « Nouvelle sous-activité »
 *     corpsCreation(elements, ligneId, entree) → { parent_id, rang? } | null
 *       'activite' et 'jalon' : frère juste après la ligne, { parent_id: parent de la ligne, rang: rang + 1 }
 *       'sous-activite' : { parent_id: ligneId } sans clé rang, activité seulement
 *       null si la ligne est inconnue ou si 'sous-activite' est demandée sur un jalon
 *       le nom saisi n'en fait pas partie (ajouté par le dialogue)
 */

const el = (
  id: number,
  nom: string,
  parent_id: number | null,
  rang: number,
  wbs: string,
  type: 'activite' | 'jalon' = 'activite',
): ElementGantt => ({ id, type, nom, parent_id, rang, wbs, drapeaux: [] });

const P = 1;
const P1 = 2;
const P2 = 3;
const Q = 4;
const R = 5;
const J = 6;
const K = 7;
const elements: ElementGantt[] = [
  el(P, 'P', null, 1, '1'),
  el(P1, 'P1', P, 1, '1.1'),
  el(P2, 'P2', P, 2, '1.2'),
  el(Q, 'Q', null, 2, '2'),
  el(R, 'R', null, 3, '3'),
  el(J, 'J', null, 4, '4', 'jalon'),
  el(K, 'K', null, 5, '5'),
];

describe('Corps d’une création par le menu (GEO-31)', () => {
  it('GEO-31 : activité et jalon, frère juste après la ligne', () => {
    expect(corpsCreation(elements, P1, 'activite')).toEqual({ parent_id: P, rang: 2 });
    expect(corpsCreation(elements, P2, 'jalon')).toEqual({ parent_id: P, rang: 3 });
    expect(corpsCreation(elements, Q, 'activite')).toEqual({ parent_id: null, rang: 3 });
    expect(corpsCreation(elements, J, 'jalon')).toEqual({ parent_id: null, rang: 5 });
    expect(corpsCreation(elements, K, 'activite')).toEqual({ parent_id: null, rang: 6 });
  });

  it('GEO-31 : sous-activité, dernier enfant, aucune clé rang', () => {
    const p = corpsCreation(elements, P, 'sous-activite');
    expect(p).toEqual({ parent_id: P });
    expect(p).not.toHaveProperty('rang');
    const r = corpsCreation(elements, R, 'sous-activite');
    expect(r).toEqual({ parent_id: R });
    expect(r).not.toHaveProperty('rang');
  });

  it('GEO-31 : ligne inconnue ou sous-activité sur un jalon → null', () => {
    expect(corpsCreation(elements, 99, 'activite')).toBeNull();
    expect(corpsCreation(elements, 99, 'sous-activite')).toBeNull();
    expect(corpsCreation(elements, J, 'sous-activite')).toBeNull();
  });
});

describe('Entrées du menu (GEO-32)', () => {
  it('GEO-32 : entrées selon le type de la ligne, dans l’ordre', () => {
    expect(entreesMenu('activite')).toEqual(['activite', 'jalon', 'sous-activite']);
    expect(entreesMenu('jalon')).toEqual(['activite', 'jalon']);
  });

  it('GEO-32 : libellés', () => {
    expect(libelleEntree('activite')).toBe('Nouvelle activité');
    expect(libelleEntree('jalon')).toBe('Nouveau jalon');
    expect(libelleEntree('sous-activite')).toBe('Nouvelle sous-activité');
  });
});
