import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Limiteur } from '../auth/limiteur.js';
import { hashDeSubstitution } from '../auth/password.js';
import {
  createSession,
  destroySession,
  fermerAutresSessions,
  oublierOrigine,
  marquerOrigine,
  purgeExpiredSessions,
  setSessionCookie,
} from '../auth/session.js';
import type { SessionsOrigine } from '../auth/session.js';
import { toPublicUser, USER_COLUMNS, type UtilisateurRow } from '../auth/user.js';
import { hashPassword } from '../auth/password.js';
import type { AppDeps } from '../app.js';

// Clé `identifiant`, ou `email` comme synonyme (D-077 5) ; comparée au login seul.
const loginBody = z
  .object({
    identifiant: z.string().optional(),
    email: z.string().optional(),
    mot_de_passe: z.string().min(1),
  })
  .transform((b) => ({
    identifiant: (b.identifiant ?? b.email ?? '').trim().toLowerCase(),
    mot_de_passe: b.mot_de_passe,
  }))
  .refine((b) => b.identifiant !== '');

const changementBody = z.object({ actuel: z.string(), nouveau: z.string().min(1) });

export function authRoutes(
  app: FastifyInstance,
  { pool, config }: AppDeps,
  sessionsOrigine: SessionsOrigine,
  limiteur: Limiteur,
  verifier: (hash: string, motDePasse: string) => Promise<boolean>,
): void {
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginBody.safeParse(request.body);
    if (!body.success) return reply.code(401).send({ erreur: 'Identifiants invalides' });
    const { identifiant, mot_de_passe } = body.data;
    const ip = request.ip;
    const verdict = limiteur.verifier(ip, identifiant);
    if (verdict.bloque) {
      return reply
        .code(429)
        .header('Retry-After', String(verdict.retryAfter))
        .send({ erreur: 'Trop de tentatives' });
    }
    const { rows } = await pool.query<UtilisateurRow & { mot_de_passe_hash: string }>(
      `SELECT ${USER_COLUMNS}, mot_de_passe_hash FROM utilisateur WHERE login = $1 AND actif`,
      [identifiant],
    );
    const row = rows[0];
    // Temps constant (D-140 (2)) : une vérification dans tous les cas, contre un hash factice si besoin.
    const valide = await verifier(
      row?.mot_de_passe_hash ?? (await hashDeSubstitution()),
      mot_de_passe,
    );
    if (!row || !valide) {
      limiteur.echec(ip, identifiant);
      return reply.code(401).send({ erreur: 'Identifiants invalides' });
    }
    limiteur.succes(ip, identifiant);
    await purgeExpiredSessions(pool, sessionsOrigine);
    const token = await createSession(pool, row.id);
    setSessionCookie(reply, config, token);
    // Mot de passe d'origine (D-138 (2)) : comparé en clair, une seule fois, à la connexion.
    const origine =
      row.role === 'administrateur' && row.login === 'admin' && body.data.mot_de_passe === 'admin';
    marquerOrigine(sessionsOrigine, token, origine);
    return { ...toPublicUser(row), mot_de_passe_origine: origine };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    await destroySession(pool, request, sessionsOrigine);
    reply.clearCookie('session', { path: '/' });
    return reply.code(204).send();
  });

  // Changement de son propre mot de passe (D-254, SPEC §8 point 4).
  app.post('/api/auth/mot-de-passe', async (request, reply) => {
    const moi = request.user;
    if (!moi) return reply.code(401).send({ erreur: 'Non authentifié' });
    const body = changementBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const { actuel, nouveau } = body.data;
    const ip = request.ip;
    const cle = `mot-de-passe:${moi.id}`;
    const verdict = limiteur.verifier(ip, cle);
    if (verdict.bloque) {
      return reply
        .code(429)
        .header('Retry-After', String(verdict.retryAfter))
        .send({ erreur: 'Trop de tentatives' });
    }
    const { rows } = await pool.query<{ mot_de_passe_hash: string }>(
      'SELECT mot_de_passe_hash FROM utilisateur WHERE id = $1',
      [moi.id],
    );
    if (!rows[0] || !(await verifier(rows[0].mot_de_passe_hash, actuel))) {
      limiteur.echec(ip, cle);
      return reply.code(400).send({ erreur: 'Mot de passe actuel incorrect' });
    }
    if (nouveau === actuel) {
      return reply
        .code(400)
        .send({ erreur: "Le nouveau mot de passe doit être différent de l'actuel" });
    }
    limiteur.succes(ip, cle);
    const hash = await hashPassword(nouveau);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE utilisateur SET mot_de_passe_hash = $2, doit_changer_mot_de_passe = false WHERE id = $1',
        [moi.id, hash],
      );
      await fermerAutresSessions(client, request, sessionsOrigine, moi.id);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    oublierOrigine(request, sessionsOrigine);
    return reply.code(204).send();
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
    return request.user;
  });
}
