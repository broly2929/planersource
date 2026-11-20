import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { attendreRepos } from './lot1-t2-helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet, liste } from './lot1-helpers.js';

describe('Projets : règles ajoutées après T1 (D-028)', () => {
  const ctx = useTestApp();

  it('PRJ-17 : rattacher un projet à un parent (POST ou PATCH) exige le droit d’écriture sur ce parent', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const mien = await creerProjet(ctx, admin, { chef_id: c1.id });
    const sien = await creerProjet(ctx, admin, { chef_id: c2.id });
    const api = appel(ctx, c1);
    // création sous le projet d'un autre chef : refusée, rien n'est créé
    const refus = await api.post('/api/projets', {
      code: 'INTRUS',
      nom: 'Intrus',
      date_debut: '2027-01-04',
      parent_id: sien.id,
    });
    expect(refus.statusCode).toBe(404);
    // PATCH vers le parent d'un autre chef : refusé, parent inchangé
    const sousProjet = await creerProjet(ctx, c1, { parent_id: mien.id });
    const deplace = await api.patch(`/api/projets/${sousProjet.id}`, { parent_id: sien.id });
    expect(deplace.statusCode).toBe(404);
    expect(corps(await api.get(`/api/projets/${sousProjet.id}`)).parent_id).toBe(mien.id);
    expect(liste(await api.get('/api/projets'))).toHaveLength(2);
    // sous son propre projet : accepté ; l'administrateur rattache n'importe où
    const ok = await api.post('/api/projets', {
      code: 'LEGIT',
      nom: 'Légitime',
      date_debut: '2027-01-04',
      parent_id: mien.id,
    });
    expect(ok.statusCode).toBe(201);
    const parAdmin = await appel(ctx, admin).patch(`/api/projets/${sousProjet.id}`, {
      parent_id: sien.id,
    });
    expect(parAdmin.statusCode).toBe(200);
  });

  it('PRJ-18 : seul l’administrateur désigne ou change le chef ; un chef qui envoie un `chef_id` différent du sien → 403 ; sans `chef_id` il devient le chef', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const api = appel(ctx, c1);
    // POST avec le chef_id d'un autre : 403, rien n'est créé
    const refusCreation = await api.post('/api/projets', {
      code: 'VOL',
      nom: 'Vol',
      date_debut: '2027-01-04',
      chef_id: c2.id,
    });
    expect(refusCreation.statusCode).toBe(403);
    expect(liste(await appel(ctx, admin).get('/api/projets'))).toHaveLength(0);
    // POST avec son propre chef_id, ou sans chef_id : il est le chef
    const propre = await api.post('/api/projets', {
      code: 'PROPRE',
      nom: 'Propre',
      date_debut: '2027-01-04',
      chef_id: c1.id,
    });
    expect(propre.statusCode).toBe(201);
    expect(corps(propre).chef_id).toBe(c1.id);
    const sans = await api.post('/api/projets', {
      code: 'SANS',
      nom: 'Sans',
      date_debut: '2027-01-04',
    });
    expect(sans.statusCode).toBe(201);
    expect(corps(sans).chef_id).toBe(c1.id);
    // PATCH : chef_id d'un autre → 403, chef inchangé ; son propre id ou rien → 200
    const id = (corps(propre) as { id: number }).id;
    const refusModif = await api.patch(`/api/projets/${id}`, { chef_id: c2.id });
    expect(refusModif.statusCode).toBe(403);
    expect(corps(await api.get(`/api/projets/${id}`)).chef_id).toBe(c1.id);
    expect((await api.patch(`/api/projets/${id}`, { chef_id: c1.id })).statusCode).toBe(200);
    expect((await api.patch(`/api/projets/${id}`, { nom: 'Renommé' })).statusCode).toBe(200);
    // l'administrateur change le chef
    const parAdmin = await appel(ctx, admin).patch(`/api/projets/${id}`, { chef_id: c2.id });
    expect(parAdmin.statusCode).toBe(200);
    expect(corps(parAdmin).chef_id).toBe(c2.id);
  });

  it('PRJ-19-r1 : un refus sur un projet (404 pour un autre chef, 404 pour une ressource affectée) ne modifie ni ne supprime rien', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const mien = await creerProjet(ctx, admin, { chef_id: c1.id });
    const cible = await creerProjet(ctx, admin, { chef_id: c2.id });
    const sousCible = await creerProjet(ctx, admin, { chef_id: c2.id, parent_id: cible.id });
    const feuille = await creerProjet(ctx, admin, { chef_id: c2.id });
    await affecter(ctx, feuille.id, alice.id);
    await affecter(ctx, cible.id, alice.id);
    const etat = async () => {
      await attendreRepos(ctx);
      return (await ctx.pool.query('SELECT * FROM projet ORDER BY id')).rows as unknown[];
    };
    const avant = await etat();
    const modifications = { nom: 'Pirate', priorite: 1, clos: true, parent_id: mien.id };
    // autre chef : projet invisible → 404, rien n'est modifié ni supprimé
    const autre = appel(ctx, c1);
    for (const id of [cible.id, sousCible.id, feuille.id]) {
      expect((await autre.patch(`/api/projets/${id}`, modifications)).statusCode).toBe(404);
      expect(await etat(), `PATCH ${id} par un autre chef`).toEqual(avant);
      expect((await autre.delete(`/api/projets/${id}`)).statusCode).toBe(404);
      expect(await etat(), `DELETE ${id} par un autre chef`).toEqual(avant);
    }
    // ressource affectée : projet invisible (révision 6b, D-148 (2)) → 404, rien n'est modifié ni supprimé
    const ressource = appel(ctx, alice);
    for (const id of [cible.id, feuille.id]) {
      expect((await ressource.patch(`/api/projets/${id}`, modifications)).statusCode).toBe(404);
      expect(await etat(), `PATCH ${id} par une ressource`).toEqual(avant);
      expect((await ressource.delete(`/api/projets/${id}`)).statusCode).toBe(404);
      expect(await etat(), `DELETE ${id} par une ressource`).toEqual(avant);
    }
  });
});
