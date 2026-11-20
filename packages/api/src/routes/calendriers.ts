import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { estDoublon, estReference } from '../db/erreurs.js';
import { transaction } from '../db/transaction.js';
import {
  creerCalendrier,
  lireCalendrier,
  lireCalendriers,
  modifierCalendrier,
  supprimerCalendrier,
} from '../planning/calendriers.js';
import { identifiant } from '../planning/identifiant.js';
import type { AppDeps } from '../app.js';
import { requireAdmin, requireUser } from './acces.js';

const jours = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .transform((j) => [...new Set(j)].sort((a, b) => a - b));

const creation = z.strictObject({
  nom: z.string().trim().min(1),
  jours_travailles: jours.default([1, 2, 3, 4, 5]),
});
// sans défaut : un champ absent n'est pas modifié (creation.partial() conserverait le défaut des jours)
const modification = z.strictObject({ nom: creation.shape.nom, jours_travailles: jours }).partial();
const ferie = z.strictObject({ jour: z.iso.date(), libelle: z.string().default('') });

export function calendriersRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const lecture = { preHandler: requireUser };
  const ecriture = { preHandler: requireAdmin };
  const invalide = { erreur: 'Données invalides' };
  const introuvable = { erreur: 'Calendrier introuvable' };

  app.get('/api/calendriers', lecture, async () => lireCalendriers(pool));

  app.get<{ Params: { id: string } }>('/api/calendriers/:id', lecture, async (request, reply) => {
    const id = identifiant(request.params.id);
    const cal = id === null ? null : await lireCalendrier(pool, id);
    return cal ?? reply.code(404).send(introuvable);
  });

  app.post('/api/calendriers', ecriture, async (request, reply) => {
    const body = creation.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    return reply
      .code(201)
      .send(await transaction(pool, (db) => creerCalendrier(db, request.user!.id, body.data)));
  });

  app.patch<{ Params: { id: string } }>(
    '/api/calendriers/:id',
    ecriture,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null) return reply.code(404).send(introuvable);
      const body = modification.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      const modifie = await transaction(pool, (db) =>
        modifierCalendrier(db, request.user!.id, id, body.data),
      );
      return modifie ?? reply.code(404).send(introuvable);
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/calendriers/:id',
    ecriture,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null) return reply.code(404).send(introuvable);
      try {
        const supprime = await transaction(pool, (db) =>
          supprimerCalendrier(db, request.user!.id, id),
        );
        if (!supprime) return reply.code(404).send(introuvable);
        return reply.code(204).send();
      } catch (err) {
        if (estReference(err)) {
          return reply
            .code(409)
            .send({ erreur: 'Calendrier par défaut ou utilisé : suppression refusée' });
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/calendriers/:id/feries',
    ecriture,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null) return reply.code(404).send(introuvable);
      const body = ferie.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      if (!(await lireCalendrier(pool, id))) return reply.code(404).send(introuvable);
      try {
        await pool.query(
          'INSERT INTO calendrier_ferie (calendrier_id, jour, libelle) VALUES ($1, $2, $3)',
          [id, body.data.jour, body.data.libelle],
        );
      } catch (err) {
        if (estDoublon(err)) return reply.code(409).send({ erreur: 'Jour férié déjà présent' });
        throw err;
      }
      return reply.code(201).send(body.data);
    },
  );

  app.delete<{ Params: { id: string; jour: string } }>(
    '/api/calendriers/:id/feries/:jour',
    ecriture,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null) return reply.code(404).send(introuvable);
      const jour = z.iso.date().safeParse(request.params.jour);
      if (!jour.success) return reply.code(400).send(invalide);
      const res = await pool.query(
        'DELETE FROM calendrier_ferie WHERE calendrier_id = $1 AND jour = $2',
        [id, jour.data],
      );
      if (!res.rowCount) return reply.code(404).send({ erreur: 'Jour férié introuvable' });
      return reply.code(204).send();
    },
  );
}
