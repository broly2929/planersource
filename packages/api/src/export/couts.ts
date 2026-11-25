import type { Db } from '../db/erreurs.js';
import { lireGantt } from '../planning/gantt.js';
import type { Acteur, Projet } from '../planning/projets.js';
import { produireCsv, type Champ } from './csv.js';

/** Export CSV des coûts d'un projet (SPEC §12.4 point 3, D-229) : lecture seule, jamais la charge vendue. */

const ENTETES = [
  'WBS',
  'Activité',
  'OTP',
  'Charge assignée',
  'Charge réelle',
  'Reste',
  'Coût planifié',
  'Coût imputé',
  'Coût réel',
  'Taux manquant',
];

const ouiNon = (b: unknown): string => (b === true ? 'oui' : 'non');

export async function exporterCouts(
  db: Db,
  user: Acteur,
  projet: Projet,
  jour: string,
): Promise<string> {
  const g = await lireGantt(db, user, projet, true, jour);
  const activites = g.elements.filter((e) => e.type === 'activite');
  const totaux = g.projet.totaux as Record<string, unknown>;
  const reste = activites
    .filter((e) => e.est_parent === false)
    .reduce((s, e) => s + (e.reste_a_faire as number), 0);
  const lignes: Champ[][] = activites.map((e) => [
    e.wbs as string,
    e.nom as string,
    (e.otp_effectif as string | null) ?? null,
    e.charge_assignee as number,
    e.charge_reelle as number,
    e.reste_a_faire as number,
    e.cout_planifie as number,
    e.cout_impute as number,
    e.cout_reel as number,
    ouiNon(e.taux_manquant),
  ]);
  lignes.push([
    'Total',
    null,
    null,
    totaux.charge_assignee as number,
    totaux.charge_reelle as number,
    reste,
    totaux.cout_planifie as number,
    totaux.cout_impute as number,
    totaux.cout_reel as number,
    ouiNon(totaux.taux_manquant),
  ]);
  return produireCsv(ENTETES, lignes);
}
