// Lot correctif REX-2, tranche R2-B (D-078) : PRJ-24, PRJ-25.
// `debut_planifie` et `fin_planifiee` du projet : lus par GET /api/projets et GET /api/projets/:id,
// jamais écrits ni historisés (SPEC §2, puce `peut_ecrire` suivante).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, liste } from './lot1-helpers.js';
import { calculer, creerMonde, tache } from './lot2a-helpers.js';

const calcul = { d0: '2027-01-06' };

describe('REX-2 R2-B : début et fin planifiés du projet (D-078 5)', () => {
  const ctx = useTestApp();

  it('PRJ-24 : GET /api/projets et GET /api/projets/:id portent debut_planifie et fin_planifiee, null avant calcul, égaux au Gantt après calcul', async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);

    const unAvant = corps(await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}`));
    expect(unAvant).toHaveProperty('debut_planifie', null);
    expect(unAvant).toHaveProperty('fin_planifiee', null);
    const dansListeAvant = liste(await appel(ctx, m.admin).get('/api/projets')).find(
      (p) => p.id === m.projet.id,
    );
    expect(dansListeAvant).toHaveProperty('debut_planifie', null);
    expect(dansListeAvant).toHaveProperty('fin_planifiee', null);

    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);

    const gantt = corps(await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}/gantt`))
      .projet as Record<string, unknown>;
    expect(typeof gantt.debut_planifie).toBe('string');
    expect(typeof gantt.fin_planifiee).toBe('string');
    const un = corps(await appel(ctx, m.admin).get(`/api/projets/${m.projet.id}`));
    expect(un.debut_planifie).toBe(gantt.debut_planifie);
    expect(un.fin_planifiee).toBe(gantt.fin_planifiee);
    const dansListe = liste(await appel(ctx, m.admin).get('/api/projets')).find(
      (p) => p.id === m.projet.id,
    );
    expect(dansListe?.debut_planifie).toBe(gantt.debut_planifie);
    expect(dansListe?.fin_planifiee).toBe(gantt.fin_planifiee);
  });

  it("PRJ-25 : garde (vert d'emblée) : PATCH avec debut_planifie → 400, projet inchangé ; l'historique ne contient aucune entrée sur debut_planifie ni fin_planifiee", async () => {
    const m = await creerMonde(ctx);
    await tache(ctx, m.admin, m.projet.id, m.alice.id, 2);
    const adresse = `/api/projets/${m.projet.id}`;

    const avant = (await appel(ctx, m.admin).get(adresse)).body;
    for (const champ of ['debut_planifie', 'fin_planifiee']) {
      const res = await appel(ctx, m.admin).patch(adresse, { [champ]: '2027-02-01' });
      expect(res.statusCode, `PATCH ${champ}`).toBe(400);
    }
    expect((await appel(ctx, m.admin).get(adresse)).body).toBe(avant);

    const res = await calculer(ctx, m.admin, { projets: [m.projet.id], ...calcul });
    expect(res.statusCode, res.body).toBe(200);
    const historique = liste(await appel(ctx, m.admin).get(`${adresse}/historique`));
    const champs = historique.map((e) => e.champ);
    expect(champs).not.toContain('debut_planifie');
    expect(champs).not.toContain('fin_planifiee');
  });
});
