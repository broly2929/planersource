import {
  COLONNE_MIN,
  COLONNE_NOM_MIN,
  PART_TABLEAU_DEFAUT,
  PART_TABLEAU_MAX,
  TABLEAU_MIN,
} from './largeurs';

/** Vues à deux zones (D-212 (1)) ; une clé de stockage par vue (D-212 (5)). */
export type VueGantt = 'projet' | 'accueil' | 'ressource';

/** Réglages gardés dans le stockage du navigateur. */
export interface Disposition {
  /** Largeur du tableau, en pixels. */
  tableau?: number;
  /** Colonnes au choix cochées (true) ou décochées (false) ; absente : défaut de la vue. */
  colonnes?: Record<string, boolean>;
  /** Largeur réglée d'une colonne, en pixels ; absente : largeur naturelle. */
  largeurs?: Record<string, number>;
}

/** Colonne d'une vue : toujours affichée, ou au choix avec sa valeur par défaut. */
export interface DefinitionColonne {
  id: string;
  titre: string;
  toujours?: boolean;
  /** Au choix : affichée par défaut. */
  defaut?: boolean;
  /** Colonne du nom : minimum de 120 px (D-212 (4)). */
  nom?: boolean;
  /** Vendu, Marge, Coût planifié et Coût réel : seulement si l'utilisateur écrit le projet (D-149 (8)). */
  vendu?: boolean;
}

const toujours = (id: string, titre: string, nom = false): DefinitionColonne => ({
  id,
  titre,
  toujours: true,
  nom,
});
const choix = (id: string, titre: string, defaut = false, vendu = false): DefinitionColonne => ({
  id,
  titre,
  defaut,
  vendu,
});

/** Colonnes de chaque vue, dans l'ordre fixe de l'écran et du menu (D-212 (4), D-216 (1), (7)) ; défauts de D-227 (B) : seules Début et Fin sont au choix cochées. */
export const COLONNES_GANTT: Record<VueGantt, DefinitionColonne[]> = {
  projet: [
    toujours('wbs', 'WBS'),
    toujours('nom', 'Nom', true),
    choix('planification', 'Planification', false),
    choix('debut', 'Début', true),
    choix('fin', 'Fin', true),
    choix('ressources', 'Ressources', true),
    choix('charge', 'Charge', false),
    choix('vendu', 'Vendu', false, true),
    choix('marge', 'Marge', false, true),
    choix('avancement', 'Avancement', false),
    choix('otp', 'OTP', false),
    choix('cout_planifie', 'Coût planifié', false, true),
    choix('cout_reel', 'Coût réel', false, true),
    choix('notes', 'Notes', false),
    choix('drapeaux', 'Drapeaux', false),
  ],
  accueil: [
    toujours('code', 'Code'),
    toujours('nom', 'Nom', true),
    choix('debut', 'Début', true),
    choix('fin', 'Fin', true),
    choix('ressources', 'Ressources', true),
    choix('charge', 'Charge', false),
    choix('avancement', 'Avancement', false),
    choix('reel', 'Réel', false),
    // D-268 : retirées du menu de l'Accueil quand l'utilisateur ne voit pas les finances (leader métier).
    choix('vendu', 'Vendu', false, true),
    choix('marge', 'Marge', false, true),
    choix('otp', 'OTP', false),
    choix('cout_planifie', 'Coût planifié', false, true),
    choix('cout_reel', 'Coût réel', false, true),
    choix('notes', 'Notes', false),
    choix('drapeaux', 'Drapeaux', false),
  ],
  ressource: [
    toujours('projet', 'Projet'),
    toujours('activite', 'Activité', true),
    choix('debut', 'Début', true),
    choix('fin', 'Fin', true),
    choix('assigne', 'Assigné', false),
    choix('reel', 'Réel', false),
    choix('reste', 'Reste', false),
    choix('drapeaux', 'Drapeaux', false),
  ],
};

/** Largeur par défaut de colonnes à contenu variable (D-238 (7)) ; absente : largeur naturelle. */
export const LARGEUR_DEFAUT_COLONNE: Record<string, number> = { ressources: 96 };

/** Colonnes disponibles pour l'utilisateur : `vendu` faux retire Vendu et Marge du Gantt d'un projet. */
export interface Disponibles {
  vendu: boolean;
}

const definitions = (vue: VueGantt, disponibles: Disponibles) =>
  COLONNES_GANTT[vue].filter((c) => !c.vendu || disponibles.vendu);

/** Identifiants des colonnes affichées, dans l'ordre fixe ; réglage inconnu ignoré. */
export function colonnesAffichees(
  vue: VueGantt,
  disposition: Disposition,
  disponibles: Disponibles,
): string[] {
  return definitions(vue, disponibles)
    .filter((c) => c.toujours || (disposition.colonnes?.[c.id] ?? c.defaut))
    .map((c) => c.id);
}

/** Éléments du menu « Colonnes » : colonnes au choix, dans l'ordre fixe. */
export function colonnesDuMenu(
  vue: VueGantt,
  disponibles: Disponibles,
): { id: string; titre: string }[] {
  return definitions(vue, disponibles)
    .filter((c) => !c.toujours)
    .map(({ id, titre }) => ({ id, titre }));
}

/** Largeur d'une colonne : arrondie, au moins 48 px, 120 px pour la colonne du nom. */
export function bornerColonne(vue: VueGantt, id: string, largeur: number): number {
  const nom = COLONNES_GANTT[vue].some((c) => c.id === id && c.nom);
  return Math.max(nom ? COLONNE_NOM_MIN : COLONNE_MIN, Math.round(largeur));
}

/** Colonne cochée ou décochée ; la disposition d'entrée n'est pas modifiée. */
export function avecColonne(d: Disposition, id: string, affichee: boolean): Disposition {
  return { ...d, colonnes: { ...d.colonnes, [id]: affichee } };
}

/** Largeur réglée d'une colonne, ou retirée (`undefined`) ; la disposition d'entrée n'est pas modifiée. */
export function avecLargeur(d: Disposition, id: string, largeur: number | undefined): Disposition {
  const largeurs = { ...d.largeurs };
  if (largeur === undefined) delete largeurs[id];
  else largeurs[id] = largeur;
  return { ...d, largeurs };
}

const cle = (vue: VueGantt) => `planersource.gantt.${vue}`;

/** Largeur bornée : au moins 200 px, au plus 80 % de la vue (arrondi inférieur). */
export function bornerLargeur(largeur: number, vue: number): number {
  return Math.max(TABLEAU_MIN, Math.min(Math.round(largeur), Math.floor(vue * PART_TABLEAU_MAX)));
}

/** Défaut : 40 % de la vue, relevé à `minimum` (critère D-069 mesuré), puis borné. */
export function largeurParDefaut(vue: number, minimum: number): number {
  return bornerLargeur(Math.max(Math.round(vue * PART_TABLEAU_DEFAUT), Math.ceil(minimum)), vue);
}

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Entrées d'un objet lu dont l'identifiant est retenu et la valeur du bon type ; aucune : undefined. */
function filtrer<T>(
  brut: unknown,
  retenu: (id: string) => boolean,
  valide: (v: unknown) => v is T,
): Record<string, T> | undefined {
  if (!estObjet(brut)) return undefined;
  const sortie: Record<string, T> = {};
  for (const [id, v] of Object.entries(brut)) if (retenu(id) && valide(v)) sortie[id] = v;
  return Object.keys(sortie).length > 0 ? sortie : undefined;
}

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';

/** Réglages de la vue ; stockage absent, en panne ou valeur illisible : {} ; identifiant inconnu ignoré. */
export function lireDisposition(
  stockage: Pick<Storage, 'getItem'> | null,
  vue: VueGantt,
): Disposition {
  try {
    const brut = stockage?.getItem(cle(vue));
    if (!brut) return {};
    const lu: unknown = JSON.parse(brut);
    if (!estObjet(lu)) return {};
    const defs = COLONNES_GANTT[vue];
    const d: Disposition = {};
    if (estNombre(lu.tableau)) d.tableau = lu.tableau;
    const colonnes = filtrer(
      lu.colonnes,
      (id) => defs.some((c) => c.id === id && !c.toujours),
      estBooleen,
    );
    if (colonnes) d.colonnes = colonnes;
    const largeurs = filtrer(lu.largeurs, (id) => defs.some((c) => c.id === id), estNombre);
    if (largeurs) d.largeurs = largeurs;
    return d;
  } catch {
    return {};
  }
}

/** Écrit les réglages de la vue ; un stockage absent ou en panne est ignoré. */
export function ecrireDisposition(
  stockage: Pick<Storage, 'setItem'> | null,
  vue: VueGantt,
  disposition: Disposition,
): void {
  try {
    stockage?.setItem(cle(vue), JSON.stringify(disposition));
  } catch {
    /* stockage indisponible */
  }
}

/** `localStorage`, ou null s'il est inaccessible. */
export function stockageNavigateur(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
