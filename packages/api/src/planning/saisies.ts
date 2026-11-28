import type { Db } from '../db/erreurs.js';
import { verrouiller } from './historique.js';
import { lireActivite } from './elements.js';
import { joursAbsence, joursEntiers } from './absences.js';

export interface Saisie {
  assignation_id: number;
  jour: string;
  demi_journee: 'matin' | 'apres_midi';
}

export interface ListeSaisies {
  mois: string;
  saisies: Saisie[];
}

/** Premier jour du mois et premier jour du mois suivant (AAAA-MM-JJ). */
function bornes(mois: string): [string, string] {
  const [a, m] = mois.split('-').map(Number) as [number, number];
  const suivant = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
  return [`${mois}-01`, `${suivant}-01`];
}

/** Le jour appartient au mois « AAAA-MM » (chaîne ISO déjà validée). */
export const dansLeMois = (jour: string, mois: string): boolean => jour.startsWith(`${mois}-`);

/** Refus d'une saisie nouvelle sur un jour non ouvré (D-123 (8)). */
export interface RefusJourNonOuvre {
  refus: 'jour_non_ouvre';
  assignation_id: number;
  jour: string;
}

export interface JoursNonOuvres {
  mois: string;
  jours_non_ouvres: { assignation_id: number; jours: string[] }[];
}

/** Jours (AAAA-MM-JJ) du mois, ISO 1 = lundi à 7 = dimanche. */
function joursDuMois(mois: string): { jour: string; iso: number }[] {
  const [debut, fin] = bornes(mois);
  const res: { jour: string; iso: number }[] = [];
  for (
    let t = Date.parse(`${debut}T00:00:00Z`);
    t < Date.parse(`${fin}T00:00:00Z`);
    t += 86_400_000
  ) {
    const d = new Date(t);
    res.push({ jour: d.toISOString().slice(0, 10), iso: d.getUTCDay() === 0 ? 7 : d.getUTCDay() });
  }
  return res;
}

/** Jours non ouvrés du mois de chaque assignation de l'activité (calendrier de la ressource, fériés compris). */
export async function joursNonOuvres(
  db: Db,
  activiteId: number,
  mois: string,
): Promise<JoursNonOuvres> {
  const [debut, fin] = bornes(mois);
  const { rows } = await db.query<{
    id: number;
    ressource_id: number;
    jours: number[];
    feries: string[];
  }>(
    `SELECT a.id, a.ressource_id, c.jours_travailles::int[] AS jours,
            COALESCE((SELECT array_agg(f.jour::text) FROM calendrier_ferie f
                       WHERE f.calendrier_id = c.id AND f.jour >= $2 AND f.jour < $3), '{}') AS feries
       FROM assignation a
       JOIN utilisateur u ON u.id = a.ressource_id
       JOIN calendrier c ON c.id = u.calendrier_id
      WHERE a.activite_id = $1
      ORDER BY a.id`,
    [activiteId, debut, fin],
  );
  const calendrier = joursDuMois(mois);
  // jours d'absence en journée entière de la ressource : non ouvrés (D-276, point 6)
  const absences = await joursAbsence(
    db,
    rows.map((r) => r.ressource_id),
    debut,
    calendrier[calendrier.length - 1]!.jour,
  );
  return {
    mois,
    jours_non_ouvres: rows.map((r) => {
      const entiers = joursEntiers(absences.filter((a) => a.ressource_id === r.ressource_id));
      return {
        assignation_id: r.id,
        jours: calendrier
          .filter(
            (j) => !r.jours.includes(j.iso) || r.feries.includes(j.jour) || entiers.has(j.jour),
          )
          .map((j) => j.jour),
      };
    }),
  };
}

/**
 * Premier jour non ouvré (assignation, jour, demi-journée) d'une saisie nouvelle, c'est-à-dire absente de
 * la base ; les saisies déjà en base sont conservées et peuvent être renvoyées à l'identique (D-123 (8)).
 */
async function premierJourNonOuvre(
  db: Db,
  activiteId: number,
  mois: string,
  saisies: Saisie[],
): Promise<RefusJourNonOuvre | null> {
  const existantes = new Set(
    (await lireSaisies(db, activiteId, mois)).saisies.map(
      (x) => `${x.assignation_id}|${x.jour}|${x.demi_journee}`,
    ),
  );
  const nouvelles = saisies
    .filter((x) => !existantes.has(`${x.assignation_id}|${x.jour}|${x.demi_journee}`))
    .sort(
      (x, y) =>
        x.assignation_id - y.assignation_id ||
        x.jour.localeCompare(y.jour) ||
        x.demi_journee.localeCompare(y.demi_journee),
    );
  if (nouvelles.length === 0) return null;
  const { jours_non_ouvres: calendriers } = await joursNonOuvres(db, activiteId, mois);
  for (const x of nouvelles) {
    const c = calendriers.find((e) => e.assignation_id === x.assignation_id);
    if (c?.jours.includes(x.jour)) {
      return { refus: 'jour_non_ouvre', assignation_id: x.assignation_id, jour: x.jour };
    }
  }
  return null;
}

/** Saisies du mois pour les assignations de l'activité, triées. */
export async function lireSaisies(db: Db, activiteId: number, mois: string): Promise<ListeSaisies> {
  const [debut, fin] = bornes(mois);
  const { rows } = await db.query<Saisie>(
    `SELECT s.assignation_id, s.jour::text AS jour, s.demi_journee
       FROM saisie_manuelle s JOIN assignation a ON a.id = s.assignation_id
      WHERE a.activite_id = $1 AND s.jour >= $2 AND s.jour < $3
      ORDER BY s.assignation_id, s.jour, (s.demi_journee = 'apres_midi')`,
    [activiteId, debut, fin],
  );
  return { mois, saisies: rows };
}

/**
 * Remplace les saisies du mois (D-058 3, D-059 2 3 8). Dans une transaction : l'élément est verrouillé
 * avant les contrôles. Renvoie `null` (refus 422) si l'activité n'est pas une feuille MAN ouverte ou si
 * une assignation du corps n'appartient pas à l'activité ; rien n'est écrit dans ce cas.
 */
export async function remplacerSaisies(
  db: Db,
  activiteId: number,
  mois: string,
  saisies: Saisie[],
): Promise<ListeSaisies | RefusJourNonOuvre | null> {
  await verrouiller(db, 'element', activiteId);
  const activite = await lireActivite(db, activiteId);
  if (!activite || activite.mode !== 'MAN' || activite.close) return null;
  const feuille = await db.query('SELECT 1 FROM element WHERE parent_id = $1 LIMIT 1', [
    activiteId,
  ]);
  if (feuille.rows.length > 0) return null;
  const { rows } = await db.query<{ id: number }>(
    'SELECT id FROM assignation WHERE activite_id = $1',
    [activiteId],
  );
  const connues = new Set(rows.map((r) => r.id));
  if (saisies.some((s) => !connues.has(s.assignation_id))) return null;
  const [debut, fin] = bornes(mois);
  const refus = await premierJourNonOuvre(db, activiteId, mois, saisies);
  if (refus) return refus;
  await db.query(
    `DELETE FROM saisie_manuelle
      WHERE assignation_id = ANY($1) AND jour >= $2 AND jour < $3`,
    [[...connues], debut, fin],
  );
  if (saisies.length > 0) {
    await db.query(
      `INSERT INTO saisie_manuelle (assignation_id, jour, demi_journee)
       SELECT * FROM unnest($1::int[], $2::date[], $3::text[])`,
      [
        saisies.map((s) => s.assignation_id),
        saisies.map((s) => s.jour),
        saisies.map((s) => s.demi_journee),
      ],
    );
  }
  return lireSaisies(db, activiteId, mois);
}
