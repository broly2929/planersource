import { useAnnuaire } from '../../annuaire';
import { Chargement, Vide } from '../../components/Etat';
import { Notification } from '../../components/Notification';
import { Table } from '../../components/Table';
import { useListe } from './commun';

interface Entree {
  quand: string;
  utilisateur_id: number;
  entite: string;
  entite_id: number;
  operation: string;
  champ: string | null;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

const ABSENT = '—';

const ENTITES: Record<string, string> = {
  projet: 'projet',
  activite: 'activité',
  jalon: 'jalon',
  dependance: 'dépendance',
  assignation: 'assignation',
  affectation: 'affectation',
  calendrier: 'calendrier',
};

const OPERATIONS: Record<string, string> = {
  creation: 'création',
  modification: 'modification',
  suppression: 'suppression',
};

const deux = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-JJ HH:MM, heure locale du navigateur. */
function formaterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

function texteValeur(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return ABSENT;
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'object') return JSON.stringify(valeur);
  return String(valeur);
}

/** Valeur en texte ; les valeurs longues (JSON) sont tronquées, texte complet en infobulle. */
function Valeur({ valeur }: { valeur: unknown }) {
  const texte = texteValeur(valeur);
  return (
    <span className="block max-w-40 truncate" title={texte}>
      {texte}
    </span>
  );
}

/** Onglet « Historique » : journal des modifications du projet, du plus récent au plus ancien. */
export function HistoriqueProjet({ projetId }: { projetId: number }) {
  const annuaire = useAnnuaire();
  const [etat] = useListe<Entree[]>(`/api/projets/${projetId}/historique`);
  const nom = (id: number) => annuaire?.find((u) => u.id === id)?.nom ?? '…';

  if (etat.statut === 'chargement') return <Chargement libelle="Chargement de l’historique…" />;
  if (etat.statut === 'erreur') {
    return <Notification type="erreur">Impossible de charger l’historique.</Notification>;
  }
  if (etat.donnees.length === 0) return <Vide>Aucune modification enregistrée.</Vide>;
  return (
    <Table
      legende="Historique du projet"
      colonnes={[
        {
          titre: 'Date',
          cellule: (e) => <span className="whitespace-nowrap">{formaterDate(e.quand)}</span>,
        },
        {
          titre: 'Utilisateur',
          cellule: (e) => <span className="whitespace-nowrap">{nom(e.utilisateur_id)}</span>,
        },
        { titre: 'Entité', cellule: (e) => ENTITES[e.entite] ?? e.entite },
        { titre: 'Opération', cellule: (e) => OPERATIONS[e.operation] ?? e.operation },
        { titre: 'Champ', cellule: (e) => e.champ ?? ABSENT },
        { titre: 'Ancienne valeur', cellule: (e) => <Valeur valeur={e.ancienne_valeur} /> },
        { titre: 'Nouvelle valeur', cellule: (e) => <Valeur valeur={e.nouvelle_valeur} /> },
      ]}
      lignes={etat.donnees}
      cle={(e) => `${e.quand}-${e.entite}-${e.entite_id}-${e.champ ?? ''}-${e.operation}`}
    />
  );
}
