import { describe, expect, it } from 'vitest';
import { transactionSerialisee } from '../src/db/transaction.js';
import { useTestApp } from './helpers.js';

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Transaction sérialisée (lot 2a-I, D-044 4)', () => {
  const ctx = useTestApp();

  const verrous = async (): Promise<number> =>
    Number(
      (
        (
          await ctx.pool.query(
            // Révision D-031 (D-196) : verrous de la base courante seulement ; pg_locks couvre
            // tout le serveur, donc aussi les bases des autres workers de vitest.
            `SELECT count(*) AS n FROM pg_locks
              WHERE locktype = 'advisory'
                AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
          )
        ).rows[0] as { n: string }
      ).n,
    );

  it('TRX-1 : deux transactions de même clé lancées ensemble ne se chevauchent pas', async () => {
    const journal: string[] = [];
    const unite = (nom: string, duree: number) => async () => {
      journal.push(`${nom}:debut`);
      await attendre(duree);
      journal.push(`${nom}:fin`);
    };
    const a = transactionSerialisee(ctx.pool, 'calcul', unite('a', 150));
    await attendre(30);
    const b = transactionSerialisee(ctx.pool, 'calcul', unite('b', 10));
    await Promise.all([a, b]);
    expect(journal).toEqual(['a:debut', 'a:fin', 'b:debut', 'b:fin']);
  });

  it('TRX-2-r1 : REPEATABLE READ ; aucun verrou ne reste après un succès ni après un échec ; l’échec annule', async () => {
    await ctx.pool.query('CREATE TABLE essai (x integer)');
    const niveau = await transactionSerialisee(ctx.pool, 'calcul', async (db) => {
      await db.query('INSERT INTO essai VALUES (1)');
      return (
        (await db.query('SHOW transaction_isolation')).rows[0] as { transaction_isolation: string }
      ).transaction_isolation;
    });
    expect(niveau).toBe('repeatable read');
    expect(await verrous()).toBe(0);
    await expect(
      transactionSerialisee(ctx.pool, 'calcul', async (db) => {
        await db.query('INSERT INTO essai VALUES (2)');
        throw new Error('échec voulu');
      }),
    ).rejects.toThrow('échec voulu');
    expect(await verrous()).toBe(0);
    const { rows } = await ctx.pool.query('SELECT x FROM essai ORDER BY x');
    expect(rows).toEqual([{ x: 1 }]);
  });
});
