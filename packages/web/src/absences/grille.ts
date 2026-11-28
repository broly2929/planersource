// Grille mensuelle des absences (lot absences-grille, D-280 ; SPEC §4 « Absences et charge depuis le taux »,
// sous-section « Grille mensuelle (absences-grille, D-280) », points 25 à 29). Logique pure.
import { ajouterJours, jourSemaine } from '../gantt/echelle';
import { boutonsMois, decalerMois } from '../plan-de-charge/logique';
import type { FiltreEquipe } from '../plan-de-charge/logique';
import { dateFr, LIBELLE_MOTIF, type Absence, type Motif } from './logique';

/** Ligne de `GET /api/absences/grille?mois=` (point 29). */
export interface LigneGrille {
  id: number;
  nom: string;
  equipe_id: number | null;
  peut_ecrire: boolean;
  jours_non_ouvres: string[];
}

export const LETTRE_MOTIF: Record<Motif, string> = { conge: 'C', formation: 'F', autre: 'A' };

const MOIS = /^(\d{4})-(0[1-9]|1[0-2])$/;
const NOMS_MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const moisValide = (texte: string | null): texte is string => {
  const m = texte === null ? null : MOIS.exec(texte);
  return m !== null && Number(m[1]) >= 2000 && Number(m[1]) <= 2099;
};

/** Filtres de l'adresse (point 27) : valeur invalide ramenée au défaut, `corrige` vrai. */
export function parametresGrille(
  search: URLSearchParams,
  moisCourant: string,
): { mois: string; equipe: FiltreEquipe; ressource: number | null; corrige: boolean } {
  const moisParam = search.get('mois');
  const equipeParam = search.get('equipe');
  const ressourceParam = search.get('ressource');
  let corrige = false;
  let mois = moisCourant;
  if (moisValide(moisParam)) mois = moisParam;
  else corrige = true;
  let equipe: FiltreEquipe = 'toutes';
  if (equipeParam !== null) {
    if (equipeParam === 'aucune') equipe = 'aucune';
    else if (/^\d{1,15}$/.test(equipeParam)) equipe = Number(equipeParam);
    else corrige = true;
  }
  let ressource: number | null = null;
  if (ressourceParam !== null) {
    if (/^\d{1,15}$/.test(ressourceParam)) ressource = Number(ressourceParam);
    else corrige = true;
  }
  return { mois, equipe, ressource, corrige };
}

/** Adresse canonique de l'onglet Absences en grille ; `semaine` conservée si présente. */
export function adresseGrille(
  mois: string,
  equipe: FiltreEquipe,
  ressource: number | null,
  semaine: string | null,
): string {
  return (
    `/imputations?onglet=absences${semaine === null ? '' : `&semaine=${semaine}`}&mois=${mois}` +
    `${equipe === 'toutes' ? '' : `&equipe=${equipe}`}${ressource === null ? '' : `&ressource=${ressource}`}`
  );
}

/** Lignes visibles : la ressource choisie seule, sinon celles de l'équipe choisie. */
export function lignesVisibles(
  lignes: LigneGrille[],
  equipe: FiltreEquipe,
  ressource: number | null,
): LigneGrille[] {
  const deLEquipe = lignes.filter(
    (l) =>
      equipe === 'toutes' || (equipe === 'aucune' ? l.equipe_id === null : l.equipe_id === equipe),
  );
  return ressource === null ? deLEquipe : deLEquipe.filter((l) => l.id === ressource);
}

/** Ressource choisie, valable seulement si elle fait partie de l'équipe choisie ; sinon Toutes, corrigée. */
export function choixRessource(
  lignes: LigneGrille[],
  equipe: FiltreEquipe,
  ressource: number | null,
): { ressource: number | null; corrigee: boolean } {
  if (ressource === null) return { ressource: null, corrigee: false };
  const presente = lignesVisibles(lignes, equipe, null).some((l) => l.id === ressource);
  return presente ? { ressource, corrigee: false } : { ressource: null, corrigee: true };
}

export const moisPrecedent = (mois: string): string => decalerMois(mois, -1);
export const moisSuivant = (mois: string): string => decalerMois(mois, 1);
export { boutonsMois };

/** « 2027-01 » → « janvier 2027 ». */
export const nomMois = (mois: string): string =>
  `${NOMS_MOIS[Number(mois.slice(5, 7)) - 1]} ${mois.slice(0, 4)}`;

/** Premier et dernier jour du mois. */
export function bornesMois(mois: string): { du: string; au: string } {
  const du = `${mois}-01`;
  return { du, au: ajouterJours(`${decalerMois(mois, 1)}-01`, -1) };
}

/** En-têtes de colonnes : un jour par colonne, numéro et initiale du jour de la semaine. */
export function enteteJours(mois: string): { jour: string; numero: number; initiale: string }[] {
  const { du, au } = bornesMois(mois);
  const n = Number(au.slice(8, 10));
  return Array.from({ length: n }, (_, i) => {
    const jour = ajouterJours(du, i);
    return { jour, numero: i + 1, initiale: INITIALES[jourSemaine(jour)]! };
  });
}

export interface CaseJour {
  jour: string;
  nonOuvre: boolean;
  journee: Absence | null;
  matin: Absence | null;
  apresMidi: Absence | null;
}

/** Une case par jour du mois pour une ressource (absences de cette seule ressource). */
export function casesRessource(
  mois: string,
  absences: Absence[],
  joursNonOuvres: string[],
): CaseJour[] {
  const non = new Set(joursNonOuvres);
  return enteteJours(mois).map(({ jour }) => {
    const c: CaseJour = {
      jour,
      nonOuvre: non.has(jour),
      journee: null,
      matin: null,
      apresMidi: null,
    };
    for (const a of absences) {
      if (a.debut > jour || a.fin < jour) continue;
      if (a.portion === 'journee') c.journee ??= a;
      else if (a.portion === 'matin') c.matin ??= a;
      else c.apresMidi ??= a;
    }
    return c;
  });
}

const PORTION_MINUSCULE: Record<Absence['portion'], string> = {
  journee: 'journée',
  matin: 'matin',
  apres_midi: 'après-midi',
};

/** Titre et nom accessible d'une case d'absence : « <Nom>, JJ/MM/AAAA, <Motif>, <portion> ». */
export const libelleCase = (nom: string, absence: Absence, jour: string): string =>
  `${nom}, ${dateFr(jour)}, ${LIBELLE_MOTIF[absence.motif]}, ${PORTION_MINUSCULE[absence.portion]}`;
