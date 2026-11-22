import type { FastifyInstance } from 'fastify';
import { exporterImputations } from '../export/imputations.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { lireFiltreEquipe } from './plan-de-charge.js';

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;
const JOURS_MAX = 366;

/** Jour AAAA-MM-JJ réel, année de 2000 à 2099 : nombre de jours depuis l'époque, sinon null. */
function lireJour(valeur: unknown): number | null {
  const m = typeof valeur === 'string' ? JOUR.exec(valeur) : null;
  if (!m) return null;
  const annee = Number(m[1]);
  if (annee < 2000 || annee > 2099) return null;
  const d = new Date(Date.UTC(annee, Number(m[2]) - 1, Number(m[3])));
  if (d.toISOString().slice(0, 10) !== valeur) return null;
  return d.getTime() / 86400000;
}

/** Export CSV des imputations (lot 6f, D-160 (4), D-161 (3)) : lecture seule. */
export function exportImputationsRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  app.get<{ Querystring: { du?: unknown; au?: unknown; equipe?: unknown } }>(
    '/api/imputations/export',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      if (user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
      const { du, au, equipe } = request.query;
      const debut = lireJour(du);
      const fin = lireJour(au);
      const filtre = lireFiltreEquipe(equipe);
      if (
        debut === null ||
        fin === null ||
        filtre === null ||
        fin < debut ||
        fin - debut + 1 > JOURS_MAX
      ) {
        return reply.code(400).send({ erreur: 'Données invalides' });
      }
      const corps = await exporterImputations(pool, user, du as string, au as string, filtre);
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename="imputations-${du as string}-${au as string}.csv"`,
        )
        .send(corps);
    },
  );
}
