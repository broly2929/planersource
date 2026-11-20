import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';

export interface Acteur {
  id: number;
  role: 'administrateur' | 'chef_de_projet' | 'ressource';
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
}

const COLONNES = 'id, code, nom, parent_id, est_modele, priorite, chef_id, date_debut, clos';

/** Lecture seule (D-078 5) : jamais écrits par une route, jamais historisés, absents de COLONNES. */
const COLONNES_LECTURE = `${COLONNES}, debut_planifie, fin_planifiee`;

type Ligne = Projet & {
  peut_ecrire: boolean;
  debut_planifie: string | null;
  fin_planifiee: string | null;
};

/**
 * Lit les projets et modèles visibles avec le droit d'écriture (seul endroit où se décident les
 * droits, modèles compris, SPEC §11.1). Administrateur : tout, en écriture. Chef de projet : ses
 * projets et leurs sous-projets, en écriture ; tous les modèles, en lecture seule. Tout rôle : les
 * projets où l'utilisateur est affecté, en lecture seule hors de sa portée de chef. Un modèle est
 * invisible pour une ressource, même affectée.
 */
async function lireVisibles(db: Db, user: Acteur, id?: number): Promise<Ligne[]> {
  if (user.role === 'administrateur') {
    const params: unknown[] = id === undefined ? [] : [id];
    const filtre = id === undefined ? '' : ' AND id = $1';
    const { rows } = await db.query<Ligne>(
      `SELECT ${COLONNES_LECTURE}, true AS peut_ecrire FROM projet WHERE true${filtre} ORDER BY id`,
      params,
    );
    return rows;
  }
  const params: unknown[] = [user.id, user.role === 'chef_de_projet'];
  if (id !== undefined) params.push(id);
  const filtre = id === undefined ? '' : ' AND id = $3';
  const { rows } = await db.query<Ligne>(
    `WITH RECURSIVE portee (id) AS (
       SELECT id FROM projet WHERE chef_id = $1 AND $2::boolean AND NOT est_modele
       UNION
       SELECT p.id FROM projet p JOIN portee ON p.parent_id = portee.id)
     SELECT ${COLONNES_LECTURE}, (id IN (SELECT id FROM portee)) AS peut_ecrire FROM projet
      WHERE (id IN (SELECT id FROM portee)
             OR (est_modele AND $2::boolean)
             OR (NOT est_modele
                 AND id IN (SELECT projet_id FROM affectation_projet WHERE ressource_id = $1)))${filtre}
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

/** Liste des modèles visibles ; vide pour une ressource. */
export async function modelesVisibles(db: Db, user: Acteur): Promise<Ligne[]> {
  return (await lireVisibles(db, user)).filter((l) => l.est_modele);
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
}

async function lireProjet(db: Db, id: number): Promise<Projet | null> {
  const { rows } = await db.query<Projet>(`SELECT ${COLONNES} FROM projet WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Sans transaction interne (l'appelant l'ouvre) : réutilisable par la copie de projet (lot 1b). */
export async function creerProjet(db: Db, par: number, d: NouveauProjet): Promise<Projet> {
  const { rows } = await db.query<Projet>(
    `INSERT INTO projet (code, nom, parent_id, priorite, chef_id, date_debut, est_modele)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLONNES}`,
    [d.code, d.nom, d.parent_id, d.priorite, d.chef_id, d.date_debut, d.est_modele ?? false],
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

/** Le chef d'un projet est un administrateur ou un chef de projet actif. */
export async function chefValide(db: Db, chefId: number): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM utilisateur
      WHERE id = $1 AND actif AND role IN ('administrateur', 'chef_de_projet')`,
    [chefId],
  );
  return (rowCount ?? 0) > 0;
}
