import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Dialog } from '../../components/Dialog';
import { Chargement } from '../../components/Etat';
import { Notification } from '../../components/Notification';
import { FormulaireModifAssignation } from './FormulairesEdition';
import { messageErreur } from './commun';

/**
 * Dialogue « Modifier l'assignation », commun au Planning et à la colonne Ressources du Gantt et de l'Accueil
 * (D-238) : même titre, même description, charge et taux préremplis. Case « Charge depuis le taux » si
 * l'activité est en REGUL (D-276) ; depuis le Gantt et l'Accueil (`projetId` sans `depuisTaux`), la valeur du
 * champ est lue par `GET /api/projets/:id/assignations` à l'ouverture (D-278, SPEC §4 point 23).
 */
export function DialogueModifAssignation({
  id,
  charge,
  taux,
  nomRessource,
  nomActivite,
  regul,
  depuisTaux,
  projetId,
  onSucces,
  onFermer,
}: {
  id: number;
  charge: number;
  taux: number;
  /** mode REGUL de l'activité et champ `charge_depuis_taux` de l'assignation (D-276) */
  regul?: boolean;
  depuisTaux?: boolean;
  /** projet de l'assignation : lecture de `charge_depuis_taux` quand il n'est pas fourni (D-278) */
  projetId?: number;
  nomRessource: string;
  nomActivite: string;
  onSucces: () => void;
  onFermer: () => void;
}) {
  const aLire = regul === true && depuisTaux === undefined && projetId !== undefined;
  const [lu, setLu] = useState<
    | { statut: 'chargement' }
    | { statut: 'ok'; depuisTaux: boolean }
    | { statut: 'erreur'; texte: string }
  >(aLire ? { statut: 'chargement' } : { statut: 'ok', depuisTaux: depuisTaux ?? false });

  useEffect(() => {
    if (!aLire) return;
    let actif = true;
    api<{ id: number; charge_depuis_taux?: boolean }[]>(`/api/projets/${projetId}/assignations`)
      .then((liste) => {
        if (actif) {
          setLu({
            statut: 'ok',
            depuisTaux: liste.find((a) => a.id === id)?.charge_depuis_taux ?? false,
          });
        }
      })
      .catch((err: unknown) => {
        if (actif) setLu({ statut: 'erreur', texte: messageErreur(err) });
      });
    return () => {
      actif = false;
    };
  }, [aLire, projetId, id]);

  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre="Modifier l’assignation"
      description={`Modifiez la charge et le taux de ${nomRessource} sur ${nomActivite}.`}
    >
      {lu.statut === 'chargement' && <Chargement />}
      {lu.statut === 'erreur' && <Notification type="erreur">{lu.texte}</Notification>}
      {lu.statut === 'ok' && (
        <FormulaireModifAssignation
          id={id}
          charge={charge}
          taux={taux}
          {...(regul !== undefined ? { regul } : {})}
          depuisTaux={lu.depuisTaux}
          onSucces={onSucces}
          onAnnuler={onFermer}
        />
      )}
    </Dialog>
  );
}
