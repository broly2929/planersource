import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel } from './lot1-helpers.js';
import { creerActivite, creerJalon, url } from './lot1-t2-helpers.js';
import { creerMonde, empreinte } from './lot2a-helpers.js';

const TROP_TARD = '2100-01-01';
const BORNE = '2099-12-31';

describe('Reprises du lot 2d (lot 2e-0, D-056 R3) : dates validées bornées au 31/12/2099', () => {
  const ctx = useTestApp();

  it('ACT-22 : activité, création et PATCH avec debut_valide ou fin_valide au 2100-01-01 → 400, base inchangée ; 2099-12-31 accepté', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.chef, m.projet.id);
    const chef = appel(ctx, m.chef);
    for (const champ of ['debut_valide', 'fin_valide']) {
      const avant = await empreinte(ctx);
      const creation = await chef.post(url.activites(m.projet.id), {
        nom: 'Trop tard',
        [champ]: TROP_TARD,
      });
      expect(creation.statusCode, `POST ${champ}`).toBe(400);
      expect(await empreinte(ctx), `POST ${champ} : base modifiée`).toEqual(avant);
      const modification = await chef.patch(url.activite(a.id), { [champ]: TROP_TARD });
      expect(modification.statusCode, `PATCH ${champ}`).toBe(400);
      expect(await empreinte(ctx), `PATCH ${champ} : base modifiée`).toEqual(avant);
    }
    const creee = await chef.post(url.activites(m.projet.id), {
      nom: 'À la borne',
      debut_valide: BORNE,
      fin_valide: BORNE,
    });
    expect(creee.statusCode).toBe(201);
    expect(creee.json()).toMatchObject({ debut_valide: BORNE, fin_valide: BORNE });
    const modifiee = await chef.patch(url.activite(a.id), {
      debut_valide: BORNE,
      fin_valide: BORNE,
    });
    expect(modifiee.statusCode).toBe(200);
    expect(modifiee.json()).toMatchObject({ debut_valide: BORNE, fin_valide: BORNE });
  });

  it('JLN-12 : jalon, création et PATCH avec date_validee au 2100-01-01 → 400, base inchangée ; 2099-12-31 accepté', async () => {
    const m = await creerMonde(ctx);
    const j = await creerJalon(ctx, m.chef, m.projet.id);
    const chef = appel(ctx, m.chef);
    const avant = await empreinte(ctx);
    for (const type of ['flottant', 'fixe']) {
      const creation = await chef.post(url.jalons(m.projet.id), {
        nom: 'Trop tard',
        type,
        date_validee: TROP_TARD,
      });
      expect(creation.statusCode, `POST ${type}`).toBe(400);
      expect(await empreinte(ctx), `POST ${type} : base modifiée`).toEqual(avant);
    }
    const modification = await chef.patch(url.jalon(j.id), { date_validee: TROP_TARD });
    expect(modification.statusCode).toBe(400);
    expect(await empreinte(ctx), 'PATCH : base modifiée').toEqual(avant);
    const cree = await chef.post(url.jalons(m.projet.id), {
      nom: 'À la borne',
      type: 'fixe',
      date_validee: BORNE,
    });
    expect(cree.statusCode).toBe(201);
    expect(cree.json()).toMatchObject({ date_validee: BORNE });
    const modifie = await chef.patch(url.jalon(j.id), { date_validee: BORNE });
    expect(modifie.statusCode).toBe(200);
    expect(modifie.json()).toMatchObject({ date_validee: BORNE });
  });
});
