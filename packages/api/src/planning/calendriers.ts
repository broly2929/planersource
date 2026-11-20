import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Calendrier {
  id: number;
  nom: string;
  jours_travailles: number[];
  est_defaut: boolean;
  feries: { jour: string; libelle: string }[];
}

interface CalendrierRow {
  id: number;
  nom: string;
  jours_travailles: number[];
  est_defaut: boolean;
  feries: { jour: string; libelle: string }[];
}

const SELECT = `
  SELECT c.id, c.nom, c.jours_travailles, c.est_defaut,
         COALESCE((SELECT json_agg(json_build_object('jour', to_char(f.jour, 'YYYY-MM-DD'), 'libelle', f.libelle)
                                   ORDER BY f.jour)
                     FROM calendrier_ferie f WHERE f.calendrier_id = c.id), '[]'::json) AS feries
    FROM calendrier c`;

export async function lireCalendriers(db: Db): Promise<Calendrier[]> {
  const { rows } = await db.query<CalendrierRow>(`${SELECT} ORDER BY c.id`);
  return rows;
}

export async function lireCalendrier(db: Db, id: number): Promise<Calendrier | null> {
  const { rows } = await db.query<CalendrierRow>(`${SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Sans transaction interne (l'appelant l'ouvre). Les jours fériés ne sont pas historisés (D-034). */
export async function creerCalendrier(
  db: Db,
  par: number,
  data: { nom: string; jours_travailles: number[] },
): Promise<Calendrier> {
  const { rows } = await db.query<{ id: number }>(
    'INSERT INTO calendrier (nom, jours_travailles) VALUES ($1, $2) RETURNING id',
    [data.nom, data.jours_travailles],
  );
  const calendrier = (await lireCalendrier(db, rows[0]!.id))!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'calendrier',
    avant: null,
    apres: calendrier,
  });
  return calendrier;
}

/** Dans une transaction : null si le calendrier n'existe pas. */
export async function modifierCalendrier(
  db: Db,
  par: number,
  id: number,
  d: { nom?: string | undefined; jours_travailles?: number[] | undefined },
): Promise<Calendrier | null> {
  await verrouiller(db, 'calendrier', id);
  const avant = await lireCalendrier(db, id);
  if (!avant) return null;
  await db.query(
    `UPDATE calendrier SET nom = COALESCE($2, nom),
            jours_travailles = COALESCE($3::smallint[], jours_travailles)
      WHERE id = $1`,
    [id, d.nom ?? null, d.jours_travailles ?? null],
  );
  const apres = (await lireCalendrier(db, id))!;
  await enregistrer(db, { utilisateurId: par, entite: 'calendrier', avant, apres });
  return apres;
}

/** Dans une transaction : false si le calendrier n'existe pas ; une clé étrangère ou un déclencheur refuse (409). */
export async function supprimerCalendrier(db: Db, par: number, id: number): Promise<boolean> {
  const avant = await lireCalendrier(db, id);
  const { rowCount } = await db.query('DELETE FROM calendrier WHERE id = $1', [id]);
  if (!avant || !rowCount) return false;
  await enregistrer(db, { utilisateurId: par, entite: 'calendrier', avant, apres: null });
  return true;
}
