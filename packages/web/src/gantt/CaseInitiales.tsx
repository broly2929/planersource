import { Case } from '../components/Case';
import { navigate } from '../router';

/** Case « Initiales » : état dans l'adresse (`initiales=1`), les autres paramètres sont conservés. */
export function CaseInitiales({ actif, chemin }: { actif: boolean; chemin: string }) {
  const basculer = (coche: boolean) => {
    const parametres = new URLSearchParams(window.location.search);
    if (coche) parametres.set('initiales', '1');
    else parametres.delete('initiales');
    const suite = parametres.toString();
    navigate(suite ? `${chemin}?${suite}` : chemin);
  };
  return <Case label="Initiales" checked={actif} onChange={(e) => basculer(e.target.checked)} />;
}
