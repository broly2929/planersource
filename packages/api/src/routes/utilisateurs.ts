import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { estReference } from '../db/erreurs.js';
import { hashPassword } from '../auth/password.js';
import { emailSchema, initialesSchema, loginSchema, motDePasseSchema } from '../auth/schemas.js';
import { toPublicUser, USER_COLUMNS, type UtilisateurRow } from '../auth/user.js';
import { idCorps, identifiant } from '../planning/identifiant.js';
import type { SessionsOrigine } from '../auth/session.js';
import type { AppDeps } from '../app.js';

const roles = z.enum(['administrateur', 'chef_de_projet', 'ressource']);

const createBody = z.object({
  nom: z.string().min(1),
  login: loginSchema.optional(),
  email: emailSchema.nullable().optional(),
  initiales: initialesSchema.optional(),
  mot_de_passe: motDePasseSchema,
  role: roles,
  est_ressource: z.boolean().default(false),
  capacite: z.number().positive().default(1),
  actif: z.boolean().default(true),
  calendrier_id: idCorps.optional(),
});

const patchBody = z
  .object({
    nom: z.string().min(1),
    login: loginSchema,
    email: emailSchema.nullable(),
    initiales: initialesSchema,
    mot_de_passe: motDePasseSchema,
    role: roles,
    est_ressource: z.boolean(),
    capacite: z.number().positive(),
    actif: z.boolean(),
    calendrier_id: idCorps,
  })
  .partial();

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) return reply.code(401).send({ erreur: 'Non authentifié' });
  if (request.user.role !== 'administrateur') return reply.code(403).send({ erreur: 'Interdit' });
}

const isDuplicate = (err: unknown) => (err as { code?: string }).code === '23505';

/** 409 distingué par la contrainte violée (D-077 8). */
const messageDoublon = (err: unknown) =>
  (err as { constraint?: string }).constraint === 'utilisateur_login_unique'
    ? 'Identifiant déjà utilisé'
    : 'Email déjà utilisé';

export function utilisateursRoutes(
  app: FastifyInstance,
  { pool }: AppDeps,
  sessionsOrigine: SessionsOrigine,
): void {
  const opts = { preHandler: requireAdmin };

  app.get('/api/utilisateurs', opts, async () => {
    const { rows } = await pool.query<UtilisateurRow>(
      `SELECT ${USER_COLUMNS} FROM utilisateur ORDER BY id`,
    );
    return rows.map(toPublicUser);
  });

  app.post('/api/utilisateurs', opts, async (request, reply) => {
    const body = createBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const d = body.data;
    const login = d.login ?? d.email;
    if (!login) return reply.code(400).send({ erreur: 'Renseignez un identifiant ou un email' });
    try {
      const { rows } = await pool.query<UtilisateurRow>(
        `INSERT INTO utilisateur (nom, login, email, initiales, mot_de_passe_hash, role, est_ressource, capacite, actif, calendrier_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${USER_COLUMNS}`,
        [
          d.nom,
          login,
          d.email ?? null,
          d.initiales ?? null,
          await hashPassword(d.mot_de_passe),
          d.role,
          d.est_ressource,
          d.capacite,
          d.actif,
          d.calendrier_id ?? null,
        ],
      );
      return reply.code(201).send(toPublicUser(rows[0]!));
    } catch (err) {
      if (isDuplicate(err)) return reply.code(409).send({ erreur: messageDoublon(err) });
      if (estReference(err)) return reply.code(422).send({ erreur: 'Calendrier inconnu' });
      throw err;
    }
  });

  app.patch<{ Params: { id: string } }>('/api/utilisateurs/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    if (id === null) return reply.code(404).send({ erreur: 'Utilisateur introuvable' });
    const body = patchBody.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const { mot_de_passe, ...champs } = body.data;
    const values: Record<string, unknown> = { ...champs };
    if (mot_de_passe !== undefined) values.mot_de_passe_hash = await hashPassword(mot_de_passe);
    const keys = Object.keys(values);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Verrou sur les administrateurs actifs : sérialise les modifications concurrentes.
      const admins = await client.query(
        "SELECT id FROM utilisateur WHERE role = 'administrateur' AND actif ORDER BY id FOR UPDATE",
      );
      const cible = await client.query<UtilisateurRow>(
        `SELECT ${USER_COLUMNS} FROM utilisateur WHERE id = $1 FOR UPDATE`,
        [id],
      );
      const avant = cible.rows[0];
      if (!avant) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ erreur: 'Utilisateur introuvable' });
      }
      const desactive = champs.actif === false && avant.actif;
      const roleChange = champs.role !== undefined && champs.role !== avant.role;
      if (id === request.user?.id && (desactive || roleChange)) {
        await client.query('ROLLBACK');
        return reply
          .code(409)
          .send({ erreur: 'Un administrateur ne peut ni se désactiver ni changer son rôle' });
      }
      if (champs.est_ressource === false && avant.est_ressource) {
        const affecte = await client.query(
          'SELECT 1 FROM affectation_projet WHERE ressource_id = $1 LIMIT 1',
          [id],
        );
        if (affecte.rowCount) {
          await client.query('ROLLBACK');
          return reply
            .code(409)
            .send({ erreur: 'Utilisateur affecté à des projets : il reste ressource' });
        }
      }
      const perdAdmin = avant.role === 'administrateur' && avant.actif && (desactive || roleChange);
      if (perdAdmin && (admins.rowCount ?? 0) <= 1) {
        await client.query('ROLLBACK');
        return reply.code(409).send({ erreur: 'Il doit rester un administrateur actif' });
      }
      let row = avant;
      if (keys.length) {
        const res = await client.query<UtilisateurRow>(
          `UPDATE utilisateur SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}
            WHERE id = $1 RETURNING ${USER_COLUMNS}`,
          [id, ...keys.map((k) => values[k])],
        );
        row = res.rows[0]!;
      }
      if (mot_de_passe !== undefined || roleChange || desactive) {
        const supprimees = await client.query<{ jeton_hash: string }>(
          'DELETE FROM session WHERE utilisateur_id = $1 RETURNING jeton_hash',
          [id],
        );
        for (const s of supprimees.rows) sessionsOrigine.delete(s.jeton_hash);
      }
      await client.query('COMMIT');
      return toPublicUser(row);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (isDuplicate(err)) return reply.code(409).send({ erreur: messageDoublon(err) });
      if (estReference(err)) return reply.code(422).send({ erreur: 'Calendrier inconnu' });
      throw err;
    } finally {
      client.release();
    }
  });
}
