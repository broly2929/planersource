import { useEffect, useState } from 'react';
import { enregistrerGarde, sansConfirmation } from '../router';
import { Confirmation } from './Confirmation';

/**
 * Garde de sortie d'un écran (D-172) : tant que `modifie`, toute navigation qui quitte l'écran (menu, lien,
 * boutons de semaine ou de mois, retour du navigateur, déconnexion) ouvre « Abandonner les modifications ? »,
 * et le rechargement ou la fermeture de l'onglet affiche le message du navigateur.
 */
export function GardeSortie({ modifie }: { modifie: boolean }) {
  const [attente, setAttente] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!modifie) return;
    const retirer = enregistrerGarde({ demander: (action) => setAttente(() => action) });
    const avantDecharger = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avantDecharger);
    return () => {
      retirer();
      window.removeEventListener('beforeunload', avantDecharger);
    };
  }, [modifie]);

  if (!attente) return null;
  return (
    <Confirmation
      titre="Abandonner les modifications ?"
      description="Les modifications non enregistrées seront perdues."
      libelleConfirmer="Abandonner"
      action={async () => undefined}
      onSucces={() => {
        const action = attente;
        setAttente(null);
        sansConfirmation(action);
      }}
      onAnnuler={() => setAttente(null)}
    />
  );
}
