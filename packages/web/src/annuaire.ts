import { useEffect, useState } from 'react';
import { api, type Role } from './api';

export interface EntreeAnnuaire {
  id: number;
  nom: string;
  role: Role;
  est_ressource: boolean;
  actif: boolean;
}

/** Annuaire des utilisateurs (GET /api/annuaire) ; `null` tant qu'il est chargé ou en échec. */
export function useAnnuaire(): EntreeAnnuaire[] | null {
  const [annuaire, setAnnuaire] = useState<EntreeAnnuaire[] | null>(null);
  useEffect(() => {
    let annule = false;
    api<EntreeAnnuaire[]>('/api/annuaire')
      .then((donnees) => !annule && setAnnuaire(donnees))
      .catch(() => !annule && setAnnuaire(null));
    return () => {
      annule = true;
    };
  }, []);
  return annuaire;
}
