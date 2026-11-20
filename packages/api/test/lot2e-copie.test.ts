import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, creerActeur, creerProjet, type Corps } from './lot1-helpers.js';
import { creerActivite, creerJalon } from './lot1-t2-helpers.js';
import { creerMonde, empreinte } from './lot2a-helpers.js';
import { activiteMan, journee, JANV, poser, saisiesEnBase } from './lot2e-helpers.js';

/**
 * Lot 2e-I : copie et saisies manuelles (SPEC 11.2, 11.4 COPIE-5 partie saisie, D-058 (7)).
 * Projet source P : début lundi 04/01/2027 ; copie au 01/02/2027, soit un décalage de 28 jours.
 */
const copie = (id: number) => `/api/projets/${id}/copie`;
const cible = (nom: string): Corps => ({ nom, code: nom, date_debut: '2027-02-01' });

describe('Copie : saisies manuelles et borne du 31/12/2099 (lot 2e-I)', () => {
  const ctx = useTestApp();

  it('COPIE-14 : COPIE-5, partie saisie : la copie de P (activité MAN assignée, saisies d’Alice) n’a aucune saisie ; celles de P sont inchangées', async () => {
    const m = await creerMonde(ctx);
    const man = await activiteMan(ctx, m.admin, m.projet.id, m.alice.id, 2);
    await poser(ctx, m.admin, man.activite.id, JANV, [
      ...journee(man.assignation.id, '2027-01-05'),
      ...journee(man.assignation.id, '2027-01-06'),
    ]);
    const saisies = await saisiesEnBase(ctx);
    expect(saisies).toHaveLength(4);
    const res = await appel(ctx, m.admin).post(copie(m.projet.id), cible('CIBLE'));
    expect(res.statusCode, res.body).toBe(201);
    const id = (corps(res) as { id: number }).id;
    const { rows: assignations } = await ctx.pool.query(
      'SELECT 1 FROM assignation WHERE projet_id = $1',
      [id],
    );
    expect(assignations).toHaveLength(1);
    const { rows } = await ctx.pool.query(
      `SELECT 1 FROM saisie_manuelle s JOIN assignation a ON a.id = s.assignation_id
        WHERE a.projet_id = $1`,
      [id],
    );
    expect(rows).toHaveLength(0);
    expect(await saisiesEnBase(ctx)).toEqual(saisies);
  });

  it('COPIE-15 : une date validée d’activité ou de jalon décalée au-delà du 31/12/2099 → 422, rien de créé ; décalée au 31/12/2099 exactement → 201', async () => {
    const m = await creerMonde(ctx);
    const api = appel(ctx, m.admin);
    await creerActivite(ctx, m.admin, m.projet.id, { fin_valide: '2099-12-31' });
    const refusActivite = await empreinte(ctx);
    const a = await api.post(copie(m.projet.id), cible('TROPA'));
    expect(a.statusCode, a.body).toBe(422);
    expect(await empreinte(ctx)).toEqual(refusActivite);

    await creerJalon(ctx, m.admin, m.autre.id, { type: 'fixe', date_validee: '2099-12-31' });
    const refusJalon = await empreinte(ctx);
    const j = await api.post(copie(m.autre.id), cible('TROPJ'));
    expect(j.statusCode, j.body).toBe(422);
    expect(await empreinte(ctx)).toEqual(refusJalon);

    // à la borne : 2099-12-03 + 28 jours = 2099-12-31
    const bord = await projetALaBorne(ctx);
    const ok = await api.post(copie(bord), cible('BORNE'));
    expect(ok.statusCode, ok.body).toBe(201);
    const { rows } = await ctx.pool.query<{ debut_valide: string }>(
      `SELECT a.debut_valide FROM activite a JOIN element e ON e.id = a.id
        JOIN projet p ON p.id = e.projet_id WHERE p.code = 'BORNE'`,
    );
    expect(rows).toEqual([{ debut_valide: '2099-12-31' }]);
  });
});

/** Projet à part, avec une activité dont le début validé décalé de 28 jours tombe au 31/12/2099. */
async function projetALaBorne(ctx: Parameters<typeof creerMonde>[0]): Promise<number> {
  const chef = await creerActeur(ctx, 'bord@example.test', 'chef_de_projet');
  const p = await creerProjet(ctx, chef, { chef_id: chef.id });
  await creerActivite(ctx, chef, p.id, { debut_valide: '2099-12-03' });
  return p.id;
}
