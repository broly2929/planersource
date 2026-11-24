/** Géométrie pure du Gantt (lot 3b, D-066) : dates AAAA-MM-JJ, jours calendaires UTC (jamais d'heure locale). */

export type Zoom = 'jour' | 'semaine' | 'mois';

/** Pixels par jour, définis une seule fois (D-066 3). */
export const PX_PAR_JOUR: Record<Zoom, number> = { jour: 24, semaine: 8, mois: 4 };

/** Hauteur d'une ligne du tableau et du SVG, en pixels (pas de 4 px). */
export const HAUTEUR_LIGNE = 32;

/** Hauteurs (px) d'une barre d'activité et d'une barre fine (parent, sous-projet), et demi-côté d'un jalon. */
export const HAUTEUR_BARRE = 16;
export const HAUTEUR_BARRE_FINE = 8;
export const DEMI_JALON = 8;

export const ZOOM_DEFAUT: Zoom = 'semaine';

const MS_PAR_JOUR = 86_400_000;

/** Zoom lu dans l'adresse ; absent ou inconnu : semaine. */
export function lireZoom(valeur: string | null): Zoom {
  return valeur === 'jour' || valeur === 'semaine' || valeur === 'mois' ? valeur : ZOOM_DEFAUT;
}

/** Écart (px) entre la fin d'une barre et le texte de ses initiales (D-089). */
export const ECART_INITIALES = 6;

/** Affichage des initiales lu dans l'adresse : vrai seulement pour `initiales=1` (D-088 (2)). */
export function lireInitiales(valeur: string | null): boolean {
  return valeur === '1';
}

/** Accueil (D-218 (4)) : initiales affichées sauf `initiales=0`. */
export function lireInitialesAccueil(valeur: string | null): boolean {
  return valeur !== '0';
}

/** Jour calendaire (nombre de jours depuis 1970-01-01, UTC) d'une date AAAA-MM-JJ. */
export function numeroJour(date: string): number {
  const [a, m, j] = date.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(a, m - 1, j) / MS_PAR_JOUR);
}

/** Date AAAA-MM-JJ d'un numéro de jour. */
export function dateDuJour(numero: number): string {
  return new Date(numero * MS_PAR_JOUR).toISOString().slice(0, 10);
}

export function ajouterJours(date: string, n: number): string {
  return dateDuJour(numeroJour(date) + n);
}

/** Nombre de jours de `a` à `b` (négatif si `b` précède `a`). */
export function joursEntre(a: string, b: string): number {
  return numeroJour(b) - numeroJour(a);
}

/** Jour de la semaine, 0 = lundi … 6 = dimanche. */
export function jourSemaine(date: string): number {
  return (((numeroJour(date) + 3) % 7) + 7) % 7;
}

export function lundiDeLaSemaine(date: string): string {
  return ajouterJours(date, -jourSemaine(date));
}

export function dimancheDeLaSemaine(date: string): string {
  return ajouterJours(date, 6 - jourSemaine(date));
}

/** Abscisse (px) du début du jour `jour` par rapport à `origine`. */
export function positionJour(origine: string, jour: string, zoom: Zoom): number {
  return joursEntre(origine, jour) * PX_PAR_JOUR[zoom];
}

/** Largeur (px) d'une barre de `debut` à `fin`, fin incluse. */
export function largeurBarre(debut: string, fin: string, zoom: Zoom): number {
  return (joursEntre(debut, fin) + 1) * PX_PAR_JOUR[zoom];
}

/** Abscisse (px) du texte des initiales : fin de la barre + écart ; null sans barre. */
export function positionInitiales(
  origine: string,
  debut: string | null,
  fin: string | null,
  zoom: Zoom,
): number | null {
  if (!debut || !fin) return null;
  return positionJour(origine, debut, zoom) + largeurBarre(debut, fin, zoom) + ECART_INITIALES;
}

/** Largeur (px) de la part réalisée d'une barre ; avancement en pourcentage, null = 0. */
export function partAvancement(largeur: number, avancement: number | null): number {
  if (avancement === null) return 0;
  return (largeur * Math.min(100, Math.max(0, avancement))) / 100;
}

/** Date locale AAAA-MM-JJ d'un instant (jour du navigateur, pas UTC). */
export function dateLocale(instant: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${instant.getFullYear()}-${deux(instant.getMonth() + 1)}-${deux(instant.getDate())}`;
}

/** Distance (px) depuis l'appui à partir de laquelle un geste est un glisser, en dessous un clic (D-094 (7)). */
export const SEUIL_GLISSER = 4;

/** Largeur (px) de la zone de saisie d'une poignée, hors de la barre (D-094 (7)). */
export const LARGEUR_POIGNEE = 6;

/** Décalage en jours d'un glissement horizontal de `dx` px ; entier, zéro positif (D-094 (7)). */
export function decalageJours(dx: number, zoom: Zoom): number {
  return Math.round(dx / PX_PAR_JOUR[zoom]) || 0;
}

/** Vrai si le pointeur, déplacé de (dx, dy) depuis l'appui, a atteint le seuil d'un glisser. */
export function estGlisser(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= SEUIL_GLISSER;
}
