import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, corps, type Acteur, type Corps } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  action,
  agir,
  ecrireFeuille,
  idFeuille,
  imputer,
  j,
  lireFeuille,
  S2,
  statutFeuille,
} from './lot4a-helpers.js';

/**
 * Lot 4a : cycle de la feuille de temps (SPEC §7 « Cycle », « API et règles (lot 4a, D-118) »,
 * D-118 (8)). Date du jour du serveur : mercredi 13/01/2027.
 */
const AUJOURDHUI = '2027-01-13';

/**
 * P (chef `chef`) : A, Alice 5 j ; Q (chef `autreChef`) : B, Alice 3 j. Imputations d'Alice sur la
 * semaine du 11/01 : A et, si `surQ`, B. Renvoie l'identifiant de la feuille (brouillon).
 */
async function base(ctx: TestCtx, surQ = true) {
  const m = await creerMonde(ctx);
  await affecter(ctx, m.autre.id, m.alice.id);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5, { nom: 'A' });
  const b = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 3, { nom: 'B' });
  await imputer(ctx, m.alice, S2, [
    { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    {
      assignation_id: b.assignation.id,
      imputations: surQ ? [{ jour: j(12), charge: 0.5 }] : [],
    },
  ]);
  const id = (await idFeuille(ctx, m.alice.id, S2))!;
  return { m, a, b, id };
}

/** Action refusée : statut et code attendus, base strictement inchangée. */
async function refuse(
  ctx: TestCtx,
  qui: Acteur | undefined,
  id: number | string,
  verbe: 'soumettre' | 'rappeler' | 'valider' | 'rejeter',
  statut: number,
  code?: string,
  corpsEnvoye: Corps = {},
) {
  const avant = await empreinte(ctx);
  const res = await action(ctx, qui, id, verbe, corpsEnvoye);
  expect(res.statusCode, `${verbe} : ${res.body}`).toBe(statut);
  if (code) expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

describe('Cycle de la feuille de temps (lot 4a)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('FDT-1 : soumettre (la ressource) : brouillon → soumise ; GET le montre', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect((await lireFeuille(ctx, m.alice, S2)).feuille).toMatchObject({
      id,
      statut: 'soumise',
      validations: [],
    });
  });

  it('FDT-2 : soumettre une feuille sans imputation > 0 : 422 feuille_vide, base inchangée', async () => {
    const { m, a, b, id } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [] },
      { assignation_id: b.assignation.id, imputations: [{ jour: j(12), charge: 0 }] },
    ]);
    await refuse(ctx, m.alice, id, 'soumettre', 422, 'feuille_vide');
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
  });

  it('FDT-3 : soumettre : sans session 401 ; feuille inconnue, mal formée ou non visible 404 ; visible sans droit (chef, administrateur) 403 ; base inchangée', async () => {
    const { m, id } = await base(ctx);
    await refuse(ctx, undefined, id, 'soumettre', 401);
    await refuse(ctx, m.alice, 999999, 'soumettre', 404);
    await refuse(ctx, m.alice, 'abc', 'soumettre', 404);
    await refuse(ctx, m.bob, id, 'soumettre', 404);
    await refuse(ctx, m.chef, id, 'soumettre', 403);
    await refuse(ctx, m.admin, id, 'soumettre', 403);
  });

  it('FDT-4 : soumettre une feuille soumise ou validée : 422 statut_invalide, base inchangée', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(ctx, m.alice, id, 'soumettre', 422, 'statut_invalide');
    await agir(ctx, m.admin, id, 'valider');
    await refuse(ctx, m.alice, id, 'soumettre', 422, 'statut_invalide');
  });

  it('FDT-5 : rappeler (la ressource) : soumise sans validation → brouillon, de nouveau modifiable', async () => {
    const { m, a, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.alice, id, 'rappeler');
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] },
    ]);
  });

  it('FDT-6 : rappeler : brouillon → 422 statut_invalide ; après une validation partielle → 422 deja_validee ; chef 403 ; base inchangée', async () => {
    const { m, id } = await base(ctx);
    await refuse(ctx, m.alice, id, 'rappeler', 422, 'statut_invalide');
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(ctx, m.chef, id, 'rappeler', 403);
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    await refuse(ctx, m.alice, id, 'rappeler', 422, 'deja_validee');
  });

  it('FDT-7 : valider par projet : le chef de P valide P (feuille encore soumise), le chef de Q valide Q → validée ; validations (projet, validateur, date du jour)', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    let f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille.statut).toBe('soumise');
    expect(f.feuille.validations).toEqual([
      { projet_id: m.projet.id, validateur_id: m.chef.id, date: AUJOURDHUI },
    ]);
    await agir(ctx, m.autreChef, id, 'valider');
    f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille.statut).toBe('validee');
    expect([...f.feuille.validations].sort((x, y) => x.projet_id - y.projet_id)).toEqual(
      [
        { projet_id: m.projet.id, validateur_id: m.chef.id, date: AUJOURDHUI },
        { projet_id: m.autre.id, validateur_id: m.autreChef.id, date: AUJOURDHUI },
      ].sort((x, y) => x.projet_id - y.projet_id),
    );
  });

  it('FDT-8 : projets concernés = imputation > 0 dans la semaine : ligne de Q sans imputation, le chef de P seul valide → validée', async () => {
    const { m, id } = await base(ctx, false);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('validee');
  });

  it('FDT-9 : l’administrateur valide tous les projets concernés : validée, une validation par projet à son nom', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.admin, id, 'valider');
    const f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille.statut).toBe('validee');
    expect(f.feuille.validations.map((v) => [v.projet_id, v.validateur_id]).sort()).toEqual(
      [
        [m.projet.id, m.admin.id],
        [m.autre.id, m.admin.id],
      ].sort(),
    );
  });

  it('FDT-10 : valider : la ressource elle-même 403, ressource tierce 404 ; brouillon ou validée 422 statut_invalide ; base inchangée', async () => {
    const { m, id } = await base(ctx);
    await refuse(ctx, m.chef, id, 'valider', 422, 'statut_invalide');
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(ctx, m.alice, id, 'valider', 403);
    await refuse(ctx, m.bob, id, 'valider', 404);
    await agir(ctx, m.admin, id, 'valider');
    await refuse(ctx, m.chef, id, 'valider', 422, 'statut_invalide');
  });

  it('FDT-11 : rejeter : soumise → rejetée, commentaire sans espaces de bord, validations effacées ; la feuille redevient modifiable ; soumettre efface le commentaire', async () => {
    const { m, a, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.autreChef, id, 'valider');
    await agir(ctx, m.chef, id, 'rejeter', { commentaire: '  Revoir lundi.  ' });
    let f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille).toMatchObject({
      statut: 'rejetee',
      commentaire: 'Revoir lundi.',
      validations: [],
    });
    const { rows } = await ctx.pool.query(
      'SELECT * FROM validation_feuille WHERE feuille_id = $1',
      [id],
    );
    expect(rows).toEqual([]);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 0.75 }] },
    ]);
    await agir(ctx, m.alice, id, 'soumettre');
    f = await lireFeuille(ctx, m.alice, S2);
    expect(f.feuille).toMatchObject({ statut: 'soumise', commentaire: null });
  });

  it('FDT-12 : rejeter par l’administrateur ; commentaire de 500 caractères accepté', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.admin, id, 'rejeter', { commentaire: 'x'.repeat(500) });
    expect((await lireFeuille(ctx, m.alice, S2)).feuille).toMatchObject({
      statut: 'rejetee',
      commentaire: 'x'.repeat(500),
    });
  });

  it('FDT-13 : rejeter : commentaire absent, vide, blanc, de 501 caractères ou clé inconnue → 400 ; base inchangée', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    for (const c of [
      {},
      { commentaire: '' },
      { commentaire: '   ' },
      { commentaire: 'x'.repeat(501) },
      { commentaire: 12 },
      { commentaire: 'ok', autre: 1 },
    ]) {
      await refuse(ctx, m.chef, id, 'rejeter', 400, undefined, c);
    }
    expect(await statutFeuille(ctx, id)).toBe('soumise');
  });

  it('FDT-14 : rejeter : brouillon ou validée → 422 statut_invalide ; la ressource 403 ; ressource tierce 404 ; base inchangée', async () => {
    const { m, id } = await base(ctx);
    const c = { commentaire: 'Non.' };
    await refuse(ctx, m.chef, id, 'rejeter', 422, 'statut_invalide', c);
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse(ctx, m.alice, id, 'rejeter', 403, undefined, c);
    await refuse(ctx, m.bob, id, 'rejeter', 404, undefined, c);
    await agir(ctx, m.admin, id, 'valider');
    await refuse(ctx, m.chef, id, 'rejeter', 422, 'statut_invalide', c);
  });

  it('FDT-15 : rejetée, puis PUT : la feuille reste rejetée (commentaire gardé) jusqu’à la soumission', async () => {
    const { m, a, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'rejeter', { commentaire: 'Non.' });
    const res = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] }],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect((await lireFeuille(ctx, m.alice, S2)).feuille).toMatchObject({
      statut: 'rejetee',
      commentaire: 'Non.',
    });
  });
});
