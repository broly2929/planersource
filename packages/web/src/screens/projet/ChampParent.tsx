import { useState } from 'react';
import { api } from '../../api';
import { useDialoguePret } from '../../components/Dialog';
import { Select } from '../../components/Select';
import { optionsParent, parentChange, type LigneArbo } from '../../saisieActivites';
import { messageErreur, texteRefusDeplacement, useListe } from './commun';

/** Éléments du projet en ordre WBS, ou null tant qu'ils ne sont pas chargés. */
export function useArbo(projetId: number): LigneArbo[] | null {
  const [etat] = useListe<LigneArbo[]>(`/api/projets/${projetId}/planning`);
  return etat.statut === 'ok' ? etat.donnees : null;
}

/** Liste « Activité parente » ; absente tant que les éléments du projet ne sont pas chargés. */
export function ChampParent({
  lignes,
  id,
  valeur,
  onChange,
}: {
  lignes: LigneArbo[] | null;
  /** Élément modifié (exclu de la liste avec ses descendants), null à la création. */
  id: number | null;
  valeur: string;
  onChange: (valeur: string) => void;
}) {
  useDialoguePret(lignes !== null);
  if (lignes === null) return null;
  return (
    <Select
      label="Activité parente"
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      options={optionsParent(lignes, id)}
    />
  );
}

/** Le déplacement a été refusé : rien n'est enregistré. */
export class ErreurDeplacement {
  constructor(readonly cause: unknown) {}
}
/** Le déplacement est fait, mais l'enregistrement des champs a échoué. */
export class ErreurApresDeplacement {
  constructor(readonly cause: unknown) {}
}
export const MESSAGE_APRES_DEPLACEMENT =
  'Le déplacement est fait, mais les champs ne sont pas enregistrés.';

/** Texte d'une erreur d'enregistrement avec déplacement (SPEC §6 « Saisie des activités » 1). */
export function texteErreurSaisie(err: unknown, cible?: 'element'): string {
  if (err instanceof ErreurDeplacement) return texteRefusDeplacement(err.cause);
  if (err instanceof ErreurApresDeplacement) return MESSAGE_APRES_DEPLACEMENT;
  return messageErreur(err, undefined, cible);
}

/** Parent d'un élément modifié : champ, et déplacement (dernier de la nouvelle fratrie) avant le PATCH. */
export function useParentModif(projetId: number, id: number, onChangement: () => void) {
  const lignes = useArbo(projetId);
  const serveur = lignes?.find((l) => l.id === id)?.parent_id ?? null;
  // Parent après un déplacement réussi : un nouvel essai ne déplace pas une seconde fois.
  const [fait, setFait] = useState<number | null | undefined>(undefined);
  const actuel = fait !== undefined ? fait : serveur;
  const [choix, setChoix] = useState<string | null>(null);
  const valeur = choix ?? (actuel === null ? '' : String(actuel));
  const aDeplacer = lignes !== null && parentChange(actuel, valeur);
  return {
    champ: <ChampParent lignes={lignes} id={id} valeur={valeur} onChange={setChoix} />,
    lignes,
    dejaDeplace: fait !== undefined,
    /** Déplace si le parent a changé ; renvoie vrai si un déplacement a eu lieu. */
    async deplacer(): Promise<boolean> {
      if (!aDeplacer) return false;
      const cible = valeur === '' ? null : Number(valeur);
      try {
        await api(`/api/elements/${id}/deplacer`, { method: 'POST', body: { parent_id: cible } });
      } catch (err) {
        throw new ErreurDeplacement(err);
      }
      setFait(cible);
      onChangement();
      return true;
    },
  };
}
