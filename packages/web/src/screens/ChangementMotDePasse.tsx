import { useState } from 'react';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { LogOut } from 'lucide-react';
import { navigate, sortir } from '../router';
import { FormulaireDialogue } from './projet/commun';

const CONFIRMATION_DIFFERENTE = 'La confirmation ne correspond pas.';

/** Formulaire de changement de mot de passe, commun au dialogue et à la page imposée (D-254). */
export function FormulaireMotDePasse({
  onSucces,
  onAnnuler,
}: {
  onSucces: () => void;
  onAnnuler?: () => void;
}) {
  const { changerMotDePasse } = useAuth();
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      valider={() => (confirmation !== nouveau ? CONFIRMATION_DIFFERENTE : null)}
      envoyer={() => changerMotDePasse(actuel, nouveau)}
      onSucces={onSucces}
      {...(onAnnuler ? { onAnnuler } : {})}
      texteErreur={(err) =>
        err instanceof ApiError && err.erreur
          ? err.erreur
          : 'Opération impossible pour le moment. Réessayez.'
      }
    >
      <Field
        label="Mot de passe actuel"
        type="password"
        autoComplete="current-password"
        required
        value={actuel}
        onChange={(e) => setActuel(e.target.value)}
      />
      <Field
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        required
        value={nouveau}
        onChange={(e) => setNouveau(e.target.value)}
      />
      <Field
        label="Confirmation"
        type="password"
        autoComplete="new-password"
        required
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

/** Page affichée à la place de l'application tant que le changement est exigé (D-254) : ni menu ni barre latérale. */
export function ChangementMotDePasse() {
  const { logout } = useAuth();
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-titre font-semibold">Changez votre mot de passe</h1>
      <p className="text-gray-600">
        Vous devez choisir un nouveau mot de passe avant d’utiliser l’application.
      </p>
      {/* Le succès bascule l'état : l'application normale remplace cette page, à l'arrivée du rôle
          (D-256 : « / », que « / » renvoie vers /mes-taches pour le rôle ressource, comme après la connexion). */}
      <FormulaireMotDePasse onSucces={() => navigate('/', { replace: true })} />
      <div>
        <Button
          variante="secondaire"
          onClick={() => sortir(() => void logout().catch(() => undefined))}
        >
          <LogOut aria-hidden className="size-4" />
          Se déconnecter
        </Button>
      </div>
    </main>
  );
}
