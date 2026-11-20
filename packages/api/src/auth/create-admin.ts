import type pg from 'pg';
import { hashPassword } from './password.js';
import { emailSchema, loginSchema, motDePasseSchema } from './schemas.js';

export interface CreateAdminInput {
  nom: string;
  login?: string | undefined;
  email?: string | undefined;
  motDePasse: string;
}

/**
 * Crée un administrateur actif. Erreur (rien n'est créé) si l'email est mal formé,
 * si le mot de passe est vide, si ni login ni email n'est donné, ou si le login ou l'email est déjà utilisé.
 */
export async function createAdmin(
  pool: pg.Pool,
  input: CreateAdminInput,
): Promise<{ created: boolean }> {
  const emailBrut = input.email?.trim() ?? '';
  let email: string | null = null;
  if (emailBrut !== '') {
    const emailRes = emailSchema.safeParse(emailBrut);
    if (!emailRes.success) throw new Error(`Email mal formé : ${input.email}`);
    email = emailRes.data;
  }
  const loginRes = loginSchema.safeParse(input.login ?? email ?? '');
  if (!loginRes.success) throw new Error('Renseignez un identifiant ou un email');
  const login = loginRes.data;
  if (!motDePasseSchema.safeParse(input.motDePasse).success) {
    throw new Error('Mot de passe vide');
  }
  const hash = await hashPassword(input.motDePasse);
  try {
    await pool.query(
      `INSERT INTO utilisateur (nom, login, email, mot_de_passe_hash, role, actif)
       VALUES ($1, $2, $3, $4, 'administrateur', true)`,
      [input.nom, login, email, hash],
    );
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      if ((err as { constraint?: string }).constraint === 'utilisateur_login_unique') {
        throw new Error(`Identifiant déjà utilisé : ${login}`);
      }
      throw new Error(`Email déjà utilisé : ${email}`);
    }
    throw err;
  }
  return { created: true };
}
