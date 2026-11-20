/** Glisser une ligne du tableau du Gantt (3f-1, D-108) : zone de lâcher et destination du déplacement. */
import { HAUTEUR_LIGNE } from './echelle';
import type { ElementGantt } from './GanttSvg';

export type Zone = 'avant' | 'dans' | 'apres';

/** Zone de lâcher selon `y` (0 en haut de la ligne cible) : tiers pour une activité, moitiés pour un jalon. */
export function zoneLacher(
  type: 'activite' | 'jalon',
  y: number,
  hauteur: number = HAUTEUR_LIGNE,
): Zone {
  if (type === 'jalon') return y < hauteur / 2 ? 'avant' : 'apres';
  if (y < hauteur / 3) return 'avant';
  return y < (2 * hauteur) / 3 ? 'dans' : 'apres';
}

/** Cible structurellement permise : un élément autre que la source et que ses descendants. */
export function cibleAutorisee(
  elements: ElementGantt[],
  sourceId: number,
  cibleId: number | null,
): boolean {
  const parId = new Map(elements.map((e) => [e.id, e]));
  const cible = cibleId === null ? undefined : parId.get(cibleId);
  if (!parId.has(sourceId) || !cible || cible.id === sourceId) return false;
  for (let a = cible.parent_id; a !== null; a = parId.get(a)?.parent_id ?? null) {
    if (a === sourceId) return false;
  }
  return true;
}

export interface Destination {
  parent_id: number | null;
  rang?: number;
}

/**
 * Corps du déplacement (D-041, D-108 (6) à (8)), ou null si la cible est interdite : source, descendant,
 * ligne sans élément, jalon avec « dans », ou position identique à l'actuelle.
 */
export function destinationDeplacement(
  elements: ElementGantt[],
  sourceId: number,
  cibleId: number | null,
  zone: Zone,
): Destination | null {
  if (!cibleAutorisee(elements, sourceId, cibleId)) return null;
  const source = elements.find((e) => e.id === sourceId)!;
  const cible = elements.find((e) => e.id === cibleId)!;
  if (zone === 'dans') {
    if (cible.type === 'jalon') return null;
    const enfants = elements.filter((e) => e.parent_id === cible.id);
    const dernier = enfants.reduce((m, e) => Math.max(m, e.rang), 0);
    if (source.parent_id === cible.id && source.rang === dernier) return null;
    return { parent_id: cible.id };
  }
  const memeFratrie = source.parent_id === cible.parent_id;
  const base = zone === 'avant' ? cible.rang : cible.rang + 1;
  const rang = memeFratrie && source.rang < cible.rang ? base - 1 : base;
  if (memeFratrie && rang === source.rang) return null;
  return { parent_id: cible.parent_id, rang };
}
