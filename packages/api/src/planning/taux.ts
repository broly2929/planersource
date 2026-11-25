import type { Db } from '../db/erreurs.js';
import { enregistrer } from './historique.js';
import type { Acteur } from './projets.js';

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
 * Lecture des taux d'une ressource par un chef de projet (§12.1 point 7) : seulement si la ressource
 * est affectée à au moins un projet sur lequel il écrit (ses projets et leurs sous-projets).
 */
export async function chefLitTaux(db: Db, chef: Acteur, ressourceId: number): Promise<boolean> {
  const { rowCount } = await db.query(
    `WITH RECURSIVE portee (id) AS (
       SELECT id FROM projet WHERE chef_id = $1 AND NOT est_modele
       UNION
       SELECT p.id FROM projet p JOIN portee ON p.parent_id = portee.id)
     SELECT 1 FROM affectation_projet
      WHERE ressource_id = $2 AND projet_id IN (SELECT id FROM portee) LIMIT 1`,
    [chef.id, ressourceId],
  );
  return (rowCount ?? 0) > 0;
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
