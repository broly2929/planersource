import { useCallback, useState } from 'react';

/** Début et fin (AAAA-MM-JJ) de la position relâchée d'une barre. */
export interface DatesContour {
  debut: string;
  fin: string;
}

export interface Contours {
  /** Contour par identifiant d'élément ; le bandeau « Planning à recalculer » dure autant que lui. */
  parElement: Record<number, DatesContour>;
  /** Planning à recalculer sans contour (modification par le dialogue, D-098 (3)). */
  signale: boolean;
  poser: (id: number, dates: DatesContour) => void;
  /** Remet le contour d'un élément dans l'état donné (null : retiré), D-129 (2). */
  remettre: (id: number, dates: DatesContour | null) => void;
  signaler: () => void;
  effacer: () => void;
}

/**
 * État des contours des gestes (D-095 (1)) : tenu par la fiche du projet pour survivre au changement
 * d'onglet, perdu au rechargement ou quand la fiche change de projet.
 */
export function useContours(projetId: number): Contours {
  const [etat, setEtat] = useState<{
    projetId: number;
    parElement: Record<number, DatesContour>;
    signale: boolean;
  }>({ projetId, parElement: {}, signale: false });
  const poser = useCallback(
    (id: number, dates: DatesContour) =>
      setEtat((e) => ({
        projetId,
        parElement: { ...(e.projetId === projetId ? e.parElement : {}), [id]: dates },
        signale: e.projetId === projetId && e.signale,
      })),
    [projetId],
  );
  const remettre = useCallback(
    (id: number, dates: DatesContour | null) =>
      setEtat((e) => {
        const base = e.projetId === projetId ? e.parElement : {};
        const parElement = { ...base };
        if (dates) parElement[id] = dates;
        else delete parElement[id];
        return { projetId, parElement, signale: e.projetId === projetId && e.signale };
      }),
    [projetId],
  );
  const signaler = useCallback(
    () =>
      setEtat((e) => ({
        projetId,
        parElement: e.projetId === projetId ? e.parElement : {},
        signale: true,
      })),
    [projetId],
  );
  const effacer = useCallback(
    () => setEtat({ projetId, parElement: {}, signale: false }),
    [projetId],
  );
  const courant = etat.projetId === projetId;
  return {
    parElement: courant ? etat.parElement : {},
    signale: courant && etat.signale,
    poser,
    remettre,
    signaler,
    effacer,
  };
}
