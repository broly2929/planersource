import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, creerActeur, liste } from './lot1-helpers.js';

describe('Calendriers : PATCH partiel (relecture du lot 1)', () => {
  const ctx = useTestApp();

  it('CAL-13 : renommer un calendrier conserve ses jours travaillés, sans entrée d’historique pour ce champ', async () => {
    const admin = await creerActeur(ctx, 'admin@example.test', 'administrateur');
    const api = appel(ctx, admin);
    const cal = corps(
      await api.post('/api/calendriers', {
        nom: 'Six jours',
        jours_travailles: [1, 2, 3, 4, 5, 6],
      }),
    );
    const res = await api.patch(`/api/calendriers/${cal.id}`, { nom: 'Six jours renommé' });
    expect(res.statusCode).toBe(200);
    expect(corps(res).jours_travailles).toEqual([1, 2, 3, 4, 5, 6]);
    const { rows } = await ctx.pool.query<{ jours_travailles: number[] }>(
      'SELECT jours_travailles FROM calendrier WHERE id = $1',
      [cal.id],
    );
    expect(rows[0]!.jours_travailles).toEqual([1, 2, 3, 4, 5, 6]);
    const entrees = liste(await api.get('/api/historique?entite=calendrier')).filter(
      (e) => e.entite_id === cal.id && e.operation === 'modification',
    );
    expect(entrees.map((e) => e.champ)).toEqual(['nom']);
  });
});
