import { useEffect, useState } from 'react';
import { api } from '../api';
import { Chargement, Vide } from '../components/Etat';
import { Layout } from '../components/Layout';
import { Notification } from '../components/Notification';
import { Table, type Colonne } from '../components/Table';
import { formaterDate, formaterNombre } from '../gantt/libelles';

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

/** Écran « Mes tâches » (lot 6b, D-148 (4)) : les assignations ouvertes de l'utilisateur, en lecture seule. */
export function MesTaches() {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });

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
    </Layout>
  );
}
