import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, creerActeur, liste } from './lot1-helpers.js';

/** GET /api/annuaire : id, nom, role, est_ressource, actif de chaque utilisateur (D-035). */
async function monde(ctx: TestCtx) {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const inactif = await creerActeur(ctx, 'inactif@example.test', 'ressource', true);
  // noms fixés : tri par nom puis identifiant (deux « Zoé », le second créé plus tard)
  const noms: [number, string][] = [
    [admin.id, 'Zoé'],
    [chef.id, 'Chef'],
    [alice.id, 'Alice'],
    [inactif.id, 'Zoé'],
  ];
  for (const [id, nom] of noms) {
    await ctx.pool.query('UPDATE utilisateur SET nom = $2 WHERE id = $1', [id, nom]);
  }
  await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [inactif.id]);
  return { admin, chef, alice, inactif };
}

describe('Annuaire (lot 1, T3)', () => {
  const ctx = useTestApp();

  it('ANN-1 : sans session → 401', async () => {
    expect((await appel(ctx).get('/api/annuaire')).statusCode).toBe(401);
  });

  it('ANN-2 : une ressource reçoit tous les utilisateurs, inactifs compris, triés par nom puis identifiant', async () => {
    const m = await monde(ctx);
    const res = await appel(ctx, m.alice).get('/api/annuaire');
    expect(res.statusCode).toBe(200);
    expect(liste(res)).toEqual([
      { id: m.alice.id, nom: 'Alice', role: 'ressource', est_ressource: true, actif: true },
      { id: m.chef.id, nom: 'Chef', role: 'chef_de_projet', est_ressource: false, actif: true },
      { id: m.admin.id, nom: 'Zoé', role: 'administrateur', est_ressource: false, actif: true },
      { id: m.inactif.id, nom: 'Zoé', role: 'ressource', est_ressource: true, actif: false },
    ]);
  });

  it('ANN-3 : chaque entrée a exactement les clés id, nom, role, est_ressource, actif', async () => {
    const m = await monde(ctx);
    const entrees = liste(await appel(ctx, m.alice).get('/api/annuaire'));
    expect(entrees.length).toBe(4);
    for (const e of entrees) {
      expect(Object.keys(e).sort()).toEqual(['actif', 'est_ressource', 'id', 'nom', 'role']);
    }
  });

  it('ANN-4 : un chef de projet reçoit 200 et la même liste', async () => {
    const m = await monde(ctx);
    const chef = await appel(ctx, m.chef).get('/api/annuaire');
    const ressource = await appel(ctx, m.alice).get('/api/annuaire');
    expect(chef.statusCode).toBe(200);
    expect(liste(chef)).toEqual(liste(ressource));
  });
});
