import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as EvenementPointeur,
  type ReactNode,
  type Ref,
  type RefCallback,
} from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, Columns3 } from 'lucide-react';
import { Button } from '../components/Button';
import type { Colonne } from '../components/Table';
import {
  avecColonne,
  avecLargeur,
  bornerColonne,
  bornerLargeur,
  colonnesAffichees,
  colonnesDuMenu,
  ecrireDisposition,
  LARGEUR_DEFAUT_COLONNE,
  largeurParDefaut,
  lireDisposition,
  stockageNavigateur,
  type Disponibles,
  type Disposition,
  type VueGantt,
} from './disposition';
import {
  HAUTEUR_VUE_MIN,
  PART_TABLEAU_MAX,
  PAS_COLONNE,
  PAS_SEPARATEUR,
  TABLEAU_MIN,
} from './largeurs';

/** Pas du défilement vertical par flèche haut ou bas dans la zone du tableau. */
const PAS_DEFILEMENT = 40;

type PropsZone = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };

/** Une ref qui en alimente plusieurs (objet ou fonction, avec la fonction de nettoyage de React 19). */
function fusionner<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (noeud) => {
    const nettoyages: (() => void)[] = [];
    for (const ref of refs) {
      if (typeof ref === 'function') {
        const n = ref(noeud);
        nettoyages.push(typeof n === 'function' ? n : () => ref(null));
      } else if (ref) {
        ref.current = noeud;
        nettoyages.push(() => {
          ref.current = null;
        });
      }
    }
    return () => nettoyages.forEach((n) => n());
  };
}

/** Plus proche ancêtre qui défile verticalement, ou null (le document). */
function ancetreDefilant(noeud: HTMLElement): HTMLElement | null {
  for (let p = noeud.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === 'auto' || o === 'scroll') return p;
  }
  return null;
}

/** Hauteur de la vue : de son bord haut (page non défilée) au bas de la fenêtre, au moins 320 px. */
function hauteurDisponible(vue: HTMLElement): number {
  const parent = ancetreDefilant(vue);
  const haut = vue.getBoundingClientRect().top + (parent ? parent.scrollTop : window.scrollY);
  const marge = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
  return Math.max(HAUTEUR_VUE_MIN, Math.floor(window.innerHeight - marge - haut));
}

/**
 * Réglages d'une vue à deux zones (D-212 (4), (5), D-216) : largeur du tableau, colonnes affichées, largeurs des
 * colonnes ; lus dans le stockage du navigateur, écrits à chaque réglage (pas pendant un glisser).
 */
export function useDispositionGantt(vue: VueGantt, disponibles: Disponibles) {
  const [disposition, setDisposition] = useState<Disposition>(() =>
    lireDisposition(stockageNavigateur(), vue),
  );
  /** Applique `f` ; `garder` : écrit le résultat dans le stockage. */
  const changer = useCallback(
    (f: (d: Disposition) => Disposition, garder: boolean) =>
      setDisposition((d) => {
        const n = f(d);
        if (garder) ecrireDisposition(stockageNavigateur(), vue, n);
        return n;
      }),
    [vue],
  );
  const vendu = disponibles.vendu;
  return useMemo(() => {
    const dispo = { vendu };
    const affichees = colonnesAffichees(vue, disposition, dispo);
    return {
      vue,
      disponibles: dispo,
      disposition,
      affichees,
      /** Largeur du tableau : `garder` faux pendant un glisser ; `undefined` = défaut. */
      tableau: (largeur: number | undefined, garder = true) =>
        changer((d) => {
          const n = { ...d };
          if (largeur === undefined) delete n.tableau;
          else n.tableau = largeur;
          return n;
        }, garder),
      basculer: (id: string, affichee: boolean) =>
        changer((d) => avecColonne(d, id, affichee), true),
      largeurColonne: (id: string, largeur: number | undefined, garder = true) =>
        changer((d) => avecLargeur(d, id, largeur), garder),
      retablir: () => changer(() => ({}), true),
      /**
       * Colonnes du tableau : celles de la vue affichées, dans l'ordre de `colonnes`, avec leur largeur réglée.
       * Chaque colonne porte l'identifiant de sa définition (`COLONNES_GANTT`).
       */
      colonnes: <T,>(colonnes: (Colonne<T> & { id: string })[]): Colonne<T>[] =>
        colonnes
          .filter((c) => affichees.includes(c.id))
          .map((c) => {
            const largeur = disposition.largeurs?.[c.id] ?? LARGEUR_DEFAUT_COLONNE[c.id];
            return largeur === undefined ? c : { ...c, largeur: bornerColonne(vue, c.id, largeur) };
          }),
    };
  }, [vue, vendu, disposition, changer]);
}

export type EtatDisposition = ReturnType<typeof useDispositionGantt>;

/** Bouton « Colonnes » et son menu à cases à cocher (D-212 (4), D-216 (2)) ; le menu reste ouvert au cochage. */
export function MenuColonnes({ etat }: { etat: EtatDisposition }) {
  const bouton = useRef<HTMLButtonElement | null>(null);
  // Non modal : le tableau reste lisible (et accessible) pendant les cochages ; le focus revient toujours au
  // bouton à la fermeture, y compris après un clic hors du menu (D-216 (2)).
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild ref={bouton}>
        <Button variante="secondaire">
          <Columns3 aria-hidden className="size-4" />
          Colonnes
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="start"
          sideOffset={4}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            bouton.current?.focus();
          }}
          className="z-50 min-w-56 rounded-ui border border-gray-200 bg-white p-1 text-normal text-gray-800 shadow-ui"
        >
          {colonnesDuMenu(etat.vue, etat.disponibles).map((c) => (
            <Menu.CheckboxItem
              key={c.id}
              checked={etat.affichees.includes(c.id)}
              onCheckedChange={(coche) => etat.basculer(c.id, coche === true)}
              onSelect={(e) => e.preventDefault()}
              className="flex h-8 cursor-default items-center gap-2 rounded-ui px-3 whitespace-nowrap select-none focus-visible:outline-offset-[-2px] data-[highlighted]:bg-accent-bg data-[highlighted]:text-gray-900"
            >
              <span aria-hidden className="flex size-4 items-center justify-center">
                <Menu.ItemIndicator>
                  <Check className="size-4 text-accent" />
                </Menu.ItemIndicator>
              </span>
              {c.titre}
            </Menu.CheckboxItem>
          ))}
          <Menu.Separator className="my-1 h-px bg-gray-200" />
          <Menu.Item
            onSelect={etat.retablir}
            className="flex h-8 cursor-default items-center rounded-ui pr-3 pl-9 whitespace-nowrap select-none focus-visible:outline-offset-[-2px] data-[highlighted]:bg-accent-bg data-[highlighted]:text-gray-900"
          >
            Rétablir l'affichage par défaut
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Poignée de largeur au bord droit d'un en-tête (D-212 (4)) : glisser, flèches gauche et droite (16 px),
 * double-clic ou Entrée = largeur par défaut. `aria-valuenow` : largeur réglée, sinon largeur mesurée.
 */
function PoigneeColonne({
  titre,
  reglee,
  minimum,
  borner,
  regler,
}: {
  titre: string;
  reglee: number | undefined;
  minimum: number;
  borner: (largeur: number) => number;
  regler: (largeur: number | undefined, garder?: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mesuree, setMesuree] = useState<number | null>(null);
  const glisse = useRef<{ x0: number; l0: number; r0?: number | undefined } | null>(null);
  useLayoutEffect(() => {
    const th = ref.current?.parentElement;
    if (!th) return;
    const mesurer = () => setMesuree(Math.round(th.getBoundingClientRect().width));
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(th);
    return () => observateur.disconnect();
  }, []);
  // Remesure après chaque rendu du tableau (lignes chargées) : `aria-valuenow` à jour dès l'affichage, sans
  // attendre le ResizeObserver, qui suit seulement les autres changements de largeur.
  useLayoutEffect(() => {
    const th = ref.current?.parentElement;
    if (!th) return;
    const m = Math.round(th.getBoundingClientRect().width);
    if (m !== mesuree) setMesuree(m);
  });
  const actuelle = reglee ?? mesuree;

  const surTouche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (actuelle === null) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      regler(borner(actuelle + (e.key === 'ArrowRight' ? PAS_COLONNE : -PAS_COLONNE)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      regler(undefined);
    }
  };
  const evenements = {
    onPointerDown: (e: EvenementPointeur<HTMLDivElement>) => {
      e.stopPropagation();
      if (e.button !== 0 || !e.isPrimary || actuelle === null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      glisse.current = { x0: e.clientX, l0: actuelle, r0: reglee };
    },
    onPointerMove: (e: EvenementPointeur<HTMLDivElement>) => {
      const g = glisse.current;
      if (!g || !e.isPrimary) return;
      if (e.clientX !== g.x0) regler(borner(g.l0 + e.clientX - g.x0), false);
    },
    onPointerUp: (e: EvenementPointeur<HTMLDivElement>) => {
      const g = glisse.current;
      if (!g || !e.isPrimary) return;
      glisse.current = null;
      // Revenu au point de départ : largeur enregistrée au départ rétablie, sans largeur intermédiaire (D-218 (8)).
      regler(e.clientX !== g.x0 ? borner(g.l0 + e.clientX - g.x0) : g.r0);
    },
    onPointerCancel: () => {
      const g = glisse.current;
      glisse.current = null;
      if (g) regler(g.r0);
    },
  };
  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={`Largeur de la colonne ${titre}`}
      aria-valuenow={actuelle ?? undefined}
      aria-valuemin={minimum}
      onKeyDown={surTouche}
      onDoubleClick={() => regler(undefined)}
      onClick={(e) => e.stopPropagation()}
      {...evenements}
      className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-offset-[-2px] active:bg-accent"
    />
  );
}

/** Rendu de la poignée d'un en-tête de colonne, pour `Table` (`poigneeLargeur`). */
export function poigneeColonne(etat: EtatDisposition) {
  return function rendre<T>(c: Colonne<T>): ReactNode {
    if (!c.id) return null;
    const id = c.id;
    return (
      <PoigneeColonne
        titre={c.titre}
        reglee={c.largeur}
        minimum={bornerColonne(etat.vue, id, 0)}
        borner={(l) => bornerColonne(etat.vue, id, l)}
        regler={(l, garder) => etat.largeurColonne(id, l, garder)}
      />
    );
  };
}

/**
 * Largeur minimale du tableau (critère D-069 (a) et (b)) : deux premières colonnes et colonne Drapeaux (fixée à
 * droite) si elle est affichée ; le tableau n'est jamais étiré.
 */
function minimumTableau(table: HTMLTableElement | null): number {
  const entetes = table?.tHead?.rows[0]?.cells;
  if (!entetes || entetes.length < 2) return 0;
  // Boîtes et non `offsetLeft` : un en-tête figé (`sticky`) a pour référence un ancêtre lointain.
  const gauche = table!.getBoundingClientRect().left;
  const droite = entetes[1]!.getBoundingClientRect().right;
  const drapeaux = table!.tHead!.querySelector('th[data-colonne="drapeaux"]');
  return Math.ceil(droite - gauche + (drapeaux?.getBoundingClientRect().width ?? 0));
}

/**
 * Disposition commune des vues à deux zones (D-212 (2), (3), (5)) : tableau à gauche, séparateur, calendrier
 * à droite. Hauteur limitée à la fenêtre, défilement vertical commun, en-têtes figés (celui du calendrier par
 * la variable `--defilement-gantt`, lue par `GanttSvg`), largeur du tableau gardée dans le stockage.
 */
export function DispositionGantt({
  etat,
  propsTableau,
  propsCalendrier,
  tableau,
  calendrier,
  children,
}: {
  /** Réglages de la vue (`useDispositionGantt`). */
  etat: EtatDisposition;
  propsTableau: PropsZone & { 'aria-label': string };
  propsCalendrier: PropsZone & { 'aria-label': string };
  tableau: ReactNode;
  calendrier: ReactNode;
  /** Contenu ajouté dans la vue, hors des zones (annonces `aria-live`). */
  children?: ReactNode;
}) {
  const refVue = useRef<HTMLDivElement | null>(null);
  const refTableau = useRef<HTMLDivElement | null>(null);
  const refCalendrier = useRef<HTMLDivElement | null>(null);
  const [largeurVue, setLargeurVue] = useState(0);
  const [minimum, setMinimum] = useState(0);
  const [hauteur, setHauteur] = useState<number | null>(null);
  const reglee = etat.disposition.tableau;
  const [marges, setMarges] = useState({ tableau: 0, calendrier: 0 });
  const glisse = useRef<{ x0: number; l0: number } | null>(null);

  const largeur =
    largeurVue === 0
      ? null
      : reglee === undefined
        ? largeurParDefaut(largeurVue, minimum)
        : bornerLargeur(reglee, largeurVue);
  const maximum = Math.max(TABLEAU_MIN, Math.floor(largeurVue * PART_TABLEAU_MAX));

  // Mesures : largeur de la vue, minimum du tableau, barres de défilement horizontales des deux zones.
  const mesurer = useCallback(() => {
    const v = refVue.current;
    const t = refTableau.current;
    const c = refCalendrier.current;
    if (!v || !t || !c) return;
    setLargeurVue(v.clientWidth);
    setMinimum(minimumTableau(t.querySelector('table')));
    // Barre horizontale d'une zone : hauteur hors zone cliente. La zone sans barre (ou à barre plus fine)
    // reçoit la différence en marge basse, pour que les deux défilent jusqu'à la même position.
    const barre = (z: HTMLElement) => z.offsetHeight - z.clientHeight;
    const bt = barre(t);
    const bc = barre(c);
    setMarges((m) => {
      const n = { tableau: Math.max(0, bc - bt), calendrier: Math.max(0, bt - bc) };
      return n.tableau === m.tableau && n.calendrier === m.calendrier ? m : n;
    });
  }, []);

  useLayoutEffect(() => {
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    for (const n of [
      refVue.current,
      refTableau.current,
      refCalendrier.current,
      refTableau.current?.firstElementChild,
      refCalendrier.current?.firstElementChild,
      // Le tableau lui-même (largeur naturelle) : une cellule qui s'élargit change le minimum.
      refTableau.current?.querySelector('table'),
    ]) {
      if (n) observateur.observe(n);
    }
    return () => observateur.disconnect();
  }, [mesurer]);

  // Hauteur : recalculée à chaque rendu (un bandeau au-dessus peut apparaître) et au redimensionnement.
  useLayoutEffect(() => {
    if (!refVue.current) return;
    const h = hauteurDisponible(refVue.current);
    if (h !== hauteur) setHauteur(h);
  });
  useEffect(() => {
    const surRedimension = () => {
      if (refVue.current) setHauteur(hauteurDisponible(refVue.current));
    };
    window.addEventListener('resize', surRedimension);
    return () => window.removeEventListener('resize', surRedimension);
  }, []);

  const regler = (valeur: number | undefined) => etat.tableau(valeur);

  // Défilement vertical commun : chaque zone recopie la position de l'autre.
  const synchroniser = (source: HTMLElement | null, cible: HTMLElement | null) => {
    if (!source || !cible) return;
    if (cible.scrollTop !== source.scrollTop) cible.scrollTop = source.scrollTop;
    refCalendrier.current?.style.setProperty(
      '--defilement-gantt',
      `${refCalendrier.current.scrollTop}px`,
    );
  };

  const {
    ref: refExterneTableau,
    className: classeTableau,
    onKeyDown: toucheTableau,
    ...resteTableau
  } = propsTableau;
  const {
    ref: refExterneCalendrier,
    className: classeCalendrier,
    ...resteCalendrier
  } = propsCalendrier;

  const refsTableau = useMemo(() => fusionner(refTableau, refExterneTableau), [refExterneTableau]);
  const refsCalendrier = useMemo(
    () => fusionner(refCalendrier, refExterneCalendrier),
    [refExterneCalendrier],
  );

  const surToucheTableau = (e: KeyboardEvent<HTMLDivElement>) => {
    toucheTableau?.(e);
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if ((e.target as HTMLElement).closest('input, select, textarea')) return;
    const c = refCalendrier.current;
    if (!c) return;
    e.preventDefault();
    c.scrollTop += e.key === 'ArrowDown' ? PAS_DEFILEMENT : -PAS_DEFILEMENT;
  };

  const surToucheSeparateur = (e: KeyboardEvent<HTMLDivElement>) => {
    if (largeur === null) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      regler(
        bornerLargeur(
          largeur + (e.key === 'ArrowRight' ? PAS_SEPARATEUR : -PAS_SEPARATEUR),
          largeurVue,
        ),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      regler(undefined);
    }
  };

  const evenementsSeparateur = {
    onPointerDown: (e: EvenementPointeur<HTMLDivElement>) => {
      if (e.button !== 0 || !e.isPrimary || largeur === null) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      glisse.current = { x0: e.clientX, l0: largeur };
    },
    onPointerMove: (e: EvenementPointeur<HTMLDivElement>) => {
      const g = glisse.current;
      if (!g || !e.isPrimary) return;
      etat.tableau(bornerLargeur(g.l0 + e.clientX - g.x0, largeurVue), false);
    },
    onPointerUp: (e: EvenementPointeur<HTMLDivElement>) => {
      const g = glisse.current;
      if (!g || !e.isPrimary) return;
      glisse.current = null;
      if (e.clientX !== g.x0) regler(bornerLargeur(g.l0 + e.clientX - g.x0, largeurVue));
    },
    onPointerCancel: () => {
      glisse.current = null;
    },
  };

  return (
    <div
      ref={refVue}
      style={hauteur === null ? undefined : { height: hauteur }}
      className="flex overflow-hidden rounded-ui border border-gray-200 bg-white shadow-ui"
    >
      <div
        {...resteTableau}
        ref={refsTableau}
        tabIndex={0}
        role="region"
        onKeyDown={surToucheTableau}
        onScroll={(e) => synchroniser(e.currentTarget, refCalendrier.current)}
        onWheel={(e) => {
          const c = refCalendrier.current;
          if (c && e.deltaY !== 0 && !e.shiftKey)
            c.scrollTop += e.deltaY * (e.deltaMode === 1 ? PAS_DEFILEMENT : 1);
        }}
        style={{
          ...(largeur === null ? {} : { width: largeur }),
          paddingBottom: marges.tableau || undefined,
        }}
        className={`shrink-0 overflow-x-auto overflow-y-hidden focus-visible:outline-offset-[-2px] ${classeTableau ?? ''}`}
      >
        {tableau}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Largeur du tableau"
        aria-valuenow={largeur ?? undefined}
        aria-valuemin={TABLEAU_MIN}
        aria-valuemax={maximum}
        onKeyDown={surToucheSeparateur}
        onDoubleClick={() => regler(undefined)}
        {...evenementsSeparateur}
        className="w-2 shrink-0 cursor-col-resize touch-none border-x border-gray-200 bg-gray-50 hover:bg-accent-bg active:bg-accent-bg focus-visible:bg-accent-bg focus-visible:outline-offset-[-2px]"
      />
      <div
        {...resteCalendrier}
        ref={refsCalendrier}
        tabIndex={0}
        role="region"
        onScroll={(e) => synchroniser(e.currentTarget, refTableau.current)}
        style={{ paddingBottom: marges.calendrier || undefined }}
        className={`min-w-0 flex-1 overflow-auto focus-visible:outline-offset-[-2px] ${classeCalendrier ?? ''}`}
      >
        {calendrier}
      </div>
      {children}
    </div>
  );
}
