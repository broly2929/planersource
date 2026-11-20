/** Retraits du nom par niveau de WBS (pas de 4 px, au plus 5 niveaux). */
const RETRAITS = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16'];
export const retrait = (wbs: string) =>
  RETRAITS[Math.min(wbs.split('.').length - 1, RETRAITS.length - 1)]!;
