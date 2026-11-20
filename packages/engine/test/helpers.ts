import { calculer, ErreurMoteur } from '../src/index.js';
import type {
  Activite,
  Assignation,
  Calendrier,
  Dependance,
  Entree,
  Jalon,
  Jour,
  Projet,
  Sortie,
} from '../src/index.js';

export const ALICE = 1;
export const BOB = 2;

/** Jour de janvier 2027. */
export const J = (n: number): Jour => `2027-01-${String(n).padStart(2, '0')}`;

/** Jours (numéros de janvier 2027) → charges en centièmes, en dates complètes. */
export function at(m: Record<number, number>): Record<Jour, number> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [J(Number(k)), v]));
}

/** Centièmes depuis des jours entiers ou décimaux écrits en littéral. */
export const cs = (jours: number): number => Math.round(jours * 100);

export const LUN_VEN: Calendrier = { id: 1, joursTravailles: [1, 2, 3, 4, 5], feries: [] };
export const MAR_SAM: Calendrier = { id: 2, joursTravailles: [2, 3, 4, 5, 6], feries: [] };

export function projet(id: number, over: Partial<Projet> = {}): Projet {
  return {
    id,
    parentId: null,
    priorite: 500,
    debut: J(4),
    affectations: [
      { ressourceId: ALICE, taux: 10000 },
      { ressourceId: BOB, taux: 10000 },
    ],
    ...over,
  };
}

export function act(id: number, over: Partial<Activite> = {}): Activite {
  return {
    type: 'activite',
    id,
    projetId: 1,
    parentId: null,
    rang: id,
    mode: 'ASAP',
    priorite: 500,
    close: false,
    ...over,
  };
}

export function jal(id: number, over: Partial<Jalon> = {}): Jalon {
  return {
    type: 'jalon',
    id,
    projetId: 1,
    parentId: null,
    rang: id,
    nature: 'flottant',
    ...over,
  };
}

export function ass(
  id: number,
  activiteId: number,
  ressourceId: number,
  jours: number,
  over: Partial<Assignation> = {},
): Assignation {
  return {
    id,
    activiteId,
    ressourceId,
    taux: 10000,
    charge: cs(jours),
    chargeReelle: 0,
    resteAFaire: cs(jours),
    ...over,
  };
}

export const dep = (
  predecesseurId: number,
  successeurId: number,
  type: Dependance['type'] = 'FD',
  delai = 0,
): Dependance => ({ predecesseurId, successeurId, type, delai });

export interface Tache {
  el: Activite;
  ass: Assignation | null;
}

/** Activité ASAP d'id `id`, assignée (id d'assignation = id) à `ressourceId` pour `jours`. */
export function tache(
  id: number,
  ressourceId: number | null,
  jours = 0,
  el: Partial<Activite> = {},
  a: Partial<Assignation> = {},
): Tache {
  return {
    el: act(id, el),
    ass: ressourceId === null ? null : ass(id, id, ressourceId, jours, a),
  };
}

/** Entrée avec les défauts de SPEC §5.5 ; `taches` s'ajoute aux éléments et assignations. */
export function entree(over: Partial<Entree> & { taches?: Tache[] } = {}): Entree {
  const { taches = [], ...reste } = over;
  const base: Entree = {
    d0: J(4),
    horizon: '2030-01-04',
    calendriers: [LUN_VEN],
    calendrierDefautId: 1,
    ressources: [
      { id: ALICE, capacite: 100, calendrierId: 1 },
      { id: BOB, capacite: 100, calendrierId: 1 },
    ],
    projets: [projet(1)],
    elements: [],
    dependances: [],
    assignations: [],
    travailReel: [],
    travailExterne: [],
    saisies: [],
  };
  const e: Entree = { ...base, ...reste };
  e.elements = [...taches.map((t) => t.el), ...(reste.elements ?? [])];
  e.assignations = [
    ...taches.flatMap((t) => (t.ass ? [t.ass] : [])),
    ...(reste.assignations ?? []),
  ];
  return e;
}

/** Travail posé d'une assignation : jour → charge. */
export function trav(s: Sortie, assignationId: number): Record<Jour, number> {
  return Object.fromEntries(
    s.travail.filter((t) => t.assignationId === assignationId).map((t) => [t.jour, t.charge]),
  );
}

export function activite(s: Sortie, id: number) {
  const a = s.activites.find((x) => x.id === id);
  if (!a) throw new Error(`activité ${id} absente de la sortie`);
  return a;
}

export function jalon(s: Sortie, id: number) {
  const j = s.jalons.find((x) => x.id === id);
  if (!j) throw new Error(`jalon ${id} absent de la sortie`);
  return j;
}

export function projetSortie(s: Sortie, id: number) {
  const p = s.projets.find((x) => x.id === id);
  if (!p) throw new Error(`projet ${id} absent de la sortie`);
  return p;
}

/** Reste par assignation de la sortie (D-057). */
export interface SortieAssignation {
  id: number;
  reste: number;
}

/** Sortie `assignations` (D-057) ; échoue si elle est absente. */
export function assignationsSortie(s: Sortie): SortieAssignation[] {
  const a = (s as Sortie & { assignations?: SortieAssignation[] }).assignations;
  if (a === undefined) throw new Error('sortie sans assignations');
  return a;
}

/** Reste d'une assignation dans la sortie `assignations` (D-057). */
export function resteAssignation(s: Sortie, id: number): number {
  const a = assignationsSortie(s).find((x) => x.id === id);
  if (!a) throw new Error(`assignation ${id} absente de la sortie`);
  return a.reste;
}

/** Appelle calculer et renvoie l'erreur levée ; échoue si rien n'est levé. */
export function erreur(e: Entree): ErreurMoteur {
  try {
    calculer(e);
  } catch (x) {
    if (x instanceof ErreurMoteur) return x;
    throw x;
  }
  throw new Error('aucune erreur levée');
}

export function geler<T>(o: T): T {
  if (o !== null && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) geler(v);
  }
  return o;
}
