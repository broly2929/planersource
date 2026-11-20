import { api } from '../api';

interface NomsAssignation {
  activite: string;
  ressource: string;
}

/** Noms d'activité et de ressource des assignations des projets calculés (routes de lecture existantes). */
export async function nomsAssignations(projets: number[]): Promise<Map<number, NomsAssignation>> {
  const noms = new Map<number, NomsAssignation>();
  const annuaire = await api<{ id: number; nom: string }[]>('/api/annuaire').catch(() => []);
  const ressources = new Map(annuaire.map((u) => [u.id, u.nom]));
  for (const id of projets) {
    try {
      const [assignations, gantt] = await Promise.all([
        api<{ id: number; activite_id: number; ressource_id: number }[]>(
          `/api/projets/${id}/assignations`,
        ),
        api<{ elements: { id: number; nom: string }[] }>(`/api/projets/${id}/gantt`),
      ]);
      const activites = new Map(gantt.elements.map((e) => [e.id, e.nom]));
      for (const a of assignations) {
        const activite = activites.get(a.activite_id);
        const ressource = ressources.get(a.ressource_id);
        if (activite && ressource) noms.set(a.id, { activite, ressource });
      }
    } catch {
      // noms introuvables : l'avertissement porte alors « assignation <id> »
    }
  }
  return noms;
}
