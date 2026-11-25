import { formaterNombre } from './gantt/libelles';
import { formaterJours } from './gantt/vendu';

/** Table mode → champs d'activité affichés (D-220, SPEC §6 « Charge lisible » 1). */
export interface ChampsDuMode {
  debut: boolean;
  fin: boolean;
  duree: boolean;
  /** Aide sous la durée : elle ne sert alors qu'à la barre d'une activité sans ressource. */
  aideDuree: boolean;
}

const AUCUN: ChampsDuMode = { debut: false, fin: false, duree: false, aideDuree: false };

const TABLE: Record<string, ChampsDuMode> = {
  ASAP: { debut: false, fin: false, duree: true, aideDuree: true },
  START: { debut: true, fin: false, duree: true, aideDuree: true },
  STARR: { debut: true, fin: false, duree: true, aideDuree: true },
  ALAP: { debut: false, fin: true, duree: true, aideDuree: true },
  FDUR: { debut: true, fin: false, duree: true, aideDuree: false },
  DDUR: { debut: true, fin: false, duree: true, aideDuree: false },
  REGUL: { debut: true, fin: true, duree: false, aideDuree: false },
  MAN: AUCUN,
};

/** Champs affichés pour un mode ; un mode inconnu n'en affiche aucun. */
export const champsDuMode = (mode: string): ChampsDuMode => TABLE[mode] ?? AUCUN;

/** Aide sous « Durée validée » : effet de la durée sur le planning selon le mode (SPEC §6 « Charge lisible » 5). */
export function aideDureeDuMode(mode: string): string | null {
  if (mode === 'FDUR' || mode === 'DDUR') return 'Effet sur le planning : oui (jours ouvrés).';
  if (['ASAP', 'START', 'STARR', 'ALAP'].includes(mode))
    return 'Effet sur le planning : seulement sans ressource assignée (longueur de la barre, jours ouvrés).';
  return null;
}

/** « Charge assignée » en lecture seule : « X j », virgule décimale. */
export const texteChargeAssignee = (n: number): string => `${formaterNombre(n)} j`;

/** « Marge » en lecture seule : « — » si vide, moins typographique et indicateur si négative. */
export function texteMarge(n: number | null): { texte: string; negative: boolean } {
  return n === null
    ? { texte: '—', negative: false }
    : { texte: `${formaterJours(n)} j`, negative: n < 0 };
}
