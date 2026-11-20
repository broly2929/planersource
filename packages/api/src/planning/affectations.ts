import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Affectation {
  id: number;
  projet_id: number;
  ressource_id: number;
  taux: number;
  date_debut: string | null;
  date_fin: string | null;
}

const COLONNES = 'id, projet_id, ressource_id, taux, date_debut, date_fin';

export async function lireAffectations(db: Db, projetId: number): Promise<Affectation[]> {
  const { rows } = await db.query<Affectation>(
    `SELECT ${COLONNES} FROM affectation_projet WHERE projet_id = $1 ORDER BY id`,
    [projetId],
  );
  return rows;
}

export async function lireAffectation(db: Db, id: number): Promise<Affectation | null> {
  const { rows } = await db.query<Affectation>(
    `SELECT ${COLONNES} FROM affectation_projet WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export type NouvelleAffectation = Omit<Affectation, 'id'>;

/** Sans transaction interne (l'appelant l'ouvre) : réutilisable par la copie de projet (lot 1b). */
export async function creerAffectation(
  db: Db,
  par: number,
  d: NouvelleAffectation,
): Promise<Affectation> {
  const { rows } = await db.query<Affectation>(
    `INSERT INTO affectation_projet (projet_id, ressource_id, taux, date_debut, date_fin)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${COLONNES}`,
    [d.projet_id, d.ressource_id, d.taux, d.date_debut, d.date_fin],
  );
  const affectation = rows[0]!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'affectation',
    avant: null,
    apres: affectation,
    projetId: affectation.projet_id,
  });
  return affectation;
}

/** Dans une transaction : l'historique et la modification sont atomiques. */
export async function modifierAffectation(
  db: Db,
  par: number,
  id: number,
  d: Pick<Affectation, 'taux' | 'date_debut' | 'date_fin'>,
): Promise<Affectation | null> {
  await verrouiller(db, 'affectation_projet', id);
  const avant = await lireAffectation(db, id);
  const { rows } = await db.query<Affectation>(
    `UPDATE affectation_projet SET taux = $2, date_debut = $3, date_fin = $4
      WHERE id = $1 RETURNING ${COLONNES}`,
    [id, d.taux, d.date_debut, d.date_fin],
  );
  const apres = rows[0] ?? null;
  if (avant && apres) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'affectation',
      avant,
      apres,
      projetId: apres.projet_id,
    });
  }
  return apres;
}

/** Dans une transaction. */
export async function supprimerAffectation(db: Db, par: number, id: number): Promise<void> {
  const avant = await lireAffectation(db, id);
  await db.query('DELETE FROM affectation_projet WHERE id = $1', [id]);
  if (avant) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'affectation',
      avant,
      apres: null,
      projetId: avant.projet_id,
    });
  }
}

/** Seule une ressource active peut être affectée à un projet. */
export async function estRessourceActive(db: Db, utilisateurId: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'SELECT 1 FROM utilisateur WHERE id = $1 AND est_ressource AND actif',
    [utilisateurId],
  );
  return (rowCount ?? 0) > 0;
}

/** Les dates facultatives sont cohérentes : la fin n'est pas antérieure au début. */
export const datesCoherentes = (debut: string | null, fin: string | null): boolean =>
  debut === null || fin === null || fin >= debut;
