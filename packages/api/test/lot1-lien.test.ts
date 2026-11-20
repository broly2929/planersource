import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp } from './helpers.js';
import { appel, corps, liste } from './lot1-helpers.js';
import {
  compter,
  concurrenceForcee,
  creerActivite,
  creerDependance,
  creerJalon,
  creerMonde,
  url,
  verifierRefus,
} from './lot1-t2-helpers.js';

describe('Dépendances (lot 1, T2)', () => {
  const ctx = useTestApp();

  async function deuxActivites() {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    return { m, a, b };
  }

  it('LIEN-1 : création : type FD et délai 0 par défaut', async () => {
    const { m, a, b } = await deuxActivites();
    const res = await appel(ctx, m.chef).post(url.dependances(m.projet.id), {
      predecesseur_id: a.id,
      successeur_id: b.id,
    });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      projet_id: m.projet.id,
      predecesseur_id: a.id,
      successeur_id: b.id,
      type: 'FD',
      delai: 0,
    });
  });

  it('LIEN-2 : types DD et FF acceptés', async () => {
    const { m, a, b } = await deuxActivites();
    const c = await creerActivite(ctx, m.chef, m.projet.id);
    expect(
      await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id, { type: 'DD' }),
    ).toMatchObject({
      type: 'DD',
    });
    expect(
      await creerDependance(ctx, m.chef, m.projet.id, b.id, c.id, { type: 'FF' }),
    ).toMatchObject({
      type: 'FF',
    });
  });

  it('LIEN-3 : délai négatif accepté', async () => {
    const { m, a, b } = await deuxActivites();
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id, { delai: -2 });
    expect(d.delai).toBe(-2);
  });

  it('LIEN-4 : type inconnu → 400', async () => {
    const { m, a, b } = await deuxActivites();
    const api = appel(ctx, m.chef);
    for (const type of ['DF', 'fd', 'XX', '']) {
      const res = await api.post(url.dependances(m.projet.id), {
        predecesseur_id: a.id,
        successeur_id: b.id,
        type,
      });
      expect(res.statusCode, `type « ${type} »`).toBe(400);
    }
    expect(await compter(ctx, 'dependance')).toBe(0);
  });

  it('LIEN-5 : un jalon est prédécesseur ou successeur', async () => {
    const { m, a, b } = await deuxActivites();
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const avant = await creerDependance(ctx, m.chef, m.projet.id, j.id, a.id);
    expect(avant).toMatchObject({ predecesseur_id: j.id, successeur_id: a.id });
    const apres = await creerDependance(ctx, m.chef, m.projet.id, b.id, j.id);
    expect(apres).toMatchObject({ predecesseur_id: b.id, successeur_id: j.id });
  });

  it('LIEN-6 : A→B puis B→A refusé, rien n’est créé', async () => {
    const { m, a, b } = await deuxActivites();
    await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const res = await appel(ctx, m.chef).post(url.dependances(m.projet.id), {
      predecesseur_id: b.id,
      successeur_id: a.id,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'dependance')).toBe(1);
  });

  it('LIEN-7 : cycle A→B→C→A refusé', async () => {
    const { m, a, b } = await deuxActivites();
    const c = await creerActivite(ctx, m.chef, m.projet.id);
    await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    await creerDependance(ctx, m.chef, m.projet.id, b.id, c.id);
    const res = await appel(ctx, m.chef).post(url.dependances(m.projet.id), {
      predecesseur_id: c.id,
      successeur_id: a.id,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'dependance')).toBe(2);
  });

  it('LIEN-8 : dépendance sur soi-même → 422', async () => {
    const { m, a } = await deuxActivites();
    const res = await appel(ctx, m.chef).post(url.dependances(m.projet.id), {
      predecesseur_id: a.id,
      successeur_id: a.id,
    });
    expect(res.statusCode).toBe(422);
    expect(await compter(ctx, 'dependance')).toBe(0);
  });

  it('LIEN-9 : modifier le type ou le délai', async () => {
    const { m, a, b } = await deuxActivites();
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const api = appel(ctx, m.chef);
    const type = await api.patch(url.dependance(d.id), { type: 'FF' });
    expect(type.statusCode).toBe(200);
    expect(corps(type)).toMatchObject({ type: 'FF', delai: 0 });
    const delai = await api.patch(url.dependance(d.id), { delai: 3 });
    expect(delai.statusCode).toBe(200);
    expect(corps(delai)).toMatchObject({ type: 'FF', delai: 3 });
    expect(liste(await api.get(url.dependances(m.projet.id)))[0]).toMatchObject({
      type: 'FF',
      delai: 3,
    });
    // les extrémités ne se modifient pas
    expect((await api.patch(url.dependance(d.id), { successeur_id: a.id })).statusCode).toBe(400);
  });

  it('LIEN-10 : supprimer une dépendance', async () => {
    const { m, a, b } = await deuxActivites();
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const api = appel(ctx, m.chef);
    expect((await api.delete(url.dependance(d.id))).statusCode).toBe(204);
    expect(liste(await api.get(url.dependances(m.projet.id)))).toHaveLength(0);
    expect(await compter(ctx, 'dependance')).toBe(0);
    expect(await compter(ctx, 'element')).toBe(2);
    expect((await api.delete(url.dependance(d.id))).statusCode).toBe(404);
  });

  it('LIEN-11-r1 : chef d’un autre projet → 404 ; ressource affectée → 404 ; sans session → 401', async () => {
    const { m, a, b } = await deuxActivites();
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    await verifierRefus(ctx, m, [
      {
        methode: 'POST',
        adresse: url.dependances(m.projet.id),
        corps: { predecesseur_id: b.id, successeur_id: a.id },
      },
      { methode: 'PATCH', adresse: url.dependance(d.id), corps: { delai: 5 } },
      { methode: 'DELETE', adresse: url.dependance(d.id) },
    ]);
    expect(await compter(ctx, 'dependance')).toBe(1);
    // lecture : ni la ressource affectée (révision 6b, D-148 (2)) ni le chef d'un autre projet ne voient rien
    expect((await appel(ctx, m.alice).get(url.dependances(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx, m.autreChef).get(url.dependances(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx).get(url.dependances(m.projet.id))).statusCode).toBe(401);
  });

  it('LIEN-12 : dépendance en double → 409', async () => {
    const { m, a, b } = await deuxActivites();
    await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    const res = await appel(ctx, m.chef).post(url.dependances(m.projet.id), {
      predecesseur_id: a.id,
      successeur_id: b.id,
      type: 'DD',
    });
    expect(res.statusCode).toBe(409);
    expect(await compter(ctx, 'dependance')).toBe(1);
    expect(liste(await appel(ctx, m.chef).get(url.dependances(m.projet.id)))).toMatchObject([
      { predecesseur_id: a.id, successeur_id: b.id, type: 'FD', delai: 0 },
    ]);
  });

  it('LIEN-13 : dépendance entre deux projets → 422', async () => {
    const { m, a } = await deuxActivites();
    const etranger = await creerActivite(ctx, m.admin, m.autre.id);
    const api = appel(ctx, m.admin);
    const sens1 = await api.post(url.dependances(m.projet.id), {
      predecesseur_id: a.id,
      successeur_id: etranger.id,
    });
    expect(sens1.statusCode).toBe(422);
    const sens2 = await api.post(url.dependances(m.projet.id), {
      predecesseur_id: etranger.id,
      successeur_id: a.id,
    });
    expect(sens2.statusCode).toBe(422);
    expect(await compter(ctx, 'dependance')).toBe(0);
  });

  it('LIEN-14 : dépendance entre un élément et son ancêtre ou son descendant → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: b.id });
    const api = appel(ctx, m.chef);
    for (const [pred, succ] of [
      [a.id, b.id],
      [b.id, a.id],
      [a.id, c.id],
      [c.id, a.id],
    ] as const) {
      const res = await api.post(url.dependances(m.projet.id), {
        predecesseur_id: pred,
        successeur_id: succ,
      });
      expect(res.statusCode, `${pred} → ${succ}`).toBe(422);
    }
    expect(await compter(ctx, 'dependance')).toBe(0);
  });

  it('LIEN-15-r1 : délai de dépendance non entier → 400', async () => {
    const { m, a, b } = await deuxActivites();
    const api = appel(ctx, m.chef);
    await refusSansEffet(ctx, ['dependance'], 400, () =>
      api.post(url.dependances(m.projet.id), {
        predecesseur_id: a.id,
        successeur_id: b.id,
        delai: 1.5,
      }),
    );
    const d = await creerDependance(ctx, m.chef, m.projet.id, a.id, b.id);
    await refusSansEffet(ctx, ['dependance'], 400, () =>
      api.patch(url.dependance(d.id), { delai: 0.5 }),
    );
    expect(corps(await api.patch(url.dependance(d.id), { delai: 2 })).delai).toBe(2);
  });

  it('LIEN-16 : deux créations concurrentes ne forment pas de cycle', async () => {
    const { m, a, b } = await deuxActivites();
    // A→B (verrou tenu), puis B→A (attend, puis doit échouer)
    const insertion = (pred: number, succ: number) => ({
      sql: `INSERT INTO dependance (projet_id, predecesseur_id, successeur_id, type, delai)
            VALUES ($1, $2, $3, 'FD', 0)`,
      params: [m.projet.id, pred, succ],
    });
    const resultat = await concurrenceForcee(ctx, insertion(a.id, b.id), insertion(b.id, a.id));
    expect(resultat.ok).toBe(false);
    const { rows } = await ctx.pool.query<{ predecesseur_id: number; successeur_id: number }>(
      'SELECT predecesseur_id, successeur_id FROM dependance',
    );
    expect(rows).toEqual([{ predecesseur_id: a.id, successeur_id: b.id }]);
    // état final lu par l'API : une seule dépendance, donc aucun cycle
    const lecture = liste(await appel(ctx, m.chef).get(url.dependances(m.projet.id)));
    expect(lecture).toHaveLength(1);
  });
});
