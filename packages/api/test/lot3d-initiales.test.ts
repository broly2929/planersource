import { describe, expect, it } from 'vitest';
import { useTestApp, type TestCtx } from './helpers.js';
import { appel, creerActeur, type Acteur } from './lot1-helpers.js';
import {
  creerActivite,
  creerAssignation,
  creerJalon,
  creerMonde,
  type Objet,
} from './lot1-t2-helpers.js';
import { empreinte } from './lot2a-helpers.js';

/**
 * Lot 3d-1 (D-088 (2)) : champ `initiales` des activités feuilles de GET /api/projets/:id/gantt.
 * Liste des initiales des ressources assignées, ordre des assignations par id, ressource sans
 * initiales omise, feuille sans assignation : [] ; parents et jalons sans ce champ.
 */
type Element = Record<string, unknown> & { id: number };

async function lire(ctx: TestCtx, qui: Acteur, projetId: number): Promise<Element[]> {
  const res = await appel(ctx, qui).get(`/api/projets/${projetId}/gantt`);
  expect(res.statusCode, res.body).toBe(200);
  return (res.json() as { elements: Element[] }).elements;
}

const initialesDe = (elements: Element[], id: number) =>
  elements.find((e) => e.id === id)?.initiales;

/** Ressource affectée au projet, avec ses initiales (null : aucune). */
async function ressource(
  ctx: TestCtx,
  projetId: number,
  admin: Acteur,
  nom: string,
  initiales: string | null,
): Promise<Acteur> {
  const r = await creerActeur(ctx, `${nom.toLowerCase()}@initiales.test`, 'ressource', true);
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

describe('Gantt : initiales des ressources assignées (lot 3d-1)', () => {
  const ctx = useTestApp();

  /** Créées dans l'ordre inverse des assignations, noms non alphabétiques par rapport aux initiales. */
  async function troisAssignations() {
    const m = await creerMonde(ctx);
    const alice = await ressource(ctx, m.projet.id, m.admin, 'Alice', 'CD');
    const mia = await ressource(ctx, m.projet.id, m.admin, 'Mia', null);
    const zed = await ressource(ctx, m.projet.id, m.admin, 'Zed', 'AB');
    const feuille = await creerActivite(ctx, m.admin, m.projet.id);
    await creerAssignation(ctx, m.admin, feuille.id, zed.id);
    await creerAssignation(ctx, m.admin, feuille.id, mia.id);
    await creerAssignation(ctx, m.admin, feuille.id, alice.id);
    return { m, feuille, alice, mia, zed };
  }

  it('GANTT-12 : trois assignations (AB, sans initiales, CD) → initiales [AB, CD], ordre des assignations', async () => {
    const { m, feuille } = await troisAssignations();
    expect(initialesDe(await lire(ctx, m.admin, m.projet.id), feuille.id)).toEqual(['AB', 'CD']);
  });

  it('GANTT-13 : feuille sans assignation → [] ; parent et jalon : pas de clé initiales', async () => {
    const m = await creerMonde(ctx);
    const parent = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Parent' });
    const enfant = await creerActivite(ctx, m.admin, m.projet.id, {
      nom: 'Enfant',
      parent_id: parent.id,
    });
    const libre = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Libre' });
    const jalon: Objet = await creerJalon(ctx, m.admin, m.projet.id);
    const zed = await ressource(ctx, m.projet.id, m.admin, 'Zed', 'AB');
    await creerAssignation(ctx, m.admin, enfant.id, zed.id);

    const elements = await lire(ctx, m.admin, m.projet.id);
    expect(initialesDe(elements, libre.id)).toEqual([]);
    expect(initialesDe(elements, enfant.id)).toEqual(['AB']);
    const parentLu = elements.find((e) => e.id === parent.id)!;
    expect(parentLu).toBeDefined();
    expect('initiales' in parentLu).toBe(false);
    const jalonLu = elements.find((e) => e.id === jalon.id)!;
    expect(jalonLu).toBeDefined();
    expect('initiales' in jalonLu).toBe(false);
  });

  it('GANTT-14 : initiales modifiées par PATCH /api/utilisateurs/:id → relues au GET suivant ; null → ressource omise', async () => {
    const { m, feuille, zed } = await troisAssignations();
    const patch = (id: number, initiales: string | null) =>
      appel(ctx, m.admin).patch(`/api/utilisateurs/${id}`, { initiales });

    expect((await patch(zed.id, 'XY')).statusCode).toBe(200);
    expect(initialesDe(await lire(ctx, m.admin, m.projet.id), feuille.id)).toEqual(['XY', 'CD']);

    expect((await patch(zed.id, null)).statusCode).toBe(200);
    expect(initialesDe(await lire(ctx, m.admin, m.projet.id), feuille.id)).toEqual(['CD']);
  });

  it('GANTT-15 : lecture seule, la base est inchangée après le GET', async () => {
    const { m } = await troisAssignations();
    const avant = await empreinte(ctx);
    await lire(ctx, m.admin, m.projet.id);
    expect(await empreinte(ctx)).toEqual(avant);
  });

  it('GANTT-16 : garde, GET /api/annuaire n’expose toujours pas les initiales', async () => {
    const { m } = await troisAssignations();
    const res = await appel(ctx, m.admin).get('/api/annuaire');
    expect(res.statusCode).toBe(200);
    const annuaire = res.json() as Array<Record<string, unknown>>;
    expect(annuaire.length).toBeGreaterThan(0);
    for (const e of annuaire) {
      expect(Object.keys(e).sort()).toEqual(['actif', 'est_ressource', 'id', 'nom', 'role']);
    }
  });
});
