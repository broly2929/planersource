// Clôture (D-083) : contrôles des transitions de clôture et des écritures sous un parent clos.
// Toutes les fonctions s'exécutent dans la transaction de l'écriture, après le verrou de la racine.
import type { Db } from '../db/erreurs.js';

export type CodeCloture = 'enfants_ouverts' | 'parent_clos';

/** Refus de clôture : traduit en 422 { erreur, code } par la route ; la transaction est annulée. */
export class RefusCloture extends Error {
  constructor(readonly code: CodeCloture) {
    super(
      code === 'enfants_ouverts'
        ? 'Des sous-projets ou des activités ne sont pas clos'
        : 'Le projet ou l’activité parente est clos',
    );
  }
}

const RACINE = `WITH RECURSIVE chaine (id, parent_id) AS (
    SELECT id, parent_id FROM projet WHERE id = $1
    UNION ALL
    SELECT p.id, p.parent_id FROM projet p JOIN chaine c ON p.id = c.parent_id
  )
  SELECT id FROM chaine WHERE parent_id IS NULL`;

async function racine(db: Db, projetId: number): Promise<number | null> {
  const { rows } = await db.query<{ id: number }>(RACINE, [projetId]);
  return rows[0]?.id ?? null;
}

/**
 * Verrou de ligne (FOR UPDATE) sur le projet racine de l'arbre de chaque projet donné (D-083 (6)),
 * dans l'ordre des identifiants. La racine est relue après le verrou : un rattachement concurrent
 * a pu la changer.
 */
export async function verrouillerRacines(db: Db, projetIds: number[]): Promise<void> {
  const tenues = new Set<number>();
  for (let essai = 0; essai < 10; essai += 1) {
    const racines = new Set<number>();
    for (const id of projetIds) {
      const r = await racine(db, id);
      if (r !== null) racines.add(r);
    }
    const aTenir = [...racines].filter((r) => !tenues.has(r)).sort((a, b) => a - b);
    if (aTenir.length === 0) return;
    for (const r of aTenir) {
      await db.query('SELECT id FROM projet WHERE id = $1 FOR UPDATE', [r]);
      tenues.add(r);
    }
  }
}

async function vrai(db: Db, sql: string, params: unknown[]): Promise<boolean> {
  const { rows } = await db.query<{ v: boolean }>(`SELECT (${sql}) AS v`, params);
  return rows[0]?.v === true;
}

/** Le projet (si `inclureSoi`) ou l'un de ses ancêtres est clos. */
export function projetOuAncetreClos(db: Db, projetId: number, inclureSoi: boolean) {
  return vrai(
    db,
    `WITH RECURSIVE chaine (id, parent_id, clos) AS (
       SELECT id, parent_id, clos FROM projet WHERE id = $1
       UNION ALL
       SELECT p.id, p.parent_id, p.clos FROM projet p JOIN chaine c ON p.id = c.parent_id
     )
     SELECT EXISTS (SELECT 1 FROM chaine WHERE clos AND ($2 OR id <> $1))`,
    [projetId, inclureSoi],
  );
}

/** Le projet est clos. */
export const projetClos = (db: Db, projetId: number) =>
  vrai(db, 'EXISTS (SELECT 1 FROM projet WHERE id = $1 AND clos)', [projetId]);

/** Un sous-projet (tout niveau) non clos, ou une activité ouverte du projet ou d'un sous-projet. */
export function projetAEnfantsOuverts(db: Db, projetId: number) {
  return vrai(
    db,
    `WITH RECURSIVE arbre (id) AS (
       SELECT $1::integer
       UNION ALL
       SELECT p.id FROM projet p JOIN arbre a ON p.parent_id = a.id
     )
     SELECT EXISTS (SELECT 1 FROM projet p JOIN arbre a ON p.id = a.id
                     WHERE p.id <> $1 AND NOT p.clos)
         OR EXISTS (SELECT 1 FROM element e JOIN activite act ON act.id = e.id
                      JOIN arbre a ON e.projet_id = a.id WHERE NOT act.close)`,
    [projetId],
  );
}

/** Une sous-activité (tout niveau) ouverte. */
export function activiteADescendantsOuverts(db: Db, activiteId: number) {
  return vrai(
    db,
    `WITH RECURSIVE sous (id) AS (
       SELECT id FROM element WHERE parent_id = $1
       UNION ALL
       SELECT e.id FROM element e JOIN sous s ON e.parent_id = s.id
     )
     SELECT EXISTS (SELECT 1 FROM activite a JOIN sous s ON a.id = s.id WHERE NOT a.close)`,
    [activiteId],
  );
}

/** L'une des activités ancêtres de l'activité est close. */
export function ancetreActiviteClose(db: Db, activiteId: number) {
  return vrai(
    db,
    `WITH RECURSIVE chaine (id, parent_id) AS (
       SELECT id, parent_id FROM element WHERE id = $1
       UNION ALL
       SELECT e.id, e.parent_id FROM element e JOIN chaine c ON e.id = c.parent_id
     )
     SELECT EXISTS (SELECT 1 FROM activite a JOIN chaine c ON a.id = c.id
                     WHERE a.close AND a.id <> $1)`,
    [activiteId],
  );
}

/** Création ou déplacement d'un élément (D-083 (3)) : projet clos ou activité parente close. */
export async function controlerDestination(
  db: Db,
  projetId: number,
  parentId: number | null,
): Promise<void> {
  const clos = await vrai(
    db,
    `EXISTS (SELECT 1 FROM projet WHERE id = $1 AND clos)
      OR EXISTS (SELECT 1 FROM activite WHERE id = $2 AND close)`,
    [projetId, parentId],
  );
  if (clos) throw new RefusCloture('parent_clos');
}
