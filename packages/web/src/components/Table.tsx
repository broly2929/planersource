import type { ReactNode, Ref } from 'react';

export interface Colonne<T> {
  titre: string;
  cellule: (ligne: T) => ReactNode;
  /** Classes ajoutées à la cellule d'une ligne (ex. couleur d'une valeur négative) ; en plus de `classeCellule`. */
  classeCelluleLigne?: (ligne: T) => string;
  /** Classes ajoutées à l'en-tête et aux cellules de la colonne (ex. colonne figée). */
  classeEntete?: string;
  classeCellule?: string;
}

/**
 * Apparence du glisser de ligne (D-108) : ligne source atténuée ; trait d'insertion en ombre interne des
 * cellules (aucun décalage de mise en page) ; zone « dans » surlignée.
 */
const CLASSES_GLISSER = [
  'data-[ligne-source]:opacity-50',
  'data-[insertion=avant]:[&>td]:shadow-[inset_0_2px_0_0_var(--color-accent)]',
  'data-[insertion=apres]:[&>td]:shadow-[inset_0_-2px_0_0_var(--color-accent)]',
  'data-[insertion=dans]:[&>td]:bg-accent-bg',
].join(' ');

export function Table<T>({
  legende,
  colonnes,
  lignes,
  cle,
  compact = false,
  attributsLigne,
  tableRef,
}: {
  legende: string;
  colonnes: Colonne<T>[];
  lignes: T[];
  cle: (ligne: T) => string | number;
  /** Lignes de 32 px, sans cadre ni défilement propre (le parent défile) : tableau du Gantt. */
  compact?: boolean;
  /** Attributs `data-*` ajoutés à la ligne (marqueurs des tests et de l'apparence). */
  attributsLigne?: (ligne: T) => Record<`data-${string}`, string | number | undefined>;
  /** Rend le tableau focalisable par programme (`tabIndex=-1`, hors tabulation) et donne accès à son élément. */
  tableRef?: Ref<HTMLTableElement>;
}) {
  return (
    <div
      className={
        compact ? '' : 'overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui'
      }
    >
      <table
        ref={tableRef}
        tabIndex={tableRef ? -1 : undefined}
        className="w-full border-collapse text-left"
      >
        <caption className="sr-only">{legende}</caption>
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            {colonnes.map((c) => (
              <th
                key={c.titre}
                scope="col"
                className={`border-b border-gray-200 font-semibold whitespace-nowrap ${compact ? 'h-16 px-2' : 'px-3 py-2'} ${c.classeEntete ?? ''}`}
              >
                {c.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr
              key={cle(ligne)}
              {...attributsLigne?.(ligne)}
              className={`group border-b border-gray-200 hover:bg-gray-50 data-[deplacee]:bg-accent-bg data-[deplacee]:hover:bg-accent-bg ${compact ? CLASSES_GLISSER : 'last:border-b-0'}`}
            >
              {colonnes.map((c) => (
                <td
                  key={c.titre}
                  className={`${compact ? 'h-8 px-2 whitespace-nowrap' : 'px-3 py-2'} ${c.classeCellule ?? ''} ${c.classeCelluleLigne?.(ligne) ?? ''}`}
                >
                  {c.cellule(ligne)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
