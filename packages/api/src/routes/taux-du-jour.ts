import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { lireTauxRessources, resoudreTaux, ressourcesEnPortee } from '../planning/taux.js';
import type { AppDeps } from '../app.js';
import { requireFinances } from './acces.js';

const requete = z.strictObject({ date: z.iso.date() });

/** Taux du jour (SPEC §12.6 point 8, D-258) : lecture seule, une seule lecture des taux. */
export function tauxDuJourRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get('/api/taux/du-jour', { preHandler: requireFinances }, async (request, reply) => {
    const user = request.user!;
    const query = requete.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM utilisateur WHERE est_ressource ORDER BY id',
    );
    let ids = rows.map((r) => r.id);
    if (user.role !== 'administrateur') {
      const portee = await ressourcesEnPortee(pool, user, ids);
      ids = ids.filter((id) => portee.has(id));
    }
    const taux = await lireTauxRessources(pool, ids);
    return ids.map((id) => {
      const t = taux.get(id)!;
      const r = resoudreTaux(t.propres, t.equipe, query.data.date);
      return { utilisateur_id: id, montant: r?.montant ?? null, source: r?.source ?? null };
    });
  });
}
