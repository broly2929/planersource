import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { estReference } from '../db/erreurs.js';
import { transaction } from '../db/transaction.js';
import { identifiant, refuser, verdictProjet } from '../planning/acces.js';
import { int4Corps, idCorps, rangCorps } from '../planning/identifiant.js';
import { verrouiller } from '../planning/historique.js';
import {
  creerActivite,
  creerJalon,
  deplacerElement,
  lireActivite,
  lireActivites,
  lireElement,
  lireJalon,
  lireJalons,
  lirePlanning,
  modifierActivite,
  modifierJalon,
  supprimerElement,
} from '../planning/elements.js';
import {
  activiteADescendantsOuverts,
  ancetreActiviteClose,
  controlerDestination,
  projetOuAncetreClos,
  RefusCloture,
  verrouillerRacines,
} from '../planning/cloture.js';
import { lireVendu, vueActivite, vueJalon } from '../planning/vendu.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { invalide, traduireErreur } from './erreurs-planning.js';

// date validée bornée au 31/12/2099 (SPEC §3, D-056 R3) : comparaison de chaînes AAAA-MM-JJ
const date = z.iso
  .date()
  .refine((d) => d <= '2099-12-31')
  .nullable();
// charge vendue (D-149 (3)) : nombre de 0 à 999999,99 à deux décimales au plus, ou null
const chargeVendue = z
  .number()
  .min(0)
  .max(999999.99)
  .refine((v) => Number(v.toFixed(2)) === v)
  .nullable();
const modes = z.enum(['ASAP', 'START', 'STARR', 'ALAP', 'FDUR', 'DDUR', 'REGUL', 'MAN']);
const position = {
  parent_id: idCorps.nullable().default(null),
  rang: rangCorps.optional(),
};

// strictObject : les dates planifiées, les drapeaux et toute clé inconnue sont refusés (400).
const creationActivite = z.strictObject({
  nom: z.string().trim().min(1),
  ...position,
  mode: modes.default('ASAP'),
  priorite: z.number().int().min(0).max(1000).default(500),
  debut_valide: date.default(null),
  fin_valide: date.default(null),
  duree_validee: int4Corps.nullable().default(null),
  charge_vendue: chargeVendue.default(null),
});
const modificationActivite = z
  .strictObject({
    nom: z.string().trim().min(1),
    mode: modes,
    priorite: z.number().int().min(0).max(1000),
    debut_valide: date,
    fin_valide: date,
    duree_validee: int4Corps.nullable(),
    close: z.boolean(),
    charge_vendue: chargeVendue,
  })
  .partial();
const creationJalon = z.strictObject({
  nom: z.string().trim().min(1),
  ...position,
  type: z.enum(['flottant', 'fixe']).default('flottant'),
  date_validee: date.default(null),
  date_client: date.default(null),
});
const modificationJalon = z
  .strictObject({
    nom: z.string().trim().min(1),
    type: z.enum(['flottant', 'fixe']),
    date_validee: date,
    date_client: date,
  })
  .partial();
const deplacement = z.strictObject({
  parent_id: idCorps.nullable().optional(),
  rang: rangCorps.optional(),
});

/** Durée validée 1 par défaut pour FDUR et DDUR. */
const dureeParDefaut = (mode: string, duree: number | null): number | null =>
  duree === null && (mode === 'FDUR' || mode === 'DDUR') ? 1 : duree;

export function elementsRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };
  type ParamId = { Params: { id: string } };

  app.get<ParamId>('/api/projets/:id/planning', opts, async (request, reply) => {
    const projetId = identifiant(request.params.id);
    const acces = await verdictProjet(pool, request.user!, projetId, false);
    if (acces.verdict) return refuser(reply, acces.verdict);
    return lirePlanning(pool, acces.projet.id, acces.peutEcrire);
  });

  // --- activités ---
  app.get<ParamId>('/api/projets/:id/activites', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), false);
    if (acces.verdict) return refuser(reply, acces.verdict);
    const vendu = await lireVendu(pool, acces.projet.id);
    return (await lireActivites(pool, acces.projet.id)).map((a) =>
      vueActivite(a, vendu, acces.peutEcrire),
    );
  });

  app.post<ParamId>('/api/projets/:id/activites', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), true);
    if (acces.verdict) return refuser(reply, acces.verdict);
    const body = creationActivite.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const d = body.data;
    try {
      const activite = await transaction(pool, async (db) => {
        await verrouillerRacines(db, [acces.projet.id]);
        const creee = await creerActivite(db, request.user!.id, acces.projet.id, {
          ...d,
          duree_validee: dureeParDefaut(d.mode, d.duree_validee),
        });
        await controlerDestination(db, acces.projet.id, d.parent_id);
        return vueActivite(creee, await lireVendu(db, acces.projet.id), true);
      });
      return reply.code(201).send(activite);
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.patch<ParamId>('/api/activites/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const activite = id === null ? null : await lireActivite(pool, id);
    const acces = await verdictProjet(pool, request.user!, activite?.projet_id ?? null, true);
    if (acces.verdict || !activite) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = modificationActivite.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const { close, ...champs } = body.data;
    const definis = Object.fromEntries(Object.entries(champs).filter(([, v]) => v !== undefined));
    try {
      const resultat = await transaction(pool, async (db) => {
        await verrouillerRacines(db, [activite.projet_id]);
        // relecture sous verrou : la fusion part de l'état courant, pas de celui lu hors transaction
        await verrouiller(db, 'element', activite.id);
        const avant = await lireActivite(db, activite.id);
        if (!avant) return null;
        const fusion = { ...avant, ...definis };
        const apres = await modifierActivite(db, request.user!.id, activite.id, {
          nom: fusion.nom,
          mode: fusion.mode,
          priorite: fusion.priorite,
          debut_valide: fusion.debut_valide,
          fin_valide: fusion.fin_valide,
          duree_validee: dureeParDefaut(fusion.mode, fusion.duree_validee),
          charge_vendue: fusion.charge_vendue,
          ...(close === undefined ? {} : { close }),
        });
        // D-083 (2), (3) : seules les transitions de clôture sont contrôlées (D-083 (7)).
        if (close === true && avant?.close === false) {
          if (await activiteADescendantsOuverts(db, activite.id)) {
            throw new RefusCloture('enfants_ouverts');
          }
        }
        if (close === false && avant?.close === true) {
          const parentClos =
            (await ancetreActiviteClose(db, activite.id)) ||
            (await projetOuAncetreClos(db, activite.projet_id, true));
          if (parentClos) throw new RefusCloture('parent_clos');
        }
        return vueActivite(apres, await lireVendu(db, apres.projet_id), true);
      });
      return resultat ?? refuser(reply, 'introuvable');
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.delete<ParamId>('/api/activites/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const activite = id === null ? null : await lireActivite(pool, id);
    const acces = await verdictProjet(pool, request.user!, activite?.projet_id ?? null, true);
    if (acces.verdict || !activite) return refuser(reply, acces.verdict ?? 'introuvable');
    try {
      await transaction(pool, (db) =>
        supprimerElement(db, request.user!.id, activite.id, 'activite'),
      );
      return reply.code(204).send();
    } catch (err) {
      if (estReference(err)) return reply.code(409).send({ erreur: 'L’activité a des enfants' });
      throw err;
    }
  });

  // --- jalons ---
  app.get<ParamId>('/api/projets/:id/jalons', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), false);
    if (acces.verdict) return refuser(reply, acces.verdict);
    return (await lireJalons(pool, acces.projet.id)).map((j) => vueJalon(j, acces.peutEcrire));
  });

  app.post<ParamId>('/api/projets/:id/jalons', opts, async (request, reply) => {
    const acces = await verdictProjet(pool, request.user!, identifiant(request.params.id), true);
    if (acces.verdict) return refuser(reply, acces.verdict);
    const body = creationJalon.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    try {
      return reply.code(201).send(
        await transaction(pool, async (db) => {
          await verrouillerRacines(db, [acces.projet.id]);
          const cree = await creerJalon(db, request.user!.id, acces.projet.id, body.data);
          await controlerDestination(db, acces.projet.id, body.data.parent_id);
          return vueJalon(cree, true);
        }),
      );
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.patch<ParamId>('/api/jalons/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const jalon = id === null ? null : await lireJalon(pool, id);
    const acces = await verdictProjet(pool, request.user!, jalon?.projet_id ?? null, true);
    if (acces.verdict || !jalon) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = modificationJalon.safeParse(request.body);
    if (!body.success) return reply.code(400).send(invalide);
    const definis = Object.fromEntries(
      Object.entries(body.data).filter(([, v]) => v !== undefined),
    );
    try {
      const resultat = await transaction(pool, async (db) => {
        // relecture sous verrou : la fusion part de l'état courant
        await verrouiller(db, 'element', jalon.id);
        const courant = await lireJalon(db, jalon.id);
        if (!courant) return null;
        const fusion = { ...courant, ...definis };
        return modifierJalon(db, request.user!.id, jalon.id, {
          nom: fusion.nom,
          type: fusion.type,
          date_validee: fusion.date_validee,
          date_client: fusion.date_client,
        }).then((j) => vueJalon(j, true));
      });
      return resultat ?? refuser(reply, 'introuvable');
    } catch (err) {
      return traduireErreur(err, reply);
    }
  });

  app.delete<ParamId>('/api/jalons/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const jalon = id === null ? null : await lireJalon(pool, id);
    const acces = await verdictProjet(pool, request.user!, jalon?.projet_id ?? null, true);
    if (acces.verdict || !jalon) return refuser(reply, acces.verdict ?? 'introuvable');
    await transaction(pool, (db) => supprimerElement(db, request.user!.id, jalon.id, 'jalon'));
    return reply.code(204).send();
  });

  // --- déplacement dans le WBS ---
  app.post<ParamId>('/api/elements/:id/deplacer', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const element = id === null ? null : await lireElement(pool, id);
    const acces = await verdictProjet(pool, request.user!, element?.projet_id ?? null, true);
    if (acces.verdict || !element) return refuser(reply, acces.verdict ?? 'introuvable');
    const body = deplacement.safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send(invalide);
    const parentId = body.data.parent_id === undefined ? element.parent_id : body.data.parent_id;
    try {
      await transaction(pool, async (db) => {
        await verrouillerRacines(db, [element.projet_id]);
        await deplacerElement(
          db,
          request.user!.id,
          element.id,
          element.type,
          element.projet_id,
          element.parent_id,
          parentId,
          body.data.rang,
        );
        await controlerDestination(db, element.projet_id, parentId);
      });
    } catch (err) {
      return traduireErreur(err, reply);
    }
    const lignes = await lirePlanning(pool, element.projet_id, true);
    return lignes.find((l) => l.id === element.id);
  });
}
