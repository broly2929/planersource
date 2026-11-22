/** Format commun des exports CSV (lot 6f, D-160 (2), D-161 (2)). Fonctions pures. */

const BOM = '﻿';

/** Nombre à 2 décimales au plus, virgule décimale, zéros non significatifs retirés. */
export function formaterNombre(n: number): string {
  const arrondi = Math.round(n * 100) / 100;
  return String(arrondi === 0 ? 0 : arrondi).replace('.', ',');
}

/** AAAA-MM-JJ → JJ/MM/AAAA. */
export function formaterDate(jour: string): string {
  const [a, m, j] = jour.split('-');
  return `${j}/${m}/${a}`;
}

/** AAAA-MM → MM/AAAA. */
export function formaterMois(mois: string): string {
  const [a, m] = mois.split('-');
  return `${m}/${a}`;
}

/**
 * Champ texte : préfixe d'une apostrophe si le premier caractère est =, +, -, @, tabulation ou CR
 * (injection de formules), puis guillemets si le champ contient « ; », un guillemet, CR ou LF.
 */
export function champTexte(texte: string): string {
  const protege = /^[=+\-@\t\r]/.test(texte) ? `'${texte}` : texte;
  return /[;"\r\n]/.test(protege) ? `"${protege.replace(/"/g, '""')}"` : protege;
}

export type Champ = string | number | null;

const champ = (v: Champ): string =>
  v === null ? '' : typeof v === 'number' ? formaterNombre(v) : champTexte(v);

/** BOM, ligne d'en-tête, puis les lignes ; chaque ligne finit par CRLF. */
export function produireCsv(entetes: string[], lignes: Champ[][]): string {
  const toutes = [entetes, ...lignes];
  return BOM + toutes.map((l) => `${l.map(champ).join(';')}\r\n`).join('');
}
