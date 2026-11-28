import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant, idCorps } from '../planning/identifiant.js';
import {
  creerAbsence,
  lireAbsences,
  lireUneAbsence,
  modifierAbsence,
  peutEcrireAbsences,
  RefusAbsence,
  supprimerAbsence,
} from '../planning/absences.js';
import { lireGrille } from '../planning/grille-absences.js';
import { lireRessource } from '../planning/taux.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';

// Absences (SPEC §4, « Absences et charge depuis le taux (absences, D-276) », point 8).
const date = z.iso.date();
const portion = z.enum(['journee', 'matin', 'apres_midi']);
const motif = z.enum(['conge', 'formation', 'autre']);

/** Fin ≥ début ; demi-journée sur un seul jour (point 1) : sinon 400. */
const coherente = (a: { debut: string; fin: string; portion: string }) =>
  a.fin >= a.debut && (a.portion === 'journee' || a.fin === a.debut);

const creation = z
  .strictObject({ ressource_id: idCorps, debut: date, fin: date, portion, motif })
  .refine(coherente);
const modification = z.strictObject({ debut: date, fin: date, portion, motif }).partial();
const filtre = z
  .strictObject({
    ressource_id: z.string().optional(),
    du: date.optional(),
    au: date.optional(),
  })
  .refine((f) => !f.du || !f.au || f.du <= f.au);

const grilleFiltre = z.strictObject({
  mois: z.string().regex(/^(20\d\d)-(0[1-9]|1[0-2])$/),
});

const interdit = { erreur: 'Interdit' };
const invalide = { erreur: 'Données invalides' };
const ressourceIntrouvable = { erreur: 'Ressource introuvable' };
const absenceIntrouvable = { erreur: 'Absence introuvable' };

const REFUS = {
  non_ressource: [422, { erreur: 'Seule une ressource a des absences', code: 'non_ressource' }],
  duree_excessive: [
    422,
    { erreur: 'Une absence dure au plus 366 jours.', code: 'duree_excessive' },
  ],
  jour_impute: [422, { erreur: 'Jour déjà imputé', code: 'jour_impute' }],
  chevauchement: [
    409,
    { erreur: 'Absence qui chevauche une autre', code: 'absence_chevauchement' },
  ],
} as const;

/** Retire les clés absentes du corps (exactOptionalPropertyTypes). */
const definis = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };

export function absencesRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  // Lecture (point 7) : la ressource lit les siennes ; administrateur, chefs et leaders lisent tout.
  // Ordre : 401, 400, 404, 403.
  app.get('/api/absences', { preHandler: requireUser }, async (request, reply) => {
    const user = request.user!;
    const q = filtre.safeParse(request.query);
    if (!q.success) return reply.code(400).send(invalide);
    let ressourceId: number | undefined;
    if (q.data.ressource_id !== undefined) {
      const id = identifiant(q.data.ressource_id);
      if (id === null || !(await lireRessource(pool, id))) {
        return reply.code(404).send(ressourceIntrouvable);
      }
      ressourceId = id;
    }
    if (user.role === 'ressource') {
      if (ressourceId !== undefined && ressourceId !== user.id) {
        return reply.code(403).send(interdit);
      }
      ressourceId = user.id;
    }
    return lireAbsences(pool, { ressourceId, du: q.data.du, au: q.data.au });
  });

  // Grille mensuelle (point 29) : ressources actives, leurs jours non ouvrés du mois et le droit d'écriture.
  // Ordre : 401, 403 (rôle ressource), 400.
  app.get('/api/absences/grille', { preHandler: requireUser }, async (request, reply) => {
    if (request.user!.role === 'ressource') return reply.code(403).send(interdit);
    const q = grilleFiltre.safeParse(request.query);
    if (!q.success) return reply.code(400).send(invalide);
    return lireGrille(pool, request.user!, q.data.mois);
  });

  // Création. Ordre : 401, 400, 404, 403, 422 (non_ressource, duree_excessive, jour_impute), 409.
  app.post('/api/absences', { preHandler: requireUser }, async (request, reply) => {
    const body = creation.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const d = body.data;
    if (!(await lireRessource(pool, d.ressource_id))) {
      return reply.code(404).send(ressourceIntrouvable);
    }
    if (!(await peutEcrireAbsences(pool, request.user!, d.ressource_id))) {
      return reply.code(403).send(interdit);
    }
    try {
      const absence = await transaction(pool, (db) => creerAbsence(db, request.user!.id, d));
      if (!absence) return reply.code(404).send(ressourceIntrouvable);
      return reply.code(201).send(absence);
    } catch (err) {
      if (err instanceof RefusAbsence) {
        return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
      }
      throw err;
    }
  });

  // Modification. Ordre : 401, 404, 403, 400, 422 (duree_excessive, jour_impute), 409 ; état fusionné.
  app.patch<{ Params: { id: string } }>(
    '/api/absences/:id',
    { preHandler: requireUser },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const lue = id === null ? null : await lireUneAbsence(pool, id);
      if (id === null || !lue) return reply.code(404).send(absenceIntrouvable);
      if (!(await peutEcrireAbsences(pool, request.user!, lue.ressource_id))) {
        return reply.code(403).send(interdit);
      }
      const body = modification.safeParse(request.body);
      if (!body.success || !coherente({ ...lue, ...definis(body.data) })) {
        return reply.code(400).send(invalide);
      }
      try {
        const r = await transaction(pool, (db) =>
          modifierAbsence(db, request.user!.id, id, definis(body.data)),
        );
        return r ?? reply.code(404).send(absenceIntrouvable);
      } catch (err) {
        if (err instanceof RefusAbsence) {
          return reply.code(REFUS[err.motif][0]).send(REFUS[err.motif][1]);
        }
        throw err;
      }
    },
  );

  // Suppression. Ordre : 401, 404, 403.
  app.delete<{ Params: { id: string } }>(
    '/api/absences/:id',
    { preHandler: requireUser },
    async (request, reply) => {
      const id = identifiant(request.params.id);
      const lue = id === null ? null : await lireUneAbsence(pool, id);
      if (id === null || !lue) return reply.code(404).send(absenceIntrouvable);
      if (!(await peutEcrireAbsences(pool, request.user!, lue.ressource_id))) {
        return reply.code(403).send(interdit);
      }
      const fait = await transaction(pool, (db) => supprimerAbsence(db, request.user!.id, id));
      return fait ? reply.code(204).send() : reply.code(404).send(absenceIntrouvable);
    },
  );
}
