import type { LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, creerActeur, creerProjet, liste, type Acteur } from './lot1-helpers.js';

const affectations = (projetId: number) => `/api/projets/${projetId}/affectations`;
const TABLES_AFF = ['affectation_projet'];

async function affecterParApi(ctx: TestCtx, par: Acteur, projetId: number, ressourceId: number) {
  const res = await appel(ctx, par).post(affectations(projetId), { ressource_id: ressourceId });
  expect(res.statusCode).toBe(201);
  return corps(res) as { id: number };
}

describe('Affectations projet (lot 1, T1)', () => {
  const ctx = useTestApp();

  it('AFF-1 : affectation d’une ressource avec taux et dates facultatives', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    const api = appel(ctx, admin);
    const avecDates = await api.post(affectations(projet.id), {
      ressource_id: alice.id,
      taux: 50,
      date_debut: '2027-01-04',
      date_fin: '2027-03-31',
    });
    expect(avecDates.statusCode).toBe(201);
    expect(corps(avecDates)).toMatchObject({
      projet_id: projet.id,
      ressource_id: alice.id,
      taux: 50,
      date_debut: '2027-01-04',
      date_fin: '2027-03-31',
    });
    const sansDates = await api.post(affectations(projet.id), { ressource_id: bob.id });
    expect(sansDates.statusCode).toBe(201);
    expect(corps(sansDates)).toMatchObject({ date_debut: null, date_fin: null });
    expect(liste(await api.get(affectations(projet.id)))).toHaveLength(2);
  });

  it('AFF-2 : affecter un utilisateur non ressource → 422', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet', false);
    const projet = await creerProjet(ctx, admin);
    await affecterParApi(ctx, admin, projet.id, alice.id);
    const res = await appel(ctx, admin).post(affectations(projet.id), { ressource_id: chef.id });
    expect(res.statusCode).toBe(422);
    expect(liste(await appel(ctx, admin).get(affectations(projet.id)))).toHaveLength(1);
  });

  it('AFF-3-r2 : écriture réservée à l’administrateur et au chef du projet ; chef d’un autre projet → 404 ; ressource affectée → 404', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const c1 = await creerActeur(ctx, 'c1@example.test', 'chef_de_projet');
    const c2 = await creerActeur(ctx, 'c2@example.test', 'chef_de_projet');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const a = await creerProjet(ctx, admin, { chef_id: c1.id });
    const b = await creerProjet(ctx, admin, { chef_id: c2.id });
    const parAdmin = await affecterParApi(ctx, admin, a.id, alice.id);
    await affecterParApi(ctx, c1, a.id, bob.id); // le chef du projet écrit
    // chef d'un autre projet : le projet est invisible
    const refus = (statut: number, requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_AFF, statut, requete);
    await refus(404, () => appel(ctx, c2).post(affectations(a.id), { ressource_id: alice.id }));
    await refus(404, () => appel(ctx, c2).patch(`/api/affectations/${parAdmin.id}`, { taux: 10 }));
    await refus(404, () => appel(ctx, c2).delete(`/api/affectations/${parAdmin.id}`));
    // ressource affectée : projet invisible pour le rôle ressource (révision 6b, D-148 (2))
    const apiAlice = appel(ctx, alice);
    await refus(404, () => apiAlice.post(affectations(a.id), { ressource_id: alice.id }));
    await refus(404, () => apiAlice.patch(`/api/affectations/${parAdmin.id}`, { taux: 10 }));
    await refus(404, () => apiAlice.delete(`/api/affectations/${parAdmin.id}`));
    expect(b.id).toBeGreaterThan(0);
  });

  it('AFF-4-r1 : la ressource ne voit plus les affectations d’un projet où elle est affectée (404) ; projet non affecté → 404', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const a = await creerProjet(ctx, admin);
    const b = await creerProjet(ctx, admin);
    await affecterParApi(ctx, admin, a.id, alice.id);
    const api = appel(ctx, alice);
    // Révision 6b (D-031, D-148 (2)) : 404, comme un projet illisible.
    expect((await api.get(affectations(a.id))).statusCode).toBe(404);
    expect((await api.get(affectations(b.id))).statusCode).toBe(404);
  });

  it('AFF-5 : modification du taux et des dates', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    const aff = await affecterParApi(ctx, admin, projet.id, alice.id);
    const res = await appel(ctx, admin).patch(`/api/affectations/${aff.id}`, {
      taux: 75,
      date_debut: '2027-02-01',
      date_fin: '2027-02-28',
    });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({
      taux: 75,
      date_debut: '2027-02-01',
      date_fin: '2027-02-28',
    });
  });

  it('AFF-7 : deuxième affectation de la même ressource au même projet → 409', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    await affecterParApi(ctx, admin, projet.id, alice.id);
    const res = await appel(ctx, admin).post(affectations(projet.id), { ressource_id: alice.id });
    expect(res.statusCode).toBe(409);
    expect(liste(await appel(ctx, admin).get(affectations(projet.id)))).toHaveLength(1);
  });

  it('AFF-8-r1 : taux d’affectation hors de ]0 ; 100] → 400', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    const api = appel(ctx, admin);
    for (const taux of [0, -5, 100.01, 101]) {
      await refusSansEffet(
        ctx,
        TABLES_AFF,
        400,
        () => api.post(affectations(projet.id), { ressource_id: alice.id, taux }),
        `taux ${taux}`,
      );
    }
    const borne = await api.post(affectations(projet.id), { ressource_id: alice.id, taux: 0.01 });
    expect(borne.statusCode).toBe(201);
    const haute = await api.post(affectations(projet.id), { ressource_id: bob.id, taux: 100 });
    expect(haute.statusCode).toBe(201);
    await refusSansEffet(ctx, TABLES_AFF, 400, () =>
      api.patch(`/api/affectations/${corps(borne).id}`, { taux: 0 }),
    );
  });

  it('AFF-9-r1 : date de fin antérieure à la date de début → 422', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    const api = appel(ctx, admin);
    const egales = await api.post(affectations(projet.id), {
      ressource_id: bob.id,
      date_debut: '2027-01-04',
      date_fin: '2027-01-04',
    });
    expect(egales.statusCode).toBe(201);
    await refusSansEffet(ctx, TABLES_AFF, 422, () =>
      api.post(affectations(projet.id), {
        ressource_id: alice.id,
        date_debut: '2027-02-01',
        date_fin: '2027-01-31',
      }),
    );
    await refusSansEffet(ctx, TABLES_AFF, 422, () =>
      api.patch(`/api/affectations/${corps(egales).id}`, { date_fin: '2027-01-01' }),
    );
  });

  it('AFF-10 : taux d’affectation 100 par défaut', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    const res = await appel(ctx, admin).post(affectations(projet.id), { ressource_id: alice.id });
    expect(res.statusCode).toBe(201);
    expect(corps(res).taux).toBe(100);
  });

  it('AFF-11 : un utilisateur affecté ne peut pas cesser d’être ressource → 409 ; sans affectation → 200', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const projet = await creerProjet(ctx, admin);
    await affecterParApi(ctx, admin, projet.id, alice.id);
    const api = appel(ctx, admin);
    const refus = await api.patch(`/api/utilisateurs/${alice.id}`, { est_ressource: false });
    expect(refus.statusCode).toBe(409);
    const utilisateurs = liste(await api.get('/api/utilisateurs'));
    expect(utilisateurs.find((u) => u.id === alice.id)?.est_ressource).toBe(true);
    const accepte = await api.patch(`/api/utilisateurs/${bob.id}`, { est_ressource: false });
    expect(accepte.statusCode).toBe(200);
    expect(corps(accepte).est_ressource).toBe(false);
  });
});
