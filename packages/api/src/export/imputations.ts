import type { Db } from '../db/erreurs.js';
import { lirePlanning } from '../planning/elements.js';
import { projetsEcrits } from '../planning/feuilles.js';
import type { FiltreEquipe } from '../planning/plan-de-charge.js';
import type { Acteur } from '../planning/projets.js';
import { formaterDate, produireCsv, type Champ } from './csv.js';

const ENTETES = [
  'Ressource',
  'Équipe',
  'Semaine',
  'Statut',
  'Projet',
  'Activité',
  'Jour',
  'Charge',
];
const MAX_ID = 2147483647;

const STATUTS: Record<string, string> = {
  brouillon: 'Brouillon',
  soumise: 'Soumise',
  validee: 'Validée',
  rejetee: 'Rejetée',
};

interface Ligne {
  ressource_id: number;
  ressource: string;
  equipe: string | null;
  lundi: string;
  statut: string | null;
  projet_id: number;
  code: string;
  projet_nom: string;
  activite_id: number;
  activite_nom: string;
  jour: string;
  charge: string;
}

/**
 * Export des imputations de la période (lot 6f, D-160 (4)) : administrateur, toutes ; chef de projet,
 * celles des projets où il écrit. Toutes feuilles, quel que soit le statut.
 */
export async function exporterImputations(
  db: Db,
  acteur: Acteur,
  du: string,
  au: string,
  filtre: FiltreEquipe,
): Promise<string> {
  if (filtre.genre === 'equipe' && filtre.id > MAX_ID) return produireCsv(ENTETES, []);
  const params: unknown[] = [du, au];
  const conditions: string[] = [];
  const ecrits = await projetsEcrits(db, acteur);
  if (ecrits !== 'tous') {
    params.push(ecrits);
    conditions.push(`p.id = ANY($${params.length}::int[])`);
  }
  if (filtre.genre === 'aucune') conditions.push('u.equipe_id IS NULL');
  if (filtre.genre === 'equipe') {
    params.push(filtre.id);
    conditions.push(`u.equipe_id = $${params.length}`);
  }
  const { rows } = await db.query<Ligne>(
    `SELECT u.id AS ressource_id, u.nom AS ressource, q.nom AS equipe,
            to_char(date_trunc('week', i.jour), 'YYYY-MM-DD') AS lundi, f.statut,
            p.id AS projet_id, p.code, p.nom AS projet_nom, e.id AS activite_id,
            e.nom AS activite_nom, to_char(i.jour, 'YYYY-MM-DD') AS jour, i.charge::text AS charge
       FROM imputation i
       JOIN assignation s ON s.id = i.assignation_id
       JOIN element e ON e.id = s.activite_id
       JOIN projet p ON p.id = e.projet_id
       JOIN utilisateur u ON u.id = s.ressource_id
       LEFT JOIN equipe q ON q.id = u.equipe_id
       LEFT JOIN feuille_temps f
         ON f.ressource_id = u.id AND f.lundi = date_trunc('week', i.jour)::date
      WHERE i.jour >= $1::date AND i.jour <= $2::date
        ${conditions.map((c) => `AND ${c}`).join(' ')}`,
    params,
  );

  // Rang dans l'ordre WBS, par projet (même calcul que Mes tâches, D-158 (2)).
  const rang = new Map<number, Map<number, { wbs: string; ordre: number }>>();
  for (const projetId of new Set(rows.map((r) => r.projet_id))) {
    const planning = await lirePlanning(db, projetId, false);
    rang.set(projetId, new Map(planning.map((l, i) => [l.id, { wbs: l.wbs, ordre: i }])));
  }
  const info = (r: Ligne) => rang.get(r.projet_id)!.get(r.activite_id)!;
  const bas = (t: string) => t.toLowerCase();
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  rows.sort(
    (x, y) =>
      cmp(bas(x.ressource), bas(y.ressource)) ||
      x.ressource_id - y.ressource_id ||
      cmp(x.jour, y.jour) ||
      cmp(bas(x.code), bas(y.code)) ||
      x.projet_id - y.projet_id ||
      info(x).ordre - info(y).ordre,
  );
  const lignes: Champ[][] = rows.map((r) => [
    r.ressource,
    r.equipe ?? '',
    formaterDate(r.lundi),
    STATUTS[r.statut ?? 'brouillon'] ?? 'Brouillon',
    `${r.code} · ${r.projet_nom}`,
    `${info(r).wbs} ${r.activite_nom}`,
    formaterDate(r.jour),
    Number(r.charge),
  ]);
  return produireCsv(ENTETES, lignes);
}
