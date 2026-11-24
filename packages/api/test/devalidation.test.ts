import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, type Acteur } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  action,
  agir,
  idFeuille,
  imputer,
  j,
  lireFeuille,
  S2,
  statutFeuille,
} from './lot4a-helpers.js';

/**
 * Dévalidation, API (DEV-I) : POST /api/feuilles/:id/devalider (SPEC §7 « Dévalidation (D-176) »,
 * D-176 (2)). Date du jour du serveur : mercredi 13/01/2027.
 */
const AUJOURDHUI = '2027-01-13';
const INTROUVABLE = { erreur: 'Feuille introuvable' };
const INTERDIT = { erreur: 'Interdit' };

/**
 * P (chef `chef`) : A, Alice 5 j ; Q (chef `autreChef`) : B, Alice 3 j. Imputations d'Alice sur la
 * semaine du 11/01 : A et, si `surQ`, B (sinon Q n'est pas concerné). Renvoie la feuille (brouillon).
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
  return { m, id };
}

/** Feuille soumise (par Alice), puis validée par chaque acteur donné, dans l'ordre. */
async function soumiseValidee(ctx: TestCtx, surQ: boolean, validateurs: (m: Monde) => Acteur[]) {
  const { m, id } = await base(ctx, surQ);
  await agir(ctx, m.alice, id, 'soumettre');
  for (const v of validateurs(m)) await agir(ctx, v, id, 'valider');
  return { m, id };
}
type Monde = Awaited<ReturnType<typeof base>>['m'];

const devalider = (ctx: TestCtx, qui: Acteur | undefined, id: number | string) =>
  appel(ctx, qui).post(`/api/feuilles/${id}/devalider`);

/** Dévalidation attendue en 200 ; renvoie la réponse décodée. */
async function devaliderOk(ctx: TestCtx, qui: Acteur, id: number) {
  const res = await devalider(ctx, qui, id);
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as Awaited<ReturnType<typeof lireFeuille>>;
}

/** Dévalidation refusée : statut, corps exact attendu, base strictement inchangée. */
async function refuse(
  ctx: TestCtx,
  qui: Acteur | undefined,
  id: number | string,
  statut: number,
  attendu?: Record<string, unknown>,
) {
  const avant = await empreinte(ctx);
  const res = await devalider(ctx, qui, id);
  expect(res.statusCode, res.body).toBe(statut);
  if (attendu) expect(corps(res)).toEqual(attendu);
  expect(await empreinte(ctx)).toEqual(avant);
}

const refuse422 = async (ctx: TestCtx, qui: Acteur, id: number, code: string) => {
  const avant = await empreinte(ctx);
  const res = await devalider(ctx, qui, id);
  expect(res.statusCode, res.body).toBe(422);
  expect(corps(res)).toMatchObject({ code });
  expect(await empreinte(ctx)).toEqual(avant);
};

/** Validations en base de la feuille : (projet, validateur), triées par projet. */
async function validationsEnBase(ctx: TestCtx, id: number) {
  const { rows } = await ctx.pool.query<{ projet_id: number; validateur_id: number }>(
    'SELECT projet_id, validateur_id FROM validation_feuille WHERE feuille_id = $1 ORDER BY projet_id',
    [id],
  );
  return rows;
}

describe('Dévalidation : POST /api/feuilles/:id/devalider (DEV-I)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('DEV-12 : l’administrateur dévalide une feuille validée sur P et Q : 200, soumise, aucune validation ; réponse de même forme que le GET', async () => {
    const { m, id } = await soumiseValidee(ctx, true, (x) => [x.chef, x.autreChef]);
    expect(await statutFeuille(ctx, id)).toBe('validee');
    expect(await validationsEnBase(ctx, id)).toHaveLength(2);

    const r = await devaliderOk(ctx, m.admin, id);
    expect(r.feuille.statut).toBe('soumise');
    expect(r.feuille.validations).toEqual([]);
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect(await validationsEnBase(ctx, id)).toEqual([]);
    expect(r).toEqual(await lireFeuille(ctx, m.admin, S2, m.alice.id));
  });

  it('DEV-13 : le chef de P dévalide : seule la validation de P est supprimée, celle de Q est conservée, statut soumise', async () => {
    const { m, id } = await soumiseValidee(ctx, true, (x) => [x.chef, x.autreChef]);

    const r = await devaliderOk(ctx, m.chef, id);
    expect(r.feuille.statut).toBe('soumise');
    expect(r.feuille.validations).toEqual([
      { projet_id: m.autre.id, validateur_id: m.autreChef.id, date: AUJOURDHUI },
    ]);
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect(await validationsEnBase(ctx, id)).toEqual([
      { projet_id: m.autre.id, validateur_id: m.autreChef.id },
    ]);
  });

  it('DEV-14 : soumise partiellement validée, dévalidée par son validateur : plus aucune validation ; la ressource peut ensuite rappeler (brouillon)', async () => {
    const { m, id } = await soumiseValidee(ctx, true, (x) => [x.chef]);
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect(await validationsEnBase(ctx, id)).toHaveLength(1);

    const r = await devaliderOk(ctx, m.chef, id);
    expect(r.feuille.statut).toBe('soumise');
    expect(r.feuille.validations).toEqual([]);
    expect(await validationsEnBase(ctx, id)).toEqual([]);

    await agir(ctx, m.alice, id, 'rappeler');
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
  });

  it('DEV-15 : après la dévalidation du chef de P (Q reste validé) : rappeler 422 deja_validee, base inchangée ; rejeter par le chef de P 200, rejetée, validations effacées', async () => {
    const { m, id } = await soumiseValidee(ctx, true, (x) => [x.chef, x.autreChef]);
    await devaliderOk(ctx, m.chef, id);

    const avant = await empreinte(ctx);
    const res = await action(ctx, m.alice, id, 'rappeler', {});
    expect(res.statusCode, res.body).toBe(422);
    expect(corps(res)).toMatchObject({ code: 'deja_validee' });
    expect(await empreinte(ctx)).toEqual(avant);

    await agir(ctx, m.chef, id, 'rejeter', { commentaire: 'À revoir' });
    expect(await statutFeuille(ctx, id)).toBe('rejetee');
    expect(await validationsEnBase(ctx, id)).toEqual([]);
  });

  it('DEV-16 : sans session 401 ; identifiant mal formé, inconnu ou feuille non visible 404 (corps « Feuille introuvable ») ; base inchangée', async () => {
    const { m, id } = await soumiseValidee(ctx, true, (x) => [x.chef]);
    await refuse(ctx, undefined, id, 401);
    await refuse(ctx, m.chef, 'abc', 404, INTROUVABLE);
    await refuse(ctx, m.chef, 999999, 404, INTROUVABLE);
    await refuse(ctx, m.chef, 99999999999, 404, INTROUVABLE);
    await refuse(ctx, m.bob, id, 404, INTROUVABLE);
    await refuse(ctx, m.admin, 999999, 404, INTROUVABLE);
  });

  it('DEV-17 : 403 pour qui voit la feuille sans écrire sur un projet concerné (chef de Q, Q sans imputation) et pour la ressource sur sa feuille validée ; base inchangée', async () => {
    const { m, id } = await soumiseValidee(ctx, false, (x) => [x.admin]);
    expect(await statutFeuille(ctx, id)).toBe('validee');
    await refuse(ctx, m.autreChef, id, 403, INTERDIT);
    await refuse(ctx, m.alice, id, 403, INTERDIT);
  });

  it('DEV-18 : brouillon et feuille rejetée : 422 statut_invalide (chef et administrateur), base inchangée', async () => {
    const { m, id } = await base(ctx);
    await refuse422(ctx, m.chef, id, 'statut_invalide');
    await refuse422(ctx, m.admin, id, 'statut_invalide');

    await agir(ctx, m.alice, id, 'soumettre');
    await agir(ctx, m.chef, id, 'rejeter', { commentaire: 'À revoir' });
    expect(await statutFeuille(ctx, id)).toBe('rejetee');
    await refuse422(ctx, m.chef, id, 'statut_invalide');
    await refuse422(ctx, m.admin, id, 'statut_invalide');
  });

  it('DEV-19 : soumise sans validation (chef, administrateur) ou dont la seule validation porte sur P (chef de Q) : 422 rien_a_devalider, base inchangée', async () => {
    const { m, id } = await base(ctx);
    await agir(ctx, m.alice, id, 'soumettre');
    await refuse422(ctx, m.chef, id, 'rien_a_devalider');
    await refuse422(ctx, m.admin, id, 'rien_a_devalider');

    await agir(ctx, m.chef, id, 'valider');
    expect(await statutFeuille(ctx, id)).toBe('soumise');
    expect(await validationsEnBase(ctx, id)).toEqual([
      { projet_id: m.projet.id, validateur_id: m.chef.id },
    ]);
    await refuse422(ctx, m.autreChef, id, 'rien_a_devalider');
  });

  it('DEV-20 : ordre des refus : 401 avant 404, 404 avant 403, 403 avant statut_invalide, statut_invalide avant rien_a_devalider', async () => {
    const { m, id } = await base(ctx, false);
    expect(await statutFeuille(ctx, id)).toBe('brouillon');
    // 401 avant 404 : identifiant inconnu sans session.
    await refuse(ctx, undefined, 999999, 401);
    // 404 avant 403 et avant statut_invalide : ressource tierce sur un brouillon.
    await refuse(ctx, m.bob, id, 404, INTROUVABLE);
    // 403 avant statut_invalide : la ressource, puis le chef de Q (Q non concerné), sur un brouillon.
    await refuse(ctx, m.alice, id, 403, INTERDIT);
    await refuse(ctx, m.autreChef, id, 403, INTERDIT);
    // statut_invalide avant rien_a_devalider : le chef de P sur un brouillon sans validation.
    await refuse422(ctx, m.chef, id, 'statut_invalide');
    expect(await validationsEnBase(ctx, id)).toEqual([]);
  });
});
