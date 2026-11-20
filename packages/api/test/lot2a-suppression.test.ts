import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import { creerActivite, creerAssignation, creerMonde } from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';

describe('Suppression d’un projet assigné (lot 2a-I, D-045)', () => {
  const ctx = useTestApp();

  const compter = async (sql: string, params: unknown[]): Promise<number> =>
    Number(((await ctx.pool.query(sql, params)).rows[0] as { n: string }).n);

  it('PRJ-23 : l’administrateur supprime un projet avec affectation, activité et assignation → 204, tout a disparu', async () => {
    const m = await creerMonde(ctx);
    const activite = await creerActivite(ctx, m.admin, m.projet.id);
    await creerAssignation(ctx, m.admin, activite.id, m.alice.id);
    const res = await appel(ctx, m.admin).delete(`/api/projets/${m.projet.id}`);
    expect(res.statusCode).toBe(204);
    const id = [m.projet.id];
    expect(await compter('SELECT count(*) AS n FROM projet WHERE id = $1', id)).toBe(0);
    expect(await compter('SELECT count(*) AS n FROM element WHERE projet_id = $1', id)).toBe(0);
    expect(
      await compter('SELECT count(*) AS n FROM affectation_projet WHERE projet_id = $1', id),
    ).toBe(0);
    expect(await compter('SELECT count(*) AS n FROM assignation WHERE projet_id = $1', id)).toBe(0);
    expect(await compter('SELECT count(*) AS n FROM assignation', [])).toBe(0);
  });

  it('PRJ-23 : supprimer l’affectation d’une ressource assignée reste refusé (409), base inchangée', async () => {
    const m = await creerMonde(ctx);
    const activite = await creerActivite(ctx, m.admin, m.projet.id);
    await creerAssignation(ctx, m.admin, activite.id, m.alice.id);
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT id FROM affectation_projet WHERE projet_id = $1 AND ressource_id = $2',
      [m.projet.id, m.alice.id],
    );
    const avant = await empreinte(ctx);
    const res = await appel(ctx, m.admin).delete(`/api/affectations/${rows[0]!.id}`);
    expect(res.statusCode).toBe(409);
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
