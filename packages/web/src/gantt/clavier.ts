import { datesLigne, type LigneGantt } from './GanttSvg';
import { infoClient, nomBarre, nomJalon } from './libelles';

/**
 * Identifiants des éléments (activités feuilles ou parentes, jalons) ayant des dates planifiées,
 * dans l'ordre des lignes ; les sous-projets et les lignes sans dates sont sautés (D-098 (2)).
 */
export function barresParcourables(lignes: LigneGantt[]): number[] {
  const ids: number[] = [];
  for (const l of lignes) {
    if (l.genre === 'element' && datesLigne(l) !== null) ids.push(l.element.id);
  }
  return ids;
}

/**
 * Barre voisine : ↓ ('bas') suivante, ↑ ('haut') précédente, sans bouclage. Sans barre active (ou
 * active absente de la liste), ↓ prend la première et ↑ la dernière. Liste vide : null.
 */
export function barreSuivante(
  parcourables: number[],
  active: number | null,
  touche: 'haut' | 'bas',
): number | null {
  if (parcourables.length === 0) return null;
  const i = active === null ? -1 : parcourables.indexOf(active);
  if (i === -1) return touche === 'bas' ? parcourables[0]! : parcourables[parcourables.length - 1]!;
  const j = Math.min(Math.max(i + (touche === 'bas' ? 1 : -1), 0), parcourables.length - 1);
  return parcourables[j]!;
}

/** Nom accessible de la barre d'une ligne (identique à l'aria-label de la barre), null sans dates. */
export function nomAccessible(l: LigneGantt, client = false): string | null {
  const dates = datesLigne(l);
  if (!dates || l.genre !== 'element') return null;
  const e = l.element;
  return e.type === 'jalon'
    ? nomJalon(e.nom, dates.debut, e.drapeaux, client ? infoClient(e) : undefined)
    : nomBarre(e.nom, dates.debut, dates.fin, e.drapeaux);
}
