import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, creerProjet } from './lot1-helpers.js';
import { calculer, creerMonde, jours, tache, travail } from './lot2a-helpers.js';

/**
 * Lot 2f-I : plafond de projet par POST /api/calcul (SPEC §4, 5.7, D-062, D-063).
 * D0 = 04/01/2027 ; projet P début 04/01.
 */
const calcul = { d0: '2027-01-04' };

const ligne = (jour: string, charge: number) => ({ jour, charge, surcharge: false });
const plan = (charges: Record<number, number>) =>
  Object.entries(charges).map(([j, c]) => ligne(jours(Number(j))[0]!, c));

/** Passe l'affectation d'Alice au projet à `taux` % (creerMonde l'affecte à 100 %). */
async function tauxAlice(ctx: TestCtx, projetId: number, aliceId: number, taux: number) {
  await ctx.pool.query(
    'UPDATE affectation_projet SET taux = $1 WHERE projet_id = $2 AND ressource_id = $3',
    [taux, projetId, aliceId],
  );
}

describe('Calcul : plafond de projet par POST /api/calcul (lot 2f-I)', () => {
  const ctx = useTestApp();

  it('CALC-47 : PROJ-1 par l’API, Alice à 50 % sur P, ASAP Alice 5 j → 1 j les 04 et 05/01, 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01 ; aucune surcharge', async () => {
    const m = await creerMonde(ctx);
    await tauxAlice(ctx, m.projet.id, m.alice.id, 50);
    const t = await tache(ctx, m.admin, m.projet.id, m.alice.id, 5);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, t.assignation.id)).toEqual(
      plan({ 4: 1, 5: 1, 6: 0.5, 11: 1, 12: 1, 13: 0.5 }),
    );
  });

  async function donnees() {
    const m = await creerMonde(ctx);
    await tauxAlice(ctx, m.projet.id, m.alice.id, 50);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, p1.id, m.alice.id, 100);
    const a = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const c = await tache(ctx, m.admin, p1.id, m.alice.id, 3, { priorite: 600 });
    return { m, p1, a, c };
  }

  it('CALC-48 : P (Alice à 50 %) : A ASAP Alice 2 j ; sous-projet P1 (Alice à 100 %) : C ASAP Alice 3 j, priorité 600 ; calcul de P → A les 04 et 05/01 ; C 0,5 j le 06/01, 1 j les 11 et 12/01, 0,5 j le 13/01', async () => {
    const { m, a, c } = await donnees();
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, a.assignation.id)).toEqual(plan({ 4: 1, 5: 1 }));
    expect(await travail(ctx, c.assignation.id)).toEqual(plan({ 6: 0.5, 11: 1, 12: 1, 13: 0.5 }));
  });

  it('CALC-49 : mêmes données, jamais calculées ; calcul de P1 seul → C 1 j par jour du 04 au 06/01 ; aucun travail pour A', async () => {
    const { m, p1, a, c } = await donnees();
    const res = await calculer(ctx, m.admin, { projets: [p1.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    expect(await travail(ctx, c.assignation.id)).toEqual(plan({ 4: 1, 5: 1, 6: 1 }));
    expect(await travail(ctx, a.assignation.id)).toEqual([]);
  });
});
