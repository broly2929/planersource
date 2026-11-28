import type { Db } from '../db/erreurs.js';
import { enregistrer } from './historique.js';
import type { Acteur } from './projets.js';
import { lireRessource, ressourcesEnPortee } from './taux.js';

/** Absence d'une ressource (SPEC §4, « Absences et charge depuis le taux (absences, D-276) »). */
export type Portion = 'journee' | 'matin' | 'apres_midi';
export type Motif = 'conge' | 'formation' | 'autre';

export interface Absence {
  id: number;
  ressource_id: number;
  debut: string;
  fin: string;
  portion: Portion;
  motif: Motif;
}

export type DonneesAbsence = Omit<Absence, 'id'>;

const COLONNES = 'id, ressource_id, debut, fin, portion, motif';

export async function lireAbsences(
  db: Db,
  filtre: { ressourceId?: number | undefined; du?: string | undefined; au?: string | undefined },
): Promise<Absence[]> {
  const { rows } = await db.query<Absence>(
    `SELECT ${COLONNES} FROM absence
      WHERE ($1::int IS NULL OR ressource_id = $1)
        AND ($2::date IS NULL OR fin >= $2::date)
        AND ($3::date IS NULL OR debut <= $3::date)
      ORDER BY ressource_id, debut, id`,
    [filtre.ressourceId ?? null, filtre.du ?? null, filtre.au ?? null],
  );
  return rows;
}

export async function lireUneAbsence(db: Db, id: number): Promise<Absence | null> {
  const { rows } = await db.query<Absence>(`SELECT ${COLONNES} FROM absence WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Deux absences d'une même ressource se chevauchent si leurs périodes se touchent, sauf un matin et un
 * après-midi le même jour (point 2).
 */
export function chevauchent(a: DonneesAbsence, b: DonneesAbsence): boolean {
  if (a.debut > b.fin || b.debut > a.fin) return false;
  const demi = (x: DonneesAbsence) => x.portion !== 'journee';
  return !(demi(a) && demi(b) && a.portion !== b.portion);
}

/**
 * Droit d'écriture sur les absences d'une ressource (point 7) : administrateur et leader métier pour toute
 * ressource ; la ressource pour elle-même ; le chef de projet dans la portée des taux (`ressourcesEnPortee`).
 */
export async function peutEcrireAbsences(
  db: Db,
  user: Acteur,
  ressourceId: number,
): Promise<boolean> {
  if (user.role === 'administrateur' || user.role === 'leader_metier') return true;
  if (user.id === ressourceId) return true;
  if (user.role !== 'chef_de_projet') return false;
  return (await ressourcesEnPortee(db, user, [ressourceId])).has(ressourceId);
}

/** Refus métier d'une écriture d'absence, traduit par la route. */
export class RefusAbsence extends Error {
  constructor(
    readonly motif: 'non_ressource' | 'duree_excessive' | 'jour_impute' | 'chevauchement',
  ) {
    super(motif);
    this.name = 'RefusAbsence';
  }
}

/** Durée maximale d'une absence, en jours, bornes comprises (point 21, D-278). */
export const DUREE_MAX = 366;

/** Nombre de jours de `debut` à `fin`, bornes comprises (dates AAAA-MM-JJ). */
export function dureeEnJours(debut: string, fin: string): number {
  return (Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000 + 1;
}

/**
 * Contrôles communs (dans la transaction, ligne utilisateur verrouillée) : point 21, point 4, puis point 2.
 */
async function controler(db: Db, d: DonneesAbsence, exclure?: number): Promise<void> {
  if (dureeEnJours(d.debut, d.fin) > DUREE_MAX) throw new RefusAbsence('duree_excessive');
  if (d.portion === 'journee') {
    const { rows } = await db.query(
      `SELECT 1 FROM imputation i JOIN assignation s ON s.id = i.assignation_id
        WHERE s.ressource_id = $1 AND i.charge > 0 AND i.jour BETWEEN $2::date AND $3::date
        LIMIT 1`,
      [d.ressource_id, d.debut, d.fin],
    );
    if (rows.length > 0) throw new RefusAbsence('jour_impute');
  }
  const autres = (await lireAbsences(db, { ressourceId: d.ressource_id })).filter(
    (a) => a.id !== exclure,
  );
  if (autres.some((a) => chevauchent(a, d))) throw new RefusAbsence('chevauchement');
}

/** Dans une transaction. null si la ressource n'existe pas. */
export async function creerAbsence(
  db: Db,
  par: number,
  d: DonneesAbsence,
): Promise<Absence | null> {
  const ressource = await lireRessource(db, d.ressource_id, true);
  if (!ressource) return null;
  if (!ressource.est_ressource) throw new RefusAbsence('non_ressource');
  await controler(db, d);
  const { rows } = await db.query<Absence>(
    `INSERT INTO absence (ressource_id, debut, fin, portion, motif) VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLONNES}`,
    [d.ressource_id, d.debut, d.fin, d.portion, d.motif],
  );
  const absence = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'absence', avant: null, apres: absence });
  return absence;
}

/** Dans une transaction. null si l'absence n'existe pas ; `fusion` est l'état voulu, déjà validé. */
export async function modifierAbsence(
  db: Db,
  par: number,
  id: number,
  champs: Partial<Omit<DonneesAbsence, 'ressource_id'>>,
): Promise<Absence | null> {
  const lue = await lireUneAbsence(db, id);
  if (!lue) return null;
  await lireRessource(db, lue.ressource_id, true);
  const avant = await lireUneAbsence(db, id);
  if (!avant) return null;
  const voulu = { ...avant, ...champs };
  await controler(db, voulu, id);
  const { rows } = await db.query<Absence>(
    `UPDATE absence SET debut = $2, fin = $3, portion = $4, motif = $5 WHERE id = $1
     RETURNING ${COLONNES}`,
    [id, voulu.debut, voulu.fin, voulu.portion, voulu.motif],
  );
  const apres = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'absence', avant, apres });
  return apres;
}

/** Dans une transaction. Faux si l'absence n'existe pas. */
export async function supprimerAbsence(db: Db, par: number, id: number): Promise<boolean> {
  const { rows } = await db.query<Absence>(
    `DELETE FROM absence WHERE id = $1 RETURNING ${COLONNES}`,
    [id],
  );
  const avant = rows[0];
  if (!avant) return false;
  await enregistrer(db, { utilisateurId: par, entite: 'absence', avant, apres: null });
  return true;
}

/** Jour d'absence (point 3) : une entrée par jour et par absence. */
export interface JourAbsence {
  ressource_id: number;
  jour: string;
  portion: Portion;
  motif: Motif;
}

/**
 * Absences dépliées jour par jour (point 3), pour les ressources `ids` (toutes si null) et les jours de
 * `du` à `au` (bornes facultatives). Triées par ressource puis jour.
 */
export async function joursAbsence(
  db: Db,
  ids: number[] | null,
  du: string | null,
  au: string | null,
): Promise<JourAbsence[]> {
  const { rows } = await db.query<JourAbsence>(
    // SEC-21 : seule la période demandée est dépliée (une absence très longue ne coûte rien de plus).
    `SELECT a.ressource_id, d::date::text AS jour, a.portion, a.motif
       FROM absence a,
            generate_series(GREATEST(a.debut, COALESCE($2::date, a.debut)),
                            LEAST(a.fin, COALESCE($3::date, a.fin)), interval '1 day') AS d
      WHERE ($1::int[] IS NULL OR a.ressource_id = ANY($1::int[]))
        AND ($2::date IS NULL OR a.fin >= $2::date)
        AND ($3::date IS NULL OR a.debut <= $3::date)
      ORDER BY a.ressource_id, d, a.portion`,
    [ids, du, au],
  );
  return rows;
}

/** Jours d'absence en journée entière (journée, ou matin et après-midi le même jour), par jour. */
export function joursEntiers(jours: JourAbsence[]): Map<string, JourAbsence> {
  const parJour = new Map<string, JourAbsence[]>();
  for (const j of jours) parJour.set(j.jour, [...(parJour.get(j.jour) ?? []), j]);
  const entiers = new Map<string, JourAbsence>();
  for (const [jour, l] of parJour) {
    const journee = l.find((x) => x.portion === 'journee');
    if (journee) entiers.set(jour, journee);
    else if (l.some((x) => x.portion === 'matin') && l.some((x) => x.portion === 'apres_midi')) {
      entiers.set(jour, l[0]!);
    }
  }
  return entiers;
}
