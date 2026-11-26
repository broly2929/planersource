// Lot taux, tranche 1 (D-258) : aides communes de TEQ, TRS, TCH et TDJ.
// Jeu de données de SPEC §12.6 point 11 (cas TRS-A à TRS-N).
import pg from 'pg';
import { expect, vi } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import type { TestCtx } from './helpers.js';
import { appel, corps, creerActeur, type Acteur, type Corps } from './lot1-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import { poserTaux } from './couts-helpers.js';
import { equipe, nommer } from './pilotage-helpers.js';

export const urlTauxEquipe = (equipeId: number | string) => `/api/equipes/${equipeId}/taux`;
export const urlUnTauxEquipe = (id: number | string) => `/api/taux-equipe/${id}`;
export const urlTaux = (utilisateurId: number | string) =>
  `/api/utilisateurs/${utilisateurId}/taux`;
export const urlUnTaux = (id: number | string) => `/api/taux/${id}`;
export const urlDuJour = (date?: string) =>
  date === undefined ? '/api/taux/du-jour' : `/api/taux/du-jour?date=${date}`;

export const INTERDIT = { erreur: 'Interdit' };
export const CHEVAUCHEMENT = {
  erreur: 'Période de taux qui chevauche une autre',
  code: 'taux_chevauchement',
};
export const FIN_AVANT_DEBUT = { erreur: 'La date de fin précède la date de début' };

/** Pose une période de taux d'équipe par l'API (201 attendu). */
export async function ajouterTauxEquipe(
  ctx: TestCtx,
  par: Acteur,
  equipeId: number,
  champs: Corps,
): Promise<Corps & { id: number }> {
  const res = await appel(ctx, par).post(urlTauxEquipe(equipeId), champs);
  expect(res.statusCode, `POST taux d'équipe ${res.body}`).toBe(201);
  return corps(res) as Corps & { id: number };
}

/** Pose une période de taux propre par l'API (201 attendu). */
export async function ajouterTaux(
  ctx: TestCtx,
  par: Acteur,
  utilisateurId: number,
  champs: Corps,
): Promise<Corps & { id: number }> {
  const res = await appel(ctx, par).post(urlTaux(utilisateurId), champs);
  expect(res.statusCode, `POST taux ${res.body}`).toBe(201);
  return corps(res) as Corps & { id: number };
}

/** Rattache un utilisateur à une équipe (ou à aucune) directement en base. */
export async function rattacher(ctx: TestCtx, utilisateurId: number, equipeId: number | null) {
  await ctx.pool.query('UPDATE utilisateur SET equipe_id = $2 WHERE id = $1', [
    utilisateurId,
    equipeId,
  ]);
}

/** Refus : statut, corps exact si donné, base identique (historique compris). */
export async function refus(
  ctx: TestCtx,
  envoyer: () => Promise<LightMyRequestResponse>,
  statut: number,
  attendu?: Corps,
  libelle = '',
): Promise<void> {
  const avant = await empreinte(ctx);
  const res = await envoyer();
  expect(res.statusCode, `${libelle} ${res.body}`).toBe(statut);
  if (attendu) expect(res.json(), libelle).toEqual(attendu);
  expect(await empreinte(ctx), `base modifiée par un refus ${libelle}`).toEqual(avant);
}

const LECTURE_TAUX = /taux_journalier|taux_equipe/;

/**
 * Exécute `action` et compte les requêtes SQL qui lisent ou écrivent une table de taux (texte qui cite
 * `taux_journalier` ou `taux_equipe`), sur tous les clients de pg (pool et transactions).
 */
export async function compterRequetesTaux<T>(
  action: () => Promise<T>,
): Promise<{ resultat: T; requetes: number }> {
  const espion = vi.spyOn(pg.Client.prototype, 'query');
  try {
    const resultat = await action();
    const requetes = espion.mock.calls.filter((args) => {
      const premier = args[0] as unknown;
      const texte =
        typeof premier === 'string'
          ? premier
          : premier && typeof premier === 'object' && 'text' in premier
            ? String((premier as { text: unknown }).text)
            : '';
      return LECTURE_TAUX.test(texte);
    }).length;
    return { resultat, requetes };
  } finally {
    espion.mockRestore();
  }
}

export interface MondeTaux {
  admin: Acteur;
  alice: Acteur;
  dave: Acteur;
  erin: Acteur;
  zoe: Acteur;
  dev: number;
  ops: number;
}

/**
 * SPEC §12.6 point 11 : équipe Dev 400 € du 01/01/2027 au 30/06/2027 ; Ops 300 € à partir du 01/01/2027 ;
 * Alice (Dev) 600 € en janvier 2027 et 700 € en mars 2027 ; Dave (Dev) sans taux propre ; Erin (sans
 * équipe) sans taux ; Zoé non ressource, membre de Dev. Taux d'équipe posés par l'API.
 */
export async function creerMondeTaux(ctx: TestCtx): Promise<MondeTaux> {
  const admin = await nommer(
    ctx,
    await creerActeur(ctx, 'admin@taux.test', 'administrateur'),
    'Admin',
  );
  const alice = await nommer(
    ctx,
    await creerActeur(ctx, 'alice@taux.test', 'ressource', true),
    'Alice',
  );
  const dave = await nommer(
    ctx,
    await creerActeur(ctx, 'dave@taux.test', 'ressource', true),
    'Dave',
  );
  const erin = await nommer(
    ctx,
    await creerActeur(ctx, 'erin@taux.test', 'ressource', true),
    'Erin',
  );
  const zoe = await nommer(ctx, await creerActeur(ctx, 'zoe@taux.test', 'chef_de_projet'), 'Zoé');
  const dev = await equipe(ctx, 'Dev');
  const ops = await equipe(ctx, 'Ops');
  for (const u of [alice, dave, zoe]) await rattacher(ctx, u.id, dev);
  await poserTaux(ctx, alice.id, [
    ['2027-01-01', '2027-01-31', 600],
    ['2027-03-01', '2027-03-31', 700],
  ]);
  await ajouterTauxEquipe(ctx, admin, dev, {
    debut: '2027-01-01',
    fin: '2027-06-30',
    montant: 400,
  });
  await ajouterTauxEquipe(ctx, admin, ops, { debut: '2027-01-01', montant: 300 });
  return { admin, alice, dave, erin, zoe, dev, ops };
}
