import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter } from './lot1-helpers.js';
import { creerMonde, empreinte, tache } from './lot2a-helpers.js';
import {
  action,
  chargesAssignation,
  clore,
  ecrireFeuille,
  idFeuille,
  imputer,
  j,
  lireFeuille,
  lireFeuilleBrute,
  S2,
} from './lot4a-helpers.js';

/** Lot 4a, compléments (D-119). Date du jour du serveur : mercredi 13/01/2027. */
const AUJOURDHUI = '2027-01-13';

/** P (chef `chef`) : A, Alice 5 j ; Q (chef `autreChef`, Alice affectée) : B, Alice 3 j. */
async function base(ctx: TestCtx) {
  const m = await creerMonde(ctx);
  await affecter(ctx, m.autre.id, m.alice.id);
  const a = await tache(ctx, m.chef, m.projet.id, m.alice.id, 5, { nom: 'A' });
  const b = await tache(ctx, m.autreChef, m.autre.id, m.alice.id, 3, { nom: 'B' });
  return { m, a, b };
}

async function nbFeuilles(ctx: TestCtx): Promise<number> {
  const { rows } = await ctx.pool.query<{ n: string }>('SELECT count(*) AS n FROM feuille_temps');
  return Number(rows[0]!.n);
}

describe('Compléments du lot 4a (D-119)', () => {
  const ctx = useTestApp(() => AUJOURDHUI);

  it('IMP-26 : charge 0 sur un jour futur acceptée sans écriture ; charge > 0 : 422 jour_futur', async () => {
    const { m, a } = await base(ctx);
    const avant = await empreinte(ctx);
    const res = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(14), charge: 0 }] }],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
    expect(await nbFeuilles(ctx)).toBe(0);
    const refus = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: a.assignation.id, imputations: [{ jour: j(14), charge: 1 }] }],
    });
    expect(refus.statusCode).toBe(422);
    expect(refus.json()).toMatchObject({ code: 'jour_futur' });
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('IMP-27 : ligne fermée : reste différent → 422 ligne_fermee, base inchangée ; reste égal → 200', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    await imputer(ctx, m.alice, S2, [
      { assignation_id: s, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    await clore(ctx, m.chef, a.activite.id);
    expect(await chargesAssignation(ctx, s)).toMatchObject({ reste_a_faire: 4 });
    const avant = await empreinte(ctx);
    const refus = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: s, imputations: [{ jour: j(11), charge: 1 }], reste: 3 }],
    });
    expect(refus.statusCode, refus.body).toBe(422);
    expect(refus.json()).toMatchObject({ code: 'ligne_fermee' });
    expect(await empreinte(ctx)).toEqual(avant);
    const ok = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: s, imputations: [{ jour: j(11), charge: 1 }], reste: 4 }],
    });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('IMP-28 : ressource_id inconnu, mal formé ou hors plage : 404, y compris pour l’administrateur', async () => {
    const { m } = await base(ctx);
    // témoin : un ressource_id valide répond 200 (la route existe)
    expect((await lireFeuilleBrute(ctx, m.admin, S2, m.alice.id)).statusCode).toBe(200);
    const avant = await empreinte(ctx);
    for (const id of ['999999', 'abc', '99999999999']) {
      expect((await lireFeuilleBrute(ctx, m.admin, S2, id)).statusCode, id).toBe(404);
      expect((await lireFeuilleBrute(ctx, m.chef, S2, id)).statusCode, id).toBe(404);
    }
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('IMP-29 : feuille absente, rien d’écrit : 200, id null, aucune feuille créée ; un reste modifié la crée', async () => {
    const { m, a } = await base(ctx);
    const s = a.assignation.id;
    const avant = await empreinte(ctx);
    for (const lignes of [
      [],
      [{ assignation_id: s, imputations: [] }],
      [{ assignation_id: s, imputations: [{ jour: j(11), charge: 0 }] }],
      [{ assignation_id: s, imputations: [], reste: 5 }],
    ]) {
      const res = await ecrireFeuille(ctx, m.alice, S2, { lignes });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().feuille.id).toBeNull();
      expect(await nbFeuilles(ctx)).toBe(0);
      expect(await empreinte(ctx)).toEqual(avant);
    }
    const res = await ecrireFeuille(ctx, m.alice, S2, {
      lignes: [{ assignation_id: s, imputations: [], reste: 3 }],
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(await idFeuille(ctx, m.alice.id, S2)).not.toBeNull();
    expect(await chargesAssignation(ctx, s)).toMatchObject({ reste_a_faire: 3 });
  });

  it('IMP-30 : feuille d’autrui filtrée : totaux et dépassement sur les seules lignes visibles', async () => {
    const { m, a, b } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
      { assignation_id: b.assignation.id, imputations: [{ jour: j(11), charge: 0.5 }] },
    ]);
    const lundi = (f: Awaited<ReturnType<typeof lireFeuille>>) => f.jours[0]!;
    expect(lundi(await lireFeuille(ctx, m.admin, S2, m.alice.id))).toEqual({
      jour: j(11),
      capacite: 1,
      total: 1.5,
      depassement: true,
    });
    expect(lundi(await lireFeuille(ctx, m.alice, S2))).toMatchObject({
      total: 1.5,
      depassement: true,
    });
    expect(lundi(await lireFeuille(ctx, m.chef, S2, m.alice.id))).toEqual({
      jour: j(11),
      capacite: 1,
      total: 1,
      depassement: false,
    });
    expect(lundi(await lireFeuille(ctx, m.autreChef, S2, m.alice.id))).toMatchObject({
      total: 0.5,
      depassement: false,
    });
  });

  it('FDT-16 : valider par un utilisateur qui voit la feuille sans écrire sur un projet concerné : 403, base inchangée', async () => {
    const { m, a } = await base(ctx);
    await imputer(ctx, m.alice, S2, [
      { assignation_id: a.assignation.id, imputations: [{ jour: j(11), charge: 1 }] },
    ]);
    const id = (await idFeuille(ctx, m.alice.id, S2))!;
    expect((await action(ctx, m.alice, id, 'soumettre')).statusCode).toBe(200);
    // le chef de Q voit la feuille (ligne de B) ; seul P est concerné
    expect((await lireFeuilleBrute(ctx, m.autreChef, S2, m.alice.id)).statusCode).toBe(200);
    const avant = await empreinte(ctx);
    const res = await action(ctx, m.autreChef, id, 'valider');
    expect(res.statusCode, res.body).toBe(403);
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
