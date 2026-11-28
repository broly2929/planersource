// Absences d'une ressource (lot absences, D-276 ; SPEC §4 « Absences et charge depuis le taux », point 10).
import { ApiError } from '../api';
import type { EntreeAnnuaire } from '../annuaire';
import { ajouterJours, joursEntre } from '../gantt/echelle';

export type Portion = 'journee' | 'matin' | 'apres_midi';
export type Motif = 'conge' | 'formation' | 'autre';

export interface Absence {
  id: number;
  ressource_id: number;
  debut: string;
  fin: string;
  portion: Portion;
  motif: Motif;
}

export const LIBELLE_PORTION: Record<Portion, string> = {
  journee: 'Journée',
  matin: 'Matin',
  apres_midi: 'Après-midi',
};
export const LIBELLE_MOTIF: Record<Motif, string> = {
  conge: 'Congé',
  formation: 'Formation',
  autre: 'Autre',
};

export const OPTIONS_PORTION = (Object.keys(LIBELLE_PORTION) as Portion[]).map((v) => ({
  value: v,
  label: LIBELLE_PORTION[v],
}));
export const OPTIONS_MOTIF = (Object.keys(LIBELLE_MOTIF) as Motif[]).map((v) => ({
  value: v,
  label: LIBELLE_MOTIF[v],
}));

/** « AAAA-MM-JJ » -> « JJ/MM/AAAA ». */
export function dateFr(jour: string): string {
  const [a, m, j] = jour.split('-');
  return `${j}/${m}/${a}`;
}

/** Libellé affiché dans l'infobulle d'un jour d'absence : « Absence (Congé) ». */
export const titreAbsence = (motif: Motif): string => `Absence (${LIBELLE_MOTIF[motif]})`;

/**
 * Jours d'absence en journée entière (portion journée, ou matin et après-midi le même jour) compris entre `du`
 * et `au` : jour -> motif. Les demi-journées isolées ne sont pas marquées (SPEC §4 absences point 10).
 */
export function joursAbsenceJournee(
  absences: Absence[],
  du: string,
  au: string,
): Map<string, Motif> {
  const entiers = new Map<string, Motif>();
  const demis = new Map<string, { matin?: Motif; apresMidi?: Motif }>();
  for (const a of absences) {
    const debut = a.debut < du ? du : a.debut;
    const fin = a.fin > au ? au : a.fin;
    if (debut > fin) continue;
    const n = joursEntre(debut, fin);
    for (let i = 0; i <= n; i++) {
      const jour = ajouterJours(debut, i);
      if (a.portion === 'journee') {
        if (!entiers.has(jour)) entiers.set(jour, a.motif);
      } else {
        const d = demis.get(jour) ?? {};
        if (a.portion === 'matin') d.matin = a.motif;
        else d.apresMidi = a.motif;
        demis.set(jour, d);
      }
    }
  }
  for (const [jour, d] of demis) {
    if (d.matin && d.apresMidi && !entiers.has(jour)) entiers.set(jour, d.matin);
  }
  return entiers;
}

export const MESSAGE_CHEVAUCHEMENT = 'Cette absence chevauche une autre absence.';
export const MESSAGE_IMPUTE = 'Un de ces jours porte déjà des imputations.';
export const MESSAGE_DROIT =
  "Vous n'avez pas le droit de modifier les absences de cette ressource.";
export const MESSAGE_INVALIDE = 'Données invalides.';
export const MESSAGE_DUREE = 'Une absence dure au plus 366 jours.';
export const MESSAGE_GENERIQUE = 'Action impossible pour le moment. Réessayez.';

/** Texte d'un refus de l'API (409, 422 `jour_impute` et `duree_excessive`, 403, 400). */
export function messageRefusAbsence(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return MESSAGE_CHEVAUCHEMENT;
    if (err.status === 422 && err.code === 'jour_impute') return MESSAGE_IMPUTE;
    if (err.status === 422 && err.code === 'duree_excessive') return MESSAGE_DUREE;
    if (err.status === 403) return MESSAGE_DROIT;
    if (err.status === 400) return MESSAGE_INVALIDE;
  }
  return MESSAGE_GENERIQUE;
}

/** Ressources de la liste : tri par nom (ordre français), sans doublon. */
export function trierParNom<T extends { nom: string; id: number }>(entrees: T[]): T[] {
  return [...entrees].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.id - b.id);
}

/** Toutes les ressources actives (administrateur, leader métier). */
export function ressourcesActives(annuaire: EntreeAnnuaire[]): EntreeAnnuaire[] {
  return trierParNom(annuaire.filter((e) => e.actif && e.est_ressource));
}

/**
 * Ressource affichée : le paramètre s'il désigne une entrée de la liste, sinon soi si présent dans la liste,
 * sinon aucune. `corrigee` : paramètre présent mais absent de la liste.
 */
export function ressourceChoisie(
  param: string | null,
  liste: { id: number }[],
  moi: { id: number; est_ressource: boolean },
): { ressource: number | null; corrigee: boolean } {
  const defaut = moi.est_ressource && liste.some((e) => e.id === moi.id) ? moi.id : null;
  if (param === null) return { ressource: defaut, corrigee: false };
  if (/^\d+$/.test(param) && liste.some((e) => e.id === Number(param))) {
    return { ressource: Number(param), corrigee: false };
  }
  return { ressource: defaut, corrigee: true };
}
