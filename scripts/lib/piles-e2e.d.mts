// Signatures des piles e2e par worker (D-199). Implémentation : piles-e2e.mjs.
import type { ChildProcess } from 'node:child_process';
import type { Base } from './bases-worker.mjs';

export const PORT_API_BASE: number;
export const PORT_WEB_BASE: number;
export const MARQUEUR: string;

export interface Pile {
  n: number;
  base: Base;
  modele: Base;
  portApi: number;
  portWeb: number;
  urlApi: string;
  urlWeb: string;
}
export interface Registre {
  lanceur: { pid: number; debut: string | null };
  processus: { nom: string; pgid: number; port: number }[];
}
export function pileDuWorker(
  urlMaintenance: string,
  n: number | string,
  opts?: { famille?: string; familleModele?: string; portApi?: number; portWeb?: number },
): Pile;
export function recreerBaseWorker(
  urlMaintenance: string,
  opts: { n: number | string; famille?: string; familleModele?: string },
): Promise<string>;
export function debutProcessus(pid: number): string | null;
export function lireRegistre(chemin: string): Registre | null;
export function ecrireRegistre(chemin: string, registre: Registre): void;
export function portOccupe(port: number): Promise<boolean>;
export function attendrePort(port: number, delaiMs: number): Promise<void>;
export function reserverRegistre(registre: string): void;
export function arreterPiles(opts: {
  registre: string;
  urlMaintenance: string;
  famille?: string;
  proprietaire?: boolean;
}): Promise<{ arretes: number[]; bases: string[] }>;
export function nettoyerPiles(opts: {
  registre: string;
  urlMaintenance: string;
  famille?: string;
  ports?: number[];
}): Promise<{ arretes: number[]; bases: string[] }>;
export function lancerProcessus(opts: {
  registre: string;
  nom: string;
  port: number;
  commande: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}): ChildProcess & { sortie: () => string };
