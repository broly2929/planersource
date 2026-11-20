/**
 * Case de la grille du Planning manuel inactive (D-123 (8), D-124 (1)) : lecture seule, ou jour non ouvré
 * non coché. Une case non ouvrée cochée reste activable pour pouvoir être décochée.
 */
export const caseDesactivee = ({
  lectureSeule,
  nonOuvre,
  cochee,
}: {
  lectureSeule: boolean;
  nonOuvre: boolean;
  cochee: boolean;
}): boolean => lectureSeule || (nonOuvre && !cochee);
