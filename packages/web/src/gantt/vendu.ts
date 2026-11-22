import { VIDE, formaterNombre } from './libelles';

/** Charge vendue, totaux du projet et écart client (lot 6c, D-149 (7), (8)). */

const MOINS = '−';
const MAX_VENDU = 999999.99;

export type ChargeVendueSaisie = { ok: true; valeur: number | null } | { ok: false };

/** Texte du champ « Charge vendue (j) » : virgule ou point, vide = null ; au plus 2 décimales, 0 à 999999,99. */
export function analyserChargeVendue(texte: string): ChargeVendueSaisie {
  const t = texte.trim();
  if (t === '') return { ok: true, valeur: null };
  if (!/^\d+([.,]\d{1,2})?$/.test(t)) return { ok: false };
  const valeur = Number(t.replace(',', '.'));
  return valeur <= MAX_VENDU ? { ok: true, valeur } : { ok: false };
}

/** Nombre en jours à la virgule décimale, moins typographique si négatif ; « — » si null. */
export function formaterJours(n: number | null): string {
  if (n === null) return VIDE;
  return n < 0 ? `${MOINS}${formaterNombre(-n)}` : formaterNombre(n);
}

export interface TotauxProjet {
  charge_vendue: number | null;
  charge_assignee: number;
  marge: number | null;
  charge_reelle: number;
}

/** Texte de la région « Totaux du projet » (D-149 (8a)). */
export function texteTotaux(t: TotauxProjet): string {
  return [
    `Vendu ${formaterJours(t.charge_vendue)} j`,
    `Assigné ${formaterJours(t.charge_assignee)} j`,
    `Marge ${formaterJours(t.marge)} j`,
    `Réel ${formaterJours(t.charge_reelle)} j`,
  ].join(' · ');
}

export { formaterEcartClient } from './libelles';
