import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown, ChevronRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { useAnnuaire, type EntreeAnnuaire } from '../annuaire';
import { useAuth } from '../auth';
import { BoutonIcone } from '../components/BoutonIcone';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog, useDialoguePret, useEnvoiEnCours, useFermeture } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Select } from '../components/Select';
import { Table, type Colonne } from '../components/Table';
import { dateLocale } from '../gantt/echelle';
import { ChampOtp } from '../components/ChampOtp';
import { aideOtp, heriteDe, otpSaisi, type OtpLecture } from '../couts';
import { Link, navigate, usePath, useSearch } from '../router';
import {
  aplatir,
  indentation,
  optionsProjetParent,
  sousProjets,
  type ElementArbre,
  type LigneArbre,
} from '../projets/arbre';
import { CODE_UTILISE, ONGLET, texteRefusCode } from './projet/commun';
import { DialogueCopie } from './projet/DialogueCopie';
import { DialogueModifProjet } from './projet/DialogueModifProjet';
import { GanttProjet } from './projet/GanttProjet';
import { useContours } from './projet/contours';
import { usePileAnnulation } from './projet/annulation';
import { AffectationsProjet } from './projet/AffectationsProjet';
import { HistoriqueProjet } from './projet/HistoriqueProjet';
import { PlanningProjet } from './projet/PlanningProjet';

export interface Projet {
  id: number;
  code: string;
  nom: string;
  chef_id: number;
  parent_id: number | null;
  date_debut: string;
  debut_planifie?: string | null;
  est_modele: boolean;
  peut_ecrire: boolean;
  otp: string | null;
  otp_effectif: string | null;
  otp_source: OtpLecture['otp_source'];
}

type Etat<T> =
  { statut: 'chargement' } | { statut: 'erreur'; message: string } | { statut: 'ok'; donnees: T };

function useChargement<T>(chemin: string, message: string) {
  const [etat, setEtat] = useState<Etat<T>>({ statut: 'chargement' });
  const charger = useCallback(() => {
    api<T>(chemin)
      .then((donnees) => setEtat({ statut: 'ok', donnees }))
      .catch((err) =>
        setEtat({
          statut: 'erreur',
          message: err instanceof ApiError && err.status === 404 ? 'Projet introuvable.' : message,
        }),
      );
  }, [chemin, message]);
  useEffect(charger, [charger]);
  return [etat, charger] as const;
}

function Actions({
  onAnnuler,
  enCours,
  libelle,
}: {
  onAnnuler: () => void;
  enCours: boolean;
  libelle: string;
}) {
  useEnvoiEnCours(enCours);
  const fermer = useFermeture(onAnnuler);
  return (
    <div className="flex justify-end gap-2">
      <Button variante="secondaire" onClick={fermer}>
        Annuler
      </Button>
      <Button type="submit" enCours={enCours}>
        {libelle}
      </Button>
    </div>
  );
}

function nomDe(annuaire: EntreeAnnuaire[] | null, id: number): string {
  return annuaire?.find((u) => u.id === id)?.nom ?? '…';
}

function FormulaireProjet({
  annuaire,
  projets,
  onCree,
  onAnnuler,
}: {
  annuaire: EntreeAnnuaire[] | null;
  projets: Projet[];
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const { etat } = useAuth();
  const user = etat.statut === 'connecte' ? etat.user : null;
  const admin = user?.role === 'administrateur';
  useDialoguePret(annuaire !== null);
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [chef, setChef] = useState(admin ? '' : String(user?.id ?? ''));
  const [debut, setDebut] = useState(() => dateLocale(new Date()));
  const [parent, setParent] = useState('');
  const [otp, setOtp] = useState('');
  // D-225 : aide de la valeur héritée du projet parent choisi.
  const projetParent = projets.find((x) => String(x.id) === parent);
  const aide =
    otp.trim() === '' && projetParent
      ? aideOtp(heriteDe(projetParent, 'projet', projetParent.code))
      : null;
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const optionsParent = [
    { value: '', label: 'Aucun (projet racine)' },
    ...optionsProjetParent(projets),
  ];

  // D-028 : l'administrateur choisit parmi les chefs et administrateurs actifs ; un chef, lui seul.
  const candidats = (annuaire ?? []).filter((u) =>
    admin
      ? u.actif && (u.role === 'administrateur' || u.role === 'chef_de_projet')
      : String(u.id) === String(user?.id),
  );
  const options = [
    ...(admin ? [{ value: '', label: 'Moi (par défaut)' }] : []),
    ...candidats.map((u) => ({ value: String(u.id), label: u.nom })),
  ];

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await api('/api/projets', {
        method: 'POST',
        body: {
          code,
          nom,
          ...(chef ? { chef_id: Number(chef) } : {}),
          date_debut: debut,
          ...(parent ? { parent_id: Number(parent) } : {}),
          ...(otpSaisi(otp) ? { otp: otpSaisi(otp) } : {}),
        },
      });
      onCree();
    } catch (err) {
      // D-083 (9), (14) : texte d'un 422 d'après son seul code.
      const parCode =
        err instanceof ApiError && err.status === 422 ? texteRefusCode(err, 'projet') : null;
      setErreur(
        err instanceof ApiError && err.status === 409
          ? CODE_UTILISE
          : parCode
            ? parCode
            : err instanceof ApiError && (err.status === 400 || err.status === 422)
              ? 'Données invalides : vérifiez le code, le nom, le chef et la date.'
              : err instanceof ApiError && err.status === 403
                ? 'Vous n’avez pas le droit de créer ce projet.'
                : 'Création impossible pour le moment. Réessayez.',
      );
      setEnCours(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      {erreur && <Notification type="erreur">{erreur}</Notification>}
      <Field label="Code" required value={code} onChange={(e) => setCode(e.target.value)} />
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <Select
        label="Chef de projet"
        value={chef}
        onChange={(e) => setChef(e.target.value)}
        options={options}
      />
      <Select
        label="Projet parent"
        value={parent}
        onChange={(e) => setParent(e.target.value)}
        options={optionsParent}
      />
      <Field
        label="Pas avant le"
        type="date"
        required
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <ChampOtp valeur={otp} onChange={setOtp} aide={aide} />
      <Actions onAnnuler={onAnnuler} enCours={enCours} libelle="Créer" />
    </form>
  );
}

interface ElementProjet extends ElementArbre {
  debut_planifie?: string | null;
  date_planifiee?: string | null;
}

type Contenu =
  { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; elements: ElementProjet[] };

type LigneEcran =
  | LigneArbre<Projet, ElementProjet>
  | { type: 'message'; cle: string; texte: string; profondeur: number };

export function Projets() {
  const { etat: auth } = useAuth();
  const peutCreer =
    auth.statut === 'connecte' &&
    (auth.user.role === 'administrateur' || auth.user.role === 'chef_de_projet');
  const annuaire = useAnnuaire();
  const [etat, charger] = useChargement<Projet[]>(
    '/api/projets',
    'Impossible de charger les projets.',
  );
  const [dialogue, setDialogue] = useState(false);
  const [aCopier, setACopier] = useState<Projet | null>(null);
  const [aModifier, setAModifier] = useState<Projet | null>(null);
  const [ouverts, setOuverts] = useState<Set<number>>(new Set());
  const [contenus, setContenus] = useState<Map<number, Contenu>>(new Map());
  const demandes = useRef<Set<number>>(new Set());
  const admin = auth.statut === 'connecte' && auth.user.role === 'administrateur';
  const projets = useMemo(() => (etat.statut === 'ok' ? etat.donnees : []), [etat]);

  const chargerContenu = useCallback((id: number) => {
    if (demandes.current.has(id)) return;
    demandes.current.add(id);
    const mettre = (c: Contenu) => setContenus((m) => new Map(m).set(id, c));
    mettre({ statut: 'chargement' });
    api<{ elements: ElementProjet[] }>(`/api/projets/${id}/gantt`)
      .then((g) => mettre({ statut: 'ok', elements: g.elements ?? [] }))
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

  const toutOuvert = projets.length > 0 && projets.every((p) => ouverts.has(p.id));
  const basculerTout = () => {
    if (toutOuvert) {
      setOuverts(new Set());
      return;
    }
    setOuverts(new Set(projets.map((p) => p.id)));
    projets.forEach((p) => chargerContenu(p.id));
  };

  const lignes = useMemo(() => {
    const elements = new Map<number, ElementProjet[]>();
    for (const [id, c] of contenus) if (c.statut === 'ok') elements.set(id, c.elements);
    const message = (p: Projet, profondeur: number): LigneEcran | null => {
      const c = contenus.get(p.id);
      const texte =
        !c || c.statut === 'chargement'
          ? 'Chargement du contenu…'
          : c.statut === 'erreur'
            ? 'Impossible de charger le contenu du projet.'
            : c.elements.length === 0 && sousProjets(projets, p.id).length === 0
              ? 'Aucune activité ni jalon.'
              : null;
      return texte ? { type: 'message', cle: `m${p.id}`, texte, profondeur: profondeur + 1 } : null;
    };
    return aplatir(projets, ouverts, elements).flatMap<LigneEcran>((l) => {
      if (l.type !== 'projet' || !ouverts.has(l.projet.id)) return [l];
      const m = message(l.projet, l.profondeur);
      return m ? [l, m] : [l];
    });
  }, [projets, ouverts, contenus]);

  const colonnes: Colonne<LigneEcran>[] = [
    {
      titre: 'Code',
      cellule: (l) =>
        l.type === 'projet' ? l.projet.code : l.type === 'element' ? l.element.wbs : null,
    },
    {
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
          return (
            <span className="flex items-center gap-2" style={indentation(l.profondeur, true)}>
              <span>{l.element.nom}</span>
              {l.element.type === 'jalon' && <Badge statut="neutre">Jalon</Badge>}
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
            <Link to={`/projets/${p.id}`} className="text-accent underline hover:text-accent-hover">
              {p.nom}
            </Link>
          </span>
        );
      },
    },
    {
      titre: 'Chef de projet',
      cellule: (l) => (l.type === 'projet' ? nomDe(annuaire, l.projet.chef_id) : null),
    },
    {
      titre: 'Début',
      cellule: (l) =>
        l.type === 'projet'
          ? (l.projet.debut_planifie ?? '—')
          : l.type === 'element'
            ? (l.element.debut_planifie ?? l.element.date_planifiee ?? '—')
            : null,
    },
    ...(projets.some((p) => p.peut_ecrire)
      ? [
          {
            titre: 'Actions',
            cellule: (l: LigneEcran) =>
              l.type === 'projet' && l.projet.peut_ecrire ? (
                <span className="inline-flex gap-1">
                  <BoutonIcone
                    libelle={`Modifier ${l.projet.nom}`}
                    icone={Pencil}
                    onClick={() => setAModifier(l.projet)}
                  />
                  <BoutonIcone
                    libelle={`Copier ${l.projet.nom}`}
                    icone={Copy}
                    onClick={() => setACopier(l.projet)}
                  />
                </span>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <Layout
      titre="Projets"
      actions={
        <>
          {etat.statut === 'ok' && projets.length > 0 && (
            <Button variante="secondaire" onClick={basculerTout}>
              {toutOuvert ? 'Tout replier' : 'Tout déplier'}
            </Button>
          )}
          {peutCreer && (
            <Button onClick={() => setDialogue(true)}>
              <Plus aria-hidden className="size-4" />
              Nouveau projet
            </Button>
          )}
        </>
      }
    >
      {etat.statut === 'chargement' && <Chargement libelle="Chargement des projets…" />}
      {etat.statut === 'erreur' && <Notification type="erreur">{etat.message}</Notification>}
      {etat.statut === 'ok' && etat.donnees.length === 0 && (
        <Vide>Aucun projet pour le moment.</Vide>
      )}
      {etat.statut === 'ok' && etat.donnees.length > 0 && (
        <Table
          legende="Liste des projets"
          colonnes={colonnes}
          lignes={lignes}
          cle={(l) =>
            l.type === 'projet'
              ? `p${l.projet.id}`
              : l.type === 'element'
                ? `e${l.element.id}`
                : l.cle
          }
        />
      )}
      {aModifier && (
        <DialogueModifProjet
          projetId={aModifier.id}
          onFermer={() => setAModifier(null)}
          onSucces={() => {
            setAModifier(null);
            charger();
          }}
        />
      )}
      {aCopier && (
        <DialogueCopie
          source={aCopier}
          depuisModele={false}
          admin={admin}
          onFermer={() => setACopier(null)}
        />
      )}
      <Dialog
        ouvert={dialogue}
        onOuvertChange={setDialogue}
        titre="Nouveau projet"
        description="Renseignez le code, le nom, le chef de projet (vous par défaut) et la date « pas avant le »."
      >
        <FormulaireProjet
          annuaire={annuaire}
          projets={projets}
          onAnnuler={() => setDialogue(false)}
          onCree={() => {
            setDialogue(false);
            charger();
          }}
        />
      </Dialog>
    </Layout>
  );
}

export function ProjetDetail({ id }: { id: string }) {
  const [etat, charger] = useChargement<Projet>(
    `/api/projets/${id}`,
    'Impossible de charger le projet.',
  );
  const [dialogue, setDialogue] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const contours = useContours(Number(id));
  const pile = usePileAnnulation(Number(id));
  const projet = etat.statut === 'ok' ? etat.donnees : null;
  const chemin = usePath();
  const recherche = useSearch();
  const demande = recherche.get('onglet');
  const onglets = [
    'planning',
    'gantt',
    'affectations',
    ...(projet?.peut_ecrire ? ['historique'] : []),
  ];
  const onglet = demande && onglets.includes(demande) ? demande : 'planning';
  const changerOnglet = (valeur: string) => {
    const parametres = new URLSearchParams(window.location.search);
    if (valeur === 'planning') parametres.delete('onglet');
    else parametres.set('onglet', valeur);
    const texte = parametres.toString();
    navigate(texte ? `${chemin}?${texte}` : chemin);
  };

  return (
    <Layout
      titre={projet?.nom ?? 'Projet'}
      actions={
        projet?.peut_ecrire && (
          <>
            <Button variante="secondaire" onClick={() => setDialogue(true)}>
              <Pencil aria-hidden className="size-4" />
              Modifier le projet
            </Button>
            <Button variante="secondaire" onClick={() => setSuppression(true)}>
              <Trash2 aria-hidden className="size-4" />
              Supprimer le projet
            </Button>
          </>
        )
      }
    >
      {etat.statut === 'chargement' && <Chargement libelle="Chargement du projet…" />}
      {etat.statut === 'erreur' && <Notification type="erreur">{etat.message}</Notification>}
      {projet && (
        <>
          <Tabs.Root value={onglet} onValueChange={changerOnglet} className="flex flex-col gap-4">
            <Tabs.List
              aria-label="Sections du projet"
              className="flex gap-2 border-b border-gray-200"
            >
              <Tabs.Trigger value="planning" className={ONGLET}>
                Planning
              </Tabs.Trigger>
              <Tabs.Trigger value="gantt" className={ONGLET}>
                Gantt
              </Tabs.Trigger>
              <Tabs.Trigger value="affectations" className={ONGLET}>
                Affectations
              </Tabs.Trigger>
              {projet.peut_ecrire && (
                <Tabs.Trigger value="historique" className={ONGLET}>
                  Historique
                </Tabs.Trigger>
              )}
            </Tabs.List>
            <Tabs.Content value="planning">
              <PlanningProjet projetId={projet.id} peutEcrire={projet.peut_ecrire} pile={pile} />
            </Tabs.Content>
            <Tabs.Content value="gantt">
              <GanttProjet
                projetId={projet.id}
                nom={projet.nom}
                contours={contours}
                pile={pile}
                estModele={projet.est_modele}
              />
            </Tabs.Content>
            <Tabs.Content value="affectations">
              <AffectationsProjet projetId={projet.id} peutEcrire={projet.peut_ecrire} />
            </Tabs.Content>
            {projet.peut_ecrire && (
              <Tabs.Content value="historique">
                <HistoriqueProjet projetId={projet.id} />
              </Tabs.Content>
            )}
          </Tabs.Root>
          {dialogue && (
            <DialogueModifProjet
              projetId={projet.id}
              onFermer={() => setDialogue(false)}
              onSucces={() => {
                setDialogue(false);
                charger();
              }}
            />
          )}
          {suppression && (
            <Confirmation
              nom={projet.nom}
              action={() => api(`/api/projets/${projet.id}`, { method: 'DELETE' })}
              onSucces={() => navigate(projet.est_modele ? '/modeles' : '/projets')}
              onAnnuler={() => setSuppression(false)}
            />
          )}
        </>
      )}
    </Layout>
  );
}
