import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Confirmation } from './Confirmation';
import { champsDe, instantane, modifie, type Instantane } from './garde-dialogue';

/** Contrôle de fermeture fourni par le dialogue à ses enfants (D-188 (6), (10) b). */
interface ControleDialogue {
  /** Ferme avec la garde : confirmation si le formulaire est modifié. */
  demanderFermeture: () => void;
  declarerEnvoi: (enCours: boolean) => void;
  declarerPret: (pret: boolean) => void;
}
const Controle = createContext<ControleDialogue | null>(null);

/** Signale que le contenu du dialogue n'est pas prêt (lecture en cours) : aucun geste n'est retenu tant que `pret` est faux. */
export function useDialoguePret(pret: boolean): void {
  const controle = useContext(Controle);
  const declarer = controle?.declarerPret;
  useEffect(() => {
    declarer?.(pret);
    return () => declarer?.(true);
  }, [declarer, pret]);
}

/**
 * Fermeture d'un formulaire de dialogue : passe par la garde du dialogue englobant (confirmation si le
 * formulaire est modifié, D-188 (6)) ; `repli` hors dialogue.
 */
export function useFermeture(repli: () => void): () => void {
  const controle = useContext(Controle);
  return () => (controle ? controle.demanderFermeture() : repli());
}

/** Signale au dialogue englobant qu'un envoi est en cours : aucune confirmation pendant l'envoi (D-188 (5)). */
export function useEnvoiEnCours(enCours: boolean): void {
  const declarer = useContext(Controle)?.declarerEnvoi;
  useEffect(() => {
    declarer?.(enCours);
    return () => declarer?.(false);
  }, [declarer, enCours]);
}

const STRICT = !import.meta.env.PROD;

export function Dialog({
  ouvert,
  onOuvertChange,
  titre,
  description,
  children,
  large = false,
  sansGarde = false,
  modifie: modifieProp,
  focusRetour,
  focusInitial,
}: {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  titre: string;
  description: string;
  children: ReactNode;
  /** Dialogue large (tableau de la feuille de temps, D-135 (4)). */
  large?: boolean;
  /** Dialogue d'action ou de lecture : aucune confirmation à la fermeture (D-188 (7)). */
  sansGarde?: boolean;
  /** Soupape (D-188 (1)) : remplace la comparaison des champs, pour un état absent du DOM. */
  modifie?: boolean;
  /** Élément qui reprend le focus à la fermeture (à la place du déclencheur absent de Radix). */
  focusRetour?: (() => HTMLElement | null) | undefined;
  /** Sélecteur de l'élément qui prend le focus à l'ouverture, à la place du premier élément focalisable (D-190 (4)). */
  focusInitial?: string | undefined;
}) {
  const contenu = useRef<HTMLDivElement>(null);
  const reference = useRef<Instantane | null>(null);
  const envoi = useRef(false);
  const pret = useRef(true);
  const focusAuto = useRef(false);
  const dernier = useRef({ onOuvertChange, modifieProp, sansGarde, titre });
  dernier.current = { onOuvertChange, modifieProp, sansGarde, titre };
  const [confirmation, setConfirmation] = useState(false);
  /** Confirmation ouverte ou en cours d'ouverture, posé de façon synchrone à la première demande (D-195). */
  const confirmationEnCours = useRef(false);
  const avantConfirmation = useRef<HTMLElement | null>(null);

  /** « Rester » : la confirmation se ferme, le dialogue reste ouvert avec sa saisie. */
  const fermerConfirmation = useCallback(() => {
    confirmationEnCours.current = false;
    setConfirmation(false);
  }, []);

  useEffect(() => {
    if (!ouvert) {
      reference.current = null;
      fermerConfirmation();
    }
  }, [ouvert, fermerConfirmation]);

  /** Première référence : au premier geste dans les champs du dialogue, une fois le contenu prêt (D-188 (4)). */
  const prendreReference = () => {
    if (dernier.current.sansGarde || reference.current || !pret.current) return;
    const champs = contenu.current ? champsDe(contenu.current) : [];
    if (champs.length > 0) reference.current = instantane(champs, dernier.current.titre, STRICT);
  };

  const demanderFermeture = useCallback(() => {
    const {
      onOuvertChange: changer,
      modifieProp: soupape,
      sansGarde: libre,
      titre: nom,
    } = dernier.current;
    if (libre || envoi.current) return changer(false);
    // Demande reçue pendant la confirmation (ouverte ou en cours d'ouverture) : ignorée (D-195).
    if (confirmationEnCours.current) return;
    let modifiee: boolean;
    if (soupape !== undefined) modifiee = soupape;
    else {
      modifiee =
        !!contenu.current &&
        modifie(reference.current, instantane(champsDe(contenu.current), nom, STRICT));
    }
    if (modifiee) {
      avantConfirmation.current = document.activeElement as HTMLElement | null;
      confirmationEnCours.current = true;
      setConfirmation(true);
    } else changer(false);
  }, []);

  const controle = useRef<ControleDialogue>({
    demanderFermeture,
    declarerEnvoi: (enCours) => {
      envoi.current = enCours;
    },
    declarerPret: (p) => {
      pret.current = p;
    },
  });

  return (
    <RadixDialog.Root
      open={ouvert}
      onOpenChange={(o) => (o ? onOuvertChange(true) : demanderFermeture())}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-gray-900/40" />
        <RadixDialog.Content
          ref={contenu}
          onPointerDownCapture={prendreReference}
          onKeyDownCapture={prendreReference}
          onFocusCapture={() => !focusAuto.current && prendreReference()}
          onEscapeKeyDown={(e) => {
            if (!confirmationEnCours.current) return;
            // Échap reçu par ce dialogue alors que la confirmation est ouverte : Radix ne lui a pas encore
            // passé l'écoute (mise à jour différée). Focus dans la confirmation : « Rester » ; sinon, ignoré (D-195).
            e.preventDefault();
            const autre = document.activeElement?.closest('[role="dialog"]');
            if (autre && autre !== contenu.current) fermerConfirmation();
          }}
          onCloseAutoFocus={(e) => {
            if (!focusRetour) return;
            e.preventDefault();
            focusRetour()?.focus();
          }}
          onOpenAutoFocus={(e) => {
            // Focus automatique de Radix à l'ouverture : pas un geste de l'utilisateur (D-188 (11)).
            focusAuto.current = true;
            setTimeout(() => (focusAuto.current = false), 0);
            const cible = focusInitial
              ? contenu.current?.querySelector<HTMLElement>(focusInitial)
              : null;
            if (cible) {
              e.preventDefault();
              cible.focus();
            }
          }}
          className={`fixed z-50 top-1/2 left-1/2 max-h-screen w-11/12 ${large ? 'max-w-5xl' : 'max-w-md'} overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-ui border border-gray-200 bg-white p-6 shadow-ui`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-titre font-semibold">{titre}</RadixDialog.Title>
              <RadixDialog.Description className="text-gray-600">
                {description}
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close
              aria-label="Fermer"
              className="rounded-ui p-1 text-gray-600 hover:bg-gray-100"
            >
              <X aria-hidden className="size-4" />
            </RadixDialog.Close>
          </div>
          <Controle.Provider value={controle.current}>{children}</Controle.Provider>
          {confirmation && (
            <Confirmation
              titre="Abandonner les modifications ?"
              description="Les modifications non enregistrées seront perdues."
              libelleConfirmer="Abandonner"
              action={async () => undefined}
              onSucces={() => {
                fermerConfirmation();
                onOuvertChange(false);
              }}
              onAnnuler={fermerConfirmation}
              focusRetour={() => avantConfirmation.current}
            />
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
