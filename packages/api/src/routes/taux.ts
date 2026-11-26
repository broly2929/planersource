import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant } from '../planning/identifiant.js';
import {
  chefLitTaux,
  lireUnTaux,
  creerTaux,
  lireRessource,
  lireTaux,
  modifierTaux,
  RefusTaux,
  supprimerTaux,
} from '../planning/taux.js';
import type { AppDeps } from '../app.js';
import { requireNonRessource, requireUser } from './acces.js';

// Montant en euros (§12.1 point 2) : > 0, au plus 999999,99, deux décimales au plus exactement.
const montant = z
  .number()
  .gt(0)
  .max(999999.99)
  .refine((v) => Number(v.toFixed(2)) === v);
const date = z.iso.date();
export const creation = z.strictObject({
  debut: date,
  fin: date.nullable().default(null),
  montant,
});
export const modification = z
  .strictObject({ debut: date, fin: date.nullable(), montant })
  .partial();

/** Retire les clés absentes du corps (exactOptionalPropertyTypes). */
export const definis = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

const interdit = { erreur: 'Interdit' };
const utilisateurIntrouvable = { erreur: 'Utilisateur introuvable' };
const tauxIntrouvable = { erreur: 'Taux introuvable' };
export const invalide = { erreur: 'Données invalides' };

export const REFUS = {
  non_ressource: [422, { erreur: 'Seule une ressource a un taux journalier' }],
  dates: [422, { erreur: 'La date de fin précède la date de début' }],
  chevauchement: [
    409,
    { erreur: 'Période de taux qui chevauche une autre', code: 'taux_chevauchement' },
  ],
} as const;

export function tauxRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const peutEcrire = async (user: NonNullable<FastifyRequest['user']>, ressourceId: number) =>
    user.role === 'administrateur' || (await chefLitTaux(pool, user, ressourceId));
  // Lecture (§12.1 point 7) : 401, 403 rôle ressource, 404, 403 chef hors de sa portée.
  app.get<{ Params: { id: string } }>(
    '/api/utilisateurs/:id/taux',
    { preHandler: requireUser },
    async (request, reply) => {
      const user = request.user!;
      if (user.role === 'ressource') return reply.code(403).send(interdit);
      const id = identifiant(request.params.id);
      if (id === null || !(await lireRessource(pool, id))) {
        return reply.code(404).send(utilisateurIntrouvable);
      }
      if (user.role !== 'administrateur' && !(await chefLitTaux(pool, user, id))) {
        return reply.code(403).send(interdit);
      }
      return lireTaux(pool, id);
    },
  );

  // Écriture : administrateur, ou chef de projet dans sa portée (§12.6 point 6). Ordre : 401, 403 (rôle
  // ressource), 404, 403 (chef hors de sa portée), 400, 422, 409.
  app.post<{ Params: { id: string } }>(
    '/api/utilisateurs/:id/taux',
    { preHandler: requireNonRessource },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null || !(await lireRessource(pool, id))) {
        return reply.code(404).send(utilisateurIntrouvable);
      }
      if (!(await peutEcrire(request.user!, id))) return reply.code(403).send(interdit);
      const body = creation.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      try {
        const taux = await transaction(pool, (db) =>
          creerTaux(db, request.user!.id, id, body.data),
        );
        if (!taux) return reply.code(404).send(utilisateurIntrouvable);
        return reply.code(201).send(taux);
      } catch (err) {
        if (err instanceof RefusTaux)
          return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/taux/:id',
    { preHandler: requireNonRessource },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const lu = id === null ? null : await lireUnTaux(pool, id);
      if (id === null || !lu) return reply.code(404).send(tauxIntrouvable);
      if (!(await peutEcrire(request.user!, lu.utilisateur_id))) {
        return reply.code(403).send(interdit);
      }
      const body = modification.safeParse(request.body);
      try {
        // La transaction renvoie un verdict, jamais `reply` (thenable) : la route répond ensuite.
        const r = await transaction(pool, async (db) => {
          const existe = await db.query('SELECT 1 FROM taux_journalier WHERE id = $1', [id]);
          if (!existe.rowCount) return 'introuvable' as const;
          if (!body.success) return 'invalide' as const;
          return (
            (await modifierTaux(db, request.user!.id, id, definis(body.data))) ?? 'introuvable'
          );
        });
        if (r === 'introuvable') return reply.code(404).send(tauxIntrouvable);
        if (r === 'invalide') return reply.code(400).send(invalide);
        return r;
      } catch (err) {
        if (err instanceof RefusTaux)
          return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/taux/:id',
    { preHandler: requireNonRessource },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const lu = id === null ? null : await lireUnTaux(pool, id);
      if (id === null || !lu) return reply.code(404).send(tauxIntrouvable);
      if (!(await peutEcrire(request.user!, lu.utilisateur_id))) {
        return reply.code(403).send(interdit);
      }
      const fait = await transaction(pool, (db) => supprimerTaux(db, request.user!.id, id));
      return fait ? reply.code(204).send() : reply.code(404).send(tauxIntrouvable);
    },
  );
}
