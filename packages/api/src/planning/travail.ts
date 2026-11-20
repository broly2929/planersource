import type { Db } from '../db/erreurs.js';

/** Travail planifié par jour des activités d'un projet (SPEC §6 « Travail par jour », D-114 (2)). Aucune écriture. */
export interface LigneTravail {
  element_id: number;
  assignation_id: number;
  ressource_id: number;
  jour: string;
  charge: number;
  surcharge: boolean;
}

/** Charge à 2 décimales, convertie en SQL (D-044 (5)) : jamais Number sur un numeric. */
export async function lireTravail(db: Db, projetId: number): Promise<LigneTravail[]> {
  const { rows } = await db.query<LigneTravail>(
    `SELECT s.activite_id AS element_id, s.id AS assignation_id, s.ressource_id,
            t.jour::text AS jour, ((t.charge * 100)::int)::float8 / 100 AS charge, t.surcharge
       FROM travail_planifie t
       JOIN assignation s ON s.id = t.assignation_id
      WHERE s.projet_id = $1
      ORDER BY s.activite_id, s.id, t.jour`,
    [projetId],
  );
  return rows;
}
