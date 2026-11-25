// Jeu de données de SPEC §12.3 (COUT-6) pour les tests d'API de couts-2 (D-229).
import { expect } from 'vitest';
import type { TestCtx } from './helpers.js';
import { affecter, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerAssignation, type Objet } from './lot1-t2-helpers.js';

export const JOUR = '2027-01-15';

/** Taux de SPEC §12.3 : Alice (deux périodes) et Carol ; Bob n'en a pas. */
export async function poserTaux(
  ctx: TestCtx,
  utilisateurId: number,
  periodes: [string, string | null, number][],
) {
  for (const [debut, fin, montant] of periodes) {
    await ctx.pool.query(
      'INSERT INTO taux_journalier (utilisateur_id, debut, fin, montant) VALUES ($1, $2, $3, $4)',
      [utilisateurId, debut, fin, montant],
    );
  }
}

export interface MondeCouts {
  admin: Acteur;
  chef: Acteur;
  /** Chef affecté en ressource à un projet qu'il ne dirige pas : lecture seule. */
  lecteur: Acteur;
  /** Ressource affectée au projet. */
  alice: Acteur;
  carol: Acteur;
  autreChef: Acteur;
  projet: Objet;
  p: Objet;
  f1: Objet;
  f2: Objet;
  assignationF1: Objet;
  assignationF2: Objet;
}

/** COUT-6 : projet « OTP-A », P (1), F1 (1.1) Alice 5 j reste 5 j, F2 (1.2) Carol 2 j reste 2 j. */
export async function creerMondeCouts(ctx: TestCtx): Promise<MondeCouts> {
  const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
  const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
  const autreChef = await creerActeur(ctx, 'autre@example.test', 'chef_de_projet');
  const lecteur = await creerActeur(ctx, 'lecteur@example.test', 'chef_de_projet', true);
  const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
  const carol = await creerActeur(ctx, 'carol@example.test', 'ressource', true);
  const projet = await creerProjet(ctx, admin, { code: 'PCOUT', chef_id: chef.id, otp: 'OTP-A' });
  for (const r of [alice, carol, lecteur]) await affecter(ctx, projet.id, r.id);
  await poserTaux(ctx, alice.id, [
    ['2027-01-01', '2027-01-31', 600],
    ['2027-02-01', null, 700],
  ]);
  await poserTaux(ctx, carol.id, [['2027-03-01', '2027-03-31', 500]]);
  const p = await creerActivite(ctx, admin, projet.id, { nom: 'P' });
  const f1 = await creerActivite(ctx, admin, projet.id, { nom: 'F1', parent_id: p.id });
  const f2 = await creerActivite(ctx, admin, projet.id, { nom: 'F2', parent_id: p.id });
  const assignationF1 = await creerAssignation(ctx, admin, f1.id, alice.id, { charge_assignee: 5 });
  const assignationF2 = await creerAssignation(ctx, admin, f2.id, carol.id, { charge_assignee: 2 });
  await ctx.pool.query('UPDATE assignation SET reste_a_faire = charge_assignee');
  const verif = await ctx.pool.query('SELECT count(*)::int AS n FROM assignation');
  expect(verif.rows[0].n).toBe(2);
  return {
    admin,
    chef,
    lecteur,
    alice,
    carol,
    autreChef,
    projet,
    p,
    f1,
    f2,
    assignationF1,
    assignationF2,
  };
}
