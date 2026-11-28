import type { LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { refusSansEffet, useTestApp } from './helpers.js';
import { appel, corps, creerActeur, liste } from './lot1-helpers.js';
import {
  compter,
  creerActivite,
  creerAssignation,
  creerDependance,
  creerJalon,
  creerMonde,
  planning,
  url,
  verifierRefus,
} from './lot1-t2-helpers.js';

const TABLES_ACT = ['element', 'activite', 'assignation', 'dependance'];

describe('Activités (lot 1, T2)', () => {
  const ctx = useTestApp();

  it('ACT-1 : création : priorité 500 et `close` faux par défaut', async () => {
    const m = await creerMonde(ctx);
    const res = await appel(ctx, m.chef).post(url.activites(m.projet.id), { nom: 'Analyse' });
    expect(res.statusCode).toBe(201);
    expect(corps(res)).toMatchObject({
      projet_id: m.projet.id,
      nom: 'Analyse',
      priorite: 500,
      close: false,
      parent_id: null,
    });
  });

  it('ACT-2 : START sans début validé → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const res = await api.post(url.activites(m.projet.id), { nom: 'X', mode: 'START' });
    expect(res.statusCode).toBe(422);
    expect(liste(await api.get(url.activites(m.projet.id)))).toHaveLength(0);
    const ok = await api.post(url.activites(m.projet.id), {
      nom: 'X',
      mode: 'START',
      debut_valide: '2027-01-06',
    });
    expect(ok.statusCode).toBe(201);
  });

  it('ACT-3 : STARR sans début validé → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const res = await api.post(url.activites(m.projet.id), { nom: 'X', mode: 'STARR' });
    expect(res.statusCode).toBe(422);
    expect(liste(await api.get(url.activites(m.projet.id)))).toHaveLength(0);
    const ok = await api.post(url.activites(m.projet.id), {
      nom: 'X',
      mode: 'STARR',
      debut_valide: '2027-01-06',
    });
    expect(ok.statusCode).toBe(201);
  });

  it('ACT-4 : REGUL sans début validé ou sans fin validée → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const post = (champs: Record<string, unknown>) =>
      api.post(url.activites(m.projet.id), { nom: 'R', mode: 'REGUL', ...champs });
    expect((await post({})).statusCode).toBe(422);
    expect((await post({ debut_valide: '2027-01-04' })).statusCode).toBe(422);
    expect((await post({ fin_valide: '2027-01-15' })).statusCode).toBe(422);
    expect(liste(await api.get(url.activites(m.projet.id)))).toHaveLength(0);
    const ok = await post({ debut_valide: '2027-01-04', fin_valide: '2027-01-15' });
    expect(ok.statusCode).toBe(201);
  });

  it('ACT-5 : FDUR et DDUR sans durée → durée validée 1', async () => {
    const m = await creerMonde(ctx);
    for (const mode of ['FDUR', 'DDUR']) {
      const a = await creerActivite(ctx, m.chef, m.projet.id, { mode });
      expect(a.duree_validee, mode).toBe(1);
    }
  });

  it('ACT-6 : ALAP sans fin validée accepté', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id, { mode: 'ALAP' });
    expect(a).toMatchObject({ mode: 'ALAP', fin_valide: null });
  });

  it('ACT-7 : ASAP et MAN acceptés sans dates ni durée', async () => {
    const m = await creerMonde(ctx);
    for (const mode of ['ASAP', 'MAN']) {
      const a = await creerActivite(ctx, m.chef, m.projet.id, { mode });
      expect(a, mode).toMatchObject({ mode, debut_valide: null, fin_valide: null });
    }
  });

  it('ACT-8 : passer en START sans début validé par PATCH → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    const res = await api.patch(url.activite(a.id), { mode: 'START' });
    expect(res.statusCode).toBe(422);
    const { rows } = await ctx.pool.query<{ mode: string }>(
      'SELECT mode FROM activite WHERE id = $1',
      [a.id],
    );
    expect(rows[0]!.mode).toBe('ASAP');
    const ok = await api.patch(url.activite(a.id), { mode: 'START', debut_valide: '2027-01-06' });
    expect(ok.statusCode).toBe(200);
    expect(corps(ok)).toMatchObject({ mode: 'START', debut_valide: '2027-01-06' });
  });

  it('ACT-9 : sous-activité créée sous une activité du même projet', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.chef, m.projet.id);
    const enfant = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: parent.id });
    expect(enfant.parent_id).toBe(parent.id);
  });

  it('ACT-10 : modification de nom, priorité, dates validées, `close`', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const res = await appel(ctx, m.chef).patch(url.activite(a.id), {
      nom: 'Renommée',
      priorite: 100,
      debut_valide: '2027-01-05',
      fin_valide: '2027-01-12',
      close: true,
    });
    expect(res.statusCode).toBe(200);
    expect(corps(res)).toMatchObject({
      nom: 'Renommée',
      priorite: 100,
      debut_valide: '2027-01-05',
      fin_valide: '2027-01-12',
      close: true,
    });
    const relue = await appel(ctx, m.chef).get(url.activites(m.projet.id));
    expect(liste(relue)[0]).toMatchObject({ nom: 'Renommée', priorite: 100, close: true });
  });

  it('ACT-11 : dates planifiées et drapeaux non modifiables par l’API → 400', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx, m.chef);
    const interdits = [
      { debut_planifie: '2027-01-04' },
      { fin_planifiee: '2027-01-08' },
      { drapeaux: ['retard'] },
      { retard: true },
    ];
    for (const champs of interdits) {
      expect(
        (await api.patch(url.activite(a.id), champs)).statusCode,
        `PATCH ${Object.keys(champs)[0]}`,
      ).toBe(400);
      const creation = await api.post(url.activites(m.projet.id), { nom: 'Y', ...champs });
      expect(creation.statusCode, `POST ${Object.keys(champs)[0]}`).toBe(400);
    }
    expect(liste(await api.get(url.activites(m.projet.id)))).toHaveLength(1);
  });

  it('ACT-12-r2 : chef de projet écrit sur ses projets ; projet d’un autre → 403 ; ressource affectée → 404', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id);
    const parChef = await appel(ctx, m.chef).post(url.activites(m.projet.id), { nom: 'Chef' });
    expect(parChef.statusCode).toBe(201);
    expect(
      (await appel(ctx, m.chef).patch(url.activite(a.id), { nom: 'Modifiée' })).statusCode,
    ).toBe(200);
    await verifierRefus(ctx, m, [
      { methode: 'POST', adresse: url.activites(m.projet.id), corps: { nom: 'Z' } },
      { methode: 'PATCH', adresse: url.activite(a.id), corps: { nom: 'Pirate' } },
      { methode: 'DELETE', adresse: url.activite(a.id) },
    ]);
    expect(liste(await appel(ctx, m.admin).get(url.activites(m.projet.id)))).toHaveLength(2);
  });

  it('ACT-13-r1 : la ressource affectée ne lit plus les activités du projet (404)', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    expect(a.id).toBeGreaterThan(0);
    // Révision 6b (D-031, D-148 (2)) : la ressource affectée ne voit plus le projet → 404.
    expect((await appel(ctx, m.alice).get(url.activites(m.projet.id))).statusCode).toBe(404);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    expect((await appel(ctx, carole).get(url.activites(m.projet.id))).statusCode).toBe(404);
  });

  it('ACT-14-r1 : routes activités sans session → 401', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const api = appel(ctx);
    const refus = (requete: () => Promise<LightMyRequestResponse>) =>
      refusSansEffet(ctx, TABLES_ACT, 401, requete);
    await refus(() => api.get(url.activites(m.projet.id)));
    await refus(() => api.post(url.activites(m.projet.id), { nom: 'X' }));
    await refus(() => api.patch(url.activite(a.id), { nom: 'X' }));
    await refus(() => api.delete(url.activite(a.id)));
  });

  it('ACT-15 : mode ASAP par défaut', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    expect(a.mode).toBe('ASAP');
  });

  it('ACT-16 : parent d’un autre projet → 422', async () => {
    const m = await creerMonde(ctx);
    const etranger = await creerActivite(ctx, m.admin, m.autre.id);
    const res = await appel(ctx, m.admin).post(url.activites(m.projet.id), {
      nom: 'Orpheline',
      parent_id: etranger.id,
    });
    expect(res.statusCode).toBe(422);
    expect(liste(await appel(ctx, m.admin).get(url.activites(m.projet.id)))).toHaveLength(0);
  });

  it('ACT-17 : fin validée antérieure au début validé → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const creation = await api.post(url.activites(m.projet.id), {
      nom: 'Inversée',
      debut_valide: '2027-01-12',
      fin_valide: '2027-01-05',
    });
    expect(creation.statusCode).toBe(422);
    const a = await creerActivite(ctx, m.chef, m.projet.id, {
      debut_valide: '2027-01-05',
      fin_valide: '2027-01-12',
    });
    const modif = await api.patch(url.activite(a.id), { fin_valide: '2027-01-04' });
    expect(modif.statusCode).toBe(422);
    const relue = liste(await api.get(url.activites(m.projet.id)));
    expect(relue).toHaveLength(1);
    expect(relue[0]).toMatchObject({ debut_valide: '2027-01-05', fin_valide: '2027-01-12' });
    // début = fin : accepté
    const memeJour = await api.patch(url.activite(a.id), { fin_valide: '2027-01-05' });
    expect(memeJour.statusCode).toBe(200);
  });

  it('ACT-18 : durée validée inférieure à 1 → 422', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    for (const duree of [0, -3]) {
      const res = await api.post(url.activites(m.projet.id), {
        nom: 'D',
        mode: 'FDUR',
        duree_validee: duree,
      });
      expect(res.statusCode, `durée ${duree}`).toBe(422);
    }
    expect(liste(await api.get(url.activites(m.projet.id)))).toHaveLength(0);
    const a = await creerActivite(ctx, m.chef, m.projet.id, { mode: 'FDUR', duree_validee: 5 });
    expect((await api.patch(url.activite(a.id), { duree_validee: 0 })).statusCode).toBe(422);
    expect(liste(await api.get(url.activites(m.projet.id)))[0]!.duree_validee).toBe(5);
    expect(corps(await api.patch(url.activite(a.id), { duree_validee: 1 }))).toMatchObject({
      duree_validee: 1,
    });
  });

  it('ACT-19 : cycle dans l’arborescence des activités → 422', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const b = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: a.id });
    const c = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: b.id });
    const api = appel(ctx, m.chef);
    // cycle par le déplacement : A sous elle-même, A sous C (A > B > C)
    expect((await api.post(url.deplacer(a.id), { parent_id: a.id })).statusCode).toBe(422);
    expect((await api.post(url.deplacer(a.id), { parent_id: c.id })).statusCode).toBe(422);
    const { rows } = await ctx.pool.query<{ id: number; parent_id: number | null }>(
      'SELECT id, parent_id FROM element ORDER BY id',
    );
    expect(rows).toEqual([
      { id: a.id, parent_id: null },
      { id: b.id, parent_id: a.id },
      { id: c.id, parent_id: b.id },
    ]);
  });

  it('ACT-20 : suppression d’une activité : avec enfants → 409 ; sans enfant → supprimée avec ses dépendances et assignations', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.chef, m.projet.id);
    const enfant = await creerActivite(ctx, m.chef, m.projet.id, { parent_id: parent.id });
    const autre = await creerActivite(ctx, m.chef, m.projet.id);
    await creerAssignation(ctx, m.chef, enfant.id, m.alice.id, { charge_assignee: 2 });
    await creerAssignation(ctx, m.chef, autre.id, m.bob.id, { charge_assignee: 1 });
    await creerDependance(ctx, m.chef, m.projet.id, enfant.id, autre.id);
    const api = appel(ctx, m.chef);
    // avec enfants : refus, rien n'est supprimé
    expect((await api.delete(url.activite(parent.id))).statusCode).toBe(409);
    expect(await compter(ctx, 'element')).toBe(3);
    expect(await compter(ctx, 'assignation')).toBe(2);
    expect(await compter(ctx, 'dependance')).toBe(1);
    // sans enfant : supprimée avec ses dépendances et assignations (cascade complète)
    expect((await api.delete(url.activite(enfant.id))).statusCode).toBe(204);
    expect(await compter(ctx, 'element')).toBe(2);
    expect(await compter(ctx, 'activite')).toBe(2);
    expect(await compter(ctx, 'dependance')).toBe(0);
    expect(await compter(ctx, 'assignation')).toBe(1);
    const restants = await planning(ctx, m.chef, m.projet.id);
    expect(restants.map((e) => e.id)).toEqual([parent.id, autre.id]);
    // un jalon voisin n'est pas touché
    await creerJalon(ctx, m.chef, m.projet.id);
    expect(await compter(ctx, 'element')).toBe(3);
  });

  it('ACT-21-r1 : priorité d’activité hors de 0 à 1000 → 400', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.chef);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    for (const priorite of [-1, 1001]) {
      await refusSansEffet(
        ctx,
        TABLES_ACT,
        400,
        () => api.post(url.activites(m.projet.id), { nom: 'P', priorite }),
        `POST ${priorite}`,
      );
      await refusSansEffet(
        ctx,
        TABLES_ACT,
        400,
        () => api.patch(url.activite(a.id), { priorite }),
        `PATCH ${priorite}`,
      );
    }
    for (const priorite of [0, 1000]) {
      expect((await api.patch(url.activite(a.id), { priorite })).statusCode).toBe(200);
    }
  });
});
