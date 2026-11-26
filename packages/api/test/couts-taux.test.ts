// Lot couts, tranche 1 (D-225) : taux journalier par période. TJ-1 à TJ-10.
// Valeurs attendues recopiées de SPEC §12.1 et de D-225.
import { describe, expect, it } from 'vitest';
import { chevauche } from '../src/planning/taux.js';
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
import { empreinte } from './lot2a-helpers.js';

const urlTaux = (utilisateurId: number | string) => `/api/utilisateurs/${utilisateurId}/taux`;
const urlUnTaux = (id: number | string) => `/api/taux/${id}`;

const CHEVAUCHEMENT = {
  erreur: 'Période de taux qui chevauche une autre',
  code: 'taux_chevauchement',
};
const FIN_AVANT_DEBUT = { erreur: 'La date de fin précède la date de début' };

interface Monde {
  admin: Acteur;
  chef: Acteur;
  alice: Acteur;
  bob: Acteur;
  nonRessource: Acteur;
}

async function monde(ctx: TestCtx): Promise<Monde> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const bob = await creerActeur(ctx, 'bob@example.test', 'ressource', true);
  const nonRessource = await creerActeur(ctx, 'nr@example.test', 'chef_de_projet');
  return { admin, chef, alice, bob, nonRessource };
}

async function ajouter(ctx: TestCtx, par: Acteur, utilisateurId: number, champs: Corps) {
  const res = await appel(ctx, par).post(urlTaux(utilisateurId), champs);
  expect(res.statusCode, res.body).toBe(201);
  return corps(res) as Corps & { id: number };
}

/** Refus : statut, corps exact si donné, base identique (historique compris). */
async function refus(
  ctx: TestCtx,
  envoyer: () => ReturnType<ReturnType<typeof appel>['get']>,
  statut: number,
  attendu?: Corps,
  libelle = '',
): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, `${libelle} ${res.body}`).toBe(statut);
  if (attendu) expect(res.json(), libelle).toEqual(attendu);
  expect(await empreinte(ctx), `base modifiée par un refus ${libelle}`).toEqual(avant);
}

describe('Lot couts-1 : taux journalier (SPEC §12.1, D-225)', () => {
  const ctx = useTestApp();

  it('TJ-1 : POST (fermée puis ouverte) → 201, GET trié par début ; sans taux : liste vide', async () => {
    const m = await monde(ctx);
    const vide = await appel(ctx, m.admin).get(urlTaux(m.bob.id));
    expect(vide.statusCode).toBe(200);
    expect(vide.json()).toEqual([]);
    const ouverte = await ajouter(ctx, m.admin, m.alice.id, { debut: '2027-02-01', montant: 650 });
    expect(ouverte).toEqual({
      id: ouverte.id,
      utilisateur_id: m.alice.id,
      debut: '2027-02-01',
      fin: null,
      montant: 650,
    });
    const fermee = await ajouter(ctx, m.admin, m.alice.id, {
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600.5,
    });
    expect(fermee).toEqual({
      id: fermee.id,
      utilisateur_id: m.alice.id,
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600.5,
    });
    const res = await appel(ctx, m.admin).get(urlTaux(m.alice.id));
    expect(res.statusCode).toBe(200);
    expect(liste(res).map((t) => t.debut)).toEqual(['2027-01-01', '2027-02-01']);
    expect(liste(res)).toEqual([fermee, ouverte]);
  });

  it('TJ-2 : POST sur un utilisateur non ressource : 422, base inchangée', async () => {
    const m = await monde(ctx);
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).post(urlTaux(m.nonRessource.id), { debut: '2027-01-01', montant: 600 }),
      422,
      { erreur: 'Seule une ressource a un taux journalier' },
    );
  });

  it('TJ-3 : corps invalides (400) et fin antérieure au début (422), base inchangée', async () => {
    const m = await monde(ctx);
    const t = await ajouter(ctx, m.admin, m.alice.id, {
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
      { debut: '2028-01-01', montant: 1.0000000001 },
      { debut: '2028-01-01', montant: '600' },
      { debut: '2028-01-01' },
      { debut: '2028-01-01', montant: 600, inconnu: 1 },
      { debut: '2028-01-01', fin: 'jamais', montant: 600 },
    ];
    for (const c of invalides) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).post(urlTaux(m.alice.id), c),
        400,
        undefined,
        JSON.stringify(c),
      );
    }
    const invalidesPatch: Corps[] = [
      { montant: 0 },
      { montant: 1000000 },
      { montant: 600.001 },
      { debut: null },
      { debut: 'x' },
      { inconnu: 1 },
      { utilisateur_id: m.bob.id },
    ];
    for (const c of invalidesPatch) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).patch(urlUnTaux(t.id), c),
        400,
        undefined,
        JSON.stringify(c),
      );
    }
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).post(urlTaux(m.alice.id), {
          debut: '2028-01-10',
          fin: '2028-01-09',
          montant: 600,
        }),
      422,
      FIN_AVANT_DEBUT,
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTaux(t.id), { fin: '2026-12-31' }),
      422,
      FIN_AVANT_DEBUT,
    );
    // 999999,99 est la borne permise
    await ajouter(ctx, m.admin, m.alice.id, { debut: '2030-01-01', montant: 999999.99 });
  });

  it('TJ-4 : chevauchement bornes comprises, période ouverte, englobante, PATCH : 409 ; trou permis', async () => {
    const m = await monde(ctx);
    const a = await ajouter(ctx, m.admin, m.alice.id, {
      debut: '2027-01-01',
      fin: '2027-01-10',
      montant: 600,
    });
    const post = (c: Corps) => () => appel(ctx, m.admin).post(urlTaux(m.alice.id), c);
    await refus(
      ctx,
      post({ debut: '2027-01-10', fin: '2027-01-20', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'borne commune',
    );
    await refus(
      ctx,
      post({ debut: '2026-12-01', fin: '2027-01-01', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'borne de début',
    );
    await refus(
      ctx,
      post({ debut: '2026-12-01', fin: '2027-02-01', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'englobante',
    );
    await refus(
      ctx,
      post({ debut: '2027-01-03', fin: '2027-01-04', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'incluse',
    );
    await refus(
      ctx,
      post({ debut: '2026-01-01', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'ouverte avant',
    );
    // trou permis
    const b = await ajouter(ctx, m.admin, m.alice.id, { debut: '2027-01-11', montant: 700 });
    await refus(
      ctx,
      post({ debut: '2030-01-01', fin: '2030-12-31', montant: 600 }),
      409,
      CHEVAUCHEMENT,
      'après une ouverte',
    );
    // une autre ressource n'est pas concernée
    await ajouter(ctx, m.admin, m.bob.id, { debut: '2027-01-05', montant: 500 });
    // PATCH qui crée un chevauchement
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTaux(a.id), { fin: '2027-01-11' }),
      409,
      CHEVAUCHEMENT,
      'PATCH fin',
    );
    await refus(
      ctx,
      () => appel(ctx, m.admin).patch(urlUnTaux(a.id), { fin: null }),
      409,
      CHEVAUCHEMENT,
      'PATCH ouverte',
    );
    // PATCH d'une période sur elle-même
    const res = await appel(ctx, m.admin).patch(urlUnTaux(b.id), { montant: 720 });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res).montant).toBe(720);
    const res2 = await appel(ctx, m.admin).patch(urlUnTaux(a.id), {
      debut: '2027-01-02',
      fin: '2027-01-10',
    });
    expect(res2.statusCode, res2.body).toBe(200);
  });

  it('TJ-5 : deux POST concurrents qui se chevauchent : un 201, un 409, une seule période', async () => {
    const m = await monde(ctx);
    const envoyer = (debut: string) =>
      appel(ctx, m.admin).post(urlTaux(m.alice.id), { debut, montant: 600 });
    for (let i = 0; i < 5; i += 1) {
      await ctx.pool.query('DELETE FROM taux_journalier');
      const res = await Promise.all([envoyer('2027-01-01'), envoyer('2027-06-01')]);
      expect(res.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      const { rows } = await ctx.pool.query('SELECT 1 FROM taux_journalier');
      expect(rows).toHaveLength(1);
    }
  });

  it('TJ-6 : PATCH 200, DELETE 204 ; historique entité taux (création, modification par champ, suppression)', async () => {
    const m = await monde(ctx);
    const t = await ajouter(ctx, m.admin, m.alice.id, {
      debut: '2027-01-01',
      fin: '2027-01-31',
      montant: 600,
    });
    const res = await appel(ctx, m.admin).patch(urlUnTaux(t.id), {
      debut: '2027-01-02',
      fin: null,
      montant: 600,
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(corps(res)).toEqual({
      id: t.id,
      utilisateur_id: m.alice.id,
      debut: '2027-01-02',
      fin: null,
      montant: 600,
    });
    const del = await appel(ctx, m.admin).delete(urlUnTaux(t.id));
    expect(del.statusCode).toBe(204);
    expect((await appel(ctx, m.admin).get(urlTaux(m.alice.id))).json()).toEqual([]);
    const h = await appel(ctx, m.admin).get('/api/historique?entite=taux');
    expect(h.statusCode, h.body).toBe(200);
    const entrees = (liste(h) as Corps[])
      .map((e) => ({
        entite: e.entite,
        entite_id: e.entite_id,
        operation: e.operation,
        champ: e.champ,
        ancienne_valeur: e.ancienne_valeur,
        nouvelle_valeur: e.nouvelle_valeur,
      }))
      .sort((x, y) => `${x.operation}${x.champ}`.localeCompare(`${y.operation}${y.champ}`));
    expect(entrees).toEqual([
      {
        entite: 'taux',
        entite_id: t.id,
        operation: 'creation',
        champ: null,
        ancienne_valeur: null,
        nouvelle_valeur: {
          id: t.id,
          utilisateur_id: m.alice.id,
          debut: '2027-01-01',
          fin: '2027-01-31',
          montant: 600,
        },
      },
      {
        entite: 'taux',
        entite_id: t.id,
        operation: 'modification',
        champ: 'debut',
        ancienne_valeur: '2027-01-01',
        nouvelle_valeur: '2027-01-02',
      },
      {
        entite: 'taux',
        entite_id: t.id,
        operation: 'modification',
        champ: 'fin',
        ancienne_valeur: '2027-01-31',
        nouvelle_valeur: null,
      },
      {
        entite: 'taux',
        entite_id: t.id,
        operation: 'suppression',
        champ: null,
        ancienne_valeur: {
          id: t.id,
          utilisateur_id: m.alice.id,
          debut: '2027-01-02',
          fin: null,
          montant: 600,
        },
        nouvelle_valeur: null,
      },
    ]);
    const { rows } = await ctx.pool.query("SELECT projet_id FROM historique WHERE entite = 'taux'");
    expect(rows.every((r: { projet_id: unknown }) => r.projet_id === null)).toBe(true);
  });

  it('TJ-7 : lecture : chef qui écrit sur un projet de la ressource 200 ; autres cas 403 ou 404 ; 401', async () => {
    const m = await monde(ctx);
    const lecteurSeul = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
    const sien = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    const autre = await creerProjet(ctx, m.admin, { chef_id: m.admin.id });
    await affecter(ctx, sien.id, m.alice.id);
    await affecter(ctx, autre.id, m.bob.id);
    // le lecteur lit `autre` (il y est affecté) sans y écrire
    await affecter(ctx, autre.id, lecteurSeul.id);
    await ajouter(ctx, m.admin, m.alice.id, { debut: '2027-01-01', montant: 600 });
    await ajouter(ctx, m.admin, m.bob.id, { debut: '2027-01-01', montant: 500 });
    const ok = await appel(ctx, m.chef).get(urlTaux(m.alice.id));
    expect(ok.statusCode, ok.body).toBe(200);
    expect(liste(ok).map((t) => t.montant)).toEqual([600]);
    // Bob est affecté à `autre`, que le lecteur lit sans écrire ; le chef ne le voit pas du tout
    await refus(
      ctx,
      () => appel(ctx, lecteurSeul).get(urlTaux(m.bob.id)),
      403,
      { erreur: 'Interdit' },
      'lecture seule',
    );
    await refus(
      ctx,
      () => appel(ctx, m.chef).get(urlTaux(m.bob.id)),
      403,
      { erreur: 'Interdit' },
      'non affectée',
    );
    await refus(
      ctx,
      () => appel(ctx, m.chef).get(urlTaux(m.nonRessource.id)),
      403,
      { erreur: 'Interdit' },
      'non ressource',
    );
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlTaux(m.alice.id)),
      403,
      { erreur: 'Interdit' },
      'ressource, ses taux',
    );
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlTaux(999999)),
      403,
      { erreur: 'Interdit' },
      'ressource, inconnu',
    );
    for (const id of ['999999', 'abc', '2147483648', '-1']) {
      await refus(ctx, () => appel(ctx, m.admin).get(urlTaux(id)), 404, undefined, `admin ${id}`);
      await refus(ctx, () => appel(ctx, m.chef).get(urlTaux(id)), 404, undefined, `chef ${id}`);
    }
    await refus(ctx, () => appel(ctx).get(urlTaux(m.alice.id)), 401, undefined, 'sans session');
  });

  it('TJ-8-r1 : écriture : ressource 403 (le chef dans sa portée écrit, D-258 (5)), taux inconnu 404, ordre 403 → 404 → 400 ; base inchangée', async () => {
    const m = await monde(ctx);
    const sien = await creerProjet(ctx, m.admin, { chef_id: m.chef.id });
    await affecter(ctx, sien.id, m.alice.id);
    const t = await ajouter(ctx, m.admin, m.alice.id, { debut: '2027-01-01', montant: 600 });
    const valide = { debut: '2028-01-01', montant: 600 };
    // D-258 (5), révision D-031 : seule l'attente « le chef dans sa portée reçoit 403 » change ; le chef
    // est couvert par TCH-1 à TCH-5.
    for (const qui of [m.alice]) {
      await refus(ctx, () => appel(ctx, qui).post(urlTaux(m.alice.id), valide), 403, {
        erreur: 'Interdit',
      });
      await refus(ctx, () => appel(ctx, qui).patch(urlUnTaux(t.id), { montant: 1 }), 403, {
        erreur: 'Interdit',
      });
      await refus(ctx, () => appel(ctx, qui).delete(urlUnTaux(t.id)), 403, { erreur: 'Interdit' });
      // 403 avant 404 et 400
      await refus(ctx, () => appel(ctx, qui).post(urlTaux(999999), { x: 1 }), 403, {
        erreur: 'Interdit',
      });
      await refus(ctx, () => appel(ctx, qui).patch(urlUnTaux(999999), { x: 1 }), 403, {
        erreur: 'Interdit',
      });
    }
    for (const id of ['999999', 'abc', '2147483648']) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).post(urlTaux(id), { x: 1 }),
        404,
        undefined,
        `POST ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.admin).patch(urlUnTaux(id), { x: 1 }),
        404,
        undefined,
        `PATCH ${id}`,
      );
      await refus(
        ctx,
        () => appel(ctx, m.admin).delete(urlUnTaux(id)),
        404,
        undefined,
        `DELETE ${id}`,
      );
    }
    await refus(ctx, () => appel(ctx).post(urlTaux(m.alice.id), valide), 401);
    await refus(ctx, () => appel(ctx).delete(urlUnTaux(t.id)), 401);
  });

  it('TJ-9 : est_ressource: false sur un utilisateur qui a un taux : 409, base inchangée ; sans taux : 200', async () => {
    const m = await monde(ctx);
    const t = await ajouter(ctx, m.admin, m.alice.id, { debut: '2027-01-01', montant: 600 });
    await refus(
      ctx,
      () =>
        appel(ctx, m.admin).patch(`/api/utilisateurs/${m.alice.id}`, {
          est_ressource: false,
          nom: 'Autre',
        }),
      409,
      { erreur: 'Utilisateur avec des taux : il reste ressource' },
    );
    expect((await appel(ctx, m.admin).delete(urlUnTaux(t.id))).statusCode).toBe(204);
    const res = await appel(ctx, m.admin).patch(`/api/utilisateurs/${m.alice.id}`, {
      est_ressource: false,
    });
    expect(res.statusCode, res.body).toBe(200);
  });

  it('TJ-10 : chevauche (fonction pure) : bornes comprises, ouverte, période exclue, trous', () => {
    const p = [
      { id: 1, debut: '2027-01-01', fin: '2027-01-10' },
      { id: 2, debut: '2027-02-01', fin: null },
    ];
    expect(chevauche(p, { debut: '2027-01-10', fin: '2027-01-15' })).toBe(true);
    expect(chevauche(p, { debut: '2026-12-01', fin: '2027-01-01' })).toBe(true);
    expect(chevauche(p, { debut: '2027-01-11', fin: '2027-01-31' })).toBe(false);
    expect(chevauche(p, { debut: '2027-01-11', fin: null })).toBe(true);
    expect(chevauche(p, { debut: '2099-01-01', fin: '2099-01-02' })).toBe(true);
    expect(chevauche(p, { debut: '2026-01-01', fin: null })).toBe(true);
    expect(chevauche(p, { debut: '2027-01-05', fin: '2027-01-20' }, 1)).toBe(false);
    expect(chevauche(p, { debut: '2027-01-05', fin: null }, 1)).toBe(true);
    expect(chevauche(p, { debut: '2027-03-01', fin: null }, 2)).toBe(false);
    expect(chevauche([], { debut: '2027-01-01', fin: null })).toBe(false);
  });
});
