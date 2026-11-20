import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Dependance {
  id: number;
  projet_id: number;
  predecesseur_id: number;
  successeur_id: number;
  type: string;
  delai: number;
}

const COLONNES = 'id, projet_id, predecesseur_id, successeur_id, type, delai';

export async function lireDependances(db: Db, projetId: number): Promise<Dependance[]> {
  const { rows } = await db.query<Dependance>(
    `SELECT ${COLONNES} FROM dependance WHERE projet_id = $1 ORDER BY id`,
    [projetId],
  );
  return rows;
}

export async function lireDependance(db: Db, id: number): Promise<Dependance | null> {
  const { rows } = await db.query<Dependance>(`SELECT ${COLONNES} FROM dependance WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export interface NouvelleDependance {
  predecesseur_id: number;
  successeur_id: number;
  type: string;
  delai: number;
}

/** Sans transaction interne (l'appelant l'ouvre) : écriture et historique, atomiques. */
export async function creerDependance(
  db: Db,
  par: number,
  projetId: number,
  d: NouvelleDependance,
): Promise<Dependance> {
  const { rows } = await db.query<Dependance>(
    `INSERT INTO dependance (projet_id, predecesseur_id, successeur_id, type, delai)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLONNES}`,
    [projetId, d.predecesseur_id, d.successeur_id, d.type, d.delai],
  );
  const dependance = rows[0]!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'dependance',
    avant: null,
    apres: dependance,
    projetId,
  });
  return dependance;
}

/** Dans une transaction : l'historique et la modification sont atomiques. */
export async function modifierDependance(
  db: Db,
  par: number,
  id: number,
  d: Pick<Dependance, 'type' | 'delai'>,
): Promise<Dependance | null> {
  await verrouiller(db, 'dependance', id);
  const avant = await lireDependance(db, id);
  const { rows } = await db.query<Dependance>(
    `UPDATE dependance SET type = $2, delai = $3 WHERE id = $1 RETURNING ${COLONNES}`,
    [id, d.type, d.delai],
  );
  const apres = rows[0] ?? null;
  if (avant && apres) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'dependance',
      avant,
      apres,
      projetId: apres.projet_id,
    });
  }
  return apres;
}

/** Dans une transaction. */
export async function supprimerDependance(db: Db, par: number, id: number): Promise<void> {
  const avant = await lireDependance(db, id);
  await db.query('DELETE FROM dependance WHERE id = $1', [id]);
  if (avant) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'dependance',
      avant,
      apres: null,
      projetId: avant.projet_id,
    });
  }
}
