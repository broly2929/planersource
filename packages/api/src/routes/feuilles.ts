import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant } from '../planning/acces.js';
import {
  agir,
  ajouter,
  ecrireFeuille,
  lireFeuille,
  listeValidations,
  lundiValide,
  type Verbe,
} from '../planning/feuilles.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { invalide } from './erreurs-planning.js';

/** Lot 4a (D-118, D-119) : feuilles de temps, imputations, cycle de validation. */

/** Au plus deux décimales (comparaison en centièmes, sans erreur de flottant). */
const centiemes = (x: number) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6;

const imputation = z.strictObject({
  jour: z.iso.date(),
  charge: z.number().min(0).max(10).refine(centiemes),
});
const ligne = z.strictObject({
  assignation_id: z.number().int().min(1).max(2147483647),
  imputations: z.array(imputation),
  reste: z.number().min(0).max(999999.99).refine(centiemes).optional(),
});
const corps = z.strictObject({ lignes: z.array(ligne) });
const corpsRejet = z.strictObject({ commentaire: z.string().trim().min(1).max(500) });

const introuvable = { erreur: 'Feuille introuvable' };

export function feuillesRoutes(app: FastifyInstance, { pool, aujourdhui }: AppDeps): void {
  const opts = { preHandler: requireUser };
  const jourDuServeur = aujourdhui ?? (() => new Date().toISOString().slice(0, 10));
  type Q = { Querystring: { semaine?: string; ressource_id?: string } };

  app.get<Q>('/api/feuilles', opts, async (request, reply) => {
    const { semaine, ressource_id: brut } = request.query;
    if (!lundiValide(semaine)) return reply.code(400).send(invalide);
    let ressourceId: number | undefined;
    if (brut !== undefined) {
      const id = identifiant(brut);
      if (id === null) return reply.code(404).send(introuvable);
      ressourceId = id;
    }
    const r = await lireFeuille(pool, request.user!, semaine, ressourceId);
    if ('verdict' in r) return reply.code(404).send(introuvable);
    return r;
  });

  app.put<Q>('/api/feuilles', opts, async (request, reply) => {
    const { semaine, ressource_id: brut } = request.query;
    const b = corps.safeParse(request.body);
    if (!lundiValide(semaine) || !b.success) return reply.code(400).send(invalide);
    const jours = new Set([0, 1, 2, 3, 4, 5, 6].map((k) => ajouter(semaine, k)));
    const assignations = new Set<number>();
    for (const l of b.data.lignes) {
      if (assignations.has(l.assignation_id)) return reply.code(400).send(invalide);
      assignations.add(l.assignation_id);
      const vus = new Set<string>();
      for (const i of l.imputations) {
        if (!jours.has(i.jour) || vus.has(i.jour)) return reply.code(400).send(invalide);
        vus.add(i.jour);
      }
    }
    let ressourceId: number | undefined;
    if (brut !== undefined) {
      const id = identifiant(brut);
      if (id === null) return reply.code(404).send(introuvable);
      ressourceId = id;
    }
    const r = await transaction(pool, (db) =>
      ecrireFeuille(db, request.user!, semaine, b.data.lignes, jourDuServeur(), ressourceId),
    );
    if ('verdict' in r) {
      return r.verdict === 'introuvable'
        ? reply.code(404).send(introuvable)
        : reply.code(403).send({ erreur: 'Interdit' });
    }
    if ('code' in r) return reply.code(422).send(r);
    return r;
  });

  for (const verbe of ['soumettre', 'rappeler', 'valider', 'rejeter', 'devalider'] as Verbe[]) {
    app.post<{ Params: { id: string } }>(
      `/api/feuilles/:id/${verbe}`,
      opts,
      async (request, reply) => {
        const id = identifiant(request.params.id);
        if (id === null) return reply.code(404).send(introuvable);
        const c = verbe === 'rejeter' ? corpsRejet.safeParse(request.body) : null;
        const r = await transaction(pool, (db) =>
          agir(
            db,
            request.user!,
            id,
            verbe,
            jourDuServeur(),
            c?.success ? c.data.commentaire : null,
            c === null || c.success,
          ),
        );
        if ('invalide' in r) return reply.code(400).send(invalide);
        if ('verdict' in r) {
          return r.verdict === 'introuvable'
            ? reply.code(404).send(introuvable)
            : reply.code(403).send({ erreur: 'Interdit' });
        }
        if ('code' in r) return reply.code(422).send(r);
        return r;
      },
    );
  }

  app.get<Q>('/api/validations', opts, async (request, reply) => {
    const { semaine } = request.query;
    if (!lundiValide(semaine)) return reply.code(400).send(invalide);
    return listeValidations(pool, request.user!, semaine);
  });
}
