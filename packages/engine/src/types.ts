/** Jour calendaire 'AAAA-MM-JJ'. */
export type Jour = string;
/** Entier en centièmes (100 = 1 j) ; un taux est en centièmes de % (10000 = 100 %). */
export type Cs = number;

export interface Calendrier {
  id: number;
  /** 1 = lundi … 7 = dimanche */
  joursTravailles: number[];
  feries: Jour[];
}

export interface Ressource {
  id: number;
  capacite: Cs;
  calendrierId: number;
}

export interface AffectationProjet {
  ressourceId: number;
  taux: Cs;
  debut?: Jour;
  fin?: Jour;
}

export interface Projet {
  id: number;
  parentId: number | null;
  priorite: number;
  debut: Jour;
  affectations: AffectationProjet[];
}

export type Mode = 'ASAP' | 'START' | 'STARR' | 'ALAP' | 'FDUR' | 'DDUR' | 'REGUL' | 'MAN';

export interface Activite {
  type: 'activite';
  id: number;
  projetId: number;
  parentId: number | null;
  rang: number;
  mode: Mode;
  priorite: number;
  close: boolean;
  debutValide?: Jour;
  finValide?: Jour;
  dureeValidee?: number;
}

export interface Jalon {
  type: 'jalon';
  id: number;
  projetId: number;
  parentId: number | null;
  rang: number;
  nature: 'flottant' | 'fixe';
  dateValidee?: Jour;
}

export interface Dependance {
  predecesseurId: number;
  successeurId: number;
  type: 'FD' | 'DD' | 'FF';
  delai: number;
}

export interface Assignation {
  id: number;
  activiteId: number;
  ressourceId: number;
  taux: Cs;
  /** charge assignée */
  charge: Cs;
  chargeReelle: Cs;
  resteAFaire: Cs;
}

export interface TravailReel {
  assignationId: number;
  jour: Jour;
  charge: Cs;
}

export interface TravailExterne {
  ressourceId: number;
  jour: Jour;
  charge: Cs;
}

export interface Saisie {
  assignationId: number;
  jour: Jour;
  demiJournee: 'matin' | 'apres_midi';
  charge: Cs;
}

export interface Entree {
  d0: Jour;
  /** dernier jour posable */
  horizon: Jour;
  calendriers: Calendrier[];
  calendrierDefautId: number;
  ressources: Ressource[];
  projets: Projet[];
  elements: (Activite | Jalon)[];
  dependances: Dependance[];
  assignations: Assignation[];
  travailReel: TravailReel[];
  travailExterne: TravailExterne[];
  saisies: Saisie[];
}

export type Drapeau = 'retard' | 'debut_non_respecte' | 'surcharge' | 'dependance_non_respectee';

export interface TravailPose {
  assignationId: number;
  jour: Jour;
  charge: Cs;
  surcharge: Cs;
}

export interface SortieActivite {
  id: number;
  debut: Jour | null;
  fin: Jour | null;
  charge: Cs;
  reel: Cs;
  reste: Cs;
  drapeaux: string[];
}

export interface SortieJalon {
  id: number;
  date: Jour;
  drapeaux: string[];
}

export interface SortieProjet {
  id: number;
  debut: Jour | null;
  fin: Jour | null;
  charge: Cs;
  reel: Cs;
  reste: Cs;
  avancement: Cs | null;
}

export interface Avertissement {
  code: 'reste_non_pose';
  assignationId?: number;
  reste?: Cs;
}

/** Une entrée par dépendance de l'entrée, marquée ou non (SPEC 5.3). */
export interface SortieDependance {
  predecesseurId: number;
  successeurId: number;
  drapeaux: string[];
}

/** Reste à faire d'une assignation après le calcul (D-057). */
export interface SortieAssignation {
  id: number;
  reste: Cs;
}

export interface Sortie {
  /** charge > 0 seulement, trié par assignationId puis jour */
  travail: TravailPose[];
  /** parents agrégés, trié par id */
  activites: SortieActivite[];
  jalons: SortieJalon[];
  projets: SortieProjet[];
  avertissements: Avertissement[];
  /** triée par prédécesseur puis successeur */
  dependances: SortieDependance[];
  /**
   * une entrée par assignation de l'entrée, triée par id : feuille MAN ouverte, somme des saisies à
   * partir de D0 ; activité close, 0 ; autres, reste à faire d'entrée (D-057)
   */
  assignations: SortieAssignation[];
}

export type CodeErreur = 'cycle_dependances' | 'mode_non_calcule' | 'entree_invalide';
