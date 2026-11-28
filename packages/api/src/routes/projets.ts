import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { estContrainte, estDoublon, estReference } from '../db/erreurs.js';
import {
  accesProjet,
  chefValide,
  creerProjet,
  modelesVisibles,
  modifierProjet,
  projetsVisibles,
  supprimerProjet,
  type NouveauProjet,
} from '../planning/projets.js';
import { copierProjet, DateApres2099 } from '../planning/copie.js';
import {
  projetAEnfantsOuverts,
  projetClos,
  projetOuAncetreClos,
  RefusCloture,
  verrouillerRacines,
} from '../planning/cloture.js';
import type { Db } from '../db/erreurs.js';
import { transaction } from '../db/transaction.js';
import { idCorps, identifiant } from '../planning/identifiant.js';
import { avecOtp, lireOtpProjets } from '../planning/otp.js';
import { otpCorps } from './otp.js';
import type { AppDeps } from '../app.js';
import { requireUser } from './acces.js';
import { estChef } from '../auth/user.js';

const champsProjet = {
  code: z.string().trim().min(1),
  nom: z.string().trim().min(1),
  parent_id: idCorps.nullable(),
  priorite: z.number().int().min(0).max(1000),
  chef_id: idCorps,
  date_debut: z.iso.date(),
  otp: otpCorps,
};

// strictObject : toute clé inconnue (dont est_modele, fixé à la création, D-038) est refusée.
const creation = z.strictObject({
  code: champsProjet.code,
  nom: champsProjet.nom,
  date_debut: champsProjet.date_debut,
  parent_id: champsProjet.parent_id.optional(),
  priorite: champsProjet.priorite.optional(),
  chef_id: champsProjet.chef_id.optional(),
  otp: champsProjet.otp.optional(),
});
// Un modèle a pour chef l'administrateur qui le crée (SPEC §11.1) : un chef_id envoyé est ignoré.
const creationModele = z.strictObject({
  chef_id: idCorps.optional(),
  code: champsProjet.code,
  nom: champsProjet.nom,
  date_debut: champsProjet.date_debut,
  parent_id: champsProjet.parent_id.optional(),
  priorite: champsProjet.priorite.optional(),
  otp: champsProjet.otp.optional(),
});
const copie = z.strictObject({
  nom: champsProjet.nom,
  code: champsProjet.code,
  date_debut: champsProjet.date_debut,
  sous_projets: z.boolean().default(true),
  affectations: z.boolean().default(true),
  est_modele: z.boolean().default(false),
});
const modification = z.strictObject({ ...champsProjet, clos: z.boolean() }).partial();

type Verdict = 'introuvable' | 'interdit';

const introuvable = { erreur: 'Projet introuvable' };

export function projetsRoutes(app: FastifyInstance, { pool }: AppDeps): void {
  const opts = { preHandler: requireUser };

  /** Verdict d'accès : 'introuvable' (404) si invisible, 'interdit' (403) si lecture seule, sinon null. */
  async function verdict(
    request: FastifyRequest,
    id: number,
    ecriture: boolean,
  ): Promise<Verdict | null> {
    const acces = await accesProjet(pool, request.user!, id);
    if (!acces) return 'introuvable';
    if (ecriture && !acces.peutEcrire) return 'interdit';
    return null;
  }

  /** La route envoie la réponse correspondant au verdict. */
  function refuser(reply: FastifyReply, v: Verdict) {
    return v === 'introuvable'
      ? reply.code(404).send(introuvable)
      : reply.code(403).send({ erreur: 'Interdit' });
  }

  function traduire(err: unknown, reply: FastifyReply) {
    if (err instanceof RefusCloture) {
      return reply.code(422).send({ erreur: err.message, code: err.code });
    }
    if (estDoublon(err)) return reply.code(409).send({ erreur: 'Code déjà utilisé' });
    if (estContrainte(err) || estReference(err)) {
      return reply
        .code(422)
        .send({ erreur: 'Arborescence de projets invalide', code: 'arborescence_invalide' });
    }
    throw err;
  }

  /** Création sous un parent (D-083 (3), (6)) : verrou de la racine, refus si le parent est clos. */
  async function creerSousParent(db: Db, par: number, nouveau: NouveauProjet) {
    if (nouveau.parent_id !== null) await verrouillerRacines(db, [nouveau.parent_id]);
    const projet = await creerProjet(db, par, nouveau);
    if (nouveau.parent_id !== null && (await projetClos(db, nouveau.parent_id))) {
      throw new RefusCloture('parent_clos');
    }
    return projet;
  }

  app.get('/api/projets', opts, async (request, reply) => {
    if (request.user!.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
    const projets = await projetsVisibles(pool, request.user!);
    const herite = await lireOtpProjets(
      pool,
      request.user!,
      projets.map((p) => p.id),
    );
    return projets.map((p) => avecOtp(p, p.id, herite));
  });

  app.get('/api/modeles', opts, async (request, reply) => {
    if (request.user!.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
    const modeles = await modelesVisibles(pool, request.user!);
    const herite = await lireOtpProjets(
      pool,
      request.user!,
      modeles.map((p) => p.id),
    );
    return modeles.map((p) => avecOtp(p, p.id, herite));
  });

  app.post('/api/modeles', opts, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'administrateur') return reply.code(403).send({ erreur: 'Interdit' });
    const body = creationModele.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const d = body.data;
    if (d.parent_id != null) {
      const v = await verdict(request, d.parent_id, true);
      if (v) return refuser(reply, v);
    }
    const nouveau: NouveauProjet = {
      code: d.code,
      nom: d.nom,
      parent_id: d.parent_id ?? null,
      priorite: d.priorite ?? 500,
      chef_id: user.id,
      date_debut: d.date_debut,
      est_modele: true,
      otp: d.otp ?? null,
    };
    try {
      const cree = await transaction(pool, (db) => creerSousParent(db, user.id, nouveau));
      return reply
        .code(201)
        .send(avecOtp(cree, cree.id, await lireOtpProjets(pool, user, [cree.id])));
    } catch (err) {
      return traduire(err, reply);
    }
  });

  app.get<{ Params: { id: string } }>('/api/projets/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const [projet] = id === null ? [] : await projetsVisibles(pool, request.user!, id);
    if (!projet) return reply.code(404).send(introuvable);
    return avecOtp(projet, projet.id, await lireOtpProjets(pool, request.user!, [projet.id]));
  });

  app.post('/api/projets', opts, async (request, reply) => {
    const user = request.user!;
    if (user.role === 'ressource') return reply.code(403).send({ erreur: 'Interdit' });
    const body = creation.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const d = body.data;
    // Seul l'administrateur désigne le chef (D-028) ; un chef de projet l'est de ses projets.
    if (estChef(user.role) && d.chef_id !== undefined && d.chef_id !== user.id) {
      return reply.code(403).send({ erreur: 'Seul l’administrateur désigne le chef de projet' });
    }
    const chefId = estChef(user.role) ? user.id : (d.chef_id ?? user.id);
    if (!(await chefValide(pool, chefId))) {
      return reply.code(422).send({ erreur: 'Chef de projet invalide' });
    }
    if (d.parent_id != null) {
      const v = await verdict(request, d.parent_id, true);
      if (v) return refuser(reply, v);
    }
    const nouveau: NouveauProjet = {
      code: d.code,
      nom: d.nom,
      parent_id: d.parent_id ?? null,
      priorite: d.priorite ?? 500,
      chef_id: chefId,
      date_debut: d.date_debut,
      otp: d.otp ?? null,
    };
    try {
      const cree = await transaction(pool, (db) => creerSousParent(db, user.id, nouveau));
      return reply
        .code(201)
        .send(avecOtp(cree, cree.id, await lireOtpProjets(pool, user, [cree.id])));
    } catch (err) {
      return traduire(err, reply);
    }
  });

  // Copie d'un projet ou d'un modèle (D-039) : 404 si la source est invisible, 400 si le corps est
  // invalide, 403 si l'utilisateur n'a pas le droit de copier (modèle : administrateur seul ;
  // source ordinaire : droit d'écriture ; source modèle : administrateur et chef).
  app.post<{ Params: { id: string } }>('/api/projets/:id/copie', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const user = request.user!;
    const acces = id === null ? null : await accesProjet(pool, user, id);
    if (!acces) return reply.code(404).send(introuvable);
    const body = copie.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const d = body.data;
    const autorise =
      user.role === 'administrateur' ||
      (!d.est_modele && estChef(user.role) && (acces.projet.est_modele || acces.peutEcrire));
    if (!autorise) return reply.code(403).send({ erreur: 'Interdit' });
    try {
      const cree = await transaction(pool, (db) => copierProjet(db, user.id, acces.projet, d));
      return reply
        .code(201)
        .send(avecOtp(cree, cree.id, await lireOtpProjets(pool, user, [cree.id])));
    } catch (err) {
      if (err instanceof DateApres2099) {
        return reply.code(422).send({ erreur: 'Date validée au-delà du 31/12/2099' });
      }
      return traduire(err, reply);
    }
  });

  app.patch<{ Params: { id: string } }>('/api/projets/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    const user = request.user!;
    const body = modification.safeParse(request.body);
    if (id === null) return reply.code(404).send(introuvable);
    const v = await verdict(request, id, true);
    if (v) return refuser(reply, v);
    if (!body.success) return reply.code(400).send({ erreur: 'Données invalides' });
    const champs = Object.fromEntries(
      Object.entries(body.data).filter(([, v]) => v !== undefined),
    ) as Parameters<typeof modifierProjet>[3];
    // Un chef ne change pas le chef : seule la valeur déjà en place est acceptée (D-028).
    const actuel = (await accesProjet(pool, user, id))?.projet.chef_id;
    if (estChef(user.role) && champs.chef_id !== undefined && champs.chef_id !== actuel) {
      return reply.code(403).send({ erreur: 'Seul l’administrateur désigne le chef de projet' });
    }
    if (champs.chef_id !== undefined && !(await chefValide(pool, champs.chef_id))) {
      return reply.code(422).send({ erreur: 'Chef de projet invalide' });
    }
    if (champs.parent_id != null) {
      const vParent = await verdict(request, champs.parent_id, true);
      if (vParent) return refuser(reply, vParent);
    }
    try {
      const modifie = await transaction(pool, async (db) => {
        await verrouillerRacines(db, champs.parent_id != null ? [id, champs.parent_id] : [id]);
        const { rows } = await db.query<{ clos: boolean; parent_id: number | null }>(
          'SELECT clos, parent_id FROM projet WHERE id = $1',
          [id],
        );
        const avant = rows[0];
        const apres = await modifierProjet(db, user.id, id, champs);
        // D-083 (1), (3) : seules les transitions sont contrôlées (D-083 (7)), après les refus existants.
        if (avant && apres) {
          if (champs.clos === true && !avant.clos && (await projetAEnfantsOuverts(db, id))) {
            throw new RefusCloture('enfants_ouverts');
          }
          const rouvert =
            champs.clos === false && avant.clos && (await projetOuAncetreClos(db, id, false));
          const rattache =
            champs.parent_id != null &&
            champs.parent_id !== avant.parent_id &&
            !apres.clos &&
            (await projetClos(db, champs.parent_id));
          if (rouvert || rattache) throw new RefusCloture('parent_clos');
        }
        return apres;
      });
      return (
        modifie && avecOtp(modifie, modifie.id, await lireOtpProjets(pool, user, [modifie.id]))
      );
    } catch (err) {
      return traduire(err, reply);
    }
  });

  app.delete<{ Params: { id: string } }>('/api/projets/:id', opts, async (request, reply) => {
    const id = identifiant(request.params.id);
    if (id === null) return reply.code(404).send(introuvable);
    const v = await verdict(request, id, true);
    if (v) return refuser(reply, v);
    try {
      await transaction(pool, (db) => supprimerProjet(db, request.user!.id, id));
      return reply.code(204).send();
    } catch (err) {
      if (estReference(err)) {
        return reply.code(409).send({ erreur: 'Le projet a des sous-projets' });
      }
      throw err;
    }
  });
}
