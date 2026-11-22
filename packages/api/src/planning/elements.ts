import type { Db } from '../db/erreurs.js';
import { enregistrer, verrouiller } from './historique.js';
import { champsActivite, champsJalon, lireVendu } from './vendu.js';

export interface Activite {
  id: number;
  projet_id: number;
  parent_id: number | null;
  rang: number;
  nom: string;
  mode: string;
  priorite: number;
  debut_valide: string | null;
  fin_valide: string | null;
  duree_validee: number | null;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  drapeaux: string[];
  close: boolean;
  charge_vendue: number | null;
  /** Calculé à la lecture : l'activité a des enfants (jamais historisé). */
  est_parent: boolean;
}

export interface Jalon {
  id: number;
  projet_id: number;
  parent_id: number | null;
  rang: number;
  nom: string;
  type: string;
  date_validee: string | null;
  date_planifiee: string | null;
  date_client: string | null;
}

export interface LignePlanning {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
  /** Champs de 6c, pour qui écrit sur le projet seulement (D-149 (4)). */
  charge_vendue?: number | null;
  marge?: number | null;
  date_client?: string | null;
  ecart_client?: number | null;
  engagement_depasse?: boolean;
}

const ACTIVITE = `e.id, e.projet_id, e.parent_id, e.rang, e.nom, a.mode, a.priorite, a.debut_valide,
  a.fin_valide, a.duree_validee, a.debut_planifie, a.fin_planifiee, a.drapeaux, a.close,
  a.charge_vendue,
  EXISTS (SELECT 1 FROM element f WHERE f.parent_id = e.id) AS est_parent
  FROM element e JOIN activite a ON a.id = e.id`;
const JALON = `e.id, e.projet_id, e.parent_id, e.rang, e.nom, j.type, j.date_validee, j.date_planifiee,
  j.date_client
  FROM element e JOIN jalon j ON j.id = e.id`;

export async function lireActivites(db: Db, projetId: number): Promise<Activite[]> {
  const { rows } = await db.query<Activite>(
    `SELECT ${ACTIVITE} WHERE e.projet_id = $1 ORDER BY e.id`,
    [projetId],
  );
  return rows;
}

export async function lireActivite(db: Db, id: number): Promise<Activite | null> {
  const { rows } = await db.query<Activite>(`SELECT ${ACTIVITE} WHERE e.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function lireJalons(db: Db, projetId: number): Promise<Jalon[]> {
  const { rows } = await db.query<Jalon>(`SELECT ${JALON} WHERE e.projet_id = $1 ORDER BY e.id`, [
    projetId,
  ]);
  return rows;
}

export async function lireJalon(db: Db, id: number): Promise<Jalon | null> {
  const { rows } = await db.query<Jalon>(`SELECT ${JALON} WHERE e.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Projet et type d'un élément (activité ou jalon), ou null. */
export async function lireElement(
  db: Db,
  id: number,
): Promise<{
  id: number;
  projet_id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
} | null> {
  const { rows } = await db.query<{
    id: number;
    projet_id: number;
    type: 'activite' | 'jalon';
    parent_id: number | null;
  }>('SELECT id, projet_id, type, parent_id FROM element WHERE id = $1', [id]);
  return rows[0] ?? null;
}

/**
 * Parcours en profondeur des éléments du projet `$1` : CTE `arbre` (id, type, parent_id, rang, nom,
 * wbs, chemin), à placer après `WITH RECURSIVE`. Partagé par le planning et le Gantt (lot 3a).
 */
export const WBS_CTE = `classes AS (
       SELECT id, type, parent_id, rang, nom,
              row_number() OVER (PARTITION BY parent_id ORDER BY rang) AS pos
         FROM element WHERE projet_id = $1
     ), arbre AS (
       SELECT id, type, parent_id, rang, nom, pos::text AS wbs,
              lpad(pos::text, 9, '0') AS chemin
         FROM classes WHERE parent_id IS NULL
       UNION ALL
       SELECT c.id, c.type, c.parent_id, c.rang, c.nom, a.wbs || '.' || c.pos,
              a.chemin || '.' || lpad(c.pos::text, 9, '0')
         FROM classes c JOIN arbre a ON c.parent_id = a.id
     )`;

/** Éléments du projet dans l'ordre du parcours en profondeur, avec le numéro WBS calculé. */
export async function lirePlanning(
  db: Db,
  projetId: number,
  peutEcrire: boolean,
): Promise<LignePlanning[]> {
  const { rows } = await db.query<LignePlanning>(
    `WITH RECURSIVE ${WBS_CTE}
     SELECT id, type, parent_id, rang, wbs, nom FROM arbre ORDER BY chemin`,
    [projetId],
  );
  if (!peutEcrire) return rows;
  // D-149 (4) : charge vendue, marge et champs client, pour qui écrit sur le projet seulement.
  const vendu = await lireVendu(db, projetId);
  const jalons = new Map((await lireJalons(db, projetId)).map((j) => [j.id, j]));
  return rows.map((l) =>
    l.type === 'activite'
      ? { ...l, ...champsActivite(vendu, l.id) }
      : { ...l, ...champsJalon(jalons.get(l.id)!) },
  );
}

/** Libère le rang `rang` dans la fraterie en décalant les frères suivants (rangs uniques différés). */
async function faireDeLaPlace(
  db: Db,
  projetId: number,
  parentId: number | null,
  rang: number,
  sauf: number | null,
): Promise<void> {
  await db.query(
    `UPDATE element SET rang = rang + 1
      WHERE projet_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND rang >= $3
        AND ($4::integer IS NULL OR id <> $4)`,
    [projetId, parentId, rang, sauf],
  );
}

async function nombreDeFreres(
  db: Db,
  projetId: number,
  parentId: number | null,
  sauf: number | null,
): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM element
      WHERE projet_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND ($3::integer IS NULL OR id <> $3)`,
    [projetId, parentId, sauf],
  );
  return Number(rows[0]!.n);
}

/** Verrou des rangs d'un projet : sérialise les créations et déplacements du même projet. */
async function verrouillerRangs(db: Db, projetId: number): Promise<void> {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`element_rangs_${projetId}`]);
}

/** Insère l'élément à `rang` (en fin de fraterie par défaut) ; plusieurs écritures : dans une transaction. */
async function insererElement(
  db: Db,
  projetId: number,
  type: 'activite' | 'jalon',
  parentId: number | null,
  nom: string,
  rang: number | undefined,
): Promise<number> {
  await verrouillerRangs(db, projetId);
  const freres = await nombreDeFreres(db, projetId, parentId, null);
  const position = Math.min(Math.max(rang ?? freres + 1, 1), freres + 1);
  await faireDeLaPlace(db, projetId, parentId, position, null);
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO element (projet_id, type, parent_id, rang, nom) VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [projetId, type, parentId, position, nom],
  );
  return rows[0]!.id;
}

export interface NouvelleActivite {
  nom: string;
  parent_id: number | null;
  rang?: number | undefined;
  mode: string;
  priorite: number;
  debut_valide: string | null;
  fin_valide: string | null;
  duree_validee: number | null;
  charge_vendue: number | null;
}

/** Sans transaction interne : l'appelant ouvre la transaction (plusieurs écritures). */
export async function creerActivite(
  db: Db,
  par: number,
  projetId: number,
  d: NouvelleActivite,
): Promise<Activite> {
  const id = await insererElement(db, projetId, 'activite', d.parent_id, d.nom, d.rang);
  await db.query(
    `INSERT INTO activite (id, mode, priorite, debut_valide, fin_valide, duree_validee, charge_vendue)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, d.mode, d.priorite, d.debut_valide, d.fin_valide, d.duree_validee, d.charge_vendue],
  );
  const activite = (await lireActivite(db, id))!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'activite',
    avant: null,
    apres: activite,
    projetId,
  });
  return activite;
}

export interface NouveauJalon {
  nom: string;
  parent_id: number | null;
  rang?: number | undefined;
  type: string;
  date_validee: string | null;
  date_client: string | null;
}

/** Sans transaction interne : l'appelant ouvre la transaction (plusieurs écritures). */
export async function creerJalon(
  db: Db,
  par: number,
  projetId: number,
  d: NouveauJalon,
): Promise<Jalon> {
  const id = await insererElement(db, projetId, 'jalon', d.parent_id, d.nom, d.rang);
  await db.query(
    'INSERT INTO jalon (id, type, date_validee, date_client) VALUES ($1, $2, $3, $4)',
    [id, d.type, d.date_validee, d.date_client],
  );
  const jalon = (await lireJalon(db, id))!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'jalon',
    avant: null,
    apres: jalon,
    projetId,
  });
  return jalon;
}

export type ModifActivite = Omit<NouvelleActivite, 'parent_id' | 'rang'> & { close?: boolean };

/** Dans une transaction : plusieurs écritures (élément, activité) et l'historique, atomiques. */
export async function modifierActivite(
  db: Db,
  par: number,
  id: number,
  d: ModifActivite,
): Promise<Activite> {
  await verrouiller(db, 'element', id);
  const avant = (await lireActivite(db, id))!;
  await db.query('UPDATE element SET nom = $2 WHERE id = $1', [id, d.nom]);
  await db.query(
    `UPDATE activite SET mode = $2, priorite = $3, debut_valide = $4, fin_valide = $5,
            duree_validee = $6, charge_vendue = $7 WHERE id = $1`,
    [id, d.mode, d.priorite, d.debut_valide, d.fin_valide, d.duree_validee, d.charge_vendue],
  );
  if (d.close !== undefined) {
    await db.query('UPDATE activite SET close = $2 WHERE id = $1', [id, d.close]);
  }
  const apres = (await lireActivite(db, id))!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'activite',
    avant,
    apres,
    projetId: apres.projet_id,
  });
  return apres;
}

export type ModifJalon = Omit<NouveauJalon, 'parent_id' | 'rang'>;

/** Dans une transaction : plusieurs écritures (élément, jalon) et l'historique, atomiques. */
export async function modifierJalon(
  db: Db,
  par: number,
  id: number,
  d: ModifJalon,
): Promise<Jalon> {
  await verrouiller(db, 'element', id);
  const avant = (await lireJalon(db, id))!;
  await db.query('UPDATE element SET nom = $2 WHERE id = $1', [id, d.nom]);
  await db.query('UPDATE jalon SET type = $2, date_validee = $3, date_client = $4 WHERE id = $1', [
    id,
    d.type,
    d.date_validee,
    d.date_client,
  ]);
  const apres = (await lireJalon(db, id))!;
  await enregistrer(db, {
    utilisateurId: par,
    entite: 'jalon',
    avant,
    apres,
    projetId: apres.projet_id,
  });
  return apres;
}

/**
 * Supprime l'élément et, en cascade, son extension, ses dépendances et ses assignations. Dans une
 * transaction. Seule l'entrée de l'élément est écrite (D-034), pas celles de la cascade.
 */
export async function supprimerElement(
  db: Db,
  par: number,
  id: number,
  type: 'activite' | 'jalon',
): Promise<boolean> {
  const avant = type === 'activite' ? await lireActivite(db, id) : await lireJalon(db, id);
  const { rowCount } = await db.query('DELETE FROM element WHERE id = $1 AND type = $2', [
    id,
    type,
  ]);
  if (!avant || !rowCount) return false;
  await enregistrer(db, {
    utilisateurId: par,
    entite: type,
    avant,
    apres: null,
    projetId: avant.projet_id,
  });
  return true;
}

/**
 * Déplace l'élément sous `parentId` (null = racine) à `rang` (fin de fraterie par défaut).
 * Plusieurs écritures : l'appelant ouvre la transaction. Les frères de l'ancienne fraterie sont
 * recompactés ; seul l'élément déplacé change de parent, et lui seul est historisé.
 */
export async function deplacerElement(
  db: Db,
  par: number,
  elementId: number,
  type: 'activite' | 'jalon',
  projetId: number,
  ancienParent: number | null,
  parentId: number | null,
  rang: number | undefined,
): Promise<void> {
  await verrouillerRangs(db, projetId);
  const lire = type === 'activite' ? lireActivite : lireJalon;
  const avant = (await lire(db, elementId))!;
  // D-041 : `rang` est la position finale. On retire d'abord l'élément de son ancienne place
  // (les frères restants sont recompactés de 1 à n-1), puis on libère la position visée.
  await db.query(
    `UPDATE element e SET rang = c.pos
       FROM (SELECT id, row_number() OVER (ORDER BY rang) AS pos FROM element
              WHERE projet_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND id <> $3) c
      WHERE e.id = c.id AND e.rang <> c.pos`,
    [projetId, ancienParent, elementId],
  );
  const freres = await nombreDeFreres(db, projetId, parentId, elementId);
  const position = Math.min(Math.max(rang ?? freres + 1, 1), freres + 1);
  await faireDeLaPlace(db, projetId, parentId, position, elementId);
  await db.query('UPDATE element SET parent_id = $2, rang = $3 WHERE id = $1', [
    elementId,
    parentId,
    position,
  ]);
  // recompacte l'ancienne fraterie (rangs consécutifs à partir de 1)
  await db.query(
    `UPDATE element e SET rang = c.pos
       FROM (SELECT id, row_number() OVER (ORDER BY rang) AS pos FROM element
              WHERE projet_id = $1 AND parent_id IS NOT DISTINCT FROM $2) c
      WHERE e.id = c.id AND e.rang <> c.pos`,
    [projetId, ancienParent],
  );
  const apres = (await lire(db, elementId))!;
  await enregistrer(db, { utilisateurId: par, entite: type, avant, apres, projetId });
}
