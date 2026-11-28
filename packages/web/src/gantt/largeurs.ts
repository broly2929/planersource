/** Largeurs du Gantt (D-086), mesurées avec DejaVu Sans. Classes complètes, pour Tailwind. */
export const CLASSE_NOM_MAX = 'max-w-56';
/** Nom avec les colonnes « Vendu » et « Marge » (6c) : 144 px au lieu de 224. */
export const CLASSE_NOM_MAX_CLIENT = 'max-w-36';
export const CLASSE_ENTETE_DRAPEAUX = 'sticky right-0 max-w-44 bg-gray-100 shadow-repere';
export const CLASSE_CELLULE_DRAPEAUX =
  'sticky right-0 max-w-44 bg-white shadow-repere group-hover:bg-gray-50 group-data-[deplacee]:bg-accent-bg';
/** Activité du planning d'une ressource (6e) : 144 px au lieu de 224, pour tenir à 1024 px. */
export const CLASSE_NOM_MAX_RESSOURCE = 'max-w-36';

/** Séparateur du tableau et de calendrier (D-212 (2), (3)). */
export const TABLEAU_MIN = 200;
export const PART_TABLEAU_DEFAUT = 0.4;
export const PART_TABLEAU_MAX = 0.8;
/** Pas du séparateur au clavier (flèches gauche et droite). */
export const PAS_SEPARATEUR = 16;
/** Hauteur minimale d'une vue à deux zones. */
export const HAUTEUR_VUE_MIN = 320;

/** Colonnes du tableau (D-212 (4)) : largeur minimale, colonne du nom, pas au clavier. */
export const COLONNE_MIN = 48;
export const COLONNE_NOM_MIN = 120;
export const PAS_COLONNE = 16;
/** Marges internes d'une cellule du tableau du Gantt (`px-2`), ou d'une colonne resserrée (`px-1`). */
export const MARGES_CELLULE = 16;
export const MARGES_CELLULE_SERREE = 8;
/** Colonne « Notes » (D-270) : texte sur une ligne, tronqué. */
export const CLASSE_NOTES_MAX = 'max-w-56';
