import type { FastifyInstance } from 'fastify';
import { exporterPlanDeCharge } from '../export/plan.js';
import { lirePlanDeCharge, type FiltreEquipe } from '../planning/plan-de-charge.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

const DEBUT = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Paramètre `equipe` : absent = toutes, « aucune », un entier ; sinon null (400). */
export function lireFiltreEquipe(equipe: unknown): FiltreEquipe | null {
  if (equipe === undefined) return { genre: 'toutes' };
  if (equipe === 'aucune') return { genre: 'aucune' };
  if (typeof equipe === 'string' && /^\d{1,15}$/.test(equipe)) {
    return { genre: 'equipe', id: Number(equipe) };
  }
  return null;
}

/** Mêmes droits, refus et ordre des refus pour la lecture et l'export (plan de charge et coûts). */
export function lireParametresPlan(
  role: string,
  query: { debut?: unknown; equipe?: unknown },
): { debut: string; filtre: FiltreEquipe } | { statut: 400 | 403; erreur: string } {
  if (role === 'ressource') return { statut: 403, erreur: 'Interdit' };
  const { debut, equipe } = query;
  const m = typeof debut === 'string' ? DEBUT.exec(debut) : null;
  const annee = m ? Number(m[1]) : 0;
  const filtre = lireFiltreEquipe(equipe);
  if (!m || annee < 2000 || annee > 2099 || filtre === null) {
    return { statut: 400, erreur: 'Données invalides' };
  }
  return { debut: debut as string, filtre };
}

/** Plan de charge (lot 6d, D-154 (2)) et son export CSV (lot 6f, D-160 (3)) : lecture seule. */
export function planDeChargeRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  type Requete = { Querystring: { debut?: unknown; equipe?: unknown } };
  app.get<Requete>('/api/plan-de-charge', { preHandler: requireUser }, async (request, reply) => {
    const user = request.user!;
    const p = lireParametresPlan(user.role, request.query);
    if ('erreur' in p) return reply.code(p.statut).send({ erreur: p.erreur });
    return lirePlanDeCharge(pool, user, p.debut, p.filtre);
  });

  app.get<Requete>(
    '/api/plan-de-charge/export',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      const p = lireParametresPlan(user.role, request.query);
      if ('erreur' in p) return reply.code(p.statut).send({ erreur: p.erreur });
      const corps = await exporterPlanDeCharge(pool, user, p.debut, p.filtre);
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="plan-de-charge-${p.debut}.csv"`)
        .send(corps);
    },
  );
}
