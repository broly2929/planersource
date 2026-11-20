import { useState } from 'react';
import { api } from '../../api';
import { Select } from '../../components/Select';
import { FormulaireDialogue, texteRefusDeplacement } from './commun';

export interface LigneDeplacement {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  wbs: string;
  nom: string;
}

/** Descendants d'un élément, à tous les niveaux. */
function descendants(lignes: LigneDeplacement[], id: number): Set<number> {
  const trouves = new Set<number>();
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (const l of lignes) {
      if (
        l.parent_id !== null &&
        (l.parent_id === id || trouves.has(l.parent_id)) &&
        !trouves.has(l.id)
      ) {
        trouves.add(l.id);
        ajoute = true;
      }
    }
  }
  return trouves;
}

/** Dialogue « Déplacer » (D-108 (11)) : changement de parent, fin de fratrie (rang omis). */
export function FormulaireDeplacement({
  ligne,
  lignes,
  onSucces,
  onAnnuler,
}: {
  ligne: LigneDeplacement;
  /** Éléments du projet dans l'ordre WBS. */
  lignes: LigneDeplacement[];
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const initial = ligne.parent_id === null ? '' : String(ligne.parent_id);
  const [parent, setParent] = useState(initial);
  const exclus = descendants(lignes, ligne.id);
  const options = [
    { value: '', label: 'Racine du projet' },
    ...lignes
      .filter((l) => l.type === 'activite' && l.id !== ligne.id && !exclus.has(l.id))
      .map((l) => ({ value: String(l.id), label: `${l.wbs} ${l.nom}` })),
  ];
  return (
    <FormulaireDialogue
      libelle="Déplacer"
      envoyer={() =>
        api(`/api/elements/${ligne.id}/deplacer`, {
          method: 'POST',
          body: { parent_id: parent === '' ? null : Number(parent) },
        })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
      inactif={parent === initial}
      texteErreur={texteRefusDeplacement}
    >
      <Select
        label="Activité parente"
        value={parent}
        onChange={(e) => setParent(e.target.value)}
        options={options}
      />
    </FormulaireDialogue>
  );
}
