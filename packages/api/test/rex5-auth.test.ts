// REX-5 (D-167 (1)) : GET /api/auth/me renvoie le même utilisateur que la connexion. AUTH-16.
import { describe, expect, it } from 'vitest';
import { MOT_DE_PASSE, SESSION_COOKIE, seedUser, useTestApp } from './helpers.js';

describe('Session : GET /api/auth/me', () => {
  const ctx = useTestApp();

  it('AUTH-16 : égale, champ par champ, à l’utilisateur de la connexion (calendrier_id et equipe_id compris)', async () => {
    const id = await seedUser(ctx.pool, { email: 'alice@example.test' });
    const equipe = await ctx.pool.query<{ id: number }>(
      "INSERT INTO equipe (nom) VALUES ('Atelier') RETURNING id",
    );
    const calendrier = await ctx.pool.query<{ id: number }>(
      "INSERT INTO calendrier (nom, jours_travailles, est_defaut) VALUES ('Cal 16', '{1,2,3}', false) RETURNING id",
    );
    await ctx.pool.query(
      'UPDATE utilisateur SET equipe_id = $1, calendrier_id = $2 WHERE id = $3',
      [equipe.rows[0]!.id, calendrier.rows[0]!.id, id],
    );
    const connexion = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'alice@example.test', mot_de_passe: MOT_DE_PASSE },
    });
    expect(connexion.statusCode).toBe(200);
    const cookie = connexion.cookies.find((c) => c.name === SESSION_COOKIE);
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${SESSION_COOKIE}=${cookie?.value ?? ''}` },
    });
    expect(me.statusCode).toBe(200);
    const attendu = connexion.json();
    const recu = me.json();
    delete attendu.mot_de_passe_origine;
    delete recu.mot_de_passe_origine;
    expect(attendu.calendrier_id).toBe(calendrier.rows[0]!.id);
    expect(attendu.equipe_id).toBe(equipe.rows[0]!.id);
    expect(recu).toEqual(attendu);
  });
});
