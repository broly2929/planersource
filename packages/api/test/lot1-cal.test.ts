import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS_DIR } from '../src/db/migrate.js';
import { refusSansEffet, resetDb, testDbUrl, useTestApp } from './helpers.js';
import { appel, corps, creerActeur, creerCalendrier, liste } from './lot1-helpers.js';

const TABLES_CAL = ['calendrier', 'calendrier_ferie', 'utilisateur'];

describe('Calendriers (lot 1, T1)', () => {
  const ctx = useTestApp();

  it('CAL-1 : l’administrateur crée un calendrier ; les jours travaillés valent lun–ven par défaut', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const res = await appel(ctx, admin).post('/api/calendriers', { nom: 'Atelier' });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      nom: 'Atelier',
      jours_travailles: [1, 2, 3, 4, 5],
      est_defaut: false,
      feries: [],
    });
  });

  it('CAL-2 : jours travaillés personnalisés (lun–jeu) enregistrés', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin, { jours_travailles: [1, 2, 3, 4] });
    const res = await appel(ctx, admin).get(`/api/calendriers/${cal.id}`);
    expect(res.statusCode).toBe(200);
    expect(corps(res).jours_travailles).toEqual([1, 2, 3, 4]);
  });

  it('CAL-3 : ajout d’un jour férié ; la liste des dates le renvoie', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin);
    const ajout = await appel(ctx, admin).post(`/api/calendriers/${cal.id}/feries`, {
      jour: '2027-01-01',
      libelle: 'Jour de l’an',
    });
    expect(ajout.statusCode).toBe(201);
    const res = await appel(ctx, admin).get(`/api/calendriers/${cal.id}`);
    expect(corps(res).feries).toEqual([{ jour: '2027-01-01', libelle: 'Jour de l’an' }]);
  });

  it('CAL-4 : retrait d’un jour férié', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin);
    const ajout = await appel(ctx, admin).post(`/api/calendriers/${cal.id}/feries`, {
      jour: '2027-01-01',
    });
    expect(ajout.statusCode).toBe(201);
    const retrait = await appel(ctx, admin).delete(`/api/calendriers/${cal.id}/feries/2027-01-01`);
    expect(retrait.statusCode).toBe(204);
    const res = await appel(ctx, admin).get(`/api/calendriers/${cal.id}`);
    expect(corps(res).feries).toEqual([]);
  });

  it('CAL-5 : le calendrier d’un utilisateur se modifie par PATCH', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const cal = await creerCalendrier(ctx, admin, { nom: 'Équipe de nuit' });
    const patch = await appel(ctx, admin).patch(`/api/utilisateurs/${bob.id}`, {
      calendrier_id: cal.id,
    });
    expect(patch.statusCode).toBe(200);
    const utilisateurs = liste(await appel(ctx, admin).get('/api/utilisateurs'));
    expect(utilisateurs.find((u) => u.id === bob.id)?.calendrier_id).toBe(cal.id);
  });

  it('CAL-6-r1 : chef de projet et ressource → 403 en écriture', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin);
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const ressource = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    for (const acteur of [chef, ressource]) {
      const api = appel(ctx, acteur);
      const refus = (requete: () => Promise<LightMyRequestResponse>) =>
        refusSansEffet(ctx, TABLES_CAL, 403, requete);
      await refus(() => api.post('/api/calendriers', { nom: 'X' }));
      await refus(() => api.patch(`/api/calendriers/${cal.id}`, { nom: 'Y' }));
      await refus(() => api.delete(`/api/calendriers/${cal.id}`));
      await refus(() => api.post(`/api/calendriers/${cal.id}/feries`, { jour: '2027-01-01' }));
    }
  });

  it('CAL-7-r1 : routes calendriers sans session → 401', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin);
    const api = appel(ctx);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_CAL, 401, requete);
    await refus(() => api.get('/api/calendriers'));
    await refus(() => api.get(`/api/calendriers/${cal.id}`));
    await refus(() => api.post('/api/calendriers', { nom: 'X' }));
    await refus(() => api.patch(`/api/calendriers/${cal.id}`, { nom: 'Y' }));
    await refus(() => api.delete(`/api/calendriers/${cal.id}`));
  });

  it('CAL-8 : un utilisateur créé sans calendrier reçoit le calendrier par défaut', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const listeRes = await appel(ctx, admin).get('/api/calendriers');
    expect(listeRes.statusCode).toBe(200);
    const calendriers = liste(listeRes);
    const defaut = calendriers.find((c) => c.est_defaut === true);
    expect(defaut).toBeDefined();
    const creation = await appel(ctx, admin).post('/api/utilisateurs', {
      nom: 'Nouvelle',
      email: 'nouvelle@example.test',
      mot_de_passe: 'motdepasse-de-test',
      role: 'ressource',
    });
    expect(creation.statusCode).toBe(201);
    const utilisateurs = liste(await appel(ctx, admin).get('/api/utilisateurs'));
    const nouvelle = utilisateurs.find((u) => u.email === 'nouvelle@example.test');
    expect(nouvelle?.calendrier_id).toBe(defaut?.id);
  });

  it('CAL-10-r1 : supprimer le calendrier par défaut ou un calendrier utilisé par un utilisateur → 409', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
    const listeRes = await appel(ctx, admin).get('/api/calendriers');
    expect(listeRes.statusCode).toBe(200);
    const calendriers = liste(listeRes);
    const defaut = calendriers.find((c) => c.est_defaut === true);
    expect(defaut).toBeDefined();
    await refusSansEffet(ctx, TABLES_CAL, 409, () =>
      appel(ctx, admin).delete(`/api/calendriers/${defaut?.id}`),
    );

    const utilise = await creerCalendrier(ctx, admin);
    const inutilise = await creerCalendrier(ctx, admin);
    await appel(ctx, admin).patch(`/api/utilisateurs/${bob.id}`, { calendrier_id: utilise.id });
    await refusSansEffet(ctx, TABLES_CAL, 409, () =>
      appel(ctx, admin).delete(`/api/calendriers/${utilise.id}`),
    );
    expect((await appel(ctx, admin).delete(`/api/calendriers/${inutilise.id}`)).statusCode).toBe(
      204,
    );
  });

  it('CAL-11-r1 : jours travaillés vides ou hors 1–7 → 400', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const api = appel(ctx, admin);
    for (const jours of [[], [0], [8], [1, 9]]) {
      await refusSansEffet(
        ctx,
        TABLES_CAL,
        400,
        () => api.post('/api/calendriers', { nom: 'Invalide', jours_travailles: jours }),
        JSON.stringify(jours),
      );
    }
    const cal = await creerCalendrier(ctx, admin);
    await refusSansEffet(ctx, TABLES_CAL, 400, () =>
      api.patch(`/api/calendriers/${cal.id}`, { jours_travailles: [] }),
    );
  });

  it('CAL-12 : tout utilisateur connecté lit les calendriers', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const cal = await creerCalendrier(ctx, admin, { nom: 'Lisible' });
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const ressource = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    for (const acteur of [chef, ressource]) {
      const api = appel(ctx, acteur);
      const noms = liste(await api.get('/api/calendriers')).map((c) => c.nom);
      expect(noms).toContain('Lisible');
      expect((await api.get(`/api/calendriers/${cal.id}`)).statusCode).toBe(200);
    }
  });
});

describe('Calendriers : migration (lot 1, T1)', () => {
  let pool: pg.Pool;
  beforeAll(() => {
    pool = new pg.Pool({ connectionString: testDbUrl() });
  });
  afterAll(async () => {
    await pool.end();
  });

  it('CAL-9 : les utilisateurs existants reçoivent le calendrier par défaut à la migration', async () => {
    await resetDb(pool, { migrate: false });
    const avant = mkdtempSync(join(tmpdir(), 'ps-cal-'));
    for (const f of ['001_utilisateur_session.sql', '002_email_minuscules.sql']) {
      copyFileSync(join(MIGRATIONS_DIR, f), join(avant, f));
    }
    await migrate(pool, avant);
    await pool.query(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role)
       VALUES ('Ancien', 'ancien@example.test', 'x', 'ressource'),
              ('Autre', 'autre@example.test', 'x', 'chef_de_projet')`,
    );

    await migrate(pool);

    const { rows } = await pool.query<{ email: string; est_defaut: boolean }>(
      `SELECT u.email, c.est_defaut FROM utilisateur u
         JOIN calendrier c ON c.id = u.calendrier_id ORDER BY u.email`,
    );
    expect(rows).toEqual([
      { email: 'ancien@example.test', est_defaut: true },
      { email: 'autre@example.test', est_defaut: true },
    ]);
  });
});
