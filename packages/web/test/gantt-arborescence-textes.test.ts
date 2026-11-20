import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/api.js';
import { texteRefusCode, texteRefusDeplacement } from '../src/screens/projet/commun.js';

/*
 * Lot 3f-1 (D-108), contrat proposé (à relire) :
 *   commun.tsx : texteRefusDeplacement(err: unknown) → texte de l'alerte d'un déplacement refusé
 *                texteRefusCode(err, 'element') gagne parent_assigne et dependance_hierarchie
 */

const PARENT_ASSIGNE = 'Une activité avec des ressources assignées ne peut pas avoir d’enfant.';
const HIERARCHIE = 'Une dépendance relie cet élément à l’une de ses activités parentes.';
const GENERIQUE = 'Cette opération enfreint une règle du planning.';
const RECHARGEZ = 'Modification impossible : rechargez la page.';
const REESSAYEZ = 'Modification impossible pour le moment. Réessayez.';

describe('Textes de refus d’un déplacement', () => {
  it('GEO-29 : 400, 422 selon le code, 403, 404 et autres cas', () => {
    expect(texteRefusDeplacement(new ApiError(400, 'Données invalides'))).toBe(
      'Modification refusée : données invalides.',
    );
    expect(texteRefusDeplacement(new ApiError(422, 'x', 'parent_assigne'))).toBe(PARENT_ASSIGNE);
    expect(texteRefusDeplacement(new ApiError(422, 'x', 'dependance_hierarchie'))).toBe(HIERARCHIE);
    expect(texteRefusDeplacement(new ApiError(422, 'x', 'parent_clos'))).toBe(
      'Le projet ou l’activité parente est clos.',
    );
    expect(texteRefusDeplacement(new ApiError(422, 'x'))).toBe(GENERIQUE);
    expect(texteRefusDeplacement(new ApiError(422, 'x', 'autre_code'))).toBe(GENERIQUE);
    expect(texteRefusDeplacement(new ApiError(403))).toBe(RECHARGEZ);
    expect(texteRefusDeplacement(new ApiError(404))).toBe(RECHARGEZ);
    expect(texteRefusDeplacement(new ApiError(500))).toBe(REESSAYEZ);
    expect(texteRefusDeplacement(new TypeError('réseau'))).toBe(REESSAYEZ);
  });

  it('GEO-30 : texteRefusCode, nouveaux codes pour un élément, null pour un projet', () => {
    expect(texteRefusCode(new ApiError(422, 'x', 'parent_assigne'), 'element')).toBe(
      PARENT_ASSIGNE,
    );
    expect(texteRefusCode(new ApiError(422, 'x', 'dependance_hierarchie'), 'element')).toBe(
      HIERARCHIE,
    );
    expect(texteRefusCode(new ApiError(422, 'x', 'parent_assigne'), 'projet')).toBeNull();
    expect(texteRefusCode(new ApiError(422, 'x', 'dependance_hierarchie'), 'projet')).toBeNull();
  });
});
