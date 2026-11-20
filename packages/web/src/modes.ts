/** Table unique des libellés et aides des modes de planification (D-123 (5), SPEC §6 Affichage 17). */
export interface ModePlanification {
  code: string;
  libelle: string;
  aide: string;
}

export const MODES_PLANIFICATION: readonly ModePlanification[] = [
  {
    code: 'ASAP',
    libelle: 'Dès que possible',
    aide: 'Démarre au plus tôt, selon les dépendances et la disponibilité des ressources.',
  },
  {
    code: 'START',
    libelle: 'Pas avant une date',
    aide: 'Démarre au plus tôt à partir de la date de début saisie, jamais avant.',
  },
  {
    code: 'STARR',
    libelle: 'Démarrage imposé',
    aide: "Démarre à la date de début saisie, en priorité sur les autres activités ; signalée « Début non respecté » si c'est impossible.",
  },
  {
    code: 'ALAP',
    libelle: 'Fin visée',
    aide: 'Planifiée à rebours pour finir à la date de fin saisie ; si elle ne tient pas, dès que possible.',
  },
  {
    code: 'FDUR',
    libelle: 'Durée fixe',
    aide: 'Dure le nombre de jours saisi, selon la disponibilité ; ce qui ne tient pas passe après, avec « Retard ».',
  },
  {
    code: 'DDUR',
    libelle: 'Durée imposée',
    aide: 'Dure exactement le nombre de jours saisi, même au-delà de la disponibilité (« Surcharge »).',
  },
  {
    code: 'REGUL',
    libelle: 'Régulier entre deux dates',
    aide: 'Charge répartie également sur chaque jour ouvré entre les dates de début et de fin saisies.',
  },
  {
    code: 'MAN',
    libelle: 'Planning manuel',
    aide: 'Charge saisie à la main, par ressource et par demi-journée.',
  },
];

const parCode = new Map(MODES_PLANIFICATION.map((m) => [m.code, m]));

/** Libellé d'un mode ; un code inconnu est rendu tel quel. */
export const libelleMode = (code: string): string => parCode.get(code)?.libelle ?? code;
/** Aide d'un mode ; vide pour un code inconnu. */
export const aideMode = (code: string): string => parCode.get(code)?.aide ?? '';
