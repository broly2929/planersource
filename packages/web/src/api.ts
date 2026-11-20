export type Role = 'administrateur' | 'chef_de_projet' | 'ressource';

export interface Utilisateur {
  id: number | string;
  nom: string;
  login: string;
  email: string | null;
  initiales: string | null;
  role: Role;
  est_ressource: boolean;
  capacite: number;
  actif: boolean;
  calendrier_id: number;
  /** Session ouverte avec le mot de passe d'origine admin / admin (D-138 (2)), session seulement. */
  mot_de_passe_origine?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  administrateur: 'Administrateur',
  chef_de_projet: 'Chef de projet',
  ressource: 'Ressource',
};

export class ApiError extends Error {
  constructor(
    public status: number,
    /** Message d'erreur renvoyé par l'API (champ `erreur`), si présent. */
    public erreur?: string,
    /** Code et identifiants d'un refus du calcul (422), si présents. */
    public code?: string,
    public ids?: number[],
  ) {
    super(`HTTP ${status}`);
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    ...(init.body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }),
  });
  if (!response.ok) {
    const corps = (await response.json().catch(() => null)) as {
      erreur?: unknown;
      code?: unknown;
      ids?: unknown;
    } | null;
    throw new ApiError(
      response.status,
      typeof corps?.erreur === 'string' ? corps.erreur : undefined,
      typeof corps?.code === 'string' ? corps.code : undefined,
      Array.isArray(corps?.ids) ? (corps.ids as number[]) : undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
