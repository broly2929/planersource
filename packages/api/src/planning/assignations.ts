import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Assignation {
  id: number;
  activite_id: number;
  projet_id: number;
  ressource_id: number;
  taux: number;
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
}

const COLONNES =
  'id, activite_id, projet_id, ressource_id, taux, charge_assignee, charge_reelle, reste_a_faire';

export async function lireAssignations(db: Db, projetId: number): Promise<Assignation[]> {
  const { rows } = await db.query<Assignation>(
    `SELECT ${COLONNES} FROM assignation WHERE projet_id = $1 ORDER BY id`,
    [projetId],
  );
  return rows;
}

export async function lireAssignation(db: Db, id: number): Promise<Assignation | null> {
  const { rows } = await db.query<Assignation>(
    `SELECT ${COLONNES} FROM assignation WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface NouvelleAssignation {
  ressource_id: number;
  taux: number;
  charge_assignee: number;
}

/** Sans transaction interne (l'appelant l'ouvre) : le reste à faire initial est la charge assignée. */
export async function creerAssignation(
  db: Db,
  par: number,
  activiteId: number,
  projetId: number,
  d: NouvelleAssignation,
): Promise<Assignation> {
  const { rows } = await db.query<Assignation>(
    `INSERT INTO assignation (activite_id, projet_id, ressource_id, taux, charge_assignee, reste_a_faire)
     VALUES ($1, $2, $3, $4, $5, $5) RETURNING ${COLONNES}`,
    [activiteId, projetId, d.ressource_id, d.taux, d.charge_assignee],
  );
  const assignation = rows[0]!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'assignation',
    avant: null,
    apres: assignation,
    projetId,
  });
  return assignation;
}

/**
 * Tant que la charge réelle vaut 0, le reste à faire est recalé sur la charge assignée ; ce recalage
 * est historisé comme tout champ modifié (D-034). Dans une transaction.
 */
export async function modifierAssignation(
  db: Db,
  par: number,
  id: number,
  d: Pick<Assignation, 'taux' | 'charge_assignee'>,
): Promise<Assignation | null> {
  await verrouiller(db, 'assignation', id);
  const avant = await lireAssignation(db, id);
  const { rows } = await db.query<Assignation>(
    `UPDATE assignation
        SET taux = $2, charge_assignee = $3,
            reste_a_faire = CASE WHEN charge_reelle = 0 THEN $3 ELSE reste_a_faire END
      WHERE id = $1 RETURNING ${COLONNES}`,
    [id, d.taux, d.charge_assignee],
  );
  const apres = rows[0] ?? null;
  if (avant && apres) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'assignation',
      avant,
      apres,
      projetId: apres.projet_id,
    });
  }
  return apres;
}

/** Dans une transaction : supprimée seulement si la charge réelle vaut 0. */
export async function supprimerAssignation(db: Db, par: number, id: number): Promise<boolean> {
  const avant = await lireAssignation(db, id);
  const { rowCount } = await db.query(
    'DELETE FROM assignation WHERE id = $1 AND charge_reelle = 0',
    [id],
  );
  if (!avant || !rowCount) return false;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'assignation',
    avant,
    apres: null,
    projetId: avant.projet_id,
  });
  return true;
}
