import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, creerActeur, creerProjet } from './lot1-helpers.js';
import { compter, creerActivite, creerDependance, url } from './lot1-t2-helpers.js';

describe('Refus : points de la relecture du lot 1 (T1 et T2)', () => {
  const ctx = useTestApp();

  it('PRJ-20 : un chef de projet ne s’attribue pas le sous-projet dont un autre est chef', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const racine = await creerProjet(ctx, admin, { chef_id: c1.id });
    const sous = await creerProjet(ctx, admin, { chef_id: c2.id, parent_id: racine.id });
    const api = appel(ctx, c1);
    // le sous-projet est visible par c1 (portée par ancêtre) : refus 403, rien n'est modifié
    expect((await api.get(`/api/projets/${sous.id}`)).statusCode).toBe(200);
    const res = await api.patch(`/api/projets/${sous.id}`, { chef_id: c1.id });
    expect(res.statusCode).toBe(403);
    const { rows } = await ctx.pool.query('SELECT chef_id FROM projet WHERE id = $1', [sous.id]);
    expect(rows).toEqual([{ chef_id: c2.id }]);
    // une valeur identique au chef actuel reste acceptée
    const idem = await api.patch(`/api/projets/${sous.id}`, { chef_id: c2.id, nom: 'Renommé' });
    expect(idem.statusCode).toBe(200);
    expect(corps(await appel(ctx, admin).get(`/api/projets/${sous.id}`)).chef_id).toBe(c2.id);
    // l'administrateur change le chef
    const parAdmin = await appel(ctx, admin).patch(`/api/projets/${sous.id}`, { chef_id: c1.id });
    expect(parAdmin.statusCode).toBe(200);
  });

  it('LIEN-17 : dépendance avec des éléments d’un autre projet : toujours 422, jamais 409 ; rien n’est créé', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const a = await creerProjet(ctx, admin, { chef_id: c1.id });
    const b = await creerProjet(ctx, admin, { chef_id: c2.id });
    const x = await creerActivite(ctx, admin, a.id);
    const y = await creerActivite(ctx, admin, a.id);
    const z = await creerActivite(ctx, admin, a.id);
    await creerDependance(ctx, admin, a.id, x.id, y.id);
    const api = appel(ctx, c2);
    const demande = (pred: number, succ: number) =>
      api.post(url.dependances(b.id), { predecesseur_id: pred, successeur_id: succ });
    // la dépendance X→Y existe dans A : pas de 409 ; X→Z n'existe pas : même réponse
    expect((await demande(x.id, y.id)).statusCode).toBe(422);
    expect((await demande(x.id, z.id)).statusCode).toBe(422);
    expect((await demande(999998, 999999)).statusCode).toBe(422);
    expect(await compter(ctx, 'dependance')).toBe(1);
  });
});
