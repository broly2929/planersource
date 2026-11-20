import { useId, useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Case } from '../../components/Case';
import { Field } from '../../components/Field';
import { Select } from '../../components/Select';
import { aideMode, MODES_PLANIFICATION } from '../../modes';
import { FormulaireDialogue } from './commun';

export interface ActiviteDetail {
  id: number;
  nom: string;
  mode: string;
  priorite: number;
  debut_valide: string | null;
  fin_valide: string | null;
  duree_validee: number | null;
  close: boolean;
}
export interface JalonDetail {
  id: number;
  nom: string;
  type: string;
  date_validee: string | null;
}

interface Commun {
  onSucces: () => void;
  onAnnuler: () => void;
}

const vide = (v: string): string | null => (v === '' ? null : v);

export function FormulaireActivite({ activite, ...commun }: { activite: ActiviteDetail } & Commun) {
  const [nom, setNom] = useState(activite.nom);
  const [mode, setMode] = useState(activite.mode);
  const idAide = useId();
  const [priorite, setPriorite] = useState(String(activite.priorite));
  const [debut, setDebut] = useState(activite.debut_valide ?? '');
  const [fin, setFin] = useState(activite.fin_valide ?? '');
  const [duree, setDuree] = useState(
    activite.duree_validee === null ? '' : String(activite.duree_validee),
  );
  const [close, setClose] = useState(activite.close);
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/activites/${activite.id}`, {
          method: 'PATCH',
          body: {
            nom,
            mode,
            priorite: Number(priorite),
            debut_valide: vide(debut),
            fin_valide: vide(fin),
            duree_validee: duree === '' ? null : Number(duree),
            close,
          },
        })
      }
      cible="element"
      {...commun}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <div className="flex flex-col gap-1">
        <Select
          label="Mode de planification"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-describedby={idAide}
          options={MODES_PLANIFICATION.map((m) => ({ value: m.code, label: m.libelle }))}
        />
        <p id={idAide} className="text-petit text-gray-600">
          {aideMode(mode)}
        </p>
      </div>
      <Field
        label="Priorité"
        type="number"
        required
        min="0"
        max="1000"
        step="1"
        value={priorite}
        onChange={(e) => setPriorite(e.target.value)}
      />
      <Field
        label="Début validé"
        type="date"
        value={debut}
        onChange={(e) => setDebut(e.target.value)}
      />
      <Field label="Fin validée" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
      <Field
        label="Durée validée (jours ouvrés)"
        type="number"
        step="1"
        value={duree}
        onChange={(e) => setDuree(e.target.value)}
      />
      <Case label="Close" checked={close} onChange={(e) => setClose(e.target.checked)} />
    </FormulaireDialogue>
  );
}

export function FormulaireJalon({ jalon, ...commun }: { jalon: JalonDetail } & Commun) {
  const [nom, setNom] = useState(jalon.nom);
  const [type, setType] = useState(jalon.type);
  const [date, setDate] = useState(jalon.date_validee ?? '');
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/jalons/${jalon.id}`, {
          method: 'PATCH',
          body: { nom, type, date_validee: vide(date) },
        })
      }
      {...commun}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      <Select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={[
          { value: 'flottant', label: 'Flottant' },
          { value: 'fixe', label: 'Fixe' },
        ]}
      />
      <Field
        label="Date validée"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
    </FormulaireDialogue>
  );
}

export function FormulaireModifAssignation({
  id,
  charge: chargeInitiale,
  taux: tauxInitial,
  ...commun
}: { id: number; charge: number; taux: number } & Commun) {
  const [charge, setCharge] = useState(String(chargeInitiale));
  const [taux, setTaux] = useState(String(tauxInitial));
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/assignations/${id}`, {
          method: 'PATCH',
          body: { charge_assignee: Number(charge), taux: Number(taux) },
        })
      }
      {...commun}
    >
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

export function FormulaireModifDependance({
  id,
  type: typeInitial,
  delai: delaiInitial,
  onSupprimer,
  ...commun
}: {
  id: number;
  type: string;
  delai: number;
  /** Bouton « Supprimer » du dialogue (Gantt, 3e) ; la confirmation est tenue par l'appelant. */
  onSupprimer?: () => void;
} & Commun) {
  const [type, setType] = useState(typeInitial);
  const [delai, setDelai] = useState(String(delaiInitial));
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/dependances/${id}`, { method: 'PATCH', body: { type, delai: Number(delai) } })
      }
      {...commun}
    >
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
      {onSupprimer && (
        <div>
          <Button variante="danger" onClick={onSupprimer}>
            Supprimer
          </Button>
        </div>
      )}
    </FormulaireDialogue>
  );
}
