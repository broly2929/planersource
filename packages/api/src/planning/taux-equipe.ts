import type { Db } from '../db/erreurs.js';
import { enregistrer } from './historique.js';
import { chevauche, RefusTaux, ressourcesEnPortee } from './taux.js';
import type { Acteur } from './projets.js';

/** Taux journalier d'une équipe sur une période (SPEC §12.6, D-258). */
export interface TauxEquipe {
  id: number;
  equipe_id: number;
  debut: string;
  /** null = période ouverte. */
  fin: string | null;
  montant: number;
}

const COLONNES = 'id, equipe_id, debut, fin, montant';

export async function lireTauxEquipe(db: Db, equipeId: number): Promise<TauxEquipe[]> {
  const { rows } = await db.query<TauxEquipe>(
    `SELECT ${COLONNES} FROM taux_equipe WHERE equipe_id = $1 ORDER BY debut, id`,
    [equipeId],
  );
  return rows;
}

export async function lireUnTauxEquipe(db: Db, id: number): Promise<TauxEquipe | null> {
  const { rows } = await db.query<TauxEquipe>(`SELECT ${COLONNES} FROM taux_equipe WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

/** L'équipe existe-t-elle ? Verrouille sa ligne si `verrou` (§12.6 point 1). */
export async function equipeExiste(db: Db, id: number, verrou = false): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM equipe WHERE id = $1${verrou ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/** Lecture par un chef de projet (§12.6 point 5) : un membre de l'équipe est dans sa portée. */
export async function chefLitTauxEquipe(db: Db, chef: Acteur, equipeId: number): Promise<boolean> {
  const { rows } = await db.query<{ id: number }>(
    'SELECT id FROM utilisateur WHERE equipe_id = $1',
    [equipeId],
  );
  const dansPortee = await ressourcesEnPortee(
    db,
    chef,
    rows.map((r) => r.id),
  );
  return dansPortee.size > 0;
}

async function controler(db: Db, equipeId: number, p: TauxEquipe | Omit<TauxEquipe, 'id'>) {
  if (p.fin !== null && p.fin < p.debut) throw new RefusTaux('dates');
  const exclure = 'id' in p ? p.id : undefined;
  if (chevauche(await lireTauxEquipe(db, equipeId), p, exclure)) {
    throw new RefusTaux('chevauchement');
  }
}

/** Dans une transaction. null si l'équipe n'existe pas. */
export async function creerTauxEquipe(
  db: Db,
  par: number,
  equipeId: number,
  d: { debut: string; fin: string | null; montant: number },
): Promise<TauxEquipe | null> {
  if (!(await equipeExiste(db, equipeId, true))) return null;
  await controler(db, equipeId, { equipe_id: equipeId, ...d });
  const { rows } = await db.query<TauxEquipe>(
    `INSERT INTO taux_equipe (equipe_id, debut, fin, montant) VALUES ($1, $2, $3, $4)
     RETURNING ${COLONNES}`,
    [equipeId, d.debut, d.fin, d.montant],
  );
  const taux = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'taux_equipe', avant: null, apres: taux });
  return taux;
}

/** Dans une transaction. null si le taux n'existe pas. */
export async function modifierTauxEquipe(
  db: Db,
  par: number,
  id: number,
  champs: Partial<{ debut: string; fin: string | null; montant: number }>,
): Promise<TauxEquipe | null> {
  const lu = await lireUnTauxEquipe(db, id);
  if (!lu) return null;
  await equipeExiste(db, lu.equipe_id, true);
  const avant = await lireUnTauxEquipe(db, id);
  if (!avant) return null;
  const voulu = { ...avant, ...champs };
  await controler(db, avant.equipe_id, voulu);
  const { rows } = await db.query<TauxEquipe>(
    `UPDATE taux_equipe SET debut = $2, fin = $3, montant = $4 WHERE id = $1
     RETURNING ${COLONNES}`,
    [id, voulu.debut, voulu.fin, voulu.montant],
  );
  const apres = rows[0]!;
  await enregistrer(db, { utilisateurId: par, entite: 'taux_equipe', avant, apres });
  return apres;
}

/** Dans une transaction. Faux si le taux n'existe pas. */
export async function supprimerTauxEquipe(db: Db, par: number, id: number): Promise<boolean> {
  const { rows } = await db.query<TauxEquipe>(
    `DELETE FROM taux_equipe WHERE id = $1 RETURNING ${COLONNES}`,
    [id],
  );
  const avant = rows[0];
  if (!avant) return false;
  await enregistrer(db, { utilisateurId: par, entite: 'taux_equipe', avant, apres: null });
  return true;
}
