import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api';
import { FormulaireAbsence } from '../absences/FormulaireAbsence';
import {
  adresseGrille,
  bornesMois,
  boutonsMois,
  casesRessource,
  choixRessource,
  enteteJours,
  LETTRE_MOTIF,
  libelleCase,
  lignesVisibles,
  moisPrecedent,
  moisSuivant,
  nomMois,
  parametresGrille,
  type CaseJour,
  type LigneGrille,
} from '../absences/grille';
import { dateFr, type Absence, type Motif } from '../absences/logique';
import { useAuth } from '../auth';
import { Button } from '../components/Button';
import { Confirmation } from '../components/Confirmation';
import { Dialog } from '../components/Dialog';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Onglets } from '../components/Onglets';
import { Select } from '../components/Select';
import type { FiltreEquipe } from '../plan-de-charge/logique';
import { moisDe } from '../plan-de-charge/logique';
import { aujourdhuiLocal } from '../imputations/logique';
import { navigate, Redirect, useSearch } from '../router';
import type { Equipe } from './Equipes';
import { useListe } from './projet/commun';

const COULEUR_MOTIF: Record<Motif, string> = {
  conge: 'bg-accent text-white',
  formation: 'bg-success text-white',
  autre: 'bg-warning text-white',
};
const NOM_MOTIF: Record<Motif, string> = { conge: 'Congé', formation: 'Formation', autre: 'Autre' };
const TEINTE_NON_OUVRE = 'bg-gray-200';
const CASE = 'flex h-8 items-center justify-center text-petit font-semibold';

const valeurEquipe = (e: FiltreEquipe): string => (e === 'toutes' ? '' : String(e));

type Dialogue =
  { type: 'creation'; ressource: number; debut?: string } | { type: 'edition'; absence: Absence };

/** Onglet « Absences » en grille mensuelle (D-280, SPEC §4 points 25 à 29). */
export function GrilleAbsences() {
  const { etat } = useAuth();
  const moi = etat.statut === 'connecte' ? Number(etat.user.id) : null;
  const recherche = useSearch();
  const semaine = recherche.get('semaine');
  const {
    mois,
    equipe,
    ressource: ressourceParam,
    corrige,
  } = parametresGrille(recherche, moisDe(aujourdhuiLocal()));
  const { du, au } = bornesMois(mois);
  const [grille, rechargerGrille] = useListe<LigneGrille[]>(`/api/absences/grille?mois=${mois}`);
  const [absences, rechargerAbsences] = useListe<Absence[]>(`/api/absences?du=${du}&au=${au}`);
  const [equipes] = useListe<Equipe[]>('/api/equipes');
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [suppression, setSuppression] = useState<Absence | null>(null);

  const lignes = grille.statut === 'ok' ? grille.donnees : [];
  const { ressource, corrigee } = choixRessource(lignes, equipe, ressourceParam);
  const aCorriger = corrige || (grille.statut === 'ok' && corrigee);
  const adresse = (m: string, e: FiltreEquipe, r: number | null) => adresseGrille(m, e, r, semaine);
  const visibles = lignesVisibles(lignes, equipe, ressource);
  const deLEquipe = lignesVisibles(lignes, equipe, null);
  const permis = boutonsMois(mois);
  const ecrivables = lignes.filter((l) => l.peut_ecrire);

  const parRessource = useMemo(() => {
    const m = new Map<number, Absence[]>();
    if (absences.statut === 'ok')
      for (const a of absences.donnees)
        m.set(a.ressource_id, [...(m.get(a.ressource_id) ?? []), a]);
    return m;
  }, [absences]);

  const recharger = () => {
    rechargerGrille();
    rechargerAbsences();
  };
  const fermer = () => {
    setDialogue(null);
    setSuppression(null);
    recharger();
  };
  const nouvelle = () => {
    const cible = ecrivables.find((l) => l.id === moi) ?? ecrivables[0];
    if (cible) setDialogue({ type: 'creation', ressource: cible.id });
  };

  const barre = (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <Select
        label="Équipe"
        value={valeurEquipe(equipe)}
        onChange={(e) => {
          const v = e.target.value;
          const eq: FiltreEquipe = v === '' ? 'toutes' : v === 'aucune' ? 'aucune' : Number(v);
          navigate(adresse(mois, eq, choixRessource(lignes, eq, ressource).ressource));
        }}
        options={[
          { value: '', label: 'Toutes' },
          { value: 'aucune', label: 'Sans équipe' },
          ...(equipes.statut === 'ok' ? equipes.donnees : []).map((e) => ({
            value: String(e.id),
            label: e.nom,
          })),
        ]}
      />
      <Select
        label="Ressource"
        value={ressource === null ? '' : String(ressource)}
        onChange={(e) =>
          navigate(adresse(mois, equipe, e.target.value === '' ? null : Number(e.target.value)))
        }
        options={[
          { value: '', label: 'Toutes' },
          ...deLEquipe.map((l) => ({ value: String(l.id), label: l.nom })),
        ]}
      />
      <Button
        variante="secondaire"
        className="px-2!"
        disabled={!permis.precedent}
        onClick={() => navigate(adresse(moisPrecedent(mois), equipe, ressource))}
      >
        <ChevronLeft aria-hidden className="size-4" />
        Mois précédent
      </Button>
      <Button
        variante="secondaire"
        onClick={() => navigate(adresse(moisDe(aujourdhuiLocal()), equipe, ressource))}
      >
        Ce mois
      </Button>
      <Button
        variante="secondaire"
        className="px-2!"
        disabled={!permis.suivant}
        onClick={() => navigate(adresse(moisSuivant(mois), equipe, ressource))}
      >
        Mois suivant
        <ChevronRight aria-hidden className="size-4" />
      </Button>
      <Button disabled={ecrivables.length === 0} onClick={nouvelle}>
        <Plus aria-hidden className="size-4" />
        Nouvelle absence
      </Button>
    </div>
  );

  const erreur = grille.statut === 'erreur' || absences.statut === 'erreur';
  const chargement = grille.statut === 'chargement' || absences.statut === 'chargement';

  return (
    <Layout titre="Absences">
      <Onglets>
        <Redirect to={adresse(mois, equipe, ressource)} when={aCorriger} />
        <div className="flex min-w-0 flex-col gap-4">
          {barre}
          {erreur ? (
            <Notification type="erreur">Impossible de charger les absences.</Notification>
          ) : chargement ? (
            <Chargement libelle="Chargement des absences…" />
          ) : visibles.length === 0 ? (
            <Vide>Aucune ressource.</Vide>
          ) : (
            <>
              <Tableau
                mois={mois}
                lignes={visibles}
                parRessource={parRessource}
                onCreer={(r, debut) => setDialogue({ type: 'creation', ressource: r, debut })}
                onModifier={(absence) => setDialogue({ type: 'edition', absence })}
              />
              <Legende />
            </>
          )}
        </div>
        {dialogue && (
          <Dialog
            ouvert
            onOuvertChange={(o) => !o && setDialogue(null)}
            titre={dialogue.type === 'creation' ? 'Nouvelle absence' : "Modifier l'absence"}
            description={
              dialogue.type === 'creation'
                ? 'Renseignez la période, la portion et le motif.'
                : 'Modifiez la période, la portion ou le motif.'
            }
          >
            <FormulaireAbsence
              ressource={
                dialogue.type === 'creation' ? dialogue.ressource : dialogue.absence.ressource_id
              }
              absence={dialogue.type === 'edition' ? dialogue.absence : null}
              ressources={ecrivables.concat(
                dialogue.type === 'edition' &&
                  !ecrivables.some((l) => l.id === dialogue.absence.ressource_id)
                  ? lignes.filter((l) => l.id === dialogue.absence.ressource_id)
                  : [],
              )}
              debutInitial={dialogue.type === 'creation' ? dialogue.debut : undefined}
              supprimer={
                dialogue.type === 'edition' ? (
                  <Button variante="danger" onClick={() => setSuppression(dialogue.absence)}>
                    Supprimer
                  </Button>
                ) : undefined
              }
              onSucces={fermer}
              onAnnuler={() => setDialogue(null)}
            />
          </Dialog>
        )}
        {suppression && (
          <Confirmation
            alerte
            nom={`l'absence du ${dateFr(suppression.debut)}`}
            action={() => api(`/api/absences/${suppression.id}`, { method: 'DELETE' })}
            onSucces={fermer}
            onAnnuler={() => setSuppression(null)}
          />
        )}
      </Onglets>
    </Layout>
  );
}

function Tableau({
  mois,
  lignes,
  parRessource,
  onCreer,
  onModifier,
}: {
  mois: string;
  lignes: LigneGrille[];
  parRessource: Map<number, Absence[]>;
  onCreer: (ressource: number, jour: string) => void;
  onModifier: (absence: Absence) => void;
}) {
  const jours = enteteJours(mois);
  return (
    <div className="overflow-x-auto rounded-ui border border-gray-200 bg-white">
      <table
        aria-label={`Absences de ${nomMois(mois)}`}
        className="w-max border-separate border-spacing-0 text-petit"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 w-40 min-w-40 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold"
            >
              Ressource
            </th>
            {jours.map((j) => (
              <th
                key={j.jour}
                scope="col"
                className="h-10 w-7 min-w-7 border-b border-l border-gray-200 bg-gray-50 p-0 text-center font-semibold"
              >
                <span className="block">{j.numero}</span>
                <span className="block text-gray-600">{j.initiale}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const cases = casesRessource(mois, parRessource.get(l.id) ?? [], l.jours_non_ouvres);
            return (
              <tr key={l.id}>
                <th
                  scope="row"
                  title={l.nom}
                  className="sticky left-0 z-10 w-40 min-w-40 max-w-40 truncate border-b border-gray-200 bg-white px-2 py-1 text-left font-semibold"
                >
                  {l.nom}
                </th>
                {cases.map((c) => (
                  <Cellule key={c.jour} ligne={l} c={c} onCreer={onCreer} onModifier={onModifier} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cellule({
  ligne,
  c,
  onCreer,
  onModifier,
}: {
  ligne: LigneGrille;
  c: CaseJour;
  onCreer: (ressource: number, jour: string) => void;
  onModifier: (absence: Absence) => void;
}) {
  const demis: { absence: Absence; portion: 'matin' | 'apres_midi' }[] = [];
  if (c.matin) demis.push({ absence: c.matin, portion: 'matin' });
  if (c.apresMidi) demis.push({ absence: c.apresMidi, portion: 'apres_midi' });
  const vide = !c.journee && demis.length === 0;
  const elementAbsence = (
    absence: Absence,
    portion: 'journee' | 'matin' | 'apres_midi',
    largeur: string,
  ) => {
    const libelle = libelleCase(ligne.nom, absence, c.jour);
    const commun = `${CASE} ${largeur} ${COULEUR_MOTIF[absence.motif]}`;
    return ligne.peut_ecrire ? (
      <button
        key={portion}
        type="button"
        data-portion={portion}
        title={libelle}
        aria-label={libelle}
        onClick={() => onModifier(absence)}
        className={`${commun} hover:brightness-90`}
      >
        {LETTRE_MOTIF[absence.motif]}
      </button>
    ) : (
      <span key={portion} data-portion={portion} title={libelle} className={commun}>
        {LETTRE_MOTIF[absence.motif]}
      </span>
    );
  };
  return (
    <td
      data-jour={c.jour}
      {...(c.nonOuvre ? { 'data-non-ouvre': '' } : {})}
      className={`h-8 w-7 min-w-7 border-b border-l border-gray-200 p-0 ${c.nonOuvre ? TEINTE_NON_OUVRE : ''}`}
    >
      <div className="flex h-8 items-center">
        {c.journee && elementAbsence(c.journee, 'journee', 'w-full')}
        {!c.journee && c.matin && elementAbsence(c.matin, 'matin', 'w-1/2')}
        {!c.journee && !c.matin && c.apresMidi && <span className="w-1/2" aria-hidden />}
        {!c.journee && c.apresMidi && elementAbsence(c.apresMidi, 'apres_midi', 'w-1/2')}
        {vide && !c.nonOuvre && ligne.peut_ecrire && (
          <button
            type="button"
            aria-label={`${ligne.nom}, ${dateFr(c.jour)}, aucune absence`}
            onClick={() => onCreer(ligne.id, c.jour)}
            className="h-8 w-full hover:bg-accent-bg"
          />
        )}
      </div>
    </td>
  );
}

function Legende() {
  const motifs: Motif[] = ['conge', 'formation', 'autre'];
  return (
    <ul aria-label="Légende" className="flex flex-wrap gap-x-4 gap-y-1 text-petit text-gray-800">
      {motifs.map((m) => (
        <li key={m} className="flex items-center gap-1">
          <span
            aria-hidden
            className={`flex size-6 items-center justify-center rounded-ui text-petit font-semibold ${COULEUR_MOTIF[m]}`}
          >
            {LETTRE_MOTIF[m]}
          </span>
          {NOM_MOTIF[m]}
        </li>
      ))}
      <li className="flex items-center gap-1">
        <span
          aria-hidden
          className={`size-6 rounded-ui border border-gray-300 ${TEINTE_NON_OUVRE}`}
        />
        Jour non travaillé
      </li>
    </ul>
  );
}
