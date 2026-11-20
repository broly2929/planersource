import { useEffect, useRef, useState, type PointerEvent as EvenementPointeur } from 'react';
import {
  cibleAutorisee,
  destinationDeplacement,
  zoneLacher,
  type Destination,
  type Zone,
} from './arborescence';
import { estGlisser } from './echelle';
import type { ElementGantt } from './GanttSvg';
import { verrou } from './verrou';

export interface GlisseLigne {
  id: number;
  x0: number;
  y0: number;
  actif: boolean;
  cible: { id: number; zone: Zone } | null;
}

/**
 * Glisser une ligne du tableau (D-108 (5) à (8)) : événements pointeur sur la poignée, seuil de 4 px,
 * Échap annule, verrou commun avec les gestes du SVG. `surDepose` est appelé avec le corps du déplacement ;
 * le verrou est gardé jusqu'à la fin de sa promesse.
 */
export function useGlisserLigne(
  elements: ElementGantt[],
  surDepose: (id: number, destination: Destination) => Promise<void>,
) {
  const [etat, setEtat] = useState<GlisseLigne | null>(null);
  const ref = useRef<GlisseLigne | null>(null);
  const courant = useRef({ elements, surDepose });
  courant.current = { elements, surDepose };
  const maj = (g: GlisseLigne | null) => {
    ref.current = g;
    setEtat(g);
  };
  const terminer = () => {
    if (!ref.current) return;
    maj(null);
    verrou.rendre();
  };

  const enGlisse = etat !== null;
  useEffect(() => {
    if (!enGlisse) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      terminer();
    };
    window.addEventListener('keydown', surTouche, true);
    return () => window.removeEventListener('keydown', surTouche, true);
  }, [enGlisse]);
  useEffect(
    () => () => {
      if (ref.current) verrou.rendre();
    },
    [],
  );

  /** Ligne d'élément sous le pointeur et zone de lâcher ; null hors du tableau ou sur une cible interdite. */
  const cibleSous = (id: number, x: number, y: number) => {
    const ligne = document.elementFromPoint(x, y)?.closest<HTMLElement>('tr[data-ligne-element]');
    if (!ligne) return null;
    const cibleId = Number(ligne.dataset.ligneElement);
    const { elements: liste } = courant.current;
    const cible = liste.find((e) => e.id === cibleId);
    if (!cible || !cibleAutorisee(liste, id, cibleId)) return null;
    const r = ligne.getBoundingClientRect();
    return { id: cibleId, zone: zoneLacher(cible.type, y - r.top, r.height) };
  };

  const evenements = (id: number) => ({
    onPointerDown: (e: EvenementPointeur<HTMLElement>) => {
      if (e.button !== 0 || !e.isPrimary || !verrou.prendre()) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      maj({ id, x0: e.clientX, y0: e.clientY, actif: false, cible: null });
    },
    onPointerMove: (e: EvenementPointeur<HTMLElement>) => {
      const g = ref.current;
      if (!g || g.id !== id || !e.isPrimary) return;
      const actif = g.actif || estGlisser(e.clientX - g.x0, e.clientY - g.y0);
      maj({ ...g, actif, cible: actif ? cibleSous(id, e.clientX, e.clientY) : null });
    },
    onPointerUp: (e: EvenementPointeur<HTMLElement>) => {
      const g = ref.current;
      if (!g || g.id !== id || !e.isPrimary) return;
      maj(null);
      const cible = estGlisser(e.clientX - g.x0, e.clientY - g.y0)
        ? cibleSous(id, e.clientX, e.clientY)
        : null;
      const destination = cible
        ? destinationDeplacement(courant.current.elements, id, cible.id, cible.zone)
        : null;
      if (!destination) {
        verrou.rendre();
        return;
      }
      void courant.current.surDepose(id, destination).finally(() => verrou.rendre());
    },
    onPointerCancel: (e: EvenementPointeur<HTMLElement>) => {
      if (ref.current?.id === id && e.isPrimary) terminer();
    },
  });

  return { etat, evenements };
}
