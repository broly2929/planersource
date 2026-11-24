import { useId, useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Case } from '../../components/Case';
import { Field } from '../../components/Field';
import { Select } from '../../components/Select';
import { aideMode, MODES_PLANIFICATION } from '../../modes';
import { SelectTypeDependance } from '../../typesDependance';
import { formaterDate } from '../../gantt/libelles';
import { analyserChargeVendue } from '../../gantt/vendu';
import { FormulaireDialogue } from './commun';

export interface ActiviteDetail {
  id: number;
  nom: string;
  mode: string;
  priorite: number;
  debut_valide: string | null;
  fin_valide: string | null;
  /** Dates du dernier calcul, lecture seule dans le dialogue (D-218 (3)). */
  debut_planifie?: string | null;
  fin_planifiee?: string | null;
  duree_validee: number | null;
  close: boolean;
  /** Champs de 6c, présents pour qui écrit sur le projet (D-149 (4)). */
  charge_vendue?: number | null;
  est_parent?: boolean;
}
export interface JalonDetail {
  id: number;
  nom: string;
  type: string;
  date_validee: string | null;
  date_client?: string | null;
}

interface Commun {
  onSucces: () => void;
  onAnnuler: () => void;
}

const vide = (v: string): string | null => (v === '' ? null : v);

/** Valeur numérique à la virgule décimale, telle qu'affichée dans le champ de saisie. */
const texteCharge = (n: number | null | undefined): string =>
  n === null || n === undefined ? '' : String(n).replace('.', ',');

/** Champ « Charge vendue (j) » (D-149 (7)) : texte libre, invalide → aria-invalid et message. */
export function ChampChargeVendue({
  valeur,
  onChange,
}: {
  valeur: string;
  onChange: (texte: string) => void;
}) {
  return (
    <Field
      label="Charge vendue (j)"
      inputMode="decimal"
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      {...(analyserChargeVendue(valeur).ok ? {} : { erreur: 'Charge vendue invalide.' })}
    />
  );
}

/** État du champ « Charge vendue (j) » : texte, analyse, et valeur à envoyer. */
export function useChargeVendue(initiale: number | null | undefined) {
  const [texte, setTexte] = useState(texteCharge(initiale));
  const analyse = analyserChargeVendue(texte);
  return { texte, setTexte, analyse, valide: analyse.ok };
}

/** Date planifiée en lecture seule : texte JJ/MM/AAAA, « — » avant tout calcul (D-218 (3)). */
function DatePlanifiee({
  libelle,
  cle,
  date,
}: {
  libelle: string;
  cle: string;
  date: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-gray-800">{libelle}</span>
      <span data-planifie={cle} className="flex h-8 items-center text-gray-900">
        {formaterDate(date)}
      </span>
    </div>
  );
}

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
  const vendue = useChargeVendue(activite.charge_vendue);
  const avecVendue = activite.est_parent !== true && activite.charge_vendue !== undefined;
  // D-149 (7) : la charge vendue n'est envoyée que si elle a changé.
  const vendueChangee =
    avecVendue && vendue.analyse.ok && vendue.analyse.valeur !== (activite.charge_vendue ?? null);
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      inactif={avecVendue && !vendue.valide}
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
            ...(vendueChangee && vendue.analyse.ok ? { charge_vendue: vendue.analyse.valeur } : {}),
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
      <DatePlanifiee libelle="Début planifié" cle="debut" date={activite.debut_planifie ?? null} />
      <DatePlanifiee libelle="Fin planifiée" cle="fin" date={activite.fin_planifiee ?? null} />
      <Field
        label="Durée validée (jours ouvrés)"
        type="number"
        step="1"
        value={duree}
        onChange={(e) => setDuree(e.target.value)}
      />
      {avecVendue && <ChampChargeVendue valeur={vendue.texte} onChange={vendue.setTexte} />}
      <Case label="Close" checked={close} onChange={(e) => setClose(e.target.checked)} />
    </FormulaireDialogue>
  );
}

export function FormulaireJalon({ jalon, ...commun }: { jalon: JalonDetail } & Commun) {
  const [nom, setNom] = useState(jalon.nom);
  const [type, setType] = useState(jalon.type);
  const [date, setDate] = useState(jalon.date_validee ?? '');
  const [dateClient, setDateClient] = useState(jalon.date_client ?? '');
  const avecClient = jalon.date_client !== undefined;
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/jalons/${jalon.id}`, {
          method: 'PATCH',
          body: {
            nom,
            type,
            date_validee: vide(date),
            // D-149 (7) : la date client n'est envoyée que si elle a changé.
            ...(avecClient && dateClient !== (jalon.date_client ?? '')
              ? { date_client: vide(dateClient) }
              : {}),
          },
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
      {avecClient && (
        <Field
          label="Date client"
          type="date"
          value={dateClient}
          onChange={(e) => setDateClient(e.target.value)}
        />
      )}
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
      <SelectTypeDependance valeur={type} onChange={setType} />
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
