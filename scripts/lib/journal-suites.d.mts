// Signatures du journal des suites complètes (D-193 (4)). Implémentation : journal-suites.mjs.
export interface Evenement {
  evenement: 'debut' | 'fin';
  lot: string;
  date: string;
  commit: string;
  justification?: string;
  resultat?: string;
  vitest?: { statut: string; duree_s: number };
  e2e?: { statut: string; duree_s: number };
}
export class SuiteRefusee extends Error {}
/** Minuscules, espaces retirés (D-194 (5)). */
export function normaliserLot(lot: string): string;
export interface Runner {
  /** Pré-contrôle (D-198 (1)) : lancé avant la ligne `debut` ; un échec n'écrit rien au journal. */
  preControle?(): Promise<{ code: number; sortie?: string }>;
  vitest(): Promise<{ code: number }>;
  e2e(): Promise<{ code: number }>;
}
export function lireJournal(chemin: string): Evenement[];
/** Lignes brutes du journal pour ce lot, dans l'ordre. */
export function lignesDuLot(chemin: string, lot: string): string[];
/** Lève SuiteRefusee si le lot a déjà une suite au journal et que la justification est vide. */
export function verifierLot(chemin: string, lot: string, justification?: string): void;
/** Ajoute une ligne JSON terminée par un saut de ligne, sans toucher aux octets existants. */
export function ajouterEvenement(chemin: string, evenement: object): void;
export function executerSuite(options: {
  chemin: string;
  lot: string;
  justification?: string;
  commit: string;
  arbrePropre: boolean;
  runner: Runner;
  horloge?: () => number;
  date?: () => string;
}): Promise<{ code: number; resultat: string; message?: string }>;
