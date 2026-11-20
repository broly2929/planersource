import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet } from './lot1-helpers.js';
import { type Objet } from './lot1-t2-helpers.js';
import { calculer, creerMonde, empreinte, tache } from './lot2a-helpers.js';
import { activiteMan, JANV, journee, matin, poser } from './lot2e-helpers.js';

/**
 * Lot 3g : GET /api/projets/:id/travail (SPEC §6 « Travail par jour », D-114 (2)).
 * Jeu de données de SPEC 5.5 ; D0 = 04/01/2027. MAN-5 (samedi 09/01 : posée, 1 j en surcharge) plus
 * une demi-journée le 05/01 matin, comme MAN-7.
 */
const calcul = { d0: '2027-01-04' };

interface LigneTravail {
  element_id: number;
  assignation_id: number;
  ressource_id: number;
  jour: string;
  charge: number;
  surcharge: boolean;
}

const adresse = (projetId: number | string) => `/api/projets/${projetId}/travail`;

/** GET du travail par jour, 200 attendu. */
async function lire(ctx: TestCtx, qui: Parameters<typeof appel>[1], projetId: number) {
  const res = await appel(ctx, qui).get(adresse(projetId));
  expect(res.statusCode, res.body).toBe(200);
  return (res.json() as { lignes: LigneTravail[] }).lignes;
}

const ligne = (
  element: Objet,
  assignation: Objet,
  ressourceId: number,
  jour: string,
  charge: number,
  surcharge = false,
): LigneTravail => ({
  element_id: element.id,
  assignation_id: assignation.id,
  ressource_id: ressourceId,
  jour,
  charge,
  surcharge,
});

describe('Travail par jour : GET /api/projets/:id/travail (lot 3g)', () => {
  const ctx = useTestApp();

  it('TRAV-1-r1 : MAN-5 calculé (saisie le 05/01 matin et, ancienne, insérée en base, le samedi 09/01 une journée ; révision D-031, D-123 (8)) : 200, lignes triées, charges 0,5 et 1 en nombres, surcharge vraie le 09/01', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, [matin(man.assignation.id, '2027-01-05')]);
    // Saisie ancienne (D-123 (8)) : l'API refuse désormais une saisie nouvelle un samedi.
    await ctx.pool.query(
      `INSERT INTO saisie_manuelle (assignation_id, jour, demi_journee)
       VALUES ($1, '2027-01-09', 'matin'), ($1, '2027-01-09', 'apres_midi')`,
      [man.assignation.id],
    );
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);

    const reponse = await appel(ctx, m.admin).get(adresse(m.projet.id));
    expect(reponse.statusCode, reponse.body).toBe(200);
    const lignes = (reponse.json() as { lignes: LigneTravail[] }).lignes;
    expect(lignes).toEqual([
      ligne(man.activite, man.assignation, m.alice.id, '2027-01-05', 0.5, false),
      ligne(man.activite, man.assignation, m.alice.id, '2027-01-09', 1, true),
    ]);
    for (const l of lignes) expect(typeof l.charge).toBe('number');
  });

  it('TRAV-2 : tri par element_id, assignation_id, jour (Y créée avant Z, puis X ; saisies de Z posées dans l’ordre inverse)', async () => {
    const m = await creerMonde(ctx);
    const y = await tache(ctx, m.admin, m.projet.id, m.bob.id, 1);
    const z = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const x = await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, z.activite.id, JANV, [
      ...journee(z.assignation.id, '2027-01-12'),
      ...journee(z.assignation.id, '2027-01-11'),
    ]);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);

    expect(await lire(ctx, m.admin, m.projet.id)).toEqual([
      ligne(y.activite, y.assignation, m.bob.id, '2027-01-04', 1),
      ligne(z.activite, z.assignation, m.alice.id, '2027-01-11', 1),
      ligne(z.activite, z.assignation, m.alice.id, '2027-01-12', 1),
      ligne(x.activite, x.assignation, m.alice.id, '2027-01-04', 1),
      ligne(x.activite, x.assignation, m.alice.id, '2027-01-05', 1),
    ]);
  });

  it('TRAV-3 : avant tout calcul : 200 { lignes: [] }', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const res = await appel(ctx, m.admin).get(adresse(m.projet.id));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ lignes: [] });
  });

  it('TRAV-4 : le travail d’un sous-projet est exclu : P (A, Bob 2 j) et P1 (C, Alice 3 j), calcul de P → P : lignes de A seules ; P1 : lignes de C seules', async () => {
    const m = await creerMonde(ctx);
    const p1 = await creerProjet(ctx, m.admin, { chef_id: m.chef.id, parent_id: m.projet.id });
    await affecter(ctx, p1.id, m.alice.id);
    const a = await tache(ctx, m.admin, m.projet.id, m.bob.id, 2);
    const c = await tache(ctx, m.admin, p1.id, m.alice.id, 3);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);

    expect(await lire(ctx, m.admin, m.projet.id)).toEqual([
      ligne(a.activite, a.assignation, m.bob.id, '2027-01-04', 1),
      ligne(a.activite, a.assignation, m.bob.id, '2027-01-05', 1),
    ]);
    expect(await lire(ctx, m.admin, p1.id)).toEqual([
      ligne(c.activite, c.assignation, m.alice.id, '2027-01-04', 1),
      ligne(c.activite, c.assignation, m.alice.id, '2027-01-05', 1),
      ligne(c.activite, c.assignation, m.alice.id, '2027-01-06', 1),
    ]);
  });

  it('TRAV-5-r1 : le chef du projet : 200, mêmes lignes que l’administrateur ; Alice (ressource affectée) 404', async () => {
    const m = await creerMonde(ctx);
    const a = await tache(ctx, m.admin, m.projet.id, m.alice.id, 1);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const attendu = [ligne(a.activite, a.assignation, m.alice.id, '2027-01-04', 1)];

    expect(await lire(ctx, m.admin, m.projet.id)).toEqual(attendu);
    // Révision 6b (D-031, D-148 (2)).
    expect((await appel(ctx, m.alice).get(adresse(m.projet.id))).statusCode).toBe(404);
    expect(await lire(ctx, m.chef, m.projet.id)).toEqual(attendu);
  });

  it('TRAV-6 : refus : 401 sans session ; chef d’un autre projet, ressource non affectée, « abc », 2147483648, 999999 : 404 ; témoin 200 ; base inchangée', async () => {
    const m = await creerMonde(ctx);
    const carole = await creerActeur(ctx, 'carole@example.test', 'ressource', true);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const avant = await empreinte(ctx);

    expect((await appel(ctx, m.admin).get(adresse(m.projet.id))).statusCode).toBe(200);
    expect((await appel(ctx).get(adresse(m.projet.id))).statusCode).toBe(401);
    expect((await appel(ctx, m.autreChef).get(adresse(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx, carole).get(adresse(m.projet.id))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse('abc'))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse(2147483648))).statusCode).toBe(404);
    expect((await appel(ctx, m.admin).get(adresse(999999))).statusCode).toBe(404);

    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('TRAV-7 : modèle lu par l’administrateur : 200 { lignes: [] }, base inchangée', async () => {
    const m = await creerMonde(ctx);
    const modele = corps(
      await appel(ctx, m.admin).post('/api/modeles', {
        code: 'M1',
        nom: 'Modèle',
        date_debut: '2027-01-04',
      }),
    ) as Objet;
    await affecter(ctx, modele.id, m.alice.id);
    await tache(ctx, m.admin, modele.id, m.alice.id, 2);
    const avant = await empreinte(ctx);

    const res = await appel(ctx, m.admin).get(adresse(modele.id));
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toEqual({ lignes: [] });
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('TRAV-8 : lecture seule : la base est identique avant et après un GET qui renvoie des lignes', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const avant = await empreinte(ctx);

    const lignes = await lire(ctx, m.admin, m.projet.id);
    expect(lignes.length).toBeGreaterThan(0);
    expect(await empreinte(ctx)).toEqual(avant);
  });
});
