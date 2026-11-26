import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as EvenementSouris,
  type ReactNode,
} from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Copy, GripVertical, Pencil, Undo2 } from 'lucide-react';
import { useAuth } from '../../auth';
import { api } from '../../api';
import {
  DialogueCalcul,
  nomsElements,
  texteRefusCalcul,
  type ReponseCalcul,
} from '../../calcul/DialogueCalcul';
import {
  ecrireRecalculAuto,
  etatInitialFile,
  evenementFile,
  lireRecalculAuto,
} from '../../calcul/auto';
import { lignesAvertissements, racineDe, type ProjetCalcul } from '../../calcul/logique';
import { Case } from '../../components/Case';
import { BoutonIcone } from '../../components/BoutonIcone';
import { Badge } from '../../components/Badge';
import { nomsAssignations } from '../../calcul/noms';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Chargement, Vide } from '../../components/Etat';
import { Notification } from '../../components/Notification';
import { Table, type Colonne } from '../../components/Table';
import { BoutonsZoom } from '../../gantt/BoutonsZoom';
import { barresParcourables, barreSuivante, nomAccessible } from '../../gantt/clavier';
import { joursSurcharge, texteSurcharge, type LigneTravail } from '../../gantt/surcharge';
import { CaseInitiales } from '../../gantt/CaseInitiales';
import type { Destination } from '../../gantt/arborescence';
import { corpsCreation, entreesMenu, libelleEntree, type EntreeMenu } from '../../gantt/menu';
import {
  depiler,
  inverseBarre,
  inverseLienCree,
  inverseLienSupprime,
  inverseLigne,
  renumeroterLien,
  requeteInverse,
} from '../../gantt/annulation';
import { verrou } from '../../gantt/verrou';
import { useGlisserLigne } from '../../gantt/useGlisserLigne';
import { Drapeaux } from '../../gantt/Drapeaux';
import {
  CLASSE_CELLULE_DRAPEAUX,
  CLASSE_ENTETE_DRAPEAUX,
  CLASSE_NOM_MAX,
  CLASSE_NOM_MAX_CLIENT,
} from '../../gantt/largeurs';
import { dateLocale, lireInitiales, lireZoom, numeroJour } from '../../gantt/echelle';
import {
  corpsPatchGeste,
  datesApresGeste,
  type CalendrierGeste,
  type Geste,
} from '../../gantt/gestes';
import {
  GanttSvg,
  datesLigne,
  type DependanceGantt,
  type AssignationGantt,
  type ElementGantt,
  type LigneGantt,
  type SousProjetGantt,
} from '../../gantt/GanttSvg';
import {
  VIDE,
  formaterAvancement,
  formaterDate,
  formaterNombre,
  libelleMode,
} from '../../gantt/libelles';
import { calculerPlage, etendrePlage, joursClient, joursConnus } from '../../gantt/plage';
import { formaterJours, texteTotaux, type TotauxProjet } from '../../gantt/vendu';
import { LienTelechargement } from '../../components/LienTelechargement';
import { CelluleCout, MarqueIncomplet } from '../../gantt/CelluleCout';
import { retrait } from '../../gantt/retraits';
import { useLargeur } from '../../gantt/useLargeur';
import {
  DispositionGantt,
  MenuColonnes,
  poigneeColonne,
  useDispositionGantt,
} from '../../gantt/DispositionGantt';
import {
  FormulaireActivite,
  FormulaireJalon,
  FormulaireModifDependance,
  type ActiviteDetail,
  type JalonDetail,
} from './FormulairesEdition';
import { Link, usePath, useSearch } from '../../router';
import type { Contours } from './contours';
import type { PileAnnulation } from './annulation';
import { CelluleRessources } from '../../gantt/CelluleRessources';
import { DialogueModifAssignation } from './DialogueModifAssignation';
import { DialogueModifProjet } from './DialogueModifProjet';
import { DialogueCopie } from './DialogueCopie';
import { FormulaireNom } from './PlanningProjet';
import { texteRefusCreationLien, texteRefusDeplacement, texteRefusGeste, useListe } from './commun';
import { Confirmation } from '../../components/Confirmation';

interface DonneesGantt {
  projet: { id: number; date_debut: string; peut_ecrire: boolean; totaux?: TotauxProjet };
  elements: ElementGantt[];
  dependances: DependanceGantt[];
  sous_projets: SousProjetGantt[];
}

/** Colonnes « Vendu » et « Marge » (D-149 (8b)) : activités seulement, marge négative en couleur flag. */
type ColonneGantt = Colonne<LigneGantt> & { id: string };

const colonnesVendu: ColonneGantt[] = [
  {
    id: 'vendu',
    titre: 'Vendu',
    cellule: (l) =>
      l.genre === 'element' && l.element.type === 'activite'
        ? formaterJours(l.element.charge_vendue ?? null)
        : '',
  },
  {
    id: 'marge',
    titre: 'Marge',
    cellule: (l) =>
      l.genre === 'element' && l.element.type === 'activite'
        ? formaterJours(l.element.marge ?? null)
        : '',
    classeCelluleLigne: (l) =>
      l.genre === 'element' && (l.element.marge ?? 0) < 0 ? 'text-flag' : '',
  },
];

/** Colonnes « Coût planifié » et « Coût réel » (D-229) : activités seulement, marque « incomplet » si un taux manque. */
const colonnesCouts: ColonneGantt[] = [
  {
    id: 'cout_planifie',
    titre: 'Coût planifié',
    cellule: (l) =>
      l.genre === 'element' && l.element.type === 'activite' ? (
        <CelluleCout montant={l.element.cout_planifie} manquant={l.element.taux_manquant} />
      ) : (
        ''
      ),
  },
  {
    id: 'cout_reel',
    titre: 'Coût réel',
    cellule: (l) =>
      l.genre === 'element' && l.element.type === 'activite' ? (
        <CelluleCout montant={l.element.cout_reel} manquant={l.element.taux_manquant} />
      ) : (
        ''
      ),
  },
];

/** Région « Totaux du projet » (D-149 (8a)) : marge négative en couleur flag. */
function TotauxProjetRegion({
  totaux,
  hrefCouts,
}: {
  totaux: TotauxProjet;
  hrefCouts?: string | undefined;
}) {
  const parties = texteTotaux(totaux).split(' · ');
  return (
    <div
      role="region"
      aria-label="Totaux du projet"
      className="flex flex-wrap items-baseline gap-x-1 rounded-ui border border-gray-200 bg-white px-3 py-2 shadow-ui"
    >
      {parties.map((p, i) => (
        <span
          key={p}
          className={i === 2 && totaux.marge !== null && totaux.marge < 0 ? 'text-flag' : ''}
        >
          {p}
          {i < parties.length - 1 ? ' · ' : ''}
        </span>
      ))}
      {totaux.taux_manquant && <MarqueIncomplet />}
      {hrefCouts && (
        <span className="ml-3">
          <LienTelechargement href={hrefCouts}>Exporter les coûts</LienTelechargement>
        </span>
      )}
    </div>
  );
}

/**
 * Largeur du tableau avec les colonnes de 6c (D-149 (8)) : marges internes d'un pas (`px-1`) sur toutes les colonnes
 * sauf Drapeaux, et nom limité à `CLASSE_NOM_MAX_CLIENT`, pour tenir dans les 4/5 de l'écran à 1440 px.
 */
function resserrer(client: boolean, cols: ColonneGantt[]): ColonneGantt[] {
  if (!client) return cols;
  return cols.map((c) => (c.id === 'drapeaux' ? c : { ...c, serree: true }));
}

/** Colonnes du tableau ; `poignee` rend la poignée de glisser d'une ligne d'élément (D-108 (5)). */
const colonnes = (
  poignee: ((element: ElementGantt) => ReactNode) | null,
  /** Ouvre le dialogue de modification d'un élément ; null : le nom reste un texte (D-127 (6)). */
  modifierElement: ((element: ElementGantt) => void) | null,
  /** Ouvre « Modifier le projet » d'un sous-projet que l'utilisateur écrit ; null : pas de crayon. */
  modifierSousProjet: (sousProjet: SousProjetGantt) => (() => void) | null,
  /** Colonnes « Vendu » et « Marge » et badge « Client » : seulement si l'utilisateur écrit (D-149 (8)). */
  client: boolean,
  /** Ouvre « Modifier l'assignation » depuis la colonne Ressources ; null : texte avec infobulle (D-238 (4)). */
  modifierAssignation: ((element: ElementGantt, assignation: AssignationGantt) => void) | null,
): ColonneGantt[] => {
  const nomMax = client ? CLASSE_NOM_MAX_CLIENT : CLASSE_NOM_MAX;
  return resserrer(client, [
    {
      id: 'wbs',
      titre: 'WBS',
      cellule: (l) => (l.genre === 'element' ? l.element.wbs : VIDE),
    },
    {
      id: 'nom',
      titre: 'Nom',
      cellule: (l) =>
        l.genre === 'sous-projet' ? (
          <div className="flex items-center gap-2">
            <Link
              to={`/projets/${l.sousProjet.id}`}
              title={`${l.sousProjet.code} · ${l.sousProjet.nom}`}
              className={`block min-w-0 ${nomMax} truncate text-accent underline`}
            >
              {`${l.sousProjet.code} · ${l.sousProjet.nom}`}
            </Link>
            {modifierSousProjet(l.sousProjet) && (
              <BoutonIcone
                libelle={`Modifier le projet ${l.sousProjet.nom}`}
                icone={Pencil}
                className="shrink-0"
                onClick={modifierSousProjet(l.sousProjet)!}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {poignee?.(l.element)}
            {modifierElement ? (
              <button
                type="button"
                title={l.element.nom}
                onClick={() => modifierElement(l.element)}
                className={`block min-w-0 ${nomMax} cursor-pointer truncate text-left text-accent underline focus-visible:rounded-ui ${retrait(l.element.wbs)} ${l.element.est_parent ? 'font-semibold' : ''}`}
              >
                {l.element.nom}
              </button>
            ) : (
              <span
                title={l.element.nom}
                className={`block min-w-0 ${nomMax} truncate ${retrait(l.element.wbs)} ${l.element.est_parent ? 'font-semibold' : ''}`}
              >
                {l.element.nom}
              </span>
            )}
          </div>
        ),
    },
    {
      id: 'planification',
      titre: 'Planification',
      cellule: (l) =>
        l.genre === 'sous-projet' ? (
          <Badge statut="neutre">Sous-projet</Badge>
        ) : l.element.mode ? (
          libelleMode(l.element.mode)
        ) : (
          VIDE
        ),
    },
    { id: 'debut', titre: 'Début', cellule: (l) => formaterDate(datesLigne(l)?.debut ?? null) },
    { id: 'fin', titre: 'Fin', cellule: (l) => formaterDate(datesLigne(l)?.fin ?? null) },
    {
      id: 'ressources',
      titre: 'Ressources',
      cellule: (l) =>
        l.genre === 'element' && l.element.type === 'activite' ? (
          <CelluleRessources
            assignations={l.element.assignations}
            nomActivite={l.element.nom}
            modifier={modifierAssignation ? (a) => modifierAssignation(l.element, a) : null}
          />
        ) : null,
    },
    {
      id: 'charge',
      titre: 'Charge',
      cellule: (l) =>
        l.genre === 'element' && l.element.type === 'activite'
          ? formaterNombre(l.element.charge_assignee ?? null)
          : VIDE,
    },
    ...(client ? colonnesVendu : []),
    {
      id: 'avancement',
      titre: 'Avancement',
      cellule: (l) =>
        l.genre === 'element' && l.element.type === 'activite'
          ? formaterAvancement(l.element.avancement ?? null)
          : VIDE,
    },
    {
      id: 'otp',
      titre: 'OTP',
      cellule: (l) =>
        l.genre === 'element' && l.element.type === 'activite'
          ? (l.element.otp_effectif ?? VIDE)
          : VIDE,
    },
    ...(client ? colonnesCouts : []),
    {
      id: 'drapeaux',
      titre: 'Drapeaux',
      classeEntete: CLASSE_ENTETE_DRAPEAUX,
      classeCellule: CLASSE_CELLULE_DRAPEAUX,
      cellule: (l) =>
        l.genre === 'element' ? (
          <Drapeaux
            drapeaux={l.element.drapeaux}
            engagementClient={client && l.element.engagement_depasse === true}
          />
        ) : (
          VIDE
        ),
    },
  ]);
};

type DialogueEdition =
  | { kind: 'activite'; activite: ActiviteDetail }
  | { kind: 'jalon'; jalon: JalonDetail }
  | { kind: 'dependance'; dependance: DependanceGantt }
  | { kind: 'projet'; id: number }
  | { kind: 'assignation'; assignation: AssignationGantt; activite: string };

const TEXTE_ECHEC_ANNULATION =
  'Impossible d’annuler ce geste ; les annulations précédentes ne sont plus possibles.';

interface CalendrierApi extends CalendrierGeste {
  est_defaut: boolean;
}

export function GanttProjet({
  projetId,
  nom,
  contours,
  pile,
  estModele = false,
}: {
  projetId: number;
  /** Nom du projet affiché, pour le dialogue « Copier » (D-111 (5)). */
  nom: string;
  /** Contours des gestes et bandeau « Planning à recalculer », tenus par la fiche (D-095 (1)). */
  contours: Contours;
  /** Pile d'annulation des gestes, tenue par la fiche (D-127 (3)). */
  pile: PileAnnulation;
  estModele?: boolean;
}) {
  const [etat, recharger, modifier] = useListe<DonneesGantt>(`/api/projets/${projetId}/gantt`);
  // Jours en surcharge (3g, D-114 (3)) : GET /travail après chaque chargement, seulement si un élément porte
  // `surcharge` ; un échec n'affiche rien.
  const [lignesTravail, setLignesTravail] = useState<LigneTravail[]>([]);
  const aSurcharge =
    etat.statut === 'ok' && etat.donnees.elements.some((e) => e.drapeaux.includes('surcharge'));
  useEffect(() => {
    if (!aSurcharge) {
      setLignesTravail([]);
      return;
    }
    let actuel = true;
    api<{ lignes: LigneTravail[] }>(`/api/projets/${projetId}/travail`)
      .then((r) => actuel && setLignesTravail(r.lignes))
      .catch(() => actuel && setLignesTravail([]));
    return () => {
      actuel = false;
    };
  }, [etat, aSurcharge, projetId]);
  const joursRouges = useMemo(() => joursSurcharge(lignesTravail), [lignesTravail]);
  const [alerte, setAlerte] = useState<string | null>(null);
  // Sous-projets que l'utilisateur écrit (crayon « Modifier le projet », D-127 (6)) : GET /api/projets.
  const [projets, rechargerProjets] =
    useListe<{ id: number; peut_ecrire: boolean }[]>('/api/projets');
  const sousProjetsEcrits = useMemo(
    () =>
      new Set(
        projets.statut === 'ok'
          ? projets.donnees.filter((p) => p.peut_ecrire).map((p) => p.id)
          : [],
      ),
    [projets],
  );
  // Annulation (D-127 (4), (5)) : « Geste annulé. » affiché jusqu'au geste suivant.
  const [annule, setAnnule] = useState(false);
  const [annulation, setAnnulation] = useState(false);
  // D-207 (1) : un geste qui enregistre dure jusqu'à la réponse de son enregistrement ; tant qu'il y en a un
  // en cours (barre, lien ou ligne), l'annulation est ignorée et le bouton désactivé.
  const enregistrements = useRef(0);
  const [enregistrement, setEnregistrement] = useState(false);
  const enregistrer = async (envoi: () => Promise<void>) => {
    enregistrements.current++;
    setEnregistrement(true);
    try {
      await envoi();
    } finally {
      enregistrements.current--;
      setEnregistrement(enregistrements.current > 0);
    }
  };
  const elementsCourants = etat.statut === 'ok' ? etat.donnees.elements : [];
  const calendrierDefaut = useRef<Promise<CalendrierGeste> | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [auto, setAuto] = useState(() => {
    try {
      return lireRecalculAuto(localStorage);
    } catch {
      return false;
    }
  });
  const autoCourant = useRef(auto);
  const file = useRef(etatInitialFile);
  const [recalcul, setRecalcul] = useState(false);
  const [succes, setSucces] = useState(false);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [aujourdhui] = useState(() => dateLocale(new Date()));
  const chemin = usePath();
  const recherche = useSearch();
  const zoom = lireZoom(recherche.get('zoom'));
  const initiales = lireInitiales(recherche.get('initiales'));
  const [largeurSvg, zoneSvg] = useLargeur();
  const [active, setActive] = useState<number | null>(null);
  const [edition, setEdition] = useState<DialogueEdition | null>(null);
  const [suppression, setSuppression] = useState<{
    nom: string;
    dependance: DependanceGantt;
  } | null>(null);
  const { etat: auth } = useAuth();
  const admin = auth.statut === 'connecte' && auth.user.role === 'administrateur';
  const [menu, setMenu] = useState<{ id: number; type: 'activite' | 'jalon' } | null>(null);
  const [creation, setCreation] = useState<{
    entree: EntreeMenu;
    parent: string;
    corps: Record<string, unknown>;
  } | null>(null);
  const [copie, setCopie] = useState(false);
  const origine = useRef<'tableau' | 'calendrier'>('calendrier');
  const zoneTableau = useRef<HTMLDivElement | null>(null);
  const declencheur = useRef<HTMLSpanElement | null>(null);
  const creationPrevue = useRef(false);
  // Le `contextmenu` synthétique qui ouvre le menu (D-112 (5)) a déjà servi à Radix, au niveau de la racine
  // React : il ne doit pas remonter plus haut, où il serait pris pour un second clic droit.
  useEffect(() => {
    const arreter = (e: Event) => {
      if (!e.isTrusted) e.stopPropagation();
    };
    document.body.addEventListener('contextmenu', arreter);
    return () => document.body.removeEventListener('contextmenu', arreter);
  }, []);
  const zone = useRef<HTMLDivElement | null>(null);
  const refZone = useCallback(
    (noeud: HTMLDivElement | null) => {
      zone.current = noeud;
      return zoneSvg(noeud);
    },
    [zoneSvg],
  );

  /** Calendrier par défaut, lu une fois (GET /api/calendriers, fériés compris). */
  const lireCalendrierDefaut = () => {
    calendrierDefaut.current ??= api<CalendrierApi[]>('/api/calendriers')
      .then((liste) => {
        const c = liste.find((x) => x.est_defaut);
        if (!c) throw new Error('Pas de calendrier par défaut');
        return c;
      })
      .catch((err: unknown) => {
        calendrierDefaut.current = null;
        throw err;
      });
    return calendrierDefaut.current;
  };

  /** Recalcul automatique (D-101) : un calcul en vol, une demande en file ; lancé via `executerRef`. */
  const executerRef = useRef<() => Promise<void>>(async () => undefined);
  const demanderRecalcul = () => {
    const r = evenementFile(file.current, 'demande');
    file.current = r.etat;
    if (r.lancer) void executerRef.current();
  };
  const declencherAuto = () => {
    if (autoCourant.current) demanderRecalcul();
  };
  executerRef.current = async () => {
    setRecalcul(true);
    try {
      const projets = await api<ProjetCalcul[]>('/api/projets');
      const reponse = await api<ReponseCalcul>('/api/calcul', {
        method: 'POST',
        body: { projets: [racineDe(projets, projetId)], d0: dateLocale(new Date()) },
      });
      contours.effacer();
      pile.neutraliserContours();
      setAlerte(null);
      setSucces(false);
      setAvertissements([]);
      recharger();
      if (reponse.avertissements.some((a) => a.code === 'reste_non_pose')) {
        const noms = await nomsAssignations(reponse.projets);
        setAvertissements(lignesAvertissements(reponse.avertissements, noms));
      }
    } catch (err) {
      setAlerte(texteRefusCalcul(err, await nomsElements(projetId)));
    }
    const r = evenementFile(file.current, 'fin');
    file.current = r.etat;
    if (r.lancer) void executerRef.current();
    else setRecalcul(false);
  };

  const basculerAuto = (coche: boolean) => {
    setAuto(coche);
    autoCourant.current = coche;
    try {
      ecrireRecalculAuto(localStorage, coche);
    } catch {
      /* stockage indisponible */
    }
    if (!coche) {
      file.current = evenementFile(file.current, 'decocher').etat;
    } else if (contours.signale || Object.keys(contours.parElement).length > 0) {
      demanderRecalcul();
    }
  };

  /** Envoie un geste : réponse appliquée à l'élément local, contour posé ; refus : alerte (D-094 (9), (10)). */
  const envoyerGeste = (element: ElementGantt, geste: Geste, decalage: number) =>
    enregistrer(() => envoyerGesteBarre(element, geste, decalage));
  const envoyerGesteBarre = async (element: ElementGantt, geste: Geste, decalage: number) => {
    setAnnule(false);
    const contourAvant = contours.parElement[element.id] ?? null;
    try {
      const droiteDuree =
        geste === 'droite' && (element.mode === 'FDUR' || element.mode === 'DDUR');
      const calendrier = droiteDuree
        ? await lireCalendrierDefaut()
        : { jours_travailles: [], feries: [] };
      const corps = corpsPatchGeste(element, geste, decalage, calendrier);
      if (!corps) return;
      const reponse = await api<{
        debut_valide: string | null;
        fin_valide: string | null;
        duree_validee?: number | null;
      }>(`/api/activites/${element.id}`, { method: 'PATCH', body: corps });
      modifier((d) => ({
        ...d,
        elements: d.elements.map((x) =>
          x.id === element.id
            ? {
                ...x,
                debut_valide: reponse.debut_valide,
                fin_valide: reponse.fin_valide,
                ...(reponse.duree_validee !== undefined
                  ? { duree_validee: reponse.duree_validee }
                  : {}),
              }
            : x,
        ),
      }));
      pile.empiler(inverseBarre(element, corps, contourAvant));
      const dates = datesApresGeste(element, geste, decalage);
      if (dates) contours.poser(element.id, dates);
      declencherAuto();
    } catch (err) {
      setAlerte(texteRefusGeste(err));
    }
  };

  /** Crée un lien FD de délai 0 (D-104 (3)) ; succès : rechargement et recalcul, refus : alerte. */
  const creerLien = (source: number, cible: number) =>
    enregistrer(() => creerLienEnregistre(source, cible));
  const creerLienEnregistre = async (source: number, cible: number) => {
    setAnnule(false);
    try {
      const creee = await api<{ id: number }>(`/api/projets/${projetId}/dependances`, {
        method: 'POST',
        body: { predecesseur_id: source, successeur_id: cible, type: 'FD', delai: 0 },
      });
      pile.empiler(inverseLienCree(creee.id));
      contours.signaler();
      recharger();
      declencherAuto();
    } catch (err) {
      setAlerte(texteRefusCreationLien(err));
    }
  };

  /** Déplace une ligne (D-108 (9), (10)) ; succès : rechargement, bandeau et recalcul, refus : alerte. */
  const deplacerLigne = (id: number, destination: Destination) =>
    enregistrer(() => deplacerLigneEnregistre(id, destination));
  const deplacerLigneEnregistre = async (id: number, destination: Destination) => {
    setAnnule(false);
    const avant = elementsCourants.find((e) => e.id === id);
    try {
      await api(`/api/elements/${id}/deplacer`, { method: 'POST', body: destination });
      if (avant) pile.empiler(inverseLigne(avant));
      contours.signaler();
      recharger();
      declencherAuto();
    } catch (err) {
      setAlerte(texteRefusDeplacement(err));
    }
  };
  const glisseLigne = useGlisserLigne(elementsCourants, deplacerLigne);

  /** Rend le focus à la zone du SVG (D-098 (3)). */
  const rendreFocus = () => zone.current?.focus({ preventScroll: true });
  /** Rend le focus à la zone d'où est parti le menu ou le dialogue (D-111 (2), (4)). */
  const rendreFocusOrigine = () =>
    (origine.current === 'tableau' ? zoneTableau : zone).current?.focus({ preventScroll: true });

  const peutMenu = etat.statut === 'ok' && etat.donnees.projet.peut_ecrire && !estModele;
  /** Ouvre le menu de la ligne `id` au point (x, y) par un `contextmenu` synthétique sur le déclencheur Radix. */
  const ouvrirMenu = (id: number, x: number, y: number, depuis: 'tableau' | 'calendrier') => {
    const el = elementsCourants.find((e) => e.id === id);
    if (!peutMenu || !el || !verrou.libre() || edition || creation || copie) return false;
    origine.current = depuis;
    setMenu({ id, type: el.type });
    declencheur.current?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }),
    );
    return true;
  };
  /** `contextmenu` natif d'une zone : menu sur une ligne ou une barre d'élément, sinon menu du navigateur. */
  const surMenuNavigateur = (depuis: 'tableau' | 'calendrier') => (e: EvenementSouris) => {
    const noeud = (e.target as Element).closest(
      depuis === 'tableau' ? '[data-ligne-element]' : '[data-element-id]',
    );
    const id = Number(
      noeud?.getAttribute(depuis === 'tableau' ? 'data-ligne-element' : 'data-element-id'),
    );
    if (noeud && ouvrirMenu(id, e.clientX, e.clientY, depuis)) e.preventDefault();
    // Maj+F10 et Menu sont traités au keydown (D-112 (5)) : l'événement natif du clavier est avalé.
    else if (depuis === 'calendrier' && e.button === 0 && peutMenu) e.preventDefault();
  };

  const activer = (id: number) => {
    setActive(id);
    rendreFocus();
  };

  /** Ouvre le dialogue d'édition d'une barre ; valeurs lues au moment de l'ouverture (D-098 (3)). */
  const ouvrir = async (
    id: number,
    lignes: LigneGantt[],
    peutEcrire: boolean,
    depuis: 'tableau' | 'calendrier' = 'calendrier',
  ) => {
    const ligne = lignes.find((l) => l.genre === 'element' && l.element.id === id);
    if (!peutEcrire || edition || ligne?.genre !== 'element') return;
    origine.current = depuis;
    try {
      if (ligne.element.type === 'jalon') {
        const liste = await api<JalonDetail[]>(`/api/projets/${projetId}/jalons`);
        const jalon = liste.find((j) => j.id === id);
        if (jalon) setEdition({ kind: 'jalon', jalon });
      } else {
        const liste = await api<ActiviteDetail[]>(`/api/projets/${projetId}/activites`);
        const activite = liste.find((a) => a.id === id);
        if (activite) setEdition({ kind: 'activite', activite });
      }
    } catch {
      setAlerte('Impossible de charger l’élément à modifier.');
    }
  };

  const fermerEdition = () => setEdition(null);
  // Focus rendu une fois le dialogue démonté : Radix retient le focus tant qu'il est monté.
  const dialogueOuvert = edition !== null || creation !== null;
  const etaitOuvert = useRef(false);
  useEffect(() => {
    if (dialogueOuvert) {
      etaitOuvert.current = true;
      return;
    }
    if (!etaitOuvert.current) return;
    etaitOuvert.current = false;
    const minuteur = setTimeout(rendreFocusOrigine, 0);
    return () => clearTimeout(minuteur);
  }, [dialogueOuvert]);

  const apresEdition = () => {
    contours.signaler();
    recharger();
    fermerEdition();
    declencherAuto();
  };

  // Action enregistrée tout de suite dans le dialogue (déplacement, dépendance) : même effet qu'un enregistrement, sans fermer.
  const apresChangement = () => {
    contours.signaler();
    recharger();
    declencherAuto();
  };

  const fermerCreation = () => setCreation(null);
  const apresCreation = () => {
    contours.signaler();
    recharger();
    fermerCreation();
    declencherAuto();
  };

  const apresCalcul = async (reponse: ReponseCalcul) => {
    setCalcul(false);
    contours.effacer();
    pile.viderParCalcul();
    setSucces(true);
    setAvertissements([]);
    recharger();
    if (reponse.avertissements.some((a) => a.code === 'reste_non_pose')) {
      const noms = await nomsAssignations(reponse.projets);
      setAvertissements(lignesAvertissements(reponse.avertissements, noms));
    }
  };

  const peutAnnuler =
    etat.statut === 'ok' &&
    etat.donnees.projet.peut_ecrire &&
    !estModele &&
    pile.entrees.length > 0 &&
    !recalcul &&
    !annulation &&
    !enregistrement;

  /** Annule le dernier geste par sa requête inverse (D-127 (5)) ; même verrou que les gestes. */
  const annuler = async () => {
    const { inverse, pile: reste } = depiler(pile.entrees);
    if (!peutAnnuler || !inverse || enregistrements.current > 0) return;
    if (edition || creation || copie || calcul || suppression || menu || !verrou.prendre()) return;
    setAnnulation(true);
    try {
      const requete = requeteInverse(inverse);
      const reponse = await api<{ id: number } | undefined>(requete.chemin, {
        method: requete.methode,
        ...(requete.corps ? { body: requete.corps } : {}),
      });
      pile.remplacer(
        inverse.genre === 'recreer-lien' && reponse
          ? renumeroterLien(reste, inverse.ancienId, reponse.id)
          : reste,
      );
      if (inverse.genre === 'barre') contours.remettre(inverse.id, inverse.contour);
      contours.signaler();
      setAlerte(null);
      setAnnule(true);
      recharger();
      declencherAuto();
    } catch {
      pile.vider();
      setAnnule(false);
      setAlerte(TEXTE_ECHEC_ANNULATION);
      // L'état du serveur a pu changer : l'écran est relu (D-131).
      recharger();
    } finally {
      verrou.rendre();
      setAnnulation(false);
    }
  };
  // Ctrl+Z et Cmd+Z (D-127 (4)) : ignorés dans un champ ou un dialogue ouvert ; l'écouteur lit la dernière version.
  const annulerRef = useRef(annuler);
  annulerRef.current = annuler;
  useEffect(() => {
    const surTouche = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey)
        return;
      const cible = e.target instanceof HTMLElement ? e.target : null;
      if (
        cible?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      void annulerRef.current();
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, []);

  const disposition = useDispositionGantt('projet', {
    vendu: etat.statut === 'ok' && etat.donnees.projet.peut_ecrire,
  });

  if (etat.statut === 'chargement') return <Chargement libelle="Chargement du Gantt…" />;
  if (etat.statut === 'erreur') {
    return <Notification type="erreur">Impossible de charger le Gantt.</Notification>;
  }

  const { projet, elements, dependances, sous_projets: sousProjets } = etat.donnees;
  const peutCalculer = projet.peut_ecrire && !estModele;
  const hrefCouts = projet.peut_ecrire ? `/api/projets/${projet.id}/couts/export` : undefined;
  const boutonCalculer = (
    <Button variante="secondaire" disabled={recalcul} onClick={() => setCalcul(true)}>
      Calculer
    </Button>
  );
  const caseAuto = (
    <Case
      label="Recalcul automatique"
      className="h-8 whitespace-nowrap"
      checked={auto}
      onChange={(e) => basculerAuto(e.target.checked)}
    />
  );
  const aRecalculer = contours.signale || Object.keys(contours.parElement).length > 0;
  const retours = (
    <>
      {alerte && (
        <Notification type="erreur">
          <div className="flex flex-wrap items-center gap-4">
            <span>{alerte}</span>
            <Button variante="secondaire" onClick={() => setAlerte(null)}>
              Fermer
            </Button>
          </div>
        </Notification>
      )}
      {recalcul && <Notification type="info">Recalcul en cours…</Notification>}
      {aRecalculer && !recalcul && (
        <Notification type="info">
          <div className="flex flex-wrap items-center gap-4">
            <span>Planning à recalculer</span>
            {peutCalculer && boutonCalculer}
          </div>
        </Notification>
      )}
      {succes && <Notification type="succes">Planning calculé.</Notification>}
      {annule && <Notification type="succes">Geste annulé.</Notification>}
      {avertissements.length > 0 && (
        <Notification type="avertissement">
          <p className="font-semibold">Une partie de la charge n’a pas pu être posée.</p>
          <ul>
            {avertissements.map((ligne) => (
              <li key={ligne}>{ligne}</li>
            ))}
          </ul>
        </Notification>
      )}
    </>
  );
  const dialogue = calcul && (
    <DialogueCalcul
      precoches={[projetId]}
      projetId={projetId}
      onSucces={apresCalcul}
      onFermer={() => setCalcul(false)}
    />
  );
  if (elements.length === 0 && sousProjets.length === 0) {
    return (
      <section aria-label="Gantt" className="flex flex-col gap-4">
        {retours}
        {projet.peut_ecrire && projet.totaux && (
          <TotauxProjetRegion totaux={projet.totaux} hrefCouts={hrefCouts} />
        )}
        <Vide>Ce projet ne contient encore aucun élément.</Vide>
        {peutCalculer && (
          <div className="flex items-center justify-end gap-4">
            {boutonCalculer}
            {caseAuto}
          </div>
        )}
        {dialogue}
      </section>
    );
  }

  const peutDeplacer = projet.peut_ecrire && !estModele;
  const poignee = peutDeplacer
    ? (element: ElementGantt) => (
        <span
          data-poignee-ligne={element.id}
          aria-hidden="true"
          className="inline-flex shrink-0 cursor-grab touch-none text-gray-500 opacity-40 select-none group-hover:opacity-100 active:cursor-grabbing"
          {...glisseLigne.evenements(element.id)}
        >
          <GripVertical aria-hidden className="size-4" />
        </span>
      )
    : null;
  const g = glisseLigne.etat?.actif ? glisseLigne.etat : null;
  const attributsLigne = (l: LigneGantt) =>
    l.genre === 'element'
      ? {
          'data-ligne-element': l.element.id,
          'data-ligne-source': g?.id === l.element.id ? l.element.id : undefined,
          'data-insertion-ligne': g?.cible?.id === l.element.id ? l.element.id : undefined,
          'data-insertion': g?.cible?.id === l.element.id ? g.cible.zone : undefined,
        }
      : {};
  const lignes: LigneGantt[] = [
    ...elements.map((element): LigneGantt => ({ genre: 'element', element })),
    ...sousProjets.map((sousProjet): LigneGantt => ({ genre: 'sous-projet', sousProjet })),
  ];
  const parcourables = barresParcourables(lignes);
  const actif = active !== null && parcourables.includes(active) ? active : null;
  const ligneActive =
    actif === null
      ? undefined
      : lignes.find((l) => l.genre === 'element' && l.element.id === actif);
  const surTouche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const suivante = barreSuivante(parcourables, actif, e.key === 'ArrowDown' ? 'bas' : 'haut');
      if (suivante !== null) setActive(suivante);
    } else if (e.key === 'Escape') {
      setActive(null);
    } else if (((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') && actif !== null) {
      const boite = zone.current
        ?.querySelector(`[data-element-id="${actif}"]`)
        ?.getBoundingClientRect();
      if (boite) {
        const x = boite.left + Math.min(8, boite.width / 2);
        if (ouvrirMenu(actif, x, boite.top + boite.height / 2, 'calendrier')) e.preventDefault();
      }
    } else if (e.key === 'Enter' && actif !== null) {
      e.preventDefault();
      void ouvrir(actif, lignes, projet.peut_ecrire);
    }
  };
  const calcule = lignes.some((l) => datesLigne(l) !== null);
  const client = projet.peut_ecrire;
  const jours = [...joursConnus(lignes), ...(client ? joursClient(lignes) : [])].sort(
    (a, b) => numeroJour(a) - numeroJour(b),
  );
  const plage = etendrePlage(
    calculerPlage({ debutProjet: projet.date_debut, jours, aujourdhui }),
    largeurSvg,
    zoom,
  );

  return (
    <section aria-label="Gantt" className="flex flex-col gap-4">
      {retours}
      {!calcule && (
        <Notification type="info">
          <div className="flex flex-wrap items-center gap-4">
            <span>Planning non calculé : aucune date planifiée pour ce projet.</span>
            {peutCalculer && boutonCalculer}
          </div>
        </Notification>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {peutCalculer && boutonCalculer}
        {peutCalculer && caseAuto}
        <BoutonsZoom zoom={zoom} chemin={chemin} />
        <CaseInitiales actif={initiales} chemin={chemin} />
        <MenuColonnes etat={disposition} />
        {/* Groupe qui passe à la ligne en entier, jamais un bouton seul (D-131). */}
        <div className="flex flex-nowrap items-center gap-4">
          {peutCalculer && (
            <Button variante="secondaire" onClick={() => setCopie(true)}>
              <Copy aria-hidden className="size-4" />
              Copier
            </Button>
          )}
          <Button
            variante="secondaire"
            title={
              pile.videParCalcul && pile.entrees.length === 0
                ? 'Rien à annuler depuis le dernier calcul'
                : 'Annuler (Ctrl+Z)'
            }
            disabled={!peutAnnuler}
            onClick={() => void annuler()}
          >
            <Undo2 aria-hidden className="size-4" />
            Annuler
          </Button>
        </div>
      </div>
      {dialogue}
      {client && projet.totaux && (
        <TotauxProjetRegion totaux={projet.totaux} hrefCouts={hrefCouts} />
      )}
      <DispositionGantt
        etat={disposition}
        propsTableau={{
          ref: zoneTableau,
          onContextMenu: surMenuNavigateur('tableau'),
          'aria-label': 'Tableau du Gantt',
          className: g ? 'cursor-grabbing select-none' : '',
        }}
        propsCalendrier={{
          ref: refZone,
          onKeyDown: surTouche,
          onContextMenu: surMenuNavigateur('calendrier'),
          'aria-label': 'Calendrier du Gantt',
          className: 'pl-2',
        }}
        tableau={
          <Table
            compact
            legende="Éléments du projet"
            poigneeLargeur={poigneeColonne(disposition)}
            colonnes={disposition.colonnes(
              colonnes(
                poignee,
                projet.peut_ecrire
                  ? (element) => void ouvrir(element.id, lignes, projet.peut_ecrire, 'tableau')
                  : null,
                (sp) =>
                  sousProjetsEcrits.has(sp.id)
                    ? () => {
                        if (!edition) {
                          origine.current = 'tableau';
                          setEdition({ kind: 'projet', id: sp.id });
                        }
                      }
                    : null,
                client,
                projet.peut_ecrire
                  ? (element, assignation) => {
                      if (edition) return;
                      origine.current = 'tableau';
                      setEdition({ kind: 'assignation', assignation, activite: element.nom });
                    }
                  : null,
              ),
            )}
            attributsLigne={attributsLigne}
            lignes={lignes}
            cle={(l) => (l.genre === 'element' ? `e${l.element.id}` : `p${l.sousProjet.id}`)}
          />
        }
        calendrier={
          <GanttSvg
            lignes={lignes}
            dependances={dependances}
            plage={plage}
            zoom={zoom}
            aujourdhui={aujourdhui}
            initiales={initiales}
            joursRouges={joursRouges}
            client={client}
            clavier={{
              active: actif,
              onActiver: activer,
              onOuvrir: (id) => void ouvrir(id, lignes, projet.peut_ecrire),
            }}
            gestes={
              estModele
                ? undefined
                : {
                    peutEcrire: projet.peut_ecrire,
                    contours: contours.parElement,
                    onGeste: envoyerGeste,
                    onLien: creerLien,
                    onOuvrirLien: (id) => {
                      const dependance = dependances.find((d) => d.id === id);
                      if (dependance && !edition) {
                        origine.current = 'calendrier';
                        setEdition({ kind: 'dependance', dependance });
                      }
                    },
                  }
            }
          />
        }
      >
        <div data-annonce-gantt aria-live="polite" className="sr-only">
          {ligneActive
            ? `${nomAccessible(ligneActive, client) ?? ''}${
                ligneActive.genre === 'element'
                  ? texteSurcharge(joursRouges.get(ligneActive.element.id) ?? [])
                  : ''
              }`
            : ''}
        </div>
      </DispositionGantt>
      <ContextMenu.Root onOpenChange={(o) => !o && setMenu(null)}>
        <ContextMenu.Trigger asChild>
          <span ref={declencheur} aria-hidden className="hidden" />
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (creationPrevue.current) creationPrevue.current = false;
              else rendreFocusOrigine();
            }}
            className="z-50 min-w-56 rounded-ui border border-gray-200 bg-white p-1 text-normal text-gray-800 shadow-ui"
          >
            {menu &&
              entreesMenu(menu.type).map((entree) => (
                <ContextMenu.Item
                  key={entree}
                  onSelect={() => {
                    const corps = corpsCreation(elements, menu.id, entree);
                    if (!corps) return;
                    creationPrevue.current = true;
                    setCreation({
                      entree,
                      parent: elements.find((x) => x.id === menu.id)?.nom ?? '',
                      corps,
                    });
                  }}
                  className="flex h-8 cursor-default items-center rounded-ui px-3 whitespace-nowrap select-none focus-visible:outline-offset-[-2px] data-[highlighted]:bg-accent-bg data-[highlighted]:text-gray-900"
                >
                  {libelleEntree(entree)}
                </ContextMenu.Item>
              ))}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {creation && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermerCreation()}
          titre={libelleEntree(creation.entree)}
          description={
            creation.entree === 'activite'
              ? 'Saisissez le nom de l’activité.'
              : creation.entree === 'jalon'
                ? 'Saisissez le nom du jalon.'
                : `Saisissez le nom de la sous-activité de ${creation.parent}.`
          }
        >
          <FormulaireNom
            libelle="Créer"
            projetId={projetId}
            chemin={`/api/projets/${projetId}/${creation.entree === 'jalon' ? 'jalons' : 'activites'}`}
            corps={creation.corps}
            avecChargeVendue={creation.entree !== 'jalon'}
            onSucces={apresCreation}
            onAnnuler={fermerCreation}
          />
        </Dialog>
      )}
      {copie && (
        <DialogueCopie
          source={{ id: projetId, nom, date_debut: projet.date_debut }}
          depuisModele={false}
          admin={admin}
          onFermer={() => setCopie(false)}
        />
      )}
      {edition?.kind === 'activite' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermerEdition()}
          titre="Modifier l’activité"
          description={`Modifiez ${edition.activite.nom}.`}
        >
          <FormulaireActivite
            activite={edition.activite}
            projetId={projetId}
            onChangement={apresChangement}
            onSucces={apresEdition}
            onAnnuler={fermerEdition}
          />
        </Dialog>
      )}
      {edition?.kind === 'assignation' && (
        <DialogueModifAssignation
          id={edition.assignation.id}
          charge={edition.assignation.charge_assignee}
          taux={edition.assignation.taux}
          nomRessource={edition.assignation.nom}
          nomActivite={edition.activite}
          onSucces={apresEdition}
          onFermer={fermerEdition}
        />
      )}
      {edition?.kind === 'dependance' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && !suppression && fermerEdition()}
          titre="Modifier la dépendance"
          description="Modifiez le type et le délai."
        >
          <FormulaireModifDependance
            id={edition.dependance.id}
            type={edition.dependance.type}
            delai={edition.dependance.delai}
            onSucces={apresEdition}
            onAnnuler={fermerEdition}
            onSupprimer={() => {
              const d = edition.dependance;
              const nom = (id: number) => elements.find((e) => e.id === id)?.nom ?? '';
              setSuppression({
                nom: `la dépendance ${nom(d.predecesseur_id)} → ${nom(d.successeur_id)}`,
                dependance: d,
              });
            }}
          />
        </Dialog>
      )}
      {suppression && (
        <Confirmation
          nom={suppression.nom}
          action={() => api(`/api/dependances/${suppression.dependance.id}`, { method: 'DELETE' })}
          onSucces={() => {
            setAnnule(false);
            pile.empiler(inverseLienSupprime(projetId, suppression.dependance));
            setSuppression(null);
            apresEdition();
          }}
          onAnnuler={() => setSuppression(null)}
        />
      )}
      {edition?.kind === 'projet' && (
        <DialogueModifProjet
          projetId={edition.id}
          onFermer={fermerEdition}
          onSucces={() => {
            fermerEdition();
            recharger();
            rechargerProjets();
          }}
        />
      )}
      {edition?.kind === 'jalon' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermerEdition()}
          titre="Modifier le jalon"
          description={`Modifiez ${edition.jalon.nom}.`}
        >
          <FormulaireJalon
            jalon={edition.jalon}
            projetId={projetId}
            onChangement={apresChangement}
            onSucces={apresEdition}
            onAnnuler={fermerEdition}
          />
        </Dialog>
      )}
    </section>
  );
}
