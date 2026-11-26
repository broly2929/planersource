// Lot taux, tranche 1 (D-258) : taux par équipe. TEQ-1 à TEQ-8.
// Valeurs attendues recopiées de SPEC §12.6 points 1, 2, 4, 5, 7 et de §12.1 points 2, 3, 7.
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
  type Corps,
} from './lot1-helpers.js';
import { equipe } from './pilotage-helpers.js';
import {
  ajouterTauxEquipe,
  CHEVAUCHEMENT,
  FIN_AVANT_DEBUT,
  INTERDIT,
  rattacher,
  refus,
  urlTauxEquipe,
  urlUnTauxEquipe,
} from './taux-helpers.js';

interface Monde {
  admin: Acteur;
  chef: Acteur;
  /** Chef de projet ressource, affecté à `autre` qu'il lit sans y écrire. */
  lecteur: Acteur;
  alice: Acteur;
  bob: Acteur;
  /** Alice (membre) est affectée à un projet du chef. */
  dev: number;
  /** Bob (membre) n'est affecté qu'à `autre`, dirigé par l'administrateur. */
  ops: number;
  /** Équipe sans membre. */
  vide: number;
}

async function monde(ctx: TestCtx): Promise<Monde> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
  const dev = await equipe(ctx, 'Dev');
  const ops = await equipe(ctx, 'Ops');
  const vide = await equipe(ctx, 'Vide');
  await rattacher(ctx, alice.id, dev);
  await rattacher(ctx, bob.id, ops);
  const sien = await creerProjet(ctx, admin, { chef_id: chef.id });
  const autre = await creerProjet(ctx, admin, { chef_id: admin.id });
  await affecter(ctx, sien.id, alice.id);
  await affecter(ctx, autre.id, bob.id);
  await affecter(ctx, autre.id, lecteur.id);
  return { admin, chef, lecteur, alice, bob, dev, ops, vide };
}

describe('Lot taux-1 : taux par équipe (SPEC §12.6, D-258)', () => {
  const ctx = useTestApp();

  it('TEQ-1 : GET sans taux : liste vide ; POST (ouverte puis fermée) → 201, corps exact ; GET trié par début', async () => {
    const m = await monde(ctx);
    const vide = await appel(ctx, m.admin).get(urlTauxEquipe(m.dev));
    expect(vide.statusCode, vide.body).toBe(200);
    expect(vide.json()).toEqual([]);
    const ouverte = await ajouterTauxEquipe(ctx, m.admin, m.dev, {
      debut: '2027-02-01',
      montant: 650,
    });
    expect(ouverte).toEqual({
      id: ouverte.id,
      equipe_id: m.dev,
      debut: '2027-02-01',
      fin: null,
      montant: 650,
    });
    const fermee = await ajouterTauxEquipe(ctx, m.admin, m.dev, {
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600.5,
    });
    expect(fermee).toEqual({
      id: fermee.id,
      equipe_id: m.dev,
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600.5,
    });
    const res = await appel(ctx, m.admin).get(urlTauxEquipe(m.dev));
    expect(res.statusCode).toBe(200);
    expect(liste(res)).toEqual([fermee, ouverte]);
    // une autre équipe reste sans taux
    expect((await appel(ctx, m.admin).get(urlTauxEquipe(m.ops))).json()).toEqual([]);
  });

  it('TEQ-2 : corps invalides (400) et fin antérieure au début (422), base inchangée ; 999999,99 accepté', async () => {
    const m = await monde(ctx);
    const t = await ajouterTauxEquipe(ctx, m.admin, m.dev, {
      debut: '2027-01-01',
      fin: '2027-12-31',
      montant: 600,
    });
    const invalides: Corps[] = [
      { montant: 600 },
      { debut: '2027-13-01', montant: 600 },
      { debut: 'demain', montant: 600 },
      { debut: '2028-01-01', montant: 0 },
      { debut: '2028-01-01', montant: -1 },
      { debut: '2028-01-01', montant: 1000000 },
      { debut: '2028-01-01', montant: 600.001 },
      { debut: '2028-01-01', montant: '600' },
      { debut: '2028-01-01' },
      { debut: '2028-01-01', montant: 600, inconnu: 1 },
      { debut: '2028-01-01', montant: 600, equipe_id: m.ops },
      { debut: '2028-01-01', fin: 'jamais', montant: 600 },
    ];
    for (const c of invalides) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).post(urlTauxEquipe(m.dev), c),
        400,
        undefined,
        `POST ${JSON.stringify(c)}`,
      );
    }
    const invalidesPatch: Corps[] = [
      { montant: 0 },
      { montant: 1000000 },
      { montant: 600.001 },
      { debut: null },
      { debut: 'x' },
      { inconnu: 1 },
      { equipe_id: m.ops },
    ];
    for (const c of invalidesPatch) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).patch(urlUnTauxEquipe(t.id), c),
        400,
        undefined,
        `PATCH ${JSON.stringify(c)}`,
      );
    }
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).post(urlTauxEquipe(m.dev), {
          debut: '2028-01-10',
          fin: '2028-01-09',
          montant: 600,
        }),
      422,
      FIN_AVANT_DEBUT,
      'POST fin avant début',
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTauxEquipe(t.id), { fin: '2026-12-31' }),
      422,
      FIN_AVANT_DEBUT,
      'PATCH fin avant début',
    );
    await ajouterTauxEquipe(ctx, m.admin, m.dev, { debut: '2030-01-01', montant: 999999.99 });
  });

  it('TEQ-3 : chevauchement bornes comprises, ouverte, englobante, PATCH : 409 ; trou permis ; autre équipe non concernée', async () => {
    const m = await monde(ctx);
    const a = await ajouterTauxEquipe(ctx, m.admin, m.dev, {
      debut: '2027-01-01',
      fin: '2027-01-10',
      montant: 600,
    });
    const post = (c: Corps) => () => appel(ctx, m.admin).post(urlTauxEquipe(m.dev), c);
    const cas: [Corps, string][] = [
      [{ debut: '2027-01-10', fin: '2027-01-20', montant: 600 }, 'borne commune'],
      [{ debut: '2026-12-01', fin: '2027-01-01', montant: 600 }, 'borne de début'],
      [{ debut: '2026-12-01', fin: '2027-02-01', montant: 600 }, 'englobante'],
      [{ debut: '2027-01-03', fin: '2027-01-04', montant: 600 }, 'incluse'],
      [{ debut: '2026-01-01', montant: 600 }, 'ouverte avant'],
    ];
    for (const [c, libelle] of cas) await refus(ctx, post(c), 409, CHEVAUCHEMENT, libelle);
    // trou permis
    const b = await ajouterTauxEquipe(ctx, m.admin, m.dev, { debut: '2027-01-11', montant: 700 });
    await refus(
      ctx,
      post({ debut: '2030-01-01', fin: '2030-12-31', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'après une ouverte',
    );
    // une autre équipe n'est pas concernée
    await ajouterTauxEquipe(ctx, m.admin, m.ops, { debut: '2027-01-05', montant: 500 });
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTauxEquipe(a.id), { fin: '2027-01-11' }),
      409,
      CHEVAUCHEMENT,
      'PATCH fin',
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTauxEquipe(a.id), { fin: null }),
      409,
      CHEVAUCHEMENT,
      'PATCH ouverte',
    );
    // PATCH d'une période sur elle-même
    const res = await appel(ctx, m.admin).patch(urlUnTauxEquipe(b.id), { montant: 720 });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res)).toEqual({
      id: b.id,
      equipe_id: m.dev,
      debut: '2027-01-11',
      fin: null,
      montant: 720,
    });
    const res2 = await appel(ctx, m.admin).patch(urlUnTauxEquipe(a.id), {
      debut: '2027-01-02',
      fin: '2027-01-10',
    });
    expect(res2.statusCode, res2.body).toBe(200);
  });

  it('TEQ-4 : deux POST concurrents qui se chevauchent : un 201, un 409, une seule période', async () => {
    const m = await monde(ctx);
    for (let i = 0; i < 5; i += 1) {
      const e = await equipe(ctx, `Concurrence ${i}`);
      const envoyer = (debut: string) =>
        appel(ctx, m.admin).post(urlTauxEquipe(e), { debut, montant: 600 });
      const res = await Promise.all([envoyer('2027-01-01'), envoyer('2027-06-01')]);
      expect(res.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      const lu = await appel(ctx, m.admin).get(urlTauxEquipe(e));
      expect(liste(lu)).toHaveLength(1);
    }
  });

  it('TEQ-5 : PATCH 200, DELETE 204 ; historique entité taux_equipe (création, modification par champ, suppression), sans projet', async () => {
    const m = await monde(ctx);
    const t = await ajouterTauxEquipe(ctx, m.admin, m.dev, {
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600,
    });
    const res = await appel(ctx, m.admin).patch(urlUnTauxEquipe(t.id), {
      debut: '2027-01-02',
      fin: null,
      montant: 600,
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res)).toEqual({
      id: t.id,
      equipe_id: m.dev,
      debut: '2027-01-02',
      fin: null,
      montant: 600,
    });
    const del = await appel(ctx, m.admin).delete(urlUnTauxEquipe(t.id));
    expect(del.statusCode, del.body).toBe(204);
    expect((await appel(ctx, m.admin).get(urlTauxEquipe(m.dev))).json()).toEqual([]);
    const h = await appel(ctx, m.admin).get('/api/historique?entite=taux_equipe');
    expect(h.statusCode, h.body).toBe(200);
    const entrees = liste(h)
      .map((e) => ({
        entite: e.entite,
        entite_id: e.entite_id,
        operation: e.operation,
        champ: e.champ,
        ancienne_valeur: e.ancienne_valeur,
        nouvelle_valeur: e.nouvelle_valeur,
      }))
      .sort((x, y) =>
        `${String(x.operation)}${String(x.champ)}`.localeCompare(
          `${String(y.operation)}${String(y.champ)}`,
        ),
      );
    expect(entrees).toEqual([
      {
        entite: 'taux_equipe',
        entite_id: t.id,
        operation: 'creation',
        champ: null,
        ancienne_valeur: null,
        nouvelle_valeur: {
          id: t.id,
          equipe_id: m.dev,
          debut: '2027-01-01',
          fin: '2027-01-31',
          montant: 600,
        },
      },
      {
        entite: 'taux_equipe',
        entite_id: t.id,
        operation: 'modification',
        champ: 'debut',
        ancienne_valeur: '2027-01-01',
        nouvelle_valeur: '2027-01-02',
      },
      {
        entite: 'taux_equipe',
        entite_id: t.id,
        operation: 'modification',
        champ: 'fin',
        ancienne_valeur: '2027-01-31',
        nouvelle_valeur: null,
      },
      {
        entite: 'taux_equipe',
        entite_id: t.id,
        operation: 'suppression',
        champ: null,
        ancienne_valeur: {
          id: t.id,
          equipe_id: m.dev,
          debut: '2027-01-02',
          fin: null,
          montant: 600,
        },
        nouvelle_valeur: null,
      },
    ]);
    const { rows } = await ctx.pool.query(
      "SELECT projet_id FROM historique WHERE entite = 'taux_equipe'",
    );
    expect(rows).toHaveLength(4);
    expect(rows.every((r: { projet_id: unknown }) => r.projet_id === null)).toBe(true);
  });

  it('TEQ-6 : lecture : chef dont un projet a un membre affecté 200 ; autres cas 403 ou 404 dans l’ordre ; 401', async () => {
    const m = await monde(ctx);
    await ajouterTauxEquipe(ctx, m.admin, m.dev, { debut: '2027-01-01', montant: 400 });
    await ajouterTauxEquipe(ctx, m.admin, m.ops, { debut: '2027-01-01', montant: 300 });
    const ok = await appel(ctx, m.chef).get(urlTauxEquipe(m.dev));
    expect(ok.statusCode, ok.body).toBe(200);
    expect(liste(ok).map((t) => t.montant)).toEqual([400]);
    const admin = await appel(ctx, m.admin).get(urlTauxEquipe(m.ops));
    expect(admin.statusCode, admin.body).toBe(200);
    expect(liste(admin).map((t) => t.montant)).toEqual([300]);
    // Ops : Bob n'est affecté qu'à un projet que le chef ne dirige pas, que le lecteur lit sans écrire
    await refus(
      ctx,
      () => appel(ctx, m.chef).get(urlTauxEquipe(m.ops)),
      403,
      INTERDIT,
      'hors portée',
    );
    await refus(
      ctx,
      () => appel(ctx, m.lecteur).get(urlTauxEquipe(m.ops)),
      403,
      INTERDIT,
      'lecture seule',
    );
    await refus(ctx, () => appel(ctx, m.chef).get(urlTauxEquipe(m.vide)), 403, INTERDIT, 'vide');
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlTauxEquipe(m.dev)),
      403,
      INTERDIT,
      'ressource, son équipe',
    );
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlTauxEquipe(999999)),
      403,
      INTERDIT,
      'ressource, inconnue (403 avant 404)',
    );
    for (const id of ['999999', 'abc', '2147483648', '-1']) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).get(urlTauxEquipe(id)),
        404,
        undefined,
        `admin ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.chef).get(urlTauxEquipe(id)),
        404,
        undefined,
        `chef ${id} (404 avant 403)`,
      );
    }
    await refus(ctx, () => appel(ctx).get(urlTauxEquipe(m.dev)), 401, undefined, 'sans session');
  });

  it('TEQ-7 : écriture : chef et ressource 403 avant 404 et 400 ; administrateur 404, puis 400, 422, 409 ; 401 ; base inchangée', async () => {
    const m = await monde(ctx);
    const t = await ajouterTauxEquipe(ctx, m.admin, m.dev, { debut: '2027-01-01', montant: 400 });
    const valide = { debut: '2028-01-01', montant: 600 };
    // le chef lit Dev (TEQ-6) mais n'y écrit pas
    for (const qui of [m.chef, m.alice]) {
      await refus(ctx, () => appel(ctx, qui).post(urlTauxEquipe(m.dev), valide), 403, INTERDIT);
      await refus(
        ctx,
        () => appel(ctx, qui).patch(urlUnTauxEquipe(t.id), { montant: 1 }),
        403,
        INTERDIT,
      );
      await refus(ctx, () => appel(ctx, qui).delete(urlUnTauxEquipe(t.id)), 403, INTERDIT);
      await refus(ctx, () => appel(ctx, qui).post(urlTauxEquipe(999999), { x: 1 }), 403, INTERDIT);
      await refus(
        ctx,
        () => appel(ctx, qui).patch(urlUnTauxEquipe(999999), { x: 1 }),
        403,
        INTERDIT,
      );
      await refus(ctx, () => appel(ctx, qui).delete(urlUnTauxEquipe(999999)), 403, INTERDIT);
    }
    for (const id of ['999999', 'abc', '2147483648', '-1']) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).post(urlTauxEquipe(id), { x: 1 }),
        404,
        undefined,
        `POST ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.admin).patch(urlUnTauxEquipe(id), { x: 1 }),
        404,
        undefined,
        `PATCH ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.admin).delete(urlUnTauxEquipe(id)),
        404,
        undefined,
        `DELETE ${id}`,
      );
    }
    // 400 avant 422 : corps invalide et fin avant début
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).post(urlTauxEquipe(m.dev), {
          debut: '2028-01-10',
          fin: '2028-01-09',
          montant: 0,
        }),
      400,
      undefined,
      'POST 400 avant 422',
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTauxEquipe(t.id), { fin: '2026-12-31', montant: 0 }),
      400,
      undefined,
      'PATCH 400 avant 422',
    );
    // 422 avant 409 : fin avant début, dans la période ouverte existante
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).post(urlTauxEquipe(m.dev), {
          debut: '2027-05-10',
          fin: '2027-05-09',
          montant: 1,
        }),
      422,
      FIN_AVANT_DEBUT,
      'POST 422 avant 409',
    );
    await refus(ctx, () => appel(ctx).post(urlTauxEquipe(m.dev), valide), 401);
    await refus(ctx, () => appel(ctx).patch(urlUnTauxEquipe(t.id), { montant: 1 }), 401);
    await refus(ctx, () => appel(ctx).delete(urlUnTauxEquipe(t.id)), 401);
  });

  it('TEQ-8 : DELETE d’une équipe avec taux : 409 « Équipe avec des taux » ; membres d’abord ; chef 403 ; sans taux : 204', async () => {
    const m = await monde(ctx);
    const t = await ajouterTauxEquipe(ctx, m.admin, m.vide, { debut: '2027-01-01', montant: 400 });
    await ajouterTauxEquipe(ctx, m.admin, m.dev, { debut: '2027-01-01', montant: 400 });
    await refus(
      ctx,
      () => appel(ctx, m.admin).delete(`/api/equipes/${m.vide}`),
      409,
      { erreur: 'Équipe avec des taux' },
      'équipe sans membre avec taux',
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).delete(`/api/equipes/${m.dev}`),
      409,
      { erreur: 'Équipe utilisée : suppression refusée' },
      'membres et taux : refus existant d’abord',
    );
    await refus(
      ctx,
      () => appel(ctx, m.chef).delete(`/api/equipes/${m.vide}`),
      403,
      undefined,
      'chef',
    );
    expect((await appel(ctx, m.admin).delete(urlUnTauxEquipe(t.id))).statusCode).toBe(204);
    const res = await appel(ctx, m.admin).delete(`/api/equipes/${m.vide}`);
    expect(res.statusCode, res.body).toBe(204);
  });
});
