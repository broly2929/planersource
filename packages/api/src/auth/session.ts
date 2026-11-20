import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { Config } from '../config.js';
import { toPublicUser, type UtilisateurRow } from './user.js';

export const SESSION_COOKIE = 'session';
/**
 * Sessions ouvertes avec le mot de passe d'origine (D-138 (2)) : hash des jetons, en mémoire du
 * processus. Calculé une seule fois à la connexion ; aucune vérification de hash ensuite, aucune
 * colonne. Perdu au redémarrage (le bandeau revient à la connexion suivante).
 */
export type SessionsOrigine = Set<string>;
export const SESSION_DURATION_HOURS = 12;

export type SessionUser = ReturnType<typeof toPublicUser> & { mot_de_passe_origine: boolean };

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export async function createSession(pool: pg.Pool, utilisateurId: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO session (utilisateur_id, jeton_hash) VALUES ($1, $2)', [
    utilisateurId,
    hashToken(token),
  ]);
  return token;
}

/** Supprime les sessions de plus de 12 h et leur indicateur en mémoire (D-138 (2)). */
export async function purgeExpiredSessions(pool: pg.Pool, origine: SessionsOrigine): Promise<void> {
  const { rows } = await pool.query<{ jeton_hash: string }>(
    'DELETE FROM session WHERE cree_le <= now() - make_interval(hours => $1) RETURNING jeton_hash',
    [SESSION_DURATION_HOURS],
  );
  for (const r of rows) origine.delete(r.jeton_hash);
}

export function setSessionCookie(reply: FastifyReply, config: Config, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure ?? config.nodeEnv !== 'development',
    signed: true,
    maxAge: SESSION_DURATION_HOURS * 3600,
  });
}

export function marquerOrigine(origine: SessionsOrigine, token: string, oui: boolean): void {
  if (oui) origine.add(hashToken(token));
  else origine.delete(hashToken(token));
}

function readToken(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const res = request.unsignCookie(raw);
  return res.valid ? res.value : null;
}

export async function destroySession(
  pool: pg.Pool,
  request: FastifyRequest,
  origine: SessionsOrigine,
): Promise<void> {
  const token = readToken(request);
  if (!token) return;
  origine.delete(hashToken(token));
  await pool.query('DELETE FROM session WHERE jeton_hash = $1', [hashToken(token)]);
}

/** Charge l'utilisateur de la session (valide, < 12 h, utilisateur actif), sinon null. */
export async function loadUser(
  pool: pg.Pool,
  request: FastifyRequest,
  origine: SessionsOrigine,
): Promise<SessionUser | null> {
  const token = readToken(request);
  if (!token) return null;
  const { rows } = await pool.query<UtilisateurRow>(
    `SELECT u.id, u.nom, u.login, u.email, u.initiales, u.role, u.est_ressource, u.capacite, u.actif, u.equipe_id
       FROM session s JOIN utilisateur u ON u.id = s.utilisateur_id
      WHERE s.jeton_hash = $1
        AND s.cree_le > now() - make_interval(hours => $2)
        AND u.actif`,
    [hashToken(token), SESSION_DURATION_HOURS],
  );
  const hash = hashToken(token);
  if (!rows[0]) {
    origine.delete(hash);
    return null;
  }
  return { ...toPublicUser(rows[0]), mot_de_passe_origine: origine.has(hash) };
}
