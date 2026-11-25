import { Fragment } from 'react';
import type { AssignationGantt } from './GanttSvg';
import { formaterNombre } from './libelles';

/**
 * Colonne « Ressources » (D-238) : une entrée par assignation, séparées par « , » ; initiales de la ressource,
 * ou son nom sans initiales ; infobulle « <nom> — <charge> j ». Avec `modifier`, chaque entrée est un bouton
 * (apparence de lien) ; sans, un texte avec infobulle.
 */
export function CelluleRessources({
  assignations,
  nomActivite,
  modifier,
}: {
  assignations: AssignationGantt[] | undefined;
  nomActivite: string;
  modifier: ((a: AssignationGantt) => void) | null;
}) {
  if (!assignations || assignations.length === 0) return null;
  return (
    <>
      {assignations.map((a, i) => {
        const texte = a.initiales ?? a.nom;
        const titre = `${a.nom} — ${formaterNombre(a.charge_assignee)} j`;
        return (
          <Fragment key={a.id}>
            {i > 0 && ', '}
            {modifier ? (
              <button
                type="button"
                title={titre}
                onClick={() => modifier(a)}
                className="cursor-pointer text-left text-accent underline focus-visible:rounded-ui"
                aria-label={`Modifier l'assignation de ${a.nom} à ${nomActivite}`}
              >
                {texte}
              </button>
            ) : (
              <span title={titre}>{texte}</span>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
