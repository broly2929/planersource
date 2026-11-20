import { describe, expect, it } from 'vitest';
import { buildApp, type AppDeps } from '../src/app.js';
import { testConfig, useTestApp } from './helpers.js';
import { corps } from './lot1-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  datesProjet,
  empreinte,
  etatDes,
  jours,
  tache,
  travail,
} from './lot2a-helpers.js';

/*
 * Lot 3c-I (D-074, SPEC §6 « Calcul (lot 3c, D-074) ») : verrou de calcul à attente bornée,
 * identifiants hors plage entier. Le délai est injecté par AppDeps.delaiVerrouCalcul (millisecondes).
 */
const D0 = '2027-01-04';
const AUTRE_D0 = '2027-01-11';
const CLE_VERROU = 'calcul';

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('Calcul : verrou à attente bornée et identifiants (lot 3c-I, D-074)', () => {
  const ctx = useTestApp();

  /** Remplace l'application du contexte par une application avec délai de verrou injecté. */
  async function avecDelai(delaiVerrouCalcul: number): Promise<void> {
    await ctx.app.close();
    ctx.app = buildApp({
      pool: ctx.pool,
      config: testConfig(),
      delaiVerrouCalcul,
    } as AppDeps);
    await ctx.app.ready();
  }

  /** Verrous consultatifs de la base (accordés ou en attente). */
  const verrous = async (): Promise<number> =>
    Number(
      (
        (await ctx.pool.query("SELECT count(*) AS n FROM pg_locks WHERE locktype = 'advisory'"))
          .rows[0] as { n: string }
      ).n,
    );

  /** Verrou de calcul pris par une autre session. */
  async function tenirVerrou() {
    const client = await ctx.pool.connect();
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [CLE_VERROU]);
    return {
      async liberer() {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [CLE_VERROU]);
        client.release();
      },
    };
  }

  it('TRX-4 : verrou tenu au-delà du délai → 409 { erreur }, base inchangée, aucun verrou restant', async () => {
    await avecDelai(300);
    const m = await creerMonde(ctx);
    const { activite, assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 3);
    const premier = await calculer(ctx, m.admin, { projets: [m.projet.id], d0: D0 });
    expect(premier.statusCode).toBe(200);
    const avantTravail = await travail(ctx, assignation.id);
    expect(avantTravail).toEqual(
      jours(4, 5, 6).map((jour) => ({ jour, charge: 1, surcharge: false })),
    );
    const avantActivite = await datesActivite(ctx, activite.id);
    const avantProjet = await datesProjet(ctx, m.projet.id);
    const avant = await etatDes(ctx, [m.projet.id]);

    const verrou = await tenirVerrou();
    let enAttente: ReturnType<typeof calculer> | undefined;
    try {
      // un calcul à un autre D0 écrirait d'autres dates s'il s'exécutait
      enAttente = calculer(ctx, m.admin, { projets: [m.projet.id], d0: AUTRE_D0 });
      const reponse = await Promise.race([enAttente, attendre(3000).then(() => null)]);
      expect(
        reponse,
        'le calcul attend le verrou sans limite : pas de réponse en 3 s',
      ).not.toBeNull();
      expect(reponse!.statusCode).toBe(409);
      expect(corps(reponse!)).toEqual({ erreur: 'Un calcul est déjà en cours' });
      expect(await etatDes(ctx, [m.projet.id])).toEqual(avant);
      expect(await travail(ctx, assignation.id)).toEqual(avantTravail);
      expect(await datesActivite(ctx, activite.id)).toEqual(avantActivite);
      expect(await datesProjet(ctx, m.projet.id)).toEqual(avantProjet);
      // seul le verrou de l'autre session reste : la requête en attente a été annulée
      expect(await verrous()).toBe(1);
    } finally {
      await verrou.liberer();
      await enAttente;
    }
    expect(await verrous()).toBe(0);
  });

  it('TRX-5 : verrou libéré avant le délai → 200, projet calculé à D0, aucun verrou restant', async () => {
    await avecDelai(5000);
    const m = await creerMonde(ctx);
    const { activite, assignation } = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const verrou = await tenirVerrou();
    const enAttente = calculer(ctx, m.admin, { projets: [m.projet.id], d0: D0 });
    await attendre(300);
    await verrou.liberer();
    const reponse = await enAttente;
    expect(reponse.statusCode, reponse.body).toBe(200);
    expect(await travail(ctx, assignation.id)).toEqual(
      jours(4, 5).map((jour) => ({ jour, charge: 1, surcharge: false })),
    );
    expect(await datesActivite(ctx, activite.id)).toMatchObject({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-05',
    });
    expect(await verrous()).toBe(0);
  });

  it('CALC-50 : identifiant 2147483648 dans projets (seul, puis avec un projet valide) → 400, base inchangée', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const avant = await empreinte(ctx);
    for (const projets of [[2147483648], [m.projet.id, 2147483648]]) {
      const reponse = await calculer(ctx, m.admin, { projets, d0: D0 });
      expect(reponse.statusCode, `projets ${JSON.stringify(projets)} : ${reponse.body}`).toBe(400);
      expect(await empreinte(ctx)).toEqual(avant);
    }
  });
});
