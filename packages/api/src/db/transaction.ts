import type pg from 'pg';
import type { Db } from './erreurs.js';

/** Exécute `fn` dans une transaction (annulée si `fn` échoue). Les fonctions `creerX(db, …)` n'en ouvrent jamais. */
export async function transaction<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultat = await fn(client);
    await client.query('COMMIT');
    return resultat;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Le verrou n'a pas été obtenu dans le délai imparti (D-074 2). */
export class ErreurVerrouOccupe extends Error {
  constructor() {
    super('verrou occupé');
    this.name = 'ErreurVerrouOccupe';
  }
}

const PAS_ATTENTE_MS = 25;

/**
 * Transaction REPEATABLE READ sous verrou consultatif de session (D-044 4) : un seul `fn` à la fois
 * par clé. Le verrou est pris avant le BEGIN, pour que l'instantané soit pris après lui. Le verrou
 * est libéré dans `finally` ; si la libération (ou l'annulation) échoue, la connexion est détruite,
 * ce qui libère le verrou de session.
 * Sans `delaiMs`, l'attente du verrou n'est pas bornée ; avec, elle l'est (essais `pg_try_advisory_lock`
 * toutes les 25 ms, aucune requête n'attend côté serveur) et `ErreurVerrouOccupe` est levée au-delà.
 */
export async function transactionSerialisee<T>(
  pool: pg.Pool,
  cle: string,
  fn: (db: Db) => Promise<T>,
  delaiMs?: number,
): Promise<T> {
  const client = await pool.connect();
  let detruire = false;
  let verrouPris = false;
  try {
    try {
      if (delaiMs === undefined) {
        await client.query('SELECT pg_advisory_lock(hashtext($1))', [cle]);
      } else {
        const limite = Date.now() + delaiMs;
        for (;;) {
          const { rows } = await client.query<{ pris: boolean }>(
            'SELECT pg_try_advisory_lock(hashtext($1)) AS pris',
            [cle],
          );
          if (rows[0]!.pris) break;
          if (Date.now() >= limite) throw new ErreurVerrouOccupe();
          await new Promise((r) => setTimeout(r, PAS_ATTENTE_MS));
        }
      }
    } catch (err) {
      detruire = true; // le verrou a pu être pris côté serveur : la connexion est détruite
      throw err;
    }
    verrouPris = true;
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      const resultat = await fn(client);
      await client.query('COMMIT');
      return resultat;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        detruire = true;
      }
      throw err;
    }
  } finally {
    if (verrouPris && !detruire) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [cle]);
      } catch {
        detruire = true;
      }
    }
    client.release(detruire);
  }
}
