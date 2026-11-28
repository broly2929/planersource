import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import {
  concurrenceForcee,
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  planning,
  url,
  verifierRefus,
} from './lot1-t2-helpers.js';

describe('WBS : ordre, numérotation et déplacement (lot 1, T2)', () => {
  const ctx = useTestApp();

  it('WBS-1 : activités et jalons frères partagent une suite de rangs', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.type, e.rang])).toEqual([
      [a.id, 'activite', 1],
      [j.id, 'jalon', 2],
      [b.id, 'activite', 3],
    ]);
  });

  it('WBS-2 : numérotation 1, 1.1, 1.2, 2 calculée de l’arborescence', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const a1 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const a2 = await creerJalon(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.wbs])).toEqual([
      [a.id, '1'],
      [a1.id, '1.1'],
      [a2.id, '1.2'],
      [b.id, '2'],
    ]);
  });

  it('WBS-3 : insérer à une position décale les frères suivants', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    const c = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerActivite(ctx, m.chef, m.projet.id, { rang: 2 });
    expect(d.rang).toBe(2);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.rang, e.wbs])).toEqual([
      [a.id, 1, '1'],
      [d.id, 2, '2'],
      [b.id, 3, '3'],
      [c.id, 4, '4'],
    ]);
  });

  it('WBS-4 : déplacer un élément sous un autre parent du même projet', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.deplacer(b.id), { parent_id: c.id, rang: 1 });
    expect(res.statusCode).toBe(200);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.parent_id, e.wbs])).toEqual([
      [a.id, null, '1'],
      [c.id, null, '2'],
      [b.id, c.id, '2.1'],
    ]);
    // retour à la racine, en tête
    const retour = await appel(ctx, m.chef).post(url.deplacer(b.id), { parent_id: null, rang: 1 });
    expect(retour.statusCode).toBe(200);
    const apres = await planning(ctx, m.chef, m.projet.id);
    expect(apres.map((e) => [e.id, e.parent_id, e.wbs])).toEqual([
      [b.id, null, '1'],
      [a.id, null, '2'],
      [c.id, null, '3'],
    ]);
  });

  it('WBS-5 : déplacer garde les enfants et leur ordre', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const a1 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const a2 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const a21 = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a2.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.deplacer(a.id), { parent_id: c.id, rang: 1 });
    expect(res.statusCode).toBe(200);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.parent_id, e.wbs])).toEqual([
      [c.id, null, '1'],
      [a.id, c.id, '1.1'],
      [a1.id, a.id, '1.1.1'],
      [a2.id, a.id, '1.1.2'],
      [a21.id, a2.id, '1.1.2.1'],
    ]);
  });

  it('WBS-6 : l’ordre WBS est le parcours en profondeur (1, 1.1, 1.2, 2)', async () => {
    const m = await creerMonde(ctx);
    // création dans le désordre : l'ordre de création n'est pas l'ordre du parcours
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const d = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.wbs])).toEqual([
      [a.id, '1'],
      [b.id, '1.1'],
      [c.id, '1.2'],
      [d.id, '2'],
    ]);
  });

  it('WBS-7 : déplacer sous une activité assignée → 422', async () => {
    const m = await creerMonde(ctx);
    const cible = await creerActivite(ctx, m.chef, m.projet.id);
    const mobile = await creerActivite(ctx, m.chef, m.projet.id);
    await creerAssignation(ctx, m.chef, cible.id, m.alice.id);
    const res = await appel(ctx, m.chef).post(url.deplacer(mobile.id), { parent_id: cible.id });
    expect(res.statusCode).toBe(422);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.parent_id])).toEqual([
      [cible.id, null],
      [mobile.id, null],
    ]);
  });

  it('WBS-8-r2 : déplacer : chef d’un autre projet → 403 ; ressource affectée → 404 ; sans session → 401', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    await verifierRefus(ctx, m, [
      { methode: 'POST', adresse: url.deplacer(b.id), corps: { parent_id: a.id } },
    ]);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => e.parent_id)).toEqual([null, null]);
    // le chef et l'administrateur déplacent
    expect(
      (await appel(ctx, m.chef).post(url.deplacer(b.id), { parent_id: a.id })).statusCode,
    ).toBe(200);
    expect(
      (await appel(ctx, m.admin).post(url.deplacer(b.id), { parent_id: null })).statusCode,
    ).toBe(200);
  });

  it('WBS-9 : déplacer sous un de ses descendants → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: b.id });
    const api = appel(ctx, m.chef);
    expect((await api.post(url.deplacer(a.id), { parent_id: b.id })).statusCode).toBe(422);
    expect((await api.post(url.deplacer(a.id), { parent_id: c.id })).statusCode).toBe(422);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => [e.id, e.wbs])).toEqual([
      [a.id, '1'],
      [b.id, '1.1'],
      [c.id, '1.1.1'],
    ]);
  });

  it('WBS-10 : déplacer sous un jalon → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).post(url.deplacer(a.id), { parent_id: j.id });
    expect(res.statusCode).toBe(422);
    const lignes = await planning(ctx, m.chef, m.projet.id);
    expect(lignes.map((e) => e.parent_id)).toEqual([null, null]);
  });

  it('WBS-11 : déplacer vers un autre projet → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    const etranger = await creerActivite(ctx, m.admin, m.autre.id);
    const res = await appel(ctx, m.admin).post(url.deplacer(a.id), { parent_id: etranger.id });
    expect(res.statusCode).toBe(422);
    const lignes = await planning(ctx, m.admin, m.projet.id);
    expect(lignes.map((e) => [e.id, e.parent_id])).toEqual([[a.id, null]]);
    expect(await planning(ctx, m.admin, m.autre.id)).toHaveLength(1);
  });

  it('WBS-12 : deux déplacements concurrents ne créent pas de cycle', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id);
    // A sous B (verrou tenu), puis B sous A (attend, puis doit échouer)
    const deplacement = (id: number, parent: number) => ({
      sql: 'UPDATE element SET parent_id = $1, rang = 1 WHERE id = $2',
      params: [parent, id],
    });
    const resultat = await concurrenceForcee(ctx, deplacement(a.id, b.id), deplacement(b.id, a.id));
    expect(resultat.ok).toBe(false);
    const { rows } = await ctx.pool.query<{ id: number; parent_id: number | null }>(
      'SELECT id, parent_id FROM element ORDER BY id',
    );
    expect(rows).toEqual([
      { id: a.id, parent_id: b.id },
      { id: b.id, parent_id: null },
    ]);
    // aucun cycle en base : chaque élément remonte à une racine
    const cycles = await ctx.pool.query(
      `WITH RECURSIVE remonte (origine, courant, profondeur) AS (
         SELECT id, parent_id, 1 FROM element
         UNION ALL
         SELECT r.origine, e.parent_id, r.profondeur + 1
           FROM remonte r JOIN element e ON e.id = r.courant
          WHERE r.profondeur < 10
       )
       SELECT origine FROM remonte WHERE courant = origine`,
    );
    expect(cycles.rows).toHaveLength(0);
  });
});
