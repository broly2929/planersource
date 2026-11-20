import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { transactionSerialisee } from '../src/db/transaction.js';
import { useTestApp } from './helpers.js';
import { affecter } from './lot1-helpers.js';
import { calculer, creerMonde, empreinte, tache } from './lot2a-helpers.js';

describe('Reprises du lot 2a (lot 2b-0, D-047)', () => {
  const ctx = useTestApp();

  it('CALC-25 : projet lisible en lecture seule puis projet inconnu → 404 (jamais 403), empreinte inchangée', async () => {
    const m = await creerMonde(ctx);
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [
      m.autreChef.id,
    ]);
    await affecter(ctx, m.projet.id, m.autreChef.id);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const avant = await empreinte(ctx);
    const res = await calculer(ctx, m.autreChef, {
      projets: [m.projet.id, 999999],
      d0: '2027-01-04',
    });
    expect(res.statusCode).toBe(404);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('TRX-3 : si pg_advisory_lock échoue, la connexion est détruite et non rendue au pool', async () => {
    const client = await ctx.pool.connect();
    const requete = client.query.bind(client) as (...a: unknown[]) => Promise<unknown>;
    (client as unknown as { query: unknown }).query = (texte: unknown, ...reste: unknown[]) =>
      typeof texte === 'string' && texte.includes('pg_advisory_lock')
        ? Promise.reject(new Error('verrou refusé'))
        : requete(texte, ...reste);
    const rendu: unknown[] = [];
    const reelle = client.release.bind(client);
    client.release = ((detruire?: unknown) => {
      rendu.push(detruire);
      reelle(detruire as boolean | undefined);
    }) as typeof client.release;
    const faux = { connect: async () => client } as unknown as pg.Pool;
    await expect(transactionSerialisee(faux, 'calcul', async () => 1)).rejects.toThrow(
      'verrou refusé',
    );
    expect(rendu).toEqual([true]);
  });
});
