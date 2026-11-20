import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { estContrainte, estDoublon, estReference } from '../db/erreurs.js';
import {
  creerAffectation,
  datesCoherentes,
  estRessourceActive,
  lireAffectation,
  lireAffectations,
  modifierAffectation,
  supprimerAffectation,
} from '../planning/affectations.js';
import { transaction } from '../db/transaction.js';
import { idCorps, identifiant } from '../planning/identifiant.js';
import { accesProjet } from '../planning/projets.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

const taux = z.number().gt(0).lte(100);
const date = z.iso.date().nullable();

const creation = z.strictObject({
  ressource_id: idCorps,
  taux: taux.default(100),
  date_debut: date.default(null),
  date_fin: date.default(null),
});
const modification = z.strictObject({ taux, date_debut: date, date_fin: date }).partial();

const introuvable = { erreur: 'Projet introuvable' };
const invalide = { erreur: 'Données invalides' };
const datesIncoherentes = { erreur: 'La date de fin précède la date de début' };

export function affectationsRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };

  app.get<{ Params: { id: string } }>(
    '/api/projets/:id/affectations',
    opts,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      if (id === null || !(await accesProjet(pool, request.user!, id))) {
        return reply.code(404).send(introuvable);
      }
      return lireAffectations(pool, id);
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/projets/:id/affectations',
    opts,
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const acces = id === null ? null : await accesProjet(pool, request.user!, id);
      if (!acces) return reply.code(404).send(introuvable);
      if (!acces.peutEcrire) return reply.code(403).send({ erreur: 'Interdit' });
      const body = creation.safeParse(request.body);
      if (!body.success) return reply.code(400).send(invalide);
      const d = body.data;
      if (!(await estRessourceActive(pool, d.ressource_id))) {
        return reply.code(422).send({ erreur: 'L’utilisateur n’est pas une ressource active' });
      }
      if (!datesCoherentes(d.date_debut, d.date_fin))
        return reply.code(422).send(datesIncoherentes);
      try {
        return reply
          .code(201)
          .send(
            await transaction(pool, (db) =>
              creerAffectation(db, request.user!.id, { projet_id: acces.projet.id, ...d }),
            ),
          );
      } catch (err) {
        if (estDoublon(err)) return reply.code(409).send({ erreur: 'Ressource déjà affectée' });
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string } }>('/api/affectations/:id', opts, async (request, reply) => {
    const aff = await charger(request.params.id);
    const acces = aff ? await accesProjet(pool, request.user!, aff.projet_id) : null;
    if (!aff || !acces) return reply.code(404).send({ erreur: 'Affectation introuvable' });
    if (!acces.peutEcrire) return reply.code(403).send({ erreur: 'Interdit' });
    const body = modification.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const fusion = {
      taux: body.data.taux ?? aff.taux,
      date_debut: body.data.date_debut === undefined ? aff.date_debut : body.data.date_debut,
      date_fin: body.data.date_fin === undefined ? aff.date_fin : body.data.date_fin,
    };
    if (!datesCoherentes(fusion.date_debut, fusion.date_fin)) {
      return reply.code(422).send(datesIncoherentes);
    }
    try {
      return await transaction(pool, (db) =>
        modifierAffectation(db, request.user!.id, aff.id, fusion),
      );
    } catch (err) {
      if (estContrainte(err)) return reply.code(422).send(invalide);
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/api/affectations/:id', opts, async (request, reply) => {
    const aff = await charger(request.params.id);
    const acces = aff ? await accesProjet(pool, request.user!, aff.projet_id) : null;
    if (!aff || !acces) return reply.code(404).send({ erreur: 'Affectation introuvable' });
    if (!acces.peutEcrire) return reply.code(403).send({ erreur: 'Interdit' });
    try {
      await transaction(pool, (db) => supprimerAffectation(db, request.user!.id, aff.id));
      return reply.code(204).send();
    } catch (err) {
      if (estReference(err))
        return reply.code(409).send({ erreur: 'Des assignations en dépendent' });
      throw err;
    }
  });

  async function charger(brut: string) {
    const id = identifiant(brut);
    return id === null ? null : lireAffectation(pool, id);
  }
}
