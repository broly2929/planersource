// Lot notes (D-270) : champ « notes » des activités. NOT-1 à NOT-10.
// Valeurs attendues recopiées de SPEC §3, « Notes d'activité (notes, D-270) », points 1 à 8
// (cas NO-1 à NO-10).
import { describe, expect, it } from 'vitest';
import { useTestApp } from './helpers.js';
import { appel, corps, liste, type Corps } from './lot1-helpers.js';
import { creerActivite, url } from './lot1-t2-helpers.js';
import {
  clesProfondes,
  creerMondeDroits,
  JOUR,
  leaderDe,
  refusSansEffet,
  requete,
  S1,
} from './droits-helpers.js';

interface Entree {
  entite: string;
  entite_id: number;
  operation: string;
  champ: string | null;
  ancienne_valeur: unknown;
  nouvelle_valeur: unknown;
}

describe('Lot notes : notes des activités (SPEC §3, D-270)', () => {
  const ctx = useTestApp(() => JOUR);

  const lireNotes = async (qui: Parameters<typeof appel>[1], projetId: number, id: number) => {
    const res = await appel(ctx, qui).get(url.activites(projetId));
    expect(res.statusCode, res.body).toBe(200);
    return (liste(res).find((a) => a.id === id) as Corps).notes;
  };
  const historique = async (admin: Parameters<typeof appel>[1], projetId: number) => {
    const res = await appel(ctx, admin).get(`/api/projets/${projetId}/historique`);
    expect(res.statusCode, res.body).toBe(200);
    return liste(res) as unknown as Entree[];
  };

  it('NOT-1 : POST avec notes « ␠␠Ligne 1\\nLigne 2␠ » → « Ligne 1\\nLigne 2 » ; sans notes → null (NO-1)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const avec = await appel(ctx, m.admin).post(url.activites(m.p.id), {
      nom: 'Avec notes',
      notes: '  Ligne 1\nLigne 2 ',
    });
    expect(avec.statusCode, avec.body).toBe(201);
    expect(corps(avec).notes).toBe('Ligne 1\nLigne 2');
    const sans = await appel(ctx, m.admin).post(url.activites(m.p.id), { nom: 'Sans notes' });
    expect(sans.statusCode, sans.body).toBe(201);
    expect(corps(sans).notes).toBeNull();
    expect(await lireNotes(m.admin, m.p.id, corps(avec).id as number)).toBe('Ligne 1\nLigne 2');
  });

  it('NOT-2 : notes d’espaces seuls → null, en POST et en PATCH (NO-2)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const cree = await appel(ctx, m.admin).post(url.activites(m.p.id), {
      nom: 'Espaces',
      notes: '   ',
    });
    expect(cree.statusCode, cree.body).toBe(201);
    expect(corps(cree).notes).toBeNull();
    const id = corps(cree).id as number;
    expect((await appel(ctx, m.admin).patch(url.activite(id), { notes: 'Texte' })).statusCode).toBe(
      200,
    );
    const modifie = await appel(ctx, m.admin).patch(url.activite(id), { notes: '   ' });
    expect(modifie.statusCode, modifie.body).toBe(200);
    expect(corps(modifie).notes).toBeNull();
  });

  it('NOT-3 : 500 points de code acceptés (« é », « 😀 »), 501 → 400, base inchangée (NO-3)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    for (const signe of ['é', '😀']) {
      const res = await appel(ctx, m.admin).post(url.activites(m.p.id), {
        nom: `Limite ${signe}`,
        notes: signe.repeat(500),
      });
      expect(res.statusCode, res.body).toBe(201);
      expect(corps(res).notes).toBe(signe.repeat(500));
    }
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Avant' });
    for (const signe of ['é', '😀']) {
      await refusSansEffet(ctx, 400, () =>
        requete(ctx, m.admin, 'POST', url.activites(m.p.id), {
          nom: 'Trop long',
          notes: signe.repeat(501),
        }),
      );
      await refusSansEffet(ctx, 400, () =>
        requete(ctx, m.admin, 'PATCH', url.activite(a.id), { notes: signe.repeat(501) }),
      );
    }
    expect(await lireNotes(m.admin, m.p.id, a.id)).toBe('Avant');
  });

  it('NOT-4 : PATCH modifie, efface (null) ; sans notes, inchangé (NO-4)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Départ' });
    const modifie = await appel(ctx, m.admin).patch(url.activite(a.id), { notes: 'Texte' });
    expect(modifie.statusCode, modifie.body).toBe(200);
    expect(corps(modifie).notes).toBe('Texte');
    const autre = await appel(ctx, m.admin).patch(url.activite(a.id), { priorite: 400 });
    expect(autre.statusCode, autre.body).toBe(200);
    expect(corps(autre).notes).toBe('Texte');
    const efface = await appel(ctx, m.admin).patch(url.activite(a.id), { notes: null });
    expect(efface.statusCode, efface.body).toBe(200);
    expect(corps(efface).notes).toBeNull();
    expect(await lireNotes(m.admin, m.p.id, a.id)).toBeNull();
  });

  // NOT-5-r1 (D-031, D-271, tag tests-notes-r2) : refus de la ressource = 404 (règle existante), non 403.
  it('NOT-5-r1 : refus (chef hors portée → 403, ressource → 404), base inchangée (NO-5)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Avant' });
    for (const [qui, statut] of [
      [m.horsPortee, 403],
      [m.alice, 404],
    ] as const) {
      await refusSansEffet(ctx, statut, () =>
        requete(ctx, qui, 'PATCH', url.activite(a.id), { notes: 'Pirate' }),
      );
      await refusSansEffet(ctx, statut, () =>
        requete(ctx, qui, 'POST', url.activites(m.p.id), { nom: 'X', notes: 'Pirate' }),
      );
    }
    expect(await lireNotes(m.admin, m.p.id, a.id)).toBe('Avant');
  });

  it('NOT-6 : lecture par administrateur, chef, leader et chef en lecture seule ; jamais par la ressource ; jalon sans la clé (NO-6)', async () => {
    const m = await creerMondeDroits(ctx);
    const leader = leaderDe(m);
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Note visible' });
    for (const qui of [m.admin, m.chef, leader, m.horsPortee]) {
      const res = await appel(ctx, qui).get(url.activites(m.p.id));
      expect(res.statusCode, res.body).toBe(200);
      expect((liste(res).find((x) => x.id === a.id) as Corps).notes, qui.email).toBe(
        'Note visible',
      );
      const gantt = await appel(ctx, qui).get(`/api/projets/${m.p.id}/gantt`);
      expect(gantt.statusCode, gantt.body).toBe(200);
      const el = (corps(gantt).elements as Corps[]).find((x) => x.id === a.id) as Corps;
      expect(el.notes, `gantt ${qui.email}`).toBe('Note visible');
      const jalons = (corps(gantt).elements as Corps[]).filter((x) => x.type === 'jalon');
      expect(jalons.length).toBeGreaterThan(0);
      for (const j of jalons) expect('notes' in j, 'jalon').toBe(false);
    }
    // Ressource affectée, assignée sur l'activité : la clé n'apparaît dans aucune réponse.
    await appel(ctx, m.admin).post(url.assignationsActivite(a.id), {
      ressource_id: m.alice.id,
      charge_assignee: 1,
    });
    const reponses = [
      await requete(ctx, m.alice, 'GET', '/api/mes-taches'),
      await requete(ctx, m.alice, 'GET', `/api/feuilles?semaine=${S1}`),
      await requete(ctx, m.alice, 'GET', '/api/validations'),
      await requete(ctx, m.alice, 'GET', url.activites(m.p.id)),
      await requete(ctx, m.alice, 'GET', `/api/projets/${m.p.id}/gantt`),
      await requete(ctx, m.alice, 'GET', url.planning(m.p.id)),
    ];
    for (const res of reponses) {
      expect(res.statusCode, `${res.statusCode} ${res.body}`).toBeLessThan(500);
      expect(clesProfondes(res.json()).has('notes'), res.body).toBe(false);
      expect(res.body).not.toContain('Note visible');
    }
  });

  it('NOT-7 : historique de la création, de la modification, de l’effacement ; valeur inchangée non historisée (NO-7)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Première' });
    const creation = (await historique(m.admin, m.p.id)).filter(
      (e) => e.entite === 'activite' && e.entite_id === a.id && e.operation === 'creation',
    );
    expect(JSON.stringify(creation)).toContain('Première');
    const notesEntrees = async () =>
      (await historique(m.admin, m.p.id)).filter(
        (e) => e.entite === 'activite' && e.entite_id === a.id && e.champ === 'notes',
      );
    expect(
      (await appel(ctx, m.admin).patch(url.activite(a.id), { notes: 'Seconde' })).statusCode,
    ).toBe(200);
    let entrees = await notesEntrees();
    expect(entrees).toHaveLength(1);
    expect(entrees[0]).toMatchObject({
      operation: 'modification',
      ancienne_valeur: 'Première',
      nouvelle_valeur: 'Seconde',
    });
    expect(
      (await appel(ctx, m.admin).patch(url.activite(a.id), { notes: 'Seconde' })).statusCode,
    ).toBe(200);
    expect(await notesEntrees()).toHaveLength(1);
    expect((await appel(ctx, m.admin).patch(url.activite(a.id), { notes: null })).statusCode).toBe(
      200,
    );
    entrees = await notesEntrees();
    expect(entrees).toHaveLength(2);
    expect(entrees.some((e) => e.ancienne_valeur === 'Seconde' && e.nouvelle_valeur === null)).toBe(
      true,
    );
  });

  it('NOT-8 : copie de projet, création depuis un modèle, enregistrement comme modèle : notes copiées (NO-8)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const a = await creerActivite(ctx, m.admin, m.p.id, { notes: 'Ligne 1\nLigne 2' });
    const copier = async (id: number, c: Corps) => {
      const res = await appel(ctx, m.admin).post(`/api/projets/${id}/copie`, c);
      expect(res.statusCode, res.body).toBe(201);
      return corps(res).id as number;
    };
    const notesDe = async (projetId: number) => {
      const res = await appel(ctx, m.admin).get(url.activites(projetId));
      return liste(res)
        .filter((x) => x.nom === a.nom)
        .map((x) => x.notes);
    };
    const copie = await copier(m.p.id, { nom: 'Copie', code: 'NCOP', date_debut: '2027-02-01' });
    expect(await notesDe(copie)).toEqual(['Ligne 1\nLigne 2']);
    const modele = await copier(m.p.id, {
      nom: 'Modèle N',
      code: 'NMOD',
      date_debut: '2027-02-01',
      est_modele: true,
    });
    expect(await notesDe(modele)).toEqual(['Ligne 1\nLigne 2']);
    const depuis = await copier(modele, { nom: 'Depuis', code: 'NDEP', date_debut: '2027-03-01' });
    expect(await notesDe(depuis)).toEqual(['Ligne 1\nLigne 2']);
  });

  it('NOT-9 : migration 019 : colonne nullable, CHECK de longueur sur INSERT direct (NO-9)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const col = await ctx.pool.query<{ is_nullable: string; data_type: string }>(
      `SELECT is_nullable, data_type FROM information_schema.columns
        WHERE table_name = 'activite' AND column_name = 'notes'`,
    );
    expect(col.rows).toEqual([{ is_nullable: 'YES', data_type: 'text' }]);
    await expect(
      ctx.pool.query(`UPDATE activite SET notes = repeat('x', 501) WHERE id = $1`, [m.fp.id]),
    ).rejects.toThrow(/check/i);
    await ctx.pool.query(`UPDATE activite SET notes = repeat('x', 500) WHERE id = $1`, [m.fp.id]);
  });

  it('NOT-10 : exports sans colonne de notes (NO-10)', async () => {
    const m = await creerMondeDroits(ctx, { sansLeader: true });
    const ecrit = await appel(ctx, m.admin).patch(url.activite(m.fp.id), {
      notes: 'NOTE-SECRETE',
    });
    expect(ecrit.statusCode, ecrit.body).toBe(200);
    const adresses = [
      `/api/projets/${m.p.id}/couts/export`,
      '/api/imputations/export?du=2027-01-01&au=2027-01-31',
      '/api/plan-de-charge/export?debut=2027-01',
    ];
    for (const adresse of adresses) {
      const res = await appel(ctx, m.admin).get(adresse);
      expect(res.statusCode, `${adresse} ${res.body}`).toBe(200);
      expect(res.body, adresse).not.toContain('NOTE-SECRETE');
      expect(res.body.split('\n')[0]!.toLowerCase(), adresse).not.toContain('note');
    }
  });
});
