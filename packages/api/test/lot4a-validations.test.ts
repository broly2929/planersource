import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, creerActeur, creerProjet } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import { agir, idFeuille, imputer, j, lireValidations, S1, S2 } from './lot4a-helpers.js';

/**
 * Lot 4a : GET /api/validations?semaine=… (SPEC §7 « Écran de validation », « API et règles (lot 4a,
 * D-118) », D-118 (9)). Date du jour du serveur : mercredi 13/01/2027.
 */
const AUJOURDHUI = '2027-01-13';

interface ProjetValidation {
  projet_id: number;
  projet_code: string;
  valide: boolean;
  peut_valider: boolean;
}

interface FeuilleValidation {
  feuille_id: number;
  ressource_id: number;
  ressource_nom: string;
  statut: string;
  projets: ProjetValidation[];
}

/**
 * P (code « PROJ-B », chef `chef`) et Q (code « proj-a », chef `autreChef`). Alice (« Zoé Alice ») :
 * imputations sur P et Q ; Bob (« Bob ») : imputation sur P seul. Le tri par nom place Bob avant
 * Alice, à l'inverse des identifiants.
 */
async function base(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  await ctx.pool.query("UPDATE projet SET code = 'PROJ-B' WHERE id = $1", [m.projet.id]);
  await ctx.pool.query("UPDATE projet SET code = 'proj-a' WHERE id = $1", [m.autre.id]);
  await ctx.pool.query("UPDATE utilisateur SET nom = 'Zoé Alice' WHERE id = $1", [m.alice.id]);
  await ctx.pool.query("UPDATE utilisateur SET nom = 'Bob' WHERE id = $1", [m.bob.id]);
  await affecter(ctx, m.autre.id, m.alice.id);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5);
  const b = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 3);
  const c = await tache(ctx, m.chef, m.projet.id, m.bob.id, 2);
  await imputer(ctx, m.alice, S2, [
    { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    { assignation_id: b.assignation.id, imputations: [{ jour: j(12), charge: 1 }] },
  ]);
  await imputer(ctx, m.bob, S2, [
    { assignation_id: c.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
  ]);
  const fa = (await idFeuille(ctx, m.alice.id, S2))!;
  const fb = (await idFeuille(ctx, m.bob.id, S2))!;
  return { m, fa, fb };
}

async function lire(ctx: TestCtx, qui: Parameters<typeof lireValidations>[1], semaine = S2) {
  const res = await lireValidations(ctx, qui, semaine);
  expect(res.statusCode, res.body).toBe(200);
  return (res.json() as { feuilles: FeuilleValidation[] }).feuilles;
}

describe('Liste des validations : GET /api/validations (lot 4a)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('VAL-1 : chef de P : feuilles touchant P (brouillons compris), triées par nom de ressource ; projets triés par code sans casse ; peut_valider sur ses projets seulement', async () => {
    const { m, fa, fb } = await base(ctx);
    expect(await lire(ctx, m.chef)).toEqual([
      {
        feuille_id: fb,
        ressource_id: m.bob.id,
        ressource_nom: 'Bob',
        statut: 'brouillon',
        projets: [
          { projet_id: m.projet.id, projet_code: 'PROJ-B', valide: false, peut_valider: true },
        ],
      },
      {
        feuille_id: fa,
        ressource_id: m.alice.id,
        ressource_nom: 'Zoé Alice',
        statut: 'brouillon',
        projets: [
          { projet_id: m.autre.id, projet_code: 'proj-a', valide: false, peut_valider: false },
          { projet_id: m.projet.id, projet_code: 'PROJ-B', valide: false, peut_valider: true },
        ],
      },
    ]);
  });

  it('VAL-2 : chef de Q : la seule feuille qui touche Q (Alice)', async () => {
    const { m, fa } = await base(ctx);
    const f = await lire(ctx, m.autreChef);
    expect(f.map((x) => x.feuille_id)).toEqual([fa]);
    expect(f[0]!.projets.map((p) => [p.projet_code, p.peut_valider])).toEqual([
      ['proj-a', true],
      ['PROJ-B', false],
    ]);
  });

  it('VAL-3 : administrateur : toutes les feuilles, peut_valider partout ; chef sans projet concerné et ressources : liste vide', async () => {
    const { m, fa, fb } = await base(ctx);
    const f = await lire(ctx, m.admin);
    expect(f.map((x) => x.feuille_id)).toEqual([fb, fa]);
    expect(f.flatMap((x) => x.projets.map((p) => p.peut_valider))).toEqual([true, true, true]);
    const tiers = await creerActeur(ctx, 'tiers@example.test', 'chef_de_projet');
    await creerProjet(ctx, m.admin, { chef_id: tiers.id });
    for (const qui of [m.alice, m.bob, tiers]) expect(await lire(ctx, qui)).toEqual([]);
  });

  it('VAL-4 : statut et `valide` suivent le cycle : soumise, P validé par son chef', async () => {
    const { m, fa } = await base(ctx);
    await agir(ctx, m.alice, fa, 'soumettre');
    await agir(ctx, m.chef, fa, 'valider');
    const f = (await lire(ctx, m.chef)).find((x) => x.feuille_id === fa)!;
    expect(f.statut).toBe('soumise');
    expect(f.projets.map((p) => [p.projet_code, p.valide])).toEqual([
      ['proj-a', false],
      ['PROJ-B', true],
    ]);
  });

  it('VAL-5 : autre semaine : seules ses feuilles existantes ; semaine sans feuille : liste vide', async () => {
    const { m } = await base(ctx);
    expect(await lire(ctx, m.admin, S1)).toEqual([]);
    await imputer(ctx, m.alice, S1, [
      {
        assignation_id: (
          await ctx.pool.query<{ id: number }>(
            'SELECT id FROM assignation WHERE ressource_id = $1 AND projet_id = $2',
            [m.alice.id, m.projet.id],
          )
        ).rows[0]!.id,
        imputations: [{ jour: j(5), charge: 1 }],
      },
    ]);
    const f = await lire(ctx, m.chef, S1);
    expect(f.map((x) => [x.ressource_id, x.projets.map((p) => p.projet_code)])).toEqual([
      [m.alice.id, ['PROJ-B']],
    ]);
  });

  it('VAL-6 : sans session 401 ; semaine absente, pas un lundi ou hors 2000–2099 : 400 ; rien n’est écrit', async () => {
    const { m } = await base(ctx);
    const avant = await empreinte(ctx);
    expect((await lireValidations(ctx, undefined, S2)).statusCode).toBe(401);
    for (const s of [undefined, '2027-01-12', '1999-12-27', '2100-01-04', 'x']) {
      expect((await lireValidations(ctx, m.chef, s)).statusCode).toBe(400);
    }
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
