import type { Db } from '../db/erreurs.js';
import { enregistrer } from './historique.js';
import type { Acteur } from './projets.js';
import type { PeriodeTaux } from './couts.js';

/** Taux journalier d'une ressource sur une période (SPEC §12.1, D-225). */
export interface Taux {
  id: number;
  utilisateur_id: number;
  debut: string;
  /** null = période ouverte. */
  fin: string | null;
  montant: number;
}

export interface Periode {
  id?: number;
  debut: string;
  fin: string | null;
}

/** Fin d'une période ouverte : au-delà de toute date AAAA-MM-JJ (comparaison de chaînes). */
const SANS_FIN = '9999-12-31';

/**
 * Vrai si `candidate` chevauche une des `periodes`, bornes comprises ; `exclure` est l'identifiant de
 * la période modifiée, qui ne compte pas. Les trous entre périodes sont permis (§12.1 point 3).
 */
export function chevauche(periodes: Periode[], candidate: Periode, exclure?: number): boolean {
  const fin = candidate.fin ?? SANS_FIN;
  return periodes.some(
    (p) => p.id !== exclure && p.debut <= fin && candidate.debut <= (p.fin ?? SANS_FIN),
  );
}

const COLONNES = 'id, utilisateur_id, debut, fin, montant';

export async function lireTaux(db: Db, utilisateurId: number): Promise<Taux[]> {
  const { rows } = await db.query<Taux>(
    `SELECT ${COLONNES} FROM taux_journalier WHERE utilisateur_id = $1 ORDER BY debut, id`,
    [utilisateurId],
  );
  return rows;
}

export async function lireUnTaux(db: Db, id: number): Promise<Taux | null> {
  const { rows } = await db.query<Taux>(`SELECT ${COLONNES} FROM taux_journalier WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

/** L'utilisateur existe-t-il, et est-il ressource ? Verrouille sa ligne si `verrou` (§12.1 point 3). */
export async function lireRessource(
  db: Db,
  id: number,
  verrou = false,
): Promise<{ est_ressource: boolean } | null> {
  const { rows } = await db.query<{ est_ressource: boolean }>(
    `SELECT est_ressource FROM utilisateur WHERE id = $1${verrou ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Portée d'un chef de projet (§12.1 point 7, §12.6 points 5, 6 et 8) : parmi `ids`, les utilisateurs
 * affectés à au moins un projet sur lequel il écrit (ses projets et leurs sous-projets). Fonction
 * unique de la lecture et de l'écriture des taux et du taux du jour.
 */
export async function ressourcesEnPortee(
  db: Db,
  chef: Acteur,
  ids: number[],
): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { rows } = await db.query<{ ressource_id: number }>(
    `WITH RECURSIVE portee (id) AS (
       SELECT id FROM projet WHERE chef_id = $1 AND NOT est_modele
       UNION
       SELECT p.id FROM projet p JOIN portee ON p.parent_id = portee.id)
     SELECT DISTINCT ressource_id FROM affectation_projet
      WHERE ressource_id = ANY($2::int[]) AND projet_id IN (SELECT id FROM portee)`,
    [chef.id, ids],
  );
  return new Set(rows.map((r) => r.ressource_id));
}

/** Lecture des taux d'une ressource par un chef de projet (§12.1 point 7). */
export async function chefLitTaux(db: Db, chef: Acteur, ressourceId: number): Promise<boolean> {
  return (await ressourcesEnPortee(db, chef, [ressourceId])).has(ressourceId);
}

/** Taux propres et taux de l'équipe actuelle d'une ressource (§12.6 point 3). */
export interface TauxRessource {
  propres: PeriodeTaux[];
  equipe: PeriodeTaux[];
}

export interface TauxResolu {
  montant: number;
  source: 'propre' | 'equipe';
}

const couvre = (p: PeriodeTaux, jour: string): boolean =>
  p.debut <= jour && (p.fin === null || jour <= p.fin);

/**
 * Taux résolu à une date (§12.6 point 3), fonction pure : la période propre qui couvre `jour`, sinon celle
 * de l'équipe, sinon null.
 */
export function resoudreTaux(
  propres: PeriodeTaux[],
  equipe: PeriodeTaux[],
  jour: string,
): TauxResolu | null {
  const propre = propres.find((p) => couvre(p, jour));
  if (propre) return { montant: propre.montant, source: 'propre' };
  const deEquipe = equipe.find((p) => couvre(p, jour));
  return deEquipe ? { montant: deEquipe.montant, source: 'equipe' } : null;
}

/** Taux propres et d'équipe de toutes les ressources `ids`, en une seule requête (§12.6 point 9). */
export async function lireTauxRessources(
  db: Db,
  ids: number[],
): Promise<Map<number, TauxRessource>> {
  const resultat = new Map<number, TauxRessource>(
    ids.map((id) => [id, { propres: [], equipe: [] }]),
  );
  if (ids.length === 0) return resultat;
  const { rows } = await db.query<PeriodeTaux & { utilisateur_id: number; source: string }>(
    `SELECT u.id AS utilisateur_id, 'propre' AS source, t.debut::text AS debut, t.fin::text AS fin,
            t.montant
       FROM utilisateur u JOIN taux_journalier t ON t.utilisateur_id = u.id
      WHERE u.id = ANY($1::int[]) AND u.est_ressource
     UNION ALL
     SELECT u.id, 'equipe', t.debut::text, t.fin::text, t.montant
       FROM utilisateur u JOIN taux_equipe t ON t.equipe_id = u.equipe_id
      WHERE u.id = ANY($1::int[]) AND u.est_ressource
     ORDER BY 1, 3`,
    [ids],
  );
  for (const r of rows) {
    const cible = resultat.get(r.utilisateur_id)!;
    (r.source === 'propre' ? cible.propres : cible.equipe).push({
      debut: r.debut,
      fin: r.fin,
      montant: r.montant,
    });
  }
  return resultat;
}

/** Refus métier d'une écriture de taux, traduit par la route. */
export class RefusTaux extends Error {
  constructor(readonly motif: 'non_ressource' | 'chevauchement' | 'dates') {
    super(motif);
    this.name = 'RefusTaux';
  }
}

/** Contrôles communs (dans la transaction, ligne utilisateur verrouillée). */
async function controler(db: Db, utilisateurId: number, p: Periode, exclure?: number) {
  if (p.fin !== null && p.fin < p.debut) throw new RefusTaux('dates');
  if (chevauche(await lireTaux(db, utilisateurId), p, exclure)) {
    throw new RefusTaux('chevauchement');
  }
}

/** Dans une transaction. null si l'utilisateur n'existe pas. */
export async function creerTaux(
  db: Db,
  par: number,
  utilisateurId: number,
  d: { debut: string; fin: string | null; montant: number },
): Promise<Taux | null> {
  const ressource = await lireRessource(db, utilisateurId, true);
  if (!ressource) return null;
  if (!ressource.est_ressource) throw new RefusTaux('non_ressource');
  await controler(db, utilisateurId, d);
  const { rows } = await db.query<Taux>(
    `INSERT INTO taux_journalier (utilisateur_id, debut, fin, montant) VALUES ($1, $2, $3, $4)
     RETURNING ${COLONNES}`,
    [utilisateurId, d.debut, d.fin, d.montant],
  );
  const taux = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'taux', avant: null, apres: taux });
  return taux;
}

/** Dans une transaction. null si le taux n'existe pas. */
export async function modifierTaux(
  db: Db,
  par: number,
  id: number,
  champs: Partial<{ debut: string; fin: string | null; montant: number }>,
): Promise<Taux | null> {
  const lu = await lireUnTaux(db, id);
  if (!lu) return null;
  await lireRessource(db, lu.utilisateur_id, true);
  const avant = await lireUnTaux(db, id);
  if (!avant) return null;
  const voulu = { ...avant, ...champs };
  await controler(db, avant.utilisateur_id, voulu, id);
  const { rows } = await db.query<Taux>(
    `UPDATE taux_journalier SET debut = $2, fin = $3, montant = $4 WHERE id = $1
     RETURNING ${COLONNES}`,
    [id, voulu.debut, voulu.fin, voulu.montant],
  );
  const apres = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'taux', avant, apres });
  return apres;
}

/** Dans une transaction. Faux si le taux n'existe pas. */
export async function supprimerTaux(db: Db, par: number, id: number): Promise<boolean> {
  const { rows } = await db.query<Taux>(
    `DELETE FROM taux_journalier WHERE id = $1 RETURNING ${COLONNES}`,
    [id],
  );
  const avant = rows[0];
  if (!avant) return false;
  await enregistrer(db, { utilisateurId: par, entite: 'taux', avant, apres: null });
  return true;
}
