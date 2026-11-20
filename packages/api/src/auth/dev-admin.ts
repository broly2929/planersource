import type pg from 'pg';
import { hashPassword } from './password.js';

export interface DevAdminOptions {
  nodeEnv: string | undefined;
  devAdmin?: string | undefined;
}

export interface AdminInitialOptions extends DevAdminOptions {
  initialAdmin?: string | undefined;
}

/**
 * Insère admin / admin si la table utilisateur est vide. Login « admin », email null
 * (D-077) : n'utilise volontairement ni emailSchema ni motDePasseSchema.
 */
async function insererAdmin(pool: pg.Pool): Promise<boolean> {
  const hash = await hashPassword('admin');
  const { rowCount } = await pool.query(
    `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, actif)
     SELECT 'Administrateur', 'admin', NULL, $1, 'administrateur', true
     WHERE NOT EXISTS (SELECT 1 FROM utilisateur)`,
    [hash],
  );
  return Boolean(rowCount);
}

/**
 * Compte de développement (D-071) : admin / admin, créé seulement si NODE_ENV vaut
 * exactement « development », si DEV_ADMIN ne vaut pas « 0 » et si la table utilisateur
 * est vide.
 */
export async function creerAdminDeDeveloppement(
  pool: pg.Pool,
  options: DevAdminOptions,
  log: { warn(message: string): void },
): Promise<{ created: boolean }> {
  if (options.nodeEnv !== 'development' || options.devAdmin === '0') return { created: false };
  if (!(await insererAdmin(pool))) return { created: false };
  log.warn('Compte de développement créé : admin / admin (NODE_ENV=development, base vide)');
  return { created: true };
}

/**
 * Compte initial (D-138 (2)) : admin / admin créé au démarrage si la table utilisateur est
 * vide, quel que soit NODE_ENV, sauf INITIAL_ADMIN=0. En développement, DEV_ADMIN=0 le
 * désactive aussi (D-071 inchangé).
 */
export async function creerAdminInitial(
  pool: pg.Pool,
  options: AdminInitialOptions,
  log: { warn(message: string): void },
): Promise<{ created: boolean }> {
  if (options.initialAdmin === '0') return { created: false };
  if (options.nodeEnv === 'development') return creerAdminDeDeveloppement(pool, options, log);
  if (!(await insererAdmin(pool))) return { created: false };
  log.warn('Compte initial créé : admin / admin (base vide). Changez son mot de passe.');
  return { created: true };
}
