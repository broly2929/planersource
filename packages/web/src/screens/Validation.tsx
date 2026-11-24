import { Check, Download, Eye, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Badge } from '../components/Badge';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog, useEnvoiEnCours, useFermeture } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { NavigationSemaine } from '../components/NavigationSemaine';
import { Notification } from '../components/Notification';
import { Table } from '../components/Table';
import { DialogueExport } from '../export/DialogueExport';
import { periodeSemaine } from '../export/logique';
import { TableauFeuille } from '../imputations/TableauFeuille';
import {
  aujourdhuiLocal,
  joursSemaine,
  libelleSemaine,
  libelleStatut,
  saisieInitiale,
  semaineAffichee,
  VARIANTE_STATUT,
  type JourFeuille,
  type LigneFeuille,
  type Statut,
} from '../imputations/logique';
import { navigate, Redirect, useSearch } from '../router';
import {
  analyserCommentaire,
  AUCUNE_IMPUTATION,
  badgesProjets,
  cibleFocus,
  codesDevalidables,
  codesValidables,
  COMMENTAIRE_MAX,
  messageRefusValidation,
  peutDevalider,
  peutRejeter,
  peutValider,
  relireListe,
  type ActionOrigine,
  type FeuilleValidation,
} from '../validation/logique';

const adresse = (semaine: string) => `/validation?semaine=${semaine}`;

const messageDe = (err: unknown): string =>
  err instanceof ApiError
    ? messageRefusValidation(err.status, err.code)
    : messageRefusValidation(0);

export function Validation() {
  const { etat } = useAuth();
  const role = etat.statut === 'connecte' ? etat.user.role : null;
  const autorise = role === 'administrateur' || role === 'chef_de_projet';
  const param = useSearch().get('semaine');
  const aujourdhui = aujourdhuiLocal();
  const { semaine, corrigee } = semaineAffichee(param, aujourdhui);

  return (
    <Layout titre="Validation des feuilles de temps">
      <Redirect to={adresse(semaine)} when={corrigee} />
      {!autorise ? (
        <Vide>Accès réservé aux chefs de projet et aux administrateurs.</Vide>
      ) : corrigee ? null : (
        <Liste semaine={semaine} aujourdhui={aujourdhui} />
      )}
    </Layout>
  );
}

function Liste({ semaine, aujourdhui }: { semaine: string; aujourdhui: string }) {
  const [feuilles, setFeuilles] = useState<FeuilleValidation[] | null>(null);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [retour, setRetour] = useState<string | null>(null);
  const [voir, setVoir] = useState<FeuilleValidation | null>(null);
  const [valider, setValider] = useState<FeuilleValidation | null>(null);
  const [rejeter, setRejeter] = useState<FeuilleValidation | null>(null);
  const [devalider, setDevalider] = useState<FeuilleValidation | null>(null);
  const [exporter, setExporter] = useState(false);
  // Refus 422 ou 404 (D-145 (2)) : message au-dessus du tableau, dialogue fermé.
  const [alerteRefus, setAlerteRefus] = useState<string | null>(null);
  const tableau = useRef<HTMLTableElement | null>(null);
  // Dernière action d'écriture, et focus à rendre une fois la liste relue (D-145 (2)).
  const derniere = useRef<{ feuilleId: number; action: ActionOrigine } | null>(null);
  const [aFocaliser, setAFocaliser] = useState<{ feuilleId: number; action: ActionOrigine } | null>(
    null,
  );

  // Radix ne rend pas le focus sans `Dialog.Trigger` : le bouton d'origine est mémorisé et refocalisé à la fermeture.
  const origine = useRef<HTMLElement | null>(null);
  const ouvrir = (ouvrirDialogue: () => void) => (e: MouseEvent<HTMLElement>) => {
    origine.current = e.currentTarget;
    setAlerteRefus(null);
    ouvrirDialogue();
  };
  const fermer = (fermerDialogue: () => void) => () => {
    fermerDialogue();
    setTimeout(() => origine.current?.focus(), 0);
  };

  /** Relit la liste ; `rendreFocus` : une fois relue, le focus est rendu selon `cibleFocus`. */
  const recharger = useCallback(
    async (rendreFocus?: { feuilleId: number; action: ActionOrigine } | null) => {
      try {
        const r = await api<{ feuilles: FeuilleValidation[] }>(
          `/api/validations?semaine=${semaine}`,
        );
        setFeuilles(r.feuilles);
        if (rendreFocus) setAFocaliser(rendreFocus);
        setErreurChargement(false);
      } catch {
        setErreurChargement(true);
      }
    },
    [semaine],
  );

  useEffect(() => {
    setFeuilles(null);
    setErreurChargement(false);
    setRetour(null);
    setAlerteRefus(null);
    void recharger();
  }, [recharger]);

  useEffect(() => {
    if (!aFocaliser || !feuilles) return;
    const cible = cibleFocus(aFocaliser, feuilles);
    const f = feuilles.find((x) => x.feuille_id === aFocaliser.feuilleId);
    if (cible.genre === 'tableau' || !f) {
      tableau.current?.focus();
    } else {
      const verbe =
        cible.genre === 'voir'
          ? 'Voir'
          : cible.action === 'valider'
            ? 'Valider'
            : cible.action === 'rejeter'
              ? 'Rejeter'
              : 'Dévalider';
      const nom = `${verbe} la feuille de ${f.ressource_nom}`;
      [...(tableau.current?.querySelectorAll('button') ?? [])]
        .find((b) => b.getAttribute('aria-label') === nom)
        ?.focus();
    }
    setAFocaliser(null);
  }, [aFocaliser, feuilles]);

  /** Appel d'écriture : relit la liste si le refus prouve qu'elle est périmée (D-135 (8)). */
  const ecrire = (f: FeuilleValidation, verbe: ActionOrigine, corps?: object) => async () => {
    const action = { feuilleId: f.feuille_id, action: verbe };
    derniere.current = action;
    try {
      await api(`/api/feuilles/${f.feuille_id}/${verbe}`, { method: 'POST', body: corps ?? {} });
    } catch (err) {
      if (err instanceof ApiError && relireListe(err.status, err.code)) {
        // Liste périmée : dialogue fermé, message au-dessus du tableau (D-145 (2)).
        setValider(null);
        setRejeter(null);
        setDevalider(null);
        setRetour(null);
        setAlerteRefus(messageDe(err));
        void recharger(action);
      }
      throw err;
    }
  };

  const succes = (texte: string) => {
    setValider(null);
    setRejeter(null);
    setDevalider(null);
    setRetour(texte);
    void recharger(derniere.current);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        <NavigationSemaine
          semaine={semaine}
          aujourdhui={aujourdhui}
          onChanger={(cible) => navigate(adresse(cible))}
        />
        <Button variante="secondaire" className="ml-2" onClick={ouvrir(() => setExporter(true))}>
          <Download aria-hidden className="size-4" />
          Exporter CSV
        </Button>
      </div>

      {retour && <Notification type="succes">{retour}</Notification>}
      {alerteRefus && <Notification type="erreur">{alerteRefus}</Notification>}

      {erreurChargement ? (
        <Notification type="erreur">Impossible de charger les feuilles de temps.</Notification>
      ) : feuilles === null ? (
        <Chargement />
      ) : feuilles.length === 0 ? (
        <Vide>Aucune feuille de temps pour cette semaine.</Vide>
      ) : (
        <Table
          legende="Feuilles de temps à valider"
          lignes={feuilles}
          cle={(f) => f.feuille_id}
          tableRef={tableau}
          colonnes={[
            { titre: 'Ressource', cellule: (f) => f.ressource_nom },
            {
              titre: 'Statut',
              cellule: (f) => (
                <Badge statut={VARIANTE_STATUT[f.statut]}>{libelleStatut(f.statut)}</Badge>
              ),
            },
            {
              titre: 'Projets',
              cellule: (f) =>
                f.projets.length === 0 ? (
                  <span className="text-gray-600">{AUCUNE_IMPUTATION}</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {badgesProjets(f).map((b) => (
                      <Badge key={b.texte} statut={b.statut}>
                        {b.texte}
                      </Badge>
                    ))}
                  </span>
                ),
            },
            {
              titre: 'Actions',
              cellule: (f) => (
                <span className="flex gap-1">
                  <BoutonIcone
                    libelle={`Voir la feuille de ${f.ressource_nom}`}
                    icone={Eye}
                    onClick={ouvrir(() => setVoir(f))}
                  />
                  {peutValider(f) && (
                    <BoutonIcone
                      libelle={`Valider la feuille de ${f.ressource_nom}`}
                      icone={Check}
                      onClick={ouvrir(() => setValider(f))}
                    />
                  )}
                  {peutRejeter(f) && (
                    <BoutonIcone
                      libelle={`Rejeter la feuille de ${f.ressource_nom}`}
                      icone={X}
                      onClick={ouvrir(() => setRejeter(f))}
                    />
                  )}
                  {peutDevalider(f) && (
                    <BoutonIcone
                      libelle={`Dévalider la feuille de ${f.ressource_nom}`}
                      icone={Undo2}
                      onClick={ouvrir(() => setDevalider(f))}
                    />
                  )}
                </span>
              ),
            },
          ]}
        />
      )}

      {exporter && (
        <DialogueExport {...periodeSemaine(semaine)} onFermer={fermer(() => setExporter(false))} />
      )}
      {voir && (
        <DialogueVoir
          feuille={voir}
          semaine={semaine}
          aujourdhui={aujourdhui}
          onFermer={fermer(() => setVoir(null))}
        />
      )}
      {valider && (
        <Confirmation
          titre={`Valider la feuille de ${valider.ressource_nom} pour ${codesValidables(valider).join(', ')} ?`}
          description="Les projets indiqués seront validés."
          libelleConfirmer="Valider"
          variante="primaire"
          action={ecrire(valider, 'valider')}
          messageErreur={messageDe}
          onSucces={() => succes('Feuille validée.')}
          onAnnuler={fermer(() => setValider(null))}
        />
      )}
      {devalider && (
        <Confirmation
          titre={`Dévalider la feuille de ${devalider.ressource_nom} pour ${codesDevalidables(devalider).join(', ')} ?`}
          description="La feuille repassera au statut Soumise."
          libelleConfirmer="Dévalider"
          variante="primaire"
          action={ecrire(devalider, 'devalider')}
          messageErreur={messageDe}
          onSucces={() => succes('Feuille dévalidée.')}
          onAnnuler={fermer(() => setDevalider(null))}
        />
      )}
      {rejeter && (
        <DialogueRejet
          feuille={rejeter}
          envoyer={(commentaire) => ecrire(rejeter, 'rejeter', { commentaire })()}
          onSucces={() => succes('Feuille rejetée.')}
          onAnnuler={fermer(() => setRejeter(null))}
        />
      )}
    </div>
  );
}

interface VueFeuille {
  feuille: { id: number | null; statut: Statut; commentaire: string | null };
  lignes: LigneFeuille[];
  jours: JourFeuille[];
}

/** Feuille d'une ressource en lecture seule (D-135 (4)) : le tableau de la Feuille de temps, cases désactivées. */
function DialogueVoir({
  feuille,
  semaine,
  aujourdhui,
  onFermer,
}: {
  feuille: FeuilleValidation;
  semaine: string;
  aujourdhui: string;
  onFermer: () => void;
}) {
  const [vue, setVue] = useState<VueFeuille | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    api<VueFeuille>(`/api/feuilles?semaine=${semaine}&ressource_id=${feuille.ressource_id}`)
      .then((v) => !annule && setVue(v))
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
    };
  }, [semaine, feuille.ressource_id]);

  const saisie = useMemo(
    () => (vue ? saisieInitiale(vue.lignes, joursSemaine(semaine)) : {}),
    [vue, semaine],
  );
  const libelle = libelleSemaine(semaine);

  return (
    <Dialog
      sansGarde
      large
      ouvert
      onOuvertChange={(o) => !o && onFermer()}
      titre={`Feuille de ${feuille.ressource_nom}, ${libelle.charAt(0).toLowerCase()}${libelle.slice(1)}`}
      description="Lecture seule."
    >
      {erreur ? (
        <Notification type="erreur">Impossible de charger la feuille de temps.</Notification>
      ) : !vue ? (
        <Chargement />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex">
            <Badge statut={VARIANTE_STATUT[vue.feuille.statut]}>
              {libelleStatut(vue.feuille.statut)}
            </Badge>
          </div>
          {vue.feuille.statut === 'rejetee' && vue.feuille.commentaire && (
            <Notification type="erreur">Feuille rejetée : {vue.feuille.commentaire}</Notification>
          )}
          {vue.lignes.length === 0 ? (
            <Vide>Aucune activité à imputer cette semaine.</Vide>
          ) : (
            <TableauFeuille
              lignes={vue.lignes}
              jours={vue.jours}
              saisie={saisie}
              erreurs={[]}
              lectureSeule
              aujourdhui={aujourdhui}
              modifier={() => undefined}
            />
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Boutons du dialogue : composant enfant de `Dialog`, pour passer par sa garde (D-188 (6)). */
function ActionsRejet({
  onAnnuler,
  onRejeter,
  rejeter,
  enCours,
}: {
  onAnnuler: () => void;
  onRejeter: () => void;
  rejeter: boolean;
  enCours: boolean;
}) {
  useEnvoiEnCours(enCours);
  const fermer = useFermeture(onAnnuler);
  return (
    <div className="flex justify-end gap-2">
      <Button variante="secondaire" onClick={fermer}>
        Annuler
      </Button>
      <Button variante="danger" onClick={onRejeter} disabled={!rejeter} enCours={enCours}>
        Rejeter
      </Button>
    </div>
  );
}

function DialogueRejet({
  feuille,
  envoyer,
  onSucces,
  onAnnuler,
}: {
  feuille: FeuilleValidation;
  envoyer: (commentaire: string) => Promise<void>;
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const analyse = analyserCommentaire(texte);

  const rejeter = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      await envoyer(analyse.valeur);
      onSucces();
    } catch (err) {
      setErreur(messageDe(err));
      setEnCours(false);
    }
  };

  return (
    <Dialog
      ouvert
      onOuvertChange={(o) => !o && onAnnuler()}
      titre={`Rejeter la feuille de ${feuille.ressource_nom}`}
      description="Le commentaire sera visible de la ressource."
    >
      <div className="flex flex-col gap-4">
        {erreur && <Notification type="erreur">{erreur}</Notification>}
        <div className="flex flex-col gap-1">
          <label htmlFor="commentaire-rejet" className="font-semibold text-gray-800">
            Commentaire
          </label>
          <textarea
            id="commentaire-rejet"
            rows={4}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            className="rounded-ui border border-gray-400 bg-white px-2 py-1 text-gray-900"
          />
          <p className="text-right text-petit text-gray-600">
            {analyse.longueur} / {COMMENTAIRE_MAX}
          </p>
        </div>
        <ActionsRejet
          onAnnuler={onAnnuler}
          onRejeter={rejeter}
          rejeter={analyse.ok}
          enCours={enCours}
        />
      </div>
    </Dialog>
  );
}
