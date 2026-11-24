import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, type Acteur } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  action,
  agir,
  chargesAssignation,
  clore,
  historiqueAssignation,
  idFeuille,
  imputationsEnBase,
  imputer,
  j,
  lireFeuille,
  S2,
  statutFeuille,
  urlFeuilles,
  type Feuille,
  type LigneEnvoyee,
} from './lot4a-helpers.js';

/**
 * AUT-I : saisie des imputations par l'administrateur pour autrui, API (SPEC §7 « Saisie pour
 * autrui par l'administrateur (D-181) », D-181, D-182). Date du jour du serveur : mercredi
 * 13/01/2027.
 */
const AUJOURDHUI = '2027-01-13';

/** P (chef `chef`) : A, Alice 5 j ; Q (chef `autreChef`) : B, Alice 3 j ; C, Bob 4 j sur P. */
async function base(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  await affecter(ctx, m.autre.id, m.alice.id);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5, { nom: 'A' });
  const b = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 3, { nom: 'B' });
  const c = await tache(ctx, m.chef, m.projet.id, m.bob.id, 4, { nom: 'C' });
  return { m, a, b, c };
}

const ligne = (
  assignationId: number,
  jour: number,
  charge: number,
  reste?: number,
): LigneEnvoyee => ({
  assignation_id: assignationId,
  imputations: [{ jour: j(jour), charge }],
  ...(reste === undefined ? {} : { reste }),
});

/** PUT /api/feuilles?semaine=…&ressource_id=… avec le corps donné tel quel. */
const ecrirePour = (
  ctx: TestCtx,
  qui: Acteur | undefined,
  ressourceId: number | string,
  corpsEnvoye: unknown,
  semaine: string | undefined = S2,
) =>
  ctx.app.inject({
    method: 'PUT',
    url: urlFeuilles(semaine, ressourceId),
    payload: corpsEnvoye as never,
    headers: qui ? { cookie: qui.cookie } : {},
  });

/** PUT pour autrui attendu en 200 ; renvoie la feuille. */
async function imputerPour(
  ctx: TestCtx,
  qui: Acteur,
  ressourceId: number,
  lignes: LigneEnvoyee[],
): Promise<Feuille> {
  const res = await ecrirePour(ctx, qui, ressourceId, { lignes });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Feuille;
}

/** PUT pour autrui refusé : statut et code attendus, base strictement inchangée. */
async function refusePour(
  ctx: TestCtx,
  qui: Acteur | undefined,
  ressourceId: number | string,
  corpsEnvoye: unknown,
  statut: number,
  code?: string,
  semaine: string | undefined = S2,
) {
  const avant = await empreinte(ctx);
  const res = await ecrirePour(ctx, qui, ressourceId, corpsEnvoye, semaine);
  expect(res.statusCode, res.body).toBe(statut);
  if (code) expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

/** Action (soumettre, rappeler) refusée : statut et code attendus, base inchangée. */
async function refuseAction(
  ctx: TestCtx,
  qui: Acteur,
  id: number,
  verbe: 'soumettre' | 'rappeler',
  statut: number,
  code: string,
) {
  const avant = await empreinte(ctx);
  const res = await action(ctx, qui, id, verbe);
  expect(res.statusCode, `${verbe} : ${res.body}`).toBe(statut);
  expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
}

describe('Saisie pour autrui par l’administrateur, API (AUT-I)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('AUT-1 : l’administrateur saisit pour Alice : feuille d’Alice en brouillon, imputations, charge réelle ; réponse égale au GET', async () => {
    const { m, a } = await base(ctx);
    const f = await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 1)]);
    expect(f.feuille).toMatchObject({
      ressource_id: m.alice.id,
      semaine: S2,
      statut: 'brouillon',
      validations: [],
    });
    expect(f.feuille.id).not.toBeNull();
    expect(await idFeuille(ctx, m.alice.id, S2)).toBe(f.feuille.id);
    expect(await idFeuille(ctx, m.admin.id, S2)).toBeNull();
    expect(await imputationsEnBase(ctx)).toEqual([
      { assignation_id: a.assignation.id, jour: j(11), charge: 1 },
    ]);
    expect(await chargesAssignation(ctx, a.assignation.id)).toEqual({
      charge_assignee: 5,
      charge_reelle: 1,
      reste_a_faire: 4,
    });
    expect(f).toEqual(await lireFeuille(ctx, m.admin, S2, m.alice.id));
  });

  it('AUT-2 : reste modifié par l’administrateur pour Alice : auteur = l’administrateur ; témoin : modifié par Alice, auteur = Alice', async () => {
    const { m, a, b } = await base(ctx);
    await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 1.5)]);
    expect(await historiqueAssignation(ctx, a.assignation.id)).toEqual(
      expect.arrayContaining([
        {
          operation: 'modification',
          champ: 'reste_a_faire',
          utilisateur_id: m.admin.id,
          ancienne_valeur: 5,
          nouvelle_valeur: 3.5,
        },
      ]),
    );
    const avant = (await historiqueAssignation(ctx, b.assignation.id)).length;
    await imputer(ctx, m.alice, S2, [ligne(b.assignation.id, 12, 1)]);
    expect((await historiqueAssignation(ctx, b.assignation.id)).slice(avant)).toEqual([
      {
        operation: 'modification',
        champ: 'reste_a_faire',
        utilisateur_id: m.alice.id,
        ancienne_valeur: 3,
        nouvelle_valeur: 2,
      },
    ]);
  });

  it('AUT-3 : pour autrui, jour postérieur au jour du serveur : 422 jour_futur, base inchangée', async () => {
    const { m, a } = await base(ctx);
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 14, 1)] },
      422,
      'jour_futur',
    );
  });

  it('AUT-4 : pour autrui, ligne fermée : 422 ligne_fermee (charge modifiée, puis reste modifié), base inchangée', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [ligne(a.assignation.id, 11, 1)]);
    await clore(ctx, m.chef, a.activite.id);
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 11, 0.5)] },
      422,
      'ligne_fermee',
    );
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 11, 1, 2)] },
      422,
      'ligne_fermee',
    );
  });

  it('AUT-5 : pour autrui, feuille soumise puis validée : 422 feuille_verrouillee, base inchangée', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [ligne(a.assignation.id, 11, 1)]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await agir(ctx, m.alice, id, 'soumettre');
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 11, 0.5)] },
      422,
      'feuille_verrouillee',
    );
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('validee');
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 11, 0.5)] },
      422,
      'feuille_verrouillee',
    );
  });

  it('AUT-6 : pour autrui, assignation de Bob dans la feuille d’Alice : 422 assignation_invalide ; corps invalide : 400 ; base inchangée', async () => {
    const { m, a, c } = await base(ctx);
    // la ligne d'Alice seule est acceptée pour l'administrateur ; les refus partent de cet état
    await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 0.5)]);
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(c.assignation.id, 11, 1)] },
      422,
      'assignation_invalide',
    );
    await refusePour(
      ctx,
      m.admin,
      m.alice.id,
      { lignes: [ligne(a.assignation.id, 11, 1), ligne(c.assignation.id, 11, 1)] },
      422,
      'assignation_invalide',
    );
    await refusePour(ctx, m.admin, m.alice.id, { lignes: 'x' }, 400);
    await refusePour(ctx, m.admin, m.alice.id, { lignes: [], en_plus: 1 }, 400);
    await refusePour(ctx, m.admin, m.alice.id, { lignes: [ligne(a.assignation.id, 20, 1)] }, 400);
  });

  it('AUT-7 : droits : sans session 401 ; ressource_id inconnu, mal formé ou hors plage 404 ; Bob 404 ; chef qui voit la feuille 403 ; Alice avec son propre ressource_id 200 ; base inchangée', async () => {
    const { m, a } = await base(ctx);
    const envoi = { lignes: [ligne(a.assignation.id, 11, 1)] };
    await refusePour(ctx, undefined, m.alice.id, envoi, 401);
    for (const id of ['999999', 'abc', '99999999999', '0']) {
      await refusePour(ctx, m.admin, id, envoi, 404);
    }
    await refusePour(ctx, m.bob, m.alice.id, envoi, 404);
    await refusePour(ctx, m.chef, m.alice.id, envoi, 403);
    const f = await imputerPour(ctx, m.alice, m.alice.id, [ligne(a.assignation.id, 11, 1)]);
    expect(f.feuille).toMatchObject({ ressource_id: m.alice.id, statut: 'brouillon' });
    expect(f).toEqual(await lireFeuille(ctx, m.alice, S2));
    expect(await imputationsEnBase(ctx)).toEqual([
      { assignation_id: a.assignation.id, jour: j(11), charge: 1 },
    ]);
  });

  it('AUT-8 : ordre des refus : 401, puis 400, puis 404, puis 403, puis 422', async () => {
    const { m, a } = await base(ctx);
    const futur = { lignes: [ligne(a.assignation.id, 14, 1)] };
    // 401 avant 400 et 404 : sans session, corps invalide, ressource inconnue
    await refusePour(ctx, undefined, 999999, { lignes: 'x' }, 401);
    // 400 avant 404 : administrateur, corps invalide, ressource inconnue
    await refusePour(ctx, m.admin, 999999, { lignes: 'x' }, 400);
    // 400 avant 404 : semaine invalide
    await refusePour(ctx, m.admin, 999999, futur, 400, undefined, '2027-01-12');
    // 400 avant 403 : chef qui voit la feuille d'Alice, corps invalide
    await refusePour(ctx, m.chef, m.alice.id, { lignes: 'x' }, 400);
    // 404 avant 403 : chef, ressource inconnue
    await refusePour(ctx, m.chef, 999999, futur, 404);
    // 403 avant 422 : chef, corps qui donnerait jour_futur
    await refusePour(ctx, m.chef, m.alice.id, futur, 403);
    // 404 avant 422 : Bob, corps qui donnerait jour_futur
    await refusePour(ctx, m.bob, m.alice.id, futur, 404);
    // enfin le 422 pour l'administrateur
    await refusePour(ctx, m.admin, m.alice.id, futur, 422, 'jour_futur');
  });

  it('AUT-9 : ressource_id d’un utilisateur existant non ressource (chef) : une ligne 422 assignation_invalide ; lignes vides 200, id null, rien n’est écrit', async () => {
    const { m, a } = await base(ctx);
    await refusePour(
      ctx,
      m.admin,
      m.chef.id,
      { lignes: [ligne(a.assignation.id, 11, 1)] },
      422,
      'assignation_invalide',
    );
    const avant = await empreinte(ctx);
    const res = await ecrirePour(ctx, m.admin, m.chef.id, { lignes: [] });
    expect(res.statusCode, res.body).toBe(200);
    const f = res.json() as Feuille;
    expect(f.feuille).toMatchObject({ id: null, ressource_id: m.chef.id, semaine: S2 });
    expect(f).toEqual(await lireFeuille(ctx, m.admin, S2, m.chef.id));
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('AUT-10-r1 : l’administrateur soumet pour Alice : 200, soumise ; feuille_vide ; statut_invalide', async () => {
    const { m, a } = await base(ctx);
    await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 1)]);
    await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 0)]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await refuseAction(ctx, m.admin, id, 'soumettre', 422, 'feuille_vide');
    await imputerPour(ctx, m.admin, m.alice.id, [ligne(a.assignation.id, 11, 1)]);
    await agir(ctx, m.admin, id, 'soumettre');
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect((await lireFeuille(ctx, m.alice, S2)).feuille.statut).toBe('soumise');
    await refuseAction(ctx, m.admin, id, 'soumettre', 422, 'statut_invalide');
  });

  it('AUT-11 : l’administrateur rappelle pour Alice : 200, brouillon ; deja_validee après une validation partielle', async () => {
    const { m, a, b } = await base(ctx);
    await imputerPour(ctx, m.admin, m.alice.id, [
      ligne(a.assignation.id, 11, 1),
      ligne(b.assignation.id, 12, 0.5),
    ]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await agir(ctx, m.admin, id, 'soumettre');
    await agir(ctx, m.admin, id, 'rappeler');
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
    await agir(ctx, m.admin, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    await refuseAction(ctx, m.admin, id, 'rappeler', 422, 'deja_validee');
  });

  it('AUT-12 : chaîne : validée par le chef, dévalidée par l’administrateur, rappelée, corrigée et soumise pour Alice, validée par le chef ; charge réelle = charges corrigées', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [ligne(a.assignation.id, 11, 1)]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('validee');
    const dev = await appel(ctx, m.admin).post(`/api/feuilles/${id}/devalider`);
    expect(dev.statusCode, dev.body).toBe(200);
    await agir(ctx, m.admin, id, 'rappeler');
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
    const f = await imputerPour(ctx, m.admin, m.alice.id, [
      {
        assignation_id: a.assignation.id,
        imputations: [
          { jour: j(11), charge: 2 },
          { jour: j(12), charge: 0.5 },
        ],
      },
    ]);
    expect(f.feuille.id).toBe(id);
    await agir(ctx, m.admin, id, 'soumettre');
    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('validee');
    expect(await imputationsEnBase(ctx)).toEqual([
      { assignation_id: a.assignation.id, jour: j(11), charge: 2 },
      { assignation_id: a.assignation.id, jour: j(12), charge: 0.5 },
    ]);
    expect((await chargesAssignation(ctx, a.assignation.id)).charge_reelle).toBe(2.5);
  });
});
