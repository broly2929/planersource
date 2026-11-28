import type { Db } from '../db/erreurs.js';
import type { Acteur } from './projets.js';
import { ressourcesEnPortee } from './taux.js';

/** Ligne de la grille mensuelle des absences (SPEC §4, « Grille mensuelle (absences-grille, D-280) », point 29). */
export interface LigneGrille {
  id: number;
  nom: string;
  equipe_id: number | null;
  peut_ecrire: boolean;
  jours_non_ouvres: string[];
}

interface RessourceRow {
  id: number;
  nom: string;
  equipe_id: number | null;
  jours: number[];
  feries: string[];
}

/** Jours (AAAA-MM-JJ) du mois `AAAA-MM` non travaillés ou fériés pour un calendrier. */
function joursNonOuvres(mois: string, travailles: number[], feries: Set<string>): string[] {
  const [a, m] = mois.split('-').map(Number) as [number, number];
  const fin = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const jours: string[] = [];
  for (let j = 1; j <= fin; j += 1) {
    const dow = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
    const cle = `${mois}-${String(j).padStart(2, '0')}`;
    if (!travailles.includes(dow === 0 ? 7 : dow) || feries.has(cle)) jours.push(cle);
  }
  return jours;
}

/**
 * Ressources actives avec leur équipe, leurs jours non ouvrés du mois et le droit d'écriture de l'utilisateur
 * (point 7 : administrateur et leader pour toutes, la ressource pour elle-même, le chef dans sa portée).
 * Trois requêtes au plus, quel que soit le nombre de ressources.
 */
export async function lireGrille(db: Db, user: Acteur, mois: string): Promise<LigneGrille[]> {
  const { rows } = await db.query<RessourceRow>(
    `SELECT u.id, u.nom, u.equipe_id, c.jours_travailles::int[] AS jours,
            COALESCE((SELECT array_agg(to_char(f.jour, 'YYYY-MM-DD'))
                        FROM calendrier_ferie f
                       WHERE f.calendrier_id = c.id
                         AND to_char(f.jour, 'YYYY-MM') = $1), '{}') AS feries
       FROM utilisateur u JOIN calendrier c ON c.id = u.calendrier_id
      WHERE u.est_ressource AND u.actif
      ORDER BY u.nom, u.id`,
    [mois],
  );
  const tout = user.role === 'administrateur' || user.role === 'leader_metier';
  const portee =
    tout || user.role !== 'chef_de_projet'
      ? new Set<number>()
      : await ressourcesEnPortee(
          db,
          user,
          rows.map((r) => r.id),
        );
  return rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    equipe_id: r.equipe_id,
    peut_ecrire: tout || r.id === user.id || portee.has(r.id),
    jours_non_ouvres: joursNonOuvres(mois, r.jours, new Set(r.feries)),
  }));
}
