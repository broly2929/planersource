import { useCallback, useState } from 'react';
import { empiler as empilerPile, sansContours, vider, type Inverse } from '../../gantt/annulation';

export interface PileAnnulation {
  entrees: Inverse[];
  empiler: (inverse: Inverse) => void;
  remplacer: (entrees: Inverse[]) => void;
  vider: () => void;
  /** Vrai si la pile est vide parce qu'un calcul l'a vidée (D-129 (2), D-131). */
  videParCalcul: boolean;
  /** Calcul demandé par l'utilisateur : la pile est vidée. */
  viderParCalcul: () => void;
  /** Recalcul automatique d'un geste : la pile reste, ses contours mémorisés sont périmés. */
  neutraliserContours: () => void;
}

/**
 * Pile d'annulation des gestes (D-127 (3)) : tenue par la fiche du projet pour survivre au changement
 * d'onglet, perdue au rechargement ou quand la fiche change de projet.
 */
export function usePileAnnulation(projetId: number): PileAnnulation {
  const [etat, setEtat] = useState<{
    projetId: number;
    entrees: Inverse[];
    videParCalcul: boolean;
  }>({
    projetId,
    entrees: [],
    videParCalcul: false,
  });
  const empiler = useCallback(
    (inverse: Inverse) =>
      setEtat((e) => ({
        projetId,
        entrees: empilerPile(e.projetId === projetId ? e.entrees : [], inverse),
        videParCalcul: false,
      })),
    [projetId],
  );
  const remplacer = useCallback(
    (entrees: Inverse[]) => setEtat({ projetId, entrees, videParCalcul: false }),
    [projetId],
  );
  const effacer = useCallback(
    () => setEtat({ projetId, entrees: vider(), videParCalcul: false }),
    [projetId],
  );
  const viderParCalcul = useCallback(
    () => setEtat({ projetId, entrees: vider(), videParCalcul: true }),
    [projetId],
  );
  const neutraliserContours = useCallback(
    () =>
      setEtat((e) => (e.projetId === projetId ? { ...e, entrees: sansContours(e.entrees) } : e)),
    [projetId],
  );
  return {
    entrees: etat.projetId === projetId ? etat.entrees : [],
    empiler,
    remplacer,
    vider: effacer,
    videParCalcul: etat.projetId === projetId && etat.videParCalcul,
    viderParCalcul,
    neutraliserContours,
  };
}
