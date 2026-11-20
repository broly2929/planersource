import { useState } from 'react';
import { api } from '../../api';
import { Case } from '../../components/Case';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { navigate } from '../../router';
import { CODE_UTILISE, FormulaireDialogue } from './commun';

export interface SourceCopie {
  id: number;
  nom: string;
  date_debut: string;
}

function FormulaireCopie({
  source,
  depuisModele,
  admin,
  onAnnuler,
}: {
  source: SourceCopie;
  depuisModele: boolean;
  admin: boolean;
  onAnnuler: () => void;
}) {
  const [nom, setNom] = useState(`Copie de ${source.nom}`);
  const [code, setCode] = useState('');
  const [debut, setDebut] = useState(source.date_debut);
  const [sousProjets, setSousProjets] = useState(true);
  const [affectations, setAffectations] = useState(true);
  const [modele, setModele] = useState(false);
  return (
    <FormulaireDialogue
      libelle={depuisModele ? 'Créer' : 'Copier'}
      envoyer={() =>
        api<{ id: number }>(`/api/projets/${source.id}/copie`, {
          method: 'POST',
          body: {
            nom,
            code,
            date_debut: debut,
            sous_projets: sousProjets,
            affectations,
            est_modele: modele,
          },
        })
      }
      onSucces={(projet: { id: number }) => navigate(`/projets/${projet.id}`)}
      onAnnuler={onAnnuler}
      conflit={CODE_UTILISE}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <Field label="Code" required value={code} onChange={(e) => setCode(e.target.value)} />
      <Field
        label="Date de début"
        type="date"
        required
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold text-gray-800">Options</legend>
        <Case
          label="Inclure les sous-projets"
          checked={sousProjets}
          onChange={(e) => setSousProjets(e.target.checked)}
        />
        <Case
          label="Copier les affectations et assignations"
          checked={affectations}
          onChange={(e) => setAffectations(e.target.checked)}
        />
        {admin && !depuisModele && (
          <Case
            label="Enregistrer comme modèle"
            checked={modele}
            onChange={(e) => setModele(e.target.checked)}
          />
        )}
      </fieldset>
    </FormulaireDialogue>
  );
}

/** Dialogue de copie unique, ouvert depuis « Projets » (Copier) ou « Modèles » (Créer). */
export function DialogueCopie({
  source,
  depuisModele,
  admin,
  onFermer,
}: {
  source: SourceCopie;
  depuisModele: boolean;
  admin: boolean;
  onFermer: () => void;
}) {
  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre={depuisModele ? `Créer un projet depuis ${source.nom}` : `Copier ${source.nom}`}
      description="Renseignez le nom, le code et la date de début de la copie."
    >
      <FormulaireCopie
        source={source}
        depuisModele={depuisModele}
        admin={admin}
        onAnnuler={onFermer}
      />
    </Dialog>
  );
}
