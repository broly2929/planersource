// Lot 6c (D-149) : date client. CLT-1 à CLT-4. Valeurs recopiées de D-149.
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, type Corps } from './lot1-helpers.js';
import { creerJalon, creerMonde, url } from './lot1-t2-helpers.js';
import {
  colonne,
  element,
  lireGantt,
  lirePlanning,
  poserDatePlanifiee,
  refuse,
} from './lot6c-helpers.js';

describe('Lot 6c : date client (D-149 (3), (5))', () => {
  const ctx = useTestApp();

  it('CLT-1 : date_client valide, jalons flottant et fixe, POST et PATCH ; absente = null', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.admin);
    for (const type of ['flottant', 'fixe']) {
      const base: Corps = type === 'fixe' ? { type, date_validee: '2027-01-12' } : { type };
      const sans = await creerJalon(ctx, m.admin, m.projet.id, base);
      expect(sans.date_client).toBeNull();
      for (const valeur of ['2027-01-20', '2099-12-31', null]) {
        const cree = await api.post(url.jalons(m.projet.id), {
          nom: `POST ${type} ${String(valeur)}`,
          ...base,
          date_client: valeur,
        });
        expect(cree.statusCode, cree.body).toBe(201);
        expect(corps(cree).date_client).toBe(valeur);
        expect(await colonne(ctx, 'jalon', 'date_client', corps(cree).id as number)).toBe(valeur);
        const modif = await api.patch(url.jalon(sans.id), { date_client: valeur });
        expect(modif.statusCode, modif.body).toBe(200);
        expect(corps(modif).date_client).toBe(valeur);
        expect(await colonne(ctx, 'jalon', 'date_client', sans.id)).toBe(valeur);
      }
    }
  });

  it('CLT-2 : date_client invalide → 400, base inchangée (POST et PATCH)', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.admin, m.projet.id);
    for (const valeur of ['2100-01-01', '2027-13-01', '2027-02-30', '20/01/2027', 5, true, '']) {
      await refuse(
        ctx,
        () => appel(ctx, m.admin).post(url.jalons(m.projet.id), { nom: 'X', date_client: valeur }),
        400,
      );
      await refuse(
        ctx,
        () => appel(ctx, m.admin).patch(url.jalon(j.id), { date_client: valeur }),
        400,
      );
    }
    expect(await colonne(ctx, 'jalon', 'date_client', j.id)).toBeNull();
  });

  it('CLT-3 : écart client : jalon planifié le 2027-01-08 : 2, 0, −3 ; sans date : null ; non planifié : null ; drapeaux inchangés', async () => {
    const m = await creerMonde(ctx);
    const cas: [string | null, number | null, boolean][] = [
      ['2027-01-06', 2, true],
      ['2027-01-08', 0, false],
      ['2027-01-11', -3, false],
      [null, null, false],
    ];
    const ids: number[] = [];
    for (const [date] of cas) {
      const j = await creerJalon(ctx, m.admin, m.projet.id, { date_client: date });
      await poserDatePlanifiee(ctx, j.id, '2027-01-08');
      ids.push(j.id);
    }
    const jamais = await creerJalon(ctx, m.admin, m.projet.id, { date_client: '2027-01-06' });
    const g = await lireGantt(ctx, m.admin, m.projet.id);
    const p = await lirePlanning(ctx, m.admin, m.projet.id);
    cas.forEach(([date, ecart, depasse], i) => {
      for (const lu of [element(g.elements, ids[i]!), element(p, ids[i]!)]) {
        expect([lu.date_client, lu.ecart_client, lu.engagement_depasse], `cas ${i}`).toEqual([
          date,
          ecart,
          depasse,
        ]);
      }
      expect(element(g.elements, ids[i]!).drapeaux).toEqual([]);
    });
    for (const lu of [element(g.elements, jamais.id), element(p, jamais.id)]) {
      expect([lu.ecart_client, lu.engagement_depasse]).toEqual([null, false]);
    }
  });

  it('CLT-4 : historique de date_client : création, modification, valeur inchangée sans entrée, remise à null', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.admin, m.projet.id, { date_client: '2027-01-20' });
    const toutes = async () =>
      (await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/historique`)).json() as Corps[];
    const modifs = async () =>
      (await toutes()).filter(
        (e) => e.entite === 'jalon' && e.entite_id === j.id && e.operation === 'modification',
      );
    const creation = (await toutes()).find(
      (e) => e.entite === 'jalon' && e.entite_id === j.id && e.operation === 'creation',
    );
    expect(creation!.nouvelle_valeur).toMatchObject({ date_client: '2027-01-20' });
    await appel(ctx, m.admin).patch(url.jalon(j.id), { date_client: '2027-02-01' });
    expect((await modifs()).map((e) => [e.champ, e.ancienne_valeur, e.nouvelle_valeur])).toEqual([
      ['date_client', '2027-01-20', '2027-02-01'],
    ]);
    await appel(ctx, m.admin).patch(url.jalon(j.id), { date_client: '2027-02-01' });
    expect(await modifs()).toHaveLength(1);
    await appel(ctx, m.admin).patch(url.jalon(j.id), { date_client: null });
    expect(
      (await modifs()).map((e) => [e.champ, e.ancienne_valeur, e.nouvelle_valeur]),
    ).toContainEqual(['date_client', '2027-02-01', null]);
  });
});
