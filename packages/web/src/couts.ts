/** Taux journalier et OTP côté web (D-225, SPEC §12.1, §12.2). */

export interface PeriodeTaux {
  debut: string;
  fin: string | null;
  montant: number;
}

export interface Taux extends PeriodeTaux {
  id: number;
  utilisateur_id: number;
}

/** Taux en vigueur à `date` (AAAA-MM-JJ) : début ≤ date ≤ fin, ou fin vide ; null hors de toute période. */
export function tauxEnVigueur(periodes: PeriodeTaux[], date: string): number | null {
  return (
    periodes.find((p) => p.debut <= date && (p.fin === null || date <= p.fin))?.montant ?? null
  );
}

const NBSP = ' ';

/** « 1 234,50 € » : deux décimales, virgule, espace insécable pour les milliers et avant « € ». */
export function formatMontant(n: number): string {
  const [entier, decimales] = n.toFixed(2).split('.') as [string, string];
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${groupes},${decimales}${NBSP}€`;
}

const MAX_MONTANT = 999999.99;

/** Texte du champ « Montant » : virgule ou point, > 0, au plus 999999,99, 2 décimales ; null si invalide. */
export function analyserMontant(texte: string): number | null {
  const t = texte.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(t)) return null;
  const valeur = Number(t.replace(',', '.'));
  return valeur > 0 && valeur <= MAX_MONTANT ? valeur : null;
}

export interface OtpLecture {
  otp: string | null;
  otp_effectif: string | null;
  otp_source: { type: 'projet' | 'activite'; id: number | null; libelle: string | null } | null;
}

/** Aide du champ « OTP » : valeur héritée et sa source ; null si valeur propre ou aucune valeur. */
export function aideOtp(o: OtpLecture): string | null {
  if (o.otp !== null || o.otp_effectif === null || o.otp_source === null) return null;
  return o.otp_source.libelle === null
    ? `Hérité d'un projet parent : ${o.otp_effectif}`
    : `Hérité de ${o.otp_source.libelle} : ${o.otp_effectif}`;
}

/** Date du jour du navigateur, AAAA-MM-JJ (heure locale). */
export function aujourdhui(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Héritage d'un enfant sans valeur propre, sous `parent` (projet : libellé = code ; activité : « <WBS> <nom> »). */
export function heriteDe(
  parent: OtpLecture & { id: number },
  type: 'projet' | 'activite',
  libelle: string,
): OtpLecture {
  return parent.otp !== null
    ? { otp: null, otp_effectif: parent.otp, otp_source: { type, id: parent.id, libelle } }
    : { otp: null, otp_effectif: parent.otp_effectif, otp_source: parent.otp_source };
}

/** Valeur envoyée pour le champ « OTP » : espaces de bord retirés, vide = null. */
export const otpSaisi = (texte: string): string | null =>
  texte.trim() === '' ? null : texte.trim();
