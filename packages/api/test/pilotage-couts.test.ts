import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, corps, creerActeur } from './lot1-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import { poserTaux } from './couts-helpers.js';
import {
  MOIS,
  assigner,
  creerMondePilotage,
  equipe,
  imputer,
  lire,
  mensuel,
  nommer,
  planifier,
  projet,
  reponseAttendue,
  ressourcesAttendues,
  sansEffet,
  total,
} from './pilotage-helpers.js';

/**
 * GET /api/couts (SPEC §12.5 points 2 à 4 et 6, D-243) : PIL-6 à PIL-10.
 * Valeurs attendues recopiées de la SPEC ; travail planifié et imputations posés par SQL.
 */

describe('GET /api/couts', () => {
  const ctx = useTestApp();

  it('PIL-6 : administrateur, PIL-A à PIL-E de bout en bout, forme exacte de la réponse', async () => {
    const m = await creerMondePilotage(ctx);
    const res = await lire(ctx, m.admin, '?debut=2027-01');
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual(reponseAttendue(m));
  });

  it('PIL-7 : périmètre (clos présent, modèle, projet sans charge et charge hors période absents), inactif présent, tris', async () => {
    const admin = await nommer(
      ctx,
      await creerActeur(ctx, 'a@pil.test', 'administrateur'),
      'Admin',
    );
    const alice = await nommer(
      ctx,
      await creerActeur(ctx, 'al@pil.test', 'ressource', true),
      'alice',
    );
    const bernard = await nommer(
      ctx,
      await creerActeur(ctx, 'be@pil.test', 'ressource', true),
      'Bernard',
    );
    const zoe = await nommer(ctx, await creerActeur(ctx, 'zo@pil.test', 'ressource', true), 'Zoé');
    await poserTaux(ctx, alice.id, [['2027-01-01', null, 100]]);
    const bDeux = await projet(ctx, admin, 'b-deux', admin);
    const aUn = await projet(ctx, admin, 'A-un', admin);
    const cClos = await projet(ctx, admin, 'C-clos', admin);
    const dModele = await projet(ctx, admin, 'D-modele', admin);
    const eVide = await projet(ctx, admin, 'E-vide', admin);
    const fHors = await projet(ctx, admin, 'F-hors', admin);
    await affecter(ctx, eVide.id, alice.id);

    await planifier(ctx, await assigner(ctx, admin, aUn.id, zoe, 'Z'), '2027-02-10', 2);
    await planifier(ctx, await assigner(ctx, admin, aUn.id, bernard, 'B'), '2027-02-11', 1);
    await planifier(ctx, await assigner(ctx, admin, aUn.id, alice, 'A'), '2027-01-10', 1);
    await imputer(ctx, await assigner(ctx, admin, bDeux.id, alice, 'A2'), '2027-03-01', 1);
    await planifier(ctx, await assigner(ctx, admin, cClos.id, alice, 'A3'), '2027-04-05', 1);
    await planifier(ctx, await assigner(ctx, admin, dModele.id, alice, 'A4'), '2027-05-03', 1);
    await planifier(ctx, await assigner(ctx, admin, fHors.id, alice, 'A5'), '2028-03-06', 1);
    await ctx.pool.query('UPDATE projet SET clos = true WHERE id = $1', [cClos.id]);
    await ctx.pool.query('UPDATE projet SET est_modele = true WHERE id = $1', [dModele.id]);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [zoe.id]);

    const res = await lire(ctx, admin, '?debut=2027-01');
    expect(res.statusCode, res.body).toBe(200);
    const { projets } = corps(res) as {
      projets: {
        code: string;
        clos: boolean;
        ressources: { nom: string; actif: boolean }[];
      }[];
    };
    expect(projets.map((p) => [p.code, p.clos])).toEqual([
      ['A-un', false],
      ['b-deux', false],
      ['C-clos', true],
    ]);
    expect(projets[0]!.ressources.map((r) => [r.nom, r.actif])).toEqual([
      ['alice', true],
      ['Bernard', true],
      ['Zoé', false],
    ]);
    for (const absent of ['D-modele', 'E-vide', 'F-hors']) {
      expect(res.body, absent).not.toContain(absent);
    }
  });

  it('PIL-8 : filtre équipe, « aucune », équipe inconnue', async () => {
    const m = await creerMondePilotage(ctx);
    const dev = await equipe(ctx, 'Dev');
    const ops = await equipe(ctx, 'Ops');
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = $2 WHERE id = $1', [m.alice.id, dev]);
    await ctx.pool.query('UPDATE utilisateur SET equipe_id = $2 WHERE id = $1', [m.bob.id, ops]);
    const r = ressourcesAttendues(m);
    const attendu = reponseAttendue(m);

    const resDev = await lire(ctx, m.admin, `?debut=2027-01&equipe=${dev}`);
    expect(resDev.statusCode, resDev.body).toBe(200);
    expect(resDev.json()).toEqual({
      mois: MOIS,
      projets: [
        {
          ...attendu.projets[0]!,
          mois: mensuel({ '2027-01': [600, 150, 750], '2027-02': [700, 350, 1050] }),
          total: total(1300, 500, 1800),
          ressources: [r.p1[0]],
        },
        attendu.projets[1],
      ],
      total: {
        mois: mensuel({ '2027-01': [600, 750, 1350], '2027-02': [700, 350, 1050] }),
        total: total(1300, 1100, 2400),
      },
    });

    const resOps = await lire(ctx, m.admin, `?debut=2027-01&equipe=${ops}`);
    expect(resOps.json()).toEqual({
      mois: MOIS,
      projets: [
        {
          ...attendu.projets[0]!,
          mois: mensuel(),
          total: total(0, 0, 0),
          ressources: [r.p1[1]],
        },
      ],
      total: { mois: mensuel(), total: total(0, 0, 0) },
    });

    const resAucune = await lire(ctx, m.admin, '?debut=2027-01&equipe=aucune');
    expect(resAucune.json()).toEqual({
      mois: MOIS,
      projets: [
        {
          ...attendu.projets[0]!,
          mois: mensuel({ '2027-03': [0, 500, 500], '2027-04': [0, 0, 0, true] }),
          total: total(0, 500, 500, true),
          ressources: [r.p1[2]],
        },
      ],
      total: {
        mois: mensuel({ '2027-03': [0, 500, 500], '2027-04': [0, 0, 0, true] }),
        total: total(0, 500, 500, true),
      },
    });

    for (const inconnue of ['9999', '99999999999']) {
      const res = await lire(ctx, m.admin, `?debut=2027-01&equipe=${inconnue}`);
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toEqual({
        mois: MOIS,
        projets: [],
        total: { mois: mensuel(), total: total(0, 0, 0) },
      });
    }
  });

  it('PIL-9 : chef de projet, seulement ses projets peut_ecrire, total limité, aucun code ni nom des autres', async () => {
    const m = await creerMondePilotage(ctx);
    const autreChef = await nommer(
      ctx,
      await creerActeur(ctx, 'autre@pil.test', 'chef_de_projet'),
      'Autre',
    );
    const lecteur = await nommer(
      ctx,
      await creerActeur(ctx, 'lecteur@pil.test', 'chef_de_projet', true),
      'Lecteur',
    );
    // Projet d'un autre chef, que `chef` lit (affecté en ressource) sans pouvoir y écrire.
    await ctx.pool.query('UPDATE utilisateur SET est_ressource = true WHERE id = $1', [m.chef.id]);
    const secret = await projet(ctx, m.admin, 'ZSECRET', autreChef, { nom: 'Nom cache' });
    await affecter(ctx, secret.id, m.chef.id);
    await planifier(ctx, await assigner(ctx, m.admin, secret.id, m.alice, 'S'), '2027-01-20', 3);
    // Projet du lecteur : le chef de P1 ne le voit pas, le lecteur ne voit pas P1.
    const perso = await projet(ctx, m.admin, 'ZPERSO', lecteur, { nom: 'Nom perso' });
    await planifier(ctx, await assigner(ctx, m.admin, perso.id, m.bob, 'L'), '2027-01-06', 1);
    await affecter(ctx, secret.id, lecteur.id);

    const resChef = await lire(ctx, m.chef, '?debut=2027-01');
    expect(resChef.statusCode, resChef.body).toBe(200);
    expect(resChef.json()).toEqual(reponseAttendue(m));
    for (const interdit of ['ZSECRET', 'Nom cache', 'ZPERSO', 'Nom perso']) {
      expect(resChef.body, interdit).not.toContain(interdit);
    }

    const resLecteur = await lire(ctx, lecteur, '?debut=2027-01');
    expect(resLecteur.statusCode, resLecteur.body).toBe(200);
    const vue = corps(resLecteur) as { projets: { code: string }[] };
    expect(vue.projets.map((p) => p.code)).toEqual(['ZPERSO']);
    expect(corps(resLecteur).total).toEqual({ mois: mensuel(), total: total(0, 0, 0) });
    for (const interdit of ['ZSECRET', 'Nom cache', 'P1', 'Projet un', 'Sous-projet']) {
      expect(resLecteur.body, interdit).not.toContain(interdit);
    }

    const resAdmin = await lire(ctx, m.admin, '?debut=2027-01');
    const codes = (corps(resAdmin) as { projets: { code: string }[] }).projets.map((p) => p.code);
    expect(codes).toEqual(['P1', 'P1.1', 'ZPERSO', 'ZSECRET']);
  });

  it('PIL-10 : refus et ordre (401, 403 rôle ressource avant 400, 400), base inchangée', async () => {
    const m = await creerMondePilotage(ctx);
    await sansEffet(ctx, 401, () => appel(ctx).get('/api/couts?debut=2027-01'), 'sans session');
    await sansEffet(ctx, 401, () => appel(ctx).get('/api/couts?debut=abc'), '401 avant 400');
    for (const requete of ['?debut=2027-01', '?debut=abc', '']) {
      const res = await sansEffet(ctx, 403, () => lire(ctx, m.alice, requete), requete);
      expect(corps(res)).toEqual({ erreur: 'Interdit' });
    }
    const requetes = [
      '',
      '?debut=2027-13',
      '?debut=2027-1',
      '?debut=1999-12',
      '?debut=2100-01',
      '?debut=2027-01&equipe=abc',
      '?debut=2027-01&equipe=1.5',
      '?debut=2027-01&equipe=',
    ];
    for (const requete of requetes) {
      await sansEffet(ctx, 400, () => lire(ctx, m.admin, requete), requete);
      await sansEffet(ctx, 400, () => lire(ctx, m.chef, requete), requete);
    }
    const avant = await empreinte(ctx);
    expect((await lire(ctx, m.admin, '?debut=2027-01')).statusCode).toBe(200);
    expect((await lire(ctx, m.chef, '?debut=2027-01&equipe=aucune')).statusCode).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
