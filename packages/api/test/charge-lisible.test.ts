// Charge lisible (D-220 (6), D-221) : CHA-1 à CHA-3. `charge_assignee` de la vue d'activité : somme des charges
// assignées pour qui écrit sur le projet ; clé absente (pas null) sinon.
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, liste } from './lot1-helpers.js';
import { creerActivite, creerAssignation, creerMonde, url } from './lot1-t2-helpers.js';
import { chefLecteur } from './lot6c-helpers.js';

describe('Charge lisible : charge_assignee de la vue d’activité', () => {
  const ctx = useTestApp();

  it('CHA-1 : GET …/activites : somme des charges assignées pour l’administrateur (0 sans assignation) ; clé absente, pas null, pour le chef lecteur', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id, { charge_vendue: 5 });
    const vide = await creerActivite(ctx, m.admin, m.projet.id);
    await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 2.5 });
    await creerAssignation(ctx, m.admin, a.id, m.bob.id, { charge_assignee: 1 });

    const admin = liste(await appel(ctx, m.admin).get(url.activites(m.projet.id)));
    expect(admin.find((x) => x.id === a.id)).toMatchObject({ charge_assignee: 3.5, marge: 1.5 });
    expect(admin.find((x) => x.id === vide.id)).toMatchObject({ charge_assignee: 0 });

    const lecteur = await chefLecteur(ctx, m);
    const res = await appel(ctx, lecteur).get(url.activites(m.projet.id));
    expect(res.statusCode).toBe(200);
    const lignes = liste(res);
    expect(lignes.length).toBe(2);
    for (const l of lignes) {
      expect('charge_assignee' in l, `activité ${String(l.id)}`).toBe(false);
      expect('marge' in l).toBe(false);
    }
  });

  it('CHA-2 : POST et PATCH d’une activité par l’administrateur : charge_assignee présent', async () => {
    const m = await creerMonde(ctx);
    const creee = await appel(ctx, m.admin).post(url.activites(m.projet.id), { nom: 'Nouvelle' });
    expect(creee.statusCode).toBe(201);
    expect(corps(creee)).toMatchObject({ charge_assignee: 0 });
    const id = corps(creee).id as number;
    await creerAssignation(ctx, m.admin, id, m.alice.id, { charge_assignee: 2 });
    const modif = await appel(ctx, m.admin).patch(url.activite(id), { nom: 'Renommée' });
    expect(modif.statusCode).toBe(200);
    expect(corps(modif)).toMatchObject({ nom: 'Renommée', charge_assignee: 2 });
  });

  it('CHA-3 : PATCH par le chef lecteur refusé, rien de modifié ni de divulgué', async () => {
    const m = await creerMonde(ctx);
    const a = await creerActivite(ctx, m.admin, m.projet.id, { nom: 'Fixe' });
    await creerAssignation(ctx, m.admin, a.id, m.alice.id, { charge_assignee: 2 });
    const lecteur = await chefLecteur(ctx, m);
    const res = await appel(ctx, lecteur).patch(url.activite(a.id), { nom: 'Pirate' });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(res.json())).not.toContain('charge_assignee');
    const apres = liste(await appel(ctx, m.admin).get(url.activites(m.projet.id)));
    expect(apres.find((x) => x.id === a.id)).toMatchObject({ nom: 'Fixe', charge_assignee: 2 });
  });
});
