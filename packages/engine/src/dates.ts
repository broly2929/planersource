import type { Jour } from './types.js';

/** Jours depuis 1970-01-01 (calendrier grégorien proleptique), en entiers. */
export function joursDepuis(jour: Jour): number {
  const an = Number(jour.slice(0, 4));
  const m = Number(jour.slice(5, 7));
  const d = Number(jour.slice(8, 10));
  const y = m <= 2 ? an - 1 : an;
  const ere = Math.floor(y / 400);
  const yoe = y - ere * 400;
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return ere * 146097 + doe - 719468;
}

const deuxChiffres = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function versJour(n: number): Jour {
  const z = n + 719468;
  const ere = Math.floor(z / 146097);
  const doe = z - ere * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const an = yoe + ere * 400 + (m <= 2 ? 1 : 0);
  return `${an}-${deuxChiffres(m)}-${deuxChiffres(d)}`;
}

/** Jour ISO de la semaine : 1 = lundi … 7 = dimanche. */
export function jourSemaine(n: number): number {
  return ((((n + 3) % 7) + 7) % 7) + 1;
}
