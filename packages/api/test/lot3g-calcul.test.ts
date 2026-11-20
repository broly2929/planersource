import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, creerActeur, creerProjet } from './lot1-helpers.js';
import { calculer, empreinte, etatDes, jours, tache, travail } from './lot2a-helpers.js';

/**
 * Lot 3g : portée d'écriture d'un chef sur les sous-projets (SPEC §6 Édition point 14, D-114 (7)).
 * Test de caractérisation : vert attendu sans code de production (la portée de planning/projets.ts
 * descend déjà aux sous-projets). D0 = 04/01/2027.
 */
const calcul = { d0: '2027-01-04' };

describe('Calcul : un chef et les sous-projets d’un autre chef (lot 3g)', () => {
  const ctx = useTestApp();

  it('CALC-51 : A calcule R → R et S, travail de S écrit ; B (chef de S) calcule S seul, R inchangé et pris en compte ; B calcule R : 404 ; B affecté à R : 403', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const chefA = await creerActeur(ctx, 'chef-a@example.test', 'chef_de_projet');
    const chefB = await creerActeur(ctx, 'chef-b@example.test', 'chef_de_projet', true);
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const r = await creerProjet(ctx, admin, { chef_id: chefA.id });
    const s = await creerProjet(ctx, admin, { chef_id: chefB.id, parent_id: r.id });
    await affecter(ctx, r.id, alice.id);
    await affecter(ctx, s.id, alice.id);
    const aR = await tache(ctx, admin, r.id, alice.id, 2);
    const aS = await tache(ctx, admin, s.id, alice.id, 2);

    // A calcule R : le travail de S (sous-projet d'un autre chef) est écrit.
    const parA = await calculer(ctx, chefA, { projets: [r.id], ...calcul });
    expect(parA.statusCode, parA.body).toBe(200);
    expect(((parA.json() as { projets: number[] }).projets ?? []).sort((x, y) => x - y)).toEqual(
      [r.id, s.id].sort((x, y) => x - y),
    );
    const travailR = await travail(ctx, aR.assignation.id);
    const travailS = await travail(ctx, aS.assignation.id);
    expect(travailR).toHaveLength(2);
    expect(travailS).toHaveLength(2);
    const joursR = travailR.map((l) => l.jour);
    const joursS = travailS.map((l) => l.jour);
    expect(joursR.filter((j) => joursS.includes(j))).toEqual([]);
    expect([...joursR, ...joursS].sort()).toEqual(jours(4, 5, 6, 7));

    // B calcule S seul : S identique, R (travail, dates, drapeaux) non réécrit, mais compté.
    const etatR = await etatDes(ctx, [r.id]);
    const parB = await calculer(ctx, chefB, { projets: [s.id], ...calcul });
    expect(parB.statusCode, parB.body).toBe(200);
    expect((parB.json() as { projets: number[] }).projets).toEqual([s.id]);
    expect(await travail(ctx, aS.assignation.id)).toEqual(travailS);
    expect(await travail(ctx, aR.assignation.id)).toEqual(travailR);
    expect(await etatDes(ctx, [r.id])).toEqual(etatR);

    // B ne voit pas R : 404, rien n'est écrit.
    const avant404 = await empreinte(ctx);
    expect((await calculer(ctx, chefB, { projets: [r.id], ...calcul })).statusCode).toBe(404);
    expect(await empreinte(ctx)).toEqual(avant404);

    // B affecté à R : R lisible en lecture seule, 403, rien n'est écrit.
    await affecter(ctx, r.id, chefB.id);
    const avant403 = await empreinte(ctx);
    expect((await calculer(ctx, chefB, { projets: [r.id], ...calcul })).statusCode).toBe(403);
    expect(await empreinte(ctx)).toEqual(avant403);
  });
});
