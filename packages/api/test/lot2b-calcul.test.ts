import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, creerActeur, corps } from './lot1-helpers.js';
import { url } from './lot1-t2-helpers.js';
import {
  calculer,
  creerMonde,
  datesActivite,
  empreinte,
  jours,
  tache,
  travail,
  type Monde,
} from './lot2a-helpers.js';

const D0 = '2027-01-04';
const calcul = { d0: D0 };

const ligne = (jour: string, charge: number) => ({ jour, charge, surcharge: false });

/** Un scénario de SPEC 5.6 par ressource : START-1, STARR-1, STARR-5 et ALAP-3 dans le même projet. */
async function monter(ctx: Parameters<typeof creerMonde>[0]) {
  const m: Monde = await creerMonde(ctx);
  const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
  const dave = await creerActeur(ctx, 'dave@example.test', 'ressource', true);
  await affecter(ctx, m.projet.id, carole.id);
  await affecter(ctx, m.projet.id, dave.id);
  const p = m.projet.id;
  // START-1 (Alice)
  const start = await tache(ctx, m.admin, p, m.alice.id, 2, {
    mode: 'START',
    debut_valide: '2027-01-06',
  });
  // STARR-1 (Bob) : X ASAP WBS 1, Y STARR WBS 2
  const x = await tache(ctx, m.admin, p, m.bob.id, 5);
  const y = await tache(ctx, m.admin, p, m.bob.id, 2, {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  // STARR-5 (Carole) : deux STARR validés 05 et 06/01
  const s1 = await tache(ctx, m.admin, p, carole.id, 2, {
    mode: 'STARR',
    debut_valide: '2027-01-05',
  });
  const s2 = await tache(ctx, m.admin, p, carole.id, 2, {
    mode: 'STARR',
    debut_valide: '2027-01-06',
  });
  // ALAP-3 (Dave)
  const alap = await tache(ctx, m.admin, p, dave.id, 5, { mode: 'ALAP', fin_valide: '2027-01-06' });
  return { m, start, x, y, s1, s2, alap };
}

describe('Calcul : START, STARR, ALAP en base (lot 2b-I)', () => {
  const ctx = useTestApp();

  async function verifier(s: Awaited<ReturnType<typeof monter>>) {
    expect(await travail(ctx, s.start.assignation.id)).toEqual(jours(6, 7).map((j) => ligne(j, 1)));
    expect(await datesActivite(ctx, s.start.activite.id)).toEqual({
      debut_planifie: '2027-01-06',
      fin_planifiee: '2027-01-07',
      drapeaux: [],
    });
    expect(await travail(ctx, s.y.assignation.id)).toEqual(jours(6, 7).map((j) => ligne(j, 1)));
    expect(await datesActivite(ctx, s.y.activite.id)).toEqual({
      debut_planifie: '2027-01-06',
      fin_planifiee: '2027-01-07',
      drapeaux: [],
    });
    expect(await travail(ctx, s.x.assignation.id)).toEqual(
      jours(4, 5, 8, 11, 12).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, s.x.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-12',
      drapeaux: [],
    });
    expect(await travail(ctx, s.s1.assignation.id)).toEqual(jours(5, 6).map((j) => ligne(j, 1)));
    expect(await datesActivite(ctx, s.s1.activite.id)).toEqual({
      debut_planifie: '2027-01-05',
      fin_planifiee: '2027-01-06',
      drapeaux: [],
    });
    expect(await travail(ctx, s.s2.assignation.id)).toEqual(jours(7, 8).map((j) => ligne(j, 1)));
    expect(await datesActivite(ctx, s.s2.activite.id)).toEqual({
      debut_planifie: '2027-01-07',
      fin_planifiee: '2027-01-08',
      drapeaux: ['debut_non_respecte'],
    });
  }

  it('CALC-24 : START-1, STARR-1, STARR-5 et ALAP-3 persistés ; un second calcul laisse la base identique', async () => {
    const s = await monter(ctx);
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    await verifier(s);
    expect(await travail(ctx, s.alap.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, s.alap.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: ['retard'],
    });
    const avant = await empreinte(ctx);
    expect(
      (await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul })).statusCode,
    ).toBe(200);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('CALC-26 : fin validée de l’ALAP portée au 08/01 puis recalcul : travail du 04 au 08/01, retard retiré', async () => {
    const s = await monter(ctx);
    await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect((await datesActivite(ctx, s.alap.activite.id)).drapeaux).toEqual(['retard']);
    const maj = await appel(ctx, s.m.admin).patch(url.activite(s.alap.activite.id), {
      fin_valide: '2027-01-08',
    });
    expect(maj.statusCode).toBe(200);
    expect(corps(maj)).toMatchObject({ fin_valide: '2027-01-08' });
    const res = await calculer(ctx, s.m.admin, { projets: [s.m.projet.id], ...calcul });
    expect(res.statusCode).toBe(200);
    expect(await travail(ctx, s.alap.assignation.id)).toEqual(
      jours(4, 5, 6, 7, 8).map((j) => ligne(j, 1)),
    );
    expect(await datesActivite(ctx, s.alap.activite.id)).toEqual({
      debut_planifie: '2027-01-04',
      fin_planifiee: '2027-01-08',
      drapeaux: [],
    });
  });
});
