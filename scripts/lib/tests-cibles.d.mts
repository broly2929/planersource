// Signatures de la sélection des tests (D-194 (1)). Implémentation : tests-cibles.mjs.
export type Domaines = Record<string, string[]>;
export interface Selection {
  spec: string;
  raisons: string[];
}
export interface Commande {
  commande: string;
  args: string[];
  cwd: string;
}
export class DomaineInconnu extends Error {}
export function chargerDomaines(chemin: string): Domaines;
/** Union sans doublon, triée par nom de spec ; DomaineInconnu si un domaine demandé n'existe pas. */
export function selectionnerE2e(options: {
  depuis?: string;
  domaines?: string[];
  definitions: Domaines;
  specsChangees?: string[];
}): Selection[];
export function construireCommandes(options: {
  selection: Selection[];
  depuis?: string;
  racine: string;
}): Commande[];
/** Lit la sortie de `vitest list --filesOnly` : « [projet] chemin » donne les chemins. */
export function lireListeVitest(sortie: string): string[];
/** Specs (noms relatifs au dossier des tests) que `--only-changed=<depuis>` retient. */
export function specsChangeesPlaywright(options: { depuis: string; racineE2e: string }): string[];
