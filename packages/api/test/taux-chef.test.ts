// Lot taux, tranche 1 (D-258) : écriture des taux propres par le chef de projet. TCH-1 à TCH-5.
// Valeurs attendues recopiées de SPEC §12.6 point 6 et de §12.1 points 2, 3.
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import {
  affecter,
  appel,
  corps,
  creerActeur,
  creerProjet,
  liste,
  type Acteur,
} from './lot1-helpers.js';
import { poserTaux } from './couts-helpers.js';
import {
  ajouterTaux,
  CHEVAUCHEMENT,
  FIN_AVANT_DEBUT,
  INTERDIT,
  refus,
  urlTaux,
  urlUnTaux,
} from './taux-helpers.js';

interface Monde {
  admin: Acteur;
  chef: Acteur;
  /** Chef de projet ressource, affecté à `autre` qu'il lit sans y écrire. */
  lecteur: Acteur;
  /** Affectée à un projet du chef. */
  alice: Acteur;
  /** Affecté seulement à `autre`, dirigé par l'administrateur. */
  bob: Acteur;
  /** Affectée seulement à un sous-projet d'un projet du chef. */
  carol: Acteur;
  /** Ressource affectée à aucun projet. */
  dan: Acteur;
}

async function monde(ctx: TestCtx): Promise<Monde> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
  const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
  const dan = await creerActeur(ctx, 'dan@example.test', 'ressource', true);
  const sien = await creerProjet(ctx, admin, { chef_id: chef.id });
  const sous = await creerProjet(ctx, admin, { chef_id: admin.id, parent_id: sien.id });
  const autre = await creerProjet(ctx, admin, { chef_id: admin.id });
  await affecter(ctx, sien.id, alice.id);
  await affecter(ctx, sous.id, carol.id);
  await affecter(ctx, autre.id, bob.id);
  await affecter(ctx, autre.id, lecteur.id);
  return { admin, chef, lecteur, alice, bob, carol, dan };
}

describe('Lot taux-1 : écriture des taux propres par le chef (SPEC §12.6 point 6, D-258)', () => {
  const ctx = useTestApp();

  it('TCH-1 : chef, ressource affectée à son projet : POST → 201, corps exact, visible au GET, historique taux', async () => {
    const m = await monde(ctx);
    const res = await appel(ctx, m.chef).post(urlTaux(m.alice.id), {
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600,
    });
    expect(res.statusCode, res.body).toBe(201);
    const t = corps(res) as { id: number };
    expect(corps(res)).toEqual({
      id: t.id,
      utilisateur_id: m.alice.id,
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600,
    });
    const lu = await appel(ctx, m.chef).get(urlTaux(m.alice.id));
    expect(lu.statusCode, lu.body).toBe(200);
    expect(liste(lu)).toEqual([corps(res)]);
    const h = await appel(ctx, m.admin).get('/api/historique?entite=taux');
    expect(h.statusCode, h.body).toBe(200);
    expect(
      liste(h).map((e) => ({
        utilisateur_id: e.utilisateur_id,
        entite_id: e.entite_id,
        operation: e.operation,
      })),
    ).toEqual([{ utilisateur_id: m.chef.id, entite_id: t.id, operation: 'creation' }]);
  });

  it('TCH-2 : chef dans sa portée : PATCH → 200, DELETE → 204', async () => {
    const m = await monde(ctx);
    const t = await ajouterTaux(ctx, m.admin, m.alice.id, { debut: '2027-01-01', montant: 600 });
    const res = await appel(ctx, m.chef).patch(urlUnTaux(t.id), {
      fin: '2027-12-31',
      montant: 650.5,
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res)).toEqual({
      id: t.id,
      utilisateur_id: m.alice.id,
      debut: '2027-01-01',
      fin: '2027-12-31',
      montant: 650.5,
    });
    const del = await appel(ctx, m.chef).delete(urlUnTaux(t.id));
    expect(del.statusCode, del.body).toBe(204);
    expect((await appel(ctx, m.admin).get(urlTaux(m.alice.id))).json()).toEqual([]);
  });

  it('TCH-3 : ressource affectée à un sous-projet d’un projet du chef : POST → 201', async () => {
    const m = await monde(ctx);
    const res = await appel(ctx, m.chef).post(urlTaux(m.carol.id), {
      debut: '2027-03-01',
      montant: 500,
    });
    expect(res.statusCode, res.body).toBe(201);
    expect(liste(await appel(ctx, m.admin).get(urlTaux(m.carol.id)))).toHaveLength(1);
  });

  it('TCH-4 : hors portée (ressource non affectée, projet lu sans écrire) : POST, PATCH, DELETE 403, base inchangée', async () => {
    const m = await monde(ctx);
    const tBob = await ajouterTaux(ctx, m.admin, m.bob.id, { debut: '2027-01-01', montant: 500 });
    const tDan = await ajouterTaux(ctx, m.admin, m.dan.id, { debut: '2027-01-01', montant: 500 });
    const valide = { debut: '2028-01-01', montant: 600 };
    const cas: [Acteur, Acteur, number, string][] = [
      [m.chef, m.bob, tBob.id, 'chef, ressource d’un projet d’un autre'],
      [m.chef, m.dan, tDan.id, 'chef, ressource sans affectation'],
      [m.lecteur, m.bob, tBob.id, 'chef qui lit le projet sans y écrire'],
    ];
    for (const [qui, ressource, tauxId, libelle] of cas) {
      await refus(
        ctx,
        () => appel(ctx, qui).post(urlTaux(ressource.id), valide),
        403,
        INTERDIT,
        `POST ${libelle}`,
      );
      await refus(
        ctx,
        () => appel(ctx, qui).patch(urlUnTaux(tauxId), { montant: 1 }),
        403,
        INTERDIT,
        `PATCH ${libelle}`,
      );
      await refus(
        ctx,
        () => appel(ctx, qui).delete(urlUnTaux(tauxId)),
        403,
        INTERDIT,
        `DELETE ${libelle}`,
      );
    }
    // un chef ne s'attribue pas de taux à lui-même par ce biais : le lecteur n'écrit sur aucun projet
    await refus(
      ctx,
      () => appel(ctx, m.lecteur).post(urlTaux(m.lecteur.id), valide),
      403,
      INTERDIT,
      'lecteur, ses propres taux',
    );
  });

  it('TCH-5 : ordre des refus : 401, 403 ressource, 404, 403 hors portée, 400, 422, 409 ; base inchangée', async () => {
    const m = await monde(ctx);
    await poserTaux(ctx, m.alice.id, [['2027-01-01', null, 600]]);
    const { rows } = await ctx.pool.query<{ id: number }>(
      'SELECT id FROM taux_journalier WHERE utilisateur_id = $1',
      [m.alice.id],
    );
    const tAlice = rows[0]!.id;
    const tBob = await ajouterTaux(ctx, m.admin, m.bob.id, { debut: '2027-01-01', montant: 500 });
    // 401
    await refus(ctx, () => appel(ctx).post(urlTaux(m.alice.id), { x: 1 }), 401, undefined, '401');
    // 403 rôle ressource avant 404
    await refus(
      ctx,
      () => appel(ctx, m.alice).post(urlTaux(999999), { x: 1 }),
      403,
      INTERDIT,
      'ressource, inconnu',
    );
    await refus(
      ctx,
      () => appel(ctx, m.alice).patch(urlUnTaux(999999), { x: 1 }),
      403,
      INTERDIT,
      'ressource, taux inconnu',
    );
    // 404 avant le 403 du chef
    for (const id of ['999999', 'abc', '2147483648']) {
      await refus(
        ctx,
        () => appel(ctx, m.chef).post(urlTaux(id), { x: 1 }),
        404,
        undefined,
        `chef POST ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.chef).patch(urlUnTaux(id), { x: 1 }),
        404,
        undefined,
        `chef PATCH ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.chef).delete(urlUnTaux(id)),
        404,
        undefined,
        `chef DELETE ${id}`,
      );
    }
    // 403 hors portée avant 400
    await refus(
      ctx,
      () => appel(ctx, m.chef).post(urlTaux(m.bob.id), { x: 1 }),
      403,
      INTERDIT,
      'hors portée, corps invalide',
    );
    await refus(
      ctx,
      () => appel(ctx, m.chef).patch(urlUnTaux(tBob.id), { montant: 0 }),
      403,
      INTERDIT,
      'hors portée, PATCH invalide',
    );
    // dans sa portée : 400 avant 422
    await refus(
      ctx,
      () =>
        appel(ctx, m.chef).post(urlTaux(m.alice.id), {
          debut: '2028-01-10',
          fin: '2028-01-09',
          montant: 0,
        }),
      400,
      undefined,
      'portée, 400 avant 422',
    );
    await refus(
      ctx,
      () => appel(ctx, m.chef).patch(urlUnTaux(tAlice), { montant: 600.001 }),
      400,
      undefined,
      'portée, PATCH 400',
    );
    // 422 avant 409 (dans la période ouverte existante)
    await refus(
      ctx,
      () =>
        appel(ctx, m.chef).post(urlTaux(m.alice.id), {
          debut: '2027-05-10',
          fin: '2027-05-09',
          montant: 1,
        }),
      422,
      FIN_AVANT_DEBUT,
      'portée, 422 avant 409',
    );
    // 409
    await refus(
      ctx,
      () =>
        appel(ctx, m.chef).post(urlTaux(m.alice.id), {
          debut: '2027-06-01',
          fin: '2027-06-30',
          montant: 1,
        }),
      409,
      CHEVAUCHEMENT,
      'portée, 409',
    );
  });
});
