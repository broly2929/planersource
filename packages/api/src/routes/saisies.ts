import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { transaction } from '../db/transaction.js';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { lireActivite } from '../planning/elements.js';
import { dansLeMois, joursNonOuvres, lireSaisies, remplacerSaisies } from '../planning/saisies.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { invalide } from './erreurs-planning.js';

const MOIS = /^20\d{2}-(0[1-9]|1[0-2])$/;
const mois = z.string().regex(MOIS);
const saisie = z.strictObject({
  assignation_id: z.number().int().min(1).max(2147483647),
  jour: z.iso.date(),
  demi_journee: z.enum(['matin', 'apres_midi']),
});
const corps = z.strictObject({ saisies: z.array(saisie) });

export function saisiesRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };
  type Req = { Params: { id: string }; Querystring: { mois?: string } };

  app.get<Req>('/api/activites/:id/saisies', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const activite = id === null ? null : await lireActivite(pool, id);
    const acces = await verdictProjet(pool, request.user!, activite?.projet_id ?? null, false);
    if (acces.verdict || !activite) return refuser(reply, acces.verdict ?? 'introuvable');
    const m = mois.safeParse(request.query.mois);
    if (!m.success) return reply.code(400).send(invalide);
    return lireSaisies(pool, activite.id, m.data);
  });

  app.get<Req>('/api/activites/:id/jours-non-ouvres', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const activite = id === null ? null : await lireActivite(pool, id);
    const acces = await verdictProjet(pool, request.user!, activite?.projet_id ?? null, false);
    if (acces.verdict || !activite) return refuser(reply, acces.verdict ?? 'introuvable');
    const m = mois.safeParse(request.query.mois);
    if (!m.success) return reply.code(400).send(invalide);
    return joursNonOuvres(pool, activite.id, m.data);
  });

  app.put<Req>('/api/activites/:id/saisies', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const activite = id === null ? null : await lireActivite(pool, id);
    const acces = await verdictProjet(pool, request.user!, activite?.projet_id ?? null, true);
    if (acces.verdict || !activite) return refuser(reply, acces.verdict ?? 'introuvable');
    const m = mois.safeParse(request.query.mois);
    const b = corps.safeParse(request.body);
    if (!m.success || !b.success) return reply.code(400).send(invalide);
    const cles = new Set<string>();
    for (const s of b.data.saisies) {
      const cle = `${s.assignation_id}|${s.jour}|${s.demi_journee}`;
      if (!dansLeMois(s.jour, m.data) || cles.has(cle)) return reply.code(400).send(invalide);
      cles.add(cle);
    }
    const resultat = await transaction(pool, (db) =>
      remplacerSaisies(db, activite.id, m.data, b.data.saisies),
    );
    if (resultat === null) {
      return reply.code(422).send({ erreur: 'Règle de planning non respectée' });
    }
    if ('refus' in resultat) {
      return reply.code(422).send({
        erreur: 'Jour non ouvré',
        code: resultat.refus,
        assignation_id: resultat.assignation_id,
        jour: resultat.jour,
      });
    }
    return resultat;
  });
}
