// Lot 3f-1, arborescence (D-108 (2)) : ACT-36 à ACT-39.
// Rouges attendus : les quatre (code `parent_assigne` ou `dependance_hierarchie` absent du 422).
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import {
  attendreRepos,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerMonde,
  url,
} from './lot1-t2-helpers.js';

const ctx = useTestApp();

type Requeteur = Pick<pg.Pool, 'query'>;

/** Contenu de toutes les tables sauf `session` et `schema_version`, trié (historique compris). */
async function empreinte(q: Requeteur = ctx.pool): Promise<Record<string, string[]>> {
  const { rows: tables } = await q.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN ('session', 'schema_version')
      ORDER BY tablename`,
  );
  const resultat: Record<string, string[]> = {};
  for (const { tablename } of tables) {
    const { rows } = await q.query<{ ligne: string }>(
      `SELECT t::text AS ligne FROM "${tablename}" t ORDER BY 1`,
    );
    resultat[tablename] = rows.map((r) => r.ligne);
  }
  return resultat;
}

/** Refus attendu : 422 avec ce corps exact, base identique (historique compris). */
async function refuse(
  envoyer: () => ReturnType<ReturnType<typeof appel>['post']>,
  code: string,
): Promise<void> {
  await attendreRepos(ctx);
  const avant = await empreinte();
  const res = await envoyer();
  expect(res.statusCode, res.body).toBe(422);
  expect(res.json()).toEqual({ erreur: 'Règle de planning non respectée', code });
  await attendreRepos(ctx);
  const apres = await empreinte();
  expect(apres['historique']).toEqual(avant['historique']);
  expect(apres).toEqual(avant);
}

describe('3f-1, codes parent_assigne et dependance_hierarchie (D-108 (2))', () => {
  it('ACT-36 : déplacer une activité sous une activité assignée → 422 parent_assigne, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const cible = await creerActivite(ctx, m.chef, m.projet.id);
    await creerAssignation(ctx, m.chef, cible.id, m.alice.id);
    const source = await creerActivite(ctx, m.chef, m.projet.id);
    await refuse(
      () => appel(ctx, m.chef).post(url.deplacer(source.id), { parent_id: cible.id }),
      'parent_assigne',
    );
  });

  it('ACT-37 : créer une sous-activité sous une activité assignée → 422 parent_assigne, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.chef, m.projet.id);
    await creerAssignation(ctx, m.chef, parent.id, m.alice.id);
    await refuse(
      () =>
        appel(ctx, m.chef).post(url.activites(m.projet.id), {
          nom: 'Sous-activité',
          parent_id: parent.id,
        }),
      'parent_assigne',
    );
  });

  it('ACT-38 : déplacer une activité sous un élément auquel une dépendance la relie → 422 dependance_hierarchie, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const p = await creerActivite(ctx, m.chef, m.projet.id);
    const x = await creerActivite(ctx, m.chef, m.projet.id);
    await creerDependance(ctx, m.chef, m.projet.id, p.id, x.id);
    await refuse(
      () => appel(ctx, m.chef).post(url.deplacer(x.id), { parent_id: p.id }),
      'dependance_hierarchie',
    );
  });

  it('ACT-39 : créer une dépendance entre une activité et son parent → 422 dependance_hierarchie, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const p = await creerActivite(ctx, m.chef, m.projet.id);
    const x = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: p.id });
    await refuse(
      () =>
        appel(ctx, m.chef).post(url.dependances(m.projet.id), {
          predecesseur_id: p.id,
          successeur_id: x.id,
        }),
      'dependance_hierarchie',
    );
  });
});
