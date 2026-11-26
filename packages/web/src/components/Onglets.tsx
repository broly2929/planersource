import * as Tabs from '@radix-ui/react-tabs';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { ONGLET } from '../screens/projet/commun';

/** Onglets d'un écran (D-247), au modèle de l'écran Utilisateurs (D-165) : liste `role="tablist"`, contenu de l'onglet actif. */
export interface EtatOnglets {
  libelle: string;
  onglets: { valeur: string; titre: string }[];
  actif: string;
  changer: (valeur: string) => void;
}

const Contexte = createContext<EtatOnglets | null>(null);

/**
 * Le changement d'onglet remplace l'écran entier (chaque onglet garde son titre h1) : le focus est
 * rendu à l'onglet actif au montage suivant, pour que la navigation au clavier continue.
 */
let rendreLeFocus = false;

export function FournisseurOnglets({ etat, children }: { etat: EtatOnglets; children: ReactNode }) {
  const valeur: EtatOnglets = {
    ...etat,
    changer: (v) => {
      rendreLeFocus = true;
      etat.changer(v);
    },
  };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** Entoure le corps d'un écran : liste d'onglets au-dessus du contenu ; sans fournisseur, le contenu seul. */
export function Onglets({ children }: { children: ReactNode }) {
  const etat = useContext(Contexte);
  useEffect(() => {
    if (!rendreLeFocus) return;
    rendreLeFocus = false;
    document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, []);
  if (!etat) return <>{children}</>;
  return (
    <Tabs.Root value={etat.actif} onValueChange={etat.changer} className="flex flex-col gap-4">
      <Tabs.List aria-label={etat.libelle} className="flex gap-2 border-b border-gray-200">
        {etat.onglets.map((o) => (
          <Tabs.Trigger key={o.valeur} value={o.valeur} className={ONGLET}>
            {o.titre}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value={etat.actif}>{children}</Tabs.Content>
    </Tabs.Root>
  );
}
