import type { LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { refusSansEffet, seedUser, useTestApp } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet, liste } from './lot1-helpers.js';

const TABLES_PRJ = ['projet', 'affectation_projet', 'element'];

describe('Projets (lot 1, T1)', () => {
  const ctx = useTestApp();

  it('PRJ-1 : création : priorité 500, clos faux, est_modele faux par défaut', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const res = await appel(ctx, admin).post('/api/projets', {
      code: 'P1',
      nom: 'Projet 1',
      date_debut: '2027-01-04',
      chef_id: admin.id,
    });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      code: 'P1',
      nom: 'Projet 1',
      parent_id: null,
      priorite: 500,
      chef_id: admin.id,
      date_debut: '2027-01-04',
      clos: false,
      est_modele: false,
    });
  });

  it('PRJ-2 : code déjà utilisé → 409, rien n’est créé', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    await creerProjet(ctx, admin, { code: 'DOUBLON' });
    const res = await appel(ctx, admin).post('/api/projets', {
      code: 'DOUBLON',
      nom: 'Autre',
      date_debut: '2027-01-04',
      chef_id: admin.id,
    });
    expect(res.statusCode).toBe(409);
    expect(liste(await appel(ctx, admin).get('/api/projets'))).toHaveLength(1);
  });

  it('PRJ-3 : sous-projet créé avec un parent', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const parent = await creerProjet(ctx, admin);
    const enfant = await creerProjet(ctx, admin, { parent_id: parent.id });
    expect(enfant.parent_id).toBe(parent.id);
    const res = await appel(ctx, admin).get(`/api/projets/${enfant.id}`);
    expect(corps(res).parent_id).toBe(parent.id);
  });

  it('PRJ-4 : modification de nom, priorité, date de début, clos', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const projet = await creerProjet(ctx, admin);
    const res = await appel(ctx, admin).patch(`/api/projets/${projet.id}`, {
      nom: 'Renommé',
      priorite: 100,
      date_debut: '2027-02-01',
      clos: true,
    });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({
      nom: 'Renommé',
      priorite: 100,
      date_debut: '2027-02-01',
      clos: true,
    });
  });

  it('PRJ-5 : un chef de projet qui crée un projet en devient le chef', async () => {
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const res = await appel(ctx, chef).post('/api/projets', {
      code: 'MIEN',
      nom: 'Mon projet',
      date_debut: '2027-01-04',
    });
    expect(res.statusCode).toBe(201);
    expect(corps(res).chef_id).toBe(chef.id);
  });

  it('PRJ-6-r2 : un chef modifie son projet ; le projet d’un autre chef : lecture 200, peut_ecrire faux ; écriture 403', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const a = await creerProjet(ctx, admin, { chef_id: c1.id });
    const b = await creerProjet(ctx, admin, { chef_id: c2.id });
    const api = appel(ctx, c1);
    expect((await api.patch(`/api/projets/${a.id}`, { nom: 'Modifié' })).statusCode).toBe(200);
    // révision D-265 (4) : le projet d'un autre chef est lisible, en lecture seule
    const lu = await api.get(`/api/projets/${b.id}`);
    expect(lu.statusCode).toBe(200);
    expect(corps(lu).peut_ecrire).toBe(false);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_PRJ, 403, requete);
    await refus(() => api.patch(`/api/projets/${b.id}`, { nom: 'Pirate' }));
    await refus(() => api.delete(`/api/projets/${b.id}`));
  });

  it('PRJ-7-r2 : une ressource ne voit aucun projet : liste 403, projet affecté ou non → 404 ; création 403', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const a = await creerProjet(ctx, admin);
    const b = await creerProjet(ctx, admin);
    await affecter(ctx, a.id, alice.id);
    const api = appel(ctx, alice);
    const refus = (statut: number, requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_PRJ, statut, requete);
    // Révision 6b (D-031, D-148 (2)) : liste 403, projet affecté 404 comme un projet illisible.
    await refus(403, () => api.get('/api/projets'));
    expect((await api.get('/api/projets')).json()).toEqual({ erreur: 'Interdit' });
    await refus(404, () => api.get(`/api/projets/${a.id}`));
    await refus(404, () => api.get(`/api/projets/${b.id}`));
    await refus(404, () => api.patch(`/api/projets/${a.id}`, { nom: 'X' }));
    await refus(404, () => api.delete(`/api/projets/${a.id}`));
    await refus(404, () => api.patch(`/api/projets/${b.id}`, { nom: 'X' }));
    await refus(403, () =>
      api.post('/api/projets', { code: 'RES', nom: 'Interdit', date_debut: '2027-01-04' }),
    );
  });

  it('PRJ-8 : l’administrateur voit et modifie tous les projets', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const a = await creerProjet(ctx, admin, { chef_id: c1.id });
    const b = await creerProjet(ctx, admin, { chef_id: c2.id });
    const api = appel(ctx, admin);
    expect(
      liste(await api.get('/api/projets'))
        .map((p) => p.id)
        .sort(),
    ).toEqual([a.id, b.id].sort());
    expect((await api.patch(`/api/projets/${b.id}`, { nom: 'Admin' })).statusCode).toBe(200);
  });

  it('PRJ-9-r1 : routes projets sans session → 401', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const projet = await creerProjet(ctx, admin);
    const api = appel(ctx);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_PRJ, 401, requete);
    await refus(() => api.get('/api/projets'));
    await refus(() => api.get(`/api/projets/${projet.id}`));
    await refus(() => api.post('/api/projets', { code: 'X', nom: 'X' }));
    await refus(() => api.patch(`/api/projets/${projet.id}`, { nom: 'X' }));
    await refus(() => api.delete(`/api/projets/${projet.id}`));
  });

  it('PRJ-11-r1 : un chef lit et modifie les sous-projets de ses projets (portée par ancêtre)', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const racine = await creerProjet(ctx, admin, { chef_id: c1.id });
    const sous = await creerProjet(ctx, admin, { chef_id: c2.id, parent_id: racine.id });
    const api1 = appel(ctx, c1);
    expect((await api1.get(`/api/projets/${sous.id}`)).statusCode).toBe(200);
    expect(
      (await api1.patch(`/api/projets/${sous.id}`, { nom: 'Par le chef racine' })).statusCode,
    ).toBe(200);
    expect(
      liste(await api1.get('/api/projets'))
        .map((p) => p.id)
        .sort(),
    ).toEqual([racine.id, sous.id].sort());
    // le chef du sous-projet seul n'écrit pas sur la racine (révision D-265 (4) : il la lit)
    const api2 = appel(ctx, c2);
    expect((await api2.get(`/api/projets/${sous.id}`)).statusCode).toBe(200);
    const racineLue = await api2.get(`/api/projets/${racine.id}`);
    expect(racineLue.statusCode).toBe(200);
    expect(corps(racineLue).peut_ecrire).toBe(false);
  });

  it('PRJ-12-r1 : un chef voit tous les projets dans la liste, en écriture sur les siens seulement', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const a = await creerProjet(ctx, admin, { chef_id: c1.id });
    const b = await creerProjet(ctx, admin, { chef_id: c2.id });
    // révision D-265 (4) : présents, en lecture seule hors de sa portée
    const ecrit = async (qui: typeof c1) =>
      liste(await appel(ctx, qui).get('/api/projets')).map((p) => [p.id, p.peut_ecrire]);
    expect(await ecrit(c1)).toEqual([
      [a.id, true],
      [b.id, false],
    ]);
    expect(await ecrit(c2)).toEqual([
      [a.id, false],
      [b.id, true],
    ]);
  });

  it('PRJ-13 : cycle dans l’arborescence des projets (dont auto-parent) → 422', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const a = await creerProjet(ctx, admin);
    const b = await creerProjet(ctx, admin, { parent_id: a.id });
    const c = await creerProjet(ctx, admin, { parent_id: b.id });
    const api = appel(ctx, admin);
    expect((await api.patch(`/api/projets/${a.id}`, { parent_id: a.id })).statusCode).toBe(422);
    expect((await api.patch(`/api/projets/${a.id}`, { parent_id: b.id })).statusCode).toBe(422);
    expect((await api.patch(`/api/projets/${a.id}`, { parent_id: c.id })).statusCode).toBe(422);
    expect(corps(await api.get(`/api/projets/${a.id}`)).parent_id).toBeNull();
  });

  it('PRJ-14 : supprimer un projet ayant des sous-projets → 409 ; sans sous-projet → supprimé', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const parent = await creerProjet(ctx, admin);
    const enfant = await creerProjet(ctx, admin, { parent_id: parent.id });
    const api = appel(ctx, admin);
    expect((await api.delete(`/api/projets/${parent.id}`)).statusCode).toBe(409);
    expect((await api.delete(`/api/projets/${enfant.id}`)).statusCode).toBe(204);
    expect((await api.delete(`/api/projets/${parent.id}`)).statusCode).toBe(204);
    expect((await api.get(`/api/projets/${parent.id}`)).statusCode).toBe(404);
  });

  it('PRJ-16-r1 : priorité hors de 0 à 1000 → 400', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const api = appel(ctx, admin);
    const base = { nom: 'N', date_debut: '2027-01-04', chef_id: admin.id };
    expect((await api.post('/api/projets', { ...base, code: 'B0', priorite: 0 })).statusCode).toBe(
      201,
    );
    expect(
      (await api.post('/api/projets', { ...base, code: 'B1', priorite: 1000 })).statusCode,
    ).toBe(201);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_PRJ, 400, requete);
    await refus(() => api.post('/api/projets', { ...base, code: 'B2', priorite: -1 }));
    await refus(() => api.post('/api/projets', { ...base, code: 'B3', priorite: 1001 }));
    const projet = await creerProjet(ctx, admin);
    await refus(() => api.patch(`/api/projets/${projet.id}`, { priorite: 1001 }));
  });

  it('PRJ-10 : code « abc » puis « ABC » → 409, rien n’est créé', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    await creerProjet(ctx, admin, { code: 'abc' });
    const res = await appel(ctx, admin).post('/api/projets', {
      code: 'ABC',
      nom: 'Autre casse',
      date_debut: '2027-01-04',
      chef_id: admin.id,
    });
    expect(res.statusCode).toBe(409);
    expect(liste(await appel(ctx, admin).get('/api/projets'))).toHaveLength(1);
  });

  it('PRJ-15 : chef désigné : ressource, utilisateur inactif ou id inexistant → 422, à la création et au PATCH', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const projet = await creerProjet(ctx, admin);
    const ressource = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const inactif = await seedUser(ctx.pool, {
      email: 'inactif@example.test',
      role: 'chef_de_projet',
      actif: false,
    });
    const api = appel(ctx, admin);
    let n = 0;
    for (const chefId of [ressource.id, inactif, 999999]) {
      n += 1;
      const creation = await api.post('/api/projets', {
        code: `CHEF${n}`,
        nom: 'Chef invalide',
        date_debut: '2027-01-04',
        chef_id: chefId,
      });
      expect(creation.statusCode, `création chef ${chefId}`).toBe(422);
      const modif = await api.patch(`/api/projets/${projet.id}`, { chef_id: chefId });
      expect(modif.statusCode, `PATCH chef ${chefId}`).toBe(422);
    }
    expect(corps(await api.get(`/api/projets/${projet.id}`)).chef_id).toBe(admin.id);
    expect(liste(await api.get('/api/projets'))).toHaveLength(1);
  });
});
