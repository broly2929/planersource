import type { Db } from '../db/erreurs.js';
import { roleVoitFinances, type Role } from '../auth/user.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Acteur {
  id: number;
  role: Role;
}

export interface Projet {
  id: number;
  code: string;
  nom: string;
  parent_id: number | null;
  est_modele: boolean;
  priorite: number;
  chef_id: number;
  date_debut: string;
  clos: boolean;
  /** OTP propre (D-225, SPEC §12.2) ; la valeur héritée est calculée à la lecture (otp.ts). */
  otp: string | null;
}

const COLONNES = 'id, code, nom, parent_id, est_modele, priorite, chef_id, date_debut, clos, otp';

/** Lecture seule (D-078 5) : jamais écrits par une route, jamais historisés, absents de COLONNES. */
const COLONNES_LECTURE = `${COLONNES}, debut_planifie, fin_planifiee`;

type Ligne = Projet & {
  peut_ecrire: boolean;
  debut_planifie: string | null;
  fin_planifiee: string | null;
};

/**
 * Lit les projets et modèles visibles avec le droit d'écriture (seul endroit où se décident les
 * droits, modèles compris, SPEC §11.1). Administrateur : tout, en écriture. Chef de projet : tous
 * les projets et modèles (D-265) ; écriture sur ses projets et leurs sous-projets, modèles exclus.
 * Leader métier : tous les projets et modèles, écriture sur tout projet ordinaire (D-265). Rôle
 * ressource : rien (D-148).
 */
async function lireVisibles(db: Db, user: Acteur, id?: number): Promise<Ligne[]> {
  // Rôle ressource : portée de lecture vide (lot 6b, D-148 (2)).
  if (user.role === 'ressource') return [];
  if (user.role === 'administrateur') {
    const params: unknown[] = id === undefined ? [] : [id];
    const filtre = id === undefined ? '' : ' AND id = $1';
    const { rows } = await db.query<Ligne>(
      `SELECT ${COLONNES_LECTURE}, true AS peut_ecrire FROM projet WHERE true${filtre} ORDER BY id`,
      params,
    );
    return rows;
  }
  if (user.role === 'leader_metier') {
    const params: unknown[] = id === undefined ? [] : [id];
    const filtre = id === undefined ? '' : ' AND id = $1';
    const { rows } = await db.query<Ligne>(
      `SELECT ${COLONNES_LECTURE}, NOT est_modele AS peut_ecrire FROM projet WHERE true${filtre}
        ORDER BY id`,
      params,
    );
    return rows;
  }
  const params: unknown[] = [user.id];
  if (id !== undefined) params.push(id);
  const filtre = id === undefined ? '' : ' AND id = $2';
  const { rows } = await db.query<Ligne>(
    `WITH RECURSIVE portee (id) AS (
       SELECT id FROM projet WHERE chef_id = $1 AND NOT est_modele
       UNION
       SELECT p.id FROM projet p JOIN portee ON p.parent_id = portee.id)
     SELECT ${COLONNES_LECTURE}, (id IN (SELECT id FROM portee)) AS peut_ecrire FROM projet
      WHERE true${filtre}
      ORDER BY id`,
    params,
  );
  return rows;
}

/**
 * Projets visibles. Sans `id` : la liste des projets ordinaires (les modèles ont leur liste).
 * Avec `id` : ce projet ou ce modèle s'il est visible.
 */
export async function projetsVisibles(db: Db, user: Acteur, id?: number): Promise<Ligne[]> {
  const lignes = await lireVisibles(db, user, id);
  return id === undefined ? lignes.filter((l) => !l.est_modele) : lignes;
}

/** Identifiants des projets et modèles que l'utilisateur lit (héritage de l'OTP, D-225 (F) (2)). */
export async function idsVisibles(db: Db, user: Acteur): Promise<Set<number>> {
  return new Set((await lireVisibles(db, user)).map((l) => l.id));
}

/** Liste des modèles visibles ; vide pour une ressource. */
export async function modelesVisibles(db: Db, user: Acteur): Promise<Ligne[]> {
  return (await lireVisibles(db, user)).filter((l) => l.est_modele);
}

/**
 * `voit_finances` (D-265 (3)) : `peut_ecrire` et rôle autre que leader métier. Jamais renvoyé comme
 * clé ; condition de visibilité de la charge vendue, de la marge et des coûts.
 */
export function voitFinances(user: Acteur, peutEcrire: boolean): boolean {
  return peutEcrire && roleVoitFinances(user.role);
}

/** `notes` (D-270) : renvoyées à qui lit le projet, sauf au rôle ressource. */
export function voitNotes(user: Acteur): boolean {
  return user.role !== 'ressource';
}

export interface AccesProjet {
  projet: Projet;
  peutEcrire: boolean;
}

/** Le projet s'il est visible (sinon null) et le droit d'écriture de l'utilisateur dessus. */
export async function accesProjet(db: Db, user: Acteur, id: number): Promise<AccesProjet | null> {
  const [ligne] = await lireVisibles(db, user, id);
  if (!ligne) return null;
  // Les dates planifiées ne passent pas dans `Projet` (copie, historique, droits : D-078 5).
  const { peut_ecrire: peutEcrire, ...complet } = ligne;
  const projet: Projet = {
    id: complet.id,
    code: complet.code,
    nom: complet.nom,
    parent_id: complet.parent_id,
    est_modele: complet.est_modele,
    priorite: complet.priorite,
    chef_id: complet.chef_id,
    date_debut: complet.date_debut,
    clos: complet.clos,
    otp: complet.otp,
  };
  return { projet, peutEcrire };
}

export interface NouveauProjet {
  code: string;
  nom: string;
  parent_id: number | null;
  priorite: number;
  chef_id: number;
  date_debut: string;
  /** Fixé à la création : faux par défaut. */
  est_modele?: boolean;
  /** OTP propre, null = aucun (D-225). */
  otp?: string | null;
}

async function lireProjet(db: Db, id: number): Promise<Projet | null> {
  const { rows } = await db.query<Projet>(`SELECT ${COLONNES} FROM projet WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Sans transaction interne (l'appelant l'ouvre) : réutilisable par la copie de projet (lot 1b). */
export async function creerProjet(db: Db, par: number, d: NouveauProjet): Promise<Projet> {
  const { rows } = await db.query<Projet>(
    `INSERT INTO projet (code, nom, parent_id, priorite, chef_id, date_debut, est_modele, otp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLONNES}`,
    [
      d.code,
      d.nom,
      d.parent_id,
      d.priorite,
      d.chef_id,
      d.date_debut,
      d.est_modele ?? false,
      d.otp ?? null,
    ],
  );
  const projet = rows[0]!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'projet',
    avant: null,
    apres: projet,
    projetId: projet.id,
  });
  return projet;
}

/** Dans une transaction : l'historique et la modification sont atomiques. */
export async function modifierProjet(
  db: Db,
  par: number,
  id: number,
  champs: Partial<Omit<NouveauProjet, 'est_modele'>> & { clos?: boolean },
): Promise<Projet | null> {
  const cles = Object.keys(champs) as (keyof typeof champs)[];
  if (cles.length === 0) return lireProjet(db, id);
  await verrouiller(db, 'projet', id);
  const avant = await lireProjet(db, id);
  const { rows } = await db.query<Projet>(
    `UPDATE projet SET ${cles.map((k, i) => `${k} = $${i + 2}`).join(', ')}
      WHERE id = $1 RETURNING ${COLONNES}`,
    [id, ...cles.map((k) => champs[k])],
  );
  const apres = rows[0] ?? null;
  if (avant && apres) {
    await enregistrer(db, { utilisateurId: par, entite: 'projet', avant, apres, projetId: id });
  }
  return apres;
}

/** Dans une transaction. Seule l'entrée du projet est écrite, pas celles de ses dépendances. */
export async function supprimerProjet(db: Db, par: number, id: number): Promise<void> {
  const avant = await lireProjet(db, id);
  await db.query('DELETE FROM projet WHERE id = $1', [id]);
  if (avant) {
    await enregistrer(db, {
      utilisateurId: par,
      entite: 'projet',
      avant,
      apres: null,
      projetId: id,
    });
  }
}

/** Le chef d'un projet est un administrateur, un chef de projet ou un leader métier actif (D-265). */
export async function chefValide(db: Db, chefId: number): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM utilisateur
      WHERE id = $1 AND actif AND role IN ('administrateur', 'chef_de_projet', 'leader_metier')`,
    [chefId],
  );
  return (rowCount ?? 0) > 0;
}
