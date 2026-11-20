/* Recalcul automatique (D-101) : file pure et préférence. */

export type EtatFile = { enCours: boolean; attente: boolean };
export type EvenementFile = 'demande' | 'fin' | 'decocher';

export const etatInitialFile: EtatFile = { enCours: false, attente: false };

export function evenementFile(
  etat: EtatFile,
  evenement: EvenementFile,
): { etat: EtatFile; lancer: boolean } {
  switch (evenement) {
    case 'demande':
      return etat.enCours
        ? { etat: { enCours: true, attente: true }, lancer: false }
        : { etat: { enCours: true, attente: false }, lancer: true };
    case 'fin':
      return etat.attente
        ? { etat: { enCours: true, attente: false }, lancer: true }
        : { etat: etatInitialFile, lancer: false };
    case 'decocher':
      return { etat: { ...etat, attente: false }, lancer: false };
  }
}

export const CLE_RECALCUL_AUTO = 'planersource.recalculAuto';

export function lireRecalculAuto(stockage: Pick<Storage, 'getItem'>): boolean {
  try {
    return stockage.getItem(CLE_RECALCUL_AUTO) === '1';
  } catch {
    return false;
  }
}

export function ecrireRecalculAuto(stockage: Pick<Storage, 'setItem'>, valeur: boolean): void {
  try {
    stockage.setItem(CLE_RECALCUL_AUTO, valeur ? '1' : '0');
  } catch {
    /* préférence non enregistrée */
  }
}
