import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, ApiError } from '../../api';
import { Button } from '../../components/Button';
import { useEnvoiEnCours, useFermeture } from '../../components/Dialog';
import { Notification } from '../../components/Notification';

export type Etat<T> =
  { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; donnees: T };

/** Chargement d'une ressource API avec les états chargement / erreur / ok. */
export function useListe<T>(chemin: string) {
  const [etat, setEtat] = useState<Etat<T>>({ statut: 'chargement' });
  // D-209 : la réponse d'un chargement lancé avant une mise à jour locale (`modifier`) est périmée : elle est
  // ignorée, et le chargement est relancé pour relire l'état du serveur après cette mise à jour.
  const version = useRef(0);
  const enCours = useRef(0);
  const charger = useCallback(() => {
    const v = version.current;
    enCours.current++;
    const appliquer = (e: Etat<T>) => {
      enCours.current--;
      if (v === version.current) setEtat(e);
    };
    api<T>(chemin)
      .then((donnees) => appliquer({ statut: 'ok', donnees }))
      .catch(() => appliquer({ statut: 'erreur' }));
  }, [chemin]);
  useEffect(charger, [charger]);
  /** Remplace les données chargées (mise à jour locale sans rechargement). */
  const modifier = useCallback(
    (f: (donnees: T) => T) => {
      setEtat((e) => (e.statut === 'ok' ? { statut: 'ok', donnees: f(e.donnees) } : e));
      if (enCours.current === 0) return;
      version.current++;
      charger();
    },
    [charger],
  );
  return [etat, charger, modifier] as const;
}

export const CODE_UTILISE = 'Ce code est déjà utilisé.';
export const PARENT_IMPOSSIBLE = 'Ce projet parent n’est pas possible.';
export const ENFANTS_PROJET = 'Ce projet a des sous-projets ou des activités non clos.';
export const ENFANTS_ACTIVITE = 'Cette activité a des sous-activités non closes.';
export const PARENT_CLOS_ELEMENT = 'Le projet ou l’activité parente est clos.';
export const PARENT_CLOS_PROJET = 'Le projet parent est clos.';
export const PARENT_ASSIGNE =
  'Une activité avec des ressources assignées ne peut pas avoir d’enfant.';
export const DEPENDANCE_HIERARCHIE =
  'Une dépendance relie cet élément à l’une de ses activités parentes.';
export const ACTIVITE_PARENTE = 'Une activité parente ne porte pas de charge vendue.';
export const PARENT_VENDU =
  'Cette activité porte une charge vendue : elle ne peut pas recevoir d’enfant.';
export const DATES_INCOHERENTES = 'Modification refusée : la fin validée précède le début validé.';

/** Texte d'un 422 d'après son champ `code` (D-083 (9)), ou null si le code est absent ou autre. */
export function texteRefusCode(err: ApiError, cible: 'projet' | 'element'): string | null {
  switch (err.code) {
    case 'enfants_ouverts':
      return cible === 'projet' ? ENFANTS_PROJET : ENFANTS_ACTIVITE;
    case 'parent_clos':
      return cible === 'projet' ? PARENT_CLOS_PROJET : PARENT_CLOS_ELEMENT;
    case 'arborescence_invalide':
      return PARENT_IMPOSSIBLE;
    case 'dates_incoherentes':
      return cible === 'element' ? DATES_INCOHERENTES : null;
    case 'parent_assigne':
      return cible === 'element' ? PARENT_ASSIGNE : null;
    case 'activite_parente':
      return cible === 'element' ? ACTIVITE_PARENTE : null;
    case 'parent_vendu':
      return cible === 'element' ? PARENT_VENDU : null;
    case 'dependance_hierarchie':
      return cible === 'element' ? DEPENDANCE_HIERARCHIE : null;
    default:
      return null;
  }
}

/** Texte de l'alerte d'un geste refusé (D-088 (6), D-094 (6)). */
export function texteRefusGeste(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'Modification refusée : dates invalides.';
    if (err.status === 422) {
      return texteRefusCode(err, 'element') ?? 'Cette opération enfreint une règle du planning.';
    }
    if (err.status === 403 || err.status === 404) {
      return 'Modification impossible : rechargez la page.';
    }
  }
  return 'Modification impossible pour le moment. Réessayez.';
}

/** Texte de l'alerte d'un déplacement refusé (D-108 (10)) ; les autres cas : `texteRefusGeste`. */
export function texteRefusDeplacement(err: unknown): string {
  if (err instanceof ApiError && err.status === 400) {
    return 'Modification refusée : données invalides.';
  }
  return texteRefusGeste(err);
}

/** Texte de l'alerte d'une création de lien refusée (D-104 (6)) ; les autres cas : `texteRefusGeste`. */
export function texteRefusCreationLien(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Cette dépendance existe déjà.';
    if (err.status === 400) return 'Modification refusée : données invalides.';
  }
  return texteRefusGeste(err);
}

/** Message d'un 409 : fixe, ou choisi d'après l'erreur renvoyée par l'API. */
export type Conflit = string | ((err: ApiError) => string);

export function messageErreur(
  err: unknown,
  conflit?: Conflit,
  cible?: 'projet' | 'element',
): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'Données invalides : vérifiez les champs.';
    if (err.status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.';
    if (err.status === 409) {
      return typeof conflit === 'function' ? conflit(err) : (conflit ?? 'Cet élément existe déjà.');
    }
    if (err.status === 422) {
      const parCode = cible ? texteRefusCode(err, cible) : null;
      return parCode ?? 'Cette opération enfreint une règle du planning.';
    }
  }
  return 'Opération impossible pour le moment. Réessayez.';
}

/** Formulaire de dialogue : erreur API affichée dans le dialogue, qui reste ouvert. */
export function FormulaireDialogue<T = unknown>({
  libelle,
  envoyer,
  onSucces,
  onAnnuler,
  conflit,
  valider,
  cible,
  inactif = false,
  texteErreur,
  children,
}: {
  libelle: string;
  envoyer: () => Promise<T>;
  onSucces: (resultat: T) => void;
  onAnnuler: () => void;
  /** Message affiché sur un 409 (sinon « Cet élément existe déjà. »). */
  conflit?: Conflit;
  /** Validation locale avant l'envoi : renvoie un message de refus, ou null si tout va bien. */
  valider?: () => string | null;
  /** Texte d'un 422 d'après son seul `code` (D-083 (9), (14)), sinon message générique. */
  cible?: 'projet' | 'element';
  /** Bouton d'envoi inactif (rien n'a changé). */
  inactif?: boolean;
  /** Texte d'une erreur, à la place du texte par code HTTP (ex. `texteRefusDeplacement`). */
  texteErreur?: (err: unknown) => string;
  children: ReactNode;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  useEnvoiEnCours(enCours);
  const fermer = useFermeture(onAnnuler);
  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    const refus = valider?.() ?? null;
    setErreur(refus);
    if (refus) return;
    setEnCours(true);
    try {
      onSucces(await envoyer());
    } catch (err) {
      setErreur(texteErreur ? texteErreur(err) : messageErreur(err, conflit, cible));
      setEnCours(false);
    }
  };
  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      {erreur && <Notification type="erreur">{erreur}</Notification>}
      {children}
      <div className="flex justify-end gap-2">
        <Button variante="secondaire" onClick={fermer}>
          Annuler
        </Button>
        <Button type="submit" enCours={enCours} disabled={inactif}>
          {libelle}
        </Button>
      </div>
    </form>
  );
}

export interface Affectation {
  id: number;
  ressource_id: number;
  taux: number;
  date_debut: string | null;
  date_fin: string | null;
}

/** Classes d'un onglet Radix (fiche projet, écran Utilisateurs). */
export const ONGLET =
  'h-8 border-b-2 border-transparent px-3 text-gray-700 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-gray-900';
