import type { Db } from '../db/erreurs.js';
import type { Acteur } from '../planning/projets.js';
import { lirePlanDeCharge, type FiltreEquipe } from '../planning/plan-de-charge.js';
import { formaterMois, produireCsv, type Champ } from './csv.js';

const ENTETES = [
  'Ressource',
  'Équipe',
  'Projet',
  'Mois',
  'Disponible',
  'Réel',
  'Planifié',
  'Charge',
  'Écart',
];

/** Export du plan de charge (lot 6f, D-160 (3)) : totaux de la ressource, puis une ligne par projet et mois. */
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
  const lignes: Champ[][] = [];
  for (const r of plan.ressources) {
    const ressource = r.actif ? r.nom : `${r.nom} (inactif)`;
    const equipe = r.equipe_id === null ? '' : (noms.get(r.equipe_id) ?? '');
    for (const m of r.mois) {
      lignes.push([
        ressource,
        equipe,
        'Total',
        formaterMois(m.mois),
        m.disponible,
        m.reel,
        m.planifie,
        m.charge,
        m.ecart,
      ]);
    }
    for (const p of r.projets) {
      const libelle = p.code === null ? 'Autres projets' : `${p.code} · ${p.nom}`;
      for (const m of p.mois) {
        lignes.push([
          ressource,
          equipe,
          libelle,
          formaterMois(m.mois),
          null,
          m.reel,
          m.planifie,
          m.charge,
          null,
        ]);
      }
    }
  }
  return produireCsv(ENTETES, lignes);
}
