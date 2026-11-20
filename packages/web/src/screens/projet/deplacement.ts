/** Aides de l'onglet Planning pour Monter et Descendre (D-123 (2)). */

/** Texte annoncé après un déplacement : « <nom> est maintenant en position <wbs>. » */
export const messagePosition = (nom: string, wbs: string): string =>
  `${nom} est maintenant en position ${wbs}.`;

/** WBS d'une ligne après rechargement du planning ; null si la ligne n'existe plus. */
export const wbsDe = (lignes: { id: number; wbs: string }[], id: number): string | null =>
  lignes.find((l) => l.id === id)?.wbs ?? null;
