import { Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { api } from '../../api';
import { BoutonIcone } from '../../components/BoutonIcone';
import { Button } from '../../components/Button';
import { Confirmation } from '../../components/Confirmation';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { Notification } from '../../components/Notification';
import { Select } from '../../components/Select';
import { candidatsDependance, type LigneArbo } from '../../saisieActivites';
import { libelleType, SelectTypeDependance } from '../../typesDependance';
import { messageErreur, useListe } from './commun';
import { FormulaireModifDependance } from './FormulairesEdition';

interface Dep {
  id: number;
  predecesseur_id: number;
  successeur_id: number;
  type: string;
  delai: number;
}
type Sens = 'predecesseur' | 'successeur';

/** État des dépendances d'une activité, partagé par les sections (dans le formulaire) et les dialogues (hors formulaire). */
export function useDependancesActivite(
  projetId: number,
  activiteId: number,
  lignes: LigneArbo[] | null,
  onChangement: () => void,
) {
  const [liste, recharger] = useListe<Dep[]>(`/api/projets/${projetId}/dependances`);
  const [edition, setEdition] = useState<Dep | null>(null);
  const [suppression, setSuppression] = useState<Dep | null>(null);
  const toutes = liste.statut === 'ok' ? liste.donnees : [];
  const nom = (id: number) => lignes?.find((l) => l.id === id)?.nom ?? '…';
  const apres = () => {
    recharger();
    onChangement();
  };
  return {
    activiteId,
    projetId,
    lignes,
    predecesseurs: toutes.filter((d) => d.successeur_id === activiteId),
    successeurs: toutes.filter((d) => d.predecesseur_id === activiteId),
    nom,
    apres,
    edition,
    setEdition,
    suppression,
    setSuppression,
  };
}
export type DependancesCtl = ReturnType<typeof useDependancesActivite>;

function Section({ ctl, sens }: { ctl: DependancesCtl; sens: Sens }) {
  const pred = sens === 'predecesseur';
  const titre = pred ? 'Prédécesseurs' : 'Successeurs';
  const idTitre = useId();
  const [autre, setAutre] = useState('');
  const [type, setType] = useState('FD');
  const [delai, setDelai] = useState('0');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const rangees = pred ? ctl.predecesseurs : ctl.successeurs;
  const options = [
    { value: '', label: 'Choisir un élément' },
    ...(ctl.lignes ? candidatsDependance(ctl.lignes, ctl.activiteId) : []),
  ];

  const ajouter = async () => {
    if (autre === '') {
      setErreur('Choisissez un élément.');
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      await api(`/api/projets/${ctl.projetId}/dependances`, {
        method: 'POST',
        body: {
          predecesseur_id: pred ? Number(autre) : ctl.activiteId,
          successeur_id: pred ? ctl.activiteId : Number(autre),
          type,
          delai: Number(delai),
        },
      });
      setAutre('');
      setType('FD');
      setDelai('0');
      ctl.apres();
    } catch (err) {
      setErreur(messageErreur(err, 'Cette dépendance existe déjà.', 'element'));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section
      aria-labelledby={idTitre}
      className="flex flex-col gap-2 border-t border-gray-200 pt-4"
    >
      <h3 id={idTitre} className="font-semibold text-gray-900">
        {titre}
      </h3>
      {rangees.length === 0 ? (
        <p className="text-petit text-gray-600">Aucun {pred ? 'prédécesseur' : 'successeur'}.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rangees.map((d) => {
            const nomDep = `la dépendance ${ctl.nom(d.predecesseur_id)} → ${ctl.nom(d.successeur_id)}`;
            return (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 break-words">
                  {ctl.nom(pred ? d.predecesseur_id : d.successeur_id)} · {libelleType(d.type)} ·
                  délai {d.delai}
                </span>
                <span className="flex gap-1">
                  <BoutonIcone
                    libelle={`Modifier ${nomDep}`}
                    icone={Pencil}
                    onClick={() => ctl.setEdition(d)}
                  />
                  <BoutonIcone
                    libelle={`Supprimer ${nomDep}`}
                    icone={Trash2}
                    onClick={() => ctl.setSuppression(d)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div
        className="flex flex-col gap-2 rounded-ui border border-gray-200 bg-gray-50 p-3"
        onKeyDown={(e) => {
          // Entrée dans un champ d'ajout : ajoute la dépendance, n'envoie pas le formulaire de l'activité.
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
            void ajouter();
          }
        }}
      >
        <Select
          label={`${pred ? 'Prédécesseur' : 'Successeur'} à ajouter`}
          value={autre}
          onChange={(e) => setAutre(e.target.value)}
          options={options}
        />
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <SelectTypeDependance valeur={type} onChange={setType} />
          </div>
          <Field
            className="w-44 shrink-0"
            label="Délai (j)"
            aide="Effet sur le planning : oui (jours ouvrés)."
            type="number"
            step="1"
            value={delai}
            onChange={(e) => setDelai(e.target.value)}
          />
        </div>
        <div>
          <Button variante="secondaire" onClick={() => void ajouter()} enCours={enCours}>
            {`Ajouter un ${pred ? 'prédécesseur' : 'successeur'}`}
          </Button>
        </div>
      </div>
      {erreur && <Notification type="erreur">{erreur}</Notification>}
    </section>
  );
}

/** Sous-sections « Prédécesseurs » et « Successeurs » : à placer dans le formulaire de l'activité. */
export function SectionsDependances({ ctl }: { ctl: DependancesCtl }) {
  return (
    <>
      <Section ctl={ctl} sens="predecesseur" />
      <Section ctl={ctl} sens="successeur" />
    </>
  );
}

/** Dialogues de modification et de confirmation : à placer HORS du formulaire (les évènements remontent l'arbre React). */
export function DialoguesDependances({ ctl }: { ctl: DependancesCtl }) {
  return (
    <>
      {ctl.edition && (
        <Dialog
          ouvert
          onOuvertChange={(o) => !o && ctl.setEdition(null)}
          titre="Modifier la dépendance"
          description="Modifiez le type et le délai."
        >
          <FormulaireModifDependance
            id={ctl.edition.id}
            type={ctl.edition.type}
            delai={ctl.edition.delai}
            onSucces={() => {
              ctl.setEdition(null);
              ctl.apres();
            }}
            onAnnuler={() => ctl.setEdition(null)}
          />
        </Dialog>
      )}
      {ctl.suppression && (
        <Confirmation
          nom={`la dépendance ${ctl.nom(ctl.suppression.predecesseur_id)} → ${ctl.nom(ctl.suppression.successeur_id)}`}
          action={() => api(`/api/dependances/${ctl.suppression!.id}`, { method: 'DELETE' })}
          onSucces={() => {
            ctl.setSuppression(null);
            ctl.apres();
          }}
          onAnnuler={() => ctl.setSuppression(null)}
        />
      )}
    </>
  );
}
