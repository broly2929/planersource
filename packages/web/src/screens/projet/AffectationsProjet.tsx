import { Coins, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api';
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
import { FormulaireDialogue, useListe, type Affectation } from './commun';
import { ChampTaux } from '../../components/ChampTaux';
import { AIDE_TAUX_AFFECTATION, AIDE_TAUX_RESSOURCE } from '../../aidesTaux';
import { useEstLeader, useIdNonAdmin } from '../../droits';
import { useTauxDuJour } from '../../tauxDuJour';
import { DialogueTaux } from '../TauxJournaliers';

function FormulaireAffectation({
  affectation,
  onSucces,
  onAnnuler,
}: {
  affectation: Affectation;
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [taux, setTaux] = useState(String(affectation.taux));
  const [debut, setDebut] = useState(affectation.date_debut ?? '');
  const [fin, setFin] = useState(affectation.date_fin ?? '');
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/affectations/${affectation.id}`, {
          method: 'PATCH',
          body: { taux: Number(taux), date_debut: debut || null, date_fin: fin || null },
        })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
    >
      <ChampTaux valeur={taux} onChange={setTaux} aide={AIDE_TAUX_AFFECTATION} />
      <Field
        label="Date de début"
        type="date"
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <Field label="Date de fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
    </FormulaireDialogue>
  );
}

/** Onglet « Affectations » : ressources affectées au projet et leur taux. */
export function AffectationsProjet({
  projetId,
  peutEcrire,
}: {
  projetId: number;
  peutEcrire: boolean;
}) {
  const annuaire = useAnnuaire();
  const [etat, charger] = useListe<Affectation[]>(`/api/projets/${projetId}/affectations`);
  const [dialogue, setDialogue] = useState(false);
  const [ressource, setRessource] = useState('');
  const [taux, setTaux] = useState('100');
  const [edition, setEdition] = useState<Affectation | null>(null);
  const [suppression, setSuppression] = useState<Affectation | null>(null);

  const nom = (id: number) => annuaire?.find((u) => u.id === id)?.nom ?? '…';
  const affectees = etat.statut === 'ok' ? etat.donnees.map((a) => a.ressource_id) : [];
  const [tauxRessource, setTauxRessource] = useState<Affectation | null>(null);
  const leader = useEstLeader();
  const moi = useIdNonAdmin();
  const voitTaux = peutEcrire && !leader;
  const duJour = useTauxDuJour(voitTaux);
  const candidates = (annuaire ?? []).filter(
    (u) => u.est_ressource && u.actif && !affectees.includes(u.id),
  );
  const options = [
    { value: '', label: 'Choisir une ressource' },
    ...candidates.map((u) => ({ value: String(u.id), label: u.nom })),
  ];
  const ouvrir = () => {
    setRessource('');
    setTaux('100');
    setDialogue(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {peutEcrire && (
        <div>
          <Button onClick={ouvrir}>
            <Plus aria-hidden className="size-4" />
            Affecter une ressource
          </Button>
        </div>
      )}
      {etat.statut === 'chargement' && <Chargement libelle="Chargement des affectations…" />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger les affectations.</Notification>
      )}
      {etat.statut === 'ok' && etat.donnees.length === 0 && (
        <Vide>Aucune ressource affectée à ce projet.</Vide>
      )}
      {etat.statut === 'ok' && etat.donnees.length > 0 && (
        <Table
          legende="Affectations du projet"
          colonnes={[
            { titre: 'Ressource', cellule: (a) => nom(a.ressource_id) },
            { titre: 'Taux (%)', cellule: (a) => a.taux },
            { titre: 'Début', cellule: (a) => a.date_debut ?? '—' },
            { titre: 'Fin', cellule: (a) => a.date_fin ?? '—' },
            ...(voitTaux
              ? [
                  {
                    titre: 'Taux du jour',
                    classeEntete: 'text-right',
                    classeCellule: 'text-right tabular-nums',
                    cellule: (a: Affectation) => duJour.texte(a.ressource_id),
                  },
                ]
              : []),
            ...(peutEcrire
              ? [
                  {
                    titre: 'Actions',
                    cellule: (a: Affectation) => (
                      <div className="flex gap-1">
                        {voitTaux && a.ressource_id !== moi && (
                          <BoutonIcone
                            libelle={`Modifier les taux de ${nom(a.ressource_id)}`}
                            icone={Coins}
                            onClick={() => setTauxRessource(a)}
                          />
                        )}
                        <BoutonIcone
                          libelle={`Modifier l'affectation de ${nom(a.ressource_id)}`}
                          icone={Pencil}
                          onClick={() => setEdition(a)}
                        />
                        <BoutonIcone
                          libelle={`Supprimer l'affectation de ${nom(a.ressource_id)}`}
                          icone={Trash2}
                          onClick={() => setSuppression(a)}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          lignes={etat.donnees}
          cle={(a) => a.id}
        />
      )}
      <Dialog
        ouvert={dialogue}
        onOuvertChange={setDialogue}
        titre="Affecter une ressource"
        description="Choisissez une ressource active et son taux d’affectation."
      >
        <FormulaireDialogue
          libelle="Affecter"
          envoyer={() => {
            if (!ressource) return Promise.reject(new Error('ressource'));
            return api(`/api/projets/${projetId}/affectations`, {
              method: 'POST',
              body: { ressource_id: Number(ressource), taux: Number(taux) },
            });
          }}
          onSucces={() => {
            setDialogue(false);
            charger();
          }}
          onAnnuler={() => setDialogue(false)}
        >
          <Select
            label="Ressource"
            required
            value={ressource}
            onChange={(e) => setRessource(e.target.value)}
            options={options}
          />
          <ChampTaux valeur={taux} onChange={setTaux} aide={AIDE_TAUX_AFFECTATION} />
        </FormulaireDialogue>
      </Dialog>
      {edition && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && setEdition(null)}
          titre="Modifier l’affectation"
          description={`Modifiez le taux et la période d’affectation de ${nom(edition.ressource_id)}.`}
        >
          <FormulaireAffectation
            affectation={edition}
            onSucces={() => {
              setEdition(null);
              charger();
            }}
            onAnnuler={() => setEdition(null)}
          />
        </Dialog>
      )}
      {tauxRessource && (
        <DialogueTaux
          titre={`Taux de ${nom(tauxRessource.ressource_id)}`}
          aide={AIDE_TAUX_RESSOURCE}
          cible="ressource"
          id={tauxRessource.ressource_id}
          onFermer={() => {
            setTauxRessource(null);
            duJour.recharger();
          }}
        />
      )}
      {suppression && (
        <Confirmation
          nom={`l’affectation de ${nom(suppression.ressource_id)}`}
          action={() => api(`/api/affectations/${suppression.id}`, { method: 'DELETE' })}
          onSucces={() => {
            setSuppression(null);
            charger();
          }}
          onAnnuler={() => setSuppression(null)}
        />
      )}
    </div>
  );
}
