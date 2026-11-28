import { useCallback, useState, type ReactNode } from 'react';
import { api } from '../api';
import { Field } from '../components/Field';
import { Select } from '../components/Select';
import { FormulaireDialogue } from '../screens/projet/commun';
import { dateLocale } from '../gantt/echelle';
import {
  OPTIONS_MOTIF,
  OPTIONS_PORTION,
  messageRefusAbsence,
  type Absence,
  type Motif,
  type Portion,
} from './logique';

/**
 * Formulaire d'absence (SPEC §4, point 10). Sans `ressources`, la ressource est fixe (rôle ressource, vue du point 10) ;
 * avec `ressources` (grille, D-280), une liste « Ressource » : modifiable à la création, désactivée en modification.
 */
export function FormulaireAbsence({
  ressource,
  absence,
  ressources,
  debutInitial,
  supprimer,
  onSucces,
  onAnnuler,
}: {
  ressource: number;
  absence: Absence | null;
  ressources?: { id: number; nom: string }[];
  debutInitial?: string | undefined;
  /** Bouton « Supprimer » (grille, en modification). */
  supprimer?: ReactNode | undefined;
  onSucces: () => void;
  onAnnuler: () => void;
}) {
  const [choisie, setChoisie] = useState(ressource);
  const [debut, setDebut] = useState(
    () => absence?.debut ?? debutInitial ?? dateLocale(new Date()),
  );
  const [fin, setFin] = useState(() => absence?.fin ?? debutInitial ?? dateLocale(new Date()));
  const [portion, setPortion] = useState<Portion>(absence?.portion ?? 'journee');
  const [motif, setMotif] = useState<Motif>(absence?.motif ?? 'conge');
  // Portion autre que Journée : « Au » aligné sur « Du » et désactivé.
  const finEffective = portion === 'journee' ? fin : debut;
  const modifie = useCallback(() => {
    const corps: Record<string, string> = {};
    if (!absence) return corps;
    if (debut !== absence.debut) corps.debut = debut;
    if (finEffective !== absence.fin) corps.fin = finEffective;
    if (portion !== absence.portion) corps.portion = portion;
    if (motif !== absence.motif) corps.motif = motif;
    return corps;
  }, [absence, debut, finEffective, portion, motif]);
  const champs = modifie();
  return (
    <FormulaireDialogue
      libelle={absence ? 'Enregistrer' : 'Créer'}
      inactif={absence !== null && Object.keys(champs).length === 0}
      texteErreur={messageRefusAbsence}
      envoyer={() =>
        absence
          ? api(`/api/absences/${absence.id}`, { method: 'PATCH', body: champs })
          : api('/api/absences', {
              method: 'POST',
              body: { ressource_id: choisie, debut, fin: finEffective, portion, motif },
            })
      }
      onSucces={onSucces}
      onAnnuler={onAnnuler}
    >
      {ressources && (
        <Select
          label="Ressource"
          value={String(choisie)}
          disabled={absence !== null}
          onChange={(e) => setChoisie(Number(e.target.value))}
          options={ressources.map((r) => ({ value: String(r.id), label: r.nom }))}
        />
      )}
      <div className="flex flex-wrap items-start gap-3">
        <Field
          label="Du"
          type="date"
          required
          value={debut}
          onChange={(e) => setDebut(e.target.value)}
        />
        <Field
          label="Au"
          type="date"
          required
          value={finEffective}
          disabled={portion !== 'journee'}
          onChange={(e) => setFin(e.target.value)}
        />
      </div>
      <Select
        label="Portion"
        value={portion}
        onChange={(e) => setPortion(e.target.value as Portion)}
        options={OPTIONS_PORTION}
      />
      <Select
        label="Motif"
        value={motif}
        onChange={(e) => setMotif(e.target.value as Motif)}
        options={OPTIONS_MOTIF}
      />
      {supprimer && <div>{supprimer}</div>}
    </FormulaireDialogue>
  );
}
