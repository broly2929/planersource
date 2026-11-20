import type { ElementGantt } from './GanttSvg';

/** Entrées du menu contextuel d'une ligne (D-111 (3)). */
export type EntreeMenu = 'activite' | 'jalon' | 'sous-activite';

/** Entrées proposées selon le type de la ligne, dans l'ordre d'affichage. */
export function entreesMenu(type: 'activite' | 'jalon'): EntreeMenu[] {
  return type === 'activite' ? ['activite', 'jalon', 'sous-activite'] : ['activite', 'jalon'];
}

const LIBELLES: Record<EntreeMenu, string> = {
  activite: 'Nouvelle activité',
  jalon: 'Nouveau jalon',
  'sous-activite': 'Nouvelle sous-activité',
};
export const libelleEntree = (entree: EntreeMenu): string => LIBELLES[entree];

/**
 * Corps de la création (sans le nom, ajouté par le dialogue) : frère juste après la ligne pour
 * « activité » et « jalon » ; dernier enfant (sans rang) pour « sous-activité », activité seulement.
 */
export function corpsCreation(
  elements: ElementGantt[],
  ligneId: number,
  entree: EntreeMenu,
): { parent_id: number | null; rang?: number } | null {
  const ligne = elements.find((e) => e.id === ligneId);
  if (!ligne) return null;
  if (entree === 'sous-activite') {
    return ligne.type === 'activite' ? { parent_id: ligne.id } : null;
  }
  return { parent_id: ligne.parent_id, rang: ligne.rang + 1 };
}
