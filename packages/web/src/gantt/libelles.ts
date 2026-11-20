import { libelleMode } from '../modes';

/** Libellés français du Gantt (D-066 6) et formatages d'affichage ; les modes : `modes.ts` (D-123 (5)). */

const DRAPEAUX: Record<string, string> = {
  retard: 'Retard',
  debut_non_respecte: 'Début non respecté',
  surcharge: 'Surcharge',
  dependance_non_respectee: 'Dépendance non respectée',
};

export { libelleMode };
export const libelleDrapeau = (code: string): string => DRAPEAUX[code] ?? code;

/** Initiales d'une feuille : « AB, CD » ; vide sans initiales. */
export const libelleInitiales = (initiales: string[]): string => initiales.join(', ');

export const VIDE = '—';

/** AAAA-MM-JJ → JJ/MM/AAAA ; « — » si absent. */
export function formaterDate(date: string | null): string {
  if (!date) return VIDE;
  const [a, m, j] = date.split('-');
  return `${j}/${m}/${a}`;
}

/** Nombre à virgule décimale (3 → « 3 », 2.5 → « 2,5 »). */
export function formaterNombre(n: number | null): string {
  return n === null ? VIDE : String(n).replace('.', ',');
}

/** Avancement en pourcentage : « 0 % », « 12,5 % » ; « — » si vide. */
export function formaterAvancement(n: number | null): string {
  return n === null ? VIDE : `${formaterNombre(n)} %`;
}

/** Nom accessible d'une barre (D-066 12) : « A, du 04/01/2027 au 06/01/2027, retard ». */
export function nomBarre(nom: string, debut: string, fin: string, drapeaux: string[]): string {
  return [`${nom}, du ${formaterDate(debut)} au ${formaterDate(fin)}`]
    .concat(drapeaux.map((d) => libelleDrapeau(d).toLowerCase()))
    .join(', ');
}

/** Nom accessible d'un jalon (D-066 12, D-068) : « Jalon, le 06/01/2027 », puis « , retard » si en retard. */
export function nomJalon(nom: string, date: string, drapeaux: string[]): string {
  return [`${nom}, le ${formaterDate(date)}`]
    .concat(drapeaux.map((d) => libelleDrapeau(d).toLowerCase()))
    .join(', ');
}
