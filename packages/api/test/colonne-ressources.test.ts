import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { affecter, appel, creerActeur, type Acteur } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  type Objet,
} from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';

/**
 * Lot colonne-ressources (D-238 (a), SPEC §6 « Lecture ») : champ `assignations` des activités feuilles
 * de GET /api/projets/:id/gantt, liste de { id, ressource_id, nom, initiales, charge_assignee, taux },
 * triée par nom sans tenir compte de la casse puis par id.
 */
type Element = Record<string, unknown> & { id: number };

async function lire(ctx: TestCtx, qui: Acteur, projetId: number): Promise<Element[]> {
  const res = await appel(ctx, qui).get(`/api/projets/${projetId}/gantt`);
  expect(res.statusCode, res.body).toBe(200);
  return (res.json() as { elements: Element[] }).elements;
}

const trouver = (elements: Element[], id: number) => elements.find((e) => e.id === id)!;

async function ressource(
  ctx: TestCtx,
  projetId: number,
  admin: Acteur,
  email: string,
  nom: string,
  initiales: string | null,
): Promise<Acteur> {
  const r = await creerActeur(ctx, email, 'ressource', true);
  await ctx.pool.query('UPDATE utilisateur SET nom = $1, initiales = $2 WHERE id = $3', [
    nom,
    initiales,
    r.id,
  ]);
  const res = await appel(ctx, admin).post(`/api/projets/${projetId}/affectations`, {
    ressource_id: r.id,
  });
  expect(res.statusCode).toBe(201);
  return r;
}

describe('Gantt : assignations des feuilles (colonne-ressources)', () => {
  const ctx = useTestApp();

  async function troisAssignations() {
    const m = await creerMonde(ctx);
    // Créées et assignées dans un ordre différent du tri attendu ; « bob » et « Bob » ne diffèrent que par la casse.
    const zed = await ressource(ctx, m.projet.id, m.admin, 'zed@crs.test', 'Zed', 'ZD');
    const bobMin = await ressource(ctx, m.projet.id, m.admin, 'bobmin@crs.test', 'bob', null);
    const bobMaj = await ressource(ctx, m.projet.id, m.admin, 'bobmaj@crs.test', 'Bob', 'BM');
    const feuille = await creerActivite(ctx, m.admin, m.projet.id);
    const aZed = await creerAssignation(ctx, m.admin, feuille.id, zed.id, {
      charge_assignee: 2.5,
      taux: 50,
    });
    const aBobMaj = await creerAssignation(ctx, m.admin, feuille.id, bobMaj.id, {
      charge_assignee: 4,
    });
    const aBobMin = await creerAssignation(ctx, m.admin, feuille.id, bobMin.id, {
      charge_assignee: 1,
    });
    return { m, feuille, zed, bobMin, bobMaj, aZed, aBobMaj, aBobMin };
  }

  it('CRS-1 : trois assignations, champs exacts, tri par nom sans casse puis par id, initiales null', async () => {
    const { m, feuille, zed, bobMin, bobMaj, aZed, aBobMaj, aBobMin } = await troisAssignations();
    const attendu = [
      // « Bob » (assignée en premier) avant « bob » : même nom sans casse, départage par id d'assignation.
      {
        id: aBobMaj.id,
        ressource_id: bobMaj.id,
        nom: 'Bob',
        initiales: 'BM',
        charge_assignee: 4,
        taux: 100,
      },
      {
        id: aBobMin.id,
        ressource_id: bobMin.id,
        nom: 'bob',
        initiales: null,
        charge_assignee: 1,
        taux: 100,
      },
      {
        id: aZed.id,
        ressource_id: zed.id,
        nom: 'Zed',
        initiales: 'ZD',
        charge_assignee: 2.5,
        taux: 50,
      },
    ];
    expect(aBobMaj.id).toBeLessThan(aBobMin.id);
    expect(trouver(await lire(ctx, m.admin, m.projet.id), feuille.id).assignations).toEqual(
      attendu,
    );
  });

  it('CRS-2 : feuille sans assignation → [] ; parent et jalon sans la clé ; initiales inchangé', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Parent' });
    const enfant = await creerActivite(ctx, m.admin, m.projet.id, {
      nom: 'Enfant',
      parent_id: parent.id,
    });
    const libre = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Libre' });
    const jalon: Objet = await creerJalon(ctx, m.admin, m.projet.id);
    const zed = await ressource(ctx, m.projet.id, m.admin, 'zed@crs.test', 'Zed', 'ZD');
    const mia = await ressource(ctx, m.projet.id, m.admin, 'mia@crs.test', 'Mia', null);
    const alice = await ressource(ctx, m.projet.id, m.admin, 'alice@crs.test', 'Alice', 'AL');
    await creerAssignation(ctx, m.admin, enfant.id, zed.id);
    await creerAssignation(ctx, m.admin, enfant.id, mia.id);
    await creerAssignation(ctx, m.admin, enfant.id, alice.id);

    const elements = await lire(ctx, m.admin, m.projet.id);
    expect(trouver(elements, libre.id).assignations).toEqual([]);
    expect((trouver(elements, enfant.id).assignations as unknown[]).length).toBe(3);
    expect('assignations' in trouver(elements, parent.id)).toBe(false);
    expect('assignations' in trouver(elements, jalon.id)).toBe(false);
    // `initiales` (D-088) : ordre des assignations par id, ressource sans initiales omise.
    expect(trouver(elements, enfant.id).initiales).toEqual(['ZD', 'AL']);
    expect(trouver(elements, libre.id).initiales).toEqual([]);
  });

  it('CRS-3 : lecteur sans droit d’écriture (chef affecté au projet d’un autre) : assignations identiques, base inchangée', async () => {
    const { m, feuille } = await troisAssignations();
    const lecteur = await creerActeur(ctx, 'lecteur@crs.test', 'chef_de_projet', true);
    await affecter(ctx, m.projet.id, lecteur.id);
    const avant = await empreinte(ctx);
    const lecture = async (qui: Acteur) => {
      const res = await appel(ctx, qui).get(`/api/projets/${m.projet.id}/gantt`);
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as { projet: { peut_ecrire: boolean }; elements: Element[] };
    };
    const pourLecteurBrut = await lecture(lecteur);
    expect(await empreinte(ctx)).toEqual(avant);
    const pourAdminBrut = await lecture(m.admin);
    expect(pourLecteurBrut.projet.peut_ecrire).toBe(false);
    expect(pourAdminBrut.projet.peut_ecrire).toBe(true);
    const pourLecteur = pourLecteurBrut.elements;
    const pourAdmin = pourAdminBrut.elements;
    const vue = trouver(pourLecteur, feuille.id).assignations;
    expect(Array.isArray(vue)).toBe(true);
    expect((vue as unknown[]).length).toBe(3);
    expect(vue).toEqual(trouver(pourAdmin, feuille.id).assignations);
  });
});
