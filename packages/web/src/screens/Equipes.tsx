import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Utilisateur } from '../api';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import { FormulaireDialogue } from './projet/commun';

/** Équipe (lot 6a, D-147) : regroupement d'utilisateurs pour l'affichage et les filtres. */
export interface Equipe {
  id: number;
  nom: string;
}

const DOUBLON = 'Cette équipe existe déjà.';
const UTILISEE = "Cette équipe a des membres : retirez-les d'abord.";

type Liste =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | { statut: 'ok'; equipes: Equipe[]; membres: Map<number, number> };

/** Texte du refus d'une suppression : 409 = équipe portée par au moins un utilisateur. */
function messageSuppression(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return UTILISEE;
    if (err.status === 404) return 'Cette équipe n’existe plus.';
    if (err.status === 403) return 'Vous n’avez pas le droit d’effectuer cette suppression.';
  }
  return 'Suppression impossible pour le moment. Réessayez.';
}

/** Création (sans `equipe`) ou renommage d'une équipe. */
function FormulaireEquipe({
  equipe,
  onSucces,
  onAnnuler,
}: {
  equipe?: Equipe;
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [nom, setNom] = useState(equipe?.nom ?? '');
  return (
    <FormulaireDialogue
      libelle={equipe ? 'Enregistrer' : 'Créer'}
      envoyer={() =>
        api(equipe ? `/api/equipes/${equipe.id}` : '/api/equipes', {
          method: equipe ? 'PATCH' : 'POST',
          body: { nom },
        })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
      conflit={DOUBLON}
    >
      <Field
        label="Nom"
        required
        maxLength={100}
        value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

/** Onglet « Équipes » de l'écran Utilisateurs (REX-5, D-165). */
export function OngletEquipes() {
  const [liste, setListe] = useState<Liste>({ statut: 'chargement' });
  const [creation, setCreation] = useState(false);
  const [aRenommer, setARenommer] = useState<Equipe | null>(null);
  const [aSupprimer, setASupprimer] = useState<Equipe | null>(null);

  const charger = useCallback(() => {
    Promise.all([api<Equipe[]>('/api/equipes'), api<Utilisateur[]>('/api/utilisateurs')])
      .then(([equipes, utilisateurs]) => {
        const membres = new Map<number, number>();
        for (const u of utilisateurs) {
          if (u.equipe_id !== null) membres.set(u.equipe_id, (membres.get(u.equipe_id) ?? 0) + 1);
        }
        setListe({ statut: 'ok', equipes, membres });
      })
      .catch((err) =>
        setListe({
          statut: 'erreur',
          message:
            err instanceof ApiError && err.status === 403
              ? 'Accès réservé aux administrateurs.'
              : 'Impossible de charger les équipes.',
        }),
      );
  }, []);

  useEffect(charger, [charger]);

  const membres = liste.statut === 'ok' ? liste.membres : new Map<number, number>();
  const colonnes: Colonne<Equipe>[] = [
    { titre: 'Nom', cellule: (e) => e.nom },
    { titre: 'Membres', cellule: (e) => membres.get(e.id) ?? 0 },
    {
      titre: 'Actions',
      cellule: (e) => (
        <div className="flex gap-2">
          <BoutonIcone
            libelle={`Renommer ${e.nom}`}
            icone={Pencil}
            onClick={() => setARenommer(e)}
          />
          <BoutonIcone
            libelle={`Supprimer ${e.nom}`}
            icone={Trash2}
            onClick={() => setASupprimer(e)}
          />
        </div>
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
          Nouvelle équipe
        </Button>
      </div>
      {liste.statut === 'chargement' && <Chargement libelle="Chargement des équipes…" />}
      {liste.statut === 'erreur' && <Notification type="erreur">{liste.message}</Notification>}
      {liste.statut === 'ok' && liste.equipes.length === 0 && (
        <Vide>Aucune équipe pour le moment.</Vide>
      )}
      {liste.statut === 'ok' && liste.equipes.length > 0 && (
        <Table
          legende="Liste des équipes"
          colonnes={colonnes}
          lignes={liste.equipes}
          cle={(e) => e.id}
        />
      )}
      <Dialog
        ouvert={creation}
        onOuvertChange={setCreation}
        titre="Nouvelle équipe"
        description="Nommez l’équipe à créer."
      >
        <FormulaireEquipe
          onAnnuler={() => setCreation(false)}
          onSucces={apres(() => setCreation(false))}
        />
      </Dialog>
      <Dialog
        ouvert={aRenommer !== null}
        onOuvertChange={(ouvert) => !ouvert && setARenommer(null)}
        titre={aRenommer ? `Renommer ${aRenommer.nom}` : 'Renommer l’équipe'}
        description="Modifiez le nom de l’équipe."
      >
        {aRenommer && (
          <FormulaireEquipe
            equipe={aRenommer}
            onAnnuler={() => setARenommer(null)}
            onSucces={apres(() => setARenommer(null))}
          />
        )}
      </Dialog>
      {aSupprimer && (
        <Confirmation
          nom={aSupprimer.nom}
          action={() => api(`/api/equipes/${aSupprimer.id}`, { method: 'DELETE' })}
          messageErreur={messageSuppression}
          onSucces={apres(() => setASupprimer(null))}
          onAnnuler={() => setASupprimer(null)}
        />
      )}
    </div>
  );
}
