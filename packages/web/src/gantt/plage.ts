import {
  PX_PAR_JOUR,
  ajouterJours,
  dimancheDeLaSemaine,
  joursEntre,
  lundiDeLaSemaine,
  numeroJour,
  type Zoom,
} from './echelle.js';
import { datesLigne, type LigneGantt } from './GanttSvg';

const MARGE_FIN = 14;
const DUREE_MINIMALE = 27;

/**
 * Plage affichée (D-066 4) : du lundi de la semaine du plus petit jour connu au dimanche de la semaine du
 * plus grand, plus 14 jours ; le plus grand jour vaut au moins début du projet + 27 jours. `aujourdhui`
 * n'étend jamais la plage ; il ne sert que s'il n'existe aucun autre jour.
 */
export function calculerPlage(entree: {
  debutProjet: string | null;
  jours: string[];
  aujourdhui?: string;
}): { debut: string; fin: string } {
  const connus = [...entree.jours, ...(entree.debutProjet ? [entree.debutProjet] : [])];
  if (connus.length === 0 && entree.aujourdhui) connus.push(entree.aujourdhui);
  if (connus.length === 0) throw new Error('Aucune date pour calculer la plage.');
  const tries = [...connus].sort((a, b) => numeroJour(a) - numeroJour(b));
  const plusPetit = tries[0]!;
  let plusGrand = tries[tries.length - 1]!;
  const minimum = ajouterJours(entree.debutProjet ?? plusPetit, DUREE_MINIMALE);
  if (numeroJour(minimum) > numeroJour(plusGrand)) plusGrand = minimum;
  return {
    debut: lundiDeLaSemaine(plusPetit),
    fin: ajouterJours(dimancheDeLaSemaine(plusGrand), MARGE_FIN),
  };
}

/**
 * Prolonge la plage à droite par semaines entières tant que sa largeur est inférieure à la largeur
 * disponible (D-069, SPEC §6 Affichage 16). Plage inchangée si elle suffit ou si la largeur est nulle.
 */
export function etendrePlage(
  plage: { debut: string; fin: string },
  largeurDisponible: number,
  zoom: Zoom,
): { debut: string; fin: string } {
  const pxParJour = PX_PAR_JOUR[zoom];
  const jours = joursEntre(plage.debut, plage.fin) + 1;
  const manque = largeurDisponible - jours * pxParJour;
  if (manque <= 0) return plage;
  const semaines = Math.ceil(manque / (7 * pxParJour));
  return { debut: plage.debut, fin: ajouterJours(plage.fin, 7 * semaines) };
}

export function joursConnus(lignes: LigneGantt[]): string[] {
  const jours: string[] = [];
  for (const l of lignes) {
    const d = datesLigne(l);
    if (d) jours.push(d.debut, d.fin);
    if (l.genre === 'element') {
      const e = l.element;
      for (const j of [e.debut_valide, e.fin_valide, e.date_validee]) if (j) jours.push(j);
    }
  }
  return jours;
}

/** Dates client des jalons (D-149 (8c)) : ajoutées aux jours du Gantt du projet, jamais à ceux de l'Accueil. */
export function joursClient(lignes: LigneGantt[]): string[] {
  const jours: string[] = [];
  for (const l of lignes) {
    if (l.genre === 'element' && l.element.type === 'jalon' && l.element.date_client) {
      jours.push(l.element.date_client);
    }
  }
  return jours;
}
