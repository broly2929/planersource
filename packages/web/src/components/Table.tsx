import type { ReactNode, Ref } from 'react';
import { MARGES_CELLULE, MARGES_CELLULE_SERREE } from '../gantt/largeurs';

export interface Colonne<T> {
  /** Identifiant stable (colonnes du Gantt, D-212 (4)) : attribut `data-colonne` de l'en-tête. */
  id?: string;
  titre: string;
  cellule: (ligne: T) => ReactNode;
  /** Classes ajoutées à la cellule d'une ligne (ex. couleur d'une valeur négative) ; en plus de `classeCellule`. */
  classeCelluleLigne?: (ligne: T) => string;
  /** Attribut `title` de la cellule d'une ligne (texte complet d'un contenu tronqué). */
  titreCellule?: (ligne: T) => string | undefined;
  /** Classes ajoutées à l'en-tête et aux cellules de la colonne (ex. colonne figée). */
  classeEntete?: string;
  classeCellule?: string;
  /** Tableau compact : marges internes d'un pas (`px-1`) au lieu de deux. */
  serree?: boolean;
  /** Tableau compact : largeur réglée de la colonne en pixels, marges comprises ; contenu tronqué (D-212 (4)). */
  largeur?: number;
}

/**
 * Contenu d'une cellule dans une colonne de largeur réglée : boîte de largeur fixe, débordement coupé ; `data-cadre`
 * permet au contenu de s'y adapter (variante `in-data-cadre:`).
 */
function Cadre({ largeur, children }: { largeur: number | undefined; children: ReactNode }) {
  if (largeur === undefined) return children;
  return (
    <div data-cadre style={{ width: largeur }} className="truncate">
      {children}
    </div>
  );
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
  poigneeLargeur,
}: {
  legende: string;
  colonnes: Colonne<T>[];
  lignes: T[];
  cle: (ligne: T) => string | number;
  /**
   * Lignes de 32 px, sans cadre ni défilement propre (le parent défile) : tableau du Gantt. Largeur naturelle,
   * jamais étirée (mesure du minimum, D-212 (2)) ; en-têtes figés en haut de la zone (D-212 (3)).
   */
  compact?: boolean;
  /** Attributs `data-*` ajoutés à la ligne (marqueurs des tests et de l'apparence). */
  attributsLigne?: (ligne: T) => Record<`data-${string}`, string | number | undefined>;
  /** Rend le tableau focalisable par programme (`tabIndex=-1`, hors tabulation) et donne accès à son élément. */
  tableRef?: Ref<HTMLTableElement>;
  /** Tableau compact : poignée de largeur rendue au bord droit de chaque en-tête (D-212 (4)). */
  poigneeLargeur?: (colonne: Colonne<T>) => ReactNode;
}) {
  const interieur = (c: Colonne<T>) =>
    c.largeur === undefined
      ? undefined
      : c.largeur - (c.serree ? MARGES_CELLULE_SERREE : MARGES_CELLULE);
  return (
    <div
      className={
        compact ? '' : 'overflow-x-auto rounded-ui border border-gray-200 bg-white shadow-ui'
      }
    >
      <table
        ref={tableRef}
        tabIndex={tableRef ? -1 : undefined}
        className={`${compact ? 'w-max' : 'w-full'} border-collapse text-left`}
      >
        <caption className="sr-only">{legende}</caption>
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            {colonnes.map((c) => (
              <th
                key={c.id ?? c.titre}
                scope="col"
                data-colonne={c.id}
                // Nom de l'en-tête sans celui de la poignée qu'il contient.
                aria-label={poigneeLargeur ? c.titre : undefined}
                className={`font-semibold whitespace-nowrap ${compact ? 'sticky top-0 z-10 h-16 bg-gray-100 px-2 inset-shadow-trait' : 'border-b border-gray-200 px-3 py-2'} ${c.serree ? 'px-1!' : ''} ${c.classeEntete ?? ''}`}
              >
                <Cadre largeur={interieur(c)}>{c.titre}</Cadre>
                {poigneeLargeur?.(c)}
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
                  key={c.id ?? c.titre}
                  title={c.titreCellule?.(ligne)}
                  className={`${compact ? 'h-8 px-2 whitespace-nowrap' : 'px-3 py-2'} ${c.serree ? 'px-1!' : ''} ${c.classeCellule ?? ''} ${c.classeCelluleLigne?.(ligne) ?? ''}`}
                >
                  <Cadre largeur={interieur(c)}>{c.cellule(ligne)}</Cadre>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
