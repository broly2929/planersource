import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { DialogueCalcul, type ReponseCalcul } from '../calcul/DialogueCalcul';
import { lignesAvertissements } from '../calcul/logique';
import { nomsAssignations } from '../calcul/noms';
import { Layout } from '../components/Layout';
import { api, ROLE_LABELS } from '../api';
import { Badge } from '../components/Badge';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import {
  joursAccueil,
  lignesAccueil,
  nomsElementsCharges,
  optionsRessources,
  parametresRessource,
  projetsVisibles,
  rechercheRessource,
  type ProjetAccueil,
} from '../accueil/logique';
import { BoutonsZoom } from '../gantt/BoutonsZoom';
import { CaseInitiales } from '../gantt/CaseInitiales';
import { Drapeaux } from '../gantt/Drapeaux';
import {
  DispositionGantt,
  MenuColonnes,
  poigneeColonne,
  useDispositionGantt,
} from '../gantt/DispositionGantt';
import { CLASSE_CELLULE_DRAPEAUX, CLASSE_ENTETE_DRAPEAUX, CLASSE_NOM_MAX } from '../gantt/largeurs';
import { dateLocale, lireInitialesAccueil, lireZoom } from '../gantt/echelle';
import {
  GanttSvg,
  datesLigne,
  type DependanceGantt,
  type ElementGantt,
  type LigneSvg,
} from '../gantt/GanttSvg';
import { formaterAvancement, formaterDate, formaterNombre, VIDE } from '../gantt/libelles';
import { formaterJours } from '../gantt/vendu';
import { calculerPlage, etendrePlage } from '../gantt/plage';
import { useLargeur } from '../gantt/useLargeur';
import { indentation, sousProjets, type LigneArbre } from '../projets/arbre';
import { useAnnuaire } from '../annuaire';
import { Select } from '../components/Select';
import { Link, navigate, usePath, useSearch } from '../router';
import { PlanningRessource } from './PlanningRessource';
import { useListe } from './projet/commun';
import { DialogueModifProjet } from './projet/DialogueModifProjet';
import {
  FormulaireActivite,
  FormulaireJalon,
  type ActiviteDetail,
  type JalonDetail,
} from './projet/FormulairesEdition';

/** Dialogue de modification ouvert depuis le tableau (D-127 (6)). */
type Edition =
  | { kind: 'activite'; activite: ActiviteDetail }
  | { kind: 'jalon'; jalon: JalonDetail }
  | { kind: 'projet'; id: number };

type Contenu =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'ok'; elements: ElementGantt[]; dependances: DependanceGantt[] };

type LigneEcran =
  | LigneArbre<ProjetAccueil, ElementGantt>
  | { type: 'message'; cle: string; texte: string; profondeur: number };

const cleLigne = (l: LigneEcran) =>
  l.type === 'projet' ? `p${l.projet.id}` : l.type === 'element' ? `e${l.element.id}` : l.cle;

function ligneSvg(l: LigneEcran): LigneSvg {
  if (l.type === 'projet') {
    const p = l.projet;
    return {
      genre: 'sous-projet',
      sousProjet: {
        id: p.id,
        code: p.code,
        nom: p.nom,
        debut_planifie: p.debut_planifie,
        fin_planifiee: p.fin_planifiee,
        clos: false,
      },
    };
  }
  if (l.type === 'element') return { genre: 'element', element: l.element };
  return { genre: 'vide', cle: l.cle };
}

const datesElement = (l: LigneEcran) =>
  l.type === 'element' ? datesLigne({ genre: 'element', element: l.element }) : null;

function GanttGlobal() {
  const [etat, rechargerProjets] = useListe<ProjetAccueil[]>('/api/projets');
  const [calcul, setCalcul] = useState(false);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [erreurEdition, setErreurEdition] = useState<'chargement' | 'absent' | null>(null);
  const [chargementEdition, setChargementEdition] = useState(false);
  const [succes, setSucces] = useState(false);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [aujourdhui] = useState(() => dateLocale(new Date()));
  const chemin = usePath();
  const recherche = useSearch();
  const zoom = lireZoom(recherche.get('zoom'));
  const initiales = lireInitialesAccueil(recherche.get('initiales'));
  const [largeurSvg, zoneSvg] = useLargeur();
  const disposition = useDispositionGantt('accueil', { vendu: true });
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [contenus, setContenus] = useState<Map<number, Contenu>>(new Map());
  const demandes = useRef<Set<number>>(new Set());
  const tous = useMemo(() => (etat.statut === 'ok' ? etat.donnees : []), [etat]);
  const visibles = useMemo(() => projetsVisibles(tous), [tous]);
  // Un rechargement réussi des projets efface l'erreur d'ouverture d'un élément (D-131).
  useEffect(() => {
    if (etat.statut === 'ok') setErreurEdition(null);
  }, [etat]);

  const chargerContenu = useCallback((id: number) => {
    if (demandes.current.has(id)) return;
    demandes.current.add(id);
    const mettre = (c: Contenu) => setContenus((m) => new Map(m).set(id, c));
    mettre({ statut: 'chargement' });
    api<{ elements?: ElementGantt[]; dependances?: DependanceGantt[] }>(`/api/projets/${id}/gantt`)
      .then((g) =>
        mettre({ statut: 'ok', elements: g.elements ?? [], dependances: g.dependances ?? [] }),
      )
      .catch(() => {
        demandes.current.delete(id);
        mettre({ statut: 'erreur' });
      });
  }, []);

  const basculer = (id: number) => {
    const ouvert = ouverts.has(id);
    setOuverts((o) => {
      const n = new Set(o);
      if (ouvert) n.delete(id);
      else n.add(id);
      return n;
    });
    if (!ouvert) chargerContenu(id);
  };

  // D-218 (4) : au premier affichage des projets, tout est déplié (comme « Tout déplier »), une seule fois.
  const depliageInitial = useRef(false);
  useEffect(() => {
    if (depliageInitial.current || etat.statut !== 'ok') return;
    depliageInitial.current = true;
    setOuverts(new Set(visibles.map((p) => p.id)));
    visibles.forEach((p) => chargerContenu(p.id));
  }, [etat.statut, visibles, chargerContenu]);

  const toutOuvert = visibles.length > 0 && visibles.every((p) => ouverts.has(p.id));
  const basculerTout = () => {
    if (toutOuvert) {
      setOuverts(new Set());
      return;
    }
    setOuverts(new Set(visibles.map((p) => p.id)));
    visibles.forEach((p) => chargerContenu(p.id));
  };

  const elementsCharges = useMemo(() => {
    const m = new Map<number, ElementGantt[]>();
    for (const [id, c] of contenus) if (c.statut === 'ok') m.set(id, c.elements);
    return m;
  }, [contenus]);

  /** Après un calcul : ancien contenu gardé jusqu'à l'arrivée du nouveau, seuls les dépliés sont relus. */
  const rechargerContenus = () => {
    demandes.current = new Set(ouverts);
    setContenus((m) => new Map([...m].filter(([id]) => ouverts.has(id))));
    for (const id of ouverts) {
      api<{ elements?: ElementGantt[]; dependances?: DependanceGantt[] }>(
        `/api/projets/${id}/gantt`,
      )
        .then((g) =>
          setContenus((m) =>
            new Map(m).set(id, {
              statut: 'ok',
              elements: g.elements ?? [],
              dependances: g.dependances ?? [],
            }),
          ),
        )
        .catch(() => {
          demandes.current.delete(id);
          setContenus((m) => new Map(m).set(id, { statut: 'erreur' }));
        });
    }
  };

  /** Ouvre le dialogue de modification d'un élément du projet `projetId` (valeurs lues à l'ouverture). */
  const modifierElement = async (projetId: number, element: ElementGantt) => {
    if (edition || chargementEdition) return;
    setErreurEdition(null);
    setChargementEdition(true);
    try {
      if (element.type === 'jalon') {
        const liste = await api<JalonDetail[]>(`/api/projets/${projetId}/jalons`);
        const jalon = liste.find((j) => j.id === element.id);
        if (jalon) setEdition({ kind: 'jalon', jalon });
        else setErreurEdition('absent');
      } else {
        const liste = await api<ActiviteDetail[]>(`/api/projets/${projetId}/activites`);
        const activite = liste.find((a) => a.id === element.id);
        if (activite) setEdition({ kind: 'activite', activite });
        else setErreurEdition('absent');
      }
    } catch {
      setErreurEdition('chargement');
    } finally {
      setChargementEdition(false);
    }
  };
  const fermerEdition = () => setEdition(null);
  /** Après enregistrement : projets puis éléments des projets dépliés relus (repli conservé). */
  const apresEdition = () => {
    fermerEdition();
    rechargerProjets();
    rechargerContenus();
  };

  const apresCalcul = async (reponse: ReponseCalcul) => {
    setCalcul(false);
    setSucces(true);
    setAvertissements([]);
    rechargerProjets();
    rechargerContenus();
    if (reponse.avertissements.some((a) => a.code === 'reste_non_pose')) {
      const noms = await nomsAssignations(reponse.projets);
      setAvertissements(lignesAvertissements(reponse.avertissements, noms));
    }
  };

  const lignes = useMemo(() => {
    const message = (p: ProjetAccueil, profondeur: number): LigneEcran | null => {
      const c = contenus.get(p.id);
      const texte =
        !c || c.statut === 'chargement'
          ? 'Chargement du contenu…'
          : c.statut === 'erreur'
            ? 'Impossible de charger le contenu du projet.'
            : c.elements.length === 0 && sousProjets(visibles, p.id).length === 0
              ? 'Aucune activité ni jalon.'
              : null;
      return texte ? { type: 'message', cle: `m${p.id}`, texte, profondeur: profondeur + 1 } : null;
    };
    return lignesAccueil(tous, ouverts, elementsCharges).flatMap<LigneEcran>((l) => {
      if (l.type !== 'projet' || !ouverts.has(l.projet.id)) return [l];
      const m = message(l.projet, l.profondeur);
      return m ? [l, m] : [l];
    });
  }, [tous, visibles, ouverts, contenus, elementsCharges]);

  const projetDeElement = new Map<number, number>();
  for (const [idProjet, liste] of elementsCharges) {
    for (const e of liste) projetDeElement.set(e.id, idProjet);
  }
  const peutEcrire = new Set(visibles.filter((p) => p.peut_ecrire).map((p) => p.id));

  if (etat.statut === 'chargement') return <Chargement libelle="Chargement des projets…" />;
  if (etat.statut === 'erreur') {
    return <Notification type="erreur">Impossible de charger les projets.</Notification>;
  }
  if (visibles.length === 0) return <Vide>Aucun projet à afficher.</Vide>;

  /** Valeur d'une colonne ajoutée (D-216 (6)) : lignes d'éléments seulement, lignes de projet vides. */
  const valeurElement =
    (f: (e: ElementGantt) => string) =>
    (l: LigneEcran): string =>
      l.type === 'element' ? f(l.element) : '';
  /** Charge, avancement, réel : activité, valeur ; jalon, « — » (3b point 2). */
  const chargeActivite = (f: (e: ElementGantt) => string) =>
    valeurElement((e) => (e.type === 'activite' ? f(e) : VIDE));
  /** Vendu et Marge (D-149 (8b)) : activité d'un projet que l'utilisateur écrit ; jalon et lecture : vide. */
  const vendu = (f: (e: ElementGantt) => number | null | undefined) =>
    valeurElement((e) => {
      const idProjet = projetDeElement.get(e.id);
      return e.type === 'activite' && idProjet !== undefined && peutEcrire.has(idProjet)
        ? formaterJours(f(e) ?? null)
        : '';
    });
  const colonnesAjoutees: (Colonne<LigneEcran> & { id: string })[] = [
    {
      id: 'charge',
      titre: 'Charge',
      cellule: chargeActivite((e) => formaterNombre(e.charge_assignee ?? null)),
    },
    {
      id: 'avancement',
      titre: 'Avancement',
      cellule: chargeActivite((e) => formaterAvancement(e.avancement ?? null)),
    },
    {
      id: 'reel',
      titre: 'Réel',
      cellule: chargeActivite((e) => formaterNombre(e.charge_reelle ?? null)),
    },
    { id: 'vendu', titre: 'Vendu', cellule: vendu((e) => e.charge_vendue) },
    {
      id: 'marge',
      titre: 'Marge',
      cellule: vendu((e) => e.marge),
      // Clé absente sur un projet en lecture (D-149 (4)) : jamais en couleur flag.
      classeCelluleLigne: (l) =>
        l.type === 'element' && (l.element.marge ?? 0) < 0 ? 'text-flag' : '',
    },
  ];
  const colonnes = disposition.colonnes<LigneEcran>([
    {
      id: 'code',
      titre: 'Code',
      cellule: (l) =>
        l.type === 'projet' ? l.projet.code : l.type === 'element' ? l.element.wbs : null,
    },
    {
      id: 'nom',
      titre: 'Nom',
      cellule: (l) => {
        if (l.type === 'message') {
          return (
            <span className="text-gray-700" style={indentation(l.profondeur, true)}>
              {l.texte}
            </span>
          );
        }
        if (l.type === 'element') {
          const idProjet = projetDeElement.get(l.element.id);
          const modifiable = idProjet !== undefined && peutEcrire.has(idProjet);
          return (
            // Ligne de texte (nom puis badge) ; dans une colonne réglée, rangée flexible pour tronquer le nom.
            <span
              className="in-data-cadre:flex in-data-cadre:items-center"
              style={indentation(l.profondeur, true)}
            >
              {modifiable ? (
                <button
                  type="button"
                  title={l.element.nom}
                  disabled={chargementEdition}
                  onClick={() => void modifierElement(idProjet, l.element)}
                  className={`inline-block min-w-0 ${CLASSE_NOM_MAX} cursor-pointer truncate text-left align-middle text-accent underline focus-visible:rounded-ui disabled:cursor-wait disabled:opacity-60`}
                >
                  {l.element.nom}
                </button>
              ) : (
                <span
                  title={l.element.nom}
                  className={`inline-block min-w-0 ${CLASSE_NOM_MAX} truncate align-middle`}
                >
                  {l.element.nom}
                </span>
              )}
              {l.element.type === 'jalon' && (
                <>
                  {' '}
                  <span className="ml-2 shrink-0 align-middle">
                    <Badge statut="neutre">Jalon</Badge>
                  </span>
                </>
              )}
            </span>
          );
        }
        const p = l.projet;
        const ouvert = ouverts.has(p.id);
        return (
          <span className="flex items-center gap-2" style={indentation(l.profondeur)}>
            <BoutonIcone
              libelle={`${ouvert ? 'Replier' : 'Déplier'} ${p.nom}`}
              icone={ouvert ? ChevronDown : ChevronRight}
              aria-expanded={ouvert}
              onClick={() => basculer(p.id)}
            />
            <Link
              to={`/projets/${p.id}`}
              title={p.nom}
              className={`block min-w-0 ${CLASSE_NOM_MAX} truncate text-accent underline`}
            >
              {p.nom}
            </Link>
            {p.peut_ecrire && (
              <BoutonIcone
                libelle={`Modifier le projet ${p.nom}`}
                icone={Pencil}
                className="shrink-0"
                onClick={() => !edition && setEdition({ kind: 'projet', id: p.id })}
              />
            )}
          </span>
        );
      },
    },
    {
      id: 'debut',
      titre: 'Début',
      cellule: (l) =>
        l.type === 'projet'
          ? formaterDate(l.projet.debut_planifie)
          : l.type === 'element'
            ? formaterDate(datesElement(l)?.debut ?? null)
            : null,
    },
    {
      id: 'fin',
      titre: 'Fin',
      cellule: (l) =>
        l.type === 'projet'
          ? formaterDate(l.projet.fin_planifiee)
          : l.type === 'element'
            ? formaterDate(datesElement(l)?.fin ?? null)
            : null,
    },
    ...colonnesAjoutees,
    {
      id: 'drapeaux',
      titre: 'Drapeaux',
      classeEntete: CLASSE_ENTETE_DRAPEAUX,
      classeCellule: CLASSE_CELLULE_DRAPEAUX,
      cellule: (l) =>
        l.type === 'element' && l.element.drapeaux.length > 0 ? (
          <Drapeaux drapeaux={l.element.drapeaux} />
        ) : null,
    },
  ]);

  const lignesGantt = lignes.map(ligneSvg);
  const dependances = visibles.flatMap((p) => {
    const c = contenus.get(p.id);
    return ouverts.has(p.id) && c?.statut === 'ok' ? c.dependances : [];
  });
  const calcule = visibles.some((p) => p.debut_planifie && p.fin_planifiee);
  const plage = etendrePlage(
    calculerPlage({ ...joursAccueil(visibles, elementsCharges), aujourdhui }),
    largeurSvg,
    zoom,
  );

  return (
    <section aria-label="Gantt global" className="flex flex-col gap-4">
      {!calcule && (
        <Notification type="info">
          Planning non calculé : aucune date planifiée pour les projets affichés.
        </Notification>
      )}
      {succes && <Notification type="succes">Planning calculé.</Notification>}
      {erreurEdition === 'chargement' && (
        <Notification type="erreur">Impossible de charger l’élément à modifier.</Notification>
      )}
      {erreurEdition === 'absent' && (
        <Notification type="erreur">Élément introuvable.</Notification>
      )}
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
      {calcul && (
        <DialogueCalcul
          precoches="tous"
          noms={nomsElementsCharges(elementsCharges)}
          onSucces={apresCalcul}
          onFermer={() => setCalcul(false)}
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
            onSucces={apresEdition}
            onAnnuler={fermerEdition}
          />
        </Dialog>
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
            onSucces={apresEdition}
            onAnnuler={fermerEdition}
          />
        </Dialog>
      )}
      {edition?.kind === 'projet' && (
        <DialogueModifProjet
          projetId={edition.id}
          onFermer={fermerEdition}
          onSucces={apresEdition}
        />
      )}
      <div className="flex items-center gap-4">
        <BoutonsZoom zoom={zoom} chemin={chemin} />
        <CaseInitiales actif={initiales} chemin={chemin} cocheeParDefaut />
        <MenuColonnes etat={disposition} />
        {visibles.some((p) => p.peut_ecrire) && (
          <Button variante="secondaire" onClick={() => setCalcul(true)}>
            Calculer
          </Button>
        )}
        <Button variante="secondaire" onClick={basculerTout}>
          {toutOuvert ? 'Tout replier' : 'Tout déplier'}
        </Button>
      </div>
      <DispositionGantt
        etat={disposition}
        propsTableau={{ 'aria-label': 'Tableau du Gantt global' }}
        propsCalendrier={{ ref: zoneSvg, 'aria-label': 'Calendrier du Gantt global' }}
        tableau={
          <Table
            compact
            legende="Projets"
            colonnes={colonnes}
            lignes={lignes}
            cle={cleLigne}
            poigneeLargeur={poigneeColonne(disposition)}
          />
        }
        calendrier={
          <GanttSvg
            lignes={lignesGantt}
            dependances={dependances}
            plage={plage}
            zoom={zoom}
            aujourdhui={aujourdhui}
            initiales={initiales}
          />
        }
      />
    </section>
  );
}

/** Liste « Planning de » et vue choisie : Gantt global ou planning d'une ressource (D-157 (5)). */
function CorpsAccueil() {
  const annuaire = useAnnuaire();
  const chemin = usePath();
  const recherche = useSearch();
  const options = useMemo(() => optionsRessources(annuaire ?? []), [annuaire]);
  const { ressource, corrige } = parametresRessource(
    recherche,
    options.map((o) => o.id),
  );
  // Adresse corrigée sans rechargement, une fois l'annuaire connu.
  const corrigeEffectif = annuaire !== null && corrige;
  useEffect(() => {
    if (corrigeEffectif)
      navigate(`${chemin}${rechercheRessource(recherche, null)}`, { replace: true });
  }, [corrigeEffectif, chemin, recherche]);

  if (annuaire === null && recherche.has('ressource')) {
    return <Chargement libelle="Chargement des projets…" />;
  }
  return (
    <>
      {annuaire !== null && (
        <div className="flex items-end gap-4">
          <Select
            label="Planning de"
            className="w-56"
            value={ressource === null ? '' : String(ressource)}
            onChange={(e) => {
              const v = e.target.value;
              navigate(`${chemin}${rechercheRessource(recherche, v === '' ? null : Number(v))}`);
            }}
            options={[
              { value: '', label: 'Tous les projets' },
              ...options.map((o) => ({ value: String(o.id), label: o.nom })),
            ]}
          />
        </div>
      )}
      {ressource === null ? <GanttGlobal /> : <PlanningRessource key={ressource} id={ressource} />}
    </>
  );
}

export function Accueil() {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  return (
    <Layout titre="Accueil">
      <div className="flex flex-col gap-4">
        {user && (
          <p>
            Connecté en tant que <span className="font-semibold">{user.nom}</span> (
            {ROLE_LABELS[user.role]}).
          </p>
        )}
        {user && <CorpsAccueil />}
      </div>
    </Layout>
  );
}
