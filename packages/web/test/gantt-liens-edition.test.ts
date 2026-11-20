import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/api.js';
import type { ElementGantt, LigneGantt } from '../src/gantt/GanttSvg.js';
import { centreConnecteur, cibleLien } from '../src/gantt/liens.js';
import { texteRefusCreationLien } from '../src/screens/projet/commun.js';

/*
 * Lot 3e (D-104), contrat proposé (à relire) :
 *   liens.ts   : centreConnecteur(forme, index) → { cx, cy }
 *                forme : { genre: 'barre', x, largeur, poigneeDroite: boolean } | { genre: 'jalon', x }
 *                (x d'un jalon = abscisse du centre du losange)
 *                cibleLien(y, lignes, sourceId) → identifiant de l'élément cible | null
 *                y : ordonnée dans le SVG, relative au haut de la première ligne
 *   commun.tsx : texteRefusCreationLien(err) → texte de l'alerte d'une création de lien refusée
 */

describe('Centre du connecteur (GEO-20)', () => {
  it('GEO-20 : 8 px à droite de la barre, de la poignée droite ou de la pointe du jalon', () => {
    expect(
      centreConnecteur({ genre: 'barre', x: 100, largeur: 120, poigneeDroite: false }, 2),
    ).toEqual({
      cx: 228,
      cy: 80,
    });
    expect(
      centreConnecteur({ genre: 'barre', x: 100, largeur: 120, poigneeDroite: true }, 2),
    ).toEqual({
      cx: 234,
      cy: 80,
    });
    expect(centreConnecteur({ genre: 'jalon', x: 300 }, 2)).toEqual({ cx: 316, cy: 80 });
  });
});

const element = (
  champs: Partial<ElementGantt> & Pick<ElementGantt, 'id' | 'type'>,
): LigneGantt => ({
  genre: 'element',
  element: {
    parent_id: null,
    rang: 0,
    wbs: '1',
    nom: `Élément ${champs.id}`,
    drapeaux: [],
    ...champs,
  },
});

describe('Cible du lâcher (GEO-21)', () => {
  const lignes: LigneGantt[] = [
    element({
      id: 1,
      type: 'activite',
      mode: 'START',
      debut_planifie: '2027-01-11',
      fin_planifiee: '2027-01-15',
    }),
    element({ id: 2, type: 'activite', mode: 'ASAP' }),
    element({ id: 3, type: 'jalon', type_jalon: 'fixe', date_planifiee: '2027-01-25' }),
    {
      genre: 'sous-projet',
      sousProjet: {
        id: 9,
        code: 'S',
        nom: 'S',
        debut_planifie: '2027-01-11',
        fin_planifiee: '2027-01-15',
        clos: false,
      },
    },
  ];

  it('GEO-21 : la ligne sous le pointeur, si barre parcourable autre que la source', () => {
    expect(cibleLien(10, lignes, 3)).toBe(1);
    expect(cibleLien(10, lignes, 1)).toBeNull();
    expect(cibleLien(40, lignes, 1)).toBeNull();
    expect(cibleLien(70, lignes, 1)).toBe(3);
    expect(cibleLien(100, lignes, 1)).toBeNull();
    expect(cibleLien(-1, lignes, 1)).toBeNull();
    expect(cibleLien(128, lignes, 1)).toBeNull();
  });
});

describe('Texte des refus d’une création de lien (GEO-22)', () => {
  it('GEO-22 : texte selon le statut', () => {
    const impossible = 'Modification impossible pour le moment. Réessayez.';
    expect(texteRefusCreationLien(new ApiError(409, 'x'))).toBe('Cette dépendance existe déjà.');
    expect(texteRefusCreationLien(new ApiError(400, 'x'))).toBe(
      'Modification refusée : données invalides.',
    );
    expect(texteRefusCreationLien(new ApiError(422, 'x'))).toBe(
      'Cette opération enfreint une règle du planning.',
    );
    expect(texteRefusCreationLien(new ApiError(403))).toBe(
      'Modification impossible : rechargez la page.',
    );
    expect(texteRefusCreationLien(new ApiError(404))).toBe(
      'Modification impossible : rechargez la page.',
    );
    expect(texteRefusCreationLien(new ApiError(500))).toBe(impossible);
    expect(texteRefusCreationLien(new TypeError('Failed to fetch'))).toBe(impossible);
  });
});
