import { Pencil, Plus } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, ROLE_LABELS, type Role, type Utilisateur } from '../api';
import { Badge } from '../components/Badge';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Case } from '../components/Case';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Select } from '../components/Select';
import { Table, type Colonne } from '../components/Table';
import { navigate, usePath, useSearch } from '../router';
import { FormulaireDialogue, messageErreur, ONGLET } from './projet/commun';
import { OngletCalendriers, type Calendrier } from './Calendriers';
import { OngletEquipes, type Equipe } from './Equipes';
import { useTauxDuJour } from '../tauxDuJour';
import { DialoguesTaux, SectionTaux, useTauxJournaliers } from './TauxJournaliers';

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

const EMAIL_UTILISE = 'Cet email est déjà utilisé.';
const LOGIN_UTILISE = 'Cet identifiant est déjà utilisé.';
const EQUIPE_INCONNUE = "Cette équipe n'existe plus.";
const LOGIN_OU_EMAIL = 'Renseignez un identifiant ou un email.';

/** Validation locale (rien n'est envoyé) : identifiant ou email requis. */
const validerIdentite = (login: string, email: string) => () =>
  login.trim() === '' && email.trim() === '' ? LOGIN_OU_EMAIL : null;

/** Texte d'un 409 de l'écran, distingué par le message d'erreur de l'API (D-073). */
function conflitUtilisateur(err: ApiError): string {
  const m = (err.erreur ?? '').toLowerCase();
  if (m.includes('taux')) return 'Cet utilisateur a des taux journaliers : il reste ressource.';
  if (m.includes('identifiant')) return LOGIN_UTILISE;
  if (m.includes('affecté'))
    return 'Cet utilisateur est affecté à des projets : il reste ressource.';
  if (m.includes('se désactiver'))
    return 'Vous ne pouvez ni vous désactiver ni changer votre rôle.';
  if (m.includes('administrateur actif')) return 'Il doit rester un administrateur actif.';
  return EMAIL_UTILISE;
}

/** Refus 422 « Équipe inconnue » (D-147 (6)) ; les autres refus gardent leurs textes. */
function texteErreurUtilisateur(err: unknown): string {
  return err instanceof ApiError && err.status === 422 && err.erreur === 'Équipe inconnue'
    ? EQUIPE_INCONNUE
    : messageErreur(err, conflitUtilisateur);
}

type Liste =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | {
      statut: 'ok';
      utilisateurs: Utilisateur[];
      calendriers: Calendrier[];
      equipes: Equipe[];
    };

interface Commun {
  calendriers: Calendrier[];
  equipes: Equipe[];
  onSucces: () => void;
  onAnnuler: () => void;
}

function optionsCalendrier(calendriers: Calendrier[]) {
  return calendriers.map((c) => ({ value: String(c.id), label: c.nom }));
}

/** Valeur de la liste « Équipe » pour « Aucune ». */
const AUCUNE = '';

function optionsEquipe(equipes: Equipe[]) {
  return [
    { value: AUCUNE, label: 'Aucune' },
    ...equipes.map((e) => ({ value: String(e.id), label: e.nom })),
  ];
}

function FormulaireCreation({ calendriers, equipes, onSucces, onAnnuler }: Commun) {
  const [nom, setNom] = useState('');
  const [login, setLogin] = useState('');
  const [initiales, setInitiales] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [role, setRole] = useState<Role>('ressource');
  const [ressource, setRessource] = useState(true);
  const [capacite, setCapacite] = useState('1');
  const [calendrier, setCalendrier] = useState(
    String((calendriers.find((c) => c.est_defaut) ?? calendriers[0])?.id ?? ''),
  );
  const [equipe, setEquipe] = useState(AUCUNE);
  const [doitChanger, setDoitChanger] = useState(false);
  return (
    <FormulaireDialogue
      libelle="Créer"
      valider={validerIdentite(login, email)}
      envoyer={() => {
        return api('/api/utilisateurs', {
          method: 'POST',
          body: {
            nom,
            ...(login.trim() !== '' ? { login: login.trim() } : {}),
            ...(email.trim() !== '' ? { email: email.trim() } : {}),
            ...(initiales.trim() !== '' ? { initiales: initiales.trim() } : {}),
            mot_de_passe: motDePasse,
            role,
            est_ressource: ressource,
            capacite: Number(capacite),
            ...(calendrier ? { calendrier_id: Number(calendrier) } : {}),
            ...(equipe !== AUCUNE ? { equipe_id: Number(equipe) } : {}),
            ...(doitChanger ? { doit_changer_mot_de_passe: true } : {}),
          },
        });
      }}
      onSucces={onSucces}
      onAnnuler={onAnnuler}
      texteErreur={texteErreurUtilisateur}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <Field
        label="Identifiant"
        autoComplete="off"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />
      <Field
        label="Initiales"
        maxLength={4}
        value={initiales}
        onChange={(e) => setInitiales(e.target.value)}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        required
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
      />
      <Case
        label="Doit changer son mot de passe à la prochaine connexion"
        checked={doitChanger}
        onChange={(e) => setDoitChanger(e.target.checked)}
      />
      <Select
        label="Rôle"
        options={ROLE_OPTIONS}
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
      />
      <Case
        label="Ressource planifiable"
        checked={ressource}
        onChange={(e) => setRessource(e.target.checked)}
      />
      <Field
        label="Capacité (j/jour)"
        type="number"
        required
        min="0.01"
        step="any"
        value={capacite}
        onChange={(e) => setCapacite(e.target.value)}
      />
      <Select
        label="Calendrier"
        options={optionsCalendrier(calendriers)}
        value={calendrier}
        onChange={(e) => setCalendrier(e.target.value)}
      />
      <Select
        label="Équipe"
        options={optionsEquipe(equipes)}
        value={equipe}
        onChange={(e) => setEquipe(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

function FormulaireModification({
  utilisateur: u,
  calendriers,
  equipes,
  onSucces,
  onAnnuler,
}: Commun & { utilisateur: Utilisateur }) {
  const [nom, setNom] = useState(u.nom);
  const [login, setLogin] = useState(u.login);
  const [initiales, setInitiales] = useState(u.initiales ?? '');
  const [email, setEmail] = useState(u.email ?? '');
  const [role, setRole] = useState<Role>(u.role);
  const [ressource, setRessource] = useState(u.est_ressource);
  const [capacite, setCapacite] = useState(String(u.capacite));
  const [calendrier, setCalendrier] = useState(String(u.calendrier_id));
  const [equipe, setEquipe] = useState(u.equipe_id === null ? AUCUNE : String(u.equipe_id));
  const [actif, setActif] = useState(u.actif);
  const [doitChanger, setDoitChanger] = useState(u.doit_changer_mot_de_passe);
  const [motDePasse, setMotDePasse] = useState('');
  // Taux journaliers (D-225, SPEC §12.1 point 9) : utilisateur ressource seulement.
  const taux = useTauxJournaliers(u.id);

  // Seuls les champs modifiés partent dans le PATCH ; mot de passe vide = inchangé.
  const modifies = () => ({
    ...(nom !== u.nom ? { nom } : {}),
    ...(login.trim() !== '' && login.trim() !== u.login ? { login: login.trim() } : {}),
    ...(email.trim() !== (u.email ?? '')
      ? { email: email.trim() === '' ? null : email.trim() }
      : {}),
    ...(initiales.trim() !== (u.initiales ?? '')
      ? { initiales: initiales.trim() === '' ? null : initiales.trim() }
      : {}),
    ...(role !== u.role ? { role } : {}),
    ...(ressource !== u.est_ressource ? { est_ressource: ressource } : {}),
    ...(Number(capacite) !== u.capacite ? { capacite: Number(capacite) } : {}),
    ...(calendrier !== String(u.calendrier_id) ? { calendrier_id: Number(calendrier) } : {}),
    ...(equipe !== (u.equipe_id === null ? AUCUNE : String(u.equipe_id))
      ? { equipe_id: equipe === AUCUNE ? null : Number(equipe) }
      : {}),
    ...(actif !== u.actif ? { actif } : {}),
    ...(motDePasse !== '' ? { mot_de_passe: motDePasse } : {}),
    ...(doitChanger !== u.doit_changer_mot_de_passe
      ? { doit_changer_mot_de_passe: doitChanger }
      : {}),
  });

  return (
    <>
      <FormulaireDialogue
        libelle="Enregistrer"
        valider={validerIdentite(login, email)}
        envoyer={() => {
          return api(`/api/utilisateurs/${u.id}`, { method: 'PATCH', body: modifies() });
        }}
        onSucces={onSucces}
        onAnnuler={onAnnuler}
        texteErreur={texteErreurUtilisateur}
      >
        <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <Field
          label="Identifiant"
          autoComplete="off"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <Field
          label="Initiales"
          maxLength={4}
          value={initiales}
          onChange={(e) => setInitiales(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select
          label="Rôle"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        />
        <Case
          label="Ressource planifiable"
          checked={ressource}
          onChange={(e) => setRessource(e.target.checked)}
        />
        <Field
          label="Capacité (j/jour)"
          type="number"
          required
          min="0.01"
          step="any"
          value={capacite}
          onChange={(e) => setCapacite(e.target.value)}
        />
        <Select
          label="Calendrier"
          options={optionsCalendrier(calendriers)}
          value={calendrier}
          onChange={(e) => setCalendrier(e.target.value)}
        />
        <Select
          label="Équipe"
          options={optionsEquipe(equipes)}
          value={equipe}
          onChange={(e) => setEquipe(e.target.value)}
        />
        <Case label="Actif" checked={actif} onChange={(e) => setActif(e.target.checked)} />
        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
        <Case
          label="Doit changer son mot de passe à la prochaine connexion"
          checked={doitChanger}
          onChange={(e) => setDoitChanger(e.target.checked)}
        />
        {u.est_ressource && <SectionTaux ctl={taux} />}
      </FormulaireDialogue>
      {u.est_ressource && <DialoguesTaux ctl={taux} />}
    </>
  );
}

/** Écran Utilisateurs (REX-5, D-165) : onglets Utilisateurs, Équipes et Calendriers. */
export function Utilisateurs() {
  const chemin = usePath();
  const demande = useSearch().get('onglet');
  const onglet = demande === 'equipes' || demande === 'calendriers' ? demande : 'utilisateurs';
  const changerOnglet = (valeur: string) => {
    const parametres = new URLSearchParams(window.location.search);
    if (valeur === 'utilisateurs') parametres.delete('onglet');
    else parametres.set('onglet', valeur);
    const texte = parametres.toString();
    navigate(texte ? `${chemin}?${texte}` : chemin);
  };
  return (
    <Layout titre="Utilisateurs">
      <Tabs.Root value={onglet} onValueChange={changerOnglet} className="flex flex-col gap-4">
        <Tabs.List
          aria-label="Sections de l’administration"
          className="flex gap-2 border-b border-gray-200"
        >
          <Tabs.Trigger value="utilisateurs" className={ONGLET}>
            Utilisateurs
          </Tabs.Trigger>
          <Tabs.Trigger value="equipes" className={ONGLET}>
            Équipes
          </Tabs.Trigger>
          <Tabs.Trigger value="calendriers" className={ONGLET}>
            Calendriers
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="utilisateurs">
          <OngletUtilisateurs />
        </Tabs.Content>
        <Tabs.Content value="equipes">
          <OngletEquipes />
        </Tabs.Content>
        <Tabs.Content value="calendriers">
          <OngletCalendriers />
        </Tabs.Content>
      </Tabs.Root>
    </Layout>
  );
}

function OngletUtilisateurs() {
  const [liste, setListe] = useState<Liste>({ statut: 'chargement' });
  const [creation, setCreation] = useState(false);
  const [aModifier, setAModifier] = useState<Utilisateur | null>(null);
  const duJour = useTauxDuJour(true);

  const charger = useCallback(() => {
    Promise.all([
      api<Utilisateur[]>('/api/utilisateurs'),
      api<Calendrier[]>('/api/calendriers'),
      api<Equipe[]>('/api/equipes'),
    ])
      .then(([utilisateurs, calendriers, equipes]) =>
        setListe({ statut: 'ok', utilisateurs, calendriers, equipes }),
      )
      .catch((err) =>
        setListe({
          statut: 'erreur',
          message:
            err instanceof ApiError && err.status === 403
              ? 'Accès réservé aux administrateurs.'
              : 'Impossible de charger les utilisateurs.',
        }),
      );
  }, []);

  useEffect(charger, [charger]);

  const calendriers = liste.statut === 'ok' ? liste.calendriers : [];
  const equipes = liste.statut === 'ok' ? liste.equipes : [];
  const colonnes: Colonne<Utilisateur>[] = [
    { titre: 'Nom', cellule: (u) => u.nom },
    { titre: 'Identifiant', cellule: (u) => u.login || '—' },
    { titre: 'Initiales', cellule: (u) => u.initiales || '—' },
    { titre: 'Email', cellule: (u) => u.email ?? '—' },
    { titre: 'Rôle', cellule: (u) => ROLE_LABELS[u.role] },
    { titre: 'Ressource', cellule: (u) => (u.est_ressource ? 'Oui' : 'Non') },
    { titre: 'Capacité', cellule: (u) => u.capacite },
    {
      titre: 'Calendrier',
      cellule: (u) => calendriers.find((c) => c.id === u.calendrier_id)?.nom ?? '—',
    },
    {
      titre: 'Équipe',
      cellule: (u) => equipes.find((e) => e.id === u.equipe_id)?.nom ?? '—',
    },
    {
      titre: 'Taux du jour',
      classeEntete: 'text-right',
      classeCellule: 'text-right tabular-nums',
      cellule: (u) => (u.est_ressource ? duJour.texte(Number(u.id)) : '—'),
    },
    {
      titre: 'Statut',
      cellule: (u) => (
        <Badge statut={u.actif ? 'success' : 'neutre'}>{u.actif ? 'Actif' : 'Inactif'}</Badge>
      ),
    },
    {
      titre: 'Actions',
      cellule: (u) => (
        <BoutonIcone libelle={`Modifier ${u.nom}`} icone={Pencil} onClick={() => setAModifier(u)} />
      ),
    },
  ];

  const apres = (fermer: () => void) => () => {
    fermer();
    charger();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreation(true)} disabled={liste.statut !== 'ok'}>
          <Plus aria-hidden className="size-4" />
          Nouvel utilisateur
        </Button>
      </div>
      {liste.statut === 'chargement' && <Chargement libelle="Chargement des utilisateurs…" />}
      {liste.statut === 'erreur' && <Notification type="erreur">{liste.message}</Notification>}
      {liste.statut === 'ok' && liste.utilisateurs.length === 0 && (
        <Vide>Aucun utilisateur pour le moment.</Vide>
      )}
      {liste.statut === 'ok' && liste.utilisateurs.length > 0 && (
        <Table
          legende="Liste des utilisateurs"
          colonnes={colonnes}
          lignes={liste.utilisateurs}
          cle={(u) => u.id}
        />
      )}
      <Dialog
        ouvert={creation}
        onOuvertChange={setCreation}
        titre="Nouvel utilisateur"
        description="Renseignez les informations du compte à créer."
      >
        <FormulaireCreation
          calendriers={calendriers}
          equipes={equipes}
          onAnnuler={() => setCreation(false)}
          onSucces={apres(() => {
            setCreation(false);
            duJour.recharger();
          })}
        />
      </Dialog>
      <Dialog
        ouvert={aModifier !== null}
        onOuvertChange={(ouvert) => {
          if (ouvert) return;
          setAModifier(null);
          duJour.recharger();
        }}
        titre={aModifier ? `Modifier ${aModifier.nom}` : 'Modifier l’utilisateur'}
        description="Modifiez les informations du compte. Un mot de passe vide reste inchangé."
      >
        {aModifier && (
          <FormulaireModification
            utilisateur={aModifier}
            calendriers={calendriers}
            equipes={equipes}
            onAnnuler={() => {
              setAModifier(null);
              duJour.recharger();
            }}
            onSucces={apres(() => {
              setAModifier(null);
              duJour.recharger();
            })}
          />
        )}
      </Dialog>
    </div>
  );
}
