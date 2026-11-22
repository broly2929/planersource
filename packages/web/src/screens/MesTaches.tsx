import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import { formaterDate, formaterNombre } from '../gantt/libelles';
import { aujourdhuiLocal } from '../imputations/logique';
import { JOURS, type Calendrier } from './Calendriers';

/** Ligne de GET /api/mes-taches (lot 6b, D-148 (3)). */
interface MaTache {
  assignation_id: number;
  projet: { code: string; nom: string };
  activite: { nom: string; wbs: string };
  charge_assignee: number;
  charge_reelle: number;
  reste_a_faire: number;
  debut_planifie: string | null;
  fin_planifiee: string | null;
}

type Etat = { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; taches: MaTache[] };

const COLONNES: Colonne<MaTache>[] = [
  {
    titre: 'Projet',
    cellule: (t) => <span title={t.projet.nom}>{t.projet.code}</span>,
  },
  { titre: 'Activité', cellule: (t) => t.activite.nom },
  { titre: 'Début', cellule: (t) => formaterDate(t.debut_planifie) },
  { titre: 'Fin', cellule: (t) => formaterDate(t.fin_planifiee) },
  { titre: 'Assigné', cellule: (t) => formaterNombre(t.charge_assignee) },
  { titre: 'Réel', cellule: (t) => formaterNombre(t.charge_reelle) },
  { titre: 'Reste', cellule: (t) => formaterNombre(t.reste_a_faire) },
];

type EtatCalendrier =
  { statut: 'chargement' } | { statut: 'erreur' } | { statut: 'ok'; calendrier: Calendrier };

type Ferie = Calendrier['feries'][number];

const COLONNES_FERIES: Colonne<Ferie>[] = [
  { titre: 'Date', cellule: (f) => formaterDate(f.jour) },
  { titre: 'Libellé', cellule: (f) => f.libelle || '—' },
];

/** Section « Mon calendrier » (REX-5, D-165 (4)) : lecture seule, chargement indépendant des tâches. */
function MonCalendrier({ calendrierId }: { calendrierId: number }) {
  const [etat, setEtat] = useState<EtatCalendrier>({ statut: 'chargement' });

  useEffect(() => {
    api<Calendrier>(`/api/calendriers/${calendrierId}`)
      .then((calendrier) => setEtat({ statut: 'ok', calendrier }))
      .catch(() => setEtat({ statut: 'erreur' }));
  }, [calendrierId]);

  const aujourdhui = aujourdhuiLocal();
  const calendrier = etat.statut === 'ok' ? etat.calendrier : null;
  const feries = (calendrier?.feries ?? [])
    .filter((f) => f.jour >= aujourdhui)
    .sort((a, b) => (a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0));
  const jours = [...(calendrier?.jours_travailles ?? [])]
    .sort((a, b) => a - b)
    .map((n) => JOURS[n - 1]?.toLowerCase())
    .join(', ');

  return (
    <section aria-labelledby="mon-calendrier" className="mt-6 flex flex-col gap-3">
      <h2 id="mon-calendrier" className="font-semibold">
        Mon calendrier
      </h2>
      {etat.statut === 'chargement' && <Chargement libelle="Chargement de votre calendrier…" />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger votre calendrier.</Notification>
      )}
      {calendrier && (
        <>
          <p className="font-semibold">{calendrier.nom}</p>
          <p className="text-gray-700">{`Jours travaillés : ${jours}`}</p>
          {feries.length === 0 ? (
            <Vide>Aucun jour férié à venir.</Vide>
          ) : (
            <Table
              legende="Jours fériés à venir"
              colonnes={COLONNES_FERIES}
              lignes={feries}
              cle={(f) => f.jour}
            />
          )}
        </>
      )}
    </section>
  );
}

/** Écran « Mes tâches » (lot 6b, D-148 (4)) : les assignations ouvertes de l'utilisateur, en lecture seule. */
export function MesTaches() {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const { etat: session } = useAuth();
  const calendrierId = session.statut === 'connecte' ? session.user.calendrier_id : null;

  useEffect(() => {
    api<MaTache[]>('/api/mes-taches')
      .then((taches) => setEtat({ statut: 'ok', taches }))
      .catch(() => setEtat({ statut: 'erreur' }));
  }, []);

  return (
    <Layout titre="Mes tâches">
      {etat.statut === 'chargement' && <Chargement libelle="Chargement de vos tâches…" />}
      {etat.statut === 'erreur' && (
        <Notification type="erreur">Impossible de charger vos tâches.</Notification>
      )}
      {etat.statut === 'ok' &&
        (etat.taches.length === 0 ? (
          <Vide>Aucune tâche en cours.</Vide>
        ) : (
          <Table
            legende="Mes tâches"
            colonnes={COLONNES}
            lignes={etat.taches}
            cle={(t) => t.assignation_id}
          />
        ))}
      {calendrierId !== null && <MonCalendrier calendrierId={calendrierId} />}
    </Layout>
  );
}
