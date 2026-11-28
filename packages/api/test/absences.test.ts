// Lot absences, tranche absences-1 (D-276) : ABT-1 à ABT-13.
// Valeurs attendues recopiées de SPEC §4, « Absences et charge depuis le taux (absences, D-276) », cas AB-1 à AB-10.
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerAssignation } from './lot1-t2-helpers.js';
import { calculer, empreinte, travail } from './lot2a-helpers.js';
import { imputer, lireFeuille, S1 } from './lot4a-helpers.js';
import { LEADER, requete } from './droits-helpers.js';

const JOUR = '2027-01-15';
const j = (n: number): string => `2027-01-${String(n).padStart(2, '0')}`;
const INTERDIT = { erreur: 'Interdit' };

interface Monde {
  admin: Acteur;
  chef: Acteur;
  horsPortee: Acteur;
  leader: Acteur;
  alice: Acteur;
  bob: Acteur;
  nora: Acteur;
  p: { id: number };
  q: { id: number };
}

/** A ; C chef de P ; H chef de Q ; L leader ; Alice (ressource, affectée à P) ; Bob (ressource, affecté à Q) ; Nora (non ressource). */
async function monde(ctx: TestCtx): Promise<Monde> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const horsPortee = await creerActeur(ctx, 'horsportee@example.test', 'chef_de_projet');
  const leader = await creerActeur(ctx, 'leader@example.test', LEADER);
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
  const nora = await creerActeur(ctx, 'nora@example.test', 'ressource');
  const p = await creerProjet(ctx, admin, { chef_id: chef.id });
  const q = await creerProjet(ctx, admin, { chef_id: horsPortee.id });
  await affecter(ctx, p.id, alice.id);
  await affecter(ctx, q.id, bob.id);
  return { admin, chef, horsPortee, leader, alice, bob, nora, p, q };
}

const absence = (ressourceId: number, champs: Record<string, unknown> = {}) => ({
  ressource_id: ressourceId,
  debut: j(4),
  fin: j(4),
  portion: 'journee',
  motif: 'conge',
  ...champs,
});

const poser = (ctx: TestCtx, qui: Acteur, corps: Record<string, unknown>) =>
  appel(ctx, qui).post('/api/absences', corps);

async function poserOk(ctx: TestCtx, qui: Acteur, corps: Record<string, unknown>) {
  const res = await poser(ctx, qui, corps);
  expect(res.statusCode, res.body).toBe(201);
  return res.json() as { id: number } & Record<string, unknown>;
}

/** Refus : statut, corps attendu éventuel, base inchangée. */
async function refus(
  ctx: TestCtx,
  statut: number,
  envoyer: () => ReturnType<ReturnType<typeof appel>['get']>,
  attendu?: unknown,
  libelle = '',
) {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, `${libelle} ${res.body}`).toBe(statut);
  if (attendu !== undefined) expect(res.json(), libelle).toMatchObject(attendu as object);
  expect(await empreinte(ctx), `base inchangée ${libelle}`).toEqual(avant);
}

async function historiqueAbsences(ctx: TestCtx) {
  const { rows } = await ctx.pool.query<{
    entite_id: number;
    operation: string;
    champ: string | null;
    projet_id: number | null;
    ancienne_valeur: unknown;
    nouvelle_valeur: unknown;
  }>(
    `SELECT entite_id, operation, champ, projet_id, ancienne_valeur, nouvelle_valeur
       FROM historique WHERE entite = 'absence' ORDER BY id`,
  );
  return rows;
}

describe('absences, API (SPEC §4 D-276, AB-1 à AB-7)', () => {
  const ctx = useTestApp(() => JOUR);

  it('ABT-1 : POST par la ressource pour elle-même → 201, objet complet, historique de création (AB-1)', async () => {
    const m = await monde(ctx);
    const a = await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(4), fin: j(8) }));
    expect(a).toEqual({
      id: a.id,
      ressource_id: m.alice.id,
      debut: j(4),
      fin: j(8),
      portion: 'journee',
      motif: 'conge',
    });
    const h = await historiqueAbsences(ctx);
    expect(h).toEqual([
      {
        entite_id: a.id,
        operation: 'creation',
        champ: null,
        projet_id: null,
        ancienne_valeur: null,
        nouvelle_valeur: a,
      },
    ]);
  });

  it('ABT-2 : corps invalides → 400, base inchangée (AB-2)', async () => {
    const m = await monde(ctx);
    const invalides = [
      absence(m.alice.id, { debut: j(8), fin: j(4) }),
      absence(m.alice.id, { debut: j(4), fin: j(5), portion: 'matin' }),
      absence(m.alice.id, { motif: 'vacances' }),
      absence(m.alice.id, { portion: 'soir' }),
      { ...absence(m.alice.id), inconnu: 1 },
      { debut: j(4), fin: j(4), portion: 'journee', motif: 'conge' },
    ];
    for (const c of invalides) {
      await refus(ctx, 400, () => poser(ctx, m.alice, c), undefined, JSON.stringify(c));
    }
  });

  it('ABT-3 : chevauchements → 409, matin et après-midi du même jour permis (AB-3)', async () => {
    const m = await monde(ctx);
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(4), fin: j(8) }));
    const code = { code: 'absence_chevauchement' };
    await refus(
      ctx,
      409,
      () => poser(ctx, m.alice, absence(m.alice.id, { debut: j(6), fin: j(6), portion: 'matin' })),
      code,
    );
    await refus(
      ctx,
      409,
      () => poser(ctx, m.alice, absence(m.alice.id, { debut: j(8), fin: j(10) })),
      code,
    );
    await poserOk(
      ctx,
      m.alice,
      absence(m.alice.id, { debut: j(11), fin: j(11), portion: 'matin' }),
    );
    await poserOk(
      ctx,
      m.alice,
      absence(m.alice.id, { debut: j(11), fin: j(11), portion: 'apres_midi' }),
    );
    await refus(
      ctx,
      409,
      () =>
        poser(ctx, m.alice, absence(m.alice.id, { debut: j(11), fin: j(11), portion: 'matin' })),
      code,
    );
    // une autre ressource n'est pas concernée
    await poserOk(ctx, m.bob, absence(m.bob.id, { debut: j(4), fin: j(8) }));
  });

  it('ABT-4 : jour imputé → 422 jour_impute, demi-journée permise, PATCH contrôlé (AB-4)', async () => {
    const m = await monde(ctx);
    const act = await creerActivite(ctx, m.admin, m.p.id, { nom: 'Activité' });
    const ass = await creerAssignation(ctx, m.admin, act.id, m.alice.id, { charge_assignee: 5 });
    await imputer(ctx, m.alice, S1, [
      { assignation_id: ass.id, imputations: [{ jour: j(5), charge: 1 }] },
    ]);
    await refus(
      ctx,
      422,
      () => poser(ctx, m.alice, absence(m.alice.id, { debut: j(4), fin: j(6) })),
      { code: 'jour_impute' },
    );
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(5), fin: j(5), portion: 'matin' }));
    const a = await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(7), fin: j(8) }));
    await refus(
      ctx,
      422,
      () => appel(ctx, m.alice).patch(`/api/absences/${a.id}`, { debut: j(4) }),
      { code: 'jour_impute' },
    );
  });

  it('ABT-5 : droits d’écriture en POST (AB-5)', async () => {
    const m = await monde(ctx);
    await poserOk(ctx, m.chef, absence(m.alice.id, { debut: j(4), fin: j(4) }));
    await refus(
      ctx,
      403,
      () => poser(ctx, m.horsPortee, absence(m.alice.id, { debut: j(5), fin: j(5) })),
      INTERDIT,
    );
    await poserOk(ctx, m.leader, absence(m.alice.id, { debut: j(6), fin: j(6) }));
    await refus(ctx, 403, () => poser(ctx, m.alice, absence(m.bob.id)), INTERDIT);
    await poserOk(ctx, m.admin, absence(m.bob.id, { debut: j(7), fin: j(7) }));
    await refus(ctx, 404, () => poser(ctx, m.admin, absence(999999)));
    await refus(ctx, 422, () => poser(ctx, m.admin, absence(m.nora.id)), {
      code: 'non_ressource',
    });
    await refus(ctx, 401, () => appel(ctx).post('/api/absences', absence(m.alice.id)));
  });

  it('ABT-6 : droits en PATCH et DELETE ; absence inconnue 404 (AB-5)', async () => {
    const m = await monde(ctx);
    const a = await poserOk(ctx, m.admin, absence(m.alice.id, { debut: j(4), fin: j(4) }));
    const url = `/api/absences/${a.id}`;
    for (const qui of [m.horsPortee, m.bob]) {
      await refus(ctx, 403, () => appel(ctx, qui).patch(url, { motif: 'autre' }), INTERDIT);
      await refus(ctx, 403, () => appel(ctx, qui).delete(url), INTERDIT);
    }
    for (const qui of [m.chef, m.leader, m.admin]) {
      const r = await appel(ctx, qui).patch(url, { motif: 'formation' });
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json()).toMatchObject({ motif: 'formation' });
      await appel(ctx, m.admin).patch(url, { motif: 'conge' });
    }
    await refus(ctx, 404, () =>
      appel(ctx, m.admin).patch('/api/absences/999999', { motif: 'autre' }),
    );
    await refus(ctx, 404, () => appel(ctx, m.admin).delete('/api/absences/999999'));
    await refus(ctx, 404, () => appel(ctx, m.admin).delete('/api/absences/abc'));
    await refus(ctx, 400, () => appel(ctx, m.admin).patch(url, { ressource_id: m.bob.id }));
    await refus(ctx, 400, () => appel(ctx, m.admin).patch(url, { fin: j(1) }));
    const d = await appel(ctx, m.chef).delete(url);
    expect(d.statusCode).toBe(204);
    const { rows } = await ctx.pool.query('SELECT 1 FROM absence WHERE id = $1', [a.id]);
    expect(rows).toEqual([]);
  });

  it('ABT-7 : lecture par rôle, filtre du/au (AB-6)', async () => {
    const m = await monde(ctx);
    const a1 = await poserOk(ctx, m.admin, absence(m.alice.id, { debut: j(4), fin: j(5) }));
    const a2 = await poserOk(ctx, m.admin, absence(m.alice.id, { debut: j(20), fin: j(20) }));
    const b1 = await poserOk(ctx, m.admin, absence(m.bob.id, { debut: j(6), fin: j(6) }));
    const lire = async (qui: Acteur, url: string) => {
      const r = await appel(ctx, qui).get(url);
      expect(r.statusCode, `${url} ${r.body}`).toBe(200);
      return (r.json() as { id: number }[]).map((x) => x.id);
    };
    expect(await lire(m.alice, '/api/absences')).toEqual([a1.id, a2.id]);
    expect(await lire(m.alice, `/api/absences?ressource_id=${m.alice.id}`)).toEqual([a1.id, a2.id]);
    await refus(
      ctx,
      403,
      () => appel(ctx, m.alice).get(`/api/absences?ressource_id=${m.bob.id}`),
      INTERDIT,
    );
    for (const qui of [m.chef, m.horsPortee, m.leader, m.admin]) {
      expect(await lire(qui, '/api/absences')).toEqual([a1.id, a2.id, b1.id]);
      expect(await lire(qui, `/api/absences?ressource_id=${m.bob.id}`)).toEqual([b1.id]);
    }
    expect(await lire(m.admin, `/api/absences?du=${j(5)}&au=${j(6)}`)).toEqual([a1.id, b1.id]);
    expect(await lire(m.admin, `/api/absences?ressource_id=${m.alice.id}&du=${j(6)}`)).toEqual([
      a2.id,
    ]);
    await refus(ctx, 400, () => appel(ctx, m.admin).get(`/api/absences?du=${j(6)}&au=${j(5)}`));
    await refus(ctx, 400, () => appel(ctx, m.admin).get('/api/absences?du=demain'));
    await refus(ctx, 404, () => appel(ctx, m.admin).get('/api/absences?ressource_id=999999'));
    await refus(ctx, 401, () => appel(ctx).get('/api/absences'));
  });

  it('ABT-8 : historique des modifications et suppressions ; lecture réservée à l’administrateur (AB-7)', async () => {
    const m = await monde(ctx);
    const a = await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(4), fin: j(4) }));
    const r = await appel(ctx, m.alice).patch(`/api/absences/${a.id}`, {
      fin: j(5),
      motif: 'formation',
    });
    expect(r.statusCode, r.body).toBe(200);
    const mem = await appel(ctx, m.alice).patch(`/api/absences/${a.id}`, { motif: 'formation' });
    expect(mem.statusCode).toBe(200);
    expect((await appel(ctx, m.alice).delete(`/api/absences/${a.id}`)).statusCode).toBe(204);
    const h = await historiqueAbsences(ctx);
    expect(h.map((x) => [x.operation, x.champ, x.ancienne_valeur, x.nouvelle_valeur])).toEqual([
      ['creation', null, null, a],
      ['modification', 'fin', j(4), j(5)],
      ['modification', 'motif', 'conge', 'formation'],
      ['suppression', null, { ...a, fin: j(5), motif: 'formation' }, null],
    ]);
    const lu = await appel(ctx, m.admin).get('/api/historique?entite=absence');
    expect(lu.statusCode).toBe(200);
    expect((lu.json() as unknown[]).length).toBe(4);
    await refus(ctx, 403, () => appel(ctx, m.chef).get('/api/historique?entite=absence'));
  });

  it('ABT-13 : la ressource modifie et supprime sa propre absence (AB-5)', async () => {
    const m = await monde(ctx);
    const a = await poserOk(ctx, m.alice, absence(m.alice.id));
    const r = await appel(ctx, m.alice).patch(`/api/absences/${a.id}`, {
      portion: 'apres_midi',
    });
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json()).toMatchObject({ portion: 'apres_midi' });
    expect((await appel(ctx, m.alice).delete(`/api/absences/${a.id}`)).statusCode).toBe(204);
  });
});

describe('absences, effets (SPEC §4 D-276, AB-8 à AB-10)', () => {
  const ctx = useTestApp(() => JOUR);

  it('ABT-9 : calcul, journée d’absence le 05/01, ASAP Alice 2 j → travail les 04 et 06/01 (AB-8)', async () => {
    const m = await monde(ctx);
    const act = await creerActivite(ctx, m.admin, m.p.id, { nom: 'ASAP' });
    const ass = await creerAssignation(ctx, m.admin, act.id, m.alice.id, { charge_assignee: 2 });
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(5), fin: j(5) }));
    const r = await calculer(ctx, m.admin, { projets: [m.p.id], d0: j(4) });
    expect(r.statusCode, r.body).toBe(200);
    expect((await travail(ctx, ass.id)).map((t) => [t.jour, Number(t.charge)])).toEqual([
      [j(4), 1],
      [j(6), 1],
    ]);
  });

  it('ABT-10 : feuille de temps, capacité et refus jour_absence (AB-9)', async () => {
    const m = await monde(ctx);
    const act = await creerActivite(ctx, m.admin, m.p.id, { nom: 'Activité' });
    const ass = await creerAssignation(ctx, m.admin, act.id, m.alice.id, { charge_assignee: 5 });
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(5), fin: j(5) }));
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(6), fin: j(6), portion: 'matin' }));
    const f = await lireFeuille(ctx, m.alice, S1);
    expect(f.jours.map((x) => [x.jour, x.capacite])).toEqual([
      [j(4), 1],
      [j(5), 0],
      [j(6), 0.5],
      [j(7), 1],
      [j(8), 1],
      [j(9), 0],
      [j(10), 0],
    ]);
    await refus(
      ctx,
      422,
      () =>
        requete(ctx, m.alice, 'PUT', `/api/feuilles?semaine=${S1}`, {
          lignes: [{ assignation_id: ass.id, imputations: [{ jour: j(5), charge: 1 }] }],
        }),
      { code: 'jour_absence' },
    );
    // la demi-journée reste saisissable
    await imputer(ctx, m.alice, S1, [
      { assignation_id: ass.id, imputations: [{ jour: j(6), charge: 0.5 }] },
    ]);
  });

  it('ABT-11 : planning manuel, jour d’absence non ouvré, saisie nouvelle refusée (AB-10)', async () => {
    const m = await monde(ctx);
    const act = await creerActivite(ctx, m.admin, m.p.id, { nom: 'Manuel', mode: 'MAN' });
    const ass = await creerAssignation(ctx, m.admin, act.id, m.alice.id, { charge_assignee: 0 });
    await poserOk(ctx, m.alice, absence(m.alice.id, { debut: j(5), fin: j(5) }));
    const r = await appel(ctx, m.admin).get(
      `/api/activites/${act.id}/jours-non-ouvres?mois=2027-01`,
    );
    expect(r.statusCode).toBe(200);
    const jours = (r.json() as { jours_non_ouvres: { jours: string[] }[] }).jours_non_ouvres[0]!
      .jours;
    expect(jours).toContain(j(5));
    expect(jours).not.toContain(j(4));
    await refus(
      ctx,
      422,
      () =>
        requete(ctx, m.admin, 'PUT', `/api/activites/${act.id}/saisies?mois=2027-01`, {
          saisies: [{ assignation_id: ass.id, jour: j(5), demi_journee: 'matin' }],
        }),
      { code: 'jour_non_ouvre' },
    );
  });

  it('ABT-12 : migration 020, contraintes de la table absence', async () => {
    const m = await monde(ctx);
    const inserer = (debut: string, fin: string, portion: string, motif: string) =>
      ctx.pool.query(
        'INSERT INTO absence (ressource_id, debut, fin, portion, motif) VALUES ($1, $2, $3, $4, $5)',
        [m.alice.id, debut, fin, portion, motif],
      );
    await expect(inserer(j(5), j(4), 'journee', 'conge')).rejects.toThrow();
    await expect(inserer(j(4), j(5), 'matin', 'conge')).rejects.toThrow();
    await expect(inserer(j(4), j(4), 'soir', 'conge')).rejects.toThrow();
    await expect(inserer(j(4), j(4), 'journee', 'vacances')).rejects.toThrow();
    await inserer(j(4), j(4), 'matin', 'autre');
    await ctx.pool.query(
      `INSERT INTO historique (utilisateur_id, entite, entite_id, operation) VALUES ($1, 'absence', 1, 'suppression')`,
      [m.admin.id],
    );
  });
});
