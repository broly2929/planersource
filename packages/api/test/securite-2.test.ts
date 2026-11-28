// Lot securite-2 (D-274) : SEC-2, SEC-3, SEC-7. SC2T-1 à SC2T-16.
// Valeurs attendues recopiées de SPEC §8, « Corrections de sécurité (securite-2, D-274) », cas SC2-1 à SC2-16.
import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { createAdmin } from '../src/auth/create-admin.js';
import { creerAdminInitial } from '../src/auth/dev-admin.js';
import { remplirDemo } from '../src/demo/remplir.js';
import { MOT_DE_PASSE, login, releve, seedUser, useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet, type Acteur } from './lot1-helpers.js';
import { creerActivite, creerAssignation } from './lot1-t2-helpers.js';
import { agir, imputer, S1 } from './lot4a-helpers.js';
import {
  creerMondeDroits,
  INTERDIT,
  JOUR,
  leaderDe,
  lire,
  refusSansEffet,
  requete,
  type MondeDroits,
} from './droits-helpers.js';
import { ajouterTaux } from './taux-helpers.js';

const MSG_LONGUEUR = { erreur: 'Le mot de passe doit contenir au moins 12 caractères.' };
const journal = { warn: () => undefined };

interface Ligne {
  entite: string;
  operation: string;
  champ: string | null;
  ancienne_valeur: Record<string, unknown> | null;
  nouvelle_valeur: Record<string, unknown> | null;
}

/** Monde de droits complété (SPEC §8 securite-2 : Carl, PC, activités à `charge_vendue`). */
async function monde(ctx: TestCtx) {
  const m = await creerMondeDroits(ctx);
  // Une activité de P à `charge_vendue` 10 (créée par le monde), modifiée à 12 et renommée.
  const modif = await appel(ctx, m.admin).patch(`/api/activites/${m.fp.id}`, {
    charge_vendue: 12,
    nom: 'Feuille P renommée',
  });
  expect(modif.statusCode, modif.body).toBe(200);
  // Une autre activité de P créée avec `charge_vendue` 3, puis supprimée.
  const x = await creerActivite(ctx, m.admin, m.p.id, { nom: 'Feuille X', charge_vendue: 3 });
  const suppr = await appel(ctx, m.admin).delete(`/api/activites/${x.id}`);
  expect(suppr.statusCode, suppr.body).toBe(204);
  return m;
}

/** Carl : chef de projet et ressource, chef de PC, assigné sur une activité de PC, feuille S1 soumise. */
async function avecCarl(ctx: TestCtx, m: MondeDroits) {
  const carl = await creerActeur(ctx, 'carl@example.test', 'chef_de_projet', true);
  const pc = await creerProjet(ctx, m.admin, { code: 'PCC', nom: 'Projet PC', chef_id: carl.id });
  await affecter(ctx, pc.id, carl.id);
  await affecter(ctx, pc.id, m.alice.id);
  const act = await creerActivite(ctx, m.admin, pc.id, { nom: 'Activité PC' });
  const assCarl = await creerAssignation(ctx, m.admin, act.id, carl.id, { charge_assignee: 3 });
  await imputer(ctx, carl, S1, [
    { assignation_id: assCarl.id, imputations: [{ jour: '2027-01-05', charge: 1 }] },
  ]);
  const feuille = await requete(ctx, carl, 'GET', `/api/feuilles?semaine=${S1}`);
  const id = (feuille.json() as { feuille: { id: number } }).feuille.id;
  await agir(ctx, carl, id, 'soumettre');
  return { carl, pc, feuilleCarl: id };
}

describe('SEC-2 : historique d’un projet et finances (SPEC §8 securite-2 point 1)', () => {
  const ctx = useTestApp(() => JOUR);

  const historique = (qui: Acteur, projetId: number) =>
    lire<Ligne[]>(ctx, qui, `/api/projets/${projetId}/historique`);
  const activite = (l: Ligne[]) => l.filter((x) => x.entite === 'activite');

  it('SC2T-1 : le leader ne lit aucune ligne `charge_vendue` ; autres lignes présentes (SC2-1)', async () => {
    const m = await monde(ctx);
    const leader = leaderDe(m);
    const admin = await historique(m.admin, m.p.id);
    const vu = await historique(leader, m.p.id);
    const lignesVendu = admin.filter((l) => l.champ === 'charge_vendue');
    expect(lignesVendu.length).toBeGreaterThan(0);
    expect(vu.filter((l) => l.champ === 'charge_vendue')).toEqual([]);
    expect(vu.some((l) => l.champ === 'nom' && l.operation === 'modification')).toBe(true);
    expect(vu).toHaveLength(admin.length - lignesVendu.length);
  });

  it('SC2T-2 : le leader lit les créations et suppressions d’activité sans la clé `charge_vendue` (SC2-2)', async () => {
    const m = await monde(ctx);
    const leader = leaderDe(m);
    const vu = activite(await historique(leader, m.p.id));
    const creations = vu.filter((l) => l.operation === 'creation');
    const suppressions = vu.filter((l) => l.operation === 'suppression');
    expect(creations.length).toBeGreaterThan(0);
    expect(suppressions).toHaveLength(1);
    for (const l of creations) {
      expect(Object.keys(l.nouvelle_valeur!)).not.toContain('charge_vendue');
      expect(Object.keys(l.nouvelle_valeur!)).toContain('nom');
    }
    expect(Object.keys(suppressions[0]!.ancienne_valeur!)).not.toContain('charge_vendue');
    expect(suppressions[0]!.ancienne_valeur!.nom).toBe('Feuille X');
  });

  it('SC2T-3 : administrateur et chef C lisent la ligne 10 → 12 et la clé dans création et suppression (SC2-3)', async () => {
    const m = await monde(ctx);
    for (const qui of [m.admin, m.chef]) {
      const l = activite(await historique(qui, m.p.id));
      const ligne = l.find((x) => x.champ === 'charge_vendue');
      expect(ligne, qui.email).toBeDefined();
      expect(ligne).toMatchObject({ ancienne_valeur: 10, nouvelle_valeur: 12 });
      expect(
        l.some((x) => x.operation === 'creation' && 'charge_vendue' in x.nouvelle_valeur!),
      ).toBe(true);
      const suppr = l.find((x) => x.operation === 'suppression')!;
      expect(suppr.ancienne_valeur).toHaveProperty('charge_vendue', 3);
    }
  });
});

describe('SEC-3a : validation de sa propre feuille (SPEC §8 securite-2 point 2)', () => {
  const ctx = useTestApp(() => JOUR);

  it('SC2T-4 : le chef ressource ne valide, rejette ni dévalide sa feuille : 403, base inchangée (SC2-4)', async () => {
    const m = await creerMondeDroits(ctx);
    const { carl, feuilleCarl } = await avecCarl(ctx, m);
    const sur = (qui: Acteur, verbe: string, payload?: unknown) => () =>
      requete(ctx, qui, 'POST', `/api/feuilles/${feuilleCarl}/${verbe}`, payload);
    await refusSansEffet(ctx, 403, sur(carl, 'valider', {}), INTERDIT, 'valider soumise');
    await refusSansEffet(ctx, 403, sur(carl, 'rejeter', { commentaire: 'x' }), INTERDIT, 'rejeter');
    await agir(ctx, m.admin, feuilleCarl, 'valider');
    await refusSansEffet(ctx, 403, sur(carl, 'valider', {}), INTERDIT, 'valider validée');
    await refusSansEffet(ctx, 403, sur(carl, 'devalider'), INTERDIT, 'dévalider');
  });

  it('SC2T-5 : le leader ressource ne valide, rejette ni dévalide sa feuille : 403, base inchangée (SC2-5)', async () => {
    const m = await creerMondeDroits(ctx);
    const leader = leaderDe(m);
    await imputer(ctx, leader, S1, [
      { assignation_id: m.leaderFp2!.id, imputations: [{ jour: '2027-01-05', charge: 1 }] },
    ]);
    const lue = await requete(ctx, leader, 'GET', `/api/feuilles?semaine=${S1}`);
    const id = (lue.json() as { feuille: { id: number } }).feuille.id;
    await agir(ctx, leader, id, 'soumettre');
    const sur = (verbe: string, payload?: unknown) => () =>
      requete(ctx, leader, 'POST', `/api/feuilles/${id}/${verbe}`, payload);
    await refusSansEffet(ctx, 403, sur('valider', {}), INTERDIT, 'valider soumise');
    await refusSansEffet(ctx, 403, sur('rejeter', { commentaire: 'x' }), INTERDIT, 'rejeter');
    await agir(ctx, m.admin, id, 'valider');
    await refusSansEffet(ctx, 403, sur('valider', {}), INTERDIT, 'valider validée');
    await refusSansEffet(ctx, 403, sur('devalider'), INTERDIT, 'dévalider');
  });

  it('SC2T-6 : l’administrateur valide la feuille d’un chef et la sienne (SC2-6)', async () => {
    const m = await creerMondeDroits(ctx);
    const { feuilleCarl, pc } = await avecCarl(ctx, m);
    await agir(ctx, m.admin, feuilleCarl, 'valider');
    const adminRes = await creerActeur(ctx, 'adminres@example.test', 'administrateur', true);
    await affecter(ctx, pc.id, adminRes.id);
    const act = await creerActivite(ctx, m.admin, pc.id, { nom: 'Activité admin' });
    const ass = await creerAssignation(ctx, m.admin, act.id, adminRes.id, { charge_assignee: 2 });
    await imputer(ctx, adminRes, S1, [
      { assignation_id: ass.id, imputations: [{ jour: '2027-01-05', charge: 1 }] },
    ]);
    const lue = await requete(ctx, adminRes, 'GET', `/api/feuilles?semaine=${S1}`);
    const id = (lue.json() as { feuille: { id: number } }).feuille.id;
    await agir(ctx, adminRes, id, 'soumettre');
    const res = await requete(ctx, adminRes, 'POST', `/api/feuilles/${id}/valider`, {});
    expect(res.statusCode, res.body).toBe(200);
  });
});

describe('SEC-3b : son propre taux (SPEC §8 securite-2 point 3)', () => {
  const ctx = useTestApp(() => JOUR);

  it('SC2T-7 : le chef n’écrit pas son propre taux : 403 même corps invalide, base inchangée ; lecture 200 (SC2-7)', async () => {
    const m = await creerMondeDroits(ctx);
    const { carl } = await avecCarl(ctx, m);
    const taux = await ajouterTaux(ctx, m.admin, carl.id, {
      debut: '2027-01-01',
      fin: '2027-12-31',
      montant: 500,
    });
    await refusSansEffet(
      ctx,
      403,
      () =>
        requete(ctx, carl, 'POST', `/api/utilisateurs/${carl.id}/taux`, {
          debut: '2028-01-01',
          montant: 700,
        }),
      INTERDIT,
      'POST',
    );
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, carl, 'POST', `/api/utilisateurs/${carl.id}/taux`, { montant: 'x' }),
      INTERDIT,
      'POST invalide',
    );
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, carl, 'PATCH', `/api/taux/${taux.id}`, { montant: 600 }),
      INTERDIT,
      'PATCH',
    );
    await refusSansEffet(
      ctx,
      403,
      () => requete(ctx, carl, 'DELETE', `/api/taux/${taux.id}`),
      INTERDIT,
      'DELETE',
    );
    const lecture = await requete(ctx, carl, 'GET', `/api/utilisateurs/${carl.id}/taux`);
    expect(lecture.statusCode, lecture.body).toBe(200);
  });

  it('SC2T-8 : le chef écrit le taux d’une ressource de son projet ; l’administrateur écrit le sien (SC2-8)', async () => {
    const m = await creerMondeDroits(ctx);
    const { carl, pc } = await avecCarl(ctx, m);
    await affecter(ctx, pc.id, m.zoe.id);
    const cree = await requete(ctx, carl, 'POST', `/api/utilisateurs/${m.zoe.id}/taux`, {
      debut: '2028-01-01',
      montant: 650,
    });
    expect(cree.statusCode, cree.body).toBe(201);
    const id = (corps(cree) as { id: number }).id;
    const modif = await requete(ctx, carl, 'PATCH', `/api/taux/${id}`, { montant: 660 });
    expect(modif.statusCode, modif.body).toBe(200);
    const suppr = await requete(ctx, carl, 'DELETE', `/api/taux/${id}`);
    expect(suppr.statusCode, suppr.body).toBe(204);

    const adminRes = await creerActeur(ctx, 'adminres@example.test', 'administrateur', true);
    await affecter(ctx, pc.id, adminRes.id);
    const propre = await requete(ctx, adminRes, 'POST', `/api/utilisateurs/${adminRes.id}/taux`, {
      debut: '2027-01-01',
      montant: 800,
    });
    expect(propre.statusCode, propre.body).toBe(201);
  });
});

describe('SEC-7 : longueur minimale du mot de passe (SPEC §8 securite-2 point 4)', () => {
  const ctx = useTestApp(() => JOUR);

  const creer = (admin: Acteur, email: string, motDePasse: string) =>
    requete(ctx, admin, 'POST', '/api/utilisateurs', {
      nom: 'Nouveau',
      email,
      mot_de_passe: motDePasse,
      role: 'ressource',
    });
  const admin = () => creerActeur(ctx, 'admin@example.test', 'administrateur');
  const avecMotDePasse = async (email: string, motDePasse: string): Promise<number> => {
    const id = await seedUser(ctx.pool, { email });
    await ctx.pool.query('UPDATE utilisateur SET mot_de_passe_hash = $2 WHERE id = $1', [
      id,
      await argon2.hash(motDePasse),
    ]);
    return id;
  };

  it('SC2T-9 : création avec 11 caractères → 400 et message, rien d’écrit ; 12 → 201 (SC2-9)', async () => {
    const a = await admin();
    await refusSansEffet(
      ctx,
      400,
      () => creer(a, 'n11@example.test', 'abcdefghijk'),
      MSG_LONGUEUR,
      '11 caractères',
    );
    const res = await creer(a, 'n12@example.test', 'abcdefghijkl');
    expect(res.statusCode, res.body).toBe(201);
  });

  it('SC2T-10 : points de code Unicode, espaces non retirées (SC2-10)', async () => {
    const a = await admin();
    await refusSansEffet(
      ctx,
      400,
      () => creer(a, 'e6@example.test', '😀'.repeat(6)),
      MSG_LONGUEUR,
      'six émojis (12 unités UTF-16)',
    );
    const cas: [string, string][] = [
      ['e12@example.test', '😀'.repeat(12)],
      ['esp1@example.test', 'abcdefghijk '],
      ['esp12@example.test', ' '.repeat(12)],
    ];
    for (const [email, mdp] of cas) {
      const res = await creer(a, email, mdp);
      expect(res.statusCode, `${email} ${res.body}`).toBe(201);
    }
  });

  it('SC2T-11 : PATCH avec 11 caractères → 400, hash et sessions inchangés ; 12 → 200 ; sans mot de passe → 200 (SC2-11)', async () => {
    const a = await admin();
    const id = await avecMotDePasse('court@example.test', 'abcde');
    await login(ctx.app, 'court@example.test', 'abcde');
    await refusSansEffet(
      ctx,
      400,
      () => requete(ctx, a, 'PATCH', `/api/utilisateurs/${id}`, { mot_de_passe: 'abcdefghijk' }),
      MSG_LONGUEUR,
      '11 caractères',
    );
    const sans = await requete(ctx, a, 'PATCH', `/api/utilisateurs/${id}`, { nom: 'Court' });
    expect(sans.statusCode, sans.body).toBe(200);
    const bon = await requete(ctx, a, 'PATCH', `/api/utilisateurs/${id}`, {
      mot_de_passe: 'abcdefghijkl',
    });
    expect(bon.statusCode, bon.body).toBe(200);
    expect((await login(ctx.app, 'court@example.test', 'abcdefghijkl')).status).toBe(200);
  });

  it('SC2T-12 : changement par l’utilisateur, ordre des refus puis 204 à 12 caractères (SC2-12)', async () => {
    const id = await avecMotDePasse('court6@example.test', 'court1');
    const moi = await seedUser(ctx.pool, { email: 'moi@example.test' });
    const { cookie } = await login(ctx.app, 'moi@example.test');
    const u = { id: moi, email: 'moi@example.test', cookie: cookie ?? '' };
    const changer = (acteur: Acteur, payload: Record<string, unknown>) => () =>
      requete(ctx, acteur, 'POST', '/api/auth/mot-de-passe', payload);
    await refusSansEffet(
      ctx,
      400,
      changer(u, { actuel: MOT_DE_PASSE, nouveau: 'abcdefghijk' }),
      MSG_LONGUEUR,
      '11 caractères',
    );
    await refusSansEffet(
      ctx,
      400,
      changer(u, { actuel: 'faux-faux-faux', nouveau: 'abcdefghijk' }),
      { erreur: 'Mot de passe actuel incorrect' },
      'actuel faux',
    );
    const court = await login(ctx.app, 'court6@example.test', 'court1');
    const c = { id, email: 'court6@example.test', cookie: court.cookie ?? '' };
    await refusSansEffet(
      ctx,
      400,
      changer(c, { actuel: 'court1', nouveau: 'court1' }),
      MSG_LONGUEUR,
      'nouveau égal à l’actuel, court',
    );
    const bon = await changer(u, { actuel: MOT_DE_PASSE, nouveau: 'abcdefghijkl' })();
    expect(bon.statusCode, bon.body).toBe(204);
  });

  it('SC2T-13 : create-admin refuse 11 caractères sans rien écrire ; 12 → créé (SC2-13)', async () => {
    await expect(
      createAdmin(ctx.pool, { login: 'boss', nom: 'Boss', motDePasse: 'abcdefghijk' }),
    ).rejects.toThrow(MSG_LONGUEUR.erreur);
    expect(await releve(ctx, 'utilisateur')).toEqual([]);
    const r = await createAdmin(ctx.pool, {
      login: 'boss',
      nom: 'Boss',
      motDePasse: 'abcdefghijkl',
    });
    expect(r.created).toBe(true);
  });

  it('SC2T-14 : la connexion d’un mot de passe existant de 5 caractères reste possible (SC2-14)', async () => {
    await avecMotDePasse('ancien@example.test', 'abcde');
    expect((await login(ctx.app, 'ancien@example.test', 'abcde')).status).toBe(200);
  });

  it('SC2T-15 : compte initial admin/admin, changement imposé : 11 refusé, 12 accepté (SC2-15)', async () => {
    const r = await creerAdminInitial(ctx.pool, { nodeEnv: 'production' }, journal);
    expect(r.created).toBe(true);
    const connexion = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: 'admin' },
    });
    expect(connexion.statusCode).toBe(200);
    const c = connexion.cookies.find((x) => x.name === 'session')!;
    const cookie = `${c.name}=${c.value}`;
    const doitChanger = async () =>
      (
        await ctx.pool.query<{ d: boolean }>(
          "SELECT doit_changer_mot_de_passe AS d FROM utilisateur WHERE login = 'admin'",
        )
      ).rows.map((x) => x.d);
    const envoi = (nouveau: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/api/auth/mot-de-passe',
        headers: { cookie },
        payload: { actuel: 'admin', nouveau },
      });
    const avant = await releve(ctx, 'utilisateur');
    const court = await envoi('abcdefghijk');
    expect(court.statusCode).toBe(400);
    expect(court.json()).toEqual(MSG_LONGUEUR);
    expect(await doitChanger()).toEqual([true]);
    expect(await releve(ctx, 'utilisateur')).toEqual(avant);
    expect((await envoi('abcdefghijkl')).statusCode).toBe(204);
    expect(await doitChanger()).toEqual([false]);
  });

  it('SC2T-16 : démonstration : chefa, chefb, alice, bob par `<identifiant>-demonstration`, admin/admin (SC2-16)', async () => {
    await creerAdminInitial(ctx.pool, { nodeEnv: 'development' }, journal);
    await remplirDemo(ctx.app, { lundi: '2027-01-04' });
    for (const id of ['chefa', 'chefb', 'alice', 'bob']) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { identifiant: id, mot_de_passe: `${id}-demonstration` },
      });
      expect(res.statusCode, id).toBe(200);
    }
    const admin = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { identifiant: 'admin', mot_de_passe: 'admin' },
    });
    expect(admin.statusCode).toBe(200);
  });
});
