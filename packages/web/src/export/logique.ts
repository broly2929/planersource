// Logique pure des exports CSV (lot 6f, D-160 (5), (6), D-161 (3)). Aucune dépendance au DOM.
import { joursSemaine } from '../imputations/logique';

/** Filtre « Équipe » des exports : toutes, sans équipe, ou l'identifiant d'une équipe. */
export type EquipeExport = 'toutes' | 'aucune' | number;

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;
export const JOURS_MAX_EXPORT = 366;

/** Lundi et dimanche de la semaine du lundi donné. */
export function periodeSemaine(lundi: string): { du: string; au: string } {
  const jours = joursSemaine(lundi);
  return { du: jours[0]!, au: jours[6]! };
}

/** Jours depuis l'époque d'un jour AAAA-MM-JJ réel, de 2000 à 2099 ; sinon null. */
function numeroJour(jour: string): number | null {
  const m = JOUR.exec(jour);
  if (!m) return null;
  const annee = Number(m[1]);
  if (annee < 2000 || annee > 2099) return null;
  const d = new Date(Date.UTC(annee, Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === jour ? d.getTime() / 86400000 : null;
}

/** Période saisie valide : deux jours réels, `au` non antérieur à `du`, 366 jours au plus bornes comprises. */
export function periodeExportValide(du: string, au: string): boolean {
  const debut = numeroJour(du);
  const fin = numeroJour(au);
  return debut !== null && fin !== null && fin >= debut && fin - debut + 1 <= JOURS_MAX_EXPORT;
}

const suffixeEquipe = (equipe: EquipeExport): string =>
  equipe === 'toutes' ? '' : `&equipe=${equipe}`;

export const adresseExportPlan = (debut: string, equipe: EquipeExport): string =>
  `/api/plan-de-charge/export?debut=${debut}${suffixeEquipe(equipe)}`;

export const adresseExportImputations = (du: string, au: string, equipe: EquipeExport): string =>
  `/api/imputations/export?du=${du}&au=${au}${suffixeEquipe(equipe)}`;
