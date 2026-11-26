// Logique pure de l'écran Plan de charge (lot 6d, D-154, D-155). Aucune dépendance au DOM.
import { formaterNombre } from '../gantt/libelles';
import { formaterJours } from '../gantt/vendu';

export type FiltreEquipe = 'toutes' | 'aucune' | number;

const DEBUT = /^(\d{4})-(0[1-9]|1[0-2])$/;
const ANNEE_MIN = 2000;
const ANNEE_MAX = 2099;

const debutValide = (texte: string | null): texte is string => {
  const m = texte === null ? null : DEBUT.exec(texte);
  return m !== null && Number(m[1]) >= ANNEE_MIN && Number(m[1]) <= ANNEE_MAX;
};

/** Filtres de l'adresse (D-154 (8)) : valeur invalide ramenée au défaut, `corrige` vrai. */
export function parametresPlan(
  search: URLSearchParams,
  moisCourant: string,
): { debut: string; equipe: FiltreEquipe; corrige: boolean } {
  const debutParam = search.get('debut');
  const equipeParam = search.get('equipe');
  let corrige = false;
  let debut = moisCourant;
  if (debutValide(debutParam)) debut = debutParam;
  else corrige = true;
  let equipe: FiltreEquipe = 'toutes';
  if (equipeParam !== null) {
    if (equipeParam === 'aucune') equipe = 'aucune';
    else if (/^\d{1,15}$/.test(equipeParam)) equipe = Number(equipeParam);
    else corrige = true;
  }
  return { debut, equipe, corrige };
}

export type OngletPilotage = 'charge' | 'couts';

/** Adresse canonique de l'écran Pilotage (D-245) : onglet, mois de départ, équipe si filtrée. */
export function adressePlan(
  debut: string,
  equipe: FiltreEquipe,
  onglet: OngletPilotage = 'charge',
): string {
  const base = `/pilotage?onglet=${onglet}&debut=${debut}`;
  return equipe === 'toutes' ? base : `${base}&equipe=${equipe}`;
}

/** Mois décalé de `n` mois (AAAA-MM). */
export function decalerMois(debut: string, n: number): string {
  const total = Number(debut.slice(0, 4)) * 12 + (Number(debut.slice(5, 7)) - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** AAAA-MM-JJ → AAAA-MM. */
export const moisDe = (jour: string): string => jour.slice(0, 7);

/** AAAA-MM → MM/AAAA. */
export const enteteMois = (mois: string): string => `${mois.slice(5, 7)}/${mois.slice(0, 4)}`;

/** Boutons « Mois précédent » et « Mois suivant » permis (bornes 2000-01 et 2099-12, D-155 (3)). */
export function boutonsMois(debut: string): { precedent: boolean; suivant: boolean } {
  return { precedent: debut > `${ANNEE_MIN}-01`, suivant: debut < `${ANNEE_MAX}-12` };
}

export function libelleProjet(p: { code: string | null; nom: string | null }): string {
  return p.code === null ? 'Autres projets' : `${p.code} · ${p.nom ?? ''}`;
}

export const libelleRessource = (nom: string, actif: boolean): string =>
  actif ? nom : `${nom} (inactif)`;

/** Texte, title et indicateur de surcharge d'une cellule de ressource (D-154 (9)). */
export function cellulePlan(m: { charge: number; disponible: number; ecart: number }): {
  texte: string;
  titre: string;
  surcharge: boolean;
} {
  return {
    texte: formaterNombre(m.charge),
    titre: `Charge ${formaterJours(m.charge)} j, disponible ${formaterJours(m.disponible)} j, écart ${formaterJours(m.ecart)} j`,
    surcharge: m.ecart < 0,
  };
}
