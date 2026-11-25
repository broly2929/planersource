import { useEffect, useRef, useState, type PointerEvent as EvenementPointeur } from 'react';
import {
  DEMI_JALON,
  HAUTEUR_BARRE,
  HAUTEUR_BARRE_FINE,
  HAUTEUR_LIGNE,
  LARGEUR_POIGNEE,
  PX_PAR_JOUR,
  ajouterJours,
  decalageJours,
  estGlisser,
  jourSemaine,
  joursEntre,
  largeurBarre,
  partAvancement,
  positionInitiales,
  positionJour,
  type Zoom,
} from './echelle';
import { rectSurcharge } from './surcharge';
import { entetes } from './entetes';
import { datesApresGeste, gestesPermis, type Geste, type PermisGestes } from './gestes';
import {
  RAYON_CONNECTEUR,
  centreConnecteur,
  cibleLien,
  pointsFleche,
  pointsLien,
  type Rect,
  type TypeLien,
} from './liens';
import { verrou } from './verrou';
import { formaterEcartClient, infoClient, libelleInitiales, nomBarre, nomJalon } from './libelles';

/** Assignation d'une feuille, lue par GET /api/projets/:id/gantt (D-238 (a)). */
export interface AssignationGantt {
  id: number;
  ressource_id: number;
  nom: string;
  initiales: string | null;
  charge_assignee: number;
  taux: number;
}

export interface ElementGantt {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
  drapeaux: string[];
  mode?: string;
  debut_valide?: string | null;
  fin_valide?: string | null;
  duree_validee?: number | null;
  debut_planifie?: string | null;
  fin_planifiee?: string | null;
  close?: boolean;
  est_parent?: boolean;
  charge_assignee?: number;
  charge_reelle?: number;
  avancement?: number | null;
  initiales?: string[];
  assignations?: AssignationGantt[];
  type_jalon?: 'flottant' | 'fixe';
  date_validee?: string | null;
  date_planifiee?: string | null;
  /** Champs de 6c : présents seulement si l'utilisateur écrit sur le projet (D-149 (4)). */
  charge_vendue?: number | null;
  marge?: number | null;
  /** Activités : OTP effectif pour tout lecteur ; coûts seulement si l'utilisateur écrit (D-229). */
  otp_effectif?: string | null;
  cout_planifie?: number;
  cout_impute?: number;
  cout_reel?: number;
  taux_manquant?: boolean;
  date_client?: string | null;
  ecart_client?: number | null;
  engagement_depasse?: boolean;
  /** Planning d'une ressource (lot 6e, D-157 (6)) : barre pleine, accent ou grise (ligne masquée). */
  plein?: 'accent' | 'gris';
}
export interface DependanceGantt {
  id: number;
  predecesseur_id: number;
  successeur_id: number;
  type: TypeLien;
  delai: number;
  drapeaux: string[];
}
export interface SousProjetGantt {
  id: number;
  code: string;
  nom: string;
  debut_planifie: string | null;
  fin_planifiee: string | null;
  clos: boolean;
}

/** Ligne du Gantt : élément du projet ou synthèse d'un sous-projet (après les éléments). */
export type LigneGantt =
  | { genre: 'element'; element: ElementGantt }
  | { genre: 'sous-projet'; sousProjet: SousProjetGantt };

/** Ligne du diagramme : ligne de Gantt, ou ligne vide (message du tableau, garde l'alignement). */
export type LigneSvg = LigneGantt | { genre: 'vide'; cle: string };

const cleLigne = (l: LigneSvg) =>
  l.genre === 'element' ? `e${l.element.id}` : l.genre === 'vide' ? l.cle : `p${l.sousProjet.id}`;

/** Hauteur (px) de chacun des deux niveaux d'en-tête. */
const HAUTEUR_ENTETE = HAUTEUR_LIGNE;
const MARGE_TEXTE = 8;
/** Demi-largeur (px) de la zone de clic d'un lien, de part et d'autre du tracé (D-104 (4)). */
const ZONE_LIEN = 8;

/** Début et fin planifiés d'une ligne, null sans date planifiée. */
export function datesLigne(l: LigneSvg): { debut: string; fin: string } | null {
  if (l.genre === 'vide') return null;
  if (l.genre === 'sous-projet') {
    const { debut_planifie: d, fin_planifiee: f } = l.sousProjet;
    return d && f ? { debut: d, fin: f } : null;
  }
  const e = l.element;
  if (e.type === 'jalon')
    return e.date_planifiee ? { debut: e.date_planifiee, fin: e.date_planifiee } : null;
  return e.debut_planifie && e.fin_planifiee
    ? { debut: e.debut_planifie, fin: e.fin_planifiee }
    : null;
}

/** Événements pointer d'une zone de geste (corps ou poignée). */
type Evenements = {
  onPointerDown: (e: EvenementPointeur<SVGElement>) => void;
  onPointerMove: (e: EvenementPointeur<SVGElement>) => void;
  onPointerUp: (e: EvenementPointeur<SVGElement>) => void;
  onPointerCancel: (e: EvenementPointeur<SVGElement>) => void;
};

/** Gestes d'une barre : permis, dates affichées pendant le glisser, fabrique des événements. */
interface GesteBarre {
  permis: PermisGestes;
  dates: { debut: string; fin: string } | null;
  evenements: (geste: Geste) => Evenements;
}

function Barre({
  ligne,
  index,
  origine,
  zoom,
  geste,
  client = false,
}: {
  ligne: LigneSvg;
  index: number;
  origine: string;
  zoom: Zoom;
  geste?: GesteBarre | undefined;
  /** Nom accessible du jalon avec sa date client (D-149 (8e)). */
  client?: boolean;
}) {
  const dates =
    (geste?.dates && ligne.genre === 'element' ? geste.dates : null) ?? datesLigne(ligne);
  if (!dates || ligne.genre === 'vide') return null;
  const haut = index * HAUTEUR_LIGNE;
  const centre = haut + HAUTEUR_LIGNE / 2;
  const x = positionJour(origine, dates.debut, zoom);
  const largeur = largeurBarre(dates.debut, dates.fin, zoom);

  if (ligne.genre === 'sous-projet') {
    const sp = ligne.sousProjet;
    return (
      <rect
        data-projet-id={sp.id}
        data-type="sous-projet"
        data-debut={dates.debut}
        data-fin={dates.fin}
        data-drapeaux=""
        role="img"
        aria-label={nomBarre(sp.nom, dates.debut, dates.fin, [])}
        x={x}
        y={centre - HAUTEUR_BARRE_FINE / 2}
        width={largeur}
        height={HAUTEUR_BARRE_FINE}
        className="fill-gray-500"
      />
    );
  }

  const e = ligne.element;
  const retard = e.drapeaux.includes('retard');
  const attributs = {
    'data-element-id': e.id,
    'data-debut': dates.debut,
    'data-fin': dates.fin,
    'data-drapeaux': e.drapeaux.join(' '),
    role: 'img' as const,
  };

  if (e.type === 'jalon') {
    const cx = x + PX_PAR_JOUR[zoom] / 2;
    const d = DEMI_JALON;
    return (
      <polygon
        {...attributs}
        data-type="jalon"
        aria-label={nomJalon(e.nom, dates.debut, e.drapeaux, client ? infoClient(e) : undefined)}
        points={`${cx},${centre - d} ${cx + d},${centre} ${cx},${centre + d} ${cx - d},${centre}`}
        className={retard ? 'fill-flag' : 'fill-gray-800'}
      />
    );
  }

  const nom = nomBarre(e.nom, dates.debut, dates.fin, e.drapeaux);
  if (e.est_parent) {
    return (
      <rect
        {...attributs}
        data-type="parent"
        aria-label={nom}
        x={x}
        y={centre - HAUTEUR_BARRE_FINE / 2}
        width={largeur}
        height={HAUTEUR_BARRE_FINE}
        className={retard ? 'fill-flag' : 'fill-gray-700'}
      />
    );
  }
  if (e.plein) {
    return (
      <rect
        {...attributs}
        data-type="activite"
        aria-label={nom}
        x={x}
        y={centre - HAUTEUR_BARRE / 2}
        width={largeur}
        height={HAUTEUR_BARRE}
        className={e.plein === 'gris' ? 'fill-gray-500' : 'fill-accent'}
      />
    );
  }
  const [fond, trait] = retard
    ? ['fill-flag-bg stroke-flag', 'fill-flag']
    : e.close
      ? ['fill-gray-200 stroke-gray-500', 'fill-gray-500']
      : ['fill-accent-bg stroke-accent', 'fill-accent'];
  const y = centre - HAUTEUR_BARRE / 2;
  const mobile = geste?.permis.corps ?? false;
  return (
    <>
      <rect
        {...attributs}
        data-type="activite"
        aria-label={nom}
        x={x}
        y={y}
        width={largeur}
        height={HAUTEUR_BARRE}
        className={`${fond} ${mobile ? 'cursor-grab' : ''}`}
        style={mobile ? { touchAction: 'none' } : undefined}
        {...(mobile && geste ? geste.evenements('corps') : {})}
      />
      <rect
        aria-hidden
        x={x}
        y={y}
        width={partAvancement(largeur, e.avancement ?? null)}
        height={HAUTEUR_BARRE}
        className={`${trait} pointer-events-none`}
      />
      {(['gauche', 'droite'] as const).map((cote) =>
        geste?.permis[cote] ? (
          <rect
            key={cote}
            aria-hidden
            data-poignee={cote}
            data-poignee-element={e.id}
            x={cote === 'gauche' ? x - LARGEUR_POIGNEE : x + largeur}
            y={y}
            width={LARGEUR_POIGNEE}
            height={HAUTEUR_BARRE}
            className="cursor-ew-resize fill-transparent hover:fill-accent"
            style={{ touchAction: 'none' }}
            {...geste.evenements(cote)}
          />
        ) : null,
      )}
    </>
  );
}

/** Rectangle de liaison (abscisse, largeur, ordonnée du centre) d'une ligne datée. */
function rectLigne(l: LigneSvg, index: number, origine: string, zoom: Zoom): Rect | null {
  const dates = datesLigne(l);
  if (!dates) return null;
  const y = index * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;
  const x = positionJour(origine, dates.debut, zoom);
  if (l.genre === 'element' && l.element.type === 'jalon') {
    return { x: x + PX_PAR_JOUR[zoom] / 2 - DEMI_JALON, largeur: 2 * DEMI_JALON, y };
  }
  return { x, largeur: largeurBarre(dates.debut, dates.fin, zoom), y };
}

/** Gestes à la souris du Gantt d'un projet (3d-3a) ; absents, le diagramme est en lecture seule. */
export interface OptionsGestes {
  peutEcrire: boolean;
  /** Contours (dates de la position relâchée) des éléments déplacés, par identifiant. */
  contours: Record<number, { debut: string; fin: string }>;
  /** Envoie le geste ; la promesse se règle à la réponse (refus compris, géré par l'appelant). */
  onGeste: (element: ElementGantt, geste: Geste, decalage: number) => Promise<void>;
  /** Crée un lien FD de délai 0 de `source` vers `cible` (3e) ; refus géré par l'appelant. */
  onLien: (source: number, cible: number) => Promise<void>;
  /** Ouvre le dialogue d'une dépendance (clic sur un lien, 3e). */
  onOuvrirLien: (dependanceId: number) => void;
}

/** Barre active au clavier et double-clic (3d-3b) ; absent, le diagramme n'a ni anneau ni dialogue. */
export interface OptionsClavier {
  active: number | null;
  onActiver: (id: number) => void;
  onOuvrir: (id: number) => void;
}

interface Glisser {
  id: number;
  geste: Geste;
  x0: number;
  y0: number;
  dx: number;
  actif: boolean;
}

/** Glisser d'un connecteur : élément source, départ, pointeur (dans le corps du diagramme). */
interface GlisserLien {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  actif: boolean;
}

/** Diagramme SVG : échelle, grille, barres, liens, trait du jour et traits de début non respecté. */
export function GanttSvg({
  lignes,
  dependances,
  plage,
  zoom,
  aujourdhui,
  initiales = false,
  gestes,
  clavier,
  joursRouges,
  client = false,
}: {
  lignes: LigneSvg[];
  dependances: DependanceGantt[];
  plage: { debut: string; fin: string };
  zoom: Zoom;
  aujourdhui: string;
  initiales?: boolean;
  gestes?: OptionsGestes | undefined;
  clavier?: OptionsClavier | undefined;
  /** Jours en surcharge par activité feuille (lot 3g, D-114 (4)). */
  joursRouges?: Map<number, string[]> | undefined;
  /** Date client des jalons : losange, texte d'écart, nom accessible (lot 6c, D-149 (8c)) ; réservé au Gantt du projet. */
  client?: boolean;
}) {
  const [glisser, setGlisserEtat] = useState<Glisser | null>(null);
  // La référence suit l'état sans attendre le rendu : des événements pointer rapprochés la lisent.
  const glisserRef = useRef<Glisser | null>(null);
  const setGlisser = (g: Glisser | null) => {
    if (g && !glisserRef.current) verrou.prendre();
    else if (!g && glisserRef.current) verrou.rendre();
    glisserRef.current = g;
    setGlisserEtat(g);
  };
  // Barres relâchées dont le PATCH est en cours : position gardée, autres gestes ignorés (D-094 (10)).
  const [retenus, setRetenus] = useState<Record<number, { geste: Geste; d: number }>>({});
  const retenusRef = useRef(retenus);
  retenusRef.current = retenus;

  // Glisser d'un connecteur (3e) : un seul geste à la fois sur la page, barres comprises.
  const [lienGlisse, setLienGlisseEtat] = useState<GlisserLien | null>(null);
  const lienRef = useRef<GlisserLien | null>(null);
  const lienEnVol = useRef(false);
  const setLienGlisse = (g: GlisserLien | null) => {
    if (g && !lienRef.current) verrou.prendre();
    else if (!g && lienRef.current) verrou.rendre();
    lienRef.current = g;
    setLienGlisseEtat(g);
  };
  const svg = useRef<SVGSVGElement>(null);

  // Échap pendant un glisser l'annule (barre en place, aucun PATCH) ; l'événement ne va pas plus loin.
  const enGlisse = glisser !== null || lienGlisse !== null;
  useEffect(() => {
    if (!enGlisse) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setGlisser(null);
      setLienGlisse(null);
    };
    window.addEventListener('keydown', surTouche, true);
    return () => window.removeEventListener('keydown', surTouche, true);
  }, [enGlisse]);

  useEffect(
    () => () => {
      if (glisserRef.current || lienRef.current) verrou.rendre();
    },
    [],
  );

  const anneau = useRef<SVGRectElement>(null);
  const active = clavier?.active ?? null;
  useEffect(() => {
    if (active !== null) anneau.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  const evenementsDe = (element: ElementGantt, geste: Geste): Evenements => {
    const courant = (e: EvenementPointeur<SVGElement>) => {
      const g = glisserRef.current;
      return g && g.id === element.id && g.geste === geste && e.isPrimary ? g : null;
    };
    return {
      onPointerDown: (e) => {
        if (
          e.button !== 0 ||
          !e.isPrimary ||
          glisserRef.current ||
          lienRef.current ||
          lienEnVol.current ||
          !verrou.libre() ||
          retenusRef.current[element.id]
        )
          return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setGlisser({ id: element.id, geste, x0: e.clientX, y0: e.clientY, dx: 0, actif: false });
      },
      onPointerMove: (e) => {
        const g = courant(e);
        if (!g) return;
        const dx = e.clientX - g.x0;
        setGlisser({ ...g, dx, actif: g.actif || estGlisser(dx, e.clientY - g.y0) });
      },
      onPointerUp: (e) => {
        const g = courant(e);
        if (!g) return;
        setGlisser(null);
        const d =
          g.actif || estGlisser(e.clientX - g.x0, e.clientY - g.y0)
            ? decalageJours(e.clientX - g.x0, zoom)
            : 0;
        if (d === 0 || !gestes) return;
        setRetenus((r) => ({ ...r, [element.id]: { geste, d } }));
        void gestes.onGeste(element, geste, d).finally(() =>
          setRetenus((r) => {
            const reste = { ...r };
            delete reste[element.id];
            return reste;
          }),
        );
      },
      onPointerCancel: (e) => {
        if (courant(e)) setGlisser(null);
      },
    };
  };

  const lignesGantt = lignes.filter((l): l is LigneGantt => l.genre !== 'vide');
  /** Centre du connecteur de la ligne `i`, null si la ligne n'est pas une barre datée. */
  const centreDe = (i: number) => {
    const l = lignes[i]!;
    const r = rectLigne(l, i, plage.debut, zoom);
    if (l.genre !== 'element' || !r) return null;
    return centreConnecteur(
      l.element.type === 'jalon'
        ? { genre: 'jalon', x: r.x + DEMI_JALON }
        : {
            genre: 'barre',
            x: r.x,
            largeur: r.largeur,
            poigneeDroite: gestesPermis(l.element, true, zoom).droite,
          },
      i,
    );
  };

  /** Position du pointeur dans le corps du diagramme (haut de la première ligne = 0). */
  const pointeurSvg = (e: EvenementPointeur<SVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top - 2 * HAUTEUR_ENTETE };
  };

  const evenementsLien = (source: number): Evenements => {
    const courant = (e: EvenementPointeur<SVGElement>) => {
      const g = lienRef.current;
      return g && g.id === source && e.isPrimary ? g : null;
    };
    return {
      onPointerDown: (e) => {
        if (
          e.button !== 0 ||
          !e.isPrimary ||
          glisserRef.current ||
          lienRef.current ||
          lienEnVol.current ||
          !verrou.libre() ||
          Object.keys(retenusRef.current).length > 0
        )
          return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = pointeurSvg(e);
        setLienGlisse({ id: source, x0: e.clientX, y0: e.clientY, ...p, actif: false });
      },
      onPointerMove: (e) => {
        const g = courant(e);
        if (!g) return;
        setLienGlisse({
          ...g,
          ...pointeurSvg(e),
          actif: g.actif || estGlisser(e.clientX - g.x0, e.clientY - g.y0),
        });
      },
      onPointerUp: (e) => {
        const g = courant(e);
        if (!g) return;
        setLienGlisse(null);
        const p = pointeurSvg(e);
        const dedans = p.x >= 0 && p.x <= largeur;
        const cible =
          (g.actif || estGlisser(e.clientX - g.x0, e.clientY - g.y0)) && dedans && gestes
            ? cibleLien(p.y, lignesGantt, source)
            : null;
        if (cible === null || !gestes) return;
        lienEnVol.current = true;
        void gestes.onLien(source, cible).finally(() => {
          lienEnVol.current = false;
        });
      },
      onPointerCancel: (e) => {
        if (courant(e)) setLienGlisse(null);
      },
    };
  };

  const gesteBarre = (l: LigneSvg): GesteBarre | undefined => {
    if (!gestes || l.genre !== 'element') return undefined;
    const e = l.element;
    const permis = gestesPermis(e, gestes.peutEcrire, zoom);
    const enCours =
      glisser && glisser.id === e.id && glisser.actif
        ? { geste: glisser.geste, d: decalageJours(glisser.dx, zoom) }
        : (retenus[e.id] ?? null);
    return {
      permis: retenus[e.id] ? { corps: false, gauche: false, droite: false } : permis,
      dates: enCours ? datesApresGeste(e, enCours.geste, enCours.d) : null,
      evenements: (geste) => evenementsDe(e, geste),
    };
  };

  const px = PX_PAR_JOUR[zoom];
  const jours = joursEntre(plage.debut, plage.fin) + 1;
  const largeur = jours * px;
  const hautEntete = 2 * HAUTEUR_ENTETE;
  const hauteurCorps = lignes.length * HAUTEUR_LIGNE;
  const { haut, bas } = entetes(plage, zoom);

  const indexElement = new Map<number, number>();
  lignes.forEach((l, i) => {
    if (l.genre === 'element') indexElement.set(l.element.id, i);
  });

  const weekends: number[] = [];
  if (zoom === 'jour') {
    for (let i = 0; i < jours; i++) {
      if (jourSemaine(ajouterJours(plage.debut, i)) >= 5) weekends.push(i);
    }
  }
  const xAujourdhui =
    aujourdhui >= plage.debut && aujourdhui <= plage.fin
      ? positionJour(plage.debut, aujourdhui, zoom) + px / 2
      : null;

  const cellules = (liste: typeof haut, niveau: number) =>
    liste.map((c) => (
      <svg
        key={`${niveau}-${c.x}`}
        role="presentation"
        x={c.x}
        y={niveau * HAUTEUR_ENTETE}
        width={c.largeur}
        height={HAUTEUR_ENTETE}
      >
        <line
          x1={c.largeur}
          x2={c.largeur}
          y1={0}
          y2={HAUTEUR_ENTETE}
          className="stroke-gray-200"
        />
        <text
          x={MARGE_TEXTE}
          y={HAUTEUR_ENTETE / 2}
          dominantBaseline="central"
          className={`fill-gray-700 text-petit ${niveau === 0 ? 'font-semibold' : ''}`}
        >
          {c.libelle}
        </text>
      </svg>
    ));

  return (
    <svg
      ref={svg}
      data-zoom={zoom}
      role="group"
      aria-label="Diagramme de Gantt"
      width={largeur}
      height={hautEntete + hauteurCorps}
      className="block max-w-none min-w-60 overflow-visible"
    >
      <g transform={`translate(0 ${hautEntete})`}>
        {weekends.map((i) => (
          <rect key={i} x={i * px} width={px} height={hauteurCorps} className="fill-gray-100" />
        ))}
        {lignes.map((l, i) => (
          <line
            key={i}
            x1={0}
            x2={largeur}
            y1={(i + 1) * HAUTEUR_LIGNE}
            y2={(i + 1) * HAUTEUR_LIGNE}
            className="stroke-gray-200"
          />
        ))}
        {xAujourdhui !== null && (
          <line
            data-aujourdhui={aujourdhui}
            x1={xAujourdhui}
            x2={xAujourdhui}
            y1={0}
            y2={hauteurCorps}
            className="stroke-warning stroke-2"
          />
        )}

        {dependances.map((d) => {
          const ip = indexElement.get(d.predecesseur_id);
          const is = indexElement.get(d.successeur_id);
          if (ip === undefined || is === undefined) return null;
          const pred = rectLigne(lignes[ip]!, ip, plage.debut, zoom);
          const succ = rectLigne(lignes[is]!, is, plage.debut, zoom);
          if (!pred || !succ) return null;
          const points = pointsLien(d.type, pred, succ);
          const flag = d.drapeaux.includes('dependance_non_respectee');
          const classe = flag ? 'stroke-flag' : 'stroke-gray-600';
          return (
            <g
              key={d.id}
              data-lien-id={d.id}
              data-type={d.type}
              data-drapeaux={d.drapeaux.join(' ')}
            >
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                className={`fill-none ${classe}`}
              />
              {gestes?.peutEcrire && (
                <polyline
                  data-lien-cible={d.id}
                  aria-hidden
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                  strokeWidth={2 * ZONE_LIEN}
                  className="cursor-pointer fill-none stroke-transparent"
                  style={{ pointerEvents: 'stroke' }}
                  onClick={() => gestes.onOuvrirLien(d.id)}
                />
              )}
              <polygon
                points={pointsFleche(points)
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ')}
                className={flag ? 'fill-flag stroke-flag' : 'fill-gray-600 stroke-gray-600'}
              />
            </g>
          );
        })}

        {lienGlisse?.actif &&
          (() => {
            const cible = cibleLien(lienGlisse.y, lignesGantt, lienGlisse.id);
            const i = cible === null ? undefined : indexElement.get(cible);
            if (cible === null || i === undefined || lienGlisse.x < 0 || lienGlisse.x > largeur) {
              return null;
            }
            return (
              <rect
                data-cible-lien={cible}
                aria-hidden
                x={0}
                y={i * HAUTEUR_LIGNE}
                width={largeur}
                height={HAUTEUR_LIGNE}
                className="pointer-events-none fill-accent-bg stroke-accent"
              />
            );
          })()}

        {lignes.map((l, i) => {
          const barre = (
            <Barre
              key={cleLigne(l)}
              ligne={l}
              index={i}
              origine={plage.debut}
              zoom={zoom}
              geste={gesteBarre(l)}
              client={client}
            />
          );
          if (l.genre !== 'element') return barre;
          const id = l.element.id;
          const corps = clavier ? (
            <g
              onPointerDown={(e) => {
                if (e.button === 0 && e.isPrimary) clavier.onActiver(id);
              }}
              onDoubleClick={() => clavier.onOuvrir(id)}
            >
              {barre}
            </g>
          ) : (
            barre
          );
          const centreC = gestes?.peutEcrire && zoom !== 'mois' ? centreDe(i) : null;
          const r = rectLigne(l, i, plage.debut, zoom);
          if (!centreC || !r) return <g key={cleLigne(l)}>{corps}</g>;
          const { cx, cy } = centreC;
          const visible = active === id || lienGlisse?.id === id;
          return (
            <g key={cleLigne(l)} className="group">
              <rect
                aria-hidden
                x={r.x}
                y={cy - HAUTEUR_BARRE / 2}
                width={cx + RAYON_CONNECTEUR - r.x}
                height={HAUTEUR_BARRE}
                className="fill-transparent"
              />
              {corps}
              <circle
                data-connecteur-element={id}
                aria-hidden
                cx={cx}
                cy={cy}
                r={RAYON_CONNECTEUR}
                className={`cursor-crosshair fill-accent stroke-white group-hover:opacity-100 ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{ touchAction: 'none' }}
                {...evenementsLien(id)}
              />
            </g>
          );
        })}

        {lienGlisse?.actif &&
          (() => {
            const i = indexElement.get(lienGlisse.id);
            const c = i === undefined ? null : centreDe(i);
            if (!c) return null;
            const { cx, cy } = c;
            return (
              <line
                data-lien-provisoire
                aria-hidden
                x1={cx}
                y1={cy}
                x2={lienGlisse.x}
                y2={lienGlisse.y}
                strokeDasharray="4 2"
                className="pointer-events-none stroke-accent stroke-2 [stroke-linecap:round]"
              />
            );
          })()}

        {client &&
          lignes.map((l, i) => {
            if (l.genre !== 'element' || l.element.type !== 'jalon' || !l.element.date_client) {
              return null;
            }
            const e = l.element;
            const demiJour = PX_PAR_JOUR[zoom] / 2;
            const cx = positionJour(plage.debut, e.date_client!, zoom) + demiJour;
            const cy = i * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;
            const d = DEMI_JALON;
            const planifie = e.date_planifiee
              ? positionJour(plage.debut, e.date_planifiee, zoom) + demiJour
              : cx;
            const depasse = e.engagement_depasse === true;
            return (
              <g key={`client-${e.id}`}>
                <polygon
                  data-date-client={e.id}
                  aria-hidden
                  points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`}
                  className={`pointer-events-none fill-none stroke-[1.5] [stroke-linejoin:round] ${depasse ? 'stroke-flag' : 'stroke-gray-500'}`}
                />
                {typeof e.ecart_client === 'number' && (
                  <text
                    data-ecart-client={e.id}
                    aria-hidden
                    x={Math.max(cx, planifie) + d + 6}
                    y={cy}
                    dominantBaseline="central"
                    className={`pointer-events-none text-petit ${depasse ? 'fill-flag' : 'fill-gray-700'}`}
                  >
                    {formaterEcartClient(e.ecart_client)}
                  </text>
                )}
              </g>
            );
          })}

        {joursRouges &&
          lignes.map((l, i) => {
            if (l.genre !== 'element' || l.element.type !== 'activite') return null;
            const e = l.element;
            if (e.est_parent || !e.drapeaux.includes('surcharge') || !datesLigne(l)) return null;
            return (joursRouges.get(e.id) ?? []).map((jour) => {
              const r = rectSurcharge(plage.debut, jour, zoom, i);
              return (
                <rect
                  key={`${e.id}-${jour}`}
                  data-surcharge-element={e.id}
                  data-surcharge-jour={jour}
                  aria-hidden
                  x={r.x}
                  y={r.y}
                  width={r.largeur}
                  height={r.hauteur}
                  className="pointer-events-none fill-flag opacity-70"
                />
              );
            });
          })}

        {clavier &&
          active !== null &&
          (() => {
            const i = indexElement.get(active);
            const r = i === undefined ? null : rectLigne(lignes[i]!, i, plage.debut, zoom);
            if (!r) return null;
            const marge = 3;
            return (
              <rect
                ref={anneau}
                data-anneau-element={active}
                aria-hidden
                x={r.x - marge}
                y={r.y - HAUTEUR_BARRE / 2 - marge}
                width={r.largeur + 2 * marge}
                height={HAUTEUR_BARRE + 2 * marge}
                rx={4}
                // Défilement vers la barre active : elle ne passe pas sous les en-têtes figés (D-212 (3)).
                style={{ scrollMarginTop: hautEntete }}
                className="pointer-events-none fill-none stroke-accent stroke-2"
              />
            );
          })()}

        {gestes &&
          lignes.map((l, i) => {
            if (l.genre !== 'element') return null;
            const c = gestes.contours[l.element.id];
            if (!c) return null;
            return (
              <rect
                key={l.element.id}
                data-contour-element={l.element.id}
                aria-hidden
                x={positionJour(plage.debut, c.debut, zoom)}
                y={i * HAUTEUR_LIGNE + (HAUTEUR_LIGNE - HAUTEUR_BARRE) / 2}
                width={largeurBarre(c.debut, c.fin, zoom)}
                height={HAUTEUR_BARRE}
                strokeDasharray="4 2"
                className="pointer-events-none fill-none stroke-accent"
              />
            );
          })}

        {initiales &&
          lignes.map((l, i) => {
            if (l.genre !== 'element' || l.element.type !== 'activite') return null;
            const e = l.element;
            const texte = libelleInitiales(e.initiales ?? []);
            const x = positionInitiales(
              plage.debut,
              e.debut_planifie ?? null,
              e.fin_planifiee ?? null,
              zoom,
            );
            if (!texte || x === null) return null;
            return (
              <text
                key={e.id}
                data-initiales-element={e.id}
                x={x}
                y={i * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2}
                dominantBaseline="central"
                className="fill-gray-500 text-petit"
              >
                {texte}
              </text>
            );
          })}

        {lignes.map((l, i) => {
          if (l.genre !== 'element' || l.element.type !== 'activite') return null;
          const e = l.element;
          if (!e.drapeaux.includes('debut_non_respecte') || !e.debut_valide || !e.debut_planifie) {
            return null;
          }
          const y = i * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;
          return (
            <line
              key={e.id}
              data-debut-non-respecte={e.id}
              x1={positionJour(plage.debut, e.debut_valide, zoom)}
              x2={positionJour(plage.debut, e.debut_planifie, zoom)}
              y1={y}
              y2={y}
              className="pointer-events-none stroke-flag stroke-2"
            />
          );
        })}
      </g>
      {/* En-têtes dessinés en dernier, au-dessus des barres, et figés en haut de la zone qui défile
          (D-212 (3)) : décalés de la position verticale de la zone, posée par `DispositionGantt`. */}
      <g data-entete-gantt style={{ transform: 'translateY(var(--defilement-gantt, 0px))' }}>
        <rect width={largeur} height={hautEntete} className="fill-gray-100" />
        {cellules(haut, 0)}
        {cellules(bas, 1)}
        <line x1={0} x2={largeur} y1={hautEntete} y2={hautEntete} className="stroke-gray-200" />
      </g>
    </svg>
  );
}
