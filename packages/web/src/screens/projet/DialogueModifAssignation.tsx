import { Dialog } from '../../components/Dialog';
import { FormulaireModifAssignation } from './FormulairesEdition';

/**
 * Dialogue « Modifier l'assignation », commun au Planning et à la colonne Ressources du Gantt et de l'Accueil
 * (D-238) : même titre, même description, charge et taux préremplis.
 */
export function DialogueModifAssignation({
  id,
  charge,
  taux,
  nomRessource,
  nomActivite,
  onSucces,
  onFermer,
}: {
  id: number;
  charge: number;
  taux: number;
  nomRessource: string;
  nomActivite: string;
  onSucces: () => void;
  onFermer: () => void;
}) {
  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre="Modifier l’assignation"
      description={`Modifiez la charge et le taux de ${nomRessource} sur ${nomActivite}.`}
    >
      <FormulaireModifAssignation
        id={id}
        charge={charge}
        taux={taux}
        onSucces={onSucces}
        onAnnuler={onFermer}
      />
    </Dialog>
  );
}
