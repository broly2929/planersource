import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { idCorps } from '../planning/identifiant.js';
import {
  creerAssignation,
  lireAssignation,
  lireAssignations,
  modifierAssignation,
  supprimerAssignation,
} from '../planning/assignations.js';
import { lireElement } from '../planning/elements.js';
import { verrouiller } from '../planning/historique.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { invalide, traduireErreur } from './erreurs-planning.js';

const taux = z.number().gt(0).lte(100);
// charge en jours, positive, au plus 2 décimales
const charge = z
  .number()
  .min(0)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9);
const creation = z.strictObject({
  ressource_id: idCorps,
  taux: taux.default(100),
  charge_assignee: charge,
});
const modification = z.strictObject({ taux, charge_assignee: charge }).partial();

export function assignationsRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };
  type ParamId = { Params: { id: string } };

  app.get<ParamId>('/api/projets/:id/assignations', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), false);
    if (acces.verdict) return refuser(reply, acces.verdict);
    return lireAssignations(pool, acces.projet.id);
  });

  app.post<ParamId>('/api/activites/:id/assignations', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const element = id === null ? null : await lireElement(pool, id);
    const acces = await verdictProjet(pool, request.user!, element?.projet_id ?? null, true);
    if (acces.verdict || !element) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = creation.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    try {
      // un jalon n'est pas une activité : la clé étrangère vers `activite` refuse (422)
      const assignation = await transaction(pool, (db) =>
        creerAssignation(db, request.user!.id, element.id, element.projet_id, body.data),
      );
      return reply.code(201).send(assignation);
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.patch<ParamId>('/api/assignations/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const assignation = id === null ? null : await lireAssignation(pool, id);
    const acces = await verdictProjet(pool, request.user!, assignation?.projet_id ?? null, true);
    if (acces.verdict || !assignation) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = modification.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const resultat = await transaction(pool, async (db) => {
      // relecture sous verrou : la fusion part de l'état courant
      await verrouiller(db, 'assignation', assignation.id);
      const courante = await lireAssignation(db, assignation.id);
      if (!courante) return null;
      return modifierAssignation(db, request.user!.id, assignation.id, {
        taux: body.data.taux ?? courante.taux,
        charge_assignee: body.data.charge_assignee ?? courante.charge_assignee,
      });
    });
    return resultat ?? refuser(reply, 'introuvable');
  });

  app.delete<ParamId>('/api/assignations/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const assignation = id === null ? null : await lireAssignation(pool, id);
    const acces = await verdictProjet(pool, request.user!, assignation?.projet_id ?? null, true);
    if (acces.verdict || !assignation) return refuser(reply, acces.verdict ?? 'introuvable');
    if (
      !(await transaction(pool, (db) => supprimerAssignation(db, request.user!.id, assignation.id)))
    ) {
      return reply.code(409).send({ erreur: 'L’assignation a une charge réelle' });
    }
    return reply.code(204).send();
  });
}
