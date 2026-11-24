import { Case } from '../components/Case';
import { navigate } from '../router';

/**
 * Case « Initiales » : état dans l'adresse, les autres paramètres sont conservés. Par défaut décochée
 * (`initiales=1` quand cochée) ; `cocheeParDefaut` (Accueil, D-218 (4)) : `initiales=0` quand décochée.
 */
export function CaseInitiales({
  actif,
  chemin,
  cocheeParDefaut = false,
}: {
  actif: boolean;
  chemin: string;
  cocheeParDefaut?: boolean;
}) {
  const basculer = (coche: boolean) => {
    const parametres = new URLSearchParams(window.location.search);
    if (coche === cocheeParDefaut) parametres.delete('initiales');
    else parametres.set('initiales', cocheeParDefaut ? '0' : '1');
    const suite = parametres.toString();
    navigate(suite ? `${chemin}?${suite}` : chemin);
  };
  return <Case label="Initiales" checked={actif} onChange={(e) => basculer(e.target.checked)} />;
}
