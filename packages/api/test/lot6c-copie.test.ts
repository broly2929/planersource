// Lot 6c (D-149 (6)) : copie et variantes. CPY-1 à CPY-3. Valeurs recopiées de D-149.
import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, corps, type Corps } from './lot1-helpers.js';
import { creerActivite, creerJalon, creerMonde, type Objet } from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';
import { lirePlanning } from './lot6c-helpers.js';

const copie = (id: number) => `/api/projets/${id}/copie`;

/** Projet P (début 2027-01-04) : A vendue 10, B sans, jalon J à date client 2027-01-20, jalon K sans. */
async function source(ctx: TestCtx, dateClient = '2027-01-20') {
  const m = await creerMonde(ctx);
  await creerActivite(ctx, m.admin, m.projet.id, { nom: 'A', charge_vendue: 10 });
  await creerActivite(ctx, m.admin, m.projet.id, { nom: 'B' });
  await creerJalon(ctx, m.admin, m.projet.id, { nom: 'J', date_client: dateClient });
  await creerJalon(ctx, m.admin, m.projet.id, { nom: 'K' });
  return m;
}

async function verifier(ctx: TestCtx, m: Awaited<ReturnType<typeof source>>, cibleId: number) {
  const lignes = await lirePlanning(ctx, m.admin, cibleId);
  const par = (nom: string) => lignes.find((l) => l.nom === nom) as Objet & Corps;
  expect(par('A').charge_vendue).toBe(10);
  expect(par('B').charge_vendue).toBeNull();
  expect(par('J').date_client).toBe('2027-02-03');
  expect(par('K').date_client).toBeNull();
}

describe('Lot 6c : copie (D-149 (6))', () => {
  const ctx = useTestApp();

  it('CPY-1 : copie vers le 2027-01-18 (delta 14) : charge_vendue copiée, date_client décalée, source inchangée', async () => {
    const m = await source(ctx);
    const avant = await lirePlanning(ctx, m.admin, m.projet.id);
    const res = await appel(ctx, m.admin).post(copie(m.projet.id), {
      nom: 'Copie',
      code: 'CPY1',
      date_debut: '2027-01-18',
    });
    expect(res.statusCode, res.body).toBe(201);
    await verifier(ctx, m, corps(res).id as number);
    expect(await lirePlanning(ctx, m.admin, m.projet.id)).toEqual(avant);
  });

  it('CPY-2 : date_client 2099-12-25 décalée de 16 jours (au-delà du 31/12/2099) : 422, rien créé', async () => {
    const m = await source(ctx, '2099-12-25');
    const av = await empreinte(ctx);
    const res = await appel(ctx, m.admin).post(copie(m.projet.id), {
      nom: 'Copie',
      code: 'CPY2',
      date_debut: '2027-01-20',
    });
    expect(res.statusCode, res.body).toBe(422);
    expect(await empreinte(ctx), 'base modifiée par un refus').toEqual(av);
  });

  it('CPY-3 : « Créer depuis un modèle » et « Enregistrer comme modèle » copient et décalent de même', async () => {
    const m = await source(ctx);
    const enModele = await appel(ctx, m.admin).post(copie(m.projet.id), {
      nom: 'Modèle',
      code: 'CPY3M',
      date_debut: '2027-01-18',
      est_modele: true,
    });
    expect(enModele.statusCode, enModele.body).toBe(201);
    await verifier(ctx, m, corps(enModele).id as number);
    // Le modèle (début 2027-01-18) copié vers le 2027-02-01 : delta 14 de plus.
    const depuis = await appel(ctx, m.chef).post(copie(corps(enModele).id as number), {
      nom: 'Depuis modèle',
      code: 'CPY3P',
      date_debut: '2027-02-01',
    });
    expect(depuis.statusCode, depuis.body).toBe(201);
    const lignes = await lirePlanning(ctx, m.admin, corps(depuis).id as number);
    const par = (nom: string) => lignes.find((l) => l.nom === nom) as Objet & Corps;
    expect(par('A').charge_vendue).toBe(10);
    expect(par('J').date_client).toBe('2027-02-17');
    expect(par('K').date_client).toBeNull();
  });
});
