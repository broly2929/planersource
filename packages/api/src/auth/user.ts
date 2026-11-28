export type Role = 'administrateur' | 'chef_de_projet' | 'leader_metier' | 'ressource';

/**
 * Chef de projet ou leader métier (D-265) : un leader est un chef dont la portée d'écriture est
 * tous les projets ordinaires.
 */
export function estChef(role: Role): boolean {
  return role === 'chef_de_projet' || role === 'leader_metier';
}

/** Rôle qui peut voir des montants (coûts, taux) : ni ressource, ni leader métier (D-265 (3)). */
export function roleVoitFinances(role: Role): boolean {
  return role === 'administrateur' || role === 'chef_de_projet';
}

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
  doit_changer_mot_de_passe: boolean;
}

export const USER_COLUMNS =
  'id, nom, login, email, initiales, role, est_ressource, capacite, actif, calendrier_id, equipe_id, doit_changer_mot_de_passe';

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
    doit_changer_mot_de_passe: row.doit_changer_mot_de_passe,
  };
}
