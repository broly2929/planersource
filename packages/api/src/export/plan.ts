import type { Db } from '../db/erreurs.js';
import type { Acteur } from '../planning/projets.js';
import { lirePlanDeCharge, type FiltreEquipe } from '../planning/plan-de-charge.js';
import { formaterMois, produireCsv, type Champ } from './csv.js';

/** Export du plan de charge (D-241, révise D-160 (3)) : lignes Charge, Disponible, Écart, puis une par projet ; une colonne par mois. */
export async function exporterPlanDeCharge(
  db: Db,
  acteur: Acteur,
  debut: string,
  filtre: FiltreEquipe,
): Promise<string> {
  const plan = await lirePlanDeCharge(db, acteur, debut, filtre);
  const { rows: equipes } = await db.query<{ id: number; nom: string }>(
    'SELECT id, nom FROM equipe',
  );
  const noms = new Map(equipes.map((e) => [e.id, e.nom]));
  const entetes = ['Ressource', 'Équipe', 'Ligne', ...plan.mois.map((m) => formaterMois(m))];
  const lignes: Champ[][] = [];
  for (const r of plan.ressources) {
    const ressource = r.actif ? r.nom : `${r.nom} (inactif)`;
    const equipe = r.equipe_id === null ? '' : (noms.get(r.equipe_id) ?? '');
    lignes.push([ressource, equipe, 'Charge', ...r.mois.map((m) => m.charge)]);
    lignes.push([ressource, equipe, 'Disponible', ...r.mois.map((m) => m.disponible)]);
    lignes.push([ressource, equipe, 'Écart', ...r.mois.map((m) => m.ecart)]);
    for (const p of r.projets) {
      const libelle = p.code === null ? 'Autres projets' : `${p.code} · ${p.nom}`;
      lignes.push([ressource, equipe, libelle, ...p.mois.map((m) => m.charge)]);
    }
  }
  return produireCsv(entetes, lignes);
}
