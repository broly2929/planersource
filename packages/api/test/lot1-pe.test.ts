import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { affecter, appel, corps, creerActeur, creerProjet, liste } from './lot1-helpers.js';

describe('Droit d’écriture exposé (D-036)', () => {
  const ctx = useTestApp();

  it('PRJ-22-r1 : peut_ecrire sur GET /api/projets et GET /api/projets/:id ; la ressource n’y a plus accès', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const chef = await creerActeur(ctx, 'chef@example.test', 'chef_de_projet');
    const autreChef = await creerActeur(ctx, 'autre@example.test', 'chef_de_projet');
    const alice = await creerActeur(ctx, 'alice@example.test', 'ressource', true);
    const mien = await creerProjet(ctx, admin, { chef_id: chef.id });
    const sous = await creerProjet(ctx, chef, { parent_id: mien.id });
    const autre = await creerProjet(ctx, admin, { chef_id: autreChef.id });
    await affecter(ctx, autre.id, chef.id); // le chef est affecté à un projet hors de sa portée
    await affecter(ctx, mien.id, alice.id);
    const droits = async (qui: typeof admin) =>
      Object.fromEntries(
        liste(await appel(ctx, qui).get('/api/projets')).map((p) => [p.id, p.peut_ecrire]),
      );
    expect(await droits(admin)).toEqual({ [mien.id]: true, [sous.id]: true, [autre.id]: true });
    expect(await droits(chef)).toEqual({ [mien.id]: true, [sous.id]: true, [autre.id]: false });
    // Révision 6b (D-031, D-148 (2)) : liste 403 et fiche 404 pour la ressource.
    expect((await appel(ctx, alice).get('/api/projets')).statusCode).toBe(403);
    expect((await appel(ctx, alice).get(`/api/projets/${mien.id}`)).statusCode).toBe(404);
    for (const [qui, projet, attendu] of [
      [admin, autre, true],
      [chef, sous, true],
      [chef, autre, false],
    ] as const) {
      const lu = corps(await appel(ctx, qui).get(`/api/projets/${projet.id}`));
      expect(lu.peut_ecrire, `${qui.email} sur ${projet.id}`).toBe(attendu);
    }
  });
});
