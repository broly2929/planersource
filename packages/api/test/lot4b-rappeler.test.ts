import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { corps, type Acteur } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import { action, agir, idFeuille, imputer, j, S2, statutFeuille } from './lot4a-helpers.js';

/** Correctif de 4a (D-120 (1)) : rappeler une feuille rejetée ou validée. Date du jour : mercredi 13/01/2027. */
const AUJOURDHUI = '2027-01-13';

/** Rappeler refusé : 422, code attendu, base strictement inchangée. */
async function rappelRefuse(ctx: TestCtx, qui: Acteur, id: number, code: string) {
  const avant = await empreinte(ctx);
  const res = await action(ctx, qui, id, 'rappeler', {});
  expect(res.statusCode, res.body).toBe(422);
  expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

describe('Correctif de 4a : rappeler (D-120 (1))', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('FDT-17 : rappeler une feuille rejetée → 422 statut_invalide ; validée → 422 deja_validee ; base inchangée', async () => {
    // P (chef `chef`) : A, Alice 5 j, 1 j imputé le 11/01.
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5, { nom: 'A' });
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;

    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'rejeter', { commentaire: 'À revoir' });
    expect(await statutFeuille(ctx, id)).toBe('rejetee');
    await rappelRefuse(ctx, m.alice, id, 'statut_invalide');

    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('validee');
    await rappelRefuse(ctx, m.alice, id, 'deja_validee');
  });
});
