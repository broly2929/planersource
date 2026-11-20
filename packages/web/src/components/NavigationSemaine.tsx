import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { decalerSemaine, libelleSemaine, lundiDe } from '../imputations/logique';

/**
 * Boutons de semaine et libellé, partagés par la Feuille de temps (4b) et la Validation (4c, D-135 (2)).
 * Fragment : les éléments restent des enfants directs de la barre d'outils de l'écran.
 */
export function NavigationSemaine({
  semaine,
  aujourdhui,
  onChanger,
}: {
  semaine: string;
  aujourdhui: string;
  onChanger: (cible: string) => void;
}) {
  return (
    <>
      <Button
        variante="secondaire"
        className="px-2!"
        onClick={() => onChanger(decalerSemaine(semaine, -1))}
      >
        <ChevronLeft aria-hidden className="size-4" />
        Semaine précédente
      </Button>
      <Button
        variante="secondaire"
        className="px-2!"
        onClick={() => onChanger(lundiDe(aujourdhui))}
      >
        Cette semaine
      </Button>
      <Button
        variante="secondaire"
        className="px-2!"
        onClick={() => onChanger(decalerSemaine(semaine, 1))}
      >
        Semaine suivante
        <ChevronRight aria-hidden className="size-4" />
      </Button>
      <p className="px-1 font-semibold whitespace-nowrap">{libelleSemaine(semaine)}</p>
    </>
  );
}
