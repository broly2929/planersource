export type Role = 'administrateur' | 'chef_de_projet' | 'ressource';

export interface UtilisateurRow {
  id: number;
  nom: string;
  login: string;
  email: string | null;
  initiales: string | null;
  role: Role;
  est_ressource: boolean;
  capacite: string;
  actif: boolean;
  calendrier_id: number;
  equipe_id: number | null;
}

export const USER_COLUMNS =
  'id, nom, login, email, initiales, role, est_ressource, capacite, actif, calendrier_id, equipe_id';

/** Représentation publique : jamais le mot de passe haché. */
export function toPublicUser(row: UtilisateurRow) {
  return {
    id: row.id,
    nom: row.nom,
    login: row.login,
    email: row.email,
    initiales: row.initiales,
    role: row.role,
    est_ressource: row.est_ressource,
    capacite: Number(row.capacite),
    actif: row.actif,
    calendrier_id: row.calendrier_id,
    equipe_id: row.equipe_id,
  };
}
