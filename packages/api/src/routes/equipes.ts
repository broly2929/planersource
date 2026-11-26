import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { estDoublon, estReference } from '../db/erreurs.js';
import { identifiant } from '../planning/identifiant.js';
import type { AppDeps } from '../app.js';
import { requireAdmin, requireUser } from './acces.js';

/** Équipes (lot 6a, D-147 (2), (3)) : non historisées, jamais affectées ni assignées. */
const corps = z.strictObject({ nom: z.string().trim().min(1).max(100) });

interface EquipeRow {
  id: number;
  nom: string;
}

export function equipesRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const lecture = { preHandler: requireUser };
  const ecriture = { preHandler: requireAdmin };
  const invalide = { erreur: 'Données invalides' };
  const introuvable = { erreur: 'Équipe introuvable' };
  const doublon = { erreur: 'Équipe déjà existante' };

  app.get('/api/equipes', lecture, async () => {
    const { rows } = await pool.query<EquipeRow>(
      'SELECT id, nom FROM equipe ORDER BY lower(nom), nom, id',
    );
    return rows;
  });

  app.post('/api/equipes', ecriture, async (request, reply) => {
    const body = corps.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    try {
      const { rows } = await pool.query<EquipeRow>(
        'INSERT INTO equipe (nom) VALUES ($1) RETURNING id, nom',
        [body.data.nom],
      );
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (estDoublon(err)) return reply.code(409).send(doublon);
      throw err;
    }
  });

  app.patch<{ Params: { id: string } }>('/api/equipes/:id', ecriture, async (request, reply) => {
    const id = identifiant(request.params.id);
    if (id === null) return reply.code(404).send(introuvable);
    const existe = await pool.query('SELECT 1 FROM equipe WHERE id = $1', [id]);
    if (!existe.rowCount) return reply.code(404).send(introuvable);
    const body = corps.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    try {
      const { rows } = await pool.query<EquipeRow>(
        'UPDATE equipe SET nom = $2 WHERE id = $1 RETURNING id, nom',
        [id, body.data.nom],
      );
      return rows[0] ?? reply.code(404).send(introuvable);
    } catch (err) {
      if (estDoublon(err)) return reply.code(409).send(doublon);
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/api/equipes/:id', ecriture, async (request, reply) => {
    const id = identifiant(request.params.id);
    if (id === null) return reply.code(404).send(introuvable);
    try {
      const res = await pool.query('DELETE FROM equipe WHERE id = $1', [id]);
      if (!res.rowCount) return reply.code(404).send(introuvable);
      return reply.code(204).send();
    } catch (err) {
      if (estReference(err)) {
        // Membres d'abord (refus existant), puis taux d'équipe (§12.6 point 7) ; rien n'est écrit.
        const membres = await pool.query('SELECT 1 FROM utilisateur WHERE equipe_id = $1', [id]);
        if (!membres.rowCount) {
          return reply.code(409).send({ erreur: 'Équipe avec des taux' });
        }
        return reply.code(409).send({ erreur: 'Équipe utilisée : suppression refusée' });
      }
      throw err;
    }
  });
}
