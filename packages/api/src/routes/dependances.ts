import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { int4Corps } from '../planning/identifiant.js';
import {
  creerDependance,
  lireDependance,
  lireDependances,
  modifierDependance,
  supprimerDependance,
} from '../planning/dependances.js';
import { verrouiller } from '../planning/historique.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { invalide, traduireErreur } from './erreurs-planning.js';

const type = z.enum(['FD', 'DD', 'FF']);
const creation = z.strictObject({
  predecesseur_id: z.number().int().positive().max(2147483647),
  successeur_id: z.number().int().positive().max(2147483647),
  type: type.default('FD'),
  delai: int4Corps.default(0),
});
const modification = z.strictObject({ type, delai: int4Corps }).partial();

export function dependancesRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };
  type ParamId = { Params: { id: string } };

  app.get<ParamId>('/api/projets/:id/dependances', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), false);
    if (acces.verdict) return refuser(reply, acces.verdict);
    return lireDependances(pool, acces.projet.id);
  });

  app.post<ParamId>('/api/projets/:id/dependances', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), true);
    if (acces.verdict) return refuser(reply, acces.verdict);
    const body = creation.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    // Les deux éléments sont d'abord rattachés au projet : sinon l'ordre des contrôles de
    // PostgreSQL (unicité avant clé étrangère) révélerait par 409 les dépendances d'un projet invisible.
    const { rows } = await pool.query(
      'SELECT 1 FROM element WHERE projet_id = $1 AND id = ANY($2::int[])',
      [acces.projet.id, [body.data.predecesseur_id, body.data.successeur_id]],
    );
    if (rows.length !== new Set([body.data.predecesseur_id, body.data.successeur_id]).size) {
      return reply.code(422).send({ erreur: 'Règle de planning non respectée' });
    }
    try {
      const dependance = await transaction(pool, (db) =>
        creerDependance(db, request.user!.id, acces.projet.id, body.data),
      );
      return reply.code(201).send(dependance);
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.patch<ParamId>('/api/dependances/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const dependance = id === null ? null : await lireDependance(pool, id);
    const acces = await verdictProjet(pool, request.user!, dependance?.projet_id ?? null, true);
    if (acces.verdict || !dependance) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = modification.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const resultat = await transaction(pool, async (db) => {
      // relecture sous verrou : la fusion part de l'état courant
      await verrouiller(db, 'dependance', dependance.id);
      const courante = await lireDependance(db, dependance.id);
      if (!courante) return null;
      return modifierDependance(db, request.user!.id, dependance.id, {
        type: body.data.type ?? courante.type,
        delai: body.data.delai ?? courante.delai,
      });
    });
    return resultat ?? refuser(reply, 'introuvable');
  });

  app.delete<ParamId>('/api/dependances/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const dependance = id === null ? null : await lireDependance(pool, id);
    const acces = await verdictProjet(pool, request.user!, dependance?.projet_id ?? null, true);
    if (acces.verdict || !dependance) return refuser(reply, acces.verdict ?? 'introuvable');
    await transaction(pool, (db) => supprimerDependance(db, request.user!.id, dependance.id));
    return reply.code(204).send();
  });
}
