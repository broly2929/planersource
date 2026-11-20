import {
  PX_PAR_JOUR,
  ajouterJours,
  dateDuJour,
  jourSemaine,
  joursEntre,
  numeroJour,
  type Zoom,
} from './echelle.js';

export interface CelluleEntete {
  libelle: string;
  x: number;
  largeur: number;
}

const MOIS = [
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
const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Numéro de semaine ISO 8601. */
function semaineIso(date: string): number {
  const jeudi = numeroJour(date) - jourSemaine(date) + 3;
  const annee = new Date(jeudi * 86_400_000).getUTCFullYear();
  const premierJeudi = numeroJour(`${annee}-01-04`) - jourSemaine(`${annee}-01-04`) + 3;
  return Math.floor((jeudi - premierJeudi) / 7) + 1;
}

const decouper = (date: string) => {
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  return { annee: a, mois: m, jour: j };
};

/** Découpe la plage en groupes de jours consécutifs de même clé, en cellules. */
function grouper(
  plage: { debut: string; fin: string },
  zoom: Zoom,
  cle: (date: string) => string,
  libelle: (date: string) => string,
): CelluleEntete[] {
  const px = PX_PAR_JOUR[zoom];
  const total = joursEntre(plage.debut, plage.fin) + 1;
  const cellules: CelluleEntete[] = [];
  let debutGroupe = 0;
  for (let i = 1; i <= total; i++) {
    const fini =
      i === total ||
      cle(ajouterJours(plage.debut, i)) !== cle(ajouterJours(plage.debut, debutGroupe));
    if (fini) {
      cellules.push({
        libelle: libelle(ajouterJours(plage.debut, debutGroupe)),
        x: debutGroupe * px,
        largeur: (i - debutGroupe) * px,
      });
      debutGroupe = i;
    }
  }
  return cellules;
}

/** En-têtes haut et bas de l'échelle de temps (D-066 3). */
export function entetes(
  plage: { debut: string; fin: string },
  zoom: Zoom,
): { haut: CelluleEntete[]; bas: CelluleEntete[] } {
  const moisDe = (d: string) => d.slice(0, 7);
  const libelleMois = (d: string) => `${MOIS[decouper(d).mois - 1]} ${decouper(d).annee}`;
  if (zoom === 'mois') {
    return {
      haut: grouper(
        plage,
        zoom,
        (d) => d.slice(0, 4),
        (d) => String(decouper(d).annee),
      ),
      bas: grouper(plage, zoom, moisDe, (d) => MOIS_COURTS[decouper(d).mois - 1]!),
    };
  }
  const haut = grouper(plage, zoom, moisDe, libelleMois);
  if (zoom === 'jour') {
    return {
      haut,
      bas: grouper(
        plage,
        zoom,
        (d) => d,
        (d) => String(decouper(d).jour),
      ),
    };
  }
  return {
    haut,
    bas: grouper(
      plage,
      zoom,
      (d) => dateDuJour(numeroJour(d) - jourSemaine(d)),
      (d) => `S${String(semaineIso(d)).padStart(2, '0')}`,
    ),
  };
}
