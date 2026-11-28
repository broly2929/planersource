import { useAuth } from './auth';

/** Leader métier (SPEC §2, D-265) : écrit les projets ordinaires mais ne voit ni vente, ni marge, ni coûts, ni taux. */
export function useEstLeader(): boolean {
  const { etat } = useAuth();
  return etat.statut === 'connecte' && etat.user.role === 'leader_metier';
}

/** Identifiant de l'utilisateur connecté, sauf l'administrateur (D-274 : l'administrateur agit sur sa propre feuille et son propre taux). */
export function useIdNonAdmin(): number | null {
  const { etat } = useAuth();
  return etat.statut === 'connecte' && etat.user.role !== 'administrateur'
    ? Number(etat.user.id)
    : null;
}
