import { useId, useState } from 'react';
import { api } from '../../api';
import { Button } from '../../components/Button';
import { Case } from '../../components/Case';
import { Field } from '../../components/Field';
import { Select } from '../../components/Select';
import { aideMode, MODES_PLANIFICATION } from '../../modes';
import { SelectTypeDependance } from '../../typesDependance';
import {
  aideDureeDuMode,
  champsDuMode,
  texteChargeAssignee,
  texteMarge,
} from '../../champsActivite';
import { formaterDate } from '../../gantt/libelles';
import { useEstLeader } from '../../droits';
import { analyserChargeVendue } from '../../gantt/vendu';
import { FormulaireDialogue, useListe } from './commun';
import { ErreurApresDeplacement, texteErreurSaisie, useParentModif } from './ChampParent';
import {
  DialoguesDependances,
  SectionsDependances,
  useDependancesActivite,
} from './DependancesActivite';
import { champsActivite } from '../../saisieActivites';
import { ChampTaux } from '../../components/ChampTaux';
import { AIDE_TAUX_ASSIGNATION } from '../../aidesTaux';
import {
  AIDE_CHARGE,
  AIDE_CHARGE_TAUX,
  CASE_CHARGE_TAUX,
  texteRefusAssignation,
} from '../../chargeTaux';
import { ChampOtp } from '../../components/ChampOtp';
import { ChampNotes, notesEnvoyees } from '../../components/ChampNotes';
import { aideOtp, heriteDe, otpSaisi, type OtpLecture } from '../../couts';
import type { LigneArbo } from '../../saisieActivites';

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
  /** Lues dans l'API pour qui écrit sur le projet (D-220 (6)), jamais calculées côté web. */
  charge_assignee?: number;
  marge?: number | null;
  est_parent?: boolean;
  /** OTP propre et hérité (D-225, SPEC §12.2). */
  otp?: string | null;
  otp_effectif?: string | null;
  otp_source?: OtpLecture['otp_source'];
  /** Note d'activité (D-270) ; absente pour le rôle ressource. */
  notes?: string | null;
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
      aide="Effet sur le planning : non (sert à la marge)."
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

/** Valeur en lecture seule : libellé et texte, pas de champ (D-220). */
function ValeurLecture({
  libelle,
  cle,
  className = '',
  children,
}: {
  libelle: string;
  cle: string;
  className?: string;
  children: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-gray-800">{libelle}</span>
      <span data-lecture={cle} className={`flex h-8 items-center text-gray-900 ${className}`}>
        {children}
      </span>
    </div>
  );
}

/** État du mode et des champs qu'il commande ; les valeurs des champs masqués sont gardées (D-220). */
export function usePlanification(initial: {
  mode: string;
  debut: string | null;
  fin: string | null;
  duree: number | null;
}) {
  const [mode, setMode] = useState(initial.mode);
  const [debut, setDebut] = useState(initial.debut ?? '');
  const [fin, setFin] = useState(initial.fin ?? '');
  const [duree, setDuree] = useState(initial.duree === null ? '' : String(initial.duree));
  const champs = champsDuMode(mode);
  // Identifiants fixes : un champ masqué puis réaffiché garde sa clé dans l'instantané de la garde (D-188, D-220).
  const base = useId();
  const ids = { debut: `${base}-debut`, fin: `${base}-fin`, duree: `${base}-duree` };
  return { mode, setMode, debut, setDebut, fin, setFin, duree, setDuree, champs, ids };
}
export type Planification = ReturnType<typeof usePlanification>;

/** Mode de planification seul : la liste et l'aide du mode choisi. */
export function ChampMode({ p }: { p: Planification }) {
  const idAide = useId();
  return (
    <div className="flex flex-col gap-1">
      <Select
        label="Mode de planification"
        value={p.mode}
        onChange={(e) => p.setMode(e.target.value)}
        aria-describedby={idAide}
        options={MODES_PLANIFICATION.map((m) => ({ value: m.code, label: m.libelle }))}
      />
      <p id={idAide} className="text-petit text-gray-600">
        {aideMode(p.mode)}
      </p>
    </div>
  );
}

/** Début et fin validés, selon le mode (SPEC §6 « Charge lisible » 1). */
export function ChampsDates({ p }: { p: Planification }) {
  return (
    <>
      {p.champs.debut && (
        <Field
          id={p.ids.debut}
          label="Début validé"
          type="date"
          value={p.debut}
          onChange={(e) => p.setDebut(e.target.value)}
        />
      )}
      {p.champs.fin && (
        <Field
          id={p.ids.fin}
          label="Fin validée"
          type="date"
          value={p.fin}
          onChange={(e) => p.setFin(e.target.value)}
        />
      )}
    </>
  );
}

/** Durée validée (j), selon le mode, avec l'aide « Effet sur le planning » du mode. */
export function ChampDuree({ p }: { p: Planification }) {
  if (!p.champs.duree) return null;
  const aide = aideDureeDuMode(p.mode);
  return (
    <Field
      id={p.ids.duree}
      label="Durée validée (j)"
      type="number"
      step="1"
      value={p.duree}
      onChange={(e) => p.setDuree(e.target.value)}
      {...(aide ? { aide } : {})}
    />
  );
}

export function FormulaireActivite({
  activite,
  projetId,
  onChangement = () => undefined,
  ...commun
}: {
  activite: ActiviteDetail;
  projetId: number;
  /** Appelé après une action enregistrée tout de suite (déplacement, dépendance) : l'écran appelant se recharge. */
  onChangement?: () => void;
} & Commun) {
  const [nom, setNom] = useState(activite.nom);
  const notesInitiales = activite.notes ?? '';
  const [notes, setNotes] = useState(notesInitiales);
  const parent = useParentModif(projetId, activite.id, onChangement);
  const dependances = useDependancesActivite(projetId, activite.id, parent.lignes, onChangement);
  const estParent = activite.est_parent === true;
  const p = usePlanification({
    mode: activite.mode,
    debut: activite.debut_valide,
    fin: activite.fin_valide,
    duree: activite.duree_validee,
  });
  const [priorite, setPriorite] = useState(String(activite.priorite));
  const [close, setClose] = useState(activite.close);
  const vendue = useChargeVendue(activite.charge_vendue);
  const otpInitial = activite.otp ?? null;
  const [otp, setOtp] = useState(otpInitial ?? '');
  // D-225 : aide de la valeur héritée, sans valeur propre et champ vide.
  const aideHeritage =
    otp.trim() === '' && otpInitial === null
      ? aideOtp({
          otp: null,
          otp_effectif: activite.otp_effectif ?? null,
          otp_source: activite.otp_source ?? null,
        })
      : null;
  const leader = useEstLeader();
  const avecVendue =
    !leader && activite.est_parent !== true && activite.charge_vendue !== undefined;
  // D-149 (7) : la charge vendue n'est envoyée que si elle a changé.
  const vendueChangee =
    avecVendue && vendue.analyse.ok && vendue.analyse.valeur !== (activite.charge_vendue ?? null);
  const marge = texteMarge(activite.marge ?? null);
  // D-222 (3) : une activité parente n'affiche ni mode, ni dates validées, ni durée ; rien n'en est envoyé.
  const champs = champsActivite(p.mode, estParent);
  const pc = { ...p, champs };
  return (
    <>
      <FormulaireDialogue
        libelle="Enregistrer"
        inactif={avecVendue && !vendue.valide}
        envoyer={async () => {
          const deplace = await parent.deplacer();
          try {
            return await api(`/api/activites/${activite.id}`, {
              method: 'PATCH',
              body: {
                nom,
                // D-270 : les notes ne sont envoyées que si elles ont changé.
                ...(notes !== notesInitiales ? { notes: notesEnvoyees(notes) } : {}),
                ...(champs.mode ? { mode: p.mode } : {}),
                priorite: Number(priorite),
                // D-220 : un champ masqué n'est pas envoyé, sa valeur reste en base.
                ...(champs.debut ? { debut_valide: vide(p.debut) } : {}),
                ...(champs.fin ? { fin_valide: vide(p.fin) } : {}),
                ...(champs.duree ? { duree_validee: p.duree === '' ? null : Number(p.duree) } : {}),
                close,
                ...(vendueChangee && vendue.analyse.ok
                  ? { charge_vendue: vendue.analyse.valeur }
                  : {}),
                ...(otpSaisi(otp) !== otpInitial ? { otp: otpSaisi(otp) } : {}),
              },
            });
          } catch (err) {
            throw deplace || parent.dejaDeplace ? new ErreurApresDeplacement(err) : err;
          }
        }}
        texteErreur={(err) => texteErreurSaisie(err, 'element')}
        {...commun}
      >
        <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <ChampNotes valeur={notes} onChange={setNotes} />
        {parent.champ}
        {champs.mode && <ChampMode p={p} />}
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
        <ChampsDates p={pc} />
        <DatePlanifiee
          libelle="Début planifié"
          cle="debut"
          date={activite.debut_planifie ?? null}
        />
        <DatePlanifiee libelle="Fin planifiée" cle="fin" date={activite.fin_planifiee ?? null} />
        <ChampDuree p={pc} />
        {activite.est_parent !== true && activite.charge_assignee !== undefined && (
          <ValeurLecture libelle="Charge assignée (somme des ressources)" cle="charge-assignee">
            {texteChargeAssignee(activite.charge_assignee)}
          </ValeurLecture>
        )}
        {avecVendue && (
          <div className="grid grid-cols-2 items-start gap-4">
            <ChampChargeVendue valeur={vendue.texte} onChange={vendue.setTexte} />
            <ValeurLecture
              libelle="Marge"
              cle="marge"
              className={marge.negative ? 'text-flag' : ''}
            >
              {marge.texte}
            </ValeurLecture>
          </div>
        )}
        <ChampOtp valeur={otp} onChange={setOtp} aide={aideHeritage} />
        <Case label="Close" checked={close} onChange={(e) => setClose(e.target.checked)} />
        <SectionsDependances ctl={dependances} />
      </FormulaireDialogue>
      <DialoguesDependances ctl={dependances} />
    </>
  );
}

export function FormulaireJalon({
  jalon,
  projetId,
  onChangement = () => undefined,
  ...commun
}: {
  jalon: JalonDetail;
  projetId: number;
  onChangement?: () => void;
} & Commun) {
  const [nom, setNom] = useState(jalon.nom);
  const parent = useParentModif(projetId, jalon.id, onChangement);
  const [type, setType] = useState(jalon.type);
  const [date, setDate] = useState(jalon.date_validee ?? '');
  const [dateClient, setDateClient] = useState(jalon.date_client ?? '');
  const avecClient = jalon.date_client !== undefined;
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={async () => {
        const deplace = await parent.deplacer();
        try {
          return await api(`/api/jalons/${jalon.id}`, {
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
          });
        } catch (err) {
          throw deplace || parent.dejaDeplace ? new ErreurApresDeplacement(err) : err;
        }
      }}
      texteErreur={(err) => texteErreurSaisie(err)}
      {...commun}
    >
      <Field label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
      {parent.champ}
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
  regul = false,
  depuisTaux: depuisTauxInitial = false,
  ...commun
}: {
  id: number;
  charge: number;
  taux: number;
  /** activité en mode REGUL : case « Charge depuis le taux » (D-276) */
  regul?: boolean;
  depuisTaux?: boolean;
} & Commun) {
  const [charge, setCharge] = useState(String(chargeInitiale));
  const [taux, setTaux] = useState(String(tauxInitial));
  const [depuisTaux, setDepuisTaux] = useState(depuisTauxInitial);
  return (
    <FormulaireDialogue
      libelle="Enregistrer"
      envoyer={() =>
        api(`/api/assignations/${id}`, {
          method: 'PATCH',
          body: {
            // charge calculée : jamais envoyée (refus `charge_calculee`, D-276 point 14)
            ...(depuisTaux ? {} : { charge_assignee: Number(charge) }),
            taux: Number(taux),
            ...(depuisTaux !== depuisTauxInitial ? { charge_depuis_taux: depuisTaux } : {}),
          },
        })
      }
      texteErreur={texteRefusAssignation}
      {...commun}
    >
      {regul && (
        <Case
          label={CASE_CHARGE_TAUX}
          checked={depuisTaux}
          onChange={(e) => setDepuisTaux(e.target.checked)}
        />
      )}
      <Field
        label="Charge assignée (j)"
        aide={depuisTaux ? AIDE_CHARGE_TAUX : AIDE_CHARGE}
        type="number"
        required={!depuisTaux}
        readOnly={depuisTaux}
        // charge laissée par le calcul (D-276) : 0 possible, rien n'impose 0,01 après décochage
        min={depuisTauxInitial ? '0' : '0.01'}
        step="0.01"
        value={charge}
        onChange={(e) => setCharge(e.target.value)}
      />
      <ChampTaux valeur={taux} onChange={setTaux} aide={AIDE_TAUX_ASSIGNATION} />
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
        label="Délai (j)"
        aide="Effet sur le planning : oui (jours ouvrés)."
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

/**
 * Aide de l'OTP à la création d'une activité (D-225, SPEC §12.2 point 7) : valeur effective du parent choisi
 * (activité parente, sinon le projet). `parent` = '' pour la racine.
 */
export function useAideOtpCreation(
  projetId: number,
  lignes: LigneArbo[] | null,
  parent: string,
): string | null {
  const [projet] = useListe<OtpLecture & { id: number; code: string }>(`/api/projets/${projetId}`);
  const [activites] = useListe<(OtpLecture & { id: number; nom: string })[]>(
    `/api/projets/${projetId}/activites`,
  );
  if (parent === '') {
    return projet.statut === 'ok'
      ? aideOtp(heriteDe(projet.donnees, 'projet', projet.donnees.code))
      : null;
  }
  const a =
    activites.statut === 'ok' ? activites.donnees.find((x) => String(x.id) === parent) : null;
  const wbs = lignes?.find((l) => String(l.id) === parent)?.wbs;
  return a && wbs ? aideOtp(heriteDe(a, 'activite', `${wbs} ${a.nom}`)) : null;
}
