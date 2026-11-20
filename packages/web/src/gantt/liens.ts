import { DEMI_JALON, HAUTEUR_LIGNE, LARGEUR_POIGNEE } from './echelle';
import { datesLigne, type LigneGantt } from './GanttSvg';

export interface Point {
  x: number;
  y: number;
}

/** Rectangle d'une barre : abscisse de début, largeur, ordonnée du centre de la ligne. */
export interface Rect {
  x: number;
  largeur: number;
  y: number;
}

export type TypeLien = 'FD' | 'DD' | 'FF';

/** Écart minimal (px) entre une barre et le premier coude d'un lien. */
export const ECART_LIEN = 8;

/**
 * Lien à angles droits (D-066 7), liste de points du prédécesseur au successeur ; le dernier segment est
 * horizontal et porte la flèche. FD : fin → début, DD : début → début, FF : fin → fin.
 */
export function pointsLien(type: TypeLien, pred: Rect, succ: Rect): Point[] {
  const e = ECART_LIEN;
  const finPred = pred.x + pred.largeur;
  const finSucc = succ.x + succ.largeur;
  if (type === 'FD') {
    const depart = { x: finPred, y: pred.y };
    if (succ.x >= finPred + 2 * e) {
      return [
        depart,
        { x: finPred + e, y: pred.y },
        { x: finPred + e, y: succ.y },
        { x: succ.x, y: succ.y },
      ];
    }
    const milieu = (pred.y + succ.y) / 2;
    return [
      depart,
      { x: finPred + e, y: pred.y },
      { x: finPred + e, y: milieu },
      { x: succ.x - e, y: milieu },
      { x: succ.x - e, y: succ.y },
      { x: succ.x, y: succ.y },
    ];
  }
  if (type === 'DD') {
    const x = Math.min(pred.x, succ.x) - e;
    return [
      { x: pred.x, y: pred.y },
      { x, y: pred.y },
      { x, y: succ.y },
      { x: succ.x, y: succ.y },
    ];
  }
  const x = Math.max(finPred, finSucc) + e;
  return [
    { x: finPred, y: pred.y },
    { x, y: pred.y },
    { x, y: succ.y },
    { x: finSucc, y: succ.y },
  ];
}

/** Demi-côté (px) de la pointe de flèche. */
export const TAILLE_FLECHE = 4;

/** Pointe de flèche au dernier point d'un lien, orientée selon le dernier segment (horizontal). */
export function pointsFleche(points: Point[]): Point[] {
  const fin = points[points.length - 1]!;
  const avant = points[points.length - 2]!;
  const sens = fin.x >= avant.x ? 1 : -1;
  const t = TAILLE_FLECHE;
  return [fin, { x: fin.x - sens * t, y: fin.y - t }, { x: fin.x - sens * t, y: fin.y + t }];
}

/** Forme d'un élément portant un connecteur : barre (avec ou sans poignée droite) ou jalon (centre x). */
export type FormeConnecteur =
  | { genre: 'barre'; x: number; largeur: number; poigneeDroite: boolean }
  | { genre: 'jalon'; x: number };

/** Rayon (px) du cercle du connecteur (D-104 (2)). */
export const RAYON_CONNECTEUR = 4;

/**
 * Centre du connecteur (D-104 (2)) : 8 px à droite du bord droit de la barre, ou de sa poignée droite,
 * ou de la pointe du jalon ; verticalement au centre de la ligne `index`.
 */
export function centreConnecteur(
  forme: FormeConnecteur,
  index: number,
): { cx: number; cy: number } {
  const cy = index * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;
  if (forme.genre === 'jalon') return { cx: forme.x + DEMI_JALON + ECART_LIEN, cy };
  const poignee = forme.poigneeDroite ? LARGEUR_POIGNEE : 0;
  return { cx: forme.x + forme.largeur + poignee + ECART_LIEN, cy };
}

/**
 * Cible du lâcher (D-104 (3)) : identifiant de l'élément de la ligne sous l'ordonnée `y` (relative au
 * haut de la première ligne), si c'est une barre parcourable autre que la source, sinon null.
 */
export function cibleLien(y: number, lignes: LigneGantt[], sourceId: number): number | null {
  if (y < 0) return null;
  const ligne = lignes[Math.floor(y / HAUTEUR_LIGNE)];
  if (ligne?.genre !== 'element' || datesLigne(ligne) === null) return null;
  return ligne.element.id === sourceId ? null : ligne.element.id;
}
