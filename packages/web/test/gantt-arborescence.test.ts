import { describe, expect, it } from 'vitest';
import type { ElementGantt } from '../src/gantt/GanttSvg.js';
import { destinationDeplacement, zoneLacher } from '../src/gantt/arborescence.js';

/*
 * Lot 3f-1 (D-108), contrat proposé (à relire) :
 *   gantt/arborescence.ts :
 *     zoneLacher(type: 'activite' | 'jalon', y: number, hauteur = HAUTEUR_LIGNE) → 'avant' | 'dans' | 'apres'
 *       y : ordonnée dans la ligne cible, de 0 (haut) à HAUTEUR_LIGNE (32, bas)
 *       activité : y < 32/3 avant, y < 64/3 dans, sinon apres ; jalon : y < 16 avant, sinon apres
 *     destinationDeplacement(elements, sourceId, cibleId, zone) → { parent_id, rang? } | null
 *       elements : éléments du projet (rang de 1 à n dans la fratrie, D-041) ; cibleId null = ligne de
 *       sous-projet ou hors du tableau ; null si cible interdite ou position identique (D-108 (7)) ;
 *       'dans' : { parent_id: cible } sans clé rang
 */

describe('Zone de lâcher (GEO-23, GEO-24)', () => {
  it('GEO-23 : activité, tiers haut avant, tiers milieu dans, tiers bas apres', () => {
    expect(zoneLacher('activite', 0)).toBe('avant');
    expect(zoneLacher('activite', 10.6)).toBe('avant');
    expect(zoneLacher('activite', 10.7)).toBe('dans');
    expect(zoneLacher('activite', 16)).toBe('dans');
    expect(zoneLacher('activite', 21.3)).toBe('dans');
    expect(zoneLacher('activite', 21.4)).toBe('apres');
    expect(zoneLacher('activite', 32)).toBe('apres');
  });

  it('GEO-23 : hauteur mesurée de 36 px, limites à 12 et 24', () => {
    expect(zoneLacher('activite', 11.9, 36)).toBe('avant');
    expect(zoneLacher('activite', 12, 36)).toBe('dans');
    expect(zoneLacher('activite', 23.9, 36)).toBe('dans');
    expect(zoneLacher('activite', 24, 36)).toBe('apres');
  });

  it('GEO-24 : jalon, moitié haute avant, moitié basse apres, jamais dans', () => {
    expect(zoneLacher('jalon', 0)).toBe('avant');
    expect(zoneLacher('jalon', 15.9)).toBe('avant');
    expect(zoneLacher('jalon', 16)).toBe('apres');
    expect(zoneLacher('jalon', 32)).toBe('apres');
  });
});

const el = (
  id: number,
  nom: string,
  parent_id: number | null,
  rang: number,
  wbs: string,
  type: 'activite' | 'jalon' = 'activite',
): ElementGantt => ({ id, type, nom, parent_id, rang, wbs, drapeaux: [] });

/*
 * 1 P        (id 1, racine, rang 1)
 *   1.1 P1   (id 2, parent 1, rang 1)
 *   1.2 P2   (id 3, parent 1, rang 2)
 * 2 Q        (id 4, racine, rang 2)
 * 3 R        (id 5, racine, rang 3)
 * 4 J        (id 6, racine, rang 4, jalon)
 * 5 K        (id 7, racine, rang 5)
 */
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
const dest = (source: number, cible: number | null, zone: 'avant' | 'dans' | 'apres') =>
  destinationDeplacement(elements, source, cible, zone);

describe('Destination d’un déplacement (GEO-25 à GEO-28)', () => {
  it('GEO-25 : fratrie d’arrivée différente, rang de la cible (avant) ou rang + 1 (après), sans correction', () => {
    expect(dest(R, P1, 'avant')).toStrictEqual({ parent_id: P, rang: 1 });
    expect(dest(R, P1, 'apres')).toStrictEqual({ parent_id: P, rang: 2 });
    expect(dest(P2, Q, 'avant')).toStrictEqual({ parent_id: null, rang: 2 });
    expect(dest(P2, J, 'apres')).toStrictEqual({ parent_id: null, rang: 5 });
    expect(dest(J, P1, 'avant')).toStrictEqual({ parent_id: P, rang: 1 });
    // « après » une activité parente : frère suivant de P, donc après tout son sous-arbre
    expect(dest(R, P, 'apres')).toStrictEqual({ parent_id: null, rang: 2 });
    expect(dest(P1, P, 'apres')).toStrictEqual({ parent_id: null, rang: 2 });
  });

  it('GEO-26 : même fratrie, moins 1 si la source est avant la cible', () => {
    expect(dest(Q, K, 'avant')).toStrictEqual({ parent_id: null, rang: 4 });
    expect(dest(Q, K, 'apres')).toStrictEqual({ parent_id: null, rang: 5 });
    expect(dest(P, K, 'apres')).toStrictEqual({ parent_id: null, rang: 5 });
    expect(dest(J, K, 'apres')).toStrictEqual({ parent_id: null, rang: 5 });
    expect(dest(P1, P2, 'apres')).toStrictEqual({ parent_id: P, rang: 2 });
    // source après la cible : pas de correction
    expect(dest(R, Q, 'avant')).toStrictEqual({ parent_id: null, rang: 2 });
    expect(dest(K, P, 'avant')).toStrictEqual({ parent_id: null, rang: 1 });
    expect(dest(K, P, 'apres')).toStrictEqual({ parent_id: null, rang: 2 });
  });

  it('GEO-27 : dans, parent_id de la cible et aucune clé rang', () => {
    expect(dest(Q, P, 'dans')).toStrictEqual({ parent_id: P });
    expect(dest(R, P1, 'dans')).toStrictEqual({ parent_id: P1 });
    expect(dest(P1, P, 'dans')).toStrictEqual({ parent_id: P });
    expect(Object.keys(dest(Q, P, 'dans')!)).toEqual(['parent_id']);
  });

  it('GEO-28 : source, descendants, ligne sans élément et position identique → null', () => {
    for (const zone of ['avant', 'dans', 'apres'] as const) {
      expect(dest(Q, Q, zone), `source, ${zone}`).toBeNull();
      expect(dest(P, P1, zone), `fils, ${zone}`).toBeNull();
      expect(dest(P, P2, zone), `fils, ${zone}`).toBeNull();
      expect(dest(Q, null, zone), `sous-projet ou hors tableau, ${zone}`).toBeNull();
    }
    // petit-enfant de la source (deux niveaux) ; cible jalon avec la zone « dans » (protection)
    const avecPetitEnfant = [...elements, el(8, 'GC', P1, 1, '1.1.1')];
    for (const zone of ['avant', 'dans', 'apres'] as const) {
      expect(
        destinationDeplacement(avecPetitEnfant, P, 8, zone),
        `petit-enfant, ${zone}`,
      ).toBeNull();
    }
    expect(dest(Q, J, 'dans')).toBeNull();
    // identique : avant le frère suivant, après le frère précédent, dernier enfant déjà dans la cible
    expect(dest(R, J, 'avant')).toBeNull();
    expect(dest(Q, R, 'avant')).toBeNull();
    expect(dest(Q, P, 'apres')).toBeNull();
    expect(dest(J, R, 'apres')).toBeNull();
    expect(dest(K, J, 'apres')).toBeNull();
    expect(dest(P1, P2, 'avant')).toBeNull();
    expect(dest(P2, P, 'dans')).toBeNull();
  });
});
