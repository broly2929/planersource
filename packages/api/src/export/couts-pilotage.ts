import type { Db } from '../db/erreurs.js';
import { lireCoutsPilotage } from '../planning/couts-pilotage.js';
import type { CoutTotal } from '../planning/couts-mensuels.js';
import type { FiltreEquipe } from '../planning/plan-de-charge.js';
import type { Acteur } from '../planning/projets.js';
import { formaterMois, produireCsv, type Champ } from './csv.js';

const oui = (t: CoutTotal): string => (t.taux_manquant ? 'oui' : 'non');

/** Export des coûts mensuels (SPEC §12.5 point 5, D-243) : par projet une ligne « Total » puis une par ressource. */
export async function exporterCoutsPilotage(
  db: Db,
  acteur: Acteur,
  debut: string,
  filtre: FiltreEquipe,
): Promise<string> {
  const c = await lireCoutsPilotage(db, acteur, debut, filtre);
  const entetes = [
    'Projet',
    'OTP',
    'Ressource',
    ...c.mois.map((m) => formaterMois(m)),
    'Total',
    'Taux manquant',
  ];
  const lignes: Champ[][] = [];
  for (const p of c.projets) {
    const projet = `${p.code} · ${p.nom}`;
    const otp = p.otp_effectif ?? '';
    lignes.push([projet, otp, 'Total', ...p.mois.map((m) => m.cout), p.total.cout, oui(p.total)]);
    for (const r of p.ressources) {
      const nom = r.actif ? r.nom : `${r.nom} (inactif)`;
      lignes.push([projet, otp, nom, ...r.mois.map((m) => m.cout), r.total.cout, oui(r.total)]);
    }
  }
  lignes.push([
    'Total',
    '',
    '',
    ...c.total.mois.map((m) => m.cout),
    c.total.total.cout,
    oui(c.total.total),
  ]);
  return produireCsv(entetes, lignes);
}
