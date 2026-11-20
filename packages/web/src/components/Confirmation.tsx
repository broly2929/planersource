import { useState } from 'react';
import { ApiError } from '../api';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notification } from './Notification';

function messageRefus(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Vous n’avez pas le droit d’effectuer cette suppression.';
    if (err.status === 404) return 'Cet élément n’existe plus.';
    if (err.status === 409) return 'Suppression refusée : cet élément est encore utilisé.';
    if (err.status === 422) return 'Suppression refusée : elle enfreint une règle du planning.';
  }
  return 'Suppression impossible pour le moment. Réessayez.';
}

/**
 * Confirmation, unique pour toute l'application (D-040) : suppression par défaut (`action` = l'appel à confirmer) ; `titre`,
 * `description`, `libelleConfirmer` et `variante` la généralisent (« Abandonner les modifications ? »,
 * D-120 (11)). Le refus de l'API s'affiche dans le dialogue, qui reste ouvert.
 */
export function Confirmation({
  nom = '',
  action,
  onSucces,
  onAnnuler,
  titre = `Supprimer ${nom} ?`,
  description = 'Cette action est définitive.',
  libelleConfirmer = 'Supprimer',
  variante = 'danger',
  messageErreur = messageRefus,
}: {
  nom?: string;
  action: () => Promise<unknown>;
  onSucces: () => void;
  onAnnuler: () => void;
  titre?: string;
  description?: string;
  libelleConfirmer?: string;
  variante?: 'primaire' | 'danger';
  /** Texte du refus de l'API (défaut : textes de suppression). */
  messageErreur?: (err: unknown) => string;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const confirmer = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      await action();
      onSucces();
    } catch (err) {
      setErreur(messageErreur(err));
      setEnCours(false);
    }
  };

  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onAnnuler()}
      titre={titre}
      description={description}
    >
      <div className="flex flex-col gap-4">
        {erreur && <Notification type="erreur">{erreur}</Notification>}
        <div className="flex justify-end gap-2">
          <Button variante="secondaire" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button variante={variante} onClick={confirmer} enCours={enCours}>
            {libelleConfirmer}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
