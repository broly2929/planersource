import {
  ArrowDown,
  CalendarDays,
  ArrowUp,
  CornerDownRight,
  FolderInput,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { api, ApiError } from '../../api';
import { useAnnuaire } from '../../annuaire';
import { BoutonIcone } from '../../components/BoutonIcone';
import { Button } from '../../components/Button';
import { Confirmation } from '../../components/Confirmation';
import { Dialog } from '../../components/Dialog';
import { Chargement, Vide } from '../../components/Etat';
import { Field } from '../../components/Field';
import { Notification } from '../../components/Notification';
import { Select } from '../../components/Select';
import { Table } from '../../components/Table';
import { navigate } from '../../router';
import { FormulaireDialogue, texteRefusCode, useListe, type Affectation } from './commun';
import { messagePosition, wbsDe } from './deplacement';
import { FormulaireDeplacement } from './FormulaireDeplacement';
import { inverseLigne } from '../../gantt/annulation';
import type { PileAnnulation } from './annulation';
import {
  ChampChargeVendue,
  FormulaireActivite,
  FormulaireJalon,
  FormulaireModifAssignation,
  FormulaireModifDependance,
  type ActiviteDetail,
  type JalonDetail,
  useChargeVendue,
} from './FormulairesEdition';

interface Ligne {
  id: number;
  type: 'activite' | 'jalon';
  parent_id: number | null;
  rang: number;
  wbs: string;
  nom: string;
}
interface Assignation {
  id: number;
  activite_id: number;
  ressource_id: number;
  taux: number;
  charge_assignee: number;
}
interface Dependance {
  id: number;
  predecesseur_id: number;
  successeur_id: number;
  type: string;
  delai: number;
}

type Dialogue =
  | { kind: 'activite' }
  | { kind: 'jalon' }
  | { kind: 'sous'; ligne: Ligne }
  | { kind: 'deplacer'; ligne: Ligne }
  | { kind: 'assigner'; ligne: Ligne }
  | { kind: 'dependance' }
  | { kind: 'activite-edition'; activite: ActiviteDetail }
  | { kind: 'jalon-edition'; jalon: JalonDetail }
  | { kind: 'assignation-edition'; assignation: Assignation; ligne: Ligne }
  | { kind: 'dependance-edition'; dependance: Dependance };

interface Suppression {
  nom: string;
  chemin: string;
}

export function FormulaireNom({
  libelle,
  chemin,
  corps,
  onSucces,
  onAnnuler,
  avecChargeVendue = false,
}: {
  libelle: string;
  chemin: string;
  corps: Record<string, unknown>;
  onSucces: () => void;
  onAnnuler: () => void;
  /** Champ « Charge vendue (j) » à la création d'une activité (D-149 (7)). */
  avecChargeVendue?: boolean;
}) {
  const [nom, setNom] = useState('');
  const vendue = useChargeVendue(null);
  return (
    <FormulaireDialogue
      libelle={libelle}
      envoyer={() =>
        api(chemin, {
          method: 'POST',
          body: {
            nom,
            ...corps,
            ...(avecChargeVendue && vendue.analyse.ok && vendue.analyse.valeur !== null
              ? { charge_vendue: vendue.analyse.valeur }
              : {}),
          },
        })
      }
      inactif={avecChargeVendue && !vendue.valide}
      cible="element"
      onSucces={onSucces}
      onAnnuler={onAnnuler}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      {avecChargeVendue && <ChampChargeVendue valeur={vendue.texte} onChange={vendue.setTexte} />}
    </FormulaireDialogue>
  );
}

function FormulaireAssignation({
  ligne,
  candidats,
  onSucces,
  onAnnuler,
}: {
  ligne: Ligne;
  candidats: { value: string; label: string }[];
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [ressource, setRessource] = useState('');
  const [charge, setCharge] = useState('');
  const [taux, setTaux] = useState('100');
  return (
    <FormulaireDialogue
      libelle="Assigner"
      envoyer={() =>
        api(`/api/activites/${ligne.id}/assignations`, {
          method: 'POST',
          body: {
            ressource_id: Number(ressource),
            charge_assignee: Number(charge),
            taux: Number(taux),
          },
        })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
    >
      <Select
        label="Ressource"
        required
        value={ressource}
        onChange={(e) => setRessource(e.target.value)}
        options={[{ value: '', label: 'Choisir une ressource' }, ...candidats]}
      />
      <Field
        label="Charge assignée (jours)"
        type="number"
        required
        min="0.01"
        step="0.01"
        value={charge}
        onChange={(e) => setCharge(e.target.value)}
      />
      <Field
        label="Taux (%)"
        type="number"
        required
        min="1"
        max="100"
        step="any"
        value={taux}
        onChange={(e) => setTaux(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

function FormulaireDependance({
  projetId,
  elements,
  onSucces,
  onAnnuler,
}: {
  projetId: number;
  elements: Ligne[];
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [pred, setPred] = useState('');
  const [succ, setSucc] = useState('');
  const [type, setType] = useState('FD');
  const [delai, setDelai] = useState('0');
  const options = [
    { value: '', label: 'Choisir un élément' },
    ...elements.map((e) => ({ value: String(e.id), label: e.nom })),
  ];
  return (
    <FormulaireDialogue
      libelle="Créer"
      envoyer={() =>
        api(`/api/projets/${projetId}/dependances`, {
          method: 'POST',
          body: {
            predecesseur_id: Number(pred),
            successeur_id: Number(succ),
            type,
            delai: Number(delai),
          },
        })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
    >
      <Select
        label="Prédécesseur"
        required
        value={pred}
        onChange={(e) => setPred(e.target.value)}
        options={options}
      />
      <Select
        label="Successeur"
        required
        value={succ}
        onChange={(e) => setSucc(e.target.value)}
        options={options}
      />
      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={['FD', 'DD', 'FF'].map((t) => ({ value: t, label: t }))}
      />
      <Field
        label="Délai (jours ouvrés)"
        type="number"
        step="1"
        required
        value={delai}
        onChange={(e) => setDelai(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

/** Onglet « Planning » : éléments en ordre WBS, assignations et dépendances. */
export function PlanningProjet({
  projetId,
  peutEcrire,
  pile,
}: {
  projetId: number;
  peutEcrire: boolean;
  /** Pile d'annulation du Gantt : « Déplacer » y empile son inverse (D-127 (3)). */
  pile: PileAnnulation;
}) {
  const titreDependances = useId();
  const annuaire = useAnnuaire();
  const base = `/api/projets/${projetId}`;
  const [planning, chargerPlanning, modifierPlanning] = useListe<Ligne[]>(`${base}/planning`);
  const [assignations, chargerAssignations] = useListe<Assignation[]>(`${base}/assignations`);
  const [dependances, chargerDependances] = useListe<Dependance[]>(`${base}/dependances`);
  const [affectations] = useListe<Affectation[]>(`${base}/affectations`);
  const [activites, chargerActivites] = useListe<ActiviteDetail[]>(`${base}/activites`);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [suppression, setSuppression] = useState<Suppression | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  // Après Monter ou Descendre (D-123 (2)) : ligne repérée 2 s, annonce, bouton à refocaliser.
  const [deplacee, setDeplacee] = useState<number | null>(null);
  const [annonce, setAnnonce] = useState('');
  const [focusBouton, setFocusBouton] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (minuterie.current && clearTimeout(minuterie.current)), []);
  useEffect(() => {
    if (focusBouton === null) return;
    document.querySelector<HTMLElement>(`[data-bouton="${focusBouton}"]`)?.focus();
    setFocusBouton(null);
  }, [focusBouton, planning]);

  const nomRessource = (id: number) => annuaire?.find((u) => u.id === id)?.nom ?? '…';
  const lignes = planning.statut === 'ok' ? planning.donnees : [];
  const nomElement = (id: number) => lignes.find((l) => l.id === id)?.nom ?? '…';
  // Activités MAN sans enfant : accès au planning manuel, pour tout lecteur.
  const estManuelFeuille = (l: Ligne) =>
    l.type === 'activite' &&
    !lignes.some((e) => e.parent_id === l.id) &&
    activites.statut === 'ok' &&
    activites.donnees.some((a) => a.id === l.id && a.mode === 'MAN');
  const listeAssignations = assignations.statut === 'ok' ? assignations.donnees : [];

  const fermer = () => setDialogue(null);
  const apres = () => {
    fermer();
    chargerPlanning();
    chargerActivites();
    chargerAssignations();
    chargerDependances();
  };

  const supprimerAvecConfirmation = (nom: string, chemin: string) =>
    setSuppression({ nom, chemin });

  // Valeurs d'édition lues au moment du clic (GET activités / jalons), jamais d'une copie périmée.
  const modifier = async (ligne: Ligne) => {
    setErreurAction(null);
    try {
      if (ligne.type === 'activite') {
        const liste = await api<ActiviteDetail[]>(`${base}/activites`);
        const activite = liste.find((a) => a.id === ligne.id);
        if (activite) setDialogue({ kind: 'activite-edition', activite });
      } else {
        const liste = await api<JalonDetail[]>(`${base}/jalons`);
        const jalon = liste.find((j) => j.id === ligne.id);
        if (jalon) setDialogue({ kind: 'jalon-edition', jalon });
      }
    } catch {
      setErreurAction('Impossible de charger l’élément à modifier.');
    }
  };

  // Rang ± 1 parmi les frères (D-040) ; `rang` est la position finale (D-041).
  const deplacer = async (ligne: Ligne, sens: -1 | 1) => {
    setErreurAction(null);
    const freres = lignes.filter((l) => l.parent_id === ligne.parent_id);
    const position = freres.findIndex((l) => l.id === ligne.id) + 1;
    try {
      await api(`/api/elements/${ligne.id}/deplacer`, {
        method: 'POST',
        body: { rang: position + sens },
      });
      const maj = await api<Ligne[]>(`${base}/planning`);
      modifierPlanning(() => maj);
      const nouveaux = maj.filter((l) => l.parent_id === ligne.parent_id);
      const rang = nouveaux.findIndex((l) => l.id === ligne.id);
      const bloque = sens === -1 ? rang === 0 : rang === nouveaux.length - 1;
      setFocusBouton(`${bloque === (sens === -1) ? 'descendre' : 'monter'}-${ligne.id}`);
      setDeplacee(ligne.id);
      setAnnonce(messagePosition(ligne.nom, wbsDe(maj, ligne.id) ?? ''));
      if (minuterie.current) clearTimeout(minuterie.current);
      minuterie.current = setTimeout(() => setDeplacee(null), 2000);
    } catch (err) {
      setErreurAction(
        (err instanceof ApiError && err.status === 422 && texteRefusCode(err, 'element')) ||
          'Déplacement impossible pour le moment. Réessayez.',
      );
    }
  };

  const candidats = (ligne: Ligne) => {
    const deja = listeAssignations
      .filter((a) => a.activite_id === ligne.id)
      .map((a) => a.ressource_id);
    return (affectations.statut === 'ok' ? affectations.donnees : [])
      .filter((a) => !deja.includes(a.ressource_id))
      .map((a) => ({ value: String(a.ressource_id), label: nomRessource(a.ressource_id) }));
  };

  const colonnes = [
    { titre: 'Numéro WBS', cellule: (l: Ligne) => l.wbs },
    {
      titre: 'Nom',
      cellule: (l: Ligne) =>
        peutEcrire ? (
          <button
            type="button"
            className="cursor-pointer text-left text-accent underline focus-visible:rounded-ui"
            onClick={() => void modifier(l)}
          >
            {l.nom}
          </button>
        ) : (
          l.nom
        ),
    },
    { titre: 'Type', cellule: (l: Ligne) => (l.type === 'activite' ? 'Activité' : 'Jalon') },
    {
      titre: 'Ressources',
      cellule: (l: Ligne) => (
        <div className="flex flex-col gap-1">
          <ul className="flex flex-col gap-1 empty:hidden">
            {listeAssignations
              .filter((a) => a.activite_id === l.id)
              .map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="whitespace-nowrap">{nomRessource(a.ressource_id)}</span>
                  {peutEcrire && (
                    <span className="flex gap-1">
                      <BoutonIcone
                        libelle={`Modifier l'assignation de ${nomRessource(a.ressource_id)} à ${l.nom}`}
                        icone={Pencil}
                        onClick={() =>
                          setDialogue({ kind: 'assignation-edition', assignation: a, ligne: l })
                        }
                      />
                      <BoutonIcone
                        libelle={`Retirer ${nomRessource(a.ressource_id)} de ${l.nom}`}
                        icone={UserMinus}
                        onClick={() =>
                          supprimerAvecConfirmation(
                            `l’assignation de ${nomRessource(a.ressource_id)} à ${l.nom}`,
                            `/api/assignations/${a.id}`,
                          )
                        }
                      />
                    </span>
                  )}
                </li>
              ))}
          </ul>
          {peutEcrire && l.type === 'activite' && !lignes.some((e) => e.parent_id === l.id) && (
            <div>
              <BoutonIcone
                libelle={`Assigner une ressource à ${l.nom}`}
                icone={UserPlus}
                onClick={() => setDialogue({ kind: 'assigner', ligne: l })}
              />
            </div>
          )}
        </div>
      ),
    },
    ...(peutEcrire || lignes.some(estManuelFeuille)
      ? [
          {
            titre: 'Actions',
            cellule: (l: Ligne) => {
              const freres = lignes.filter((e) => e.parent_id === l.parent_id);
              const position = freres.findIndex((e) => e.id === l.id);
              return (
                <div className="flex gap-1">
                  {peutEcrire && (
                    <BoutonIcone
                      libelle={`Modifier ${l.nom}`}
                      icone={Pencil}
                      onClick={() => void modifier(l)}
                    />
                  )}
                  {estManuelFeuille(l) && (
                    <BoutonIcone
                      libelle="Planning manuel"
                      icone={CalendarDays}
                      onClick={() => navigate(`/projets/${projetId}/planning-manuel/${l.id}`)}
                    />
                  )}
                  {peutEcrire && (
                    <>
                      <BoutonIcone
                        libelle={`Monter ${l.nom}`}
                        icone={ArrowUp}
                        data-bouton={`monter-${l.id}`}
                        disabled={position === 0}
                        onClick={() => void deplacer(l, -1)}
                      />
                      <BoutonIcone
                        libelle={`Descendre ${l.nom}`}
                        icone={ArrowDown}
                        data-bouton={`descendre-${l.id}`}
                        disabled={position === freres.length - 1}
                        onClick={() => void deplacer(l, 1)}
                      />
                      <BoutonIcone
                        libelle={`Déplacer ${l.nom}`}
                        icone={FolderInput}
                        onClick={() => setDialogue({ kind: 'deplacer', ligne: l })}
                      />
                      {l.type === 'activite' && (
                        <BoutonIcone
                          libelle={`Ajouter une sous-activité à ${l.nom}`}
                          icone={CornerDownRight}
                          onClick={() => setDialogue({ kind: 'sous', ligne: l })}
                        />
                      )}
                      <BoutonIcone
                        libelle={`Supprimer ${l.nom}`}
                        icone={Trash2}
                        onClick={() =>
                          supprimerAvecConfirmation(
                            l.nom,
                            `/api/${l.type === 'activite' ? 'activites' : 'jalons'}/${l.id}`,
                          )
                        }
                      />
                    </>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const enCours = planning.statut === 'chargement';
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {peutEcrire && (
          <div className="flex gap-2">
            <Button onClick={() => setDialogue({ kind: 'activite' })}>
              <Plus aria-hidden className="size-4" />
              Nouvelle activité
            </Button>
            <Button variante="secondaire" onClick={() => setDialogue({ kind: 'jalon' })}>
              <Plus aria-hidden className="size-4" />
              Nouveau jalon
            </Button>
          </div>
        )}
        {enCours && <Chargement libelle="Chargement du planning…" />}
        {planning.statut === 'erreur' && (
          <Notification type="erreur">Impossible de charger le planning.</Notification>
        )}
        {erreurAction && <Notification type="erreur">{erreurAction}</Notification>}
        {assignations.statut === 'erreur' && (
          <Notification type="erreur">Impossible de charger les assignations.</Notification>
        )}
        {planning.statut === 'ok' && lignes.length === 0 && (
          <Vide>Ce projet ne contient encore aucun élément.</Vide>
        )}
        {lignes.length > 0 && (
          <Table
            legende="Planning du projet"
            colonnes={colonnes}
            lignes={lignes}
            cle={(l) => l.id}
            attributsLigne={(l) => ({ 'data-deplacee': l.id === deplacee ? '' : undefined })}
          />
        )}
        <p role="status" className="sr-only">
          {annonce}
        </p>
      </div>

      <section aria-labelledby={titreDependances} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titreDependances} className="text-titre font-semibold">
            Dépendances
          </h2>
          {peutEcrire && (
            <Button variante="secondaire" onClick={() => setDialogue({ kind: 'dependance' })}>
              <Plus aria-hidden className="size-4" />
              Nouvelle dépendance
            </Button>
          )}
        </div>
        {dependances.statut === 'chargement' && (
          <Chargement libelle="Chargement des dépendances…" />
        )}
        {dependances.statut === 'erreur' && (
          <Notification type="erreur">Impossible de charger les dépendances.</Notification>
        )}
        {dependances.statut === 'ok' && dependances.donnees.length === 0 && (
          <Vide>Aucune dépendance définie.</Vide>
        )}
        {dependances.statut === 'ok' && dependances.donnees.length > 0 && (
          <Table
            legende="Dépendances du projet"
            colonnes={[
              { titre: 'Prédécesseur', cellule: (d) => nomElement(d.predecesseur_id) },
              { titre: 'Successeur', cellule: (d) => nomElement(d.successeur_id) },
              { titre: 'Type', cellule: (d) => d.type },
              { titre: 'Délai', cellule: (d) => d.delai },
              ...(peutEcrire
                ? [
                    {
                      titre: 'Actions',
                      cellule: (d: Dependance) => {
                        const nom = `la dépendance ${nomElement(d.predecesseur_id)} → ${nomElement(d.successeur_id)}`;
                        return (
                          <div className="flex gap-1">
                            <BoutonIcone
                              libelle={`Modifier ${nom}`}
                              icone={Pencil}
                              onClick={() =>
                                setDialogue({ kind: 'dependance-edition', dependance: d })
                              }
                            />
                            <BoutonIcone
                              libelle={`Supprimer ${nom}`}
                              icone={Trash2}
                              onClick={() =>
                                supprimerAvecConfirmation(nom, `/api/dependances/${d.id}`)
                              }
                            />
                          </div>
                        );
                      },
                    },
                  ]
                : []),
            ]}
            lignes={dependances.donnees}
            cle={(d) => d.id}
          />
        )}
      </section>

      <Dialog
        ouvert={dialogue?.kind === 'activite'}
        onOuvertChange={(o) => !o && fermer()}
        titre="Nouvelle activité"
        description="Saisissez le nom de l’activité."
      >
        <FormulaireNom
          libelle="Créer"
          chemin={`${base}/activites`}
          corps={{}}
          avecChargeVendue
          onSucces={apres}
          onAnnuler={fermer}
        />
      </Dialog>
      <Dialog
        ouvert={dialogue?.kind === 'jalon'}
        onOuvertChange={(o) => !o && fermer()}
        titre="Nouveau jalon"
        description="Saisissez le nom du jalon."
      >
        <FormulaireNom
          libelle="Créer"
          chemin={`${base}/jalons`}
          corps={{}}
          onSucces={apres}
          onAnnuler={fermer}
        />
      </Dialog>
      {dialogue?.kind === 'deplacer' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre={`Déplacer ${dialogue.ligne.nom}`}
          description={`Choisissez l’activité parente de ${dialogue.ligne.nom}.`}
        >
          <FormulaireDeplacement
            ligne={dialogue.ligne}
            lignes={lignes}
            onSucces={() => {
              pile.empiler(inverseLigne(dialogue.ligne));
              fermer();
              chargerPlanning();
            }}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {dialogue?.kind === 'sous' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Nouvelle sous-activité"
          description={`Saisissez le nom de la sous-activité de ${dialogue.ligne.nom}.`}
        >
          <FormulaireNom
            libelle="Créer"
            chemin={`${base}/activites`}
            corps={{ parent_id: dialogue.ligne.id }}
            avecChargeVendue
            onSucces={apres}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {dialogue?.kind === 'assigner' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Assigner une ressource"
          description={`Assignez une ressource affectée au projet à ${dialogue.ligne.nom}.`}
        >
          <FormulaireAssignation
            ligne={dialogue.ligne}
            candidats={candidats(dialogue.ligne)}
            onSucces={apres}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {dialogue?.kind === 'dependance' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Nouvelle dépendance"
          description="Choisissez le prédécesseur, le successeur, le type et le délai."
        >
          <FormulaireDependance
            projetId={projetId}
            elements={lignes}
            onSucces={apres}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {dialogue?.kind === 'activite-edition' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Modifier l’activité"
          description={`Modifiez ${dialogue.activite.nom}.`}
        >
          <FormulaireActivite activite={dialogue.activite} onSucces={apres} onAnnuler={fermer} />
        </Dialog>
      )}
      {dialogue?.kind === 'jalon-edition' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Modifier le jalon"
          description={`Modifiez ${dialogue.jalon.nom}.`}
        >
          <FormulaireJalon jalon={dialogue.jalon} onSucces={apres} onAnnuler={fermer} />
        </Dialog>
      )}
      {dialogue?.kind === 'assignation-edition' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Modifier l’assignation"
          description={`Modifiez la charge et le taux de ${nomRessource(dialogue.assignation.ressource_id)} sur ${dialogue.ligne.nom}.`}
        >
          <FormulaireModifAssignation
            id={dialogue.assignation.id}
            charge={dialogue.assignation.charge_assignee}
            taux={dialogue.assignation.taux}
            onSucces={apres}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {dialogue?.kind === 'dependance-edition' && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && fermer()}
          titre="Modifier la dépendance"
          description="Modifiez le type et le délai."
        >
          <FormulaireModifDependance
            id={dialogue.dependance.id}
            type={dialogue.dependance.type}
            delai={dialogue.dependance.delai}
            onSucces={apres}
            onAnnuler={fermer}
          />
        </Dialog>
      )}
      {suppression && (
        <Confirmation
          nom={suppression.nom}
          action={() => api(suppression.chemin, { method: 'DELETE' })}
          onSucces={() => {
            setSuppression(null);
            apres();
          }}
          onAnnuler={() => setSuppression(null)}
        />
      )}
    </div>
  );
}
