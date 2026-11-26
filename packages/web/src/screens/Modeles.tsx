import { FilePlus, Pencil, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { ChampOtp } from '../components/ChampOtp';
import { otpSaisi } from '../couts';
import { api } from '../api';
import { useAuth } from '../auth';
import { BoutonIcone } from '../components/BoutonIcone';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Field } from '../components/Field';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Onglets } from '../components/Onglets';
import { Table, type Colonne } from '../components/Table';
import { dateLocale } from '../gantt/echelle';
import { Link } from '../router';
import { CODE_UTILISE, FormulaireDialogue, useListe } from './projet/commun';
import { DialogueCopie } from './projet/DialogueCopie';
import { DialogueModifProjet } from './projet/DialogueModifProjet';

interface Modele {
  id: number;
  code: string;
  nom: string;
  date_debut: string;
  peut_ecrire: boolean;
}

function colonnes(
  onCreer: ((m: Modele) => void) | null,
  onModifier: (m: Modele) => void,
): Colonne<Modele>[] {
  return [
    { titre: 'Code', cellule: (m) => m.code },
    {
      titre: 'Nom',
      cellule: (m) => (
        <Link to={`/projets/${m.id}`} className="text-accent underline hover:text-accent-hover">
          {m.nom}
        </Link>
      ),
    },
    { titre: 'Début', cellule: (m) => m.date_debut },
    ...(onCreer
      ? [
          {
            titre: 'Actions',
            cellule: (m: Modele) => (
              <span className="inline-flex gap-1">
                {m.peut_ecrire && (
                  <BoutonIcone
                    libelle={`Modifier ${m.nom}`}
                    icone={Pencil}
                    onClick={() => onModifier(m)}
                  />
                )}
                <Button
                  variante="secondaire"
                  aria-label={`Créer un projet depuis ${m.nom}`}
                  title={`Créer un projet depuis ${m.nom}`}
                  onClick={() => onCreer(m)}
                >
                  <FilePlus aria-hidden className="size-4" />
                  Créer un projet
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];
}

function FormulaireModele({ onCree, onAnnuler }: { onCree: () => void; onAnnuler: () => void }) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  // D-218 (1) : préremplie à la date du jour du navigateur ; référence du décalage à la copie.
  const [debut, setDebut] = useState(() => dateLocale(new Date()));
  const idAide = useId();
  const [otp, setOtp] = useState('');
  return (
    <FormulaireDialogue
      libelle="Créer"
      envoyer={() =>
        api('/api/modeles', {
          method: 'POST',
          body: { code, nom, date_debut: debut, ...(otpSaisi(otp) ? { otp: otpSaisi(otp) } : {}) },
        })
      }
      onSucces={onCree}
      onAnnuler={onAnnuler}
      conflit={CODE_UTILISE}
    >
      <Field label="Code" required value={code} onChange={(e) => setCode(e.target.value)} />
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <div className="flex flex-col gap-1">
        <Field
          label="Date de début"
          type="date"
          required
          value={debut}
          onChange={(e) => setDebut(e.target.value)}
          aria-describedby={idAide}
        />
        <p id={idAide} className="text-petit text-gray-600">
          Date de référence : à la copie, les dates du modèle sont décalées de l’écart entre cette
          date et la date de début du nouveau projet.
        </p>
      </div>
      <ChampOtp valeur={otp} onChange={setOtp} aide={null} />
    </FormulaireDialogue>
  );
}

export function Modeles() {
  const { etat: auth } = useAuth();
  const admin = auth.statut === 'connecte' && auth.user.role === 'administrateur';
  const [dialogue, setDialogue] = useState(false);
  const peutCreer =
    auth.statut === 'connecte' &&
    (auth.user.role === 'administrateur' || auth.user.role === 'chef_de_projet');
  const [aCopier, setACopier] = useState<Modele | null>(null);
  const [aModifier, setAModifier] = useState<Modele | null>(null);
  const [etat, recharger] = useListe<Modele[]>('/api/modeles');

  return (
    <Layout
      titre="Modèles"
      actions={
        admin && (
          <Button onClick={() => setDialogue(true)}>
            <Plus aria-hidden className="size-4" />
            Nouveau modèle
          </Button>
        )
      }
    >
      <Onglets>
        {etat.statut === 'chargement' && <Chargement libelle="Chargement des modèles…" />}
        {etat.statut === 'erreur' && (
          <Notification type="erreur">Impossible de charger les modèles.</Notification>
        )}
        {etat.statut === 'ok' && etat.donnees.length === 0 && (
          <Vide>Aucun modèle pour le moment.</Vide>
        )}
        {etat.statut === 'ok' && etat.donnees.length > 0 && (
          <Table
            legende="Liste des modèles"
            colonnes={colonnes(peutCreer ? setACopier : null, setAModifier)}
            lignes={etat.donnees}
            cle={(m) => m.id}
          />
        )}
        {aModifier && (
          <DialogueModifProjet
            projetId={aModifier.id}
            onFermer={() => setAModifier(null)}
            onSucces={() => {
              setAModifier(null);
              recharger();
            }}
          />
        )}
        {aCopier && (
          <DialogueCopie
            source={aCopier}
            depuisModele
            admin={admin}
            onFermer={() => setACopier(null)}
          />
        )}
        <Dialog
          ouvert={dialogue}
          onOuvertChange={setDialogue}
          titre="Nouveau modèle"
          description="Renseignez le code, le nom et la date de début."
        >
          <FormulaireModele
            onAnnuler={() => setDialogue(false)}
            onCree={() => {
              setDialogue(false);
              recharger();
            }}
          />
        </Dialog>
      </Onglets>
    </Layout>
  );
}
