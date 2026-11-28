// Lot absences (D-276) : jeu de démonstration, ABT-14 et CTT-8 (SPEC §4, « Absences et charge depuis le taux »,
// point 17) : deux absences d'alice (formation d'une matinée, congé d'une journée) et une assignation REGUL d'alice
// en charge depuis le taux.
import { describe, expect, it } from 'vitest';
import { creerAdminDeDeveloppement } from '../src/auth/dev-admin.js';
import { remplirDemo } from '../src/demo/remplir.js';
import { useTestApp } from './helpers.js';

const LUNDI = '2027-01-04';

describe('jeu de démonstration, absences et charge depuis le taux (D-276, point 17)', () => {
  const ctx = useTestApp(() => '2027-01-20');

  it('ABT-14 et CTT-8 : deux absences d’alice ; une assignation REGUL d’alice au champ vrai', async () => {
    await creerAdminDeDeveloppement(
      ctx.pool,
      { nodeEnv: 'development' },
      { warn: () => undefined },
    );
    await remplirDemo(ctx.app, { lundi: LUNDI });
    const { rows: absences } = await ctx.pool.query<{
      login: string;
      portion: string;
      motif: string;
    }>(
      `SELECT u.login, a.portion, a.motif FROM absence a JOIN utilisateur u ON u.id = a.ressource_id
        ORDER BY a.debut`,
    );
    expect(absences).toEqual([
      { login: 'alice', portion: 'matin', motif: 'formation' },
      { login: 'alice', portion: 'journee', motif: 'conge' },
    ]);
    const { rows: ct } = await ctx.pool.query<{ login: string; mode: string }>(
      `SELECT u.login, act.mode FROM assignation s JOIN utilisateur u ON u.id = s.ressource_id
         JOIN activite act ON act.id = s.activite_id WHERE s.charge_depuis_taux`,
    );
    expect(ct).toEqual([{ login: 'alice', mode: 'REGUL' }]);
  });
});
