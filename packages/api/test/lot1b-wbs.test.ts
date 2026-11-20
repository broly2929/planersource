import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import { creerActivite, creerMonde, planning, url, type Monde } from './lot1-t2-helpers.js';

/** Contrat D-041 : `rang` = position finale dans la fratrie d'arrivée (1 à n). */
describe('WBS : position finale d’un élément déplacé (lot 1b, D-041)', () => {
  const ctx = useTestApp();

  /** Ids des enfants de `parent` (null = racine), dans l'ordre, avec leurs rangs. */
  async function fratrie(m: Monde, parent: number | null) {
    const lignes = await planning(ctx, m.chef, m.projet.id);
    return lignes.filter((e) => e.parent_id === parent).map((e) => [e.id, e.rang]);
  }
  const ordre = (f: unknown[][]) => f.map(([id]) => id);

  async function deplacer(m: Monde, id: number, corps: Record<string, unknown>) {
    const res = await appel(ctx, m.chef).post(url.deplacer(id), corps);
    expect(res.statusCode).toBe(200);
  }

  /** Éléments distincts ayant une entrée de modification dans l'historique du projet. */
  async function elementsHistorises(m: Monde): Promise<number[]> {
    const { rows } = await ctx.pool.query<{ entite_id: number }>(
      `SELECT DISTINCT entite_id FROM historique
        WHERE projet_id = $1 AND operation = 'modification' ORDER BY entite_id`,
      [m.projet.id],
    );
    return rows.map((r) => r.entite_id);
  }

  it('WBS-13 : rang = position finale dans une même fratrie, rangs consécutifs, seul l’élément déplacé historisé', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const c = await creerActivite(ctx, m.chef, m.projet.id);

    await deplacer(m, b.id, { rang: 3 });
    expect(await fratrie(m, null)).toEqual([
      [a.id, 1],
      [c.id, 2],
      [b.id, 3],
    ]);
    expect(await elementsHistorises(m)).toEqual([b.id]);

    await deplacer(m, b.id, { rang: 1 });
    expect(await fratrie(m, null)).toEqual([
      [b.id, 1],
      [a.id, 2],
      [c.id, 3],
    ]);
    expect(await elementsHistorises(m)).toEqual([b.id]);

    await deplacer(m, a.id, { rang: 2 });
    expect(await fratrie(m, null)).toEqual([
      [b.id, 1],
      [a.id, 2],
      [c.id, 3],
    ]);
    expect(await elementsHistorises(m)).toEqual([b.id]);
  });

  it('WBS-14 : rang hors bornes ramené dans les bornes, sans rang = fin, changement de parent', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const c = await creerActivite(ctx, m.chef, m.projet.id);

    await deplacer(m, a.id, { rang: 99 });
    expect(ordre(await fratrie(m, null))).toEqual([b.id, c.id, a.id]);
    await deplacer(m, a.id, {});
    expect(await fratrie(m, null)).toEqual([
      [b.id, 1],
      [c.id, 2],
      [a.id, 3],
    ]);

    // changement de parent : A sous D (D1, D2) à rang 2 → D1, A, D2 ; la racine est recompactée
    const d = await creerActivite(ctx, m.chef, m.projet.id);
    const d1 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: d.id });
    const d2 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: d.id });
    await deplacer(m, a.id, { parent_id: d.id, rang: 2 });
    expect(await fratrie(m, d.id)).toEqual([
      [d1.id, 1],
      [a.id, 2],
      [d2.id, 3],
    ]);
    expect(await fratrie(m, null)).toEqual([
      [b.id, 1],
      [c.id, 2],
      [d.id, 3],
    ]);

    // rang n+1 (n = fratrie d'arrivée, élément compris) : fin de fratrie
    const e = await creerActivite(ctx, m.chef, m.projet.id);
    const e1 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: e.id });
    const e2 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: e.id });
    await deplacer(m, c.id, { parent_id: e.id, rang: 3 });
    expect(await fratrie(m, e.id)).toEqual([
      [e1.id, 1],
      [e2.id, 2],
      [c.id, 3],
    ]);
  });
});
