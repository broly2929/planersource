import type { Db } from '../db/erreurs.js';

export type Entite =
  | 'projet'
  | 'affectation'
  | 'activite'
  | 'jalon'
  | 'dependance'
  | 'assignation'
  | 'calendrier'
  | 'taux'
  | 'taux_equipe';

export const ENTITES: readonly Entite[] = [
  'projet',
  'affectation',
  'activite',
  'jalon',
  'dependance',
  'assignation',
  'calendrier',
  'taux',
  'taux_equipe',
];

export type Objet = object;

export interface Entree {
  quand: string;
  utilisateur_id: number;
  entite: Entite;
  entite_id: number;
  operation: 'creation' | 'modification' | 'suppression';
  champ: string | null;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

/** Colonnes calculées par le moteur et valeurs hors historique (D-023, D-034) : jamais écrites. */
const EXCLUES: Partial<Record<Entite, readonly string[]>> = {
  activite: ['debut_planifie', 'fin_planifiee', 'drapeaux', 'est_parent'],
  jalon: ['date_planifiee'],
  calendrier: ['feries'],
};

function retenir(entite: Entite, objet: Objet): Record<string, unknown> {
  const exclues = EXCLUES[entite] ?? [];
  return Object.fromEntries(Object.entries(objet).filter(([cle]) => !exclues.includes(cle)));
}

export interface Ecriture {
  utilisateurId: number;
  entite: Entite;
  /** État avant l'écriture ; null pour une création. */
  avant: (Objet & { id: number }) | null;
  /** État après l'écriture ; null pour une suppression. */
  apres: (Objet & { id: number }) | null;
  /** Projet concerné ; absent pour un calendrier et un taux (D-225). */
  projetId?: number | undefined;
}

const json = (valeur: unknown): string | null =>
  valeur === null || valeur === undefined ? null : JSON.stringify(valeur);

/**
 * Seule fonction qui écrit l'historique. À appeler dans la transaction de l'écriture, après elle :
 * une écriture refusée n'écrit rien, et l'entrée disparaît avec la transaction. Création : objet
 * complet ; suppression : objet complet ; modification : une entrée par champ réellement modifié.
 */
export async function enregistrer(db: Db, e: Ecriture): Promise<void> {
  const objet = e.apres ?? e.avant;
  if (!objet) return;
  const base = [e.utilisateurId, e.entite, objet.id, e.projetId ?? null];
  const inserer = (
    operation: Entree['operation'],
    champ: string | null,
    ancienne: unknown,
    nouvelle: unknown,
  ) =>
    db.query(
      `INSERT INTO historique (utilisateur_id, entite, entite_id, projet_id, operation, champ,
                               ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [...base, operation, champ, json(ancienne), json(nouvelle)],
    );
  if (!e.avant) return void (await inserer('creation', null, null, retenir(e.entite, e.apres!)));
  if (!e.apres) return void (await inserer('suppression', null, retenir(e.entite, e.avant), null));
  const avant = retenir(e.entite, e.avant);
  const apres = retenir(e.entite, e.apres);
  for (const champ of Object.keys(apres).sort()) {
    if (json(avant[champ]) !== json(apres[champ])) {
      await inserer('modification', champ, avant[champ] ?? null, apres[champ]);
    }
  }
}

/** Verrou de ligne : l'état « avant » lu ensuite est celui que la modification remplace. */
export async function verrouiller(
  db: Db,
  table: 'projet' | 'affectation_projet' | 'element' | 'dependance' | 'assignation' | 'calendrier',
  id: number,
): Promise<void> {
  await db.query(`SELECT 1 FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
}

const COLONNES = `quand, utilisateur_id, entite, entite_id, operation, champ,
  ancienne_valeur, nouvelle_valeur`;

/** Du plus récent au plus ancien. */
export async function lireHistoriqueProjet(db: Db, projetId: number): Promise<Entree[]> {
  const { rows } = await db.query<Entree>(
    `SELECT ${COLONNES} FROM historique WHERE projet_id = $1 ORDER BY quand DESC, id DESC`,
    [projetId],
  );
  return rows;
}

/** Historique transversal, filtré par entité si demandé. Du plus récent au plus ancien. */
export async function lireHistorique(db: Db, entite?: Entite): Promise<Entree[]> {
  const { rows } = await db.query<Entree>(
    `SELECT ${COLONNES} FROM historique WHERE $1::text IS NULL OR entite = $1
      ORDER BY quand DESC, id DESC`,
    [entite ?? null],
  );
  return rows;
}
