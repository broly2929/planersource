import { useMemo } from 'react';
import { joursAbsenceJournee, type Absence } from '../absences/logique';
import { Chargement, Vide } from '../components/Etat';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import {
  celluleActivite,
  celluleProjet,
  nomLigneRessource,
  type LigneRessource,
} from '../accueil/logique';
import { BoutonsZoom } from '../gantt/BoutonsZoom';
import { Drapeaux } from '../gantt/Drapeaux';
import { dateLocale, lireZoom } from '../gantt/echelle';
import {
  DispositionGantt,
  MenuColonnes,
  poigneeColonne,
  useDispositionGantt,
} from '../gantt/DispositionGantt';
import { GanttSvg, type ElementGantt, type LigneSvg } from '../gantt/GanttSvg';
import {
  CLASSE_CELLULE_DRAPEAUX,
  CLASSE_ENTETE_DRAPEAUX,
  CLASSE_NOM_MAX_RESSOURCE,
} from '../gantt/largeurs';
import { formaterDate, formaterNombre } from '../gantt/libelles';
import { calculerPlage, etendrePlage } from '../gantt/plage';
import { useLargeur } from '../gantt/useLargeur';
import { Link, usePath, useSearch } from '../router';
import { useListe } from './projet/commun';

interface Planning {
  ressource: { id: number; nom: string; actif: boolean };
  lignes: LigneRessource[];
}

/** Ligne du planning rendue comme une activité à barre pleine (accent, ou grise si masquée). */
function elementDe(l: LigneRessource): ElementGantt {
  return {
    id: l.assignation_id,
    type: 'activite',
    parent_id: null,
    rang: 0,
    wbs: l.activite?.wbs ?? '',
    nom: nomLigneRessource(l),
    drapeaux: l.drapeaux,
    debut_planifie: l.debut_planifie,
    fin_planifiee: l.fin_planifiee,
    plein: l.projet ? 'accent' : 'gris',
  };
}

/** Planning d'une ressource sur l'Accueil (lot 6e, D-157 (6)) : lecture seule. */
export function PlanningRessource({ id }: { id: number }) {
  const [etat] = useListe<Planning>(`/api/ressources/${id}/planning`);
  const [etatAbsences] = useListe<Absence[]>(`/api/absences?ressource_id=${id}`);
  const chemin = usePath();
  const zoom = lireZoom(useSearch().get('zoom'));
  const [aujourdhui] = useMemo(() => [dateLocale(new Date())], []);
  const [largeurSvg, zoneSvg] = useLargeur();
  const disposition = useDispositionGantt('ressource', { vendu: false });
  const lignes = etat.statut === 'ok' ? etat.donnees.lignes : [];
  const datees = lignes.filter((l) => l.debut_planifie && l.fin_planifiee);
  const plage = useMemo(
    () =>
      etendrePlage(
        calculerPlage({
          debutProjet: null,
          jours: datees.flatMap((l) => [l.debut_planifie!, l.fin_planifiee!]),
          aujourdhui,
        }),
        largeurSvg,
        zoom,
      ),
    [datees, aujourdhui, largeurSvg, zoom],
  );

  // Absences en journée entière dans la plage affichée ; une lecture en échec ne bloque pas le planning.
  const absences = useMemo(
    () =>
      etatAbsences.statut === 'ok'
        ? joursAbsenceJournee(etatAbsences.donnees, plage.debut, plage.fin)
        : undefined,
    [etatAbsences, plage],
  );

  if (etat.statut === 'chargement') return <Chargement libelle="Chargement du planning…" />;
  if (etat.statut === 'erreur') {
    return (
      <Notification type="erreur">Impossible de charger le planning de la ressource.</Notification>
    );
  }
  if (lignes.length === 0) return <Vide>Aucune tâche pour cette ressource.</Vide>;

  // Colonnes resserrées (un pas de marge, sauf Drapeaux) : le tableau tient dans les 4/5 à 1024 px.
  const resserrer = (
    cols: (Colonne<LigneRessource> & { id: string })[],
  ): (Colonne<LigneRessource> & { id: string })[] =>
    cols.map((c) => (c.id === 'drapeaux' ? c : { ...c, serree: true }));
  const colonnes = disposition.colonnes(
    resserrer([
      {
        id: 'projet',
        titre: 'Projet',
        cellule: (l) =>
          l.projet ? (
            <Link
              to={`/projets/${l.projet.id}`}
              title={l.projet.nom}
              className="text-accent underline"
            >
              {celluleProjet(l)}
            </Link>
          ) : (
            <span className="text-gray-700">{celluleProjet(l)}</span>
          ),
      },
      {
        id: 'activite',
        titre: 'Activité',
        cellule: (l) => (
          <span title={celluleActivite(l)} className={`block ${CLASSE_NOM_MAX_RESSOURCE} truncate`}>
            {celluleActivite(l)}
          </span>
        ),
      },
      { id: 'debut', titre: 'Début', cellule: (l) => formaterDate(l.debut_planifie) },
      { id: 'fin', titre: 'Fin', cellule: (l) => formaterDate(l.fin_planifiee) },
      { id: 'assigne', titre: 'Assigné', cellule: (l) => formaterNombre(l.charge_assignee) },
      { id: 'reel', titre: 'Réel', cellule: (l) => formaterNombre(l.charge_reelle) },
      { id: 'reste', titre: 'Reste', cellule: (l) => formaterNombre(l.reste_a_faire) },
      {
        id: 'drapeaux',
        titre: 'Drapeaux',
        classeEntete: CLASSE_ENTETE_DRAPEAUX,
        classeCellule: CLASSE_CELLULE_DRAPEAUX,
        cellule: (l) => (l.drapeaux.length > 0 ? <Drapeaux drapeaux={l.drapeaux} /> : null),
      },
    ]),
  );
  const lignesSvg: LigneSvg[] = lignes.map((l) => ({ genre: 'element', element: elementDe(l) }));

  return (
    <section aria-label="Planning de la ressource" className="flex flex-col gap-4">
      {datees.length === 0 && (
        <Notification type="info">
          Planning non calculé : aucune date planifiée pour les tâches affichées.
        </Notification>
      )}
      <div className="flex items-center gap-4">
        <BoutonsZoom zoom={zoom} chemin={chemin} />
        <MenuColonnes etat={disposition} />
      </div>
      <DispositionGantt
        etat={disposition}
        propsTableau={{ 'aria-label': 'Tableau du planning de la ressource' }}
        propsCalendrier={{ ref: zoneSvg, 'aria-label': 'Calendrier du planning de la ressource' }}
        tableau={
          <Table
            compact
            legende="Tâches de la ressource"
            colonnes={colonnes}
            lignes={lignes}
            cle={(l) => l.assignation_id}
            poigneeLargeur={poigneeColonne(disposition)}
          />
        }
        calendrier={
          <GanttSvg
            lignes={lignesSvg}
            dependances={[]}
            plage={plage}
            zoom={zoom}
            aujourdhui={aujourdhui}
            absences={absences}
          />
        }
      />
    </section>
  );
}
