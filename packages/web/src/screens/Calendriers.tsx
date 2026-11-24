import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Case } from '../components/Case';
import { Confirmation } from '../components/Confirmation';
import { Dialog, useEnvoiEnCours, useFermeture } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import { Link, navigate } from '../router';

export interface Calendrier {
  id: number;
  nom: string;
  jours_travailles: number[];
  est_defaut: boolean;
  feries: { jour: string; libelle: string }[];
}

/** Numéros ISO 1..7. */
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const OUVRES_PAR_DEFAUT = [1, 2, 3, 4, 5];

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
          message:
            err instanceof ApiError && err.status === 404 ? 'Calendrier introuvable.' : message,
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

/** Création (sans `calendrier`) ou modification d'un calendrier. */
function FormulaireCalendrier({
  calendrier,
  onCree,
  onAnnuler,
}: {
  calendrier?: Calendrier;
  onCree: () => void;
  onAnnuler: () => void;
}) {
  const [nom, setNom] = useState(calendrier?.nom ?? '');
  const [jours, setJours] = useState<number[]>(calendrier?.jours_travailles ?? OUVRES_PAR_DEFAUT);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const basculer = (numero: number, coche: boolean) =>
    setJours((j) => (coche ? [...j, numero] : j.filter((n) => n !== numero)));

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    if (jours.length === 0) {
      setErreur('Cochez au moins un jour travaillé.');
      return;
    }
    setEnCours(true);
    try {
      await api(calendrier ? `/api/calendriers/${calendrier.id}` : '/api/calendriers', {
        method: calendrier ? 'PATCH' : 'POST',
        body: { nom, jours_travailles: [...jours].sort((a, b) => a - b) },
      });
      onCree();
    } catch (err) {
      setErreur(
        err instanceof ApiError && err.status === 400
          ? 'Données invalides : vérifiez le nom et les jours travaillés.'
          : calendrier
            ? 'Enregistrement impossible pour le moment. Réessayez.'
            : 'Création impossible pour le moment. Réessayez.',
      );
      setEnCours(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      {erreur && <Notification type="erreur">{erreur}</Notification>}
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold text-gray-800">Jours travaillés</legend>
        {JOURS.map((libelle, i) => (
          <Case
            key={libelle}
            label={libelle}
            checked={jours.includes(i + 1)}
            onChange={(e) => basculer(i + 1, e.target.checked)}
          />
        ))}
      </fieldset>
      <Actions
        onAnnuler={onAnnuler}
        enCours={enCours}
        libelle={calendrier ? 'Enregistrer' : 'Créer'}
      />
    </form>
  );
}

const COLONNES: Colonne<Calendrier>[] = [
  {
    titre: 'Nom',
    cellule: (c) => (
      <Link to={`/calendriers/${c.id}`} className="text-accent underline hover:text-accent-hover">
        {c.nom}
      </Link>
    ),
  },
  {
    titre: 'Jours travaillés',
    cellule: (c) => c.jours_travailles.map((n) => JOURS[n - 1]?.slice(0, 3)).join(', '),
  },
  { titre: 'Jours fériés', cellule: (c) => c.feries.length },
];

/** Onglet « Calendriers » de l'écran Utilisateurs (REX-5, D-165). */
export function OngletCalendriers() {
  const [etat, charger] = useChargement<Calendrier[]>(
    '/api/calendriers',
    'Impossible de charger les calendriers.',
  );
  const [dialogue, setDialogue] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogue(true)}>
          <Plus aria-hidden className="size-4" />
          Nouveau calendrier
        </Button>
      </div>
      {etat.statut === 'chargement' && <Chargement libelle="Chargement des calendriers…" />}
      {etat.statut === 'erreur' && <Notification type="erreur">{etat.message}</Notification>}
      {etat.statut === 'ok' && etat.donnees.length === 0 && (
        <Vide>Aucun calendrier pour le moment.</Vide>
      )}
      {etat.statut === 'ok' && etat.donnees.length > 0 && (
        <Table
          legende="Liste des calendriers"
          colonnes={COLONNES}
          lignes={etat.donnees}
          cle={(c) => c.id}
        />
      )}
      <Dialog
        ouvert={dialogue}
        onOuvertChange={setDialogue}
        titre="Nouveau calendrier"
        description="Nommez le calendrier et choisissez les jours travaillés."
      >
        <FormulaireCalendrier
          onAnnuler={() => setDialogue(false)}
          onCree={() => {
            setDialogue(false);
            charger();
          }}
        />
      </Dialog>
    </div>
  );
}

function FormulaireFerie({
  id,
  onAjoute,
  onAnnuler,
}: {
  id: number;
  onAjoute: () => void;
  onAnnuler: () => void;
}) {
  const [jour, setJour] = useState('');
  const [libelle, setLibelle] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (event: FormEvent) => {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await api(`/api/calendriers/${id}/feries`, { method: 'POST', body: { jour, libelle } });
      onAjoute();
    } catch (err) {
      setErreur(
        err instanceof ApiError && err.status === 409
          ? 'Ce jour férié existe déjà.'
          : err instanceof ApiError && err.status === 400
            ? 'Données invalides : vérifiez la date.'
            : 'Ajout impossible pour le moment. Réessayez.',
      );
      setEnCours(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      {erreur && <Notification type="erreur">{erreur}</Notification>}
      <Field
        label="Date"
        type="date"
        required
        value={jour}
        onChange={(e) => setJour(e.target.value)}
      />
      <Field label="Libellé" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
      <Actions onAnnuler={onAnnuler} enCours={enCours} libelle="Ajouter" />
    </form>
  );
}

export function CalendrierDetail({ id }: { id: string }) {
  const [etat, charger] = useChargement<Calendrier>(
    `/api/calendriers/${id}`,
    'Impossible de charger le calendrier.',
  );
  const [dialogue, setDialogue] = useState(false);
  const [edition, setEdition] = useState(false);
  const [suppression, setSuppression] = useState<{
    nom: string;
    chemin: string;
    retour: boolean;
  } | null>(null);
  const calendrier = etat.statut === 'ok' ? etat.donnees : null;

  const colonnesFeries: Colonne<Calendrier['feries'][number]>[] = [
    { titre: 'Date', cellule: (f) => f.jour },
    { titre: 'Libellé', cellule: (f) => f.libelle },
    ...(calendrier
      ? [
          {
            titre: 'Actions',
            cellule: (f: Calendrier['feries'][number]) => (
              <BoutonIcone
                libelle={`Supprimer le jour férié ${f.jour}`}
                icone={Trash2}
                onClick={() =>
                  setSuppression({
                    nom: `le jour férié ${f.jour}`,
                    chemin: `/api/calendriers/${calendrier.id}/feries/${f.jour}`,
                    retour: false,
                  })
                }
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Layout
      titre={calendrier?.nom ?? 'Calendrier'}
      actions={
        calendrier && (
          <>
            <Button variante="secondaire" onClick={() => setEdition(true)}>
              <Pencil aria-hidden className="size-4" />
              Modifier le calendrier
            </Button>
            <Button
              variante="secondaire"
              onClick={() =>
                setSuppression({
                  nom: calendrier.nom,
                  chemin: `/api/calendriers/${calendrier.id}`,
                  retour: true,
                })
              }
            >
              <Trash2 aria-hidden className="size-4" />
              Supprimer le calendrier
            </Button>
          </>
        )
      }
    >
      <Link
        to="/utilisateurs?onglet=calendriers"
        className="mb-4 inline-block text-accent underline hover:text-accent-hover"
      >
        Retour aux calendriers
      </Link>
      {etat.statut === 'chargement' && <Chargement libelle="Chargement du calendrier…" />}
      {etat.statut === 'erreur' && <Notification type="erreur">{etat.message}</Notification>}
      {calendrier && (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="jours-travailles" className="flex flex-col gap-2">
            <h2 id="jours-travailles" className="font-semibold">
              Jours travaillés
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {JOURS.map((libelle, i) => (
                <Case
                  key={libelle}
                  label={libelle}
                  checked={calendrier.jours_travailles.includes(i + 1)}
                  disabled
                  readOnly
                />
              ))}
            </div>
          </section>
          <section aria-labelledby="feries" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h2 id="feries" className="font-semibold">
                Jours fériés
              </h2>
              <Button onClick={() => setDialogue(true)}>
                <Plus aria-hidden className="size-4" />
                Ajouter un jour férié
              </Button>
            </div>
            {calendrier.feries.length === 0 ? (
              <Vide>Aucun jour férié pour le moment.</Vide>
            ) : (
              <Table
                legende="Jours fériés du calendrier"
                colonnes={colonnesFeries}
                lignes={calendrier.feries}
                cle={(f) => f.jour}
              />
            )}
          </section>
          <Dialog
            ouvert={dialogue}
            onOuvertChange={setDialogue}
            titre="Ajouter un jour férié"
            description="Indiquez la date et le libellé du jour férié."
          >
            <FormulaireFerie
              id={calendrier.id}
              onAnnuler={() => setDialogue(false)}
              onAjoute={() => {
                setDialogue(false);
                charger();
              }}
            />
          </Dialog>
          <Dialog
            ouvert={edition}
            onOuvertChange={setEdition}
            titre="Modifier le calendrier"
            description="Modifiez le nom et les jours travaillés."
          >
            <FormulaireCalendrier
              calendrier={calendrier}
              onAnnuler={() => setEdition(false)}
              onCree={() => {
                setEdition(false);
                charger();
              }}
            />
          </Dialog>
          {suppression && (
            <Confirmation
              nom={suppression.nom}
              action={() => api(suppression.chemin, { method: 'DELETE' })}
              onSucces={() => {
                const retour = suppression.retour;
                setSuppression(null);
                if (retour) navigate('/utilisateurs?onglet=calendriers');
                else charger();
              }}
              onAnnuler={() => setSuppression(null)}
            />
          )}
        </div>
      )}
    </Layout>
  );
}
