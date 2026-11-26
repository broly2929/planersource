// Lot taux, tranche 1 (D-258) : taux du jour. TDJ-1 à TDJ-5.
// Valeurs attendues recopiées de SPEC §12.6 points 8 et 11.
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, creerActeur, creerProjet, liste, type Acteur } from './lot1-helpers.js';
import { poserTaux } from './couts-helpers.js';
import {
  compterRequetesTaux,
  creerMondeTaux,
  INTERDIT,
  rattacher,
  refus,
  urlDuJour,
} from './taux-helpers.js';

const entree = (u: Acteur, montant: number | null, source: 'propre' | 'equipe' | null) => ({
  utilisateur_id: u.id,
  montant,
  source,
});

describe('Lot taux-1 : taux du jour (SPEC §12.6 point 8, D-258)', () => {
  const ctx = useTestApp();

  it('TDJ-1 : administrateur : réponse exacte au 15/01/2027 et au 15/02/2027, triée par utilisateur_id', async () => {
    const m = await creerMondeTaux(ctx);
    const lire = async (date: string) => {
      const res = await appel(ctx, m.admin).get(urlDuJour(date));
      expect(res.statusCode, res.body).toBe(200);
      return liste(res);
    };
    expect(await lire('2027-01-15')).toEqual([
      entree(m.alice, 600, 'propre'),
      entree(m.dave, 400, 'equipe'),
      entree(m.erin, null, null),
    ]);
    expect(await lire('2027-02-15')).toEqual([
      entree(m.alice, 400, 'equipe'),
      entree(m.dave, 400, 'equipe'),
      entree(m.erin, null, null),
    ]);
  });

  it('TDJ-2 : date absente, mal formée ou irréelle : 400, base inchangée', async () => {
    const m = await creerMondeTaux(ctx);
    for (const date of [undefined, '', '2027-02-30', '2027-13-01', '2027-2-15', 'demain']) {
      await refus(
        ctx,
        () => appel(ctx, m.admin).get(urlDuJour(date)),
        400,
        undefined,
        `date ${String(date)}`,
      );
    }
  });

  it('TDJ-3 : portée du chef : ressources de ses projets et sous-projets ; chef lecteur seul : liste vide', async () => {
    const m = await creerMondeTaux(ctx);
    const chef = await creerActeur(ctx, 'chef@taux.test', 'chef_de_projet');
    const lecteur = await creerActeur(ctx, 'lecteur@taux.test', 'chef_de_projet', true);
    const sien = await creerProjet(ctx, m.admin, { chef_id: chef.id });
    const sous = await creerProjet(ctx, m.admin, { chef_id: m.admin.id, parent_id: sien.id });
    const autre = await creerProjet(ctx, m.admin, { chef_id: m.admin.id });
    await affecter(ctx, sien.id, m.alice.id);
    await affecter(ctx, sous.id, m.dave.id);
    await affecter(ctx, autre.id, m.erin.id);
    await affecter(ctx, autre.id, lecteur.id);
    const res = await appel(ctx, chef).get(urlDuJour('2027-02-15'));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual([entree(m.alice, 400, 'equipe'), entree(m.dave, 400, 'equipe')]);
    const vide = await appel(ctx, lecteur).get(urlDuJour('2027-02-15'));
    expect(vide.statusCode, vide.body).toBe(200);
    expect(vide.json()).toEqual([]);
    // l'administrateur voit aussi Erin et le lecteur (ressource)
    const tout = await appel(ctx, m.admin).get(urlDuJour('2027-02-15'));
    expect(liste(tout).map((e) => e.utilisateur_id)).toEqual(
      [m.alice.id, m.dave.id, m.erin.id, lecteur.id].sort((a, b) => a - b),
    );
    // le chef reçoit 400 sur une date invalide (pas de 403)
    await refus(ctx, () => appel(ctx, chef).get(urlDuJour('2027-02-30')), 400, undefined, 'chef');
  });

  it('TDJ-4 : refus : 401 ; rôle ressource 403, date invalide comprise ; base inchangée', async () => {
    const m = await creerMondeTaux(ctx);
    await refus(ctx, () => appel(ctx).get(urlDuJour('2027-02-15')), 401, undefined, '401');
    await refus(ctx, () => appel(ctx).get(urlDuJour('x')), 401, undefined, '401 avant 400');
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlDuJour('2027-02-15')),
      403,
      INTERDIT,
      'ressource',
    );
    await refus(
      ctx,
      () => appel(ctx, m.alice).get(urlDuJour('x')),
      403,
      INTERDIT,
      'ressource, 403 avant 400',
    );
  });

  it('TDJ-5 : une seule requête de lecture des taux pour 3 ou 15 ressources', async () => {
    const m = await creerMondeTaux(ctx);
    const mesurer = async () => {
      const { resultat, requetes } = await compterRequetesTaux(() =>
        appel(ctx, m.admin).get(urlDuJour('2027-02-15')),
      );
      expect(resultat.statusCode, resultat.body).toBe(200);
      return { n: liste(resultat).length, requetes };
    };
    expect(await mesurer()).toEqual({ n: 3, requetes: 1 });
    for (let i = 0; i < 12; i += 1) {
      const r = await creerActeur(ctx, `r${i}@taux.test`, 'ressource', true);
      if (i % 3 === 0) await rattacher(ctx, r.id, m.dev);
      if (i % 3 === 1) await poserTaux(ctx, r.id, [['2027-01-01', null, 500 + i]]);
    }
    expect(await mesurer()).toEqual({ n: 15, requetes: 1 });
  });

  it('TDJ-6 : ressource inactive avec un taux propre : présente, montant et source propre', async () => {
    const m = await creerMondeTaux(ctx);
    const inactive = await creerActeur(ctx, 'inactive@taux.test', 'ressource', true);
    await poserTaux(ctx, inactive.id, [['2027-01-01', null, 550]]);
    await ctx.pool.query('UPDATE utilisateur SET actif = false WHERE id = $1', [inactive.id]);
    const res = await appel(ctx, m.admin).get(urlDuJour('2027-02-15'));
    expect(res.statusCode, res.body).toBe(200);
    expect(liste(res).find((e) => e.utilisateur_id === inactive.id)).toEqual(
      entree(inactive, 550, 'propre'),
    );
  });
});
