import { describe, expect, it } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, type Acteur } from './lot1-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import {
  assigner,
  creerMondePilotage,
  nommer,
  planifier,
  projet,
  sansEffet,
} from './pilotage-helpers.js';

/**
 * GET /api/couts/export (SPEC §12.5 point 5, D-243) : PIL-11 à PIL-14.
 * Fichier attendu recopié de l'exemple de la SPEC (BOM, « ; », CRLF).
 */

const BOM = '﻿';
const TYPE = 'text/csv; charset=utf-8';
const ENTETE =
  'Projet;OTP;Ressource;01/2027;02/2027;03/2027;04/2027;05/2027;06/2027;07/2027;08/2027;09/2027;10/2027;11/2027;12/2027;Total;Taux manquant';
const TOTAL_VIDE = 'Total;;;0;0;0;0;0;0;0;0;0;0;0;0;0;non';

const adresse = (requete: string) => `/api/couts/export${requete}`;

/** Fichier de l'exemple de la SPEC ; `carol` remplace le nom de la ressource Carol. */
const exemple = (carol = 'Carol'): string[] => [
  ENTETE,
  'P1 · Projet un;OTP-A;Total;750;1050;500;0;0;0;0;0;0;0;0;0;2300;oui',
  'P1 · Projet un;OTP-A;Alice;750;1050;0;0;0;0;0;0;0;0;0;0;1800;non',
  'P1 · Projet un;OTP-A;Bob;0;0;0;0;0;0;0;0;0;0;0;0;0;non',
  `P1 · Projet un;OTP-A;${carol};0;0;500;0;0;0;0;0;0;0;0;0;500;oui`,
  'P1.1 · Sous-projet un;OTP-A;Total;600;0;0;0;0;0;0;0;0;0;0;0;600;non',
  'P1.1 · Sous-projet un;OTP-A;Alice;600;0;0;0;0;0;0;0;0;0;0;0;600;non',
  'Total;;;1350;1050;500;0;0;0;0;0;0;0;0;0;2900;oui',
];

const fichier = (lignes: string[]) => `${BOM}${lignes.join('\r\n')}\r\n`;

const exporter = async (
  ctx: TestCtx,
  qui: Acteur,
  requete: string,
): Promise<LightMyRequestResponse> => {
  const res = await appel(ctx, qui).get(adresse(requete));
  expect(res.statusCode, res.body).toBe(200);
  return res;
};

describe('GET /api/couts/export', () => {
  const ctx = useTestApp();

  it('PIL-11 : administrateur, fichier exact de l’exemple de la SPEC, en-têtes HTTP et nom du fichier', async () => {
    const m = await creerMondePilotage(ctx);
    const res = await exporter(ctx, m.admin, '?debut=2027-01');
    expect(res.body).toBe(fichier(exemple()));
    expect(res.headers['content-type']).toBe(TYPE);
    expect(res.headers['content-disposition']).toBe('attachment; filename="couts-2027-01.csv"');
  });

  it('PIL-12 : aucun projet, en-tête puis ligne « Total » à 0 (aussi pour une équipe inconnue)', async () => {
    const admin = await nommer(
      ctx,
      await creerActeur(ctx, 'a@pil.test', 'administrateur'),
      'Admin',
    );
    const vide = await exporter(ctx, admin, '?debut=2027-01');
    expect(vide.body).toBe(fichier([ENTETE, TOTAL_VIDE]));
    expect(vide.headers['content-disposition']).toBe('attachment; filename="couts-2027-01.csv"');

    const m = await creerMondePilotage(ctx);
    const inconnue = await exporter(ctx, m.admin, '?debut=2027-01&equipe=9999');
    expect(inconnue.body).toBe(fichier([ENTETE, TOTAL_VIDE]));
    const horsPeriode = await exporter(ctx, m.admin, '?debut=2028-01');
    expect(horsPeriode.body).toBe(
      fichier([ENTETE.replace(/\d\d\/2027/g, (x) => x.replace('2027', '2028')), TOTAL_VIDE]),
    );
  });

  it('PIL-13 : chef de projet, seulement ses projets ; ressource inactive « (inactif) »', async () => {
    const m = await creerMondePilotage(ctx);
    const autreChef = await nommer(
      ctx,
      await creerActeur(ctx, 'autre@pil.test', 'chef_de_projet'),
      'Autre',
    );
    const secret = await projet(ctx, m.admin, 'ZSECRET', autreChef, { nom: 'Nom cache' });
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [m.chef.id]);
    await affecter(ctx, secret.id, m.chef.id);
    await planifier(ctx, await assigner(ctx, m.admin, secret.id, m.alice, 'S'), '2027-01-20', 3);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [m.carol.id]);

    const res = await exporter(ctx, m.chef, '?debut=2027-01');
    expect(res.body).toBe(fichier(exemple('Carol (inactif)')));
    expect(res.body).not.toContain('ZSECRET');
    expect(res.body).not.toContain('Nom cache');
    const admin = await exporter(ctx, m.admin, '?debut=2027-01');
    expect(admin.body).toContain('ZSECRET · Nom cache');
  });

  it('PIL-14 : refus et ordre (401, 403 rôle ressource avant 400, 400), base inchangée', async () => {
    const m = await creerMondePilotage(ctx);
    await sansEffet(ctx, 401, () => appel(ctx).get(adresse('?debut=2027-01')), 'sans session');
    await sansEffet(ctx, 401, () => appel(ctx).get(adresse('?debut=abc')), '401 avant 400');
    for (const requete of ['?debut=2027-01', '?debut=abc', '']) {
      const res = await sansEffet(
        ctx,
        403,
        () => appel(ctx, m.alice).get(adresse(requete)),
        requete,
      );
      expect(corps(res)).toEqual({ erreur: 'Interdit' });
    }
    for (const requete of [
      '',
      '?debut=2027-13',
      '?debut=1999-12',
      '?debut=2100-01',
      '?debut=2027-01&equipe=abc',
    ]) {
      await sansEffet(ctx, 400, () => appel(ctx, m.admin).get(adresse(requete)), requete);
      await sansEffet(ctx, 400, () => appel(ctx, m.chef).get(adresse(requete)), requete);
    }
    const avant = await empreinte(ctx);
    await exporter(ctx, m.admin, '?debut=2027-01');
    await exporter(ctx, m.chef, '?debut=2027-01&equipe=aucune');
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
